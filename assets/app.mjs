import * as db from './db.mjs';
import {
  uid, normalizeName, parseMoney, formatWon, formatDate, isValidEmail,
  parseCsv, detectCsvHeaders, paymentFingerprint, autoMatch,
  escapeHtml, renderTemplate, FIELD_DEFINITIONS,
} from './core.mjs';
import { connectForm, syncMappedResponses, authorizeGmail, sendGmail, clearTokens } from './google.mjs';
import { hydrateIcons, icon } from './icons.mjs';

const main = document.querySelector('#main');
const modalRoot = document.querySelector('#modalRoot');
const toastRoot = document.querySelector('#toastRoot');
const sidebar = document.querySelector('#sidebar');
const topbarTitle = document.querySelector('#topbarTitle');
const selectedApplicants = new Set();

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

function closeModal() { modalRoot.innerHTML = ''; }

function onEscape(event) {
  if (event.key === 'Escape') {
    if (modalRoot.innerHTML) closeModal();
    if (sidebar.classList.contains('open')) {
      sidebar.classList.remove('open');
      document.querySelector('#mobileMenu')?.setAttribute('aria-expanded','false');
    }
  }
}

function route() {
  const value = location.hash.replace('#', '') || 'dashboard';
  return ROUTE_TITLES[value] ? value : 'dashboard';
}

function setActiveNav(current) {
  document.querySelectorAll('[data-route]').forEach((node) => node.classList.toggle('active', node.dataset.route === current));
  topbarTitle.textContent = ROUTE_TITLES[current];
}

function setupShell() {
  hydrateIcons(document);
  document.querySelector('#mobileMenu').addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    document.querySelector('#mobileMenu').setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav a').forEach((node) => node.addEventListener('click', () => {
    sidebar.classList.remove('open');
    document.querySelector('#mobileMenu')?.setAttribute('aria-expanded','false');
  }));
  document.querySelector('#globalSync').addEventListener('click', () => syncGoogleForm(true));
  window.addEventListener('hashchange', render);
  window.addEventListener('keydown', onEscape);
}

async function loadState() {
  const [applicants, payments, courses, logs, clientId, formConnection, formMapping, template, lastSyncAt] = await Promise.all([
    db.getAll('applicants'), db.getAll('payments'), db.getAll('courses'), db.getAll('logs'),
    db.getSetting('oauthClientId', ''), db.getSetting('formConnection', null), db.getSetting('formMapping', {}),
    db.getSetting('emailTemplate', DEFAULT_TEMPLATE), db.getSetting('lastSyncAt', ''),
  ]);
  applicants.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  payments.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return { applicants, payments, courses, logs, clientId, formConnection, formMapping, template, lastSyncAt };
}

function setupAlert(state) {
  const complete = state.clientId && state.formConnection && Object.keys(state.formMapping || {}).length;
  if (complete) return '';
  return `<div class="alert">
    <div><strong>초기 연결이 아직 끝나지 않았습니다.</strong><p>Google OAuth Client ID와 Google Form을 연결하면 실제 신청자 동기화를 시작할 수 있습니다. 데이터는 이 브라우저에 저장됩니다.</p></div>
    <a class="btn btn-primary btn-sm" href="#settings">설정 시작</a>
  </div>`;
}

function summaryStats(state) {
  const all = state.applicants.length;
  const pending = state.applicants.filter((a) => a.paymentStatus === 'PENDING').length;
  const matched = state.applicants.filter((a) => ['MATCHED', 'MANUAL_CONFIRMED'].includes(a.paymentStatus)).length;
  const review = state.applicants.filter((a) => a.paymentStatus === 'REVIEW_REQUIRED').length;
  const sent = state.applicants.filter((a) => a.deliveryStatus === 'SENT').length;
  return { all, pending, matched, review, sent };
}

function applicantRow(a, { checkbox = false, compact = false } = {}) {
  return `<tr data-applicant-id="${escapeHtml(a.id)}">
    ${checkbox ? `<td><input class="checkbox applicant-check" type="checkbox" value="${escapeHtml(a.id)}" ${selectedApplicants.has(a.id) ? 'checked' : ''}></td>` : ''}
    <td><div class="table-name">${escapeHtml(a.name || '(이름 없음)')}</div><div class="table-sub">${escapeHtml(a.email || '이메일 없음')}</div></td>
    <td>${escapeHtml(a.payerName || '-')}</td>
    <td>${escapeHtml(a.course || '-')}</td>
    <td>${formatWon(a.amount)}</td>
    <td>${badge('payment', a.paymentStatus)}</td>
    <td>${badge('delivery', a.deliveryStatus)}</td>
    ${compact ? '' : `<td><button class="btn btn-sm" data-applicant-action="detail" data-id="${escapeHtml(a.id)}">보기</button></td>`}
  </tr>`;
}

