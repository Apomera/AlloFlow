import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawPhysicsElementTree } from './helpers/physics_element_tree.js';

// Range explorer: the range-angle sweep, the gravity fit, and the
// predict-before-reveal panel that presents them.
let P;
beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});
beforeEach(() => { document.getElementById('physicsCanvas')?.remove(); });

function render(physics = {}, gradeLevel = '10th Grade') {
  let state = { physics: { angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false, ...physics } };
  const awardXP = vi.fn(), announceToSR = vi.fn();
  const ctx = {
    React: { useState: value => [value, () => {}], createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, props: {}, toolSnapshots: [], gradeLevel, setToolData: update => { state = update(state); },
    t: (_key, fallback) => fallback, addToast: vi.fn(), announceToSR, awardXP,
  };
  const draw = () => drawPhysicsElementTree(ctx, state);
  return { draw, state: () => state.physics, awardXP, announceToSR };
}
function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => all(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...all(tree.children, predicate)];
}
const find = (tree, predicate) => all(tree, predicate)[0];
const attr = (tree, name) => find(tree, node => node.props && node.props[name] !== undefined && node.props[name] !== false);
const text = tree => Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.children) : tree == null || tree === false ? '' : String(tree);
const run = (n, angle, vel, extra = {}) => {
  const o = { grav: 9.8, mass: 1, launchHeight: 0, drag: false, ...extra };
  const r = P.simulate(angle, vel, o.grav, o.drag, o.mass, o.launchHeight);
  return { n, angle, vel, ...o, range: r.range, maxH: r.maxH, time: r.time, modelVersion: P.MODEL_VERSION };
};

describe('range-angle sweep', () => {
  it('peaks at 45° with equal complementary ranges in vacuum from the ground', () => {
    const s = P.rangeSweep(25, 9.8, false, 1, 0);
    expect(s.min).toBe(5);
    expect(s.points).toHaveLength(81);
    expect(s.best.angle).toBeCloseTo(45, 4);
    expect(s.best.range).toBeCloseTo(25 * 25 / 9.8, 6);
    const at = a => s.points.find(p => p.angle === a).range;
    expect(at(30)).toBeCloseTo(at(60), 9);
    expect(at(20)).toBeCloseTo(at(70), 9);
  });

  it('moves the peak below 45° for a raised launch, matching the analytic optimum', () => {
    const s = P.rangeSweep(25, 9.8, false, 1, 10);
    expect(s.min).toBe(0);
    expect(s.vacuumBest.angle).toBeCloseTo(P.vacuum(45, 25, 9.8, 10).optimumAngle, 4);
    expect(s.vacuumBest.angle).toBeLessThan(42);
  });

  it('flies every drag point with the same integrator a launch uses', () => {
    const s = P.rangeSweep(50, 9.8, true, 1, 0);
    for (const a of [5, 30, 41, 60, 85]) {
      const p = s.points.find(q => q.angle === a);
      expect(p.range).toBe(P.simulate(a, 50, 9.8, true, 1, 0).range);
      expect(p.vacuumRange).toBe(P.vacuum(a, 50, 9.8, 0).range);
    }
    // Drag lowers the peak, more for a light ball than a heavy one.
    expect(s.best.angle).toBeLessThan(42);
    expect(P.rangeSweep(50, 9.8, true, 10, 0).best.angle).toBeGreaterThan(s.best.angle);
    // The continuous peak is never beaten by a sampled angle.
    expect(Math.max(...s.points.map(p => p.range))).toBeLessThanOrEqual(s.best.range + 1e-9);
  });

  it('reports the near-peak band and rejects invalid launches', () => {
    expect(P.rangeBand(P.rangeSweep(25, 9.8, false, 1, 0), 0.95)).toEqual({ from: 36, to: 54 });
    expect(P.rangeSweep(0, 9.8, false, 1, 0)).toBeNull();
    expect(P.rangeSweep(25, 0, false, 1, 0)).toBeNull();
    expect(P.rangeSweep(25, 9.8, false, 1, 60)).toBeNull();
  });
});

