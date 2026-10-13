import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, previousLab, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'relief', player: walk.spawn('relief'), ...patch });
const defaults = () => ({ round: 0, lightAngle: 0, seen: 1, choice: '', completed: [] });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const magnitude = vector => Math.hypot(vector.x, vector.y, vector.z);
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };

async function input(selector, value) {
  const node = query(selector); expect(node).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch), otherTool: { preserved: 37 } }); latest = data;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}

beforeEach(() => {
  previousLab = window.StemLab; globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))();
  walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), pick: vi.fn(() => null), onLayout: vi.fn() };
    return viewer;
  }) };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); host = root = null; window.StemLab = previousLab;
  vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('relief geometry and illumination', () => {
  it('provides fresh equal-size panels with exactly one depression in each round', () => {
    for (const round of [0, 1]) {
      const objects = walk.reliefObjects(round);
      expect(objects.map(item => item.choice)).toEqual(['A', 'B']);
      expect(objects.map(item => [item.x, item.y, item.z])).toEqual([[106, 2.3, 0], [110, 2.3, 0]]);
      expect(objects.every(item => item.width === 3.2 && item.height === 3.2 && item.radius === 1.25)).toBe(true);
      expect(objects.filter(item => item.depth < 0).map(item => item.choice)).toEqual([walk.reliefTarget(round)]);
      expect(objects.map(item => Math.abs(item.depth))).toEqual([0.7, 0.7]);
      objects[0].depth = -999;
      expect(Math.abs(walk.reliefObjects(round)[0].depth)).toBe(0.7);
    }
    expect(walk.reliefTarget(0)).toBe('B'); expect(walk.reliefTarget(1)).toBe('A');
  });

  it('joins a genuinely three-dimensional smooth bump to the flat surrounding panel', () => {
    for (const item of walk.reliefObjects(0)) {
      const center = walk.reliefSurface(item, 0, 0);
      expect(center.z).toBe(item.depth); expect(center.normal.x).toBeCloseTo(0, 12);
      expect(center.normal.y).toBeCloseTo(0, 12); expect(center.normal.z).toBe(1);
      for (const [x, y] of [[0.4, 0.3], [-0.8, 0.2], [0.2, -1], [0.5, 0.5]]) {
        const surface = walk.reliefSurface(item, x, y), q = 1 - (x * x + y * y) / item.radius ** 2;
        expect(surface.z).toBeCloseTo(item.depth * q * q, 12);
        expect(magnitude(surface.normal)).toBeCloseTo(1, 12);
        expect(surface.normal.z).toBeGreaterThan(0);
        const epsilon = 1e-5;
        const dx = (walk.reliefSurface(item, x + epsilon, y).z - walk.reliefSurface(item, x - epsilon, y).z) / (2 * epsilon);
        const dy = (walk.reliefSurface(item, x, y + epsilon).z - walk.reliefSurface(item, x, y - epsilon).z) / (2 * epsilon);
        expect(dot(surface.normal, { x: 1, y: 0, z: dx })).toBeCloseTo(0, 8);
        expect(dot(surface.normal, { x: 0, y: 1, z: dy })).toBeCloseTo(0, 8);
      }
      for (const [x, y] of [[item.radius, 0], [-item.radius, 0], [0, item.radius], [1.6, 1.6]]) {
        const edge = walk.reliefSurface(item, x, y);
        expect(edge.z).toBeCloseTo(0, 12); expect(edge.normal.x).toBeCloseTo(0, 12);
        expect(edge.normal.y).toBeCloseTo(0, 12); expect(edge.normal.z).toBe(1);
      }
      expect(walk.reliefSurface(item, item.radius - 1e-6, 0).normal.z).toBeCloseTo(1, 9);
    }
  });

  it('reverses relief depth and lateral normals without changing the panel footprint', () => {
    const [raised, recessed] = walk.reliefObjects(0);
    for (const x of [-1, -0.4, 0, 0.4, 1]) for (const y of [-1, -0.4, 0, 0.4, 1]) {
      const a = walk.reliefSurface(raised, x, y), b = walk.reliefSurface(recessed, x, y);
      expect(a.z).toBeCloseTo(-b.z, 12);
      expect(a.normal.x).toBeCloseTo(-b.normal.x, 12);
      expect(a.normal.y).toBeCloseTo(-b.normal.y, 12);
      expect(a.normal.z).toBeCloseTo(b.normal.z, 12);
    }
  });

  it('orbits a unit directional light above, beside and below the unchanged surface', () => {
    for (const angle of [-360, -45, 0, 45, 90, 180, 270, 360, 720]) {
      const light = walk.reliefLight(angle), radians = angle * Math.PI / 180;
      expect(magnitude(light)).toBeCloseTo(1, 12);
      expect(light.x).toBeCloseTo(Math.sin(radians) * Math.sqrt(0.75), 12);
      expect(light.y).toBeCloseTo(Math.cos(radians) * Math.sqrt(0.75), 12);
      expect(light.z).toBe(0.5);
    }
    expect(walk.reliefLight(0).y).toBeGreaterThan(0);
    expect(walk.reliefLight(180).y).toBeLessThan(0);
  });

  it('preserves the shape-from-shading ambiguity under a half-turn of the light', () => {
    const [raised, recessed] = walk.reliefObjects(0);
    for (const x of [-0.8, -0.2, 0.2, 0.8]) for (const y of [-0.8, -0.2, 0.2, 0.8]) for (const angle of [0, 45, 90, 180]) {
      const a = walk.reliefSurface(raised, x, y).normal, b = walk.reliefSurface(recessed, x, y).normal;
      expect(dot(a, walk.reliefLight(angle))).toBeCloseTo(dot(b, walk.reliefLight(angle + 180)), 12);
    }
    const upper = walk.reliefSurface(raised, 0, 0.6).normal;
    expect(dot(upper, walk.reliefLight(0))).toBeGreaterThan(dot(upper, walk.reliefLight(180)));
  });

  it('uses bounded Lambertian shading consistently with the analytic surface normal', () => {
    for (const item of walk.reliefObjects(0)) for (const x of [-1, 0, 0.4, 1.5]) for (const y of [-1, 0, 0.6, 1.5]) for (const angle of [0, 45, 90, 180, 270]) {
      const expected = 0.18 + 0.82 * Math.max(0, dot(walk.reliefSurface(item, x, y).normal, walk.reliefLight(angle)));
      const actual = walk.reliefShade(item, x, y, angle);
      expect(actual).toBeCloseTo(expected, 12); expect(actual).toBeGreaterThanOrEqual(0.18); expect(actual).toBeLessThanOrEqual(1);
    }
    const [raised, recessed] = walk.reliefObjects(0);
    expect(walk.reliefShade(raised, 0, 0.6, 0)).toBeCloseTo(walk.reliefShade(recessed, 0, 0.6, 180), 12);
    expect(walk.reliefShade(raised, 1.5, 1.5, 0)).toBeCloseTo(0.59, 12);
  });
});

