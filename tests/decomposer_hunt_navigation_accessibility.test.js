import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_decomposer.js', 'desktop/web-app/public/stem_lab/stem_tool_decomposer.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const scenes = [['kitchen', 'Kitchen'], ['bathroom', 'Bathroom'], ['garage', 'Garage'], ['classroom', 'Science Lab'], ['outdoors', 'Backyard']];
const kitchen = {
  k_faucet: ['H₂O', 'Water'], k_salt: ['NaCl', 'Table Salt'],
  k_sugar: ['C₁₂H₂₂O₁₁', 'Sugar (Sucrose)'], k_baking: ['NaHCO₃', 'Baking Soda'],
  k_vinegar: ['C₂H₄O₂', 'Acetic Acid'], k_soda: ['CO₂', 'Carbon Dioxide'], k_fruit: ['C₆H₁₂O₆', 'Glucose'],
};
const criticalNames = { b_tap: 'Sink Tap', b_peroxide: 'Peroxide Bottle', b_cleaner: 'Cleaning Spray', g_deice: 'De-icing Salt' };
const disposers = [];
let frames;

// Mount the shipped React UI. Drawing and RAF delivery are controlled while
// state updates, native button activation, and actual DOM focus remain real.
function mountHunt(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const announce = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ decomposer: {
      tab: 'scenes', selected: 'Water', materialsExplored: ['Water'], foundObjects: {}, ...seed,
    } });
    current = data.decomposer;
    setCurrent = patch => setData(prev => ({ ...prev, decomposer: { ...prev.decomposer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, t: translate, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)] };
}

function activate(button) {
  expect(button).toBeTruthy();
  button.focus();
  expect(document.activeElement).toBe(button);
  act(() => button.click());
}

function nextFrame() {
  const pending = frames.splice(0);
  act(() => pending.forEach(callback => callback(16)));
}

function normalize(text) { return text.replace(/\s+/g, ' ').trim().toLowerCase(); }

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gradient = { addColorStop() {} };
  const context = new Proxy({
    createLinearGradient: () => gradient, createRadialGradient: () => gradient,
    measureText: text => ({ width: String(text).length * 6 }),
  }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});

