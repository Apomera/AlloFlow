import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let physics;
let copied;
const run = (n, extra = {}) => ({ n, angle: 45, vel: 25, grav: 9.8, mass: 1, drag: false, range: 60, maxH: 25, time: 3.6, modelVersion: 'projectile-v3', ...extra });
const save = rows => physics.createInvestigation({ title: 'Height investigation', selectedRunIds: rows.map(r => r.n) }, rows, 'heights', '2026-09-28T12:00:00.000Z');

function render(state = {}) {
  return window.StemLab._registry.physics.render({
    React: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) },
    icons: {}, toolData: { physics: state }, setToolData() {}, gradeLevel: '5th Grade',
    t: (_key, fallback) => fallback, props: {}, toolSnapshots: [], addToast() {}, announceToSR() {},
  });
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : find(node.children, predicate);
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join(' ');
  return typeof node === 'object' ? text(node.children) : String(node);
}

beforeAll(() => {
  new Function(readFileSync('stem_lab/stem_tool_physics.js', 'utf8'))();
  physics = window.StemLab._physics;
  render();
});
beforeEach(() => {
  document.getElementById('physicsCanvas')?.remove();
  copied = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copied } });
  window.StemLab.writeClipboard = copied;
});

describe('launch-height record validation', () => {
  it('migrates missing legacy heights to zero without changing recorded model versions or measurements', () => {
    const legacy = run(8, { modelVersion: 'projectile-v2' });
    const state = physics.normalizeState({ runLog: [legacy], lastFlight: legacy });
    expect(state.runLog[0]).toEqual({ ...legacy, launchHeight: 0 });
    expect(state.lastFlight).toEqual({ ...legacy, launchHeight: 0 });
    expect(legacy).not.toHaveProperty('launchHeight');
    expect(save([legacy, run(9, { modelVersion: 'projectile-v2' })]).runs.every(r => r.launchHeight === 0)).toBe(true);
    expect(physics.compareRuns(legacy, run(9)).modelWarning).toBe(true);
  });

  it.each([null, undefined, -1, 51, NaN, Infinity, '12', {}])('rejects supplied invalid saved heights: %j', launchHeight => {
    const bad = run(2, { launchHeight });
    const state = physics.normalizeState({ lastFlight: bad, runLog: [run(1), bad] });
    expect(state.lastFlight).toBeNull();
    expect(state.runLog.map(r => r.n)).toEqual([1]);
    expect(physics.compareRuns(run(1), bad)).toBeNull();
    expect(save([run(1), bad])).toBeNull();
  });

  it('accepts horizontal elevated launches and rejects unsupported ground-level horizontal records', () => {
    const horizontal = run(2, { angle: 0, launchHeight: 10, maxH: 10 });
    expect(physics.normalizeState({ lastFlight: horizontal }).lastFlight).toEqual(horizontal);
    expect(save([run(1), horizontal]).runs[1]).toEqual(horizontal);
    expect(physics.normalizeState({ lastFlight: { ...horizontal, launchHeight: 0 } }).lastFlight).toBeNull();
    expect(physics.normalizeState({ lastFlight: { ...horizontal, maxH: 9 } }).lastFlight).toBeNull();
  });

  it('clamps live height and angle while retaining zero-angle shots above ground', () => {
    expect(physics.normalizeState({ launchHeight: 100, angle: 0 })).toMatchObject({ launchHeight: 50, angle: 0 });
    expect(physics.normalizeState({ launchHeight: -1, angle: 0 })).toMatchObject({ launchHeight: 0, angle: 5 });
    expect(physics.normalizeState({ launchHeight: 10, angle: -10 })).toMatchObject({ launchHeight: 10, angle: 0 });
    expect(physics.normalizeState({ launchHeight: NaN, angle: 0 })).toMatchObject({ launchHeight: 0, angle: 5 });
    for (const mode of ['targetMode', 'challengeActive', 'battleMode']) expect(physics.normalizeState({ [mode]: true, launchHeight: 20, angle: 0 })).toMatchObject({ launchHeight: 0, angle: 5 });
  });

  it('preserves captured pair heights, migrates legacy pairs, and rejects invalid paired evidence', () => {
    const pair = { parameters: { angle: 0, velocity: 25, gravity: 9.8, mass: 1, launchHeight: 10 }, vacuum: { range: 35, maxH: 10, time: 1.4 }, drag: { range: 33, maxH: 10, time: 1.5 } };
    expect(physics.normalizeState({ launchHeight: 40, modelComparison: pair }).modelComparison).toEqual(pair);
    const legacy = { ...pair, parameters: { angle: 45, velocity: 25, gravity: 9.8, mass: 1 } };
    expect(physics.normalizeState({ modelComparison: legacy }).modelComparison.parameters.launchHeight).toBe(0);
    expect(physics.normalizeState({ modelComparison: { ...pair, parameters: { ...pair.parameters, launchHeight: null } } }).modelComparison).toBeNull();
    expect(physics.normalizeState({ modelComparison: { ...pair, vacuum: { ...pair.vacuum, maxH: 9 } } }).modelComparison).toBeNull();
  });
});

