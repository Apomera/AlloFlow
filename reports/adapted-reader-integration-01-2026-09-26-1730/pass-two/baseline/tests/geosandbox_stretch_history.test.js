import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const point = { id: 1, type: 'point', position: [0, 0, 0] };
const segment = { id: 2, type: 'segment', position: [0, 0, 0], vector: [3, 0, 0] };
const empty = () => ({ objects: [], selection: null });
const scene = () => ({ objects: [point, segment], selection: 2 });
const clone = value => JSON.parse(JSON.stringify(value));
let cfg, pure, mounted;

beforeAll(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_geosandbox.js', 'geoSandbox');
  pure = window.StemLab.geoPure;
});
afterEach(() => {
  if (mounted) {
    React.act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
  }
});

function mount(bucket = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = { container, state: null, root: ReactDOMClient.createRoot(container) };
  function Host() {
    const [data, setData] = React.useState({ _threeLoaded: true, geoSandbox: { mode: 'stretch', construction: scene(), ...clone(bucket) } });
    view.state = data.geoSandbox;
    return cfg.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  mounted = view;
  React.act(() => view.root.render(React.createElement(Host)));
  return view;
}
function key(value, options = {}, target) {
  const event = new window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
  React.act(() => (target || mounted.container.querySelector('#allo-geo-sandbox')).dispatchEvent(event));
  return event;
}
function click(button) {
  expect(button).toBeTruthy();
  React.act(() => button.click());
}
function button(pattern) {
  return [...mounted.container.querySelectorAll('button')].find(node => pattern.test(node.textContent));
}
function input(label) {
  const node = mounted.container.querySelector('input[aria-label="' + label + '"]');
  expect(node).toBeTruthy();
  return node;
}
function setInput(node, value) {
  React.act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
    node.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}
function pointer(node, type) {
  React.act(() => node.dispatchEvent(new window.Event(type, { bubbles: true })));
}

describe('persisted Stretch history', () => {
  it('round trips a legacy undo stack and the exact selected object', () => {
    const original = { construction: scene(), history: [empty()], mode: 'stretch', workspacePath: 'lesson', workspacePanel: 'learn', shapeColor: '#aabbcc' };
    const undone = pure.geoStepStretchHistory(original, false);
    expect(undone.construction).toEqual(empty());
    expect(undone.redoHistory).toEqual([scene()]);
    const restored = pure.geoStepStretchHistory(JSON.parse(JSON.stringify(undone)), true);
    expect(restored.construction).toEqual(scene());
    expect(restored.history).toEqual([empty()]);
    expect(restored.redoHistory).toEqual([]);
    expect(restored.workspacePath).toBe('lesson');
    expect(restored.workspacePanel).toBe('learn');
    expect(restored.shapeColor).toBe('#aabbcc');
  });

  it('retains an intentionally cleared selection across undo and redo', () => {
    const original = { construction: { objects: [point], selection: null }, history: [empty()] };
    expect(pure.geoStepStretchHistory(pure.geoStepStretchHistory(original, false), true).construction.selection).toBeNull();
  });

  it('deeply separates restored geometry and both stored stacks', () => {
    const original = { construction: scene(), history: [empty()] };
    const undone = pure.geoStepStretchHistory(original, false);
    original.construction.objects[0] = { ...point, position: [9, 9, 9] };
    expect(undone.redoHistory[0].objects[0].position).toEqual([0, 0, 0]);
    const restored = pure.geoStepStretchHistory(undone, true);
    restored.construction.objects[0].position[0] = 5;
    expect(undone.redoHistory[0].objects[0].position[0]).toBe(0);
  });

  it('invalidates the abandoned branch on a fresh edit and cancels paused prediction', () => {
    const undone = pure.geoStepStretchHistory({ construction: scene(), history: [empty()], pendingPredict: { srcId: 2 } }, false);
    expect(undone.pendingPredict).toBeNull();
    const editing = pure.geoRememberStretchConstruction({ ...undone, pendingPredict: { srcId: 1 } });
    expect(editing.redoHistory).toEqual([]);
    expect(editing.history).toEqual([empty()]);
    expect(editing.pendingPredict).toBeNull();
    expect(pure.geoStepStretchHistory(editing, true)).toBe(editing);
  });

  it('bounds both directions at 30 persisted snapshots without changing their format', () => {
    const older = Array.from({ length: 35 }, (_, selection) => ({ objects: [point], selection }));
    const next = pure.geoRememberStretchConstruction({ construction: scene(), history: older });
    expect(next.history).toHaveLength(30);
    expect(next.history[0].selection).toBe(6);
    const undone = pure.geoStepStretchHistory({ construction: scene(), history: [empty()], redoHistory: older }, false);
    expect(undone.redoHistory).toHaveLength(30);
    expect(undone.redoHistory.at(-1)).toEqual(scene());
  });

  it('keeps an unavailable undo or redo a no-op', () => {
    const state = { construction: empty() };
    expect(pure.geoStepStretchHistory(state, false)).toBe(state);
    expect(pure.geoStepStretchHistory(state, true)).toBe(state);
  });
});

describe('Stretch history user interactions', () => {
  it.each([
    [{ ctrlKey: true }, 'z', { ctrlKey: true, shiftKey: true }],
    [{ metaKey: true }, 'z', { metaKey: true, shiftKey: true }],
    [{ ctrlKey: true }, 'y', { ctrlKey: true }],
    [{ metaKey: true }, 'y', { metaKey: true }],
    [{}, 'y', {}],
  ])('supports undo and redo keyboard variants %#', (undoOptions, redoKey, redoOptions) => {
    const view = mount({ history: [empty()] });
    key(Object.keys(undoOptions).length ? 'z' : 'u', undoOptions);
    expect(view.state.construction).toEqual(empty());
    key(redoKey, redoOptions);
    expect(view.state.construction).toEqual(scene());
    expect(view.state.redoHistory).toEqual([]);
  });

  it('applies multiple queued undo actions against the latest state', () => {
    const view = mount({ history: [empty(), { objects: [point], selection: 1 }] });
    const target = view.container.querySelector('#allo-geo-sandbox');
    React.act(() => {
      target.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
      target.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    });
    expect(view.state.construction).toEqual(empty());
    expect(view.state.redoHistory).toHaveLength(2);
    key('y', { ctrlKey: true });
    expect(view.state.construction.selection).toBe(1);
    key('y', { ctrlKey: true });
    expect(view.state.construction.selection).toBe(2);
  });

  it('leaves native editing shortcuts in text/number inputs alone', () => {
    const view = mount({ history: [empty()] });
    const target = input('Length exact value');
    const event = key('z', { ctrlKey: true }, target);
    expect(event.defaultPrevented).toBe(false);
    expect(view.state.construction).toEqual(scene());
  });

  it('restores a deleted object and its selection, then invalidates redo on another delete', () => {
    const view = mount();
    key('Delete');
    expect(view.state.construction.selection).toBe(1);
    key('u');
    expect(view.state.construction).toEqual(scene());
    key('Delete');
    expect(view.state.redoHistory).toEqual([]);
    key('y');
    expect(view.state.construction.objects).toHaveLength(1);
  });

  it('coalesces one pointer resize into one undo step and redoes the final dimension', () => {
    const view = mount();
    let target = input('Length resize');
    pointer(target, 'pointerdown');
    setInput(target, 4);
    target = input('Length resize');
    setInput(target, 5);
    pointer(target, 'pointerup');
    expect(view.state.history).toHaveLength(1);
    expect(view.state.construction.objects[1].vector).toEqual([5, 0, 0]);
    key('u');
    expect(view.state.construction).toEqual(scene());
    key('y');
    expect(view.state.construction.objects[1].vector).toEqual([5, 0, 0]);
  });

  it('records range keyboard changes even without pointer-down', () => {
    const view = mount();
    setInput(input('Length resize'), 4);
    setInput(input('Length resize'), 5);
    expect(view.state.history).toHaveLength(2);
    key('u');
    expect(view.state.construction.objects[1].vector).toEqual([4, 0, 0]);
    key('u');
    expect(view.state.construction.objects[1].vector).toEqual([3, 0, 0]);
  });

  it('preserves redo when a resize is focused or clicked without changing geometry', () => {
    const view = mount({ redoHistory: [empty()] });
    const target = input('Length resize');
    pointer(target, 'pointerdown');
    setInput(target, 3);
    pointer(target, 'pointerup');
    expect(view.state.history || []).toEqual([]);
    expect(view.state.redoHistory).toEqual([empty()]);
  });

  it('invalidates redo when a new point is placed', () => {
    const view = mount({ redoHistory: [empty()] });
    React.act(() => window._geoPlacePoint(2, 3, 1));
    expect(view.state.redoHistory).toEqual([]);
    expect(view.state.construction.objects).toHaveLength(3);
    key('u');
    expect(view.state.construction).toEqual(scene());
  });

  it('makes clear reversible and preserves redo when the scene is already empty', () => {
    const view = mount();
    click(button(/Clear all/i));
    expect(view.state.construction).toEqual(empty());
    key('u');
    expect(view.state.construction).toEqual(scene());
    key('y');
    expect(view.state.construction).toEqual(empty());
    key('u');
    expect(view.state.construction).toEqual(scene());
  });

  it('coalesces a focused exact value edit until blur and starts a new step on refocus', () => {
    const view = mount();
    let target = input('Length exact value');
    React.act(() => target.focus());
    setInput(target, 4);
    setInput(input('Length exact value'), 5);
    React.act(() => input('Length exact value').blur());
    expect(view.state.history).toHaveLength(1);
    key('u');
    expect(view.state.construction).toEqual(scene());
    key('y');
    target = input('Length exact value');
    React.act(() => target.focus());
    setInput(target, 6);
    React.act(() => target.blur());
    expect(view.state.history).toHaveLength(2);
    key('u');
    expect(view.state.construction.objects[1].vector).toEqual([5, 0, 0]);
  });

  it('ends a canceled pointer transaction before the next resize', () => {
    const view = mount();
    let target = input('Length resize');
    pointer(target, 'pointerdown');
    setInput(target, 4);
    pointer(input('Length resize'), 'pointercancel');
    target = input('Length resize');
    pointer(target, 'pointerdown');
    setInput(target, 5);
    pointer(input('Length resize'), 'pointerup');
    expect(view.state.history).toHaveLength(2);
    key('u');
    expect(view.state.construction.objects[1].vector).toEqual([4, 0, 0]);
  });

  it('replaces a saved construction as one undoable edit and discards the previous redo branch', () => {
    const loaded = { objects: [point], selection: 1 };
    const view = mount({ savedConstructions: { Starter: loaded }, showSaved: true, redoHistory: [empty()] });
    click(button(/^Load$/));
    expect(view.state.construction).toEqual(loaded);
    expect(view.state.redoHistory).toEqual([]);
    key('u');
    expect(view.state.construction).toEqual(scene());
    key('y');
    expect(view.state.construction).toEqual(loaded);
    expect(view.state.savedConstructions.Starter).toEqual(loaded);
  });

  it('keeps redo available when saving the current construction', () => {
    const view = mount({ redoHistory: [empty()] });
    click(button(/Save$/));
    const name = view.container.querySelector('#geo-save-name');
    setInput(name, 'Segment');
    click(button(/^Save construction$/));
    expect(view.state.savedConstructions.Segment.objects).toEqual(scene().objects);
    expect(view.state.redoHistory).toEqual([empty()]);
  });

  it('invalidates redo when stretching the current selection', () => {
    const view = mount({ redoHistory: [empty()] });
    click(button(/Stretch segment → rectangle/));
    expect(view.state.construction.objects).toHaveLength(3);
    expect(view.state.redoHistory).toEqual([]);
    key('u');
    expect(view.state.construction).toEqual(scene());
    key('y');
    expect(view.state.construction.objects.at(-1).type).toBe('rect');
  });

  it('invalidates redo when placing a scaled copy', () => {
    const view = mount({ redoHistory: [empty()], workspacePanel: 'learn' });
    click(view.container.querySelector('button[aria-label="Place a scaled copy beside the original"]'));
    expect(view.state.construction.objects).toHaveLength(3);
    expect(view.state.redoHistory).toEqual([]);
    key('u');
    expect(view.state.construction).toEqual(scene());
    key('y');
    expect(view.state.construction.selection).toBe(3);
  });

  it('disables empty-scene clear without losing an available redo', () => {
    const view = mount({ construction: empty(), redoHistory: [scene()] });
    const clear = button(/Clear all/i);
    expect(clear.disabled).toBe(true);
    click(clear);
    expect(view.state.redoHistory).toEqual([scene()]);
    key('y');
    expect(view.state.construction).toEqual(scene());
  });


  it('allows model undo and redo while a keyboard-operated range keeps focus', () => {
    const view = mount();
    setInput(input('Length resize'), 4);
    let target = input('Length resize');
    React.act(() => target.focus());
    expect(key('z', { ctrlKey: true }, target).defaultPrevented).toBe(true);
    expect(view.state.construction.objects[1].vector).toEqual([3, 0, 0]);
    target = input('Length resize');
    expect(key('z', { metaKey: true, shiftKey: true }, target).defaultPrevented).toBe(true);
    expect(view.state.construction.objects[1].vector).toEqual([4, 0, 0]);
  });

  it('does not capture unrelated range shortcuts or history in inputs outside the sandbox', () => {
    const view = mount({ history: [empty()] });
    const target = input('Length resize');
    expect(key('u', {}, target).defaultPrevented).toBe(false);
    expect(view.state.construction).toEqual(scene());
    const outside = document.createElement('input');
    outside.type = 'range';
    document.body.appendChild(outside);
    expect(key('z', { ctrlKey: true }, outside).defaultPrevented).toBe(false);
    expect(view.state.construction).toEqual(scene());
    outside.remove();
  });


  it('keeps one new slider transaction when the previously edited field blurs after pointer-down', () => {
    const view = mount();
    const number = input('Length exact value');
    React.act(() => number.focus());
    setInput(number, 4);
    const slider = input('Length resize');
    pointer(slider, 'pointerdown');
    React.act(() => slider.focus());
    setInput(slider, 5);
    setInput(input('Length resize'), 6);
    pointer(input('Length resize'), 'pointerup');
    expect(view.state.history).toHaveLength(2);
    key('z', { ctrlKey: true }, input('Length resize'));
    expect(view.state.construction.objects[1].vector).toEqual([4, 0, 0]);
    key('z', { ctrlKey: true }, input('Length resize'));
    expect(view.state.construction.objects[1].vector).toEqual([3, 0, 0]);
  });

});
