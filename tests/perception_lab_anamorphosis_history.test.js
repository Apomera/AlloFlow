import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
let walk, host, root, latest, viewer;
const seed = patch => walk.normalize({ activity: 'anamorphosis', player: walk.spawn('anamorphosis'), ...patch });
const query = selector => host.querySelector(selector);
const click = async selector => { expect(query(selector)).toBeTruthy(); await act(async () => query(selector).click()); };
const snapshot = (set = 0, round = 0, offsets = [.1, -.2], selected = 0) => ({ set, round, offsets, selected });
const history = state => state.anamorphosis.history;
async function input(value) {
  await act(async () => {
    const node = query('[data-walk-anamorphosis-offset]');
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
async function pointer(type, x, y, selector = '[data-walk-stage]') {
  const node = query(selector); node.setPointerCapture ||= vi.fn(); node.hasPointerCapture ||= () => true; node.releasePointerCapture ||= vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: 'mouse' } }); node.dispatchEvent(event);
  });
}
async function key(selector, value, modifiers = {}) {
  let event;
  await act(async () => {
    event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers });
    query(selector).dispatchEvent(event);
  });
  return event;
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

describe('bounded workshop adjustment history', () => {
  it.each([0, 1, 2])('undoes and redoes independent edits in set %s without mutating any input', set => {
    const start = seed({ anamorphosis: { set } }), before = structuredClone(start), baseline = walk.anamorphosisSnapshot(start);
    expect(history(start)).toEqual({ past: [], future: [] });
    expect(baseline).toEqual(snapshot(set, 0, start.anamorphosis.offsets, 0));
    const first = walk.setAnamorphosisOffset(start, 0, set === 2 ? -20 : -.5);
    const second = walk.setAnamorphosisOffset(first, 1, set === 2 ? 12 : .25);
    expect(history(second).past).toHaveLength(2);
    const undone = walk.undoAnamorphosis(second);
    expect(undone.anamorphosis.offsets).toEqual(first.anamorphosis.offsets);
    expect(undone.anamorphosis.selected).toBe(first.anamorphosis.selected);
    expect(history(undone).future).toHaveLength(1);
    const restored = walk.redoAnamorphosis(undone);
    expect(restored.anamorphosis.offsets).toEqual(second.anamorphosis.offsets);
    expect(restored.anamorphosis.selected).toBe(1); expect(history(restored)).toEqual(history(second));
    expect(walk.undoAnamorphosis(walk.undoAnamorphosis(second)).anamorphosis.offsets).toEqual(start.anamorphosis.offsets);
    expect(start).toEqual(before);
    baseline.offsets[0] = 999; history(first).past[0].offsets[1] = 999;
    expect(start).toEqual(before); expect(history(second).past[0].offsets[1]).toBe(before.anamorphosis.offsets[1]);
  });

  it.each([0, 1, 2])('rejects malformed and cross-puzzle snapshots instead of clamping them in set %s', set => {
    const limit = set === 2 ? 45 : 1.2, valid = snapshot(set, 1, [-limit, limit], 1);
    const invalid = [null, [], 'bad', {}, { ...valid, set: (set + 1) % 3 }, { ...valid, round: 0 },
      { ...valid, set: String(set) }, { ...valid, round: '1' }, { ...valid, selected: -1 }, { ...valid, selected: 2 },
      { ...valid, selected: .5 }, { ...valid, selected: '0' }, { ...valid, offsets: [0] }, { ...valid, offsets: [0, 0, 0] },
      { ...valid, offsets: ['0', 0] }, { ...valid, offsets: [NaN, 0] }, { ...valid, offsets: [0, Infinity] }, { ...valid, offsets: Array(2) },
      { ...valid, offsets: [-limit - .01, 0] }, { ...valid, offsets: [0, limit + .01] }];
    const raw = { anamorphosis: { set, round: 1, history: { past: [...invalid, valid], future: [valid, ...invalid] } } };
    const state = seed(raw);
    expect(history(state)).toEqual({ past: [valid], future: [valid] });
    valid.offsets[0] = 999; expect(history(state).past[0].offsets[0]).toBe(-limit);
    expect(walk.normalize(state)).toEqual(state);
    for (const malformed of [null, [], 'bad', { past: {}, future: 'bad' }]) expect(history(seed({ anamorphosis: { history: malformed } }))).toEqual({ past: [], future: [] });
  });

  it('retains only the newest 24 snapshots on both stacks and after sustained editing', () => {
    const snapshots = Array.from({ length: 35 }, (_, index) => snapshot(0, 0, [index / 100, -.2]));
    const imported = seed({ anamorphosis: { history: { past: snapshots, future: snapshots } } });
    expect(history(imported).past).toEqual(snapshots.slice(-24)); expect(history(imported).future).toEqual(snapshots.slice(-24));
    let state = seed(); for (let i = 0; i < 40; i++) state = walk.setAnamorphosisOffset(state, 0, i / 100);
    expect(history(state).past).toHaveLength(24);
    for (let i = 0; i < 30; i++) state = walk.undoAnamorphosis(state);
    expect(history(state).past).toHaveLength(0); expect(history(state).future).toHaveLength(24);
    const exhausted = structuredClone(state); expect(walk.undoAnamorphosis(state)).toEqual(exhausted);
    for (let i = 0; i < 30; i++) state = walk.redoAnamorphosis(state);
    expect(state.anamorphosis.offsets[0]).toBeCloseTo(.39); expect(history(state).past).toHaveLength(24); expect(history(state).future).toHaveLength(0);
  });

  it('coalesces a gesture, removes a neutral round trip, and keeps selection out of gesture identity', () => {
    const start = seed(), baseline = walk.anamorphosisSnapshot(start);
    let state = walk.setAnamorphosisOffset(start, 0, -.7, baseline);
    state = walk.setAnamorphosisOffset(state, 0, -.4, { ...baseline, selected: 1 });
    state = walk.setAnamorphosisOffset(state, 0, -.2, baseline);
    expect(history(state).past).toEqual([baseline]);
    expect(walk.undoAnamorphosis(state).anamorphosis.offsets).toEqual(start.anamorphosis.offsets);
    state = walk.setAnamorphosisOffset(state, 0, baseline.offsets[0], baseline);
    expect(history(state)).toEqual({ past: [], future: [] });
    const changed = walk.setAnamorphosisOffset(state, 0, -.6, baseline);
    expect(history(changed).past).toHaveLength(1);
    expect(baseline).toEqual(walk.anamorphosisSnapshot(start));
  });

  it('invalidates redo only after a real new edit and cannot inject a cross-puzzle baseline', () => {
    const start = seed(), edited = walk.setAnamorphosisOffset(start, 0, -.5), undone = walk.undoAnamorphosis(edited);
    expect(walk.setAnamorphosisOffset(undone, 0, undone.anamorphosis.offsets[0])).toEqual(undone);
    expect(history(walk.selectAnamorphosis(undone, 1)).future).toEqual(history(undone).future);
    for (const value of [null, NaN, Infinity, '']) expect(history(walk.setAnamorphosisOffset(undone, 0, value))).toEqual(history(undone));
    const branched = walk.setAnamorphosisOffset(undone, 1, .5, snapshot(2, 1, [-45, 45], 1));
    expect(history(branched).future).toEqual([]); expect(history(branched).past).toEqual([walk.anamorphosisSnapshot(undone)]);
    expect(walk.redoAnamorphosis(branched)).toEqual(branched);
  });

  it('clears observation evidence but preserves mastery, assistance, notes, bookmarks and camera', () => {
    const start = seed({ anamorphosis: { set: 2, completed: [0, 1], mastered: true }, progress: { anamorphosis: { assisted: true, hints: 2 } }, notes: { anamorphosis: 'The endpoints overlap.' }, viewpoints: { anamorphosis: { A: walk.spawn('anamorphosis') } } });
    const changed = walk.setAnamorphosisOffset(start, 1, 15); changed.anamorphosis.seen = 3;
    const undo = walk.undoAnamorphosis(changed); expect(undo.anamorphosis.seen).toBe(0);
    undo.anamorphosis.seen = 3; const redo = walk.redoAnamorphosis(undo); expect(redo.anamorphosis.seen).toBe(0);
    for (const state of [undo, redo]) {
      expect(state.anamorphosis.completed).toEqual(start.anamorphosis.completed); expect(state.anamorphosis.mastered).toBe(true);
      for (const field of ['progress', 'notes', 'viewpoints', 'player']) expect(state[field]).toEqual(start[field]);
    }
  });

  it('rejects history navigation outside the usable workshop and preserves evidence on empty stacks', () => {
    const edited = walk.setAnamorphosisOffset(seed(), 0, -.5), undone = walk.undoAnamorphosis(edited);
    for (const state of [edited, undone]) for (const patch of [{ activity: 'silhouette' }, { player: { ...state.player, yaw: 180 } }, { player: { ...state.player, z: -5 } }]) {
      const remote = seed({ ...state, ...patch }); expect(walk.undoAnamorphosis(remote)).toEqual(remote); expect(walk.redoAnamorphosis(remote)).toEqual(remote);
    }
    const empty = seed({ anamorphosis: { seen: 3 } }); expect(walk.undoAnamorphosis(empty)).toEqual(empty); expect(walk.redoAnamorphosis(empty)).toEqual(empty);
  });

  it('persists through JSON and viewpoint inspection but clears when trial or set changes', () => {
    let state = walk.setAnamorphosisOffset(seed(), 1, .5);
    state = walk.saveViewpoint(state, 'A'); state = walk.inspectAnamorphosis(state, 'side'); state = walk.saveViewpoint(state, 'B');
    expect(history(walk.recallViewpoint(state, 'A'))).toEqual(history(state));
    expect(walk.normalize(JSON.parse(JSON.stringify(state)))).toEqual(state);
    expect(walk.nextAnamorphosis(state)).toEqual(state); expect(walk.advanceAnamorphosisSet(state)).toEqual(state);
    state.progress.anamorphosis.assisted = true;
    expect(history(walk.nextAnamorphosis(state))).toEqual({ past: [], future: [] });
    expect(history(walk.advanceAnamorphosisSet(state))).toEqual({ past: [], future: [] });
  });
});

