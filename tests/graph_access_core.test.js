// The shared accessible-graph core (window.StemLab._graphAccess), carried as an
// identical block in the Graphing Calculator and the Function Grapher. Pins the
// byte-identity of both copies and unit-tests the pure functions against
// features computed independently (x^2 - 4, sin x on [-2π, 2π], 1/x, ...).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const GC = 'stem_lab/stem_tool_graphcalc.js';
const FG = 'stem_lab/stem_tool_funcgrapher.js';
const START = '  // == alloGraphAccess core v2 (keep byte-identical in graphcalc + funcgrapher) ==';
const END = '  // == end alloGraphAccess core v2 ==';

function block(file) {
  const src = fs.readFileSync(file, 'utf8');
  const a = src.indexOf(START);
  const b = src.indexOf(END, a);
  expect(a, file + ' start marker').toBeGreaterThan(-1);
  expect(src.indexOf(START, a + 1), file + ' one start marker').toBe(-1);
  expect(b, file + ' end marker').toBeGreaterThan(a);
  return src.slice(a, b + END.length);
}
function install() {
  window.StemLab = { tools: {} };
  new Function(block(GC))(); // eslint-disable-line no-new-func
  return window.StemLab._graphAccess;
}
const t = (k, fb) => fb;
const PI = Math.PI;
let GA;
beforeEach(() => { GA = install(); delete window._alloGlobalMute; });
afterEach(() => { vi.useRealTimers(); delete window.AudioContext; delete window._alloGlobalMute; });

