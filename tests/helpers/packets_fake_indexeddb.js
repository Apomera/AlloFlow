// The stand-in for IndexedDB and BroadcastChannel that tests/packets_my_words.test.js defines, copied word for word
// (lines 51-139 of that file on 2026-11-11), for tests of pages that use packets_my_words.js. fake-indexeddb is not installed here.
// ---------------------------------------------------------------------------------------------------------------
// A stand-in for IndexedDB, small and strict: object stores with a key path, transactions that see their own writes,
// commit when their requests are done and throw everything away when aborted, values copied in and out, and a
// read-only transaction that refuses to write. fake-indexeddb is not installed in this repository.
// ---------------------------------------------------------------------------------------------------------------
export function fakeIndexedDB() {
  const databases = new Map();
  const idb = { full: false, opens: 0, transactions: [] };
  const named = (name) => Object.assign(new Error(name), { name });
  idb.open = (name, version) => {
    idb.opens++;
    const request = {};
    queueMicrotask(() => {
      let db = databases.get(name);
      const fresh = !db;
      if (fresh) { db = { stores: new Map(), version }; databases.set(name, db); }
      const handle = {
        objectStoreNames: { contains: (store) => db.stores.has(store) },
        createObjectStore(store, options) { db.stores.set(store, { keyPath: options.keyPath, rows: new Map() }); },
        close() {},
        transaction(names, mode) {
          const list = Array.isArray(names) ? names : [names];
          for (const store of list) if (!db.stores.has(store)) throw named('NotFoundError');
          const working = new Map(list.map((store) => [store, new Map(db.stores.get(store).rows)]));
          const tx = { mode: mode || 'readonly', error: null, pending: 0, over: false };
          idb.transactions.push({ names: list, mode: tx.mode });
          const finish = () => queueMicrotask(() => {
            if (tx.over || tx.pending) return;
            tx.over = true;
            for (const [store, rows] of working) db.stores.get(store).rows = rows;
            if (tx.oncomplete) tx.oncomplete({ target: tx });
          });
          const ask = (run) => {
            if (tx.over) throw named('TransactionInactiveError');
            const one = {};
            tx.pending++;
            queueMicrotask(() => {
              if (tx.over) return;
              try { one.result = run(); } catch (error) {
                tx.error = error; tx.over = true;
                if (one.onerror) one.onerror({ target: one, preventDefault() {} });
                if (tx.onabort) tx.onabort({ target: tx, preventDefault() {} });
                return;
              }
              if (one.onsuccess) one.onsuccess({ target: one });
              tx.pending--;
              finish();
            });
            return one;
          };
          const write = (run) => ask(() => {
            if (tx.mode !== 'readwrite') throw named('ReadOnlyError');
            if (idb.full) throw named('QuotaExceededError');
            return run();
          });
          tx.abort = () => { if (tx.over) throw named('InvalidStateError'); tx.over = true; queueMicrotask(() => tx.onabort && tx.onabort({ target: tx, preventDefault() {} })); };
          tx.objectStore = (store) => {
            if (!working.has(store)) throw named('NotFoundError');
            const rows = working.get(store), keyPath = db.stores.get(store).keyPath;
            return {
              get: (key) => ask(() => (rows.has(key) ? JSON.parse(rows.get(key)) : undefined)),
              getAll: () => ask(() => [...rows.keys()].sort().map((key) => JSON.parse(rows.get(key)))),
              count: () => ask(() => rows.size),
              put: (value) => write(() => { rows.set(value[keyPath], JSON.stringify(value)); return value[keyPath]; }),
              delete: (key) => write(() => { rows.delete(key); }),
              clear: () => write(() => { rows.clear(); }),
            };
          };
          finish();
          return tx;
        },
      };
      request.result = handle;
      if (fresh && request.onupgradeneeded) request.onupgradeneeded({ target: request });
      if (request.onsuccess) request.onsuccess({ target: request });
    });
    return request;
  };
  idb.peek = (store) => { const db = databases.get('alloflow-packets-my-words'); return db ? [...db.stores.get(store).rows.values()].map((row) => JSON.parse(row)) : []; };
  return idb;
}
// Tabs of one browser: every channel of a name hears the others, never itself.
export function fakeChannels() {
  const open = [];
  return class FakeBroadcastChannel {
    constructor(name) { this.name = name; open.push(this); }
    postMessage(data) { const copy = JSON.parse(JSON.stringify(data)); for (const other of open) if (other !== this && other.name === this.name && other.onmessage) other.onmessage({ data: copy }); }
  };
}
