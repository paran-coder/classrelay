import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('사이드바 ClassRelay 로고는 대시보드 홈 링크다', () => {
  const html = read('index.html');
  assert.match(html, /<a class="brand" href="#dashboard"[^>]*aria-label="ClassRelay 대시보드로 이동"/);
});

test('핵심 정적 자산과 가이드/개인정보 페이지가 존재한다', () => {
  ['assets/styles.css','assets/app.mjs','assets/core.mjs','assets/db.mjs','assets/google.mjs','assets/coordination.mjs','guide/index.html','privacy/index.html'].forEach((path) => {
    assert.equal(existsSync(resolve(root, path)), true, `${path} missing`);
  });
});

test('OAuth 토큰 캐시는 Client ID별로 격리된다', () => {
  const source = read('assets/google.mjs');
  assert.match(source, /const key = `\$\{clientId\}\|\$\{scopeKey\(scopes\)\}`/);
});

test('Form 동기화 뒤 기존 입금과 즉시 재매칭한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function syncFormConnectionData');
  const end = source.indexOf('async function syncFormConnection(', start);
  const block = source.slice(start, end);
  assert.match(block, /const matchResult = runMatch \? await runAutoMatch\(\{ silent:true, renderAfter:false, alreadyLocked:true \}\) :/);
  const allStart = source.indexOf('async function syncAllForms');
  const allEnd = source.indexOf('async function addLog', allStart);
  const allBlock = source.slice(allStart, allEnd);
  assert.match(allBlock, /runAutoMatch\(\{ silent:true, renderAfter:false, alreadyLocked:true \}\)/);
});

test('v2.8.2 핵심 파일에 이전 버전 표기가 남지 않는다', () => {
  ['index.html','assets/styles.css','assets/db.mjs','guide/index.html','privacy/index.html','package.json'].forEach((path) => {
    ['2.8.1','2.8.0','2.7.0','2.6.2','2.6.1','2.6.0','2.5.1','2.4.1','2.4.0','2.3.2'].forEach((oldVersion) => assert.equal(read(path).includes(oldVersion), false, `${path} has stale version ${oldVersion}`));
  });
});


test('Vercel 기본 보안 헤더가 설정되어 있다', () => {
  const config = JSON.parse(read('vercel.json'));
  const common = config.headers.find((item) => item.source === '/(.*)');
  const map = new Map((common?.headers || []).map((h) => [h.key, h.value]));
  assert.equal(map.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(map.get('X-Frame-Options'), 'DENY');
  assert.equal(map.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
});

test('대시보드 KPI는 승인된 6단계 순서로 렌더링된다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('const metrics = [');
  const end = source.indexOf('];', start);
  const block = source.slice(start, end);
  const labels = ['전체 신청','입금 확인','입금 대기','확인 필요','발송 가능','발송 완료'];
  let cursor = -1;
  labels.forEach((label) => {
    const next = block.indexOf(`['${label}'`);
    assert.ok(next > cursor, `${label} order mismatch`);
    cursor = next;
  });
});

test('신청 상세와 강의 CS 화면에서 신청정보 수정을 제공한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /data-edit-applicant/);
  assert.match(source, /data-cs-edit/);
  assert.match(source, /manualOverrides/);
  assert.match(source, /신청정보 수정/);
});



test('사용자 화면의 은행 용어는 입금 중심으로 통일되어 있다', () => {
  ['assets/app.mjs','guide/index.html','privacy/index.html'].forEach((path) => {
    assert.equal(read(path).includes('거래'), false, `${path} has user-facing 거래 terminology`);
  });
});


test('자동매칭은 신청 후 허용일 상한을 사용한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /getSetting\('matchAfterDays', 7\)/);
  assert.match(source, /autoMatch\(applicants, payments, \{ beforeDays, afterDays \}\)/);
});

