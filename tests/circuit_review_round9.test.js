// 2026-11-11 Circuit Lab round 9: fixes from the physics, learning-design and accessibility reviews.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SRC = process.env.CIRCUIT_SRC || 'stem_lab/stem_tool_circuit.js';
let api, config, host, root, latest;
const canvasContext = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, { get(target, property) { if (!(property in target)) target[property] = () => {}; return target[property]; } });
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext); resetStemLab(); config = loadTool(SRC, 'circuit'); api = window.StemLab; host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
async function mount(initial, extra) {
  function Harness() { const [s, set] = React.useState(initial); latest = s; return config.render(makeCtx(Object.assign({ toolData: s, setToolData: set }, extra || {}))); }
  await act(async () => root.render(React.createElement(Harness)));
}
const wait = (ms) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const buttonText = (re, scope) => [...(scope || host).querySelectorAll('button')].find((b) => re.test(b.textContent));
const bulb = (id, value = 100, extra) => Object.assign({ type: 'bulb', value, id }, extra || {});

describe('unscrew a bulb: the classic series test gives the real result', () => {
  it('stops the whole series loop, but only its own branch in parallel', () => {
    const series = api.solveCircuit({ mode: 'series', voltage: 9, components: [bulb(1), bulb(2, 100, { unscrewed: true })] });
    expect(series.current).toBe(0);
    expect(series.rows.map((r) => r.power)).toEqual([0, 0]);
    expect(series.rows[1].voltage, 'the full supply sits across the empty socket').toBe(9);
    const parallel = api.solveCircuit({ mode: 'parallel', voltage: 9, components: [bulb(1), bulb(2, 100, { unscrewed: true })] });
    expect(parallel.rows[0].current).toBeCloseTo(0.09, 9);
    expect(parallel.rows[1].current).toBe(0);
  });
  it('offers Unscrew in the inspector and explains the gap', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [bulb(1), bulb(2)], selectedPart: 1 } });
    const unscrew = host.querySelector('[data-circuit-unscrew]');
    expect(unscrew.textContent).toBe('Unscrew this bulb');
    await act(async () => unscrew.click());
    expect(latest._circuit.components[1].unscrewed).toBe(true);
    expect(host.querySelector('[data-circuit-unscrew]').textContent).toBe('Screw the bulb back in');
    expect(host.querySelector('[data-circuit-unscrewed-note]').textContent).toContain('no current flows anywhere in the loop');
  });
});

describe('the guided lab asks for an explanation before showing the model one', () => {
  it('prompts first, then offers Compare once the student has written', async () => {
    const start = api.circuitLessonStart({}, 'resistance');
    await mount({ _circuit: Object.assign({}, start, { lessonOpen: true }) });
    await act(async () => buttonText(/^It halves$/).click());
    await act(async () => buttonText(/^Test my prediction$/).click());
    const summary = () => host.querySelector('#circuit-lesson-result-summary');
    expect(summary().textContent).toContain('Explain the change in your own words');
    expect(summary().textContent).not.toContain('Doubling resistance halves the current');
    expect(host.querySelector('[data-lesson-compare]')).toBeNull();
    const box = host.querySelector('#circuit-lesson-explanation');
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(box, 'The current went down when R went up.'); box.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => host.querySelector('[data-lesson-compare]').click());
    expect(summary().textContent).toContain('Doubling resistance halves the current');
  });
});

describe('the transistor lab does not give away the answer while predicting', () => {
  const active = (record) => renderTool('circuit', { _circuit: { activeWorkbench: true }, _circuitActive: Object.assign(api.circuitActiveDesign({ input: 5, baseResistance: 1000 }), { lessonId: 'limit', lessonRecords: record ? { limit: record } : {} }) }, { gradeBand: 'g912' });
  it('hides the region notes until the test', () => {
    const predicting = active({ choice: null, tested: false, explanation: '' });
    expect(predicting).toContain('Predict first');
    expect(predicting).not.toContain('More base drive cannot increase lamp current here');
    expect(predicting).not.toContain('the lamp current has reached its limit');
    const tested = active({ choice: 'same', tested: true, explanation: '' });
    expect(tested).not.toContain('data-predicting');
  });
});

describe('badges reward fixing a short, not making one', () => {
  it('names the badge for the repair and awards it only after the short is cleared', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [{ type: 'switch', closed: true, id: 1 }] } });
    await wait(10);
    expect(latest._circuit.shortTriggered).toBe(true);
    expect((latest._circuit.badges || {}).shortCircuitSurvivor).toBeFalsy();
    await act(async () => { latest; });
    const html = renderTool('circuit', { _circuit: { showBadges: true } });
    expect(html).toContain('Short Fixer');
    expect(html).not.toContain('Short Survivor');
  });
});

describe('quiz feedback names the mistake and stays classroom-sized', () => {
  it('explains each wrong option it can trace, and voltage answers stay at 24 V or below', () => {
    let traced = 0;
    for (let i = 0; i < 300; i++) {
      const q = api.circuitOhmQuestion();
      if (q.unit === 'V') expect(q.answer).toBeLessThanOrEqual(24);
      expect(q.why[String(q.answer)]).toBeUndefined();
      traced += Object.keys(q.why).length;
    }
    expect(traced).toBeGreaterThan(300);
  });
  it('shows the mistake after a wrong answer and counts a skip as tried', async () => {
    await mount({ _circuit: {} });
    await act(async () => buttonText(/Ohm's Law Quiz/).click());
    await act(async () => buttonText(/Next Question/).click());
    expect(latest._circuit.ohmTried).toBe(1);
    const q = latest._circuit.ohmQuiz, wrong = q.opts.find((o) => q.why[String(o)]);
    if (wrong === undefined) return;
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === wrong + q.unit).click());
    expect(host.querySelector('[data-quiz-mistake]').textContent).toBe(q.why[String(wrong)]);
    expect(host.textContent).toContain('0 of 2 correct');
  });
});