describe('relief saved state and scoring', () => {
  it('migrates legacy saves without disturbing the ten existing activities', () => {
    const old = { activity: 'rotation', player: walk.spawn('rotation'), rotation: { completed: [0, 1] },
      notes: { rotation: 'Keep both solved pairs.', shadow: 'Keep this observation.' }, progress: { shadow: { solved: true } } };
    const before = structuredClone(old), state = walk.normalize(old);
    expect(state.relief).toEqual(defaults());
    expect(state.progress.relief).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(state.notes.relief).toBe(''); expect(state.notes.rotation).toBe(old.notes.rotation);
    expect(state.progress.rotation.solved).toBe(true); expect(state.progress.shadow.solved).toBe(true);
    expect(state.player).toEqual(old.player); expect(old).toEqual(before);
    expect(walk.normalize(state)).toEqual(state);
  });

  it('normalizes partial, malformed and duplicated state without fabricating a solve', () => {
    expect(seed().relief).toEqual(defaults());
    const state = seed({ relief: { round: 8, lightAngle: -25, seen: 9, choice: 'C', completed: [-1, 0, 0, 1, 2, 0.5, '1', null] } });
    expect(state.relief).toEqual({ round: 1, lightAngle: 335, seen: 3, choice: '', completed: [0, 1] });
    expect(state.progress.relief.solved).toBe(true);
    expect(seed({ progress: { relief: { solved: true } } }).progress.relief.solved).toBe(false);
    expect(seed({ relief: { completed: [0, 1] }, progress: { relief: { assisted: true } } }).progress.relief.solved).toBe(false);
    for (const relief of [null, [], { round: 'bad', lightAngle: NaN, seen: 'bad', choice: [], completed: 'bad' }]) {
      expect(seed({ relief }).relief).toEqual(defaults());
    }
  });

  it('wraps the lamp angle and requires observing both opposed lighting conditions', () => {
    const state = seed({ notes: { relief: 'The shape stays fixed.' }, shadowAngle: 123 }), before = structuredClone(state);
    const lateral = walk.turnReliefLight(state, 90);
    expect(lateral.relief).toEqual({ ...defaults(), lightAngle: 90 });
    const lower = walk.turnReliefLight(lateral, -180);
    expect(lower.relief).toEqual({ ...defaults(), lightAngle: 180, seen: 3 });
    const upper = walk.turnReliefLight(lower, 720);
    expect(upper.relief.lightAngle).toBe(0); expect(upper.relief.seen).toBe(3);
    expect(upper.notes).toEqual(state.notes); expect(upper.shadowAngle).toBe(123); expect(upper.player).toEqual(state.player);
    expect(state).toEqual(before);
    for (const value of [null, '', 'bad', NaN, Infinity]) expect(walk.turnReliefLight(state, value)).toEqual(state);
  });

  it('records only the narrow above and below lighting bands', () => {
    for (const value of [150, 180, 210]) expect(walk.turnReliefLight(seed(), value).relief.seen).toBe(3);
    for (const value of [31, 90, 149.99, 210.01, 270, 329]) expect(walk.turnReliefLight(seed(), value).relief.seen).toBe(1);
    const lower = seed({ relief: { round: 1, lightAngle: 180, seen: 2 } });
    for (const value of [0, 30, 330, 360]) expect(walk.turnReliefLight(lower, value).relief.seen).toBe(3);
    for (const value of [30.01, 90, 270, 329.99]) expect(walk.turnReliefLight(lower, value).relief.seen).toBe(2);
  });

  it('limits observation to the room and a view facing the relief panels', () => {
    expect(walk.canObserveRelief(seed())).toBe(true);
    for (const patch of [{ activity: 'rotation' }, { player: { x: 101, z: 9, yaw: 0, pitch: 0 } },
      { player: { x: 115, z: 9, yaw: 0, pitch: 0 } }, { player: { x: 108, z: 12.01, yaw: 0, pitch: 0 } },
      { player: { x: 108, z: -2, yaw: 0, pitch: 0 } }, { player: { x: 108, z: 9, yaw: 180, pitch: 0 } },
      { player: { x: 108, z: 9, yaw: 0, pitch: 45 } }]) {
      const state = seed({ relief: { seen: 3, choice: 'B' }, ...patch });
      expect(walk.canObserveRelief(state)).toBe(false);
      expect(walk.turnReliefLight(state, 180)).toEqual(state);
      expect(walk.chooseRelief(state, 'A')).toEqual(state);
      expect(walk.checkRelief(state).relief.completed).toEqual([]);
    }
  });

  it('rejects invalid choices and leaves other puzzles and notes unchanged', () => {
    const state = seed({ notes: { relief: 'The edge is useful.', rotation: 'Saved note.' }, rotation: { completed: [0] } });
    const original = structuredClone(state);
    for (const value of ['', 'R', 'C', 'a', null, 0, {}, ['A']]) expect(walk.chooseRelief(state, value)).toEqual(state);
    for (const choice of ['A', 'B']) {
      const result = walk.chooseRelief(state, choice);
      expect(result.relief).toEqual({ ...state.relief, choice });
      expect(result.player).toEqual(state.player); expect(result.rotation).toEqual(state.rotation);
      expect(result.notes).toEqual(state.notes); expect(result.progress).toEqual(state.progress);
    }
    expect(state).toEqual(original);
  });

  it('scores the correct depression only after both lighting conditions have been observed', () => {
    expect(walk.checkRelief(seed({ relief: { choice: 'B' } })).relief.completed).toEqual([]);
    expect(walk.checkRelief(seed({ relief: { seen: 3, choice: 'A' } })).relief.completed).toEqual([]);
    expect(walk.checkRelief(seed({ relief: { seen: 3 } })).relief.completed).toEqual([]);
    const first = walk.checkRelief(seed({ relief: { seen: 3, choice: 'B' } }));
    expect(first.relief.completed).toEqual([0]); expect(first.progress.relief.solved).toBe(false);
    expect(walk.checkRelief(first)).toEqual(first);
    const second = walk.nextRelief(first);
    expect(second.relief).toEqual({ round: 1, lightAngle: 180, seen: 2, choice: '', completed: [0] });
    const observed = walk.turnReliefLight(second, 0);
    const completed = walk.checkRelief(walk.chooseRelief(observed, 'A'));
    expect(completed.relief.completed).toEqual([0, 1]); expect(completed.progress.relief.solved).toBe(true);
    const replay = walk.nextRelief(completed);
    expect(replay.relief).toEqual({ ...defaults(), completed: [0, 1] }); expect(replay.progress.relief.solved).toBe(true);
  });

  it('gates the next round and keeps revealed exploration unscored', () => {
    const initial = seed(); expect(walk.nextRelief(initial)).toEqual(initial);
    const wrong = seed({ relief: { seen: 3, choice: 'A' } }); expect(walk.nextRelief(wrong)).toEqual(wrong);
    const assisted = seed({ relief: { seen: 3, choice: 'B' }, progress: { relief: { assisted: true } } });
    expect(walk.checkRelief(assisted).relief.completed).toEqual([]);
    const second = walk.nextRelief(assisted);
    expect(second.relief.round).toBe(1); expect(second.relief.completed).toEqual([]);
    expect(second.progress.relief).toEqual(assisted.progress.relief);
  });
});

