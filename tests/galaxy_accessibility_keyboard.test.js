import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

vi.setConfig({ testTimeout: 120000 });
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const shortcutKeys = ['r', 'h', 'i', '+', '=', '-', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '[', ']', 'PageUp', 'PageDown', 'Escape', 'Home'];
const modifiers = [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { isComposing: true }, { keyCode: 229 }];
const key = (target, value, options = {}) => {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
};

describe('Galaxy keyboard accessibility', () => {
  let host, root, restoreCanvas, restoreThree, loops, originalMedia, errors, now;
  beforeEach(() => {
    resetStemLab(); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window._galaxyHasLoadedOnce = true; window._galaxyPPLoaded = true;
    delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    originalMedia = window.matchMedia;
    window.matchMedia = vi.fn(query => ({ matches: query.includes('prefers-reduced-motion'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    now = 1000000; vi.spyOn(Date, 'now').mockImplementation(() => now);
    restoreCanvas = installCanvas2DStub().restore; restoreThree = installThreeStub(); loops = installLoopStubs();
    const Attribute = window.THREE.BufferAttribute;
    window.THREE.BufferAttribute = function (array, itemSize) {
      const attribute = new Attribute(array, itemSize);
      attribute.setXYZ = (index, x, y, z) => { attribute.array[index * itemSize] = x; attribute.array[index * itemSize + 1] = y; attribute.array[index * itemSize + 2] = z; return attribute; };
      return attribute;
    };
    errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    host = document.createElement('div'); document.body.appendChild(host);
  });
  afterEach(async () => {
    if (root) await React.act(async () => root.unmount()); root = null;
    host.remove(); errors.mockRestore(); loops(); restoreThree(); restoreCanvas(); window.matchMedia = originalMedia;
    delete window.THREE; delete window._galaxyPPLoaded; delete window._galaxyPPLoading; delete window._galaxyPPCallbacks;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT; vi.restoreAllMocks();
  });
  async function act(fn) { await React.act(async () => fn()); }
  async function step() { now += 1000; await act(() => loops.step()); }
  async function mount() {
    window.StemLab.ensureThree = vi.fn(() => Promise.resolve());
    const config = loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
    function Host() {
      const state = React.useState({ galaxy: { simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false } });
      return config.render(makeCtx({ toolData: state[0], setToolData: state[1] }));
    }
    root = ReactDOMClient.createRoot(host); await act(() => root.render(React.createElement(Host)));
    return host.querySelector('[data-galaxy-canvas]');
  }
  function clean() { expect(errors.mock.calls.map(call => call.map(String).join(' ')).filter(message => /\[Galaxy\]|\[StemLab\]/.test(message))).toEqual([]); }

  it.each([true, false])('restores the Crab model and preserves meaningful focus when the recovery button was focused: %s', async focused => {
    const canvas = await mount();
    await act(() => { canvas._galaxyFocusNebula('stem.galaxy.crab_nebula'); canvas._galaxyInspectSelection(); }); await step();
    await act(() => { canvas._galaxySetCrabComponent('filaments', false); canvas._galaxySetCrabComponent('wind', false); }); await step();
    host.querySelector('[data-galaxy-object-context]').open = true;
    const recovery = host.querySelector('[data-galaxy-crab-show-both]');
    const filaments = host.querySelector('[data-galaxy-crab-component="filaments"]');
    const before = { inspection: canvas._galaxyGetInspectionState(), orbit: { ...canvas._galaxyOrbit } };
    if (focused) recovery.focus(); else canvas.focus();
    expect(document.activeElement).toBe(focused ? recovery : canvas);
    await act(() => recovery.click()); await step();
    expect(host.querySelector('[data-galaxy-crab-show-both]')).toBeNull();
    expect(canvas._galaxyGetCrabComponentState()).toEqual({ available: true, filaments: true, wind: true });
    expect(filaments.isConnected).toBe(true);
    expect(filaments.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(focused ? filaments : canvas);
    expect(canvas._galaxyGetInspectionState()).toEqual(before.inspection);
    expect(canvas._galaxyOrbit).toEqual(before.orbit); clean();
  });

  it('leaves browser, assistive-technology and composition chords uncancelled without changing the galaxy', async () => {
    const canvas = await mount(); canvas.focus();
    const before = { ...canvas._galaxyOrbit };
    const reset = vi.spyOn(canvas, '_galaxyResetView'), focus = vi.spyOn(canvas, '_galaxySetFocusView'), inspect = vi.spyOn(canvas, '_galaxyInspectSelection');
    const bubbled = vi.fn(); document.body.addEventListener('keydown', bubbled);
    try {
      for (const options of modifiers) for (const value of shortcutKeys) {
        let event; await act(() => { event = key(canvas, value, options); });
        expect(event.defaultPrevented, JSON.stringify({ value, options })).toBe(false);
        expect(canvas._galaxyOrbit).toEqual(before);
      }
      expect(bubbled).toHaveBeenCalledTimes(modifiers.length * shortcutKeys.length);
      expect(reset).not.toHaveBeenCalled(); expect(focus).not.toHaveBeenCalled(); expect(inspect).not.toHaveBeenCalled();
    } finally { document.body.removeEventListener('keydown', bubbled); }
    clean();
  });

  it('retains ordinary and Shift keyboard operations and scopes character shortcuts to the canvas', async () => {
    const canvas = await mount(); canvas.focus();
    const start = { ...canvas._galaxyOrbit };
    let event; await act(() => { event = key(canvas, 'ArrowRight'); });
    expect(event.defaultPrevented).toBe(true); expect(canvas._galaxyOrbit.theta).toBeCloseTo(start.theta + .1, 10);
    await act(() => { event = key(canvas, 'ArrowLeft', { shiftKey: true }); });
    expect(event.defaultPrevented).toBe(true); expect(canvas._galaxyOrbit.theta).toBeCloseTo(start.theta, 10);
    await act(() => { event = key(canvas, '+', { shiftKey: true }); });
    expect(event.defaultPrevented).toBe(true); expect(canvas._galaxyOrbit.r).toBeLessThan(start.r);
    const reset = vi.spyOn(canvas, '_galaxyResetView');
    await act(() => { event = key(canvas, 'R', { shiftKey: true }); });
    expect(event.defaultPrevented).toBe(true); expect(reset).toHaveBeenCalledTimes(1);
    const outside = document.createElement('input'); host.appendChild(outside); outside.focus();
    const before = { ...canvas._galaxyOrbit };
    for (const value of ['r', 'h', 'i']) { await act(() => { event = key(outside, value); }); expect(event.defaultPrevented).toBe(false); }
    expect(canvas._galaxyOrbit).toEqual(before); expect(reset).toHaveBeenCalledTimes(1); expect(document.activeElement).toBe(outside); clean();
  });

  it('contains fallback fullscreen Tab order, preserves pre-existing inert state, and restores its invoking control', async () => {
    const outside = document.createElement('button'), preserved = document.createElement('aside');
    outside.textContent = 'Invoking control'; preserved.setAttribute('inert', 'preserved');
    document.body.append(outside, preserved);
    try {
      const canvas = await mount(), workspace = canvas.parentElement.parentElement;
      const visible = node => { node.getClientRects = () => [{ width: 44, height: 44 }]; return node; };
      visible(canvas);
      const action = visible(document.createElement('button')); action.textContent = 'Workspace action'; workspace.appendChild(action);
      const disabled = visible(document.createElement('button')); disabled.disabled = true; workspace.appendChild(disabled);
      const hidden = visible(document.createElement('button')); hidden.hidden = true; workspace.appendChild(hidden);
      const omitted = visible(document.createElement('button')); omitted.tabIndex = -1; workspace.appendChild(omitted);
      outside.focus(); await act(() => canvas._galaxyToggleFullscreen());
      const exit = visible(document.querySelector('[data-galaxy-exit-immersive]'));
      expect(outside.hasAttribute('inert')).toBe(true); expect(preserved.getAttribute('inert')).toBe('preserved');
      expect(workspace.closest('[inert]')).toBeNull(); expect(exit.closest('[inert]')).toBeNull(); expect(document.activeElement).toBe(canvas);
      for (const target of [action, exit, canvas]) {
        let event; await act(() => { event = key(document.activeElement, 'Tab'); });
        expect(event.defaultPrevented).toBe(true); expect(document.activeElement).toBe(target);
      }
      await act(() => key(canvas, 'Tab', { shiftKey: true })); expect(document.activeElement).toBe(exit);
      await act(() => key(exit, 'Tab', { shiftKey: true })); expect(document.activeElement).toBe(action);
      await act(() => canvas._galaxyToggleFullscreen());
      expect(outside.hasAttribute('inert')).toBe(false); expect(preserved.getAttribute('inert')).toBe('preserved');
      expect(document.querySelector('[data-galaxy-exit-immersive]')).toBeNull(); expect(document.activeElement).toBe(outside);
      expect(key(outside, 'Tab').defaultPrevented).toBe(false); clean();
    } finally { outside.remove(); preserved.remove(); }
  });

  it('retains fullscreen ownership through nested focus view and releases owned inert state on teardown without stealing focus', async () => {
    const outside = document.createElement('button'), preserved = document.createElement('aside');
    outside.textContent = 'Invoking control'; preserved.setAttribute('inert', 'preserved');
    document.body.append(outside, preserved);
    try {
      const canvas = await mount(); outside.focus();
      await act(() => canvas._galaxyToggleFullscreen());
      await act(() => canvas._galaxySetFocusView(true));
      expect(canvas._galaxyIsFocusView()).toBe(true); expect(canvas._galaxyIsFullscreen()).toBe(true);
      expect(document.querySelector('[data-galaxy-exit-immersive]')).toBeNull(); expect(outside.hasAttribute('inert')).toBe(true);
      await act(() => canvas._galaxySetFocusView(false));
      expect(canvas._galaxyIsFullscreen()).toBe(true); expect(outside.hasAttribute('inert')).toBe(true);
      expect(document.querySelector('[data-galaxy-exit-immersive]').closest('[inert]')).toBeNull();
      await act(() => canvas._galaxyToggleFullscreen());
      expect(document.activeElement).toBe(outside); expect(outside.hasAttribute('inert')).toBe(false);
      // Focus view may also create and own fallback fullscreen itself.
      await act(() => canvas._galaxySetFocusView(true));
      expect(canvas._galaxyIsFullscreen()).toBe(true); expect(outside.hasAttribute('inert')).toBe(true);
      const restore = vi.spyOn(outside, 'focus');
      await act(() => root.unmount()); root = null;
      expect(restore).not.toHaveBeenCalled();
      expect(outside.hasAttribute('inert')).toBe(false); expect(preserved.getAttribute('inert')).toBe('preserved');
      expect(document.querySelector('[data-galaxy-exit-immersive]')).toBeNull();
      expect(key(outside, 'Tab').defaultPrevented).toBe(false); clean();
    } finally { outside.remove(); preserved.remove(); }
  });
});

// Execute the actual native event handler with controlled scene dependencies.
// Building the optical renderer is unnecessary to verify whether this listener
// consumes a browser shortcut before it reaches zoom or fragment controls.
const bhStart = source.indexOf('function onBhKey(e){');
const bhEnd = source.indexOf("\n            canvas.addEventListener('pointerdown'", bhStart);
const blackHoleKeyboard = new Function('canvas', 'blackHoleLaunchCommit', '__alloT', `
  var activeBhPointer = null, opticalEnabled = true, yaw = 0, pitch = 0, zooms = [];
  function onBhCancel() {}
  function zoomCamera(amount) { zooms.push(amount); }
  ${source.slice(bhStart, bhEnd)}
  return { handle: onBhKey, state: function () { return { yaw: yaw, pitch: pitch, zooms: zooms.slice() }; } };
`);

describe('Black hole native keyboard shortcut boundaries', () => {
  function setup() {
    const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
    canvas._nudgeBlackHoleLaunch = vi.fn(() => false); canvas._cycleBlackHoleFragment = vi.fn(() => false); canvas._setBlackHoleCamera = vi.fn();
    const keyboard = blackHoleKeyboard(canvas, { current: vi.fn() }, (id, fallback) => fallback);
    canvas.addEventListener('keydown', keyboard.handle);
    return { canvas, keyboard };
  }
  it('passes through modified and composition keys before touching launch, zoom or camera state', () => {
    const { canvas, keyboard } = setup(), bubbled = vi.fn(); document.body.addEventListener('keydown', bubbled);
    try {
      for (const options of modifiers) for (const value of shortcutKeys) expect(key(canvas, value, options).defaultPrevented).toBe(false);
      expect(keyboard.state()).toEqual({ yaw: 0, pitch: 0, zooms: [] });
      expect(canvas._nudgeBlackHoleLaunch).not.toHaveBeenCalled(); expect(canvas._cycleBlackHoleFragment).not.toHaveBeenCalled(); expect(canvas._setBlackHoleCamera).not.toHaveBeenCalled();
      expect(bubbled).toHaveBeenCalledTimes(modifiers.length * shortcutKeys.length);
    } finally { document.body.removeEventListener('keydown', bubbled); canvas.remove(); }
  });
  it('keeps ordinary camera navigation, Shift zoom and reset operable', () => {
    const { canvas, keyboard } = setup();
    try {
      for (const [value, options] of [['ArrowRight', {}], ['ArrowUp', { shiftKey: true }], ['+', { shiftKey: true }], ['-', {}], ['Home', {}]]) expect(key(canvas, value, options).defaultPrevented).toBe(true);
      expect(keyboard.state()).toEqual({ yaw: .1, pitch: .1, zooms: [-.075, .075] });
      expect(canvas._setBlackHoleCamera).toHaveBeenCalledWith('angled');
    } finally { canvas.remove(); }
  });
});

const launchBlock = source.slice(source.indexOf("id:'black-hole-launch-handle'"));
const launchStart = launchBlock.indexOf('onKeyDown:') + 'onKeyDown:'.length;
const launchKeyboard = new Function('blackHoleCanvasActive', 'return (' + launchBlock.slice(launchStart, launchBlock.indexOf(',onClick:', launchStart)) + ');');
const focusStart = source.indexOf('function galaxyFocusOnKey(event)');
const focusSource = source.slice(focusStart, source.indexOf('canvasEl._galaxySetFocusView = function', focusStart));
const focusKeyboard = new Function('canvasEl', 'galaxyFocusFrame', 'galaxyFocusReveal', 'var galaxyFocusActive=true;' + focusSource + ';return galaxyFocusOnKey;');
const fullscreenStart = source.indexOf('function galaxyFsOnKey(event)');
const fullscreenSource = source.slice(fullscreenStart, source.indexOf('// Native fullscreen paints', fullscreenStart));
const fullscreenKeyboard = new Function('canvasEl', 'galaxyFsExitCss', 'galaxyCssFullscreen', 'galaxyFocusActive', fullscreenSource + ';return galaxyFsOnKey;');

describe('Keyboard boundaries around launch handles and immersive views', () => {
  it('keeps launch-handle chords and React composition keys untouched while ordinary arrow nudges remain available', () => {
    const nudge = vi.fn(() => true), handle = launchKeyboard({ current: { _nudgeBlackHoleLaunch: nudge } });
    for (const options of [...modifiers, { nativeEvent: { isComposing: true } }]) {
      const event = { key: 'ArrowLeft', preventDefault: vi.fn(), ...options };
      handle(event); expect(event.preventDefault).not.toHaveBeenCalled();
    }
    expect(nudge).not.toHaveBeenCalled();
    for (const options of [{}, { shiftKey: true }]) {
      const event = { key: 'ArrowRight', preventDefault: vi.fn(), ...options };
      handle(event); expect(event.preventDefault).toHaveBeenCalledOnce();
    }
    expect(nudge.mock.calls).toEqual([['ArrowRight'], ['ArrowRight']]);
  });

  function focusSetup() {
    const frame = document.createElement('div');
    frame.innerHTML = '<canvas tabindex="0"></canvas><button data-galaxy-focus-exit>Exit focus view</button>';
    document.body.appendChild(frame);
    const canvas = frame.querySelector('canvas'), exit = frame.querySelector('button');
    canvas._galaxySetFocusView = vi.fn();
    const reveal = vi.fn(), handle = focusKeyboard(canvas, frame, reveal);
    document.addEventListener('keydown', handle, true); canvas.focus();
    return { frame, canvas, exit, reveal, handle, clean() { document.removeEventListener('keydown', handle, true); frame.remove(); } };
  }

  it('does not exit focus view or trap a browser/IME chord intercepted at document capture', () => {
    const state = focusSetup(), bubbled = vi.fn(); document.body.addEventListener('keydown', bubbled);
    try {
      for (const options of modifiers) for (const value of ['h', 'H', 'Escape', 'Tab']) expect(key(state.canvas, value, options).defaultPrevented).toBe(false);
      expect(state.canvas._galaxySetFocusView).not.toHaveBeenCalled(); expect(state.reveal).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(state.canvas); expect(bubbled).toHaveBeenCalledTimes(modifiers.length * 4);
    } finally { document.body.removeEventListener('keydown', bubbled); state.clean(); }
  });

  it('keeps unmodified and Shift Tab inside focus view and retains its ordinary exit shortcuts', () => {
    const state = focusSetup();
    try {
      expect(key(state.canvas, 'Tab').defaultPrevented).toBe(true); expect(document.activeElement).toBe(state.exit);
      expect(key(state.exit, 'Tab', { shiftKey: true }).defaultPrevented).toBe(true); expect(document.activeElement).toBe(state.canvas);
      expect(state.reveal).toHaveBeenCalledTimes(2);
      expect(key(state.canvas, 'Escape').defaultPrevented).toBe(true);
      expect(key(state.canvas, 'H', { shiftKey: true }).defaultPrevented).toBe(true);
      expect(state.canvas._galaxySetFocusView.mock.calls).toEqual([[false], [false]]);
    } finally { state.clean(); }
  });

  it('lets Escape dismiss composition or browser chords without closing CSS fullscreen', () => {
    const canvas = document.createElement('canvas'); document.body.appendChild(canvas);
    canvas._galaxySetFocusView = vi.fn();
    const exit = vi.fn(), handle = fullscreenKeyboard(canvas, exit, true, false), bubbled = vi.fn();
    document.addEventListener('keydown', handle, true); document.body.addEventListener('keydown', bubbled);
    try {
      for (const options of modifiers) expect(key(canvas, 'Escape', options).defaultPrevented).toBe(false);
      expect(exit).not.toHaveBeenCalled(); expect(canvas._galaxySetFocusView).not.toHaveBeenCalled(); expect(bubbled).toHaveBeenCalledTimes(modifiers.length);
      expect(key(canvas, 'Escape').defaultPrevented).toBe(true); expect(exit).toHaveBeenCalledOnce();
    } finally { document.removeEventListener('keydown', handle, true); document.body.removeEventListener('keydown', bubbled); canvas.remove(); }
  });
});
