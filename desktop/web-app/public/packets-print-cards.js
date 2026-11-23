// "Print word cards" on the maker page (packets-make.html, step 3): the words of the file as cut-out cards,
// and a one-page word list, printed with the browser's own Print. Nothing here loads or sends anything.
// The pictures are the ones the maker already has: a picture the teacher added to a word (read from
// packets_my_words.js through the maker's own reader) wins over a symbol; the symbols come from the
// maker's picture index, whose drawings the maker fetches with its own loader (handed in, so they are
// never fetched twice). Each printed page carries the credit of each picture set it shows.
//
// window.AlloPacketPrintCards = { wire(button, getState), open(state), close(), layout(words, perPage), ... }
//   getState() -> { words: [], title, pictures: true/false, symbols: the picture index or null,
//                   loadPictures() -> Promise<ready>, own(words) -> Promise<{ word: { picture } } or null> }
(function (root) {
  'use strict';

  var VERSION = 1;
  // Cards on a page: columns x rows. The page is laid out to fit inside 12 mm margins on US Letter and A4.
  var SIZES = { 4: { cols: 2, rows: 2, name: 'Big' }, 6: { cols: 2, rows: 3, name: 'Medium' }, 12: { cols: 3, rows: 4, name: 'Small' } };
  var DEFAULT_SIZE = 6;
  var LONGEST = 24;   // a word a teacher adds is at most 24 letters (packets_my_words.js LIMITS.wordMax)
  var SET_ORDER = ['mulberry', 'openmoji', 'diagram'];
  var TEXT = {
    title: 'Word cards',
    print: 'Print',
    back: 'Back to the maker',
    options: 'Card options',
    size: 'Card size',
    shows: 'Each card shows',
    showBoth: 'The word and its picture',
    showWord: 'Only the word',
    showPicture: 'Only the picture, for matching games',
    lines: 'Lines to cut along',
    syllables: 'Show syllable breaks (a\u00b7b\u00b7c)',
    pagesLegend: 'What to print',
    pagesBoth: 'The cards and a word list',
    pagesCards: 'Only the cards',
    pagesList: 'Only the word list',
    picturesOff: 'Pictures are off, so the cards show only the word. To add pictures, check Include pictures in step 3.',
    noPictureShowsWord: 'A word with no picture shows the word instead.',
    nothing: 'No words are chosen yet. Choose the words in step 2, then come back here.',
    getting: 'Getting the pictures, about {mb} MB.',
    gotNone: 'The pictures could not be downloaded, so the cards show only the pictures you added. Check the connection, then open the cards again.',
    syllablesFailed: 'Syllable breaks could not be loaded right now, so the words are shown without dots.',
    listHeading: 'Word list',
    tip: 'What you see below is what prints. In the print window, keep the scale at 100%.',
    cardsPage: 'Cards, page {n} of {of}',
    picturesLine: 'Pictures: ',
    yourPicture: 'Picture for "{word}": '
  };

  function fill(text, values) { return String(text).replace(/\{(\w+)\}/g, function (all, key) { return values && values[key] != null ? String(values[key]) : all; }); }
  function count(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
  function cleanWords(list) {
    var seen = Object.create(null), out = [];
    (Array.isArray(list) ? list : []).forEach(function (word) {
      var w = String(word == null ? '' : word).trim();
      var key = w.toLowerCase();
      if (w && !seen[key]) { seen[key] = true; out.push(w); }
    });
    return out;
  }
  function sizeOf(value) { var n = Number(value); return Object.prototype.hasOwnProperty.call(SIZES, n) ? n : DEFAULT_SIZE; }
  // The words, in order, cut into pages of perPage.
  function layout(words, perPage) {
    var per = sizeOf(perPage), pages = [];
    for (var i = 0; i < words.length; i += per) pages.push(words.slice(i, i + per));
    return pages;
  }
  // The class that sizes a word to its card (packets-print-cards.css): one for each length, so the page needs no inline style.
  function lengthClass(word) { return 'pc-len-' + Math.max(1, Math.min(LONGEST, String(word).length)); }
  function svgUri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(String(svg)); }
  function isPicture(uri) { return typeof uri === 'string' && /^data:image\/(?:png|jpeg|jpg|webp|gif|svg\+xml)[;,]/.test(uri); }

  // ---------------------------------------------------------------------------
  // Word Sounds Activity Worksheets (13 Packets + 6 Main-App activities)
  // ---------------------------------------------------------------------------
  var WS_KEY_NOTICE = 'For the teacher \u2014 keep apart from the student copy';
  var WS_CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'";
  var WS_ACTIVITIES = {
    mapping: { label: 'Sound Mapping', directions: 'Say each word and write the letter or letters for each sound in the boxes.' },
    missing_letter: { label: 'Missing Letter', directions: 'Circle the missing letter and write it in the box.' },
    word_scramble: { label: 'Word Scramble', directions: 'Unscramble the letter tiles and write the word on the line.' },
    counting: { label: 'Sound Counting', directions: 'Say each word slowly. Circle the number of sounds you hear.' },
    isolation: { label: 'Find Sounds', directions: 'Listen for the sound asked in each prompt and circle the matching sound.' },
    segmentation: { label: 'Break It Down', directions: 'Tap one circle for each sound in the word. Then write the sounds or word on the line.' },
    blending: { label: 'Blend Sounds', directions: 'Put the separated sounds together. Write the blended word on the line or circle the matching word.' },
    rhyming: { label: 'Rhyme Time', directions: 'Read or look at the word. Circle the choice that rhymes with it.' },
    word_families: { label: 'Word Families', directions: 'Circle the words that belong to the word family, then write more words in the same family.' },
    sound_sort: { label: 'Sound Sort', directions: 'Sort the words from the word bank into the matching sound columns below.' },
    letter_tracing: { label: 'Letter Trace', directions: 'Trace each guide letter along the lines, then practice writing it beside the guides.' },
    orthography: { label: 'Sight & Spell', directions: 'Listen as your teacher reads each word aloud. Write each word on its line.' },
    spelling_bee: { label: 'Spelling Bee', directions: 'Listen carefully as your teacher reads each word aloud. Spell each word on its line.' },
    syllable_counting: { label: 'Syllable Counting', directions: 'Say each word and scoop or clap the syllables. Circle how many syllables you hear.' },
    syllable_blending: { label: 'Syllable Blending', directions: 'Blend the word parts together. Write the whole word on the line or circle the match.' },
    manipulation: { label: 'Sound Switch', directions: 'Follow each sound-change prompt. Write the new word on the line or circle the match.' },
    decoding: { label: 'Word Reading', directions: 'Read each word aloud. Check the box when you read it and circle its matching picture if shown.' },
    read_sentence: { label: 'Read a Sentence', directions: 'Read each sentence aloud. Circle the word that fits best and write it in the blank.' },
    read_passage: { label: 'Read a Story', directions: 'Read the passage aloud and check a box each time you read it. Then answer the question below.' },
    sentence_match: { label: 'Sentence Match', directions: 'Read the sentence and number the pictures or words in order.' }
  };
  var WS_HIDE_WORD = { orthography: 1, spelling_bee: 1 };
  var WS_HIDE_PICTURE = { blending: 1, syllable_blending: 1 };
  var WS_NO_SYLLABLES = { missing_letter: 1, word_scramble: 1, letter_tracing: 1, mapping: 1, syllable_counting: 1 };
  var WS_FRIENDLY_SOUND = { oo_short: 'short oo', dh: 'th (this)', zh: 'zh', schwa: 'uh' };
  var WS_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
  var WS_DEFAULT_ACTIVITIES = ['mapping', 'missing_letter', 'word_scramble', 'counting'];

  function wsEsc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;';
    });
  }
  function wsHash(text) {
    var h = 2166136261 >>> 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function wsShuffle(list, seedText) {
    var out = (Array.isArray(list) ? list : []).slice();
    var h = wsHash(seedText) || 1;
    for (var i = out.length - 1; i > 0; i--) {
      h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
      var j = h % (i + 1);
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }
  function wsSoundLabel(raw) {
    var s = String(raw == null ? '' : raw).replace(/^\/|\/$/g, '').trim();
    if (!s) return '';
    return Object.prototype.hasOwnProperty.call(WS_FRIENDLY_SOUND, s) ? '/' + WS_FRIENDLY_SOUND[s] + '/' : '/' + s + '/';
  }
  function wsIsAudioId(v) { return typeof v === 'string' && /^a\d+$/.test(v); }
  function wsEstimatePhonemes(word) {
    var w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return [];
    var trigraphs = ['igh', 'tch', 'dge'];
    var digraphs = ['sh', 'ch', 'th', 'wh', 'ph', 'ng', 'ck', 'qu', 'wr', 'kn', 'gn', 'mb', 'ar', 'er', 'ir', 'or', 'ur', 'ai', 'ay', 'au', 'aw', 'ea', 'ee', 'ei', 'ey', 'ew', 'ie', 'oa', 'oe', 'oi', 'oo', 'ou', 'ow', 'oy', 'ue'];
    var res = [], i = 0;
    var silentE = w.length >= 4 && w.charAt(w.length - 1) === 'e' && /[aeiou]/.test(w.slice(0, -1)) && !/[aeiou]/.test(w.charAt(w.length - 2)) && w.slice(-2) !== 'le';
    var end = silentE ? w.length - 1 : w.length;
    while (i < end) {
      if (i + 3 <= end && trigraphs.indexOf(w.slice(i, i + 3)) >= 0) { res.push(w.slice(i, i + 3)); i += 3; }
      else if (i + 2 <= end && digraphs.indexOf(w.slice(i, i + 2)) >= 0) { res.push(w.slice(i, i + 2)); i += 2; }
      else if (w.charAt(i) === 'c' && i + 1 < end && 'eiy'.indexOf(w.charAt(i + 1)) >= 0) { res.push('s'); i += 1; }
      else if (w.charAt(i) === 'c') { res.push('k'); i += 1; }
      else if (w.charAt(i) === 'g' && i + 1 < end && 'eiy'.indexOf(w.charAt(i + 1)) >= 0) { res.push('j'); i += 1; }
      else { res.push(w.charAt(i)); i += 1; }
    }
    return res.length ? res : [w];
  }
  function wsResolvePhonemes(word, item, ctx) {
    var clean = function (arr) {
      return arr.map(function (p) {
        if (typeof p === 'string') return wsIsAudioId(p) ? '' : p.trim();
        if (p && typeof p === 'object') return String(p.soundKey || p.phoneme || p.label || p.sound || p.text || '').trim();
        return '';
      }).filter(Boolean);
    };
    if (item && Array.isArray(item.phonemes) && item.phonemes.length) {
      var p1 = clean(item.phonemes);
      if (p1.length) return p1;
    }
    if (item && Array.isArray(item.sounds) && item.sounds.length && !item.sounds.some(wsIsAudioId)) {
      var p2 = clean(item.sounds);
      if (p2.length) return p2;
    }
    var low = String(word || '').trim().toLowerCase();
    if (low) {
      var coreObj = (ctx && ctx.core) || null;
      if (coreObj && typeof coreObj.dictionarySounds === 'function') {
        try {
          var ds = coreObj.dictionarySounds(low);
          if (ds && Array.isArray(ds.sounds) && ds.sounds.length) return ds.sounds.slice();
        } catch (_) {}
      }
      var dictObj = (ctx && ctx.dictionary) || (root && root.AlloModules && root.AlloModules.WordSoundsPhonemes) || null;
      if (dictObj && typeof dictObj.lookup === 'function') {
        try {
          var found = dictObj.lookup(low);
          if (found && Array.isArray(found[0]) && found[0].length) return Array.prototype.slice.call(found[0]);
        } catch (_) {}
      }
    }
    return wsEstimatePhonemes(low);
  }
  function wsResolveGraphemes(word, item, phonemes, ctx) {
    var low = String(word || '').trim().toLowerCase();
    var board = item && item.activityItems && item.activityItems.mapping;
    var rawG = (item && Array.isArray(item.graphemes) && item.graphemes.length ? item.graphemes : null)
      || (board && Array.isArray(board.graphemes) && board.graphemes.length ? board.graphemes : null);
    if (rawG && rawG.join('').toLowerCase() === low) return rawG.map(String);
    var coreObj = (ctx && ctx.core) || null;
    if (coreObj && typeof coreObj.soundAnalysis === 'function' && low && phonemes.length) {
      try {
        var an = coreObj.soundAnalysis(low, phonemes);
        if (an && an.mapping && an.mapping.status === 'ready' && Array.isArray(an.graphemes) && an.graphemes.length) return an.graphemes.slice();
      } catch (_) {}
    }
    return low ? low.split('') : [];
  }
  function wsLookupSyllables(word, syllablesSrc) {
    var src = syllablesSrc || (root && root.AlloModules && root.AlloModules.SyllableTableEn) || null;
    if (!src) return null;
    var w = String(word || '');
    var lower = w.toLowerCase();
    var found = null;
    try {
      if (typeof src === 'function') found = src(lower);
      else if (typeof src.lookup === 'function') found = src.lookup(lower);
    } catch (_) { found = null; }
    if (!found) return null;
    var parts = Array.isArray(found) ? found : (!found.check && Array.isArray(found.parts) ? found.parts : null);
    if (!parts || parts.length < 2 || parts.join('').length !== w.length) return null;
    var out = [], pos = 0;
    for (var i = 0; i < parts.length; i++) {
      out.push(w.slice(pos, pos + parts[i].length));
      pos += parts[i].length;
    }
    return out;
  }
  function wsEstimateSyllables(word) {
    var w = String(word || '').trim();
    if (!w) return [];
    var low = w.toLowerCase().replace(/[^a-z]/g, '');
    if (low.length <= 3) return [w];
    var trimmed = low.length > 3 && low.charAt(low.length - 1) === 'e' && !/le$/.test(low) ? low.slice(0, -1) : low;
    var groups = trimmed.match(/[aeiouy]+/g) || [];
    var countN = Math.max(1, groups.length);
    if (countN === 1) return [w];
    var step = Math.max(1, Math.round(w.length / countN));
    var out = [];
    for (var i = 0; i < countN; i++) {
      var start = i * step;
      var end = i === countN - 1 ? w.length : Math.min(w.length, (i + 1) * step);
      if (start < end) out.push(w.slice(start, end));
    }
    return out.length ? out : [w];
  }
  function wsFormatSyllableText(text, useSyllables, syllablesSrc) {
    var str = String(text == null ? '' : text);
    if (!useSyllables) return wsEsc(str);
    return str.replace(/[A-Za-z]+/g, function (tok) {
      var parts = tok.length >= 4 ? wsLookupSyllables(tok, syllablesSrc) : null;
      if (!parts || parts.length < 2) return wsEsc(tok);
      return parts.map(wsEsc).join('<span class="pc-dot" aria-hidden="true">\u00b7</span>');
    });
  }
  function wsRimeOf(word) {
    var s = String(word || '').toLowerCase();
    var m = /[aeiouy][a-z]*$/.exec(s);
    return m ? m[0] : s.slice(-2);
  }
  function wsScrambleLetters(word) {
    var letters = String(word || '').toLowerCase().split('').filter(function (ch) { return /[a-z0-9]/i.test(ch); });
    if (letters.length < 2) return letters;
    var out = wsShuffle(letters, 'scramble|' + word);
    if (out.join('') === letters.join('')) {
      for (var i = 1; i < out.length; i++) {
        if (out[i] !== out[0]) { var t = out[0]; out[0] = out[i]; out[i] = t; break; }
      }
    }
    return out;
  }
  function wsSafeImgFrom(value, imagesMap) {
    if (!value) return '';
    if (typeof value === 'string') {
      if (imagesMap && Object.prototype.hasOwnProperty.call(imagesMap, value)) {
        var resolved = imagesMap[value];
        return isPicture(resolved) ? resolved : '';
      }
      if (isPicture(value)) return value;
      return '';
    }
    if (typeof value === 'object') {
      if (value.none === true) return '';
      var cand = value.src || value.dataUri || value.uri || '';
      return isPicture(cand) ? cand : '';
    }
    return '';
  }
  function wsSynthesizeItem(activity, rawEntry, idx, allWords, ctx) {
    var entry = typeof rawEntry === 'string' ? { word: rawEntry } : (rawEntry && typeof rawEntry === 'object' ? rawEntry : {});
    var word = String(entry.word || entry.targetWord || entry.term || entry.printed || entry.target || '').trim();
    var board = entry.activityItems && entry.activityItems[activity] && typeof entry.activityItems[activity] === 'object'
      ? entry.activityItems[activity] : null;
    var phonemes = wsResolvePhonemes(word, entry, ctx);
    var graphemes = wsResolveGraphemes(word, entry, phonemes, ctx);
    var base = Object.assign({}, board || {}, entry, { word: word, phonemes: phonemes, graphemes: graphemes });
    var low = word.toLowerCase();

    if (activity === 'mapping') {
      var spans = Array.isArray(base.spans) ? base.spans : (Array.isArray(base.chipSpans) ? base.chipSpans : null);
      var soundCount = spans ? spans.reduce(function (a, b) { return a + (Number(b) || 1); }, 0) : (phonemes.length || graphemes.length || low.length || 3);
      var bank = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean)
        : (Array.isArray(base.chipOrder) && base.chipOrder.length
            ? base.chipOrder.map(function (c) { return String((c && c.text) || ''); }).filter(Boolean)
            : wsShuffle(graphemes.length ? graphemes : low.split(''), 'map|' + low));
      if (bank.length > 1 && bank.join('').toLowerCase() === low) {
        var tmpB = bank[0]; bank[0] = bank[bank.length - 1]; bank[bank.length - 1] = tmpB;
      }
      return { word: word, phonemes: phonemes, graphemes: graphemes, spans: spans, soundCount: Math.max(1, soundCount), bank: bank, item: base };
    }
    if (activity === 'missing_letter') {
      var lettersArr = Array.isArray(base.letters) && base.letters.length ? base.letters.slice() : null;
      var hiddenIndex = Number.isInteger(base.hiddenIndex) && base.hiddenIndex >= 0 && base.hiddenIndex < word.length
        ? base.hiddenIndex : (word.length > 2 ? 1 : 0);
      var correctLetter = String(base.correctLetter || (lettersArr ? base.target : '') || word.charAt(hiddenIndex) || '').toLowerCase();
      if (!lettersArr) {
        lettersArr = word.split('');
        if (lettersArr.length) lettersArr[hiddenIndex] = '';
      }
      var opts = Array.isArray(base.options) && base.options.length ? base.options.map(String) : [];
      if (!opts.length && correctLetter) {
        var isVowel = 'aeiou'.indexOf(correctLetter) >= 0;
        var pool = (isVowel ? 'aeiou' : 'bcdfghjklmnprstvwz').split('').filter(function (c) { return c !== correctLetter; });
        opts = wsShuffle([correctLetter].concat(wsShuffle(pool, 'ml|' + low).slice(0, 3)), 'mlo|' + low);
      }
      if (base.capital) opts = opts.map(function (c) { return c.toUpperCase(); });
      return { word: word, letters: lettersArr, hiddenIndex: hiddenIndex, correctLetter: base.capital ? correctLetter.toUpperCase() : correctLetter, choices: opts, item: base };
    }
    if (activity === 'word_scramble') {
      var tiles = Array.isArray(base.letters) && base.letters.length ? base.letters.map(String) : wsScrambleLetters(word);
      if (tiles.length > 1 && tiles.join('').toLowerCase() === low) tiles = wsScrambleLetters(word);
      return { word: word, tiles: tiles, item: base };
    }
    if (activity === 'counting') {
      var cnt = Number(base.answer) || Number(base.target) || Number(base.phonemeCount) || phonemes.length || 3;
      var maxBubble = Math.max(6, Math.min(10, cnt >= 6 ? cnt + 1 : 6));
      var vals = [];
      for (var ci = 1; ci <= maxBubble; ci++) vals.push(String(ci));
      if (cnt >= 11) vals.push('11+');
      return { word: word, phonemes: phonemes, answer: cnt >= 11 ? '11+' : String(cnt), values: vals, item: base };
    }
    if (activity === 'isolation') {
      var pos = Number.isInteger(base.position) && base.position >= 0 ? base.position : 0;
      var posName = base.positionName || (pos === 0 ? 'beginning' : (phonemes.length > 1 && pos === phonemes.length - 1 ? 'ending' : (pos === 1 && phonemes.length === 3 ? 'middle' : (WS_ORDINALS[pos] || (pos + 1) + 'th'))));
      if (posName === 'first') posName = 'beginning';
      if (posName === 'last') posName = 'ending';
      var correct = String(base.correctSound || (typeof base.target === 'string' && base.target !== word ? base.target : '') || phonemes[pos] || phonemes[0] || low.charAt(0));
      var rawChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(function (c) { return typeof c === 'string' ? c : String((c && (c.label || c.text)) || ''); }).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      if (!rawChoices.length) {
        var isoPool = ['s', 'm', 't', 'p', 'k', 'n', 'b', 'd', 'a', 'e', 'i', 'o', 'u', 'sh', 'ch'].filter(function (s) { return s !== correct; });
        rawChoices = wsShuffle([correct].concat(wsShuffle(isoPool, 'iso|' + low).slice(0, 3)), 'isoo|' + low);
      }
      return { word: word, position: pos, positionName: posName, correctSound: correct, choices: rawChoices, item: base };
    }
    if (activity === 'segmentation') {
      var segSounds = phonemes.length ? phonemes : wsEstimatePhonemes(low);
      var segChips = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(function (c) { return typeof c === 'string' ? c : String((c && (c.label || c.phoneme || c.text)) || ''); }).filter(Boolean)
        : [];
      return { word: word, sounds: segSounds, slotCount: Number(base.slotCount) || segSounds.length || 3, chips: segChips, item: base };
    }
    if (activity === 'blending') {
      var blendSounds = phonemes.length ? phonemes : wsEstimatePhonemes(low);
      var blendChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      return { word: word, sounds: blendSounds, choices: blendChoices, item: base };
    }
    if (activity === 'rhyming') {
      var answer = String(base.answer || (typeof base.target === 'string' && base.target.toLowerCase() !== low ? base.target : '') || base.rhymeWord || (Array.isArray(base.rhymes) && base.rhymes[0]) || '');
      var rChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      if (!rChoices.length) {
        var rime = wsRimeOf(low);
        var guessRhyme = answer || (low.charAt(0) === 'b' ? 'm' : 'b') + rime;
        if (!answer) answer = guessRhyme;
        var others = allWords.filter(function (w) { return w.toLowerCase() !== low && w.toLowerCase() !== answer.toLowerCase(); }).slice(0, 3);
        var fillers = ['dog', 'sun', 'bed', 'map'].filter(function (w) { return w !== low && w !== answer.toLowerCase() && others.indexOf(w) < 0; });
        rChoices = wsShuffle([answer].concat(others, fillers).slice(0, 4), 'rhy|' + low);
      }
      return { word: word, answer: answer || rChoices[0] || '', choices: rChoices, item: base };
    }
    if (activity === 'word_families') {
      var rimeVal = String(base.rime || base.familyEnding || wsRimeOf(low)).replace(/^-/, '');
      var wfChips = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(function (c) { return typeof c === 'string' ? { text: c, member: c.toLowerCase().slice(-rimeVal.length) === rimeVal } : { text: String(c.text || ''), member: !!c.member }; }).filter(function (c) { return c.text; })
        : [];
      if (!wfChips.length) {
        var mem = (Array.isArray(base.options) ? base.options : Array.isArray(base.familyMembers) ? base.familyMembers : []).map(String).filter(Boolean);
        var dis = (Array.isArray(base.distractors) ? base.distractors : allWords.filter(function (w) { return w.toLowerCase() !== low && w.toLowerCase().slice(-rimeVal.length) !== rimeVal; }).slice(0, 2)).map(String).filter(Boolean);
        wfChips = wsShuffle(
          mem.map(function (t) { return { text: t, member: true }; }).concat(dis.map(function (t) { return { text: t, member: false }; })),
          'wf|' + low
        );
      }
      var wfMembers = wfChips.filter(function (c) { return c.member; }).map(function (c) { return c.text; });
      return { word: word, rime: rimeVal, chips: wfChips, members: wfMembers, item: base };
    }
    if (activity === 'sound_sort') {
      var sortMode = base.mode === 'last' ? 'last' : 'first';
      var sortSound = String(base.sound || base.targetChar || (sortMode === 'last' ? phonemes[phonemes.length - 1] : phonemes[0]) || low.charAt(0));
      var sortChips = Array.isArray(base.chips) && base.chips.length
        ? base.chips.map(function (c) { return typeof c === 'string' ? { text: c, member: true } : { text: String(c.text || ''), member: !!c.member }; }).filter(function (c) { return c.text; })
        : [];
      if (!sortChips.length) {
        var sMem = (Array.isArray(base.options) ? base.options : [word]).map(String).filter(Boolean);
        var sDis = (Array.isArray(base.distractors) ? base.distractors : allWords.filter(function (w) { return w.toLowerCase() !== low; }).slice(0, 2)).map(String).filter(Boolean);
        sortChips = wsShuffle(
          sMem.map(function (t) { return { text: t, member: true }; }).concat(sDis.map(function (t) { return { text: t, member: false }; })),
          'ss|' + low
        );
      }
      return { word: word, mode: sortMode, sound: sortSound, chips: sortChips, item: base };
    }
    if (activity === 'letter_tracing') {
      var firstLetter = String(base.letter || word.charAt(0) || 'a').trim().charAt(0) || 'a';
      var rawParts = Array.isArray(base.parts) && base.parts.length ? base.parts : null;
      var traceCase = base.cases || (ctx && ctx.tracing) || 'both';
      var parts = rawParts
        ? rawParts.map(function (p) { return { letter: String(p.letter || firstLetter), kind: String(p.kind || '') }; })
        : (traceCase === 'capital'
            ? [{ letter: firstLetter.toUpperCase(), kind: 'capital' }]
            : traceCase === 'lowercase'
              ? [{ letter: firstLetter.toLowerCase(), kind: 'lowercase' }]
              : [{ letter: firstLetter.toUpperCase(), kind: 'capital' }, { letter: firstLetter.toLowerCase(), kind: 'lowercase' }]);
      return { word: word, letter: firstLetter, parts: parts, item: base };
    }
    if (activity === 'orthography' || activity === 'spelling_bee') {
      var bankLetters = Array.isArray(base.letterBank) && base.letterBank.length ? base.letterBank.map(String) : null;
      return { word: word, phonemes: phonemes, soundCount: phonemes.length || low.length || 3, letterBank: bankLetters, lengthHint: !!base.lengthHint, item: base };
    }
    if (activity === 'syllable_counting') {
      var syls = Array.isArray(base.syllables) && base.syllables.length ? base.syllables.map(String) : (wsLookupSyllables(word, ctx && ctx.syllablesSrc) || wsEstimateSyllables(word));
      var sylCount = Number(base.count) || Number(base.answer) || Number(base.target) || syls.length || 1;
      var maxSyl = Math.max(5, Math.min(8, sylCount + 1));
      var sylVals = [];
      for (var si = 1; si <= maxSyl; si++) sylVals.push(String(si));
      return { word: word, syllables: syls, count: sylCount, values: sylVals, item: base };
    }
    if (activity === 'syllable_blending') {
      var sbSyls = Array.isArray(base.syllables) && base.syllables.length ? base.syllables.map(String)
        : (Array.isArray(base.units) && base.units.length ? base.units.map(function (u) { return String((u && u.text) || u || ''); }).filter(Boolean)
          : (wsLookupSyllables(word, ctx && ctx.syllablesSrc) || wsEstimateSyllables(word)));
      var sbChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      return { word: word, syllables: sbSyls, choices: sbChoices, item: base };
    }
    if (activity === 'manipulation') {
      var task = base.task || base.manipulationTask || {};
      var mAnswer = String(base.answer || task.answer || (typeof base.target === 'string' && base.target.toLowerCase() !== low ? base.target : '') || (low.length > 2 ? low.slice(1) : word));
      var mPrompt = String(base.instructionText || task.instruction || ('Say "' + word + '". Now say it without the first sound.'));
      var mChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean)
        : (Array.isArray(base.options) && base.options.length ? base.options.map(String) : []);
      return { word: word, prompt: mPrompt, answer: mAnswer, choices: mChoices, item: base };
    }
    if (activity === 'decoding') {
      var dChoices = Array.isArray(base.choices) && base.choices.length
        ? base.choices.map(function (c) { return typeof c === 'string' ? { text: c, image: '' } : { text: String(c.text || c.label || ''), image: c.image || '' }; }).filter(function (c) { return c.text; })
        : [];
      return { word: String(base.printed || word), choices: dChoices, item: base };
    }
    if (activity === 'read_sentence') {
      var rsAns = String(base.answer || word);
      var before = base.before != null ? String(base.before) : '';
      var after = base.after != null ? String(base.after) : '';
      if (!before && !after) {
        var sent = String(base.sentence || base.example || ('I see a ' + word + '.'));
        var reW = new RegExp('\\b' + rsAns.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        var idxM = sent.search(reW);
        if (idxM >= 0) { before = sent.slice(0, idxM); after = sent.slice(idxM + rsAns.length); }
        else { before = sent + ' '; after = '.'; }
      }
      var rsOpts = Array.isArray(base.options) && base.options.length
        ? base.options.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean)
        : (Array.isArray(base.choices) ? base.choices.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean) : [rsAns]);
      return { word: word, before: before, after: after, answer: rsAns, options: rsOpts, item: base };
    }
    if (activity === 'read_passage') {
      var rawLines = Array.isArray(base.lines) && base.lines.length ? base.lines
        : (Array.isArray(base.story) && base.story.length ? base.story
          : (typeof base.story === 'string' && base.story.trim() ? base.story.trim().split(/\r?\n/) : ['Read a short sentence using the word ' + word + '.']));
      var rpLines = rawLines.map(function (ln) {
        if (typeof ln === 'string') return { text: ln };
        if (ln && typeof ln === 'object') {
          if (ln.before != null || ln.after != null) return { before: String(ln.before || ''), after: String(ln.after || '') };
          return { text: String(ln.text || '') };
        }
        return { text: '' };
      }).filter(function (ln) { return ln.text || ln.before || ln.after; });
      var rpOpts = Array.isArray(base.options) && base.options.length
        ? base.options.map(function (c) { return typeof c === 'string' ? c : String((c && (c.text || c.label)) || ''); }).filter(Boolean)
        : [];
      return { word: word, lines: rpLines, options: rpOpts, answer: String(base.answer || base.target || word), item: base };
    }
    return { word: word, item: base };
  }

  function buildSoundSortBoards(items) {
    var byCat = Object.create(null), orderCats = [];
    items.forEach(function (it) {
      var key = it.mode + '|' + it.sound.toLowerCase();
      if (!byCat[key]) {
        byCat[key] = { key: key, mode: it.mode, sound: it.sound, anchor: it.word, members: [], distractors: [] };
        orderCats.push(key);
      }
      var cat = byCat[key];
      (it.chips || []).forEach(function (ch) {
        var bucket = ch.member ? cat.members : cat.distractors;
        if (bucket.indexOf(ch.text) < 0) bucket.push(ch.text);
      });
    });
    var boards = [];
    if (orderCats.length === 1) {
      var sole = byCat[orderCats[0]];
      var prep = sole.mode === 'last' ? 'Ends with ' : 'Starts with ';
      var neg = sole.mode === 'last' ? 'Does not end with ' : 'Does not start with ';
      var bank = wsShuffle(sole.members.concat(sole.distractors), 'sort1|' + sole.key);
      boards.push({
        columns: [
          { heading: prep + wsSoundLabel(sole.sound) + (sole.anchor ? ' (like ' + sole.anchor + ')' : ''), words: sole.members.slice() },
          { heading: neg + wsSoundLabel(sole.sound), words: sole.distractors.slice() }
        ],
        bank: bank
      });
    } else {
      for (var i = 0; i < orderCats.length; ) {
        var rem = orderCats.length - i;
        var take = rem === 4 ? 2 : Math.min(3, rem);
        var slice = orderCats.slice(i, i + take);
        var cols = [], bankWords = [], seenW = Object.create(null);
        slice.forEach(function (k) {
          var c = byCat[k];
          var prep2 = c.mode === 'last' ? 'Ends with ' : 'Starts with ';
          var ws = c.members.length ? c.members.slice() : (c.anchor ? [c.anchor] : []);
          cols.push({ heading: prep2 + wsSoundLabel(c.sound) + (c.anchor ? ' (like ' + c.anchor + ')' : ''), words: ws });
          ws.forEach(function (w) { if (!seenW[w.toLowerCase()]) { seenW[w.toLowerCase()] = true; bankWords.push(w); } });
        });
        boards.push({ columns: cols, bank: wsShuffle(bankWords, 'sortm|' + slice.join(',')) });
        i += take;
      }
    }
    return boards;
  }

  function normalizeWorksheetModel(lessonOrState, rawOptions) {
    var src = lessonOrState && typeof lessonOrState === 'object' ? lessonOrState : {};
    var opts = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
    var lesson = src.lesson && typeof src.lesson === 'object' ? src.lesson : (Array.isArray(src.blocks) ? src : null);
    var blocks = (Array.isArray(src.blocks) && src.blocks.length ? src.blocks : null)
      || (lesson && Array.isArray(lesson.blocks) && lesson.blocks.length ? lesson.blocks : null);
    var imagesMap = src.images || (lesson && lesson.images) || {};
    var manifest = src.manifest || null;
    var title = String(opts.title || src.title || (lesson && lesson.title) || 'Word Sounds Activity Worksheet').trim() || 'Word Sounds Activity Worksheet';
    var preset = String(opts.preset || src.preset || '').trim().toLowerCase();
    var rawPic = opts.pictures !== undefined ? opts.pictures
      : (opts.showPictures !== undefined ? opts.showPictures
        : (preset === 'scaffolded' ? true : src.pictures));
    var rawKey = opts.answerKey !== undefined ? opts.answerKey
      : (opts.includeAnswerKey !== undefined ? opts.includeAnswerKey : true);
    var rawHints = opts.hints !== undefined ? opts.hints
      : (opts.showHints !== undefined ? opts.showHints
        : (preset === 'scaffolded' ? true : (preset === 'independent' ? false : true)));
    var rawSyl = opts.syllables !== undefined ? opts.syllables
      : (opts.showSyllables !== undefined ? opts.showSyllables
        : (preset === 'scaffolded' ? true : (preset === 'independent' ? false : !!src.syllables)));
    var picturesOn = rawPic !== undefined ? !!rawPic : true;
    var answerKeyOn = !!rawKey;
    var hintsOn = !!rawHints;
    var syllablesOn = !!rawSyl;
    var tracingCase = opts.tracing || src.tracing || (src.sessionConfig && src.sessionConfig.tracingCases) || 'both';
    var defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
    var symbols = opts.symbols !== undefined ? opts.symbols : (src.symbols || (root && root.AlloModules && root.AlloModules.WordSoundsSymbols) || null);
    var matcher = opts.matcher !== undefined ? opts.matcher : (src.matcher !== undefined ? src.matcher : defaultMatcher);
    var ownMap = (opts.own && typeof opts.own === 'object' && typeof opts.own !== 'function') ? opts.own
      : (src.own && typeof src.own === 'object' && typeof src.own !== 'function' ? src.own : null);
    var creditLine = typeof opts.creditLine === 'function' ? opts.creditLine
      : (typeof src.creditLine === 'function' ? src.creditLine : (root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine));
    var ctx = {
      core: opts.core || src.core || null,
      dictionary: opts.dictionary || src.dictionary || null,
      syllablesSrc: opts.syllablesTable || src.syllablesTable || (root && root.AlloModules && root.AlloModules.SyllableTableEn) || null,
      tracing: tracingCase
    };

    var rawWordList = Array.isArray(src.wsPreloadedWords) && src.wsPreloadedWords.length ? src.wsPreloadedWords
      : (Array.isArray(src.data) && src.data.length ? src.data
        : (Array.isArray(src.items) && src.items.length ? src.items
          : (Array.isArray(src.words) ? src.words : [])));
    var allWordStrings = rawWordList.map(function (e) {
      return typeof e === 'string' ? e.trim() : String((e && (e.word || e.targetWord || e.term)) || '').trim();
    }).filter(Boolean);

    var sections = [];
    if (blocks && blocks.length) {
      blocks.forEach(function (block) {
        if (!block || !Array.isArray(block.items) || !block.items.length) return;
        var act = String(block.activity || 'mapping');
        var meta = WS_ACTIVITIES[act] || { label: act.replace(/_/g, ' '), directions: 'Complete each item below.' };
        var bWords = block.items.map(function (it) { return String((it && (it.word || it.target)) || '').trim(); }).filter(Boolean);
        var items = block.items.map(function (it, idx) { return wsSynthesizeItem(act, it, idx, bWords.length ? bWords : allWordStrings, ctx); });
        if (act === 'letter_tracing') {
          var seenLt = Object.create(null);
          items = items.filter(function (it) {
            var k = it.parts.map(function (p) { return p.letter; }).join('');
            if (seenLt[k]) return false;
            seenLt[k] = true;
            return true;
          });
        }
        sections.push({ activity: act, label: meta.label, directions: meta.directions, items: items });
      });
    } else if (rawWordList.length) {
      var actList = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : null)
        || (Array.isArray(src.activities) && src.activities.length ? src.activities : null)
        || (Array.isArray(src.lessonPlanSequence) && src.lessonPlanSequence.length ? src.lessonPlanSequence : null)
        || WS_DEFAULT_ACTIVITIES;
      actList.forEach(function (actId) {
        var act = String(actId || '').trim();
        if (!act) return;
        var meta = WS_ACTIVITIES[act] || { label: act.replace(/_/g, ' '), directions: 'Complete each item below.' };
        var items = rawWordList.map(function (entry, idx) { return wsSynthesizeItem(act, entry, idx, allWordStrings, ctx); }).filter(function (it) { return it.word; });
        if (act === 'letter_tracing') {
          var seenLt2 = Object.create(null);
          items = items.filter(function (it) {
            var k = it.parts.map(function (p) { return p.letter; }).join('');
            if (seenLt2[k]) return false;
            seenLt2[k] = true;
            return true;
          });
        }
        if (items.length) sections.push({ activity: act, label: meta.label, directions: meta.directions, items: items });
      });
    }

    // Collect every word that might need a picture and resolve pictures + attribution.
    var picWords = [], seenPicWord = Object.create(null);
    var noteWord = function (w) {
      var clean = String(w || '').trim();
      var k = clean.toLowerCase();
      if (clean && !seenPicWord[k]) { seenPicWord[k] = true; picWords.push(clean); }
    };
    sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        noteWord(it.word);
        if (sec.activity === 'rhyming') (it.choices || []).forEach(noteWord);
        if (sec.activity === 'sound_sort') (it.chips || []).forEach(function (c) { noteWord(c.text); });
        if (sec.activity === 'decoding') (it.choices || []).forEach(function (c) { noteWord(c.text); });
      });
    });

    var picMap = Object.create(null);
    if (picturesOn && picWords.length) {
      var resolved = picturesOf(picWords, ownMap, symbols, matcher);
      picWords.forEach(function (w) {
        if (resolved[w]) picMap[w.toLowerCase()] = resolved[w];
      });
      // Merge embedded item / lesson images when not suppressed by teacher { none: true }
      var manifestPic = manifest && manifest.pictures ? manifest.pictures : null;
      var manifestSetFor = function (low) {
        if (!manifestPic) return 'mulberry';
        if (manifestPic.teacher && manifestPic.teacher.indexOf(low) >= 0) return 'own';
        if (manifestPic.openmoji && manifestPic.openmoji.words && manifestPic.openmoji.words.indexOf(low) >= 0) return 'openmoji';
        if (manifestPic.diagram && manifestPic.diagram.words && manifestPic.diagram.words.indexOf(low) >= 0) return 'diagram';
        return 'mulberry';
      };
      sections.forEach(function (sec) {
        sec.items.forEach(function (it) {
          var raw = it.item || {};
          var low = String(it.word || '').toLowerCase();
          var ownE = ownEntryFor(ownMap, it.word);
          if (raw.pictureNone || (ownE && ownE.picture && ownE.picture.none)) { picMap[low] = null; return; }
          var emb = wsSafeImgFrom(raw.wordPicture, imagesMap) || wsSafeImgFrom(raw.image, imagesMap) || wsSafeImgFrom(raw.picture, imagesMap);
          if (emb && !picMap[low]) {
            var cred = raw.imageCredit || (raw.picture && raw.picture.credit) || null;
            var setName = cred ? 'own' : manifestSetFor(low);
            picMap[low] = { uri: emb, set: setName, credit: typeof cred === 'string' ? { title: cred } : (cred || null), creditText: typeof cred === 'string' ? cred : '' };
          }
          if (sec.activity === 'decoding') {
            (it.choices || []).forEach(function (c) {
              var cEmb = wsSafeImgFrom(c.image, imagesMap);
              if (cEmb && !picMap[c.text.toLowerCase()]) {
                picMap[c.text.toLowerCase()] = { uri: cEmb, set: manifestSetFor(c.text.toLowerCase()), credit: null };
              }
            });
          }
        });
      });
    }

    var usedPicWords = [], usedPicByWord = Object.create(null);
    var pictureFor = function (word) {
      if (!picturesOn) return null;
      var k = String(word || '').trim().toLowerCase();
      var p = k ? picMap[k] : null;
      if (!p || !p.uri) return null;
      if (!usedPicByWord[k]) { usedPicByWord[k] = p; usedPicWords.push(k); }
      return p;
    };

    // Pre-mark used pictures by walking sections, and compute credits.
    var computeCredits = function () {
      var lines = creditsFor(usedPicWords, usedPicByWord, symbols, creditLine);
      usedPicWords.forEach(function (w) {
        var p = usedPicByWord[w];
        if (p && p.creditText && lines.every(function (l) { return l.indexOf(p.creditText) < 0; })) {
          lines.push(fill(TEXT.yourPicture, { word: w }) + p.creditText);
        }
      });
      return lines;
    };

    return {
      title: title,
      sections: sections,
      picturesOn: picturesOn,
      answerKeyOn: answerKeyOn,
      hintsOn: hintsOn,
      syllablesOn: syllablesOn,
      syllablesSrc: ctx.syllablesSrc,
      pictureFor: pictureFor,
      computeCredits: computeCredits,
      words: picWords
    };
  }

  function wsKeyEntryText(activity, it) {
    if (activity === 'mapping') return it.word + ' \u2014 ' + (it.graphemes.length ? it.graphemes.join(' \u00b7 ') : it.word) + ' (' + it.soundCount + ' ' + (it.soundCount === 1 ? 'sound' : 'sounds') + ')';
    if (activity === 'missing_letter') return it.word + ' \u2014 missing letter: ' + it.correctLetter;
    if (activity === 'word_scramble') return it.word + ' (tiles: ' + (it.tiles || []).join(', ') + ')';
    if (activity === 'counting') return it.word + ' \u2014 ' + it.answer + ' ' + (String(it.answer) === '1' ? 'sound' : 'sounds') + ' (' + (it.phonemes || []).map(wsSoundLabel).join(' ') + ')';
    if (activity === 'isolation') return it.word + ' \u2014 ' + it.positionName + ' sound: ' + wsSoundLabel(it.correctSound);
    if (activity === 'segmentation') return it.word + ' \u2014 ' + (it.sounds || []).map(wsSoundLabel).join(' \u00b7 ') + ' (' + it.slotCount + ' ' + (it.slotCount === 1 ? 'sound' : 'sounds') + ')';
    if (activity === 'blending') return it.word + ' \u2014 Say: ' + (it.sounds || []).map(wsSoundLabel).join(' \u00b7 ');
    if (activity === 'rhyming') return it.word + ' \u2014 rhymes with: ' + it.answer;
    if (activity === 'word_families') return '-' + it.rime + ' family (like ' + it.word + ') \u2014 ' + (it.members && it.members.length ? it.members.join(', ') : 'any real word ending in -' + it.rime);
    if (activity === 'letter_tracing') return it.parts.map(function (p) { return p.letter; }).join(' / ') + ' (for ' + it.word + ') \u2014 Practice only';
    if (activity === 'orthography' || activity === 'spelling_bee') return 'Read aloud: "' + it.word + '" \u2014 Spelling: ' + it.word + ' (' + it.soundCount + ' ' + (it.soundCount === 1 ? 'sound' : 'sounds') + ': ' + (it.phonemes || []).map(wsSoundLabel).join(' ') + ')';
    if (activity === 'syllable_counting') return it.word + ' \u2014 ' + it.count + ' ' + (it.count === 1 ? 'syllable' : 'syllables') + ' (' + (it.syllables || []).join(' \u00b7 ') + ')';
    if (activity === 'syllable_blending') return it.word + ' \u2014 Say: ' + (it.syllables || []).join(' \u00b7 ');
    if (activity === 'manipulation') return it.answer + ' \u2014 Prompt: ' + it.prompt;
    if (activity === 'decoding') return it.word;
    if (activity === 'read_sentence') return it.answer + ' \u2014 "' + it.before + it.answer + it.after + '"';
    if (activity === 'read_passage') return it.answer + ' (Fluency reading check)';
    return it.word;
  }

  var WS_STANDALONE_CSS = [
    '@page{margin:12mm}',
    '*{box-sizing:border-box}',
    'body{font-family:Arial,Helvetica,sans-serif;background:#ffffff;color:#000000;margin:16px auto;max-width:190mm;padding:0 12px;line-height:1.35}',
    '.ws-noprint{margin:0 0 12px;padding:8px 12px;border:1px solid #000000;font-size:13px;background:#ffffff;color:#000000}',
    '.ws-header{border-bottom:2px solid #000000;padding-bottom:10px;margin-bottom:14px}',
    '.ws-title{margin:0 0 10px;font-size:22px;font-weight:700;color:#000000}',
    '.ws-meta{display:flex;flex-wrap:wrap;gap:10px 28px;font-size:14px;font-weight:700}',
    '.ws-meta-field{display:inline-flex;align-items:baseline;gap:8px;flex:1 1 200px}',
    '.ws-meta-line{flex:1 1 auto;border-bottom:1.5px solid #000000;min-width:110px;height:16px}',
    '.ws-section{margin-top:18px}',
    '.ws-section-head{break-after:avoid;page-break-after:avoid;margin-bottom:8px}',
    '.ws-section-title{margin:0 0 4px;font-size:17px;font-weight:700;color:#000000}',
    '.ws-directions{margin:0;font-size:13px;color:#000000}',
    '.ws-list{list-style:none;margin:6px 0 0;padding:0}',
    '.ws-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #808080;break-inside:avoid;page-break-inside:avoid}',
    '.ws-num{min-width:26px;font-size:15px;font-weight:700}',
    '.ws-body{flex:1 1 auto;min-width:0}',
    '.ws-prompt{margin:0 0 6px;font-size:14px;font-weight:700}',
    '.ws-row{display:flex;flex-wrap:wrap;align-items:center;gap:12px}',
    '.ws-pic{display:block;width:64px;height:64px;object-fit:contain;border:1px solid #808080;padding:3px;background:#ffffff;flex:none}',
    '.ws-pic-sm{display:block;width:36px;height:36px;object-fit:contain;flex:none}',
    '.ws-word{font-size:21px;font-weight:700;letter-spacing:.02em;overflow-wrap:anywhere}',
    '.pc-dot{font-weight:400;color:#808080;margin:0 -0.02em}',
    '.ws-boxes{display:inline-flex;flex-wrap:wrap;align-items:center}',
    '.ws-box{display:inline-block;width:42px;height:42px;border:2px solid #000000;background:#ffffff}',
    '.ws-box+.ws-box{margin-left:-2px}',
    '.ws-box-span-2{width:84px}',
    '.ws-bank{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px;font-size:13px}',
    '.ws-bank-label{font-weight:700;margin-right:4px}',
    '.ws-chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border:1.5px solid #000000;border-radius:5px;font-size:14px;font-weight:700;background:#ffffff}',
    '.ws-missing{display:inline-flex;align-items:center;gap:4px;font-size:26px;font-weight:700;letter-spacing:.04em}',
    '.ws-blank{display:inline-block;min-width:34px;height:36px;border:2px solid #000000;border-radius:5px;background:#ffffff;vertical-align:middle}',
    '.ws-tiles{display:inline-flex;flex-wrap:wrap;gap:8px}',
    '.ws-tile{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:38px;padding:0 8px;border:2px solid #000000;border-radius:6px;font-size:20px;font-weight:700;background:#ffffff}',
    '.ws-choices{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:8px 0 0;padding:0}',
    '.ws-choice{display:inline-flex;align-items:center;gap:6px;padding:4px 14px;border:1.5px solid #000000;border-radius:999px;font-size:15px;font-weight:700;background:#ffffff}',
    '.ws-bubbles{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:8px 0 0;padding:0}',
    '.ws-bubble{display:inline-flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 6px;border:1.5px solid #000000;border-radius:999px;font-size:15px;font-weight:700;background:#ffffff}',
    '.ws-tap-dots{display:inline-flex;flex-wrap:wrap;gap:10px;align-items:center}',
    '.ws-tap-dot{display:inline-block;width:32px;height:32px;border:2px solid #000000;border-radius:999px;background:#ffffff}',
    '.ws-sounds-seq{font-size:20px;font-weight:700;letter-spacing:.04em}',
    '.ws-line{width:100%;max-width:380px;height:36px;margin-top:8px;border-bottom:2px solid #000000;border-top:1px dashed #808080}',
    '.ws-build-lines{display:flex;flex-wrap:wrap;gap:12px 26px;margin-top:10px;font-size:18px;font-weight:700}',
    '.ws-build-slot{display:inline-flex;align-items:baseline}',
    '.ws-build-blank{display:inline-block;width:52px;border-bottom:2px solid #000000;margin-right:2px}',
    '.ws-sort-bank{border:1.5px solid #000000;border-radius:6px;padding:8px 10px;margin:8px 0 12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#ffffff}',
    '.ws-sort-cols{display:grid;gap:10px;margin-top:8px}',
    '.ws-sort-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}',
    '.ws-sort-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}',
    '.ws-sort-col{border:1.5px solid #000000;border-radius:6px;padding:8px 10px;min-height:130px;background:#ffffff;break-inside:avoid;page-break-inside:avoid}',
    '.ws-sort-col-head{margin:0 0 8px;padding-bottom:6px;border-bottom:1.5px solid #000000;font-size:14px;font-weight:700;text-align:center}',
    '.ws-sort-line{height:28px;border-bottom:1px solid #808080}',
    '.ws-trace-wrap{display:flex;flex-direction:column;gap:10px;margin-top:8px}',
    '.ws-trace-row{position:relative;display:flex;align-items:flex-end;gap:22px;height:78px;max-width:560px;border-top:2px solid #000000;border-bottom:2px solid #000000;padding:0 12px;background:#ffffff}',
    '.ws-trace-row::before{content:"";position:absolute;left:0;right:0;top:50%;border-top:1.5px dashed #808080}',
    '.ws-trace-letter{position:relative;z-index:1;font-size:66px;line-height:.88;font-weight:400;font-family:Arial,Helvetica,sans-serif;color:#808080}',
    '@supports (-webkit-text-stroke:1px #000000){.ws-trace-letter{color:#ffffff;-webkit-text-stroke:1.6px #808080}}',
    '.ws-scoops{display:inline-flex;gap:8px;align-items:center;margin-top:6px}',
    '.ws-scoop{display:inline-block;width:52px;height:18px;border-bottom:2px solid #000000;border-left:1px solid #808080;border-right:1px solid #808080;border-radius:0 0 18px 18px}',
    '.ws-fluency{display:flex;flex-wrap:wrap;gap:14px;margin-top:8px;font-size:13px}',
    '.ws-check-item{display:inline-flex;align-items:center;gap:6px}',
    '.ws-checkbox{display:inline-block;width:16px;height:16px;border:1.5px solid #000000;background:#ffffff}',
    '.ws-passage{margin:6px 0 8px;padding:10px 12px;border:1.5px solid #000000;font-size:15px;line-height:1.65}',
    '.ws-passage p{margin:0 0 6px}.ws-passage p:last-child{margin-bottom:0}',
    '.ws-credits{margin-top:18px;padding-top:8px;border-top:1px solid #808080;font-size:11px;line-height:1.4;color:#000000}',
    '.ws-credits p{margin:2px 0;overflow-wrap:anywhere}',
    '.ws-key{break-before:page;page-break-before:always;margin-top:24px;padding-top:12px;border-top:2px solid #000000}',
    '.ws-key-banner{margin:0 0 12px;padding:8px 12px;border:2px solid #000000;font-size:14px;font-weight:700;background:#ffffff}',
    '.ws-key h2{margin:0 0 8px;font-size:18px}.ws-key h3{margin:12px 0 4px;font-size:15px}',
    '.ws-key-list{margin:4px 0 10px;padding-left:24px;font-size:14px;line-height:1.55}',
    '.ws-key-list li{margin:4px 0;break-inside:avoid;page-break-inside:avoid}',
    '@media print{body{margin:0;max-width:none;padding:0}.ws-noprint{display:none}.ws-key{break-before:page;page-break-before:always;margin-top:0;border-top:none}}'
  ].join('');

  function buildWordSoundsWorksheetHtml(lessonOrState, options) {
    var model = normalizeWorksheetModel(lessonOrState, options);
    var fmt = function (text, allowSyl) {
      return wsFormatSyllableText(text, model.syllablesOn && allowSyl !== false, model.syllablesSrc);
    };
    var picTag = function (word, neutralAlt, small) {
      var p = model.pictureFor(word);
      if (!p) return '';
      return '<img class="' + (small ? 'ws-pic-sm' : 'ws-pic') + '" src="' + wsEsc(p.uri) + '" alt="' + wsEsc(neutralAlt ? neutralAlt : word) + '">';
    };

    var keyBlocks = [];
    var sectionsHtml = model.sections.map(function (sec) {
      var act = sec.activity;
      var allowSyl = !WS_NO_SYLLABLES[act];
      if (act === 'sound_sort') {
        var boards = buildSoundSortBoards(sec.items);
        var sortKeyLines = [];
        var boardsHtml = boards.map(function (b, bIdx) {
          var bankHtml = '<div class="ws-sort-bank"><span class="ws-bank-label">Word bank:</span>' + b.bank.map(function (w) {
            return '<span class="ws-chip">' + picTag(w, '', true) + '<span>' + fmt(w, true) + '</span></span>';
          }).join('') + '</div>';
          var colClass = b.columns.length >= 3 ? 'ws-sort-cols ws-sort-cols-3' : 'ws-sort-cols ws-sort-cols-2';
          var colsHtml = '<div class="' + colClass + '">' + b.columns.map(function (col) {
            var linesCount = Math.max(4, col.words.length + 1);
            var linesHtml = '';
            for (var li = 0; li < linesCount; li++) linesHtml += '<div class="ws-sort-line"></div>';
            sortKeyLines.push(col.heading + ': ' + (col.words.length ? col.words.join(', ') : '(none)'));
            return '<div class="ws-sort-col"><h4 class="ws-sort-col-head">' + wsEsc(col.heading) + '</h4>' + linesHtml + '</div>';
          }).join('') + '</div>';
          return '<div class="ws-sort-board" data-sort-board="' + (bIdx + 1) + '">' + bankHtml + colsHtml + '</div>';
        }).join('');
        keyBlocks.push({ heading: sec.label, lines: sortKeyLines });
        return '<section class="ws-section" data-activity="sound_sort">'
          + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(sec.label) + '</h2><p class="ws-directions">' + wsEsc(sec.directions) + '</p></div>'
          + boardsHtml + '</section>';
      }

      var secKeyLines = [];
      var itemsHtml = sec.items.map(function (it, idx) {
        var n = idx + 1;
        var neutralAlt = 'Picture clue ' + n;
        var hidePic = !!WS_HIDE_PICTURE[act];
        var hideWord = !!WS_HIDE_WORD[act];
        var inner = '';

        if (act === 'mapping') {
          var pic = picTag(it.word, neutralAlt, false);
          var boxes = '';
          for (var bi = 0; bi < it.soundCount; bi++) boxes += '<span class="ws-box"></span>';
          var bank = model.hintsOn && it.bank && it.bank.length
            ? '<div class="ws-bank"><span class="ws-bank-label">Letter bank:</span>' + it.bank.map(function (g) { return '<span class="ws-chip">' + wsEsc(g) + '</span>'; }).join('') + '</div>'
            : '';
          inner = '<div class="ws-row">' + pic + '<div class="ws-boxes" data-sound-boxes="' + it.soundCount + '">' + boxes + '</div></div>' + bank;
        } else if (act === 'missing_letter') {
          var mlPic = picTag(it.word, neutralAlt, false);
          var mlWord = '<div class="ws-missing">' + it.letters.map(function (ch, ci) {
            return ci === it.hiddenIndex ? '<span class="ws-blank" aria-label="missing letter"></span>' : '<span>' + wsEsc(ch) + '</span>';
          }).join('') + '</div>';
          var mlChoices = '<ul class="ws-choices">' + (it.choices || []).map(function (c) {
            return '<li class="ws-choice">' + wsEsc(c) + '</li>';
          }).join('') + '</ul>';
          inner = '<div class="ws-row">' + mlPic + mlWord + '</div>' + mlChoices;
        } else if (act === 'word_scramble') {
          var wsPic = picTag(it.word, neutralAlt, false);
          var tiles = '<div class="ws-tiles">' + (it.tiles || []).map(function (t) {
            return '<span class="ws-tile">' + wsEsc(t) + '</span>';
          }).join('') + '</div>';
          inner = '<div class="ws-row">' + wsPic + tiles + '</div><div class="ws-line"></div>';
        } else if (act === 'counting') {
          var ctPic = picTag(it.word, '', false);
          var bubbles = '<ul class="ws-bubbles">' + (it.values || ['1', '2', '3', '4', '5', '6']).map(function (v) {
            return '<li class="ws-bubble">' + wsEsc(v) + '</li>';
          }).join('') + '</ul>';
          inner = '<div class="ws-row">' + ctPic + '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span></div>' + bubbles;
        } else if (act === 'isolation') {
          var isoPic = picTag(it.word, '', false);
          var isoChoices = '<ul class="ws-choices">' + (it.choices || []).map(function (c) {
            return '<li class="ws-choice">' + wsEsc(wsSoundLabel(c)) + '</li>';
          }).join('') + '</ul>';
          inner = '<p class="ws-prompt">What is the ' + wsEsc(it.positionName) + ' sound in ' + fmt(it.word, allowSyl) + '?</p>'
            + '<div class="ws-row">' + isoPic + '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span></div>' + isoChoices;
        } else if (act === 'segmentation') {
          var segPic = picTag(it.word, '', false);
          var dots = '';
          for (var di = 0; di < it.slotCount; di++) dots += '<span class="ws-tap-dot"></span>';
          var segBank = model.hintsOn && it.chips && it.chips.length
            ? '<div class="ws-bank"><span class="ws-bank-label">Sound bank:</span>' + it.chips.map(function (s) { return '<span class="ws-chip">' + wsEsc(wsSoundLabel(s)) + '</span>'; }).join('') + '</div>'
            : '';
          inner = '<div class="ws-row">' + segPic + '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span><div class="ws-tap-dots" data-tap-dots="' + it.slotCount + '">' + dots + '</div></div>'
            + '<div class="ws-line"></div>' + segBank;
        } else if (act === 'blending') {
          var seq = '<div class="ws-sounds-seq">' + (it.sounds || []).map(wsSoundLabel).map(wsEsc).join(' \u00b7 ') + '</div>';
          var bChoices = it.choices && it.choices.length
            ? '<ul class="ws-choices">' + it.choices.map(function (c) { return '<li class="ws-choice">' + fmt(c, allowSyl) + '</li>'; }).join('') + '</ul>'
            : '';
          inner = seq + '<div class="ws-line"></div>' + bChoices;
        } else if (act === 'rhyming') {
          var rhPic = picTag(it.word, '', false);
          var rhChoices = '<ul class="ws-choices">' + (it.choices || []).map(function (c) {
            return '<li class="ws-choice">' + picTag(c, '', true) + '<span>' + fmt(c, allowSyl) + '</span></li>';
          }).join('') + '</ul>';
          inner = '<p class="ws-prompt">Circle the word that rhymes with ' + fmt(it.word, allowSyl) + ':</p>'
            + '<div class="ws-row">' + rhPic + '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span></div>' + rhChoices;
        } else if (act === 'word_families') {
          var wfPic = picTag(it.word, '', false);
          var wfList = it.chips && it.chips.length
            ? '<ul class="ws-choices">' + it.chips.map(function (c) { return '<li class="ws-choice">' + fmt(c.text, allowSyl) + '</li>'; }).join('') + '</ul>'
            : '';
          var buildSlots = '<div class="ws-build-lines">'
            + '<span class="ws-build-slot"><span class="ws-build-blank"></span><span>' + wsEsc(it.rime) + '</span></span>'
            + '<span class="ws-build-slot"><span class="ws-build-blank"></span><span>' + wsEsc(it.rime) + '</span></span>'
            + '<span class="ws-build-slot"><span class="ws-build-blank"></span><span>' + wsEsc(it.rime) + '</span></span>'
            + '</div>';
          inner = '<p class="ws-prompt">Word family: -' + wsEsc(it.rime) + ' (like ' + fmt(it.word, allowSyl) + ')</p>'
            + '<div class="ws-row">' + wfPic + '<span class="ws-word">-' + wsEsc(it.rime) + '</span></div>' + wfList + buildSlots;
        } else if (act === 'letter_tracing') {
          var ltPic = picTag(it.word, '', false);
          var rowsHtml = (it.parts || []).map(function (part) {
            var guides = '';
            for (var gi = 0; gi < 3; gi++) guides += '<span class="ws-trace-letter">' + wsEsc(part.letter) + '</span>';
            return '<div class="ws-trace-row" data-trace-case="' + wsEsc(part.kind || 'letter') + '">' + guides + '</div>';
          }).join('');
          inner = '<div class="ws-row">' + ltPic + '<p class="ws-prompt">Trace ' + wsEsc(it.parts.map(function (p) { return p.letter; }).join(' and ')) + ' (for ' + wsEsc(it.word) + ')</p></div>'
            + '<div class="ws-trace-wrap">' + rowsHtml + '</div>';
        } else if (act === 'orthography' || act === 'spelling_bee') {
          var spPic = picTag(it.word, neutralAlt, false);
          var scaffold = '';
          if (model.hintsOn) {
            var sCount = it.lengthHint ? it.word.length : it.soundCount;
            var sBoxes = '';
            for (var sbi = 0; sbi < sCount; sbi++) sBoxes += '<span class="ws-box"></span>';
            scaffold += '<div class="ws-boxes" data-sound-boxes="' + sCount + '">' + sBoxes + '</div>';
            if (it.letterBank && it.letterBank.length) {
              scaffold += '<div class="ws-bank"><span class="ws-bank-label">Letters:</span>' + it.letterBank.map(function (l) { return '<span class="ws-chip">' + wsEsc(l) + '</span>'; }).join('') + '</div>';
            }
          }
          inner = '<p class="ws-prompt">Listen to your teacher and write word #' + n + ':</p>'
            + '<div class="ws-row">' + spPic + scaffold + '</div><div class="ws-line"></div>';
        } else if (act === 'syllable_counting') {
          var scPic = picTag(it.word, '', false);
          var scBubbles = '<ul class="ws-bubbles">' + (it.values || ['1', '2', '3', '4', '5']).map(function (v) {
            return '<li class="ws-bubble">' + wsEsc(v) + '</li>';
          }).join('') + '</ul>';
          var scoops = '<div class="ws-scoops" aria-hidden="true"><span class="ws-scoop"></span><span class="ws-scoop"></span><span class="ws-scoop"></span></div>';
          inner = '<div class="ws-row">' + scPic + '<span class="ws-word">' + wsEsc(it.word) + '</span></div>' + scoops + scBubbles;
        } else if (act === 'syllable_blending') {
          var sbSeq = '<div class="ws-sounds-seq">' + (it.syllables || []).map(wsEsc).join(' \u00b7 ') + '</div>';
          var sbChoices = it.choices && it.choices.length
            ? '<ul class="ws-choices">' + it.choices.map(function (c) { return '<li class="ws-choice">' + fmt(c, allowSyl) + '</li>'; }).join('') + '</ul>'
            : '';
          inner = sbSeq + '<div class="ws-line"></div>' + sbChoices;
        } else if (act === 'manipulation') {
          var mChoices = it.choices && it.choices.length
            ? '<ul class="ws-choices">' + it.choices.map(function (c) { return '<li class="ws-choice">' + fmt(c, allowSyl) + '</li>'; }).join('') + '</ul>'
            : '';
          inner = '<p class="ws-prompt">' + wsEsc(it.prompt) + '</p><div class="ws-line"></div>' + mChoices;
        } else if (act === 'decoding') {
          var dChecks = '<div class="ws-fluency"><span class="ws-check-item"><span class="ws-checkbox"></span> Read aloud</span><span class="ws-check-item"><span class="ws-checkbox"></span> Read smoothly</span></div>';
          var dPics = it.choices && it.choices.length
            ? '<ul class="ws-choices">' + it.choices.map(function (c) {
                var img = picTag(c.text, 'Picture choice', true);
                return '<li class="ws-choice">' + (img || wsEsc(c.text)) + '</li>';
              }).join('') + '</ul>'
            : '';
          inner = '<div class="ws-row"><span class="ws-word">' + fmt(it.word, allowSyl) + '</span></div>' + dChecks + dPics;
        } else if (act === 'read_sentence') {
          var rsPic = picTag(it.word, neutralAlt, false);
          var rsSentence = '<p class="ws-prompt">' + fmt(it.before, allowSyl) + '<span class="ws-blank" aria-label="blank"></span>' + fmt(it.after, allowSyl) + '</p>';
          var rsChoices = '<ul class="ws-choices">' + (it.options || []).map(function (c) {
            return '<li class="ws-choice">' + fmt(c, allowSyl) + '</li>';
          }).join('') + '</ul>';
          var rsFluency = '<div class="ws-fluency"><span class="ws-check-item"><span class="ws-checkbox"></span> Read the completed sentence aloud</span></div>';
          inner = '<div class="ws-row">' + rsPic + '<div>' + rsSentence + rsChoices + rsFluency + '</div></div>';
        } else if (act === 'read_passage') {
          var rpBody = '<div class="ws-passage">' + (it.lines || []).map(function (ln) {
            if (ln.before != null || ln.after != null) return '<p>' + fmt(ln.before, allowSyl) + '<span class="ws-blank" aria-label="blank"></span>' + fmt(ln.after, allowSyl) + '</p>';
            return '<p>' + fmt(ln.text, allowSyl) + '</p>';
          }).join('') + '</div>';
          var rpFluency = '<div class="ws-fluency">'
            + '<span class="ws-check-item"><span class="ws-checkbox"></span> 1st read</span>'
            + '<span class="ws-check-item"><span class="ws-checkbox"></span> 2nd read</span>'
            + '<span class="ws-check-item"><span class="ws-checkbox"></span> 3rd read</span></div>';
          var rpChoices = it.options && it.options.length
            ? '<ul class="ws-choices">' + it.options.map(function (c) { return '<li class="ws-choice">' + fmt(c, allowSyl) + '</li>'; }).join('') + '</ul>'
            : '<div class="ws-line"></div>';
          inner = rpBody + rpFluency + rpChoices;
        } else {
          var fPic = !hidePic ? picTag(it.word, '', false) : '';
          inner = '<div class="ws-row">' + fPic + (!hideWord ? '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span>' : '') + '</div><div class="ws-line"></div>';
        }

        secKeyLines.push(wsKeyEntryText(act, it));
        return '<li class="ws-item"><span class="ws-num">' + n + '.</span><div class="ws-body">' + inner + '</div></li>';
      }).join('');

      keyBlocks.push({ heading: sec.label, lines: secKeyLines });
      return '<section class="ws-section" data-activity="' + wsEsc(act) + '">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(sec.label) + '</h2><p class="ws-directions">' + wsEsc(sec.directions) + '</p></div>'
        + '<ol class="ws-list">' + itemsHtml + '</ol></section>';
    }).join('\n');

    var creditLines = model.computeCredits();
    var creditsHtml = creditLines.length
      ? '<footer class="ws-credits">' + creditLines.map(function (line) {
          return '<p>' + wsEsc(String(line).replace(/\b[a-z][a-z0-9+.-]{1,12}:\/\/+/gi, '')) + '</p>';
        }).join('') + '</footer>'
      : '';

    var keyHtml = '';
    if (model.answerKeyOn && keyBlocks.length) {
      keyHtml = '<section class="ws-key" aria-label="Teacher answer key">'
        + '<p class="ws-key-banner">' + wsEsc(WS_KEY_NOTICE) + '</p>'
        + '<h2>Teacher Answer Key &amp; Read-Aloud List</h2>'
        + keyBlocks.map(function (kb) {
            return '<h3>' + wsEsc(kb.heading) + '</h3><ol class="ws-key-list">' + kb.lines.map(function (line) {
              return '<li>' + wsEsc(line) + '</li>';
            }).join('') + '</ol>';
          }).join('')
        + '</section>';
    }

    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<meta http-equiv="Content-Security-Policy" content="' + WS_CSP + '">',
      '<meta name="referrer" content="no-referrer">',
      '<title>' + wsEsc(model.title) + ' \u2014 Activity Worksheet</title>',
      '<style>' + WS_STANDALONE_CSS + '</style>',
      '</head>',
      '<body>',
      '<p class="ws-noprint">Print from your browser menu (Ctrl+P or Cmd+P). Keep the scale at 100%.</p>',
      '<header class="ws-header">',
      '<h1 class="ws-title">' + wsEsc(model.title) + '</h1>',
      '<div class="ws-meta"><span class="ws-meta-field"><span>Name:</span><span class="ws-meta-line"></span></span><span class="ws-meta-field"><span>Date:</span><span class="ws-meta-line"></span></span></div>',
      '</header>',
      sectionsHtml || '<p>No worksheet items are available yet.</p>',
      creditsHtml,
      keyHtml,
      '</body>',
      '</html>'
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Packets Vocabulary Practice Worksheets (monochrome printable + standalone HTML)
  // ---------------------------------------------------------------------------
  var VOCAB_STANDALONE_CSS = WS_STANDALONE_CSS + [
    '.vocab-bank{border:1.5px solid #000000;border-radius:6px;padding:8px 10px;margin:10px 0 14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#ffffff;break-inside:avoid;page-break-inside:avoid}',
    '.vocab-match-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);gap:10px 24px;margin-top:8px}',
    '.vocab-match-words,.vocab-match-defs{list-style:none;margin:0;padding:0}',
    '.vocab-match-word,.vocab-match-def{display:flex;align-items:baseline;gap:8px;padding:8px 0;border-bottom:1px solid #808080;font-size:14px;color:#000000;break-inside:avoid;page-break-inside:avoid}',
    '.vocab-match-blank{display:inline-block;width:36px;border-bottom:1.5px solid #000000;flex:none}',
    '.vocab-match-letter{min-width:22px;font-weight:700;flex:none}',
    '.vocab-cloze-text{margin:0;font-size:15px;line-height:1.6;color:#000000}',
    '.vocab-cloze-blank{display:inline-block;min-width:105px;border-bottom:1.5px solid #000000;margin:0 4px;vertical-align:baseline}',
    '.vocab-pic-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;list-style:none;margin:10px 0 0;padding:0}',
    '.vocab-pic-tile{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;border:1.5px solid #000000;border-radius:6px;background:#ffffff;break-inside:avoid;page-break-inside:avoid}',
    '.vocab-pic-num{align-self:flex-start;font-size:13px;font-weight:700}',
    '.vocab-pic-img{display:block;width:86px;height:86px;object-fit:contain;background:#ffffff}',
    '.vocab-pic-line{width:100%;height:24px;border-bottom:1.5px solid #000000}'
  ].join('');

  function vocabLetterLabel(idx) {
    var n = Number(idx) || 0;
    if (n < 26) return String.fromCharCode(65 + n);
    return String.fromCharCode(65 + Math.floor(n / 26) - 1) + String.fromCharCode(65 + (n % 26));
  }
  function vocabClozeParts(entry) {
    var word = String((entry && entry.word) || '').trim();
    var preBlank = String((entry && entry.blank) || '').trim();
    if (preBlank && preBlank.indexOf('___') >= 0) {
      var cut = preBlank.indexOf('___');
      var before0 = preBlank.slice(0, cut);
      var after0 = preBlank.slice(cut + 3);
      var ans0 = String((entry && entry.blankAnswer) || word).trim() || word;
      return { hasCloze: true, before: before0, after: after0, answer: ans0, completed: before0 + ans0 + after0 };
    }
    var example = String((entry && entry.example) || '').trim();
    if (example && word) {
      var escRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
      var candidates = [new RegExp('\\b' + escRe(word) + '(?:s|es|ed|ing)?\\b', 'i')];
      if (word.length >= 4 && /e$/i.test(word)) {
        candidates.push(new RegExp('\\b' + escRe(word.slice(0, -1)) + '(?:e?s|ed|ing)\\b', 'i'));
      }
      if (word.length >= 4 && /y$/i.test(word)) {
        candidates.push(new RegExp('\\b' + escRe(word.slice(0, -1)) + 'ie(?:s|d)\\b', 'i'));
      }
      for (var ci = 0; ci < candidates.length; ci++) {
        var m = candidates[ci].exec(example);
        if (m) {
          var before1 = example.slice(0, m.index);
          var after1 = example.slice(m.index + m[0].length);
          return { hasCloze: true, before: before1, after: after1, answer: m[0], completed: example };
        }
      }
    }
    return {
      hasCloze: false,
      prompt: 'Write your own sentence using the word "' + word + '":',
      answer: word
    };
  }
  function normalizeVocabWorksheetModel(rawState, rawOptions) {
    var src = Array.isArray(rawState) ? { entries: rawState } : (rawState && typeof rawState === 'object' ? rawState : {});
    var opts = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
    var title = String(opts.title || src.title || 'Vocabulary Practice Worksheet').trim() || 'Vocabulary Practice Worksheet';
    var preset = String(opts.preset || src.preset || '').trim().toLowerCase();
    var rawBank = opts.wordBank !== undefined ? opts.wordBank
      : (opts.showWordBank !== undefined ? opts.showWordBank
        : (opts.hints !== undefined ? opts.hints
          : (opts.showHints !== undefined ? opts.showHints
            : (preset === 'scaffolded' ? true
              : (preset === 'independent' ? false
                : (src.wordBank !== undefined ? src.wordBank : true))))));
    var rawPic = opts.pictures !== undefined ? opts.pictures
      : (opts.showPictures !== undefined ? opts.showPictures
        : (preset === 'scaffolded' ? true
          : (src.pictures !== undefined ? src.pictures : true)));
    var rawKey = opts.answerKey !== undefined ? opts.answerKey
      : (opts.includeAnswerKey !== undefined ? opts.includeAnswerKey : true);
    var rawSyl = opts.syllables !== undefined ? opts.syllables
      : (opts.showSyllables !== undefined ? opts.showSyllables
        : (preset === 'scaffolded' ? true
          : (preset === 'independent' ? false : !!src.syllables)));
    var wordBankOn = !!rawBank;
    var picturesOn = !!rawPic;
    var answerKeyOn = !!rawKey;
    var syllablesOn = !!rawSyl;

    var defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
    var symbols = opts.symbols !== undefined ? opts.symbols : (src.symbols || (root && root.AlloModules && root.AlloModules.WordSoundsSymbols) || null);
    var matcher = opts.matcher !== undefined ? opts.matcher : (src.matcher !== undefined ? src.matcher : defaultMatcher);
    var ownMap = (opts.own && typeof opts.own === 'object' && typeof opts.own !== 'function') ? opts.own
      : (src.own && typeof src.own === 'object' && typeof src.own !== 'function' ? src.own : null);
    var creditLine = typeof opts.creditLine === 'function' ? opts.creditLine
      : (typeof src.creditLine === 'function' ? src.creditLine : (root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine));
    var syllablesSrc = opts.syllablesTable || src.syllablesTable || src.syllables || (root && root.AlloModules && root.AlloModules.SyllableTableEn) || null;
    if (typeof syllablesSrc === 'boolean') syllablesSrc = (root && root.AlloModules && root.AlloModules.SyllableTableEn) || null;

    var rawList = Array.isArray(src.entries) ? src.entries
      : (Array.isArray(src.items) ? src.items
        : (Array.isArray(src.rows) ? src.rows
          : (Array.isArray(src.words) ? src.words : [])));
    var seen = Object.create(null);
    var entries = [];
    rawList.forEach(function (raw) {
      var obj = typeof raw === 'string' ? { word: raw } : (raw && typeof raw === 'object' ? raw : null);
      if (!obj) return;
      var word = String(obj.word || obj.term || '').trim();
      var key = word.toLowerCase();
      if (!word || seen[key]) return;
      seen[key] = true;
      var meaning = String(obj.meaning || obj.definition || obj.def || '').trim();
      var example = String(obj.example || obj.sentence || '').trim();
      var blank = String(obj.blank || (obj.blankData && obj.blankData.ask) || '').trim();
      var blankAnswer = String(obj.blankAnswer || (obj.blankData && obj.blankData.answer) || word).trim();
      var noPicture = !!(obj.noPicture || obj.pictureOff);
      var picRaw = obj.picture || obj.pictureUri || obj.image || obj.svg || '';
      var directUri = '';
      if (!noPicture && typeof picRaw === 'string') {
        var trimmed = picRaw.trim();
        if (isPicture(trimmed)) directUri = trimmed;
        else if (/^<svg[\s>]/i.test(trimmed)) directUri = svgUri(trimmed);
      } else if (!noPicture && picRaw && typeof picRaw === 'object' && !picRaw.none) {
        var cand = String(picRaw.dataUri || picRaw.uri || picRaw.src || '').trim();
        if (isPicture(cand)) directUri = cand;
        else if (typeof picRaw.svg === 'string' && /^<svg[\s>]/i.test(picRaw.svg.trim())) directUri = svgUri(picRaw.svg.trim());
      }
      entries.push({
        word: word,
        meaning: meaning,
        example: example,
        blank: blank,
        blankAnswer: blankAnswer,
        noPicture: noPicture,
        directUri: directUri,
        pictureSet: String(obj.pictureSet || obj.pictureSource || '').trim(),
        pictureCredit: obj.pictureCredit || (picRaw && typeof picRaw === 'object' ? picRaw.credit : null) || null
      });
    });

    var words = entries.map(function (e) { return e.word; });
    var seedBase = title + '|' + words.join(',');

    // Resolve pictures for Part 3 — Name the Picture
    var usedPicWords = [];
    var usedPicByWord = Object.create(null);
    var resolvedFromIndex = picturesOn && words.length ? picturesOf(words, ownMap, symbols, matcher) : Object.create(null);
    var picEntries = [];
    if (picturesOn) {
      entries.forEach(function (ent) {
        if (ent.noPicture) return;
        var ownE = ownEntryFor(ownMap, ent.word);
        if (ownE && ownE.picture && ownE.picture.none) return;
        var resolved = null;
        if (ent.directUri) {
          var setName = ent.pictureSet || (ent.pictureCredit ? 'own' : 'own');
          if (setName === 'symbol') setName = 'mulberry';
          resolved = { uri: ent.directUri, set: setName, credit: ent.pictureCredit || null };
        } else if (resolvedFromIndex[ent.word] && resolvedFromIndex[ent.word].uri) {
          resolved = resolvedFromIndex[ent.word];
        }
        if (resolved && resolved.uri) {
          picEntries.push({ word: ent.word, uri: resolved.uri, picture: resolved });
          var k = ent.word.toLowerCase();
          if (!usedPicByWord[k]) { usedPicByWord[k] = resolved; usedPicWords.push(k); }
        }
      });
    }
    var pictureItems = wsShuffle(picEntries, 'vpic|' + seedBase);

    // Part 1 — Match the Word to Its Meaning
    var matchEntries = entries.filter(function (e) { return !!e.meaning; });
    var matchDefs = wsShuffle(matchEntries.map(function (e, idx) {
      return { wordIdx: idx, word: e.word, meaning: e.meaning };
    }), 'vmatch|' + seedBase);
    if (matchDefs.length >= 2 && matchDefs.every(function (d, i) { return d.wordIdx === i; })) {
      matchDefs.push(matchDefs.shift());
    }
    var letterByWordIdx = Object.create(null);
    var numberedDefs = matchDefs.map(function (d, i) {
      var letter = vocabLetterLabel(i);
      letterByWordIdx[d.wordIdx] = letter;
      return { letter: letter, wordIdx: d.wordIdx, word: d.word, meaning: d.meaning };
    });
    var matchWords = matchEntries.map(function (e, idx) {
      return { num: idx + 1, word: e.word, meaning: e.meaning, answerLetter: letterByWordIdx[idx] || '' };
    });

    // Part 2 — Fill in the Blank
    var clozeItems = entries.map(function (e, idx) {
      return Object.assign({ num: idx + 1, word: e.word }, vocabClozeParts(e));
    });

    // Shuffled Word Bank
    var wordBank = wsShuffle(words, 'vbank|' + seedBase);

    var computeCredits = function () {
      return creditsFor(usedPicWords, usedPicByWord, symbols, creditLine);
    };

    return {
      title: title,
      entries: entries,
      words: words,
      wordBank: wordBank,
      wordBankOn: wordBankOn,
      picturesOn: picturesOn,
      answerKeyOn: answerKeyOn,
      syllablesOn: syllablesOn,
      syllablesSrc: syllablesSrc,
      matchWords: matchWords,
      matchDefs: numberedDefs,
      clozeItems: clozeItems,
      pictureItems: pictureItems,
      computeCredits: computeCredits
    };
  }

  function buildVocabWorksheetHtml(rawState, options) {
    var model = normalizeVocabWorksheetModel(rawState, options);
    var fmt = function (text) {
      return wsFormatSyllableText(text, model.syllablesOn, model.syllablesSrc);
    };

    var bankHtml = model.wordBankOn && model.wordBank.length
      ? '<div class="vocab-bank" data-vocab-word-bank="true"><span class="ws-bank-label">Word Bank:</span>'
        + model.wordBank.map(function (w) { return '<span class="ws-chip">' + fmt(w) + '</span>'; }).join('')
        + '</div>'
      : '';

    var partsHtml = [];
    var keySections = [];

    // Part 1 — Match the Word to Its Meaning
    if (model.matchWords.length) {
      var wordsCol = '<ol class="vocab-match-words">' + model.matchWords.map(function (item) {
        return '<li class="vocab-match-word"><span class="ws-num">' + item.num + '.</span><span class="vocab-match-blank" aria-label="letter blank"></span><span class="ws-word">' + fmt(item.word) + '</span></li>';
      }).join('') + '</ol>';
      var defsCol = '<ol class="vocab-match-defs">' + model.matchDefs.map(function (def) {
        return '<li class="vocab-match-def"><span class="vocab-match-letter">' + wsEsc(def.letter) + '.</span><span>' + wsEsc(def.meaning) + '</span></li>';
      }).join('') + '</ol>';
      partsHtml.push(
        '<section class="ws-section" data-vocab-part="matching">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 1 \u2014 Match the Word to Its Meaning</h2>'
        + '<p class="ws-directions">Write the letter of the matching meaning on the line next to each word.</p></div>'
        + '<div class="vocab-match-grid">' + wordsCol + defsCol + '</div></section>'
      );
      keySections.push({
        heading: 'Part 1 \u2014 Match the Word to Its Meaning',
        lines: model.matchWords.map(function (item) {
          return item.word + ' \u2014 ' + item.answerLetter + ' (' + item.meaning + ')';
        })
      });
    } else if (model.entries.length) {
      partsHtml.push(
        '<section class="ws-section" data-vocab-part="matching">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 1 \u2014 Write Each Meaning</h2>'
        + '<p class="ws-directions">Write what each vocabulary word means on the line.</p></div>'
        + '<ol class="ws-list">' + model.entries.map(function (e, i) {
          return '<li class="ws-item"><span class="ws-num">' + (i + 1) + '.</span><div class="ws-body"><span class="ws-word">' + fmt(e.word) + '</span><div class="ws-line"></div></div></li>';
        }).join('') + '</ol></section>'
      );
      keySections.push({
        heading: 'Part 1 \u2014 Write Each Meaning',
        lines: model.entries.map(function (e) { return e.word + ' \u2014 Teacher-checked student meaning.'; })
      });
    }

    // Part 2 — Fill in the Blank
    if (model.clozeItems.length) {
      var clozeDir = model.wordBankOn
        ? 'Choose a word from the Word Bank to complete each sentence. Write the word on the line.'
        : 'Write the vocabulary word that best completes each sentence.';
      var clozeListHtml = '<ol class="ws-list">' + model.clozeItems.map(function (item) {
        var inner = item.hasCloze
          ? '<p class="vocab-cloze-text">' + wsEsc(item.before) + '<span class="vocab-cloze-blank" aria-label="blank"></span>' + wsEsc(item.after) + '</p>'
          : '<p class="vocab-cloze-text">' + wsEsc(item.prompt) + '</p><div class="ws-line"></div>';
        return '<li class="ws-item"><span class="ws-num">' + item.num + '.</span><div class="ws-body">' + inner + '</div></li>';
      }).join('') + '</ol>';
      partsHtml.push(
        '<section class="ws-section" data-vocab-part="cloze">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 2 \u2014 Fill in the Blank</h2>'
        + '<p class="ws-directions">' + wsEsc(clozeDir) + '</p></div>'
        + clozeListHtml + '</section>'
      );
      keySections.push({
        heading: 'Part 2 \u2014 Fill in the Blank',
        lines: model.clozeItems.map(function (item) {
          return item.hasCloze
            ? item.answer + ' \u2014 "' + item.completed + '"'
            : item.word + ' \u2014 Answers will vary (sentence using "' + item.word + '").';
        })
      });
    }

    // Part 3 — Name the Picture
    if (model.pictureItems.length) {
      var tilesHtml = '<ol class="vocab-pic-grid">' + model.pictureItems.map(function (item, idx) {
        var n = idx + 1;
        return '<li class="vocab-pic-tile">'
          + '<span class="vocab-pic-num">' + n + '.</span>'
          + '<img class="vocab-pic-img" src="' + wsEsc(item.uri) + '" alt="Picture ' + n + '">'
          + '<div class="vocab-pic-line" aria-label="writing line"></div>'
          + '</li>';
      }).join('') + '</ol>';
      partsHtml.push(
        '<section class="ws-section" data-vocab-part="pictures">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">Part 3 \u2014 Name the Picture</h2>'
        + '<p class="ws-directions">Look at each picture. Write the matching vocabulary word on the line underneath.</p></div>'
        + tilesHtml + '</section>'
      );
      keySections.push({
        heading: 'Part 3 \u2014 Name the Picture',
        lines: model.pictureItems.map(function (item) { return item.word; })
      });
    }

    var creditLines = model.computeCredits();
    var creditsHtml = creditLines.length
      ? '<footer class="ws-credits">' + creditLines.map(function (line) {
          return '<p>' + wsEsc(String(line).replace(/\b[a-z][a-z0-9+.-]{1,12}:\/\/+/gi, '')) + '</p>';
        }).join('') + '</footer>'
      : '';

    var keyHtml = '';
    if (model.answerKeyOn && keySections.length) {
      keyHtml = '<section class="ws-key" aria-label="Teacher answer key">'
        + '<p class="ws-key-banner">' + wsEsc(WS_KEY_NOTICE) + '</p>'
        + '<h2>Teacher Answer Key</h2>'
        + keySections.map(function (sec) {
            return '<h3>' + wsEsc(sec.heading) + '</h3><ol class="ws-key-list">' + sec.lines.map(function (line) {
              return '<li>' + wsEsc(line) + '</li>';
            }).join('') + '</ol>';
          }).join('')
        + '</section>';
    }

    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<meta http-equiv="Content-Security-Policy" content="' + WS_CSP + '">',
      '<meta name="referrer" content="no-referrer">',
      '<title>' + wsEsc(model.title) + ' \u2014 Vocabulary Practice Worksheet</title>',
      '<style>' + VOCAB_STANDALONE_CSS + '</style>',
      '</head>',
      '<body>',
      '<p class="ws-noprint">Print from your browser menu (Ctrl+P or Cmd+P). Keep the scale at 100%.</p>',
      '<header class="ws-header">',
      '<h1 class="ws-title">' + wsEsc(model.title) + '</h1>',
      '<div class="ws-meta"><span class="ws-meta-field"><span>Name:</span><span class="ws-meta-line"></span></span><span class="ws-meta-field"><span>Date:</span><span class="ws-meta-line"></span></span></div>',
      '</header>',
      bankHtml,
      partsHtml.length ? partsHtml.join('\n') : '<p>No vocabulary words are available yet.</p>',
      creditsHtml,
      keyHtml,
      '</body>',
      '</html>'
    ].join('\n');
  }

  function ownEntryFor(own, word) {
    if (!own || typeof own !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(own, word)) return own[word];
    var lower = String(word).toLowerCase();
    if (Object.prototype.hasOwnProperty.call(own, lower)) return own[lower];
    var keys = Object.keys(own);
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === lower) return own[keys[i]];
    }
    return null;
  }
  // Which picture each word shows: { uri, set, credit } or null. set is 'own' for a picture the teacher added.
  // Optional 4th argument matcher (AlloWordPictureMatcher) adds 696 K-12 curriculum diagrams + lemma/compound/concept matching.
  function picturesOf(words, own, symbols, matcher) {
    var out = Object.create(null);
    var symReady = !!(symbols && typeof symbols.get === 'function' && (typeof symbols.ready !== 'function' || symbols.ready()));
    words.forEach(function (word) {
      var entry = ownEntryFor(own, word);
      var picture = entry && entry.picture;
      if (picture && picture.none) { out[word] = null; return; }
      if (picture && isPicture(picture.dataUri)) { out[word] = { uri: picture.dataUri, set: 'own', credit: picture.credit || null }; return; }
      var lower = String(word).toLowerCase();
      var got = symbols && typeof symbols.get === 'function'
        ? (symbols.has(word) ? symbols.get(word) : (symbols.has(lower) ? symbols.get(lower) : null))
        : null;
      if (got && got.svg) { out[word] = { uri: svgUri(got.svg), set: got.set || 'mulberry', credit: null }; return; }
      if (matcher && typeof matcher.matchWord === 'function') {
        var matched = null;
        try { matched = matcher.matchWord({ word: word }, { symbols: symReady ? symbols : null, preferDiagrams: true }); } catch (_) { matched = null; }
        if (matched && matched.svg) {
          out[word] = { uri: svgUri(matched.svg), set: matched.set || (matched.matchTier === 'diagram' || matched.matchType === 'diagram' ? 'diagram' : 'mulberry'), credit: null };
          return;
        }
      }
      out[word] = null;
    });
    return out;
  }
  // The credit lines for the pictures on one page: one for each symbol set shown (the maker's sources wording),
  // then one for each picture the teacher added that is not their own.
  // CC BY-SA asks for a link to the license itself, not only its name.
  var LICENSE_DEEDS = { 'CC BY-SA 4.0': 'creativecommons.org/licenses/by-sa/4.0' };
  function setCredit(symbols, set) {
    var credits = symbols && symbols.credits ? symbols.credits : null;
    var credit = credits && Object.prototype.hasOwnProperty.call(credits, set) && credits[set] ? credits[set] : set === 'mulberry' && symbols && symbols.credit ? symbols.credit : null;
    if (!credit) {
      if (set === 'diagram') return 'AlloFlow Curriculum Diagrams (AGPL-3.0).';
      return '';
    }
    var deed = Object.prototype.hasOwnProperty.call(LICENSE_DEEDS, credit.license) ? LICENSE_DEEDS[credit.license] : '';
    return credit.set + ' by ' + credit.author + '. License: ' + credit.license + (deed ? ' (' + deed + ')' : '') + '. ' + credit.url;
  }
  function creditsFor(words, pictures, symbols, creditLine) {
    var sets = [], lines = [];
    words.forEach(function (word) { var p = pictures[word]; if (p && p.set !== 'own' && sets.indexOf(p.set) < 0) sets.push(p.set); });
    var rank = function (set) { var i = SET_ORDER.indexOf(set); return i < 0 ? SET_ORDER.length : i; };
    sets.sort(function (a, b) { return rank(a) - rank(b) || (a < b ? -1 : 1); });
    sets.forEach(function (set) { var line = setCredit(symbols, set); if (line) lines.push(TEXT.picturesLine + line); });
    words.forEach(function (word) {
      var p = pictures[word];
      if (!p || p.set !== 'own' || !p.credit || p.credit.own === true || typeof creditLine !== 'function') return;
      var line = creditLine(p.credit);
      if (line) lines.push(fill(TEXT.yourPicture, { word: word }) + line);
    });
    return lines;
  }

  function create(doc, win) {
    var view = null, nodes = {}, state = null, pictures = Object.create(null), run = 0, opener = null, busy = false, note = '', syllableNote = '', docEscBound = false;
    var options = { size: DEFAULT_SIZE, shows: 'both', lines: true, syllables: false, pages: 'both' };
    var loadingSyllables = false;
    var wsView = null, wsNodes = {}, wsState = null, wsOwn = null, wsRun = 0, wsOpener = null, wsBusy = false, wsNote = '', wsSyllableNote = '';
    var wsOptions = { pictures: true, answerKey: true, hints: true, syllables: false };
    var vocabView = null, vocabNodes = {}, vocabState = null, vocabOwn = null, vocabRun = 0, vocabOpener = null, vocabBusy = false, vocabNote = '', vocabSyllableNote = '';
    var vocabOptions = { wordBank: true, pictures: true, answerKey: true, syllables: false };
    function onDocKeyDown(event) {
      var cardsOpen = !!(view && !view.hidden);
      var wsOpen = !!(wsView && !wsView.hidden);
      var vocabOpen = !!(vocabView && !vocabView.hidden);
      if (!cardsOpen && !wsOpen && !vocabOpen) return;
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        if (vocabOpen) closeVocabWorksheet();
        else if (wsOpen) closeWorksheet();
        else close();
      }
    }

    function el(tag, className, text) {
      var node = doc.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }
    function lookupSyllableParts(word) {
      var src = (state && state.syllables) || (root.AlloModules && root.AlloModules.SyllableTableEn) || null;
      if (!src) return null;
      var lower = String(word).toLowerCase();
      var found = null;
      try {
        if (typeof src === 'function') found = src(lower);
        else if (typeof src.lookup === 'function') found = src.lookup(lower);
      } catch (_) { found = null; }
      if (!found) return null;
      var parts = Array.isArray(found) ? found : (!found.check && Array.isArray(found.parts) ? found.parts : null);
      if (!parts || parts.length < 2 || parts.join('').length !== word.length) return null;
      var out = [], pos = 0;
      for (var i = 0; i < parts.length; i++) {
        out.push(word.slice(pos, pos + parts[i].length));
        pos += parts[i].length;
      }
      return out;
    }
    function ensureSyllablesLoaded() {
      if ((state && state.syllables) || (root.AlloModules && root.AlloModules.SyllableTableEn) || loadingSyllables) return;
      if (!doc || !doc.createElement) return;
      if (doc.querySelector && doc.querySelector('script[data-allo-syllable-table="1"]')) return;
      loadingSyllables = true;
      syllableNote = '';
      var failSyllables = function () {
        if (options.syllables) {
          syllableNote = TEXT.syllablesFailed;
          draw();
        }
        if (wsOptions.syllables) {
          wsSyllableNote = TEXT.syllablesFailed;
          drawWorksheet();
        }
        if (vocabOptions.syllables) {
          vocabSyllableNote = TEXT.syllablesFailed;
          drawVocabWorksheet();
        }
      };
      try {
        var sc = doc.createElement('script');
        var settled = false;
        var timer = typeof win.setTimeout === 'function' ? win.setTimeout(function () {
          if (settled) return;
          settled = true;
          loadingSyllables = false;
          try { if (sc.parentNode) sc.parentNode.removeChild(sc); } catch (_) {}
          failSyllables();
        }, 15000) : 0;
        var clear = function () { if (timer && typeof win.clearTimeout === 'function') win.clearTimeout(timer); timer = 0; };
        sc.src = 'syllable_table_en.js';
        sc.async = true;
        sc.setAttribute('data-allo-syllable-table', '1');
        sc.onload = function () {
          if (settled) return;
          settled = true;
          clear();
          loadingSyllables = false;
          if (!(root.AlloModules && root.AlloModules.SyllableTableEn)) {
            try { if (sc.parentNode) sc.parentNode.removeChild(sc); } catch (_) {}
            failSyllables();
            return;
          }
          syllableNote = '';
          wsSyllableNote = '';
          vocabSyllableNote = '';
          draw();
          drawWorksheet();
          drawVocabWorksheet();
        };
        sc.onerror = function () {
          if (settled) return;
          settled = true;
          clear();
          loadingSyllables = false;
          try { if (sc.parentNode) sc.parentNode.removeChild(sc); } catch (_) {}
          failSyllables();
        };
        (doc.head || doc.documentElement).appendChild(sc);
      } catch (_) {
        loadingSyllables = false;
        failSyllables();
      }
    }
    function wordNode(tag, className, word) {
      var text = String(word == null ? '' : word);
      if (!options.syllables) return el(tag, className, text);
      var node = el(tag, className);
      var re = /[A-Za-z]+/g, m, last = 0, splitAny = false;
      while ((m = re.exec(text))) {
        if (m.index > last) node.appendChild(doc.createTextNode(text.slice(last, m.index)));
        var tok = m[0];
        var parts = tok.length >= 4 ? lookupSyllableParts(tok) : null;
        if (parts && parts.length > 1) {
          splitAny = true;
          for (var i = 0; i < parts.length; i++) {
            if (i > 0) {
              var dot = el('span', 'pc-dot', '\u00b7');
              dot.setAttribute('aria-hidden', 'true');
              node.appendChild(dot);
            }
            node.appendChild(doc.createTextNode(parts[i]));
          }
        } else {
          node.appendChild(doc.createTextNode(tok));
        }
        last = m.index + tok.length;
      }
      if (last < text.length) node.appendChild(doc.createTextNode(text.slice(last)));
      if (splitAny) node.setAttribute('data-pc-syllables', '1');
      return node;
    }
    function syncOptionClasses() {
      if (!view) return;
      Array.prototype.forEach.call(view.querySelectorAll('.pc-radio input'), function (input) {
        if (input.parentNode) input.parentNode.classList.toggle('is-on', !!input.checked);
      });
    }
    function syncRadioValue(name, value) {
      if (!view) return;
      Array.prototype.forEach.call(view.querySelectorAll('input[name="pc-' + name + '"]'), function (input) {
        input.checked = String(input.value) === String(value);
      });
      syncOptionClasses();
    }
    function radios(name, legend, rows) {
      var set = el('fieldset', 'pc-field');
      set.appendChild(el('legend', '', legend));
      var box = el('div', 'pc-radios');
      rows.forEach(function (row) {
        var label = el('label', 'radio pc-radio'), input = el('input');
        input.type = 'radio'; input.name = 'pc-' + name; input.value = String(row[0]);
        input.checked = String(options[name]) === String(row[0]);
        label.classList.toggle('is-on', input.checked);
        input.addEventListener('change', function () {
          if (!input.checked) return;
          options[name] = name === 'size' ? sizeOf(input.value) : input.value;
          syncOptionClasses();
          if (name === 'shows' && options.shows === 'word' && note === TEXT.gotNone) note = '';
          if (name === 'shows' && options.shows !== 'word' && state && !state.pictures && (state.symbols || state.own || state.matcher)) {
            state.pictures = true;
            var mine = ++run;
            note = '';
            draw();
            gather(mine).then(function () { if (mine === run) { busy = false; draw(); } });
            return;
          }
          draw();
        });
        label.appendChild(input);
        label.appendChild(el('span', '', row[1]));
        box.appendChild(label);
      });
      set.appendChild(box);
      return set;
    }
    function build() {
      view = el('div', 'pc');
      view.id = 'print-cards-view';
      view.hidden = true;
      var bar = el('div', 'pc-bar');
      nodes.heading = el('h1', '', TEXT.title);
      nodes.heading.id = 'pc-heading';
      nodes.heading.tabIndex = -1;
      view.setAttribute('role', 'region');
      view.setAttribute('aria-labelledby', 'pc-heading');
      bar.appendChild(nodes.heading);
      nodes.said = el('p', 'pc-said');
      nodes.said.setAttribute('role', 'status');
      bar.appendChild(nodes.said);
      var actions = el('p', 'pc-actions');
      nodes.print = el('button', 'btn btn-primary', TEXT.print);
      nodes.print.type = 'button';
      nodes.print.addEventListener('click', function () { if (!busy && state && state.words.length) win.print(); });
      nodes.back = el('button', 'btn', TEXT.back);
      nodes.back.type = 'button';
      nodes.back.addEventListener('click', close);
      actions.appendChild(nodes.print);
      actions.appendChild(nodes.back);
      bar.appendChild(actions);
      nodes.tip = el('p', 'pc-hint', TEXT.tip);
      bar.appendChild(nodes.tip);
      nodes.options = el('details', 'pc-options');
      nodes.options.appendChild(el('summary', '', TEXT.options));
      var body = el('div', 'pc-options-body');
      body.appendChild(radios('size', TEXT.size, [4, 6, 12].map(function (n) { return [n, SIZES[n].name + ': ' + n + ' on a page']; })));
      nodes.shows = radios('shows', TEXT.shows, [['both', TEXT.showBoth], ['word', TEXT.showWord], ['picture', TEXT.showPicture]]);
      body.appendChild(nodes.shows);
      nodes.picturesNote = el('p', 'pc-hint');
      body.appendChild(nodes.picturesNote);
      var lines = el('label', 'radio pc-radio pc-check'), box = el('input');
      box.type = 'checkbox'; box.id = 'pc-lines'; box.checked = options.lines;
      lines.classList.toggle('is-on', box.checked);
      box.addEventListener('change', function () { options.lines = box.checked; syncOptionClasses(); draw(); });
      lines.appendChild(box);
      lines.appendChild(el('span', '', TEXT.lines));
      body.appendChild(lines);
      var sylWrap = el('label', 'radio pc-radio pc-check'), sylBox = el('input');
      sylBox.type = 'checkbox'; sylBox.id = 'pc-syllables'; sylBox.checked = options.syllables;
      sylWrap.classList.toggle('is-on', sylBox.checked);
      sylBox.addEventListener('change', function () {
        options.syllables = sylBox.checked;
        syncOptionClasses();
        syllableNote = '';
        if (options.syllables) ensureSyllablesLoaded();
        draw();
      });
      sylWrap.appendChild(sylBox);
      sylWrap.appendChild(el('span', '', TEXT.syllables));
      body.appendChild(sylWrap);
      body.appendChild(radios('pages', TEXT.pagesLegend, [['both', TEXT.pagesBoth], ['cards', TEXT.pagesCards], ['list', TEXT.pagesList]]));
      nodes.options.appendChild(body);
      bar.appendChild(nodes.options);
      view.appendChild(bar);
      nodes.sheets = el('div', 'pc-sheets');
      view.appendChild(nodes.sheets);
      doc.body.appendChild(view);
    }

    function cardsShow() { return state && state.pictures ? options.shows : 'word'; }
    function cardOf(word) {
      var shows = cardsShow(), picture = shows !== 'word' ? pictures[word] : null;
      var card = el('li', 'pc-card ' + lengthClass(word));
      if (picture) {
        var img = el('img', 'pc-pic');
        img.src = picture.uri;
        img.alt = shows === 'picture' ? word : '';
        img.decoding = 'sync';
        card.appendChild(img);
        card.classList.add('pc-has-pic');
      }
      if (!picture || shows !== 'picture') card.appendChild(wordNode('span', 'pc-word', word));
      return card;
    }
    function cardPages(words) {
      var pages = layout(words, options.size), size = SIZES[options.size], out = [];
      var shown = cardsShow() === 'word' ? Object.create(null) : pictures;
      pages.forEach(function (page, i) {
        var sheet = el('section', 'pc-sheet pc-cards pc-per-' + options.size + (options.lines ? ' pc-lines' : ' pc-nolines'));
        var label = fill(TEXT.cardsPage, { n: i + 1, of: pages.length });
        sheet.setAttribute('aria-label', label);
        var grid = el('ul', 'pc-grid pc-cols-' + size.cols + ' pc-rows-' + size.rows);
        page.forEach(function (word) { grid.appendChild(cardOf(word)); });
        sheet.appendChild(grid);
        var foot = el('footer', 'pc-foot');
        foot.appendChild(el('p', 'pc-foot-title', (state.title ? state.title + '. ' : '') + label + '.'));
        creditsFor(page, shown, state.symbols, state.creditLine).forEach(function (line) { foot.appendChild(el('p', 'pc-credit', line)); });
        sheet.appendChild(foot);
        out.push(sheet);
      });
      return out;
    }
    function listPage(words) {
      var sheet = el('section', 'pc-sheet pc-list');
      sheet.setAttribute('aria-label', TEXT.listHeading);
      sheet.appendChild(el('h2', 'pc-list-title', state.title || TEXT.title));
      sheet.appendChild(el('p', 'pc-list-sub', TEXT.listHeading + ': ' + count(words.length, 'word') + '.'));
      var cols = words.length <= 12 ? 1 : words.length <= 26 ? 2 : 3;
      var list = el('ol', 'pc-words pc-list-cols-' + cols);
      words.forEach(function (word) { list.appendChild(wordNode('li', '', word)); });
      sheet.appendChild(list);
      return sheet;
    }
    function said() {
      if (!state || !state.words.length) return TEXT.nothing;
      if (busy) return note;
      var n = state.words.length, cards = options.pages !== 'list' ? layout(state.words, options.size).length : 0;
      var parts = [];
      if (cards) parts.push(count(cards, 'page') + ' of cards');
      if (options.pages !== 'cards') parts.push('a word list');
      var withPicture = state.words.filter(function (word) { return !!pictures[word]; }).length;
      var pictureSaid = cardsShow() === 'word' ? '' : ' ' + count(withPicture, 'card') + ' of ' + n + ' with a picture.';
      var extra = (note ? ' ' + note : '') + (options.syllables && syllableNote ? ' ' + syllableNote : '');
      return count(n, 'word') + '. ' + parts.join(' and ') + ' to print.' + pictureSaid + extra;
    }
    function draw() {
      if (!view || !state) return;
      var words = state.words;
      while (nodes.sheets.firstChild) nodes.sheets.removeChild(nodes.sheets.firstChild);
      nodes.print.disabled = busy || !words.length;
      nodes.options.hidden = !words.length;
      nodes.tip.hidden = !words.length;
      var canShowPictures = !!(state.pictures || state.symbols || state.own || state.matcher);
      nodes.shows.hidden = !canShowPictures;
      nodes.picturesNote.textContent = !canShowPictures ? TEXT.picturesOff : options.shows !== 'word' ? TEXT.noPictureShowsWord : '';
      nodes.said.textContent = said();
      if (busy || !words.length) return;
      if (options.pages !== 'list') cardPages(words).forEach(function (sheet) { nodes.sheets.appendChild(sheet); });
      if (options.pages !== 'cards') nodes.sheets.appendChild(listPage(words));
    }

    // The pictures these words show: the teacher's first (read fresh), then the symbols, whose drawings the
    // maker's loader gets (only when a word needs one and they are not here yet).
    function gather(mine) {
      if (!state.pictures || !state.words.length) return Promise.resolve();
      var own = typeof state.own === 'function' ? Promise.resolve().then(function () { return state.own(state.words); }).catch(function () { return null; }) : Promise.resolve(null);
      return own.then(function (found) {
        if (mine !== run) return;
        var symbols = state.symbols;
        var needs = !!symbols && state.words.some(function (word) {
          var entry = ownEntryFor(found, word);
          return !(entry && entry.picture) && (symbols.has(word) || symbols.has(String(word).toLowerCase()));
        });
        if (!needs || symbols.ready() || typeof state.loadPictures !== 'function') { pictures = picturesOf(state.words, found, symbols, state.matcher); return; }
        busy = true;
        note = fill(TEXT.getting, { mb: (Number(symbols.bytes || 0) / 1e6).toFixed(1) });
        draw();
        return Promise.resolve().then(function () { return state.loadPictures(); }).then(function (ready) { return !!ready; }, function () { return false; }).then(function (ready) {
          if (mine !== run) return;
          busy = false;
          note = ready ? '' : TEXT.gotNone;
          pictures = picturesOf(state.words, found, ready ? symbols : null, state.matcher);
        });
      });
    }

    function open(given) {
      if (!view) build();
      if (wsView && !wsView.hidden) { wsRun++; wsView.hidden = true; }
      if (vocabView && !vocabView.hidden) { vocabRun++; vocabView.hidden = true; }
      var mine = ++run;
      var s = given || {};
      var defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
      state = { words: cleanWords(s.words), title: String(s.title || '').trim(), pictures: !!s.pictures, symbols: s.symbols || null,
        matcher: s.matcher !== undefined ? s.matcher : defaultMatcher,
        loadPictures: s.loadPictures || null, own: s.own || null,
        creditLine: typeof s.creditLine === 'function' ? s.creditLine : root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine };
      pictures = Object.create(null); busy = false; note = ''; syllableNote = '';
      options.shows = state.pictures ? 'both' : (state.symbols || state.own || state.matcher ? 'word' : 'both');
      syncRadioValue('shows', options.shows);
      syncOptionClasses();
      opener = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : opener;
      view.hidden = false;
      if (!docEscBound && doc && typeof doc.addEventListener === 'function') {
        doc.addEventListener('keydown', onDocKeyDown);
        docEscBound = true;
      }
      doc.body.classList.add('pc-on');
      draw();
      if (typeof win.scrollTo === 'function') { try { win.scrollTo(0, 0); } catch (_) {} }
      nodes.heading.focus();
      return gather(mine).then(function () { if (mine === run) { busy = false; draw(); } });
    }
    function close() {
      if (vocabView && !vocabView.hidden && (!view || view.hidden)) { closeVocabWorksheet(); return; }
      if (wsView && !wsView.hidden && (!view || view.hidden)) { closeWorksheet(); return; }
      if (!view || view.hidden) return;
      run++;
      view.hidden = true;
      if (docEscBound && doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('keydown', onDocKeyDown);
        docEscBound = false;
      }
      doc.body.classList.remove('pc-on');
      while (nodes.sheets.firstChild) nodes.sheets.removeChild(nodes.sheets.firstChild);
      if (opener && typeof opener.focus === 'function' && doc.contains(opener)) opener.focus();
    }
    function wire(button, getState) {
      if (!button || typeof getState !== 'function') return false;
      button.hidden = false;
      button.addEventListener('click', function () { opener = button; open(getState()); });
      return true;
    }

    // -------------------------------------------------------------------------
    // Activity Worksheet preview view (pure DOM, zero inline scripts/styles)
    // -------------------------------------------------------------------------
    function wsWordNode(tag, className, text, allowSyl, sylSrc) {
      var str = String(text == null ? '' : text);
      if (!wsOptions.syllables || allowSyl === false) return el(tag, className, str);
      var node = el(tag, className);
      var re = /[A-Za-z]+/g, m, last = 0;
      while ((m = re.exec(str))) {
        if (m.index > last) node.appendChild(doc.createTextNode(str.slice(last, m.index)));
        var tok = m[0];
        var parts = tok.length >= 4 ? wsLookupSyllables(tok, sylSrc) : null;
        if (parts && parts.length > 1) {
          for (var i = 0; i < parts.length; i++) {
            if (i > 0) {
              var dot = el('span', 'pc-dot', '\u00b7');
              dot.setAttribute('aria-hidden', 'true');
              node.appendChild(dot);
            }
            node.appendChild(doc.createTextNode(parts[i]));
          }
        } else {
          node.appendChild(doc.createTextNode(tok));
        }
        last = m.index + tok.length;
      }
      if (last < str.length) node.appendChild(doc.createTextNode(str.slice(last)));
      return node;
    }
    function wsSyncOptionClasses() {
      if (!wsView) return;
      Array.prototype.forEach.call(wsView.querySelectorAll('.pc-radio input'), function (input) {
        if (input.parentNode) input.parentNode.classList.toggle('is-on', !!input.checked);
      });
    }
    function wsSyncPresetButtons() {
      if (!wsNodes.presetScaffolded || !wsNodes.presetIndependent) return;
      var isScaffolded = !!(wsOptions.pictures && wsOptions.hints && wsOptions.syllables);
      var isIndependent = !wsOptions.hints && !wsOptions.syllables;
      wsNodes.presetScaffolded.setAttribute('aria-pressed', isScaffolded ? 'true' : 'false');
      wsNodes.presetScaffolded.classList.toggle('is-on', isScaffolded);
      wsNodes.presetIndependent.setAttribute('aria-pressed', isIndependent ? 'true' : 'false');
      wsNodes.presetIndependent.classList.toggle('is-on', isIndependent);
    }
    function applyWsPreset(presetName) {
      if (presetName === 'scaffolded') {
        wsOptions.pictures = true;
        wsOptions.hints = true;
        wsOptions.syllables = true;
        if (wsNodes.picturesBox) wsNodes.picturesBox.checked = true;
        if (wsNodes.hintsBox) wsNodes.hintsBox.checked = true;
        if (wsNodes.syllablesBox) wsNodes.syllablesBox.checked = true;
        wsSyllableNote = '';
        ensureSyllablesLoaded();
        wsSyncOptionClasses();
        wsSyncPresetButtons();
        if (wsState && (wsState.symbols || wsState.own || wsState.matcher)) {
          var mine = ++wsRun;
          wsNote = '';
          drawWorksheet();
          gatherWorksheet(mine).then(function () { if (mine === wsRun) { wsBusy = false; drawWorksheet(); } });
          return;
        }
        drawWorksheet();
        return;
      }
      if (presetName === 'independent') {
        wsOptions.hints = false;
        wsOptions.syllables = false;
        if (wsNodes.hintsBox) wsNodes.hintsBox.checked = false;
        if (wsNodes.syllablesBox) wsNodes.syllablesBox.checked = false;
        wsSyllableNote = '';
        wsSyncOptionClasses();
        wsSyncPresetButtons();
        drawWorksheet();
      }
    }
    function wsSlug(text) {
      return String(text || 'word-sounds').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'word-sounds';
    }
    function wsCurrentInput() {
      if (!wsState) return {};
      return Object.assign({}, wsState, {
        own: wsOwn || (typeof wsState.own === 'object' ? wsState.own : null),
        pictures: wsOptions.pictures,
        answerKey: wsOptions.answerKey,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
    }
    function downloadWorksheetHtml() {
      if (wsBusy || !wsState) return;
      var html = buildWordSoundsWorksheetHtml(wsCurrentInput(), {
        pictures: wsOptions.pictures,
        answerKey: wsOptions.answerKey,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
      if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') return;
      var blob = new win.Blob([html], { type: 'text/html;charset=utf-8' });
      var url = win.URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      link.download = wsSlug(wsState.title) + '-activity-worksheet' + '.html';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (wsNodes.said) wsNodes.said.textContent = 'Downloaded standalone HTML worksheet.';
    }
    function buildWorksheetView() {
      wsView = el('div', 'pc pc-ws-view');
      wsView.id = 'print-worksheet-view';
      wsView.hidden = true;
      var bar = el('div', 'pc-bar');
      wsNodes.heading = el('h1', '', 'Activity worksheet');
      wsNodes.heading.id = 'pc-ws-heading';
      wsNodes.heading.tabIndex = -1;
      wsView.setAttribute('role', 'region');
      wsView.setAttribute('aria-labelledby', 'pc-ws-heading');
      bar.appendChild(wsNodes.heading);
      wsNodes.said = el('p', 'pc-said');
      wsNodes.said.setAttribute('role', 'status');
      bar.appendChild(wsNodes.said);
      var actions = el('p', 'pc-actions');
      wsNodes.print = el('button', 'btn btn-primary', TEXT.print);
      wsNodes.print.type = 'button';
      wsNodes.print.addEventListener('click', function () { if (!wsBusy && wsState) win.print(); });
      wsNodes.download = el('button', 'btn', 'Download HTML worksheet');
      wsNodes.download.type = 'button';
      wsNodes.download.addEventListener('click', downloadWorksheetHtml);
      wsNodes.back = el('button', 'btn', TEXT.back);
      wsNodes.back.type = 'button';
      wsNodes.back.addEventListener('click', closeWorksheet);
      actions.appendChild(wsNodes.print);
      actions.appendChild(wsNodes.download);
      actions.appendChild(wsNodes.back);
      bar.appendChild(actions);
      wsNodes.presets = el('div', 'pc-presets');
      wsNodes.presets.setAttribute('role', 'group');
      wsNodes.presets.setAttribute('aria-label', 'Differentiation presets');
      wsNodes.presets.appendChild(el('span', 'pc-presets-label', 'Preset:'));
      wsNodes.presetScaffolded = el('button', 'btn btn-small pc-preset-btn', 'Scaffolded');
      wsNodes.presetScaffolded.type = 'button';
      wsNodes.presetScaffolded.setAttribute('data-ws-preset', 'scaffolded');
      wsNodes.presetScaffolded.setAttribute('aria-pressed', 'false');
      wsNodes.presetScaffolded.addEventListener('click', function () { applyWsPreset('scaffolded'); });
      wsNodes.presetIndependent = el('button', 'btn btn-small pc-preset-btn', 'Independent');
      wsNodes.presetIndependent.type = 'button';
      wsNodes.presetIndependent.setAttribute('data-ws-preset', 'independent');
      wsNodes.presetIndependent.setAttribute('aria-pressed', 'false');
      wsNodes.presetIndependent.addEventListener('click', function () { applyWsPreset('independent'); });
      wsNodes.presets.appendChild(wsNodes.presetScaffolded);
      wsNodes.presets.appendChild(wsNodes.presetIndependent);
      bar.appendChild(wsNodes.presets);
      wsNodes.tip = el('p', 'pc-hint', TEXT.tip);
      bar.appendChild(wsNodes.tip);
      wsNodes.options = el('details', 'pc-options');
      wsNodes.options.appendChild(el('summary', '', 'Worksheet options'));
      var body = el('div', 'pc-options-body');
      var makeToggle = function (id, labelText, key, onToggle) {
        var wrap = el('label', 'radio pc-radio pc-check'), box = el('input');
        box.type = 'checkbox'; box.id = id; box.checked = !!wsOptions[key];
        wrap.classList.toggle('is-on', box.checked);
        box.addEventListener('change', function () {
          wsOptions[key] = !!box.checked;
          wsSyncOptionClasses();
          wsSyncPresetButtons();
          if (typeof onToggle === 'function') onToggle(box.checked);
          else drawWorksheet();
        });
        wrap.appendChild(box);
        wrap.appendChild(el('span', '', labelText));
        wsNodes[key + 'Box'] = box;
        body.appendChild(wrap);
      };
      makeToggle('pc-ws-pictures', 'Include pictures', 'pictures', function (checked) {
        if (checked && wsState && (wsState.symbols || wsState.own || wsState.matcher)) {
          var mine = ++wsRun;
          wsNote = '';
          drawWorksheet();
          gatherWorksheet(mine).then(function () { if (mine === wsRun) { wsBusy = false; drawWorksheet(); } });
          return;
        }
        drawWorksheet();
      });
      makeToggle('pc-ws-answer-key', 'Include teacher answer key', 'answerKey');
      makeToggle('pc-ws-hints', 'Include hints (letter banks and sound boxes)', 'hints');
      makeToggle('pc-ws-syllables', TEXT.syllables, 'syllables', function (checked) {
        wsSyllableNote = '';
        if (checked) ensureSyllablesLoaded();
        drawWorksheet();
      });
      wsNodes.options.appendChild(body);
      bar.appendChild(wsNodes.options);
      wsView.appendChild(bar);
      wsNodes.sheets = el('div', 'pc-sheets');
      wsView.appendChild(wsNodes.sheets);
      doc.body.appendChild(wsView);
    }
    function appendPicNode(parent, model, word, neutralAlt, small) {
      var p = model.pictureFor(word);
      if (!p) return false;
      var img = el('img', small ? 'pc-ws-pic-sm' : 'pc-ws-pic');
      img.src = p.uri;
      img.alt = neutralAlt ? neutralAlt : word;
      img.decoding = 'sync';
      parent.appendChild(img);
      return true;
    }
    function renderWorksheetSheet(model) {
      var sheet = el('section', 'pc-sheet pc-ws-sheet');
      sheet.setAttribute('aria-label', model.title);
      var header = el('header', 'pc-ws-header');
      header.appendChild(el('h2', 'pc-ws-title', model.title));
      var meta = el('div', 'pc-ws-meta');
      ['Name:', 'Date:'].forEach(function (lbl) {
        var f = el('span', 'pc-ws-meta-field');
        f.appendChild(el('span', '', lbl));
        f.appendChild(el('span', 'pc-ws-meta-line'));
        meta.appendChild(f);
      });
      header.appendChild(meta);
      sheet.appendChild(header);

      var keyBlocks = [];
      model.sections.forEach(function (sec) {
        var act = sec.activity;
        var allowSyl = !WS_NO_SYLLABLES[act];
        var secEl = el('section', 'pc-ws-section');
        secEl.setAttribute('data-activity', act);
        var head = el('div', 'pc-ws-section-head');
        head.appendChild(el('h3', 'pc-ws-section-title', sec.label));
        head.appendChild(el('p', 'pc-ws-directions', sec.directions));
        secEl.appendChild(head);

        if (act === 'sound_sort') {
          var boards = buildSoundSortBoards(sec.items);
          var sortKeyLines = [];
          boards.forEach(function (b) {
            var bankEl = el('div', 'pc-ws-sort-bank');
            bankEl.appendChild(el('span', 'pc-ws-bank-label', 'Word bank:'));
            b.bank.forEach(function (w) {
              var chip = el('span', 'pc-ws-chip');
              appendPicNode(chip, model, w, '', true);
              chip.appendChild(wsWordNode('span', '', w, true, model.syllablesSrc));
              bankEl.appendChild(chip);
            });
            secEl.appendChild(bankEl);
            var colsEl = el('div', b.columns.length >= 3 ? 'pc-ws-sort-cols pc-ws-sort-cols-3' : 'pc-ws-sort-cols pc-ws-sort-cols-2');
            b.columns.forEach(function (col) {
              var colEl = el('div', 'pc-ws-sort-col');
              colEl.appendChild(el('h4', 'pc-ws-sort-col-head', col.heading));
              var lineN = Math.max(4, col.words.length + 1);
              for (var li = 0; li < lineN; li++) colEl.appendChild(el('div', 'pc-ws-sort-line'));
              colsEl.appendChild(colEl);
              sortKeyLines.push(col.heading + ': ' + (col.words.length ? col.words.join(', ') : '(none)'));
            });
            secEl.appendChild(colsEl);
          });
          keyBlocks.push({ heading: sec.label, lines: sortKeyLines });
          sheet.appendChild(secEl);
          return;
        }

        var list = el('ol', 'pc-ws-list');
        var secKeyLines = [];
        sec.items.forEach(function (it, idx) {
          var n = idx + 1;
          var neutralAlt = 'Picture clue ' + n;
          var li = el('li', 'pc-ws-item');
          li.appendChild(el('span', 'pc-ws-num', n + '.'));
          var body = el('div', 'pc-ws-body');

          if (act === 'mapping') {
            var row = el('div', 'pc-ws-row');
            appendPicNode(row, model, it.word, neutralAlt, false);
            var boxes = el('div', 'pc-ws-boxes');
            boxes.setAttribute('data-sound-boxes', String(it.soundCount));
            for (var bi = 0; bi < it.soundCount; bi++) boxes.appendChild(el('span', 'pc-ws-box'));
            row.appendChild(boxes);
            body.appendChild(row);
            if (model.hintsOn && it.bank && it.bank.length) {
              var bank = el('div', 'pc-ws-bank');
              bank.appendChild(el('span', 'pc-ws-bank-label', 'Letter bank:'));
              it.bank.forEach(function (g) { bank.appendChild(el('span', 'pc-ws-chip', g)); });
              body.appendChild(bank);
            }
          } else if (act === 'missing_letter') {
            var mlRow = el('div', 'pc-ws-row');
            appendPicNode(mlRow, model, it.word, neutralAlt, false);
            var mlWord = el('div', 'pc-ws-missing');
            it.letters.forEach(function (ch, ci) {
              if (ci === it.hiddenIndex) {
                var blank = el('span', 'pc-ws-blank');
                blank.setAttribute('aria-label', 'missing letter');
                mlWord.appendChild(blank);
              } else {
                mlWord.appendChild(el('span', '', ch));
              }
            });
            mlRow.appendChild(mlWord);
            body.appendChild(mlRow);
            var mlUl = el('ul', 'pc-ws-choices');
            (it.choices || []).forEach(function (c) { mlUl.appendChild(el('li', 'pc-ws-choice', c)); });
            body.appendChild(mlUl);
          } else if (act === 'word_scramble') {
            var wsRow = el('div', 'pc-ws-row');
            appendPicNode(wsRow, model, it.word, neutralAlt, false);
            var tiles = el('div', 'pc-ws-tiles');
            (it.tiles || []).forEach(function (t) { tiles.appendChild(el('span', 'pc-ws-tile', t)); });
            wsRow.appendChild(tiles);
            body.appendChild(wsRow);
            body.appendChild(el('div', 'pc-ws-line'));
          } else if (act === 'counting') {
            var ctRow = el('div', 'pc-ws-row');
            appendPicNode(ctRow, model, it.word, '', false);
            ctRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            body.appendChild(ctRow);
            var ctUl = el('ul', 'pc-ws-bubbles');
            (it.values || ['1', '2', '3', '4', '5', '6']).forEach(function (v) { ctUl.appendChild(el('li', 'pc-ws-bubble', v)); });
            body.appendChild(ctUl);
          } else if (act === 'isolation') {
            body.appendChild(wsWordNode('p', 'pc-ws-prompt', 'What is the ' + it.positionName + ' sound in ' + it.word + '?', allowSyl, model.syllablesSrc));
            var isoRow = el('div', 'pc-ws-row');
            appendPicNode(isoRow, model, it.word, '', false);
            isoRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            body.appendChild(isoRow);
            var isoUl = el('ul', 'pc-ws-choices');
            (it.choices || []).forEach(function (c) { isoUl.appendChild(el('li', 'pc-ws-choice', wsSoundLabel(c))); });
            body.appendChild(isoUl);
          } else if (act === 'segmentation') {
            var segRow = el('div', 'pc-ws-row');
            appendPicNode(segRow, model, it.word, '', false);
            segRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            var dots = el('div', 'pc-ws-tap-dots');
            dots.setAttribute('data-tap-dots', String(it.slotCount));
            for (var di = 0; di < it.slotCount; di++) dots.appendChild(el('span', 'pc-ws-tap-dot'));
            segRow.appendChild(dots);
            body.appendChild(segRow);
            body.appendChild(el('div', 'pc-ws-line'));
            if (model.hintsOn && it.chips && it.chips.length) {
              var sBank = el('div', 'pc-ws-bank');
              sBank.appendChild(el('span', 'pc-ws-bank-label', 'Sound bank:'));
              it.chips.forEach(function (s) { sBank.appendChild(el('span', 'pc-ws-chip', wsSoundLabel(s))); });
              body.appendChild(sBank);
            }
          } else if (act === 'blending') {
            body.appendChild(el('div', 'pc-ws-sounds-seq', (it.sounds || []).map(wsSoundLabel).join(' \u00b7 ')));
            body.appendChild(el('div', 'pc-ws-line'));
            if (it.choices && it.choices.length) {
              var bUl = el('ul', 'pc-ws-choices');
              it.choices.forEach(function (c) { bUl.appendChild(wsWordNode('li', 'pc-ws-choice', c, allowSyl, model.syllablesSrc)); });
              body.appendChild(bUl);
            }
          } else if (act === 'rhyming') {
            body.appendChild(wsWordNode('p', 'pc-ws-prompt', 'Circle the word that rhymes with ' + it.word + ':', allowSyl, model.syllablesSrc));
            var rhRow = el('div', 'pc-ws-row');
            appendPicNode(rhRow, model, it.word, '', false);
            rhRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            body.appendChild(rhRow);
            var rhUl = el('ul', 'pc-ws-choices');
            (it.choices || []).forEach(function (c) {
              var cLi = el('li', 'pc-ws-choice');
              appendPicNode(cLi, model, c, '', true);
              cLi.appendChild(wsWordNode('span', '', c, allowSyl, model.syllablesSrc));
              rhUl.appendChild(cLi);
            });
            body.appendChild(rhUl);
          } else if (act === 'word_families') {
            body.appendChild(wsWordNode('p', 'pc-ws-prompt', 'Word family: -' + it.rime + ' (like ' + it.word + ')', allowSyl, model.syllablesSrc));
            var wfRow = el('div', 'pc-ws-row');
            appendPicNode(wfRow, model, it.word, '', false);
            wfRow.appendChild(el('span', 'pc-ws-word', '-' + it.rime));
            body.appendChild(wfRow);
            if (it.chips && it.chips.length) {
              var wfUl = el('ul', 'pc-ws-choices');
              it.chips.forEach(function (c) { wfUl.appendChild(wsWordNode('li', 'pc-ws-choice', c.text, allowSyl, model.syllablesSrc)); });
              body.appendChild(wfUl);
            }
            var builds = el('div', 'pc-ws-build-lines');
            for (var bsi = 0; bsi < 3; bsi++) {
              var slot = el('span', 'pc-ws-build-slot');
              slot.appendChild(el('span', 'pc-ws-build-blank'));
              slot.appendChild(el('span', '', it.rime));
              builds.appendChild(slot);
            }
            body.appendChild(builds);
          } else if (act === 'letter_tracing') {
            var ltRow = el('div', 'pc-ws-row');
            appendPicNode(ltRow, model, it.word, '', false);
            ltRow.appendChild(el('p', 'pc-ws-prompt', 'Trace ' + it.parts.map(function (p) { return p.letter; }).join(' and ') + ' (for ' + it.word + ')'));
            body.appendChild(ltRow);
            var tWrap = el('div', 'pc-ws-trace-wrap');
            (it.parts || []).forEach(function (part) {
              var tRow = el('div', 'pc-ws-trace-row');
              tRow.setAttribute('data-trace-case', part.kind || 'letter');
              for (var gi = 0; gi < 3; gi++) tRow.appendChild(el('span', 'pc-ws-trace-letter', part.letter));
              tWrap.appendChild(tRow);
            });
            body.appendChild(tWrap);
          } else if (act === 'orthography' || act === 'spelling_bee') {
            body.appendChild(el('p', 'pc-ws-prompt', 'Listen to your teacher and write word #' + n + ':'));
            var spRow = el('div', 'pc-ws-row');
            appendPicNode(spRow, model, it.word, neutralAlt, false);
            if (model.hintsOn) {
              var sCnt = it.lengthHint ? it.word.length : it.soundCount;
              var spBoxes = el('div', 'pc-ws-boxes');
              spBoxes.setAttribute('data-sound-boxes', String(sCnt));
              for (var sbi = 0; sbi < sCnt; sbi++) spBoxes.appendChild(el('span', 'pc-ws-box'));
              spRow.appendChild(spBoxes);
            }
            body.appendChild(spRow);
            if (model.hintsOn && it.letterBank && it.letterBank.length) {
              var lb = el('div', 'pc-ws-bank');
              lb.appendChild(el('span', 'pc-ws-bank-label', 'Letters:'));
              it.letterBank.forEach(function (l) { lb.appendChild(el('span', 'pc-ws-chip', l)); });
              body.appendChild(lb);
            }
            body.appendChild(el('div', 'pc-ws-line'));
          } else if (act === 'syllable_counting') {
            var scRow = el('div', 'pc-ws-row');
            appendPicNode(scRow, model, it.word, '', false);
            scRow.appendChild(el('span', 'pc-ws-word', it.word));
            body.appendChild(scRow);
            var scoops = el('div', 'pc-ws-scoops');
            scoops.setAttribute('aria-hidden', 'true');
            for (var sci = 0; sci < 3; sci++) scoops.appendChild(el('span', 'pc-ws-scoop'));
            body.appendChild(scoops);
            var scUl = el('ul', 'pc-ws-bubbles');
            (it.values || ['1', '2', '3', '4', '5']).forEach(function (v) { scUl.appendChild(el('li', 'pc-ws-bubble', v)); });
            body.appendChild(scUl);
          } else if (act === 'syllable_blending') {
            body.appendChild(el('div', 'pc-ws-sounds-seq', (it.syllables || []).join(' \u00b7 ')));
            body.appendChild(el('div', 'pc-ws-line'));
            if (it.choices && it.choices.length) {
              var sbUl = el('ul', 'pc-ws-choices');
              it.choices.forEach(function (c) { sbUl.appendChild(wsWordNode('li', 'pc-ws-choice', c, allowSyl, model.syllablesSrc)); });
              body.appendChild(sbUl);
            }
          } else if (act === 'manipulation') {
            body.appendChild(el('p', 'pc-ws-prompt', it.prompt));
            body.appendChild(el('div', 'pc-ws-line'));
            if (it.choices && it.choices.length) {
              var mUl = el('ul', 'pc-ws-choices');
              it.choices.forEach(function (c) { mUl.appendChild(wsWordNode('li', 'pc-ws-choice', c, allowSyl, model.syllablesSrc)); });
              body.appendChild(mUl);
            }
          } else if (act === 'decoding') {
            var decRow = el('div', 'pc-ws-row');
            decRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            body.appendChild(decRow);
            var flu = el('div', 'pc-ws-fluency');
            ['Read aloud', 'Read smoothly'].forEach(function (lbl) {
              var ci = el('span', 'pc-ws-check-item');
              ci.appendChild(el('span', 'pc-ws-checkbox'));
              ci.appendChild(doc.createTextNode(' ' + lbl));
              flu.appendChild(ci);
            });
            body.appendChild(flu);
            if (it.choices && it.choices.length) {
              var dUl = el('ul', 'pc-ws-choices');
              it.choices.forEach(function (c) {
                var dLi = el('li', 'pc-ws-choice');
                if (!appendPicNode(dLi, model, c.text, 'Picture choice', true)) dLi.textContent = c.text;
                dUl.appendChild(dLi);
              });
              body.appendChild(dUl);
            }
          } else if (act === 'read_sentence') {
            var rsRow = el('div', 'pc-ws-row');
            appendPicNode(rsRow, model, it.word, neutralAlt, false);
            var rsWrap = el('div');
            var rsP = el('p', 'pc-ws-prompt');
            rsP.appendChild(wsWordNode('span', '', it.before, allowSyl, model.syllablesSrc));
            var rsBlank = el('span', 'pc-ws-blank');
            rsBlank.setAttribute('aria-label', 'blank');
            rsP.appendChild(rsBlank);
            rsP.appendChild(wsWordNode('span', '', it.after, allowSyl, model.syllablesSrc));
            rsWrap.appendChild(rsP);
            var rsUl = el('ul', 'pc-ws-choices');
            (it.options || []).forEach(function (c) { rsUl.appendChild(wsWordNode('li', 'pc-ws-choice', c, allowSyl, model.syllablesSrc)); });
            rsWrap.appendChild(rsUl);
            var rsFlu = el('div', 'pc-ws-fluency');
            var rsChk = el('span', 'pc-ws-check-item');
            rsChk.appendChild(el('span', 'pc-ws-checkbox'));
            rsChk.appendChild(doc.createTextNode(' Read the completed sentence aloud'));
            rsFlu.appendChild(rsChk);
            rsWrap.appendChild(rsFlu);
            rsRow.appendChild(rsWrap);
            body.appendChild(rsRow);
          } else if (act === 'read_passage') {
            var pass = el('div', 'pc-ws-passage');
            (it.lines || []).forEach(function (ln) {
              if (ln.before != null || ln.after != null) {
                var pEl = el('p');
                pEl.appendChild(wsWordNode('span', '', ln.before, allowSyl, model.syllablesSrc));
                var pb = el('span', 'pc-ws-blank');
                pb.setAttribute('aria-label', 'blank');
                pEl.appendChild(pb);
                pEl.appendChild(wsWordNode('span', '', ln.after, allowSyl, model.syllablesSrc));
                pass.appendChild(pEl);
              } else {
                pass.appendChild(wsWordNode('p', '', ln.text, allowSyl, model.syllablesSrc));
              }
            });
            body.appendChild(pass);
            var rpFlu = el('div', 'pc-ws-fluency');
            ['1st read', '2nd read', '3rd read'].forEach(function (lbl) {
              var rci = el('span', 'pc-ws-check-item');
              rci.appendChild(el('span', 'pc-ws-checkbox'));
              rci.appendChild(doc.createTextNode(' ' + lbl));
              rpFlu.appendChild(rci);
            });
            body.appendChild(rpFlu);
            if (it.options && it.options.length) {
              var rpUl = el('ul', 'pc-ws-choices');
              it.options.forEach(function (c) { rpUl.appendChild(wsWordNode('li', 'pc-ws-choice', c, allowSyl, model.syllablesSrc)); });
              body.appendChild(rpUl);
            } else {
              body.appendChild(el('div', 'pc-ws-line'));
            }
          } else {
            var fbRow = el('div', 'pc-ws-row');
            appendPicNode(fbRow, model, it.word, '', false);
            fbRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            body.appendChild(fbRow);
            body.appendChild(el('div', 'pc-ws-line'));
          }

          li.appendChild(body);
          list.appendChild(li);
          secKeyLines.push(wsKeyEntryText(act, it));
        });

        secEl.appendChild(list);
        keyBlocks.push({ heading: sec.label, lines: secKeyLines });
        sheet.appendChild(secEl);
      });

      var creditLines = model.computeCredits();
      if (creditLines.length) {
        var foot = el('footer', 'pc-ws-credits');
        creditLines.forEach(function (line) { foot.appendChild(el('p', 'pc-credit', line)); });
        sheet.appendChild(foot);
      }

      if (model.answerKeyOn && keyBlocks.length) {
        var keySec = el('section', 'pc-ws-key');
        keySec.setAttribute('aria-label', 'Teacher answer key');
        keySec.appendChild(el('p', 'pc-ws-key-banner', WS_KEY_NOTICE));
        keySec.appendChild(el('h3', 'pc-ws-section-title', 'Teacher Answer Key & Read-Aloud List'));
        keyBlocks.forEach(function (kb) {
          keySec.appendChild(el('h4', '', kb.heading));
          var ol = el('ol', 'pc-ws-key-list');
          kb.lines.forEach(function (line) { ol.appendChild(el('li', '', line)); });
          keySec.appendChild(ol);
        });
        sheet.appendChild(keySec);
      }
      return sheet;
    }
    function drawWorksheet() {
      if (!wsView || !wsState) return;
      while (wsNodes.sheets.firstChild) wsNodes.sheets.removeChild(wsNodes.sheets.firstChild);
      var model = normalizeWorksheetModel(wsCurrentInput(), {
        pictures: wsOptions.pictures,
        answerKey: wsOptions.answerKey,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
      var hasContent = model.sections.length > 0;
      wsNodes.print.disabled = wsBusy || !hasContent;
      wsNodes.download.disabled = wsBusy || !hasContent;
      wsNodes.options.hidden = !hasContent;
      if (wsNodes.presets) wsNodes.presets.hidden = !hasContent;
      wsNodes.tip.hidden = !hasContent;
      wsSyncPresetButtons();
      if (!hasContent) {
        wsNodes.said.textContent = TEXT.nothing;
        return;
      }
      if (wsBusy) {
        wsNodes.said.textContent = wsNote;
        return;
      }
      var itemCount = model.sections.reduce(function (sum, s) { return sum + s.items.length; }, 0);
      var extra = (wsNote ? ' ' + wsNote : '') + (wsOptions.syllables && wsSyllableNote ? ' ' + wsSyllableNote : '');
      wsNodes.said.textContent = count(model.sections.length, 'activity', 'activities') + ', ' + count(itemCount, 'question') + ' ready to print or download.' + extra;
      wsNodes.sheets.appendChild(renderWorksheetSheet(model));
    }
    function gatherWorksheet(mine) {
      if (!wsState) return Promise.resolve();
      var modelWords = normalizeWorksheetModel(wsState, { pictures: false }).words;
      var ownFn = typeof wsState.own === 'function' ? wsState.own : null;
      var ownP = ownFn && modelWords.length
        ? Promise.resolve().then(function () { return ownFn(modelWords); }).catch(function () { return null; })
        : Promise.resolve(wsState.own && typeof wsState.own === 'object' ? wsState.own : null);
      return ownP.then(function (found) {
        if (mine !== wsRun) return;
        wsOwn = found;
        if (!wsOptions.pictures || !modelWords.length) return;
        var syms = wsState.symbols;
        var needs = !!syms && modelWords.some(function (word) {
          var entry = ownEntryFor(found, word);
          return !(entry && entry.picture) && (syms.has(word) || syms.has(String(word).toLowerCase()));
        });
        if (!needs || syms.ready() || typeof wsState.loadPictures !== 'function') return;
        wsBusy = true;
        wsNote = fill(TEXT.getting, { mb: (Number(syms.bytes || 0) / 1e6).toFixed(1) });
        drawWorksheet();
        return Promise.resolve().then(function () { return wsState.loadPictures(); }).then(function (ready) { return !!ready; }, function () { return false; }).then(function (ready) {
          if (mine !== wsRun) return;
          wsBusy = false;
          wsNote = ready ? '' : TEXT.gotNone;
        });
      });
    }
    function openWorksheet(given) {
      if (!wsView) buildWorksheetView();
      if (view && !view.hidden) { run++; view.hidden = true; }
      if (vocabView && !vocabView.hidden) { vocabRun++; vocabView.hidden = true; }
      var mine = ++wsRun;
      var s = given || {};
      var defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
      wsState = Object.assign({}, s, {
        title: String(s.title || (s.lesson && s.lesson.title) || 'Word Sounds Activity Worksheet').trim(),
        symbols: s.symbols || null,
        matcher: s.matcher !== undefined ? s.matcher : defaultMatcher,
        loadPictures: s.loadPictures || null,
        own: s.own || null,
        creditLine: typeof s.creditLine === 'function' ? s.creditLine : root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine
      });
      wsOwn = typeof s.own === 'object' && typeof s.own !== 'function' ? s.own : null;
      wsBusy = false; wsNote = ''; wsSyllableNote = '';
      var initPreset = String(s.preset || '').trim().toLowerCase();
      wsOptions.pictures = s.pictures !== undefined ? !!s.pictures : (s.showPictures !== undefined ? !!s.showPictures : true);
      wsOptions.answerKey = s.answerKey !== undefined ? !!s.answerKey : (s.includeAnswerKey !== undefined ? !!s.includeAnswerKey : true);
      wsOptions.hints = s.hints !== undefined ? !!s.hints : (s.showHints !== undefined ? !!s.showHints : (initPreset === 'independent' ? false : true));
      wsOptions.syllables = s.syllables !== undefined ? !!s.syllables : (s.showSyllables !== undefined ? !!s.showSyllables : (initPreset === 'scaffolded'));
      if (wsNodes.picturesBox) wsNodes.picturesBox.checked = wsOptions.pictures;
      if (wsNodes.answerKeyBox) wsNodes.answerKeyBox.checked = wsOptions.answerKey;
      if (wsNodes.hintsBox) wsNodes.hintsBox.checked = wsOptions.hints;
      if (wsNodes.syllablesBox) wsNodes.syllablesBox.checked = wsOptions.syllables;
      wsSyncOptionClasses();
      wsSyncPresetButtons();
      if (wsOptions.syllables) ensureSyllablesLoaded();
      wsOpener = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : wsOpener;
      wsView.hidden = false;
      if (!docEscBound && doc && typeof doc.addEventListener === 'function') {
        doc.addEventListener('keydown', onDocKeyDown);
        docEscBound = true;
      }
      doc.body.classList.add('pc-on');
      drawWorksheet();
      if (typeof win.scrollTo === 'function') { try { win.scrollTo(0, 0); } catch (_) {} }
      wsNodes.heading.focus();
      return gatherWorksheet(mine).then(function () { if (mine === wsRun) { wsBusy = false; drawWorksheet(); } });
    }
    function closeWorksheet() {
      if (!wsView || wsView.hidden) return;
      wsRun++;
      wsView.hidden = true;
      if (docEscBound && doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('keydown', onDocKeyDown);
        docEscBound = false;
      }
      doc.body.classList.remove('pc-on');
      while (wsNodes.sheets.firstChild) wsNodes.sheets.removeChild(wsNodes.sheets.firstChild);
      if (wsOpener && typeof wsOpener.focus === 'function' && doc.contains(wsOpener)) wsOpener.focus();
    }
    function wireWorksheet(button, getState) {
      if (!button || typeof getState !== 'function') return false;
      button.hidden = false;
      button.addEventListener('click', function () { wsOpener = button; openWorksheet(getState()); });
      return true;
    }

    // -------------------------------------------------------------------------
    // Packets Vocabulary Practice Worksheet preview view (pure DOM, monochrome)
    // -------------------------------------------------------------------------
    function vocabWordNode(tag, className, text, sylSrc) {
      var str = String(text == null ? '' : text);
      if (!vocabOptions.syllables) return el(tag, className, str);
      var node = el(tag, className);
      var re = /[A-Za-z]+/g, m, last = 0;
      while ((m = re.exec(str))) {
        if (m.index > last) node.appendChild(doc.createTextNode(str.slice(last, m.index)));
        var tok = m[0];
        var parts = tok.length >= 4 ? wsLookupSyllables(tok, sylSrc) : null;
        if (parts && parts.length > 1) {
          for (var i = 0; i < parts.length; i++) {
            if (i > 0) {
              var dot = el('span', 'pc-dot', '\u00b7');
              dot.setAttribute('aria-hidden', 'true');
              node.appendChild(dot);
            }
            node.appendChild(doc.createTextNode(parts[i]));
          }
        } else {
          node.appendChild(doc.createTextNode(tok));
        }
        last = m.index + tok.length;
      }
      if (last < str.length) node.appendChild(doc.createTextNode(str.slice(last)));
      return node;
    }
    function vocabSyncOptionClasses() {
      if (!vocabView) return;
      Array.prototype.forEach.call(vocabView.querySelectorAll('.pc-radio input'), function (input) {
        if (input.parentNode) input.parentNode.classList.toggle('is-on', !!input.checked);
      });
    }
    function vocabSyncPresetButtons() {
      if (!vocabNodes.presetScaffolded || !vocabNodes.presetIndependent) return;
      var isScaffolded = !!(vocabOptions.wordBank && vocabOptions.pictures && vocabOptions.syllables);
      var isIndependent = !vocabOptions.wordBank && !vocabOptions.syllables;
      vocabNodes.presetScaffolded.setAttribute('aria-pressed', isScaffolded ? 'true' : 'false');
      vocabNodes.presetScaffolded.classList.toggle('is-on', isScaffolded);
      vocabNodes.presetIndependent.setAttribute('aria-pressed', isIndependent ? 'true' : 'false');
      vocabNodes.presetIndependent.classList.toggle('is-on', isIndependent);
    }
    function applyVocabPreset(presetName) {
      if (presetName === 'scaffolded') {
        vocabOptions.wordBank = true;
        vocabOptions.pictures = true;
        vocabOptions.syllables = true;
        if (vocabNodes.wordBankBox) vocabNodes.wordBankBox.checked = true;
        if (vocabNodes.picturesBox) vocabNodes.picturesBox.checked = true;
        if (vocabNodes.syllablesBox) vocabNodes.syllablesBox.checked = true;
        vocabSyllableNote = '';
        ensureSyllablesLoaded();
        vocabSyncOptionClasses();
        vocabSyncPresetButtons();
        if (vocabState && (vocabState.symbols || vocabState.own || vocabState.matcher)) {
          var mine = ++vocabRun;
          vocabNote = '';
          drawVocabWorksheet();
          gatherVocabWorksheet(mine).then(function () { if (mine === vocabRun) { vocabBusy = false; drawVocabWorksheet(); } });
          return;
        }
        drawVocabWorksheet();
        return;
      }
      if (presetName === 'independent') {
        vocabOptions.wordBank = false;
        vocabOptions.syllables = false;
        if (vocabNodes.wordBankBox) vocabNodes.wordBankBox.checked = false;
        if (vocabNodes.syllablesBox) vocabNodes.syllablesBox.checked = false;
        vocabSyllableNote = '';
        vocabSyncOptionClasses();
        vocabSyncPresetButtons();
        drawVocabWorksheet();
      }
    }
    function vocabCurrentInput() {
      if (!vocabState) return {};
      return Object.assign({}, vocabState, {
        own: vocabOwn || (typeof vocabState.own === 'object' ? vocabState.own : null),
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: vocabOptions.answerKey,
        syllables: vocabOptions.syllables
      });
    }
    function downloadVocabWorksheetHtml() {
      if (vocabBusy || !vocabState) return;
      var html = buildVocabWorksheetHtml(vocabCurrentInput(), {
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: vocabOptions.answerKey,
        syllables: vocabOptions.syllables
      });
      if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') return;
      var blob = new win.Blob([html], { type: 'text/html;charset=utf-8' });
      var url = win.URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      link.download = wsSlug(vocabState.title || 'vocabulary') + '-vocabulary-worksheet' + '.html';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (vocabNodes.said) vocabNodes.said.textContent = 'Downloaded standalone HTML vocabulary worksheet.';
    }
    function buildVocabWorksheetView() {
      vocabView = el('div', 'pc pc-ws-view pc-vocab-view');
      vocabView.id = 'print-vocab-worksheet-view';
      vocabView.hidden = true;
      var bar = el('div', 'pc-bar');
      vocabNodes.heading = el('h1', '', 'Vocabulary practice worksheet');
      vocabNodes.heading.id = 'pc-vocab-heading';
      vocabNodes.heading.tabIndex = -1;
      vocabView.setAttribute('role', 'region');
      vocabView.setAttribute('aria-labelledby', 'pc-vocab-heading');
      bar.appendChild(vocabNodes.heading);
      vocabNodes.said = el('p', 'pc-said');
      vocabNodes.said.setAttribute('role', 'status');
      bar.appendChild(vocabNodes.said);
      var actions = el('p', 'pc-actions');
      vocabNodes.print = el('button', 'btn btn-primary', TEXT.print);
      vocabNodes.print.type = 'button';
      vocabNodes.print.addEventListener('click', function () { if (!vocabBusy && vocabState) win.print(); });
      vocabNodes.download = el('button', 'btn', 'Download HTML worksheet');
      vocabNodes.download.type = 'button';
      vocabNodes.download.addEventListener('click', downloadVocabWorksheetHtml);
      vocabNodes.back = el('button', 'btn', TEXT.back);
      vocabNodes.back.type = 'button';
      vocabNodes.back.addEventListener('click', closeVocabWorksheet);
      actions.appendChild(vocabNodes.print);
      actions.appendChild(vocabNodes.download);
      actions.appendChild(vocabNodes.back);
      bar.appendChild(actions);

      vocabNodes.presets = el('div', 'pc-presets');
      vocabNodes.presets.setAttribute('role', 'group');
      vocabNodes.presets.setAttribute('aria-label', 'Differentiation presets');
      vocabNodes.presets.appendChild(el('span', 'pc-presets-label', 'Preset:'));
      vocabNodes.presetScaffolded = el('button', 'btn btn-small pc-preset-btn', 'Scaffolded');
      vocabNodes.presetScaffolded.type = 'button';
      vocabNodes.presetScaffolded.setAttribute('data-ws-preset', 'scaffolded');
      vocabNodes.presetScaffolded.setAttribute('aria-pressed', 'false');
      vocabNodes.presetScaffolded.addEventListener('click', function () { applyVocabPreset('scaffolded'); });
      vocabNodes.presetIndependent = el('button', 'btn btn-small pc-preset-btn', 'Independent');
      vocabNodes.presetIndependent.type = 'button';
      vocabNodes.presetIndependent.setAttribute('data-ws-preset', 'independent');
      vocabNodes.presetIndependent.setAttribute('aria-pressed', 'false');
      vocabNodes.presetIndependent.addEventListener('click', function () { applyVocabPreset('independent'); });
      vocabNodes.presets.appendChild(vocabNodes.presetScaffolded);
      vocabNodes.presets.appendChild(vocabNodes.presetIndependent);
      var wbWrap = el('label', 'radio pc-radio pc-preset-toggle'), wbBox = el('input');
      wbBox.type = 'checkbox'; wbBox.id = 'pc-vocab-word-bank'; wbBox.checked = !!vocabOptions.wordBank;
      wbWrap.classList.toggle('is-on', wbBox.checked);
      wbBox.addEventListener('change', function () {
        vocabOptions.wordBank = !!wbBox.checked;
        vocabSyncOptionClasses();
        vocabSyncPresetButtons();
        drawVocabWorksheet();
      });
      wbWrap.appendChild(wbBox);
      wbWrap.appendChild(el('span', '', 'Word bank'));
      vocabNodes.wordBankBox = wbBox;
      vocabNodes.presets.appendChild(wbWrap);
      bar.appendChild(vocabNodes.presets);

      vocabNodes.tip = el('p', 'pc-hint', TEXT.tip);
      bar.appendChild(vocabNodes.tip);
      vocabNodes.options = el('details', 'pc-options');
      vocabNodes.options.appendChild(el('summary', '', 'Worksheet options'));
      var body = el('div', 'pc-options-body');
      var makeVocabToggle = function (id, labelText, key, onToggle) {
        var wrap = el('label', 'radio pc-radio pc-check'), box = el('input');
        box.type = 'checkbox'; box.id = id; box.checked = !!vocabOptions[key];
        wrap.classList.toggle('is-on', box.checked);
        box.addEventListener('change', function () {
          vocabOptions[key] = !!box.checked;
          vocabSyncOptionClasses();
          vocabSyncPresetButtons();
          if (typeof onToggle === 'function') onToggle(box.checked);
          else drawVocabWorksheet();
        });
        wrap.appendChild(box);
        wrap.appendChild(el('span', '', labelText));
        vocabNodes[key + 'Box'] = box;
        body.appendChild(wrap);
      };
      makeVocabToggle('pc-vocab-pictures', 'Include pictures (Part 3)', 'pictures', function (checked) {
        if (checked && vocabState && (vocabState.symbols || vocabState.own || vocabState.matcher)) {
          var mine = ++vocabRun;
          vocabNote = '';
          drawVocabWorksheet();
          gatherVocabWorksheet(mine).then(function () { if (mine === vocabRun) { vocabBusy = false; drawVocabWorksheet(); } });
          return;
        }
        drawVocabWorksheet();
      });
      makeVocabToggle('pc-vocab-answer-key', 'Include teacher answer key', 'answerKey');
      makeVocabToggle('pc-vocab-syllables', TEXT.syllables, 'syllables', function (checked) {
        vocabSyllableNote = '';
        if (checked) ensureSyllablesLoaded();
        drawVocabWorksheet();
      });
      vocabNodes.options.appendChild(body);
      bar.appendChild(vocabNodes.options);
      vocabView.appendChild(bar);
      vocabNodes.sheets = el('div', 'pc-sheets');
      vocabView.appendChild(vocabNodes.sheets);
      doc.body.appendChild(vocabView);
    }
    function renderVocabWorksheetSheet(model) {
      var sheet = el('section', 'pc-sheet pc-ws-sheet pc-vocab-sheet');
      sheet.setAttribute('aria-label', model.title);
      var header = el('header', 'pc-ws-header');
      header.appendChild(el('h2', 'pc-ws-title', model.title));
      var meta = el('div', 'pc-ws-meta');
      ['Name:', 'Date:'].forEach(function (lbl) {
        var f = el('span', 'pc-ws-meta-field');
        f.appendChild(el('span', '', lbl));
        f.appendChild(el('span', 'pc-ws-meta-line'));
        meta.appendChild(f);
      });
      header.appendChild(meta);
      sheet.appendChild(header);

      if (model.wordBankOn && model.wordBank.length) {
        var bank = el('div', 'pc-vocab-bank');
        bank.setAttribute('data-vocab-word-bank', 'true');
        bank.appendChild(el('span', 'pc-ws-bank-label', 'Word Bank:'));
        model.wordBank.forEach(function (w) {
          bank.appendChild(vocabWordNode('span', 'pc-ws-chip', w, model.syllablesSrc));
        });
        sheet.appendChild(bank);
      }

      var keySections = [];

      // Part 1 — Match the Word to Its Meaning
      var p1Sec = el('section', 'pc-ws-section');
      p1Sec.setAttribute('data-vocab-part', 'matching');
      var p1Head = el('div', 'pc-ws-section-head');
      if (model.matchWords.length) {
        p1Head.appendChild(el('h3', 'pc-ws-section-title', 'Part 1 \u2014 Match the Word to Its Meaning'));
        p1Head.appendChild(el('p', 'pc-ws-directions', 'Write the letter of the matching meaning on the line next to each word.'));
        p1Sec.appendChild(p1Head);
        var grid = el('div', 'pc-vocab-match-grid');
        var wList = el('ol', 'pc-vocab-match-words');
        model.matchWords.forEach(function (item) {
          var li = el('li', 'pc-vocab-match-word');
          li.appendChild(el('span', 'pc-ws-num', item.num + '.'));
          var blank = el('span', 'pc-vocab-match-blank');
          blank.setAttribute('aria-label', 'letter blank');
          li.appendChild(blank);
          li.appendChild(vocabWordNode('span', 'pc-ws-word', item.word, model.syllablesSrc));
          wList.appendChild(li);
        });
        var dList = el('ol', 'pc-vocab-match-defs');
        model.matchDefs.forEach(function (def) {
          var li = el('li', 'pc-vocab-match-def');
          li.appendChild(el('span', 'pc-vocab-match-letter', def.letter + '.'));
          li.appendChild(el('span', '', def.meaning));
          dList.appendChild(li);
        });
        grid.appendChild(wList);
        grid.appendChild(dList);
        p1Sec.appendChild(grid);
        keySections.push({
          heading: 'Part 1 \u2014 Match the Word to Its Meaning',
          lines: model.matchWords.map(function (item) {
            return item.word + ' \u2014 ' + item.answerLetter + ' (' + item.meaning + ')';
          })
        });
      } else {
        p1Head.appendChild(el('h3', 'pc-ws-section-title', 'Part 1 \u2014 Write Each Meaning'));
        p1Head.appendChild(el('p', 'pc-ws-directions', 'Write what each vocabulary word means on the line.'));
        p1Sec.appendChild(p1Head);
        var fbList = el('ol', 'pc-ws-list');
        model.entries.forEach(function (e, i) {
          var li = el('li', 'pc-ws-item');
          li.appendChild(el('span', 'pc-ws-num', (i + 1) + '.'));
          var b = el('div', 'pc-ws-body');
          b.appendChild(vocabWordNode('span', 'pc-ws-word', e.word, model.syllablesSrc));
          b.appendChild(el('div', 'pc-ws-line'));
          li.appendChild(b);
          fbList.appendChild(li);
        });
        p1Sec.appendChild(fbList);
        keySections.push({
          heading: 'Part 1 \u2014 Write Each Meaning',
          lines: model.entries.map(function (e) { return e.word + ' \u2014 Teacher-checked student meaning.'; })
        });
      }
      sheet.appendChild(p1Sec);

      // Part 2 — Fill in the Blank
      if (model.clozeItems.length) {
        var p2Sec = el('section', 'pc-ws-section');
        p2Sec.setAttribute('data-vocab-part', 'cloze');
        var p2Head = el('div', 'pc-ws-section-head');
        p2Head.appendChild(el('h3', 'pc-ws-section-title', 'Part 2 \u2014 Fill in the Blank'));
        p2Head.appendChild(el('p', 'pc-ws-directions', model.wordBankOn
          ? 'Choose a word from the Word Bank to complete each sentence. Write the word on the line.'
          : 'Write the vocabulary word that best completes each sentence.'));
        p2Sec.appendChild(p2Head);
        var cList = el('ol', 'pc-ws-list');
        model.clozeItems.forEach(function (item) {
          var li = el('li', 'pc-ws-item');
          li.appendChild(el('span', 'pc-ws-num', item.num + '.'));
          var b = el('div', 'pc-ws-body');
          if (item.hasCloze) {
            var p = el('p', 'pc-vocab-cloze-text');
            p.appendChild(doc.createTextNode(item.before));
            var bl = el('span', 'pc-vocab-cloze-blank');
            bl.setAttribute('aria-label', 'blank');
            p.appendChild(bl);
            p.appendChild(doc.createTextNode(item.after));
            b.appendChild(p);
          } else {
            b.appendChild(el('p', 'pc-vocab-cloze-text', item.prompt));
            b.appendChild(el('div', 'pc-ws-line'));
          }
          li.appendChild(b);
          cList.appendChild(li);
        });
        p2Sec.appendChild(cList);
        sheet.appendChild(p2Sec);
        keySections.push({
          heading: 'Part 2 \u2014 Fill in the Blank',
          lines: model.clozeItems.map(function (item) {
            return item.hasCloze
              ? item.answer + ' \u2014 "' + item.completed + '"'
              : item.word + ' \u2014 Answers will vary (sentence using "' + item.word + '").';
          })
        });
      }

      // Part 3 — Name the Picture
      if (model.pictureItems.length) {
        var p3Sec = el('section', 'pc-ws-section');
        p3Sec.setAttribute('data-vocab-part', 'pictures');
        var p3Head = el('div', 'pc-ws-section-head');
        p3Head.appendChild(el('h3', 'pc-ws-section-title', 'Part 3 \u2014 Name the Picture'));
        p3Head.appendChild(el('p', 'pc-ws-directions', 'Look at each picture. Write the matching vocabulary word on the line underneath.'));
        p3Sec.appendChild(p3Head);
        var pGrid = el('ol', 'pc-vocab-pic-grid');
        model.pictureItems.forEach(function (item, idx) {
          var n = idx + 1;
          var tile = el('li', 'pc-vocab-pic-tile');
          tile.appendChild(el('span', 'pc-vocab-pic-num', n + '.'));
          var img = el('img', 'pc-vocab-pic-img');
          img.src = item.uri;
          img.alt = 'Picture ' + n;
          img.decoding = 'sync';
          tile.appendChild(img);
          var line = el('div', 'pc-vocab-pic-line');
          line.setAttribute('aria-label', 'writing line');
          tile.appendChild(line);
          pGrid.appendChild(tile);
        });
        p3Sec.appendChild(pGrid);
        sheet.appendChild(p3Sec);
        keySections.push({
          heading: 'Part 3 \u2014 Name the Picture',
          lines: model.pictureItems.map(function (item) { return item.word; })
        });
      }

      var creditLines = model.computeCredits();
      if (creditLines.length) {
        var foot = el('footer', 'pc-ws-credits');
        creditLines.forEach(function (line) { foot.appendChild(el('p', 'pc-credit', line)); });
        sheet.appendChild(foot);
      }

      if (model.answerKeyOn && keySections.length) {
        var keySec = el('section', 'pc-ws-key');
        keySec.setAttribute('aria-label', 'Teacher answer key');
        keySec.appendChild(el('p', 'pc-ws-key-banner', WS_KEY_NOTICE));
        keySec.appendChild(el('h3', 'pc-ws-section-title', 'Teacher Answer Key'));
        keySections.forEach(function (sec) {
          keySec.appendChild(el('h4', '', sec.heading));
          var ol = el('ol', 'pc-ws-key-list');
          sec.lines.forEach(function (line) { ol.appendChild(el('li', '', line)); });
          keySec.appendChild(ol);
        });
        sheet.appendChild(keySec);
      }
      return sheet;
    }
    function drawVocabWorksheet() {
      if (!vocabView || !vocabState) return;
      while (vocabNodes.sheets.firstChild) vocabNodes.sheets.removeChild(vocabNodes.sheets.firstChild);
      var model = normalizeVocabWorksheetModel(vocabCurrentInput(), {
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: vocabOptions.answerKey,
        syllables: vocabOptions.syllables
      });
      var hasContent = model.entries.length > 0;
      vocabNodes.print.disabled = vocabBusy || !hasContent;
      vocabNodes.download.disabled = vocabBusy || !hasContent;
      vocabNodes.options.hidden = !hasContent;
      if (vocabNodes.presets) vocabNodes.presets.hidden = !hasContent;
      vocabNodes.tip.hidden = !hasContent;
      vocabSyncPresetButtons();
      if (!hasContent) {
        vocabNodes.said.textContent = TEXT.nothing;
        return;
      }
      if (vocabBusy) {
        vocabNodes.said.textContent = vocabNote;
        return;
      }
      var partCount = 2 + (model.pictureItems.length ? 1 : 0);
      var extra = (vocabNote ? ' ' + vocabNote : '') + (vocabOptions.syllables && vocabSyllableNote ? ' ' + vocabSyllableNote : '');
      vocabNodes.said.textContent = count(model.entries.length, 'word') + ', ' + count(partCount, 'part') + ' ready to print or download.' + extra;
      vocabNodes.sheets.appendChild(renderVocabWorksheetSheet(model));
    }
    function gatherVocabWorksheet(mine) {
      if (!vocabState) return Promise.resolve();
      var modelWords = normalizeVocabWorksheetModel(vocabState, { pictures: false }).words;
      var ownFn = typeof vocabState.own === 'function' ? vocabState.own : null;
      var ownP = ownFn && modelWords.length
        ? Promise.resolve().then(function () { return ownFn(modelWords); }).catch(function () { return null; })
        : Promise.resolve(vocabState.own && typeof vocabState.own === 'object' ? vocabState.own : null);
      return ownP.then(function (found) {
        if (mine !== vocabRun) return;
        vocabOwn = found;
        if (!vocabOptions.pictures || !modelWords.length) return;
        var syms = vocabState.symbols;
        var needs = !!syms && modelWords.some(function (word) {
          var entry = ownEntryFor(found, word);
          return !(entry && entry.picture) && (syms.has(word) || syms.has(String(word).toLowerCase()));
        });
        if (!needs || syms.ready() || typeof vocabState.loadPictures !== 'function') return;
        vocabBusy = true;
        vocabNote = fill(TEXT.getting, { mb: (Number(syms.bytes || 0) / 1e6).toFixed(1) });
        drawVocabWorksheet();
        return Promise.resolve().then(function () { return vocabState.loadPictures(); }).then(function (ready) { return !!ready; }, function () { return false; }).then(function (ready) {
          if (mine !== vocabRun) return;
          vocabBusy = false;
          vocabNote = ready ? '' : TEXT.gotNone;
        });
      });
    }
    function openVocabWorksheet(given, opts) {
      if (!vocabView) buildVocabWorksheetView();
      if (view && !view.hidden) { run++; view.hidden = true; }
      if (wsView && !wsView.hidden) { wsRun++; wsView.hidden = true; }
      var mine = ++vocabRun;
      var s = Array.isArray(given) ? { entries: given } : (given || {});
      var o = opts && typeof opts === 'object' ? opts : {};
      var defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
      vocabState = Object.assign({}, s, {
        title: String(o.title || s.title || 'Vocabulary Practice Worksheet').trim(),
        symbols: o.symbols !== undefined ? o.symbols : (s.symbols || null),
        matcher: o.matcher !== undefined ? o.matcher : (s.matcher !== undefined ? s.matcher : defaultMatcher),
        loadPictures: o.loadPictures || s.loadPictures || null,
        own: o.own !== undefined ? o.own : (s.own || null),
        creditLine: typeof o.creditLine === 'function' ? o.creditLine
          : (typeof s.creditLine === 'function' ? s.creditLine : root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine)
      });
      vocabOwn = typeof vocabState.own === 'object' && typeof vocabState.own !== 'function' ? vocabState.own : null;
      vocabBusy = false; vocabNote = ''; vocabSyllableNote = '';
      var initPreset = String(o.preset || s.preset || '').trim().toLowerCase();
      vocabOptions.wordBank = o.wordBank !== undefined ? !!o.wordBank
        : (o.showWordBank !== undefined ? !!o.showWordBank
          : (s.wordBank !== undefined ? !!s.wordBank : (initPreset === 'independent' ? false : true)));
      vocabOptions.pictures = o.pictures !== undefined ? !!o.pictures
        : (o.showPictures !== undefined ? !!o.showPictures
          : (s.pictures !== undefined ? !!s.pictures : true));
      vocabOptions.answerKey = o.answerKey !== undefined ? !!o.answerKey
        : (o.includeAnswerKey !== undefined ? !!o.includeAnswerKey : true);
      vocabOptions.syllables = o.syllables !== undefined ? !!o.syllables
        : (o.showSyllables !== undefined ? !!o.showSyllables
          : (s.syllables !== undefined && typeof s.syllables === 'boolean' ? s.syllables : (initPreset === 'scaffolded')));
      if (vocabNodes.wordBankBox) vocabNodes.wordBankBox.checked = vocabOptions.wordBank;
      if (vocabNodes.picturesBox) vocabNodes.picturesBox.checked = vocabOptions.pictures;
      if (vocabNodes.answerKeyBox) vocabNodes.answerKeyBox.checked = vocabOptions.answerKey;
      if (vocabNodes.syllablesBox) vocabNodes.syllablesBox.checked = vocabOptions.syllables;
      vocabSyncOptionClasses();
      vocabSyncPresetButtons();
      if (vocabOptions.syllables) ensureSyllablesLoaded();
      vocabOpener = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : vocabOpener;
      vocabView.hidden = false;
      if (!docEscBound && doc && typeof doc.addEventListener === 'function') {
        doc.addEventListener('keydown', onDocKeyDown);
        docEscBound = true;
      }
      doc.body.classList.add('pc-on');
      drawVocabWorksheet();
      if (typeof win.scrollTo === 'function') { try { win.scrollTo(0, 0); } catch (_) {} }
      vocabNodes.heading.focus();
      return gatherVocabWorksheet(mine).then(function () { if (mine === vocabRun) { vocabBusy = false; drawVocabWorksheet(); } });
    }
    function closeVocabWorksheet() {
      if (!vocabView || vocabView.hidden) return;
      vocabRun++;
      vocabView.hidden = true;
      if (docEscBound && doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('keydown', onDocKeyDown);
        docEscBound = false;
      }
      doc.body.classList.remove('pc-on');
      while (vocabNodes.sheets.firstChild) vocabNodes.sheets.removeChild(vocabNodes.sheets.firstChild);
      if (vocabOpener && typeof vocabOpener.focus === 'function' && doc.contains(vocabOpener)) vocabOpener.focus();
    }
    function wireVocabWorksheet(button, getState) {
      if (!button || typeof getState !== 'function') return false;
      button.hidden = false;
      button.addEventListener('click', function () { vocabOpener = button; openVocabWorksheet(getState()); });
      return true;
    }
    return {
      open: open, close: close, wire: wire, options: options, view: function () { return view; },
      openWorksheet: openWorksheet, closeWorksheet: closeWorksheet, wireWorksheet: wireWorksheet,
      worksheetOptions: wsOptions, worksheetView: function () { return wsView; },
      buildWordSoundsWorksheetHtml: buildWordSoundsWorksheetHtml,
      openVocabWorksheet: openVocabWorksheet, closeVocabWorksheet: closeVocabWorksheet, wireVocabWorksheet: wireVocabWorksheet,
      vocabWorksheetOptions: vocabOptions, vocabWorksheetView: function () { return vocabView; },
      buildVocabWorksheetHtml: buildVocabWorksheetHtml
    };
  }

  var api = root && root.document ? create(root.document, root) : {};
  api.VERSION = VERSION;
  api.SIZES = SIZES;
  api.TEXT = TEXT;
  api.WS_ACTIVITIES = WS_ACTIVITIES;
  api.create = create;
  api.layout = layout;
  api.lengthClass = lengthClass;
  api.picturesOf = picturesOf;
  api.creditsFor = creditsFor;
  api.buildWordSoundsWorksheetHtml = buildWordSoundsWorksheetHtml;
  api.buildVocabWorksheetHtml = buildVocabWorksheetHtml;

  if (root) {
    root.AlloPacketPrintCards = api;
    root.AlloPacketsPrintCards = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
