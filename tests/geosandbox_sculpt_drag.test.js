import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const box = extra => ({ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#60a5fa', ...extra });
let cfg, mounted;
beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
});
afterEach(() => {
  if (mounted) {
    React.act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
  }
});
function button(pattern) {
  const node = [...mounted.container.querySelectorAll('button')].find(item => pattern.test(item.textContent.trim()));
  expect(node).toBeTruthy();
  return node;
}
function click(pattern) { React.act(() => button(pattern).click()); }
function mount(bucket = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = { container, state: null, update: null, root: ReactDOMClient.createRoot(container) };
  function Host() {
    const [data, setData] = React.useState({ _threeLoaded: true, geoSandbox: { mode: 'sculpt', sculptRecipe: { parts: [box()] }, ...bucket } });
    view.state = data.geoSandbox;
    view.update = patch => setData(previous => ({ ...previous, geoSandbox: { ...previous.geoSandbox, ...patch } }));
    return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  mounted = view;
  React.act(() => view.root.render(React.createElement(Host)));
  click(/Edit by hand/);
  React.act(() => window._geoSelectSculptPart(0));
  return view;
}
const displayX = (view, index = 0) => view.state.sculptRecipe.parts[index].position[0] * 2.6;

describe('Sculpt movement before the next React commit', () => {
  it('accumulates rapid drag deltas into one reversible transaction', () => {
    const view = mount();
    React.act(() => {
      window._geoBeginSculptDrag();
      window._geoNudgeSculptPart('x', 2);
      window._geoNudgeSculptPart('x', 2);
      window._geoEndSculptDrag();
    });
    expect(displayX(view)).toBeCloseTo(2, 10);
    click(/^↶ Undo$/);
    expect(displayX(view)).toBe(0);
    click(/^Redo$/);
    expect(displayX(view)).toBeCloseTo(2, 10);
    React.act(() => window._geoNudgeSculptPart('x', 1));
    click(/^↶ Undo$/);
    expect(displayX(view)).toBeCloseTo(2, 10);
    click(/^↶ Undo$/);
    expect(displayX(view)).toBe(0);
  });

  it('keeps rapid discrete moves as separate undo steps', () => {
    const view = mount();
    React.act(() => {
      window._geoNudgeSculptPart('x', 1);
      window._geoNudgeSculptPart('x', 1);
    });
    expect(displayX(view)).toBeCloseTo(1, 10);
    click(/^↶ Undo$/);
    expect(displayX(view)).toBeCloseTo(0.5, 10);
    click(/^↶ Undo$/);
    expect(displayX(view)).toBe(0);
  });

  it('keeps a move immediately after drag-end separate without waiting for a render', () => {
    const view = mount();
    React.act(() => {
      window._geoBeginSculptDrag();
      window._geoNudgeSculptPart('x', 2);
      window._geoNudgeSculptPart('x', 2);
      window._geoEndSculptDrag();
      window._geoNudgeSculptPart('x', 1);
    });
    expect(displayX(view)).toBeCloseTo(2.5, 10);
    click(/^↶ Undo$/);
    expect(displayX(view)).toBeCloseTo(2, 10);
    click(/^↶ Undo$/);
    expect(displayX(view)).toBe(0);
  });

  it('uses a newly chosen move step in published handles before any geometry edit', () => {
    const view = mount();
    React.act(() => view.update({ sculptStep: 0.25 }));
    React.act(() => window._geoNudgeSculptPart('x', 1));
    expect(displayX(view)).toBeCloseTo(0.25, 10);
  });

  it('uses a newly enabled group setting in published handles before any geometry edit', () => {
    const view = mount({ sculptRecipe: { parts: [box({ group: 'pair' }), box({ group: 'pair', position: [1, 0.5, 0] })] } });
    React.act(() => view.update({ sculptMoveGroup: true }));
    React.act(() => window._geoNudgeSculptPart('x', 1));
    expect(displayX(view)).toBeCloseTo(0.5, 10);
    expect(displayX(view, 1)).toBeCloseTo(3.1, 10);
  });

  it('preserves group spacing while multiple rapid moves reach the shared boundary', () => {
    const view = mount({ sculptMoveGroup: true, sculptRecipe: { parts: [box({ group: 'pair', position: [3.75, 0.5, 0] }), box({ group: 'pair', position: [1.75, 0.5, 0] })] } });
    React.act(() => {
      window._geoBeginSculptDrag();
      window._geoNudgeSculptPart('x', 1);
      window._geoNudgeSculptPart('x', 1);
      window._geoNudgeSculptPart('x', 1);
      window._geoEndSculptDrag();
    });
    expect(view.state.sculptRecipe.parts[0].position[0]).toBe(4);
    expect(view.state.sculptRecipe.parts[1].position[0]).toBeCloseTo(2, 12);
    click(/^↶ Undo$/);
    expect(view.state.sculptRecipe.parts[0].position[0]).toBe(3.75);
    expect(view.state.sculptRecipe.parts[1].position[0]).toBe(1.75);
  });
});
