// "Change this file" on the page that opens a practice file (packets-open.html) hands the file to the maker that
// made it, in the same tab: the file is put in this site's browser storage (IndexedDB) for a moment, the maker opens
// with #open-file, takes it and deletes it. One plain script for a browser page (window.AlloPacketHandoff) and for
// node (module.exports). Nothing is sent anywhere.
//
//   put({ name, bytes }) -> Promise          bytes: an ArrayBuffer; replaces any file waiting
//   take() -> Promise<{ name, bytes } | null> the waiting file, deleted as it is read; a file older than
//                                             LIFETIME_MS is deleted and not given
//   clear() -> Promise                        deletes a waiting file
(function (root) {
  'use strict';

  var DB_NAME = 'alloflow-packets-handoff';
  var STORE = 'files';
  var KEY = 'waiting';
  var LIFETIME_MS = 10 * 60 * 1000;
  var HASH = '#open-file';

  function open() {
    return new Promise(function (resolve, reject) {
      var idb = null;
      try { idb = root.indexedDB; } catch (_) { idb = null; }
      if (!idb) { reject(new Error('This browser cannot keep the file for a moment.')); return; }
      var request;
      try { request = idb.open(DB_NAME, 1); } catch (error) { reject(error); return; }
      request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error('This browser cannot keep the file for a moment.')); };
      request.onblocked = function () { reject(new Error('Another tab of this site is busy. Close it and try again.')); };
    });
  }
  // One transaction; work(store) may return a request whose result is the answer.
  function run(mode, work) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var answer, tx;
        try {
          tx = db.transaction(STORE, mode);
          var request = work(tx.objectStore(STORE));
          if (request) request.onsuccess = function () { answer = request.result; };
        } catch (error) { db.close(); reject(error); return; }
        tx.oncomplete = function () { db.close(); resolve(answer); };
        tx.onerror = tx.onabort = function () { db.close(); reject(tx.error || new Error('This browser cannot keep the file for a moment.')); };
      });
    });
  }

  function put(file) {
    var name = String((file && file.name) || 'file.html').slice(0, 160);
    var bytes = file && file.bytes;
    if (!bytes || typeof bytes.byteLength !== 'number') return Promise.reject(new Error('There is no file to hand over.'));
    return run('readwrite', function (store) { store.put({ id: KEY, name: name, bytes: bytes, at: Date.now() }); return null; });
  }
  function take() {
    return run('readwrite', function (store) {
      var request = store.get(KEY);
      store.delete(KEY);
      return request;
    }).then(function (row) {
      if (!row || typeof row !== 'object' || !row.bytes || typeof row.bytes.byteLength !== 'number') return null;
      if (!(Date.now() - Number(row.at) < LIFETIME_MS)) return null;
      return { name: String(row.name || 'file.html'), bytes: row.bytes };
    });
  }
  function clear() { return run('readwrite', function (store) { store.delete(KEY); return null; }); }

  var api = { put: put, take: take, clear: clear, HASH: HASH, DB_NAME: DB_NAME, LIFETIME_MS: LIFETIME_MS };
  root.AlloPacketHandoff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