async function renderDashboard(state) {
  const stats = summaryStats(state);
  const recent = state.applicants.slice(0, 7);
  const review = state.applicants.filter((a) => a.paymentStatus === 'REVIEW_REQUIRED').slice(0, 6);
  const progress = [
    ['OAuth Client ID', Boolean(state.clientId), state.clientId ? '저장됨' : '설정 필요'],
    ['Google Form', Boolean(state.formConnection), state.formConnection?.title || '연결 필요'],
    ['강의 정보', state.courses.length > 0, state.courses.length ? `${state.courses.length}개 등록` : '등록 필요'],
    ['최근 백업', Boolean(await db.getSetting('lastBackupAt', '')), (await db.getSetting('lastBackupAt', '')) ? formatDate(await db.getSetting('lastBackupAt', ''), false) : '아직 없음'],
  ];

  main.innerHTML = `${setupAlert(state)}
    <div class="page-head"><div><h1>오늘 처리할 것만 보세요.</h1><p>신청자 전체를 훑는 대신 입금 확인이 애매한 건과 아직 발송하지 않은 확정자에 집중하도록 구성했습니다.</p></div><div class="page-actions"><button class="btn" data-demo>샘플 데이터</button><button class="btn btn-primary" data-sync>${icon('refresh')}지금 동기화</button></div></div>
    <section class="stats">
      ${[['전체 신청', stats.all, '브라우저에 저장된 신청'], ['입금 대기', stats.pending, '아직 거래와 연결되지 않음'], ['입금 확인', stats.matched, '자동/수동 확인 완료'], ['확인 필요', stats.review, '사람이 봐야 하는 건'], ['발송 완료', stats.sent, '최초 발송 완료']].map(([l,v,f]) => `<div class="card stat"><div class="stat-label">${l}</div><div class="stat-value">${v}</div><div class="stat-foot">${f}</div></div>`).join('')}
    </section>
    <div class="grid-2">
      <section class="card"><div class="card-head"><div><h2>최근 신청</h2><p>가장 최근에 동기화된 신청자입니다.</p></div><a class="btn btn-sm" href="#applicants">전체 보기</a></div>
        <div class="table-wrap">${recent.length ? `<table><thead><tr><th>신청자</th><th>입금자</th><th>강의</th><th>금액</th><th>입금</th><th>메일</th></tr></thead><tbody>${recent.map((a) => applicantRow(a, { compact: true })).join('')}</tbody></table>` : `<div class="empty"><strong>아직 신청자가 없습니다.</strong>Google Form을 연결하거나 샘플 데이터로 흐름을 확인할 수 있습니다.</div>`}</div>
      </section>
      <div class="stack">
        <section class="card card-pad"><div class="card-head" style="padding:0 0 14px;border-bottom:0"><div><h2>초기 설정 상태</h2><p>운영 시작 전에 필요한 네 가지입니다.</p></div></div><div class="progress-list">${progress.map(([label,done,sub], i) => `<div class="progress-row"><div class="progress-icon ${done ? 'done' : ''}">${done ? '✓' : i+1}</div><div><strong>${label}</strong><span>${escapeHtml(sub)}</span></div>${done ? badge('payment','MATCHED') : '<a class="btn btn-sm" href="#settings">설정</a>'}</div>`).join('')}</div></section>
        <section class="card card-pad"><div class="card-head" style="padding:0 0 14px;border-bottom:0"><div><h2>확인 필요</h2><p>자동화가 멈춘 건만 표시합니다.</p></div></div>${review.length ? `<div class="activity">${review.map((a) => `<div class="activity-item"><div class="activity-icon">!</div><div><strong>${escapeHtml(a.name)} · ${formatWon(a.amount)}</strong><p>${escapeHtml(a.payerName)} 이름으로 일치 후보가 여러 개이거나 거래가 애매합니다.</p></div></div>`).join('')}</div>` : `<div class="empty" style="padding:22px 4px"><strong>검토할 건이 없습니다.</strong>애매한 매칭이 생기면 여기에 표시됩니다.</div>`}</section>
      </div>
    </div>`;

  main.querySelector('[data-sync]').addEventListener('click', () => syncGoogleForm(true));
  main.querySelector('[data-demo]').addEventListener('click', loadDemoData);
}

function filterApplicants(applicants, query, filter) {
  const q = normalizeName(query);
  return applicants.filter((a) => {
    const matchesQ = !q || [a.name, a.payerName, a.email, a.course].some((v) => normalizeName(v).includes(q));
    const matchesF = filter === 'all' || (filter === 'review' && a.paymentStatus === 'REVIEW_REQUIRED') || (filter === 'ready' && ['MATCHED','MANUAL_CONFIRMED'].includes(a.paymentStatus) && a.deliveryStatus !== 'SENT') || (filter === 'sent' && a.deliveryStatus === 'SENT') || (filter === 'pending' && a.paymentStatus === 'PENDING');
    return matchesQ && matchesF;
  });
}

