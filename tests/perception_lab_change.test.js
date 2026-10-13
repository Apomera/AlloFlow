import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const load = file => new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
let walk, host, root, latest, replace, viewer;
const query = selector => host.querySelector(selector);
const seed = patch => walk.normalize({ activity: 'change', player: walk.spawn('change'), ...patch });

async function click(selector) {
  const node = query(selector);
  expect(node).toBeTruthy();
  await act(async () => node.click());
}
async function input(selector, value) {
  const node = query(selector);
  expect(node).toBeTruthy();
  await act(async () => {
    const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function pointer(type, x, y, selector = '[data-walk-stage]') {
  const node = query(selector);
  node.setPointerCapture = vi.fn(); node.hasPointerCapture = () => true; node.releasePointerCapture = vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } });
    node.dispatchEvent(event);
  });
}
async function keyboard(key) {
  await act(async () => query('[data-walk-stage]').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
}
async function patchState(patch) {
  await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, ...patch } })));
}
async function mount(patch = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed(patch),
      perceptionGallery: { note: 'Keep gallery observations.' }, otherTool: { preserved: 37 } });
    latest = data; replace = setData;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: vi.fn() });
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
async function compareAndChoose(id) {
  await click('[data-walk-change-shutter]'); await click('[data-walk-change-shutter]');
  await click('[data-walk-change-choice="' + id + '"]'); await click('[data-walk-check]');
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); load('stem_lab/perception_walk.js'); load('stem_lab/perception_walk_scene.js');
  walk = window.StemLab.PerceptionWalk;
  window.StemLab.PerceptionWalkScene.createViewer = vi.fn(() => {
    let report = () => {};
    viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), pick: vi.fn(() => null), onLayout: vi.fn() };
    return viewer;
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.useRealTimers(); vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('change-room observations', () => {
  it('changes exactly one solid between each pair and returns independent geometry', () => {
    expect([0, 1, 2].map(walk.changeTarget)).toEqual(['B', 'D', 'A']);
    for (const round of [0, 1, 2]) {
      const before = walk.changeObjects(round, 0), after = walk.changeObjects(round, 1);
      expect(before.map(item => item.id)).toEqual(['change-A', 'change-B', 'change-C', 'change-D', 'change-E']);
      expect(before.map(item => item.choice)).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(after.map(item => item.id)).toEqual(before.map(item => item.id));
      expect(before.filter((item, index) => JSON.stringify(item) !== JSON.stringify(after[index])).map(item => item.choice)).toEqual([walk.changeTarget(round)]);
      expect(before.every(item => [item.x, item.y, item.z, item.height].every(Number.isFinite))).toBe(true);
      before[0].x = -999;
      expect(walk.changeObjects(round, 0)[0].x).not.toBe(-999);
    }
    expect(walk.changeObjects(0, 0).find(item => item.choice === 'B').z).toBe(1.2);
    expect(walk.changeObjects(0, 1).find(item => item.choice === 'B').z).toBe(-0.3);
    const short = walk.changeObjects(1, 0).find(item => item.choice === 'D'), tall = walk.changeObjects(1, 1).find(item => item.choice === 'D');
    expect(short.height).toBe(1); expect(tall.height).toBe(1.8);
    expect(short.y - short.height / 2).toBeCloseTo(0.9); expect(tall.y - tall.height / 2).toBeCloseTo(0.9);
    expect(walk.changeObjects(2, 0).find(item => item.choice === 'A').rotation).toBe(0);
    expect(walk.changeObjects(2, 1).find(item => item.choice === 'A').rotation).toBe(65);
  });

  it('normalizes partial and malformed saved observations without losing other work', () => {
    expect(seed().change).toEqual({ round: 0, variant: 0, closed: false, seen: 1, selected: '', completed: [] });
    const raw = { change: { round: 'bad', variant: Infinity, closed: false, seen: NaN, selected: 'Z', completed: [-1, 0, 0, 1, 2, 3, 1.5, '2', null] },
      notes: { shadow: 'Depth survives.', change: 'Compare the tall object.' }, shadowAngle: 95, progress: { shadow: { solved: true } } };
    const before = structuredClone(raw), normalized = seed(raw);
    expect(normalized.change).toMatchObject({ round: 0, variant: 0, closed: false, selected: '' });
    expect(normalized.change.seen).toBeGreaterThanOrEqual(1); expect(normalized.change.seen).toBeLessThanOrEqual(3);
    expect(normalized.change.completed).toEqual([0, 1, 2]);
    expect(normalized.notes).toMatchObject(raw.notes); expect(normalized.shadowAngle).toBe(95);
    expect(normalized.progress.shadow.solved).toBe(true); expect(raw).toEqual(before);
    expect(walk.normalize(normalized)).toEqual(normalized);
    expect(seed({ progress: { change: { solved: true } } }).progress.change.solved).toBe(false);
    expect(seed({ change: { completed: [0, 1, 2] }, progress: { change: { assisted: true } } }).progress.change.solved).toBe(false);
    for (const patch of [null, [], { round: -20, variant: -10, seen: -1 }, { round: 999, variant: 999, seen: 99 }, { round: 1.5, completed: 'oops' }]) {
      const result = seed({ change: patch }).change;
      expect(Number.isInteger(result.round) && result.round >= 0 && result.round <= 2).toBe(true);
      expect([0, 1]).toContain(result.variant); expect([1, 2, 3]).toContain(result.seen);
      expect(Array.isArray(result.completed)).toBe(true);
    }
  });

  it('requires a facing observation position and refuses manipulation elsewhere', () => {
    for (const x of [80, 82, 84, 86, 88]) for (const z of [4, 8, 12]) {
      let state = seed({ player: { x, z, yaw: 0, pitch: 0 } });
      state.player = walk.faceExhibit(state);
      expect(walk.canObserveChange(state)).toBe(true);
      expect(walk.toggleChangeShutter(state).change.closed).toBe(true);
    }
    for (const patch of [{ activity: 'shadow' }, ...[{ x: 79.99 }, { x: 88.01 }, { z: 3.99 }, { z: 12.01 }, { yaw: 180 }, { pitch: 20 }].map(player => ({ player: { ...walk.spawn('change'), ...player } }))]) {
      const state = seed(patch), before = structuredClone(state);
      expect(walk.canObserveChange(state)).toBe(false);
      expect(walk.toggleChangeShutter(state)).toEqual(before);
      expect(walk.selectChange(state, 'B')).toEqual(before);
      expect(walk.changeMatches(state)).toBe(false);
      const correctButUnobserved = { ...state, change: { ...state.change, seen: 3, selected: 'B' } };
      expect(walk.checkChange(correctButUnobserved).change.completed).toEqual([]);
    }
  });

  it('changes the variant only when reopening the shutter and preserves the viewed pair', () => {
    const start = seed(), original = structuredClone(start), closed = walk.toggleChangeShutter(start);
    expect(closed.change).toEqual({ ...start.change, closed: true });
    expect(walk.selectChange(closed, 'B').change.selected).toBe('');
    const opened = walk.toggleChangeShutter(closed);
    expect(opened.change).toEqual({ ...start.change, variant: 1, seen: 3 });
    expect(walk.toggleChangeShutter(walk.toggleChangeShutter(opened)).change).toEqual({ ...start.change, seen: 3 });
    expect(start).toEqual(original);
    const chosen = walk.selectChange(opened, 'B');
    expect(chosen.change.selected).toBe('B'); expect(opened.change.selected).toBe('');
    for (const invalid of ['', 'F', null, 0, {}, ['B']]) expect(walk.selectChange(opened, invalid)).toEqual(opened);
  });

  it('reopens a persisted shutter outside the observation area without awarding a comparison', () => {
    for (const player of [{ x: 78.1, z: 9, yaw: 0, pitch: 0 }, { ...walk.spawn('change'), yaw: 180 }]) {
      const state = seed({ player, change: { round: 1, variant: 1, closed: true, seen: 2, selected: 'D', completed: [0] }, notes: { change: 'Keep the first trial.' } });
      const before = structuredClone(state), recovered = walk.toggleChangeShutter(state);
      expect(walk.canObserveChange(state)).toBe(false);
      expect(recovered.change).toEqual({ ...state.change, closed: false });
      expect(recovered.player).toEqual(state.player); expect(recovered.notes).toEqual(state.notes);
      expect(recovered.progress).toEqual(state.progress); expect(state).toEqual(before);
      expect(walk.toggleChangeShutter(recovered)).toEqual(recovered);
      expect(walk.nextChange(recovered)).toEqual(recovered);
      expect(walk.checkChange(recovered).change.completed).toEqual([0]);
    }
  });

  it('records three independent rounds, rejects premature and assisted answers, and preserves immutability', () => {
    let state = seed(), original = structuredClone(state);
    expect(walk.checkChange(walk.selectChange(state, 'B')).change.completed).toEqual([]);
    expect(walk.nextChange(state)).toEqual(state);
    for (let round = 0; round < 3; round++) {
      expect(state.change.round).toBe(round);
      state = walk.toggleChangeShutter(walk.toggleChangeShutter(state));
      const target = walk.changeTarget(round), wrong = target === 'B' ? 'A' : 'B';
      const incorrect = walk.selectChange(state, wrong);
      expect(walk.changeMatches(incorrect)).toBe(false);
      expect(walk.checkChange(incorrect).change.completed).toEqual(state.change.completed);
      state = walk.selectChange(state, target);
      expect(walk.changeMatches(state)).toBe(true);
      expect(walk.changeMatches(walk.toggleChangeShutter(state))).toBe(false);
      const before = structuredClone(state), checked = walk.checkChange(state);
      expect(state).toEqual(before); state = checked;
      expect(state.change.completed).toEqual(Array.from({ length: round + 1 }, (_, i) => i));
      expect(walk.checkChange(state)).toEqual(state);
      expect(state.progress.change.solved).toBe(round === 2);
      expect(walk.checkAnswer(state)).toBe(round === 2);
      if (round < 2) {
        state = walk.nextChange(state);
        expect(state.change).toEqual({ round: round + 1, variant: 0, closed: false, seen: 1, selected: '', completed: state.change.completed });
      }
    }
    expect(original.change.completed).toEqual([]);
    const wrapped = walk.nextChange(state);
    expect(wrapped.change.round).toBe(0); expect(wrapped.change.completed).toEqual([0, 1, 2]);
    const assisted = seed({ change: { seen: 3, selected: 'B' }, progress: { change: { assisted: true } } });
    expect(walk.checkChange(assisted).change.completed).toEqual([]);
    expect(walk.checkChange(assisted).progress.change.solved).toBe(false);
    expect(walk.nextChange(assisted).change.round).toBe(1);
  });

  it('blocks the exhibit platform and wall but leaves a walkable inspection route', () => {
    const front = walk.movePlayer(walk.spawn('change'), 'forward', 12, -1);
    expect(front.z).toBeGreaterThanOrEqual(2.6);
    const side = walk.movePlayer(front, 'right', 5.6, -1);
    expect(side.x).toBeCloseTo(89.6);
    const behind = walk.movePlayer(side, 'forward', 10, -1);
    expect(behind.z).toBeLessThan(-4.85);
    const wallFront = walk.movePlayer({ x: 89, z: 3, yaw: 0, pitch: 0 }, 'forward', 10, -1);
    expect(wallFront.z).toBeGreaterThanOrEqual(-4.15);
    for (const player of [{ x: 84, z: 1, yaw: 0, pitch: 0 }, { x: 84, z: -4.5, yaw: 0, pitch: 0 }]) {
      const recovered = seed({ player }).player;
      expect(recovered.x !== player.x || recovered.z !== player.z).toBe(true);
      expect(Object.values(recovered).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('change-room first-person controls', () => {
  it('uses explicit untimed shutter comparisons and requires all three correct trials', async () => {
    await mount();
    expect(query('[data-walk-change-next]').disabled).toBe(true);
    expect(host.querySelectorAll('[data-walk-change-choice]')).toHaveLength(5);
    vi.useFakeTimers();
    const initial = structuredClone(latest.perceptionWalk.change);
    await act(async () => vi.advanceTimersByTime(5000));
    expect(latest.perceptionWalk.change).toEqual(initial);
    await click('[data-walk-change-choice="B"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.change.completed).toEqual([]);
    for (const [round, target] of ['B', 'D', 'A'].entries()) {
      await compareAndChoose(target);
      expect(latest.perceptionWalk.change.completed).toEqual(Array.from({ length: round + 1 }, (_, index) => index));
      expect(latest.perceptionWalk.progress.change.solved).toBe(round === 2);
      if (round < 2) { expect(query('[data-walk-change-next]').disabled).toBe(false); await click('[data-walk-change-next]'); }
    }
  });

  it('covers the view, blocks motion, and cancels held movement while the shutter is closed', async () => {
    await mount(); vi.useFakeTimers();
    await pointer('pointerdown', 10, 10, '[data-walk-move="forward"]');
    await click('[data-walk-change-shutter]');
    expect(latest.perceptionWalk.change.closed).toBe(true);
    expect(query('[data-walk-change-cover]')).toBeTruthy();
    const before = structuredClone(latest.perceptionWalk.player);
    await act(async () => vi.advanceTimersByTime(1000));
    for (const key of ['w', 'd', 'ArrowLeft', 'PageUp']) await keyboard(key);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 200, 130); await pointer('pointerup', 200, 130);
    expect(latest.perceptionWalk.player).toEqual(before);
    expect(latest.perceptionWalk.change.variant).toBe(0);
    expect(query('[data-walk-change-choice="A"]').matches(':disabled')).toBe(true);
    await click('[data-walk-change-shutter]');
    expect(latest.perceptionWalk.change).toMatchObject({ closed: false, variant: 1, seen: 3 });
    await act(async () => vi.advanceTimersByTime(1000));
    expect(latest.perceptionWalk.player).toEqual(before);
    await keyboard('w'); expect(latest.perceptionWalk.player.z).toBeLessThan(before.z);
  });

  it('selects directly picked solids without moving the camera and cancels abandoned clicks', async () => {
    await mount();
    viewer.pick.mockReturnValue({ id: 'change-B', distance: 9 });
    const before = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100); await pointer('pointercancel', 100, 100); await pointer('pointerup', 100, 100);
    expect(latest.perceptionWalk.change.selected).toBe('');
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100);
    expect(latest.perceptionWalk.change.selected).toBe('B'); expect(latest.perceptionWalk.player).toEqual(before);
    await click('[data-walk-change-shutter]'); viewer.pick.mockReturnValue({ id: 'change-D', distance: 9 });
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100);
    expect(latest.perceptionWalk.change.selected).not.toBe('D');
  });

  it('allows recovery after walking into the bay with a persisted closed shutter', async () => {
    await mount({ activity: 'shadow', player: { x: 77.9, z: 9, yaw: 0, pitch: 0 }, change: { closed: true } });
    await keyboard('d');
    expect(latest.perceptionWalk.activity).toBe('change'); expect(latest.perceptionWalk.player.x).toBeCloseTo(78.1);
    expect(latest.perceptionWalk.change).toMatchObject({ closed: true, variant: 0, seen: 1, round: 0, completed: [] });
    const before = structuredClone(latest.perceptionWalk.player);
    await keyboard('d'); expect(latest.perceptionWalk.player).toEqual(before);
    expect(query('[data-walk-change-shutter]').disabled).toBe(false);
    await click('[data-walk-change-shutter]');
    expect(latest.perceptionWalk.change).toMatchObject({ closed: false, variant: 0, seen: 1, round: 0, completed: [] });
    expect(query('[data-walk-change-cover]').hidden).toBe(true);
    expect(query('[data-walk-change-shutter]').disabled).toBe(true);
    expect(query('[data-walk-change-next]').disabled).toBe(true);
    await click('[data-walk-change-next]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.change.round).toBe(0); expect(latest.perceptionWalk.change.completed).toEqual([]);
    await keyboard('d'); expect(latest.perceptionWalk.player.x).toBeCloseTo(78.3);
    await click('[data-walk-home]'); expect(query('[data-walk-change-shutter]').disabled).toBe(false);
  });

  it('preserves round evidence across navigation and saved-state restoration', async () => {
    await mount(); await input('[data-walk-note]', 'Depth changed between views.'); await compareAndChoose('B');
    await click('[data-walk-change-next]'); await click('[data-walk-change-shutter]');
    const saved = structuredClone(latest.perceptionWalk.change);
    await click('[data-walk-activity="shadow"]'); await click('[data-walk-activity="change"]');
    expect(latest.perceptionWalk.change).toEqual(saved);
    const serialized = JSON.parse(JSON.stringify(latest.perceptionWalk));
    await act(async () => root.unmount()); root = null; host.remove(); host = null;
    await mount(serialized);
    expect(latest.perceptionWalk.change).toEqual(saved);
    expect(latest.perceptionWalk.notes.change).toBe('Depth changed between views.');
    expect(latest.perceptionGallery).toEqual({ note: 'Keep gallery observations.' });
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('keeps revealed answers assisted and resets only the current activity while retaining notes', async () => {
    await mount({ shadowAngle: 75, precise: true, progress: { shadow: { solved: true, hints: 1, assisted: false } }, notes: { shadow: 'Keep the silhouette.' } });
    await input('[data-walk-note]', 'The shutter hides the transition.');
    await compareAndChoose('B'); await click('[data-walk-change-next]'); await click('[data-walk-hint]'); await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.progress.change.assisted).toBe(true);
    await compareAndChoose('D'); expect(latest.perceptionWalk.change.completed).toEqual([0]);
    await click('[data-walk-change-next]'); await compareAndChoose('A');
    expect(latest.perceptionWalk.progress.change.solved).toBe(false);
    await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.change.assisted).toBe(true);
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.change).toEqual({ round: 0, variant: 0, closed: false, seen: 1, selected: '', completed: [] });
    expect(latest.perceptionWalk.progress.change).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes).toMatchObject({ change: 'The shutter hides the transition.', shadow: 'Keep the silhouette.' });
    expect(latest.perceptionWalk.shadowAngle).toBe(75); expect(latest.perceptionWalk.precise).toBe(true);
    expect(latest.perceptionWalk.progress.shadow).toEqual({ solved: true, hints: 1, assisted: false });
  });

  it('keeps an independently earned three-trial solve when the explanation is revealed afterward', async () => {
    await mount();
    for (const [round, target] of ['B', 'D', 'A'].entries()) {
      await compareAndChoose(target);
      if (round < 2) await click('[data-walk-change-next]');
    }
    const completed = structuredClone(latest.perceptionWalk.change);
    expect(latest.perceptionWalk.progress.change).toEqual({ solved: true, assisted: false, hints: 0 });
    await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.change).toEqual(completed);
    expect(latest.perceptionWalk.progress.change).toEqual({ solved: true, assisted: false, hints: 0 });
    await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.change).toEqual({ solved: true, assisted: false, hints: 0 });
    await click('[data-walk-change-next]'); await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.change.completed).toEqual([0, 1, 2]);
    expect(latest.perceptionWalk.progress.change).toEqual({ solved: true, assisted: false, hints: 0 });
  });

  it('renders only the visible opaque faces of fallback boxes before and after rotation', async () => {
    await mount(); await act(async () => viewer.report('failed'));
    const polygons = choice => Array.from(query('[data-walk-change-plan]').querySelectorAll('g'))
      .find(group => group.querySelector('text')?.textContent === choice).querySelectorAll('polygon');
    expect(polygons('A')).toHaveLength(2); expect(polygons('D')).toHaveLength(2);
    const before = Array.from(polygons('A'), node => node.getAttribute('points'));
    await patchState({ change: { round: 2, variant: 1, seen: 3 } });
    expect(polygons('A')).toHaveLength(2); expect(polygons('D')).toHaveLength(2);
    expect(Array.from(polygons('A'), node => node.getAttribute('points'))).not.toEqual(before);
    expect(Array.from(polygons('A'), node => node.getAttribute('fill'))).toEqual(['#e87967', '#e87967']);
  });

  it('remains solvable with labeled fallback controls after renderer failure', async () => {
    await mount();
    await pointer('pointerdown', 100, 100); await act(async () => viewer.report('failed'));
    const before = structuredClone(latest.perceptionWalk.player);
    await pointer('pointermove', 200, 100); expect(latest.perceptionWalk.player).toEqual(before);
    expect(query('[data-walk-change-plan]')).toBeTruthy();
    expect(query('[data-walk-change-shutter]').textContent.trim() || query('[data-walk-change-shutter]').getAttribute('aria-label')).toBeTruthy();
    for (const [round, target] of ['B', 'D', 'A'].entries()) {
      await compareAndChoose(target);
      if (round < 2) await click('[data-walk-change-next]');
    }
    expect(latest.perceptionWalk.progress.change.solved).toBe(true);
  });

  it('enters the ninth bay on foot and disables comparisons when not facing the exhibit', async () => {
    await mount({ activity: 'shadow', player: { x: 77.95, z: 9, yaw: 0, pitch: 0 } });
    await keyboard('d'); expect(latest.perceptionWalk.activity).toBe('change'); expect(latest.perceptionWalk.player.x).toBeCloseTo(78.15);
    await click('[data-walk-activity="change"]');
    await patchState({ player: { ...walk.spawn('change'), yaw: 180 } });
    expect(query('[data-walk-change-shutter]').disabled).toBe(true);
    expect(query('[data-walk-change-choice="A"]').matches(':disabled')).toBe(true);
    await click('[data-walk-face]'); expect(query('[data-walk-change-shutter]').disabled).toBe(false);
  });
});
