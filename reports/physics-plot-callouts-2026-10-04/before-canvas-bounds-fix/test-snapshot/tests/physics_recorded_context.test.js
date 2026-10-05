import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawPhysicsElementTree } from './helpers/physics_element_tree.js';

let P;
const hosts = [];

beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  P = window.StemLab._physics;
});
beforeEach(() => {
  document.getElementById('physicsCanvas')?.remove();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  hosts.splice(0).forEach(host => host.remove());
});

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) {
    for (const child of tree) {
      const found = find(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  return predicate(tree) ? tree : find(tree.children, predicate);
}
const reuseButton = tree => find(tree, node => node.props['data-physics-reuse-settings']);

function originalFlight(overrides = {}) {
  const parameters = { angle: 35, velocity: 23, gravity: 3.7, mass: 2.5, launchHeight: 10, drag: true, ...overrides };
  const radians = parameters.angle * Math.PI / 180;
  const body = {
    t: 0, mX: 0, mY: parameters.launchHeight,
    mVx: parameters.velocity * Math.cos(radians), mVy: parameters.velocity * Math.sin(radians),
    grav: parameters.gravity, drag: parameters.drag ? P.DRAG_K : 0, mass: parameters.mass,
    launchHeight: parameters.launchHeight, maxH: parameters.launchHeight,
  };
  const point = value => ({ t: value.t, mX: value.mX, mY: value.mY, mVx: value.mVx, mVy: value.mVy });
  const original = [point(body)];
  Object.assign(original, parameters, {
    run: 7, modelVersion: P.MODEL_VERSION, parameters: Object.freeze({ ...parameters }),
    prediction: 30, mission: Object.freeze({ targetMode: false, targetRound: 0, challengeTier: null }),
  });
  for (let step = 0; !body.landed && step < 4096; step++) {
    P.step(body, P.DT);
    P.recordSample(original, body);
  }
  expect(body.landed).toBe(true);
  if (body.apex) original.apex = Object.freeze({ tSec: body.apex.t, mX: body.apex.mX, mY: body.apex.mY, vx: body.apex.mVx });
  const summary = {
    n: 7, angle: parameters.angle, vel: parameters.velocity, grav: parameters.gravity,
    mass: parameters.mass, launchHeight: parameters.launchHeight, drag: parameters.drag,
    range: body.mX, maxH: body.maxH, time: body.t, modelVersion: P.MODEL_VERSION,
  };
  const record = P.captureRecordedFlight(original, summary);
  expect(record).not.toBeNull();
  return { trail: P.restoreRecordedFlight(record), record, summary };
}

function fixture(overrides = {}) {
  const flight = originalFlight(overrides);
  const host = document.createElement('div');
  host.id = 'physics-fs-outer';
  hosts.push(host);
  const canvas = document.createElement('canvas');
  canvas.id = 'physicsCanvas';
  canvas._trails = [flight.trail];
  canvas._launched = false;
  const index = Math.floor(flight.trail.length / 3);
  canvas._inspection = { trail: flight.trail, index, snapshot: P.inspectSample(flight.trail, index) };
  canvas._launch = vi.fn();
  canvas._cancelFlight = vi.fn();
  const status = document.createElement('p');
  status.dataset.physicsSettingsComparison = '';
  status.dataset.matches = 'false';
  status.tabIndex = -1;
  host.append(canvas, status);
  document.body.appendChild(host);
  let state = {
    unrelatedTool: { notes: 'Keep other tool work' },
    physics: {
      angle: 75, velocity: 5, gravity: 25, mass: 9, launchHeight: 0, airResist: false,
      simSpeed: 0, showGraphs: true, showFlightData: true, analysisView: 'motion',
      runCount: 7, runLog: [flight.summary], lastFlight: flight.summary,
      recordedFlights: P.normalizeRecordedFlights([flight.record]),
      inspectionSnapshot: 'Keep this recorded point', liveTick: 12,
      investigationDraft: { title: 'Keep my investigation', observation: 'Keep my notes' },
      predictedRange: '42', predictionResult: { predicted: 42, actual: 30, errPct: 28.5, tier: 'miss', xp: 0 },
      targetMode: false, challengeActive: false, battleMode: false,
      targetRound: 4, challengeTier: 2, battleRound: 3,
    },
  };
  let deferred = false;
  const pending = [];
  const apply = update => { state = typeof update === 'function' ? update(state) : update; };
  const updates = vi.fn(update => {
    if (deferred) pending.push(update);
    else apply(update);
  });
  const ctx = {
    React: { useState: value => [value, () => {}], createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, props: {}, toolSnapshots: [], gradeLevel: '5th Grade', setToolData: updates,
    t: (_key, fallback) => fallback, addToast: vi.fn(), announceToSR: vi.fn(), awardXP: vi.fn(),
  };
  const draw = () => drawPhysicsElementTree(ctx, state);
  const tree = draw();
  const button = reuseButton(tree);
  expect(canvas.isConnected).toBe(true);
  expect(button).toBeDefined();
  expect(button.props.disabled).toBe(false);
  return {
    ...flight, host, canvas, status, tree, button, draw, updates, state: () => state,
    patch: patch => { state = { ...state, physics: { ...state.physics, ...patch } }; },
    deferUpdates: () => { deferred = true; },
    flushUpdates: () => { deferred = false; pending.splice(0).forEach(apply); },
  };
}

function expectRejected(app, invoke = () => app.button.props.onClick()) {
  const before = app.state();
  const inspection = app.canvas._inspection;
  invoke();
  expect(app.state()).toBe(before);
  expect(app.state().physics).toBe(before.physics);
  expect(app.canvas._inspection).toBe(inspection);
  expect(app.canvas._launch).not.toHaveBeenCalled();
  expect(app.canvas._cancelFlight).not.toHaveBeenCalled();
  vi.runOnlyPendingTimers();
  expect(document.activeElement).not.toBe(app.status);
}

describe('recorded settings reuse reads current state before applying', () => {
  it.each(['targetMode', 'challengeActive', 'battleMode'])('rejects a stale enabled action after %s starts', mode => {
    const app = fixture();
    app.patch({ [mode]: true, unrelatedSavedWork: 'Arrived after rendering' });
    expectRejected(app);
    expect(app.state().physics[mode]).toBe(true);
    expect(app.state().physics.unrelatedSavedWork).toBe('Arrived after rendering');
  });

  it.each([
    ['_launched', true],
    ['_demo', { kind: 'models', ranges: [30] }],
    ['_demoTimer', 123],
  ])('rejects a stale enabled action when the controller gains %s', (key, value) => {
    const app = fixture();
    app.canvas[key] = value;
    expect(app.state().physics.simSpeed).toBe(0);
    expectRejected(app);
    expect(app.canvas[key]).toBe(value);
  });

  it('rechecks a mission that starts after the click queues its functional updater', () => {
    const app = fixture();
    app.deferUpdates();
    app.button.props.onClick();
    expect(app.updates).toHaveBeenCalledTimes(1);
    app.patch({ challengeActive: true, challengeTier: 3, liveTick: 99 });
    expectRejected(app, app.flushUpdates);
    expect(app.state().physics).toMatchObject({ challengeActive: true, challengeTier: 3, liveTick: 99 });
  });

  it('does not materialize default controls when current normalized settings already match', () => {
    const app = fixture({ angle: 45, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 0, drag: false });
    app.patch({ angle: undefined, velocity: undefined, gravity: undefined, mass: undefined, launchHeight: undefined, airResist: undefined });
    expectRejected(app);
    expect(app.state().physics.angle).toBeUndefined();
    expect(app.state().physics.launchHeight).toBeUndefined();
  });
});

describe('recorded settings reuse keeps a retained original controller', () => {
  it('rejects the old action after Clear Trails removes the original evidence', () => {
    const app = fixture();
    app.canvas._trails.length = 0;
    app.patch({ recordedFlights: [], lastFlight: null });
    expectRejected(app);
    expect(app.state().physics.recordedFlights).toEqual([]);
    expect(app.state().physics.lastFlight).toBeNull();
  });

  it('safely rejects the old action after its canvas unmounts', () => {
    const app = fixture();
    app.canvas.remove();
    expectRejected(app);
  });

  it('rejects the old action after a replacement controller restores independent copies', () => {
    const app = fixture();
    app.canvas.remove();
    const replacement = document.createElement('canvas');
    replacement.id = 'physicsCanvas';
    replacement._trails = [P.restoreRecordedFlight(app.record)];
    app.host.prepend(replacement);
    expect(replacement._trails[0]).not.toBe(app.trail);
    expectRejected(app);
  });

  it('rechecks controller identity when a queued updater outlives the original canvas', () => {
    const app = fixture();
    app.deferUpdates();
    app.button.props.onClick();
    app.canvas.remove();
    const replacement = document.createElement('canvas');
    replacement.id = 'physicsCanvas';
    replacement._trails = [app.trail];
    app.host.prepend(replacement);
    expectRejected(app, app.flushUpdates);
  });
});

describe('recorded settings reuse prepares an elevated repeat without changing evidence', () => {
  it('applies horizontal angle and positive height atomically, preserving all other work and the selected point', () => {
    const app = fixture({ angle: 0, launchHeight: 10 });
    const before = app.state();
    const inspection = app.canvas._inspection;
    const points = app.trail.map(point => ({ ...point }));
    const originalParameters = app.trail.parameters;
    const patch = { angle: 0, velocity: 23, gravity: 3.7, mass: 2.5, launchHeight: 10, airResist: true };
    app.button.props.onClick();
    expect(app.updates).toHaveBeenCalledTimes(1);
    expect(app.updates.mock.calls[0][0]).toBeTypeOf('function');
    expect(app.state().physics).toEqual({ ...before.physics, ...patch });
    expect(P.normalizeState(app.state().physics)).toMatchObject(patch);
    expect(app.state().unrelatedTool).toBe(before.unrelatedTool);
    for (const key of ['runLog', 'lastFlight', 'recordedFlights', 'investigationDraft', 'predictionResult']) {
      expect(app.state().physics[key], key).toBe(before.physics[key]);
    }
    expect(app.canvas._inspection).toBe(inspection);
    expect(app.trail.map(point => ({ ...point }))).toEqual(points);
    expect(app.trail.parameters).toBe(originalParameters);
    expect(app.canvas._launch).not.toHaveBeenCalled();
    expect(app.canvas._cancelFlight).not.toHaveBeenCalled();
    expect(reuseButton(app.draw()).props.disabled).toBe(true);
    app.status.dataset.matches = 'true';
    vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(app.status);
  });
});