async function renderApplicants(state) {
  main.innerHTML = `${setupAlert(state)}
    <div class="page-head"><div><h1>신청자</h1><p>Google Form 응답, 입금 상태, 메일 발송 상태를 한 행에서 확인합니다. 애매한 건은 자동 발송되지 않습니다.</p></div><div class="page-actions"><button class="btn" data-sync>${icon('refresh')}폼 동기화</button><button class="btn btn-primary" data-send-selected>${icon('mail')}선택 발송</button></div></div>
    <div class="toolbar"><div class="search">${icon('search')}<input id="applicantSearch" placeholder="이름, 입금자명, 이메일, 강의 검색"></div><div class="segmented" id="applicantFilters">${[['all','전체'],['ready','발송가능'],['review','확인필요'],['pending','입금대기'],['sent','발송완료']].map(([k,l]) => `<button data-filter="${k}" class="${k==='all'?'active':''}">${l}</button>`).join('')}</div></div>
    <section class="card"><div class="table-wrap"><table><thead><tr><th><input class="checkbox" id="checkAll" type="checkbox"></th><th>신청자</th><th>입금자명</th><th>강의</th><th>금액</th><th>입금</th><th>메일</th><th></th></tr></thead><tbody id="applicantRows"></tbody></table></div></section>`;

  let filter = 'all';
  const search = main.querySelector('#applicantSearch');
  const rows = main.querySelector('#applicantRows');
  const draw = () => {
    const list = filterApplicants(state.applicants, search.value, filter);
    rows.innerHTML = list.length ? list.map((a) => applicantRow(a, { checkbox: true })).join('') : `<tr><td colspan="8"><div class="empty"><strong>조건에 맞는 신청자가 없습니다.</strong>검색어 또는 필터를 바꿔보세요.</div></td></tr>`;
    rows.querySelectorAll('.applicant-check').forEach((node) => node.addEventListener('change', () => node.checked ? selectedApplicants.add(node.value) : selectedApplicants.delete(node.value)));
    rows.querySelectorAll('[data-applicant-action="detail"]').forEach((node) => node.addEventListener('click', () => openApplicantDetail(node.dataset.id)));
  };
  draw();
  search.addEventListener('input', draw);
  main.querySelector('#applicantFilters').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-filter]'); if (!btn) return;
    filter = btn.dataset.filter; main.querySelectorAll('#applicantFilters button').forEach((b) => b.classList.toggle('active', b === btn)); draw();
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
  const applicantLogs = logs.filter((l) => l.applicantId === id).slice(0, 8);
  const course = courses.find((c) => normalizeName(c.name) === normalizeName(applicant.course));
  showModal({
    title: applicant.name || '신청자 상세', description: applicant.email || '이메일 없음', wide: true,
    body: `<div class="grid-equal">
      <div class="stack"><div class="card card-pad"><div class="form-grid"><div class="field"><label>신청일</label><div>${formatDate(applicant.submittedAt)}</div></div><div class="field"><label>강의</label><div>${escapeHtml(applicant.course || '-')}</div></div><div class="field"><label>입금자명</label><div>${escapeHtml(applicant.payerName || '-')}</div></div><div class="field"><label>금액</label><div>${formatWon(applicant.amount)}</div></div><div class="field"><label>입금상태</label><div>${badge('payment', applicant.paymentStatus)}</div></div><div class="field"><label>발송상태</label><div>${badge('delivery', applicant.deliveryStatus)}</div></div></div></div>
      <div class="card card-pad"><strong style="font-size:12px">연결된 입금</strong>${matchedPayment ? `<p style="font-size:12px;line-height:1.6">${escapeHtml(matchedPayment.payerName)} · ${formatWon(matchedPayment.amount)}<br>${escapeHtml(matchedPayment.date || '-')}</p>` : `<p style="font-size:12px;color:var(--muted)">연결된 거래가 없습니다.</p>`}<div class="page-actions" style="justify-content:flex-start;margin-top:12px"><button class="btn btn-sm" data-manual-confirm>수동 입금확인</button>${applicant.paymentStatus === 'REVIEW_REQUIRED' ? '<button class="btn btn-sm" data-clear-review>입금대기로 되돌리기</button>' : ''}</div></div></div>
      <div class="stack"><div class="card card-pad"><strong style="font-size:12px">녹화본</strong><p style="font-size:12px;color:var(--muted);line-height:1.6">${course ? escapeHtml(course.videoUrl) : '강의 관리에서 동일한 강의명을 등록해야 발송할 수 있습니다.'}</p><div class="page-actions" style="justify-content:flex-start"><button class="btn btn-primary btn-sm" data-send-one>${applicant.deliveryStatus === 'SENT' ? '재발송' : '메일 발송'}</button></div></div>
      <div class="card card-pad"><strong style="font-size:12px">최근 활동</strong><div class="activity">${applicantLogs.length ? applicantLogs.map((l) => `<div class="activity-item"><div class="activity-icon">•</div><div><strong>${escapeHtml(l.type)}</strong><p>${formatDate(l.createdAt)} · ${escapeHtml(l.message || '')}</p></div></div>`).join('') : '<div class="empty" style="padding:22px 0">활동 로그가 없습니다.</div>'}</div></div></div>
    </div>`,
    actions: '<button class="btn" data-close-modal>닫기</button>',
  });
  modalRoot.querySelector('[data-manual-confirm]').addEventListener('click', async () => {
    await db.put('applicants', { ...applicant, paymentStatus: 'MANUAL_CONFIRMED' });
    await addLog('수동 입금확인', applicant.id, `${applicant.name} 신청을 관리자가 수동 확인했습니다.`); closeModal(); await render(); toast('수동 입금확인 완료');
  });
  modalRoot.querySelector('[data-clear-review]')?.addEventListener('click', async () => {
    await db.put('applicants', { ...applicant, paymentStatus: 'PENDING', matchedPaymentId: '' }); closeModal(); await render();
  });
  modalRoot.querySelector('[data-send-one]').addEventListener('click', async () => {
    closeModal(); await sendApplicantsByIds([applicant.id], applicant.deliveryStatus === 'SENT');
  });
}

