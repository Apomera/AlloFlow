// Rocks & Minerals, clarity pass (2026-09-23).
//
// The lab results (acid, streak, scratch) were stored once and never cleared,
// so the tool showed one specimen's result under another: quartz's "White"
// streak beside the greenish-black one the plate drew for pyrite, and a
// finished scratch that drew the NEXT mineral's outcome before it was tested.
// Also here: the rock card's acid test (it had no picture and its own copy of
// the fizz list), the key map's pictures, the Mystery tiles, chalk's texture
// words, and the landscape labels growing with the scene.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 30000 });
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_rocks.js';
const SRC = readFileSync(ROCKS_FILE, 'utf8');
const ROCK_IDS = [...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch(')).matchAll(/\{ id: '(\w+)', type: '/g)].map((m) => m[1]);
const FIZZ = new Function('return ' + /var RK_KEY_ROCKS_FIZZ = (\{[^}]*\});/.exec(SRC)[1])();

function mk(rocks) {
  const store = { rocks: Object.assign({}, rocks), rockCycle: {} };
  const ctx = makeCtx({ toolData: store, setToolData: (f) => { Object.assign(store, typeof f === 'function' ? f(store) : f); } });
  return { store, ctx };
}
function render(rocks) {
  const { ctx } = mk(rocks);
  return ReactDOMServer.renderToStaticMarkup(React.createElement(() => window.StemLab._registry.rocks.render(ctx)));
}
function tree(rocks) {
  const { store, ctx } = mk(rocks);
  return { store, node: window.StemLab._registry.rocks.render(ctx) };
}
function findAll(node, pred, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, acc)); return acc; }
  if (pred(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, pred, acc);
  return acc;
}
const textOf = (n) => (n == null || typeof n === 'boolean' ? '' : typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(textOf).join('') : textOf(n.props && n.props.children));
const buttonByText = (t, text) => findAll(t.node, (n) => n.type === 'button' && textOf(n).indexOf(text) !== -1 && typeof n.props.onClick === 'function')[0];

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
  globalThis.ResizeObserver = class { observe() {} disconnect() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe('mirror', () => {
  it('source and deploy copies are byte-identical', () => {
    expect(readFileSync(ROCKS_FILE).equals(readFileSync(PUBLIC_FILE))).toBe(true);
  });
});

// ── A result belongs to the specimen it was run on ─────────────────────────
describe('lab results belong to their specimen', () => {
  it('does not show quartz\'s streak under pyrite', () => {
    const stale = render({ mode: 'minerals', selectedMineral: 'pyrite', labFor: 'm:quartz', streakResult: 'Powder Streak Result: White' });
    expect(stale).not.toContain('Powder Streak Result: White');
    const fresh = render({ mode: 'minerals', selectedMineral: 'pyrite', labFor: 'm:pyrite', streakResult: 'Powder Streak Result: Greenish-black' });
    expect(fresh).toContain('Powder Streak Result: Greenish-black');
    // An old save with no tag at all still shows what it had.
    expect(render({ mode: 'minerals', selectedMineral: 'pyrite', streakResult: 'Powder Streak Result: Greenish-black' })).toContain('Powder Streak Result: Greenish-black');
  });

  it('does not draw a finished scratch on a mineral that was never scratched', () => {
    const base = { mode: 'minerals', selectedMineral: 'calcite', scratchTool: 'diamond_scribe' };
    const untested = render(base);
    const stale = render(Object.assign({ labFor: 'm:quartz', scratchAnimProgress: 100, scratchResult: 'Result: Scratch created!' }, base));
    const fresh = render(Object.assign({ labFor: 'm:calcite', scratchAnimProgress: 100, scratchResult: 'Result: Scratch created!' }, base));
    expect(stale).toBe(untested);
    expect(fresh).not.toBe(untested);
    expect(fresh).toContain('Result: Scratch created!');
  });

  it('clears the other results when a test is run on a new specimen', () => {
    vi.useFakeTimers();
    const t = tree({ mode: 'minerals', selectedMineral: 'quartz', labFor: 'm:pyrite', streakResult: 'old', scratchResult: 'old too', fizzResult: 'old fizz' });
    buttonByText(t, 'Perform Streak Test').props.onClick();
    expect(t.store.rocks).toMatchObject({ labFor: 'm:quartz', streakAnimActive: true, scratchResult: null, fizzResult: null });
    // Same specimen again: nothing else is wiped.
    const t2 = tree({ mode: 'minerals', selectedMineral: 'quartz', labFor: 'm:quartz', scratchResult: 'keep me' });
    buttonByText(t2, 'Perform Streak Test').props.onClick();
    expect(t2.store.rocks.scratchResult).toBe('keep me');
  });
});

// ── The rock card's acid test ──────────────────────────────────────────────
describe('rock acid test', () => {
  it('fizzes for exactly the rocks the identification key says fizz', () => {
    expect(Object.keys(FIZZ).sort()).toEqual(['chalk', 'limestone', 'marble', 'travertine']);
    ROCK_IDS.forEach((id) => {
      const m = render({ mode: 'rocks', selectedRock: id, labFor: 'r:' + id, fizzResult: 'x' });
      expect(m, id).toContain('data-rk-rock-fizz="' + (FIZZ[id] ? 'fizz' : 'none') + '"');
    });
    // The lab no longer keeps its own copy of the list.
    expect(SRC).not.toContain("targetId === 'limestone' || targetId === 'marble'");
  });

  it('draws the test, and forgets another rock\'s result', () => {
    const ready = render({ mode: 'rocks', selectedRock: 'granite' });
    expect(ready).toContain('data-rk-rock-fizz="ready"');
    expect(ready).toContain('A pipette of dilute hydrochloric acid above the specimen');
    expect(render({ mode: 'rocks', selectedRock: 'granite', labFor: 'r:limestone', fizzResult: 'fizz' })).toContain('data-rk-rock-fizz="ready"');
    expect(render({ mode: 'rocks', selectedRock: 'granite', labFor: 'r:granite', fizzResult: 'none' })).toContain('no bubbles, so no carbonate is present');
  });

  it('writes a balanced equation with real subscripts', () => {
    const m = render({ mode: 'rocks', selectedRock: 'limestone', labFor: 'r:limestone', fizzResult: 'fizz' });
    const eq = />([^<]*→[^<]*)<\/p>/.exec(m.slice(m.indexOf('data-rk-fizz-equation')))[1];
    expect(eq).toContain('₃');
    const SUB = { '₀': 0, '₁': 1, '₂': 2, '₃': 3, '₄': 4, '₅': 5, '₆': 6, '₇': 7, '₈': 8, '₉': 9 };
    const side = (str) => {
      const tally = {};
      str.split(' + ').forEach((term) => {
        const t = term.replace('↑', '').trim();
        const k = /^(\d*)(.*)$/.exec(t);
        const coef = k[1] ? Number(k[1]) : 1;
        for (const a of k[2].matchAll(/([A-Z][a-z]?)([₀-₉]*)/g)) {
          const n = a[2] ? Number([...a[2]].map((c) => SUB[c]).join('')) : 1;
          tally[a[1]] = (tally[a[1]] || 0) + coef * n;
        }
      });
      return tally;
    };
    const [l, r] = eq.split('→');
    expect(side(l)).toEqual(side(r));
    expect(side(l)).toEqual({ Ca: 1, C: 1, O: 3, H: 2, Cl: 2 });
  });
});

// ── The key map, the Mystery tiles, chalk's words ──────────────────────────
describe('catalogue pictures and words', () => {
  it('puts each rock\'s specimen at its leaf of the key map, and the question at each fork', () => {
    const m = render({ mode: 'rocks', rkKeyMap: true, rkKey: { path: [] } });
    const map = m.slice(m.indexOf('data-rk-key-map'), m.indexOf('</svg>', m.lastIndexOf('data-key-map-pic')) + 6);
    const pics = [...map.matchAll(/data-key-map-pic="(\w+)"/g)].map((x) => x[1]);
    expect(pics.length).toBe(26);
    expect(new Set(pics).size).toBe(24);
    ROCK_IDS.forEach((id) => expect(pics, id).toContain(id));
    expect(map).toContain('<title>Look at the whole specimen and through the hand lens. Which describes it best?</title>');
    expect(count(map, /<title>/g)).toBe(11);
  });

  it('gives Mystery Rock the same tiles as the catalogue', () => {
    const m = render({ mode: 'mystery', mystery: { rockId: 'breccia', clues: ['a', 'b', 'c'], cluesShown: 1, revealed: false, solved: false, lastGuess: 'conglom' } });
    expect(count(m, /data-rk-mystery-tile="/g)).toBe(24);
    const at = m.indexOf('data-rk-mystery-tile="conglom"');
    expect(m.slice(at, m.indexOf('</button>', at))).toContain('✗ ');
    expect(m.slice(at, m.indexOf('</button>', at))).toContain('width="68"');
  });

    it('puts the mineral catalogue first and the room of objects after it, as the Rocks tab does', () => {
    const none = render({ mode: 'minerals' });
    expect(none.indexOf('data-mineral-grid')).toBeGreaterThan(-1);
    expect(none.indexOf('data-rk-life=')).toBeGreaterThan(none.indexOf('data-mineral-grid'));
    const picked = render({ mode: 'minerals', selectedMineral: 'quartz' });
    expect(picked.indexOf('data-rk-life=')).toBeGreaterThan(picked.indexOf('data-rk-mineral-hero="quartz"'));
  });

  it('registers every mineral description exactly as the code has it', () => {
    // The registered English wins over the code fallback, so a description
    // edited in the code alone never reaches the screen. Four descriptions
    // gained a habit sentence in the visual pass; this keeps the two in step.
    const S = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.rocks;
    const S_PUB = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.rocks;
    const rows = SRC.split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l));
    expect(rows.length).toBe(23);
    rows.forEach((l) => {
      const id = /\{\s*id:\s*'(\w+)'/.exec(l)[1];
      const desc = new Function("return '" + /desc:\s*'((?:[^'\\]|\\.)*)'/.exec(l)[1] + "'")();
      expect(S['mdesc_' + id], id).toBe(desc);
      expect(S_PUB['mdesc_' + id], id).toBe(desc);
    });
  });

  it('says in words the habit the mineral picture draws, for every mineral that has one', () => {
    const rows = SRC.split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l));
    let withHabit = 0;
    rows.forEach((l) => {
      const id = /\{\s*id:\s*'(\w+)'/.exec(l)[1];
      const habit = (/habit:\s*'(\w+)'/.exec(l) || [])[1];
      const m = render({ mode: 'minerals', selectedMineral: id });
      if (habit) {
        withHabit++;
        expect(m, id).toContain('data-rk-mineral-habit="' + habit + '"');
        expect(m, id).toContain('Grows as: ');
      } else {
        expect(m, id).not.toContain('data-rk-mineral-habit');
        expect(m, id).not.toContain('Grows as: ');
      }
    });
    expect(withHabit).toBe(12);
  });

  it('calls chalk powdery, not shelly, because its fossils cannot be seen', () => {
    const m = render({ mode: 'rocks' });
    const tileText = (id) => { const at = m.indexOf('data-rk-grid-tile="' + id + '"'); return m.slice(at, m.indexOf('</button>', at)); };
    expect(tileText('chalk')).toContain('Powdery (bioclastic)');
    expect(tileText('chalk')).not.toContain('Shelly');
    expect(tileText('limestone')).toContain('Shelly (bioclastic)');
    expect(m).toContain('made of fossils too small to see');
  });
});
const count = (s, re) => (s.match(re) || []).length;