describe('gravity fit from logged flights', () => {
  it('recovers g from vacuum ground flights and explains every exclusion', () => {
    const rows = [run(1, 45, 15), run(2, 45, 25), run(3, 30, 35), run(4, 45, 30, { drag: true }), run(5, 40, 20, { launchHeight: 10 }),
      { ...run(6, 45, 20), modelVersion: 'projectile-v2' }, run(7, 45, 20, { grav: 3.7 })];
    const fit = P.fitGravity(rows);
    expect(fit.status).toBe('ok');
    expect(fit.gravity).toBe(9.8);
    expect(fit.points.map(p => p.n)).toEqual([1, 2, 3]);
    expect(fit.gFit).toBeCloseTo(9.8, 6);
    expect(Math.abs(fit.errorPct)).toBeLessThan(1e-6);
    expect(fit.excluded.map(p => [p.n, p.reason])).toEqual([[4, 'drag'], [5, 'height'], [6, 'model'], [7, 'gravity']]);
  });

  it('asks for more flights or more spread instead of fitting too little data', () => {
    expect(P.fitGravity([run(1, 45, 15), run(2, 45, 25)])).toMatchObject({ status: 'need-more', needed: 1 });
    expect(P.fitGravity([run(1, 45, 20), run(2, 45, 20), run(3, 45, 20)])).toMatchObject({ status: 'need-more', needed: 0 });
    expect(P.fitGravity([])).toMatchObject({ status: 'need-more', needed: 3, gravity: null });
  });

  it('a drag flight wrongly included would bias g, which is why it is excluded', () => {
    const rows = [run(1, 45, 15, { drag: true }), run(2, 45, 25, { drag: true }), run(3, 45, 35, { drag: true })];
    expect(P.fitGravity(rows).status).toBe('need-more');
    const naive = rows.reduce((s, r) => s + r.vel ** 2 * r.range, 0) / rows.reduce((s, r) => s + r.vel ** 4, 0);
    expect(1 / naive).toBeGreaterThan(10.5);
  });
});

