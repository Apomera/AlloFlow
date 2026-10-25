import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

const RESERVED_KEYS = [
  { ctrlKey: true }, { metaKey: true }, { altKey: true },
  { isComposing: true }, { keyCode: 229 }
];
const SDK_GLOBALS = ['A', 'THREE', '_galaxyHasLoadedOnce', '_galaxyAladinLoaded', '_galaxyAladinLoading', '_galaxyAladinFailed', '_galaxyAladinCallbacks'];

describe('Galaxy custom keyboard boundaries', () => {
  let instances, outside, restoreCanvas, loops, originalMedia, originalGlobals, errors, config;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    originalGlobals = SDK_GLOBALS.map(key => [key, Object.hasOwn(window, key), window[key]]);
    SDK_GLOBALS.forEach(key => { delete window[key]; });
    window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    const canvas2D = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function (kind) {
      if (typeof kind === 'string' && /webgl/i.test(kind)) return { getExtension() { return null; }, getParameter() { return 'keyboard-fixture'; } };
      return canvas2D.apply(this, arguments);
    };
    // Keep the scene pending: these tests exercise real UI handlers without building Three geometry.
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    window.A = { init: Promise.resolve(), aladin: vi.fn(() => ({
      destroy: vi.fn(), setFov: vi.fn(), gotoRaDec: vi.fn(), setImageSurvey: vi.fn(), removeLayers: vi.fn(), addCatalog: vi.fn(),
      gotoObject: vi.fn((_target, callbacks) => { if (callbacks && callbacks.success) callbacks.success(); })
    })) };
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    outside = document.createElement('button'); outside.textContent = 'Outside the tool'; document.body.appendChild(outside);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    for (const instance of instances) { if (instance.root) await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    originalGlobals.forEach(([key, present, value]) => { if (present) window[key] = value; else delete window[key]; });
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => loops.step()); }
  async function mount(data = {}) {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'galaxy', webglError: false, galaxyAutoRotate: false, galaxyControlPanel: 'view', ...data } });
      instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    return instance;
  }
  async function key(target, value, options = {}) {
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
    await act(() => target.dispatchEvent(event)); return event;
  }
  function tab(instance, name) { return instance.host.querySelector('[data-galaxy-control-tab="' + name + '"]'); }
  function clean() { expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message))).toEqual([]); }
  function splitterFixture(instance) {
    const canvas = instance.host.querySelector('[data-galaxy-canvas]'); expect(canvas).not.toBeNull();
    let width = 360;
    canvas._galaxyGetPanelWidth = () => width;
    canvas._galaxySetPanelWidth = vi.fn(next => { width = Math.max(240, Math.min(480, next)); return width; });
    return { canvas, separator: instance.host.querySelector('[data-galaxy-panel-resizer]') };
  }

  it('leaves browser and assistive-technology chords and IME navigation keys untouched on tabs', async () => {
    const instance = await mount(), view = tab(instance, 'view'); view.focus();
    for (const options of RESERVED_KEYS) {
      for (const navigation of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
        expect((await key(view, navigation, options)).defaultPrevented).toBe(false);
        expect(instance.state.galaxy.galaxyControlPanel).toBe('view');
      }
    }
    await frame(); expect(document.activeElement).toBe(view); expect(view.getAttribute('aria-selected')).toBe('true'); clean();
  });

  it('keeps ordinary and Shift tab navigation, wrapping, Home, End and roving focus working', async () => {
    const instance = await mount(); tab(instance, 'view').focus();
    for (const [navigation, destination, options] of [
      ['ArrowRight', 'motion'], ['ArrowDown', 'time'], ['ArrowLeft', 'motion'], ['ArrowUp', 'view'],
      ['ArrowLeft', 'discover', { shiftKey: true }], ['Home', 'view'], ['End', 'discover']
    ]) {
      expect((await key(document.activeElement, navigation, options)).defaultPrevented).toBe(true); await frame();
      const selected = tab(instance, destination);
      expect(instance.state.galaxy.galaxyControlPanel).toBe(destination);
      expect(document.activeElement).toBe(selected); expect(selected.getAttribute('aria-selected')).toBe('true');
      expect([...instance.host.querySelectorAll('[data-galaxy-control-tab]')].filter(node => node.tabIndex === 0)).toEqual([selected]);
    }
    clean();
  });

  it('hands tab focus to the initiating tool when two Galaxy instances are mounted', async () => {
    const first = await mount(), second = await mount(), origin = tab(second, 'view'); origin.focus();
    await key(origin, 'ArrowRight'); await frame();
    expect(document.activeElement).toBe(tab(second, 'motion'));
    expect(first.state.galaxy.galaxyControlPanel).toBe('view'); expect(tab(first, 'view').getAttribute('aria-selected')).toBe('true'); clean();
  });

  it('respects a learner moving focus away before the tab handoff runs', async () => {
    const instance = await mount(), origin = tab(instance, 'view'); origin.focus();
    await key(origin, 'End'); outside.focus(); await frame();
    expect(instance.state.galaxy.galaxyControlPanel).toBe('discover'); expect(document.activeElement).toBe(outside); clean();
  });

  it('cancels a pending tab focus handoff when its tool is removed', async () => {
    const first = await mount(), second = await mount(), origin = tab(second, 'view'); origin.focus();
    await key(origin, 'ArrowRight'); await act(() => second.root.unmount()); second.root = null;
    outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); expect(first.state.galaxy.galaxyControlPanel).toBe('view'); clean();
  });

  it('leaves reserved splitter keys unconsumed and does not resize the panel', async () => {
    const instance = await mount(), { canvas, separator } = splitterFixture(instance); separator.focus();
    const reachedDocument = vi.fn(); document.addEventListener('keydown', reachedDocument);
    try {
      for (const options of RESERVED_KEYS) for (const navigation of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) {
        expect((await key(separator, navigation, options)).defaultPrevented).toBe(false);
      }
      expect(reachedDocument).toHaveBeenCalledTimes(RESERVED_KEYS.length * 4);
      expect(canvas._galaxySetPanelWidth).not.toHaveBeenCalled(); expect(canvas._galaxyGetPanelWidth()).toBe(360);
      expect(document.activeElement).toBe(separator); clean();
    } finally { document.removeEventListener('keydown', reachedDocument); }
  });

  it('retains normal splitter direction, Shift coarse steps and Home/End endpoints', async () => {
    const instance = await mount(), { canvas, separator } = splitterFixture(instance); separator.focus();
    for (const [navigation, options, expected, requested] of [
      ['ArrowLeft', {}, 376, 376], ['ArrowRight', {}, 360, 360],
      ['ArrowLeft', { shiftKey: true }, 424, 424], ['ArrowRight', { shiftKey: true }, 360, 360],
      ['Home', {}, 240, 240], ['End', {}, 480, 9999]
    ]) {
      expect((await key(separator, navigation, options)).defaultPrevented).toBe(true);
      expect(canvas._galaxySetPanelWidth).toHaveBeenLastCalledWith(requested);
      expect(canvas._galaxyGetPanelWidth()).toBe(expected); expect(separator.getAttribute('aria-valuenow')).toBe(String(expected));
      expect(document.activeElement).toBe(separator);
    }
    clean();
  });

  it('does not select lifecycle stages for modified or composing activation keys', async () => {
    const instance = await mount({ simMode: 'star', lifecycleMass: 1, activeStage: 'main_sequence' });
    const card = instance.host.querySelector('[role="button"][aria-label^="Select lifecycle stage:"][aria-pressed="false"]');
    expect(card).not.toBeNull(); card.focus();
    for (const options of RESERVED_KEYS) for (const activation of ['Enter', ' ']) {
      expect((await key(card, activation, options)).defaultPrevented).toBe(false);
      expect(instance.state.galaxy.activeStage).toBe('main_sequence'); expect(card.getAttribute('aria-pressed')).toBe('false');
    }
    expect(document.activeElement).toBe(card); clean();
  });

  it('activates the lifecycle button itself with Enter and Space, including Shift and descendant key targets', async () => {
    const instance = await mount({ simMode: 'star', lifecycleMass: 1, activeStage: 'main_sequence' });
    const card = instance.host.querySelector('[role="button"][aria-label^="Select lifecycle stage:"][aria-pressed="false"]');
    const label = card.querySelector('p'), clicked = vi.fn(); card.addEventListener('click', clicked); card.focus();
    for (const [activation, options] of [['Enter', {}], [' ', {}], ['Enter', { shiftKey: true }], [' ', { shiftKey: true }]]) {
      expect((await key(label, activation, options)).defaultPrevented).toBe(true);
      expect(card.getAttribute('aria-pressed')).toBe('true'); expect(instance.state.galaxy.activeStage).not.toBe('main_sequence');
      expect(clicked.mock.calls.at(-1)[0].target).toBe(card); expect(document.activeElement).toBe(card);
    }
    expect(clicked).toHaveBeenCalledTimes(4); clean();
  });

  it.each([false, true])('preserves edited evidence through reserved Escape keys, then cancels and returns focus (Shift=%s)', async shiftKey => {
    const saved = { id: 'obs-keyboard', targetKey: 'm104', surveyId: 'P/2MASS/color', catalogId: 'none', note: 'Original saved note.' };
    const instance = await mount({ simMode: 'realSky', realSkyTarget: 'm104', realSkySurvey: saved.surveyId, realSkyCatalog: 'none', realSkyObservations: [saved] });
    const row = instance.host.querySelector('[data-galaxy-real-sky-observation-id="obs-keyboard"]');
    const editButton = row.querySelector('[data-galaxy-real-sky-observation-edit-button]'); editButton.focus(); await act(() => editButton.click());
    const editor = row.querySelector('[data-galaxy-real-sky-observation-editor-input]'), draft = 'Unsaved evidence with a composition still in progress.';
    expect(editor).not.toBeNull(); editor.focus();
    await act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(editor, draft);
      editor.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(row.querySelector('#galaxy-real-sky-observation-editor-count').textContent).toBe(draft.length + '/600 characters');
    for (const options of RESERVED_KEYS) {
      expect((await key(editor, 'Escape', options)).defaultPrevented).toBe(false);
      expect(row.querySelector('[data-galaxy-real-sky-observation-editor-input]')).toBe(editor);
      expect(editor.value).toBe(draft); expect(instance.state.galaxy.realSkyObservations).toEqual([saved]);
      expect(document.activeElement).toBe(editor);
    }
    expect((await key(editor, 'Escape', { shiftKey })).defaultPrevented).toBe(true);
    await frame();
    expect(row.querySelector('[data-galaxy-real-sky-observation-editor-input]')).toBeNull();
    expect(instance.state.galaxy.realSkyObservations).toEqual([saved]);
    expect(document.activeElement).toBe(row.querySelector('[data-galaxy-real-sky-observation-edit-button]')); clean();
  });
});
