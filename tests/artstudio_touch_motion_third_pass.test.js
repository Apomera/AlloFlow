import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const originalMatchMedia = window.matchMedia;
const originalThree = window.THREE;
const originalAlloModules = window.AlloModules;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function installMutableMatchMedia(initialReducedMotion = false) {
  const records = new Map();
  const ensureRecord = (query) => {
    if (records.has(query)) return records.get(query);
    const changeListeners = new Set();
    const legacyListeners = new Set();
    const mql = {
      matches: query === MOTION_QUERY ? initialReducedMotion : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn((type, listener) => {
        if (type === 'change') changeListeners.add(listener);
      }),
      removeEventListener: vi.fn((type, listener) => {
        if (type === 'change') changeListeners.delete(listener);
      }),
      addListener: vi.fn((listener) => legacyListeners.add(listener)),
      removeListener: vi.fn((listener) => legacyListeners.delete(listener)),
      dispatchEvent: vi.fn((event) => {
        changeListeners.forEach((listener) => listener(event));
        legacyListeners.forEach((listener) => listener(event));
        if (typeof mql.onchange === 'function') mql.onchange(event);
        return true;
      }),
    };
    records.set(query, mql);
    return mql;
  };

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query) => ensureRecord(query)),
  });

  return {
    get: ensureRecord,
    setMatches(query, matches) {
      const mql = ensureRecord(query);
      if (mql.matches === matches) return;
      mql.matches = matches;
      mql.dispatchEvent({ matches, media: query });
    },
  };
}

function makeCanvasContext(width = 512, height = 512) {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    createImageData: vi.fn((w, h) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height,
    })),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    putImageData: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
  };
}

function makeThree() {
  class Scene {
    constructor() {
      this.children = [];
    }
    add(item) {
      this.children.push(item);
    }
    remove(item) {
      this.children = this.children.filter((entry) => entry !== item);
    }
    traverse() {}
  }
  class PerspectiveCamera {
    constructor() {
      this.position = { set: vi.fn() };
      this.lookAt = vi.fn();
    }
  }
  class WebGLRenderer {
    constructor() {
      this.setSize = vi.fn();
      this.render = vi.fn();
      this.dispose = vi.fn();
      this.forceContextLoss = vi.fn();
    }
  }
  class DirectionalLight {
    constructor() {
      this.position = { set: vi.fn() };
    }
  }
  return {
    Scene,
    Color: class Color {},
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight: class AmbientLight {},
    DirectionalLight,
    GridHelper: class GridHelper {},
  };
}

function makePrim3D() {
  const normalizeRecipe = (recipe) => recipe ? {
    ...recipe,
    parts: (recipe.parts || []).map((part) => ({
      size: [0.4, 0.4, 0.4],
      stretch: [1, 1, 1],
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      ...part,
      size: (part.size || [0.4, 0.4, 0.4]).slice(),
      stretch: (part.stretch || [1, 1, 1]).slice(),
      position: (part.position || [0, 0.5, 0]).slice(),
      rotation: (part.rotation || [0, 0, 0]).slice(),
    })),
  } : null;
  return {
    PRESETS: [{ id: 'robot', label: 'Robot', emoji: '🤖' }],
    SHAPES: ['box'],
    normalizeRecipe,
    getPreset: () => normalizeRecipe({ name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] }),
    buildObject: () => ({ traverse: () => {} }),
    newPart: (shape) => ({
      shape,
      size: [0.4, 0.4, 0.4],
      stretch: [1, 1, 1],
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      color: '#ff0000',
    }),
    addPart: (recipe, shape) => normalizeRecipe({
      name: 'Custom',
      parts: [...(recipe?.parts || []), { shape, color: '#ff0000' }],
    }),
    updatePart: (recipe, index, patch) => {
      const next = normalizeRecipe(recipe);
      next.parts = next.parts.map((part, partIndex) => partIndex === index ? { ...part, ...patch } : part);
      return next;
    },
  };
}

const paintMethods = ['arc', 'fill', 'lineTo', 'stroke'];

function clearPaintCalls(context) {
  paintMethods.forEach((method) => context[method].mockClear());
}

function paintCallCount(context) {
  return paintMethods.reduce((total, method) => total + context[method].mock.calls.length, 0);
}

function pointerEvent(type, pointerType) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: 120,
    clientY: 140,
  });
  Object.defineProperties(event, {
    pointerType: { configurable: true, value: pointerType },
    pointerId: { configurable: true, value: 7 },
    isPrimary: { configurable: true, value: true },
    pressure: { configurable: true, value: pointerType === 'pen' ? 0.6 : 0.5 },
  });
  return event;
}

function touchEvent(type) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', {
    configurable: true,
    value: type === 'touchend' ? [] : [{ clientX: 120, clientY: 140 }],
  });
  return event;
}

function interactionStarted(canvas, context) {
  return paintCallCount(context) > 0 || !!canvas._symDrawing || !!(canvas._p3d && canvas._p3d.drag);
}

