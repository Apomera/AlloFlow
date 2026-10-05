import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Reviewing the next active circuit history step', () => {
  let api, config, host, root, stores, writes;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const preview = (index = 0) => scope(index).querySelector('.circuit-active-edit-preview');
  const card = (key, index = 0) => preview(index).querySelector('[data-history-action="' + key + '"]');
  const button = (key, index = 0) => [...scope(index).querySelectorAll('.circuit-history-toolbar button')].find(el => el.textContent === (key === 'undo' ? 'Undo active edit' : 'Redo active edit'));
  const state = (index = 0) => stores[index].data._circuitActive;
  const rows = (key, index = 0) => Object.fromEntries([...card(key, index).querySelectorAll('[data-history-field]')].map(el => [el.dataset.historyField, [...el.querySelectorAll('td')].map(td => td.textContent)]));
  const authored = value => JSON.stringify({ observations: value.observations, reflection: value.reflection, question: value.investigationQuestion, prediction: value.investigationPrediction, reference: value.reference, lessons: api.circuitActiveLessonRecords(value), red: value.probeRed, black: value.probeBlack });
  function seed(patch) { return { _circuit: { activeWorkbench: true }, _circuitNetwork: { reflection: 'Keep network work.' }, _circuitActive: {
    ...api.circuitActiveDesign({}), view: 'schematic', observations: [api.circuitActiveObservation({ input: .8 }, 'Saved note.')], reflection: 'My explanation.',
    investigationQuestion: 'How does the lamp respond?', investigationPrediction: 'More current.', reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) },
    lessonRecords: { gain: { choice: 'more', tested: true, explanation: 'Guided writing.' } }, probeRed: 'base', probeBlack: 'drive', undo: [], redo: [], ...patch
  } }; }
  function Harness({ initial, index, translated }) {
    const [data, update] = React.useState(initial); stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translated = false) {
    await act(async () => root.render(React.createElement(React.Fragment, null, ...(second === undefined ? [patch] : [patch, second]).map((value, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { initial: seed(value), index, translated }))))));
  }
  async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
  beforeEach(() => {
    resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn();
    vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('starts with disabled actions and an optional experiment prompt without writing data', async () => {
    await mount(); expect(preview().open).toBe(false); expect(button('undo').disabled).toBe(true); expect(button('redo').disabled).toBe(true);
    expect(preview().textContent).toContain('Change the input or a component setting'); expect(preview().querySelectorAll('table')).toHaveLength(0);
    await click(preview().querySelector('summary')); expect(writes).not.toHaveBeenCalled(); expect(state().undo).toEqual([]);
  });

  it('previews one input change, reverses its direction after Undo and keeps the open disclosure and authored work', async () => {
    const target = api.circuitActiveDesign({ input: 1 }); await mount({ input: 3.3, undo: [target] }); const work = authored(state()), detail = preview(); detail.open = true;
    expect(rows('undo')).toEqual({ input: ['3.3 V', '1 V'] }); expect(card('undo').textContent).toContain('Restores Input voltage to 1 V.');
    const id = button('undo').getAttribute('aria-describedby'); expect(card('undo').querySelector('[id="' + id + '"]').textContent).toBe('Restores Input voltage to 1 V.');
    await click(button('undo')); expect(api.circuitActiveDesign(state())).toEqual(target); expect(card('undo')).toBeNull(); expect(rows('redo')).toEqual({ input: ['1 V', '3.3 V'] });
    expect(preview()).toBe(detail); expect(detail.open).toBe(true); expect(authored(state())).toBe(work);
    await click(button('redo')); expect(rows('undo')).toEqual({ input: ['3.3 V', '1 V'] }); expect(authored(state())).toBe(work); expect(stores[0].data._circuitNetwork.reflection).toBe('Keep network work.');
  });

  it('shows only the latest step, all its setting changes and the available step counts', async () => {
    const earlier = api.circuitActiveDesign({ input: 0 }), target = api.circuitActiveDesign({ input: 1, supply: 7, baseResistance: 15000, loadResistance: 330, beta: 80 });
    await mount({ undo: [earlier, target], redo: [api.circuitActiveDesign({ input: 4 })] }); const work = authored(state());
    expect(rows('undo')).toEqual({ input: ['3.3 V', '1 V'], supply: ['5 V', '7 V'], baseResistance: ['10000 Ω', '15000 Ω'], loadResistance: ['220 Ω', '330 Ω'], beta: ['100', '80'] });
    expect(card('undo').querySelector('.circuit-history-count').textContent).toBe('2 available'); expect(card('undo').textContent).toContain('Restores 5 circuit settings.');
    expect(card('redo').querySelector('.circuit-history-count').textContent).toBe('1 available'); expect(rows('redo')).toEqual({ input: ['3.3 V', '4 V'] });
    await click(button('undo')); expect(api.circuitActiveDesign(state())).toEqual(target); expect(state().undo).toEqual([earlier]); expect(authored(state())).toBe(work);
  });

  it('includes stored light and divider changes in a manual experiment', async () => {
    await mount({ undo: [api.circuitActiveDesign({ light: 17, dividerResistance: 20000 })] });
    expect(rows('undo')).toEqual({ light: ['50 / 100', '17 / 100'], dividerResistance: ['10000 Ω', '20000 Ω'] });
    expect([...card('undo').querySelectorAll('.circuit-history-inactive')].map(el => el.textContent)).toEqual(['Used in sensor experiments', 'Used in sensor experiments']);
    await click(button('undo')); expect(state().light).toBe(17); expect(state().dividerResistance).toBe(20000); expect(state().project).toBe('manual');
  });

  it('identifies a stored manual input in a sensor experiment', async () => {
    await mount({ project: 'dark', undo: [api.circuitActiveDesign({ project: 'dark', input: .9 })] });
    expect(rows('undo')).toEqual({ input: ['3.3 V', '0.9 V'] }); expect(card('undo').querySelector('.circuit-history-inactive').textContent).toBe('Used in manual control');
    await click(button('undo')); expect(state().project).toBe('dark'); expect(state().input).toBe(.9);
  });

  it.each(['light', 'dark'])('previews active %s sensor settings and applies the shown target', async project => {
    const target = api.circuitActiveDesign({ project, light: 25, dividerResistance: 18000 }); await mount({ project, undo: [target] });
    expect(rows('undo')).toEqual({ light: ['50 / 100', '25 / 100'], dividerResistance: ['10000 Ω', '18000 Ω'] }); expect(card('undo').querySelector('.circuit-history-inactive')).toBeNull();
    await click(button('undo')); expect(api.circuitActiveDesign(state())).toEqual(target);
  });

  it('reviews an experiment switch including the input and light values carried by that setup', async () => {
    const target = api.circuitActiveDesign({ project: 'manual', input: 1, light: 25 }); await mount({ project: 'light', undo: [target] }); const work = authored(state());
    expect(rows('undo')).toEqual({ project: ['Light sensor', 'Manual control'], input: ['3.3 V', '1 V'], light: ['50 / 100', '25 / 100'] });
    expect(card('undo').querySelector('.circuit-history-inactive')).toBeNull(); await click(button('undo')); expect(api.circuitActiveDesign(state())).toEqual(target); expect(authored(state())).toBe(work);
  });

  it('keeps nearby fractional voltages distinct and restores the full saved precision', async () => {
    const prior = 1.0000000000000002, current = 1.0000000000000004; await mount({ input: current, undo: [api.circuitActiveDesign({ input: prior })] });
    expect(rows('undo')).toEqual({ input: [current + ' V', prior + ' V'] }); for (const el of card('undo').querySelectorAll('td bdi')) expect(el.dir).toBe('ltr');
    await click(button('undo')); expect(state().input).toBe(prior); expect(rows('redo').input).toEqual([prior + ' V', current + ' V']);
  });

  it('previews the normalized values that history actually restores', async () => {
    await mount({ undo: [{ input: 500, supply: NaN, beta: -10 }] }); expect(rows('undo')).toEqual({ input: ['3.3 V', '5 V'], beta: ['100', '20'] });
    await click(button('undo')); expect(state().input).toBe(5); expect(state().supply).toBe(5); expect(state().beta).toBe(20);
  });

  it('describes a duplicate saved setup honestly and consumes the step without invented differences', async () => {
    await mount({ undo: [api.circuitActiveDesign({})] }); expect(card('undo').textContent).toContain('This saved setup has the same circuit settings.'); expect(card('undo').querySelector('table')).toBeNull();
    await click(button('undo')); expect(state().undo).toEqual([]); expect(state().redo).toHaveLength(1); expect(card('redo').textContent).toContain('same circuit settings');
  });

  it('clears a stale Redo preview after a new live edit while keeping the disclosure open', async () => {
    await mount({ input: 1, redo: [api.circuitActiveDesign({ input: 4 })] }); const detail = preview(); detail.open = true;
    await click([...scope().querySelectorAll('.circuit-active-quick button')].find(el => el.textContent === 'Input 3.3 V'));
    expect(state().redo).toEqual([]); expect(card('redo')).toBeNull(); expect(button('redo').disabled).toBe(true); expect(rows('undo')).toEqual({ input: ['3.3 V', '1 V'] }); expect(preview()).toBe(detail); expect(detail.open).toBe(true);
  });

  it('keeps action descriptions, disclosure state and Undo local to each workbench', async () => {
    await mount({ undo: [api.circuitActiveDesign({ input: 1 })] }, { input: 2, undo: [api.circuitActiveDesign({ input: .8 })] }); const other = stores[1].data;
    const ids = [button('undo', 0), button('undo', 1)].map(el => el.getAttribute('aria-describedby')); expect(new Set(ids).size).toBe(2);
    ids.forEach((id, index) => expect(preview(index).querySelector('[id="' + id + '"]')).toBeTruthy()); preview(0).open = true;
    await click(button('undo')); expect(stores[1].data).toBe(other); expect(preview(1).open).toBe(false); expect(rows('undo', 1)).toEqual({ input: ['2 V', '0.8 V'] });
  });

  it('localizes controls, descriptions, project names and column labels without changing numeric values', async () => {
    await mount({ project: 'light', undo: [api.circuitActiveDesign({ input: 1 })] }, undefined, true);
    for (const el of scope().querySelectorAll('.circuit-history-toolbar button,.circuit-active-edit-preview summary,.circuit-history-help,.circuit-history-card h4,.circuit-history-count,.circuit-history-description,.circuit-history-card caption,.circuit-history-card th')) expect(el.textContent.startsWith('Translated ')).toBe(true);
    expect(rows('undo').project).toEqual(['Translated Light sensor', 'Translated Manual control']); expect(rows('undo').input).toEqual(['3.3 V', '1 V']);
    expect(card('undo').getAttribute('aria-labelledby')).toBe(card('undo').querySelector('h4').id);
  });
});
