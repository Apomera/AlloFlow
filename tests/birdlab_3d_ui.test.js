import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const source = readFileSync('stem_lab/stem_tool_birdlab.js', 'utf8');
const componentSource = source.slice(source.indexOf('  function Birdlab3DObservatory('), source.indexOf('  // ── Reduced motion CSS'));
let root, host, previousMedia;
const state = { ready: true, paused: false, camera: 'orbit', lighting: 'daylight', speed: 1, phase: 'gliding', label: 'Gliding through the clearing', altitude: 6, airspeed: 8.3, wingbeat: 0, time: 12 };

function controller() {
  return Object.fromEntries(['setPaused', 'setSpeed', 'setCamera', 'setLighting', 'seek', 'resetView', 'restart', 'dispose', 'getState'].map(name => [name, vi.fn()]));
}
function button(label) { return [...host.querySelectorAll('button')].find(el => el.textContent === label); }
async function mount(load, props = {}) {
  const View = new Function('loadBirdlab3D', componentSource + '\nreturn Birdlab3DObservatory;')(load);
  await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn(), ...props })));
  return View;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  previousMedia = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host.remove();
  window.matchMedia = previousMedia;
  delete window.BirdLab3D;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('BirdLab optional 3D view lifecycle', () => {
  it('does not create a renderer when the user leaves while scripts are loading', async () => {
    let finish;
    const load = new Promise(resolve => { finish = resolve; });
    window.BirdLab3D = { mount: vi.fn() };
    await mount(() => load);
    expect(host.textContent).toContain('Preparing your observation');
    await act(async () => root.unmount());
    root = null;
    await act(async () => finish());
    expect(window.BirdLab3D.mount).not.toHaveBeenCalled();
  });

  it('keeps one renderer across host updates, routes controls, and disposes on exit', async () => {
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState(state); return scene; }) };
    const View = await mount(() => Promise.resolve());
    await act(async () => root.render(React.createElement(View, { React, onBack: vi.fn(), onMenu: vi.fn() })));
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(1);
    await act(async () => button('Pause flight').click());
    expect(scene.setPaused).toHaveBeenLastCalledWith(true);
    await act(async () => host.querySelector('canvas').dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })));
    expect(scene.setPaused).toHaveBeenLastCalledWith(false);
    await act(async () => button('Follow').click());
    expect(scene.setCamera).toHaveBeenLastCalledWith('follow');
    await act(async () => { const select = host.querySelector('select'); select.value = '0.25'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(scene.setSpeed).toHaveBeenLastCalledWith(0.25);
    await act(async () => button('Restart flight').click());
    expect(scene.restart).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    root = null;
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it('starts reduced-motion observations paused and keeps playback an explicit choice', async () => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState({ ...state, paused: options.reducedMotion }); return scene; }) };
    await mount(() => Promise.resolve());
    expect(window.BirdLab3D.mount.mock.calls[0][1].reducedMotion).toBe(true);
    expect(button('Play flight')).toBeTruthy();
    expect(scene.setPaused).not.toHaveBeenCalled();
    await act(async () => button('Play flight').click());
    expect(scene.setPaused).toHaveBeenCalledWith(false);
  });

  it('routes each study moment to a paused point without changing the camera or speed', async () => {
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState({ ...state, camera: 'follow', speed: 0.25 }); return scene; }) };
    await mount(() => Promise.resolve());
    for (const [label, time] of [['Perch', 1], ['Takeoff', 4.2], ['Glide', 14], ['Landing', 36.8]]) {
      await act(async () => button(label).click());
      expect(scene.seek).toHaveBeenLastCalledWith(time);
      expect(button('Play flight')).toBeTruthy();
      expect(Number(host.querySelector('input[type="range"]').value)).toBeCloseTo(time);
    }
    expect(button('Follow').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('select').value).toBe('0.25');
    expect(scene.setCamera).not.toHaveBeenCalled();
    expect(scene.setSpeed).not.toHaveBeenCalled();
    expect(scene.restart).not.toHaveBeenCalled();
  });

  it('keeps the accessible timeline in the current loop and scrubs through the engine', async () => {
    const scene = controller();
    let publish;
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState({ ...state, time: 58.5 }); return scene; }) };
    await mount(() => Promise.resolve());
    const timeline = host.querySelector('input[type="range"]');
    expect(host.querySelector('label[for="' + timeline.id + '"]').textContent).toBe('Flight timeline');
    expect(timeline.max).toBe('44');
    expect(timeline.step).toBe('0.1');
    expect(Number(timeline.value)).toBe(14.5);
    expect(timeline.getAttribute('aria-valuetext')).toContain('14.5 seconds of 44 seconds');
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(timeline, '36.8');
      timeline.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(scene.seek).toHaveBeenLastCalledWith(36.8);
    expect(button('Play flight')).toBeTruthy();
    await act(async () => publish({ ...state, time: 80.8, paused: true, phase: 'landing', label: 'Reaching for the perch' }));
    expect(Number(timeline.value)).toBeCloseTo(36.8);
    expect(timeline.getAttribute('aria-valuetext')).toContain('Reaching for the perch');
    expect(button('Landing').getAttribute('aria-pressed')).toBe('true');
    await act(async () => publish({ ...state, time: 44, paused: true, phase: 'perched' }));
    expect(Number(timeline.value)).toBe(44);
    await act(async () => publish({ ...state, time: 44.1, paused: false, phase: 'perched' }));
    expect(Number(timeline.value)).toBeCloseTo(.1);
  });

  it('changes woodland lighting independently of flight playback and follows engine state', async () => {
    const scene = controller();
    let publish;
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { publish = options.onState; options.onState(state); return scene; }) };
    await mount(() => Promise.resolve());
    expect(button('Daylight').getAttribute('aria-pressed')).toBe('true');
    await act(async () => button('Golden hour').click());
    expect(scene.setLighting).toHaveBeenLastCalledWith('golden');
    expect(button('Golden hour').getAttribute('aria-pressed')).toBe('true');
    expect(button('Pause flight')).toBeTruthy();
    expect(scene.setPaused).not.toHaveBeenCalled();
    expect(scene.seek).not.toHaveBeenCalled();
    await act(async () => publish({ lighting: 'daylight' }));
    expect(button('Daylight').getAttribute('aria-pressed')).toBe('true');
    expect(button('Golden hour').getAttribute('aria-pressed')).toBe('false');
  });

  it('provides a retry and a working 2D exit after a load failure', async () => {
    const onBack = vi.fn();
    let attempts = 0;
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { options.onState(state); return scene; }) };
    await mount(() => ++attempts === 1 ? Promise.reject(new Error('Offline asset unavailable')) : Promise.resolve(), { onBack });
    expect(host.querySelector('[role="alert"]').textContent).toContain('Offline asset unavailable');
    expect(host.querySelector('input[type="range"]').disabled).toBe(true);
    expect(button('Landing').disabled).toBe(true);
    expect(button('Golden hour').disabled).toBe(true);
    const previousCanvas = host.querySelector('canvas');
    await act(async () => button('Return to 2D habitats').click());
    expect(onBack).toHaveBeenCalledTimes(1);
    await act(async () => button('Retry 3D').click());
    expect(host.querySelector('canvas')).not.toBe(previousCanvas);
    expect(host.querySelector('[data-birdlab-3d-ready]').getAttribute('data-birdlab-3d-ready')).toBe('true');
    expect(attempts).toBe(2);
  });

  it('disposes a lost context and recreates a canvas for the next attempt', async () => {
    let errorHandler;
    const scene = controller();
    window.BirdLab3D = { mount: vi.fn((canvas, options) => { errorHandler = options.onError; options.onState(state); return scene; }) };
    await mount(() => Promise.resolve());
    const oldCanvas = host.querySelector('canvas');
    await act(async () => errorHandler('Graphics context was interrupted'));
    expect(scene.dispose).toHaveBeenCalled();
    expect(button('Pause flight').disabled).toBe(true);
    await act(async () => button('Retry 3D').click());
    expect(host.querySelector('canvas')).not.toBe(oldCanvas);
    expect(window.BirdLab3D.mount).toHaveBeenCalledTimes(2);
  });
});