describe('workshop history controls', () => {
  it('provides named, correctly disabled undo and redo controls for rotation adjustments', async () => {
    await mount({ anamorphosis: { set: 2 } });
    expect(query('[data-walk-anamorphosis-undo]').disabled).toBe(true); expect(query('[data-walk-anamorphosis-redo]').disabled).toBe(true);
    expect(query('[data-walk-anamorphosis-undo]').getAttribute('aria-label')).toMatch(/undo/i);
    expect(query('[data-walk-anamorphosis-redo]').getAttribute('aria-label')).toMatch(/redo/i);
    await input(-20); expect(query('[data-walk-anamorphosis-undo]').disabled).toBe(false);
    await click('[data-walk-anamorphosis-undo]'); expect(latest.perceptionWalk.anamorphosis.offsets).toEqual([-30, 30]);
    expect(query('[data-walk-anamorphosis-redo]').disabled).toBe(false);
    await click('[data-walk-anamorphosis-redo]'); expect(latest.perceptionWalk.anamorphosis.offsets).toEqual([-20, 30]);
    expect(latest.otherTool.preserved).toBe(37);
  });

  it('disables history controls when the exhibit is behind the player', async () => {
    await mount({ player: { ...walk.spawn('anamorphosis'), yaw: 180 }, anamorphosis: { history: { past: [snapshot()], future: [snapshot(0, 0, [.3, .4], 1)] } } });
    expect(history(latest.perceptionWalk).past).toHaveLength(1); expect(history(latest.perceptionWalk).future).toHaveLength(1);
    expect(query('[data-walk-anamorphosis-undo]').disabled).toBe(true); expect(query('[data-walk-anamorphosis-redo]').disabled).toBe(true);
    const before = structuredClone(latest); await click('[data-walk-anamorphosis-undo]'); await click('[data-walk-anamorphosis-redo]');
    expect(latest).toEqual(before);
  });

  it('coalesces multi-move beam drags and ends active dragging when undo is requested', async () => {
    await mount(); viewer.pick.mockReturnValue({ id: 'anamorphosis-B' }); const camera = structuredClone(latest.perceptionWalk.player);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 120, 100); await pointer('pointermove', 140, 100); await pointer('pointermove', 150, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.4); expect(history(latest.perceptionWalk).past).toHaveLength(1);
    await click('[data-walk-anamorphosis-undo]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.9);
    await pointer('pointermove', 180, 100); await pointer('pointerup', 180, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.9); expect(latest.perceptionWalk.player).toEqual(camera);
    await click('[data-walk-anamorphosis-redo]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.4);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 110, 100); await pointer('pointerup', 110, 100);
    expect(history(latest.perceptionWalk).past).toHaveLength(2);
  });

  it('restores the selection from before a C-beam drag when undoing the gesture', async () => {
    await mount(); expect(latest.perceptionWalk.anamorphosis.selected).toBe(0);
    viewer.pick.mockReturnValue({ id: 'anamorphosis-C' });
    await pointer('pointerdown', 100, 100); expect(latest.perceptionWalk.anamorphosis.selected).toBe(1);
    await pointer('pointermove', 80, 100); await pointer('pointermove', 60, 100); await pointer('pointerup', 60, 100);
    expect(latest.perceptionWalk.anamorphosis.offsets[1]).toBeCloseTo(.5); expect(history(latest.perceptionWalk).past).toHaveLength(1);
    expect(history(latest.perceptionWalk).past[0].selected).toBe(0);
    await click('[data-walk-anamorphosis-undo]'); expect(latest.perceptionWalk.anamorphosis).toMatchObject({ offsets: [-.9, .9], selected: 0 });
    await click('[data-walk-anamorphosis-redo]'); expect(latest.perceptionWalk.anamorphosis.selected).toBe(1);
    expect(latest.perceptionWalk.anamorphosis.offsets[1]).toBeCloseTo(.5);
  });

  it.each(['pointerup', 'pointercancel', 'blur'])('coalesces a slider pointer gesture until %s, with later keyboard-style inputs separate', async end => {
    await mount(); const slider = '[data-walk-anamorphosis-offset]';
    await pointer('pointerdown', 100, 100, slider); await input(-.7); await input(-.4); await input(-.2);
    expect(history(latest.perceptionWalk).past).toHaveLength(1);
    if (end === 'blur') await act(async () => window.dispatchEvent(new Event('blur')));
    else await pointer(end, 130, 100, slider);
    await key(slider, 'ArrowRight'); await input(.1); await key(slider, 'ArrowRight'); await input(.2); expect(history(latest.perceptionWalk).past).toHaveLength(3);
    await click('[data-walk-anamorphosis-undo]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(.1);
    await click('[data-walk-anamorphosis-undo]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.2);
    await click('[data-walk-anamorphosis-undo]'); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.9);
  });

  it('ignores trailing slider input after undo interrupts a held pointer', async () => {
    await mount(); const slider = '[data-walk-anamorphosis-offset]';
    await pointer('pointerdown', 100, 100, slider); await input(-.7); await input(-.4);
    await click('[data-walk-anamorphosis-undo]'); const undone = structuredClone(latest.perceptionWalk);
    await input(-.1); await input(.3); expect(latest.perceptionWalk).toEqual(undone);
    await pointer('pointerup', 150, 100, slider);
    await pointer('pointerdown', 100, 100, slider); await input(-.5); await pointer('pointerup', 120, 100, slider);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.5); expect(history(latest.perceptionWalk).past).toHaveLength(1);
    expect(history(latest.perceptionWalk).future).toEqual([]);
  });

  it.each([
    ['[data-walk-anamorphosis-next]', 0, 1],
    ['[data-walk-anamorphosis-set-next]', 1, 0]
  ])('suppresses a held slider across %s until the pointer gesture ends', async (next, set, round) => {
    await mount({ progress: { anamorphosis: { assisted: true } } }); const slider = '[data-walk-anamorphosis-offset]';
    await pointer('pointerdown', 100, 100, slider); await input(-.5); await click(next);
    expect(latest.perceptionWalk.anamorphosis).toMatchObject({ set, round, history: { past: [], future: [] } });
    const nextPuzzle = structuredClone(latest.perceptionWalk);
    await input(.2); await input(.4); expect(latest.perceptionWalk).toEqual(nextPuzzle);
    await pointer('pointerup', 140, 100, slider);
    await pointer('pointerdown', 100, 100, slider); await input(.3); await pointer('pointerup', 120, 100, slider);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(.3);
    expect(history(latest.perceptionWalk).past).toEqual([walk.anamorphosisSnapshot(nextPuzzle)]);
  });

  it('supports Ctrl/Cmd history shortcuts without stealing native form or outside-room undo', async () => {
    await mount({ notes: { anamorphosis: 'Keep the note' } }); await input(-.5);
    for (const selector of ['[data-walk-note]', '[data-walk-anamorphosis-offset]']) {
      const before = structuredClone(latest); const event = await key(selector, 'z', { ctrlKey: true }); expect(event.defaultPrevented).toBe(false); expect(latest).toEqual(before);
    }
    expect((await key('[data-walk-stage]', 'z', { ctrlKey: true })).defaultPrevented).toBe(true);
    expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.9);
    await key('[data-walk-stage]', 'z', { metaKey: true, shiftKey: true }); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.5);
    await key('[data-walk-stage]', 'z', { metaKey: true }); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.9);
    await key('[data-walk-stage]', 'y', { ctrlKey: true }); expect(latest.perceptionWalk.anamorphosis.offsets[0]).toBeCloseTo(-.5);
    await click('[data-walk-activity="silhouette"]'); const before = structuredClone(latest);
    expect((await key('[data-walk-stage]', 'z', { ctrlKey: true })).defaultPrevented).toBe(false); expect(latest).toEqual(before);
  });

  it('leaves contenteditable, composition, Alt-modified and already-handled shortcuts alone', async () => {
    await mount(); await input(-.5); const before = structuredClone(latest);
    const editor = document.createElement('div'); editor.setAttribute('contenteditable', 'true');
    editor.innerHTML = '<span data-history-editor-child>Editable observation</span>'; query('[data-perception-walk]').append(editor);
    const editableEvent = await key('[data-history-editor-child]', 'z', { ctrlKey: true });
    expect(editableEvent.defaultPrevented).toBe(false); expect(latest).toEqual(before);
    for (const modifiers of [{ ctrlKey: true, altKey: true }, { metaKey: true, isComposing: true }]) {
      expect((await key('[data-walk-stage]', 'z', modifiers)).defaultPrevented).toBe(false); expect(latest).toEqual(before);
    }
    const stage = query('[data-walk-stage]'), handled = event => event.preventDefault(); stage.addEventListener('keydown', handled);
    expect((await key('[data-walk-stage]', 'z', { ctrlKey: true })).defaultPrevented).toBe(true); expect(latest).toEqual(before);
    stage.removeEventListener('keydown', handled); editor.remove();
  });

  it('keeps history through room visits and Plan fallback while reset clears only workshop history', async () => {
    await mount({ notes: { anamorphosis: 'Keep this observation' }, viewpoints: { anamorphosis: { A: walk.spawn('anamorphosis') } } }); await input(-.5);
    const before = structuredClone(latest.perceptionWalk);
    await click('[data-walk-activity="silhouette"]'); await click('[data-walk-activity="anamorphosis"]');
    expect(history(latest.perceptionWalk)).toEqual(history(before));
    await act(async () => viewer.report('failed')); const original = query('[data-walk-anamorphosis-plan]').innerHTML;
    await click('[data-walk-anamorphosis-undo]'); expect(query('[data-walk-anamorphosis-plan]').innerHTML).not.toBe(original);
    await click('[data-walk-anamorphosis-redo]'); expect(query('[data-walk-anamorphosis-plan]').innerHTML).toBe(original);
    expect(query('[data-walk-anamorphosis-plan]').innerHTML).not.toMatch(/NaN|Infinity/);
    await click('[data-walk-reset]'); expect(history(latest.perceptionWalk)).toEqual({ past: [], future: [] });
    expect(latest.perceptionWalk.notes).toEqual(before.notes); expect(latest.perceptionWalk.viewpoints).toEqual(before.viewpoints);
    expect(query('[data-walk-anamorphosis-undo]').disabled).toBe(true); expect(query('[data-walk-anamorphosis-redo]').disabled).toBe(true);
  });
});
