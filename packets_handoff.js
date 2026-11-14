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
  var PREVIEW_CHANNEL = 'alloflow-packets-preview';

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

  function readJsonBlock(html, id) {
    var needle = '<script type="application/json" id="' + id + '">';
    var from = String(html || '').indexOf(needle);
    if (from < 0) return null;
    from += needle.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return null;
    try { return JSON.parse(html.slice(from, to)); } catch (_) { return null; }
  }

  function readLessonBlock(html) {
    var fromTag = readJsonBlock(html, 'packet-lesson');
    if (fromTag) return fromTag;
    var text = String(html || '');
    var start = text.indexOf('\nvar lesson=');
    var prefixLen = 12;
    if (start < 0) {
      start = text.indexOf('var lesson=');
      prefixLen = 11;
    }
    if (start < 0) return null;
    start += prefixLen;
    var end = text.indexOf(';\nvar labels=', start);
    if (end < 0) end = text.indexOf(';\r\nvar labels=', start);
    if (end < 0) return null;
    try { return JSON.parse(text.slice(start, end)); } catch (_) { return null; }
  }

  function lessonInfo(html, describe) {
    var lesson = readLessonBlock(html);
    var manifest = readJsonBlock(html, 'packet-manifest') || {};
    var storageKey = '';
    if (lesson && lesson.lessonId && lesson.revision) {
      storageKey = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
      if (typeof manifest.learner === 'string' && manifest.learner.trim()) {
        storageKey += ':' + encodeURIComponent(manifest.learner.trim().slice(0, 60).toLowerCase());
      }
    }
    var custom = typeof describe === 'function' ? describe(lesson, manifest) : null;
    var items = Array.isArray(custom) ? custom : [];
    if (!custom && lesson && Array.isArray(lesson.blocks)) {
      lesson.blocks.forEach(function (block) {
        (Array.isArray(block.items) ? block.items : []).forEach(function (item) {
          items.push({
            itemId: String(item.id || ''),
            activity: String(block.activity || ''),
            word: String(item.word || ''),
            sample: !!item.practice,
            label: String(item.word || item.id || ''),
            canSwap: false,
            canTogglePicture: false,
            noPicture: false,
          });
        });
      });
    }
    return { lesson: lesson, manifest: manifest, storageKey: storageKey, items: items, isCheck: !!(lesson && lesson.mode === 'probe') };
  }

  function buildResumeSnapshot(info, prevParsed, clampedIndex) {
    if (!info.storageKey || !prevParsed || !prevParsed.startedAt) return {};
    if (info.isCheck && (!prevParsed.check || prevParsed.check.phase !== 'run')) return {};
    var nextState = {
      name: typeof prevParsed.name === 'string' ? prevParsed.name : '',
      index: clampedIndex,
      startedAt: prevParsed.startedAt,
      startedLocal: prevParsed.startedLocal || '',
      finishedAt: null,
      savedFile: null,
      sent: null,
      sessionId: prevParsed.sessionId || ('preview-' + Date.now().toString(36)),
      items: info.items.map(function (it, i) {
        return { itemId: it.itemId, activity: it.activity, responses: [], attempts: i < clampedIndex ? 1 : 0, firstTry: false, correct: i < clampedIndex, done: i < clampedIndex, supports: {} };
      }),
    };
    if (prevParsed.tools && typeof prevParsed.tools === 'object') nextState.tools = prevParsed.tools;
    if (info.isCheck) {
      nextState.tries = prevParsed.tries && typeof prevParsed.tries === 'object' ? prevParsed.tries : { preview: 1 };
      nextState.check = Object.assign({}, prevParsed.check, { seen: Date.now(), pausedFrom: null, hiddenFrom: null });
    }
    var snapshot = {};
    snapshot[info.storageKey] = JSON.stringify(nextState);
    return snapshot;
  }

  // Host a live teacher preview session over BroadcastChannel for an open maker tab.
  // Options: { url, html, describe(lesson, manifest), onAction({ action, index, item }), Channel? }
  function hostPreview(options) {
    var opts = options || {};
    var ChannelCtor = opts.Channel || root.BroadcastChannel;
    if (typeof ChannelCtor !== 'function' || !opts.url || typeof opts.html !== 'string') {
      return { update: function () {}, stop: function () {} };
    }
    var channel = null;
    try { channel = new ChannelCtor(PREVIEW_CHANNEL); } catch (_) { return { update: function () {}, stop: function () {} }; }
    if (typeof channel.unref === 'function') channel.unref();

    var ids = [String(opts.url)];
    var info = lessonInfo(opts.html, opts.describe);
    var state = { index: 0, finished: false, parsed: null, said: '', busy: false, closed: false };

    function knows(id) { return typeof id === 'string' && ids.indexOf(id) >= 0; }

    function makeBar() {
      var items = info.items;
      if (!items.length) return { hidden: false, where: 'No questions in this file yet.', buttons: [], said: state.said, busy: state.busy };
      if (state.finished) return { hidden: false, where: 'End of file. Press Start over to go through questions.', buttons: [], said: state.said, busy: state.busy };
      var cur = Math.max(0, Math.min(state.index, items.length - 1));
      var item = items[cur];
      var realCount = items.filter(function (x) { return !x.sample; }).length;
      var where = (item.sample ? 'Sample: ' : 'Question ' + (cur + 1) + ' of ' + items.length + ': ') + item.label;
      var buttons = [{ action: 'remove', label: 'Remove question', disabled: !!(item.sample || realCount <= 1) }];
      if (!item.sample && item.canSwap) buttons.push({ action: 'swap', label: 'Change wrong answers', disabled: false });
      if (!item.sample && item.canTogglePicture) buttons.push({ action: 'picture', label: item.noPicture ? 'Include picture' : 'Leave out picture', disabled: false });
      return { hidden: false, where: where, buttons: buttons, said: state.said, busy: state.busy };
    }

    function sendAll(payloadForId) {
      ids.forEach(function (id) {
        try { channel.postMessage(Object.assign({ id: id }, payloadForId)); } catch (_) {}
      });
    }

    channel.onmessage = function (event) {
      if (state.closed) return;
      var msg = event && event.data;
      if (!msg || typeof msg !== 'object' || !knows(msg.id)) return;
      if (msg.type === 'preview-hello') {
        try { channel.postMessage({ type: 'preview-bar', id: msg.id, bar: makeBar() }); } catch (_) {}
        return;
      }
      if (msg.type === 'preview-store') {
        if (typeof msg.key !== 'string' || (info.storageKey && msg.key !== info.storageKey)) return;
        if (msg.value == null) { state.index = 0; state.finished = false; state.parsed = null; }
        else {
          try {
            var parsed = JSON.parse(String(msg.value));
            if (parsed && typeof parsed === 'object') {
              state.parsed = parsed;
              if (typeof parsed.index === 'number') state.index = Math.max(0, Math.min(parsed.index, Math.max(0, info.items.length - 1)));
              state.finished = !!(parsed.finishedAt || (parsed.check && parsed.check.phase === 'done'));
            }
          } catch (_) {}
        }
        sendAll({ type: 'preview-bar', bar: makeBar() });
        return;
      }
      if (msg.type === 'preview-act') {
        if (state.busy || typeof opts.onAction !== 'function' || state.finished || !info.items.length) return;
        var cur = Math.max(0, Math.min(state.index, info.items.length - 1));
        var item = info.items[cur];
        if (!item) return;
        state.busy = true;
        state.said = '';
        sendAll({ type: 'preview-bar', bar: makeBar() });
        Promise.resolve().then(function () {
          return opts.onAction({ action: String(msg.action || ''), index: cur, item: item });
        }).then(function (res) {
          if (state.closed) return;
          state.busy = false;
          if (!res || typeof res.html !== 'string') {
            state.said = (res && res.said) || 'No change made.';
            sendAll({ type: 'preview-bar', bar: makeBar() });
            return;
          }
          if (res.url && ids.indexOf(res.url) < 0) ids.push(String(res.url));
          info = lessonInfo(res.html, opts.describe);
          var clamped = info.items.length ? Math.max(0, Math.min(cur, info.items.length - 1)) : 0;
          state.index = clamped;
          state.finished = false;
          state.said = String(res.said || '');
          var snapshot = buildResumeSnapshot(info, state.parsed, clamped);
          if (info.storageKey && snapshot[info.storageKey]) {
            try { state.parsed = JSON.parse(snapshot[info.storageKey]); } catch (_) {}
          }
          sendAll({ type: 'preview-reload', html: res.html, snapshot: snapshot, bar: makeBar() });
        }, function (err) {
          if (state.closed) return;
          state.busy = false;
          state.said = String((err && err.message) || 'Could not update the file.');
          sendAll({ type: 'preview-bar', bar: makeBar() });
        });
      }
    };

    return {
      update: function (next) {
        if (state.closed || !next) return;
        if (next.url && ids.indexOf(next.url) < 0) ids.push(String(next.url));
        if (typeof next.html === 'string') {
          info = lessonInfo(next.html, opts.describe);
          state.index = info.items.length ? Math.max(0, Math.min(state.index, info.items.length - 1)) : 0;
        }
        if (next.said != null) state.said = String(next.said);
        sendAll({ type: 'preview-bar', bar: makeBar() });
      },
      stop: function () {
        if (state.closed) return;
        state.closed = true;
        sendAll({ type: 'preview-stop' });
        try { channel.close(); } catch (_) {}
      },
    };
  }

  var api = { put: put, take: take, clear: clear, hostPreview: hostPreview, HASH: HASH, PREVIEW_CHANNEL: PREVIEW_CHANNEL, DB_NAME: DB_NAME, LIFETIME_MS: LIFETIME_MS };
  root.AlloPacketHandoff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
