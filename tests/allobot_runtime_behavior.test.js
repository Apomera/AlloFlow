import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const COARSE_POINTER_QUERY = '(hover: none), (pointer: coarse)';

let React;
let createRoot;
let AlloBot;
let mountedRoots;

const defaultProps = {
  canPlayIntro: false,
  hasSeenBotIntro: true,
  idleSleepMs: 60 * 60 * 1000,
  soundEnabled: false,
};

function installMatchMedia({ reducedMotion = false, coarsePointer = false } = {}) {
  const records = new Map();
  const ensureRecord = (query) => {
    if (records.has(query)) return records.get(query);
    const changeListeners = new Set();
    const legacyListeners = new Set();
    const mql = {
      matches: query === MOTION_QUERY
        ? reducedMotion
        : (query === COARSE_POINTER_QUERY && coarsePointer),
      media: query,
      onchange: null,
      addEventListener: vi.fn((type, listener) => {
        if (type === 'change') changeListeners.add(listener);
      }),
      removeEventListener: vi.fn((type, listener) => {
        if (type === 'change') changeListeners.delete(listener);
      }),
      addListener: vi.fn((listener) => legacyListeners.add(listener)),
      removeListener: vi.fn((listener) => legacyListeners.delete(listener)),
      dispatchEvent: vi.fn((event) => {
        changeListeners.forEach((listener) => listener(event));
        legacyListeners.forEach((listener) => listener(event));
        if (typeof mql.onchange === 'function') mql.onchange(event);
        return true;
      }),
    };
    const record = { mql };
    records.set(query, record);
    return record;
  };
  window.matchMedia = vi.fn((query) => ensureRecord(query).mql);
  return {
    get(query) {
      return ensureRecord(query).mql;
    },
    setMatches(query, matches) {
      const { mql } = ensureRecord(query);
      if (mql.matches === matches) return;
      mql.matches = matches;
      mql.dispatchEvent({ matches, media: query });
    },
  };
}

function pointerEvent(type, { pointerType = 'mouse', relatedTarget = null } = {}) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, relatedTarget });
  Object.defineProperty(event, 'pointerType', { configurable: true, value: pointerType });
  return event;
}

function loadAlloBotFromSource() {
  const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
  const { transformSync } = require(resolve(modulesDir, '@babel/core'));
  const transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));
  const source = readFileSync(resolve(process.cwd(), 'allobot_source.jsx'), 'utf8');
  const entry = source + '\nwindow.__allobotRuntimeSource = { AlloBot };';
  const { code } = transformSync(entry, {
    babelrc: false,
    configFile: false,
    filename: 'allobot_source.jsx',
    plugins: [[transformReactJsx, {
      runtime: 'classic',
      pragma: 'React.createElement',
      pragmaFrag: 'React.Fragment',
    }]],
  });
  const preamble = `
    var React = window.React;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var useCallback = React.useCallback;
    var useMemo = React.useMemo;
    var useContext = React.useContext;
    var useImperativeHandle = React.useImperativeHandle;
    var LanguageContext = window.AlloLanguageContext;
    var safeGetItem = function(key) { try { return localStorage.getItem(key); } catch (_) { return null; } };
    var safeSetItem = function(key, value) { try { localStorage.setItem(key, value); } catch (_) {} };
    var warnLog = function() {};
    var debugLog = function() {};
    var getGlobalAudioContext = function() { return null; };
    var isGlobalMuted = function() { return false; };
    var STYLE_ANIMATION_DELAY_HALF = { animationDelay: '0.5s' };
    var STYLE_POINTER_EVENTS_NONE = { pointerEvents: 'none' };
    var _icons = window.AlloIcons || {};
    var Mic = _icons.Mic || function() { return null; };
    var MicOff = _icons.MicOff || function() { return null; };
    var Volume2 = _icons.Volume2 || function() { return null; };
    var VolumeX = _icons.VolumeX || function() { return null; };
    var Settings = _icons.Settings || function() { return null; };
    var X = _icons.X || function() { return null; };
    var generatedContent;
    var userRole;
  `;
  new Function(preamble + '\n' + code)();
  return window.__allobotRuntimeSource.AlloBot;
}

