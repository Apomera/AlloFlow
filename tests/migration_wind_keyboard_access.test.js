import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const mounts = [];
let tool;
let frameQueue;
function driveFrames(count) { for (let i = 0; i < count; i++) { const frame = frameQueue.shift(); if (frame) act(() => frame(i * 16)); } }
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = walk(child, predicate); if (match) return match; } return null; }
  if (predicate(node)) return node;
  return walk(node.props?.children, predicate);
}
function mount(seed = {}, options = {}) {
  let state = { tab: 'wind', windDir: 0, windSpeed: 15, windObjects: [],
    inquiry: { hypothesis: 'Keep my hypothesis.' }, flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep my note.' } }, ...seed }, tree, refresh;
  const writes = [], announce = vi.fn();
  const ctx = makeCtx({
    isDark: options.dark ?? false,
    t: options.mark ? (key, fallback) => '«' + (fallback ?? key) : (key, fallback) => fallback ?? key,
    announceToSR: announce,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); mounts.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => root.render(React.createElement(Component)));
  const canvas = host.querySelector('[data-wind-placement-canvas]');
  const ui = {
    host, canvas, writes, announce,
    get state() { return state; },
    node(predicate) { return walk(tree, predicate); },
    button(attribute) { return host.querySelector('[' + attribute + ']'); },
    select(label = 'Mountain') { act(() => [...host.querySelectorAll('button')].find(b => b.getAttribute('aria-label')?.startsWith('Place ' + label + ':')).click()); },
    key(key, modifiers = {}, target = canvas) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
      act(() => target.dispatchEvent(event)); return event;
    },
    range(axis, value) { const node = ui.node(n => n.props?.['data-wind-placement-axis'] === axis); act(() => node.props.onChange({ target: { value: String(value) } })); },
    click(attribute) { act(() => ui.button(attribute).click()); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(n => n + 1); }); }
  };
  return ui;
}
function radio(ui, label) { return [...ui.host.querySelectorAll('[role="radio"]')].find(node => node.textContent === label); }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(620);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(380);
  const noop = () => {};
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    return this._windTestContext = new Proxy({ canvas: this, clearRect: vi.fn(), measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop: noop }), createRadialGradient: () => ({ addColorStop: noop }) },
    { get: (target, key) => key in target ? target[key] : noop, set: (target, key, value) => { target[key] = value; return true; } });
  });
  frameQueue = [];
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { frameQueue.push(callback); return frameQueue.length; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(() => {
  act(() => mounts.splice(0).forEach(root => root.unmount()));
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Wind sandbox keyboard and native placement controls', () => {
  it('provides visible instructions, associated descriptions, named ranges and a persistent status region', () => {
    const ui = mount();
    const help = ui.host.querySelector('[id="migration-wind-placement-help"]');
    expect(help.textContent).toContain('Shift + arrow moves 1%');
    expect(help.textContent).toContain('Escape cancels');
    expect(ui.canvas.getAttribute('aria-describedby')).toBe('migration-wind-placement-help migration-wind-placement-position');
    for (const axis of ['x', 'y']) {
      const input = ui.host.querySelector('[data-wind-placement-axis="' + axis + '"]');
      expect(input.closest('label').textContent).toMatch(/position/);
      expect([input.min, input.max, input.step, input.value]).toEqual(['0', '100', '1', '50']);
    }
    expect(ui.button('data-wind-placement-place').getAttribute('aria-disabled')).toBe('true');
    expect(ui.button('data-wind-placement-status').getAttribute('role')).toBe('status');
    expect(ui.button('data-wind-placement-status').getAttribute('aria-atomic')).toBe('true');
  });

  it('uses a transient visible cursor with coarse and fine moves, preserving learner work and canvas focus', () => {
    const ui = mount(); const before = structuredClone(ui.state);
    ui.select(); ui.canvas.focus(); ui.writes.length = 0;
    expect(ui.key('ArrowRight').defaultPrevented).toBe(true);
    ui.key('ArrowUp'); ui.key('ArrowLeft', { shiftKey: true });
    expect(ui.button('data-wind-placement-position').textContent).toContain('54% from the left, 45% from the top');
    const cursor = ui.button('data-wind-placement-cursor');
    expect(cursor.getAttribute('aria-hidden')).toBe('true');
    expect(cursor.style.left).toBe('54%');
    expect(ui.writes).toEqual([]);
    expect(document.activeElement).toBe(ui.canvas);
    expect(ui.state.inquiry).toEqual(before.inquiry);
    expect(ui.state.flightStudyObservations).toEqual(before.flightStudyObservations);
    expect(ui.announce).toHaveBeenLastCalledWith('54% from the left, 45% from the top of the usable field');
  });

  it.each(['Enter', ' '])('places exactly once with %s using canvas coordinates and preserves focus', key => {
    const ui = mount(); ui.select(); ui.canvas.focus(); ui.range('x', 80); ui.range('y', 20); ui.writes.length = 0;
    expect(ui.key(key).defaultPrevented).toBe(true);
    expect(ui.state.windObjects).toEqual([{ type: 'mountain', x: 496, y: 69 }]);
    expect(ui.state.placingObj).toBe(null);
    expect(ui.writes).toEqual([{ windObjects: [{ type: 'mountain', x: 496, y: 69 }], placingObj: null }]);
    expect(ui.button('data-wind-placement-status').textContent).toBe('Mountain placed at 80% from the left, 20% from the top of the usable field.');
    expect(ui.button('data-wind-placement-cursor')).toBeNull();
    expect(document.activeElement).toBe(ui.canvas);
    expect(ui.key(key).defaultPrevented).toBe(false);
    expect(ui.state.windObjects).toHaveLength(1);
  });

  it('offers native ranges and a Place button that reaches the same coordinates without canvas shortcuts', () => {
    const ui = mount(); ui.select('Lake'); ui.range('x', 25); ui.range('y', 60); ui.writes.length = 0;
    ui.button('data-wind-placement-place').focus(); ui.click('data-wind-placement-place');
    expect(document.activeElement).toBe(ui.button('data-wind-placement-place'));
    expect(ui.state.windObjects).toEqual([{ type: 'lake', x: 155, y: 207 }]);
    expect(ui.writes).toHaveLength(1); ui.click('data-wind-placement-place'); expect(ui.writes).toHaveLength(1);
    expect(ui.button('data-wind-placement-place').getAttribute('aria-disabled')).toBe('true');
    expect(ui.button('data-wind-placement-status').textContent).toContain('Lake placed at 25%');
    ui.click('data-wind-placement-focus'); expect(document.activeElement).toBe(ui.canvas);
  });

  it('clamps cursor bounds and keeps placement out of the ground strip', () => {
    const ui = mount(); ui.select();
    ui.range('x', 100); ui.range('y', 100);
    ui.key('ArrowRight'); ui.key('ArrowDown');
    expect(ui.button('data-wind-placement-position').textContent).toContain('100% from the left, 100% from the top');
    ui.click('data-wind-placement-place');
    expect(ui.state.windObjects[0]).toEqual({ type: 'mountain', x: 620, y: 345 });
    ui.select(); ui.range('x', 0); ui.range('y', 0); ui.key('ArrowLeft'); ui.key('ArrowUp'); ui.key('Enter');
    expect(ui.state.windObjects[1]).toEqual({ type: 'mountain', x: 0, y: 0 });
  });

  it('cancels selected placement with Escape without adding or removing objects', () => {
    const objects = [{ type: 'lake', x: 140, y: 80 }];
    const ui = mount({ windObjects: objects }); ui.select(); ui.writes.length = 0;
    expect(ui.key('Escape').defaultPrevented).toBe(true);
    expect(ui.state.windObjects).toEqual(objects);
    expect(ui.writes).toEqual([{ placingObj: null }]);
    expect(ui.button('data-wind-placement-status').textContent).toBe('Object placement cancelled.');
    expect(ui.key('Escape').defaultPrevented).toBe(false);
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'])('leaves browser and assistive-technology commands intact with %s', modifier => {
    const ui = mount({ windObjects: [{ type: 'lake', x: 1, y: 2 }] }); ui.select(); ui.writes.length = 0;
    for (const key of ['ArrowRight', 'Enter', ' ', 'Escape', 'c']) expect(ui.key(key, { [modifier]: true }).defaultPrevented).toBe(false);
    expect(ui.writes).toEqual([]);
    expect(ui.state.placingObj).toBe('mountain');
    expect(ui.state.windObjects).toHaveLength(1);
  });

  it('does not trap unselected arrow keys, Tab, unknown keys or repeated placement', () => {
    const ui = mount();
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' ', 'Escape', 'Tab', '?']) expect(ui.key(key).defaultPrevented).toBe(false);
    ui.select(); ui.writes.length = 0;
    expect(ui.key('Enter', { repeat: true }).defaultPrevented).toBe(true);
    expect(ui.writes).toEqual([]); expect(ui.state.windObjects).toEqual([]);
    expect(ui.key('Tab').defaultPrevented).toBe(false);
  });

  it('retains pointer placement, shared position feedback and one atomic save', () => {
    const ui = mount(); ui.select('Forest'); ui.writes.length = 0;
    act(() => ui.canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 155, clientY: 69 })));
    expect(ui.state.windObjects).toEqual([{ type: 'forest', x: 155, y: 69 }]);
    expect(ui.writes).toHaveLength(1);
    expect(ui.button('data-wind-placement-position').textContent).toContain('25% from the left, 20% from the top');
    expect(ui.button('data-wind-placement-status').textContent).toContain('Forest placed');
    ui.select(); ui.writes.length = 0;
    act(() => ui.canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 100, clientY: 360 })));
    expect(ui.writes).toEqual([]); expect(ui.state.windObjects).toHaveLength(1);
  });


  it.each([1, 2])('keeps keyboard, native controls and pointer placement in logical coordinates after CSS resize at DPR %s', dpr => {
    vi.stubGlobal('devicePixelRatio', dpr);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
    const ui = mount();
    expect(ui.canvas._wcLogicalSize).toEqual({ width: 1000, height: 380 });
    expect(ui.canvas.width).toBe(1000 * dpr); expect(ui.canvas.height).toBe(380 * dpr);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(190);
    vi.spyOn(ui.canvas, 'getBoundingClientRect').mockReturnValue({ left: 20, top: 30, width: 500, height: 190, right: 520, bottom: 220, x: 20, y: 30, toJSON() {} });
    ui.select(); ui.range('x', 50); ui.range('y', 50);
    const cursor = ui.button('data-wind-placement-cursor');
    expect(cursor.style.left).toBe('50%');
    expect(parseFloat(cursor.style.top)).toBeCloseTo(50 * 345 / 380);
    ui.key('Enter');
    expect(ui.state.windObjects[0]).toEqual({ type: 'mountain', x: 500, y: 172.5 });
    ui.select('Lake'); ui.range('x', 25); ui.range('y', 80); ui.click('data-wind-placement-place');
    expect(ui.state.windObjects[1]).toEqual({ type: 'lake', x: 250, y: 276 });
    ui.select('Forest');
    act(() => ui.canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 270, clientY: 116.25 })));
    expect(ui.state.windObjects[2]).toEqual({ type: 'forest', x: 500, y: 172.5 });
    expect(ui.button('data-wind-placement-position').textContent).toContain('50% from the left, 50% from the top');
    ui.select(); ui.writes.length = 0;
    act(() => ui.canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 270, clientY: 210 })));
    expect(ui.writes).toEqual([]); expect(ui.state.windObjects).toHaveLength(3);
  });


  it('repaints a reduced-motion scene after clear and re-add keeps the same object count between frames', () => {
    const ui = mount({ windObjects: [{ type: 'mountain', x: 80, y: 90 }] });
    const paint = ui.canvas._windTestContext.clearRect;
    driveFrames(2); const before = paint.mock.calls.length;
    driveFrames(2); expect(paint.mock.calls.length).toBe(before);
    act(() => [...ui.host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === 'Clear all objects and birds').click());
    ui.select('Forest'); ui.range('x', 80); ui.range('y', 70); ui.click('data-wind-placement-place');
    expect(ui.state.windObjects).toEqual([{ type: 'forest', x: 496, y: 241.5 }]);
    expect(paint.mock.calls.length).toBe(before);
    driveFrames(1); expect(paint.mock.calls.length).toBe(before + 1);
    driveFrames(2); expect(paint.mock.calls.length).toBe(before + 1);
  });

  it('routes new placement instructions and range labels through translation', () => {
    const ui = mount({}, { mark: true });
    for (const id of ['migration-wind-placement-heading', 'migration-wind-placement-help']) expect(ui.host.querySelector('[id="' + id + '"]').textContent).toMatch(/^«/);
    for (const input of ui.host.querySelectorAll('[data-wind-placement-axis]')) expect(input.closest('label').textContent).toMatch(/^«/);
    expect(ui.button('data-wind-placement-place').textContent).toMatch(/^«/);
  });
});

