import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'anamorphosis', player: walk.spawn('anamorphosis'), anamorphosis: { set: 2 }, ...patch });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const aligned = state => walk.anamorphosisTargets(state.anamorphosis.round, state.anamorphosis.set).reduce((next, value, index) => walk.setAnamorphosisOffset(next, index, value), state);
const observed = state => walk.inspectAnamorphosis(walk.recordAnamorphosis(walk.inspectAnamorphosis(walk.recordAnamorphosis(walk.inspectAnamorphosis(state, 'front')), 'side')), 'front');
const solve = state => walk.checkAnamorphosis(observed(aligned(state)));
const complete = state => solve(walk.nextAnamorphosis(solve(state)));
const midpoint = item => ['x', 'y', 'z'].map(axis => (item.from[axis] + item.to[axis]) / 2);
const length = item => Math.hypot(...['x', 'y', 'z'].map(axis => item.to[axis] - item.from[axis]));
const project = point => [(point.x - 216) / (10 - point.z), (point.y - 1.65) / (10 - point.z)];

async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function input(value) {
  await act(async () => {
    const node = query('[data-walk-anamorphosis-offset]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]'); stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); stage.dispatchEvent(event);
  });
}
async function solveUI() {
  for (const [index, value] of walk.anamorphosisTargets(latest.perceptionWalk.anamorphosis.round, 2).entries()) {
    await click('[data-walk-anamorphosis-choice="' + index + '"]'); await input(value);
  }
  await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="side"]');
  await click('[data-walk-anamorphosis-record]'); await click('[data-walk-anamorphosis-view="front"]'); await click('[data-walk-check]');
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))(); walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready', onStatusChange: fn => { report = fn; }, report: value => report(value), onLayout: vi.fn(), pick: vi.fn(() => null) }; return viewer;
  }) };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); host = root = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('angular anamorphosis geometry', () => {
  it.each([0, 1])('rigidly rotates arrangement%s about fixed midpoints without changing depth or thickness', round => {
    const start = seed({ anamorphosis: { set: 2, round } });
    const initial = walk.anamorphosisObjects(round, start.anamorphosis.offsets, 2);
    const targets = walk.anamorphosisTargets(round, 2), objects = walk.anamorphosisObjects(round, targets, 2);
    const vertices = round ? [[-1.7, 3.3], [0, 1.2], [1.7, 3.3]] : [[-1.7, 1.2], [1.7, 1.2], [0, 3.3]];
    const depths = round ? [1.5, -1.5, .2] : [-2, 0, 2];
    expect(initial[0]).toEqual(objects[0]);
    for (const [i, object] of objects.entries()) {
      expect(length(initial[i])).toBeCloseTo(length(object), 12); expect(initial[i].radius).toBe(object.radius);
      midpoint(object).forEach((value, axis) => expect(midpoint(initial[i])[axis]).toBeCloseTo(value, 12));
      for (const [endpoint, vertex] of [['from', vertices[i]], ['to', vertices[(i + 1) % 3]]]) {
        const factor = (10 - depths[i]) / 10;
        expect(object[endpoint].x).toBeCloseTo(216 + vertex[0] * factor, 12);
        expect(object[endpoint].y).toBeCloseTo(1.65 + (vertex[1] - 1.65) * factor, 12);
        expect(object[endpoint].z).toBe(depths[i]); expect(initial[i][endpoint].z).toBe(depths[i]);
      }
      if (i) {
        const angle = (start.anamorphosis.offsets[i - 1] - targets[i - 1]) * Math.PI / 180;
        const dx = object.to.x - object.from.x, dy = object.to.y - object.from.y;
        expect(initial[i].to.x - initial[i].from.x).toBeCloseTo(dx * Math.cos(angle) - dy * Math.sin(angle), 11);
        expect(initial[i].to.y - initial[i].from.y).toBeCloseTo(dx * Math.sin(angle) + dy * Math.cos(angle), 11);
      }
      const next = objects[(i + 1) % 3], end = project(object.to), beginning = project(next.from);
      end.forEach((value, axis) => expect(value).toBeCloseTo(beginning[axis], 11));
      expect(Math.hypot(...['x', 'y', 'z'].map(axis => object.to[axis] - next.from[axis]))).toBeGreaterThan(1);
      expect(object.radius / (10 - object.from.z)).toBeCloseTo(.0085, 12);
    }
    expect(walk.anamorphosisError(start)).toBeGreaterThan(.02);
    expect(walk.anamorphosisError(aligned(start))).toBeLessThan(1e-10);
    expect(walk.anamorphosisError(walk.inspectAnamorphosis(aligned(start), 'side'))).toBeGreaterThan(.02);
    expect(walk.anamorphosisMatches(aligned(start))).toBe(false);
    expect(walk.anamorphosisMatches(observed(aligned(start)))).toBe(true);
  });

  it('has distinct degree defaults and clamps only the angular set to its degree bounds', () => {
    expect(walk.anamorphosisDefaults(0, 2)).toMatchObject({ set: 2, round: 0, offsets: [-30, 30], selected: 0, seen: 0, completed: [] });
    expect(walk.anamorphosisDefaults(1, 2).offsets).toEqual([30, -30]);
    expect(walk.anamorphosisTargets(0, 2)).toEqual([15, -12]); expect(walk.anamorphosisTargets(1, 2)).toEqual([-18, 9]);
    expect(seed({ anamorphosis: { set: 2, offsets: [-90, 90] } }).anamorphosis.offsets).toEqual([-45, 45]);
    expect(seed({ anamorphosis: { set: 2, offsets: [NaN, Infinity] } }).anamorphosis.offsets).toEqual([-30, 30]);
    const state = seed(); expect(walk.setAnamorphosisOffset(state, 0, -90).anamorphosis.offsets[0]).toBe(-45);
    expect(walk.setAnamorphosisOffset(state, 1, 90).anamorphosis.offsets[1]).toBe(45);
    for (const set of [0, 1]) expect(seed({ anamorphosis: { set, offsets: [-90, 90] } }).anamorphosis.offsets).toEqual([-1.2, 1.2]);
    expect(seed({ anamorphosis: { set: 99 } }).anamorphosis.set).toBe(2);
    expect(walk.normalize(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('keeps the full rotation sweep inside the exhibit boundary and returns independent geometry', () => {
    for (const round of [0, 1]) for (let angle = -45; angle <= 45; angle += 5) {
      const objects = walk.anamorphosisObjects(round, [angle, -angle], 2);
      for (const object of objects) for (const point of [object.from, object.to]) {
        expect(point.x - object.radius).toBeGreaterThan(211.7); expect(point.x + object.radius).toBeLessThan(221.5);
        expect(point.z - object.radius).toBeGreaterThan(-2.45); expect(point.z + object.radius).toBeLessThan(3.2);
        expect(point.y - object.radius).toBeGreaterThan(0);
      }
    }
    const first = walk.anamorphosisObjects(0, [0, 0], 2); first[1].from.x = 999;
    expect(walk.anamorphosisObjects(0, [0, 0], 2)[1].from.x).not.toBe(999);
  });
});

describe('angular set progression and observations', () => {
  it('cycles all three sets with fresh evidence while preserving mastery, notes and viewpoints', () => {
    let state = seed({ anamorphosis: { set: 0 }, notes: { anamorphosis: 'Rotation changes the contour.' }, viewpoints: { anamorphosis: { A: walk.spawn('anamorphosis') } } });
    const notes = structuredClone(state.notes), viewpoints = structuredClone(state.viewpoints);
    for (const set of [0, 1, 2]) {
      expect(state.anamorphosis.set).toBe(set); expect(walk.advanceAnamorphosisSet(state)).toEqual(state);
      const first = solve(state); expect(first.anamorphosis.completed).toEqual([0]); expect(walk.checkAnswer(first)).toBe(false);
      expect(walk.advanceAnamorphosisSet(first)).toEqual(first);
      state = complete(state); expect(state.anamorphosis.completed).toEqual([0, 1]); expect(walk.checkAnswer(state)).toBe(true);
      expect(state.progress.anamorphosis.solved).toBe(true);
      const before = structuredClone(state), next = walk.advanceAnamorphosisSet(state);
      expect(next.anamorphosis).toMatchObject({ set: (set + 1) % 3, round: 0, selected: 0, seen: 0, completed: [], mastered: true });
      expect(next.progress.anamorphosis).toEqual({ solved: true, assisted: false, hints: 0 });
      expect(walk.checkAnswer(next)).toBe(false); expect(next.notes).toEqual(notes); expect(next.viewpoints).toEqual(viewpoints); expect(state).toEqual(before);
      state = next;
    }
    expect(walk.normalize(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it('requires new comparisons after rotating, and rejects checks from the side', () => {
    const state = observed(aligned(seed())); expect(state.anamorphosis.seen).toBe(3);
    expect(walk.setAnamorphosisOffset(state, 0, 15).anamorphosis.seen).toBe(3);
    expect(walk.selectAnamorphosis(state, 1).anamorphosis.seen).toBe(3);
    const changed = walk.setAnamorphosisOffset(state, 0, 15.5); expect(changed.anamorphosis.seen).toBe(0);
    expect(walk.checkAnamorphosis(changed).anamorphosis.completed).toEqual([]);
    expect(walk.checkAnamorphosis(walk.inspectAnamorphosis(state, 'side')).anamorphosis.completed).toEqual([]);
    expect(walk.checkAnamorphosis(state).anamorphosis.completed).toEqual([0]);
  });

  it('never turns assisted angular practice into earned progress and clears assistance on cycling', () => {
    const state = seed({ progress: { anamorphosis: { assisted: true } } }), practice = complete(state);
    expect(practice.anamorphosis).toMatchObject({ set: 2, mastered: false, completed: [] });
    expect(practice.progress.anamorphosis.solved).toBe(false); expect(walk.checkAnswer(practice)).toBe(false);
    const next = walk.advanceAnamorphosisSet(practice);
    expect(next.anamorphosis).toMatchObject({ set: 0, mastered: false, seen: 0, completed: [] });
    expect(next.progress.anamorphosis).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(walk.advanceAnamorphosisSet({ ...practice, activity: 'silhouette' }).anamorphosis.set).toBe(2);
  });
});

describe('first-person angular controls', () => {
  it('exposes degree controls and earns both arrangements through the visible workflow', async () => {
    await mount(); const slider = query('[data-walk-anamorphosis-offset]');
    expect(query('[data-walk-anamorphosis-set-label]').textContent).toBe('Angular alignment');
    expect(slider.min).toBe('-45'); expect(slider.max).toBe('45'); expect(slider.step).toBe('0.5');
    expect(query('[data-walk-anamorphosis-left]')).toBeNull(); expect(query('[data-walk-anamorphosis-nearer]')).toBeNull();
    await click('[data-walk-anamorphosis-clockwise]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(-33);
    await click('[data-walk-anamorphosis-counterclockwise]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(-30);
    await solveUI(); expect(latest.perceptionWalk.anamorphosis.completed).toEqual([0]);
    await click('[data-walk-anamorphosis-next]'); await solveUI();
    expect(latest.perceptionWalk.anamorphosis.completed).toEqual([0, 1]); expect(latest.perceptionWalk.progress.anamorphosis.solved).toBe(true);
    await click('[data-walk-anamorphosis-set-next]'); expect(latest.perceptionWalk.anamorphosis).toMatchObject({ set: 0, mastered: true, completed: [] });
    expect(latest.otherTool.preserved).toBe(37);
  });

  it('uses half-degree fine steppers and disables the outward control at a bound', async () => {
    await mount({ precise: true });
    await click('[data-walk-anamorphosis-clockwise]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(-30.5);
    await click('[data-walk-anamorphosis-counterclockwise]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(-30);
    await input(-45); expect(query('[data-walk-anamorphosis-clockwise]').disabled).toBe(true);
    expect(query('[data-walk-anamorphosis-counterclockwise]').disabled).toBe(false);
    await input(45); expect(query('[data-walk-anamorphosis-counterclockwise]').disabled).toBe(true);
  });

  it.each([false, true])('wraps a direct angle drag across the branch cut with fine=%s', async precise => {
    await mount({ precise }); const camera = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'anamorphosis-B' }); viewer.anamorphosisCoordinate = vi.fn(x => x === 100 ? 179 : -179);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100); await pointer('pointerup', 120, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(precise ? -29.5 : -28, 10);
    expect(latest.perceptionWalk.player).toEqual(camera);
  });

  it('holds the last rotation outside the ray plane and cancels dragging when the viewpoint changes', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'anamorphosis-B' });
    viewer.anamorphosisCoordinate = vi.fn(x => x <= 120 ? x : null);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(-10);
    await pointer('pointermove', 140, 100); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(-10);
    await click('[data-walk-anamorphosis-view="side"]');
    await pointer('pointermove', 110, 100); await pointer('pointerup', 110, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(-10);
  });

  it.each([false, true])('provides horizontal touch and fallback degree dragging with fine=%s', async precise => {
    await mount({ precise }); const camera = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'anamorphosis-B' });
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 140, 100); await pointer('pointerup', 140, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(precise ? -25 : -10);
    viewer.anamorphosisCoordinate = vi.fn(() => 175);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 120, 101, 'touch'); await pointer('pointerup', 120, 101, 'touch');
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(precise ? -22.5 : 0);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 101, 140, 'touch'); await pointer('pointerup', 101, 140, 'touch');
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBe(precise ? -22.5 : 0); expect(latest.perceptionWalk.player).toEqual(camera);
  });

  it('retains Plan selection and target geometry without WebGL, while reveal prevents credit', async () => {
    await mount({ notes: { anamorphosis: 'Keep the side comparison.' } }); await act(async () => viewer.report('failed'));
    const svg = query('[data-walk-anamorphosis-plan]'); expect(svg).toBeTruthy();
    const beam = query('[data-walk-anamorphosis-solid="C"]').parentElement;
    expect(beam.getAttribute('role')).toBe('button'); expect(beam.getAttribute('tabindex')).toBe('0');
    await act(async () => beam.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(latest.perceptionWalk.anamorphosis.selected).toBe(1);
    const before = query('[data-walk-anamorphosis-solid="C"]').outerHTML; await input(-12);
    expect(query('[data-walk-anamorphosis-solid="C"]').outerHTML).not.toBe(before);
    await click('[data-walk-reveal]'); expect(host.querySelectorAll('[data-walk-anamorphosis-guide]')).toHaveLength(3);
    expect(query('[data-walk-anamorphosis-plan]').innerHTML).not.toMatch(/NaN|Infinity/);
    await solveUI(); expect(latest.perceptionWalk.anamorphosis.completed).toEqual([]); expect(latest.perceptionWalk.progress.anamorphosis.assisted).toBe(true);
    await click('[data-walk-reset]'); expect(latest.perceptionWalk.anamorphosis).toMatchObject({ set: 0, mastered: false, completed: [] });
    expect(latest.perceptionWalk.notes.anamorphosis).toBe('Keep the side comparison.'); expect(latest.otherTool.preserved).toBe(37);
  });
});
