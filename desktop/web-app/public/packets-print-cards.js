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
  // Canonical single-story school handwriting strokes (sky y=0, midline y=50, base y=100, descender y=145).
  var WS_TRACE_STROKES = {
    a: 'E 22 75 22 25 -30 -390|M 44 50 L 44 100',
    b: 'M 0 0 L 0 100|E 22 75 22 25 180 540',
    c: 'E 22 75 22 25 -40 -320',
    d: 'E 22 75 22 25 -30 -390|M 44 0 L 44 100',
    e: 'M 2 75 L 44 75 E 22 75 22 25 0 -320',
    f: 'E 34 14 13 14 -20 -180 L 21 100|M 6 50 L 40 50',
    g: 'E 22 75 22 25 -30 -390|M 44 50 L 44 125 E 24 125 20 20 0 150',
    h: 'M 0 0 L 0 100|M 0 72 E 22 72 22 22 180 360 L 44 100',
    i: 'M 0 50 L 0 100|D 0 28',
    j: 'M 24 50 L 24 125 E 6 125 18 18 0 160|D 24 28',
    k: 'M 0 0 L 0 100|M 38 50 L 2 78 L 40 100',
    l: 'M 0 0 L 0 100',
    m: 'M 0 50 L 0 100|M 0 70 E 15 70 15 20 180 360 L 30 100|M 30 70 E 45 70 15 20 180 360 L 60 100',
    n: 'M 0 50 L 0 100|M 0 72 E 21 72 21 22 180 360 L 42 100',
    o: 'E 23 75 23 25 -70 -430',
    p: 'M 0 50 L 0 145|E 22 75 22 25 180 540',
    q: 'E 22 75 22 25 -30 -390|M 44 50 L 44 145',
    r: 'M 0 50 L 0 100|M 0 74 E 20 74 20 22 180 310',
    s: 'E 22 62.5 20 12.5 -20 -270 E 22 87.5 20 12.5 -90 160',
    t: 'M 16 14 L 16 100|M 0 50 L 34 50',
    u: 'M 0 50 L 0 78 E 21 78 21 22 180 0 L 42 50|M 42 50 L 42 100',
    v: 'M 0 50 L 22 100 L 44 50',
    w: 'M 0 50 L 15 100 L 30 50 L 45 100 L 60 50',
    x: 'M 0 50 L 42 100|M 42 50 L 0 100',
    y: 'M 0 50 L 22 100|M 44 50 L 8 145',
    z: 'M 0 50 L 42 50 L 0 100 L 42 100',
    A: 'M 30 0 L 0 100|M 30 0 L 60 100|M 11 64 L 49 64',
    B: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 24 22 24 -90 90 L 0 48|M 0 48 L 28 48 E 28 74 24 26 -90 90 L 0 100',
    C: 'E 45 50 45 50 -40 -320',
    D: 'M 0 0 L 0 100|M 0 0 L 16 0 E 16 50 40 50 -90 90 L 0 100',
    E: 'M 0 0 L 0 100|M 0 0 L 44 0|M 0 50 L 36 50|M 0 100 L 44 100',
    F: 'M 0 0 L 0 100|M 0 0 L 44 0|M 0 50 L 36 50',
    G: 'E 45 50 45 50 -40 -360 L 58 50',
    H: 'M 0 0 L 0 100|M 50 0 L 50 100|M 0 50 L 50 50',
    I: 'M 20 0 L 20 100|M 0 0 L 40 0|M 0 100 L 40 100',
    J: 'M 40 0 L 40 74 E 20 74 20 26 0 165',
    K: 'M 0 0 L 0 100|M 46 0 L 2 52 L 48 100',
    L: 'M 0 0 L 0 100 L 42 100',
    M: 'M 0 0 L 0 100|M 0 0 L 32 64 L 64 0 L 64 100',
    N: 'M 0 0 L 0 100|M 0 0 L 52 100 L 52 0',
    O: 'E 45 50 45 50 -90 -450',
    P: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 26 24 26 -90 90 L 0 52',
    Q: 'E 45 50 45 50 -90 -450|M 58 72 L 92 104',
    R: 'M 0 0 L 0 100|M 0 0 L 24 0 E 24 26 24 26 -90 90 L 0 52|M 24 52 L 50 100',
    S: 'E 42 25 38 25 -20 -270 E 42 75 38 25 -90 160',
    T: 'M 26 0 L 26 100|M 0 0 L 52 0',
    U: 'M 0 0 L 0 66 E 25 66 25 34 180 0 L 50 0',
    V: 'M 0 0 L 26 100 L 52 0',
    W: 'M 0 0 L 18 100 L 36 0 L 54 100 L 72 0',
    X: 'M 0 0 L 52 100|M 52 0 L 0 100',
    Y: 'M 0 0 L 26 50|M 52 0 L 26 50 L 26 100',
    Z: 'M 0 0 L 52 0 L 0 100 L 52 100'
  };

  function wsParseLetterStrokes(ch) {
    var spec = Object.prototype.hasOwnProperty.call(WS_TRACE_STROKES, ch) ? WS_TRACE_STROKES[ch] : '';
    if (!spec) return null;
    var rawStrokes = spec.split('|');
    var strokes = [];
    var minX = Infinity, maxX = -Infinity, maxY = 100;
    rawStrokes.forEach(function (part) {
      var toks = part.trim().split(/\s+/).filter(Boolean);
      var i = 0, pts = [], isDot = false, dotPt = null;
      while (i < toks.length) {
        var cmd = toks[i++];
        if (cmd === 'M' || cmd === 'L') {
          var px = Number(toks[i++]), py = Number(toks[i++]);
          if (Number.isFinite(px) && Number.isFinite(py)) pts.push([px, py]);
        } else if (cmd === 'E') {
          var cx = Number(toks[i++]), cy = Number(toks[i++]);
          var rx = Number(toks[i++]), ry = Number(toks[i++]);
          var a0 = Number(toks[i++]), a1 = Number(toks[i++]);
          if (Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(rx) && Number.isFinite(ry) && Number.isFinite(a0) && Number.isFinite(a1)) {
            var steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 10));
            for (var s = 0; s <= steps; s++) {
              var ang = (a0 + (a1 - a0) * (s / steps)) * Math.PI / 180;
              var ex = cx + rx * Math.cos(ang);
              var ey = cy + ry * Math.sin(ang);
              if (!pts.length || Math.hypot(ex - pts[pts.length - 1][0], ey - pts[pts.length - 1][1]) > 0.4) {
                pts.push([ex, ey]);
              }
            }
          }
        } else if (cmd === 'D') {
          var dx = Number(toks[i++]), dy = Number(toks[i++]);
          if (Number.isFinite(dx) && Number.isFinite(dy)) {
            isDot = true;
            dotPt = [dx, dy];
          }
        }
      }
      if (isDot && dotPt) {
        minX = Math.min(minX, dotPt[0] - 4);
        maxX = Math.max(maxX, dotPt[0] + 4);
        maxY = Math.max(maxY, dotPt[1]);
        strokes.push({ dot: true, x: dotPt[0], y: dotPt[1] });
      } else if (pts.length >= 2) {
        pts.forEach(function (pt) {
          if (pt[0] < minX) minX = pt[0];
          if (pt[0] > maxX) maxX = pt[0];
          if (pt[1] > maxY) maxY = pt[1];
        });
        strokes.push({ dot: false, pts: pts });
      }
    });
    if (!strokes.length || !Number.isFinite(minX)) return null;
    return { strokes: strokes, minX: minX, maxX: maxX, hasDescender: maxY > 106 };
  }

  function wsLetterStrokeCue(letter) {
    var ch = String(letter || '').trim().charAt(0);
    if (!ch) return '';
    var parsed = wsParseLetterStrokes(ch);
    if (!parsed) return 'Trace the guide letters along the lines, then write ' + ch + ' on your own.';
    var n = parsed.strokes.length;
    var first = parsed.strokes[0];
    var dirHint = 'follow the arrow';
    if (first && !first.dot && first.pts.length >= 2) {
      var p0 = first.pts[0];
      var p1 = first.pts[Math.min(first.pts.length - 1, 3)];
      var dx = p1[0] - p0[0], dy = p1[1] - p0[1];
      if (dy > Math.abs(dx) * 1.4 && dy > 6) dirHint = 'pull straight down';
      else if (dx > Math.abs(dy) * 1.4 && dx > 6) dirHint = 'go left to right';
      else if (dx < -4 && dy <= 10) dirHint = 'curve left and around';
      else if (dy > 4 && dx < -3) dirHint = 'slant down left';
      else if (dy > 4 && dx > 3) dirHint = 'slant down right';
    }
    if (n === 1) return '1 stroke: Start at dot 1 and ' + dirHint + '.';
    return n + ' strokes: Start at dot 1 (' + dirHint + '), then follow dots 2' + (n > 2 ? ' to ' + n : '') + ' in order.';
  }

  function buildLetterTracingStripSvg(letter, options) {
    var ch = String(letter || 'A').trim().charAt(0) || 'A';
    var opts = options && typeof options === 'object' ? options : {};
    var scaffolded = opts.scaffolded !== false;
    var standalone = !!opts.standalone;
    var parsed = wsParseLetterStrokes(ch);
    var hasDesc = !!(parsed && parsed.hasDescender);
    var W = 600;
    var topY = 18;
    var H = hasDesc ? 174 : 134;
    var nsAttr = standalone ? (' xmlns="ht' + 'tp:' + '/' + '/www.' + 'w3.org/2000/svg"') : '';
    var out = [
      '<svg' + nsAttr + ' class="ws-trace-svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Primary handwriting strip for letter ' + wsEsc(ch) + '">',
      '<title>Trace letter ' + wsEsc(ch) + (parsed ? ' (' + parsed.strokes.length + (parsed.strokes.length === 1 ? ' stroke' : ' strokes') + ')' : '') + '</title>',
      '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="#ffffff"/>',
      // Sky line, dashed midline, solid baseline (+ optional descender rule)
      '<line x1="8" y1="' + topY + '" x2="' + (W - 8) + '" y2="' + topY + '" stroke="#000000" stroke-width="1.6"/>',
      '<line x1="8" y1="' + (topY + 50) + '" x2="' + (W - 8) + '" y2="' + (topY + 50) + '" stroke="#707070" stroke-width="1.2" stroke-dasharray="6 5"/>',
      '<line x1="8" y1="' + (topY + 100) + '" x2="' + (W - 8) + '" y2="' + (topY + 100) + '" stroke="#000000" stroke-width="1.9"/>'
    ];
    if (hasDesc) {
      out.push('<line x1="8" y1="' + (topY + 142) + '" x2="' + (W - 8) + '" y2="' + (topY + 142) + '" stroke="#999999" stroke-width="1" stroke-dasharray="3 4"/>');
    }

    var slots = 5;
    var padX = 18;
    var slotW = (W - padX * 2) / slots;

    if (!parsed) {
      // Fallback for non-ASCII / digit characters
      for (var fi = 0; fi < (scaffolded ? 3 : 2); fi++) {
        var fx = (padX + slotW * (fi + 0.5)).toFixed(1);
        var isModel = fi === 0;
        out.push('<text x="' + fx + '" y="' + (topY + 94) + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="94" '
          + (isModel ? 'fill="#000000"' : 'fill="none" stroke="#767676" stroke-width="2" stroke-dasharray="5 4"')
          + '>' + wsEsc(ch) + '</text>');
      }
      out.push('</svg>');
      return out.join('');
    }

    var midGlyphX = (parsed.minX + parsed.maxX) / 2;
    var glyphSpan = Math.max(1, parsed.maxX - parsed.minX);
    var scale = glyphSpan > 78 ? (78 / glyphSpan) : 1;

    function mapPt(pt, cxSlot) {
      return [
        cxSlot + (pt[0] - midGlyphX) * scale,
        topY + pt[1] * scale + (1 - scale) * 100
      ];
    }
    function pathD(pts, cxSlot) {
      var segs = [];
      for (var i = 0; i < pts.length; i++) {
        var mp = mapPt(pts[i], cxSlot);
        segs.push((i === 0 ? 'M ' : 'L ') + mp[0].toFixed(1) + ' ' + mp[1].toFixed(1));
      }
      return segs.join(' ');
    }
    function arrowAt(pts, cxSlot) {
      if (pts.length < 2) return '';
      var mapped = pts.map(function (pt) { return mapPt(pt, cxSlot); });
      var totalLen = 0;
      for (var i = 1; i < mapped.length; i++) {
        totalLen += Math.hypot(mapped[i][0] - mapped[i - 1][0], mapped[i][1] - mapped[i - 1][1]);
      }
      if (totalLen < 12) return '';
      var target = Math.min(20, Math.max(11, totalLen * 0.32));
      var acc = 0, ax = mapped[0][0], ay = mapped[0][1], ux = 0, uy = 1;
      for (var j = 1; j < mapped.length; j++) {
        var dx = mapped[j][0] - mapped[j - 1][0];
        var dy = mapped[j][1] - mapped[j - 1][1];
        var segLen = Math.hypot(dx, dy);
        if (segLen < 0.01) continue;
        if (acc + segLen >= target || j === mapped.length - 1) {
          var t = Math.max(0, Math.min(1, (target - acc) / segLen));
          ax = mapped[j - 1][0] + dx * t;
          ay = mapped[j - 1][1] + dy * t;
          ux = dx / segLen;
          uy = dy / segLen;
          break;
        }
        acc += segLen;
      }
      var tipX = ax + ux * 6.5, tipY = ay + uy * 6.5;
      var baseX = ax - ux * 3.5, baseY = ay - uy * 3.5;
      var px = -uy * 4.8, py = ux * 4.8;
      return '<polygon points="'
        + tipX.toFixed(1) + ',' + tipY.toFixed(1) + ' '
        + (baseX + px).toFixed(1) + ',' + (baseY + py).toFixed(1) + ' '
        + (baseX - px).toFixed(1) + ',' + (baseY - py).toFixed(1)
        + '" fill="#000000" stroke="#ffffff" stroke-width="0.9"/>';
    }

    var guideCount = scaffolded ? 2 : 1;
    var firstStroke = parsed.strokes[0];
    var startOrigin = firstStroke.dot ? [firstStroke.x, firstStroke.y] : firstStroke.pts[0];

    for (var si = 0; si < slots; si++) {
      var cxSlot = padX + slotW * (si + 0.5);
      if (si === 0) {
        // Slot 1: Solid model letter with numbered stroke start dots and direction arrows
        parsed.strokes.forEach(function (st) {
          if (st.dot) {
            var dp = mapPt([st.x, st.y], cxSlot);
            out.push('<circle cx="' + dp[0].toFixed(1) + '" cy="' + dp[1].toFixed(1) + '" r="4.5" fill="#000000"/>');
          } else {
            out.push('<path d="' + pathD(st.pts, cxSlot) + '" fill="none" stroke="#000000" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round"/>');
          }
        });
        // Stroke badges & directional arrows on model
        parsed.strokes.forEach(function (st, sIdx) {
          if (!scaffolded && sIdx > 0) return;
          var sp = st.dot ? mapPt([st.x, st.y], cxSlot) : mapPt(st.pts[0], cxSlot);
          if (!st.dot && scaffolded) {
            var arr = arrowAt(st.pts, cxSlot);
            if (arr) out.push(arr);
          }
          var badgeR = scaffolded ? 8 : 5;
          out.push('<circle cx="' + sp[0].toFixed(1) + '" cy="' + sp[1].toFixed(1) + '" r="' + badgeR + '" fill="#000000" stroke="#ffffff" stroke-width="1.6"/>');
          if (scaffolded) {
            out.push('<text x="' + sp[0].toFixed(1) + '" y="' + (sp[1] + 3.6).toFixed(1) + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="10.5" font-weight="700" fill="#ffffff">' + (sIdx + 1) + '</text>');
          }
        });
      } else if (si <= guideCount) {
        // Dashed tracing guide letter(s) with start dot
        parsed.strokes.forEach(function (st) {
          if (st.dot) {
            var gdp = mapPt([st.x, st.y], cxSlot);
            out.push('<circle cx="' + gdp[0].toFixed(1) + '" cy="' + gdp[1].toFixed(1) + '" r="4.2" fill="none" stroke="#767676" stroke-width="2" stroke-dasharray="3 2"/>');
          } else {
            out.push('<path d="' + pathD(st.pts, cxSlot) + '" fill="none" stroke="#767676" stroke-width="4.4" stroke-dasharray="6 5" stroke-linecap="round" stroke-linejoin="round"/>');
          }
        });
        var gs = mapPt(startOrigin, cxSlot);
        out.push('<circle cx="' + gs[0].toFixed(1) + '" cy="' + gs[1].toFixed(1) + '" r="4.2" fill="#ffffff" stroke="#000000" stroke-width="1.8"/>');
        out.push('<circle cx="' + gs[0].toFixed(1) + '" cy="' + gs[1].toFixed(1) + '" r="1.6" fill="#000000"/>');
      } else {
        // Independent writing slot: clean starting dot on primary rules
        var indPt = mapPt(startOrigin, cxSlot);
        out.push('<circle cx="' + indPt[0].toFixed(1) + '" cy="' + indPt[1].toFixed(1) + '" r="3.4" fill="#444444"/>');
      }
    }

    out.push('</svg>');
    return out.join('');
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

  // ---------------------------------------------------------------------------
  // Shared Worksheet Customizer helpers (Word Sounds, Vocabulary, Read-Along)
  // ---------------------------------------------------------------------------
  function wsNormalizeDensity(value) {
    var s = String(value == null ? '' : value).trim().toLowerCase();
    return s === 'compact' || s === 'primary' ? s : 'standard';
  }
  function wsToBoolMap(raw) {
    var out = Object.create(null);
    if (!raw) return out;
    if (Array.isArray(raw)) {
      raw.forEach(function (k) {
        var s = String(k == null ? '' : k).trim();
        if (s && s !== '__proto__' && s !== 'constructor' && s !== 'prototype') out[s] = true;
      });
      return out;
    }
    if (typeof raw === 'object') {
      Object.keys(raw).forEach(function (k) {
        if (k && k !== '__proto__' && k !== 'constructor' && k !== 'prototype' && raw[k]) out[k] = true;
      });
    }
    return out;
  }
  function wsMergeBoolMaps() {
    var out = Object.create(null);
    for (var i = 0; i < arguments.length; i++) {
      var m = wsToBoolMap(arguments[i]);
      Object.keys(m).forEach(function (k) { out[k] = true; });
    }
    return out;
  }
  function wsNormalizeOverrides(raw) {
    var out = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.keys(raw).forEach(function (k) {
      if (!k || k === '__proto__' || k === 'constructor' || k === 'prototype') return;
      var v = raw[k];
      if (!v || typeof v !== 'object') return;
      var entry = {};
      if (typeof v.heading === 'string') entry.heading = v.heading;
      else if (typeof v.label === 'string') entry.heading = v.label;
      else if (typeof v.title === 'string') entry.heading = v.title;
      if (typeof v.directions === 'string') entry.directions = v.directions;
      if (entry.heading !== undefined || entry.directions !== undefined) out[k] = entry;
    });
    return out;
  }
  function wsMergeOverrides() {
    var out = Object.create(null);
    for (var i = 0; i < arguments.length; i++) {
      var ov = wsNormalizeOverrides(arguments[i]);
      Object.keys(ov).forEach(function (k) {
        out[k] = Object.assign({}, out[k] || {}, ov[k]);
      });
    }
    return out;
  }
  function wsNormalizeItemOrder(raw) {
    var out = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    var keys = Object.keys(raw);
    var added = 0;
    for (var i = 0; i < keys.length && added < 32; i++) {
      var k = String(keys[i] == null ? '' : keys[i]).trim();
      if (!k || k.length > 64 || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      var arr = raw[keys[i]];
      if (!Array.isArray(arr) || !arr.length) continue;
      var seen = Object.create(null);
      var clean = [];
      for (var j = 0; j < arr.length && clean.length < 200; j++) {
        var n = Math.floor(Number(arr[j]));
        if (!isFinite(n) || n < 0 || n >= 500 || seen[n]) continue;
        seen[n] = true;
        clean.push(n);
      }
      if (clean.length) {
        out[k] = clean;
        added++;
      }
    }
    return out;
  }
  function wsMergeItemOrders() {
    var out = Object.create(null);
    for (var i = 0; i < arguments.length; i++) {
      var m = wsNormalizeItemOrder(arguments[i]);
      Object.keys(m).forEach(function (k) { out[k] = m[k].slice(); });
    }
    return out;
  }
  function wsApplyItemOrder(items, itemOrder, secKey, altKey) {
    var list = Array.isArray(items) ? items : [];
    if (list.length < 2 || !itemOrder || typeof itemOrder !== 'object') return list.slice();
    var order = (secKey && Array.isArray(itemOrder[secKey]) && itemOrder[secKey].length)
      ? itemOrder[secKey]
      : ((altKey && Array.isArray(itemOrder[altKey]) && itemOrder[altKey].length) ? itemOrder[altKey] : null);
    if (!order) return list.slice();
    var byOrig = Object.create(null);
    list.forEach(function (it, idx) {
      var oid = it && typeof it.origIndex === 'number' ? it.origIndex : idx;
      byOrig[oid] = it;
    });
    var used = Object.create(null);
    var out = [];
    order.forEach(function (oid) {
      if (byOrig[oid] && !used[oid]) {
        used[oid] = true;
        out.push(byOrig[oid]);
      }
    });
    list.forEach(function (it, idx) {
      var oid = it && typeof it.origIndex === 'number' ? it.origIndex : idx;
      if (!used[oid]) {
        used[oid] = true;
        out.push(it);
      }
    });
    return out;
  }
  function wsNormalizeItemTextOverrides(raw) {
    var out = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    var keys = Object.keys(raw);
    var added = 0;
    for (var i = 0; i < keys.length && added < 200; i++) {
      var k = String(keys[i] == null ? '' : keys[i]).trim();
      if (!k || k.length > 96 || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      if (typeof raw[keys[i]] !== 'string') continue;
      var val = String(raw[keys[i]]).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
      if (val.length > 240) val = val.slice(0, 240).trim();
      if (val) {
        out[k] = val;
        added++;
      }
    }
    return out;
  }
  function wsMergeItemTextOverrides() {
    var out = Object.create(null);
    for (var i = 0; i < arguments.length; i++) {
      var m = wsNormalizeItemTextOverrides(arguments[i]);
      Object.keys(m).forEach(function (k) { out[k] = m[k]; });
    }
    return out;
  }
  function wsItemTextOverride(map, key, altKey) {
    if (!map || typeof map !== 'object') return '';
    if (key && typeof map[key] === 'string' && map[key].trim()) return map[key].trim();
    if (altKey && typeof map[altKey] === 'string' && map[altKey].trim()) return map[altKey].trim();
    return '';
  }
  function wsDefaultItemPrompt(activity, it) {
    if (!it || typeof it !== 'object') return '';
    if (activity === 'isolation') return 'What is the ' + String(it.positionName || 'target') + ' sound in ' + String(it.word || '') + '?';
    if (activity === 'rhyming') return 'Circle the word that rhymes with ' + String(it.word || '') + ':';
    if (activity === 'word_families') return 'Word family: -' + String(it.rime || '') + ' (like ' + String(it.word || '') + ')';
    if (activity === 'letter_tracing') {
      var letters = (it.parts || []).map(function (p) { return p.letter; }).join(' and ');
      return 'Trace ' + letters + ' (for ' + String(it.word || '') + ')';
    }
    if (activity === 'orthography' || activity === 'spelling_bee') return 'Listen to your teacher and write the word:';
    if (activity === 'manipulation') return String(it.prompt || '');
    if (activity === 'read_sentence') return String(it.before || '') + '___' + String(it.after || '');
    if (activity === 'mapping') return 'Listen and write each sound in a box:';
    if (activity === 'word_scramble') return 'Unscramble the letters:';
    if (activity === 'read_passage') return 'Read the story:';
    return '';
  }
  function wsCreateDefaultCustom(baseTitle) {
    return {
      title: String(baseTitle == null ? '' : baseTitle).trim(),
      subtitle: '',
      headerFields: { classPeriod: false, score: false },
      density: 'standard',
      hiddenSections: Object.create(null),
      hiddenItems: Object.create(null),
      sectionOverrides: Object.create(null),
      itemOrder: Object.create(null),
      itemTextOverrides: Object.create(null)
    };
  }
  function wsCloneCustom(cust) {
    var c = cust && typeof cust === 'object' ? cust : wsCreateDefaultCustom('');
    return {
      title: String(c.title || '').trim(),
      subtitle: String(c.subtitle || '').trim(),
      headerFields: {
        classPeriod: !!(c.headerFields && c.headerFields.classPeriod),
        score: !!(c.headerFields && c.headerFields.score)
      },
      density: wsNormalizeDensity(c.density),
      hiddenSections: wsToBoolMap(c.hiddenSections),
      hiddenItems: wsToBoolMap(c.hiddenItems),
      sectionOverrides: wsNormalizeOverrides(c.sectionOverrides),
      itemOrder: wsNormalizeItemOrder(c.itemOrder),
      itemTextOverrides: wsNormalizeItemTextOverrides(c.itemTextOverrides)
    };
  }
  function wsExtractCustom(src, opts, defaultTitle) {
    var s = src && typeof src === 'object' ? src : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var sc = s.custom && typeof s.custom === 'object' ? s.custom : {};
    var oc = o.custom && typeof o.custom === 'object' ? o.custom : {};
    var pickStr = function () {
      for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] === 'string' && arguments[i].trim()) return arguments[i].trim();
      }
      return '';
    };
    var title = pickStr(o.title, oc.title, sc.title, s.title, defaultTitle) || defaultTitle;
    var subtitle = typeof o.subtitle === 'string' ? o.subtitle.trim()
      : (typeof oc.subtitle === 'string' ? oc.subtitle.trim()
        : (typeof sc.subtitle === 'string' ? sc.subtitle.trim()
          : (typeof s.subtitle === 'string' ? s.subtitle.trim() : '')));
    var hfSrc = (s.headerFields && typeof s.headerFields === 'object') ? s.headerFields : {};
    var hfSc = (sc.headerFields && typeof sc.headerFields === 'object') ? sc.headerFields : {};
    var hfOc = (oc.headerFields && typeof oc.headerFields === 'object') ? oc.headerFields : {};
    var hfOpt = (o.headerFields && typeof o.headerFields === 'object') ? o.headerFields : {};
    var pickBool = function (key) {
      if (hfOpt[key] !== undefined) return !!hfOpt[key];
      if (hfOc[key] !== undefined) return !!hfOc[key];
      if (hfSc[key] !== undefined) return !!hfSc[key];
      if (hfSrc[key] !== undefined) return !!hfSrc[key];
      return false;
    };
    var density = wsNormalizeDensity(
      o.density !== undefined ? o.density
        : (oc.density !== undefined ? oc.density
          : (sc.density !== undefined ? sc.density : s.density))
    );
    var hiddenSections = wsMergeBoolMaps(
      s.hiddenSections, s.hiddenParts, sc.hiddenSections, sc.hiddenParts,
      o.hiddenSections, o.hiddenParts, oc.hiddenSections, oc.hiddenParts
    );
    var hiddenItems = wsMergeBoolMaps(s.hiddenItems, sc.hiddenItems, o.hiddenItems, oc.hiddenItems);
    var sectionOverrides = wsMergeOverrides(s.sectionOverrides, sc.sectionOverrides, o.sectionOverrides, oc.sectionOverrides);
    var itemOrder = wsMergeItemOrders(s.itemOrder, sc.itemOrder, o.itemOrder, oc.itemOrder);
    var itemTextOverrides = wsMergeItemTextOverrides(s.itemTextOverrides, sc.itemTextOverrides, o.itemTextOverrides, oc.itemTextOverrides);
    return {
      title: title,
      subtitle: subtitle,
      headerFields: { classPeriod: pickBool('classPeriod'), score: pickBool('score') },
      density: density,
      hiddenSections: hiddenSections,
      hiddenParts: hiddenSections,
      hiddenItems: hiddenItems,
      sectionOverrides: sectionOverrides,
      itemOrder: itemOrder,
      itemTextOverrides: itemTextOverrides
    };
  }
  function wsSectionOverride(overrides, key, altKey) {
    if (!overrides || typeof overrides !== 'object') return null;
    if (key && overrides[key]) return overrides[key];
    if (altKey && overrides[altKey]) return overrides[altKey];
    return null;
  }
  function wsApplySectionCopy(overrides, key, altKey, defaultHeading, defaultDirections) {
    var ov = wsSectionOverride(overrides, key, altKey);
    var heading = (ov && typeof ov.heading === 'string' && ov.heading.trim()) ? ov.heading.trim() : defaultHeading;
    var directions = (ov && typeof ov.directions === 'string') ? ov.directions : defaultDirections;
    return { heading: heading, directions: directions };
  }
  function wsIsItemHidden(hiddenItems, secKey, origIdx, altKey) {
    if (!hiddenItems) return false;
    if (hiddenItems[secKey + ':' + origIdx] || hiddenItems[secKey + '::' + origIdx]) return true;
    if (altKey && (hiddenItems[altKey + ':' + origIdx] || hiddenItems[altKey + '::' + origIdx])) return true;
    return false;
  }
  function wsCountHidden(map) {
    if (!map || typeof map !== 'object') return 0;
    return Object.keys(map).filter(function (k) { return !!map[k]; }).length;
  }
  function wsHeaderMetaHtml(headerFields) {
    var hf = headerFields && typeof headerFields === 'object' ? headerFields : {};
    var parts = [
      '<span class="ws-meta-field"><span>Name:</span><span class="ws-meta-line"></span></span>',
      '<span class="ws-meta-field"><span>Date:</span><span class="ws-meta-line"></span></span>'
    ];
    if (hf.classPeriod) {
      parts.push('<span class="ws-meta-field"><span>Class / Period:</span><span class="ws-meta-line"></span></span>');
    }
    if (hf.score) {
      parts.push('<span class="ws-meta-field"><span>Score:</span><span class="ws-score-line"><span class="ws-score-blank"></span> / <span class="ws-score-blank"></span></span></span>');
    }
    return '<div class="ws-meta">' + parts.join('') + '</div>';
  }
  function wsSubtitleHtml(subtitle) {
    var s = String(subtitle == null ? '' : subtitle).trim();
    return s ? '<p class="ws-subtitle">' + wsEsc(s) + '</p>' : '';
  }

  // ---------------------------------------------------------------------------
  // Reusable Teacher Worksheet Presets & Reopenable HTML/JSON Templates
  // ---------------------------------------------------------------------------
  var WS_PRESETS_KEY = 'alloflow-packets-ws-presets/1';
  var WS_PRESETS_MAX = 20;
  var WS_TEMPLATE_MAX_BYTES = 200 * 1024;
  var WS_TEMPLATE_KIND_LABELS = {
    'word-sounds': 'Word Sounds',
    vocab: 'Vocabulary',
    'read-along': 'Read-Along'
  };
  function wsTrimLimit(value, maxLen) {
    var s = String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
    return s.length > maxLen ? s.slice(0, maxLen).trim() : s;
  }
  function wsNormalizeTemplateKind(raw) {
    var s = String(raw == null ? '' : raw).trim().toLowerCase();
    if (s === 'word-sounds' || s === 'word_sounds' || s === 'ws') return 'word-sounds';
    if (s === 'vocab' || s === 'vocabulary') return 'vocab';
    if (s === 'read-along' || s === 'read_along' || s === 'ra') return 'read-along';
    return '';
  }
  function wsTemplateKindLabel(kind) {
    var k = wsNormalizeTemplateKind(kind);
    return WS_TEMPLATE_KIND_LABELS[k] || 'Worksheet';
  }
  function wsPlainBoolMap(raw, maxEntries, maxKeyLen) {
    var m = wsToBoolMap(raw);
    var out = {};
    var limitN = maxEntries || 200;
    var limitK = maxKeyLen || 96;
    var keys = Object.keys(m).sort();
    var added = 0;
    for (var i = 0; i < keys.length && added < limitN; i++) {
      var clean = wsTrimLimit(keys[i], limitK);
      if (!clean || clean === '__proto__' || clean === 'constructor' || clean === 'prototype') continue;
      out[clean] = true;
      added++;
    }
    return out;
  }
  function wsPlainOverrides(raw) {
    var m = wsNormalizeOverrides(raw);
    var out = {};
    var keys = Object.keys(m).sort();
    var added = 0;
    for (var i = 0; i < keys.length && added < 32; i++) {
      var k = wsTrimLimit(keys[i], 64);
      if (!k || k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      var v = m[keys[i]];
      var entry = {};
      if (typeof v.heading === 'string') {
        var h = wsTrimLimit(v.heading, 120);
        if (h) entry.heading = h;
      }
      if (typeof v.directions === 'string') {
        entry.directions = wsTrimLimit(v.directions, 240);
      }
      if (entry.heading !== undefined || entry.directions !== undefined) {
        out[k] = entry;
        added++;
      }
    }
    return out;
  }
  function wsNormalizeTemplateOptions(kind, rawOpts) {
    var o = rawOpts && typeof rawOpts === 'object' && !Array.isArray(rawOpts) ? rawOpts : {};
    var out = {};
    var pickBool = function () {
      for (var i = 0; i < arguments.length; i++) {
        var key = arguments[i];
        if (Object.prototype.hasOwnProperty.call(o, key) && o[key] !== undefined) return !!o[key];
      }
      return undefined;
    };
    if (kind === 'word-sounds') {
      var p = pickBool('pictures', 'picturesOn', 'showPictures');
      var ak = pickBool('answerKey', 'answerKeyOn', 'includeAnswerKey');
      var h = pickBool('hints', 'hintsOn', 'showHints');
      var sy = pickBool('syllables', 'syllablesOn', 'showSyllables');
      if (p !== undefined) out.pictures = p;
      if (ak !== undefined) out.answerKey = ak;
      if (h !== undefined) out.hints = h;
      if (sy !== undefined) out.syllables = sy;
    } else if (kind === 'vocab') {
      var wb = pickBool('wordBank', 'wordBankOn', 'showWordBank');
      var vp = pickBool('pictures', 'picturesOn', 'showPictures');
      var vak = pickBool('answerKey', 'answerKeyOn', 'includeAnswerKey');
      var vsy = pickBool('syllables', 'syllablesOn', 'showSyllables');
      if (wb !== undefined) out.wordBank = wb;
      if (vp !== undefined) out.pictures = vp;
      if (vak !== undefined) out.answerKey = vak;
      if (vsy !== undefined) out.syllables = vsy;
    } else if (kind === 'read-along') {
      var rsy = pickBool('syllables', 'showSyllables');
      var rb = pickBool('bold', 'showBold');
      var rsu = pickBool('supports', 'showSupports');
      var rak = pickBool('answerKey', 'answerKeyOn', 'includeAnswerKey');
      if (rsy !== undefined) out.syllables = rsy;
      if (rb !== undefined) out.bold = rb;
      if (rsu !== undefined) out.supports = rsu;
      if (rak !== undefined) out.answerKey = rak;
      if (Object.prototype.hasOwnProperty.call(o, 'writeLines') && o.writeLines !== undefined) {
        out.writeLines = raNormalizeWriteLines(o.writeLines);
      }
    }
    return out;
  }
  function wsSafeInlineJson(obj, space) {
    return JSON.stringify(obj, null, space || 0)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }
  function wsPlainItemOrder(raw) {
    var m = wsNormalizeItemOrder(raw);
    var out = {};
    Object.keys(m).sort().forEach(function (k) {
      out[k] = m[k].slice();
    });
    return out;
  }
  function wsPlainItemTextOverrides(raw) {
    var m = wsNormalizeItemTextOverrides(raw);
    var out = {};
    Object.keys(m).sort().forEach(function (k) {
      out[k] = m[k];
    });
    return out;
  }
  function wsBuildTemplateObject(kind, customState, opts) {
    var k = wsNormalizeTemplateKind(kind) || 'word-sounds';
    var src = customState && typeof customState === 'object' ? customState : {};
    var c = wsExtractCustom(src, {}, '');
    var rawOpts = opts && typeof opts === 'object' ? opts : (src.options && typeof src.options === 'object' ? src.options : {});
    return {
      kind: k,
      schema: 1,
      title: wsTrimLimit(c.title, 120),
      subtitle: wsTrimLimit(c.subtitle, 200),
      headerFields: {
        classPeriod: !!(c.headerFields && c.headerFields.classPeriod),
        score: !!(c.headerFields && c.headerFields.score)
      },
      density: wsNormalizeDensity(c.density),
      sectionOverrides: wsPlainOverrides(c.sectionOverrides),
      hiddenSections: wsPlainBoolMap(c.hiddenSections, 32, 64),
      hiddenItems: wsPlainBoolMap(c.hiddenItems, 200, 96),
      itemOrder: wsPlainItemOrder(c.itemOrder),
      itemTextOverrides: wsPlainItemTextOverrides(c.itemTextOverrides),
      options: wsNormalizeTemplateOptions(k, rawOpts)
    };
  }
  function serializeWorksheetTemplate(kind, customState, opts, formatOpts) {
    var payload = wsBuildTemplateObject(kind, customState, opts);
    var indent = formatOpts && formatOpts.pretty ? 2 : 0;
    return wsSafeInlineJson(payload, indent);
  }
  function wsTemplateScriptTag(kind, customOrModel, opts) {
    return '<template id="alloflow-worksheet-template">'
      + serializeWorksheetTemplate(kind, customOrModel, opts)
      + '</template>';
  }
  function wsUtf8ByteLength(str) {
    var total = 0;
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) total += 1;
      else if (code < 0x800) total += 2;
      else if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) { total += 4; i++; }
      else total += 3;
    }
    return total;
  }
  function extractWorksheetTemplate(textOrJson) {
    if (typeof textOrJson !== 'string') {
      return { ok: false, why: 'No worksheet template text was provided.' };
    }
    var raw = textOrJson.charCodeAt(0) === 0xFEFF ? textOrJson.slice(1) : textOrJson;
    if (!raw.trim()) {
      return { ok: false, why: 'No worksheet template text was provided.' };
    }
    if (raw.length > WS_TEMPLATE_MAX_BYTES || (raw.length > (WS_TEMPLATE_MAX_BYTES / 3) && wsUtf8ByteLength(raw) > WS_TEMPLATE_MAX_BYTES)) {
      return { ok: false, why: 'This file is larger than the 200 KB worksheet template limit.' };
    }
    var trimmed = raw.trim();
    var jsonText = '';
    var source = 'json';
    if (trimmed.charAt(0) === '{') {
      jsonText = trimmed;
      source = 'json';
    } else {
      var m;
      var tplRe = /<template\b([^>]*)>([\s\S]*?)<\/template\s*>/gi;
      while ((m = tplRe.exec(raw))) {
        var tAttrs = m[1] || '';
        var tIdM = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(tAttrs);
        var tIdVal = tIdM ? String(tIdM[1] || tIdM[2] || tIdM[3] || '').trim().toLowerCase() : '';
        if (tIdVal === 'alloflow-worksheet-template') {
          jsonText = String(m[2] || '').trim();
          source = 'html';
          break;
        }
      }
      if (!jsonText) {
        var tagRe = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
        while ((m = tagRe.exec(raw))) {
          var attrs = m[1] || '';
          var idM = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(attrs);
          var typeM = /\btype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(attrs);
          var idVal = idM ? String(idM[1] || idM[2] || idM[3] || '').trim().toLowerCase() : '';
          var typeVal = typeM ? String(typeM[1] || typeM[2] || typeM[3] || '').trim().toLowerCase() : '';
          if (idVal === 'alloflow-worksheet-template' && typeVal === 'application/json') {
            jsonText = String(m[2] || '').trim();
            source = 'html';
            break;
          }
        }
      }
      if (!jsonText) {
        return { ok: false, why: 'This file does not contain a saved AlloFlow worksheet template.' };
      }
    }
    var parsed = null;
    try {
      parsed = JSON.parse(jsonText);
    } catch (_) {
      return { ok: false, why: 'Invalid JSON in worksheet template.' };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, why: 'Unsupported worksheet template format or version.' };
    }
    if (parsed.schema !== 1) {
      return { ok: false, why: 'Unsupported worksheet template format or version.' };
    }
    var kind = wsNormalizeTemplateKind(parsed.kind);
    if (!kind) {
      return { ok: false, why: 'Unknown worksheet template type.' };
    }
    var tpl = {
      kind: kind,
      schema: 1,
      title: wsTrimLimit(parsed.title, 120),
      subtitle: wsTrimLimit(parsed.subtitle, 200),
      headerFields: {
        classPeriod: !!(parsed.headerFields && parsed.headerFields.classPeriod),
        score: !!(parsed.headerFields && parsed.headerFields.score)
      },
      density: wsNormalizeDensity(parsed.density),
      sectionOverrides: wsPlainOverrides(parsed.sectionOverrides),
      hiddenSections: wsPlainBoolMap(parsed.hiddenSections || parsed.hiddenParts, 32, 64),
      hiddenItems: wsPlainBoolMap(parsed.hiddenItems, 200, 96),
      itemOrder: wsPlainItemOrder(parsed.itemOrder),
      itemTextOverrides: wsPlainItemTextOverrides(parsed.itemTextOverrides),
      options: wsNormalizeTemplateOptions(kind, parsed.options)
    };
    return {
      ok: true,
      source: source,
      template: tpl,
      kind: tpl.kind,
      schema: tpl.schema,
      title: tpl.title,
      subtitle: tpl.subtitle,
      headerFields: tpl.headerFields,
      density: tpl.density,
      sectionOverrides: tpl.sectionOverrides,
      hiddenSections: tpl.hiddenSections,
      hiddenItems: tpl.hiddenItems,
      itemOrder: tpl.itemOrder,
      itemTextOverrides: tpl.itemTextOverrides,
      options: tpl.options
    };
  }
  function wsGetStorage(storageWin) {
    try {
      var st = storageWin && storageWin.localStorage;
      if (!st || typeof st.getItem !== 'function' || typeof st.setItem !== 'function') return null;
      return st;
    } catch (_) {
      return null;
    }
  }
  function wsSanitizePresetEntry(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var name = wsTrimLimit(raw.name, 50);
    if (!name) return null;
    var kind = wsNormalizeTemplateKind(raw.kind) || 'word-sounds';
    var id = wsTrimLimit(raw.id, 64) || ('p_' + wsHash(name.toLowerCase()).toString(36));
    return {
      id: id,
      name: name,
      kind: kind,
      savedAt: Number(raw.savedAt) || 0,
      subtitle: wsTrimLimit(raw.subtitle, 200),
      headerFields: {
        classPeriod: !!(raw.headerFields && raw.headerFields.classPeriod),
        score: !!(raw.headerFields && raw.headerFields.score)
      },
      density: wsNormalizeDensity(raw.density),
      sectionOverrides: wsPlainOverrides(raw.sectionOverrides),
      hiddenSections: wsPlainBoolMap(raw.hiddenSections || raw.hiddenParts, 32, 64),
      options: wsNormalizeTemplateOptions(kind, raw.options)
    };
  }
  function wsLoadPresets(storageWin) {
    var st = wsGetStorage(storageWin);
    if (!st) return [];
    var rawStr = '';
    try {
      rawStr = st.getItem(WS_PRESETS_KEY) || '';
    } catch (_) {
      return [];
    }
    if (!rawStr) return [];
    var parsed = null;
    try {
      parsed = JSON.parse(rawStr);
    } catch (_) {
      return [];
    }
    var arr = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.presets) ? parsed.presets : []);
    var out = [];
    var seen = Object.create(null);
    for (var i = 0; i < arr.length && out.length < WS_PRESETS_MAX; i++) {
      var clean = wsSanitizePresetEntry(arr[i]);
      if (!clean || seen[clean.id]) continue;
      seen[clean.id] = true;
      out.push(clean);
    }
    return out;
  }
  function wsSavePresets(storageWin, list) {
    var st = wsGetStorage(storageWin);
    if (!st) {
      return { ok: false, why: 'Browser storage is unavailable on this device. Use Save template (.json) instead.' };
    }
    var cleaned = [];
    var seen = Object.create(null);
    (Array.isArray(list) ? list : []).forEach(function (item) {
      if (cleaned.length >= WS_PRESETS_MAX) return;
      var entry = wsSanitizePresetEntry(item);
      if (!entry || seen[entry.id]) return;
      seen[entry.id] = true;
      cleaned.push(entry);
    });
    try {
      st.setItem(WS_PRESETS_KEY, JSON.stringify({ schema: 1, presets: cleaned }));
      return { ok: true, presets: cleaned };
    } catch (_) {
      return { ok: false, why: 'Browser storage is unavailable on this device. Use Save template (.json) instead.' };
    }
  }

  function normalizeWorksheetModel(lessonOrState, rawOptions) {
    var src = lessonOrState && typeof lessonOrState === 'object' ? lessonOrState : {};
    var opts = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
    var lesson = src.lesson && typeof src.lesson === 'object' ? src.lesson : (Array.isArray(src.blocks) ? src : null);
    var blocks = (Array.isArray(src.blocks) && src.blocks.length ? src.blocks : null)
      || (lesson && Array.isArray(lesson.blocks) && lesson.blocks.length ? lesson.blocks : null);
    var imagesMap = src.images || (lesson && lesson.images) || {};
    var manifest = src.manifest || null;
    var defaultTitle = String(src.title || (lesson && lesson.title) || 'Word Sounds Activity Worksheet').trim() || 'Word Sounds Activity Worksheet';
    var custom = wsExtractCustom(src, opts, defaultTitle);
    var title = custom.title;
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

    var allSections = [];
    var seenActCount = Object.create(null);
    var pushRawSection = function (act, items) {
      var meta = WS_ACTIVITIES[act] || { label: act.replace(/_/g, ' '), directions: 'Complete each item below.' };
      var countForAct = seenActCount[act] || 0;
      seenActCount[act] = countForAct + 1;
      var secKey = countForAct === 0 ? act : (act + '_' + countForAct);
      var tagged = items.map(function (it, idx) {
        it.origIndex = idx;
        it.itemKey = secKey + ':' + idx;
        return it;
      });
      allSections.push({
        key: secKey,
        activity: act,
        defaultLabel: meta.label,
        defaultDirections: meta.directions,
        label: meta.label,
        directions: meta.directions,
        items: tagged
      });
    };
    if (blocks && blocks.length) {
      blocks.forEach(function (block) {
        if (!block || !Array.isArray(block.items) || !block.items.length) return;
        var act = String(block.activity || 'mapping');
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
        if (items.length) pushRawSection(act, items);
      });
    } else if (rawWordList.length) {
      var actList = (Array.isArray(opts.activities) && opts.activities.length ? opts.activities : null)
        || (Array.isArray(src.activities) && src.activities.length ? src.activities : null)
        || (Array.isArray(src.lessonPlanSequence) && src.lessonPlanSequence.length ? src.lessonPlanSequence : null)
        || WS_DEFAULT_ACTIVITIES;
      actList.forEach(function (actId) {
        var act = String(actId || '').trim();
        if (!act) return;
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
        if (items.length) pushRawSection(act, items);
      });
    }

    // Apply customizer item reordering, inline text overrides, section visibility, copy overrides, and item filters.
    var sections = [];
    allSections.forEach(function (rawSec) {
      var orderedRaw = wsApplyItemOrder(rawSec.items, custom.itemOrder, rawSec.key, rawSec.activity);
      var prepared = orderedRaw.map(function (it) {
        var clone = Object.assign({}, it);
        clone.origWord = clone.word;
        clone.defaultPrompt = wsDefaultItemPrompt(rawSec.activity, clone);
        var altItemKey = rawSec.activity !== rawSec.key ? (rawSec.activity + ':' + clone.origIndex) : '';
        var ovText = wsItemTextOverride(custom.itemTextOverrides, clone.itemKey, altItemKey);
        if (ovText) {
          clone.customPrompt = ovText;
          if (rawSec.activity === 'manipulation') {
            clone.prompt = ovText;
          } else if (rawSec.activity === 'read_sentence') {
            var bm = /_{3,}/.exec(ovText);
            if (bm) {
              clone.before = ovText.slice(0, bm.index);
              clone.after = ovText.slice(bm.index + bm[0].length);
              clone.customPromptNoBlank = false;
            } else {
              clone.before = ovText;
              clone.after = '';
              clone.customPromptNoBlank = true;
            }
          }
        }
        return clone;
      });
      rawSec.items = prepared;
      if (custom.hiddenSections[rawSec.key] || custom.hiddenSections[rawSec.activity]) return;
      var visibleItems = prepared.filter(function (it) {
        return !wsIsItemHidden(custom.hiddenItems, rawSec.key, it.origIndex, rawSec.activity);
      });
      if (!visibleItems.length) return;
      var copy = wsApplySectionCopy(custom.sectionOverrides, rawSec.key, rawSec.activity, rawSec.defaultLabel, rawSec.defaultDirections);
      sections.push({
        key: rawSec.key,
        activity: rawSec.activity,
        defaultLabel: rawSec.defaultLabel,
        defaultDirections: rawSec.defaultDirections,
        label: copy.heading,
        directions: copy.directions,
        items: visibleItems
      });
    });

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
      subtitle: custom.subtitle,
      headerFields: custom.headerFields,
      density: custom.density,
      sections: sections,
      allSections: allSections,
      hiddenSections: custom.hiddenSections,
      hiddenParts: custom.hiddenParts,
      hiddenItems: custom.hiddenItems,
      sectionOverrides: custom.sectionOverrides,
      itemOrder: custom.itemOrder,
      itemTextOverrides: custom.itemTextOverrides,
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
    '.ws-subtitle{margin:-4px 0 10px;font-size:14px;font-style:italic;color:#000000}',
    '.ws-meta{display:flex;flex-wrap:wrap;gap:10px 28px;font-size:14px;font-weight:700}',
    '.ws-meta-field{display:inline-flex;align-items:baseline;gap:8px;flex:1 1 200px}',
    '.ws-meta-line{flex:1 1 auto;border-bottom:1.5px solid #000000;min-width:110px;height:16px}',
    '.ws-score-line{display:inline-flex;align-items:baseline;gap:6px}',
    '.ws-score-blank{display:inline-block;width:44px;border-bottom:1.5px solid #000000;height:16px}',
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
    '.ws-trace-row{display:flex;flex-direction:column;gap:3px;max-width:600px;background:#ffffff;break-inside:avoid;page-break-inside:avoid}',
    '.ws-trace-svg{display:block;width:100%;height:auto;max-height:92px}',
    '.ws-trace-cue{margin:0;font-size:11.5px;font-style:italic;color:#333333}',
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
    'body.ws-density-compact{line-height:1.25;font-size:13px}',
    'body.ws-density-compact .ws-header{padding-bottom:6px;margin-bottom:8px}',
    'body.ws-density-compact .ws-title{font-size:19px;margin-bottom:6px}',
    'body.ws-density-compact .ws-section{margin-top:10px}',
    'body.ws-density-compact .ws-section-title{font-size:15px}',
    'body.ws-density-compact .ws-directions{font-size:12px}',
    'body.ws-density-compact .ws-item{padding:6px 0;gap:8px}',
    'body.ws-density-compact .ws-word{font-size:18px}',
    'body.ws-density-compact .ws-pic{width:48px;height:48px}',
    'body.ws-density-compact .ws-box{width:34px;height:34px}',
    'body.ws-density-compact .ws-line{height:24px;margin-top:4px}',
    'body.ws-density-compact .ws-trace-svg{max-height:70px}',
    'body.ws-density-compact .ws-trace-letter{font-size:52px}',
    'body.ws-density-primary{line-height:1.5;font-size:17px}',
    'body.ws-density-primary .ws-title{font-size:28px}',
    'body.ws-density-primary .ws-subtitle{font-size:16px}',
    'body.ws-density-primary .ws-meta{font-size:17px}',
    'body.ws-density-primary .ws-section{margin-top:24px}',
    'body.ws-density-primary .ws-section-title{font-size:21px}',
    'body.ws-density-primary .ws-directions{font-size:16px}',
    'body.ws-density-primary .ws-item{padding:14px 0;gap:16px}',
    'body.ws-density-primary .ws-num{font-size:19px;min-width:34px}',
    'body.ws-density-primary .ws-prompt{font-size:17px}',
    'body.ws-density-primary .ws-word{font-size:26px}',
    'body.ws-density-primary .ws-pic{width:78px;height:78px}',
    'body.ws-density-primary .ws-box{width:54px;height:54px}',
    'body.ws-density-primary .ws-tile{min-width:44px;height:48px;font-size:24px}',
    'body.ws-density-primary .ws-choice{font-size:19px;padding:6px 18px}',
    'body.ws-density-primary .ws-bubble{min-width:44px;height:44px;font-size:19px}',
    'body.ws-density-primary .ws-line{height:54px;margin-top:10px}',
    'body.ws-density-primary .ws-trace-svg{max-height:118px}',
    'body.ws-density-primary .ws-trace-letter{font-size:84px}',
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
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row">' + pic + '<div class="ws-boxes" data-sound-boxes="' + it.soundCount + '">' + boxes + '</div></div>' + bank;
        } else if (act === 'missing_letter') {
          var mlPic = picTag(it.word, neutralAlt, false);
          var mlWord = '<div class="ws-missing">' + it.letters.map(function (ch, ci) {
            return ci === it.hiddenIndex ? '<span class="ws-blank" aria-label="missing letter"></span>' : '<span>' + wsEsc(ch) + '</span>';
          }).join('') + '</div>';
          var mlChoices = '<ul class="ws-choices">' + (it.choices || []).map(function (c) {
            return '<li class="ws-choice">' + wsEsc(c) + '</li>';
          }).join('') + '</ul>';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row">' + mlPic + mlWord + '</div>' + mlChoices;
        } else if (act === 'word_scramble') {
          var wsPic = picTag(it.word, neutralAlt, false);
          var tiles = '<div class="ws-tiles">' + (it.tiles || []).map(function (t) {
            return '<span class="ws-tile">' + wsEsc(t) + '</span>';
          }).join('') + '</div>';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row">' + wsPic + tiles + '</div><div class="ws-line"></div>';
        } else if (act === 'counting') {
          var ctPic = picTag(it.word, '', false);
          var bubbles = '<ul class="ws-bubbles">' + (it.values || ['1', '2', '3', '4', '5', '6']).map(function (v) {
            return '<li class="ws-bubble">' + wsEsc(v) + '</li>';
          }).join('') + '</ul>';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row">' + ctPic + '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span></div>' + bubbles;
        } else if (act === 'isolation') {
          var isoPic = picTag(it.word, '', false);
          var isoChoices = '<ul class="ws-choices">' + (it.choices || []).map(function (c) {
            return '<li class="ws-choice">' + wsEsc(wsSoundLabel(c)) + '</li>';
          }).join('') + '</ul>';
          var isoPromptHtml = it.customPrompt ? wsEsc(it.customPrompt) : ('What is the ' + wsEsc(it.positionName) + ' sound in ' + fmt(it.word, allowSyl) + '?');
          inner = '<p class="ws-prompt">' + isoPromptHtml + '</p>'
            + '<div class="ws-row">' + isoPic + '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span></div>' + isoChoices;
        } else if (act === 'segmentation') {
          var segPic = picTag(it.word, '', false);
          var dots = '';
          for (var di = 0; di < it.slotCount; di++) dots += '<span class="ws-tap-dot"></span>';
          var segBank = model.hintsOn && it.chips && it.chips.length
            ? '<div class="ws-bank"><span class="ws-bank-label">Sound bank:</span>' + it.chips.map(function (s) { return '<span class="ws-chip">' + wsEsc(wsSoundLabel(s)) + '</span>'; }).join('') + '</div>'
            : '';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row">' + segPic + '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span><div class="ws-tap-dots" data-tap-dots="' + it.slotCount + '">' + dots + '</div></div>'
            + '<div class="ws-line"></div>' + segBank;
        } else if (act === 'blending') {
          var seq = '<div class="ws-sounds-seq">' + (it.sounds || []).map(wsSoundLabel).map(wsEsc).join(' \u00b7 ') + '</div>';
          var bChoices = it.choices && it.choices.length
            ? '<ul class="ws-choices">' + it.choices.map(function (c) { return '<li class="ws-choice">' + fmt(c, allowSyl) + '</li>'; }).join('') + '</ul>'
            : '';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + seq + '<div class="ws-line"></div>' + bChoices;
        } else if (act === 'rhyming') {
          var rhPic = picTag(it.word, '', false);
          var rhChoices = '<ul class="ws-choices">' + (it.choices || []).map(function (c) {
            return '<li class="ws-choice">' + picTag(c, '', true) + '<span>' + fmt(c, allowSyl) + '</span></li>';
          }).join('') + '</ul>';
          var rhPromptHtml = it.customPrompt ? wsEsc(it.customPrompt) : ('Circle the word that rhymes with ' + fmt(it.word, allowSyl) + ':');
          inner = '<p class="ws-prompt">' + rhPromptHtml + '</p>'
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
          var wfPromptHtml = it.customPrompt ? wsEsc(it.customPrompt) : ('Word family: -' + wsEsc(it.rime) + ' (like ' + fmt(it.word, allowSyl) + ')');
          inner = '<p class="ws-prompt">' + wfPromptHtml + '</p>'
            + '<div class="ws-row">' + wfPic + '<span class="ws-word">-' + wsEsc(it.rime) + '</span></div>' + wfList + buildSlots;
        } else if (act === 'letter_tracing') {
          var ltPic = picTag(it.word, '', false);
          var rowsHtml = (it.parts || []).map(function (part) {
            var stripSvg = buildLetterTracingStripSvg(part.letter, { scaffolded: model.hintsOn });
            var cue = wsLetterStrokeCue(part.letter);
            return '<div class="ws-trace-row" data-trace-case="' + wsEsc(part.kind || 'letter') + '">'
              + stripSvg
              + (cue ? '<p class="ws-trace-cue">' + wsEsc(cue) + '</p>' : '')
              + '</div>';
          }).join('');
          var ltPromptHtml = it.customPrompt ? wsEsc(it.customPrompt) : ('Trace ' + wsEsc(it.parts.map(function (p) { return p.letter; }).join(' and ')) + ' (for ' + wsEsc(it.word) + ')');
          inner = '<div class="ws-row">' + ltPic + '<p class="ws-prompt">' + ltPromptHtml + '</p></div>'
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
          var spPromptHtml = it.customPrompt ? wsEsc(it.customPrompt) : ('Listen to your teacher and write word #' + n + ':');
          inner = '<p class="ws-prompt">' + spPromptHtml + '</p>'
            + '<div class="ws-row">' + spPic + scaffold + '</div><div class="ws-line"></div>';
        } else if (act === 'syllable_counting') {
          var scPic = picTag(it.word, '', false);
          var scBubbles = '<ul class="ws-bubbles">' + (it.values || ['1', '2', '3', '4', '5']).map(function (v) {
            return '<li class="ws-bubble">' + wsEsc(v) + '</li>';
          }).join('') + '</ul>';
          var scoops = '<div class="ws-scoops" aria-hidden="true"><span class="ws-scoop"></span><span class="ws-scoop"></span><span class="ws-scoop"></span></div>';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row">' + scPic + '<span class="ws-word">' + wsEsc(it.word) + '</span></div>' + scoops + scBubbles;
        } else if (act === 'syllable_blending') {
          var sbSeq = '<div class="ws-sounds-seq">' + (it.syllables || []).map(wsEsc).join(' \u00b7 ') + '</div>';
          var sbChoices = it.choices && it.choices.length
            ? '<ul class="ws-choices">' + it.choices.map(function (c) { return '<li class="ws-choice">' + fmt(c, allowSyl) + '</li>'; }).join('') + '</ul>'
            : '';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + sbSeq + '<div class="ws-line"></div>' + sbChoices;
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
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row"><span class="ws-word">' + fmt(it.word, allowSyl) + '</span></div>' + dChecks + dPics;
        } else if (act === 'read_sentence') {
          var rsPic = picTag(it.word, neutralAlt, false);
          var rsSentence = it.customPromptNoBlank
            ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>'
            : '<p class="ws-prompt">' + fmt(it.before, allowSyl) + '<span class="ws-blank" aria-label="blank"></span>' + fmt(it.after, allowSyl) + '</p>';
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
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + rpBody + rpFluency + rpChoices;
        } else {
          var fPic = !hidePic ? picTag(it.word, '', false) : '';
          inner = (it.customPrompt ? '<p class="ws-prompt">' + wsEsc(it.customPrompt) + '</p>' : '')
            + '<div class="ws-row">' + fPic + (!hideWord ? '<span class="ws-word">' + fmt(it.word, allowSyl) + '</span>' : '') + '</div><div class="ws-line"></div>';
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
      '<body class="ws-density-' + wsEsc(model.density || 'standard') + '">',
      '<p class="ws-noprint">Print from your browser menu (Ctrl+P or Cmd+P). Keep the scale at 100%.</p>',
      '<header class="ws-header">',
      '<h1 class="ws-title">' + wsEsc(model.title) + '</h1>',
      wsSubtitleHtml(model.subtitle),
      wsHeaderMetaHtml(model.headerFields),
      '</header>',
      sectionsHtml || '<p>No worksheet items are available yet.</p>',
      creditsHtml,
      keyHtml,
      wsTemplateScriptTag('word-sounds', model, {
        pictures: model.picturesOn,
        answerKey: model.answerKeyOn,
        hints: model.hintsOn,
        syllables: model.syllablesOn
      }),
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
    '.vocab-pic-line{width:100%;height:24px;border-bottom:1.5px solid #000000}',
    'body.ws-density-compact .vocab-match-word,body.ws-density-compact .vocab-match-def{padding:5px 0;font-size:12.5px}',
    'body.ws-density-compact .vocab-cloze-text{font-size:13px}',
    'body.ws-density-compact .vocab-pic-img{width:64px;height:64px}',
    'body.ws-density-primary .vocab-match-word,body.ws-density-primary .vocab-match-def{padding:11px 0;font-size:17px}',
    'body.ws-density-primary .vocab-cloze-text{font-size:18px;line-height:1.75}',
    'body.ws-density-primary .vocab-pic-line{height:38px}'
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
  // ---------------------------------------------------------------------------
  // CTOPP-2-style Word Sounds Worksheet Audio Companion (Plan + Offline HTML)
  // ---------------------------------------------------------------------------
  function wsAudioSafeUri(raw) {
    var s = String(raw == null ? '' : raw).trim();
    return /^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(s) ? s : '';
  }
  function wsAudioResolveClip(id, audioMap) {
    if (!id || !audioMap || typeof audioMap !== 'object') return '';
    var key = String(id).trim();
    if (!key) return '';
    var val = audioMap[key];
    if (typeof val === 'string' && wsAudioSafeUri(val)) return key;
    return '';
  }
  function wsAudioItemSpec(act, it, secLabel, numInSection, audioMap) {
    var raw = it && it.item && typeof it.item === 'object' ? it.item : {};
    var promptClips = [];
    var mainClips = [];
    var choiceClips = [];
    var segmented = false;
    var addClip = function (arr, id) {
      var k = wsAudioResolveClip(id, audioMap);
      if (k) arr.push(k);
    };
    if (act === 'blending') {
      addClip(promptClips, raw.promptAudio);
      if (Array.isArray(raw.sounds) && raw.sounds.length) {
        raw.sounds.forEach(function (cid) { addClip(mainClips, cid); });
        segmented = mainClips.length > 1;
      }
      if (!mainClips.length) addClip(mainClips, raw.wordAudio);
    } else if (act === 'syllable_blending') {
      addClip(promptClips, raw.promptAudio);
      var sClips = Array.isArray(raw.clips) && raw.clips.length
        ? raw.clips
        : (Array.isArray(raw.units) ? raw.units.map(function (u) { return u && u.audio; }) : []);
      sClips.forEach(function (cid) { addClip(mainClips, cid); });
      segmented = mainClips.length > 1;
      if (!mainClips.length) addClip(mainClips, raw.wordAudio);
    } else if (act === 'manipulation') {
      if (Array.isArray(raw.instruction) && raw.instruction.length) {
        raw.instruction.forEach(function (cid) { addClip(mainClips, cid); });
      }
      if (!mainClips.length) {
        addClip(promptClips, raw.promptAudio);
        addClip(mainClips, raw.wordAudio);
      }
    } else if (act === 'letter_tracing') {
      if (Array.isArray(raw.introAudio) && raw.introAudio.length) {
        raw.introAudio.forEach(function (cid) { addClip(mainClips, cid); });
      } else {
        addClip(promptClips, raw.promptAudio);
        addClip(mainClips, raw.letterAudio);
        addClip(mainClips, raw.wordAudio);
      }
    } else if (act === 'rhyming') {
      addClip(promptClips, raw.promptAudio);
      addClip(mainClips, raw.wordAudio);
      if (Array.isArray(raw.choices)) {
        raw.choices.forEach(function (c) { addClip(choiceClips, c && c.audio); });
      }
    } else {
      addClip(promptClips, raw.promptAudio);
      addClip(mainClips, raw.wordAudio);
      if (!mainClips.length && Array.isArray(raw.introAudio)) {
        raw.introAudio.forEach(function (cid) { addClip(mainClips, cid); });
      }
    }
    var script = '';
    if (act === 'blending' && it.sounds && it.sounds.length) {
      script = 'Say the sounds with a pause: ' + it.sounds.map(wsSoundLabel).join(' ... ');
    } else if (act === 'syllable_blending' && it.syllables && it.syllables.length) {
      script = 'Say the syllables with a pause: ' + it.syllables.join(' ... ');
    } else if (act === 'manipulation' && it.prompt) {
      script = it.prompt;
    } else if (act === 'isolation') {
      script = 'Listen for the ' + (it.positionName || 'target') + ' sound in "' + it.word + '".';
    } else if (act === 'letter_tracing') {
      script = 'Trace ' + (it.parts || []).map(function (p) { return p.letter; }).join(' and ') + ' for "' + it.word + '".';
    } else if (act === 'orthography' || act === 'spelling_bee') {
      script = 'Listen and write spelling word #' + numInSection + '.';
    } else if (act === 'rhyming' && it.choices && it.choices.length) {
      script = 'Word: "' + it.word + '". Choices: ' + it.choices.join(', ') + '.';
    } else {
      script = 'Word: "' + it.word + '".';
    }
    if (it && it.customPrompt) {
      script = String(it.customPrompt);
    }
    return {
      numInSection: numInSection,
      sectionLabel: secLabel,
      activity: act,
      word: String(it.word || ''),
      script: script,
      answer: wsKeyEntryText(act, it),
      promptClips: promptClips,
      mainClips: mainClips,
      choiceClips: choiceClips,
      segmented: segmented,
      hasAudio: (promptClips.length + mainClips.length + choiceClips.length) > 0
    };
  }
  function buildWordSoundsAudioPlan(lessonOrState, options) {
    var src = lessonOrState && typeof lessonOrState === 'object' ? lessonOrState : {};
    var lesson = src.lesson && typeof src.lesson === 'object' ? src.lesson : (Array.isArray(src.blocks) ? src : null);
    var audioMap = src.audio || (lesson && lesson.audio) || {};
    var model = normalizeWorksheetModel(lessonOrState, options);
    var sections = [];
    var flat = [];
    var usedAudio = Object.create(null);
    var rememberClips = function (arr) {
      (arr || []).forEach(function (cid) {
        if (cid && !usedAudio[cid] && wsAudioSafeUri(audioMap[cid])) usedAudio[cid] = audioMap[cid];
      });
    };
    model.sections.forEach(function (sec) {
      var secItems = [];
      if (sec.activity === 'sound_sort') {
        var boards = buildSoundSortBoards(sec.items);
        var chipAudioByWord = Object.create(null);
        sec.items.forEach(function (it) {
          var raw = it && it.item && typeof it.item === 'object' ? it.item : {};
          if (raw.wordAudio && it.word) chipAudioByWord[String(it.word).toLowerCase()] = raw.wordAudio;
          (raw.chips || []).forEach(function (c) {
            if (c && c.text && c.audio) chipAudioByWord[String(c.text).toLowerCase()] = c.audio;
          });
        });
        boards.forEach(function (b, bIdx) {
          var clips = [];
          b.bank.forEach(function (w) {
            var k = wsAudioResolveClip(chipAudioByWord[String(w).toLowerCase()], audioMap);
            if (k) clips.push(k);
          });
          var entry = {
            index: flat.length,
            numInSection: bIdx + 1,
            sectionLabel: sec.label,
            activity: sec.activity,
            word: 'Sort board ' + (bIdx + 1),
            script: 'Word bank: ' + b.bank.join(', '),
            answer: b.columns.map(function (c) { return c.heading + ': ' + (c.words.join(', ') || '(none)'); }).join(' | '),
            promptClips: [],
            mainClips: clips,
            choiceClips: [],
            segmented: clips.length > 1,
            hasAudio: clips.length > 0
          };
          rememberClips(clips);
          secItems.push(entry);
          flat.push(entry);
        });
      } else {
        sec.items.forEach(function (it, idx) {
          var spec = wsAudioItemSpec(sec.activity, it, sec.label, idx + 1, audioMap);
          spec.index = flat.length;
          rememberClips(spec.promptClips);
          rememberClips(spec.mainClips);
          rememberClips(spec.choiceClips);
          secItems.push(spec);
          flat.push(spec);
        });
      }
      if (secItems.length) {
        var isScored = sec.activity !== 'letter_tracing';
        secItems.forEach(function (it) { it.scored = isScored; });
        sections.push({
          activity: sec.activity,
          label: sec.label,
          directions: sec.directions,
          scored: isScored,
          items: secItems
        });
      }
    });
    return {
      kind: 'word-sounds',
      title: model.title,
      sections: sections,
      items: flat,
      audio: usedAudio,
      clipCount: Object.keys(usedAudio).length,
      hasSoundGap: true,
      hasDirections: true
    };
  }
  function wsAudioNormText(text) {
    return String(text == null ? '' : text).replace(/\s+/g, ' ').trim().toLowerCase();
  }
  function wsAudioExtractUri(val) {
    if (typeof val === 'string') return wsAudioSafeUri(val);
    if (val && typeof val === 'object') return wsAudioSafeUri(val.uri || val.dataUri || val.src || '');
    return '';
  }
  function buildVocabAudioPlan(rawState, options) {
    var src = Array.isArray(rawState) ? { entries: rawState } : (rawState && typeof rawState === 'object' ? rawState : {});
    var model = normalizeVocabWorksheetModel(src, options);
    var wordMap = Object.create(null);
    var meaningMap = Object.create(null);
    var addWordMap = function (obj) {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(function (k) {
        var uri = wsAudioExtractUri(obj[k]);
        if (uri) wordMap[wsAudioNormText(k)] = uri;
      });
    };
    var addMeaningMap = function (obj) {
      if (!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(function (k) {
        var uri = wsAudioExtractUri(obj[k]);
        if (uri) meaningMap[wsAudioNormText(k)] = uri;
      });
    };
    addWordMap(src.clips);
    addWordMap(src.wordClips);
    addMeaningMap(src.meaningClips);
    var lesson = src.lesson && typeof src.lesson === 'object' ? src.lesson : null;
    if (lesson && lesson.audio && typeof lesson.audio === 'object') {
      var lAudio = lesson.audio;
      (lesson.blocks || []).forEach(function (blk) {
        (blk && blk.items || []).forEach(function (it) {
          if (!it || typeof it !== 'object') return;
          var wKey = wsAudioNormText(it.word || it.target || '');
          var wClipId = it.wordAudio || it.audio || '';
          if (wKey && wClipId && lAudio[wClipId] && !wordMap[wKey]) {
            var wu = wsAudioExtractUri(lAudio[wClipId]);
            if (wu) wordMap[wKey] = wu;
          }
          if (it.prompt && it.promptAudio && lAudio[it.promptAudio]) {
            var pu = wsAudioExtractUri(lAudio[it.promptAudio]);
            if (pu && !meaningMap[wsAudioNormText(it.prompt)]) meaningMap[wsAudioNormText(it.prompt)] = pu;
          }
          (it.choices || it.options || []).forEach(function (ch) {
            if (!ch || typeof ch !== 'object') return;
            var ct = wsAudioNormText(ch.text || ch.label || '');
            var ca = ch.audio && lAudio[ch.audio] ? wsAudioExtractUri(lAudio[ch.audio]) : '';
            if (ct && ca) {
              if (String(ch.audio).charAt(0) === 'm') { if (!meaningMap[ct]) meaningMap[ct] = ca; }
              else if (!wordMap[ct]) wordMap[ct] = ca;
            }
          });
        });
      });
    }
    var usedAudio = Object.create(null);
    var clipSeq = 0;
    var clipKeyByUri = Object.create(null);
    var regClip = function (prefix, uri) {
      var safe = wsAudioSafeUri(uri);
      if (!safe) return '';
      if (clipKeyByUri[safe]) return clipKeyByUri[safe];
      var cid = prefix + '_' + (++clipSeq);
      usedAudio[cid] = safe;
      clipKeyByUri[safe] = cid;
      return cid;
    };
    var sections = [];
    var flat = [];
    var pushSection = function (activity, label, directions, scored, list) {
      if (!list.length) return;
      sections.push({ activity: activity, label: label, directions: directions, scored: !!scored, items: list });
    };

    // Part 1 — Match the Word to Its Meaning (or Write Each Meaning)
    var hp = model.hiddenParts || Object.create(null);
    var ov = model.sectionOverrides || Object.create(null);
    var p1Items = [];
    if (!hp.matching && model.matchWords.length) {
      var p1CopyA = wsApplySectionCopy(ov, 'matching', null, 'Part 1 \u2014 Vocabulary Words', 'Play each vocabulary word while students match it to the lettered meaning.');
      model.matchWords.forEach(function (it) {
        var cid = regClip('vw', wordMap[wsAudioNormText(it.word)] || '');
        var entry = {
          index: flat.length,
          numInSection: it.num,
          sectionLabel: p1CopyA.heading,
          activity: 'vocab_matching',
          word: it.word,
          script: 'Word #' + it.num + ': "' + it.word + '"',
          answer: it.answerLetter + ' (' + it.meaning + ')',
          promptClips: [],
          mainClips: cid ? [cid] : [],
          choiceClips: [],
          segmented: false,
          scored: true,
          hasAudio: !!cid
        };
        p1Items.push(entry);
        flat.push(entry);
      });
      pushSection('vocab_matching', p1CopyA.heading, p1CopyA.directions, true, p1Items);
    } else if (!hp.matching && model.entries.length) {
      var p1CopyB = wsApplySectionCopy(ov, 'matching', null, 'Part 1 \u2014 Vocabulary Words', 'Play each vocabulary word while students write its meaning.');
      model.entries.forEach(function (e, idx) {
        var cid = regClip('vw', wordMap[wsAudioNormText(e.word)] || '');
        var entry = {
          index: flat.length,
          numInSection: idx + 1,
          sectionLabel: p1CopyB.heading,
          activity: 'vocab_matching',
          word: e.word,
          script: 'Word #' + (idx + 1) + ': "' + e.word + '"',
          answer: 'Teacher-checked meaning',
          promptClips: [],
          mainClips: cid ? [cid] : [],
          choiceClips: [],
          segmented: false,
          scored: true,
          hasAudio: !!cid
        };
        p1Items.push(entry);
        flat.push(entry);
      });
      pushSection('vocab_matching', p1CopyB.heading, p1CopyB.directions, true, p1Items);
    }

    // Part 1B — Meanings Read-Aloud (A-Z) whenever meaning recordings exist
    var defClips = hp.matching ? [] : model.matchDefs.map(function (d) {
      return { def: d, cid: regClip('vm', meaningMap[wsAudioNormText(d.meaning)] || '') };
    });
    if (defClips.some(function (x) { return !!x.cid; })) {
      var p1bItems = [];
      defClips.forEach(function (x, idx) {
        var entry = {
          index: flat.length,
          numInSection: idx + 1,
          numLabel: x.def.letter,
          sectionLabel: 'Part 1B \u2014 Meanings Read-Aloud',
          activity: 'vocab_meanings',
          word: 'Meaning ' + x.def.letter,
          script: x.def.letter + '. ' + x.def.meaning,
          answer: 'Read-aloud reference (' + x.def.letter + ')',
          promptClips: [],
          mainClips: x.cid ? [x.cid] : [],
          choiceClips: [],
          segmented: false,
          scored: false,
          hasAudio: !!x.cid
        };
        p1bItems.push(entry);
        flat.push(entry);
      });
      pushSection('vocab_meanings', 'Part 1B \u2014 Meanings Read-Aloud', 'Play each lettered definition (A, B, C...) aloud to support matching on paper.', false, p1bItems);
    }

    // Word Bank Read-Aloud (segmented with configurable pause)
    if (model.wordBankOn && model.wordBank.length) {
      var bankCids = [];
      model.wordBank.forEach(function (w) {
        var cid = regClip('vw', wordMap[wsAudioNormText(w)] || '');
        if (cid) bankCids.push(cid);
      });
      if (bankCids.length) {
        var wbEntry = {
          index: flat.length,
          numInSection: 1,
          sectionLabel: 'Word Bank Read-Aloud',
          activity: 'vocab_bank',
          word: 'Word Bank',
          script: 'Word Bank: ' + model.wordBank.join(' \u00b7 '),
          answer: 'Reference word bank',
          promptClips: [],
          mainClips: bankCids,
          choiceClips: [],
          segmented: bankCids.length > 1,
          scored: false,
          hasAudio: true
        };
        flat.push(wbEntry);
        pushSection('vocab_bank', 'Word Bank Read-Aloud', 'Play the Word Bank aloud before students complete Part 2.', false, [wbEntry]);
      }
    }

    // Part 2 — Fill in the Blank (never leaks the blanked answer word in script)
    if (!hp.cloze && model.clozeItems.length) {
      var p2Copy = wsApplySectionCopy(ov, 'cloze', null, 'Part 2 \u2014 Fill in the Blank', 'Read each blanked sentence aloud while students write the vocabulary word.');
      var p2Items = [];
      model.clozeItems.forEach(function (it) {
        var scriptText = it.hasCloze
          ? (it.before + '_____' + it.after)
          : it.prompt;
        var entry = {
          index: flat.length,
          numInSection: it.num,
          sectionLabel: p2Copy.heading,
          activity: 'vocab_cloze',
          word: 'Sentence #' + it.num,
          script: scriptText,
          answer: it.hasCloze ? (it.answer + ' \u2014 "' + it.completed + '"') : ('Sentence using "' + it.word + '"'),
          promptClips: [],
          mainClips: [],
          choiceClips: [],
          segmented: false,
          scored: true,
          hasAudio: false
        };
        p2Items.push(entry);
        flat.push(entry);
      });
      pushSection('vocab_cloze', p2Copy.heading, p2Copy.directions, true, p2Items);
    }

    // Part 3 — Name the Picture
    if (!hp.pictures && model.pictureItems.length) {
      var p3Copy = wsApplySectionCopy(ov, 'pictures', null, 'Part 3 \u2014 Name the Picture', 'Students look at each numbered picture and write the matching vocabulary word.');
      var p3Items = [];
      model.pictureItems.forEach(function (it, idx) {
        var entry = {
          index: flat.length,
          numInSection: idx + 1,
          sectionLabel: p3Copy.heading,
          activity: 'vocab_pictures',
          word: 'Picture #' + (idx + 1),
          script: 'Picture #' + (idx + 1) + ' \u2014 look at the picture and write the matching word.',
          answer: it.word,
          promptClips: [],
          mainClips: [],
          choiceClips: [],
          segmented: false,
          scored: true,
          hasAudio: false
        };
        p3Items.push(entry);
        flat.push(entry);
      });
      pushSection('vocab_pictures', p3Copy.heading, p3Copy.directions, true, p3Items);
    }

    return {
      kind: 'vocab',
      title: model.title,
      sections: sections,
      items: flat,
      audio: usedAudio,
      clipCount: Object.keys(usedAudio).length,
      hasSoundGap: true,
      hasDirections: false
    };
  }
  function buildReadAlongAudioPlan(rawState, options) {
    var src = rawState && typeof rawState === 'object' ? rawState : {};
    var opts = options && typeof options === 'object' ? options : {};
    var rawTitle = String(opts.title || src.title || 'Read along').replace(/\s+/g, ' ').trim() || 'Read along';
    var custom = wsExtractCustom(src, opts, rawTitle);
    var title = custom.title;
    var hp = custom.hiddenParts || Object.create(null);
    var ov = custom.sectionOverrides || Object.create(null);
    var hi = custom.hiddenItems || Object.create(null);
    var showSupports = opts.showSupports !== undefined ? !!opts.showSupports : (src.showSupports !== undefined ? !!src.showSupports : true);
    var sentences = Array.isArray(src.sentences) ? src.sentences : [];
    var clips = src.clips && typeof src.clips === 'object' ? src.clips : {};
    var clipByNorm = Object.create(null);
    Object.keys(clips).forEach(function (k) {
      var uri = wsAudioExtractUri(clips[k]);
      if (uri) clipByNorm[wsAudioNormText(k)] = uri;
    });
    var usedAudio = Object.create(null);
    var clipSeq = 0;
    var clipKeyByUri = Object.create(null);
    var regClip = function (prefix, uri) {
      var safe = wsAudioSafeUri(uri);
      if (!safe) return '';
      if (clipKeyByUri[safe]) return clipKeyByUri[safe];
      var cid = prefix + '_' + (++clipSeq);
      usedAudio[cid] = safe;
      clipKeyByUri[safe] = cid;
      return cid;
    };
    var sections = [];
    var flat = [];

    // Part 1 — Passage Read-Aloud (sentence by sentence)
    var p1Items = [];
    var sentNum = 0;
    var p1Copy = wsApplySectionCopy(ov, 'passage', null, 'Part 1 \u2014 Passage Read-Aloud', 'Play one sentence at a time while students follow along or echo-read on paper.');
    if (!hp.passage) {
      sentences.forEach(function (row, idx) {
        var txt = typeof row === 'string' ? row : (row && typeof row.text === 'string' ? row.text : '');
        txt = txt.replace(/\s+/g, ' ').trim();
        if (!txt) return;
        sentNum++;
        var rawKey = row && typeof row.key === 'string' ? row.key : '';
        var uri = (rawKey && wsAudioExtractUri(clips[rawKey]))
          || wsAudioExtractUri(clips[txt])
          || clipByNorm[wsAudioNormText(txt)]
          || wsAudioExtractUri(clips[String(idx)])
          || (row && wsAudioExtractUri(row.audio || row.audioUri || row.clip))
          || '';
        var cid = regClip('ra', uri);
        var entry = {
          index: flat.length,
          numInSection: sentNum,
          sectionLabel: p1Copy.heading,
          activity: 'read_along_passage',
          word: 'Sentence #' + sentNum,
          script: txt,
          answer: 'Read-aloud follow-along',
          promptClips: [],
          mainClips: cid ? [cid] : [],
          choiceClips: [],
          segmented: false,
          scored: false,
          hasAudio: !!cid
        };
        p1Items.push(entry);
        flat.push(entry);
      });
    }
    if (p1Items.length) {
      sections.push({
        activity: 'read_along_passage',
        label: p1Copy.heading,
        directions: p1Copy.directions,
        scored: false,
        items: p1Items
      });
    }

    // Part 2 — Reading Notes & Visual Supports (when present)
    var sups = (Array.isArray(src.customSupports) ? src.customSupports : []).filter(function (s) {
      return s && typeof s === 'object' && String(s.text || '').trim();
    });
    if (!hp.supports && showSupports && sups.length) {
      var p2Copy = wsApplySectionCopy(ov, 'supports', null, 'Part 2 \u2014 Reading Notes', 'Play or read aloud each note anchored to the passage.');
      var p2Items = [];
      sups.forEach(function (sup, idx) {
        var cid = regClip('ras', sup.audioUri || sup.audio || '');
        var label = sup.quote
          ? String(sup.quote).trim() + (sup.line != null ? ' (sentence ' + (Number(sup.line) + 1) + ')' : '')
          : (sup.line != null ? 'Sentence ' + (Number(sup.line) + 1) : 'Note #' + (idx + 1));
        var entry = {
          index: flat.length,
          numInSection: idx + 1,
          sectionLabel: p2Copy.heading,
          activity: 'read_along_supports',
          word: label,
          script: label + ': ' + String(sup.text || '').trim(),
          answer: 'Reading support note',
          promptClips: [],
          mainClips: cid ? [cid] : [],
          choiceClips: [],
          segmented: false,
          scored: false,
          hasAudio: !!cid
        };
        p2Items.push(entry);
        flat.push(entry);
      });
      sections.push({
        activity: 'read_along_supports',
        label: p2Copy.heading,
        directions: p2Copy.directions,
        scored: false,
        items: p2Items
      });
    }

    // Part 3 — Check Your Understanding (matches printed worksheet Part 4)
    var allQs = (Array.isArray(src.questions) ? src.questions : []).filter(function (q) {
      return q && typeof q === 'object' && String(q.prompt || '').trim();
    }).map(function (q, origIdx) {
      var itemKey = 'writing:' + origIdx;
      var ovPrompt = wsItemTextOverride(custom.itemTextOverrides, itemKey, 'q:' + origIdx);
      return Object.assign({}, q, {
        origIndex: origIdx,
        itemKey: itemKey,
        prompt: ovPrompt || String(q.prompt || '').trim()
      });
    });
    var qs = wsApplyItemOrder(allQs, custom.itemOrder, 'writing', 'questions').filter(function (q) {
      return !wsIsItemHidden(hi, 'writing', q.origIndex, 'q');
    });
    if (!hp.writing && qs.length) {
      var p3Copy = wsApplySectionCopy(ov, 'writing', null, 'Part 3 \u2014 Check Your Understanding', 'Read each comprehension question aloud while students answer on their worksheet.');
      var p3Items = [];
      qs.forEach(function (q, idx) {
        var cid = regClip('raq', q.audioUri || q.audio || '');
        var isMc = q.kind === 'mc' && Array.isArray(q.choices) && q.choices.length > 0;
        var scriptText = String(q.prompt || '').trim();
        var ansText = 'Open response (teacher-checked)';
        if (isMc) {
          var ansIdx = (typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.choices.length) ? q.answer : 0;
          scriptText += ' Choices: ' + q.choices.map(function (c, ci) { return vocabLetterLabel(ci) + '. ' + c; }).join(' | ');
          ansText = vocabLetterLabel(ansIdx) + ' \u2014 ' + q.choices[ansIdx];
        }
        var entry = {
          index: flat.length,
          numInSection: idx + 1,
          sectionLabel: p3Copy.heading,
          activity: 'read_along_questions',
          word: 'Question #' + (idx + 1),
          script: scriptText,
          answer: ansText,
          promptClips: [],
          mainClips: cid ? [cid] : [],
          choiceClips: [],
          segmented: false,
          scored: true,
          hasAudio: !!cid
        };
        p3Items.push(entry);
        flat.push(entry);
      });
      sections.push({
        activity: 'read_along_questions',
        label: p3Copy.heading,
        directions: p3Copy.directions,
        scored: true,
        items: p3Items
      });
    }

    return {
      kind: 'read-along',
      title: title,
      sections: sections,
      items: flat,
      audio: usedAudio,
      clipCount: Object.keys(usedAudio).length,
      hasSoundGap: false,
      hasDirections: false
    };
  }
  function wsAudioCsvCell(value) {
    var s = String(value == null ? '' : value);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function wsAudioTodayIso() {
    try {
      var d = new Date();
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1);
      var day = String(d.getDate());
      return y + '-' + (m.length < 2 ? '0' + m : m) + '-' + (day.length < 2 ? '0' + day : day);
    } catch (_) {
      return '';
    }
  }
  function wsAudioSetupSummary(plan, opts) {
    var p = plan && typeof plan === 'object' ? plan : {};
    var o = opts && typeof opts === 'object' ? opts : {};
    var parts = [
      'Speed: ' + (o.slow ? 'Slow (0.8x)' : 'Standard (1.0x)'),
      'Response pause: ' + (Number(o.autoSec) > 0 ? (Number(o.autoSec) + 's auto-advance') : 'Manual')
    ];
    if (p.hasSoundGap) parts.push('Sound gap: ' + ((Number(o.gapMs) || 700) / 1000).toFixed(1) + 's');
    if (p.hasDirections) {
      parts.push('Directions: ' + (o.dirMode === 'every' ? 'Every item' : (o.dirMode === 'none' ? 'Words / sounds only' : 'First item per section')));
    }
    return parts.join(' \u00b7 ');
  }
  function buildAudioScoresCsv(plan, scoreState, options) {
    var p = plan && typeof plan === 'object' ? plan : { title: 'Worksheet', sections: [], items: [] };
    var st = scoreState && typeof scoreState === 'object' ? scoreState : {};
    var stItems = st.items && typeof st.items === 'object' ? st.items : {};
    var student = String(st.studentName || '').trim();
    var examiner = String(st.examiner || '').trim();
    var dateStr = String(st.date || '').trim() || wsAudioTodayIso();
    var setupStr = wsAudioSetupSummary(p, options);
    var rows = [
      ['Student', 'Date', 'Examiner', 'Section', 'Item', 'Prompt', 'Expected Answer', 'Scored', 'Score', 'Repeats', 'Notes', 'Audio Setup']
    ];
    var totalScored = 0, totalCorrect = 0, totalMarked = 0, totalRepeats = 0, rowIdx = 0;
    (p.sections || []).forEach(function (sec) {
      var scored = sec.scored !== false;
      (sec.items || []).forEach(function (it) {
        var key = it && it.index != null ? String(it.index) : String(rowIdx);
        var rec = stItems[key] || stItems[String(rowIdx)] || {};
        rowIdx++;
        var tag = it && it.numLabel ? String(it.numLabel) : String(it && it.numInSection != null ? it.numInSection : rowIdx);
        var scoreOut = '';
        if (scored) {
          totalScored++;
          if (rec.score === 1 || rec.score === 0) {
            scoreOut = String(rec.score);
            totalMarked++;
            if (rec.score === 1) totalCorrect++;
          }
        } else if (rec.done || rec.score === 1) {
          scoreOut = 'Done';
        }
        var reps = Number(rec.repeats) > 0 ? Math.floor(Number(rec.repeats)) : 0;
        totalRepeats += reps;
        rows.push([
          student,
          dateStr,
          examiner,
          sec.label || '',
          tag,
          (it && it.script) || '',
          scored ? ((it && it.answer) || '') : '',
          scored ? 'Yes' : 'Practice only',
          scoreOut,
          reps > 0 ? String(reps) : '0',
          rec.note ? String(rec.note).trim() : '',
          setupStr
        ]);
      });
    });
    var pctStr = totalScored > 0 && totalMarked > 0 ? (Math.round((totalCorrect / totalScored) * 100) + '%') : '';
    rows.push([
      student,
      dateStr,
      examiner,
      'SUMMARY',
      totalScored > 0 ? (totalMarked + '/' + totalScored + ' scored') : 'Unscored',
      String(p.title || 'Worksheet'),
      pctStr,
      totalScored > 0 ? 'Total' : 'Practice only',
      totalScored > 0 && totalMarked > 0 ? (totalCorrect + '/' + totalScored) : '',
      String(totalRepeats),
      st.notes ? String(st.notes).trim() : '',
      setupStr
    ]);
    return '\uFEFF' + rows.map(function (cols) {
      return cols.map(wsAudioCsvCell).join(',');
    }).join('\r\n') + '\r\n';
  }
  function wsAudioResultsActivityId(rawAct, kind) {
    var a = String(rawAct || '').trim();
    if (a === 'vocab_matching' || a === 'vocab_meanings' || a === 'vocab_bank') return 'vocab_meaning';
    if (a === 'vocab_cloze') return 'vocab_blank';
    if (a === 'vocab_pictures') return 'vocab_picture';
    if (a.indexOf('ra_') === 0 || kind === 'read-along') return 'read_along';
    return a || (kind === 'vocab' ? 'vocab_meaning' : 'isolation');
  }
  function buildAudioResultsJson(plan, scoreState, options) {
    var p = plan && typeof plan === 'object' ? plan : { title: 'Worksheet', kind: 'word-sounds', sections: [], items: [] };
    var st = scoreState && typeof scoreState === 'object' ? scoreState : {};
    var stItems = st.items && typeof st.items === 'object' ? st.items : {};
    var o = options && typeof options === 'object' ? options : {};
    var title = String(p.title || 'Worksheet').trim() || 'Worksheet';
    var kind = String(p.kind || 'word-sounds').trim() || 'word-sounds';
    var slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'worksheet';
    var nowIso = '';
    try { nowIso = new Date().toISOString(); } catch (_) { nowIso = wsAudioTodayIso() + 'T12:00:00.000Z'; }
    var datePart = String(st.date || '').trim() || wsAudioTodayIso();
    var localStamp = datePart ? (datePart + 'T12:00:00') : nowIso.slice(0, 19);
    var student = String(st.studentName || '').trim() || 'Student';
    var examiner = String(st.examiner || '').trim();
    var activityTitles = Object.create(null);
    var outItems = [];
    var rowIdx = 0;

    (p.sections || []).forEach(function (sec) {
      var isScored = sec.scored !== false;
      var mappedAct = wsAudioResultsActivityId(sec.activity, kind);
      if (sec.label && !activityTitles[mappedAct]) activityTitles[mappedAct] = String(sec.label);
      (sec.items || []).forEach(function (it) {
        var key = it && it.index != null ? String(it.index) : String(rowIdx);
        var rec = stItems[key] || stItems[String(rowIdx)] || {};
        rowIdx++;
        var val = isScored && (rec.score === 1 || rec.score === 0) ? rec.score : null;
        var reps = Number(rec.repeats) > 0 ? Math.floor(Number(rec.repeats)) : 0;
        var noteTxt = rec.note ? String(rec.note).trim() : '';
        var attempted = isScored ? (val !== null) : !!(rec.done || rec.score === 1);
        var itemWord = String((it && (it.word || it.numLabel)) || ('#' + (it && it.numInSection != null ? it.numInSection : rowIdx)));
        var itemTarget = String((it && it.answer) || '');
        outItems.push({
          n: rowIdx,
          itemId: 'ws-audio-' + rowIdx,
          activity: mappedAct,
          word: itemWord,
          target: itemTarget,
          responses: attempted ? [val === 1 ? (itemTarget || 'correct') : (noteTxt || 'incorrect')] : [],
          correct: val === 1,
          firstTry: val === 1 && reps === 0,
          attempts: attempted ? (1 + reps) : 0,
          scored: isScored,
          practice: !isScored,
          done: attempted,
          ms: 0,
          supports: {
            source: 'paper_audio',
            slow: o.slow ? '1' : '0',
            repeats: String(reps)
          },
          flag: noteTxt ? 'teacher_note' : ''
        });
      });
    });

    return {
      kind: 'alloflow-take-home-result',
      schemaVersion: 3,
      sessionId: 'ws-audio-' + slugBase + '-' + String(Date.now ? Date.now() : '1'),
      lessonId: 'ws-audio-' + slugBase,
      lessonTitle: title,
      packet: {
        id: 'worksheet-audio-' + kind + '-' + slugBase,
        version: '1',
        form: 'Paper+Audio',
        mode: 'practice',
        title: title
      },
      learner: student,
      examiner: examiner,
      audioSetup: wsAudioSetupSummary(p, o),
      notes: st.notes ? String(st.notes).trim() : '',
      startedLocal: localStamp,
      finishedLocal: localStamp,
      startedAt: nowIso,
      finishedAt: nowIso,
      durationMs: 0,
      activityTitles: activityTitles,
      items: outItems
    };
  }
  function buildAudioScoringSheetHtml(plan, options) {
    var p = plan && typeof plan === 'object' ? plan : { title: 'Worksheet', sections: [], items: [] };
    var o = options && typeof options === 'object' ? options : {};
    var title = String(p.title || 'Worksheet').trim() || 'Worksheet';
    var condParts = [];
    condParts.push('Speed: ' + (o.slow ? 'Slow (0.8x)' : 'Standard (1.0x)'));
    condParts.push('Response pause: ' + (Number(o.autoSec) > 0 ? (Number(o.autoSec) + 's auto-advance') : 'Manual'));
    if (p.hasSoundGap) condParts.push('Sound gap: ' + ((Number(o.gapMs) || 700) / 1000).toFixed(1) + 's');
    if (p.hasDirections) condParts.push('Directions: ' + (o.dirMode === 'every' ? 'Every item' : (o.dirMode === 'none' ? 'Words / sounds only' : 'First item per section')));

    var st = o.scoreState && typeof o.scoreState === 'object' ? o.scoreState : null;
    var stItems = st && st.items && typeof st.items === 'object' ? st.items : null;
    var stStudent = st && st.studentName ? String(st.studentName).trim() : '';
    var stDate = st && st.date ? String(st.date).trim() : '';
    var stExaminer = st && st.examiner ? String(st.examiner).trim() : '';
    var stNotes = st && st.notes ? String(st.notes).trim() : '';

    var totalScored = 0, totalCorrect = 0, totalMarked = 0, anyRepeats = false, gIdx = 0;
    var secHtml = (p.sections || []).map(function (sec) {
      var scored = sec.scored !== false;
      var items = sec.items || [];
      if (scored) totalScored += items.length;
      var secCorrect = 0, secMarked = 0;
      var headCols = scored
        ? '<th class="sc-col-num">#</th><th class="sc-col-prompt">Item / Audio Prompt</th><th class="sc-col-ans">Expected Answer</th><th class="sc-col-score">Score</th><th class="sc-col-rep">Rep.</th><th class="sc-col-notes">Notes / Error Pattern</th>'
        : '<th class="sc-col-num">#</th><th class="sc-col-prompt">Item / Audio Prompt</th><th class="sc-col-done">Done</th><th class="sc-col-notes">Notes</th>';
      var rowsHtml = items.map(function (it) {
        var k = it && it.index != null ? String(it.index) : String(gIdx);
        var rec = stItems ? (stItems[k] || stItems[String(gIdx)] || null) : null;
        gIdx++;
        var tag = it.numLabel ? String(it.numLabel) : String(it.numInSection);
        var reps = rec && Number(rec.repeats) > 0 ? Math.floor(Number(rec.repeats)) : 0;
        var noteTxt = rec && rec.note ? String(rec.note).trim() : '';
        if (reps > 0) anyRepeats = true;
        if (scored) {
          var val = rec && (rec.score === 1 || rec.score === 0) ? rec.score : null;
          if (val !== null) {
            secMarked++;
            totalMarked++;
            if (val === 1) { secCorrect++; totalCorrect++; }
          }
          return '<tr>'
            + '<td class="sc-num">' + wsEsc(tag) + '</td>'
            + '<td class="sc-prompt">' + wsEsc(it.script) + '</td>'
            + '<td class="sc-ans">' + wsEsc(it.answer) + '</td>'
            + '<td class="sc-score"><span class="sc-bub' + (val === 1 ? ' is-picked' : '') + '">1</span> <span class="sc-bub' + (val === 0 ? ' is-picked' : '') + '">0</span></td>'
            + '<td class="sc-rep">' + (reps > 0 ? wsEsc(String(reps)) : '') + '</td>'
            + '<td class="sc-notes">' + wsEsc(noteTxt) + '</td>'
            + '</tr>';
        }
        var isDone = !!(rec && (rec.done || rec.score === 1));
        return '<tr>'
          + '<td class="sc-num">' + wsEsc(tag) + '</td>'
          + '<td class="sc-prompt">' + wsEsc(it.script) + '</td>'
          + '<td class="sc-done"><span class="sc-box' + (isDone ? ' is-checked' : '') + '">' + (isDone ? '\u2713' : '') + '</span></td>'
          + '<td class="sc-notes">' + wsEsc(noteTxt) + '</td>'
          + '</tr>';
      }).join('');
      var subLine = scored
        ? '<p class="sc-sub">Section subtotal: '
          + (secMarked > 0 ? ('<strong>' + secCorrect + '</strong>') : '<span class="sc-blank-sm"></span>')
          + ' / ' + items.length
          + (secMarked > 0 ? (' (' + Math.round((secCorrect / Math.max(1, items.length)) * 100) + '%)') : '')
          + '</p>'
        : '<p class="sc-sub">Practice / listening only (not scored).</p>';
      return '<section class="sc-sec">'
        + '<h2>' + wsEsc(sec.label) + '</h2>'
        + '<table class="sc-tbl"><thead><tr>' + headCols + '</tr></thead><tbody>' + rowsHtml + '</tbody></table>'
        + subLine
        + '</section>';
    }).join('\n');

    var totalPct = totalScored > 0 ? Math.round((totalCorrect / totalScored) * 100) : 0;
    var slowChk = totalMarked > 0 && !!o.slow;
    var summaryHtml = '<section class="sc-summary">'
      + '<h2>Summary &amp; Observations</h2>'
      + (totalScored > 0
        ? '<p class="sc-total"><strong>Total scored:</strong> '
          + (totalMarked > 0 ? ('<strong>' + totalCorrect + '</strong>') : '<span class="sc-blank-md"></span>')
          + ' / ' + totalScored + ' &nbsp;&nbsp; <strong>Percent:</strong> '
          + (totalMarked > 0 ? ('<strong>' + totalPct + '</strong>') : '<span class="sc-blank-sm"></span>')
          + ' %</p>'
        : '<p class="sc-total"><strong>Completion:</strong> All items in this sheet are practice or listening only (unscored).</p>')
      + '<p class="sc-checks">'
      + '<span><span class="sc-box' + (slowChk ? ' is-checked' : '') + '">' + (slowChk ? '\u2713' : '') + '</span> Used slow playback (0.8x)</span>'
      + '<span><span class="sc-box"></span> Needed extra wait time</span>'
      + '<span><span class="sc-box' + (anyRepeats ? ' is-checked' : '') + '">' + (anyRepeats ? '\u2713' : '') + '</span> Repeated items</span>'
      + '<span><span class="sc-box"></span> Self-corrected</span>'
      + '<span><span class="sc-box"></span> Fatigue / took a break</span>'
      + '</p>'
      + '<p class="sc-focus-lbl">Next teaching focus / notes:</p>'
      + (stNotes ? ('<p class="sc-note-val">' + wsEsc(stNotes) + '</p><div class="sc-line"></div>') : '<div class="sc-line"></div><div class="sc-line"></div>')
      + '</section>';

    var css = [
      '@page{margin:12mm}',
      '*{box-sizing:border-box}',
      'body{margin:0;padding:14px;background:#ffffff;color:#000000;font:12pt/1.4 system-ui,-apple-system,"Segoe UI",Arial,sans-serif}',
      '.sc-noprint{margin:0 0 12px;padding:8px 10px;border:1px solid #000;font-size:10pt;background:#f5f5f5}',
      '@media print{body{padding:0}.sc-noprint{display:none!important}}',
      'header{border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px}',
      'h1{margin:0 0 6px;font-size:16pt;line-height:1.2}',
      '.sc-meta{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:10.5pt;margin-bottom:6px}',
      '.sc-meta-line{display:inline-block;min-width:110px;border-bottom:1px solid #000;padding:0 4px}',
      '.sc-cond{margin:0;font-size:9.5pt;color:#222}',
      '.sc-sec{margin:0 0 14px;break-inside:avoid-page}',
      '.sc-sec h2{margin:0 0 5px;font-size:12pt;border-bottom:1px solid #000;padding-bottom:2px}',
      '.sc-tbl{width:100%;border-collapse:collapse;font-size:10pt}',
      '.sc-tbl th,.sc-tbl td{border:1px solid #000;padding:4px 6px;vertical-align:top;text-align:left}',
      '.sc-tbl th{background:#f0f0f0;font-weight:700}',
      '.sc-tbl tr{break-inside:avoid;page-break-inside:avoid}',
      '.sc-col-num,.sc-num{width:28px;text-align:center;font-weight:700}',
      '.sc-col-score,.sc-score{width:64px;text-align:center;white-space:nowrap}',
      '.sc-col-rep,.sc-rep{width:38px;text-align:center}',
      '.sc-col-done,.sc-done{width:46px;text-align:center}',
      '.sc-col-notes,.sc-notes{width:24%}',
      '.sc-bub{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1.5px solid #000;border-radius:50%;font-size:9pt;font-weight:700}',
      '.sc-bub.is-picked{background:#000;color:#fff}',
      '.sc-box{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border:1.5px solid #000;vertical-align:-2px;margin-right:4px;font-size:9pt;font-weight:700;line-height:1}',
      '.sc-box.is-checked{background:#000;color:#fff}',
      '.sc-sub{margin:5px 0 0;font-size:10pt;font-weight:700;text-align:right}',
      '.sc-blank-sm{display:inline-block;width:36px;border-bottom:1.5px solid #000}',
      '.sc-blank-md{display:inline-block;width:54px;border-bottom:1.5px solid #000}',
      '.sc-summary{border:1.5px solid #000;padding:10px 12px;margin-top:12px;break-inside:avoid;page-break-inside:avoid}',
      '.sc-summary h2{margin:0 0 6px;font-size:12pt}',
      '.sc-total{margin:0 0 8px;font-size:10.5pt}',
      '.sc-checks{margin:0 0 10px;display:flex;flex-wrap:wrap;gap:6px 14px;font-size:9.5pt}',
      '.sc-focus-lbl{margin:0 0 4px;font-size:10pt;font-weight:700}',
      '.sc-note-val{margin:2px 0 6px;font-size:10pt}',
      '.sc-line{height:22px;border-bottom:1px solid #000;margin-bottom:4px}'
    ].join('');

    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
      + '<meta http-equiv="Content-Security-Policy" content="' + WS_CSP + '">\n'
      + '<meta name="referrer" content="no-referrer">\n'
      + '<title>' + wsEsc(title) + ' \u2014 Teacher Record &amp; Scoring Sheet</title>\n'
      + '<style>' + css + '</style>\n</head>\n<body>\n'
      + '<p class="sc-noprint">Teacher Record &amp; Scoring Sheet (for teacher eyes only). Print at 100% scale.</p>\n'
      + '<header><h1>' + wsEsc(title) + ' \u2014 Teacher Record &amp; Scoring Sheet</h1>'
      + '<div class="sc-meta"><span>Student / Code Name: <span class="sc-meta-line">' + wsEsc(stStudent) + '</span></span><span>Date: <span class="sc-meta-line">' + wsEsc(stDate) + '</span></span><span>Examiner: <span class="sc-meta-line">' + wsEsc(stExaminer) + '</span></span></div>'
      + '<p class="sc-cond">Audio setup: ' + wsEsc(condParts.join(' \u00b7 ')) + '</p></header>\n'
      + secHtml + '\n' + summaryHtml + '\n</body>\n</html>\n';
  }
  function buildWordSoundsScoringSheetHtml(lessonOrState, options) {
    return buildAudioScoringSheetHtml(buildWordSoundsAudioPlan(lessonOrState, options), options);
  }
  function buildVocabScoringSheetHtml(rawState, options) {
    return buildAudioScoringSheetHtml(buildVocabAudioPlan(rawState, options), options);
  }
  function buildReadAlongScoringSheetHtml(rawState, options) {
    return buildAudioScoringSheetHtml(buildReadAlongAudioPlan(rawState, options), options);
  }
  function buildAudioCompanionHtmlFromPlan(plan) {
    var p = plan && typeof plan === 'object' ? plan : { title: 'Worksheet', sections: [], items: [], audio: {} };
    var safeJson = function (obj) {
      return JSON.stringify(obj).replace(/<\//g, '<\\/').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    };
    var payload = {
      kind: p.kind || 'word-sounds',
      title: p.title,
      hasSoundGap: p.hasSoundGap !== false,
      hasDirections: !!p.hasDirections,
      sections: (p.sections || []).map(function (s) {
        return {
          activity: s.activity,
          label: s.label,
          directions: s.directions,
          scored: s.scored !== false,
          itemIndices: (s.items || []).map(function (i) { return i.index; })
        };
      }),
      items: p.items || [],
      audio: p.audio || {}
    };
    var css = [
      ':root{--bg:#f4f6fb;--surface:#ffffff;--ink:#181e2c;--muted:#4d5669;--accent:#3d3aa8;--on-accent:#ffffff;--accent-soft:#eef0ff;--line:#d5dbe7;--line-strong:#aeb8cc;--note:#eef1f8;--radius:12px}',
      '@media (prefers-color-scheme:dark){:root{--bg:#121722;--surface:#1b2232;--ink:#eef1f8;--muted:#b2bbd0;--accent:#a5a8ff;--on-accent:#111522;--accent-soft:#252a4a;--line:#323b52;--line-strong:#4b5775;--note:#20283b}}',
      '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}',
      'main{max-width:52rem;margin:0 auto;padding:1.25rem 1rem 3rem;display:flex;flex-direction:column;gap:1rem}',
      'header{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:0.75rem 1rem}',
      '.head-copy{flex:1 1 20rem;min-width:0}header h1{margin:0;font-size:clamp(1.4rem,1.2rem + 1vw,1.95rem)}header p{margin:0.35rem 0 0;color:var(--muted)}',
      '.card{background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius);padding:1.15rem}',
      '.stage{border:2px solid var(--accent);display:flex;flex-direction:column;gap:0.75rem}',
      '.meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.4rem 0.75rem}',
      '.badge{display:inline-flex;align-items:center;padding:0.2rem 0.65rem;border-radius:999px;background:var(--accent-soft);border:1px solid var(--accent);font-size:0.85rem;font-weight:700}',
      '.counter{font-weight:700;color:var(--muted);font-variant-numeric:tabular-nums}',
      '.item-title{margin:0;font-size:clamp(1.25rem,1.1rem + 0.8vw,1.6rem)}.script{margin:0;color:var(--muted)}',
      '.ans{margin:0;padding:0.55rem 0.8rem;border-radius:8px;background:var(--note);border-left:4px solid var(--accent);font-weight:600}.ans[hidden]{display:none}',
      '.row{display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}',
      'button{font:inherit;font-weight:600;min-height:44px;padding:0.45rem 0.9rem;border-radius:8px;border:1.5px solid var(--line-strong);background:var(--surface);color:var(--ink);cursor:pointer}',
      'button:hover:not(:disabled){border-color:var(--accent);background:var(--accent-soft)}button.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}',
      'button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}',
      'button:disabled{opacity:0.5;cursor:not-allowed}button:focus-visible,select:focus-visible,input:focus-visible{outline:3px solid var(--accent);outline-offset:2px}',
      '.head-acts{display:flex;flex-wrap:wrap;gap:0.5rem;align-items:center}',
      '.score-panel{border-top:1px solid var(--line);padding-top:0.75rem;display:flex;flex-direction:column;gap:0.55rem}',
      '.score-meta{display:flex;flex-wrap:wrap;gap:0.5rem 0.75rem;align-items:center}',
      '.score-meta input,.score-note{min-height:44px;padding:0.4rem 0.65rem;border-radius:8px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);font:inherit;font-size:0.92rem}',
      '.score-meta input{flex:1 1 9.5rem;min-width:0}.score-note{flex:1 1 14rem;min-width:0}',
      '.score-pill{display:inline-flex;align-items:center;padding:0.25rem 0.65rem;border-radius:999px;background:var(--note);border:1px solid var(--line-strong);font-size:0.86rem;font-weight:700;font-variant-numeric:tabular-nums}',
      '.score-tag{display:inline-flex;align-items:center;gap:0.35rem;font-size:0.82rem;font-weight:700;color:var(--accent);margin-top:0.15rem}.score-tag[hidden]{display:none}',
      '.bar{height:8px;border-radius:999px;background:var(--note);border:1px solid var(--line);overflow:hidden}.bar[hidden]{display:none}.bar span{display:block;height:100%;width:0%;background:var(--accent)}',
      '.status{margin:0;font-weight:600;min-height:1.4em}.keys{margin:0;font-size:0.88rem;color:var(--muted)}',
      '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));gap:0.75rem 1rem;align-items:end}',
      '.field{display:flex;flex-direction:column;gap:0.3rem}.field label{font-size:0.88rem;font-weight:700}',
      'select{width:100%;min-height:44px;padding:0.45rem 0.7rem;border-radius:8px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);font:inherit}',
      '.chks{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:0.4rem 1.5rem;align-items:center;padding-top:0.5rem;border-top:1px solid var(--line)}',
      '.chk{display:inline-flex;align-items:center;gap:0.5rem;min-height:44px;font-weight:600;cursor:pointer}.chk input{width:18px;height:18px;margin:0;accent-color:var(--accent)}',
      '.sec h2{margin:0 0 0.25rem;font-size:1.1rem}.sec p{margin:0 0 0.65rem;color:var(--muted);font-size:0.92rem}',
      '.list{list-style:none;margin:0;padding:0;display:grid;gap:0.45rem}',
      '.row-item{display:flex;flex-wrap:wrap;align-items:center;gap:0.5rem 0.75rem;padding:0.5rem 0.7rem;border:1.5px solid var(--line);border-radius:8px;background:var(--bg)}',
      '.row-item.is-active{border-color:var(--accent);background:var(--accent-soft)}.row-item.is-played .num{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}',
      '.num{flex:none;min-width:32px;height:32px;padding:0 6px;border-radius:999px;border:1.5px solid var(--line-strong);background:var(--surface);font-weight:700;display:inline-flex;align-items:center;justify-content:center}',
      '.body{flex:1 1 13rem;min-width:0}.lbl{display:block;font-weight:700}.sub{display:block;font-size:0.86rem;color:var(--muted)}.item-ans{display:block;font-size:0.86rem;font-weight:600;color:var(--accent)}.item-ans[hidden]{display:none}',
      '.print-record{display:none}',
      '@media print{@page{margin:12mm}body{background:#fff;color:#000;font-size:11pt}main{display:none!important}.print-record{display:block!important}.pr-head{border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:10px}.pr-head h1{margin:0 0 5px;font-size:15pt}.pr-meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:10pt;margin:0 0 4px}.pr-line{display:inline-block;min-width:105px;border-bottom:1px solid #000;padding:0 4px}.pr-cond{margin:0;font-size:9.5pt;color:#222}.pr-sec{margin:0 0 12px}.pr-sec h2{margin:0 0 4px;font-size:11.5pt;border-bottom:1px solid #000;padding-bottom:2px}.pr-tbl{width:100%;border-collapse:collapse;font-size:9.5pt}.pr-tbl th,.pr-tbl td{border:1px solid #000;padding:4px 5px;vertical-align:top;text-align:left}.pr-tbl th{background:#f0f0f0}.pr-tbl tr{break-inside:avoid;page-break-inside:avoid}.pr-num{width:28px;text-align:center;font-weight:700}.pr-sc{width:62px;text-align:center;white-space:nowrap}.pr-rep{width:34px;text-align:center}.pr-dn{width:42px;text-align:center}.pr-nt{width:24%}.pr-b{display:inline-flex;align-items:center;justify-content:center;width:19px;height:19px;border:1.5px solid #000;border-radius:50%;font-size:8.5pt;font-weight:700}.pr-b.is-picked{background:#000;color:#fff}.pr-bx{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border:1.5px solid #000;vertical-align:-2px;margin-right:4px;font-size:8.5pt;font-weight:700;line-height:1}.pr-bx.is-checked{background:#000;color:#fff}.pr-sub{margin:4px 0 0;font-size:9.5pt;font-weight:700;text-align:right}.pr-bs{display:inline-block;width:36px;border-bottom:1.5px solid #000}.pr-sum{border:1.5px solid #000;padding:9px 11px;margin-top:10px;break-inside:avoid}.pr-sum h2{margin:0 0 5px;font-size:11.5pt}.pr-obs{display:flex;flex-wrap:wrap;gap:5px 14px;font-size:9.5pt;margin:6px 0 8px}.pr-wl{height:20px;border-bottom:1px solid #000;margin-bottom:4px}}',
      '@media (forced-colors:active){.card,.row-item{border:2px solid CanvasText}.row-item.is-active{border-color:Highlight}}',
      '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'
    ].join('\n');
    var script = [
      '(function(){',
      '"use strict";',
      'var DATA=' + safeJson(payload) + ';',
      'var app=document.getElementById("app");',
      'var prHost=document.getElementById("print-record");',
      'var el=function(t,c,txt){var n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n;};',
      'var idx=0,runId=0,playing=false,curAudio=null,timer=null,raf=0,played={},showAns=false,slow=false,autoSec=0,gapMs=700,dirMode="section";',
      'var scoreMap={},studentName="",examinerName="";',
      'var recOf=function(i){var k=String(i);if(!scoreMap[k])scoreMap[k]={score:null,repeats:0,done:false,note:""};return scoreMap[k];};',
      'var tagOf=function(it){return it.numLabel?String(it.numLabel):"#"+it.numInSection;};',
      'var todayIso=function(){var d=new Date(),m=String(d.getMonth()+1),dy=String(d.getDate());return d.getFullYear()+"-"+(m.length<2?"0"+m:m)+"-"+(dy.length<2?"0"+dy:dy);};',
      'var csvCell=function(v){var s=String(v==null?"":v);if(/^[=+\\-@\\t\\r]/.test(s))s="\'"+s;return /[",\\r\\n]/.test(s)?"\\""+s.replace(/"/g,"\\"\\"")+"\\"":s;};',
      'var head=el("header","",null);var hc=el("div","head-copy");hc.appendChild(el("h1","",DATA.title+" \u2014 Worksheet Audio Player"));',
      'hc.appendChild(el("p","","Offline teacher play-along companion with live scoring. Matches the printed worksheet item numbers 1-to-1. Works with no internet."));',
      'head.appendChild(hc);var ha=el("div","head-acts");var bRes=el("button","","Save for Add Up Results (.json)");bRes.type="button";bRes.id="download-results-json";var bCsv=el("button","","Download scores (.csv)");bCsv.type="button";bCsv.id="download-csv";var bPrint=el("button","","Print scoring sheet");bPrint.type="button";bPrint.id="print-scoring";ha.appendChild(bRes);ha.appendChild(bCsv);ha.appendChild(bPrint);head.appendChild(ha);app.appendChild(head);',
      'var stage=el("section","card stage");var meta=el("div","meta");var badge=el("span","badge");var counter=el("span","counter");meta.appendChild(badge);meta.appendChild(counter);stage.appendChild(meta);',
      'var itemTitle=el("h2","item-title");var scriptLine=el("p","script");var ansBox=el("p","ans");ansBox.hidden=true;',
      'var playbar=el("div","row");',
      'var bPrev=el("button","","Prev"),bPlay=el("button","primary","Play item"),bRep=el("button","","Replay"),bStop=el("button","","Stop"),bNext=el("button","","Next");',
      '[bPrev,bPlay,bRep,bStop,bNext].forEach(function(b){b.type="button";playbar.appendChild(b);});',
      'var scorePanel=el("div","score-panel");',
      'var sMeta=el("div","score-meta");var iStu=el("input","");iStu.type="text";iStu.maxLength=48;iStu.placeholder="Student / code name (optional)";iStu.setAttribute("aria-label","Student or code name");iStu.addEventListener("input",function(){studentName=iStu.value;buildPrintRecord();});',
      'var iExam=el("input","");iExam.type="text";iExam.maxLength=48;iExam.placeholder="Examiner (optional)";iExam.setAttribute("aria-label","Examiner name");iExam.addEventListener("input",function(){examinerName=iExam.value;buildPrintRecord();});',
      'var sPill=el("span","score-pill","No items scored yet");var bClr=el("button","","Clear scores");bClr.type="button";',
      '[iStu,iExam,sPill,bClr].forEach(function(n){sMeta.appendChild(n);});scorePanel.appendChild(sMeta);',
      'var sRow=el("div","row");var bM1=el("button","","Correct (1)"),bM0=el("button","","Incorrect (0)"),bMRep=el("button","","+ Repeat (0)"),bMDone=el("button","","Mark done");',
      '[bM1,bM0,bMRep,bMDone].forEach(function(b){b.type="button";sRow.appendChild(b);});',
      'var iNote=el("input","score-note");iNote.type="text";iNote.maxLength=120;iNote.placeholder="Quick item note or error pattern (optional)";iNote.setAttribute("aria-label","Item note");',
      'sRow.appendChild(iNote);scorePanel.appendChild(sRow);',
      'var barWrap=el("div","bar");barWrap.hidden=true;var barFill=el("span");barWrap.appendChild(barFill);',
      'var status=el("p","status");status.setAttribute("role","status");',
      'var keys=el("p","keys","Shortcuts: Space = Play/Stop, R = Replay, Left / Right = Prev / Next, 1 = Correct, 0 = Incorrect, P = +Repeat.");',
      '[itemTitle,scriptLine,ansBox,playbar,scorePanel,barWrap,status,keys].forEach(function(n){stage.appendChild(n);});app.appendChild(stage);',
      'var ctrl=el("section","card grid");',
      'var mkSel=function(id,lbl,opts,val,fn){var f=el("div","field");var l=el("label","",lbl);l.htmlFor=id;var s=el("select");s.id=id;opts.forEach(function(o){var op=el("option","",o[1]);op.value=String(o[0]);if(String(o[0])===String(val))op.selected=true;s.appendChild(op);});s.addEventListener("change",function(){fn(s.value);buildPrintRecord();});f.appendChild(l);f.appendChild(s);ctrl.appendChild(f);};',
      'mkSel("auto","Auto-advance response pause",[["0","Manual (teacher clicks Next)"],["3","3 seconds"],["5","5 seconds"],["8","8 seconds"],["12","12 seconds"]],0,function(v){autoSec=Number(v)||0;});',
      'if(DATA.hasSoundGap)mkSel("gap","Sound gap",[["400","0.4s (quick)"],["700","0.7s (standard)"],["1000","1.0s (CTOPP-style)"]],700,function(v){gapMs=Number(v)||700;});',
      'if(DATA.hasDirections)mkSel("dir","Spoken directions",[["section","First item per section"],["every","Every item"],["none","Words / sounds only"]],"section",function(v){dirMode=v;});',
      'var chkWrap=el("div","chks");var cSlow=el("label","chk");var iSlow=el("input");iSlow.type="checkbox";iSlow.addEventListener("change",function(){slow=iSlow.checked;buildPrintRecord();});cSlow.appendChild(iSlow);cSlow.appendChild(el("span","","Slow playback (0.8x)"));chkWrap.appendChild(cSlow);',
      'var cAns=el("label","chk");var iAns=el("input");iAns.type="checkbox";iAns.addEventListener("change",function(){showAns=iAns.checked;sync();});cAns.appendChild(iAns);cAns.appendChild(el("span","","Show teacher answers"));chkWrap.appendChild(cAns);',
      'ctrl.appendChild(chkWrap);app.appendChild(ctrl);',
      'var rows=[];var scoredByIdx={};',
      'DATA.sections.forEach(function(sec){var sEl=el("section","card sec");sEl.appendChild(el("h2","",sec.label));sEl.appendChild(el("p","",sec.directions));var ul=el("ul","list");',
      'sec.itemIndices.forEach(function(gi){scoredByIdx[gi]=sec.scored!==false;var it=DATA.items[gi];var t=tagOf(it);var li=el("li","row-item");var num=el("span","num",t);var bd=el("div","body");bd.appendChild(el("span","lbl",it.sectionLabel+" "+t+(it.hasAudio?"":" (read aloud)")));bd.appendChild(el("span","sub",it.script));var ia=el("span","item-ans","Answer: "+it.answer);ia.hidden=true;bd.appendChild(ia);var stg=el("span","score-tag","");stg.hidden=true;bd.appendChild(stg);var pb=el("button","","Play "+t);pb.type="button";pb.addEventListener("click",function(){idx=gi;sync();playCurrent();});li.appendChild(num);li.appendChild(bd);li.appendChild(pb);ul.appendChild(li);rows[gi]={li:li,num:num,ia:ia,stg:stg};});',
      'sEl.appendChild(ul);app.appendChild(sEl);});',
      'function scoreStats(){var scTot=0,mk=0,ok=0,repAny=false;DATA.sections.forEach(function(sec){if(sec.scored===false)return;sec.itemIndices.forEach(function(gi){scTot++;var r=scoreMap[String(gi)];if(r&&r.repeats>0)repAny=true;if(r&&(r.score===1||r.score===0)){mk++;if(r.score===1)ok++;}});});return{scTot:scTot,mk:mk,ok:ok,repAny:repAny};}',
      'function buildPrintRecord(){if(!prHost)return;while(prHost.firstChild)prHost.removeChild(prHost.firstChild);var st=scoreStats();var hd=el("div","pr-head");hd.appendChild(el("h1","",DATA.title+" \u2014 Teacher Record & Scoring Sheet"));var mt=el("p","pr-meta");[["Student / Code Name: ",studentName.trim()],["Date: ",st.mk>0||studentName.trim()?todayIso():""],["Examiner: ",examinerName.trim()]].forEach(function(pair){var sp=el("span","",pair[0]);sp.appendChild(el("span","pr-line",pair[1]));mt.appendChild(sp);});hd.appendChild(mt);var cp=["Speed: "+(slow?"Slow (0.8x)":"Standard (1.0x)"),"Response pause: "+(autoSec>0?autoSec+"s auto-advance":"Manual")];if(DATA.hasSoundGap)cp.push("Sound gap: "+(gapMs/1000).toFixed(1)+"s");if(DATA.hasDirections)cp.push("Directions: "+(dirMode==="every"?"Every item":dirMode==="none"?"Words / sounds only":"First item per section"));hd.appendChild(el("p","pr-cond","Audio setup: "+cp.join(" \u00b7 ")));prHost.appendChild(hd);var tot=0;DATA.sections.forEach(function(sec){var sc=sec.scored!==false;var sEl=el("section","pr-sec");sEl.appendChild(el("h2","",sec.label));var tbl=el("table","pr-tbl");var thead=el("thead");var htr=el("tr");(sc?[["pr-num","#"],["","Item / Audio Prompt"],["","Expected Answer"],["pr-sc","Score"],["pr-rep","Rep."],["pr-nt","Notes"]]:[["pr-num","#"],["","Item / Audio Prompt"],["pr-dn","Done"],["pr-nt","Notes"]]).forEach(function(c){htr.appendChild(el("th",c[0],c[1]));});thead.appendChild(htr);tbl.appendChild(thead);var tb=el("tbody");var secOk=0,secMk=0;if(sc)tot+=sec.itemIndices.length;sec.itemIndices.forEach(function(gi){var it=DATA.items[gi];var r=scoreMap[String(gi)]||{};var tr=el("tr");tr.appendChild(el("td","pr-num",it.numLabel?String(it.numLabel):String(it.numInSection)));tr.appendChild(el("td","",it.script));if(sc){tr.appendChild(el("td","",it.answer));var val=r.score===1||r.score===0?r.score:null;if(val!==null){secMk++;if(val===1)secOk++;}var tdS=el("td","pr-sc");tdS.appendChild(el("span","pr-b"+(val===1?" is-picked":""),"1"));tdS.appendChild(document.createTextNode(" "));tdS.appendChild(el("span","pr-b"+(val===0?" is-picked":""),"0"));tr.appendChild(tdS);tr.appendChild(el("td","pr-rep",r.repeats>0?String(r.repeats):""));tr.appendChild(el("td","pr-nt",r.note||""));}else{var tdD=el("td","pr-dn");tdD.appendChild(el("span","pr-bx"+(r.done?" is-checked":""),r.done?"\u2713":""));tr.appendChild(tdD);tr.appendChild(el("td","pr-nt",r.note||""));}tb.appendChild(tr);});tbl.appendChild(tb);sEl.appendChild(tbl);var sub=el("p","pr-sub");if(sc){sub.appendChild(document.createTextNode("Section subtotal: "));if(secMk>0){sub.appendChild(el("strong","",String(secOk)));sub.appendChild(document.createTextNode(" / "+sec.itemIndices.length+" ("+Math.round(secOk/Math.max(1,sec.itemIndices.length)*100)+"%)"));}else{sub.appendChild(el("span","pr-bs"));sub.appendChild(document.createTextNode(" / "+sec.itemIndices.length));}}else{sub.textContent="Practice / listening only (not scored).";}sEl.appendChild(sub);prHost.appendChild(sEl);});var sm=el("section","pr-sum");sm.appendChild(el("h2","","Summary & Observations"));var tp=el("p","");if(tot>0){tp.appendChild(el("strong","","Total scored: "));if(st.mk>0){tp.appendChild(el("strong","",st.ok+" / "+tot+" ("+Math.round(st.ok/tot*100)+"%)"));}else{tp.appendChild(el("span","pr-bs"));tp.appendChild(document.createTextNode(" / "+tot));}}else{tp.textContent="Practice / listening sheet (unscored).";}sm.appendChild(tp);var ob=el("p","pr-obs");[["Used slow (0.8x)",st.mk>0&&slow],["Needed extra wait time",false],["Repeated items",st.repAny],["Self-corrected",false],["Fatigue / break",false]].forEach(function(pair){var sp=el("span");sp.appendChild(el("span","pr-bx"+(pair[1]?" is-checked":""),pair[1]?"\u2713":""));sp.appendChild(document.createTextNode(pair[0]));ob.appendChild(sp);});sm.appendChild(ob);sm.appendChild(el("p","","Next teaching focus / notes:"));sm.appendChild(el("div","pr-wl"));sm.appendChild(el("div","pr-wl"));prHost.appendChild(sm);}',
      'function downloadScoresCsv(){var st=scoreStats();var dt=todayIso();var cp=["Speed: "+(slow?"Slow (0.8x)":"Standard (1.0x)"),"Response pause: "+(autoSec>0?autoSec+"s auto-advance":"Manual")];if(DATA.hasSoundGap)cp.push("Sound gap: "+(gapMs/1000).toFixed(1)+"s");if(DATA.hasDirections)cp.push("Directions: "+(dirMode==="every"?"Every item":dirMode==="none"?"Words / sounds only":"First item per section"));var setup=cp.join(" \u00b7 ");var out=[["Student","Date","Examiner","Section","Item","Prompt","Expected Answer","Scored","Score","Repeats","Notes","Audio Setup"]];var totRep=0;DATA.sections.forEach(function(sec){var sc=sec.scored!==false;sec.itemIndices.forEach(function(gi){var it=DATA.items[gi];var r=scoreMap[String(gi)]||{};var rp=r.repeats>0?r.repeats:0;totRep+=rp;out.push([studentName.trim(),dt,examinerName.trim(),sec.label,it.numLabel?String(it.numLabel):String(it.numInSection),it.script,sc?it.answer:"",sc?"Yes":"Practice only",sc?(r.score===1||r.score===0?String(r.score):""):(r.done?"Done":""),String(rp),r.note||"",setup]);});});out.push([studentName.trim(),dt,examinerName.trim(),"SUMMARY",st.scTot>0?(st.mk+"/"+st.scTot+" scored"):"Unscored",DATA.title,st.scTot>0&&st.mk>0?(Math.round(st.ok/st.scTot*100)+"%"):"",st.scTot>0?"Total":"Practice only",st.scTot>0&&st.mk>0?(st.ok+"/"+st.scTot):"",String(totRep),"",setup]);var csv="\\uFEFF"+out.map(function(row){return row.map(csvCell).join(",");}).join("\\r\\n")+"\\r\\n";var blob=new Blob([csv],{type:"text/csv;charset=utf-8"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=(DATA.title||"worksheet").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")+"-scores.csv";a.hidden=true;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){try{URL.revokeObjectURL(url);}catch(_){}},10000);status.textContent="Downloaded scores (.csv).";}',
      'function mapActId(a,k){a=String(a||"");if(a==="vocab_matching"||a==="vocab_meanings"||a==="vocab_bank")return"vocab_meaning";if(a==="vocab_cloze")return"vocab_blank";if(a==="vocab_pictures")return"vocab_picture";if(a.indexOf("ra_")===0||k==="read-along")return"read_along";return a||(k==="vocab"?"vocab_meaning":"isolation");}',
      'function downloadResultsJson(){var dt=todayIso();var nowIso=new Date().toISOString();var slugBase=(DATA.title||"worksheet").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48)||"worksheet";var actTitles={};var items=[];var rowN=0;DATA.sections.forEach(function(sec){var sc=sec.scored!==false;var ma=mapActId(sec.activity,DATA.kind);if(sec.label&&!actTitles[ma])actTitles[ma]=sec.label;sec.itemIndices.forEach(function(gi){var it=DATA.items[gi];var r=scoreMap[String(gi)]||{};rowN++;var val=sc&&(r.score===1||r.score===0)?r.score:null;var rp=r.repeats>0?r.repeats:0;var nt=(r.note||"").trim();var att=sc?(val!==null):!!r.done;items.push({n:rowN,itemId:"ws-audio-"+rowN,activity:ma,word:String(it.word||it.numLabel||("#"+it.numInSection)),target:String(it.answer||""),responses:att?[val===1?(it.answer||"correct"):(nt||"incorrect")]:[],correct:val===1,firstTry:val===1&&rp===0,attempts:att?(1+rp):0,scored:sc,practice:!sc,done:att,ms:0,supports:{source:"paper_audio",slow:slow?"1":"0",repeats:String(rp)},flag:nt?"teacher_note":""});});});var obj={kind:"alloflow-take-home-result",schemaVersion:3,sessionId:"ws-audio-"+slugBase+"-"+Date.now(),lessonId:"ws-audio-"+slugBase,lessonTitle:DATA.title||"Worksheet",packet:{id:"worksheet-audio-"+(DATA.kind||"word-sounds")+"-"+slugBase,version:"1",form:"Paper+Audio",mode:"practice",title:DATA.title||"Worksheet"},learner:studentName.trim()||"Student",examiner:examinerName.trim(),startedLocal:dt+"T12:00:00",finishedLocal:dt+"T12:00:00",startedAt:nowIso,finishedAt:nowIso,durationMs:0,activityTitles:actTitles,items:items};var blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json;charset=utf-8"});var url=URL.createObjectURL(blob);var a=document.createElement("a");a.href=url;a.download=slugBase+"-results.json";a.hidden=true;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){try{URL.revokeObjectURL(url);}catch(_){}},10000);status.textContent="Saved Add Up Results file (.json).";}',
      'bRes.addEventListener("click",downloadResultsJson);',
      'bCsv.addEventListener("click",downloadScoresCsv);',
      'bPrint.addEventListener("click",function(){buildPrintRecord();window.print();});',
      'function stopAll(){runId++;playing=false;if(timer){clearTimeout(timer);timer=null;}if(raf){cancelAnimationFrame(raf);raf=0;}if(curAudio){try{curAudio.pause();curAudio.currentTime=0;}catch(_){}curAudio=null;}barWrap.hidden=true;barFill.style.width="0%";bPlay.textContent="Play item";}',
      'function sync(){if(!DATA.items.length){itemTitle.textContent="No items in this worksheet.";return;}var it=DATA.items[idx]||DATA.items[0];var t=tagOf(it);var sc=scoredByIdx[idx]!==false;var rec=recOf(idx);var st=scoreStats();badge.textContent=it.sectionLabel;counter.textContent="Item "+(idx+1)+" of "+DATA.items.length+" (Section "+t+")";itemTitle.textContent=it.sectionLabel+" \u2014 "+t;scriptLine.textContent=it.script;ansBox.textContent="Teacher key: "+it.answer;ansBox.hidden=!showAns;bPrev.disabled=idx<=0;bNext.disabled=idx>=DATA.items.length-1;bM1.hidden=!sc;bM0.hidden=!sc;bMRep.hidden=!sc;bMDone.hidden=sc;bM1.setAttribute("aria-pressed",rec.score===1?"true":"false");bM0.setAttribute("aria-pressed",rec.score===0?"true":"false");bMRep.textContent="+ Repeat ("+(rec.repeats||0)+")";bMDone.setAttribute("aria-pressed",rec.done?"true":"false");if(document.activeElement!==iNote)iNote.value=rec.note||"";sPill.textContent=st.scTot>0?(st.mk>0?("Scored: "+st.ok+" / "+st.mk+" ("+Math.round(st.ok/st.mk*100)+"%) \u00b7 "+st.mk+"/"+st.scTot+" done"):"No items scored yet ("+st.scTot+" items)"):"Practice / listening only";rows.forEach(function(r,ri){if(!r)return;var rt=tagOf(DATA.items[ri]);var rr=scoreMap[String(ri)];r.li.classList.toggle("is-active",ri===idx);r.li.classList.toggle("is-played",!!played[ri]);r.num.textContent=played[ri]?"\u2713 "+rt:rt;r.ia.hidden=!showAns;var bits=[];if(rr){if(rr.score===1)bits.push("Score: 1");else if(rr.score===0)bits.push("Score: 0");else if(rr.done)bits.push("Done");if(rr.repeats>0)bits.push("Rep: "+rr.repeats);if(rr.note)bits.push(rr.note);}r.stg.textContent=bits.join(" \u00b7 ");r.stg.hidden=!bits.length;});buildPrintRecord();}',
      'bM1.addEventListener("click",function(){var r=recOf(idx);r.score=r.score===1?null:1;sync();});',
      'bM0.addEventListener("click",function(){var r=recOf(idx);r.score=r.score===0?null:0;sync();});',
      'bMRep.addEventListener("click",function(){var r=recOf(idx);r.repeats=(r.repeats||0)+1;sync();});',
      'bMDone.addEventListener("click",function(){var r=recOf(idx);r.done=!r.done;sync();});',
      'iNote.addEventListener("input",function(){var r=recOf(idx);r.note=iNote.value;buildPrintRecord();var rw=rows[idx];if(rw){var bits=[];if(r.score===1)bits.push("Score: 1");else if(r.score===0)bits.push("Score: 0");else if(r.done)bits.push("Done");if(r.repeats>0)bits.push("Rep: "+r.repeats);if(r.note)bits.push(r.note);rw.stg.textContent=bits.join(" \u00b7 ");rw.stg.hidden=!bits.length;}});',
      'bClr.addEventListener("click",function(){scoreMap={};iNote.value="";status.textContent="Cleared all item scores.";sync();});',
      'function playClip(cid,mine){return new Promise(function(res){var uri=DATA.audio[cid];if(!uri||mine!==runId){res();return;}var a=new Audio(uri);curAudio=a;a.playbackRate=slow?0.8:1;var done=function(){if(curAudio===a)curAudio=null;res();};a.onended=done;a.onerror=done;try{var p=a.play();if(p&&p.catch)p.catch(done);}catch(_){done();}});}',
      'function waitMs(ms,mine,showBar){return new Promise(function(res){if(mine!==runId||ms<=0){res();return;}if(showBar){barWrap.hidden=false;var t0=Date.now();var stepBar=function(){if(mine!==runId){barWrap.hidden=true;return;}var f=Math.min(1,(Date.now()-t0)/ms);barFill.style.width=Math.round(f*100)+"%";if(f<1)raf=requestAnimationFrame(stepBar);};raf=requestAnimationFrame(stepBar);}timer=setTimeout(function(){timer=null;barWrap.hidden=true;res();},ms);});}',
      'function playCurrent(isReplay){stopAll();var it=DATA.items[idx];if(!it)return;if(isReplay&&played[idx]&&scoredByIdx[idx]!==false){var rr=recOf(idx);rr.repeats=(rr.repeats||0)+1;sync();}var mine=++runId;playing=true;bPlay.textContent="Playing...";var seq=[];var useDir=DATA.hasDirections&&(dirMode==="every"||(dirMode==="section"&&it.numInSection===1));if(useDir)it.promptClips.forEach(function(c){seq.push({id:c,gap:320});});it.mainClips.forEach(function(c,ci){seq.push({id:c,gap:ci<it.mainClips.length-1?(it.segmented?gapMs:280):0});});if(it.choiceClips.length){if(seq.length)seq[seq.length-1].gap=420;it.choiceClips.forEach(function(c,ci){seq.push({id:c,gap:ci<it.choiceClips.length-1?420:0});});}if(!seq.length){status.textContent="Read aloud: "+it.script;played[idx]=true;playing=false;bPlay.textContent="Play item";sync();return;}status.textContent="Playing "+it.sectionLabel+" "+tagOf(it)+"...";var chain=Promise.resolve();seq.forEach(function(step){chain=chain.then(function(){return playClip(step.id,mine);}).then(function(){return step.gap?waitMs(step.gap,mine,false):null;});});chain.then(function(){if(mine!==runId)return;played[idx]=true;sync();if(autoSec>0&&idx<DATA.items.length-1){status.textContent="Response window ("+autoSec+"s) before next item...";return waitMs(autoSec*1000,mine,true).then(function(){if(mine!==runId)return;idx++;sync();playCurrent(false);});}playing=false;bPlay.textContent="Play item";status.textContent="Finished "+it.sectionLabel+" "+tagOf(it)+".";});}',
      'bPlay.addEventListener("click",function(){if(playing)stopAll();else playCurrent(false);});',
      'bRep.addEventListener("click",function(){playCurrent(true);});',
      'bStop.addEventListener("click",function(){stopAll();status.textContent="Stopped.";});',
      'bPrev.addEventListener("click",function(){if(idx>0){stopAll();idx--;sync();}});',
      'bNext.addEventListener("click",function(){if(idx<DATA.items.length-1){stopAll();idx++;sync();}});',
      'document.addEventListener("keydown",function(e){var tag=(e.target&&e.target.tagName)||"";if(tag==="SELECT"||tag==="INPUT"||tag==="TEXTAREA")return;if(e.code==="Space"){e.preventDefault();if(playing)stopAll();else playCurrent(false);}else if(e.key==="r"||e.key==="R"){e.preventDefault();playCurrent(true);}else if(e.key==="ArrowRight"){e.preventDefault();if(idx<DATA.items.length-1){stopAll();idx++;sync();}}else if(e.key==="ArrowLeft"){e.preventDefault();if(idx>0){stopAll();idx--;sync();}}else if(e.key==="1"){e.preventDefault();var r1=recOf(idx);if(scoredByIdx[idx]!==false)r1.score=r1.score===1?null:1;else r1.done=!r1.done;sync();}else if(e.key==="0"&&scoredByIdx[idx]!==false){e.preventDefault();var r0=recOf(idx);r0.score=r0.score===0?null:0;sync();}else if((e.key==="p"||e.key==="P")&&scoredByIdx[idx]!==false){e.preventDefault();var rp=recOf(idx);rp.repeats=(rp.repeats||0)+1;sync();}});',
      'buildPrintRecord();sync();',
      '})();'
    ].join('\n');
    return '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
      + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; media-src data:; img-src data:; connect-src \'none\'; form-action \'none\'; base-uri \'none\'">\n'
      + '<meta name="referrer" content="no-referrer">\n'
      + '<title>' + wsEsc(p.title) + ' \u2014 Worksheet Audio Player</title>\n'
      + '<style>\n' + css + '\n</style>\n</head>\n<body>\n<main id="app" aria-label="Worksheet audio player"></main>\n<section id="print-record" class="print-record" aria-label="Printable teacher record and scoring sheet"></section>\n<script>\n' + script + '\n</script>\n</body>\n</html>\n';
  }
  function buildWordSoundsAudioCompanionHtml(lessonOrState, options) {
    return buildAudioCompanionHtmlFromPlan(buildWordSoundsAudioPlan(lessonOrState, options));
  }
  function buildVocabAudioCompanionHtml(rawState, options) {
    return buildAudioCompanionHtmlFromPlan(buildVocabAudioPlan(rawState, options));
  }
  function buildReadAlongAudioCompanionHtml(rawState, options) {
    return buildAudioCompanionHtmlFromPlan(buildReadAlongAudioPlan(rawState, options));
  }

  function normalizeVocabWorksheetModel(rawState, rawOptions) {
    var src = Array.isArray(rawState) ? { entries: rawState } : (rawState && typeof rawState === 'object' ? rawState : {});
    var opts = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
    var defaultTitle = String(src.title || 'Vocabulary Practice Worksheet').trim() || 'Vocabulary Practice Worksheet';
    var custom = wsExtractCustom(src, opts, defaultTitle);
    var title = custom.title;
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
    var allEntries = [];
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
      var baseCloze = vocabClozeParts({ word: word, blank: blank, blankAnswer: blankAnswer, example: example });
      var defaultClozeText = baseCloze.hasCloze
        ? (baseCloze.before + '___' + baseCloze.after)
        : baseCloze.prompt;
      allEntries.push({
        origIndex: allEntries.length,
        itemKey: key,
        word: word,
        defaultMeaning: meaning,
        meaning: meaning,
        example: example,
        blank: blank,
        blankAnswer: blankAnswer,
        defaultClozeText: defaultClozeText,
        customCloze: '',
        noPicture: noPicture,
        directUri: directUri,
        pictureSet: String(obj.pictureSet || obj.pictureSource || '').trim(),
        pictureCredit: obj.pictureCredit || (picRaw && typeof picRaw === 'object' ? picRaw.credit : null) || null
      });
    });

    var orderedAllEntries = wsApplyItemOrder(allEntries, custom.itemOrder, 'words', 'entries').map(function (e) {
      var clone = Object.assign({}, e);
      var ovMeaning = wsItemTextOverride(custom.itemTextOverrides, 'meaning:' + clone.origIndex, 'meaning:' + clone.itemKey);
      if (ovMeaning) clone.meaning = ovMeaning;
      var ovCloze = wsItemTextOverride(custom.itemTextOverrides, 'cloze:' + clone.origIndex, 'cloze:' + clone.itemKey)
        || wsItemTextOverride(custom.itemTextOverrides, 'words:' + clone.origIndex, String(clone.origIndex));
      if (ovCloze) clone.customCloze = ovCloze;
      return clone;
    });

    var entries = orderedAllEntries.filter(function (e) {
      return !(custom.hiddenItems[e.itemKey] || custom.hiddenItems['word:' + e.itemKey] || custom.hiddenItems[String(e.origIndex)]);
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
      if (e.customCloze) {
        var bm = /_{3,}/.exec(e.customCloze);
        if (bm) {
          var b0 = e.customCloze.slice(0, bm.index);
          var a0 = e.customCloze.slice(bm.index + bm[0].length);
          var ans0 = String(e.blankAnswer || e.word).trim() || e.word;
          return { num: idx + 1, word: e.word, hasCloze: true, before: b0, after: a0, answer: ans0, completed: b0 + ans0 + a0 };
        }
        return { num: idx + 1, word: e.word, hasCloze: false, prompt: e.customCloze, answer: e.word };
      }
      return Object.assign({ num: idx + 1, word: e.word }, vocabClozeParts(e));
    });

    // Shuffled Word Bank
    var wordBank = wsShuffle(words, 'vbank|' + seedBase);

    var computeCredits = function () {
      return creditsFor(usedPicWords, usedPicByWord, symbols, creditLine);
    };

    return {
      title: title,
      subtitle: custom.subtitle,
      headerFields: custom.headerFields,
      density: custom.density,
      entries: entries,
      allEntries: orderedAllEntries,
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
      hiddenSections: custom.hiddenSections,
      hiddenParts: custom.hiddenParts,
      hiddenItems: custom.hiddenItems,
      sectionOverrides: custom.sectionOverrides,
      itemOrder: custom.itemOrder,
      itemTextOverrides: custom.itemTextOverrides,
      computeCredits: computeCredits
    };
  }

  function buildVocabWorksheetHtml(rawState, options) {
    var model = normalizeVocabWorksheetModel(rawState, options);
    var fmt = function (text) {
      return wsFormatSyllableText(text, model.syllablesOn, model.syllablesSrc);
    };
    var hp = model.hiddenParts || Object.create(null);
    var ov = model.sectionOverrides || Object.create(null);

    var bankHtml = model.wordBankOn && model.wordBank.length
      ? '<div class="vocab-bank" data-vocab-word-bank="true"><span class="ws-bank-label">Word Bank:</span>'
        + model.wordBank.map(function (w) { return '<span class="ws-chip">' + fmt(w) + '</span>'; }).join('')
        + '</div>'
      : '';

    var partsHtml = [];
    var keySections = [];

    // Part 1 — Match the Word to Its Meaning
    if (!hp.matching && model.matchWords.length) {
      var p1Copy = wsApplySectionCopy(ov, 'matching', null, 'Part 1 \u2014 Match the Word to Its Meaning', 'Write the letter of the matching meaning on the line next to each word.');
      var wordsCol = '<ol class="vocab-match-words">' + model.matchWords.map(function (item) {
        return '<li class="vocab-match-word"><span class="ws-num">' + item.num + '.</span><span class="vocab-match-blank" aria-label="letter blank"></span><span class="ws-word">' + fmt(item.word) + '</span></li>';
      }).join('') + '</ol>';
      var defsCol = '<ol class="vocab-match-defs">' + model.matchDefs.map(function (def) {
        return '<li class="vocab-match-def"><span class="vocab-match-letter">' + wsEsc(def.letter) + '.</span><span>' + wsEsc(def.meaning) + '</span></li>';
      }).join('') + '</ol>';
      partsHtml.push(
        '<section class="ws-section" data-vocab-part="matching">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p1Copy.heading) + '</h2>'
        + '<p class="ws-directions">' + wsEsc(p1Copy.directions) + '</p></div>'
        + '<div class="vocab-match-grid">' + wordsCol + defsCol + '</div></section>'
      );
      keySections.push({
        heading: p1Copy.heading,
        lines: model.matchWords.map(function (item) {
          return item.word + ' \u2014 ' + item.answerLetter + ' (' + item.meaning + ')';
        })
      });
    } else if (!hp.matching && model.entries.length) {
      var p1CopyW = wsApplySectionCopy(ov, 'matching', null, 'Part 1 \u2014 Write Each Meaning', 'Write what each vocabulary word means on the line.');
      partsHtml.push(
        '<section class="ws-section" data-vocab-part="matching">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p1CopyW.heading) + '</h2>'
        + '<p class="ws-directions">' + wsEsc(p1CopyW.directions) + '</p></div>'
        + '<ol class="ws-list">' + model.entries.map(function (e, i) {
          return '<li class="ws-item"><span class="ws-num">' + (i + 1) + '.</span><div class="ws-body"><span class="ws-word">' + fmt(e.word) + '</span><div class="ws-line"></div></div></li>';
        }).join('') + '</ol></section>'
      );
      keySections.push({
        heading: p1CopyW.heading,
        lines: model.entries.map(function (e) { return e.word + ' \u2014 Teacher-checked student meaning.'; })
      });
    }

    // Part 2 — Fill in the Blank
    if (!hp.cloze && model.clozeItems.length) {
      var defaultClozeDir = model.wordBankOn
        ? 'Choose a word from the Word Bank to complete each sentence. Write the word on the line.'
        : 'Write the vocabulary word that best completes each sentence.';
      var p2Copy = wsApplySectionCopy(ov, 'cloze', null, 'Part 2 \u2014 Fill in the Blank', defaultClozeDir);
      var clozeListHtml = '<ol class="ws-list">' + model.clozeItems.map(function (item) {
        var inner = item.hasCloze
          ? '<p class="vocab-cloze-text">' + wsEsc(item.before) + '<span class="vocab-cloze-blank" aria-label="blank"></span>' + wsEsc(item.after) + '</p>'
          : '<p class="vocab-cloze-text">' + wsEsc(item.prompt) + '</p><div class="ws-line"></div>';
        return '<li class="ws-item"><span class="ws-num">' + item.num + '.</span><div class="ws-body">' + inner + '</div></li>';
      }).join('') + '</ol>';
      partsHtml.push(
        '<section class="ws-section" data-vocab-part="cloze">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p2Copy.heading) + '</h2>'
        + '<p class="ws-directions">' + wsEsc(p2Copy.directions) + '</p></div>'
        + clozeListHtml + '</section>'
      );
      keySections.push({
        heading: p2Copy.heading,
        lines: model.clozeItems.map(function (item) {
          return item.hasCloze
            ? item.answer + ' \u2014 "' + item.completed + '"'
            : item.word + ' \u2014 Answers will vary (sentence using "' + item.word + '").';
        })
      });
    }

    // Part 3 — Name the Picture
    if (!hp.pictures && model.pictureItems.length) {
      var p3Copy = wsApplySectionCopy(ov, 'pictures', null, 'Part 3 \u2014 Name the Picture', 'Look at each picture. Write the matching vocabulary word on the line underneath.');
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
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p3Copy.heading) + '</h2>'
        + '<p class="ws-directions">' + wsEsc(p3Copy.directions) + '</p></div>'
        + tilesHtml + '</section>'
      );
      keySections.push({
        heading: p3Copy.heading,
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

    var vocabTplHiddenItems = {};
    var vocabTplItemTextOverrides = {};
    (model.allEntries || []).forEach(function (e) {
      var idxStr = String(e.origIndex);
      var isHidden = !!(model.hiddenItems && (model.hiddenItems[e.itemKey] || model.hiddenItems['word:' + e.itemKey] || model.hiddenItems[idxStr]));
      if (isHidden) {
        vocabTplHiddenItems[idxStr] = true;
        return;
      }
      var ovM = wsItemTextOverride(model.itemTextOverrides, 'meaning:' + idxStr, 'meaning:' + e.itemKey);
      if (ovM) vocabTplItemTextOverrides['meaning:' + idxStr] = ovM;
      var ovC = wsItemTextOverride(model.itemTextOverrides, 'cloze:' + idxStr, 'cloze:' + e.itemKey)
        || wsItemTextOverride(model.itemTextOverrides, 'words:' + idxStr, idxStr);
      if (ovC) vocabTplItemTextOverrides['cloze:' + idxStr] = ovC;
    });

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
      '<body class="ws-density-' + wsEsc(model.density || 'standard') + '">',
      '<p class="ws-noprint">Print from your browser menu (Ctrl+P or Cmd+P). Keep the scale at 100%.</p>',
      '<header class="ws-header">',
      '<h1 class="ws-title">' + wsEsc(model.title) + '</h1>',
      wsSubtitleHtml(model.subtitle),
      wsHeaderMetaHtml(model.headerFields),
      '</header>',
      bankHtml,
      partsHtml.length ? partsHtml.join('\n') : '<p>No vocabulary words are available yet.</p>',
      creditsHtml,
      keyHtml,
      wsTemplateScriptTag('vocab', Object.assign({}, model, {
        hiddenItems: vocabTplHiddenItems,
        itemTextOverrides: vocabTplItemTextOverrides
      }), {
        wordBank: model.wordBankOn,
        pictures: model.picturesOn,
        answerKey: model.answerKeyOn,
        syllables: model.syllablesOn
      }),
      '</body>',
      '</html>'
    ].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Read-Along Printable Worksheet Model & Standalone Offline HTML Builder
  // ---------------------------------------------------------------------------
  var RA_STANDALONE_CSS = VOCAB_STANDALONE_CSS + [
    '.ra-passage{padding:12px 14px;border:1.5px solid #000000;background:#ffffff;font-size:16px;line-height:1.75;color:#000000}',
    '.ra-subhead{margin:12px 0 6px;font-size:16px;font-weight:700;color:#000000}',
    '.ra-para{margin:0 0 10px}.ra-para:last-child{margin-bottom:0}',
    '.ra-sup-list{list-style:none;margin:8px 0 0;padding:0}',
    '.ra-sup-item{display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid #808080;break-inside:avoid;page-break-inside:avoid}',
    '.ra-sup-img{display:block;width:52px;height:52px;object-fit:contain;border:1px solid #808080;padding:2px;background:#ffffff;flex:none}',
    '.ra-sup-body{flex:1 1 auto;min-width:0;font-size:14px}',
    '.ra-sup-quote{font-weight:700}',
    '.ra-write-lines{margin-top:10px}',
    '.ra-write-line{height:34px;border-bottom:1.5px solid #000000;border-top:1px dashed #808080;margin-bottom:6px}',
    '.ra-check-list{list-style:none;margin:10px 0 0;padding:0}',
    '.ra-check-item{margin:0 0 14px;break-inside:avoid;page-break-inside:avoid}',
    '.ra-check-prompt{margin:0 0 6px;font-size:15px}',
    '.ra-mc-choices{list-style:none;margin:4px 0 0 16px;padding:0}',
    '.ra-mc-choice{display:flex;align-items:baseline;gap:8px;margin:4px 0;font-size:14px}',
    '.ra-mc-box{display:inline-block;width:13px;height:13px;border:1.5px solid #000000;border-radius:50%;flex:none;position:relative;top:2px}',
    'body.ws-density-compact .ra-passage{font-size:14px;line-height:1.5;padding:9px 10px}',
    'body.ws-density-compact .ra-write-line{height:24px;margin-bottom:4px}',
    'body.ws-density-primary .ra-passage{font-size:19px;line-height:1.95;padding:16px 18px}',
    'body.ws-density-primary .ra-subhead{font-size:20px}',
    'body.ws-density-primary .ra-check-prompt{font-size:18px}',
    'body.ws-density-primary .ra-mc-choice{font-size:17px}',
    'body.ws-density-primary .ra-write-line{height:52px;margin-bottom:8px}'
  ].join('');

  function raCleanLang(value) {
    var s = String(value == null ? '' : value).trim();
    return /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/i.test(s) ? s.toLowerCase() : 'en';
  }
  function raIsRtlLang(lang) {
    var rb = root && root.AlloPacketReadAlong;
    if (rb && typeof rb.isRtlLang === 'function') return !!rb.isRtlLang(lang);
    return /^(?:ar|he|iw|fa|ur|ps|yi|sd)(?:-|$)/i.test(raCleanLang(lang));
  }
  function raFallbackSplitPassage(text) {
    var raw = String(text == null ? '' : text).replace(/\r\n?/g, '\n').trim();
    if (!raw) return [];
    var out = [];
    raw.split(/\n[ \t]*\n+/).forEach(function (para, pi) {
      var first = true;
      para.split('\n').forEach(function (line) {
        var trimmed = line.replace(/\s+/g, ' ').trim();
        if (!trimmed || /^-{3,}$/.test(trimmed)) return;
        var hm = /^(#{1,3})\s+(.+)$/.exec(trimmed);
        if (hm) {
          out.push({ text: hm[2].trim(), heading: hm[1].length, para: first && pi > 0 });
          first = false;
          return;
        }
        out.push({ text: trimmed, para: first && pi > 0 });
        first = false;
      });
    });
    return out;
  }
  function raApplySyllables(rawText, lang, showSyllables, syllableLookup) {
    var str = String(rawText == null ? '' : rawText);
    if (!showSyllables) return str;
    var rb = root && root.AlloPacketReadAlong;
    if (lang === 'es' && rb && typeof rb.syllableText === 'function' && typeof rb.syllabifySpanish === 'function') {
      var esOut = rb.syllableText(str, rb.syllabifySpanish, { spanish: true });
      return esOut || str;
    }
    if (lang === 'en') {
      var lookup = syllableLookup || (root && root.AlloModules && root.AlloModules.SyllableTableEn) || null;
      if (rb && typeof rb.syllableText === 'function' && typeof lookup === 'function') {
        var enOut = rb.syllableText(str, lookup);
        return enOut || str;
      }
      if (lookup) {
        return str.replace(/[A-Za-z]+/g, function (tok) {
          var parts = tok.length >= 4 ? wsLookupSyllables(tok, lookup) : null;
          return (parts && parts.length > 1) ? parts.join('\u00b7') : tok;
        });
      }
    }
    return str;
  }
  function raBoldHtml(textStr, withBold) {
    var str = String(textStr == null ? '' : textStr);
    if (!withBold) return wsEsc(str);
    var re = /[A-Za-z\u00C0-\u024F\u00b7]+/g, m, last = 0, out = '';
    while ((m = re.exec(str))) {
      if (m.index > last) out += wsEsc(str.slice(last, m.index));
      var tok = m[0];
      var plainLen = tok.replace(/\u00b7/g, '').length;
      if (plainLen < 2) {
        out += wsEsc(tok);
      } else {
        var targetLetters = plainLen <= 3 ? Math.max(1, plainLen - 1) : Math.ceil(plainLen * 0.45);
        var seen = 0, cutIdx = 0;
        for (var ci = 0; ci < tok.length; ci++) {
          if (tok.charAt(ci) !== '\u00b7') seen++;
          cutIdx = ci + 1;
          if (seen >= targetLetters) break;
        }
        out += '<strong>' + wsEsc(tok.slice(0, cutIdx)) + '</strong>' + (cutIdx < tok.length ? wsEsc(tok.slice(cutIdx)) : '');
      }
      last = m.index + tok.length;
    }
    if (last < str.length) out += wsEsc(str.slice(last));
    return out;
  }
  function raNormalizeWriteLines(val) {
    var n = Math.floor(Number(val));
    if (!isFinite(n) || n < 1) return 5;
    return Math.min(15, n);
  }
  function buildReadAlongWorksheetModel(rawState, rawOptions) {
    var src = rawState && typeof rawState === 'object' ? rawState : {};
    var opts = rawOptions && typeof rawOptions === 'object' ? rawOptions : {};
    var defaultTitle = String(src.title || 'Read along').replace(/\s+/g, ' ').trim() || 'Read along';
    var custom = wsExtractCustom(src, opts, defaultTitle);
    var title = custom.title;
    var lang = raCleanLang(opts.lang || src.lang || 'en');
    var isRtl = opts.isRtl !== undefined ? !!opts.isRtl : (src.isRtl !== undefined ? !!src.isRtl : raIsRtlLang(lang));
    var rb = root && root.AlloPacketReadAlong;
    var rawSentences = Array.isArray(src.sentences) && src.sentences.length
      ? src.sentences
      : (typeof src.text === 'string' && src.text.trim()
          ? (rb && typeof rb.splitPassage === 'function' ? rb.splitPassage(src.text) : raFallbackSplitPassage(src.text))
          : []);
    var showSyllables = opts.showSyllables !== undefined ? !!opts.showSyllables
      : (opts.syllables !== undefined ? !!opts.syllables : !!src.showSyllables);
    var showBold = opts.showBold !== undefined ? !!opts.showBold
      : (opts.bold !== undefined ? !!opts.bold : !!src.showBold);
    var showSupports = opts.showSupports !== undefined ? !!opts.showSupports
      : (opts.supports !== undefined ? !!opts.supports : (src.showSupports !== undefined ? !!src.showSupports : true));
    var answerKeyOn = opts.answerKey !== undefined ? !!opts.answerKey
      : (opts.includeAnswerKey !== undefined ? !!opts.includeAnswerKey
        : (src.includeAnswerKey !== undefined ? !!src.includeAnswerKey
          : (src.answerKey !== undefined ? !!src.answerKey : true)));
    var writeLines = raNormalizeWriteLines(opts.writeLines !== undefined ? opts.writeLines : (src.writeLines !== undefined ? src.writeLines : 5));
    var syllableLookup = opts.syllableLookup || src.syllableLookup || (root && root.AlloModules && root.AlloModules.SyllableTableEn) || null;

    // Group sentences into paragraphs (headings remain separate entries with heading: 1..3).
    var paragraphs = [];
    if (Array.isArray(src.paragraphs) && src.paragraphs.length && !rawSentences.length) {
      src.paragraphs.forEach(function (p) {
        if (!p) return;
        var t = typeof p === 'string' ? p.trim() : String(p.text || '').trim();
        if (!t) return;
        paragraphs.push({ text: t, heading: (p && typeof p === 'object' && p.heading) ? Number(p.heading) : 0 });
      });
    } else {
      var curBuf = [];
      var flushBuf = function () {
        if (!curBuf.length) return;
        paragraphs.push({ text: curBuf.join(' '), heading: 0 });
        curBuf = [];
      };
      rawSentences.forEach(function (row, idx) {
        var txt = typeof row === 'string' ? row.trim() : (row && typeof row.text === 'string' ? row.text.trim() : '');
        if (!txt) return;
        var h = row && typeof row === 'object' && (row.heading === 1 || row.heading === 2 || row.heading === 3) ? row.heading : 0;
        if (h) {
          flushBuf();
          paragraphs.push({ text: txt, heading: h });
          return;
        }
        if (row && typeof row === 'object' && (row.para || row.pageBreak) && idx > 0) flushBuf();
        curBuf.push(txt);
      });
      flushBuf();
    }

    var allSupports = (Array.isArray(src.customSupports) ? src.customSupports : []).filter(function (sup) {
      return sup && typeof sup === 'object' && String(sup.text || '').trim();
    }).map(function (sup, idx) {
      var uri = isPicture(String(sup.imgUri || '').trim()) ? String(sup.imgUri).trim() : '';
      return {
        id: sup.id || ('sup' + (idx + 1)),
        line: sup.line != null ? Number(sup.line) : null,
        quote: String(sup.quote || '').trim(),
        text: String(sup.text || '').trim(),
        imgUri: uri,
        alt: String(sup.alt || sup.quote || 'Support picture').trim(),
        audioUri: sup.audioUri || sup.audio || ''
      };
    });
    var customSupports = showSupports ? allSupports.slice() : [];

    // Part 3 — Key Words matching (quoted customSupports + wordMeanings)
    var allKeyWords = [];
    var seenKey = Object.create(null);
    var addKeyWord = function (rawWord, rawMeaning) {
      var w = String(rawWord || '').replace(/\s+/g, ' ').trim();
      var m = String(rawMeaning || '').replace(/\s+/g, ' ').trim();
      if (!w || !m) return;
      var k = w.toLowerCase();
      if (seenKey[k]) return;
      seenKey[k] = true;
      allKeyWords.push({ word: w, meaning: m });
    };
    allSupports.forEach(function (sup) { if (sup.quote && sup.text) addKeyWord(sup.quote, sup.text); });
    if (Array.isArray(src.wordMeanings)) {
      src.wordMeanings.forEach(function (entry) {
        if (!entry || typeof entry !== 'object') return;
        addKeyWord(entry.word || entry.w, entry.meaning || entry.def || entry.d);
      });
    } else if (src.wordMeanings && typeof src.wordMeanings === 'object') {
      Object.keys(src.wordMeanings).sort().forEach(function (k) {
        var entry = src.wordMeanings[k];
        if (!entry || typeof entry !== 'object') return;
        addKeyWord(entry.word || entry.w || k, entry.meaning || entry.def || entry.d);
      });
    }

    var matchWords = [];
    var matchDefs = [];
    if (allKeyWords.length >= 2) {
      var seedBase = title + '|' + allKeyWords.map(function (it) { return it.word; }).join(',');
      var shuffledDefs = wsShuffle(allKeyWords.map(function (it, idx) {
        return { wordIdx: idx, word: it.word, meaning: it.meaning };
      }), 'ramatch|' + seedBase);
      if (shuffledDefs.every(function (d, i) { return d.wordIdx === i; })) {
        shuffledDefs.push(shuffledDefs.shift());
      }
      var letterByIdx = Object.create(null);
      matchDefs = shuffledDefs.map(function (d, i) {
        var letter = vocabLetterLabel(i);
        letterByIdx[d.wordIdx] = letter;
        return { letter: letter, wordIdx: d.wordIdx, word: d.word, meaning: d.meaning };
      });
      matchWords = allKeyWords.map(function (it, idx) {
        var ltr = letterByIdx[idx] || '';
        return { num: idx + 1, word: it.word, meaning: it.meaning, answerLetter: ltr, letter: ltr };
      });
    }

    // Part 4 — Comprehension questions (or open writing lines when empty)
    var rawQs = (rb && typeof rb.cleanQuestions === 'function')
      ? rb.cleanQuestions(src.questions)
      : (Array.isArray(src.questions) ? src.questions.slice(0, 6) : []);
    var allQuestions = [];
    rawQs.forEach(function (q, idx) {
      if (!q || typeof q !== 'object') return;
      var prompt = String(q.prompt || '').replace(/\s+/g, ' ').trim();
      if (!prompt) return;
      var isMc = q.kind === 'mc' && Array.isArray(q.choices) && q.choices.length > 0;
      var choices = isMc ? q.choices.map(function (c) { return String(c || '').trim(); }).filter(Boolean) : [];
      var ans = isMc && typeof q.answer === 'number' && q.answer >= 0 && q.answer < choices.length ? q.answer : 0;
      allQuestions.push({
        origIndex: allQuestions.length,
        itemKey: 'writing:' + allQuestions.length,
        id: q.id || ('q' + (idx + 1)),
        kind: isMc && choices.length ? 'mc' : 'open',
        defaultPrompt: prompt,
        prompt: prompt,
        choices: choices,
        answer: ans,
        audioUri: q.audioUri || q.audio || ''
      });
    });
    var orderedQuestions = wsApplyItemOrder(allQuestions, custom.itemOrder, 'writing', 'questions').map(function (q) {
      var clone = Object.assign({}, q);
      var ovPrompt = wsItemTextOverride(custom.itemTextOverrides, clone.itemKey, 'q:' + clone.origIndex);
      if (ovPrompt) clone.prompt = ovPrompt;
      return clone;
    });
    var visibleQuestions = orderedQuestions.filter(function (q) {
      return !wsIsItemHidden(custom.hiddenItems, 'writing', q.origIndex, 'q');
    }).map(function (q, idx) {
      return Object.assign({}, q, { num: idx + 1 });
    });

    return {
      _isReadAlongModel: true,
      title: title,
      subtitle: custom.subtitle,
      headerFields: custom.headerFields,
      density: custom.density,
      lang: lang,
      isRtl: isRtl,
      showSyllables: showSyllables,
      showBold: showBold,
      showSupports: showSupports,
      answerKeyOn: answerKeyOn,
      writeLines: writeLines,
      syllableLookup: syllableLookup,
      sentences: rawSentences,
      paragraphs: paragraphs,
      customSupports: customSupports,
      allSupports: allSupports,
      allKeyWords: allKeyWords,
      matchWords: matchWords,
      matchDefs: matchDefs,
      questions: visibleQuestions,
      allQuestions: orderedQuestions,
      hiddenSections: custom.hiddenSections,
      hiddenParts: custom.hiddenParts,
      hiddenItems: custom.hiddenItems,
      sectionOverrides: custom.sectionOverrides,
      itemOrder: custom.itemOrder,
      itemTextOverrides: custom.itemTextOverrides
    };
  }

  function raDefaultPassageDirections(model) {
    if (model.showSyllables && model.showBold) return 'Longer words are shown with syllable dots and bold word starts.';
    if (model.showSyllables) return 'Longer words are shown with syllable dots.';
    if (model.showBold) return 'Word starts are bolded to guide reading.';
    return '';
  }

  function buildReadAlongWorksheetHtmlFromModel(modelOrState, rawOptions) {
    var model = (modelOrState && modelOrState._isReadAlongModel && !rawOptions)
      ? modelOrState
      : buildReadAlongWorksheetModel(modelOrState, rawOptions);
    var hp = model.hiddenParts || Object.create(null);
    var ov = model.sectionOverrides || Object.create(null);
    var fmtHtml = function (rawText) {
      var withSyl = raApplySyllables(rawText, model.lang, model.showSyllables, model.syllableLookup);
      return raBoldHtml(withSyl, model.showBold);
    };

    var partsHtml = [];
    var keySections = [];

    // Part 1 — Read the Passage
    if (!hp.passage) {
      var p1Copy = wsApplySectionCopy(ov, 'passage', null, 'Part 1 \u2014 Read the Passage', raDefaultPassageDirections(model));
      var passInner = model.paragraphs.map(function (p) {
        if (p.heading) return '<h3 class="ra-subhead">' + fmtHtml(p.text) + '</h3>';
        return '<p class="ra-para">' + fmtHtml(p.text) + '</p>';
      }).join('');
      partsHtml.push(
        '<section class="ws-section" data-ra-part="passage">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p1Copy.heading) + '</h2>'
        + (p1Copy.directions ? '<p class="ws-directions">' + wsEsc(p1Copy.directions) + '</p>' : '')
        + '</div>'
        + '<div class="ra-passage"' + (model.isRtl ? ' dir="rtl"' : '') + '>'
        + (passInner || '<p class="ra-para"></p>')
        + '</div></section>'
      );
    }

    // Part 2 — Reading Notes & Visual Supports
    if (!hp.supports && model.showSupports && model.customSupports.length) {
      var p2Copy = wsApplySectionCopy(ov, 'supports', null, 'Part 2 \u2014 Reading Notes & Visual Supports', 'Use these notes and pictures to help you understand the passage.');
      var supHtml = model.customSupports.map(function (sup) {
        var label = sup.quote
          ? sup.quote + (sup.line != null ? ' (sentence ' + (sup.line + 1) + ')' : '')
          : (sup.line != null ? 'Sentence ' + (sup.line + 1) : 'Note');
        var imgTag = sup.imgUri
          ? '<img class="ra-sup-img" src="' + wsEsc(sup.imgUri) + '" alt="' + wsEsc(sup.alt || sup.quote || 'Support picture') + '">'
          : '';
        return '<li class="ra-sup-item">' + imgTag
          + '<div class="ra-sup-body"><strong class="ra-sup-quote">' + wsEsc(label) + ':</strong> '
          + '<span>' + wsEsc(sup.text) + '</span></div></li>';
      }).join('');
      partsHtml.push(
        '<section class="ws-section" data-ra-part="supports">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p2Copy.heading) + '</h2>'
        + (p2Copy.directions ? '<p class="ws-directions">' + wsEsc(p2Copy.directions) + '</p>' : '')
        + '</div><ul class="ra-sup-list">' + supHtml + '</ul></section>'
      );
    }

    // Part 3 — Match the Key Words
    if (!hp.matching && model.matchWords.length) {
      var p3Copy = wsApplySectionCopy(ov, 'matching', null, 'Part 3 \u2014 Match the Key Words', 'Write the letter of the matching meaning on the line next to each word.');
      var wCol = '<ol class="vocab-match-words">' + model.matchWords.map(function (it) {
        return '<li class="vocab-match-word"><span class="ws-num">' + it.num + '.</span><span class="vocab-match-blank" aria-label="letter blank"></span><span class="ws-word">' + wsEsc(it.word) + '</span></li>';
      }).join('') + '</ol>';
      var dCol = '<ol class="vocab-match-defs">' + model.matchDefs.map(function (def) {
        return '<li class="vocab-match-def"><span class="vocab-match-letter">' + wsEsc(def.letter) + '.</span><span>' + wsEsc(def.meaning) + '</span></li>';
      }).join('') + '</ol>';
      partsHtml.push(
        '<section class="ws-section" data-ra-part="matching">'
        + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p3Copy.heading) + '</h2>'
        + (p3Copy.directions ? '<p class="ws-directions">' + wsEsc(p3Copy.directions) + '</p>' : '')
        + '</div><div class="vocab-match-grid">' + wCol + dCol + '</div></section>'
      );
      keySections.push({
        heading: p3Copy.heading,
        lines: model.matchWords.map(function (it) { return it.word + ' \u2014 ' + it.answerLetter + ' (' + it.meaning + ')'; })
      });
    }

    // Part 4 — Comprehension Questions or Write About What You Read
    if (!hp.writing) {
      if (model.questions.length) {
        var p4CopyQ = wsApplySectionCopy(ov, 'writing', null, 'Part 4 \u2014 Check Your Understanding', 'Answer each question below about what you read.');
        var qItemsHtml = model.questions.map(function (q, idx) {
          var n = idx + 1;
          if (q.kind === 'mc' && q.choices && q.choices.length) {
            var chHtml = '<ul class="ra-mc-choices">' + q.choices.map(function (c, ci) {
              return '<li class="ra-mc-choice"><span class="ra-mc-box" aria-hidden="true"></span><span class="vocab-match-letter">' + wsEsc(vocabLetterLabel(ci)) + '.</span><span>' + wsEsc(c) + '</span></li>';
            }).join('') + '</ul>';
            return '<li class="ra-check-item"><p class="ra-check-prompt"><strong>' + n + '.</strong> ' + wsEsc(q.prompt) + '</p>' + chHtml + '</li>';
          }
          return '<li class="ra-check-item"><p class="ra-check-prompt"><strong>' + n + '.</strong> ' + wsEsc(q.prompt) + '</p><div class="ra-write-lines"><div class="ra-write-line"></div><div class="ra-write-line"></div></div></li>';
        }).join('');
        partsHtml.push(
          '<section class="ws-section" data-ra-part="writing">'
          + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p4CopyQ.heading) + '</h2>'
          + (p4CopyQ.directions ? '<p class="ws-directions">' + wsEsc(p4CopyQ.directions) + '</p>' : '')
          + '</div><ol class="ra-check-list">' + qItemsHtml + '</ol></section>'
        );
        keySections.push({
          heading: p4CopyQ.heading,
          lines: model.questions.map(function (q) {
            if (q.kind === 'mc' && q.choices && q.choices.length) {
              return q.prompt + ' \u2014 ' + vocabLetterLabel(q.answer) + '. ' + (q.choices[q.answer] || '');
            }
            return q.prompt + ' \u2014 Open response (answers will vary)';
          })
        });
      } else {
        var p4CopyW = wsApplySectionCopy(ov, 'writing', null, 'Part 4 \u2014 Write About What You Read', 'Write a summary, main idea, or response about the passage on the lines below.');
        var wLines = '';
        for (var wi = 0; wi < model.writeLines; wi++) wLines += '<div class="ra-write-line"></div>';
        partsHtml.push(
          '<section class="ws-section" data-ra-part="writing">'
          + '<div class="ws-section-head"><h2 class="ws-section-title">' + wsEsc(p4CopyW.heading) + '</h2>'
          + (p4CopyW.directions ? '<p class="ws-directions">' + wsEsc(p4CopyW.directions) + '</p>' : '')
          + '</div><div class="ra-write-lines">' + wLines + '</div></section>'
        );
      }
    }

    var keyHtml = '';
    if (model.answerKeyOn && keySections.length) {
      keyHtml = '<section class="ws-key" data-answer-key="true" aria-label="Teacher answer key">'
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
      '<html lang="' + wsEsc(model.lang) + '"' + (model.isRtl ? ' dir="rtl"' : '') + '>',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      '<meta http-equiv="Content-Security-Policy" content="' + WS_CSP + '">',
      '<meta name="referrer" content="no-referrer">',
      '<title>' + wsEsc(model.title) + ' \u2014 Read-Along Worksheet</title>',
      '<style>' + RA_STANDALONE_CSS + '</style>',
      '</head>',
      '<body class="ws-density-' + wsEsc(model.density || 'standard') + '">',
      '<p class="ws-noprint">Print from your browser menu (Ctrl+P or Cmd+P). Keep the scale at 100%.</p>',
      '<header class="ws-header">',
      '<h1 class="ws-title">' + wsEsc(model.title) + '</h1>',
      wsSubtitleHtml(model.subtitle),
      wsHeaderMetaHtml(model.headerFields),
      '</header>',
      partsHtml.length ? partsHtml.join('\n') : '<p>No worksheet sections are visible.</p>',
      keyHtml,
      wsTemplateScriptTag('read-along', model, {
        syllables: model.showSyllables,
        bold: model.showBold,
        supports: model.showSupports,
        answerKey: model.answerKeyOn,
        writeLines: model.writeLines
      }),
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
    var wsCustom = wsCreateDefaultCustom(''), wsCustomizer = null;
    var vocabView = null, vocabNodes = {}, vocabState = null, vocabOwn = null, vocabRun = 0, vocabOpener = null, vocabBusy = false, vocabNote = '', vocabSyllableNote = '';
    var vocabOptions = { wordBank: true, pictures: true, answerKey: true, syllables: false };
    var vocabCustom = wsCreateDefaultCustom(''), vocabCustomizer = null;
    var raView = null, raNodes = {}, raState = null, raRun = 0, raOpener = null, raSyllableNote = '';
    var raOptions = { syllables: false, bold: false, supports: true, answerKey: true, writeLines: 5 };
    var raCustom = wsCreateDefaultCustom(''), raCustomizer = null;
    var customizerList = [];
    var docxWait = null;
    var audioView = null, audioNodes = {}, audioState = null, audioPlan = null, audioOpener = null;
    var audioIdx = 0, audioRunId = 0, audioPlaying = false, audioEl = null, audioTimer = null, audioRaf = 0, audioPlayed = Object.create(null);
    var audioOpts = { autoSec: 0, gapMs: 700, dirMode: 'section', slow: false, showAns: false };
    var audioScores = { studentName: '', examiner: '', items: Object.create(null), notes: '' };
    var audioScoredByIdx = Object.create(null);
    function onDocKeyDown(event) {
      var cardsOpen = !!(view && !view.hidden);
      var wsOpen = !!(wsView && !wsView.hidden);
      var vocabOpen = !!(vocabView && !vocabView.hidden);
      var raOpen = !!(raView && !raView.hidden);
      var audioOpen = !!(audioView && !audioView.hidden);
      if (!cardsOpen && !wsOpen && !vocabOpen && !raOpen && !audioOpen) return;
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        if (audioOpen) closeWorksheetAudio();
        else if (raOpen) closeReadAlongWorksheet();
        else if (vocabOpen) closeVocabWorksheet();
        else if (wsOpen) closeWorksheet();
        else close();
        return;
      }
      if (audioOpen && !event.defaultPrevented) {
        var tag = (event.target && event.target.tagName) || '';
        if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (event.code === 'Space') { event.preventDefault(); if (audioPlaying) stopAudioPlayback('Paused.'); else playCurrentAudioItem(false); }
        else if (event.key === 'r' || event.key === 'R') { event.preventDefault(); playCurrentAudioItem(true); }
        else if (event.key === 'ArrowRight') { event.preventDefault(); stepAudioItem(1); }
        else if (event.key === 'ArrowLeft') { event.preventDefault(); stepAudioItem(-1); }
        else if (event.key === '1') { event.preventDefault(); toggleAudioItemScore(audioIdx, 1); }
        else if (event.key === '0' && audioScoredByIdx[audioIdx] !== false) { event.preventDefault(); toggleAudioItemScore(audioIdx, 0); }
        else if ((event.key === 'p' || event.key === 'P') && audioScoredByIdx[audioIdx] !== false) { event.preventDefault(); bumpAudioItemRepeat(audioIdx); }
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
          drawVocabWorksheet({ keepStructure: true });
        }
        if (raOptions.syllables) {
          raSyllableNote = TEXT.syllablesFailed;
          drawReadAlongWorksheet({ keepStructure: true });
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
          raSyllableNote = '';
          draw();
          drawWorksheet({ keepStructure: true });
          drawVocabWorksheet({ keepStructure: true });
          drawReadAlongWorksheet({ keepStructure: true });
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
      nodes.docx = el('button', 'btn', 'Download Word cards (.docx)');
      nodes.docx.type = 'button';
      nodes.docx.id = 'pc-cards-docx';
      nodes.docx.addEventListener('click', downloadWordCardsDocx);
      nodes.back = el('button', 'btn', TEXT.back);
      nodes.back.type = 'button';
      nodes.back.addEventListener('click', close);
      actions.appendChild(nodes.print);
      actions.appendChild(nodes.docx);
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
      if (nodes.docx) nodes.docx.disabled = busy || !words.length;
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
      if (raView && !raView.hidden) { raRun++; raView.hidden = true; }
      if (audioView && !audioView.hidden) { stopAudioPlayback(); audioView.hidden = true; }
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
      if (audioView && !audioView.hidden && (!view || view.hidden)) { closeWorksheetAudio(); return; }
      if (raView && !raView.hidden && (!view || view.hidden)) { closeReadAlongWorksheet(); return; }
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
    function downloadWordCardsDocx() {
      if (busy || !state || !state.words || !state.words.length) return Promise.resolve(false);
      var shows = cardsShow();
      var shownPics = shows === 'word' ? Object.create(null) : pictures;
      var formatCardWord = function (word) {
        if (!options.syllables) return word;
        return String(word).replace(/[A-Za-z]+/g, function (tok) {
          var parts = tok.length >= 4 ? lookupSyllableParts(tok) : null;
          return parts && parts.length > 1 ? parts.join('\u00b7') : tok;
        });
      };
      var cardList = state.words.map(function (w) {
        var p = shownPics[w];
        return { word: w, displayWord: formatCardWord(w), pictureUri: p && p.uri ? p.uri : '' };
      });
      var docModel = {
        title: state.title || TEXT.title,
        cards: cardList,
        size: options.size,
        shows: shows,
        lines: options.lines,
        pages: options.pages,
        credits: creditsFor(state.words, shownPics, state.symbols, state.creditLine)
      };
      if (nodes.said) nodes.said.textContent = 'Preparing Word cards (.docx)...';
      return Promise.all([ensureZip(), ensureDocx()]).then(function (loaded) {
        var zipLib = loaded[0], docx = loaded[1];
        if (!zipLib || !docx || typeof docx.buildWordCardsDocx !== 'function' || typeof docx.downloadDocx !== 'function') {
          if (nodes.said) nodes.said.textContent = 'Word export could not load right now. Try Print instead.';
          return false;
        }
        return prepareDocxModelAsync(docx, docModel).then(function (prepared) {
          try {
            var res = docx.buildWordCardsDocx(prepared, {
              zip: zipLib,
              filename: wsSlug(state.title || 'word-cards') + '-word-cards' + DOCX_EXT
            });
            docx.downloadDocx(res, win, doc);
            if (nodes.said) nodes.said.textContent = 'Downloaded Word cards (.docx).';
            return true;
          } catch (_) {
            if (nodes.said) nodes.said.textContent = 'Could not build the Word cards document right now.';
            return false;
          }
        });
      });
    }
    function wire(button, getState) {
      if (!button || typeof getState !== 'function') return false;
      button.hidden = false;
      button.addEventListener('click', function () { opener = button; open(getState()); });
      return true;
    }

    // -------------------------------------------------------------------------
    // On-demand .docx loader & shared Live Worksheet Customizer UI
    // -------------------------------------------------------------------------
    function ensureDocx() {
      var existing = (win && win.AlloPacketDocx) || (root && root.AlloPacketDocx);
      if (existing && typeof existing.downloadDocx === 'function') return Promise.resolve(existing);
      if (docxWait) return docxWait;
      if (!doc || !doc.createElement) return Promise.resolve(null);
      docxWait = new Promise(function (resolve) {
        var settled = false;
        var finish = function () {
          if (settled) return;
          settled = true;
          var mod = (win && win.AlloPacketDocx) || (root && root.AlloPacketDocx) || null;
          if (!mod) docxWait = null;
          resolve(mod);
        };
        try {
          var existingScript = doc.querySelector && doc.querySelector('script[data-allo-docx="1"]');
          if (existingScript) {
            existingScript.addEventListener('load', finish);
            existingScript.addEventListener('error', finish);
            if (typeof win.setTimeout === 'function') win.setTimeout(finish, 4000);
            return;
          }
          var sc = doc.createElement('script');
          sc.src = 'packets_docx.js';
          sc.async = true;
          sc.setAttribute('data-allo-docx', '1');
          sc.onload = finish;
          sc.onerror = finish;
          (doc.head || doc.documentElement || doc.body).appendChild(sc);
        } catch (_) {
          docxWait = null;
          resolve(null);
        }
      });
      return docxWait;
    }
    var DOCX_EXT = '.' + 'docx';
    var ZIP_EXT = '.' + 'zip';
    var zipWait = null;
    function ensureZip() {
      var existing = (win && win.AlloPacketZip) || (root && root.AlloPacketZip);
      if (existing && typeof existing.create === 'function') return Promise.resolve(existing);
      if (zipWait) return zipWait;
      if (!doc || !doc.createElement) return Promise.resolve(null);
      zipWait = new Promise(function (resolve) {
        var settled = false;
        var finish = function () {
          if (settled) return;
          settled = true;
          var mod = (win && win.AlloPacketZip) || (root && root.AlloPacketZip) || null;
          if (!mod) zipWait = null;
          resolve(mod);
        };
        try {
          var existingScript = doc.querySelector && doc.querySelector('script[data-allo-zip="1"]');
          if (existingScript) {
            existingScript.addEventListener('load', finish);
            existingScript.addEventListener('error', finish);
            if (typeof win.setTimeout === 'function') win.setTimeout(finish, 4000);
            return;
          }
          var sc = doc.createElement('script');
          sc.src = 'packets_zip.js';
          sc.async = true;
          sc.setAttribute('data-allo-zip', '1');
          sc.onload = finish;
          sc.onerror = finish;
          (doc.head || doc.documentElement || doc.body).appendChild(sc);
        } catch (_) {
          zipWait = null;
          resolve(null);
        }
      });
      return zipWait;
    }
    function prepareDocxModelAsync(docx, docModel) {
      if (docx && typeof docx.prepareImagesAsync === 'function') {
        return Promise.resolve().then(function () {
          return docx.prepareImagesAsync(docModel, win, doc);
        }).then(function (prepared) {
          return prepared || docModel;
        }, function () {
          return docModel;
        });
      }
      return Promise.resolve(docModel);
    }
    function collectImageUriMap(origModel, preparedModel) {
      var map = Object.create(null);
      if (!origModel || !preparedModel) return map;
      var note = function (a, b) {
        if (typeof a === 'string' && a && typeof b === 'string' && b && a !== b) map[a] = b;
      };
      if (Array.isArray(origModel.sections) && Array.isArray(preparedModel.sections)) {
        origModel.sections.forEach(function (sec, si) {
          var pSec = preparedModel.sections[si];
          if (!sec || !pSec || !Array.isArray(sec.items) || !Array.isArray(pSec.items)) return;
          sec.items.forEach(function (it, ii) {
            var pIt = pSec.items[ii];
            if (it && pIt) {
              note(it.pictureUri, pIt.pictureUri);
              if (Array.isArray(it.parts) && Array.isArray(pIt.parts)) {
                it.parts.forEach(function (pt, pi) {
                  var pPt = pIt.parts[pi];
                  if (pt && pPt) note(pt.traceStripUri, pPt.traceStripUri);
                });
              }
            }
          });
        });
      }
      if (Array.isArray(origModel.pictureItems) && Array.isArray(preparedModel.pictureItems)) {
        origModel.pictureItems.forEach(function (it, ii) {
          var pIt = preparedModel.pictureItems[ii];
          if (it && pIt) note(it.uri, pIt.uri);
        });
      }
      if (Array.isArray(origModel.customSupports) && Array.isArray(preparedModel.customSupports)) {
        origModel.customSupports.forEach(function (sup, si) {
          var pSup = preparedModel.customSupports[si];
          if (sup && pSup) note(sup.imgUri, pSup.imgUri);
        });
      }
      return map;
    }
    function applyImageUriMap(docModel, uriMap) {
      if (!docModel || !uriMap) return docModel;
      var keys = Object.keys(uriMap);
      if (!keys.length) return docModel;
      if (Array.isArray(docModel.sections)) {
        docModel.sections.forEach(function (sec) {
          (sec && Array.isArray(sec.items) ? sec.items : []).forEach(function (it) {
            if (it && it.pictureUri && uriMap[it.pictureUri]) it.pictureUri = uriMap[it.pictureUri];
            if (it && Array.isArray(it.parts)) {
              it.parts.forEach(function (pt) {
                if (pt && pt.traceStripUri && uriMap[pt.traceStripUri]) pt.traceStripUri = uriMap[pt.traceStripUri];
              });
            }
          });
        });
      }
      if (Array.isArray(docModel.pictureItems)) {
        docModel.pictureItems.forEach(function (it) {
          if (it && it.uri && uriMap[it.uri]) it.uri = uriMap[it.uri];
        });
      }
      if (Array.isArray(docModel.customSupports)) {
        docModel.customSupports.forEach(function (sup) {
          if (sup && sup.imgUri && uriMap[sup.imgUri]) sup.imgUri = uriMap[sup.imgUri];
        });
      }
      return docModel;
    }
    function downloadZipBlob(zipParts, filename) {
      if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') return false;
      var blob = new win.Blob(zipParts, { type: 'application/zip' });
      var url = win.URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      link.download = filename;
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') {
        win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      }
      return true;
    }
    function appendWorksheetHeaderDom(header, model) {
      header.appendChild(el('h2', 'pc-ws-title', model.title));
      if (model.subtitle) header.appendChild(el('p', 'pc-ws-subtitle', model.subtitle));
      var meta = el('div', 'pc-ws-meta');
      ['Name:', 'Date:'].forEach(function (lbl) {
        var f = el('span', 'pc-ws-meta-field');
        f.appendChild(el('span', '', lbl));
        f.appendChild(el('span', 'pc-ws-meta-line'));
        meta.appendChild(f);
      });
      var hf = model.headerFields || {};
      if (hf.classPeriod) {
        var cf = el('span', 'pc-ws-meta-field');
        cf.appendChild(el('span', '', 'Class / Period:'));
        cf.appendChild(el('span', 'pc-ws-meta-line'));
        meta.appendChild(cf);
      }
      if (hf.score) {
        var sf = el('span', 'pc-ws-meta-field');
        sf.appendChild(el('span', '', 'Score:'));
        var sl = el('span', 'pc-ws-score-line');
        sl.appendChild(el('span', 'pc-ws-score-blank'));
        sl.appendChild(doc.createTextNode(' / '));
        sl.appendChild(el('span', 'pc-ws-score-blank'));
        sf.appendChild(sl);
        meta.appendChild(sf);
      }
      header.appendChild(meta);
    }
    function readTextFile(file) {
      if (!file) return Promise.resolve('');
      if (typeof file.text === 'function') {
        return Promise.resolve().then(function () { return file.text(); });
      }
      if (typeof win.FileReader === 'function') {
        return new Promise(function (resolve, reject) {
          var reader = new win.FileReader();
          reader.onload = function () { resolve(typeof reader.result === 'string' ? reader.result : ''); };
          reader.onerror = function () { reject(new Error('Could not read file.')); };
          reader.readAsText(file);
        });
      }
      return Promise.reject(new Error('File reading is unavailable.'));
    }
    function createCustomizerUi(prefix, kind, getCustom, callbacks) {
      var details = el('details', 'pc-options pc-customizer');
      details.id = 'pc-' + prefix + '-customizer';
      var summary = el('summary', '');
      summary.appendChild(el('span', '', 'Customize worksheet'));
      var badge = el('span', 'pc-cust-badge', '');
      badge.id = 'pc-' + prefix + '-cust-badge';
      summary.appendChild(badge);
      details.appendChild(summary);

      var body = el('div', 'pc-options-body pc-cust-body');

      // Reusable device presets + shareable JSON / reopenable HTML worksheet templates
      var tplGroup = el('fieldset', 'pc-cust-group pc-cust-templates');
      tplGroup.id = 'pc-' + prefix + '-cust-templates';
      tplGroup.appendChild(el('legend', 'pc-cust-legend', 'Templates & presets'));

      var presetRow = el('div', 'pc-cust-tpl-row');
      var presetSelect = el('select', 'pc-cust-select pc-cust-tpl-select');
      presetSelect.id = 'pc-' + prefix + '-cust-preset-select';
      presetSelect.setAttribute('aria-label', 'Saved worksheet presets');

      var presetNameInput = el('input', 'pc-cust-input pc-cust-tpl-name');
      presetNameInput.type = 'text';
      presetNameInput.id = 'pc-' + prefix + '-cust-preset-name';
      presetNameInput.maxLength = 50;
      presetNameInput.placeholder = 'Preset name (e.g. Grade 1 Primary)';
      presetNameInput.setAttribute('aria-label', 'Worksheet preset name');

      var savePresetBtn = el('button', 'btn btn-small pc-cust-tpl-btn', 'Save preset');
      savePresetBtn.type = 'button';
      savePresetBtn.id = 'pc-' + prefix + '-cust-preset-save';

      var deletePresetBtn = el('button', 'btn btn-small pc-cust-tpl-btn', 'Delete');
      deletePresetBtn.type = 'button';
      deletePresetBtn.id = 'pc-' + prefix + '-cust-preset-delete';
      deletePresetBtn.setAttribute('aria-label', 'Delete selected preset');
      deletePresetBtn.disabled = true;

      presetRow.appendChild(presetSelect);
      presetRow.appendChild(presetNameInput);
      presetRow.appendChild(savePresetBtn);
      presetRow.appendChild(deletePresetBtn);
      tplGroup.appendChild(presetRow);

      var fileRow = el('div', 'pc-cust-tpl-files');
      var exportTplBtn = el('button', 'btn btn-small pc-cust-tpl-btn', 'Save template (.json)');
      exportTplBtn.type = 'button';
      exportTplBtn.id = 'pc-' + prefix + '-cust-tpl-export';

      var importTplBtn = el('button', 'btn btn-small pc-cust-tpl-btn', 'Load template / worksheet');
      importTplBtn.type = 'button';
      importTplBtn.id = 'pc-' + prefix + '-cust-tpl-import';

      var tplFileInput = el('input');
      tplFileInput.type = 'file';
      tplFileInput.id = 'pc-' + prefix + '-cust-tpl-file';
      tplFileInput.accept = '.json,.html,.htm,application/json,text/html';
      tplFileInput.setAttribute('aria-label', 'Load worksheet template or HTML worksheet');
      tplFileInput.hidden = true;

      fileRow.appendChild(exportTplBtn);
      fileRow.appendChild(importTplBtn);
      fileRow.appendChild(tplFileInput);
      tplGroup.appendChild(fileRow);

      var tplStatus = el('p', 'pc-cust-tpl-status', '');
      tplStatus.id = 'pc-' + prefix + '-cust-tpl-status';
      tplStatus.setAttribute('role', 'status');
      tplStatus.setAttribute('aria-live', 'polite');
      tplGroup.appendChild(tplStatus);

      body.appendChild(tplGroup);

      var topGrid = el('div', 'pc-cust-grid');

      var titleWrap = el('div', 'pc-cust-field');
      var titleLbl = el('label', '', 'Worksheet title');
      titleLbl.htmlFor = 'pc-' + prefix + '-cust-title';
      var titleInput = el('input', 'pc-cust-input');
      titleInput.type = 'text';
      titleInput.id = 'pc-' + prefix + '-cust-title';
      titleInput.maxLength = 120;
      titleInput.addEventListener('input', function () {
        var c = getCustom();
        c.title = titleInput.value;
        callbacks.onUpdate({ keepStructure: true });
      });
      titleWrap.appendChild(titleLbl);
      titleWrap.appendChild(titleInput);
      topGrid.appendChild(titleWrap);

      var subWrap = el('div', 'pc-cust-field');
      var subLbl = el('label', '', 'Subtitle or teacher note (optional)');
      subLbl.htmlFor = 'pc-' + prefix + '-cust-subtitle';
      var subInput = el('input', 'pc-cust-input');
      subInput.type = 'text';
      subInput.id = 'pc-' + prefix + '-cust-subtitle';
      subInput.maxLength = 200;
      subInput.placeholder = 'Optional note printed under the title';
      subInput.addEventListener('input', function () {
        var c = getCustom();
        c.subtitle = subInput.value;
        callbacks.onUpdate({ keepStructure: true });
      });
      subWrap.appendChild(subLbl);
      subWrap.appendChild(subInput);
      topGrid.appendChild(subWrap);

      var densWrap = el('div', 'pc-cust-field');
      var densLbl = el('label', '', 'Page density & writing size');
      densLbl.htmlFor = 'pc-' + prefix + '-cust-density';
      var densSelect = el('select', 'pc-cust-select');
      densSelect.id = 'pc-' + prefix + '-cust-density';
      [
        ['compact', 'Compact (fit more on 1 page)'],
        ['standard', 'Standard (default)'],
        ['primary', 'Primary / Large (bigger text & taller lines)']
      ].forEach(function (pair) {
        var opt = el('option', '', pair[1]);
        opt.value = pair[0];
        if (pair[0] === 'standard') opt.selected = true;
        densSelect.appendChild(opt);
      });
      densSelect.addEventListener('change', function () {
        var c = getCustom();
        c.density = wsNormalizeDensity(densSelect.value);
        callbacks.onUpdate({ keepStructure: true });
      });
      densWrap.appendChild(densLbl);
      densWrap.appendChild(densSelect);
      topGrid.appendChild(densWrap);
      body.appendChild(topGrid);

      var hfGroup = el('fieldset', 'pc-cust-group');
      hfGroup.appendChild(el('legend', 'pc-cust-legend', 'Extra header fields (Name & Date are always shown)'));
      var hfRow = el('div', 'pc-cust-headers');
      var makeHeaderChk = function (id, labelText, fieldKey) {
        var lbl = el('label', 'radio pc-radio pc-check pc-cust-check');
        var inp = el('input');
        inp.type = 'checkbox';
        inp.id = id;
        inp.addEventListener('change', function () {
          var c = getCustom();
          if (!c.headerFields) c.headerFields = { classPeriod: false, score: false };
          c.headerFields[fieldKey] = !!inp.checked;
          lbl.classList.toggle('is-on', !!inp.checked);
          callbacks.onUpdate({ keepStructure: true });
        });
        lbl.appendChild(inp);
        lbl.appendChild(el('span', '', labelText));
        hfRow.appendChild(lbl);
        return inp;
      };
      var classBox = makeHeaderChk('pc-' + prefix + '-cust-class', 'Class / Period', 'classPeriod');
      var scoreBox = makeHeaderChk('pc-' + prefix + '-cust-score', 'Score: ___ / ___', 'score');
      hfGroup.appendChild(hfRow);
      body.appendChild(hfGroup);

      var secGroup = el('fieldset', 'pc-cust-group');
      secGroup.appendChild(el('legend', 'pc-cust-legend', 'Sections & directions'));
      var sectionsHost = el('div', 'pc-cust-sections');
      secGroup.appendChild(sectionsHost);
      body.appendChild(secGroup);

      var sharedGroup = el('fieldset', 'pc-cust-group');
      sharedGroup.hidden = true;
      sharedGroup.appendChild(el('legend', 'pc-cust-legend', 'Items (hide, reorder, or edit)'));
      var sharedHost = el('div', 'pc-cust-items');
      sharedGroup.appendChild(sharedHost);
      body.appendChild(sharedGroup);

      var expandedEditors = Object.create(null);
      var pendingFocusAttr = null;

      var footer = el('div', 'pc-cust-footer');
      var hiddenCountEl = el('span', 'pc-cust-hidden-count', '');
      hiddenCountEl.id = 'pc-' + prefix + '-cust-hidden-count';
      hiddenCountEl.setAttribute('role', 'status');
      var restoreBtn = el('button', 'btn btn-small pc-cust-restore', 'Restore all items');
      restoreBtn.type = 'button';
      restoreBtn.id = 'pc-' + prefix + '-cust-restore';
      restoreBtn.addEventListener('click', function () {
        var c = getCustom();
        c.hiddenItems = Object.create(null);
        callbacks.onUpdate({ keepStructure: false });
      });
      var resetBtn = el('button', 'btn btn-small pc-cust-reset', 'Reset customizations');
      resetBtn.type = 'button';
      resetBtn.id = 'pc-' + prefix + '-cust-reset';
      resetBtn.addEventListener('click', function () {
        expandedEditors = Object.create(null);
        presetSelect.value = '';
        deletePresetBtn.disabled = true;
        tplStatus.textContent = '';
        callbacks.onReset();
      });
      footer.appendChild(hiddenCountEl);
      footer.appendChild(restoreBtn);
      footer.appendChild(resetBtn);
      body.appendChild(footer);

      details.appendChild(body);

      var makeItemRow = function (secKey, item, pos, total, allItemsInSec, onToggled) {
        var c = getCustom();
        var itemKey = item.key;
        var label = item.label;
        var indexNum = pos + 1;
        var origIdx = typeof item.origIndex === 'number' ? item.origIndex : pos;
        var isHidden = !!(c.hiddenItems && c.hiddenItems[itemKey]);
        var editFields = Array.isArray(item.editFields) ? item.editFields : [];

        var row = el('div', 'pc-cust-item-row' + (isHidden ? ' is-hidden' : ''));
        row.setAttribute('data-cust-row', itemKey);
        row.setAttribute('data-cust-orig-idx', String(origIdx));

        var main = el('div', 'pc-cust-item-main');
        var btn = el('button', 'pc-cust-chip' + (isHidden ? ' is-hidden' : ''));
        btn.type = 'button';
        btn.setAttribute('data-cust-item', itemKey);
        var syncChip = function () {
          var cur = getCustom();
          var hid = !!(cur.hiddenItems && cur.hiddenItems[itemKey]);
          row.classList.toggle('is-hidden', hid);
          btn.classList.toggle('is-hidden', hid);
          btn.setAttribute('aria-pressed', hid ? 'true' : 'false');
          btn.textContent = hid ? ('Restore: ' + label) : ('#' + indexNum + ' ' + label);
          btn.setAttribute('aria-label', hid ? ('Restore item ' + label) : ('Hide item ' + indexNum + ': ' + label));
        };
        syncChip();
        btn.addEventListener('click', function () {
          var cur = getCustom();
          if (!cur.hiddenItems) cur.hiddenItems = Object.create(null);
          if (cur.hiddenItems[itemKey]) delete cur.hiddenItems[itemKey];
          else cur.hiddenItems[itemKey] = true;
          syncChip();
          if (typeof onToggled === 'function') onToggled();
          callbacks.onUpdate({ keepStructure: true });
        });
        main.appendChild(btn);

        var btns = el('div', 'pc-cust-item-btns');
        var moveItem = function (delta) {
          var targetPos = pos + delta;
          if (targetPos < 0 || targetPos >= total) return;
          var cur = getCustom();
          if (!cur.itemOrder) cur.itemOrder = Object.create(null);
          var order = allItemsInSec.map(function (entry, idx) {
            return typeof entry.origIndex === 'number' ? entry.origIndex : idx;
          });
          var tmp = order[pos];
          order[pos] = order[targetPos];
          order[targetPos] = tmp;
          var natural = order.slice().sort(function (a, b) { return a - b; });
          var isNatural = order.every(function (v, idx) { return v === natural[idx]; });
          if (isNatural) delete cur.itemOrder[secKey];
          else cur.itemOrder[secKey] = order;
          var nextDir = (delta < 0 && targetPos === 0) ? 'down' : ((delta > 0 && targetPos === total - 1) ? 'up' : (delta < 0 ? 'up' : 'down'));
          pendingFocusAttr = { section: secKey, origIdx: String(origIdx), dir: nextDir };
          callbacks.onUpdate({ keepStructure: false });
        };

        var upBtn = el('button', 'btn btn-small pc-cust-move', '\u2191');
        upBtn.type = 'button';
        upBtn.setAttribute('data-cust-move', 'up');
        upBtn.setAttribute('data-cust-section', secKey);
        upBtn.setAttribute('data-cust-orig-idx', String(origIdx));
        upBtn.setAttribute('aria-label', 'Move item ' + indexNum + ' up');
        upBtn.disabled = pos === 0 || total < 2;
        upBtn.addEventListener('click', function () { moveItem(-1); });
        btns.appendChild(upBtn);

        var downBtn = el('button', 'btn btn-small pc-cust-move', '\u2193');
        downBtn.type = 'button';
        downBtn.setAttribute('data-cust-move', 'down');
        downBtn.setAttribute('data-cust-section', secKey);
        downBtn.setAttribute('data-cust-orig-idx', String(origIdx));
        downBtn.setAttribute('aria-label', 'Move item ' + indexNum + ' down');
        downBtn.disabled = pos >= total - 1 || total < 2;
        downBtn.addEventListener('click', function () { moveItem(1); });
        btns.appendChild(downBtn);

        var editorBox = null;
        if (editFields.length) {
          var hasFieldOverride = function () {
            var cur = getCustom();
            return editFields.some(function (f) {
              return !!(cur.itemTextOverrides && cur.itemTextOverrides[f.key]);
            });
          };
          var isOpen = !!expandedEditors[itemKey];
          var editBtn = el('button', 'btn btn-small pc-cust-edit-btn' + (hasFieldOverride() ? ' is-edited' : ''), 'Edit');
          editBtn.type = 'button';
          editBtn.setAttribute('data-cust-edit-toggle', itemKey);
          editBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          editBtn.setAttribute('aria-label', 'Edit item ' + indexNum + ' wording');

          editorBox = el('div', 'pc-cust-item-editor');
          editorBox.setAttribute('data-cust-editor', itemKey);
          editorBox.hidden = !isOpen;

          var firstInp = null;
          editFields.forEach(function (field, fIdx) {
            var fWrap = el('div', 'pc-cust-field');
            var inpId = 'pc-' + prefix + '-edit-' + secKey.replace(/[^a-z0-9_-]/gi, '') + '-' + origIdx + '-' + fIdx;
            var fLbl = el('label', '', field.label || 'Custom wording');
            fLbl.htmlFor = inpId;
            var inp = el('input', 'pc-cust-input');
            inp.type = 'text';
            inp.id = inpId;
            inp.maxLength = 240;
            inp.placeholder = field.placeholder || 'Type custom wording for this item';
            inp.setAttribute('data-cust-edit-input', field.key);
            var curOv = c.itemTextOverrides && c.itemTextOverrides[field.key];
            inp.value = curOv || (field.defaultValue || '');
            inp.addEventListener('input', function () {
              var cur = getCustom();
              if (!cur.itemTextOverrides) cur.itemTextOverrides = Object.create(null);
              var rawVal = inp.value;
              var trimVal = rawVal.trim();
              var defTrim = String(field.defaultValue || '').trim();
              if (!trimVal || trimVal === defTrim) delete cur.itemTextOverrides[field.key];
              else cur.itemTextOverrides[field.key] = rawVal;
              editBtn.classList.toggle('is-edited', hasFieldOverride());
              callbacks.onUpdate({ keepStructure: true });
            });
            fWrap.appendChild(fLbl);
            fWrap.appendChild(inp);
            editorBox.appendChild(fWrap);
            if (!firstInp) firstInp = inp;
          });

          editBtn.addEventListener('click', function () {
            var nextOpen = editorBox.hidden;
            editorBox.hidden = !nextOpen;
            if (nextOpen) expandedEditors[itemKey] = true;
            else delete expandedEditors[itemKey];
            editBtn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
            if (nextOpen && firstInp && typeof firstInp.focus === 'function') firstInp.focus();
          });
          btns.appendChild(editBtn);
        }

        main.appendChild(btns);
        row.appendChild(main);
        if (editorBox) row.appendChild(editorBox);
        return row;
      };

      var sync = function (desc, syncOpts) {
        var c = getCustom();
        var d = desc || { defaultTitle: '', sections: [], sharedItems: [], hasItemToggles: false };
        var keepStructure = !!(syncOpts && syncOpts.keepStructure);
        var curTitle = c.title != null ? String(c.title) : String(d.defaultTitle || '');
        if (doc.activeElement !== titleInput) titleInput.value = curTitle;
        if (doc.activeElement !== subInput) subInput.value = String(c.subtitle || '');
        densSelect.value = wsNormalizeDensity(c.density);
        classBox.checked = !!(c.headerFields && c.headerFields.classPeriod);
        if (classBox.parentNode) classBox.parentNode.classList.toggle('is-on', classBox.checked);
        scoreBox.checked = !!(c.headerFields && c.headerFields.score);
        if (scoreBox.parentNode) scoreBox.parentNode.classList.toggle('is-on', scoreBox.checked);

        var hiddenItemCount = wsCountHidden(c.hiddenItems);
        var hiddenSecCount = wsCountHidden(c.hiddenSections);
        var editsCount = 0;
        if (curTitle.trim() && d.defaultTitle && curTitle.trim() !== String(d.defaultTitle).trim()) editsCount++;
        if (String(c.subtitle || '').trim()) editsCount++;
        if (classBox.checked) editsCount++;
        if (scoreBox.checked) editsCount++;
        if (wsNormalizeDensity(c.density) !== 'standard') editsCount++;
        editsCount += hiddenSecCount + hiddenItemCount;
        Object.keys(c.sectionOverrides || {}).forEach(function (k) {
          var ov = c.sectionOverrides[k];
          if (ov && ((typeof ov.heading === 'string' && ov.heading.trim()) || typeof ov.directions === 'string')) editsCount++;
        });
        Object.keys(c.itemOrder || {}).forEach(function (k) {
          if (Array.isArray(c.itemOrder[k]) && c.itemOrder[k].length) editsCount++;
        });
        Object.keys(c.itemTextOverrides || {}).forEach(function (k) {
          if (typeof c.itemTextOverrides[k] === 'string' && c.itemTextOverrides[k].trim()) editsCount++;
        });
        badge.textContent = editsCount > 0 ? (count(editsCount, 'edit')) : '';

        var hasToggles = !!d.hasItemToggles;
        hiddenCountEl.hidden = !hasToggles;
        restoreBtn.hidden = !hasToggles;
        if (hasToggles) {
          hiddenCountEl.textContent = hiddenItemCount > 0
            ? (count(hiddenItemCount, 'item') + ' hidden')
            : 'All items shown';
          restoreBtn.disabled = hiddenItemCount === 0;
        }

        if (keepStructure) return;

        while (sectionsHost.firstChild) sectionsHost.removeChild(sectionsHost.firstChild);
        var secs = Array.isArray(d.sections) ? d.sections : [];
        secGroup.hidden = secs.length === 0;
        secs.forEach(function (sec, secIdx) {
          var secHidden = !!(c.hiddenSections && c.hiddenSections[sec.key]);
          var ov = (c.sectionOverrides && c.sectionOverrides[sec.key]) || {};
          var card = el('div', 'pc-cust-sec-card' + (secHidden ? ' is-hidden' : ''));
          card.setAttribute('data-cust-section', sec.key);

          var topRow = el('div', 'pc-cust-sec-top');
          var toggleLbl = el('label', 'radio pc-radio pc-check pc-cust-sec-toggle');
          var toggleBox = el('input');
          toggleBox.type = 'checkbox';
          toggleBox.id = 'pc-' + prefix + '-sec-vis-' + secIdx;
          toggleBox.checked = !secHidden;
          toggleBox.setAttribute('data-cust-sec-vis', sec.key);
          toggleLbl.classList.toggle('is-on', toggleBox.checked);
          toggleLbl.appendChild(toggleBox);
          toggleLbl.appendChild(el('span', '', sec.defaultHeading));
          var countSpan = el('span', 'pc-cust-sec-count', '');
          var updateSecCount = function () {
            var cur = getCustom();
            var isHid = !!(cur.hiddenSections && cur.hiddenSections[sec.key]);
            if (isHid) { countSpan.textContent = 'Hidden'; return; }
            if (Array.isArray(sec.items) && sec.items.length) {
              var visN = sec.items.filter(function (it) { return !(cur.hiddenItems && cur.hiddenItems[it.key]); }).length;
              countSpan.textContent = visN + ' of ' + count(sec.items.length, 'item');
            } else {
              countSpan.textContent = 'Shown';
            }
          };
          updateSecCount();
          toggleBox.addEventListener('change', function () {
            var cur = getCustom();
            if (!cur.hiddenSections) cur.hiddenSections = Object.create(null);
            if (toggleBox.checked) delete cur.hiddenSections[sec.key];
            else cur.hiddenSections[sec.key] = true;
            toggleLbl.classList.toggle('is-on', toggleBox.checked);
            card.classList.toggle('is-hidden', !toggleBox.checked);
            updateSecCount();
            callbacks.onUpdate({ keepStructure: true });
          });
          topRow.appendChild(toggleLbl);
          topRow.appendChild(countSpan);
          card.appendChild(topRow);

          var fieldsRow = el('div', 'pc-cust-sec-fields');
          var hField = el('div', 'pc-cust-field');
          var hLbl = el('label', '', 'Section heading');
          hLbl.htmlFor = 'pc-' + prefix + '-sec-h-' + secIdx;
          var hInp = el('input', 'pc-cust-input');
          hInp.type = 'text';
          hInp.id = 'pc-' + prefix + '-sec-h-' + secIdx;
          hInp.maxLength = 120;
          hInp.value = (typeof ov.heading === 'string' && ov.heading.trim()) ? ov.heading : sec.defaultHeading;
          hInp.setAttribute('data-cust-sec-heading', sec.key);
          hInp.addEventListener('input', function () {
            var cur = getCustom();
            if (!cur.sectionOverrides) cur.sectionOverrides = Object.create(null);
            var existingOv = cur.sectionOverrides[sec.key] || {};
            if (hInp.value.trim() === sec.defaultHeading) delete existingOv.heading;
            else existingOv.heading = hInp.value;
            if (existingOv.heading === undefined && existingOv.directions === undefined) delete cur.sectionOverrides[sec.key];
            else cur.sectionOverrides[sec.key] = existingOv;
            callbacks.onUpdate({ keepStructure: true });
          });
          hField.appendChild(hLbl);
          hField.appendChild(hInp);
          fieldsRow.appendChild(hField);

          var dField = el('div', 'pc-cust-field');
          var dLbl = el('label', '', 'Directions');
          dLbl.htmlFor = 'pc-' + prefix + '-sec-d-' + secIdx;
          var dInp = el('input', 'pc-cust-input');
          dInp.type = 'text';
          dInp.id = 'pc-' + prefix + '-sec-d-' + secIdx;
          dInp.maxLength = 240;
          dInp.value = typeof ov.directions === 'string' ? ov.directions : (sec.defaultDirections || '');
          dInp.setAttribute('data-cust-sec-dir', sec.key);
          dInp.addEventListener('input', function () {
            var cur = getCustom();
            if (!cur.sectionOverrides) cur.sectionOverrides = Object.create(null);
            var existingOv = cur.sectionOverrides[sec.key] || {};
            if (dInp.value === (sec.defaultDirections || '')) delete existingOv.directions;
            else existingOv.directions = dInp.value;
            if (existingOv.heading === undefined && existingOv.directions === undefined) delete cur.sectionOverrides[sec.key];
            else cur.sectionOverrides[sec.key] = existingOv;
            callbacks.onUpdate({ keepStructure: true });
          });
          dField.appendChild(dLbl);
          dField.appendChild(dInp);
          fieldsRow.appendChild(dField);
          card.appendChild(fieldsRow);

          if (Array.isArray(sec.items) && sec.items.length) {
            var itemsBox = el('div', 'pc-cust-items');
            itemsBox.appendChild(el('span', 'pc-cust-items-label', 'Items in this section (hide, reorder, or edit):'));
            sec.items.forEach(function (it, iIdx) {
              itemsBox.appendChild(makeItemRow(sec.key, it, iIdx, sec.items.length, sec.items, updateSecCount));
            });
            card.appendChild(itemsBox);
          }

          sectionsHost.appendChild(card);
        });

        while (sharedHost.firstChild) sharedHost.removeChild(sharedHost.firstChild);
        var shared = Array.isArray(d.sharedItems) ? d.sharedItems : [];
        var sharedSecKey = d.sharedSectionKey || 'words';
        sharedGroup.hidden = shared.length === 0;
        shared.forEach(function (it, idx) {
          sharedHost.appendChild(makeItemRow(sharedSecKey, it, idx, shared.length, shared));
        });
        if (pendingFocusAttr) {
          var pf = pendingFocusAttr;
          pendingFocusAttr = null;
          var moveTarget = details.querySelector(
            'button.pc-cust-move[data-cust-section="' + pf.section + '"][data-cust-orig-idx="' + pf.origIdx + '"][data-cust-move="' + pf.dir + '"]'
          );
          if (moveTarget && !moveTarget.disabled && typeof moveTarget.focus === 'function') moveTarget.focus();
        }
        refreshPresets();
      };

      var apiObj = null;
      var refreshPresets = function (selectedId) {
        var keep = selectedId !== undefined ? String(selectedId || '') : String(presetSelect.value || '');
        var list = wsLoadPresets(win);
        while (presetSelect.firstChild) presetSelect.removeChild(presetSelect.firstChild);
        var ph = el('option', '', 'Saved presets...');
        ph.value = '';
        presetSelect.appendChild(ph);
        var matched = false;
        list.forEach(function (p) {
          var opt = el('option', '', p.name);
          opt.value = p.id;
          if (keep && p.id === keep) {
            opt.selected = true;
            matched = true;
          }
          presetSelect.appendChild(opt);
        });
        presetSelect.value = matched ? keep : '';
        deletePresetBtn.disabled = !matched;
      };
      var refreshAllCustomizers = function (selectedForSelf) {
        refreshPresets(selectedForSelf);
        customizerList.forEach(function (inst) {
          if (inst !== apiObj && typeof inst.refreshPresets === 'function') inst.refreshPresets();
        });
      };
      var resetTemplatesUi = function () {
        expandedEditors = Object.create(null);
        presetNameInput.value = '';
        tplStatus.textContent = '';
        refreshPresets('');
      };
      var applyPresetEntry = function (preset) {
        var c = getCustom();
        c.subtitle = String(preset.subtitle || '');
        c.headerFields = {
          classPeriod: !!(preset.headerFields && preset.headerFields.classPeriod),
          score: !!(preset.headerFields && preset.headerFields.score)
        };
        c.density = wsNormalizeDensity(preset.density);
        var sameKind = preset.kind === kind;
        if (sameKind) {
          c.sectionOverrides = wsNormalizeOverrides(preset.sectionOverrides);
          c.hiddenSections = wsToBoolMap(preset.hiddenSections);
          c.hiddenParts = c.hiddenSections;
        }
        var post = typeof callbacks.onApplyOptions === 'function' ? callbacks.onApplyOptions(preset.options || {}) : null;
        callbacks.onUpdate({ keepStructure: false });
        if (post && typeof post.afterDraw === 'function') post.afterDraw();
        tplStatus.textContent = sameKind
          ? ('Applied preset "' + preset.name + '".')
          : ('Applied layout and options from preset "' + preset.name + '".');
      };
      var applyLoadedTemplate = function (tpl) {
        var c = getCustom();
        var sameKind = tpl.kind === kind;
        if (sameKind && tpl.title) c.title = tpl.title;
        c.subtitle = String(tpl.subtitle || '');
        c.headerFields = {
          classPeriod: !!(tpl.headerFields && tpl.headerFields.classPeriod),
          score: !!(tpl.headerFields && tpl.headerFields.score)
        };
        c.density = wsNormalizeDensity(tpl.density);
        if (sameKind) {
          c.sectionOverrides = wsNormalizeOverrides(tpl.sectionOverrides);
          c.hiddenSections = wsToBoolMap(tpl.hiddenSections);
          c.hiddenParts = c.hiddenSections;
          var rawHiddenItems = wsToBoolMap(tpl.hiddenItems);
          c.hiddenItems = typeof callbacks.normalizeHiddenItems === 'function'
            ? callbacks.normalizeHiddenItems(rawHiddenItems)
            : rawHiddenItems;
          c.itemOrder = wsNormalizeItemOrder(tpl.itemOrder);
          c.itemTextOverrides = wsNormalizeItemTextOverrides(tpl.itemTextOverrides);
        }
        var post = typeof callbacks.onApplyOptions === 'function' ? callbacks.onApplyOptions(tpl.options || {}) : null;
        presetSelect.value = '';
        deletePresetBtn.disabled = true;
        callbacks.onUpdate({ keepStructure: false });
        if (post && typeof post.afterDraw === 'function') post.afterDraw();
        if (sameKind) {
          tplStatus.textContent = tpl.title
            ? ('Loaded worksheet template "' + tpl.title + '".')
            : 'Loaded worksheet template.';
        } else {
          tplStatus.textContent = 'Loaded layout settings from a ' + wsTemplateKindLabel(tpl.kind) + ' template (sections kept for this worksheet).';
        }
      };

      presetSelect.addEventListener('change', function () {
        var id = String(presetSelect.value || '');
        deletePresetBtn.disabled = !id;
        if (!id) return;
        var list = wsLoadPresets(win);
        var found = null;
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) { found = list[i]; break; }
        }
        if (!found) {
          refreshPresets('');
          tplStatus.textContent = 'That preset is no longer saved on this device.';
          return;
        }
        applyPresetEntry(found);
      });

      var handleSavePreset = function () {
        var name = wsTrimLimit(presetNameInput.value, 50);
        if (!name) {
          tplStatus.textContent = 'Enter a preset name first.';
          if (typeof presetNameInput.focus === 'function') presetNameInput.focus();
          return;
        }
        var c = wsCloneCustom(getCustom());
        var optsSnap = typeof callbacks.getOptions === 'function' ? callbacks.getOptions() : {};
        var existing = wsLoadPresets(win);
        var lowName = name.toLowerCase();
        var prev = null;
        var rest = [];
        for (var i = 0; i < existing.length; i++) {
          if (existing[i].name.toLowerCase() === lowName) prev = existing[i];
          else rest.push(existing[i]);
        }
        var id = (prev && prev.id) || ('p_' + wsHash(lowName + '|' + Date.now() + '|' + rest.length).toString(36));
        var entry = {
          id: id,
          name: name,
          kind: kind,
          savedAt: Date.now(),
          subtitle: c.subtitle,
          headerFields: c.headerFields,
          density: c.density,
          sectionOverrides: wsPlainOverrides(c.sectionOverrides),
          hiddenSections: wsPlainBoolMap(c.hiddenSections, 32, 64),
          options: wsNormalizeTemplateOptions(kind, optsSnap)
        };
        var saved = wsSavePresets(win, [entry].concat(rest).slice(0, WS_PRESETS_MAX));
        if (!saved.ok) {
          tplStatus.textContent = saved.why;
          return;
        }
        presetNameInput.value = '';
        refreshAllCustomizers(entry.id);
        tplStatus.textContent = 'Saved preset "' + entry.name + '" on this device.';
      };
      savePresetBtn.addEventListener('click', handleSavePreset);
      presetNameInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          handleSavePreset();
        }
      });

      deletePresetBtn.addEventListener('click', function () {
        var id = String(presetSelect.value || '');
        if (!id) return;
        var existing = wsLoadPresets(win);
        var removed = null;
        var remaining = [];
        for (var i = 0; i < existing.length; i++) {
          if (existing[i].id === id) removed = existing[i];
          else remaining.push(existing[i]);
        }
        if (!removed) {
          refreshAllCustomizers('');
          return;
        }
        var saved = wsSavePresets(win, remaining);
        if (!saved.ok) {
          tplStatus.textContent = saved.why;
          return;
        }
        refreshAllCustomizers('');
        tplStatus.textContent = 'Deleted preset "' + removed.name + '".';
      });

      exportTplBtn.addEventListener('click', function () {
        var c = wsCloneCustom(getCustom());
        var defTitle = typeof callbacks.getDefaultTitle === 'function' ? callbacks.getDefaultTitle() : '';
        if (!c.title && defTitle) c.title = defTitle;
        var optsSnap = typeof callbacks.getOptions === 'function' ? callbacks.getOptions() : {};
        var jsonText = serializeWorksheetTemplate(kind, c, optsSnap, { pretty: true });
        if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') {
          tplStatus.textContent = 'File download is not available in this browser.';
          return;
        }
        var blob = new win.Blob([jsonText], { type: 'application/json;charset=utf-8' });
        var url = win.URL.createObjectURL(blob);
        var link = doc.createElement('a');
        link.href = url;
        link.download = wsSlug(c.title || kind) + '-worksheet-template.' + 'json';
        link.hidden = true;
        doc.body.appendChild(link);
        link.click();
        doc.body.removeChild(link);
        if (typeof win.setTimeout === 'function') {
          win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
        }
        tplStatus.textContent = 'Saved worksheet template (.json).';
      });

      importTplBtn.addEventListener('click', function () {
        tplFileInput.click();
      });
      tplFileInput.addEventListener('change', function () {
        var file = tplFileInput.files && tplFileInput.files[0];
        try { tplFileInput.value = ''; } catch (_) {}
        if (!file) return;
        if (typeof file.size === 'number' && file.size > WS_TEMPLATE_MAX_BYTES) {
          tplStatus.textContent = 'Could not load template: This file is larger than the 200 KB worksheet template limit.';
          return;
        }
        readTextFile(file).then(function (text) {
          var res = extractWorksheetTemplate(text);
          if (!res.ok) {
            tplStatus.textContent = 'Could not load template: ' + (res.why || 'Invalid template file.');
            return;
          }
          applyLoadedTemplate(res.template);
        }, function () {
          tplStatus.textContent = 'Could not read the selected file.';
        });
      });

      apiObj = {
        details: details,
        badge: badge,
        titleInput: titleInput,
        subtitleInput: subInput,
        densitySelect: densSelect,
        classBox: classBox,
        scoreBox: scoreBox,
        hiddenCount: hiddenCountEl,
        restoreBtn: restoreBtn,
        resetBtn: resetBtn,
        presetSelect: presetSelect,
        presetNameInput: presetNameInput,
        savePresetBtn: savePresetBtn,
        deletePresetBtn: deletePresetBtn,
        exportTplBtn: exportTplBtn,
        importTplBtn: importTplBtn,
        tplFileInput: tplFileInput,
        tplStatus: tplStatus,
        refreshPresets: refreshPresets,
        resetTemplatesUi: resetTemplatesUi,
        sync: sync
      };
      customizerList.push(apiObj);
      refreshPresets('');
      return apiObj;
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
      var c = wsCloneCustom(wsCustom);
      return Object.assign({}, wsState, {
        title: c.title || wsState.title,
        subtitle: c.subtitle,
        headerFields: c.headerFields,
        density: c.density,
        hiddenSections: c.hiddenSections,
        hiddenParts: c.hiddenSections,
        hiddenItems: c.hiddenItems,
        sectionOverrides: c.sectionOverrides,
        itemOrder: c.itemOrder,
        itemTextOverrides: c.itemTextOverrides,
        custom: c,
        own: wsOwn || (typeof wsState.own === 'object' ? wsState.own : null),
        pictures: wsOptions.pictures,
        answerKey: wsOptions.answerKey,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
    }
    function buildWsDocxModel(model) {
      var docSections = (model.sections || []).map(function (sec) {
        var clonedItems = (sec.items || []).map(function (it) {
          var p = model.picturesOn ? model.pictureFor(it.origWord || it.word) : null;
          if (model.picturesOn) {
            if (sec.activity === 'rhyming') (it.choices || []).forEach(function (c) { model.pictureFor(c); });
            if (sec.activity === 'sound_sort') (it.chips || []).forEach(function (c) { model.pictureFor(c.text); });
          }
          var extra = { pictureUri: p && p.uri ? p.uri : '' };
          if (sec.activity === 'letter_tracing' && Array.isArray(it.parts)) {
            extra.parts = it.parts.map(function (pt) {
              var ch = String((pt && pt.letter) || '');
              return Object.assign({}, pt, {
                traceStripUri: svgUri(buildLetterTracingStripSvg(ch, { scaffolded: model.hintsOn, standalone: true })),
                strokeCue: wsLetterStrokeCue(ch)
              });
            });
          }
          return Object.assign({}, it, extra);
        });
        return Object.assign({}, sec, { items: clonedItems });
      });
      return {
        title: model.title,
        subtitle: model.subtitle,
        headerFields: model.headerFields,
        density: model.density,
        sections: docSections,
        answerKeyOn: model.answerKeyOn,
        hintsOn: model.hintsOn,
        credits: model.computeCredits()
      };
    }
    function downloadWorksheetHtml() {
      if (wsBusy || !wsState) return;
      var input = wsCurrentInput();
      var html = buildWordSoundsWorksheetHtml(input, {
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
      link.download = wsSlug(input.title || wsState.title) + '-activity-worksheet.' + 'html';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (wsNodes.said) wsNodes.said.textContent = 'Downloaded standalone HTML worksheet.';
    }
    function downloadWorksheetDocx() {
      if (wsBusy || !wsState) return Promise.resolve(false);
      var input = wsCurrentInput();
      var model = normalizeWorksheetModel(input, {
        pictures: wsOptions.pictures,
        answerKey: wsOptions.answerKey,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
      if (!model.sections.length) return Promise.resolve(false);
      var docModel = buildWsDocxModel(model);
      if (wsNodes.said) wsNodes.said.textContent = 'Preparing Word document (.docx)...';
      return ensureDocx().then(function (docx) {
        if (!docx || typeof docx.buildWordSoundsDocx !== 'function' || typeof docx.downloadDocx !== 'function') {
          if (wsNodes.said) wsNodes.said.textContent = 'Word export could not load right now. Try Download HTML worksheet instead.';
          return false;
        }
        return prepareDocxModelAsync(docx, docModel).then(function (prepared) {
          try {
            var res = docx.buildWordSoundsDocx(prepared, {
              filename: wsSlug(model.title) + '-activity-worksheet' + DOCX_EXT
            });
            docx.downloadDocx(res, win, doc);
            if (wsNodes.said) wsNodes.said.textContent = 'Downloaded Word document (.docx).';
            return true;
          } catch (_) {
            if (wsNodes.said) wsNodes.said.textContent = 'Could not build the Word document right now.';
            return false;
          }
        });
      });
    }
    function downloadWorksheetDocxPack() {
      if (wsBusy || !wsState) return Promise.resolve(false);
      var input = wsCurrentInput();
      var scaffModel = normalizeWorksheetModel(input, {
        pictures: true,
        answerKey: false,
        hints: true,
        syllables: true
      });
      if (!scaffModel.sections.length) return Promise.resolve(false);
      var indepModel = normalizeWorksheetModel(input, {
        pictures: wsOptions.pictures,
        answerKey: false,
        hints: false,
        syllables: false
      });
      var keyModel = normalizeWorksheetModel(input, {
        pictures: wsOptions.pictures,
        answerKey: true,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
      var scaffDoc = buildWsDocxModel(scaffModel);
      var indepDoc = buildWsDocxModel(indepModel);
      var keyDoc = buildWsDocxModel(keyModel);
      keyDoc.title = (keyModel.title || 'Word Sounds Worksheet') + ' \u2014 Teacher Answer Key';
      var scorePlan = buildWordSoundsAudioPlan(input, {
        pictures: wsOptions.pictures,
        answerKey: true,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
      if (wsNodes.said) wsNodes.said.textContent = 'Preparing editable print pack (4 Word files)...';
      return Promise.all([ensureZip(), ensureDocx()]).then(function (loaded) {
        var zipLib = loaded[0];
        var docx = loaded[1];
        if (!zipLib || typeof zipLib.create !== 'function' || !docx || typeof docx.buildWordSoundsDocx !== 'function' || typeof docx.buildScoringSheetDocx !== 'function') {
          if (wsNodes.said) wsNodes.said.textContent = 'Editable print pack could not load right now. Try Download Word (.docx) instead.';
          return false;
        }
        return Promise.all([
          prepareDocxModelAsync(docx, scaffDoc),
          prepareDocxModelAsync(docx, indepDoc)
        ]).then(function (preps) {
          var preparedScaff = preps[0];
          var preparedIndep = preps[1];
          try {
            var uriMap = Object.assign(
              collectImageUriMap(scaffDoc, preparedScaff),
              collectImageUriMap(indepDoc, preparedIndep)
            );
            applyImageUriMap(keyDoc, uriMap);
            var f1 = '01-Worksheet-Scaffolded' + DOCX_EXT;
            var f2 = '02-Worksheet-Independent' + DOCX_EXT;
            var f3 = '03-Teacher-Answer-Key' + DOCX_EXT;
            var f4 = '04-Teacher-Scoring-Sheet' + DOCX_EXT;
            var d1 = docx.buildWordSoundsDocx(preparedScaff, { zip: zipLib, filename: f1 });
            var d2 = docx.buildWordSoundsDocx(preparedIndep, { zip: zipLib, filename: f2 });
            var d3 = docx.buildWordSoundsDocx(keyDoc, { zip: zipLib, filename: f3 });
            var d4 = docx.buildScoringSheetDocx(scorePlan, {
              zip: zipLib,
              filename: f4,
              slow: audioOpts.slow,
              autoSec: audioOpts.autoSec,
              gapMs: audioOpts.gapMs,
              dirMode: audioOpts.dirMode
            });
            var packZip = zipLib.create();
            packZip.add(f1, d1.bytes);
            packZip.add(f2, d2.bytes);
            packZip.add(f3, d3.bytes);
            packZip.add(f4, d4.bytes);
            var ok = downloadZipBlob(packZip.finish(), wsSlug(scaffModel.title) + '-editable-print-pack' + ZIP_EXT);
            if (wsNodes.said) wsNodes.said.textContent = ok ? 'Downloaded editable print pack (4 Word files in .zip).' : 'File download is not available in this browser.';
            return ok;
          } catch (_) {
            if (wsNodes.said) wsNodes.said.textContent = 'Could not build the editable print pack right now.';
            return false;
          }
        });
      });
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
      wsNodes.docx = el('button', 'btn', 'Download Word (.docx)');
      wsNodes.docx.type = 'button';
      wsNodes.docx.id = 'pc-ws-docx';
      wsNodes.docx.addEventListener('click', downloadWorksheetDocx);
      wsNodes.docxPack = el('button', 'btn', 'Editable print pack (.zip)');
      wsNodes.docxPack.type = 'button';
      wsNodes.docxPack.id = 'pc-ws-docx-pack';
      wsNodes.docxPack.addEventListener('click', downloadWorksheetDocxPack);
      wsNodes.audioBtn = el('button', 'btn', 'Worksheet audio player');
      wsNodes.audioBtn.type = 'button';
      wsNodes.audioBtn.hidden = true;
      wsNodes.audioBtn.addEventListener('click', function () {
        if (!wsState) return;
        var stCopy = wsCurrentInput();
        audioOpener = wsOpener || wsNodes.audioBtn;
        openWorksheetAudio(stCopy);
      });
      wsNodes.back = el('button', 'btn', TEXT.back);
      wsNodes.back.type = 'button';
      wsNodes.back.addEventListener('click', closeWorksheet);
      actions.appendChild(wsNodes.print);
      actions.appendChild(wsNodes.download);
      actions.appendChild(wsNodes.docx);
      actions.appendChild(wsNodes.docxPack);
      actions.appendChild(wsNodes.audioBtn);
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
          else drawWorksheet({ keepStructure: true });
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
          drawWorksheet({ keepStructure: true });
          gatherWorksheet(mine).then(function () { if (mine === wsRun) { wsBusy = false; drawWorksheet({ keepStructure: true }); } });
          return;
        }
        drawWorksheet({ keepStructure: true });
      });
      makeToggle('pc-ws-answer-key', 'Include teacher answer key', 'answerKey');
      makeToggle('pc-ws-hints', 'Include hints (letter banks and sound boxes)', 'hints');
      makeToggle('pc-ws-syllables', TEXT.syllables, 'syllables', function (checked) {
        wsSyllableNote = '';
        if (checked) ensureSyllablesLoaded();
        drawWorksheet({ keepStructure: true });
      });
      wsNodes.options.appendChild(body);
      bar.appendChild(wsNodes.options);
      wsCustomizer = createCustomizerUi('ws', 'word-sounds', function () { return wsCustom; }, {
        onUpdate: function (opts) { drawWorksheet(opts); },
        onReset: function () {
          wsCustom = wsCreateDefaultCustom(wsState ? wsState.title : 'Word Sounds Activity Worksheet');
          drawWorksheet();
        },
        getDefaultTitle: function () { return wsState ? wsState.title : 'Word Sounds Activity Worksheet'; },
        getOptions: function () {
          return { pictures: !!wsOptions.pictures, answerKey: !!wsOptions.answerKey, hints: !!wsOptions.hints, syllables: !!wsOptions.syllables };
        },
        onApplyOptions: function (o) {
          var opts = o && typeof o === 'object' ? o : {};
          var picTurnedOn = false;
          if (typeof opts.pictures === 'boolean') {
            if (opts.pictures && !wsOptions.pictures) picTurnedOn = true;
            wsOptions.pictures = opts.pictures;
            if (wsNodes.picturesBox) wsNodes.picturesBox.checked = wsOptions.pictures;
          }
          if (typeof opts.answerKey === 'boolean') {
            wsOptions.answerKey = opts.answerKey;
            if (wsNodes.answerKeyBox) wsNodes.answerKeyBox.checked = wsOptions.answerKey;
          }
          if (typeof opts.hints === 'boolean') {
            wsOptions.hints = opts.hints;
            if (wsNodes.hintsBox) wsNodes.hintsBox.checked = wsOptions.hints;
          }
          if (typeof opts.syllables === 'boolean') {
            wsOptions.syllables = opts.syllables;
            if (wsNodes.syllablesBox) wsNodes.syllablesBox.checked = wsOptions.syllables;
            wsSyllableNote = '';
            if (wsOptions.syllables) ensureSyllablesLoaded();
          }
          wsSyncOptionClasses();
          wsSyncPresetButtons();
          return {
            afterDraw: function () {
              if (picTurnedOn && wsState && (wsState.symbols || wsState.own || wsState.matcher)) {
                var mine = ++wsRun;
                wsNote = '';
                gatherWorksheet(mine).then(function () { if (mine === wsRun) { wsBusy = false; drawWorksheet({ keepStructure: true }); } });
              }
            }
          };
        }
      });
      wsNodes.customizer = wsCustomizer.details;
      bar.appendChild(wsCustomizer.details);
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
      var sheet = el('section', 'pc-sheet pc-ws-sheet pc-density-' + (model.density || 'standard'));
      sheet.setAttribute('data-density', model.density || 'standard');
      sheet.setAttribute('aria-label', model.title);
      var header = el('header', 'pc-ws-header');
      appendWorksheetHeaderDom(header, model);
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
            var wsRow = el('div', 'pc-ws-row');
            appendPicNode(wsRow, model, it.word, neutralAlt, false);
            var tiles = el('div', 'pc-ws-tiles');
            (it.tiles || []).forEach(function (t) { tiles.appendChild(el('span', 'pc-ws-tile', t)); });
            wsRow.appendChild(tiles);
            body.appendChild(wsRow);
            body.appendChild(el('div', 'pc-ws-line'));
          } else if (act === 'counting') {
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
            var ctRow = el('div', 'pc-ws-row');
            appendPicNode(ctRow, model, it.word, '', false);
            ctRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            body.appendChild(ctRow);
            var ctUl = el('ul', 'pc-ws-bubbles');
            (it.values || ['1', '2', '3', '4', '5', '6']).forEach(function (v) { ctUl.appendChild(el('li', 'pc-ws-bubble', v)); });
            body.appendChild(ctUl);
          } else if (act === 'isolation') {
            body.appendChild(it.customPrompt
              ? el('p', 'pc-ws-prompt', it.customPrompt)
              : wsWordNode('p', 'pc-ws-prompt', 'What is the ' + it.positionName + ' sound in ' + it.word + '?', allowSyl, model.syllablesSrc));
            var isoRow = el('div', 'pc-ws-row');
            appendPicNode(isoRow, model, it.word, '', false);
            isoRow.appendChild(wsWordNode('span', 'pc-ws-word', it.word, allowSyl, model.syllablesSrc));
            body.appendChild(isoRow);
            var isoUl = el('ul', 'pc-ws-choices');
            (it.choices || []).forEach(function (c) { isoUl.appendChild(el('li', 'pc-ws-choice', wsSoundLabel(c))); });
            body.appendChild(isoUl);
          } else if (act === 'segmentation') {
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
            body.appendChild(el('div', 'pc-ws-sounds-seq', (it.sounds || []).map(wsSoundLabel).join(' \u00b7 ')));
            body.appendChild(el('div', 'pc-ws-line'));
            if (it.choices && it.choices.length) {
              var bUl = el('ul', 'pc-ws-choices');
              it.choices.forEach(function (c) { bUl.appendChild(wsWordNode('li', 'pc-ws-choice', c, allowSyl, model.syllablesSrc)); });
              body.appendChild(bUl);
            }
          } else if (act === 'rhyming') {
            body.appendChild(it.customPrompt
              ? el('p', 'pc-ws-prompt', it.customPrompt)
              : wsWordNode('p', 'pc-ws-prompt', 'Circle the word that rhymes with ' + it.word + ':', allowSyl, model.syllablesSrc));
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
            body.appendChild(it.customPrompt
              ? el('p', 'pc-ws-prompt', it.customPrompt)
              : wsWordNode('p', 'pc-ws-prompt', 'Word family: -' + it.rime + ' (like ' + it.word + ')', allowSyl, model.syllablesSrc));
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
            ltRow.appendChild(el('p', 'pc-ws-prompt', it.customPrompt || ('Trace ' + it.parts.map(function (p) { return p.letter; }).join(' and ') + ' (for ' + it.word + ')')));
            body.appendChild(ltRow);
            var tWrap = el('div', 'pc-ws-trace-wrap');
            (it.parts || []).forEach(function (part) {
              var tRow = el('div', 'pc-ws-trace-row');
              tRow.setAttribute('data-trace-case', part.kind || 'letter');
              var stripImg = el('img', 'pc-ws-trace-strip');
              stripImg.src = svgUri(buildLetterTracingStripSvg(part.letter, { scaffolded: model.hintsOn, standalone: true }));
              stripImg.alt = 'Primary handwriting tracing strip for letter ' + String(part.letter || '');
              stripImg.decoding = 'sync';
              tRow.appendChild(stripImg);
              var cueTxt = wsLetterStrokeCue(part.letter);
              if (cueTxt) tRow.appendChild(el('p', 'pc-ws-trace-cue', cueTxt));
              tWrap.appendChild(tRow);
            });
            body.appendChild(tWrap);
          } else if (act === 'orthography' || act === 'spelling_bee') {
            body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt || ('Listen to your teacher and write word #' + n + ':')));
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
            if (it.customPromptNoBlank) {
              rsP.textContent = it.customPrompt;
            } else {
              rsP.appendChild(wsWordNode('span', '', it.before, allowSyl, model.syllablesSrc));
              var rsBlank = el('span', 'pc-ws-blank');
              rsBlank.setAttribute('aria-label', 'blank');
              rsP.appendChild(rsBlank);
              rsP.appendChild(wsWordNode('span', '', it.after, allowSyl, model.syllablesSrc));
            }
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
            if (it.customPrompt) body.appendChild(el('p', 'pc-ws-prompt', it.customPrompt));
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
    function drawWorksheet(drawOpts) {
      if (!wsView || !wsState) return;
      while (wsNodes.sheets.firstChild) wsNodes.sheets.removeChild(wsNodes.sheets.firstChild);
      var model = normalizeWorksheetModel(wsCurrentInput(), {
        pictures: wsOptions.pictures,
        answerKey: wsOptions.answerKey,
        hints: wsOptions.hints,
        syllables: wsOptions.syllables
      });
      var hasBaseContent = model.allSections.length > 0;
      var hasContent = model.sections.length > 0;
      wsNodes.print.disabled = wsBusy || !hasContent;
      wsNodes.download.disabled = wsBusy || !hasContent;
      if (wsNodes.docx) wsNodes.docx.disabled = wsBusy || !hasContent;
      if (wsNodes.docxPack) wsNodes.docxPack.disabled = wsBusy || !hasContent;
      if (wsNodes.audioBtn) {
        var wsAud = wsState && (wsState.audio || (wsState.lesson && wsState.lesson.audio));
        wsNodes.audioBtn.hidden = !(hasContent && wsAud && Object.keys(wsAud).length > 0);
      }
      wsNodes.options.hidden = !hasBaseContent;
      if (wsNodes.customizer) wsNodes.customizer.hidden = !hasBaseContent;
      if (wsNodes.presets) wsNodes.presets.hidden = !hasBaseContent;
      wsNodes.tip.hidden = !hasBaseContent;
      wsSyncPresetButtons();
      if (wsCustomizer && hasBaseContent) {
        wsCustomizer.sync({
          defaultTitle: wsState.title || 'Word Sounds Activity Worksheet',
          hasItemToggles: true,
          sections: model.allSections.map(function (s) {
            return {
              key: s.key,
              defaultHeading: s.defaultLabel,
              defaultDirections: s.defaultDirections,
              items: s.items.map(function (it) {
                var lbl = s.activity === 'letter_tracing' && it.parts && it.parts.length
                  ? (it.parts.map(function (p) { return p.letter; }).join('/') + ' (' + it.word + ')')
                  : (it.word || 'Item');
                return {
                  key: it.itemKey,
                  origIndex: it.origIndex,
                  label: lbl,
                  editFields: [
                    {
                      key: it.itemKey,
                      label: 'Prompt or wording for "' + lbl + '"',
                      defaultValue: it.defaultPrompt || '',
                      placeholder: 'Optional prompt or wording for this item'
                    }
                  ]
                };
              })
            };
          })
        }, drawOpts);
      }
      if (!hasBaseContent) {
        wsNodes.said.textContent = TEXT.nothing;
        return;
      }
      if (!hasContent) {
        wsNodes.said.textContent = 'All sections or items are currently hidden. Open Customize worksheet to show or restore them.';
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
      if (raView && !raView.hidden) { raRun++; raView.hidden = true; }
      if (audioView && !audioView.hidden) { stopAudioPlayback(); audioView.hidden = true; }
      var mine = ++wsRun;
      var s = given || {};
      var defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
      var baseTitle = String(s.title || (s.lesson && s.lesson.title) || 'Word Sounds Activity Worksheet').trim();
      wsState = Object.assign({}, s, {
        title: baseTitle,
        symbols: s.symbols || null,
        matcher: s.matcher !== undefined ? s.matcher : defaultMatcher,
        loadPictures: s.loadPictures || null,
        own: s.own || null,
        creditLine: typeof s.creditLine === 'function' ? s.creditLine : root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine
      });
      wsCustom = wsExtractCustom(s, {}, baseTitle);
      if (wsCustomizer) {
        wsCustomizer.details.open = false;
        wsCustomizer.resetTemplatesUi();
      }
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
      var c = wsCloneCustom(vocabCustom);
      return Object.assign({}, vocabState, {
        title: c.title || vocabState.title,
        subtitle: c.subtitle,
        headerFields: c.headerFields,
        density: c.density,
        hiddenSections: c.hiddenSections,
        hiddenParts: c.hiddenSections,
        hiddenItems: c.hiddenItems,
        sectionOverrides: c.sectionOverrides,
        itemOrder: c.itemOrder,
        itemTextOverrides: c.itemTextOverrides,
        custom: c,
        own: vocabOwn || (typeof vocabState.own === 'object' ? vocabState.own : null),
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: vocabOptions.answerKey,
        syllables: vocabOptions.syllables
      });
    }
    function buildVocabDocxModel(model) {
      var hp = model.hiddenParts || Object.create(null);
      return {
        title: model.title,
        subtitle: model.subtitle,
        headerFields: model.headerFields,
        density: model.density,
        wordBankOn: model.wordBankOn,
        wordBank: model.wordBank,
        entries: model.entries,
        matchWords: hp.matching ? [] : model.matchWords,
        matchDefs: hp.matching ? [] : model.matchDefs,
        clozeItems: hp.cloze ? [] : model.clozeItems,
        pictureItems: hp.pictures ? [] : (model.pictureItems || []).map(function (it) {
          return { word: it.word, uri: it.uri };
        }),
        answerKeyOn: model.answerKeyOn,
        hiddenParts: hp,
        sectionOverrides: model.sectionOverrides,
        credits: model.computeCredits()
      };
    }
    function downloadVocabWorksheetHtml() {
      if (vocabBusy || !vocabState) return;
      var input = vocabCurrentInput();
      var html = buildVocabWorksheetHtml(input, {
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
      link.download = wsSlug(input.title || vocabState.title || 'vocabulary') + '-vocabulary-worksheet.' + 'html';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (vocabNodes.said) vocabNodes.said.textContent = 'Downloaded standalone HTML vocabulary worksheet.';
    }
    function downloadVocabWorksheetDocx() {
      if (vocabBusy || !vocabState) return Promise.resolve(false);
      var input = vocabCurrentInput();
      var model = normalizeVocabWorksheetModel(input, {
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: vocabOptions.answerKey,
        syllables: vocabOptions.syllables
      });
      if (!model.entries.length) return Promise.resolve(false);
      var docModel = buildVocabDocxModel(model);
      if (vocabNodes.said) vocabNodes.said.textContent = 'Preparing Word document (.docx)...';
      return ensureDocx().then(function (docx) {
        if (!docx || typeof docx.buildVocabDocx !== 'function' || typeof docx.downloadDocx !== 'function') {
          if (vocabNodes.said) vocabNodes.said.textContent = 'Word export could not load right now. Try Download HTML worksheet instead.';
          return false;
        }
        return prepareDocxModelAsync(docx, docModel).then(function (prepared) {
          try {
            var res = docx.buildVocabDocx(prepared, {
              filename: wsSlug(model.title || 'vocabulary') + '-vocabulary-worksheet' + DOCX_EXT
            });
            docx.downloadDocx(res, win, doc);
            if (vocabNodes.said) vocabNodes.said.textContent = 'Downloaded Word document (.docx).';
            return true;
          } catch (_) {
            if (vocabNodes.said) vocabNodes.said.textContent = 'Could not build the Word document right now.';
            return false;
          }
        });
      });
    }
    function downloadVocabDocxPack() {
      if (vocabBusy || !vocabState) return Promise.resolve(false);
      var input = vocabCurrentInput();
      var scaffModel = normalizeVocabWorksheetModel(input, {
        wordBank: true,
        pictures: true,
        answerKey: false,
        syllables: true
      });
      if (!scaffModel.entries.length) return Promise.resolve(false);
      var indepModel = normalizeVocabWorksheetModel(input, {
        wordBank: false,
        pictures: vocabOptions.pictures,
        answerKey: false,
        syllables: false
      });
      var keyModel = normalizeVocabWorksheetModel(input, {
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: true,
        syllables: vocabOptions.syllables
      });
      var scaffDoc = buildVocabDocxModel(scaffModel);
      var indepDoc = buildVocabDocxModel(indepModel);
      var keyDoc = buildVocabDocxModel(keyModel);
      keyDoc.title = (keyModel.title || 'Vocabulary Practice Worksheet') + ' \u2014 Teacher Answer Key';
      var scorePlan = buildVocabAudioPlan(input, {
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: true,
        syllables: vocabOptions.syllables
      });
      if (vocabNodes.said) vocabNodes.said.textContent = 'Preparing editable print pack (4 Word files)...';
      return Promise.all([ensureZip(), ensureDocx()]).then(function (loaded) {
        var zipLib = loaded[0];
        var docx = loaded[1];
        if (!zipLib || typeof zipLib.create !== 'function' || !docx || typeof docx.buildVocabDocx !== 'function' || typeof docx.buildScoringSheetDocx !== 'function') {
          if (vocabNodes.said) vocabNodes.said.textContent = 'Editable print pack could not load right now. Try Download Word (.docx) instead.';
          return false;
        }
        return prepareDocxModelAsync(docx, scaffDoc).then(function (preparedScaff) {
          try {
            var uriMap = collectImageUriMap(scaffDoc, preparedScaff);
            applyImageUriMap(indepDoc, uriMap);
            applyImageUriMap(keyDoc, uriMap);
            var f1 = '01-Worksheet-Scaffolded' + DOCX_EXT;
            var f2 = '02-Worksheet-Independent' + DOCX_EXT;
            var f3 = '03-Teacher-Answer-Key' + DOCX_EXT;
            var f4 = '04-Teacher-Scoring-Sheet' + DOCX_EXT;
            var d1 = docx.buildVocabDocx(preparedScaff, { zip: zipLib, filename: f1 });
            var d2 = docx.buildVocabDocx(indepDoc, { zip: zipLib, filename: f2 });
            var d3 = docx.buildVocabDocx(keyDoc, { zip: zipLib, filename: f3 });
            var d4 = docx.buildScoringSheetDocx(scorePlan, {
              zip: zipLib,
              filename: f4,
              slow: audioOpts.slow,
              autoSec: audioOpts.autoSec,
              gapMs: audioOpts.gapMs,
              dirMode: audioOpts.dirMode
            });
            var packZip = zipLib.create();
            packZip.add(f1, d1.bytes);
            packZip.add(f2, d2.bytes);
            packZip.add(f3, d3.bytes);
            packZip.add(f4, d4.bytes);
            var ok = downloadZipBlob(packZip.finish(), wsSlug(scaffModel.title || 'vocabulary') + '-editable-print-pack' + ZIP_EXT);
            if (vocabNodes.said) vocabNodes.said.textContent = ok ? 'Downloaded editable print pack (4 Word files in .zip).' : 'File download is not available in this browser.';
            return ok;
          } catch (_) {
            if (vocabNodes.said) vocabNodes.said.textContent = 'Could not build the editable print pack right now.';
            return false;
          }
        });
      });
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
      vocabNodes.docx = el('button', 'btn', 'Download Word (.docx)');
      vocabNodes.docx.type = 'button';
      vocabNodes.docx.id = 'pc-vocab-docx';
      vocabNodes.docx.addEventListener('click', downloadVocabWorksheetDocx);
      vocabNodes.docxPack = el('button', 'btn', 'Editable print pack (.zip)');
      vocabNodes.docxPack.type = 'button';
      vocabNodes.docxPack.id = 'pc-vocab-docx-pack';
      vocabNodes.docxPack.addEventListener('click', downloadVocabDocxPack);
      vocabNodes.audioBtn = el('button', 'btn', 'Worksheet audio player');
      vocabNodes.audioBtn.type = 'button';
      vocabNodes.audioBtn.hidden = true;
      vocabNodes.audioBtn.addEventListener('click', function () {
        if (!vocabState) return;
        audioOpener = vocabOpener || vocabNodes.audioBtn;
        openVocabAudio(vocabCurrentInput());
      });
      vocabNodes.back = el('button', 'btn', TEXT.back);
      vocabNodes.back.type = 'button';
      vocabNodes.back.addEventListener('click', closeVocabWorksheet);
      actions.appendChild(vocabNodes.print);
      actions.appendChild(vocabNodes.download);
      actions.appendChild(vocabNodes.docx);
      actions.appendChild(vocabNodes.docxPack);
      actions.appendChild(vocabNodes.audioBtn);
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
        drawVocabWorksheet({ keepStructure: true });
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
          else drawVocabWorksheet({ keepStructure: true });
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
          drawVocabWorksheet({ keepStructure: true });
          gatherVocabWorksheet(mine).then(function () { if (mine === vocabRun) { vocabBusy = false; drawVocabWorksheet({ keepStructure: true }); } });
          return;
        }
        drawVocabWorksheet({ keepStructure: true });
      });
      makeVocabToggle('pc-vocab-answer-key', 'Include teacher answer key', 'answerKey');
      makeVocabToggle('pc-vocab-syllables', TEXT.syllables, 'syllables', function (checked) {
        vocabSyllableNote = '';
        if (checked) ensureSyllablesLoaded();
        drawVocabWorksheet({ keepStructure: true });
      });
      vocabNodes.options.appendChild(body);
      bar.appendChild(vocabNodes.options);
      vocabCustomizer = createCustomizerUi('vocab', 'vocab', function () { return vocabCustom; }, {
        onUpdate: function (opts) { drawVocabWorksheet(opts); },
        onReset: function () {
          vocabCustom = wsCreateDefaultCustom(vocabState ? vocabState.title : 'Vocabulary Practice Worksheet');
          drawVocabWorksheet();
        },
        getDefaultTitle: function () { return vocabState ? vocabState.title : 'Vocabulary Practice Worksheet'; },
        getOptions: function () {
          return { wordBank: !!vocabOptions.wordBank, pictures: !!vocabOptions.pictures, answerKey: !!vocabOptions.answerKey, syllables: !!vocabOptions.syllables };
        },
        normalizeHiddenItems: function (rawMap) {
          var out = Object.create(null);
          var base = vocabState ? normalizeVocabWorksheetModel(vocabState, { pictures: false }) : null;
          var byWord = Object.create(null);
          if (base && Array.isArray(base.allEntries)) {
            base.allEntries.forEach(function (e) {
              byWord[e.itemKey] = String(e.origIndex);
              byWord['word:' + e.itemKey] = String(e.origIndex);
            });
          }
          Object.keys(rawMap || {}).forEach(function (k) {
            if (!rawMap[k]) return;
            var low = String(k).toLowerCase();
            out[byWord[low] !== undefined ? byWord[low] : k] = true;
          });
          return out;
        },
        onApplyOptions: function (o) {
          var opts = o && typeof o === 'object' ? o : {};
          var picTurnedOn = false;
          if (typeof opts.wordBank === 'boolean') {
            vocabOptions.wordBank = opts.wordBank;
            if (vocabNodes.wordBankBox) vocabNodes.wordBankBox.checked = vocabOptions.wordBank;
          }
          if (typeof opts.pictures === 'boolean') {
            if (opts.pictures && !vocabOptions.pictures) picTurnedOn = true;
            vocabOptions.pictures = opts.pictures;
            if (vocabNodes.picturesBox) vocabNodes.picturesBox.checked = vocabOptions.pictures;
          }
          if (typeof opts.answerKey === 'boolean') {
            vocabOptions.answerKey = opts.answerKey;
            if (vocabNodes.answerKeyBox) vocabNodes.answerKeyBox.checked = vocabOptions.answerKey;
          }
          if (typeof opts.syllables === 'boolean') {
            vocabOptions.syllables = opts.syllables;
            if (vocabNodes.syllablesBox) vocabNodes.syllablesBox.checked = vocabOptions.syllables;
            vocabSyllableNote = '';
            if (vocabOptions.syllables) ensureSyllablesLoaded();
          }
          vocabSyncOptionClasses();
          vocabSyncPresetButtons();
          return {
            afterDraw: function () {
              if (picTurnedOn && vocabState && (vocabState.symbols || vocabState.own || vocabState.matcher)) {
                var mine = ++vocabRun;
                vocabNote = '';
                gatherVocabWorksheet(mine).then(function () { if (mine === vocabRun) { vocabBusy = false; drawVocabWorksheet({ keepStructure: true }); } });
              }
            }
          };
        }
      });
      vocabNodes.customizer = vocabCustomizer.details;
      bar.appendChild(vocabCustomizer.details);
      vocabView.appendChild(bar);
      vocabNodes.sheets = el('div', 'pc-sheets');
      vocabView.appendChild(vocabNodes.sheets);
      doc.body.appendChild(vocabView);
    }
    function renderVocabWorksheetSheet(model) {
      var sheet = el('section', 'pc-sheet pc-ws-sheet pc-vocab-sheet pc-density-' + (model.density || 'standard'));
      sheet.setAttribute('data-density', model.density || 'standard');
      sheet.setAttribute('aria-label', model.title);
      var header = el('header', 'pc-ws-header');
      appendWorksheetHeaderDom(header, model);
      sheet.appendChild(header);

      var hp = model.hiddenParts || Object.create(null);
      var ov = model.sectionOverrides || Object.create(null);

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
      if (!hp.matching) {
        var p1Sec = el('section', 'pc-ws-section');
        p1Sec.setAttribute('data-vocab-part', 'matching');
        var p1Head = el('div', 'pc-ws-section-head');
        if (model.matchWords.length) {
          var p1Copy = wsApplySectionCopy(ov, 'matching', null, 'Part 1 \u2014 Match the Word to Its Meaning', 'Write the letter of the matching meaning on the line next to each word.');
          p1Head.appendChild(el('h3', 'pc-ws-section-title', p1Copy.heading));
          if (p1Copy.directions) p1Head.appendChild(el('p', 'pc-ws-directions', p1Copy.directions));
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
            heading: p1Copy.heading,
            lines: model.matchWords.map(function (item) {
              return item.word + ' \u2014 ' + item.answerLetter + ' (' + item.meaning + ')';
            })
          });
        } else {
          var p1CopyW = wsApplySectionCopy(ov, 'matching', null, 'Part 1 \u2014 Write Each Meaning', 'Write what each vocabulary word means on the line.');
          p1Head.appendChild(el('h3', 'pc-ws-section-title', p1CopyW.heading));
          if (p1CopyW.directions) p1Head.appendChild(el('p', 'pc-ws-directions', p1CopyW.directions));
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
            heading: p1CopyW.heading,
            lines: model.entries.map(function (e) { return e.word + ' \u2014 Teacher-checked student meaning.'; })
          });
        }
        sheet.appendChild(p1Sec);
      }

      // Part 2 — Fill in the Blank
      if (!hp.cloze && model.clozeItems.length) {
        var defaultClozeDir = model.wordBankOn
          ? 'Choose a word from the Word Bank to complete each sentence. Write the word on the line.'
          : 'Write the vocabulary word that best completes each sentence.';
        var p2Copy = wsApplySectionCopy(ov, 'cloze', null, 'Part 2 \u2014 Fill in the Blank', defaultClozeDir);
        var p2Sec = el('section', 'pc-ws-section');
        p2Sec.setAttribute('data-vocab-part', 'cloze');
        var p2Head = el('div', 'pc-ws-section-head');
        p2Head.appendChild(el('h3', 'pc-ws-section-title', p2Copy.heading));
        if (p2Copy.directions) p2Head.appendChild(el('p', 'pc-ws-directions', p2Copy.directions));
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
          heading: p2Copy.heading,
          lines: model.clozeItems.map(function (item) {
            return item.hasCloze
              ? item.answer + ' \u2014 "' + item.completed + '"'
              : item.word + ' \u2014 Answers will vary (sentence using "' + item.word + '").';
          })
        });
      }

      // Part 3 — Name the Picture
      if (!hp.pictures && model.pictureItems.length) {
        var p3Copy = wsApplySectionCopy(ov, 'pictures', null, 'Part 3 \u2014 Name the Picture', 'Look at each picture. Write the matching vocabulary word on the line underneath.');
        var p3Sec = el('section', 'pc-ws-section');
        p3Sec.setAttribute('data-vocab-part', 'pictures');
        var p3Head = el('div', 'pc-ws-section-head');
        p3Head.appendChild(el('h3', 'pc-ws-section-title', p3Copy.heading));
        if (p3Copy.directions) p3Head.appendChild(el('p', 'pc-ws-directions', p3Copy.directions));
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
          heading: p3Copy.heading,
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
    function drawVocabWorksheet(drawOpts) {
      if (!vocabView || !vocabState) return;
      while (vocabNodes.sheets.firstChild) vocabNodes.sheets.removeChild(vocabNodes.sheets.firstChild);
      var model = normalizeVocabWorksheetModel(vocabCurrentInput(), {
        wordBank: vocabOptions.wordBank,
        pictures: vocabOptions.pictures,
        answerKey: vocabOptions.answerKey,
        syllables: vocabOptions.syllables
      });
      var hp = model.hiddenParts || Object.create(null);
      var hasBaseContent = model.allEntries.length > 0;
      var visiblePartCount = (!hp.matching && model.entries.length > 0 ? 1 : 0)
        + (!hp.cloze && model.clozeItems.length > 0 ? 1 : 0)
        + (!hp.pictures && model.pictureItems.length > 0 ? 1 : 0);
      var hasContent = model.entries.length > 0 && visiblePartCount > 0;
      vocabNodes.print.disabled = vocabBusy || !hasContent;
      vocabNodes.download.disabled = vocabBusy || !hasContent;
      if (vocabNodes.docx) vocabNodes.docx.disabled = vocabBusy || !hasContent;
      if (vocabNodes.docxPack) vocabNodes.docxPack.disabled = vocabBusy || !hasContent;
      vocabNodes.options.hidden = !hasBaseContent;
      if (vocabNodes.customizer) vocabNodes.customizer.hidden = !hasBaseContent;
      if (vocabNodes.presets) vocabNodes.presets.hidden = !hasBaseContent;
      vocabNodes.tip.hidden = !hasBaseContent;
      vocabSyncPresetButtons();
      if (vocabCustomizer && hasBaseContent) {
        var vocabSecDefs = [
          {
            key: 'matching',
            defaultHeading: model.matchWords.length ? 'Part 1 \u2014 Match the Word to Its Meaning' : 'Part 1 \u2014 Write Each Meaning',
            defaultDirections: model.matchWords.length ? 'Write the letter of the matching meaning on the line next to each word.' : 'Write what each vocabulary word means on the line.'
          },
          {
            key: 'cloze',
            defaultHeading: 'Part 2 \u2014 Fill in the Blank',
            defaultDirections: model.wordBankOn
              ? 'Choose a word from the Word Bank to complete each sentence. Write the word on the line.'
              : 'Write the vocabulary word that best completes each sentence.'
          }
        ];
        if (model.pictureItems.length > 0 || vocabOptions.pictures) {
          vocabSecDefs.push({
            key: 'pictures',
            defaultHeading: 'Part 3 \u2014 Name the Picture',
            defaultDirections: 'Look at each picture. Write the matching vocabulary word on the line underneath.'
          });
        }
        vocabCustomizer.sync({
          defaultTitle: vocabState.title || 'Vocabulary Practice Worksheet',
          hasItemToggles: true,
          sections: vocabSecDefs,
          sharedSectionKey: 'words',
          sharedItems: model.allEntries.map(function (e) {
            var idxStr = String(e.origIndex);
            return {
              key: idxStr,
              origIndex: e.origIndex,
              label: e.word,
              editFields: [
                {
                  key: 'meaning:' + idxStr,
                  label: 'Part 1 meaning for "' + e.word + '"',
                  defaultValue: e.defaultMeaning || '',
                  placeholder: 'Meaning shown in Part 1'
                },
                {
                  key: 'cloze:' + idxStr,
                  label: 'Part 2 fill-in-the-blank sentence (use ___ for blank)',
                  defaultValue: e.defaultClozeText || '',
                  placeholder: 'Sentence with ___ for the blank'
                }
              ]
            };
          })
        }, drawOpts);
      }
      if (!hasBaseContent) {
        vocabNodes.said.textContent = TEXT.nothing;
        return;
      }
      if (!hasContent) {
        vocabNodes.said.textContent = 'All sections or words are currently hidden. Open Customize worksheet to show or restore them.';
        return;
      }
      if (vocabBusy) {
        vocabNodes.said.textContent = vocabNote;
        return;
      }
      var extra = (vocabNote ? ' ' + vocabNote : '') + (vocabOptions.syllables && vocabSyllableNote ? ' ' + vocabSyllableNote : '');
      vocabNodes.said.textContent = count(model.entries.length, 'word') + ', ' + count(visiblePartCount, 'part') + ' ready to print or download.' + extra;
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
      if (raView && !raView.hidden) { raRun++; raView.hidden = true; }
      if (audioView && !audioView.hidden) { stopAudioPlayback(); audioView.hidden = true; }
      var mine = ++vocabRun;
      var s = Array.isArray(given) ? { entries: given } : (given || {});
      var o = opts && typeof opts === 'object' ? opts : {};
      var defaultMatcher = root && (root.AlloWordPictureMatcher || (root.AlloModules && root.AlloModules.WordPictureMatcher)) || null;
      var baseTitle = String(o.title || s.title || 'Vocabulary Practice Worksheet').trim();
      vocabState = Object.assign({}, s, {
        title: baseTitle,
        symbols: o.symbols !== undefined ? o.symbols : (s.symbols || null),
        matcher: o.matcher !== undefined ? o.matcher : (s.matcher !== undefined ? s.matcher : defaultMatcher),
        loadPictures: o.loadPictures || s.loadPictures || null,
        own: o.own !== undefined ? o.own : (s.own || null),
        creditLine: typeof o.creditLine === 'function' ? o.creditLine
          : (typeof s.creditLine === 'function' ? s.creditLine : root && root.AlloPacketMyWords && root.AlloPacketMyWords.creditLine)
      });
      vocabCustom = wsExtractCustom(s, o, baseTitle);
      if (vocabCustomizer) {
        vocabCustomizer.details.open = false;
        vocabCustomizer.resetTemplatesUi();
      }
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
      if (vocabNodes.audioBtn) {
        var hasVocabClips = !!(vocabState && (
          (vocabState.wordClips && Object.keys(vocabState.wordClips).length)
          || (vocabState.clips && Object.keys(vocabState.clips).length)
          || (vocabState.meaningClips && Object.keys(vocabState.meaningClips).length)
          || (vocabState.lesson && vocabState.lesson.audio && Object.keys(vocabState.lesson.audio).length)
        ));
        vocabNodes.audioBtn.hidden = !hasVocabClips;
      }
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

    // -------------------------------------------------------------------------
    // Read-Along Interactive Worksheet Preview & Customizer (pure DOM)
    // -------------------------------------------------------------------------
    function raAppendFormattedText(parent, rawText, model) {
      var withSyl = raApplySyllables(rawText, model.lang, model.showSyllables, model.syllableLookup);
      if (!model.showBold) {
        parent.appendChild(doc.createTextNode(withSyl));
        return;
      }
      var re = /[A-Za-z\u00C0-\u024F\u00b7]+/g, m, last = 0;
      while ((m = re.exec(withSyl))) {
        if (m.index > last) parent.appendChild(doc.createTextNode(withSyl.slice(last, m.index)));
        var tok = m[0];
        var plainLen = tok.replace(/\u00b7/g, '').length;
        if (plainLen < 2) {
          parent.appendChild(doc.createTextNode(tok));
        } else {
          var targetLetters = plainLen <= 3 ? Math.max(1, plainLen - 1) : Math.ceil(plainLen * 0.45);
          var seen = 0, cutIdx = 0;
          for (var ci = 0; ci < tok.length; ci++) {
            if (tok.charAt(ci) !== '\u00b7') seen++;
            cutIdx = ci + 1;
            if (seen >= targetLetters) break;
          }
          parent.appendChild(el('strong', '', tok.slice(0, cutIdx)));
          if (cutIdx < tok.length) parent.appendChild(doc.createTextNode(tok.slice(cutIdx)));
        }
        last = m.index + tok.length;
      }
      if (last < withSyl.length) parent.appendChild(doc.createTextNode(withSyl.slice(last)));
    }
    function raSyncOptionClasses() {
      if (!raView) return;
      Array.prototype.forEach.call(raView.querySelectorAll('.pc-radio input'), function (input) {
        if (input.parentNode) input.parentNode.classList.toggle('is-on', !!input.checked);
      });
    }
    function raHasClips(st) {
      if (!st || typeof st !== 'object') return false;
      if (st.clips && typeof st.clips === 'object' && Object.keys(st.clips).length > 0) return true;
      if (Array.isArray(st.customSupports) && st.customSupports.some(function (s) { return !!(s && (s.audioUri || s.audio)); })) return true;
      if (Array.isArray(st.questions) && st.questions.some(function (q) { return !!(q && (q.audioUri || q.audio)); })) return true;
      return false;
    }
    function raCurrentInput() {
      if (!raState) return {};
      var c = wsCloneCustom(raCustom);
      return Object.assign({}, raState, {
        title: c.title || raState.title,
        subtitle: c.subtitle,
        headerFields: c.headerFields,
        density: c.density,
        hiddenSections: c.hiddenSections,
        hiddenParts: c.hiddenSections,
        hiddenItems: c.hiddenItems,
        sectionOverrides: c.sectionOverrides,
        itemOrder: c.itemOrder,
        itemTextOverrides: c.itemTextOverrides,
        custom: c,
        showSyllables: raOptions.syllables,
        showBold: raOptions.bold,
        showSupports: raOptions.supports,
        includeAnswerKey: raOptions.answerKey,
        answerKey: raOptions.answerKey,
        writeLines: raOptions.writeLines
      });
    }
    function buildReadAlongDocxModel(model) {
      var hp = model.hiddenParts || Object.create(null);
      return {
        title: model.title,
        subtitle: model.subtitle,
        headerFields: model.headerFields,
        density: model.density,
        lang: model.lang,
        isRtl: model.isRtl,
        passageDirections: raDefaultPassageDirections(model),
        paragraphs: hp.passage ? [] : model.paragraphs,
        customSupports: (hp.supports || !model.showSupports) ? [] : (model.customSupports || []).map(function (sup) {
          return Object.assign({}, sup);
        }),
        matchWords: hp.matching ? [] : model.matchWords,
        matchDefs: hp.matching ? [] : model.matchDefs,
        questions: hp.writing ? [] : model.questions,
        writeLines: hp.writing ? 0 : model.writeLines,
        answerKeyOn: model.answerKeyOn,
        hiddenParts: hp,
        sectionOverrides: model.sectionOverrides
      };
    }
    function downloadReadAlongWorksheetHtml() {
      if (!raState) return;
      var input = raCurrentInput();
      var model = buildReadAlongWorksheetModel(input);
      var html = buildReadAlongWorksheetHtmlFromModel(model);
      if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') return;
      var blob = new win.Blob([html], { type: 'text/html;charset=utf-8' });
      var url = win.URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      link.download = wsSlug(model.title || 'read-along') + '-read-along-worksheet.' + 'html';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (raNodes.said) raNodes.said.textContent = 'Downloaded standalone HTML read-along worksheet.';
    }
    function downloadReadAlongWorksheetDocx() {
      if (!raState) return Promise.resolve(false);
      var input = raCurrentInput();
      var model = buildReadAlongWorksheetModel(input);
      var docModel = buildReadAlongDocxModel(model);
      if (raNodes.said) raNodes.said.textContent = 'Preparing Word document (.docx)...';
      return ensureDocx().then(function (docx) {
        if (!docx || typeof docx.buildReadAlongDocx !== 'function' || typeof docx.downloadDocx !== 'function') {
          if (raNodes.said) raNodes.said.textContent = 'Word export could not load right now. Try Download HTML worksheet instead.';
          return false;
        }
        return prepareDocxModelAsync(docx, docModel).then(function (prepared) {
          try {
            var res = docx.buildReadAlongDocx(prepared, {
              filename: wsSlug(model.title || 'read-along') + '-read-along-worksheet' + DOCX_EXT
            });
            docx.downloadDocx(res, win, doc);
            if (raNodes.said) raNodes.said.textContent = 'Downloaded Word document (.docx).';
            return true;
          } catch (_) {
            if (raNodes.said) raNodes.said.textContent = 'Could not build the Word document right now.';
            return false;
          }
        });
      });
    }
    function downloadReadAlongDocxPack() {
      if (!raState) return Promise.resolve(false);
      var input = raCurrentInput();
      var scaffModel = buildReadAlongWorksheetModel(input, {
        showSyllables: true,
        showBold: true,
        showSupports: true,
        answerKey: false
      });
      if (!scaffModel.paragraphs.length) return Promise.resolve(false);
      var indepModel = buildReadAlongWorksheetModel(input, {
        showSyllables: false,
        showBold: false,
        showSupports: false,
        answerKey: false
      });
      var keyModel = buildReadAlongWorksheetModel(input, {
        showSyllables: raOptions.syllables,
        showBold: raOptions.bold,
        showSupports: raOptions.supports,
        answerKey: true,
        writeLines: raOptions.writeLines
      });
      var scaffDoc = buildReadAlongDocxModel(scaffModel);
      var indepDoc = buildReadAlongDocxModel(indepModel);
      var keyDoc = buildReadAlongDocxModel(keyModel);
      keyDoc.title = (keyModel.title || 'Read-Along Worksheet') + ' \u2014 Teacher Answer Key';
      var scorePlan = buildReadAlongAudioPlan(input, { showSupports: raOptions.supports });
      if (raNodes.said) raNodes.said.textContent = 'Preparing editable print pack (4 Word files)...';
      return Promise.all([ensureZip(), ensureDocx()]).then(function (loaded) {
        var zipLib = loaded[0];
        var docx = loaded[1];
        if (!zipLib || typeof zipLib.create !== 'function' || !docx || typeof docx.buildReadAlongDocx !== 'function' || typeof docx.buildScoringSheetDocx !== 'function') {
          if (raNodes.said) raNodes.said.textContent = 'Editable print pack could not load right now. Try Download Word (.docx) instead.';
          return false;
        }
        return prepareDocxModelAsync(docx, scaffDoc).then(function (preparedScaff) {
          try {
            var uriMap = collectImageUriMap(scaffDoc, preparedScaff);
            applyImageUriMap(indepDoc, uriMap);
            applyImageUriMap(keyDoc, uriMap);
            var f1 = '01-Worksheet-Scaffolded' + DOCX_EXT;
            var f2 = '02-Worksheet-Independent' + DOCX_EXT;
            var f3 = '03-Teacher-Answer-Key' + DOCX_EXT;
            var f4 = '04-Teacher-Scoring-Sheet' + DOCX_EXT;
            var d1 = docx.buildReadAlongDocx(preparedScaff, { zip: zipLib, filename: f1 });
            var d2 = docx.buildReadAlongDocx(indepDoc, { zip: zipLib, filename: f2 });
            var d3 = docx.buildReadAlongDocx(keyDoc, { zip: zipLib, filename: f3 });
            var d4 = docx.buildScoringSheetDocx(scorePlan, {
              zip: zipLib,
              filename: f4,
              slow: audioOpts.slow,
              autoSec: audioOpts.autoSec,
              gapMs: audioOpts.gapMs,
              dirMode: audioOpts.dirMode
            });
            var packZip = zipLib.create();
            packZip.add(f1, d1.bytes);
            packZip.add(f2, d2.bytes);
            packZip.add(f3, d3.bytes);
            packZip.add(f4, d4.bytes);
            var ok = downloadZipBlob(packZip.finish(), wsSlug(scaffModel.title || 'read-along') + '-editable-print-pack' + ZIP_EXT);
            if (raNodes.said) raNodes.said.textContent = ok ? 'Downloaded editable print pack (4 Word files in .zip).' : 'File download is not available in this browser.';
            return ok;
          } catch (_) {
            if (raNodes.said) raNodes.said.textContent = 'Could not build the editable print pack right now.';
            return false;
          }
        });
      });
    }
    function buildReadAlongWorksheetView() {
      raView = el('div', 'pc pc-ws-view pc-ra-view');
      raView.id = 'print-read-along-worksheet-view';
      raView.hidden = true;
      var bar = el('div', 'pc-bar');
      raNodes.heading = el('h1', '', 'Read-along worksheet');
      raNodes.heading.id = 'pc-ra-heading';
      raNodes.heading.tabIndex = -1;
      raView.setAttribute('role', 'region');
      raView.setAttribute('aria-labelledby', 'pc-ra-heading');
      bar.appendChild(raNodes.heading);
      raNodes.said = el('p', 'pc-said');
      raNodes.said.setAttribute('role', 'status');
      bar.appendChild(raNodes.said);

      var actions = el('p', 'pc-actions');
      raNodes.print = el('button', 'btn btn-primary', TEXT.print);
      raNodes.print.type = 'button';
      raNodes.print.addEventListener('click', function () { if (raState) win.print(); });
      raNodes.download = el('button', 'btn', 'Download HTML worksheet');
      raNodes.download.type = 'button';
      raNodes.download.addEventListener('click', downloadReadAlongWorksheetHtml);
      raNodes.docx = el('button', 'btn', 'Download Word (.docx)');
      raNodes.docx.type = 'button';
      raNodes.docx.id = 'pc-ra-docx';
      raNodes.docx.addEventListener('click', downloadReadAlongWorksheetDocx);
      raNodes.docxPack = el('button', 'btn', 'Editable print pack (.zip)');
      raNodes.docxPack.type = 'button';
      raNodes.docxPack.id = 'pc-ra-docx-pack';
      raNodes.docxPack.addEventListener('click', downloadReadAlongDocxPack);
      raNodes.audioBtn = el('button', 'btn', 'Worksheet audio player');
      raNodes.audioBtn.type = 'button';
      raNodes.audioBtn.hidden = true;
      raNodes.audioBtn.addEventListener('click', function () {
        if (!raState) return;
        audioOpener = raOpener || raNodes.audioBtn;
        openReadAlongAudio(raCurrentInput());
      });
      raNodes.back = el('button', 'btn', TEXT.back);
      raNodes.back.type = 'button';
      raNodes.back.addEventListener('click', closeReadAlongWorksheet);
      actions.appendChild(raNodes.print);
      actions.appendChild(raNodes.download);
      actions.appendChild(raNodes.docx);
      actions.appendChild(raNodes.docxPack);
      actions.appendChild(raNodes.audioBtn);
      actions.appendChild(raNodes.back);
      bar.appendChild(actions);

      raNodes.tip = el('p', 'pc-hint', TEXT.tip);
      bar.appendChild(raNodes.tip);

      raNodes.options = el('details', 'pc-options');
      raNodes.options.appendChild(el('summary', '', 'Worksheet options'));
      var optBody = el('div', 'pc-options-body');
      var makeRaToggle = function (id, labelText, key, onToggle) {
        var wrap = el('label', 'radio pc-radio pc-check'), box = el('input');
        box.type = 'checkbox'; box.id = id; box.checked = !!raOptions[key];
        wrap.classList.toggle('is-on', box.checked);
        box.addEventListener('change', function () {
          raOptions[key] = !!box.checked;
          raSyncOptionClasses();
          if (typeof onToggle === 'function') onToggle(box.checked);
          else drawReadAlongWorksheet({ keepStructure: true });
        });
        wrap.appendChild(box);
        wrap.appendChild(el('span', '', labelText));
        raNodes[key + 'Box'] = box;
        raNodes[key + 'Wrap'] = wrap;
        optBody.appendChild(wrap);
      };
      makeRaToggle('pc-ra-syllables', TEXT.syllables, 'syllables', function (checked) {
        raSyllableNote = '';
        if (checked && (!raState || raCleanLang(raState.lang || 'en') === 'en')) ensureSyllablesLoaded();
        drawReadAlongWorksheet({ keepStructure: true });
      });
      makeRaToggle('pc-ra-bold', 'Bold word starts', 'bold');
      makeRaToggle('pc-ra-supports', 'Include reading notes', 'supports', function () {
        drawReadAlongWorksheet();
      });
      makeRaToggle('pc-ra-answer-key', 'Include teacher answer key', 'answerKey');

      var linesRow = el('div', 'pc-ra-opt-row');
      var linesField = el('div', 'pc-ra-opt-field');
      var linesLbl = el('label', '', 'Writing lines (when no questions)');
      linesLbl.htmlFor = 'pc-ra-write-lines';
      var linesSel = el('select', 'pc-ra-opt-select');
      linesSel.id = 'pc-ra-write-lines';
      [['3', '3 writing lines'], ['5', '5 writing lines (default)'], ['8', '8 writing lines']].forEach(function (pair) {
        var o = el('option', '', pair[1]);
        o.value = pair[0];
        if (Number(pair[0]) === raOptions.writeLines) o.selected = true;
        linesSel.appendChild(o);
      });
      linesSel.addEventListener('change', function () {
        raOptions.writeLines = raNormalizeWriteLines(linesSel.value);
        drawReadAlongWorksheet({ keepStructure: true });
      });
      linesField.appendChild(linesLbl);
      linesField.appendChild(linesSel);
      linesRow.appendChild(linesField);
      raNodes.writeLinesSelect = linesSel;
      raNodes.writeLinesRow = linesRow;
      optBody.appendChild(linesRow);

      raNodes.options.appendChild(optBody);
      bar.appendChild(raNodes.options);

      raCustomizer = createCustomizerUi('ra', 'read-along', function () { return raCustom; }, {
        onUpdate: function (opts) { drawReadAlongWorksheet(opts); },
        onReset: function () {
          raCustom = wsCreateDefaultCustom(raState ? raState.title : 'Read along');
          drawReadAlongWorksheet();
        },
        getDefaultTitle: function () { return raState ? raState.title : 'Read along'; },
        getOptions: function () {
          return { syllables: !!raOptions.syllables, bold: !!raOptions.bold, supports: !!raOptions.supports, answerKey: !!raOptions.answerKey, writeLines: raOptions.writeLines };
        },
        onApplyOptions: function (o) {
          var opts = o && typeof o === 'object' ? o : {};
          if (typeof opts.syllables === 'boolean') {
            raOptions.syllables = opts.syllables;
            if (raNodes.syllablesBox) raNodes.syllablesBox.checked = raOptions.syllables;
            raSyllableNote = '';
            if (raOptions.syllables && (!raState || raCleanLang(raState.lang || 'en') === 'en')) ensureSyllablesLoaded();
          }
          if (typeof opts.bold === 'boolean') {
            raOptions.bold = opts.bold;
            if (raNodes.boldBox) raNodes.boldBox.checked = raOptions.bold;
          }
          if (typeof opts.supports === 'boolean') {
            raOptions.supports = opts.supports;
            if (raNodes.supportsBox) raNodes.supportsBox.checked = raOptions.supports;
          }
          if (typeof opts.answerKey === 'boolean') {
            raOptions.answerKey = opts.answerKey;
            if (raNodes.answerKeyBox) raNodes.answerKeyBox.checked = raOptions.answerKey;
          }
          if (opts.writeLines !== undefined) {
            raOptions.writeLines = raNormalizeWriteLines(opts.writeLines);
            if (raNodes.writeLinesSelect) raNodes.writeLinesSelect.value = String(raOptions.writeLines);
          }
          raSyncOptionClasses();
          return null;
        }
      });
      raNodes.customizer = raCustomizer.details;
      bar.appendChild(raCustomizer.details);

      raView.appendChild(bar);
      raNodes.sheets = el('div', 'pc-sheets');
      raView.appendChild(raNodes.sheets);
      doc.body.appendChild(raView);
    }
    function renderReadAlongWorksheetSheet(model) {
      var sheet = el('section', 'pc-sheet pc-ws-sheet pc-ra-sheet pc-density-' + (model.density || 'standard'));
      sheet.setAttribute('data-density', model.density || 'standard');
      sheet.setAttribute('aria-label', model.title);
      if (model.isRtl) sheet.setAttribute('dir', 'rtl');
      var header = el('header', 'pc-ws-header');
      appendWorksheetHeaderDom(header, model);
      sheet.appendChild(header);

      var hp = model.hiddenParts || Object.create(null);
      var ov = model.sectionOverrides || Object.create(null);
      var keySections = [];

      // Part 1 — Read the Passage
      if (!hp.passage) {
        var p1Copy = wsApplySectionCopy(ov, 'passage', null, 'Part 1 \u2014 Read the Passage', raDefaultPassageDirections(model));
        var p1Sec = el('section', 'pc-ws-section');
        p1Sec.setAttribute('data-ra-part', 'passage');
        var p1Head = el('div', 'pc-ws-section-head');
        p1Head.appendChild(el('h3', 'pc-ws-section-title', p1Copy.heading));
        if (p1Copy.directions) p1Head.appendChild(el('p', 'pc-ws-directions', p1Copy.directions));
        p1Sec.appendChild(p1Head);
        var passBox = el('div', 'pc-ra-passage');
        if (model.isRtl) passBox.setAttribute('dir', 'rtl');
        if (model.paragraphs.length) {
          model.paragraphs.forEach(function (pg) {
            var node = pg.heading ? el('h4', 'pc-ra-subhead') : el('p', 'pc-ra-para');
            raAppendFormattedText(node, pg.text, model);
            passBox.appendChild(node);
          });
        } else {
          passBox.appendChild(el('p', 'pc-ra-para', ''));
        }
        p1Sec.appendChild(passBox);
        sheet.appendChild(p1Sec);
      }

      // Part 2 — Reading Notes & Visual Supports
      if (!hp.supports && model.showSupports && model.customSupports.length) {
        var p2Copy = wsApplySectionCopy(ov, 'supports', null, 'Part 2 \u2014 Reading Notes & Visual Supports', 'Use these notes and pictures to help you understand the passage.');
        var p2Sec = el('section', 'pc-ws-section');
        p2Sec.setAttribute('data-ra-part', 'supports');
        var p2Head = el('div', 'pc-ws-section-head');
        p2Head.appendChild(el('h3', 'pc-ws-section-title', p2Copy.heading));
        if (p2Copy.directions) p2Head.appendChild(el('p', 'pc-ws-directions', p2Copy.directions));
        p2Sec.appendChild(p2Head);
        var sList = el('ul', 'pc-ra-sup-list');
        model.customSupports.forEach(function (sup) {
          var li = el('li', 'pc-ra-sup-item');
          if (sup.imgUri) {
            var img = el('img', 'pc-ra-sup-img');
            img.src = sup.imgUri;
            img.alt = sup.alt || sup.quote || 'Support picture';
            img.decoding = 'sync';
            li.appendChild(img);
          }
          var body = el('div', 'pc-ra-sup-body');
          var lbl = sup.quote
            ? sup.quote + (sup.line != null ? ' (sentence ' + (sup.line + 1) + ')' : '')
            : (sup.line != null ? 'Sentence ' + (sup.line + 1) : 'Note');
          body.appendChild(el('strong', 'pc-ra-sup-quote', lbl + ': '));
          body.appendChild(el('span', '', sup.text));
          li.appendChild(body);
          sList.appendChild(li);
        });
        p2Sec.appendChild(sList);
        sheet.appendChild(p2Sec);
      }

      // Part 3 — Match the Key Words
      if (!hp.matching && model.matchWords.length) {
        var p3Copy = wsApplySectionCopy(ov, 'matching', null, 'Part 3 \u2014 Match the Key Words', 'Write the letter of the matching meaning on the line next to each word.');
        var p3Sec = el('section', 'pc-ws-section');
        p3Sec.setAttribute('data-ra-part', 'matching');
        var p3Head = el('div', 'pc-ws-section-head');
        p3Head.appendChild(el('h3', 'pc-ws-section-title', p3Copy.heading));
        if (p3Copy.directions) p3Head.appendChild(el('p', 'pc-ws-directions', p3Copy.directions));
        p3Sec.appendChild(p3Head);
        var grid = el('div', 'pc-vocab-match-grid');
        var wList = el('ol', 'pc-vocab-match-words');
        model.matchWords.forEach(function (item) {
          var li = el('li', 'pc-vocab-match-word');
          li.appendChild(el('span', 'pc-ws-num', item.num + '.'));
          var blank = el('span', 'pc-vocab-match-blank');
          blank.setAttribute('aria-label', 'letter blank');
          li.appendChild(blank);
          li.appendChild(el('span', 'pc-ws-word', item.word));
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
        p3Sec.appendChild(grid);
        sheet.appendChild(p3Sec);
        keySections.push({
          heading: p3Copy.heading,
          lines: model.matchWords.map(function (it) { return it.word + ' \u2014 ' + it.answerLetter + ' (' + it.meaning + ')'; })
        });
      }

      // Part 4 — Comprehension Questions or Write About What You Read
      if (!hp.writing) {
        var p4Sec = el('section', 'pc-ws-section');
        p4Sec.setAttribute('data-ra-part', 'writing');
        var p4Head = el('div', 'pc-ws-section-head');
        if (model.questions.length) {
          var p4CopyQ = wsApplySectionCopy(ov, 'writing', null, 'Part 4 \u2014 Check Your Understanding', 'Answer each question below about what you read.');
          p4Head.appendChild(el('h3', 'pc-ws-section-title', p4CopyQ.heading));
          if (p4CopyQ.directions) p4Head.appendChild(el('p', 'pc-ws-directions', p4CopyQ.directions));
          p4Sec.appendChild(p4Head);
          var qList = el('ol', 'pc-ra-check-list');
          model.questions.forEach(function (q, idx) {
            var n = idx + 1;
            var li = el('li', 'pc-ra-check-item');
            var promptEl = el('p', 'pc-ra-check-prompt');
            promptEl.appendChild(el('strong', '', n + '. '));
            promptEl.appendChild(doc.createTextNode(q.prompt));
            li.appendChild(promptEl);
            if (q.kind === 'mc' && q.choices && q.choices.length) {
              var ul = el('ul', 'pc-ra-mc-choices');
              q.choices.forEach(function (c, ci) {
                var cLi = el('li', 'pc-ra-mc-choice');
                var bx = el('span', 'pc-ra-mc-box');
                bx.setAttribute('aria-hidden', 'true');
                cLi.appendChild(bx);
                cLi.appendChild(el('span', 'pc-vocab-match-letter', vocabLetterLabel(ci) + '.'));
                cLi.appendChild(el('span', '', c));
                ul.appendChild(cLi);
              });
              li.appendChild(ul);
            } else {
              var wWrap = el('div', 'pc-ra-write-lines');
              wWrap.appendChild(el('div', 'pc-ra-write-line'));
              wWrap.appendChild(el('div', 'pc-ra-write-line'));
              li.appendChild(wWrap);
            }
            qList.appendChild(li);
          });
          p4Sec.appendChild(qList);
          keySections.push({
            heading: p4CopyQ.heading,
            lines: model.questions.map(function (q) {
              if (q.kind === 'mc' && q.choices && q.choices.length) {
                return q.prompt + ' \u2014 ' + vocabLetterLabel(q.answer) + '. ' + (q.choices[q.answer] || '');
              }
              return q.prompt + ' \u2014 Open response (answers will vary)';
            })
          });
        } else {
          var p4CopyW = wsApplySectionCopy(ov, 'writing', null, 'Part 4 \u2014 Write About What You Read', 'Write a summary, main idea, or response about the passage on the lines below.');
          p4Head.appendChild(el('h3', 'pc-ws-section-title', p4CopyW.heading));
          if (p4CopyW.directions) p4Head.appendChild(el('p', 'pc-ws-directions', p4CopyW.directions));
          p4Sec.appendChild(p4Head);
          var linesBox = el('div', 'pc-ra-write-lines');
          for (var wi = 0; wi < model.writeLines; wi++) linesBox.appendChild(el('div', 'pc-ra-write-line'));
          p4Sec.appendChild(linesBox);
        }
        sheet.appendChild(p4Sec);
      }

      if (model.answerKeyOn && keySections.length) {
        var keySec = el('section', 'pc-ws-key');
        keySec.setAttribute('data-answer-key', 'true');
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
    function drawReadAlongWorksheet(drawOpts) {
      if (!raView || !raState) return;
      while (raNodes.sheets.firstChild) raNodes.sheets.removeChild(raNodes.sheets.firstChild);
      var model = buildReadAlongWorksheetModel(raCurrentInput());
      var hp = model.hiddenParts || Object.create(null);
      var hasBaseContent = model.paragraphs.length > 0;
      var visibleParts = (!hp.passage ? 1 : 0)
        + (!hp.supports && model.showSupports && model.customSupports.length ? 1 : 0)
        + (!hp.matching && model.matchWords.length ? 1 : 0)
        + (!hp.writing ? 1 : 0);
      var hasContent = hasBaseContent && visibleParts > 0;

      raNodes.print.disabled = !hasContent;
      raNodes.download.disabled = !hasContent;
      if (raNodes.docx) raNodes.docx.disabled = !hasContent;
      if (raNodes.docxPack) raNodes.docxPack.disabled = !hasContent;
      if (raNodes.audioBtn) raNodes.audioBtn.hidden = !(hasContent && raHasClips(raState));
      if (raNodes.supportsWrap) raNodes.supportsWrap.hidden = model.allSupports.length === 0;
      if (raNodes.writeLinesRow) raNodes.writeLinesRow.hidden = model.questions.length > 0;
      raNodes.options.hidden = !hasBaseContent;
      if (raNodes.customizer) raNodes.customizer.hidden = !hasBaseContent;
      raNodes.tip.hidden = !hasBaseContent;

      if (raCustomizer && hasBaseContent) {
        var raSecDefs = [
          {
            key: 'passage',
            defaultHeading: 'Part 1 \u2014 Read the Passage',
            defaultDirections: raDefaultPassageDirections(model)
          }
        ];
        if (model.allSupports.length > 0 && model.showSupports) {
          raSecDefs.push({
            key: 'supports',
            defaultHeading: 'Part 2 \u2014 Reading Notes & Visual Supports',
            defaultDirections: 'Use these notes and pictures to help you understand the passage.'
          });
        }
        if (model.matchWords.length > 0) {
          raSecDefs.push({
            key: 'matching',
            defaultHeading: 'Part 3 \u2014 Match the Key Words',
            defaultDirections: 'Write the letter of the matching meaning on the line next to each word.'
          });
        }
        raSecDefs.push({
          key: 'writing',
          defaultHeading: model.allQuestions.length ? 'Part 4 \u2014 Check Your Understanding' : 'Part 4 \u2014 Write About What You Read',
          defaultDirections: model.allQuestions.length
            ? 'Answer each question below about what you read.'
            : 'Write a summary, main idea, or response about the passage on the lines below.',
          items: model.allQuestions.length ? model.allQuestions.map(function (q) {
            var snip = q.prompt.length > 36 ? (q.prompt.slice(0, 35).trim() + '\u2026') : q.prompt;
            return {
              key: q.itemKey,
              origIndex: q.origIndex,
              label: snip,
              editFields: [
                {
                  key: q.itemKey,
                  label: 'Question prompt',
                  defaultValue: q.defaultPrompt || q.prompt || '',
                  placeholder: 'Edit comprehension question'
                }
              ]
            };
          }) : null
        });
        raCustomizer.sync({
          defaultTitle: raState.title || 'Read along',
          hasItemToggles: model.allQuestions.length > 0,
          sections: raSecDefs
        }, drawOpts);
      }

      if (!hasBaseContent) {
        raNodes.said.textContent = 'No passage text is available yet. Type a passage first, then come back here.';
        return;
      }
      if (!hasContent) {
        raNodes.said.textContent = 'All sections are currently hidden. Open Customize worksheet to show them.';
        return;
      }
      var extra = raOptions.syllables && raSyllableNote ? (' ' + raSyllableNote) : '';
      raNodes.said.textContent = count(model.paragraphs.length, 'paragraph') + ', ' + count(visibleParts, 'part') + ' ready to print or download.' + extra;
      raNodes.sheets.appendChild(renderReadAlongWorksheetSheet(model));
    }
    function openReadAlongWorksheet(given, opts) {
      if (!raView) buildReadAlongWorksheetView();
      if (view && !view.hidden) { run++; view.hidden = true; }
      if (wsView && !wsView.hidden) { wsRun++; wsView.hidden = true; }
      if (vocabView && !vocabView.hidden) { vocabRun++; vocabView.hidden = true; }
      if (audioView && !audioView.hidden) { stopAudioPlayback(); audioView.hidden = true; }
      raRun++;
      var s = given && typeof given === 'object' ? given : {};
      var o = opts && typeof opts === 'object' ? opts : {};
      var baseTitle = String(o.title || s.title || 'Read along').replace(/\s+/g, ' ').trim() || 'Read along';
      raState = Object.assign({}, s, { title: baseTitle });
      raSyllableNote = '';
      raOptions.syllables = o.showSyllables !== undefined ? !!o.showSyllables : (o.syllables !== undefined ? !!o.syllables : !!s.showSyllables);
      raOptions.bold = o.showBold !== undefined ? !!o.showBold : (o.bold !== undefined ? !!o.bold : !!s.showBold);
      raOptions.supports = o.showSupports !== undefined ? !!o.showSupports : (s.showSupports !== undefined ? !!s.showSupports : true);
      raOptions.answerKey = o.answerKey !== undefined ? !!o.answerKey : (o.includeAnswerKey !== undefined ? !!o.includeAnswerKey : (s.includeAnswerKey !== undefined ? !!s.includeAnswerKey : true));
      raOptions.writeLines = raNormalizeWriteLines(o.writeLines !== undefined ? o.writeLines : (s.writeLines !== undefined ? s.writeLines : 5));
      if (raNodes.syllablesBox) raNodes.syllablesBox.checked = raOptions.syllables;
      if (raNodes.boldBox) raNodes.boldBox.checked = raOptions.bold;
      if (raNodes.supportsBox) raNodes.supportsBox.checked = raOptions.supports;
      if (raNodes.answerKeyBox) raNodes.answerKeyBox.checked = raOptions.answerKey;
      if (raNodes.writeLinesSelect) raNodes.writeLinesSelect.value = String(raOptions.writeLines);
      raCustom = wsExtractCustom(s, o, baseTitle);
      if (raCustomizer) {
        raCustomizer.details.open = false;
        raCustomizer.resetTemplatesUi();
      }
      raSyncOptionClasses();
      if (raOptions.syllables && raCleanLang(raState.lang || 'en') === 'en') ensureSyllablesLoaded();
      raOpener = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : raOpener;
      raView.hidden = false;
      if (!docEscBound && doc && typeof doc.addEventListener === 'function') {
        doc.addEventListener('keydown', onDocKeyDown);
        docEscBound = true;
      }
      doc.body.classList.add('pc-on');
      drawReadAlongWorksheet();
      if (typeof win.scrollTo === 'function') { try { win.scrollTo(0, 0); } catch (_) {} }
      raNodes.heading.focus();
    }
    function closeReadAlongWorksheet() {
      if (!raView || raView.hidden) return;
      raRun++;
      raView.hidden = true;
      if (docEscBound && doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('keydown', onDocKeyDown);
        docEscBound = false;
      }
      doc.body.classList.remove('pc-on');
      while (raNodes.sheets.firstChild) raNodes.sheets.removeChild(raNodes.sheets.firstChild);
      if (raOpener && typeof raOpener.focus === 'function' && doc.contains(raOpener)) raOpener.focus();
    }
    function wireReadAlongWorksheet(button, getState) {
      if (!button || typeof getState !== 'function') return false;
      button.hidden = false;
      button.addEventListener('click', function () { raOpener = button; openReadAlongWorksheet(getState()); });
      return true;
    }

    // -------------------------------------------------------------------------
    // CTOPP-2-style Word Sounds Worksheet Audio Companion overlay (pure DOM)
    // -------------------------------------------------------------------------
    function stopAudioPlayback(msg) {
      audioRunId++;
      audioPlaying = false;
      if (audioTimer && win.clearTimeout) { try { win.clearTimeout(audioTimer); } catch (_) {} audioTimer = null; }
      if (audioRaf && win.cancelAnimationFrame) { try { win.cancelAnimationFrame(audioRaf); } catch (_) {} audioRaf = 0; }
      if (audioEl) { try { audioEl.pause(); audioEl.currentTime = 0; } catch (_) {} audioEl = null; }
      if (audioNodes.barWrap) audioNodes.barWrap.hidden = true;
      if (audioNodes.barFill) audioNodes.barFill.style.width = '0%';
      if (audioNodes.playBtn) audioNodes.playBtn.textContent = 'Play item';
      if (msg && audioNodes.status) audioNodes.status.textContent = msg;
    }
    function stepAudioItem(delta) {
      if (!audioPlan || !audioPlan.items.length) return;
      var next = Math.max(0, Math.min(audioPlan.items.length - 1, audioIdx + delta));
      if (next === audioIdx) return;
      stopAudioPlayback();
      audioIdx = next;
      syncAudioUi();
    }
    function audioTagOf(it) {
      return it && it.numLabel ? String(it.numLabel) : ('#' + (it ? it.numInSection : 1));
    }
    function audioScoreRec(i) {
      var k = String(i);
      if (!audioScores.items[k]) audioScores.items[k] = { score: null, repeats: 0, done: false, note: '' };
      return audioScores.items[k];
    }
    function audioScoreStats() {
      var scTot = 0, mk = 0, ok = 0, repAny = false, hasAny = !!(audioScores.studentName.trim() || audioScores.examiner.trim() || audioScores.notes.trim());
      ((audioPlan && audioPlan.sections) || []).forEach(function (sec) {
        var sc = sec.scored !== false;
        (sec.items || []).forEach(function (it) {
          var r = audioScores.items[String(it.index)];
          if (r) {
            if (r.repeats > 0) { repAny = true; hasAny = true; }
            if (r.note && String(r.note).trim()) hasAny = true;
            if (r.done) hasAny = true;
          }
          if (!sc) return;
          scTot++;
          if (r && (r.score === 1 || r.score === 0)) {
            mk++;
            hasAny = true;
            if (r.score === 1) ok++;
          }
        });
      });
      return { scTot: scTot, mk: mk, ok: ok, repAny: repAny, hasAny: hasAny };
    }
    function audioScorePayload() {
      var st = audioScoreStats();
      if (!st.hasAny) return null;
      return {
        studentName: audioScores.studentName.trim(),
        examiner: audioScores.examiner.trim(),
        date: wsAudioTodayIso(),
        items: audioScores.items,
        notes: audioScores.notes.trim()
      };
    }
    function toggleAudioItemScore(i, val) {
      if (!audioPlan || !audioPlan.items || !audioPlan.items[i]) return;
      var rec = audioScoreRec(i);
      if (audioScoredByIdx[i] === false) {
        rec.done = !rec.done;
      } else {
        rec.score = rec.score === val ? null : val;
      }
      syncAudioUi();
      renderScoreSheetDom();
    }
    function bumpAudioItemRepeat(i) {
      if (!audioPlan || !audioPlan.items || !audioPlan.items[i]) return;
      var rec = audioScoreRec(i);
      rec.repeats = (Number(rec.repeats) || 0) + 1;
      syncAudioUi();
      renderScoreSheetDom();
    }
    function renderScoreSheetDom() {
      var host = audioNodes.scoreSheet;
      if (!host || !audioPlan) return;
      while (host.firstChild) host.removeChild(host.firstChild);
      var stats = audioScoreStats();
      var hd = el('div', 'pc-score-head');
      hd.appendChild(el('h2', '', (audioPlan.title || 'Worksheet') + ' \u2014 Teacher Record & Scoring Sheet'));
      var mt = el('p', 'pc-score-meta');
      [
        ['Student / Code Name: ', audioScores.studentName.trim()],
        ['Date: ', stats.hasAny ? wsAudioTodayIso() : ''],
        ['Examiner: ', audioScores.examiner.trim()]
      ].forEach(function (pair) {
        var sp = el('span', '', pair[0]);
        sp.appendChild(el('span', 'pc-score-line', pair[1]));
        mt.appendChild(sp);
      });
      hd.appendChild(mt);
      var cond = [
        'Speed: ' + (audioOpts.slow ? 'Slow (0.8x)' : 'Standard (1.0x)'),
        'Response pause: ' + (audioOpts.autoSec > 0 ? (audioOpts.autoSec + 's auto-advance') : 'Manual')
      ];
      if (audioPlan.hasSoundGap) cond.push('Sound gap: ' + ((Number(audioOpts.gapMs) || 700) / 1000).toFixed(1) + 's');
      if (audioPlan.hasDirections) cond.push('Directions: ' + (audioOpts.dirMode === 'every' ? 'Every item' : (audioOpts.dirMode === 'none' ? 'Words / sounds only' : 'First item per section')));
      hd.appendChild(el('p', 'pc-score-cond', 'Audio setup: ' + cond.join(' \u00b7 ')));
      host.appendChild(hd);

      var totalScored = 0;
      (audioPlan.sections || []).forEach(function (sec) {
        var sc = sec.scored !== false;
        var sEl = el('section', 'pc-score-sec');
        sEl.appendChild(el('h3', '', sec.label));
        var tbl = el('table', 'pc-score-tbl');
        var thead = el('thead');
        var htr = el('tr');
        var cols = sc
          ? [['pc-score-num', '#'], ['', 'Item / Audio Prompt'], ['', 'Expected Answer'], ['pc-score-sc', 'Score'], ['pc-score-rep', 'Rep.'], ['pc-score-nt', 'Notes / Error Pattern']]
          : [['pc-score-num', '#'], ['', 'Item / Audio Prompt'], ['pc-score-dn', 'Done'], ['pc-score-nt', 'Notes']];
        cols.forEach(function (c) { htr.appendChild(el('th', c[0], c[1])); });
        thead.appendChild(htr);
        tbl.appendChild(thead);
        var tb = el('tbody');
        var items = sec.items || [];
        var secOk = 0, secMk = 0;
        if (sc) totalScored += items.length;
        items.forEach(function (it) {
          var rec = audioScores.items[String(it.index)] || {};
          var tr = el('tr');
          tr.appendChild(el('td', 'pc-score-num', it.numLabel ? String(it.numLabel) : String(it.numInSection)));
          tr.appendChild(el('td', '', it.script));
          if (sc) {
            var val = (rec.score === 1 || rec.score === 0) ? rec.score : null;
            if (val !== null) { secMk++; if (val === 1) secOk++; }
            tr.appendChild(el('td', '', it.answer));
            var tdS = el('td', 'pc-score-sc');
            tdS.appendChild(el('span', 'pc-score-bub' + (val === 1 ? ' is-picked' : ''), '1'));
            tdS.appendChild(doc.createTextNode(' '));
            tdS.appendChild(el('span', 'pc-score-bub' + (val === 0 ? ' is-picked' : ''), '0'));
            tr.appendChild(tdS);
            tr.appendChild(el('td', 'pc-score-rep', rec.repeats > 0 ? String(rec.repeats) : ''));
            tr.appendChild(el('td', 'pc-score-nt', rec.note ? String(rec.note).trim() : ''));
          } else {
            var tdD = el('td', 'pc-score-dn');
            tdD.appendChild(el('span', 'pc-score-box' + (rec.done ? ' is-checked' : ''), rec.done ? '\u2713' : ''));
            tr.appendChild(tdD);
            tr.appendChild(el('td', 'pc-score-nt', rec.note ? String(rec.note).trim() : ''));
          }
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        sEl.appendChild(tbl);
        var sub = el('p', 'pc-score-sub');
        if (sc) {
          sub.appendChild(doc.createTextNode('Section subtotal: '));
          if (secMk > 0) {
            sub.appendChild(el('strong', '', String(secOk)));
            sub.appendChild(doc.createTextNode(' / ' + items.length + ' (' + Math.round((secOk / Math.max(1, items.length)) * 100) + '%)'));
          } else {
            sub.appendChild(el('span', 'pc-score-blank'));
            sub.appendChild(doc.createTextNode(' / ' + items.length));
          }
        } else {
          sub.textContent = 'Practice / listening only (not scored).';
        }
        sEl.appendChild(sub);
        host.appendChild(sEl);
      });

      var sum = el('section', 'pc-score-sum');
      sum.appendChild(el('h3', '', 'Summary & Observations'));
      var totP = el('p', '');
      if (totalScored > 0) {
        totP.appendChild(el('strong', '', 'Total scored: '));
        if (stats.mk > 0) {
          totP.appendChild(el('strong', '', stats.ok + ' / ' + totalScored + ' (' + Math.round((stats.ok / totalScored) * 100) + '%)'));
        } else {
          totP.appendChild(el('span', 'pc-score-blank'));
          totP.appendChild(doc.createTextNode(' / ' + totalScored));
        }
      } else {
        totP.textContent = 'Practice / listening sheet (unscored).';
      }
      sum.appendChild(totP);
      var obs = el('p', 'pc-score-obs');
      [
        ['Used slow playback (0.8x)', stats.mk > 0 && !!audioOpts.slow],
        ['Needed extra wait time', false],
        ['Repeated items', !!stats.repAny],
        ['Self-corrected', false],
        ['Fatigue / took a break', false]
      ].forEach(function (pair) {
        var sp = el('span');
        sp.appendChild(el('span', 'pc-score-box' + (pair[1] ? ' is-checked' : ''), pair[1] ? '\u2713' : ''));
        sp.appendChild(doc.createTextNode(pair[0]));
        obs.appendChild(sp);
      });
      sum.appendChild(obs);
      sum.appendChild(el('p', '', 'Next teaching focus / notes:'));
      sum.appendChild(el('div', 'pc-score-wline'));
      sum.appendChild(el('div', 'pc-score-wline'));
      host.appendChild(sum);
    }
    function syncAudioUi() {
      if (!audioView || !audioPlan) return;
      var list = audioPlan.items || [];
      if (!list.length) {
        audioNodes.itemTitle.textContent = 'No worksheet items available.';
        audioNodes.script.textContent = '';
        audioNodes.ans.hidden = true;
        audioNodes.prevBtn.disabled = true;
        audioNodes.nextBtn.disabled = true;
        audioNodes.playBtn.disabled = true;
        return;
      }
      var it = list[audioIdx] || list[0];
      var tag = audioTagOf(it);
      var isScored = audioScoredByIdx[audioIdx] !== false;
      var rec = audioScoreRec(audioIdx);
      var stats = audioScoreStats();
      audioNodes.badge.textContent = it.sectionLabel;
      audioNodes.counter.textContent = 'Item ' + (audioIdx + 1) + ' of ' + list.length + ' (Worksheet ' + tag + ')';
      audioNodes.itemTitle.textContent = it.sectionLabel + ' \u2014 ' + tag;
      audioNodes.script.textContent = it.script;
      audioNodes.ans.textContent = 'Teacher key: ' + it.answer;
      audioNodes.ans.hidden = !audioOpts.showAns;
      audioNodes.prevBtn.disabled = audioIdx <= 0;
      audioNodes.nextBtn.disabled = audioIdx >= list.length - 1;
      audioNodes.playBtn.disabled = false;
      if (audioNodes.mark1) {
        audioNodes.mark1.hidden = !isScored;
        audioNodes.mark1.setAttribute('aria-pressed', rec.score === 1 ? 'true' : 'false');
      }
      if (audioNodes.mark0) {
        audioNodes.mark0.hidden = !isScored;
        audioNodes.mark0.setAttribute('aria-pressed', rec.score === 0 ? 'true' : 'false');
      }
      if (audioNodes.markRep) {
        audioNodes.markRep.hidden = !isScored;
        audioNodes.markRep.textContent = '+ Repeat (' + (rec.repeats || 0) + ')';
      }
      if (audioNodes.markDone) {
        audioNodes.markDone.hidden = isScored;
        audioNodes.markDone.setAttribute('aria-pressed', rec.done ? 'true' : 'false');
      }
      if (audioNodes.itemNote && doc.activeElement !== audioNodes.itemNote) {
        audioNodes.itemNote.value = rec.note || '';
      }
      if (audioNodes.runningScore) {
        audioNodes.runningScore.textContent = stats.scTot > 0
          ? (stats.mk > 0
            ? ('Scored: ' + stats.ok + ' / ' + stats.mk + ' (' + Math.round((stats.ok / stats.mk) * 100) + '%) \u00b7 ' + stats.mk + '/' + stats.scTot + ' done')
            : ('No items scored yet (' + stats.scTot + ' scored items)'))
          : 'Practice / listening only';
      }
      (audioNodes.rows || []).forEach(function (r, ri) {
        if (!r) return;
        var rt = audioTagOf(list[ri]);
        var rr = audioScores.items[String(ri)];
        r.li.classList.toggle('is-active', ri === audioIdx);
        r.li.classList.toggle('is-played', !!audioPlayed[ri]);
        r.num.textContent = audioPlayed[ri] ? '\u2713 ' + rt : rt;
        r.ans.hidden = !audioOpts.showAns;
        if (r.scoreTag) {
          var bits = [];
          if (rr) {
            if (rr.score === 1) bits.push('Score: 1');
            else if (rr.score === 0) bits.push('Score: 0');
            else if (rr.done) bits.push('Done');
            if (rr.repeats > 0) bits.push('Rep: ' + rr.repeats);
            if (rr.note && String(rr.note).trim()) bits.push(String(rr.note).trim());
          }
          r.scoreTag.textContent = bits.join(' \u00b7 ');
          r.scoreTag.hidden = !bits.length;
        }
      });
    }
    function playOneAudioClip(cid, mine) {
      return new Promise(function (resolve) {
        var uri = audioPlan && audioPlan.audio ? audioPlan.audio[cid] : '';
        if (!uri || mine !== audioRunId || typeof win.Audio !== 'function') { resolve(); return; }
        var a = new win.Audio(uri);
        audioEl = a;
        try { a.playbackRate = audioOpts.slow ? 0.8 : 1; } catch (_) {}
        var done = function () { if (audioEl === a) audioEl = null; resolve(); };
        a.onended = done;
        a.onerror = done;
        try {
          var p = a.play();
          if (p && typeof p.catch === 'function') p.catch(done);
        } catch (_) { done(); }
      });
    }
    function waitAudioMs(ms, mine, showBar) {
      return new Promise(function (resolve) {
        if (mine !== audioRunId || ms <= 0 || typeof win.setTimeout !== 'function') { resolve(); return; }
        if (showBar && audioNodes.barWrap && audioNodes.barFill) {
          audioNodes.barWrap.hidden = false;
          var t0 = Date.now();
          var stepBar = function () {
            if (mine !== audioRunId) { audioNodes.barWrap.hidden = true; return; }
            var f = Math.min(1, (Date.now() - t0) / ms);
            audioNodes.barFill.style.width = Math.round(f * 100) + '%';
            if (f < 1 && typeof win.requestAnimationFrame === 'function') audioRaf = win.requestAnimationFrame(stepBar);
          };
          if (typeof win.requestAnimationFrame === 'function') audioRaf = win.requestAnimationFrame(stepBar);
        }
        audioTimer = win.setTimeout(function () {
          audioTimer = null;
          if (audioNodes.barWrap) audioNodes.barWrap.hidden = true;
          resolve();
        }, ms);
      });
    }
    function playCurrentAudioItem(isReplay) {
      stopAudioPlayback();
      if (!audioPlan || !audioPlan.items.length) return;
      var it = audioPlan.items[audioIdx];
      if (!it) return;
      if (isReplay && audioPlayed[audioIdx] && audioScoredByIdx[audioIdx] !== false) {
        bumpAudioItemRepeat(audioIdx);
      }
      var mine = ++audioRunId;
      audioPlaying = true;
      audioNodes.playBtn.textContent = 'Playing...';
      var seq = [];
      var useDir = !!(audioPlan && audioPlan.hasDirections) && (audioOpts.dirMode === 'every' || (audioOpts.dirMode === 'section' && it.numInSection === 1));
      if (useDir) it.promptClips.forEach(function (c) { seq.push({ id: c, gap: 320 }); });
      it.mainClips.forEach(function (c, ci) {
        seq.push({ id: c, gap: ci < it.mainClips.length - 1 ? (it.segmented ? audioOpts.gapMs : 280) : 0 });
      });
      if (it.choiceClips && it.choiceClips.length) {
        if (seq.length) seq[seq.length - 1].gap = 420;
        it.choiceClips.forEach(function (c, ci) { seq.push({ id: c, gap: ci < it.choiceClips.length - 1 ? 420 : 0 }); });
      }
      if (!seq.length) {
        audioPlayed[audioIdx] = true;
        audioPlaying = false;
        audioNodes.playBtn.textContent = 'Play item';
        audioNodes.status.textContent = 'No recording for this item \u2014 read aloud: ' + it.script;
        syncAudioUi();
        return;
      }
      var itTag = audioTagOf(it);
      audioNodes.status.textContent = 'Playing ' + it.sectionLabel + ' ' + itTag + '...';
      var chain = Promise.resolve();
      seq.forEach(function (st) {
        chain = chain.then(function () { return playOneAudioClip(st.id, mine); })
          .then(function () { return st.gap ? waitAudioMs(st.gap, mine, false) : null; });
      });
      chain.then(function () {
        if (mine !== audioRunId) return;
        audioPlayed[audioIdx] = true;
        syncAudioUi();
        if (audioOpts.autoSec > 0 && audioIdx < audioPlan.items.length - 1) {
          audioNodes.status.textContent = 'Response window (' + audioOpts.autoSec + 's) before next item...';
          return waitAudioMs(audioOpts.autoSec * 1000, mine, true).then(function () {
            if (mine !== audioRunId) return;
            audioIdx++;
            syncAudioUi();
            playCurrentAudioItem(false);
          });
        }
        audioPlaying = false;
        audioNodes.playBtn.textContent = 'Play item';
        audioNodes.status.textContent = 'Finished ' + it.sectionLabel + ' ' + itTag + '.';
      });
    }
    function downloadWorksheetAudioCsv() {
      if (!audioPlan) return;
      var csv = buildAudioScoresCsv(audioPlan, {
        studentName: audioScores.studentName.trim(),
        examiner: audioScores.examiner.trim(),
        date: wsAudioTodayIso(),
        items: audioScores.items,
        notes: audioScores.notes.trim()
      }, audioOpts);
      if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') return;
      var blob = new win.Blob([csv], { type: 'text/csv;charset=utf-8' });
      var url = win.URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      link.download = wsSlug((audioPlan && audioPlan.title) || 'worksheet') + '-scores.csv';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (audioNodes.said) audioNodes.said.textContent = 'Downloaded scoring results (.csv).';
    }
    function downloadWorksheetAudioResultsJson() {
      if (!audioPlan) return;
      var payloadObj = buildAudioResultsJson(audioPlan, {
        studentName: audioScores.studentName.trim(),
        examiner: audioScores.examiner.trim(),
        date: wsAudioTodayIso(),
        items: audioScores.items,
        notes: audioScores.notes.trim()
      }, audioOpts);
      if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') return;
      var blob = new win.Blob([JSON.stringify(payloadObj, null, 2)], { type: 'application/json;charset=utf-8' });
      var url = win.URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      link.download = wsSlug((audioPlan && audioPlan.title) || 'worksheet') + '-results.' + 'json';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (audioNodes.said) audioNodes.said.textContent = 'Saved Add Up Results file (.json).';
    }
    function downloadWorksheetAudioHtml() {
      if (!audioPlan) return;
      var html = buildAudioCompanionHtmlFromPlan(audioPlan);
      if (typeof win.Blob !== 'function' || !win.URL || typeof win.URL.createObjectURL !== 'function') return;
      var blob = new win.Blob([html], { type: 'text/html;charset=utf-8' });
      var url = win.URL.createObjectURL(blob);
      var link = doc.createElement('a');
      link.href = url;
      var suffix = audioPlan.kind === 'vocab' ? '-vocab-audio-companion.' : (audioPlan.kind === 'read-along' ? '-read-along-audio-companion.' : '-worksheet-audio-companion.');
      link.download = wsSlug((audioPlan && audioPlan.title) || 'worksheet') + suffix + 'html';
      link.hidden = true;
      doc.body.appendChild(link);
      link.click();
      doc.body.removeChild(link);
      if (typeof win.setTimeout === 'function') win.setTimeout(function () { try { win.URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      if (audioNodes.said) audioNodes.said.textContent = 'Downloaded standalone offline audio player (.html).';
    }
    function buildAudioCompanionView() {
      audioView = el('div', 'pc pc-audio-view');
      audioView.id = 'worksheet-audio-view';
      audioView.hidden = true;
      var bar = el('div', 'pc-bar');
      audioNodes.heading = el('h1', '', 'Worksheet audio player');
      audioNodes.heading.id = 'pc-audio-heading';
      audioNodes.heading.tabIndex = -1;
      audioView.setAttribute('role', 'region');
      audioView.setAttribute('aria-labelledby', 'pc-audio-heading');
      bar.appendChild(audioNodes.heading);
      audioNodes.said = el('p', 'pc-said');
      audioNodes.said.setAttribute('role', 'status');
      bar.appendChild(audioNodes.said);
      var actions = el('p', 'pc-actions');
      audioNodes.download = el('button', 'btn btn-primary', 'Download offline audio player (.html)');
      audioNodes.download.type = 'button';
      audioNodes.download.id = 'pc-audio-download';
      audioNodes.download.addEventListener('click', downloadWorksheetAudioHtml);
      audioNodes.printScore = el('button', 'btn', 'Print scoring sheet');
      audioNodes.printScore.type = 'button';
      audioNodes.printScore.id = 'pc-audio-print-score';
      audioNodes.printScore.addEventListener('click', function () {
        renderScoreSheetDom();
        if (typeof win.print === 'function') win.print();
      });
      audioNodes.docxScore = el('button', 'btn', 'Download scoring sheet (.docx)');
      audioNodes.docxScore.type = 'button';
      audioNodes.docxScore.id = 'pc-audio-docx-score';
      audioNodes.docxScore.addEventListener('click', function () {
        if (!audioPlan) return;
        if (audioNodes.said) audioNodes.said.textContent = 'Preparing scoring sheet (.docx)...';
        ensureDocx().then(function (docx) {
          if (!docx || typeof docx.buildScoringSheetDocx !== 'function' || typeof docx.downloadDocx !== 'function') {
            if (audioNodes.said) audioNodes.said.textContent = 'Word export could not load right now. Try Print scoring sheet instead.';
            return;
          }
          try {
            var res = docx.buildScoringSheetDocx(audioPlan, {
              slow: audioOpts.slow,
              autoSec: audioOpts.autoSec,
              gapMs: audioOpts.gapMs,
              dirMode: audioOpts.dirMode,
              scoreState: audioScorePayload()
            });
            docx.downloadDocx(res, win, doc);
            if (audioNodes.said) audioNodes.said.textContent = 'Downloaded scoring sheet (.docx).';
          } catch (_) {
            if (audioNodes.said) audioNodes.said.textContent = 'Could not build the scoring sheet document right now.';
          }
        });
      });
      audioNodes.csvScore = el('button', 'btn', 'Download scores (.csv)');
      audioNodes.csvScore.type = 'button';
      audioNodes.csvScore.id = 'pc-audio-csv';
      audioNodes.csvScore.addEventListener('click', downloadWorksheetAudioCsv);
      audioNodes.resultsJson = el('button', 'btn', 'Save for Add Up Results (.json)');
      audioNodes.resultsJson.type = 'button';
      audioNodes.resultsJson.id = 'pc-audio-results-json';
      audioNodes.resultsJson.addEventListener('click', downloadWorksheetAudioResultsJson);
      audioNodes.back = el('button', 'btn', TEXT.back);
      audioNodes.back.type = 'button';
      audioNodes.back.addEventListener('click', closeWorksheetAudio);
      actions.appendChild(audioNodes.download);
      actions.appendChild(audioNodes.printScore);
      actions.appendChild(audioNodes.docxScore);
      actions.appendChild(audioNodes.csvScore);
      actions.appendChild(audioNodes.resultsJson);
      actions.appendChild(audioNodes.back);
      bar.appendChild(actions);
      audioView.appendChild(bar);

      var wrap = el('div', 'pc-audio-wrap');
      var stage = el('section', 'pc-audio-stage');
      var meta = el('div', 'pc-audio-stage-meta');
      audioNodes.badge = el('span', 'pc-audio-badge', '');
      audioNodes.counter = el('span', 'pc-audio-counter', '');
      meta.appendChild(audioNodes.badge);
      meta.appendChild(audioNodes.counter);
      stage.appendChild(meta);
      audioNodes.itemTitle = el('h2', 'pc-audio-title', '');
      audioNodes.script = el('p', 'pc-audio-script', '');
      audioNodes.ans = el('p', 'pc-audio-answer', '');
      audioNodes.ans.hidden = true;
      var playbar = el('div', 'pc-audio-playbar');
      audioNodes.prevBtn = el('button', 'btn btn-small', 'Prev');
      audioNodes.playBtn = el('button', 'btn btn-primary', 'Play item');
      audioNodes.replayBtn = el('button', 'btn btn-small', 'Replay');
      audioNodes.stopBtn = el('button', 'btn btn-small', 'Stop');
      audioNodes.nextBtn = el('button', 'btn btn-small', 'Next');
      [audioNodes.prevBtn, audioNodes.playBtn, audioNodes.replayBtn, audioNodes.stopBtn, audioNodes.nextBtn].forEach(function (b) { b.type = 'button'; playbar.appendChild(b); });
      audioNodes.prevBtn.addEventListener('click', function () { stepAudioItem(-1); });
      audioNodes.nextBtn.addEventListener('click', function () { stepAudioItem(1); });
      audioNodes.playBtn.addEventListener('click', function () { if (audioPlaying) stopAudioPlayback('Stopped.'); else playCurrentAudioItem(false); });
      audioNodes.replayBtn.addEventListener('click', function () { playCurrentAudioItem(true); });
      audioNodes.stopBtn.addEventListener('click', function () { stopAudioPlayback('Stopped.'); });

      // Live examiner scoring panel
      var scorePanel = el('div', 'pc-audio-score-panel');
      var scoreMeta = el('div', 'pc-audio-score-meta');
      audioNodes.studentInp = el('input', 'pc-audio-score-input');
      audioNodes.studentInp.type = 'text';
      audioNodes.studentInp.id = 'pc-audio-student';
      audioNodes.studentInp.maxLength = 48;
      audioNodes.studentInp.placeholder = 'Student / code name (optional)';
      audioNodes.studentInp.setAttribute('aria-label', 'Student or code name');
      audioNodes.studentInp.addEventListener('input', function () {
        audioScores.studentName = audioNodes.studentInp.value;
        renderScoreSheetDom();
      });
      audioNodes.examinerInp = el('input', 'pc-audio-score-input');
      audioNodes.examinerInp.type = 'text';
      audioNodes.examinerInp.id = 'pc-audio-examiner';
      audioNodes.examinerInp.maxLength = 48;
      audioNodes.examinerInp.placeholder = 'Examiner (optional)';
      audioNodes.examinerInp.setAttribute('aria-label', 'Examiner name');
      audioNodes.examinerInp.addEventListener('input', function () {
        audioScores.examiner = audioNodes.examinerInp.value;
        renderScoreSheetDom();
      });
      audioNodes.runningScore = el('span', 'pc-audio-score-pill', 'No items scored yet');
      audioNodes.runningScore.id = 'pc-audio-running';
      audioNodes.clearScores = el('button', 'btn btn-small', 'Clear scores');
      audioNodes.clearScores.type = 'button';
      audioNodes.clearScores.id = 'pc-audio-clear-scores';
      audioNodes.clearScores.addEventListener('click', function () {
        audioScores.items = Object.create(null);
        if (audioNodes.itemNote) audioNodes.itemNote.value = '';
        if (audioNodes.status) audioNodes.status.textContent = 'Cleared all item scores.';
        syncAudioUi();
        renderScoreSheetDom();
      });
      scoreMeta.appendChild(audioNodes.studentInp);
      scoreMeta.appendChild(audioNodes.examinerInp);
      scoreMeta.appendChild(audioNodes.runningScore);
      scoreMeta.appendChild(audioNodes.clearScores);
      scorePanel.appendChild(scoreMeta);

      var scoreRow = el('div', 'pc-audio-score-row');
      audioNodes.mark1 = el('button', 'btn btn-small pc-audio-score-btn', 'Correct (1)');
      audioNodes.mark1.type = 'button';
      audioNodes.mark1.id = 'pc-audio-mark-1';
      audioNodes.mark1.setAttribute('aria-pressed', 'false');
      audioNodes.mark1.addEventListener('click', function () { toggleAudioItemScore(audioIdx, 1); });
      audioNodes.mark0 = el('button', 'btn btn-small pc-audio-score-btn', 'Incorrect (0)');
      audioNodes.mark0.type = 'button';
      audioNodes.mark0.id = 'pc-audio-mark-0';
      audioNodes.mark0.setAttribute('aria-pressed', 'false');
      audioNodes.mark0.addEventListener('click', function () { toggleAudioItemScore(audioIdx, 0); });
      audioNodes.markRep = el('button', 'btn btn-small pc-audio-score-btn', '+ Repeat (0)');
      audioNodes.markRep.type = 'button';
      audioNodes.markRep.id = 'pc-audio-mark-rep';
      audioNodes.markRep.addEventListener('click', function () { bumpAudioItemRepeat(audioIdx); });
      audioNodes.markDone = el('button', 'btn btn-small pc-audio-score-btn', 'Mark done');
      audioNodes.markDone.type = 'button';
      audioNodes.markDone.id = 'pc-audio-mark-done';
      audioNodes.markDone.setAttribute('aria-pressed', 'false');
      audioNodes.markDone.hidden = true;
      audioNodes.markDone.addEventListener('click', function () { toggleAudioItemScore(audioIdx, 1); });
      audioNodes.itemNote = el('input', 'pc-audio-score-note');
      audioNodes.itemNote.type = 'text';
      audioNodes.itemNote.id = 'pc-audio-item-note';
      audioNodes.itemNote.maxLength = 120;
      audioNodes.itemNote.placeholder = 'Quick note or error pattern (optional)';
      audioNodes.itemNote.setAttribute('aria-label', 'Item note or error pattern');
      audioNodes.itemNote.addEventListener('input', function () {
        var rec = audioScoreRec(audioIdx);
        rec.note = audioNodes.itemNote.value;
        syncAudioUi();
        renderScoreSheetDom();
      });
      [audioNodes.mark1, audioNodes.mark0, audioNodes.markRep, audioNodes.markDone, audioNodes.itemNote].forEach(function (n) { scoreRow.appendChild(n); });
      scorePanel.appendChild(scoreRow);

      audioNodes.barWrap = el('div', 'pc-audio-progress-wrap');
      audioNodes.barWrap.hidden = true;
      audioNodes.barFill = el('span', 'pc-audio-progress-fill');
      audioNodes.barWrap.appendChild(audioNodes.barFill);
      audioNodes.status = el('p', 'pc-audio-status', '');
      audioNodes.status.setAttribute('role', 'status');
      stage.appendChild(audioNodes.itemTitle);
      stage.appendChild(audioNodes.script);
      stage.appendChild(audioNodes.ans);
      stage.appendChild(playbar);
      stage.appendChild(scorePanel);
      stage.appendChild(audioNodes.barWrap);
      stage.appendChild(audioNodes.status);
      stage.appendChild(el('p', 'pc-audio-keys', 'Shortcuts: Space = Play/Stop, R = Replay, Left / Right = Prev / Next, 1 = Correct, 0 = Incorrect, P = +Repeat.'));
      wrap.appendChild(stage);

      var ctrls = el('section', 'pc-audio-controls');
      var makeCtrlSel = function (id, lblText, optPairs, initVal, onChange) {
        var box = el('div', 'pc-audio-ctrl');
        var l = el('label', '', lblText);
        l.htmlFor = id;
        var s = el('select');
        s.id = id;
        optPairs.forEach(function (pair) {
          var o = el('option', '', pair[1]);
          o.value = String(pair[0]);
          if (String(pair[0]) === String(initVal)) o.selected = true;
          s.appendChild(o);
        });
        s.addEventListener('change', function () { onChange(s.value); renderScoreSheetDom(); });
        box.appendChild(l);
        box.appendChild(s);
        ctrls.appendChild(box);
        return box;
      };
      audioNodes.autoBox = makeCtrlSel('pc-audio-auto', 'Auto-advance response pause', [['0', 'Manual (click Next)'], ['3', '3 seconds'], ['5', '5 seconds'], ['8', '8 seconds'], ['12', '12 seconds']], audioOpts.autoSec, function (v) { audioOpts.autoSec = Number(v) || 0; });
      audioNodes.gapBox = makeCtrlSel('pc-audio-gap', 'Sound gap', [['400', '0.4s (quick)'], ['700', '0.7s (standard)'], ['1000', '1.0s (CTOPP-style)']], audioOpts.gapMs, function (v) { audioOpts.gapMs = Number(v) || 700; });
      audioNodes.dirBox = makeCtrlSel('pc-audio-dir', 'Spoken directions', [['section', 'First item per section'], ['every', 'Every item'], ['none', 'Words / sounds only']], audioOpts.dirMode, function (v) { audioOpts.dirMode = v; });
      var chkBox = el('div', 'pc-audio-checks');
      var slowLbl = el('label', 'pc-audio-check'), slowInp = el('input');
      slowInp.type = 'checkbox'; slowInp.id = 'pc-audio-slow'; slowInp.checked = audioOpts.slow;
      slowInp.addEventListener('change', function () { audioOpts.slow = !!slowInp.checked; renderScoreSheetDom(); });
      slowLbl.appendChild(slowInp); slowLbl.appendChild(el('span', '', 'Slow playback (0.8x)'));
      var ansLbl = el('label', 'pc-audio-check'), ansInp = el('input');
      ansInp.type = 'checkbox'; ansInp.id = 'pc-audio-show-ans'; ansInp.checked = audioOpts.showAns;
      ansInp.addEventListener('change', function () { audioOpts.showAns = !!ansInp.checked; syncAudioUi(); });
      ansLbl.appendChild(ansInp); ansLbl.appendChild(el('span', '', 'Show teacher answers'));
      chkBox.appendChild(slowLbl); chkBox.appendChild(ansLbl);
      ctrls.appendChild(chkBox);
      wrap.appendChild(ctrls);

      audioNodes.listHost = el('div', 'pc-audio-sections');
      wrap.appendChild(audioNodes.listHost);
      audioView.appendChild(wrap);
      audioNodes.scoreSheet = el('section', 'pc-score-sheet');
      audioNodes.scoreSheet.id = 'pc-audio-score-sheet';
      audioNodes.scoreSheet.setAttribute('aria-label', 'Printable teacher record and scoring sheet');
      audioView.appendChild(audioNodes.scoreSheet);
      doc.body.appendChild(audioView);
    }
    function openAudioPlan(plan, given) {
      if (!audioView) buildAudioCompanionView();
      if (view && !view.hidden) { run++; view.hidden = true; }
      if (wsView && !wsView.hidden) { wsRun++; wsView.hidden = true; }
      if (vocabView && !vocabView.hidden) { vocabRun++; vocabView.hidden = true; }
      if (raView && !raView.hidden) { raRun++; raView.hidden = true; }
      stopAudioPlayback();
      audioState = given || {};
      audioPlan = plan || { kind: 'word-sounds', title: 'Worksheet', sections: [], items: [], audio: {}, clipCount: 0, hasSoundGap: true, hasDirections: true };
      audioIdx = 0;
      audioPlayed = Object.create(null);
      audioScores = { studentName: '', examiner: '', items: Object.create(null), notes: '' };
      audioScoredByIdx = Object.create(null);
      if (audioNodes.studentInp) audioNodes.studentInp.value = '';
      if (audioNodes.examinerInp) audioNodes.examinerInp.value = '';
      if (audioNodes.itemNote) audioNodes.itemNote.value = '';
      if (audioNodes.gapBox) audioNodes.gapBox.hidden = !audioPlan.hasSoundGap;
      if (audioNodes.dirBox) audioNodes.dirBox.hidden = !audioPlan.hasDirections;
      audioNodes.heading.textContent = (audioPlan.title || 'Worksheet') + ' \u2014 Worksheet audio player';
      var secWord = audioPlan.kind === 'word-sounds' ? 'activity' : 'section';
      var secWordMany = audioPlan.kind === 'word-sounds' ? 'activities' : 'sections';
      audioNodes.said.textContent = count(audioPlan.sections.length, secWord, secWordMany) + ', ' + count(audioPlan.items.length, 'item') + ' (' + count(audioPlan.clipCount, 'recording') + ' ready offline).';
      audioNodes.status.textContent = 'Press Play item or Space to begin with #1.';
      while (audioNodes.listHost.firstChild) audioNodes.listHost.removeChild(audioNodes.listHost.firstChild);
      audioNodes.rows = [];
      audioPlan.sections.forEach(function (sec) {
        var secEl = el('section', 'pc-audio-sec');
        secEl.appendChild(el('h3', 'pc-audio-sec-head', sec.label));
        secEl.appendChild(el('p', 'pc-audio-sec-dir', sec.directions));
        var ul = el('ul', 'pc-audio-list');
        sec.items.forEach(function (it) {
          audioScoredByIdx[it.index] = sec.scored !== false;
          var tag = audioTagOf(it);
          var li = el('li', 'pc-audio-item');
          var num = el('span', 'pc-audio-num', tag);
          var body = el('div', 'pc-audio-item-body');
          body.appendChild(el('span', 'pc-audio-item-label', it.sectionLabel + ' ' + tag + (it.hasAudio ? '' : ' (read aloud)')));
          body.appendChild(el('span', 'pc-audio-item-sub', it.script));
          var ans = el('span', 'pc-audio-item-ans', 'Answer: ' + it.answer);
          ans.hidden = !audioOpts.showAns;
          body.appendChild(ans);
          var scoreTag = el('span', 'pc-audio-item-score', '');
          scoreTag.hidden = true;
          body.appendChild(scoreTag);
          var playBtn = el('button', 'btn btn-small', 'Play ' + tag);
          playBtn.type = 'button';
          playBtn.addEventListener('click', function () {
            audioIdx = it.index;
            syncAudioUi();
            playCurrentAudioItem(false);
          });
          li.appendChild(num);
          li.appendChild(body);
          li.appendChild(playBtn);
          ul.appendChild(li);
          audioNodes.rows[it.index] = { li: li, num: num, ans: ans, scoreTag: scoreTag };
        });
        secEl.appendChild(ul);
        audioNodes.listHost.appendChild(secEl);
      });
      renderScoreSheetDom();
      audioOpener = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : audioOpener;
      audioView.hidden = false;
      if (!docEscBound && doc && typeof doc.addEventListener === 'function') {
        doc.addEventListener('keydown', onDocKeyDown);
        docEscBound = true;
      }
      doc.body.classList.add('pc-on');
      syncAudioUi();
      if (typeof win.scrollTo === 'function') { try { win.scrollTo(0, 0); } catch (_) {} }
      audioNodes.heading.focus();
    }
    function openWorksheetAudio(given) {
      openAudioPlan(buildWordSoundsAudioPlan(given || {}, {}), given);
    }
    function openVocabAudio(given, opts) {
      openAudioPlan(buildVocabAudioPlan(given || {}, opts || {}), given);
    }
    function openReadAlongAudio(given, opts) {
      openAudioPlan(buildReadAlongAudioPlan(given || {}, opts || {}), given);
    }
    function closeWorksheetAudio() {
      if (!audioView || audioView.hidden) return;
      stopAudioPlayback();
      audioView.hidden = true;
      if (docEscBound && doc && typeof doc.removeEventListener === 'function') {
        doc.removeEventListener('keydown', onDocKeyDown);
        docEscBound = false;
      }
      doc.body.classList.remove('pc-on');
      if (audioOpener && typeof audioOpener.focus === 'function' && doc.contains(audioOpener)) audioOpener.focus();
    }
    function wireWorksheetAudio(button, getState, opts) {
      if (!button || typeof getState !== 'function') return false;
      if (opts && opts.show) button.hidden = false;
      button.addEventListener('click', function () { audioOpener = button; openWorksheetAudio(getState()); });
      return true;
    }
    function wireVocabAudio(button, getState, opts) {
      if (!button || typeof getState !== 'function') return false;
      if (opts && opts.show) button.hidden = false;
      button.addEventListener('click', function () { audioOpener = button; openVocabAudio(getState()); });
      return true;
    }
    function wireReadAlongAudio(button, getState, opts) {
      if (!button || typeof getState !== 'function') return false;
      if (opts && opts.show) button.hidden = false;
      button.addEventListener('click', function () { audioOpener = button; openReadAlongAudio(getState()); });
      return true;
    }

    return {
      open: open, close: close, wire: wire, options: options, view: function () { return view; },
      openWorksheet: openWorksheet, closeWorksheet: closeWorksheet, wireWorksheet: wireWorksheet,
      worksheetOptions: wsOptions, worksheetView: function () { return wsView; },
      buildWordSoundsWorksheetHtml: buildWordSoundsWorksheetHtml,
      buildWordSoundsAudioPlan: buildWordSoundsAudioPlan,
      buildWordSoundsAudioCompanionHtml: buildWordSoundsAudioCompanionHtml,
      buildWordSoundsScoringSheetHtml: buildWordSoundsScoringSheetHtml,
      buildVocabAudioPlan: buildVocabAudioPlan,
      buildVocabAudioCompanionHtml: buildVocabAudioCompanionHtml,
      buildVocabScoringSheetHtml: buildVocabScoringSheetHtml,
      buildReadAlongAudioPlan: buildReadAlongAudioPlan,
      buildReadAlongAudioCompanionHtml: buildReadAlongAudioCompanionHtml,
      buildReadAlongScoringSheetHtml: buildReadAlongScoringSheetHtml,
      buildAudioScoringSheetHtml: buildAudioScoringSheetHtml,
      buildAudioScoresCsv: buildAudioScoresCsv,
      buildAudioResultsJson: buildAudioResultsJson,
      buildLetterTracingStripSvg: buildLetterTracingStripSvg,
      wsLetterStrokeCue: wsLetterStrokeCue,
      openWorksheetAudio: openWorksheetAudio, closeWorksheetAudio: closeWorksheetAudio, wireWorksheetAudio: wireWorksheetAudio,
      openVocabAudio: openVocabAudio, wireVocabAudio: wireVocabAudio,
      openReadAlongAudio: openReadAlongAudio, wireReadAlongAudio: wireReadAlongAudio,
      worksheetAudioView: function () { return audioView; },
      openVocabWorksheet: openVocabWorksheet, closeVocabWorksheet: closeVocabWorksheet, wireVocabWorksheet: wireVocabWorksheet,
      vocabWorksheetOptions: vocabOptions, vocabWorksheetView: function () { return vocabView; },
      buildVocabWorksheetHtml: buildVocabWorksheetHtml,
      openReadAlongWorksheet: openReadAlongWorksheet, closeReadAlongWorksheet: closeReadAlongWorksheet, wireReadAlongWorksheet: wireReadAlongWorksheet,
      readAlongWorksheetOptions: raOptions, readAlongWorksheetView: function () { return raView; },
      buildReadAlongWorksheetModel: buildReadAlongWorksheetModel,
      buildReadAlongWorksheetHtmlFromModel: buildReadAlongWorksheetHtmlFromModel,
      normalizeWorksheetModel: normalizeWorksheetModel,
      normalizeVocabWorksheetModel: normalizeVocabWorksheetModel,
      serializeWorksheetTemplate: serializeWorksheetTemplate,
      extractWorksheetTemplate: extractWorksheetTemplate,
      WS_PRESETS_KEY: WS_PRESETS_KEY,
      WS_TEMPLATE_MAX_BYTES: WS_TEMPLATE_MAX_BYTES
    };
  }

  var api = root && root.document ? create(root.document, root) : {};
  api.VERSION = VERSION;
  api.SIZES = SIZES;
  api.TEXT = TEXT;
  api.WS_ACTIVITIES = WS_ACTIVITIES;
  api.WS_PRESETS_KEY = WS_PRESETS_KEY;
  api.WS_TEMPLATE_MAX_BYTES = WS_TEMPLATE_MAX_BYTES;
  api.create = create;
  api.layout = layout;
  api.lengthClass = lengthClass;
  api.picturesOf = picturesOf;
  api.creditsFor = creditsFor;
  api.normalizeWorksheetModel = normalizeWorksheetModel;
  api.normalizeVocabWorksheetModel = normalizeVocabWorksheetModel;
  api.serializeWorksheetTemplate = serializeWorksheetTemplate;
  api.extractWorksheetTemplate = extractWorksheetTemplate;
  api.buildWordSoundsWorksheetHtml = buildWordSoundsWorksheetHtml;
  api.buildWordSoundsAudioPlan = buildWordSoundsAudioPlan;
  api.buildWordSoundsAudioCompanionHtml = buildWordSoundsAudioCompanionHtml;
  api.buildWordSoundsScoringSheetHtml = buildWordSoundsScoringSheetHtml;
  api.buildVocabAudioPlan = buildVocabAudioPlan;
  api.buildVocabAudioCompanionHtml = buildVocabAudioCompanionHtml;
  api.buildVocabScoringSheetHtml = buildVocabScoringSheetHtml;
  api.buildReadAlongAudioPlan = buildReadAlongAudioPlan;
  api.buildReadAlongAudioCompanionHtml = buildReadAlongAudioCompanionHtml;
  api.buildReadAlongScoringSheetHtml = buildReadAlongScoringSheetHtml;
  api.buildAudioScoringSheetHtml = buildAudioScoringSheetHtml;
  api.buildAudioScoresCsv = buildAudioScoresCsv;
  api.buildAudioResultsJson = buildAudioResultsJson;
  api.buildLetterTracingStripSvg = buildLetterTracingStripSvg;
  api.wsLetterStrokeCue = wsLetterStrokeCue;
  api.buildVocabWorksheetHtml = buildVocabWorksheetHtml;
  api.buildReadAlongWorksheetModel = buildReadAlongWorksheetModel;
  api.buildReadAlongWorksheetHtmlFromModel = buildReadAlongWorksheetHtmlFromModel;

  if (root) {
    root.AlloPacketPrintCards = api;
    root.AlloPacketsPrintCards = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