test('신청자와 입금 매칭은 다중 store 원자적 저장을 사용한다', () => {
  const dbSource = read('assets/db.mjs');
  const appSource = read('assets/app.mjs');
  assert.match(dbSource, /export async function atomicWrite/);
  assert.match(appSource, /db\.atomicWrite\(\{ applicants: applicantUpdates, payments: paymentUpdates \}\)/);
  assert.match(appSource, /db\.atomicWrite\(\{\s*applicants:/);
});

test('Gmail은 발송중과 발송 확인 필요 상태를 기록하고 중복 실행을 잠근다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /let sendInFlight = false/);
  assert.match(source, /markSendStarted/);
  assert.match(source, /markSendUncertain/);
  assert.match(source, /allowUncertain/);
  const google = read('assets/google.mjs');
  assert.match(google, /deliveryUncertain/);
});

test('사용 중지 강의는 전체 Form 동기화 대상에서 제외된다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function syncAllForms');
  const end = source.indexOf('async function addLog', start);
  const block = source.slice(start, end);
  assert.match(block, /state\.courses\.filter\(\(course\)=>course\.active !== false\)/);
  assert.match(block, /state\.formConnections\.filter\(\(connection\)=>connection\.active !== false && activeCourseIds\.has\(connection\.courseId\)\)/);
});

test('고위험 강의 변경은 전용 확인창을 거친다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /requiresCourseChangeConfirmation/);
  assert.match(source, /입금\/발송 이력이 있는 신청의 강의를 변경할까요/);
  assert.match(source, /강의 변경 계속/);
});

test('멀티탭 고위험 작업은 cross-tab operation lock을 사용한다', () => {
  const source = read('assets/coordination.mjs');
  assert.match(source, /navigator\?\.locks\?\.request|navigator\.locks\.request/);
  assert.match(source, /BroadcastChannel/);
  assert.match(source, /LEASE_KEY/);
  const app = read('assets/app.mjs');
  ['Google Form 동기화','입금 자동매칭','Gmail 메일 발송','신청정보 수정'].forEach((label) => assert.ok(app.includes(label), `${label} lock missing`));
});


test('같은 탭의 별도 작업도 잠금을 우회하지 않는다', () => {
  const coordination = read('assets/coordination.mjs');
  assert.equal(coordination.includes('if (localDepth > 0) return fn()'), false);
  const app = read('assets/app.mjs');
  assert.match(app, /alreadyLocked = false/);
  assert.ok((app.match(/alreadyLocked:\s*true/g) || []).length >= 3, 'nested auto-match calls must explicitly reuse the existing lock');
});

test('강의 히스토리는 CS 확인 버튼 없이 행 전체 선택으로 우측 패널을 갱신한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function renderCourseHistory');
  const end = source.indexOf('async function openCourseModal', start);
  const block = source.slice(start, end);
  assert.equal(block.includes('data-cs-select'), false);
  assert.match(block, /class="selectable-row/);
  assert.match(block, /bindSelectableRows\(rows, 'tr\[data-cs-row\]'/);
  assert.match(block, /aria-selected/);
});

test('신청자 페이지도 목록과 우측 상세 패널의 master-detail 구조를 사용한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function renderApplicants');
  const end = source.indexOf('async function openApplicantDetail', start);
  const block = source.slice(start, end);
  assert.match(block, /applicant-master-detail/);
  assert.match(block, /id="applicantPanel"/);
  assert.match(block, /bindSelectableRows\(rows, 'tr\[data-applicant-id\]'/);
  assert.equal(block.includes('data-applicant-action="detail"'), false);
});

test('행 선택은 URL에 선택 ID를 보존해 재렌더 후 같은 신청을 복원할 수 있다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /extra:\s*\{ id \}/);
  assert.match(source, /routeState\(\)\.params\.get\('id'\)/);
});

test('선택 가능한 행은 hover, focus, selected 시각 상태를 가진다', () => {
  const css = read('assets/styles.css');
  assert.match(css, /tr\.selectable-row \{ cursor: pointer; \}/);
  assert.match(css, /tr\.selectable-row\.is-selected td:first-child/);
  assert.match(css, /tr\.selectable-row:focus-visible/);
});


test('v2.8.2는 IndexedDB schema를 강제로 올리거나 내리지 않는다', () => {
  const source = read('assets/db.mjs');
  assert.match(source, /indexedDB\.open\(DB_NAME\)/);
  assert.equal(source.includes("templates: { keyPath"), false);
  assert.equal(source.includes('DB_VERSION'), false);
});

