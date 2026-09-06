export const FORM_SCOPES = [
  'https://www.googleapis.com/auth/forms.body.readonly',
  'https://www.googleapis.com/auth/forms.responses.readonly',
];

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
];

export const FIELD_DEFINITIONS = [
  { key: 'name', label: '신청자 이름', aliases: ['이름', '성함', '신청자', '신청자 이름', '성명'] },
  { key: 'payerName', label: '입금자명', aliases: ['입금자명', '입금자', '입금 이름', '입금자 이름', '예금주'] },
  { key: 'email', label: '이메일', aliases: ['이메일', '메일', '이메일 주소', 'email', 'e-mail'] },
  { key: 'phone', label: '연락처', aliases: ['연락처', '전화번호', '휴대폰', '휴대전화', '핸드폰'] },
  { key: 'course', label: '강의', aliases: ['강의', '강의명', '신청 강의', '신청강의', '과정', '클래스'] },
  { key: 'amount', label: '결제금액', aliases: ['결제금액', '금액', '입금액', '결제 금액', '가격'] },
];


export const APPLICANT_FILTERS = new Set(['all','ready','review','pending','matched','sent']);
export const COURSE_HISTORY_FILTERS = new Set(['all','matched','review','sent','repeat']);

export function normalizeFilter(value, allowed = APPLICANT_FILTERS, fallback = 'all') {
  const key = String(value || '').trim().toLowerCase();
  return allowed.has(key) ? key : fallback;
}

