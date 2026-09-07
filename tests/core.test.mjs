import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeName, parseMoney, extractGoogleFormId, parseCsv, detectCsvHeaders,
  autoMatch, suggestFormMapping, mapFormResponse, mergeSyncedApplicant,
  paymentDateEligibility, canonicalizePaymentDate, paymentFingerprint, nameSimilarity, makeRequestNumber, customerIdentityKey, formResponseStorageId,
  normalizeFilter, applicantMatchesFilter, courseApplicantMatchesFilter, COURSE_HISTORY_FILTERS,
  markSendStarted, markSendSuccess, markSendFailure, markSendUncertain, hasUncertainDeliveryState,
  requiresCourseChangeConfirmation, resolveAutoCourse, buildGmailRaw,
  ensureEmailTemplates, resolveEmailTemplate, buildEmailTemplateValues, createEmailSnapshot,
  ensureFormConnections, formConnectionForCourse,
} from '../assets/core.mjs';

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

test('유일한 이름+금액+날짜 조건만 자동 매칭', () => {
  const applicants = [{id:'a1',submittedAt:'2026-09-06T10:00:00+09:00',name:'김민지',payerName:'김민지',amount:39000,paymentStatus:'PENDING',matchedPaymentId:'',courseId:'c1'}];
  const payments = [{id:'p1',date:'2026-09-06 10:30',payerName:'김민지',amount:39000,matchedApplicantId:''}];
  const result = autoMatch(applicants,payments,{beforeDays:1});
  assert.equal(result.matched.length,1);
  assert.equal(result.applicantUpdates[0].paymentStatus,'MATCHED');
  assert.equal(result.paymentUpdates[0].courseId,'c1');
});

test('동일 이름+금액 신청자가 2명이면 자동 확정하지 않음', () => {
  const applicants = [
    {id:'a1',submittedAt:'2026-09-06T10:00:00+09:00',name:'김민수',payerName:'김민수',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''},
    {id:'a2',submittedAt:'2026-09-06T10:05:00+09:00',name:'김민수',payerName:'김민수',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''},
  ];
  const payments = [{id:'p1',date:'2026-09-06 10:30',payerName:'김민수',amount:39000,matchedApplicantId:''}];
  const result = autoMatch(applicants,payments);
  assert.equal(result.matched.length,0);
  assert.equal(result.review.length,2);
  assert.ok(result.applicantUpdates.every((a)=>a.paymentStatus==='REVIEW_REQUIRED'));
});

test('신청일보다 너무 이른 입금은 자동 매칭하지 않음', () => {
  const applicant = {id:'a1',submittedAt:'2026-09-06T10:00:00+09:00',name:'김민지',payerName:'김민지',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''};
  const payment = {id:'p1',date:'2026-08-20 10:00',payerName:'김민지',amount:39000,matchedApplicantId:''};
  assert.equal(paymentDateEligibility(applicant,payment,1),'TOO_EARLY');
  const result = autoMatch([applicant],[payment],{beforeDays:1});
  assert.equal(result.matched.length,0);
  assert.equal(result.review.length,0);
});

test('거래일을 읽을 수 없으면 정확 이름이어도 확인필요', () => {
  const applicant = {id:'a1',submittedAt:'2026-09-06T10:00:00+09:00',name:'김민지',payerName:'김민지',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''};
  const payment = {id:'p1',date:'',payerName:'김민지',amount:39000,matchedApplicantId:''};
  const result = autoMatch([applicant],[payment]);
  assert.equal(result.matched.length,0);
  assert.equal(result.applicantUpdates[0].reviewReason,'DATE_UNKNOWN');
});

test('유사 이름은 후보만 제안하고 자동확정하지 않음', () => {
  const applicant = {id:'a1',submittedAt:'2026-09-06T10:00:00+09:00',name:'김민지',payerName:'김민지',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''};
  const payment = {id:'p1',date:'2026-09-06 11:00',payerName:'김민정',amount:39000,matchedApplicantId:''};
  assert.ok(nameSimilarity('김민지','김민정') >= 0.6);
  const result = autoMatch([applicant],[payment]);
  assert.equal(result.matched.length,0);
  assert.equal(result.suggestions.length,1);
  assert.equal(result.applicantUpdates[0].reviewReason,'SIMILAR_NAME');
});

