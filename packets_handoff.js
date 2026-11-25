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
  var DRAFT_KEY = 'draft';
  var LIFETIME_MS = 10 * 60 * 1000;
  var MAX_BYTES = 60 * 1024 * 1024;
  var MAX_DRAFT_BYTES = 30 * 1024 * 1024;
  var HASH = '#open-file';
  var RESULTS_HASH = '#import-results';
  var DRAFT_HASH = '#import-draft';
  var PREVIEW_CHANNEL = 'alloflow-packets-preview';

  function prevent(event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
  }
  function isQuotaError(error) {
    var name = error && error.name;
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || !!(error && error.code === 22);
  }
  function mapIdbError(error) {
    if (isQuotaError(error)) return new Error('This browser does not have enough storage space to hand the file over.');
    return error || new Error('This browser cannot keep the file for a moment.');
  }

  function open() {
    return new Promise(function (resolve, reject) {
      var idb = null;
      try { idb = root.indexedDB; } catch (_) { idb = null; }
      if (!idb) { reject(new Error('This browser cannot keep the file for a moment.')); return; }
      var request;
      try { request = idb.open(DB_NAME, 1); } catch (error) { reject(mapIdbError(error)); return; }
      request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function (event) { prevent(event); reject(mapIdbError(request.error || (event && event.target && event.target.error))); };
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
          if (request) {
            request.onsuccess = function () { answer = request.result; };
            request.onerror = prevent;
          }
        } catch (error) { db.close(); reject(mapIdbError(error)); return; }
        tx.oncomplete = function () { db.close(); resolve(answer); };
        tx.onerror = tx.onabort = function (event) {
          prevent(event);
          var err = tx.error || (event && event.target && event.target.error);
          db.close();
          reject(mapIdbError(err));
        };
      });
    });
  }

  function put(file) {
    var name = String((file && file.name) || 'file.html').slice(0, 160);
    var bytes = file && file.bytes;
    if (!bytes || typeof bytes.byteLength !== 'number') return Promise.reject(new Error('There is no file to hand over.'));
    if (bytes.byteLength > MAX_BYTES) return Promise.reject(new Error('This file is too large to hand over here.'));
    return run('readwrite', function (store) {
      var req = store.put({ id: KEY, name: name, bytes: bytes, at: Date.now() });
      if (req) req.onerror = prevent;
      return null;
    }).then(function () { return true; });
  }
  function take() {
    return run('readwrite', function (store) {
      var request = store.get(KEY);
      var del = store.delete(KEY);
      if (del) del.onerror = prevent;
      return request;
    }).then(function (row) {
      if (!row || typeof row !== 'object' || !row.bytes || typeof row.bytes.byteLength !== 'number') return null;
      if (!(Date.now() - Number(row.at) < LIFETIME_MS)) return null;
      return { name: String(row.name || 'file.html'), bytes: row.bytes };
    });
  }
  function clear() {
    return run('readwrite', function (store) {
      var del = store.delete(KEY);
      if (del) del.onerror = prevent;
      return null;
    });
  }

  function redirect(file, href, hash) {
    var target = String(href || '').trim();
    if (!/^packets[\w-]*\.html$/.test(target)) return Promise.reject(new Error('This page cannot hand the file over there.'));
    var suffix = typeof hash === 'string' && /^#[a-z0-9-]+$/i.test(hash) ? hash : HASH;
    return api.put(file).then(function () {
      if (root.location) root.location.href = target + suffix;
      return true;
    });
  }

  function isUnsafeKey(key) {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
  }
  function utf8ByteLength(str) {
    if (typeof root.TextEncoder === 'function') {
      try { return new root.TextEncoder().encode(str).byteLength; } catch (_) {}
    }
    try { return unescape(encodeURIComponent(str)).length; } catch (_) { return str.length * 2; }
  }
  var SAFE_IMG_URI_RE = /^data:image\/(?:png|jpeg|webp|gif|svg\+xml)[;,]/i;
  var MAX_IMG_URI_LEN = Math.floor(1.5 * 1024 * 1024);
  function sanitizeImgUri(uri) {
    if (typeof uri !== 'string') return '';
    var s = uri.trim();
    if (!s || s.length > MAX_IMG_URI_LEN) return '';
    return SAFE_IMG_URI_RE.test(s) ? s : '';
  }
  function sanitizeLang(value) {
    if (typeof value !== 'string') return '';
    var lang = value.trim();
    return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/i.test(lang) ? lang.toLowerCase() : '';
  }
  function sanitizeDraft(draft) {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null;
    var kind = typeof draft.kind === 'string' ? draft.kind.trim() : '';
    if (!kind || !/^[a-z0-9_-]{1,40}$/i.test(kind)) return null;
    if (kind === 'read_along') {
      var text = typeof draft.text === 'string' ? draft.text : '';
      if (!text.trim()) return null;
      var out = {
        kind: 'read_along',
        title: typeof draft.title === 'string' ? draft.title.slice(0, 120) : '',
        text: text.slice(0, 20000),
      };
      var raLang = sanitizeLang(draft.lang);
      if (raLang) out.lang = raLang;
      if (Array.isArray(draft.customSupports)) {
        var sups = [];
        for (var i = 0; i < draft.customSupports.length && sups.length < 120; i++) {
          var sr = draft.customSupports[i];
          if (!sr || typeof sr !== 'object' || Array.isArray(sr)) continue;
          var sText = typeof sr.text === 'string' ? sr.text.trim().slice(0, 500) : '';
          if (!sText) continue;
          var item = { text: sText };
          if (sr.line != null && sr.line !== '' && isFinite(Number(sr.line)) && Number(sr.line) >= 0) {
            item.line = Math.floor(Number(sr.line));
          }
          if (typeof sr.quote === 'string' && sr.quote.trim()) item.quote = sr.quote.trim().slice(0, 120);
          if (typeof sr.imgUri === 'string' && /^data:image\/(?:png|jpeg|webp|svg\+xml)[;,]/i.test(sr.imgUri) && sr.imgUri.length <= 512 * 1024) {
            item.imgUri = sr.imgUri;
          }
          if (typeof sr.alt === 'string' && sr.alt.trim()) item.alt = sr.alt.trim().slice(0, 120);
          if (typeof sr.audioUri === 'string' && /^data:audio\/(?:mpeg|mp3|wav);base64,[A-Za-z0-9+/]+=*$/i.test(sr.audioUri) && sr.audioUri.length <= 3 * 1024 * 1024) {
            item.audioUri = sr.audioUri;
          }
          if (sr.audioSource === 'teacher' || sr.audioSource === 'computer') item.audioSource = sr.audioSource;
          sups.push(item);
        }
        if (sups.length) out.customSupports = sups;
      }
      if (draft.clips && typeof draft.clips === 'object' && !Array.isArray(draft.clips)) {
        var clipsOut = {}, clipKeys = Object.keys(draft.clips), kept = 0;
        for (var ci = 0; ci < clipKeys.length && kept < 120; ci++) {
          var ck = clipKeys[ci];
          if (!ck || isUnsafeKey(ck)) continue;
          var rawClip = draft.clips[ck];
          if (typeof rawClip === 'string') {
            if (/^data:audio\/(?:mpeg|mp3|wav);base64,[A-Za-z0-9+/]+=*$/i.test(rawClip) && rawClip.length <= 3 * 1024 * 1024) {
              clipsOut[ck.slice(0, 500)] = rawClip;
              kept++;
            }
          } else if (rawClip && typeof rawClip === 'object' && !Array.isArray(rawClip) && typeof rawClip.uri === 'string') {
            if (/^data:audio\/(?:mpeg|mp3|wav);base64,[A-Za-z0-9+/]+=*$/i.test(rawClip.uri) && rawClip.uri.length <= 3 * 1024 * 1024) {
              var entry = { uri: rawClip.uri };
              if (rawClip.source === 'teacher' || rawClip.source === 'computer') entry.source = rawClip.source;
              clipsOut[ck.slice(0, 500)] = entry;
              kept++;
            }
          }
        }
        if (kept) out.clips = clipsOut;
      }
      return out;
    }
    if (kind === 'vocab') {
      if (!Array.isArray(draft.entries)) return null;
      var entriesOut = [];
      for (var vi = 0; vi < draft.entries.length && entriesOut.length < 100; vi++) {
        var ve = draft.entries[vi];
        if (!ve || typeof ve !== 'object' || Array.isArray(ve)) continue;
        var vWord = typeof ve.word === 'string' ? ve.word.trim().slice(0, 80) : '';
        if (!vWord) continue;
        var vItem = {
          word: vWord,
          meaning: typeof ve.meaning === 'string' ? ve.meaning.trim().slice(0, 500) : '',
          example: typeof ve.example === 'string' ? ve.example.trim().slice(0, 500) : '',
          pos: typeof ve.pos === 'string' ? ve.pos.trim().slice(0, 40) : '',
          tier: typeof ve.tier === 'string' ? ve.tier.trim().slice(0, 40) : '',
          imgUri: sanitizeImgUri(ve.imgUri),
          alt: typeof ve.alt === 'string' ? ve.alt.trim().slice(0, 160) : '',
        };
        entriesOut.push(vItem);
      }
      if (!entriesOut.length) return null;
      var vocabOut = {
        kind: 'vocab',
        title: typeof draft.title === 'string' ? draft.title.trim().slice(0, 120) : '',
        lang: sanitizeLang(draft.lang) || 'en',
        entries: entriesOut,
      };
      return vocabOut;
    }
    if (kind === 'word_sounds') {
      if (!Array.isArray(draft.words)) return null;
      var wordsOut = [], seenWord = Object.create(null);
      for (var wi = 0; wi < draft.words.length && wordsOut.length < 120; wi++) {
        if (typeof draft.words[wi] !== 'string') continue;
        var wStr = draft.words[wi].trim().slice(0, 60);
        if (!wStr) continue;
        var wLow = wStr.toLowerCase();
        if (seenWord[wLow]) continue;
        seenWord[wLow] = true;
        wordsOut.push(wStr);
      }
      if (!wordsOut.length) return null;
      var actsOut = [], seenAct = Object.create(null);
      if (Array.isArray(draft.activities)) {
        for (var ai = 0; ai < draft.activities.length && actsOut.length < 40; ai++) {
          if (typeof draft.activities[ai] !== 'string') continue;
          var actId = draft.activities[ai].trim();
          if (!actId || !/^[a-z0-9_-]{1,40}$/i.test(actId) || seenAct[actId]) continue;
          seenAct[actId] = true;
          actsOut.push(actId);
        }
      }
      var picsOut = {};
      if (draft.pictures && typeof draft.pictures === 'object' && !Array.isArray(draft.pictures)) {
        var picKeys = Object.keys(draft.pictures), picKept = 0;
        for (var pi = 0; pi < picKeys.length && picKept < 120; pi++) {
          var pk = picKeys[pi];
          if (!pk || isUnsafeKey(pk)) continue;
          var pkNorm = String(pk).trim().toLowerCase().slice(0, 60);
          if (!pkNorm || isUnsafeKey(pkNorm)) continue;
          var cleanPic = sanitizeImgUri(draft.pictures[pk]);
          if (cleanPic) {
            picsOut[pkNorm] = cleanPic;
            picKept++;
          }
        }
      }
      var wsOut = {
        kind: 'word_sounds',
        title: typeof draft.title === 'string' ? draft.title.trim().slice(0, 120) : '',
        lang: sanitizeLang(draft.lang) || 'en',
        words: wordsOut,
        pattern: typeof draft.pattern === 'string' ? draft.pattern.trim().slice(0, 60) : '',
        activities: actsOut,
        pictures: picsOut,
      };
      return wsOut;
    }
    try {
      var cloned = safeJsonParse(JSON.stringify(draft));
      if (!cloned || typeof cloned !== 'object' || Array.isArray(cloned)) return null;
      cloned.kind = kind;
      return cloned;
    } catch (_) { return null; }
  }
  function putDraft(draft) {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return Promise.reject(new Error('There is no draft to hand over.'));
    var rawJson;
    try { rawJson = JSON.stringify(draft); } catch (_) { return Promise.reject(new Error('This draft could not be prepared to hand over.')); }
    if (typeof rawJson !== 'string') return Promise.reject(new Error('There is no draft to hand over.'));
    if (utf8ByteLength(rawJson) > MAX_DRAFT_BYTES) return Promise.reject(new Error('This draft is too large to hand over here.'));
    var clean = sanitizeDraft(draft);
    if (!clean) return Promise.reject(new Error('This draft is missing required details to hand over.'));
    var cleanJson;
    try { cleanJson = JSON.stringify(clean); } catch (_) { return Promise.reject(new Error('This draft could not be prepared to hand over.')); }
    if (utf8ByteLength(cleanJson) > MAX_DRAFT_BYTES) return Promise.reject(new Error('This draft is too large to hand over here.'));
    return run('readwrite', function (store) {
      var req = store.put({ id: DRAFT_KEY, draft: clean, at: Date.now() });
      if (req) req.onerror = prevent;
      return null;
    }).then(function () { return true; });
  }
  function takeDraft() {
    return run('readwrite', function (store) {
      var request = store.get(DRAFT_KEY);
      var del = store.delete(DRAFT_KEY);
      if (del) del.onerror = prevent;
      return request;
    }).then(function (row) {
      if (!row || typeof row !== 'object') return null;
      if (!(Date.now() - Number(row.at) < LIFETIME_MS)) return null;
      var candidate = (row.draft && typeof row.draft === 'object') ? row.draft : (typeof row.kind === 'string' ? row : null);
      return sanitizeDraft(candidate);
    });
  }
  function redirectDraft(draft, href, openNewTab) {
    var target = String(href || '').trim();
    if (!/^packets[\w-]*\.html$/.test(target)) return Promise.reject(new Error('This page cannot hand the draft over there.'));
    return api.putDraft(draft).then(function () {
      var url = target + DRAFT_HASH;
      if (openNewTab === true && typeof root.open === 'function') {
        root.open(url, '_blank', 'noopener');
      } else if (root.location) {
        root.location.href = url;
      }
      return true;
    });
  }

  function safeJsonParse(raw) {
    return JSON.parse(raw, function (k, v) {
      return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
    });
  }

  function readJsonBlock(html, id) {
    var needle = '<script type="application/json" id="' + id + '">';
    var from = String(html || '').indexOf(needle);
    if (from < 0) return null;
    from += needle.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return null;
    try { return safeJsonParse(html.slice(from, to)); } catch (_) { return null; }
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
    try { return safeJsonParse(text.slice(start, end)); } catch (_) { return null; }
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
    // 2026-11-18: in the file's own order (lesson.sequence), as its player shows them, so the bar names the question on
    // screen and an edit changes that one. Used, as the player uses it, only when it names each question once.
    if (lesson && Array.isArray(lesson.sequence) && lesson.mode !== 'probe' && lesson.sequence.length === items.length) {
      var byId = Object.create(null), taken = Object.create(null);
      items.forEach(function (it) { byId[String(it.itemId)] = it; });
      var ordered = lesson.sequence.map(function (id) { var k = String(id), it = byId[k]; if (!it || taken[k]) return null; taken[k] = true; return it; });
      if (ordered.every(Boolean)) items = ordered;
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

    var MAX_KNOWN_IDS = 32;
    var MAX_LIVE_IDS = 12;
    var currentId = String(opts.url);
    var ids = [currentId];
    var liveIds = [];
    var info = lessonInfo(opts.html, opts.describe);
    var state = { index: 0, finished: false, parsed: null, said: '', busy: false, closed: false };

    function rememberId(id) {
      if (!id) return;
      var s = String(id);
      currentId = s;
      var at = ids.indexOf(s);
      if (at >= 0) ids.splice(at, 1);
      ids.push(s);
      if (ids.length > MAX_KNOWN_IDS) ids.splice(0, ids.length - MAX_KNOWN_IDS);
    }
    function markLive(id) {
      if (typeof id !== 'string' || !id) return;
      var at = liveIds.indexOf(id);
      if (at >= 0) liveIds.splice(at, 1);
      liveIds.push(id);
      if (liveIds.length > MAX_LIVE_IDS) liveIds.splice(0, liveIds.length - MAX_LIVE_IDS);
    }
    function knows(id) {
      return typeof id === 'string' && (liveIds.indexOf(id) >= 0 || id === currentId || ids.indexOf(id) >= 0);
    }
    function targetIds() {
      var list = liveIds.slice();
      if (currentId && list.indexOf(currentId) < 0) list.push(currentId);
      return list;
    }

    function navItem(item, i) {
      var raw = String(item.label || '');
      var dash = raw.indexOf(' \u2014 ');
      var label = item.sample
        ? (raw ? 'Sample: ' + raw : 'Sample')
        : (raw ? (i + 1) + '. ' + raw : 'Question ' + (i + 1));
      var quietLabel = (item.sample ? 'Sample' : 'Question ' + (i + 1))
        + (dash > 0 ? ': ' + raw.slice(0, dash) : '');
      return { index: i, label: label, quietLabel: quietLabel };
    }

    function makeBar() {
      var items = info.items;
      var total = items.length;
      var started = !!(state.parsed && (state.parsed.startedAt || (state.parsed.check && state.parsed.check.phase)));
      var navItems = items.map(navItem);
      if (!total) {
        return {
          hidden: false,
          where: 'No questions in this file yet.',
          buttons: [],
          said: state.said,
          busy: state.busy,
          nav: { index: 0, total: 0, canPrev: false, canNext: false, finished: false, started: false, items: [] },
        };
      }
      if (state.finished) {
        return {
          hidden: false,
          where: 'End of file. Press Start over to go through questions.',
          buttons: [],
          said: state.said,
          busy: state.busy,
          nav: { index: total, total: total, canPrev: total > 0, canNext: false, finished: true, started: true, items: navItems },
        };
      }
      var cur = Math.max(0, Math.min(isFinite(state.index) ? Math.floor(state.index) : 0, total - 1));
      var item = items[cur];
      var realCount = items.filter(function (x) { return !x.sample; }).length;
      var where = (item.sample ? 'Sample: ' : 'Question ' + (cur + 1) + ' of ' + total + ': ') + item.label;
      // Without the word ("Activity — word": in Word Sounds and vocabulary the word is the answer), for "Hide answers".
      // When describe is absent (dash < 0), only math prompts (where word is the problem, not the answer) stay shown.
      var dash = String(item.label).indexOf(' \u2014 ');
      var isMathPrompt = /^(?:math_|quantity_discrimination$|missing_number$)/.test(String(item.activity || ''));
      var quiet = (item.sample ? 'Sample' : 'Question ' + (cur + 1) + ' of ' + total)
        + (dash > 0 ? ': ' + String(item.label).slice(0, dash) : (dash < 0 && isMathPrompt && item.label) ? ': ' + item.label : '');
      var buttons = [];
      if (typeof opts.onAction === 'function') {
        buttons.push({ action: 'remove', label: 'Remove question', disabled: !!(item.sample || realCount <= 1) });
        if (!item.sample && item.canSwap) buttons.push({ action: 'swap', label: 'Change wrong answers', disabled: false });
        if (!item.sample && item.canTogglePicture) buttons.push({ action: 'picture', label: item.noPicture ? 'Include picture' : 'Leave out picture', disabled: false });
      }
      return {
        hidden: false,
        where: where,
        whereQuiet: quiet,
        buttons: buttons,
        said: state.said,
        busy: state.busy,
        nav: { index: cur, total: total, canPrev: started && cur > 0, canNext: total > 0, finished: false, started: started, items: navItems },
      };
    }

    function sendAll(payloadForId) {
      targetIds().forEach(function (id) {
        try { channel.postMessage(Object.assign({ id: id }, payloadForId)); } catch (_) {}
      });
    }

    channel.onmessage = function (event) {
      if (state.closed) return;
      var msg = event && event.data;
      if (!msg || typeof msg !== 'object' || !knows(msg.id)) return;
      if (msg.type === 'preview-hello') {
        markLive(msg.id);
        try { channel.postMessage({ type: 'preview-bar', id: msg.id, bar: makeBar() }); } catch (_) {}
        return;
      }
      if (msg.type === 'preview-store') {
        markLive(msg.id);
        if (typeof msg.key !== 'string' || (info.storageKey && msg.key !== info.storageKey)) return;
        if (msg.value == null) { state.index = 0; state.finished = false; state.parsed = null; }
        else {
          try {
            var parsed = safeJsonParse(String(msg.value));
            if (parsed && typeof parsed === 'object') {
              state.parsed = parsed;
              if (typeof parsed.index === 'number' && isFinite(parsed.index)) {
                state.index = Math.max(0, Math.min(Math.floor(parsed.index), Math.max(0, info.items.length - 1)));
              }
              state.finished = !!(parsed.finishedAt || (parsed.check && parsed.check.phase === 'done'));
            }
          } catch (_) {}
        }
        sendAll({ type: 'preview-bar', bar: makeBar() });
        return;
      }
      if (msg.type === 'preview-act') {
        markLive(msg.id);
        if (state.busy || typeof opts.onAction !== 'function' || state.finished || !info.items.length) return;
        var cur = Math.max(0, Math.min(isFinite(state.index) ? Math.floor(state.index) : 0, info.items.length - 1));
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
          if (res.url) rememberId(res.url);
          info = lessonInfo(res.html, opts.describe);
          var clamped = info.items.length ? Math.max(0, Math.min(cur, info.items.length - 1)) : 0;
          state.index = clamped;
          state.finished = false;
          state.said = String(res.said || '');
          var snapshot = buildResumeSnapshot(info, state.parsed, clamped);
          if (info.storageKey && snapshot[info.storageKey]) {
            try { state.parsed = safeJsonParse(snapshot[info.storageKey]); } catch (_) {}
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
        if (next.url) rememberId(next.url);
        if (typeof next.html === 'string') {
          info = lessonInfo(next.html, opts.describe);
          state.index = info.items.length ? Math.max(0, Math.min(isFinite(state.index) ? Math.floor(state.index) : 0, info.items.length - 1)) : 0;
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

  var OWNER_PAGES = {
    words: { href: 'packets-make.html', name: 'Make Word Sounds practice', hash: HASH },
    vocab: { href: 'packets-vocab.html', name: 'Make vocabulary practice', hash: HASH },
    symbol: { href: 'packets-symbol-runner.html', name: 'Make Symbol Runner practice', hash: HASH },
    math: { href: 'packets-math-practice.html', name: 'Make math fact practice', hash: HASH },
    check: { href: 'packets-check.html', name: 'Make a math check', hash: HASH },
    read: { href: 'packets-read-along.html', name: 'Make a read-along', hash: HASH },
    choice: { href: 'packets-choice.html', name: 'Choice, Sort & Write', hash: HASH },
    maze: { href: 'packets-maze.html', name: 'CBM-Maze Reading', hash: HASH },
    manipulatives: { href: 'packets-manipulatives.html', name: 'Visual Math Manipulatives', hash: HASH },
    stem: { href: 'packets-stem-lab.html', name: 'STEM Labs', hash: HASH },
    life: { href: 'packets-life-skills.html', name: 'Life Skills & Transition', hash: HASH },
    aac: { href: 'packets-aac.html', name: 'AAC Boards', hash: HASH },
    sel: { href: 'packets-sel.html', name: 'Focus & UDL Toolkits', hash: HASH },
    playlist: { href: 'packets-playlist.html', name: 'Unit Playlists', hash: HASH },
    compile: { href: 'packets-compile.html', name: 'Compile Activity', hash: HASH },
    results: { href: 'packets-results.html', name: 'Add up results', hash: RESULTS_HASH },
  };

  function ownerPage(input, verifyCore) {
    var parts = input;
    var isPartsObj = !!(parts && typeof parts === 'object' && !Array.isArray(parts) && (typeof parts.ok === 'boolean' || typeof parts.kind === 'string'));
    if (!isPartsObj) {
      var vc = verifyCore || (root && root.AlloPacketVerify);
      if (!vc || typeof vc.readParts !== 'function') return null;
      parts = vc.readParts(input);
    }
    if (!parts || typeof parts !== 'object') return null;
    if (parts.kind === 'results') {
      return { kind: 'results', href: OWNER_PAGES.results.href, name: OWNER_PAGES.results.name, hash: OWNER_PAGES.results.hash };
    }
    if (!parts.ok || !parts.lesson || typeof parts.lesson !== 'object') return null;
    var lesson = parts.lesson;
    var m = (parts.manifest && typeof parts.manifest === 'object' && !Array.isArray(parts.manifest)) ? parts.manifest : {};
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks.filter(function (b) { return b && typeof b.activity === 'string' && Array.isArray(b.items); }) : [];
    if (!blocks.length) return null;
    var every = function (re) { return blocks.every(function (b) { return re.test(b.activity); }); };
    var some = function (re) { return blocks.some(function (b) { return re.test(b.activity); }); };
    var check = !!(m.check || lesson.mode === 'probe');
    var isPlaylist = some(/^playlist_roadmap$/) || !!(m.builder && typeof m.builder === 'object' && /playlist/i.test(String(m.builder.name || '')));
    var isCompiled = !!(m.compiled && typeof m.compiled === 'object' && m.compiled.sourceKind) || some(/^(?:compiled_quiz|compiled_cloze|branching_adventure|anchor_study)$/);
    var kind = isPlaylist ? 'playlist'
      : isCompiled ? 'compile'
      : every(/^vocab_/) ? 'vocab'
      : every(/^symbol_runner$/) ? 'symbol'
      : every(/^read_along$/) ? 'read'
      : every(/^maze_reading$/) ? 'maze'
      : every(/^(?:choice_board|concept_sort|sequence_order|tiered_writing)$/) ? 'choice'
      : every(/^manip_/) ? 'manipulatives'
      : every(/^stem_/) ? 'stem'
      : every(/^life_/) ? 'life'
      : every(/^aac_board$/) ? 'aac'
      : every(/^sel_/) ? 'sel'
      : check ? 'check'
      : every(/^math_/) ? 'math'
      : 'words';
    var entry = OWNER_PAGES[kind];
    return entry ? { kind: kind, href: entry.href, name: entry.name, hash: entry.hash } : null;
  }

  var QR_PUB_STORE_KEY = 'alloflow-packets-qr-pubkey:v1';

  function cleanQrText(raw) {
    return String(raw == null ? '' : raw).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
  }

  function validateQrPublicKey(raw, qrCrypto) {
    var trimmed = cleanQrText(raw);
    if (!trimmed) return { ok: false, reason: 'empty', key: '' };
    if (/^AFSK1[.:]/i.test(trimmed)) return { ok: false, reason: 'secret', key: '' };
    var cryptoMod = qrCrypto || (root && root.AlloPacketQrCrypto) || null;
    if (cryptoMod && typeof cryptoMod.parsePublicKey === 'function') {
      try {
        var parsed = cryptoMod.parsePublicKey(trimmed);
        if (parsed) return { ok: true, reason: '', key: trimmed };
      } catch (_) {}
      return { ok: false, reason: 'invalid', key: '' };
    }
    if (/^AFPK1\.[A-Za-z0-9_-]{40,64}$/.test(trimmed)) return { ok: true, reason: '', key: trimmed };
    return { ok: false, reason: 'invalid', key: '' };
  }

  function getSavedQrPublicKey(qrCrypto) {
    try {
      var stored = root && root.localStorage ? root.localStorage.getItem(QR_PUB_STORE_KEY) : '';
      var check = validateQrPublicKey(stored, qrCrypto);
      return check.ok ? check.key : '';
    } catch (_) {
      return '';
    }
  }

  function saveQrPublicKey(raw, qrCrypto) {
    var check = validateQrPublicKey(raw, qrCrypto);
    if (!check.ok) return check;
    try {
      if (root && root.localStorage) root.localStorage.setItem(QR_PUB_STORE_KEY, check.key);
      return { ok: true, reason: '', key: check.key };
    } catch (_) {
      return { ok: false, reason: 'storage', key: '' };
    }
  }

  function clearSavedQrPublicKey() {
    try {
      if (root && root.localStorage) root.localStorage.removeItem(QR_PUB_STORE_KEY);
      return true;
    } catch (_) {
      return false;
    }
  }

  function mountQrKeyHelper(inputEl, options) {
    if (!inputEl || !inputEl.parentNode || !inputEl.ownerDocument) return null;
    if (inputEl._alloQrHelper && inputEl.parentNode.querySelector('[data-qr-key-bar="1"]')) {
      inputEl._alloQrHelper.sync();
      return inputEl._alloQrHelper;
    }
    var doc = inputEl.ownerDocument;
    var o = options || {};
    var existing = inputEl.parentNode.querySelector('[data-qr-key-bar="1"]');
    if (existing) existing.remove();

    var bar = doc.createElement('div');
    bar.className = 'row qr-key-bar';
    bar.setAttribute('data-qr-key-bar', '1');

    var lbl = doc.createElement('label');
    lbl.className = 'qr-check-opt';
    var cb = doc.createElement('input');
    cb.type = 'checkbox';
    cb.setAttribute('data-qr-remember', '1');
    lbl.appendChild(cb);
    lbl.appendChild(doc.createTextNode(' Remember class public key on this device'));

    var useBtn = doc.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'btn btn-text btn-small';
    useBtn.setAttribute('data-qr-use', '1');
    useBtn.textContent = 'Use saved class key';
    useBtn.hidden = true;

    var forgetBtn = doc.createElement('button');
    forgetBtn.type = 'button';
    forgetBtn.className = 'btn btn-text btn-small';
    forgetBtn.setAttribute('data-qr-forget', '1');
    forgetBtn.textContent = 'Forget saved key';
    forgetBtn.hidden = true;

    var said = doc.createElement('span');
    said.className = 'hint qr-key-said';
    said.setAttribute('role', 'status');
    said.setAttribute('data-qr-said', '1');

    bar.appendChild(lbl);
    bar.appendChild(useBtn);
    bar.appendChild(forgetBtn);
    bar.appendChild(said);
    inputEl.parentNode.insertBefore(bar, inputEl.nextSibling);

    function sync(msg) {
      var saved = getSavedQrPublicKey(o.qrCrypto);
      var current = cleanQrText(inputEl.value);
      cb.checked = !!(saved && current && saved === current);
      useBtn.hidden = !(saved && current !== saved);
      forgetBtn.hidden = !saved;
      if (msg != null) said.textContent = msg;
    }

    cb.addEventListener('change', function () {
      if (cb.checked) {
        var res = saveQrPublicKey(inputEl.value, o.qrCrypto);
        if (!res.ok) {
          cb.checked = false;
          if (res.reason === 'secret') sync('Only a public key (AFPK1.) can be saved here, never a private key.');
          else sync('Paste a valid class public key (AFPK1.) first.');
          return;
        }
        sync('Class public key saved on this device (private key is never stored).');
      } else {
        clearSavedQrPublicKey();
        sync('Saved class key removed from this device.');
      }
    });

    useBtn.addEventListener('click', function () {
      var saved = getSavedQrPublicKey(o.qrCrypto);
      if (!saved) { sync(''); return; }
      inputEl.value = saved;
      try {
        var WinEv = (doc.defaultView && doc.defaultView.Event) || Event;
        inputEl.dispatchEvent(new WinEv('input', { bubbles: true }));
      } catch (_) {}
      sync('Filled saved class public key.');
    });

    forgetBtn.addEventListener('click', function () {
      clearSavedQrPublicKey();
      sync('Saved class key removed from this device.');
    });

    inputEl.addEventListener('input', function () {
      var val = cleanQrText(inputEl.value);
      if (/^AFSK1[.:]/i.test(val)) {
        sync('Only a public key (AFPK1.) belongs here, never a private key.');
        return;
      }
      if (cb.checked && val) {
        var res = saveQrPublicKey(val, o.qrCrypto);
        if (res.ok) { sync('Updated saved class public key.'); return; }
      }
      sync('');
    });

    sync('');
    var ctrl = { node: bar, sync: sync };
    inputEl._alloQrHelper = ctrl;
    return ctrl;
  }

  var BATCH_HEADER_RE = /^(?:student|student[_ ]?code|student[_ ]?name|code|code[_ ]?name|learner|learner[_ ]?code|name|initials)$/i;
  var MAX_BATCH_FILE_BYTES = 512 * 1024;

  function parseCsvFirstCell(line) {
    var s = String(line || '').trim();
    if (!s) return '';
    if (s.charAt(0) === '"') {
      var out = '', i = 1;
      while (i < s.length) {
        if (s.charAt(i) === '"') {
          if (s.charAt(i + 1) === '"') { out += '"'; i += 2; continue; }
          break;
        }
        out += s.charAt(i++);
      }
      return out.trim();
    }
    var comma = s.indexOf(',');
    var tab = s.indexOf('\t');
    var cut = comma >= 0 && tab >= 0 ? Math.min(comma, tab) : (comma >= 0 ? comma : tab);
    return (cut >= 0 ? s.slice(0, cut) : s).trim();
  }

  function cleanCodeName(raw) {
    var s = String(raw || ''), out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      out += c < 32 || c === 127 ? ' ' : s.charAt(i);
    }
    return out.replace(/\s+/g, ' ').trim().slice(0, 40);
  }

  function parseBatchListText(raw, maxNames) {
    var cap = Number(maxNames) > 0 ? Math.floor(Number(maxNames)) : 40;
    var text = String(raw || '').replace(/^\uFEFF/, '');
    var lines = text.split(/\r?\n/);
    var names = [], seen = Object.create(null);
    var skippedDuplicates = 0, trimmedCount = 0;
    var firstNonEmptySeen = false;
    for (var i = 0; i < lines.length; i++) {
      var rawLine = String(lines[i] || '').trim();
      if (!rawLine) continue;
      var hasDelim = rawLine.indexOf(',') >= 0 || rawLine.indexOf('\t') >= 0 || rawLine.charAt(0) === '"';
      var cell = cleanCodeName(hasDelim ? parseCsvFirstCell(rawLine) : rawLine);
      if (!cell) continue;
      if (!firstNonEmptySeen) {
        firstNonEmptySeen = true;
        if (BATCH_HEADER_RE.test(cell)) continue;
      }
      var low = cell.toLowerCase();
      if (seen[low]) { skippedDuplicates++; continue; }
      seen[low] = true;
      if (names.length < cap) names.push(cell);
      else trimmedCount++;
    }
    return { names: names, skippedDuplicates: skippedDuplicates, trimmedCount: trimmedCount };
  }

  function mountBatchListHelper(textareaEl, options) {
    if (!textareaEl || !textareaEl.parentNode || !textareaEl.ownerDocument) return null;
    if (textareaEl._alloBatchHelper && textareaEl.parentNode.querySelector('[data-batch-helper="1"]')) {
      textareaEl._alloBatchHelper.sync();
      return textareaEl._alloBatchHelper;
    }
    var doc = textareaEl.ownerDocument;
    var o = options || {};
    var maxNames = Number(o.maxNames) > 0 ? Math.floor(Number(o.maxNames)) : 40;
    var existing = textareaEl.parentNode.querySelector('[data-batch-helper="1"]');
    if (existing) existing.remove();

    var bar = doc.createElement('div');
    bar.className = 'row batch-helper-bar';
    bar.setAttribute('data-batch-helper', '1');

    var loadBtn = doc.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'btn btn-text btn-small';
    loadBtn.setAttribute('data-batch-load', '1');
    loadBtn.textContent = 'Load list from .txt or .csv';

    var fileInput = doc.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.csv,text/plain,text/csv';
    fileInput.hidden = true;
    fileInput.setAttribute('aria-label', 'Load student code names from a text or CSV file');
    fileInput.setAttribute('data-batch-file', '1');

    var clearBtn = doc.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn btn-text btn-small';
    clearBtn.setAttribute('data-batch-clear', '1');
    clearBtn.textContent = 'Clear list';
    clearBtn.hidden = true;

    var said = doc.createElement('span');
    said.className = 'hint batch-helper-said';
    said.setAttribute('role', 'status');
    said.setAttribute('data-batch-helper-said', '1');

    bar.appendChild(loadBtn);
    bar.appendChild(fileInput);
    bar.appendChild(clearBtn);
    bar.appendChild(said);
    textareaEl.parentNode.insertBefore(bar, textareaEl.nextSibling);

    function sync(msg) {
      var hasText = !!String(textareaEl.value || '').trim();
      clearBtn.hidden = !hasText;
      if (msg != null) said.textContent = msg;
    }

    function dispatchInput() {
      try {
        var WinEv = (doc.defaultView && doc.defaultView.Event) || Event;
        textareaEl.dispatchEvent(new WinEv('input', { bubbles: true }));
      } catch (_) {}
    }

    function readText(file) {
      if (file && typeof file.text === 'function') return file.text();
      return new Promise(function (resolve, reject) {
        try {
          var FR = (doc.defaultView && doc.defaultView.FileReader) || FileReader;
          var reader = new FR();
          reader.onload = function () { resolve(String(reader.result || '')); };
          reader.onerror = function () { reject(new Error('unreadable')); };
          reader.readAsText(file);
        } catch (err) { reject(err); }
      });
    }

    loadBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      if (Number(file.size) > MAX_BATCH_FILE_BYTES) {
        var bigMsg = 'That file is larger than 512 KB. Choose a plain .txt or .csv list of code names.';
        sync(bigMsg);
        if (typeof o.announce === 'function') o.announce(bigMsg);
        return;
      }
      readText(file).then(function (text) {
        var parsed = parseBatchListText(text, maxNames);
        if (!parsed.names.length) {
          var emptyMsg = 'No code names were found in that file.';
          sync(emptyMsg);
          if (typeof o.announce === 'function') o.announce(emptyMsg);
          return;
        }
        textareaEl.value = parsed.names.join('\n');
        dispatchInput();
        var fileName = cleanCodeName(file.name || 'file');
        var msg = 'Loaded ' + parsed.names.length + ' ' + (parsed.names.length === 1 ? 'code name' : 'code names') + ' from ' + fileName + '.';
        if (parsed.skippedDuplicates) msg += ' Skipped ' + parsed.skippedDuplicates + ' duplicate' + (parsed.skippedDuplicates === 1 ? '' : 's') + '.';
        if (parsed.trimmedCount) msg += ' Kept the first ' + maxNames + '.';
        sync(msg);
        if (typeof o.announce === 'function') o.announce(msg);
      }, function () {
        var errMsg = 'This browser could not read that list file.';
        sync(errMsg);
        if (typeof o.announce === 'function') o.announce(errMsg);
      });
    });

    clearBtn.addEventListener('click', function () {
      textareaEl.value = '';
      dispatchInput();
      sync('Cleared code name list.');
      if (typeof o.announce === 'function') o.announce('Cleared code name list.');
      try { textareaEl.focus(); } catch (_) {}
    });

    textareaEl.addEventListener('input', function () {
      var hasText = !!String(textareaEl.value || '').trim();
      clearBtn.hidden = !hasText;
      if (!hasText && said.textContent && said.textContent.indexOf('Loaded ') === 0) said.textContent = '';
    });

    sync('');
    var ctrl = { node: bar, sync: sync };
    textareaEl._alloBatchHelper = ctrl;
    return ctrl;
  }

  var api = { put: put, take: take, clear: clear, redirect: redirect, putDraft: putDraft, takeDraft: takeDraft, redirectDraft: redirectDraft, sanitizeDraft: sanitizeDraft, hostPreview: hostPreview, ownerPage: ownerPage, validateQrPublicKey: validateQrPublicKey, getSavedQrPublicKey: getSavedQrPublicKey, saveQrPublicKey: saveQrPublicKey, clearSavedQrPublicKey: clearSavedQrPublicKey, mountQrKeyHelper: mountQrKeyHelper, parseBatchListText: parseBatchListText, mountBatchListHelper: mountBatchListHelper, QR_PUB_STORE_KEY: QR_PUB_STORE_KEY, HASH: HASH, RESULTS_HASH: RESULTS_HASH, DRAFT_HASH: DRAFT_HASH, PREVIEW_CHANNEL: PREVIEW_CHANNEL, DB_NAME: DB_NAME, LIFETIME_MS: LIFETIME_MS, MAX_BYTES: MAX_BYTES, MAX_DRAFT_BYTES: MAX_DRAFT_BYTES };
  root.AlloPacketHandoff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
