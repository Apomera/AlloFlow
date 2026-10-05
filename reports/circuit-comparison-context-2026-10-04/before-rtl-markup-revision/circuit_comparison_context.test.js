import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));

describe('Captured context for saved-reading selectors', () => {
  let api, config, host, root, latest, update, setLocale, frames, writes, translations, scrollOriginal, instances;
  const scope = (index = 0) => host.querySelector('[data-tool-instance="' + index + '"]');
  const panel = (index = 0) => scope(index).querySelector('.circuit-observation-compare');
  const select = (slot, index = 0) => panel(index).querySelectorAll('.circuit-observation-selectors select')[slot];
  const caption = (slot, index = 0) => {
    const field = select(slot, index);
    return document.getElementById(field.id + '-context');
  };
  const button = (text, index = 0) => [...scope(index).querySelectorAll('button')].find(el => el.textContent === text || el.getAttribute('aria-label') === text);
  const point = (design, text = '') => api.circuitActiveObservation({ probeRed: 'drive', probeBlack: 'base', ...design }, text);
  const seed = patch => ({ ...api.circuitActiveDesign({ input: 4.2 }), view: 'schematic', notebookOpen: true, probeRed: 'supply', probeBlack: 'emitter', observations: [point({ input: 1 }, 'A'), point({ input: 1.5 }, 'B')], reflection: 'My independent explanation.', investigationQuestion: 'What controls the lamp current?', investigationPrediction: 'I predict a limit.', lessonId: 'gain', lessonRecords: { gain: { choice: 'less', tested: true, explanation: 'Keep guided evidence.' } }, reference: { version: 1, design: api.circuitActiveDesign({ input: .8 }) }, undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })], ...patch });
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); await flush(); }
  async function mutate(patch) { await act(async () => update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...patch } }))); await flush(); }
  async function choose(slot, observationIndex, instance = 0) {
    const field = select(slot, instance), options = [...field.options].filter(option => option.value);
    const value = observationIndex === null ? '' : options[observationIndex].value;
    await act(async () => { field.value = value; field.dispatchEvent(new Event('change', { bubbles: true })); }); await flush();
  }
  async function write(el, value) { await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); }
  async function mount(patch = {}, secondPatch) {
    const patches = secondPatch === undefined ? [patch] : [patch, secondPatch];
    function Harness({ index, initial }) {
      const [toolData, setToolData] = React.useState(initial), [locale, changeLocale] = React.useState('');
      instances[index] = { toolData, setToolData, setLocale: changeLocale };
      if (index === 0) { latest = toolData; update = setToolData; setLocale = changeLocale; }
      return config.render(makeCtx({ toolData, setToolData: value => { writes(value); setToolData(value); }, t: (key, fallback) => { translations.push([key, fallback]); return locale + fallback; } }));
    }
    await act(async () => root.render(React.createElement(React.Fragment, null, ...patches.map((value, index) => React.createElement('div', { key: index, 'data-tool-instance': index }, React.createElement(Harness, { index, initial: { _circuit: { activeWorkbench: true }, _circuitActive: seed(value), _circuitNetwork: { reflection: 'Other workspace stays intact.' } } })))))); await flush();
  }
  function assertCaption(slot, { number, project = 'Manual control', input = '1.00V', light, leads = ['drive', 'base'] }, instance = 0, prefix = '') {
    const field = select(slot, instance), el = caption(slot, instance);
    expect(field.getAttribute('aria-describedby')).toBe(field.id + '-context'); expect(el).toBeTruthy(); expect(scope(instance).contains(el)).toBe(true);
    expect(el.classList.contains('circuit-observation-selector-context')).toBe(true); expect(el.dataset.observationIndex).toBe(String(number - 1));
    expect(el.querySelector('.circuit-observation-selector-project').textContent).toBe(prefix + 'Observation ' + number + ' · ' + prefix + project);
    const capturedInput = el.querySelector('.circuit-observation-selector-input');
    expect(capturedInput.textContent).toContain(prefix + (light === undefined ? 'Input' : 'Relative light'));
    const quantity = capturedInput.querySelector(light === undefined ? '.circuit-observation-selector-quantity' : '.circuit-observation-selector-light-value');
    expect(quantity.tagName).toBe('BDI'); expect(quantity.dir).toBe('ltr'); expect(quantity.textContent).toBe(light === undefined ? input : light + ' / 100');
    const pairs = [...el.querySelectorAll('.circuit-observation-selector-probe-pair')]; expect(pairs).toHaveLength(2);
    expect(pairs.map(pair => pair.dataset.probeLead)).toEqual(['red', 'black']);
    pairs.forEach((pair, i) => {
      expect(pair.dir).toBe('auto'); expect(pair.textContent).toBe(prefix + ['Red', 'Black'][i] + ' ' + leads[i]);
      const node = pair.querySelector('bdi.circuit-observation-selector-probe-node'); expect(node.dir).toBe('ltr'); expect(node.textContent).toBe(leads[i]);
    });
    expect(el.querySelectorAll('button,input,select,textarea,[aria-live],[role="status"]')).toHaveLength(0);
    expect(el.hasAttribute('aria-live')).toBe(false); expect(el.hasAttribute('role')).toBe(false);
  }
  function assertEmpty(slot, instance = 0, prefix = '') {
    const field = select(slot, instance), el = caption(slot, instance);
    expect(field.value).toBe(''); expect(field.getAttribute('aria-describedby')).toBe(field.id + '-context'); expect(el.textContent).toBe(prefix + 'Choose a saved point');
    expect(el.hasAttribute('data-observation-index')).toBe(false); expect(el.querySelectorAll('bdi,.circuit-observation-selector-probe-pair')).toHaveLength(0);
  }
  async function importDocument(doc) {
    const input = scope().querySelector('input[aria-label="Open investigation file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'comparison.json', size: 8192, text: () => Promise.resolve(JSON.stringify(doc)) }] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush(); await click(button('Load investigation'));
  }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab;
    frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; });
    scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn();
    instances = []; writes = vi.fn(); translations = []; host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('describes each default selected saved point while retaining native labels, options and closed disclosure', async () => {
    await mount(); const original = latest;
    assertCaption(0, { number: 1 }); assertCaption(1, { number: 2, input: '1.50V' });
    expect(panel().open).toBe(false);
    for (const [index, label] of ['First saved observation', 'Second saved observation'].entries()) {
      const field = select(index); expect(field.getAttribute('aria-label')).toBe(label); expect(field.closest('label').htmlFor).toBe(field.id);
      expect([...field.options].map(option => option.textContent)).toEqual(['Choose a saved point', 'Observation 1 · Manual control · 1.00 V', 'Observation 2 · Manual control · 1.50 V']);
    }
    expect(latest).toBe(original); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('distinguishes equal-input observations by ordered captured probes and keeps those captions paired with signed readings', async () => {
    await mount({ observations: [point({ input: 1 }), point({ input: 1, probeRed: 'base', probeBlack: 'drive' })] });
    assertCaption(0, { number: 1 }); assertCaption(1, { number: 2, leads: ['base', 'drive'] });
    const probeEvidence = panel().querySelector('.circuit-observation-probe-comparison').textContent;
    expect(probeEvidence).toContain('300.00 mV'); expect(probeEvidence).toContain('-300.00 mV'); expect(probeEvidence).toContain('different connections');
  });

  it.each([['light', 'Light sensor'], ['dark', 'Dark sensor']])('uses captured relative light for a %s sensor rather than its inactive input or the live circuit', async (project, name) => {
    await mount({ input: 5, light: 1, observations: [point({ project, light: 80, input: 4.9 }), point({ input: .3 })] });
    assertCaption(0, { number: 1, project: name, light: 80 }); assertCaption(1, { number: 2, input: '300.00 mV' });
    expect(caption(0).querySelector('.circuit-observation-selector-input').textContent).not.toMatch(/Input|4\.9/);
  });

  it('uses normalized saved defaults and resolved lead nodes for a sparse legacy observation without rewriting it', async () => {
    const legacy = { design: { project: 'unknown', input: '.3' }, probeRed: 'unknown', probeBlack: 'unknown', note: 'Keep sparse data.' };
    await mount({ observations: [legacy, point({ input: 1.5 })] }); const original = latest;
    assertCaption(0, { number: 1, input: '300.00 mV', leads: ['collector', 'emitter'] });
    expect(latest._circuitActive.observations[0]).toBe(legacy); expect(latest).toBe(original); expect(writes).not.toHaveBeenCalled();
  });

  it('follows native selector order changes without changing the saved observations or selector nodes', async () => {
    await mount(); const original = latest, fields = [select(0), select(1)]; fields[1].focus();
    await choose(0, 1); await choose(1, 0);
    assertCaption(0, { number: 2, input: '1.50V' }); assertCaption(1, { number: 1 });
    expect([select(0), select(1)]).toEqual(fields); expect(document.activeElement).toBe(fields[1]); expect(latest).toBe(original); expect(writes).not.toHaveBeenCalled();
  });

  it('describes the same saved point under both selectors without enabling duplicate evidence insertion', async () => {
    await mount(); const original = latest; await choose(1, 0);
    assertCaption(0, { number: 1 }); assertCaption(1, { number: 1 });
    expect(select(0).value).toBe(select(1).value); expect(button('Add readings to explanation').disabled).toBe(true);
    expect(panel().textContent).toContain('Both selectors refer to the same saved observation.'); expect(latest).toBe(original);
  });

  it('keeps captions fixed during live circuit, inactive setting and probe edits without stealing input focus', async () => {
    await mount(); const captions = [caption(0), caption(1)], texts = captions.map(el => el.textContent), values = [select(0).value, select(1).value], saved = latest._circuitActive.observations;
    const field = scope().querySelector('input[aria-label="Input voltage (V) exact value"]'); field.focus();
    await mutate({ input: .1, light: 99, dividerResistance: 88000, supply: 12, probeRed: 'emitter', probeBlack: 'supply' });
    expect([caption(0), caption(1)]).toEqual(captions); expect(captions.map(el => el.textContent)).toEqual(texts); expect([select(0).value, select(1).value]).toEqual(values);
    expect(latest._circuitActive.observations).toBe(saved); expect(document.activeElement).toBe(field); expect(writes).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('clears the previous caption when the learner explicitly selects the empty option', async () => {
    await mount(); const original = latest, id = caption(0).id; select(0).focus(); await choose(0, null);
    assertEmpty(0); expect(caption(0).id).toBe(id); assertCaption(1, { number: 2, input: '1.50V' }); expect(panel().querySelector('.circuit-observation-comparison')).toBeNull();
    expect(document.activeElement).toBe(select(0)); expect(latest).toBe(original); expect(writes).not.toHaveBeenCalled();
  });

  it('clears a removed selected caption and does not silently reselect it after restoration', async () => {
    await mount({ observations: [point({ input: 1 }, 'A'), point({ input: 1.5 }, 'B'), point({ input: 2 }, 'C')] }); const secondKey = select(1).value;
    await click(button('Remove observation 1')); assertEmpty(0); assertCaption(1, { number: 1, input: '1.50V' }); expect(select(1).value).toBe(secondKey);
    await click(button('Restore removed observation')); assertEmpty(0); assertCaption(1, { number: 2, input: '1.50V' }); expect(select(1).value).toBe(secondKey);
    await choose(0, 0); assertCaption(0, { number: 1 });
  });

  it('renumbers captions after an earlier unselected row is removed while retaining the selected point identities', async () => {
    await mount({ observations: [point({ input: .8 }, 'A'), point({ input: 1 }, 'B'), point({ input: 1.5 }, 'C')] });
    await choose(0, 1); await choose(1, 2); const keys = [select(0).value, select(1).value];
    await click(button('Remove observation 1'));
    assertCaption(0, { number: 1 }); assertCaption(1, { number: 2, input: '1.50V' }); expect([select(0).value, select(1).value]).toEqual(keys);
    expect(latest._circuitActive.observations.map(entry => entry.note)).toEqual(['B', 'C']);
  });

  it('retains the selected caption and native open state through a note-only observation clone', async () => {
    await mount(); await click(panel().querySelector(':scope > summary'));
    const card = scope().querySelector('.circuit-notebook-observation'); await click(card.querySelector(':scope > summary'));
    const field = card.querySelector('textarea'), captions = [caption(0), caption(1)], texts = captions.map(el => el.textContent), keys = [select(0).value, select(1).value]; field.focus();
    await write(field, 'Revised authored note.');
    expect([caption(0), caption(1)]).toEqual(captions); expect(captions.map(el => el.textContent)).toEqual(texts); expect([select(0).value, select(1).value]).toEqual(keys);
    expect(panel().open).toBe(true); expect(document.activeElement).toBe(field); expect(latest._circuitActive.observations[0].note).toBe('Revised authored note.');
  });

  it('clears both stale captions on JSON replacement and restore until the learner chooses the saved points again', async () => {
    await mount(); const original = clone(latest._circuitActive), doc = api.circuitActiveInvestigation({ ...original, observations: clone(original.observations), reflection: 'Imported explanation.' });
    await importDocument(doc); assertEmpty(0); assertEmpty(1); expect(latest._circuitActive.reflection).toBe('Imported explanation.');
    await click(button('Restore previous investigation')); assertEmpty(0); assertEmpty(1); expect(latest._circuitActive.observations).toEqual(original.observations);
    await choose(0, 0); await choose(1, 1); assertCaption(0, { number: 1 }); assertCaption(1, { number: 2, input: '1.50V' });
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it('translates caption labels while preserving quantities, keys, descriptions, focused select and saved state', async () => {
    await mount(); const original = latest, fields = [select(0), select(1)], ids = fields.map(el => el.id), values = fields.map(el => el.value); fields[0].focus(); translations.length = 0;
    await act(async () => setLocale('Translated: ')); await flush();
    assertCaption(0, { number: 1 }, 0, 'Translated: '); assertCaption(1, { number: 2, input: '1.50V' }, 0, 'Translated: ');
    expect([select(0), select(1)]).toEqual(fields); expect(fields.map(el => el.id)).toEqual(ids); expect(fields.map(el => el.value)).toEqual(values);
    expect(document.activeElement).toBe(fields[0]); expect(latest).toBe(original); expect(writes).not.toHaveBeenCalled();
    expect(translations.map(row => row[0])).toEqual(expect.arrayContaining(['stem.circuit.saved_observation_number', 'stem.circuit.observation_project_manual', 'stem.circuit.observation_summary_input', 'stem.circuit.observation_summary_red', 'stem.circuit.observation_summary_black']));
  });

  it('associates descriptions with their own selectors across two mounted tools without cross-instance changes', async () => {
    await mount({}, { observations: [point({ project: 'dark', light: 20 }), point({ input: .3, probeRed: 'base', probeBlack: 'drive' })] });
    const fields = [select(0), select(1), select(0, 1), select(1, 1)], ids = fields.flatMap(field => [field.id, field.getAttribute('aria-describedby')]);
    expect(new Set(ids).size).toBe(8); assertCaption(0, { number: 1 }); assertCaption(0, { number: 1, project: 'Dark sensor', light: 20 }, 1);
    const firstState = latest, secondState = instances[1].toolData, firstKeys = [select(0).value, select(1).value];
    await choose(0, 1, 1); assertCaption(0, { number: 2, input: '300.00 mV', leads: ['base', 'drive'] }, 1);
    expect([select(0).value, select(1).value]).toEqual(firstKeys); expect(latest).toBe(firstState); expect(instances[1].toolData).toBe(secondState); expect(writes).not.toHaveBeenCalled();
  });

  it('initializes captions when a second point is recorded while keeping focus on the new observation note', async () => {
    await mount({ input: 1.5, probeRed: 'drive', probeBlack: 'base', observations: [point({ input: 1 }, 'First')] }); expect(panel()).toBeNull();
    await click(button('Record current readings')); assertCaption(0, { number: 1 }); assertCaption(1, { number: 2, input: '1.50V' });
    const notes = scope().querySelectorAll('.circuit-notebook-note'); expect(document.activeElement).toBe(notes[1]); expect(panel().open).toBe(false);
    expect(latest._circuitActive.observations).toHaveLength(2); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});