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

function all(tree, predicate) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(child => all(child, predicate));
  return [...(predicate(tree) ? [tree] : []), ...all(tree.children, predicate)];
}
const find = (tree, predicate) => all(tree, predicate)[0];
const button = (tree, label) => find(tree, node => node.type === 'button' && node.props['aria-label'] === label);
const key = (node, value) => node.props.onKeyDown({ key: value, preventDefault: vi.fn() });

function canvas(extra = {}) {
  const cv = document.createElement('canvas');
  cv.id = 'physicsCanvas';
  Object.assign(cv, extra);
  document.body.appendChild(cv);
  return cv;
}

beforeAll(() => { new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))(); });
beforeEach(() => { document.getElementById('physicsCanvas')?.remove(); });

describe('physics learning controls and recorded explanations', () => {
  it.each([false, true])('explains the recorded drag=%s flight after current controls change', drag => {
    const trail = [{ t: 0, mX: 0, mY: 0, mVx: 20, mVy: 20 }, { t: 2, mX: 36, mY: 0, mVx: 16, mVy: -18 }];
    trail.drag = drag;
    canvas({ _trails: [trail] });
    const app = render({ showGraphs: true, airResist: !drag });
    const graphs = find(app.tree, node => node.props['data-physics-component-graphs']);
    const labels = all(graphs, node => node.type === 'svg').map(node => node.props['aria-label']);
    expect(labels).toHaveLength(2);
    expect(labels[0]).toContain(drag ? 'decreases because drag' : 'stays constant');
    expect(labels[1]).toContain(drag ? 'curves over time' : 'straight line');
    expect(all(graphs, node => node.type === 'text').every(node => node.props.fontSize >= 14)).toBe(true);
    const dataButton = find(app.tree, node => node.type === 'button' && node.children.includes('Open the flight data table'));
    dataButton.props.onClick();
    expect(app.state().showFlightData).toBe(true);
  });

  it.each([
    ['fixedAngle', 45, 'ArrowUp', 'ArrowRight', 'angle', 'velocity'],
    ['fixedVelocity', 25, 'ArrowRight', 'ArrowUp', 'velocity', 'angle'],
  ])('honors %s through keyboard and sliders while gravity stays available', (type, value, lockedKey, freeKey, locked, free) => {
    const app = render({ angle: 45, velocity: 25, gravity: 9.8, targetMode: true, targetConstraint: { type, value } });
    const control = find(app.tree, node => node.type === 'canvas');
    key(control, lockedKey);
    expect(app.state()[locked]).toBe(value);
    key(control, freeKey);
    expect(app.state()[free]).toBe(free === 'angle' ? 50 : 30);
    const mainSliders = find(app.tree, node => node.props['data-physics-sliders']);
    const gravity = find(mainSliders, node => node.type === 'input' && node.props['aria-label'].startsWith('Gravity'));
    expect(gravity.props.disabled).toBeFalsy();
    gravity.props.onChange({ target: { value: '3.7' } });
    expect(app.state().gravity).toBe(3.7);
  });

  it('restarts completed final target missions', () => {
    const app = render({ targetMode: true, targetRound: 10, targetList: [{ x: 85, y: 0, radius: 12, destroyed: true }] });
    const restart = button(app.tree, 'Mission complete — restart');
    expect(restart.props.disabled).toBe(false);
    restart.props.onClick();
    expect(app.state().targetRound).toBe(1);
    expect(app.state().targetList.every(target => !target.destroyed)).toBe(true);
  });

  it('starts symmetry through the controller and prevents target-mode comparisons', () => {
    const start = vi.fn();
    canvas({ _startSymmetryDemo: start });
    const label = 'Vacuum symmetry comparison: launch at 30 and 60 degrees with the same speed and gravity';
    const app = render();
    button(app.tree, label).props.onClick();
    expect(start).toHaveBeenCalledTimes(1);
    expect(app.state().showOverlay).toBe(true);
    const mission = render({ targetMode: true });
    expect(button(mission.tree, label).props.disabled).toBe(true);
    button(mission.tree, label).props.onClick();
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('wakes paused single-step playback and cancels before clearing flight evidence', () => {
    const wake = vi.fn();
    const cv = canvas({ _physScheduleFrame: wake, _trails: [[1]], _impactParticles: [1], _landingMarkers: [1], _cancelFlight: vi.fn() });
    const app = render({ simSpeed: 0 });
    find(app.tree, node => node.props['data-physics-step']).props.onClick();
    expect(cv._stepNext).toBe(true);
    expect(wake).toHaveBeenCalledTimes(1);
    button(app.tree, 'Clear all trajectory trails').props.onClick();
    expect(cv._cancelFlight).toHaveBeenCalledTimes(1);
    expect(cv._trails).toEqual([]);
    expect(wake).toHaveBeenCalledTimes(2);
  });

  it('applies the ideal calculator settings explicitly and preserves target constraints', () => {
    const settings = { gravity: 3.7, angle: 30, velocity: 20 };
    const app = render({ airResist: true, gravityHunt: settings });
    find(app.tree, node => node.props['data-physics-apply-inquiry']).props.onClick();
    expect(app.state()).toMatchObject({ ...settings, airResist: false });
    const mission = render({ airResist: true, targetMode: true, gravityHunt: settings });
    const apply = find(mission.tree, node => node.props['data-physics-apply-inquiry']);
    expect(apply.props.disabled).toBe(true);
    apply.props.onClick();
    expect(mission.state().airResist).toBe(true);
    expect(mission.state().angle).toBeUndefined();
  });

  it('captures force and energy only on request and guards malformed saved snapshots', () => {
    const b = { t: 1, mX: 3, mVx: 3, mVy: 4, mY: 5, mass: 2, grav: 10, drag: 0.004, E0: 150 };
    canvas({ _ball: b });
    const app = render({ simSpeed: 0, inspectionSnapshot: { unsafe: true } });
    expect(find(app.tree, node => node.props['data-physics-inspection'])).toBeUndefined();
    find(app.tree, node => node.props['data-physics-inspect']).props.onClick();
    expect(app.state().inspectionSnapshot).toContain('ax = -0.03 m/s²; ay = -10.04 m/s²');
    expect(app.state().inspectionSnapshot).toContain('Gravitational force downward: 20.00 N');
    expect(app.state().inspectionSnapshot).toContain('KE = 25.00 J; PE = 100.00 J; KE + PE = 125.00 J');
    expect(app.state().inspectionSnapshot).toContain('x = 3.00 m; y = 5.00 m');
    expect(app.state().inspectionSnapshot).toContain('Energy transferred to the air: 25.00 J');
    const saved = app.state().inspectionSnapshot;
    b.mVx = 30;
    const refreshed = app.draw();
    expect(find(refreshed, node => node.props['data-physics-inspection']).children).toEqual([saved]);
    expect(find(render({ simSpeed: 1 }).tree, node => node.props['data-physics-inspect']).props.disabled).toBe(true);
  });
});
