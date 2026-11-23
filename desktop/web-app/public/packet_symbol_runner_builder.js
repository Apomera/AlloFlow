// AlloFlow Symbol Runner take-home builder: creates a standalone offline PRACTICE file
// (activity symbol_runner) for rapid letter, sound, digit, subitizing, and alternating naming,
// with Direct or Aim-and-Lock-On control modes and optional Incremental Rehearsal scheduling.
// No AI, no account, no network, and no clock: deterministic output for the same inputs.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-symbol-runner-builder/0.1.0';
  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var PLAYER = 'alloflow-word-sounds-take-home/2';

  // Stroop ink colors (2026-11-17). Each is at least 3:1 against a white surface (#ffffff) and a light gray one
  // (#f3f4f6), by the WCAG relative-luminance formula:
  //   red  #ef4444  3.76 on white, 3.42 on gray (kept)
  //   blue #3b82f6  3.68 on white, 3.34 on gray (kept)
  //   green #15803d 5.02 on white, 4.56 on gray (was #22c55e: 2.28 and 2.07)
  //   gold #a16207  4.92 on white, 4.47 on gray (was #facc15: 1.53 and 1.39)
  // The color items carry no shape badge any more. The old badge was tied one-to-one to the ink
  // (red circle, blue triangle, green square, gold star), so a child could answer by the shape and skip
  // the color. A badge only on matching items would tell the child which items match, so none has one.
  var INK = { red: '#ef4444', blue: '#3b82f6', green: '#15803d', gold: '#a16207' };

  var MODES = [
    {
      id: 'confusable_letters',
      title: 'Letters that look alike (b, d, p, q)',
      category: 'letter',
      items: ['b', 'd', 'p', 'q', 'm', 'n', 'u', 'i', 'j', 'l'],
    },
    {
      id: 'letters_lower',
      title: 'Lowercase letters (a to z)',
      category: 'letter',
      items: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
    },
    {
      id: 'letters_upper',
      title: 'Uppercase letters (A to Z)',
      category: 'letter',
      items: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' '),
    },
    {
      id: 'letter_sounds',
      title: 'Letter sounds (a, b, sh, ch, th)',
      category: 'sound',
      items: 'a b c d e f g h i k l m n o p r s t u sh ch th'.split(' '),
    },
    {
      id: 'bigrams_rimes',
      title: 'Letter teams and word endings (sh, st, at, ing)',
      category: 'sound',
      items: ['th', 'sh', 'ch', 'wh', 'ck', 'st', 'tr', 'at', 'an', 'ing'],
    },
    {
      id: 'vowel_teams_r',
      title: 'Vowel teams and vowels with r (ee, oa, ar, air)',
      category: 'sound',
      items: ['ar', 'or', 'er', 'ir', 'ur', 'ee', 'oa', 'ay', 'ow', 'oy', 'oo', 'aw', 'air', 'ear'],
    },
    {
      id: 'sight_words',
      title: 'Common sight words (all, are, come)',
      category: 'word',
      items: ['all', 'are', 'away', 'been', 'both', 'busy', 'buy', 'call', 'cold', 'come', 'does', 'done', 'down', 'also'],
    },
    {
      id: 'sight_words_g1',
      title: 'Sight words: after, again, every',
      category: 'word',
      items: ['after', 'again', 'ask', 'could', 'every', 'fly', 'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his'],
    },
    {
      id: 'sight_words_g2_3',
      title: 'Sight words: always, because, together',
      category: 'word',
      items: ['always', 'around', 'because', 'before', 'best', 'both', 'carry', 'clean', 'laugh', 'light', 'myself', 'never', 'only', 'together'],
    },
    {
      id: 'multisyllable_words',
      title: 'Longer words to sound out (planet, volcano)',
      category: 'word',
      items: ['planet', 'magnet', 'rabbit', 'basket', 'sunset', 'picnic', 'napkin', 'velvet', 'habitat', 'volcano', 'continent', 'predator'],
    },
    {
      id: 'morpheme_chunks',
      title: 'Prefixes and suffixes (un-, re-, -ing, -ment)',
      category: 'chunk',
      items: ['un', 're', 'pre', 'dis', 'non', 'mis', 'ing', 'ed', 'er', 'est', 'ful', 'less', 'ness', 'ment'],
    },
    {
      id: 'digits_single',
      title: 'Numbers 0 to 9',
      category: 'number',
      items: '0 1 2 3 4 5 6 7 8 9'.split(' '),
    },
    {
      id: 'digits_teen_decade',
      title: 'Teens and tens (13 and 30)',
      category: 'number',
      items: ['12', '21', '13', '30', '14', '40', '15', '50', '16', '60', '17', '70', '18', '80', '19', '90'],
    },
    {
      id: 'math_make_10',
      title: 'Make 10 (6 + ? = 10)',
      category: 'number',
      items: [
        { word: '9 + ? = 10', answer: '1', category: 'number' },
        { word: '1 + ? = 10', answer: '9', category: 'number' },
        { word: '8 + ? = 10', answer: '2', category: 'number' },
        { word: '2 + ? = 10', answer: '8', category: 'number' },
        { word: '7 + ? = 10', answer: '3', category: 'number' },
        { word: '3 + ? = 10', answer: '7', category: 'number' },
        { word: '6 + ? = 10', answer: '4', category: 'number' },
        { word: '4 + ? = 10', answer: '6', category: 'number' },
        { word: '5 + ? = 10', answer: '5', category: 'number' },
        { word: '10 + ? = 10', answer: '0', category: 'number' },
      ],
    },
    {
      id: 'math_doubles',
      title: 'Doubles and near doubles (6 + 6, 6 + 7)',
      category: 'number',
      items: [
        { word: '2 + 2', answer: '4', category: 'number' },
        { word: '3 + 3', answer: '6', category: 'number' },
        { word: '4 + 4', answer: '8', category: 'number' },
        { word: '5 + 5', answer: '10', category: 'number' },
        { word: '6 + 6', answer: '12', category: 'number' },
        { word: '7 + 7', answer: '14', category: 'number' },
        { word: '8 + 8', answer: '16', category: 'number' },
        { word: '9 + 9', answer: '18', category: 'number' },
        { word: '5 + 6', answer: '11', category: 'number' },
        { word: '6 + 7', answer: '13', category: 'number' },
        { word: '7 + 8', answer: '15', category: 'number' },
        { word: '8 + 9', answer: '17', category: 'number' },
      ],
    },
    {
      id: 'math_mult_2_5_10',
      title: 'Times 2, 5 and 10 (5 x 4, 10 x 6)',
      category: 'number',
      items: [
        { word: '2 x 3', answer: '6', category: 'number' },
        { word: '2 x 4', answer: '8', category: 'number' },
        { word: '2 x 6', answer: '12', category: 'number' },
        { word: '2 x 7', answer: '14', category: 'number' },
        { word: '2 x 8', answer: '16', category: 'number' },
        { word: '2 x 9', answer: '18', category: 'number' },
        { word: '5 x 3', answer: '15', category: 'number' },
        { word: '5 x 4', answer: '20', category: 'number' },
        { word: '5 x 6', answer: '30', category: 'number' },
        { word: '5 x 7', answer: '35', category: 'number' },
        { word: '10 x 4', answer: '40', category: 'number' },
        { word: '10 x 8', answer: '80', category: 'number' },
      ],
    },
    {
      id: 'math_squares',
      title: 'Square facts (2 x 2 to 10 x 10)',
      category: 'number',
      items: [
        { word: '2 x 2', answer: '4', category: 'number' },
        { word: '3 x 3', answer: '9', category: 'number' },
        { word: '4 x 4', answer: '16', category: 'number' },
        { word: '5 x 5', answer: '25', category: 'number' },
        { word: '6 x 6', answer: '36', category: 'number' },
        { word: '7 x 7', answer: '49', category: 'number' },
        { word: '8 x 8', answer: '64', category: 'number' },
        { word: '9 x 9', answer: '81', category: 'number' },
        { word: '10 x 10', answer: '100', category: 'number' },
      ],
    },
    {
      id: 'subitize_dots',
      title: 'Quick dot counting (1 to 9)',
      category: 'number',
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
        return { word: String(n) + ' dots', answer: String(n), dots: n };
      }),
    },
    {
      id: 'ras_switch',
      title: 'Quick naming: letters and numbers in turn',
      category: 'mixed',
      alternating: true,
      items: ['a', '3', 'b', '7', 'd', '4', 'p', '9', 'q', '2', 'm', '6', 'n', '8', 's', '5'],
    },
    {
      id: 'ras_triple',
      title: 'Quick naming: letters, numbers and colors in turn',
      category: 'mixed',
      alternating: 'triple',
      items: [
        { word: 'b', answer: 'b', category: 'letter' },
        { word: '3', answer: '3', category: 'number' },
        { word: 'RED', answer: 'red', category: 'color_stroop', congruent: true, stroopInk: INK.red, promptRule: 'Name the ink color' },
        { word: 'd', answer: 'd', category: 'letter' },
        { word: '7', answer: '7', category: 'number' },
        { word: 'BLUE', answer: 'blue', category: 'color_stroop', congruent: true, stroopInk: INK.blue, promptRule: 'Name the ink color' },
        { word: 'p', answer: 'p', category: 'letter' },
        { word: '4', answer: '4', category: 'number' },
        { word: 'GREEN', answer: 'green', category: 'color_stroop', congruent: true, stroopInk: INK.green, promptRule: 'Name the ink color' },
        { word: 'q', answer: 'q', category: 'letter' },
        { word: '9', answer: '9', category: 'number' },
        { word: 'GOLD', answer: 'gold', category: 'color_stroop', congruent: true, stroopInk: INK.gold, promptRule: 'Name the ink color' },
        { word: 'm', answer: 'm', category: 'letter' },
        { word: '6', answer: '6', category: 'number' },
        { word: 'BLUE', answer: 'red', category: 'color_stroop', congruent: false, stroopInk: INK.red, promptRule: 'Name the ink color' },
        { word: 'n', answer: 'n', category: 'letter' },
        { word: '8', answer: '8', category: 'number' },
        { word: 'RED', answer: 'blue', category: 'color_stroop', congruent: false, stroopInk: INK.blue, promptRule: 'Name the ink color' },
      ],
    },
    {
      id: 'flanker_letters',
      title: 'Middle letter: b, d, p, q',
      category: 'flanker',
      items: [
        { word: 'bbbbb', answer: 'b', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'ddbdd', answer: 'b', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'ddddd', answer: 'd', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'bbdbb', answer: 'd', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'ppppp', answer: 'p', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'qqpqq', answer: 'p', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'qqqqq', answer: 'q', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'ppqpp', answer: 'q', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'nnnnn', answer: 'n', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'uunuu', answer: 'n', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'uuuuu', answer: 'u', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'nnunn', answer: 'u', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'mmmmm', answer: 'm', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'wwmww', answer: 'm', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'wwwww', answer: 'w', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'mmwmm', answer: 'w', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
      ],
    },
    {
      id: 'quantity_stroop',
      title: 'Count the dots, not the number',
      category: 'quantity_stroop',
      items: [
        { word: '2', answer: '2', dots: 2, congruent: true, promptRule: 'Count dots, ignore digit' },
        { word: '5', answer: '2', dots: 2, congruent: false, promptRule: 'Count dots, ignore digit' },
        { word: '3', answer: '3', dots: 3, congruent: true, promptRule: 'Count dots, ignore digit' },
        { word: '6', answer: '3', dots: 3, congruent: false, promptRule: 'Count dots, ignore digit' },
        { word: '4', answer: '4', dots: 4, congruent: true, promptRule: 'Count dots, ignore digit' },
        { word: '2', answer: '4', dots: 4, congruent: false, promptRule: 'Count dots, ignore digit' },
        { word: '5', answer: '5', dots: 5, congruent: true, promptRule: 'Count dots, ignore digit' },
        { word: '3', answer: '5', dots: 5, congruent: false, promptRule: 'Count dots, ignore digit' },
        { word: '6', answer: '6', dots: 6, congruent: true, promptRule: 'Count dots, ignore digit' },
        { word: '4', answer: '6', dots: 6, congruent: false, promptRule: 'Count dots, ignore digit' },
        { word: '1', answer: '1', dots: 1, congruent: true, promptRule: 'Count dots, ignore digit' },
        { word: '4', answer: '1', dots: 1, congruent: false, promptRule: 'Count dots, ignore digit' },
      ],
    },
    {
      id: 'number_size_stroop',
      title: 'Bigger number, not bigger print',
      category: 'size_stroop',
      items: [
        { word: '2 | 8', answer: '8', congruent: true, sizePair: { left: '2', right: '8', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '2 | 8', answer: '8', congruent: false, sizePair: { left: '2', right: '8', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '9 | 3', answer: '9', congruent: true, sizePair: { left: '9', right: '3', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '9 | 3', answer: '9', congruent: false, sizePair: { left: '9', right: '3', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '4 | 7', answer: '7', congruent: true, sizePair: { left: '4', right: '7', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '4 | 7', answer: '7', congruent: false, sizePair: { left: '4', right: '7', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '6 | 1', answer: '6', congruent: true, sizePair: { left: '6', right: '1', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '6 | 1', answer: '6', congruent: false, sizePair: { left: '6', right: '1', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '3 | 5', answer: '5', congruent: true, sizePair: { left: '3', right: '5', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '3 | 5', answer: '5', congruent: false, sizePair: { left: '3', right: '5', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '7 | 2', answer: '7', congruent: true, sizePair: { left: '7', right: '2', leftScale: 1.45, rightScale: 0.68, pick: 'value' }, promptRule: 'Pick greater number value' },
        { word: '7 | 2', answer: '7', congruent: false, sizePair: { left: '7', right: '2', leftScale: 0.68, rightScale: 1.45, pick: 'value' }, promptRule: 'Pick greater number value' },
      ],
    },
    {
      id: 'color_word_stroop',
      title: 'Name the ink color, not the word',
      category: 'color_stroop',
      items: [
        { word: 'RED', answer: 'red', congruent: true, stroopInk: INK.red, promptRule: 'Name the ink color' },
        { word: 'BLUE', answer: 'blue', congruent: true, stroopInk: INK.blue, promptRule: 'Name the ink color' },
        { word: 'GREEN', answer: 'green', congruent: true, stroopInk: INK.green, promptRule: 'Name the ink color' },
        { word: 'GOLD', answer: 'gold', congruent: true, stroopInk: INK.gold, promptRule: 'Name the ink color' },
        { word: 'BLUE', answer: 'red', congruent: false, stroopInk: INK.red, promptRule: 'Name the ink color' },
        { word: 'GREEN', answer: 'red', congruent: false, stroopInk: INK.red, promptRule: 'Name the ink color' },
        { word: 'GOLD', answer: 'red', congruent: false, stroopInk: INK.red, promptRule: 'Name the ink color' },
        { word: 'RED', answer: 'blue', congruent: false, stroopInk: INK.blue, promptRule: 'Name the ink color' },
        { word: 'GREEN', answer: 'blue', congruent: false, stroopInk: INK.blue, promptRule: 'Name the ink color' },
        { word: 'GOLD', answer: 'blue', congruent: false, stroopInk: INK.blue, promptRule: 'Name the ink color' },
        { word: 'RED', answer: 'green', congruent: false, stroopInk: INK.green, promptRule: 'Name the ink color' },
        { word: 'BLUE', answer: 'green', congruent: false, stroopInk: INK.green, promptRule: 'Name the ink color' },
        { word: 'GOLD', answer: 'green', congruent: false, stroopInk: INK.green, promptRule: 'Name the ink color' },
        { word: 'RED', answer: 'gold', congruent: false, stroopInk: INK.gold, promptRule: 'Name the ink color' },
        { word: 'BLUE', answer: 'gold', congruent: false, stroopInk: INK.gold, promptRule: 'Name the ink color' },
        { word: 'GREEN', answer: 'gold', congruent: false, stroopInk: INK.gold, promptRule: 'Name the ink color' },
      ],
    },
    {
      id: 'custom',
      title: 'My own list',
      category: 'letter',
      items: ['b', 'd', 'p', 'q', '12', '21'],
    },
  ];

  var DEFAULT_ANCHORS = {
    a: 'apple', b: 'ball', c: 'cat', d: 'dog', e: 'egg', f: 'fish', g: 'goat',
    h: 'hat', i: 'insect', j: 'jam', k: 'key', l: 'leaf', m: 'moon', n: 'nest',
    o: 'orange', p: 'pig', q: 'queen', r: 'rabbit', s: 'sun', t: 'tree', u: 'umbrella',
    v: 'van', w: 'watch', x: 'box', y: 'yellow', z: 'zebra',
    ar: 'car', or: 'fork', er: 'fern', ir: 'bird', ur: 'turtle', ee: 'tree', oa: 'boat',
    ay: 'rain', ow: 'cow', oy: 'boy', oo: 'moon', aw: 'saw', air: 'chair', ear: 'ear',
    away: 'direction', both: 'combine', buy: 'market', call: 'signal', cold: 'thermometer', down: 'gravity',
    ing: 'verb', pre: 'prefix', un: 'prefix', re: 'cycle', ful: 'suffix', less: 'shrink', ness: 'suffix', ment: 'suffix',
  };

  function text(value) { return value == null ? '' : String(value); }
  function own(obj, key) { return !!obj && Object.prototype.hasOwnProperty.call(obj, key); }

  function fnv(value) {
    var h = 2166136261 >>> 0;
    var s = String(value == null ? '' : value);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function mixed(list, seed) {
    var s = parseInt(fnv(seed), 16) || 1;
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) {
      s ^= s << 13; s >>>= 0;
      s ^= s >>> 17; s >>>= 0;
      s ^= s << 5; s >>>= 0;
      var j = s % (i + 1);
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  function modeById(id) {
    for (var i = 0; i < MODES.length; i++) {
      if (MODES[i].id === id) return MODES[i];
    }
    return null;
  }

  function normalizeItem(raw) {
    var obj = raw && typeof raw === 'object' ? raw : { word: text(raw), answer: text(raw) };
    var display = text(obj.word != null ? obj.word : obj.display).replace(/\s+/g, ' ').trim();
    var answer = text(obj.answer != null ? obj.answer : display).replace(/\s+/g, ' ').trim().toLowerCase();
    if (!display || !answer || display.length > 24 || answer.length > 24) return null;
    var dots = Number(obj.dots);
    var cat = text(obj.category).trim() || (obj.stroopInk ? 'color_stroop' : (/^[0-9]+$/.test(answer) ? 'number' : 'letter'));
    var out = {
      word: display,
      answer: answer,
      category: cat,
      dots: Number.isInteger(dots) && dots >= 1 && dots <= 9 ? dots : 0,
    };
    var prompt = text(obj.promptRule != null ? obj.promptRule : obj.prompt).replace(/\s+/g, ' ').trim().slice(0, 80);
    if (prompt) out.prompt = prompt;
    if (Number.isInteger(obj.flankerCenter)) out.flankerCenter = obj.flankerCenter;
    if (typeof obj.stroopInk === 'string' && obj.stroopInk) out.stroopInk = obj.stroopInk;
    if (typeof obj.stroopShape === 'string' && obj.stroopShape) out.stroopShape = obj.stroopShape;
    if (obj.sizePair && typeof obj.sizePair === 'object' && !Array.isArray(obj.sizePair)) {
      var sp = {};
      ['left', 'right', 'leftScale', 'rightScale', 'pick'].forEach(function (k) {
        if (Object.prototype.hasOwnProperty.call(obj.sizePair, k)) sp[k] = obj.sizePair[k];
      });
      out.sizePair = sp;
    }
    if (typeof obj.congruent === 'boolean') out.congruent = obj.congruent;
    return out;
  }

  var CUSTOM_OK = (function () { try { return new RegExp("^[\\p{L}\\p{N}](?:[\\p{L}\\p{M}\\p{N}'\u2019-]*[\\p{L}\\p{M}\\p{N}])?$", 'u'); } catch (_) { return /^[A-Za-z0-9](?:[A-Za-z0-9'-]*[A-Za-z0-9])?$/; } })();

  function parseItems(input) {
    var parts = Array.isArray(input)
      ? input
      : text(input).replace(/^\uFEFF/, '').split(/\r?\n/).map(function (line) {
          return line.replace(/^\s*(?:\(\d{1,3}\)|\d{1,3}[.)]|[\u2022\u25CF\u25CB\u25AA\u2023\u2043*\u2013\u2014-])\s+/, '');
        }).join('\n').split(/[\s,;|/\r\n]+/);
    var out = [];
    var seen = Object.create(null);
    for (var i = 0; i < parts.length && out.length < 40; i++) {
      var raw = parts[i];
      var norm;
      if (raw && typeof raw === 'object') {
        norm = normalizeItem(raw);
      } else {
        var s = text(raw).replace(/^\uFEFF/, '').trim();
        try { s = s.normalize('NFC'); } catch (_) {}
        if (!s) continue;
        if (!CUSTOM_OK.test(s)) {
          var stripped = s.replace(/^["'\u201c\u201d\u2018\u2019(\[{]+|["'\u201c\u201d\u2018\u2019)\]}.,!?:;]+$/g, '');
          if (stripped && CUSTOM_OK.test(stripped)) s = stripped;
        }
        if (!CUSTOM_OK.test(s)) continue;
        var cat = /^[0-9]+$/.test(s) ? 'number' : (Array.from(s).length > 1 ? 'word' : 'letter');
        norm = normalizeItem({ word: s, answer: s, category: cat });
      }
      if (!norm) continue;
      if (seen[norm.answer]) continue;
      seen[norm.answer] = true;
      out.push(norm);
    }
    return out;
  }

  // 2026-11-19 (Wave 6B, parity with symbol_runner_core.js): confusable look-alike
  // pairs prioritized as distractors whenever present in the same-category pool.
  var LOOK_ALIKES = {
    b: ['d', 'p'], d: ['b', 'q'], p: ['q', 'b'], q: ['p', 'd'],
    m: ['w', 'n'], w: ['m'], n: ['u', 'm'], u: ['n'],
    '6': ['9'], '9': ['6'],
    '12': ['21'], '21': ['12'], '13': ['30', '31'], '30': ['13'], '31': ['13'],
    '14': ['40', '41'], '40': ['14'], '41': ['14'], '15': ['50', '51'], '50': ['15'], '51': ['15'],
    '16': ['60', '61'], '60': ['16'], '61': ['16'], '17': ['70', '71'], '70': ['17'], '71': ['17'],
    '18': ['80', '81'], '80': ['18'], '81': ['18'], '19': ['90', '91'], '90': ['19'], '91': ['19']
  };

  function buildChoices(item, pool, seed) {
    // Which of two numbers is bigger: the two shown numbers are the only choices.
    if (item.sizePair) {
      var left = text(item.sizePair.left).trim().toLowerCase();
      var right = text(item.sizePair.right).trim().toLowerCase();
      if (left && right && left !== right && (left === item.answer || right === item.answer)) {
        return mixed([left, right], seed + '|choices');
      }
    }
    var choices = [item.answer];
    var seen = Object.create(null);
    seen[item.answer] = true;
    var inPool = Object.create(null);
    for (var pi = 0; pi < pool.length; pi++) {
      if (item.category && pool[pi].category === item.category) inPool[pool[pi].answer] = pool[pi].answer;
    }
    var alikes = Object.prototype.hasOwnProperty.call(LOOK_ALIKES, item.answer) ? LOOK_ALIKES[item.answer] : [];
    for (var ai = 0; ai < alikes.length && choices.length < 6; ai++) {
      var alike = alikes[ai];
      if (inPool[alike] && !seen[alike]) {
        seen[alike] = true;
        choices.push(inPool[alike]);
      }
    }
    var sameCat = mixed(pool.filter(function (p) { return !seen[p.answer] && item.category && p.category === item.category; }), seed + '|same');
    for (var si = 0; si < sameCat.length && choices.length < 6; si++) {
      seen[sameCat[si].answer] = true;
      choices.push(sameCat[si].answer);
    }
    var stopAfterSame = item.category === 'color_stroop' && choices.length >= 4;
    var others = stopAfterSame ? [] : mixed(pool.filter(function (p) { return !seen[p.answer]; }), seed);
    for (var i = 0; i < others.length && choices.length < 6; i++) {
      seen[others[i].answer] = true;
      choices.push(others[i].answer);
    }
    return mixed(choices, seed + '|choices');
  }

  function resolvePool(o) {
    var modeId = text(o.symbolMode || o.modeId || (o.mode !== 'check' ? o.mode : '') || 'confusable_letters');
    var mode = modeById(modeId);
    if (!mode) throw new Error('Unknown mode "' + modeId + '".');
    var items;
    if (modeId === 'custom' || (o.items && (Array.isArray(o.items) ? o.items.length : String(o.items).trim()))) {
      items = parseItems(o.items != null ? o.items : mode.items);
      if (!items.length) throw new Error('Add at least 2 symbols before building a practice file.');
      if (items.length < 2) throw new Error('Add at least 2 different symbols so each card has response choices.');
    } else {
      items = mode.items.map(normalizeItem).filter(Boolean);
    }
    return { mode: mode, pool: items };
  }

  var MEASURE = { measure: 'symbol_naming', scoreUnit: 'items_correct', scoringVersion: 1, formVersion: 1, allowSkip: true };

  function buildAlternatingItems(mode, pool, totalCount, seedBase) {
    if (mode.alternating === 'triple') {
      var tLetters = pool.filter(function (p) { return p.category === 'letter'; });
      var tNumbers = pool.filter(function (p) { return p.category === 'number'; });
      var tColors = pool.filter(function (p) { return p.category === 'color_stroop'; });
      if (tLetters.length && tNumbers.length && tColors.length) {
        var tQueues = [mixed(tLetters, seedBase + '|tl'), mixed(tNumbers, seedBase + '|tn'), mixed(tColors, seedBase + '|tc')];
        var tCursors = [0, 0, 0];
        var tOut = [];
        for (var ti = 0; ti < totalCount; ti++) {
          var bi = ti % 3;
          var q = tQueues[bi];
          tOut.push(q[tCursors[bi] % q.length]);
          tCursors[bi]++;
        }
        return tOut;
      }
    } else if (mode.alternating) {
      var dLetters = pool.filter(function (p) { return /^[A-Za-z]+$/.test(p.answer); });
      var dNumbers = pool.filter(function (p) { return /^[0-9]+$/.test(p.answer); });
      if (dLetters.length && dNumbers.length) {
        var dQueues = [mixed(dLetters, seedBase + '|dl'), mixed(dNumbers, seedBase + '|dn')];
        var dCursors = [0, 0];
        var dOut = [];
        for (var di = 0; di < totalCount; di++) {
          var dbi = di % 2;
          var dq = dQueues[dbi];
          dOut.push(dq[dCursors[dbi] % dq.length]);
          dCursors[dbi]++;
        }
        return dOut;
      }
    }
    return null;
  }

  function planSymbolRunner(input) {
    var o = input || {};
    var resolved = resolvePool(o);
    var mode = resolved.mode;
    var pool = resolved.pool;
    var packetMode = o.packetMode === 'check' || o.mode === 'check' ? 'check' : 'practice';
    var control = o.control === 'lockon' ? 'lockon' : 'direct';
    var viewMode = o.viewMode === 'grid' ? 'grid' : o.viewMode === '2d' ? '2d' : '3d';
    var rehearsal = packetMode === 'check' ? false : o.rehearsal === true;
    var seedBase = mode.id + '|' + packetMode + '|' + control + '|' + pool.map(function (p) { return p.answer; }).join(',');

    var cards = [];
    var newSymbols = [];
    var knownSymbols = [];

    if (rehearsal) {
      var uniqueAnswers = [];
      var seenPoolAns = Object.create(null);
      for (var ui = 0; ui < pool.length; ui++) {
        if (!seenPoolAns[pool[ui].answer]) {
          seenPoolAns[pool[ui].answer] = true;
          uniqueAnswers.push(pool[ui].answer);
        }
      }
      var knownMap = Object.create(null);
      if (Array.isArray(o.known)) {
        o.known.forEach(function (k) { knownMap[text(k).trim().toLowerCase()] = true; });
      } else if (typeof o.known === 'string' && o.known.trim()) {
        o.known.split(/[\s,;|\r\n]+/).forEach(function (k) { if (k.trim()) knownMap[k.trim().toLowerCase()] = true; });
      } else {
        // Default: keep up to 3 distinct target answers as new, treat remaining >= 3 distinct answers as known.
        var defaultNewCount = Math.min(3, Math.max(1, uniqueAnswers.length - 3));
        for (var d = defaultNewCount; d < uniqueAnswers.length; d++) knownMap[uniqueAnswers[d]] = true;
      }

      var seenNewAns = Object.create(null);
      for (var npi = 0; npi < pool.length && newSymbols.length < 3; npi++) {
        var nItem = pool[npi];
        if (!knownMap[nItem.answer] && !seenNewAns[nItem.answer]) {
          seenNewAns[nItem.answer] = true;
          newSymbols.push(nItem);
        }
      }
      knownSymbols = pool.filter(function (p) { return !!knownMap[p.answer]; });
      var seenKnownAns = Object.create(null);
      var uniqueKnownAnswers = 0;
      for (var ki = 0; ki < knownSymbols.length; ki++) {
        if (!seenKnownAns[knownSymbols[ki].answer]) {
          seenKnownAns[knownSymbols[ki].answer] = true;
          uniqueKnownAnswers++;
        }
      }
      if (!newSymbols.length) throw new Error('Leave at least 1 symbol unselected as known so there is a new symbol to rehearse.');
      if (uniqueKnownAnswers < 3) throw new Error('Rehearsal needs at least 3 known symbols to space between new symbols.');

      var kQueue = mixed(knownSymbols, 'known|' + seedBase);
      var kCursor = 0;
      var takeKnown = function () {
        var k = kQueue[kCursor % kQueue.length];
        kCursor++;
        return k;
      };
      var steps = [1, 2, 3];
      for (var ni = 0; ni < newSymbols.length; ni++) {
        var target = newSymbols[ni];
        for (var si = 0; si < steps.length; si++) {
          var gap = steps[si];
          cards.push({ base: target, role: 'new', study: si === 0 });
          for (var g = 0; g < gap; g++) {
            cards.push({ base: takeKnown(), role: 'known', study: false });
          }
        }
      }
      // Final cumulative review pass
      for (var ri = 0; ri < newSymbols.length; ri++) {
        cards.push({ base: newSymbols[ri], role: 'new', study: false });
        cards.push({ base: takeKnown(), role: 'known', study: false });
      }
    } else if (packetMode === 'check') {
      var rawCheckCount = Number(o.count);
      var checkCount = Math.max(4, Math.min(60, (Number.isFinite(rawCheckCount) && rawCheckCount > 0) ? Math.round(rawCheckCount) : 40));
      var sampleCount = mode.alternating === 'triple' ? 3 : 2;
      var altCheck = buildAlternatingItems(mode, pool, sampleCount + checkCount, seedBase);
      if (altCheck) {
        for (var aci = 0; aci < altCheck.length; aci++) {
          cards.push({ base: altCheck[aci], role: '', study: false, practice: aci < sampleCount });
        }
      } else {
        cards.push({ base: pool[0], role: '', study: false, practice: true });
        cards.push({ base: pool[1 % pool.length], role: '', study: false, practice: true });
        var scored = [];
        while (scored.length < checkCount) {
          var cPass = mixed(pool, seedBase + '|cpass|' + scored.length);
          for (var ci = 0; ci < cPass.length && scored.length < checkCount; ci++) {
            if (scored.length && scored[scored.length - 1].base.answer === cPass[ci].answer) {
              for (var ck = ci + 1; ck < cPass.length; ck++) {
                if (cPass[ck].answer !== cPass[ci].answer) {
                  var cSwap = cPass[ck];
                  cPass[ck] = cPass[ci];
                  cPass[ci] = cSwap;
                  break;
                }
              }
            }
            scored.push({ base: cPass[ci], role: '', study: false, practice: false });
          }
        }
        cards = cards.concat(scored);
      }
    } else {
      var rawTargetCount = Number(o.count);
      var targetCount = Math.max(4, Math.min(48, (Number.isFinite(rawTargetCount) && rawTargetCount > 0) ? Math.round(rawTargetCount) : Math.min(24, Math.max(12, pool.length * 2))));
      var altPractice = buildAlternatingItems(mode, pool, targetCount, seedBase);
      if (altPractice) {
        for (var api = 0; api < altPractice.length; api++) {
          cards.push({ base: altPractice[api], role: '', study: false });
        }
      }
      while (cards.length < targetCount) {
        var pass = mixed(pool, seedBase + '|pass|' + cards.length);
        for (var pi = 0; pi < pass.length && cards.length < targetCount; pi++) {
          if (cards.length && cards[cards.length - 1].base.answer === pass[pi].answer) {
            for (var pk = pi + 1; pk < pass.length; pk++) {
              if (pass[pk].answer !== pass[pi].answer) {
                var swap = pass[pk];
                pass[pk] = pass[pi];
                pass[pi] = swap;
                break;
              }
            }
          }
          cards.push({ base: pass[pi], role: '', study: false });
        }
      }
    }

    var builtCards = cards.map(function (c, idx) {
      var s = parseInt(fnv(seedBase + '|lane|' + idx), 16) || 1;
      return {
        word: c.base.word,
        answer: c.base.answer,
        dots: c.base.dots,
        prompt: c.base.prompt || '',
        flankerCenter: c.base.flankerCenter,
        stroopInk: c.base.stroopInk,
        stroopShape: c.base.stroopShape,
        sizePair: c.base.sizePair,
        congruent: c.base.congruent,
        role: c.role,
        study: c.study,
        practice: !!c.practice,
        lane: s % 3,
        choices: buildChoices(c.base, pool, seedBase + '|card|' + idx),
      };
    });

    return {
      mode: mode.id,
      modeTitle: mode.title,
      category: mode.category,
      activity: 'symbol_runner',
      packetMode: packetMode,
      control: control,
      viewMode: viewMode,
      rehearsal: rehearsal,
      pool: pool,
      newSymbols: newSymbols,
      knownSymbols: knownSymbols,
      cards: builtCards,
    };
  }

  var SVG_MAX = 300000;
  var IMG_MAX = 400000;
  function decodeBase64Utf8(body) {
    if (typeof Buffer === 'function') return Buffer.from(body, 'base64').toString('utf8');
    if (typeof atob === 'function') {
      var bin = atob(body);
      try { return decodeURIComponent(escape(bin)); } catch (_) { return bin; }
    }
    return '';
  }
  function svgRefusal(svg) {
    var s = typeof svg === 'string' ? svg : '';
    var stripped = s.replace(/^\s*<\?xml\s[^>]*\?>/i, '').replace(/^(?:\s*<!--[\s\S]*?-->)+/, '').trim();
    if (!/^\s*<svg[\s>]/i.test(stripped) || !/<\/svg>\s*$/i.test(stripped)) return 'not an SVG drawing';
    if (stripped.length > SVG_MAX) return 'the drawing is too large';
    if (stripped.indexOf('\\') >= 0) return 'an escape character';
    if (/<!(?:doctype|entity)/i.test(stripped)) return 'a document type or entity declaration';
    if (/<\?(?!xml\s)/i.test(stripped)) return 'a processing instruction';
    var plain = stripped.replace(/&#x([0-9a-f]+);?/gi, function (m, hex) { return String.fromCharCode(parseInt(hex, 16) & 0xFFFF); })
      .replace(/&#(\d+);?/g, function (m, dec) { return String.fromCharCode(Number(dec) & 0xFFFF); })
      .replace(/&(colon|newline|tab);/gi, function (m, name) { return name.toLowerCase() === 'colon' ? ':' : ''; });
    var packed = plain.replace(/[\x00-\x20]+/g, '');
    var bare = function (value) { return String(value || '').replace(/[\x00-\x20]+/g, ''); };
    if (/<\s*(?:[^\s<>"'=/:]+:)?script\b/i.test(plain)) return 'a script';
    if (/<\s*(?:[^\s<>"'=/:]+:)?foreignObject\b/i.test(plain)) return 'a foreignObject';
    if (/<\s*(?:[^\s<>"'=/:]+:)?(?:iframe|embed|object|audio|video|animate\w*|set|handler|listener)\b/i.test(plain)) return 'an element that is not a drawing';
    if (/[\s"'\/]on[a-z]+\s*=/i.test(plain)) return 'an event handler';
    if (/(?:java|vb|live)script:/i.test(packed)) return 'a script address';
    if (/xml:base\s*=/i.test(plain)) return 'a base address';
    var m, href = /(?:[\s"'\/])(?:[^\s<>"'=/:]+:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/gi;
    while ((m = href.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    if (/[\s"'\/]src(?:doc)?\s*=/i.test(plain)) return 'a link to something outside the drawing';
    if (/(?:-(?:webkit|moz)-)?image-set\s*\(/i.test(plain)) return 'a link to something outside the drawing';
    var style = /<\s*(?:[^\s<>"'=/:]+:)?style\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
    while ((m = style.exec(plain))) {
      if (/\/\s*>$/.test(m[0])) continue;
      var end = plain.slice(style.lastIndex).search(/<\s*\/\s*(?:[^\s<>"'=/:]+:)?style\s*>/i);
      var css = end < 0 ? plain.slice(style.lastIndex) : plain.slice(style.lastIndex, style.lastIndex + end);
      if (end < 0 || /@import|@font-face|@namespace|url\s*\(|(?:-(?:webkit|moz)-)?image-set\s*\(|expression\s*\(/i.test(css)) return 'a style block that loads something';
    }
    var url = /url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))/gi;
    while ((m = url.exec(plain))) {
      if (bare(m[1] != null ? m[1] : m[2] != null ? m[2] : m[3]).charAt(0) !== '#') return 'a link to something outside the drawing';
    }
    return '';
  }
  function safeDataImage(src) {
    var s = text(src).trim();
    var m = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml)((?:;[a-z0-9=.+-]+)*),(.*)$/i.exec(s);
    if (!m) return '';
    var subtype = m[1].toLowerCase();
    var params = m[2] || '';
    var body = m[3] || '';
    var isBase64 = /;base64$/i.test(params);
    if (isBase64) {
      var cleaned = body.replace(/\s+/g, '');
      if (!cleaned || cleaned.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) return '';
      var byteLen = (cleaned.length / 4) * 3 - (cleaned.slice(-2) === '==' ? 2 : cleaned.slice(-1) === '=' ? 1 : 0);
      if (byteLen <= 0 || byteLen > (subtype === 'svg+xml' ? SVG_MAX : IMG_MAX)) return '';
      if (subtype === 'svg+xml') {
        var decoded = '';
        try { decoded = decodeBase64Utf8(cleaned); } catch (_) { return ''; }
        if (svgRefusal(decoded)) return '';
      }
      return 'data:image/' + subtype + ';base64,' + cleaned;
    }
    if (subtype !== 'svg+xml') return '';
    if (!body || body.length > SVG_MAX * 3) return '';
    var utf8 = '';
    try { utf8 = decodeURIComponent(body); } catch (_) { return ''; }
    if (!utf8 || utf8.length > SVG_MAX || svgRefusal(utf8)) return '';
    return s;
  }

  var AUDIO_MAX_CHARS = 2 * 1024 * 1024;
  function safeDataAudio(src) {
    var s = text(src).trim();
    if (!s || s.length > AUDIO_MAX_CHARS) return '';
    var m = /^data:audio\/([a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(s);
    if (!m || m[2].length % 4 !== 0) return '';
    return 'data:audio/' + m[1].toLowerCase() + ';base64,' + m[2];
  }

  function cleanCredit(value) {
    return text(value)
      .replace(/https?:\/\//gi, '')
      .replace(/\bopen\s*\(/gi, 'open [')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 240);
  }

  function lessonFromSymbolRunner(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS.symbol_runner) {
      throw new Error('lessonFromSymbolRunner needs loader (AlloWordSoundsTakeHome with symbol_runner)');
    }
    var plan = planSymbolRunner(o);
    var isCheck = plan.packetMode === 'check';
    var adapter = loader.CHECK_ADAPTERS.symbol_runner;
    var images = {};
    var audio = {};
    var picByAns = Object.create(null);
    var audByAns = Object.create(null);
    var seenCredits = Object.create(null);
    var pictureMeta = Object.create(null);
    var attributions = [];
    var hasMulberry = false;
    var hasOpenMoji = false;
    var nextImgId = 1;
    var nextAudId = 1;

    var picMap = o.pictures && typeof o.pictures === 'object' ? o.pictures : {};
    var clipMap = o.clips && typeof o.clips === 'object' ? o.clips : {};
    var hasOwn = Object.prototype.hasOwnProperty;

    if (!isCheck) {
      plan.pool.forEach(function (sym) {
        if (!picByAns[sym.answer]) {
          var rawPic = hasOwn.call(picMap, sym.answer) ? picMap[sym.answer] : (hasOwn.call(picMap, sym.word) ? picMap[sym.word] : null);
          var imgData = safeDataImage(rawPic && typeof rawPic === 'object' ? (rawPic.src || rawPic.dataUri) : rawPic);
          if (imgData) {
            var pid = 'p' + (nextImgId++);
            images[pid] = imgData;
            picByAns[sym.answer] = pid;
            if (rawPic && typeof rawPic === 'object') {
              var creditLine = cleanCredit(rawPic.credit);
              if (creditLine && !seenCredits[creditLine]) {
                seenCredits[creditLine] = true;
                attributions.push(creditLine);
              }
              if (rawPic.set === 'mulberry' || /Mulberry/i.test(creditLine)) hasMulberry = true;
              if (rawPic.set === 'openmoji' || /OpenMoji/i.test(creditLine)) hasOpenMoji = true;
              var metaKey = text(sym.answer).trim().toLowerCase();
              if (metaKey && (creditLine || rawPic.set)) {
                pictureMeta[metaKey] = { credit: creditLine, set: text(rawPic.set).trim().slice(0, 32) };
              }
            }
          }
        }
        if (!audByAns[sym.answer]) {
          var rawClip = hasOwn.call(clipMap, sym.answer) ? clipMap[sym.answer] : (hasOwn.call(clipMap, sym.word) ? clipMap[sym.word] : null);
          var audData = safeDataAudio(rawClip && typeof rawClip === 'object' ? rawClip.dataUri : rawClip);
          if (audData) {
            var aid = 'a' + (nextAudId++);
            audio[aid] = audData;
            audByAns[sym.answer] = aid;
          }
        }
      });
    }

    if (!isCheck && Object.keys(audio).length > 0) {
      // 2026-11-17: letter, sound and sight-word clips come from audio_bank/ (made ahead of time with Google Gemini),
      // other word clips from word_audio_shards/ (Kokoro). Both are named, as the Word Sounds builder does.
      var voiceCredits = text(o.voiceCredit).trim() ? [text(o.voiceCredit).trim()] : [
        'Machine-made recordings: Kokoro-82M text-to-speech (voice af_heart)',
        'Machine-made recordings: Google Gemini text-to-speech, made ahead of time',
      ];
      voiceCredits.forEach(function (voiceCredit) {
        if (!seenCredits[voiceCredit]) {
          seenCredits[voiceCredit] = true;
          attributions.push(voiceCredit);
        }
      });
    }
    var items = plan.cards.map(function (card, i) {
      var raw = {
        word: card.word,
        answer: card.answer,
        lane: card.lane,
        control: plan.control,
        dots: card.dots,
        choices: card.choices,
        mode: plan.mode,
        study: isCheck ? false : card.study,
      };
      if (card.prompt) raw.prompt = card.prompt;
      if (Number.isInteger(card.flankerCenter)) raw.flankerCenter = card.flankerCenter;
      if (card.stroopInk) raw.stroopInk = card.stroopInk;
      if (card.stroopShape) raw.stroopShape = card.stroopShape;
      if (card.sizePair) raw.sizePair = card.sizePair;
      if (typeof card.congruent === 'boolean') raw.congruent = card.congruent;
      if (card.practice) raw.practice = true;
      if (card.role && !isCheck) raw.role = card.role;
      if (!isCheck && picByAns[card.answer]) raw.image = picByAns[card.answer];
      if (!isCheck && audByAns[card.answer]) raw.audio = audByAns[card.answer];
      var made = adapter.prepare(raw);
      if (!made || !made.item) {
        throw new Error('Card ' + (i + 1) + ' cannot be built: ' + (made && made.missing ? made.missing.join(', ') : 'invalid item'));
      }
      var n = (i < 9 ? '0' : '') + (i + 1);
      // 2026-11-17: a card with something to ignore (color words, the middle letter, dots and digits) says in its id
      // whether the two agree ("-match") or not ("-conflict"), so the results can be read apart. The id is in every results row.
      var agree = typeof card.congruent === 'boolean' ? (card.congruent ? '-match' : '-conflict') : '';
      var idSuffix = card.practice ? '-sample' : agree + (card.role === 'new' || card.role === 'known' ? '-' + card.role : '');
      var cardId = 'symbol_runner-' + n + idSuffix;
      return isCheck ? Object.assign({ id: cardId }, raw) : Object.assign({ id: cardId }, made.item);
    });

    var cleanTitle = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    var defaultTitle = isCheck
      ? ('Symbol naming check: ' + plan.modeTitle + (o.untimed === true ? ' (untimed)' : ''))
      : ('Symbol Runner: ' + plan.modeTitle + (plan.control === 'lockon' ? ' (aim first)' : ''));
    var title = cleanTitle || defaultTitle.slice(0, 120);
    var untimed = isCheck && o.untimed === true;
    var rawLimit = Number(o.timeLimitS);
    var limit = (Number.isFinite(rawLimit) && rawLimit > 0) ? Math.max(1, Math.min(600, Math.round(rawLimit))) : 60;
    var sig = fnv(JSON.stringify([plan.packetMode, plan.mode, plan.control, plan.rehearsal, untimed, limit, plan.pool.map(function (p) { return p.answer; })]));
    var lesson = {
      schema: LESSON_SCHEMA,
      player: PLAYER,
      lessonId: 'symbol-runner-' + plan.mode + '-' + sig + (isCheck ? '-check' : ''),
      revision: '',
      language: 'en',
      title: title,
      showLetters: true,
      mode: isCheck ? 'probe' : 'practice',
      activityTitles: {},
      blocks: [{ activity: 'symbol_runner', items: items }],
      feedback: { correct: [], retry: null },
      audio: audio,
      images: images,
      submit: null,
    };
    if (isCheck) {
      lesson.form = 'custom';
      lesson.timeLimitS = untimed ? null : limit;
      lesson.check = Object.assign({}, MEASURE);
      if (untimed) {
        lesson.check.untimed = true;
        lesson.check.usualTimeLimitS = limit;
      }
    }
    lesson.activityTitles.symbol_runner = adapter.title;
    lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.form || '', lesson.check || null, lesson.blocks, Object.keys(images).sort(), Object.keys(audio).sort()]));
    return { lesson: lesson, plan: plan, attributions: attributions, pictureMeta: pictureMeta, hasMulberry: hasMulberry, hasOpenMoji: hasOpenMoji };
  }

  var SYMBOL_ANSWERS = {
    soundAnswerMatches: function (given, answer) {
      var a = String(answer == null ? '' : answer).replace(/\s+/g, ' ').trim().toLowerCase();
      var g = String(given == null ? '' : given).replace(/\s+/g, ' ').trim().toLowerCase();
      return g !== '' && g === a;
    },
  };

  function buildSymbolRunnerPacket(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || typeof loader.buildHtml !== 'function' || !loader.CHECK_ADAPTERS || typeof loader.sha256 !== 'function') {
      throw new Error('buildSymbolRunnerPacket needs loader (AlloWordSoundsTakeHome)');
    }
    var givenLesson = o.lesson;
    var plan = null;
    var builtMeta = null;
    if (!givenLesson) {
      builtMeta = lessonFromSymbolRunner(o);
      givenLesson = builtMeta.lesson;
      plan = builtMeta.plan;
    }
    var activity = givenLesson && Array.isArray(givenLesson.blocks) && givenLesson.blocks.length === 1
      ? text(givenLesson.blocks[0].activity)
      : '';
    var lessonModeOk = givenLesson && (givenLesson.mode === 'practice' || givenLesson.mode === 'probe');
    if (!givenLesson || !lessonModeOk || activity !== 'symbol_runner' || !loader.CHECK_ADAPTERS.symbol_runner) {
      throw new Error('buildSymbolRunnerPacket needs a lesson from lessonFromSymbolRunner');
    }
    var isCheck = givenLesson.mode === 'probe';
    var code = text(o.teacherCode).trim();
    if (isCheck && code && code.length < 4) throw new Error('The teacher code needs 4 or more characters.');
    if (isCheck && code.length > 64) throw new Error('The teacher code can have 64 characters at most.');
    var stripProto = function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; };
    var lesson = JSON.parse(JSON.stringify(givenLesson), stripProto);
    var title = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    if (title) {
      lesson.title = title;
      lesson.revision = 'r' + fnv(JSON.stringify([lesson.title, lesson.form || '', lesson.check || null, lesson.blocks, Object.keys(lesson.images || {}).sort(), Object.keys(lesson.audio || {}).sort()]));
    }
    var labels = Object.assign({}, o.labels || {});
    if (!labels.intro) labels.intro = labels.symbol_runner_intro || loader.CHECK_ADAPTERS.symbol_runner.labels.symbol_runner_intro;
    var attributions = Array.isArray(o.attributions) ? o.attributions.slice() : (builtMeta && builtMeta.attributions ? builtMeta.attributions.slice() : []);
    var html = loader.buildHtml(lesson, {
      core: isCheck ? undefined : SYMBOL_ANSWERS,
      teacherCode: isCheck ? (code || null) : undefined,
      labels: labels,
      attributions: attributions.length ? attributions : undefined,
    });
    var itemsMeta = [];
    if (o.items && (Array.isArray(o.items) ? o.items.length : String(o.items).trim())) {
      itemsMeta = parseItems(o.items).map(function (it) { return it.word; });
    } else if (plan && plan.mode === 'custom') {
      itemsMeta = plan.pool.map(function (it) { return it.word; });
    }
    var pictureMeta = Object.create(null);
    if (!isCheck) {
      if (builtMeta && builtMeta.pictureMeta) {
        Object.keys(builtMeta.pictureMeta).forEach(function (k) {
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
          pictureMeta[k] = builtMeta.pictureMeta[k];
        });
      } else if (o.pictures && typeof o.pictures === 'object') {
        Object.keys(o.pictures).forEach(function (k) {
          var rawPic = o.pictures[k];
          if (!rawPic || typeof rawPic !== 'object') return;
          var mk = text(k).trim().toLowerCase();
          if (!mk || mk === '__proto__' || mk === 'constructor' || mk === 'prototype') return;
          var cl = cleanCredit(rawPic.credit);
          var st = text(rawPic.set).trim();
          if (cl || st) pictureMeta[mk] = { credit: cl, set: st.slice(0, 32) };
        });
      }
    }
    var recipe = {
      builder: VERSION,
      packetMode: isCheck ? 'check' : 'practice',
      mode: plan ? plan.mode : (text(o.symbolMode || o.modeId || (o.mode !== 'check' ? o.mode : '') || 'confusable_letters')),
      control: plan ? plan.control : (o.control === 'lockon' ? 'lockon' : 'direct'),
      viewMode: plan ? plan.viewMode : (o.viewMode === 'grid' ? 'grid' : o.viewMode === '2d' ? '2d' : '3d'),
      rehearsal: isCheck ? false : !!(plan ? plan.rehearsal : o.rehearsal),
      untimed: !!(isCheck && lesson.timeLimitS === null),
      includeAudio: !isCheck && Object.keys(lesson.audio || {}).length > 0,
      audioMode: isCheck ? 'auto' : (o.audioMode === 'name' || o.audioMode === 'sound' ? o.audioMode : 'auto'),
      items: itemsMeta,
      known: (!isCheck && plan && plan.rehearsal) ? plan.knownSymbols.map(function (k) { return k.answer; }).filter(function (ans, idx, arr) { return arr.indexOf(ans) === idx; }) : [],
    };
    if (Object.keys(pictureMeta).length) recipe.pictureMeta = pictureMeta;
    html = withManifest(html, { symbolRunner: recipe });
    if (o.learner) html = withCodeName(html, o.learner);
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return {
      html: html,
      manifest: block ? JSON.parse(block[1], stripProto) : null,
      sha256: loader.sha256(html).hex,
      lesson: lesson,
      plan: plan,
    };
  }

  function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  }

  function withManifest(html, extra) {
    var open = '<script type="application/json" id="packet-manifest">';
    var at = html.indexOf(open);
    if (at < 0) return html;
    var from = at + open.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try { manifest = JSON.parse(html.slice(from, to), function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; }); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    Object.keys(extra).forEach(function (k) { manifest[k] = extra[k]; });
    return html.slice(0, from) + safeJson(manifest) + html.slice(to);
  }

  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try {
      return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
    } catch (_) {
      return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40);
    }
  }

  function withCodeName(html, name) {
    var clean = codeName(name);
    var open = '<script type="application/json" id="packet-manifest">';
    var at = typeof html === 'string' ? html.indexOf(open) : -1;
    if (at < 0) return html;
    var from = at + open.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try { manifest = JSON.parse(html.slice(from, to), function (k, v) { return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v; }); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    if (clean) {
      manifest.learner = clean;
    } else {
      if (!Object.prototype.hasOwnProperty.call(manifest, 'learner')) return html;
      delete manifest.learner;
    }
    return html.slice(0, from) + safeJson(manifest) + html.slice(to);
  }

  function readBack(parts) {
    var p = parts || {};
    var m = p.manifest && typeof p.manifest === 'object' ? p.manifest : {};
    var lesson = p.lesson && typeof p.lesson === 'object' ? p.lesson : {};
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
    var srBlock = blocks.filter(function (b) { return b && b.activity === 'symbol_runner' && Array.isArray(b.items); })[0] || null;
    var sr = m.symbolRunner && typeof m.symbolRunner === 'object' ? m.symbolRunner : null;
    var out = {
      ok: false,
      why: '',
      title: '',
      packetMode: 'practice',
      mode: 'confusable_letters',
      control: 'direct',
      viewMode: '3d',
      rehearsal: false,
      untimed: false,
      includeAudio: false,
      audioMode: 'auto',
      items: [],
      known: [],
      learner: '',
      teacherCode: false,
      pictures: {},
    };
    if (!sr && !srBlock) {
      out.why = 'This file was not made on this page.';
      return out;
    }
    out.ok = true;
    out.title = text(m.title || lesson.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    out.learner = codeName(m.learner);
    var isCheck = (sr && sr.packetMode === 'check') || lesson.mode === 'probe';
    out.packetMode = isCheck ? 'check' : 'practice';
    out.teacherCode = !!(lesson.check && typeof lesson.check === 'object' && lesson.check.lock && typeof lesson.check.lock === 'object');
    out.untimed = isCheck && ((sr && sr.untimed === true) || lesson.timeLimitS === null);

    var idMatch = /^symbol-runner-([a-z0-9_]+)-/i.exec(text(lesson.lessonId));
    var rawMode = (sr && sr.mode) || (idMatch && idMatch[1]) || 'confusable_letters';
    out.mode = modeById(rawMode) ? rawMode : 'confusable_letters';
    var firstItem = srBlock && srBlock.items[0] ? srBlock.items[0] : null;
    out.control = (sr && sr.control === 'lockon') || (firstItem && firstItem.control === 'lockon') ? 'lockon' : 'direct';
    out.viewMode = (sr && (sr.viewMode === 'grid' || sr.viewMode === '2d' || sr.viewMode === '3d')) ? sr.viewMode : '3d';
    out.rehearsal = isCheck ? false : (sr ? !!sr.rehearsal : !!(srBlock && srBlock.items.some(function (it) { return it && (it.role === 'new' || it.role === 'known'); })));
    out.includeAudio = !isCheck && (sr && typeof sr.includeAudio === 'boolean' ? sr.includeAudio : Object.keys((lesson && lesson.audio) || {}).length > 0);
    out.audioMode = isCheck ? 'auto' : (sr && (sr.audioMode === 'name' || sr.audioMode === 'sound') ? sr.audioMode : 'auto');

    if (sr && Array.isArray(sr.items)) {
      out.items = sr.items.map(function (s) { return text(s).trim(); }).filter(Boolean).slice(0, 40);
    } else if (out.mode === 'custom' && srBlock) {
      var seenW = Object.create(null);
      srBlock.items.forEach(function (it) {
        var w = it && text(it.word || it.answer).trim();
        if (w && !seenW[w]) { seenW[w] = true; out.items.push(w); }
      });
    }

    if (sr && Array.isArray(sr.known)) {
      out.known = sr.known.map(function (s) { return text(s).trim().toLowerCase(); }).filter(Boolean).slice(0, 40);
    } else if (out.rehearsal && srBlock) {
      var seenK = Object.create(null);
      srBlock.items.forEach(function (it) {
        var k = it && it.role === 'known' ? text(it.answer || it.word).trim().toLowerCase() : '';
        if (k && !seenK[k]) { seenK[k] = true; out.known.push(k); }
      });
    }

    if (!isCheck && srBlock && lesson.images && typeof lesson.images === 'object') {
      var hasOwn = Object.prototype.hasOwnProperty;
      var picMeta = sr && sr.pictureMeta && typeof sr.pictureMeta === 'object' ? sr.pictureMeta : null;
      var picAttribs = Array.isArray(m.attributions) ? m.attributions.filter(function (line) {
        return typeof line === 'string' && line.trim() && !/Machine-made recordings:/i.test(line);
      }) : [];
      srBlock.items.forEach(function (it) {
        if (!it || !it.image) return;
        var src = hasOwn.call(lesson.images, it.image) ? safeDataImage(lesson.images[it.image]) : '';
        var ans = text(it.answer || it.word).trim().toLowerCase();
        if (src && ans && ans !== '__proto__' && ans !== 'constructor' && ans !== 'prototype' && !hasOwn.call(out.pictures, ans)) {
          var rawAns = text(it.answer || it.word).trim();
          var meta = picMeta ? (hasOwn.call(picMeta, ans) ? picMeta[ans] : (hasOwn.call(picMeta, rawAns) ? picMeta[rawAns] : null)) : null;
          var credit = (meta && text(meta.credit).trim()) || (picAttribs.length === 1 ? picAttribs[0].trim() : 'Restored from file');
          var set = (meta && text(meta.set).trim()) || (/Mulberry/i.test(credit) ? 'mulberry' : /OpenMoji/i.test(credit) ? 'openmoji' : /AlloFlow Curriculum Diagram/i.test(credit) ? 'diagram' : 'custom');
          out.pictures[ans] = { src: src, alt: text(it.word || ans), credit: credit, set: set };
        }
      });
    }
    return out;
  }

  var api = {
    VERSION: VERSION,
    MODES: MODES,
    MEASURE: Object.assign({}, MEASURE),
    DEFAULT_ANCHORS: DEFAULT_ANCHORS,
    parseItems: parseItems,
    planSymbolRunner: planSymbolRunner,
    lessonFromSymbolRunner: lessonFromSymbolRunner,
    buildSymbolRunnerPacket: buildSymbolRunnerPacket,
    readBack: readBack,
    codeName: codeName,
    withCodeName: withCodeName,
  };
  root.AlloPacketSymbolRunner = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
