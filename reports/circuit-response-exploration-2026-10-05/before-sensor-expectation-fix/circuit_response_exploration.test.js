import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
describe('Explore the live response graph', () => {
  let api, config, host, root, stores, writes;
  const scope = (index = 0) => host.querySelector('[data-instance="' + index + '"]');
  const graph = (index = 0) => scope(index).querySelector('.circuit-response-explorer');
  const svg = (index = 0) => graph(index).querySelector('svg');
  const state = (index = 0) => stores[index].data._circuitActive;
  const reading = (key, index = 0) => graph(index).querySelector('[data-graph-reading="' + key + '"] dd').textContent;
  const authored = value => JSON.stringify({ observations: value.observations, reflection: value.reflection, reference: value.reference, lessonRecords: value.lessonRecords, probeRed: value.probeRed, probeBlack: value.probeBlack });
  function Harness({ patch, index, translated }) {
    const [data, update] = React.useState({ _circuit: { activeWorkbench: true }, _circuitActive: { ...api.circuitActiveDesign({ input: 1 }), view: 'schematic', observations: [api.circuitActiveObservation({ input: .8 }, 'Keep my note.')], reflection: 'My explanation.', reference: { version: 1, design: api.circuitActiveDesign({ input: 2 }) }, lessonRecords: {}, probeRed: 'base', probeBlack: 'drive', undo: [], redo: [], ...patch } });
    stores[index] = { data, update };
    return config.render(makeCtx({ toolData: data, setToolData: value => { writes(value); update(value); }, t: (_key, fallback) => translated ? 'Translated ' + fallback : fallback }));
  }
  async function mount(patch = {}, second, translated = false) {
    const values = second === undefined ? [patch] : [patch, second];
    await act(async () => root.render(React.createElement(React.Fragment, null, ...values.map((patch, index) => React.createElement('div', { key: index, 'data-instance': index }, React.createElement(Harness, { patch, index, translated }))))));
    values.forEach((_, index) => {
      // Simulate a translated, scaled SVG. Native browser checks cover its real CTM.
      svg(index).getScreenCTM = () => ({ inverse: () => ({ scale: .75, left: 40, top: 90 }) });
      svg(index).createSVGPoint = () => ({ x: 0, y: 0, matrixTransform(m) { return { x: (this.x - m.left) / m.scale, y: (this.y - m.top) / m.scale }; } });
    });
  }
  async function pointer(type, x, y = 120, options = {}, index = 0) {
    await act(async () => {
      const event = new MouseEvent(type, { bubbles: true, clientX: 40 + x * .75, clientY: 90 + y * .75, button: options.button ?? 0 });
      Object.defineProperties(event, { pointerId: { value: options.pointerId ?? 1 }, isPrimary: { value: options.isPrimary ?? true } });
      svg(index).dispatchEvent(event);
    });
  }
  async function select(value, index = 0) { const x = 65 + value / (state(index).project === 'manual' ? 5 : 100) * 670; await pointer('pointerdown', x, 120, {}, index); await pointer('pointerup', x, 120, {}, index); }
  async function click(text) { await act(async () => [...scope().querySelectorAll('button')].find(el => el.textContent === text).click()); }
  async function patch(value) { await act(async () => stores[0].update(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, ...value } }))); }
  beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; stores = []; writes = vi.fn(); vi.stubGlobal('requestAnimationFrame', () => 1); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each([[0, '0 A', 'Cutoff'], [1, '3.00 mA', 'Active region'], [5, '21.82 mA', 'Saturation']])('shows the live input, current and region at %s V', async (input, current, region) => {
    await mount({ input }); expect(reading('input')).toBe(input + ' V'); expect(reading('current')).toBe(current); expect(reading('region')).toBe(region); expect(writes).not.toHaveBeenCalled();
    const area = graph().querySelector('[role="region"]'); expect(graph().querySelector('[id="' + area.getAttribute('aria-describedby') + '"]').textContent).toContain('slider or enter an exact value');
  });
  it('selects the horizontal input in transformed SVG coordinates, synchronizes controls and records one undo step', async () => {
    await mount(); const before = authored(state()); await select(1.537); expect(state().input).toBe(1.54); expect(state().undo).toHaveLength(1); expect(state().undo[0].input).toBe(1); expect(writes).toHaveBeenCalledTimes(1);
    for (const label of ['Input voltage (V)', 'Graph input voltage (V)']) expect(scope().querySelector('input[aria-label="' + label + ' exact value"]').value).toBe('1.54');
    expect(reading('current')).toBe('8.40 mA'); expect(authored(state())).toBe(before); expect(svg().querySelector('.circuit-response-point').getAttribute('cx')).toBe(String(65 + 1.54 / 5 * 670));
  });
  it.each(['light', 'dark'])('changes %s sensor light without changing the inactive manual input', async project => {
    await mount({ project, light: 50 }); await select(83.6); expect(state().light).toBe(84); expect(state().input).toBe(1); expect(reading('input')).toBe('84 / 100');
    expect(reading('region')).toBe(project === 'light' ? 'Saturation' : 'Cutoff'); expect(state().undo[0].light).toBe(50);
  });
  it.each([0, 5])('allows the exact %s V endpoint', async input => { await mount(); await select(input); expect(state().input).toBe(input); });
  it('does not create a write or history entry for the current input', async () => { await mount(); await select(1); expect(writes).not.toHaveBeenCalled(); expect(state().undo).toEqual([]); });
  it('ignores axes, labels and gestures ending outside the plot', async () => {
    await mount(); for (const [x, y] of [[64, 120], [736, 120], [400, 44], [400, 211]]) { await pointer('pointerdown', x, y); await pointer('pointerup', 400, 120); await pointer('pointerdown', 400, 120); await pointer('pointerup', x, y); }
    expect(writes).not.toHaveBeenCalled();
  });
  it('cancels a swipe even if the pointer moves back to its starting point', async () => { await mount(); await pointer('pointerdown', 400); await pointer('pointermove', 450); await pointer('pointermove', 400); await pointer('pointerup', 400); expect(writes).not.toHaveBeenCalled(); });
  it('ignores secondary pointers, right clicks, mismatched releases and browser cancellation', async () => {
    await mount(); for (const options of [{ isPrimary: false }, { button: 2 }]) { await pointer('pointerdown', 400, 120, options); await pointer('pointerup', 400); }
    await pointer('pointerdown', 400); await pointer('pointerup', 400, 120, { pointerId: 2 });
    await pointer('pointerdown', 400); await pointer('pointercancel', 400); await pointer('pointerup', 400); expect(writes).not.toHaveBeenCalled();
  });
  it('does not select a point when the graph or page scrolls during a gesture', async () => {
    await mount(); await pointer('pointerdown', 400); svg().parentElement.scrollLeft = 40; await pointer('pointerup', 400);
    await pointer('pointerdown', 400); vi.stubGlobal('scrollY', 100); await pointer('pointerup', 400); expect(writes).not.toHaveBeenCalled();
  });
  it('cancels selection if circuit settings change before release', async () => { await mount(); await pointer('pointerdown', 400); await patch({ project: 'dark' }); await pointer('pointerup', 400); expect(writes).not.toHaveBeenCalled(); expect(state().light).toBe(50); });
  it('returns the graph, readings and exact fields through undo and redo without touching saved work', async () => {
    await mount(); const before = authored(state()); await select(2); await click('Undo active edit'); expect(reading('input')).toBe('1 V'); expect(reading('current')).toBe('3.00 mA');
    await click('Redo active edit'); expect(reading('input')).toBe('2 V'); expect(reading('current')).toBe('13.00 mA'); expect(authored(state())).toBe(before);
  });
  it('keeps the graph readout at the applied exact value while a different value is being drafted', async () => {
    await mount(); const field = graph().querySelector('input[type=number]'); await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, '1.537'); field.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(reading('input')).toBe('1 V'); await act(async () => field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))); expect(reading('input')).toBe('1.537 V'); expect(state().input).toBe(1.537);
  });
  it('keeps reference coordinates fixed while selecting the live curve and hides an incompatible reference axis', async () => {
    await mount({ reference: { version: 1, design: api.circuitActiveDesign({ supply: 12, input: 3 }) } }); const reference = svg().querySelector('.circuit-active-reference-dot').outerHTML;
    await select(1.5); expect(state().input).toBe(1.5); expect(svg().querySelector('.circuit-active-reference-dot').outerHTML).toBe(reference);
    await patch({ project: 'light' }); expect(svg().querySelector('.circuit-active-reference-dot')).toBeNull(); expect(graph().querySelector('[data-curve=reference]')).toBeNull();
  });
  it('isolates graph targets, readings and pointer state between tool instances', async () => {
    await mount({}, { input: 2 }); expect(svg().id).not.toBe(svg(1).id); const first = stores[0].data; await select(3, 1); expect(reading('input', 1)).toBe('3 V'); expect(stores[0].data).toBe(first); expect(reading('input')).toBe('1 V');
  });
  it('localizes the new readout and help while preserving numeric direction', async () => {
    await mount({}, undefined, true); expect(graph().querySelector('h4').textContent).toBe('Translated Explore the curve'); expect(reading('region')).toBe('Translated Active region');
    expect(graph().querySelector('.circuit-response-help bdi').dir).toBe('auto'); for (const key of ['input', 'current']) expect(graph().querySelector('[data-graph-reading="' + key + '"] dd bdi').dir).toBe('ltr');
  });
});
