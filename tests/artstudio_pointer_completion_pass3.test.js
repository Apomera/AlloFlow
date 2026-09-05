import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function pointer(x, y, extra = {}) {
  return { button: 0, clientX: x, clientY: y, pointerId: 7, pointerType: 'pen', pressure: 0.7, timeStamp: 20, preventDefault: vi.fn(), ...extra };
}

function maxPigmentX(state) {
  let maximum = -1;
  state.pigmentDensity.forEach((value, index) => {
    if (value > 0) maximum = Math.max(maximum, index % state.simWidth);
  });
  return maximum;
}

describe('Art Studio pointer completion and interrupted strokes', () => {
  let host;
  let root;
  let config;
  let contexts;

  beforeEach(() => {
    resetStemLab();
    vi.useFakeTimers();
    contexts = new WeakMap();
    config = loadTool(process.env.ARTSTUDIO_TEST_SOURCE || 'stem_lab/stem_tool_artstudio.js', 'artStudio');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      if (!contexts.has(this)) {
        const context = { canvas: this, marks: 0 };
        context.fill = context.stroke = vi.fn(() => { context.marks++; });
        context.clearRect = vi.fn(() => { context.marks = 0; });
        context.getImageData = vi.fn(() => ({ data: new Uint8ClampedArray(4), marks: context.marks }));
        context.putImageData = vi.fn((snapshot) => { if (typeof snapshot.marks === 'number') context.marks = snapshot.marks; });
        context.createImageData = (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) });
        context.createLinearGradient = context.createRadialGradient = () => ({ addColorStop() {} });
        contexts.set(this, new Proxy(context, { get(target, key) { if (!(key in target)) target[key] = vi.fn(); return target[key]; } }));
      }
      return contexts.get(this);
    });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      return 'data:image/png;base64,' + btoa(String(this.getContext('2d').marks));
    });
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function mount(tab, initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: {
        tab, studioStarted: true, studioHome: false, symmetryFolds: 4,
        symPatternMode: 'rotate', symStrokeMode: 'freehand', symSmoothing: 0, ...initial,
      } });
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => { root.render(React.createElement(Harness)); });
    const canvas = host.querySelector(tab === 'watercolor' ? '#watercolorCanvas' : '#symmetryCanvas');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 512, height: 512 });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    return canvas;
  }

  it('finishes a fast Watercolor stroke at the release coordinate and keeps it one undoable gesture', async () => {
    const canvas = await mount('watercolor');
    const engine = canvas._watercolorEngine;
    canvas.onpointerdown(pointer(64, 64));
    expect(maxPigmentX(engine.captureState())).toBeLessThan(engine.captureState().simWidth * 0.3);
    canvas.onpointerup(pointer(400, 64, { timeStamp: 120 }));
    const completed = engine.captureState();
    expect(maxPigmentX(completed)).toBeGreaterThan(completed.simWidth * 0.72);
    expect(engine.undo()).toBe(true);
    expect(engine.captureState().pigmentDensity.some((value) => value > 0)).toBe(false);
    expect(engine.redo()).toBe(true);
    expect(maxPigmentX(engine.captureState())).toBeGreaterThan(completed.simWidth * 0.72);
  });

  it('does not add pigment when Watercolor is released at the last painted point', async () => {
    const canvas = await mount('watercolor');
    canvas.onpointerdown(pointer(100, 100));
    const before = canvas._watercolorEngine.captureState().pigmentDensity;
    canvas.onpointerup(pointer(100, 100, { timeStamp: 120 }));
    expect(canvas._watercolorEngine.captureState().pigmentDensity).toEqual(before);
  });

  it('keeps Watercolor cancellation at its last actual paint sample and ignores later hover movement', async () => {
    const canvas = await mount('watercolor');
    canvas.onpointerdown(pointer(64, 64));
    const before = canvas._watercolorEngine.captureState().pigmentDensity;
    canvas.onpointercancel(pointer(400, 64));
    canvas.onpointermove(pointer(450, 64));
    expect(canvas._watercolorEngine.captureState().pigmentDensity).toEqual(before);
  });

  it('keeps a Symmetry freehand stroke at the last real sample when pointer capture is lost', async () => {
    const canvas = await mount('symmetry');
    const context = contexts.get(canvas);
    await act(async () => {
      canvas.onpointerdown(pointer(100, 100));
      canvas.onpointermove(pointer(160, 180));
    });
    const lastRealMarks = context.marks;
    await act(async () => { canvas.onlostpointercapture(pointer(0, 0)); });
    expect(context.marks).toBe(lastRealMarks);
    expect(canvas._symDrawing).toBe(false);
    expect(canvas._symUndo).toHaveLength(1);
    await act(async () => { canvas._symUndoAction(); });
    expect(context.marks).toBe(0);
    await act(async () => { canvas._symRedoAction(); });
    expect(context.marks).toBe(lastRealMarks);
  });

  it('cancels a Symmetry line preview instead of committing an artificial endpoint after capture loss', async () => {
    const canvas = await mount('symmetry', { symStrokeMode: 'line' });
    const context = contexts.get(canvas);
    const before = context.marks;
    await act(async () => {
      canvas.onpointerdown(pointer(100, 100));
      canvas.onpointermove(pointer(200, 220));
    });
    expect(context.marks).toBeGreaterThan(before);
    await act(async () => { canvas.onlostpointercapture(pointer(0, 0)); });
    expect(context.marks).toBe(before);
    expect(canvas._symUndo).toHaveLength(0);
    expect(canvas._symDrawing).toBe(false);
  });
});
