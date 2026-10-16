import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const query = selector => host.querySelector(selector);
const seed = patch => walk.normalize({ activity: 'silhouette', player: walk.spawn('silhouette'), ...patch });
const solve = state => walk.checkSilhouette(walk.selectSilhouette(walk.setSilhouetteAngle(walk.setSilhouetteAngle(state, 0), 90), walk.silhouetteTarget(state.silhouette.round)));
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
async function input(selector, value) {
  const node = query(selector); expect(node).toBeTruthy();
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function pointer(type, x, y, pointerType = 'mouse') {
  const stage = query('[data-walk-stage]');
  stage.setPointerCapture ||= vi.fn(); stage.hasPointerCapture ||= () => true; stage.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: pointerType } }); stage.dispatchEvent(event);
  });
}
async function key(key, repeat = false) {
  await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key, repeat, bubbles: true })));
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
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  new Function(readFileSync(resolve('stem_lab/perception_walk.js'), 'utf8'))(); walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene = { createViewer: vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready', onStatusChange: fn => { report = fn; }, report: value => report(value), onLayout: vi.fn(), pick: vi.fn(() => null) };
    return viewer;
  }) };
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); host = root = null;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('silhouette geometry and earned progress', () => {
  it('adds room19 without changing existing puzzle data', () => {
    const raw = { activity: 'length', length: { value: 2.75, completed: [0] }, notes: { length: 'Compare endpoints' } }, before = structuredClone(raw), state = walk.normalize(raw);
    expect(walk.activities).toHaveLength(20); expect(walk.activities[18].id).toBe('silhouette');
    expect(walk.nextRoom(state, 1)).toBe('silhouette'); expect(walk.nextRoom(seed(), 1)).toBe('anamorphosis');
    expect(state.length).toMatchObject(raw.length); expect(state.notes.length).toBe(raw.notes.length); expect(raw).toEqual(before); expect(walk.normalize(state)).toEqual(state);
    expect(walk.normalizePlayer({ x: 999 }).x).toBe(223.3);
  });
  it('normalizes malformed state, bounds and duplicate rounds', () => {
    for (const silhouette of [null, [], 'bad', { angle: NaN, round: null }]) expect(seed({ silhouette }).silhouette.angle).toBe(0);
    const state = seed({ silhouette: { round: 99, angle: 999, choice: 'C', seen: 99, completed: [1, 1, 0, 2, '0'] } });
    expect(state.silhouette).toMatchObject({ round: 1, angle: 90, choice: '', seen: 3, completed: [0, 1] });
    expect(state.progress.silhouette.solved).toBe(true);
    expect(seed({ progress: { silhouette: { solved: true } } }).progress.silhouette.solved).toBe(false);
    expect(seed({ silhouette: { completed: [0, 1] }, progress: { silhouette: { assisted: true } } }).progress.silhouette.solved).toBe(false);
  });
  it.each([0, 1])('has connected solids sharing only the front target in round%s', round => {
    const objects = walk.silhouetteObjects(round, 0), reference = walk.silhouetteReference(round);
    expect(objects.map(object => object.choice)).toEqual(['A', 'B']);
    for (const object of objects) {
      const cells = object.cells, keys = new Set(cells.map(cell => cell.join(',')));
      expect(keys.size).toBe(cells.length);
      const reached = new Set([cells[0].join(',')]), queue = [cells[0]];
      while (queue.length) {
        const cell = queue.shift();
        for (const next of cells) if (!reached.has(next.join(',')) && next.reduce((sum, n, i) => sum + Math.abs(n - cell[i]), 0) === 1) { reached.add(next.join(',')); queue.push(next); }
      }
      expect(reached.size).toBe(cells.length);
      expect(walk.silhouetteProjection(cells, 'front')).toEqual(reference.front);
      const matches = JSON.stringify(walk.silhouetteProjection(cells, 'side')) === JSON.stringify(reference.side);
      expect(matches).toBe(object.choice === walk.silhouetteTarget(round));
    }
  });
  it('changes the correct choice and target between trials without leaking mutable geometry', () => {
    expect(walk.silhouetteTarget(0)).not.toBe(walk.silhouetteTarget(1));
    expect(walk.silhouetteReference(0)).not.toEqual(walk.silhouetteReference(1));
    const objects = walk.silhouetteObjects(0, 0), original = objects[0].cells[0][0]; objects[0].cells[0][0] = 999;
    expect(walk.silhouetteObjects(0, 90)[0].cells[0][0]).toBe(original);
  });
  it('requires front and side evidence and rejects the other candidate', () => {
    let state = seed(); state = walk.selectSilhouette(state, walk.silhouetteTarget(0));
    expect(walk.checkSilhouette(state).silhouette.completed).toEqual([]);
    state = walk.setSilhouetteAngle(state, 45); expect(walk.checkSilhouette(state).silhouette.completed).toEqual([]);
    state = walk.setSilhouetteAngle(state, 90); expect(state.silhouette.seen).toBe(3);
    const wrong = walk.silhouetteTarget(0) === 'A' ? 'B' : 'A';
    expect(walk.checkSilhouette(walk.selectSilhouette(state, wrong)).silhouette.completed).toEqual([]);
    expect(walk.checkSilhouette(state).silhouette.completed).toEqual([0]);
  });
  it('earns each trial once and preserves old notes and saved views on next trial', () => {
    const initial = seed({ notes: { silhouette: 'The front hides depth' }, viewpoints: { silhouette: { A: walk.spawn('silhouette') } } });
    expect(walk.nextSilhouette(initial).silhouette.round).toBe(0);
    const first = solve(initial); expect(walk.checkSilhouette(first).silhouette.completed).toEqual([0]);
    const next = walk.nextSilhouette(first); expect(next.silhouette.round).toBe(1); expect(next.silhouette.choice).toBe(''); expect(next.silhouette.seen).not.toBe(3);
    const second = solve(next); expect(second.silhouette.completed).toEqual([0, 1]); expect(second.progress.silhouette.solved).toBe(true);
    expect(second.notes).toEqual(initial.notes); expect(second.viewpoints).toEqual(initial.viewpoints);
  });
  it.each([{ x: 204, z: 11, yaw: 180, pitch: 0 }, { x: 192, z: 11, yaw: 0, pitch: 0 }, { x: 204, z: 1, yaw: 0, pitch: 0 }])('rejects manipulations outside the viewing area %o', player => {
    const state = seed({ player }), before = structuredClone(state.silhouette);
    expect(walk.canObserveSilhouette(state)).toBe(false);
    expect(walk.setSilhouetteAngle(state, 90).silhouette).toEqual(before);
    expect(walk.selectSilhouette(state, 'A').silhouette).toEqual(before);
    expect(solve(state).silhouette.completed).toEqual([]);
  });
  it('does not award assisted exploration', () => {
    const state = solve(seed({ progress: { silhouette: { assisted: true } } }));
    expect(state.silhouette.completed).toEqual([]); expect(state.progress.silhouette.solved).toBe(false);
    expect(walk.nextSilhouette(state).silhouette.round).toBe(1);
  });
  it.each([201.6, 206.4])('keeps the player outside the physical pedestal at x%s', x => {
    let player = { x, z: 5, yaw: 0, pitch: 0 };
    for (let i = 0; i < 5; i++) player = walk.movePlayer(player, 'forward', 2, -1);
    expect(player.z).toBeGreaterThanOrEqual(1.75); expect(player.z).toBeLessThan(2);
    const repaired = seed({ player: { x, z: 0, yaw: 0, pitch: 0 } }).player;
    expect(Math.abs(repaired.x - x) >= 1.75 || Math.abs(repaired.z) >= 1.75).toBe(true);
  });
});

