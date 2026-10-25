import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, savedRoot, externalPatch, poke, pending, replayChecks, errors, xp;
const copy = value => JSON.parse(JSON.stringify(value));
const inputs = (patch = {}) => ({ calcPreset: 0, calcSpeed: 100, calcAltitude: 0, calcWingArea: 174, calcCl: 1.5, ...patch });
const reference = (patch = {}) => inputs({ calcSpeed: 50, ...patch });
const action = name => host.querySelector('[data-flight-calculator-reference-action="' + name + '"]');
const comparison = () => host.querySelector('[data-flight-calculator-compare]');
const range = label => host.querySelector('input[type="range"][aria-label="' + label + '"]');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
function slider(label, value) {
  const node = range(label), change = handler(node, 'onChange');
  return () => change({ target: { value: String(value) }, currentTarget: node });
}
async function run(callback) { await act(async () => callback()); }
async function patch(values) { await act(async () => externalPatch(values)); }
async function commit(count = 1) {
  expect(pending.length).toBeGreaterThanOrEqual(count);
  const batch = pending.splice(0, count); await act(async () => batch.forEach(apply => apply()));
}
async function flush() {
  for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(30); await commit(); }
}
function foreign(kind) {
  if (kind === 'inputs') return { calcSpeed: 125, calcAltitude: 10000, teacherMarker: 'new conditions' };
  if (kind === 'reference') return { calcReference: reference({ calcSpeed: 75, calcAltitude: 5000 }), teacherMarker: 'new reference' };
  return { view: 'menu', teacherMarker: 'different activity' };
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Keep unrelated writing.' }, flightSim: {
      view: 'calculator', ...inputs(), calcReference: reference(), teacherMarker: 'original',
      quizScore: 3, quizTotal: 7, completedLessons: { lift: true }, totalFlightTime: 900,
      aircraft: 'cessna172', ...seed,
    } });
    const [, renderLocal] = React.useState(0);
    savedRoot = data; latest = data.flightSim; poke = () => renderLocal(value => value + 1);
    externalPatch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = update => {
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayChecks.push({ immutable: JSON.stringify(previous) === before, stable: JSON.stringify(first) === JSON.stringify(second) });
        // Preserve runtime root receipts while modeling a host that JSON-clones
        // saved tool records before rendering its accepted state.
        return options.cloneAtCommit && second !== previous ? { ...second, flightSim: copy(second.flightSim) } : second;
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
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled();
  expect(replayChecks.every(check => check.immutable && check.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School calculator reference ownership', () => {
  it.each(['save', 'clear'].flatMap(name => ['committed', 'pending'].flatMap(timing =>
    ['inputs', 'reference', 'view'].map(kind => [name, timing, kind]))))
    ('rejects an old %s after a %s host replacement of %s', async (name, timing, kind) => {
      await mount(); const old = handler(action(name)), original = copy(latest), replacement = foreign(kind);
      if (timing === 'committed') { await patch(replacement); await run(old); }
      else await act(async () => { externalPatch(replacement); old(); });
      expect(latest).toEqual({ ...original, ...replacement });
      expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
    });

  it.each(['save', 'clear'].flatMap(name => ['inputs', 'reference', 'view'].map(kind => [name, kind])))
    ('rejects a fully delayed %s after foreign %s replaces the accepted origin', async (name, kind) => {
      await mount({}, { delayed: true, strict: true }); const original = copy(latest);
      await run(handler(action(name))); expect(pending).toHaveLength(1); expect(latest).toEqual(original);
      await patch(foreign(kind)); const replacement = copy(latest);
      await flush(); expect(latest).toEqual(replacement);
    });

  it.each(['save', 'clear'].flatMap(name => ['inputs', 'reference', 'view'].map(kind => [name, kind])))
    ('retires a retained %s through an A-to-B-to-A %s replacement', async (name, kind) => {
      await mount(); const old = handler(action(name)), original = copy(latest);
      await patch(foreign(kind)); await patch(original); await run(old); expect(latest).toEqual(original);
      await run(handler(action(name)));
      expect(latest.calcReference).toEqual(name === 'save' ? inputs() : null);
    });

  it.each(['save', 'clear'])('rejects a fully delayed %s even after foreign input conditions return to identical values', async name => {
    await mount({}, { delayed: true }); const original = copy(latest);
    await run(handler(action(name))); await patch(foreign('inputs')); await patch(original);
    await flush(); expect(latest).toEqual(original);
    await run(handler(action(name))); await flush(); expect(latest.calcReference).toEqual(name === 'save' ? inputs() : null);
  });

  it.each(['local', 'metadata'])('saves exact optimistic inputs after a delayed slider edit and a %s rerender', async rerender => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    await run(slider('True airspeed (kts)', 125)); expect(latest.calcSpeed).toBe(100);
    if (rerender === 'local') await run(poke);
    else await patch({ teacherMarker: 'compatible metadata', calcReference: copy(latest.calcReference) });
    await run(handler(action('save'))); expect(pending).toHaveLength(2);
    await commit(); expect(latest.calcSpeed).toBe(125); expect(latest.calcReference).toEqual(reference());
    await flush(); expect(latest.calcReference).toEqual(inputs({ calcSpeed: 125 }));
    expect(comparison().getAttribute('data-change-count')).toBe('0');
    if (rerender === 'metadata') expect(latest.teacherMarker).toBe('compatible metadata');
  });

  it.each([false, true])('preserves save/edit/save/clear order through delayed prefix receipts; cloned records: %s', async cloneAtCommit => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit });
    const save = handler(action('save')), clear = handler(action('clear')), edit = slider('True airspeed (kts)', 150);
    await act(async () => { save(); edit(); save(); clear(); }); expect(pending).toHaveLength(4);
    await run(poke); await commit(); expect(latest.calcReference).toEqual(inputs());
    await run(poke); await commit(); expect(latest.calcSpeed).toBe(150); expect(latest.calcReference).toEqual(inputs());
    await commit(); expect(latest.calcReference).toEqual(inputs({ calcSpeed: 150 }));
    await flush(); expect(latest.calcSpeed).toBe(150); expect(latest.calcReference).toBeNull(); expect(comparison()).toBeNull();
    await run(handler(action('save'))); await flush(); expect(latest.calcReference).toEqual(inputs({ calcSpeed: 150 }));
    expect(replayChecks.length).toBeGreaterThan(0);
  });

  it('captures every preceding input edit but excludes later edits in the same delayed batch', async () => {
    await mount({}, { delayed: true, strict: true });
    const speed = slider('True airspeed (kts)', 125), altitude = slider('Altitude', 10000);
    const save = handler(action('save')), area = slider('Wing area', 200);
    await act(async () => { speed(); altitude(); save(); area(); }); await flush();
    expect(latest.calcReference).toEqual(inputs({ calcSpeed: 125, calcAltitude: 10000 }));
    expect(api.normalizeFlightCalculatorInputs(latest)).toEqual(inputs({ calcSpeed: 125, calcAltitude: 10000, calcWingArea: 200 }));
    expect(comparison().getAttribute('data-change-count')).toBe('1');
    expect(host.querySelector('[data-flight-calculator-field="calcWingArea"]').textContent).toContain('Earlier: 174');
  });

  it('captures a preceding preset and its following slider edit without storing rendered old aircraft inputs', async () => {
    await mount({}, { delayed: true, cloneAtCommit: true });
    const preset = handler(button('Boeing 747')), speed = slider('True airspeed (kts)', 100), save = handler(action('save'));
    await act(async () => { preset(); speed(); save(); }); await run(poke); await flush();
    expect(latest.calcReference).toEqual({ calcPreset: 1, calcSpeed: 100, calcAltitude: 0, calcWingArea: 5500, calcCl: 1.4 });
    expect(api.normalizeFlightCalculatorInputs(latest)).toEqual(latest.calcReference);
    expect(button('Boeing 747').getAttribute('aria-pressed')).toBe('true');
  });

  it.each(['save', 'clear'])('accepts a retained %s after compatible cloned inputs, reference metadata, and sibling changes', async name => {
    await mount(); const old = handler(action(name));
    await patch({ ...copy(inputs()), calcReference: { ...copy(reference()), note: 'unrelated reference annotation', liftLb: 999999 },
      teacherMarker: 'new teacher metadata', unrelatedCalculatorSetting: { enabled: true } });
    await run(old);
    expect(latest.calcReference).toEqual(name === 'save' ? inputs() : null);
    expect(latest.teacherMarker).toBe('new teacher metadata'); expect(latest.unrelatedCalculatorSetting).toEqual({ enabled: true });
    expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
  });

  it.each(['save', 'clear'])('merges a delayed %s with compatible current metadata without overwriting it', async name => {
    await mount({}, { delayed: true, cloneAtCommit: true }); await run(handler(action(name)));
    await patch({ teacherMarker: 'metadata arriving while pending', calcReference: { ...copy(reference()), unrelated: 'keep identity' },
      evidenceNotes: { teacher: 'Preserve this independent note.' } });
    await flush(); expect(latest.calcReference).toEqual(name === 'save' ? inputs() : null);
    expect(latest.evidenceNotes).toEqual({ teacher: 'Preserve this independent note.' });
    expect(latest.teacherMarker).toBe('metadata arriving while pending');
  });

  it('keeps Menu ahead of retained save and clear callbacks in the same batch', async () => {
    await mount({}, { delayed: true }); const original = copy(latest);
    const leave = handler(button('← Menu')), save = handler(action('save')), clear = handler(action('clear'));
    await act(async () => { leave(); save(); clear(); }); expect(pending).toHaveLength(1); await flush();
    expect(latest).toEqual({ ...original, view: 'menu' });
  });

  it('preserves an accepted reference before Menu even when updates commit separately', async () => {
    await mount({}, { delayed: true }); const save = handler(action('save')), leave = handler(button('← Menu'));
    await act(async () => { save(); leave(); }); expect(pending).toHaveLength(2);
    await commit(); expect(latest.calcReference).toEqual(inputs()); expect(latest.view).toBe('calculator');
    await flush(); expect(latest.view).toBe('menu'); expect(latest.calcReference).toEqual(inputs());
  });

  it('restores serialized canonical reference conditions without manufacturing flight or learning evidence', async () => {
    await mount({ calcSpeed: 0 }); await run(handler(action('save'))); await run(slider('True airspeed (kts)', 125));
    const snapshot = copy(latest); await mount(snapshot);
    expect(latest).toEqual(snapshot); expect(latest.calcReference).toEqual(inputs({ calcSpeed: 0 }));
    expect(Object.keys(latest.calcReference).sort()).toEqual(Object.keys(inputs()).sort());
    expect(comparison().getAttribute('data-change-count')).toBe('1');
    expect(host.querySelector('[data-flight-calculator-lift-factor]').textContent).toBe('Not recorded');
    expect([latest.quizScore, latest.quizTotal, latest.totalFlightTime]).toEqual([3, 7, 900]);
    expect(latest.completedLessons).toEqual({ lift: true });
    for (const key of ['lastDebrief', 'flightPractice', 'flightPracticeHistory', 'challengeResults', 'challengeCompleted', 'earnedBadges']) {
      expect(latest).not.toHaveProperty(key);
    }
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it.each([false, true])('preserves valid edit/save/clear chains in a legacy host; delayed acceptance: %s', async delayed => {
    await mount({}, { legacyHost: true, delayed });
    const speed = slider('True airspeed (kts)', 125), save = handler(action('save')), clear = handler(action('clear'));
    await act(async () => { speed(); save(); clear(); save(); }); await flush();
    expect(latest.calcSpeed).toBe(125); expect(latest.calcReference).toEqual(inputs({ calcSpeed: 125 }));
    expect(savedRoot.otherTool).toEqual({ writing: 'Keep unrelated writing.' });
    await act(async () => { handler(button('← Menu'))(); clear(); }); await flush();
    expect(latest.view).toBe('menu'); expect(latest.calcReference).toEqual(inputs({ calcSpeed: 125 }));
  });
});
