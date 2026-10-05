import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { drawPhysicsElementTree } from './helpers/physics_element_tree.js';

let physics;
const trial = { angle: 45, velocity: 15, gravity: 9.8, mass: 1, launchHeight: 0, airResist: false };
const run = (n, extra = {}) => ({ n, angle: 45, vel: 15, grav: 9.8, mass: 1, launchHeight: 0, drag: false, range: 22.959, maxH: 5.74, time: 2.165, modelVersion: 'projectile-v3', ...extra });
beforeAll(() => { new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))(); physics = window.StemLab._physics; render([]); });

describe('guided trial evidence matching', () => {
  it('uses the latest matching run ID, preserves measured values, and returns an immutable copy', () => {
    const source = run(6, { range: 23.123, time: 2.166 });
    const result = physics.findTrialRun(trial, [source, run(1), run(8, { vel: 30 })]);
    expect(result).toEqual(source);
    expect(result).not.toBe(source);
    expect(Object.isFrozen(result)).toBe(true);
    source.range = 999;
    expect(result.range).toBe(23.123);
  });
  it.each([
    ['angle', 46], ['vel', 16], ['grav', 10], ['mass', 2], ['launchHeight', 1], ['drag', true],
  ])('requires captured %s to match the trial', (key, value) => {
    expect(physics.findTrialRun(trial, [run(2, { [key]: value })])).toBeNull();
  });
  it.each([undefined, '', 'projectile-v2', 'projectile-v3 '])('requires current numerical model provenance: %j', modelVersion => {
    expect(physics.findTrialRun(trial, [run(2, { modelVersion })])).toBeNull();
  });
  it.each([
    { time: 0 }, { range: NaN }, { maxH: -1 }, { drag: 'false' }, { n: 0 }, { mass: undefined },
  ])('excludes incomplete or invalid observations: %j', change => {
    expect(physics.findTrialRun(trial, [run(2, change)])).toBeNull();
  });
  it.each([
    null, {}, { ...trial, airResist: 'false' }, { ...trial, launchHeight: undefined },
    { ...trial, launchHeight: 51 }, { ...trial, velocity: 0 }, { ...trial, gravity: 0 }, { ...trial, mass: 11 }, { ...trial, angle: 0 },
  ])('rejects an invalid trial without treating it as collected: %j', input => {
    expect(physics.findTrialRun(input, [run(1)])).toBeNull();
  });
  it('matches elevated horizontal trials and distinguishes height and mass even with drag', () => {
    const elevated = { ...trial, angle: 0, launchHeight: 10, airResist: true, mass: 5 };
    const valid = run(4, { angle: 0, launchHeight: 10, maxH: 10, drag: true, mass: 5 });
    expect(physics.findTrialRun(elevated, [run(1), valid])).toEqual(valid);
    expect(physics.findTrialRun(elevated, [{ ...valid, launchHeight: 9 }])).toBeNull();
    expect(physics.findTrialRun(elevated, [{ ...valid, mass: 1 }])).toBeNull();
  });
  it('uses the existing ground-height legacy convention while requiring model provenance', () => {
    const legacy = run(1); delete legacy.launchHeight;
    expect(physics.findTrialRun(trial, [legacy]).launchHeight).toBe(0);
    delete legacy.modelVersion;
    expect(physics.findTrialRun(trial, [legacy])).toBeNull();
  });
  it.each([undefined, null, 'false', 'true', 0, 1, {}, []])('restoration does not invent drag-off evidence from a malformed captured flag: %j', drag => {
    const malformed = run(1, { drag }), valid = run(2, { vel: 30 });
    const state = physics.normalizeState({ lastFlight: malformed, runLog: [malformed, valid] });
    expect(state.lastFlight).toBeNull();
    expect(state.runLog).toEqual([valid]);
    expect(physics.findTrialRun(trial, state.runLog)).toBeNull();
  });
  it('restoration preserves valid drag flags, missing legacy height, and unknown model provenance', () => {
    const legacy = run(1, { modelVersion: undefined }); delete legacy.launchHeight;
    const state = physics.normalizeState({ runLog: [legacy, run(2, { drag: true })], lastFlight: legacy });
    expect(state.runLog.map(r => r.drag)).toEqual([false, true]);
    expect(state.runLog[0].launchHeight).toBe(0);
    expect(state.lastFlight).toEqual({ ...legacy, launchHeight: 0 });
    expect(physics.findTrialRun(trial, state.runLog)).toBeNull();
  });
  it('handles absent evidence without creating outcomes', () => {
    expect(physics.findTrialRun(trial, undefined)).toBeNull();
    expect(physics.findTrialRun(trial, {})).toBeNull();
    expect(physics.findTrialRun(trial, [null, {}, run(1, { modelVersion: 'old' })])).toBeNull();
  });
});

function render(rows) {
  let state = { physics: { runLog: rows, investigationDraft: { activityId: 'speed_squared', title: 'Keep my title', prediction: 'Keep my prediction', observation: 'Keep my notes', selectedRunIds: [1,2] } } };
  const ctx = { React: { useState: value => [value, () => {}], createElement: (type, props, ...children) => ({ type, props: props || {}, children }) }, icons: {}, props: {}, toolSnapshots: [], gradeLevel: '5th Grade', t: (_key, fallback) => fallback, setToolData: vi.fn(update => { state = update(state); }) };
  return { tree: drawPhysicsElementTree(ctx, state), state: () => state.physics, patch: patch => { state = { physics: { ...state.physics, ...patch } }; } };
}
function find(tree, attribute) {
  if (Array.isArray(tree)) return tree.map(t => find(t, attribute)).find(Boolean);
  if (!tree || typeof tree !== 'object') return undefined;
  return tree.props[attribute] ? tree : find(tree.children, attribute);
}
describe('recorded trial selection callbacks', () => {
  it('reads the latest log at click time and keeps writing and launch settings', () => {
    const app = render([run(1), run(2, { vel: 30 })]), button = find(app.tree, 'data-physics-investigation-select-trials');
    app.patch({ velocity: 42, mass: 9, runLog: [run(1), run(2, { vel: 30 }), run(4)] });
    button.props.onClick();
    expect(app.state().investigationDraft).toMatchObject({ selectedRunIds: [4,2], title: 'Keep my title', prediction: 'Keep my prediction', observation: 'Keep my notes' });
    expect(app.state()).toMatchObject({ velocity: 42, mass: 9 });
  });
  it('cannot select phantom trial evidence after a stale callback and log clearing', () => {
    const app = render([run(1), run(2, { vel: 30 })]), button = find(app.tree, 'data-physics-investigation-select-trials');
    app.patch({ runLog: [], investigationDraft: { activityId: 'speed_squared', title: 'Still here', selectedRunIds: [] } });
    button.props.onClick();
    expect(app.state().runLog).toEqual([]);
    expect(app.state().investigationDraft).toEqual({ activityId: 'speed_squared', title: 'Still here', selectedRunIds: [] });
    expect(app.state().investigationNotice).toContain('Both trials need matching completed measurements');
  });
  it('cannot select the previous activity when a stale callback runs after switching', () => {
    const app = render([run(1), run(2, { vel: 30 })]), button = find(app.tree, 'data-physics-investigation-select-trials');
    app.patch({ investigationDraft: { activityId: 'inverse_gravity', title: 'New activity', selectedRunIds: [] } });
    const before = app.state(); button.props.onClick();
    expect(app.state()).toBe(before);
  });
});