describe('range explorer panel', () => {
  it('stays closed until its view card is pressed', () => {
    const app = render();
    expect(attr(app.draw(), 'data-physics-range-explorer')).toBeUndefined();
    const cards = all(app.draw(), node => node.props && node.props['data-physics-view']);
    expect(cards.map(c => c.props['data-physics-view'])).toContain('range');
    vi.useFakeTimers();
    try {
      find(app.draw(), node => node.props && node.props['data-physics-view'] === 'range').props.onClick();
      vi.runAllTimers();
    } finally { vi.useRealTimers(); }
    expect(app.state().showRangeExplorer).toBe(true);
    expect(attr(app.draw(), 'data-physics-range-explorer')).toBeTruthy();
  });

  it('hides the curve until the student predicts or chooses to skip', () => {
    const app = render({ showRangeExplorer: true });
    let tree = app.draw();
    expect(attr(tree, 'data-physics-range-chart')).toBeUndefined();
    expect(attr(tree, 'data-physics-range-submit').props.disabled).toBe(true);
    attr(tree, 'data-physics-range-prediction').props.onChange({ target: { value: '95' } });
    expect(attr(app.draw(), 'data-physics-range-submit').props.disabled).toBe(true);
    attr(app.draw(), 'data-physics-range-prediction').props.onChange({ target: { value: '50' } });
    attr(app.draw(), 'data-physics-range-submit').props.onClick();
    tree = app.draw();
    expect(attr(tree, 'data-physics-range-chart')).toBeTruthy();
    expect(app.awardXP).toHaveBeenCalledTimes(1);
    expect(app.announceToSR).toHaveBeenCalled();
    const feedback = text(attr(tree, 'data-physics-range-feedback'));
    expect(feedback).toContain('You predicted 50°');
    expect(feedback).toContain('45.0°');
    expect(feedback).toMatch(/9[0-9]\.?[0-9]?% of the maximum/);
    expect(attr(tree, 'data-physics-range-guess')).toBeTruthy();
  });

  it('judges the angle and the range separately on the flat top of the curve', () => {
    const verdict = guess => {
      const app = render({ showRangeExplorer: true });
      attr(app.draw(), 'data-physics-range-prediction').props.onChange({ target: { value: String(guess) } });
      attr(app.draw(), 'data-physics-range-submit').props.onClick();
      return text(attr(app.draw(), 'data-physics-range-feedback'));
    };
    expect(verdict(46)).toContain('Right on the peak');
    expect(verdict(50)).toContain('Close to the peak');
    // sin(104°) = 0.970: a 7° miss still lands 97% as far.
    expect(verdict(52)).toContain('almost the full range');
    expect(verdict(52)).toContain('97% of the maximum');
    expect(verdict(70)).toContain('The curve peaks somewhere else');
  });

  it('asks again when settings change, and skipping reveals without XP', () => {
    const app = render({ showRangeExplorer: true });
    attr(app.draw(), 'data-physics-range-prediction').props.onChange({ target: { value: '45' } });
    attr(app.draw(), 'data-physics-range-submit').props.onClick();
    app.state().airResist = true;
    let tree = app.draw();
    expect(attr(tree, 'data-physics-range-chart')).toBeUndefined();
    expect(text(tree)).toContain('Your settings changed since the last prediction');
    attr(tree, 'data-physics-range-skip').props.onClick();
    tree = app.draw();
    expect(attr(tree, 'data-physics-range-chart')).toBeTruthy();
    expect(attr(tree, 'data-physics-range-feedback')).toBeUndefined();
    expect(all(tree, n => n.props && n.props['data-physics-range-curve']).map(n => n.props['data-physics-range-curve'])).toEqual(['vacuum', 'drag']);
    expect(text(attr(tree, 'data-physics-range-findings'))).toMatch(/Air drag moves the peak lower/);
    expect(app.awardXP).toHaveBeenCalledTimes(1);
  });

  it('states findings from the numbers, including a raised launch', () => {
    const app = render({ showRangeExplorer: true, launchHeight: 10, rangeExplorer: { revealedFor: '25|9.8|vacuum||10' } });
    const findings = text(attr(app.draw(), 'data-physics-range-findings'));
    expect(findings).toContain('from 45° to 41.1°');
    expect(findings).toContain('Complementary angles no longer match');
    expect(findings).toContain('The lower angle goes');
  });

  it('sets the launcher to the inspected angle unless a mission fixes it', () => {
    const app = render({ showRangeExplorer: true, rangeExplorer: { revealedFor: '25|9.8|vacuum||0' } });
    attr(app.draw(), 'data-physics-range-inspect-slider').props.onChange({ target: { value: '32' } });
    expect(text(attr(app.draw(), 'data-physics-range-reading'))).toContain('At 32°');
    attr(app.draw(), 'data-physics-range-apply').props.onClick();
    expect(app.state().angle).toBe(32);
    expect(attr(app.draw(), 'data-physics-range-apply').props.disabled).toBe(true);
    const locked = render({ showRangeExplorer: true, targetMode: true, targetConstraint: { type: 'fixedAngle', value: 45 }, rangeExplorer: { revealedFor: '25|9.8|vacuum||0', inspect: 30 } });
    expect(attr(locked.draw(), 'data-physics-range-apply').props.disabled).toBe(true);
  });

  it('measures g from the experiment log for grades 9-12 and offers it as an extension below', () => {
    const runLog = [run(1, 45, 15), run(2, 45, 25), run(3, 45, 35), run(4, 45, 30, { drag: true })];
    const revealed = { revealedFor: '25|9.8|vacuum||0' };
    const high = render({ showRangeExplorer: true, runLog, runCount: 4, rangeExplorer: revealed });
    const tree = high.draw();
    expect(text(attr(tree, 'data-physics-range-fit-result'))).toContain('g = 1 ÷ slope = 9.80 m/s²');
    const points = all(tree, n => n.props && n.props['data-physics-range-fit-point']);
    expect(points.map(p => [p.props['data-physics-range-fit-point'], p.props['data-in-fit']])).toEqual([[1, 'true'], [2, 'true'], [3, 'true'], [4, 'false']]);
    expect(text(attr(tree, 'data-physics-range-fit-excluded'))).toContain('Run 4 is not in the fit: air drag was on');
    // The 25 m/s flight matches the current settings and sits on the curve.
    expect(all(tree, n => n.props && n.props['data-physics-range-run']).map(n => n.props['data-physics-range-run'])).toEqual([2]);

    const young = render({ showRangeExplorer: true, runLog, runCount: 4, rangeExplorer: revealed }, '5th Grade');
    expect(attr(young.draw(), 'data-physics-range-fit')).toBeUndefined();
    attr(young.draw(), 'data-physics-range-fit-open').props.onClick();
    expect(attr(young.draw(), 'data-physics-range-fit-result')).toBeTruthy();
  });

  it('normalizes hostile saved explorer state', () => {
    const app = render({ showRangeExplorer: 'yes', rangeExplorer: { draft: 12, prediction: 400, predictedFor: 7, inspect: 'x', predictions: -3, target: -5 } });
    expect(attr(app.draw(), 'data-physics-range-explorer')).toBeUndefined();
    const s = P.normalizeState(app.state());
    expect(s.rangeExplorer).toEqual({ draft: '', prediction: null, predictedFor: null, revealedFor: null, inspect: null, fitOpen: false, predictions: 0,
      mode: 'angle', sDraft: null, sGuess: null, sPredictedFor: null, sRevealedFor: null, sInspect: null, vSquared: false, target: null });
    for (const bad of [0, Infinity, '40', 1e9]) expect(P.normalizeState({ rangeExplorer: { target: bad } }).rangeExplorer.target).toBeNull();
    expect(P.normalizeState({ rangeExplorer: { target: 42.5 } }).rangeExplorer.target).toBe(42.5);
  });

  it('keeps the public mirror identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_physics.js', 'utf8')).toBe(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'));
  });
});