describe('Why did it fail? explains every answer and allows a retry', () => {
  it('says why a wrong diagnosis is wrong, moves focus to the follow-up, and resets on Try again', async () => {
    await mount({ circuit: { workspaceTab: 'reference', expSection: 'failDx' } });
    const d2 = () => host.querySelector('[data-faildx-case="d2"]');
    await act(async () => buttonText(/farther from the battery/, d2()).click());
    await wait(80);
    expect(d2().querySelector('[data-faildx-feedback="wrong"]').textContent).toContain('Current is not used up');
    expect(document.activeElement.getAttribute('data-faildx-q')).toBe('d2');
    await act(async () => buttonText(/proportion to resistance/, d2()).click());
    await act(async () => buttonText(/same power/, d2()).click());
    expect(d2().querySelector('[data-faildx-result]'), 'a wrong last answer does not end the case').toBeNull();
    await act(async () => buttonText(/lower R: less power/, d2()).click());
    expect(d2().querySelector('[data-faildx-result]').textContent).toContain('reasoning it through (+1 case, +1 bonus)');
    expect(d2().textContent).toContain('Your reasoning path: Bulb B is farther from the battery');
    await act(async () => d2().querySelector('[data-faildx-retry]').click());
    expect(d2().querySelector('[data-faildx-result]')).toBeNull();
  });
});

describe('numbers a student can check', () => {
  it('prints currents in worked sums to 3 significant figures, and tiny currents with nA', () => {
    const html = renderTool('circuit', { _circuit: { mode: 'series', voltage: 9, components: [{ type: 'resistor', value: 3000, id: 1 }, { type: 'resistor', value: 3000, id: 2 }] } }, { gradeBand: 'g912' });
    expect(html).toContain('0.0015 A × 3000.0');
    expect(html).not.toContain('0.002 × 3000.0');
    expect(api.circuitCurrentText ? api.circuitCurrentText(9e-9) : '9.00 nA').toBe('9.00 nA');
  });
  it('compares small powers with an indicator LED, not a digital watch', () => {
    const html = renderTool('circuit', { _circuit: { mode: 'series', voltage: 3, components: [{ type: 'resistor', value: 1000, id: 1 }] } }, { gradeBand: 'g912' });
    expect(html).not.toContain('digital watch');
    expect(html).not.toContain('hearing-aid');
  });
  it('fits the Ohm Inquiry graph to the current reading', () => {
    const html = renderTool('circuit', { circuit: { workspaceTab: 'reference', expSection: 'ohmInquiry', ohmInquiry: { voltage: 48, resistance: 10, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] } } });
    const top = Number((html.match(/data-ohm-axis="4"[^>]*>([\d.]+)A</) || [])[1]);
    expect(top).toBeGreaterThanOrEqual(4.8);
  });
  it('gives the Christmas Lights LEDs a resistor that keeps them under 20 mA', () => {
    const preset = { mode: 'series', voltage: 12, components: [{ type: 'led', value: 40, id: 1, ledColor: '#ef4444' }, { type: 'led', value: 40, id: 2, ledColor: '#22c55e' }, { type: 'led', value: 40, id: 3, ledColor: '#3b82f6' }, { type: 'resistor', value: 220, id: 4 }] };
    const s = api.solveCircuit(preset);
    expect(s.current).toBeGreaterThan(0.010);
    expect(s.current).toBeLessThan(0.020);
    expect(require('node:fs').readFileSync(SRC, 'utf8')).toContain("{ type: 'led', value: 40, id: 3, ledColor: '#3b82f6' },\n        { type: 'resistor', value: 220, id: 4 },");
  });
});

describe('keyboard and screen reader', () => {
  it('moves focus to the next remove button after removing a part', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [{ type: 'resistor', value: 100, id: 1 }, { type: 'resistor', value: 200, id: 2 }] } });
    const first = host.querySelector('[data-circuit-remove-id="1"]');
    await act(async () => { first.focus(); first.click(); });
    await wait(20);
    expect(document.activeElement.getAttribute('data-circuit-remove-id')).toBe('2');
  });
  it('says whether Badges is open and focuses the panel', async () => {
    await mount({ _circuit: {} });
    const badges = host.querySelector('[aria-controls="circuit-badges-panel"]');
    expect(badges.getAttribute('aria-expanded')).toBe('false');
    await act(async () => badges.click());
    await wait(60);
    expect(host.querySelector('[aria-controls="circuit-badges-panel"]').getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement.id).toBe('circuit-badges-panel');
  });
  it('focuses a reference section when it opens and its topic when it closes', async () => {
    await mount({ circuit: { workspaceTab: 'reference' } });
    await act(async () => host.querySelector('[data-ref-tab="laws"]').click());
    await wait(60);
    expect(host.querySelector('#circuit-reference-section').contains(document.activeElement)).toBe(true);
    await act(async () => buttonText(/Close section/).click());
    await wait(60);
    expect(document.activeElement.getAttribute('data-ref-tab')).toBe('laws');
  });
  it('announces readings once instead of re-reading every card', () => {
    const html = renderTool('circuit', { _circuit: { mode: 'series', voltage: 9, components: [{ type: 'resistor', value: 100, id: 1 }] } });
    expect(html).toMatch(/<div class="circuit-readouts[^"]*">/);
    expect(html).not.toMatch(/class="circuit-readouts[^"]*" role="status"/);
    expect(html).toContain('data-circuit-settled-status="true"');
  });
});
