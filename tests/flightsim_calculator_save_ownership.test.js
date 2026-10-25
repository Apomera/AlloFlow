import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, savedRoot, externalPatch, poke, pending, replayChecks, errors, xp, toast;
const copy = value => JSON.parse(JSON.stringify(value));
const condition = (patch = {}) => ({ calcPreset: 0, calcSpeed: 60, calcAltitude: 0, calcWingArea: 100, calcCl: 1, ...patch });
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent === label);
const range = (label = 'True airspeed (kts)') => host.querySelector('input[type="range"][aria-label="' + label + '"]');
function handler(node, name = 'onClick') {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][name];
}
function inputAction(label, value) {
  const change = handler(range(label), 'onChange'); return () => change({ target: { value: String(value) } });
}
function capture(action) {
  if (action === 'slider') return inputAction('True airspeed (kts)', 100);
  return handler(button(action === 'preset' ? 'Boeing 747' : '← Menu'));
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
const inputs = () => api.normalizeFlightCalculatorInputs(latest);
function foreign(change) {
  if (change === 'inputs') return { ...condition({ calcSpeed: 120, calcAltitude: 10000 }), teacherMarker: 'new conditions' };
  if (change === 'reference') return { calcReference: condition({ calcSpeed: 80 }), teacherMarker: 'new comparison' };
  return { view: 'menu', teacherMarker: 'new view' };
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); pending = [];
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Preserve unrelated work.' }, flightSim: {
      view: 'calculator', ...condition(), calcReference: condition({ calcSpeed: 40 }),
      quizScore: 3, quizTotal: 7, completedLessons: { lift: true }, teacherMarker: 'original', ...seed,
    } });
    const [, renderLocal] = React.useState(0);
    latest = data.flightSim; savedRoot = data; poke = () => renderLocal(value => value + 1);
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
    return tool.render(makeCtx({ toolData: data, setToolData: options.legacyHost ? undefined : submit, awardXP: xp, addToast: toast,
      update: (id, name, value) => submit(old => ({ ...old, [id]: { ...old[id], [name]: value } })),
      updateMulti: (id, values) => submit(old => ({ ...old, [id]: { ...old[id], ...values } })),
    }));
  }
  await act(async () => root.render(options.strict ? React.createElement(React.StrictMode, null, React.createElement(App)) : React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  replayChecks = []; errors = vi.spyOn(console, 'error').mockImplementation(() => {}); xp = vi.fn(); toast = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  expect(errors).not.toHaveBeenCalled(); expect(xp).not.toHaveBeenCalled(); expect(toast).not.toHaveBeenCalled();
  expect(replayChecks.every(item => item.immutable && item.stable)).toBe(true);
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks();
});

