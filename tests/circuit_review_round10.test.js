// 2026-11-12 Circuit Lab round 10: the remaining accessibility and physics review items.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SRC = process.env.CIRCUIT_SRC || 'stem_lab/stem_tool_circuit.js';
let api, config, host, root, latest, addToast;
const canvasContext = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }), measureText: () => ({ width: 0 }) }, { get(target, property) { if (!(property in target)) target[property] = () => {}; return target[property]; } });
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext); resetStemLab(); config = loadTool(SRC, 'circuit'); api = window.StemLab; addToast = vi.fn(); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); delete window.matchMedia; });
async function mount(initial) {
  function Harness() { const [s, set] = React.useState(initial); latest = s; return config.render(makeCtx({ toolData: s, setToolData: set, addToast })); }
  await act(async () => root.render(React.createElement(Harness)));
}
const wait = (ms) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const button = (re) => [...host.querySelectorAll('button')].find((b) => re.test(b.textContent));
const resistor = (id, value = 100) => ({ id, type: 'resistor', value });
const v = (id, a, value, b = '0') => ({ id, type: 'voltage', a, b, value });
const bias = (drive) => ({ components: [v(1, 'A', 5), { id: 2, type: 'resistor', a: 'A', b: 'C', value: 1000 }, { id: 3, type: 'bjt', a: 'C', b: '0', bjt: { base: 'B', polarity: 'npn' } }, v(4, 'B', drive)] });

describe('a voltmeter in series shows its real resistance, not infinity', () => {
  it('formats open paths as infinite and large finite values with prefixes', () => {
    const s = api.solveCircuit({ mode: 'series', voltage: 9, components: [resistor(1), { id: 2, type: 'voltmeter', value: 0 }] });
    expect(s.current).toBeGreaterThan(0);
    expect(api.circuitTotalRText(s.totalR, s.current, 'Ω', '∞')).toBe('1 GΩ');
    expect(api.circuitTotalRText(s.totalR, s.current, ' ohms', 'open')).toBe('1 gigaohms');
    expect(api.circuitTotalRText(2.5e8, 3.6e-8, 'Ω', '∞')).toBe('250 MΩ');
    expect(api.circuitTotalRText(1e12, 0, 'Ω', '∞')).toBe('∞');
    expect(api.circuitTotalRText(150, 0.06, 'Ω', '∞')).toBe('150.0Ω');
  });
  it('agrees with the nanoamp reading on the bench and in the slider value', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [resistor(1), { id: 2, type: 'voltmeter', value: 0 }], benchView: 'schematic', pauseMotion: true } });
    expect(host.textContent.includes('1 GΩ')).toBe(true);
    const slider = host.querySelector('input[type="range"][aria-label="Voltage slider"]');
    expect(slider.getAttribute('aria-valuetext')).toContain('Total resistance 1 gigaohms, current 9.00 nA.');
  });
});

describe('a transistor carrying nanoamps is described as effectively off', () => {
  it('adds the note only for a forward-active transistor under 1 µA', () => {
    const weak = renderTool('circuit', { _circuit: { networkWorkbench: true }, _circuitNetwork: { ...bias(0.3), selected: 3, view: 'flat' } });
    expect(weak.includes('data-bjt-weak="true"')).toBe(true);
    expect(weak.includes('Forward active · barely conducting')).toBe(true);
    const on = renderTool('circuit', { _circuit: { networkWorkbench: true }, _circuitNetwork: { ...bias(0.65), selected: 3, view: 'flat' } });
    expect(on.includes('data-bjt-weak')).toBe(false);
  });
});

