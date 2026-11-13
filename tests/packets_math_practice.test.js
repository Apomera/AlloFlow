import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

// Math fact practice on the Packets site, 2026-11-11: the two practice activities of the take-home engine
// (word_sounds_take_home/check_adapters/math_ccc.js and math_rehearsal.js, built into
// word_sounds_take_home_loader.js), the builder (packet_math_practice_builder.js), the maker page
// (packets-math-practice.html and .js), the front door's link, and the two readers of the results files
// (packets_results_reader.js on the site, the Class Analytics importer in student_analytics_module.js).
// They are PRACTICE files: feedback on every card, more than one try, no clock. Nothing here is a check.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const squash = (text) => String(text).replace(/\s+/g, ' ').trim();
const NAME = 'AlloFlow Packets';
const PAGE = 'packets-math-practice.html';
const SCRIPT = 'packets-math-practice.js';
const KEY = 'alloflow-packets-math-practice/1';
const RULE = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'";
const SCRIPTS = ['packets-page.js', 'word_sounds_take_home_loader.js', 'packet_math_practice_builder.js', 'packets-math-practice.js'];
const X = String.fromCharCode(0xD7), MINUS = String.fromCharCode(0x2212), DIVIDE = String.fromCharCode(0xF7);

// The loader as a page loads it, the builder, the "Check a file" core and the results reader.
const parts = {};
parts.window = parts;
new Function('window', read('word_sounds_take_home_loader.js')).call(parts, parts);
const TH = parts.AlloWordSoundsTakeHome;
const MP = require('../packet_math_practice_builder.js');
const verify = require('../packets_verify_core.js');
const reader = require('../packets_results_reader.js');
const CCC = TH.CHECK_ADAPTERS.math_ccc, REH = TH.CHECK_ADAPTERS.math_rehearsal;
const word = (f) => MP.factWord(f, TH).word;
const build = (input, extra = {}) => MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader: TH, ...input }), loader: TH, ...extra });

const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const labelsOf = (html) => JSON.parse(/\nvar labels=(.*);\nvar matches=/.exec(html)[1]);
const ruleOf = (html) => /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html)[1];
const scriptOf = (html) => [...new JSDOM(html).window.document.querySelectorAll('script')].find((node) => !node.type).textContent;
// The same list tests/packets_check_page.test.js and tests/word_sounds_take_home_packet.test.js apply to a file with no mailbox.
const FORBIDDEN = [
  ['a web address', /https?:\/\//i], ['location assignment', /\blocation\s*(?:\.\s*\w+\s*)?=(?!=)/], ['location.assign/replace', /\blocation\s*\.\s*(?:assign|replace)\s*\(/],
  ['window.open', /\bopen\s*\(/], ['<form', /<form/i], ['<a href', /<a\s[^>]*href/i], ['meta refresh', /http-equiv\s*=\s*["']?refresh/i], ['fetch(', /fetch\s*\(/],
  ['XMLHttpRequest', /XMLHttpRequest/], ['WebSocket', /WebSocket/], ['EventSource', /EventSource/], ['sendBeacon', /sendBeacon/], ['eval(', /\beval\s*\(/], ['new Function', /new\s+Function/],
  ['import(', /\bimport\s*\(/], ['microphone or camera', /getUserMedia|SpeechRecognition|MediaRecorder/], ['cookies', /\.\s*cookie\b/], ['speech engine', /speechSynthesis/],
  ['service worker', /serviceWorker/], ['peer connection', /RTCPeerConnection/],
];
const audit = (text) => FORBIDDEN.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
// Words these files and this page never use for themselves.
const NOT_SAID = /\b(?:checks?|tests?|tested|testing|probes?|quiz(?:zes)?|assessments?|assess(?:es|ed|ing)?|screen(?:er|ing)s?|benchmarks?|norms?|normed|exams?|scores?|scored|secure|certified|guaranteed?|FERPA|evidence-based)\b|at grade level|grade-level/i;
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

// ---------------------------------------------------------------------------
// A built file, played in jsdom. Clicks the same controls a learner taps.
// ---------------------------------------------------------------------------
function play(html, { storage = null } = {}) {
  const saved = [];
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/facts.html', beforeParse(w) {
    w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    w.Blob = class { constructor(blobParts, opts) { this.body = blobParts.join(''); this.type = opts && opts.type; } };
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:results'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
    if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  } });
  opened.push(dom.window);
  const w = dom.window, d = w.document;
  const q = (selector) => d.querySelector(selector);
  const seen = (node) => !!node && !node.hidden && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const press = (key) => q('[data-key="' + key + '"]').click();
  const t = {
    w, d, q, saved, seen, button, press,
    start: (name = 'BlueHeron7') => { d.getElementById('learner-name').value = name; button('Start').click(); },
    heading: () => q('#app h2').textContent,
    status: () => q('#app .status').textContent,
    say: () => q('[data-say]').textContent,
    slot: () => q('[data-slot]').textContent,
    phase: () => (seen(q('[data-cover]')) ? 'look' : seen(q('[data-pad]')) ? 'pad' : 'done'),
    cover: () => q('[data-cover]').click(),
    type: (digits) => { String(digits).split('').forEach(press); press('next'); },
    next: () => (button('Next') || button('See my results')).click(),
    // One card answered: right from memory at once, or after 1 or 2 misses (each miss is copied right).
    card: (answer, misses = 0, { look = true } = {}) => {
      if (look && t.phase() === 'look') t.cover();
      for (let i = 0; i < misses; i++) { t.type(Number(answer) + 1); if (t.phase() === 'pad') t.type(answer); }
      if (t.phase() === 'pad') t.type(answer);
    },
    csv: () => { q('[data-save-csv]').click(); return saved[saved.length - 1]; },
    json: () => { q('[data-save-json]').click(); return JSON.parse(saved[saved.length - 1].body); },
  };
  return t;
}
const parseCsv = (text) => reader.parseCsv(text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text);

// ---------------------------------------------------------------------------
// 1. The two activities in the engine
// ---------------------------------------------------------------------------
describe('the two practice activities in the engine', () => {
  it('are built into the loader and its three mirrors from their files, beside the check activities the app never lists', () => {
    // 2026-11-12: the three vocabulary activities (packet_vocab_builder.js) joined them; tests/packet_vocab_adapter.test.js covers them.
    // 2026-11-12: and the two picture activities of vocabulary files (tests/packets_vocab_pictures.test.js).
    expect(Object.keys(TH.CHECK_ADAPTERS).sort()).toEqual(['math_ccc', 'math_computation', 'math_rehearsal', 'missing_number', 'quantity_discrimination', 'vocab_blank', 'vocab_meaning', 'vocab_picture', 'vocab_picture_word', 'vocab_word']);
    expect(readdirSync('word_sounds_take_home/check_adapters').filter((f) => /^math_(ccc|rehearsal)\.js$/.test(f)).sort()).toEqual(['math_ccc.js', 'math_rehearsal.js']);
    for (const id of ['math_ccc', 'math_rehearsal']) {
      expect(TH.ADAPTERS[id], id).toBeUndefined();
      expect(TH.activities().map((a) => a.id), id).not.toContain(id);
    }
    expect([CCC.title, REH.title]).toEqual(['Cover, copy, compare', 'Fact rehearsal']);
    const check = spawnSync(process.execPath, ['dev-tools/build_word_sounds_take_home.cjs', '--check'], { encoding: 'utf8' });
    expect(check.status, check.stderr).toBe(0);
    for (const mirror of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const file = mirror + '/word_sounds_take_home_loader.js';
      if (existsSync(file)) expect(read(file) === read('word_sounds_take_home_loader.js'), file).toBe(true);
    }
  });

  it('draw a card with the same code, apart from the prefix of their labels, and their labels have the same names', () => {
    const plain = (a, id) => a.render.toString().split(id + '_').join('X_');
    expect(plain(CCC, 'math_ccc')).toBe(plain(REH, 'math_rehearsal'));
    const names = (a, id) => Object.keys(a.labels).map((k) => k.slice(id.length + 1));
    expect(names(CCC, 'math_ccc')).toEqual(names(REH, 'math_rehearsal'));
    expect(names(CCC, 'math_ccc')).toEqual(['intro', 'look', 'cover', 'type', 'label', 'done', 'keys', 'delete', 'correct', 'retry', 'copy', 'copy_label', 'copy_wrong', 'again', 'missed']);
    for (const a of [CCC, REH]) {
      // What is copied into a file stands alone and asks for nothing outside it.
      expect(a.render.toString() + a.score.toString()).not.toMatch(/\b(?:document|window|localStorage|sessionStorage|globalThis)\b/);
      expect(audit(a.render.toString() + a.score.toString() + JSON.stringify(a.labels)), a.id).toEqual([]);
      new Function('return (' + a.render.toString() + ');')();
      // The learner's words: plain, American, and never "check" or "test".
      const words = Object.values(a.labels).join('\n');
      expect(NOT_SAID.exec(words), a.id).toBeNull();
      expect(BRITISH.exec(words), a.id).toBeNull();
    }
  });

  it('take a fact as the math check writes it, and refuse anything else', () => {
    const fact = TH.CHECK_ADAPTERS.math_computation.prepare({ a: 7, b: 8, op: 'mul' }).item;
    expect(fact).toMatchObject({ word: '7 ' + X + ' 8', answer: '56' });
    expect(CCC.prepare(fact)).toEqual({ item: { word: '7 ' + X + ' 8', answer: '56', target: '56', study: true, maxAttempts: 3 } });
    // Every cover, copy, compare card starts with the fact shown, whatever it is handed.
    expect(CCC.prepare({ ...fact, study: false }).item.study).toBe(true);
    expect(REH.prepare({ ...fact, role: 'new', study: true }).item).toEqual({ word: '7 ' + X + ' 8', answer: '56', target: '56', role: 'new', study: true, maxAttempts: 3 });
    expect(REH.prepare({ ...fact, role: 'known' }).item).toMatchObject({ role: 'known', study: false });
    for (const bad of [{}, { word: '', answer: 1 }, { word: '7 x 8 = 56', answer: 56 }, { word: 'x'.repeat(41), answer: 1 }, { word: '2 - 3', answer: -1 }, { word: '1 + 1', answer: true }, { word: '1 + 1', answer: '2.5' }]) {
      expect(CCC.prepare(bad).missing, JSON.stringify(bad)).toBeTruthy();
    }
    expect(REH.prepare(fact).missing).toEqual(['a role: new or known']);
    expect(REH.prepare({ ...fact, role: 'known', study: true }).missing).toEqual(['a known fact that is asked, not shown first']);
    for (const a of [CCC, REH]) {
      expect([a.score({}, '56', '56'), a.score({}, '56', '056'), a.score({}, '56', '54'), a.score({}, '56', ''), a.score({}, '56', '-56')].map((s) => s.correct)).toEqual([true, true, false, false, false]);
      expect(a.score({}, '56', '56')).toEqual({ correct: true, digitsCorrect: null, digitsPossible: null });
    }
  });
});

// ---------------------------------------------------------------------------
// 2. The builder
// ---------------------------------------------------------------------------
describe('the builder: sets of facts and their order', () => {
  it('offers the sets in a common teaching order, each with the facts a teacher expects', () => {
    expect(MP.FAMILIES.filter((f) => f.op === 'add').map((f) => f.name)).toEqual(['+ 0 and + 1', 'Doubles', 'Make 10', 'Near doubles', 'The rest, up to 9 + 9']);
    expect(MP.FAMILIES.filter((f) => f.op === 'mul').map((f) => f.name)).toEqual([X + ' 2', X + ' 10', X + ' 5', X + ' 1 and ' + X + ' 0', 'Squares',
      X + ' 3', X + ' 4', X + ' 9', X + ' 6', X + ' 7', X + ' 8']);
    const set = (id) => MP.FAMILIES.find((f) => f.id === id);
    const words = (id) => set(id).facts.map(word);
    expect(words('mul-7')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => '7 ' + X + ' ' + k));
    expect(words('add-doubles')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => k + ' + ' + k));
    expect(words('add-make-10')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => k + ' + ' + (10 - k)));
    expect(words('add-near-doubles')).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((k) => k + ' + ' + (k + 1)));
    expect(set('add-0-1').facts).toHaveLength(20);
    expect(set('mul-1-0').facts.map((f) => f.a + 'x' + f.b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => '1x' + k).concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => '0x' + k)));
    // The rest: two numbers from 2 to 9, smaller first, that are not a double, do not make 10 and are not a near double.
    const rest = set('add-rest').facts;
    expect(rest).toHaveLength(18);
    for (const f of rest) expect(f.a >= 2 && f.b <= 9 && f.a < f.b && f.a + f.b !== 10 && f.b !== f.a + 1, f.a + '+' + f.b).toBe(true);
    // The builder's copy cannot be changed from outside.
    set('mul-7').facts.push({ a: 99, b: 99, op: 'mul' });
    expect(MP.planMathPractice({ mode: 'ccc', factSet: 'mul-7' }).facts).toHaveLength(10);
    set('mul-7').facts.pop();
  });

  it('marks as known the facts that, or whose turnaround, come in an earlier set', () => {
    expect(MP.knownByOrder('add-0-1')).toEqual([]);
    expect(MP.knownByOrder('mul-2')).toEqual([]);
    expect(MP.knownByOrder('add-doubles')).toEqual(['add:1:1']);
    expect(MP.knownByOrder('add-make-10')).toEqual(['add:1:9', 'add:5:5', 'add:9:1']);
    expect(MP.knownByOrder('mul-3')).toEqual(['mul:3:1', 'mul:3:2', 'mul:3:3', 'mul:3:5', 'mul:3:10']);
    // Late in the order nearly everything is known by its turnaround: only 7 × 8 is new in × 7, and nothing in × 8.
    expect(MP.FAMILIES.find((f) => f.id === 'mul-7').facts.map(MP.factKey).filter((k) => !MP.knownByOrder('mul-7').includes(k))).toEqual(['mul:7:8']);
    expect(MP.knownByOrder('mul-8')).toHaveLength(10);
    expect(() => MP.knownByOrder('mul-11')).toThrow('Unknown fact family "mul-11".');
  });
});

