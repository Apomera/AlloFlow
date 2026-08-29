import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_artstudio.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_artstudio.js');
const originalMatchMedia = window.matchMedia;
const originalThree = window.THREE;
const originalAlloModules = window.AlloModules;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

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
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      ...part,
    })),
  } : null;
  const updatePart = (recipe, index, patch) => {
    const next = normalizeRecipe(recipe);
    next.parts = next.parts.map((part, partIndex) => partIndex === index ? { ...part, ...patch } : part);
    return next;
  };
  return {
    PRESETS: [{ id: 'robot', label: 'Robot', emoji: '🤖' }],
    SHAPES: ['box'],
    normalizeRecipe,
    getPreset: () => normalizeRecipe({ name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] }),
    buildObject: () => ({ traverse: () => {} }),
    newPart: (shape) => ({ shape, size: [0.4, 0.4, 0.4], position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#ff0000' }),
    addPart: (recipe, shape) => normalizeRecipe({ name: 'Custom', parts: [...(recipe?.parts || []), { shape, color: '#ff0000' }] }),
    updatePart,
    duplicatePart: (recipe, index) => {
      const next = normalizeRecipe(recipe);
      const source = next.parts[index];
      next.parts.splice(index + 1, 0, {
        ...source,
        size: source.size.slice(),
        position: source.position.slice(),
        rotation: source.rotation.slice(),
      });
      return next;
    },
    nudgePart: (recipe, index, field, axis, delta) => {
      const next = normalizeRecipe(recipe);
      const values = next.parts[index][field].slice();
      values[axis] += delta;
      return updatePart(next, index, { [field]: values });
    },
  };
}

describe('Art Studio Sculpt 3D accessibility', () => {
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
        artStudio: { tab: 'sculpt3d', ...initial },
      });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('renders a named preview, keyboard help, shortcuts, grouped actions, and named icon controls', () => {
    resetStemLab();
    window.THREE = makeThree();
    window.AlloModules = { ...(originalAlloModules || {}), Prim3D: makePrim3D() };
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const html = renderTool('artStudio', {
      artStudio: {
        tab: 'sculpt3d',
        sculptSnap: 0.25,
        sculptRecipe: { name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] },
      },
    }, { callGemini: vi.fn() });

    expect(html).toContain('3D sculpture preview. Robot with 1 part. Auto-rotation running.');
    expect(html).toContain('aria-describedby="artstudio-sculpt-keyboard-help"');
    expect(html).toContain('Alt+ArrowUp');
    expect(html).toContain('PageUp PageDown');
    expect(html).toContain('Move sculpture parts');
    expect(html).toContain('Rotate sculpture parts');
    expect(html).toContain('Scale sculpture parts');
    expect(html).toContain('Position snapping');
    expect(html).toContain('Snap positions to 0.25 units');
    expect(html).toContain('Mirror copy axis');
    expect(html).toContain('Mirror across Y axis');
    expect(html).toContain('Mirror copy on X axis');
    expect(html).toContain('Fine-tune selected part');
    expect(html).toContain('Start from or morph a preset');
    expect(html).toContain('role="group" aria-label="3D preview actions"');
    expect(html).toContain('aria-label="Pause 3D preview rotation" aria-pressed="false"');
    expect(html).toContain('aria-label="Refine sculpture with AI"');
    expect(html).toContain('aria-label="Save sculpture to gallery"');
    expect(html).toContain('role="group" aria-labelledby="artstudio-sculpt-add-label"');
    expect(html).toContain('focus-visible:ring-4');
  });

  it('starts paused for reduced motion and allows an explicit user resume', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => ({ matches: true })),
    });
    await mount();
    const canvas = host.querySelector('canvas');
    expect(canvas.dataset.auto).toBe('0');
    expect(canvas._p3d.auto).toBe(false);

    const resume = host.querySelector('button[aria-label="Resume 3D preview rotation"]');
    await act(async () => {
      resume.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(latest.artStudio.sculptAuto).toBe(true);
    expect(canvas.dataset.auto).toBe('1');
    expect(canvas._p3d.auto).toBe(true);
    expect(announce).toHaveBeenCalledWith('Sculpture auto-rotation resumed.');
  });

  it('orbits and resets the preview from the keyboard while announcing the view', async () => {
    await mount();
    const canvas = host.querySelector('canvas');
    const initialYaw = canvas._p3d.yaw;
    canvas.focus();

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(canvas._p3d.yaw).toBeGreaterThan(initialYaw);
    expect(canvas._p3d.auto).toBe(false);
    expect(latest.artStudio.sculptAuto).toBe(false);
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Sculpture view moved; auto-rotation paused\. View angle/));
    expect(canvas.getAttribute('aria-label')).toMatch(/View angle \d+ degrees, elevation \d+ degrees\. Auto-rotation paused\./);

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(canvas._p3d.yaw).toBe(0.7);
    expect(canvas._p3d.pitch).toBe(0.5);
    expect(announce).toHaveBeenCalledWith(expect.stringMatching(/^Sculpture view reset; auto-rotation paused\./));
  });

  it('moves a selected part by drag or keyboard and can undo the edit', async () => {
    await mount({
      sculptInteractMode: 'move',
      sculptRecipe: { name: 'Custom', parts: [{ shape: 'box', color: '#ff0000', position: [0, 0.5, 0] }] },
    });
    const canvas = host.querySelector('canvas');

    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 75, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 150, clientY: 75, bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].position[0]).toBeGreaterThan(0);
    expect(latest.artStudio.sculptRecipe.parts[0].position[1]).toBeGreaterThan(0.5);

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].position[2]).toBeGreaterThan(0);

    const undo = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Undo sculpture change');
    await act(async () => {
      undo.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(announce).toHaveBeenCalledWith('Undid the last sculpture change.');
  });

  it('snaps drag and keyboard movement and creates a reflected copy', async () => {
    await mount({
      sculptInteractMode: 'move',
      sculptSnap: 0.25,
      sculptRecipe: {
        name: 'Custom',
        parts: [{ shape: 'box', color: '#ff0000', position: [0, 0.5, 0], rotation: [10, 20, 30] }],
      },
    });
    const canvas = host.querySelector('canvas');
    expect(canvas.dataset.snap).toBe('0.25');

    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 75, bubbles: true }));
      canvas.dispatchEvent(new MouseEvent('pointerup', { clientX: 150, clientY: 75, bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].position).toEqual([0.25, 0.75, 0]);

    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].position).toEqual([0.25, 0.75, 0.25]);

    const mirrorY = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Mirror across Y axis');
    await act(async () => {
      mirrorY.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    const mirror = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Mirror copy on Y axis');
    await act(async () => {
      mirror.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts).toHaveLength(2);
    expect(latest.artStudio.sculptRecipe.parts[1].position).toEqual([0.25, -0.75, 0.25]);
    expect(latest.artStudio.sculptRecipe.parts[1].rotation).toEqual([-10, 20, -30]);
    expect(latest.artStudio.sculptSel).toBe(1);
    expect(announce).toHaveBeenCalledWith('Created a mirrored copy of part 1 on the Y axis.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