describe('range-speed sweep and the doubling ratio', () => {
  it('sweeps every slider speed with the same integrator a launch uses', () => {
    const s = P.speedSweep(45, 9.8, true, 1, 0);
    expect(s.points.map(p => p.vel)).toEqual(Array.from({ length: 46 }, (_, i) => i + 5));
    for (const v of [5, 23, 50]) {
      const p = s.points[v - 5];
      expect(p.range).toBe(P.simulate(45, v, 9.8, true, 1, 0).range);
      expect(p.vacuumRange).toBe(P.vacuum(45, v, 9.8, 0).range);
    }
    expect(P.speedSweep(0, 9.8, false, 1, 0)).toBeNull();          // a flat launch from the ground goes nowhere
    expect(P.speedSweep(45, 0, false, 1, 0)).toBeNull();
  });

  it('is exactly x4 without drag from the ground, below 4 with drag or a raised launcher', () => {
    const vac = P.doublingRatio(45, 20, 9.8, false, 1, 0);
    expect(vac.ratio).toBeCloseTo(4, 9); expect(vac.closest).toBe(4); expect([vac.v1, vac.v2]).toEqual([20, 40]);
    const air = P.doublingRatio(45, 25, 9.8, true, 1, 0);
    expect(air.ratio).toBeGreaterThan(2.6); expect(air.ratio).toBeLessThan(3); expect(air.closest).toBe(3);
    expect(air.vacuumRatio).toBeCloseTo(4, 9);
    const heavy = P.doublingRatio(45, 25, 9.8, true, 10, 0);
    expect(heavy.ratio).toBeGreaterThan(air.ratio); expect(heavy.ratio).toBeLessThan(4);
    const raised = P.doublingRatio(45, 20, 9.8, false, 1, 10);
    expect(raised.ratio).toBeLessThan(3.6); expect(raised.ratio).toBeGreaterThan(3.4);
    const flatFromCliff = P.doublingRatio(0, 15, 9.8, false, 1, 20);
    expect(flatFromCliff.ratio).toBeCloseTo(2, 9);                 // a horizontal launch: range simply scales with speed
    expect(P.doublingRatio(45, 26, 9.8, false, 1, 0)).toBeNull();  // 2 x 26 is off the slider
    expect(P.doublingRatio(45, 4, 9.8, false, 1, 0)).toBeNull();
    expect(P.DOUBLING_CHOICES).toEqual([1.4, 2, 3, 4]);
  });
});