async function renderPayments(state) {
  const reviewCount = state.applicants.filter((a) => a.paymentStatus === 'REVIEW_REQUIRED').length;
  main.innerHTML = `${setupAlert(state)}
    <div class="page-head"><div><h1>입금 관리</h1><p>은행 CSV는 서버에 올리지 않고 브라우저에서 읽습니다. 자동 매칭은 입금자명과 금액이 정확히 일치하고 후보가 하나뿐일 때만 확정합니다.</p></div><div class="page-actions"><button class="btn" data-import>${icon('upload')}CSV 가져오기</button><button class="btn btn-primary" data-match>${icon('check')}자동 매칭</button></div></div>
    <div class="grid-equal"><section class="card card-pad"><div class="stat-label">가져온 거래</div><div class="stat-value">${state.payments.length}</div><div class="stat-foot">현재 브라우저에 저장된 은행 거래</div></section><section class="card card-pad"><div class="stat-label">확인 필요 신청</div><div class="stat-value">${reviewCount}</div><div class="stat-foot">이름·금액 후보가 중복된 신청</div></section></div>
    <section class="card" style="margin-top:16px"><div class="card-head"><div><h2>입금내역</h2><p>CSV 원문 전체가 아니라 매칭에 필요한 열을 정규화해서 저장합니다.</p></div></div><div class="table-wrap">${state.payments.length ? `<table><thead><tr><th>거래일시</th><th>입금자명</th><th>금액</th><th>매칭상태</th><th>신청자</th></tr></thead><tbody>${state.payments.map((p) => { const a=state.applicants.find((x)=>x.id===p.matchedApplicantId); return `<tr><td>${escapeHtml(p.date||'-')}</td><td class="table-name">${escapeHtml(p.payerName)}</td><td>${formatWon(p.amount)}</td><td>${p.matchStatus==='MATCHED'?badge('payment','MATCHED'):p.matchStatus==='REVIEW_REQUIRED'?badge('payment','REVIEW_REQUIRED'):badge('payment','PENDING')}</td><td>${a?escapeHtml(a.name):'-'}</td></tr>`; }).join('')}</tbody></table>` : '<div class="empty"><strong>입금내역이 없습니다.</strong>은행 CSV를 가져오면 여기에서 매칭 상태를 확인할 수 있습니다.</div>'}</div></section>`;
  main.querySelector('[data-import]').addEventListener('click', openCsvImport);
  main.querySelector('[data-match]').addEventListener('click', runAutoMatch);
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
    modalRoot.querySelector('#csvMapping').innerHTML = `<div class="form-grid"><div class="field"><label>거래일시 열</label><select id="mapDate">${opts(mapping.date)}</select></div><div class="field"><label>입금자명 열</label><select id="mapPayer">${opts(mapping.payerName)}</select></div><div class="field"><label>입금액 열</label><select id="mapAmount">${opts(mapping.amount)}</select></div><div class="field"><label>파일</label><div>${escapeHtml(file.name)} · ${parsed.rows.length}행</div></div></div><div class="help-box" style="margin-top:14px">미리보기: ${parsed.rows.slice(0,3).map((r)=>escapeHtml(JSON.stringify(r))).join('<br>')}</div>`;
    modalRoot.querySelector('#csvImportConfirm').classList.remove('hidden');
  }
  modalRoot.querySelector('#csvImportConfirm').addEventListener('click', async () => {
    const dateKey = modalRoot.querySelector('#mapDate')?.value || '';
    const payerKey = modalRoot.querySelector('#mapPayer')?.value || '';
    const amountKey = modalRoot.querySelector('#mapAmount')?.value || '';
    if (!parsed || !payerKey || !amountKey) return toast('열 매핑을 확인해주세요.', '입금자명과 입금액은 필수입니다.', 'error');
    const existing = await db.getAll('payments');
    const existingImportKeys = new Set(existing.map((p)=>p.importKey));
    const occurrence = new Map();
    const values = [];
    parsed.rows.forEach((row) => {
      const base = JSON.stringify(row);
      const count = (occurrence.get(base) || 0) + 1; occurrence.set(base, count);
      const importKey = `${hashString(base)}_${count}`;
      if (existingImportKeys.has(importKey)) return;
      const payerName = row[payerKey]; const amount = parseMoney(row[amountKey]);
      if (!payerName || amount <= 0) return;
      values.push({ id: `pay_${importKey}`, importKey, date: dateKey ? row[dateKey] : '', payerName, amount, fingerprint: paymentFingerprint({ date: dateKey ? row[dateKey] : '', payerName, amount }), matchStatus: 'PENDING', matchedApplicantId: '', importedAt: new Date().toISOString() });
    });
    await db.bulkPut('payments', values); closeModal(); toast('CSV 가져오기 완료', `신규 입금 ${values.length}건을 저장했습니다.`); await render();
  });
}

