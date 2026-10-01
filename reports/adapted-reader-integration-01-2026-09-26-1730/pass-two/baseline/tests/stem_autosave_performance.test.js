import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';

const source = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
function block(name) {
  const start = source.indexOf('// ' + name + '_START');
  const end = source.indexOf('// ' + name + '_END', start);
  if (start < 0 || end < 0) throw new Error('Missing helper: ' + name);
  return source.slice(start, end);
}
function harness(saved = null) {
  vi.useFakeTimers();
  const win = new EventTarget(), doc = new EventTarget();
  doc.hidden = false;
  const storage = { getItem: vi.fn(() => saved), setItem: vi.fn() };
  const json = { stringify: vi.fn(JSON.stringify) };
  const saver = Function('window', 'document', 'localStorage', 'JSON',
    block('BEEHIVE_PERSISTENCE_HELPER') + block('STEM_AUTOSAVE') + '\nreturn _createStemAutosave();'
  )(win, doc, storage, json);
  return { saver, win, doc, storage, json };
}
afterEach(() => vi.useRealTimers());
const state = (wave = { frequency: 2 }) => ({ _persisted: true, wave });

describe('STEM autosave scheduling and durability', () => {
  it('waits for hydration, then combines a burst into one serialization and write', () => {
    const h = harness();
    h.saver.queue({ wave: { frequency: 0 } });
    vi.advanceTimersByTime(500);
    expect(h.json.stringify).not.toHaveBeenCalled();
    for (let frequency = 0; frequency < 100; frequency++) h.saver.queue(state({ frequency }));
    expect(h.storage.setItem).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(h.json.stringify).toHaveBeenCalledTimes(1);
    expect(h.storage.setItem).toHaveBeenCalledExactlyOnceWith('alloflow_stemlab_v2', JSON.stringify({ wave: { frequency: 99 } }));
    h.saver.dispose();
  });
  it('does no serialization or storage work for updates to unsaved tools', () => {
    const h = harness(), initial = state();
    h.saver.queue(initial); vi.advanceTimersByTime(400);
    h.json.stringify.mockClear(); h.storage.setItem.mockClear();
    for (let tick = 0; tick < 1000; tick++) h.saver.queue({ ...initial, roadReady: { tick } });
    vi.advanceTimersByTime(1000);
    expect(h.json.stringify).not.toHaveBeenCalled();
    expect(h.storage.setItem).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    h.saver.dispose();
  });
  it('bounds save latency even when updates continue', () => {
    const h = harness();
    for (let frequency = 0; frequency < 12; frequency++) {
      h.saver.queue(state({ frequency })); vi.advanceTimersByTime(100);
    }
    expect(h.storage.setItem.mock.calls.map(x => JSON.parse(x[1]).wave.frequency)).toEqual([3, 7, 11]);
    h.saver.dispose();
  });
  it('skips an identical hydrated payload and transient flight state changes', () => {
    const h = harness(JSON.stringify({ flightSim: { score: 12 } }));
    h.saver.queue({ _persisted: true, flightSim: { score: 12, view: 'flight', rescue: {}, survey: {}, weatherLesson: {}, nearestWaypoint: 3, showHelp: true } });
    vi.advanceTimersByTime(400);
    expect(h.storage.setItem).not.toHaveBeenCalled();
    h.saver.queue({ _persisted: true, flightSim: { score: 12, view: 'menu' } });
    vi.advanceTimersByTime(400);
    expect(h.storage.setItem).not.toHaveBeenCalled();
    h.saver.dispose();
  });
  it('saves removal and retains the existing Beehive resume safety contract', () => {
    const h = harness();
    const beehive = { honey: 4, autoAdvance: true, queen: { active: true, paused: false }, drone: { active: true, replayIndex: 2, attempts: 7 } };
    h.saver.queue({ ...state(), beehive }); vi.advanceTimersByTime(400);
    const saved = JSON.parse(h.storage.setItem.mock.calls[0][1]);
    expect(saved.beehive.honey).toBe(4);
    expect(saved.beehive.autoAdvance).toBeUndefined();
    expect(saved.beehive.queen.paused).toBe(true);
    expect(saved.beehive.drone).toEqual({ attempts: 7 });
    expect(beehive.queen.paused).toBe(false);
    h.saver.queue({ _persisted: true }); vi.advanceTimersByTime(400);
    expect(h.storage.setItem).toHaveBeenLastCalledWith('alloflow_stemlab_v2', '{}');
    h.saver.dispose();
  });
  it.each(['hidden', 'pagehide', 'dispose'])('flushes the latest queued data on %s', (event) => {
    const h = harness();
    h.saver.queue(state({ frequency: 1 })); h.saver.queue(state({ frequency: 9 }));
    if (event === 'hidden') { h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange')); }
    if (event === 'pagehide') h.win.dispatchEvent(new Event('pagehide'));
    if (event === 'dispose') h.saver.dispose();
    expect(h.storage.setItem).toHaveBeenCalledExactlyOnceWith('alloflow_stemlab_v2', '{"wave":{"frequency":9}}');
    expect(vi.getTimerCount()).toBe(0);
    h.saver.dispose();
  });
  it('flushes immediately if data changes while already hidden', () => {
    const h = harness(); h.doc.hidden = true;
    h.saver.queue(state());
    expect(h.storage.setItem).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    h.saver.dispose();
  });
  it('retries a failed write without incorrectly caching success', () => {
    const h = harness(), initial = state();
    h.storage.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    h.saver.queue(initial); vi.advanceTimersByTime(400);
    h.saver.queue(initial); vi.advanceTimersByTime(400);
    expect(h.storage.setItem).toHaveBeenCalledTimes(2);
    h.saver.queue(initial); vi.advanceTimersByTime(400);
    expect(h.storage.setItem).toHaveBeenCalledTimes(2);
    h.saver.dispose();
  });
  it('cleans up timers and lifecycle handlers, and can remount with saved state', () => {
    const h = harness();
    const removeWindow = vi.spyOn(h.win, 'removeEventListener'), removeDocument = vi.spyOn(h.doc, 'removeEventListener');
    h.saver.queue(state()); h.saver.dispose(); h.saver.dispose();
    h.saver.queue(state({ frequency: 6 }));
    h.win.dispatchEvent(new Event('pagehide')); h.doc.hidden = true; h.doc.dispatchEvent(new Event('visibilitychange'));
    expect(removeWindow).toHaveBeenCalledTimes(1); expect(removeDocument).toHaveBeenCalledTimes(1);
    expect(h.storage.setItem).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    const next = harness(h.storage.setItem.mock.calls[0][1]);
    next.saver.queue(state()); vi.advanceTimersByTime(400);
    expect(next.storage.setItem).not.toHaveBeenCalled(); next.saver.dispose();
  });
});
