import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs } from './helpers/galaxy_three_stub.js';

const RESERVED_KEYS = [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }];

describe('Galaxy H-R chart accessible focus', () => {
  let instances, outside, restoreCanvas, loops, originalMedia, originalLoaded, errors, config;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    originalLoaded = window._galaxyHasLoadedOnce; window._galaxyHasLoadedOnce = true;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {} }));
    restoreCanvas = installCanvas2DStub().restore; loops = installLoopStubs();
    window.StemLab.ensureThree = vi.fn(() => new Promise(() => {}));
    config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); instances = [];
    outside = document.createElement('button'); outside.textContent = 'Outside the tool'; document.body.appendChild(outside);
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(async () => {
    for (const instance of instances) { if (instance.root) await React.act(async () => instance.root.unmount()); instance.host.remove(); }
    outside.remove(); loops(); restoreCanvas(); window.matchMedia = originalMedia;
    if (originalLoaded === undefined) delete window._galaxyHasLoadedOnce; else window._galaxyHasLoadedOnce = originalLoaded;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  const act = async fn => React.act(async () => fn());
  async function frame() { await act(() => loops.step()); }
  async function mount(data = {}) {
    const instance = { host: document.createElement('div'), root: null, state: null };
    document.body.appendChild(instance.host); instances.push(instance);
    function Host() {
      const pair = React.useState({ galaxy: { simMode: 'star', lifecycleMass: 1, activeStage: 'main_sequence', ...data } });
      instance.state = pair[0];
      return config.render(makeCtx({ toolData: pair[0], setToolData: pair[1] }));
    }
    instance.root = ReactDOMClient.createRoot(instance.host); await act(() => instance.root.render(React.createElement(Host)));
    return instance;
  }
  function point(instance, id) { const node = instance.host.querySelector('[data-galaxy-hr-stage="' + id + '"]'); expect(node).not.toBeNull(); return node; }
  async function key(target, value, options = {}) {
    const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
    await act(() => target.dispatchEvent(event)); return event;
  }
  function clean() { expect(errors.mock.calls.flat().map(String).filter(message => /\[Galaxy\]|\[StemLab\]|unmounted component/i.test(message))).toEqual([]); }

  it('keeps ordinary and Shift arrows, Home, End and endpoint focus aligned with the selected plotted stage', async () => {
    const instance = await mount(); point(instance, 'main_sequence').focus();
    for (const [navigation, destination, options] of [
      ['ArrowRight', 'red_giant', { shiftKey: true }], ['ArrowUp', 'main_sequence'], ['Home', 'protostar'],
      ['ArrowLeft', 'protostar'], ['End', 'white_dwarf'], ['ArrowDown', 'white_dwarf'],
      ['ArrowLeft', 'planetary_nebula', { shiftKey: true }]
    ]) {
      expect((await key(document.activeElement, navigation, options)).defaultPrevented).toBe(true); await frame();
      const selected = point(instance, destination);
      expect(instance.state.galaxy.activeStage).toBe(destination); expect(document.activeElement).toBe(selected);
      expect([...instance.host.querySelectorAll('[data-galaxy-hr-stage][tabindex="0"]')]).toEqual([selected]);
      expect([...instance.host.querySelectorAll('[data-galaxy-hr-stage][aria-pressed="true"]')]).toEqual([selected]);
    }
    clean();
  });

  it('selects the focused point with Enter and Space while retaining its focus', async () => {
    const instance = await mount(), origin = point(instance, 'protostar'); origin.focus();
    for (const [activation, options] of [['Enter', {}], [' ', {}], ['Enter', { shiftKey: true }], [' ', { shiftKey: true }]]) {
      expect((await key(origin, activation, options)).defaultPrevented).toBe(true); await frame();
      expect(instance.state.galaxy.activeStage).toBe('protostar'); expect(document.activeElement).toBe(origin);
      expect(origin.getAttribute('aria-pressed')).toBe('true');
    }
    clean();
  });

  it('leaves browser, assistive-technology and composition key combinations unconsumed without moving or selecting', async () => {
    const instance = await mount(), origin = point(instance, 'main_sequence'); origin.focus();
    for (const options of RESERVED_KEYS) for (const navigation of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' ']) {
      expect((await key(origin, navigation, options)).defaultPrevented).toBe(false);
      expect(instance.state.galaxy.activeStage).toBe('main_sequence');
    }
    await frame(); expect(document.activeElement).toBe(origin); expect(origin.getAttribute('aria-pressed')).toBe('true'); clean();
  });

  it.each(['outside', 'inside'])('preserves focus moved %s the chart before its navigation handoff', async destination => {
    const instance = await mount(), origin = point(instance, 'main_sequence'); origin.focus();
    await key(origin, 'ArrowRight');
    const target = destination === 'outside' ? outside : instance.host.querySelector('[data-galaxy-star-keep]'); target.focus();
    await frame(); expect(instance.state.galaxy.activeStage).toBe('red_giant'); expect(document.activeElement).toBe(target); clean();
  });

  it('does not take focus after an unfocused programmatic navigation event', async () => {
    const instance = await mount(); outside.focus();
    await key(point(instance, 'main_sequence'), 'ArrowRight'); await frame();
    expect(instance.state.galaxy.activeStage).toBe('red_giant'); expect(document.activeElement).toBe(outside); clean();
  });

  it('keeps the deferred focus handoff in the initiating tool instance', async () => {
    const first = await mount(), second = await mount(), origin = point(second, 'main_sequence'); origin.focus();
    await key(origin, 'End'); await frame();
    expect(document.activeElement).toBe(point(second, 'white_dwarf'));
    expect(first.state.galaxy.activeStage).toBe('main_sequence'); expect(point(first, 'main_sequence').getAttribute('aria-pressed')).toBe('true'); clean();
  });

  it('cancels a pending handoff when the initiating tool unmounts without focusing another instance', async () => {
    const first = await mount(), second = await mount(), origin = point(second, 'main_sequence'); origin.focus();
    await key(origin, 'End'); await act(() => second.root.unmount()); second.root = null;
    outside.focus(); await frame();
    expect(document.activeElement).toBe(outside); expect(first.state.galaxy.activeStage).toBe('main_sequence'); clean();
  });
});