test('다중 메일 템플릿은 기존 settings store에 저장된다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /getSetting\('emailTemplates', \[\]\)/);
  assert.match(source, /defaultEmailTemplateId/);
  assert.match(source, /emailTemplates',value:list/);
  assert.match(source, /\+ 템플릿 추가/);
});

test('강의별 전용 템플릿과 기본 fallback을 사용한다', () => {
  const source = read('assets/app.mjs');
  const core = read('assets/core.mjs');
  assert.match(source, /emailTemplateId/);
  assert.match(source, /resolveEmailTemplate\(templates, defaultTemplateId, course\)/);
  assert.match(core, /course\?\.emailTemplateId/);
  assert.match(core, /defaultTemplate \|\| list\[0\]/);
});

test('메일 템플릿 추가·복제·삭제·미리보기를 제공한다', () => {
  const source = read('assets/app.mjs');
  ['createEmailTemplate','duplicateEmailTemplate','deleteEmailTemplate','data-preview-template'].forEach((token)=>assert.ok(source.includes(token), `${token} missing`));
  assert.match(source, /기본 템플릿은 삭제할 수 없습니다/);
});

test('성공 발송 로그에 실제 메일 snapshot을 저장한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /createEmailSnapshot\(\{template,applicant:a,course,subject,body,sentAt:completedAt\}\)/);
  const core = read('assets/core.mjs');
  ['templateName: template.name','subject: String(subject','videoUrl: course.videoUrl','requestNo: applicant.requestNo'].forEach((token)=>assert.ok(core.includes(token), `${token} missing`));
  assert.match(source, /발송 내용 보기/);
});


test('이전 고버전 templates store가 남아 있어도 settings로 복구할 수 있다', () => {
  const dbSource = read('assets/db.mjs');
  const appSource = read('assets/app.mjs');
  assert.match(dbSource, /getOptionalAll/);
  assert.match(appSource, /db\.getOptionalAll\('templates'\)/);
  assert.match(appSource, /abandonedDefaultId/);
  assert.match(dbSource, /stores\.templates/);
});

test('초기화 오류는 빈 화면 대신 복구 UI를 표시한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /renderStartupError/);
  assert.match(source, /ClassRelay를 불러오지 못했습니다/);
  assert.match(source, /data-startup-retry/);
});


test('템플릿 추가는 빈 신규 작성 폼으로 이름·강의·제목·본문을 한 번에 받는다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function createEmailTemplate');
  const end = source.indexOf('async function duplicateEmailTemplate', start);
  const block = source.slice(start, end);
  ['newTemplateName','data-new-template-course','newTemplateSubject','newTemplateBody','템플릿 생성'].forEach((token)=>assert.ok(block.includes(token), `${token} missing`));
  assert.match(block, /빈 템플릿에서 시작합니다/);
  assert.equal(block.includes('subject:DEFAULT_TEMPLATE.subject'), false);
  assert.equal(block.includes('body:DEFAULT_TEMPLATE.body'), false);
});

test('템플릿 추가와 복제의 역할이 분리되어 있다', () => {
  const source = read('assets/app.mjs');
  const createStart = source.indexOf('async function createEmailTemplate');
  const createEnd = source.indexOf('async function duplicateEmailTemplate', createStart);
  const createBlock = source.slice(createStart, createEnd);
  const duplicateStart = source.indexOf('async function duplicateEmailTemplate');
  const duplicateEnd = source.indexOf('async function deleteEmailTemplate', duplicateStart);
  const duplicateBlock = source.slice(duplicateStart, duplicateEnd);
  assert.match(createBlock, /name:'', subject:'', body:''/);
  assert.match(duplicateBlock, /\.\.\.liveSource/);
});

test('신규 템플릿이 기존 강의 전용 템플릿을 교체할 때 확인하고 동시 변경을 재검증한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /기존 강의 연결을 교체할까요\?/);
  assert.match(source, /연결 교체 후 생성/);
  assert.match(source, /confirmedAssignments/);
  assert.match(source, /템플릿 연결이 다른 탭에서 변경되었습니다/);
  assert.match(source, /db\.atomicWrite\(\{ settings, courses:courseUpdates \}\)/);
});

