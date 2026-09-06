const LOCK_NAME = 'class-relay-write';
const LEASE_KEY = 'class-relay:write-lock';
const CHANNEL_NAME = 'class-relay-coordination';
const TAB_ID = globalThis.crypto?.randomUUID?.() || `tab_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const listeners = new Set();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
let activeOperations = 0;

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function emit(message) { listeners.forEach((listener) => { try { listener(message); } catch {} }); }
function announce(type, detail = {}) {
  const payload = { type, tabId: TAB_ID, at: Date.now(), ...detail };
  channel?.postMessage(payload);
  return payload;
}

channel?.addEventListener('message', (event) => {
  if (!event.data || event.data.tabId === TAB_ID) return;
  emit(event.data);
});

async function withLease(label, fn) {
  if (typeof localStorage === 'undefined') return fn();
  const token = `${TAB_ID}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let acquired = false;
  const ttl = 15000;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const now = Date.now();
    let current = null;
    try { current = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null'); } catch {}
    if (!current || !current.token || Number(current.expiresAt || 0) < now) {
      const next = { token, tabId: TAB_ID, label, expiresAt: now + ttl };
      localStorage.setItem(LEASE_KEY, JSON.stringify(next));
      let verify = null;
      try { verify = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null'); } catch {}
      if (verify?.token === token) { acquired = true; break; }
    }
    await sleep(100 + Math.floor(Math.random() * 80));
  }
  if (!acquired) throw new Error('다른 탭에서 ClassRelay 작업이 진행 중입니다. 잠시 후 다시 시도해주세요.');
  const renew = setInterval(() => {
    try {
      const current = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null');
      if (current?.token === token) localStorage.setItem(LEASE_KEY, JSON.stringify({ ...current, expiresAt: Date.now() + ttl }));
    } catch {}
  }, 4000);
  try { return await fn(); }
  finally {
    clearInterval(renew);
    try {
      const current = JSON.parse(localStorage.getItem(LEASE_KEY) || 'null');
      if (current?.token === token) localStorage.removeItem(LEASE_KEY);
    } catch {}
  }
}

export async function withOperationLock(label, fn) {
  const run = async () => {
    activeOperations += 1;
    announce('operation-start', { label });
    try { return await fn(); }
    finally {
      activeOperations -= 1;
      announce('data-changed', { label });
    }
  };
  if (globalThis.navigator?.locks?.request) {
    return navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, run);
  }
  return withLease(label, run);
}

export function onExternalCoordination(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isLocalOperationRunning() { return activeOperations > 0; }
export function currentTabId() { return TAB_ID; }