describe('relief first-person inspection', () => {
  it('offers six safe viewpoints looking toward the physical panel centers', () => {
    const views = walk.reliefInspectionViews();
    expect(views).toHaveLength(6); expect(new Set(views.map(view => view.choice + '-' + view.side)).size).toBe(6);
    expect(walk.spawn('relief')).toEqual({ x: 108, z: 9, yaw: 0, pitch: 0 });
    for (const view of views) {
      const x = view.choice === 'A' ? 106 : 110, p = view.player;
      expect(['A', 'B']).toContain(view.choice); expect(['front', 'left', 'right']).toContain(view.side);
      expect(Math.hypot(p.x - x, p.z)).toBeCloseTo(4.4, 12);
      expect(p.yaw).toBeCloseTo(Math.atan2(x - p.x, p.z) * 180 / Math.PI, 10);
      expect(p.pitch).toBeCloseTo(Math.atan2(0.65, 4.4) * 180 / Math.PI, 10);
      expect(p.x).toBeGreaterThan(102); expect(p.x).toBeLessThan(114); expect(p.z).toBeGreaterThan(1.3);
      for (const key of ['x', 'z', 'yaw', 'pitch']) {
        expect(seed({ player: p }).player[key]).toBeCloseTo(p[key], 12);
        expect(walk.movePlayer(p, 'forward', 0)[key]).toBeCloseTo(p[key], 12);
      }
      expect(walk.canObserveRelief(seed({ player: p }))).toBe(true);
    }
    views[0].player.x = -999; views[1].choice = 'invalid';
    expect(walk.reliefInspectionViews()[0].player.x).toBe(106); expect(walk.reliefInspectionViews()[1].choice).toBe('A');
  });

  it('changes viewpoint without choosing an answer or changing geometry, lighting and earned progress', () => {
    const state = seed({ relief: { round: 1, lightAngle: 37, seen: 3, choice: 'B', completed: [0, 1] },
      notes: { relief: 'Saved observation.' }, progress: { rotation: { solved: true } }, rotation: { completed: [0, 1] } });
    const original = structuredClone(state);
    for (const view of walk.reliefInspectionViews()) {
      const result = walk.inspectRelief(state, view.choice, view.side);
      expect(result).toEqual({ ...state, player: view.player });
      expect(result.progress.relief.solved).toBe(true);
      expect(walk.reliefInspection(JSON.parse(JSON.stringify(result)))).toEqual(view);
    }
    expect(state).toEqual(original);
  });

  it('rejects invalid inspections and clears the active viewpoint after free movement or look', () => {
    const state = seed(); expect(walk.reliefInspection(state)).toBeNull();
    for (const choice of ['', 'R', 'C', null, 0, {}, ['A']]) expect(walk.inspectRelief(state, choice, 'front')).toEqual(state);
    for (const side of ['', 'back', 'LEFT', null, 0, {}, ['left']]) expect(walk.inspectRelief(state, 'A', side)).toEqual(state);
    const other = seed({ activity: 'rotation' });
    expect(walk.inspectRelief(other, 'A', 'front')).toEqual(other); expect(walk.reliefInspection(other)).toBeNull();
    for (const view of walk.reliefInspectionViews()) {
      const inspected = walk.inspectRelief(state, view.choice, view.side);
      for (const key of ['x', 'z', 'yaw', 'pitch']) {
        expect(walk.reliefInspection({ ...inspected, player: { ...inspected.player, [key]: inspected.player[key] + 0.01 } })).toBeNull();
      }
      const returned = walk.reliefInspection(inspected); returned.player.x = 0;
      expect(walk.reliefInspection(inspected)).toEqual(view);
    }
  });
});