test('신규 템플릿 생성 직후 해당 템플릿을 자동 선택한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function persistNewEmailTemplate');
  const end = source.indexOf('async function duplicateEmailTemplate', start);
  const block = source.slice(start, end);
  assert.match(block, /setEmailTemplateRoute\(id\)/);
  assert.match(block, /await render\(\)/);
});

test('대시보드는 폼 추가와 전체 폼 동기화를 함께 제공한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function renderDashboard');
  const end = source.indexOf('async function renderApplicants', start);
  const block = source.slice(start, end);
  assert.match(block, /data-add-form/);
  assert.match(block, /data-add-form[^>]*>[^`]*폼 추가/);
  assert.match(block, /data-sync[^>]*>[^`]*전체 폼 동기화/);
  assert.match(block, /openFormConnectionModal\(\)/);
  assert.match(block, /syncAllForms\(true\)/);
});

test('강의 히스토리는 현재 강의 폼만 동기화하는 명확한 용어를 사용한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function renderCourseHistory');
  const end = source.indexOf('async function openCourseModal', start);
  const block = source.slice(start, end);
  assert.match(block, /이 강의 폼 동기화/);
  assert.match(block, /syncFormConnection\(courseFormConnection\.id,\s*true\)/);
});

test('새 강의 저장 뒤 Google Form 연결 여부를 바로 묻는다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /Google Form도 지금 연결할까요\?/);
  assert.match(source, /promptCourseFormConnection/);
  assert.match(source, /openFormConnectionModal\(courseId\)/);
});

test('Form 질문 매핑은 강의 질문을 제외하고 연결 강의를 고정한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /FIELD_DEFINITIONS\.filter\(\(field\)=>field\.key !== 'course'\)/);
  const start = source.indexOf('async function syncFormConnectionData');
  const end = source.indexOf('async function syncFormConnection(', start);
  const block = source.slice(start, end);
  assert.match(block, /incoming\.courseId = course\.id/);
  assert.match(block, /incoming\.course = course\.name/);
});

test('새 강의에는 과거 연결 이력이 있는 같은 Form을 재사용하지 못한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /latest\.formConnections\.find\(\(item\)=>item\.formId===info\.formId\)/);
  assert.match(source, /과거 신청 히스토리를 보호하기 위해 새 강의에는 새 Form을 사용해주세요/);
  assert.match(source, /list\.find\(\(item\)=>item\.formId===formInfo\.formId && item\.id!==formInfo\.id\)/);
});

test('메일 화면은 강의 리스트형 템플릿 선택과 전체 폭 발송로그를 사용한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function renderEmail');
  const end = source.indexOf('const FORM_CONNECTION_FIELDS', start);
  const block = source.slice(start, end);
  assert.match(block, /template-course-rows/);
  assert.match(block, /template-course-row/);
  assert.match(block, /send-log-section/);
  assert.match(block, /send-log-table/);
  assert.equal(block.includes('email-layout'), false);
  const css = read('assets/styles.css');
  assert.match(css, /\.template-course-check\s*\{[^}]*width:\s*18px[^}]*height:\s*18px/s);
});

test('가이드는 강의 중심 Form 연결과 YouTube 링크 특성을 설명한다', () => {
  const guide = read('guide/index.html');
  ['전체 폼 동기화','이 강의 폼 동기화','Google Drive 전체 파일 목록 권한','response ID','YouTube API를 사용하지 않습니다','일부공개','비공개'].forEach((text)=>assert.ok(guide.includes(text), `${text} missing from guide`));
  assert.equal(guide.includes('기본 강의'), false);
});



test('메일 발송 시작은 강의를 먼저 선택하는 Course-first 흐름을 사용한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /async function openSendCoursePicker/);
  assert.match(source, /발송할 강의를 선택하세요/);
  assert.match(source, /한 번의 발송 작업에는 하나의 강의만 포함됩니다/);
  assert.match(source, /data-open-send-course/);
  assert.equal(source.includes('신청자에서 발송'), false);
});

test('발송 대상 화면은 선택된 강의를 고정 컨텍스트로 표시하고 ready 신청만 보여준다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function renderApplicants');
  const end = source.indexOf('async function openApplicantDetail', start);
  const block = source.slice(start, end);
  assert.match(block, /mode:'send'/);
  assert.match(block, /현재 발송 강의/);
  assert.match(block, /courseReadyApplicants\(state, sendCourse\.id\)/);
  assert.match(block, /다른 강의 선택/);
  assert.match(block, /선택 발송/);
});

