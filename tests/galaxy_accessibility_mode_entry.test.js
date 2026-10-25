import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 30000 });
const CHEMISTRY = { metallicity: 0.15, mass: 2.4, age: 8, notes: 'Keep my chemistry reasoning.', log: [{ z: 0.1, m: 1, a: 10 }] };
const ROUTES = [
  { key: 'selected star life', origin: 'galaxy', selectedStar: 'B', selector: '[data-galaxy-star-life-link]', mode: 'star', mass: 8, stage: 'main_sequence' },
  { key: 'selected star chemistry', origin: 'galaxy', selectedStar: 'K', selector: '[data-galaxy-metallicity-link]', mode: 'metalHunt', mass: 0.7 },
  { key: 'Time Star Life', origin: 'galaxy', selector: '[data-galaxy-time-star-life-link]', mode: 'star', mass: 0.3, stage: 'blue_dwarf' },
  { key: 'Real Sky launcher', origin: 'galaxy', selector: '[data-galaxy-real-sky-launcher]', mode: 'realSky' },
  { key: 'chemistry Star Life', origin: 'metalHunt', selector: '[data-galaxy-metallicity-life-link]', mode: 'star', mass: CHEMISTRY.mass, stage: 'main_sequence' }
];

describe('Galaxy internal mode-entry focus', () => {
  let instances, outside, loops, restoreCanvas, originalMedia, config, errors;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    window.StemLab.loadScriptResilient = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    outside = document.createElement('button'); outside.textContent = 'Outside the tool'; document.body.appendChild(outside);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(async () => {
    for (const instance of instances) { if (instance.root) await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.useRealTimers();
    const messages = errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message));
    vi.restoreAllMocks(); expect(messages).toEqual([]);
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => { vi.advanceTimersByTime(0); loops.step(); }); }
  async function mount(data = {}) {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: {
        simMode: 'galaxy', webglError: true, galaxyAutoRotate: false, galaxyControlPanel: 'time',
        lifecycleMass: 0.3, activeStage: 'blue_dwarf', metalHunt: { ...CHEMISTRY },
        realSkyTarget: 'm104', realSkySurvey: 'P/2MASS/color', realSkyCatalog: 'none',
        realSkyObservations: [{ id: 'kept-observation', targetKey: 'm104', surveyId: 'P/2MASS/color', catalogId: 'none', note: 'Keep my saved observation.' }],
        ...data
      } });
      instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    return instance;
  }
  async function prepare(route) { return mount({ simMode: route.origin, selectedStar: route.selectedStar }); }
  const heading = (instance, mode) => instance.host.querySelector('[data-galaxy-mode-heading="' + mode + '"]');
  async function activate(instance, route, focused = true) {
    const trigger = instance.host.querySelector(route.selector); expect(trigger).not.toBeNull(); expect(trigger.disabled).not.toBe(true);
    for (let parent = trigger.parentElement; parent && parent !== instance.host; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    if (focused) trigger.focus(); await act(() => trigger.click()); return trigger;
  }
  function verify(instance, route) {
    const state = instance.state.galaxy, destination = heading(instance, route.mode);
    expect(state.simMode).toBe(route.mode); expect(state.quizMode).toBe(false);
    expect(destination).not.toBeNull(); expect(destination.tagName).toMatch(/^H[1-6]$/);
    expect(destination.textContent.trim()).not.toBe(''); expect(destination.tabIndex).toBe(-1);
    expect(destination.getAttribute('data-galaxy-transition-focus')).toBe('true');
    if (route.mode === 'star') { expect(state.lifecycleMass).toBe(route.mass); expect(state.activeStage).toBe(route.stage); expect(state.showLifecycle).toBe(true); }
    expect(state.metalHunt).toEqual(route.mode === 'metalHunt' ? { ...CHEMISTRY, mass: route.mass } : CHEMISTRY);
    expect(state.realSkyObservations[0].note).toBe('Keep my saved observation.');
  }

  it.each(ROUTES)('focuses a labelled destination after $key while preserving investigation data', async route => {
    const instance = await prepare(route), trigger = await activate(instance, route); await frame();
    expect(trigger.isConnected).toBe(false); verify(instance, route);
    expect(document.activeElement).toBe(heading(instance, route.mode));
  });
  it.each(ROUTES)('does not take focus after unfocused $key activation', async route => {
    const instance = await prepare(route); outside.focus(); await activate(instance, route, false); await frame();
    verify(instance, route); expect(document.activeElement).toBe(outside);
  });
  it.each(ROUTES.flatMap(route => ['outside', 'inside'].map(movement => ({ ...route, movement }))))('respects focus moved $movement after $key', async route => {
    const instance = await prepare(route); await activate(instance, route);
    const target = route.movement === 'outside' ? outside : instance.host.querySelector('[data-galaxy-mode="galaxy"]');
    target.focus(); await frame(); verify(instance, route); expect(document.activeElement).toBe(target);
  });
  it.each(ROUTES)('keeps $key focus in the initiating instance', async route => {
    const first = await mount({ simMode: route.mode }); await frame(); const retained = first.state.galaxy;
    const second = await prepare(route); await activate(second, route); await frame(); verify(second, route);
    expect(document.activeElement).toBe(heading(second, route.mode)); expect(document.activeElement).not.toBe(heading(first, route.mode));
    expect(first.state.galaxy.simMode).toBe(retained.simMode); expect(first.state.galaxy.metalHunt).toEqual(retained.metalHunt);
  });
  it.each(ROUTES)('cancels pending $key focus when its tool is removed', async route => {
    const first = await mount({ simMode: route.mode }); await frame();
    const second = await prepare(route); await activate(second, route); await act(() => second.root.unmount()); second.root = null; second.host.remove();
    outside.focus(); await frame(); expect(document.activeElement).toBe(outside); expect(heading(first, route.mode)).not.toBeNull();
  });
});
