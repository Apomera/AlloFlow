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
const mounted = [];
let frames;

// Exercise the shipped React handlers and real DOM focus. Only canvas drawing
// and frame scheduling are stubbed: native QA owns geometry and keyboard input.
function mountScene(path, seed = {}, t = translate) {
  resetStemLab();
  const config = loadTool(path, 'decomposer');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const announce = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ decomposer: {
      tab: 'scenes', activeScene: 'kitchen', selected: 'Water', materialsExplored: ['Water'],
      huntTarget: 'k_faucet', huntScore: 7, huntStreak: 3, foundObjects: {}, ...seed,
    } });
    current = data.decomposer;
    setCurrent = patch => setData(prev => ({ ...prev, decomposer: { ...prev.decomposer, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce, t }));
  }
  act(() => root.render(React.createElement(Host)));
  mounted.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current, patch: patch => act(() => setCurrent(patch)),
    object: id => host.querySelector('[data-decomposer-object="' + id + '"]'),
    canvas: () => host.querySelector('[data-allo-fs-stage] canvas') };
}

function activate(button) {
  expect(button).not.toBeNull();
  button.focus();
  expect(document.activeElement).toBe(button);
  act(() => button.click());
}

function nextFrame() {
  const pending = frames.splice(0);
  act(() => pending.forEach(callback => callback(16)));
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const gradient = { addColorStop() {} };
  const context = new Proxy({ createLinearGradient: () => gradient }, { get: (target, key) => key in target ? target[key] : () => {} });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
});

afterEach(() => {
  mounted.splice(0).forEach(unmount => unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Material Decomposer scene accessibility: %s', path => {
  it('announces the incorrect compound and target without moving focus or changing the score', () => {
    const view = mountScene(path);
    const canvas = view.canvas(), salt = view.object('k_salt');
    expect(view.announce).not.toHaveBeenCalled();
    activate(salt);
    expect(view.state()).toMatchObject({ huntWrongGuess: 'k_salt', huntTarget: 'k_faucet', huntScore: 7, huntStreak: 0, foundObjects: {} });
    expect(document.activeElement).toBe(salt);
    expect(view.canvas()).toBe(canvas);
    expect(view.announce).toHaveBeenCalledTimes(1);
    expect(view.announce.mock.calls[0][0]).toBe('Not quite. Salt Shaker contains NaCl (Table Salt). Keep looking for H₂O (Water).');
    expect(view.host.querySelector('[data-decomposer-dismiss="feedback"]').getAttribute('aria-label')).toBe('Dismiss incorrect guess feedback');
    view.patch({ sceneHoverId: 'k_faucet' });
    expect(view.announce).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(salt);
  });

  it('dismisses incorrect feedback and returns focus to the original scene object after React commits', () => {
    const view = mountScene(path);
    const canvas = view.canvas(), salt = view.object('k_salt');
    activate(salt);
    const dismiss = view.host.querySelector('[data-decomposer-dismiss="feedback"]');
    expect(dismiss.type).toBe('button');
    activate(dismiss);
    expect(view.host.querySelector('[data-decomposer-dismiss="feedback"]')).toBeNull();
    expect(view.state()).toMatchObject({ huntWrongGuess: null, huntTarget: 'k_faucet', huntScore: 7, foundObjects: {} });
    nextFrame();
    expect(document.activeElement).toBe(salt);
    expect(view.canvas()).toBe(canvas);
    expect(view.announce).toHaveBeenCalledTimes(1);
  });

  it('exposes named object details and restores the found-object disclosure and focus when closed', () => {
    const view = mountScene(path, { foundObjects: { k_faucet: true }, huntTarget: 'k_salt' });
    const canvas = view.canvas(), faucet = view.object('k_faucet');
    expect(faucet.getAttribute('aria-expanded')).toBe('false');
    expect(faucet.hasAttribute('aria-controls')).toBe(false);
    activate(faucet);
    const details = view.host.querySelector('#stem-decomposer-object-details');
    expect(details.tagName).toBe('SECTION');
    const title = view.host.querySelector('#' + details.getAttribute('aria-labelledby'));
    expect(title.textContent).toBe('Kitchen Faucet');
    expect(details.contains(title)).toBe(true);
    expect(faucet.getAttribute('aria-expanded')).toBe('true');
    expect(faucet.getAttribute('aria-controls')).toBe(details.id);
    const dismiss = details.querySelector('[data-decomposer-dismiss="details"]');
    expect(dismiss.type).toBe('button');
    expect(dismiss.getAttribute('aria-label')).toBe('Close object details');
    activate(dismiss);
    expect(view.state()).toMatchObject({ selectedSceneObj: null, huntTarget: 'k_salt', huntScore: 7, foundObjects: { k_faucet: true } });
    expect(view.host.querySelector('#stem-decomposer-object-details')).toBeNull();
    nextFrame();
    expect(document.activeElement).toBe(faucet);
    expect(faucet.getAttribute('aria-expanded')).toBe('false');
    expect(faucet.hasAttribute('aria-controls')).toBe(false);
    expect(view.canvas()).toBe(canvas);
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('toggles found-object details without dangling disclosure targets or incorrect-guess announcements', () => {
    const view = mountScene(path, { foundObjects: { k_faucet: true }, huntTarget: 'k_salt' });
    const faucet = view.object('k_faucet');
    activate(faucet);
    for (const disclosure of view.host.querySelectorAll('[aria-controls="stem-decomposer-object-details"]')) {
      expect(disclosure.getAttribute('aria-expanded')).toBe('true');
    }
    activate(faucet);
    expect(view.host.querySelector('#stem-decomposer-object-details')).toBeNull();
    expect(view.host.querySelector('[aria-controls="stem-decomposer-object-details"]')).toBeNull();
    expect(document.activeElement).toBe(faucet);
    expect(view.state()).toMatchObject({ huntTarget: 'k_salt', huntScore: 7, huntStreak: 3, foundObjects: { k_faucet: true } });
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('uses the translated feedback template and does not invent a target announcement when none exists', () => {
    const t = vi.fn((key, fallback) => key === 'stem.decomposer.hunt_incorrect_announcement'
      ? 'Feedback: {object} → {formula} ({material}); target {target}.' : translate(key, fallback));
    const view = mountScene(path, {}, t);
    activate(view.object('k_salt'));
    expect(view.announce).toHaveBeenCalledWith('Feedback: Salt Shaker → NaCl (Table Salt); target H₂O (Water).');
    expect(t.mock.calls.some(([key]) => key === 'stem.decomposer.hunt_incorrect_announcement')).toBe(true);
    view.announce.mockClear();
    view.patch({ huntTarget: null, huntWrongGuess: null });
    activate(view.object('k_salt'));
    expect(view.announce).not.toHaveBeenCalled();
    expect(view.state().huntScore).toBe(7);
  });
});
