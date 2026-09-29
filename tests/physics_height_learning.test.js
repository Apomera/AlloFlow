import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

function render(physics = {}) {
  let state = { physics };
  const ctx = {
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, props: {}, toolSnapshots: [], gradeLevel: '5th Grade',
    setToolData: update => { state = update(state); },
    t: (_key, fallback) => fallback, addToast: vi.fn(), announceToSR: vi.fn(), awardXP: vi.fn(),
  };
  const draw = () => window.StemLab._registry.physics.render({ ...ctx, toolData: state });
  return { tree: draw(), draw, state: () => state.physics };
}
function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) {
    for (const child of tree) { const result = find(child, predicate); if (result) return result; }
    return undefined;
  }
  return predicate(tree) ? tree : find(tree.children, predicate);
}
const marked = (tree, key) => find(tree, node => node.props['data-physics-' + key]);
const slider = (tree, key) => find(tree, node => node.props['data-physics-parameter'] === key);
const trial = (tree, n) => find(tree, node => node.props['data-physics-investigation-trial'] === String(n));
const text = tree => Array.isArray(tree) ? tree.map(text).join(' ') : tree && typeof tree === 'object' ? text(tree.children) : tree == null || tree === false ? '' : String(tree);
const flight = (n, height = 10) => ({ n, launchHeight: height, angle: 0, vel: 15, grav: 9.8, mass: 1, drag: false, range: 15 * Math.sqrt(2 * height / 9.8), maxH: height, time: Math.sqrt(2 * height / 9.8), modelVersion: 'projectile-v3' });

beforeAll(() => { new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))(); });
beforeEach(() => { document.getElementById('physicsCanvas')?.remove(); });

