// Arithmetic Strategy Studio - whole-number and decimal operations with visual reasoning.
(function () {
  'use strict';

  window.StemLab = window.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    getRegisteredTools: function () {
      var self = this;
      return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
    }
  };

  if (window.StemLab.isRegistered && window.StemLab.isRegistered('arithmeticStudio')) return;

  // English fallback "translator" for data built at load time.
  var IDENTITY_T = function (key, fallback) { return fallback; };

  // {name} placeholders. A replacer FUNCTION keeps $& and $' in values literal.
  // English only: "1 dots are" reads "1 dot is". Other languages word their own sentences, and these nouns do not match them.
  function __alloOneWord(s) { if (String(s).indexOf('1 ') < 0) return s; var irr = { inches: 'inch', boxes: 'box', copies: 'copy', batches: 'batch', categories: 'category', entries: 'entry', halves: 'half', shelves: 'shelf', tries: 'try', classes: 'class', guesses: 'guess', quizzes: 'quiz', feet: 'foot', people: 'person', children: 'child', volcanoes: 'volcano' }; return String(s).replace(/(^|[^\d.,\-−\/:])([Tt]here are )?1 ((?:square|cubic|unit|equal|full|whole|live|alive|dying|new|more|fewer|extra|small|real|complete|separate|shaded|missed|remaining|plotted|turning|significant|decimal|wrong|required|sample|spaceship|part|path|trail|walking|cool|factor|zero|loose|trading|question|bottom|planned|residual|imperial|different|two-way|best-fit) )?((?:dot|row|column|square|tile|unit|piece|part|group|hop|jump|step|cup|stack|point|value|cell|face|block|marker|answer|question|problem|cube|counter|item|round|badge|generation|meter|metre|kilometer|kilometre|centimeter|centimetre|millimeter|millimetre|liter|litre|gram|kilogram|gallon|yard|mile|hectare|acre|teaspoon|tablespoon|ounce|pound|cent|dollar|coin|degree|space|place|side|second|minute|hour|day|week|month|year|apple|sticker|pencil|chair|student|bag|muffin|trial|rule|sector|shot|hundredth|tenth|thousandth|third|fourth|fifth|sixth|eighth|twelfth|quarter|whole|table|plant|marble|card|seat|ball|book|sample|ticket|tick|check|number|crayon|pack|grape|attempt|page|seed|bead|cookie|ribbon|caterpillar|feather|tray|egg|edge|mission|serving|member|dig|field|angle|birth|death|tone|parcel|prime|player|bucket|beat|pet|line|bar|slice|bin|record|response|pair|outlier|orange|crate|disk|mark|length|car|desk|tree|chocolate|challenge|section|hit|spot|landmark|pool|bee|carrot|textbook|elephant|bottle|tub|sneeze|screen|room|pin|ray|diagonal|corner|polygon|survivor|neighbour|neighbor|neighbourhood|observation|pattern|period|change|edit|stop|plan|home|wedge|figure|estimate|layer|wave|word|image|note|lesson|star|color|colour|photo|airport|event|earthquake|quake|eruption|droplet|stage|input|design|topic|case|cycle|pole|location|objective|character|credit|plate|pick|result|sound)s|inches|boxes|copies|batches|categories|entries|halves|shelves|tries|classes|guesses|quizzes|feet|people|children|volcanoes)\b( are| were| have| make| fit| remain| get| meet| need)?/g, function (m, pre, there, mod, noun, verb, at, all) { if (/(?:\b(?:Grade|Row|Column|Group|Team|Player|Level|Round|Step|Set|Part|Page|Table|Type|Day|Week|Stage|Trial|Test|Sample|Question|Problem|Card|Box|Line|Side|Figure|Item|Number|Chapter|Section|Area|Zone|Class|Tier|Unit|Lesson|Module|Generation)|[×÷+*]) $/i.test(all.slice(0, at + pre.length))) return m; if (/^(?:square|cube|round|point|change|group)s$/.test(noun) && /^ (?:to|up|down|into)\b/.test(all.slice(at + m.length))) return m; return pre + (there ? there.replace('are', 'is') : '') + '1 ' + (mod || '') + (irr[noun] || noun.slice(0, -1)) + (verb === ' are' ? ' is' : verb === ' were' ? ' was' : verb === ' have' ? ' has' : verb ? verb + 's' : ''); }).replace(/\b1 (row|group) of (\d+) make\b/g, '1 $1 of $2 makes'); }
  function fill(str, vals) {
    vals = vals || {};
    return __alloOneWord(String(str == null ? '' : str).replace(/\{(\w+)\}/g, function (match, key) {
      return Object.prototype.hasOwnProperty.call(vals, key) && vals[key] != null ? String(vals[key]) : match;
    }));
  }

  var OPERATIONS = {
    add: { symbol: '+', label: 'Addition', color: '#2563eb', soft: '#dbeafe', darkText: '#93c5fd' },
    subtract: { symbol: '−', label: 'Subtraction', color: '#dc2626', soft: '#fee2e2', darkText: '#fca5a5' },
    multiply: { symbol: '×', label: 'Multiplication', color: '#7c3aed', soft: '#ede9fe', darkText: '#c4b5fd' },
    divide: { symbol: '÷', label: 'Division', color: '#047857', soft: '#d1fae5', darkText: '#6ee7b7' }
  };
  var OP_IDS = ['add', 'subtract', 'multiply', 'divide'];

  function opLabel(t, op) {
    if (op === 'add') return t('stem.arithmetic.op_add', 'Addition');
    if (op === 'subtract') return t('stem.arithmetic.op_subtract', 'Subtraction');
    if (op === 'multiply') return t('stem.arithmetic.op_multiply', 'Multiplication');
    return t('stem.arithmetic.op_divide', 'Division');
  }

  // Plural place names, ones first.
  function placeName(t, i) {
    if (i === 0) return t('stem.arithmetic.place_ones', 'ones');
    if (i === 1) return t('stem.arithmetic.place_tens', 'tens');
    if (i === 2) return t('stem.arithmetic.place_hundreds', 'hundreds');
    if (i === 3) return t('stem.arithmetic.place_thousands', 'thousands');
    if (i === 4) return t('stem.arithmetic.place_ten_thousands', 'ten thousands');
    return t('stem.arithmetic.place_hundred_thousands', 'hundred thousands');
  }

  // A count of one place's units in words ("1 ten", "8 tens"), ones first.
  function placeCount(t, i, n) {
    var one = n === 1, s;
    if (i === 0) s = one ? t('stem.arithmetic.count_ones_one', '{n} one') : t('stem.arithmetic.count_ones', '{n} ones');
    else if (i === 1) s = one ? t('stem.arithmetic.count_tens_one', '{n} ten') : t('stem.arithmetic.count_tens', '{n} tens');
    else if (i === 2) s = one ? t('stem.arithmetic.count_hundreds_one', '{n} hundred') : t('stem.arithmetic.count_hundreds', '{n} hundreds');
    else if (i === 3) s = one ? t('stem.arithmetic.count_thousands_one', '{n} thousand') : t('stem.arithmetic.count_thousands', '{n} thousands');
    else if (i === 4) s = one ? t('stem.arithmetic.count_ten_thousands_one', '{n} ten thousand') : t('stem.arithmetic.count_ten_thousands', '{n} ten thousands');
    else s = one ? t('stem.arithmetic.count_hundred_thousands_one', '{n} hundred thousand') : t('stem.arithmetic.count_hundred_thousands', '{n} hundred thousands');
    return fill(s, { n: n });
  }

  var PRACTICE = [
    { id: 'a1', op: 'add', level: 1, a: 27, b: 35, answer: 62, estimate: 60 },
    { id: 'a2', op: 'add', level: 1, a: 46, b: 28, answer: 74, estimate: 70 },
    { id: 'a3', op: 'add', level: 2, a: 368, b: 457, answer: 825, estimate: 800 },
    { id: 'a4', op: 'add', level: 2, a: 1249, b: 875, answer: 2124, estimate: 2100 },
    { id: 'a5', op: 'add', level: 3, a: 12458, b: 7896, answer: 20354, estimate: 20000 },
    { id: 's1', op: 'subtract', level: 1, a: 73, b: 28, answer: 45, estimate: 40 },
    { id: 's2', op: 'subtract', level: 1, a: 91, b: 46, answer: 45, estimate: 40 },
    { id: 's3', op: 'subtract', level: 2, a: 502, b: 187, answer: 315, estimate: 300 },
    { id: 's4', op: 'subtract', level: 2, a: 1400, b: 675, answer: 725, estimate: 700 },
    { id: 's5', op: 'subtract', level: 3, a: 12003, b: 4786, answer: 7217, estimate: 7000 },
    { id: 'm1', op: 'multiply', level: 1, a: 7, b: 8, answer: 56, estimate: 60 },
    { id: 'm2', op: 'multiply', level: 1, a: 9, b: 6, answer: 54, estimate: 50 },
    { id: 'm3', op: 'multiply', level: 2, a: 23, b: 14, answer: 322, estimate: 300 },
    { id: 'm4', op: 'multiply', level: 2, a: 47, b: 26, answer: 1222, estimate: 1200 },
    { id: 'm5', op: 'multiply', level: 3, a: 308, b: 24, answer: 7392, estimate: 7200 },
    { id: 'd1', op: 'divide', level: 1, a: 42, b: 6, answer: 7, remainder: 0, estimate: 7 },
    { id: 'd2', op: 'divide', level: 1, a: 53, b: 5, answer: 10, remainder: 3, estimate: 10 },
    { id: 'd3', op: 'divide', level: 2, a: 156, b: 12, answer: 13, remainder: 0, estimate: 13 },
    { id: 'd4', op: 'divide', level: 2, a: 347, b: 8, answer: 43, remainder: 3, estimate: 40 },
    { id: 'd5', op: 'divide', level: 3, a: 2496, b: 24, answer: 104, remainder: 0, estimate: 100 }
  ];

  // Classic Error Detective cases. Choice lengths are balanced so the key is
  // never given away by being the longest option, and its position varies.
  function classicErrorCopy(t, id) {
    if (id === 'e1') return {
      prompt: t('stem.arithmetic.e1_prompt', 'A learner says 58 + 27 = 715.'),
      work: [t('stem.arithmetic.e1_work', 'Ones: 8 + 7 = 15. Tens: 5 + 2 = 7. The learner wrote 7 and then 15.')],
      explain: t('stem.arithmetic.e1_explain', '15 ones is 1 ten and 5 ones. Regroup the ten, then add 5 + 2 + 1 = 8 tens, giving 85.'),
      hint: t('stem.arithmetic.e1_hint', 'Look at the ones column. Can one place hold 15?'),
      labels: {
        place: t('stem.arithmetic.e1_choice_place', 'The digits were aligned incorrectly in columns.'),
        regroup: t('stem.arithmetic.e1_choice_regroup', 'The ten from 15 was never regrouped into tens.'),
        operation: t('stem.arithmetic.e1_choice_operation', 'The problem needed subtraction, not addition.')
      }
    };
    if (id === 'e2') return {
      prompt: t('stem.arithmetic.e2_prompt', 'A learner says 402 − 186 = 384.'),
      work: [t('stem.arithmetic.e2_work', 'Ones: 6 − 2 = 4. Tens: 8 − 0 = 8. Hundreds: 4 − 1 = 3.')],
      explain: t('stem.arithmetic.e2_explain', 'Regroup 402 as 3 hundreds, 9 tens and 12 ones. Then 12 − 6 = 6, 9 − 8 = 1 and 3 − 1 = 2, so the answer is 216.'),
      hint: t('stem.arithmetic.e2_hint', 'In each column, which digit is on top, and which one did the learner subtract from?'),
      labels: {
        zero: t('stem.arithmetic.e2_choice_zero', 'A zero may never be the top digit in a subtraction.'),
        estimate: t('stem.arithmetic.e2_choice_estimate', 'The numbers were rounded before being subtracted.'),
        direction: t('stem.arithmetic.e2_choice_direction', 'Each column took the small digit from the big one.')
      }
    };
    if (id === 'e3') return {
      prompt: t('stem.arithmetic.e3_prompt', 'A learner says 24 × 13 = 72.'),
      work: [t('stem.arithmetic.e3_work', '24 × 3 = 72, and the learner stopped there.')],
      explain: t('stem.arithmetic.e3_explain', '13 is 10 + 3. The product is 24 × 10 + 24 × 3 = 240 + 72 = 312.'),
      hint: t('stem.arithmetic.e3_hint', 'Split 13 by place value. Did the learner multiply by every part?'),
      labels: {
        partial: t('stem.arithmetic.e3_choice_partial', 'The partial product 24 × 10 was never found.'),
        add: t('stem.arithmetic.e3_choice_add', 'The two factors should have been added instead.'),
        decimal: t('stem.arithmetic.e3_choice_decimal', 'A decimal point is missing from the product.')
      }
    };
    return {
      prompt: t('stem.arithmetic.e4_prompt', 'A learner says 65 ÷ 6 = 10 exactly.'),
      work: [t('stem.arithmetic.e4_work', '6 × 10 = 60, so the learner wrote 10.')],
      explain: t('stem.arithmetic.e4_explain', '65 = 6 × 10 + 5, so the whole-number result is 10 remainder 5.'),
      hint: t('stem.arithmetic.e4_hint', 'Multiply back: does 6 × 10 make exactly 65?'),
      labels: {
        inverse: t('stem.arithmetic.e4_choice_inverse', '65 should have been multiplied by 6 instead.'),
        remainder: t('stem.arithmetic.e4_choice_remainder', 'The 5 left after taking 6 × 10 was ignored.'),
        round: t('stem.arithmetic.e4_choice_round', '65 should have been rounded up to 70 first.')
      }
    };
  }

  var CLASSIC_ERRORS = [
    { id: 'e1', op: 'add', answer: 'regroup', order: ['place', 'regroup', 'operation'] },
    { id: 'e2', op: 'subtract', answer: 'direction', order: ['zero', 'estimate', 'direction'] },
    { id: 'e3', op: 'multiply', answer: 'partial', order: ['partial', 'add', 'decimal'] },
    { id: 'e4', op: 'divide', answer: 'remainder', order: ['inverse', 'remainder', 'round'] }
  ];

  function classicErrorCase(t, index) {
    var base = CLASSIC_ERRORS[index];
    var copy = classicErrorCopy(t, base.id);
    return {
      id: base.id, op: base.op, answer: base.answer, generated: false, index: index,
      prompt: copy.prompt, work: copy.work, explain: copy.explain, hint: copy.hint,
      choices: base.order.map(function (id) { return { id: id, label: copy.labels[id] }; })
    };
  }

  var ERROR_CASES = CLASSIC_ERRORS.map(function (item, index) {
    var c = classicErrorCase(IDENTITY_T, index);
    return { id: c.id, prompt: c.prompt, work: c.work.join(' '), answer: c.answer, choices: c.choices, explain: c.explain };
  });

  function wordCopy(t, id) {
    if (id === 'w1') return { story: t('stem.arithmetic.w1_story', 'A library has 248 graphic novels and receives 175 more. How many does it have now?'), unit: t('stem.arithmetic.w1_unit', 'graphic novels') };
    if (id === 'w2') return { story: t('stem.arithmetic.w2_story', 'A trail is 950 meters long. Maya has walked 385 meters. How many meters remain?'), unit: t('stem.arithmetic.w2_unit', 'meters') };
    if (id === 'w3') return { story: t('stem.arithmetic.w3_story', 'There are 18 tables with 24 science kits at each table. How many kits are there?'), unit: t('stem.arithmetic.w3_unit', 'kits') };
    if (id === 'w4') return { story: t('stem.arithmetic.w4_story', 'A teacher shares 157 markers equally among 12 groups. How many markers does each group receive, and how many remain?'), unit: t('stem.arithmetic.w4_unit', 'markers per group') };
    if (id === 'full-teams') return { story: t('stem.arithmetic.full_teams_story', 'Sixty-seven students form teams of 8. How many complete teams can enter the tournament?'), unit: t('stem.arithmetic.full_teams_unit', 'complete teams') };
    return { story: t('stem.arithmetic.supply_boxes_story', 'A science club must pack 67 samples into boxes that hold 8 samples each. How many boxes are needed so every sample is packed?'), unit: t('stem.arithmetic.supply_boxes_unit', 'boxes') };
  }

  var WORD_PROBLEMS = [
    { id: 'w1', op: 'add', a: 248, b: 175, answer: 423 },
    { id: 'w2', op: 'subtract', a: 950, b: 385, answer: 565 },
    { id: 'w3', op: 'multiply', a: 18, b: 24, answer: 432 },
    { id: 'w4', op: 'divide', divisionContext: 'report-remainder', a: 157, b: 12, answer: 13, remainder: 1 },
    { id: 'full-teams', op: 'divide', divisionContext: 'discard-remainder', a: 67, b: 8, answer: 8, remainder: 3 },
    { id: 'supply-boxes', op: 'divide', divisionContext: 'round-up', a: 67, b: 8, answer: 9, remainder: 3 }
  ].map(function (problem) {
    var copy = wordCopy(IDENTITY_T, problem.id);
    return Object.assign({}, problem, { story: copy.story, unit: copy.unit });
  });

  var TAB_IDS = ['learn', 'practice', 'errors', 'apply', 'mental', 'bars', 'decimals'];
  var PRACTICE_IDS = PRACTICE.map(function (item) { return item.id; });
  var ERROR_IDS = ERROR_CASES.map(function (item) { return item.id; });
  var WORD_IDS = WORD_PROBLEMS.map(function (item) { return item.id; });

  function countSolved(map, allowedIds) {
    var ids = allowedIds || Object.keys(map || {});
    return ids.filter(function (id) { return !!(map || {})[id]; }).length;
  }

  // ---------------------------------------------------------------- numbers
  function roundTo(x, dp) { var f = Math.pow(10, dp); return Math.round(x * f) / f; }
  function isInt(x) { return isFinite(x) && Math.abs(x - Math.round(x)) < 1e-9; }
  function decimalsOf(x) {
    if (!isFinite(x)) return 0;
    var s = String(roundTo(Math.abs(x), 6));
    if (s.indexOf('e') >= 0) return 0;
    var i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  }
  function fmtNum(x, dp) {
    if (x == null || !isFinite(x)) return '';
    var places = dp == null ? decimalsOf(x) : dp;
    return places > 0 ? roundTo(x, places).toFixed(places) : String(Math.round(x));
  }
  function parseNum(s) {
    if (s === '' || s == null) return NaN;
    var n = Number(String(s).trim());
    return String(s).trim() === '' ? NaN : n;
  }
  function numEq(x, y) { return isFinite(x) && isFinite(y) && Math.abs(x - y) < 1e-9; }
  function leadPlace(x) {
    x = Math.abs(Number(x));
    if (!(x >= 1)) return 1;
    return Math.pow(10, String(Math.floor(x)).length - 1);
  }
  function roundNearest(x, p) { return roundTo(Math.round(x / p) * p, 6); }
  function truncTo(x, p) { return roundTo(Math.floor(x / p + 1e-9) * p, 6); }
  function digitsOf(n) { return String(Math.abs(Math.round(n))).split('').reverse().map(Number); }
  function fromDigits(list) { return list.reduce(function (sum, digit, i) { return sum + digit * Math.pow(10, i); }, 0); }

  function clampInt(value, min, max, fallback) {
    if (value === '' || value === null || typeof value === 'undefined') return fallback;
    var n = Math.round(Number(value));
    return isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }

  function splitPlaceValue(n) {
    var value = Math.abs(Math.round(n));
    var parts = [];
    var place = 1;
    while (value > 0) {
      var digit = value % 10;
      if (digit) parts.unshift(digit * place);
      value = Math.floor(value / 10);
      place *= 10;
    }
    return parts.length ? parts : [0];
  }

  function calculate(op, a, b) {
    a = Math.round(Number(a)); b = Math.round(Number(b));
    if (op === 'add') return { answer: a + b, remainder: 0 };
    if (op === 'subtract') return { answer: a - b, remainder: 0 };
    if (op === 'multiply') return { answer: a * b, remainder: 0 };
    if (b === 0) return { answer: null, remainder: null };
    return { answer: Math.floor(a / b), remainder: a % b };
  }

  // Exact results for decimals too (scaled integers, so 0.1 + 0.2 is 0.3).
  function calcExact(op, a, b) {
    a = Number(a); b = Number(b);
    var dp = Math.max(decimalsOf(a), decimalsOf(b));
    if (!dp) return calculate(op, a, b);
    var f = Math.pow(10, dp), A = Math.round(a * f), B = Math.round(b * f);
    if (op === 'add') return { answer: roundTo((A + B) / f, dp), remainder: 0 };
    if (op === 'subtract') return { answer: roundTo((A - B) / f, dp), remainder: 0 };
    if (op === 'multiply') return { answer: roundTo((A * B) / (f * f), 2 * dp), remainder: 0 };
    if (!B) return { answer: null, remainder: null };
    return { answer: roundTo(A / B, 6), remainder: 0 };
  }

  // A basic fact needs no estimate: sums and differences within 20, products
  // of factors up to 10, and the matching exact division facts.
  function isBasicFact(op, a, b) {
    if (!isInt(a) || !isInt(b)) return false;
    if (op === 'add' || op === 'subtract') return a <= 20 && b <= 20;
    if (op === 'multiply') return a <= 10 && b <= 10;
    if (op === 'divide') return b >= 1 && b <= 10 && a % b === 0 && a / b <= 10;
    return false;
  }

  // A product that rounding cannot change is a fact too (no estimate step):
  // whole factors that are each one non-zero digit followed only by zeros
  // (7 x 60, 70 x 6, 60 x 70, 7 x 600), or a zero factor. Its friendly-number
  // estimate would be the exact answer. 12 x 60 and 7 x 65 still estimate.
  function isDigitTimesPowerOfTen(n) {
    if (!isInt(n) || n < 1) return false;
    n = Math.round(n);
    while (n % 10 === 0) n = n / 10;
    return n <= 9;
  }
  function isExtendedFact(op, a, b) {
    if (op !== 'multiply' || !isInt(a) || !isInt(b) || a < 0 || b < 0 || isBasicFact(op, a, b)) return false;
    return a === 0 || b === 0 || (isDigitTimesPowerOfTen(a) && isDigitTimesPowerOfTen(b));
  }

  // ---------------------------------------------------------------- seeded randomness
  function hashStr(s) {
    var hash = 2166136261;
    for (var i = 0; i < s.length; i++) { hash ^= s.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function mulberry32(seed) {
    var state = seed >>> 0;
    return function () {
      state = (state + 0x6D2B79F5) >>> 0;
      var x = state;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rint(rng, lo, hi) { return lo + Math.floor(rng() * (hi - lo + 1)); }
  function shuffled(list, rng) {
    var out = list.slice();
    for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var tmp = out[i]; out[i] = out[j]; out[j] = tmp; }
    return out;
  }

  // ---------------------------------------------------------------- grade bands and generators
  var BANDS = ['k2', 'g3', 'g4', 'g5'];

  function bandFromCtx(gradeBand, gradeLevel) {
    var g = String(gradeLevel || '').toLowerCase();
    var gb = String(gradeBand || '').toLowerCase();
    function fromLevel() {
      if (/kinder|pre-?k|\b(1st|2nd|first|second)\b|grade [12]\b/.test(g)) return 'k2';
      if (/\b(3rd|third)\b|grade 3\b/.test(g)) return 'g3';
      if (/\b(4th|fourth)\b|grade 4\b/.test(g)) return 'g4';
      if (/\b([5-9]th|1[0-2]th)\b|college|graduate|university|grade ([5-9]|1[0-2])\b/.test(g)) return 'g5';
      return null;
    }
    if (gb === 'k2') return 'k2';
    if (gb === 'g35') { var level = fromLevel(); return level === 'g3' || level === 'g4' || level === 'g5' ? level : 'g4'; }
    if (gb === 'g68' || gb === 'g912') return 'g5';
    return fromLevel() || 'g5';
  }

  var SKILLS = {
    add20: { op: 'add', band: 'k2', fact: true },
    add100: { op: 'add', band: 'k2' },
    add1000: { op: 'add', band: 'g3' },
    addMulti: { op: 'add', band: 'g4' },
    addBig: { op: 'add', band: 'g5' },
    addDec: { op: 'add', band: 'g5', decimal: true },
    sub20: { op: 'subtract', band: 'k2', fact: true },
    sub100: { op: 'subtract', band: 'k2' },
    sub1000: { op: 'subtract', band: 'g3' },
    subMulti: { op: 'subtract', band: 'g4' },
    subBig: { op: 'subtract', band: 'g5' },
    subDec: { op: 'subtract', band: 'g5', decimal: true },
    mulGroups: { op: 'multiply', band: 'k2', fact: true },
    mul100: { op: 'multiply', band: 'g3', fact: true },
    mulTens: { op: 'multiply', band: 'g3' },
    mulMx1: { op: 'multiply', band: 'g4' },
    mul2x2: { op: 'multiply', band: 'g4' },
    mulMulti: { op: 'multiply', band: 'g5' },
    mulDec: { op: 'multiply', band: 'g5', decimal: true },
    divShare: { op: 'divide', band: 'k2', fact: true },
    div100: { op: 'divide', band: 'g3', fact: true },
    divRem: { op: 'divide', band: 'g4', remainder: true },
    divLong: { op: 'divide', band: 'g5', remainder: true },
    divDec: { op: 'divide', band: 'g5', decimal: true }
  };
  var SKILL_ORDER = Object.keys(SKILLS);

  function skillsFor(band, op) {
    return SKILL_ORDER.filter(function (id) { return SKILLS[id].band === band && SKILLS[id].op === op; });
  }

  function skillLabel(t, id) {
    switch (id) {
      case 'add20': return t('stem.arithmetic.skill_add20', 'Add within 20');
      case 'add100': return t('stem.arithmetic.skill_add100', 'Add within 100');
      case 'add1000': return t('stem.arithmetic.skill_add1000', 'Add within 1,000');
      case 'addMulti': return t('stem.arithmetic.skill_addmulti', 'Add multi-digit numbers');
      case 'addBig': return t('stem.arithmetic.skill_addbig', 'Add large numbers');
      case 'addDec': return t('stem.arithmetic.skill_adddec', 'Add decimals');
      case 'sub20': return t('stem.arithmetic.skill_sub20', 'Subtract within 20');
      case 'sub100': return t('stem.arithmetic.skill_sub100', 'Subtract within 100');
      case 'sub1000': return t('stem.arithmetic.skill_sub1000', 'Subtract within 1,000');
      case 'subMulti': return t('stem.arithmetic.skill_submulti', 'Subtract multi-digit numbers');
      case 'subBig': return t('stem.arithmetic.skill_subbig', 'Subtract large numbers');
      case 'subDec': return t('stem.arithmetic.skill_subdec', 'Subtract decimals');
      case 'mulGroups': return t('stem.arithmetic.skill_mulgroups', 'Equal groups up to 5 × 5');
      case 'mul100': return t('stem.arithmetic.skill_mul100', 'Multiply within 100');
      case 'mulTens': return t('stem.arithmetic.skill_multens', 'Multiply by multiples of 10');
      case 'mulMx1': return t('stem.arithmetic.skill_mulmx1', 'Multi-digit × 1-digit');
      case 'mul2x2': return t('stem.arithmetic.skill_mul2x2', '2-digit × 2-digit');
      case 'mulMulti': return t('stem.arithmetic.skill_mulmulti', '3-digit × 2-digit');
      case 'mulDec': return t('stem.arithmetic.skill_muldec', 'Multiply decimals');
      case 'divShare': return t('stem.arithmetic.skill_divshare', 'Share equally (up to 25)');
      case 'div100': return t('stem.arithmetic.skill_div100', 'Divide within 100');
      case 'divRem': return t('stem.arithmetic.skill_divrem', 'Divide with remainders');
      case 'divLong': return t('stem.arithmetic.skill_divlong', 'Long division by 2-digit numbers');
      default: return t('stem.arithmetic.skill_divdec', 'Divide decimals by whole numbers');
    }
  }

  function bandLabel(t, band) {
    if (band === 'k2') return t('stem.arithmetic.band_k2', 'Grades K–2');
    if (band === 'g3') return t('stem.arithmetic.band_g3', 'Grade 3');
    if (band === 'g4') return t('stem.arithmetic.band_g4', 'Grade 4');
    return t('stem.arithmetic.band_g5', 'Grade 5 and up');
  }

  function nonZeroLastDigit(rng, lo, hi) {
    var n;
    do { n = rint(rng, lo, hi); } while (n % 10 === 0);
    return n;
  }

  // Deterministic: the same skill and seed always give the same problem.
  function generateProblem(skillId, seed) {
    var skill = SKILLS[skillId] ? skillId : 'add100';
    seed = clampInt(seed, 1, 999999999, 1);
    var rng = mulberry32(hashStr(skill + ':' + seed));
    var meta = SKILLS[skill];
    var a = 0, b = 0, q, r;
    switch (skill) {
      case 'add20': a = rint(rng, 2, 15); b = rint(rng, 1, 20 - a); break;
      case 'add100': a = rint(rng, 12, 79); b = rint(rng, 11, 99 - a); break;
      case 'add1000': a = rint(rng, 120, 799); b = rint(rng, 101, 999 - a); break;
      case 'addMulti': a = rint(rng, 1000, 8999); b = rint(rng, 300, Math.min(8999, 9999 - a)); break;
      case 'addBig': a = rint(rng, 10000, 79999); b = rint(rng, 1000, 19999); break;
      case 'addDec': a = nonZeroLastDigit(rng, 101, 9999) / 100; b = nonZeroLastDigit(rng, 11, 999) / 10; break;
      case 'sub20': a = rint(rng, 11, 20); b = rint(rng, 2, a - 1); break;
      case 'sub100': a = rint(rng, 31, 99); b = rint(rng, 11, a - 5); break;
      case 'sub1000': a = rint(rng, 301, 999); b = rint(rng, 101, a - 50); break;
      case 'subMulti':
        a = rng() < 0.3 ? rint(rng, 2, 9) * 1000 + rint(rng, 0, 9) : rint(rng, 2000, 9999);
        b = rint(rng, 500, a - 200); break;
      case 'subBig': a = rint(rng, 20000, 99999); b = rint(rng, 5000, a - 1000); break;
      case 'subDec': a = nonZeroLastDigit(rng, 1001, 9999) / 100; b = nonZeroLastDigit(rng, 11, Math.floor(a * 10) - 5) / 10; break;
      case 'mulGroups': a = rint(rng, 2, 5); b = rint(rng, 2, 5); break;
      case 'mul100': a = rint(rng, 2, 10); b = rint(rng, 2, 10); break;
      case 'mulTens': a = rint(rng, 2, 9); b = rint(rng, 2, 9) * 10; break;
      case 'mulMx1': a = rng() < 0.4 ? rint(rng, 12, 99) : rng() < 0.7 ? rint(rng, 102, 999) : rint(rng, 1002, 4999); b = rint(rng, 3, 9); break;
      case 'mul2x2': a = nonZeroLastDigit(rng, 12, 98); b = nonZeroLastDigit(rng, 12, 98); break;
      case 'mulMulti': a = nonZeroLastDigit(rng, 102, 989); b = nonZeroLastDigit(rng, 12, 98); break;
      case 'mulDec':
        a = nonZeroLastDigit(rng, 12, 99) / 10;
        b = rng() < 0.65 ? rint(rng, 3, 9) : nonZeroLastDigit(rng, 12, 49) / 10; break;
      case 'divShare': b = rint(rng, 2, 5); q = rint(rng, 2, 5); a = b * q; break;
      case 'div100': b = rint(rng, 2, 10); q = rint(rng, 2, 10); a = b * q; break;
      case 'divRem':
        b = rint(rng, 3, 9); q = rint(rng, 11, 999); r = rng() < 0.8 ? rint(rng, 1, b - 1) : 0;
        a = b * q + r; break;
      case 'divLong':
        b = rint(rng, 12, 59);
        q = rng() < 0.3 ? rint(rng, 1, 9) * 100 + rint(rng, 1, 9) : rint(rng, 21, 299);
        r = rng() < 0.75 ? rint(rng, 1, b - 1) : 0;
        a = b * q + r; break;
      default:
        // Keep the dividend a decimal (b * q whole would be a whole-number problem).
        do { b = rint(rng, 2, 9); q = nonZeroLastDigit(rng, 11, 99) / 10; } while (isInt(roundTo(b * q, 1)));
        a = roundTo(b * q, 1); break;
    }
    var result = calcExact(meta.op, a, b);
    var places = meta.decimal ? Math.max(decimalsOf(a), decimalsOf(b)) : 0;
    return {
      id: skill + '-' + seed, skill: skill, seed: seed, op: meta.op, a: a, b: b,
      answer: result.answer, remainder: result.remainder || 0,
      hasRemainder: !!meta.remainder, decimal: !!meta.decimal, fact: !!meta.fact || isExtendedFact(meta.op, a, b),
      generated: true, answerPlaces: meta.decimal ? decimalsOf(result.answer) : 0, places: places
    };
  }

  function parseGenId(id) {
    var m = /^([A-Za-z0-9]+)-(\d{1,9})$/.exec(String(id || ''));
    if (!m || !SKILLS[m[1]]) return null;
    return { skill: m[1], seed: Number(m[2]) };
  }

  function genSolvedCount(data) {
    var map = (data && data.genSolved) || {};
    return Object.keys(map).filter(function (id) { return map[id] && !!parseGenId(id); }).length;
  }

  function decorateSetProblem(problem) {
    if (!problem) return null;
    return Object.assign({}, problem, {
      hasRemainder: problem.op === 'divide', decimal: false,
      fact: isBasicFact(problem.op, problem.a, problem.b) || isExtendedFact(problem.op, problem.a, problem.b), generated: false
    });
  }

  function problemNeedsEstimate(problem) {
    return !!problem && !problem.fact && !isBasicFact(problem.op, problem.a, problem.b) && !isExtendedFact(problem.op, problem.a, problem.b);
  }

  function successfulOperationMap(data) {
    var completed = Object.assign({}, (data && data.operationsCompleted) || {});
    PRACTICE.forEach(function (problem) {
      if (data && data.practiceSolved && data.practiceSolved[problem.id]) completed[problem.op] = true;
    });
    WORD_PROBLEMS.forEach(function (problem) {
      if (data && data.wordSolvedCases && data.wordSolvedCases[problem.id]) completed[problem.op] = true;
    });
    Object.keys((data && data.genSolved) || {}).forEach(function (id) {
      var parsed = data.genSolved[id] && parseGenId(id);
      if (parsed) completed[SKILLS[parsed.skill].op] = true;
    });
    return completed;
  }

  function successfulOperationCount(data) {
    var completed = successfulOperationMap(data);
    return OP_IDS.filter(function (op) { return !!completed[op]; }).length;
  }

  // ---------------------------------------------------------------- word problems
  function wordProblemById(id) {
    return WORD_PROBLEMS.filter(function (problem) { return problem.id === id; })[0] || null;
  }

  function wordProblemFromState(data) {
    var selected = wordProblemById(data && data.wordProblemId);
    if (selected) return selected;
    var legacyCandidates = data && OPERATIONS[data.operation]
      ? WORD_PROBLEMS.filter(function (problem) { return problem.op === data.operation; })
      : WORD_PROBLEMS;
    var legacyIndex = clampInt(data && data.wordIndex, 0, legacyCandidates.length - 1, 0);
    return legacyCandidates[legacyIndex];
  }

  function expectedWordResponse(problem) {
    var result = calculate(problem.op, problem.a, problem.b);
    if (problem.op !== 'divide') {
      return { answer: result.answer, remainder: 0, requiresRemainder: false, divisionContext: null };
    }
    var context = problem.divisionContext || 'report-remainder';
    if (context === 'round-up') {
      return { answer: result.answer + (result.remainder ? 1 : 0), remainder: 0, requiresRemainder: false, divisionContext: context };
    }
    return {
      answer: result.answer,
      remainder: context === 'report-remainder' ? result.remainder : 0,
      requiresRemainder: context === 'report-remainder',
      divisionContext: context
    };
  }

  function missedWordProblemIds(data) {
    var missed = (data && data.wordMissedCases) || {};
    var solved = (data && data.wordSolvedCases) || {};
    return WORD_IDS.filter(function (id) { return !!missed[id] && !solved[id]; });
  }

  function nextWordProblemId(currentId, allowedIds) {
    var allowed = allowedIds || WORD_IDS;
    var pool = WORD_IDS.filter(function (id) { return allowed.indexOf(id) >= 0; });
    if (!pool.length) return wordProblemById(currentId) ? currentId : WORD_IDS[0];
    var currentIndex = pool.indexOf(currentId);
    return pool[currentIndex < 0 ? 0 : (currentIndex + 1) % pool.length];
  }

  function wordResultExplanation(problem, t) {
    t = t || IDENTITY_T;
    var expected = expectedWordResponse(problem);
    if (problem.op !== 'divide') return strategySteps(problem.op, problem.a, problem.b, t).join(' ');
    var raw = calculate('divide', problem.a, problem.b);
    var vals = { a: problem.a, b: problem.b, q: raw.answer, r: raw.remainder, answer: expected.answer };
    if (expected.divisionContext === 'round-up') {
      return fill(raw.remainder === 1
        ? t('stem.arithmetic.word_explain_roundup_one', '{a} = {b} × {q} + {r}. {q} boxes fill completely, and the 1 remaining item needs one more. The context answer is {answer}.')
        : t('stem.arithmetic.word_explain_roundup', '{a} = {b} × {q} + {r}. {q} boxes fill completely, and the {r} remaining items need one more. The context answer is {answer}.'), vals);
    }
    if (expected.divisionContext === 'discard-remainder') {
      return fill(t('stem.arithmetic.word_explain_discard', '{a} = {b} × {q} + {r}. Only complete groups count, so the context answer is {answer}; the {r} left over do not make another complete group.'), vals);
    }
    return fill(t('stem.arithmetic.word_explain_report', '{a} = {b} × {q} + {r}. Report both parts: {q} in each group with {r} left over.'), vals);
  }

  // ---------------------------------------------------------------- strategies
  function strategySteps(op, a, b, t) {
    t = t || IDENTITY_T;
    var decimal = !isInt(Number(a)) || !isInt(Number(b));
    if (decimal) return decimalSteps(op, Number(a), Number(b), t);
    var result = calculate(op, a, b);
    if (op === 'add') {
      return [
        fill(t('stem.arithmetic.steps_add_1', 'Decompose by place value: {a} = {ap}; {b} = {bp}.'), { a: a, b: b, ap: splitPlaceValue(a).join(' + '), bp: splitPlaceValue(b).join(' + ') }),
        t('stem.arithmetic.steps_add_2', 'Combine equal places, beginning with the ones. Trade every 10 of a place for 1 of the next place.'),
        fill(t('stem.arithmetic.steps_add_3', 'The sum is {r}. Check that it is close to your estimate.'), { r: result.answer })
      ];
    }
    if (op === 'subtract') {
      return [
        fill(t('stem.arithmetic.steps_sub_1', 'Align equal place values in {a} and {b}.'), { a: a, b: b }),
        t('stem.arithmetic.steps_sub_2', 'When a place does not have enough, decompose 1 from the place to its left into 10 of the current place.'),
        fill(t('stem.arithmetic.steps_sub_3', 'Subtract each place: {a} − {b} = {r}. Check by adding {r} + {b}.'), { a: a, b: b, r: result.answer })
      ];
    }
    if (op === 'multiply') {
      if (a < 10 || b < 10) {
        if (a >= 10 || b >= 10) {
          var big = a >= 10 ? a : b, small = a >= 10 ? b : a;
          var bigParts = splitPlaceValue(big);
          return [
            fill(t('stem.arithmetic.steps_mul1_1', 'Decompose by place value: {big} = {parts}.'), { big: big, parts: bigParts.join(' + ') }),
            fill(t('stem.arithmetic.steps_mul1_2', 'Multiply each part by {small}: {list}.'), { small: small, list: bigParts.map(function (part) { return part + ' × ' + small + ' = ' + part * small; }).join(', ') }),
            fill(t('stem.arithmetic.steps_mul_3', 'Add the partial products to get {r}.'), { r: result.answer })
          ];
        }
        return [
          fill(t('stem.arithmetic.steps_fact_1', 'Think of {a} × {b} as {a} equal groups of {b}.'), { a: a, b: b }),
          t('stem.arithmetic.steps_fact_2', 'Use an array, skip counting or a fact you already know.'),
          fill(t('stem.arithmetic.steps_fact_3', 'The product is {r}.'), { r: result.answer })
        ];
      }
      var ap = splitPlaceValue(a), bp = splitPlaceValue(b), pairs = [];
      ap.forEach(function (x) { bp.forEach(function (y) { pairs.push(x + ' × ' + y); }); });
      return [
        fill(t('stem.arithmetic.steps_mul_1', 'Decompose by place value: {a} = {ap} and {b} = {bp}.'), { a: a, b: b, ap: ap.join(' + '), bp: bp.join(' + ') }),
        fill(t('stem.arithmetic.steps_mul_2', 'Find every partial product: {list}.'), { list: pairs.join(', ') }),
        fill(t('stem.arithmetic.steps_mul_3', 'Add the partial products to get {r}.'), { r: result.answer })
      ];
    }
    if (result.answer == null) return [t('stem.arithmetic.steps_div_zero', 'Division by zero is undefined: no number of groups of 0 can make a total.')];
    var product = b * result.answer;
    return [
      fill(t('stem.arithmetic.steps_div_1', 'Ask how many groups of {b} fit in {a}.'), { a: a, b: b }),
      fill(t('stem.arithmetic.steps_div_2', 'Use multiplication facts or partial quotients: {b} × {q} = {p}.'), { b: b, q: result.answer, p: product }),
      fill(result.remainder
        ? t('stem.arithmetic.steps_div_3_rem', 'Subtract from the dividend: {a} − {p} = {r}. Result: {q} remainder {r}.')
        : t('stem.arithmetic.steps_div_3_exact', 'Subtract from the dividend: {a} − {p} = 0. Result: {q} exactly.'), { a: a, p: product, r: result.remainder, q: result.answer })
    ];
  }

  function decimalSteps(op, a, b, t) {
    var res = calcExact(op, a, b);
    var dp = Math.max(decimalsOf(a), decimalsOf(b));
    var vals = { a: fmtNum(a, dp), b: fmtNum(b, dp), r: fmtNum(res.answer) };
    if (op === 'add' || op === 'subtract') {
      return [
        fill(t('stem.arithmetic.steps_dec_align', 'Line up the decimal points: write {a} and {b} with the same number of decimal places.'), vals),
        op === 'add'
          ? t('stem.arithmetic.steps_dec_add_2', 'Add each place from the right, regrouping just as with whole numbers.')
          : t('stem.arithmetic.steps_dec_sub_2', 'Subtract each place from the right, regrouping just as with whole numbers.'),
        fill(t('stem.arithmetic.steps_dec_result', 'Keep the decimal point in line. The result is {r}.'), vals)
      ];
    }
    if (op === 'multiply') {
      var da = decimalsOf(a), db = decimalsOf(b);
      var A = Math.round(a * Math.pow(10, da)), B = Math.round(b * Math.pow(10, db));
      return [
        fill(t('stem.arithmetic.steps_decmul_1', 'Multiply as if there were no decimal points: {A} × {B} = {P}.'), { A: A, B: B, P: A * B }),
        fill(t('stem.arithmetic.steps_decmul_2', 'Count the decimal places in the two factors: {n} in all.'), { n: da + db }),
        fill(t('stem.arithmetic.steps_decmul_3', 'Place the decimal point so the product has {n} decimal places: {r}.'), { n: da + db, r: fmtNum(res.answer) })
      ];
    }
    return [
      t('stem.arithmetic.steps_decdiv_1', 'Divide as with whole numbers, and write the decimal point in the quotient straight above the one in the dividend.'),
      fill(t('stem.arithmetic.steps_decdiv_2', 'The quotient is {r}. Check by multiplying: {b} × {r} = {a}.'), { a: fmtNum(a), b: fmtNum(b), r: fmtNum(res.answer) })
    ];
  }

  // ---------------------------------------------------------------- estimation
  function estimatePlan(op, a, b) {
    a = Number(a); b = Number(b);
    if (!isFinite(a)) a = 0;
    if (!isFinite(b)) b = 0;
    var symbol = OPERATIONS[op] ? OPERATIONS[op].symbol : '?';
    if (op === 'add' || op === 'subtract') {
      var largest = Math.max(Math.abs(a), Math.abs(b));
      var place = largest < 100 ? 10 : largest < 1000 ? 100 : largest < 10000 ? 100 : 1000;
      var friendlyA = roundNearest(a, place);
      var friendlyB = roundNearest(b, place);
      var estimate = op === 'add' ? friendlyA + friendlyB : friendlyA - friendlyB;
      return { estimate: estimate, left: friendlyA, right: friendlyB, expression: friendlyA + ' ' + symbol + ' ' + friendlyB };
    }
    if (op === 'multiply') {
      if (a === 0 || b === 0) return { estimate: 0, left: a, right: b, expression: a + ' ' + symbol + ' ' + b };
      var oneDigitFriendly = function (value) {
        var absolute = Math.abs(value);
        var p = absolute < 10 ? 5 : Math.pow(10, Math.max(1, String(Math.floor(absolute)).length - 1));
        var rounded = roundNearest(absolute, p);
        if (!rounded) rounded = p;
        return value < 0 ? -rounded : rounded;
      };
      var roundedA = oneDigitFriendly(a), roundedB = oneDigitFriendly(b);
      var relativeA = Math.abs(roundedA - a) / Math.max(1, Math.abs(a));
      var relativeB = Math.abs(roundedB - b) / Math.max(1, Math.abs(b));
      var planA = relativeA <= relativeB ? roundedA : a;
      var planB = relativeA <= relativeB ? b : roundedB;
      return { estimate: roundTo(planA * planB, 6), left: planA, right: planB, expression: planA + ' ' + symbol + ' ' + planB };
    }
    if (b === 0) return { estimate: null, left: a, right: b, expression: '' };
    if (Math.abs(a) < Math.abs(b)) return { estimate: 0, left: 0, right: b, expression: '0 ' + symbol + ' ' + b };
    var rawQuotient = a / b;
    var magnitude = Math.abs(rawQuotient);
    var step = magnitude < 10 ? 1 : magnitude < 20 ? 5 : magnitude < 100 ? 10 : Math.pow(10, Math.max(1, String(Math.floor(magnitude)).length - 1));
    var friendlyQuotient = roundNearest(rawQuotient, step);
    var compatibleDividend = roundTo(friendlyQuotient * b, 6);
    return { estimate: friendlyQuotient, left: compatibleDividend, right: b, expression: compatibleDividend + ' ' + symbol + ' ' + b };
  }

  function estimateFor(op, a, b) {
    return estimatePlan(op, a, b).estimate;
  }

  function uniqNums(list) {
    var out = [];
    list.forEach(function (n) {
      if (isFinite(n) && out.every(function (m) { return Math.abs(m - n) > 1e-9; })) out.push(n);
    });
    return out;
  }

  // Every common rounding strategy a student might use: round both numbers to
  // a shared place, front-end (truncate) estimation, round each number to its
  // own leading place, round one factor only, and compatible numbers for
  // division. Strategies that land very far from the exact result are dropped.
  function estimateStrategies(op, a, b) {
    a = Number(a); b = Number(b);
    if (!isFinite(a) || !isFinite(b)) return [];
    var exact = calcExact(op, a, b).answer;
    if (exact == null || !isFinite(exact)) return [];
    var out = [];
    function push(kind, left, right, place) {
      left = roundTo(left, 6); right = roundTo(right, 6);
      var value = op === 'add' ? left + right : op === 'subtract' ? left - right : op === 'multiply' ? left * right : (right ? left / right : NaN);
      value = roundTo(value, 6);
      if (!isFinite(value)) return;
      if (out.some(function (s) { return s.left === left && s.right === right; })) return;
      out.push({ kind: kind, left: left, right: right, place: place || null, value: value });
    }
    var whole = isInt(a) && isInt(b);
    if (op === 'add' || op === 'subtract') {
      var first = whole ? 10 : 1;
      var top = Math.max(leadPlace(Math.min(Math.abs(a), Math.abs(b))), first);
      for (var p = first; p <= top; p *= 10) {
        push('nearest', roundNearest(a, p), roundNearest(b, p), p);
        push('front', truncTo(a, p), truncTo(b, p), p);
      }
      if (op === 'add') push('leading', roundNearest(a, leadPlace(a)), roundNearest(b, leadPlace(b)));
    } else if (op === 'multiply') {
      var la = roundNearest(a, leadPlace(a)) || leadPlace(a);
      var lb = roundNearest(b, leadPlace(b)) || leadPlace(b);
      push('leading', la, lb);
      push('one_factor', la, b);
      push('one_factor', a, lb);
      push('front', truncTo(a, leadPlace(a)), truncTo(b, leadPlace(b)));
      if (Math.abs(a) >= 10 && Math.abs(b) >= 10) push('nearest', roundNearest(a, 10), roundNearest(b, 10), 10);
      if (!whole) push('nearest', Math.round(a), Math.round(b), 1);
      // Single-digit factors round to a friendly 5 or 10 (7 x 8 is about 7 x 10).
      var fa = Math.abs(a) < 10 ? (roundNearest(a, 5) || 5) : a;
      var fb = Math.abs(b) < 10 ? (roundNearest(b, 5) || 5) : b;
      if (fa !== a) push('friendly', fa, b);
      if (fb !== b) push('friendly', a, fb);
      if (fa !== a && fb !== b) push('friendly', fa, fb);
    } else if (op === 'divide') {
      if (!b) return [];
      var divisors = uniqNums([b, roundNearest(b, leadPlace(b))]).filter(function (n) { return n > 0; });
      var dividends = uniqNums([roundNearest(a, leadPlace(a)), roundNearest(a, Math.max(1, leadPlace(a) / 10)), a]);
      divisors.forEach(function (dv) { dividends.forEach(function (dd) { push('compatible', dd, dv); }); });
      var q = a / b;
      var step = q < 10 ? 1 : leadPlace(q);
      var low = truncTo(q, step);
      if (low > 0) push('compatible', low * b, b);
      push('compatible', (low + step) * b, b);
    }
    var limit = op === 'add' || op === 'subtract' ? 0.35 : 0.4;
    return out.filter(function (s) {
      if (exact === 0) return s.value === 0;
      return Math.abs(s.value - exact) / Math.abs(exact) <= limit + 1e-9;
    });
  }

  // An estimate is reasonable when it falls inside the span of the sensible
  // rounding strategies (plus a little slack), so 200 for 23 x 14 and 10 for
  // 156 / 12 are both accepted. The 5th argument (an old single benchmark) is
  // accepted for compatibility and ignored.
  function assessEstimate(op, a, b, estimate) {
    a = Number(a); b = Number(b);
    var plan = estimatePlan(op, a, b);
    var strategies = estimateStrategies(op, a, b);
    var exactResult = isFinite(a) && isFinite(b) ? calcExact(op, a, b).answer : null;
    var values = strategies.map(function (s) { return s.value; });
    if (exactResult != null && isFinite(exactResult)) values.push(exactResult);
    var lo = values.length ? Math.min.apply(null, values) : null;
    var hi = values.length ? Math.max.apply(null, values) : null;
    var whole = isInt(a) && isInt(b);
    var slack = exactResult == null ? 0 : Math.max(whole ? 1 : 0.5, Math.abs(exactResult) * 0.05);
    if (!strategies.length && exactResult != null) slack = Math.max(slack, leadPlace(Math.min(Math.abs(a), Math.abs(b))) / 2);
    // What a student may be SHOWN (example, range) never equals the exact
    // answer or the whole quotient, and is never the problem itself.
    var quotient = op === 'divide' && whole && b ? Math.floor(a / b) : null;
    var shown = strategies.filter(function (s) {
      return !(numEq(s.left, a) && numEq(s.right, b)) && !numEq(s.value, exactResult) && !(quotient != null && numEq(s.value, quotient));
    });
    var shownValues = shown.map(function (s) { return s.value; });
    var example = shown.filter(function (s) { return s.kind === 'nearest' || s.kind === 'leading' || s.kind === 'compatible'; })[0] || shown[0] || null;
    var maxDev = 0;
    strategies.forEach(function (s) { maxDev = Math.max(maxDev, Math.abs(s.value - exactResult)); });
    var base = {
      benchmark: plan.estimate, tolerance: slack,
      low: shownValues.length ? roundTo(Math.min.apply(null, shownValues), 4) : null,
      high: shownValues.length ? roundTo(Math.max.apply(null, shownValues), 4) : null,
      strategies: strategies, example: example, exact: exactResult
    };
    if (estimate === '' || estimate === null || typeof estimate === 'undefined') return Object.assign({ status: 'missing', reasonable: false, strategy: null }, base);
    var value = parseNum(estimate);
    if (!isFinite(value) || exactResult == null || !isFinite(exactResult)) return Object.assign({ status: 'invalid', reasonable: false, strategy: null }, base);
    // Reasonable: inside the strategies' span, or at least as close to the
    // exact result as an accepted strategy, or both numbers rounded to the
    // nearest ten or hundred (what the "far" feedback tells students to do).
    var nearestOk = whole && (op === 'add' || op === 'subtract') && [10, 100].some(function (p) {
      if (Math.min(Math.abs(a), Math.abs(b)) < p) return false;
      var ra = roundNearest(a, p), rb = roundNearest(b, p);
      return numEq(value, op === 'add' ? ra + rb : ra - rb);
    });
    var reasonable = (value >= lo - slack - 1e-9 && value <= hi + slack + 1e-9) || Math.abs(value - exactResult) <= maxDev + slack + 1e-9 || nearestOk;
    var match = strategies.filter(function (s) { return Math.abs(s.value - value) < 1e-9 && !(numEq(s.left, a) && numEq(s.right, b)); })[0] || null;
    return Object.assign({ status: reasonable ? 'reasonable' : 'far', reasonable: reasonable, strategy: match, value: value }, base);
  }

  // ---------------------------------------------------------------- named errors
  function noCarrySum(a, b) {
    var A = digitsOf(a), B = digitsOf(b), out = [];
    for (var i = 0; i < Math.max(A.length, B.length); i++) out.push(((A[i] || 0) + (B[i] || 0)) % 10);
    return fromDigits(out);
  }
  function columnConcatSum(a, b) {
    var A = digitsOf(a), B = digitsOf(b), parts = [];
    for (var i = Math.max(A.length, B.length) - 1; i >= 0; i--) parts.push(String((A[i] || 0) + (B[i] || 0)));
    return Number(parts.join(''));
  }
  function smallerFromLarger(a, b) {
    var A = digitsOf(a), B = digitsOf(b), out = [];
    for (var i = 0; i < Math.max(A.length, B.length); i++) out.push(Math.abs((A[i] || 0) - (B[i] || 0)));
    return fromDigits(out);
  }
  // Regroups for a short column but never lowers the place it borrowed from.
  function noDecrement(a, b) {
    var A = digitsOf(a), B = digitsOf(b), out = [];
    for (var i = 0; i < A.length; i++) {
      var top = A[i], bottom = B[i] || 0;
      out.push(top < bottom ? top + 10 - bottom : top - bottom);
    }
    return fromDigits(out);
  }
  // Partial products of the second factor's digits, none shifted.
  function unshiftedProduct(a, b) {
    return digitsOf(b).reduce(function (sum, digit) { return sum + a * digit; }, 0);
  }
  function partialProductList(a, b) {
    var out = [];
    splitPlaceValue(a).forEach(function (x) { splitPlaceValue(b).forEach(function (y) { if (x && y) out.push({ x: x, y: y, value: x * y }); }); });
    return out;
  }
  function isPowerOfTenGap(gap) {
    gap = Math.abs(gap);
    if (gap < 10) return false;
    while (gap % 10 === 0) gap /= 10;
    return gap === 1;
  }

  // The likely misconception behind a wrong answer, or null when no named
  // pattern matches. Kinds map to feedback in errorKindCopy.
  function diagnoseAnswer(op, a, b, given, givenRemainder) {
    a = Number(a); b = Number(b);
    var g = Number(given);
    if (!isFinite(g)) return null;
    var res = calcExact(op, a, b);
    if (res.answer == null) return null;
    var r = givenRemainder === '' || givenRemainder == null ? null : Number(givenRemainder);
    if (op === 'divide' && numEq(g, res.answer) && r != null && r !== res.remainder) {
      return r >= b ? 'remainder_big' : 'remainder_wrong';
    }
    if (numEq(g, res.answer)) return null;
    var whole = isInt(a) && isInt(b);
    if (!whole) {
      if (op === 'add' || op === 'subtract') {
        var da = decimalsOf(a), db = decimalsOf(b);
        if (da !== db) {
          var A = Math.round(a * Math.pow(10, da)), B = Math.round(b * Math.pow(10, db));
          var joined = op === 'add' ? A + B : A - B;
          if (numEq(g, joined / Math.pow(10, da)) || numEq(g, joined / Math.pow(10, db))) return 'decimal_align';
        }
      }
      for (var k = -3; k <= 3; k++) {
        if (k && numEq(roundTo(g, 6), roundTo(res.answer * Math.pow(10, k), 6))) return 'decimal_places';
      }
      if (op !== 'add' && numEq(g, calcExact('add', a, b).answer)) return 'wrong_operation';
      if (op !== 'multiply' && numEq(g, calcExact('multiply', a, b).answer)) return 'wrong_operation';
      return null;
    }
    if (op === 'add') {
      if (g === noCarrySum(a, b) || g === columnConcatSum(a, b)) return 'no_regroup';
      if (g === a - b || g === b - a) return 'wrong_operation';
      if (isPowerOfTenGap(g - res.answer)) return 'regroup_slip';
      if (Math.abs(g - res.answer) === 1 && a <= 20 && b <= 20) return 'count_slip';
    }
    if (op === 'subtract') {
      if (g === smallerFromLarger(a, b)) return 'smaller_from_larger';
      if (g === noDecrement(a, b)) return 'no_decrement';
      if (g === a + b) return 'wrong_operation';
      if (isPowerOfTenGap(g - res.answer)) return 'regroup_slip';
      if (Math.abs(g - res.answer) === 1 && a <= 20) return 'count_slip';
    }
    if (op === 'multiply') {
      if (g === a + b) return 'wrong_operation';
      if (a >= 10 && b >= 10 && (g === unshiftedProduct(a, b) || g === unshiftedProduct(b, a))) return 'misaligned';
      var parts = partialProductList(a, b);
      if (parts.length >= 2 && parts.length <= 12) {
        var total = res.answer;
        for (var mask = 1; mask < (1 << parts.length) - 1; mask++) {
          var missing = 0;
          for (var bit = 0; bit < parts.length; bit++) if (mask & (1 << bit)) missing += parts[bit].value;
          if (g === total - missing) return 'missing_partial';
        }
      }
      if (g === res.answer * 10 || g * 10 === res.answer) return 'misaligned';
      if (a <= 12 && b <= 12 && (Math.abs(g - res.answer) === a || Math.abs(g - res.answer) === b)) return 'one_group_off';
    }
    if (op === 'divide') {
      if (r != null && r >= b && g * b + r === a) return 'remainder_big';
      if (String(res.answer).indexOf('0') >= 0 && g === Number(String(res.answer).replace(/0/g, ''))) return 'missing_zero';
      if (g * b > a) return g === a * b ? 'wrong_operation' : 'quotient_too_big';
      if (g === a - b) return 'wrong_operation';
      if (b <= 10 && res.answer <= 12 && Math.abs(g - res.answer) === 1) return 'one_group_off';
    }
    return null;
  }

  // ---------------------------------------------------------------- generated Error Detective cases
  var ERROR_KINDS_BY_BAND = {
    k2: ['no_regroup', 'smaller_from_larger'],
    g3: ['no_regroup', 'smaller_from_larger', 'no_decrement', 'remainder_big'],
    g4: ['no_regroup', 'missing_partial', 'no_decrement', 'misaligned', 'remainder_big', 'smaller_from_larger'],
    g5: ['missing_partial', 'misaligned', 'remainder_big', 'missing_zero', 'decimal_align', 'no_decrement', 'no_regroup', 'smaller_from_larger']
  };
  var DIAGNOSIS_FAMILIES = {
    add: ['no_regroup', 'decimal_align', 'wrong_operation'],
    subtract: ['smaller_from_larger', 'no_decrement', 'wrong_operation'],
    multiply: ['missing_partial', 'misaligned', 'wrong_operation'],
    divide: ['remainder_big', 'missing_zero', 'wrong_operation']
  };
  var DIAGNOSIS_KINDS = ['no_regroup', 'smaller_from_larger', 'no_decrement', 'remainder_big', 'missing_partial', 'misaligned', 'missing_zero', 'decimal_align', 'wrong_operation'];
  var KIND_OP = { no_regroup: 'add', decimal_align: 'add', smaller_from_larger: 'subtract', no_decrement: 'subtract', missing_partial: 'multiply', misaligned: 'multiply', remainder_big: 'divide', missing_zero: 'divide' };

  function randDigits(rng, n) { return rint(rng, Math.pow(10, n - 1), Math.pow(10, n) - 1); }

  function buildErrorNumbers(kind, band, rng) {
    var n = band === 'k2' ? 2 : band === 'g3' ? 3 : band === 'g4' ? rint(rng, 3, 4) : rint(rng, 3, 5);
    var a, b, A, B, i, cols = [];
    if (kind === 'no_regroup') {
      a = randDigits(rng, n); b = randDigits(rng, n);
      if (String(a + b).length !== Math.max(String(a).length, String(b).length)) return null;
      var concat = n === 2 && rng() < 0.5;
      var wrong = concat ? columnConcatSum(a, b) : noCarrySum(a, b);
      if (wrong === a + b) return null;
      A = digitsOf(a); B = digitsOf(b);
      for (i = 0; i < A.length; i++) cols.push({ place: i, x: A[i], y: B[i] || 0, s: A[i] + (B[i] || 0), w: concat ? A[i] + (B[i] || 0) : (A[i] + (B[i] || 0)) % 10 });
      return { op: 'add', a: a, b: b, wrong: wrong, correct: a + b, cols: cols, variant: concat ? 'concat' : 'drop' };
    }
    if (kind === 'smaller_from_larger' || kind === 'no_decrement') {
      a = randDigits(rng, n); b = randDigits(rng, n);
      if (a <= b) { var swap = a; a = b; b = swap; }
      if (a === b) return null;
      A = digitsOf(a); B = digitsOf(b);
      var shortCol = -1;
      for (i = 0; i < A.length - 1; i++) if (A[i] < (B[i] || 0) && A[i + 1] > (B[i + 1] || 0)) { shortCol = i; break; }
      if (shortCol < 0) return null;
      if (A.indexOf(0) >= 0) return null;
      var wrongSub = kind === 'no_decrement' ? noDecrement(a, b) : smallerFromLarger(a, b);
      if (wrongSub === a - b || (kind === 'no_decrement' && wrongSub === smallerFromLarger(a, b))) return null;
      for (i = 0; i < A.length; i++) {
        var top = A[i], bottom = B[i] || 0;
        var shown = kind === 'no_decrement' && top < bottom ? top + 10 : top;
        cols.push({ place: i, x: shown, y: bottom, w: kind === 'no_decrement' ? shown - bottom : Math.abs(top - bottom) });
      }
      return { op: 'subtract', a: a, b: b, wrong: wrongSub, correct: a - b, cols: cols };
    }
    if (kind === 'remainder_big') {
      b = rint(rng, 3, 9);
      var q = rint(rng, 4, band === 'g3' || band === 'k2' ? 9 : 40);
      var r = rint(rng, 0, b - 1);
      a = b * q + r;
      return { op: 'divide', a: a, b: b, q: q, r: r, wrongQ: q - 1, wrongR: r + b, product: b * (q - 1) };
    }
    if (kind === 'missing_partial') {
      a = band === 'g4' ? nonZeroLastDigit(rng, 12, 98) : nonZeroLastDigit(rng, 102, 989);
      b = nonZeroLastDigit(rng, 12, 98);
      var parts = partialProductList(a, b);
      if (parts.length < 3) return null;
      var omit = rint(rng, 0, parts.length - 1);
      var kept = parts.filter(function (p, idx) { return idx !== omit; });
      var keptSum = kept.reduce(function (s, p) { return s + p.value; }, 0);
      return { op: 'multiply', a: a, b: b, wrong: keptSum, correct: a * b, kept: kept, omitted: parts[omit], parts: parts };
    }
    if (kind === 'misaligned') {
      a = band === 'g5' ? nonZeroLastDigit(rng, 13, 489) : nonZeroLastDigit(rng, 13, 98);
      b = nonZeroLastDigit(rng, 13, 98);
      var ones = b % 10, tensDigit = Math.floor(b / 10);
      return { op: 'multiply', a: a, b: b, ones: ones, tensDigit: tensDigit, p1: a * ones, p2: a * tensDigit, wrong: a * ones + a * tensDigit, correct: a * b };
    }
    if (kind === 'missing_zero') {
      b = rint(rng, 2, 9);
      var qz = rint(rng, 1, 9) * 100 + rint(rng, 1, 9);
      a = b * qz;
      var wrongQz = Number(String(qz).replace(/0/g, ''));
      return { op: 'divide', a: a, b: b, q: qz, wrong: wrongQz, product: b * wrongQz };
    }
    if (kind === 'decimal_align') {
      var A2 = nonZeroLastDigit(rng, 101, 999), B1 = nonZeroLastDigit(rng, 101, 499);
      a = A2 / 100; b = B1 / 10;
      return { op: 'add', a: a, b: b, digitsA: A2, digitsB: B1, digitsSum: A2 + B1, wrong: (A2 + B1) / 100, correct: calcExact('add', a, b).answer };
    }
    return null;
  }

  function genErrorCase(band, index) {
    band = BANDS.indexOf(band) >= 0 ? band : 'g4';
    var kinds = ERROR_KINDS_BY_BAND[band];
    var kind = kinds[index % kinds.length];
    var rng = mulberry32(hashStr('err:' + band + ':' + index));
    var data = null, guard = 0;
    while (!data && guard++ < 200) data = buildErrorNumbers(kind, band, rng);
    if (!data) { kind = 'remainder_big'; data = buildErrorNumbers(kind, band, rng); }
    var family = DIAGNOSIS_FAMILIES[KIND_OP[kind]].filter(function (k) { return k !== kind; });
    var first = family[rint(rng, 0, family.length - 1)];
    var rest = DIAGNOSIS_KINDS.filter(function (k) { return k !== kind && k !== first; });
    var second = rest[rint(rng, 0, rest.length - 1)];
    var order = shuffled([kind, first, second], rng);
    return Object.assign(data, { id: 'ge-' + band + '-' + index, kind: kind, answer: kind, order: order, generated: true, index: index, band: band });
  }

  function parseErrorId(id) {
    var m = /^ge-(k2|g3|g4|g5)-(\d{1,7})$/.exec(String(id || ''));
    return m ? { band: m[1], index: Number(m[2]) } : null;
  }

  function errorSolvedCount(map) {
    map = map || {};
    return Object.keys(map).filter(function (id) { return map[id] && (ERROR_IDS.indexOf(id) >= 0 || !!parseErrorId(id)); }).length;
  }

  // ---------------------------------------------------------------- worked examples (fading)
  function workedExample(op, round, stage) {
    var rng = mulberry32(hashStr('we:' + op + ':' + round + ':' + stage));
    var a, b, at, ao, bt, bo, guard = 0;
    if (op === 'add') {
      do { a = rint(rng, 23, 68); b = rint(rng, 14, 29); guard++; } while ((a % 10) + (b % 10) < 10 && guard < 50);
      at = a - a % 10; bt = b - b % 10; ao = a % 10; bo = b % 10;
      return { op: op, a: a, b: b, answer: a + b, steps: [
        { key: 'add_tens', vals: { x: at, y: bt }, ans: at + bt },
        { key: 'add_ones', vals: { x: ao, y: bo }, ans: ao + bo },
        { key: 'add_total', vals: { x: at + bt, y: ao + bo }, ans: a + b }
      ] };
    }
    if (op === 'subtract') {
      do { a = rint(rng, 41, 95); b = rint(rng, 13, a - 10); guard++; } while (((a % 10) >= (b % 10) || Math.floor(a / 10) <= Math.floor(b / 10)) && guard < 80);
      at = a - a % 10; bt = b - b % 10; ao = a % 10; bo = b % 10;
      return { op: op, a: a, b: b, answer: a - b, steps: [
        { key: 'sub_regroup', vals: { a: a, x: at - 10 }, ans: ao + 10 },
        { key: 'sub_ones', vals: { x: ao + 10, y: bo }, ans: ao + 10 - bo },
        { key: 'sub_tens', vals: { x: at - 10, y: bt }, ans: at - 10 - bt },
        { key: 'sub_total', vals: { x: at - 10 - bt, y: ao + 10 - bo }, ans: a - b }
      ] };
    }
    if (op === 'multiply') {
      a = nonZeroLastDigit(rng, 13, 48); b = rint(rng, 3, 9);
      at = a - a % 10; ao = a % 10;
      return { op: op, a: a, b: b, answer: a * b, steps: [
        { key: 'mul_tens', vals: { x: at, y: b }, ans: at * b },
        { key: 'mul_ones', vals: { x: ao, y: b }, ans: ao * b },
        { key: 'mul_total', vals: { x: at * b, y: ao * b }, ans: a * b }
      ] };
    }
    b = rint(rng, 3, 8);
    var q = rint(rng, 12, 29), r = rint(rng, 0, b - 1);
    a = b * q + r;
    var q2 = q - 10;
    return { op: 'divide', a: a, b: b, answer: q, remainder: r, steps: [
      { key: 'div_ten', vals: { b: b }, ans: 10 * b },
      { key: 'div_sub1', vals: { a: a, x: 10 * b }, ans: a - 10 * b },
      { key: 'div_more', vals: { b: b, y: q2 }, ans: b * q2 },
      { key: 'div_sub2', vals: { x: a - 10 * b, z: b * q2 }, ans: r },
      { key: 'div_total', vals: { y: q2 }, ans: q }
    ] };
  }

  function blankCount(stage, stepCount) {
    if (stage <= 0) return 0;
    if (stage === 1) return 1;
    if (stage === 2) return Math.min(2, stepCount);
    return stepCount;
  }

  // ---------------------------------------------------------------- standard-algorithm bridges
  function columnAddition(a, b) {
    var A = digitsOf(a), B = digitsOf(b), n = Math.max(A.length, B.length), carries = [0], colSums = [], carry = 0;
    for (var i = 0; i < n; i++) {
      var s = (A[i] || 0) + (B[i] || 0) + carry;
      colSums.push(s);
      carry = s >= 10 ? 1 : 0;
      carries.push(carry);
    }
    // carries[i] is the 1 carried INTO place i; colSums[i] includes any carry in.
    return { carries: carries, colSums: colSums, sum: a + b, columns: n, carryPlaces: carries.map(function (c, idx) { return c ? idx : -1; }).filter(function (idx) { return idx > 0; }) };
  }

  function columnSubtraction(a, b) {
    var top = digitsOf(a), B = digitsOf(b), events = [];
    for (var i = 0; i < top.length; i++) {
      if (top[i] < (B[i] || 0)) {
        var j = i + 1;
        while (j < top.length && top[j] === 0) j++;
        if (j >= top.length) break;
        for (var k = j; k > i; k--) { top[k] -= 1; top[k - 1] += 10; events.push({ from: k, to: k - 1 }); }
      }
    }
    return { top: top, events: events, difference: a - b };
  }

  function longDivisionSteps(a, b) {
    if (!b) return [];
    var digits = String(Math.round(Math.abs(a))).split('').map(Number), cur = 0, started = false, out = [];
    digits.forEach(function (digit) {
      cur = cur * 10 + digit;
      var qd = Math.floor(cur / b);
      if (!started && qd === 0) return;
      started = true;
      out.push({ cur: cur, qd: qd, prod: qd * b, rem: cur - qd * b });
      cur = cur - qd * b;
    });
    if (!out.length) out.push({ cur: a, qd: 0, prod: 0, rem: a });
    return out;
  }

  function multiplyRows(a, b) {
    return digitsOf(b).map(function (digit, i) { return { digit: digit, place: Math.pow(10, i), part: digit * Math.pow(10, i), value: a * digit * Math.pow(10, i) }; }).filter(function (row) { return row.digit > 0; });
  }

  // Pure place-value walkthrough, extracted from renderModel so the SEQUENCE of
  // exchanges can be tested. Subtraction settles one place at a time, right to
  // left: exchange only when this place is short, then remove this place's
  // digit before moving left. `labels` are structural, not display copy.
  function placeValueStages(op, left, right, places) {
    places = places || Math.max(2, String(Math.max(op === 'add' ? left + right : left, 1)).length);
    var counts = [], i;
    for (i = 0; i < places; i++) {
      counts.push(Math.floor(left / Math.pow(10, i)) % 10 + (op === 'add' ? Math.floor(right / Math.pow(10, i)) % 10 : 0));
    }
    var stages = [{ counts: counts.slice(), kind: 'start', place: null, donor: null }];
    function push(kind, place, donor, removed) { stages.push({ counts: counts.slice(), kind: kind, place: place, donor: donor == null ? null : donor, removed: removed || 0 }); }
    if (op === 'add') {
      for (var p = 0; p < places - 1; p++) {
        if (counts[p] >= 10) { counts[p] -= 10; counts[p + 1]++; push('exchange', p, p + 1); }
      }
    }
    if (op === 'subtract') {
      for (var sp = 0; sp < places; sp++) {
        var need = Math.floor(right / Math.pow(10, sp)) % 10;
        if (counts[sp] < need) {
          var donor = sp + 1;
          while (donor < places && counts[donor] === 0) donor++;
          if (donor < places) {
            for (var k = donor; k > sp; k--) { counts[k]--; counts[k - 1] += 10; push('exchange', k - 1, k); }
          }
        }
        if (need) { counts[sp] -= need; push('remove', sp, null, need); }
      }
      push('summary', null, null);
    }
    return { places: places, stages: stages, total: counts.reduce(function (sum, n, idx) { return sum + n * Math.pow(10, idx); }, 0) };
  }

  // ---------------------------------------------------------------- mental math (number talks)
  // Each strategy is checked against the numbers: does it apply, how well
  // does it fit (score 0-3), why, the steps, and the model to draw.
  var MENTAL_IDS = ['makeTen', 'nearDoubles', 'compensation', 'constantDifference', 'breakApart', 'halveDouble'];
  var MENTAL_OPS = { makeTen: ['add'], nearDoubles: ['add'], compensation: ['add'], constantDifference: ['subtract'], breakApart: ['add', 'subtract', 'multiply'], halveDouble: ['multiply'] };
  // Too alike to call one of them "the efficient one" over the other.
  var MENTAL_TWINS = { makeTen: ['compensation'], compensation: ['makeTen'] };
  var MENTAL_EXAMPLES = { makeTen: ['add', 38, 5], nearDoubles: ['add', 25, 26], compensation: ['add', 49, 26], constantDifference: ['subtract', 73, 28], breakApart: ['add', 46, 32], halveDouble: ['multiply', 16, 25] };
  var BREAK_EXAMPLES = { add: [46, 32], subtract: [85, 32], multiply: [6, 34] };
  var MENTAL_KEYS_BY_BAND = {
    k2: ['makeTen', 'nearDoubles', 'compensation', 'constantDifference', 'breakApart'],
    g3: ['makeTen', 'nearDoubles', 'compensation', 'constantDifference', 'halveDouble', 'breakApart'],
    g4: ['compensation', 'constantDifference', 'halveDouble', 'nearDoubles', 'makeTen', 'breakApart'],
    g5: ['compensation', 'constantDifference', 'halveDouble', 'nearDoubles', 'makeTen', 'breakApart']
  };

  function nonzeroParts(n) { return splitPlaceValue(n).filter(function (p) { return p > 0; }); }

  // Smallest step up (1-3) to a hundred (from 100 up) or to the next ten.
  function landmarkUp(x) {
    if (x >= 100) { var g100 = (100 - x % 100) % 100; if (g100 >= 1 && g100 <= 3) return { k: g100, L: x + g100 }; }
    var g10 = (10 - x % 10) % 10;
    return g10 ? { k: g10, L: x + g10 } : null;
  }

  function jumpsFrom(start, parts, sign) {
    var at = start;
    return parts.map(function (p) { var from = at; at += sign * p; return { from: from, delta: sign * p, to: at }; });
  }

  function mentalFit(id, op, a, b) {
    a = Math.round(Number(a)); b = Math.round(Number(b));
    var r = calculate(op, a, b).answer;
    var base = { id: id, op: op, a: a, b: b, answer: r };
    function no(reason, vals) { return Object.assign(base, { applies: false, score: 0, reason: reason, vals: vals || {} }); }
    function yes(score, reason, vals, steps, model) { return Object.assign(base, { applies: true, score: score, reason: reason, vals: vals, steps: steps }, model || {}); }
    if (!MENTAL_OPS[id] || MENTAL_OPS[id].indexOf(op) < 0) return no('op_mismatch', { strategy: id, op: op });
    if (!isFinite(a) || !isFinite(b) || a < 0 || b < 0 || r == null || (op === 'subtract' && a < b)) return no('none', {});
    if (id === 'makeTen') {
      var best = null;
      [[a, b], [b, a]].forEach(function (p) {
        var x = p[0], y = p[1], gap = (10 - x % 10) % 10;
        if (!gap || gap > 4 || y <= gap) return;
        var rank = (y < 10 ? 10 : 0) - gap;
        if (!best || rank > best.rank) best = { x: x, y: y, gap: gap, ten: x + gap, rest: y - gap, rank: rank };
      });
      if (!best) return no('mt_none', { a: a, b: b });
      var mv = { x: best.x, y: best.y, gap: best.gap, ten: best.ten, rest: best.rest, r: r };
      return yes(best.y < 10 ? (best.gap <= 2 ? 3 : 2) : 1, best.y < 10 ? (best.gap <= 2 ? 'mt_good' : 'mt_mid') : 'mt_big', mv,
        [{ key: 'ms_mt_1', vals: mv }, { key: 'ms_mt_2', vals: mv }, { key: 'ms_mt_3', vals: mv, final: true }],
        { line: { start: best.x, jumps: [{ from: best.x, delta: best.gap, to: best.ten }, { from: best.ten, delta: best.rest, to: r }] } });
    }
    if (id === 'nearDoubles') {
      var s = Math.min(a, b), l = Math.max(a, b), diff = l - s;
      if (s < 1 || diff > 2) return no('nd_far', { a: a, b: b });
      var nv = { s: s, l: l, diff: diff, d: 2 * s, r: r };
      return yes(3, diff ? 'nd_good' : 'nd_double', nv,
        diff ? [{ key: 'ms_nd_1', vals: nv }, { key: 'ms_nd_2', vals: nv, final: true }] : [{ key: 'ms_nd_double', vals: nv, final: true }],
        { line: { start: s, jumps: [{ from: s, delta: s, to: 2 * s }].concat(diff ? [{ from: 2 * s, delta: diff, to: r }] : []) } });
    }
    if (id === 'compensation') {
      if (a < 10 || b < 10) return no('cp_small', {});
      var cbest = null;
      [[a, b], [b, a]].forEach(function (p) {
        var x = p[0], y = p[1], lm = landmarkUp(x);
        if (!lm || lm.k > 3 || y - lm.k < 1) return;
        if (!cbest || lm.k < cbest.k) cbest = { x: x, y: y, k: lm.k, L: lm.L, y2: y - lm.k };
      });
      if (!cbest) return a % 10 === 0 || b % 10 === 0 ? no('cp_ten', { n: a % 10 === 0 ? a : b }) : no('cp_far', { a: a, b: b });
      var cv = Object.assign({ r: r }, cbest);
      return yes(cbest.k <= 2 ? 3 : 2, cbest.k <= 2 ? 'cp_good' : 'cp_mid', cv,
        [{ key: 'ms_cp_1', vals: cv }, { key: 'ms_cp_2', vals: cv }, { key: 'ms_cp_3', vals: cv, final: true }],
        { line: { start: cbest.L, jumps: jumpsFrom(cbest.L, nonzeroParts(cbest.y2), 1) }, shift: { kind: 'give', x: cbest.x, y: cbest.y, k: cbest.k, x2: cbest.L, y2: cbest.y2 } });
    }
    if (id === 'constantDifference') {
      if (b % 10 === 0) return no('cd_ten', { b: b });
      var up = landmarkUp(b), k, a2, b2, dir;
      if (up && up.k <= 3) { k = up.k; a2 = a + k; b2 = up.L; dir = 'up'; }
      else if (b > 10 && b % 10 <= 2) { k = b % 10; a2 = a - k; b2 = b - k; dir = 'down'; }
      else return no('cd_far', { b: b });
      var dv = { a: a, b: b, k: k, a2: a2, b2: b2, r: r };
      return yes(dir === 'up' && k <= 2 ? 3 : 2, dir === 'up' ? 'cd_good' : 'cd_down', dv,
        [{ key: dir === 'up' ? 'ms_cd_up_1' : 'ms_cd_down_1', vals: dv }, { key: 'ms_cd_2', vals: dv }, { key: 'ms_cd_3', vals: dv, final: true }],
        { shift: { kind: 'same', a: a, b: b, a2: a2, b2: b2, k: k, dir: dir }, line: { start: a2, jumps: [{ from: a2, delta: -b2, to: r }] } });
    }
    if (id === 'breakApart') {
      if (op === 'multiply') {
        var cands = [[a, b], [b, a]].filter(function (p) { return nonzeroParts(p[0]).length >= 2; });
        if (!cands.length) return no(Math.max(a, b) < 10 ? 'ba_small' : 'ba_one', { n: Math.max(a, b) });
        var pick = cands.filter(function (p) { return p[1] < 10; })[0] || cands[0];
        var mx = pick[0], my = pick[1], mparts = nonzeroParts(mx), at = 0;
        var mjumps = mparts.map(function (p) { var from = at; at += p * my; return { from: from, delta: p * my, to: at }; });
        var bmv = { n: mx, x: mx, y: my, parts: mparts.join(' + '), list: mparts.map(function (p) { return p * my; }).join(' + '), r: r };
        return yes(my < 10 ? 2 : 1, my < 10 ? 'ba_mul_good' : 'ba_mul', bmv,
          [{ key: 'ms_ba_split', vals: bmv }].concat(mparts.map(function (p) { return { key: 'ms_ba_mul_part', vals: { p: p, y: my, v: p * my } }; }), [{ key: 'ms_ba_mul_total', vals: bmv, final: true }]),
          { line: { start: 0, jumps: mjumps } });
      }
      if (a < 10 || b < 10) return no('ba_small', { n: Math.min(a, b) });
      var bparts = nonzeroParts(b);
      if (bparts.length < 2) return no('ba_one', { n: b });
      var sign = op === 'add' ? 1 : -1;
      var easy = op === 'add' ? (a % 10) + (b % 10) < 10 : a % 10 >= b % 10;
      var bjumps = jumpsFrom(a, bparts, sign);
      var bav = { n: b, a: a, b: b, parts: bparts.join(' + '), r: r };
      return yes(easy ? 2 : 1, op === 'add' ? (easy ? 'ba_add_good' : 'ba_add') : (easy ? 'ba_sub_good' : 'ba_sub'), bav,
        [{ key: 'ms_ba_split', vals: bav }].concat(bjumps.map(function (j, i) { return { key: op === 'add' ? 'ms_ba_jump_add' : 'ms_ba_jump_sub', vals: { from: j.from, p: Math.abs(j.delta), to: j.to }, final: i === bjumps.length - 1 }; })),
        { line: { start: a, jumps: bjumps } });
    }
    // halveDouble
    var chains = [[a, b], [b, a]].map(function (p) {
      var x = p[0], y = p[1];
      if (x < 2 || x % 2 || y % 5 || y % 10 === 0) return null;
      var chain = [{ x: x, y: y }], cx = x, cy = y, guard = 0;
      while (cx % 2 === 0 && cx > 1 && guard++ < 6 && (cy % 10 !== 0 || ((cy * 2) % 100 === 0 && cy % 100 !== 0))) { cx /= 2; cy *= 2; chain.push({ x: cx, y: cy }); }
      return chain;
    }).filter(Boolean);
    if (!chains.length) return no(a % 2 && b % 2 ? 'hd_odd' : 'hd_not_friendly', {});
    var chainUsed = chains[0];
    var last = chainUsed[chainUsed.length - 1];
    var hv = { x: chainUsed[0].x, y: chainUsed[0].y, fx: last.x, fy: last.y, r: r };
    return yes(3, 'hd_good', hv,
      chainUsed.slice(1).map(function (c, i) { return { key: 'ms_hd_step', vals: { x: chainUsed[i].x, y: chainUsed[i].y, x2: c.x, y2: c.y } }; }).concat([{ key: 'ms_hd_total', vals: hv, final: true }]),
      { rects: chainUsed });
  }

  function mentalAll(op, a, b) { return MENTAL_IDS.map(function (id) { return mentalFit(id, op, a, b); }); }

  function bestMental(op, a, b) {
    var fits = mentalAll(op, a, b).filter(function (f) { return f.applies; });
    if (!fits.length) return null;
    var top = Math.max.apply(null, fits.map(function (f) { return f.score; }));
    return fits.filter(function (f) { return f.score === top; })[0];
  }

  // A strategy-specific slip: the answer the strategy gives when one half
  // of it is skipped. Null when the slip does not match.
  function mentalSlip(fit, given) {
    if (!fit || !fit.applies) return null;
    var g = Number(given), r = fit.answer, v = fit.vals;
    if (!isFinite(g) || g === r) return null;
    if (fit.id === 'compensation') return g === r + v.k || g === r - v.k ? 'cp_no_adjust' : null;
    if (fit.id === 'constantDifference') return g === r + v.k || g === r - v.k ? 'cd_one_side' : null;
    if (fit.id === 'halveDouble') return g * 2 === r || g === r * 2 ? 'hd_one_side' : null;
    if (fit.id === 'makeTen') return g === v.ten ? 'mt_rest' : null;
    if (fit.id === 'nearDoubles') return v.diff && (g === v.d || g === 2 * v.l) ? 'nd_adjust' : null;
    return null;
  }

  function mentalNumbers(key, op, band, rng) {
    var big = band === 'g4' || band === 'g5', small = band === 'k2' || band === 'g3';
    var x, y, guard = 0;
    function either(p, q) { return rng() < 0.5 ? [p, q] : [q, p]; }
    if (key === 'makeTen') {
      x = band === 'k2' ? (rng() < 0.5 ? rint(rng, 8, 9) : rint(rng, 1, 7) * 10 + rint(rng, 8, 9)) : rint(rng, 1, big ? 89 : 29) * 10 + rint(rng, 8, 9);
      return either(x, rint(rng, 10 - x % 10 + 1, 9));
    }
    if (key === 'nearDoubles') {
      x = band === 'k2' ? rint(rng, 3, 9) : band === 'g3' ? rint(rng, 11, 49) : rint(rng, 15, 249);
      return either(x, x + (band === 'k2' ? 1 : rint(rng, 1, 2)));
    }
    if (key === 'compensation') {
      if (band === 'k2') { x = rint(rng, 1, 6) * 10 + rint(rng, 8, 9); y = rint(rng, 11, 99 - x); }
      else if (band === 'g3') { x = rng() < 0.5 ? rint(rng, 2, 8) * 10 + rint(rng, 8, 9) : rint(rng, 1, 6) * 100 + rint(rng, 98, 99); y = rint(rng, 21, x < 100 ? 89 : 399); }
      else { x = rng() < 0.6 ? rint(rng, 1, 8) * 100 + rint(rng, 97, 99) : rint(rng, 2, 9) * 10 + rint(rng, 8, 9); y = rint(rng, 25, 899); }
      return either(x, y);
    }
    if (key === 'constantDifference') {
      if (band === 'k2') { y = rint(rng, 1, 5) * 10 + rint(rng, 8, 9); x = rint(rng, y + 12, 99); }
      else if (band === 'g3') { y = rng() < 0.5 ? rint(rng, 1, 7) * 10 + rint(rng, 8, 9) : rint(rng, 1, 5) * 100 + rint(rng, 98, 99); x = rint(rng, y + 15, y < 100 ? 99 : 999); }
      else { y = rng() < 0.6 ? rint(rng, 1, 7) * 100 + rint(rng, 97, 99) : rint(rng, 2, 8) * 10 + rint(rng, 8, 9); x = rint(rng, y + 25, band === 'g5' ? 4999 : 999); }
      return [x, y];
    }
    if (key === 'breakApart') {
      if (op === 'multiply') return either(rint(rng, 2, 9), nonZeroLastDigit(rng, 12, small ? 29 : 299));
      var hundreds = big ? 100 : 0;
      if (op === 'add') {
        var ao = rint(rng, 0, 7), bo = rint(rng, 1, 9 - ao), at = rint(rng, 1, 5), bt = rint(rng, 1, 9 - at);
        return [at * 10 + ao + hundreds * rint(rng, 1, 4), bt * 10 + bo + hundreds * rint(rng, 1, 4)];
      }
      var so = rint(rng, 1, 8), to = rint(rng, so, 9), st = rint(rng, 1, 7), tt = rint(rng, st + 1, 9);
      return [tt * 10 + to + hundreds * rint(rng, 5, 9), st * 10 + so + hundreds * rint(rng, 1, 4)];
    }
    var evens = small ? [4, 6, 8, 12, 14, 16, 18] : [12, 14, 16, 18, 22, 24, 28, 32, 36, 44, 48];
    var fives = small ? [5, 15, 25] : [5, 15, 25, 35, 45, 55, 75];
    do { x = evens[rint(rng, 0, evens.length - 1)]; y = fives[rint(rng, 0, fives.length - 1)]; } while (small && x * y > 100 && guard++ < 60);
    if (small && x * y > 100) { x = 4; y = 25; }
    return either(x, y);
  }

  // 'nt' = number talk (any strategy; the key one fits best), 'ef' = which
  // strategy is efficient (the key scores 3, the two other choices score at
  // most 1, so the reasoning is clear-cut). Deterministic per band and index.
  function genMentalItem(kind, band, index) {
    kind = kind === 'ef' ? 'ef' : 'nt';
    band = BANDS.indexOf(band) >= 0 ? band : 'g4';
    index = clampInt(index, 0, 9999999, 0);
    var keys = MENTAL_KEYS_BY_BAND[band].filter(function (id) { return kind === 'nt' || id !== 'breakApart'; });
    var key = keys[index % keys.length];
    var rng = mulberry32(hashStr('mm:' + kind + ':' + band + ':' + index));
    var ops = MENTAL_OPS[key];
    var op = ops[ops.length > 1 ? rint(rng, 0, ops.length - 1) : 0];
    var pair = null, fits = null, distractors = null;
    for (var guard = 0; guard < 300 && !pair; guard++) {
      var nums = mentalNumbers(key, op, band, rng);
      var all = mentalAll(op, nums[0], nums[1]);
      var mine = all[MENTAL_IDS.indexOf(key)];
      var top = Math.max.apply(null, all.map(function (f) { return f.score; }));
      if (!mine.applies || mine.score !== top) continue;
      if (kind === 'nt') { pair = nums; fits = all; break; }
      var twins = MENTAL_TWINS[key] || [];
      if (mine.score !== 3 || all.some(function (f) { return f.id !== key && f.score === 3 && twins.indexOf(f.id) < 0; })) continue;
      var pool = all.filter(function (f) { return f.id !== key && f.score <= 1 && twins.indexOf(f.id) < 0; });
      if (pool.length < 2) continue;
      var same = shuffled(pool.filter(function (f) { return MENTAL_OPS[f.id].indexOf(op) >= 0; }), rng);
      var other = shuffled(pool.filter(function (f) { return MENTAL_OPS[f.id].indexOf(op) < 0; }), rng);
      distractors = same.slice(0, 1).concat(other.slice(0, 1), same.slice(1), other.slice(1)).slice(0, 2);
      pair = nums; fits = all;
    }
    if (!pair) {
      var ex = key === 'breakApart' ? [op].concat(BREAK_EXAMPLES[op]) : MENTAL_EXAMPLES[key];
      op = ex[0]; pair = [ex[1], ex[2]]; fits = mentalAll(op, pair[0], pair[1]);
      distractors = fits.filter(function (f) { return f.id !== key && f.score <= 1 && (MENTAL_TWINS[key] || []).indexOf(f.id) < 0; }).slice(0, 2);
    }
    var item = { id: kind + '-' + band + '-' + index, kind: kind, band: band, index: index, key: key, op: op, a: pair[0], b: pair[1], answer: calculate(op, pair[0], pair[1]).answer, fits: fits };
    if (kind === 'ef') item.order = shuffled([key].concat(distractors.map(function (f) { return f.id; })), rng);
    return item;
  }

  function parseMentalId(id) {
    var m = /^(nt|ef)-(k2|g3|g4|g5)-(\d{1,7})$/.exec(String(id || ''));
    return m ? { kind: m[1], band: m[2], index: Number(m[3]) } : null;
  }

  // First index at or after `from` whose operations the teacher allows and
  // that `skip` (optional) does not rule out; -1 when none is near.
  function nextAllowedIndex(gen, from, allowedOps, skip) {
    for (var i = Math.max(0, from), n = 0; n < 400; i++, n++) {
      var item = gen(i);
      var ops = item.ops || [item.op];
      if (!ops.every(function (op) { return allowedOps.indexOf(op) >= 0; })) continue;
      if (skip && skip(item)) continue;
      return i;
    }
    return -1;
  }

  // ---------------------------------------------------------------- bar models (tape diagrams)
  var BAR_SLOTS = { partWhole: ['partA', 'partB', 'whole'], compare: ['larger', 'smaller', 'difference'], equalGroups: ['groups', 'size', 'total'] };
  var BAR_MODELS = ['partWhole', 'compare', 'equalGroups'];
  var BAR_TYPES_BY_BAND = {
    k2: ['pwWhole', 'cmpDiff', 'pwPart', 'cmpLarger', 'cmpSmaller', 'tsSpend'],
    g3: ['pwPart', 'cmpDiff', 'eqTotal', 'cmpSmaller', 'eqShare', 'tsGroupsPlus', 'pwWhole', 'eqGroups', 'tsSpend', 'cmpLarger', 'tsShareLeft', 'tsCmpTotal'],
    g4: ['cmpDiff', 'eqTimes', 'pwPart', 'eqShare', 'cmpSmaller', 'tsCmpTotal', 'eqGroups', 'tsGroupsPlus', 'pwWhole', 'eqTotal', 'tsShareLeft', 'cmpLarger', 'tsSpend'],
    g5: ['cmpSmaller', 'eqTimes', 'tsShareLeft', 'cmpDiff', 'eqGroups', 'tsCmpTotal', 'pwPart', 'eqShare', 'tsGroupsPlus', 'eqTotal', 'tsSpend', 'cmpLarger', 'pwWhole']
  };
  var BAR_NAMES = ['Ana', 'Leo', 'Maya', 'Sam', 'Kai', 'Zoe', 'Ravi', 'Lena', 'Omar', 'Mei'];

  function barStep(model, values, unknown, op, x, y, keyword) {
    return { model: model, values: values, unknown: unknown, op: op, x: x, y: y, answer: calculate(op, x, y).answer, keyword: !!keyword };
  }
  function pwWholeStep(p, q) { return barStep('partWhole', { partA: p, partB: q, whole: '?' }, 'whole', 'add', p, q); }
  function pwPartStep(w, p) { return barStep('partWhole', { partA: p, partB: '?', whole: w }, 'partB', 'subtract', w, p); }
  function cmpDiffStep(l, s) { return barStep('compare', { larger: l, smaller: s, difference: '?' }, 'difference', 'subtract', l, s, true); }
  function cmpLargerStep(s, dd) { return barStep('compare', { larger: '?', smaller: s, difference: dd }, 'larger', 'add', s, dd); }
  function cmpSmallerStep(l, dd) { return barStep('compare', { larger: l, smaller: '?', difference: dd }, 'smaller', 'subtract', l, dd, true); }
  function eqTotalStep(n, s) { return barStep('equalGroups', { groups: n, size: s, total: '?' }, 'total', 'multiply', n, s); }
  function eqShareStep(total, n) { return barStep('equalGroups', { groups: n, size: '?', total: total }, 'size', 'divide', total, n); }
  function eqGroupsStep(total, s) { return barStep('equalGroups', { groups: '?', size: s, total: total }, 'groups', 'divide', total, s); }

  function genBarProblem(band, index) {
    band = BANDS.indexOf(band) >= 0 ? band : 'g4';
    index = clampInt(index, 0, 9999999, 0);
    var types = BAR_TYPES_BY_BAND[band];
    var type = types[index % types.length];
    var rng = mulberry32(hashStr('bar:' + band + ':' + index));
    var variant = rint(rng, 0, 1);
    var i1 = rint(rng, 0, BAR_NAMES.length - 1), i2 = (i1 + rint(rng, 1, BAR_NAMES.length - 1)) % BAR_NAMES.length;
    var addHi = band === 'k2' ? 99 : band === 'g3' ? 999 : 9999;
    var lo = band === 'k2' ? 11 : band === 'g3' ? 101 : 1001;
    function sizeN() { return band === 'g3' || band === 'k2' ? rint(rng, 2, 9) : rint(rng, 3, 9); }
    function sizeS() { return band === 'g3' || band === 'k2' ? rint(rng, 2, 10) : band === 'g4' ? rint(rng, 12, 99) : rint(rng, 15, 250); }
    var nums = {}, steps = [], p, q, w, l, s, dd, n, sz, e, k;
    switch (type) {
      case 'pwWhole': p = rint(rng, lo, Math.floor(addHi * 0.6)); q = rint(rng, lo, addHi - p); nums = { a: p, b: q }; steps = [pwWholeStep(p, q)]; break;
      case 'pwPart': w = rint(rng, lo * 3, addHi); p = rint(rng, lo, w - lo); nums = { a: w, b: p }; steps = [pwPartStep(w, p)]; break;
      case 'cmpDiff': l = rint(rng, lo * 3, addHi); s = rint(rng, lo, l - 5); nums = { a: s, b: l }; steps = [cmpDiffStep(l, s)]; break;
      case 'cmpLarger': s = rint(rng, lo, Math.floor(addHi * 0.6)); dd = rint(rng, lo, addHi - s); nums = { a: s, b: dd }; steps = [cmpLargerStep(s, dd)]; break;
      case 'cmpSmaller': l = rint(rng, lo * 3, addHi); dd = rint(rng, lo, l - lo); nums = { a: l, b: dd }; steps = [cmpSmallerStep(l, dd)]; break;
      case 'eqTotal': n = sizeN(); sz = sizeS(); nums = { a: n, b: sz }; steps = [eqTotalStep(n, sz)]; break;
      case 'eqTimes': n = rint(rng, 2, band === 'g5' ? 12 : 9); sz = sizeS(); nums = { a: sz, b: n }; steps = [eqTotalStep(n, sz)]; break;
      case 'eqShare': n = sizeN(); q = sizeS(); nums = { a: n * q, b: n }; steps = [eqShareStep(n * q, n)]; break;
      case 'eqGroups': sz = sizeN(); q = sizeS(); nums = { a: sz * q, b: sz }; steps = [eqGroupsStep(sz * q, sz)]; break;
      case 'tsSpend': p = rint(rng, lo, Math.floor(addHi * 0.3)); q = rint(rng, lo, Math.floor(addHi * 0.3)); w = rint(rng, p + q + lo, addHi); nums = { a: w, b: p, c: q }; steps = [pwWholeStep(p, q), pwPartStep(w, p + q)]; break;
      case 'tsGroupsPlus': n = sizeN(); sz = sizeS(); e = rint(rng, 2, band === 'k2' || band === 'g3' ? 19 : 99); nums = { a: n, b: sz, c: e }; steps = [eqTotalStep(n, sz), pwWholeStep(n * sz, e)]; break;
      case 'tsShareLeft': n = sizeN(); q = sizeS(); k = rint(rng, 2, band === 'k2' || band === 'g3' ? 15 : 60); nums = { a: n * q + k, b: k, c: n }; steps = [pwPartStep(n * q + k, k), eqShareStep(n * q, n)]; break;
      default: s = rint(rng, lo, Math.floor(addHi * 0.3)); dd = rint(rng, lo, Math.floor(addHi * 0.3)); nums = { a: s, b: dd }; steps = [cmpLargerStep(s, dd), pwWholeStep(s, s + dd)]; type = 'tsCmpTotal';
    }
    var ops = steps.map(function (st) { return st.op; });
    return {
      id: 'bar-' + band + '-' + index, type: type, variant: variant, band: band, index: index,
      names: { n1: BAR_NAMES[i1], n2: BAR_NAMES[i2] }, nums: nums, steps: steps, twoStep: steps.length > 1,
      op: ops[ops.length - 1], ops: ops, answer: steps[steps.length - 1].answer
    };
  }

  function parseBarId(id) {
    var m = /^bar-(k2|g3|g4|g5)-(\d{1,7})$/.exec(String(id || ''));
    return m ? { band: m[1], index: Number(m[2]) } : null;
  }

  // Is the student's model the story's model? Named reasons when not.
  function checkBarModel(step, built) {
    built = built && typeof built === 'object' ? built : {};
    var vals = built.values && typeof built.values === 'object' ? built.values : {};
    function v(slot) { return vals[slot] == null ? '' : String(vals[slot]); }
    function want(slot) { return String(step.values[slot]); }
    if (built.model !== step.model) {
      if (step.keyword && built.model === 'partWhole' && v('whole') === '?') return { ok: false, kind: 'keyword_more' };
      return { ok: false, kind: 'bar_shape' };
    }
    var slots = BAR_SLOTS[step.model];
    if (slots.some(function (s) { return v(s) === ''; })) return { ok: false, kind: 'bar_incomplete' };
    if (slots.filter(function (s) { return v(s) === '?'; }).length !== 1) return { ok: false, kind: 'bar_unknown_count' };
    var match = slots.every(function (s) { return v(s) === want(s); });
    if (!match && step.model === 'partWhole') match = v('whole') === want('whole') && v('partA') === want('partB') && v('partB') === want('partA');
    if (match) return { ok: true, kind: null };
    if (step.keyword && v('larger') === '?') return { ok: false, kind: 'keyword_more' };
    if (step.model === 'partWhole' && want('whole') !== '?' && (v('partA') === want('whole') || v('partB') === want('whole'))) return { ok: false, kind: 'bar_whole_part' };
    if (step.model === 'compare' && v('larger') === want('smaller') && v('smaller') === want('larger')) return { ok: false, kind: 'bar_compare_swap' };
    if (step.model === 'equalGroups' && v('groups') === want('size') && v('size') === want('groups')) return { ok: false, kind: 'bar_groups_size' };
    var unknownSlot = slots.filter(function (s) { return v(s) === '?'; })[0];
    var partSlot = step.model === 'partWhole' && step.unknown !== 'whole' && unknownSlot !== 'whole';
    if (unknownSlot !== step.unknown && !partSlot) return { ok: false, kind: 'bar_unknown' };
    return { ok: false, kind: 'bar_slots' };
  }

  function checkBarAnswer(step, op, given) {
    var g = parseNum(given);
    if (op !== step.op) return { ok: false, kind: step.keyword && op === 'add' ? 'keyword_more' : 'wrong_operation' };
    if (numEq(g, step.answer)) return { ok: true, kind: null };
    if (step.keyword && numEq(g, step.x + step.y)) return { ok: false, kind: 'keyword_more' };
    return { ok: false, kind: isFinite(g) ? diagnoseAnswer(step.op, step.x, step.y, g) : null };
  }

  // ---------------------------------------------------------------- decimal operations (5.NBT.7)
  function genDecimalItem(mode, band, index) {
    mode = mode === 'mulwhole' ? 'mulwhole' : 'addsub';
    band = BANDS.indexOf(band) >= 0 ? band : 'g5';
    index = clampInt(index, 0, 9999999, 0);
    var rng = mulberry32(hashStr('dec:' + mode + ':' + band + ':' + index));
    var a, b, op, guard = 0, tenthsOnly = band === 'k2' || band === 'g3';
    if (mode === 'mulwhole') {
      op = 'multiply';
      a = rint(rng, 2, band === 'g5' ? 9 : 6);
      b = tenthsOnly ? rint(rng, 2, 9) / 10 : rng() < 0.5 ? nonZeroLastDigit(rng, 11, 99) / 100 : nonZeroLastDigit(rng, 11, 49) / 10;
    } else {
      op = rng() < 0.5 ? 'add' : 'subtract';
      do {
        if (tenthsOnly) { a = nonZeroLastDigit(rng, 11, 89) / 10; b = nonZeroLastDigit(rng, 11, 89) / 10; }
        else if (band === 'g4') { a = nonZeroLastDigit(rng, 101, 899) / 100; b = nonZeroLastDigit(rng, 11, 89) / 10; }
        else if (op === 'subtract' && rng() < 0.2) { a = rint(rng, 3, 12); b = nonZeroLastDigit(rng, 101, a * 100 - 50) / 100; }
        else { a = nonZeroLastDigit(rng, 101, 2999) / 100; b = nonZeroLastDigit(rng, 11, 199) / 10; }
        if (rng() < 0.5 && !(op === 'subtract' && isInt(a))) { var sw = a; a = b; b = sw; }
        if (op === 'subtract' && a < b) { var sw2 = a; a = b; b = sw2; }
        guard++;
      } while (guard < 50 && (a === b || (op === 'subtract' && calcExact('subtract', a, b).answer < 0.5)));
    }
    var res = calcExact(op, a, b);
    return { id: 'dc-' + mode + '-' + band + '-' + index, mode: mode, band: band, index: index, op: op, a: a, b: b, answer: res.answer, dp: Math.max(decimalsOf(a), decimalsOf(b)) };
  }

  // Named decimal errors, then the general diagnosis.
  function diagnoseDecimal(op, a, b, given) {
    var g = Number(given);
    if (given === '' || given == null || !isFinite(g)) return null;
    var res = calcExact(op, a, b);
    function hit(n) { return numEq(roundTo(g, 6), roundTo(n, 6)); }
    if (res.answer == null || hit(res.answer)) return null;
    var da = decimalsOf(a), db = decimalsOf(b), dp = Math.max(da, db), f = Math.pow(10, dp);
    var A = Math.round(a * f), B = Math.round(b * f);
    if (op === 'add' || op === 'subtract') {
      if (da !== db) {
        var rawA = Math.round(a * Math.pow(10, da)), rawB = Math.round(b * Math.pow(10, db));
        var joined = op === 'add' ? rawA + rawB : Math.abs(rawA - rawB);
        if (hit(joined / Math.pow(10, da)) || hit(joined / Math.pow(10, db))) return 'decimal_align';
      }
      if (op === 'add' && hit(noCarrySum(A, B) / f)) return 'no_regroup';
      if (op === 'subtract' && A > B) {
        if (hit(smallerFromLarger(A, B) / f)) return 'smaller_from_larger';
        if (hit(noDecrement(A, B) / f)) return 'no_decrement';
      }
    }
    if (op === 'multiply') {
      var whole = isInt(a) ? a : b, dec = isInt(a) ? b : a;
      if (isInt(whole) && !isInt(dec)) {
        var fracDigits = fmtNum(dec).split('.')[1] || '';
        var fracTimes = whole * Number(fracDigits);
        if (fracDigits && Math.floor(dec) >= 1 && fracTimes >= Math.pow(10, fracDigits.length) && hit(Number(String(whole * Math.floor(dec)) + '.' + String(fracTimes)))) return 'decimal_parts';
      }
    }
    return diagnoseAnswer(op, a, b, g, null);
  }

  // Disk stages for a decimal times a whole number: n groups of each place,
  // then exchange every ten of a place for one of the next place.
  function decimalMulStages(n, scaled, places) {
    var counts = [], i;
    for (i = 0; i < places; i++) counts.push(n * (Math.floor(scaled / Math.pow(10, i)) % 10));
    var stages = [{ counts: counts.slice(), kind: 'start', place: null }];
    for (var p = 0; p < counts.length; p++) {
      if (counts[p] >= 10) {
        var carry = Math.floor(counts[p] / 10);
        counts[p] -= carry * 10;
        if (p + 1 >= counts.length) counts.push(0);
        counts[p + 1] += carry;
        stages.push({ counts: counts.slice(), kind: 'exchange', place: p, carry: carry });
      }
    }
    return { stages: stages, total: counts.reduce(function (sum, c, idx) { return sum + c * Math.pow(10, idx); }, 0) };
  }

  // Disk walkthrough for any decimal item, in scaled units (1 = 10^-dp).
  function decimalStages(item) {
    var dp = Math.max(1, item.dp);
    var f = Math.pow(10, dp);
    if (item.op === 'multiply') {
      var whole = isInt(item.a) ? item.a : item.b, dec = isInt(item.a) ? item.b : item.a;
      var D = Math.round(dec * f);
      var mul = decimalMulStages(whole, D, Math.max(dp + 1, String(D).length));
      return { dp: dp, stages: mul.stages, total: mul.total / f, n: whole, dec: dec };
    }
    var A = Math.round(item.a * f), B = Math.round(item.b * f);
    var places = Math.max(dp + 1, String(item.op === 'add' ? A + B : A).length);
    var walk = placeValueStages(item.op, A, B, places);
    return { dp: dp, stages: walk.stages, total: walk.total / f };
  }

  // ---------------------------------------------------------------- same problem, another id
  // Small generators repeat problems (2 x 3 under many seeds), so points and
  // path ticks go by the numbers, not the id. Null for ids no generator made.
  var CONTENT_CACHE = {}, CONTENT_CACHE_N = 0;
  function contentKeyOf(id) {
    id = String(id || '');
    if (Object.prototype.hasOwnProperty.call(CONTENT_CACHE, id)) return CONTENT_CACHE[id];
    var key = null, p, m;
    if ((p = parseGenId(id))) { var g = generateProblem(p.skill, p.seed); key = 'gen:' + g.skill + ':' + g.a + ':' + g.b; }
    else if ((m = /^dc-(addsub|mulwhole)-(k2|g3|g4|g5)-(\d{1,7})$/.exec(id))) { var dc = genDecimalItem(m[1], m[2], Number(m[3])); key = 'dec:' + dc.op + ':' + dc.a + ':' + dc.b; }
    else if ((p = parseMentalId(id))) { var mi = genMentalItem(p.kind, p.band, p.index); key = mi.kind + ':' + mi.op + ':' + mi.a + ':' + mi.b; }
    else if ((p = parseBarId(id))) { var bp = genBarProblem(p.band, p.index); key = 'bar:' + bp.type + ':' + JSON.stringify(bp.nums); }
    if (CONTENT_CACHE_N > 5000) { CONTENT_CACHE = {}; CONTENT_CACHE_N = 0; }
    CONTENT_CACHE[id] = key; CONTENT_CACHE_N++;
    return key;
  }
  // Was the same problem solved or shown before under a different id?
  function sameContentSeen(id, maps) {
    var key = contentKeyOf(id);
    if (key == null) return false;
    return maps.some(function (m) {
      m = m && typeof m === 'object' && !Array.isArray(m) ? m : {};
      return Object.keys(m).some(function (other) { return other !== id && m[other] === true && contentKeyOf(other) === key; });
    });
  }

  // ---------------------------------------------------------------- learning path ("Start here")
  // An ordered path per grade band. Ticks come only from the saved progress
  // maps (genSolved, ntSolved, barSolved, decSolved, errorSolvedCases), and an
  // item whose answer was shown first does not count.
  var PATH_TARGET = 3;
  var LEARNING_PATHS = {
    k2: [
      { id: 'k2_make_ten', kind: 'talk', focus: 'makeTen', ops: ['add'] },
      { id: 'k2_add20', kind: 'skill', skill: 'add20' },
      { id: 'k2_sub20', kind: 'skill', skill: 'sub20' },
      { id: 'k2_add100', kind: 'skill', skill: 'add100' },
      { id: 'k2_sub100', kind: 'skill', skill: 'sub100' }
    ],
    g3: [
      { id: 'g3_add1000', kind: 'skill', skill: 'add1000' },
      { id: 'g3_sub1000', kind: 'skill', skill: 'sub1000' },
      { id: 'g3_mul100', kind: 'skill', skill: 'mul100' },
      { id: 'g3_multens', kind: 'skill', skill: 'mulTens' },
      { id: 'g3_div100', kind: 'skill', skill: 'div100' }
    ],
    g4: [
      { id: 'g4_addmulti', kind: 'skill', skill: 'addMulti' },
      { id: 'g4_submulti', kind: 'skill', skill: 'subMulti' },
      { id: 'g4_mulmx1', kind: 'skill', skill: 'mulMx1' },
      { id: 'g4_mul2x2', kind: 'skill', skill: 'mul2x2' },
      { id: 'g4_divrem', kind: 'skill', skill: 'divRem' },
      { id: 'g4_bars', kind: 'bars' }
    ],
    g5: [
      { id: 'g5_dec_addsub', kind: 'dec', mode: 'addsub', ops: ['add', 'subtract'], any: true },
      { id: 'g5_dec_mul', kind: 'dec', mode: 'mulwhole', ops: ['multiply'] },
      { id: 'g5_divlong', kind: 'skill', skill: 'divLong' },
      { id: 'g5_divdec', kind: 'skill', skill: 'divDec' }
    ]
  };
  // Tabs in the order a band meets them; Learn always first.
  var TAB_ORDER_BY_BAND = {
    k2: ['learn', 'practice', 'mental', 'bars', 'errors', 'apply', 'decimals'],
    g3: ['learn', 'practice', 'bars', 'mental', 'errors', 'apply', 'decimals'],
    g4: ['learn', 'practice', 'bars', 'errors', 'mental', 'apply', 'decimals'],
    g5: ['learn', 'decimals', 'practice', 'bars', 'errors', 'mental', 'apply']
  };
  function tabOrderFor(band) { return (TAB_ORDER_BY_BAND[band] || TAB_ORDER_BY_BAND.g5).slice(); }

  function plainMap(m) { return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; }
  function mentalKeyFor(kind, band, index) {
    var keys = MENTAL_KEYS_BY_BAND[BANDS.indexOf(band) >= 0 ? band : 'g4'].filter(function (id) { return kind === 'nt' || id !== 'breakApart'; });
    return keys[clampInt(index, 0, 9999999, 0) % keys.length];
  }
  function pathStepOps(step) { return step.kind === 'skill' ? [SKILLS[step.skill].op] : (step.ops || []); }

  // Solved (and not revealed) count for one path step.
  function pathStepCount(step, band, data) {
    data = data || {};
    var ids, shownMap;
    if (step.kind === 'skill') {
      var revealed = plainMap(data.practiceRevealedIds), solved = plainMap(data.genSolved);
      shownMap = revealed;
      ids = Object.keys(solved).filter(function (id) { var p = parseGenId(id); return solved[id] === true && p && p.skill === step.skill && !revealed[id]; });
    } else if (step.kind === 'talk') {
      var nts = plainMap(data.ntSolved), ntr = plainMap(data.ntRevealed);
      shownMap = ntr;
      ids = Object.keys(nts).filter(function (id) { var p = parseMentalId(id); return nts[id] === true && !ntr[id] && p && p.kind === 'nt' && p.band === band && mentalKeyFor('nt', band, p.index) === step.focus; });
    } else if (step.kind === 'bars') {
      var bs = plainMap(data.barSolved), br = plainMap(data.barRevealed);
      shownMap = br;
      ids = Object.keys(bs).filter(function (id) { var p = parseBarId(id); return bs[id] === true && !br[id] && p && p.band === band; });
    } else {
      var ds = plainMap(data.decSolved), dr = plainMap(data.decRevealed), prefix = 'dc-' + step.mode + '-' + band + '-';
      shownMap = dr;
      ids = Object.keys(ds).filter(function (id) { return ds[id] === true && !dr[id] && id.indexOf(prefix) === 0; });
    }
    // One tick per distinct problem, and none for a problem shown under another id.
    var shownKeys = {}, keys = {};
    Object.keys(shownMap).forEach(function (id) { if (shownMap[id] === true) { var k = contentKeyOf(id); if (k != null) shownKeys[k] = true; } });
    ids.forEach(function (id) { var k = contentKeyOf(id) || id; if (!shownKeys[k]) keys[k] = true; });
    return Object.keys(keys).length;
  }

  function pathProgress(band, data, allowedOps) {
    band = BANDS.indexOf(band) >= 0 ? band : 'g5';
    allowedOps = Array.isArray(allowedOps) ? allowedOps : OP_IDS;
    var steps = LEARNING_PATHS[band].map(function (step) {
      var ops = pathStepOps(step);
      var available = step.kind === 'bars' || (step.any ? ops.some(function (op) { return allowedOps.indexOf(op) >= 0; }) : ops.every(function (op) { return allowedOps.indexOf(op) >= 0; }));
      var count = pathStepCount(step, band, data);
      return Object.assign({}, step, { count: Math.min(count, PATH_TARGET), raw: count, target: PATH_TARGET, done: count >= PATH_TARGET, available: available });
    });
    var next = steps.filter(function (s) { return s.available && !s.done; })[0] || null;
    return { band: band, steps: steps, next: next ? next.id : null, doneCount: steps.filter(function (s) { return s.done; }).length };
  }

  // ---------------------------------------------------------------- speech the tool started
  // Render has no hooks, so a tiny child component (mounted by the render
  // path) cancels the tool's own browser speech when the tool unmounts. The
  // page hiding (tab switch, navigation) does the same.
  // `gen` changes on unmount, so a host voice request that fails after the
  // tool closed does not start browser speech on a closed tool.
  var SPEECH = { active: null, guardReact: null, Guard: null, gen: 0 };
  function cancelOwnSpeech() {
    var u = SPEECH.active;
    SPEECH.active = null;
    if (!u) return false;
    try { if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel(); } catch (e) { /* nothing to stop */ }
    return true;
  }
  function speechGuardFor(React) {
    if (!React || typeof React.useEffect !== 'function') return null;
    if (SPEECH.guardReact !== React) {
      SPEECH.guardReact = React;
      SPEECH.Guard = function ArithmeticSpeechGuard() {
        React.useEffect(function () { return function () { SPEECH.gen++; cancelOwnSpeech(); }; }, []);
        return null;
      };
    }
    return SPEECH.Guard;
  }
  try {
    if (typeof document !== 'undefined' && document && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') cancelOwnSpeech(); });
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') window.addEventListener('pagehide', function () { cancelOwnSpeech(); });
  } catch (e) { /* no page events here */ }

  // Quest labels are read outside render, so they use the last render's translator.
  var questT = IDENTITY_T;

  window.ArithmeticStrategyPure = {
    learningPaths: LEARNING_PATHS,
    pathProgress: pathProgress,
    pathStepCount: pathStepCount,
    tabOrderFor: tabOrderFor,
    mentalKeyFor: mentalKeyFor,
    cancelOwnSpeech: cancelOwnSpeech,
    speechState: SPEECH,
    mentalIds: MENTAL_IDS.slice(),
    mentalOps: MENTAL_OPS,
    mentalFit: mentalFit,
    mentalAll: mentalAll,
    bestMental: bestMental,
    mentalSlip: mentalSlip,
    genMentalItem: genMentalItem,
    parseMentalId: parseMentalId,
    nextAllowedIndex: nextAllowedIndex,
    genBarProblem: genBarProblem,
    parseBarId: parseBarId,
    checkBarModel: checkBarModel,
    checkBarAnswer: checkBarAnswer,
    barTypesByBand: BAR_TYPES_BY_BAND,
    genDecimalItem: genDecimalItem,
    diagnoseDecimal: diagnoseDecimal,
    decimalStages: decimalStages,
    decimalMulStages: decimalMulStages,
    calculate: calculate,
    calcExact: calcExact,
    splitPlaceValue: splitPlaceValue,
    placeValueStages: placeValueStages,
    strategySteps: strategySteps,
    estimateFor: estimateFor,
    estimatePlan: estimatePlan,
    estimateStrategies: estimateStrategies,
    assessEstimate: assessEstimate,
    isBasicFact: isBasicFact,
    isExtendedFact: isExtendedFact,
    problemNeedsEstimate: problemNeedsEstimate,
    diagnoseAnswer: diagnoseAnswer,
    bandFromCtx: bandFromCtx,
    skillsFor: skillsFor,
    skills: SKILLS,
    bands: BANDS.slice(),
    generateProblem: generateProblem,
    parseGenId: parseGenId,
    genErrorCase: genErrorCase,
    classicErrorCase: function (index, t) { return classicErrorCase(t || IDENTITY_T, index); },
    workedExample: workedExample,
    blankCount: blankCount,
    columnAddition: columnAddition,
    columnSubtraction: columnSubtraction,
    longDivisionSteps: longDivisionSteps,
    multiplyRows: multiplyRows,
    fmtNum: fmtNum,
    expectedWordResponse: expectedWordResponse,
    missedWordProblemIds: missedWordProblemIds,
    nextWordProblemId: nextWordProblemId,
    wordResultExplanation: wordResultExplanation,
    successfulOperationMap: successfulOperationMap,
    practice: PRACTICE.slice(),
    errors: ERROR_CASES.slice(),
    wordProblems: WORD_PROBLEMS.slice()
  };

  function normalizeTeacher(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var ops = Array.isArray(raw.ops) ? OP_IDS.filter(function (op) { return raw.ops.indexOf(op) >= 0; }) : OP_IDS.slice();
    return {
      ops: ops.length ? ops : OP_IDS.slice(),
      band: BANDS.indexOf(raw.band) >= 0 ? raw.band : null,
      lockBand: !!raw.lockBand && BANDS.indexOf(raw.band) >= 0,
      reveals: raw.reveals !== false,
      estimates: raw.estimates !== false,
      decMode: raw.decMode === 'addsub' || raw.decMode === 'mulwhole' ? raw.decMode : null,
      twoStep: raw.twoStep !== false
    };
  }

  function hasLegacyPractice(data) {
    return data.level != null || data.practiceIndex != null ||
      (typeof data.practiceProblemId === 'string' && PRACTICE_IDS.indexOf(data.practiceProblemId) >= 0) ||
      Object.keys(data.practiceSolved || {}).length > 0 || Object.keys(data.practiceMissed || {}).length > 0;
  }

  var MISS_LOG_MAX = 40;
  function pushMiss(log, entry) {
    var list = Array.isArray(log) ? log.filter(function (item) { return item && !(item.id === entry.id && item.src === entry.src); }) : [];
    list.push(entry);
    return list.slice(-MISS_LOG_MAX);
  }

  function capMap(map, max) {
    var keys = Object.keys(map);
    if (keys.length <= max) return map;
    var out = {};
    keys.slice(keys.length - max).forEach(function (key) { out[key] = map[key]; });
    return out;
  }

  // WCAG 1.4.3 high contrast (generated by gen_hc.cjs)
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-arithmetic-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-arithmetic-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"arithmeticStudio\"] [style]:is([style*=\"background: rgb(245, 243, 255)\"],[style*=\"background-color: rgb(245, 243, 255)\"],[style*=\"background: rgb(220, 252, 231)\"],[style*=\"background-color: rgb(220, 252, 231)\"],[style*=\"background: rgb(254, 243, 199)\"],[style*=\"background-color: rgb(254, 243, 199)\"],[style*=\"background: rgb(226, 232, 240)\"],[style*=\"background-color: rgb(226, 232, 240)\"],[style*=\"background: rgb(219, 234, 254)\"],[style*=\"background-color: rgb(219, 234, 254)\"],[style*=\"background: rgb(254, 226, 226)\"],[style*=\"background-color: rgb(254, 226, 226)\"],[style*=\"background: rgb(237, 233, 254)\"],[style*=\"background-color: rgb(237, 233, 254)\"],[style*=\"background: rgb(209, 250, 229)\"],[style*=\"background-color: rgb(209, 250, 229)\"],[style*=\"background: rgb(221, 214, 254)\"],[style*=\"background-color: rgb(221, 214, 254)\"],[style*=\"background: rgb(241, 245, 249)\"],[style*=\"background-color: rgb(241, 245, 249)\"]):not(:empty):not(svg,canvas,video,iframe,object){background-color:#000!important}.theme-contrast [data-stem-tool-shell=\"arithmeticStudio\"] [style]:is([style^=\"color: rgb(37, 99, 235)\"],[style*=\"; color: rgb(37, 99, 235)\"],[style^=\"color: rgb(220, 38, 38)\"],[style*=\"; color: rgb(220, 38, 38)\"],[style^=\"color: rgb(124, 58, 237)\"],[style*=\"; color: rgb(124, 58, 237)\"],[style^=\"color: rgb(4, 120, 87)\"],[style*=\"; color: rgb(4, 120, 87)\"],[style^=\"color: rgb(0, 0, 0)\"],[style*=\"; color: rgb(0, 0, 0)\"],[style^=\"color: rgb(30, 27, 75)\"],[style*=\"; color: rgb(30, 27, 75)\"],[style^=\"color: rgb(22, 101, 52)\"],[style*=\"; color: rgb(22, 101, 52)\"],[style^=\"color: rgb(146, 64, 14)\"],[style*=\"; color: rgb(146, 64, 14)\"],[style^=\"color: rgb(15, 23, 42)\"],[style*=\"; color: rgb(15, 23, 42)\"],[style^=\"color: rgb(51, 65, 85)\"],[style*=\"; color: rgb(51, 65, 85)\"]){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"arithmeticStudio\"] [style]:not(#hc-k):not(#hc-k):not(#hc-k):is([style^=\"color: rgb(37, 99, 235)\"],[style*=\"; color: rgb(37, 99, 235)\"],[style^=\"color: rgb(220, 38, 38)\"],[style*=\"; color: rgb(220, 38, 38)\"],[style^=\"color: rgb(124, 58, 237)\"],[style*=\"; color: rgb(124, 58, 237)\"],[style^=\"color: rgb(4, 120, 87)\"],[style*=\"; color: rgb(4, 120, 87)\"],[style^=\"color: rgb(0, 0, 0)\"],[style*=\"; color: rgb(0, 0, 0)\"],[style^=\"color: rgb(30, 27, 75)\"],[style*=\"; color: rgb(30, 27, 75)\"],[style^=\"color: rgb(22, 101, 52)\"],[style*=\"; color: rgb(22, 101, 52)\"],[style^=\"color: rgb(146, 64, 14)\"],[style*=\"; color: rgb(146, 64, 14)\"],[style^=\"color: rgb(15, 23, 42)\"],[style*=\"; color: rgb(15, 23, 42)\"],[style^=\"color: rgb(51, 65, 85)\"],[style*=\"; color: rgb(51, 65, 85)\"]):is([style*=\"background: rgb\"],[style*=\"background-color: rgb\"],[style*=\"background: linear\"]):not([style*=\"background: rgba(\"],[style*=\"background-color: rgba(\"]):not(:is([style*=\"background: rgb(245, 243, 255)\"],[style*=\"background-color: rgb(245, 243, 255)\"],[style*=\"background: rgb(220, 252, 231)\"],[style*=\"background-color: rgb(220, 252, 231)\"],[style*=\"background: rgb(254, 243, 199)\"],[style*=\"background-color: rgb(254, 243, 199)\"],[style*=\"background: rgb(226, 232, 240)\"],[style*=\"background-color: rgb(226, 232, 240)\"],[style*=\"background: rgb(219, 234, 254)\"],[style*=\"background-color: rgb(219, 234, 254)\"],[style*=\"background: rgb(254, 226, 226)\"],[style*=\"background-color: rgb(254, 226, 226)\"],[style*=\"background: rgb(237, 233, 254)\"],[style*=\"background-color: rgb(237, 233, 254)\"],[style*=\"background: rgb(209, 250, 229)\"],[style*=\"background-color: rgb(209, 250, 229)\"],[style*=\"background: rgb(221, 214, 254)\"],[style*=\"background-color: rgb(221, 214, 254)\"],[style*=\"background: rgb(241, 245, 249)\"],[style*=\"background-color: rgb(241, 245, 249)\"])):not(button:not(:hover)){color:#000!important}.theme-contrast [data-stem-tool-shell=\"arithmeticStudio\"] a:not([style*=\"background\"]):not([class*=\"bg-\"]:not([class*=\"-50\"],[class*=\"-100\"],[class*=\"bg-white\"])){color:#ffff00!important}";
    // The host paints every contrast-theme button black and the block above keeps black text on a solid fill: black on black. Filled (primary, selected) buttons stay yellow.
    st.textContent += ".theme-contrast [data-stem-tool-shell=\"arithmeticStudio\"] button[style*=\"background: rgb(251, 191, 36)\"]:not(:hover):not(#hc-k):not(#hc-k):not(#hc-k):not(#hc-k){background-color:#fbbf24!important;color:#000!important}.theme-contrast [data-stem-tool-shell=\"arithmeticStudio\"] button[style*=\"background: rgb(251, 191, 36)\"]:not(:hover):not(#hc-k):not(#hc-k):not(#hc-k):not(#hc-k) *{color:#000!important}";
    document.head.appendChild(st);
  })();
  // end WCAG 1.4.3 high contrast
  window.StemLab.registerTool('arithmeticStudio', {
    icon: '➕',
    label: 'Arithmetic Strategy Studio',
    desc: 'Learn addition, subtraction, multiplication, and division through models, strategies, estimation, and mistake analysis.',
    color: 'blue',
    category: 'math',
    questHooks: [
      { id: 'practice_5', get label() { var t = questT; return t('stem.arithmetic.quest_practice5', 'Solve 5 arithmetic challenges'); }, icon: '🎯', check: function (d) { return countSolved(d.practiceSolved, PRACTICE_IDS) + genSolvedCount(d) >= 5; }, progress: function (d) { var t = questT; return fill(t('stem.arithmetic.quest_practice5_progress', '{n}/5 correct'), { n: Math.min(5, countSolved(d.practiceSolved, PRACTICE_IDS) + genSolvedCount(d)) }); } },
      { id: 'all_operations', get label() { var t = questT; return t('stem.arithmetic.quest_all_ops', 'Successfully use all four operations'); }, icon: '🌈', check: function (d) { return successfulOperationCount(d) >= 4; }, progress: function (d) { var t = questT; return fill(t('stem.arithmetic.quest_all_ops_progress', '{n}/4 operations'), { n: successfulOperationCount(d) }); } },
      { id: 'error_detective', get label() { var t = questT; return t('stem.arithmetic.quest_error_detective', 'Explain 3 common mistakes'); }, icon: '🔎', check: function (d) { return errorSolvedCount(d.errorSolvedCases) >= 3; }, progress: function (d) { var t = questT; return fill(t('stem.arithmetic.quest_error_detective_progress', '{n}/3 mistakes'), { n: Math.min(3, errorSolvedCount(d.errorSolvedCases)) }); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var rootData = ctx.toolData || {};
      var d = rootData._arithmeticStudio;
      if (!d || typeof d !== 'object' || Array.isArray(d)) d = {};
      var t = function (key, fallback) {
        try { var translated = typeof ctx.t === 'function' ? ctx.t(key, fallback) : null; return translated == null ? fallback : translated; }
        catch (_) { return fallback; }
      };
      questT = t;
      var isDark = !!ctx.isDark;
      var isContrast = !!ctx.isContrast;
      var bg = isContrast ? '#000000' : (isDark ? '#0f172a' : '#f8fafc');
      var card = isContrast ? '#000000' : (isDark ? '#1e293b' : '#ffffff');
      var text = isContrast ? '#ffffff' : (isDark ? '#f8fafc' : '#0f172a');
      var muted = isContrast ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569');
      var border = isContrast ? '#fbbf24' : (isDark ? '#475569' : '#cbd5e1');
      var isTeacher = ctx.isTeacherMode === true;
      var teacher = normalizeTeacher(d.teacher);
      var allowedOps = teacher.ops;
      var tab = TAB_IDS.indexOf(d.tab) >= 0 ? d.tab : 'learn';
      var operation = allowedOps.indexOf(d.operation) >= 0 ? d.operation : allowedOps[0];
      var opMeta = OPERATIONS[operation];
      var accentText = isContrast ? '#fbbf24' : (isDark ? opMeta.darkText : opMeta.color);
      function themeSoft(meta) { return isContrast ? '#000000' : meta.soft; }
      function themeAccent(meta) { return isContrast ? '#fbbf24' : meta.color; }
      function themeSoftText() { return isContrast ? '#ffffff' : '#0f172a'; }
      function sym(op) { return OPERATIONS[op].symbol; }
      function btnStyle(extra) { return Object.assign({ minHeight: 44 }, extra || {}); }
      var inputStyle = { background: card, color: text, border: '1px solid ' + border, minHeight: 44 };
      var ghostStyle = btnStyle({ background: card, color: text, border: '1px solid ' + border });
      var outlineAccent = btnStyle({ background: card, color: accentText, border: '1px solid ' + themeAccent(opMeta) });
      var retryStyle = btnStyle({ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' });
      function solidAccent(meta) { return btnStyle({ background: themeAccent(meta), color: isContrast ? '#000000' : '#ffffff', border: '2px solid ' + themeAccent(meta) }); }
      function toggleStyle(on, meta) { meta = meta || opMeta; return btnStyle({ background: on ? themeAccent(meta) : card, color: on ? (isContrast ? '#000000' : '#ffffff') : text, border: '1px solid ' + themeAccent(meta) }); }

      // ---- Learn workspace operands. Drafts keep what the student is typing
      // (an empty box, a 0 divisor) without forcing a value into the box.
      var level = clampInt(d.level, 1, 3, 1);
      var a = clampInt(d.a, 0, 99999, 58);
      var bMin = operation === 'divide' ? 1 : 0;
      var bDefault = operation === 'divide' ? 6 : operation === 'subtract' ? Math.min(27, a) : 27;
      var b = clampInt(d.b, bMin, 9999, bDefault);
      var aDraft = typeof d.aDraft === 'string' ? d.aDraft : null;
      var bDraft = typeof d.bDraft === 'string' ? d.bDraft : null;
      var subtractInvalid = operation === 'subtract' && b > a;
      var customResult = calculate(operation, a, b);
      var customEstimate = estimatePlan(operation, a, b);
      var customSteps = strategySteps(operation, a, b, t);
      var showModel = d.showModel !== false;
      var showSteps = !!d.showSteps;
      var learnSig = operation + ':' + a + ':' + b;
      // Learn models hide only their final total ("?") until the prediction is
      // right or the student opens the steps or the exact result.
      var learnTotalOpen = showSteps || d.learnRevealSig === learnSig || (d.learnPredictionSig === learnSig && d.learnPredictionResult === 'correct');

      // ---- Practice: a fixed practice set (legacy, quest-tracked) or endless
      // generated practice scaled to the grade band.
      var practiceSource = d.practiceSource === 'set' || d.practiceSource === 'generated' ? d.practiceSource : (hasLegacyPractice(d) ? 'set' : 'generated');
      var ctxBand = bandFromCtx(ctx.gradeBand, ctx.gradeLevel);
      var band = teacher.lockBand ? teacher.band : (BANDS.indexOf(d.genBand) >= 0 ? d.genBand : (teacher.band || ctxBand));
      // The student's own band (teacher setting or host grade), not the practice
      // band picker, sets the tab order and the "Start here" path.
      var homeBand = teacher.lockBand ? teacher.band : (teacher.band || ctxBand);
      var tabOrder = tabOrderFor(homeBand);
      var candidates = PRACTICE.filter(function (p) { return p.op === operation && p.level === level; });
      var hasPracticeProblemId = typeof d.practiceProblemId === 'string' && d.practiceProblemId !== '';
      var requestedPracticeProblemId = PRACTICE_IDS.indexOf(d.practiceProblemId) >= 0 ? d.practiceProblemId : null;
      var requestedPracticeIndex = requestedPracticeProblemId ? candidates.findIndex(function (p) { return p.id === requestedPracticeProblemId; }) : -1;
      var practiceIndex = requestedPracticeIndex >= 0 ? requestedPracticeIndex : clampInt(d.practiceIndex, 0, Math.max(0, candidates.length - 1), 0);
      var setProblem = decorateSetProblem(candidates[practiceIndex % candidates.length]);
      var legacyCandidates = PRACTICE.filter(function (p) { return p.op === operation && p.level <= level; });
      var legacyPracticeIndex = clampInt(d.practiceIndex, 0, Math.max(0, legacyCandidates.length - 1), 0);
      var legacyPracticeProblem = legacyCandidates[legacyPracticeIndex % legacyCandidates.length];
      var skillList = skillsFor(band, operation);
      var genSkill = skillList.indexOf(d.genSkill) >= 0 ? d.genSkill : skillList[0];
      var genSeed = clampInt(d.genSeed, 1, 999999999, 1);
      var genProblem = generateProblem(genSkill, genSeed);
      var problem = practiceSource === 'set' ? setProblem : genProblem;
      var practiceStateMatches = practiceSource === 'set'
        ? (hasPracticeProblemId ? requestedPracticeProblemId === problem.id : !!(legacyPracticeProblem && legacyPracticeProblem.id === problem.id))
        : (hasPracticeProblemId ? d.practiceProblemId === problem.id : true);
      var solvedMapKey = practiceSource === 'set' ? 'practiceSolved' : 'genSolved';
      var missedMapKey = practiceSource === 'set' ? 'practiceMissed' : 'genMissed';
      var practiceSolvedNow = !!((d[solvedMapKey] || {})[problem.id]);
      var practiceRevealedNow = !!((d.practiceRevealedIds || {})[problem.id]);
      var needsEstimate = teacher.estimates && problemNeedsEstimate(problem);
      var practiceMissedIds = practiceSource === 'set'
        ? candidates.filter(function (item) { return !!((d.practiceMissed || {})[item.id]) && !((d.practiceSolved || {})[item.id]); }).map(function (item) { return item.id; })
        : Object.keys(d.genMissed || {}).filter(function (id) {
          var parsed = parseGenId(id);
          return d.genMissed[id] && parsed && skillList.indexOf(parsed.skill) >= 0 && !((d.genSolved || {})[id]);
        });
      var practiceEstimateInput = practiceStateMatches && d.estimateInput != null ? String(d.estimateInput) : '';
      var practiceAnswerInput = practiceStateMatches && d.answerInput != null ? String(d.answerInput) : '';
      var practiceRemainderInput = practiceStateMatches && d.remainderInput != null ? String(d.remainderInput) : '';
      var practiceFeedback = practiceStateMatches ? d.feedback : null;
      var estimateLocked = practiceStateMatches && !!d.estimateLocked;
      var estimateStatus = practiceStateMatches ? d.estimateStatus : null;
      var estimateTries = practiceStateMatches ? clampInt(d.estimateTries, 0, 99, 0) : 0;
      var practiceTry = practiceStateMatches ? clampInt(d.practiceTry, 0, 99, 0) : 0;
      var practiceErrorKind = practiceStateMatches ? d.practiceErrorKind : null;

      // ---- Error Detective: four classic cases, then generated ones forever.
      var errorIndex = clampInt(d.errorIndex, 0, 9999999, 0);
      var errorBase = errorIndex < CLASSIC_ERRORS.length ? null : genErrorCase(band, errorIndex);
      var errorCase = errorBase ? errorCaseCopy(errorBase) : classicErrorCase(t, errorIndex);
      var errorSolvedNow = !!((d.errorSolvedCases || {})[errorCase.id]);
      var errorRevealedNow = !!((d.errorRevealed || {})[errorCase.id]);
      var errorTries = d.errorTriesFor === errorCase.id ? clampInt(d.errorTries, 0, 99, 0) : 0;
      var errorFeedbackNow = d.errorTriesFor === errorCase.id || !d.errorTriesFor ? d.errorFeedback : null;
      // Ruled-out choices are kept per case (errorRuledOut 'id|choice'), so
      // leaving and coming back cannot turn elimination into credit.
      function ruledOutFor(mapKey, itemId) {
        var m = d[mapKey], out = [];
        if (m && typeof m === 'object' && !Array.isArray(m)) Object.keys(m).forEach(function (k) { if (m[k] === true && k.indexOf(itemId + '|') === 0) out.push(k.slice(itemId.length + 1)); });
        return out;
      }
      var errorWrongNow = (d.errorTriesFor === errorCase.id && Array.isArray(d.errorWrong) ? d.errorWrong : []).concat(ruledOutFor('errorRuledOut', errorCase.id))
        .filter(function (id, i, list) { return id !== errorCase.answer && list.indexOf(id) === i && errorCase.choices.some(function (c) { return c.id === id; }); });
      var errorMissedIndexes = Object.keys(d.errorMissedCases || {}).filter(function (id) {
        return d.errorMissedCases[id] && !((d.errorSolvedCases || {})[id]);
      }).map(function (id) {
        if (ERROR_IDS.indexOf(id) >= 0) return ERROR_IDS.indexOf(id);
        var parsed = parseErrorId(id);
        return parsed && parsed.band === band ? parsed.index : -1;
      }).filter(function (index) { return index >= 0; }).sort(function (x, y) { return x - y; });

      // ---- Word problems.
      var wordProblem = wordProblemFromState(d);
      var wordProblemIndex = WORD_IDS.indexOf(wordProblem.id);
      var wordExpected = expectedWordResponse(wordProblem);
      var wordText = wordCopy(t, wordProblem.id);
      var selectedWordOperation = OPERATIONS[d.wordOperation] ? d.wordOperation : null;
      var wordAnswerInput = d.wordAnswer == null ? '' : String(d.wordAnswer);
      var wordRemainderInput = d.wordRemainder == null ? '' : String(d.wordRemainder);
      var wordMissedIds = missedWordProblemIds(d);
      var wordTry = d.wordTryFor === wordProblem.id ? clampInt(d.wordTry, 0, 99, 0) : 0;
      var wordRevealedNow = !!plainMap(d.wordRevealed)[wordProblem.id];

      // ---- Read-aloud and AI hints (both optional; offline paths always work).
      var hasSpeech = typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';
      var aiCanAsk = typeof ctx.getHint === 'function' && ctx.aiHintsEnabled !== false;
      function mapOf(key) { var m = d[key]; return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; }
      // The same problem solved (or shown) under another id earns nothing: say
      // so on the item (noCreditFor 'scope:id') and in the one announcement.
      function repeatReason(id, solvedMap, revealedMap) {
        if (sameContentSeen(id, [solvedMap])) return 'solved';
        return sameContentSeen(id, [revealedMap]) ? 'shown' : null;
      }
      function repeatNoCreditText(why) {
        return why === 'solved'
          ? t('stem.arithmetic.repeat_no_new_points', 'You solved this same problem before, so it earns no new points.')
          : t('stem.arithmetic.no_credit_after_reveal', 'The answer had been shown earlier, so this one earns no points.');
      }
      function withRepeatNote(message, why) { return why ? message + ' ' + repeatNoCreditText(why) : message; }
      function repeatNoCreditNote(scope, id) {
        var why = d.noCreditFor === scope + ':' + id ? d.noCreditWhy : null;
        if (why !== 'solved' && why !== 'shown') return null;
        return h('p', { key: 'repeat', className: 'font-normal', 'data-repeat-no-credit': why }, repeatNoCreditText(why));
      }

      // ---- Mental math: explorer, number talks, "which strategy is efficient".
      var mmMode = d.mmMode === 'talk' || d.mmMode === 'efficient' ? d.mmMode : 'explore';
      var mentalAllowed = MENTAL_IDS.filter(function (id) { return MENTAL_OPS[id].some(function (op) { return allowedOps.indexOf(op) >= 0; }); });
      var mmStrategy = mentalAllowed.indexOf(d.mmStrategy) >= 0 ? d.mmStrategy : (mentalAllowed[0] || null);
      var mmOpList = mmStrategy ? MENTAL_OPS[mmStrategy].filter(function (op) { return allowedOps.indexOf(op) >= 0; }) : [];
      var mmOp = mmOpList.indexOf(d.mmOp) >= 0 ? d.mmOp : (mmOpList[0] || 'add');
      var mmExample = mmStrategy === 'breakApart' ? BREAK_EXAMPLES[mmOp] || BREAK_EXAMPLES.add : (mmStrategy ? MENTAL_EXAMPLES[mmStrategy].slice(1) : [0, 0]);
      var mmARaw = typeof d.mmA === 'string' || typeof d.mmA === 'number' ? String(d.mmA) : String(mmExample[0]);
      var mmBRaw = typeof d.mmB === 'string' || typeof d.mmB === 'number' ? String(d.mmB) : String(mmExample[1]);
      function wholeOrNaN(raw) { var n = parseNum(raw); return isFinite(n) && isInt(n) && n >= 0 && n <= 9999 ? Math.round(n) : NaN; }
      var mmA = wholeOrNaN(mmARaw), mmB = wholeOrNaN(mmBRaw);
      var mmSig = [mmStrategy, mmOp, mmA, mmB].join(':');

      function ntGen(i) { return genMentalItem('nt', band, i); }
      function efGen(i) { return genMentalItem('ef', band, i); }
      var ntFocus = MENTAL_IDS.indexOf(d.ntFocus) >= 0 && mentalAllowed.indexOf(d.ntFocus) >= 0 ? d.ntFocus : null;
      var ntIndex = mentalAllowed.length ? nextAllowedIndex(ntGen, clampInt(d.ntIndex, 0, 9999999, 0), allowedOps) : -1;
      var ntItem = ntIndex >= 0 ? ntGen(ntIndex) : null;
      var ntOn = !!ntItem && d.ntFor === ntItem.id;
      var ntPick = ntOn && (d.ntPick === 'own' || MENTAL_IDS.indexOf(d.ntPick) >= 0) ? d.ntPick : null;
      var ntAnswer = ntOn && d.ntAnswer != null ? String(d.ntAnswer) : '';
      var ntTry = ntOn ? clampInt(d.ntTry, 0, 99, 0) : 0;
      var ntFeedback = ntOn ? d.ntFeedback : null;
      // K-2 make-ten with a ten frame, from the real make-ten fit (x is near a
      // ten, y fills it). Only when y is a single digit, so every counter fits.
      var ntTenFrame = null;
      if (band === 'k2' && ntItem && ntItem.op === 'add') {
        var tfFit = mentalFit('makeTen', 'add', ntItem.a, ntItem.b);
        if (tfFit.applies && tfFit.vals.y <= 9) ntTenFrame = tfFit.vals;
      }
      var ntTfMoved = ntTenFrame && d.tfFor === ntItem.id ? clampInt(d.tfMoved, 0, ntTenFrame.gap, 0) : 0;
      // K-2: the strategy choice is optional, so the answer box never waits on reading a strategy name.
      var ntPickOptional = band === 'k2';
      var ntSolvedNow = !!ntItem && !!mapOf('ntSolved')[ntItem.id];
      var ntRevealedNow = !!ntItem && !!mapOf('ntRevealed')[ntItem.id];
      var ntMissedIds = Object.keys(mapOf('ntMissed')).filter(function (id) { var p = parseMentalId(id); return mapOf('ntMissed')[id] && p && p.band === band && !mapOf('ntSolved')[id]; });
      var efIndex = mentalAllowed.length ? nextAllowedIndex(efGen, clampInt(d.efIndex, 0, 9999999, 0), allowedOps) : -1;
      var efItem = efIndex >= 0 ? efGen(efIndex) : null;
      var efOn = !!efItem && d.efFor === efItem.id;
      var efChoice = efOn ? d.efChoice : null;
      var efTry = efOn ? clampInt(d.efTry, 0, 99, 0) : 0;
      var efFeedback = efOn ? d.efFeedback : null;
      var efWrongNow = efItem
        ? (efOn && Array.isArray(d.efWrong) ? d.efWrong : []).concat(ruledOutFor('efRuledOut', efItem.id))
          .filter(function (id, i, list) { return id !== efItem.key && list.indexOf(id) === i && (efItem.order || []).indexOf(id) >= 0; })
        : [];
      var efSolvedNow = !!efItem && !!mapOf('efSolved')[efItem.id];
      var efRevealedNow = !!efItem && !!mapOf('efRevealed')[efItem.id];
      var efMissedIds = Object.keys(mapOf('efMissed')).filter(function (id) { var p = parseMentalId(id); return mapOf('efMissed')[id] && p && p.band === band && !mapOf('efSolved')[id]; });

      // ---- Bar models: build the model, then solve; two-step problems in order.
      function barGen(i) { return genBarProblem(band, i); }
      var barIndex = nextAllowedIndex(barGen, clampInt(d.barIndex, 0, 9999999, 0), allowedOps, function (p) { return p.twoStep && !teacher.twoStep; });
      var barProblem = barIndex >= 0 ? barGen(barIndex) : null;
      var barOn = !!barProblem && d.barFor === barProblem.id;
      var barStepIdx = barOn ? clampInt(d.barStep, 0, barProblem.steps.length - 1, 0) : 0;
      var barStepNow = barProblem ? barProblem.steps[barStepIdx] : null;
      var barBuilt = barOn && d.barModel && typeof d.barModel === 'object' && !Array.isArray(d.barModel) ? d.barModel : { model: null, values: {} };
      barBuilt = { model: BAR_MODELS.indexOf(barBuilt.model) >= 0 ? barBuilt.model : null, values: barBuilt.values && typeof barBuilt.values === 'object' && !Array.isArray(barBuilt.values) ? barBuilt.values : {} };
      var barModelLocked = barOn && !!d.barModelLocked;
      var barModelTry = barOn ? clampInt(d.barModelTry, 0, 99, 0) : 0;
      var barModelFeedback = barOn ? d.barModelFeedback : null;
      var barOp = barOn && OPERATIONS[d.barOp] ? d.barOp : null;
      var barAnswer = barOn && d.barAnswer != null ? String(d.barAnswer) : '';
      var barTry = barOn ? clampInt(d.barTry, 0, 99, 0) : 0;
      var barFeedback = barOn ? d.barFeedback : null;
      var barSolvedNow = !!barProblem && !!mapOf('barSolved')[barProblem.id];
      var barRevealedNow = !!barProblem && !!mapOf('barRevealed')[barProblem.id];
      var barMissedIds = Object.keys(mapOf('barMissed')).filter(function (id) { var p = parseBarId(id); return mapOf('barMissed')[id] && p && p.band === band && !mapOf('barSolved')[id]; });

      // ---- Decimals with base-ten disks.
      var decModes = ['addsub', 'mulwhole'].filter(function (m) { return m === 'addsub' ? allowedOps.indexOf('add') >= 0 || allowedOps.indexOf('subtract') >= 0 : allowedOps.indexOf('multiply') >= 0; });
      var decMode = teacher.decMode && decModes.indexOf(teacher.decMode) >= 0 ? teacher.decMode : (decModes.indexOf(d.decMode) >= 0 ? d.decMode : (decModes[0] || null));
      function decGen(i) { return genDecimalItem(decMode, band, i); }
      var decIndex = decMode ? nextAllowedIndex(decGen, clampInt(d.decIndex, 0, 9999999, 0), allowedOps) : -1;
      var decItem = decIndex >= 0 ? decGen(decIndex) : null;
      var decOn = !!decItem && d.decFor === decItem.id;
      var decAnswer = decOn && d.decAnswer != null ? String(d.decAnswer) : '';
      var decTry = decOn ? clampInt(d.decTry, 0, 99, 0) : 0;
      var decFeedback = decOn ? d.decFeedback : null;
      var decKind = decOn ? d.decKind : null;
      var decSolvedNow = !!decItem && !!mapOf('decSolved')[decItem.id];
      var decRevealedNow = !!decItem && !!mapOf('decRevealed')[decItem.id];
      var decMissedIds = Object.keys(mapOf('decMissed')).filter(function (id) { return mapOf('decMissed')[id] && !mapOf('decSolved')[id] && id.indexOf('dc-' + decMode + '-' + band + '-') === 0; });

      function update(patch) {
        if (typeof ctx.setToolData !== 'function') return;
        ctx.setToolData(function (prev) {
          var current = (prev && prev._arithmeticStudio) || {};
          var changes = typeof patch === 'function' ? patch(current) : patch;
          var next = Object.assign({}, current, changes || {});
          return Object.assign({}, prev || {}, { _arithmeticStudio: next });
        });
      }

      function announce(message) {
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(message);
      }

      function openTool(id) {
        try { if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded(id); } catch (e) { /* loader optional */ }
        if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(id);
      }

      // ---------------------------------------------------------- copy helpers
      function errorKindName(kind) {
        switch (kind) {
          case 'no_regroup': return t('stem.arithmetic.kind_no_regroup', 'Did not regroup');
          case 'smaller_from_larger': return t('stem.arithmetic.kind_smaller_from_larger', 'Smaller digit from larger');
          case 'no_decrement': return t('stem.arithmetic.kind_no_decrement', 'Regrouped without lowering the next place');
          case 'regroup_slip': return t('stem.arithmetic.kind_regroup_slip', 'Off by one place value');
          case 'count_slip': return t('stem.arithmetic.kind_count_slip', 'Counting slip');
          case 'missing_partial': return t('stem.arithmetic.kind_missing_partial', 'Missing partial product');
          case 'misaligned': return t('stem.arithmetic.kind_misaligned', 'Place value misaligned');
          case 'one_group_off': return t('stem.arithmetic.kind_one_group_off', 'One group off');
          case 'remainder_big': return t('stem.arithmetic.kind_remainder_big', 'Remainder bigger than the divisor');
          case 'remainder_wrong': return t('stem.arithmetic.kind_remainder_wrong', 'Wrong remainder');
          case 'missing_zero': return t('stem.arithmetic.kind_missing_zero', 'Missing zero in the quotient');
          case 'quotient_too_big': return t('stem.arithmetic.kind_quotient_too_big', 'Quotient too big');
          case 'wrong_operation': return t('stem.arithmetic.kind_wrong_operation', 'Wrong operation');
          case 'decimal_align': return t('stem.arithmetic.kind_decimal_align', 'Decimal points not lined up');
          case 'decimal_places': return t('stem.arithmetic.kind_decimal_places', 'Decimal point misplaced');
          case 'estimate_far': return t('stem.arithmetic.kind_estimate_far', 'Estimate far off');
          case 'word_operation': return t('stem.arithmetic.kind_word_operation', 'Chose the wrong operation for the story');
          case 'word_context': return t('stem.arithmetic.kind_word_context', 'Misread the context');
          case 'diagnosis': return t('stem.arithmetic.kind_diagnosis', 'Misdiagnosed a mistake');
          case 'keyword_more': return t('stem.arithmetic.kind_keyword_more', 'Keyword trap: read “more” as add');
          case 'bar_shape': return t('stem.arithmetic.kind_bar_shape', 'Bar model does not match the story');
          case 'bar_incomplete': return t('stem.arithmetic.kind_bar_incomplete', 'Bar model not finished');
          case 'bar_unknown_count': return t('stem.arithmetic.kind_bar_unknown_count', 'Not exactly one unknown in the model');
          case 'bar_unknown': return t('stem.arithmetic.kind_bar_unknown', 'Unknown in the wrong place');
          case 'bar_whole_part': return t('stem.arithmetic.kind_bar_whole_part', 'Whole placed as a part');
          case 'bar_compare_swap': return t('stem.arithmetic.kind_bar_compare_swap', 'Larger and smaller bars swapped');
          case 'bar_groups_size': return t('stem.arithmetic.kind_bar_groups_size', 'Groups and group size swapped');
          case 'bar_slots': return t('stem.arithmetic.kind_bar_slots', 'Numbers in the wrong places');
          case 'strategy_choice': return t('stem.arithmetic.kind_strategy_choice', 'Chose a less efficient strategy');
          case 'cp_no_adjust': return t('stem.arithmetic.kind_cp_no_adjust', 'Compensation not balanced');
          case 'cd_one_side': return t('stem.arithmetic.kind_cd_one_side', 'Shifted only one number');
          case 'hd_one_side': return t('stem.arithmetic.kind_hd_one_side', 'Halved without doubling');
          case 'mt_rest': return t('stem.arithmetic.kind_mt_rest', 'Stopped at the ten');
          case 'nd_adjust': return t('stem.arithmetic.kind_nd_adjust', 'Double not adjusted');
          case 'decimal_parts': return t('stem.arithmetic.kind_decimal_parts', 'Whole and decimal parts multiplied separately');
          default: return t('stem.arithmetic.kind_unknown', 'No pattern found');
        }
      }

      // Named-error feedback for a wrong practice answer: what probably went
      // wrong, and a strategy for the second try. Never states the answer.
      function errorKindFeedback(kind, p, givenRemainder) {
        var vals = { a: fmtNum(p.a), b: fmtNum(p.b), sym: sym(p.op), r: givenRemainder, q: p.answer };
        switch (kind) {
          case 'no_regroup': return t('stem.arithmetic.fb_no_regroup', 'It looks like a column made 10 or more and the extra ten was not regrouped. Add one column at a time and carry each group of ten into the next place.');
          case 'smaller_from_larger': return t('stem.arithmetic.fb_smaller_from_larger', 'It looks like each column took the smaller digit from the larger one. When the top digit is smaller, regroup 1 from the next place first.');
          case 'no_decrement': return t('stem.arithmetic.fb_no_decrement', 'You regrouped, but the place you took from was not lowered by 1. Cross out that digit and write one less.');
          case 'regroup_slip': return t('stem.arithmetic.fb_regroup_slip', 'Your answer is off by exactly one place value (10, 100, ...). Check each carry or regroup again.');
          case 'count_slip': return t('stem.arithmetic.fb_count_slip', 'You are just 1 away. Count on or count back again carefully, or use a fact you know.');
          case 'missing_partial': return t('stem.arithmetic.fb_missing_partial', 'A partial product seems to be missing. Split both numbers by place value and list every partial product before adding.');
          case 'misaligned': return t('stem.arithmetic.fb_misaligned', 'A partial product seems to be in the wrong place. Multiplying by a tens digit makes tens, so that row moves one place to the left.');
          case 'one_group_off': return fill(t('stem.arithmetic.fb_one_group_off', 'You are one group away. Count the groups again: {a} {sym} {b}.'), vals);
          case 'remainder_big': return fill(t('stem.arithmetic.fb_remainder_big', 'Your remainder ({r}) is not smaller than the divisor ({b}), so one more group still fits. Make one more group.'), vals);
          case 'remainder_wrong': return fill(t('stem.arithmetic.fb_remainder_wrong', 'Your quotient is right. Find what is left: {a} minus {b} times your quotient.'), vals);
          case 'missing_zero': return t('stem.arithmetic.fb_missing_zero', 'A place seems to be missing from the quotient. When the divisor does not fit, write a 0 to hold that place.');
          case 'quotient_too_big': return fill(t('stem.arithmetic.fb_quotient_too_big', 'Multiply back: {b} times your quotient is more than {a}, so the quotient is too big.'), vals);
          case 'wrong_operation': return fill(t('stem.arithmetic.fb_wrong_operation', 'Your answer matches a different operation. Look at the sign again: {sym}.'), vals);
          case 'decimal_align': return t('stem.arithmetic.fb_decimal_align', 'Line up the decimal points first, so tenths go with tenths and hundredths with hundredths.');
          case 'decimal_places': return t('stem.arithmetic.fb_decimal_places', 'The digits look right, but the decimal point is in the wrong place. Use your estimate to decide where it goes.');
          case 'decimal_parts': return t('stem.arithmetic.fb_decimal_parts', 'It looks like the whole part and the decimal part were multiplied separately and written side by side. Ten tenths make a new one, so regroup before you write the answer.');
          case 'keyword_more': return t('stem.arithmetic.fb_keyword_more', 'The word “more” does not always mean add. Look at your bar model: the unknown is part of a bar you already know, not a total, so adding is not the way to find it.');
          case 'cp_no_adjust': return t('stem.arithmetic.fb_cp_no_adjust', 'It looks like one number was changed to a friendly number, but the other number was not changed to balance it. Whatever you add to one number, take away from the other.');
          case 'cd_one_side': return t('stem.arithmetic.fb_cd_one_side', 'It looks like only one number was shifted. For a constant difference, add the same amount to both numbers, or take the same amount from both.');
          case 'hd_one_side': return t('stem.arithmetic.fb_hd_one_side', 'It looks like one factor was halved but the other was not doubled, or the other way round. Halve one and double the other so the product stays the same.');
          case 'mt_rest': return t('stem.arithmetic.fb_mt_rest', 'You made the ten. Now add the rest of the number you split.');
          case 'nd_adjust': return t('stem.arithmetic.fb_nd_adjust', 'Your double is a good start. Now adjust it by the difference between the two numbers.');
          default: return p.fact
            ? t('stem.arithmetic.fb_generic_fact', 'Not yet. Use an array, skip counting or a fact you know, then try again.')
            : t('stem.arithmetic.fb_generic', 'Not yet. Compare your answer with your estimate, then redo one place at a time.');
        }
      }

      function diagnosisLabel(kind) {
        switch (kind) {
          case 'no_regroup': return t('stem.arithmetic.diag_no_regroup', 'A column made 10 or more, and it was not regrouped.');
          case 'smaller_from_larger': return t('stem.arithmetic.diag_smaller_from_larger', 'Each column took the smaller digit from the larger.');
          case 'no_decrement': return t('stem.arithmetic.diag_no_decrement', 'After regrouping, the next place was not lowered.');
          case 'remainder_big': return t('stem.arithmetic.diag_remainder_big', 'The remainder is as big as the divisor, or bigger.');
          case 'missing_partial': return t('stem.arithmetic.diag_missing_partial', 'One partial product was left out of the final sum.');
          case 'misaligned': return t('stem.arithmetic.diag_misaligned', 'A partial product was not shifted to its own place.');
          case 'missing_zero': return t('stem.arithmetic.diag_missing_zero', 'A placeholder zero is missing from the quotient.');
          case 'decimal_align': return t('stem.arithmetic.diag_decimal_align', 'The decimal points were not lined up in columns.');
          default: return t('stem.arithmetic.diag_wrong_operation', 'The numbers were joined with the wrong operation.');
        }
      }

      function errorCaseCopy(c) {
        var vals = { a: fmtNum(c.a), b: fmtNum(c.b), sym: sym(c.op), wrong: fmtNum(c.wrong), answer: fmtNum(c.correct) };
        var prompt, work = [], explain, hint;
        function colLine(col) {
          return fill(c.op === 'add'
            ? t('stem.arithmetic.work_col_add', '{place}: {x} + {y} = {s}, and the learner wrote {w}.')
            : t('stem.arithmetic.work_col_sub', '{place}: the learner worked {x} − {y} and wrote {w}.'), { place: placeName(t, col.place), x: col.x, y: col.y, s: col.s, w: col.w });
        }
        if (c.kind === 'remainder_big') {
          prompt = fill(t('stem.arithmetic.gen_prompt_remainder', 'A learner says {a} ÷ {b} = {q} remainder {r}.'), { a: c.a, b: c.b, q: c.wrongQ, r: c.wrongR });
          work.push(fill(t('stem.arithmetic.work_remainder_big', '{b} × {q} = {p}, and {a} − {p} = {r}.'), { a: c.a, b: c.b, q: c.wrongQ, p: c.product, r: c.wrongR }));
          explain = fill(t('stem.arithmetic.explain_remainder_big', '{a} = {b} × {q} + {r}. A remainder must be less than {b}; {wrongR} still holds another group of {b}, so the answer is {q} remainder {r}.'), { a: c.a, b: c.b, q: c.q, r: c.r, wrongR: c.wrongR });
        } else {
          prompt = fill(t('stem.arithmetic.gen_prompt', 'A learner says {a} {sym} {b} = {wrong}.'), vals);
          if (c.cols) c.cols.slice().reverse().forEach(function (col) { work.push(colLine(col)); });
          if (c.kind === 'missing_partial') {
            work.push(fill(t('stem.arithmetic.work_missing_partial', 'Partial products found: {list}. The learner added them to get {wrong}.'), { list: c.kept.map(function (p) { return p.x + ' × ' + p.y + ' = ' + p.value; }).join('; '), wrong: c.wrong }));
          }
          if (c.kind === 'misaligned') {
            work.push(fill(t('stem.arithmetic.work_misaligned', '{a} × {o} = {p1}; {a} × {t} = {p2}; {p1} + {p2} = {wrong}.'), { a: c.a, o: c.ones, t: c.tensDigit, p1: c.p1, p2: c.p2, wrong: c.wrong }));
          }
          if (c.kind === 'missing_zero') {
            work.push(fill(t('stem.arithmetic.work_missing_zero', 'Check by multiplying: {b} × {wrong} = {p}.'), { b: c.b, wrong: c.wrong, p: c.product }));
          }
          if (c.kind === 'decimal_align') {
            work.push(fill(t('stem.arithmetic.work_decimal_align', 'The learner lined up the last digits: {x} + {y} = {s}, then wrote {wrong}.'), { x: c.digitsA, y: c.digitsB, s: c.digitsSum, wrong: fmtNum(c.wrong) }));
          }
          switch (c.kind) {
            case 'no_regroup': explain = fill(t('stem.arithmetic.explain_no_regroup', '{a} + {b} = {answer}. Each column that makes 10 or more passes 1 ten to the next place, so the answer cannot be {wrong}.'), vals); break;
            case 'smaller_from_larger': explain = fill(t('stem.arithmetic.explain_smaller_from_larger', '{a} − {b} = {answer}. When the top digit is smaller, regroup 1 from the next place instead of turning the subtraction around.'), vals); break;
            case 'no_decrement': explain = fill(t('stem.arithmetic.explain_no_decrement', '{a} − {b} = {answer}. After 1 is taken from a place to regroup, that place has 1 less to subtract from.'), vals); break;
            case 'missing_partial': explain = fill(t('stem.arithmetic.explain_missing_partial', '{a} × {b} = {answer}. Every part of {a} multiplies every part of {b}; the learner left out {x} × {y} = {p}.'), Object.assign({ x: c.omitted.x, y: c.omitted.y, p: c.omitted.value }, vals)); break;
            case 'misaligned': explain = fill(t('stem.arithmetic.explain_misaligned', '{a} × {b} = {answer}. The digit {t} in {b} means {t0}, so that partial product is {a} × {t0} = {p}, not {p2}.'), Object.assign({ t: c.tensDigit, t0: c.tensDigit * 10, p: c.a * c.tensDigit * 10, p2: c.p2 }, vals)); break;
            case 'missing_zero': explain = fill(t('stem.arithmetic.explain_missing_zero', '{a} ÷ {b} = {answer}. The 0 shows that no groups of {b} fit in that place; without it every digit moves to the wrong place.'), vals); break;
            default: explain = fill(t('stem.arithmetic.explain_decimal_align', '{a} + {b} = {answer}. Line up the decimal points so that tenths add to tenths and hundredths add to hundredths.'), vals);
          }
        }
        switch (c.kind) {
          case 'no_regroup': hint = t('stem.arithmetic.err_hint_no_regroup', 'Add one column at a time yourself. What happens when a column makes 10 or more?'); break;
          case 'smaller_from_larger':
          case 'no_decrement': hint = t('stem.arithmetic.err_hint_subtract', 'Subtract one column at a time yourself, and compare each step with the learner’s work.'); break;
          case 'remainder_big': hint = t('stem.arithmetic.err_hint_remainder_big', 'Compare the remainder with the divisor. Could another group fit?'); break;
          case 'missing_partial': hint = t('stem.arithmetic.err_hint_missing_partial', 'Split both numbers by place value. How many partial products should there be?'); break;
          case 'misaligned': hint = t('stem.arithmetic.err_hint_misaligned', 'What is the tens digit of the second factor really worth?'); break;
          case 'missing_zero': hint = t('stem.arithmetic.err_hint_missing_zero', 'Multiply back: does the divisor times the learner’s quotient make the dividend?'); break;
          default: hint = t('stem.arithmetic.err_hint_decimal_align', 'Where is the decimal point in each number? Which places were added together?');
        }
        return {
          id: c.id, op: c.op, answer: c.answer, generated: true, index: c.index, kind: c.kind,
          prompt: prompt, work: work, explain: explain, hint: hint,
          choices: c.order.map(function (kind) { return { id: kind, label: diagnosisLabel(kind) }; })
        };
      }

      // ---------------------------------------------------------- operation and learn inputs
      function markOperation(op) {
        update(function (current) {
          var nextB = op === 'subtract' ? Math.min(clampInt(current.b, 0, 9999, 27), clampInt(current.a, 0, 99999, 58)) : current.b;
          return { operation: op, b: nextB, aDraft: null, bDraft: null, practiceIndex: current.level != null || current.practiceIndex != null ? 0 : current.practiceIndex, practiceProblemId: null, answerInput: '', remainderInput: '', estimateInput: '', feedback: null, estimateLocked: false, estimateStatus: null, estimateTries: 0, practiceTry: 0, practiceErrorKind: null, showPracticeHint: false, wordAnswer: '', wordRemainder: '', wordFeedback: null };
        });
        announce(fill(t('stem.arithmetic.op_selected', '{op} selected.'), { op: opLabel(t, op) }));
      }

      function onOperandInput(which, raw) {
        var value = String(raw == null ? '' : raw);
        var trimmed = value.trim();
        var n = trimmed === '' ? NaN : Number(trimmed);
        var min = which === 'a' ? 0 : bMin;
        var max = which === 'a' ? 99999 : 9999;
        var valid = isFinite(n) && isInt(n) && n >= min && n <= max;
        var patch = { showSteps: false };
        patch[which + 'Draft'] = value;
        if (valid) { patch[which] = Math.round(n); patch[which + 'Draft'] = value === String(Math.round(n)) ? null : value; }
        update(patch);
      }

      // Leaving a box settles it: an unfinished draft goes back to the last
      // valid number, and a whole-number subtraction keeps the second number
      // at or below the first.
      function onOperandBlur() {
        update(function (current) {
          var patch = { aDraft: null, bDraft: null };
          if (operation === 'subtract') {
            var ca = clampInt(current.a, 0, 99999, 58);
            var cb = clampInt(current.b, 0, 9999, Math.min(27, ca));
            if (cb > ca) patch.b = ca;
          }
          return patch;
        });
      }

      function operandProblem(which) {
        var draft = which === 'a' ? aDraft : bDraft;
        if (draft == null) return null;
        var trimmed = draft.trim();
        if (trimmed === '') return t('stem.arithmetic.input_empty', 'Type a whole number. The model keeps the last number until you do.');
        var n = Number(trimmed);
        if (!isFinite(n) || !isInt(n)) return t('stem.arithmetic.input_whole', 'Use a whole number here, with no decimal point.');
        if (which === 'b' && operation === 'divide' && n < 1) return t('stem.arithmetic.input_divisor', 'The divisor must be at least 1. You cannot share into 0 groups.');
        if (n < 0) return t('stem.arithmetic.input_negative', 'Use 0 or a positive number in this workspace.');
        return which === 'a'
          ? t('stem.arithmetic.input_range_a', 'Use a number from 0 to 99999.')
          : t('stem.arithmetic.input_range_b', 'Use a number from 0 to 9999.');
      }

      function swapOperands() {
        update({ a: b, b: a, aDraft: null, bDraft: null, showSteps: false });
        announce(fill(t('stem.arithmetic.swapped', 'Swapped. The problem is now {a} − {b}.'), { a: b, b: a }));
      }

      function checkLearnPrediction() {
        var guess = parseNum(d.learnPrediction);
        if (!isFinite(guess)) return;
        var remainderGuess = operation === 'divide' ? parseNum(d.learnPredictionRemainder) : 0;
        var right = guess === customResult.answer && (operation !== 'divide' || remainderGuess === customResult.remainder);
        var kind = right ? null : diagnoseAnswer(operation, a, b, guess, operation === 'divide' ? d.learnPredictionRemainder : null);
        update({ learnPredictionSig: learnSig, learnPredictionResult: right ? 'correct' : 'try', learnPredictionKind: kind });
        announce(right
          ? t('stem.arithmetic.predict_right', 'Your prediction matches the exact result.')
          : t('stem.arithmetic.predict_not_yet', 'Not quite. Use the model or the strategy steps to see where the prediction and the result differ.'));
      }

      // ---------------------------------------------------------- practice
      function resetItemPatch() {
        return { answerInput: '', remainderInput: '', estimateInput: '', feedback: null, showPracticeHint: false, estimateLocked: false, estimateStatus: null, estimateTries: 0, practiceTry: 0, practiceErrorKind: null, practiceDisksFor: null, practiceDisksOffer: null };
      }

      function updatePracticeInput(key, value) {
        var patch = { practiceProblemId: problem.id, feedback: null };
        if (practiceSource === 'set') patch.practiceIndex = practiceIndex;
        if (!practiceStateMatches) Object.assign(patch, resetItemPatch(), { feedback: null });
        patch[key] = value;
        update(patch);
      }

      function lockEstimate() {
        if (!needsEstimate || practiceEstimateInput === '' || practiceSolvedNow) return;
        var est = assessEstimate(problem.op, problem.a, problem.b, practiceEstimateInput);
        if (est.status === 'invalid') { announce(t('stem.arithmetic.estimate_invalid', 'Type your estimate as a number.')); return; }
        var tries = estimateTries + (est.reasonable ? 0 : 1);
        var status = est.reasonable ? 'ok' : tries >= 2 ? 'shown' : 'far';
        var patch = { practiceProblemId: problem.id, estimateTries: tries, estimateStatus: status, estimateLocked: status !== 'far', feedback: null };
        if (practiceSource === 'set') patch.practiceIndex = practiceIndex;
        update(patch);
        if (status === 'ok') announce(fill(t('stem.arithmetic.estimate_ok_sr', 'Estimate {e} locked in. It is reasonable. Now find the exact answer.'), { e: practiceEstimateInput }));
        else if (status === 'far') announce(fill(t('stem.arithmetic.estimate_far_sr', 'Your estimate {e} is far from what rounding gives. Try rounding each number first, then estimate again.'), { e: practiceEstimateInput }));
        else announce(t('stem.arithmetic.estimate_shown_sr', 'An example estimate is now shown. Your estimate is kept, and you can find the exact answer.'));
      }

      var practiceCheckPending = false;
      function checkPractice() {
        if (practiceCheckPending || practiceSolvedNow || practiceFeedback === 'revealed') return;
        practiceCheckPending = true;
        var answer = parseNum(practiceAnswerInput);
        var remainder = problem.hasRemainder ? (practiceRemainderInput === '' ? null : parseNum(practiceRemainderInput)) : 0;
        var exactCorrect = numEq(answer, problem.answer) && (!problem.hasRemainder || remainder === (problem.remainder || 0));
        var est = needsEstimate ? assessEstimate(problem.op, problem.a, problem.b, practiceEstimateInput) : null;
        var estimateOk = !needsEstimate || estimateStatus === 'shown' || (est && est.reasonable);
        var complete = exactCorrect && estimateOk;
        var tries = practiceTry + (exactCorrect ? 0 : 1);
        var kind = exactCorrect ? null : diagnoseAnswer(problem.op, problem.a, problem.b, answer, problem.hasRemainder ? practiceRemainderInput : null);
        // Stage C: no auto-reveal. After two tries a "Show the answer" button
        // appears (when the teacher allows it), as in every other tab.
        var reveal = false;
        var feedback = complete ? 'correct' : exactCorrect ? 'estimate' : 'try';
        var awardable = complete && !practiceSolvedNow && !practiceRevealedNow && !(practiceSource === 'generated' && sameContentSeen(problem.id, [d.genSolved, d.practiceRevealedIds]));
        var repeatWhy = complete && !practiceSolvedNow && !practiceRevealedNow && practiceSource === 'generated' ? repeatReason(problem.id, d.genSolved, d.practiceRevealedIds) : null;
        var source = practiceSource, id = problem.id, op = problem.op;
        update(function (current) {
          var solved = Object.assign({}, current[solvedMapKey] || {});
          var missed = Object.assign({}, current[missedMapKey] || {});
          var used = Object.assign({}, current.operationsUsed || {});
          var completedOperations = Object.assign({}, current.operationsCompleted || {});
          var estimates = Object.assign({}, current.practiceEstimates || {});
          var revealed = Object.assign({}, current.practiceRevealedIds || {});
          var log = current.missLog;
          if (complete) {
            solved[id] = true;
            used[op] = true;
            completedOperations[op] = true;
            delete missed[id];
            if (needsEstimate && practiceEstimateInput !== '') estimates[id] = practiceEstimateInput;
          } else {
            missed[id] = true;
            log = pushMiss(current.missLog, { src: 'practice', id: id, op: op, a: problem.a, b: problem.b, given: practiceAnswerInput + (problem.hasRemainder && practiceRemainderInput !== '' ? ' r ' + practiceRemainderInput : ''), kind: exactCorrect ? 'estimate_far' : (kind || 'unknown'), revealed: reveal });
          }
          if (reveal) revealed[id] = true;
          var patch = {
            attempts: (current.attempts || 0) + 1,
            feedback: feedback,
            practiceProblemId: id,
            practiceTry: tries,
            practiceErrorKind: kind,
            practiceMissed: source === 'set' ? missed : current.practiceMissed,
            operationsUsed: used,
            operationsCompleted: completedOperations,
            practiceEstimates: capMap(estimates, 300),
            practiceRevealedIds: capMap(revealed, 300),
            missLog: log
          };
          if (needsEstimate && feedback === 'estimate') { patch.estimateLocked = false; patch.estimateStatus = 'far'; }
          if (complete) { patch.noCreditFor = repeatWhy ? 'practice:' + id : null; patch.noCreditWhy = repeatWhy; }
          if (source === 'set') {
            patch.practiceSolved = solved;
            patch.practiceIndex = practiceIndex;
            patch.correct = countSolved(solved, PRACTICE_IDS);
          } else {
            patch.genSolved = capMap(solved, 300);
            patch.genMissed = capMap(missed, 300);
            patch.practiceSource = 'generated';
          }
          return patch;
        });
        if (awardable && typeof ctx.awardXP === 'function') {
          ctx.awardXP('arithmeticStudio', source === 'set' ? 4 : 2, t('stem.arithmetic.arithmetic_strategy_challenge', 'Arithmetic strategy challenge'));
        }
        if (complete) rescueFocus('[data-practice-next]');
        if (complete) announce(withRepeatNote(needsEstimate ? t('stem.arithmetic.correct_the_exact_answer_and_estimate_', 'Correct. The exact answer and estimate are consistent.') : t('stem.arithmetic.correct_fact_sr', 'Correct.'), repeatWhy));
        else if (exactCorrect) announce(t('stem.arithmetic.exact_right_estimate_far_sr', 'Your exact answer is correct. Revise the estimate so it is close enough to check reasonableness.'));
        else announce(errorKindFeedback(kind, problem, practiceRemainderInput));
      }

      function revealPractice() {
        if (practiceSolvedNow || practiceFeedback === 'revealed' || practiceFeedback === 'correct' || practiceFeedback === 'estimate' || practiceTry < 2 || !teacher.reveals) return;
        var id = problem.id, op = problem.op, source = practiceSource;
        update(function (current) {
          var revealed = Object.assign({}, plainMap(current.practiceRevealedIds));
          revealed[id] = true;
          var patch = {
            feedback: 'revealed', practiceProblemId: id,
            practiceRevealedIds: capMap(revealed, 300),
            missLog: pushMiss(current.missLog, { src: 'practice', id: id, op: op, a: problem.a, b: problem.b, given: practiceAnswerInput + (problem.hasRemainder && practiceRemainderInput !== '' ? ' r ' + practiceRemainderInput : ''), kind: practiceErrorKind || 'unknown', revealed: true })
          };
          if (source === 'set') patch.practiceIndex = practiceIndex;
          return patch;
        });
        rescueFocus('[data-practice-next]');
        announce(fill(t('stem.arithmetic.revealed_on_demand_sr', 'The answer is {x}. It earns no points, and it stays on your missed list. Read the worked steps, then try the next problem.'), { x: answerText(problem) }));
      }

      function answerText(p) {
        var main = fmtNum(p.answer, p.decimal ? null : 0);
        return p.hasRemainder ? fill(t('stem.arithmetic.answer_with_remainder', '{q} remainder {r}'), { q: main, r: p.remainder || 0 }) : main;
      }

      function selectPractice(nextIndex, message) {
        update(Object.assign({ practiceIndex: nextIndex, practiceProblemId: candidates[nextIndex].id, practiceSource: 'set' }, resetItemPatch()));
        if (message) announce(message);
      }

      function selectGenerated(skill, seed, message) {
        var next = generateProblem(skill, seed);
        update(Object.assign({ genSkill: skill, genSeed: seed, practiceProblemId: next.id, practiceSource: 'generated' }, resetItemPatch()));
        if (message) announce(message);
      }

      function nextPractice() {
        if (practiceSource === 'set') { selectPractice((practiceIndex + 1) % candidates.length); return; }
        var seed = genSeed + 1, guard = 0;
        while ((d.genSolved || {})[genSkill + '-' + seed] && guard++ < 200) seed++;
        selectGenerated(genSkill, seed, fill(t('stem.arithmetic.new_problem_sr', 'New problem: {a} {sym} {b}.'), (function () { var p = generateProblem(genSkill, seed); return { a: fmtNum(p.a), sym: sym(p.op), b: fmtNum(p.b) }; })()));
      }

      function retryMissedPractice() {
        if (!practiceMissedIds.length) return;
        var currentPosition = practiceMissedIds.indexOf(problem.id);
        var nextId = practiceMissedIds[currentPosition < 0 ? 0 : (currentPosition + 1) % practiceMissedIds.length];
        if (practiceSource === 'set') {
          var nextIndex = candidates.findIndex(function (item) { return item.id === nextId; });
          selectPractice(nextIndex, t('stem.arithmetic.retrying_missed_problem', 'Retrying a missed practice problem.'));
          return;
        }
        var parsed = parseGenId(nextId);
        if (parsed) selectGenerated(parsed.skill, parsed.seed, t('stem.arithmetic.retrying_missed_problem', 'Retrying a missed practice problem.'));
      }

      // ---------------------------------------------------------- error detective
      var errorCheckPending = false;
      function checkError(choice) {
        if (errorCheckPending || errorSolvedNow || errorFeedbackNow === 'revealed' || errorFeedbackNow === 'eliminated') return;
        if (errorWrongNow.indexOf(choice) >= 0) return;
        var correct = choice === errorCase.answer;
        var tries = errorTries + (correct ? 0 : 1);
        // With every other choice ruled out, the last one is not a diagnosis:
        // it is treated like a shown answer (no credit, stays on the missed list).
        var eliminated = correct && errorWrongNow.length >= errorCase.choices.length - 1;
        if (correct) errorCheckPending = true;
        var awardable = correct && !eliminated && !errorSolvedNow && !errorRevealedNow;
        var id = errorCase.id;
        var wrongList = correct ? errorWrongNow : errorWrongNow.concat([choice]);
        update(function (current) {
          var solved = Object.assign({}, plainMap(current.errorSolvedCases));
          var missed = Object.assign({}, plainMap(current.errorMissedCases));
          var revealedMap = Object.assign({}, plainMap(current.errorRevealed));
          var log = current.missLog;
          if (correct && !eliminated) { solved[id] = true; delete missed[id]; }
          else if (eliminated) { missed[id] = true; revealedMap[id] = true; }
          else {
            missed[id] = true;
            log = pushMiss(current.missLog, { src: 'errors', id: id, op: errorCase.op, prompt: errorCase.prompt, given: choice, kind: 'diagnosis', revealed: false });
          }
          return { errorChoice: choice, errorFeedback: eliminated ? 'eliminated' : correct ? 'correct' : 'try', errorTries: tries, errorTriesFor: id, errorWrong: wrongList, errorRuledOut: addFlag(current, 'errorRuledOut', id + '|' + choice, !correct), errorSolvedCases: capMap(solved, 300), errorMissedCases: capMap(missed, 300), errorRevealed: capMap(revealedMap, 300), errorSolved: errorSolvedCount(solved), missLog: log };
        });
        if (awardable && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 2, t('stem.arithmetic.arithmetic_error_detective', 'Arithmetic error detective'));
        announce(eliminated
          ? fill(t('stem.arithmetic.diagnosis_eliminated_sr', 'That is the key error, found by ruling out the other choices, so this case earns no points and stays on your missed list. {explain}'), { explain: errorCase.explain })
          : correct
            ? fill(t('stem.arithmetic.correct_diagnosis_sr', 'Correct diagnosis. {explain}'), { explain: errorCase.explain })
            : fill(t('stem.arithmetic.diagnosis_try_sr', 'That is not the key error. Hint: {hint}'), { hint: errorCase.hint }));
      }

      function revealError() {
        if (errorSolvedNow || errorFeedbackNow !== 'try' || errorTries < 2 || !teacher.reveals) return;
        var id = errorCase.id, keyLabel = (errorCase.choices.filter(function (c) { return c.id === errorCase.answer; })[0] || {}).label;
        update(function (current) {
          var revealedMap = Object.assign({}, plainMap(current.errorRevealed));
          revealedMap[id] = true;
          return { errorFeedback: 'revealed', errorTriesFor: id, errorRevealed: capMap(revealedMap, 300), missLog: pushMiss(current.missLog, { src: 'errors', id: id, op: errorCase.op, prompt: errorCase.prompt, given: d.errorChoice, kind: 'diagnosis', revealed: true }) };
        });
        announce(fill(t('stem.arithmetic.diagnosis_revealed_on_demand_sr', 'The key error is: {label} {explain}'), { label: keyLabel, explain: errorCase.explain }));
      }

      function selectError(nextIndex, message) {
        update({ errorIndex: nextIndex, errorChoice: null, errorFeedback: null, errorTries: 0, errorTriesFor: null, errorWrong: [] });
        if (message) announce(message);
      }

      function retryMissedError() {
        if (!errorMissedIndexes.length) return;
        var currentPosition = errorMissedIndexes.indexOf(errorIndex);
        var nextIndex = errorMissedIndexes[currentPosition < 0 ? 0 : (currentPosition + 1) % errorMissedIndexes.length];
        selectError(nextIndex, t('stem.arithmetic.retrying_missed_diagnosis', 'Retrying a missed diagnosis.'));
      }

      // ---------------------------------------------------------- word problems
      var wordCheckPending = false;
      function checkWord() {
        if (wordCheckPending || (d.wordSolvedCases && d.wordSolvedCases[wordProblem.id]) || d.wordFeedback === 'revealed') return;
        wordCheckPending = true;
        var operationCorrect = selectedWordOperation === wordProblem.op;
        var answerCorrect = parseNum(wordAnswerInput) === wordExpected.answer;
        var remainderCorrect = !wordExpected.requiresRemainder || parseNum(wordRemainderInput) === wordExpected.remainder;
        var correct = operationCorrect && answerCorrect && remainderCorrect;
        var feedback = correct ? 'correct' : !operationCorrect ? 'operation' : answerCorrect ? 'remainder' : 'try';
        var firstSolve = correct && !(d.wordSolvedCases && d.wordSolvedCases[wordProblem.id]) && !wordRevealedNow;
        var nextTry = wordTry + (correct ? 0 : 1);
        update(function (current) {
          var solved = Object.assign({}, current.wordSolvedCases || {});
          var missed = Object.assign({}, current.wordMissedCases || {});
          var attempts = Object.assign({}, current.wordAttempts || {});
          var used = Object.assign({}, current.operationsUsed || {});
          var completedOperations = Object.assign({}, current.operationsCompleted || {});
          var log = current.missLog;
          attempts[wordProblem.id] = (attempts[wordProblem.id] || 0) + 1;
          if (correct) {
            solved[wordProblem.id] = true;
            delete missed[wordProblem.id];
            used[wordProblem.op] = true;
            completedOperations[wordProblem.op] = true;
          } else {
            missed[wordProblem.id] = true;
            log = pushMiss(current.missLog, { src: 'word', id: wordProblem.id, op: wordProblem.op, a: wordProblem.a, b: wordProblem.b, given: (selectedWordOperation ? sym(selectedWordOperation) + ' ' : '') + wordAnswerInput, kind: !operationCorrect ? 'word_operation' : 'word_context', revealed: false });
          }
          return {
            wordProblemId: wordProblem.id,
            wordIndex: wordProblemIndex,
            wordFeedback: feedback,
            wordTry: nextTry,
            wordTryFor: wordProblem.id,
            wordSolvedCases: solved,
            wordMissedCases: missed,
            wordAttempts: attempts,
            wordSolved: countSolved(solved, WORD_IDS),
            operationsUsed: used,
            operationsCompleted: completedOperations,
            missLog: log
          };
        });
        if (firstSolve && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 3, t('stem.arithmetic.arithmetic_word_problem', 'Arithmetic word problem'));
        announce(correct ? t('stem.arithmetic.correct_the_operation_and_context_answ', 'Correct. The operation and context answer both fit the story.') : !operationCorrect ? t('stem.arithmetic.reconsider_which_operation_represents_', 'Reconsider which operation represents the relationship in the story.') : t('stem.arithmetic.the_operation_fits_recheck_how_the_con', 'The operation fits. Recheck how the context changes the numerical result.'));
      }

      function revealWord() {
        if ((d.wordSolvedCases && d.wordSolvedCases[wordProblem.id]) || wordTry < 2 || !teacher.reveals || d.wordFeedback === 'revealed') return;
        var p = wordProblem;
        update(function (current) {
          var revealed = Object.assign({}, plainMap(current.wordRevealed));
          revealed[p.id] = true;
          return { wordProblemId: p.id, wordIndex: wordProblemIndex, wordFeedback: 'revealed', wordRevealed: revealed, missLog: pushMiss(current.missLog, { src: 'word', id: p.id, op: p.op, a: p.a, b: p.b, given: (selectedWordOperation ? sym(selectedWordOperation) + ' ' : '') + wordAnswerInput, kind: selectedWordOperation === p.op ? 'word_context' : 'word_operation', revealed: true }) };
        });
        announce(wordRevealText());
      }

      function wordRevealText() {
        return fill(wordExpected.requiresRemainder
          ? t('stem.arithmetic.word_revealed_rem', '{op} models the story: {x} {unit}, with {r} left over. This one earns no points, and it stays on your missed list.')
          : t('stem.arithmetic.word_revealed', '{op} models the story, and the answer is {x} {unit}. This one earns no points, and it stays on your missed list.'), { op: opLabel(t, wordProblem.op), x: wordExpected.answer, unit: wordText.unit, r: wordExpected.remainder });
      }

      function chooseWordOperation(op) {
        if (d.wordFeedback === 'revealed') return;
        update({ wordProblemId: wordProblem.id, wordIndex: wordProblemIndex, wordOperation: op, wordFeedback: null });
        announce(fill(t('stem.arithmetic.op_chosen_for_story', '{op} chosen for this story.'), { op: opLabel(t, op) }));
      }

      function moveToWord(id) {
        var nextId = wordProblemById(id) ? id : WORD_IDS[0];
        update({ wordProblemId: nextId, wordIndex: WORD_IDS.indexOf(nextId), wordOperation: null, wordAnswer: '', wordRemainder: '', wordFeedback: null, wordTry: 0, wordTryFor: null, showWordPlan: false });
      }

      function nextWord() { moveToWord(nextWordProblemId(wordProblem.id, WORD_IDS)); }

      function retryMissedWords() {
        if (!wordMissedIds.length) return;
        moveToWord(nextWordProblemId(wordProblem.id, wordMissedIds));
        announce(t('stem.arithmetic.opening_a_missed_story_for_another_try', 'Opening a missed story for another try.'));
      }

      // Reads only what is on screen: the steps state the exact result, so they
      // are read after the prediction (or when the student opens them).
      function learnReadText() {
        var intro = fill(t('stem.arithmetic.tts_intro', '{op}. {a} {sym} {b}.'), { op: opLabel(t, operation), a: a, sym: opMeta.symbol, b: b });
        var open = showSteps || d.learnRevealSig === learnSig || (d.learnPredictionSig === learnSig && d.learnPredictionResult === 'correct');
        return intro + ' ' + (open ? customSteps.join(' ') : t('stem.arithmetic.tts_predict_first', 'Predict the result first. The strategy steps are read aloud once you open them.'));
      }

      // Read-aloud: the host voice when there is one, else the browser's own
      // speech (works offline), else a note that the text is on the page.
      function speak(text, id) {
        text = String(text || '');
        if (!text) return;
        function viaBrowser() {
          if (!hasSpeech) return false;
          try {
            var u = new window.SpeechSynthesisUtterance(text);
            u.rate = 0.95;
            u.onend = u.onerror = function () { if (SPEECH.active === u) SPEECH.active = null; };
            window.speechSynthesis.cancel();
            SPEECH.active = u;
            window.speechSynthesis.speak(u);
            return true;
          } catch (e) { return false; }
        }
        function unavailable() {
          var msg = t('stem.arithmetic.tts_unavailable', 'Read-aloud is not available here. The same words are written on the page.');
          update({ ttsNote: msg, ttsNoteFor: id || null });
          announce(msg);
        }
        if (typeof ctx.callTTS === 'function') {
          var req, gen = SPEECH.gen;
          try { req = ctx.callTTS(text, null, null, { force: true }); } catch (e) { if (!viaBrowser()) unavailable(); return; }
          Promise.resolve(req).then(function (url) { if (SPEECH.gen === gen && !url && !viaBrowser()) unavailable(); }, function () { if (SPEECH.gen === gen && !viaBrowser()) unavailable(); });
          return;
        }
        if (!viaBrowser()) unavailable();
      }

      function renderReadAloud(id, getText, label, ariaLabel) {
        return h('span', { key: 'tts-' + id, className: 'inline-flex flex-wrap items-center gap-2' },
          h('button', { type: 'button', 'data-read-aloud': id, onClick: function () { speak(getText(), id); }, 'aria-label': ariaLabel || undefined, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: outlineAccent }, label),
          d.ttsNoteFor === id && d.ttsNote && h('span', { role: 'status', className: 'text-xs', style: { color: muted } }, String(d.ttsNote)));
      }

      // AI hint through the host's guarded getHint, only after two tries. The
      // tool's own hint stays on screen, so nothing depends on a reply.
      function renderAiHint(key, question, wrongAnswer, correctAnswer, tries) {
        if (!aiCanAsk || tries < 2) return null;
        var status = d.aiHintKey === key ? d.aiHintStatus : null;
        function ask() {
          update({ aiHintKey: key, aiHintStatus: 'pending', aiHintText: '' });
          announce(t('stem.arithmetic.ai_hint_pending_sr', 'Asking for an AI hint.'));
          try {
            ctx.getHint('arithmeticStudio', question, String(wrongAnswer == null ? '' : wrongAnswer), String(correctAnswer), tries, function (text) {
              var clean = String(text == null ? '' : text).trim();
              update(function (current) { return current.aiHintKey === key ? { aiHintStatus: clean ? 'done' : 'none', aiHintText: clean } : {}; });
              if (clean) announce(clean);
            });
          } catch (e) {
            update({ aiHintKey: key, aiHintStatus: 'none', aiHintText: '' });
            announce(t('stem.arithmetic.ai_hint_none', 'No AI hint is available right now. Use the hint from the tool, then try again.'));
          }
        }
        return h('div', { className: 'space-y-1', 'data-ai-hint': status || 'ready' },
          status !== 'done' && status !== 'pending' && h('button', { type: 'button', onClick: ask, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: outlineAccent }, t('stem.arithmetic.ai_hint_ask', 'Ask for an AI hint')),
          status === 'pending' && h('p', { role: 'status', className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.ai_hint_waiting', 'Asking for a hint. If nothing appears, the hint from the tool still works.')),
          status === 'done' && h('p', { role: 'status', className: 'rounded-lg p-2 text-sm', 'data-ai-hint-text': true, style: { background: card, color: text, border: '1px dashed ' + border } }, String(d.aiHintText || '')),
          status === 'none' && h('p', { role: 'status', className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.ai_hint_none', 'No AI hint is available right now. Use the hint from the tool, then try again.')));
      }

      function moveTab(event, index) {
        var nextIndex = null;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabOrder.length;
        else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabOrder.length) % tabOrder.length;
        else if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabOrder.length - 1;
        if (nextIndex === null) return;
        event.preventDefault();
        var nextId = tabOrder[nextIndex];
        update({ tab: nextId });
        if (typeof document !== 'undefined') {
          var nextTab = document.getElementById('arithmetic-studio-tab-' + nextId);
          if (nextTab) nextTab.focus();
        }
      }

      // ---------------------------------------------------------- teacher
      function setTeacher(patch) {
        update(function (current) {
          var base = normalizeTeacher(current.teacher);
          return { teacher: Object.assign({}, base, patch), teacherMsg: null };
        });
      }

      function missSummaryText() {
        var log = Array.isArray(d.missLog) ? d.missLog : [];
        var tally = {};
        log.forEach(function (item) { tally[item.kind] = (tally[item.kind] || 0) + 1; });
        var lines = [t('stem.arithmetic.summary_title', 'Arithmetic Strategy Studio: missed items')];
        Object.keys(tally).forEach(function (kind) { lines.push(fill(t('stem.arithmetic.summary_tally_line', '{kind}: {n}'), { kind: errorKindName(kind), n: tally[kind] })); });
        lines.push('');
        log.forEach(function (item) { lines.push(missItemProblem(item) + ' | ' + (item.src === 'efficient' ? mentalName(item.given) : (item.given || '')) + ' | ' + errorKindName(item.kind) + (item.revealed ? ' | ' + t('stem.arithmetic.summary_revealed', 'answer shown') : '')); });
        return lines.join('\n');
      }

      function missItemProblem(item) {
        if (item.src === 'errors' || item.src === 'bar') return item.prompt || item.id;
        if (item.a == null || !OPERATIONS[item.op]) return String(item.id || '');
        return fmtNum(item.a) + ' ' + sym(item.op) + ' ' + fmtNum(item.b);
      }

      function copySummary() {
        var textOut = missSummaryText();
        function done(ok) {
          var msg = ok ? t('stem.arithmetic.summary_copied', 'Missed-items summary copied.') : t('stem.arithmetic.summary_copy_failed', 'Copying is not available here. Select the table text instead.');
          update({ teacherMsg: msg });
          announce(msg);
        }
        try {
          var api = window.StemLab && typeof window.StemLab.writeClipboard === 'function' ? window.StemLab.writeClipboard : null;
          var pending = api ? api(textOut) : (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(textOut) : Promise.reject(new Error('no clipboard')));
          Promise.resolve(pending).then(function () { done(true); }, function () { done(false); });
        } catch (e) { done(false); }
      }

      // ---------------------------------------------------------- shared renderers
      function renderOperationPicker() {
        return h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2', role: 'group', 'aria-label': t('stem.arithmetic.choose_an_operation', 'Choose an operation') },
          allowedOps.map(function (op) {
            var meta = OPERATIONS[op], active = operation === op;
            return h('button', { key: op, type: 'button', onClick: function () { markOperation(op); }, 'aria-pressed': active,
              className: 'rounded-xl px-3 py-2 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-offset-2',
              style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', background: active ? themeAccent(meta) : card, color: active ? (isContrast ? '#000000' : '#ffffff') : text, border: '2px solid ' + themeAccent(meta) } }, meta.symbol + ' ' + opLabel(t, op));
          })
        );
      }

      function renderEquation(left, right, op) {
        var meta = OPERATIONS[op];
        return h('div', { className: 'rounded-2xl p-4 text-center', style: { background: themeSoft(meta), color: themeSoftText(), border: '2px solid ' + themeAccent(meta) } },
          h('div', { className: 'text-3xl sm:text-4xl font-black font-mono', style: { overflowWrap: 'anywhere' }, 'aria-label': fill(t('stem.arithmetic.equation_label', '{a} {op} {b}'), { a: fmtNum(left), op: opLabel(t, op), b: fmtNum(right) }) }, fmtNum(left) + ' ' + meta.symbol + ' ' + fmtNum(right)),
          op === 'divide' && h('p', { className: 'mt-1 text-xs font-semibold' }, fill(t('stem.arithmetic.think_groups', 'Think: how many groups of {b} fit in {a}?'), { a: fmtNum(left), b: fmtNum(right) }))
        );
      }

      function renderPlaceTable(left, right, op) {
        var maxDigits = Math.max(String(Math.abs(left)).length, String(Math.abs(right)).length);
        var placeIdx = [];
        for (var i = maxDigits - 1; i >= 0; i--) placeIdx.push(i);
        function digits(n) { return String(Math.abs(n)).padStart(maxDigits, '0').split(''); }
        return h('details', { className: 'rounded-xl p-2', style: { border: '1px solid ' + border } },
          h('summary', { className: 'cursor-pointer text-xs font-bold', style: { color: accentText, minHeight: 44, display: 'flex', alignItems: 'center' } }, t('stem.arithmetic.place_value_table_and_text_alternative', 'Place-value table and text alternative')),
          h('div', { className: 'overflow-x-auto mt-2' },
            h('table', { className: 'w-full text-center text-xs' },
              h('caption', { className: 'sr-only' }, fill(t('stem.arithmetic.place_table_caption', 'Place-value alignment for {a} and {b}'), { a: left, b: right })),
              h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'p-1' }, t('stem.arithmetic.number', 'Number')), placeIdx.map(function (p) { return h('th', { key: p, scope: 'col', className: 'p-1' }, placeName(t, p)); }))),
              h('tbody', null,
                [left, right].map(function (n, row) {
                  return h('tr', { key: row },
                    h('th', { scope: 'row', className: 'p-1' }, row ? fill(t('stem.arithmetic.row_second', '{sym} second number'), { sym: OPERATIONS[op].symbol }) : t('stem.arithmetic.row_first', 'First number')),
                    digits(n).map(function (digit, idx) { return h('td', { key: idx, className: 'p-1 font-mono font-bold' }, digit); }));
                })
              )
            )
          )
        );
      }

      function feedbackPanel(ok, children) {
        return h('div', { role: 'status', className: 'rounded-xl p-3 text-sm font-bold space-y-1', style: { background: ok ? '#dcfce7' : '#fef3c7', color: ok ? '#166534' : '#92400e', border: '1px solid ' + (ok ? '#86efac' : '#fcd34d') } }, children);
      }

      function areaPartials(left, right) {
        var rowParts = splitPlaceValue(left).filter(function (n) { return n > 0; });
        var colParts = splitPlaceValue(right).filter(function (n) { return n > 0; });
        var partials = [], yOffset = 0;
        rowParts.forEach(function (rowPart) {
          var xOffset = 0;
          colParts.forEach(function (colPart) {
            var idx = partials.length;
            var label = idx < 26 ? String.fromCharCode(65 + idx) : 'Z' + (idx - 25);
            partials.push({ label: label, row: rowPart, col: colPart, x: xOffset, y: yOffset });
            xOffset += colPart;
          });
          yOffset += rowPart;
        });
        return { rows: rowParts, cols: colParts, partials: partials };
      }

      // Place values in words ("10 ones = 1 ten"), so an addition model does
      // not read like a multiplication problem.
      function stageNote(stage, op, left, right, totalOpen) {
        if (stage.kind === 'start') return op === 'add'
          ? t('stem.arithmetic.combine_places', 'Combine the units in matching places. Each disk is worth the value printed inside it.')
          : t('stem.arithmetic.start_quantity', 'Start with the first number. Exchange a larger unit when a place needs more disks.');
        if (stage.kind === 'exchange') return op === 'add'
          ? fill(t('stem.arithmetic.exchange_up_note_v2', '{from} = {to}. You traded the disks; the total stays the same.'), { from: placeCount(t, stage.place, 10), to: placeCount(t, stage.place + 1, 1) })
          : fill(t('stem.arithmetic.exchange_down_note_v2', '{from} = {to}. You traded the disks; the total stays the same.'), { from: placeCount(t, stage.donor, 1), to: placeCount(t, stage.place, 10) });
        if (stage.kind === 'remove') return fill(t('stem.arithmetic.remove_note_v2', 'You took away {what}. This place is finished; move left.'), { what: placeCount(t, stage.place, stage.removed) });
        if (!totalOpen) return t('stem.arithmetic.every_place_settled_hidden', 'Every place is settled. Read the disks to find the difference.');
        return fill(t('stem.arithmetic.every_place_settled_note', 'Every place is settled: {a} − {b} = {r}.'), { a: left, b: right, r: left - right });
      }

      // The student's own move for the next stage of the walk (the step
      // engine decides what it is): the button text, the place whose disks
      // move, and how many of them.
      function walkAction(op, next) {
        if (!next) return null;
        if (next.kind === 'exchange') {
          var up = op === 'add';
          var from = up ? next.place : next.donor;
          return { source: from, marked: up ? 10 : 1, label: fill(t('stem.arithmetic.trade_btn', 'Trade {from} for {to}'), up
            ? { from: placeCount(t, next.place, 10), to: placeCount(t, next.place + 1, 1) }
            : { from: placeCount(t, next.donor, 1), to: placeCount(t, next.place, 10) }) };
        }
        if (next.kind === 'remove') return { source: next.place, marked: next.removed, label: fill(t('stem.arithmetic.take_away_btn', 'Take away {what}'), { what: placeCount(t, next.place, next.removed) }) };
        return { source: null, marked: 0, label: t('stem.arithmetic.settle_btn', 'Check that every place is settled') };
      }

      // Place-value disks for + and −. The student makes each trade or
      // take-away (button, or a tap on the marked disks); the counts come
      // from placeValueStages. cfg: { totalOpen, sigKey, stepKey, id }.
      function renderDiskWalk(op, left, right, cfg) {
        var walk = placeValueStages(op, left, right);
        var places = walk.places;
        var stages = walk.stages;
        var signature = op + ':' + left + ':' + right;
        var step = d[cfg.sigKey] === signature ? clampInt(d[cfg.stepKey], 0, stages.length - 1, 0) : 0;
        var stage = stages[step];
        var previousStage = step > 0 ? stages[step - 1] : null;
        var action = walkAction(op, stages[step + 1]);
        var totalOpen = !!cfg.totalOpen;
        function stageTotal(item) { return item.counts.reduce(function (sum, n, i) { return sum + n * Math.pow(10, i); }, 0); }
        function stageExpression(item) { return item.counts.map(function (n, i) { return n ? placeCount(t, i, n) : null; }).filter(Boolean).reverse().join(' + ') || '0'; }
        function go(to) {
          var patch = {};
          patch[cfg.sigKey] = signature;
          patch[cfg.stepKey] = to;
          update(patch);
        }
        function advance() { if (step < stages.length - 1) go(step + 1); }
        var total = stageTotal(stage);
        // A sum has its final value at every step; a difference reaches it at
        // the last take-away. Those values show "?" until the prediction.
        var lastRemove = -1;
        stages.forEach(function (s, i) { if (s.kind === 'remove') lastRemove = i; });
        function shownValue(idx, value) { return totalOpen || (op === 'subtract' && idx < lastRemove) ? value : '?'; }
        var hideNow = shownValue(step, total) === '?';
        var valueChange = !previousStage ? null : stage.kind === 'remove'
          ? fill(t('stem.arithmetic.value_change_remove', 'Taking away changes the value: {before} − {removed} = {after}.'), { before: shownValue(step - 1, stageTotal(previousStage)), removed: stageTotal(previousStage) - total, after: shownValue(step, total) })
          : stage.kind === 'summary'
            ? (hideNow ? t('stem.arithmetic.value_change_summary_hidden', 'Nothing moves in this step; every place is already settled.') : fill(t('stem.arithmetic.value_change_summary', 'Nothing moves in this step; every place is already settled. Value: {v}.'), { v: total }))
            : (hideNow ? t('stem.arithmetic.value_change_exchange_hidden', 'The grouping changes, but the value stays the same.') : fill(t('stem.arithmetic.value_change_exchange', 'The grouping changes, but both representations have value {v}.'), { v: total }));
        var markBg = isContrast ? '#000000' : (isDark ? '#1e3a8a' : '#dbeafe');
        return h('section', { className: 'rounded-xl p-3 space-y-3', 'data-place-value-model': cfg.id || true, style: { background: card, border: '1px solid ' + border } },
          h('h3', { className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.place_value_model', 'Place-value model')),
          h('p', { role: 'status', 'aria-live': 'polite', className: 'text-sm' }, stageNote(stage, op, left, right, totalOpen)),
          // The move comes first, right above the disks it changes, so it is on the first screen.
          stages.length === 1
            ? h('p', { className: 'text-xs', 'data-walk-nothing': true }, op === 'add'
              ? t('stem.arithmetic.no_trade_needed', 'No place has 10 or more disks, so there is nothing to trade. Count the disks in each place.')
              : t('stem.arithmetic.explain_final_disks', 'Explain how these disks represent the answer.'))
            : h('div', { className: 'flex flex-wrap items-center gap-2' },
              // Stays focusable at the end (aria-disabled), so focus is never dropped.
              h('button', { type: 'button', 'data-walk-next': action ? (stages[step + 1].kind) : 'done', 'aria-disabled': action ? undefined : 'true', className: 'rounded-lg px-3 py-2 text-sm font-bold', style: action ? solidAccent(opMeta) : Object.assign({}, ghostStyle, { opacity: 0.7 }), onClick: advance },
                action ? action.label : t('stem.arithmetic.walk_done_btn', 'All steps are done')),
              h('button', { type: 'button', 'data-walk-back': true, 'aria-disabled': step === 0 ? 'true' : undefined, className: 'rounded-lg px-3 py-2 text-sm', style: Object.assign({}, ghostStyle, { opacity: step === 0 ? 0.6 : 1 }), onClick: function () { if (step > 0) go(step - 1); } }, t('stem.arithmetic.previous_exchange', 'Previous step')),
              h('span', { className: 'self-center text-xs' }, fill(t('stem.arithmetic.step_counter', 'Step {n} of {total}'), { n: step + 1, total: stages.length })),
              h('p', { className: 'text-xs w-full' }, step === stages.length - 1 ? t('stem.arithmetic.explain_final_disks', 'Explain how these disks represent the answer.') : t('stem.arithmetic.predict_next_change', 'Before moving on, predict what will change in the next step.'))
            ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 } }, stage.counts.map(function (_, reverseIndex) {
            var i = places - 1 - reverseIndex, value = Math.pow(10, i), count = stage.counts[i];
            var delta = previousStage ? count - previousStage.counts[i] : 0;
            var isSource = !!action && action.source === i && count > 0;
            // Marked disks: the first ten for a carry, the last ones for a borrow or a take-away.
            var markFrom = !isSource ? count : (op === 'add' && action.marked === 10 ? 0 : count - action.marked);
            var markTo = !isSource ? count : (op === 'add' && action.marked === 10 ? 10 : count);
            return h('div', { key: i, 'data-place': value, 'data-count': count, 'data-place-delta': delta, 'data-trade-source': isSource ? 'true' : undefined, style: { border: delta ? '2px dashed ' + accentText : isSource ? '2px solid ' + accentText : '1px solid ' + border, borderRadius: 8, padding: 8 } },
              h('p', { className: 'text-xs font-bold mb-2' }, placeCount(t, i, count)),
              delta !== 0 && h('p', { className: 'text-xs font-bold mb-2', style: { color: accentText } }, fill(delta > 0
                ? (delta === 1 ? t('stem.arithmetic.delta_more_one', '{n} more disk than the previous step') : t('stem.arithmetic.delta_more', '{n} more disks than the previous step'))
                : (delta === -1 ? t('stem.arithmetic.delta_fewer_one', '{n} fewer disk than the previous step') : t('stem.arithmetic.delta_fewer', '{n} fewer disks than the previous step')), { n: Math.abs(delta) })),
              h('div', { role: 'img', 'aria-label': fill(t('stem.arithmetic.disk_group_label', '{what}: each disk is worth {v}'), { what: placeCount(t, i, count), v: value }),
                // A tap on the marked disks makes the same move as the button above (pointer shortcut).
                onClick: isSource ? advance : undefined,
                style: { display: 'flex', flexWrap: 'wrap', gap: 4, cursor: isSource ? 'pointer' : undefined } },
                Array.from({ length: count }, function (_, disk) {
                  var marked = disk >= markFrom && disk < markTo;
                  return h('span', { key: disk, 'aria-hidden': true, 'data-disk-marked': marked ? 'true' : undefined, style: { minWidth: 28, height: 28, padding: '0 4px', borderRadius: 14, border: marked ? '2px dashed ' + accentText : '1px solid ' + accentText, display: 'inline-flex', justifyContent: 'center', alignItems: 'center', fontSize: 11, fontWeight: 700, color: text, background: marked ? markBg : card } }, value);
                })
              ),
              isSource && h('p', { className: 'text-xs mt-2', style: { color: muted } }, t('stem.arithmetic.tap_marked_disks', 'Tap the marked disks to make this move.'))
            );
          })),
          previousStage && h('div', { className: 'rounded-lg p-3 space-y-2', style: { background: card, border: '1px solid ' + border }, 'data-step-comparison': stage.kind },
            h('p', { className: 'text-sm' }, fill(t('stem.arithmetic.before_step_line', 'Before this step: {expr} = {v}'), { expr: stageExpression(previousStage), v: shownValue(step - 1, stageTotal(previousStage)) })),
            h('p', { className: 'text-sm' }, fill(t('stem.arithmetic.after_step_line', 'After this step: {expr} = {v}'), { expr: stageExpression(stage), v: shownValue(step, total) })),
            h('p', { className: 'text-sm font-bold', 'data-value-change': true }, valueChange)),
          h('p', { className: 'font-mono text-sm', 'data-model-total': hideNow ? '?' : total, style: { overflowWrap: 'anywhere' } }, stageExpression(stage) + ' = ' + shownValue(step, total))
        );
      }

      // ---------------------------------------------------------- models
      function renderModel(op, left, right) {
        if (!showModel) return null;
        if (op === 'add' || op === 'subtract') return renderDiskWalk(op, left, right, { totalOpen: learnTotalOpen, sigKey: 'exchangeSignature', stepKey: 'exchangeStep' });
        if (op === 'multiply') {
          if (left === 0 || right === 0) {
            return h('div', { className: 'rounded-xl p-3', style: { background: card, border: '1px solid ' + border } },
              h('h3', { className: 'text-sm font-black mb-2', style: { color: accentText } }, t('stem.arithmetic.zero_product_model', 'Zero-product model')),
              h('div', { role: 'img', 'aria-label': learnTotalOpen ? fill(t('stem.arithmetic.zero_product_label', '{a} times {b} has no dots because one factor is zero; the product is zero.'), { a: left, b: right }) : fill(t('stem.arithmetic.zero_product_label_hidden', '{a} times {b} has no dots because one factor is zero.'), { a: left, b: right }), className: 'rounded-lg p-4 text-center text-sm font-bold', style: { background: themeSoft(opMeta), color: themeSoftText() } }, learnTotalOpen ? t('stem.arithmetic.one_factor_is_0_so_there_are_no_equal_', 'One factor is 0, so there are no equal groups to draw. Product: 0.') : t('stem.arithmetic.zero_product_hidden', 'One factor is 0, so there are no equal groups to draw.'))
            );
          }
          if (left <= 12 && right <= 12) {
            var dotColor = isContrast ? '#fbbf24' : (isDark ? opMeta.darkText : opMeta.color);
            return h('div', { className: 'rounded-xl p-3', style: { background: card, border: '1px solid ' + border } },
              h('h3', { className: 'text-sm font-black mb-2', style: { color: accentText } }, t('stem.arithmetic.array_model', 'Array model')),
              h('div', { role: 'img', 'data-array-model': true, 'aria-label': learnTotalOpen ? fill(t('stem.arithmetic.array_label', '{r} rows of {c} dots, {n} in all'), { r: left, c: right, n: left * right }) : fill(t('stem.arithmetic.array_label_hidden', '{r} rows of {c} dots'), { r: left, c: right }), style: { display: 'grid', gridTemplateColumns: 'repeat(' + right + ', minmax(8px, 18px))', gap: 4, justifyContent: 'center' } },
                Array.from({ length: left * right }).map(function (_, i) { return h('span', { key: i, 'data-array-dot': true, style: { width: 12, height: 12, borderRadius: '50%', background: dotColor } }); })
              ),
              h('p', { className: 'text-xs mt-2', style: { color: muted } }, fill(t('stem.arithmetic.array_caption', '{r} rows with {c} in each row.'), { r: left, c: right }))
            );
          }
          var area = areaPartials(left, right);
          var partials = area.partials;
          // To scale when every part is wide enough for its label; otherwise
          // a labelled schematic (said so in text) so no partial is hidden.
          var toScale = area.cols.every(function (c) { return 340 * c / right >= 22; }) && area.rows.every(function (r) { return 200 * r / left >= 22; });
          function colX(idx) { return toScale ? 340 * area.cols.slice(0, idx).reduce(function (s, n) { return s + n; }, 0) / right : 340 * idx / area.cols.length; }
          function colW(idx) { return toScale ? 340 * area.cols[idx] / right : 340 / area.cols.length; }
          function rowY(idx) { return toScale ? 200 * area.rows.slice(0, idx).reduce(function (s, n) { return s + n; }, 0) / left : 200 * idx / area.rows.length; }
          function rowH(idx) { return toScale ? 200 * area.rows[idx] / left : 200 / area.rows.length; }
          var fills = ['#ddd6fe', '#c4b5fd', '#a78bfa', '#ede9fe', '#e9d5ff', '#d8b4fe'];
          var labelSize = Math.max(9, Math.min(16, Math.floor(Math.min(340 / area.cols.length, 200 / area.rows.length) / 3)));
          return h('div', { className: 'rounded-xl p-3 space-y-2', style: { background: card, border: '1px solid ' + border } },
            h('h3', { className: 'text-sm font-black mb-2', style: { color: accentText } }, t('stem.arithmetic.area_model_decomposition', 'Area-model decomposition')),
            h('p', { className: 'text-sm' }, fill(t('stem.arithmetic.area_decompose_line', 'Split by place value: {a} = {ap} and {b} = {bp}.'), { a: left, ap: area.rows.join(' + '), b: right, bp: area.cols.join(' + ') })),
            h('div', null,
              h('div', { role: 'img', 'data-area-to-scale': toScale ? 'true' : 'false', 'aria-label': fill(t('stem.arithmetic.area_model_label', 'Area model showing partial products for {a} times {b}'), { a: left, b: right }), style: { color: themeSoftText() } },
                h('svg', { viewBox: '0 0 360 220', 'aria-hidden': true, style: { width: '100%', maxWidth: 480, display: 'block', margin: 'auto' } }, partials.map(function (part, i) {
                  var ci = area.cols.indexOf(part.col), ri = area.rows.indexOf(part.row);
                  var x = 10 + colX(ci), y = 10 + rowY(ri), w = colW(ci), ht = rowH(ri);
                  return h('g', { key: part.label },
                    h('rect', { x: x, y: y, width: w, height: ht, fill: fills[i % fills.length], stroke: '#4c1d95', strokeWidth: 1, 'data-partial-product': part.row * part.col }),
                    h('text', { x: x + w / 2, y: y + ht / 2, textAnchor: 'middle', dominantBaseline: 'central', fill: '#0f172a', fontSize: labelSize, fontWeight: 800, 'data-partial-label': part.label }, part.label));
                }))),
              !toScale && h('p', { className: 'text-xs mt-1', style: { color: muted } }, t('stem.arithmetic.area_not_to_scale', 'Not drawn to scale, so every part has room for its label. The list below gives every partial product.')),
              h('div', { className: 'rounded-lg p-3 text-sm', style: { background: isContrast ? '#000000' : (isDark ? '#2e1065' : '#f5f3ff'), color: isContrast ? '#ffffff' : (isDark ? '#ede9fe' : '#1e1b4b'), border: isContrast ? '1px solid #ffffff' : 'none' } }, partials.map(function(part) { return h('p', { key: part.label }, part.label + ': ' + part.row + ' × ' + part.col + ' = ' + (!learnTotalOpen && partials.length === 1 ? '?' : part.row * part.col)); }),
                (learnTotalOpen || partials.length > 1) && h('p', { className: 'font-bold mt-2', style: { overflowWrap: 'anywhere' } }, partials.map(function (part) { return part.row * part.col; }).join(' + ') + ' = ' + (learnTotalOpen ? left * right : '?'))))
          );
        }
        var division = calculate('divide', left, right);
        var sharing = d.divisionMeaning === 'sharing';
        var groups = sharing ? right : division.answer;
        var perGroup = sharing ? division.answer : right;
        var shownGroups = Math.min(groups, 12);
        return h('section', { className: 'rounded-xl p-3 space-y-3', style: { background: card, border: '1px solid ' + border } },
          h('h3', { className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.equal_groups_model', 'Equal-groups model')),
          h('div', { className: 'flex flex-wrap gap-2', role: 'group', 'aria-label': t('stem.arithmetic.division_meaning', 'Meaning of division') },
            [['groups', t('stem.arithmetic.make_groups', 'Make groups of a given size')], ['sharing', t('stem.arithmetic.share_equally', 'Share among a given number of groups')]].map(function (item) {
              var on = (sharing ? 'sharing' : 'groups') === item[0];
              return h('button', { key: item[0], type: 'button', 'aria-pressed': on, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(on), onClick: function () { update({ divisionMeaning: item[0] }); } }, item[1]);
            })
          ),
          h('p', { className: 'text-sm' }, fill(sharing
            ? t('stem.arithmetic.sharing_prompt_line', 'Share equally among {b} groups. How many in each group?')
            : t('stem.arithmetic.grouping_prompt_line', 'Put {b} in each group. How many complete groups?'), { b: right })),
          learnTotalOpen && h('p', { className: 'text-sm font-bold' }, fill(t('stem.arithmetic.groups_summary_line', '{g} complete groups of {p}, with {r} left over'), { g: groups, p: perGroup, r: division.remainder })),
          h('div', { 'data-division-groups': groups, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 8 } }, Array.from({ length: shownGroups }, function (_, i) {
            return h('div', { key: i, className: 'rounded-lg border p-2', 'data-group-size': perGroup, style: { borderColor: border } },
              h('p', { className: 'text-xs font-bold mb-2' }, learnTotalOpen || !sharing ? fill(t('stem.arithmetic.group_line', 'Group {n}: {p}'), { n: i + 1, p: perGroup }) : fill(t('stem.arithmetic.group_line_hidden', 'Group {n}'), { n: i + 1 })),
              h('div', { 'aria-hidden': true, style: { display: 'flex', flexWrap: 'wrap', gap: 4 } }, Array.from({ length: Math.min(perGroup, 24) }, function (_, dot) { return h('span', { key: dot, style: { width: 10, height: 10, borderRadius: '50%', background: accentText } }); })),
              perGroup > 24 && (learnTotalOpen || !sharing) && h('p', { className: 'text-xs mt-1' }, '24 + ' + (perGroup - 24) + ' = ' + perGroup)
            );
          })),
          groups > shownGroups && h('p', { className: 'text-sm' }, fill(t('stem.arithmetic.more_groups_line', 'Additional groups not drawn: {n}'), { n: groups - shownGroups })),
          h('p', { role: 'status', className: 'text-sm font-bold', 'data-division-remainder': division.remainder }, learnTotalOpen ? fill(t('stem.arithmetic.leftover_line', 'Left over: {r}'), { r: division.remainder }) : t('stem.arithmetic.leftover_hidden', 'Anything left over is drawn as squares below.')),
          h('div', { 'aria-hidden': true, className: 'flex flex-wrap gap-1' }, Array.from({ length: Math.min(division.remainder, 24) }, function (_, i) { return h('span', { key: i, style: { width: 12, height: 12, border: '2px solid ' + accentText, background: card } }); })),
          division.remainder > 24 && learnTotalOpen && h('p', { className: 'text-xs' }, '24 + ' + (division.remainder - 24) + ' = ' + division.remainder),
          h('p', { className: 'font-mono text-sm' }, left + ' = ' + (learnTotalOpen || sharing ? groups : '?') + ' × ' + (learnTotalOpen || !sharing ? perGroup : '?') + ' + ' + (learnTotalOpen ? division.remainder : '?'))
        );
      }

      // ---------------------------------------------------------- model -> standard algorithm
      function padLeft(str, width) { str = String(str); while (str.length < width) str = ' ' + str; return str; }

      function renderBridge(op, left, right) {
        var lines = [], notes = [];
        var width;
        if (op === 'add') {
          var col = columnAddition(left, right);
          width = String(col.sum).length + 2;
          var carryRow = '';
          for (var p = width - 1; p >= 0; p--) carryRow += col.carries[p] ? '1' : ' ';
          lines = [carryRow, padLeft(left, width), '+' + padLeft(right, width - 1), new Array(width + 1).join('-'), padLeft(learnTotalOpen ? col.sum : '?', width)];
          col.carryPlaces.forEach(function (place) {
            notes.push(fill(t('stem.arithmetic.bridge_add_carry', 'The {from} column makes {s}. Write {digit} and carry 1 to the {to}. That carried 1 is the exchange in the disk model: ten {from} became one of the {to}.'), { from: placeName(t, place - 1), to: placeName(t, place), s: col.colSums[place - 1], digit: col.colSums[place - 1] % 10 }));
          });
          if (!notes.length) notes.push(t('stem.arithmetic.bridge_add_none', 'No column reaches 10, so nothing is carried and the disk model needs no exchange.'));
        } else if (op === 'subtract') {
          var sub = columnSubtraction(left, right);
          var n = String(left).length;
          var cell = 3;
          var topDigits = digitsOf(left), bottomDigits = digitsOf(right), resDigits = digitsOf(sub.difference);
          var regroupRow = '', topRow = '', bottomRow = '', resRow = '';
          for (var i = n - 1; i >= 0; i--) {
            regroupRow += padLeft(sub.top[i] !== topDigits[i] ? sub.top[i] : '', cell);
            topRow += padLeft(topDigits[i], cell);
            bottomRow += padLeft(i < bottomDigits.length ? bottomDigits[i] : '', cell);
            resRow += padLeft(i < resDigits.length ? resDigits[i] : '', cell);
          }
          width = n * cell + 1;
          lines = [' ' + regroupRow, ' ' + topRow, '−' + bottomRow, new Array(width + 1).join('-'), learnTotalOpen ? ' ' + resRow : padLeft('?', width)];
          sub.events.forEach(function (ev) {
            notes.push(fill(t('stem.arithmetic.bridge_sub_regroup', 'Regroup: exchange one of the {from} for ten {to}. The small numbers above show the new digits, exactly like the disk exchange.'), { from: placeName(t, ev.from), to: placeName(t, ev.to) }));
          });
          if (!notes.length) notes.push(t('stem.arithmetic.bridge_sub_none', 'Every top digit is big enough, so no regrouping is needed.'));
        } else if (op === 'multiply') {
          if (left === 0 || right === 0) return null;
          var rows = multiplyRows(left, right);
          var area = areaPartials(left, right);
          width = String(left * right).length + 2;
          lines = [padLeft(left, width), '×' + padLeft(right, width - 1), new Array(width + 1).join('-')];
          var oneRowHidden = rows.length === 1 && !learnTotalOpen;
          rows.forEach(function (row) { lines.push(padLeft(oneRowHidden ? '?' : row.value, width) + '   ← ' + left + ' × ' + row.part); });
          if (rows.length > 1) { lines.push(new Array(width + 1).join('-')); lines.push(padLeft(learnTotalOpen ? left * right : '?', width)); }
          rows.forEach(function (row) {
            var labels = area.partials.filter(function (part) { return part.col === row.part; }).map(function (part) { return part.label; });
            notes.push(fill(left <= 12 && right <= 12
              ? t('stem.arithmetic.bridge_mul_row_small', '{a} × {part} = {v}.')
              : t('stem.arithmetic.bridge_mul_row', '{a} × {part} = {v}. In the area model this row is the column for {part}: parts {labels} added together.'), { a: left, part: row.part, v: oneRowHidden ? '?' : row.value, labels: labels.join(' + ') }));
          });
          if (rows.length > 1) notes.push(t('stem.arithmetic.bridge_mul_shift', 'Each row is shifted one place left because the digit it uses is worth ten times as much. The zero at the end of a row holds that place.'));
        } else {
          var steps = longDivisionSteps(left, right);
          var q = calculate('divide', left, right);
          steps.forEach(function (s, idx) {
            notes.push(fill(steps.length === 1 && !learnTotalOpen
              ? t('stem.arithmetic.bridge_div_first_hidden', 'Start with {cur}. How many times does {b} fit? Multiply, then subtract to find what is left.')
              : idx === 0
              ? t('stem.arithmetic.bridge_div_first', 'Start with {cur}. {b} fits {qd} times: {qd} × {b} = {prod}, and {cur} − {prod} = {rem}.')
              : t('stem.arithmetic.bridge_div_next', 'Bring down the next digit to make {cur}. {b} fits {qd} times: {qd} × {b} = {prod}, and {cur} − {prod} = {rem}.'), { cur: s.cur, b: right, qd: s.qd, prod: s.prod, rem: s.rem }));
          });
          notes.push(learnTotalOpen
            ? fill(t('stem.arithmetic.bridge_div_total', 'Reading the quotient digits in order gives {q} remainder {r}. Each step makes as many equal groups of {b} as fit, one place at a time, just like the equal-groups model.'), { q: q.answer, r: q.remainder, b: right })
            : fill(t('stem.arithmetic.bridge_div_total_hidden', 'Read the quotient digits in order to find the quotient and the remainder. Each step makes as many equal groups of {b} as fit, one place at a time, just like the equal-groups model.'), { b: right }));
        }
        return h('details', { className: 'rounded-xl p-3', 'data-algorithm-bridge': op, style: { background: card, border: '1px solid ' + border } },
          h('summary', { className: 'cursor-pointer text-sm font-black', style: { color: accentText, minHeight: 44, display: 'flex', alignItems: 'center' } }, t('stem.arithmetic.bridge_title', 'From the model to the standard algorithm')),
          lines.length > 0 && h('pre', { 'aria-hidden': true, className: 'font-mono text-sm mt-2 p-2 rounded-lg', style: { background: bg, color: text, overflowX: 'auto', lineHeight: 1.4 } }, lines.join('\n')),
          h('ol', { className: 'mt-2 space-y-1 text-sm list-decimal pl-5' }, notes.map(function (note, i) { return h('li', { key: i }, note); }))
        );
      }

      // ---------------------------------------------------------- worked examples that fade
      function weTemplate(key) {
        switch (key) {
          case 'add_tens': return t('stem.arithmetic.we_add_tens', 'Add the tens: {x} + {y} = {ans}.');
          case 'add_ones': return t('stem.arithmetic.we_add_ones', 'Add the ones: {x} + {y} = {ans}.');
          case 'add_total': return t('stem.arithmetic.we_add_total', 'Combine the partial sums: {x} + {y} = {ans}.');
          case 'sub_regroup': return t('stem.arithmetic.we_sub_regroup', 'Regroup {a} as {x} + {ans}, so the ones place has enough.');
          case 'sub_ones': return t('stem.arithmetic.we_sub_ones', 'Subtract the ones: {x} − {y} = {ans}.');
          case 'sub_tens': return t('stem.arithmetic.we_sub_tens', 'Subtract the tens: {x} − {y} = {ans}.');
          case 'sub_total': return t('stem.arithmetic.we_sub_total', 'Combine the parts: {x} + {y} = {ans}.');
          case 'mul_tens': return t('stem.arithmetic.we_mul_tens', 'Multiply the tens: {x} × {y} = {ans}.');
          case 'mul_ones': return t('stem.arithmetic.we_mul_ones', 'Multiply the ones: {x} × {y} = {ans}.');
          case 'mul_total': return t('stem.arithmetic.we_mul_total', 'Add the partial products: {x} + {y} = {ans}.');
          case 'div_ten': return t('stem.arithmetic.we_div_ten', 'Take 10 groups first: {b} × 10 = {ans}.');
          case 'div_sub1': return t('stem.arithmetic.we_div_sub1', 'Subtract them: {a} − {x} = {ans}.');
          case 'div_more': return t('stem.arithmetic.we_div_more', 'Take {y} more groups: {b} × {y} = {ans}.');
          case 'div_sub2': return t('stem.arithmetic.we_div_sub2', 'Subtract again: {x} − {z} = {ans}. That is the remainder.');
          default: return t('stem.arithmetic.we_div_total', 'Count the groups: 10 + {y} = {ans}.');
        }
      }

      function weStageName(stage) {
        if (stage === 0) return t('stem.arithmetic.we_stage_0', 'Example 1: every step is worked for you');
        if (stage === 1) return t('stem.arithmetic.we_stage_1', 'Example 2: you finish the last step');
        if (stage === 2) return t('stem.arithmetic.we_stage_2', 'Example 3: you finish the last two steps');
        return t('stem.arithmetic.we_stage_3', 'Your turn: you do every step');
      }

      function weStrategyName(op) {
        if (op === 'add') return t('stem.arithmetic.we_strategy_add', 'Strategy: partial sums by place value');
        if (op === 'subtract') return t('stem.arithmetic.we_strategy_subtract', 'Strategy: regroup, then subtract each place');
        if (op === 'multiply') return t('stem.arithmetic.we_strategy_multiply', 'Strategy: partial products');
        return t('stem.arithmetic.we_strategy_divide', 'Strategy: partial quotients (take groups in chunks)');
      }

      function renderWorked() {
        var weState = (d.we && typeof d.we === 'object' && d.we[operation]) || {};
        var stage = clampInt(weState.stage, 0, 3, 0);
        var round = clampInt(weState.round, 0, 9999, 0);
        var ex = workedExample(operation, round, stage);
        var blanks = blankCount(stage, ex.steps.length);
        var firstBlank = ex.steps.length - blanks;
        var exKey = operation + '-' + round + '-' + stage;
        var inputs = d.weKey === exKey && d.weInputs && typeof d.weInputs === 'object' ? d.weInputs : {};
        var feedback = d.weKey === exKey ? d.weFeedback : null;
        var allDone = blanks === 0 || feedback === 'correct';
        function setInput(i, value) {
          update(function (current) {
            var same = current.weKey === exKey && current.weInputs && typeof current.weInputs === 'object';
            var next = Object.assign({}, same ? current.weInputs : {});
            next[i] = value;
            return { weKey: exKey, weInputs: next, weFeedback: null, weWrongStep: null };
          });
        }
        function checkSteps() {
          var wrong = -1;
          for (var i = firstBlank; i < ex.steps.length; i++) {
            if (!numEq(parseNum(inputs[i]), ex.steps[i].ans)) { wrong = i; break; }
          }
          update({ weKey: exKey, weFeedback: wrong < 0 ? 'correct' : 'try', weWrongStep: wrong < 0 ? null : wrong });
          announce(wrong < 0
            ? t('stem.arithmetic.we_correct_sr', 'Every step is right. Go on to the next example.')
            : fill(t('stem.arithmetic.we_try_sr', 'Step {n} is not right yet. Redo that step with the numbers it names.'), { n: wrong + 1 }));
        }
        function advance() {
          update(function (current) {
            var all = Object.assign({}, current.we && typeof current.we === 'object' ? current.we : {});
            all[operation] = stage >= 3 ? { stage: 0, round: round + 1 } : { stage: stage + 1, round: round };
            return { we: all, weKey: null, weInputs: {}, weFeedback: null, weWrongStep: null };
          });
          announce(stage >= 3 ? t('stem.arithmetic.we_new_round_sr', 'A new set of examples starts, fully worked again.') : t('stem.arithmetic.we_next_sr', 'Next example. One more step is left for you.'));
        }
        var wrongStep = d.weKey === exKey ? d.weWrongStep : null;
        // Read the worked steps; a step the student still has to finish is
        // read as a blank, never with its answer.
        function weReadText() {
          var blankWord = t('stem.arithmetic.tts_blank', 'blank');
          var lines = [weStrategyName(operation), weStageName(stage), fill(t('stem.arithmetic.tts_problem', 'The problem is {a} {sym} {b}.'), { a: ex.a, sym: opMeta.symbol, b: ex.b })];
          ex.steps.forEach(function (step, i) {
            var open = i < firstBlank || feedback === 'correct';
            lines.push(fill(t('stem.arithmetic.we_step_number', 'Step {n}.'), { n: i + 1 }) + ' ' + fill(weTemplate(step.key), Object.assign({}, step.vals, { ans: open ? step.ans : blankWord })));
          });
          return lines.join(' ');
        }
        return h('section', { className: 'rounded-xl p-3 space-y-2', 'data-worked-example': exKey, 'data-worked-blanks': blanks, style: { background: card, border: '1px solid ' + border } },
          h('h3', { className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.we_title', 'Worked examples that fade')),
          h('p', { className: 'text-xs', style: { color: muted } }, weStrategyName(operation)),
          h('p', { className: 'text-sm font-bold' }, weStageName(stage)),
          h('p', { className: 'font-mono text-lg font-black' }, ex.a + ' ' + opMeta.symbol + ' ' + ex.b),
          h('ol', { className: 'space-y-2 text-sm' }, ex.steps.map(function (step, i) {
            var template = weTemplate(step.key);
            var filled = fill(template, step.vals);
            var parts = filled.split('{ans}');
            var isBlank = i >= firstBlank;
            var stepLabel = fill(t('stem.arithmetic.we_step_input', 'Step {n} answer'), { n: i + 1 });
            return h('li', { key: i, className: 'flex flex-wrap items-center gap-1', 'data-we-step': i, style: { borderLeft: '3px solid ' + (wrongStep === i ? '#d97706' : border), paddingLeft: 8 } },
              h('span', { className: 'font-bold mr-1' }, fill(t('stem.arithmetic.we_step_number', 'Step {n}.'), { n: i + 1 })),
              h('span', null, parts[0]),
              isBlank
                ? h('input', { type: 'number', 'aria-label': stepLabel, value: inputs[i] == null ? '' : String(inputs[i]), disabled: feedback === 'correct', onChange: function (e) { setInput(i, e.target.value); }, className: 'rounded-lg px-2 py-1 font-mono w-24', style: inputStyle })
                : h('strong', { className: 'font-mono' }, step.ans),
              h('span', null, parts.slice(1).join('')));
          })),
          allDone && h('p', { className: 'text-sm font-bold' }, fill(ex.op === 'divide'
            ? t('stem.arithmetic.we_result_div', 'So {a} ÷ {b} = {q} remainder {r}.')
            : t('stem.arithmetic.we_result', 'So {a} {sym} {b} = {r}.'), { a: ex.a, b: ex.b, sym: opMeta.symbol, q: ex.answer, r: ex.op === 'divide' ? ex.remainder : ex.answer })),
          feedback === 'try' && feedbackPanel(false, fill(t('stem.arithmetic.we_try', 'Step {n} is not right yet. Redo that step with the numbers it names.'), { n: wrongStep + 1 })),
          h('div', { className: 'flex flex-wrap gap-2' },
            blanks > 0 && feedback !== 'correct' && h('button', { type: 'button', onClick: checkSteps, disabled: ex.steps.slice(firstBlank).some(function (_, k) { var v = inputs[firstBlank + k]; return v == null || v === ''; }), className: 'rounded-lg px-3 py-2 text-xs font-black disabled:opacity-40', style: solidAccent(opMeta) }, t('stem.arithmetic.we_check', 'Check my steps')),
            h('button', { type: 'button', onClick: advance, disabled: !allDone, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: ghostStyle }, stage >= 3 ? t('stem.arithmetic.we_new_round', 'Start a new set of examples') : t('stem.arithmetic.we_next', 'Next example')),
            renderReadAloud('worked', weReadText, t('stem.arithmetic.read_steps_aloud', 'Read the steps aloud'))
          )
        );
      }

      // ---------------------------------------------------------- "Start here" learning path
      function pathStepName(id) {
        switch (id) {
          case 'k2_make_ten': return t('stem.arithmetic.path_k2_make_ten', 'Make a ten');
          case 'k2_add20': return t('stem.arithmetic.path_k2_add20', 'Add within 20');
          case 'k2_sub20': return t('stem.arithmetic.path_k2_sub20', 'Subtract within 20');
          case 'k2_add100': return t('stem.arithmetic.path_k2_add100', 'Add within 100');
          case 'k2_sub100': return t('stem.arithmetic.path_k2_sub100', 'Subtract within 100');
          case 'g3_add1000': return t('stem.arithmetic.path_g3_add1000', 'Place value: add within 1,000');
          case 'g3_sub1000': return t('stem.arithmetic.path_g3_sub1000', 'Place value: subtract within 1,000');
          case 'g3_mul100': return t('stem.arithmetic.path_g3_mul100', 'Multiply within 100');
          case 'g3_multens': return t('stem.arithmetic.path_g3_multens', 'Multiply by multiples of 10');
          case 'g3_div100': return t('stem.arithmetic.path_g3_div100', 'Divide within 100');
          case 'g4_addmulti': return t('stem.arithmetic.path_g4_addmulti', 'Add multi-digit numbers');
          case 'g4_submulti': return t('stem.arithmetic.path_g4_submulti', 'Subtract multi-digit numbers');
          case 'g4_mulmx1': return t('stem.arithmetic.path_g4_mulmx1', 'Multiply a multi-digit number by a 1-digit number');
          case 'g4_mul2x2': return t('stem.arithmetic.path_g4_mul2x2', 'Multiply two 2-digit numbers');
          case 'g4_divrem': return t('stem.arithmetic.path_g4_divrem', 'Divide with remainders');
          case 'g4_bars': return t('stem.arithmetic.path_g4_bars', 'Solve stories with bar models');
          case 'g5_dec_addsub': return t('stem.arithmetic.path_g5_dec_addsub', 'Add and subtract decimals');
          case 'g5_dec_mul': return t('stem.arithmetic.path_g5_dec_mul', 'Multiply a decimal by a whole number');
          case 'g5_divlong': return t('stem.arithmetic.path_g5_divlong', 'Long division by 2-digit numbers');
          default: return t('stem.arithmetic.path_g5_divdec', 'Divide decimals by whole numbers');
        }
      }
      function pathStepDesc(id) {
        switch (id) {
          case 'k2_make_ten': return t('stem.arithmetic.path_k2_make_ten_desc', 'Number talks: add by making a ten first, as in 8 + 5 = 10 + 3.');
          case 'k2_add20': return t('stem.arithmetic.path_k2_add20_desc', 'Addition facts to 20. Use a model or a fact you know.');
          case 'k2_sub20': return t('stem.arithmetic.path_k2_sub20_desc', 'Subtraction facts to 20. Think addition: for 13 − 5, what goes with 5 to make 13?');
          case 'k2_add100': return t('stem.arithmetic.path_k2_add100_desc', 'Add tens and ones, and regroup 10 ones as 1 ten.');
          case 'k2_sub100': return t('stem.arithmetic.path_k2_sub100_desc', 'Subtract tens and ones, and regroup 1 ten as 10 ones when you need more ones.');
          case 'g3_add1000': return t('stem.arithmetic.path_g3_add1000_desc', 'Add hundreds, tens and ones, and regroup when a place makes 10 or more.');
          case 'g3_sub1000': return t('stem.arithmetic.path_g3_sub1000_desc', 'Subtract place by place, and regroup from the next place when you need to.');
          case 'g3_mul100': return t('stem.arithmetic.path_g3_mul100_desc', 'Equal groups and arrays: facts up to 10 × 10.');
          case 'g3_multens': return t('stem.arithmetic.path_g3_multens_desc', 'Use place value: 4 × 30 is 4 × 3 tens, which is 12 tens, or 120.');
          case 'g3_div100': return t('stem.arithmetic.path_g3_div100_desc', 'Share equally, or find the missing factor: 24 ÷ 6 asks 6 × ? = 24.');
          case 'g4_addmulti': return t('stem.arithmetic.path_g4_addmulti_desc', 'Add thousands with the standard algorithm, and check with an estimate.');
          case 'g4_submulti': return t('stem.arithmetic.path_g4_submulti_desc', 'Regroup across places, even across zeros, and check with an estimate.');
          case 'g4_mulmx1': return t('stem.arithmetic.path_g4_mulmx1_desc', 'Break the big number apart by place value and add the partial products.');
          case 'g4_mul2x2': return t('stem.arithmetic.path_g4_mul2x2_desc', 'Four partial products: tens × tens, tens × ones, ones × tens and ones × ones.');
          case 'g4_divrem': return t('stem.arithmetic.path_g4_divrem_desc', 'Divide by a 1-digit number. The remainder must be less than the divisor.');
          case 'g4_bars': return t('stem.arithmetic.path_g4_bars_desc', 'Draw the story as a bar model first. The model shows the operation.');
          case 'g5_dec_addsub': return t('stem.arithmetic.path_g5_dec_addsub_desc', 'Line up places with base-ten disks: tenths with tenths, hundredths with hundredths.');
          case 'g5_dec_mul': return t('stem.arithmetic.path_g5_dec_mul_desc', 'Make equal groups of decimal disks, then exchange 10 tenths for 1 one.');
          case 'g5_divlong': return t('stem.arithmetic.path_g5_divlong_desc', 'Estimate each digit of the quotient, multiply, subtract and bring down.');
          default: return t('stem.arithmetic.path_g5_divdec_desc', 'Share a decimal amount equally and keep each digit in its place.');
        }
      }

      var pathBand = BANDS.indexOf(homeBand) >= 0 ? homeBand : 'g5';
      var path = pathProgress(pathBand, d, allowedOps);
      path.steps.forEach(function (s) { if (s.kind === 'dec' && teacher.decMode && teacher.decMode !== s.mode) s.available = false; });
      path.next = (path.steps.filter(function (s) { return s.available && !s.done; })[0] || {}).id || null;

      function startPathStep(step) {
        if (!step.available) return;
        var base = teacher.lockBand ? {} : { genBand: pathBand };
        var allowedHere = function (gen, skip) { var i = nextAllowedIndex(gen, 0, allowedOps, skip); return i < 0 ? 0 : i; };
        if (step.kind === 'skill') {
          var solved = mapOf('genSolved'), seed = 1, guard = 0;
          while (solved[step.skill + '-' + seed] && guard++ < 500) seed++;
          update(Object.assign({ tab: 'practice', operation: SKILLS[step.skill].op, practiceSource: 'generated', genSkill: step.skill, genSeed: seed, practiceProblemId: null }, resetItemPatch(), base));
        } else if (step.kind === 'talk') {
          var ntDone = mapOf('ntSolved');
          update(Object.assign({ tab: 'mental', mmMode: 'talk', ntFocus: step.focus, ntIndex: allowedHere(function (i) { return genMentalItem('nt', pathBand, i); }, function (p) { return p.key !== step.focus || !!ntDone[p.id]; }), ntFor: null, ntPick: null, ntAnswer: '', ntTry: 0, ntFeedback: null, ntKind: null, ntExplain: '', tfFor: null, tfMoved: 0 }, base));
        } else if (step.kind === 'bars') {
          var barDone = mapOf('barSolved');
          update(barReset(Object.assign({ tab: 'bars', barIndex: allowedHere(function (i) { return genBarProblem(pathBand, i); }, function (q) { return (q.twoStep && !teacher.twoStep) || !!barDone[q.id]; }), barFor: null, barStep: 0 }, base)));
        } else {
          var decDone = mapOf('decSolved');
          update(Object.assign({ tab: 'decimals', decMode: step.mode, decIndex: allowedHere(function (i) { return genDecimalItem(step.mode, pathBand, i); }, function (q) { return !!decDone[q.id]; }), decFor: null, decAnswer: '', decTry: 0, decFeedback: null, decKind: null, decStep: 0 }, base));
        }
        announce(fill(t('stem.arithmetic.path_opened_sr', '{name} is open below.'), { name: pathStepName(step.id) }));
        // Land on the problem itself: its first open control gets focus and
        // is brought into view (no smooth scroll under reduced motion).
        var targets = step.kind === 'skill' ? ['[data-practice-problem-id] ~ div input:not([disabled])']
          : step.kind === 'talk' ? ['[data-ten-frame-counter][tabindex="0"]', '[data-nt-answer]:not([disabled])', '[data-nt-pick]:not([disabled])']
            : step.kind === 'bars' ? ['[data-bar-model]:not([disabled])', '[data-bar-problem] button:not([disabled])']
              : ['[data-dec-item] input:not([disabled])'];
        focusProblem(targets);
      }

      // Only when focus was dropped (the control just became disabled or left the page).
      function rescueFocus(selector) {
        if (typeof document === 'undefined' || typeof setTimeout !== 'function') return;
        setTimeout(function () {
          var active = document.activeElement;
          if (active && active !== document.body && !active.disabled) return;
          var el = document.querySelector(selector);
          if (el && typeof el.focus === 'function') el.focus();
        }, 40);
      }

      function focusProblem(targets) {
        if (typeof document === 'undefined' || typeof setTimeout !== 'function') return;
        setTimeout(function () {
          var panel = document.getElementById('arithmetic-studio-panel');
          if (!panel) return;
          var el = null;
          for (var k = 0; k < targets.length && !el; k++) el = panel.querySelector(targets[k]);
          if (!el) el = panel;
          var calm = false;
          try { calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { calm = false; }
          if (typeof el.scrollIntoView === 'function') { try { el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' }); } catch (e2) { /* older browsers */ } }
          try { el.focus({ preventScroll: true }); } catch (e3) { if (typeof el.focus === 'function') el.focus(); }
        }, 40);
      }

      // Compact by default (one "Next" card), so the problem sits near the top;
      // the whole list opens on request (pathHidden === false).
      function renderPath() {
        var hidden = d.pathHidden !== false;
        var total = path.steps.length;
        var nextStep = path.steps.filter(function (s) { return s.id === path.next; })[0] || null;
        return h('section', { 'data-arithmetic-path': pathBand, 'data-path-compact': hidden ? 'true' : 'false', 'aria-labelledby': 'arithmetic-path-title', className: 'rounded-xl p-3 space-y-2', style: { background: card, border: '1px solid ' + border } },
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
            h('h2', { id: 'arithmetic-path-title', className: 'text-sm font-black', style: { color: accentText } }, fill(t('stem.arithmetic.path_title', 'Start here: {band}'), { band: bandLabel(t, pathBand) })),
            h('span', { className: 'text-xs font-bold', 'data-path-done': path.doneCount }, fill(t('stem.arithmetic.path_summary', '{n} of {m} done'), { n: path.doneCount, m: total })),
            h('button', { type: 'button', 'aria-expanded': !hidden, 'aria-controls': hidden ? undefined : 'arithmetic-path-list', onClick: function () { update({ pathHidden: !hidden }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, hidden ? t('stem.arithmetic.path_show_all', 'Show all steps') : t('stem.arithmetic.path_hide', 'Hide the steps'))),
          hidden && nextStep && h('div', { 'data-path-next-card': nextStep.id, className: 'flex flex-wrap items-center gap-2 rounded-lg p-2', style: { background: bg, color: text, border: '2px solid ' + themeAccent(opMeta) } },
            h('p', { className: 'text-sm font-black', style: { flex: '1 1 180px' } },
              fill(t('stem.arithmetic.path_next_line', 'Next: {name}'), { name: pathStepName(nextStep.id) }),
              h('span', { className: 'block text-xs font-normal' }, fill(t('stem.arithmetic.path_count', '{n} of {m} solved.'), { n: nextStep.count, m: nextStep.target }))),
            h('button', { type: 'button', 'data-path-go': nextStep.id, 'aria-label': fill(nextStep.count > 0 ? t('stem.arithmetic.path_continue_aria', 'Continue: {name}') : t('stem.arithmetic.path_start_aria', 'Start: {name}'), { name: pathStepName(nextStep.id) }), onClick: function () { startPathStep(nextStep); }, className: 'rounded-lg px-4 py-2 text-sm font-black', style: solidAccent(opMeta) },
              nextStep.count > 0 ? t('stem.arithmetic.path_continue', 'Continue') : t('stem.arithmetic.path_start', 'Start'))),
          hidden && !nextStep && h('p', { className: 'text-sm font-bold', 'data-path-all-done': true }, t('stem.arithmetic.path_all_done', 'You finished every step. Keep going in any tab.')),
          !hidden && h('p', { className: 'text-xs', style: { color: muted } }, fill(t('stem.arithmetic.path_intro', 'Work through these in order. A step is done after {n} problems solved without showing the answer. Every other activity stays open in the tabs below.'), { n: PATH_TARGET })),
          !hidden && h('ol', { id: 'arithmetic-path-list', className: 'grid sm:grid-cols-2 lg:grid-cols-3 gap-2' }, path.steps.map(function (s, i) {
            var isNext = s.id === path.next;
            var status = !s.available ? t('stem.arithmetic.path_off', 'Turned off by your teacher.')
              : s.done ? t('stem.arithmetic.path_done', 'Done.')
                : fill(t('stem.arithmetic.path_count', '{n} of {m} solved.'), { n: s.count, m: s.target });
            return h('li', { key: s.id, 'data-path-step': s.id, 'data-path-state': !s.available ? 'off' : s.done ? 'done' : isNext ? 'next' : 'todo', className: 'rounded-lg p-2 space-y-1 text-xs', style: { background: bg, color: text, border: (isNext ? '2px solid ' + themeAccent(opMeta) : '1px solid ' + border) } },
              h('p', { className: 'font-black' },
                h('span', { 'aria-hidden': 'true' }, (s.done ? '✓ ' : '') + (i + 1) + '. '),
                pathStepName(s.id)),
              h('p', { className: 'font-normal' }, pathStepDesc(s.id)),
              h('p', { className: 'font-bold' }, isNext ? fill(t('stem.arithmetic.path_next_status', 'Next up. {status}'), { status: status }) : status),
              s.available && h('button', { type: 'button', 'data-path-go': s.id, 'aria-label': fill(s.done ? t('stem.arithmetic.path_again_aria', 'Practise again: {name}') : s.count > 0 ? t('stem.arithmetic.path_continue_aria', 'Continue: {name}') : t('stem.arithmetic.path_start_aria', 'Start: {name}'), { name: pathStepName(s.id) }), onClick: function () { startPathStep(s); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: isNext ? solidAccent(opMeta) : ghostStyle },
                s.done ? t('stem.arithmetic.path_again', 'Practise again') : s.count > 0 ? t('stem.arithmetic.path_continue', 'Continue') : t('stem.arithmetic.path_start', 'Start')));
          })));
      }

      function renderLinks() {
        return h('nav', { className: 'rounded-xl p-3 flex flex-wrap items-center gap-2', 'aria-label': t('stem.arithmetic.related_tools', 'Related tools'), style: { background: card, border: '1px solid ' + border } },
          h('span', { className: 'text-xs font-bold', style: { color: muted } }, t('stem.arithmetic.related_tools', 'Related tools')),
          h('button', { type: 'button', 'data-arithmetic-link': 'multtable', onClick: function () { openTool('multtable'); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.link_multtable', 'Multiplication Table: practise the facts')),
          h('button', { type: 'button', 'data-arithmetic-link': 'areamodel', onClick: function () { openTool('areamodel'); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.link_areamodel', 'Area Model: build products with tiles')),
          h('button', { type: 'button', 'data-arithmetic-link': 'numberline', onClick: function () { openTool('numberline'); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.link_numberline', 'Number Line: jump strategies')),
          h('button', { type: 'button', 'data-arithmetic-link': 'base10', onClick: function () { openTool('base10'); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.link_base10', 'Base-ten blocks: build numbers by place'))
        );
      }

      function renderLearn() {
        var aProblem = operandProblem('a'), bProblem = operandProblem('b');
        var predicted = d.learnPredictionSig === learnSig ? d.learnPredictionResult : null;
        var showExact = predicted === 'correct' || showSteps || d.learnRevealSig === learnSig;
        var predictionInput = d.learnPrediction == null ? '' : String(d.learnPrediction);
        var predictionRemainder = d.learnPredictionRemainder == null ? '' : String(d.learnPredictionRemainder);
        return h(React.Fragment, null,
          h('div', { className: 'grid sm:grid-cols-2 gap-3' },
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.first_number', 'First number'),
              h('input', { type: 'number', min: 0, max: 99999, inputMode: 'numeric', value: aDraft != null ? aDraft : String(a), 'aria-invalid': aProblem ? 'true' : undefined, 'aria-describedby': aProblem ? 'arithmetic-a-note' : undefined, onChange: function (e) { onOperandInput('a', e.target.value); }, onBlur: onOperandBlur, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle }),
              aProblem && h('span', { id: 'arithmetic-a-note', className: 'mt-1 block font-normal', style: { color: muted } }, aProblem)),
            h('label', { className: 'text-xs font-bold' }, operation === 'divide' ? t('stem.arithmetic.divisor', 'Divisor') : t('stem.arithmetic.second_number', 'Second number'),
              h('input', { type: 'number', min: bMin, max: 9999, inputMode: 'numeric', value: bDraft != null ? bDraft : String(b), 'aria-invalid': bProblem ? 'true' : undefined, 'aria-describedby': bProblem ? 'arithmetic-b-note' : undefined, onChange: function (e) { onOperandInput('b', e.target.value); }, onBlur: onOperandBlur, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle }),
              bProblem && h('span', { id: 'arithmetic-b-note', className: 'mt-1 block font-normal', style: { color: muted } }, bProblem))
          ),
          operation === 'subtract' && h('p', { className: 'text-xs font-semibold', style: { color: muted } }, t('stem.arithmetic.this_whole_number_workspace_keeps_the_', 'This whole-number workspace keeps the second number at or below the first. Use an integer number line when a negative result is the learning goal.')),
          subtractInvalid && h('div', { role: 'status', 'data-subtract-invalid': true, className: 'rounded-xl p-3 text-sm space-y-2', style: { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' } },
            h('p', null, fill(t('stem.arithmetic.subtract_invalid', 'The first number ({a}) is smaller than the second ({b}). Whole-number subtraction here needs the first number to be at least as large. When you leave the box, the second number will be lowered to {a}.'), { a: a, b: b })),
            h('button', { type: 'button', onClick: swapOperands, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: isContrast ? ghostStyle : btnStyle({ background: '#ffffff', color: '#92400e', border: '1px solid #f59e0b' }) }, t('stem.arithmetic.swap_numbers', 'Swap the two numbers'))),
          !subtractInvalid && renderEquation(a, b, operation),
          // The disks and their move come right after the problem; the prediction card sits beside
          // them on wide screens and wraps directly below them on narrow ones.
          !subtractInvalid && h('div', { 'data-learn-workspace': true, style: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 } },
            showModel && h('div', { 'data-learn-model': true, style: { flex: '2 1 420px', minWidth: 0 } }, renderModel(operation, a, b)),
            h('div', { 'data-learn-side': true, className: 'space-y-3', style: { flex: '1 1 300px', minWidth: 0 } },
              h('section', { className: 'rounded-xl p-3 space-y-2', 'data-learn-predict': true, style: { background: card, border: '1px solid ' + border } },
                h('h3', { className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.predict_title', 'Predict, then check')),
                h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.predict_intro', 'Before you open the steps, predict the exact result. Then use the model to check your thinking.')),
                h('div', { className: 'flex flex-wrap items-end gap-2' },
                  h('label', { className: 'text-xs font-bold' }, operation === 'divide' ? t('stem.arithmetic.predict_quotient', 'Predicted quotient') : t('stem.arithmetic.predict_result', 'Predicted result'),
                    h('input', { type: 'number', value: predictionInput, onChange: function (e) { update({ learnPrediction: e.target.value, learnPredictionSig: null }); }, className: 'mt-1 block w-32 rounded-lg px-3 py-2 font-mono', style: inputStyle })),
                  operation === 'divide' && h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.predict_remainder', 'Predicted remainder'),
                    h('input', { type: 'number', min: 0, value: predictionRemainder, onChange: function (e) { update({ learnPredictionRemainder: e.target.value, learnPredictionSig: null }); }, className: 'mt-1 block w-32 rounded-lg px-3 py-2 font-mono', style: inputStyle })),
                  h('button', { type: 'button', onClick: checkLearnPrediction, disabled: predictionInput === '' || (operation === 'divide' && predictionRemainder === ''), className: 'rounded-lg px-3 py-2 text-xs font-black disabled:opacity-40', style: solidAccent(opMeta) }, t('stem.arithmetic.predict_check', 'Check my prediction'))),
                predicted === 'correct' && feedbackPanel(true, fill(t('stem.arithmetic.predict_correct', 'Your prediction is right: {a} {sym} {b} = {r}.'), { a: a, sym: opMeta.symbol, b: b, r: operation === 'divide' ? fill(t('stem.arithmetic.answer_with_remainder', '{q} remainder {r}'), { q: customResult.answer, r: customResult.remainder }) : customResult.answer })),
                predicted === 'try' && feedbackPanel(false, [
                  h('p', { key: 'own' }, fill(t('stem.arithmetic.predict_yours', 'Your prediction: {g}.'), { g: operation === 'divide' ? fill(t('stem.arithmetic.answer_with_remainder', '{q} remainder {r}'), { q: predictionInput, r: predictionRemainder }) : predictionInput })),
                  h('p', { key: 'why', className: 'font-normal' }, errorKindFeedback(d.learnPredictionKind, { op: operation, a: a, b: b, answer: customResult.answer, fact: isBasicFact(operation, a, b) }, predictionRemainder))
                ])),
              h('div', { className: 'flex flex-wrap gap-2' },
                h('button', { type: 'button', onClick: function () { update({ showModel: !showModel }); }, 'aria-pressed': showModel, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(showModel) }, showModel ? t('stem.arithmetic.hide_model', 'Hide model') : t('stem.arithmetic.show_model', 'Show model')),
                h('button', { type: 'button', onClick: function () { update({ showSteps: !showSteps }); }, 'aria-expanded': showSteps, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(showSteps) }, showSteps ? t('stem.arithmetic.hide_strategy_steps', 'Hide strategy steps') : t('stem.arithmetic.reveal_strategy_steps', 'Reveal strategy steps')),
                renderReadAloud('learn', learnReadText, t('stem.arithmetic.read_strategy_aloud', 'Read strategy aloud'))
              ))),
          !subtractInvalid && showModel && renderBridge(operation, a, b),
          !subtractInvalid && showSteps && h('ol', { className: 'space-y-2', 'aria-label': t('stem.arithmetic.strategy_steps', 'Strategy steps') }, customSteps.map(function (step, i) { return h('li', { key: i, className: 'rounded-xl p-3 text-sm flex gap-3', style: { background: card, border: '1px solid ' + border } }, h('span', { className: 'shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-black', style: { background: themeAccent(opMeta), color: isContrast ? '#000000' : '#ffffff' } }, i + 1), h('span', null, step)); })),
          renderPlaceTable(a, b, operation),
          !subtractInvalid && h('div', { className: 'rounded-xl p-3 text-xs space-y-2', 'data-reasonableness': true, style: { background: themeSoft(opMeta), color: themeSoftText() } },
            h('p', null, customEstimate.estimate == null ? t('stem.arithmetic.no_estimate', 'There is no estimate for division by zero.') : !learnTotalOpen && numEq(customEstimate.estimate, customResult.answer) ? t('stem.arithmetic.reasonableness_exact_hidden', 'Reasonableness check: these numbers are already friendly, so an estimate would be the exact result.') : fill(t('stem.arithmetic.reasonableness_line', 'Reasonableness check: with friendly numbers, {expr} is about {est}.'), { expr: customEstimate.expression, est: customEstimate.estimate })),
            showExact
              ? h('p', { className: 'font-bold' }, fill(customResult.remainder
                ? t('stem.arithmetic.exact_result_rem', 'The exact result is {r} remainder {rem}.')
                : t('stem.arithmetic.exact_result', 'The exact result is {r}.'), { r: customResult.answer, rem: customResult.remainder }))
              : h('button', { type: 'button', onClick: function () { update({ learnRevealSig: learnSig }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: isContrast ? ghostStyle : btnStyle({ background: '#ffffff', color: '#0f172a', border: '1px solid ' + opMeta.color }) }, t('stem.arithmetic.show_exact_result', 'Show the exact result'))),
          renderWorked()
        );
      }

      // ---------------------------------------------------------- practice tab
      function renderPracticeSourcePicker() {
        return h('div', { role: 'group', 'aria-label': t('stem.arithmetic.practice_type', 'Practice type'), className: 'flex flex-wrap gap-2' },
          [['generated', t('stem.arithmetic.source_generated', 'Endless practice')], ['set', t('stem.arithmetic.source_set', 'Practice set')]].map(function (item) {
            var on = practiceSource === item[0];
            return h('button', { key: item[0], type: 'button', 'data-practice-source': item[0], 'aria-pressed': on, onClick: function () {
              if (on) return;
              update(Object.assign({ practiceSource: item[0], practiceProblemId: null }, resetItemPatch()));
            }, className: 'rounded-xl px-3 py-2 text-xs font-bold', style: Object.assign(toggleStyle(on), { flex: '1 1 140px' }) }, item[1]);
          })
        );
      }

      function renderGeneratedPickers() {
        return h('div', { className: 'space-y-2' },
          !teacher.lockBand && h('div', { role: 'group', 'aria-label': t('stem.arithmetic.grade_band', 'Grade band'), className: 'flex flex-wrap gap-2' },
            BANDS.map(function (bandId) {
              var on = band === bandId;
              return h('button', { key: bandId, type: 'button', 'data-arithmetic-band': bandId, 'aria-pressed': on, onClick: function () {
                if (on) return;
                update(Object.assign({ genBand: bandId, genSkill: null, practiceProblemId: null }, resetItemPatch()));
                announce(fill(t('stem.arithmetic.band_selected', '{band} selected.'), { band: bandLabel(t, bandId) }));
              }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(on) }, bandLabel(t, bandId));
            })),
          teacher.lockBand && h('p', { className: 'text-xs font-bold', style: { color: muted } }, fill(t('stem.arithmetic.band_locked', 'Your teacher set the grade band: {band}.'), { band: bandLabel(t, band) })),
          h('div', { role: 'group', 'aria-label': t('stem.arithmetic.skill', 'Skill'), className: 'flex flex-wrap gap-2' },
            skillList.map(function (skill) {
              var on = genSkill === skill;
              return h('button', { key: skill, type: 'button', 'data-arithmetic-skill': skill, 'aria-pressed': on, onClick: function () {
                if (on) return;
                selectGenerated(skill, genSeed, fill(t('stem.arithmetic.skill_selected', '{skill} selected.'), { skill: skillLabel(t, skill) }));
              }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(on) }, skillLabel(t, skill));
            }))
        );
      }

      function renderPractice() {
        var solved = practiceSolvedNow;
        var revealed = !solved && practiceFeedback === 'revealed';
        var savedEstimate = (d.practiceEstimates || {})[problem.id];
        var displayedEstimate = solved ? String(savedEstimate != null ? savedEstimate : (problem.estimate != null ? problem.estimate : '')) : practiceEstimateInput;
        var displayedAnswer = solved ? fmtNum(problem.answer) : practiceAnswerInput;
        var displayedRemainder = solved && problem.hasRemainder ? String(problem.remainder || 0) : practiceRemainderInput;
        var visibleFeedback = solved ? 'correct' : practiceFeedback;
        var est = needsEstimate && displayedEstimate !== '' ? assessEstimate(problem.op, problem.a, problem.b, displayedEstimate) : null;
        var answerLocked = solved || revealed || (needsEstimate && !estimateLocked);
        var numberProps = problem.decimal ? { step: 'any', inputMode: 'decimal' } : { step: 1, inputMode: 'numeric' };
        var vals = { a: fmtNum(problem.a), b: fmtNum(problem.b), sym: sym(problem.op), x: answerText(problem), e: displayedEstimate };
        var progressText = practiceSource === 'set'
          ? fill(t('stem.arithmetic.progress_set', '{n}/{m} correct'), { n: countSolved(d.practiceSolved, PRACTICE_IDS), m: d.attempts || 0 })
          : fill(t('stem.arithmetic.progress_gen', '{n} solved'), { n: genSolvedCount(d) });
        var feedbackNode = null;
        if (visibleFeedback === 'correct') {
          var diff = est && isFinite(est.value) ? fmtNum(Math.abs(est.value - problem.answer)) : null;
          feedbackNode = feedbackPanel(true, [
            h('p', { key: 'main' }, needsEstimate ? t('stem.arithmetic.correct_your_exact_answer_and_estimate', 'Correct. Your exact answer and estimate support each other.') : fill(t('stem.arithmetic.correct_fact', 'Correct. {a} {sym} {b} = {x}.'), vals)),
            needsEstimate && displayedEstimate !== '' && diff != null && h('p', { key: 'echo', className: 'font-normal', 'data-estimate-echo': true }, fill(t('stem.arithmetic.estimate_echo', 'Your estimate was {e}. The exact answer is {x}, a difference of {diff}.'), Object.assign({ diff: diff }, vals))),
            practiceRevealedNow && h('p', { key: 'nocredit', className: 'font-normal' }, t('stem.arithmetic.no_credit_after_reveal', 'The answer had been shown earlier, so this one earns no points.')),
            repeatNoCreditNote('practice', problem.id),
            h('p', { key: 'steps', className: 'mt-1 text-xs font-normal' }, strategySteps(problem.op, problem.a, problem.b, t).join(' '))
          ]);
        } else if (visibleFeedback === 'estimate') {
          feedbackNode = feedbackPanel(false, t('stem.arithmetic.exact_right_revise_estimate', 'Your exact answer is right. Revise the estimate so it is within a reasonable range: round each number to a friendly number first.'));
        } else if (visibleFeedback === 'try') {
          feedbackNode = feedbackPanel(false, [
            h('p', { key: 'named', 'data-named-error': practiceErrorKind || 'none' }, errorKindFeedback(practiceErrorKind, problem, practiceRemainderInput)),
            h('p', { key: 'next', className: 'font-normal' }, tryNextLine(practiceTry))
          ]);
        } else if (revealed) {
          feedbackNode = feedbackPanel(false, [
            h('p', { key: 'answer', 'data-practice-revealed': true }, fill(t('stem.arithmetic.revealed_answer', 'The answer is {x}. This one earns no points, and it stays on your missed list so you can try it again later.'), vals)),
            practiceErrorKind && h('p', { key: 'named', className: 'font-normal' }, fill(t('stem.arithmetic.revealed_kind', 'The likely mistake: {kind}.'), { kind: errorKindName(practiceErrorKind) })),
            h('p', { key: 'steps', className: 'mt-1 text-xs font-normal' }, strategySteps(problem.op, problem.a, problem.b, t).join(' '))
          ]);
        }
        // Hint tier after a named miss on + or −: the place-value disks for this
        // problem, final total hidden ("?"); the student makes the trades.
        // It earns no points by itself, and the typed answer still earns them.
        var diskable = (problem.op === 'add' || problem.op === 'subtract') && !problem.decimal && isInt(problem.a) && isInt(problem.b) && (problem.op === 'add' || problem.a >= problem.b) && placeValueStages(problem.op, problem.a, problem.b).stages.length > 1;
        var disksOpen = diskable && practiceStateMatches && !revealed && d.practiceDisksFor === problem.id;
        var disksOffered = diskable && !solved && !revealed && (disksOpen || (practiceStateMatches && d.practiceDisksOffer === problem.id) || (visibleFeedback === 'try' && !!practiceErrorKind && practiceErrorKind !== 'unknown'));
        var estimatePanel = null;
        if (needsEstimate && !solved && estimateStatus && practiceEstimateInput !== '') {
          var ex = est && est.example;
          if (estimateStatus === 'ok') {
            estimatePanel = feedbackPanel(true, [
              h('p', { key: 'own', 'data-estimate-status': 'ok' }, fill(t('stem.arithmetic.estimate_ok', 'Your estimate: {e}. That is reasonable.'), vals)),
              est && est.strategy && h('p', { key: 'how', className: 'font-normal' }, fill(t('stem.arithmetic.estimate_matches', 'It matches rounding to {l} {sym} {r}.'), { l: fmtNum(est.strategy.left), sym: sym(problem.op), r: fmtNum(est.strategy.right) }))
            ]);
          } else if (estimateStatus === 'far') {
            estimatePanel = feedbackPanel(false, h('p', { 'data-estimate-status': 'far' }, fill(t('stem.arithmetic.estimate_far', 'Your estimate {e} is far from what rounding the numbers gives. Round each number to a friendly number, such as the nearest ten or hundred, and estimate again.'), vals)));
          } else if (estimateStatus === 'shown') {
            var exVals = ex ? { e: displayedEstimate, l: fmtNum(ex.left), sym: sym(problem.op), r: fmtNum(ex.right), v: fmtNum(ex.value), lo: fmtNum(est.low), hi: fmtNum(est.high) } : null;
            estimatePanel = feedbackPanel(false, h('p', { 'data-estimate-status': 'shown' }, !ex
              ? fill(t('stem.arithmetic.estimate_shown_none', 'Your estimate: {e}. Round each number to a friendly number, then use that estimate to check your exact answer.'), { e: displayedEstimate })
              : est.high > est.low
                ? fill(t('stem.arithmetic.estimate_shown', 'Your estimate: {e}. One way to estimate: {l} {sym} {r} = {v}. Reasonable estimates for this problem are between {lo} and {hi}.'), exVals)
                : fill(t('stem.arithmetic.estimate_shown_one', 'Your estimate: {e}. One way to estimate: {l} {sym} {r} = {v}.'), exVals)));
          }
        }
        return h(React.Fragment, null,
          h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
            h('div', null,
              h('h2', { className: 'text-base font-black' }, needsEstimate ? t('stem.arithmetic.estimate_solve_and_check', 'Estimate, solve, and check') : t('stem.arithmetic.solve_and_check', 'Solve and check')),
              h('p', { className: 'text-xs', style: { color: muted } }, needsEstimate ? t('stem.arithmetic.estimate_first_note', 'Estimate first, then solve. The estimate is your safety check on the exact answer.') : problem.a && problem.b && isExtendedFact(problem.op, problem.a, problem.b)
                ? t('stem.arithmetic.fact_zeros_note', 'This is a basic fact with zeros on the end, so there is no estimate step: rounding would not change these numbers. Use the fact you know, then place the zeros.')
                : t('stem.arithmetic.fact_note', 'This is a basic fact, so there is no estimate step. Use a model or a fact you know.'))),
            h('span', { className: 'rounded-full px-3 py-1 text-xs font-bold', style: { background: themeSoft(opMeta), color: themeSoftText() } }, progressText)
          ),
          renderPracticeSourcePicker(),
          practiceSource === 'generated' && renderGeneratedPickers(),
          h('div', { 'data-practice-problem-id': problem.id }, renderEquation(problem.a, problem.b, problem.op)),
          h('div', { className: 'grid sm:grid-cols-3 gap-2 items-end' },
            needsEstimate && h('div', { className: 'space-y-1' },
              h('label', { className: 'text-xs font-bold block' }, t('stem.arithmetic.step1_estimate', 'Step 1. Estimate'),
                h('input', Object.assign({ type: 'number', required: true, 'aria-required': 'true', value: displayedEstimate, disabled: solved || estimateLocked, onChange: function (e) { updatePracticeInput('estimateInput', e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') lockEstimate(); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle }, numberProps))),
              !solved && (estimateLocked
                ? (practiceTry === 0 && !practiceFeedback && h('button', { type: 'button', onClick: function () { update({ estimateLocked: false, estimateStatus: null }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold w-full', style: ghostStyle }, t('stem.arithmetic.change_estimate', 'Change my estimate')))
                : h('button', { type: 'button', 'data-lock-estimate': true, onClick: lockEstimate, disabled: practiceEstimateInput === '', className: 'rounded-lg px-3 py-2 text-xs font-black w-full disabled:opacity-40', style: solidAccent(opMeta) }, t('stem.arithmetic.lock_estimate', 'Lock in my estimate')))),
            h('label', { className: 'text-xs font-bold' }, needsEstimate
              ? (problem.op === 'divide' && problem.hasRemainder ? t('stem.arithmetic.step2_quotient', 'Step 2. Quotient') : t('stem.arithmetic.step2_exact', 'Step 2. Exact answer'))
              : (problem.op === 'divide' && problem.hasRemainder ? t('stem.arithmetic.quotient', 'Quotient') : t('stem.arithmetic.exact_answer', 'Exact answer')),
              h('input', Object.assign({ type: 'number', required: true, 'aria-required': 'true', value: displayedAnswer, disabled: answerLocked, 'aria-describedby': needsEstimate && !estimateLocked && !solved ? 'arithmetic-answer-locked' : undefined, onChange: function (e) { updatePracticeInput('answerInput', e.target.value); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle }, numberProps))),
            problem.hasRemainder && h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.remainder_2', 'Remainder'),
              h('input', { type: 'number', min: 0, max: problem.b - 1, step: 1, inputMode: 'numeric', required: true, 'aria-required': 'true', value: displayedRemainder, disabled: answerLocked, onChange: function (e) { updatePracticeInput('remainderInput', e.target.value); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle }))
          ),
          needsEstimate && !estimateLocked && !solved && h('p', { id: 'arithmetic-answer-locked', className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.lock_first', 'Lock in an estimate first. Then the answer box opens.')),
          estimatePanel,
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: checkPractice, disabled: practiceAnswerInput === '' || (needsEstimate && practiceEstimateInput === '') || (problem.hasRemainder && practiceRemainderInput === '') || solved || revealed, className: 'rounded-lg px-4 py-2 text-sm font-black disabled:opacity-40', style: solidAccent(opMeta) }, solved ? t('stem.arithmetic.solved', 'Solved') : t('stem.arithmetic.check_answer', 'Check answer')),
            h('button', { type: 'button', onClick: function () { update({ showPracticeHint: !d.showPracticeHint }); }, 'aria-expanded': !!d.showPracticeHint, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: outlineAccent }, d.showPracticeHint ? t('stem.arithmetic.hide_hint', 'Hide hint') : t('stem.arithmetic.strategy_hint', 'Strategy hint')),
            h('button', { type: 'button', 'data-practice-next': true, onClick: nextPractice, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.next_problem', 'Next problem')),
            h('button', { type: 'button', onClick: retryMissedPractice, disabled: !practiceMissedIds.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: retryStyle }, fill(t('stem.arithmetic.retry_missed_n', 'Retry missed ({n})'), { n: practiceMissedIds.length }))
          ),
          d.showPracticeHint && h('div', { className: 'rounded-xl p-3 text-sm', style: { background: themeSoft(opMeta), color: themeSoftText() } }, hintLine(strategySteps(problem.op, problem.a, problem.b, t)[0], 'practice-hint')),
          feedbackNode,
          disksOffered && h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', 'data-see-disks': problem.id, 'aria-expanded': disksOpen, 'aria-controls': disksOpen ? 'arithmetic-practice-disks' : undefined, onClick: function () {
              update({ practiceDisksFor: disksOpen ? null : problem.id, practiceDisksOffer: problem.id, practiceProblemId: problem.id });
              if (!disksOpen) announce(t('stem.arithmetic.see_disks_sr', 'The disks are shown below the answer. Make each trade yourself, then check your answer again.'));
            }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: outlineAccent }, disksOpen ? t('stem.arithmetic.hide_disks', 'Hide the disks') : t('stem.arithmetic.see_disks', 'See it with disks'))),
          disksOpen && h('div', { id: 'arithmetic-practice-disks' }, renderDiskWalk(problem.op, problem.a, problem.b, { totalOpen: solved, sigKey: 'practiceDiskSig', stepKey: 'practiceDiskStep', id: 'practice' })),
          !solved && !revealed && visibleFeedback !== 'estimate' && revealButton(revealPractice, practiceTry, 'practice'),
          visibleFeedback === 'try' && renderAiHint('practice:' + problem.id, fmtNum(problem.a) + ' ' + sym(problem.op) + ' ' + fmtNum(problem.b), practiceAnswerInput, answerText(problem), practiceTry)
        );
      }

      // ---------------------------------------------------------- error detective tab
      function renderErrors() {
        var solvedCase = errorSolvedNow;
        var eliminatedCase = !solvedCase && errorFeedbackNow === 'eliminated';
        var revealedCase = !solvedCase && (errorFeedbackNow === 'revealed' || eliminatedCase);
        var visibleErrorChoice = solvedCase || revealedCase ? errorCase.answer : d.errorChoice;
        var visibleErrorFeedback = solvedCase ? 'correct' : errorFeedbackNow;
        var keyLabel = (errorCase.choices.filter(function (c) { return c.id === errorCase.answer; })[0] || {}).label;
        var feedbackNode = null;
        if (visibleErrorFeedback === 'correct') feedbackNode = feedbackPanel(true, [h('p', { key: 'm' }, t('stem.arithmetic.good_diagnosis', 'Good diagnosis.')), h('p', { key: 'e', className: 'mt-1 text-xs font-normal' }, errorCase.explain),
          errorRevealedNow && h('p', { key: 'nc', className: 'text-xs font-normal' }, t('stem.arithmetic.no_credit_after_reveal', 'The answer had been shown earlier, so this one earns no points.'))]);
        else if (visibleErrorFeedback === 'try') feedbackNode = feedbackPanel(false, [
          h('p', { key: 'm' }, t('stem.arithmetic.look_again_at_what_happened_to_each_pl', 'Look again at what happened to each place or partial result.')),
          hintLine(errorCase.hint, 'h'),
          h('p', { key: 'n', className: 'font-normal' }, choiceNextLine(errorWrongNow.length || errorTries))
        ]);
        else if (revealedCase) feedbackNode = feedbackPanel(false, [
          h('p', { key: 'k', 'data-error-done': eliminatedCase ? 'eliminated' : 'revealed' }, fill(t('stem.arithmetic.err_revealed', 'The key error: {label}'), { label: keyLabel })),
          h('p', { key: 'e', className: 'mt-1 text-xs font-normal' }, errorCase.explain),
          h('p', { key: 'c', className: 'text-xs font-normal' }, eliminatedCase
            ? t('stem.arithmetic.err_eliminated', 'You found it by ruling out the other choices, so this case earns no points. It stays on your missed list for another try.')
            : t('stem.arithmetic.err_no_points', 'This case earns no points now, and it stays on your missed list.'))
        ]);
        return h(React.Fragment, null,
          h('div', null, h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.error_detective', 'Error Detective')), h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.diagnose_the_reasoning_not_the_learner', 'Diagnose the reasoning, not the learner. Mistakes are evidence about the next useful model.'))),
          h('p', { className: 'text-xs font-bold', style: { color: muted } }, errorCase.generated
            ? fill(t('stem.arithmetic.case_generated', 'Case {n}: a new mistake for {band}'), { n: errorIndex + 1, band: bandLabel(t, band) })
            : fill(t('stem.arithmetic.case_classic', 'Case {n} of 4 classic mistakes'), { n: errorIndex + 1 })),
          h('div', { className: 'rounded-xl p-4', 'data-error-case-id': errorCase.id, style: { background: card, border: '1px solid ' + border } },
            h('p', { className: 'font-black' }, errorCase.prompt),
            h('div', { className: 'mt-2 rounded-lg p-2 font-mono text-sm space-y-1', style: { background: bg } }, errorCase.work.map(function (line, i) { return h('p', { key: i }, line); }))
          ),
          h('div', { role: 'group', 'aria-label': t('stem.arithmetic.choose_the_most_important_error', 'Choose the most important error'), className: 'space-y-2' }, errorCase.choices.map(function (choice) {
            var selected = visibleErrorChoice === choice.id;
            var ruledOut = !solvedCase && !revealedCase && errorWrongNow.indexOf(choice.id) >= 0;
            return h('button', { key: choice.id, type: 'button', 'data-error-choice': choice.id, 'data-ruled-out': ruledOut ? 'true' : undefined, onClick: function () { checkError(choice.id); }, 'aria-pressed': selected, disabled: solvedCase || revealedCase || ruledOut, className: 'w-full rounded-xl p-3 text-left text-sm font-semibold disabled:opacity-70', style: { minHeight: 44, background: selected ? opMeta.soft : card, color: selected ? '#0f172a' : text, border: '1px solid ' + (selected ? opMeta.color : border) } },
              choice.label, ruledOut && h('span', { className: 'block text-xs font-normal' }, t('stem.arithmetic.choice_ruled_out', 'Ruled out: you tried this one.')));
          })),
          feedbackNode,
          visibleErrorFeedback === 'try' && !revealedCase && revealButton(revealError, errorTries, 'errors'),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function () { selectError(errorIndex + 1); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: solidAccent(opMeta) }, t('stem.arithmetic.next_mistake', 'Next mistake')),
            h('button', { type: 'button', onClick: retryMissedError, disabled: !errorMissedIndexes.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: retryStyle }, fill(t('stem.arithmetic.retry_missed_n', 'Retry missed ({n})'), { n: errorMissedIndexes.length })))
        );
      }

      // ---------------------------------------------------------- word problems tab
      function renderApply() {
        var wordSolved = !!(d.wordSolvedCases && d.wordSolvedCases[wordProblem.id]);
        var wordShown = !wordSolved && d.wordFeedback === 'revealed' && (d.wordProblemId == null || d.wordProblemId === wordProblem.id);
        var wordLocked = wordSolved || wordShown;
        var activeWordOperation = wordSolved ? wordProblem.op : selectedWordOperation;
        var displayedWordAnswer = wordSolved ? String(wordExpected.answer) : wordAnswerInput;
        var displayedWordRemainder = wordSolved && wordExpected.requiresRemainder ? String(wordExpected.remainder) : wordRemainderInput;
        var visibleWordFeedback = wordShown ? 'revealed' : (d.wordFeedback === 'revealed' ? null : d.wordFeedback) || (wordSolved ? 'correct' : null);
        var wordMeta = activeWordOperation ? OPERATIONS[activeWordOperation] : null;
        var wordAccent = wordMeta ? themeAccent(wordMeta) : (isContrast ? '#fbbf24' : '#334155');
        var wordSoft = wordMeta ? themeSoft(wordMeta) : (isContrast ? '#000000' : (isDark ? '#334155' : '#f1f5f9'));
        var wordSoftText = wordMeta ? themeSoftText() : (isContrast || isDark ? '#f8fafc' : '#0f172a');
        var retryMessage = visibleWordFeedback === 'operation'
          ? t('stem.arithmetic.that_operation_does_not_represent_the_', 'That operation does not represent the relationship yet. Ask whether the story joins, separates, repeats equal groups, or finds how many groups fit.')
          : visibleWordFeedback === 'remainder'
            ? t('stem.arithmetic.the_whole_number_answer_is_right_re_re', 'The whole-number answer is right. Re-read what the story asks you to do with the amount left over.')
            : t('stem.arithmetic.the_operation_fits_recheck_the_calcula', 'The operation fits. Recheck the calculation and decide whether the context uses a quotient, a remainder, or one more group.');
        var correctMessage = fill(wordExpected.requiresRemainder
          ? t('stem.arithmetic.word_correct_rem', 'Correct. {op} models the story: {x} {unit}, with {r} left over.')
          : t('stem.arithmetic.word_correct', 'Correct. {op} models the story, and the answer is {x} {unit}.'), { op: opLabel(t, wordProblem.op), x: wordExpected.answer, unit: wordText.unit, r: wordExpected.remainder });
        return h(React.Fragment, null,
          h('div', { className: 'flex flex-wrap items-start justify-between gap-2' },
            h('div', null, h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.apply_it_in_context', 'Apply it in context')), h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.choose_the_operation_from_the_story_th', 'Choose the operation from the story, then interpret the result in context.'))),
            h('div', { className: 'flex flex-wrap gap-2 text-xs font-bold' },
              h('span', { className: 'rounded-full px-3 py-1', style: { background: wordSoft, color: wordSoftText } }, fill(t('stem.arithmetic.scenario_n', 'Scenario {n}/{m}'), { n: wordProblemIndex + 1, m: WORD_PROBLEMS.length })),
              h('span', { className: 'rounded-full px-3 py-1', style: { background: '#dcfce7', color: '#166534' } }, fill(t('stem.arithmetic.solved_n', '{n} solved'), { n: countSolved(d.wordSolvedCases, WORD_IDS) })),
              h('span', { className: 'rounded-full px-3 py-1', style: { background: wordMissedIds.length ? '#fef3c7' : '#e2e8f0', color: wordMissedIds.length ? '#92400e' : '#334155' } }, fill(t('stem.arithmetic.to_retry_n', '{n} to retry'), { n: wordMissedIds.length }))
            )
          ),
          h('div', { className: 'rounded-xl p-4', 'data-word-problem-id': wordProblem.id, style: { background: card, border: '1px solid ' + border } },
            h('p', { className: 'text-sm font-semibold leading-relaxed' }, wordText.story)
          ),
          h('fieldset', { className: 'rounded-xl p-3', style: { border: '1px solid ' + border } },
            h('legend', { className: 'px-1 text-xs font-black' }, t('stem.arithmetic.choose_an_operation_for_this_story', 'Choose an operation for this story')),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2', role: 'group', 'aria-label': t('stem.arithmetic.operation_for_the_current_story', 'Operation for the current story') },
              OP_IDS.map(function (op) {
                var meta = OPERATIONS[op];
                var selected = activeWordOperation === op;
                return h('button', {
                  key: op, type: 'button', disabled: wordLocked, 'data-word-operation': op, 'aria-pressed': selected,
                  onClick: function () { chooseWordOperation(op); },
                  className: 'rounded-lg px-3 py-2 text-xs font-black',
                  style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', background: selected ? themeAccent(meta) : card, color: selected ? (isContrast ? '#000000' : '#ffffff') : text, border: '2px solid ' + themeAccent(meta) }
                }, meta.symbol + ' ' + opLabel(t, op));
              })
            )
          ),
          h('div', { className: 'grid sm:grid-cols-2 gap-2' },
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.context_answer', 'Context answer'), h('input', {
              type: 'number', inputMode: 'numeric', value: displayedWordAnswer, disabled: wordLocked,
              onChange: function (e) { update({ wordProblemId: wordProblem.id, wordIndex: wordProblemIndex, wordAnswer: e.target.value, wordFeedback: null }); },
              className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle
            }), h('span', { className: 'mt-1 block font-normal', style: { color: muted } }, fill(t('stem.arithmetic.unit_line', 'Unit: {unit}'), { unit: wordText.unit }))),
            wordExpected.requiresRemainder && h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.amount_left_over', 'Amount left over'), h('input', {
              type: 'number', inputMode: 'numeric', min: 0, max: wordProblem.b - 1, required: true, 'aria-required': 'true', value: displayedWordRemainder, disabled: wordLocked,
              onChange: function (e) { update({ wordProblemId: wordProblem.id, wordIndex: wordProblemIndex, wordRemainder: e.target.value, wordFeedback: null }); },
              className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle
            }))
          ),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: checkWord, disabled: !selectedWordOperation || wordAnswerInput === '' || (wordExpected.requiresRemainder && wordRemainderInput === '') || wordLocked, className: 'rounded-lg px-4 py-2 text-sm font-black disabled:opacity-40', style: btnStyle({ background: wordAccent, color: isContrast ? '#000000' : '#ffffff' }) }, wordSolved ? t('stem.arithmetic.solved', 'Solved') : t('stem.arithmetic.check_response', 'Check response')),
            h('button', { type: 'button', onClick: function () { update({ showWordPlan: !d.showWordPlan }); }, 'aria-expanded': !!d.showWordPlan, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: btnStyle({ background: card, color: text, border: '1px solid ' + wordAccent }) }, d.showWordPlan ? t('stem.arithmetic.hide_planning_scaffold', 'Hide planning scaffold') : t('stem.arithmetic.planning_scaffold', 'Planning scaffold')),
            h('button', { type: 'button', onClick: nextWord, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.next_scenario', 'Next scenario')),
            h('button', { type: 'button', onClick: retryMissedWords, disabled: !wordMissedIds.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: retryStyle }, fill(t('stem.arithmetic.retry_missed_n', 'Retry missed ({n})'), { n: wordMissedIds.length }))
          ),
          d.showWordPlan && h('ol', { className: 'rounded-xl p-3 text-sm space-y-1', style: { background: wordSoft, color: wordSoftText } },
            h('li', null, fill(t('stem.arithmetic.plan_known', '1. Known: {a} and {b}.'), { a: wordProblem.a, b: wordProblem.b })),
            h('li', null, fill(t('stem.arithmetic.plan_unknown', '2. Unknown: {unit}.'), { unit: wordText.unit })),
            h('li', null, t('stem.arithmetic.n_3_relationship_are_quantities_joined_s', '3. Relationship: are quantities joined, separated, repeated in equal groups, or grouped by size?')),
            h('li', null, activeWordOperation ? fill(t('stem.arithmetic.plan_choice', '4. Your operation choice: {op}.'), { op: opLabel(t, activeWordOperation) }) : t('stem.arithmetic.plan_choice_none', '4. Your operation choice: not chosen yet.')),
            h('li', null, t('stem.arithmetic.n_5_context_check_decide_what_the_story_', '5. Context check: decide what the story means when an amount is left over.'))
          ),
          visibleWordFeedback && visibleWordFeedback !== 'revealed' && feedbackPanel(visibleWordFeedback === 'correct', visibleWordFeedback === 'correct'
            ? [h('p', { key: 'm' }, correctMessage), h('p', { key: 'e', className: 'mt-1 text-xs font-normal' }, wordResultExplanation(wordProblem, t)),
              wordRevealedNow && h('p', { key: 'nc', className: 'text-xs font-normal' }, t('stem.arithmetic.no_credit_after_reveal', 'The answer had been shown earlier, so this one earns no points.'))]
            : [h('p', { key: 'm' }, retryMessage), h('p', { key: 'n', className: 'font-normal' }, tryNextLine(wordTry))]),
          !wordLocked && revealButton(revealWord, wordTry, 'word'),
          wordShown && feedbackPanel(false, [
            h('p', { key: 'm', 'data-word-revealed': true }, wordRevealText()),
            h('p', { key: 'e', className: 'mt-1 text-xs font-normal' }, wordResultExplanation(wordProblem, t))
          ])
        );
      }

      // ---------------------------------------------------------- teacher panel
      function renderTeacher() {
        if (!isTeacher) return null;
        var log = Array.isArray(d.missLog) ? d.missLog.filter(function (item) { return item && typeof item === 'object'; }) : [];
        var tally = {};
        log.forEach(function (item) { tally[item.kind] = (tally[item.kind] || 0) + 1; });
        var tallyKinds = Object.keys(tally).sort(function (x, y) { return tally[y] - tally[x]; });
        var cellStyle = { padding: '4px 6px', borderBottom: '1px solid ' + border, textAlign: 'left', verticalAlign: 'top' };
        return h('section', { 'data-arithmetic-teacher': true, 'aria-labelledby': 'arithmetic-teacher-title', className: 'rounded-xl p-3 space-y-3', style: { background: card, border: '2px dashed ' + border } },
          h('h2', { id: 'arithmetic-teacher-title', className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.teacher_title', 'Teacher controls')),
          h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.teacher_intro', 'Only you see this panel. Settings apply to this tool on this device and in this saved project.')),
          h('div', { role: 'group', 'aria-label': t('stem.arithmetic.teacher_ops', 'Operations students can use'), className: 'space-y-1' },
            h('p', { className: 'text-xs font-bold' }, t('stem.arithmetic.teacher_ops', 'Operations students can use')),
            h('div', { className: 'flex flex-wrap gap-2' }, OP_IDS.map(function (op) {
              var on = allowedOps.indexOf(op) >= 0;
              return h('button', { key: op, type: 'button', 'data-teacher-op': op, 'aria-pressed': on, disabled: on && allowedOps.length === 1, onClick: function () {
                var next = on ? allowedOps.filter(function (x) { return x !== op; }) : OP_IDS.filter(function (x) { return x === op || allowedOps.indexOf(x) >= 0; });
                if (next.length) setTeacher({ ops: next });
              }, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60', style: toggleStyle(on, OPERATIONS[op]) }, OPERATIONS[op].symbol + ' ' + opLabel(t, op));
            }))),
          h('div', { role: 'group', 'aria-label': t('stem.arithmetic.teacher_band', 'Grade band for generated practice'), className: 'space-y-1' },
            h('p', { className: 'text-xs font-bold' }, t('stem.arithmetic.teacher_band', 'Grade band for generated practice')),
            h('div', { className: 'flex flex-wrap gap-2' }, BANDS.map(function (bandId) {
              var on = teacher.band === bandId;
              return h('button', { key: bandId, type: 'button', 'data-teacher-band': bandId, 'aria-pressed': on, onClick: function () { setTeacher({ band: on ? null : bandId, lockBand: on ? false : teacher.lockBand }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(on) }, bandLabel(t, bandId));
            })),
            h('button', { type: 'button', 'data-teacher-lock-band': true, 'aria-pressed': teacher.lockBand, disabled: !teacher.band, onClick: function () { setTeacher({ lockBand: !teacher.lockBand }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50', style: toggleStyle(teacher.lockBand) }, t('stem.arithmetic.teacher_lock_band', 'Lock this grade band for students'))),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', 'data-teacher-reveals': true, 'aria-pressed': teacher.reveals, onClick: function () { setTeacher({ reveals: !teacher.reveals }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(teacher.reveals) }, t('stem.arithmetic.teacher_reveals', 'Show the answer after two wrong tries')),
            h('button', { type: 'button', 'data-teacher-estimates': true, 'aria-pressed': teacher.estimates, onClick: function () { setTeacher({ estimates: !teacher.estimates }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(teacher.estimates) }, t('stem.arithmetic.teacher_estimates', 'Ask for an estimate before the exact answer')),
            h('button', { type: 'button', 'data-teacher-two-step': true, 'aria-pressed': teacher.twoStep, onClick: function () { setTeacher({ twoStep: !teacher.twoStep }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(teacher.twoStep) }, t('stem.arithmetic.teacher_two_step', 'Include two-step bar-model problems'))),
          h('div', { role: 'group', 'aria-label': t('stem.arithmetic.teacher_dec_mode', 'Decimal problems students get'), className: 'space-y-1' },
            h('p', { className: 'text-xs font-bold' }, t('stem.arithmetic.teacher_dec_mode', 'Decimal problems students get')),
            h('div', { className: 'flex flex-wrap gap-2' }, [[null, t('stem.arithmetic.teacher_dec_any', 'Students choose')], ['addsub', t('stem.arithmetic.teacher_dec_addsub', 'Only add and subtract')], ['mulwhole', t('stem.arithmetic.teacher_dec_mulwhole', 'Only multiply by a whole number')]].map(function (item) {
              var on = teacher.decMode === item[0];
              return h('button', { key: String(item[0]), type: 'button', 'data-teacher-dec-mode': String(item[0]), 'aria-pressed': on, onClick: function () { setTeacher({ decMode: item[0] }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: toggleStyle(on) }, item[1]);
            }))),
          h('h3', { className: 'text-sm font-black' }, t('stem.arithmetic.teacher_missed', 'Missed items')),
          !log.length && h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.teacher_missed_none', 'No missed items yet.')),
          log.length > 0 && h('ul', { className: 'text-xs space-y-1', 'data-teacher-tally': true }, tallyKinds.map(function (kind) {
            return h('li', { key: kind }, fill(t('stem.arithmetic.summary_tally_line', '{kind}: {n}'), { kind: errorKindName(kind), n: tally[kind] }));
          })),
          log.length > 0 && h('div', { role: 'region', tabIndex: 0, 'aria-label': t('stem.arithmetic.teacher_missed', 'Missed items'), style: { overflowX: 'auto' } },
            h('table', { className: 'text-xs', 'data-teacher-missed': true, style: { borderCollapse: 'collapse', minWidth: 280, color: text } },
              h('caption', { className: 'text-left font-bold' }, fill(t('stem.arithmetic.teacher_missed_caption', 'The last {n} missed items, newest last'), { n: log.length })),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col', style: cellStyle }, t('stem.arithmetic.col_problem', 'Problem')),
                h('th', { scope: 'col', style: cellStyle }, t('stem.arithmetic.col_given', 'Answer given')),
                h('th', { scope: 'col', style: cellStyle }, t('stem.arithmetic.col_kind', 'Likely error')),
                h('th', { scope: 'col', style: cellStyle }, t('stem.arithmetic.col_shown', 'Answer shown')))),
              h('tbody', null, log.map(function (item, i) {
                return h('tr', { key: i },
                  h('td', { style: cellStyle }, missItemProblem(item)),
                  h('td', { style: cellStyle }, item.src === 'errors' ? diagnosisOrClassicLabel(item) : item.src === 'efficient' ? mentalName(item.given) : String(item.given == null ? '' : item.given)),
                  h('td', { style: cellStyle }, errorKindName(item.kind)),
                  h('td', { style: cellStyle }, item.revealed ? t('stem.arithmetic.yes', 'Yes') : t('stem.arithmetic.no', 'No')));
              })))),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: copySummary, disabled: !log.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: ghostStyle }, t('stem.arithmetic.teacher_copy', 'Copy summary')),
            !d.teacherConfirmClear && h('button', { type: 'button', onClick: function () { update({ teacherConfirmClear: true }); }, disabled: !log.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: ghostStyle }, t('stem.arithmetic.teacher_clear', 'Clear the list')),
            d.teacherConfirmClear && h('span', { role: 'group', 'aria-label': t('stem.arithmetic.teacher_confirm_label', 'Confirm clearing the list'), className: 'flex flex-wrap items-center gap-2' },
              h('span', { className: 'text-xs font-bold' }, fill(t('stem.arithmetic.teacher_confirm', 'Clear all {n} missed items?'), { n: log.length })),
              h('button', { type: 'button', onClick: function () { update({ missLog: [], teacherConfirmClear: false, teacherMsg: t('stem.arithmetic.teacher_cleared', 'The missed-items list is cleared.') }); announce(t('stem.arithmetic.teacher_cleared', 'The missed-items list is cleared.')); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: btnStyle({ background: '#b91c1c', color: '#ffffff', border: '1px solid #7f1d1d' }) }, t('stem.arithmetic.teacher_confirm_yes', 'Yes, clear it')),
              h('button', { type: 'button', onClick: function () { update({ teacherConfirmClear: false }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.cancel', 'Cancel')))),
          d.teacherMsg && h('p', { role: 'status', className: 'text-xs font-bold' }, String(d.teacherMsg))
        );
      }

      function diagnosisOrClassicLabel(item) {
        var given = String(item.given || '');
        if (DIAGNOSIS_KINDS.indexOf(given) >= 0) return diagnosisLabel(given);
        var classicIndex = ERROR_IDS.indexOf(item.id);
        if (classicIndex >= 0) {
          var c = classicErrorCase(t, classicIndex);
          var match = c.choices.filter(function (choice) { return choice.id === given; })[0];
          if (match) return match.label;
        }
        return given;
      }

      // ---------------------------------------------------------- stage B shared pieces
      var svgInk = isContrast ? '#ffffff' : (isDark ? '#f1f5f9' : '#0f172a');
      var svgLine = isContrast ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155');
      var svgArc = isContrast ? '#fbbf24' : (isDark ? '#93c5fd' : '#1d4ed8');
      var fillA = isContrast ? '#000000' : (isDark ? '#1e3a8a' : '#dbeafe');
      var fillB = isContrast ? '#000000' : (isDark ? '#3b0764' : '#ede9fe');
      var sectionStyle = { background: card, border: '1px solid ' + border };

      function opNoun(op) {
        if (op === 'add') return t('stem.arithmetic.op_noun_add', 'addition');
        if (op === 'subtract') return t('stem.arithmetic.op_noun_subtract', 'subtraction');
        if (op === 'multiply') return t('stem.arithmetic.op_noun_multiply', 'multiplication');
        return t('stem.arithmetic.op_noun_divide', 'division');
      }

      function modeButtons(groupLabel, items, current, onPick, dataName, disabled) {
        return h('div', { role: 'group', 'aria-label': groupLabel, className: 'flex flex-wrap gap-2' }, items.map(function (item) {
          var on = current === item[0];
          var props = { key: item[0], type: 'button', 'aria-pressed': on, disabled: !!disabled, onClick: function () { if (!on) onPick(item[0]); }, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-70', style: Object.assign(toggleStyle(on), { flex: '1 1 140px', whiteSpace: 'normal' }) };
          props['data-' + dataName] = item[0];
          return h('button', props, item[1]);
        }));
      }

      function missedButton(ids, onClick) {
        return h('button', { type: 'button', onClick: onClick, disabled: !ids.length, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-40', style: retryStyle }, fill(t('stem.arithmetic.retry_missed_n', 'Retry missed ({n})'), { n: ids.length }));
      }

      function recordMiss(current, entry) { return pushMiss(current.missLog, entry); }

      // Progress maps are id -> true only (the host autosave keeps 'flags').
      function addFlag(current, key, id, on) {
        var src = plainMap(current[key]), map = {};
        Object.keys(src).forEach(function (k) { if (src[k] === true) map[k] = true; });
        if (on) map[id] = true; else delete map[id];
        return capMap(map, 300);
      }

      // ---- One reveal rule and one hint look for every tab (stage C):
      // commit first, a second try, then "Show the answer" on demand after two
      // tries (only when the teacher allows reveals); a shown answer earns nothing.
      function tryNextLine(tries) {
        if (tries >= 2 && teacher.reveals) return t('stem.arithmetic.nt_two_tries', 'You can try again, ask for a hint, or show the answer (it then earns no points).');
        if (teacher.reveals) return t('stem.arithmetic.try_again_reveal_later', 'Try again. After two tries you can show the answer if you need it.');
        return t('stem.arithmetic.keep_trying', 'Keep trying, open the strategy hint, or move on and come back later.');
      }
      function choiceNextLine(tries) {
        if (tries >= 2 && teacher.reveals) return t('stem.arithmetic.choice_two_tries', 'Two choices are ruled out. You can pick the one that is left or show the answer; either way this one earns no points.');
        if (tries >= 2) return t('stem.arithmetic.choice_two_tries_no_reveal', 'Two choices are ruled out. The one that is left is the answer, but finding it this way earns no points.');
        if (teacher.reveals) return t('stem.arithmetic.choice_try_again_reveal', 'Choose again. After two tries you can show the answer if you need it.');
        return t('stem.arithmetic.choice_try_again', 'Choose again. Read the hint first.');
      }
      function revealButton(onClick, tries, name) {
        if (!(tries >= 2) || !teacher.reveals) return null;
        return h('div', { className: 'flex flex-wrap gap-2' },
          h('button', { type: 'button', 'data-show-answer': name, onClick: onClick, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.show_answer', 'Show the answer')));
      }
      function hintLine(text, key) {
        return h('p', { key: key, className: 'font-normal', 'data-hint-line': true }, fill(t('stem.arithmetic.hint_line', 'Hint: {hint}'), { hint: text }));
      }

      // ---------------------------------------------------------- mental math copy
      function mentalName(id) {
        switch (id) {
          case 'makeTen': return t('stem.arithmetic.mm_make_ten', 'Make a ten');
          case 'nearDoubles': return t('stem.arithmetic.mm_near_doubles', 'Near doubles');
          case 'compensation': return t('stem.arithmetic.mm_compensation', 'Compensation');
          case 'constantDifference': return t('stem.arithmetic.mm_constant_difference', 'Constant difference');
          case 'breakApart': return t('stem.arithmetic.mm_break_apart', 'Break apart by place value');
          case 'halveDouble': return t('stem.arithmetic.mm_halve_double', 'Halve and double');
          default: return t('stem.arithmetic.mm_own_way', 'My own way');
        }
      }

      function mentalDesc(id) {
        switch (id) {
          case 'makeTen': return t('stem.arithmetic.mm_desc_make_ten', 'Split one number to fill up the next ten, then add what is left.');
          case 'nearDoubles': return t('stem.arithmetic.mm_desc_near_doubles', 'Use a double you know, then adjust by the difference.');
          case 'compensation': return t('stem.arithmetic.mm_desc_compensation', 'Move an amount from one number to the other so one becomes a friendly ten or hundred. The total stays the same.');
          case 'constantDifference': return t('stem.arithmetic.mm_desc_constant_difference', 'Add the same amount to both numbers, or take the same amount from both. The difference stays the same, and the problem gets easier.');
          case 'breakApart': return t('stem.arithmetic.mm_desc_break_apart', 'Split a number into hundreds, tens and ones, and work with one part at a time.');
          default: return t('stem.arithmetic.mm_desc_halve_double', 'Halve one factor and double the other. The product stays the same.');
        }
      }

      function mentalStepText(step) {
        var v = step.vals;
        switch (step.key) {
          case 'ms_mt_1': return fill(t('stem.arithmetic.ms_mt_1', 'Split {y} into {gap} + {rest}.'), v);
          case 'ms_mt_2': return fill(t('stem.arithmetic.ms_mt_2', 'Make the ten: {x} + {gap} = {ten}.'), v);
          case 'ms_mt_3': return fill(t('stem.arithmetic.ms_mt_3', 'Add the rest: {ten} + {rest} = {r}.'), v);
          case 'ms_nd_1': return fill(t('stem.arithmetic.ms_nd_1', 'Double the smaller number: {s} + {s} = {d}.'), v);
          case 'ms_nd_2': return fill(t('stem.arithmetic.ms_nd_2', '{l} is {diff} more than {s}, so add {diff}: {d} + {diff} = {r}.'), v);
          case 'ms_nd_double': return fill(t('stem.arithmetic.ms_nd_double', 'It is a double: {s} + {s} = {r}.'), v);
          case 'ms_cp_1': return fill(t('stem.arithmetic.ms_cp_1', 'Move {k} from {y} to {x}: {x} + {k} = {L}, and {y} − {k} = {y2}.'), v);
          case 'ms_cp_2': return fill(t('stem.arithmetic.ms_cp_2', 'The total stays the same: {x} + {y} = {L} + {y2}.'), v);
          case 'ms_cp_3': return fill(t('stem.arithmetic.ms_cp_3', 'Add the friendly numbers: {L} + {y2} = {r}.'), v);
          case 'ms_cd_up_1': return fill(t('stem.arithmetic.ms_cd_up_1', 'Add {k} to both numbers: {a} + {k} = {a2}, and {b} + {k} = {b2}.'), v);
          case 'ms_cd_down_1': return fill(t('stem.arithmetic.ms_cd_down_1', 'Take {k} from both numbers: {a} − {k} = {a2}, and {b} − {k} = {b2}.'), v);
          case 'ms_cd_2': return fill(t('stem.arithmetic.ms_cd_2', 'The difference stays the same: {a} − {b} = {a2} − {b2}.'), v);
          case 'ms_cd_3': return fill(t('stem.arithmetic.ms_cd_3', 'Subtract the friendly numbers: {a2} − {b2} = {r}.'), v);
          case 'ms_ba_split': return fill(t('stem.arithmetic.ms_ba_split', 'Break {n} into {parts}.'), v);
          case 'ms_ba_jump_add': return fill(t('stem.arithmetic.ms_ba_jump_add', 'Add {p}: {from} + {p} = {to}.'), v);
          case 'ms_ba_jump_sub': return fill(t('stem.arithmetic.ms_ba_jump_sub', 'Take away {p}: {from} − {p} = {to}.'), v);
          case 'ms_ba_mul_part': return fill(t('stem.arithmetic.ms_ba_mul_part', 'Multiply one part: {p} × {y} = {v}.'), v);
          case 'ms_ba_mul_total': return fill(t('stem.arithmetic.ms_ba_mul_total', 'Add the partial products: {list} = {r}.'), v);
          case 'ms_hd_step': return fill(t('stem.arithmetic.ms_hd_step', 'Halve {x} and double {y}: {x2} × {y2}.'), v);
          default: return fill(t('stem.arithmetic.ms_hd_total', 'The product stays the same: {fx} × {fy} = {r}.'), v);
        }
      }

      function mentalStepList(fit, hideFinal) {
        return (fit.steps || []).filter(function (step) { return !(hideFinal && step.final); }).map(mentalStepText);
      }

      function mentalReason(fit) {
        var v = Object.assign({}, fit.vals, { strategy: mentalName(fit.vals.strategy || fit.id), op: opNoun(fit.op), home: opNoun((MENTAL_OPS[fit.id] || ['add'])[0]) });
        switch (fit.reason) {
          case 'mt_good': return fill(t('stem.arithmetic.mr_mt_good', '{x} is only {gap} away from {ten}. Split {y} into {gap} and {rest}, make the ten, then add the rest.'), v);
          case 'mt_mid': return fill(t('stem.arithmetic.mr_mt_mid', '{x} is {gap} away from {ten}. Making a ten works, but the split is bigger than when a number is 1 or 2 away from a ten.'), v);
          case 'mt_big': return fill(t('stem.arithmetic.mr_mt_big', 'Making a ten works, but {rest} is still a big number to add after the ten, so it saves little here.'), v);
          case 'mt_none': return t('stem.arithmetic.mr_mt_none', 'Adding these numbers does not cross a ten in a helpful way, so there is no ten to make.');
          case 'nd_good': return fill(t('stem.arithmetic.mr_nd_good', '{s} and {l} are only {diff} apart. Double {s} to get {d}, then add {diff}.'), v);
          case 'nd_double': return fill(t('stem.arithmetic.mr_nd_double', '{s} + {s} is a double. Use the doubles fact.'), v);
          case 'nd_far': return fill(t('stem.arithmetic.mr_nd_far', '{a} and {b} are far apart, so no double is close by.'), v);
          case 'cp_good': return fill(t('stem.arithmetic.mr_cp_good', '{x} is just {k} away from {L}. Move {k} from {y} to {x}: {L} + {y2} has the same total and is easy to add.'), v);
          case 'cp_mid': return fill(t('stem.arithmetic.mr_cp_mid', '{x} is {k} away from {L}. Moving {k} works, but it is a bigger adjustment to keep track of.'), v);
          case 'cp_far': return fill(t('stem.arithmetic.mr_cp_far', 'Neither {a} nor {b} is close to a ten or a hundred, so there is no friendly number to move to.'), v);
          case 'cp_ten': return fill(t('stem.arithmetic.mr_cp_ten', '{n} is already a friendly number, so there is nothing to move.'), v);
          case 'cp_small': return t('stem.arithmetic.mr_cp_small', 'One number is a single digit. Making a ten is quicker than moving amounts between the numbers.');
          case 'cd_good': return fill(t('stem.arithmetic.mr_cd_good', 'Add {k} to both numbers: {a2} − {b2}. Taking away {b2} is easy, and the difference stays the same.'), v);
          case 'cd_down': return fill(t('stem.arithmetic.mr_cd_down', 'Take {k} from both numbers: {a2} − {b2}. The difference stays the same, and {b2} is a friendly number.'), v);
          case 'cd_far': return fill(t('stem.arithmetic.mr_cd_far', '{b} is not close to a ten, so shifting both numbers does not give a friendly problem.'), v);
          case 'cd_ten': return fill(t('stem.arithmetic.mr_cd_ten', '{b} is already a multiple of ten, so the problem is friendly as it is.'), v);
          case 'ba_add_good': return fill(t('stem.arithmetic.mr_ba_add_good', 'Break {n} into {parts}. The ones do not make a new ten, so each jump is quick.'), v);
          case 'ba_add': return fill(t('stem.arithmetic.mr_ba_add', 'Breaking {n} into {parts} always works, but the ones make a new ten, so there is more to keep track of.'), v);
          case 'ba_sub_good': return fill(t('stem.arithmetic.mr_ba_sub_good', 'Break {n} into {parts} and take away each part. No place needs regrouping.'), v);
          case 'ba_sub': return fill(t('stem.arithmetic.mr_ba_sub', 'Breaking {n} into {parts} always works, but taking away the ones crosses a ten, so there is more to keep track of.'), v);
          case 'ba_mul_good': return fill(t('stem.arithmetic.mr_ba_mul_good', 'Break {x} into {parts}, multiply each part by {y}, then add the partial products.'), v);
          case 'ba_mul': return fill(t('stem.arithmetic.mr_ba_mul', 'Breaking {x} into {parts} works, but both factors have two or more digits, so the partial products are big.'), v);
          case 'ba_small': return fill(t('stem.arithmetic.mr_ba_small', '{n} is a single digit, so there is nothing to break apart by place value.'), v);
          case 'ba_one': return fill(t('stem.arithmetic.mr_ba_one', '{n} has only one place that is not zero, so there is nothing to break apart.'), v);
          case 'hd_good': return fill(t('stem.arithmetic.mr_hd_good', 'Halve {x} and double {y} until the problem is friendly: {fx} × {fy}. The product stays the same.'), v);
          case 'hd_odd': return t('stem.arithmetic.mr_hd_odd', 'Both factors are odd, so halving would make a fraction. Halving and doubling does not help here.');
          case 'hd_not_friendly': return t('stem.arithmetic.mr_hd_not_friendly', 'Doubling the other factor does not make a multiple of ten, so halving and doubling does not make this easier.');
          case 'op_mismatch': return fill(t('stem.arithmetic.mr_op_mismatch', '{strategy} is a strategy for {home}, and this problem is {op}.'), v);
          default: return t('stem.arithmetic.mr_none', 'This strategy needs whole numbers, with the first number at least as large as the second.');
        }
      }

      // ---------------------------------------------------------- mental math models
      function renderNumberLine(line, hideFinal) {
        var pts = [line.start].concat(line.jumps.map(function (j) { return j.to; }));
        var vals = pts.slice().sort(function (x, y) { return x - y; }).filter(function (v, i, arr) { return i === 0 || v !== arr[i - 1]; });
        var gaps = vals.slice(1).map(function (v, i) { return Math.sqrt(v - vals[i]); });
        var sumG = gaps.reduce(function (s, g) { return s + g; }, 0) || 1;
        var free = Math.max(0, 312 - 44 * gaps.length);
        var xs = [24];
        gaps.forEach(function (g) { xs.push(xs[xs.length - 1] + 44 + free * g / sumG); });
        if (vals.length === 1) xs = [180];
        function xOf(v) { return xs[vals.indexOf(v)]; }
        var finalVal = line.jumps.length ? line.jumps[line.jumps.length - 1].to : line.start;
        return h('svg', { viewBox: '0 0 360 130', 'aria-hidden': true, 'data-number-line': true, style: { width: '100%', maxWidth: 520, display: 'block', margin: 'auto' } },
          h('line', { x1: 8, y1: 90, x2: 352, y2: 90, stroke: svgLine, strokeWidth: 2 }),
          line.jumps.map(function (j, i) {
            var x1 = xOf(j.from), x2 = xOf(j.to), mid = (x1 + x2) / 2, lift = 20 + Math.min(34, Math.abs(x2 - x1) / 4), dir = x2 >= x1 ? 1 : -1;
            return h('g', { key: 'j' + i },
              h('path', { d: 'M' + x1 + ' 88 Q' + mid + ' ' + (88 - 2 * lift) + ' ' + x2 + ' 88', fill: 'none', stroke: svgArc, strokeWidth: 2.5 }),
              h('polygon', { points: x2 + ',88 ' + (x2 - dir * 10) + ',82 ' + (x2 - dir * 3) + ',78', fill: svgArc }),
              h('text', { x: mid, y: 88 - lift - 6, textAnchor: 'middle', fill: svgInk, fontSize: 12, fontWeight: 800 }, (j.delta >= 0 ? '+' : '−') + Math.abs(j.delta)));
          }),
          vals.map(function (v, i) {
            return h('g', { key: 'p' + i },
              h('line', { x1: xs[i], y1: 82, x2: xs[i], y2: 98, stroke: svgLine, strokeWidth: 2 }),
              h('text', { x: xs[i], y: 116, textAnchor: 'middle', fill: svgInk, fontSize: 12, fontWeight: 700 }, hideFinal && v === finalVal && v !== line.start ? '?' : String(v)));
          }));
      }

      function numberLineList(line, hideFinal) {
        var items = [fill(t('stem.arithmetic.nl_start', 'Start at {n}.'), { n: line.start })];
        line.jumps.forEach(function (j, i) {
          var hidden = hideFinal && i === line.jumps.length - 1;
          var vals = { d: Math.abs(j.delta), to: j.to };
          if (j.delta >= 0) items.push(fill(hidden ? t('stem.arithmetic.nl_up_hidden', 'Jump forward {d}. Where do you land?') : t('stem.arithmetic.nl_up', 'Jump forward {d} to {to}.'), vals));
          else items.push(fill(hidden ? t('stem.arithmetic.nl_down_hidden', 'Jump back {d}. Where do you land?') : t('stem.arithmetic.nl_down', 'Jump back {d} to {to}.'), vals));
        });
        return items;
      }

      function renderShift(shift) {
        if (shift.kind === 'give') {
          return h('div', { className: 'rounded-lg p-2 text-sm space-y-1', 'data-shift-model': 'give', style: { background: fillA, color: svgInk } },
            h('p', { className: 'font-mono font-bold' }, fill(t('stem.arithmetic.shift_give_up', '{x} becomes {x2} (add {k}).'), shift)),
            h('p', { className: 'font-mono font-bold' }, fill(t('stem.arithmetic.shift_give_down', '{y} becomes {y2} (take away {k}).'), shift)),
            h('p', null, t('stem.arithmetic.shift_give_same', 'What one number gains, the other loses, so the total stays the same.')));
        }
        var off = shift.dir === 'up' ? 36 : -36;
        var gapLabel = t('stem.arithmetic.cd_gap_label', 'same gap');
        function row(y, left, right, dx) {
          return h('g', null,
            h('line', { x1: 8, y1: y, x2: 352, y2: y, stroke: svgLine, strokeWidth: 2 }),
            [[80 + dx, left], [260 + dx, right]].map(function (p, i) {
              return h('g', { key: i }, h('circle', { cx: p[0], cy: y, r: 5, fill: svgArc }), h('text', { x: p[0], y: y + 22, textAnchor: 'middle', fill: svgInk, fontSize: 12, fontWeight: 700 }, String(p[1])));
            }),
            h('path', { d: 'M' + (80 + dx) + ' ' + (y - 12) + ' L' + (80 + dx) + ' ' + (y - 18) + ' L' + (260 + dx) + ' ' + (y - 18) + ' L' + (260 + dx) + ' ' + (y - 12), fill: 'none', stroke: svgArc, strokeWidth: 2 }),
            h('text', { x: 170 + dx, y: y - 23, textAnchor: 'middle', fill: svgInk, fontSize: 11, fontWeight: 700 }, gapLabel));
        }
        return h('div', { 'data-shift-model': 'same' },
          h('svg', { viewBox: '0 0 360 150', 'aria-hidden': true, style: { width: '100%', maxWidth: 520, display: 'block', margin: 'auto' } },
            row(45, shift.b, shift.a, 0), row(120, shift.b2, shift.a2, off)),
          h('p', { className: 'text-sm' }, fill(shift.dir === 'up'
            ? t('stem.arithmetic.cd_shift_up', 'Both numbers move up by {k}, so the distance between them does not change. {a} − {b} has the same answer as {a2} − {b2}.')
            : t('stem.arithmetic.cd_shift_down', 'Both numbers move down by {k}, so the distance between them does not change. {a} − {b} has the same answer as {a2} − {b2}.'), shift)));
      }

      function renderRects(rects) {
        var clamped = false;
        var boxes = rects.map(function (rc, i) {
          var s = Math.sqrt(5000 / (rc.x * rc.y));
          var w = rc.y * s, ht = rc.x * s;
          if (w > 150 || ht > 96 || w < 12 || ht < 12) clamped = true;
          w = Math.max(12, Math.min(150, w)); ht = Math.max(12, Math.min(96, ht));
          return h('svg', { key: i, viewBox: '0 0 160 126', width: 160, height: 126, 'aria-hidden': true, style: { maxWidth: '100%' } },
            h('rect', { x: 5, y: 5, width: w, height: ht, fill: i % 2 ? fillB : fillA, stroke: svgArc, strokeWidth: 2 }),
            h('text', { x: 5, y: ht + 24, fill: svgInk, fontSize: 13, fontWeight: 800 }, rc.x + ' × ' + rc.y));
        });
        return h('div', { 'data-rect-model': rects.length },
          h('div', { className: 'flex flex-wrap gap-3' }, boxes),
          h('p', { className: 'text-sm' }, t('stem.arithmetic.hd_rect_note', 'Each rectangle has the same area: cutting one side in half and doubling the other side keeps the product the same.')),
          clamped && h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.hd_rect_scale', 'Very long or thin rectangles are not drawn to scale.')));
      }

      function renderMentalModel(fit, hideFinal) {
        return h('section', { className: 'rounded-xl p-3 space-y-2', 'data-mental-model': fit.id, style: sectionStyle },
          h('h4', { className: 'text-sm font-black', style: { color: accentText } }, fill(t('stem.arithmetic.mm_model_title', 'Model: {strategy}'), { strategy: mentalName(fit.id) })),
          fit.shift && renderShift(fit.shift),
          fit.rects && renderRects(fit.rects),
          fit.line && h('div', { role: 'img', 'aria-label': t('stem.arithmetic.nl_label', 'Open number line. The jumps are listed below it.') }, renderNumberLine(fit.line, hideFinal)),
          fit.line && h('ol', { className: 'text-sm list-decimal pl-5 space-y-1', 'data-number-line-text': true }, numberLineList(fit.line, hideFinal).map(function (line, i) { return h('li', { key: i }, line); })));
      }

      // ---------------------------------------------------------- mental math: explorer
      function renderMentalExplore() {
        var aValid = isFinite(mmA), bValid = isFinite(mmB);
        var orderBad = aValid && bValid && mmOp === 'subtract' && mmA < mmB;
        var fit = aValid && bValid && !orderBad ? mentalFit(mmStrategy, mmOp, mmA, mmB) : null;
        var best = fit ? bestMental(mmOp, mmA, mmB) : null;
        var predicted = d.mmPredictSig === mmSig ? d.mmPredictResult : null;
        var open = predicted === 'correct' || d.mmRevealSig === mmSig;
        var predictInput = d.mmPredictSig === mmSig || d.mmPredictFor === mmSig ? String(d.mmPredict == null ? '' : d.mmPredict) : '';
        function setNum(which, value) { var patch = { mmPredictSig: null, mmPredict: '', mmPredictFor: null }; patch[which] = value; update(patch); }
        function check() {
          var g = parseNum(predictInput);
          if (!isFinite(g) || !fit) return;
          var right = g === fit.answer;
          var kind = right ? null : (mentalSlip(fit, g) || diagnoseAnswer(mmOp, mmA, mmB, g));
          update({ mmPredictSig: mmSig, mmPredictResult: right ? 'correct' : 'try', mmPredictKind: kind });
          announce(right ? t('stem.arithmetic.mm_predict_right_sr', 'Your prediction is right. The last step is now shown.') : errorKindFeedback(kind, { op: mmOp, a: mmA, b: mmB, answer: fit.answer, fact: isBasicFact(mmOp, mmA, mmB) }, ''));
        }
        return h('div', { className: 'space-y-3', 'data-mm-explore': true },
          h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.mm_explore_intro', 'Pick a strategy and try it on any numbers. Predict where the last jump lands before you see it.')),
          modeButtons(t('stem.arithmetic.mm_strategy_group', 'Strategy'), mentalAllowed.map(function (id) { return [id, mentalName(id)]; }), mmStrategy, function (id) {
            update({ mmStrategy: id, mmOp: null, mmA: null, mmB: null, mmPredict: '', mmPredictSig: null, mmPredictFor: null, mmRevealSig: null });
            announce(fill(t('stem.arithmetic.mm_strategy_selected', '{strategy} selected.'), { strategy: mentalName(id) }));
          }, 'mm-strategy'),
          h('p', { className: 'text-sm' }, mentalDesc(mmStrategy)),
          mmOpList.length > 1 && modeButtons(t('stem.arithmetic.mm_op_group', 'Operation for this strategy'), mmOpList.map(function (op) { return [op, OPERATIONS[op].symbol + ' ' + opLabel(t, op)]; }), mmOp, function (op) {
            update({ mmOp: op, mmA: null, mmB: null, mmPredict: '', mmPredictSig: null, mmPredictFor: null, mmRevealSig: null });
          }, 'mm-op'),
          h('div', { className: 'grid grid-cols-2 gap-2' },
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.first_number', 'First number'),
              h('input', { type: 'number', min: 0, max: 9999, inputMode: 'numeric', value: mmARaw, 'aria-invalid': aValid ? undefined : 'true', onChange: function (e) { setNum('mmA', e.target.value); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle })),
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.second_number', 'Second number'),
              h('input', { type: 'number', min: 0, max: 9999, inputMode: 'numeric', value: mmBRaw, 'aria-invalid': bValid ? undefined : 'true', onChange: function (e) { setNum('mmB', e.target.value); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 font-mono', style: inputStyle }))),
          (!aValid || !bValid) && h('p', { role: 'status', className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.mm_input_whole', 'Use whole numbers from 0 to 9999.')),
          orderBad && h('p', { role: 'status', className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.mm_input_order', 'For subtraction here, the first number must be at least as large as the second.')),
          fit && renderEquation(mmA, mmB, mmOp),
          fit && !fit.applies && feedbackPanel(false, [
            h('p', { key: 'why', 'data-mm-not-apply': fit.reason }, mentalReason(fit)),
            h('p', { key: 'try', className: 'font-normal' }, best
              ? fill(t('stem.arithmetic.mm_try_instead', 'For these numbers, try {strategy}: {reason}'), { strategy: mentalName(best.id), reason: mentalReason(best) })
              : t('stem.arithmetic.mm_no_strategy', 'No shortcut strategy fits these numbers well. Use a fact you know, or count on.'))
          ]),
          fit && fit.applies && h(React.Fragment, null,
            h('p', { className: 'text-sm', 'data-mm-fit-score': fit.score }, mentalReason(fit)),
            h('ol', { className: 'space-y-1 text-sm list-decimal pl-5', 'aria-label': t('stem.arithmetic.mm_steps_label', 'Strategy steps') }, mentalStepList(fit, !open).map(function (s, i) { return h('li', { key: i }, s); }),
              !open && h('li', { key: 'last', style: { color: muted } }, t('stem.arithmetic.mm_last_hidden', 'The last step is hidden until you predict the result.'))),
            renderMentalModel(fit, !open),
            !open && h('div', { className: 'flex flex-wrap items-end gap-2' },
              h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.predict_result', 'Predicted result'),
                h('input', { type: 'number', value: predictInput, onChange: function (e) { update({ mmPredict: e.target.value, mmPredictFor: mmSig, mmPredictSig: null }); }, className: 'mt-1 block w-32 rounded-lg px-3 py-2 font-mono', style: inputStyle })),
              h('button', { type: 'button', onClick: check, disabled: predictInput === '', className: 'rounded-lg px-3 py-2 text-xs font-black disabled:opacity-40', style: solidAccent(opMeta) }, t('stem.arithmetic.predict_check', 'Check my prediction')),
              h('button', { type: 'button', onClick: function () { update({ mmRevealSig: mmSig }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.mm_show_last', 'Show the last step'))),
            predicted === 'try' && !open && feedbackPanel(false, h('p', { 'data-named-error': d.mmPredictKind || 'none' }, errorKindFeedback(d.mmPredictKind, { op: mmOp, a: mmA, b: mmB, answer: fit.answer, fact: isBasicFact(mmOp, mmA, mmB) }, ''))),
            open && feedbackPanel(true, fill(t('stem.arithmetic.mm_result', 'So {a} {sym} {b} = {r}.'), { a: mmA, sym: sym(mmOp), b: mmB, r: fit.answer })),
            h('div', { className: 'flex flex-wrap gap-2' }, renderReadAloud('mental-explore', function () { return [mentalName(fit.id), mentalReason(fit)].concat(mentalStepList(fit, !open)).join(' '); }, t('stem.arithmetic.read_steps_aloud', 'Read the steps aloud')))));
      }

      // ---------------------------------------------------------- mental math: number talk
      function selectNumberTalk(index, message) {
        update({ ntIndex: index, ntFor: null, ntPick: null, ntAnswer: '', ntTry: 0, ntFeedback: null, ntKind: null, ntExplain: '', tfFor: null, tfMoved: 0 });
        if (message) announce(message);
      }

      // The pick used for feedback: the student's, or (K-2, skipped) make-ten
      // when they used the ten frame, else their own way.
      function ntEffectivePick() {
        if (ntPick) return ntPick;
        if (!ntPickOptional) return null;
        return ntTenFrame && ntTfMoved > 0 ? 'makeTen' : 'own';
      }

      function moveTenFrameCounter() {
        var item = ntItem;
        if (!item || !ntTenFrame || ntSolvedNow || ntFeedback === 'revealed' || ntTfMoved >= ntTenFrame.gap) return;
        var moved = ntTfMoved + 1;
        update({ tfFor: item.id, tfMoved: moved });
        // Keep focus on the next counter; when the ten is full, go to the answer box.
        if (typeof document !== 'undefined' && typeof setTimeout === 'function') setTimeout(function () {
          var el = document.querySelector(moved < ntTenFrame.gap ? '[data-ten-frame-counter][tabindex="0"]' : '[data-nt-answer]:not([disabled])');
          if (el && typeof el.focus === 'function') el.focus();
        }, 30);
      }

      function checkNumberTalk() {
        var item = ntItem;
        var g = parseNum(ntAnswer);
        var ntPick = ntEffectivePick();
        if (!item || !ntPick || !isFinite(g) || ntSolvedNow || ntFeedback === 'revealed') return;
        var correct = g === item.answer;
        var tries = ntTry + (correct ? 0 : 1);
        var pickFit = ntPick !== 'own' ? mentalFit(ntPick, item.op, item.a, item.b) : null;
        var kind = correct ? null : (mentalSlip(pickFit, g) || diagnoseAnswer(item.op, item.a, item.b, g));
        var awardable = correct && !ntSolvedNow && !ntRevealedNow && !sameContentSeen(item.id, [d.ntSolved, d.ntRevealed]);
        var repeatWhy = correct && !ntSolvedNow && !ntRevealedNow ? repeatReason(item.id, d.ntSolved, d.ntRevealed) : null;
        update(function (current) {
          var patch = { ntFor: item.id, ntTry: tries, ntFeedback: correct ? 'correct' : 'try', ntKind: kind, ntSolved: addFlag(current, 'ntSolved', item.id, correct || !!(current.ntSolved || {})[item.id]), ntMissed: addFlag(current, 'ntMissed', item.id, !correct) };
          if (correct) { patch.noCreditFor = repeatWhy ? 'nt:' + item.id : null; patch.noCreditWhy = repeatWhy; }
          if (!correct) patch.missLog = recordMiss(current, { src: 'mental', id: item.id, op: item.op, a: item.a, b: item.b, given: ntAnswer, kind: kind || 'unknown', revealed: false });
          return patch;
        });
        if (awardable && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 2, t('stem.arithmetic.xp_number_talk', 'Arithmetic number talk'));
        if (correct) rescueFocus('[data-nt-next]');
        announce(correct ? withRepeatNote(ntPick === 'own' ? t('stem.arithmetic.nt_correct_plain_sr', 'Correct. A strategy for these numbers is now shown as a model.') : t('stem.arithmetic.nt_correct_sr', 'Correct. Your strategy is now shown as a model.'), repeatWhy) : errorKindFeedback(kind, { op: item.op, a: item.a, b: item.b, answer: item.answer, fact: isBasicFact(item.op, item.a, item.b) }, ''));
      }

      function revealNumberTalk() {
        var item = ntItem;
        if (!item || ntTry < 2 || !teacher.reveals) return;
        update(function (current) {
          return { ntFor: item.id, ntFeedback: 'revealed', ntRevealed: addFlag(current, 'ntRevealed', item.id, true), missLog: recordMiss(current, { src: 'mental', id: item.id, op: item.op, a: item.a, b: item.b, given: ntAnswer, kind: d.ntKind || 'unknown', revealed: true }) };
        });
        rescueFocus('[data-nt-next]');
        announce(fill(t('stem.arithmetic.nt_revealed_sr', 'The answer is {x}. It earns no points, and it stays on your missed list.'), { x: item.answer }));
      }

      function efficiencyNote(item, pick) {
        var best = bestMental(item.op, item.a, item.b);
        if (!best) return null;
        if (pick === 'own' || !pick) return fill(t('stem.arithmetic.nt_note_own', 'A strategy that fits these numbers well: {strategy}. {reason}'), { strategy: mentalName(best.id), reason: mentalReason(best) });
        var mine = mentalFit(pick, item.op, item.a, item.b);
        if (!mine.applies) return fill(t('stem.arithmetic.nt_note_no', '{why} A strategy that fits better: {strategy}. {reason}'), { why: mentalReason(mine), strategy: mentalName(best.id), reason: mentalReason(best) });
        if (mine.score >= best.score) return fill(t('stem.arithmetic.nt_note_good', 'Your strategy fits these numbers well. {reason}'), { reason: mentalReason(mine) });
        return fill(t('stem.arithmetic.nt_note_ok', 'Your strategy works. {strategy} may be quicker here: {reason}'), { strategy: mentalName(best.id), reason: mentalReason(best) });
      }

      // K-2 ten frame: x's ones fill part of the frame (its tens sit beside
      // it), y's counters wait in a tray. The student moves counters in one at
      // a time until the frame is full; the leftover counters stay in the tray.
      // Nothing here states the final total.
      function renderTenFrame(item, tf, moved, done) {
        var ones = tf.x % 10, tens = Math.floor(tf.x / 10), full = moved >= tf.gap;
        var left = tf.y - moved;
        var baseFill = isContrast ? '#fbbf24' : (isDark ? '#93c5fd' : '#1d4ed8');
        var moveRing = isContrast ? '#ffffff' : (isDark ? '#fbbf24' : '#b45309');
        var cellBorder = isContrast ? '#ffffff' : (isDark ? '#cbd5e1' : '#334155');
        function dot(kind) {
          // Two counter kinds that differ in shape, not only colour: solid (in the frame) and ringed (moved in).
          return kind === 'base'
            ? h('span', { 'aria-hidden': true, style: { display: 'block', width: 26, height: 26, borderRadius: '50%', background: baseFill } })
            : h('span', { 'aria-hidden': true, style: { display: 'block', width: 26, height: 26, borderRadius: '50%', background: card, border: '6px solid ' + moveRing, boxSizing: 'border-box' } });
        }
        var cells = [];
        for (var i = 0; i < 10; i++) {
          var kind = i < ones ? 'base' : i < ones + moved ? 'moved' : null;
          cells.push(h('span', { key: i, 'data-ten-frame-cell': kind || 'empty', style: { width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid ' + cellBorder, background: card } }, kind && dot(kind)));
        }
        var status = moved === 0
          ? fill(t('stem.arithmetic.tf_status_start', 'The frame holds the ones of {x}. Move counters from {y} into the empty spaces.'), { x: tf.x, y: tf.y })
          : !full
            ? fill(tf.gap - moved === 1 ? t('stem.arithmetic.tf_status_more_one', '{n} more counter fills the ten frame.') : t('stem.arithmetic.tf_status_more', '{n} more counters fill the ten frame.'), { n: tf.gap - moved })
            : fill(tf.rest === 1
              ? t('stem.arithmetic.tf_status_full_one', 'The ten frame is full: {x} + {gap} = {ten}. {rest} counter is left. Add it on and type your answer.')
              : t('stem.arithmetic.tf_status_full', 'The ten frame is full: {x} + {gap} = {ten}. {rest} counters are left. Add them on and type your answer.'), { x: tf.x, gap: tf.gap, ten: tf.ten, rest: tf.rest });
        var tray = [];
        for (var c = 0; c < left; c++) {
          var canMove = !done && !full;
          tray.push(canMove
            ? h('button', { key: c, type: 'button', 'data-ten-frame-counter': c, tabIndex: c === 0 ? 0 : -1, 'aria-label': t('stem.arithmetic.tf_move_aria', 'Move a counter into the ten frame'), onClick: moveTenFrameCounter,
              className: 'rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2', style: { width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: '2px dashed ' + moveRing, cursor: 'pointer' } }, dot('moved'))
            : h('span', { key: c, 'data-ten-frame-left': true, style: { width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' } }, dot('moved')));
        }
        return h('section', { className: 'rounded-xl p-3 space-y-2', 'data-ten-frame': item.id, 'data-ten-frame-moved': moved, style: sectionStyle },
          h('h3', { className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.mm_make_ten', 'Make a ten')),
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            tens > 0 && h('p', { className: 'text-sm font-bold', 'data-ten-frame-tens': tens }, fill(t('stem.arithmetic.tf_tens_line', '{tens} already full'), { tens: placeCount(t, 1, tens) })),
            h('div', { role: 'img', 'aria-label': fill(t('stem.arithmetic.tf_frame_label', 'Ten frame: {n} of 10 spaces filled'), { n: ones + moved }), style: { display: 'grid', gridTemplateColumns: 'repeat(5, 40px)', gap: 0 } }, cells)),
          h('p', { className: 'text-xs font-bold' }, fill(t('stem.arithmetic.tf_tray_label', 'Counters from {y}:'), { y: tf.y })),
          h('div', { className: 'flex flex-wrap gap-1', 'data-ten-frame-tray': left }, tray),
          !done && h('p', { role: 'status', 'aria-live': 'polite', className: 'text-sm', 'data-ten-frame-status': full ? 'full' : 'filling' }, status),
          !done && moved > 0 && h('button', { type: 'button', 'data-ten-frame-reset': true, onClick: function () { update({ tfFor: item.id, tfMoved: 0 }); focusProblem(['[data-ten-frame-counter][tabindex="0"]']); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.tf_reset', 'Start the ten frame over')));
      }

      function renderNumberTalk() {
        var item = ntItem;
        if (!item) return h('p', { className: 'text-sm' }, t('stem.arithmetic.mm_none_allowed', 'Your teacher has turned off the operations these strategies use.'));
        var done = ntSolvedNow || ntFeedback === 'revealed';
        var picks = MENTAL_IDS.filter(function (id) { return MENTAL_OPS[id].indexOf(item.op) >= 0; }).concat(['own']);
        var pickLocked = done || (ntTry > 0 && !ntPickOptional);
        var pickNow = ntEffectivePick();
        var pickFit = pickNow && pickNow !== 'own' ? mentalFit(pickNow, item.op, item.a, item.b) : null;
        var hintFit = pickFit && pickFit.applies ? pickFit : bestMental(item.op, item.a, item.b);
        var modelFit = pickFit && pickFit.applies ? pickFit : bestMental(item.op, item.a, item.b);
        var shownAnswer = ntSolvedNow && !ntOn ? String(item.answer) : ntAnswer;
        var answerOpen = !!ntPick || ntPickOptional;
        var pickBlock = h('fieldset', { className: 'rounded-xl p-3 space-y-2', style: { border: '1px solid ' + border } },
          h('legend', { className: 'px-1 text-xs font-black' }, ntPickOptional ? t('stem.arithmetic.nt_pick_optional', 'Which way did you think about it? (You can skip this.)') : t('stem.arithmetic.nt_step1', 'Step 1. Pick a strategy before you solve')),
          modeButtons(t('stem.arithmetic.mm_strategy_group', 'Strategy'), picks.map(function (id) { return [id, mentalName(id)]; }), ntPick, function (id) {
            if (pickLocked) return;
            update({ ntFor: item.id, ntPick: id, ntFeedback: ntPickOptional ? ntFeedback : null });
            announce(fill(t('stem.arithmetic.mm_strategy_selected', '{strategy} selected.'), { strategy: mentalName(id) }));
          }, 'nt-pick', pickLocked),
          pickLocked && ntPick && h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.nt_pick_locked', 'Your strategy is locked in for this problem.')),
          h('label', { className: 'text-xs font-bold block' }, t('stem.arithmetic.nt_explain', 'Explain your plan in your own words (optional)'),
            h('textarea', { rows: 2, value: ntOn && d.ntExplain ? String(d.ntExplain) : '', onChange: function (e) { update({ ntFor: item.id, ntExplain: e.target.value }); }, className: 'mt-1 block w-full rounded-lg px-3 py-2 text-sm', style: inputStyle })));
        var answerRow = h('div', { className: 'flex flex-wrap items-end gap-2' },
          h('label', { className: 'text-xs font-bold' }, ntPickOptional ? t('stem.arithmetic.nt_answer_plain', 'Your answer') : t('stem.arithmetic.nt_step2', 'Step 2. Your answer'),
            h('input', { type: 'number', inputMode: 'numeric', 'data-nt-answer': true, value: shownAnswer, disabled: !answerOpen || done, 'aria-describedby': !answerOpen ? 'arithmetic-nt-pick-first' : undefined, onChange: function (e) { update({ ntFor: item.id, ntAnswer: e.target.value, ntFeedback: ntFeedback === 'try' ? 'try' : null }); }, onKeyDown: function (e) { if (e.key === 'Enter' && !e.repeat && answerOpen && ntAnswer !== '' && !done) checkNumberTalk(); }, className: 'mt-1 block w-32 rounded-lg px-3 py-2 font-mono', style: inputStyle })),
          h('button', { type: 'button', onClick: checkNumberTalk, disabled: !answerOpen || ntAnswer === '' || done, className: 'rounded-lg px-4 py-2 text-sm font-black disabled:opacity-40', style: solidAccent(opMeta) }, done && ntSolvedNow ? t('stem.arithmetic.solved', 'Solved') : t('stem.arithmetic.check_answer', 'Check answer')));
        return h('div', { className: 'space-y-3', 'data-number-talk': item.id },
          h('p', { className: 'text-xs', style: { color: muted } }, ntTenFrame
            ? t('stem.arithmetic.nt_intro_ten_frame', 'Fill the ten frame to make a ten. Then type the answer.')
            : ntPickOptional ? t('stem.arithmetic.nt_intro_k2', 'Solve it in your head. Then type the answer.')
              : t('stem.arithmetic.nt_intro', 'Solve it in your head. First choose how you will think about it, then give the answer.')),
          h('p', { className: 'text-xs font-bold', style: { color: muted } }, fill(t('stem.arithmetic.nt_status', 'Number talk {n}. Solved so far: {s}.'), { n: ntIndex + 1, s: Object.keys(mapOf('ntSolved')).length })),
          ntFocus && h('div', { className: 'flex flex-wrap items-center gap-2', 'data-nt-focus': ntFocus },
            h('p', { className: 'text-xs font-bold' }, fill(t('stem.arithmetic.nt_focus', 'Focus: {strategy}. The next problems suit this strategy.'), { strategy: mentalName(ntFocus) })),
            h('button', { type: 'button', onClick: function () { update({ ntFocus: null }); announce(t('stem.arithmetic.nt_focus_cleared', 'Problems for every strategy are back.')); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.nt_focus_clear', 'Show problems for every strategy'))),
          renderEquation(item.a, item.b, item.op),
          ntTenFrame && renderTenFrame(item, ntTenFrame, ntTfMoved, done),
          !ntPickOptional && pickBlock,
          answerRow,
          !answerOpen && h('p', { id: 'arithmetic-nt-pick-first', className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.nt_pick_first', 'Pick a strategy first. Then the answer box opens.')),
          ntPickOptional && pickBlock,
          ntFeedback === 'try' && !done && feedbackPanel(false, [
            h('p', { key: 'named', 'data-named-error': d.ntKind || 'none' }, errorKindFeedback(d.ntKind, { op: item.op, a: item.a, b: item.b, answer: item.answer, fact: isBasicFact(item.op, item.a, item.b) }, '')),
            hintFit && hintFit.steps && hintFit.steps.length > 1 && hintLine(mentalStepText(hintFit.steps[0]), 'hint'),
            h('p', { key: 'next', className: 'font-normal' }, ntTry >= 2 && teacher.reveals ? t('stem.arithmetic.nt_two_tries', 'You can try again, ask for a hint, or show the answer (it then earns no points).') : pickNow === 'own' ? t('stem.arithmetic.nt_try_again_plain', 'Try again, one step at a time.') : t('stem.arithmetic.nt_try_again', 'Try again with the same strategy, one step at a time.'))
          ]),
          ntFeedback === 'try' && !done && ntTry >= 2 && h('div', { className: 'flex flex-wrap gap-2' },
            teacher.reveals && h('button', { type: 'button', onClick: revealNumberTalk, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.show_answer', 'Show the answer'))),
          ntFeedback === 'try' && !done && renderAiHint('nt:' + item.id, item.a + ' ' + sym(item.op) + ' ' + item.b, ntAnswer, item.answer, ntTry),
          done && feedbackPanel(ntSolvedNow, [
            h('p', { key: 'main', 'data-nt-done': ntSolvedNow ? 'solved' : 'revealed' }, ntSolvedNow
              ? fill(t('stem.arithmetic.nt_correct', 'Correct: {a} {sym} {b} = {x}.'), { a: item.a, sym: sym(item.op), b: item.b, x: item.answer })
              : fill(t('stem.arithmetic.nt_revealed', 'The answer is {x}. This one earns no points, and it stays on your missed list.'), { x: item.answer })),
            ntRevealedNow && ntSolvedNow && h('p', { key: 'nc', className: 'font-normal' }, t('stem.arithmetic.no_credit_after_reveal', 'The answer had been shown earlier, so this one earns no points.')),
            ntSolvedNow && repeatNoCreditNote('nt', item.id),
            h('p', { key: 'eff', className: 'font-normal', 'data-nt-efficiency': true }, efficiencyNote(item, pickNow))
          ]),
          done && modelFit && renderMentalModel(modelFit, false),
          done && modelFit && h('ol', { className: 'space-y-1 text-sm list-decimal pl-5', 'aria-label': t('stem.arithmetic.mm_steps_label', 'Strategy steps') }, mentalStepList(modelFit, false).map(function (s, i) { return h('li', { key: i }, s); })),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', 'data-nt-next': true, onClick: function () { var next = nextAllowedIndex(ntGen, ntIndex + 1, allowedOps, function (p) { return !!mapOf('ntSolved')[p.id] || (!!ntFocus && p.key !== ntFocus); }); selectNumberTalk(next < 0 ? ntIndex + 1 : next, t('stem.arithmetic.new_problem_ready', 'A new problem is ready.')); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.next_problem', 'Next problem')),
            missedButton(ntMissedIds, function () {
              var pos = ntMissedIds.indexOf(item.id);
              var nextId = ntMissedIds[pos < 0 ? 0 : (pos + 1) % ntMissedIds.length];
              var parsed = parseMentalId(nextId);
              if (parsed) selectNumberTalk(parsed.index, t('stem.arithmetic.retrying_missed_problem', 'Retrying a missed practice problem.'));
            }),
            done && modelFit && renderReadAloud('number-talk', function () { return [mentalName(modelFit.id)].concat(mentalStepList(modelFit, false)).join(' '); }, t('stem.arithmetic.read_steps_aloud', 'Read the steps aloud'))));
      }

      // ---------------------------------------------------------- mental math: which strategy is efficient?
      function checkEfficient(choice) {
        var item = efItem;
        if (!item || efSolvedNow || efFeedback === 'revealed' || efFeedback === 'eliminated') return;
        if (efWrongNow.indexOf(choice) >= 0) return;
        var correct = choice === item.key;
        var tries = efTry + (correct ? 0 : 1);
        var eliminated = correct && efWrongNow.length >= item.order.length - 1;
        var awardable = correct && !eliminated && !efSolvedNow && !efRevealedNow && !sameContentSeen(item.id, [d.efSolved, d.efRevealed]);
        var repeatWhy = correct && !eliminated && !efSolvedNow && !efRevealedNow ? repeatReason(item.id, d.efSolved, d.efRevealed) : null;
        update(function (current) {
          var patch = { efFor: item.id, efChoice: choice, efTry: tries, efWrong: correct ? efWrongNow : efWrongNow.concat([choice]), efFeedback: eliminated ? 'eliminated' : correct ? 'correct' : 'try', efSolved: addFlag(current, 'efSolved', item.id, correct && !eliminated), efMissed: addFlag(current, 'efMissed', item.id, !correct || eliminated), efRuledOut: addFlag(current, 'efRuledOut', item.id + '|' + choice, !correct) };
          if (eliminated) patch.efRevealed = addFlag(current, 'efRevealed', item.id, true);
          if (correct && !eliminated) { patch.noCreditFor = repeatWhy ? 'ef:' + item.id : null; patch.noCreditWhy = repeatWhy; }
          if (!correct) patch.missLog = recordMiss(current, { src: 'efficient', id: item.id, op: item.op, a: item.a, b: item.b, given: choice, kind: 'strategy_choice', revealed: false });
          return patch;
        });
        if (awardable && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 2, t('stem.arithmetic.xp_efficient', 'Arithmetic efficient strategy'));
        var chosen = item.fits.filter(function (f) { return f.id === choice; })[0];
        var key = item.fits.filter(function (f) { return f.id === item.key; })[0];
        announce(eliminated
          ? fill(t('stem.arithmetic.ef_eliminated_sr', '{strategy} is the efficient one, found by ruling out the others, so it earns no points: {reason}'), { strategy: mentalName(item.key), reason: mentalReason(key) })
          : correct
            ? withRepeatNote(fill(t('stem.arithmetic.ef_correct', 'Yes. {strategy} is efficient here: {reason}'), { strategy: mentalName(item.key), reason: mentalReason(key) }), repeatWhy)
            : fill(t('stem.arithmetic.ef_try', 'Not the most efficient here. {reason}'), { reason: chosen ? mentalReason(chosen) : '' }));
      }

      function revealEfficient() {
        var item = efItem;
        if (!item || efSolvedNow || efFeedback !== 'try' || efTry < 2 || !teacher.reveals) return;
        var key = item.fits.filter(function (f) { return f.id === item.key; })[0];
        update(function (current) { return { efFor: item.id, efFeedback: 'revealed', efRevealed: addFlag(current, 'efRevealed', item.id, true), missLog: recordMiss(current, { src: 'efficient', id: item.id, op: item.op, a: item.a, b: item.b, given: efChoice, kind: 'strategy_choice', revealed: true }) }; });
        announce(fill(t('stem.arithmetic.ef_revealed', 'The efficient strategy here is {strategy}: {reason}'), { strategy: mentalName(item.key), reason: mentalReason(key) }));
      }

      function renderEfficient() {
        var item = efItem;
        if (!item) return h('p', { className: 'text-sm' }, t('stem.arithmetic.mm_none_allowed', 'Your teacher has turned off the operations these strategies use.'));
        var eliminatedNow = !efSolvedNow && efFeedback === 'eliminated';
        var finished = efSolvedNow || efFeedback === 'revealed' || eliminatedNow;
        var shownChoice = finished ? item.key : efChoice;
        var fitOf = function (id) { return item.fits.filter(function (f) { return f.id === id; })[0]; };
        var hint = item.op === 'add' ? t('stem.arithmetic.ef_hint_add', 'Look for a number close to a ten or a hundred, two numbers close together, or a single digit that crosses a ten.')
          : item.op === 'subtract' ? t('stem.arithmetic.ef_hint_subtract', 'Is the number you take away close to a ten or a hundred? Could you shift both numbers?')
            : t('stem.arithmetic.ef_hint_multiply', 'Is one factor even, and does the other end in 5? Could you halve one and double the other?');
        return h('div', { className: 'space-y-3', 'data-efficient': item.id },
          h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.ef_intro', 'Every strategy can work, but some fit the numbers better. Which one is efficient for this problem?')),
          h('p', { className: 'text-xs font-bold', style: { color: muted } }, fill(t('stem.arithmetic.ef_status', 'Problem {n}. Solved so far: {s}.'), { n: efIndex + 1, s: Object.keys(mapOf('efSolved')).length })),
          renderEquation(item.a, item.b, item.op),
          h('div', { role: 'group', 'aria-label': t('stem.arithmetic.ef_group', 'Which strategy is efficient here?'), className: 'space-y-2' }, item.order.map(function (id) {
            var selected = shownChoice === id;
            var ruledOut = !finished && efWrongNow.indexOf(id) >= 0;
            return h('button', { key: id, type: 'button', 'data-ef-choice': id, 'data-ruled-out': ruledOut ? 'true' : undefined, 'aria-pressed': selected, disabled: finished || ruledOut, onClick: function () { checkEfficient(id); }, className: 'w-full rounded-xl p-3 text-left text-sm font-semibold disabled:opacity-70', style: { minHeight: 44, background: selected ? opMeta.soft : card, color: selected ? '#0f172a' : text, border: '1px solid ' + (selected ? opMeta.color : border) } },
              h('span', { className: 'block font-black' }, mentalName(id)), h('span', { className: 'block font-normal text-xs' }, mentalDesc(id)),
              ruledOut && h('span', { className: 'block text-xs font-normal' }, t('stem.arithmetic.choice_ruled_out', 'Ruled out: you tried this one.')));
          })),
          efFeedback === 'try' && !finished && feedbackPanel(false, [
            h('p', { key: 'r', 'data-ef-reason': efChoice }, fill(t('stem.arithmetic.ef_try', 'Not the most efficient here. {reason}'), { reason: fitOf(efChoice) ? mentalReason(fitOf(efChoice)) : '' })),
            hintLine(hint, 'h'),
            h('p', { key: 'n', className: 'font-normal' }, choiceNextLine(efWrongNow.length || efTry))
          ]),
          efFeedback === 'try' && !finished && revealButton(revealEfficient, efTry, 'efficient'),
          finished && feedbackPanel(efSolvedNow, [
            h('p', { key: 'k' }, fill(efSolvedNow ? t('stem.arithmetic.ef_correct', 'Yes. {strategy} is efficient here: {reason}') : t('stem.arithmetic.ef_revealed', 'The efficient strategy here is {strategy}: {reason}'), { strategy: mentalName(item.key), reason: mentalReason(fitOf(item.key)) })),
            h('p', { key: 'w', className: 'font-normal' }, t('stem.arithmetic.ef_why_not', 'Why not the others:')),
            h('ul', { key: 'l', className: 'font-normal list-disc pl-5' }, item.order.filter(function (id) { return id !== item.key; }).map(function (id) { return h('li', { key: id }, fill(t('stem.arithmetic.ef_other_line', '{strategy}: {reason}'), { strategy: mentalName(id), reason: mentalReason(fitOf(id)) })); })),
            efRevealedNow && efSolvedNow && h('p', { key: 'nc', className: 'text-xs font-normal' }, t('stem.arithmetic.no_credit_after_reveal', 'The answer had been shown earlier, so this one earns no points.')),
            efSolvedNow && repeatNoCreditNote('ef', item.id),
            efRevealedNow && !efSolvedNow && h('p', { key: 'c', className: 'text-xs font-normal', 'data-ef-done': eliminatedNow ? 'eliminated' : 'revealed' }, eliminatedNow
              ? t('stem.arithmetic.err_eliminated', 'You found it by ruling out the other choices, so this case earns no points. It stays on your missed list for another try.')
              : t('stem.arithmetic.err_no_points', 'This case earns no points now, and it stays on your missed list.'))
          ]),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function () {
              var next = nextAllowedIndex(efGen, efIndex + 1, allowedOps, function (p) { return !!mapOf('efSolved')[p.id]; });
              update({ efIndex: next < 0 ? efIndex + 1 : next, efFor: null, efChoice: null, efTry: 0, efFeedback: null, efWrong: [] });
              announce(t('stem.arithmetic.new_problem_ready', 'A new problem is ready.'));
            }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: solidAccent(opMeta) }, t('stem.arithmetic.next_problem', 'Next problem')),
            missedButton(efMissedIds, function () {
              var pos = efMissedIds.indexOf(item.id);
              var parsed = parseMentalId(efMissedIds[pos < 0 ? 0 : (pos + 1) % efMissedIds.length]);
              if (parsed) { update({ efIndex: parsed.index, efFor: null, efChoice: null, efTry: 0, efFeedback: null, efWrong: [] }); announce(t('stem.arithmetic.retrying_missed_problem', 'Retrying a missed practice problem.')); }
            })));
      }

      function renderMental() {
        return h(React.Fragment, null,
          h('div', null,
            h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.mm_title', 'Mental math strategies')),
            h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.mm_intro', 'Number talks: there is more than one good way to think about a problem. Choose a strategy that fits the numbers.'))),
          modeButtons(t('stem.arithmetic.mm_mode_group', 'Mental math activity'), [
            ['explore', t('stem.arithmetic.mm_mode_explore', 'Explore a strategy')],
            ['talk', t('stem.arithmetic.mm_mode_talk', 'Number talk')],
            ['efficient', t('stem.arithmetic.mm_mode_efficient', 'Which strategy is efficient?')]
          ], mmMode, function (m) { update({ mmMode: m }); }, 'mm-mode'),
          !mentalAllowed.length
            ? h('p', { className: 'text-sm' }, t('stem.arithmetic.mm_none_allowed', 'Your teacher has turned off the operations these strategies use.'))
            : mmMode === 'explore' ? renderMentalExplore() : mmMode === 'talk' ? renderNumberTalk() : renderEfficient());
      }

      // ---------------------------------------------------------- bar models: copy
      function barModelName(model) {
        if (model === 'partWhole') return t('stem.arithmetic.bar_model_pw', 'Part-whole');
        if (model === 'compare') return t('stem.arithmetic.bar_model_cmp', 'Comparison');
        return t('stem.arithmetic.bar_model_eq', 'Equal groups');
      }
      function barModelDesc(model) {
        if (model === 'partWhole') return t('stem.arithmetic.bar_model_pw_desc', 'Parts join to make a whole.');
        if (model === 'compare') return t('stem.arithmetic.bar_model_cmp_desc', 'Two amounts are compared side by side.');
        return t('stem.arithmetic.bar_model_eq_desc', 'Equal parts make a total.');
      }
      function barSlotName(slot) {
        switch (slot) {
          case 'partA': return t('stem.arithmetic.bar_slot_part_a', 'One part');
          case 'partB': return t('stem.arithmetic.bar_slot_part_b', 'Other part');
          case 'whole': return t('stem.arithmetic.bar_slot_whole', 'Whole');
          case 'larger': return t('stem.arithmetic.bar_slot_larger', 'Larger amount');
          case 'smaller': return t('stem.arithmetic.bar_slot_smaller', 'Smaller amount');
          case 'difference': return t('stem.arithmetic.bar_slot_difference', 'Difference');
          case 'groups': return t('stem.arithmetic.bar_slot_groups', 'Number of equal groups');
          case 'size': return t('stem.arithmetic.bar_slot_size', 'Size of each group');
          default: return t('stem.arithmetic.bar_slot_total', 'Total');
        }
      }

      function barStory(p) {
        var v = Object.assign({}, p.names, p.nums);
        var key = p.type + p.variant;
        switch (key) {
          case 'pwWhole0': return fill(t('stem.arithmetic.bar_story_pw_whole_0', '{n1} read {a} pages on Saturday and {b} pages on Sunday. How many pages did {n1} read in all?'), v);
          case 'pwWhole1': return fill(t('stem.arithmetic.bar_story_pw_whole_1', 'A farm stand sold {a} apples in the morning and {b} apples in the afternoon. How many apples did it sell that day?'), v);
          case 'pwPart0': return fill(t('stem.arithmetic.bar_story_pw_part_0', 'A school has {a} students. {b} of them walk to school, and the rest ride the bus. How many students ride the bus?'), v);
          case 'pwPart1': return fill(t('stem.arithmetic.bar_story_pw_part_1', '{n1} has a puzzle with {a} pieces and has placed {b} of them. How many pieces are still to be placed?'), v);
          case 'cmpDiff0': return fill(t('stem.arithmetic.bar_story_cmp_diff_0', '{n1} has {a} stickers. {n2} has {b} stickers. How many more stickers does {n2} have than {n1}?'), v);
          case 'cmpDiff1': return fill(t('stem.arithmetic.bar_story_cmp_diff_1', 'A red rope is {a} centimeters long. A blue rope is {b} centimeters long. How many more centimeters long is the blue rope than the red rope?'), v);
          case 'cmpLarger0': return fill(t('stem.arithmetic.bar_story_cmp_larger_0', '{n1} scored {a} points. {n2} scored {b} more points than {n1}. How many points did {n2} score?'), v);
          case 'cmpLarger1': return fill(t('stem.arithmetic.bar_story_cmp_larger_1', 'A small tank holds {a} liters. A big tank holds {b} liters more than the small tank. How many liters does the big tank hold?'), v);
          case 'cmpSmaller0': return fill(t('stem.arithmetic.bar_story_cmp_smaller_0', '{n1} has {a} marbles. That is {b} more marbles than {n2} has. How many marbles does {n2} have?'), v);
          case 'cmpSmaller1': return fill(t('stem.arithmetic.bar_story_cmp_smaller_1', 'A tall tower has {a} blocks. It has {b} more blocks than a short tower. How many blocks does the short tower have?'), v);
          case 'eqTotal0': return fill(t('stem.arithmetic.bar_story_eq_total_0', 'There are {a} bags with {b} oranges in each bag. How many oranges are there in all?'), v);
          case 'eqTotal1': return fill(t('stem.arithmetic.bar_story_eq_total_1', '{n1} plants {a} rows of seeds with {b} seeds in each row. How many seeds does {n1} plant?'), v);
          case 'eqTimes0': return fill(t('stem.arithmetic.bar_story_eq_times_0', 'A small box holds {a} crayons. A big box holds {b} times as many crayons. How many crayons does the big box hold?'), v);
          case 'eqTimes1': return fill(t('stem.arithmetic.bar_story_eq_times_1', '{n1} walked {a} meters. {n2} walked {b} times as far as {n1}. How many meters did {n2} walk?'), v);
          case 'eqShare0': return fill(t('stem.arithmetic.bar_story_eq_share_0', '{n1} shares {a} cards equally among {b} friends. How many cards does each friend get?'), v);
          case 'eqShare1': return fill(t('stem.arithmetic.bar_story_eq_share_1', 'A baker puts {a} muffins into {b} boxes, with the same number in each box. How many muffins go in each box?'), v);
          case 'eqGroups0': return fill(t('stem.arithmetic.bar_story_eq_groups_0', 'A coach has {a} balls and puts {b} balls in each bag. How many bags does the coach fill?'), v);
          case 'eqGroups1': return fill(t('stem.arithmetic.bar_story_eq_groups_1', '{n1} has {a} beads and uses {b} beads for each bracelet. How many bracelets can {n1} make?'), v);
          case 'tsSpend0': return fill(t('stem.arithmetic.bar_story_ts_spend_0', '{n1} had {a} dollars. {n1} spent {b} dollars on a book and {c} dollars on lunch. How many dollars does {n1} have left?'), v);
          case 'tsSpend1': return fill(t('stem.arithmetic.bar_story_ts_spend_1', 'A theater has {a} seats. {b} people sit down before the show, and {c} more people sit down when it starts. How many seats are still empty?'), v);
          case 'tsGroupsPlus0': return fill(t('stem.arithmetic.bar_story_ts_groups_plus_0', 'A teacher has {a} boxes of pencils with {b} pencils in each box, and {c} loose pencils. How many pencils does the teacher have in all?'), v);
          case 'tsGroupsPlus1': return fill(t('stem.arithmetic.bar_story_ts_groups_plus_1', '{n1} packs {a} crates with {b} apples in each crate. {c} more apples do not fit and stay in a basket. How many apples are there in all?'), v);
          case 'tsShareLeft0': return fill(t('stem.arithmetic.bar_story_ts_share_left_0', '{n1} has {a} stickers, keeps {b} of them, and shares the rest equally among {c} friends. How many stickers does each friend get?'), v);
          case 'tsShareLeft1': return fill(t('stem.arithmetic.bar_story_ts_share_left_1', 'A club baked {a} cookies. They kept {b} for the club and packed the rest equally into {c} bags. How many cookies are in each bag?'), v);
          case 'tsCmpTotal0': return fill(t('stem.arithmetic.bar_story_ts_cmp_total_0', '{n1} has {a} trading cards. {n2} has {b} more cards than {n1}. How many cards do {n1} and {n2} have altogether?'), v);
          default: return fill(t('stem.arithmetic.bar_story_ts_cmp_total_1', 'On Monday a shop sold {a} tickets. On Tuesday it sold {b} more tickets than on Monday. How many tickets did it sell on the two days altogether?'), v);
        }
      }

      function barStepPrompt(p, idx) {
        var first = idx === 0;
        switch (p.type) {
          case 'tsSpend': return first ? t('stem.arithmetic.bar_ts_spend_1', 'Step 1 of 2: find the total amount used.') : t('stem.arithmetic.bar_ts_spend_2', 'Step 2 of 2: use your step 1 result to find how many are left.');
          case 'tsGroupsPlus': return first ? t('stem.arithmetic.bar_ts_groups_1', 'Step 1 of 2: find how many are in the equal groups.') : t('stem.arithmetic.bar_ts_groups_2', 'Step 2 of 2: use your step 1 result to find how many there are in all.');
          case 'tsShareLeft': return first ? t('stem.arithmetic.bar_ts_share_1', 'Step 1 of 2: find how many are left to share.') : t('stem.arithmetic.bar_ts_share_2', 'Step 2 of 2: use your step 1 result to find how many each one gets.');
          default: return first ? t('stem.arithmetic.bar_ts_cmp_1', 'Step 1 of 2: find the second amount.') : t('stem.arithmetic.bar_ts_cmp_2', 'Step 2 of 2: use your step 1 result to find the total of both amounts.');
        }
      }

      function barModelFeedbackText(kind, step) {
        var vals = { w: step.values.whole, l: step.values.larger };
        switch (kind) {
          case 'keyword_more': return t('stem.arithmetic.bar_fb_keyword_more', 'The word “more” does not always mean add. This story compares two amounts, so draw two bars, one for each amount, and show the difference beside the shorter bar.');
          case 'bar_incomplete': return t('stem.arithmetic.bar_fb_incomplete', 'Choose a number or ? for every part of the model.');
          case 'bar_unknown_count': return t('stem.arithmetic.bar_fb_unknown_count', 'Use exactly one ?, for the amount the question asks about. Every other part gets a number from the story.');
          case 'bar_unknown': return t('stem.arithmetic.bar_fb_unknown', 'The ? is in the wrong place. Read the question again: which amount does it ask for?');
          case 'bar_whole_part': return fill(t('stem.arithmetic.bar_fb_whole_part', 'The largest amount, {w}, is the whole. It goes on the brace over both parts, not inside one part.'), vals);
          case 'bar_compare_swap': return fill(t('stem.arithmetic.bar_fb_compare_swap', '{l} is the larger amount, so it goes on the longer bar.'), vals);
          case 'bar_groups_size': return t('stem.arithmetic.bar_fb_groups_size', 'Check which number counts the equal groups and which number is the size of each group.');
          case 'bar_slots': return t('stem.arithmetic.bar_fb_slots', 'Some numbers are in the wrong places. Match each number in the story to what it describes.');
          default: return t('stem.arithmetic.bar_fb_shape', 'Read the story again. Does it join parts into a whole, compare two amounts, or make equal groups?');
        }
      }

      function barSolveHint(step) {
        switch (step.model + ':' + step.unknown) {
          case 'partWhole:whole': return t('stem.arithmetic.bar_hint_pw_whole', 'The whole is the parts put together.');
          case 'compare:difference': return t('stem.arithmetic.bar_hint_cmp_diff', 'The difference is how much longer the larger bar is than the smaller bar.');
          case 'compare:larger': return t('stem.arithmetic.bar_hint_cmp_larger', 'The larger bar is the smaller bar and the difference together.');
          case 'compare:smaller': return t('stem.arithmetic.bar_hint_cmp_smaller', 'The smaller bar is the larger bar without the difference.');
          case 'equalGroups:total': return t('stem.arithmetic.bar_hint_eq_total', 'The total is all the equal groups together.');
          case 'equalGroups:size': return t('stem.arithmetic.bar_hint_eq_size', 'Share the total equally among the groups.');
          case 'equalGroups:groups': return t('stem.arithmetic.bar_hint_eq_groups', 'How many groups of that size fit in the total?');
          default: return t('stem.arithmetic.bar_hint_pw_part', 'A missing part is what is left of the whole after the part you know.');
        }
      }

      function barDescribe(model, values) {
        function show(slot) { var v = values[slot]; return v == null || v === '' ? t('stem.arithmetic.bar_not_chosen', 'not chosen yet') : v === '?' ? t('stem.arithmetic.bar_unknown_word', 'unknown (?)') : String(v); }
        if (model === 'partWhole') return fill(t('stem.arithmetic.bar_desc_pw', 'Part-whole model: one part is {a}, the other part is {b}, and the whole is {w}.'), { a: show('partA'), b: show('partB'), w: show('whole') });
        if (model === 'compare') return fill(t('stem.arithmetic.bar_desc_cmp', 'Comparison model: the longer bar is {l}, the shorter bar is {s}, and the difference is {d}.'), { l: show('larger'), s: show('smaller'), d: show('difference') });
        return fill(t('stem.arithmetic.bar_desc_eq', 'Equal-groups model: {g} equal groups, each of size {s}, make a total of {tot}.'), { g: show('groups'), s: show('size'), tot: show('total') });
      }

      // ---------------------------------------------------------- bar models: drawing
      function renderBarSvg(model, values) {
        function num(slot) { var n = Number(values[slot]); return values[slot] !== '' && values[slot] != null && values[slot] !== '?' && isFinite(n) && n > 0 ? n : null; }
        function label(slot) { var v = values[slot]; return v == null || v === '' ? '…' : String(v); }
        function box(key, x, y, w, ht, fillColor, slot, dashed) {
          return h('g', { key: key },
            h('rect', { x: x, y: y, width: Math.max(1, w), height: ht, fill: dashed ? 'none' : fillColor, stroke: svgArc, strokeWidth: 2, strokeDasharray: dashed ? '6 4' : undefined }),
            h('text', { x: x + w / 2, y: y + ht / 2, textAnchor: 'middle', dominantBaseline: 'central', fill: svgInk, fontSize: 13, fontWeight: 800 }, label(slot)));
        }
        function brace(key, x1, x2, y, slot) {
          return h('g', { key: key },
            h('path', { d: 'M' + x1 + ' ' + (y + 8) + ' L' + x1 + ' ' + y + ' L' + x2 + ' ' + y + ' L' + x2 + ' ' + (y + 8), fill: 'none', stroke: svgArc, strokeWidth: 2 }),
            h('text', { x: (x1 + x2) / 2, y: y - 8, textAnchor: 'middle', fill: svgInk, fontSize: 13, fontWeight: 800 }, label(slot)));
        }
        var parts = [];
        if (model === 'partWhole') {
          var pa = num('partA'), pb = num('partB'), w = num('whole');
          if (pa == null && w != null && pb != null && w > pb) pa = w - pb;
          if (pb == null && w != null && pa != null && w > pa) pb = w - pa;
          var share = pa != null && pb != null ? pa / (pa + pb) : 0.5;
          var wa = Math.max(50, Math.min(270, 320 * share));
          parts = [brace('w', 20, 340, 30, 'whole'), box('a', 20, 44, wa, 44, fillA, 'partA'), box('b', 20 + wa, 44, 320 - wa, 44, fillB, 'partB')];
        } else if (model === 'compare') {
          var L = num('larger'), S = num('smaller'), dd = num('difference');
          if (S == null && L != null && dd != null && L > dd) S = L - dd;
          if (L == null && S != null && dd != null) L = S + dd;
          var ratio = L && S ? Math.max(0.15, Math.min(0.85, S / L)) : 0.6;
          var ws = 320 * ratio;
          parts = [box('l', 20, 14, 320, 40, fillA, 'larger'), box('s', 20, 74, ws, 40, fillB, 'smaller'), box('d', 20 + ws, 74, 320 - ws, 40, fillB, 'difference', true)];
        } else {
          var g = num('groups');
          var units = g != null && g <= 10 ? g : 5;
          var gap = g == null || g > 10;
          var uw = 320 / units;
          parts = [brace('t', 20, 340, 30, 'total')];
          for (var i = 0; i < units; i++) {
            if (gap && i === units - 2) { parts.push(h('text', { key: 'gap', x: 20 + uw * i + uw / 2, y: 66, textAnchor: 'middle', dominantBaseline: 'central', fill: svgInk, fontSize: 18, fontWeight: 800 }, '…')); continue; }
            parts.push(box('u' + i, 20 + uw * i, 44, uw, 44, i % 2 ? fillB : fillA, 'size'));
          }
          parts.push(h('text', { key: 'g', x: 180, y: 112, textAnchor: 'middle', fill: svgInk, fontSize: 12, fontWeight: 700 }, fill(t('stem.arithmetic.bar_groups_label', 'Equal groups: {g}'), { g: label('groups') })));
        }
        return h('svg', { viewBox: '0 0 360 124', 'aria-hidden': true, 'data-bar-svg': model, style: { width: '100%', maxWidth: 520, display: 'block', margin: 'auto' } }, parts);
      }

      function renderBarModelView(model, values, title) {
        var slots = BAR_SLOTS[model];
        return h('section', { className: 'rounded-xl p-3 space-y-2', 'data-bar-model-view': model, style: sectionStyle },
          h('h4', { className: 'text-sm font-black', style: { color: accentText } }, title),
          h('div', { role: 'img', 'aria-label': barDescribe(model, values) }, renderBarSvg(model, values)),
          h('table', { className: 'text-xs', style: { borderCollapse: 'collapse', color: text } },
            h('caption', { className: 'sr-only' }, barDescribe(model, values)),
            h('tbody', null, slots.map(function (slot) {
              var v = values[slot];
              return h('tr', { key: slot }, h('th', { scope: 'row', className: 'text-left pr-3 py-1' }, barSlotName(slot)), h('td', { className: 'font-mono font-bold py-1' }, v == null || v === '' ? '—' : String(v)));
            }))));
      }

      // ---------------------------------------------------------- bar models: actions
      function barOptions(p, idx) {
        var list = [];
        Object.keys(p.nums).forEach(function (k) { var n = p.nums[k]; if (list.indexOf(String(n)) < 0) list.push(String(n)); });
        var stepResults = [];
        for (var i = 0; i < idx; i++) { var r = String(p.steps[i].answer); if (list.indexOf(r) < 0) { list.push(r); stepResults.push(r); } }
        return list.map(function (n) { return { value: n, label: stepResults.indexOf(n) >= 0 ? fill(t('stem.arithmetic.bar_opt_step', '{n} (step 1 result)'), { n: n }) : n }; });
      }

      function barReset(extra) {
        return Object.assign({ barModel: { model: null, values: {} }, barModelLocked: false, barModelTry: 0, barModelFeedback: null, barModelKind: null, barOp: null, barAnswer: '', barTry: 0, barFeedback: null, barKind: null }, extra || {});
      }

      function setBarModel(model) {
        if (barModelLocked) return;
        update({ barFor: barProblem.id, barStep: barStepIdx, barModel: { model: model, values: model === barBuilt.model ? barBuilt.values : {} }, barModelFeedback: null });
        announce(fill(t('stem.arithmetic.bar_model_chosen', '{model} model chosen.'), { model: barModelName(model) }));
      }

      function setBarSlot(slot, value) {
        if (barModelLocked) return;
        var values = Object.assign({}, barBuilt.values);
        values[slot] = value;
        update({ barFor: barProblem.id, barStep: barStepIdx, barModel: { model: barBuilt.model, values: values }, barModelFeedback: null });
      }

      function checkBarModelNow() {
        var step = barStepNow;
        var res = checkBarModel(step, barBuilt);
        var tries = barModelTry + (res.ok ? 0 : 1);
        var p = barProblem;
        update(function (current) {
          var patch = { barFor: p.id, barStep: barStepIdx, barModelTry: tries, barModelFeedback: res.ok ? 'ok' : 'try', barModelKind: res.kind, barModelLocked: res.ok };
          if (!res.ok) { patch.barMissed = addFlag(current, 'barMissed', p.id, true); patch.missLog = recordMiss(current, { src: 'bar', id: p.id, op: step.op, prompt: barStory(p), given: barModelName(barBuilt.model), kind: res.kind, revealed: false }); }
          return patch;
        });
        announce(res.ok ? t('stem.arithmetic.bar_model_ok', 'Your model matches the story. Now solve for the ?.') : barModelFeedbackText(res.kind, step));
      }

      function revealBarModel() {
        var step = barStepNow, p = barProblem;
        if (barModelTry < 2 || !teacher.reveals) return;
        update(function (current) { return { barFor: p.id, barStep: barStepIdx, barModel: { model: step.model, values: Object.assign({}, step.values) }, barModelLocked: true, barModelFeedback: 'shown', barRevealed: addFlag(current, 'barRevealed', p.id, true) }; });
        announce(fill(t('stem.arithmetic.bar_model_shown_sr', 'The model is shown: {desc}'), { desc: barDescribe(step.model, step.values) }));
      }

      function checkBarSolve() {
        var step = barStepNow, p = barProblem;
        var res = checkBarAnswer(step, barOp, barAnswer);
        var tries = barTry + (res.ok ? 0 : 1);
        var last = barStepIdx === p.steps.length - 1;
        var finishing = res.ok && last;
        var awardable = finishing && !barSolvedNow && !barRevealedNow && !sameContentSeen(p.id, [d.barSolved, d.barRevealed]);
        var repeatWhy = finishing && !barSolvedNow && !barRevealedNow ? repeatReason(p.id, d.barSolved, d.barRevealed) : null;
        update(function (current) {
          var patch = { barFor: p.id, barStep: barStepIdx, barTry: tries, barFeedback: res.ok ? (last ? 'solved' : 'step') : 'try', barKind: res.kind };
          if (finishing) { patch.barSolved = addFlag(current, 'barSolved', p.id, true); patch.barMissed = addFlag(current, 'barMissed', p.id, false); patch.noCreditFor = repeatWhy ? 'bar:' + p.id : null; patch.noCreditWhy = repeatWhy; }
          if (!res.ok) { patch.barMissed = addFlag(current, 'barMissed', p.id, true); patch.missLog = recordMiss(current, { src: 'bar', id: p.id, op: step.op, prompt: barStory(p), given: (barOp ? sym(barOp) + ' ' : '') + barAnswer, kind: res.kind || 'unknown', revealed: false }); }
          return patch;
        });
        if (awardable && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', p.twoStep ? 4 : 3, t('stem.arithmetic.xp_bar_model', 'Arithmetic bar model problem'));
        announce(res.ok
          ? (last ? withRepeatNote(t('stem.arithmetic.bar_solved_sr', 'Correct. The bar model and the answer both fit the story.'), repeatWhy) : t('stem.arithmetic.bar_step_done_sr', 'Step 1 is right. Go on to step 2.'))
          : barSolveFeedbackText(res.kind, step));
      }

      function barSolveFeedbackText(kind, step) {
        if (kind === 'keyword_more') return errorKindFeedback('keyword_more', { op: step.op, a: step.x, b: step.y }, '');
        if (kind === 'wrong_operation') return t('stem.arithmetic.bar_fb_operation', 'Look at your bar model. Is the ? a whole, a part, a difference, a total of equal groups, or the size or number of groups? That tells you the operation.');
        return errorKindFeedback(kind, { op: step.op, a: step.x, b: step.y, answer: step.answer, fact: isBasicFact(step.op, step.x, step.y) }, '');
      }

      function revealBarAnswer() {
        var step = barStepNow, p = barProblem;
        if (barTry < 2 || !teacher.reveals) return;
        var last = barStepIdx === p.steps.length - 1;
        update(function (current) { return { barFor: p.id, barStep: barStepIdx, barOp: step.op, barAnswer: String(step.answer), barFeedback: last ? 'revealed' : 'step', barRevealed: addFlag(current, 'barRevealed', p.id, true) }; });
        announce(fill(t('stem.arithmetic.bar_answer_shown_sr', 'The answer to this step is {x}.'), { x: step.answer }));
      }

      function selectBar(index, message) {
        update(barReset({ barIndex: index, barFor: null, barStep: 0 }));
        if (message) announce(message);
      }

      function renderBars() {
        var p = barProblem;
        if (!p) return h('p', { className: 'text-sm' }, t('stem.arithmetic.bar_none_allowed', 'Your teacher has turned off the operations these problems use.'));
        var step = barStepNow;
        var solvedDone = barSolvedNow && (!barOn || barFeedback === 'solved' || barFeedback == null);
        var finished = solvedDone || barFeedback === 'revealed';
        var modelLocked = barModelLocked || finished;
        var built = finished && !barModelLocked ? { model: step.model, values: step.values } : barBuilt;
        var slots = built.model ? BAR_SLOTS[built.model] : [];
        var options = barOptions(p, barStepIdx);
        var filled = built.model && slots.every(function (s) { return built.values[s] != null && built.values[s] !== ''; });
        var solveDisabled = !modelLocked || finished || barFeedback === 'step';
        var question = barStory(p);
        return h('div', { className: 'space-y-3', 'data-bar-problem': p.id, 'data-bar-step': barStepIdx },
          h('div', null,
            h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.bar_title', 'Bar models (tape diagrams)')),
            h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.bar_intro', 'Build a bar model of the story first. The model shows which amount is unknown, so it tells you the operation.'))),
          h('p', { className: 'text-xs font-bold', style: { color: muted } }, fill(t('stem.arithmetic.bar_status', 'Problem {n}. Solved so far: {s}.'), { n: barIndex + 1, s: Object.keys(mapOf('barSolved')).length })),
          h('div', { className: 'rounded-xl p-4 space-y-2', style: sectionStyle },
            h('p', { className: 'text-sm font-semibold leading-relaxed', 'data-bar-story': p.type }, question),
            p.twoStep && h('p', { className: 'text-xs font-black', style: { color: accentText } }, barStepPrompt(p, barStepIdx)),
            p.twoStep && barStepIdx > 0 && h('p', { className: 'text-xs' }, fill(t('stem.arithmetic.bar_step1_result', 'Step 1 result: {x}.'), { x: p.steps[0].answer })),
            h('div', { className: 'flex flex-wrap gap-2' }, renderReadAloud('bar-story', function () { return question + ' ' + (built.model ? barDescribe(built.model, built.values) : ''); }, t('stem.arithmetic.bar_read', 'Read the story aloud')))),
          h('fieldset', { className: 'rounded-xl p-3 space-y-2', style: { border: '1px solid ' + border } },
            h('legend', { className: 'px-1 text-xs font-black' }, t('stem.arithmetic.bar_build_legend', 'Build the bar model')),
            h('div', { role: 'group', 'aria-label': t('stem.arithmetic.bar_model_group', 'Kind of model'), className: 'grid sm:grid-cols-3 gap-2' }, BAR_MODELS.map(function (m) {
              var on = built.model === m;
              return h('button', { key: m, type: 'button', 'data-bar-model': m, 'aria-pressed': on, disabled: modelLocked, onClick: function () { setBarModel(m); }, className: 'rounded-lg px-3 py-2 text-xs font-bold text-left disabled:opacity-70', style: Object.assign(toggleStyle(on), { whiteSpace: 'normal' }) },
                h('span', { className: 'block font-black' }, barModelName(m)), h('span', { className: 'block font-normal' }, barModelDesc(m)));
            })),
            built.model && h('div', { className: 'grid sm:grid-cols-3 gap-2' }, slots.map(function (slot) {
              var id = 'arithmetic-bar-slot-' + slot;
              return h('label', { key: slot, htmlFor: id, className: 'text-xs font-bold' }, barSlotName(slot),
                h('select', { id: id, 'data-bar-slot': slot, value: built.values[slot] == null ? '' : String(built.values[slot]), disabled: modelLocked, onChange: function (e) { setBarSlot(slot, e.target.value); }, className: 'mt-1 block w-full rounded-lg px-2 py-2 font-mono', style: inputStyle },
                  h('option', { value: '' }, t('stem.arithmetic.bar_choose', 'Choose…')),
                  options.map(function (o) { return h('option', { key: o.value, value: o.value }, o.label); }),
                  h('option', { value: '?' }, t('stem.arithmetic.bar_opt_unknown', '? (the unknown)'))));
            })),
            built.model && renderBarModelView(built.model, built.values, modelLocked ? t('stem.arithmetic.bar_your_model', 'Your bar model') : t('stem.arithmetic.bar_preview', 'Your model so far')),
            !modelLocked && h('div', { className: 'flex flex-wrap gap-2' },
              h('button', { type: 'button', onClick: checkBarModelNow, disabled: !filled, className: 'rounded-lg px-3 py-2 text-xs font-black disabled:opacity-40', style: solidAccent(opMeta) }, t('stem.arithmetic.bar_check_model', 'Check my model')),
              barModelTry >= 2 && teacher.reveals && h('button', { type: 'button', onClick: revealBarModel, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.bar_show_model', 'Show the model'))),
            barModelFeedback === 'try' && !modelLocked && feedbackPanel(false, [
              h('p', { key: 'k', 'data-bar-model-error': d.barModelKind || 'none' }, barModelFeedbackText(d.barModelKind, step)),
              h('p', { key: 'n', className: 'font-normal' }, barModelTry >= 2 && teacher.reveals ? t('stem.arithmetic.bar_model_two_tries', 'You can change the model and check again, or show the model (the problem then earns no points).') : t('stem.arithmetic.bar_model_again', 'Change the model and check it again.'))
            ]),
            barModelFeedback === 'try' && !modelLocked && renderAiHint('bar-model:' + p.id + ':' + barStepIdx, question, barModelName(barBuilt.model), barDescribe(step.model, step.values), barModelTry),
            barModelFeedback === 'ok' && barOn && feedbackPanel(true, t('stem.arithmetic.bar_model_ok', 'Your model matches the story. Now solve for the ?.')),
            barModelFeedback === 'shown' && barOn && feedbackPanel(false, t('stem.arithmetic.bar_model_shown', 'Here is a model that fits the story. Compare it with yours, then solve for the ?.'))),
          h('fieldset', { className: 'rounded-xl p-3 space-y-2', disabled: !modelLocked, style: { border: '1px solid ' + border, opacity: modelLocked ? 1 : 0.7 } },
            h('legend', { className: 'px-1 text-xs font-black' }, t('stem.arithmetic.bar_solve_legend', 'Solve for the ?')),
            !modelLocked && h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.bar_build_first', 'Build and check the model first. Then you can solve.')),
            h('div', { role: 'group', 'aria-label': t('stem.arithmetic.operation_for_the_current_story', 'Operation for the current story'), className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' }, OP_IDS.map(function (op) {
              var on = (finished && !barOn ? step.op : barOp) === op;
              return h('button', { key: op, type: 'button', 'data-bar-op': op, 'aria-pressed': on, disabled: solveDisabled, onClick: function () { update({ barFor: p.id, barStep: barStepIdx, barOp: op, barFeedback: barFeedback === 'try' ? 'try' : null }); }, className: 'rounded-lg px-3 py-2 text-xs font-black disabled:opacity-60', style: toggleStyle(on, OPERATIONS[op]) }, OPERATIONS[op].symbol + ' ' + opLabel(t, op));
            })),
            h('div', { className: 'flex flex-wrap items-end gap-2' },
              h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.bar_answer', 'Value of the ?'),
                h('input', { type: 'number', inputMode: 'numeric', value: finished && !barOn ? String(step.answer) : barAnswer, disabled: solveDisabled, onChange: function (e) { update({ barFor: p.id, barStep: barStepIdx, barAnswer: e.target.value, barFeedback: barFeedback === 'try' ? 'try' : null }); }, className: 'mt-1 block w-36 rounded-lg px-3 py-2 font-mono', style: inputStyle })),
              h('button', { type: 'button', onClick: checkBarSolve, disabled: solveDisabled || !barOp || barAnswer === '', className: 'rounded-lg px-4 py-2 text-sm font-black disabled:opacity-40', style: solidAccent(opMeta) }, solvedDone ? t('stem.arithmetic.solved', 'Solved') : t('stem.arithmetic.check_answer', 'Check answer')),
              barTry >= 2 && barFeedback === 'try' && teacher.reveals && h('button', { type: 'button', onClick: revealBarAnswer, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.show_answer', 'Show the answer')))),
          barFeedback === 'try' && feedbackPanel(false, [
            h('p', { key: 'k', 'data-named-error': d.barKind || 'none' }, barSolveFeedbackText(d.barKind, step)),
            hintLine(barSolveHint(step), 'h'),
            h('p', { key: 'n', className: 'font-normal' }, tryNextLine(barTry))
          ]),
          barFeedback === 'try' && renderAiHint('bar:' + p.id + ':' + barStepIdx, question, barAnswer, step.answer, barTry),
          barFeedback === 'step' && feedbackPanel(true, [
            h('p', { key: 'm' }, fill(t('stem.arithmetic.bar_step_done', 'Step 1: the ? is {x}. Now build a model for step 2.'), { x: step.answer })),
            h('button', { key: 'b', type: 'button', onClick: function () { update(barReset({ barFor: p.id, barStep: barStepIdx + 1 })); announce(barStepPrompt(p, barStepIdx + 1)); }, className: 'rounded-lg px-3 py-2 text-xs font-black', style: solidAccent(opMeta) }, t('stem.arithmetic.bar_go_step2', 'Go on to step 2'))
          ]),
          finished && feedbackPanel(solvedDone, [
            h('p', { key: 'm', 'data-bar-done': solvedDone ? 'solved' : 'revealed' }, solvedDone
              ? fill(t('stem.arithmetic.bar_solved', 'Correct. The answer is {x}.'), { x: p.answer })
              : fill(t('stem.arithmetic.bar_revealed', 'The answer is {x}. This problem earns no points, and it stays on your missed list.'), { x: p.answer })),
            barRevealedNow && solvedDone && h('p', { key: 'nc', className: 'font-normal' }, t('stem.arithmetic.bar_no_credit', 'Part of this problem was shown, so it earns no points.')),
            solvedDone && repeatNoCreditNote('bar', p.id),
            p.steps.some(function (s) { return s.keyword; }) && h('p', { key: 'kw', className: 'font-normal', 'data-keyword-note': true }, t('stem.arithmetic.bar_keyword_note', 'Notice: this story says “more”, but the model shows a missing part, so the operation is subtraction. Read the relationship, not just the key word.'))
          ]),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function () { var next = nextAllowedIndex(barGen, barIndex + 1, allowedOps, function (q) { return (q.twoStep && !teacher.twoStep) || !!mapOf('barSolved')[q.id]; }); selectBar(next < 0 ? barIndex + 1 : next, t('stem.arithmetic.new_problem_ready', 'A new problem is ready.')); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.next_problem', 'Next problem')),
            missedButton(barMissedIds, function () {
              var pos = barMissedIds.indexOf(p.id);
              var parsed = parseBarId(barMissedIds[pos < 0 ? 0 : (pos + 1) % barMissedIds.length]);
              if (parsed) selectBar(parsed.index, t('stem.arithmetic.retrying_missed_problem', 'Retrying a missed practice problem.'));
            })));
      }

      // ---------------------------------------------------------- decimals
      function decPlaceName(e) {
        if (e <= -2) return t('stem.arithmetic.dec_place_hundredths', 'hundredths');
        if (e === -1) return t('stem.arithmetic.dec_place_tenths', 'tenths');
        if (e === 0) return t('stem.arithmetic.place_ones', 'ones');
        if (e === 1) return t('stem.arithmetic.place_tens', 'tens');
        return t('stem.arithmetic.place_hundreds', 'hundreds');
      }
      function unitLabel(e) { return fmtNum(roundTo(Math.pow(10, e), 4)); }

      function renderDiskRow(counts, dp, label, keyBase) {
        return h('div', { key: keyBase, className: 'space-y-1' },
          label && h('p', { className: 'text-xs font-bold' }, label),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(96px,1fr))', gap: 6 } }, counts.map(function (_, rev) {
            var i = counts.length - 1 - rev, e = i - dp, count = counts[i];
            var drawn = Math.min(count, 20);
            return h('div', { key: i, 'data-dec-place': unitLabel(e), 'data-dec-count': count, style: { border: '1px solid ' + border, borderRadius: 8, padding: 6 } },
              h('p', { className: 'text-xs font-bold' }, fill(t('stem.arithmetic.dec_place_count', '{n} × {unit} ({place})'), { n: count, unit: unitLabel(e), place: decPlaceName(e) })),
              h('div', { 'aria-hidden': true, style: { display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 } }, Array.from({ length: drawn }, function (_, k) {
                return h('span', { key: k, style: { minWidth: 26, height: 26, padding: '0 3px', borderRadius: 13, border: '1px solid ' + accentText, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: text, background: card } }, unitLabel(e));
              })),
              count > drawn && h('p', { className: 'text-xs' }, fill(t('stem.arithmetic.dec_more_disks', 'and {n} more'), { n: count - drawn })));
          })));
      }

      function digitCounts(scaled, places) { var out = []; for (var i = 0; i < places; i++) out.push(Math.floor(scaled / Math.pow(10, i)) % 10); return out; }

      function decStageNote(item, walk, stage, isLast) {
        var note;
        if (stage.kind === 'start') {
          note = item.op === 'multiply'
            ? fill(t('stem.arithmetic.dec_start_mul', 'Make {n} groups of {d}. Each place now has {n} times as many disks.'), { n: walk.n, d: fmtNum(walk.dec) })
            : item.op === 'add' ? t('stem.arithmetic.dec_start_add', 'Put the disks for both numbers together, place by place.')
              : fill(t('stem.arithmetic.dec_start_sub', 'Start with the disks for {a}.'), { a: fmtNum(item.a) });
        } else if (stage.kind === 'exchange') {
          if (item.op === 'subtract') note = fill(t('stem.arithmetic.dec_exchange_down', 'Exchange one {big} disk for ten {small} disks. The value stays the same.'), { big: unitLabel(stage.donor - walk.dp), small: unitLabel(stage.place - walk.dp) });
          else if (item.op === 'multiply') note = fill(t('stem.arithmetic.dec_exchange_mul', 'Exchange {k} groups of ten {small} disks for {k} {big} disks.'), { k: stage.carry, small: unitLabel(stage.place - walk.dp), big: unitLabel(stage.place + 1 - walk.dp) });
          else note = fill(t('stem.arithmetic.dec_exchange_up', 'Exchange ten {small} disks for one {big} disk. The value stays the same.'), { small: unitLabel(stage.place - walk.dp), big: unitLabel(stage.place + 1 - walk.dp) });
        } else if (stage.kind === 'remove') {
          note = fill(t('stem.arithmetic.dec_remove', 'Take away {n} disks of {unit}.'), { n: stage.removed, unit: unitLabel(stage.place - walk.dp) });
        } else note = t('stem.arithmetic.dec_settled', 'Every place is settled.');
        return isLast ? note + ' ' + fill(t('stem.arithmetic.dec_read_total', 'Read the disks: {x}.'), { x: fmtNum(walk.total) }) : note;
      }

      function decFeedbackText(kind, item) {
        var dp = item.dp;
        if (kind === 'decimal_align') {
          var shorter = decimalsOf(item.a) < decimalsOf(item.b) ? item.a : item.b;
          return fill(t('stem.arithmetic.dec_fb_align', 'It looks like the digits were lined up from the right, as with whole numbers. Line up the places instead: ones under ones, tenths under tenths. Writing {short} as {padded} can help.'), { short: fmtNum(shorter), padded: fmtNum(shorter, dp) });
        }
        if (kind === 'decimal_places') return fill(t('stem.arithmetic.dec_fb_places', 'The digits look right, but the decimal point is in the wrong place. Estimate: the answer should be close to {est}.'), { est: fmtNum(decEstimate(item)) });
        return errorKindFeedback(kind, { op: item.op, a: item.a, b: item.b, answer: item.answer, fact: false, decimal: true }, '');
      }

      function decEstimate(item) {
        if (item.op === 'multiply') { var whole = isInt(item.a) ? item.a : item.b, dec = isInt(item.a) ? item.b : item.a; return roundTo(whole * (Math.round(dec) || roundTo(dec, 1)), 2); }
        return item.op === 'add' ? Math.round(item.a) + Math.round(item.b) : Math.round(item.a) - Math.round(item.b);
      }

      function renderPlaceChart(item) {
        var dp = item.dp, top = Math.max(String(Math.floor(item.a)).length, String(Math.floor(item.b)).length);
        var cols = []; for (var e = top - 1; e >= -dp; e--) cols.push(e);
        function cells(x) {
          var s = fmtNum(x, dp), parts = s.split('.'), ip = parts[0], fp = parts[1] || '';
          var own = fmtNum(x).split('.')[1] || '';
          return cols.map(function (e) {
            if (e >= 0) { var idx = ip.length - 1 - e; return { digit: idx >= 0 ? ip[idx] : '', padded: false }; }
            var j = -e - 1; return { digit: fp[j] || '0', padded: j >= own.length };
          });
        }
        return h('div', { className: 'overflow-x-auto', 'data-dec-chart': true },
          h('table', { className: 'text-center text-sm', style: { borderCollapse: 'collapse', color: text } },
            h('caption', { className: 'text-left text-xs font-bold' }, t('stem.arithmetic.dec_chart_caption', 'The two numbers lined up by place. A zero in brackets fills an empty place.')),
            h('thead', null, h('tr', null, h('th', { scope: 'col', className: 'p-1' }, t('stem.arithmetic.number', 'Number')), cols.map(function (e) { return h('th', { key: e, scope: 'col', className: 'p-1' }, decPlaceName(e)); }))),
            h('tbody', null, [item.a, item.b].map(function (x, row) {
              return h('tr', { key: row }, h('th', { scope: 'row', className: 'p-1 text-left' }, fmtNum(x)), cells(x).map(function (c, k) { return h('td', { key: k, className: 'p-1 font-mono font-bold', style: { borderLeft: cols[k] === -1 ? '3px solid ' + accentText : undefined } }, c.padded ? '(' + c.digit + ')' : c.digit); }));
            }))));
      }

      function checkDecimal() {
        var item = decItem;
        var g = parseNum(decAnswer);
        if (!item || !isFinite(g) || decSolvedNow || decFeedback === 'revealed') return;
        var correct = numEq(roundTo(g, 6), roundTo(item.answer, 6));
        var tries = decTry + (correct ? 0 : 1);
        var kind = correct ? null : diagnoseDecimal(item.op, item.a, item.b, g);
        var awardable = correct && !decSolvedNow && !decRevealedNow && !sameContentSeen(item.id, [d.decSolved, d.decRevealed]);
        var repeatWhy = correct && !decSolvedNow && !decRevealedNow ? repeatReason(item.id, d.decSolved, d.decRevealed) : null;
        update(function (current) {
          var patch = { decFor: item.id, decTry: tries, decFeedback: correct ? 'correct' : 'try', decKind: kind, decStep: 0, decSolved: addFlag(current, 'decSolved', item.id, correct || !!(current.decSolved || {})[item.id]), decMissed: addFlag(current, 'decMissed', item.id, !correct) };
          if (correct) { patch.noCreditFor = repeatWhy ? 'dec:' + item.id : null; patch.noCreditWhy = repeatWhy; }
          if (!correct) patch.missLog = recordMiss(current, { src: 'decimal', id: item.id, op: item.op, a: item.a, b: item.b, given: decAnswer, kind: kind || 'unknown', revealed: false });
          return patch;
        });
        if (awardable && typeof ctx.awardXP === 'function') ctx.awardXP('arithmeticStudio', 2, t('stem.arithmetic.xp_decimal', 'Arithmetic decimal problem'));
        announce(correct ? withRepeatNote(t('stem.arithmetic.dec_correct_sr', 'Correct. The disk model now shows each exchange.'), repeatWhy) : decFeedbackText(kind, item));
      }

      function revealDecimal() {
        var item = decItem;
        if (!item || decTry < 2 || !teacher.reveals) return;
        update(function (current) { return { decFor: item.id, decFeedback: 'revealed', decStep: 0, decRevealed: addFlag(current, 'decRevealed', item.id, true), missLog: recordMiss(current, { src: 'decimal', id: item.id, op: item.op, a: item.a, b: item.b, given: decAnswer, kind: decKind || 'unknown', revealed: true }) }; });
        announce(fill(t('stem.arithmetic.dec_revealed_sr', 'The answer is {x}. Step through the disk model to see why.'), { x: fmtNum(item.answer) }));
      }

      function selectDecimal(index, message) {
        update({ decIndex: index, decFor: null, decAnswer: '', decTry: 0, decFeedback: null, decKind: null, decStep: 0 });
        if (message) announce(message);
      }

      function renderDecimals() {
        var item = decItem;
        var header = h('div', null,
          h('h2', { className: 'text-base font-black' }, t('stem.arithmetic.dec_title', 'Decimals with base-ten disks')),
          h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.dec_intro', 'Add, subtract and multiply decimals with a model. Line up places, not digits.')));
        if (!item) return h(React.Fragment, null, header, h('p', { className: 'text-sm' }, t('stem.arithmetic.dec_none_allowed', 'Your teacher has turned off the operations these problems use.')));
        var finished = decSolvedNow && (!decOn || decFeedback === 'correct' || decFeedback == null) || decFeedback === 'revealed';
        var solvedView = decSolvedNow && decFeedback !== 'revealed';
        var walk = decimalStages(item);
        var stepNow = decOn ? clampInt(d.decStep, 0, walk.stages.length - 1, 0) : 0;
        var stage = walk.stages[stepNow];
        var f = Math.pow(10, walk.dp);
        var places = Math.max(walk.dp + 1, walk.stages[0].counts.length);
        var tenthsNote = band === 'k2' || band === 'g3';
        return h(React.Fragment, null, header,
          tenthsNote && h('p', { className: 'text-xs', style: { color: muted } }, t('stem.arithmetic.dec_tenths_note', 'Decimal operations are grade 5 work. At this grade band the problems use tenths only.')),
          teacher.decMode
            ? h('p', { className: 'text-xs font-bold', style: { color: muted } }, t('stem.arithmetic.dec_locked', 'Your teacher chose this kind of decimal problem.'))
            : decModes.length > 1 && modeButtons(t('stem.arithmetic.dec_mode_group', 'Kind of decimal problem'), [['addsub', t('stem.arithmetic.dec_mode_addsub', 'Add and subtract')], ['mulwhole', t('stem.arithmetic.dec_mode_mulwhole', 'Multiply by a whole number')]], decMode, function (m) { update({ decMode: m, decIndex: 0, decFor: null, decAnswer: '', decTry: 0, decFeedback: null, decKind: null, decStep: 0 }); }, 'dec-mode'),
          h('p', { className: 'text-xs font-bold', style: { color: muted } }, fill(t('stem.arithmetic.dec_status', 'Problem {n}. Solved so far: {s}.'), { n: decIndex + 1, s: Object.keys(mapOf('decSolved')).length })),
          h('div', { 'data-dec-item': item.id }, renderEquation(item.a, item.b, item.op)),
          !finished && h('section', { className: 'rounded-xl p-3 space-y-2', 'data-dec-start': true, style: sectionStyle },
            h('h3', { className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.dec_as_disks', 'The numbers as disks')),
            item.op === 'multiply'
              ? h(React.Fragment, null,
                renderDiskRow(digitCounts(Math.round(walk.dec * f), places), walk.dp, fill(t('stem.arithmetic.dec_one_group', 'One group: {d}'), { d: fmtNum(walk.dec) }), 'one'),
                h('p', { className: 'text-sm font-bold' }, fill(t('stem.arithmetic.dec_groups_like', 'There are {n} groups like this one.'), { n: walk.n })))
              : h(React.Fragment, null,
                renderDiskRow(digitCounts(Math.round(item.a * f), places), walk.dp, fill(t('stem.arithmetic.dec_first_row', 'First number: {x}'), { x: fmtNum(item.a) }), 'a'),
                renderDiskRow(digitCounts(Math.round(item.b * f), places), walk.dp, fill(t('stem.arithmetic.dec_second_row', 'Second number: {x}'), { x: fmtNum(item.b) }), 'b'))),
          !finished && h('div', { className: 'flex flex-wrap items-end gap-2' },
            h('label', { className: 'text-xs font-bold' }, t('stem.arithmetic.exact_answer', 'Exact answer'),
              h('input', { type: 'number', step: 'any', inputMode: 'decimal', value: decAnswer, onChange: function (e) { update({ decFor: item.id, decAnswer: e.target.value, decFeedback: decFeedback === 'try' ? 'try' : null }); }, className: 'mt-1 block w-36 rounded-lg px-3 py-2 font-mono', style: inputStyle })),
            h('button', { type: 'button', onClick: checkDecimal, disabled: decAnswer === '', className: 'rounded-lg px-4 py-2 text-sm font-black disabled:opacity-40', style: solidAccent(opMeta) }, t('stem.arithmetic.check_answer', 'Check answer')),
            decTry >= 2 && decFeedback === 'try' && teacher.reveals && h('button', { type: 'button', onClick: revealDecimal, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.show_answer', 'Show the answer'))),
          decFeedback === 'try' && !finished && feedbackPanel(false, [
            h('p', { key: 'k', 'data-named-error': decKind || 'none' }, decFeedbackText(decKind, item)),
            h('p', { key: 'n', className: 'font-normal' }, decTry >= 2 && teacher.reveals ? t('stem.arithmetic.nt_two_tries', 'You can try again, ask for a hint, or show the answer (it then earns no points).') : t('stem.arithmetic.dec_try_again', 'Use the place chart below, then try again.'))
          ]),
          decFeedback === 'try' && !finished && (item.op === 'multiply'
            ? feedbackPanel(false, fill(t('stem.arithmetic.dec_hint_estimate', 'Hint: estimate first. {n} × {d} is about {est}.'), { n: walk.n, d: fmtNum(walk.dec), est: fmtNum(decEstimate(item)) }))
            : renderPlaceChart(item)),
          decFeedback === 'try' && !finished && renderAiHint('dec:' + item.id, fmtNum(item.a) + ' ' + sym(item.op) + ' ' + fmtNum(item.b), decAnswer, fmtNum(item.answer), decTry),
          finished && feedbackPanel(solvedView, [
            h('p', { key: 'm', 'data-dec-done': solvedView ? 'solved' : 'revealed' }, solvedView
              ? fill(t('stem.arithmetic.dec_correct', 'Correct: {a} {sym} {b} = {x}.'), { a: fmtNum(item.a), sym: sym(item.op), b: fmtNum(item.b), x: fmtNum(item.answer) })
              : fill(t('stem.arithmetic.dec_revealed', 'The answer is {x}. This one earns no points, and it stays on your missed list.'), { x: fmtNum(item.answer) })),
            decRevealedNow && solvedView && h('p', { key: 'nc', className: 'font-normal' }, t('stem.arithmetic.no_credit_after_reveal', 'The answer had been shown earlier, so this one earns no points.')),
            solvedView && repeatNoCreditNote('dec', item.id)
          ]),
          finished && h('section', { className: 'rounded-xl p-3 space-y-2', 'data-dec-walk': stepNow, style: sectionStyle },
            h('h3', { className: 'text-sm font-black', style: { color: accentText } }, t('stem.arithmetic.dec_walk_title', 'Disk model, one exchange at a time')),
            h('p', { role: 'status', className: 'text-sm', 'data-dec-note': stage.kind }, decStageNote(item, walk, stage, stepNow === walk.stages.length - 1)),
            renderDiskRow(stage.counts, walk.dp, null, 'walk'),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('button', { type: 'button', disabled: stepNow === 0, onClick: function () { update({ decFor: item.id, decStep: stepNow - 1 }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50', style: ghostStyle }, t('stem.arithmetic.previous_exchange', 'Previous step')),
              h('button', { type: 'button', disabled: stepNow === walk.stages.length - 1, onClick: function () { update({ decFor: item.id, decStep: stepNow + 1 }); }, className: 'rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50', style: ghostStyle }, t('stem.arithmetic.next_exchange', 'Next step')),
              h('span', { className: 'text-xs' }, fill(t('stem.arithmetic.step_counter', 'Step {n} of {total}'), { n: stepNow + 1, total: walk.stages.length })),
              renderReadAloud('decimal-walk', function () { return walk.stages.map(function (s, i) { return decStageNote(item, walk, s, i === walk.stages.length - 1); }).join(' '); }, t('stem.arithmetic.read_steps_aloud', 'Read the steps aloud')))),
          h('div', { className: 'flex flex-wrap gap-2' },
            h('button', { type: 'button', onClick: function () { var next = nextAllowedIndex(decGen, decIndex + 1, allowedOps, function (q) { return !!mapOf('decSolved')[q.id]; }); selectDecimal(next < 0 ? decIndex + 1 : next, t('stem.arithmetic.new_problem_ready', 'A new problem is ready.')); }, className: 'rounded-lg px-3 py-2 text-xs font-bold', style: ghostStyle }, t('stem.arithmetic.next_problem', 'Next problem')),
            missedButton(decMissedIds, function () {
              var pos = decMissedIds.indexOf(item.id);
              var m = /-(\d{1,7})$/.exec(decMissedIds[pos < 0 ? 0 : (pos + 1) % decMissedIds.length] || '');
              if (m) selectDecimal(Number(m[1]), t('stem.arithmetic.retrying_missed_problem', 'Retrying a missed practice problem.'));
            })));
      }

      // ---------------------------------------------------------- layout
      var tabLabels = {
        learn: t('stem.arithmetic.learn_strategies', 'Learn strategies'),
        practice: t('stem.arithmetic.practice', 'Practice'),
        errors: t('stem.arithmetic.error_detective', 'Error Detective'),
        apply: t('stem.arithmetic.word_problems', 'Word problems'),
        mental: t('stem.arithmetic.tab_mental', 'Mental math'),
        bars: t('stem.arithmetic.tab_bars', 'Bar models'),
        decimals: t('stem.arithmetic.tab_decimals', 'Decimals')
      };
      var tabs = tabOrder.map(function (id) { return { id: id, label: tabLabels[id] }; });
      var SpeechGuard = speechGuardFor(React);

      return h('section', { className: 'space-y-4 w-full max-w-6xl mx-auto p-2 sm:p-4', style: { background: bg, color: text }, 'data-arithmetic-studio': 'true' },
        SpeechGuard && h(SpeechGuard, null),
        h('header', { className: 'rounded-2xl p-4 text-white', style: { background: isContrast ? '#000000' : 'linear-gradient(135deg, #172554, ' + opMeta.color + ')', border: isContrast ? '2px solid #fbbf24' : 'none' } },
          h('div', { className: 'flex items-start gap-3' },
            ctx.icons && ctx.icons.ArrowLeft && h('button', { type: 'button', onClick: function () { if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null); }, className: 'rounded-lg p-2 bg-white/10', style: { minWidth: 44, minHeight: 44, color: '#ffffff' }, 'aria-label': t('stem.arithmetic.back_to_stem_tools', 'Back to STEM tools') }, h(ctx.icons.ArrowLeft, { size: 18 })),
            h('div', { className: 'self-center' }, h('h1', { className: 'text-xl sm:text-2xl font-black' }, t('stem.arithmetic.arithmetic_strategy_studio', '🧮 Arithmetic Strategy Studio')))
          )
        ),
        renderTeacher(),
        renderPath(),
        h('nav', { className: 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1 rounded-xl p-1', role: 'tablist', 'aria-label': t('stem.arithmetic.arithmetic_studio_sections', 'Arithmetic Studio sections'), style: { background: card, border: '1px solid ' + border } }, tabs.map(function (item, index) {
          var active = tab === item.id;
          return h('button', { key: item.id, id: 'arithmetic-studio-tab-' + item.id, type: 'button', role: 'tab', 'aria-selected': active, 'aria-controls': 'arithmetic-studio-panel', tabIndex: active ? 0 : -1, onKeyDown: function (event) { moveTab(event, index); }, onClick: function () { update({ tab: item.id }); }, className: 'rounded-lg px-2 py-2 text-xs font-bold', style: { minHeight: 44, minWidth: 0, whiteSpace: 'normal', overflowWrap: 'anywhere', background: active ? themeAccent(opMeta) : 'transparent', color: active ? (isContrast ? '#000000' : '#ffffff') : text } }, item.label);
        })),
        h('div', { id: 'arithmetic-studio-panel', role: 'tabpanel', 'aria-labelledby': 'arithmetic-studio-tab-' + tab, tabIndex: 0, className: 'space-y-3' },
          (tab === 'learn' || tab === 'practice') && renderOperationPicker(),
          tab === 'practice' && practiceSource === 'set' && h('div', { role: 'group', 'aria-label': t('stem.arithmetic.practice_level_group', 'Practice level'), className: 'flex flex-wrap items-center gap-2' },
            h('span', { className: 'text-xs font-bold', style: { color: muted, flexBasis: '100%' } }, t('stem.arithmetic.practice_level', 'PRACTICE LEVEL:')),
            [1, 2, 3].map(function (n) {
              var example = PRACTICE.filter(function (p) { return p.op === operation && p.level === n; })[0];
              var label = n === 1 ? t('stem.arithmetic.foundations', 'Foundations') : n === 2 ? t('stem.arithmetic.multi_digit', 'Multi-digit') : t('stem.arithmetic.challenge', 'Challenge');
              return h('button', { key: n, type: 'button', 'data-arithmetic-level': n, onClick: function () {
                if (n === level) return;
                update(Object.assign({ level: n, practiceIndex: 0, practiceProblemId: null, practiceSource: 'set' }, resetItemPatch()));
              }, 'aria-pressed': level === n, className: 'rounded-xl px-3 py-2 text-xs font-bold text-left', style: { minHeight: 44, minWidth: 0, flex: '1 1 140px', whiteSpace: 'normal', overflowWrap: 'anywhere', background: level === n ? themeAccent(opMeta) : card, color: level === n ? (isContrast ? '#000000' : '#ffffff') : text, border: '1px solid ' + themeAccent(opMeta) } },
                h('span', { className: 'block' }, label),
                example && h('span', { className: 'block mt-1 font-normal' }, fill(t('stem.arithmetic.level_example_line', 'Example: {a} {sym} {b}'), { a: example.a, sym: opMeta.symbol, b: example.b })));
            })
          ),
          tab === 'learn' ? renderLearn() : tab === 'practice' ? renderPractice() : tab === 'errors' ? renderErrors() : tab === 'apply' ? renderApply()
            : tab === 'mental' ? renderMental() : tab === 'bars' ? renderBars() : renderDecimals()),
        renderLinks(),
        h('footer', { className: 'rounded-xl p-3 text-xs', style: { background: card, color: muted, border: '1px solid ' + border } },
          h('details', { 'data-arithmetic-about': true },
            h('summary', { className: 'cursor-pointer font-bold', style: { color: text, minHeight: 44, display: 'flex', alignItems: 'center' } }, t('stem.arithmetic.about_title', 'About this studio')),
            h('div', { className: 'space-y-1 mt-1' },
              h('p', { className: 'font-black uppercase tracking-widest' }, t('stem.arithmetic.concrete_visual_symbolic', 'Concrete → visual → symbolic')),
              h('p', null, t('stem.arithmetic.build_meaning_first_compare_strategies', 'Build meaning first, compare strategies, and use estimation to check every result.')),
              h('p', null, t('stem.arithmetic.strategy_reminder_full', 'Strategy reminder: a correct answer matters, but a model, an explanation, an estimate and an inverse-operation check make the reasoning last.')))))
      );
    }
  });
})();
