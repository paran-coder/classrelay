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

export function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const cleaned = String(value ?? '').replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(value));
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
    note: '',
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

export function paymentFingerprint({ date, payerName, amount }) {
  return `${normalizeText(date)}|${normalizeName(payerName)}|${parseMoney(amount)}`;
}

export function autoMatch(applicants = [], payments = []) {
  const applicantGroups = new Map();
  const paymentGroups = new Map();
  const keyOf = (name, amount) => `${normalizeName(name)}|${parseMoney(amount)}`;

  applicants.filter((a) => !a.matchedPaymentId && a.paymentStatus !== 'MANUAL_CONFIRMED').forEach((a) => {
    const key = keyOf(a.payerName || a.name, a.amount);
    if (!key.startsWith('|') && a.amount > 0) applicantGroups.set(key, [...(applicantGroups.get(key) || []), a]);
  });
  payments.filter((p) => !p.matchedApplicantId).forEach((p) => {
    const key = keyOf(p.payerName, p.amount);
    if (!key.startsWith('|') && p.amount > 0) paymentGroups.set(key, [...(paymentGroups.get(key) || []), p]);
  });

  const applicantUpdates = [];
  const paymentUpdates = [];
  const matched = [];
  const review = [];

  for (const [key, applicantsForKey] of applicantGroups.entries()) {
    const paymentsForKey = paymentGroups.get(key) || [];
    if (applicantsForKey.length === 1 && paymentsForKey.length === 1) {
      const applicant = applicantsForKey[0];
      const payment = paymentsForKey[0];
      applicantUpdates.push({ ...applicant, paymentStatus: 'MATCHED', matchedPaymentId: payment.id });
      paymentUpdates.push({ ...payment, matchStatus: 'MATCHED', matchedApplicantId: applicant.id });
      matched.push({ applicantId: applicant.id, paymentId: payment.id });
    } else if (paymentsForKey.length > 0) {
      applicantsForKey.forEach((applicant) => applicantUpdates.push({ ...applicant, paymentStatus: 'REVIEW_REQUIRED' }));
      paymentsForKey.forEach((payment) => paymentUpdates.push({ ...payment, matchStatus: 'REVIEW_REQUIRED' }));
      review.push({ key, applicants: applicantsForKey.length, payments: paymentsForKey.length });
    }
  }
  return { applicantUpdates, paymentUpdates, matched, review };
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
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const headers = [
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    ...(fromName ? [`From: ${fromName}`] : []),
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
  ];
  return utf8ToBase64Url(`${headers.join('\r\n')}\r\n\r\n${html}`);
}
