import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, root, host, latest, savedRoot, externalPatch, poke, pending, replayChecks, errors, xp;
const copy = value => JSON.parse(JSON.stringify(value));
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const checkbox = index => host.querySelector('#skyschool-pf-documents-' + index + ' input');
const phaseToggle = index => host.querySelector('#skyschool-pf-toggle-' + index);
const progress = () => host.querySelector('progress[aria-label="Review progress"]');
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
function checkAction(index) {
  const input = checkbox(index), change = handler(input, 'onChange');
  return () => change({ currentTarget: input, target: input });
}
function capture(action) {
  if (action === 'check') return checkAction(1);
  if (action === 'phase') return handler(phaseToggle(1));
  return handler(button(action === 'reset' ? 'Start a new checklist review' : '← Menu'));
}
async function run(action) { await act(async () => action()); }
async function patch(values) { await act(async () => externalPatch(values)); }
async function commit(count = 1) {
  expect(pending.length).toBeGreaterThanOrEqual(count);
  const batch = pending.splice(0, count); await act(async () => batch.forEach(apply => apply()));
}
async function flush() {
  for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(30); await commit(); }
}
function foreign(change) {
  if (change === 'progress') return { preflightChecked: { 'Documents-3': true }, teacherMarker: 'changed progress' };
  if (change === 'preferences') return { preflightOpen: { Documents: false }, teacherMarker: 'changed preferences' };
  return { view: 'menu', teacherMarker: 'new view' };
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Preserve unrelated work.' }, flightSim: {
      view: 'preflight', preflightChecked: { 'Documents-0': true }, preflightOpen: { Documents: true },
      quizScore: 3, quizTotal: 7, completedLessons: { lift: true }, aircraft: 'cessna172', teacherMarker: 'original', ...seed,
    } });
    const [, renderLocal] = React.useState(0);
    savedRoot = data; latest = data.flightSim; poke = () => renderLocal(value => value + 1);
    externalPatch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = update => {
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayChecks.push({ immutable: JSON.stringify(previous) === before, stable: JSON.stringify(first) === JSON.stringify(second) });
        if (options.cloneAtCommit && second !== previous) return { ...second, flightSim: copy(second.flightSim) };
        return second;
      });
      if (options.delayed) pending.push(apply); else apply();
    };
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit, awardXP: xp,
      update: (id, name, value) => submit(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  replayChecks = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {}); xp = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled();
  expect(replayChecks.every(item => item.immutable && item.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.useRealTimers();
});

