import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

// Exercise the event handler with its actual production lookup, review and timer helpers.
function loadProductionFunction(name, bindings = {}) {
  const declaration = new RegExp('^([ \\t]*)function ' + name + '\\(', 'm').exec(source);
  if (!declaration) throw new Error('Missing production function: ' + name);
  const start = declaration.index + declaration[1].length;
  const ending = '\n' + declaration[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < 0) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const position = loadProductionFunction('procedureReplayPosition');
const reviewStep = loadProductionFunction('procedureReplayReviewStep', { procedureReplayPosition: position });
const clearTimer = loadProductionFunction('clearDissectionCanvasTimer');
const scheduleTimer = loadProductionFunction('scheduleDissectionCanvasTimer', { clearDissectionCanvasTimer: clearTimer });

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

function record(overrides = {}) {
  return {
    actions: [
      { action: 'scalpel', point: { x: 0.2, y: 0.3 } },
      { action: 'forceps', toolCalibration: { forcepsGrip: 35 } },
      { action: 'pin', point: { x: 0.6, y: 0.7 } },
      { action: 'probe' },
    ],
    duration: 4000,
    startedAt: 1000,
    specimen: 'frog',
    layer: 'muscle',
    returnFocusId: 'diss-review-actions',
    ...overrides,
  };
}

function handler({ replay = record(), state, canvas, specimen = 'frog', activeLayer = 'muscle' } = {}) {
  const d = state || { specimen, _procedureReplay: replay };
  const node = canvas === undefined ? { _drawD: d } : canvas;
  const upd = vi.fn();
  const clear = vi.fn(clearTimer);
  const schedule = vi.fn();
  const live = loadProductionFunction('liveProcedureReplay', { canvasRefNode: node, d, specimen, activeLayer });
  const hold = loadProductionFunction('holdProcedureReplayAction', {
    liveProcedureReplay: live,
    procedureReplayReviewStep: reviewStep,
    clearDissectionCanvasTimer: clear,
    canvasRefNode: node,
    upd,
    scheduleProcedureReplayFinish: schedule,
  });
  return { hold, upd, clear, schedule, node, d };
}

afterEach(() => vi.useRealTimers());

describe('dissection replay picker', () => {
  it('jumps directly from playing to a held action and publishes that same replay', () => {
    const replay = record();
    const h = handler({ replay });
    const selected = h.hold(3);
    expect(position(selected, 100000)).toMatchObject({ active: true, index: 3 });
    expect(selected).toMatchObject({ paused: true, returnFocusId: 'diss-review-actions' });
    expect(h.upd).toHaveBeenCalledExactlyOnceWith('_procedureReplay', selected);
    expect(h.clear).toHaveBeenCalledExactlyOnceWith(h.node, 'procedureReplay');
    expect(h.schedule).not.toHaveBeenCalled();
  });

  it('jumps backward from a held action without resuming playback', () => {
    const h = handler({ replay: record({ paused: true, elapsed: 3500 }) });
    const selected = h.hold(1);
    expect(position(selected, 100000)).toMatchObject({ active: true, index: 1 });
    expect(selected.paused).toBe(true);
    expect(h.upd).toHaveBeenCalledExactlyOnceWith('_procedureReplay', selected);
    expect(h.schedule).not.toHaveBeenCalled();
  });

  it('reads a newer canvas replay at click time instead of a stale render closure', () => {
    const stale = record({ returnFocusId: 'old-trigger' });
    const h = handler({ replay: stale });
    const latest = freezeDeep(record({
      actions: [{ action: 'inspect' }, { action: 'wick' }],
      duration: 2800,
      startedAt: 7000,
      returnFocusId: 'new-trigger',
    }));
    h.node._drawD = { specimen: 'frog', _procedureReplay: latest };
    const selected = h.hold(1);
    expect(selected.actions).toBe(latest.actions);
    expect(selected).toMatchObject({ duration: 2800, startedAt: 7000, returnFocusId: 'new-trigger', paused: true });
    expect(h.d._procedureReplay).toBe(stale);
  });

  it('uses rendered state when no canvas has mounted', () => {
    const h = handler({ canvas: null });
    expect(h.hold(2)).toMatchObject({ paused: true });
    expect(h.upd).toHaveBeenCalledOnce();
  });

  it('uses rendered state before the canvas has a draw snapshot', () => {
    const h = handler({ canvas: {} });
    expect(h.hold(2).actions).toBe(h.d._procedureReplay.actions);
    expect(h.upd).toHaveBeenCalledOnce();
  });

  it('does not revive a replay already removed from the latest canvas state', () => {
    const h = handler();
    h.node._drawD = { specimen: 'frog', _procedureReplay: null };
    expect(h.hold(1)).toBeNull();
    expect(h.upd).not.toHaveBeenCalled();
    expect(h.clear).not.toHaveBeenCalled();
  });

  it.each([
    ['replay layer', { specimen: 'frog', _procedureReplay: record({ layer: 'skin' }) }],
    ['canvas specimen', { specimen: 'fish', _procedureReplay: record() }],
    ['replay specimen', { specimen: 'frog', _procedureReplay: record({ specimen: 'fish' }) }],
  ])('ignores a selection after the %s changes', (_label, latest) => {
    const h = handler();
    h.node._drawD = latest;
    expect(h.hold(2)).toBeNull();
    expect(h.upd).not.toHaveBeenCalled();
    expect(h.clear).not.toHaveBeenCalled();
  });

  it('supports older frog records without explicit specimen metadata', () => {
    const legacy = record();
    delete legacy.specimen;
    const h = handler({ state: { _procedureReplay: legacy } });
    expect(h.hold(2).actions).toBe(legacy.actions);
    expect(h.upd).toHaveBeenCalledOnce();
  });

  it('leaves state and completion timers alone when records or selections are invalid', () => {
    const invalid = [
      { ...record(), actions: [] },
      { ...record(), actions: null },
      { ...record(), duration: 0 },
      { ...record(), startedAt: NaN },
      { ...record(), paused: true, elapsed: Infinity },
    ];
    for (const replay of invalid) {
      const h = handler({ replay });
      expect(h.hold(0)).toBeNull();
      expect(h.upd).not.toHaveBeenCalled();
      expect(h.clear).not.toHaveBeenCalled();
    }
    const h = handler();
    for (const index of [undefined, null, '2', NaN, Infinity]) expect(h.hold(index)).toBeNull();
    expect(h.upd).not.toHaveBeenCalled();
    expect(h.clear).not.toHaveBeenCalled();
  });

  it('keeps frozen saved actions and other learning state intact', () => {
    const state = freezeDeep({
      specimen: 'frog', _procedureReplay: record(),
      procedures: { muscle: { pins: [{ x: 0.1, y: 0.2 }], completed: false } },
      notebook: ['Observed muscle tissue'], score: 25,
    });
    const before = JSON.stringify(state);
    const h = handler({ state });
    const selected = h.hold(2);
    expect(selected).not.toBe(state._procedureReplay);
    expect(selected.actions).toBe(state._procedureReplay.actions);
    expect(Object.isFrozen(selected.actions[0].point)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
    expect(h.upd).toHaveBeenCalledExactlyOnceWith('_procedureReplay', selected);
  });

  it('cancels the playing completion timer and keeps a chosen action held after time advances', () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    const h = handler();
    scheduleTimer(h.node, 'procedureReplay', finish, 3000);
    expect(vi.getTimerCount()).toBe(1);
    const selected = h.hold(2);
    expect(h.node._dissTimers).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(finish).not.toHaveBeenCalled();
    expect(position(selected, 60000)).toMatchObject({ active: true, index: 2 });
    expect(h.schedule).not.toHaveBeenCalled();
  });

  it('cancels only replay completion while preserving another owned canvas timer', () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    const other = vi.fn();
    const h = handler();
    scheduleTimer(h.node, 'procedureReplay', finish, 3000);
    scheduleTimer(h.node, 'toolFeedback', other, 3000);
    h.hold(0);
    expect(Object.keys(h.node._dissTimers)).toEqual(['toolFeedback']);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(3000);
    expect(other).toHaveBeenCalledOnce();
    expect(finish).not.toHaveBeenCalled();
  });
});