export function applicantMatchesFilter(applicant = {}, filter = 'all') {
  const key = normalizeFilter(filter);
  if (key === 'all') return true;
  if (key === 'ready') return ['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus) && applicant.deliveryStatus !== 'SENT' && !hasUncertainDeliveryState(applicant);
  if (key === 'review') return applicant.paymentStatus === 'REVIEW_REQUIRED';
  if (key === 'pending') return applicant.paymentStatus === 'PENDING';
  if (key === 'matched') return ['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus);
  if (key === 'sent') return applicant.deliveryStatus === 'SENT';
  return true;
}

export function courseApplicantMatchesFilter(applicant = {}, filter = 'all', customerCount = 1) {
  const key = normalizeFilter(filter, COURSE_HISTORY_FILTERS);
  if (key === 'all') return true;
  if (key === 'matched') return ['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus);
  if (key === 'review') return applicant.paymentStatus === 'REVIEW_REQUIRED';
  if (key === 'sent') return applicant.deliveryStatus === 'SENT';
  if (key === 'repeat') return Number(customerCount) > 1;
  return true;
}

export function hasUncertainDeliveryState(applicant = {}) {
  return applicant.deliveryStatus === 'UNCERTAIN' || ['SENDING','DELIVERY_UNCERTAIN'].includes(applicant.lastSendAttemptStatus);
}

export function requiresCourseChangeConfirmation(applicant = {}, nextCourseId = '') {
  const currentCourseId = applicant.courseId || '';
  if (!nextCourseId || currentCourseId === nextCourseId) return false;
  return ['MATCHED','MANUAL_CONFIRMED'].includes(applicant.paymentStatus)
    || Boolean(applicant.matchedPaymentId)
    || applicant.deliveryStatus === 'SENT'
    || (applicant.sendCount || 0) > 0;
}

export function resolveAutoCourse(courses = [], incomingCourse = '', defaultCourseId = '') {
  const activeCourses = courses.filter((course) => course.active !== false);
  const key = normalizeName(incomingCourse);
  const namedAnyCourse = key ? courses.find((course) => normalizeName(course.name) === key) : null;
  if (namedAnyCourse?.active === false) return { course: null, reason: 'INACTIVE_REQUESTED' };
  const namedCourse = key ? activeCourses.find((course) => normalizeName(course.name) === key) : null;
  const defaultCourse = activeCourses.find((course) => course.id === defaultCourseId);
  const course = namedCourse || defaultCourse || (activeCourses.length === 1 ? activeCourses[0] : null);
  return { course: course || null, reason: course ? 'RESOLVED' : 'UNASSIGNED' };
}

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeName(value) {
  return normalizeText(value)
    .replace(/[\s·・._-]/g, '')
    .replace(/\(주\)|주식회사/gi, '')
    .toLowerCase();
}


export function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

export function normalizePhone(value) {
  return String(value ?? '').replace(/[^0-9]/g, '');
}

export function customerIdentityKey(applicant = {}) {
  const email = normalizeEmail(applicant.email);
  if (email) return `email:${email}`;
  const phone = normalizePhone(applicant.phone);
  if (phone) return `phone:${phone}`;
  return `name:${normalizeName(applicant.name)}|payer:${normalizeName(applicant.payerName)}`;
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value ?? '');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).toUpperCase();
}

export function makeRequestNumber(applicant = {}) {
  const date = parseLooseDate(applicant.submittedAt) || new Date(0);
  const yyyy = String(date.getFullYear()).padStart(4, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seed = applicant.responseId || applicant.id || `${applicant.name || ''}|${applicant.email || ''}|${applicant.submittedAt || ''}`;
  const suffix = stableHash(seed).slice(-5).padStart(5, '0');
  return `CR-${yyyy}${mm}${dd}-${suffix}`;
}

export function formResponseStorageId(formId, responseId) {
  return `${normalizeText(formId)}:${normalizeText(responseId)}`;
}

export function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function parseLooseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const text = normalizeText(value);
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const zoned = new Date(text);
    if (!Number.isNaN(zoned.getTime())) return zoned;
  }
  const match = text.match(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})(?:일)?(?:[ T\s]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);
  if (match) {
    const [, y, m, d, hh='0', mm='0', ss='0'] = match;
    const date = new Date(Number(y), Number(m)-1, Number(d), Number(hh), Number(mm), Number(ss));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function paymentDateEligibility(applicant, payment, beforeDays = 1, afterDays = 7) {
  const submitted = parseLooseDate(applicant?.submittedAt);
  const paid = parseLooseDate(payment?.date);
  if (!submitted || !paid) return 'UNKNOWN';
  const earliest = submitted.getTime() - Math.max(0, Number(beforeDays) || 0) * 86400000;
  const latest = submitted.getTime() + Math.max(0, Number(afterDays) || 0) * 86400000;
  if (paid.getTime() < earliest) return 'TOO_EARLY';
  if (paid.getTime() > latest) return 'TOO_LATE';
  return 'ELIGIBLE';
}

export function canonicalizePaymentDate(value) {
  const parsed = parseLooseDate(value);
  if (!parsed) return normalizeText(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    for (let j = 0; j < curr.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function nameSimilarity(a, b) {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const maxLen = Math.max(left.length, right.length);
  return Math.max(0, 1 - levenshtein(left, right) / maxLen);
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));
}

export function markSendStarted(applicant = {}, attemptId = '', attemptedAt = new Date().toISOString()) {
  const hadSuccessfulSend = applicant.deliveryStatus === 'SENT' || (applicant.sendCount || 0) > 0;
  return {
    ...applicant,
    deliveryStatus: hadSuccessfulSend ? 'SENT' : 'SENDING',
    lastSendAttemptId: attemptId || '',
    lastSendAttemptAt: attemptedAt,
    lastSendAttemptStatus: 'SENDING',
    lastSendError: '',
    updatedAt: attemptedAt,
  };
}

export function markSendSuccess(applicant = {}, messageId = '', attemptedAt = new Date().toISOString(), attemptId = '') {
  return {
    ...applicant,
    deliveryStatus: 'SENT',
    sentAt: attemptedAt,
    sendCount: (applicant.sendCount || 0) + 1,
    lastMessageId: messageId || '',
    lastSendAttemptId: attemptId || applicant.lastSendAttemptId || '',
    lastSendAttemptAt: attemptedAt,
    lastSendAttemptStatus: 'SUCCESS',
    lastSendError: '',
    updatedAt: attemptedAt,
  };
}

export function markSendFailure(applicant = {}, error = '', attemptedAt = new Date().toISOString(), attemptId = '') {
  const hadSuccessfulSend = applicant.deliveryStatus === 'SENT' || (applicant.sendCount || 0) > 0;
  return {
    ...applicant,
    deliveryStatus: hadSuccessfulSend ? 'SENT' : 'FAILED',
    lastSendAttemptId: attemptId || applicant.lastSendAttemptId || '',
    lastSendAttemptAt: attemptedAt,
    lastSendAttemptStatus: 'FAILED',
    lastSendError: String(error || '메일 발송 실패'),
    updatedAt: attemptedAt,
  };
}

export function markSendUncertain(applicant = {}, error = '', attemptedAt = new Date().toISOString(), attemptId = '') {
  const hadSuccessfulSend = applicant.deliveryStatus === 'SENT' || (applicant.sendCount || 0) > 0;
  return {
    ...applicant,
    deliveryStatus: hadSuccessfulSend ? 'SENT' : 'UNCERTAIN',
    lastSendAttemptId: attemptId || applicant.lastSendAttemptId || '',
    lastSendAttemptAt: attemptedAt,
    lastSendAttemptStatus: 'DELIVERY_UNCERTAIN',
    lastSendError: String(error || 'Gmail 전송 결과를 확인할 수 없습니다.'),
    updatedAt: attemptedAt,
  };
}

export function formatWon(value) {
  return `${new Intl.NumberFormat('ko-KR').format(parseMoney(value))}원`;
}

export function formatDate(value, withTime = true) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date);
}