describe('Sky School preflight save ownership', () => {
  it.each(['check', 'phase', 'reset', 'exit'].flatMap(action => ['committed', 'pending'].flatMap(timing =>
    ['progress', 'preferences'].map(change => [action, timing, change]))))
    ('rejects an old %s after a %s host replacement of %s', async (action, timing, change) => {
      await mount(); const old = capture(action), replacement = foreign(change), original = copy(latest);
      if (timing === 'committed') { await patch(replacement); await run(old); }
      else await act(async () => { externalPatch(replacement); old(); });
      expect(latest).toEqual({ ...original, ...replacement });
      expect(savedRoot.otherTool).toEqual({ writing: 'Preserve unrelated work.' });
    });

  it.each(['check', 'phase', 'reset', 'exit'].flatMap(action =>
    ['progress', 'preferences', 'view', 'A to B to A'].map(change => [action, change])))
    ('rejects an accepted delayed %s after a host %s change', async (action, change) => {
      await mount({}, { delayed: true, strict: true }); const original = copy(latest);
      await run(capture(action)); expect(pending).toHaveLength(1);
      if (change === 'A to B to A') { await patch(foreign('progress')); await patch(original); }
      else await patch(foreign(change));
      const before = copy(latest); await flush(); expect(latest).toEqual(before);
    });

  it.each(['check', 'phase', 'reset', 'exit'])('retires retained %s callbacks across a committed preflight to Menu to preflight visit', async action => {
    await mount(); const old = capture(action), original = copy(latest);
    await patch({ view: 'menu' }); await patch({ view: 'preflight' });
    await run(old); expect(latest).toEqual(original);
    await run(capture(action));
    if (action === 'check') expect(latest.preflightChecked['Documents-1']).toBe(true);
    else if (action === 'phase') expect(latest.preflightOpen[api.PREFLIGHT_CHECKLIST[1].phase]).toBe(false);
    else if (action === 'reset') expect(latest.preflightChecked).toEqual({});
    else expect(latest.view).toBe('menu');
  });

  it.each(['check', 'phase'])('keeps a retained %s compatible with canonical clones and unrelated metadata', async action => {
    await mount(); const old = capture(action);
    await patch({ preflightChecked: { ...copy(latest.preflightChecked), obsolete: true, 'Documents-4': 'true' },
      preflightOpen: { ...copy(latest.preflightOpen), obsolete: true }, teacherMarker: 'cloned metadata' });
    await run(old);
    if (action === 'check') expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-1': true });
    else expect(latest.preflightOpen).toEqual({ Documents: true, [api.PREFLIGHT_CHECKLIST[1].phase]: false });
    expect(latest.teacherMarker).toBe('cloned metadata');
    expect([latest.quizScore, latest.quizTotal]).toEqual([3, 7]); expect(latest.completedLessons).toEqual({ lift: true });
  });

  it.each(['check', 'phase'])('keeps an accepted delayed %s through metadata changes and local rerenders', async action => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true }); await run(capture(action));
    await act(async () => poke()); await patch({ teacherMarker: 'updated host metadata',
      preflightChecked: copy(latest.preflightChecked), preflightOpen: copy(latest.preflightOpen) });
    await flush();
    if (action === 'check') expect(latest.preflightChecked['Documents-1']).toBe(true);
    else expect(latest.preflightOpen[api.PREFLIGHT_CHECKLIST[1].phase]).toBe(false);
    expect(latest.teacherMarker).toBe('updated host metadata');
    expect(savedRoot.otherTool).toEqual({ writing: 'Preserve unrelated work.' });
  });

  it.each([false, true])('keeps ordered checkbox writes through local renders and acknowledged prefixes; cloned commits: %s', async cloneAtCommit => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit });
    await act(async () => { checkAction(1)(); checkAction(2)(); }); expect(pending).toHaveLength(2);
    await act(async () => poke()); await run(checkAction(3));
    await commit(); expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-1': true });
    await act(async () => poke()); await flush();
    expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-1': true, 'Documents-2': true, 'Documents-3': true });
    expect(progress().value).toBe(4);
  });

  it('preserves repeated toggles of one checkbox even when the final state equals the original state', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true }); const change = checkAction(1);
    await act(async () => { change(); change(); }); expect(pending).toHaveLength(2);
    await act(async () => poke()); await commit(); expect(latest.preflightChecked['Documents-1']).toBe(true);
    await act(async () => poke()); await flush(); expect(latest.preflightChecked).toEqual({ 'Documents-0': true });
    await run(checkAction(2)); await flush(); expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-2': true });
  });

  it('preserves independent phase choices and repeated toggles through delayed prefix receipts', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    const first = handler(phaseToggle(0)), second = handler(phaseToggle(1));
    await act(async () => { first(); second(); first(); }); expect(pending).toHaveLength(3);
    await act(async () => poke()); await commit(); expect(latest.preflightOpen).toEqual({ Documents: false });
    await act(async () => poke()); await flush();
    expect(latest.preflightOpen).toEqual({ Documents: true, [api.PREFLIGHT_CHECKLIST[1].phase]: false });
    expect(phaseToggle(0).getAttribute('aria-expanded')).toBe('true'); expect(phaseToggle(1).getAttribute('aria-expanded')).toBe('false');
  });

  it.each(['reset', 'exit'])('preserves a checkbox accepted before %s through ordered delayed receipts', async action => {
    await mount({}, { delayed: true, strict: true }); const change = checkAction(1), finish = capture(action);
    await act(async () => { change(); finish(); }); expect(pending).toHaveLength(2);
    await act(async () => poke()); await commit(); expect(latest.preflightChecked['Documents-1']).toBe(true);
    await flush();
    if (action === 'reset') { expect(latest.preflightChecked).toEqual({}); expect(latest.preflightOpen).toEqual({}); expect(latest.view).toBe('preflight'); }
    else { expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-1': true }); expect(latest.view).toBe('menu'); }
  });

  it.each(['reset', 'exit'])('rejects old checkbox and phase controls queued after %s in the same batch', async action => {
    await mount({}, { delayed: true, strict: true }); const change = checkAction(1), phase = capture('phase'), finish = capture(action);
    await act(async () => { finish(); change(); phase(); }); expect(pending).toHaveLength(1); await flush();
    if (action === 'reset') { expect(latest.preflightChecked).toEqual({}); expect(latest.preflightOpen).toEqual({}); }
    else { expect(latest.view).toBe('menu'); expect(latest.preflightChecked).toEqual({ 'Documents-0': true }); expect(latest.preflightOpen).toEqual({ Documents: true }); }
  });

  it('treats an accepted reset of an already empty review as a fresh visit and retires old controls', async () => {
    await mount({ preflightChecked: {}, preflightOpen: {} }, { delayed: true, strict: true });
    const change = checkAction(1), reset = capture('reset'); await run(reset); await act(async () => poke()); await flush();
    const before = copy(latest); await run(change); await flush(); expect(latest).toEqual(before);
    await run(checkAction(1)); await flush(); expect(latest.preflightChecked).toEqual({ 'Documents-1': true });
  });

  it.each(['populated', 'empty'].flatMap(initial => ['local', 'metadata'].flatMap(render =>
    ['check', 'phase'].map(action => [initial, render, action]))))
    ('waits for an %s review reset receipt before accepting a fresh %s-rendered %s control', async (initial, render, action) => {
      await mount(initial === 'empty' ? { preflightChecked: {}, preflightOpen: {} } : {}, { delayed: true, strict: true });
      const before = copy(latest); await run(capture('reset')); expect(pending).toHaveLength(1);
      if (render === 'local') await act(async () => poke());
      else await patch({ teacherMarker: 'new metadata during pending reset', preflightChecked: copy(latest.preflightChecked),
        preflightOpen: copy(latest.preflightOpen) });
      // These are newly rendered callbacks, not the callbacks captured before
      // reset. Their visible controls still belong to the old saved review.
      await run(capture(action)); expect(pending).toHaveLength(1);
      expect(latest.preflightChecked).toEqual(before.preflightChecked); expect(latest.preflightOpen).toEqual(before.preflightOpen);
      await flush(); expect(latest.preflightChecked).toEqual({}); expect(latest.preflightOpen).toEqual({});
      await run(capture(action)); expect(pending).toHaveLength(1); await flush();
      if (action === 'check') expect(latest.preflightChecked).toEqual({ 'Documents-1': true });
      else expect(latest.preflightOpen).toEqual({ [api.PREFLIGHT_CHECKLIST[1].phase]: false });
      if (render === 'metadata') expect(latest.teacherMarker).toBe('new metadata during pending reset');
    });

  it('restores serialized checklist progress without manufacturing learning or flight evidence', async () => {
    await mount(); await run(checkAction(1)); await run(capture('phase')); const snapshot = copy(latest);
    await mount(snapshot); expect(latest).toEqual(snapshot); expect(progress().value).toBe(2);
    expect(phaseToggle(1).getAttribute('aria-expanded')).toBe('false');
    expect(latest.lastDebrief).toBeUndefined(); expect(latest.challengeResults).toBeUndefined();
    expect([latest.quizScore, latest.quizTotal]).toEqual([3, 7]);
  });

  it('keeps repeated checkbox and phase changes ordered in a legacy host', async () => {
    await mount({}, { legacyHost: true }); const first = checkAction(1), second = checkAction(2), fold = capture('phase');
    await act(async () => { first(); second(); first(); fold(); fold(); });
    expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-2': true });
    expect(latest.preflightOpen).toEqual({ Documents: true, [api.PREFLIGHT_CHECKLIST[1].phase]: true });
  });

  it.each(['reset', 'exit'])('keeps %s ahead of stale controls in a legacy host', async action => {
    await mount({}, { legacyHost: true }); const change = checkAction(1), finish = capture(action);
    await act(async () => { change(); finish(); change(); });
    if (action === 'reset') { expect(latest.preflightChecked).toEqual({}); expect(latest.preflightOpen).toEqual({}); }
    else { expect(latest.view).toBe('menu'); expect(latest.preflightChecked).toEqual({ 'Documents-0': true, 'Documents-1': true }); }
  });
});