test('Form 재동기화 merge는 발송/입금 히스토리를 보존', () => {
  const existing = {
    id:'r1',courseId:'c1',course:'업무자동화',email:'old@example.com',payerName:'김민지',amount:39000,
    paymentStatus:'MATCHED',matchedPaymentId:'p1',deliveryStatus:'SENT',sentAt:'2026-09-06T12:00:00Z',sendCount:2,lastMessageId:'m1',note:'CS 메모',
  };
  const incoming = {id:'r1',courseId:'c2',course:'다른 강의',email:'new@example.com',payerName:'김민지',amount:39000,paymentStatus:'PENDING',deliveryStatus:'NOT_SENT'};
  const merged = mergeSyncedApplicant(existing,incoming);
  assert.equal(merged.email,'new@example.com');
  assert.equal(merged.courseId,'c1');
  assert.equal(merged.paymentStatus,'MATCHED');
  assert.equal(merged.matchedPaymentId,'p1');
  assert.equal(merged.deliveryStatus,'SENT');
  assert.equal(merged.sendCount,2);
  assert.equal(merged.note,'CS 메모');
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
  assert.equal(mapped.responseId,'r1');
  assert.equal(mapped.amount,39000);
});


test('신청번호는 같은 신청 건에서 안정적으로 유지되고 다른 응답은 구분됨', () => {
  const a = {id:'form1:r1',responseId:'r1',submittedAt:'2026-09-06T10:00:00+09:00'};
  const b = {id:'form1:r2',responseId:'r2',submittedAt:'2026-09-06T10:00:00+09:00'};
  assert.equal(makeRequestNumber(a), makeRequestNumber(a));
  assert.notEqual(makeRequestNumber(a), makeRequestNumber(b));
});

test('같은 이메일은 같은 고객으로 그룹화하지만 신청 건은 합치지 않음', () => {
  const a = {id:'a1',email:'Person@Example.com',name:'김민지'};
  const b = {id:'a2',email:'person@example.com',name:'김민지'};
  assert.equal(customerIdentityKey(a), customerIdentityKey(b));
  assert.notEqual(a.id, b.id);
});

test('Form response 저장 ID는 response ID가 다르면 별도 신청 건', () => {
  assert.equal(formResponseStorageId('formA','resp1'),'formA:resp1');
  assert.notEqual(formResponseStorageId('formA','resp1'), formResponseStorageId('formA','resp2'));
});

test('재동기화 merge는 기존 신청번호와 CS 메모를 보존', () => {
  const existing = {id:'formA:resp1',responseId:'resp1',requestNo:'CR-20260906-ABCDE',email:'a@example.com',note:'못 받았다고 문의',paymentStatus:'MATCHED',deliveryStatus:'SENT',sendCount:1};
  const incoming = {id:'formA:resp1',responseId:'resp1',email:'new@example.com',note:'',paymentStatus:'PENDING',deliveryStatus:'NOT_SENT'};
  const merged = mergeSyncedApplicant(existing,incoming);
  assert.equal(merged.requestNo,'CR-20260906-ABCDE');
  assert.equal(merged.note,'못 받았다고 문의');
  assert.equal(merged.deliveryStatus,'SENT');
});


test('신청자 KPI 필터는 입금확인과 발송완료를 구분함', () => {
  const matched = { paymentStatus:'MATCHED', deliveryStatus:'NOT_SENT' };
  const sent = { paymentStatus:'MATCHED', deliveryStatus:'SENT' };
  assert.equal(applicantMatchesFilter(matched,'matched'), true);
  assert.equal(applicantMatchesFilter(matched,'sent'), false);
  assert.equal(applicantMatchesFilter(sent,'sent'), true);
  assert.equal(applicantMatchesFilter(sent,'ready'), false);
});

test('강의 히스토리 반복 신청 필터는 동일 고객 2건 이상만 표시함', () => {
  const applicant = { paymentStatus:'PENDING', deliveryStatus:'NOT_SENT' };
  assert.equal(courseApplicantMatchesFilter(applicant,'repeat',2), true);
  assert.equal(courseApplicantMatchesFilter(applicant,'repeat',1), false);
});

test('잘못된 URL 필터는 안전하게 전체 보기로 정규화됨', () => {
  assert.equal(normalizeFilter('unknown'), 'all');
  assert.equal(normalizeFilter('review', COURSE_HISTORY_FILTERS), 'review');
});


test('재발송 실패는 과거 성공 발송 상태를 지우지 않음', () => {
  const existing = { deliveryStatus:'SENT', sendCount:2, sentAt:'2026-09-06T12:00:00Z', lastMessageId:'m2' };
  const failed = markSendFailure(existing, 'quota exceeded', '2026-09-07T01:00:00Z');
  assert.equal(failed.deliveryStatus, 'SENT');
  assert.equal(failed.sendCount, 2);
  assert.equal(failed.sentAt, '2026-09-06T12:00:00Z');
  assert.equal(failed.lastMessageId, 'm2');
  assert.equal(failed.lastSendAttemptStatus, 'FAILED');
  assert.equal(failed.lastSendError, 'quota exceeded');
});

