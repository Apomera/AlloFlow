import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const originalMatchMedia = window.matchMedia;
const originalThree = window.THREE;
const originalAlloModules = window.AlloModules;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function makeThree() {
  class Scene {
    add() {}
    remove() {}
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
      shape: 'box',
      color: '#ff0000',
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
  const updatePart = (recipe, index, patch) => {
    const next = normalizeRecipe(recipe);
    next.parts = next.parts.map((part, partIndex) => partIndex === index ? { ...part, ...patch } : part);
    return next;
  };
  return {
    PRESETS: [],
    SHAPES: ['box'],
    normalizeRecipe,
    buildObject: () => ({ traverse: () => {} }),
    newPart: () => ({ shape: 'box', color: '#ff0000', size: [0.4, 0.4, 0.4], stretch: [1, 1, 1], position: [0, 0.5, 0], rotation: [0, 0, 0] }),
    updatePart,
  };
}

describe('Art Studio Sculpture direct transform modes', () => {
  let host;
  let root;
  let config;
  let announce;
  let latest;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: false })),
    });
    window.THREE = makeThree();
    window.AlloModules = { ...(originalAlloModules || {}), Prim3D: makePrim3D() };
    config = loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    announce = vi.fn();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
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

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        artStudio: {
          tab: 'sculpt3d',
          sculptInteractMode: 'rotate',
          sculptRecipe: {
            name: 'Custom',
            parts: [{ shape: 'box', color: '#ff0000', size: [0.4, 0.4, 0.4], rotation: [0, 0, 0] }],
          },
          ...initial,
        },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('rotates and scales a selected part by pointer and keyboard', async () => {
    await mount();
    let canvas = host.querySelector('canvas');

    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 75, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 150, clientY: 75, bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].rotation).toEqual([12.5, 25, 0]);
    expect(announce).toHaveBeenCalledWith('Rotated part 1.');

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].rotation).toEqual([12.5, 25, 15]);

    const scaleMode = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Scale sculpture parts');
    await act(async () => {
      scaleMode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('canvas');
    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 50, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 100, clientY: 50, bubbles: true }));
      await Promise.resolve();
    });
    const dragStretch = latest.artStudio.sculptRecipe.parts[0].stretch.slice();
    expect(dragStretch.every((value) => value > 1)).toBe(true);
    expect(announce).toHaveBeenCalledWith('Scaled part 1.');

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].stretch[0]).toBeGreaterThan(dragStretch[0]);
    expect(announce).toHaveBeenCalledWith('Scaled part 1 larger.');
  });

  it('locks pointer and keyboard transforms to a chosen axis', async () => {
    await mount({ sculptTransformAxis: 'z' });
    let canvas = host.querySelector('canvas');

    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 75, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 150, clientY: 75, bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].rotation).toEqual([0, 0, 37.5]);
    expect(canvas.dataset.axis).toBe('z');

    const scaleMode = host.querySelector('button[aria-label="Scale sculpture parts"]');
    await act(async () => {
      scaleMode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    const constrainX = host.querySelector('button[aria-label="Constrain transforms to X axis"]');
    await act(async () => {
      constrainX.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    canvas = host.querySelector('canvas');
    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 100, clientY: 50, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 100, clientY: 50, bubbles: true }));
      await Promise.resolve();
    });
    const pointerStretch = latest.artStudio.sculptRecipe.parts[0].stretch.slice();
    expect(pointerStretch[0]).toBeGreaterThan(1);
    expect(pointerStretch.slice(1)).toEqual([1, 1]);

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].stretch[0]).toBeGreaterThan(pointerStretch[0]);
    expect(latest.artStudio.sculptRecipe.parts[0].stretch.slice(1)).toEqual([1, 1]);
    expect(announce).toHaveBeenCalledWith('Scaled part 1 larger on the X axis.');
  });

  it('ignores right-click transforms and finalizes a drag when pointer capture is lost', async () => {
    await mount({ sculptInteractMode: 'move' });
    const canvas = host.querySelector('canvas');
    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 2, clientX: 100, clientY: 100 }));
      await Promise.resolve();
    });
    expect(canvas._p3d.drag).toBeFalsy();

    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100 }));
      await Promise.resolve();
    });
    expect(canvas._p3d.drag).toBeTruthy();
    await act(async () => {
      canvas.dispatchEvent(new Event('lostpointercapture'));
      await Promise.resolve();
    });
    expect(canvas._p3d.drag).toBe(null);
  });
});
