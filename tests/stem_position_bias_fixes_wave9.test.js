// Wave 9 of the answer-position-bias sweep (2026-11-18). Sixteen scanner-flagged
// tools had no distribution test. Traced to what a student sees, most were already
// normalised at load or draw time (the scanner reads authored literals). Six banks
// really did render in a biased order and are fixed here:
//   - beehive QUIZ_QUESTIONS        2/13/7/2 (54% at B), rotated at draw in startQuiz
//   - statslab AP_QUIZ_BANK         2/9/13/1 (52% at C), rotated once at load
//   - spacestation orbit challenges 0/4/0 (every key in the middle), emergency 1/3/0
//   - lifeskills DL_SCENARIOS       1/4/1/0, HOMESYS_QUIZ 0/2/1 (2 of 3 earns a badge)
//   - printingpress CalendarLab     1/3/0
//   - flightsim lesson checks       0/4/2/1 after the seeded shuffle
// Tests EXECUTE the shipped bank literals and the shipped normalisers, sliced from
// source (these tools are 0.4-4 MB; loadTool would be slow). Each asserts the
// post-normalisation slots and that every question keeps its own answer text.
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const src = {};
const read = (id) => (src[id] = src[id] || fs.readFileSync('stem_lab/stem_tool_' + id + '.js', 'utf8'));
const tStub = (k, fb) => (fb == null ? k : fb);

// Source from `start` up to (not including) `end`, searched after `start`.
function slice(id, start, end, from) {
  const s = read(id);
  const i = s.indexOf(start, from ? s.indexOf(from) : 0);
  expect(i, id + ': ' + start).toBeGreaterThan(-1);
  const j = s.indexOf(end, i + start.length);
  expect(j, id + ': ' + end).toBeGreaterThan(i);
  return s.slice(i, j);
}
// An array/object literal from its declaration through the closing line at `indent`.
function literal(id, decl, indent, close = ']') {
  const s = read(id);
  const i = s.indexOf(decl);
  expect(i, id + ': ' + decl).toBeGreaterThan(-1);
  const re = new RegExp('\\r?\\n' + ' '.repeat(indent) + '\\' + close + '[;,)]?', 'g');
  re.lastIndex = i;
  const m = re.exec(s);
  return s.slice(i, m.index + m[0].length);
}
const run = (code, ret, env = {}) =>
  new Function('__alloT', 't', ...Object.keys(env), code + '\n;return ' + ret + ';')(tStub, tStub, ...Object.values(env));

// Slot tally for items whose answer is an index (or the answer text, or a flag).
function slots(items, opts, key) {
  const placed = [0, 0, 0, 0];
  for (const q of items) placed[key(q, opts(q))]++;
  return placed;
}
const maxShare = (p) => Math.max(...p) / p.reduce((a, b) => a + b, 0);
function preserved(raw, done, opts, key) {
  expect(done.length).toBe(raw.length);
  raw.forEach((r, i) => {
    const a = opts(r), b = opts(done[i]);
    expect(b[key(done[i], b)], 'question ' + i).toEqual(a[key(r, a)]);
    expect([...b].map(String).sort(), 'question ' + i).toEqual([...a].map(String).sort());
  });
}

describe('beehive Bee Knowledge Quiz (fixed: rotated at draw)', () => {
  const bank = literal('beehive', '        var QUIZ_QUESTIONS = [', 8);
  const rotate = slice('beehive', 'var shuffled = QUIZ_QUESTIONS.map(', '          // Fisher-Yates shuffle, then pick 10');
  const raw = run(bank, 'QUIZ_QUESTIONS');
  const done = run(bank + rotate, 'shuffled');
  const opts = (q) => q.opts, key = (q) => q.ans;
  it('the authored bank really is biased (calibration)', () => {
    expect(raw.length).toBeGreaterThanOrEqual(24);
    expect(maxShare(slots(raw, opts, key))).toBeGreaterThan(0.5);
  });
  it('drawn questions spread across all four slots', () => {
    const p = slots(done, opts, key);
    expect(maxShare(p), p.join('/')).toBeLessThanOrEqual(0.3);
    expect(p.filter((c) => c === 0).length).toBe(0);
  });
  it('every question keeps its own answer text', () => preserved(raw, done, opts, key));
});