function startTouchInteraction(canvas, context) {
  const pointer = pointerEvent('pointerdown', 'touch');
  canvas.dispatchEvent(pointer);
  if (pointer.defaultPrevented || interactionStarted(canvas, context) || typeof canvas.ontouchstart !== 'function') {
    return pointer;
  }
  const touch = touchEvent('touchstart');
  canvas.dispatchEvent(touch);
  return touch;
}

function startPenInteraction(canvas, context) {
  const pointer = pointerEvent('pointerdown', 'pen');
  canvas.dispatchEvent(pointer);
  if (pointer.defaultPrevented || interactionStarted(canvas, context) || typeof canvas.onmousedown !== 'function') {
    return pointer;
  }
  const mouse = pointerEvent('mousedown', 'pen');
  canvas.dispatchEvent(mouse);
  return mouse;
}

const touchCases = [
  {
    label: 'Symmetry',
    selector: '#symmetryCanvas',
    stateKey: 'symmetryTouchMode',
    activeMode: 'draw',
    initial: {
      tab: 'symmetry',
      symmetryFolds: 6,
      symBrushMode: 'solid',
      symStrokeMode: 'dots',
    },
  },
  {
    label: 'Sculpt 3D',
    selector: '#sculptCanvas',
    stateKey: 'sculptTouchMode',
    activeMode: 'interact',
    initial: {
      tab: 'sculpt3d',
      sculptRecipe: { name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] },
    },
  },
  {
    label: 'Static depth map',
    selector: '#depthMapCanvas',
    stateKey: 'stereoDepthTouchMode',
    activeMode: 'draw',
    initial: {
      tab: 'stereogram',
      stereoAnimMode: 'static',
      stereoDepth: 'near',
      stereoPattern: 'bw',
    },
  },
  {
    label: 'Animated depth map',
    selector: '#stereoAnimDrawCanvas',
    stateKey: 'stereoAnimDepthTouchMode',
    activeMode: 'draw',
    initial: {
      tab: 'stereogram',
      stereoAnimMode: 'animate',
      stereoAnimSource: 'draw',
      stereoAnimDrawBrush: 'near',
    },
  },
];

describe('Art Studio third-pass touch and motion behavior', () => {
  let host;
  let root;
  let config;
  let context;
  let media;
  let latest;

  beforeEach(() => {
    resetStemLab();
    media = installMutableMatchMedia(false);
    window.THREE = makeThree();
    window.AlloModules = { ...(originalAlloModules || {}), Prim3D: makePrim3D() };
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    context = makeCanvasContext();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => context);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
    window.THREE = originalThree;
    window.AlloModules = originalAlloModules;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  async function mount(initial) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: initial });
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

  it.each(touchCases)('$label defaults to page scrolling and leaves touch input unconsumed', async (testCase) => {
    await mount(testCase.initial);
    const canvas = canvasFor(testCase);
    clearPaintCalls(context);

    const event = startTouchInteraction(canvas, context);

    expect(canvas.style.touchAction).toBe('pan-y');
    expect(event.defaultPrevented).toBe(false);
    expect(interactionStarted(canvas, context)).toBe(false);
  });

  it.each(touchCases)('$label consumes touch only after its explicit draw/interact mode is enabled', async (testCase) => {
    await mount({ ...testCase.initial, [testCase.stateKey]: testCase.activeMode });
    const canvas = canvasFor(testCase);
    clearPaintCalls(context);

    const event = startTouchInteraction(canvas, context);

    expect(canvas.style.touchAction).toBe('none');
    expect(event.defaultPrevented).toBe(true);
    expect(interactionStarted(canvas, context)).toBe(true);
  });

  it.each(touchCases)('$label keeps pen input usable while finger input is in scroll mode', async (testCase) => {
    await mount(testCase.initial);
    const canvas = canvasFor(testCase);
    clearPaintCalls(context);

    startPenInteraction(canvas, context);

    expect(canvas.style.touchAction).toBe('pan-y');
    expect(interactionStarted(canvas, context)).toBe(true);
  });

  it('pauses every persisted motion source when the operating-system preference changes to reduce', async () => {
    await mount({
      tab: 'artistExplorer',
      sculptAuto: true,
      genPaused: false,
      spinPaused: false,
      opPaused: false,
      stereoAnimPlaying: true,
    });
    const motionMedia = media.get(MOTION_QUERY);

    expect(motionMedia.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(latest.artStudio).toMatchObject({
      sculptAuto: true,
      genPaused: false,
      spinPaused: false,
      opPaused: false,
      stereoAnimPlaying: true,
    });

    await act(async () => {
      media.setMatches(MOTION_QUERY, true);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest.artStudio).toMatchObject({
      sculptAuto: false,
      genPaused: true,
      spinPaused: true,
      opPaused: true,
      stereoAnimPlaying: false,
    });
  });
});
