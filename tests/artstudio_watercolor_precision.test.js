import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Buffer } from 'node:buffer';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  newStore,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const canvasContexts = new WeakMap();
let container;
let root;

function makeContext(canvas) {
  return {
    canvas,
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    createImageData: (width, height) => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    }),
  };
}

async function mountWatercolor(seed = {}) {
  const tool = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
  const store = newStore({ artStudio: { tab: 'watercolor', watercolorBrush: 'round', ...seed } });
  const App = () => {
    const [toolData, setToolData] = React.useState(store.toolData);
    return tool.render(makeCtx({ toolData, setToolData }, store));
  };
  container = document.createElement('div');
  document.body.appendChild(container);
  await React.act(async () => {
    root = ReactDOMClient.createRoot(container);
    root.render(React.createElement(App));
  });
  const canvas = container.querySelector('#watercolorCanvas');
  return { canvas, engine: canvas._watercolorEngine };
}

beforeEach(() => {
  resetStemLab();
  vi.restoreAllMocks();
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (type) {
    if (type !== '2d') return null;
    if (!canvasContexts.has(this)) canvasContexts.set(this, makeContext(this));
    return canvasContexts.get(this);
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,d2F0ZXJjb2xvcg==');
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  container?.remove();
  root = null;
  container = null;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

const paper = () => container.querySelector('.artstudio-watercolor-paper');
const cursor = () => container.querySelector('#artstudio-watercolor-cursor');
const help = () => container.querySelector('#artstudio-watercolor-keyboard-help');
const click = async id => React.act(async () => container.querySelector('#' + id).click());
const pan = () => click('artstudio-watercolor-mode-pan');
const paint = () => click('artstudio-watercolor-mode-paint');
const zoom = async value => React.act(async () => {
  const select = container.querySelector('#artstudio-watercolor-zoom');
  select.value = String(value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
});
const key = async (canvas, value, modifiers = {}) => {
  const event = { key: value, preventDefault: vi.fn(), ...modifiers };
  await React.act(async () => canvas.onkeydown(event));
  return event;
};
const pointer = (type = 'pointerdown', extra = {}) => ({
  type,
  clientX: 80,
  clientY: 80,
  pointerId: 7,
  pointerType: 'mouse',
  isPrimary: true,
  button: 0,
  pressure: 0.7,
  timeStamp: 0,
  preventDefault: vi.fn(),
  ...extra,
});
const dispatchPointer = async (canvas, type, extra = {}) => React.act(async () => canvas['on' + type](pointer(type, extra)));
const mass = state => state.pigmentDensity.reduce((total, value) => total + value, 0);

function samePainting(before, after) {
  for (const field of Object.keys(before)) {
    if (!ArrayBuffer.isView(before[field])) continue;
    const bytes = value => Buffer.from(value.buffer, value.byteOffset, value.byteLength);
    expect(bytes(before[field]).equals(bytes(after[field])), field).toBe(true);
  }
  for (const field of ['reservoirWater', 'reservoirPigment', 'strokeSeed', 'paused']) {
    expect(after[field], field).toBe(before[field]);
  }
}

// jsdom has no scroll layout. Keep the sheet bounds tied to the paper's scroll
// position so these tests exercise visible geometry instead of fixed rectangles.
function layout(canvas, { side = 600, width = 220, height = 180, scrollWidth = side + 24, scrollHeight = side + 24 } = {}) {
  const viewport = paper();
  const left = 40;
  const top = 70;
  const borderX = 2;
  const borderY = 3;
  for (const [name, value] of Object.entries({ clientLeft: borderX, clientTop: borderY, clientWidth: width, clientHeight: height, scrollWidth, scrollHeight })) {
    Object.defineProperty(viewport, name, { value, configurable: true });
  }
  // A browser clamps scroll assignments; jsdom's plain properties do not.
  for (const [name, max] of [['scrollLeft', Math.max(0, scrollWidth - width)], ['scrollTop', Math.max(0, scrollHeight - height)]]) {
    let position = 0;
    Object.defineProperty(viewport, name, {
      configurable: true,
      get: () => position,
      set: value => { position = Math.max(0, Math.min(max, Number(value) || 0)); },
    });
  }
  viewport.getBoundingClientRect = () => ({ left, top, width: width + 2 * borderX, height: height + 2 * borderY });
  const sheetBounds = () => ({
    left: left + borderX + 12 - viewport.scrollLeft,
    top: top + borderY + 12 - viewport.scrollTop,
    width: side,
    height: side,
  });
  canvas.getBoundingClientRect = sheetBounds;
  canvas.parentElement.getBoundingClientRect = sheetBounds;
  return { viewport, left: left + borderX, top: top + borderY, right: left + borderX + width, bottom: top + borderY + height };
}

function cursorBounds(canvas) {
  const sheet = canvas.parentElement.getBoundingClientRect();
  const centerX = sheet.left + parseFloat(cursor().style.left);
  const centerY = sheet.top + parseFloat(cursor().style.top);
  const halfWidth = parseFloat(cursor().style.width) / 2;
  const halfHeight = parseFloat(cursor().style.height) / 2;
  return { centerX, centerY, left: centerX - halfWidth, right: centerX + halfWidth, top: centerY - halfHeight, bottom: centerY + halfHeight, halfWidth, halfHeight };
}

describe('Watercolor precision keyboard painting', () => {
  it.each([8, 28, 80])('retains brush-relative ordinary movement for a %spx brush without painting', async size => {
    const { canvas, engine } = await mountWatercolor({ watercolorSize: size });
    const before = engine.captureState();
    const move = Math.max(2, size * (192 / 512) * 0.55);
    await key(canvas, 'ArrowRight');
    await key(canvas, 'ArrowUp');
    const after = engine.captureState();
    expect(after.keyboardX).toBeCloseTo(96 + move, 8);
    expect(after.keyboardY).toBeCloseTo(96 - move, 8);
    samePainting(before, after);
    expect(engine.undo()).toBe(false);
  });

  it.each(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])('moves exactly one simulation cell with Alt+%s, including when Shift is held', async direction => {
    const { canvas, engine } = await mountWatercolor({ watercolorSize: 80 });
    const dx = direction === 'ArrowRight' ? 1 : direction === 'ArrowLeft' ? -1 : 0;
    const dy = direction === 'ArrowDown' ? 1 : direction === 'ArrowUp' ? -1 : 0;
    await key(canvas, direction, { altKey: true });
    expect(engine.captureState().keyboardX).toBe(96 + dx);
    expect(engine.captureState().keyboardY).toBe(96 + dy);
    await key(canvas, direction, { altKey: true, shiftKey: true });
    expect(engine.captureState().keyboardX).toBe(96 + 2 * dx);
    expect(engine.captureState().keyboardY).toBe(96 + 2 * dy);
    expect(engine.undo()).toBe(false);
  });

  it('moves four ordinary steps with Shift and clamps precision movement to both sheet corners', async () => {
    const { canvas, engine } = await mountWatercolor({ watercolorSize: 28 });
    await key(canvas, 'ArrowRight', { shiftKey: true });
    expect(engine.captureState().keyboardX).toBeCloseTo(96 + 4 * 28 * (192 / 512) * 0.55, 8);
    await key(canvas, 'Home');
    await key(canvas, 'ArrowLeft', { altKey: true });
    await key(canvas, 'ArrowUp', { shiftKey: true });
    expect(engine.captureState().keyboardX).toBe(0);
    expect(engine.captureState().keyboardY).toBe(0);
    await key(canvas, 'End');
    await key(canvas, 'ArrowRight', { altKey: true });
    await key(canvas, 'ArrowDown', { shiftKey: true });
    expect(engine.captureState().keyboardX).toBe(191);
    expect(engine.captureState().keyboardY).toBe(191);
    expect(mass(engine.captureState())).toBe(0);
  });

  it('reveals a keyboard-focused brush with only the needed scroll and never scrolls a parent or the page', async () => {
    const { canvas, engine } = await mountWatercolor({ watercolorSize: 8 });
    await zoom(3);
    const view = layout(canvas);
    container.scrollLeft = 17;
    container.scrollTop = 23;
    const pageScroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const scrollIntoView = vi.fn();
    canvas.scrollIntoView = scrollIntoView;
    const before = engine.captureState();
    await React.act(async () => canvas.focus());
    const bounds = cursorBounds(canvas);
    expect(view.viewport.scrollLeft).toBeCloseTo(104 + bounds.halfWidth, 5);
    expect(view.viewport.scrollTop).toBeCloseTo(144 + bounds.halfHeight, 5);
    expect(bounds.right).toBeCloseTo(view.right - 12, 5);
    expect(bounds.bottom).toBeCloseTo(view.bottom - 12, 5);
    expect(container.scrollLeft).toBe(17);
    expect(container.scrollTop).toBe(23);
    expect(pageScroll).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
    samePainting(before, engine.captureState());
  });

  it('leaves a visible keyboard brush in place and scrolls only the crossed axis by one precision cell', async () => {
    const { canvas } = await mountWatercolor({ watercolorSize: 8 });
    await zoom(3);
    const view = layout(canvas);
    view.viewport.scrollLeft = 170;
    view.viewport.scrollTop = 230;
    await React.act(async () => canvas.focus());
    expect(view.viewport.scrollLeft).toBe(170);
    expect(view.viewport.scrollTop).toBe(230);
    const bounds = cursorBounds(canvas);
    view.viewport.scrollLeft = 104 + bounds.halfWidth;
    await key(canvas, 'ArrowRight', { altKey: true });
    expect(view.viewport.scrollLeft).toBeCloseTo(104 + bounds.halfWidth + 600 / 192, 5);
    expect(view.viewport.scrollTop).toBe(230);
  });

  it('returns Home and End to reachable viewport edges and retains the sheet coordinate extremes', async () => {
    const { canvas, engine } = await mountWatercolor();
    await zoom(3);
    const view = layout(canvas);
    await React.act(async () => canvas.focus());
    await key(canvas, 'End');
    expect(view.viewport.scrollLeft).toBe(624 - 220);
    expect(view.viewport.scrollTop).toBe(624 - 180);
    expect(engine.captureState().keyboardX).toBe(191);
    expect(engine.captureState().keyboardY).toBe(191);
    await key(canvas, 'Home');
    expect(view.viewport.scrollLeft).toBe(0);
    expect(view.viewport.scrollTop).toBe(0);
    expect(engine.captureState().keyboardX).toBe(0);
    expect(engine.captureState().keyboardY).toBe(0);
  });

  it('reveals the center of a brush that is wider than the viewport without oscillating on later dabs', async () => {
    const { canvas } = await mountWatercolor({ watercolorSize: 80 });
    await zoom(3);
    const view = layout(canvas, { side: 1024, width: 60, height: 50 });
    await React.act(async () => canvas.focus());
    const bounds = cursorBounds(canvas);
    expect(parseFloat(cursor().style.width)).toBeGreaterThan(60);
    expect(bounds.centerX).toBeGreaterThanOrEqual(view.left + 12);
    expect(bounds.centerX).toBeLessThanOrEqual(view.right - 12);
    expect(bounds.centerY).toBeGreaterThanOrEqual(view.top + 12);
    expect(bounds.centerY).toBeLessThanOrEqual(view.bottom - 12);
    const before = [view.viewport.scrollLeft, view.viewport.scrollTop];
    await key(canvas, 'Enter');
    expect([view.viewport.scrollLeft, view.viewport.scrollTop]).toEqual(before);
  });

  it('reveals the keyboard location for a dab after the view has been panned away', async () => {
    const { canvas, engine } = await mountWatercolor({ watercolorSize: 8 });
    await zoom(3);
    const view = layout(canvas);
    await React.act(async () => canvas.focus());
    view.viewport.scrollLeft = 404;
    view.viewport.scrollTop = 444;
    await key(canvas, ' ');
    const bounds = cursorBounds(canvas);
    expect(bounds.left).toBeCloseTo(view.left + 12, 5);
    expect(bounds.top).toBeCloseTo(view.top + 12, 5);
    expect(mass(engine.captureState())).toBeGreaterThan(0);
    expect(engine.undo()).toBe(true);
    expect(mass(engine.captureState())).toBe(0);
  });

  it('keeps the keyboard-owned outline on pointer leave and restores it after a temporary hover', async () => {
    const { canvas, engine } = await mountWatercolor();
    layout(canvas);
    await React.act(async () => canvas.focus());
    await key(canvas, 'ArrowRight', { altKey: true });
    const keyboardPosition = [cursor().style.left, cursor().style.top];
    await dispatchPointer(canvas, 'pointerleave');
    expect(cursor().style.display).toBe('block');
    await dispatchPointer(canvas, 'pointermove', { clientX: 90, clientY: 110 });
    expect([cursor().style.left, cursor().style.top]).not.toEqual(keyboardPosition);
    await dispatchPointer(canvas, 'pointerleave');
    expect([cursor().style.left, cursor().style.top]).toEqual(keyboardPosition);
    expect(cursor().style.display).toBe('block');
    expect(mass(engine.captureState())).toBe(0);
    await React.act(async () => canvas.blur());
    expect(cursor().style.display).toBe('none');
    await dispatchPointer(canvas, 'pointerleave');
    expect(cursor().style.display).toBe('none');
  });

  it('hides a hover-owned outline on pointer leave while the canvas is unfocused', async () => {
    const { canvas } = await mountWatercolor();
    layout(canvas);
    await dispatchPointer(canvas, 'pointermove', { clientX: 90, clientY: 110 });
    expect(cursor().style.display).toBe('block');
    await dispatchPointer(canvas, 'pointerleave');
    expect(cursor().style.display).toBe('none');
  });

  it('clips cursor overflow to a separate screen layer while keeping the sheet and canvas focus ring unclipped', async () => {
    const { canvas, engine } = await mountWatercolor();
    const sheet = canvas.parentElement;
    const layer = container.querySelector('[data-watercolor-cursor-layer]');
    expect(layer.parentElement).toBe(sheet);
    expect(cursor().parentElement).toBe(layer);
    expect(layer.contains(canvas)).toBe(false);
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(layer.style.position).toBe('absolute');
    expect(parseFloat(layer.style.inset)).toBe(0);
    expect(layer.style.overflow).toBe('hidden');
    expect(layer.style.pointerEvents).toBe('none');
    expect(window.getComputedStyle(sheet).overflow).not.toBe('hidden');
    expect(window.getComputedStyle(sheet).overflow).not.toBe('clip');
    expect(canvas.className).toContain('focus-visible:ring-4');
    const before = engine.captureState();
    await key(canvas, 'End');
    engine.captureExport();
    expect(cursor().style.display).toBe('block');
    expect(canvasContexts.get(canvas).stroke).not.toHaveBeenCalled();
    samePainting(before, engine.captureState());
  });

  it.each(['mouse', 'pen', 'touch'])('focuses a %s painting gesture without jumping to the keyboard location or scrolling the sheet', async type => {
    const { canvas, engine } = await mountWatercolor({ watercolorTouchMode: 'draw' });
    await zoom(3);
    const view = layout(canvas);
    view.viewport.scrollLeft = 310;
    view.viewport.scrollTop = 350;
    const focus = vi.spyOn(canvas, 'focus');
    await dispatchPointer(canvas, 'pointerdown', { pointerType: type, clientX: 80, clientY: 95 });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(canvas);
    expect(view.viewport.scrollLeft).toBe(310);
    expect(view.viewport.scrollTop).toBe(350);
    expect(engine.captureState().keyboardX).toBe(96);
    expect(engine.captureState().keyboardY).toBe(96);
    await dispatchPointer(canvas, 'pointerup', { pointerType: type, clientX: 80, clientY: 95 });
    await dispatchPointer(canvas, 'pointerleave', { pointerType: type });
    expect(cursor().style.display).toBe('none');
    expect(mass(engine.captureState())).toBeGreaterThan(0);
  });

  it('ends a pointer stroke on Escape, preserves its single Undo entry, and ignores its late release', async () => {
    const { canvas, engine } = await mountWatercolor();
    layout(canvas, { side: 192 });
    canvas.releasePointerCapture = vi.fn();
    await dispatchPointer(canvas, 'pointerdown', { clientX: 110, clientY: 140 });
    await dispatchPointer(canvas, 'pointermove', { clientX: 140, clientY: 160, timeStamp: 80 });
    const finished = engine.captureState();
    const escape = await key(canvas, 'Escape');
    expect(escape.preventDefault).toHaveBeenCalled();
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(cursor().style.display).toBe('none');
    await dispatchPointer(canvas, 'pointerup', { clientX: 210, clientY: 220, timeStamp: 100 });
    samePainting(finished, engine.captureState());
    expect(engine.undo()).toBe(true);
    expect(mass(engine.captureState())).toBe(0);
    expect(engine.undo()).toBe(false);
  });

  it.each(['ArrowRight', 'Home', 'End'])('ends a pointer stroke before keyboard %s and ignores subsequent captured movement', async action => {
    const { canvas, engine } = await mountWatercolor();
    layout(canvas, { side: 192 });
    await dispatchPointer(canvas, 'pointerdown', { clientX: 110, clientY: 140 });
    const stroke = engine.captureState();
    await key(canvas, action, { altKey: true });
    await dispatchPointer(canvas, 'pointermove', { clientX: 180, clientY: 200, timeStamp: 80 });
    await dispatchPointer(canvas, 'pointerup', { clientX: 190, clientY: 210, timeStamp: 100 });
    samePainting(stroke, engine.captureState());
    expect(engine.undo()).toBe(true);
    expect(mass(engine.captureState())).toBe(0);
    expect(engine.undo()).toBe(false);
  });

  it.each(['Enter', ' '])('keeps pointer painting and a keyboard %s dab as separate Undo operations', async action => {
    const { canvas, engine } = await mountWatercolor();
    layout(canvas, { side: 192 });
    await dispatchPointer(canvas, 'pointerdown', { clientX: 110, clientY: 140 });
    const stroke = engine.captureState();
    const compactStroke = engine.captureState(true);
    await key(canvas, action);
    const dab = engine.captureState();
    const compactDab = engine.captureState(true);
    expect(mass(dab)).toBeGreaterThan(mass(stroke));
    await dispatchPointer(canvas, 'pointerup', { clientX: 220, clientY: 230, timeStamp: 100 });
    samePainting(dab, engine.captureState());
    expect(engine.undo()).toBe(true);
    // Undo stores uint16-v1 compact state; compare that exact representation.
    samePainting(compactStroke, engine.captureState(true));
    expect(engine.undo()).toBe(true);
    expect(mass(engine.captureState())).toBe(0);
    expect(engine.undo()).toBe(false);
    expect(engine.redo()).toBe(true);
    samePainting(compactStroke, engine.captureState(true));
    expect(engine.redo()).toBe(true);
    samePainting(compactDab, engine.captureState(true));
  });

  it('cancels a captured pointer stroke on blur and does not let a late release paint in another control', async () => {
    const { canvas, engine } = await mountWatercolor();
    layout(canvas, { side: 192 });
    await dispatchPointer(canvas, 'pointerdown', { clientX: 110, clientY: 140 });
    const before = engine.captureState();
    await React.act(async () => canvas.blur());
    expect(cursor().style.display).toBe('none');
    await dispatchPointer(canvas, 'pointerup', { clientX: 220, clientY: 230, timeStamp: 100 });
    samePainting(before, engine.captureState());
    expect(engine.undo()).toBe(true);
    expect(engine.undo()).toBe(false);
  });

  it('refreshes a keyboard-owned outline after state restoration without scrolling the viewport', async () => {
    const { canvas, engine } = await mountWatercolor();
    const view = layout(canvas);
    await React.act(async () => canvas.focus());
    const saved = engine.captureState();
    await key(canvas, 'ArrowRight', { altKey: true });
    const changedLeft = cursor().style.left;
    view.viewport.scrollLeft = 250;
    view.viewport.scrollTop = 280;
    await React.act(async () => engine.restoreState(saved));
    expect(cursor().style.display).toBe('block');
    expect(cursor().style.left).not.toBe(changedLeft);
    expect(parseFloat(cursor().style.left)).toBeCloseTo(300, 5);
    expect(view.viewport.scrollLeft).toBe(250);
    expect(view.viewport.scrollTop).toBe(280);
  });

  it('describes precision Paint and Pan keyboard behavior separately and exposes all implemented shortcuts', async () => {
    const { canvas } = await mountWatercolor();
    const shortcuts = canvas.getAttribute('aria-keyshortcuts').split(' ');
    for (const shortcut of ['Alt+ArrowLeft', 'Alt+ArrowRight', 'Alt+ArrowUp', 'Alt+ArrowDown', 'Shift+ArrowLeft', 'Shift+ArrowRight', 'Shift+ArrowUp', 'Shift+ArrowDown', 'Escape', 'Control+Shift+Z', 'Meta+Shift+Z', 'Control+Y', 'Meta+Y']) {
      expect(shortcuts).toContain(shortcut);
    }
    expect(help().textContent).toMatch(/Alt.*fine/i);
    expect(help().textContent).toContain('Shift');
    await pan();
    expect(help().textContent).toContain('Pan');
    expect(help().textContent).toContain('Enter');
    expect(help().textContent).toMatch(/do not (paint|draw)/i);
    const panShortcuts = canvas.getAttribute('aria-keyshortcuts').split(' ');
    for (const shortcut of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Shift+ArrowRight', 'Home', 'End', 'Escape', 'P', 'Control+Z', 'Control+Shift+Z', 'Meta+Z', 'Control+Y', 'Meta+Y']) {
      expect(panShortcuts).toContain(shortcut);
    }
    for (const shortcut of ['Alt+ArrowLeft', 'Alt+ArrowRight', 'Alt+ArrowUp', 'Alt+ArrowDown', 'Enter', 'Space']) {
      expect(panShortcuts).not.toContain(shortcut);
    }
    await paint();
    expect(help().textContent).toMatch(/Alt.*fine/i);
    expect(help().textContent).toMatch(/dab/i);
    expect(canvas.getAttribute('aria-keyshortcuts').split(' ')).toEqual(shortcuts);
  });
});

describe('Watercolor keyboard panning gesture ownership', () => {
  it('leaves Alt navigation unconsumed in Pan and preserves the active pointer drag', async () => {
    const { canvas, engine } = await mountWatercolor();
    const view = layout(canvas);
    await pan();
    view.viewport.scrollLeft = 150;
    view.viewport.scrollTop = 120;
    const before = engine.captureState();
    await dispatchPointer(canvas, 'pointerdown', { clientX: 90, clientY: 80 });
    for (const direction of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const event = await key(canvas, direction, { altKey: true });
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect([view.viewport.scrollLeft, view.viewport.scrollTop]).toEqual([150, 120]);
      expect(canvas.style.cursor).toBe('grabbing');
    }
    await dispatchPointer(canvas, 'pointermove', { clientX: 50, clientY: 20 });
    expect([view.viewport.scrollLeft, view.viewport.scrollTop]).toEqual([190, 180]);
    samePainting(before, engine.captureState());
    expect(engine.undo()).toBe(false);
  });

  it.each(['ArrowRight', 'Home', 'End'])('releases a captured drag before %s and ignores its late move', async action => {
    const { canvas, engine } = await mountWatercolor();
    const view = layout(canvas);
    await pan();
    view.viewport.scrollLeft = 150;
    view.viewport.scrollTop = 120;
    canvas.releasePointerCapture = vi.fn();
    const before = engine.captureState();
    await dispatchPointer(canvas, 'pointerdown', { clientX: 90, clientY: 80 });
    await key(canvas, action);
    const expected = action === 'ArrowRight' ? [198, 120] : action === 'Home' ? [0, 0] : [404, 444];
    expect([view.viewport.scrollLeft, view.viewport.scrollTop]).toEqual(expected);
    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(7);
    expect(canvas.style.cursor).toBe('grab');
    await dispatchPointer(canvas, 'pointermove', { clientX: 10, clientY: 10 });
    await dispatchPointer(canvas, 'pointerup', { clientX: 10, clientY: 10 });
    expect([view.viewport.scrollLeft, view.viewport.scrollTop]).toEqual(expected);
    samePainting(before, engine.captureState());
    expect(engine.undo()).toBe(false);
  });

  it('ends a Pan capture on Escape and allows a new pointer to begin the next drag', async () => {
    const { canvas, engine } = await mountWatercolor();
    const view = layout(canvas);
    await pan();
    view.viewport.scrollLeft = 150;
    await dispatchPointer(canvas, 'pointerdown', { clientX: 90 });
    const event = await key(canvas, 'Escape');
    expect(event.preventDefault).toHaveBeenCalled();
    expect(canvas.style.cursor).toBe('grab');
    await dispatchPointer(canvas, 'pointermove', { clientX: 10 });
    expect(view.viewport.scrollLeft).toBe(150);
    await dispatchPointer(canvas, 'pointerdown', { clientX: 90, pointerId: 8 });
    await dispatchPointer(canvas, 'pointermove', { clientX: 50, pointerId: 8 });
    expect(view.viewport.scrollLeft).toBe(190);
    expect(mass(engine.captureState())).toBe(0);
    expect(engine.undo()).toBe(false);
  });

  it('ends a captured Pan on blur and leaves the viewport fixed when the old pointer moves again', async () => {
    const { canvas, engine } = await mountWatercolor();
    const view = layout(canvas);
    await pan();
    view.viewport.scrollLeft = 150;
    view.viewport.scrollTop = 120;
    await dispatchPointer(canvas, 'pointerdown', { clientX: 90, clientY: 80 });
    expect(document.activeElement).toBe(canvas);
    await React.act(async () => canvas.blur());
    expect(canvas.style.cursor).toBe('grab');
    await dispatchPointer(canvas, 'pointermove', { clientX: 10, clientY: 10 });
    expect([view.viewport.scrollLeft, view.viewport.scrollTop]).toEqual([150, 120]);
    expect(mass(engine.captureState())).toBe(0);
    expect(engine.undo()).toBe(false);
  });

  it('keeps Enter and Space from painting in Pan mode even during a captured drag', async () => {
    const { canvas, engine } = await mountWatercolor();
    const view = layout(canvas);
    await pan();
    view.viewport.scrollLeft = 150;
    const before = engine.captureState();
    await dispatchPointer(canvas, 'pointerdown', { clientX: 90 });
    await key(canvas, 'Enter');
    await key(canvas, ' ');
    expect(cursor().style.display).toBe('none');
    samePainting(before, engine.captureState());
    expect(engine.undo()).toBe(false);
  });
});
