import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const samples = (...radii) => radii.map(radiusKpc => ({ radiusKpc }));
const actions = {
  save: { trigger: '[data-galaxy-rotation-save]', destination: '[data-galaxy-rotation-revisit="8.2"]', expected: samples(6, 8.2, 12), feedback: 'Saved 8.2 kpc.' },
  remove: { trigger: '[data-galaxy-rotation-remove="6"]', destination: '[data-galaxy-rotation-undo]', expected: samples(12), feedback: 'Removed 6.0 kpc.' },
  undo: { trigger: '[data-galaxy-rotation-undo]', destination: '[data-galaxy-rotation-revisit="6"]', expected: samples(6, 12), feedback: 'Radius restored.' }
};

describe('Galaxy rotation investigation focus', () => {
  let instances, outside, restoreCanvas, loops, originalMedia, errors, config;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    outside = document.createElement('button'); outside.textContent = 'Outside the tool'; document.body.appendChild(outside);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Hold the legacy zero-delay focus timers, as well as the guarded frame, so
    // learner movement and teardown are checked before any deferred work runs.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(async () => {
    for (const instance of instances) { if (instance.root) await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.useRealTimers(); vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => { vi.advanceTimersByTime(0); loops.step(); }); }
  async function mount(data = {}) {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'galaxy', galaxyControlPanel: 'motion', webglError: true, galaxyAutoRotate: false, rotationProbeRadius: 8.2, rotationSamples: samples(6, 12), rotationInvestigationNote: 'Keep my evidence note.', ...data } });
      instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    return instance;
  }
  async function click(instance, selector, focused = true) {
    const control = instance.host.querySelector(selector); expect(control).not.toBeNull(); expect(control.disabled).toBe(false);
    if (focused) control.focus(); await act(() => control.click()); return control;
  }
  async function prepare(action) {
    const instance = await mount();
    if (action === 'undo') { outside.focus(); await click(instance, actions.remove.trigger, false); await frame(); }
    return instance;
  }
  function verifyResult(instance, action) {
    expect(instance.state.galaxy.rotationSamples).toEqual(actions[action].expected);
    expect(instance.state.galaxy.rotationInvestigationNote).toBe('Keep my evidence note.');
    const status = instance.host.querySelector('[data-galaxy-rotation-book-status]');
    expect(status.textContent).toContain(actions[action].feedback);
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite');
    expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message))).toEqual([]);
  }
  async function competingInstance(action) {
    const instance = await mount(action === 'save' ? { rotationSamples: samples(8.2) } : {});
    if (action === 'remove') { outside.focus(); await click(instance, actions.remove.trigger, false); await frame(); }
    expect(instance.host.querySelector(actions[action].destination)).not.toBeNull();
    return instance;
  }

  it.each(Object.keys(actions))('keeps meaningful keyboard focus after %s', async action => {
    const instance = await prepare(action), status = instance.host.querySelector('[data-galaxy-rotation-book-status]');
    const trigger = await click(instance, actions[action].trigger); await frame();
    expect(document.activeElement).toBe(instance.host.querySelector(actions[action].destination));
    expect(instance.host.querySelector('[data-galaxy-rotation-book-status]')).toBe(status);
    if (action === 'save') expect(trigger.disabled).toBe(true); else expect(trigger.isConnected).toBe(false);
    verifyResult(instance, action);
  });

  it.each(Object.keys(actions))('preserves focus moved elsewhere before the %s handoff', async action => {
    const instance = await prepare(action);
    await click(instance, actions[action].trigger); outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); verifyResult(instance, action);
  });

  it.each(Object.keys(actions))('does not move focus after an unfocused %s activation', async action => {
    const instance = await prepare(action); outside.focus();
    await click(instance, actions[action].trigger, false); await frame();
    expect(document.activeElement).toBe(outside); verifyResult(instance, action);
  });

  it.each(Object.keys(actions))('scopes the %s handoff to its initiating tool instance', async action => {
    const first = await competingInstance(action), firstSamples = first.state.galaxy.rotationSamples;
    const second = await prepare(action);
    await click(second, actions[action].trigger); await frame();
    expect(document.activeElement).toBe(second.host.querySelector(actions[action].destination));
    expect(first.state.galaxy.rotationSamples).toEqual(firstSamples); verifyResult(second, action);
  });

  it.each(Object.keys(actions))('cancels pending %s focus when its tool is removed', async action => {
    const first = await competingInstance(action), firstSamples = first.state.galaxy.rotationSamples;
    const second = await prepare(action);
    await click(second, actions[action].trigger);
    await act(() => second.root.unmount()); second.root = null; second.host.remove(); outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); expect(first.state.galaxy.rotationSamples).toEqual(firstSamples);
    expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message))).toEqual([]);
  });
});