describe('launch-height learning controls', () => {
  it('allows horizontal launch only above ground and raises the angle when height returns to zero', () => {
    const app = render({ angle: 0, launchHeight: 10 });
    expect(slider(app.tree, 'launchHeight').props).toMatchObject({ min: 0, max: 50, value: 10, 'aria-label': 'Launch height (m)' });
    expect(slider(app.tree, 'angle').props).toMatchObject({ min: 0, value: 0 });
    slider(app.tree, 'launchHeight').props.onChange({ target: { value: '0' } });
    expect(app.state()).toMatchObject({ angle: 5, launchHeight: 0 });
    expect(slider(app.draw(), 'angle').props.min).toBe(5);
    slider(app.draw(), 'launchHeight').props.onChange({ target: { value: '50' } });
    expect(slider(app.draw(), 'angle').props.min).toBe(0);
  });

  it.each(['targetMode', 'challengeActive', 'battleMode'])('locks height at ground level during %s without overwriting exploration height', mode => {
    const app = render({ angle: 0, launchHeight: 25, [mode]: true });
    const height = slider(app.tree, 'launchHeight');
    expect(height.props.disabled).toBeTruthy();
    expect(height.props.value).toBe(0);
    height.props.onChange({ target: { value: '15' } });
    expect(app.state().launchHeight).toBe(25);
  });

  it('shows finite nonzero horizontal-flight predictions and absolute maximum height', () => {
    const app = render({ launchHeight: 10, angle: 0, velocity: 15, gravity: 9.8, showFormulas: true });
    const formulaText = text(marked(app.tree, 'formulas'));
    expect(formulaText).toContain('T = (vy₀ + √(vy₀² + 2gh₀)) / g');
    expect(formulaText).toContain('21.43 m');
    expect(formulaText).toContain('1.43 s');
    expect(formulaText).toContain('Max height above ground:');
    expect(formulaText).toContain('10.00 m');
    const summary = text(marked(app.tree, 'ideal-summary'));
    expect(summary).toContain('21.4 m');
    expect(summary).toContain('10.0 m');
    expect(summary).toContain('1.43 s');
    expect(summary).not.toMatch(/NaN|Infinity/);
  });

  it('compares the last flight against its captured launch height after controls change', () => {
    const app = render({ launchHeight: 0, angle: 60, velocity: 40, lastFlight: flight(1) });
    const latest = text(marked(app.tree, 'last-flight'));
    expect(latest).toContain('h₀=10 m');
    expect(latest).toContain('formula: 21.4 m');
    expect(latest).toContain('formula: 10.0 m');
    expect(latest).toContain('formula: 1.43 s');
    expect(latest).toContain('Max height above ground');
  });

  it('moves the ideal angle optimum below 45 degrees for elevated launches and describes the graph accurately', () => {
    const cv = document.createElement('canvas');
    cv.id = 'physicsCanvas';
    const trail = [{ t: 0, mX: 0, mY: 10, mVx: 15, mVy: 0 }, { t: 1.43, mX: 21.43, mY: 0, mVx: 15, mVy: -14 }];
    trail.drag = false;
    cv._trails = [trail];
    document.body.appendChild(cv);
    const app = render({ launchHeight: 10, angle: 0, velocity: 15, gravity: 9.8, showGraphs: true });
    const graph = find(app.tree, node => node.props['data-physics-graph'] === 'range');
    const optimum = Math.atan(15 / Math.sqrt(15 ** 2 + 2 * 9.8 * 10)) * 180 / Math.PI;
    expect(graph.props['data-optimum-angle']).toBeCloseTo(optimum, 10);
    expect(graph.props['data-optimum-angle']).toBeLessThan(45);
    expect(graph.props['aria-label']).toContain('Launch height: 10 m.');
    expect(graph.props['aria-label']).toContain(optimum.toFixed(1) + '°');
    expect(text(app.tree)).toContain('Complementary angles generally have different ranges');
    const curve = find(graph, node => node.type === 'path');
    expect(curve.props.d).not.toMatch(/NaN|Infinity/);
    const groundGraph = find(render({ launchHeight: 0, showGraphs: true }).tree, node => node.props['data-physics-graph'] === 'range');
    expect(groundGraph.props['data-optimum-angle']).toBeCloseTo(45, 10);
  });

  it.each(['speed_squared', 'inverse_gravity', 'mass_drag'])('sets %s activities back to ground level', activityId => {
    const app = render({ launchHeight: 20, investigationDraft: { activityId } });
    expect(text(app.tree)).toContain('launch height at ground level (0 m)');
    trial(app.tree, 1).props.onClick();
    expect(app.state().launchHeight).toBe(0);
    expect(app.state().angle).toBe(45);
  });

  it('offers two horizontal trials that change speed while preserving height and falling time', () => {
    const app = render({ investigationDraft: { activityId: 'horizontal_motion', prediction: 'Same falling time.' } });
    trial(app.tree, 1).props.onClick();
    const first = { ...app.state() };
    trial(app.draw(), 2).props.onClick();
    const second = app.state();
    expect(first).toMatchObject({ launchHeight: 10, angle: 0, velocity: 15, gravity: 9.8, mass: 1, airResist: false });
    expect(second).toMatchObject({ launchHeight: 10, angle: 0, velocity: 30, gravity: 9.8, mass: 1, airResist: false });
    expect(second.investigationDraft.prediction).toBe('Same falling time.');
    const firstResult = window.StemLab._physics.vacuum(first.angle, first.velocity, first.gravity, first.launchHeight);
    const secondResult = window.StemLab._physics.vacuum(second.angle, second.velocity, second.gravity, second.launchHeight);
    expect(secondResult.time).toBeCloseTo(firstResult.time, 12);
    expect(secondResult.range / firstResult.range).toBeCloseTo(2, 12);
  });

  it('labels height as a changed variable and explains elevated notebook evidence', () => {
    const app = render({ launchHeight: 0, runLog: [flight(1, 10), flight(2, 20)], investigationDraft: { title: 'Height study', selectedRunIds: [1, 2] } });
    const comparison = text(marked(app.tree, 'investigation-comparison'));
    expect(comparison).toContain('One launch setting changed: launch height');
    expect(comparison).toContain('These no-drag runs include an elevated launch');
    expect(comparison).not.toContain('range scales with speed squared');
    expect(text(app.tree)).toContain('h₀=10 m');
    expect(text(app.tree)).toContain('h₀=20 m');
  });

  it('applies the separate ground-level calculator with an explicit zero height', () => {
    const app = render({ launchHeight: 20, angle: 0, gravityHunt: { angle: 30, velocity: 20, gravity: 3.7 } });
    marked(app.tree, 'apply-inquiry').props.onClick();
    expect(app.state()).toMatchObject({ launchHeight: 0, angle: 30, velocity: 20, gravity: 3.7, airResist: false });
  });

  it('shows captured height and height reference in the paired-model results', () => {
    const vacuum = flight(1);
    const drag = { ...flight(2), drag: true, range: 20, time: 1.45 };
    const app = render({ launchHeight: 0, modelComparison: {
      parameters: { angle: 0, velocity: 15, gravity: 9.8, mass: 1, launchHeight: 10 },
      vacuum, drag,
    } });
    expect(text(marked(app.tree, 'model-comparison-settings'))).toContain('launch height = 10 m');
    expect(text(marked(app.tree, 'model-comparison'))).toContain('Maximum height above ground (m)');
  });
});