test('강의 히스토리는 현재 강의의 발송 대상 화면으로 바로 진입한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function renderCourseHistory');
  const end = source.indexOf('async function openCourseModal', start);
  const block = source.slice(start, end);
  assert.match(block, /이 강의 발송 대상 \$\{courseReady\}명/);
  assert.match(block, /#applicants\?mode=send&courseId=/);
});

test('대량 발송은 여러 강의를 한 작업에 혼합하지 못한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function sendApplicantsByIds');
  const end = source.indexOf('async function addLog', start) > start ? source.indexOf('async function addLog', start) : source.indexOf('function templateToHtml', start);
  const block = source.slice(start, end > start ? end : start + 12000);
  assert.match(block, /targetCourseIds\.size > 1/);
  assert.match(block, /한 번에 한 강의만 발송할 수 있습니다/);
  assert.match(block, /expectedCourseId/);
});

test('최종 발송 확인창은 강의·인원·템플릿·URL·제목을 보여준다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function sendApplicantsByIds');
  const block = source.slice(start, start + 12000);
  ['강의','선택 인원','메일 템플릿','녹화본 URL','제목 템플릿'].forEach((label)=>assert.ok(block.includes(label), `${label} missing`));
});


test('발송 대상 화면의 강의 폼 동기화는 실제 Form connection ID를 사용한다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /data-sync-course-send/);
  assert.match(source, /syncFormConnection\(sendConnection\.id,true\)/);
  assert.equal(source.includes('syncCourseForm('), false);
});

test('최종 확인 뒤 강의나 템플릿이 바뀌면 실제 발송을 중단한다', () => {
  const source = read('assets/app.mjs');
  const start = source.indexOf('async function sendApplicantsByIds');
  const block = source.slice(start, start + 16000);
  assert.match(block, /confirmedSendContent/);
  assert.match(block, /sendContentChanged/);
  assert.match(block, /강의 또는 메일 템플릿이 변경됨/);
});

test('강의 추가 모달의 가격/상태 필드는 도움말 높이와 무관하게 상단 정렬된다', () => {
  const app = read('assets/app.mjs');
  const css = read('assets/styles.css');
  assert.match(app, /class="form-grid course-form-grid"/);
  assert.match(css, /\.course-form-grid > \.field \{ align-self: start; \}/);
  assert.match(css, /\.course-form-grid > \.field \{ align-content: start; \}/);
});

test('가이드는 현재 Form 동기화 용어와 Course-first 발송 흐름을 설명한다', () => {
  const guide = read('guide/index.html');
  ['폼 추가','전체 폼 동기화','이 강의 폼 동기화','발송 대상 선택','한 번의 발송 작업에는 한 강의만 포함'].forEach((token) => assert.ok(guide.includes(token), `${token} missing from guide`));
  assert.match(guide, /forms\.responses\.list\(formId\)/);
  assert.match(guide, /YouTube 공개 범위 공식 안내/);
  assert.match(guide, /하단 전체 폭 발송 내역 테이블/);
});

test('interaction accent는 선택/포커스/링크에만 적용되고 primary action은 검정으로 유지된다', () => {
  const design = read('DESIGN-SYSTEM.md');
  const css = read('assets/styles.css');
  assert.match(design, /#0066FF/);
  assert.match(design, /#2563EB/);
  assert.match(css, /--interaction-accent:\s*#2563eb/i);
  assert.match(css, /--interaction-accent-soft:\s*#eff4ff/i);
  assert.match(css, /--ink:\s*#141414/);
  assert.match(css, /--brand:\s*var\(--ink\)/);
  assert.match(css, /\.btn-primary \{[^}]*background:\s*var\(--ink\)/s);
  assert.match(css, /:focus-visible \{[^}]*var\(--interaction-accent\)/s);
  assert.match(css, /tr\.selectable-row\.is-selected td:first-child \{[^}]*var\(--interaction-accent\)/s);
  assert.match(css, /\.metric-card\.is-active \{[^}]*var\(--interaction-accent\)/s);
});

