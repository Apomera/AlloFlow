// Standalone Present & Export on AlloFlow Packets (packets-present-export.html).
// Mounts AlloModules.WordPractice inline using local offline banks:
//   - packets_vocab_bank_en.js (meanings and example sentences)
//   - word_sounds_phonemes_en.js + word_sounds_core.js (sound segmentation)
//   - audio_bank/phonemes.json + word_audio_shards/ via packets_vocab_media.js (recorded speech)
//   - word_sounds_symbols_en.js (1,000+ Mulberry and OpenMoji pictures)
//   - vendor/pptxgenjs-3.12.0.bundle.js (loaded on demand for PowerPoint export)
(function (root) {
  'use strict';

  var doc = root.document;
  var $ = function (id) { return doc.getElementById(id); };
  var statusEl = $('pe-status');
  var clearStatusEl = $('pe-clear-status');
  var host = $('present-export-host');
  var wordSourceSelect = $('pe-word-source');
  var savedGroupEl = $('pe-saved-group');
  var myWordsOpt = $('pe-load-my-words');
  var vocabWordsOpt = $('pe-load-vocab-words');
  var wsWordsOpt = $('pe-load-ws-words');
  var customWordOpt = $('pe-custom-opt');
  var sheetTypeSelect = $('pe-sheet-type');
  var sheetDownloadBtn = $('pe-sheet-download');
  var openSrBtn = $('pe-open-symbol-runner');
  var findOnlineLink = $('pe-find-online');
  var moreNowEl = $('pe-more-now');

  function syncSavedGroup() {
    if (!savedGroupEl) return;
    var any = (myWordsOpt && !myWordsOpt.hidden) || (vocabWordsOpt && !vocabWordsOpt.hidden) || (wsWordsOpt && !wsWordsOpt.hidden);
    savedGroupEl.hidden = !any;
  }

  function syncWordSource(value, customLabel) {
    if (!wordSourceSelect) return;
    if (value === 'custom') {
      if (customWordOpt) {
        customWordOpt.textContent = customLabel || 'Custom word list';
        customWordOpt.hidden = false;
      }
      wordSourceSelect.value = 'custom';
      return;
    }
    if (customWordOpt) customWordOpt.hidden = true;
    if (value) wordSourceSelect.value = value;
  }

  function unpicturedWordsOf(packArg) {
    var pack = activePack(packArg);
    var items = (pack && (Array.isArray(pack.items) ? pack.items : pack.words)) || [];
    var seen = Object.create(null);
    var missing = [];
    items.forEach(function (it) {
      if (!it || typeof it !== 'object') return;
      if (it.pictureNone || it.image || (it.picture && it.picture.src) || (typeof it.picture === 'string' && it.picture)) return;
      var w = String(it.word || '').trim().toLowerCase();
      if (!/^[a-z]{2,24}$/.test(w) || seen[w] || missing.length >= 50) return;
      seen[w] = true;
      missing.push(w);
    });
    return missing;
  }

  function syncFindOnlineAndMore(packArg) {
    var missing = unpicturedWordsOf(packArg);
    if (findOnlineLink) {
      if (missing.length) {
        var hash = '#from=present&word=' + encodeURIComponent(missing[0]) + (missing.length > 1 ? '&more=' + encodeURIComponent(missing.slice(1).join(',')) : '');
        findOnlineLink.setAttribute('href', 'packets-pictures.html' + hash);
        findOnlineLink.textContent = 'Find pictures online (' + missing.length + ' missing)';
      } else {
        findOnlineLink.setAttribute('href', 'packets-pictures.html#from=present');
        findOnlineLink.textContent = 'Find more pictures online';
      }
    }
    if (moreNowEl) {
      var sheetLabel = sheetTypeSelect && sheetTypeSelect.selectedIndex >= 0 && sheetTypeSelect.options[sheetTypeSelect.selectedIndex]
        ? sheetTypeSelect.options[sheetTypeSelect.selectedIndex].textContent
        : 'Classroom sheets';
      moreNowEl.textContent = missing.length
        ? sheetLabel + ' \u00b7 ' + missing.length + (missing.length === 1 ? ' word needs a picture' : ' words need pictures')
        : sheetLabel;
    }
  }

  function say(text) {
    if (statusEl) statusEl.textContent = text || '';
  }

  // Built-in starter sets come from packets_word_starters.js (shared with Vocabulary maker).
  // Compact word-only fallback keeps isolated unit tests that omit packets_word_starters.js working.
  var STARTERS = (function () {
    var mod = root.AlloPacketWordStarters;
    if (mod && mod.BY_ID && typeof mod.BY_ID === 'object') return mod.BY_ID;
    var map = Object.create(null);
    if (mod && Array.isArray(mod.LIST)) {
      mod.LIST.forEach(function (set) { if (set && set.id) map[set.id] = set; });
      return map;
    }
    var raw = {
      'short-vowels': ['Short vowels with pictures', 'cat dog sun bed fish frog ship cup'],
      'blends-digraphs': ['Blends and digraphs', 'train cloud plant brush shell whale clock star'],
      'science-math': ['Science and math vocabulary', 'habitat evaporate magnet fraction perimeter symmetry'],
      academic: ['Academic study words', 'observe predict compare pattern evidence solution'],
      'earth-space': ['Earth and space', 'volcano glacier orbit eclipse fossil atmosphere erosion weathering'],
      'civics-geography': ['Civics and geography', 'democracy constitution citizen peninsula equator hemisphere continent climate'],
      'literary-craft': ['Story and poetry craft', 'metaphor simile personification hyperbole alliteration foreshadowing stanza theme'],
    };
    Object.keys(raw).forEach(function (k) {
      map[k] = { id: k, title: raw[k][0], words: raw[k][1].split(' ').map(function (w) { return { word: w }; }) };
    });
    return map;
  })();

  var dictionary = typeof root.createWordSoundsPhonemeData === 'function' ? root.createWordSoundsPhonemeData() : null;
  var wsCore = typeof root.createWordSoundsCore === 'function' ? root.createWordSoundsCore({ phonemes: dictionary }) : null;
  var vocabBank = root.AlloVocabBank || null;
  var symbols = root.AlloModules && root.AlloModules.WordSoundsSymbols ? root.AlloModules.WordSoundsSymbols : null;
  var loader = root.AlloWordSoundsTakeHome || null;
  var media = root.AlloVocabMedia || null;
  var myWords = root.AlloPacketMyWords || null;
  var wp = root.AlloModules && root.AlloModules.WordPractice ? root.AlloModules.WordPractice : null;

  var phonemeBank = Object.create(null);
  var symbolPngCache = Object.create(null);
  var controller = null;
  var lastPack = null;
  var lastPackItemsByWord = Object.create(null);
  var pptxPromise = null;
  var symbolsLoadPromise = null;

  function setControllerPack(packConfig) {
    lastPack = packConfig || null;
    lastPackItemsByWord = Object.create(null);
    var items = packConfig && Array.isArray(packConfig.words) ? packConfig.words : [];
    items.forEach(function (it) {
      if (it && it.word) lastPackItemsByWord[String(it.word).toLowerCase()] = it;
    });
    if (controller && typeof controller.setPack === 'function') {
      controller.setPack(packConfig);
    }
    syncFindOnlineAndMore(packConfig);
  }

  function safeJsonParse(raw) {
    return JSON.parse(raw, function (k, v) {
      return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v;
    });
  }

  function loadJson(url) {
    if (typeof root.fetch !== 'function') return Promise.reject(new Error('fetch unavailable'));
    var ctrl = typeof root.AbortController === 'function' ? new root.AbortController() : null;
    var timer = 0;
    return new Promise(function (resolve, reject) {
      timer = typeof root.setTimeout === 'function' ? root.setTimeout(function () {
        if (ctrl) { try { ctrl.abort(); } catch (_) {} }
        reject(new Error(url + ' timed out'));
      }, 15000) : 0;
      Promise.resolve().then(function () {
        return ctrl ? root.fetch(url, { signal: ctrl.signal }) : root.fetch(url);
      }).then(function (res) {
        if (!res || !res.ok) throw new Error(url + ' ' + (res ? res.status : 0));
        return typeof res.text === 'function' ? res.text().then(safeJsonParse) : res.json();
      }).then(function (data) {
        if (timer && typeof root.clearTimeout === 'function') root.clearTimeout(timer);
        resolve(data);
      }, function (err) {
        if (timer && typeof root.clearTimeout === 'function') root.clearTimeout(timer);
        reject(err);
      });
    });
  }

  function ensurePhonemeClips() {
    return loadJson('audio_bank/phonemes.json').then(function (data) {
      if (!data || typeof data !== 'object') return;
      Object.keys(data).forEach(function (k) {
        if (typeof data[k] === 'string' && /^data:audio\//i.test(data[k])) {
          phonemeBank[k] = data[k];
        }
      });
    }).catch(function () { return null; });
  }

  function ensureVocabBankLoaded() {
    if (!vocabBank || typeof vocabBank.load !== 'function') return Promise.resolve(null);
    return vocabBank.load().catch(function () { return null; });
  }

  function ensureSymbolsLoaded() {
    if (!symbols) return Promise.resolve(null);
    if (symbols.ready()) return Promise.resolve(symbols);
    if (!symbolsLoadPromise) {
      if (media && typeof media.pictures === 'function') {
        symbolsLoadPromise = media.pictures(symbols).catch(function () {
          symbolsLoadPromise = null;
          return null;
        });
      } else {
        symbolsLoadPromise = Promise.all((symbols.shards || []).map(function (shard) {
          return loadJson(shard.url).then(function (data) { symbols.add(data); });
        })).then(function () { return symbols; }, function () {
          symbolsLoadPromise = null;
          return null;
        });
      }
    }
    return symbolsLoadPromise;
  }

  // Bridge local word-audio shards into WordPractice ("Prepare audio") when online on same host.
  if (typeof root.getWordShardAudio !== 'function' && media && typeof media.clips === 'function' && loader) {
    root.getWordShardAudio = function (word) {
      var clean = String(word == null ? '' : word).trim().toLowerCase();
      if (!clean) return Promise.resolve('');
      return media.clips([clean], loader).then(function (out) {
        return out && out[clean] ? out[clean] : '';
      }).catch(function () { return ''; });
    };
  }

  function hasOwn(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function isAudioUri(u) { return typeof u === 'string' && /^data:audio\//i.test(u); }
  function ensurePptx() {
    if (typeof root.PptxGenJS === 'function') return Promise.resolve(root.PptxGenJS);
    if (pptxPromise) return pptxPromise;
    pptxPromise = new Promise(function (resolve, reject) {
      if (!doc || !doc.head) { pptxPromise = null; reject(new Error('Document unavailable')); return; }
      var script = doc.createElement('script'), done = false;
      var stop = function (err) {
        if (done) return; done = true;
        if (timer && typeof root.clearTimeout === 'function') root.clearTimeout(timer);
        if (err) { try { script.remove(); } catch (_) {} pptxPromise = null; reject(err); }
        else resolve(root.PptxGenJS);
      };
      var timer = typeof root.setTimeout === 'function' ? root.setTimeout(function () { stop(new Error('Timed out loading vendor/pptxgenjs-3.12.0.bundle.js.')); }, 20000) : 0;
      script.src = 'vendor/pptxgenjs-3.12.0.bundle.js';
      script.async = true;
      script.onload = function () { stop(typeof root.PptxGenJS === 'function' ? null : new Error('Could not start PowerPoint export.')); };
      script.onerror = function () { stop(new Error('Could not load vendor/pptxgenjs-3.12.0.bundle.js.')); };
      doc.head.appendChild(script);
    });
    return pptxPromise;
  }

  function formatPictureCredit(credit, fallback) {
    if (typeof credit === 'string') return credit.trim() || (fallback || '');
    if (credit && typeof credit === 'object' && !Array.isArray(credit)) {
      if (typeof credit.set === 'string' && credit.set.trim()) {
        var setParts = [];
        ['set', 'author', 'license'].forEach(function (k) {
          if (typeof credit[k] === 'string' && credit[k].trim()) setParts.push(credit[k].trim());
        });
        if (setParts.length) return setParts.join(' \u00b7 ');
      }
      if (myWords && typeof myWords.creditLine === 'function') {
        var line = myWords.creditLine(credit);
        if (line) return line;
      }
      if (credit.own === true) return "The teacher's own picture.";
      var parts = [];
      ['title', 'author', 'license', 'source'].forEach(function (k) {
        if (typeof credit[k] === 'string' && credit[k].trim()) parts.push(credit[k].trim());
      });
      if (parts.length) return parts.join(' \u00b7 ');
    }
    return fallback || '';
  }

  function applyPictureRecord(rec, src, alt, creditObjOrStr, fallbackCredit) {
    var creditText = formatPictureCredit(creditObjOrStr, fallbackCredit);
    rec.image = src;
    rec.imageAlt = alt;
    rec.imageCredit = creditText;
    rec.picture = { src: src, alt: alt, decorative: false, credit: creditText };
    if (creditObjOrStr && typeof creditObjOrStr === 'object' && !Array.isArray(creditObjOrStr)) {
      rec.imageAttribution = creditObjOrStr;
    } else if (creditText) {
      rec.imageAttribution = { set: creditText };
    }
  }

  function clearPictureRecord(rec) {
    delete rec.image;
    delete rec.imageAlt;
    delete rec.imageAttribution;
    delete rec.imageCredit;
    delete rec.picture;
  }

  function creditForSet(setName) {
    if (setName === 'diagram') return { set: 'AlloFlow Curriculum Diagram', license: 'Built-in curriculum diagram' };
    if (symbols && symbols.credits && symbols.credits[setName]) return symbols.credits[setName];
    return setName === 'openmoji'
      ? { set: 'OpenMoji', license: 'CC BY-SA 4.0' }
      : { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' };
  }

  function resolveEntry(word) {
    var raw = String(word == null ? '' : word).trim();
    if (!raw) return null;
    var key = raw.toLowerCase();
    var out = {};
    if (vocabBank && vocabBank.ready && vocabBank.ready()) {
      var senses = typeof vocabBank.senses === 'function' ? vocabBank.senses(raw) : [];
      if ((!senses || !senses.length) && typeof vocabBank.head === 'function') {
        var hw = vocabBank.head(raw);
        if (hw) senses = vocabBank.senses(hw);
      }
      if (senses && senses.length) {
        out.definition = senses[0].def || '';
        out.example = senses[0].example || '';
      }
    }
    if (wsCore && typeof wsCore.dictionarySounds === 'function') {
      var dict = wsCore.dictionarySounds(key);
      if (dict && Array.isArray(dict.sounds) && dict.sounds.length) {
        var analysis = typeof wsCore.soundAnalysis === 'function' ? wsCore.soundAnalysis(key, dict.sounds) : null;
        if (analysis && Array.isArray(analysis.chunks) && analysis.chunks.length) {
          out.phonemes = analysis.chunks.map(function (c, i) {
            return { label: c.text || dict.sounds[i] || '', soundKey: c.soundKey || dict.sounds[i] || '' };
          });
        } else {
          out.phonemes = dict.sounds.map(function (s) { return { label: s, soundKey: s }; });
        }
      }
    }
    if (symbolPngCache[key] && symbolPngCache[key].none === true) {
      out.pictureNone = true;
    } else if (symbolPngCache[key] && symbolPngCache[key].src) {
      applyPictureRecord(out, symbolPngCache[key].src, symbolPngCache[key].alt, symbolPngCache[key].credit, '');
    }
    return out;
  }

  function searchSymbols(query) {
    var matcher = root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher);
    if (matcher && typeof matcher.searchSymbols === 'function') {
      return ensureSymbolsLoaded().catch(function () { return null; }).then(function () {
        return matcher.searchSymbols(query, {
          symbols: symbols,
          creditForSet: creditForSet,
          preferDiagrams: true,
          allowOnlineGlobalSymbols: false,
          limit: 24,
        });
      });
    }
    if (!symbols) return Promise.resolve([]);
    return ensureSymbolsLoaded().then(function () {
      if (!symbols || typeof symbols.words !== 'function') return [];
      var q = String(query || '').trim().toLowerCase();
      var hits = [];
      var words = symbols.words();
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        var entry = symbols.get(w);
        if (!entry || !entry.svg) continue;
        var label = String(entry.label || w).toLowerCase();
        if (q && w.toLowerCase().indexOf(q) < 0 && label.indexOf(q) < 0) continue;
        hits.push({
          word: w,
          label: entry.label || w,
          svg: entry.svg,
          set: entry.set,
          credit: creditForSet(entry.set),
        });
        if (hits.length >= 24) break;
      }
      return hits;
    });
  }

  function enrichItems(title, rawWords) {
    return (rawWords || []).map(function (item) {
      var record = typeof item === 'string' ? { word: item } : Object.assign({}, item);
      var enriched = resolveEntry(record.word);
      if (enriched) {
        if (!record.definition && enriched.definition) record.definition = enriched.definition;
        if (!record.example && enriched.example) record.example = enriched.example;
        if ((!record.phonemes || !record.phonemes.length) && enriched.phonemes) record.phonemes = enriched.phonemes;
        if (record.pictureNone || enriched.pictureNone) {
          clearPictureRecord(record);
          record.pictureNone = true;
          return record;
        }
        var hasPic = !!(record.image || (record.picture && record.picture.src) || (typeof record.picture === 'string' && record.picture));
        if (!hasPic && enriched.image) {
          applyPictureRecord(record, enriched.image, enriched.imageAlt || record.word, enriched.imageAttribution || enriched.imageCredit, '');
        }
      }
      return record;
    });
  }

  function applyStarter(id) {
    var starter = hasOwn(STARTERS, id) ? STARTERS[id] : null;
    if (!starter || !controller) return;
    var words = enrichItems(starter.title, starter.words);
    setControllerPack({
      title: starter.title,
      language: 'en',
      words: words,
      options: { mode: 'vocabulary', includePictures: true },
    });
    syncWordSource('starter:' + id);
    say('Loaded "' + starter.title + '" (' + words.length + ' words).');
    matchBuiltInPictures({ quiet: true });
  }

  function currentHostTitle() {
    if (!host) return 'Word Fluency Pop-Up';
    var input = host.querySelector('.awp-grid .awp-fields input:not([type="file"])');
    return (input && input.value.trim()) || 'Word Fluency Pop-Up';
  }

  function currentHostWords() {
    if (!host) return [];
    var area = host.querySelector('.awp-grid .awp-fields textarea');
    if (!area || !area.value) return [];
    return area.value.split(/[\r\n,]+/).map(function (w) { return w.trim(); }).filter(Boolean);
  }

  function mergeMyWordsEntries(wordsList) {
    if (!myWords || typeof myWords.getMany !== 'function' || !wordsList.length) return Promise.resolve({});
    return myWords.getMany(wordsList).catch(function () { return {}; });
  }

  function matchBuiltInPictures(opts) {
    var quiet = !!(opts && opts.quiet);
    var matcher = root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher);
    if ((!symbols && !(matcher && typeof matcher.matchWord === 'function')) || !wp || typeof wp.rasterizeImage !== 'function' || !controller) {
      if (!quiet) say('Built-in picture matching is unavailable here.');
      return Promise.resolve();
    }
    var list = currentHostWords();
    if (!list.length) {
      if (!quiet) say('Type at least one word below before matching pictures.');
      return Promise.resolve();
    }
    if (!quiet) say('Loading built-in pictures...');
    return Promise.all([
      ensureSymbolsLoaded().catch(function () { return null; }),
      ensureVocabBankLoaded(),
      mergeMyWordsEntries(list),
    ]).then(function (results) {
      var savedByWord = results[2] || {};
      var matched = 0;
      return Promise.all(list.map(function (word) {
        var key = word.toLowerCase();
        var saved = savedByWord[word] || savedByWord[key];
        if (saved && saved.picture && saved.picture.none === true) {
          symbolPngCache[key] = { none: true };
          return null;
        }
        if (symbolPngCache[key] && symbolPngCache[key].none === true) {
          delete symbolPngCache[key];
        }
        if (saved && saved.picture && isAllowedCustomPicture(saved.picture.dataUri)) {
          symbolPngCache[key] = {
            src: saved.picture.dataUri,
            alt: word,
            credit: formatPictureCredit(saved.picture.credit, 'Saved in My words'),
          };
          matched++;
          return null;
        }
        var fresh = resolveEntry(word);
        var existing = lastPackItemsByWord[key] || fresh;
        var defForMatch = (existing && existing.definition) || (fresh && fresh.definition) || '';
        var match = matcher && typeof matcher.matchWord === 'function'
          ? matcher.matchWord(
              { word: word, definition: defForMatch },
              { symbols: symbols, creditForSet: creditForSet, preferDiagrams: true }
            )
          : null;
        var entry = match && match.svg
          ? match
          : (symbols && typeof symbols.get === 'function'
              ? (symbols.get(key) || (vocabBank && vocabBank.head ? symbols.get(vocabBank.head(key)) : null))
              : null);
        if (!entry || !entry.svg) return null;
        return wp.rasterizeImage(entry.svg, doc).then(function (png) {
          if (!png) return;
          symbolPngCache[key] = {
            src: png,
            alt: (match && match.alt) || entry.label || word,
            credit: (match && match.credit) || creditForSet(entry.set),
          };
          matched++;
        }).catch(function () { return null; });
      })).then(function () {
        var existingPack = typeof controller.getPack === 'function' ? controller.getPack() : lastPack;
        var byWord = Object.create(null);
        var existingList = existingPack && Array.isArray(existingPack.items)
          ? existingPack.items
          : (existingPack && Array.isArray(existingPack.words) ? existingPack.words : []);
        existingList.forEach(function (it) {
          if (it && it.word) byWord[String(it.word).toLowerCase()] = it;
        });
        var words = list.map(function (word) {
          var prev = byWord[word.toLowerCase()] || lastPackItemsByWord[word.toLowerCase()];
          var saved = savedByWord[word] || savedByWord[word.toLowerCase()];
          var rec = prev ? Object.assign({}, prev, { word: word }) : { word: word };
          if (saved && saved.clip && isAudioUri(saved.clip.dataUri) && !rec.wordAudio) rec.wordAudio = saved.clip.dataUri;
          if (saved && saved.sounds && Array.isArray(saved.sounds.sounds) && (!rec.phonemes || !rec.phonemes.length)) rec.phonemes = saved.sounds.sounds;
          if (saved && saved.picture && saved.picture.none === true) {
            clearPictureRecord(rec);
            rec.pictureNone = true;
          } else {
            delete rec.pictureNone;
            if (saved && saved.picture && isAllowedCustomPicture(saved.picture.dataUri) && !rec.image && !(rec.picture && rec.picture.src)) {
              applyPictureRecord(rec, saved.picture.dataUri, word, saved.picture.credit, 'Saved in My words');
            }
          }
          return rec;
        });
        var enrichedWords = enrichItems(currentHostTitle(), words);
        setControllerPack({
          title: currentHostTitle(),
          language: 'en',
          words: enrichedWords,
          options: { mode: 'vocabulary', includePictures: true },
        });
        if (!quiet) {
          say(matched ? ('Matched ' + matched + ' of ' + list.length + ' words to built-in pictures.') : 'No built-in symbol matched those words. Use Import images below to add your own.');
        }
      });
    });
  }

  // Pure-text SVG check matching word_sounds_packet_builder.js / packets_my_words.js svgRefusal.
  function svgRefusalFallback(svg) {
    var text = typeof svg === 'string' ? svg : '';
    if (!/^\s*<svg[\s>]/i.test(text) || !/<\/svg>\s*$/i.test(text)) return 'not an SVG drawing';
    if (text.length > 300000 || text.indexOf('\\') >= 0) return 'invalid drawing';
    if (/<!(?:doctype|entity)/i.test(text) || /<\?(?!xml\s)/i.test(text)) return 'declaration';
    var plain = text
      .replace(/&#x([0-9a-f]+);?/gi, function (_, hex) { return String.fromCharCode(parseInt(hex, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (_, dec) { return String.fromCharCode(Number(dec) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (_, name) { return name.toLowerCase() === 'colon' ? ':' : ''; });
    var packed = plain.replace(/[\x00-\x20]+/g, '');
    if (/<\s*(?:[\w-]+:)?(?:script|foreignObject|iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'active element';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain) || /(?:java|vb|live)script:/i.test(packed) || /xml:base\s*=/i.test(plain) || /[\s"'\/]src\s*=/i.test(plain)) return 'active attribute';
    var m, href = /(?:[\s"'\/])(?:[\w-]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      var target = String(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || '').replace(/[\x00-\x20]+/g, '');
      if (target.charAt(0) !== '#') return 'external link';
    }
    var urlRe = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = urlRe.exec(plain))) {
      var uTarget = String(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || '').replace(/[\x00-\x20]+/g, '');
      if (uTarget.charAt(0) !== '#') return 'external url';
    }
    if (/@import|@font-face|@namespace|expression\s*\(/i.test(plain)) return 'disallowed style';
    return '';
  }

  function isAllowedCustomPicture(uri) {
    if (typeof uri !== 'string' || uri.length > 450000) return false;
    var m = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/i.exec(uri);
    if (!m) return false;
    if (m[1].toLowerCase() !== 'svg+xml') return true;
    var svgText = '';
    try {
      var bin = root.atob(m[2]);
      if (typeof root.TextDecoder === 'function') {
        try {
          var bytes = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          svgText = new root.TextDecoder('utf-8').decode(bytes);
        } catch (_) {
          svgText = bin;
        }
      } else {
        svgText = bin;
      }
    } catch (_) { return false; }
    var refuse = (myWords && typeof myWords.svgRefusal === 'function') ? myWords.svgRefusal : svgRefusalFallback;
    return !refuse(svgText);
  }

  function readVocabMakerSaved() {
    var storage = null;
    try { storage = root.localStorage; } catch (_) { storage = null; }
    if (!storage || typeof storage.getItem !== 'function') return null;
    var saved = null;
    var edits = null;
    try {
      var raw = storage.getItem('alloflow-packets-vocab/1');
      if (raw) saved = JSON.parse(raw, function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
    } catch (_) { saved = null; }
    if (!saved || typeof saved !== 'object') return null;
    try {
      var rawEdits = storage.getItem('alloflow-packets-vocab-edits/1');
      if (rawEdits) edits = safeJsonParse(rawEdits);
    } catch (_) { edits = null; }

    var rawWords = Array.isArray(saved.words)
      ? saved.words.map(function (item) {
          return item && typeof item === 'object' ? String(item.word || '').trim() : String(item == null ? '' : item).trim();
        })
      : String(saved.words == null ? '' : saved.words).split(/[\r\n,;]+/).map(function (w) { return w.trim(); });

    var wordEdits = edits && edits.words && typeof edits.words === 'object' ? edits.words : {};
    var senseEdits = edits && edits.senses && typeof edits.senses === 'object' ? edits.senses : {};
    var seen = Object.create(null);
    var items = [];
    rawWords.forEach(function (word) {
      if (!word) return;
      var key = word.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      var wEdit = (hasOwn(wordEdits, key) ? wordEdits[key] : null) || (hasOwn(wordEdits, word) ? wordEdits[word] : null);
      var senses = vocabBank && typeof vocabBank.ready === 'function' && vocabBank.ready() && typeof vocabBank.senses === 'function'
        ? (vocabBank.senses(word) || [])
        : [];
      if ((!senses || !senses.length) && vocabBank && typeof vocabBank.ready === 'function' && vocabBank.ready() && typeof vocabBank.head === 'function' && typeof vocabBank.senses === 'function') {
        var hwSaved = vocabBank.head(word);
        if (hwSaved) senses = vocabBank.senses(hwSaved) || [];
      }
      var chosen = null;
      if (senses.length) {
        if (wEdit && wEdit.sense) {
          for (var i = 0; i < senses.length; i++) {
            if (senses[i] && senses[i].id === wEdit.sense) { chosen = senses[i]; break; }
          }
        }
        if (!chosen) chosen = senses[0];
      }
      var sId = (chosen && chosen.id) || (wEdit && wEdit.sense) || '';
      var sEdit = sId && hasOwn(senseEdits, sId) ? senseEdits[sId] : null;
      var def = (wEdit && wEdit.def) || (sEdit && sEdit.def) || (chosen && chosen.def) || '';
      var example = (wEdit && wEdit.example) || (sEdit && sEdit.example) || (chosen && chosen.example) || '';
      var rec = { word: word };
      if (def) rec.definition = String(def);
      if (example) rec.example = String(example);
      var customUri = wEdit && wEdit.customPicture ? (typeof wEdit.customPicture === 'string' ? wEdit.customPicture : wEdit.customPicture.dataUri) : '';
      if (typeof customUri === 'string' && isAllowedCustomPicture(customUri)) {
        applyPictureRecord(rec, customUri, word, 'Added in Vocabulary maker', 'Added in Vocabulary maker');
      }
      items.push(rec);
    });
    if (!items.length) return null;
    var titleText = saved.title && String(saved.title).trim() ? String(saved.title).trim() : 'Vocabulary packet words';
    return { title: titleText, words: items };
  }

  function applyVocabMakerWords(opts) {
    var quiet = !!(opts && opts.quiet);
    return ensureVocabBankLoaded().then(function () {
      var data = readVocabMakerSaved();
      if (!data || !data.words || !data.words.length) {
        if (!quiet) say('No saved Vocabulary maker words found in this browser yet.');
        return false;
      }
      var enriched = enrichItems(data.title, data.words);
      setControllerPack({
        title: data.title,
        language: 'en',
        words: enriched,
        options: { mode: 'vocabulary', includePictures: true },
      });
      syncWordSource('saved:vocab');
      say('Loaded ' + enriched.length + ' words from Vocabulary maker.');
      return matchBuiltInPictures({ quiet: true }).then(function () { return true; });
    });
  }

  function readWordSoundsMakerSaved() {
    var storage = null;
    try { storage = root.localStorage; } catch (_) { storage = null; }
    if (!storage || typeof storage.getItem !== 'function') return null;
    var saved = null;
    try {
      var raw = storage.getItem('alloflow-packets-maker/1');
      if (raw) saved = JSON.parse(raw, function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; });
    } catch (_) { saved = null; }
    if (!saved || typeof saved !== 'object') return null;
    var rawWords = Array.isArray(saved.words) && saved.words.length
      ? saved.words
      : (saved.mode === 'own'
          ? String(saved.own || '').split(/[\s,;]+/)
          : (Array.isArray(saved.chosen) ? saved.chosen : []));
    var seen = Object.create(null);
    var items = [];
    (rawWords || []).forEach(function (w) {
      var word = String(w == null ? '' : w).trim().toLowerCase();
      if (!word || seen[word]) return;
      seen[word] = true;
      items.push({ word: word });
    });
    if (!items.length) return null;
    // The title the teacher gave the file (the maker saves it with the words); until 2026-11-16 it was dropped here.
    var makerTitle = typeof saved.title === 'string' ? saved.title.trim().slice(0, 80) : '';
    var makerActivities = Array.isArray(saved.activities) && saved.activities.length ? saved.activities.slice() : null;
    return { title: makerTitle || 'Word Sounds packet words', words: items, activities: makerActivities, tracing: saved.tracing || 'both' };
  }

  function applyWordSoundsMakerWords(opts) {
    var quiet = !!(opts && opts.quiet);
    return ensureVocabBankLoaded().then(function () {
      var data = readWordSoundsMakerSaved();
      if (!data || !data.words || !data.words.length) {
        if (!quiet) say('No saved Word Sounds maker words found in this browser yet.');
        return false;
      }
      return mergeMyWordsEntries(data.words.map(function (w) { return w.word; })).then(function (savedByWord) {
        var list = data.words.map(function (item) {
          var e = (savedByWord && (savedByWord[item.word] || savedByWord[item.word.toLowerCase()])) || null;
          var rec = { word: item.word };
          if (e && e.sounds && Array.isArray(e.sounds.sounds)) rec.phonemes = e.sounds.sounds;
          if (e && e.clip && isAudioUri(e.clip.dataUri)) rec.wordAudio = e.clip.dataUri;
          if (e && e.picture && e.picture.none === true) {
            symbolPngCache[item.word.toLowerCase()] = { none: true };
            rec.pictureNone = true;
          } else if (e && e.picture && isAllowedCustomPicture(e.picture.dataUri)) {
            applyPictureRecord(rec, e.picture.dataUri, item.word, e.picture.credit, 'Saved in My words');
          }
          return rec;
        });
        var enriched = enrichItems(data.title, list);
        setControllerPack({
          title: data.title,
          language: 'en',
          words: enriched,
          options: { mode: 'vocabulary', includePictures: true, wsActivities: data.activities || null, wsTracing: data.tracing || 'both' },
        });
        syncWordSource('saved:word-sounds');
        say('Loaded ' + enriched.length + ' words from Word Sounds maker.');
        return matchBuiltInPictures({ quiet: true }).then(function () { return true; });
      });
    });
  }

  function activePack(packArg) {
    var live = controller && typeof controller.getPack === 'function' ? controller.getPack() : null;
    if (!packArg) return live || lastPack || { title: 'Word Cards', words: [] };
    return packArg;
  }

  function packItemsOf(pack) {
    var list = (pack && (Array.isArray(pack.items) ? pack.items : pack.words)) || [];
    return enrichItems((pack && pack.title) || 'Word Cards', list);
  }

  function sheetReadingOpts() {
    return { syllables: !!($('pe-opt-syllables') && $('pe-opt-syllables').checked), bold: !!($('pe-opt-bold') && $('pe-opt-bold').checked) };
  }

  // One builder for the app and for Packets: word_practice_media.js, loaded by this page.
  function sheetInput(packArg, fallbackTitle) {
    var pack = activePack(packArg), items = packItemsOf(pack), opts = pack.options || {};
    return [{ title: String(pack.title || fallbackTitle), language: pack.language || 'en', items: items, words: items, options: opts }, opts];
  }
  function buildFlashcardsHtml(packArg) {
    var a = sheetInput(packArg, 'Word Flashcards');
    return root.AlloWordPracticeMedia.buildFlashcardsHtml(a[0], a[1]);
  }
  function buildFrayerHtml(packArg) {
    var a = sheetInput(packArg, 'Frayer Study Sheets');
    return root.AlloWordPracticeMedia.buildFrayerHtml(a[0], a[1]);
  }
  function buildSortingCardsHtml(packArg) {
    var a = sheetInput(packArg, 'Word Sorting Cards');
    return root.AlloWordPracticeMedia.buildSortingCardsHtml(a[0], a[1]);
  }
  function buildWorksheetHtml(packArg) {
    var a = sheetInput(packArg, 'Vocabulary Study Worksheet');
    return root.AlloWordPracticeMedia.buildWorksheetHtml(a[0], a[1]);
  }
  function buildWordSoundsWorksheetHtml(packArg, extraOpts) {
    var a = sheetInput(packArg, 'Word Sounds Activity Worksheet');
    var pack = activePack(packArg);
    var opts = Object.assign({
      pictures: true,
      answerKey: true,
      hints: true,
      syllables: sheetReadingOpts().syllables,
      symbols: symbols,
      matcher: root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher) || null,
      core: wsCore,
      dictionary: dictionary,
      activities: (pack && pack.options && Array.isArray(pack.options.wsActivities) && pack.options.wsActivities.length) ? pack.options.wsActivities : undefined,
      tracing: (pack && pack.options && pack.options.wsTracing) || 'both',
    }, extraOpts || {});
    return root.AlloWordPracticeMedia.buildWordSoundsWorksheetHtml(a[0], opts);
  }
  function buildBingoHtml(packArg) {
    var a = sheetInput(packArg, 'Vocabulary Classroom Bingo');
    return root.AlloWordPracticeMedia.buildBingoHtml(a[0], a[1]);
  }
  function buildLoopGameHtml(packArg) {
    var a = sheetInput(packArg, 'I Have, Who Has Loop Cards');
    return root.AlloWordPracticeMedia.buildLoopGameHtml(a[0], a[1]);
  }
  function buildWordWallHtml(packArg) {
    var a = sheetInput(packArg, 'Classroom Word Wall Cards');
    return root.AlloWordPracticeMedia.buildWordWallHtml(a[0], a[1]);
  }

  function openInSymbolRunner(packArg) {
    var items = packItemsOf(activePack(packArg));
    var seen = Object.create(null);
    var shortWords = [];
    items.forEach(function (it) {
      var w = String((it && it.word) || '').trim();
      var k = w.toLowerCase();
      if (!/^[A-Za-z0-9]{1,20}$/.test(w) || seen[k] || shortWords.length >= 30) return;
      seen[k] = true;
      shortWords.push(w);
    });
    if (shortWords.length < 2) {
      say('Need at least 2 words (1 to 20 letters or digits, no spaces) to open in Symbol Runner.');
      return false;
    }
    var a = doc.createElement('a');
    a.href = 'packets-symbol-runner.html#symbols=' + encodeURIComponent(shortWords.join(','));
    a.hidden = true;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    return true;
  }

  function downloadHtmlFile(html, filename) {
    if (typeof root.Blob !== 'function' || !root.URL || typeof root.URL.createObjectURL !== 'function') return;
    var blob = new root.Blob([html], { type: 'text/html;charset=utf-8' });
    var url = root.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(function () { try { root.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
  }

  function slugTitle(textVal) {
    return String(textVal || 'word-cards').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'word-cards';
  }

  function init() {
    if (!host || !wp || typeof wp.mount !== 'function') {
      say('Could not start Present and Export.');
      return;
    }
    var initial = hasOwn(STARTERS, 'short-vowels') ? STARTERS['short-vowels'] : { title: 'Word cards', words: [] };
    var initialWords = Array.isArray(initial.words) ? initial.words : [];
    var initialTitle = initial.title || 'Word cards';

    var startWords = enrichItems(initialTitle, initialWords);
    // The annotation tools are the app's own suite, bundled once in word_practice_annotation_assets.js. The app has
    // the suite already; this page starts it from that bundle (run(), no eval: the page's policy allows only its own
    // scripts), so Annotate is on the presenter here as it is in the app and in the saved offline file.
    var annoAssets = root.AlloWordPracticeAnnotationAssets;
    if (!(root.AlloModules && root.AlloModules.AnnotationSuite) && annoAssets && typeof annoAssets.run === 'function') {
      try { annoAssets.run(); } catch (annoError) { /* the presenter works without Annotate */ }
    }
    controller = wp.mount(host, {
      title: initialTitle,
      language: 'en',
      words: startWords,
      options: { mode: 'vocabulary', includePictures: true },
      phonemeBank: phonemeBank,
      resolveEntry: resolveEntry,
      searchSymbols: searchSymbols,
      ensurePptx: ensurePptx,
      hideInlineSheetButtons: true,
      onToast: function (msg) { say(msg); },
    });
    lastPack = {
      title: initialTitle,
      language: 'en',
      words: startWords,
      options: { mode: 'vocabulary', includePictures: true },
    };
    startWords.forEach(function (it) {
      if (it && it.word) lastPackItemsByWord[String(it.word).toLowerCase()] = it;
    });
    syncFindOnlineAndMore(lastPack);

    if (host) {
      var hostEditTimer = 0;
      host.addEventListener('input', function (ev) {
        var t = ev && ev.target;
        if (t && t.tagName === 'TEXTAREA' && t.closest && t.closest('.awp-fields')) {
          syncWordSource('custom', 'Custom word list');
          if (typeof root.clearTimeout === 'function') root.clearTimeout(hostEditTimer);
          hostEditTimer = typeof root.setTimeout === 'function' ? root.setTimeout(function () { syncFindOnlineAndMore(); }, 180) : 0;
        }
      });
    }

    function applyMyWords() {
      if (!myWords || typeof myWords.list !== 'function') {
        say('No saved My words found in this browser yet.');
        return Promise.resolve(false);
      }
      return myWords.list().then(function (rows) {
        if (!rows || !rows.length) {
          say('No saved My words found in this browser yet.');
          return false;
        }
        var words = rows.map(function (r) { return r.word; });
        return myWords.getMany(words).then(function (entries) {
          var list = words.map(function (w) {
            var e = entries[w] || {};
            var rec = {
              word: w,
              phonemes: e.sounds && Array.isArray(e.sounds.sounds) ? e.sounds.sounds : undefined,
              wordAudio: e.clip && isAudioUri(e.clip.dataUri) ? e.clip.dataUri : undefined,
            };
            if (e.picture && e.picture.none === true) {
              symbolPngCache[String(w).toLowerCase()] = { none: true };
              rec.pictureNone = true;
            } else if (e.picture && isAllowedCustomPicture(e.picture.dataUri)) {
              applyPictureRecord(rec, e.picture.dataUri, w, e.picture.credit, 'Saved in My words');
            }
            return rec;
          });
          setControllerPack({
            title: 'My saved words',
            language: 'en',
            words: enrichItems('My saved words', list),
            options: { mode: 'vocabulary', includePictures: true },
          });
          syncWordSource('saved:my-words');
          say('Loaded ' + list.length + ' words from My words.');
          return matchBuiltInPictures({ quiet: true }).then(function () { return true; });
        });
      }).catch(function () { return false; });
    }

    if (wordSourceSelect) {
      wordSourceSelect.addEventListener('change', function () {
        var val = String(wordSourceSelect.value || '');
        if (val.indexOf('starter:') === 0) {
          applyStarter(val.slice('starter:'.length));
        } else if (val === 'saved:my-words') {
          applyMyWords();
        } else if (val === 'saved:vocab') {
          applyVocabMakerWords({ quiet: false });
        } else if (val === 'saved:word-sounds') {
          applyWordSoundsMakerWords({ quiet: false });
        }
      });
    }

    if (myWords && typeof myWords.available === 'function' && myWordsOpt) {
      myWords.available().then(function (ok) {
        if (!ok) return [];
        return myWords.list();
      }).then(function (rows) {
        if (!rows || !rows.length) return;
        myWordsOpt.hidden = false;
        syncSavedGroup();
      }).catch(function () { return null; });
    }

    if (vocabWordsOpt) {
      var savedVocab = readVocabMakerSaved();
      if (savedVocab && savedVocab.words && savedVocab.words.length) {
        vocabWordsOpt.hidden = false;
        syncSavedGroup();
      }
    }

    if (wsWordsOpt) {
      var savedWs = readWordSoundsMakerSaved();
      if (savedWs && savedWs.words && savedWs.words.length) {
        wsWordsOpt.hidden = false;
        syncSavedGroup();
      }
    }

    var SHEET_SPECS = {
      flashcards: { suffix: '-flashcards.html', label: '2-sided printable flashcards', build: buildFlashcardsHtml },
      frayer: { suffix: '-frayer.html', label: 'Frayer study sheets', build: buildFrayerHtml },
      'sorting-cards': { suffix: '-sorting-cards.html', label: 'cut-out sorting cards', build: buildSortingCardsHtml },
      worksheet: { suffix: '-worksheet.html', label: 'cloze and matching worksheet', build: buildWorksheetHtml },
      'word-sounds-worksheet': { suffix: '-word-sounds-worksheet.html', label: 'Word Sounds activity worksheet', build: buildWordSoundsWorksheetHtml },
      bingo: { suffix: '-bingo.html', label: 'classroom Bingo boards', build: buildBingoHtml },
      'loop-cards': { suffix: '-loop-cards.html', label: 'I Have, Who Has cards', build: buildLoopGameHtml },
      'word-wall': { suffix: '-word-wall.html', label: 'classroom Word Wall cards', build: buildWordWallHtml },
    };

    var mSup = root.AlloWordPracticeMedia;
    if ($('pe-opt-syllables')) $('pe-opt-syllables').addEventListener('change', function () {
      if (this.parentNode && this.parentNode.classList) this.parentNode.classList.toggle('is-on', !!this.checked);
      if (this.checked && mSup && mSup.ensureSyllableTableLoaded) mSup.ensureSyllableTableLoaded(doc);
    });
    if ($('pe-opt-bold')) $('pe-opt-bold').addEventListener('change', function () {
      if (this.parentNode && this.parentNode.classList) this.parentNode.classList.toggle('is-on', !!this.checked);
    });
    if (sheetTypeSelect) sheetTypeSelect.addEventListener('change', function () { syncFindOnlineAndMore(); });

    if (sheetDownloadBtn && sheetTypeSelect) {
      sheetDownloadBtn.addEventListener('click', function () {
        var key = sheetTypeSelect.value;
        var spec = hasOwn(SHEET_SPECS, key) ? SHEET_SPECS[key] : SHEET_SPECS.flashcards;
        var pack = activePack();
        var items = packItemsOf(pack);
        if (!items.length) {
          say('Add at least one word below before downloading a printable sheet.');
          return;
        }
        if (key === 'loop-cards' && items.length < 2) {
          say('Add at least 2 words to make an I Have, Who Has loop.');
          return;
        }
        var opts = sheetReadingOpts();
        var go = function () {
          var fname = slugTitle(pack.title) + spec.suffix;
          var rawHtml = spec.build(pack);
          var supOpts = key === 'word-sounds-worksheet' ? { syllables: false, bold: opts.bold } : opts;
          downloadHtmlFile(mSup && mSup.applySheetReadingSupports ? mSup.applySheetReadingSupports(rawHtml, supOpts) : rawHtml, fname);
          say(key === 'bingo' && items.length < 8
            ? 'Saved ' + spec.label + ' (' + fname + '). Fewer than 8 words, so words repeat on each 3x3 board — add 8 or more words for unique squares.'
            : 'Saved ' + spec.label + ' (' + fname + ').');
        };
        if (opts.syllables && !(root.AlloModules && root.AlloModules.SyllableTableEn) && mSup && mSup.ensureSyllableTableLoaded) mSup.ensureSyllableTableLoaded(doc).then(go);
        else go();
      });
    }

    if (openSrBtn) {
      openSrBtn.addEventListener('click', function () {
        openInSymbolRunner();
      });
    }

    var clearBtn = $('pe-clear-local');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        try {
          root.localStorage.removeItem('alloflow_word_practice_setup');
          root.localStorage.removeItem('alloflow-word-practice-setup-v1');
          if (clearStatusEl) clearStatusEl.textContent = 'Cleared saved choices on this browser.';
        } catch (_) {
          if (clearStatusEl) clearStatusEl.textContent = 'Browser storage could not be cleared here.';
        }
      });
    }

    if (myWords && typeof myWords.onChange === 'function') {
      myWords.onChange(function () {
        if (myWordsOpt && typeof myWords.list === 'function') {
          myWords.list().then(function (rows) {
            if (rows && rows.length) {
              myWordsOpt.hidden = false;
              syncSavedGroup();
            }
          }).catch(function () {});
        }
        matchBuiltInPictures({ quiet: true });
      });
    }

    var rawHash = (root.location && root.location.hash) || '';
    var fromVocabHash = rawHash === '#from-vocab';
    var fromWsHash = rawHash === '#from-word-sounds';
    var wordsMatch = /^#words=(.+)$/i.exec(rawHash);
    var hashWords = [];
    if (wordsMatch) {
      try {
        var decoded = decodeURIComponent(wordsMatch[1].slice(0, 4000));
        var seenHash = Object.create(null);
        decoded.split(/[,;\r\n]+/).forEach(function (w) {
          var clean = String(w || '').replace(/\s+/g, ' ').trim().slice(0, 80);
          var key = clean.toLowerCase();
          if (!clean || seenHash[key] || hashWords.length >= 60) return;
          seenHash[key] = true;
          hashWords.push(clean);
        });
      } catch (_) {
        hashWords = [];
      }
      try {
        if (root.history && typeof root.history.replaceState === 'function' && root.location) {
          root.history.replaceState(null, '', root.location.pathname + root.location.search);
        }
      } catch (_) {}
    }
    ensureVocabBankLoaded().then(function () {
      var savedNow = readVocabMakerSaved();
      if (vocabWordsOpt && savedNow && savedNow.words && savedNow.words.length) {
        vocabWordsOpt.hidden = false;
        syncSavedGroup();
      }
      var savedWsNow = readWordSoundsMakerSaved();
      if (wsWordsOpt && savedWsNow && savedWsNow.words && savedWsNow.words.length) {
        wsWordsOpt.hidden = false;
        syncSavedGroup();
      }
      if (hashWords.length) {
        var enrichedHash = enrichItems('Practice missed words', hashWords);
        setControllerPack({
          title: 'Practice missed words',
          language: 'en',
          words: enrichedHash,
          options: { mode: 'vocabulary', includePictures: true },
        });
        syncWordSource('custom', 'Words from link (' + enrichedHash.length + ')');
        say('Loaded ' + enrichedHash.length + ' words to practice.');
        return matchBuiltInPictures({ quiet: true });
      }
      if (fromVocabHash && savedNow && savedNow.words && savedNow.words.length) {
        if (wordSourceSelect) wordSourceSelect.value = 'saved:vocab';
        return applyVocabMakerWords({ quiet: false });
      }
      if (fromWsHash && savedWsNow && savedWsNow.words && savedWsNow.words.length) {
        if (wordSourceSelect) wordSourceSelect.value = 'saved:word-sounds';
        return applyWordSoundsMakerWords({ quiet: false });
      }
      return matchBuiltInPictures({ quiet: true });
    });
    ensurePhonemeClips();
  }

  init();

  root.AlloPacketsPresentExport = {
    applyStarter: applyStarter,
    matchBuiltInPictures: matchBuiltInPictures,
    loadVocabMakerWords: applyVocabMakerWords,
    loadWordSoundsMakerWords: applyWordSoundsMakerWords,
    buildFlashcardsHtml: buildFlashcardsHtml,
    buildFrayerHtml: buildFrayerHtml,
    buildSortingCardsHtml: buildSortingCardsHtml,
    buildWorksheetHtml: buildWorksheetHtml,
    buildWordSoundsWorksheetHtml: buildWordSoundsWorksheetHtml,
    buildBingoHtml: buildBingoHtml,
    buildLoopGameHtml: buildLoopGameHtml,
    buildWordWallHtml: buildWordWallHtml,
    openInSymbolRunner: openInSymbolRunner,
    resolveEntry: resolveEntry,
    searchSymbols: searchSymbols,
    getPack: function () { return lastPack; },
    getController: function () { return controller; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
