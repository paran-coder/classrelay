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
  const start = source.indexOf('async function syncGoogleForm');
  const end = source.indexOf('async function addLog', start);
  const block = source.slice(start, end);
  assert.match(block, /runAutoMatch\(\{ silent: true, renderAfter: false, alreadyLocked: true \}\)/);
});

test('v2.6.1 핵심 파일에 이전 버전 표기가 남지 않는다', () => {
  ['index.html','assets/styles.css','assets/db.mjs','guide/index.html','privacy/index.html','package.json'].forEach((path) => {
    ['2.6.0','2.5.1','2.4.1','2.4.0','2.3.2'].forEach((oldVersion) => assert.equal(read(path).includes(oldVersion), false, `${path} has stale version ${oldVersion}`));
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

test('사용 중지 강의는 Form 자동배정에서 제외된다', () => {
  const source = read('assets/app.mjs');
  assert.match(source, /resolveAutoCourse\(courses, incoming\.course, defaultCourseId\)/);
  const core = read('assets/core.mjs');
  assert.match(core, /INACTIVE_REQUESTED/);
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


test('v2.6.1은 IndexedDB schema를 강제로 올리거나 내리지 않는다', () => {
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
