const DB_NAME = 'class-relay';
const DB_VERSION = 2;
const STORES = {
  settings: { keyPath: 'key' },
  courses: { keyPath: 'id' },
  applicants: { keyPath: 'id' },
  payments: { keyPath: 'id' },
  logs: { keyPath: 'id' },
  templates: { keyPath: 'id' },
};

let dbPromise;

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onblocked = () => reject(new Error('IndexedDB 업데이트가 이전 ClassRelay 탭에 의해 차단되었습니다. 다른 ClassRelay 탭을 닫고 새로고침해주세요.'));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
}

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [name, options] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options);
      }
    };
    request.onblocked = () => reject(new Error('IndexedDB 업데이트가 이전 ClassRelay 탭에 의해 차단되었습니다. 다른 ClassRelay 탭을 닫고 새로고침해주세요.'));
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function storeTx(name, mode = 'readonly') {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function getAll(name) { return requestAsPromise((await storeTx(name)).getAll()); }
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

export async function atomicChange({ puts = {}, deletes = {} } = {}) {
  const names = [...new Set([...Object.keys(puts), ...Object.keys(deletes)])].filter((name) => STORES[name]);
  if (!names.length) return 0;
  const database = await openDb();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(names, 'readwrite');
    let count = 0;
    for (const name of names) {
      const store = tx.objectStore(name);
      for (const value of puts[name] || []) { store.put(value); count += 1; }
      for (const key of deletes[name] || []) { store.delete(key); count += 1; }
    }
    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error || new Error('원자적 변경 중 오류가 발생했습니다.'));
    tx.onabort = () => reject(tx.error || new Error('원자적 변경이 중단되었습니다.'));
  });
}

export async function remove(name, key) { return requestAsPromise((await storeTx(name, 'readwrite')).delete(key)); }
export async function clear(name) { return requestAsPromise((await storeTx(name, 'readwrite')).clear()); }
export async function getSetting(key, fallback = null) { const row = await get('settings', key); return row?.value ?? fallback; }
export async function setSetting(key, value) { return put('settings', { key, value, updatedAt: new Date().toISOString() }); }

export async function exportBackup() {
  const data = { schemaVersion: 1, appVersion: '2.6.0', exportedAt: new Date().toISOString(), stores: {} };
  for (const name of Object.keys(STORES)) data.stores[name] = await getAll(name);
  return data;
}

export async function importBackup(data) {
  if (!data?.stores || data.schemaVersion !== 1) throw new Error('지원하지 않는 백업 파일입니다.');
  const database = await openDb();
  const names = Object.keys(STORES);
  return new Promise((resolve, reject) => {
    const tx = database.transaction(names, 'readwrite');
    for (const name of names) {
      const store = tx.objectStore(name);
      store.clear();
      for (const value of data.stores[name] || []) store.put(value);
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
