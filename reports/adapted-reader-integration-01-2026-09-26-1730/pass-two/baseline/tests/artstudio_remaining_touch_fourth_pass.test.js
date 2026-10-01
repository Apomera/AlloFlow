import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const originalMatchMedia = window.matchMedia;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeCanvasContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    translate: vi.fn(),
  };
}

function pointerEvent(type, pointerType, clientX = 120, clientY = 140) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX,
    clientY,
  });
  Object.defineProperties(event, {
    pointerType: { configurable: true, value: pointerType },
    pointerId: { configurable: true, value: 9 },
    isPrimary: { configurable: true, value: true },
    pressure: { configurable: true, value: pointerType === 'pen' ? 0.7 : 0.5 },
  });
  return event;
}

const touchCases = [
  {
    label: 'Pixel Art',
    selector: '#pixelCanvas',
    stateKey: 'pixelTouchMode',
    activeMode: 'draw',
    groupLabel: 'Pixel art touch interaction',
    activeLabel: 'Draw pixels',
    initial: { tab: 'pixel', pixelGrid: 16, pixelTool: 'brush', pixelData: {} },
    interactionStarted: (canvas, random) => !!canvas._pixelDrawing && random.mock.calls.length === 0,
  },
  {
    label: 'Generative Art',
    selector: '#genCanvas',
    stateKey: 'genTouchMode',
    activeMode: 'interact',
    groupLabel: 'Generative art touch interaction',
    activeLabel: 'Interact with art',
    initial: { tab: 'generative', genStyle: 'flow', genDensity: 20, genPaused: true },
    interactionStarted: (canvas) => Number(canvas.getAttribute('data-gen-bursts')) > 0,
  },
  {
    label: 'Spin Art',
    selector: '#spinCanvas',
    stateKey: 'spinTouchMode',
    activeMode: 'draw',
    groupLabel: 'Spin art touch interaction',
    activeLabel: 'Drip paint',
    initial: { tab: 'spinArt', spinRPM: 120, spinBrush: 6, spinPaused: true },
    interactionStarted: (canvas, random) => !!canvas._spinPointerDown && random.mock.calls.length === 0,
  },
];

describe('Art Studio fourth-pass touch safety', () => {
  let host;
  let root;
  let config;
  let latest;
  let random;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => makeCanvasContext());
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  async function mount(initial) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: { tutorialDismissed: true, studioHome: false, ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  function canvasFor(testCase) {
    const canvas = host.querySelector(testCase.selector);
    expect(canvas, `${testCase.label} canvas should render`).not.toBeNull();
    canvas.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: canvas.width,
      bottom: canvas.height,
      width: canvas.width,
      height: canvas.height,
      x: 0,
      y: 0,
      toJSON() {},
    });
    return canvas;
  }

  it.each(touchCases)('$label defaults fingers to page scrolling without consuming or starting input', async (testCase) => {
    await mount(testCase.initial);
    const canvas = canvasFor(testCase);
    const group = host.querySelector(`[role="group"][aria-label="${testCase.groupLabel}"]`);
    const scrollButton = Array.from(group.querySelectorAll('button')).find((button) => button.textContent === 'Scroll page');
    const activeButton = Array.from(group.querySelectorAll('button')).find((button) => button.textContent === testCase.activeLabel);
    random.mockClear();

    const event = pointerEvent('pointerdown', 'touch');
    canvas.dispatchEvent(event);
    const moveEvent = pointerEvent('pointermove', 'touch', 130, 150);
    canvas.dispatchEvent(moveEvent);

    expect(canvas.dataset.touchMode).toBe('scroll');
    expect(canvas.style.touchAction).toBe('pan-y');
    expect(scrollButton.getAttribute('aria-pressed')).toBe('true');
    expect(activeButton.getAttribute('aria-pressed')).toBe('false');
    expect(event.defaultPrevented).toBe(false);
    expect(moveEvent.defaultPrevented).toBe(false);
    expect(testCase.interactionStarted(canvas, random)).toBe(false);
  });

  it.each(touchCases)('$label consumes fingers only after its explicit drawing or interaction control is chosen', async (testCase) => {
    await mount(testCase.initial);
    let group = host.querySelector(`[role="group"][aria-label="${testCase.groupLabel}"]`);
    const activeButton = Array.from(group.querySelectorAll('button')).find((button) => button.textContent === testCase.activeLabel);

    await act(async () => {
      activeButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const canvas = canvasFor(testCase);
    group = host.querySelector(`[role="group"][aria-label="${testCase.groupLabel}"]`);
    random.mockClear();
    const event = pointerEvent('pointerdown', 'touch');
    canvas.dispatchEvent(event);
    const moveEvent = pointerEvent('pointermove', 'touch', 130, 150);
    canvas.dispatchEvent(moveEvent);

    expect(latest.artStudio[testCase.stateKey]).toBe(testCase.activeMode);
    expect(canvas.dataset.touchMode).toBe('draw');
    expect(canvas.style.touchAction).toBe('none');
    expect(event.defaultPrevented).toBe(true);
    expect(moveEvent.defaultPrevented).toBe(true);
    expect(testCase.interactionStarted(canvas, random)).toBe(true);
  });

  it.each(touchCases)('$label keeps a stylus usable while finger input remains in scroll mode', async (testCase) => {
    await mount(testCase.initial);
    const canvas = canvasFor(testCase);
    random.mockClear();

    const event = pointerEvent('pointerdown', 'pen');
    canvas.dispatchEvent(event);

    expect(canvas.dataset.touchMode).toBe('scroll');
    expect(canvas.style.touchAction).toBe('pan-y');
    expect(testCase.interactionStarted(canvas, random)).toBe(true);
  });

  it('keeps Pixel Art dragging active across React updates and paints later cells in the same gesture', async () => {
    await mount({
      tab: 'pixel',
      pixelGrid: 16,
      pixelTool: 'brush',
      pixelData: {},
      pixelTouchMode: 'draw',
    });
    let canvas = canvasFor(touchCases[0]);

    await act(async () => {
      canvas.dispatchEvent(pointerEvent('pointerdown', 'touch', 10, 10));
      await Promise.resolve();
    });
    canvas = canvasFor(touchCases[0]);
    expect(canvas._pixelDrawing).toBe(true);

    await act(async () => {
      canvas.dispatchEvent(pointerEvent('pointermove', 'touch', 110, 10));
      await Promise.resolve();
    });

    expect(latest.artStudio.pixelData).toHaveProperty('0,0');
    expect(latest.artStudio.pixelData).toHaveProperty('3,0');
    expect(canvas._pixelDrawing).toBe(true);

    canvas.dispatchEvent(pointerEvent('pointerup', 'touch', 110, 10));
    expect(canvas._pixelDrawing).toBe(false);
  });
});