describe('statslab AP quiz bank (fixed: rotated at load)', () => {
  const bank = literal('statslab', '  var AP_QUIZ_BANK = [', 2);
  const rotate = slice('statslab', '  AP_QUIZ_BANK = AP_QUIZ_BANK.map(', '  // ───', '  // Pick 5 questions');
  const raw = run(bank, 'AP_QUIZ_BANK');
  const done = run(bank + rotate, 'AP_QUIZ_BANK');
  const opts = (q) => q.choices, key = (q) => q.correct;
  it('the authored bank really is biased (calibration)', () => {
    expect(raw.length).toBeGreaterThanOrEqual(25);
    expect(maxShare(slots(raw, opts, key))).toBeGreaterThan(0.45);
  });
  it('no slot above 30%, no dead slot', () => {
    const p = slots(done, opts, key);
    expect(maxShare(p), p.join('/')).toBeLessThanOrEqual(0.3);
    expect(p.filter((c) => c === 0).length).toBe(0);
  });
  it('every question keeps its own answer text', () => preserved(raw, done, opts, key));
});

describe('spacestation orbit challenges + emergency drills (fixed)', () => {
  const physics = slice('spacestation', '  var ISS_GM = ', '  // Two-body flight model');
  const bankFns = slice('spacestation', '  function issPlaceAnswer(', '  var FAST_FACTS = [');
  const mapCall = slice('spacestation', '      var ORBIT_CHALLENGES = issChallengeBank().map(', '      var orbitChallengeId');
  const keyOf = (c) => c.options.findIndex((o) => o.correct);
  it('orbit challenges: the key no longer always sits in the middle', () => {
    const raw = run(physics + bankFns, 'issChallengeBank()');
    const done = run(physics + bankFns + mapCall, 'ORBIT_CHALLENGES');
    expect(raw.map(keyOf)).toEqual([1, 1, 1, 1]);
    const p = slots(done, (c) => c.options, keyOf);
    expect(p.slice(0, 3).filter((c) => c === 0).length, p.join('/')).toBe(0);
    expect(Math.max(...p)).toBeLessThanOrEqual(2);
    raw.forEach((c, i) => {
      expect(done[i].options[keyOf(done[i])].id).toBe(c.options[keyOf(c)].id);
      expect(done[i].options.map((o) => o.id).sort()).toEqual(c.options.map((o) => o.id).sort());
    });
  });
  it('emergency drills: every slot used, feedback travels with its choice', () => {
    const block = slice('spacestation', '          var scenarios = {', '          var incidentState');
    const ids = Object.keys(run(literal('spacestation', '          var scenarios = {', 10, '}'), 'scenarios'));
    expect(ids.length).toBe(4);
    const rawAll = run(literal('spacestation', '          var scenarios = {', 10, '}'), 'scenarios');
    const env = { issPlaceAnswer: run(bankFns, 'issPlaceAnswer', { issOrbit: () => ({}), ISS_REF_ALT: 420 }) };
    const placed = [0, 0, 0];
    for (const id of ids) {
      const sc = new Function('d', 'issPlaceAnswer', block + '\n;return scenario;')({ opsEmergency: id }, env.issPlaceAnswer);
      placed[sc.correct]++;
      const raw = rawAll[id];
      expect(sc.choices[sc.correct], id).toEqual(raw.choices[raw.correct]);
      expect(sc.choices[sc.correct][1], id).toMatch(/^Correct:/);
      expect(sc.choices.map((c) => c.join('|')).sort()).toEqual(raw.choices.map((c) => c.join('|')).sort());
    }
    expect(placed.filter((c) => c === 0).length, placed.join('/')).toBe(0);
  });
});