async function runAutoMatch() {
  const [applicants, payments] = await Promise.all([db.getAll('applicants'), db.getAll('payments')]);
  const result = autoMatch(applicants, payments);
  await db.bulkPut('applicants', result.applicantUpdates);
  await db.bulkPut('payments', result.paymentUpdates);
  result.matched.forEach(({applicantId}) => addLog('입금 자동매칭', applicantId, '입금자명과 금액이 유일하게 일치해 자동 확인했습니다.'));
  toast('자동 매칭 완료', `확정 ${result.matched.length}건 · 확인필요 그룹 ${result.review.length}개`); await render();
}

async function renderCourses(state) {
  main.innerHTML = `<div class="page-head"><div><h1>강의 관리</h1><p>메일 발송 시 신청자의 강의명과 여기 등록된 강의명을 연결해 가격과 YouTube 녹화본 URL을 사용합니다.</p></div><div class="page-actions"><button class="btn btn-primary" data-add-course>${icon('plus')}강의 추가</button></div></div>
    <section class="card card-pad">${state.courses.length ? `<div class="course-list">${state.courses.map((c)=>`<div class="course-item"><div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.videoUrl)}</p></div><div style="display:flex;align-items:center;gap:10px"><div class="course-price">${formatWon(c.price)}</div><button class="btn btn-sm" data-edit-course="${escapeHtml(c.id)}">편집</button></div></div>`).join('')}</div>` : '<div class="empty"><strong>등록된 강의가 없습니다.</strong>강의명과 녹화본 URL을 먼저 등록해주세요.</div>'}</section>`;
  main.querySelector('[data-add-course]').addEventListener('click', () => openCourseModal());
  main.querySelectorAll('[data-edit-course]').forEach((n)=>n.addEventListener('click',()=>openCourseModal(n.dataset.editCourse)));
}

async function openCourseModal(id='') {
  const course = id ? await db.get('courses', id) : { id: uid('course'), name: '', price: 0, videoUrl: '' };
  showModal({ title: id ? '강의 편집' : '강의 추가', body: `<div class="form-grid"><div class="field span-2"><label>강의명</label><input id="courseName" value="${escapeHtml(course.name)}" placeholder="예: ChatGPT 업무자동화"></div><div class="field"><label>가격</label><input id="coursePrice" inputmode="numeric" value="${course.price || ''}" placeholder="39000"></div><div class="field"><label>상태</label><select id="courseActive"><option value="true" ${course.active!==false?'selected':''}>사용</option><option value="false" ${course.active===false?'selected':''}>중지</option></select></div><div class="field span-2"><label>YouTube 녹화본 URL</label><input id="courseUrl" value="${escapeHtml(course.videoUrl)}" placeholder="https://youtu.be/..."></div></div>`, actions: `${id?'<button class="btn btn-danger" data-delete-course>삭제</button>':''}<button class="btn" data-close-modal>취소</button><button class="btn btn-primary" data-save-course>저장</button>` });
  modalRoot.querySelector('[data-save-course]').addEventListener('click', async () => {
    const name = modalRoot.querySelector('#courseName').value.trim(); const price = parseMoney(modalRoot.querySelector('#coursePrice').value); const videoUrl = modalRoot.querySelector('#courseUrl').value.trim();
    if (!name || !videoUrl) return toast('강의명과 URL을 입력해주세요.', '', 'error');
    await db.put('courses',{...course,name,price,videoUrl,active:modalRoot.querySelector('#courseActive').value==='true',updatedAt:new Date().toISOString()}); closeModal(); await render(); toast('강의 저장 완료');
  });
  modalRoot.querySelector('[data-delete-course]')?.addEventListener('click',async()=>{await db.remove('courses',course.id);closeModal();await render();});
}

async function renderEmail(state) {
  main.innerHTML = `<div class="page-head"><div><h1>메일 / 발송로그</h1><p>Gmail은 받은편지함을 읽지 않고 &lt;메일 보내기&gt; 권한만 사용합니다. 최초 발송과 재발송은 별도 동작으로 기록합니다.</p></div><div class="page-actions"><button class="btn" data-gmail-test>Gmail 권한 확인</button><a class="btn btn-primary" href="#applicants">신청자에서 발송</a></div></div>
    <div class="grid-2"><section class="card"><div class="card-head"><div><h2>메일 템플릿</h2><p>{{이름}}, {{강의명}}, {{녹화본URL}} 변수를 사용할 수 있습니다.</p></div></div><div class="card-pad"><div class="field"><label>제목</label><input id="mailSubject" value="${escapeHtml(state.template.subject)}"></div><div class="field" style="margin-top:12px"><label>본문</label><textarea id="mailBody">${escapeHtml(state.template.body)}</textarea></div><div class="page-actions" style="margin-top:12px"><button class="btn btn-primary" data-save-template>템플릿 저장</button></div></div></section>
    <section class="card"><div class="card-head"><div><h2>최근 발송 로그</h2><p>CS 시 누가 언제 어떤 동작을 했는지 확인합니다.</p></div></div><div class="card-pad"><div class="activity">${state.logs.length ? state.logs.slice(0,18).map((l)=>`<div class="activity-item"><div class="activity-icon">${l.type.includes('발송')?'✉':'•'}</div><div><strong>${escapeHtml(l.type)}</strong><p>${formatDate(l.createdAt)} · ${escapeHtml(l.message||'')}</p></div></div>`).join('') : '<div class="empty"><strong>아직 로그가 없습니다.</strong>입금 매칭과 메일 발송 기록이 여기에 쌓입니다.</div>'}</div></div></section></div>`;
  main.querySelector('[data-save-template]').addEventListener('click',async()=>{await db.setSetting('emailTemplate',{subject:main.querySelector('#mailSubject').value,body:main.querySelector('#mailBody').value});toast('메일 템플릿을 저장했습니다.');});
  main.querySelector('[data-gmail-test]').addEventListener('click', async ()=>{try{const clientId=await db.getSetting('oauthClientId','');await authorizeGmail(clientId);toast('Gmail 권한 준비 완료','이 브라우저 세션에서 발송 권한을 사용할 수 있습니다.');}catch(e){toast('Gmail 연결 실패',e.message,'error');}});
}

