import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, parseMoney, extractGoogleFormId, parseCsv, detectCsvHeaders, autoMatch, suggestFormMapping, mapFormResponse } from '../assets/core.mjs';

test('이름 정규화', () => {
  assert.equal(normalizeName(' 김 민지 '), '김민지');
  assert.equal(normalizeName('(주) 오픈 AI'), '오픈ai');
});

test('금액 파싱', () => {
  assert.equal(parseMoney('39,000원'), 39000);
  assert.equal(parseMoney('₩ 59,000'), 59000);
});

test('Google Form 편집 URL에서 ID 추출', () => {
  assert.equal(extractGoogleFormId('https://docs.google.com/forms/d/1AbCdEfGhIjKlMnOpQrStUvWxYz12345/edit'), '1AbCdEfGhIjKlMnOpQrStUvWxYz12345');
});

test('CSV 파싱 및 헤더 추천', () => {
  const parsed = parseCsv('거래일시,입금자명,입금액\n2026-09-06 10:00,김민지,"39,000"\n');
  assert.equal(parsed.rows[0]['입금자명'], '김민지');
  const mapping = detectCsvHeaders(parsed.headers);
  assert.equal(mapping.payerName, '입금자명');
  assert.equal(mapping.amount, '입금액');
});

test('유일한 이름+금액만 자동 매칭', () => {
  const applicants = [{id:'a1',name:'김민지',payerName:'김민지',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''}];
  const payments = [{id:'p1',payerName:'김민지',amount:39000,matchedApplicantId:''}];
  const result = autoMatch(applicants,payments);
  assert.equal(result.matched.length,1);
  assert.equal(result.applicantUpdates[0].paymentStatus,'MATCHED');
});

test('동일 이름+금액 신청자가 2명이면 자동 확정하지 않음', () => {
  const applicants = [
    {id:'a1',name:'김민수',payerName:'김민수',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''},
    {id:'a2',name:'김민수',payerName:'김민수',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''},
  ];
  const payments = [{id:'p1',payerName:'김민수',amount:39000,matchedApplicantId:''}];
  const result = autoMatch(applicants,payments);
  assert.equal(result.matched.length,0);
  assert.equal(result.review.length,1);
  assert.ok(result.applicantUpdates.every((a)=>a.paymentStatus==='REVIEW_REQUIRED'));
});

test('Form 질문 자동 추천과 응답 매핑', () => {
  const questions = [
    {id:'q1',title:'성함'}, {id:'q2',title:'입금자명'}, {id:'q3',title:'이메일 주소'}, {id:'q4',title:'신청 강의'}, {id:'q5',title:'결제 금액'},
  ];
  const mapping = suggestFormMapping(questions,{});
  assert.equal(mapping.name,'q1');
  assert.equal(mapping.payerName,'q2');
  const mapped = mapFormResponse({responseId:'r1',createTime:'2026-09-06T10:00:00Z',answers:{q1:{textAnswers:{answers:[{value:'김민지'}]}},q2:{textAnswers:{answers:[{value:'김민지'}]}},q3:{textAnswers:{answers:[{value:'a@example.com'}]}},q4:{textAnswers:{answers:[{value:'업무자동화'}]}},q5:{textAnswers:{answers:[{value:'39,000'}]}}}},mapping);
  assert.equal(mapped.id,'r1');
  assert.equal(mapped.amount,39000);
});
