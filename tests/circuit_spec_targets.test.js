// 2026-11-11 Circuit Challenges: design-to-a-spec targets (fixed battery and parts, calculate the resistor first).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SRC = process.env.CIRCUIT_SRC || 'stem_lab/stem_tool_circuit.js';
const SPEC = { led: 10, ma25: 11, parallel: 12, divider: 13 };
const spec = (id, target) => ({ type: 'spec', id, target });
const LED = spec('spec_led', 0.015), MA25 = spec('spec_25ma', 0.025), PAR = spec('spec_parallel', 0.03), DIV = spec('spec_divider', 4);
const resistor = (id, value) => ({ id, type: 'resistor', value });
const led = (id, extra) => Object.assign({ id, type: 'led', value: 40, ledColor: '#ef4444' }, extra || {});
let api, config, host, root, latest, awardXP, addToast;

beforeEach(() => {
  const canvas = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, { get: (o, k) => (k in o ? o[k] : () => {}) });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvas);
  resetStemLab(); config = loadTool(SRC, 'circuit'); api = window.StemLab; awardXP = vi.fn(); addToast = vi.fn();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); if (host) host.remove(); root = null; host = null; vi.restoreAllMocks(); });

async function mount(state) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function Harness() { const [toolData, setToolData] = React.useState({ _circuit: state }); latest = toolData._circuit; return config.render(makeCtx({ toolData, setToolData, awardXP, addToast })); }
  await act(async () => root.render(React.createElement(Harness)));
}
const panel = () => host.querySelector('[aria-label="Active circuit target"]');
const reading = (state, challenge) => api.circuitChallengeReading(api.solveCircuit(state), challenge);
const req = (r, id) => r.reqs.find((x) => x.id === id);
async function type(input, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }

describe('the plan check runs the same model as the bench', () => {
  it('accepts the textbook answer and a nearby standard resistor, and rejects the classic slips', () => {
    // 9 V red LED at 15 mA: (9 − 2) ÷ 0.015 = 467 Ω. Forgetting the LED drop gives 9 ÷ 0.015 = 600 Ω.
    expect(api.circuitSpecPlanReading('spec_led', 466.67).ok).toBe(true);
    expect(api.circuitSpecPlanReading('spec_led', 470).ok).toBe(true);
    const forgot = api.circuitSpecPlanReading('spec_led', 600);
    expect(forgot.ok).toBe(false); expect(forgot.high).toBe(false);
    expect(api.circuitSpecPlanReading('spec_25ma', 200).ok).toBe(true);
    expect(api.circuitSpecPlanReading('spec_25ma', 220).ok).toBe(false);
    // Each parallel branch carries half the total: 6 ÷ 0.015 = 400 Ω. Using the whole 30 mA per branch gives 200 Ω.
    expect(api.circuitSpecPlanReading('spec_parallel', 400).ok).toBe(true);
    const whole = api.circuitSpecPlanReading('spec_parallel', 200);
    expect(whole.ok).toBe(false); expect(whole.high).toBe(true);
    expect(api.circuitSpecPlanReading('spec_divider', 100)).toBeNull();
    expect(api.circuitSpecPlanReading('spec_led', 0.47)).toBeNull();
  });
  it('agrees with the bench reading for the same parts', () => {
    const planned = api.circuitSpecPlanReading('spec_led', 470);
    const bench = reading({ mode: 'series', voltage: 9, components: [led(1), resistor(2, 470)] }, LED);
    expect(bench.actual).toBe(planned.actual);
    expect(bench.onTarget).toBe(true);
  });
});

describe('a spec target only counts with the stated battery and parts', () => {
  it('names the missing setup step before judging the reading', () => {
    const wrongSupply = reading({ mode: 'series', voltage: 12, components: [led(1), resistor(2, 670)] }, LED);
    expect(wrongSupply.onTarget).toBe(false);
    expect(wrongSupply.status).toBe('Check the setup');
    expect(req(wrongSupply, 'supply').ok).toBe(false);
    expect(wrongSupply.differenceText).toBe('Set the power supply to 9 V. It is at 12 V.');
    const green = reading({ mode: 'series', voltage: 9, components: [led(1, { ledColor: '#22c55e' }), resistor(2, 470)] }, LED);
    expect(req(green, 'parts').ok).toBe(false);
    const extra = reading({ mode: 'series', voltage: 9, components: [led(1), resistor(2, 470), { id: 3, type: 'bulb', value: 10 }] }, LED);
    expect(req(extra, 'parts').ok).toBe(false); expect(extra.onTarget).toBe(false);
    const metered = reading({ mode: 'series', voltage: 9, components: [led(1), { id: 3, type: 'ammeter', value: 0 }, resistor(2, 470)] }, LED);
    expect(metered.setupOk).toBe(true); expect(metered.onTarget).toBe(true);
  });
  it('needs equal parallel branches, even when unequal ones reach the total', () => {
    const equal = reading({ mode: 'parallel', voltage: 6, components: [resistor(1, 400), resistor(2, 400)] }, PAR);
    expect(equal.onTarget).toBe(true);
    const unequal = reading({ mode: 'parallel', voltage: 6, components: [resistor(1, 300), resistor(2, 600)] }, PAR);
    expect(unequal.actual).toBeCloseTo(0.03, 12);
    expect(req(unequal, 'equal').ok).toBe(false); expect(unequal.onTarget).toBe(false);
  });
  it('measures the second resistor in the divider and caps the current', () => {
    const good = reading({ mode: 'series', voltage: 12, components: [resistor(1, 200), resistor(2, 100)] }, DIV);
    expect(good.onTarget).toBe(true); expect(good.actualText).toBe('4.00V');
    const tiny = reading({ mode: 'series', voltage: 12, components: [resistor(1, 2), resistor(2, 1)] }, DIV);
    expect(tiny.actual).toBeCloseTo(4, 9);
    expect(req(tiny, 'max_current').ok).toBe(false); expect(tiny.onTarget).toBe(false);
    const swapped = { mode: 'series', voltage: 12, components: [resistor(1, 100), resistor(2, 200)] };
    const high = reading(swapped, DIV);
    expect(high.status).toBe('Above target');
    expect(api.circuitChallengeHint(api.solveCircuit(swapped), high)).toContain('make the second one smaller');
  });
  it('explains a reversed LED instead of only saying open circuit', () => {
    const state = { mode: 'series', voltage: 9, components: [led(1, { reversed: true }), resistor(2, 470)] };
    const r = reading(state, LED);
    expect(r.open).toBe(true);
    expect(api.circuitChallengeHint(api.solveCircuit(state), r)).toContain('faces the wrong way');
  });
  it('keeps the ten reading targets and their saved indexes', () => {
    expect(api.circuitChallengeIndex({ type: 'current', target: 2 })).toBe(0);
    expect(api.circuitChallengeIndex({ type: 'current', target: 0.1, label: 'Get exactly 0.1A' })).toBe(5);
    expect(api.circuitChallengeIndex(LED)).toBe(SPEC.led);
    expect(api.circuitChallengeIndex(DIV)).toBe(SPEC.divider);
    expect(api.circuitChallengeIndex({ type: 'spec', target: 0.015 })).toBe(-1);
  });
});