afterEach(() => {
  disposers.splice(0).forEach(dispose => dispose());
  frames.splice(0).forEach(callback => callback(16));
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Material Decomposer Hunt navigation: %s', path => {
  it.each(scenes)('focuses %s on entry and returns to its exact chooser on exit', (scene, title) => {
    const view = mountHunt(path);
    const id = 'stem-decomposer-scene-' + scene;
    activate(view.one('#' + id));
    nextFrame();
    const heading = view.one('#stem-decomposer-scene-title');
    const status = view.one('#stem-decomposer-hunt-status');
    expect(heading.tagName).toBe('H4');
    expect(heading.tabIndex).toBe(-1);
    expect(heading.textContent).toBe(title);
    expect(document.activeElement).toBe(heading);
    expect((heading.getAttribute('aria-describedby') || '').split(/\s+/)).toContain(status.id);
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent.trim().length).toBeGreaterThan(0);
    expect(view.state().activeScene).toBe(scene);
    activate(view.one('[data-decomposer-scene-exit]'));
    nextFrame();
    const chooser = view.one('#' + id);
    expect(chooser.getAttribute('data-decomposer-scene')).toBe(scene);
    expect(document.activeElement).toBe(chooser);
    expect(view.state().activeScene).toBeNull();
    expect(view.one('#stem-decomposer-scene-title')).toBeNull();
  });

  it('updates the next compound assignment in the same live status while retaining correct-object focus', () => {
    const view = mountHunt(path, { activeScene: 'kitchen', huntTarget: 'k_faucet', huntScore: 2, huntStreak: 2 });
    const status = view.one('#stem-decomposer-hunt-status');
    const previousText = status.textContent;
    expect(previousText).toContain('H₂O');
    expect(previousText).toContain('Water');
    const canvas = view.one('[data-allo-fs-stage] canvas');
    const faucet = view.one('[data-decomposer-object="k_faucet"]');
    activate(faucet);
    nextFrame();
    expect(document.activeElement).toBe(faucet);
    expect(view.one('[data-allo-fs-stage] canvas')).toBe(canvas);
    expect(view.one('#stem-decomposer-hunt-status')).toBe(status);
    expect(status.textContent).not.toBe(previousText);
    const nextTarget = kitchen[view.state().huntTarget];
    expect(nextTarget).toBeDefined();
    expect(status.textContent).toContain(nextTarget[0]);
    expect(status.textContent).toContain(nextTarget[1]);
    expect(view.state()).toMatchObject({ huntScore: 3, huntStreak: 3, foundObjects: { k_faucet: true }, selectedSceneObj: 'k_faucet' });
  });

  it('announces scene completion through the same status after the final correct object', () => {
    const found = Object.fromEntries(Object.keys(kitchen).filter(id => id !== 'k_faucet').map(id => [id, true]));
    const view = mountHunt(path, { activeScene: 'kitchen', huntTarget: 'k_faucet', foundObjects: found, huntScore: 6 });
    const status = view.one('#stem-decomposer-hunt-status');
    const faucet = view.one('[data-decomposer-object="k_faucet"]');
    activate(faucet);
    nextFrame();
    expect(view.one('#stem-decomposer-hunt-status')).toBe(status);
    expect(status.textContent).toContain('Kitchen');
    expect(status.textContent).toMatch(/complete/i);
    expect(status.textContent).toMatch(/7|seven/i);
    expect(view.state()).toMatchObject({ huntTarget: null, huntScore: 7, foundObjects: { k_faucet: true } });
    expect(document.activeElement).toBe(faucet);
  });

  it.each(['scene', 'summary'])('keeps the assignment quiet when identified-object details are toggled from the %s', triggerKind => {
    const view = mountHunt(path, { activeScene: 'kitchen', huntTarget: 'k_salt', foundObjects: { k_faucet: true }, huntScore: 3 });
    const status = view.one('#stem-decomposer-hunt-status');
    const previousText = status.textContent;
    const observer = new MutationObserver(() => {});
    observer.observe(status, { childList: true, characterData: true, subtree: true });
    try {
      const trigger = triggerKind === 'scene' ? view.one('[data-decomposer-object="k_faucet"]')
        : view.all('button[aria-expanded="false"]').find(button => !button.hasAttribute('data-decomposer-object'));
      activate(trigger);
      expect(view.one('#stem-decomposer-object-details')).not.toBeNull();
      activate(trigger);
      expect(view.one('#stem-decomposer-object-details')).toBeNull();
      expect(view.one('#stem-decomposer-hunt-status')).toBe(status);
      expect(status.textContent).toBe(previousText);
      expect(observer.takeRecords()).toHaveLength(0);
      expect(view.state()).toMatchObject({ huntTarget: 'k_salt', huntScore: 3 });
      expect(view.announce).not.toHaveBeenCalled();
    } finally { observer.disconnect(); }
  });

  it.each(['explore', 'visualize'])('focuses the correctly selected %s panel when following an object detail action', tab => {
    const view = mountHunt(path, { activeScene: 'kitchen', huntTarget: 'k_faucet', selectedSceneObj: 'k_salt', foundObjects: { k_salt: true }, huntScore: 3 });
    activate(view.one('[data-decomposer-detail-action="' + tab + '"]'));
    nextFrame();
    const panel = view.one('#stem-decomposer-panel-' + tab);
    const selectedTab = view.one('[role="tab"][aria-selected="true"]');
    expect(document.activeElement).toBe(panel);
    expect(panel.getAttribute('role')).toBe('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(selectedTab.id);
    expect(selectedTab.id).toBe('stem-decomposer-tab-' + tab);
    expect(selectedTab.tabIndex).toBe(0);
    const oldTab = view.one('#stem-decomposer-tab-scenes');
    expect(oldTab.getAttribute('aria-selected')).toBe('false');
    expect(oldTab.tabIndex).toBe(-1);
    expect(view.state()).toMatchObject({ tab, selected: 'Table Salt', huntTarget: 'k_faucet', huntScore: 3 });
  });

  it.each(scenes)('retains every visible identified-object label in the accessible name for %s', scene => {
    const view = mountHunt(path, { activeScene: scene });
    const ids = view.all('[data-decomposer-object]').map(button => button.getAttribute('data-decomposer-object'));
    expect(ids.length).toBeGreaterThan(0);
    view.patch({ foundObjects: Object.fromEntries(ids.map(id => [id, true])), huntTarget: null });
    for (const button of view.all('[data-decomposer-object]')) {
      const visible = button.querySelector('.decomposer-scene-object-label').textContent.replace(/^[\s✅✔✓]+/u, '');
      const label = button.getAttribute('aria-label');
      expect(normalize(label)).toContain(normalize(visible));
      expect(label).toMatch(/identified/i);
      const fullName = criticalNames[button.getAttribute('data-decomposer-object')];
      if (fullName) expect(label).toContain(fullName);
    }
  });
});
