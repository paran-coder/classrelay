import * as db from './db.mjs';
import {
  uid, normalizeName, parseMoney, formatWon, formatDate, isValidEmail,
  parseCsv, detectCsvHeaders, paymentFingerprint, autoMatch, mergeSyncedApplicant,
  makeRequestNumber, customerIdentityKey, formResponseStorageId,
  applicantMatchesFilter, courseApplicantMatchesFilter, normalizeFilter, COURSE_HISTORY_FILTERS,
  escapeHtml, renderTemplate, FIELD_DEFINITIONS, markSendStarted, markSendSuccess, markSendFailure, markSendUncertain,
  hasUncertainDeliveryState, requiresCourseChangeConfirmation, resolveAutoCourse,
  ensureEmailTemplates, resolveEmailTemplate, buildEmailTemplateValues, createEmailSnapshot,
} from './core.mjs';
import { connectForm, syncMappedResponses, authorizeGmail, sendGmail, clearTokens } from './google.mjs';
import { hydrateIcons, icon } from './icons.mjs';
import { withOperationLock, onExternalCoordination, isLocalOperationRunning } from './coordination.mjs';

const main = document.querySelector('#main');
const modalRoot = document.querySelector('#modalRoot');
const toastRoot = document.querySelector('#toastRoot');
const sidebar = document.querySelector('#sidebar');
const topbarTitle = document.querySelector('#topbarTitle');
const selectedApplicants = new Set();
const setupProgressButton = document.querySelector('#setupProgressButton');
const setupPopover = document.querySelector('#setupPopover');
const setupMenu = document.querySelector('#setupMenu');
let sendInFlight = false;
let externalChangePending = false;

const ROUTE_TITLES = {
  dashboard: '대시보드', applicants: '신청자', payments: '입금 관리', courses: '강의 관리', email: '메일 / 발송로그', settings: '설정',
};

const DEFAULT_TEMPLATE = {
  subject: '[{{강의명}}] 녹화본을 보내드립니다',
  body: `안녕하세요, {{이름}}님.\n\n{{강의명}} 강의 신청과 입금이 확인되었습니다.\n아래 링크에서 녹화본을 확인하실 수 있습니다.\n\n{{녹화본URL}}\n\n링크는 신청자 본인만 이용해 주세요.`,
};

const STATUS = {
  payment: {
    PENDING: ['입금대기', 'neutral'],
    MATCHED: ['자동일치', 'good'],
    REVIEW_REQUIRED: ['확인필요', 'warn'],
    MANUAL_CONFIRMED: ['수동확인', 'info'],
  },
  delivery: {
    NOT_SENT: ['미발송', 'neutral'],
    SENDING: ['발송중', 'info'],
    UNCERTAIN: ['발송 확인 필요', 'warn'],
    SENT: ['발송완료', 'good'],
    FAILED: ['발송실패', 'danger'],
  },
};

function badge(group, value) {
  const [label, kind] = STATUS[group]?.[value] || [value || '-', 'neutral'];
  return `<span class="badge badge-${kind}"><span class="dot"></span>${escapeHtml(label)}</span>`;
}

function toast(title, message = '', kind = 'normal') {
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `<strong>${escapeHtml(title)}</strong>${message ? `<p>${escapeHtml(message)}</p>` : ''}`;
  toastRoot.appendChild(node);
  setTimeout(() => node.remove(), kind === 'error' ? 5200 : 3200);
}

function showModal({ title, description = '', body = '', actions = '', wide = false }) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-close-modal>
      <section class="modal" style="${wide ? 'width:min(900px,100%)' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head"><div><h2>${escapeHtml(title)}</h2>${description ? `<p>${escapeHtml(description)}</p>` : ''}</div><button class="close-btn" data-close-modal aria-label="닫기">×</button></div>
        <div class="modal-body">${body}</div>
        ${actions ? `<div class="modal-foot">${actions}</div>` : ''}
      </section>
    </div>`;
  modalRoot.querySelector('.modal-backdrop').addEventListener('click', (event) => {
    if (event.target.matches('[data-close-modal]')) closeModal();
  });
  hydrateIcons(modalRoot);
  requestAnimationFrame(() => modalRoot.querySelector('.close-btn')?.focus());
}

function closeModal() {
  modalRoot.innerHTML = '';
  if (externalChangePending && !isLocalOperationRunning()) {
    externalChangePending = false;
    queueMicrotask(() => render());
  }
}

function onEscape(event) {
  if (event.key === 'Escape') {
    if (modalRoot.innerHTML) closeModal();
    if (setupPopover && !setupPopover.classList.contains('hidden')) closeSetupPopover();
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      document.querySelector('#mobileMenu')?.setAttribute('aria-expanded','false');
    }
  }
}

function routeState() {
  const raw = location.hash.replace(/^#/, '') || 'dashboard';
  const [pathPart, query = ''] = raw.split('?');
  const path = pathPart.startsWith('course/') ? pathPart : (ROUTE_TITLES[pathPart] ? pathPart : 'dashboard');
  return { path, params: new URLSearchParams(query) };
}

function route() { return routeState().path; }

function setRouteFilter(path, filter, { replace = false, extra = {} } = {}) {
  const params = new URLSearchParams();
  params.set('filter', filter);
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') params.set(key, String(value));
  });
  const next = `#${path}?${params.toString()}`;
  if (replace) history.replaceState(null, '', next);
  else history.pushState(null, '', next);
}

function setActiveNav(current) {
  const base = current.startsWith('course/') ? 'courses' : current;
  document.querySelectorAll('[data-route]').forEach((node) => node.classList.toggle('active', node.dataset.route === base));
  topbarTitle.textContent = current.startsWith('course/') ? '강의 히스토리' : ROUTE_TITLES[current];
}

function setupProgressItems(state) {
  return [
    { label: 'OAuth Client ID', done: Boolean(state.clientId), sub: state.clientId ? '저장됨' : '설정 필요', href: '#settings' },
    { label: 'Google Form', done: Boolean(state.formConnection) && Object.keys(state.formMapping || {}).length > 0, sub: state.formConnection ? (Object.keys(state.formMapping || {}).length ? state.formConnection.title : '질문 매핑 필요') : '연결 필요', href: '#settings' },
    { label: '강의 정보', done: state.courses.length > 0, sub: state.courses.length ? `${state.courses.length}개 등록` : '등록 필요', href: '#courses' },
    { label: '최근 백업', done: Boolean(state.lastBackupAt), sub: state.lastBackupAt ? formatDate(state.lastBackupAt, false) : '아직 없음', href: '#settings' },
  ];
}

function closeSetupPopover() {
  if (!setupPopover || !setupProgressButton) return;
  setupPopover.classList.add('hidden');
  setupProgressButton.setAttribute('aria-expanded', 'false');
}

function toggleSetupPopover() {
  if (!setupPopover || !setupProgressButton) return;
  const willOpen = setupPopover.classList.contains('hidden');
  setupPopover.classList.toggle('hidden', !willOpen);
  setupProgressButton.setAttribute('aria-expanded', String(willOpen));
}

function updateSetupProgress(state) {
  if (!setupPopover || !setupProgressButton) return;
  const items = setupProgressItems(state);
  const done = items.filter((item) => item.done).length;
  setupProgressButton.textContent = done === items.length ? '✓ 설정 완료' : `설정 ${done}/${items.length}`;
  setupProgressButton.classList.toggle('is-complete', done === items.length);
  setupPopover.innerHTML = `<div class="setup-popover-head"><div><strong>초기 설정 상태</strong><span>${done}/${items.length} 완료</span></div><a href="#settings" data-close-setup>설정 열기</a></div>
    <div class="setup-popover-list">${items.map((item, index) => `<a class="setup-popover-row" href="${item.href}" data-close-setup><span class="progress-icon ${item.done ? 'done' : ''}">${item.done ? '✓' : index + 1}</span><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.sub)}</small></span></a>`).join('')}</div>
    <div class="setup-popover-foot">샘플 데이터와 백업 도구는 <a href="#settings" data-close-setup>설정</a>에서 관리합니다.</div>`;
  setupPopover.querySelectorAll('[data-close-setup]').forEach((node) => node.addEventListener('click', closeSetupPopover));
}

function handleExternalCoordination(message) {
  if (!message || message.type !== 'data-changed') return;
  if (isLocalOperationRunning()) return;
  if (modalRoot.innerHTML) {
    externalChangePending = true;
    toast('다른 탭에서 데이터가 변경되었습니다.', '현재 창을 닫은 뒤 최신 데이터를 다시 불러옵니다.');
    return;
  }
  render();
}

function setupShell() {
  hydrateIcons(document);
  document.querySelector('#mobileMenu').addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    document.querySelector('#mobileMenu').setAttribute('aria-expanded', String(open));
  });
  const closeMobileSidebar = () => {
    sidebar.classList.remove('open');
    document.querySelector('#mobileMenu')?.setAttribute('aria-expanded','false');
  };
  document.querySelectorAll('.nav a').forEach((node) => node.addEventListener('click', closeMobileSidebar));
  document.querySelector('.sidebar .brand')?.addEventListener('click', closeMobileSidebar);
  document.querySelector('#globalSync').addEventListener('click', () => syncGoogleForm(true));
  setupProgressButton?.addEventListener('click', (event) => { event.stopPropagation(); toggleSetupPopover(); });
  document.addEventListener('click', (event) => { if (setupMenu && !setupMenu.contains(event.target)) closeSetupPopover(); });
  window.addEventListener('hashchange', render);
  window.addEventListener('keydown', onEscape);
  onExternalCoordination(handleExternalCoordination);
}

async function loadState() {
  const [applicants, payments, courses, logs, clientId, formConnection, formMapping, legacyTemplate, storedTemplates, storedDefaultTemplateId, abandonedTemplates, lastSyncAt, formDefaultCourseId, matchBeforeDays, matchAfterDays, lastBackupAt] = await Promise.all([
    db.getAll('applicants'), db.getAll('payments'), db.getAll('courses'), db.getAll('logs'),
    db.getSetting('oauthClientId', ''), db.getSetting('formConnection', null), db.getSetting('formMapping', {}),
    db.getSetting('emailTemplate', DEFAULT_TEMPLATE), db.getSetting('emailTemplates', []), db.getSetting('defaultEmailTemplateId', ''), db.getOptionalAll('templates'), db.getSetting('lastSyncAt', ''),
    db.getSetting('formDefaultCourseId', ''), db.getSetting('matchBeforeDays', 1), db.getSetting('matchAfterDays', 7), db.getSetting('lastBackupAt', ''),
  ]);
  const templateSource = Array.isArray(storedTemplates) && storedTemplates.length ? storedTemplates : abandonedTemplates;
  const templates = ensureEmailTemplates(templateSource, legacyTemplate, DEFAULT_TEMPLATE);
  const abandonedDefaultId = abandonedTemplates.find((item)=>item?.isDefault)?.id || '';
  const preferredDefaultId = storedDefaultTemplateId || abandonedDefaultId;
  const defaultTemplateId = templates.some((item)=>item.id===preferredDefaultId) ? preferredDefaultId : templates[0].id;
  const templateMigrationNeeded = !Array.isArray(storedTemplates) || storedTemplates.length === 0 || storedDefaultTemplateId !== defaultTemplateId;
  if (templateMigrationNeeded) {
    await withOperationLock('메일 템플릿 초기화', async () => {
      await db.atomicWrite({ settings: [
        { key:'emailTemplates', value:templates, updatedAt:new Date().toISOString() },
        { key:'defaultEmailTemplateId', value:defaultTemplateId, updatedAt:new Date().toISOString() },
      ] });
    });
  }
  // v2.1.x migration: attach stable courseId without rewriting operational history.
  const migrations = [];
  applicants.forEach((applicant, index) => {
    let next = applicant;
    if (!next.courseId) {
      const course = courses.find((c) => normalizeName(c.name) === normalizeName(next.course));
      if (course) next = { ...next, courseId: course.id };
    }
    if (!next.requestNo) next = { ...next, requestNo: makeRequestNumber(next) };
    if (next !== applicant) { applicants[index] = next; migrations.push(next); }
  });
  if (migrations.length) await withOperationLock('데이터 마이그레이션', () => db.bulkPut('applicants', migrations.map((row)=>({...row,updatedAt:row.updatedAt||new Date().toISOString()}))));
  applicants.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  payments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { applicants, payments, courses, logs, clientId, formConnection, formMapping, templates, defaultTemplateId, template: resolveEmailTemplate(templates, defaultTemplateId, {}), lastSyncAt, formDefaultCourseId, matchBeforeDays, matchAfterDays, lastBackupAt };
}

function summaryStats(state) {
  const all = state.applicants.length;
  const pending = state.applicants.filter((a) => a.paymentStatus === 'PENDING').length;
  const matched = state.applicants.filter((a) => ['MATCHED', 'MANUAL_CONFIRMED'].includes(a.paymentStatus)).length;
  const review = state.applicants.filter((a) => a.paymentStatus === 'REVIEW_REQUIRED').length;
  const ready = state.applicants.filter((a) => applicantMatchesFilter(a, 'ready')).length;
  const sent = state.applicants.filter((a) => a.deliveryStatus === 'SENT').length;
  return { all, pending, matched, review, ready, sent };
}

function applicantRow(a, { checkbox = false, compact = false, courseName = '', selectable = false, selected = false } = {}) {
  const displayCourse = courseName || a.course || '-';
  const rowAttrs = selectable
    ? ` class="selectable-row${selected ? ' is-selected' : ''}" tabindex="0" aria-selected="${selected ? 'true' : 'false'}"`
    : '';
  return `<tr data-applicant-id="${escapeHtml(a.id)}"${rowAttrs}>
    ${checkbox ? `<td><input class="checkbox applicant-check" type="checkbox" value="${escapeHtml(a.id)}" ${selectedApplicants.has(a.id) ? 'checked' : ''} aria-label="${escapeHtml(a.name || '신청자')} 선택"></td>` : ''}
    <td><div class="table-name">${escapeHtml(a.name || '(이름 없음)')}</div><div class="table-sub">${escapeHtml(a.email || '이메일 없음')}</div></td>
    <td>${escapeHtml(a.payerName || '-')}</td>
    <td>${escapeHtml(displayCourse)}</td>
    <td>${formatWon(a.amount)}</td>
    <td>${badge('payment', a.paymentStatus)}</td>
    <td>${badge('delivery', a.deliveryStatus)}</td>
  </tr>`;
}

function isInteractiveRowTarget(target) {
  return Boolean(target?.closest?.('input, button, a, select, textarea, label'));
}

