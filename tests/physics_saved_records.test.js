import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const flight = (extra = {}) => ({ n: 10, angle: 45, vel: 25, grav: 9.8, mass: 1, drag: false, range: 63.78, maxH: 15.94, time: 3.608, ...extra });
let normalize;
let clipboard;

// Exercise the registered renderer and real button callbacks without mounting
// its animation loop. Reject invalid object children as React itself does.
function render(physics = {}) {
  const React = { createElement(type, props, ...children) {
    children.flat(Infinity).forEach(child => {
      if (child && typeof child === 'object' && !child.element) throw new Error('Invalid object child');
    });
    return { element: true, type, props: props || {}, children };
  } };
  return window.StemLab._registry.physics.render({
    React, toolData: { physics }, setToolData: vi.fn(), icons: {},
    gradeLevel: '5th Grade', props: {}, toolSnapshots: [], t: (_key, fallback) => fallback,
    addToast: vi.fn(), announceToSR: vi.fn(), awardXP: vi.fn(),
  });
}

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (Array.isArray(tree)) {
    for (const child of tree) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  if (predicate(tree)) return tree;
  return find(tree.children, predicate);
}

beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  render();
  normalize = window.StemLab._physics.normalizeState;
});

beforeEach(() => {
  document.getElementById('physicsCanvas')?.remove();
  clipboard = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
  window.StemLab.writeClipboard = clipboard;
});

describe('physics saved-record recovery', () => {
  it.each([
    { predictionResult: { errPct: 5 } },
    { predictionResult: { predicted: 10, actual: Infinity, errPct: 5 } },
    { lastFlight: { range: 63.5 } },
    { lastFlight: flight({ maxH: NaN }) },
    { runLog: [{ range: 'oops' }] },
    { runLog: { range: 12 }, targetList: {}, quizActive: true, quizOptions: {} },
  ])('renders malformed saved data without losing the tool: %j', saved => {
    expect(() => render(saved)).not.toThrow();
    const result = normalize(saved);
    expect(result.predictionResult).toBeNull();
    expect(result.lastFlight).toBeNull();
    expect(result.runLog).toEqual([]);
  });

  it('keeps complete observations and reflection while dropping only malformed rows', () => {
    const valid = flight();
    const prediction = { predicted: 60, actual: 63.78, errPct: 6.3, tier: 'close', xp: 10, reason: 'The measured range was longer.', revision: 'increase', reflectionComplete: true };
    const saved = { runLog: [null, valid, flight({ n: 11, time: 'bad' })], lastFlight: valid, predictionResult: prediction };
    const result = normalize(saved);
    expect(result.runLog).toEqual([valid]);
    expect(result.lastFlight).toEqual(valid);
    expect(result.predictionResult).toEqual(prediction);
    expect(result.runCount).toBe(10);
    expect(saved.runLog).toHaveLength(3);
    expect(() => render(saved)).not.toThrow();
  });

  it('requires every numerical observation field to be finite', () => {
    for (const key of ['angle', 'vel', 'grav', 'mass', 'range', 'maxH', 'time']) {
      for (const bad of [undefined, '1', NaN, Infinity, -Infinity, {}]) {
        const result = normalize({ lastFlight: flight({ [key]: bad }), runLog: [flight({ [key]: bad })] });
        expect(result.lastFlight, key).toBeNull();
        expect(result.runLog, key).toEqual([]);
      }
    }
  });

  it('clamps controls to their visible domains, including pause and speed', () => {
    expect(normalize({ angle: -4, velocity: 99, gravity: 0, mass: 100, simSpeed: 9 })).toMatchObject({ angle: 5, velocity: 50, gravity: 1, mass: 10, simSpeed: 1 });
    expect(normalize({ angle: 99, velocity: -2, gravity: 99, mass: 0, simSpeed: -1 })).toMatchObject({ angle: 85, velocity: 5, gravity: 25, mass: 1, simSpeed: 0 });
    expect(normalize({ angle: {}, velocity: '25', gravity: Infinity, mass: NaN, simSpeed: {} })).toMatchObject({ angle: 45, velocity: 25, gravity: 9.8, mass: 1, simSpeed: 1 });
    expect(normalize({ simSpeed: 0 }).simSpeed).toBe(0);
  });

  it('enforces valid target locks and rejects malformed constraint values', () => {
    expect(normalize({ targetMode: true, angle: 80, gravity: 3.7, targetConstraint: { type: 'fixedAngle', value: 45 } })).toMatchObject({ angle: 45, gravity: 3.7 });
    expect(normalize({ targetMode: true, velocity: 10, targetConstraint: { type: 'fixedVelocity', value: 35 } }).velocity).toBe(35);
    expect(normalize({ targetMode: false, angle: 80, targetConstraint: { type: 'fixedAngle', value: 45 } }).angle).toBe(80);
    expect(normalize({ targetMode: true, targetConstraint: { type: 'fixedAngle', value: 200 } }).targetConstraint).toBeNull();
  });

  it('recovers legacy IDs from the saved count and retains later run identities', () => {
    const result = normalize({ runCount: 10, runLog: Array.from({ length: 8 }, () => flight({ n: undefined })) });
    expect(result.runLog.map(r => r.n)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.runCount).toBe(10);
    const modern = normalize({ runCount: 'broken', runLog: [flight({ n: 41 }), flight({ n: 42 })], launchCount: {}, predictionStreak: Infinity });
    expect(modern.runLog.map(r => r.n)).toEqual([41, 42]);
    expect(modern).toMatchObject({ runCount: 42, launchCount: 0, predictionStreak: 0 });
    const mixed = normalize({ runLog: [flight({ n: undefined }), flight({ n: 1 })] });
    expect(mixed.runLog.map(r => r.n)).toEqual([2, 1]);
  });
});

describe('physics CSV recorded evidence', () => {
  it('exports the same retained run numbers shown in the experiment table', () => {
    const tree = render({ runLog: [flight({ n: 10 }), flight({ n: 11 })], runCount: 11 });
    const button = find(tree, n => n.props?.['aria-label'] === 'Copy the experiment log as CSV for a spreadsheet');
    expect(button).toBeTruthy();
    button.props.onClick();
    const csv = clipboard.mock.calls[0][0].split('\n');
    expect(csv[1].split(',')[0]).toBe('10');
    expect(csv[2].split(',')[0]).toBe('11');
  });

  it('exports launch metadata and canonical first/impact samples after settings change', () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'physicsCanvas';
    const trail = [
      { t: 0, mX: 0, mY: 0, mVx: 15, mVy: 20 },
      { t: 3.5, mX: 50.12, mY: 0, mVx: 13, mVy: -18 },
    ];
    Object.assign(trail, { run: 12, angle: 45, velocity: 25, gravity: 9.8, mass: 2, drag: true, modelVersion: 'projectile-v2' });
    canvas._trails = [trail];
    document.body.appendChild(canvas);
    const tree = render({ mass: 9, lastFlight: flight({ mass: 7 }), showFlightData: true });
    const button = find(tree, n => n.props?.['aria-label'] === 'Copy the flight data as CSV for a spreadsheet');
    expect(button).toBeTruthy();
    button.props.onClick();
    const csv = clipboard.mock.calls[0][0].split('\n');
    expect(csv[0]).toContain('# run=12,');
    expect(csv[0]).toContain('mass_kg=2,model=projectile-v2');
    expect(csv[2]).toBe('0.000,0.00,0.00,15.00,20.00,25.00');
    expect(csv[3]).toBe('3.500,50.12,0.00,13.00,-18.00,22.20');
  });
});