describe('the builder: what a file holds', () => {
  it('cover, copy, compare: every fact once, a set in one fixed mixed order, a typed list in its own order', () => {
    const plan = MP.planMathPractice({ mode: 'ccc', factSet: 'mul-7' });
    expect(plan.cards.map((c) => word(c.fact))).toEqual(['7 × 1', '7 × 5', '7 × 2', '7 × 8', '7 × 7', '7 × 9', '7 × 6', '7 × 3', '7 × 4', '7 × 10'].map((s) => s.replace('×', X)));
    expect(plan.cards.every((c) => c.study && c.role === '')).toBe(true);
    expect(plan.cards.map((c) => MP.factKey(c.fact)).sort()).toEqual(plan.facts.map(MP.factKey).sort());
    expect(MP.planMathPractice({ mode: 'ccc', factSet: 'mul-7' })).toEqual(plan);
    expect(MP.planMathPractice({ mode: 'ccc', facts: '9 + 9, 1 + 1, 5 / 5' }).cards.map((c) => word(c.fact))).toEqual(['9 + 9', '1 + 1', '5 ' + DIVIDE + ' 5']);
  });

  // The plan as packet_math_practice_builder.js states it in words, written again here from those words.
  const byTheRule = (newFacts, known) => {
    let queue = known.slice();
    const take = (n) => { const got = queue.slice(0, n); queue = queue.slice(n).concat(got); return got; };
    const out = [];
    const run = (f) => { const win = take(3); [1, 2, 3].forEach((step) => { out.push(['new', f, step === 1]); win.slice(0, step).forEach((k) => out.push(['known', k, false])); }); };
    const back = (f) => { out.push(['new', f, false]); take(2).forEach((k) => out.push(['known', k, false])); };
    newFacts.forEach((f, i) => { run(f); if (i) back(newFacts[i - 1]); });
    back(newFacts[newFacts.length - 1]);
    return out;
  };
  const cardsOf = (plan) => plan.cards.map((c) => [c.role, MP.factKey(c.fact), c.study]);

  it('rehearsal: each new fact gets a run and comes back once, and two of every three cards are known facts', () => {
    const plan = MP.planMathPractice({ mode: 'rehearsal', facts: '7x8, 6x7, 6x8, 2x2, 3x3, 4x4, 5x5', known: ['mul:2:2', 'mul:3:3', 'mul:4:4', 'mul:5:5'] });
    expect(plan.newFacts.map(MP.factKey)).toEqual(['mul:7:8', 'mul:6:7', 'mul:6:8']);
    expect(plan.knownFacts.map(MP.factKey)).toEqual(['mul:4:4', 'mul:3:3', 'mul:2:2', 'mul:5:5']);
    expect(cardsOf(plan)).toEqual(byTheRule(plan.newFacts.map(MP.factKey), plan.knownFacts.map(MP.factKey)));
    // Written out: new, known; new, known, known; new, known, known, known for 7 × 8, and so on.
    expect(plan.cards.slice(0, 12).map((c) => (c.study ? '*' : '') + c.role[0] + ' ' + c.fact.a + 'x' + c.fact.b).join(' | '))
      .toBe('*n 7x8 | k 4x4 | n 7x8 | k 4x4 | k 3x3 | n 7x8 | k 4x4 | k 3x3 | k 2x2 | *n 6x7 | k 5x5 | n 6x7');
    expect(plan.cards).toHaveLength(36);
    expect(plan.cards.filter((c) => c.role === 'known')).toHaveLength(24);
    for (const f of plan.newFacts) {
      const at = plan.cards.map((c, i) => (MP.factKey(c.fact) === MP.factKey(f) ? i : -1)).filter((i) => i >= 0);
      expect(at, MP.factKey(f)).toHaveLength(4);
      expect(plan.cards[at[0]].study).toBe(true);
      expect(at.slice(1).every((i) => !plan.cards[i].study)).toBe(true);
    }
    // Only the first card of a new fact shows the answer first.
    expect(plan.cards.filter((c) => c.study)).toHaveLength(3);
    expect(plan.waiting).toEqual([]);
  });

  it('rehearsal of a set starts from the teaching order, adds known facts from the set before when needed, and says what waits', () => {
    const seven = MP.planMathPractice({ mode: 'rehearsal', factSet: 'mul-7' });
    expect(seven.newFacts.map(MP.factKey)).toEqual(['mul:7:8']);
    expect(seven.cards.map((c) => (c.study ? '*' : '') + c.role[0] + ' ' + c.fact.a + 'x' + c.fact.b).join(' | '))
      .toBe('*n 7x8 | k 7x10 | n 7x8 | k 7x10 | k 7x9 | n 7x8 | k 7x10 | k 7x9 | k 7x6 | n 7x8 | k 7x5 | k 7x3');
    expect(cardsOf(seven)).toEqual(byTheRule(['mul:7:8'], seven.knownFacts.map(MP.factKey)));
    const doubles = MP.planMathPractice({ mode: 'rehearsal', factSet: 'add-doubles' });
    expect([doubles.newFacts, doubles.addedKnown, doubles.knownFacts].map((list) => list.map(word))).toEqual([['2 + 2', '3 + 3', '4 + 4'], ['3 + 0', '0 + 1'], ['1 + 1', '3 + 0', '0 + 1']]);
    expect(doubles.addedFrom).toEqual(['+ 0 and + 1']);
    expect(doubles.waiting.map(word)).toEqual(['5 + 5', '6 + 6', '7 + 7', '8 + 8', '9 + 9']);
    // The teacher's ticks win over the order.
    const mine = MP.planMathPractice({ mode: 'rehearsal', factSet: 'mul-7', known: ['mul:7:1', 'mul:7:2', 'mul:7:5', 'mul:7:10'] });
    expect(mine.newFacts.map(MP.factKey)).toEqual(['mul:7:3', 'mul:7:4', 'mul:7:6']);
    expect(mine.addedKnown).toEqual([]);
  });

  it('refuses what it cannot make, with a plain reason', () => {
    const no = (input, message) => expect(() => MP.planMathPractice(input), JSON.stringify(input)).toThrow(message);
    no({ mode: 'rehearsal', factSet: 'add-0-1' }, 'Rehearsal needs at least 3 facts the learner already knows. None are chosen.');
    no({ mode: 'rehearsal', factSet: 'mul-2', known: ['mul:2:1'] }, 'Only 1 is chosen.');
    no({ mode: 'rehearsal', factSet: 'mul-8' }, 'Every fact is chosen as known. Leave at least one out: that is the new fact to learn.');
    no({ mode: 'rehearsal', facts: '7x8, 2x2, 3x3', known: ['mul:2:2', 'mul:3:3'] }, 'Only 2 are chosen.');
    no({ mode: 'drill', factSet: 'mul-7' }, 'Unknown way to practice "drill". Use ccc or rehearsal.');
    no({ mode: 'ccc', factSet: 'mul-13' }, 'Unknown fact family "mul-13".');
    no({ mode: 'ccc', facts: [] }, 'A list needs 1 to 30 facts. This list has 0.');
    no({ mode: 'ccc', facts: Array.from({ length: 31 }, (_, i) => ({ a: i, b: 1, op: 'add' })) }, 'A list needs 1 to 30 facts. This list has 31.');
    no({ mode: 'ccc', facts: '7 x 8, 8 * 7, 7x8' }, 'Fact 3 is in the list twice.');
    for (const [typed, message] of [['9 / 0', 'Fact 1: it divides by 0.'], ['7 / 2', 'Fact 1: it does not come out even. Use a division with no remainder.'], ['3 - 5', 'Fact 1: the answer is below 0.'],
      ['999 x 999', 'Fact 1: the answer is more than 9999.'], ['1000 + 1', 'Fact 1: both numbers must be whole numbers from 0 to 999.'], ['seven x 8', 'Fact 1: "seven x 8" is not a fact. Write it like 7 x 8 or 6 + 7.'],
      ['7 x 8 = 54', 'Fact 1: 7 x 8 = 54 is not right. The answer is 56.']]) expect(() => MP.parseFacts(typed), typed).toThrow(message);
    expect(MP.parseFacts('7 x 8 = 56; 12 ' + MINUS + ' 5\n56 / 8, 6+7').map(word)).toEqual(['7 ' + X + ' 8', '12 ' + MINUS + ' 5', '56 ' + DIVIDE + ' 8', '6 + 7']);
  });

  it('makes a practice lesson: written by the math check adapter, then each card by its own prepare, no clock, nothing sealed', () => {
    const lesson = MP.lessonFromMathPractice({ loader: TH, mode: 'rehearsal', factSet: 'mul-7' });
    expect(lesson).toMatchObject({ schema: TH.LESSON_SCHEMA, player: TH.PLAYER, lessonId: 'math-facts-mul-7-rehearsal', title: X + ' 7 facts: new and known facts', mode: 'practice',
      activityTitles: { math_rehearsal: 'Fact rehearsal' }, feedback: { correct: [], retry: null }, audio: {}, images: {}, submit: null });
    expect(lesson).not.toHaveProperty('timeLimitS');
    expect(lesson).not.toHaveProperty('check');
    expect(lesson.blocks).toHaveLength(1);
    expect(lesson.blocks[0].items.slice(0, 2)).toEqual([
      { id: 'math_rehearsal-01-new', word: '7 ' + X + ' 8', answer: '56', target: '56', role: 'new', study: true, maxAttempts: 3 },
      { id: 'math_rehearsal-02-known', word: '7 ' + X + ' 10', answer: '70', target: '70', role: 'known', study: false, maxAttempts: 3 }]);
    expect(MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', factSet: 'add-doubles' })).toMatchObject({ lessonId: 'math-facts-add-doubles-ccc', title: 'Doubles facts: cover, copy, compare' });
    const own = MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', facts: '12 - 5, 56 / 8' });
    expect(own.title).toBe('My math facts: cover, copy, compare');
    expect(own.lessonId).toMatch(/^math-facts-own-[0-9a-f]{8}-ccc$/);
    expect(own.blocks[0].items.map((it) => [it.id, it.word, it.answer])).toEqual([['math_ccc-01', '12 ' + MINUS + ' 5', '7'], ['math_ccc-02', '56 ' + DIVIDE + ' 8', '7']]);
    expect(MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', facts: '12 - 5, 56 / 8', title: '  Friday   facts ' }).title).toBe('Friday facts');
    // A set's two kinds of file have titles of their own, so their results files are never saved under the same name.
    const stems = ['ccc', 'rehearsal'].map((mode) => TH.resultsCsv({ lessonTitle: MP.lessonFromMathPractice({ loader: TH, mode, factSet: 'mul-7' }).title, learner: 'Ana' }).stem);
    expect(stems).toEqual(['7-facts-cover-copy-compare__Ana', '7-facts-new-and-known-facts__Ana']);
    expect(MP.FAMILIES.map((set) => set.title)).toContain('Square facts');
    expect(MP.FAMILIES.find((set) => set.id === 'add-rest').title).toBe('Addition facts to 9 + 9');
    expect(() => MP.lessonFromMathPractice({ mode: 'ccc', factSet: 'mul-7' })).toThrow('lessonFromMathPractice needs loader');
  });
});

// ---------------------------------------------------------------------------
// 3. The file
// ---------------------------------------------------------------------------
describe('the file', () => {
  const ccc = build({ mode: 'ccc', factSet: 'mul-7' });
  const reh = build({ mode: 'rehearsal', factSet: 'mul-7' });

  it('is the same bytes for the same choices', () => {
    expect(build({ mode: 'ccc', factSet: 'mul-7' }).html).toBe(ccc.html);
    expect(build({ mode: 'rehearsal', factSet: 'mul-7' }).html).toBe(reh.html);
    const fresh = {};
    fresh.window = fresh;
    new Function('window', read('word_sounds_take_home_loader.js')).call(fresh, fresh);
    const again = new Function('window', 'module', read('packet_math_practice_builder.js') + '\nreturn window.AlloPacketMathPractice;')(fresh, undefined);
    expect(again.buildMathPracticePacket({ lesson: again.lessonFromMathPractice({ loader: fresh.AlloWordSoundsTakeHome, mode: 'ccc', factSet: 'mul-7' }), loader: fresh.AlloWordSoundsTakeHome }).sha256).toBe(ccc.sha256);
    expect(ccc.html).not.toBe(reh.html);
  });

  it('is a small practice file that cannot connect, carries none of the check code and only its own activity', () => {
    for (const made of [ccc, reh]) {
      const html = made.html;
      expect(audit(html)).toEqual([]);
      expect(html.match(/<script/gi)).toHaveLength(2);
      expect(html).not.toMatch(/<(?:iframe|object|embed|link|base|img|audio|video)\b/i);
      const rule = ruleOf(html).split('; ');
      for (const part of ["default-src 'none'", "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "object-src 'none'", "frame-src 'none'", "worker-src 'none'"]) expect(rule).toContain(part);
      expect(rule).toContain("script-src 'sha256-" + createHash('sha256').update(scriptOf(html), 'utf8').digest('base64') + "'");
      expect(manifestOf(html)).toMatchObject({ kind: 'alloflow-packet-manifest', network: 'none', never: ['internet connection', 'microphone', 'camera', 'cookies', 'AI'],
        packet: { form: '', mode: 'practice' }, what: 'A practice activity in one file. It runs in a browser with no internet connection.' });
      expect(manifestOf(html)).not.toHaveProperty('check');
      for (const part of ['kit.check=', 'kit.sha=', 'kit.codec=', 'check_teacher', 'check_about', 'takeHomeCheck', 'Teacher code', '.timebar', '.pad{', 'takeHomePictures']) expect(html, part).not.toContain(part);
      // Re-pinned 2026-11-12: every file now carries the reading tools and the engine fixes of that day (+15.8 KB; about 54.6 KB before).
      // Re-pinned 2026-11-12: Hear all and the reading tool "Read the choices when a question opens" travel in every file
      // (hearAllIn, about 4 KB; tests/packets_hear_all.test.js), with that day's accessibility fixes. The page said "About 80 KB".
      // Re-pinned 2026-11-12 (night) from 85000: the look pass (style rules, the four new colors, the end-screen rows; +5.0 KB
      // in every practice file; C:/tmp/packets_build_1111/look/NOTES.md). The page now says "About 85 KB".
      expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(90000);
      expect(lessonOf(html)).toMatchObject({ mode: 'practice', audio: {}, images: {}, submit: null });
      // Its answers are the arithmetic of its facts.
      for (const it of lessonOf(html).blocks[0].items) {
        const [a, sign, b] = it.word.split(' ');
        expect(String(sign === '+' ? +a + +b : sign === X ? a * b : sign === MINUS ? a - b : a / b), it.word).toBe(it.answer);
      }
    }
    const labels = labelsOf(ccc.html);
    expect(labels.intro).toBe(CCC.labels.math_ccc_intro);
    expect(Object.keys(labels).filter((k) => /^math_/.test(k)).sort()).toEqual(Object.keys(CCC.labels).concat(['math_ccc_title']).sort());
    expect(labelsOf(reh.html).intro).toBe(REH.labels.math_rehearsal_intro);
    expect(ccc.html).toContain('var matches=function (given, answer)');
  });

  it('is read by "Check a file" as a file that cannot connect', () => {
    for (const made of [ccc, reh]) {
      const r = verify.verifyPacket(made.html);
      expect([r.ok, r.kind, r.result, r.headline, r.script.verdict]).toEqual([true, 'packet', 'closed', verify.HEADLINE.closed, 'agree']);
      expect(r.data.mode).toBe('practice');
    }
  });

  it('refuses a lesson that is not math fact practice', () => {
    const checkLesson = require('../packet_check_builder.js').lessonFromMathProblems({ problems: [{ a: 7, b: 8, op: 'mul' }] });
    expect(() => MP.buildMathPracticePacket({ lesson: checkLesson, loader: TH })).toThrow('buildMathPracticePacket needs a lesson from lessonFromMathPractice');
    expect(() => MP.buildMathPracticePacket({ lesson: { ...lessonOf(ccc.html), mode: 'probe' }, loader: TH })).toThrow('needs a lesson from lessonFromMathPractice');
    expect(() => MP.buildMathPracticePacket({ lesson: lessonOf(ccc.html) })).toThrow('buildMathPracticePacket needs loader');
  });
});

// ---------------------------------------------------------------------------
// 4. Playing a file
// ---------------------------------------------------------------------------
describe('playing a cover, copy, compare file', () => {
  const made = build({ mode: 'ccc', facts: '7 x 8, 6 x 7, 9 x 3' });

  it('shows the fact and its answer, covers it, takes the answer from memory and compares', () => {
    const t = play(made.html);
    expect(t.d.getElementById('app').textContent).toContain(CCC.labels.math_ccc_intro);
    t.start();
    expect(t.heading()).toBe('Cover, copy, compare: 1 of 3');
    expect([t.phase(), t.slot(), t.say()]).toEqual(['look', '56', CCC.labels.math_ccc_look]);
    expect(t.d.activeElement).toBe(t.q('[data-cover]'));
    expect(t.q('[data-cover]').getAttribute('aria-describedby')).toBe('mathccc-01-fact mathccc-01-say');
    // The keys do nothing until the answer is covered.
    t.press('5');
    expect(t.q('[data-pad-input]').value).toBe('');
    t.cover();
    expect([t.phase(), t.slot(), t.say(), t.q('[data-fact]').getAttribute('aria-hidden')]).toEqual(['pad', '?', CCC.labels.math_ccc_type, 'true']);
    expect(t.d.activeElement).toBe(t.q('[data-pad-input]'));
    expect(t.q('[data-pad-input]').getAttribute('aria-label')).toBe('7 ' + X + ' 8. Type the answer.');
    expect(t.q('[data-key="next"]').getAttribute('aria-disabled')).toBe('true');
    t.press('5'); t.press('7'); t.press('back'); t.press('6');
    expect(t.slot()).toBe('56');
    t.press('next');
    expect([t.status(), t.phase(), t.slot()]).toEqual(['Yes! 7 ' + X + ' 8 = 56.', 'done', '56']);
    expect(t.button('Next')).toBeTruthy();
  });

  it('a wrong answer: the fact again, typed while looking, then covered and asked again; three misses show the answer', () => {
    const t = play(made.html);
    t.start();
    t.cover();
    t.type('54');
    expect(t.status()).toBe('Not quite. You typed 54. Look: 7 ' + X + ' 8 = 56. Type it while you look.');
    expect([t.phase(), t.slot(), t.say()]).toEqual(['pad', '56', CCC.labels.math_ccc_copy]);
    expect(t.q('[data-pad-input]').getAttribute('aria-label')).toBe('7 ' + X + ' 8 = 56. Type 56.');
    t.type('55');
    expect(t.say()).toBe('Type 56, the number you see.');
    t.type('56');
    // Copied right: covered again and asked from memory.
    expect([t.phase(), t.slot(), t.say()]).toEqual(['pad', '?', CCC.labels.math_ccc_again]);
    expect(t.button('Next')).toBeFalsy();
    t.type('56');
    expect(t.status()).toBe('Yes! 7 ' + X + ' 8 = 56.');
    t.next();
    // Card 2: three misses from memory.
    t.cover();
    t.type('41'); t.type('42');
    t.type('43'); t.type('42');
    t.type('44');
    expect([t.status(), t.phase(), t.slot()]).toEqual(['Here is the answer: 6 ' + X + ' 7 = 42.', 'done', '42']);
    t.next();
    // Card 3 with a hardware keyboard: typed in the box with Enter, and digits typed while a key has the focus.
    t.cover();
    const box = t.q('[data-pad-input]');
    t.q('[data-key="2"]').focus();
    for (const key of ['2', '7']) t.q('[data-key="2"]').dispatchEvent(new t.w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    expect(box.value).toBe('27');
    box.dispatchEvent(new t.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(t.status()).toBe('Yes! 9 ' + X + ' 3 = 27.');
    t.next();
    expect(t.d.getElementById('app').textContent).toContain('Right on the first try: 1 of 3.');
    expect(t.d.getElementById('app').textContent).toContain('Right after trying again: 1.');

    // The results: one row for each card, in the format every results file has.
    const csv = t.csv();
    expect(csv.name).toMatch(/^My-math-facts-cover-copy-compare__BlueHeron7__\d{4}-\d{2}-\d{2}\.csv$/);
    const rows = parseCsv(csv.body);
    const header = rows[0];
    expect(header).toEqual(reader.COLUMNS);
    const col = (row, name) => row[header.indexOf(name)];
    const items = rows.slice(1, 4);
    expect(items.map((r) => [col(r, 'item_id'), col(r, 'activity'), col(r, 'activity_title'), col(r, 'mode'), col(r, 'scored'), col(r, 'word'), col(r, 'target'), col(r, 'responses'),
      col(r, 'correct'), col(r, 'first_try'), col(r, 'tries'), col(r, 'supports')])).toEqual([
      ['math_ccc-01', 'math_ccc', 'Cover, copy, compare', 'practice', '1', '7 ' + X + ' 8', '56', '54 | 56', '1', '0', '2', 'copied:1'],
      ['math_ccc-02', 'math_ccc', 'Cover, copy, compare', 'practice', '1', '6 ' + X + ' 7', '42', '41 | 43 | 44', '0', '0', '3', 'copied:2'],
      ['math_ccc-03', 'math_ccc', 'Cover, copy, compare', 'practice', '1', '9 ' + X + ' 3', '27', '27', '1', '1', '1', '']]);
    expect(rows[4].slice(0, 7)).toEqual(['#summary', col(items[0], 'session_id'), 'items_given=3', 'attempted=3', 'correct=2', 'first_try=1', 'accuracy_pct=67']);
    expect(rows[4][7]).toBe('title=My math facts: cover, copy, compare');
    expect(rows.some((r) => r[0] === '#score')).toBe(false);
    const json = t.json();
    expect(json).toMatchObject({ kind: 'alloflow-take-home-result', schemaVersion: 3, packet: { mode: 'practice', form: '' }, activityTitles: { math_ccc: 'Cover, copy, compare' } });
    expect(json).not.toHaveProperty('score');
    expect(TH.parseResult(json)).toMatchObject({ ok: true, integrity: 'ok' });
  });
});

describe('playing a rehearsal file', () => {
  it('shows a new fact first, asks known facts at once, and saves every card with its role', () => {
    const made = build({ mode: 'rehearsal', factSet: 'mul-7' });
    const lesson = lessonOf(made.html);
    const t = play(made.html);
    expect(t.d.getElementById('app').textContent).toContain(REH.labels.math_rehearsal_intro);
    t.start();
    expect(t.heading()).toBe('Fact rehearsal: 1 of 12');
    expect([t.phase(), t.say(), t.slot()]).toEqual(['look', REH.labels.math_rehearsal_look, '56']);
    t.cover();
    t.type('56');
    t.next();
    // A known fact: no answer shown first, the pad has the focus.
    expect([t.phase(), t.say(), t.slot()]).toEqual(['pad', REH.labels.math_rehearsal_type, '?']);
    expect(t.d.activeElement).toBe(t.q('[data-pad-input]'));
    lesson.blocks[0].items.slice(1).forEach((it, i) => {
      if (i === 2) t.card(it.answer, 1); else t.card(it.answer);
      t.next();
    });
    expect(t.d.getElementById('app').textContent).toContain('Right on the first try: 11 of 12.');
    const rows = parseCsv(t.csv().body);
    const header = rows[0], col = (row, name) => row[header.indexOf(name)];
    const items = rows.slice(1, 13);
    expect(items.map((r) => col(r, 'item_id'))).toEqual(lesson.blocks[0].items.map((it) => it.id));
    expect(items.map((r) => col(r, 'item_id').split('-').pop())).toEqual(['new', 'known', 'new', 'known', 'known', 'new', 'known', 'known', 'known', 'new', 'known', 'known']);
    expect(items.map((r) => col(r, 'activity_title'))).toEqual(Array(12).fill('Fact rehearsal'));
    expect([col(items[3], 'responses'), col(items[3], 'first_try'), col(items[3], 'supports')]).toEqual(['71 | 70', '0', 'copied:1']);
  });
});

// ---------------------------------------------------------------------------
// 5. The two readers
// ---------------------------------------------------------------------------
// A cover, copy, compare file played to the end: the first card after one miss, the others right at once.
function playedResults() {
  const made = build({ mode: 'ccc', factSet: 'add-doubles' });
  const t = play(made.html);
  t.start();
  lessonOf(made.html).blocks[0].items.forEach((it, i) => { t.card(it.answer, i === 0 ? 1 : 0); t.next(); });
  const csv = t.csv(), json = t.json();
  return { csv: csv.body, csvName: csv.name, json: JSON.stringify(json, null, 2), result: json, made };
}
// The × 7 rehearsal file played to the end: 7 × 8 is its new fact (cards 0, 2, 5, 9). misses: the cards missed once, then copied and typed right.
function playedRehearsal(misses) {
  const made = build({ mode: 'rehearsal', factSet: 'mul-7' });
  const t = play(made.html);
  t.start();
  lessonOf(made.html).blocks[0].items.forEach((it, i) => { t.card(it.answer, misses.includes(i) ? 1 : 0); t.next(); });
  const csv = t.csv(), json = t.json();
  return { csv: csv.body, csvName: csv.name, json: JSON.stringify(json, null, 2) };
}
const NEW_AND_KNOWN = { items: 4, firstTry: 3, missed: ['7 ' + X + ' 8'], knownItems: 8, knownFirstTry: 7 };

describe('the results page reads a practice file as practice', () => {
  it('a practice result with its activity name, under "Math facts", never with a score', async () => {
    const r = playedResults();
    for (const [text, name] of [[r.csv, r.csvName], [r.json, 'x.json']]) {
      const got = await reader.read(text, { name, lastModified: Date.UTC(2026, 10, 20) });
      expect(got.ok, name).toBe(true);
      const s = got.sessions[0];
      expect([s.mode, s.measure, s.measureName, s.unitName, s.score, s.title, s.integrity]).toEqual(['practice', 'practice', 'Practice', 'first-try percent', null, 'Doubles facts: cover, copy, compare', 'ok']);
      expect(s.summary).toMatchObject({ given: 9, attempted: 9, correct: 9, firstTry: 8, firstTryPct: 89 });
      expect(s.value).toBe(89);
      expect(s.byActivity.map((a) => [a.activity, a.name, a.strand, a.graded, a.firstTry])).toEqual([['math_ccc', 'Cover, copy, compare', 'math_facts', 9, 8]]);
      expect(s.byStrand.map((row) => [row.strand, row.name])).toEqual([['math_facts', 'Math facts']]);
      expect(s.newFacts).toBeNull();
      expect(s.wrong).toEqual([{ word: '9 + 9', answer: '19', times: 1 }]);
      const model = reader.addUp([s]);
      expect(model.checks).toEqual([]);
      expect(model.middles).toEqual([]);
      expect(model.strands).toEqual(reader.MATH_STRANDS);
      expect(reader.learnerSeries(model.learners[0], model).map((series) => [series.kind, series.name])).toEqual([['practice', 'Math facts']]);
      const summary = parseCsv(reader.summaryCsv([{ learner: 'BlueHeron7', session: s }]));
      const head = summary[0];
      expect([summary[1][head.indexOf('measure')], summary[1][head.indexOf('score')], summary[1][head.indexOf('score_unit')]]).toEqual(['practice', '', '']);
    }
  });
  it('a played rehearsal file: the new facts counted on their own, beside the overall first-try figure', async () => {
    const r = playedRehearsal([2, 3]);
    for (const [text, name] of [[r.csv, r.csvName], [r.json, 'x.json']]) {
      const s = (await reader.read(text, { name, lastModified: Date.UTC(2026, 10, 20) })).sessions[0];
      expect([s.mode, s.score, s.value, s.integrity, s.title], name).toEqual(['practice', null, 83, 'ok', X + ' 7 facts: new and known facts']);
      expect(s.byActivity.map((a) => [a.activity, a.name, a.strand, a.graded, a.firstTry])).toEqual([['math_rehearsal', 'Fact rehearsal', 'math_facts', 12, 10]]);
      expect([s.newFacts, s.byStrand[0].newFacts]).toEqual([NEW_AND_KNOWN, NEW_AND_KNOWN]);
    }
  });
});

describe('Class Analytics files a practice file as a take-home practice session, never as a check', () => {
  const analytics = read('student_analytics_module.js');
  const cut = (source, start, end) => {
    const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
    if (a < 0 || b < 0) throw Error('not found: ' + start);
    return source.slice(a, b);
  };
  // The module's own functions, evaluated as they are written (as tests/class_analytics_take_home_import.test.js does).
  const AC = new Function(
    cut(analytics, '  function _acTrimStudentData(data) {', '  function _acRestoreImportedStudents(raw) {') +
    cut(analytics, '  function _acWsSoundMastered(entry) {', '  async function _acCanonicalStudentName(') +
    '\nreturn {summary: _acWsSessionSummary, bySkill: _acWsBySkill, readFile: _acThReadFile, apply: _acThApply, newStudent: _acThNewStudent, activityName: _acWsActivityName, strandName: _acWsStrandName};')();
  const stats = { quizAvg: 0, wsAccuracy: null, wsWordsCompleted: 0, wsBestStreak: 0, fluencyWCPM: 0, gamesPlayed: 0, totalActivities: 0, labelChallengeAvg: 0, adventureXP: 0 };
  const make = (name, session) => AC.newStudent(name, session, stats, false);

  it('reads the CSV and the JSON the same way, files them on the learner as Word Sounds take-home sessions and adds nothing to the math records', async () => {
    expect(read('desktop/web-app/public/student_analytics_module.js') === analytics).toBe(true);
    if (existsSync('desktop/app-build/student_analytics_module.js')) expect(read('desktop/app-build/student_analytics_module.js') === analytics).toBe(true);
    const r = playedResults();
    const sessions = [];
    for (const [text, name] of [[r.csv, r.csvName], [r.json, 'results.json']]) {
      const got = await AC.readFile(new File([text], name, { type: 'text/plain', lastModified: Date.UTC(2026, 10, 20) }));
      expect(got.reason, name).toBe('');
      const s = got.sessions[0];
      expect(s.check, name).toBeUndefined();
      expect([s.title, s.given, s.done, s.firstTryItems, s.firstTryCorrect, s.percent, s.integrity]).toEqual(['Doubles facts: cover, copy, compare', 9, 9, 9, 8, 89, 'ok']);
      expect(s.acts).toEqual({ math_ccc: { n: 9, g: 9, f: 9, fc: 8, c: 9 } });
      expect(s.wrong).toEqual({ '9 + 9\t19': 1 });
      sessions.push(s);
    }
    expect(sessions[0].id).toBe(sessions[1].id);
    const applied = AC.apply([], [{ session: sessions[0], name: 'BlueHeron7' }, { session: sessions[1], name: 'BlueHeron7' }], make);
    expect([applied.added, applied.created, applied.probeAdds]).toEqual([1, 1, []]);
    const learner = applied.students[0];
    expect(learner.screeningHistory).toEqual([]);
    const summary = AC.summary(learner.data.wordSoundsState);
    expect(summary.sessions.map((s) => [s.src, s.pk, Object.keys(s.acts)])).toEqual([['th', 'Doubles facts: cover, copy, compare', ['math_ccc']]]);
    // Not a Word Sounds activity: it is kept under "Math facts", by its name.
    const skills = AC.bySkill(summary);
    expect(skills.map((k) => [k.key, k.activities.map((a) => [a.id, a.firstTryCorrect, a.firstTryItems])])).toEqual([['math_facts', [['math_ccc', 8, 9]]]]);
    expect([AC.strandName(null, 'math_facts'), AC.activityName(null, 'math_ccc'), AC.activityName(null, 'math_rehearsal')]).toEqual(['Math facts', 'Cover, copy, compare', 'Fact rehearsal']);
  });

  it('a played rehearsal file keeps its new and known facts apart, and is added as practice', async () => {
    const r = playedRehearsal([2, 3]);
    const sessions = [];
    for (const [text, name] of [[r.csv, r.csvName], [r.json, 'results.json']]) {
      const s = (await AC.readFile(new File([text], name, { type: 'text/plain', lastModified: Date.UTC(2026, 10, 20) }))).sessions[0];
      expect([s.check, s.percent, s.integrity], name).toEqual([undefined, 83, 'ok']);
      expect(s.acts).toEqual({ math_rehearsal: { n: 12, g: 12, f: 12, fc: 10, c: 12, nf: 4, nfc: 3, nm: ['7 ' + X + ' 8'], kf: 8, kfc: 7 } });
      sessions.push(s);
    }
    const applied = AC.apply([], sessions.map((session) => ({ session, name: 'BlueHeron7' })), make);
    expect([applied.added, applied.probeAdds, applied.students[0].screeningHistory]).toEqual([1, [], []]);
    const fact = AC.bySkill(AC.summary(applied.students[0].data.wordSoundsState))[0];
    expect([fact.key, fact.needsSupport, fact.activities[0].newFacts]).toEqual(['math_facts', false, { newItems: 4, newFirstTry: 3, missed: ['7 ' + X + ' 8'], knownItems: 8, knownFirstTry: 7 }]);
  });
});

// ---------------------------------------------------------------------------
// 6. The maker page
// ---------------------------------------------------------------------------
const parse = (file) => new JSDOM(read(file)).window.document;
// The text a visitor can read in a document: what is on the page, and the attributes a browser shows or reads out.
function wordsOf(doc) {
  const shown = [doc.documentElement.textContent];
  for (const node of doc.querySelectorAll('*')) {
    for (const name of ['aria-label', 'title', 'alt', 'placeholder']) if (node.hasAttribute(name)) shown.push(node.getAttribute(name));
    if (node.tagName === 'META' && node.getAttribute('name') === 'description') shown.push(node.getAttribute('content'));
  }
  // The one place the verb appears: the line shared with the other Packets pages when a part did not load.
  return squash(shown.join(' \n ')).split('Check the connection').join('');
}
function openPage(options = {}) {
  const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/' + PAGE });
  const w = dom.window, d = w.document;
  opened.push(w);
  const page = { dom, w, d, asked: [], files: [], downloads: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.fetch = async (url) => { page.asked.push(String(url)); throw new TypeError('Failed to fetch'); };
  w.XMLHttpRequest = class { constructor() { page.asked.push('XMLHttpRequest'); } };
  w.Blob = class { constructor(blobParts, opts) { this.body = blobParts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), href: this.getAttribute('href') }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  for (const [key, value] of Object.entries(options.storage || {})) w.localStorage.setItem(key, value);
  // The page's own scripts, in the order the page names them.
  for (const script of d.querySelectorAll('script[src]')) w.eval(read(script.getAttribute('src')));
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.choose = (name, value) => { const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]'); radio.checked = true; radio.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.options = (name) => [...d.querySelectorAll('input[name="' + name + '"]')].filter((radio) => !radio.closest('[hidden]')).map((radio) => squash(radio.closest('label').textContent));
  page.ticks = () => [...d.querySelectorAll('#known input')].map((box) => [squash(box.closest('label').textContent), box.checked]);
  page.tick = (fact, on) => { const box = [...d.querySelectorAll('#known input')].find((b) => squash(b.closest('label').textContent) === fact); box.checked = on; box.dispatchEvent(new w.Event('change', { bubbles: true })); };
  page.until = async (condition, what) => {
    for (let i = 0; i < 2000; i++) { if (condition()) return; await new Promise((resolve) => setTimeout(resolve, 15)); }
    throw new Error('Timed out waiting for ' + what);
  };
  page.made = () => page.until(() => page.seen('summary') || page.seen('build-problem'), 'the file or a problem');
  page.rows = () => Object.fromEntries([...page.$('summary-rows').querySelectorAll('dt')].map((dt) => [dt.textContent, dt.nextElementSibling.textContent]));
  page.built = () => page.files[page.files.length - 1].body;
  page.wordsAreRight = () => { expect(NOT_SAID.exec(wordsOf(d))).toBeNull(); expect(BRITISH.exec(wordsOf(d))).toBeNull(); };
  return page;
}

describe('the page as files', () => {
  it('carries the strict rule, loads only its four scripts and one stylesheet, and has nothing inline', () => {
    const doc = parse(PAGE);
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toBe(RULE);
    const head = [...doc.head.children];
    const at = head.findIndex((node) => node.getAttribute('http-equiv') === 'Content-Security-Policy');
    expect(head.slice(0, at).every((node) => node.tagName === 'META')).toBe(true);
    expect(doc.querySelector('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
    expect([...doc.querySelectorAll('script')].map((s) => [s.getAttribute('src'), s.hasAttribute('defer'), s.textContent.trim()])).toEqual(SCRIPTS.map((src) => [src, true, '']));
    expect([...doc.querySelectorAll('link')].map((l) => [l.getAttribute('rel'), l.getAttribute('href')])).toEqual([['icon', 'packets-mark.svg'], ['stylesheet', 'packets.css']]);
    expect(doc.querySelectorAll('style, form, iframe, object, embed, img, audio, video, base')).toHaveLength(0);
    for (const node of doc.querySelectorAll('*')) for (const attribute of node.attributes) expect(/^on|^style$/i.test(attribute.name), node.tagName + ' ' + attribute.name).toBe(false);
    for (const file of [PAGE, SCRIPT, 'packet_math_practice_builder.js']) expect(read(file).match(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [], file).toEqual([]);
    for (const node of doc.querySelectorAll('[href], [src]')) expect(node.getAttribute('href') || node.getAttribute('src')).toMatch(/^(?:#[\w-]+|\.\/|[\w.-]+(?:\/[\w.-]+)*(?:#[\w-]+)?)$/);
    for (const file of [SCRIPT, 'packet_math_practice_builder.js']) {
      expect(read(file), file).not.toMatch(/fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\beval\s*\(|new\s+Function|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker|indexedDB|sessionStorage|Date\.now|new Date|Math\.random/);
    }
  });

  it('"See the details" lists exactly what the page loads, and says it in plain American words', () => {
    const doc = parse(PAGE);
    const loads = 1 + doc.querySelectorAll('link').length + doc.querySelectorAll('script[src]').length;
    expect(loads).toBe(7);
    const items = [...doc.querySelectorAll('details.proof .proof-body > ul:first-child > li')].map((li) => squash(li.textContent));
    expect(items[3]).toBe('This page loads seven files, all from this site: the page itself, one stylesheet, four scripts and the icon in the browser tab. They are the same files whatever you choose, and each is named near the top of the page\'s source. It loads no fonts, no trackers and nothing from another site. Try it opens this site\'s preview page in a new tab.');
    expect(squash(doc.querySelector('.proof-line').textContent)).toBe('This page runs without AI. No account. Nothing you choose leaves your device.');
    expect(squash(doc.querySelector('.foot').textContent)).toBe(squash(parse('packets-check.html').querySelector('.foot').textContent));
    expect(squash(doc.getElementById('when-line').textContent)).toBe('Accuracy first: use cover, copy, compare until the facts are right. Practice for speed comes later.');
    const words = wordsOf(doc);
    expect(NOT_SAID.exec(words)).toBeNull();
    expect(BRITISH.exec(words)).toBeNull();
    // Every sentence that holds the word AI says that none runs.
    const ai = words.split(/(?<=\.)\s+/).filter((sentence) => /\bAI\b/.test(sentence));
    expect(ai.length).toBeGreaterThanOrEqual(3);
    // (Headings have no full stop, so a sentence may start with one: what counts is how it ends.)
    for (const sentence of ai) expect(['This page runs without AI.', 'Run AI.', 'Runs without AI.'].some((ok) => sentence.endsWith(ok)), sentence).toBe(true);
    // The order the page states is the builder's order.
    const adds = MP.FAMILIES.filter((f) => f.op === 'add').map((f) => f.name.toLowerCase());
    adds[adds.length - 1] = 'then the rest';
    const order = squash(doc.getElementById('order-line').textContent);
    expect(order).toBe('The sets and their order follow a common teaching order, not a standard. Addition: ' + adds.join(', ') + '. Multiplication: '
      + MP.FAMILIES.filter((f) => f.op === 'mul').map((f) => f.name.toLowerCase()).join(', ') + '.');
    expect(squash(doc.getElementById('plan-line').textContent)).toContain('So 8 of every 12 cards are facts the student knows.');
  });
});

describe('the page, run in jsdom with the scripts it names', () => {
  it('step by step: a set, rehearsal from the teaching order, the file, and nothing asked of the network', async () => {
    const page = openPage();
    expect(page.seen('step-1') && !page.seen('loading') && !page.seen('load-problem')).toBe(true);
    expect(page.w.document.title).toBe(NAME + ': Make math fact practice, step 1 of 3');
    expect(page.options('kind')).toEqual(['Addition', 'Multiplication', 'My own facts']);
    page.$('next-1').click();
    expect(page.$('step-1-problem').textContent).toBe('Choose addition, multiplication or your own facts to go on.');
    page.choose('kind', 'mul');
    expect(page.options('set')).toHaveLength(11);
    expect(page.options('set')[9]).toBe(X + ' 7 7 ' + X + ' 1 to 7 ' + X + ' 10. 10 facts.');
    expect(page.options('set')[0]).toBe(X + ' 2 2 ' + X + ' 1 to 2 ' + X + ' 10. 10 facts.');
    page.$('next-1').click();
    expect(page.$('step-1-problem').textContent).toBe('Choose a set of facts to go on.');
    page.choose('set', 'mul-7');
    expect(page.$('set-line').textContent).toBe('Multiplication: ' + X + ' 7. 10 facts.');
    page.$('next-1').click();
    expect(page.seen('step-2')).toBe(true);
    expect(page.d.activeElement).toBe(page.$('step-2-title'));
    page.$('next-2').click();
    expect(page.$('step-2-problem').textContent).toBe('Choose a way to practice to go on.');
    page.choose('method', 'rehearsal');
    expect(page.seen('panel-known')).toBe(true);
    expect(page.ticks()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => ['7 ' + X + ' ' + k, k !== 8]));
    expect(page.$('known-hint').textContent).toBe('Chosen from the teaching order: a fact is chosen when it, or its turnaround, is in a set that comes earlier. Change the choices to fit the student.');
    expect(page.$('known-line').textContent).toBe('New fact in this file: 7 ' + X + ' 8.');
    expect(page.$('known-sub').textContent).toBe('12 cards. 8 are facts the student knows.');
    page.tick('7 ' + X + ' 6', false);
    expect(page.$('known-line').textContent).toBe('New facts in this file: 7 ' + X + ' 6 and 7 ' + X + ' 8.');
    expect(JSON.parse(page.w.localStorage.getItem(KEY)).known['mul-7']).toEqual(['mul:7:1', 'mul:7:2', 'mul:7:3', 'mul:7:4', 'mul:7:5', 'mul:7:7', 'mul:7:9', 'mul:7:10']);
    page.$('next-2').click();
    await page.made();
    expect(page.seen('summary')).toBe(true);
    const rows = page.rows();
    expect(rows.Facts).toBe('Multiplication: ' + X + ' 7. 10 facts.');
    expect(rows.How).toMatch(/^Rehearsal with known facts\. New facts: 7 × 6 and 7 × 8\. Known facts: .+\.$/);
    expect(rows.Cards).toBe('24 cards. 16 are facts the student knows. Each new fact is asked 4 times, and shown with its answer the first time.');
    expect(rows.Clock).toBe('None.');
    expect(rows.File).toMatch(/^math-facts-mul-7-rehearsal\.html, \d+ KB\.$/);
    expect(page.$('try').getAttribute('href')).toMatch(/^packets-try\.html#blob:/);
    page.wordsAreRight();
    page.$('save').click();
    expect(page.downloads.map((x) => x.name)).toEqual(['math-facts-mul-7-rehearsal.html']);
    expect(page.d.activeElement).toBe(page.$('after-save'));
    // The file is the one the builder makes from the same choices, and it cannot connect.
    const html = page.built();
    const known = ['mul:7:1', 'mul:7:2', 'mul:7:3', 'mul:7:4', 'mul:7:5', 'mul:7:7', 'mul:7:9', 'mul:7:10'];
    expect(html).toBe(build({ mode: 'rehearsal', factSet: 'mul-7', known }).html);
    expect(verify.verifyPacket(html).result).toBe('closed');
    expect(page.asked).toEqual([]);
    // It opens again the way it was left.
    const again = openPage({ storage: { [KEY]: page.w.localStorage.getItem(KEY) } });
    again.$('next-1').click();
    expect([again.seen('step-2'), again.ticks().filter(([, on]) => !on).map(([f]) => f)]).toEqual([true, ['7 ' + X + ' 6', '7 ' + X + ' 8']]);
    again.$('forget').click();
    expect([again.w.localStorage.getItem(KEY), again.seen('step-1'), again.$('forget-said').textContent]).toEqual([null, true, 'Done. The page is back to how it started.']);
  });

  it('says why a rehearsal file cannot be made yet, and makes a cover, copy, compare file of the same set', async () => {
    const page = openPage();
    page.choose('kind', 'add');
    page.choose('set', 'add-0-1');
    page.$('next-1').click();
    page.choose('method', 'rehearsal');
    expect(page.$('known-hint').textContent).toBe('+ 0 and + 1 comes first in the order, so none are chosen yet. Choose the facts the student already knows.');
    expect(page.$('known-line').textContent).toBe('Rehearsal needs at least 3 facts the learner already knows. None are chosen.');
    page.$('next-2').click();
    expect([page.seen('step-2'), page.$('step-2-problem').textContent]).toEqual([true, 'Rehearsal needs at least 3 facts the learner already knows. None are chosen.']);
    for (const fact of ['0 + 0', '1 + 0', '2 + 0']) page.tick(fact, true);
    expect(page.$('known-line').textContent).toBe('New facts in this file: 3 + 0, 4 + 0 and 5 + 0.');
    expect(page.$('known-sub').textContent).toContain('14 more new facts wait for another file: 6 + 0, ');
    page.choose('method', 'ccc');
    expect(page.seen('panel-known')).toBe(false);
    page.$('next-2').click();
    await page.made();
    expect(page.rows().How).toBe('Cover, copy, compare. Every fact once, in a mixed order, so the student cannot just count on.');
    expect(page.rows().Cards).toBe('20 cards. Each one starts with the fact and its answer.');
    expect(page.built()).toBe(build({ mode: 'ccc', factSet: 'add-0-1' }).html);
    // A set from the doubles on: known facts come from the set before, and the page says which.
    page.$('back-3').click();
    page.$('back-2').click();
    page.choose('set', 'add-doubles');
    page.$('next-1').click();
    page.choose('method', 'rehearsal');
    expect(page.$('known-sub').textContent).toBe('36 cards. 24 are facts the student knows. Only 1 fact is chosen, so 3 + 0 and 0 + 1 from + 0 and + 1, the set before, are used as known facts too. 5 more new facts wait for another file: 5 + 5, 6 + 6, 7 + 7, 8 + 8 and 9 + 9.');
    page.wordsAreRight();
    expect(page.asked).toEqual([]);
  });

  it('own facts: each line looked at as it is typed, then the file', async () => {
    const page = openPage();
    page.choose('kind', 'own');
    const box = page.$('f-facts');
    box.value = '7 x 8\n9 / 0\n6+7\n6 + 7\nseven';
    box.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    await page.until(() => page.$('own-list').children.length === 5, 'the typed facts');
    expect([...page.$('own-list').children].map((li) => [li.className, li.querySelector('.w').textContent, li.querySelector('.s').textContent])).toEqual([
      ['is-ok', '7 ' + X + ' 8', 'Ready. The answer is 56.'], ['is-out', '9 / 0', 'It divides by 0.'], ['is-ok', '6 + 7', 'Ready. The answer is 13.'],
      ['is-out', '6 + 7', 'Already in the list.'], ['is-out', 'seven', 'This is not a fact. Write it like 7 x 8 or 6 + 7.']]);
    page.$('next-1').click();
    expect(page.$('step-1-problem').textContent).toBe('3 facts cannot be used. Change them or take them out to go on.');
    box.value = '7 x 8, 6 + 7, 12 - 5';
    box.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    await page.until(() => page.$('own-list').children.length === 3, 'the fixed list');
    page.$('next-1').click();
    page.choose('method', 'ccc');
    page.$('next-2').click();
    await page.made();
    expect(page.rows().Facts).toBe('3 facts: 7 ' + X + ' 8, 6 + 7, 12 ' + MINUS + ' 5.');
    expect(page.rows().How).toBe('Cover, copy, compare. Every fact once, in the order you typed them.');
    expect(page.rows().Title).toBe('My math facts: cover, copy, compare');
    expect(page.built()).toBe(build({ mode: 'ccc', facts: '7 x 8, 6 + 7, 12 - 5' }).html);
    page.wordsAreRight();
  });

  it('a typed fact with a decimal says "Whole numbers only."', async () => {
    const page = openPage();
    page.choose('kind', 'own');
    const box = page.$('f-facts');
    box.value = '2.5 + 1\n7 x 8';
    box.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    await page.until(() => page.$('own-list').children.length === 2, 'the typed facts');
    expect([...page.$('own-list').children].map((li) => [li.className, li.querySelector('.s').textContent])).toEqual([['is-out', 'Whole numbers only.'], ['is-ok', 'Ready. The answer is 56.']]);
    expect(page.$('facts-hint').textContent).toContain('Whole numbers only.');
  });

  it('says what is missing when a part of the page did not load', () => {
    const dom = new JSDOM(read(PAGE), { runScripts: 'outside-only', url: 'https://packets.test/site/' + PAGE });
    opened.push(dom.window);
    for (const file of ['packets-page.js', 'word_sounds_take_home_loader.js', SCRIPT]) dom.window.eval(read(file));
    const d = dom.window.document;
    expect([d.getElementById('loading').hidden, d.getElementById('load-problem').hidden]).toEqual([true, false]);
    expect(d.getElementById('load-problem-text').textContent).toBe('Missing: the part that makes math fact practice. Check the connection, then load the page again. Nothing has been lost.');
  });
});

describe('the front door', () => {
  it('gives math fact practice its own entry on the math card, beside the math check, and names its builder', () => {
    const doc = parse('packets.html');
    const card = doc.querySelector('.card-pair');
    expect(card.querySelector('h2').textContent).toBe('Make math fact practice or a math check');
    expect([...card.querySelectorAll('a')].map((a) => [a.getAttribute('href'), a.textContent])).toEqual([[PAGE, 'Math fact practice'], ['packets-check.html', 'A math check']]);
    // Five cards since 2026-11-12: the vocabulary maker has one of its own.
    expect(doc.querySelectorAll('.cards > .card')).toHaveLength(5);
    expect(existsSync(PAGE)).toBe(true);
    // Listed with the other builders on the front door and in the guide for school IT.
    for (const file of ['packets.html', 'packets-it.html']) expect(read(file), file).toContain('<code>packet_math_practice_builder.js</code>');
    expect(doc.getElementById('today').textContent).toContain('math fact practice');
  });
});