describe('relief interactive controls', () => {
  it('connects the lamp, answer and next-round controls to both scored rounds', async () => {
    await mount(); expect(query('[data-walk-relief-next]').disabled).toBe(true);
    await click('[data-walk-relief-choice="B"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.relief.completed).toEqual([]);
    await input('[data-walk-relief-angle]', 90);
    expect(latest.perceptionWalk.relief).toMatchObject({ lightAngle: 90, seen: 1 });
    await click('[data-walk-relief-light="below"]');
    expect(latest.perceptionWalk.relief).toMatchObject({ lightAngle: 180, seen: 3 });
    await click('[data-walk-check]'); expect(latest.perceptionWalk.relief.completed).toEqual([0]);
    expect(query('[data-walk-relief-next]').disabled).toBe(false);
    await click('[data-walk-relief-next]');
    expect(latest.perceptionWalk.relief).toEqual({ round: 1, lightAngle: 180, seen: 2, choice: '', completed: [0] });
    await click('[data-walk-relief-light="above"]'); await click('[data-walk-relief-choice="A"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.relief).toMatchObject({ solved: true, assisted: false });
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('inspects either panel from three sides without treating inspection as an answer', async () => {
    await mount({ relief: { lightAngle: 51, choice: 'B' }, notes: { relief: 'Keep this observation.' } });
    const original = structuredClone(latest.perceptionWalk);
    await click('[data-walk-relief-inspect="A"]');
    expect(walk.reliefInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'front' });
    await click('[data-walk-relief-view="left"]');
    expect(walk.reliefInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'left' });
    await click('[data-walk-relief-inspect="B"]');
    expect(walk.reliefInspection(latest.perceptionWalk)).toMatchObject({ choice: 'B' });
    await click('[data-walk-relief-view="right"]');
    expect(walk.reliefInspection(latest.perceptionWalk)).toMatchObject({ choice: 'B', side: 'right' });
    expect(latest.perceptionWalk.relief).toEqual(original.relief);
    expect(latest.perceptionWalk.notes).toEqual(original.notes); expect(latest.perceptionWalk.progress).toEqual(original.progress);
    await click('[data-walk-relief-overview]'); expect(latest.perceptionWalk).toEqual(original);
  });

  it('renders the relief in Plan with working lighting and inspection controls', async () => {
    await mount(); await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-relief-plan]')).toBeTruthy(); expect(query('[data-walk-relief-profile]')).toBeNull();
    const before = query('[data-walk-relief-plan]').innerHTML;
    await click('[data-walk-relief-light="below"]');
    expect(query('[data-walk-relief-plan]').innerHTML).not.toBe(before);
    expect(latest.perceptionWalk.relief.seen).toBe(3);
    await click('[data-walk-relief-inspect="A"]'); await click('[data-walk-relief-view="left"]');
    expect(walk.reliefInspection(latest.perceptionWalk)).toMatchObject({ choice: 'A', side: 'left' });
    expect(query('[data-walk-relief-plan]')).toBeTruthy();
    await click('[data-walk-relief-overview]'); await click('[data-walk-diagram-toggle]');
    await act(async () => viewer.report('failed'));
    expect(query('[data-walk-relief-plan]')).toBeTruthy();
    await click('[data-walk-relief-light="above"]'); expect(latest.perceptionWalk.relief.lightAngle).toBe(0);
  });

  it('keeps revealed exploration unscored and resets only the relief puzzle while preserving notes', async () => {
    await mount({ relief: { completed: [0, 1], seen: 3, choice: 'B' }, rotation: { completed: [0, 1] }, notes: { relief: 'Keep the evidence.' } });
    await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.progress.relief).toMatchObject({ solved: true, assisted: false });
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.relief).toEqual(defaults()); expect(latest.perceptionWalk.notes.relief).toBe('Keep the evidence.');
    expect(latest.perceptionWalk.progress.rotation.solved).toBe(true); expect(latest.otherTool).toEqual({ preserved: 37 });
    await click('[data-walk-diagram-toggle]'); await click('[data-walk-reveal]');
    expect(query('[data-walk-relief-profile]')).toBeTruthy();
    expect(latest.perceptionWalk.progress.relief).toMatchObject({ solved: false, assisted: true });
    await click('[data-walk-relief-light="below"]'); await click('[data-walk-relief-choice="B"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.relief.completed).toEqual([]);
    await click('[data-walk-relief-next]'); expect(latest.perceptionWalk.relief.round).toBe(1);
    expect(latest.perceptionWalk.progress.relief.solved).toBe(false);
  });
});