describe('the spec panel', () => {
  const seed = (extra) => Object.assign({ mode: 'parallel', voltage: 12, components: [], pauseMotion: true, benchView: 'schematic', challengesOpen: true }, extra);
  it('groups the targets, sets up the battery, and moves focus to the checklist', async () => {
    await mount(seed());
    expect(host.querySelectorAll('[aria-label="Choose a circuit target"] [data-circuit-target]')).toHaveLength(13);
    expect(host.querySelectorAll('[aria-label="Choose a design-to-a-spec target"] [data-circuit-target]')).toHaveLength(4);
    await act(async () => host.querySelector('[data-circuit-target="' + SPEC.led + '"]').click());
    expect(panel().querySelector('h4').textContent).toBe('LED at 15 mA from 9 V');
    expect(panel().querySelector('[data-spec-brief]').textContent).toContain('15 mA');
    expect([...panel().querySelectorAll('[data-spec-req]')].map((li) => li.dataset.ok)).toEqual(['false', 'false', 'false']);
    const setup = panel().querySelector('[data-spec-setup]');
    expect(setup.textContent).toBe('Set the battery to 9 V, series');
    setup.focus();
    await act(async () => setup.click());
    await act(async () => { await new Promise((r) => setTimeout(r, 60)); });
    expect(latest.voltage).toBe(9); expect(latest.mode).toBe('series');
    expect(panel().querySelector('[data-spec-setup]')).toBeNull();
    expect(document.activeElement).toBe(panel().querySelector('[data-spec-reqs]'));
  });
  it('tests a calculated value, explains a wrong one, and rejects one outside the range', async () => {
    await mount(seed({ challenge: { type: 'spec', id: 'spec_led', target: 0.015 } }));
    const input = panel().querySelector('#circuit-spec-plan-spec_led');
    const result = () => panel().querySelector('[data-spec-plan-result]');
    expect(result().dataset.specPlanResult).toBe('none');
    await type(input, '600');
    await act(async () => panel().querySelector('[data-spec-plan-test]').click());
    expect(result().dataset.specPlanResult).toBe('off');
    expect(result().textContent).toContain('below the target range');
    expect(result().textContent).toContain('the LED uses about 2 V');
    await type(input, '0.47');
    await act(async () => panel().querySelector('[data-spec-plan-test]').click());
    expect(result().dataset.specPlanResult).toBe('error');
    expect(latest.challengePlans.spec_led.value).toBe(600);
    await type(input, '470');
    await act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(result().dataset.specPlanResult).toBe('ok');
    expect(result().textContent).toContain('With 470 Ω the model gives');
    expect(latest.challengePlans.spec_led.value).toBe(470);
  });
  it('saves a completion once the bench meets the spec, and credits the calculation', async () => {
    await mount(seed({ mode: 'series', voltage: 9, components: [led(1), resistor(2, 470)], challenge: { type: 'spec', id: 'spec_led', target: 0.015 }, challengePlans: { spec_led: { value: 470 } } }));
    expect(panel().querySelector('[data-target-live-status]').textContent).toContain('In range');
    const check = [...panel().querySelectorAll('button')].find((b) => b.textContent === 'Check target');
    await act(async () => check.click());
    expect(latest.challengesDoneSet[SPEC.led]).toBe(true);
    expect(awardXP.mock.calls.filter((c) => c[0] === 'circuitChallenge')).toHaveLength(1);
    expect(latest.challengeCheck.message).toContain('Your calculated value was on target too.');
  });
  it('does not save a completion when the setup is wrong, and says what to fix', async () => {
    await mount(seed({ mode: 'series', voltage: 9, components: [led(1, { ledColor: '#3b82f6' }), resistor(2, 390)], challenge: { type: 'spec', id: 'spec_led', target: 0.015 } }));
    const check = [...panel().querySelectorAll('button')].find((b) => b.textContent === 'Check target');
    await act(async () => check.click());
    expect(latest.challengesDoneSet || {}).toEqual({});
    expect(latest.challengeCheck.message).toContain('Use only these parts: One red LED and one resistor.');
  });
});