describe('Wind compass roving radio focus', () => {
  it.each([
    ['E', 'ArrowRight', 'NE', 45], ['SE', 'ArrowRight', 'E', 0], ['E', 'ArrowLeft', 'SE', 315],
    ['N', 'ArrowDown', 'NW', 135], ['N', 'ArrowUp', 'NE', 45], ['W', 'Home', 'E', 0], ['W', 'End', 'SE', 315]
  ])('moves %s with %s to the checked and focusable %s radio', (start, key, end, angle) => {
    const directions = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'];
    const ui = mount({ windDir: directions.indexOf(start) * 45 }); const first = radio(ui, start); first.focus();
    expect(ui.key(key, {}, first).defaultPrevented).toBe(true);
    expect(ui.state.windDir).toBe(angle);
    expect(document.activeElement).toBe(radio(ui, end));
    expect(document.activeElement.getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement.tabIndex).toBe(0);
    expect([...ui.host.querySelectorAll('[role="radio"]')].filter(node => node.tabIndex === 0)).toHaveLength(1);
    expect(ui.writes).toEqual([{ windDir: angle }]);
  });

  it.each([-45, 360, 12])('keeps one tab stop for legacy saved direction %s', angle => {
    const ui = mount({ windDir: angle });
    expect([...ui.host.querySelectorAll('[role="radio"]')].filter(node => node.tabIndex === 0)).toHaveLength(1);
    expect(ui.state.windDir).toBe(angle); expect(ui.writes).toEqual([]);
  });

  it('scopes focus to the active compass when more than one lab is mounted', () => {
    const first = mount(), second = mount();
    radio(second, 'E').focus(); second.key('ArrowRight', {}, radio(second, 'E'));
    expect(document.activeElement).toBe(radio(second, 'NE'));
    expect(first.state.windDir).toBe(0); expect(first.writes).toEqual([]);
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'])('does not intercept modified radio arrows with %s', modifier => {
    const ui = mount(); radio(ui, 'E').focus();
    expect(ui.key('ArrowRight', { [modifier]: true }, radio(ui, 'E')).defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(radio(ui, 'E')); expect(ui.writes).toEqual([]);
  });
});