describe('Sky School calculator input save ownership', () => {
  it.each(['slider', 'preset', 'exit'].flatMap(action => ['committed', 'pending'].flatMap(timing =>
    ['inputs', 'reference'].map(change => [action, timing, change]))))
    ('rejects an old %s after a %s host replacement of %s', async (action, timing, change) => {
      await mount(); const old = capture(action), original = copy(latest), replacement = foreign(change);
      if (timing === 'committed') { await patch(replacement); await run(old); }
      else await act(async () => { externalPatch(replacement); old(); });
      expect(latest).toEqual({ ...original, ...replacement });
      expect(savedRoot.otherTool).toEqual({ writing: 'Preserve unrelated work.' });
    });

  it.each(['slider', 'preset', 'exit'].flatMap(action => ['inputs', 'reference', 'view', 'A to B to A'].map(change => [action, change])))
    ('rejects an accepted delayed %s after a host %s change', async (action, change) => {
      await mount({}, { delayed: true, strict: true }); const original = copy(latest);
      await run(capture(action)); expect(pending).toHaveLength(1);
      if (change === 'A to B to A') { await patch(foreign('inputs')); await patch(original); }
      else await patch(foreign(change));
      const before = copy(latest); await flush(); expect(latest).toEqual(before);
    });

  it.each(['slider', 'preset', 'exit'].flatMap(action => ['view', 'reference'].map(change => [action, change])))
    ('retires retained %s callbacks across a committed %s A to B to A visit', async (action, change) => {
      await mount(); const old = capture(action), original = copy(latest);
      await patch(foreign(change)); await patch(original); await run(old); expect(latest).toEqual(original);
      await run(capture(action));
      if (action === 'slider') expect(inputs()).toEqual(condition({ calcSpeed: 100 }));
      else if (action === 'preset') expect(inputs()).toEqual(api.normalizeFlightCalculatorInputs({ calcPreset: 1 }));
      else expect(latest.view).toBe('menu');
      expect(latest.calcReference).toEqual(original.calcReference);
    });

  it.each(['slider', 'preset'].flatMap(action => ['committed', 'delayed'].map(timing => [action, timing])))
    ('keeps a %s compatible with %s canonical clones and unrelated metadata', async (action, timing) => {
      await mount({}, { delayed: timing === 'delayed', strict: true, cloneAtCommit: true }); const old = capture(action);
      if (timing === 'delayed') await run(old);
      await act(async () => poke());
      await patch({ calcPreset: '0', calcSpeed: 60.4, calcReference: { ...copy(latest.calcReference), forgedLift: 999999 },
        teacherMarker: 'new metadata', teacherNotes: { kept: true } });
      if (timing === 'committed') await run(old); else await flush();
      if (action === 'slider') expect(inputs()).toEqual(condition({ calcSpeed: 100 }));
      else expect(inputs()).toEqual(api.normalizeFlightCalculatorInputs({ calcPreset: 1 }));
      expect(latest.teacherMarker).toBe('new metadata'); expect(latest.teacherNotes).toEqual({ kept: true });
      expect(latest.calcReference).toEqual({ ...condition({ calcSpeed: 40 }), forgedLift: 999999 });
      expect([latest.quizScore, latest.quizTotal]).toEqual([3, 7]); expect(latest.completedLessons).toEqual({ lift: true });
    });

  it.each([false, true])('retains independent pending sliders through local renders and prefix receipts; cloned commits: %s', async cloneAtCommit => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit });
    await run(inputAction('True airspeed (kts)', 100)); await act(async () => poke());
    await run(inputAction('Altitude', 10000)); expect(pending).toHaveLength(2);
    await commit(); expect(inputs()).toEqual(condition({ calcSpeed: 100 }));
    await act(async () => poke()); await run(inputAction('Wing area', 200)); await flush();
    expect(inputs()).toEqual(condition({ calcSpeed: 100, calcAltitude: 10000, calcWingArea: 200 }));
    expect(latest.calcReference).toEqual(condition({ calcSpeed: 40 }));
    expect(host.querySelector('[data-flight-calculator-compare]').getAttribute('data-change-count')).toBe('3');
  });

  it('preserves repeated speed edits through separately acknowledged prefixes without restoring an older value', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    const speed = handler(range(), 'onChange');
    await act(async () => { speed({ target: { value: '80' } }); speed({ target: { value: '100' } }); });
    await act(async () => poke()); await commit(); expect(inputs().calcSpeed).toBe(80);
    await run(inputAction('True airspeed (kts)', 150)); await flush();
    expect(inputs()).toEqual(condition({ calcSpeed: 150 })); expect(range().valueAsNumber).toBe(150);
  });

  it('keeps a pending preset and its later sliders together through local renders and prefix receipts', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    const oldSpeed = inputAction('True airspeed (kts)', 100), preset = capture('preset');
    await act(async () => { preset(); oldSpeed(); }); await act(async () => poke());
    await run(inputAction('Altitude', 10000)); await commit();
    expect(inputs()).toEqual(api.normalizeFlightCalculatorInputs({ calcPreset: 1 }));
    await act(async () => poke()); await flush();
    expect(inputs()).toEqual(api.normalizeFlightCalculatorInputs({ calcPreset: 1, calcSpeed: 100, calcAltitude: 10000 }));
    expect(latest.calcReference).toEqual(condition({ calcSpeed: 40 }));
    expect(button('Boeing 747').getAttribute('aria-pressed')).toBe('true');
    expect(range().valueAsNumber).toBe(100);
  });

  it('preserves a final deliberate preset when multiple selections and a slider are accepted in one batch', async () => {
    await mount({}, { delayed: true, strict: true });
    const boeing = capture('preset'), cessna = handler(button('Cessna 172')), speed = inputAction('True airspeed (kts)', 100);
    await act(async () => { boeing(); cessna(); speed(); }); await act(async () => poke()); await commit(); await flush();
    expect(inputs()).toEqual(api.normalizeFlightCalculatorInputs({ calcPreset: 0, calcSpeed: 100 }));
    expect(latest.calcReference).toEqual(condition({ calcSpeed: 40 }));
    expect(button('Cessna 172').getAttribute('aria-pressed')).toBe('true');
  });

  it('preserves an input accepted before Menu and rejects old controls after Menu', async () => {
    await mount({}, { delayed: true, strict: true });
    const speed = capture('slider'), preset = capture('preset'), exit = capture('exit');
    await act(async () => { speed(); exit(); preset(); speed(); }); expect(pending).toHaveLength(2);
    await act(async () => poke()); await commit(); expect(inputs()).toEqual(condition({ calcSpeed: 100 }));
    await flush(); expect(latest.view).toBe('menu'); expect(inputs()).toEqual(condition({ calcSpeed: 100 }));
    expect(latest.calcReference).toEqual(condition({ calcSpeed: 40 }));
  });

  it('keeps pending Menu exit ahead of freshly rerendered calculator controls', async () => {
    await mount({}, { delayed: true, strict: true }); await run(capture('exit')); await act(async () => poke());
    await run(capture('slider')); await run(capture('preset')); expect(pending).toHaveLength(1); await flush();
    expect(latest.view).toBe('menu'); expect(inputs()).toEqual(condition());
  });

  it('keeps ordered preset and slider edits in a legacy host without a functional setter', async () => {
    await mount({}, { legacyHost: true });
    const preset = capture('preset'), speed = capture('slider'), altitude = inputAction('Altitude', 10000);
    await act(async () => { preset(); speed(); altitude(); });
    expect(inputs()).toEqual(api.normalizeFlightCalculatorInputs({ calcPreset: 1, calcSpeed: 100, calcAltitude: 10000 }));
    expect(latest.calcReference).toEqual(condition({ calcSpeed: 40 }));
    expect(savedRoot.otherTool).toEqual({ writing: 'Preserve unrelated work.' });
  });

  it('keeps Menu ahead of stale inputs and presets in a legacy host', async () => {
    await mount({}, { legacyHost: true }); const speed = capture('slider'), exit = capture('exit'), preset = capture('preset');
    await act(async () => { speed(); exit(); preset(); speed(); });
    expect(latest.view).toBe('menu'); expect(inputs()).toEqual(condition({ calcSpeed: 100 }));
    expect(latest.calcReference).toEqual(condition({ calcSpeed: 40 }));
  });
});
