import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));

describe('Saved observation summary context', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, translations, scrollOriginal;
  const cards = () => [...host.querySelectorAll('.circuit-notebook-observation')];
  const summary = index => cards()[index].querySelector(':scope > summary');
  const input = index => summary(index).querySelector('.circuit-observation-summary-input');
  const reading = index => summary(index).querySelector('.circuit-observation-summary-reading');
  const probes = index => summary(index).querySelector('.circuit-observation-summary-probes');
  const snapshot = () => cards().map(card => card.querySelector(':scope > summary').textContent);
  const note = index => cards()[index].querySelector('textarea');
  const button = name => [...host.querySelectorAll('button')].find(el => el.getAttribute('aria-label') === name || el.textContent === name);
  const point = (design, text = '') => api.circuitActiveObservation(design, text);
  const independent = state => clone({ lessonRecords: state.lessonRecords, reflection: state.reflection, investigationQuestion: state.investigationQuestion, investigationPrediction: state.investigationPrediction, reference: state.reference, probeRed: state.probeRed, probeBlack: state.probeBlack, undo: state.undo, redo: state.redo });
  const seed = patch => ({ ...api.circuitActiveDesign({ input: .2 }), view: 'schematic', notebookOpen: true, probeRed: 'supply', probeBlack: 'emitter', lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep my lesson explanation.' } }, reflection: 'Independent notebook explanation.', investigationQuestion: 'When does more input stop increasing lamp current?', investigationPrediction: 'Current may reach a limit.', reference: { version: 1, design: api.circuitActiveDesign({ input: 1.5 }) }, undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], observations: [point({ input: 3.3 }, 'First saturated point'), point({ input: 5 }, 'Second saturated point')], ...patch });

  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: seed(patch), _circuitNetwork: { reflection: 'Keep connected investigation.' } };
    function Harness() {
      const [toolData, setToolData] = React.useState(initial), [locale, changeLocale] = React.useState('');
      latest = toolData; update = setToolData; setLocale = changeLocale;
      return config.render(makeCtx({ toolData, setToolData: value => { writes(value); setToolData(value); }, t: (key, fallback) => { translations.push([key, fallback]); return locale + fallback; } }));
    }
    await act(async () => root.render(React.createElement(Harness))); await flush();
  }
  function assertManual(index, formattedInput, formattedCurrent, leads = ['collector', 'emitter']) {
    expect(summary(index).querySelector('.circuit-observation-summary-project').textContent).toBe('Manual control');
    expect(input(index).textContent).toContain('Input');
    expect(input(index).querySelector('.circuit-observation-summary-quantity').textContent).toBe(formattedInput);
    expect(reading(index).querySelector('.circuit-observation-summary-reading-label').textContent).toBe('Lamp current');
    expect(reading(index).querySelector('strong').textContent).toBe(formattedCurrent);
    expect(probes(index).textContent).toMatch(new RegExp('Red\\s*' + leads[0] + '.*Black\\s*' + leads[1]));
    expect([...probes(index).querySelectorAll('.circuit-observation-summary-probe-node')].map(el => el.textContent)).toEqual(leads);
  }
  function bodyReading(index, label) {
    return [...cards()[index].querySelectorAll('.circuit-notebook-readings > div')].find(el => el.querySelector('span').textContent === label).querySelector('strong').textContent;
  }

  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn();
    writes = vi.fn(); translations = []; host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('distinguishes two collapsed saturated points by captured input while explicitly naming the same lamp current', async () => {
    await mount(); const state = latest;
    for (const entry of latest._circuitActive.observations) expect(api.solveActiveCircuit(entry.design).collectorCurrent).toBeCloseTo((5 - .2) / 220, 12);
    assertManual(0, '3.30V', '21.82 mA'); assertManual(1, '5.00V', '21.82 mA');
    expect(snapshot()[0]).not.toBe(snapshot()[1]); expect(cards().every(card => !card.open)).toBe(true);
    for (const el of [summary(0), summary(1)]) {
      expect(el.querySelectorAll('button,input,select,textarea,a')).toHaveLength(0);
      expect(el.querySelector('.circuit-observation-summary-disclosure').getAttribute('aria-hidden')).toBe('true');
      expect([...el.querySelectorAll('bdi')].every(node => node.dir === 'ltr')).toBe(true);
    }
    expect(latest).toBe(state); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it.each([['light', 'Light sensor'], ['dark', 'Dark sensor']])('shows the captured relative light for a %s sensor without leaking its inactive manual input', async (project, label) => {
    await mount({ project: 'manual', input: 5, light: 99, observations: [point({ project, light: 17, input: 4.9, probeRed: 'drive', probeBlack: 'base' }, 'Sensor note')] });
    expect(summary(0).querySelector('.circuit-observation-summary-project').textContent).toBe(label);
    expect(input(0).textContent).toMatch(/Relative light\s*17\s*\/\s*100/);
    expect(input(0).querySelector('.circuit-observation-summary-light-value').dir).toBe('ltr');
    expect(input(0).textContent).not.toMatch(/Input|4\.9|99/);
    expect(reading(0).querySelector('strong').textContent).toBe(bodyReading(0, 'Lamp current · IC'));
    expect([...probes(0).querySelectorAll('bdi')].map(el => el.textContent)).toEqual(['drive', 'base']);
  });

  it('keeps ordered lead labels distinct when reversing the captured probes reverses the signed body reading', async () => {
    await mount({ observations: [point({ input: 1, probeRed: 'drive', probeBlack: 'base' }), point({ input: 1, probeRed: 'base', probeBlack: 'drive' })] });
    assertManual(0, '1.00V', '3.00 mA', ['drive', 'base']); assertManual(1, '1.00V', '3.00 mA', ['base', 'drive']);
    expect(bodyReading(0, 'Probe voltage')).toBe('300.00 mV'); expect(bodyReading(1, 'Probe voltage')).toBe('-300.00 mV');
    expect(snapshot()[0]).not.toBe(snapshot()[1]);
  });

  it('keeps summaries fixed when the live circuit type, input and probe pair change', async () => {
    await mount(); const saved = snapshot(), observations = latest._circuitActive.observations, summaries = [summary(0), summary(1)];
    summaries[0].focus();
    await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, project: 'dark', light: 80, input: .3, supply: 12, probeRed: 'base', probeBlack: 'supply' } }));
    expect(snapshot()).toEqual(saved); expect(latest._circuitActive.observations).toBe(observations); expect([summary(0), summary(1)]).toEqual(summaries);
    expect(document.activeElement).toBe(summaries[0]); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('revises only the note while retaining the summary node and its captured readings', async () => {
    await mount(); await click(summary(0)); const el = note(0), before = snapshot(), oldSummary = summary(0), protectedBefore = independent(latest._circuitActive), design = clone(latest._circuitActive.observations[0].design);
    el.focus(); await write(el, 'Same current even though the input was lower.');
    expect(document.activeElement).toBe(el); expect(note(0)).toBe(el); expect(summary(0)).toBe(oldSummary); expect(cards()[0].open).toBe(true); expect(snapshot()).toEqual(before);
    expect(latest._circuitActive.observations[0].note).toBe(el.value); expect(latest._circuitActive.observations[0].design).toEqual(design); expect(latest._circuitActive.observations[1].note).toBe('Second saturated point');
    expect(independent(latest._circuitActive)).toEqual(protectedBefore);
  });

  it('retains native disclosure behavior without changing any saved state or moving writing focus', async () => {
    await mount(); const initial = latest, el = summary(0); el.focus();
    await click(el); expect(cards()[0].open).toBe(true); expect(cards()[1].open).toBe(false);
    await click(el); expect(cards()[0].open).toBe(false); expect(summary(0)).toBe(el); expect(document.activeElement).toBe(el);
    expect(latest).toBe(initial); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('shows the newly recorded settings and leads while preserving the existing note-focus behavior', async () => {
    await mount({ input: 1.5, probeRed: 'base', probeBlack: 'drive', observations: [] }); const protectedBefore = independent(latest._circuitActive);
    await click(button('Record current readings'));
    expect(cards()).toHaveLength(1); assertManual(0, '1.50V', '8.00 mA', ['base', 'drive']);
    expect(cards()[0].open).toBe(true); expect(document.activeElement).toBe(note(0)); expect(bodyReading(0, 'Probe voltage')).toBe('-800.00 mV');
    expect(latest._circuitActive.observations[0].design.input).toBe(1.5); expect(independent(latest._circuitActive)).toEqual(protectedBefore);
  });

  it('restores the original summary context and note after removing one of two equal-current records', async () => {
    await mount(); const before = snapshot(), observations = clone(latest._circuitActive.observations), protectedBefore = independent(latest._circuitActive);
    await click(summary(0)); await click(button('Remove observation 1'));
    expect(cards()).toHaveLength(1); assertManual(0, '5.00V', '21.82 mA');
    expect(document.activeElement).toBe(host.querySelector('.circuit-active-notebook > summary'));
    await click(button('Restore removed observation'));
    expect(snapshot()).toEqual(before); expect(latest._circuitActive.observations).toEqual(observations); expect(note(0).value).toBe('First saturated point');
    expect(independent(latest._circuitActive)).toEqual(protectedBefore); expect(document.activeElement).toBe(host.querySelector('.circuit-active-notebook > summary'));
  });

  it('renders JSON-restored snapshots and translates summary labels without mutating measurements or replacing the disclosure', async () => {
    const document = api.circuitActiveInvestigation(seed({ input: 5, observations: [point({ input: .3, probeRed: 'drive', probeBlack: 'base' }, 'Below threshold')] }));
    const restored = api.parseCircuitInvestigation(JSON.stringify(document));
    await mount({ ...restored, notebookOpen: true }); assertManual(0, '300.00 mV', '0 A', ['drive', 'base']);
    const original = latest, el = summary(0), values = [...el.querySelectorAll('bdi')].map(node => node.textContent); await click(el); el.focus();
    translations.length = 0; await act(async () => setLocale('Translated: ')); await flush();
    expect(summary(0)).toBe(el); expect(cards()[0].open).toBe(true); expect(globalThis.document.activeElement).toBe(el); expect(latest).toBe(original);
    expect(reading(0).querySelector('.circuit-observation-summary-reading-label').textContent).toBe('Translated: Lamp current');
    expect(input(0).textContent).toContain('Translated: Input'); expect(probes(0).textContent).toContain('Translated: Red'); expect(probes(0).textContent).toContain('Translated: Black');
    expect([...el.querySelectorAll('bdi')].map(node => node.textContent)).toEqual(values);
    expect(translations.map(row => row[0])).toEqual(expect.arrayContaining(['stem.circuit.observation_summary_input', 'stem.circuit.observation_summary_red', 'stem.circuit.observation_summary_black', 'stem.circuit.saved_lamp_current']));
    expect(api.circuitActiveInvestigation(latest._circuitActive)).toEqual(document); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
