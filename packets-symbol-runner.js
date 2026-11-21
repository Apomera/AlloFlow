// Interactive wiring for packets-symbol-runner.html. Runs locally in browser without AI or server calls.
// 2026-11-17: the shared maker layout (three steps, "The file is ready", Try it then Save the file, "Saved. What to do next",
// "Make one for each student" in its own fold). The microphone is off: the live round never starts the browser's speech
// recognition (enableVoice: false), because in Chrome and Edge it sends the child's voice to Google or Microsoft.
(function (root) {
  'use strict';

  var doc = root.document;
  if (!doc) return;

  var STORAGE_KEY = 'alloflow-packets-symbol-runner-v1';
  var runnerCore = root.AlloSymbolRunnerCore;
  var builder = root.AlloPacketSymbolRunner;
  var loader = root.AlloWordSoundsTakeHome;
  var symbols = root.AlloWordSoundsSymbols || (root.AlloModules && root.AlloModules.WordSoundsSymbols);
  var matcher = root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher);
  var verify = root.AlloPacketVerify;
  var reopenKit = root.AlloPacketReopen;
  var handoff = root.AlloPacketHandoff;
  var myWords = root.AlloPacketMyWords || null;
  var wpMedia = root.AlloWordPracticeMedia;
  var wpUi = root.AlloModules && root.AlloModules.WordPractice;
  var PICTURES_PAGE = 'packets-pictures.html';
  var MAX_REOPEN_BYTES = 60 * 1024 * 1024;
  var MAX_ROSTER_BYTES = 256 * 1024;

  function $(id) { return doc.getElementById(id); }

  var modeSelect = $('sr-mode');
  var customInput = $('sr-custom');
  var rehearsalCheck = $('sr-rehearsal');
  var rehearsalBox = $('sr-rehearsal-box');
  var knownInput = $('sr-known');
  var hcCheck = $('sr-hc');
  var titleInput = $('sr-title');
  var learnersInput = $('sr-learners');
  var modeLineEl = $('sr-mode-line');
  var liveHost = $('sr-live-host');
  var picListEl = $('sr-pic-list');
  var picFileEl = $('sr-pic-file');
  var autoPicsBtn = $('sr-auto-pics');
  var startLiveBtn = $('sr-start-live');
  var saveHtmlBtn = $('sr-save-html');
  var savePptxBtn = $('sr-save-pptx');
  var saveRanGridBtn = $('sr-save-ran-grid');
  var saveFlashcardsBtn = $('sr-save-flashcards');
  var saveCccBtn = $('sr-save-ccc');
  var openPeBtn = $('sr-open-present-export');
  var reopenBtn = $('sr-reopen-btn');
  var reopenFile = $('sr-reopen-file');
  var reopenStatusEl = $('sr-reopen-status');
  var checkOptionsBox = $('sr-check-options');
  var untimedCheck = $('sr-untimed');
  var teacherCodeInput = $('sr-teacher-code');
  var includeAudioCheck = $('sr-include-audio');
  var audioModeSelect = $('sr-audio-mode');
  var audioWrap = $('sr-audio-wrap');
  var tryPacketBtn = $('sr-try-packet');
  var clearBtn = $('sr-clear-local');
  var statusEl = $('sr-status');
  var clearStatusEl = $('sr-clear-status');

  var pictures = Object.create(null);
  var phonemeAudio = Object.create(null);
  var letterAudio = Object.create(null);
  var wordAudio = Object.create(null);
  var myWordAudio = Object.create(null);
  var lastMyMediaSig = '';
  var wordAudioPromise = null;
  function mergedWordAudio(wBank) {
    return Object.assign(Object.create(null), wBank || wordAudio, myWordAudio);
  }
  function safeJsonParse(raw) {
    return JSON.parse(raw, function (k, v) {
      return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
    });
  }
  function withFetchTimeout(reqPromise, ctrl, ms) {
    var limit = ms || 15000;
    var timer = 0;
    return new Promise(function (resolve, reject) {
      timer = root.setTimeout(function () {
        if (ctrl) { try { ctrl.abort(); } catch (_) {} }
        reject(new Error('Request timed out'));
      }, limit);
      Promise.resolve(reqPromise).then(function (res) {
        root.clearTimeout(timer);
        resolve(res);
      }, function (err) {
        root.clearTimeout(timer);
        reject(err);
      });
    });
  }
  function fetchWithTimeout(url, ms) {
    var ctrl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    try {
      return withFetchTimeout(ctrl ? root.fetch(url, { signal: ctrl.signal }) : root.fetch(url), ctrl, ms);
    } catch (err) {
      return Promise.reject(err);
    }
  }
  var wordsJsonPromise = null;
  var shardIndexData = null;
  var shardIndexPromise = null;
  var shardFileCache = Object.create(null);
  var shardFilePromises = Object.create(null);
  var NON_WORD_PHONICS = {
    sh: 1, ch: 1, th: 1, wh: 1, ck: 1, ng: 1, ph: 1,
    ee: 1, oo: 1, oo_short: 1, ar: 1, or: 1, er: 1, ir: 1, ur: 1,
    ay: 1, ow: 1, oy: 1, oa: 1, ie: 1, ue: 1, aw: 1, air: 1, ear: 1,
    dh: 1, zh: 1, st: 1, tr: 1, at: 1, an: 1, ing: 1,
    un: 1, re: 1, pre: 1, dis: 1, non: 1, mis: 1, ed: 1, est: 1, ful: 1, less: 1, ness: 1, ment: 1,
  };
  var previewBlobUrl = '';
  var previewSession = null;
  var importTargetAnswer = '';
  var activeRunner = null;
  var symbolReadyPromise = null;
  var step = 1;
  var MAX_STUDENTS = 40;
  var TRY_PAGE = 'packets-try.html';

  function loadAudioJson(url, targetMap, onLoaded) {
    if (typeof root.fetch !== 'function') return Promise.resolve(targetMap);
    return fetchWithTimeout(url, 15000).then(function (res) {
      if (!res || !res.ok) return targetMap;
      return typeof res.text === 'function'
        ? res.text().then(function (txt) { return safeJsonParse(txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt); })
        : res.json();
    }).then(function (data) {
      if (data && typeof data === 'object') {
        var srcMap = data.clips && typeof data.clips === 'object' ? data.clips : data;
        Object.keys(srcMap).forEach(function (k) {
          var val = srcMap[k];
          if (typeof val === 'string' && /^data:audio\//i.test(val)) {
            targetMap[String(k).toLowerCase()] = val;
          } else if (val && typeof val === 'object' && typeof val.base64 === 'string' && val.base64) {
            var mime = typeof val.mime === 'string' && /^audio\/[a-z0-9.+-]+$/i.test(val.mime.trim())
              ? val.mime.trim().toLowerCase() : 'audio/wav';
            targetMap[String(k).toLowerCase()] = 'data:' + mime + ';base64,' + val.base64.replace(/\s+/g, '');
          }
        });
        if (typeof onLoaded === 'function') onLoaded(targetMap);
      }
      return targetMap;
    }).catch(function () { return targetMap; });
  }

  function loadPhonemeAudio() {
    return loadAudioJson('audio_bank/phonemes.json', phonemeAudio, function () {
      if (activeRunner && typeof activeRunner.setPhonemeAudio === 'function') {
        activeRunner.setPhonemeAudio(phonemeAudio);
      }
    });
  }

  function loadLetterAudio() {
    return loadAudioJson('audio_bank/letters.json', letterAudio, function () {
      if (activeRunner && typeof activeRunner.setLetterAudio === 'function') {
        activeRunner.setLetterAudio(letterAudio);
      }
    });
  }

  function loadWordAudio() {
    if (wordsJsonPromise) return wordsJsonPromise;
    wordsJsonPromise = loadAudioJson('audio_bank/words.json', wordAudio, function () {
      if (activeRunner && typeof activeRunner.setWordAudio === 'function') {
        activeRunner.setWordAudio(mergedWordAudio(wordAudio));
      }
    });
    return wordsJsonPromise;
  }

  var FIXED_SPOKEN_WORDS = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
    '11': 'eleven', '12': 'twelve', '13': 'thirteen', '14': 'fourteen', '15': 'fifteen',
    '16': 'sixteen', '17': 'seventeen', '18': 'eighteen', '19': 'nineteen', '20': 'twenty',
    '30': 'thirty', '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy', '80': 'eighty', '90': 'ninety',
    red: 'red', blue: 'blue', green: 'green', yellow: 'yellow', orange: 'orange', purple: 'purple', gold: 'gold',
    up: 'up', down: 'down', left: 'left', right: 'right',
  };

  function spokenWordForItem(item) {
    if (!item) return '';
    var ans = String(item.answer || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(FIXED_SPOKEN_WORDS, ans) ? FIXED_SPOKEN_WORDS[ans] : '';
  }

  function poolWordTargets(pool, resolvedMode) {
    var out = [];
    var seen = Object.create(null);
    (pool || []).forEach(function (item) {
      if (!item) return;
      var fixedWord = spokenWordForItem(item);
      if (fixedWord && !seen[fixedWord]) {
        seen[fixedWord] = true;
        out.push(fixedWord);
        return;
      }
      if (item.dots > 0) return;
      var cat = String(item.category || '').toLowerCase();
      var key = String(item.phonemeKey || item.answer || '').trim().toLowerCase();
      if (!/^[a-z]{2,24}$/.test(key) || seen[key]) return;
      if (cat === 'word' || (resolvedMode === 'custom' && cat !== 'chunk' && cat !== 'number' && !Object.prototype.hasOwnProperty.call(NON_WORD_PHONICS, key))) {
        seen[key] = true;
        out.push(key);
      }
    });
    return out;
  }

  function loadShardIndex() {
    if (shardIndexData) return Promise.resolve(shardIndexData);
    if (typeof root.fetch !== 'function') return Promise.resolve(null);
    if (!shardIndexPromise) {
      var idxCtrl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
      var idxReq = root.fetch('word_audio_shards/index.json', idxCtrl ? { signal: idxCtrl.signal } : undefined);
      shardIndexPromise = withFetchTimeout(idxReq, idxCtrl, 15000).then(function (res) {
        if (!res || !res.ok) return null;
        return typeof res.text === 'function' ? res.text().then(function (txt) {
          return safeJsonParse(txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt);
        }) : res.json();
      }).then(function (data) {
        if (data && data.format === 'alloflow-word-audio-index/1' && data.words && data.shards) {
          shardIndexData = data;
          return data;
        }
        return null;
      }).catch(function () { return null; });
    }
    return shardIndexPromise;
  }

  function loadShardWordAudio(words) {
    var missing = (words || []).filter(function (w) {
      return /^[a-z]{2,24}$/.test(w) && !(/^data:audio\//i.test(wordAudio[w] || ''));
    });
    if (!missing.length || typeof root.fetch !== 'function') return Promise.resolve(wordAudio);
    return loadShardIndex().then(function (idx) {
      if (!idx) return wordAudio;
      var shardUrls = [];
      var wantedByUrl = Object.create(null);
      missing.forEach(function (w) {
        var sKey = Object.prototype.hasOwnProperty.call(idx.words, w) ? idx.words[w] : '';
        var info = sKey && Object.prototype.hasOwnProperty.call(idx.shards, sKey) ? idx.shards[sKey] : null;
        if (!info || typeof info.file !== 'string' || !/^[a-z0-9_][a-z0-9_-]*\.json$/.test(info.file)) return;
        var url = 'word_audio_shards/' + info.file;
        if (!wantedByUrl[url]) {
          wantedByUrl[url] = [];
          shardUrls.push(url);
        }
        wantedByUrl[url].push(w);
      });
      var toFetch = shardUrls.filter(function (u) { return !shardFileCache[u]; });
      var cursor = 0;
      var fetchOneShard = function (url) {
        if (shardFileCache[url]) return Promise.resolve(shardFileCache[url]);
        if (!shardFilePromises[url]) {
          shardFilePromises[url] = fetchWithTimeout(url, 15000).then(function (res) {
            if (!res || !res.ok) return null;
            return typeof res.text === 'function' ? res.text().then(function (txt) {
              return safeJsonParse(txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt);
            }) : res.json();
          }).then(function (data) {
            if (data && typeof data === 'object') shardFileCache[url] = data;
            return shardFileCache[url] || null;
          }).catch(function () { return null; }).then(function (out) {
            delete shardFilePromises[url];
            return out;
          });
        }
        return shardFilePromises[url];
      };
      var workers = Array.from({ length: Math.min(6, toFetch.length) }, function () {
        return (function next() {
          if (cursor >= toFetch.length) return Promise.resolve();
          var url = toFetch[cursor++];
          return fetchOneShard(url).then(next);
        })();
      });
      return Promise.all(workers).then(function () {
        var addedAny = false;
        shardUrls.forEach(function (url) {
          var sData = shardFileCache[url];
          if (!sData || typeof sData !== 'object') return;
          var wMap = sData.words && typeof sData.words === 'object' ? sData.words : sData;
          wantedByUrl[url].forEach(function (w) {
            var clip = Object.prototype.hasOwnProperty.call(wMap, w) ? wMap[w] : '';
            if (typeof clip === 'string' && /^data:audio\//i.test(clip) && !wordAudio[w]) {
              wordAudio[w] = clip;
              addedAny = true;
            }
          });
        });
        if (addedAny && activeRunner && typeof activeRunner.setWordAudio === 'function') {
          activeRunner.setWordAudio(mergedWordAudio(wordAudio));
        }
        return wordAudio;
      });
    });
  }

  var portableClipCache = Object.create(null);
  function getAudioKitReady() {
    var kit = root.AlloPacketAudioKit || null;
    if (!kit || typeof kit.getMp3 !== 'function') return Promise.resolve(null);
    var timer = null;
    var cap = new Promise(function (resolve) {
      timer = (typeof root.setTimeout === 'function' ? root.setTimeout : setTimeout)(function () { resolve(false); }, 1500);
    });
    return Promise.race([kit.getMp3().catch(function () { return false; }), cap]).then(function (ok) {
      if (timer != null && typeof (root.clearTimeout || clearTimeout) === 'function') (root.clearTimeout || clearTimeout)(timer);
      return ok ? kit : null;
    });
  }

  // Transcodes any WebM clips to WAV via loader.portableAudio (Safari/iPad compatibility) and shrinks WAV to 48 kbps MP3 when available.
  function makeClipsPortable(clipMap) {
    if (!clipMap || typeof clipMap !== 'object') return Promise.resolve(clipMap || {});
    var out = {};
    var todoAudio = {};
    var todoKeys = [];
    Object.keys(clipMap).forEach(function (k) {
      var uri = clipMap[k];
      if (typeof uri !== 'string' || !/^data:audio\//i.test(uri)) return;
      if (portableClipCache[uri]) {
        out[k] = portableClipCache[uri];
        return;
      }
      out[k] = uri;
      if (/^data:audio\/(?:webm|wav|x-wav|wave)[;,]/i.test(uri)) {
        todoAudio[k] = uri;
        todoKeys.push(k);
      }
    });
    if (!todoKeys.length) return Promise.resolve(out);
    var OfflineCtx = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    var needsDecode = todoKeys.some(function (k) { return /^data:audio\/webm/i.test(todoAudio[k]); });
    var decodeStep = (needsDecode && loader && typeof loader.portableAudio === 'function' && OfflineCtx)
      ? loader.portableAudio({ audio: todoAudio }, {
        AudioContext: function () { return new OfflineCtx(1, 1, 22050); },
      }).catch(function () {})
      : Promise.resolve();
    return decodeStep.then(function () {
      return getAudioKitReady();
    }).then(function (kit) {
      todoKeys.forEach(function (k) {
        var orig = clipMap[k];
        var cur = todoAudio[k];
        if (typeof cur !== 'string') return;
        if (/^data:audio\/(?:wav|x-wav|wave)[;,]/i.test(cur) && kit && typeof kit.wavUriToMp3Uri === 'function') {
          var mp3 = kit.wavUriToMp3Uri(cur, 48);
          if (mp3) cur = mp3;
        }
        // Only cache/replace when actually portable (not raw WebM); keep out[k] synced.
        if (!/^data:audio\/webm/i.test(cur)) {
          portableClipCache[orig] = cur;
          out[k] = cur;
        } else if (OfflineCtx && loader && typeof loader.portableAudio === 'function') {
          // Decoding failed on a WebM clip: drop non-portable WebM so Safari does not receive broken audio.
          delete out[k];
        }
      });
      return out;
    }).catch(function () { return out; });
  }

  function ensurePoolWordAudio(pool, resolvedMode, convertToPortable) {
    var targets = poolWordTargets(pool, resolvedMode);
    if (!targets.length || typeof root.fetch !== 'function') return Promise.resolve(wordAudio);
    // Prefer lightweight word_audio_shards/ first; only fall back to the 11.3 MB audio_bank/words.json if a sight word is absent from shards.
    return loadShardWordAudio(targets).then(function () {
      if (resolvedMode !== 'sight_words') return wordAudio;
      var stillMissing = targets.some(function (w) { return !/^data:audio\//i.test(wordAudio[w] || ''); });
      return stillMissing ? loadWordAudio() : wordAudio;
    }).then(function () {
      if (!convertToPortable) return wordAudio;
      var todo = {};
      targets.forEach(function (w) {
        if (typeof wordAudio[w] === 'string' && /^data:audio\//i.test(wordAudio[w])) todo[w] = wordAudio[w];
      });
      return makeClipsPortable(todo).then(function (converted) {
        Object.keys(converted).forEach(function (w) { wordAudio[w] = converted[w]; });
        return wordAudio;
      });
    });
  }

  function audioModeValue() {
    var v = audioModeSelect ? audioModeSelect.value : 'auto';
    return v === 'name' || v === 'sound' ? v : 'auto';
  }

  function say(msg) {
    if (statusEl) statusEl.textContent = String(msg || '');
  }

  function setReopenStatus(msg, linkInfo) {
    if (!reopenStatusEl) return;
    reopenStatusEl.textContent = String(msg || '');
    if (linkInfo && linkInfo.href) {
      reopenStatusEl.appendChild(doc.createTextNode(' '));
      var goBtn = doc.createElement('button');
      goBtn.type = 'button';
      goBtn.className = 'btn btn-small';
      goBtn.setAttribute('data-handoff-href', linkInfo.href);
      goBtn.textContent = 'Open in ' + (linkInfo.name || 'maker');
      goBtn.addEventListener('click', function () {
        function nav(url) {
          var a = doc.createElement('a');
          a.href = url;
          a.hidden = true;
          doc.body.appendChild(a);
          a.click();
          doc.body.removeChild(a);
        }
        var h = root.AlloPacketHandoff || handoff;
        var targetHash = linkInfo.href === 'packets-results.html'
          ? ((h && h.RESULTS_HASH) || '#import-results')
          : ((h && h.HASH) || '#open-file');
        var rawBuf = linkInfo.bytes && linkInfo.bytes.buffer ? linkInfo.bytes.buffer : linkInfo.bytes;
        if (h && typeof h.put === 'function' && rawBuf) {
          h.put({ name: linkInfo.fileName || 'packet.html', bytes: rawBuf }).then(function (ok) {
            nav(ok ? (linkInfo.href + targetHash) : linkInfo.href);
          }, function () { nav(linkInfo.href); });
        } else if (h && typeof h.redirect === 'function' && rawBuf) {
          h.redirect({ name: linkInfo.fileName || 'packet.html', bytes: rawBuf }, linkInfo.href, targetHash).catch(function () { nav(linkInfo.href); });
        } else {
          nav(linkInfo.href);
        }
      });
      reopenStatusEl.appendChild(goBtn);
    }
  }

  function controlValue() {
    var checked = doc.querySelector('input[name="sr-control"]:checked');
    return checked && checked.value === 'lockon' ? 'lockon' : 'direct';
  }

  function viewValue() {
    var checked = doc.querySelector('input[name="sr-view"]:checked');
    if (checked && (checked.value === '2d' || checked.value === 'grid')) return checked.value;
    return '3d';
  }

  function packetModeValue() {
    var checked = doc.querySelector('input[name="sr-packet-mode"]:checked');
    return checked && checked.value === 'check' ? 'check' : 'practice';
  }

  function syncPacketModeUi() {
    var isCheck = packetModeValue() === 'check';
    if (checkOptionsBox) checkOptionsBox.hidden = !isCheck;
    if (rehearsalCheck) {
      rehearsalCheck.disabled = isCheck;
      if (rehearsalBox) rehearsalBox.hidden = isCheck || !rehearsalCheck.checked;
    }
    if (includeAudioCheck) includeAudioCheck.disabled = isCheck;
    if (audioModeSelect) audioModeSelect.disabled = isCheck;
    if (audioWrap) audioWrap.hidden = isCheck;
    var practiceBox = $('sr-practice-options');
    if (practiceBox) practiceBox.hidden = isCheck;
    markChoices();
  }

  // The chosen card or chip is outlined, as on the other makers (packets.css .choice.is-on, .radio.is-on).
  function markChoices() {
    Array.prototype.forEach.call(doc.querySelectorAll('label.choice, label.radio'), function (label) {
      var input = label.querySelector('input');
      if (input && label.classList) label.classList.toggle('is-on', !!input.checked);
    });
  }

  // One short line under the set of symbols says what the chosen set is (the option's data-line).
  // The sets as grouped choices, drawn from the dropdown (still the one source of truth, now hidden). Each group
  // opens when it holds the chosen set; choosing one sets the dropdown and fires its own change handler.
  function drawSetChooser() {
    var host = doc.getElementById('sr-sets');
    if (!host || !modeSelect) return;
    host.textContent = '';
    Array.prototype.forEach.call(modeSelect.querySelectorAll('optgroup'), function (group, gi) {
      var box = doc.createElement('details'); box.className = 'strand sr-set-group';
      var head = doc.createElement('summary'); head.className = 'strand-head';
      var title = doc.createElement('h3'); title.id = 'sr-set-group-' + gi; title.textContent = group.label;
      box.setAttribute('aria-labelledby', title.id);
      head.appendChild(title);
      var count = doc.createElement('span'); count.className = 'strand-count'; head.appendChild(count);
      if (group.getAttribute('data-line')) { var gl = doc.createElement('span'); gl.className = 'strand-line'; gl.textContent = group.getAttribute('data-line'); head.appendChild(gl); }
      box.appendChild(head);
      var list = doc.createElement('div'); list.className = 'choices';
      Array.prototype.forEach.call(group.querySelectorAll('option'), function (opt) {
        var label = doc.createElement('label'); label.className = 'choice';
        var radio = doc.createElement('input'); radio.type = 'radio'; radio.name = 'sr-set'; radio.value = opt.value;
        radio.addEventListener('change', function () {
          if (!radio.checked || modeSelect.value === opt.value) return;
          modeSelect.value = opt.value;
          modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
        var name = doc.createElement('span'); name.className = 'choice-name'; name.textContent = String(opt.textContent || '').trim();
        var line = doc.createElement('span'); line.className = 'choice-line'; line.textContent = String(opt.getAttribute('data-line') || '');
        label.appendChild(radio); label.appendChild(name); if (line.textContent) label.appendChild(line);
        list.appendChild(label);
      });
      box.appendChild(list);
      host.appendChild(box);
    });
    syncSetChooser();
  }
  function syncSetChooser() {
    var host = doc.getElementById('sr-sets');
    if (!host || !modeSelect) return;
    Array.prototype.forEach.call(host.querySelectorAll('details.sr-set-group'), function (box) {
      var on = false;
      Array.prototype.forEach.call(box.querySelectorAll('input[name="sr-set"]'), function (radio) {
        radio.checked = radio.value === modeSelect.value;
        radio.parentNode.classList.toggle('is-on', radio.checked);
        if (radio.checked) on = true;
      });
      var count = box.querySelector('.strand-count');
      var sets = box.querySelectorAll('input[name="sr-set"]').length;
      if (count) count.textContent = on ? 'chosen' : sets === 1 ? '1 set' : sets + ' sets';
      if (on) box.open = true;
    });
  }
  function drawModeLine() {
    syncSetChooser();
    if (!modeLineEl || !modeSelect) return;
    var opt = modeSelect.options && modeSelect.selectedIndex >= 0 ? modeSelect.options[modeSelect.selectedIndex] : null;
    modeLineEl.textContent = opt ? String(opt.getAttribute('data-line') || '') : '';
  }

  function modeName(id) {
    var opts = modeSelect && modeSelect.options ? modeSelect.options : [];
    for (var i = 0; i < opts.length; i++) {
      if (opts[i].value === id) return String(opts[i].textContent || '').trim();
    }
    return id;
  }

  function currentPool() {
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    if (customVal && runnerCore) {
      var parsed = runnerCore.parseCustomSymbols(customVal, pictures);
      if (parsed.length >= 2) return parsed;
    }
    return runnerCore ? runnerCore.buildModePool(modeId, customVal, pictures) : [];
  }

  function creditFor(setName) {
    if (setName === 'diagram') return 'AlloFlow Curriculum Diagram';
    if (symbols && symbols.credits && setName && symbols.credits[setName]) return String(symbols.credits[setName]);
    if (symbols && symbols.credit) return String(symbols.credit);
    return 'Mulberry Symbols';
  }

  function ensureSymbolsReady() {
    if (!symbols) return Promise.resolve(null);
    if (!symbolReadyPromise) {
      symbolReadyPromise = typeof symbols.ready === 'function'
        ? Promise.resolve(symbols.ready()).then(function () { return symbols; }).catch(function () { return null; })
        : Promise.resolve(symbols);
    }
    return symbolReadyPromise;
  }

  var PIC_SIDE = 256;
  var PIC_MAX_BYTES = 400000;
  function localSvgRefusal(svg) {
    var s = String(svg || '').replace(/^\s*<\?xml\s[^>]*\?>/i, '').replace(/^(?:\s*<!--[\s\S]*?-->)+/, '').trim();
    if (!/^\s*<svg[\s>]/i.test(s) || !/<\/svg>\s*$/i.test(s)) return 'not an SVG drawing';
    if (s.length > 300000) return 'the drawing is too large';
    if (s.indexOf('\\') >= 0 || /<!(?:doctype|entity)/i.test(s) || /<\?(?!xml\s)/i.test(s)) return 'unsafe markup';
    var plain = s.replace(/&#x([0-9a-f]+);?/gi, function (_, h) { return String.fromCharCode(parseInt(h, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (_, d) { return String.fromCharCode(Number(d) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (_, n) { return n.toLowerCase() === 'colon' ? ':' : ''; });
    var packed = plain.replace(/[\x00-\x20]+/g, '');
    if (/<\s*(?:[\w-]+:)?(?:script|foreignObject|iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'unsupported element';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain) || /(?:java|vb|live)script:/i.test(packed) || /xml:base\s*=/i.test(plain) || /[\s"'\/]src\s*=/i.test(plain)) return 'unsafe attribute';
    var m, href = /(?:[\s"'\/])(?:[\w-]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      var v = String(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || '').replace(/[\x00-\x20]+/g, '');
      if (v.charAt(0) !== '#') return 'external link';
    }
    var url = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = url.exec(plain))) {
      var u = String(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || '').replace(/[\x00-\x20]+/g, '');
      if (u.charAt(0) !== '#') return 'external url';
    }
    if (/@import|@font-face|@namespace|expression\s*\(/i.test(plain)) return 'unsafe style';
    return '';
  }

  function downscaleImageUri(dataUri) {
    return new Promise(function (resolve) {
      if (typeof root.Image !== 'function' || !doc || typeof doc.createElement !== 'function') { resolve(dataUri); return; }
      var img = new root.Image();
      var done = false;
      var finish = function (val) { if (done) return; done = true; resolve(val); };
      var timer = (typeof root.setTimeout === 'function' ? root.setTimeout : setTimeout)(function () { finish(dataUri); }, 1500);
      img.onload = function () {
        if (typeof (root.clearTimeout || clearTimeout) === 'function') (root.clearTimeout || clearTimeout)(timer);
        try {
          var w = img.naturalWidth || img.width || 0;
          var h = img.naturalHeight || img.height || 0;
          if (!w || !h) { finish(dataUri); return; }
          var scale = Math.min(1, PIC_SIDE / Math.max(w, h));
          var tw = Math.max(1, Math.round(w * scale));
          var th = Math.max(1, Math.round(h * scale));
          var canvas = doc.createElement('canvas');
          canvas.width = tw;
          canvas.height = th;
          var ctx2d = canvas.getContext && canvas.getContext('2d');
          if (!ctx2d) { finish(dataUri); return; }
          ctx2d.drawImage(img, 0, 0, tw, th);
          var png = canvas.toDataURL('image/png');
          if (png && png.length < PIC_MAX_BYTES * 1.4) { finish(png); return; }
          var jpg = canvas.toDataURL('image/jpeg', 0.82);
          finish(jpg && jpg.length < png.length ? jpg : png);
        } catch (_) {
          finish(dataUri);
        }
      };
      img.onerror = function () {
        if (typeof (root.clearTimeout || clearTimeout) === 'function') (root.clearTimeout || clearTimeout)(timer);
        finish(dataUri);
      };
      img.src = dataUri;
    });
  }

  function svgToPngDataUri(svgText) {
    if (wpUi && typeof wpUi.rasterizeImage === 'function') {
      return wpUi.rasterizeImage(svgText, doc);
    }
    var src = /^data:/i.test(svgText) ? svgText : ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText));
    return Promise.resolve(src);
  }

  var MAX_SVG_UPLOAD_BYTES = 1200 * 1024;
  var MAX_RASTER_UPLOAD_BYTES = 25 * 1024 * 1024;
  function readFileAsDataUri(file) {
    var mime = String((file && file.type) || '').toLowerCase();
    var isSvg = mime === 'image/svg+xml' || /\.svg$/i.test(String((file && file.name) || ''));
    var sizeBytes = Number((file && file.size) || 0);
    if (isSvg && sizeBytes > MAX_SVG_UPLOAD_BYTES) {
      return Promise.reject(new Error('That SVG picture is too large to keep. Choose a smaller picture.'));
    }
    if (!isSvg && sizeBytes > MAX_RASTER_UPLOAD_BYTES) {
      return Promise.reject(new Error('That picture is too large to keep. Choose a smaller picture.'));
    }
    if (isSvg) {
      return new Promise(function (resolve, reject) {
        if (typeof root.FileReader !== 'function') { reject(new Error('File reader is unavailable.')); return; }
        var reader = new root.FileReader();
        reader.onload = function () {
          var svg = String(reader.result || '');
          var why = localSvgRefusal(svg);
          if (why) { reject(new Error('That SVG picture could not be used (' + why + ').')); return; }
          var b64 = typeof root.btoa === 'function' ? root.btoa(unescape(encodeURIComponent(svg))) : '';
          resolve(b64 ? ('data:image/svg+xml;base64,' + b64) : ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)));
        };
        reader.onerror = function () { reject(new Error('Could not read that image.')); };
        reader.readAsText(file);
      });
    }
    if (wpUi && typeof wpUi.rasterizeImage === 'function') {
      return wpUi.rasterizeImage(file, doc);
    }
    return new Promise(function (resolve, reject) {
      if (typeof root.FileReader !== 'function') { reject(new Error('File reader is unavailable.')); return; }
      var reader = new root.FileReader();
      reader.onload = function () {
        var raw = String(reader.result || '');
        if (!/^data:image\/(?:png|jpeg|jpg|gif|webp);base64,/i.test(raw)) {
          reject(new Error('Choose a PNG, JPEG, GIF, WebP or SVG picture.'));
          return;
        }
        downscaleImageUri(raw).then(function (resized) {
          var body = resized.slice(resized.indexOf(',') + 1);
          var approxBytes = Math.floor(body.length * 0.75);
          if (approxBytes > PIC_MAX_BYTES) {
            reject(new Error('That picture is too large to keep. Choose a smaller picture.'));
            return;
          }
          resolve(resized);
        });
      };
      reader.onerror = function () { reject(new Error('Could not read that image.')); };
      reader.readAsDataURL(file);
    });
  }

  function renderPictureList() {
    if (!picListEl) return;
    picListEl.replaceChildren();
    var pool = currentPool();
    pool.forEach(function (sym) {
      var card = doc.createElement('div');
      card.className = 'sr-pic-card';
      var symEl = doc.createElement('div');
      symEl.className = 'sr-pic-sym';
      symEl.textContent = sym.display;
      card.appendChild(symEl);

      var pic = pictures[sym.answer];
      if (pic && pic.src) {
        var img = doc.createElement('img');
        img.className = 'sr-pic-thumb';
        img.src = pic.src;
        img.alt = pic.alt || sym.display;
        card.appendChild(img);
      }

      var bar = doc.createElement('div');
      bar.className = 'sr-pic-actions';
      var impBtn = doc.createElement('button');
      impBtn.type = 'button';
      impBtn.className = 'btn btn-small';
      impBtn.textContent = pic && pic.src ? 'Switch image' : 'Import image';
      impBtn.addEventListener('click', function () {
        importTargetAnswer = sym.answer;
        if (picFileEl) { picFileEl.value = ''; picFileEl.click(); }
      });
      bar.appendChild(impBtn);

      var nw = myWords && typeof myWords.normalizeWord === 'function' ? myWords.normalizeWord(sym.answer) : '';
      if (nw) {
        var findLink = doc.createElement('a');
        findLink.className = 'btn btn-small';
        findLink.href = PICTURES_PAGE + '#word=' + encodeURIComponent(nw) + '&from=symbol-runner';
        findLink.target = '_blank';
        findLink.rel = 'noopener';
        findLink.setAttribute('data-sr-find-pic', sym.answer);
        findLink.textContent = 'Find a picture';
        var srNote = doc.createElement('span');
        srNote.className = 'sr-only';
        srNote.textContent = ' (opens in a new tab)';
        findLink.appendChild(srNote);
        bar.appendChild(findLink);
      }

      if (pic && pic.src) {
        var rmBtn = doc.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'btn btn-small';
        rmBtn.textContent = 'Remove';
        rmBtn.addEventListener('click', function () {
          var wasCustom = !!(pic.fromMyWords || pic.set === 'custom');
          delete pictures[sym.answer];
          if (wasCustom && myWords && typeof myWords.putMedia === 'function') {
            myWords.putMedia(sym.answer, { picture: null }).catch(function () {});
          }
          renderPictureList();
          startLive();
          choicesChanged();
        });
        bar.appendChild(rmBtn);
      }
      card.appendChild(bar);
      picListEl.appendChild(card);
    });
  }

  function loadMyWordsPictures() {
    if (!myWords || typeof myWords.getManyMedia !== 'function') return Promise.resolve(0);
    var pool = currentPool();
    var keys = pool.map(function (s) { return s && s.answer ? String(s.answer) : ''; }).filter(Boolean);
    var sig = keys.join('|');
    if (!keys.length) { lastMyMediaSig = ''; return Promise.resolve(0); }
    return myWords.getManyMedia(keys).then(function (found) {
      lastMyMediaSig = sig;
      if (!found || typeof found !== 'object') return 0;
      var loaded = 0;
      var audioChanged = false;
      pool.forEach(function (sym) {
        if (!sym || !sym.answer) return;
        var mk = typeof myWords.normalizeMediaKey === 'function' ? myWords.normalizeMediaKey(sym.answer) : String(sym.answer).toLowerCase();
        var ansLower = String(sym.answer).toLowerCase();
        var entry = found[mk] || found[ansLower] || null;
        var hasPic = !!(entry && entry.picture && !entry.picture.none && typeof entry.picture.dataUri === 'string' && entry.picture.dataUri);
        if (hasPic) {
          var creditText = typeof myWords.creditLine === 'function' && entry.picture.credit ? myWords.creditLine(entry.picture.credit) : "The teacher's own picture.";
          pictures[sym.answer] = {
            src: entry.picture.dataUri,
            alt: sym.display,
            credit: creditText || "The teacher's own picture.",
            set: 'custom',
            fromMyWords: true,
          };
          loaded++;
        } else if (pictures[sym.answer] && pictures[sym.answer].fromMyWords) {
          delete pictures[sym.answer];
        }
        var recUri = entry && entry.recording && typeof entry.recording.dataUri === 'string' && /^data:audio\//i.test(entry.recording.dataUri)
          ? entry.recording.dataUri : '';
        if (recUri) {
          if (myWordAudio[ansLower] !== recUri) audioChanged = true;
          myWordAudio[ansLower] = recUri;
          myWordAudio[sym.answer] = recUri;
        } else if (myWordAudio[ansLower] || myWordAudio[sym.answer]) {
          delete myWordAudio[ansLower];
          delete myWordAudio[sym.answer];
          audioChanged = true;
        }
      });
      if (audioChanged && activeRunner && typeof activeRunner.setWordAudio === 'function') {
        activeRunner.setWordAudio(mergedWordAudio(wordAudio));
      }
      return loaded;
    }).catch(function () { return 0; });
  }

  function autoFillPictures(quiet) {
    return loadMyWordsPictures().then(function () {
      return ensureSymbolsReady();
    }).then(function (bank) {
      var hasMatcherDiagrams = !!(matcher && typeof matcher.matchWord === 'function');
      if (!bank && !hasMatcherDiagrams) {
        if (!quiet) say('Built-in pictures could not load on this page.');
        return 0;
      }
      var pool = currentPool();
      var anchors = (builder && builder.DEFAULT_ANCHORS) || {};
      var added = 0;
      return Promise.all(pool.map(function (sym) {
        var key = String(sym.answer || '').toLowerCase();
        if (pictures[sym.answer] && pictures[sym.answer].src) return null;
        var lookupWord = anchors[key] || key;
        var hit = hasMatcherDiagrams
          ? matcher.matchWord({ word: lookupWord }, { symbols: bank, creditForSet: creditFor, preferDiagrams: true })
          : null;
        if (!hit && bank && typeof bank.get === 'function' && bank.get(lookupWord)) {
          var raw = bank.get(lookupWord);
          if (raw && raw.svg) hit = { svg: raw.svg, set: raw.set, label: raw.label || lookupWord, credit: creditFor(raw.set) };
        }
        if (!hit || !hit.svg) return null;
        return svgToPngDataUri(hit.svg).then(function (png) {
          if (!png) return;
          pictures[sym.answer] = {
            src: png,
            alt: sym.display + ' cue: ' + (hit.label || lookupWord),
            credit: hit.credit || creditFor(hit.set),
            set: hit.set || 'mulberry',
          };
          added++;
        }).catch(function () { return null; });
      })).then(function () {
        renderPictureList();
        startLive();
        if (!quiet) say(added ? ('Added built-in cue pictures to ' + added + ' symbols.') : 'Every matched symbol already has a cue picture.');
        return added;
      });
    });
  }

  function stopLive() {
    if (activeRunner && typeof activeRunner.destroy === 'function') activeRunner.destroy();
    activeRunner = null;
    if (liveHost && typeof liveHost.replaceChildren === 'function') liveHost.replaceChildren();
  }

  function startLive() {
    if (!runnerCore || !liveHost) return;
    stopLive();
    // The round runs only while step 2 is on screen, so a hidden round does not keep the device busy.
    if (step !== 2) return;
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var focus = [];
    if (rehearsalCheck && rehearsalCheck.checked && packetModeValue() !== 'check') {
      var pool = currentPool();
      var knownRaw = knownInput ? knownInput.value.trim().toLowerCase().split(/[\s,;|\r\n]+/).filter(Boolean) : [];
      var knownSet = Object.create(null);
      knownRaw.forEach(function (k) { knownSet[k] = true; });
      focus = knownRaw.length
        ? pool.filter(function (p) { return !knownSet[p.answer.toLowerCase()]; }).slice(0, 6).map(function (p) { return p.answer; })
        : pool.slice(0, Math.min(3, Math.max(1, pool.length - 3))).map(function (p) { return p.answer; });
    }
    var resolvedMode = customVal ? 'custom' : modeId;
    var pool = currentPool();
    activeRunner = runnerCore.mountRunner(liveHost, {
      modeId: resolvedMode,
      customSymbols: customVal || undefined,
      controlMode: controlValue(),
      viewMode: viewValue(),
      highContrast: !!(hcCheck && hcCheck.checked),
      // Microphone off (2026-11-17, owner's decision): no Mic button, and speech recognition is never started.
      enableVoice: false,
      voiceEnabled: false,
      focusAnswers: focus,
      pictures: pictures,
      phonemeAudio: phonemeAudio,
      letterAudio: letterAudio,
      wordAudio: mergedWordAudio(wordAudio),
      audioMode: audioModeValue(),
    });
    ensurePoolWordAudio(pool, resolvedMode, false);
  }

  function savePreferences() {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        mode: modeSelect ? modeSelect.value : 'confusable_letters',
        control: controlValue(),
        viewMode: viewValue(),
        packetMode: packetModeValue(),
        untimed: !!(untimedCheck && untimedCheck.checked),
        rehearsal: !!(rehearsalCheck && rehearsalCheck.checked),
        includeAudio: includeAudioCheck ? !!includeAudioCheck.checked : true,
        audioMode: audioModeValue(),
        highContrast: !!(hcCheck && hcCheck.checked),
        title: titleInput ? titleInput.value : '',
      }));
    } catch (_) {}
  }

  function downloadBlob(content, mime, filename) {
    var blob = content instanceof root.Blob ? content : new root.Blob([content], { type: mime });
    var url = root.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(function () { root.URL.revokeObjectURL(url); }, 1000);
  }

  function slug(textVal, fallback) {
    var s = String(textVal || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return s || fallback || 'symbol-runner';
  }

  function titleStem() {
    var raw = titleInput ? titleInput.value : '';
    var clean = String(raw || 'symbol-runner').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return clean || 'symbol-runner';
  }
  function packetFileName(code) {
    return titleStem() + (code ? '__' + code : '') + '.html';
  }

  function resolvePoolClips(pool, resolvedMode, pBank, lBank, wBank) {
    var clipMap = {};
    var aMode = audioModeValue();
    var allWords = mergedWordAudio(wBank);
    (pool || []).forEach(function (item) {
      var ansLower = String(item.answer || '').toLowerCase();
      var uri = '';
      if (myWordAudio[ansLower] && /^data:audio\//i.test(myWordAudio[ansLower])) {
        uri = myWordAudio[ansLower];
      } else if (myWordAudio[item.answer] && /^data:audio\//i.test(myWordAudio[item.answer])) {
        uri = myWordAudio[item.answer];
      }
      if (!uri && runnerCore && typeof runnerCore.resolvePhonemeAudioUri === 'function') {
        uri = runnerCore.resolvePhonemeAudioUri(item, pBank, {
          letterAudio: lBank,
          wordAudio: allWords,
          audioMode: aMode,
          modeId: resolvedMode,
        }) || '';
      }
      if (!uri) {
        var spokenWord = spokenWordForItem(item);
        if (spokenWord && allWords && typeof allWords[spokenWord] === 'string' && /^data:audio\//i.test(allWords[spokenWord])) {
          uri = allWords[spokenWord];
        }
      }
      if (uri) {
        clipMap[item.answer] = uri;
        clipMap[ansLower] = uri;
        if (item.display && String(item.display).toLowerCase() === ansLower) {
          clipMap[item.display] = uri;
        }
      }
    });
    return clipMap;
  }

  function withAudioBanks(wantAudio, done) {
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var resolvedMode = customVal ? 'custom' : modeId;
    var pool = currentPool();
    var poolSig = pool.map(function (s) { return s && s.answer ? String(s.answer) : ''; }).filter(Boolean).join('|');
    var wTargets = wantAudio ? poolWordTargets(pool, resolvedMode) : [];
    var needP = wantAudio && !Object.keys(phonemeAudio).length && typeof root.fetch === 'function';
    var needL = wantAudio && !Object.keys(letterAudio).length && typeof root.fetch === 'function';
    var needW = wantAudio && wTargets.length > 0 && typeof root.fetch === 'function';
    var needMy = wantAudio && (resolvedMode === 'custom' || resolvedMode === 'sight_words') && !!poolSig && lastMyMediaSig !== poolSig && !!(myWords && typeof myWords.getManyMedia === 'function');
    var finish = function () {
      if (!wantAudio) {
        done(phonemeAudio, letterAudio, wordAudio, null);
        return;
      }
      var rawClips = resolvePoolClips(pool, resolvedMode, phonemeAudio, letterAudio, wordAudio);
      if (!Object.keys(rawClips).length) {
        done(phonemeAudio, letterAudio, wordAudio, rawClips);
        return;
      }
      makeClipsPortable(rawClips).then(function (portable) {
        done(phonemeAudio, letterAudio, wordAudio, portable);
      });
    };
    if (!needP && !needL && !needW && !needMy) {
      finish();
      return;
    }
    Promise.all([
      needP ? loadPhonemeAudio() : Promise.resolve(phonemeAudio),
      needL ? loadLetterAudio() : Promise.resolve(letterAudio),
      needW ? ensurePoolWordAudio(pool, resolvedMode, true) : Promise.resolve(wordAudio),
      needMy ? loadMyWordsPictures() : Promise.resolve(0),
    ]).then(finish);
  }

  function buildCurrentPacket(pBank, lBank, wBank, portableClips) {
    var pMode = packetModeValue();
    var untimed = !!(untimedCheck && untimedCheck.checked);
    var tCode = teacherCodeInput ? teacherCodeInput.value.trim() : '';
    var wantAudio = pMode !== 'check' && (!includeAudioCheck || includeAudioCheck.checked);
    var aMode = audioModeValue();
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var resolvedMode = customVal ? 'custom' : modeId;
    var knownList = pMode === 'check' ? undefined : (knownInput && knownInput.value.trim() ? knownInput.value.trim() : undefined);
    var picMap = {};
    Object.keys(pictures).forEach(function (k) {
      if (pictures[k] && pictures[k].src) picMap[k] = pictures[k];
    });
    var clipMap = {};
    if (wantAudio) {
      clipMap = portableClips || resolvePoolClips(currentPool(), resolvedMode, pBank, lBank, wBank);
    }
    return builder.buildSymbolRunnerPacket({
      loader: loader,
      mode: resolvedMode,
      items: customVal || undefined,
      packetMode: pMode,
      untimed: untimed,
      teacherCode: pMode === 'check' ? tCode : undefined,
      control: controlValue(),
      viewMode: viewValue(),
      rehearsal: pMode === 'check' ? false : !!(rehearsalCheck && rehearsalCheck.checked),
      known: knownList,
      pictures: picMap,
      clips: wantAudio && Object.keys(clipMap).length ? clipMap : undefined,
      audioMode: aMode,
      title: titleInput && titleInput.value.trim() ? titleInput.value.trim() : undefined,
    });
  }

  // Unified Step 3 code-name / batch .zip fold: 1 line puts that code name in the single file above;
  // 2-40 lines saves one file per student in one .zip file in 1 click.
  function cleanRosterLine(raw) {
    var s = String(raw || '').replace(/^\uFEFF/, '').trim();
    if (!s) return '';
    s = s.replace(/^(?:\(\d{1,3}\)|\d{1,3}[.)]|[\u2022\u25CF\u25CB\u25AA\u2023\u2043*\u2013\u2014-])\s+/, '').trim();
    var col = s.indexOf('\t') >= 0 ? s.split('\t')[0] : (s.indexOf(',') >= 0 ? s.split(',')[0] : s);
    return col.trim().replace(/^["']+|["']+$/g, '').trim();
  }
  function batchList() {
    var seen = Object.create(null);
    var out = { names: [], twice: [], unusable: [], over: 0 };
    String((learnersInput && learnersInput.value) || '').replace(/^\uFEFF/, '').split(/\r?\n/).forEach(function (raw) {
      if (!String(raw || '').trim()) return;
      var cleaned = cleanRosterLine(raw);
      var name = builder && typeof builder.codeName === 'function' ? builder.codeName(cleaned) : cleaned;
      if (!name) { out.unusable.push((cleaned || String(raw).trim()).slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }

  function singleCodeName() {
    var list = batchList();
    return list.names.length === 1 ? list.names[0] : '';
  }

  function fileSize(bytes) {
    var n = Number(bytes) || 0;
    return n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1000)) + ' KB';
  }

  function setBatchSaid(msg) { var el = $('sr-batch-said'); if (el) el.textContent = String(msg || ''); }
  function setBatchProblem(msg) { var el = $('sr-batch-problem'); if (el) el.textContent = String(msg || ''); }

  function drawBatch() {
    var list = batchList();
    var n = list.names.length;
    var parts = [];
    var btn = $('sr-batch-make');
    if (n === 0) {
      parts.push('Leave empty so each student types a code name at the start.');
      if (btn) btn.hidden = true;
    } else if (n === 1) {
      parts.push('Using ' + list.names[0] + ' in the file above (' + packetFileName(list.names[0]) + '). Add another line to save a .zip.');
      if (btn) btn.hidden = true;
    } else {
      var est = preparedBaseHtml ? ', about ' + fileSize(n * preparedBaseHtml.length) + ' in all.' : '.';
      parts.push(n + ' files' + est);
      if (btn) {
        btn.hidden = false;
        btn.textContent = 'Save .zip for ' + n + ' students';
      }
    }
    if (list.over) parts.push('Not used: ' + list.over + ' more. At most ' + MAX_STUDENTS + ' go in one .zip file.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    setBatchSaid(parts.join(' '));
  }

  function saveBatchZip() {
    setBatchProblem('');
    if (!builder || !loader) { setBatchProblem('The part that makes the file did not load. Load the page again.'); return; }
    var list = batchList();
    if (list.names.length < 2) { setBatchProblem('Type at least 2 code names to save a .zip file.'); return; }
    if (!root.AlloPacketZip || typeof root.AlloPacketZip.create !== 'function') { setBatchProblem('This page could not load the part that makes .zip files. Load the page again.'); return; }
    var pMode = packetModeValue();
    var wantAudio = pMode !== 'check' && (!includeAudioCheck || includeAudioCheck.checked);
    setBatchSaid('Making the .zip file.');
    var finishZip = function (baseHtml) {
      try {
        var zip = root.AlloPacketZip.create();
        var encoder = typeof root.TextEncoder === 'function' ? new root.TextEncoder() : null;
        list.names.forEach(function (name) {
          var htmlOut = builder.withCodeName(baseHtml, name);
          zip.add(packetFileName(name), encoder ? encoder.encode(htmlOut) : htmlOut);
        });
        var zipParts = zip.finish();
        var zipName = titleStem() + '__' + list.names.length + '-students.zip';
        var zipBlob = new root.Blob(zipParts, { type: 'application/zip' });
        downloadBlob(zipBlob, 'application/zip', zipName);
        setBatchSaid('Saved ' + zipName + ' (' + fileSize(zip.bytes || 0) + '). Each file\'s name ends with the student\'s code name. Send each student their own file.');
      } catch (err) {
        setBatchProblem('The .zip file could not be made (' + ((err && err.message) || 'unknown problem') + ').');
        drawBatch();
      }
    };
    if (!previewDirty && preparedBaseHtml && preparedSig === currentBuildSig()) {
      finishZip(preparedBaseHtml);
      return;
    }
    withAudioBanks(wantAudio, function (pBank, lBank, wBank, portableClips) {
      try {
        var built = buildCurrentPacket(pBank, lBank, wBank, portableClips);
        finishZip(built.html);
      } catch (err) {
        setBatchProblem('The .zip file could not be made (' + ((err && err.message) || 'unknown problem') + ').');
        drawBatch();
      }
    });
  }

  function loadRosterFile(file) {
    setBatchProblem('');
    if (!file) return;
    if (file.size > MAX_ROSTER_BYTES) { setBatchProblem('That text file is too large. Choose a plain .txt list of code names.'); return; }
    if (typeof root.FileReader !== 'function') { setBatchProblem('This browser cannot read local files here.'); return; }
    var reader = new root.FileReader();
    reader.onload = function () {
      if (learnersInput) learnersInput.value = String(reader.result || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
      applySinglePreviewCode();
      drawBatch();
    };
    reader.onerror = function () { setBatchProblem('This browser could not read that file.'); };
    reader.readAsText(file);
  }

  function showAfterSave() {
    var box = $('sr-after-save');
    if (!box) return;
    var codeNote = $('sr-after-code');
    if (codeNote) codeNote.hidden = !(packetModeValue() === 'check' && teacherCodeInput && teacherCodeInput.value.trim().length >= 4);
    box.hidden = false;
    if (typeof box.focus === 'function') { try { box.focus(); } catch (_) {} }
  }

  function exportPracticePacket() {
    if (!builder || !loader) {
      say('Practice file builder is unavailable here.');
      return;
    }
    var pMode = packetModeValue();
    var tCode = teacherCodeInput ? teacherCodeInput.value.trim() : '';
    var wantAudio = pMode !== 'check' && (!includeAudioCheck || includeAudioCheck.checked);
    var finishDownload = function (baseHtml) {
      var name = singleCodeName();
      var single = name ? builder.withCodeName(baseHtml, name) : baseHtml;
      var outName = packetFileName(name);
      downloadBlob(single, 'text/html;charset=utf-8', outName);
      say('Saved ' + outName + ', ' + (pMode === 'check' ? 'a 1-minute check.' : 'a practice file.'));
      showAfterSave();
    };
    if (!previewDirty && preparedBaseHtml && preparedSig === currentBuildSig() && !(pMode === 'check' && tCode && tCode.length < 4)) {
      finishDownload(preparedBaseHtml);
      return;
    }
    withAudioBanks(wantAudio, function (pBank, lBank, wBank, portableClips) {
      try {
        var built = buildCurrentPacket(pBank, lBank, wBank, portableClips);
        preparedBaseHtml = built.html;
        preparedSig = currentBuildSig();
        previewDirty = false;
        finishDownload(built.html);
      } catch (err) {
        say((err && err.message) || 'Could not build that file.');
        if (pMode === 'check' && tCode && /teacher code/i.test(String(err && err.message)) && teacherCodeInput && typeof teacherCodeInput.focus === 'function') {
          goTo(2, true);
          teacherCodeInput.focus();
        }
      }
    });
  }

  // Step 3's "The file is ready" line, from the builder's plan (plus file size once prepared).
  function drawSummary() {
    var box = $('sr-summary');
    var lineEl = $('sr-summary-line');
    var problemBox = $('sr-build-problem');
    var problemText = $('sr-build-problem-text');
    if (!box || !lineEl || !builder || typeof builder.planSymbolRunner !== 'function') return;
    var pMode = packetModeValue();
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var plan;
    try {
      plan = builder.planSymbolRunner({
        mode: customVal ? 'custom' : modeId,
        items: customVal || undefined,
        packetMode: pMode,
        control: controlValue(),
        rehearsal: pMode === 'check' ? false : !!(rehearsalCheck && rehearsalCheck.checked),
        known: pMode === 'check' ? undefined : (knownInput && knownInput.value.trim() ? knownInput.value.trim() : undefined),
      });
    } catch (err) {
      box.hidden = true;
      if (problemBox && problemText) {
        problemText.textContent = (err && err.message) || 'The file cannot be made with these choices.';
        problemBox.hidden = false;
      }
      return;
    }
    if (problemBox) problemBox.hidden = true;
    var cards = plan.cards.length;
    var parts = [customVal ? 'My own list' : modeName(modeId)];
    if (pMode === 'check') {
      var sample = plan.cards.filter(function (c) { return c.practice; }).length;
      var untimed = !!(untimedCheck && untimedCheck.checked);
      parts.push(sample + ' practice cards, then ' + (cards - sample) + ' cards with one try on each.');
      parts.push(untimed ? 'No clock.' : 'A 1-minute clock.');
      var code = teacherCodeInput ? teacherCodeInput.value.trim() : '';
      if (code) parts.push(code.length >= 4 ? 'With a teacher code.' : 'The teacher code needs 4 or more characters.');
    } else {
      parts.push(cards + ' cards. After a miss, the student tries again. No clock.');
      if (plan.rehearsal) parts.push('Rehearsal with known facts: ' + plan.newSymbols.length + ' new, ' + plan.knownSymbols.length + ' known.');
    }
    if (controlValue() === 'lockon') parts.push('The student points at the card first.');
    if (preparedPreviewHtml) parts.push(fileSize(preparedPreviewHtml.length) + '.');
    lineEl.textContent = parts[0] + '. ' + parts.slice(1).join(' ');
    box.hidden = false;
  }

  var previewGen = 0;
  var previewDirty = true;
  var preparedBaseHtml = '';
  var preparedPreviewHtml = '';
  var preparedSig = '';

  function currentBuildSig() {
    return [
      modeSelect ? modeSelect.value : '',
      customInput ? customInput.value.trim() : '',
      packetModeValue(),
      controlValue(),
      viewValue(),
      untimedCheck ? !!untimedCheck.checked : false,
      rehearsalCheck ? !!rehearsalCheck.checked : false,
      knownInput ? knownInput.value.trim() : '',
      teacherCodeInput ? teacherCodeInput.value.trim() : '',
      includeAudioCheck ? !!includeAudioCheck.checked : true,
      audioModeValue(),
      titleInput ? titleInput.value.trim() : '',
      Object.keys(pictures).sort().join(','),
      Object.keys(myWordAudio).sort().join(','),
    ].join('\x1f');
  }

  function applySinglePreviewCode() {
    if (!preparedBaseHtml || !builder) return;
    var name = singleCodeName();
    preparedPreviewHtml = name ? builder.withCodeName(preparedBaseHtml, name) : preparedBaseHtml;
    if (previewSession && typeof previewSession.update === 'function' && previewBlobUrl) {
      publishPreviewHtml(preparedPreviewHtml);
    }
    if (step === 3) drawSummary();
  }

  function publishPreviewHtml(html) {
    if (!root.URL || typeof root.URL.createObjectURL !== 'function') return '';
    if (previewBlobUrl && typeof root.URL.revokeObjectURL === 'function') {
      try { root.URL.revokeObjectURL(previewBlobUrl); } catch (_) {}
    }
    var blob = new root.Blob([html], { type: 'text/html' });
    previewBlobUrl = root.URL.createObjectURL(blob);
    preparedPreviewHtml = html;
    if (handoff && typeof handoff.hostPreview === 'function') {
      if (previewSession && typeof previewSession.update === 'function') {
        previewSession.update({ url: previewBlobUrl, html: html });
      } else {
        previewSession = handoff.hostPreview({ url: previewBlobUrl, html: html });
      }
    }
    previewDirty = false;
    return TRY_PAGE + '#' + previewBlobUrl;
  }

  // Pre-loads and transcodes audio in the background when Step 3 is open, without creating a Blob URL until Try it is clicked.
  function prepareStep3Preview() {
    if (!builder || !loader) return;
    var gen = ++previewGen;
    var pMode = packetModeValue();
    var wantAudio = pMode !== 'check' && (!includeAudioCheck || includeAudioCheck.checked);
    withAudioBanks(wantAudio, function (pBank, lBank, wBank, portableClips) {
      if (gen !== previewGen) return;
      try {
        var built = buildCurrentPacket(pBank, lBank, wBank, portableClips);
        preparedBaseHtml = built.html;
        preparedSig = currentBuildSig();
        var name = singleCodeName();
        preparedPreviewHtml = name ? builder.withCodeName(preparedBaseHtml, name) : preparedBaseHtml;
        previewDirty = false;
        if (previewSession && typeof previewSession.update === 'function' && previewBlobUrl) {
          publishPreviewHtml(preparedPreviewHtml);
        }
        if (step === 3) { drawSummary(); drawBatch(); }
      } catch (_) {}
    });
  }

  function previewPacket() {
    if (!builder || !loader) {
      say('Practice file builder is unavailable here.');
      return;
    }
    // Always open the preview tab synchronously within the click gesture (never after an async fetch, which triggers popup blockers).
    var html = '';
    if (!previewDirty && preparedPreviewHtml && preparedSig === currentBuildSig()) {
      html = preparedPreviewHtml;
    } else {
      try {
        var syncBuilt = buildCurrentPacket(phonemeAudio, letterAudio, wordAudio, null);
        var syncName = singleCodeName();
        if (syncName) syncBuilt.html = builder.withCodeName(syncBuilt.html, syncName);
        html = syncBuilt.html;
      } catch (err) {
        say((err && err.message) || 'Could not preview that file.');
        return;
      }
      // If portable audio is still loading, finish in the background and live-update the open preview tab via BroadcastChannel.
      prepareStep3Preview();
    }
    var href = publishPreviewHtml(html);
    if (!href) {
      say('Could not preview that file.');
      return;
    }
    var link = doc.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.hidden = true;
    doc.body.appendChild(link);
    link.click();
    doc.body.removeChild(link);
    say('Try it opened in a new tab.');
  }

  function exportPptxSlides() {
    if (!runnerCore || !wpMedia || typeof wpMedia.buildPictureSlidesPptx !== 'function') {
      say('PowerPoint slide export is unavailable on this page.');
      return;
    }
    var pool = currentPool();
    if (!pool.length) {
      say('Choose at least one symbol before exporting slides.');
      return;
    }
    say('Building individual symbol slides...');
    var pack = runnerCore.buildSymbolSlidesPack(pool, titleInput ? titleInput.value.trim() : 'Symbol Runner Cards');
    wpMedia.buildPictureSlidesPptx(pack, pack.options, { labels: {} }).then(function (pptx) {
      return pptx.write({ outputType: 'blob' });
    }).then(function (blob) {
      downloadBlob(blob, 'application/vnd.openxmlformats-officedocument.presentationml.presentation', slug(titleInput ? titleInput.value : '', 'symbol-runner') + '-slides.pptx');
      say('Downloaded individual symbol slides (.pptx).');
    }).catch(function (err) {
      say((err && err.message) || 'Could not export PowerPoint slides.');
    });
  }

  function exportRanGrid() {
    if (!runnerCore || typeof runnerCore.buildPrintableRanSheetHtml !== 'function') {
      say('The sheet of 40 to print is not available on this page.');
      return;
    }
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var titleText = titleInput && titleInput.value.trim() ? titleInput.value.trim() : 'Rapid Naming 5x8 Matrix';
    var html = runnerCore.buildPrintableRanSheetHtml({
      modeId: customVal ? 'custom' : modeId,
      customSymbols: customVal || undefined,
      pictures: pictures,
      title: titleText,
    });
    var filename = slug(titleInput ? titleInput.value : '', 'symbol-runner') + '-ran-grid.html';
    downloadBlob(html, 'text/html;charset=utf-8', filename);
    say('Saved ' + filename + ': a sheet of 40 to print (5 by 8), with a scoring key.');
  }

  function exportSymbolFlashcards() {
    if (!runnerCore || typeof runnerCore.buildPrintableSymbolCardsHtml !== 'function') {
      say('Printable flashcards export is unavailable on this page.');
      return;
    }
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var titleText = titleInput && titleInput.value.trim() ? titleInput.value.trim() : 'Symbol Runner Flashcards';
    var html = runnerCore.buildPrintableSymbolCardsHtml({
      modeId: customVal ? 'custom' : modeId,
      customSymbols: customVal || undefined,
      pictures: pictures,
      title: titleText,
    });
    var filename = slug(titleInput ? titleInput.value : '', 'symbol-runner') + '-flashcards.html';
    downloadBlob(html, 'text/html;charset=utf-8', filename);
    say('Downloaded ' + filename + ' (cut-and-fold flashcards and answer key).');
  }

  function exportCccSheet() {
    if (!runnerCore || typeof runnerCore.buildPrintableCccSheetHtml !== 'function') {
      say('Cover, Copy, Compare sheet export is unavailable on this page.');
      return;
    }
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var titleText = titleInput && titleInput.value.trim() ? titleInput.value.trim() : 'Symbol Runner Cover, Copy, Compare';
    var html = runnerCore.buildPrintableCccSheetHtml({
      modeId: customVal ? 'custom' : modeId,
      customSymbols: customVal || undefined,
      pictures: pictures,
      title: titleText,
    });
    var filename = slug(titleInput ? titleInput.value : '', 'symbol-runner') + '-ccc-sheet.html';
    downloadBlob(html, 'text/html;charset=utf-8', filename);
    say('Downloaded ' + filename + ' (Cover, Copy, Compare sheet and answer key).');
  }

  function openInPresentExport() {
    var pool = currentPool();
    var seen = Object.create(null);
    var words = [];
    pool.forEach(function (sym) {
      var cand = String((sym && (sym.answer || sym.display)) || '').trim();
      if (!/^[A-Za-z]{2,16}$/.test(cand)) return;
      var k = cand.toLowerCase();
      if (seen[k] || words.length >= 40) return;
      seen[k] = true;
      words.push(cand);
    });
    if (!words.length) {
      say('Choose Sight words, Prefixes and suffixes, or enter 2-letter+ custom words to open in Present and Export.');
      return false;
    }
    var a = doc.createElement('a');
    a.href = 'packets-present-export.html#words=' + encodeURIComponent(words.join(','));
    a.hidden = true;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    return true;
  }

  function applyReopenHtml(htmlText, fileName, rawBytes) {
    if (!verify || typeof verify.readParts !== 'function' || !builder || typeof builder.readBack !== 'function') {
      setReopenStatus('File reopen support is unavailable on this page.');
      return false;
    }
    var textVal = String(htmlText || '');
    var parts = verify.readParts(textVal);
    var encodedBytes = rawBytes || (typeof root.TextEncoder === 'function' ? new root.TextEncoder().encode(textVal) : null);
    function tryOtherMaker(fallbackMsg) {
      var other = reopenKit && typeof reopenKit.identify === 'function'
        ? reopenKit.identify(encodedBytes || textVal, { verify: verify })
        : (reopenKit && typeof reopenKit.read === 'function'
          ? reopenKit.read(encodedBytes || textVal, { verify: verify, wordSounds: [] })
          : null);
      if (other && other.page && other.page.href) {
        var msg = other.why || fallbackMsg;
        setReopenStatus(msg, { href: other.page.href, name: other.page.name, bytes: encodedBytes, fileName: fileName });
        say(msg);
        return true;
      }
      setReopenStatus(fallbackMsg);
      say(fallbackMsg);
      return false;
    }
    if (!parts || !parts.ok) {
      var why = parts && parts.kind === 'results'
        ? 'That looks like a results file, not a practice or check file.'
        : 'That file does not look like a saved Symbol Runner HTML file.';
      tryOtherMaker(why);
      return false;
    }
    var back = builder.readBack(parts);
    if (!back || back.ok === false) {
      var notSr = (back && back.why) || 'That file was made with another maker, not Symbol Runner.';
      tryOtherMaker(notSr);
      return false;
    }
    if (modeSelect && back.mode) {
      modeSelect.value = back.mode;
    }
    if (customInput) {
      if (typeof back.custom === 'string' && back.custom.trim()) {
        customInput.value = back.custom;
      } else if (back.mode === 'custom') {
        if (typeof back.items === 'string') {
          customInput.value = back.items;
        } else if (Array.isArray(back.items)) {
          customInput.value = back.items.map(function (it) {
            if (typeof it === 'string') return it;
            if (!it || typeof it !== 'object') return '';
            return it.answer && it.display && it.answer !== it.display ? (it.display + '|' + it.answer) : (it.display || it.answer || '');
          }).filter(Boolean).join(', ');
        } else {
          customInput.value = '';
        }
      } else {
        customInput.value = '';
      }
    }
    if (back.control) {
      var cr = doc.querySelector('input[name="sr-control"][value="' + back.control + '"]');
      if (cr) cr.checked = true;
    }
    if (back.viewMode) {
      var vr = doc.querySelector('input[name="sr-view"][value="' + back.viewMode + '"]');
      if (vr) vr.checked = true;
    }
    var nextPacketMode = back.packetMode === 'check' ? 'check' : 'practice';
    var pmr = doc.querySelector('input[name="sr-packet-mode"][value="' + nextPacketMode + '"]');
    if (pmr) pmr.checked = true;
    if (untimedCheck) untimedCheck.checked = !!back.untimed;
    if (teacherCodeInput) teacherCodeInput.value = '';
    if (rehearsalCheck) {
      rehearsalCheck.checked = !!back.rehearsal && nextPacketMode !== 'check';
    }
    if (includeAudioCheck) {
      includeAudioCheck.checked = typeof back.includeAudio === 'boolean' ? back.includeAudio : true;
    }
    if (audioModeSelect) {
      audioModeSelect.value = back.audioMode === 'name' || back.audioMode === 'sound' ? back.audioMode : 'auto';
    }
    if (knownInput) {
      knownInput.value = Array.isArray(back.known) ? back.known.join(', ') : String(back.known || '');
    }
    if (titleInput && typeof back.title === 'string') {
      titleInput.value = back.title;
    }
    if (learnersInput && typeof back.learner === 'string') {
      learnersInput.value = back.learner;
      if (back.learner && $('sr-batch')) $('sr-batch').open = true;
    }
    var reopenedPool = currentPool();
    pictures = {};
    if (back.pictures && typeof back.pictures === 'object') {
      Object.keys(back.pictures).forEach(function (k) {
        var pic = back.pictures[k];
        if (pic && pic.src) {
          var entry = {
            src: pic.src,
            alt: pic.alt || k,
            credit: pic.credit || '',
            set: pic.set || 'custom',
          };
          pictures[k] = entry;
          var lowerKey = k.toLowerCase();
          reopenedPool.forEach(function (s) {
            if (s && s.answer && String(s.answer).toLowerCase() === lowerKey) {
              pictures[s.answer] = entry;
            }
          });
        }
      });
    }
    syncPacketModeUi();
    drawModeLine();
    savePreferences();
    renderPictureList();
    goTo(1, true);
    if (modeSelect && modeSelect.value === 'sight_words') loadWordAudio();
    var label = fileName ? ('Loaded settings from "' + String(fileName).slice(0, 80) + '".') : 'Loaded settings from the saved HTML file.';
    setReopenStatus(label + ' Change what you want, then make the new file in step 3.' + (nextPacketMode === 'check' ? ' This page cannot read a teacher code back from a file: type it again in step 2 if you want one.' : ''));
    say(label);
    return true;
  }

  function takeHanded() {
    if (!handoff || typeof handoff.take !== 'function') return Promise.resolve(false);
    if (!root.location || root.location.hash !== handoff.HASH) return Promise.resolve(false);
    try {
      if (root.history && typeof root.history.replaceState === 'function') {
        root.history.replaceState(null, '', root.location.href.split('#')[0]);
      }
    } catch (_) {}
    return handoff.take().then(function (file) {
      if (!file) {
        setReopenStatus('The handed-over file is not here any more. Choose it with Open a file I made.');
        return false;
      }
      var text = typeof root.TextDecoder === 'function'
        ? new root.TextDecoder('utf-8').decode(file.bytes)
        : '';
      return applyReopenHtml(text, file.name, file.bytes);
    }).catch(function () {
      setReopenStatus('This browser could not hand the file over. Choose it with Open a file I made.');
      return false;
    });
  }

  // A change after a save: the saved file and preview no longer match the choices.
  function choicesChanged() {
    previewDirty = true;
    preparedBaseHtml = '';
    preparedPreviewHtml = '';
    var after = $('sr-after-save');
    if (after) after.hidden = true;
    if (step === 3) { drawSummary(); drawBatch(); prepareStep3Preview(); }
  }

  function goTo(wanted, quiet) {
    var target = wanted === 2 || wanted === 3 ? wanted : 1;
    step = target;
    [1, 2, 3].forEach(function (n) {
      var section = $('step-' + n);
      if (section) section.hidden = n !== step;
    });
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      var n = Number(tab.getAttribute('data-go'));
      if (n === step) tab.setAttribute('aria-current', 'step'); else tab.removeAttribute('aria-current');
      if (tab.classList) tab.classList.toggle('is-done', n < step);
    });
    var nameEl = $('product-name');
    var productName = nameEl ? String(nameEl.textContent || '').trim() : '';
    doc.title = (productName ? productName + ': ' : '') + 'Make Symbol Runner practice, step ' + step + ' of 3';
    if (step === 2) startLive(); else stopLive();
    if (step === 3) { drawSummary(); drawBatch(); prepareStep3Preview(); }
    if (!quiet) {
      var heading = $('step-' + step + '-title');
      if (heading && typeof heading.focus === 'function') {
        heading.focus();
        if (typeof heading.scrollIntoView === 'function') heading.scrollIntoView({ block: 'start' });
      }
    }
  }

  // Every file this page loads, shown under "See the details" (2026-11-17, as on Make Word Sounds practice).
  function listFiles() {
    var files = ['packets-symbol-runner.html'];
    Array.prototype.forEach.call(doc.querySelectorAll('link[href]'), function (link) { files.push(link.getAttribute('href')); });
    Array.prototype.forEach.call(doc.querySelectorAll('script[src]'), function (script) { files.push(script.getAttribute('src')); });
    var text = files.join(', ') + ' (and lame.min.js when making recordings smaller). Recordings: audio_bank/phonemes.json and audio_bank/letters.json; audio_bank/words.json for common sight words.'
      + ' When a word needs it: word_audio_shards/index.json and the small sound files it names. For Try it: ' + TRY_PAGE + ' and packets-try.js.';
    Array.prototype.forEach.call(doc.querySelectorAll('[data-show-files]'), function (node) { node.textContent = text; });
  }

  function bindEvents() {
    if (modeSelect) {
      modeSelect.addEventListener('change', function () {
        drawModeLine();
        savePreferences();
        renderPictureList();
        autoFillPictures(true);
        if (modeSelect.value === 'sight_words') ensurePoolWordAudio(currentPool(), 'sight_words', false);
      });
    }
    if (customInput) {
      customInput.addEventListener('change', function () {
        savePreferences();
        renderPictureList();
        startLive();
      });
    }
    doc.querySelectorAll('input[name="sr-control"], input[name="sr-view"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        savePreferences();
        startLive();
      });
    });
    doc.querySelectorAll('input[name="sr-packet-mode"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        syncPacketModeUi();
        savePreferences();
      });
    });
    if (untimedCheck) untimedCheck.addEventListener('change', savePreferences);
    if (includeAudioCheck) includeAudioCheck.addEventListener('change', savePreferences);
    if (audioModeSelect) {
      audioModeSelect.addEventListener('change', function () {
        if (activeRunner && typeof activeRunner.setAudioMode === 'function') {
          activeRunner.setAudioMode(audioModeValue());
        }
        savePreferences();
      });
    }
    if (rehearsalCheck) {
      rehearsalCheck.addEventListener('change', function () {
        if (rehearsalBox) rehearsalBox.hidden = !rehearsalCheck.checked || packetModeValue() === 'check';
        savePreferences();
        startLive();
      });
    }
    if (hcCheck) hcCheck.addEventListener('change', function () { savePreferences(); startLive(); });
    if (startLiveBtn) startLiveBtn.addEventListener('click', startLive);
    Array.prototype.forEach.call(doc.querySelectorAll('.step-tab'), function (tab) {
      tab.addEventListener('click', function () { goTo(Number(tab.getAttribute('data-go'))); });
    });
    [['sr-next-1', 2], ['sr-back-2', 1], ['sr-next-2', 3], ['sr-back-3', 2], ['sr-fix-choices', 1]].forEach(function (pair) {
      var btn = $(pair[0]);
      if (btn) btn.addEventListener('click', function () { goTo(pair[1]); });
    });
    doc.addEventListener('change', function (ev) {
      var t = ev && ev.target;
      if (t && t.tagName === 'INPUT' && (t.type === 'radio' || t.type === 'checkbox')) markChoices();
      if (t !== learnersInput) choicesChanged();
    });
    [customInput, knownInput, teacherCodeInput, titleInput].forEach(function (input) {
      if (input) input.addEventListener('input', choicesChanged);
    });
    if ($('sr-code-show') && teacherCodeInput) {
      $('sr-code-show').addEventListener('click', function () {
        var shown = teacherCodeInput.type === 'text';
        teacherCodeInput.type = shown ? 'password' : 'text';
        this.setAttribute('aria-pressed', String(!shown));
        this.textContent = shown ? 'Show' : 'Hide';
        this.setAttribute('aria-label', shown ? 'Show the teacher code' : 'Hide the teacher code');
      });
    }
    if (learnersInput) learnersInput.addEventListener('input', function () { setBatchProblem(''); applySinglePreviewCode(); drawBatch(); });
    if ($('sr-batch-make')) $('sr-batch-make').addEventListener('click', saveBatchZip);
    if ($('sr-batch-load') && $('sr-batch-file')) {
      $('sr-batch-load').addEventListener('click', function () { $('sr-batch-file').value = ''; $('sr-batch-file').click(); });
      $('sr-batch-file').addEventListener('change', function () {
        var file = this.files && this.files[0];
        this.value = '';
        loadRosterFile(file);
      });
    }
    if (autoPicsBtn) autoPicsBtn.addEventListener('click', function () { autoFillPictures(false); });
    if (picFileEl) {
      picFileEl.addEventListener('change', function () {
        var file = picFileEl.files && picFileEl.files[0];
        var target = importTargetAnswer;
        if (!file || !target) return;
        var readerPromise = (myWords && typeof myWords.resizeToDataUri === 'function' && typeof file.slice === 'function')
          ? myWords.resizeToDataUri(file).catch(function (err) {
            if (err && (err.code === 'not_a_picture' || err.code === 'picture_too_big')) throw err;
            return readFileAsDataUri(file);
          })
          : readFileAsDataUri(file);
        readerPromise.then(function (uri) {
          pictures[target] = {
            src: uri,
            alt: target,
            credit: "The teacher's own picture.",
            set: 'custom',
            fromMyWords: true,
          };
          var persist = myWords && typeof myWords.putMedia === 'function'
            ? myWords.putMedia(target, { picture: { dataUri: uri, credit: { own: true } } }).catch(function () {})
            : Promise.resolve();
          return persist.then(function () {
            renderPictureList();
            startLive();
            choicesChanged();
            say('Updated cue picture for "' + target + '".');
          });
        }).catch(function (err) {
          say((err && err.message) || 'Could not read image.');
        });
      });
    }
    if (saveHtmlBtn) saveHtmlBtn.addEventListener('click', exportPracticePacket);
    if (tryPacketBtn) tryPacketBtn.addEventListener('click', previewPacket);
    if (savePptxBtn) savePptxBtn.addEventListener('click', exportPptxSlides);
    if (saveRanGridBtn) saveRanGridBtn.addEventListener('click', exportRanGrid);
    if (saveFlashcardsBtn) saveFlashcardsBtn.addEventListener('click', exportSymbolFlashcards);
    if (saveCccBtn) saveCccBtn.addEventListener('click', exportCccSheet);
    if (openPeBtn) openPeBtn.addEventListener('click', openInPresentExport);
    if (reopenBtn && reopenFile) {
      reopenBtn.addEventListener('click', function () {
        reopenFile.value = '';
        reopenFile.click();
      });
      reopenFile.addEventListener('change', function () {
        var file = reopenFile.files && reopenFile.files[0];
        if (!file) return;
        if (file.size > MAX_REOPEN_BYTES) {
          setReopenStatus('This file is too large to be a file made here.');
          return;
        }
        if (typeof root.FileReader !== 'function') {
          setReopenStatus('This browser cannot read local files here.');
          return;
        }
        var reader = new root.FileReader();
        reader.onload = function () { applyReopenHtml(String(reader.result || ''), file.name); };
        reader.onerror = function () { setReopenStatus('This browser could not read that file.'); };
        reader.readAsText(file);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        try {
          root.localStorage.removeItem(STORAGE_KEY);
          if (modeSelect) modeSelect.value = 'confusable_letters';
          if (customInput) customInput.value = '';
          if (knownInput) knownInput.value = '';
          if (teacherCodeInput) teacherCodeInput.value = '';
          if (learnersInput) learnersInput.value = '';
          if (titleInput) titleInput.value = 'Symbol Runner Practice';
          var defCtrl = doc.querySelector('input[name="sr-control"][value="direct"]');
          if (defCtrl) defCtrl.checked = true;
          var defView = doc.querySelector('input[name="sr-view"][value="3d"]');
          if (defView) defView.checked = true;
          var defMode = doc.querySelector('input[name="sr-packet-mode"][value="practice"]');
          if (defMode) defMode.checked = true;
          if (untimedCheck) untimedCheck.checked = false;
          if (rehearsalCheck) rehearsalCheck.checked = false;
          if (includeAudioCheck) includeAudioCheck.checked = true;
          if (audioModeSelect) audioModeSelect.value = 'auto';
          if (hcCheck) hcCheck.checked = false;
          pictures = {};
          syncPacketModeUi();
          drawModeLine();
          markChoices();
          renderPictureList();
          drawBatch();
          drawSettingsNow();
          choicesChanged();
          if (step === 2) startLive();
          if (clearStatusEl) clearStatusEl.textContent = 'Done. This browser no longer keeps your choices.';
        } catch (_) {
          if (clearStatusEl) clearStatusEl.textContent = 'Browser storage could not be cleared here.';
        }
      });
    }
  }

  function restorePreferences() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = safeJsonParse(raw);
      if (!saved || typeof saved !== 'object') return;
      if (typeof saved.mode === 'string' && modeSelect) modeSelect.value = saved.mode;
      if (saved.control === 'direct' || saved.control === 'lockon') {
        var cr = doc.querySelector('input[name="sr-control"][value="' + saved.control + '"]');
        if (cr) cr.checked = true;
      }
      if (saved.viewMode === '3d' || saved.viewMode === '2d' || saved.viewMode === 'grid') {
        var vr = doc.querySelector('input[name="sr-view"][value="' + saved.viewMode + '"]');
        if (vr) vr.checked = true;
      }
      if (saved.packetMode === 'practice' || saved.packetMode === 'check') {
        var pmr = doc.querySelector('input[name="sr-packet-mode"][value="' + saved.packetMode + '"]');
        if (pmr) pmr.checked = true;
      }
      if (untimedCheck && saved && typeof saved.untimed === 'boolean') {
        untimedCheck.checked = saved.untimed;
      }
      if (teacherCodeInput) teacherCodeInput.value = '';
      if (rehearsalCheck) {
        rehearsalCheck.checked = !!saved.rehearsal;
        if (rehearsalBox) rehearsalBox.hidden = !rehearsalCheck.checked;
      }
      if (includeAudioCheck && saved && typeof saved.includeAudio === 'boolean') {
        includeAudioCheck.checked = saved.includeAudio;
      }
      if (audioModeSelect && saved && (saved.audioMode === 'auto' || saved.audioMode === 'name' || saved.audioMode === 'sound')) {
        audioModeSelect.value = saved.audioMode;
      }
      if (hcCheck) hcCheck.checked = !!saved.highContrast;
      if (saved && saved.title && titleInput) titleInput.value = saved.title;
    } catch (_) {}
  }

  function applyRehearseHash() {
    var hash = root.location ? String(root.location.hash || '') : '';
    var match = /^#rehearse=(.+)$/i.exec(hash);
    if (!match) return false;
    var raw = '';
    try { raw = decodeURIComponent(match[1]); } catch (_) { raw = match[1]; }
    var seen = Object.create(null);
    var missed = [];
    raw.split(/[,;\s]+/).forEach(function (tok) {
      var clean = String(tok || '').trim();
      if (!clean || !/^[A-Za-z0-9]+$/.test(clean) || clean.length > 16) return;
      var k = clean.toLowerCase();
      if (seen[k] || missed.length >= 8) return;
      seen[k] = true;
      missed.push(clean);
    });
    if (!missed.length) return false;
    var allNums = missed.every(function (s) { return /^[0-9]+$/.test(s); });
    var anchorCandidates = allNums ? ['1', '2', '5', '10', '3', '4', '6', '7'] : ['s', 'm', 't', 'a', 'p', 'n', 'r', 'l'];
    var needAnchors = Math.max(3, 6 - missed.length);
    var anchors = anchorCandidates.filter(function (c) { return !seen[c.toLowerCase()]; }).slice(0, needAnchors);
    if (customInput) customInput.value = missed.concat(anchors).join(', ');
    if (knownInput) knownInput.value = anchors.join(', ');
    var pmPractice = doc.querySelector('input[name="sr-packet-mode"][value="practice"]');
    if (pmPractice) pmPractice.checked = true;
    if (rehearsalCheck) rehearsalCheck.checked = true;
    syncPacketModeUi();
    savePreferences();
    renderPictureList();
    try {
      if (root.history && typeof root.history.replaceState === 'function' && root.location) {
        root.history.replaceState(null, '', (root.location.pathname || '') + (root.location.search || ''));
      }
    } catch (_) {}
    goTo(2, true);
    say('Loaded ' + missed.length + ' missed symbols for Rehearsal with known facts. They are in step 1, under My own list.');
    return true;
  }

  function applyModeHash() {
    if (!modeSelect) return false;
    var hash = root.location ? String(root.location.hash || '') : '';
    var match = /^#mode=([a-z0-9_]+)$/i.exec(hash);
    if (!match) return false;
    var targetMode = match[1].toLowerCase();
    var hasOption = Array.prototype.some.call(modeSelect.options || [], function (opt) {
      return opt && opt.value === targetMode;
    });
    if (!hasOption) return false;
    try {
      if (root.history && typeof root.history.replaceState === 'function' && root.location) {
        root.history.replaceState(null, '', (root.location.pathname || '') + (root.location.search || ''));
      }
    } catch (_) {}
    modeSelect.value = targetMode;
    if (customInput) customInput.value = '';
    var pmPractice = doc.querySelector('input[name="sr-packet-mode"][value="practice"]');
    if (pmPractice) pmPractice.checked = true;
    syncPacketModeUi();
    savePreferences();
    drawModeLine();
    renderPictureList();
    goTo(1, true);
    if (targetMode === 'sight_words') loadWordAudio();
    say('Loaded "' + modeName(targetMode) + '" for practice.');
    return true;
  }

  function applySymbolsHash() {
    var hash = root.location ? String(root.location.hash || '') : '';
    var match = /^#symbols=(.+)$/i.exec(hash);
    if (!match) return false;
    var raw = '';
    try { raw = decodeURIComponent(match[1]); } catch (_) { raw = match[1]; }
    var seen = Object.create(null);
    var items = [];
    raw.split(/[,;\s]+/).forEach(function (tok) {
      var clean = String(tok || '').trim();
      if (!/^[A-Za-z0-9]{1,20}$/.test(clean)) return;
      var k = clean.toLowerCase();
      if (seen[k] || items.length >= 40) return;
      seen[k] = true;
      items.push(clean);
    });
    if (items.length < 2) return false;
    try {
      if (root.history && typeof root.history.replaceState === 'function' && root.location) {
        root.history.replaceState(null, '', (root.location.pathname || '') + (root.location.search || ''));
      }
    } catch (_) {}
    if (modeSelect) modeSelect.value = 'custom';
    if (customInput) customInput.value = items.join(', ');
    if (rehearsalCheck) rehearsalCheck.checked = false;
    var pmPractice = doc.querySelector('input[name="sr-packet-mode"][value="practice"]');
    if (pmPractice) pmPractice.checked = true;
    syncPacketModeUi();
    drawModeLine();
    savePreferences();
    renderPictureList();
    goTo(1, true);
    say('Loaded ' + items.length + ' items into Symbol Runner. They are in step 1, under My own list.');
    return true;
  }

  restorePreferences();
  syncPacketModeUi();
  drawModeLine();
  listFiles();
  if (loader && loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_csv && $('sr-csv-label')) {
    $('sr-csv-label').textContent = String(loader.DEFAULT_LABELS.save_csv);
  }
  if (loader && loader.DEFAULT_LABELS && loader.DEFAULT_LABELS.save_work && $('sr-work-label')) {
    $('sr-work-label').textContent = String(loader.DEFAULT_LABELS.save_work);
  }
  bindEvents();
  drawSetChooser();
  // Step 2's Settings fold says on its top line what the settings are now.
  function drawSettingsNow() {
    var nowEl = doc.getElementById('sr-more-2-now');
    if (!nowEl) return;
    var pick = function (sel) { var el = doc.querySelector(sel); return el || null; };
    var check = pick('input[name="sr-packet-mode"][value="check"]');
    var lock = pick('input[name="sr-control"][value="lockon"]');
    var parts = [lock && lock.checked ? 'Point at the card first' : 'Answer right away'];
    if (check && check.checked) {
      var untimed = pick('#sr-untimed'), code = pick('#sr-teacher-code');
      parts.push(untimed && untimed.checked ? 'no clock' : '60-second clock');
      if (code && String(code.value || '').length >= 4) parts.push('teacher code set');
    } else {
      var rehearse = pick('#sr-rehearsal'), audio = pick('#sr-include-audio');
      if (rehearse && rehearse.checked) parts.push('rehearsal with known symbols');
      parts.push(audio && !audio.checked ? 'no sounds in the file' : 'sounds in the file');
    }
    var pics = doc.querySelectorAll('#sr-pic-list img').length;
    if (pics) parts.push(pics === 1 ? '1 picture' : pics + ' pictures');
    nowEl.textContent = parts.join(' · ');
  }
  doc.addEventListener('change', drawSettingsNow);
  doc.addEventListener('input', drawSettingsNow);
  drawSettingsNow();
  // "#check-mode" / "#practice-mode" (the front door's cards) start on that kind of file, whatever was remembered.
  (function applyKindHash() {
    var hash = root.location ? String(root.location.hash || '') : '';
    var kind = /^#(check|practice)-mode$/i.exec(hash);
    if (!kind) return;
    var radio = doc.querySelector('input[name="sr-packet-mode"][value="' + kind[1].toLowerCase() + '"]');
    if (!radio) return;
    try { if (root.history && typeof root.history.replaceState === 'function') root.history.replaceState(null, '', (root.location.pathname || '') + (root.location.search || '')); } catch (_) {}
    radio.checked = true;
    syncPacketModeUi();
    savePreferences();
    drawSettingsNow();
  })();
  var initializedFromHash = applyRehearseHash() || applyModeHash() || applySymbolsHash();
  if (!initializedFromHash) {
    renderPictureList();
    goTo(1, true);
  }
  loadPhonemeAudio();
  loadLetterAudio();
  if (myWords && typeof myWords.onChange === 'function') {
    myWords.onChange(function (change) {
      if (!change || !change.here) {
        lastMyMediaSig = '';
        loadMyWordsPictures().then(function () { renderPictureList(); startLive(); choicesChanged(); });
      }
    });
  }
  takeHanded().then(function (opened) {
    if (!opened) autoFillPictures(true);
  });

  root.AlloPacketsSymbolRunner = {
    startLive: startLive,
    autoFillPictures: autoFillPictures,
    exportPracticePacket: exportPracticePacket,
    previewPacket: previewPacket,
    exportPptxSlides: exportPptxSlides,
    exportRanGrid: exportRanGrid,
    exportSymbolFlashcards: exportSymbolFlashcards,
    exportCccSheet: exportCccSheet,
    openInPresentExport: openInPresentExport,
    reopenFromText: applyReopenHtml,
    takeHanded: takeHanded,
    applyRehearseHash: applyRehearseHash,
    applyModeHash: applyModeHash,
    applySymbolsHash: applySymbolsHash,
    getPictures: function () { return pictures; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