describe('height evidence and exports', () => {
  it('captures height as an independent variable in immutable archives and restored reports', () => {
    const elevated = run(11, { launchHeight: 12, range: 70 });
    const saved = save([run(10), elevated]);
    elevated.launchHeight = 30;
    expect(saved.runs[1].launchHeight).toBe(12);
    expect(physics.compareRuns(...saved.runs)).toMatchObject({ fairTest: true, changes: [{ key: 'launchHeight', before: 0, after: 12, unit: 'm' }] });
    const restored = physics.normalizeState({ investigations: JSON.parse(JSON.stringify([saved])), runLog: [] });
    expect(restored.investigations[0]).toEqual(saved);
    const report = physics.formatInvestigationReport(restored.investigations[0]);
    expect(report).toContain('Launch height above ground: 12 m');
    expect(report).toContain('Launch height above ground 0 → 12 m');
    expect(report).toContain('Landing is at ground level. Gravity is uniform.');
    expect(report).toContain('For elevated launches, the equal-height range formula');
    expect(report).not.toContain('Launch and landing are at ground level');
  });

  it('exports saved height in the run CSV and labels the on-screen history column', () => {
    const tree = render({ launchHeight: 40, runLog: [run(7, { launchHeight: 8 })] });
    const log = find(tree, n => n.props['data-physics-run-log']);
    expect(text(log)).toContain('Launch height (m)');
    find(log, n => n.props['aria-label'] === 'Copy the experiment log as CSV for a spreadsheet').props.onClick();
    const [header, row] = copied.mock.calls[0][0].split('\n').map(line => line.split(','));
    expect(row[header.indexOf('launch_height_m')]).toBe('8');
    expect(row[header.indexOf('run')]).toBe('7');
  });

  it('exports captured launch height and first/ground-impact coordinates from the trail', () => {
    const canvas = document.createElement('canvas');
    canvas.id = 'physicsCanvas';
    const trail = [{ t: 0, mX: 0, mY: 8, mVx: 25, mVy: 0 }, { t: 1.3, mX: 32.5, mY: 0, mVx: 25, mVy: -12.74 }];
    Object.assign(trail, { run: 9, angle: 0, velocity: 25, gravity: 9.8, mass: 1, drag: false, launchHeight: 8, modelVersion: 'projectile-v3' });
    canvas._trails = [trail];
    document.body.appendChild(canvas);
    const tree = render({ launchHeight: 40, showFlightData: true });
    find(tree, n => n.props['aria-label'] === 'Copy the flight data as CSV for a spreadsheet').props.onClick();
    const lines = copied.mock.calls[0][0].split('\n');
    expect(lines[0]).toContain('launch_height_m=8');
    expect(lines[0]).toContain('model=projectile-v3');
    expect(lines[2].split(',').map(Number)).toEqual([0, 0, 8, 25, 0, 25]);
    expect(lines[3].split(',').map(Number).slice(0, 3)).toEqual([1.3, 32.5, 0]);
  });

  it('suppresses equal-height power-law claims for elevated runs and unverified model versions', () => {
    const rows = [run(1, { maxH: 15 }), run(2, { vel: 50, range: 240, maxH: 60 })];
    const logText = list => text(find(render({ runLog: list }), n => n.props['data-physics-run-log']));
    expect(logText(rows)).toContain('squared: double the speed');
    expect(logText(rows.map(r => ({ ...r, launchHeight: 10 })))).not.toContain('squared: double the speed');
    const legacy = [rows[0], { ...rows[1], modelVersion: undefined }];
    expect(logText(legacy)).toContain('Model versions are different or unverified');
    expect(logText(legacy)).not.toContain('a fair test');
    expect(logText(legacy)).not.toContain('squared: double the speed');
  });
});