describe('lifeskills data-detective + home-systems quiz (fixed: rotated at load)', () => {
  const dl = literal('lifeskills', '  var DL_SCENARIOS = [', 2);
  const hs = literal('lifeskills', '  var HOMESYS_QUIZ = [', 2);
  const rotate = slice('lifeskills', '  function lsPlaceAnswers(', '  function detectLifeSkillsPII(');
  it('the rotation runs at load, outside the pure-helper slice, on the banks the views read', () => {
    const s = read('lifeskills');
    const at = s.indexOf("HOMESYS_QUIZ = lsPlaceAnswers(HOMESYS_QUIZ, 'choices', 'answerIdx');");
    expect(at).toBeGreaterThan(s.indexOf('  var HOMESYS_QUIZ = ['));
    expect(at).toBeLessThan(s.indexOf('function detectLifeSkillsPII(text)'));
    expect(s).toContain('var isCorrect = oi === dlCurrent.correct;');
    expect(s).toContain('var ok = ci === qCurrent.answerIdx;');
  });
  it('DL_SCENARIOS: B no longer holds 4 of 6, D is live', () => {
    const raw = run(dl, 'DL_SCENARIOS');
    const done = run(dl + hs + rotate, 'DL_SCENARIOS');
    const opts = (q) => q.options, key = (q) => q.correct;
    expect(slots(raw, opts, key)[1]).toBe(4);
    const p = slots(done, opts, key);
    expect(Math.max(...p), p.join('/')).toBeLessThanOrEqual(2);
    expect(p.filter((c) => c === 0).length).toBe(0);
    preserved(raw, done, opts, key);
  });
  it('HOMESYS_QUIZ: always-B no longer earns the 2-of-3 badge', () => {
    const raw = run(hs, 'HOMESYS_QUIZ');
    const done = run(dl + hs + rotate, 'HOMESYS_QUIZ');
    const opts = (q) => q.choices, key = (q) => q.answerIdx;
    const p = slots(done, opts, key);
    expect(Math.max(...p), p.join('/')).toBe(1);
    preserved(raw, done, opts, key);
  });
});

describe('printingpress Old Style diary dates (fixed: ppPlaceBank)', () => {
  it('three keys no longer share slot B, and C is live', () => {
    const fns = 'function ppEn(s) { return s; }\n' + slice('printingpress', '      function ppPlaceBank(', '      function scenarioCard(');
    const cases = slice('printingpress', 'ppPlaceBank([', ", 'd', 'opts', 'a');", '      function CalendarLab() {');
    const raw = run('var CASES = ' + cases.slice('ppPlaceBank('.length) + ';', 'CASES');
    const done = run(fns + 'var CASES = ' + cases + ", 'd', 'opts', 'a');", 'CASES');
    const opts = (q) => q.opts, key = (q) => q.a;
    expect(slots(raw, opts, key)).toEqual([1, 3, 0, 0]);
    const p = slots(done, opts, key).slice(0, 3);
    expect(p.filter((c) => c === 0).length, p.join('/')).toBe(0);
    expect(Math.max(...p)).toBeLessThanOrEqual(2);
    preserved(raw, done, opts, key);
  });
});

describe('flightsim lesson checks (fixed: key placed per lesson after the seeded shuffle)', () => {
  it('keys use every slot; the graded text is unchanged', () => {
    const code = literal('flightsim', '  var LESSON_CHECKS = {', 2, '}') +
      slice('flightsim', '  function getFlightLessonCheck(', '  // ── WORLD GEOGRAPHY') +
      slice('flightsim', '  function flightQuizHash(', '  // Saves from before');
    const { LESSON_CHECKS, getFlightLessonCheck } = run(code, '{ LESSON_CHECKS: LESSON_CHECKS, getFlightLessonCheck: getFlightLessonCheck }');
    const ids = Object.keys(LESSON_CHECKS);
    expect(ids.length).toBeGreaterThanOrEqual(7);
    const placed = [0, 0, 0, 0];
    for (const id of ids) {
      const c = getFlightLessonCheck(id);
      expect(c.correct).toBe(LESSON_CHECKS[id].correct);
      expect([...c.options].sort()).toEqual([...LESSON_CHECKS[id].options].sort());
      placed[c.options.indexOf(c.correct)]++;
      expect(getFlightLessonCheck(id).options).toEqual(c.options); // stable across renders
    }
    expect(placed.filter((n) => n === 0).length, placed.join('/')).toBe(0);
    expect(Math.max(...placed)).toBeLessThanOrEqual(2);
  });
});