describe('the parts shelf', () => {
  it('names each button with its action and value', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [], benchView: 'schematic', pauseMotion: true } });
    const add = host.querySelector('[data-circuit-add-component="resistor"]');
    expect(add.hasAttribute('aria-label')).toBe(false);
    expect(add.textContent).toContain('Add Resistor, Limit current · 100 Ω');
    expect(add.querySelector('[aria-hidden="true"]').textContent.trim()).toBe('➕');
    expect(host.querySelectorAll('[data-circuit-add-component]')).toHaveLength(7);
  });
  it('stays focusable on a full bench and says why it cannot add', async () => {
    const eight = Array.from({ length: 8 }, (_, i) => resistor(i + 1));
    await mount({ _circuit: { mode: 'series', voltage: 9, components: eight, benchView: 'schematic', pauseMotion: true } });
    const add = host.querySelector('[data-circuit-add-component="bulb"]');
    expect(add.disabled).toBe(false);
    expect(add.getAttribute('aria-disabled')).toBe('true');
    await act(async () => add.click());
    expect(latest._circuit.components).toHaveLength(8);
    expect(addToast.mock.calls.some((c) => /eight parts/.test(c[0]))).toBe(true);
  });
});

describe('touch screens are pointed at controls that work with a finger', () => {
  const two = { _circuit: { mode: 'series', voltage: 9, components: [resistor(1), resistor(2, 200)], benchView: 'schematic', pauseMotion: true } };
  it('keeps the drag hint for a mouse', async () => {
    await mount(two);
    expect(host.textContent.includes('Drag a part along the wire')).toBe(true);
  });
  it('names the handle and Earlier/Later buttons on a coarse pointer', async () => {
    window.matchMedia = (q) => ({ matches: q === '(pointer: coarse)', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    await mount(two);
    expect(host.textContent.includes('Drag a part along the wire')).toBe(false);
    expect(host.textContent.includes('use its ⠇ handle or the Earlier and Later buttons')).toBe(true);
  });
});

describe('readable text on the dark cards', () => {
  it('shows locked badges at full opacity with a screen-reader note', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [resistor(1)], showBadges: true, benchView: 'schematic', pauseMotion: true } });
    const panel = host.querySelector('#circuit-badges-panel');
    expect(panel).toBeTruthy();
    expect(panel.querySelector('.opacity-40')).toBeNull();
    expect(panel.textContent).toContain('(not earned yet)');
  });
  it('spreads the current-ladder labels over three rows', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [resistor(1, 18)], benchView: 'schematic', pauseMotion: true } });
    const ladder = [...host.querySelectorAll('svg')].find((s) => s.getAttribute('viewBox') === '0 0 360 106');
    expect(ladder).toBeTruthy();
    const rows = new Set([...ladder.querySelectorAll('text')].filter((t) => /charger|outlet|starter|impulse|LED|lightning/.test(t.textContent)).map((t) => t.getAttribute('y')));
    expect(rows.size).toBe(3);
  });
});

describe('focus stays on a usable control when a pressed button disables itself', () => {
  it('moves from a disabled Move earlier to Move later in the inspector', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [resistor(1), resistor(2, 200)], selectedPart: 1, benchView: 'schematic', pauseMotion: true } });
    const earlier = button(/^Move earlier in the loop$/);
    earlier.focus();
    await act(async () => earlier.click());
    expect(latest._circuit.components[0].id).toBe(2);
    await wait(120);
    expect(document.activeElement.textContent).toBe('Move later in the loop');
  });
  it('leaves focus alone when the button is still usable or focus already moved', async () => {
    await mount({ _circuit: { mode: 'series', voltage: 9, components: [resistor(1), resistor(2, 200), resistor(3, 300)], selectedPart: 2, benchView: 'schematic', pauseMotion: true } });
    const earlier = button(/^Move earlier in the loop$/);
    earlier.focus();
    await act(async () => earlier.click());
    await wait(120);
    expect(document.activeElement.textContent).toBe('Move earlier in the loop');
  });
});

