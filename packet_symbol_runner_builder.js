// AlloFlow Symbol Runner take-home builder: creates a standalone offline PRACTICE file
// (activity symbol_runner) for rapid letter, sound, digit, subitizing, and alternating naming,
// with Direct or Aim-and-Lock-On control modes and optional Incremental Rehearsal scheduling.
// No AI, no account, no network, and no clock: deterministic output for the same inputs.
(function (root) {
  'use strict';

  var VERSION = 'alloflow-symbol-runner-builder/0.1.0';
  var LESSON_SCHEMA = 'alloflow-take-home-lesson/v2';
  var PLAYER = 'alloflow-word-sounds-take-home/2';

  var MODES = [
    {
      id: 'confusable_letters',
      title: 'Confusable letters (b / d / p / q)',
      category: 'letter',
      items: ['b', 'd', 'p', 'q', 'm', 'n', 'u', 'i', 'j', 'l'],
    },
    {
      id: 'letters_lower',
      title: 'Lowercase letters (a-z)',
      category: 'letter',
      items: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
    },
    {
      id: 'letters_upper',
      title: 'Uppercase letters (A-Z)',
      category: 'letter',
      items: 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' '),
    },
    {
      id: 'letter_sounds',
      title: 'Letter and digraph sounds',
      category: 'sound',
      items: 'a b c d e f g h i k l m n o p r s t u sh ch th'.split(' '),
    },
    {
      id: 'bigrams_rimes',
      title: 'Letter teams and rimes',
      category: 'sound',
      items: ['th', 'sh', 'ch', 'wh', 'ck', 'st', 'tr', 'at', 'an', 'ing'],
    },
    {
      id: 'vowel_teams_r',
      title: 'Vowel teams and r-controlled vowels',
      category: 'sound',
      items: ['ar', 'or', 'er', 'ir', 'ur', 'ee', 'oa', 'ay', 'ow', 'oy', 'oo', 'aw', 'air', 'ear'],
    },
    {
      id: 'sight_words',
      title: 'High-frequency sight words',
      category: 'word',
      items: ['all', 'are', 'away', 'been', 'both', 'busy', 'buy', 'call', 'cold', 'come', 'does', 'done', 'down', 'also'],
    },
    {
      id: 'sight_words_g1',
      title: 'Grade 1 sight words (after, again, every, from)',
      category: 'word',
      items: ['after', 'again', 'ask', 'could', 'every', 'fly', 'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his'],
    },
    {
      id: 'sight_words_g2_3',
      title: 'Grades 2-3 sight words (always, because, together)',
      category: 'word',
      items: ['always', 'around', 'because', 'before', 'best', 'both', 'carry', 'clean', 'laugh', 'light', 'myself', 'never', 'only', 'together'],
    },
    {
      id: 'multisyllable_words',
      title: 'Multisyllabic decoding words (planet, habitat, volcano)',
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
      title: 'Single digits (0-9)',
      category: 'number',
      items: '0 1 2 3 4 5 6 7 8 9'.split(' '),
    },
    {
      id: 'digits_teen_decade',
      title: 'Teens and decades (12 / 21, 13 / 30)',
      category: 'number',
      items: ['12', '21', '13', '30', '14', '40', '15', '50', '16', '60', '17', '70', '18', '80', '19', '90'],
    },
    {
      id: 'math_make_10',
      title: 'Make-10 partners (6 + ? = 10)',
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
      title: 'Doubles and near-doubles (6 + 6, 6 + 7)',
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
      title: 'Foundational 2s, 5s, and 10s (5 x 4, 10 x 6)',
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
      title: 'Multiplication squares (2 x 2 through 10 x 10)',
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
      title: 'Subitizing dots (1-9)',
      category: 'number',
      items: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
        return { word: String(n) + ' dots', answer: String(n), dots: n };
      }),
    },
    {
      id: 'ras_switch',
      title: 'Alternating letters and numbers (RAS)',
      category: 'mixed',
      alternating: true,
      items: ['a', '3', 'b', '7', 'd', '4', 'p', '9', 'q', '2', 'm', '6', 'n', '8', 's', '5'],
    },
    {
      id: 'ras_triple',
      title: '3-Way Alternating letters, numbers, and colors (RAS)',
      category: 'mixed',
      alternating: 'triple',
      items: [
        { word: 'b', answer: 'b', category: 'letter' },
        { word: '3', answer: '3', category: 'number' },
        { word: 'RED', answer: 'red', category: 'color_stroop', congruent: true, stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { word: 'd', answer: 'd', category: 'letter' },
        { word: '7', answer: '7', category: 'number' },
        { word: 'BLUE', answer: 'blue', category: 'color_stroop', congruent: true, stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { word: 'p', answer: 'p', category: 'letter' },
        { word: '4', answer: '4', category: 'number' },
        { word: 'GREEN', answer: 'green', category: 'color_stroop', congruent: true, stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { word: 'q', answer: 'q', category: 'letter' },
        { word: '9', answer: '9', category: 'number' },
        { word: 'GOLD', answer: 'gold', category: 'color_stroop', congruent: true, stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        { word: 'm', answer: 'm', category: 'letter' },
        { word: '6', answer: '6', category: 'number' },
        { word: 'BLUE', answer: 'red', category: 'color_stroop', congruent: false, stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { word: 'n', answer: 'n', category: 'letter' },
        { word: '8', answer: '8', category: 'number' },
        { word: 'RED', answer: 'blue', category: 'color_stroop', congruent: false, stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
      ],
    },
    {
      id: 'flanker_letters',
      title: 'Flanker crowd letters (focus middle in d b p q)',
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
        { word: 'nnuun', answer: 'u', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'mmmmm', answer: 'm', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'wwmww', answer: 'm', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'wwwww', answer: 'w', congruent: true, flankerCenter: 2, promptRule: 'Middle letter only' },
        { word: 'mmwmm', answer: 'w', congruent: false, flankerCenter: 2, promptRule: 'Middle letter only' },
      ],
    },
    {
      id: 'quantity_stroop',
      title: 'Quantity Stroop (count dots, ignore numeral)',
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
      title: 'Number-Size Stroop (greater value vs. size)',
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
      title: 'Color-Shape Stroop (name ink color & shape badge)',
      category: 'color_stroop',
      items: [
        { word: 'RED', answer: 'red', congruent: true, stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { word: 'BLUE', answer: 'blue', congruent: true, stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { word: 'GREEN', answer: 'green', congruent: true, stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { word: 'GOLD', answer: 'gold', congruent: true, stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        { word: 'BLUE', answer: 'red', congruent: false, stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { word: 'GREEN', answer: 'red', congruent: false, stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { word: 'GOLD', answer: 'red', congruent: false, stroopInk: '#ef4444', stroopShape: '●', promptRule: 'Name ink color & shape' },
        { word: 'RED', answer: 'blue', congruent: false, stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { word: 'GREEN', answer: 'blue', congruent: false, stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { word: 'GOLD', answer: 'blue', congruent: false, stroopInk: '#3b82f6', stroopShape: '▲', promptRule: 'Name ink color & shape' },
        { word: 'RED', answer: 'green', congruent: false, stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { word: 'BLUE', answer: 'green', congruent: false, stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { word: 'GOLD', answer: 'green', congruent: false, stroopInk: '#22c55e', stroopShape: '■', promptRule: 'Name ink color & shape' },
        { word: 'RED', answer: 'gold', congruent: false, stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        { word: 'BLUE', answer: 'gold', congruent: false, stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
        { word: 'GREEN', answer: 'gold', congruent: false, stroopInk: '#facc15', stroopShape: '★', promptRule: 'Name ink color & shape' },
      ],
    },
    {
      id: 'custom',
      title: 'Own symbol list',
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
    if (obj.sizePair && typeof obj.sizePair === 'object') out.sizePair = Object.assign({}, obj.sizePair);
    if (typeof obj.congruent === 'boolean') out.congruent = obj.congruent;
    return out;
  }

  function parseItems(input) {
    var parts = Array.isArray(input)
      ? input
      : text(input).split(/[\s,;|/\r\n]+/);
    var out = [];
    var seen = {};
    for (var i = 0; i < parts.length && out.length < 40; i++) {
      var norm = normalizeItem(parts[i]);
      if (!norm) continue;
      if (seen[norm.answer]) continue;
      seen[norm.answer] = true;
      out.push(norm);
    }
    return out;
  }

  function buildChoices(item, pool, seed) {
    var choices = [item.answer];
    var seen = {};
    seen[item.answer] = true;
    if (item.sizePair) {
      [item.sizePair.left, item.sizePair.right].forEach(function (edge) {
        var ek = text(edge).trim().toLowerCase();
        if (ek && !seen[ek] && choices.length < 6) {
          seen[ek] = true;
          choices.push(ek);
        }
      });
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
      var knownMap = {};
      if (Array.isArray(o.known)) {
        o.known.forEach(function (k) { knownMap[text(k).trim().toLowerCase()] = true; });
      } else if (typeof o.known === 'string' && o.known.trim()) {
        o.known.split(/[\s,;|\r\n]+/).forEach(function (k) { if (k.trim()) knownMap[k.trim().toLowerCase()] = true; });
      } else {
        // Default: keep up to 3 target symbols as new, treat remaining >= 3 symbols as known.
        var defaultNewCount = Math.min(3, Math.max(1, pool.length - 3));
        for (var d = defaultNewCount; d < pool.length; d++) knownMap[pool[d].answer] = true;
      }

      newSymbols = pool.filter(function (p) { return !knownMap[p.answer]; }).slice(0, 3);
      knownSymbols = pool.filter(function (p) { return !!knownMap[p.answer]; });
      if (!newSymbols.length) throw new Error('Leave at least 1 symbol unselected as known so there is a new symbol to rehearse.');
      if (knownSymbols.length < 3) throw new Error('Rehearsal needs at least 3 known symbols to space between new symbols.');

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
      cards.push({ base: pool[0], role: '', study: false, practice: true });
      cards.push({ base: pool[1 % pool.length], role: '', study: false, practice: true });
      var checkCount = Math.max(4, Math.min(60, Number(o.count) || 40));
      var scored = [];
      while (scored.length < checkCount) {
        var cPass = mixed(pool, seedBase + '|cpass|' + scored.length);
        for (var ci = 0; ci < cPass.length && scored.length < checkCount; ci++) {
          if (scored.length && scored[scored.length - 1].base.answer === cPass[ci].answer && cPass.length > 1) {
            var cSwap = cPass[(ci + 1) % cPass.length];
            cPass[(ci + 1) % cPass.length] = cPass[ci];
            cPass[ci] = cSwap;
          }
          scored.push({ base: cPass[ci], role: '', study: false, practice: false });
        }
      }
      cards = cards.concat(scored);
    } else {
      var targetCount = Math.max(4, Math.min(48, Number(o.count) || Math.min(24, Math.max(12, pool.length * 2))));
      if (mode.alternating === 'triple') {
        var tLetters = pool.filter(function (p) { return p.category === 'letter'; });
        var tNumbers = pool.filter(function (p) { return p.category === 'number'; });
        var tColors = pool.filter(function (p) { return p.category === 'color_stroop'; });
        if (tLetters.length && tNumbers.length && tColors.length) {
          var tQueues = [mixed(tLetters, seedBase + '|tl'), mixed(tNumbers, seedBase + '|tn'), mixed(tColors, seedBase + '|tc')];
          var tCursors = [0, 0, 0];
          for (var ti = 0; ti < targetCount; ti++) {
            var bi = ti % 3;
            var q = tQueues[bi];
            cards.push({ base: q[tCursors[bi] % q.length], role: '', study: false });
            tCursors[bi]++;
          }
        }
      } else if (mode.alternating) {
        var dLetters = pool.filter(function (p) { return /^[A-Za-z]+$/.test(p.answer); });
        var dNumbers = pool.filter(function (p) { return /^[0-9]+$/.test(p.answer); });
        if (dLetters.length && dNumbers.length) {
          var dQueues = [mixed(dLetters, seedBase + '|dl'), mixed(dNumbers, seedBase + '|dn')];
          var dCursors = [0, 0];
          for (var di = 0; di < targetCount; di++) {
            var dbi = di % 2;
            var dq = dQueues[dbi];
            cards.push({ base: dq[dCursors[dbi] % dq.length], role: '', study: false });
            dCursors[dbi]++;
          }
        }
      }
      while (cards.length < targetCount) {
        var pass = mixed(pool, seedBase + '|pass|' + cards.length);
        for (var pi = 0; pi < pass.length && cards.length < targetCount; pi++) {
          if (cards.length && cards[cards.length - 1].base.answer === pass[pi].answer && pass.length > 1) {
            var swap = pass[(pi + 1) % pass.length];
            pass[(pi + 1) % pass.length] = pass[pi];
            pass[pi] = swap;
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

  function safeDataImage(src) {
    var s = text(src).trim();
    return /^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);/i.test(s) ? s : '';
  }

  function safeDataAudio(src) {
    var s = text(src).trim();
    return /^data:audio\/[a-z0-9.+-]+;/i.test(s) ? s : '';
  }

  function lessonFromSymbolRunner(input) {
    var o = input || {};
    var loader = o.loader;
    if (!loader || !loader.CHECK_ADAPTERS || !loader.CHECK_ADAPTERS.symbol_runner) {
      throw new Error('lessonFromSymbolRunner needs loader (AlloWordSoundsTakeHome with symbol_runner)');
    }
    var plan = planSymbolRunner(o);
    var adapter = loader.CHECK_ADAPTERS.symbol_runner;
    var images = {};
    var audio = {};
    var picByAns = {};
    var audByAns = {};
    var seenCredits = {};
    var attributions = [];
    var hasMulberry = false;
    var hasOpenMoji = false;
    var nextImgId = 1;
    var nextAudId = 1;

    var picMap = o.pictures && typeof o.pictures === 'object' ? o.pictures : {};
    var clipMap = o.clips && typeof o.clips === 'object' ? o.clips : {};

    plan.pool.forEach(function (sym) {
      var rawPic = picMap[sym.answer] || picMap[sym.word];
      var imgData = safeDataImage(rawPic && typeof rawPic === 'object' ? (rawPic.src || rawPic.dataUri) : rawPic);
      if (imgData) {
        var pid = 'p' + (nextImgId++);
        images[pid] = imgData;
        picByAns[sym.answer] = pid;
        if (rawPic && typeof rawPic === 'object') {
          var creditLine = text(rawPic.credit).trim();
          if (creditLine && !seenCredits[creditLine]) {
            seenCredits[creditLine] = true;
            attributions.push(creditLine);
          }
          if (rawPic.set === 'mulberry' || /Mulberry/i.test(creditLine)) hasMulberry = true;
          if (rawPic.set === 'openmoji' || /OpenMoji/i.test(creditLine)) hasOpenMoji = true;
        }
      }
      var rawClip = clipMap[sym.answer] || clipMap[sym.word];
      var audData = safeDataAudio(rawClip && typeof rawClip === 'object' ? rawClip.dataUri : rawClip);
      if (audData) {
        var aid = 'a' + (nextAudId++);
        audio[aid] = audData;
        audByAns[sym.answer] = aid;
      }
    });

    var isCheck = plan.packetMode === 'check';
    if (!isCheck && Object.keys(audio).length > 0) {
      var voiceCredit = text(o.voiceCredit).trim() || 'Machine-made recordings: Kokoro-82M text-to-speech (voice af_heart)';
      if (voiceCredit && !seenCredits[voiceCredit]) {
        seenCredits[voiceCredit] = true;
        attributions.push(voiceCredit);
      }
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
      if (picByAns[card.answer]) raw.image = picByAns[card.answer];
      if (audByAns[card.answer]) raw.audio = audByAns[card.answer];
      var made = adapter.prepare(raw);
      if (!made || !made.item) {
        throw new Error('Card ' + (i + 1) + ' cannot be built: ' + (made && made.missing ? made.missing.join(', ') : 'invalid item'));
      }
      var n = (i < 9 ? '0' : '') + (i + 1);
      var idSuffix = card.practice ? '-sample' : (card.role === 'new' || card.role === 'known' ? '-' + card.role : '');
      var cardId = 'symbol_runner-' + n + idSuffix;
      return isCheck ? Object.assign({ id: cardId }, raw) : Object.assign({ id: cardId }, made.item);
    });

    var cleanTitle = text(o.title).replace(/\s+/g, ' ').trim().slice(0, 120);
    var defaultTitle = isCheck
      ? ('Symbol naming check: ' + plan.modeTitle + (o.untimed === true ? ' (untimed)' : ''))
      : ('Symbol Runner: ' + plan.modeTitle + (plan.control === 'lockon' ? ' (lock-on)' : ''));
    var title = cleanTitle || defaultTitle.slice(0, 120);
    var untimed = isCheck && o.untimed === true;
    var limit = Number(o.timeLimitS) > 0 ? Math.min(600, Math.round(Number(o.timeLimitS))) : 60;
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
    return { lesson: lesson, plan: plan, attributions: attributions, hasMulberry: hasMulberry, hasOpenMoji: hasOpenMoji };
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
    var lesson = JSON.parse(JSON.stringify(givenLesson));
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
      known: (!isCheck && plan && plan.rehearsal) ? plan.knownSymbols.map(function (k) { return k.answer; }) : [],
    };
    html = withManifest(html, { symbolRunner: recipe });
    if (o.learner) html = withCodeName(html, o.learner);
    var block = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
    return {
      html: html,
      manifest: block ? JSON.parse(block[1]) : null,
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
    var manifest;
    try { manifest = JSON.parse(html.slice(from, to)); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object') return html;
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
    var at = clean ? html.indexOf(open) : -1;
    if (at < 0) return html;
    var from = at + open.length;
    var to = html.indexOf('</script>', from);
    var manifest;
    try { manifest = JSON.parse(html.slice(from, to)); } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object') return html;
    manifest.learner = clean;
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
      var seenW = {};
      srBlock.items.forEach(function (it) {
        var w = it && text(it.word || it.answer).trim();
        if (w && !seenW[w]) { seenW[w] = true; out.items.push(w); }
      });
    }

    if (sr && Array.isArray(sr.known)) {
      out.known = sr.known.map(function (s) { return text(s).trim().toLowerCase(); }).filter(Boolean).slice(0, 40);
    } else if (out.rehearsal && srBlock) {
      var seenK = {};
      srBlock.items.forEach(function (it) {
        var k = it && it.role === 'known' ? text(it.answer || it.word).trim().toLowerCase() : '';
        if (k && !seenK[k]) { seenK[k] = true; out.known.push(k); }
      });
    }

    if (!isCheck && srBlock && lesson.images && typeof lesson.images === 'object') {
      srBlock.items.forEach(function (it) {
        if (!it || !it.image) return;
        var src = safeDataImage(lesson.images[it.image]);
        var ans = text(it.answer || it.word).trim().toLowerCase();
        if (src && ans && !out.pictures[ans]) {
          out.pictures[ans] = { src: src, alt: text(it.word || ans), credit: 'Restored from file', set: 'custom' };
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
