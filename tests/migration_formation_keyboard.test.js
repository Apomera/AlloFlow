import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = [];
let tool, pending, frameId, width, reduceMotion;
function drive(count = 1) {
  for (let i = 0; i < count && pending.size; i++) {
    const [id, callback] = pending.entries().next().value;
    pending.delete(id);
    act(() => callback(i * 16));
  }
}
function walk(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = walk(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : walk(node.props?.children, predicate);
}
function readFormationMetrics(ui) {
  return {
    efficiency: Number(ui.element('data-formation-efficiency').textContent.replace('%', '').trim()),
    saving: Number(ui.element('data-formation-saving').textContent.replace('%', '').trim()),
    rotations: Number(ui.element('data-formation-rotations').textContent.trim())
  };
}
function expectFormationMetrics(ui) {
  const metrics = readFormationMetrics(ui), meter = ui.element('data-formation-efficiency-meter');
  const describedEfficiency = Number(ui.position.textContent.match(/Formation efficiency: (\d+)%/)[1]);
  expect(metrics.efficiency).toBe(describedEfficiency);
  expect(meter.value).toBe(metrics.efficiency);
  expect(metrics.saving).toBe(Math.round(metrics.efficiency * tool._testing.savingFor('v')));
  expect(metrics.saving).toBeLessThanOrEqual(Math.round(tool._testing.savingFor('v') * 100));
  return metrics;
}
function paintedBirds(ui) {
  return ui.context.operations.filter(op => op[0] === 'ellipse' && op[3] === 13 && op[4] === 3.4)
    .map(op => ['bird', op[1] - 3, op[2] - 12]);
}
// Bird paths live inside their canvas transform scopes. HUD rounded corners and
// energy-bar borders use the same path method in screen coordinates; resizing
// legitimately moves those and must not be mistaken for a changed wing pose.
function paintedBirdPose(ui) {
  const stack = [], pose = [];
  let scaled = false;
  for (const operation of ui.context.operations) {
    if (operation[0] === 'save') stack.push(scaled);
    else if (operation[0] === 'restore') scaled = stack.pop() ?? false;
    else if (operation[0] === 'scale') scaled = true;
    else if (operation[0] === 'quadraticCurveTo' && scaled) pose.push(operation);
  }
  return pose;
}
function mount(seed = {}, options = {}) {
  let state = { tab: 'vformation', vBirdCount: 9, perfectVFormed: true,
    inquiry: { hypothesis: 'Keep my prediction.' }, flightStudyObservations: { drafts: { 'goose:wing': 'Keep my evidence.' } }, ...seed }, tree, refresh;
  const writes = [], announce = vi.fn(), award = vi.fn();
  const ctx = makeCtx({ isDark: options.dark ?? false, t: (key, fallback) => (options.mark ? '«' : '') + (fallback ?? key),
    announceToSR: announce, awardXP: award,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, values) => { writes.push(values); state = { ...state, ...values }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.push(root);
  function Component() { refresh = React.useState(0)[1]; ctx.toolData = { migration: state }; tree = tool.render(ctx); return tree; }
  act(() => root.render(React.createElement(Component)));
  const ui = {
    host, writes, announce, award,
    get state() { return state; },
    get canvas() { return host.querySelector('[data-formation-canvas]'); },
    get context() { return ui.canvas._formationTestContext; },
    get status() { return host.querySelector('[data-formation-status]'); },
    get position() { return host.querySelector('[data-formation-position]'); },
    node(attribute, value) { return walk(tree, node => node.props?.[attribute] === value); },
    element(attribute, value) { return host.querySelector('[' + attribute + (value == null ? '' : '="' + value + '"') + ']'); },
    key(key, modifiers = {}) { const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers }); act(() => ui.canvas.dispatchEvent(event)); return event; },
    change(attribute, value, match = 'true') { const node = ui.node(attribute, match); expect(node).toBeTruthy(); act(() => node.props.onChange({ target: { value: String(value) } })); },
    select(index) { ui.change('data-formation-bird-select', index); },
    range(axis, value) { ui.change('data-formation-axis', value, axis); },
    click(attribute, value) { act(() => ui.element(attribute, value).click()); },
    auto() { act(() => host.querySelector('[aria-label="Auto-form V formation"]').click()); },
    scatter() { act(() => host.querySelector('[aria-label="Scatter birds randomly"]').click()); },
    set(values) { act(() => { state = { ...state, ...values }; refresh(n => n + 1); }); },
    point() { const arc = ui.context.operations.find(operation => operation[0] === 'arc' && operation[3] === 23); expect(arc).toBeTruthy(); return { x: arc[1], y: arc[2] }; },
    mouse(type, x, y, extra = {}) { const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, ...extra }); act(() => ui.canvas.dispatchEvent(event)); return event; },
    touch(type, points) { const event = new Event(type, { bubbles: true, cancelable: true }); Object.defineProperty(event, 'touches', { value: points.map(([clientX, clientY]) => ({ clientX, clientY })) }); act(() => ui.canvas.dispatchEvent(event)); return event; }
  };
  return ui;
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  pending = new Map(); frameId = 0; width = 620; reduceMotion = true;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.stubGlobal('matchMedia', query => ({ matches: reduceMotion, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(380);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    if (this._formationTestContext) return this._formationTestContext;
    const target = { canvas: this, operations: [], paints: 0 };
    target.clearRect = () => { target.operations = []; target.paints++; };
    target.measureText = text => ({ width: String(text).length * 6 });
    target.createLinearGradient = target.createRadialGradient = () => ({ addColorStop() {} });
    this._formationTestContext = new Proxy(target, {
      get(object, key) { if (key in object) return object[key]; return (...args) => object.operations.push([key, ...args]); },
      set(object, key, value) { object[key] = value; return true; }
    });
    return this._formationTestContext;
  });
  vi.stubGlobal('requestAnimationFrame', callback => { const id = ++frameId; pending.set(id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', id => pending.delete(id));
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => roots.splice(0).forEach(root => root.unmount()));
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('V-formation responsive semantic readout', () => {
  it('groups the scene in a named figure with visible captions, definition-list metrics and a labelled native meter', () => {
    const first = mount(), second = mount({}, { dark: true });
    for (const ui of [first, second]) {
      const figure = ui.element('data-formation-figure'), caption = ui.element('data-formation-readout');
      const title = ui.element('data-formation-readout-title'), meter = ui.element('data-formation-efficiency-meter');
      expect(figure.tagName).toBe('FIGURE'); expect(caption.tagName).toBe('FIGCAPTION');
      expect(caption.closest('figure')).toBe(figure); expect(figure.contains(ui.canvas)).toBe(true);
      expect(figure.getAttribute('aria-labelledby')).toBe(title.id); expect(title.textContent.trim()).not.toBe('');
      expect(caption.compareDocumentPosition(ui.canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      for (const metric of ['efficiency', 'saving', 'rotations']) {
        const value = ui.element('data-formation-' + metric);
        expect(value.tagName).toBe('DD'); expect(value.closest('dl')).not.toBeNull();
        expect(value.previousElementSibling.tagName).toBe('DT'); expect(value.previousElementSibling.textContent.trim()).not.toBe('');
      }
      expect(meter.tagName).toBe('METER'); expect([meter.min, meter.max]).toEqual([0, 100]);
      const meterLabel = ui.host.querySelector('[id="' + meter.getAttribute('aria-labelledby') + '"]');
      expect(meterLabel).not.toBeNull(); expect(meterLabel.textContent).toMatch(/efficiency/i);
      expect(caption.querySelector('[role="status"],[role="alert"],[role="log"],[aria-live="polite"],[aria-live="assertive"]')).toBeNull();
      expectFormationMetrics(ui);
    }
    const ids = [...first.host.querySelectorAll('[id]'), ...second.host.querySelectorAll('[id]')]
      .filter(node => node.closest('[data-formation-readout]')).map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('connects the canvas to a text wake key with decorative direction shapes', () => {
    const ui = mount(), key = ui.element('data-formation-wake-key');
    expect(key.tagName).toBe('UL'); expect(key.id).not.toBe('');
    expect(ui.canvas.getAttribute('aria-describedby').split(' ')).toContain(key.id);
    for (const type of ['upwash', 'downwash']) {
      const item = ui.element('data-formation-wake', type);
      expect(item.tagName).toBe('LI'); expect(item.closest('ul')).toBe(key);
      expect(item.textContent).toMatch(new RegExp(type, 'i'));
      expect(item.querySelector('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(key.textContent).toMatch(/side|wingtip/i);
    expect(key.textContent).toMatch(/behind/i);
  });

  it('keeps the semantic meter and follower saving synchronized across arrangements, keyboard edits and passive resize', () => {
    const ui = mount(), saved = structuredClone(ui.state);
    expect(expectFormationMetrics(ui)).toMatchObject({ efficiency: 0, saving: 0 });
    ui.auto(); expect(expectFormationMetrics(ui)).toMatchObject({ efficiency: 100, saving: 22 });
    ui.select(1); ui.range('x', 100); ui.range('y', 0);
    expect(expectFormationMetrics(ui).efficiency).toBeLessThan(100);
    ui.key('ArrowLeft'); expectFormationMetrics(ui);
    const before = readFormationMetrics(ui); width = 280; drive(); expect(readFormationMetrics(ui)).toEqual(before);
    ui.scatter(); expect(expectFormationMetrics(ui)).toMatchObject({ efficiency: 0, saving: 0 });
    expect(ui.writes).toEqual([]); expect(ui.state).toEqual(saved); expect(ui.announce).not.toHaveBeenCalled();
  });

  it('updates the readout for pointer edits and explicit rotation-state changes without saving layout data', () => {
    const ui = mount(); ui.auto(); ui.select(1); ui.range('x', 50); ui.range('y', 50); drive();
    ui.mouse('mousedown', 310, 216); ui.mouse('mousemove', 592, 92); ui.mouse('mouseup', 592, 92);
    expect(ui.position.textContent).toContain('100% from the left, 0% from the top');
    expectFormationMetrics(ui);
    ui.set({ vLeaderRotations: 4 }); expect(readFormationMetrics(ui).rotations).toBe(4);
    expect(ui.writes).toEqual([]);
  });

  it('keeps animated metrics out of live regions and does not publish per-frame learner-state writes', () => {
    reduceMotion = false; const ui = mount(); ui.auto(); drive();
    const metrics = readFormationMetrics(ui), feedback = ui.status.textContent;
    drive(20); expect(readFormationMetrics(ui)).toEqual(metrics); expect(ui.status.textContent).toBe(feedback);
    expect(ui.writes).toEqual([]); expect(ui.announce).not.toHaveBeenCalled();
    expect(ui.element('data-formation-readout').closest('[aria-live="polite"],[aria-live="assertive"],[role="status"]')).toBeNull();
  });

  it('leaves only spatial bird markers in the canvas and translates the visible metric and wake captions', () => {
    const ui = mount({}, { mark: true }); ui.key('v'); drive();
    const drawnText = ui.context.operations.filter(op => op[0] === 'fillText').map(op => String(op[1]));
    expect(drawnText.some(value => /FORMATION EFFICIENCY|Energy saved|rotations|upwash|downwash|100%/i.test(value))).toBe(false);
    expect(drawnText).toContain('1'); expect(drawnText).toContain('★');
    for (const node of ui.element('data-formation-readout').querySelectorAll('dt,[data-formation-wake], [data-formation-readout-title]')) {
      expect(node.textContent).toContain('«');
    }
  });
});

describe('V-formation keyboard and native positioning', () => {
  it('offers named native controls, visible instructions and uniquely associated descriptions', () => {
    const first = mount(), second = mount();
    const descriptions = first.canvas.getAttribute('aria-describedby').split(' ');
    expect(descriptions.every(id => first.host.querySelector('[id="' + id + '"]'))).toBe(true);
    expect(second.canvas.getAttribute('aria-describedby')).not.toBe(first.canvas.getAttribute('aria-describedby'));
    expect(first.host.textContent).toContain('Shift + arrow moves 1%');
    expect(first.element('data-formation-bird-select').closest('label').textContent).toContain('Choose bird');
    for (const axis of ['x', 'y']) {
      const input = first.element('data-formation-axis', axis);
      expect(input.closest('label').textContent).toContain('position');
      expect([input.min, input.max, input.step, input.value]).toEqual(['0', '100', '1', '50']);
    }
    expect(first.status.getAttribute('role')).toBe('status');
    expect(first.status.getAttribute('aria-atomic')).toBe('true');
    expect(first.element('data-formation-controls').querySelectorAll('button:not([type="button"])')).toHaveLength(0);
    expect(first.element('data-formation-move', 'left').style.minHeight).toBe('44px');
  });

  it('moves the chosen bird coarsely and finely without changing other birds, saved notes or focus', () => {
    const ui = mount(), saved = structuredClone(ui.state);
    ui.select(1); ui.canvas.focus();
    expect(ui.key('ArrowRight').defaultPrevented).toBe(true); ui.key('ArrowUp'); ui.key('ArrowLeft', { shiftKey: true });
    expect(ui.position.textContent).toContain('Bird 2: 54% from the left, 45% from the top');
    drive(); expect(ui.point()).toEqual({ x: 28 + 0.54 * 564, y: 92 + 0.45 * 248 });
    expect(document.activeElement).toBe(ui.canvas);
    ui.select(0); expect(ui.element('data-formation-axis', 'x').value).toBe('50');
    expect(ui.writes).toEqual([]); expect(ui.state).toEqual(saved); expect(ui.announce).not.toHaveBeenCalled();
  });

  it('uses native ranges and direction buttons without requiring canvas shortcuts', () => {
    const ui = mount(); ui.select(2); ui.range('x', 80); ui.range('y', 20);
    const right = ui.element('data-formation-move', 'right'); right.focus(); ui.click('data-formation-move', 'right');
    expect(document.activeElement).toBe(right);
    expect(ui.position.textContent).toContain('Bird 3: 85% from the left, 20% from the top');
    expect(ui.status.textContent).toContain('Formation efficiency:');
    ui.click('data-formation-focus'); expect(document.activeElement).toBe(ui.canvas);
    drive(); expect(ui.point()).toEqual({ x: 28 + 0.85 * 564, y: 92 + 0.2 * 248 });
  });

  it('clamps all position mechanisms to the safe area', () => {
    const ui = mount(); ui.range('x', 100); ui.range('y', 100);
    ui.key('ArrowRight'); ui.click('data-formation-move', 'down'); drive();
    expect(ui.point()).toEqual({ x: 592, y: 340 });
    ui.range('x', -100); ui.range('y', -50); ui.key('ArrowLeft'); ui.key('ArrowUp'); drive();
    expect(ui.point()).toEqual({ x: 28, y: 92 });
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'])('does not intercept browser or assistive shortcuts with %s', modifier => {
    const ui = mount(); const before = ui.position.textContent;
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'v', 'V', 's', 'S']) expect(ui.key(key, { [modifier]: true }).defaultPrevented).toBe(false);
    expect(ui.position.textContent).toBe(before); expect(ui.writes).toEqual([]);
  });

  it('leaves Tab and unrelated keys alone and ignores repeated arrangement shortcuts', () => {
    const ui = mount();
    for (const key of ['Tab', 'Escape', 'Enter', ' ', '?']) expect(ui.key(key).defaultPrevented).toBe(false);
    const before = ui.position.textContent;
    expect(ui.key('v', { repeat: true }).defaultPrevented).toBe(true);
    expect(ui.position.textContent).toBe(before);
    expect(ui.key('V').defaultPrevented).toBe(true); expect(ui.status.textContent).toContain('V formation formed automatically');
    expect(ui.key('S').defaultPrevented).toBe(true); expect(ui.status.textContent).toContain('Birds scattered randomly');
  });

  it('provides the upwash partner and leader cost in the nonvisual readout', () => {
    const ui = mount(); ui.auto(); ui.select(1);
    expect(ui.position.textContent).toContain('Follower: in the upwash of bird 1.');
    expect(ui.position.textContent).toContain('Formation efficiency: 100%.');
    ui.range('x', 100); ui.range('y', 0);
    expect(ui.position.textContent).toContain('outside the model’s upwash zones');
    ui.select(0); expect(ui.position.textContent).toContain('Leader: pays the full flight cost.');
  });

  it.each([1, 2])('maps resized pointer dragging to the same positions as native controls at DPR %s', dpr => {
    vi.stubGlobal('devicePixelRatio', dpr); width = 1000;
    const ui = mount(); ui.auto(); ui.range('x', 50); ui.range('y', 50); drive();
    expect(ui.canvas._vfLogicalSize).toEqual({ width: 1000, height: 380 });
    expect(ui.canvas.width).toBe(1000 * dpr);
    const rect = { left: 20, top: 30, width: 500, height: 190 };
    vi.spyOn(ui.canvas, 'getBoundingClientRect').mockReturnValue(rect);
    width = 500; drive();
    expect(ui.canvas._vfLogicalSize).toEqual({ width: 500, height: 380 });
    expect(ui.canvas.width).toBe(500 * dpr);
    expect(ui.position.textContent).toContain('50% from the left, 50% from the top');
    ui.mouse('mousedown', 270, 138); ui.mouse('mousemove', 381, 107); ui.mouse('mouseup', 381, 107);
    expect(ui.position.textContent).toContain('Bird 1: 75% from the left, 25% from the top');
    drive(); expect(ui.point()).toEqual({ x: 361, y: 154 });
    ui.range('x', 75); ui.range('y', 25); drive(); expect(ui.point()).toEqual({ x: 361, y: 154 });
  });

  it('keeps scrolling and multi-touch gestures available while supporting touch bird movement and cancellation', () => {
    const ui = mount(); ui.auto(); ui.range('x', 50); ui.range('y', 50); drive();
    expect(ui.touch('touchstart', [[2, 2]]).defaultPrevented).toBe(false);
    expect(ui.touch('touchmove', [[40, 40]]).defaultPrevented).toBe(false);
    expect(ui.touch('touchstart', [[310, 216]]).defaultPrevented).toBe(true);
    expect(ui.touch('touchmove', [[592, 340]]).defaultPrevented).toBe(true);
    ui.touch('touchcancel', []); drive(); expect(ui.point()).toEqual({ x: 592, y: 340 });
    expect(ui.touch('touchmove', [[200, 200]]).defaultPrevented).toBe(false);
    expect(ui.touch('touchstart', [[592, 340], [300, 200]]).defaultPrevented).toBe(false);
    ui.touch('touchstart', [[592, 340]]);
    expect(ui.touch('touchmove', [[300, 200], [100, 100]]).defaultPrevented).toBe(false);
    expect(ui.touch('touchmove', [[300, 200]]).defaultPrevented).toBe(false);
    drive(); expect(ui.point()).toEqual({ x: 592, y: 340 });
  });

  it('rebuilds a changed flock immediately and clamps an obsolete selection', () => {
    const ui = mount({ vBirdCount: 30 }); ui.select(29); ui.change('data-formation-count', 5);
    expect(ui.element('data-formation-bird-select').options).toHaveLength(5);
    expect(ui.element('data-formation-bird-select').value).toBe('4');
    expect(ui.position.textContent).toContain('Bird 5:');
    drive(); expect(paintedBirds(ui)).toHaveLength(5);
    expect(ui.writes).toEqual([{ vBirdCount: 5 }]);
  });

  it.each([[9.5, 10], ['bad', 9], [Infinity, 9], [100, 30], [-10, 2]])('normalizes saved count %s without continually replacing the flock', (saved, expected) => {
    const ui = mount({ vBirdCount: saved }); drive(2);
    expect(ui.element('data-formation-bird-select').options).toHaveLength(expected);
    expect(ui.element('data-formation-count').value).toBe(String(expected));
    const paints = ui.context.paints; drive(4); expect(ui.context.paints).toBe(paints);
  });

  it.each([2, 9, 30])('fits auto-formed %s-bird flocks into a narrow logical area', count => {
    width = 260; const ui = mount({ vBirdCount: count }); ui.auto(); drive();
    const birds = paintedBirds(ui);
    expect(birds).toHaveLength(count);
    for (const [, x, y] of birds) { expect(x).toBeGreaterThanOrEqual(28 - 1e-8); expect(x).toBeLessThanOrEqual(232 + 1e-8); expect(y).toBeGreaterThanOrEqual(91); expect(y).toBeLessThanOrEqual(341); }
  });

  it('preserves relative positions when returning to a different-width canvas', async () => {
    const ui = mount(); ui.auto(); ui.select(1); ui.range('x', 80); ui.range('y', 30); drive();
    await act(async () => ui.set({ tab: 'navigate' }));
    width = 300;
    await act(async () => ui.set({ tab: 'vformation' }));
    drive(2);
    expect(ui.canvas._vfLogicalSize.width).toBe(300);
    expect(ui.position.textContent).toContain('Bird 2: 80% from the left, 30% from the top');
    expect(ui.point().x).toBeCloseTo(28 + 0.8 * 244);
    expect(ui.point().y).toBeCloseTo(92 + 0.3 * 248);
    const birds = paintedBirds(ui);
    expect(birds).toHaveLength(9);
    for (const [, x] of birds) { expect(x).toBeGreaterThanOrEqual(28); expect(x).toBeLessThanOrEqual(272); }
  });

  it('translates new labels, instructions, position and feedback', () => {
    const ui = mount({}, { mark: true }); ui.select(1); ui.range('x', 75);
    for (const node of [ui.position, ui.status, ui.element('data-formation-focus'), ui.element('data-formation-pause')]) expect(node.textContent).toContain('«');
    expect(ui.element('data-formation-bird-select').closest('label').textContent).toContain('«Choose bird');
    expect(ui.canvas.getAttribute('aria-label')).toContain('«');
  });
});

describe('V-formation still-frame interaction', () => {
  it('preserves the scientific readout, still pose and energy when the viewport alone changes', () => {
    width = 1000; const ui = mount(); ui.auto(); ui.select(1); drive();
    const description = ui.position.textContent;
    const pose = paintedBirdPose(ui);
    expect(pose.length).toBeGreaterThan(0);
    const energy = ui.context.operations.filter(op => op[0] === 'fillRect' && op[4] === 3).map(op => op[3]);
    expect(description).toContain('in the upwash of bird 1');
    expect(description).toContain('Formation efficiency: 100%');
    width = 260; drive();
    expect(ui.position.textContent).toBe(description);
    const resizedPose = paintedBirdPose(ui);
    expect(resizedPose.length).toBeGreaterThan(0);
    expect(resizedPose).toEqual(pose);
    expect(ui.context.operations.filter(op => op[0] === 'fillRect' && op[4] === 3).map(op => op[3])).toEqual(energy);
    const narrowPoint = ui.point(), paints = ui.context.paints;
    drive(4); expect(ui.point()).toEqual(narrowPoint); expect(ui.context.paints).toBe(paints);
    width = 1000; drive(); expect(ui.position.textContent).toBe(description);
    expect(ui.writes).toEqual([]);
  });

  it('establishes fresh model geometry only when a new flock is explicitly arranged', () => {
    width = 1000; const ui = mount(); ui.auto(); width = 260; drive();
    ui.auto(); ui.select(1); drive();
    expect(ui.position.textContent).toContain('in the upwash of bird 1');
    expect(ui.position.textContent).toContain('Formation efficiency: 100%');
    ui.scatter(); ui.range('x', 35); ui.range('y', 42); drive();
    expect(ui.position.textContent).toContain('in the upwash of bird 1');
  });

  it('keeps the new canvas loop alive when the previous canvas is removed in the same task', async () => {
    const ui = mount(), oldCanvas = ui.canvas, oldContext = ui.context;
    const oldFrame = pending.values().next().value;
    ui.set({ tab: 'navigate' });
    ui.set({ tab: 'vformation' });
    expect(ui.canvas).not.toBe(oldCanvas);
    await act(async () => {});
    const newContext = ui.context, newPaints = newContext.paints, oldPaints = oldContext.paints;
    ui.key('ArrowRight'); drive(3);
    expect(newContext.paints).toBeGreaterThan(newPaints);
    const writes = ui.writes.length, awards = ui.award.mock.calls.length;
    act(() => oldFrame(999));
    expect(oldContext.paints).toBe(oldPaints);
    expect(ui.writes).toHaveLength(writes); expect(ui.award).toHaveBeenCalledTimes(awards);
    const visiblePoint = ui.point();
    expect(visiblePoint.x).toBeCloseTo(28 + 0.55 * 564);
  });

  it('ignores a queued frame as soon as its canvas is detached, before observer cleanup', () => {
    const ui = mount({ perfectVFormed: false }), oldFrame = pending.values().next().value, context = ui.context;
    ui.auto(); const paints = context.paints;
    ui.set({ tab: 'navigate' });
    act(() => oldFrame(999));
    expect(context.paints).toBe(paints);
    expect(ui.state.perfectVFormed).toBe(false); expect(ui.award).not.toHaveBeenCalled();
    expect(ui.writes).toEqual([]);
  });

  it('repaints same-count arrangements and in-place edits while reduced motion is active', () => {
    const ui = mount(); drive(2); const initial = ui.context.paints;
    drive(4); expect(ui.context.paints).toBe(initial);
    ui.scatter(); ui.auto(); drive(); expect(ui.context.paints).toBe(initial + 1);
    expect(ui.element('data-formation-efficiency').textContent.trim()).toBe('100%');
    expect(ui.element('data-formation-efficiency-meter').value).toBe(100);
    const old = ui.point(); ui.key('ArrowLeft'); drive(); expect(ui.context.paints).toBe(initial + 2); expect(ui.point()).not.toEqual(old);
    drive(4); expect(ui.context.paints).toBe(initial + 2);
  });

  it('never advances physics on selection-only reduced-motion repaints', () => {
    const ui = mount(); drive(); const scene = structuredClone(ui.context.operations);
    ui.select(0); drive(); expect(ui.context.operations).toEqual(scene);
    expect(ui.element('data-formation-pause').getAttribute('aria-pressed')).toBe('true');
    expect(ui.element('data-formation-pause').getAttribute('aria-disabled')).toBe('true');
    expect(ui.host.textContent).toContain('Your reduced-motion preference keeps this scene still.');
    const count = ui.context.paints; ui.click('data-formation-pause'); drive(3); expect(ui.context.paints).toBe(count);
  });

  it('freezes physics while explicitly paused, repaints edits, then resumes animation', () => {
    reduceMotion = false; const ui = mount(); drive(3); const animated = ui.context.paints;
    expect(animated).toBeGreaterThan(2); ui.click('data-formation-pause'); drive();
    expect(ui.element('data-formation-pause').getAttribute('aria-pressed')).toBe('true');
    const scene = structuredClone(ui.context.operations), paused = ui.context.paints;
    drive(3); expect(ui.context.paints).toBe(paused);
    ui.select(0); drive(); expect(ui.context.operations).toEqual(scene);
    ui.key('ArrowRight'); drive(); expect(ui.context.operations).not.toEqual(scene);
    ui.click('data-formation-pause'); drive(3); expect(ui.context.paints).toBeGreaterThan(paused + 3);
    expect(ui.element('data-formation-pause').getAttribute('aria-pressed')).toBe('false');
  });

  it('awards a perfect formation once despite repeated arrangement and selection repaints', () => {
    const ui = mount({ perfectVFormed: false }); ui.auto(); drive();
    expect(ui.award).toHaveBeenCalledTimes(1); expect(ui.state.perfectVFormed).toBe(true);
    ui.select(1); drive(); ui.auto(); drive(); ui.select(2); drive();
    expect(ui.award).toHaveBeenCalledTimes(1);
    expect(ui.writes).toEqual([{ perfectVFormed: true }]);
  });
});