function bindSelectableRows(container, selector, idFromRow, onSelect) {
  container.querySelectorAll(selector).forEach((row) => {
    const activate = (event) => {
      if (event.type === 'click' && isInteractiveRowTarget(event.target)) return;
      if (event.type === 'keydown') {
        if (event.target !== row || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
      }
      const id = idFromRow(row);
      if (id) onSelect(id);
    };
    row.addEventListener('click', activate);
    row.addEventListener('keydown', activate);
  });
}

async function renderDashboard(state) {
  const stats = summaryStats(state);
  const recent = state.applicants.slice(0, 10);
  const metrics = [
    ['전체 신청', stats.all, '브라우저에 저장된 누적 신청', 'all', '전체 신청 보기'],
    ['입금 확인', stats.matched, '자동/수동 입금 확인 완료', 'matched', '입금 확인 보기'],
    ['입금 대기', stats.pending, '아직 입금과 연결되지 않음', 'pending', '입금 대기 보기'],
    ['확인 필요', stats.review, '사람이 직접 확인해야 하는 건', 'review', '확인 필요 보기'],
    ['발송 가능', stats.ready, '입금 확인 완료 · 아직 미발송', 'ready', '발송 가능 보기'],
    ['발송 완료', stats.sent, '한 번 이상 정상 발송 완료', 'sent', '발송 완료 보기'],
  ];

  main.innerHTML = `
    <div class="page-head"><div><h1>오늘 처리할 것만 보세요.</h1><p>신청자 전체를 훑는 대신 입금 확인이 애매한 건과 아직 발송하지 않은 확정자에 집중하도록 구성했습니다.</p></div><div class="page-actions"><button class="btn btn-primary" data-sync>${icon('refresh')}지금 동기화</button></div></div>
    <section class="stats metric-grid" aria-label="신청 현황">
      ${metrics.map(([label,value,foot,filter,link]) => `<a class="card stat metric-card" href="#applicants?filter=${filter}" aria-label="${escapeHtml(label)} ${value}건, ${escapeHtml(link)}"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${value}</div><div class="stat-link">${escapeHtml(link)} →</div><div class="stat-foot">${escapeHtml(foot)}</div></a>`).join('')}
    </section>
    <section class="card"><div class="card-head"><div><h2>최근 신청</h2><p>가장 최근에 동기화된 신청자입니다.</p></div><a class="btn btn-sm" href="#applicants?filter=all">전체 보기</a></div>
      <div class="table-wrap">${recent.length ? `<table><thead><tr><th>신청자</th><th>입금자</th><th>강의</th><th>금액</th><th>입금</th><th>메일</th></tr></thead><tbody>${recent.map((a) => { const course = state.courses.find((c)=>c.id===a.courseId); return applicantRow(a, { compact: true, courseName: course?.name || a.course }); }).join('')}</tbody></table>` : `<div class="empty"><strong>아직 신청자가 없습니다.</strong>Google Form을 연결하거나 설정에서 샘플 데이터를 넣어 흐름을 확인할 수 있습니다.</div>`}</div>
    </section>`;

  main.querySelector('[data-sync]').addEventListener('click', () => syncGoogleForm(true));
}

function filterApplicants(applicants, query, filter) {
  const q = normalizeName(query);
  return applicants.filter((a) => {
    const matchesQ = !q || [a.name, a.payerName, a.email, a.course, a.requestNo].some((v) => normalizeName(v).includes(q));
    return matchesQ && applicantMatchesFilter(a, filter);
  });
}

async function renderApplicants(state) {
  const routeInfo = routeState();
  const initialFilter = normalizeFilter(routeInfo.params.get('filter'));
  let selectedId = routeInfo.params.get('id') || '';
  main.innerHTML = `
    <div class="page-head"><div><h1>신청자</h1><p>행을 선택하면 오른쪽에서 신청·입금·발송 상태와 CS 메모를 바로 확인할 수 있습니다. 애매한 건은 자동 발송되지 않습니다.</p></div><div class="page-actions"><button class="btn" data-sync>${icon('refresh')}폼 동기화</button><button class="btn btn-primary" data-send-selected>${icon('mail')}선택 발송</button></div></div>
    <div class="toolbar"><div class="search">${icon('search')}<input id="applicantSearch" placeholder="이름, 입금자명, 이메일, 강의, 신청번호 검색"></div><div class="segmented" id="applicantFilters">${[['all','전체'],['matched','입금확인'],['pending','입금대기'],['review','확인필요'],['ready','발송가능'],['sent','발송완료']].map(([k,l]) => `<button data-filter="${k}" class="${k===initialFilter?'active':''}" aria-pressed="${k===initialFilter?'true':'false'}">${l}</button>`).join('')}</div></div>
    <div class="course-cs-layout applicant-master-detail">
      <section class="card"><div class="table-wrap"><table><thead><tr><th><input class="checkbox" id="checkAll" type="checkbox" aria-label="현재 목록 전체 선택"></th><th>신청자</th><th>입금자명</th><th>강의</th><th>금액</th><th>입금</th><th>메일</th></tr></thead><tbody id="applicantRows"></tbody></table></div></section>
      <aside class="card cs-panel" id="applicantPanel"><div class="empty"><strong>신청자를 선택해주세요.</strong>행을 클릭하면 신청·입금·발송 상태와 CS 작업을 확인할 수 있습니다.</div></aside>
    </div>`;

  let filter = initialFilter;
  const search = main.querySelector('#applicantSearch');
  const rows = main.querySelector('#applicantRows');
  const panel = main.querySelector('#applicantPanel');

  async function renderApplicantInspector(id) {
    const [applicant, payments, courses, logs] = await Promise.all([
      db.get('applicants', id), db.getAll('payments'), db.getAll('courses'), db.getAll('logs'),
    ]);
    if (!applicant) return;
    selectedId = id;
    setRouteFilter('applicants', filter, { replace: true, extra: { id } });
    rows.querySelectorAll('[data-applicant-id]').forEach((row) => {
      const active = row.dataset.applicantId === id;
      row.classList.toggle('is-selected', active);
      row.setAttribute('aria-selected', String(active));
    });
    const course = courses.find((c)=>c.id===applicant.courseId) || courses.find((c)=>normalizeName(c.name)===normalizeName(applicant.course));
    const matchedPayment = payments.find((p)=>p.id===applicant.matchedPaymentId);
    const applicantLogs = logs.filter((l)=>l.applicantId===id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const sendNeedsReview = hasUncertainDeliveryState(applicant);
    const canSend = ['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus) && isValidEmail(applicant.email) && Boolean(course?.videoUrl) && !sendNeedsReview;
    panel.innerHTML = `<div class="cs-panel-head"><div><div class="cs-eyebrow">${escapeHtml(applicant.requestNo || makeRequestNumber(applicant))}</div><h2>${escapeHtml(applicant.name || '(이름 없음)')}</h2><p>${escapeHtml(applicant.email || '이메일 없음')}</p></div>${badge('delivery', applicant.deliveryStatus)}</div>
      <div class="cs-status-grid">
        <div><span>신청일</span><strong>${formatDate(applicant.submittedAt)}</strong></div>
        <div><span>강의</span><strong>${escapeHtml(course?.name || applicant.course || '-')}</strong></div>
        <div><span>입금</span><strong>${matchedPayment ? `${escapeHtml(matchedPayment.payerName)} · ${formatWon(matchedPayment.amount)}` : badge('payment', applicant.paymentStatus)}</strong></div>
        <div><span>최종 발송</span><strong>${applicant.sentAt ? formatDate(applicant.sentAt) : '-'}</strong></div>
      </div>
      <div class="cs-actions">
        ${sendNeedsReview ? `<button class="btn btn-danger" data-applicant-resend-uncertain>${icon('mail')}확인 후 재발송</button>` : applicant.deliveryStatus==='SENT' ? `<button class="btn btn-primary" data-applicant-resend ${canSend?'':'disabled'}>${icon('mail')}녹화본 재발송</button>` : `<button class="btn btn-primary" data-applicant-send ${canSend?'':'disabled'}>${icon('mail')}메일 발송</button>`}
        <button class="btn" data-applicant-edit>신청정보 수정</button>
        <button class="btn" data-applicant-detail>신청 상세</button>
      </div>
      ${sendNeedsReview ? `<div class="warning cs-warning"><strong>발송 결과 확인이 필요합니다.</strong><br>Gmail이 이전 요청을 처리했을 가능성이 있습니다. 신청자 수신 여부를 확인한 뒤에만 재발송하세요.</div>` : !canSend ? `<div class="warning cs-warning">${!['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus)?'입금 확인이 끝나야 발송할 수 있습니다.':!isValidEmail(applicant.email)?'이메일 주소를 확인해주세요.':'강의 녹화본 URL을 확인해주세요.'}</div>` : ''}
      <div class="cs-section"><div class="cs-section-head"><strong>CS 메모</strong><span>이 신청 건에만 저장됩니다.</span></div><textarea id="applicantCsNote" class="cs-note" placeholder="문의 내용, 확인한 사항 등을 기록하세요.">${escapeHtml(applicant.note || '')}</textarea><div class="cs-note-actions"><button class="btn btn-sm" data-applicant-save-note>메모 저장</button></div></div>
      <div class="cs-section"><div class="cs-section-head"><strong>최근 활동</strong><span>${applicantLogs.length}건</span></div><div class="activity cs-activity">${applicantLogs.length ? applicantLogs.slice(0,20).map(activityLogHtml).join('') : '<div class="empty" style="padding:18px 0"><strong>활동 기록이 없습니다.</strong></div>'}</div></div>`;
    hydrateIcons(panel);
    bindEmailSnapshotButtons(panel);
    panel.querySelector('[data-applicant-edit]')?.addEventListener('click',()=>openApplicantEditModal(id));
    panel.querySelector('[data-applicant-detail]')?.addEventListener('click',()=>openApplicantDetail(id));
    panel.querySelector('[data-applicant-send]')?.addEventListener('click',()=>sendApplicantsByIds([id], false));
    panel.querySelector('[data-applicant-resend]')?.addEventListener('click',()=>sendApplicantsByIds([id], true));
    panel.querySelector('[data-applicant-resend-uncertain]')?.addEventListener('click',()=>sendApplicantsByIds([id], true, { allowUncertain: true }));
    panel.querySelector('[data-applicant-save-note]')?.addEventListener('click',async()=>{
      const note = panel.querySelector('#applicantCsNote').value.trim();
      await withOperationLock('CS 메모 저장', async () => {
        const live = await db.get('applicants', id);
        if (!live) throw new Error('신청 정보를 찾을 수 없습니다.');
        await db.put('applicants',{...live,note,updatedAt:new Date().toISOString()});
        await addLog('CS 메모 저장',id,note ? 'CS 메모를 저장했습니다.' : 'CS 메모를 비웠습니다.');
      });
      toast('CS 메모를 저장했습니다.');
      await renderApplicantInspector(id);
    });
  }

  function currentApplicantList() {
    return filterApplicants(state.applicants, search.value, filter);
  }

  async function draw() {
    const list = currentApplicantList();
    if (!list.some((a)=>a.id===selectedId)) selectedId = list[0]?.id || '';
    rows.innerHTML = list.length ? list.map((a) => {
      const course = state.courses.find((c)=>c.id===a.courseId);
      return applicantRow(a, { checkbox: true, courseName: course?.name || a.course, selectable: true, selected: a.id===selectedId });
    }).join('') : `<tr><td colspan="7"><div class="empty"><strong>조건에 맞는 신청자가 없습니다.</strong>검색어 또는 필터를 바꿔보세요.</div></td></tr>`;
    rows.querySelectorAll('.applicant-check').forEach((node) => node.addEventListener('change', () => node.checked ? selectedApplicants.add(node.value) : selectedApplicants.delete(node.value)));
    bindSelectableRows(rows, 'tr[data-applicant-id]', (row)=>row.dataset.applicantId, renderApplicantInspector);
    if (selectedId) await renderApplicantInspector(selectedId);
    else {
      setRouteFilter('applicants', filter, { replace: true });
      panel.innerHTML = '<div class="empty"><strong>조건에 맞는 신청자가 없습니다.</strong>검색어 또는 필터를 바꿔보세요.</div>';
    }
  }

  await draw();
  search.addEventListener('input', () => { draw(); });
  main.querySelector('#applicantFilters').addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-filter]'); if (!btn) return;
    filter = normalizeFilter(btn.dataset.filter);
    selectedId = '';
    main.querySelectorAll('#applicantFilters button').forEach((b) => { const active=b===btn; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    setRouteFilter('applicants', filter);
    await draw();
  });
  main.querySelector('#checkAll').addEventListener('change', (event) => {
    rows.querySelectorAll('.applicant-check').forEach((node) => { node.checked = event.target.checked; node.checked ? selectedApplicants.add(node.value) : selectedApplicants.delete(node.value); });
  });
  main.querySelector('[data-sync]').addEventListener('click', () => syncGoogleForm(true));
  main.querySelector('[data-send-selected]').addEventListener('click', sendSelectedApplicants);
}

async function openApplicantDetail(id) {
  const [applicant, payments, courses, logs] = await Promise.all([db.get('applicants', id), db.getAll('payments'), db.getAll('courses'), db.getAll('logs')]);
  if (!applicant) return;
  const matchedPayment = payments.find((p) => p.id === applicant.matchedPaymentId);
  const suggestedPayments = (applicant.suggestedPaymentIds || []).map((pid)=>payments.find((p)=>p.id===pid)).filter(Boolean).filter((p)=>!p.matchedApplicantId || p.matchedApplicantId===applicant.id);
  const applicantLogs = logs.filter((l) => l.applicantId === id).slice(0, 12);
  const course = courses.find((c) => c.id === applicant.courseId) || courses.find((c) => normalizeName(c.name) === normalizeName(applicant.course));
  const reviewLabels = { SIMILAR_NAME:'입금자명이 비슷한 후보', EXACT_AMBIGUOUS:'정확 일치 후보가 여러 건', DATE_UNKNOWN:'입금일을 확인할 수 없는 후보' };
  showModal({
    title: applicant.name || '신청자 상세', description: `${applicant.email || '이메일 없음'}${course ? ` · ${course.name}` : ''}`, wide: true,
    body: `<div class="grid-equal">
      <div class="stack"><div class="card card-pad"><div class="detail-card-head"><strong class="detail-label">신청 정보</strong><button class="btn btn-sm" data-edit-applicant>이름 · 이메일 · 강의 수정</button></div><div class="form-grid"><div class="field"><label>신청일</label><div>${formatDate(applicant.submittedAt)}</div></div><div class="field"><label>강의</label><div>${escapeHtml(course?.name || applicant.course || '-')}</div></div><div class="field"><label>입금자명</label><div>${escapeHtml(applicant.payerName || '-')}</div></div><div class="field"><label>금액</label><div>${formatWon(applicant.amount)}</div></div><div class="field"><label>입금상태</label><div>${badge('payment', applicant.paymentStatus)}</div></div><div class="field"><label>발송상태</label><div>${badge('delivery', applicant.deliveryStatus)}</div></div></div></div>
      <div class="card card-pad"><strong class="detail-label">연결된 입금</strong>${matchedPayment ? `<p class="detail-copy">${escapeHtml(matchedPayment.payerName)} · ${formatWon(matchedPayment.amount)}<br>${escapeHtml(matchedPayment.date || '-')}</p>` : `<p class="detail-copy muted">연결된 입금이 없습니다.</p>`}${suggestedPayments.length ? `<div class="candidate-list"><div class="candidate-title">${escapeHtml(reviewLabels[applicant.reviewReason]||'확인할 입금 후보')}</div>${suggestedPayments.map((p)=>`<div class="candidate-row"><div><strong>${escapeHtml(p.payerName)}</strong><span>${escapeHtml(p.date||'입금일 없음')} · ${formatWon(p.amount)}</span></div><button class="btn btn-sm" data-link-payment="${escapeHtml(p.id)}">이 입금 연결</button></div>`).join('')}</div>`:''}<div class="page-actions" style="justify-content:flex-start;margin-top:12px">${!matchedPayment?'<button class="btn btn-sm" data-manual-confirm>입금 내역 없이 수동확인</button>':''}${applicant.paymentStatus === 'REVIEW_REQUIRED' ? '<button class="btn btn-sm" data-clear-review>입금대기로 되돌리기</button>' : ''}</div></div></div>
      <div class="stack"><div class="card card-pad"><strong class="detail-label">녹화본 / 발송 이력</strong><p class="detail-copy muted">${course ? escapeHtml(course.videoUrl) : '강의 관리에서 연결된 강의를 확인해주세요.'}</p><div class="delivery-meta"><div><span>최종 발송</span><strong>${applicant.sentAt?formatDate(applicant.sentAt):'-'}</strong></div><div><span>발송 횟수</span><strong>${applicant.sendCount||0}회</strong></div></div><div class="page-actions" style="justify-content:flex-start"><button class="btn btn-primary btn-sm" data-send-one>${hasUncertainDeliveryState(applicant) ? '확인 후 재발송' : applicant.deliveryStatus === 'SENT' ? '재발송' : '메일 발송'}</button>${course?`<a class="btn btn-sm" href="#course/${encodeURIComponent(course.id)}" data-close-and-go>강의 히스토리</a>`:''}</div>${hasUncertainDeliveryState(applicant) ? `<div class="warning" style="margin-top:12px"><strong>발송 결과 확인이 필요합니다.</strong><br>이전 요청이 Gmail에 전달됐을 수 있습니다. 수신 여부를 확인한 뒤 재발송하세요.</div>` : ''}</div>
      <div class="card card-pad"><strong class="detail-label">최근 활동</strong><div class="activity">${applicantLogs.length ? applicantLogs.map(activityLogHtml).join('') : '<div class="empty" style="padding:22px 0">활동 로그가 없습니다.</div>'}</div></div></div>
    </div>`,
    actions: '<button class="btn" data-close-modal>닫기</button>',
  });
  bindEmailSnapshotButtons(modalRoot);
  modalRoot.querySelectorAll('[data-link-payment]').forEach((button)=>button.addEventListener('click',async()=>{
    try {
      await withOperationLock('입금 수동연결', async () => {
        const liveApplicant = await db.get('applicants', applicant.id);
        const payment = await db.get('payments', button.dataset.linkPayment);
        if (!liveApplicant) throw new Error('신청 정보를 찾을 수 없습니다.');
        if (!payment || (payment.matchedApplicantId && payment.matchedApplicantId !== applicant.id)) throw new Error('이 입금은 이미 다른 신청자와 연결되어 있습니다.');
        const now = new Date().toISOString();
        await db.atomicWrite({
          applicants: [{...liveApplicant,paymentStatus:'MANUAL_CONFIRMED',matchedPaymentId:payment.id,suggestedPaymentIds:[],reviewReason:'',updatedAt:now}],
          payments: [{...payment,matchStatus:'MATCHED',matchedApplicantId:applicant.id,courseId:liveApplicant.courseId||payment.courseId||'',suggestedApplicantIds:[],reviewReason:'',updatedAt:now}],
        });
        await addLog('입금 수동연결',applicant.id,`${payment.payerName} · ${formatWon(payment.amount)} 입금을 직접 연결했습니다.`);
        await runAutoMatch({silent:true,renderAfter:false,alreadyLocked:true});
      });
      closeModal(); await render(); toast('입금을 연결했습니다.');
    } catch (error) { toast('입금 연결 실패', error.message, 'error'); }
  }));
  modalRoot.querySelector('[data-manual-confirm]')?.addEventListener('click', async () => {
    await withOperationLock('수동 입금확인', async () => {
      const live = await db.get('applicants', applicant.id);
      if (!live) throw new Error('신청 정보를 찾을 수 없습니다.');
      await db.put('applicants', { ...live, paymentStatus: 'MANUAL_CONFIRMED', suggestedPaymentIds: [], reviewReason: '', updatedAt: new Date().toISOString() });
      await addLog('수동 입금확인', applicant.id, `${live.name} 신청을 입금 내역 연결 없이 수동 확인했습니다.`);
    });
    closeModal(); await render(); toast('수동 입금확인 완료');
  });
  modalRoot.querySelector('[data-clear-review]')?.addEventListener('click', async () => {
    await withOperationLock('확인필요 해제', async () => {
      const live = await db.get('applicants', applicant.id);
      if (!live) throw new Error('신청 정보를 찾을 수 없습니다.');
      const paymentUpdates = [];
      for (const paymentId of live.suggestedPaymentIds || []) {
        const payment = await db.get('payments', paymentId);
        if (!payment || payment.matchedApplicantId) continue;
        const remaining = (payment.suggestedApplicantIds || []).filter((applicantId) => applicantId !== applicant.id);
        paymentUpdates.push({
          ...payment,
          suggestedApplicantIds: remaining,
          matchStatus: remaining.length ? 'REVIEW_REQUIRED' : 'PENDING',
          reviewReason: remaining.length ? payment.reviewReason : '',
          updatedAt: new Date().toISOString(),
        });
      }
      const updatedApplicant = { ...live, paymentStatus: 'PENDING', matchedPaymentId: '', suggestedPaymentIds: [], reviewReason: '', updatedAt: new Date().toISOString() };
      await db.atomicWrite({ applicants: [updatedApplicant], payments: paymentUpdates });
      await addLog('확인필요 해제', applicant.id, '확인 후보를 해제하고 입금대기 상태로 되돌렸습니다.');
    });
    closeModal(); await render();
  });
  modalRoot.querySelector('[data-edit-applicant]')?.addEventListener('click', async () => {
    closeModal();
    await openApplicantEditModal(applicant.id, { reopenDetail: true });
  });
  modalRoot.querySelector('[data-send-one]').addEventListener('click', async () => {
    const uncertain = hasUncertainDeliveryState(applicant);
    closeModal();
    await sendApplicantsByIds([applicant.id], applicant.deliveryStatus === 'SENT' || uncertain, { allowUncertain: uncertain });
  });
  modalRoot.querySelector('[data-close-and-go]')?.addEventListener('click',()=>closeModal());
}

async function openApplicantEditModal(id, { reopenDetail = false } = {}) {
  const [applicant, courses] = await Promise.all([db.get('applicants', id), db.getAll('courses')]);
  if (!applicant) return;
  const currentCourse = courses.find((c) => c.id === applicant.courseId) || courses.find((c) => normalizeName(c.name) === normalizeName(applicant.course));
  const courseOptions = courses.map((course) => `<option value="${escapeHtml(course.id)}" ${course.id === currentCourse?.id ? 'selected' : ''}>${escapeHtml(course.name)}${course.active === false ? ' · 사용 중지' : ''}</option>`).join('');
  const baseSnapshot = JSON.stringify({
    updatedAt: applicant.updatedAt || '',
    name: applicant.name || '',
    email: applicant.email || '',
    courseId: applicant.courseId || '',
    paymentStatus: applicant.paymentStatus || '',
    deliveryStatus: applicant.deliveryStatus || '',
    matchedPaymentId: applicant.matchedPaymentId || '',
    sendCount: applicant.sendCount || 0,
    lastSendAttemptAt: applicant.lastSendAttemptAt || '',
  });

  showModal({
    title: '신청 정보 수정',
    description: `${applicant.requestNo || makeRequestNumber(applicant)} · Form 재동기화 후에도 수정값을 유지합니다.`,
    body: `<div class="help-box">CS를 위한 로컬 보정입니다. 입금자명과 결제금액은 입금 매칭 안정성을 위해 여기서 수정하지 않습니다. 변경 내용은 활동 로그에 남습니다.</div>
      <div class="form-grid" style="margin-top:14px">
        <div class="field"><label>신청자 이름</label><input id="editApplicantName" value="${escapeHtml(applicant.name || '')}"></div>
        <div class="field"><label>이메일</label><input id="editApplicantEmail" type="email" value="${escapeHtml(applicant.email || '')}"></div>
        <div class="field span-2"><label>강의</label><select id="editApplicantCourse">${courseOptions}</select><small>사용 중지 강의는 과거 CS 보정을 위해 수동 선택할 수 있지만 Form 자동배정에는 사용되지 않습니다.</small></div>
      </div>`,
    actions: '<button class="btn" data-close-modal>취소</button><button class="btn btn-primary" data-save-applicant-edit>변경 저장</button>',
  });

  modalRoot.querySelector('[data-save-applicant-edit]')?.addEventListener('click', async () => {
    const desired = {
      name: modalRoot.querySelector('#editApplicantName').value.trim(),
      email: modalRoot.querySelector('#editApplicantEmail').value.trim(),
      courseId: modalRoot.querySelector('#editApplicantCourse').value,
    };
    const desiredCourse = courses.find((item) => item.id === desired.courseId);
    if (!desired.name) return toast('신청자 이름을 입력해주세요.', '', 'error');
    if (!isValidEmail(desired.email)) return toast('올바른 이메일 주소를 입력해주세요.', '', 'error');
    if (!desiredCourse) return toast('강의를 선택해주세요.', '', 'error');

    const save = async (confirmedRisk = false) => withOperationLock('신청정보 수정', async () => {
      const live = await db.get('applicants', id);
      if (!live) throw new Error('신청 정보를 찾을 수 없습니다.');
      const liveDesiredCourse = await db.get('courses', desired.courseId);
      if (!liveDesiredCourse) throw new Error('선택한 강의가 다른 탭에서 삭제되었습니다. 최신 내용을 다시 열어주세요.');
      const liveSnapshot = JSON.stringify({
        updatedAt: live.updatedAt || '',
        name: live.name || '',
        email: live.email || '',
        courseId: live.courseId || '',
        paymentStatus: live.paymentStatus || '',
        deliveryStatus: live.deliveryStatus || '',
        matchedPaymentId: live.matchedPaymentId || '',
        sendCount: live.sendCount || 0,
        lastSendAttemptAt: live.lastSendAttemptAt || '',
      });
      if (liveSnapshot !== baseSnapshot) {
        const conflict = new Error('다른 탭이나 작업에서 이 신청 정보가 변경되었습니다. 최신 내용을 다시 연 뒤 수정해주세요.');
        conflict.code = 'STALE_EDIT';
        throw conflict;
      }

      const oldCourse = courses.find((item) => item.id === live.courseId) || currentCourse;
      const changes = [];
      if (live.name !== desired.name) changes.push({ field: 'name', label: '이름', before: live.name || '', after: desired.name });
      if (live.email !== desired.email) changes.push({ field: 'email', label: '이메일', before: live.email || '', after: desired.email });
      const courseChanged = (live.courseId || '') !== liveDesiredCourse.id || normalizeName(live.course) !== normalizeName(liveDesiredCourse.name);
      if (courseChanged) changes.push({ field: 'course', label: '강의', before: live.course || oldCourse?.name || '', after: liveDesiredCourse.name });
      if (!changes.length) return { noChanges: true };

      const highRiskCourseChange = courseChanged && requiresCourseChangeConfirmation(live, liveDesiredCourse.id);
      if (highRiskCourseChange && !confirmedRisk) {
        const linkedPayment = live.matchedPaymentId ? await db.get('payments', live.matchedPaymentId) : null;
        return { needsConfirmation: true, live, oldCourse, desiredCourse: liveDesiredCourse, linkedPayment };
      }

      const overrides = { ...(live.manualOverrides || {}) };
      changes.forEach((change) => { overrides[change.field] = true; });
      const editedAt = new Date().toISOString();
      const updated = {
        ...live,
        name: desired.name,
        email: desired.email,
        courseId: liveDesiredCourse.id,
        course: liveDesiredCourse.name,
        manualOverrides: overrides,
        manuallyEditedAt: editedAt,
        updatedAt: editedAt,
      };
      const writes = { applicants: [updated], payments: [] };
      if (live.matchedPaymentId && courseChanged) {
        const payment = await db.get('payments', live.matchedPaymentId);
        if (payment) writes.payments.push({ ...payment, courseId: liveDesiredCourse.id, updatedAt: editedAt });
      }
      await db.atomicWrite(writes);

      const printable = (value) => value ? `“${value}”` : '“없음”';
      const message = changes.map((change) => `${change.label}: ${printable(change.before)} → ${printable(change.after)}`).join(' · ');
      await addLog('신청정보 수정', id, message, {
        courseId: liveDesiredCourse.id,
        previousCourseId: live.courseId || '',
        changes,
        editedAt,
      });
      return { saved: true };
    });

    try {
      const result = await save(false);
      if (result?.noChanges) return toast('변경된 내용이 없습니다.');
      if (result?.needsConfirmation) {
        const { live, oldCourse, desiredCourse: nextCourse, linkedPayment } = result;
        const priceChanged = parseMoney(oldCourse?.price) !== parseMoney(nextCourse?.price);
        showModal({
          title: '입금/발송 이력이 있는 신청의 강의를 변경할까요?',
          description: '이 변경은 이후 재발송할 녹화본과 강의별 CS 히스토리에 영향을 줍니다.',
          body: `<div class="warning"><strong>운영 이력이 있는 신청입니다.</strong><br>강의를 잘못 변경하면 이후 재발송 시 다른 녹화본이 전달될 수 있습니다.</div>
            <div class="form-grid" style="margin-top:14px">
              <div class="help-box"><strong>기존 강의</strong><br>${escapeHtml(oldCourse?.name || live.course || '-')} · ${formatWon(oldCourse?.price || live.amount)}</div>
              <div class="help-box"><strong>변경 강의</strong><br>${escapeHtml(nextCourse.name)} · ${formatWon(nextCourse.price)}</div>
              <div class="help-box"><strong>연결 입금</strong><br>${linkedPayment ? `${escapeHtml(linkedPayment.payerName)} · ${formatWon(linkedPayment.amount)}` : '입금 내역 없이 수동확인'}</div>
              <div class="help-box"><strong>발송 이력</strong><br>${live.sendCount || 0}회 · ${live.sentAt ? formatDate(live.sentAt) : '발송 이력 없음'}</div>
            </div>
            ${priceChanged ? `<div class="warning" style="margin-top:12px"><strong>강의 가격이 다릅니다.</strong> 기존 ${formatWon(oldCourse?.price || live.amount)} → 변경 ${formatWon(nextCourse.price)}. 기존 입금액 자체는 수정되지 않습니다.</div>` : ''}`,
          actions: '<button class="btn" data-back-edit>돌아가기</button><button class="btn btn-danger" data-confirm-risk-course-change>강의 변경 계속</button>',
          wide: true,
        });
        modalRoot.querySelector('[data-back-edit]')?.addEventListener('click', () => { closeModal(); openApplicantEditModal(id, { reopenDetail }); });
        modalRoot.querySelector('[data-confirm-risk-course-change]')?.addEventListener('click', async () => {
          try {
            const finalResult = await save(true);
            if (!finalResult?.saved) return;
            closeModal();
            toast('신청 정보를 수정했습니다.', '변경 내용과 고위험 강의 변경 이력을 기록했습니다.');
            await render();
            if (reopenDetail && route() === 'applicants') await openApplicantDetail(id);
          } catch (error) {
            closeModal();
            toast('수정 실패', error.message, 'error');
          }
        });
        return;
      }
      if (result?.saved) {
        closeModal();
        toast('신청 정보를 수정했습니다.', '변경 내용은 Form 재동기화 후에도 유지됩니다.');
        await render();
        if (reopenDetail && route() === 'applicants') await openApplicantDetail(id);
      }
    } catch (error) {
      closeModal();
      toast('수정 실패', error.message, 'error');
    }
  });
}

async function renderPayments(state) {
  const allowed = new Set(['all','matched','review','pending']);
  let filter = normalizeFilter(routeState().params.get('filter'), allowed);
  const reviewApplicants = state.applicants.filter((a) => a.paymentStatus === 'REVIEW_REQUIRED').length;
  const counts = {
    all: state.payments.length,
    matched: state.payments.filter((p) => p.matchStatus === 'MATCHED').length,
    review: state.payments.filter((p) => p.matchStatus === 'REVIEW_REQUIRED').length,
    pending: state.payments.filter((p) => !p.matchStatus || p.matchStatus === 'PENDING').length,
  };
  const metrics = [
    ['전체 입금 내역', counts.all, '현재 브라우저에 저장된 은행 입금 내역', 'all', '전체 입금 보기'],
    ['입금 확인', counts.matched, '신청자와 연결된 입금', 'matched', '입금 확인 보기'],
    ['확인 필요', counts.review, '사람이 확인해야 하는 입금', 'review', '확인 필요 보기'],
    ['미매칭 입금', counts.pending, '아직 신청자와 연결되지 않은 입금', 'pending', '미매칭 입금 보기'],
  ];

  main.innerHTML = `
    <div class="page-head"><div><h1>입금 관리</h1><p>은행 CSV는 서버에 올리지 않고 브라우저에서 읽습니다. CSV를 추가하면 즉시 매칭합니다. 입금자명·금액이 정확히 같고 입금일 조건까지 통과한 유일한 1:1 후보만 자동확정합니다.</p></div><div class="page-actions"><button class="btn" data-import>${icon('upload')}CSV 가져오기</button><button class="btn btn-primary" data-match>${icon('check')}다시 매칭</button></div></div>
    <section class="stats payment-stats" aria-label="입금 현황">${metrics.map(([label,value,foot,key,link])=>`<button class="card stat metric-card ${filter===key?'is-active':''}" data-payment-filter="${key}" aria-pressed="${filter===key?'true':'false'}"><div class="stat-label">${escapeHtml(label)}</div><div class="stat-value">${value}</div><div class="stat-link">${escapeHtml(link)} →</div><div class="stat-foot">${escapeHtml(foot)}</div></button>`).join('')}</section>
    <div class="toolbar payment-toolbar"><div class="history-meta">현재 필터 <strong id="paymentFilterLabel"></strong></div>${reviewApplicants ? `<a class="inline-drilldown" href="#applicants?filter=review">확인 필요 신청 ${reviewApplicants}건 보기 →</a>` : '<span></span>'}</div>
    <section class="card"><div class="card-head"><div><h2>입금내역</h2><p>CSV 원문 전체가 아니라 매칭에 필요한 열을 정규화해서 저장합니다.</p></div></div><div class="table-wrap"><table><thead><tr><th>입금일시</th><th>입금자명</th><th>금액</th><th>매칭상태</th><th>신청자</th></tr></thead><tbody id="paymentRows"></tbody></table></div></section>`;

  const rows = main.querySelector('#paymentRows');
  const label = main.querySelector('#paymentFilterLabel');
  const labels = { all:'전체 입금', matched:'입금 확인', review:'확인 필요', pending:'미매칭 입금' };
  const draw = () => {
    const list = state.payments.filter((p) => filter === 'all' || (filter === 'matched' && p.matchStatus === 'MATCHED') || (filter === 'review' && p.matchStatus === 'REVIEW_REQUIRED') || (filter === 'pending' && (!p.matchStatus || p.matchStatus === 'PENDING')));
    label.textContent = labels[filter];
    rows.innerHTML = list.length ? list.map((p) => { const a=state.applicants.find((x)=>x.id===p.matchedApplicantId); return `<tr><td>${escapeHtml(p.date||'-')}</td><td class="table-name">${escapeHtml(p.payerName)}</td><td>${formatWon(p.amount)}</td><td>${p.matchStatus==='MATCHED'?badge('payment','MATCHED'):p.matchStatus==='REVIEW_REQUIRED'?badge('payment','REVIEW_REQUIRED'):badge('payment','PENDING')}</td><td>${a?escapeHtml(a.name):'-'}</td></tr>`; }).join('') : `<tr><td colspan="5"><div class="empty"><strong>이 조건의 입금내역이 없습니다.</strong>다른 현황 카드를 선택해보세요.</div></td></tr>`;
  };
  draw();
  main.querySelectorAll('[data-payment-filter]').forEach((card)=>card.addEventListener('click',()=>{
    filter = normalizeFilter(card.dataset.paymentFilter, allowed);
    main.querySelectorAll('[data-payment-filter]').forEach((node)=>{const active=node===card;node.classList.toggle('is-active',active);node.setAttribute('aria-pressed',String(active));});
    setRouteFilter('payments', filter);
    draw();
  }));
  main.querySelector('[data-import]').addEventListener('click', openCsvImport);
  main.querySelector('[data-match]').addEventListener('click', () => runAutoMatch());
}

function hashString(value) {
  let hash = 2166136261;
  for (let i=0;i<value.length;i+=1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}

function openCsvImport() {
  showModal({ title: '은행 CSV 가져오기', description: '파일은 이 브라우저에서만 읽고 서버로 업로드하지 않습니다.', body: `
    <div class="dropzone" id="csvDrop"><strong>CSV 파일을 선택하세요.</strong><p>은행에서 내려받은 CSV를 권장합니다.</p><div style="margin-top:12px"><input id="csvFile" type="file" accept=".csv,text/csv"></div></div><div id="csvMapping" style="margin-top:16px"></div>`, actions: '<button class="btn" data-close-modal>닫기</button><button class="btn btn-primary hidden" id="csvImportConfirm">가져오기</button>', wide: true });
  const fileInput = modalRoot.querySelector('#csvFile');
  const drop = modalRoot.querySelector('#csvDrop');
  let parsed;
  let mapping;
  fileInput.addEventListener('change', () => fileInput.files[0] && readCsv(fileInput.files[0]));
  ['dragenter','dragover'].forEach((name)=>drop.addEventListener(name,(e)=>{e.preventDefault();drop.classList.add('dragover');}));
  ['dragleave','drop'].forEach((name)=>drop.addEventListener(name,(e)=>{e.preventDefault();drop.classList.remove('dragover');}));
  drop.addEventListener('drop',(e)=>{const file=e.dataTransfer.files[0]; if(file) readCsv(file);});

  async function readCsv(file) {
    const buffer = await file.arrayBuffer();
    let text = new TextDecoder('utf-8').decode(buffer);
    if ((text.match(/�/g)||[]).length > 2) {
      try { text = new TextDecoder('euc-kr').decode(buffer); } catch {}
    }
    parsed = parseCsv(text); mapping = detectCsvHeaders(parsed.headers);
    const opts = (selected='') => `<option value="">선택</option>${parsed.headers.map((h)=>`<option value="${escapeHtml(h)}" ${h===selected?'selected':''}>${escapeHtml(h)}</option>`).join('')}`;
    modalRoot.querySelector('#csvMapping').innerHTML = `<div class="form-grid">
      <div class="field"><label>은행 고유번호 열 <span class="muted">(선택)</span></label><select id="mapTransactionId">${opts(mapping.transactionId)}</select><small>은행 고유번호·참조번호가 있으면 중복 방지에 우선 사용합니다.</small></div>
      <div class="field"><label>입금일시 열</label><select id="mapDate">${opts(mapping.date)}</select></div>
      <div class="field"><label>입금자명 열</label><select id="mapPayer">${opts(mapping.payerName)}</select></div>
      <div class="field"><label>입금액 열</label><select id="mapAmount">${opts(mapping.amount)}</select></div>
      <div class="field"><label>파일</label><div>${escapeHtml(file.name)} · ${parsed.rows.length}행</div></div>
    </div><div class="help-box" style="margin-top:14px">미리보기: ${parsed.rows.slice(0,3).map((r)=>escapeHtml(JSON.stringify(r))).join('<br>')}</div>`;
    modalRoot.querySelector('#csvImportConfirm').classList.remove('hidden');
  }

  modalRoot.querySelector('#csvImportConfirm').addEventListener('click', async () => {
    const transactionIdKey = modalRoot.querySelector('#mapTransactionId')?.value || '';
    const dateKey = modalRoot.querySelector('#mapDate')?.value || '';
    const payerKey = modalRoot.querySelector('#mapPayer')?.value || '';
    const amountKey = modalRoot.querySelector('#mapAmount')?.value || '';
    if (!parsed || !payerKey || !amountKey) return toast('열 매핑을 확인해주세요.', '입금자명과 입금액은 필수입니다.', 'error');

    try {
      const outcome = await withOperationLock('CSV 가져오기', async () => {
        const existing = await db.getAll('payments');
        const existingFingerprintCounts = new Map();
        existing.forEach((payment) => {
          const fingerprint = paymentFingerprint({
            transactionId: payment.transactionId || '',
            date: payment.date,
            payerName: payment.payerName,
            amount: payment.amount,
          });
          existingFingerprintCounts.set(fingerprint, (existingFingerprintCounts.get(fingerprint) || 0) + 1);
        });

        const occurrence = new Map();
        const values = [];
        parsed.rows.forEach((row) => {
          const payerName = row[payerKey];
          const amount = parseMoney(row[amountKey]);
          if (!payerName || amount <= 0) return;
          const date = dateKey ? row[dateKey] : '';
          const transactionId = transactionIdKey ? row[transactionIdKey] : '';
          const fingerprint = paymentFingerprint({ transactionId, date, payerName, amount });
          const count = (occurrence.get(fingerprint) || 0) + 1;
          occurrence.set(fingerprint, count);
          if ((existingFingerprintCounts.get(fingerprint) || 0) >= count) return;
          const importKey = `${hashString(fingerprint)}_${count}`;
          const now = new Date().toISOString();
          values.push({
            id: `pay_${importKey}`, importKey, transactionId, date, payerName, amount, fingerprint,
            matchStatus: 'PENDING', matchedApplicantId: '', importedAt: now, updatedAt: now,
          });
        });
        if (values.length) await db.bulkPut('payments', values);
        const result = await runAutoMatch({ silent: true, renderAfter: false, alreadyLocked: true });
        return { values, result };
      });
      closeModal();
      toast('CSV 가져오기 + 자동 매칭 완료', `신규 입금 ${outcome.values.length}건 · 자동확인 ${outcome.result.matched.length}건 · 확인필요 ${outcome.result.review.length}건`);
      await render();
    } catch (error) {
      toast('CSV 처리 실패', error.message, 'error');
    }
  });
}

async function runAutoMatch({ silent = false, renderAfter = true, alreadyLocked = false } = {}) {
  const execute = async () => {
    const [applicants, payments, beforeDays, afterDays] = await Promise.all([
      db.getAll('applicants'),
      db.getAll('payments'),
      db.getSetting('matchBeforeDays', 1),
      db.getSetting('matchAfterDays', 7),
    ]);
    const result = autoMatch(applicants, payments, { beforeDays, afterDays });
    const now = new Date().toISOString();
    const applicantUpdates = result.applicantUpdates.map((row) => ({ ...row, updatedAt: now }));
    const paymentUpdates = result.paymentUpdates.map((row) => ({ ...row, updatedAt: now }));
    if (applicantUpdates.length || paymentUpdates.length) {
      await db.atomicWrite({ applicants: applicantUpdates, payments: paymentUpdates });
    }
    for (const { applicantId } of result.matched) {
      await addLog('입금 자동매칭', applicantId, `입금자명·금액·입금일 조건이 유일하게 일치해 자동 확인했습니다. (신청 ${beforeDays}일 전 ~ 신청 후 ${afterDays}일)`);
    }
    if (!silent) toast('자동 매칭 완료', `확정 ${result.matched.length}건 · 확인필요 ${result.review.length}건`);
    if (renderAfter) await render();
    return result;
  };
  if (alreadyLocked) return execute();
  return withOperationLock('입금 자동매칭', execute);
}

async function renderCourses(state) {
  main.innerHTML = `<div class="page-head"><div><h1>강의 관리</h1><p>강의를 선택하면 해당 강의의 신청자·입금·발송·CS 기록을 독립된 히스토리로 확인할 수 있습니다.</p></div><div class="page-actions"><button class="btn btn-primary" data-add-course>${icon('plus')}강의 추가</button></div></div>
    <section class="card card-pad">${state.courses.length ? `<div class="course-list">${state.courses.map((c)=>{const count=state.applicants.filter((a)=>a.courseId===c.id || (!a.courseId && normalizeName(a.course)===normalizeName(c.name))).length;const sent=state.applicants.filter((a)=>(a.courseId===c.id || (!a.courseId && normalizeName(a.course)===normalizeName(c.name)))&&a.deliveryStatus==='SENT').length;const mailTemplate=resolveEmailTemplate(state.templates,state.defaultTemplateId,c);return `<div class="course-item"><div><div class="course-title-line"><h3>${escapeHtml(c.name)}</h3>${c.active===false?'<span class="badge badge-neutral">사용 중지</span>':''}</div><p class="course-meta-links"><a href="#course/${encodeURIComponent(c.id)}?filter=all">${count}명 신청 →</a><span>·</span><a href="#course/${encodeURIComponent(c.id)}?filter=sent">${sent}명 발송 →</a><span>·</span><span>메일: ${escapeHtml(mailTemplate?.name || '없음')}</span><span>·</span><span class="course-url">${escapeHtml(c.videoUrl)}</span></p></div><div class="course-actions"><div class="course-price">${formatWon(c.price)}</div><a class="btn btn-sm" href="#course/${encodeURIComponent(c.id)}">히스토리</a><button class="btn btn-sm" data-edit-course="${escapeHtml(c.id)}">편집</button></div></div>`;}).join('')}</div>` : '<div class="empty"><strong>등록된 강의가 없습니다.</strong>강의명과 녹화본 URL을 먼저 등록해주세요.</div>'}</section>`;
  main.querySelector('[data-add-course]').addEventListener('click', () => openCourseModal());
  main.querySelectorAll('[data-edit-course]').forEach((n)=>n.addEventListener('click',()=>openCourseModal(n.dataset.editCourse)));
}

async function renderCourseHistory(state, courseId) {
  const course = state.courses.find((c) => c.id === courseId);
  if (!course) {
    main.innerHTML = `<div class="empty"><strong>강의를 찾을 수 없습니다.</strong><a class="btn" href="#courses">강의 관리로 돌아가기</a></div>`;
    return;
  }
  const belongs = (a) => a.courseId === course.id || (!a.courseId && normalizeName(a.course) === normalizeName(course.name));
  const courseApplicants = state.applicants.filter(belongs).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
  const applicantIds = new Set(courseApplicants.map((a) => a.id));
  const matchedPaymentIds = new Set(courseApplicants.map((a) => a.matchedPaymentId).filter(Boolean));
  const coursePayments = state.payments.filter((p) => p.courseId === course.id || matchedPaymentIds.has(p.id) || applicantIds.has(p.matchedApplicantId));
  const courseLogs = state.logs.filter((l) => l.courseId === course.id || applicantIds.has(l.applicantId));
  const sent = courseApplicants.filter((a) => a.deliveryStatus === 'SENT').length;
  const matched = courseApplicants.filter((a) => ['MATCHED','MANUAL_CONFIRMED'].includes(a.paymentStatus)).length;
  const review = courseApplicants.filter((a) => a.paymentStatus === 'REVIEW_REQUIRED').length;
  const customerGroups = new Map();
  courseApplicants.forEach((a)=>{
    const key = customerIdentityKey(a);
    customerGroups.set(key, [...(customerGroups.get(key)||[]), a]);
  });
  const repeatApplications = courseApplicants.filter((a)=>(customerGroups.get(customerIdentityKey(a)) || []).length > 1).length;
  const courseMailTemplate = resolveEmailTemplate(state.templates, state.defaultTemplateId, course);
  let filter = normalizeFilter(routeState().params.get('filter'), COURSE_HISTORY_FILTERS);
  let selectedId = routeState().params.get('id') || '';
  const filterLabels = { all:'전체 신청', matched:'입금 확인', review:'확인 필요', sent:'발송 완료', repeat:'반복 신청' };

  const renderRows = (list) => list.length ? list.map((a)=>{
    const sameCustomerCount = (customerGroups.get(customerIdentityKey(a)) || []).length;
    return `<tr data-cs-row="${escapeHtml(a.id)}" class="selectable-row${a.id===selectedId?' is-selected':''}" tabindex="0" aria-selected="${a.id===selectedId?'true':'false'}">
      <td><div class="table-name request-number">${escapeHtml(a.requestNo || makeRequestNumber(a))}</div>${sameCustomerCount>1?`<div class="table-sub">동일 고객 ${sameCustomerCount}건</div>`:''}</td>
      <td><div class="table-name">${escapeHtml(a.name || '(이름 없음)')}</div><div class="table-sub">${escapeHtml(a.email || '이메일 없음')}</div></td>
      <td>${formatDate(a.submittedAt, false)}</td>
      <td>${badge('payment', a.paymentStatus)}</td>
      <td>${badge('delivery', a.deliveryStatus)}</td>
      <td>${a.sentAt ? formatDate(a.sentAt) : '-'}</td>
      <td>${a.sendCount || 0}회</td>
    </tr>`;
  }).join('') : `<tr><td colspan="7"><div class="empty"><strong>조건에 맞는 신청자가 없습니다.</strong></div></td></tr>`;

  main.innerHTML = `<div class="page-head"><div><div class="breadcrumb"><a href="#courses">강의 관리</a><span>›</span><span>히스토리</span></div><h1>${escapeHtml(course.name)}</h1><p>각 Form 응답은 별도 신청 건으로 보존됩니다. 현재 발송 템플릿: <strong>${escapeHtml(courseMailTemplate?.name || '없음')}</strong>. 같은 고객이 다시 신청해도 과거 입금·발송·CS 기록과 합쳐지지 않습니다.</p></div><div class="page-actions"><button class="btn" data-sync>${icon('refresh')}폼 동기화</button><button class="btn" data-import>${icon('upload')}CSV 가져오기</button><button class="btn" data-edit-course="${escapeHtml(course.id)}">강의 편집</button></div></div>
    <section class="stats course-stats">
      ${[['전체 신청',courseApplicants.length,'이 강의 누적 신청','all'],['입금 확인',matched,'자동/수동 확인','matched'],['확인 필요',review,'CS 검토 필요','review'],['발송 완료',sent,'현재 발송 완료 건','sent'],['반복 신청',repeatApplications,'동일 고객 2건 이상','repeat']].map(([l,v,f,key])=>`<button class="card stat metric-card ${filter===key?'is-active':''}" data-course-filter="${key}" aria-pressed="${filter===key?'true':'false'}"><div class="stat-label">${l}</div><div class="stat-value">${v}</div><div class="stat-link">${l}만 보기 →</div><div class="stat-foot">${f}</div></button>`).join('')}
    </section>
    <div class="toolbar"><div class="search">${icon('search')}<input id="courseHistorySearch" placeholder="이름, 이메일, 입금자명, 신청번호 검색"></div><div class="history-meta">현재 보기 <strong id="courseFilterLabel">${filterLabels[filter]}</strong> · 누적 활동 ${courseLogs.length}건 · 연결 입금 ${coursePayments.length}건</div></div>
    <div class="course-cs-layout">
      <section class="card"><div class="card-head"><div><h2>강의별 신청 히스토리</h2><p>신청 건마다 신청번호가 유지됩니다. 신청자 행을 선택하면 오른쪽에서 발송이력을 확인하고 바로 재발송할 수 있습니다.</p></div></div><div class="table-wrap"><table><thead><tr><th>신청번호</th><th>신청자</th><th>신청일</th><th>입금</th><th>메일</th><th>최종 발송</th><th>횟수</th></tr></thead><tbody id="courseHistoryRows"></tbody></table></div></section>
      <aside class="card cs-panel" id="csPanel"><div class="empty"><strong>신청자를 선택해주세요.</strong>발송 이력과 CS 작업을 이 화면에서 확인할 수 있습니다.</div></aside>
    </div>
    <div class="grid-2" style="margin-top:14px">
      <section class="card"><div class="card-head"><div><h2>강의 전체 활동</h2><p>발송, 재발송, 수동 확인, CS 메모 등의 누적 활동입니다.</p></div></div><div class="card-pad"><div class="activity">${courseLogs.length ? courseLogs.slice(0,30).map(activityLogHtml).join('') : '<div class="empty"><strong>아직 활동 기록이 없습니다.</strong></div>'}</div></div></section>
      <section class="card"><div class="card-head"><div><h2>연결된 입금</h2><p>이 강의 신청자에게 실제 연결된 은행 입금입니다.</p></div></div><div class="table-wrap">${coursePayments.length ? `<table><thead><tr><th>입금일시</th><th>입금자</th><th>금액</th><th>상태</th></tr></thead><tbody>${coursePayments.slice(0,30).map((p)=>`<tr><td>${escapeHtml(p.date||'-')}</td><td>${escapeHtml(p.payerName)}</td><td>${formatWon(p.amount)}</td><td>${p.matchStatus==='MATCHED'?badge('payment','MATCHED'):badge('payment','REVIEW_REQUIRED')}</td></tr>`).join('')}</tbody></table>`:'<div class="empty"><strong>연결된 입금이 없습니다.</strong></div>'}</div></section>
    </div>`;

  bindEmailSnapshotButtons(main);
  const rows = main.querySelector('#courseHistoryRows');
  const search = main.querySelector('#courseHistorySearch');
  const panel = main.querySelector('#csPanel');

  async function renderInspector(id) {
    const [applicant, freshApplicants, payments, logs] = await Promise.all([
      db.get('applicants', id), db.getAll('applicants'), db.getAll('payments'), db.getAll('logs'),
    ]);
    if (!applicant || !belongs(applicant)) return;
    selectedId = id;
    setRouteFilter(`course/${encodeURIComponent(course.id)}`, filter, { replace: true, extra: { id } });
    rows.querySelectorAll('[data-cs-row]').forEach((row)=>{
      const active = row.dataset.csRow === id;
      row.classList.toggle('is-selected', active);
      row.setAttribute('aria-selected', String(active));
    });
    const matchedPayment = payments.find((p)=>p.id===applicant.matchedPaymentId);
    const applicantLogs = logs.filter((l)=>l.applicantId===id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const sameCustomer = freshApplicants.filter((a)=>belongs(a) && customerIdentityKey(a)===customerIdentityKey(applicant)).sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt));
    const sendNeedsReview = hasUncertainDeliveryState(applicant);
    const canSend = ['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus) && isValidEmail(applicant.email) && Boolean(course.videoUrl) && !sendNeedsReview;
    panel.innerHTML = `<div class="cs-panel-head"><div><div class="cs-eyebrow">${escapeHtml(applicant.requestNo || makeRequestNumber(applicant))}</div><h2>${escapeHtml(applicant.name || '(이름 없음)')}</h2><p>${escapeHtml(applicant.email || '이메일 없음')}</p></div>${badge('delivery', applicant.deliveryStatus)}</div>
      <div class="cs-status-grid">
        <div><span>신청일</span><strong>${formatDate(applicant.submittedAt)}</strong></div>
        <div><span>입금</span><strong>${matchedPayment ? `${escapeHtml(matchedPayment.payerName)} · ${formatWon(matchedPayment.amount)}` : '연결 없음'}</strong></div>
        <div><span>최종 발송</span><strong>${applicant.sentAt ? formatDate(applicant.sentAt) : '-'}</strong></div>
        <div><span>발송 횟수</span><strong>${applicant.sendCount || 0}회</strong></div>
      </div>
      <div class="cs-actions">
        ${sendNeedsReview ? `<button class="btn btn-danger" data-cs-resend-uncertain>${icon('mail')}확인 후 재발송</button>` : applicant.deliveryStatus==='SENT' ? `<button class="btn btn-primary" data-cs-resend ${canSend?'':'disabled'}>${icon('mail')}녹화본 재발송</button>` : `<button class="btn btn-primary" data-cs-send ${canSend?'':'disabled'}>${icon('mail')}메일 발송</button>`}
        <button class="btn" data-cs-edit>신청정보 수정</button>
        <button class="btn" data-cs-detail>신청 상세</button>
      </div>
      ${sendNeedsReview ? `<div class="warning cs-warning"><strong>발송 결과 확인이 필요합니다.</strong><br>Gmail이 이전 요청을 처리했을 가능성이 있습니다. 신청자 수신 여부를 확인한 뒤에만 재발송하세요.${applicant.lastSendAttemptAt ? ` · 최근 시도 ${formatDate(applicant.lastSendAttemptAt)}` : ''}</div>` : !canSend ? `<div class="warning cs-warning">${!['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus)?'입금 확인이 끝나야 발송할 수 있습니다.':!isValidEmail(applicant.email)?'이메일 주소를 확인해주세요.':'강의 녹화본 URL을 확인해주세요.'}</div>` : ''}
      ${applicant.lastSendAttemptStatus === 'FAILED' ? `<div class="warning cs-warning"><strong>최근 발송 시도 실패</strong><br>${escapeHtml(applicant.lastSendError || '발송 오류')} ${applicant.lastSendAttemptAt ? `· ${formatDate(applicant.lastSendAttemptAt)}` : ''}</div>` : ''}
      <div class="cs-section"><div class="cs-section-head"><strong>CS 메모</strong><span>이 신청 건에만 저장됩니다.</span></div><textarea id="csNote" class="cs-note" placeholder="문의 내용, 확인한 사항 등을 기록하세요.">${escapeHtml(applicant.note || '')}</textarea><div class="cs-note-actions"><button class="btn btn-sm" data-save-note>메모 저장</button></div></div>
      <div class="cs-section"><div class="cs-section-head"><strong>같은 고객의 이 강의 신청</strong><span>${sameCustomer.length}건</span></div><div class="request-history">${sameCustomer.map((item)=>`<button class="request-history-item ${item.id===id?'active':''}" data-switch-request="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.requestNo || makeRequestNumber(item))}</strong><small>${formatDate(item.submittedAt)} · ${formatWon(item.amount)}</small></span><span class="request-history-state">${item.deliveryStatus==='SENT'?'발송완료':item.paymentStatus==='REVIEW_REQUIRED'?'확인필요':'진행중'}</span></button>`).join('')}</div></div>
      <div class="cs-section"><div class="cs-section-head"><strong>발송 / CS 활동</strong><span>${applicantLogs.length}건</span></div><div class="activity cs-activity">${applicantLogs.length ? applicantLogs.slice(0,20).map(activityLogHtml).join('') : '<div class="empty" style="padding:18px 0"><strong>활동 기록이 없습니다.</strong></div>'}</div></div>`;
    hydrateIcons(panel);
    bindEmailSnapshotButtons(panel);
    panel.querySelector('[data-cs-edit]')?.addEventListener('click',()=>openApplicantEditModal(id));
    panel.querySelector('[data-cs-detail]')?.addEventListener('click',()=>openApplicantDetail(id));
    panel.querySelector('[data-cs-send]')?.addEventListener('click',()=>sendApplicantsByIds([id], false));
    panel.querySelector('[data-cs-resend]')?.addEventListener('click',()=>sendApplicantsByIds([id], true));
    panel.querySelector('[data-cs-resend-uncertain]')?.addEventListener('click',()=>sendApplicantsByIds([id], true, { allowUncertain: true }));
    panel.querySelector('[data-save-note]')?.addEventListener('click',async()=>{
      const note = panel.querySelector('#csNote').value.trim();
      await withOperationLock('CS 메모 저장', async () => {
        const live = await db.get('applicants', id);
        if (!live) throw new Error('신청 정보를 찾을 수 없습니다.');
        await db.put('applicants',{...live,note,updatedAt:new Date().toISOString()});
        await addLog('CS 메모 저장',id,note ? 'CS 메모를 저장했습니다.' : 'CS 메모를 비웠습니다.');
      });
      toast('CS 메모를 저장했습니다.');
      await renderInspector(id);
    });
    panel.querySelectorAll('[data-switch-request]').forEach((button)=>button.addEventListener('click',()=>renderInspector(button.dataset.switchRequest)));
  }

  function bindRows() {
    bindSelectableRows(rows, 'tr[data-cs-row]', (row)=>row.dataset.csRow, renderInspector);
  }
  function currentCourseList() {
    const q = normalizeName(search.value);
    return courseApplicants.filter((a) => {
      const matchesSearch = !q || [a.name,a.payerName,a.email,a.requestNo].some((v)=>normalizeName(v).includes(q));
      const sameCustomerCount = (customerGroups.get(customerIdentityKey(a)) || []).length;
      return matchesSearch && courseApplicantMatchesFilter(a, filter, sameCustomerCount);
    });
  }
  async function drawCourseList() {
    const list = currentCourseList();
    if (!list.some((a)=>a.id===selectedId)) selectedId = list[0]?.id || '';
    rows.innerHTML = renderRows(list);
    bindRows();
    main.querySelector('#courseFilterLabel').textContent = filterLabels[filter];
    if (selectedId) await renderInspector(selectedId);
    else {
      setRouteFilter(`course/${encodeURIComponent(course.id)}`, filter, { replace: true });
      panel.innerHTML='<div class="empty"><strong>조건에 맞는 신청자가 없습니다.</strong>다른 현황 카드나 검색어를 선택해주세요.</div>';
    }
  }
  main.querySelectorAll('[data-course-filter]').forEach((card)=>card.addEventListener('click',async()=>{
    filter = normalizeFilter(card.dataset.courseFilter, COURSE_HISTORY_FILTERS);
    main.querySelectorAll('[data-course-filter]').forEach((node)=>{const active=node===card;node.classList.toggle('is-active',active);node.setAttribute('aria-pressed',String(active));});
    setRouteFilter(`course/${encodeURIComponent(course.id)}`, filter);
    await drawCourseList();
  }));
  search.addEventListener('input', drawCourseList);
  await drawCourseList();
  main.querySelector('[data-sync]').addEventListener('click',()=>syncGoogleForm(true));
  main.querySelector('[data-import]').addEventListener('click',openCsvImport);
  main.querySelector('[data-edit-course]').addEventListener('click',()=>openCourseModal(course.id));
}

async function openCourseModal(id='') {
  const course = id ? await db.get('courses', id) : { id: uid('course'), name: '', price: 0, videoUrl: '', active: true, updatedAt: '' };
  const baseUpdatedAt = course.updatedAt || '';
  showModal({ title: id ? '강의 편집' : '강의 추가', body: `<div class="form-grid"><div class="field span-2"><label>강의명</label><input id="courseName" value="${escapeHtml(course.name)}" placeholder="예: ChatGPT 업무자동화"></div><div class="field"><label>가격</label><input id="coursePrice" inputmode="numeric" value="${course.price || ''}" placeholder="39000"></div><div class="field"><label>상태</label><select id="courseActive"><option value="true" ${course.active!==false?'selected':''}>사용</option><option value="false" ${course.active===false?'selected':''}>중지</option></select><small>중지된 강의는 과거 CS에는 남지만 새 Form 응답에는 자동배정되지 않습니다.</small></div><div class="field span-2"><label>YouTube 녹화본 URL</label><input id="courseUrl" value="${escapeHtml(course.videoUrl)}" placeholder="https://youtu.be/..."></div></div>`, actions: `${id?'<button class="btn btn-danger" data-delete-course>삭제</button>':''}<button class="btn" data-close-modal>취소</button><button class="btn btn-primary" data-save-course>저장</button>` });
  modalRoot.querySelector('[data-save-course]').addEventListener('click', async () => {
    const name = modalRoot.querySelector('#courseName').value.trim();
    const price = parseMoney(modalRoot.querySelector('#coursePrice').value);
    const videoUrl = modalRoot.querySelector('#courseUrl').value.trim();
    const active = modalRoot.querySelector('#courseActive').value==='true';
    if (!name || !videoUrl) return toast('강의명과 URL을 입력해주세요.', '', 'error');
    try {
      await withOperationLock('강의 저장', async () => {
        const live = id ? await db.get('courses', id) : null;
        if (id && live && (live.updatedAt || '') !== baseUpdatedAt) {
          throw new Error('다른 탭에서 이 강의가 변경되었습니다. 최신 내용을 다시 열어주세요.');
        }
        await db.put('courses',{...(live || course),name,price,videoUrl,active,updatedAt:new Date().toISOString()});
      });
      closeModal(); await render(); toast('강의 저장 완료');
    } catch (error) { closeModal(); toast('강의 저장 실패', error.message, 'error'); }
  });
  modalRoot.querySelector('[data-delete-course]')?.addEventListener('click',async()=>{
    try {
      await withOperationLock('강의 삭제', async () => {
        const live = await db.get('courses', course.id);
        if (!live) return;
        const applicants = await db.getAll('applicants');
        const hasHistory = applicants.some((a)=>a.courseId===live.id || (!a.courseId && normalizeName(a.course)===normalizeName(live.name)));
        if (hasHistory) throw new Error('신청/발송 히스토리가 있어 삭제할 수 없습니다. 상태를 사용 중지로 변경해주세요.');
        await db.remove('courses',live.id);
      });
      closeModal(); await render();
    } catch (error) { toast('강의를 삭제할 수 없습니다.', error.message, 'error'); }
  });
}

function setEmailTemplateRoute(templateId, { replace = false } = {}) {
  const next = templateId ? `#email?template=${encodeURIComponent(templateId)}` : '#email';
  if (replace) history.replaceState(null, '', next);
  else history.pushState(null, '', next);
}

function activityLogHtml(log) {
  const hasSnapshot = Boolean(log?.emailSnapshot?.subject || log?.emailSnapshot?.body || log?.emailSnapshot?.videoUrl);
  return `<div class="activity-item"><div class="activity-icon">${log.type.includes('발송')?'✉':'•'}</div><div><strong>${escapeHtml(log.type)}</strong><p>${formatDate(log.createdAt)} · ${escapeHtml(log.message||'')}${log.messageId?` · Gmail ID ${escapeHtml(log.messageId)}`:''}</p>${hasSnapshot?`<button class="activity-link" data-email-snapshot="${escapeHtml(log.id)}">발송 내용 보기 →</button>`:''}</div></div>`;
}

async function openEmailSnapshot(logId) {
  const log = await db.get('logs', logId);
  const snapshot = log?.emailSnapshot;
  if (!snapshot) return toast('저장된 발송 내용이 없습니다.', '', 'error');
  showModal({
    title: '발송 당시 내용',
    description: `${snapshot.templateName || '메일 템플릿'} · ${formatDate(snapshot.sentAt || log.createdAt)}`,
    wide: true,
    body: `<div class="snapshot-grid">
      <div><span>수신 이메일</span><strong>${escapeHtml(snapshot.to || '-')}</strong></div>
      <div><span>강의</span><strong>${escapeHtml(snapshot.courseName || '-')}</strong></div>
      <div><span>신청번호</span><strong>${escapeHtml(snapshot.requestNo || '-')}</strong></div>
      <div><span>템플릿</span><strong>${escapeHtml(snapshot.templateName || '-')}</strong></div>
    </div>
    <div class="field" style="margin-top:14px"><label>제목</label><div class="snapshot-box">${escapeHtml(snapshot.subject || '')}</div></div>
    <div class="field" style="margin-top:12px"><label>본문</label><div class="snapshot-box snapshot-body">${escapeHtml(snapshot.body || '')}</div></div>
    <div class="field" style="margin-top:12px"><label>녹화본 URL</label><div class="snapshot-box">${snapshot.videoUrl ? `<a href="${escapeHtml(snapshot.videoUrl)}" target="_blank" rel="noopener">${escapeHtml(snapshot.videoUrl)}</a>` : '-'}</div></div>`,
    actions: '<button class="btn btn-primary" data-close-modal>확인</button>',
  });
}

function bindEmailSnapshotButtons(container) {
  container?.querySelectorAll?.('[data-email-snapshot]').forEach((button)=>button.addEventListener('click',(event)=>{
    event.stopPropagation();
    openEmailSnapshot(button.dataset.emailSnapshot);
  }));
}

async function createEmailTemplate() {
  showModal({
    title: '템플릿 추가',
    description: '새 템플릿을 만든 뒤 메일 화면에서 제목, 본문, 사용 강의를 편집합니다.',
    body: `<div class="field"><label>템플릿 이름</label><input id="newTemplateName" placeholder="예: 기본 녹화본 발송"></div>`,
    actions: '<button class="btn" data-close-modal>취소</button><button class="btn btn-primary" data-create-template>추가</button>',
  });
  modalRoot.querySelector('[data-create-template]')?.addEventListener('click', async()=>{
    const name = modalRoot.querySelector('#newTemplateName').value.trim();
    if (!name) return toast('템플릿 이름을 입력해주세요.', '', 'error');
    const id = uid('template');
    const now = new Date().toISOString();
    await withOperationLock('메일 템플릿 추가', async()=>{
      const legacy = await db.getSetting('emailTemplate', DEFAULT_TEMPLATE);
      const list = ensureEmailTemplates(await db.getSetting('emailTemplates', []), legacy, DEFAULT_TEMPLATE);
      list.push({ id, name, subject:DEFAULT_TEMPLATE.subject, body:DEFAULT_TEMPLATE.body, createdAt:now, updatedAt:now });
      await db.setSetting('emailTemplates', list);
      const defaultId = await db.getSetting('defaultEmailTemplateId', '');
      if (!defaultId) await db.setSetting('defaultEmailTemplateId', list[0].id);
    });
    closeModal();
    setEmailTemplateRoute(id);
    await render();
    toast('템플릿을 추가했습니다.');
  });
}

async function duplicateEmailTemplate(templateId) {
  const state = await loadState();
  const source = state.templates.find((item)=>item.id===templateId);
  if (!source) return toast('복제할 템플릿을 찾을 수 없습니다.', '', 'error');
  const id = uid('template');
  const now = new Date().toISOString();
  await withOperationLock('메일 템플릿 복제', async()=>{
    const legacy = await db.getSetting('emailTemplate', DEFAULT_TEMPLATE);
    const list = ensureEmailTemplates(await db.getSetting('emailTemplates', []), legacy, DEFAULT_TEMPLATE);
    const liveSource = list.find((item)=>item.id===templateId);
    if (!liveSource) throw new Error('템플릿이 다른 탭에서 변경되었습니다.');
    list.push({ ...liveSource, id, name:`${liveSource.name} 복사본`, createdAt:now, updatedAt:now });
    await db.setSetting('emailTemplates', list);
  });
  setEmailTemplateRoute(id);
  await render();
  toast('템플릿을 복제했습니다.');
}

async function deleteEmailTemplate(templateId) {
  const state = await loadState();
  const template = state.templates.find((item)=>item.id===templateId);
  if (!template) return;
  if (templateId === state.defaultTemplateId) return toast('기본 템플릿은 삭제할 수 없습니다.', '다른 템플릿을 기본으로 지정한 뒤 삭제해주세요.', 'error');
  const linked = state.courses.filter((course)=>course.emailTemplateId===templateId);
  showModal({
    title: '템플릿 삭제',
    description: linked.length ? `이 템플릿을 사용하는 강의 ${linked.length}개는 삭제 후 기본 템플릿을 사용합니다.` : '삭제한 템플릿은 복구할 수 없습니다.',
    body: `<div class="warning"><strong>${escapeHtml(template.name)}</strong><br>${linked.length ? linked.map((course)=>escapeHtml(course.name)).join(', ') : '연결된 강의 없음'}</div>`,
    actions: '<button class="btn" data-close-modal>취소</button><button class="btn btn-danger" data-confirm-template-delete>삭제</button>',
  });
  modalRoot.querySelector('[data-confirm-template-delete]')?.addEventListener('click', async()=>{
    await withOperationLock('메일 템플릿 삭제', async()=>{
      const [stored, courses] = await Promise.all([db.getSetting('emailTemplates', []), db.getAll('courses')]);
      const list = ensureEmailTemplates(stored, await db.getSetting('emailTemplate', DEFAULT_TEMPLATE), DEFAULT_TEMPLATE).filter((item)=>item.id!==templateId);
      const courseUpdates = courses.filter((course)=>course.emailTemplateId===templateId).map((course)=>({...course,emailTemplateId:'',updatedAt:new Date().toISOString()}));
      await db.atomicWrite({ settings:[{key:'emailTemplates',value:list,updatedAt:new Date().toISOString()}], courses:courseUpdates });
    });
    closeModal();
    setEmailTemplateRoute(state.defaultTemplateId, { replace:true });
    await render();
    toast('템플릿을 삭제했습니다.','연결된 강의는 기본 템플릿을 사용합니다.');
  });
}

async function renderEmail(state) {
  const routeInfo = routeState();
  let selectedId = routeInfo.params.get('template') || state.defaultTemplateId || state.templates[0]?.id || '';
  if (!state.templates.some((item)=>item.id===selectedId)) selectedId = state.defaultTemplateId || state.templates[0]?.id || '';
  const selectedTemplate = state.templates.find((item)=>item.id===selectedId) || state.templates[0];
  if (!selectedTemplate) return;
  setEmailTemplateRoute(selectedTemplate.id, { replace:true });
  const assignedCourseIds = new Set(state.courses.filter((course)=>course.emailTemplateId===selectedTemplate.id).map((course)=>course.id));
  const isDefault = selectedTemplate.id===state.defaultTemplateId;
  const sendLogs = state.logs.filter((log)=>log.type.includes('발송')).slice(0,18);

  main.innerHTML = `<div class="page-head"><div><h1>메일 / 발송로그</h1><p>여러 템플릿을 만들고 기본 템플릿 또는 강의별 전용 템플릿으로 사용할 수 있습니다. 성공 발송 내용은 CS용 snapshot으로 보존됩니다.</p></div><div class="page-actions"><button class="btn" data-gmail-test>Gmail 권한 확인</button><a class="btn btn-primary" href="#applicants">신청자에서 발송</a></div></div>
    <div class="email-layout">
      <section class="card"><div class="card-head"><div><h2>메일 템플릿</h2><p>{{이름}}, {{강의명}}, {{녹화본URL}}, {{신청번호}}, {{금액}} 변수를 사용할 수 있습니다.</p></div><button class="btn btn-primary" data-add-template>+ 템플릿 추가</button></div>
        <div class="template-manager">
          <aside class="template-list" aria-label="저장된 메일 템플릿">
            ${state.templates.map((template)=>{
              const courseCount=state.courses.filter((course)=>course.emailTemplateId===template.id).length;
              return `<button class="template-list-item ${template.id===selectedTemplate.id?'active':''}" data-template-select="${escapeHtml(template.id)}" aria-pressed="${template.id===selectedTemplate.id?'true':'false'}"><span><strong>${escapeHtml(template.name)}</strong><small>${template.id===state.defaultTemplateId?'기본 템플릿':courseCount?`${courseCount}개 강의 연결`:'미연결'}</small></span>${template.id===state.defaultTemplateId?'<span class="badge badge-good"><span class="dot"></span>기본</span>':''}</button>`;
            }).join('')}
          </aside>
          <div class="template-editor">
            <div class="template-editor-head"><div><span class="eyebrow">선택한 템플릿</span><h3>${escapeHtml(selectedTemplate.name)}</h3></div><div class="page-actions"><button class="btn btn-sm" data-preview-template>미리보기</button><button class="btn btn-sm" data-duplicate-template>복제</button>${isDefault?'':'<button class="btn btn-sm btn-danger" data-delete-template>삭제</button>'}</div></div>
            <div class="form-grid">
              <div class="field span-2"><label>템플릿 이름</label><input id="mailTemplateName" value="${escapeHtml(selectedTemplate.name)}"></div>
              <div class="field span-2"><label>사용 강의</label><div class="template-course-list">${state.courses.length ? state.courses.map((course)=>`<label class="template-course-option"><input type="checkbox" data-template-course="${escapeHtml(course.id)}" ${assignedCourseIds.has(course.id)?'checked':''}><span><strong>${escapeHtml(course.name)}</strong><small>${course.active===false?'사용 중지':'사용 중'}</small></span></label>`).join('') : '<div class="empty compact"><strong>등록된 강의가 없습니다.</strong>강의를 추가한 뒤 연결할 수 있습니다.</div>'}</div><small>강의에 전용 템플릿이 없으면 기본 템플릿을 사용합니다.</small></div>
              <div class="field span-2"><label>제목</label><input id="mailSubject" value="${escapeHtml(selectedTemplate.subject)}"></div>
              <div class="field span-2"><label>본문</label><textarea id="mailBody">${escapeHtml(selectedTemplate.body)}</textarea></div>
            </div>
            <div class="template-footer"><div>${isDefault?'<span class="badge badge-good"><span class="dot"></span>현재 기본 템플릿</span>':'<button class="btn" data-make-default>기본 템플릿으로 지정</button>'}</div><button class="btn btn-primary" data-save-template>템플릿 저장</button></div>
          </div>
        </div>
      </section>
      <section class="card"><div class="card-head"><div><h2>최근 발송 로그</h2><p>성공 발송은 당시 실제 제목·본문·녹화본 URL을 함께 보존합니다.</p></div></div><div class="card-pad"><div class="activity">${sendLogs.length ? sendLogs.map(activityLogHtml).join('') : '<div class="empty"><strong>아직 발송 로그가 없습니다.</strong>메일을 발송하면 이곳에서 당시 내용을 확인할 수 있습니다.</div>'}</div></div></section>
    </div>`;

  main.querySelectorAll('[data-template-select]').forEach((button)=>button.addEventListener('click',()=>{
    setEmailTemplateRoute(button.dataset.templateSelect);
    render();
  }));
  main.querySelector('[data-add-template]')?.addEventListener('click',createEmailTemplate);
  main.querySelector('[data-duplicate-template]')?.addEventListener('click',()=>duplicateEmailTemplate(selectedTemplate.id));
  main.querySelector('[data-delete-template]')?.addEventListener('click',()=>deleteEmailTemplate(selectedTemplate.id));
  main.querySelector('[data-make-default]')?.addEventListener('click',async()=>{
    await withOperationLock('기본 메일 템플릿 지정',()=>db.setSetting('defaultEmailTemplateId',selectedTemplate.id));
    toast('기본 템플릿을 변경했습니다.');
    await render();
  });
  main.querySelector('[data-save-template]')?.addEventListener('click',async()=>{
    const name=main.querySelector('#mailTemplateName').value.trim();
    const subject=main.querySelector('#mailSubject').value;
    const body=main.querySelector('#mailBody').value;
    if(!name || !subject.trim() || !body.trim()) return toast('템플릿 이름, 제목, 본문을 모두 입력해주세요.','','error');
    const checkedCourseIds=new Set([...main.querySelectorAll('[data-template-course]:checked')].map((input)=>input.dataset.templateCourse));
    await withOperationLock('메일 템플릿 저장',async()=>{
      const [stored,courses,legacy]=await Promise.all([db.getSetting('emailTemplates',[]),db.getAll('courses'),db.getSetting('emailTemplate',DEFAULT_TEMPLATE)]);
      const list=ensureEmailTemplates(stored,legacy,DEFAULT_TEMPLATE);
      const index=list.findIndex((item)=>item.id===selectedTemplate.id);
      if(index<0) throw new Error('템플릿이 다른 탭에서 삭제되었습니다.');
      list[index]={...list[index],name,subject,body,updatedAt:new Date().toISOString()};
      const courseUpdates=courses.map((course)=>{
        if(checkedCourseIds.has(course.id)) return {...course,emailTemplateId:selectedTemplate.id,updatedAt:new Date().toISOString()};
        if(course.emailTemplateId===selectedTemplate.id) return {...course,emailTemplateId:'',updatedAt:new Date().toISOString()};
        return course;
      }).filter((course,index)=>course!==courses[index]);
      await db.atomicWrite({settings:[{key:'emailTemplates',value:list,updatedAt:new Date().toISOString()}],courses:courseUpdates});
    });
    toast('메일 템플릿을 저장했습니다.');
    await render();
  });
  main.querySelector('[data-preview-template]')?.addEventListener('click',()=>{
    const linkedCourse=state.courses.find((course)=>assignedCourseIds.has(course.id)) || state.courses[0] || {name:'샘플 강의',price:39000,videoUrl:'https://youtu.be/example'};
    const sampleApplicant={name:'홍길동',requestNo:'CR-PREVIEW',amount:linkedCourse.price||39000,course:linkedCourse.name};
    const values=buildEmailTemplateValues(sampleApplicant,linkedCourse);
    const subject=renderTemplate(main.querySelector('#mailSubject').value,values);
    const body=renderTemplate(main.querySelector('#mailBody').value,values);
    showModal({title:'메일 미리보기',description:`${main.querySelector('#mailTemplateName').value.trim() || selectedTemplate.name} · ${linkedCourse.name}`,wide:true,body:`<div class="field"><label>제목</label><div class="snapshot-box">${escapeHtml(subject)}</div></div><div class="field" style="margin-top:12px"><label>본문</label><div class="mail-preview-body">${templateToHtml(body)}</div></div>`,actions:'<button class="btn btn-primary" data-close-modal>확인</button>'});
  });
  main.querySelector('[data-gmail-test]').addEventListener('click', async ()=>{try{const clientId=await db.getSetting('oauthClientId','');await authorizeGmail(clientId);toast('Gmail 권한 준비 완료','이 브라우저 세션에서 발송 권한을 사용할 수 있습니다.');}catch(e){toast('Gmail 연결 실패',e.message,'error');}});
  bindEmailSnapshotButtons(main);
}

async function renderSettings(state) {
  const form = state.formConnection;
  const mapping = state.formMapping || {};
  const questions = form?.questions || [];
  const mappingOptions = (selected='') => `<option value="">사용 안 함</option><option value="__RESPONDENT_EMAIL__" ${selected==='__RESPONDENT_EMAIL__'?'selected':''}>폼 자체 수집 이메일</option>${questions.map((q)=>`<option value="${escapeHtml(q.id)}" ${selected===q.id?'selected':''}>${escapeHtml(q.title)}</option>`).join('')}`;
  const activeCoursesForForm = state.courses.filter((c) => c.active !== false);
  const courseOptions = `<option value="">자동 판별</option>${activeCoursesForForm.map((c)=>`<option value="${escapeHtml(c.id)}" ${state.formDefaultCourseId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}`;
  main.innerHTML = `<div class="page-head"><div><h1>설정</h1><p>공용 계정이 아니라 사용자가 직접 만든 Google Cloud OAuth Client를 연결합니다. Client Secret은 사용하지 않습니다.</p></div><div class="page-actions"><a class="btn" href="/guide">상세 설정 가이드</a></div></div>
    <div class="stack">
      <section class="card"><div class="card-head"><div><h2>1. Google OAuth</h2><p>본인이 만든 Web application Client ID를 이 브라우저에 저장합니다.</p></div>${state.clientId?'<span class="badge badge-good"><span class="dot"></span>저장됨</span>':'<span class="badge badge-warn"><span class="dot"></span>필요</span>'}</div><div class="card-pad"><div class="field"><label>OAuth Client ID</label><div class="input-row"><input id="oauthClientId" value="${escapeHtml(state.clientId)}" placeholder="1234567890-....apps.googleusercontent.com"><button class="btn btn-primary" data-save-client>저장</button></div><small>Client Secret은 입력하지 않습니다. Access Token도 영구 저장하지 않습니다.</small></div><div class="code-line"><code>${escapeHtml(location.origin)}</code><button class="btn btn-sm" data-copy-origin>Origin 복사</button></div><div class="help-box" style="margin-top:10px">위 주소를 Google Cloud OAuth Web Client의 <strong>Authorized JavaScript origins</strong>에 등록해야 합니다. 로컬 테스트와 Vercel 배포 주소는 각각 별도로 추가합니다.</div></div></section>
      <section class="card"><div class="card-head"><div><h2>2. Google Form 연결</h2><p>편집 URL(/forms/d/.../edit)을 사용합니다. 재동기화해도 기존 입금/발송 이력은 유지됩니다.</p></div>${form?'<span class="badge badge-good"><span class="dot"></span>연결됨</span>':'<span class="badge badge-neutral">미연결</span>'}</div><div class="card-pad"><div class="field"><label>Google Form 편집 URL</label><div class="input-row"><input id="formUrl" value="${escapeHtml(form?.formUrl||'')}" placeholder="https://docs.google.com/forms/d/.../edit"><button class="btn btn-primary" data-connect-form>폼 읽기</button></div></div>${form?`<div class="help-box" style="margin-top:12px"><strong>${escapeHtml(form.title)}</strong><br>질문 ${questions.length}개 · Form ID ${escapeHtml(form.formId)}</div><div class="form-grid" style="margin-top:14px">${FIELD_DEFINITIONS.map((f)=>`<div class="field"><label>${f.label}</label><select data-map-field="${f.key}">${mappingOptions(mapping[f.key]||'')}</select></div>`).join('')}<div class="field"><label>기본 강의</label><select id="formDefaultCourse">${courseOptions}</select><small>폼에 강의 항목이 없거나 등록 강의명과 매칭되지 않을 때 사용합니다.</small></div></div><div class="page-actions" style="margin-top:14px"><button class="btn" data-save-mapping>매핑 저장</button><button class="btn btn-primary" data-sync-form>${icon('refresh')}기존 응답 동기화</button></div>`:''}</div></section>
      <section class="card"><div class="card-head"><div><h2>3. 입금 매칭 규칙</h2><p>정확 일치만 자동확정하고, 유사 이름은 사람이 확인할 후보로만 표시합니다.</p></div></div><div class="card-pad"><div class="form-grid"><div class="field"><label>신청 전 입금 허용일</label><input id="matchBeforeDays" type="number" min="0" max="30" value="${escapeHtml(state.matchBeforeDays)}"><small>기본 1일. 신청보다 너무 이른 입금을 자동확정하지 않습니다.</small></div><div class="field"><label>신청 후 입금 허용일</label><input id="matchAfterDays" type="number" min="0" max="90" value="${escapeHtml(state.matchAfterDays)}"><small>기본 7일. 이 기간을 지난 입금은 과거 신청과 자동확정하지 않습니다.</small></div><div class="help-box span-2"><strong>자동확정 조건</strong><br>정규화 입금자명 100% 일치 + 금액 100% 일치 + 신청 전 ${escapeHtml(state.matchBeforeDays)}일 ~ 신청 후 ${escapeHtml(state.matchAfterDays)}일 + 후보 1:1</div></div><div class="page-actions" style="margin-top:14px;justify-content:flex-start"><button class="btn btn-primary" data-save-match-rules>매칭 규칙 저장</button></div></div></section>
      <section class="card"><div class="card-head"><div><h2>4. 로컬 데이터 관리</h2><p>브라우저 데이터 삭제나 PC 이동 전에 백업을 권장합니다.</p></div></div><div class="card-pad"><div class="grid-equal"><div class="help-box"><strong>백업</strong><br>설정·강의·신청자·입금·로그를 JSON 파일 하나로 내보냅니다.<div style="margin-top:10px"><button class="btn" data-backup>${icon('download')}백업 내보내기</button></div></div><div class="help-box"><strong>복원</strong><br>같은 앱에서 만든 v2 백업 JSON을 현재 브라우저에 복원합니다.<div style="margin-top:10px"><label class="btn">${icon('upload')}백업 불러오기<input class="hidden" data-restore type="file" accept="application/json,.json"></label></div></div></div><div class="page-actions" style="margin-top:14px;justify-content:flex-start"><button class="btn" data-persist>브라우저 저장소 유지 요청</button><button class="btn" data-demo>샘플 데이터 넣기</button><button class="btn btn-danger" data-reset>모든 로컬 데이터 삭제</button></div></div></section>
    </div>`;
  hydrateIcons(main);
  main.querySelector('[data-save-client]').addEventListener('click',async()=>{const v=main.querySelector('#oauthClientId').value.trim();await withOperationLock('OAuth 설정 저장',()=>db.setSetting('oauthClientId',v));clearTokens();toast('Client ID를 저장했습니다.');await render();});
  main.querySelector('[data-copy-origin]').addEventListener('click',()=>navigator.clipboard.writeText(location.origin).then(()=>toast('Origin을 복사했습니다.')));
  main.querySelector('[data-connect-form]').addEventListener('click',async()=>{try{const clientId=main.querySelector('#oauthClientId')?.value.trim()||state.clientId; const info=await connectForm(clientId,main.querySelector('#formUrl').value.trim()); await withOperationLock('Google Form 연결 저장', async()=>{if(clientId!==state.clientId) await db.setSetting('oauthClientId',clientId); await db.setSetting('formConnection',info); await db.setSetting('formMapping',info.suggestedMapping);}); if(clientId!==state.clientId) clearTokens(); toast('Google Form을 읽었습니다.', `${info.title} · 질문 ${info.questions.length}개`); await render();}catch(e){toast('Form 연결 실패',e.message,'error');}});
  main.querySelector('[data-save-mapping]')?.addEventListener('click',async()=>{const next={};main.querySelectorAll('[data-map-field]').forEach((s)=>{if(s.value)next[s.dataset.mapField]=s.value;});const defaultCourseId=main.querySelector('#formDefaultCourse')?.value||'';await withOperationLock('Form 매핑 저장',async()=>{await db.setSetting('formMapping',next);await db.setSetting('formDefaultCourseId',defaultCourseId);});updateSetupProgress(await loadState());toast('질문 매핑과 기본 강의를 저장했습니다.');});
  main.querySelector('[data-sync-form]')?.addEventListener('click',()=>syncGoogleForm(true));
  main.querySelector('[data-save-match-rules]').addEventListener('click',async()=>{
    const beforeDays=Math.max(0,Math.min(30,Number(main.querySelector('#matchBeforeDays').value)||0));
    const afterDays=Math.max(0,Math.min(90,Number(main.querySelector('#matchAfterDays').value)||0));
    await withOperationLock('입금 매칭 규칙 저장', async () => {
      await db.setSetting('matchBeforeDays',beforeDays);
      await db.setSetting('matchAfterDays',afterDays);
    });
    toast('입금 매칭 규칙을 저장했습니다.',`신청 ${beforeDays}일 전 ~ 신청 후 ${afterDays}일 입금만 자동매칭 후보로 봅니다.`);
  });
  main.querySelector('[data-backup]').addEventListener('click',exportBackupFile);
  main.querySelector('[data-restore]').addEventListener('change',async(e)=>{
    const file=e.target.files[0]; if(!file)return;
    try {
      const data=JSON.parse(await file.text());
      const counts={ applicants:data?.stores?.applicants?.length||0, payments:data?.stores?.payments?.length||0, courses:data?.stores?.courses?.length||0 };
      showModal({title:'백업으로 현재 데이터를 교체할까요?',description:'복원은 Form 동기화나 CSV 추가와 달리 현재 브라우저 데이터를 백업 내용으로 교체합니다.',body:`<div class="warning">현재 데이터가 사라질 수 있습니다. 필요하면 먼저 백업을 내보내세요.</div><div class="help-box" style="margin-top:12px">백업 내용 · 신청 ${counts.applicants}건 · 입금 ${counts.payments}건 · 강의 ${counts.courses}개</div>`,actions:'<button class="btn" data-close-modal>취소</button><button class="btn btn-danger" data-confirm-restore>복원</button>'});
      modalRoot.querySelector('[data-confirm-restore]').addEventListener('click',async()=>{
        try {
          await withOperationLock('백업 복원', () => db.importBackup(data)); selectedApplicants.clear(); clearTokens(); closeModal(); toast('백업을 복원했습니다.'); await render();
        } catch(err) { closeModal(); toast('복원 실패',err.message,'error'); }
      });
    } catch(err) { toast('복원 실패',err.message,'error'); }
    e.target.value='';
  });
  main.querySelector('[data-persist]').addEventListener('click',async()=>{if(!navigator.storage?.persist)return toast('이 브라우저는 저장소 유지 요청을 지원하지 않습니다.');const ok=await navigator.storage.persist();toast(ok?'저장소 유지가 허용되었습니다.':'저장소 유지 요청 결과','브라우저 정책에 따라 자동 허용되지 않을 수 있습니다.');});
  main.querySelector('[data-demo]').addEventListener('click',loadDemoData);
  main.querySelector('[data-reset]').addEventListener('click',()=>{showModal({title:'모든 로컬 데이터를 삭제할까요?',description:'이 브라우저의 신청자, 입금, 강의, 설정, 로그가 모두 삭제됩니다.',body:'<div class="warning">백업이 필요하다면 먼저 취소하고 백업 파일을 내보내세요.</div>',actions:'<button class="btn" data-close-modal>취소</button><button class="btn btn-danger" data-confirm-reset>모두 삭제</button>'});modalRoot.querySelector('[data-confirm-reset]').addEventListener('click',async()=>{await withOperationLock('로컬 데이터 초기화', () => db.resetAll());selectedApplicants.clear();clearTokens();closeModal();toast('로컬 데이터를 삭제했습니다.');await render();});});
}

async function syncGoogleForm(userInitiated=false) {
  try {
    const resultSummary = await withOperationLock('Google Form 동기화', async () => {
      const [clientId, formConnection, mapping, existing, courses, defaultCourseId] = await Promise.all([
        db.getSetting('oauthClientId',''), db.getSetting('formConnection',null), db.getSetting('formMapping',{}),
        db.getAll('applicants'), db.getAll('courses'), db.getSetting('formDefaultCourseId',''),
      ]);
      if (!clientId || !formConnection?.formId) throw new Error('설정에서 OAuth Client ID와 Google Form을 먼저 연결해주세요.');
      if (!Object.keys(mapping).length) throw new Error('Google Form 질문 매핑을 먼저 저장해주세요.');

      const incomingRows = await syncMappedResponses({ clientId, formId: formConnection.formId, mapping });
      let added = 0; let updated = 0; let unassigned = 0; let inactiveBlocked = 0;
      const now = new Date().toISOString();

      const merged = incomingRows.map((incoming)=>{
        const responseId = incoming.responseId || incoming.id;
        const previous = existing.find((a)=>
          (a.sourceFormId === formConnection.formId && (a.responseId || a.id) === responseId) ||
          (!a.sourceFormId && a.id === responseId)
        );
        incoming.sourceFormId = formConnection.formId;
        incoming.responseId = responseId;
        incoming.id = previous?.id || formResponseStorageId(formConnection.formId, responseId);
        incoming.requestNo = previous?.requestNo || makeRequestNumber(incoming);

        const resolution = resolveAutoCourse(courses, incoming.course, defaultCourseId);
        const resolvedCourse = resolution.course;
        if (resolution.reason === 'INACTIVE_REQUESTED' && !previous?.courseId) inactiveBlocked += 1;
        if (resolvedCourse) {
          incoming.courseId = resolvedCourse.id;
          incoming.course = resolvedCourse.name;
          if (!incoming.amount) incoming.amount = resolvedCourse.price;
        } else {
          incoming.courseId = '';
          if (!previous?.courseId) unassigned += 1;
        }

        if (!previous) added += 1; else updated += 1;
        return { ...mergeSyncedApplicant(previous, incoming), updatedAt: now };
      });

      if (merged.length) await db.bulkPut('applicants', merged);
      await db.setSetting('lastSyncAt', now);
      const matchResult = await runAutoMatch({ silent: true, renderAfter: false, alreadyLocked: true });
      return { added, updated, unassigned, inactiveBlocked, matchResult };
    });

    if (userInitiated) {
      const { added, updated, unassigned, inactiveBlocked, matchResult } = resultSummary;
      toast('Form 동기화 완료', `신규 ${added}건 · 기존 ${updated}건 확인${unassigned?` · 강의 미지정 ${unassigned}건`:''}${inactiveBlocked?` · 중지 강의 자동배정 제외 ${inactiveBlocked}건`:''} · 자동매칭 ${matchResult.matched.length}건 · 확인필요 ${matchResult.review.length}건 · 기존 히스토리는 유지했습니다.`);
    }
    await render();
  } catch (e) {
    if (userInitiated) toast('동기화 실패',e.message,'error');
  }
}

async function addLog(type, applicantId='', message='', extra={}) {
  let courseId = extra.courseId || '';
  if (!courseId && applicantId) courseId = (await db.get('applicants', applicantId))?.courseId || '';
  return db.put('logs',{id:uid('log'),type,applicantId,courseId,message,createdAt:new Date().toISOString(),...extra});
}

function templateToHtml(text) {
  const escaped = escapeHtml(text);
  const withLinks = escaped.replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1">$1</a>');
  return withLinks.replace(/\n/g,'<br>');
}

async function sendSelectedApplicants() {
  if (!selectedApplicants.size) return toast('발송할 신청자를 선택해주세요.','','error');
  await sendApplicantsByIds([...selectedApplicants],false);
}

async function sendApplicantsByIds(ids, forceResend=false, { allowUncertain = false } = {}) {
  if (sendInFlight) return toast('이미 메일 발송 작업이 진행 중입니다.','현재 작업이 끝난 뒤 다시 시도해주세요.','error');

  const [all, courses] = await Promise.all([db.getAll('applicants'), db.getAll('courses')]);
  const targets = ids.map((id)=>all.find((a)=>a.id===id)).filter(Boolean);
  const snapshots = new Map(targets.map((a)=>[a.id,{
    sendCount:a.sendCount||0,
    deliveryStatus:a.deliveryStatus||'NOT_SENT',
    lastSendAttemptAt:a.lastSendAttemptAt||'',
    lastSendAttemptStatus:a.lastSendAttemptStatus||'',
    updatedAt:a.updatedAt||'',
  }]));

  const previewEligible=[]; const previewExcluded=[];
  for(const a of targets){
    const course=courses.find((c)=>c.id===a.courseId) || courses.find((c)=>normalizeName(c.name)===normalizeName(a.course));
    const unresolved = hasUncertainDeliveryState(a);
    let reason='';
    if(!['MATCHED','MANUAL_CONFIRMED'].includes(a.paymentStatus))reason='입금 미확인';
    else if(!isValidEmail(a.email))reason='이메일 오류';
    else if(!course?.videoUrl)reason='강의 URL 없음';
    else if(unresolved && !allowUncertain)reason='발송 결과 확인 필요';
    else if(a.deliveryStatus==='SENT'&&!forceResend)reason='이미 발송';
    if(reason) previewExcluded.push({a,reason}); else previewEligible.push({a,course});
  }

  showModal({
    title:allowUncertain?'발송 결과 확인 후 재발송':forceResend?'재발송 확인':'메일 발송 확인',
    description:`발송 ${previewEligible.length}명 · 제외 ${previewExcluded.length}명`,
    body:`${allowUncertain?'<div class="warning"><strong>중복 발송 가능성을 확인해주세요.</strong><br>이전 요청이 Gmail에 전달됐을 수 있습니다. 신청자가 받지 못한 것을 확인한 경우에만 계속하세요.</div>':''}<div class="help-box" style="${allowUncertain?'margin-top:12px':''}">${previewEligible.length ? `${previewEligible.length}명에게 Gmail API로 각각 개별 메일을 보냅니다.`:'발송 가능한 신청자가 없습니다.'}</div>${previewExcluded.length?`<div class="warning">제외: ${previewExcluded.map((x)=>`${escapeHtml(x.a.name)}(${x.reason})`).join(', ')}</div>`:''}`,
    actions:'<button class="btn" data-close-modal>취소</button>'+ (previewEligible.length?`<button class="btn ${allowUncertain?'btn-danger':'btn-primary'}" data-confirm-send>${allowUncertain?'수신 미확인 확인 후 재발송':'발송'}</button>`:''),
  });

  modalRoot.querySelector('[data-confirm-send]')?.addEventListener('click',async()=>{
    if (sendInFlight) return;
    sendInFlight = true;
    closeModal();
    try {
      const result = await withOperationLock('Gmail 메일 발송', async () => {
        const [freshApplicants, freshCourses, storedTemplates, defaultTemplateId, legacyTemplate, clientId] = await Promise.all([
          db.getAll('applicants'),
          db.getAll('courses'),
          db.getSetting('emailTemplates',[]),
          db.getSetting('defaultEmailTemplateId',''),
          db.getSetting('emailTemplate',DEFAULT_TEMPLATE),
          db.getSetting('oauthClientId',''),
        ]);
        const templates = ensureEmailTemplates(storedTemplates, legacyTemplate, DEFAULT_TEMPLATE);

        const eligible=[]; const excluded=[];
        for (const id of ids) {
          const a = freshApplicants.find((item)=>item.id===id);
          if (!a) continue;
          const course = freshCourses.find((c)=>c.id===a.courseId) || freshCourses.find((c)=>normalizeName(c.name)===normalizeName(a.course));
          const snapshot = snapshots.get(a.id);
          const changedSinceConfirm = snapshot && (
            (a.sendCount||0)!==snapshot.sendCount ||
            (a.deliveryStatus||'NOT_SENT')!==snapshot.deliveryStatus ||
            (a.lastSendAttemptAt||'')!==snapshot.lastSendAttemptAt ||
            (a.lastSendAttemptStatus||'')!==snapshot.lastSendAttemptStatus ||
            (snapshot.updatedAt && a.updatedAt && a.updatedAt!==snapshot.updatedAt)
          );
          const unresolved = hasUncertainDeliveryState(a);
          let reason='';
          if(changedSinceConfirm) reason='상태가 변경됨';
          else if(!['MATCHED','MANUAL_CONFIRMED'].includes(a.paymentStatus)) reason='입금 미확인';
          else if(!isValidEmail(a.email)) reason='이메일 오류';
          else if(!course?.videoUrl) reason='강의 URL 없음';
          else if(!resolveEmailTemplate(templates, defaultTemplateId, course)) reason='메일 템플릿 없음';
          else if(unresolved && !allowUncertain) reason='발송 결과 확인 필요';
          else if(a.deliveryStatus==='SENT'&&!forceResend) reason='이미 발송';
          if(reason) excluded.push({a,reason}); else eligible.push({a,course,template:resolveEmailTemplate(templates, defaultTemplateId, course)});
        }

        if (!eligible.length) return { ok:0, failed:0, uncertain:0, excluded };
        await authorizeGmail(clientId);
        let ok=0, failed=0, uncertain=0;

        for(const {a,course,template} of eligible){
          const attemptId=uid('send');
          const attemptedAt=new Date().toISOString();
          const started=markSendStarted(a,attemptId,attemptedAt);
          await db.put('applicants',started);
          await addLog('메일 발송 시도',a.id,`${a.email}로 ${course.name} 메일 발송을 시작했습니다.`,{attemptId,attemptedAt,templateId:template.id,templateName:template.name});

          const values=buildEmailTemplateValues(a,course);
          const subject=renderTemplate(template.subject,values);
          const body=renderTemplate(template.body,values);
          try{
            const gmailResult=await sendGmail({clientId,to:a.email,subject,html:templateToHtml(body)});
            const latest=await db.get('applicants',a.id) || started;
            if (latest.lastSendAttemptId && latest.lastSendAttemptId !== attemptId) throw new Error('발송 시도 상태가 다른 작업에 의해 변경되었습니다.');
            const completedAt=new Date().toISOString();
            await db.put('applicants',markSendSuccess(latest,gmailResult.id||'',completedAt,attemptId));
            const emailSnapshot=createEmailSnapshot({template,applicant:a,course,subject,body,sentAt:completedAt});
            await addLog(forceResend?'녹화본 재발송':'녹화본 발송',a.id,`${a.email}로 ${course.name} 녹화본을 발송했습니다.`,{messageId:gmailResult.id||'',attemptId,templateId:template.id,templateName:template.name,emailSnapshot});
            ok+=1;
          }catch(error){
            const latest=await db.get('applicants',a.id) || started;
            const failedAt=new Date().toISOString();
            if(error.deliveryUncertain){
              await db.put('applicants',markSendUncertain(latest,error.message,failedAt,attemptId));
              await addLog('메일 발송 확인 필요',a.id,`${error.message} Gmail이 요청을 처리했을 수 있어 자동 재발송을 막았습니다.`,{attemptId,attemptedAt:failedAt});
              uncertain+=1;
            }else{
              await db.put('applicants',markSendFailure(latest,error.message,failedAt,attemptId));
              await addLog('메일 발송 실패',a.id,error.message,{attemptId,attemptedAt:failedAt});
              failed+=1;
            }
          }
        }
        return { ok, failed, uncertain, excluded };
      });

      selectedApplicants.clear();
      const problemCount=result.failed+result.uncertain;
      toast('메일 발송 처리 완료',`성공 ${result.ok}건 · 실패 ${result.failed}건 · 발송 확인 필요 ${result.uncertain}건${result.excluded.length?` · 제외 ${result.excluded.length}건`:''}`,problemCount?'error':'normal');
      await render();
    } catch(error) {
      toast('메일 발송 처리 실패',error.message,'error');
      await render();
    } finally {
      sendInFlight=false;
    }
  });
}

async function exportBackupFile() {
  const data=await db.exportBackup();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`classrelay-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);await db.setSetting('lastBackupAt',new Date().toISOString());updateSetupProgress(await loadState());toast('백업 파일을 만들었습니다.');
}

async function loadDemoData() {
  try {
    await withOperationLock('샘플 데이터 생성', async () => {
      const [existingApplicants, existingPayments, existingCourses] = await Promise.all([db.getAll('applicants'), db.getAll('payments'), db.getAll('courses')]);
      const hasRealData = existingApplicants.some((a)=>a.source !== 'demo') || existingPayments.some((p)=>!String(p.id||'').startsWith('demo_')) || existingCourses.some((c)=>c.id !== 'course_demo_1');
      if (hasRealData) throw new Error('실제 운영 데이터와 섞이지 않도록 샘플 데이터 생성을 차단했습니다. 필요하면 먼저 백업 후 로컬 데이터를 초기화해주세요.');
      const now = new Date().toISOString();
      const courses=[{id:'course_demo_1',name:'ChatGPT 업무자동화',price:39000,videoUrl:'https://youtu.be/demo-recording',active:true,updatedAt:now}];
      const names=[['김민지','김민지'],['박서준','이영희'],['홍길동','홍길동'],['정수진','정수진'],['이도윤','이도윤'],['김민수','김민수'],['김민수','김민수'],['최유진','최유진']];
      const applicants=names.map(([name,payer],i)=>({id:`demo_app_${i+1}`,submittedAt:new Date(Date.now()-i*3600_000).toISOString(),name,payerName:payer,email:`demo${i+1}@example.com`,phone:'010-0000-0000',course:'ChatGPT 업무자동화',courseId:'course_demo_1',amount:39000,paymentStatus:i===0?'MATCHED':i===1?'REVIEW_REQUIRED':i<5?'MATCHED':'PENDING',deliveryStatus:i===2?'SENT':'NOT_SENT',matchedPaymentId:i===0?'demo_pay_1':'',source:'demo',updatedAt:now}));
      const payments=[{id:'demo_pay_1',importKey:'demo1',date:'2026-09-06 14:31',payerName:'김민지',amount:39000,matchStatus:'MATCHED',matchedApplicantId:'demo_app_1',courseId:'course_demo_1',updatedAt:now},{id:'demo_pay_2',importKey:'demo2',date:'2026-09-06 14:40',payerName:'이영희',amount:39000,matchStatus:'REVIEW_REQUIRED',matchedApplicantId:'',updatedAt:now},{id:'demo_pay_3',importKey:'demo3',date:'2026-09-06 15:00',payerName:'김민수',amount:39000,matchStatus:'PENDING',matchedApplicantId:'',updatedAt:now}];
      await db.atomicWrite({courses,applicants,payments});
    });
    toast('샘플 데이터를 넣었습니다.','실제 Google 연결 없이 화면과 매칭 흐름을 확인할 수 있습니다.');
    await render();
  } catch (error) {
    toast('샘플 데이터 생성 실패', error.message, 'error');
  }
}

async function render() {
  const current=route();setActiveNav(current);const state=await loadState();updateSetupProgress(state);
  if(current==='dashboard')await renderDashboard(state);
  if(current==='applicants')await renderApplicants(state);
  if(current==='payments')await renderPayments(state);
  if(current==='courses')await renderCourses(state);
  if(current.startsWith('course/'))await renderCourseHistory(state,decodeURIComponent(current.slice('course/'.length)));
  if(current==='email')await renderEmail(state);
  if(current==='settings')await renderSettings(state);
  hydrateIcons(main);
}

function renderStartupError(error) {
  console.error('ClassRelay startup failed', error);
  main.innerHTML = `<section class="card startup-error"><div class="card-pad"><span class="badge badge-danger"><span class="dot"></span>초기화 오류</span><h1>ClassRelay를 불러오지 못했습니다.</h1><p>${escapeHtml(error?.message || '브라우저 로컬 데이터를 불러오는 중 오류가 발생했습니다.')}</p><div class="help-box">기존 운영 데이터는 자동으로 삭제하지 않습니다. 다른 ClassRelay 탭이 열려 있다면 닫은 뒤 다시 시도해주세요.</div><div class="page-actions" style="justify-content:flex-start;margin-top:14px"><button class="btn btn-primary" data-startup-retry>다시 시도</button><a class="btn" href="/guide">사용자 가이드</a></div></div></section>`;
  main.querySelector('[data-startup-retry]')?.addEventListener('click',()=>location.reload());
}

async function startApp() {
  try {
    setupShell();
    await render();
  } catch (error) {
    renderStartupError(error);
  }
}

startApp();