// ── Landscape labels grow with the scene ───────────────────────────────────
describe('landscape label size', () => {
  function fonts(W, H) {
    const store = { rocks: { mode: 'landscape' }, rockCycle: {} };
    const ctx = makeCtx({ toolData: store, setToolData: (f) => Object.assign(store, typeof f === 'function' ? f(store) : f) });
    const node = window.StemLab._registry.rocks.render(ctx);
    const canvas = findAll(node, (n) => n.type === 'canvas' && n.props['data-rocks-canvas'])[0];
    const ref = canvas.ref || canvas.props.ref;
    const seen = {};
    const state = { font: '' };
    const gradient = { addColorStop() {} };
    const target = {
      measureText: (t) => ({ width: String(t).length * 5 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      fillText: (t) => { seen[String(t)] = state.font; },
    };
    const c2d = new Proxy(target, {
      get(t, p) { if (p in t) return t[p]; if (p === 'roundRect') return undefined; if (typeof p !== 'string') return undefined; return () => undefined; },
      set(t, p, v) { state[p] = v; t[p] = v; return true; },
    });
    ref({
      offsetWidth: W, offsetHeight: H, width: 0, height: 0, isConnected: true, style: {}, dataset: {},
      getContext: () => c2d, addEventListener() {}, removeEventListener() {}, setAttribute() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: W, height: H }),
    });
    return seen;
  }
  const px = (font) => Number(/([\d.]+)px/.exec(font || '')[1]);

  it('draws the process labels at 9px on a phone and 12px on a wide scene', () => {
    const narrow = fonts(374, 280), wide = fonts(1148, 656);
    ['Cooling', 'Weathering & erosion', 'Melting'].forEach((t) => {
      expect(px(narrow[t]), t + ' narrow').toBeCloseTo(9, 1);
      expect(px(wide[t]), t + ' wide').toBeCloseTo(12, 1);
    });
    expect(px(wide.Igneous)).toBeGreaterThan(px(narrow.Igneous));
  });
});