describe('one core, two copies', () => {
  it('the block is byte-identical in both tools', () => {
    expect(block(FG)).toBe(block(GC));
  });

  it('installs once: the first copy loaded wins', () => {
    const first = window.StemLab._graphAccess;
    new Function(block(FG))(); // eslint-disable-line no-new-func
    expect(window.StemLab._graphAccess).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('translates every string through t() with literal stem.graph_access keys and never touches toolData', () => {
    const src = block(GC);
    const keys = [...src.matchAll(/__alloT\('([^']+)'/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(50);
    for (const k of keys) expect(k).toMatch(/^stem\.graph_access\.[a-z_]+$/);
    expect(src).not.toMatch(/setToolData|setLabToolData|\.toolData|localStorage/);
    const seen = [];
    const text = GA.describeGraph(GA.sample((x) => x * x - 4, -10, 10), { t: (k, fb) => { seen.push(k); return '<' + k + '>'; }, name: 'f' }).text;
    expect(text).toContain('<stem.graph_access.zeros_list>');
    expect(seen.every((k) => k.startsWith('stem.graph_access.'))).toBe(true);
  });
});

describe('describeGraph matches independently computed features', () => {
  const feats = (f, x0, x1, y0, y1, extra) => GA.describeGraph(GA.sample(f, x0, x1, 201), Object.assign({ t, evaluate: f, ymin: y0, ymax: y1 }, extra || {}));

  it('x^2 - 4: zeros ±2, minimum (0, -4), y-intercept -4, decreasing then increasing', () => {
    const d = feats((x) => x * x - 4, -10, 10, -10, 10, { name: 'x^2 - 4' });
    expect(d.features.zeros.map((z) => z.x)).toEqual([-2, 2]);
    expect(d.features.zeros.map((z) => z.kind)).toEqual(['cross', 'cross']);
    expect(d.features.extrema).toEqual([{ x: 0, y: -4, kind: 'min' }]);
    expect(d.features.yIntercept).toEqual({ x: 0, y: -4 });
    expect(d.features.intervals).toEqual([{ from: -10, to: 0, dir: 'decreasing' }, { from: 0, to: 10, dir: 'increasing' }]);
    expect(d.features.gaps).toEqual([]);
    expect(d.text).toContain('Graph of x^2 - 4.');
    expect(d.text).toContain('It meets the x-axis at x = −2 and x = 2.');
    expect(d.text).toContain('It has a local minimum at (0, −4).');
    expect(d.text).toContain('As x moves left, y increases past the top of the window.');
    expect(d.short).not.toContain('Window:');
  });

  it('sin x on [-2π, 2π]: five zeros at multiples of π, alternating turning points', () => {
    const d = feats(Math.sin, -2 * PI, 2 * PI, -2, 2);
    const zeros = d.features.zeros.map((z) => z.x);
    expect(zeros.length).toBe(5);
    [-2 * PI, -PI, 0, PI, 2 * PI].forEach((z, i) => expect(zeros[i]).toBeCloseTo(z, 6));
    const ex = d.features.extrema;
    expect(ex.map((e) => e.kind)).toEqual(['max', 'min', 'max', 'min']);
    [-1.5 * PI, -0.5 * PI, 0.5 * PI, 1.5 * PI].forEach((x, i) => expect(ex[i].x).toBeCloseTo(x, 5));
    ex.forEach((e) => expect(Math.abs(e.y)).toBeCloseTo(1, 9));
    expect(d.text).toMatch(/rises and falls repeatedly, with 4 turning points/);
    expect(d.text).toContain('x = −6.28, x = −3.14, x = 0, x = 3.14 and x = 6.28');
  });

  it('1/x: a break at 0, no zeros, no y-intercept, levels off toward 0 at both edges', () => {
    const d = feats((x) => 1 / x, -10, 10, -10, 10);
    expect(d.features.gaps).toEqual([{ kind: 'break', x: 0 }]);
    expect(d.features.zeros).toEqual([]);
    expect(d.features.yIntercept).toEqual({ x: 0, y: null });
    expect(d.features.ends.left.trend).toBe('levels');
    expect(d.text).toContain('The graph breaks at x = 0.');
    expect(d.text).toContain('undefined at x = 0, so there is no y-intercept');
  });

  it('tan x: a break at each odd multiple of π/2, found between samples', () => {
    const d = feats(Math.tan, -5, 5, -10, 10);
    const breaks = d.features.gaps.filter((g) => g.kind === 'break').map((g) => g.x);
    expect(breaks.length).toBe(4);
    [-1.5 * PI, -0.5 * PI, 0.5 * PI, 1.5 * PI].forEach((x, i) => expect(breaks[i]).toBeCloseTo(x, 5));
    expect(d.features.zeros.map((z) => z.x).map((x) => Number(x.toFixed(6)))).toEqual([Number((-PI).toFixed(6)), 0, Number(PI.toFixed(6))]);
  });

  it('a steep but continuous curve is not split: e^x levels off on the left, leaves the top on the right', () => {
    const d = feats(Math.exp, -10, 10, -10, 10);
    expect(d.features.runs.length).toBe(1);
    expect(d.features.ends.left).toEqual({ trend: 'levels', y: expect.any(Number) });
    expect(d.features.ends.right.trend).toBe('past_top');
    expect(d.features.yIntercept.y).toBe(1);
  });

  it('sqrt(x + 1): no graph left of -1, starts at (-1, 0); |x| touches at 0', () => {
    const d = feats((x) => Math.sqrt(x + 1), -10, 10, -10, 10);
    expect(d.features.gaps).toEqual([{ kind: 'left', x: -1 }]);
    expect(d.points.find((p) => p.kind === 'start')).toEqual({ x: -1, y: 0, kind: 'start' });
    const abs = feats(Math.abs, -10, 10, -10, 10);
    expect(abs.features.zeros).toEqual([{ x: 0, y: 0, kind: 'touch' }]);
    expect(abs.text).toContain('x = 0 (touching, not crossing)');
  });

  it('uses zeros from a better root finder when given, and hides answers on request', () => {
    const f = (x) => x * x - 2 * x;
    const d = feats(f, -10, 10, -10, 10, { zeros: [0, 2], hide: { zeros: true } });
    expect(d.text).not.toMatch(/x = 2[^0-9]/);
    expect(d.text).toContain('Explore with keys to find where it meets the x-axis.');
    expect(d.points.some((p) => p.kind === 'zero')).toBe(false);
    // y-intercept 0 would give the root at 0 away, so it is withheld too
    expect(d.points.some((p) => p.kind === 'yint')).toBe(false);
    const y = feats((x) => x * x + 3, -10, 10, -10, 10, { hide: { yIntercept: true } });
    expect(y.text).not.toContain('y = 3');
    expect(y.points.some((p) => p.x === 0)).toBe(false);
  });

  it('the zero function lies along the axis instead of listing 201 zeros', () => {
    const d = feats(() => 0, -10, 10, -10, 10);
    expect(d.text).toContain('It lies along the x-axis across this window.');
    expect(d.features.zeros).toEqual([]);
  });
});

describe('keyboard stepping', () => {
  const f = (x) => x * x - 4;
  const samples = () => GA.sample(f, -10, 10, 201);
  const pts = () => GA.explorePoints(samples(), GA.describeGraph(samples(), { t, evaluate: f }), t);

  it('merges exact feature points into the sample list in x order', () => {
    const p = pts();
    const feats = p.filter((q) => q.feature);
    expect(feats.map((q) => GA.pointText(q, t))).toEqual(['x = −2, y = 0: meets the x-axis', 'x = 0, y = −4: y-intercept, local minimum', 'x = 2, y = 0: meets the x-axis']);
    for (let i = 1; i < p.length; i++) expect(p[i].x).toBeGreaterThan(p[i - 1].x);
  });

  it('Left/Right step, Page Down/Up jump features, Home/End go to the edges', () => {
    const p = pts();
    let r = GA.stepIndex(p, -1, 'PageDown');
    expect(p[r.index].kind).toBe('zero');
    r = GA.stepIndex(p, r.index, 'PageDown');
    expect(p[r.index].x).toBe(0);
    r = GA.stepIndex(p, r.index, 'PageUp');
    expect(p[r.index].x).toBe(-2);
    expect(GA.stepIndex(p, r.index, 'ArrowRight').index).toBe(r.index + 1);
    expect(GA.stepIndex(p, 0, 'ArrowLeft')).toMatchObject({ index: 0, edge: true });
    expect(GA.stepIndex(p, 5, 'Home').index).toBe(0);
    expect(GA.stepIndex(p, 5, 'End').index).toBe(p.length - 1);
    expect(GA.stepIndex(p, p.length - 1, 'PageDown')).toMatchObject({ none: true });
    expect(GA.stepIndex(p, 5, 'Tab').handled).toBe(false);
  });

  it('announces through the given function, throttled: a burst of keys speaks once more, with the last point', () => {
    vi.useFakeTimers();
    const said = [];
    const p = pts();
    let index = -1;
    const ev = (key) => ({ key, preventDefault: vi.fn() });
    const e1 = ev('ArrowRight');
    expect(GA.stepperKeyDown(e1, { points: p, index, t, announce: (s) => said.push(s), onMove: (i) => { index = i; } })).toBe(true);
    expect(e1.preventDefault).toHaveBeenCalled();
    expect(said).toEqual(['x = −10, y = 96']);
    for (let k = 0; k < 5; k++) GA.stepperKeyDown(ev('ArrowRight'), { points: p, index, t, announce: (s) => said.push(s), onMove: (i) => { index = i; } });
    expect(said.length).toBe(1);
    vi.advanceTimersByTime(200);
    expect(said).toEqual(['x = −10, y = 96', GA.pointText(p[5], t)]);
    expect(GA.stepperKeyDown(ev('a'), { points: p, index, t, announce: () => {} })).toBe(false);
  });
});

describe('sonifyPlan', () => {
  it('pitch follows y on 220-880 Hz, pan follows x, a click at each crossing', () => {
    const f = (x) => x * x - 4;
    const plan = GA.sonifyPlan(GA.sample(f, -10, 10, 201), { evaluate: f, ymin: -10, ymax: 10 });
    expect(plan.duration).toBe(4);
    expect(plan.segments.length).toBe(1);
    const seg = plan.segments[0];
    expect(seg[0].pan).toBeCloseTo(-0.8, 9);
    expect(seg[seg.length - 1].pan).toBeCloseTo(0.8, 9);
    expect(seg[0].freq).toBeCloseTo(880, 6); // y = 96 is above the window: clamped to the top pitch
    const bottom = seg.find((s) => s.x === 0);
    expect(bottom.freq).toBeCloseTo(220 * Math.pow(4, 6 / 20), 6); // y = -4 is 30% up the window
    expect(plan.cues.map((c) => c.x)).toEqual([-2, 2]);
    expect(plan.cues[0].t).toBeCloseTo(0.8 * 4 / 2, 9);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it('is silent over gaps: 1/x has two segments, sqrt(x + 1) is silent for x < -1', () => {
    const r = GA.sonifyPlan(GA.sample((x) => 1 / x, -10, 10, 201), { evaluate: (x) => 1 / x, ymin: -10, ymax: 10 });
    expect(r.segments.length).toBe(2);
    expect(r.cues).toEqual([]);
    const s = GA.sonifyPlan(GA.sample((x) => Math.sqrt(x + 1), -10, 10, 201), { evaluate: (x) => Math.sqrt(x + 1) });
    expect(s.segments.length).toBe(1);
    expect(s.segments[0][0].x).toBeCloseTo(-1, 9);
    expect(s.silentFraction).toBeCloseTo(0.45, 2);
    expect(GA.sonifyPlan([{ x: 0, y: null }, { x: 1, y: null }])).toBeNull();
    expect(GA.sonifyPlan([])).toBeNull();
  });
});

describe('playPlan', () => {
  function param() { return { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() }; }
  function fakeContext() {
    const ac = { currentTime: 0, state: 'running', destination: {}, oscillators: [] };
    ac.createOscillator = () => { const o = { frequency: param(), connect() {}, disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() }; ac.oscillators.push(o); return o; };
    ac.createGain = () => ({ gain: param(), connect() {} });
    ac.createStereoPanner = () => ({ pan: param(), connect() {} });
    return ac;
  }
  const plan = () => GA.sonifyPlan(GA.sample((x) => x * x - 4, -10, 10, 201), { ymin: -10, ymax: 10 });

  it('uses the host StemLab.audioContext when present, plays segments and clicks, and stops on request', () => {
    const ac = fakeContext();
    window.StemLab.audioContext = vi.fn(() => ac);
    window.AudioContext = vi.fn();
    const onEnd = vi.fn();
    const handle = GA.playPlan(plan(), { key: 'k', onEnd });
    expect(window.StemLab.audioContext).toHaveBeenCalled();
    expect(window.AudioContext).not.toHaveBeenCalled();
    expect(ac.oscillators.length).toBe(3);
    expect(GA.isPlaying('k')).toBe(true);
    expect(GA.isPlaying('other')).toBe(false);
    GA.stop();
    expect(GA.isPlaying()).toBe(false);
    expect(ac.oscillators.every((o) => o.stop.mock.calls.length >= 2)).toBe(true);
    expect(onEnd).toHaveBeenCalledTimes(1);
    handle.stop();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('creates its own context lazily, once, and plays nothing when muted', () => {
    let made = 0;
    window.AudioContext = function () { made++; return fakeContext(); };
    expect(made).toBe(0);
    window._alloGlobalMute = true;
    expect(GA.playPlan(plan(), {})).toBeNull();
    expect(made).toBe(0);
    delete window._alloGlobalMute;
    expect(GA.playPlan(plan(), { muted: true })).toBeNull();
    GA.playPlan(plan(), {}); GA.playPlan(plan(), {});
    expect(made).toBe(1);
    GA.stop();
  });

  it('ends by itself after the sweep', () => {
    vi.useFakeTimers();
    window.StemLab.audioContext = () => fakeContext();
    const onEnd = vi.fn();
    GA.playPlan(plan(), { key: 'auto', onEnd });
    vi.advanceTimersByTime(4300);
    expect(onEnd).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(GA.isPlaying()).toBe(false);
  });
});

describe('differencesTable', () => {
  const rows = (f, xs) => xs.map((x) => ({ x, y: f(x) }));
  it('linear: constant first differences', () => {
    const d = GA.differencesTable(rows((x) => 3 * x + 2, [0, 1, 2, 3, 4]));
    expect(d.rows.map((r) => r.dy)).toEqual([null, 3, 3, 3, 3]);
    expect(d.pattern).toBe('linear');
    expect(d.difference).toBe(3);
    expect(GA.differencesSummary(d, t)).toContain('adds the same amount (3)');
  });
  it('exponential: constant ratios y(n+1)/y(n)', () => {
    const d = GA.differencesTable(rows((x) => 2 * Math.pow(2, x), [0, 1, 2, 3]));
    expect(d.rows.map((r) => r.ratio)).toEqual([null, 2, 2, 2]);
    expect(d.pattern).toBe('exponential');
    const decay = GA.differencesTable(rows((x) => 16 * Math.pow(0.5, x), [0, 1, 2, 3, 4]));
    expect(decay.ratio).toBe(0.5);
  });
  it('quadratic, constant, unequal steps, undefined values and short tables', () => {
    expect(GA.differencesTable(rows((x) => x * x, [0, 1, 2, 3, 4])).pattern).toBe('quadratic');
    expect(GA.differencesTable(rows(() => 5, [0, 1, 2])).pattern).toBe('constant');
    expect(GA.differencesTable(rows((x) => x, [0, 1, 3])).pattern).toBe('unequal');
    expect(GA.differencesTable(rows((x) => x, [0, 1])).pattern).toBe('short');
    const gap = GA.differencesTable([{ x: 0, y: 1 }, { x: 1, y: null }, { x: 2, y: 3 }]);
    expect(gap.rows.map((r) => r.dy)).toEqual([null, null, null]);
    expect(gap.pattern).toBe('neither');
    expect(GA.differencesTable([{ x: 0, y: 0 }, { x: 1, y: 2 }]).rows[1].ratio).toBeNull();
  });
});

describe('matchFamily', () => {
  const cases = [
    ['2x + 3', (x) => 2 * x + 3, { type: 'linear', a: 2, b: 3, c: 0 }],
    ['x^2 - 4', (x) => x * x - 4, { type: 'quadratic', a: 1, b: 0, c: -4 }],
    ['x^3 - x', (x) => x ** 3 - x, { type: 'cubic', a: 1, b: -1, c: 0 }],
    ['sin x', Math.sin, { type: 'trig', a: 1, b: 1, c: 0 }],
    ['-sin x', (x) => -Math.sin(x), { type: 'trig', a: -1, b: 1, c: 0 }],
    ['2 sin(3x + 1)', (x) => 2 * Math.sin(3 * x + 1), { type: 'trig', a: 2, b: 3, c: 1 }],
    ['e^x', Math.exp, { type: 'exponential', a: 1, b: 1, c: 0 }],
    ['|x + 1| + 2', (x) => Math.abs(x + 1) + 2, { type: 'absolute', a: 1, b: 1, c: 2 }],
    ['sqrt(x + 2)', (x) => Math.sqrt(x + 2), { type: 'sqrt', a: 1, b: 2, c: 0 }],
    ['ln(x + 1)', (x) => Math.log(x + 1), { type: 'log', a: 1, b: 1, c: 0 }],
    ['1/(x - 1)', (x) => 1 / (x - 1), { type: 'rational', a: 1, b: -1, c: 0 }]
  ];
  for (const [name, f, want] of cases) it(name, () => expect(GA.matchFamily(f)).toEqual(want));
  it('returns null when no slider setting reproduces the curve exactly', () => {
    expect(GA.matchFamily((x) => x ** 4)).toBeNull();
    expect(GA.matchFamily(Math.cos)).toBeNull(); // phase π/2 is off the 0.1 slider grid
    expect(GA.matchFamily((x) => Math.pow(2, x))).toBeNull();
    expect(GA.matchFamily((x) => 7 * x)).toBeNull(); // a = 7 is outside the -5..5 slider
    expect(GA.matchFamily(() => NaN)).toBeNull();
  });
});

describe('low-vision helpers', () => {
  it('palettes give six distinct colour + dash pairs per theme', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const p = GA.palette(theme);
      const pairs = [0, 1, 2, 3, 4, 5].map((i) => JSON.stringify(p.curve(i)));
      expect(new Set(pairs).size).toBe(6);
      expect(new Set([0, 1, 2, 3, 4, 5].map((i) => p.curve(i).color)).size).toBe(6);
      expect(new Set([0, 1, 2, 3, 4, 5].map((i) => JSON.stringify(p.curve(i).dash))).size).toBe(6);
    }
    expect(GA.palette('light').bg).toBe('#ffffff');
    expect(GA.palette('dark').bg).toBe('#0f172a');
    expect(GA.palette('contrast').bg).toBe('#000000');
    expect(GA.palette('nonsense').theme).toBe('light');
  });
  it('niceStep keeps labels apart on a 1-2-5 ladder', () => {
    expect(GA.niceStep(20, 600, 56)).toBe(2);
    expect(GA.niceStep(20, 320, 56)).toBe(5);
    expect(GA.niceStep(12.56, 600, 56)).toBe(2);
    expect(GA.niceStep(0, 600, 56)).toBe(1);
  });
});