test('최초 발송 실패는 실패 상태로 기록함', () => {
  const failed = markSendFailure({ deliveryStatus:'NOT_SENT', sendCount:0 }, 'network');
  assert.equal(failed.deliveryStatus, 'FAILED');
  assert.equal(failed.sendCount, 0);
});

test('발송 성공은 횟수와 최근 시도 상태를 함께 갱신함', () => {
  const sent = markSendSuccess({ deliveryStatus:'NOT_SENT', sendCount:0 }, 'gmail-1', '2026-09-07T01:10:00Z');
  assert.equal(sent.deliveryStatus, 'SENT');
  assert.equal(sent.sendCount, 1);
  assert.equal(sent.lastMessageId, 'gmail-1');
  assert.equal(sent.lastSendAttemptStatus, 'SUCCESS');
});

test('Form 재동기화 merge는 최근 발송 시도 정보도 보존', () => {
  const existing = {
    id:'formA:r1', responseId:'r1', email:'a@example.com', paymentStatus:'MATCHED', deliveryStatus:'SENT',
    lastSendAttemptAt:'2026-09-07T01:00:00Z', lastSendAttemptStatus:'FAILED', lastSendError:'quota', sendCount:1,
  };
  const incoming = { id:'formA:r1', responseId:'r1', email:'new@example.com', paymentStatus:'PENDING', deliveryStatus:'NOT_SENT' };
  const merged = mergeSyncedApplicant(existing, incoming);
  assert.equal(merged.email, 'new@example.com');
  assert.equal(merged.deliveryStatus, 'SENT');
  assert.equal(merged.lastSendAttemptStatus, 'FAILED');
  assert.equal(merged.lastSendError, 'quota');
});


test('입금 확정 후 Form 재동기화는 입금자명과 금액을 잠근다', () => {
  const existing = { id:'a1', payerName:'김민지', amount:39000, paymentStatus:'MATCHED', matchedPaymentId:'p1', deliveryStatus:'NOT_SENT' };
  const incoming = { id:'a1', payerName:'김민정', amount:59000, paymentStatus:'PENDING', deliveryStatus:'NOT_SENT' };
  const merged = mergeSyncedApplicant(existing, incoming);
  assert.equal(merged.payerName, '김민지');
  assert.equal(merged.amount, 39000);
});

test('입금 미확정 상태에서는 Form의 정정된 입금자명과 금액을 반영한다', () => {
  const existing = { id:'a1', payerName:'김민지', amount:39000, paymentStatus:'PENDING', deliveryStatus:'NOT_SENT' };
  const incoming = { id:'a1', payerName:'김민정', amount:59000, paymentStatus:'PENDING', deliveryStatus:'NOT_SENT' };
  const merged = mergeSyncedApplicant(existing, incoming);
  assert.equal(merged.payerName, '김민정');
  assert.equal(merged.amount, 59000);
});

test('Gmail 헤더 값의 줄바꿈을 제거해 헤더 삽입을 막는다', () => {
  const raw = buildGmailRaw({ to:'a@example.com\r\nBcc: evil@example.com', subject:'제목\r\nX-Test: injected', html:'본문' });
  const padded = raw.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - raw.length % 4) % 4);
  const decoded = Buffer.from(padded, 'base64').toString('utf8');
  assert.equal(decoded.includes('\r\nBcc: evil@example.com'), false);
  assert.equal(decoded.includes('\r\nX-Test: injected'), false);
});

test('수동 보정된 이름/이메일/강의는 Form 재동기화로 덮어쓰지 않는다', () => {
  const existing = {
    id:'a1',
    name:'수정된 이름',
    email:'fixed@example.com',
    course:'수정 강의',
    courseId:'c2',
    manualOverrides:{ name:true, email:true, course:true },
    paymentStatus:'PENDING',
    deliveryStatus:'NOT_SENT',
  };
  const incoming = {
    id:'a1',
    name:'폼 원본 이름',
    email:'form@example.com',
    course:'폼 강의',
    courseId:'c1',
    paymentStatus:'PENDING',
    deliveryStatus:'NOT_SENT',
  };
  const merged = mergeSyncedApplicant(existing, incoming);
  assert.equal(merged.name, '수정된 이름');
  assert.equal(merged.email, 'fixed@example.com');
  assert.equal(merged.course, '수정 강의');
  assert.equal(merged.courseId, 'c2');
  assert.deepEqual(merged.manualOverrides, { name:true, email:true, course:true });
});