async function renderSettings(state) {
  const form = state.formConnection;
  const mapping = state.formMapping || {};
  const questions = form?.questions || [];
  const mappingOptions = (selected='') => `<option value="">사용 안 함</option><option value="__RESPONDENT_EMAIL__" ${selected==='__RESPONDENT_EMAIL__'?'selected':''}>폼 자체 수집 이메일</option>${questions.map((q)=>`<option value="${escapeHtml(q.id)}" ${selected===q.id?'selected':''}>${escapeHtml(q.title)}</option>`).join('')}`;
  main.innerHTML = `<div class="page-head"><div><h1>설정</h1><p>공용 계정이 아니라 사용자가 직접 만든 Google Cloud OAuth Client를 연결합니다. Client Secret은 사용하지 않습니다.</p></div><div class="page-actions"><a class="btn" href="/guide">상세 설정 가이드</a></div></div>
    <div class="stack">
      <section class="card"><div class="card-head"><div><h2>1. Google OAuth</h2><p>본인이 만든 Web application Client ID를 이 브라우저에 저장합니다.</p></div>${state.clientId?'<span class="badge badge-good"><span class="dot"></span>저장됨</span>':'<span class="badge badge-warn"><span class="dot"></span>필요</span>'}</div><div class="card-pad"><div class="field"><label>OAuth Client ID</label><div class="input-row"><input id="oauthClientId" value="${escapeHtml(state.clientId)}" placeholder="1234567890-....apps.googleusercontent.com"><button class="btn btn-primary" data-save-client>저장</button></div><small>Client Secret은 입력하지 않습니다. Access Token도 영구 저장하지 않습니다.</small></div><div class="code-line"><code>${escapeHtml(location.origin)}</code><button class="btn btn-sm" data-copy-origin>Origin 복사</button></div><div class="help-box" style="margin-top:10px">위 주소를 Google Cloud OAuth Web Client의 <strong>Authorized JavaScript origins</strong>에 등록해야 합니다. 로컬 테스트와 Vercel 배포 주소는 각각 별도로 추가합니다.</div></div></section>
      <section class="card"><div class="card-head"><div><h2>2. Google Form 연결</h2><p>편집 URL(/forms/d/.../edit)을 사용합니다.</p></div>${form?'<span class="badge badge-good"><span class="dot"></span>연결됨</span>':'<span class="badge badge-neutral">미연결</span>'}</div><div class="card-pad"><div class="field"><label>Google Form 편집 URL</label><div class="input-row"><input id="formUrl" value="${escapeHtml(form?.formUrl||'')}" placeholder="https://docs.google.com/forms/d/.../edit"><button class="btn btn-primary" data-connect-form>폼 읽기</button></div></div>${form?`<div class="help-box" style="margin-top:12px"><strong>${escapeHtml(form.title)}</strong><br>질문 ${questions.length}개 · Form ID ${escapeHtml(form.formId)}</div><div class="form-grid" style="margin-top:14px">${FIELD_DEFINITIONS.map((f)=>`<div class="field"><label>${f.label}</label><select data-map-field="${f.key}">${mappingOptions(mapping[f.key]||'')}</select></div>`).join('')}</div><div class="page-actions" style="margin-top:14px"><button class="btn" data-save-mapping>매핑 저장</button><button class="btn btn-primary" data-sync-form>${icon('refresh')}기존 응답 동기화</button></div>`:''}</div></section>
      <section class="card"><div class="card-head"><div><h2>3. 로컬 데이터 관리</h2><p>브라우저 데이터 삭제나 PC 이동 전에 백업을 권장합니다.</p></div></div><div class="card-pad"><div class="grid-equal"><div class="help-box"><strong>백업</strong><br>설정·강의·신청자·입금·로그를 JSON 파일 하나로 내보냅니다.<div style="margin-top:10px"><button class="btn" data-backup>${icon('download')}백업 내보내기</button></div></div><div class="help-box"><strong>복원</strong><br>같은 앱에서 만든 v2 백업 JSON을 현재 브라우저에 복원합니다.<div style="margin-top:10px"><label class="btn">${icon('upload')}백업 불러오기<input class="hidden" data-restore type="file" accept="application/json,.json"></label></div></div></div><div class="page-actions" style="margin-top:14px;justify-content:flex-start"><button class="btn" data-persist>브라우저 저장소 유지 요청</button><button class="btn" data-demo>샘플 데이터 넣기</button><button class="btn btn-danger" data-reset>모든 로컬 데이터 삭제</button></div></div></section>
    </div>`;
  hydrateIcons(main);
  main.querySelector('[data-save-client]').addEventListener('click',async()=>{const v=main.querySelector('#oauthClientId').value.trim();await db.setSetting('oauthClientId',v);clearTokens();toast('Client ID를 저장했습니다.');await render();});
  main.querySelector('[data-copy-origin]').addEventListener('click',()=>navigator.clipboard.writeText(location.origin).then(()=>toast('Origin을 복사했습니다.')));
  main.querySelector('[data-connect-form]').addEventListener('click',async()=>{try{const clientId=main.querySelector('#oauthClientId')?.value.trim()||state.clientId; if(clientId!==state.clientId) await db.setSetting('oauthClientId',clientId); const info=await connectForm(clientId,main.querySelector('#formUrl').value.trim()); await db.setSetting('formConnection',info); await db.setSetting('formMapping',info.suggestedMapping); toast('Google Form을 읽었습니다.', `${info.title} · 질문 ${info.questions.length}개`); await render();}catch(e){toast('Form 연결 실패',e.message,'error');}});
  main.querySelector('[data-save-mapping]')?.addEventListener('click',async()=>{const next={};main.querySelectorAll('[data-map-field]').forEach((s)=>{if(s.value)next[s.dataset.mapField]=s.value;});await db.setSetting('formMapping',next);toast('질문 매핑을 저장했습니다.');});
  main.querySelector('[data-sync-form]')?.addEventListener('click',()=>syncGoogleForm(true));
  main.querySelector('[data-backup]').addEventListener('click',exportBackupFile);
  main.querySelector('[data-restore]').addEventListener('change',async(e)=>{const file=e.target.files[0];if(!file)return;try{await db.importBackup(JSON.parse(await file.text()));toast('백업을 복원했습니다.');await render();}catch(err){toast('복원 실패',err.message,'error');}});
  main.querySelector('[data-persist]').addEventListener('click',async()=>{if(!navigator.storage?.persist)return toast('이 브라우저는 저장소 유지 요청을 지원하지 않습니다.');const ok=await navigator.storage.persist();toast(ok?'저장소 유지가 허용되었습니다.':'저장소 유지 요청 결과','브라우저 정책에 따라 자동 허용되지 않을 수 있습니다.');});
  main.querySelector('[data-demo]').addEventListener('click',loadDemoData);
  main.querySelector('[data-reset]').addEventListener('click',()=>{showModal({title:'모든 로컬 데이터를 삭제할까요?',description:'이 브라우저의 신청자, 입금, 강의, 설정, 로그가 모두 삭제됩니다.',body:'<div class="warning">백업이 필요하다면 먼저 취소하고 백업 파일을 내보내세요.</div>',actions:'<button class="btn" data-close-modal>취소</button><button class="btn btn-danger" data-confirm-reset>모두 삭제</button>'});modalRoot.querySelector('[data-confirm-reset]').addEventListener('click',async()=>{await db.resetAll();selectedApplicants.clear();clearTokens();closeModal();toast('로컬 데이터를 삭제했습니다.');await render();});});
}

