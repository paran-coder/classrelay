const DB_NAME = 'class-relay';
const STORES = {
  settings: { keyPath: 'key' },
  courses: { keyPath: 'id' },
  applicants: { keyPath: 'id' },
  payments: { keyPath: 'id' },
  logs: { keyPath: 'id' },
};

let dbPromise;

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    // Do not force a schema version. This opens v1 data as-is and also recovers browsers
    // that previously touched a higher abandoned schema without attempting a downgrade.
    const request = indexedDB.open(DB_NAME);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, options] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function storeTx(name, mode = 'readonly') {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function getAll(name) { return requestAsPromise((await storeTx(name)).getAll()); }
export async function getOptionalAll(name) {
  const database = await openDb();
  if (!database.objectStoreNames.contains(name)) return [];
  return requestAsPromise(database.transaction(name, 'readonly').objectStore(name).getAll());
}

export async function get(name, key) { return requestAsPromise((await storeTx(name)).get(key)); }
export async function put(name, value) { return requestAsPromise((await storeTx(name, 'readwrite')).put(value)); }

export async function bulkPut(name, values) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    values.forEach((value) => store.put(value));
    tx.oncomplete = () => resolve(values.length);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('저장 작업이 중단되었습니다.'));
  });
}

export async function atomicWrite(writes = {}) {
  const names = Object.keys(writes).filter((name) => STORES[name]);
  if (!names.length) return 0;
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(names, 'readwrite');
    let count = 0;
    for (const name of names) {
      const store = tx.objectStore(name);
      for (const value of writes[name] || []) { store.put(value); count += 1; }
    }
    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error || new Error('원자적 저장 중 오류가 발생했습니다.'));
    tx.onabort = () => reject(tx.error || new Error('원자적 저장이 중단되었습니다.'));
  });
}

export async function remove(name, key) { return requestAsPromise((await storeTx(name, 'readwrite')).delete(key)); }
export async function clear(name) { return requestAsPromise((await storeTx(name, 'readwrite')).clear()); }
export async function getSetting(key, fallback = null) { const row = await get('settings', key); return row?.value ?? fallback; }
export async function setSetting(key, value) { return put('settings', { key, value, updatedAt: new Date().toISOString() }); }

export async function exportBackup() {
  const data = { schemaVersion: 1, appVersion: '2.9.2', exportedAt: new Date().toISOString(), stores: {} };
  for (const name of Object.keys(STORES)) data.stores[name] = await getAll(name);
  return data;
}

export async function importBackup(data) {
  if (!data?.stores || data.schemaVersion !== 1) throw new Error('지원하지 않는 백업 파일입니다.');
  const database = await openDb();
  const names = Object.keys(STORES);
  const stores = { ...data.stores };
  const settings = Array.isArray(stores.settings) ? [...stores.settings] : [];
  const legacyTemplates = Array.isArray(stores.templates) ? stores.templates : [];
  if (legacyTemplates.length && !settings.some((row) => row?.key === 'emailTemplates')) {
    const migrated = legacyTemplates.map(({ isDefault, ...template }) => template);
    const defaultId = legacyTemplates.find((template) => template?.isDefault)?.id || migrated[0]?.id || '';
    settings.push({ key:'emailTemplates', value:migrated, updatedAt:new Date().toISOString() });
    if (defaultId) settings.push({ key:'defaultEmailTemplateId', value:defaultId, updatedAt:new Date().toISOString() });
  }
  stores.settings = settings;
  return new Promise((resolve, reject) => {
    const tx = database.transaction(names, 'readwrite');
    for (const name of names) {
      const store = tx.objectStore(name);
      store.clear();
      for (const value of stores[name] || []) store.put(value);
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('백업 복원 중 오류가 발생했습니다.'));
    tx.onabort = () => reject(tx.error || new Error('백업 복원이 중단되었습니다.'));
  });
}

export async function resetAll() {
  const database = await openDb();
  const names = Object.keys(STORES);
  return new Promise((resolve, reject) => {
    const tx = database.transaction(names, 'readwrite');
    names.forEach((name) => tx.objectStore(name).clear());
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error || new Error('초기화 중 오류가 발생했습니다.'));
    tx.onabort = () => reject(tx.error || new Error('초기화가 중단되었습니다.'));
  });
}
