// Sculpt 3D "draw your own shape" pad: lathe and extrude parts carry a 2-D
// profile that Prim3D turns into a solid. This pins the accessible editing
// path (point select, X/Y sliders, add/remove/reset) and that ordinary
// primitives never show the pad. Prim3D is mocked the same way the other
// sculpt tests mock it; the real profile rules live in tests/prim3d.test.js.
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
  class Scene { constructor() { this.children = []; } add(item) { this.children.push(item); } remove(item) { this.children = this.children.filter((e) => e !== item); } traverse() {} }
  class PerspectiveCamera { constructor() { this.position = { set: vi.fn() }; this.lookAt = vi.fn(); } }
  class WebGLRenderer { constructor() { this.setSize = vi.fn(); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); } }
  class DirectionalLight { constructor() { this.position = { set: vi.fn() }; } }
  return { Scene, Color: class Color {}, PerspectiveCamera, WebGLRenderer, AmbientLight: class AmbientLight {}, DirectionalLight, GridHelper: class GridHelper {} };
}

const DEFAULT_LATHE = [[0.42, 0], [0.7, 0.08], [0.82, 0.24], [0.62, 0.48], [0.5, 0.66], [0.66, 0.84], [0.56, 1]];

function makePrim3D() {
  const normalizeProfile = (shape, raw) => {
    const out = (Array.isArray(raw) ? raw : []).filter((pt) => Array.isArray(pt) && typeof pt[0] === 'number' && typeof pt[1] === 'number')
      .map((pt) => shape === 'lathe' ? [Math.max(0.02, Math.min(1, pt[0])), Math.max(0, Math.min(1, pt[1]))] : [Math.max(-1, Math.min(1, pt[0])), Math.max(-1, Math.min(1, pt[1]))]);
    return out.length >= 3 ? out : DEFAULT_LATHE.map((p) => p.slice());
  };
  const normalizeRecipe = (recipe) => recipe ? {
    ...recipe,
    parts: (recipe.parts || []).map((part) => ({
      size: [0.4, 0.4, 0.4], stretch: [1, 1, 1], deform: { taper: 0, twist: 0, bulge: 0 }, position: [0, 0.5, 0], rotation: [0, 0, 0],
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
    next.parts = next.parts.map((part, i) => i === index ? { ...part, ...patch } : part);
    return next;
  };
  return {
    PRESETS: [], SHAPES: ['box', 'lathe', 'extrude'], PROFILE_SHAPES: ['lathe', 'extrude'], PROFILE_MAX_POINTS: 24,
    DEFAULT_PROFILES: { lathe: DEFAULT_LATHE, extrude: [[0, 1], [1, -1], [-1, -1]] },
    MORPH_PROFILES: [{ id: 'original', label: 'Original', stretch: [1, 1, 1], deform: { taper: 0, twist: 0, bulge: 0 } }],
    normalizeRecipe, normalizeProfile,
    normalizeMorphProfile: (profile) => profile ? { id: String(profile.id || ''), label: String(profile.label || 'Custom form'), stretch: (profile.stretch || [1, 1, 1]).slice(), deform: { taper: 0, twist: 0, bulge: 0, ...(profile.deform || {}) } } : null,
    getPreset: () => null,
    buildObject: () => ({ traverse: () => {} }),
    newPart: (shape) => ({ shape, size: [0.4, 0.4, 0.4], stretch: [1, 1, 1], deform: { taper: 0, twist: 0, bulge: 0 }, position: [0, 0.5, 0], rotation: [0, 0, 0], color: '#ff0000', profile: shape === 'lathe' ? DEFAULT_LATHE.map((p) => p.slice()) : undefined }),
    addPart: (recipe, shape) => normalizeRecipe({ name: 'Custom', parts: [...(recipe?.parts || []), { shape, color: '#ff0000' }] }),
    updatePart,
    updatePartDeform: (recipe, index, patch) => updatePart(recipe, index, { deform: { ...normalizeRecipe(recipe).parts[index].deform, ...patch } }),
    applyMorphProfile: (recipe) => normalizeRecipe(recipe),
    duplicatePart: (recipe) => normalizeRecipe(recipe),
    nudgePart: (recipe) => normalizeRecipe(recipe),
  };
}

describe('Art Studio Sculpt 3D drawn shapes', () => {
  let host, root, config, announce, latest;

  beforeEach(() => {
    resetStemLab();
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => ({ matches: false })) });
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
    Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: originalMatchMedia });
  });

  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ artStudio: { tab: 'sculpt3d', ...initial } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData, announceToSR: announce }));
    }
    await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });
  }

  const latheRecipe = () => ({ name: 'Vase', parts: [{ shape: 'lathe', color: '#ff0000', profile: [[0.5, 0], [0.8, 0.5], [0.5, 1]] }] });

  it('shows a named drawing pad with point controls for a lathe part, and none for a box', async () => {
    await mount({ sculptRecipe: latheRecipe(), sculptSel: 0 });
    const pad = host.querySelector('#artstudio-profile-pad');
    expect(pad).not.toBeNull();
    expect(pad.getAttribute('role')).toBe('img');
    expect(pad.getAttribute('aria-label')).toMatch(/Lathe profile with 3 points; point 1 selected/);
    expect(host.querySelector('[data-artstudio-profile-pad="lathe"]')).not.toBeNull();
    expect(host.querySelector('input[data-profile-axis="x"]').getAttribute('aria-label')).toBe('Radius of point 1');

    await act(async () => root.unmount());
    root = ReactDOMClient.createRoot(host);
    await mount({ sculptRecipe: { name: 'Cube', parts: [{ shape: 'box', color: '#ff0000' }] }, sculptSel: 0 });
    expect(host.querySelector('#artstudio-profile-pad')).toBeNull();
  });

  it('edits the selected point through the sliders and announces add, remove and reset', async () => {
    await mount({ sculptRecipe: latheRecipe(), sculptSel: 0, sculptProfilePoint: 1 });
    const x = host.querySelector('input[data-profile-axis="x"]');
    expect(x.getAttribute('aria-label')).toBe('Radius of point 2');
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(x, '30');
      x.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve();
    });
    expect(latest.artStudio.sculptRecipe.parts[0].profile[1]).toEqual([0.3, 0.5]);

    const add = Array.from(host.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Add a shape point after the selected point');
    await act(async () => { add.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(latest.artStudio.sculptRecipe.parts[0].profile).toHaveLength(4);
    expect(latest.artStudio.sculptProfilePoint).toBe(2);
    expect(announce).toHaveBeenCalledWith('Added shape point 3.');

    const remove = Array.from(host.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Remove the selected shape point');
    await act(async () => { remove.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(latest.artStudio.sculptRecipe.parts[0].profile).toHaveLength(3);
    expect(announce).toHaveBeenCalledWith('Removed shape point 3.');

    const reset = Array.from(host.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Reset the drawn shape to its starter shape');
    await act(async () => { reset.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
    expect(latest.artStudio.sculptRecipe.parts[0].profile).toEqual(DEFAULT_LATHE);
    expect(announce).toHaveBeenCalledWith('Shape reset.');
  });

  it('will not remove below three points and disables editing on a locked part', async () => {
    await mount({ sculptRecipe: latheRecipe(), sculptSel: 0 });
    const remove = Array.from(host.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === 'Remove the selected shape point');
    expect(remove.disabled).toBe(true);

    await act(async () => root.unmount());
    root = ReactDOMClient.createRoot(host);
    const locked = latheRecipe(); locked.parts[0].locked = true;
    await mount({ sculptRecipe: locked, sculptSel: 0 });
    expect(host.querySelector('input[data-profile-axis="x"]').disabled).toBe(true);
    expect(host.querySelector('#artstudio-profile-pad').style.cursor).toBe('not-allowed');
  });

  it('adds a point where the pad is clicked and commits it on release', async () => {
    await mount({ sculptRecipe: latheRecipe(), sculptSel: 0 });
    const pad = host.querySelector('#artstudio-profile-pad');
    // jsdom reports a 0x0 rect, so pad coordinates equal client coordinates.
    // (129, 129): radius ~0.5 (axis is at x=90, radius spans 78px), height ~0.25 -> inserted between the first
    // (height 0) and second (height 0.5) points, keeping bottom-to-top order.
    await act(async () => {
      pad.dispatchEvent(new MouseEvent('pointerdown', { clientX: 129, clientY: 129, bubbles: true, cancelable: true }));
      pad.dispatchEvent(new MouseEvent('pointerup', { clientX: 129, clientY: 129, bubbles: true }));
      await Promise.resolve();
    });
    const profile = latest.artStudio.sculptRecipe.parts[0].profile;
    expect(profile).toHaveLength(4);
    expect(profile[1][0]).toBeCloseTo(0.5, 1);
    expect(profile[1][1]).toBeCloseTo(0.25, 1);
    expect(announce).toHaveBeenCalledWith('Shape point 2 set.');
  });
});