// ── The quiz round: a map as you go, and a report at the end ───────────────
describe('quiz round', () => {
  const answerButtons = (t) => findAll(t.node, (n) => n.type === 'button' && typeof n.props['aria-label'] === 'string' && n.props['aria-label'].indexOf('Answer ') === 0);

  it('logs the first try, and a second go never rewrites it', () => {
    const t = tree({ mode: 'quiz', quizIdx: 3 });
    answerButtons(t)[0].props.onClick();
    expect(t.store.rocks.quizLog).toEqual({ 3: t.store.rocks.quizFeedback.correct ? 1 : 0 });
    // Find the right answer, then give it to a question already missed once.
    const n = answerButtons(tree({ mode: 'quiz', quizIdx: 3 })).length;
    let hit = null;
    for (let i = 0; i < n && !hit; i++) {
      const tt = tree({ mode: 'quiz', quizIdx: 3, quizLog: { 3: 0 } });
      answerButtons(tt)[i].props.onClick();
      if (tt.store.rocks.quizFeedback.correct) hit = tt;
    }
    expect(hit, 'no correct option found').toBeTruthy();
    expect(hit.store.rocks.quizLog).toEqual({ 3: 0 });
  });

  it('maps the round, one dot per question', () => {
    const m = render({ mode: 'quiz', quizIdx: 2, quizLog: { 0: 1, 1: 0 } });
    expect(count(m, /data-rk-quiz-dot="/g)).toBe(36);
    expect(count(m, /data-rk-quiz-dot="right"/g)).toBe(1);
    expect(count(m, /data-rk-quiz-dot="wrong"/g)).toBe(1);
    expect(m).toContain('Answered 2 of 36, 1 right on the first try.');
  });

  it('ends the round at the last question instead of wrapping round to the first', () => {
    const fb = { correct: true, chosenIdx: 0, msg: 'x', explanation: 'y' };
    const mid = tree({ mode: 'quiz', quizIdx: 10, quizFeedback: fb });
    buttonByText(mid, 'Next Question').props.onClick();
    expect(mid.store.rocks).toMatchObject({ quizIdx: 11, quizFeedback: null });
    const last = tree({ mode: 'quiz', quizIdx: 35, quizFeedback: fb });
    buttonByText(last, 'See your results').props.onClick();
    expect(last.store.rocks).toMatchObject({ quizIdx: 35, quizDone: true, quizFeedback: null });
  });

  it('reports the round by topic, weakest first, with the answers to revisit', () => {
    const log = {}; for (let i = 0; i < 36; i++) log[i] = [2, 5, 9, 14].includes(i) ? 0 : 1;
    const t = tree({ mode: 'quiz', quizIdx: 35, quizDone: true, quizLog: log });
    const m = render({ mode: 'quiz', quizIdx: 35, quizDone: true, quizLog: log });
    expect(m).toContain('data-rk-quiz-done="32/36"');
    expect(m).not.toContain('aria-label="Rock identification quiz');
    const rows = findAll(t.node, (n) => n.props && n.props['data-rk-quiz-topic'] !== undefined);
    const ratios = rows.map((r) => { const [a, b] = /(\d+) \/ (\d+)/.exec(textOf(r)).slice(1).map(Number); return a / b; });
    expect(ratios.length).toBeGreaterThanOrEqual(5);
    ratios.forEach((v, i) => { if (i) expect(v, 'row ' + i).toBeGreaterThanOrEqual(ratios[i - 1]); });
    expect(textOf(rows[0])).toContain('Practise next');
    rows.slice(1).forEach((r) => expect(textOf(r)).not.toContain('Practise next'));
    expect(count(m, /data-rk-quiz-missed="/g)).toBe(4);
    // Question 3 asks for the Mohs 5 mineral: its answer comes with its picture.
    expect(m).toContain('data-rk-quiz-answer-pic="apatite"');
  });

  it('starts a clean round', () => {
    const t = tree({ mode: 'quiz', quizIdx: 35, quizDone: true, quizLog: { 0: 1 }, quizScore: 1 });
    findAll(t.node, (n) => n.props && n.props['data-rk-quiz-again'])[0].props.onClick();
    expect(t.store.rocks).toMatchObject({ quizIdx: 0, quizScore: 0, quizLog: null, quizDone: null });
    const sw = tree({ mode: 'rocks', quizLog: { 0: 1 }, quizDone: true, quizIdx: 7 });
    findAll(sw.node, (n) => n.type === 'button' && n.props['aria-label'] === 'Switch to Quiz mode')[0].props.onClick();
    expect(sw.store.rocks).toMatchObject({ mode: 'quiz', quizIdx: 0, quizLog: null, quizDone: null });
  });

  it('survives hostile saved state', () => {
    ['x', 7, [], { 99: 1, a: 1, 0: 'yes' }, null].forEach((b) => {
      expect(() => render({ mode: 'quiz', quizIdx: 0, quizLog: b }), JSON.stringify(b)).not.toThrow();
      expect(() => render({ mode: 'quiz', quizIdx: 0, quizLog: b, quizDone: true }), JSON.stringify(b)).not.toThrow();
    });
        expect(render({ mode: 'quiz', quizIdx: 0, quizLog: { 99: 1, a: 1 }, quizDone: true })).toContain('data-rk-quiz-done="0/0"');
    // A string is not a log: its characters must not count as answered questions.
    expect(render({ mode: 'quiz', quizIdx: 0, quizLog: 'x', quizDone: true })).toContain('data-rk-quiz-done="0/0"');
  });
});

// ── The Mohs scale as a staircase with everyday references ─────────────────
describe('Mohs staircase', () => {
  const REFS = new Function('return ' + /var RK_MOHS_REFS = (\[[^;]*\]);/.exec(SRC)[1])();

  it('climbs: each step is taller than the one before', () => {
    const m = render({ mode: 'minerals' });
    const bars = [...m.matchAll(/data-mohs-bar="(\d+)"[^>]*style="height:(\d+)px/g)].map((x) => [Number(x[1]), Number(x[2])]);
    expect(bars.map((b) => b[0])).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    bars.forEach((b, i) => { if (i) expect(b[1], 'step ' + b[0]).toBeGreaterThan(bars[i - 1][1]); });
    expect(count(m, /data-mohs-step="/g)).toBe(10);
  });

  it('marks each reference at the hardness the Scratch Test Lab gives it', () => {
    expect(REFS.map((r) => r[0])).toEqual(['fingernail', 'penny', 'steel_nail', 'streak_plate']);
    // The lab's plain list (the one without emoji labels).
    const labAt = SRC.indexOf("{ id: 'fingernail', label: __alloT('stem.rocks.tool_fingernail', 'Fingernail'), h: ");
    expect(labAt).toBeGreaterThan(-1);
    const lab = SRC.slice(labAt, SRC.indexOf('].find(', labAt));
    REFS.forEach(([id, h]) => {
      const at = lab.indexOf("{ id: '" + id + "',");
      expect(at, id).toBeGreaterThan(-1);
      const row = lab.slice(at, lab.indexOf('}', at));
      expect(Number(row.slice(row.lastIndexOf('h: ') + 3)), id).toBe(h);
    });
  });

  it('draws each reference line between the two steps it separates', () => {
    const m = render({ mode: 'minerals' });
    REFS.forEach(([id, h]) => {
      const at = m.indexOf('data-mohs-ref="' + id + '"');
      expect(at, id).toBeGreaterThan(-1);
      const left = Number(/left:([\d.]+)%/.exec(m.slice(at, m.indexOf('>', at)))[1]);
      // Column n spans (n-1)*10% to n*10%; h sits on the boundary after floor(h).
      expect(left, id).toBeCloseTo((h - 0.5) * 10, 5);
      expect(left).toBeGreaterThan((Math.floor(h) - 0.5) * 10);
      expect(left).toBeLessThan((Math.ceil(h) - 0.5) * 10);
    });
    expect(m).toContain('A tool scratches every mineral to its left');
  });

  it('says which references would scratch each mineral, by the lab\'s own rule', () => {
    // Harder scratches, softer does not, equal is too close to call. Written
    // out here rather than borrowed from the tool, so a changed rule shows up.
    const rows = SRC.split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l));
    expect(rows.length).toBe(23);
    let close = 0;
    rows.forEach((l) => {
      const id = /\{\s*id:\s*'(\w+)'/.exec(l)[1];
      const hard = Number(/hardness: ([0-9.]+)/.exec(l)[1]);
      const m = render({ mode: 'minerals', selectedMineral: id });
      REFS.forEach(([ref, h]) => {
        const want = h > hard ? 'scratched' : h === hard ? 'borderline' : 'no';
        if (want === 'borderline') close++;
        expect(m, id + ' vs ' + ref).toContain('data-rk-mohs-verdict="' + ref + ':' + want + '"');
      });
    });
    // Mica, galena, halite (2.5), hematite, magnetite (5.5), pyrite, olivine (6.5).
    expect(close).toBeGreaterThanOrEqual(5);
    const quartz = render({ mode: 'minerals', selectedMineral: 'quartz' });
    expect(quartz).toContain('Streak Plate (6.5): no');
    expect(quartz).not.toContain(': yes');
  });
});

// ── "On this card": one link per section, and every link lands ─────────────
describe('rock card section links', () => {
  // Each section's own mark in the markup.
  const MARK = {
    links: 'data-rk-rock-links', lookalikes: 'data-rk-lookalikes', lens: 'data-rk-lens-panel', thin: 'polarizing microscope',
    cooling: 'data-rk-cooling-count', chart: 'data-rk-ign=', journey: 'data-rk-sed-journey', coal: 'data-rk-coal-lab',
    carb: 'data-rk-carb-lab', squeeze: 'data-rk-meta-lab', acid: 'data-rk-rock-fizz'
  };
  it('links exactly the sections each card shows, and each link lands on its section', () => {
    const seen = new Set();
    ROCK_IDS.forEach((id) => {
      const m = render({ mode: 'rocks', selectedRock: id });
      const nav = /data-rk-sec-nav="([^"]*)"/.exec(m)[1].split(' ');
      const jumps = [...m.matchAll(/data-rk-sec-jump="(\w+)"/g)].map((x) => x[1]);
      const anchors = [...m.matchAll(/data-rk-sec="(\w+)"/g)].map((x) => [x[1], x.index]);
      expect(jumps, id).toEqual(nav);
      expect(anchors.map((a) => a[0]), id).toEqual(nav);
      Object.keys(MARK).forEach((sec) => {
        const at = m.indexOf(MARK[sec], m.indexOf('data-rk-rock-card'));
        expect(at > -1, id + ': ' + sec + ' shown ' + (at > -1) + ' but linked ' + nav.includes(sec)).toBe(nav.includes(sec));
        if (!nav.includes(sec)) return;
        seen.add(sec);
        // The section sits after its own landing point and before the next one.
        const i = nav.indexOf(sec);
        expect(at, id + ': ' + sec + ' before its anchor').toBeGreaterThan(anchors[i][1]);
        if (anchors[i + 1]) expect(at, id + ': ' + sec + ' past the next anchor').toBeLessThan(anchors[i + 1][1]);
      });
    });
    // Every kind of section appears on at least one card.
    expect([...seen].sort()).toEqual(Object.keys(MARK).sort());
  });

  it('lands focus on a section, not just the scroll', () => {
    const m = render({ mode: 'rocks', selectedRock: 'coal' });
    const tag = m.slice(m.lastIndexOf('<span', m.indexOf('data-rk-sec="coal"')), m.indexOf('>', m.indexOf('data-rk-sec="coal"')));
    expect(tag).toContain('id="rk-sec-coal"');
    expect(tag).toContain('tabindex="-1"');
  });

  it('writes the tab banner upright and a size up, not in small italics', () => {
    const m = render({ mode: 'rocks' });
    const hint = m.slice(m.indexOf('Rocks: igneous, sedimentary, metamorphic'));
    const p = hint.slice(hint.indexOf('<p'), hint.indexOf('>', hint.indexOf('<p')));
    expect(p).not.toContain('italic');
    expect(p).toContain('font-size:12.5px');
  });
});

// ── Rocks are made of minerals: "Made of" and "Found in these rocks" ───────
describe('rock and mineral cards link to each other', () => {
  const tsAt = SRC.indexOf('var RK_THIN_SECTION = {');
  const TS = new Function('return ' + SRC.slice(SRC.indexOf('{', tsAt), SRC.indexOf('\n  };', tsAt) + 4))();
  // Minerals with a card: the catalogue rows (they carry a streak and a luster).
  const MIN_IDS = SRC.split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l)).map((l) => /\{\s*id:\s*'(\w+)'/.exec(l)[1]);
  const pct = (f) => Math.round(f * 100) + '%';
  // Written out here, not borrowed from the tool: biggest share first.
  const madeOf = (rock) => (TS[rock] ? TS[rock].parts.slice().sort((a, b) => b[1] - a[1]) : []);
  const foundIn = (min) => ROCK_IDS.map((r) => [r, TS[r] && TS[r].parts.find((p) => p[0] === min)]).filter((x) => x[1]).map((x) => [x[0], x[1][1]]).sort((a, b) => b[1] - a[1]);
  const chips = (m, attr) => [...m.matchAll(new RegExp(attr + '="(\\w+)"[^>]*>(.*?)</(?:button|span)>', 'g'))];

  it('lists each rock\'s minerals from its thin section, biggest share first', () => {
    expect(MIN_IDS.length).toBe(23);
    let linked = 0, plain = 0;
    ROCK_IDS.forEach((id) => {
      const m = render({ mode: 'rocks', selectedRock: id });
      const want = madeOf(id);
      if (!want.length) { expect(m, id).not.toContain('data-rk-made-of='); return; }
      const row = m.slice(m.indexOf('data-rk-made-of="' + id + '"'));
      expect(row.indexOf('Made of:'), id).toBeGreaterThan(-1);
      const got = [...row.matchAll(/data-rk-made-of-(mineral|part)="(\w+)"/g)].slice(0, want.length);
      expect(got.map((g) => g[2]), id).toEqual(want.map((p) => p[0]));
      want.forEach(([part, frac], i) => {
        // A part with a mineral card is a button to it; the rest are plain chips.
        expect(got[i][1], id + ' ' + part).toBe(MIN_IDS.includes(part) ? 'mineral' : 'part');
        if (MIN_IDS.includes(part)) linked++; else plain++;
        // The chip's visible words (tags, and so the aria-label, stripped).
        const end = Math.min(got[i + 1] ? row.lastIndexOf('<', got[i + 1].index) : Infinity, row.indexOf('</div>', got[i].index));
        const words = row.slice(row.lastIndexOf('<', got[i].index), end).replace(/<[^>]*>/g, '');
        expect(words, id + ' ' + part).toContain(' ' + pct(frac));
      });
    });
    expect(linked).toBeGreaterThan(20);
    expect(plain).toBeGreaterThan(5);
  });

  it('lists every rock a mineral is found in, and only those', () => {
    let rows = 0;
    MIN_IDS.forEach((min) => {
      const m = render({ mode: 'minerals', selectedMineral: min });
      const want = foundIn(min);
      if (!want.length) { expect(m, min).not.toContain('data-rk-found-in='); return; }
      rows++;
      expect(m, min).toContain('Found in these rocks:');
      const got = [...m.matchAll(/data-rk-found-in-rock="(\w+)"/g)].map((g) => g[1]);
      expect(got, min).toEqual(want.map((w) => w[0]));
      want.forEach(([rock, frac]) => {
        const at = m.indexOf('data-rk-found-in-rock="' + rock + '"');
        const label = /aria-label="([^"]*)"/.exec(m.slice(at, m.indexOf('>', at)))[1];
        expect(label, min + ' in ' + rock).toContain(pct(frac));
        expect(label).toContain('Open its rock card.');
      });
    });
    // Quartz, feldspar, mica, calcite, olivine, magnetite and more.
    expect(rows).toBeGreaterThanOrEqual(6);
  });

  it('agrees both ways: a rock that lists a mineral is listed back by it', () => {
    const pairs = new Set();
    ROCK_IDS.forEach((id) => {
      const m = render({ mode: 'rocks', selectedRock: id });
      [...m.matchAll(/data-rk-made-of-mineral="(\w+)"/g)].forEach((x) => pairs.add(id + '>' + x[1]));
    });
    const back = new Set();
    MIN_IDS.forEach((min) => {
      const m = render({ mode: 'minerals', selectedMineral: min });
      [...m.matchAll(/data-rk-found-in-rock="(\w+)"/g)].forEach((x) => back.add(x[1] + '>' + min));
    });
    expect([...back].sort()).toEqual([...pairs].sort());
    expect(pairs.size).toBeGreaterThan(20);
  });

  it('a mineral chip opens that mineral\'s card, and a rock chip opens the rock\'s', () => {
    vi.useFakeTimers();
    const scrolled = [];
    const qs = vi.spyOn(document, 'querySelector').mockImplementation((sel) => ({ scrollIntoView: () => scrolled.push(sel) }));
    const t = tree({ mode: 'rocks', selectedRock: 'granite' });
    const quartz = findAll(t.node, (n) => n.props && n.props['data-rk-made-of-mineral'] === 'quartz')[0];
    expect(quartz.props['aria-label']).toBe('quartz 32%. Open its mineral card.');
    quartz.props.onClick();
    expect(t.store.rocks.mode).toBe('minerals');
    expect(t.store.rocks.selectedMineral).toBe('quartz');
    expect(t.store.rocks.selectedRock).toBe(null);
    vi.advanceTimersByTime(200);
    expect(scrolled).toEqual(['[data-rk-mineral-hero]']);
    // The card it scrolls to is on the page it opens.
    expect(render(t.store.rocks)).toContain('data-rk-mineral-hero');

    const t2 = tree({ mode: 'minerals', selectedMineral: 'calcite' });
    const marble = findAll(t2.node, (n) => n.props && n.props['data-rk-found-in-rock'] === 'marble')[0];
    marble.props.onClick();
    expect(t2.store.rocks.mode).toBe('rocks');
    expect(t2.store.rocks.selectedRock).toBe('marble');
    expect(t2.store.rocks.selectedMineral).toBe(null);
    vi.advanceTimersByTime(200);
    expect(scrolled[1]).toBe('[data-rk-rock-card]');
    expect(render(t2.store.rocks)).toContain('data-rk-rock-card');
    qs.mockRestore();
  });

  it('keeps parts without a mineral card as plain words, not dead buttons', () => {
    const m = render({ mode: 'rocks', selectedRock: 'obsidian' });
    expect(chips(m, 'data-rk-made-of-part').map((c) => c[1])).toEqual(['glass']);
    expect(m).not.toContain('data-rk-made-of-mineral=');
    const at = m.indexOf('data-rk-made-of-part="glass"');
    expect(m.slice(m.lastIndexOf('<', at), at)).toContain('<span');
  });
});

// ── Mystery Rock: cross out what the clues rule out ────────────────────────
// Only the LAST wrong guess used to stay marked, so a student could guess the
// same wrong rock twice; and there was no way to rule rocks out while reading
// the clues. Now every wrong guess stays marked, any rock or a whole family
// can be crossed out, and the count says how many are still possible.
describe('Mystery Rock cross-outs', () => {
  const FAMILY = Object.fromEntries([...SRC.slice(SRC.indexOf('var RK_ROCKS = ['), SRC.indexOf('function rkRockSwatch(')).matchAll(/\{ id: '(\w+)', type: '(\w+)'/g)].map((m) => [m[1], m[2]]));
  const base = (extra) => ({ mode: 'mystery', mystery: Object.assign({ rockId: 'phyllite', clues: ['a', 'b', 'c'], cluesShown: 1, revealed: false, solved: false, offline: true }, extra) });
  const stateOf = (m, id) => (new RegExp('data-rk-mystery-state="(\\w+)"[^>]*data-rk-mystery-tile="' + id + '"').exec(m) || [])[1];
  const left = (m) => Number(/data-rk-mystery-left="(\d+)"/.exec(m)[1]);
  const byProp = (node, prop, val) => findAll(node, (n) => n.props && n.props[prop] === val)[0];

  it('groups the 24 rocks by family, each in its own section', () => {
    const m = render(base());
    const fams = [...m.matchAll(/data-rk-mystery-family="(\w+):(\d+)"/g)].map((f) => f[1] + ':' + f[2]);
    expect(fams).toEqual(['igneous:9', 'sedimentary:9', 'metamorphic:6']);
    expect(Object.values(FAMILY).filter((f) => f === 'metamorphic').length).toBe(6);
    const starts = ['igneous', 'sedimentary', 'metamorphic'].map((f) => m.indexOf('data-rk-mystery-family="' + f));
    ROCK_IDS.forEach((id) => {
      const at = m.indexOf('data-rk-mystery-tile="' + id + '"');
      const fam = ['igneous', 'sedimentary', 'metamorphic'].filter((f, i) => at > starts[i]).pop();
      expect(fam, id).toBe(FAMILY[id]);
      expect(stateOf(m, id), id).toBe('in');
    });
    expect(left(m)).toBe(24);
  });

  it('keeps every wrong guess marked, and will not take the same wrong guess twice', () => {
    const t = tree(base());
    byProp(t.node, 'data-rk-mystery-tile', 'schist').props.onClick();
    expect(t.store.rocks.mystery.wrong).toEqual(['schist']);
    const t2 = tree(t.store.rocks);
    byProp(t2.node, 'data-rk-mystery-tile', 'gneiss').props.onClick();
    expect(t2.store.rocks.mystery.wrong).toEqual(['schist', 'gneiss']);
    const shown = t2.store.rocks.mystery.cluesShown;
    const m = render(t2.store.rocks);
    ['schist', 'gneiss'].forEach((id) => {
      expect(stateOf(m, id), id).toBe('wrong');
      const at = m.indexOf('data-rk-mystery-tile="' + id + '"');
      expect(m.slice(m.lastIndexOf('<button', at), at)).toContain('disabled=""');
      expect(m.slice(at, m.indexOf('</button>', at))).toContain('✗ ');
      expect(m).not.toContain('data-rk-mystery-cross="' + id + '"');
    });
    expect(left(m)).toBe(22);
    // Guessing schist again does nothing: no new clue, no new entry.
    const t3 = tree(t2.store.rocks);
    byProp(t3.node, 'data-rk-mystery-tile', 'schist').props.onClick();
    expect(t3.store.rocks.mystery.cluesShown).toBe(shown);
    expect(t3.store.rocks.mystery.wrong).toEqual(['schist', 'gneiss']);
    // A save from before this change, with only lastGuess, still marks it.
    expect(stateOf(render(base({ lastGuess: 'slate' })), 'slate')).toBe('wrong');
  });

  it('crosses a rock out and back, and a crossed-out rock can still be guessed', () => {
    const t = tree(base());
    const cross = byProp(t.node, 'data-rk-mystery-cross', 'phyllite');
    expect(cross.props['aria-label']).toContain('Cross out');
    cross.props.onClick();
    expect(t.store.rocks.mystery.out).toEqual(['phyllite']);
    const m = render(t.store.rocks);
    expect(stateOf(m, 'phyllite')).toBe('out');
    expect(left(m)).toBe(23);
    expect(m).toMatch(/aria-pressed="true"[^>]*data-rk-mystery-cross="phyllite"/);
    // Changing your mind is allowed: guess it anyway, and it is right.
    const t2 = tree(t.store.rocks);
    byProp(t2.node, 'data-rk-mystery-tile', 'phyllite').props.onClick();
    expect(t2.store.rocks.mystery.solved).toBe(true);
    // ...or bring it back.
    const t3 = tree(t.store.rocks);
    byProp(t3.node, 'data-rk-mystery-cross', 'phyllite').props.onClick();
    expect(t3.store.rocks.mystery.out).toEqual([]);
  });

  it('crosses out a whole family at once, and brings back only that family', () => {
    const t = tree(base({ wrong: ['basalt'], out: ['slate'] }));
    byProp(t.node, 'data-rk-mystery-family-out', 'igneous').props.onClick();
    const out = t.store.rocks.mystery.out;
    expect(out.slice().sort()).toEqual(['slate'].concat(ROCK_IDS.filter((id) => FAMILY[id] === 'igneous' && id !== 'basalt')).sort());
    const m = render(t.store.rocks);
    expect(m).toContain('data-rk-mystery-family="igneous:0"');
    expect(m).toMatch(/aria-pressed="true"[^>]*data-rk-mystery-family-out="igneous"/);
    expect(left(m)).toBe(24 - 9 - 1);
    const t2 = tree(t.store.rocks);
    byProp(t2.node, 'data-rk-mystery-family-out', 'igneous').props.onClick();
    expect(t2.store.rocks.mystery.out).toEqual(['slate']);
    // The wrong guess stays wrong.
    expect(stateOf(render(t2.store.rocks), 'basalt')).toBe('wrong');
  });

  it('says so when every rock is crossed out, and can bring them all back', () => {
    const m = render(base({ out: ROCK_IDS.slice() }));
    expect(left(m)).toBe(0);
    expect(m).toContain('data-rk-mystery-none-left');
    const t = tree(base({ out: ROCK_IDS.slice() }));
    byProp(t.node, 'data-rk-mystery-clear', true).props.onClick();
    expect(t.store.rocks.mystery.out).toEqual([]);
    expect(render(base())).not.toContain('data-rk-mystery-clear');
  });

  it('starts each new mystery with nothing crossed out', () => {
    const t = tree(base({ solved: true, wrong: ['slate'], out: ['granite', 'basalt'] }));
    findAll(t.node, (n) => n.type === 'button' && typeof n.props.onClick === 'function' && textOf(n).indexOf('New Mystery') !== -1)[0].props.onClick();
    const m = render(t.store.rocks);
    expect(left(m)).toBe(24);
    expect(m).not.toContain('data-rk-mystery-state="out"');
    expect(m).not.toContain('data-rk-mystery-state="wrong"');
  });

  it('records how it was solved, without a score', () => {
    const m = render(base({ solved: true, cluesShown: 2, wrong: ['slate'] }));
    expect(m).toContain('data-rk-mystery-record="2:1"');
    expect(m).toContain('You used 2 of 3 clues · 1 wrong guess<');
    expect(render(base({ solved: true, cluesShown: 1 }))).toContain('You used 1 of 3 clues · no wrong guesses<');
    expect(render(base({ revealed: true, cluesShown: 3 }))).not.toContain('data-rk-mystery-record');
  });

  it('shrugs off a broken save', () => {
    [{ out: 'granite', wrong: 7 }, { out: [5, null, 'nope', 'granite'], wrong: ['phyllite', {}, 'slate'] }].forEach((junk) => {
      const m = render(base(junk));
      expect(m).toContain('data-rk-mystery-left=');
      // The answer is never marked wrong, whatever the save says.
      expect(stateOf(m, 'phyllite')).not.toBe('wrong');
    });
    expect(left(render(base({ out: [5, null, 'nope', 'granite'], wrong: ['phyllite', {}, 'slate'] })))).toBe(22);
  });
});

// ── Badges: how far along, and where to earn each one ──────────────────────
// The six challenge chips named goals ("Cycle Creator") with the how-to only
// in a hover title, and no progress. Each now shows n/target, and "How to earn
// them" lists every goal with where to do it and a button that goes there.
describe('badge progress and where to earn it', () => {
  // The tool's own table code, run as written (helpers, table, check rebuild).
  const tableSrc = SRC.slice(SRC.indexOf('  var rkChKeys = function'), SRC.indexOf('\n', SRC.indexOf('  ROCKS_CHALLENGES.forEach(function (ch) { ch.check')) + 1);
  const TABLE = new Function(tableSrc + '; return ROCKS_CHALLENGES;')();
  const byId = Object.fromEntries(TABLE.map((c) => [c.id, c]));
  // A state that sits at n for every badge.
  const at = (n) => ({
    typesViewed: Object.fromEntries(['igneous', 'sedimentary', 'metamorphic'].slice(0, n).map((k) => [k, true])),
    rocksViewed: Object.fromEntries(ROCK_IDS.slice(0, n).map((k) => [k, true])),
    quizScore: n, vocabLookedUp: ['a', 'b', 'c'].slice(0, n), wb: { solved: n }, cycleInteractions: n,
  });

  it('awards each badge exactly at its target, from the same count it shows', () => {
    expect(TABLE.map((c) => c.id)).toEqual(['types_explored', 'specimens_examined', 'quiz_ace', 'vocab_studied', 'wb_identify', 'cycle_interact']);
    expect(TABLE.map((c) => c.target)).toEqual([3, 5, 3, 3, 2, 3]);
    TABLE.forEach((c) => {
      expect(c.check(at(c.target - 1)), c.id + ' below target').toBe(false);
      expect(c.check(at(c.target)), c.id + ' at target').toBe(true);
      expect(c.count(at(c.target - 1)), c.id).toBe(c.target - 1);
    });
    // Junk in a save counts as nothing (a string used to count its letters).
    const junk = { typesViewed: 'abc', rocksViewed: ['a', 'b', 'c', 'd', 'e'], quizScore: '9', vocabLookedUp: 'abcd', wb: 'x', cycleInteractions: NaN };
    TABLE.forEach((c) => { expect(c.count(junk), c.id).toBe(0); expect(c.check(junk)).toBe(false); });
    expect(TABLE.map((c) => c.go)).toEqual(['rocks', 'rocks', 'quiz', 'quiz', 'workbench', 'rockCycle']);
  });

  it('shows n/target on every badge not yet earned', () => {
    const m = render(Object.assign({ mode: 'rocks', completedChallenges: ['wb_identify'] }, at(1)));
    const prog = [...m.matchAll(/data-rk-challenge="(\w+)"[^>]*>.*?(?:data-rk-challenge-progress="([\d/]+)"|<\/li>)/g)].map((x) => x[1] + ':' + (x[2] || '-'));
    expect(prog).toEqual(['types_explored:1/3', 'specimens_examined:1/5', 'quiz_ace:1/3', 'vocab_studied:1/3', 'wb_identify:-', 'cycle_interact:1/3']);
  });

  it('lists how to earn each one, with a way there, once opened', () => {
    const closed = render({ mode: 'rocks' });
    expect(closed).toMatch(/aria-expanded="false"[^>]*data-rk-challenge-help-toggle/);
    expect(closed).not.toContain('data-rk-challenge-row');
    const t = tree({ mode: 'rocks' });
    findAll(t.node, (n) => n.props && n.props['data-rk-challenge-help-toggle'])[0].props.onClick();
    expect(t.store.rocks.chHelp).toBe(true);
    const m = render(Object.assign({ mode: 'rocks', chHelp: true, completedChallenges: ['wb_identify'] }, at(2)));
    const rows = [...m.matchAll(/data-rk-challenge-row="([\w:/]+)"/g)].map((x) => x[1]);
    expect(rows).toEqual(['types_explored:2/3', 'specimens_examined:2/5', 'quiz_ace:2/3', 'vocab_studied:2/3', 'wb_identify:done', 'cycle_interact:2/3']);
    TABLE.forEach((c) => expect(m, c.id).toContain(c.where));
    // Already on the Rocks tab: those two say so instead of offering to go.
    const gos = [...m.matchAll(/data-rk-challenge-go="(\w+)"/g)].map((x) => x[1]);
    expect(gos).toEqual(['quiz', 'quiz', 'rockCycle']);
    expect(count(m, /data-rk-challenge-here/g)).toBe(2);
    // Past the target but not yet recorded as earned: never "7 of 3".
    const over = render({ mode: 'rocks', chHelp: true, quizScore: 7 });
    expect(over).toContain('data-rk-challenge-row="quiz_ace:3/3"');
    expect(over).toContain('data-rk-challenge-progress="3/3"');
    const helpList = over.slice(over.indexOf('data-rk-challenge-help='), over.indexOf('</ul>', over.indexOf('data-rk-challenge-help=')));
    expect(helpList).toContain('width:100%');
    expect(helpList).not.toMatch(/width:(10[1-9]|1[1-9][0-9]|[2-9][0-9]{2})(\.\d+)?%/);
  });

  it('takes the student where each badge is earned', () => {
    const go = (id, extra) => {
      const store = { rocks: Object.assign({ mode: 'rocks', chHelp: true }, extra), rockCycle: {} };
      const setStemLabTool = vi.fn();
      const ctx = makeCtx({ toolData: store, setToolData: (f) => { Object.assign(store, typeof f === 'function' ? f(store) : f); }, setStemLabTool });
      const node = window.StemLab._registry.rocks.render(ctx);
      const row = findAll(node, (n) => n.props && typeof n.props['data-rk-challenge-row'] === 'string' && n.props['data-rk-challenge-row'].indexOf(id + ':') === 0)[0];
      findAll(row, (n) => n.props && n.props['data-rk-challenge-go'])[0].props.onClick();
      return { store, setStemLabTool };
    };
    const q = go('quiz_ace', { quizScore: 2, quizIdx: 7 });
    // Like the Quiz tab button: a fresh round.
    expect(q.store.rocks).toMatchObject({ mode: 'quiz', quizScore: 0, quizIdx: 0 });
    expect(go('wb_identify').store.rocks.mode).toBe('workbench');
    const c = go('cycle_interact');
    expect(c.setStemLabTool).toHaveBeenCalledWith('rockCycle');
    expect(c.store.rocks.mode).toBe('rocks');
    expect(go('types_explored', { mode: 'minerals' }).store.rocks.mode).toBe('rocks');
  });

  it('shrugs off a broken save', () => {
    const m = render({ mode: 'rocks', chHelp: true, completedChallenges: 'all', typesViewed: 'abc', vocabLookedUp: 'abcd', quizScore: '9', wb: 5 });
    expect([...m.matchAll(/data-rk-challenge-row="([\w:/]+)"/g)].map((x) => x[1].split(':')[1])).toEqual(['0/3', '0/5', '0/3', '0/3', '0/2', '0/3']);
  });
});

// ── Mineral look-alikes: the test that tells two similar minerals apart ─────
// Rock cards had look-alikes and mineral cards none. Each pair's table is
// computed from the two minerals' data; here it is re-derived independently,
// and each quick-test sentence is checked against it.
describe('mineral look-alikes', () => {
  const lit = (marker, open, close) => {
    const at = SRC.indexOf(marker), st = SRC.indexOf(open, at);
    let depth = 0, q = null;
    for (let i = st; i < SRC.length; i++) {
      const c = SRC[i];
      if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; continue; }
      if (c === open) depth++;
      else if (c === close && --depth === 0) return new Function('return (' + SRC.slice(st, i + 1) + ')')();
    }
    throw new Error('unbalanced ' + marker);
  };
  const PAIRS = lit('var RK_MIN_LOOKALIKES = [', '[', ']');
  const CLEAVE = lit('var RK_CLEAVAGE = {', '{', '}');
  const CARB = lit('var RK_CARBONATE_IDS = [', '[', ']');
  const HEX = lit('var RK_STREAK_HEX = {', '{', '}');
  const M = Object.fromEntries(SRC.split('\n').filter((l) => /\{\s*id:\s*'/.test(l) && /streak:/.test(l) && /luster:/.test(l)).map((l) => {
    const g = (k) => { const x = new RegExp(k + ":\\s*('([^']*)'|[0-9.]+)").exec(l); return x[2] != null ? x[2] : Number(x[1]); };
    return [g('id'), { h: g('hardness'), streak: g('streak'), d: g('density') }];
  }));
  // Written out from the spec, not borrowed from the tool.
  const table = (a, b) => ({
    hardness: Math.abs(M[a].h - M[b].h) >= 1,
    streak: (HEX[M[a].streak] || M[a].streak.toLowerCase()) !== (HEX[M[b].streak] || M[b].streak.toLowerCase()),
    acid: CARB.includes(a) !== CARB.includes(b),
    magnet: (a === 'magnetite') !== (b === 'magnetite'),
    heft: Math.abs(M[a].d - M[b].d) >= 0.8,
    cleavage: (CLEAVE[a] || 'none') !== (CLEAVE[b] || 'none'),
  });
  const rowsOf = (m) => Object.fromEntries([...m.matchAll(/data-rk-min-look-row="(\w+):(yes|no)"/g)].map((r) => [r[1], r[2] === 'yes']));

  it('lists each pair once, between two catalogue minerals', () => {
    expect(PAIRS.length).toBe(14);
    const seen = new Set();
    PAIRS.forEach(([a, b, text]) => {
      expect(M[a], a).toBeTruthy();
      expect(M[b], b).toBeTruthy();
      expect(a).not.toBe(b);
      const k = [a, b].sort().join('|');
      expect(seen.has(k), k).toBe(false);
      seen.add(k);
      expect(text.length).toBeGreaterThan(40);
    });
  });

  it('computes every table from the two minerals\' data, on both cards', () => {
    PAIRS.forEach(([a, b]) => {
      [[a, b], [b, a]].forEach(([x, y]) => {
        const m = render({ mode: 'minerals', selectedMineral: x, minLook: y });
        expect(m, x + ' vs ' + y).toContain('data-rk-min-look-pair="' + x + ':' + y + ':');
        expect(rowsOf(m), x + ' vs ' + y).toEqual(table(x, y));
        const splits = Object.values(table(x, y)).filter(Boolean).length;
        expect(m).toContain('data-rk-min-look-pair="' + x + ':' + y + ':' + splits + '"');
      });
    });
  });

  it('registers every quick test for translation, with the same English', () => {
    // The key is built from the pair, so the i18n gate sees only its prefix.
    const S = JSON.parse(readFileSync('ui_strings.js', 'utf8')).stem.rocks;
    const P = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8')).stem.rocks;
    PAIRS.forEach(([a, b, text]) => {
      expect(S['minlook_' + a + '_' + b], a + '_' + b).toBe(text);
      expect(P['minlook_' + a + '_' + b], 'public ' + a + '_' + b).toBe(text);
    });
    expect(Object.keys(S).filter((k) => k.indexOf('minlook_') === 0).length).toBe(PAIRS.length);
  });

  it('never lists a pair that no test can separate', () => {
    PAIRS.forEach(([a, b]) => expect(Object.values(table(a, b)).some(Boolean), a + ' vs ' + b).toBe(true));
  });

  it('never makes a claim in the quick test that the data does not back', () => {
    PAIRS.forEach(([a, b, text]) => {
      const t = table(a, b), who = a + ' vs ' + b;
      if (/scratch/.test(text)) expect(t.hardness, who + ': scratch').toBe(true);
      if (/magnet/.test(text)) expect(t.magnet, who + ': magnet').toBe(true);
      if (/heavier/.test(text)) expect(t.heft, who + ': heavier').toBe(true);
      if (/splits/.test(text)) expect(t.cleavage, who + ': splits').toBe(true);
      if (/streak/.test(text)) expect(t.streak, who + ': streak').toBe(true);
      if (/fizz/.test(text) && !/[Bb]oth[^.]*fizz/.test(text)) expect(t.acid, who + ': fizz').toBe(true);
      if (/[Bb]oth[^.]*fizz/.test(text)) expect(t.acid, who + ': both fizz').toBe(false);
    });
  });

  it('names the scratch test the numbers allow', () => {
    const hard = (x, y) => { const m = render({ mode: 'minerals', selectedMineral: x, minLook: y }); const at = m.indexOf('data-rk-min-look-hard'); return m.slice(m.indexOf('>', at) + 1, m.indexOf('</p>', at)).replace(/<[^>]*>/g, ''); };
    // The reference nearest the middle of the gap.
    expect(hard('quartz', 'calcite')).toMatch(/^Scratch test: Glass reference \(modeled\) \(5\.5\) scratches .*calcite but not .*quartz\.$/);
    expect(hard('calcite', 'gypsum')).toMatch(/Fingernail \(2\.5\) scratches .*gypsum but not .*calcite\./);
    expect(hard('galena', 'magnetite')).toMatch(/Copper reference \(modeled\) \(3\.5\) scratches .*galena but not .*magnetite\./);
    // No reference between them: rub one against the other.
    expect(hard('talc', 'gypsum')).toMatch(/gypsum scratches .*talc \(rub one against the other\)\./);
    expect(hard('magnetite', 'hematite')).toContain('too close to tell apart by scratching');
  });

  it('switches look-alike, and opens the other card with this one picked', () => {
    const m = render({ mode: 'minerals', selectedMineral: 'quartz' });
    expect([...m.matchAll(/data-rk-min-look="(\w+)"/g)].map((x) => x[1])).toEqual(['calcite', 'fluorite', 'feldspar', 'topaz', 'diamond']);
    expect(m).toContain('data-rk-min-look-pair="quartz:calcite:');
    const t = tree({ mode: 'minerals', selectedMineral: 'quartz' });
    findAll(t.node, (n) => n.props && n.props['data-rk-min-look'] === 'topaz')[0].props.onClick();
    expect(t.store.rocks.minLook).toBe('topaz');
    const t2 = tree({ mode: 'minerals', selectedMineral: 'quartz', minLook: 'topaz' });
    findAll(t2.node, (n) => n.props && n.props['data-rk-min-look-open'] === 'topaz')[0].props.onClick();
    expect(t2.store.rocks).toMatchObject({ selectedMineral: 'topaz', minLook: 'quartz' });
    expect(render(t2.store.rocks)).toContain('data-rk-min-look-pair="topaz:quartz:');
  });

  it('falls back to the first look-alike on junk, and shows nothing where there is none', () => {
    ['nope', 7, 'galena'].forEach((bad) => expect(render({ mode: 'minerals', selectedMineral: 'quartz', minLook: bad })).toContain('data-rk-min-look-pair="quartz:calcite:'));
    const none = Object.keys(M).filter((id) => !PAIRS.some((p) => p[0] === id || p[1] === id));
    // Mica and biotite differ only by colour, which no table test can show.
    expect(none).toEqual(['mica', 'biotite', 'garnet', 'corundum']);
    none.forEach((id) => expect(render({ mode: 'minerals', selectedMineral: id }), id).not.toContain('data-rk-min-lookalikes'));
    // The Workbench reads the same magnetic list.
    expect(SRC).toContain('var WB_MAGNETIC = RK_MAGNETIC_IDS;');
  });
});
