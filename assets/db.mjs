const DB_NAME = 'class-relay';
const DB_VERSION = 1;
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
    const request = indexedDB.open(DB_NAME, DB_VERSION);
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

export async function getAll(name) {
  return requestAsPromise((await storeTx(name)).getAll());
}

export async function get(name, key) {
  return requestAsPromise((await storeTx(name)).get(key));
}

export async function put(name, value) {
  return requestAsPromise((await storeTx(name, 'readwrite')).put(value));
}

export async function bulkPut(name, values) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    values.forEach((value) => store.put(value));
    tx.oncomplete = () => resolve(values.length);
    tx.onerror = () => reject(tx.error);
  });
}

export async function remove(name, key) {
  return requestAsPromise((await storeTx(name, 'readwrite')).delete(key));
}

export async function clear(name) {
  return requestAsPromise((await storeTx(name, 'readwrite')).clear());
}

export async function getSetting(key, fallback = null) {
  const row = await get('settings', key);
  return row?.value ?? fallback;
}

export async function setSetting(key, value) {
  return put('settings', { key, value, updatedAt: new Date().toISOString() });
}

export async function exportBackup() {
  const data = { schemaVersion: 1, appVersion: '2.0.0', exportedAt: new Date().toISOString(), stores: {} };
  for (const name of Object.keys(STORES)) data.stores[name] = await getAll(name);
  return data;
}

export async function importBackup(data) {
  if (!data?.stores || data.schemaVersion !== 1) throw new Error('지원하지 않는 백업 파일입니다.');
  const db = await openDb();
  for (const name of Object.keys(STORES)) {
    const values = data.stores[name] || [];
    await new Promise((resolve, reject) => {
      const tx = db.transaction(name, 'readwrite');
      const store = tx.objectStore(name);
      store.clear();
      values.forEach((value) => store.put(value));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
}

export async function resetAll() {
  for (const name of Object.keys(STORES)) await clear(name);
}
