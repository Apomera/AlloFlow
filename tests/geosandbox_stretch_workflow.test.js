import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const point = { id: 1, type: 'point', position: [0, 0, 0] };
const segment = { id: 2, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] };
const rectangle = { id: 3, type: 'rect', position: [0, 0, 0], u: [3, 0, 0], v: [0, 2, 0] };
const clone = value => JSON.parse(JSON.stringify(value));
let config, mounted;

beforeAll(() => {
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
});
afterEach(() => {
  if (mounted) {
    React.act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
  }
});
function mount(bucket) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = { container, state: null, root: ReactDOMClient.createRoot(container) };
  function Host() {
    const [data, setData] = React.useState({ _threeLoaded: true, geoSandbox: { mode: 'stretch', workspacePanel: 'build', stretchAxis: 'x', stretchLength: 3, ...clone(bucket) } });
    view.state = data.geoSandbox;
    return config.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  mounted = view;
  React.act(() => view.root.render(React.createElement(Host)));
  return view;
}
function action(pattern) {
  return [...mounted.container.querySelectorAll('#geo-panel-build button')].find(node => pattern.test(node.getAttribute('aria-label') || node.textContent));
}
function availableVerbs() {
  return [...mounted.container.querySelectorAll('#geo-panel-build button[role="radio"]')].filter(node => /Stretch|Taper|Revolve/.test(node.textContent));
}
function click(node) {
  expect(node).toBeTruthy();
  expect(node.disabled).toBe(false);
  React.act(() => node.click());
}

describe('contextual Stretch workflow', () => {
  it.each(['revolve', 'taper'])('builds a segment from a point even when the saved preferred verb is %s', (buildVerb) => {
    const view = mount({ construction: { objects: [point], selection: 1 }, buildVerb });
    expect(availableVerbs().some(node => /Taper|Revolve/.test(node.textContent))).toBe(false);
    click(action(/^Stretch point/));
    expect(view.state.construction.objects.map(object => object.type)).toEqual(['point', 'segment']);
    expect(view.state.construction.objects[1].vector).toEqual([3, 0, 0]);
    expect(view.state.history).toHaveLength(1);
  });

  it('uses the same compatible operation through the headset primary callback for a selected segment', () => {
    const view = mount({ construction: { objects: [segment], selection: 2 }, buildVerb: 'revolve', stretchAxis: 'y', stretchLength: 2 });
    expect(availableVerbs().some(node => /Taper|Revolve/.test(node.textContent))).toBe(false);
    expect(typeof window._geoXrPrimary).toBe('function');
    React.act(() => window._geoXrPrimary('right'));
    expect(view.state.construction.objects.at(-1)).toMatchObject({ type: 'rect', u: [3, 0, 0], v: [0, 2, 0] });
  });

  it('retains Revolve as an available and effective operation for a selected rectangle', () => {
    const view = mount({ construction: { objects: [rectangle], selection: 3 }, buildVerb: 'revolve', stretchAxis: 'y', revolveAngle: 360, revolveProfile: 'rect' });
    const revolve = availableVerbs().find(node => /Revolve/.test(node.textContent));
    expect(revolve).toBeTruthy();
    expect(revolve.getAttribute('aria-checked')).toBe('true');
    click(action(/^Revolve rectangle/));
    expect(view.state.construction.objects.at(-1).type).toBe('revolution');
    expect(window.StemLab.geoPure.geoStretchMeasure(view.state.construction.objects.at(-1)).value).toBeCloseTo(18 * Math.PI, 8);
  });

  it('restores the preferred rectangle operation when selection changes back from a point', () => {
    const view = mount({ construction: { objects: [point, rectangle], selection: 1 }, buildVerb: 'revolve', stretchAxis: 'y' });
    expect(availableVerbs().some(node => /Revolve/.test(node.textContent))).toBe(false);
    React.act(() => window._geoSelectObj(3));
    expect(view.state.construction.selection).toBe(3);
    const revolve = availableVerbs().find(node => /Revolve/.test(node.textContent));
    expect(revolve).toBeTruthy();
    expect(revolve.getAttribute('aria-checked')).toBe('true');
    expect(action(/^Revolve rectangle/).disabled).toBe(false);
  });

  it('updates the headset action after switching the verb on the same rectangle', () => {
    const view = mount({ construction: { objects: [rectangle], selection: 3 }, buildVerb: 'stretch', stretchAxis: 'z', stretchLength: 4, topScale: 0.5 });
    click(availableVerbs().find(node => /Taper/.test(node.textContent)));
    React.act(() => window._geoXrPrimary('right'));
    expect(view.state.construction.objects.at(-1)).toMatchObject({ type: 'pyramid', topScale: 0.5 });
  });
});