export function extractGoogleFormId(input) {
  const value = normalizeText(input);
  if (!value) return '';
  if (/^[a-zA-Z0-9_-]{20,}$/.test(value) && !value.includes('/')) return value;
  const edit = value.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
  return edit?.[1] || '';
}

export function getFormQuestions(form) {
  const questions = [];
  const walk = (items = []) => {
    for (const item of items) {
      if (item.questionItem?.question?.questionId) {
        questions.push({
          id: item.questionItem.question.questionId,
          title: item.title || '제목 없는 질문',
          required: Boolean(item.questionItem.question.required),
        });
      }
      if (item.questionGroupItem?.questions) {
        item.questionGroupItem.questions.forEach((question, index) => {
          if (question.questionId) questions.push({ id: question.questionId, title: `${item.title || '질문 그룹'} ${index + 1}`, required: Boolean(question.required) });
        });
      }
      if (item.pageBreakItem) continue;
    }
  };
  walk(form?.items || []);
  return questions;
}

function scoreAlias(title, alias) {
  const a = normalizeName(title);
  const b = normalizeName(alias);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 70;
  return 0;
}

export function suggestFormMapping(questions = [], form = {}) {
  const used = new Set();
  const mapping = {};
  for (const field of FIELD_DEFINITIONS) {
    let best = null;
    for (const question of questions) {
      if (used.has(question.id)) continue;
      const score = Math.max(...field.aliases.map((alias) => scoreAlias(question.title, alias)));
      if (!best || score > best.score) best = { question, score };
    }
    if (best && best.score >= 70) {
      mapping[field.key] = best.question.id;
      used.add(best.question.id);
    }
  }
  if (!mapping.email && form?.emailCollectionType && form.emailCollectionType !== 'DO_NOT_COLLECT') {
    mapping.email = '__RESPONDENT_EMAIL__';
  }
  return mapping;
}

export function answerText(answer) {
  const values = answer?.textAnswers?.answers?.map((item) => item.value).filter(Boolean) || [];
  return values.join(', ');
}

