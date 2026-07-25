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
  return {
    PRESETS: [{ id: 'robot', label: 'Robot', emoji: '🤖' }],
    SHAPES: ['box'],
    normalizeRecipe: (recipe) => recipe,
    getPreset: () => ({ name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] }),
    buildObject: () => ({ traverse: () => {} }),
    addPart: (_recipe, shape) => ({ name: 'Custom', parts: [{ shape, color: '#ff0000' }] }),
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
        sculptRecipe: { name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] },
      },
    }, { callGemini: vi.fn() });

    expect(html).toContain('3D sculpture preview. Robot with 1 part. Auto-rotation running.');
    expect(html).toContain('aria-describedby="artstudio-sculpt-keyboard-help"');
    expect(html).toContain('Alt+ArrowUp');
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

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
