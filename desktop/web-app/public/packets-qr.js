// Teacher page logic for packets-qr.html (Collect by sealed QR).
// Zero network, zero HTML string injection, zero browser storage, zero AI.
(function (root) {
  'use strict';

  var doc = root.document;
  if (!doc) return;

  function boot() {
    var Q = root.AlloPacketQrCrypto;
    var TH = root.AlloWordSoundsTakeHome;
    var ZIP = root.AlloPacketZip;
    var HANDOFF = root.AlloPacketHandoff;
    if (!Q || !TH || !ZIP) return;

    var $ = function (id) { return doc.getElementById(id); };
    var said = $('said');
    var demoStartBtn = $('demo-start');
    var demoPanel = $('demo-panel');
    var demoCloseBtn = $('demo-close');
    var demoQrSlot = $('demo-qr-slot');
    var demoQrCaption = $('demo-qr-caption');
    var demoUnlockBtn = $('demo-unlock');
    var demoWrongBtn = $('demo-wrong-key');
    var demoTamperBtn = $('demo-tamper');

    var keySetup = $('key-setup');
    var keyActive = $('key-active');
    var keyLabelInput = $('key-label');
    var keyFpEl = $('key-fp');
    var keyLabelShow = $('key-label-show');
    var keyUnsavedTag = $('key-unsaved-tag');
    var keyPubOnlyTag = $('key-pubonly-tag');
    var keyPubInput = $('key-pub');
    var keySaveHint = $('key-save-hint');
    var keyStatus = $('key-status');
    var makeKeyBtn = $('make-key');
    var loadKeyBtn = $('load-key-btn');
    var loadKeyAgainBtn = $('load-key-again');
    var loadKeyFile = $('load-key-file');
    var pubOnlyFold = $('pub-only-fold');
    var pubOnlyInput = $('pub-only-input');
    var usePubOnlyBtn = $('use-pub-only');
    var copyPubBtn = $('copy-pub');
    var saveKeyBtn = $('save-key');
    var clearKeyBtn = $('clear-key');

    var sealDrop = $('seal-drop');
    var sealStationChk = $('seal-station-mode');
    var sealChooseBtn = $('seal-choose');
    var sealFilesInput = $('seal-files');
    var sealStatus = $('seal-status');
    var sealSaveNudge = $('seal-save-nudge');
    var sealResults = $('seal-results');
    var sealList = $('seal-list');
    var sealDownloadBtn = $('seal-download');
    var sealClearBtn = $('seal-clear');

    var camHint = $('cam-hint');
    var camToggleBtn = $('cam-toggle');
    var camSoundChk = $('cam-sound');
    var camBox = $('cam-box');
    var camVideo = $('cam-video');
    var camToast = $('cam-toast');
    var qrImgBtn = $('qr-img-btn');
    var qrImgFile = $('qr-img-file');
    var codeInput = $('code-input');
    var codeAddBtn = $('code-add');
    var codeClearBtn = $('code-clear');
    var collectStatus = $('collect-status');
    var collectedWrap = $('collected-wrap');
    var collectedCount = $('collected-count');
    var collectedBody = $('collected-body');
    var openResultsBtn = $('open-results');
    var downloadZipBtn = $('download-zip');
    var clearCollectedBtn = $('clear-collected');

    var activeKey = null; // { kind, version, label, createdAt, fingerprint, publicKey, secretKey, readOnly }
    var keySaved = false;
    var sealedWithUnsavedKey = false;
    // 2026-11-23: the public key was copied out of this tab (a colleague may seal files with it), so the private key
    // is the only way to read those results, saved or not.
    var publicKeyCopied = false;
    // The button that must be pressed a second time before an unsaved private key is dropped ('clear', 'load', '').
    var dropArmed = '';
    var dropTimer = 0;
    var resultsExported = false;
    var demoCodes = [];
    var sealedBatch = []; // [{ name, html, title, fingerprint }]
    var pendingSealHandoff = null; // { name, bytes } kept in tab memory only from #seal-batch
    var collected = [];   // [{ id, result, truncated, csvName, csvText }]
    var camStream = null;
    var camTimer = null;
    var camDetector = null;
    var camToastTimer = null;
    var camGen = 0;
    var camStarting = false;
    var lastCamCode = '';
    var lastCamAt = 0;

    function announce(text) {
      if (said) said.textContent = String(text || '');
    }
    function setStatus(el, msg, kind) {
      if (!el) return;
      if (!msg) { el.hidden = true; el.textContent = ''; el.className = 'qr-status'; return; }
      el.hidden = false;
      el.textContent = msg;
      el.className = 'qr-status' + (kind === 'ok' ? ' qr-status-ok' : kind === 'warn' ? ' qr-status-warn' : '');
      announce(msg);
    }
    function clearNode(node) {
      while (node && node.firstChild) node.removeChild(node.firstChild);
    }
    function makeEl(tag, attrs, children) {
      var node = doc.createElement(tag);
      var a = attrs || {};
      Object.keys(a).forEach(function (k) {
        var v = a[k];
        if (v === false || v == null) return;
        if (k === 'text') node.textContent = String(v);
        else if (k === 'class') node.className = String(v);
        else if (k === 'on') Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
        else node.setAttribute(k, v === true ? '' : String(v));
      });
      (children || []).forEach(function (ch) {
        if (ch == null || ch === false) return;
        node.appendChild(typeof ch === 'string' ? doc.createTextNode(ch) : ch);
      });
      return node;
    }
    function downloadBlob(name, parts, mime) {
      var blob = new root.Blob(Array.isArray(parts) ? parts : [parts], { type: mime || 'application/octet-stream' });
      var url = root.URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.download = name;
      a.href = url;
      a.hidden = true;
      doc.body.appendChild(a);
      try { a.click(); } finally {
        if (a.parentNode) a.parentNode.removeChild(a);
        root.setTimeout(function () { try { root.URL.revokeObjectURL(url); } catch (_) {} }, 60000);
      }
    }
    function concatUint8(parts) {
      var total = 0, i;
      for (i = 0; i < parts.length; i++) total += parts[i].byteLength;
      var out = new Uint8Array(total), pos = 0;
      for (i = 0; i < parts.length; i++) {
        var p = parts[i] instanceof Uint8Array ? parts[i] : new Uint8Array(parts[i]);
        out.set(p, pos);
        pos += p.byteLength;
      }
      return out;
    }
    function readAsText(file) {
      if (file && typeof file.text === 'function') return file.text();
      return new Promise(function (resolve, reject) {
        var fr = new root.FileReader();
        fr.onload = function () { resolve(String(fr.result || '')); };
        fr.onerror = function () { reject(new Error('Could not read file.')); };
        fr.readAsText(file);
      });
    }
    function readAsBuffer(file) {
      if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
      return new Promise(function (resolve, reject) {
        var fr = new root.FileReader();
        fr.onload = function () { resolve(fr.result); };
        fr.onerror = function () { reject(new Error('Could not read file.')); };
        fr.readAsArrayBuffer(file);
      });
    }
    function decodeUtf8(bytes) {
      if (typeof root.TextDecoder === 'function') return new root.TextDecoder('utf-8').decode(bytes);
      var s = '';
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return decodeURIComponent(escape(s));
    }

    // Universal ZIP reader supporting BOTH STORE (method 0) and DEFLATE (method 8 via DecompressionStream).
    function inflateRaw(compBytes) {
      if (typeof root.DecompressionStream !== 'function') {
        return Promise.reject(new Error('no_deflate'));
      }
      try {
        var ds = new root.DecompressionStream('deflate-raw');
        var writer = ds.writable.getWriter();
        var writeDone = writer.write(compBytes).then(function () { return writer.close(); });
        var reader = ds.readable.getReader();
        var chunks = [];
        var pump = function () {
          return reader.read().then(function (step) {
            if (step.done) return concatUint8(chunks);
            chunks.push(step.value);
            return pump();
          });
        };
        return Promise.all([pump(), writeDone]).then(function (res) { return res[0]; });
      } catch (err) {
        return Promise.reject(err);
      }
    }
    function unpackZipUniversal(bytes) {
      var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
      if (b.length < 22) return Promise.resolve({ ok: false, error: 'invalid', entries: [] });
      var r16 = function (p) { return b[p] | (b[p + 1] << 8); };
      var r32 = function (p) { return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0; };
      var eocd = -1, minOff = Math.max(0, b.length - 65557);
      for (var p = b.length - 22; p >= minOff; p--) {
        if (r32(p) === 0x06054b50 && p + 22 + r16(p + 20) === b.length) { eocd = p; break; }
      }
      if (eocd < 0) return Promise.resolve({ ok: false, error: 'invalid', entries: [] });
      var total = r16(eocd + 10), cdSize = r32(eocd + 12), cdOff = r32(eocd + 16);
      if (total === 0xffff || cdOff + cdSize > b.length) return Promise.resolve({ ok: false, error: 'invalid', entries: [] });
      var tasks = [], cur = cdOff, end = cdOff + cdSize, limit = Math.min(total, 500);
      for (var i = 0; i < limit && cur + 46 <= end; i++) {
        if (r32(cur) !== 0x02014b50) break;
        var method = r16(cur + 10);
        var compSize = r32(cur + 20);
        var uncompSize = r32(cur + 24);
        var nameLen = r16(cur + 28), extraLen = r16(cur + 30), commentLen = r16(cur + 32);
        var localOff = r32(cur + 42);
        var rawName = decodeUtf8(b.subarray(cur + 46, cur + 46 + nameLen));
        cur += 46 + nameLen + extraLen + commentLen;
        if (/[\/\\]$/.test(rawName) || /^__MACOSX\//i.test(rawName) || /(^|[\/\\])\./.test(rawName)) continue;
        if (!/\.html?$/i.test(rawName)) continue;
        if (uncompSize > 25 * 1024 * 1024 || localOff + 30 > b.length || r32(localOff) !== 0x04034b50) continue;
        var lName = r16(localOff + 26), lExtra = r16(localOff + 28);
        var dataOff = localOff + 30 + lName + lExtra;
        if (dataOff + compSize > b.length) continue;
        var slice = b.subarray(dataOff, dataOff + compSize);
        (function (entryName, entryMethod, entrySlice) {
          if (entryMethod === 0) {
            tasks.push(Promise.resolve({ ok: true, name: entryName, bytes: entrySlice }));
          } else if (entryMethod === 8) {
            tasks.push(inflateRaw(entrySlice).then(
              function (out) { return { ok: true, name: entryName, bytes: out }; },
              function () { return { ok: false, name: entryName, error: 'no_deflate' }; }
            ));
          } else {
            tasks.push(Promise.resolve({ ok: false, name: entryName, error: 'unsupported_method' }));
          }
        })(rawName, method, slice);
      }
      return Promise.all(tasks).then(function (list) { return { ok: true, entries: list }; });
    }

    // Gentle optional pure Web Audio scan chime (zero audio files, zero network).
    function playScanChime() {
      if (!camSoundChk || !camSoundChk.checked) return;
      var Ctx = root.AudioContext || root.webkitAudioContext;
      if (typeof Ctx !== 'function') return;
      try {
        var ctx = new Ctx();
        var now = ctx.currentTime;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1320, now + 0.065);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
        root.setTimeout(function () { try { ctx.close(); } catch (_) {} }, 250);
      } catch (_) {}
    }

    function showCamToast(msg) {
      if (!camToast || !camBox || camBox.hidden) return;
      camToast.hidden = false;
      camToast.textContent = msg;
      if (camToastTimer) root.clearTimeout(camToastTimer);
      camToastTimer = root.setTimeout(function () { camToast.hidden = true; }, 3500);
    }

    function updateSaveNudge() {
      if (!sealSaveNudge) return;
      sealSaveNudge.hidden = !(sealedWithUnsavedKey && activeKey && !activeKey.readOnly && !keySaved);
    }

    // --- Step 1: Keypair management ---
    function renderKey() {
      if (!activeKey) {
        keySetup.hidden = false;
        keyActive.hidden = true;
        keyFpEl.textContent = '';
        keyLabelShow.textContent = '';
        keyPubInput.value = '';
        if (keyUnsavedTag) keyUnsavedTag.hidden = true;
        if (keyPubOnlyTag) keyPubOnlyTag.hidden = true;
        updateSaveNudge();
        return;
      }
      keySetup.hidden = true;
      keyActive.hidden = false;
      keyFpEl.textContent = activeKey.fingerprint;
      keyLabelShow.textContent = activeKey.label ? '— ' + activeKey.label : '';
      keyPubInput.value = activeKey.publicKey;
      var readOnly = !!activeKey.readOnly;
      if (saveKeyBtn) saveKeyBtn.hidden = readOnly;
      if (keyPubOnlyTag) keyPubOnlyTag.hidden = !readOnly;
      if (keyUnsavedTag) {
        keyUnsavedTag.hidden = readOnly || keySaved;
        keyUnsavedTag.textContent = activeKey.sample ? 'Sample key, for trying this page' : 'Private key not saved yet';
      }
      if (saveKeyBtn && activeKey.sample) saveKeyBtn.hidden = true;
      if (keySaveHint) {
        keySaveHint.textContent = activeKey.sample
          ? 'This is a sample key, for trying this page with made-up students. It cannot be saved and cannot be used for files you give to students. Press Clear key from tab, then make your own key.'
          : readOnly
          ? 'Public key only: you can attach this key to student files in step 2. Unlocking student QR codes in step 3 needs the lead teacher\'s private key file (.json).'
          : 'Save the private key file in your private teacher folder if you plan to scan results later or in a new tab. Closing this tab clears the key from memory.';
      }
      updateSaveNudge();
      flushPendingSealHandoff();
    }

    function flushPendingSealHandoff() {
      if (!pendingSealHandoff || !activeKey || activeKey.sample) return;
      var held = pendingSealHandoff;
      pendingSealHandoff = null;
      var bytes = held.bytes instanceof Uint8Array ? held.bytes : new Uint8Array(held.bytes || 0);
      var fakeFile = {
        name: held.name || 'starter-packs.zip',
        size: bytes.byteLength,
        arrayBuffer: function () { return Promise.resolve(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)); },
        text: function () { return Promise.resolve(decodeUtf8(bytes)); },
      };
      processPacketFiles([fakeFile]);
    }

    makeKeyBtn.addEventListener('click', function () {
      try {
        activeKey = Q.generateKeyPair(keyLabelInput ? keyLabelInput.value : '');
        activeKey.readOnly = false;
        keySaved = false;
        sealedWithUnsavedKey = false;
        publicKeyCopied = false;
        renderKey();
        setStatus(keyStatus, 'Created a new teacher key (Key ID ' + activeKey.fingerprint + '). Save the private key file if you will collect results later.', 'ok');
      } catch (err) {
        setStatus(keyStatus, (err && err.message) || 'Could not generate a teacher key in this browser.', 'warn');
      }
    });

    if (usePubOnlyBtn) {
      usePubOnlyBtn.addEventListener('click', function () {
        var parsed = Q.parsePublicKey(pubOnlyInput ? pubOnlyInput.value : '');
        if (!parsed) {
          setStatus(keyStatus, 'Enter a valid teacher public key starting with AFPK1.', 'warn');
          return;
        }
        stopCamera();
        activeKey = {
          kind: 'alloflow-packet-qr-public-key',
          version: 1,
          label: 'Public key only',
          createdAt: new Date().toISOString(),
          fingerprint: parsed.fingerprint,
          publicKey: parsed.publicKey,
          secretKey: '',
          readOnly: true,
        };
        keySaved = true;
        sealedWithUnsavedKey = false;
        if (pubOnlyFold) pubOnlyFold.open = false;
        renderKey();
        setStatus(keyStatus, 'Loaded public key only (Key ID ' + activeKey.fingerprint + '). You can now attach it to files in step 2.', 'ok');
      });
    }

    function triggerLoadKey() {
      loadKeyFile.value = '';
      loadKeyFile.click();
    }
    // True when dropping the key in this tab would leave results nobody can read: a private key that was never saved.
    function unsavedPrivateKey() {
      return !!(activeKey && !activeKey.readOnly && !activeKey.sample && !keySaved);
    }
    // The first press on "which" only warns; a second press within 20 seconds goes ahead.
    function confirmDrop(which, verb) {
      if (!unsavedPrivateKey() || dropArmed === which) {
        dropArmed = '';
        if (dropTimer) { root.clearTimeout(dropTimer); dropTimer = 0; }
        return true;
      }
      dropArmed = which;
      if (dropTimer) root.clearTimeout(dropTimer);
      dropTimer = root.setTimeout(function () { dropArmed = ''; dropTimer = 0; }, 20000);
      setStatus(keyStatus, 'This private key (Key ID ' + activeKey.fingerprint + ') has not been saved. Without it, nobody can read results from files made with it'
        + (publicKeyCopied ? ', including files a colleague makes with the public key you copied' : '') + '. Press Save private key (.json) first, or press ' + verb + ' again to go on without saving.', 'warn');
      return false;
    }
    loadKeyBtn.addEventListener('click', triggerLoadKey);
    loadKeyAgainBtn.addEventListener('click', function () { if (confirmDrop('load', 'Load another key')) triggerLoadKey(); });

    loadKeyFile.addEventListener('change', function () {
      var file = loadKeyFile.files && loadKeyFile.files[0];
      if (!file) return;
      readAsText(file).then(function (text) {
        var raw = text.trim();
        var parsedObj = null;
        if (raw.charAt(0) === '{') {
          try { parsedObj = JSON.parse(raw); } catch (_) { parsedObj = null; }
        }
        var sk = Q.parseSecretKey(parsedObj || raw);
        if (!sk) {
          setStatus(keyStatus, 'Could not read a valid AlloFlow teacher private key from ' + file.name + '.', 'warn');
          return;
        }
        activeKey = {
          kind: 'alloflow-packet-qr-key',
          version: 1,
          label: parsedObj && typeof parsedObj.label === 'string' ? parsedObj.label.slice(0, 80) : '',
          createdAt: parsedObj && typeof parsedObj.createdAt === 'string' ? parsedObj.createdAt : new Date().toISOString(),
          fingerprint: sk.fingerprint,
          publicKey: sk.publicKey,
          secretKey: sk.secretKey,
          readOnly: false,
        };
        keySaved = true;
        sealedWithUnsavedKey = false;
        publicKeyCopied = false;
        dropArmed = '';
        renderKey();
        setStatus(keyStatus, 'Loaded teacher key (Key ID ' + activeKey.fingerprint + ').', 'ok');
      }, function () {
        setStatus(keyStatus, 'Could not read the selected key file.', 'warn');
      });
    });

    copyPubBtn.addEventListener('click', function () {
      if (!activeKey) return;
      var fallback = function () {
        if (!activeKey.sample) publicKeyCopied = true;
        keyPubInput.focus();
        keyPubInput.select();
        setStatus(keyStatus, 'Public key selected. Press Ctrl+C (or Cmd+C) to copy.', '');
      };
      try {
        root.navigator.clipboard.writeText(activeKey.publicKey).then(function () {
          if (!activeKey.sample) publicKeyCopied = true;
          setStatus(keyStatus, 'Public key copied (Key ID ' + activeKey.fingerprint + ').' + (unsavedPrivateKey() ? ' Save the private key file too: it is the only way to read the results.' : ''), unsavedPrivateKey() ? 'warn' : 'ok');
        }, fallback);
      } catch (_) { fallback(); }
    });

    saveKeyBtn.addEventListener('click', function () {
      if (!activeKey || activeKey.readOnly) return;
      var slug = activeKey.label ? activeKey.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) : '';
      var filename = 'alloflow-qr-key__' + (slug ? slug + '__' : '') + activeKey.fingerprint + '.json';
      var payload = {
        kind: activeKey.kind,
        version: activeKey.version,
        label: activeKey.label,
        createdAt: activeKey.createdAt,
        fingerprint: activeKey.fingerprint,
        publicKey: activeKey.publicKey,
        secretKey: activeKey.secretKey,
      };
      downloadBlob(filename, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
      keySaved = true;
      sealedWithUnsavedKey = false;
      publicKeyCopied = false;
      dropArmed = '';
      renderKey();
      setStatus(keyStatus, 'Saved private key file ' + filename + '. Keep it in your private teacher folder.', 'ok');
    });

    clearKeyBtn.addEventListener('click', function () {
      if (!confirmDrop('clear', 'Clear key from tab')) return;
      stopCamera();
      activeKey = null;
      keySaved = false;
      sealedWithUnsavedKey = false;
      publicKeyCopied = false;
      if (demoPanel) demoPanel.hidden = true;
      renderKey();
      setStatus(keyStatus, 'Cleared the teacher key from this tab.', '');
    });

    // --- Live Sample Demo (Dr. Katie Novak / IT reviewer 1-click walkthrough) ---
    function makeSampleResults() {
      var day = new Date().toISOString().slice(0, 10);
      return [
        {
          kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2',
          sessionId: 'sample-qr-blueheron7',
          packet: { id: 'sample-math-doubles', version: day, engine: 'alloflow-packet/1', form: '', mode: 'practice' },
          lessonId: 'sample-math-doubles', revision: day, lessonTitle: 'Sample — Doubles Practice',
          activityTitles: { math_ccc: 'Math facts' },
          learner: 'BlueHeron7', learnerName: 'BlueHeron7',
          startedAt: day + 'T14:00:00Z', finishedAt: day + 'T14:01:45Z',
          startedLocal: day + 'T09:00:00-05:00', finishedLocal: day + 'T09:01:45-05:00',
          durationMs: 105000, activeMs: 92000,
          summary: { items: 4, done: 4, firstTry: 3, afterRetry: 1, missed: 0, practised: 0 },
          items: [
            { n: 1, itemId: 'd1', activity: 'math_ccc', word: '6 + 6', target: '12', responses: ['12'], attempts: 1, firstTry: true, correct: true, done: true, ms: 4200, supports: { textLarger: 1 } },
            { n: 2, itemId: 'd2', activity: 'math_ccc', word: '7 + 7', target: '14', responses: ['13', '14'], attempts: 2, firstTry: false, correct: true, done: true, ms: 9400, supports: {} },
            { n: 3, itemId: 'd3', activity: 'math_ccc', word: '8 + 8', target: '16', responses: ['16'], attempts: 1, firstTry: true, correct: true, done: true, ms: 4800, supports: {} },
            { n: 4, itemId: 'd4', activity: 'math_ccc', word: '9 + 9', target: '18', responses: ['18'], attempts: 1, firstTry: true, correct: true, done: true, ms: 5100, supports: {} },
          ],
        },
        {
          kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2',
          sessionId: 'sample-qr-oakleaf4',
          packet: { id: 'sample-math-doubles', version: day, engine: 'alloflow-packet/1', form: '', mode: 'practice' },
          lessonId: 'sample-math-doubles', revision: day, lessonTitle: 'Sample — Doubles Practice',
          activityTitles: { math_ccc: 'Math facts' },
          learner: 'OakLeaf4', learnerName: 'OakLeaf4',
          startedAt: day + 'T14:02:00Z', finishedAt: day + 'T14:04:10Z',
          startedLocal: day + 'T09:02:00-05:00', finishedLocal: day + 'T09:04:10-05:00',
          durationMs: 130000, activeMs: 115000,
          summary: { items: 4, done: 4, firstTry: 2, afterRetry: 1, missed: 1, practised: 0 },
          items: [
            { n: 1, itemId: 'd1', activity: 'math_ccc', word: '6 + 6', target: '12', responses: ['12'], attempts: 1, firstTry: true, correct: true, done: true, ms: 5000, supports: {} },
            { n: 2, itemId: 'd2', activity: 'math_ccc', word: '7 + 7', target: '14', responses: ['15', '14'], attempts: 2, firstTry: false, correct: true, done: true, ms: 11200, supports: {} },
            { n: 3, itemId: 'd3', activity: 'math_ccc', word: '8 + 8', target: '16', responses: ['14', '15', '17'], attempts: 3, firstTry: false, correct: false, done: true, ms: 15400, supports: {} },
            { n: 4, itemId: 'd4', activity: 'math_ccc', word: '9 + 9', target: '18', responses: ['18'], attempts: 1, firstTry: true, correct: true, done: true, ms: 5600, supports: {} },
          ],
        },
        {
          kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2',
          sessionId: 'sample-qr-riverstone2',
          packet: { id: 'sample-chk-add', version: day, engine: 'alloflow-packet/1', form: 'A', mode: 'check' },
          lessonId: 'sample-chk-add', revision: day, lessonTitle: 'Sample — Addition Check',
          activityTitles: { math_computation: 'Math computation' },
          learner: 'RiverStone2', learnerName: 'RiverStone2',
          startedAt: day + 'T14:05:00Z', finishedAt: day + 'T14:07:00Z',
          startedLocal: day + 'T09:05:00-05:00', finishedLocal: day + 'T09:07:00-05:00',
          durationMs: 120000, activeMs: 120000,
          summary: { items: 3, done: 3, firstTry: 2, afterRetry: 0, missed: 1, practised: 0 },
          items: [
            { n: 1, itemId: 'c1', activity: 'math_computation', word: '14 + 5', target: '19', responses: ['19'], attempts: 1, firstTry: true, correct: true, done: true, ms: 4200, digitsCorrect: 2, digitsPossible: 2, supports: {} },
            { n: 2, itemId: 'c2', activity: 'math_computation', word: '27 + 8', target: '35', responses: ['34'], attempts: 1, firstTry: false, correct: false, done: true, ms: 6900, digitsCorrect: 1, digitsPossible: 2, supports: {} },
            { n: 3, itemId: 'c3', activity: 'math_computation', word: '16 + 7', target: '23', responses: ['23'], attempts: 1, firstTry: true, correct: true, done: true, ms: 5500, digitsCorrect: 2, digitsPossible: 2, supports: {} },
          ],
          score: { measure: 'math_computation', score: 15, scoreUnit: 'digits_correct_per_minute', digitsCorrect: 5, digitsPossible: 6, itemsCorrect: 2, itemsAttempted: 3, timeLimitS: 120, elapsedS: 120, hiddenS: 0, pausedS: 0, pauses: 0, directionsHeard: 0, completion: 'time', prorated: false, noScoreReason: '', scoringVersion: 3, formVersion: 2, attempt: 1, flags: [], tools: [] },
        },
      ];
    }

    if (demoStartBtn) {
      demoStartBtn.addEventListener('click', function () {
        if (!activeKey || activeKey.readOnly) {
          activeKey = Q.generateKeyPair('Sample (made-up students)');
          activeKey.readOnly = false;
          // 2026-11-23: a sample key is never saved, so it must never seal a file for a student (step 2 refuses it).
          activeKey.sample = true;
          keySaved = false;
          sealedWithUnsavedKey = false;
          renderKey();
          setStatus(keyStatus, 'Made a sample key for trying this page (Key ID ' + activeKey.fingerprint + '). It cannot be used for files you give to students.', 'ok');
        }
        var samples = makeSampleResults();
        demoCodes = samples.map(function (r) { return Q.sealResult(r, activeKey.publicKey).code; });
        clearNode(demoQrSlot);
        demoQrSlot.appendChild(Q.qrImgEl(doc, demoCodes[0], 'Sample sealed QR code for BlueHeron7 (Key ID ' + activeKey.fingerprint + ')'));
        if (demoQrCaption) demoQrCaption.textContent = 'BlueHeron7 — Key ID ' + activeKey.fingerprint + ' (' + demoCodes[0].length + ' chars)';
        demoPanel.hidden = false;
        announce('Sample sealed QR ready for Key ID ' + activeKey.fingerprint + '.');
      });
    }
    if (demoCloseBtn) {
      demoCloseBtn.addEventListener('click', function () { demoPanel.hidden = true; });
    }
    if (demoUnlockBtn) {
      demoUnlockBtn.addEventListener('click', function () {
        if (!demoCodes.length) return;
        ingestText(demoCodes.join('\n'), false);
      });
    }
    if (demoWrongBtn) {
      demoWrongBtn.addEventListener('click', function () {
        var other = Q.generateKeyPair('Another Teacher');
        var wrongSealed = Q.sealResult(makeSampleResults()[0], other.publicKey).code;
        ingestText(wrongSealed, false);
      });
    }
    if (demoTamperBtn) {
      demoTamperBtn.addEventListener('click', function () {
        if (!demoCodes.length) return;
        var orig = demoCodes[0];
        var at = Math.max(stPrefixLen(orig), orig.length - 5);
        var ch = orig.charAt(at);
        var flipped = orig.slice(0, at) + (ch === 'A' ? 'B' : 'A') + orig.slice(at + 1);
        ingestText(flipped, false);
      });
    }
    function stPrefixLen(code) { return code.indexOf(':') + 1; }

    // --- Step 2: Seal packets with active public key ---
    function sealedNameFor(origName) {
      var clean = String(origName || 'packet.html').split(/[\\/]/).pop() || 'packet.html';
      if (/\.html?$/i.test(clean)) return clean.replace(/(__qr)?\.html?$/i, '__qr.html');
      return clean + '__qr.html';
    }

    function renderSealedList(entries) {
      clearNode(sealList);
      sealedBatch = entries.filter(function (e) { return e.ok; });
      if (!entries.length) {
        sealResults.hidden = true;
        return;
      }
      entries.forEach(function (entry) {
        var right = entry.ok
          ? makeEl('span', { text: 'Sealed for Key ID ' + entry.fingerprint + (entry.stationMode ? ' \u00b7 Station mode' : '') })
          : makeEl('span', { class: 'qr-seal-err', text: entry.message || 'Could not seal file.' });
        sealList.appendChild(makeEl('li', {}, [
          makeEl('strong', { text: entry.name }),
          right,
        ]));
      });
      sealResults.hidden = false;
      sealDownloadBtn.hidden = sealedBatch.length === 0;
      sealDownloadBtn.textContent = sealedBatch.length === 1
        ? 'Download sealed file (.html)'
        : 'Download ' + sealedBatch.length + ' sealed files (.zip)';
    }

    function processPacketFiles(fileList) {
      var files = Array.prototype.slice.call(fileList || []);
      if (!files.length) return;
      if (!activeKey) {
        setStatus(sealStatus, 'Make or load a teacher key in step 1 first.', 'warn');
        if (makeKeyBtn) makeKeyBtn.focus();
        return;
      }
      if (activeKey.sample) {
        setStatus(sealStatus, 'The sample key is only for trying this page: it is never saved, so results from files made with it could not be read later. In step 1 press Clear key from tab, then make your own key.', 'warn');
        if (clearKeyBtn) clearKeyBtn.focus();
        return;
      }
      var attachOpts = sealStationChk && sealStationChk.checked ? { stationMode: true } : undefined;
      var tasks = files.map(function (file) {
        var name = String(file.name || 'packet.html');
        if (/\.zip$/i.test(name)) {
          return readAsBuffer(file).then(function (buf) {
            return unpackZipUniversal(new Uint8Array(buf)).then(function (unpacked) {
              if (!unpacked.ok || !unpacked.entries.length) {
                return [{ ok: false, name: name, message: 'No practice file or check (.html) was found inside this .zip.' }];
              }
              return unpacked.entries.map(function (u) {
                if (!u.ok) {
                  return { ok: false, name: u.name, message: u.error === 'no_deflate' ? 'This browser cannot unpack compressed .zip files. Unzip the folder and drop the .html files directly.' : 'Could not unpack this entry from the .zip.' };
                }
                var res = TH.attachQrKey(decodeUtf8(u.bytes), activeKey.publicKey, attachOpts);
                return res.ok
                  ? { ok: true, name: sealedNameFor(u.name), html: res.html, title: res.title, fingerprint: res.fingerprint, stationMode: !!res.stationMode }
                  : { ok: false, name: u.name, message: res.message || 'Not an AlloFlow practice file or check.' };
              });
            });
          }, function () {
            return [{ ok: false, name: name, message: 'Could not read this .zip file.' }];
          });
        }
        return readAsText(file).then(function (text) {
          var res = TH.attachQrKey(text, activeKey.publicKey, attachOpts);
          return [res.ok
            ? { ok: true, name: sealedNameFor(name), html: res.html, title: res.title, fingerprint: res.fingerprint, stationMode: !!res.stationMode }
            : { ok: false, name: name, message: res.message || 'Not an AlloFlow practice file or check.' }];
        }, function () {
          return [{ ok: false, name: name, message: 'Could not read this file.' }];
        });
      });

      Promise.all(tasks).then(function (groups) {
        var all = [];
        groups.forEach(function (g) { all = all.concat(g); });
        renderSealedList(all);
        var okCount = all.filter(function (e) { return e.ok; }).length;
        var errCount = all.length - okCount;
        if (okCount && activeKey && !activeKey.readOnly && !keySaved) {
          sealedWithUnsavedKey = true;
          updateSaveNudge();
        }
        if (okCount && !errCount) {
          setStatus(sealStatus, 'Attached your key to ' + okCount + (okCount === 1 ? ' file' : ' files') + ' (Key ID ' + activeKey.fingerprint + '). Ready to download.', 'ok');
        } else if (okCount && errCount) {
          setStatus(sealStatus, 'Attached your key to ' + okCount + ' file' + (okCount === 1 ? '' : 's') + '; ' + errCount + ' could not be used. See the list below.', 'warn');
        } else {
          setStatus(sealStatus, 'None of these files could be used. See the list below.', 'warn');
        }
      });
    }

    sealChooseBtn.addEventListener('click', function () {
      sealFilesInput.value = '';
      sealFilesInput.click();
    });
    sealFilesInput.addEventListener('change', function () {
      processPacketFiles(sealFilesInput.files);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      sealDrop.addEventListener(ev, function (e) { e.preventDefault(); sealDrop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      sealDrop.addEventListener(ev, function (e) {
        e.preventDefault();
        sealDrop.classList.remove('is-over');
        if (ev === 'drop' && e.dataTransfer && e.dataTransfer.files) processPacketFiles(e.dataTransfer.files);
      });
    });

    sealDownloadBtn.addEventListener('click', function () {
      if (!sealedBatch.length) return;
      if (sealedBatch.length === 1) {
        downloadBlob(sealedBatch[0].name, sealedBatch[0].html, 'text/html;charset=utf-8');
        setStatus(sealStatus, 'Downloaded ' + sealedBatch[0].name + '.', 'ok');
        return;
      }
      var zip = ZIP.create();
      sealedBatch.forEach(function (entry) { zip.add(entry.name, entry.html); });
      var fp = activeKey ? activeKey.fingerprint : sealedBatch[0].fingerprint;
      var zipName = 'sealed-packets__' + fp + '.zip';
      downloadBlob(zipName, zip.finish(), 'application/zip');
      setStatus(sealStatus, 'Downloaded ' + zipName + ' (' + sealedBatch.length + ' files).', 'ok');
    });

    sealClearBtn.addEventListener('click', function () {
      pendingSealHandoff = null;
      sealedBatch = [];
      clearNode(sealList);
      sealResults.hidden = true;
      setStatus(sealStatus, '', '');
    });

    // --- Step 3: Collect, unlock and export student results ---
    function formatDuration(ms) {
      var secs = Math.max(0, Math.round((Number(ms) || 0) / 1000));
      if (secs < 60) return secs + ' s';
      var m = Math.floor(secs / 60), s = secs % 60;
      return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    }

    function readAlongStatsOf(res) {
      var items = Array.isArray(res && res.items) ? res.items : [];
      if (!items.length || !items.every(function (it) { return it && it.activity === 'read_along'; })) return null;
      var read = 0, played = 0, answers = [];
      items.forEach(function (it, idx) {
        var pageNo = Number(it.n) > 0 ? Number(it.n) : (idx + 1);
        var resp = Array.isArray(it.responses) ? it.responses : [];
        var how = it.practice === 'played' || resp[0] === 'played' ? 'played' : 'read';
        if (how === 'played') played++;
        else read++;
        resp.forEach(function (entry) {
          var s = String(entry || '').trim();
          if (!s || s === 'read' || s === 'played') return;
          answers.push({ page: pageNo, text: s });
        });
      });
      return { pages: items.length, read: read, played: played, answers: answers };
    }

    function summarizeResult(res) {
      var isCheck = res.packet && res.packet.mode === 'check';
      if (isCheck && res.score) {
        var sc = res.score;
        if (sc.score != null) {
          var unit = sc.scoreUnit === 'digits_correct_per_minute' ? 'digits/min' : sc.scoreUnit === 'items_correct' ? 'items correct' : (sc.scoreUnit || '');
          return sc.score + (unit ? ' ' + unit : '') + ' (' + sc.itemsCorrect + '/' + sc.itemsAttempted + ')';
        }
        return sc.itemsCorrect + '/' + sc.itemsAttempted + ' attempted (no score)';
      }
      var ra = readAlongStatsOf(res);
      if (ra) {
        var raParts = [];
        if (ra.read) raParts.push(ra.read + ' read');
        if (ra.played) raParts.push(ra.played + ' played');
        var raLine = ra.pages + (ra.pages === 1 ? ' page' : ' pages') + (raParts.length ? ' (' + raParts.join(', ') + ')' : '');
        if (ra.answers.length) raLine += ' · ' + ra.answers.length + (ra.answers.length === 1 ? ' answer' : ' answers');
        return raLine;
      }
      var sum = res.summary || {};
      if (sum.items > 0) {
        var line = sum.firstTry + ' of ' + sum.items + ' first try';
        if (sum.afterRetry > 0) line += ', ' + sum.afterRetry + ' retried';
        if (sum.missed > 0) line += ', ' + sum.missed + ' missed';
        return line;
      }
      if (sum.practised > 0) return sum.practised + ' practiced';
      return 'Done';
    }

    function focusItemsOf(res) {
      var items = Array.isArray(res.items) ? res.items : [];
      return items.filter(function (it) {
        if (!it || it.practice) return false;
        if (res.packet && res.packet.mode === 'check') return it.attempts > 0 && (!it.correct || it.flag === 'skipped');
        return it.done && (!it.correct || !it.firstTry);
      });
    }

    function focusSummary(res) {
      var ra = readAlongStatsOf(res);
      if (ra) {
        return ra.answers.length
          ? ra.answers.length + (ra.answers.length === 1 ? ' reading answer' : ' reading answers')
          : 'None';
      }
      var focus = focusItemsOf(res);
      if (!focus.length) return 'None';
      var shown = focus.slice(0, 6).map(function (it) {
        var label = it.word || ('#' + it.n);
        return (!it.correct ? label + ' (missed)' : label + ' (retry)');
      });
      if (focus.length > 6) shown.push('+' + (focus.length - 6) + ' more');
      return shown.join(', ');
    }

    function detailLinesOf(res) {
      var lines = [];
      var ra = readAlongStatsOf(res);
      if (ra && ra.answers.length) {
        ra.answers.forEach(function (a) {
          lines.push('Page ' + a.page + ' — ' + a.text);
        });
      }
      focusItemsOf(res).forEach(function (it) {
        var label = it.word || ('#' + it.n);
        var kind = !it.correct ? 'Missed' : 'Retry';
        var got = (it.responses || []).filter(Boolean).join(', ');
        var detail = kind + ': ' + label;
        if (got) detail += ' — answered ' + got;
        if (it.target != null && String(it.target) !== '') detail += ' (expected ' + it.target + ')';
        lines.push(detail);
      });
      var sup = res.qrSupports && typeof res.qrSupports === 'object' ? Object.keys(res.qrSupports) : [];
      if (sup.length) lines.push('Supports used: ' + sup.map(function (k) { return k + ' (' + res.qrSupports[k] + ')'; }).join(', '));
      if (res.score && Array.isArray(res.score.flags) && res.score.flags.length) {
        lines.push('Check flags: ' + res.score.flags.join(', '));
      }
      return lines;
    }

    function dedupeIdFor(res) {
      if (res.sessionId) return 'sid:' + res.sessionId;
      var s = res.summary || {};
      return [res.lessonId, res.learnerName || res.learner, res.finishedAt, s.items, s.firstTry, s.missed].join('|');
    }

    // What the code left out to fit, as one sentence, or '' when nothing was (packets_qr_crypto.js compactResult).
    function leftOutLine(res) {
      var lo = res && res.qrLeftOut;
      if (!lo || !lo.level) return '';
      var parts = ['the time on each question'];
      if (lo.noWording > 0) {
        parts.push(lo.missedNoWording > 0
          ? 'the words of ' + lo.noWording + ' question' + (lo.noWording === 1 ? '' : 's') + ' (' + lo.missedNoWording + ' of them missed or tried again)'
          : 'the words of ' + lo.noWording + ' question' + (lo.noWording === 1 ? '' : 's') + ' answered right the first time');
      }
      if (lo.helpsAsTotals) parts.push('which question each help was used on');
      return 'Every question is counted. Left out to fit in one code: ' + parts.join('; ') + '. The student\'s saved results file has all of it.';
    }
    // The results file this page writes for one unlocked code: the rows the student's own file would have, rebuilt
    // from the code, with a check value over those rows. The summary row (outside the check value) says where the
    // file came from and how much was left out, so Add up results can say so and prefer the student's own file.
    function buildCsvEntry(res) {
      var tbl = TH.resultsCsv(res);
      var dig = TH.sha256 ? TH.sha256(tbl.basis) : null;
      var integrity = dig ? { method: 'sha256', value: dig.hex } : null;
      res.integrity = integrity;
      var level = res.qrLeftOut && res.qrLeftOut.level ? res.qrLeftOut.level : 0;
      var lines = tbl.text(integrity).split('\r\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('"#summary",') === 0) { lines[i] += ',"source=sealed_qr","qr_left_out=' + level + '"'; break; }
      }
      return {
        csvName: tbl.stem + '.csv',
        csvText: lines.join('\r\n'),
      };
    }

    function renderCollected() {
      clearNode(collectedBody);
      if (!collected.length) {
        collectedWrap.hidden = true;
        collectedCount.textContent = '';
        return;
      }
      collectedWrap.hidden = false;
      var checks = collected.filter(function (c) { return c.result.packet && c.result.packet.mode === 'check'; }).length;
      var practices = collected.length - checks;
      var mix = [];
      if (practices) mix.push(practices + ' Practice');
      if (checks) mix.push(checks + (checks === 1 ? ' Check' : ' Checks'));
      var last = collected[collected.length - 1].result;
      collectedCount.textContent = collected.length + ' collected' + (mix.length ? ' · ' + mix.join(', ') : '') + ' · Last added: ' + (last.learnerName || last.learner || '(No name)');

      collected.forEach(function (row, idx) {
        var res = row.result;
        var isCheck = res.packet && res.packet.mode === 'check';
        var packetCell = makeEl('td', {}, [
          makeEl('span', { text: res.lessonTitle || res.lessonId || 'File' }),
          row.truncated ? makeEl('div', {}, [makeEl('span', { class: 'qr-trim-tag', text: 'Some details did not fit' })]) : null,
        ]);
        var detailLines = detailLinesOf(res);
        if (leftOutLine(res)) detailLines.push(leftOutLine(res));
        var focusCell = makeEl('td', {}, [
          makeEl('span', { text: focusSummary(res) }),
          detailLines.length ? makeEl('details', { class: 'qr-row-details' }, [
            makeEl('summary', { text: 'Details (' + detailLines.length + ')' }),
            makeEl('ul', { class: 'qr-row-detail-list' }, detailLines.map(function (ln) { return makeEl('li', { text: ln }); })),
          ]) : null,
        ]);
        var csvBtn = makeEl('button', {
          type: 'button',
          class: 'btn btn-small',
          'data-csv-row': String(idx),
          on: { click: function () {
            downloadBlob(row.csvName, row.csvText, 'text/csv;charset=utf-8');
            setStatus(collectStatus, 'Downloaded ' + row.csvName + '.', 'ok');
          } },
          text: 'CSV',
        });
        var removeBtn = makeEl('button', {
          type: 'button',
          class: 'btn btn-small',
          'data-remove-row': String(idx),
          on: { click: function () {
            collected.splice(idx, 1);
            renderCollected();
            setStatus(collectStatus, 'Removed result for ' + (res.learnerName || 'student') + '.', '');
          } },
          text: 'Remove',
        });
        var timeMs = isCheck && res.score ? (Number(res.score.elapsedS) || 0) * 1000 : (Number(res.activeMs) || Number(res.durationMs) || 0);
        collectedBody.appendChild(makeEl('tr', { 'data-collected-row': row.id }, [
          makeEl('td', { text: res.learnerName || res.learner || '(No name)' }),
          packetCell,
          makeEl('td', { text: isCheck ? 'Check' : 'Practice' }),
          makeEl('td', { text: summarizeResult(res) }),
          focusCell,
          makeEl('td', { text: formatDuration(timeMs) }),
          makeEl('td', {}, [makeEl('div', { class: 'qr-row-actions' }, [csvBtn, removeBtn])]),
        ]));
      });
    }

    // Each code found in pasted text, as the forms to try in turn: first with the white space inside it taken out (a
    // code wrapped over several lines), then as far as its first white space (a code followed by other words).
    function extractCodes(rawText) {
      var text = String(rawText || '').trim();
      if (!text) return [];
      var parts = text.split(/(?=AFQR1:)/i).filter(function (part) { return /^AFQR1:/i.test(part); });
      if (!parts.length) return [[text]];
      return parts.map(function (part) {
        var joined = /^AFQR1:[A-Za-z2-7=\-]+/i.exec(part.replace(/\s+/g, ''));
        var first = /^AFQR1:[A-Za-z2-7=\-]+/i.exec(part);
        var forms = [];
        if (joined) forms.push(joined[0]);
        if (first && forms.indexOf(first[0]) < 0) forms.push(first[0]);
        return forms.length ? forms : [part];
      });
    }

    function ingestText(rawText, fromCamera) {
      if (!activeKey) {
        setStatus(collectStatus, 'Load your matching teacher private key in Step 1 before unlocking student QR codes.', 'warn');
        return { added: 0, duplicates: 0, errors: 1 };
      }
      if (activeKey.readOnly || !activeKey.secretKey) {
        setStatus(collectStatus, 'Public key only is loaded (Key ID ' + activeKey.fingerprint + '). Load the matching private key file (.json) in Step 1 to unlock student QR codes.', 'warn');
        return { added: 0, duplicates: 0, errors: 1 };
      }
      var tokens = extractCodes(rawText);
      if (!tokens.length) {
        setStatus(collectStatus, 'Paste a sealed code starting with AFQR1: first.', 'warn');
        return { added: 0, duplicates: 0, errors: 0 };
      }
      var added = 0, duplicates = 0, lastAdded = null, firstError = '';
      tokens.forEach(function (forms) {
        var unlocked = null;
        for (var f = 0; f < forms.length; f++) {
          unlocked = Q.unsealResult(forms[f], activeKey.secretKey);
          if (unlocked.ok || unlocked.reason === 'wrong_key' || unlocked.reason === 'old_condensed') break;
        }
        if (!unlocked.ok) {
          if (!firstError) {
            if (unlocked.reason === 'wrong_key') {
              firstError = 'Wrong teacher key: this QR was sealed for Key ID ' + unlocked.expectedFingerprint + ', but your active key is ' + activeKey.fingerprint + '. Load the matching private key file in Step 1.';
            } else if (unlocked.reason === 'tampered') {
              firstError = 'Could not unlock this code: it was changed or cut short. Ask the student to show the QR code again.';
            } else if (unlocked.reason === 'old_condensed') {
              firstError = 'This code comes from a file made before 23 November 2026, and it does not hold every question, so no right score can be counted from it. Ask the student for the saved results file, or attach your key to the file again and give out the new copy.';
            } else if (unlocked.reason === 'version') {
              firstError = 'This code was made by a newer version of AlloFlow than this page. Load this page again to get the newest version.';
            } else {
              firstError = 'This is not an AlloFlow sealed QR code (expected text starting with AFQR1:).';
            }
          }
          return;
        }
        var res = unlocked.result;
        var id = dedupeIdFor(res);
        var exists = collected.some(function (c) { return c.id === id; });
        if (exists) { duplicates++; return; }
        var csv = buildCsvEntry(res);
        collected.push({ id: id, result: res, truncated: !!unlocked.truncated, csvName: csv.csvName, csvText: csv.csvText });
        resultsExported = false;
        added++;
        lastAdded = res;
      });
      renderCollected();
      if (added > 0 && fromCamera && lastAdded) {
        playScanChime();
        showCamToast('Scanned: ' + (lastAdded.learnerName || 'student') + ' — ' + summarizeResult(lastAdded) + ' (' + collected.length + ' collected)');
      }
      if (added === 1 && !firstError && !duplicates && lastAdded) {
        setStatus(collectStatus, 'Added ' + (lastAdded.learnerName || 'student') + ' — ' + (lastAdded.lessonTitle || 'File') + ' (' + summarizeResult(lastAdded) + ').', 'ok');
      } else if (added > 0 && !firstError) {
        setStatus(collectStatus, 'Added ' + added + ' student result' + (added === 1 ? '' : 's') + (duplicates ? ' (' + duplicates + ' duplicate skipped).' : '.'), 'ok');
      } else if (firstError) {
        setStatus(collectStatus, (added ? 'Added ' + added + ', but one code failed: ' : '') + firstError, 'warn');
      } else if (duplicates > 0) {
        setStatus(collectStatus, 'Already collected (' + duplicates + ' duplicate skipped).', '');
      }
      return { added: added, duplicates: duplicates, errors: firstError ? 1 : 0 };
    }

    codeAddBtn.addEventListener('click', function () {
      var stats = ingestText(codeInput.value, false);
      if (stats.added > 0 && !stats.errors) codeInput.value = '';
    });
    codeClearBtn.addEventListener('click', function () {
      codeInput.value = '';
      codeInput.focus();
    });

    // --- Camera and QR photo scanning (optional, nothing is sent) ---
    // 2026-11-23: the browser's own QR reader (BarcodeDetector) where it has one; otherwise jsQR (vendor/jsqr-1.4.0.js,
    // Apache-2.0, loaded from this site), which reads the picture inside this tab. Chrome and Edge on Windows, Safari on
    // an iPad or iPhone, and Firefox have no reader of their own, so without jsQR they could only paste codes.
    var hasNative = typeof root.BarcodeDetector === 'function';
    var hasJsQr = typeof root.jsQR === 'function';
    var canRead = hasNative || hasJsQr;
    var hasCamera = !!(root.navigator && root.navigator.mediaDevices && typeof root.navigator.mediaDevices.getUserMedia === 'function');
    var scanCanvas = null;

    // The pixels of a video frame, an image or a bitmap, at most maxSide on its long side.
    function pixelsOf(src, w, h, maxSide) {
      if (!(w > 0) || !(h > 0)) return null;
      var k = Math.min(1, maxSide / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
      if (!scanCanvas) scanCanvas = doc.createElement('canvas');
      scanCanvas.width = cw;
      scanCanvas.height = ch;
      var g = scanCanvas.getContext('2d', { willReadFrequently: true });
      if (!g) return null;
      g.drawImage(src, 0, 0, cw, ch);
      return g.getImageData(0, 0, cw, ch);
    }
    function readWithJsQr(src, w, h, fromPhoto) {
      if (!hasJsQr) return [];
      try {
        var px = pixelsOf(src, w, h, fromPhoto ? 2000 : 1280);
        if (!px) return [];
        // A photo may be dark on light or light on dark; a camera frame of a screen is dark on light.
        var got = root.jsQR(px.data, px.width, px.height, { inversionAttempts: fromPhoto ? 'attemptBoth' : 'dontInvert' });
        return got && got.data ? [String(got.data)] : [];
      } catch (_) { return []; }
    }
    // The text of each QR code found in src, as a promise of a list (empty when none is found).
    function readCodes(src, w, h, fromPhoto) {
      if (hasNative) {
        try {
          if (!camDetector) camDetector = new root.BarcodeDetector({ formats: ['qr_code'] });
          return camDetector.detect(src).then(function (codes) {
            var found = (codes || []).map(function (c) { return String(c.rawValue || ''); }).filter(Boolean);
            return found.length || !hasJsQr ? found : readWithJsQr(src, w, h, fromPhoto);
          }, function () { return readWithJsQr(src, w, h, fromPhoto); });
        } catch (_) { /* a reader that will not start: jsQR below */ }
      }
      return Promise.resolve(readWithJsQr(src, w, h, fromPhoto));
    }

    function initScannerUi() {
      if (!canRead) {
        camToggleBtn.disabled = true;
        qrImgBtn.disabled = true;
        camHint.textContent = 'The part of this page that reads QR codes did not load, so the two buttons here are off. Load the page again, or use Paste sealed code.';
        return;
      }
      if (!hasCamera) {
        camToggleBtn.disabled = true;
        camHint.textContent = 'No camera was found on this device. Use Scan QR photo or Paste sealed code.';
      }
    }
    initScannerUi();

    function stopCamera() {
      camGen++;
      camStarting = false;
      if (camTimer) { root.clearInterval(camTimer); camTimer = null; }
      if (camToastTimer) { root.clearTimeout(camToastTimer); camToastTimer = null; }
      if (camStream) {
        try { camStream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
        camStream = null;
      }
      if (camVideo) {
        try { camVideo.pause(); camVideo.srcObject = null; } catch (_) {}
      }
      if (camBox) camBox.hidden = true;
      if (camToast) camToast.hidden = true;
      if (camToggleBtn) camToggleBtn.textContent = 'Start camera';
    }

    camToggleBtn.addEventListener('click', function () {
      if (camStream || camStarting) {
        stopCamera();
        setStatus(collectStatus, 'Camera stopped.', '');
        return;
      }
      if (!activeKey || activeKey.readOnly) {
        setStatus(collectStatus, 'Make or load your teacher key in step 1 before scanning.', 'warn');
        return;
      }
      if (!canRead || !hasCamera) return;
      var gen = ++camGen;
      camStarting = true;
      camToggleBtn.textContent = 'Stop camera';
      setStatus(collectStatus, 'Starting camera...', '');
      root.navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }).then(function (stream) {
        if (gen !== camGen || doc.hidden) {
          try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (_) {}
          if (gen === camGen) stopCamera();
          return;
        }
        camStarting = false;
        camStream = stream;
        camVideo.srcObject = stream;
        camBox.hidden = false;
        camToggleBtn.textContent = 'Stop camera';
        var playPromise = camVideo.play();
        if (playPromise && typeof playPromise.catch === 'function') playPromise.catch(function () {});
        var busy = false;
        camTimer = root.setInterval(function () {
          if (busy || !camStream || camVideo.readyState < 2) return;
          busy = true;
          readCodes(camVideo, camVideo.videoWidth, camVideo.videoHeight, false).then(function (codes) {
            busy = false;
            for (var i = 0; i < codes.length; i++) {
              var val = String(codes[i] || '').trim();
              if (!val) continue;
              var now = Date.now();
              if (val === lastCamCode && now - lastCamAt < 3500) continue;
              lastCamCode = val;
              lastCamAt = now;
              ingestText(val, true);
            }
          }, function () { busy = false; });
        }, 250);
        setStatus(collectStatus, 'Camera started. Hold a student\'s sealed QR code in front of the lens.', '');
      }, function () {
        if (gen !== camGen) return;
        stopCamera();
        setStatus(collectStatus, 'Could not start the camera. Check browser camera permission, or use Scan QR photo or Paste sealed code.', 'warn');
      });
    });

    qrImgBtn.addEventListener('click', function () {
      if (!activeKey || activeKey.readOnly) {
        setStatus(collectStatus, 'Make or load your teacher key in step 1 before scanning a QR photo.', 'warn');
        return;
      }
      qrImgFile.value = '';
      qrImgFile.click();
    });

    qrImgFile.addEventListener('change', function () {
      var files = Array.prototype.slice.call(qrImgFile.files || []);
      if (!files.length || !canRead) return;
      var scans = files.map(function (file) {
        var getSource = typeof root.createImageBitmap === 'function'
          ? root.createImageBitmap(file)
          : new Promise(function (resolve, reject) {
              var fr = new root.FileReader();
              fr.onload = function () {
                var img = new root.Image();
                img.onload = function () { resolve(img); };
                img.onerror = reject;
                img.src = fr.result;
              };
              fr.onerror = reject;
              fr.readAsDataURL(file);
            });
        return getSource.then(function (src) {
          var w = src.naturalWidth || src.width, h = src.naturalHeight || src.height;
          return readCodes(src, w, h, true).then(function (codes) {
            if (src && typeof src.close === 'function') src.close();
            return codes;
          });
        }, function () { return []; });
      });
      Promise.all(scans).then(function (groups) {
        var found = [];
        groups.forEach(function (g) { found = found.concat(g); });
        if (!found.length) {
          setStatus(collectStatus, 'No QR code was found in the chosen picture. Try a clearer photo in which the code fills more of the picture, or paste the code that starts with AFQR1:.', 'warn');
          return;
        }
        ingestText(found.join('\n'), false);
      });
    });

    root.addEventListener('pagehide', stopCamera);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) stopCamera(); });
    root.addEventListener('beforeunload', function (e) {
      if (sealedWithUnsavedKey || (publicKeyCopied && unsavedPrivateKey()) || (collected.length > 0 && !resultsExported)) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // --- Export collected results as .zip or hand off to packets-results.html ---
    function buildResultsZipParts() {
      var zip = ZIP.create();
      collected.forEach(function (row) { zip.add(row.csvName, row.csvText); });
      return zip.finish();
    }

    downloadZipBtn.addEventListener('click', function () {
      if (!collected.length) return;
      var today = new Date().toISOString().slice(0, 10);
      var name = 'sealed-qr-results__' + today + '.zip';
      downloadBlob(name, buildResultsZipParts(), 'application/zip');
      resultsExported = true;
      setStatus(collectStatus, 'Downloaded ' + name + ' (' + collected.length + ' CSV file' + (collected.length === 1 ? '' : 's') + ').', 'ok');
    });

    openResultsBtn.addEventListener('click', function () {
      if (!collected.length) return;
      if (!HANDOFF || typeof HANDOFF.redirect !== 'function') {
        setStatus(collectStatus, 'Direct handoff is unavailable here. Press Download results (.zip) and drop it on Add up results.', 'warn');
        return;
      }
      var bytes = concatUint8(buildResultsZipParts());
      resultsExported = true;
      HANDOFF.redirect({ name: 'sealed-qr-results.zip', bytes: bytes.buffer }, 'packets-results.html', '#import-results').catch(function () {
        resultsExported = false;
        setStatus(collectStatus, 'This browser blocked temporary tab handoff. Press Download results (.zip) and drop it on Add up results.', 'warn');
      });
    });

    clearCollectedBtn.addEventListener('click', function () {
      collected = [];
      resultsExported = false;
      renderCollected();
      setStatus(collectStatus, 'Cleared collected results from this tab.', '');
    });

    if (root.location && root.location.hash === '#seal-batch' && HANDOFF && typeof HANDOFF.take === 'function') {
      try {
        if (root.history && typeof root.history.replaceState === 'function') {
          root.history.replaceState(null, '', root.location.pathname + root.location.search);
        }
      } catch (_) {}
      HANDOFF.take().then(function (item) {
        if (!item || !item.bytes) return;
        pendingSealHandoff = {
          name: String(item.name || 'starter-packs.zip').slice(0, 160),
          bytes: item.bytes,
        };
        if (activeKey && !activeKey.sample) {
          flushPendingSealHandoff();
        } else {
          setStatus(sealStatus, 'Received ' + pendingSealHandoff.name + ' ready for your class key. Make or load a teacher key in step 1 to attach your key automatically.', 'ok');
        }
      }).catch(function () {});
    }
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