async function syncGoogleForm(userInitiated=false) {
  try {
    const [clientId, formConnection, mapping, existing, courses] = await Promise.all([db.getSetting('oauthClientId',''),db.getSetting('formConnection',null),db.getSetting('formMapping',{}),db.getAll('applicants'),db.getAll('courses')]);
    if (!clientId || !formConnection?.formId) throw new Error('설정에서 OAuth Client ID와 Google Form을 먼저 연결해주세요.');
    if (!Object.keys(mapping).length) throw new Error('Google Form 질문 매핑을 먼저 저장해주세요.');
    const existingIds = new Set(existing.map((a)=>a.id));
    const additions = await syncMappedResponses({clientId,formId:formConnection.formId,mapping,existingIds});
    additions.forEach((a)=>{ if(!a.amount && a.course){const c=courses.find((x)=>normalizeName(x.name)===normalizeName(a.course));if(c)a.amount=c.price;} });
    await db.bulkPut('applicants', additions);
    await db.setSetting('lastSyncAt',new Date().toISOString());
    if (userInitiated) toast('Form 동기화 완료', `신규 신청 ${additions.length}건을 가져왔습니다.`);
    await render();
  } catch (e) { if (userInitiated) toast('동기화 실패',e.message,'error'); }
}

async function addLog(type, applicantId='', message='', extra={}) {
  return db.put('logs',{id:uid('log'),type,applicantId,message,createdAt:new Date().toISOString(),...extra});
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

async function sendApplicantsByIds(ids, forceResend=false) {
  const [all, courses, template, clientId] = await Promise.all([db.getAll('applicants'),db.getAll('courses'),db.getSetting('emailTemplate',DEFAULT_TEMPLATE),db.getSetting('oauthClientId','')]);
  const targets = ids.map((id)=>all.find((a)=>a.id===id)).filter(Boolean);
  const eligible=[]; const excluded=[];
  for(const a of targets){
    const course=courses.find((c)=>normalizeName(c.name)===normalizeName(a.course));
    let reason='';
    if(!['MATCHED','MANUAL_CONFIRMED'].includes(a.paymentStatus))reason='입금 미확인';
    else if(!isValidEmail(a.email))reason='이메일 오류';
    else if(!course?.videoUrl)reason='강의 URL 없음';
    else if(a.deliveryStatus==='SENT'&&!forceResend)reason='이미 발송';
    if(reason) excluded.push({a,reason}); else eligible.push({a,course});
  }
  showModal({title:forceResend?'재발송 확인':'메일 발송 확인',description:`발송 ${eligible.length}명 · 제외 ${excluded.length}명`,body:`<div class="help-box">${eligible.length ? `${eligible.length}명에게 Gmail API로 각각 개별 메일을 보냅니다.`:'발송 가능한 신청자가 없습니다.'}</div>${excluded.length?`<div class="warning">제외: ${excluded.map((x)=>`${escapeHtml(x.a.name)}(${x.reason})`).join(', ')}</div>`:''}`,actions:'<button class="btn" data-close-modal>취소</button>'+ (eligible.length?'<button class="btn btn-primary" data-confirm-send>발송</button>':'')});
  modalRoot.querySelector('[data-confirm-send]')?.addEventListener('click',async()=>{closeModal();try{await authorizeGmail(clientId);}catch(e){return toast('Gmail 권한을 얻지 못했습니다.',e.message,'error');}let ok=0,failed=0;for(const {a,course} of eligible){const values={이름:a.name,강의명:course.name,녹화본URL:course.videoUrl};const subject=renderTemplate(template.subject,values);const body=renderTemplate(template.body,values);try{const result=await sendGmail({clientId,to:a.email,subject,html:templateToHtml(body)});await db.put('applicants',{...a,deliveryStatus:'SENT',sentAt:new Date().toISOString(),sendCount:(a.sendCount||0)+1,lastMessageId:result.id||''});await addLog(forceResend?'녹화본 재발송':'녹화본 발송',a.id,`${a.email}로 ${course.name} 녹화본을 발송했습니다.`,{messageId:result.id||''});ok+=1;}catch(e){await db.put('applicants',{...a,deliveryStatus:'FAILED'});await addLog('메일 발송 실패',a.id,e.message);failed+=1;}} selectedApplicants.clear();toast('메일 발송 처리 완료',`성공 ${ok}건 · 실패 ${failed}건`,failed?'error':'normal');await render();});
}

async function exportBackupFile() {
  const data=await db.exportBackup();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`classrelay-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);await db.setSetting('lastBackupAt',new Date().toISOString());toast('백업 파일을 만들었습니다.');
}

async function loadDemoData() {
  const courses=[{id:'course_demo_1',name:'ChatGPT 업무자동화',price:39000,videoUrl:'https://youtu.be/demo-recording',active:true,updatedAt:new Date().toISOString()}];
  const names=[['김민지','김민지'],['박서준','이영희'],['홍길동','홍길동'],['정수진','정수진'],['이도윤','이도윤'],['김민수','김민수'],['김민수','김민수'],['최유진','최유진']];
  const applicants=names.map(([name,payer],i)=>({id:`demo_app_${i+1}`,submittedAt:new Date(Date.now()-i*3600_000).toISOString(),name,payerName:payer,email:`demo${i+1}@example.com`,phone:'010-0000-0000',course:'ChatGPT 업무자동화',amount:39000,paymentStatus:i===0?'MATCHED':i===1?'REVIEW_REQUIRED':i<5?'MATCHED':'PENDING',deliveryStatus:i===2?'SENT':'NOT_SENT',matchedPaymentId:i===0?'demo_pay_1':'',source:'demo'}));
  const payments=[{id:'demo_pay_1',importKey:'demo1',date:'2026-09-06 14:31',payerName:'김민지',amount:39000,matchStatus:'MATCHED',matchedApplicantId:'demo_app_1'},{id:'demo_pay_2',importKey:'demo2',date:'2026-09-06 14:40',payerName:'이영희',amount:39000,matchStatus:'REVIEW_REQUIRED',matchedApplicantId:''},{id:'demo_pay_3',importKey:'demo3',date:'2026-09-06 15:00',payerName:'김민수',amount:39000,matchStatus:'PENDING',matchedApplicantId:''}];
  await db.bulkPut('courses',courses);await db.bulkPut('applicants',applicants);await db.bulkPut('payments',payments);toast('샘플 데이터를 넣었습니다.','실제 Google 연결 없이 화면과 매칭 흐름을 확인할 수 있습니다.');await render();
}

async function render() {
  const current=route();setActiveNav(current);const state=await loadState();
  if(current==='dashboard')await renderDashboard(state);
  if(current==='applicants')await renderApplicants(state);
  if(current==='payments')await renderPayments(state);
  if(current==='courses')await renderCourses(state);
  if(current==='email')await renderEmail(state);
  if(current==='settings')await renderSettings(state);
  hydrateIcons(main);
}

setupShell();
render();