export function mapFormResponse(response, mapping = {}) {
  const get = (key) => {
    const questionId = mapping[key];
    if (!questionId) return '';
    if (questionId === '__RESPONDENT_EMAIL__') return response.respondentEmail || '';
    return answerText(response.answers?.[questionId]);
  };
  return {
    id: response.responseId,
    responseId: response.responseId,
    submittedAt: response.lastSubmittedTime || response.createTime || new Date().toISOString(),
    name: get('name'),
    payerName: get('payerName') || get('name'),
    email: get('email'),
    phone: get('phone'),
    course: get('course'),
    amount: parseMoney(get('amount')),
    source: 'google-form',
    paymentStatus: 'PENDING',
    deliveryStatus: 'NOT_SENT',
    matchedPaymentId: '',
    suggestedPaymentIds: [],
    reviewReason: '',
    note: '',
  };
}

export function mergeSyncedApplicant(existing, incoming) {
  if (!existing) return incoming;
  const keepIncoming = (key) => incoming[key] !== undefined && incoming[key] !== null && incoming[key] !== '' ? incoming[key] : existing[key];
  const paymentLocked = ['MATCHED', 'MANUAL_CONFIRMED'].includes(existing.paymentStatus) || Boolean(existing.matchedPaymentId);
  const manualOverrides = existing.manualOverrides || {};
  return {
    ...existing,
    submittedAt: keepIncoming('submittedAt'),
    // CS corrections are explicit local overrides and must not be undone by a later Form sync.
    name: manualOverrides.name ? existing.name : keepIncoming('name'),
    payerName: paymentLocked ? existing.payerName : keepIncoming('payerName'),
    email: manualOverrides.email ? existing.email : keepIncoming('email'),
    phone: keepIncoming('phone'),
    course: manualOverrides.course ? existing.course : (existing.courseId ? (existing.course || incoming.course) : keepIncoming('course')),
    courseId: manualOverrides.course ? (existing.courseId || '') : (existing.courseId || incoming.courseId || ''),
    amount: paymentLocked ? existing.amount : (incoming.amount > 0 ? incoming.amount : existing.amount),
    source: incoming.source || existing.source,
    sourceFormId: incoming.sourceFormId || existing.sourceFormId || '',
    responseId: incoming.responseId || existing.responseId || existing.id,
    requestNo: existing.requestNo || incoming.requestNo || makeRequestNumber({ ...existing, ...incoming }),
    manualOverrides,
    manuallyEditedAt: existing.manuallyEditedAt || '',
    // Operational state is intentionally preserved across Form re-sync.
    paymentStatus: existing.paymentStatus || 'PENDING',
    deliveryStatus: existing.deliveryStatus || 'NOT_SENT',
    matchedPaymentId: existing.matchedPaymentId || '',
    suggestedPaymentIds: existing.suggestedPaymentIds || [],
    reviewReason: existing.reviewReason || '',
    sentAt: existing.sentAt || '',
    sendCount: existing.sendCount || 0,
    lastMessageId: existing.lastMessageId || '',
    lastSendAttemptId: existing.lastSendAttemptId || '',
    lastSendAttemptAt: existing.lastSendAttemptAt || '',
    lastSendAttemptStatus: existing.lastSendAttemptStatus || '',
    lastSendError: existing.lastSendError || '',
    updatedAt: existing.updatedAt || incoming.updatedAt || '',
    note: existing.note || '',
  };
}

export function detectCsvHeaders(headers = []) {
  const normalized = headers.map((header) => ({ raw: header, key: normalizeName(header) }));
  const choose = (aliases) => {
    let best = '';
    let bestScore = 0;
    for (const header of normalized) {
      for (const alias of aliases) {
        const score = scoreAlias(header.raw, alias);
        if (score > bestScore) {
          best = header.raw;
          bestScore = score;
        }
      }
    }
    return bestScore >= 70 ? best : '';
  };
  return {
    transactionId: choose(['거래번호', '거래ID', '거래 ID', '거래고유번호', '거래 고유번호', '참조번호', '거래일련번호']),
    date: choose(['거래일시', '거래일자', '거래일', '일시', '날짜', '입금일', '거래시간']),
    payerName: choose(['입금자명', '입금자', '보낸분', '보낸사람', '적요', '내용', '거래내용', '의뢰인']),
    amount: choose(['입금액', '입금', '금액', '거래금액', '받은금액']),
  };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"'; i += 1;
      } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }
  if (!rows.length) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => normalizeText(h.replace(/^\uFEFF/, '')));
  return {
    headers,
    rows: rows.slice(1).map((values) => Object.fromEntries(headers.map((header, idx) => [header, normalizeText(values[idx] ?? '')]))),
  };
}

