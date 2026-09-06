import { FORM_SCOPES, GMAIL_SCOPES, extractGoogleFormId, getFormQuestions, suggestFormMapping, mapFormResponse, buildGmailRaw } from './core.mjs';

const tokenCache = new Map();
let gisPromise;

export function loadGoogleIdentity() {
  if (globalThis.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google Identity Services를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

function scopeKey(scopes) { return [...scopes].sort().join(' '); }

export async function authorize(clientId, scopes, prompt = '') {
  if (!clientId) throw new Error('Google OAuth Client ID를 먼저 입력해주세요.');
  await loadGoogleIdentity();
  const key = `${clientId}|${scopeKey(scopes)}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: scopes.join(' '),
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        const expiresIn = Number(response.expires_in || 3600);
        tokenCache.set(key, { token: response.access_token, expiresAt: Date.now() + expiresIn * 1000 });
        resolve(response.access_token);
      },
      error_callback: (error) => reject(new Error(error?.message || error?.type || 'Google 권한창을 완료하지 못했습니다.')),
    });
    client.requestAccessToken({ prompt });
  });
}

async function googleFetch(url, token, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (cause) {
    const error = new Error(cause?.name === 'AbortError' ? 'Google API 요청 시간이 초과되었습니다.' : 'Google API 네트워크 연결에 실패했습니다.');
    error.networkFailure = true;
    error.cause = cause;
    throw error;
  }
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch {}
    const error = new Error(detail || `Google API 오류 (${response.status})`);
    error.httpStatus = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function connectForm(clientId, formUrl) {
  const formId = extractGoogleFormId(formUrl);
  if (!formId) throw new Error('Google Form 편집 URL에서 Form ID를 찾지 못했습니다. `/forms/d/.../edit` 주소를 사용해주세요.');
  const token = await authorize(clientId, FORM_SCOPES);
  const form = await googleFetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`, token);
  const questions = getFormQuestions(form);
  return {
    formId,
    formUrl,
    title: form.info?.title || 'Google Form',
    documentTitle: form.info?.documentTitle || '',
    emailCollectionType: form.settings?.emailCollectionType || '',
    questions,
    suggestedMapping: suggestFormMapping(questions, form.settings || {}),
  };
}

export async function fetchFormResponses(clientId, formId) {
  const token = await authorize(clientId, FORM_SCOPES);
  const all = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({ pageSize: '5000' });
    if (pageToken) qs.set('pageToken', pageToken);
    const result = await googleFetch(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses?${qs}`, token);
    all.push(...(result.responses || []));
    pageToken = result.nextPageToken || '';
  } while (pageToken);
  return all;
}

export async function syncMappedResponses({ clientId, formId, mapping, existingIds = null }) {
  const responses = await fetchFormResponses(clientId, formId);
  const filtered = existingIds ? responses.filter((response) => !existingIds.has(response.responseId)) : responses;
  return filtered.map((response) => mapFormResponse(response, mapping));
}

export async function authorizeGmail(clientId) {
  return authorize(clientId, GMAIL_SCOPES);
}

export async function sendGmail({ clientId, to, subject, html, fromName = '' }) {
  const token = await authorizeGmail(clientId);
  const raw = buildGmailRaw({ to, subject, html, fromName });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    return await googleFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.networkFailure || Number(error.httpStatus || 0) >= 500) error.deliveryUncertain = true;
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function clearTokens() { tokenCache.clear(); }
