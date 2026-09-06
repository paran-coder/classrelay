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
  ['assets/styles.css','assets/app.mjs','assets/core.mjs','assets/db.mjs','assets/google.mjs','guide/index.html','privacy/index.html'].forEach((path) => {
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
  assert.match(block, /runAutoMatch\(\{ silent: true, renderAfter: false \}\)/);
});

test('v2.3.2 핵심 파일에 이전 버전 표기가 남지 않는다', () => {
  ['index.html','assets/styles.css','assets/db.mjs','guide/index.html','privacy/index.html'].forEach((path) => {
    assert.equal(read(path).includes('2.3.1'), false, `${path} has stale version`);
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