// Already normalised before this wave; pinned so a renamed field or a dropped
// rotation cannot silently re-bias them (every normaliser bails on a bad shape).
describe('already-normalised banks stay spread (regression pins)', () => {
  const rotated = (id, decl, endMarker, ret, opt, ans) => run(slice(id, decl, endMarker), ret).flat()
    .map((q) => ({ o: q[opt], a: q[ans] }));
  const check = (items, limit) => {
    const p = slots(items, (q) => q.o, (q) => q.a);
    expect(maxShare(p), p.join('/')).toBeLessThanOrEqual(limit);
    const used = p.slice(0, Math.max(...items.map((q) => q.o.length)));
    expect(used.filter((c) => c === 0).length, p.join('/')).toBe(0);
  };
  it('nutritionlab label challenges + myths', () => {
    check(rotated('nutritionlab', '      var LABELS = [', '      function NutritionFactsPanel', 'LABELS.map(function (l) { return l.questions; })', 'choices', 'answer'), 0.42);
    check(rotated('nutritionlab', '      var MYTHS = [', '      function NutritionMythsLab', 'MYTHS', 'choices', 'answer'), 0.4);
  });
  it('microbiology quiz', () => {
    check(rotated('microbiology', '  var QUIZ_QUESTIONS = [', '  // ───', 'QUIZ_QUESTIONS', 'choices', 'answer'), 0.35);
  });
  it('dinolab quiz (also feeds the printed worksheet)', () => {
    check(rotated('dinolab', '  var QUIZ = [', '  // ── Paleontology glossary', 'QUIZ', 'options', 'answer'), 0.35);
  });
  it('universe chapter predictions (display-order rotation)', () => {
    const { P, order } = run(slice('universe', '  var UNIVERSE_PREDICTIONS = [', '  // Big Questions sorts'),
      '{ P: UNIVERSE_PREDICTIONS, order: universePredictionOrder }');
    const placed = [0, 0, 0];
    P.forEach((item, ch) => { if (item) placed[order(ch).indexOf(item.answer)]++; });
    expect(Math.max(...placed), placed.join('/')).toBeLessThanOrEqual(3);
    expect(placed.filter((c) => c === 0).length).toBe(0);
  });
  it('bikelab rules quiz (render-time quizOrder)', () => {
    const s = read('bikelab');
    const Q = run(literal('bikelab', '        var QUESTIONS = [', 8), 'QUESTIONS');
    const order = run(slice('bikelab', 'var quizOrder = ', '\n') .replace(/\r$/, ''), 'quizOrder');
    expect(s).toContain('quizOrder(q.choices, idx).map(');
    const placed = [0, 0, 0, 0];
    Q.forEach((q, i) => { placed[order(q.choices, i).findIndex((c) => c.correct)]++; });
    expect(maxShare(placed), placed.join('/')).toBeLessThanOrEqual(0.35);
    expect(placed.filter((c) => c === 0).length).toBe(0);
  });
  it('wave quiz is dealt with a Fisher-Yates copy at draw, graded by text', () => {
    const s = read('wave');
    expect(s).toContain('var opts = q.opts.slice();');
    expect(s).toMatch(/for \(var oi = opts\.length - 1; oi > 0; oi--\) \{ var oj = Math\.floor\(Math\.random\(\) \* \(oi \+ 1\)\);/);
    expect(s).toContain('var isCorrect = opt === d.quiz.a;');
  });
});
