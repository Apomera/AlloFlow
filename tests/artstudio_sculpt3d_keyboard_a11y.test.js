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
const originalFileReader = window.FileReader;
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
      stretch: [1, 1, 1],
      deform: { taper: 0, twist: 0, bulge: 0 },
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      ...part,
      size: (part.size || [0.4, 0.4, 0.4]).slice(),
      stretch: (part.stretch || [1, 1, 1]).slice(),
      deform: { taper: 0, twist: 0, bulge: 0, ...(part.deform || {}) },
      position: (part.position || [0, 0.5, 0]).slice(),
      rotation: (part.rotation || [0, 0, 0]).slice(),
    })),
  } : null;
  const updatePart = (recipe, index, patch) => {
    const next = normalizeRecipe(recipe);
    next.parts = next.parts.map((part, partIndex) => partIndex === index ? { ...part, ...patch } : part);
    return next;
  };
  const MORPH_PROFILES = [
    { id: 'original', label: 'Original', stretch: [1, 1, 1], deform: { taper: 0, twist: 0, bulge: 0 } },
    { id: 'twisted', label: 'Twisted', stretch: [1, 1.2, 1], deform: { taper: 0.15, twist: 110, bulge: 0.2 } },
  ];
  const normalizeMorphProfile = (profile) => profile ? {
    id: String(profile.id || ''),
    label: String(profile.label || profile.name || 'Custom form'),
    stretch: (profile.stretch || [1, 1, 1]).slice(),
    deform: { taper: 0, twist: 0, bulge: 0, ...(profile.deform || {}) },
  } : null;
  return {
    PRESETS: [{ id: 'robot', label: 'Robot', emoji: '🤖' }],
    SHAPES: ['box'],
    MORPH_PROFILES,
    normalizeRecipe,
    normalizeMorphProfile,
    getPreset: () => normalizeRecipe({ name: 'Robot', parts: [{ shape: 'box', color: '#ff0000' }] }),
    buildObject: () => ({ traverse: () => {} }),
    newPart: (shape) => ({ shape, size: [0.4, 0.4, 0.4], stretch: [1, 1, 1], deform: { taper: 0, twist: 0, bulge: 0 }, position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#ff0000' }),
    addPart: (recipe, shape) => normalizeRecipe({ name: 'Custom', parts: [...(recipe?.parts || []), { shape, color: '#ff0000' }] }),
    updatePart,
    updatePartDeform: (recipe, index, patch) => {
      const next = normalizeRecipe(recipe);
      if (next.parts[index].locked) return next;
      return updatePart(next, index, { deform: { ...next.parts[index].deform, ...patch } });
    },
    applyMorphProfile: (recipe, index, profile) => {
      const next = normalizeRecipe(recipe);
      if (next.parts[index].locked) return next;
      const clean = normalizeMorphProfile(typeof profile === 'string' ? MORPH_PROFILES.find((item) => item.id === profile) : profile);
      return updatePart(next, index, { stretch: clean.stretch.slice(), deform: { ...clean.deform } });
    },
    duplicatePart: (recipe, index) => {
      const next = normalizeRecipe(recipe);
      const source = next.parts[index];
      next.parts.splice(index + 1, 0, {
        ...source,
        size: source.size.slice(),
        stretch: source.stretch.slice(),
        deform: { ...source.deform },
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
    Object.defineProperty(window, 'FileReader', {
      configurable: true,
      writable: true,
      value: originalFileReader,
    });
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
    expect(html).toContain('aria-describedby="artstudio-sculpt-touch-help artstudio-sculpt-keyboard-help"');
    expect(html).toContain('Alt+ArrowUp');
    expect(html).toContain('PageUp PageDown');
    expect(html).toContain('Move sculpture parts');
    expect(html).toContain('Rotate sculpture parts');
    expect(html).toContain('Scale sculpture parts');
    expect(html).toContain('Transform axis constraint');
    expect(html).toContain('Transform freely');
    expect(html).toContain('Constrain transforms to X axis');
    expect(html).toContain('Position snapping');
    expect(html).toContain('Snap positions to 0.25 units');
    expect(html).toContain('Mirror copy axis');
    expect(html).toContain('Mirror across Y axis');
    expect(html).toContain('Mirror copy on X axis');
    expect(html).toContain('Fine-tune selected part');
    expect(html).toContain('Selected part visibility and locking');
    expect(html).toContain('Hide selected part');
    expect(html).toContain('Lock selected part transforms');
    expect(html).toContain('Selected part name');
    expect(html).toContain('Selected part surface finish');
    expect(html).toContain('Gloss selected part finish');
    expect(html).toContain('Metal selected part finish');
    expect(html).toContain('Wire selected part finish');
    expect(html).toContain('Selected part opacity');
    expect(html).toContain('Stretch / morph');
    expect(html).toContain('Morph selected part on X axis');
    expect(html).toContain('Reset selected part stretch');
    expect(html).toContain('Morph selected form');
    expect(html).toContain('Apply Twisted form profile');
    expect(html).toContain('Save selected form as reusable profile');
    expect(html).toContain('Shape deformation');
    expect(html).toContain('Taper selected part form');
    expect(html).toContain('Twist selected part form');
    expect(html).toContain('Bulge selected part form');
    expect(html).toContain('Reset selected part deformation');
    expect(html).toContain('Start from or morph a preset');
    expect(html).toContain('role="group" aria-label="3D preview actions"');
    expect(html).toContain('aria-label="Pause 3D preview rotation" aria-pressed="false"');
    expect(html).toContain('aria-label="Export sculpture JSON model"');
    expect(html).toContain('aria-label="Import sculpture JSON model"');
    expect(html).toContain('focus-within:ring-4');
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
    // Pointer movement is camera-relative (screen-right follows the orbit),
    // and auto-rotation drifts the view under jsdom, so pin the view angle.
    canvas._p3d.yaw = 0;

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
    // Pointer movement is camera-relative (screen-right follows the orbit),
    // and auto-rotation drifts the view under jsdom, so pin the view angle.
    canvas._p3d.yaw = 0;
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

  it('names, styles, hides, and locks a part while protecting its transforms', async () => {
    await mount({
      sculptInteractMode: 'move',
      sculptRecipe: { name: 'Custom', parts: [{ shape: 'box', color: '#ff0000', position: [0, 0.5, 0] }] },
    });
    let nameInput = host.querySelector('input[aria-label="Selected part name"]');
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    await act(async () => {
      nativeValueSetter.call(nameInput, 'Main body');
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].label).toBe('Main body');
    expect(host.querySelector('button[aria-label^="Part 1:"]').getAttribute('aria-label')).toContain('Main body');

    const gloss = host.querySelector('button[aria-label="Gloss selected part finish"]');
    await act(async () => {
      gloss.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].finish).toBe('gloss');

    const opacity = host.querySelector('input[aria-label="Selected part opacity"]');
    await act(async () => {
      nativeValueSetter.call(opacity, '40');
      opacity.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].opacity).toBe(0.4);

    const hide = host.querySelector('button[aria-label="Hide selected part"]');
    await act(async () => {
      hide.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].hidden).toBe(true);
    expect(host.querySelector('canvas').getAttribute('aria-label')).toContain('0 visible');

    const show = host.querySelector('button[aria-label="Show selected part"]');
    await act(async () => {
      show.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    const lock = host.querySelector('button[aria-label="Lock selected part transforms"]');
    await act(async () => {
      lock.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].locked).toBe(true);
    expect(host.querySelector('button[aria-label="Right"]').disabled).toBe(true);

    const canvas = host.querySelector('canvas');
    const positionBefore = latest.artStudio.sculptRecipe.parts[0].position.slice();
    await act(async () => {
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].position).toEqual(positionBefore);
    expect(announce).toHaveBeenCalledWith('Part 1 is locked. Use its part controls before transforming it.');
    expect(host.querySelector('button[aria-label="Apply Twisted form profile"]').disabled).toBe(true);
  });

  it('applies, fine-tunes, saves, and reuses a custom parametric form with coalesced undo', async () => {
    await mount({
      sculptRecipe: { name: 'Custom', parts: [{ shape: 'box', color: '#ff0000' }] },
    });
    const nativeValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const twisted = host.querySelector('button[aria-label="Apply Twisted form profile"]');
    await act(async () => {
      twisted.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].stretch).toEqual([1, 1.2, 1]);
    expect(latest.artStudio.sculptRecipe.parts[0].deform).toEqual({ taper: 0.15, twist: 110, bulge: 0.2 });
    expect(latest.artStudio.sculptUndo).toHaveLength(1);
    expect(announce).toHaveBeenCalledWith('Applied Twisted form profile to part 1.');

    const twist = host.querySelector('input[aria-label="Twist selected part form"]');
    await act(async () => {
      twist.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      nativeValueSetter.call(twist, '60');
      twist.dispatchEvent(new Event('input', { bubbles: true }));
      nativeValueSetter.call(twist, '80');
      twist.dispatchEvent(new Event('input', { bubbles: true }));
      twist.dispatchEvent(new Event('pointerup', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].deform.twist).toBe(80);
    expect(latest.artStudio.sculptUndo).toHaveLength(2);

    const profileName = host.querySelector('input[aria-label="Name for reusable form profile"]');
    await act(async () => {
      nativeValueSetter.call(profileName, 'Vase body');
      profileName.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    const save = host.querySelector('button[aria-label="Save selected form as reusable profile"]');
    await act(async () => {
      save.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptFormProfiles).toHaveLength(1);
    expect(latest.artStudio.sculptFormProfiles[0]).toMatchObject({ label: 'Vase body', deform: { twist: 80 } });
    expect(announce).toHaveBeenCalledWith('Saved reusable form profile Vase body.');

    const reset = host.querySelector('button[aria-label="Reset selected part deformation"]');
    await act(async () => {
      reset.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].deform).toEqual({ taper: 0, twist: 0, bulge: 0 });
    const applySaved = host.querySelector('button[aria-label="Apply saved Vase body form profile"]');
    await act(async () => {
      applySaved.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].deform.twist).toBe(80);
  });

  it('imports an editable model, preserves undo history, and exports it again', async () => {
    await mount({
      sculptRecipe: { name: 'Old form', parts: [{ shape: 'box', color: '#ff0000' }] },
    });
    class FakeFileReader {
      readAsText(file) {
        this.result = file.contents;
        this.onload();
      }
    }
    Object.defineProperty(window, 'FileReader', { configurable: true, writable: true, value: FakeFileReader });
    const input = host.querySelector('input[aria-label="Import sculpture JSON model"]');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [{ size: 256, contents: JSON.stringify({ name: 'Loaded form', parts: [{ shape: 'box', color: '#22c55e', stretch: [1.5, 0.75, 2], deform: { taper: 0.25, twist: 35, bulge: 0.6 } }] }) }],
    });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.name).toBe('Loaded form');
    expect(latest.artStudio.sculptRecipe.parts[0].stretch).toEqual([1.5, 0.75, 2]);
    expect(latest.artStudio.sculptRecipe.parts[0].deform).toEqual({ taper: 0.25, twist: 35, bulge: 0.6 });
    expect(latest.artStudio.sculptUndo.at(-1).name).toBe('Old form');
    expect(announce).toHaveBeenCalledWith('Imported Loaded form with 1 part.');

    let downloadName = '';
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloadName = this.download; });
    const exportModel = host.querySelector('button[aria-label="Export sculpture JSON model"]');
    await act(async () => {
      exportModel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(downloadName).toBe('loaded-form.sculpture.json');
    expect(announce).toHaveBeenCalledWith('Editable sculpture model exported as JSON.');
  });

  it('rejects oversized sculpture model files without replacing the current form', async () => {
    await mount({
      sculptRecipe: { name: 'Keep me', parts: [{ shape: 'box', color: '#ff0000' }] },
    });
    const input = host.querySelector('input[aria-label="Import sculpture JSON model"]');
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [{ size: 1024 * 1024 + 1, contents: '{}' }],
    });

    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.name).toBe('Keep me');
    expect(announce).toHaveBeenCalledWith('That sculpture file is over the 1 MB import limit.');
  });

  it('keeps source and active public mirrors identical', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