test('수동 보정되지 않은 이름과 이메일은 Form의 최신 값으로 갱신된다', () => {
  const existing = {
    id:'a1',
    name:'기존 이름',
    email:'old@example.com',
    course:'기존 강의',
    courseId:'c1',
    manualOverrides:{},
    paymentStatus:'PENDING',
    deliveryStatus:'NOT_SENT',
  };
  const incoming = {
    id:'a1',
    name:'새 이름',
    email:'new@example.com',
    course:'폼 강의',
    courseId:'c9',
    paymentStatus:'PENDING',
    deliveryStatus:'NOT_SENT',
  };
  const merged = mergeSyncedApplicant(existing, incoming);
  assert.equal(merged.name, '새 이름');
  assert.equal(merged.email, 'new@example.com');
  // 기존 courseId가 연결된 신청은 기존 강의 관계를 보존한다.
  assert.equal(merged.courseId, 'c1');
});



test('신청 후 7일을 지난 입금은 자동 매칭하지 않음', () => {
  const applicant = {id:'a1',submittedAt:'2026-09-01T10:00:00+09:00',name:'김민지',payerName:'김민지',amount:39000,paymentStatus:'PENDING',matchedPaymentId:''};
  const payment = {id:'p1',date:'2026-09-09 10:01',payerName:'김민지',amount:39000,matchedApplicantId:''};
  assert.equal(paymentDateEligibility(applicant,payment,1,7),'TOO_LATE');
  const result = autoMatch([applicant],[payment],{beforeDays:1,afterDays:7});
  assert.equal(result.matched.length,0);
});

test('신청 전 1일~신청 후 7일 경계는 자동 매칭 후보가 된다', () => {
  const applicant = {id:'a1',submittedAt:'2026-09-06 10:00'};
  assert.equal(paymentDateEligibility(applicant,{date:'2026-09-05 10:00'},1,7),'ELIGIBLE');
  assert.equal(paymentDateEligibility(applicant,{date:'2026-09-13 10:00'},1,7),'ELIGIBLE');
});

test('입금 날짜 표기 형식이 달라도 같은 canonical fingerprint를 만든다', () => {
  assert.equal(canonicalizePaymentDate('2026-09-06 14:31'), canonicalizePaymentDate('2026.09.06 14:31'));
  const a = paymentFingerprint({date:'2026-09-06 14:31',payerName:'김민지',amount:39000});
  const b = paymentFingerprint({date:'2026.09.06 14:31',payerName:'김민지',amount:'39,000원'});
  assert.equal(a,b);
});

test('은행 고유번호가 있으면 날짜/이름보다 중복 키에 우선한다', () => {
  const a = paymentFingerprint({transactionId:'TX-001',date:'2026-09-06 14:31',payerName:'김민지',amount:39000});
  const b = paymentFingerprint({transactionId:'TX-001',date:'2026-09-07 09:00',payerName:'다른이름',amount:59000});
  assert.equal(a,b);
});

test('발송 시작 상태는 자동 발송가능 필터에서 제외된다', () => {
  const started = markSendStarted({paymentStatus:'MATCHED',deliveryStatus:'NOT_SENT',sendCount:0},'attempt-1','2026-09-07T01:00:00Z');
  assert.equal(started.deliveryStatus,'SENDING');
  assert.equal(started.lastSendAttemptStatus,'SENDING');
  assert.equal(hasUncertainDeliveryState(started),true);
  assert.equal(applicantMatchesFilter(started,'ready'),false);
});

test('네트워크 애매 상태는 자동 재발송을 막는 확인필요 상태로 남는다', () => {
  const uncertain = markSendUncertain({paymentStatus:'MATCHED',deliveryStatus:'SENDING',sendCount:0,lastSendAttemptId:'attempt-1'},'timeout','2026-09-07T01:01:00Z','attempt-1');
  assert.equal(uncertain.deliveryStatus,'UNCERTAIN');
  assert.equal(uncertain.lastSendAttemptStatus,'DELIVERY_UNCERTAIN');
  assert.equal(applicantMatchesFilter(uncertain,'ready'),false);
});

test('입금확인 또는 발송 이력이 있는 강의 변경은 고위험 확인이 필요하다', () => {
  assert.equal(requiresCourseChangeConfirmation({courseId:'c1',paymentStatus:'MATCHED',sendCount:0},'c2'),true);
  assert.equal(requiresCourseChangeConfirmation({courseId:'c1',paymentStatus:'PENDING',deliveryStatus:'SENT',sendCount:1},'c2'),true);
  assert.equal(requiresCourseChangeConfirmation({courseId:'c1',paymentStatus:'PENDING',deliveryStatus:'NOT_SENT',sendCount:0},'c2'),false);
  assert.equal(requiresCourseChangeConfirmation({courseId:'c1',paymentStatus:'MATCHED'},'c1'),false);
});

