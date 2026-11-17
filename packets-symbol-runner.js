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
  var wpMedia = root.AlloWordPracticeMedia;
  var wpUi = root.AlloModules && root.AlloModules.WordPractice;

  function $(id) { return doc.getElementById(id); }

  var modeSelect = $('sr-mode');
  var customInput = $('sr-custom');
  var rehearsalCheck = $('sr-rehearsal');
  var rehearsalBox = $('sr-rehearsal-box');
  var knownInput = $('sr-known');
  var hcCheck = $('sr-hc');
  var titleInput = $('sr-title');
  var learnersInput = $('sr-learners');
  var codeNameInput = $('sr-code-name');
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

  var pictures = {};
  var phonemeAudio = {};
  var letterAudio = {};
  var wordAudio = {};
  var wordAudioPromise = null;
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
  var batchFile = null;
  var MAX_STUDENTS = 40;
  var TRY_PAGE = 'packets-try.html';

  function loadAudioJson(url, targetMap, onLoaded) {
    if (typeof root.fetch !== 'function') return Promise.resolve(targetMap);
    return root.fetch(url).then(function (res) {
      if (!res || !res.ok) return targetMap;
      return res.json();
    }).then(function (data) {
      if (data && typeof data === 'object') {
        var srcMap = data.clips && typeof data.clips === 'object' ? data.clips : data;
        Object.keys(srcMap).forEach(function (k) {
          if (typeof srcMap[k] === 'string' && /^data:audio\//i.test(srcMap[k])) {
            targetMap[String(k).toLowerCase()] = srcMap[k];
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
        activeRunner.setWordAudio(wordAudio);
      }
    });
    return wordsJsonPromise;
  }

  function poolWordTargets(pool, resolvedMode) {
    var out = [];
    var seen = Object.create(null);
    (pool || []).forEach(function (item) {
      if (!item || item.dots > 0) return;
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
      shardIndexPromise = root.fetch('word_audio_shards/index.json').then(function (res) {
        if (!res || !res.ok) return null;
        return typeof res.json === 'function' ? res.json() : res.text().then(function (txt) {
          return JSON.parse(txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt);
        });
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
          shardFilePromises[url] = root.fetch(url).then(function (res) {
            if (!res || !res.ok) return null;
            return typeof res.json === 'function' ? res.json() : res.text().then(function (txt) {
              return JSON.parse(txt.charCodeAt(0) === 0xFEFF ? txt.slice(1) : txt);
            });
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
          activeRunner.setWordAudio(wordAudio);
        }
        return wordAudio;
      });
    });
  }

  function ensurePoolWordAudio(pool, resolvedMode, convertToPortable) {
    var targets = poolWordTargets(pool, resolvedMode);
    if (!targets.length || typeof root.fetch !== 'function') return Promise.resolve(wordAudio);
    var firstStep = resolvedMode === 'sight_words' ? loadWordAudio() : Promise.resolve(wordAudio);
    return firstStep.then(function () {
      return loadShardWordAudio(targets);
    }).then(function () {
      var OfflineCtx = root.OfflineAudioContext || root.webkitOfflineAudioContext;
      if (!convertToPortable || !loader || typeof loader.portableAudio !== 'function' || !OfflineCtx) return wordAudio;
      var todoAudio = {};
      var keys = [];
      targets.forEach(function (w) {
        var uri = wordAudio[w];
        if (typeof uri === 'string' && /^data:audio\/webm/i.test(uri)) {
          todoAudio[w] = uri;
          keys.push(w);
        }
      });
      if (!keys.length) return wordAudio;
      return loader.portableAudio({ audio: todoAudio }, {
        AudioContext: function () { return new OfflineCtx(1, 1, 22050); },
      }).then(function () {
        keys.forEach(function (w) {
          if (typeof todoAudio[w] === 'string' && /^data:audio\/(?:wav|x-wav|wave)[;,]/i.test(todoAudio[w])) {
            wordAudio[w] = todoAudio[w];
          }
        });
        return wordAudio;
      }).catch(function () { return wordAudio; });
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
        if (linkInfo.href !== 'packets-results.html' && handoff && typeof handoff.put === 'function' && linkInfo.bytes) {
          handoff.put({ name: linkInfo.fileName || 'packet.html', bytes: linkInfo.bytes }).then(function (ok) {
            nav(ok ? (linkInfo.href + (handoff.HASH || '#open-file')) : linkInfo.href);
          }, function () { nav(linkInfo.href); });
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
  function drawModeLine() {
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

  function svgToPngDataUri(svgText) {
    if (wpUi && typeof wpUi.rasterizeImage === 'function') {
      return wpUi.rasterizeImage(svgText, doc);
    }
    var src = /^data:/i.test(svgText) ? svgText : ('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText));
    return Promise.resolve(src);
  }

  function readFileAsDataUri(file) {
    if (wpUi && typeof wpUi.rasterizeImage === 'function') {
      return wpUi.rasterizeImage(file, doc);
    }
    return new Promise(function (resolve, reject) {
      if (typeof root.FileReader !== 'function') { reject(new Error('File reader is unavailable.')); return; }
      var reader = new root.FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
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

      if (pic && pic.src) {
        var rmBtn = doc.createElement('button');
        rmBtn.type = 'button';
        rmBtn.className = 'btn btn-small';
        rmBtn.textContent = 'Remove';
        rmBtn.addEventListener('click', function () {
          delete pictures[sym.answer];
          renderPictureList();
          startLive();
        });
        bar.appendChild(rmBtn);
      }
      card.appendChild(bar);
      picListEl.appendChild(card);
    });
  }

  function autoFillPictures(quiet) {
    return ensureSymbolsReady().then(function (bank) {
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
      var knownSet = {};
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
      wordAudio: wordAudio,
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

  function withAudioBanks(wantAudio, done) {
    var modeId = modeSelect ? modeSelect.value : 'confusable_letters';
    var customVal = customInput ? customInput.value.trim() : '';
    var resolvedMode = customVal ? 'custom' : modeId;
    var pool = currentPool();
    var wTargets = wantAudio ? poolWordTargets(pool, resolvedMode) : [];
    var needP = wantAudio && !Object.keys(phonemeAudio).length && typeof root.fetch === 'function';
    var needL = wantAudio && !Object.keys(letterAudio).length && typeof root.fetch === 'function';
    var needW = wantAudio && wTargets.length > 0 && typeof root.fetch === 'function';
    if (!needP && !needL && !needW) {
      done(phonemeAudio, letterAudio, wordAudio);
      return;
    }
    Promise.all([
      needP ? loadPhonemeAudio() : Promise.resolve(phonemeAudio),
      needL ? loadLetterAudio() : Promise.resolve(letterAudio),
      needW ? ensurePoolWordAudio(pool, resolvedMode, true) : Promise.resolve(wordAudio),
    ]).then(function () {
      done(phonemeAudio, letterAudio, wordAudio);
    });
  }

  function buildCurrentPacket(pBank, lBank, wBank) {
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
    if (wantAudio && runnerCore && typeof runnerCore.resolvePhonemeAudioUri === 'function') {
      currentPool().forEach(function (item) {
        var uri = runnerCore.resolvePhonemeAudioUri(item, pBank, {
          letterAudio: lBank,
          wordAudio: wBank,
          audioMode: aMode,
          modeId: resolvedMode,
        });
        if (uri) {
          clipMap[item.answer] = uri;
          clipMap[String(item.answer).toLowerCase()] = uri;
          if (item.display) clipMap[item.display] = uri;
        }
      });
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

  // "Make one for each student": the code names typed in that fold, one on each line (2026-11-17, as on the other makers).
  function batchList() {
    var seen = Object.create(null);
    var out = { names: [], twice: [], unusable: [], over: 0 };
    String((learnersInput && learnersInput.value) || '').split(/[\r\n,]+/).forEach(function (raw) {
      if (!String(raw || '').trim()) return;
      var name = builder && typeof builder.codeName === 'function' ? builder.codeName(raw) : String(raw || '').trim();
      if (!name) { out.unusable.push(String(raw).trim().slice(0, 40)); return; }
      var key = name.toLowerCase();
      if (seen[key]) { if (out.twice.indexOf(name) < 0) out.twice.push(name); return; }
      seen[key] = true;
      if (out.names.length >= MAX_STUDENTS) { out.over++; return; }
      out.names.push(name);
    });
    return out;
  }

  function singleCodeName() {
    var raw = codeNameInput ? codeNameInput.value : '';
    return builder && typeof builder.codeName === 'function' ? builder.codeName(raw) : String(raw || '').trim();
  }

  function fileSize(bytes) {
    var n = Number(bytes) || 0;
    return n >= 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1000)) + ' KB';
  }

  function setBatchSaid(msg) { var el = $('sr-batch-said'); if (el) el.textContent = String(msg || ''); }
  function setBatchProblem(msg) { var el = $('sr-batch-problem'); if (el) el.textContent = String(msg || ''); }

  function drawBatch() {
    var list = batchList();
    var parts = [];
    if (!list.names.length) parts.push('Type or paste the code names, one on each line.');
    else parts.push(list.names.length + (list.names.length === 1 ? ' file.' : ' files.'));
    if (list.over) parts.push('Not used: ' + list.over + ' more. At most ' + MAX_STUDENTS + ' go in one .zip file.');
    if (list.twice.length) parts.push('Listed more than once, used once: ' + list.twice.join(', ') + '.');
    if (list.unusable.length) parts.push('Not used, because a code name needs a letter or a number: ' + list.unusable.join(', ') + '.');
    if (batchFile) parts = ['Ready: ' + batchFile.count + (batchFile.count === 1 ? ' file' : ' files') + ' in one .zip file, ' + fileSize(batchFile.bytes) + '.'];
    setBatchSaid(parts.join(' '));
  }

  function dropBatchFile() {
    batchFile = null;
    var saveBtn = $('sr-batch-save');
    if (saveBtn) saveBtn.hidden = true;
  }

  function makeBatch() {
    setBatchProblem('');
    dropBatchFile();
    if (!builder || !loader) { setBatchProblem('The part that makes the file did not load. Load the page again.'); return; }
    var list = batchList();
    if (!list.names.length) { setBatchProblem('Type at least one code name.'); return; }
    if (!root.AlloPacketZip || typeof root.AlloPacketZip.create !== 'function') { setBatchProblem('This page could not load the part that makes .zip files. Load the page again.'); return; }
    var pMode = packetModeValue();
    var wantAudio = pMode !== 'check' && (!includeAudioCheck || includeAudioCheck.checked);
    setBatchSaid('Making the files.');
    withAudioBanks(wantAudio, function (pBank, lBank, wBank) {
      try {
        var built = buildCurrentPacket(pBank, lBank, wBank);
        var baseName = slug(titleInput ? titleInput.value : '', 'symbol-runner');
        var kindSuffix = pMode === 'check' ? '-check' : '';
        var zip = root.AlloPacketZip.create();
        var encoder = typeof root.TextEncoder === 'function' ? new root.TextEncoder() : null;
        list.names.forEach(function (name) {
          var htmlOut = builder.withCodeName(built.html, name);
          zip.add(baseName + '-' + slug(name, 'student') + kindSuffix + '.html', encoder ? encoder.encode(htmlOut) : htmlOut);
        });
        var zipParts = zip.finish();
        batchFile = { parts: zipParts, bytes: zip.bytes || 0, count: list.names.length, name: baseName + kindSuffix + '-files.zip' };
      } catch (err) {
        setBatchProblem('The .zip file could not be made (' + ((err && err.message) || 'unknown problem') + ').');
        drawBatch();
        return;
      }
      var saveBtn = $('sr-batch-save');
      if (saveBtn) saveBtn.hidden = false;
      drawBatch();
    });
  }

  function saveBatch() {
    if (!batchFile) return;
    var zipBlob = new root.Blob(batchFile.parts, { type: 'application/zip' });
    downloadBlob(zipBlob, 'application/zip', batchFile.name);
    setBatchSaid('Saved ' + batchFile.name + '. Each file\'s name ends with the student\'s code name. Send each student their own file.');
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
    withAudioBanks(wantAudio, function (pBank, lBank, wBank) {
      try {
        var built = buildCurrentPacket(pBank, lBank, wBank);
        var baseName = slug(titleInput ? titleInput.value : '', 'symbol-runner');
        var kindSuffix = pMode === 'check' ? '-check' : '';
        var name = singleCodeName();
        var single = name ? builder.withCodeName(built.html, name) : built.html;
        var suffix = (name ? ('-' + slug(name, 'student')) : '') + kindSuffix;
        downloadBlob(single, 'text/html;charset=utf-8', baseName + suffix + '.html');
        say('Saved ' + baseName + suffix + '.html, ' + (pMode === 'check' ? 'a 1-minute check.' : 'a practice file.'));
        showAfterSave();
      } catch (err) {
        say((err && err.message) || 'Could not build that file.');
        if (pMode === 'check' && tCode && /teacher code/i.test(String(err && err.message)) && teacherCodeInput && typeof teacherCodeInput.focus === 'function') {
          goTo(2, true);
          teacherCodeInput.focus();
        }
      }
    });
  }

  // Step 3's "The file is ready" line, from the builder's plan (no sounds are needed to count the cards).
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
    lineEl.textContent = parts[0] + '. ' + parts.slice(1).join(' ');
    box.hidden = false;
  }

  function previewPacket() {
    if (!builder || !loader) {
      say('Practice file builder is unavailable here.');
      return;
    }
    var pMode = packetModeValue();
    var wantAudio = pMode !== 'check' && (!includeAudioCheck || includeAudioCheck.checked);
    withAudioBanks(wantAudio, function (pBank, lBank, wBank) {
      try {
        var built = buildCurrentPacket(pBank, lBank, wBank);
        if (previewBlobUrl && root.URL && typeof root.URL.revokeObjectURL === 'function') {
          try { root.URL.revokeObjectURL(previewBlobUrl); } catch (_) {}
        }
        var name = singleCodeName();
        if (name) built.html = builder.withCodeName(built.html, name);
        var blob = new root.Blob([built.html], { type: 'text/html' });
        previewBlobUrl = root.URL.createObjectURL(blob);
        if (handoff && typeof handoff.hostPreview === 'function') {
          if (previewSession && typeof previewSession.update === 'function') {
            previewSession.update({ url: previewBlobUrl, html: built.html });
          } else {
            previewSession = handoff.hostPreview({ url: previewBlobUrl, html: built.html });
          }
        }
        var link = doc.createElement('a');
        link.href = TRY_PAGE + '#' + previewBlobUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.hidden = true;
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
        say('Try it opened in a new tab.');
      } catch (err) {
        say((err && err.message) || 'Could not preview that file.');
      }
    });
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
      var other = reopenKit && typeof reopenKit.read === 'function'
        ? reopenKit.read(encodedBytes || textVal, { verify: verify, wordSounds: [] })
        : null;
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
    if (modeSelect && back.mode && back.mode !== 'custom') {
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
    if (codeNameInput && typeof back.learner === 'string') {
      codeNameInput.value = back.learner;
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

  // A change after a save: the saved file and a made .zip no longer match the choices.
  function choicesChanged() {
    var after = $('sr-after-save');
    if (after) after.hidden = true;
    if (batchFile) { dropBatchFile(); drawBatch(); }
    if (step === 3) drawSummary();
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
    if (step === 3) { drawSummary(); drawBatch(); }
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
    var text = files.join(', ') + '. Recordings: audio_bank/phonemes.json and audio_bank/letters.json; audio_bank/words.json for common sight words.'
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
        if (modeSelect.value === 'sight_words') loadWordAudio();
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
    [customInput, knownInput, teacherCodeInput, titleInput, codeNameInput].forEach(function (input) {
      if (input) input.addEventListener('input', choicesChanged);
    });
    if (learnersInput) learnersInput.addEventListener('input', function () { dropBatchFile(); setBatchProblem(''); drawBatch(); });
    if ($('sr-batch-make')) $('sr-batch-make').addEventListener('click', makeBatch);
    if ($('sr-batch-save')) $('sr-batch-save').addEventListener('click', saveBatch);
    if (autoPicsBtn) autoPicsBtn.addEventListener('click', function () { autoFillPictures(false); });
    if (picFileEl) {
      picFileEl.addEventListener('change', function () {
        var file = picFileEl.files && picFileEl.files[0];
        if (!file || !importTargetAnswer) return;
        readFileAsDataUri(file).then(function (uri) {
          pictures[importTargetAnswer] = {
            src: uri,
            alt: importTargetAnswer,
            credit: 'Custom imported image',
            set: 'custom',
          };
          renderPictureList();
          startLive();
          say('Updated cue picture for "' + importTargetAnswer + '".');
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
      var saved = JSON.parse(raw);
      if (saved && saved.mode && modeSelect) modeSelect.value = saved.mode;
      if (saved && saved.control) {
        var cr = doc.querySelector('input[name="sr-control"][value="' + saved.control + '"]');
        if (cr) cr.checked = true;
      }
      if (saved && saved.viewMode) {
        var vr = doc.querySelector('input[name="sr-view"][value="' + saved.viewMode + '"]');
        if (vr) vr.checked = true;
      }
      if (saved && saved.packetMode) {
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
    var seen = {};
    var missed = [];
    raw.split(/[,;\s]+/).forEach(function (tok) {
      var clean = String(tok || '').trim();
      if (!clean || !/^[A-Za-z0-9]+$/.test(clean) || clean.length > 8) return;
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
    var seen = {};
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
  bindEvents();
  var initializedFromHash = applyRehearseHash() || applyModeHash() || applySymbolsHash();
  if (!initializedFromHash) {
    renderPictureList();
    goTo(1, true);
  }
  loadPhonemeAudio();
  loadLetterAudio();
  if (modeSelect && modeSelect.value === 'sight_words') loadWordAudio();
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