describe('silhouette first-person controls', () => {
  it('solves both trials using accessible controls and preserves unrelated state', async () => {
    await mount();
    for (const round of [0, 1]) {
      await input('[data-walk-silhouette-angle]', 90);
      await click('[data-walk-silhouette-choice="' + walk.silhouetteTarget(round) + '"]'); await click('[data-walk-check]');
      expect(latest.perceptionWalk.silhouette.completed).toContain(round);
      if (!round) await click('[data-walk-silhouette-next]');
    }
    expect(latest.perceptionWalk.progress.silhouette.solved).toBe(true); expect(latest.otherTool.preserved).toBe(37);
    await click('[data-walk-reveal]'); expect(latest.perceptionWalk.progress.silhouette.assisted).toBe(false);
  });
  it('keeps the Plan fallback interactive', async () => {
    await mount(); await act(async () => viewer.report('failed')); expect(query('[data-walk-silhouette-plan]')).toBeTruthy();
    const before = query('[data-walk-silhouette-plan]').innerHTML;
    await input('[data-walk-silhouette-angle]', 90); expect(query('[data-walk-silhouette-plan]').innerHTML).not.toBe(before);
    expect(query('[data-walk-silhouette-plan]').innerHTML).not.toMatch(/NaN|Infinity/);
    await click('[data-walk-silhouette-choice="' + walk.silhouetteTarget(0) + '"]'); await click('[data-walk-check]'); expect(latest.perceptionWalk.silhouette.completed).toEqual([0]);
  });
  it.each(['mouse', 'touch'])('turns the physical dial with %s without moving the camera', async pointerType => {
    await mount(); viewer.pick.mockReturnValue({ id: 'silhouette-dial' }); const player = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100, pointerType); await pointer('pointermove', 150, 102, pointerType); await pointer('pointerup', 150, 102, pointerType);
    expect(latest.perceptionWalk.silhouette.angle).toBeGreaterThan(0); expect(latest.perceptionWalk.player).toEqual(player);
    expect(latest.perceptionWalk.silhouette.completed).toEqual([]);
  });
  it('preserves native vertical touch scrolling', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'silhouette-dial' }); const before = structuredClone(latest.perceptionWalk);
    await pointer('pointerdown', 100, 100, 'touch'); await pointer('pointermove', 102, 160, 'touch'); await pointer('pointerup', 102, 160, 'touch'); expect(latest.perceptionWalk).toEqual(before);
  });
  it('uses crosshair selection and ignores repeated interaction keys', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'silhouette-dial' }); await key('e'); const angle = latest.perceptionWalk.silhouette.angle;
    expect(angle).toBeGreaterThan(0); await key('e', true); expect(latest.perceptionWalk.silhouette.angle).toBe(angle);
    viewer.pick.mockReturnValue({ id: 'silhouette-A' }); await key('e'); expect(latest.perceptionWalk.silhouette.choice).toBe('A');
    viewer.pick.mockReturnValue({ id: 'silhouette-B' }); await click('[data-walk-interact]'); expect(latest.perceptionWalk.silhouette.choice).toBe('B');
  });
  it.each(['pointercancel', 'lostpointercapture', 'blur', 'room', 'plan'])('stops dial dragging after %s', async action => {
    await mount(); viewer.pick.mockReturnValue({ id: 'silhouette-dial' });
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 130, 100);
    if (action === 'blur') await act(async () => window.dispatchEvent(new Event('blur')));
    else if (action === 'room') await click('[data-walk-activity="length"]');
    else if (action === 'plan') await click('[data-walk-diagram-toggle]');
    else await pointer(action, 130, 100);
    const angle = latest.perceptionWalk.silhouette.angle; await pointer('pointermove', 180, 100); await pointer('pointerup', 180, 100); expect(latest.perceptionWalk.silhouette.angle).toBe(angle);
  });
});