describe('range explorer speed mode', () => {
  const choose = (tree, c) => attr(tree, 'data-physics-range-mode') && find(tree, n => n.type === 'input' && n.props['data-physics-range-choice'] === String(c)).props.onChange({ target: { checked: true } });
  const mode = (app, m) => find(app.draw(), n => n.props && n.props['data-physics-range-mode-option'] === m).props.onClick();

  it('switches modes with pressed-state buttons and keeps the angle mode unchanged', () => {
    const app = render({ showRangeExplorer: true });
    const buttons = all(app.draw(), n => n.props && n.props['data-physics-range-mode-option']);
    expect(buttons.map(b => [b.props['data-physics-range-mode-option'], b.props['aria-pressed']])).toEqual([['angle', true], ['speed', false]]);
    expect(attr(app.draw(), 'data-physics-range-prediction')).toBeTruthy();      // angle mode first
    mode(app, 'speed');
    expect(app.state().rangeExplorer.mode).toBe('speed');
    const tree = app.draw();
    expect(text(tree)).toContain('how does launch speed change the range?');
    expect(attr(tree, 'data-physics-range-speed-predict')).toBeTruthy();
    expect(attr(tree, 'data-physics-range-speed-chart')).toBeUndefined();
    mode(app, 'angle');
    expect(attr(app.draw(), 'data-physics-range-prediction')).toBeTruthy();
  });

  it('asks the doubling question first, then reports the closest choice and the measured ratio', () => {
    const app = render({ showRangeExplorer: true, velocity: 20, rangeExplorer: { mode: 'speed' } });
    let tree = app.draw();
    expect(text(tree)).toContain('from 20 to 40 m/s');
    expect(attr(tree, 'data-physics-range-speed-submit').props.disabled).toBe(true);
    choose(tree, 2);
    tree = app.draw();
    expect(attr(tree, 'data-physics-range-speed-submit').props.disabled).toBe(false);
    attr(tree, 'data-physics-range-speed-submit').props.onClick();
    tree = app.draw();
    expect(attr(tree, 'data-physics-range-speed-chart')).toBeTruthy();
    expect(app.awardXP).toHaveBeenCalledTimes(1);
    const fb = text(attr(tree, 'data-physics-range-speed-feedback'));
    expect(fb).toContain('The closest choice is ×4.');
    expect(fb).toContain('You predicted ×2. From 20 to 40 m/s the range goes from 40.8 m to 163.3 m: ×4.00.');
    expect(text(attr(tree, 'data-physics-range-speed-findings'))).toContain('multiplies the range by exactly ×4.00');
    expect(all(tree, n => n.props && n.props['data-physics-range-pair']).map(n => n.props['data-physics-range-pair'])).toEqual([20, 40]);
  });

  it('credits the closest answer with drag, explains drag and mass, and asks again when settings change', () => {
    const app = render({ showRangeExplorer: true, velocity: 25, airResist: true, mass: 1, rangeExplorer: { mode: 'speed' } });
    choose(app.draw(), 3);
    attr(app.draw(), 'data-physics-range-speed-submit').props.onClick();
    let tree = app.draw();
    expect(text(attr(tree, 'data-physics-range-speed-feedback'))).toContain('That is the closest choice.');
    const findings = text(attr(tree, 'data-physics-range-speed-findings'));
    expect(findings).toMatch(/Through air, doubling the speed multiplies the range by ×2\.\d\d instead of ×4\.00/);
    expect(findings).toMatch(/with 10 kg the same doubling gives ×3\.\d\d/);
    expect(all(tree, n => n.props && n.props['data-physics-range-curve']).map(n => n.props['data-physics-range-curve'])).toEqual(['vacuum', 'drag']);
    app.state().velocity = 18;                                                    // new doubling pair 18 -> 36
    tree = app.draw();
    expect(attr(tree, 'data-physics-range-speed-predict')).toBeTruthy();
    expect(text(tree)).toContain('Your settings changed since the last prediction');
    attr(tree, 'data-physics-range-speed-skip').props.onClick();
    expect(attr(app.draw(), 'data-physics-range-speed-chart')).toBeTruthy();
    expect(attr(app.draw(), 'data-physics-range-speed-feedback')).toBeUndefined();
    expect(app.awardXP).toHaveBeenCalledTimes(1);
  });

  it('explains a raised launcher and turns the no-drag curve into a straight line against v²', () => {
    const raised = render({ showRangeExplorer: true, velocity: 20, launchHeight: 10, rangeExplorer: { mode: 'speed', sRevealedFor: 'speed|45|9.8|vacuum||10|20' } });
    expect(text(attr(raised.draw(), 'data-physics-range-speed-findings'))).toMatch(/From 10 m up, doubling the speed multiplies the no-drag range by ×3\.5\d, less than 4/);
    const app = render({ showRangeExplorer: true, velocity: 20, rangeExplorer: { mode: 'speed', sRevealedFor: 'speed|45|9.8|vacuum||0|20' } });
    expect(attr(app.draw(), 'data-physics-range-speed-chart').props['data-x-axis']).toBe('v');
    find(app.draw(), n => n.props && n.props['data-physics-range-vsq']).props.onChange({ target: { checked: true } });
    const tree = app.draw();
    expect(attr(tree, 'data-physics-range-speed-chart').props['data-x-axis']).toBe('v2');
    expect(text(tree)).toContain('Launch speed squared, v² (m²/s²)');
    expect(text(attr(tree, 'data-physics-range-speed-findings'))).toContain('straight line through the origin');
    // The plotted no-drag points really are collinear with the origin when x = v².
    const d = attr(tree, 'data-physics-range-speed-chart').children.flat(Infinity).find(n => n && n.props && n.props['data-physics-range-curve'] === 'vacuum').props.d;
    const xy = d.split(/[ML]/).filter(Boolean).map(s => s.trim().split(' ').map(Number));
    const [x0, y0] = [84, 18 + 226];                                              // chart origin (L, T + plot height)
    const [xe, ye] = xy[xy.length - 1], k = (y0 - ye) / (xe - x0);                // line from the origin through the far end
    const worst = Math.max(...xy.map(([x, y]) => Math.abs((y0 - y) - k * (x - x0))));
    expect(worst).toBeLessThan(0.2);                                              // the path is drawn to 0.1 px
    // ...and it is a real test: the same check fails against the plain-speed axis.
    find(app.draw(), n => n.props && n.props['data-physics-range-vsq']).props.onChange({ target: { checked: false } });
    const dv = attr(app.draw(), 'data-physics-range-speed-chart').children.flat(Infinity).find(n => n && n.props && n.props['data-physics-range-curve'] === 'vacuum').props.d;
    const xv = dv.split(/[ML]/).filter(Boolean).map(s => s.trim().split(' ').map(Number));
    const [xf, yf] = xv[xv.length - 1], kv = (y0 - yf) / (xf - x0);
    expect(Math.max(...xv.map(([x, y]) => Math.abs((y0 - y) - kv * (x - x0))))).toBeGreaterThan(20);
  });

  it('sets the launcher speed from the inspected point unless a mission fixes the speed', () => {
    const app = render({ showRangeExplorer: true, velocity: 20, rangeExplorer: { mode: 'speed', sRevealedFor: 'speed|45|9.8|vacuum||0|20' } });
    find(app.draw(), n => n.props && n.props['data-physics-range-speed-slider']).props.onChange({ target: { value: '33' } });
    expect(text(attr(app.draw(), 'data-physics-range-reading'))).toContain('At 33 m/s: range');
    attr(app.draw(), 'data-physics-range-apply').props.onClick();
    expect(app.state().velocity).toBe(33);
    const locked = render({ showRangeExplorer: true, velocity: 20, targetMode: true, targetConstraint: { type: 'fixedVelocity', value: 20 }, rangeExplorer: { mode: 'speed', sRevealedFor: 'speed|45|9.8|vacuum||0|20', sInspect: 30 } });
    expect(attr(locked.draw(), 'data-physics-range-apply').props.disabled).toBe(true);
  });

  it('normalizes hostile speed-mode state', () => {
    const app = render({ showRangeExplorer: true, rangeExplorer: { mode: 'sideways', sDraft: 5, sGuess: '4', sPredictedFor: 3, sInspect: 99, vSquared: 'yes' } });
    app.draw();
    const s = P.normalizeState(app.state()).rangeExplorer;
    expect([s.mode, s.sDraft, s.sGuess, s.sPredictedFor, s.sInspect, s.vSquared]).toEqual(['angle', null, null, null, 50, false]);
  });
});