async function mountBot(props = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  await React.act(async () => {
    root.render(React.createElement(AlloBot, { ...defaultProps, ...props }));
  });
  return {
    container,
    root,
    async rerender(nextProps = {}) {
      await React.act(async () => {
        root.render(React.createElement(AlloBot, { ...defaultProps, ...nextProps }));
      });
    },
    async unmount() {
      if (!mountedRoots.delete(root)) return;
      await React.act(async () => root.unmount());
      container.remove();
    },
  };
}

async function advance(milliseconds) {
  await React.act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

function dispatch(target, event) {
  return React.act(async () => {
    target.dispatchEvent(event);
  });
}

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client')));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  if (!window.requestAnimationFrame) window.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  if (!window.cancelAnimationFrame) window.cancelAnimationFrame = clearTimeout;
  installMatchMedia();
  AlloBot = loadAlloBotFromSource();
});

beforeEach(() => {
  mountedRoots = new Set();
  localStorage.clear();
  installMatchMedia();
  vi.useFakeTimers();
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(async () => {
  for (const root of [...mountedRoots]) {
    await React.act(async () => root.unmount());
  }
  mountedRoots.clear();
  document.body.innerHTML = '';
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('AlloBot runtime motion behavior', () => {
  it('closes, reopens, and reschedules its blink while cleaning every timer on unmount', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const bot = await mountBot();
    const leftEye = () => bot.container.querySelector('[data-allobot-eye="left"]');
    const details = () => bot.container.querySelector('[data-allobot-eye-details]');

    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(6.2);
    expect(details().getAttribute('data-allobot-eye-details')).toBe('visible');

    await advance(2999);
    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(6.2);

    await advance(1);
    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(0.62);
    expect(details().getAttribute('data-allobot-eye-details')).toBe('hidden');
    expect(details().getAttribute('opacity')).toBe('0');

    await advance(150);
    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(6.2);
    expect(details().getAttribute('data-allobot-eye-details')).toBe('visible');

    await advance(3000);
    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(0.62);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    const activeBlinkTimerIndex = setTimeoutSpy.mock.calls.findLastIndex(([, delay]) => delay === 150);
    expect(activeBlinkTimerIndex).toBeGreaterThanOrEqual(0);
    const activeBlinkTimer = setTimeoutSpy.mock.results[activeBlinkTimerIndex].value;

    await bot.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(activeBlinkTimer);
  });

  it('cancels a pending outer blink timer when unmounted before the first blink', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const bot = await mountBot();
    const pendingBlinkIndex = setTimeoutSpy.mock.calls.findLastIndex(([, delay]) => delay === 3000);

    expect(pendingBlinkIndex).toBeGreaterThanOrEqual(0);
    const pendingBlinkTimer = setTimeoutSpy.mock.results[pendingBlinkIndex].value;
    await bot.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(pendingBlinkTimer);
  });

  it('stops blinking while asleep and restarts a fresh cadence after a deliberate wake', async () => {
    const bot = await mountBot();
    const surface = () => bot.container.querySelector('[data-allobot-control-surface="true"]');
    const sleepButton = bot.container.querySelector('[data-help-key="bot_sleep_btn"]');

    expect(sleepButton).toBeTruthy();
    await dispatch(sleepButton, new MouseEvent('click', { bubbles: true, cancelable: true }));
    await advance(400);

    expect(surface().getAttribute('data-allobot-body-state')).toBe('sleeping');
    expect(bot.container.querySelector('[data-allobot-eye-details]')).toBeNull();
    await advance(10000);
    expect(surface().getAttribute('data-allobot-body-state')).toBe('sleeping');

    await dispatch(surface(), new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));
    expect(surface().getAttribute('data-allobot-body-state')).not.toBe('sleeping');
    expect(bot.container.querySelector('[data-allobot-eye-details]')?.getAttribute('data-allobot-eye-details')).toBe('visible');

    await advance(2999);
    expect(bot.container.querySelector('[data-allobot-eye-details]')?.getAttribute('data-allobot-eye-details')).toBe('visible');
    await advance(1);
    expect(bot.container.querySelector('[data-allobot-eye-details]')?.getAttribute('data-allobot-eye-details')).toBe('hidden');
  });

  it('clears the pending wake animation timer when unmounted immediately after summon', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const bot = await mountBot();
    const sleepButton = bot.container.querySelector('[data-help-key="bot_sleep_btn"]');

    await dispatch(sleepButton, new MouseEvent('click', { bubbles: true, cancelable: true }));
    await advance(400);
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    await dispatch(surface, new MouseEvent('mousedown', { bubbles: true, clientX: 50, clientY: 50 }));

    const wakeTimerIndex = setTimeoutSpy.mock.calls.findLastIndex(([, delay]) => delay === 1500);
    expect(wakeTimerIndex).toBeGreaterThanOrEqual(0);
    const wakeTimer = setTimeoutSpy.mock.results[wakeTimerIndex].value;
    await bot.unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(wakeTimer);
  });

  it('cancels a delayed dismiss callback when the host unmounts first', async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const onHide = vi.fn();
    const bot = await mountBot({ onHide });
    const sleepButton = bot.container.querySelector('[data-help-key="bot_sleep_btn"]');

    await dispatch(sleepButton, new MouseEvent('click', { bubbles: true, cancelable: true }));
    const dismissTimerIndex = setTimeoutSpy.mock.calls.findLastIndex(([, delay]) => delay === 400);
    expect(dismissTimerIndex).toBeGreaterThanOrEqual(0);
    const dismissTimer = setTimeoutSpy.mock.results[dismissTimerIndex].value;
    await bot.unmount();
    await advance(400);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(dismissTimer);
    expect(onHide).not.toHaveBeenCalled();
  });

  it('tracks only during direct hover, clamps the glance, then removes and resets it on leave', async () => {
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });

    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(gaze().style.transform).toBe('translate(0px, 0px)');
    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
    expect(gaze().style.transform).toBe('translate(0px, 0px)');

    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    await dispatch(surface, pointerEvent('pointerover'));
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('engaged');
    const gazeRegistration = addSpy.mock.calls.find(([type]) => type === 'mousemove');
    expect(gazeRegistration).toBeTruthy();

    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
    expect(gaze().style.transform).toBe('translate(1.35px, 0px)');
    await dispatch(window, new MouseEvent('mousemove', { clientX: 50, clientY: 1000 }));
    const [, gazeX, gazeY] = gaze().style.transform.match(/^translate\(([-+\de.]+)px, ([-+\de.]+)px\)$/) || [];
    expect(Math.abs(Number(gazeX))).toBeLessThan(1e-10);
    expect(Number(gazeY)).toBeCloseTo(1.15);

    await dispatch(surface, pointerEvent('pointerout'));
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(gaze().style.transform).toBe('translate(0px, 0px)');
    expect(removeSpy).toHaveBeenCalledWith('mousemove', gazeRegistration[1]);

    await dispatch(window, new MouseEvent('mousemove', { clientX: -1000, clientY: 50 }));
    expect(gaze().style.transform).toBe('translate(0px, 0px)');
  });

  it.each([
    ['coarse pointer compatibility hover', { coarsePointer: true }, 'mouse'],
    ['touch pointer hover', {}, 'touch'],
  ])('suppresses gaze for %s', async (_label, mediaOptions, pointerType) => {
    installMatchMedia(mediaOptions);
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
    const addSpy = vi.spyOn(window, 'addEventListener');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });

    await dispatch(surface, pointerEvent('pointerover', { pointerType }));
    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));

    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(gaze().style.transform).toBe('translate(0px, 0px)');
    expect(addSpy.mock.calls.some(([type]) => type === 'mousemove')).toBe(false);
  });

  it('resets an active gaze on pointer cancellation and window blur', async () => {
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });
    const engage = async () => {
      await dispatch(surface, pointerEvent('pointerover'));
      await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
      expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('engaged');
      expect(gaze().style.transform).not.toBe('translate(0px, 0px)');
    };

    await engage();
    await dispatch(surface, pointerEvent('pointercancel'));
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(gaze().style.transform).toBe('translate(0px, 0px)');

    await engage();
    await dispatch(window, new Event('blur'));
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(gaze().style.transform).toBe('translate(0px, 0px)');
  });

  it('resets an active gaze when the document becomes hidden', async () => {
    const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    let visibilityState = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityState,
    });
    try {
      const bot = await mountBot();
      const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
      const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
      surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });

      await dispatch(surface, pointerEvent('pointerover'));
      await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
      expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('engaged');

      visibilityState = 'hidden';
      await dispatch(document, new Event('visibilitychange'));
      expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
      expect(gaze().style.transform).toBe('translate(0px, 0px)');
    } finally {
      if (originalVisibility) Object.defineProperty(document, 'visibilityState', originalVisibility);
      else delete document.visibilityState;
    }
  });

  it('keeps a side-prop glance static until the user explicitly hovers', async () => {
    const bot = await mountBot({ accessory: 'microscope' });
    const gaze = () => bot.container.querySelector('[data-allobot-prop-gaze]');

    expect(gaze().getAttribute('data-allobot-prop-gaze')).toBe('left');
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('prop');
    expect(gaze().style.transform).toBe('translate(-0.85px, 0.2px)');

    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 1000 }));
    expect(gaze().style.transform).toBe('translate(-0.85px, 0.2px)');
  });

  it.each([
    ['app setting', { disableAnimations: true }, false],
    ['operating-system preference', {}, true],
  ])('suppresses pointer gaze and blinking for the %s', async (_label, props, osReducedMotion) => {
    installMatchMedia({ reducedMotion: osReducedMotion });
    const bot = await mountBot(props);
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });

    expect(surface.className).toContain('allobot-motion-disabled');
    expect(gaze().style.transition).toBe('none');
    await dispatch(surface, pointerEvent('pointerover'));
    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
    await advance(10000);

    expect(gaze().style.transform).toBe('translate(0px, 0px)');
    expect(gaze().getAttribute('data-allobot-eye-details')).toBe('visible');
    expect(Number(bot.container.querySelector('[data-allobot-eye="left"]').getAttribute('ry'))).toBeCloseTo(6.2);
  });

  it('applies live operating-system motion changes and removes the media listener on unmount', async () => {
    const media = installMatchMedia();
    const motionQuery = media.get(MOTION_QUERY);
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
    const leftEye = () => bot.container.querySelector('[data-allobot-eye="left"]');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });
    const registration = motionQuery.addEventListener.mock.calls.find(([type]) => type === 'change');

    expect(registration).toBeTruthy();
    await dispatch(surface, pointerEvent('pointerover'));
    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('engaged');
    expect(gaze().style.transform).toBe('translate(1.35px, 0px)');
    await advance(3000);
    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(0.62);

    await React.act(async () => media.setMatches(MOTION_QUERY, true));
    expect(surface.className).toContain('allobot-motion-disabled');
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(gaze().style.transform).toBe('translate(0px, 0px)');
    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(6.2);

    await React.act(async () => media.setMatches(MOTION_QUERY, false));
    expect(surface.className).not.toContain('allobot-motion-disabled');
    await advance(3000);
    expect(Number(leftEye().getAttribute('ry'))).toBeCloseTo(0.62);

    await bot.unmount();
    expect(motionQuery.removeEventListener).toHaveBeenCalledWith('change', registration[1]);
  });
});
