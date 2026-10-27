import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, savedRoot, externalPatch, poke, pending, replayChecks, errors, xp, writes;
const copy = value => JSON.parse(JSON.stringify(value));
const inputs = (patch = {}) => ({ calcPreset: 0, calcSpeed: 100, calcAltitude: 0, calcWingArea: 174, calcCl: 1.5, ...patch });
const reference = (patch = {}) => inputs({ calcSpeed: 50, ...patch });
const readButton = () => host.querySelector('[data-flight-calculator-read-results]');
const snapshot = () => host.querySelector('[data-flight-calculator-results]');
const text = () => host.querySelector('[data-flight-calculator-result-text]')?.textContent || '';
const visibleText = () => snapshot() && !snapshot().hidden ? text() : '';
const live = () => document.getElementById('skyschool-a11y-live');
const action = name => host.querySelector('[data-flight-calculator-reference-action="' + name + '"]');
const range = label => host.querySelector('input[type="range"][aria-label="' + label + '"]');
const button = value => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === value);
function handler(node, event = 'onClick') {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event];
}
function retainedRead() {
  const node = readButton(), callback = handler(node);
  return () => callback({ currentTarget: node, target: node });
}
function slider(label, value) {
  const node = range(label), change = handler(node, 'onChange');
  return () => change({ target: { value: String(value) }, currentTarget: node });
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function run(callback) { await act(async () => callback()); }
async function tick() { await act(async () => vi.advanceTimersByTime(60)); }
async function read() { await click(readButton()); await tick(); return text(); }
async function patch(values) { await act(async () => externalPatch(values)); }
async function commit(count = 1) {
  expect(pending.length).toBeGreaterThanOrEqual(count);
  const batch = pending.splice(0, count); await act(async () => batch.forEach(apply => apply()));
}
async function flush() { for (let count = 0; pending.length; count++) { expect(count).toBeLessThan(30); await commit(); } }
function loadFlightTool() {
  if (!process.env.SKYSCHOOL_CALCULATOR_RESULTS_SOURCE) return loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_data_skyschool_geo.js'), 'utf8'))();
  new Function(readFileSync(resolve(process.cwd(), process.env.SKYSCHOOL_CALCULATOR_RESULTS_SOURCE), 'utf8'))();
  const loaded = window.StemLab?._registry?.flightSim;
  if (!loaded) throw new Error('Frozen source did not register Sky School');
  return loaded;
}
async function mount(seed = {}, options = {}) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  pending = []; writes = 0;
  function App() {
    const [data, setData] = React.useState({ otherTool: { writing: 'Keep unrelated writing.' }, flightSim: {
      view: 'calculator', ...inputs(), calcReference: null, teacherMarker: 'original',
      quizScore: 3, quizTotal: 7, completedLessons: { lift: true }, totalFlightTime: 900, ...seed,
    } });
    const [, renderLocal] = React.useState(0);
    savedRoot = data; latest = data.flightSim; poke = () => renderLocal(value => value + 1);
    externalPatch = values => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...values } }));
    const submit = update => {
      writes++;
      const apply = () => setData(previous => {
        if (typeof update !== 'function') return update;
        const before = JSON.stringify(previous), first = update(previous), second = update(previous);
        replayChecks.push({ immutable: JSON.stringify(previous) === before, stable: JSON.stringify(first) === JSON.stringify(second) });
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
  tool = loadFlightTool(); api = window.__RR_TEST_EXPORTS__.flightSim;
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

describe('readable calculator results', () => {
  it('offers a named native action with an initially empty quiet snapshot', async () => {
    await mount();
    expect(readButton()?.tagName).toBe('BUTTON');
    expect(readButton().textContent).toBe('Read results');
    expect(readButton().getAttribute('aria-controls')).toBe('skyschool-calculator-results');
    expect(snapshot()?.id).toBe('skyschool-calculator-results');
    expect(snapshot().getAttribute('aria-live')).toBe('off');
    expect(visibleText()).toBe(''); expect(live().textContent).toBe('');
  });

  it.each([0, 1, 2, 3, 4])('reads the named inputs, lift and preset weight for aircraft preset %s', async calcPreset => {
    const normalized = api.normalizeFlightCalculatorInputs({ calcPreset, calcSpeed: 100, calcAltitude: 10000 });
    await mount(normalized); const result = await read(), preset = api.FORCE_CALCULATOR_PRESETS[calcPreset];
    const rho = api.Physics.airDensity(10000);
    const lift = .5 * rho * (100 * 1.6878) ** 2 * normalized.calcWingArea * normalized.calcCl;
    expect(result).toContain(preset.name);
    expect(result).toContain('100 knots');
    expect(result).toContain((10000).toLocaleString());
    expect(result).toContain(normalized.calcWingArea.toLocaleString());
    expect(result).toMatch(/square feet/i);
    expect(result).toContain(normalized.calcCl.toFixed(2));
    expect(result).toContain(rho.toFixed(5));
    expect(result).toContain(Math.round(lift).toLocaleString());
    expect(result).toContain(preset.weight.toLocaleString());
    expect(result).toContain((lift / preset.weight).toFixed(2));
    expect(result).toMatch(/pounds/i);
    expect(result).toMatch(/vertical force/i);
    expect(live().textContent).toBe(result);
    expect(snapshot().hidden).toBe(false);
  });

  it('keeps current input and reference updates quiet until a request names the comparison', async () => {
    await mount({ calcReference: reference(), calcSpeed: 100 });
    const comparison = host.querySelector('[data-flight-calculator-compare]');
    const changedVariables = comparison.querySelector('[role="status"]').textContent;
    expect(comparison.querySelector('output')).toBeNull();
    expect(host.querySelector('[data-flight-calculator-lift-factor]').tagName).toBe('SPAN');
    await run(slider('True airspeed (kts)', 125)); await tick();
    expect(comparison.querySelector('[role="status"]').textContent).toBe(changedVariables);
    expect(live().textContent).toBe(''); expect(visibleText()).toBe('');
    const result = await read();
    expect(result).toContain('6.25');
    expect(result).toMatch(/reference lift/i);
    expect(result).toContain('True airspeed');
    expect(result).toMatch(/held fixed/i);
  });

  it('explains a zero-lift reference without an infinite multiplier', async () => {
    await mount({ calcReference: reference({ calcSpeed: 0 }) });
    const result = await read();
    expect(result).toMatch(/reference lift.*zero|zero.*reference lift/i);
    expect(result).not.toMatch(/Infinity|NaN/);
    expect(result).toMatch(/cannot|unavailable|undefined/i);
  });

  it('does not speak negative zero for a small negative lift change rounded to whole pounds', async () => {
    const tiny = inputs({ calcSpeed: 1, calcWingArea: 5, calcCl: 0.1 });
    await mount({ ...tiny, calcAltitude: 500, calcReference: tiny });
    const result = await read();
    expect(result).toContain('Change in lift 0 pounds.');
    expect(result).not.toMatch(/-0(?:\D|$)/);
  });

  it.each([null, { calcSpeed: 50 }])('identifies absent or unusable reference %j without invented comparison evidence', async calcReference => {
    await mount({ calcReference }); const result = await read();
    expect(result).toMatch(/no.*reference|reference.*not.*(?:recorded|available|saved)/i);
    expect(result).not.toMatch(/times (?:the )?reference lift/i);
    expect(latest.calcReference).toEqual(calcReference);
  });

  it('reads again without writing saved data, awarding evidence, or moving focus', async () => {
    await mount({}, { strict: true }); const before = copy(savedRoot), initialWrites = writes;
    const result = await read();
    expect(document.activeElement).toBe(readButton());
    await click(readButton()); expect(live().textContent).toBe('');
    await tick(); expect(live().textContent).toBe(result);
    expect(savedRoot).toEqual(before); expect(writes).toBe(initialWrites); expect(pending).toHaveLength(0);
  });
});

describe('calculator result request ownership', () => {
  it('reads queued inputs and preserves its snapshot through local renders and delayed cloned receipts', async () => {
    await mount({}, { delayed: true, strict: true, cloneAtCommit: true });
    await run(slider('True airspeed (kts)', 125)); await run(poke);
    expect(latest.calcSpeed).toBe(100); const result = await read();
    expect(result).toContain('125 knots'); expect(pending).toHaveLength(1);
    await flush(); await tick();
    expect(latest.calcSpeed).toBe(125); expect(visibleText()).toBe(result); expect(live().textContent).toBe(result);
  });

  it('keeps its requested pending reference through separately acknowledged prefixes', async () => {
    await mount({}, { delayed: true, cloneAtCommit: true });
    await run(slider('True airspeed (kts)', 125)); await run(handler(action('save')));
    const result = await read(); expect(pending).toHaveLength(2);
    expect(result).toContain('125 knots'); expect(result).toContain('1.00');
    await commit(); await run(poke); expect(visibleText()).toBe(result);
    await flush(); expect(visibleText()).toBe(result); expect(latest.calcReference.calcSpeed).toBe(125);
  });

  it('clears an earlier requested result immediately when a new edit awaits its host receipt', async () => {
    await mount({}, { delayed: true }); await read();
    await run(slider('True airspeed (kts)', 125));
    expect(latest.calcSpeed).toBe(100); expect(pending).toHaveLength(1); expect(visibleText()).toBe('');
    expect(await read()).toContain('125 knots'); await flush(); expect(visibleText()).toContain('125 knots');
  });

  it.each(['inputs', 'reference', 'preset'])('expires a snapshot and stale handler when %s changes', async kind => {
    await mount({ calcReference: reference() }); await read(); const old = retainedRead();
    if (kind === 'inputs') await run(slider('True airspeed (kts)', 125));
    if (kind === 'reference') await run(handler(action('clear')));
    if (kind === 'preset') await click(button('Boeing 747'));
    expect(visibleText()).toBe(''); await run(old); await tick(); expect(visibleText()).toBe('');
    await read(); expect(visibleText()).not.toBe('');
  });

  it.each(['inputs', 'reference', 'view'])('retires old requests across a host %s A-to-B-to-A replacement', async kind => {
    await mount({ calcReference: reference() }); const old = retainedRead(), original = copy(latest);
    await read();
    await patch(kind === 'inputs' ? { calcSpeed: 125 } : kind === 'reference' ? { calcReference: reference({ calcSpeed: 75 }) } : { view: 'menu' });
    await patch(original); expect(visibleText()).toBe('');
    await run(old); await tick(); expect(visibleText()).toBe('');
    await read(); expect(visibleText()).not.toBe('');
  });

  it('keeps pending Menu ahead of a read from the still-mounted calculator', async () => {
    await mount({}, { delayed: true }); const old = retainedRead();
    await run(handler(button('← Menu'))); await run(poke);
    await click(readButton()); await run(old); await tick();
    expect(visibleText()).toBe(''); expect(pending).toHaveLength(1); expect(live().textContent).toBe('');
    await flush(); expect(latest.view).toBe('menu');
  });

  it('does not announce a result sampled before a same-batch foreign input replacement renders', async () => {
    await mount(); const old = retainedRead();
    await act(async () => { externalPatch({ calcSpeed: 125 }); old(); });
    await tick(); expect(latest.calcSpeed).toBe(125); expect(visibleText()).toBe(''); expect(live().textContent).toBe('');
  });

  it('retires results sampled from a queued edit when the host rejects its origin', async () => {
    await mount({}, { delayed: true }); await run(slider('True airspeed (kts)', 125));
    await click(readButton()); await patch({ calcSpeed: 150, teacherMarker: 'new conditions' });
    await flush(); await tick();
    expect(latest.calcSpeed).toBe(150); expect(visibleText()).toBe(''); expect(live().textContent).toBe('');
  });

  it('retains results and usable controls after compatible metadata and canonical clones', async () => {
    await mount({ calcReference: reference() }); const old = retainedRead(), result = await read();
    await patch({ calcPreset: '0', calcSpeed: 100.4, calcReference: { ...reference(), note: 'annotation', liftLb: 999999 }, teacherMarker: 'new metadata' });
    expect(visibleText()).toBe(result); await run(old); await tick(); expect(visibleText()).toBe(result);
    expect(latest.teacherMarker).toBe('new metadata');
  });

  it('reads ordered optimistic edits in a legacy host without adding host writes', async () => {
    await mount({}, { legacyHost: true, delayed: true });
    await run(slider('True airspeed (kts)', 125)); const before = writes;
    expect(await read()).toContain('125 knots'); expect(writes).toBe(before);
    await flush(); expect(visibleText()).toContain('125 knots');
  });

  it('does not resurrect an expired pending announcement after legacy inputs return to the same values', async () => {
    await mount({}, { legacyHost: true, delayed: true });
    await click(readButton());
    const change = handler(range('True airspeed (kts)'), 'onChange');
    await act(async () => {
      change({ target: { value: '125' } });
      change({ target: { value: '100' } });
    });
    await tick();
    expect(visibleText()).toBe(''); expect(live().textContent).toBe('');
    await flush(); expect(latest.calcSpeed).toBe(100); expect(visibleText()).toBe('');
  });

  it('retires a pending announcement and detached handler on unmount', async () => {
    await mount(); const old = retainedRead(); await click(readButton());
    await act(async () => root.unmount()); root = null;
    await run(old); await tick(); expect(live()).toBeNull(); expect(host.textContent).toBe('');
  });
});