test('사용 중지 강의는 Form 자동배정에서 제외된다', () => {
  const courses = [
    {id:'old',name:'지난 강의',active:false},
    {id:'new',name:'새 강의',active:true},
  ];
  const inactive = resolveAutoCourse(courses,'지난 강의','new');
  assert.equal(inactive.course,null);
  assert.equal(inactive.reason,'INACTIVE_REQUESTED');
  const active = resolveAutoCourse(courses,'새 강의','');
  assert.equal(active.course.id,'new');
});


test('기존 단일 템플릿은 settings 기반 기본 템플릿으로 마이그레이션할 수 있다', () => {
  const templates = ensureEmailTemplates([], { subject:'기존 제목', body:'기존 본문' }, { subject:'기본 제목', body:'기본 본문' }, '2026-09-07T00:00:00Z');
  assert.equal(templates.length, 1);
  assert.equal(templates[0].id, 'template_default');
  assert.equal(templates[0].subject, '기존 제목');
  assert.equal(templates[0].body, '기존 본문');
});

test('저장된 템플릿 배열은 그대로 정규화되고 새 DB store가 필요하지 않다', () => {
  const templates = ensureEmailTemplates([{ id:'t1', name:'A', subject:'S', body:'B' }], {}, {});
  assert.equal(templates[0].id, 't1');
  assert.equal(templates[0].name, 'A');
});

test('강의 전용 템플릿이 있으면 기본 템플릿보다 우선한다', () => {
  const templates = [
    { id:'default', name:'기본', subject:'D', body:'D' },
    { id:'course', name:'전용', subject:'C', body:'C' },
  ];
  assert.equal(resolveEmailTemplate(templates, 'default', { emailTemplateId:'course' }).id, 'course');
  assert.equal(resolveEmailTemplate(templates, 'default', {}).id, 'default');
});

test('메일 템플릿 변수에 신청번호와 금액을 포함한다', () => {
  const values = buildEmailTemplateValues({ name:'김민지', requestNo:'CR-1', amount:39000 }, { name:'업무자동화', videoUrl:'https://youtu.be/x' });
  assert.equal(values.이름, '김민지');
  assert.equal(values.신청번호, 'CR-1');
  assert.equal(values.금액, '39,000원');
  assert.equal(values.녹화본URL, 'https://youtu.be/x');
});


test('성공 발송 snapshot은 당시 템플릿과 실제 렌더 결과를 고정한다', () => {
  const snapshot = createEmailSnapshot({
    template:{id:'t1',name:'전용'},
    applicant:{id:'a1',email:'a@example.com',requestNo:'CR-1',amount:39000},
    course:{id:'c1',name:'업무자동화',videoUrl:'https://youtu.be/x'},
    subject:'실제 제목', body:'실제 본문', sentAt:'2026-09-07T00:00:00Z',
  });
  assert.equal(snapshot.templateId,'t1');
  assert.equal(snapshot.templateName,'전용');
  assert.equal(snapshot.subject,'실제 제목');
  assert.equal(snapshot.body,'실제 본문');
  assert.equal(snapshot.videoUrl,'https://youtu.be/x');
  assert.equal(snapshot.to,'a@example.com');
  assert.equal(snapshot.sentAt,'2026-09-07T00:00:00Z');
});


test('기존 단일 Form 연결은 강의별 연결 배열로 안전하게 마이그레이션된다', () => {
  const courses = [{id:'c1',name:'강의1',active:true}];
  const legacy = {formId:'formA',formUrl:'https://docs.google.com/forms/d/formA/edit',title:'신청폼',questions:[{id:'q1',title:'성함'}]};
  const result = ensureFormConnections([], legacy, {name:'q1'}, 'c1', '2026-09-07T00:00:00Z', courses);
  assert.equal(result.length, 1);
  assert.equal(result[0].formId, 'formA');
  assert.equal(result[0].courseId, 'c1');
  assert.equal(result[0].mapping.name, 'q1');
  assert.equal(result[0].lastSyncAt, '2026-09-07T00:00:00Z');
});

test('강의별 Form 조회는 활성 연결만 반환한다', () => {
  const connections = [
    {id:'old',courseId:'c1',active:false},
    {id:'new',courseId:'c1',active:true},
    {id:'other',courseId:'c2',active:true},
  ];
  assert.equal(formConnectionForCourse(connections,'c1')?.id, 'new');
  assert.equal(formConnectionForCourse(connections,'missing'), null);
});