export function paymentFingerprint({ transactionId = '', date, payerName, amount }) {
  const txId = normalizeText(transactionId);
  if (txId) return `tx:${txId}`;
  return `${canonicalizePaymentDate(date)}|${normalizeName(payerName)}|${parseMoney(amount)}`;
}

export function autoMatch(applicants = [], payments = [], options = {}) {
  const beforeDays = options.beforeDays ?? 1;
  const afterDays = options.afterDays ?? 7;
  const similarityThreshold = options.similarityThreshold ?? 0.6;
  const applicantPool = applicants.filter((a) => !a.matchedPaymentId && a.paymentStatus !== 'MANUAL_CONFIRMED');
  const paymentPool = payments.filter((p) => !p.matchedApplicantId);
  const exactByApplicant = new Map();
  const exactByPayment = new Map();
  const unknownDateByApplicant = new Map();

  for (const applicant of applicantPool) {
    const exactEligible = [];
    const unknownDate = [];
    for (const payment of paymentPool) {
      if (normalizeName(applicant.payerName || applicant.name) !== normalizeName(payment.payerName)) continue;
      if (parseMoney(applicant.amount) !== parseMoney(payment.amount)) continue;
      const dateState = paymentDateEligibility(applicant, payment, beforeDays, afterDays);
      if (dateState === 'ELIGIBLE') exactEligible.push(payment);
      else if (dateState === 'UNKNOWN') unknownDate.push(payment);
    }
    exactByApplicant.set(applicant.id, exactEligible);
    unknownDateByApplicant.set(applicant.id, unknownDate);
    exactEligible.forEach((payment) => exactByPayment.set(payment.id, [...(exactByPayment.get(payment.id) || []), applicant]));
  }

  const applicantUpdates = new Map();
  const paymentUpdates = new Map();
  const matched = [];
  const review = [];
  const suggestions = [];
  const matchedApplicantIds = new Set();
  const matchedPaymentIds = new Set();
  const reviewedPaymentIds = new Set();

  const putPaymentReview = (payment, applicantId, reason) => {
    const current = paymentUpdates.get(payment.id) || payment;
    const ids = new Set(current.suggestedApplicantIds || []);
    if (applicantId) ids.add(applicantId);
    paymentUpdates.set(payment.id, { ...current, matchStatus: 'REVIEW_REQUIRED', suggestedApplicantIds: [...ids], reviewReason: reason });
    reviewedPaymentIds.add(payment.id);
  };

  // Exact 1:1 + eligible date is the only automatic confirmation path.
  for (const applicant of applicantPool) {
    const candidates = exactByApplicant.get(applicant.id) || [];
    if (candidates.length !== 1) continue;
    const payment = candidates[0];
    const reverse = exactByPayment.get(payment.id) || [];
    if (reverse.length !== 1 || matchedPaymentIds.has(payment.id)) continue;
    applicantUpdates.set(applicant.id, { ...applicant, paymentStatus: 'MATCHED', matchedPaymentId: payment.id, suggestedPaymentIds: [], reviewReason: '' });
    paymentUpdates.set(payment.id, { ...payment, matchStatus: 'MATCHED', matchedApplicantId: applicant.id, courseId: applicant.courseId || payment.courseId || '', suggestedApplicantIds: [], reviewReason: '' });
    matchedApplicantIds.add(applicant.id);
    matchedPaymentIds.add(payment.id);
    matched.push({ applicantId: applicant.id, paymentId: payment.id });
  }

  // Exact candidates that are ambiguous or have unknown dates require review.
  for (const applicant of applicantPool) {
    if (matchedApplicantIds.has(applicant.id)) continue;
    const exact = (exactByApplicant.get(applicant.id) || []).filter((p) => !matchedPaymentIds.has(p.id));
    const unknown = (unknownDateByApplicant.get(applicant.id) || []).filter((p) => !matchedPaymentIds.has(p.id));
    if (exact.length || unknown.length) {
      const candidates = [...exact, ...unknown];
      const reason = exact.length ? 'EXACT_AMBIGUOUS' : 'DATE_UNKNOWN';
      applicantUpdates.set(applicant.id, { ...applicant, paymentStatus: 'REVIEW_REQUIRED', suggestedPaymentIds: candidates.map((p) => p.id), reviewReason: reason });
      candidates.forEach((p) => putPaymentReview(p, applicant.id, reason));
      review.push({ applicantId: applicant.id, reason, paymentIds: candidates.map((p) => p.id) });
      continue;
    }

    // Similar names are suggestions only. They never auto-confirm.
    const fuzzy = paymentPool
      .filter((p) => !matchedPaymentIds.has(p.id))
      .filter((p) => parseMoney(p.amount) === parseMoney(applicant.amount))
      .filter((p) => paymentDateEligibility(applicant, p, beforeDays, afterDays) === 'ELIGIBLE')
      .map((p) => ({ payment: p, similarity: nameSimilarity(applicant.payerName || applicant.name, p.payerName) }))
      .filter((item) => item.similarity >= similarityThreshold && item.similarity < 1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    if (fuzzy.length) {
      applicantUpdates.set(applicant.id, { ...applicant, paymentStatus: 'REVIEW_REQUIRED', suggestedPaymentIds: fuzzy.map((x) => x.payment.id), reviewReason: 'SIMILAR_NAME' });
      fuzzy.forEach(({ payment }) => putPaymentReview(payment, applicant.id, 'SIMILAR_NAME'));
      suggestions.push({ applicantId: applicant.id, candidates: fuzzy.map(({ payment, similarity }) => ({ paymentId: payment.id, similarity })) });
      review.push({ applicantId: applicant.id, reason: 'SIMILAR_NAME', paymentIds: fuzzy.map((x) => x.payment.id) });
    } else if (applicant.paymentStatus === 'REVIEW_REQUIRED' && ['SIMILAR_NAME','EXACT_AMBIGUOUS','DATE_UNKNOWN'].includes(applicant.reviewReason)) {
      applicantUpdates.set(applicant.id, { ...applicant, paymentStatus: 'PENDING', suggestedPaymentIds: [], reviewReason: '' });
    }
  }

  for (const payment of paymentPool) {
    if (matchedPaymentIds.has(payment.id) || reviewedPaymentIds.has(payment.id)) continue;
    if (payment.matchStatus === 'REVIEW_REQUIRED' && ['SIMILAR_NAME','EXACT_AMBIGUOUS','DATE_UNKNOWN'].includes(payment.reviewReason)) {
      paymentUpdates.set(payment.id, { ...payment, matchStatus: 'PENDING', suggestedApplicantIds: [], reviewReason: '' });
    }
  }

  return { applicantUpdates: [...applicantUpdates.values()], paymentUpdates: [...paymentUpdates.values()], matched, review, suggestions };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function renderTemplate(template, values) {
  return String(template || '').replace(/{{\s*([\w가-힣]+)\s*}}/g, (_, key) => values[key] ?? '');
}

function utf8ToBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function buildGmailRaw({ to, subject, html, fromName = '' }) {
  const cleanHeader = (value) => String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
  const cleanTo = cleanHeader(to);
  const cleanSubject = cleanHeader(subject);
  const cleanFromName = cleanHeader(fromName);
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(cleanSubject)))}?=`;
  const headers = [
    `To: ${cleanTo}`,
    `Subject: ${encodedSubject}`,
    ...(cleanFromName ? [`From: ${cleanFromName}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  return utf8ToBase64Url(`${headers.join('\r\n')}\r\n\r\n${html}`);
}