describe('connected-workbench examples keep their own notes', () => {
  it('swaps the explanation by example and keeps it through an imported design', () => {
    const away = api.circuitNetworkSwapNotes({ loadedExample: 'bridge', reflection: 'Bridge notes' }, { loadedExample: 'bjt-npn-switch', reflection: 'Bridge notes' });
    expect(away.reflection).toBe('');
    expect(away.reflections.bridge).toBe('Bridge notes');
    const back = api.circuitNetworkSwapNotes(Object.assign({}, away, { reflection: 'Switch notes' }), Object.assign({}, away, { loadedExample: 'bridge', reflection: 'Switch notes' }));
    expect(back.reflection).toBe('Bridge notes');
    expect(back.reflections['bjt-npn-switch']).toBe('Switch notes');
    const imported = api.circuitNetworkSwapNotes({ loadedExample: 'bridge', reflection: 'Mine' }, { loadedExample: 'custom-design', reflection: 'Mine' });
    expect(imported.reflection).toBe('Mine');
  });
  it('shows the question and a prediction box above the readings, and undo brings the old notes back', async () => {
    await mount({ _circuit: { networkWorkbench: true, pauseMotion: true }, _circuitNetwork: { view: 'flat', loadedExample: 'bridge', reflection: 'Bridge notes' } });
    const explanation = () => host.querySelector('textarea[aria-label="Connected circuit explanation"]');
    const brief = host.querySelector('[data-network-brief="bridge"]');
    expect(brief).toBeTruthy();
    expect(brief.compareDocumentPosition(explanation()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(explanation().value).toBe('Bridge notes');
    const select = host.querySelector('select[aria-label="Connected circuit example"]');
    await act(async () => { select.value = 'bjt-npn-switch'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => button(/^Load network example$/).click());
    expect(latest._circuitNetwork.loadedExample).toBe('bjt-npn-switch');
    expect(explanation().value).toBe('');
    expect(host.querySelector('[data-network-prediction="bjt-npn-switch"]')).toBeTruthy();
    await act(async () => button(/^Undo network edit$/).click());
    expect(latest._circuitNetwork.loadedExample).toBe('bridge');
    expect(explanation().value).toBe('Bridge notes');
  });
});

describe('starting a transistor experiment again keeps the last attempt visible', () => {
  const tested = { lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Less base current means less lamp current.' } } };
  it('moves the tested attempt to lessonPrevious and keeps it out of saved files', () => {
    const next = api.circuitActiveLessonUpdate(Object.assign(api.circuitActiveDesign({ input: 1 }), tested), 'gain', 'start');
    expect(next.lessonRecords.gain).toEqual({ choice: null, tested: false, explanation: '' });
    expect(next.lessonPrevious.gain).toEqual({ choice: 'less', explanation: 'Less base current means less lamp current.' });
    const file = JSON.stringify(api.circuitActiveInvestigation(next));
    expect(file.includes('lessonPrevious')).toBe(false);
    expect(file.includes('Less base current')).toBe(false);
    const untested = api.circuitActiveLessonUpdate(next, 'gain', 'start');
    expect(untested.lessonPrevious.gain.choice).toBe('less');
  });
  it('shows what the student predicted and wrote last time while they predict again', async () => {
    const started = api.circuitActiveLessonUpdate(Object.assign(api.circuitActiveDesign({ input: 1 }), tested), 'gain', 'start');
    await mount({ _circuit: { activeWorkbench: true }, _circuitActive: started });
    const last = host.querySelector('[data-active-previous="gain"]');
    expect(last).toBeTruthy();
    expect(last.open).toBe(false);
    expect(last.textContent).toContain('You predicted: Decreases.');
    expect(last.textContent).toContain('You wrote: Less base current means less lamp current.');
  });
});

describe('the used-up idea is tested, not only stated', () => {
  it('names a moved part as one change and counts an unscrewed bulb', () => {
    const before = { mode: 'series', voltage: 9, components: [{ id: 1, type: 'ammeter', value: 0 }, { id: 2, type: 'bulb', value: 100 }, resistor(3)] };
    const moved = api.circuitExperimentDiff(before, { ...before, components: [before.components[1], before.components[2], before.components[0]] });
    expect(moved).toEqual({ changes: ['part 1 ammeter: moved to position 3'], controlled: true, unchanged: false });
    const out = api.circuitExperimentDiff(before, { ...before, components: [before.components[0], { ...before.components[1], unscrewed: true }, before.components[2]] });
    expect(out.changes).toEqual(['part 2 bulb: unscrewed']);
    expect(api.circuitExperimentDiff(before, { ...before, components: before.components.map((c) => ({ ...c, id: c.id + 10 })) }).unchanged).toBe(true);
  });
  it('shows the same current before and after the bulb', async () => {
    const start = api.circuitLessonStart({}, 'used');
    await mount({ _circuit: Object.assign({}, start, { lessonOpen: true, benchView: 'schematic', pauseMotion: true }) });
    await act(async () => button(/^Less: the bulb used some up$/).click());
    await act(async () => button(/^Test my prediction$/).click());
    expect(host.querySelector('#circuit-lesson-result').textContent).toBe('Current stayed the same');
    expect(host.querySelector('#circuit-lesson-result-summary').textContent).toContain('revise your prediction');
    expect(latest._circuit.components.map((c) => c.type)).toEqual(['bulb', 'ammeter']);
  });
});

describe('phone bench pins clear the value labels', () => {
  const bench = { _circuit: { benchView: '3d', pauseMotion: true, mode: 'series', voltage: 9, components: [resistor(1, 220), { id: 2, type: 'bulb', value: 50 }] } };
  const pinTop = () => parseFloat(host.querySelector('.circuit-scene-pin').style.top);
  it('lifts the pins on a narrow screen only', async () => {
    await mount(bench);
    const wide = pinTop();
    await act(async () => root.unmount());
    root = ReactDOMClient.createRoot(host);
    window.matchMedia = (q) => ({ matches: q === '(max-width: 600px)', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    await mount(bench);
    expect(pinTop()).toBeLessThan(wide);
    expect(host.querySelector('.circuit-scene-label')).toBeTruthy();
  });
});

describe('the recommendations: a series-bulb lesson and classroom-sized reading targets', () => {
  it('halves the current and quarters each bulb power when a second bulb joins the series loop', async () => {
    const trial = api.circuitLessonResult('bulbs', 2);
    expect(trial.correct).toBe(true);
    const before = api.solveCircuit(trial.before), after = api.solveCircuit(trial.after);
    expect(before.current).toBeCloseTo(0.09, 12);
    expect(after.current).toBeCloseTo(0.045, 12);
    expect(after.rows[0].power / before.rows[0].power).toBeCloseTo(0.25, 12);
    expect(api.circuitExperimentDiff(trial.before, trial.after).controlled).toBe(true);
    await mount({ _circuit: Object.assign({}, api.circuitLessonStart({}, 'bulbs'), { lessonOpen: true, benchView: 'schematic', pauseMotion: true }) });
    await act(async () => button(/^It gets dimmer$/).click());
    await act(async () => button(/^Test my prediction$/).click());
    expect(host.querySelector('#circuit-lesson-result').textContent).toBe('Current decreased');
  });
  it('appends the new targets after the old ones, so saved completions keep their places', () => {
    expect(api.circuitChallengeIndex({ type: 'current', target: 2 })).toBe(0);
    expect(api.circuitChallengeIndex({ type: 'spec', id: 'spec_divider', target: 4 })).toBe(13);
    const checks = [[{ type: 'current', target: 0.05 }, 14, { voltage: 9, components: [resistor(1, 180)] }], [{ type: 'resistance', target: 1000 }, 15, { voltage: 9, components: [resistor(1, 1000)] }], [{ type: 'power', target: 0.1 }, 16, { voltage: 10, components: [resistor(1, 1000)] }]];
    for (const [target, index, bench] of checks) {
      expect(api.circuitChallengeIndex(target)).toBe(index);
      expect(api.circuitChallengeReading(api.solveCircuit(Object.assign({ mode: 'series' }, bench)), target).onTarget).toBe(true);
    }
  });
});
