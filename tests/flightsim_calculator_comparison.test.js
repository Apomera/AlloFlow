import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let api, tool, host, root, latest, awardXP, celebrate, addToast;
const baseline = (patch = {}) => ({ calcPreset: 0, calcSpeed: 60, calcAltitude: 0, calcWingArea: 100, calcCl: 1, ...patch });
const reference = () => host.querySelector('[data-flight-calculator-reference]');
const comparison = () => host.querySelector('[data-flight-calculator-compare]');
const factor = () => host.querySelector('[data-flight-calculator-lift-factor]');
const action = name => host.querySelector('[data-flight-calculator-reference-action="' + name + '"]');
const row = name => comparison().querySelector('[data-flight-calculator-field="' + name + '"]');
const range = (label = 'True airspeed (kts)') => host.querySelector('input[type="range"][aria-label="' + label + '"]');
const currentInputs = () => Object.fromEntries(Object.keys(baseline()).map(key => [key, latest[key]]));
function button(label) {
  const result = [...host.querySelectorAll('button')].find(node => node.textContent === label);
  expect(result, `Button: ${label}`).toBeTruthy(); return result;
}
function handler(node, event) {
  expect(node).toBeTruthy();
  return node[Object.keys(node).find(key => key.startsWith('__reactProps$'))][event];
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function change(label, value) {
  const input = range(label); expect(input).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function mount(seed = {}, t) {
  if (root) await act(async () => root.unmount()); host?.remove();
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'calculator', ...baseline(), ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...(t ? { t } : {}), awardXP, celebrate, addToast,
      update: (id, name, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [name]: value } })),
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  awardXP = vi.fn(); celebrate = vi.fn(); addToast = vi.fn();
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Sky School calculator controlled comparisons', () => {
  it('uses the existing density, true-speed conversion, lift formula, and aircraft weights for every preset', () => {
    api.FORCE_CALCULATOR_PRESETS.forEach((preset, index) => {
      const inputs = api.normalizeFlightCalculatorInputs({ calcPreset: index, calcSpeed: 100, calcAltitude: 10000 });
      const result = api.flightCalculatorCondition(inputs);
      const expected = .5 * api.Physics.airDensity(10000) * (100 * 1.6878) ** 2 * inputs.calcWingArea * inputs.calcCl;
      expect(result.inputs).toEqual(inputs);
      expect(result.density).toBe(api.Physics.airDensity(10000));
      expect(result.liftLb).toBeCloseTo(expected, 8);
      expect(result.weightLb).toBe(preset.weight);
      expect(result.liftWeightRatio).toBeCloseTo(expected / preset.weight, 10);
    });
  });

  it('shows exactly four times the lift when true airspeed doubles and every other input stays fixed', () => {
    const saved = baseline(), current = baseline({ calcSpeed: 120 });
    const result = api.flightCalculatorComparison(current, saved);
    expect(result).toMatchObject({ kind: 'single', changed: ['calcSpeed'], liftFactor: 4 });
    expect(result.held).toEqual(['calcPreset', 'calcAltitude', 'calcWingArea', 'calcCl']);
    expect(result.liftChange).toBeCloseTo(result.reference.liftLb * 3, 10);
    expect(saved).toEqual(baseline()); expect(current).toEqual(baseline({ calcSpeed: 120 }));
  });

  it.each([
    ['calcWingArea', 200, 2],
    ['calcCl', 1.5, 1.5],
    ['calcAltitude', 10000, null],
  ])('isolates %s with the correct mathematical lift factor', (key, value, expectedFactor) => {
    const result = api.flightCalculatorComparison(baseline({ [key]: value }), baseline());
    expect(result.kind).toBe('single'); expect(result.changed).toEqual([key]);
    const expected = expectedFactor ?? api.Physics.airDensity(10000) / api.Physics.airDensity(0);
    expect(result.liftFactor).toBeCloseTo(expected, 10);
    expect(result.held).toHaveLength(4);
  });

  it('identifies multiple changed inputs and calculates their combined effect without claiming one cause', () => {
    const result = api.flightCalculatorComparison(baseline({ calcSpeed: 120, calcAltitude: 10000, calcWingArea: 200, calcCl: 1.5 }), baseline());
    expect(result).toMatchObject({ kind: 'mixed', changed: ['calcSpeed', 'calcAltitude', 'calcWingArea', 'calcCl'], held: ['calcPreset'] });
    expect(result.liftFactor).toBeCloseTo(12 * api.Physics.airDensity(10000) / api.Physics.airDensity(0), 10);
    expect(api.flightCalculatorComparison(baseline(), baseline())).toMatchObject({ kind: 'same', changed: [], liftFactor: 1, liftChange: 0 });
  });

  it('keeps a zero-lift reference usable for a signed change without dividing by zero', () => {
    const result = api.flightCalculatorComparison(baseline(), baseline({ calcSpeed: 0 }));
    expect(result.reference.liftLb).toBe(0); expect(result.liftFactor).toBeNull();
    expect(result.liftChange).toBe(result.current.liftLb); expect(Number.isFinite(result.liftChange)).toBe(true);
  });

  it('keeps only detached canonical input evidence and recomputes any claimed saved outputs', () => {
    const saved = { ...baseline(), liftLb: 999999, density: 99, weightLb: 0, extra: { hidden: 'discard' } };
    const normalized = api.normalizeFlightCalculatorReference(saved);
    expect(normalized).toEqual(baseline()); expect(normalized).not.toBe(saved);
    expect(api.flightCalculatorComparison(baseline(), saved).reference.liftLb).not.toBe(999999);
    saved.calcSpeed = 120; expect(normalized.calcSpeed).toBe(60);
  });

  it('rejects missing, inherited, nonfinite, out-of-bounds, and off-step reference fields without inventing defaults', () => {
    const missing = baseline(); delete missing.calcCl;
    const invalid = [null, [], 'bad', {}, missing, Object.create(baseline()),
      baseline({ calcPreset: '0' }), baseline({ calcPreset: 99 }), baseline({ calcSpeed: Infinity }),
      baseline({ calcSpeed: 187 }), baseline({ calcSpeed: -1 }), baseline({ calcSpeed: 60.4 }),
      baseline({ calcAltitude: 50500 }), baseline({ calcAltitude: 7300 }), baseline({ calcWingArea: 4 }),
      baseline({ calcWingArea: 601 }), baseline({ calcCl: NaN }), baseline({ calcCl: '1' }), baseline({ calcCl: 1.333 }),
      baseline({ calcCl: .05 }), baseline({ calcCl: 2.05 })];
    for (const saved of invalid) {
      expect(api.normalizeFlightCalculatorReference(saved)).toBeNull();
      expect(api.flightCalculatorComparison(baseline(), saved)).toBeNull();
    }
  });

  it('saves one reference and exposes the actual fourfold lift comparison while preserving current inputs', async () => {
    await mount({ keep: 'preserved', quizScore: 7 }); const before = currentInputs();
    expect(comparison()).toBeNull(); expect(reference().textContent).toContain('Not recorded'); expect(action('clear').getAttribute('aria-disabled')).toBe('true');
    await click(action('save'));
    expect(latest.calcReference).toEqual(before); expect(currentInputs()).toEqual(before);
    expect(comparison().getAttribute('data-comparison-kind')).toBe('same');
    await change('True airspeed (kts)', 120);
    expect(comparison().getAttribute('data-comparison-kind')).toBe('single');
    expect(comparison().getAttribute('data-change-count')).toBe('1');
    expect(factor().textContent).toBe('4.00×');
    expect(row('calcSpeed').textContent).toContain('Earlier: 60 kts');
    expect(row('calcSpeed').textContent).toContain('Latest: 120 kts');
    expect(row('calcSpeed').textContent).toContain('Change: +60 kts');
    expect(comparison().textContent).toContain('Changed: 1 · True airspeed (kts). Held fixed:');
    expect(latest.calcReference).toEqual(before); expect(latest.keep).toBe('preserved'); expect(latest.quizScore).toBe(7);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled(); expect(addToast).not.toHaveBeenCalled();
  });

  it('retains the reference, current values, and comparison across a serialized remount', async () => {
    await mount(); await click(action('save')); await change('Altitude', 10000); await change('Wing area', 200);
    const saved = JSON.parse(JSON.stringify(latest)), expected = api.flightCalculatorComparison(saved, saved.calcReference);
    await mount(saved);
    expect(latest).toEqual(saved); expect(comparison().getAttribute('data-comparison-kind')).toBe('mixed');
    expect(row('calcAltitude').textContent).toContain('Latest: 10,000 ft'); expect(row('calcWingArea').textContent).toContain('Latest: 200 ft²');
    expect(factor().textContent).toBe(expected.liftFactor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '×');
  });

  it('captures current queued edits and preserves later independent edits before React commits', async () => {
    await mount();
    const speed = handler(range(), 'onChange'), altitude = handler(range('Altitude'), 'onChange'), save = handler(action('save'), 'onClick');
    await act(async () => {
      speed({ target: { value: '100' } }); save();
      speed({ target: { value: '150' } }); altitude({ target: { value: '10000' } });
    });
    expect(latest.calcReference).toEqual(baseline({ calcSpeed: 100 }));
    expect(currentInputs()).toEqual(baseline({ calcSpeed: 150, calcAltitude: 10000 }));
    expect(comparison().getAttribute('data-change-count')).toBe('2');
  });

  it('captures a newly selected preset rather than the previous rendered aircraft', async () => {
    await mount(); const save = handler(action('save'), 'onClick');
    await act(async () => { button('Boeing 747').click(); save(); });
    const expected = api.normalizeFlightCalculatorInputs({ calcPreset: 1 });
    expect(currentInputs()).toEqual(expected); expect(latest.calcReference).toEqual(expected);
    expect(row('calcPreset').textContent).toContain('Earlier: Boeing 747'); expect(factor().textContent).toBe('1.00×');
  });

  it('clears only the reference after queued edits and permits saving a new reference', async () => {
    await mount({ calcReference: baseline(), keep: { notes: 'preserved' } });
    const speed = handler(range(), 'onChange'), clear = handler(action('clear'), 'onClick');
    await act(async () => { speed({ target: { value: '120' } }); clear(); clear(); });
    expect(latest.calcReference).toBeNull(); expect(currentInputs()).toEqual(baseline({ calcSpeed: 120 }));
    expect(latest.keep).toEqual({ notes: 'preserved' }); expect(comparison()).toBeNull();
    await click(action('save')); expect(latest.calcReference).toEqual(baseline({ calcSpeed: 120 }));
  });

  it('keeps reference/current aircraft identities and preset weights visible when changing aircraft', async () => {
    await mount({ calcReference: baseline() }); await click(button('Boeing 747'));
    expect(latest.calcReference).toEqual(baseline()); expect(comparison().getAttribute('data-comparison-kind')).toBe('mixed');
    expect(row('calcPreset').textContent).toContain('Earlier: Cessna 172'); expect(row('calcPreset').textContent).toContain('Latest: Boeing 747');
    expect(row('weight').textContent).toContain('Earlier: 2,550 lb'); expect(row('weight').textContent).toContain('Latest: 875,000 lb');
  });

  it('shows an unavailable factor for a zero-speed reference while keeping its measured change finite', async () => {
    await mount({ calcReference: baseline({ calcSpeed: 0 }) });
    expect(factor().textContent).toBe('Not recorded'); expect(row('lift').textContent).toContain('Earlier: 0 lb');
    expect(row('lift').textContent).toContain('Change: +'); expect(reference().textContent).not.toMatch(/Infinity|NaN|undefined/);
  });

  it('does not present malformed stored data as a reference and can clear it without changing current values', async () => {
    const invalid = { ...baseline(), calcSpeed: Infinity };
    await mount({ calcReference: invalid }); const before = currentInputs();
    expect(comparison()).toBeNull(); expect(reference().textContent).toContain('Not recorded'); expect(action('clear').disabled).toBe(false);
    await click(action('clear')); expect(latest.calcReference).toBeNull(); expect(currentInputs()).toEqual(before);
  });

  it('ignores queued save/clear actions after leaving the calculator', async () => {
    await mount({ calcReference: baseline() }); const before = currentInputs();
    const save = handler(action('save'), 'onClick'), clear = handler(action('clear'), 'onClick');
    await act(async () => { button('← Menu').click(); clear(); save(); });
    expect(latest.view).toBe('menu'); expect(latest.calcReference).toEqual(baseline()); expect(currentInputs()).toEqual(before);
    expect(awardXP).not.toHaveBeenCalled(); expect(celebrate).not.toHaveBeenCalled();
  });

  it('uses existing localized reference actions and true-airspeed labels without translating stored fields', async () => {
    const labels = { 'common.save': 'Enregistrer', 'common.clear': 'Effacer', 'stem.flightsim.guided_reference_conditions': 'Conditions de référence',
      'stem.flightsim.guided_practice_tas_units': 'Vitesse vraie (kt)', 'stem.flightsim.wing_area': 'Surface alaire' };
    await mount({}, (key, fallback) => labels[key] || fallback);
    expect(range('Vitesse vraie (kt)')).toBeTruthy(); expect(action('save').textContent).toBe('Enregistrer · Conditions de référence');
    await click(action('save')); expect(action('clear').textContent).toBe('Effacer · Conditions de référence');
    expect(row('calcWingArea').textContent).toContain('Surface alaire'); expect(latest.calcReference).toEqual(baseline());
  });
});