describe('dissection replay picker contact clearance', () => {
  function arrangeCaption(keepClear) {
    // HUD panels surround a central opening. The ordinary weighted score favors
    // that opening even though the selected contact occupies it.
    const canvas = {
      _guidanceBoxes: [],
      _canvasHudBoxes: [
        { x: 0, y: 0, width: 140, height: 300, priority: 9 },
        { x: 260, y: 0, width: 140, height: 300, priority: 9 },
        { x: 140, y: 0, width: 120, height: 90, priority: 9 },
        { x: 140, y: 210, width: 120, height: 90, priority: 9 },
      ],
    };
    const contact = { x: 180, y: 120, width: 40, height: 40, priority: 12 };
    if (keepClear) contact.keepClear = true;
    const place = loadProductionFunction('placeCanvasHudPanel', { canvas, W: 400, H: 300 });
    return { contact, placement: place(150, 130, 100, 60, [contact]) };
  }

  it('keeps the selected contact clear when surrounding HUD panels compete for space', () => {
    const { contact, placement } = arrangeCaption(true);
    const separated = placement.x + 100 + 6 <= contact.x
      || placement.x - 6 >= contact.x + contact.width
      || placement.y + 60 + 6 <= contact.y
      || placement.y - 6 >= contact.y + contact.height;
    expect(separated).toBe(true);
    expect(placement.x).toBeGreaterThanOrEqual(14);
    expect(placement.x + 100).toBeLessThanOrEqual(386);
    expect(placement.y).toBeGreaterThanOrEqual(14);
    expect(placement.y + 60).toBeLessThanOrEqual(286);
  });

  it('retains ordinary HUD scoring when contact protection is not requested', () => {
    const { contact, placement } = arrangeCaption(false);
    expect(placement.x).toBeLessThan(contact.x + contact.width);
    expect(placement.x + 100).toBeGreaterThan(contact.x);
    expect(placement.y).toBeLessThan(contact.y + contact.height);
    expect(placement.y + 60).toBeGreaterThan(contact.y);
  });
});
