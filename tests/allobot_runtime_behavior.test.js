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
    var getGlobalAudioContext = function() { return window.__allobotRuntimeAudioContext || null; };
    var isGlobalMuted = function() { return !!window.__allobotRuntimeGlobalMuted; };
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

async function mountBot(props = {}, { ref = null, languageValue = null } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  const renderTree = (nextProps) => {
    const bot = React.createElement(AlloBot, { ...defaultProps, ...nextProps, ref });
    return languageValue
      ? React.createElement(window.AlloLanguageContext.Provider, { value: languageValue }, bot)
      : bot;
  };
  await React.act(async () => {
    root.render(renderTree(props));
  });
  return {
    container,
    root,
    async rerender(nextProps = {}) {
      await React.act(async () => {
        root.render(renderTree(nextProps));
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
    // The bead keeps squashing rather than vanishing with the gloss: a blink is
    // an eye closing, not an eye being deleted for 150ms.
    expect(leftEye().closest('[data-allobot-eye-details]')).toBeNull();

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

    const wakeButton = bot.container.querySelector('[data-allobot-avatar-action="wake"]');
    expect(wakeButton).toBeTruthy();
    await dispatch(wakeButton, new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
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
    const wakeButton = bot.container.querySelector('[data-allobot-avatar-action="wake"]');
    expect(wakeButton).toBeTruthy();
    await dispatch(wakeButton, new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));

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

  it('glances gently at the cursor from anywhere, turns fully on hover, and eases back on leave', async () => {
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });
    const parse = () => {
      const [, x, y] = gaze().style.transform.match(/^translate\(([-+\de.]+)px, ([-+\de.]+)px\)$/) || [];
      return { x: Number(x), y: Number(y) };
    };

    // Ambient: not hovered, the pointer far to the right → a partial (0.8×) glance.
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    await dispatch(window, new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));
    expect(parse().x).toBeCloseTo(0);
    expect(parse().y).toBeCloseTo(0);
    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
    expect(parse().x).toBeCloseTo(2.2 * 0.8);
    expect(Math.abs(parse().y)).toBeLessThan(1e-10);
    // Ambient sensitivity is wider (320px), so a nearby pointer barely moves the eyes.
    await dispatch(window, new MouseEvent('mousemove', { clientX: 130, clientY: 50 }));
    expect(parse().x).toBeCloseTo(2.2 * 0.8 * (80 / 320));

    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    await dispatch(surface, pointerEvent('pointerover'));
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('engaged');
    const gazeRegistration = addSpy.mock.calls.find(([type]) => type === 'mousemove');
    expect(gazeRegistration).toBeTruthy();

    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
    // Hovered, the full radius runs into the horizontal clamp.
    expect(gaze().style.transform).toBe('translate(1.8px, 0px)');
    await dispatch(window, new MouseEvent('mousemove', { clientX: 50, clientY: 1000 }));
    expect(Math.abs(parse().x)).toBeLessThan(1e-10);
    expect(parse().y).toBeCloseTo(1.15);

    // Leaving drops the hover boost but keeps the ambient glance alive.
    await dispatch(surface, pointerEvent('pointerout'));
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(removeSpy).toHaveBeenCalledWith('mousemove', gazeRegistration[1]);
    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));
    expect(parse().x).toBeCloseTo(2.2 * 0.8);

    // Still ambient after leaving: a far-left pointer gives the mirrored partial glance.
    await dispatch(window, new MouseEvent('mousemove', { clientX: -1000, clientY: 50 }));
    expect(parse().x).toBeCloseTo(-2.2 * 0.8);
  });

  it.each([
    ['coarse pointer compatibility hover', { coarsePointer: true }, 'mouse'],
    ['touch pointer hover', {}, 'touch'],
  ])('suppresses gaze for %s', async (_label, mediaOptions, pointerType) => {
    installMatchMedia(mediaOptions);
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-soft-gaze]');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });

    await dispatch(surface, pointerEvent('pointerover', { pointerType }));
    // A real touch pointer flips the orbit to persistent and stops the glance.
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('persistent');
    const addSpy = vi.spyOn(window, 'addEventListener');
    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 50 }));

    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('resting');
    expect(gaze().style.transform).toBe('translate(0px, 0px)');
    expect(addSpy.mock.calls.some(([type]) => type === 'mousemove')).toBe(false);
  });

  it('returns to reveal-on-hover controls once a mouse is used again after touch', async () => {
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('reveal');
    await dispatch(surface, pointerEvent('pointerdown', { pointerType: 'touch' }));
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('persistent');
    await dispatch(surface, pointerEvent('pointerover', { pointerType: 'mouse' }));
    expect(surface.getAttribute('data-allobot-control-visibility')).toBe('reveal');
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

  it('blends a side-prop glance with the ambient cursor glance', async () => {
    const bot = await mountBot({ accessory: 'microscope' });
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const gaze = () => bot.container.querySelector('[data-allobot-prop-gaze]');
    surface.getBoundingClientRect = () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON() {} });

    expect(gaze().getAttribute('data-allobot-prop-gaze')).toBe('left');
    expect(gaze().getAttribute('data-allobot-soft-gaze')).toBe('prop');
    expect(gaze().style.transform).toBe('translate(-0.85px, 0.2px)');

    await dispatch(window, new MouseEvent('mousemove', { clientX: 1000, clientY: 1000 }));
    const [, x, y] = gaze().style.transform.match(/^translate\(([-+\de.]+)px, ([-+\de.]+)px\)$/) || [];
    const ambient = 2.2 * 0.8 * Math.SQRT1_2;
    expect(Number(x)).toBeCloseTo(-0.85 + ambient);
    // The prop glance plus the ambient glance runs into the vertical clamp.
    expect(Number(y)).toBeCloseTo(Math.min(1.15, 0.2 + ambient));
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
    expect(bot.container.querySelector('[data-allobot-eye-details]').getAttribute('data-allobot-eye-details')).toBe('visible');
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
    expect(gaze().style.transform).toBe('translate(1.8px, 0px)');
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

describe('AlloBot position and drag hardening', () => {
  it.each([
    ['JSON null', 'null'],
    ['array', '[]'],
    ['missing coordinates', '{}'],
    ['non-numeric coordinates', '{"x":"far","y":null}'],
    ['invalid JSON', '{not-json'],
  ])('falls back safely for a persisted %s position', async (_label, saved) => {
    localStorage.setItem('allo_bot_pos_v2', saved);
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');

    expect(surface.style.right).toBe('24px');
    expect(surface.style.top).toBe('20px');
  });

  it('lifts the bot while the generation hologram shows so the stage rail stays on screen', async () => {
    // The hologram tower is drawn above the 100-unit box, up to y -54, which is
    // 35px above the avatar at render size. The clamp allows a 10px top and the
    // default is 20px, so at the default position the stage rail was entirely
    // off-screen for every generation. The lift is a render-time offset, never
    // written to position, and it goes away with the hologram.
    const bot = await mountBot({ mood: 'thinking', generationType: 'lesson', generationStage: 'build' });
    const surface = () => bot.container.querySelector('[data-allobot-control-surface="true"]');
    expect(surface().style.top).toBe('45px');
    expect(surface().getAttribute('data-allobot-hud-lift')).toBe('25');
    expect(localStorage.getItem('allo_bot_pos_v2')).toBeNull();

    await bot.rerender({ mood: 'idle' });
    expect(surface().style.top).toBe('20px');
    expect(surface().hasAttribute('data-allobot-hud-lift')).toBe(false);
  });

  it('clamps a persisted off-screen position into the reachable viewport', async () => {
    localStorage.setItem('allo_bot_pos_v2', JSON.stringify({ x: 99999, y: -500 }));
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');

    expect(surface.style.right).toBe(`${Math.max(10, window.innerWidth - 74)}px`);
    expect(surface.style.top).toBe('10px');
  });

  it('clamps drag movement on every edge and clears drag state on blur and touch cancellation', async () => {
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const beginDrag = () => dispatch(surface, new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100,
    }));

    await beginDrag();
    expect(surface.className).toContain('cursor-grabbing');
    await dispatch(window, new MouseEvent('mousemove', { clientX: -10000, clientY: -10000 }));
    expect(surface.style.right).toBe(`${Math.max(10, window.innerWidth - 74)}px`);
    expect(surface.style.top).toBe('10px');

    await dispatch(window, new Event('blur'));
    expect(surface.className).toContain('cursor-grab');
    expect(surface.className).not.toContain('cursor-grabbing');
    expect(surface.style.transform).not.toContain('1.1, 0.9');

    await beginDrag();
    await dispatch(window, new MouseEvent('mousemove', { clientX: 10000, clientY: 10000 }));
    expect(surface.style.right).toBe('10px');
    expect(surface.style.top).toBe(`${Math.max(10, window.innerHeight - 74)}px`);

    await dispatch(window, new Event('touchcancel'));
    expect(surface.className).not.toContain('cursor-grabbing');
    expect(surface.style.transform).not.toContain('1.1, 0.9');
  });

  it('ignores a malformed touch start without entering drag mode', async () => {
    const bot = await mountBot();
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');

    await dispatch(surface, new Event('touchstart', { bubbles: true, cancelable: true }));

    expect(surface.className).not.toContain('cursor-grabbing');
  });
});

describe('AlloBot keyboard and announcement behavior', () => {
  it('uses a dynamic instruction relationship and exposes an awake native action button', async () => {
    const onClick = vi.fn();
    const onVoiceSettingsClick = vi.fn();
    const bot = await mountBot({ onClick, onVoiceSettingsClick });
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const instructionsId = surface.getAttribute('aria-describedby');

    expect(surface.getAttribute('role')).toBe('group');
    expect(instructionsId).toBeTruthy();
    expect(document.getElementById(instructionsId)?.textContent).toMatch(/bot\.move_instructions|Use the arrow keys to move AlloBot/);
    expect(surface.getAttribute('aria-keyshortcuts')).toBe('ArrowLeft ArrowRight ArrowUp ArrowDown');

    const openButton = surface.querySelector('[data-allobot-avatar-action="open"]');
    expect(openButton?.tagName).toBe('BUTTON');
    expect(openButton?.getAttribute('type')).toBe('button');
    expect(openButton?.classList.contains('allobot-avatar-action')).toBe(true);
    const actionStyle = getComputedStyle(openButton);
    expect(actionStyle.position).toBe('absolute');
    expect(actionStyle.width).toBe('100%');
    expect(actionStyle.height).toBe('100%');
    expect(actionStyle.paddingTop).toBe('0px');
    expect(actionStyle.borderTopWidth).toBe('0px');
    expect(actionStyle.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    await dispatch(openButton, new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    await dispatch(openButton, new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    expect(onClick).toHaveBeenCalledTimes(2);

    const settings = bot.container.querySelector('[data-help-key="bot_settings_btn"]');
    await dispatch(settings, new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('presents one native sleeping button target and wakes through its activation click', async () => {
    const onClick = vi.fn();
    const bot = await mountBot({ onClick });
    const sleepButton = bot.container.querySelector('[data-help-key="bot_sleep_btn"]');
    await dispatch(sleepButton, new MouseEvent('click', { bubbles: true, cancelable: true }));
    await advance(400);

    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    expect(surface.getAttribute('role')).toBe('group');
    expect(surface.hasAttribute('aria-keyshortcuts')).toBe(false);
    expect(surface.hasAttribute('aria-describedby')).toBe(false);
    const wakeButton = surface.querySelector('[data-allobot-avatar-action="wake"]');
    expect(wakeButton?.tagName).toBe('BUTTON');
    expect(wakeButton?.getAttribute('type')).toBe('button');
    expect(wakeButton?.classList.contains('allobot-avatar-action')).toBe(true);
    expect(surface.querySelectorAll('[data-allobot-avatar-action]')).toHaveLength(1);

    await dispatch(wakeButton, new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    expect(surface.getAttribute('role')).toBe('group');
    expect(surface.querySelector('[data-allobot-avatar-action="open"]')).toBeTruthy();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps passive hover copy out of the live region and announces explicit speech', async () => {
    const ref = React.createRef();
    const bot = await mountBot({ disableAnimations: true }, { ref });
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const live = () => bot.container.querySelector('.allobot-bubble-live');

    await dispatch(surface, pointerEvent('pointerover'));
    expect(live().textContent).toBe('');

    await React.act(async () => {
      await ref.current.speak('A deliberate AlloBot announcement.');
    });
    expect(live().textContent).toBe('A deliberate AlloBot announcement.');
  });

  it('finishes a hidden-tab bubble silently and does not restart it on visibility return', async () => {
    const previousVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    let visibilityState = 'hidden';
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilityState });
    const beepOscillator = {
      connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 },
    };
    const beepGain = {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    };
    const audioContext = {
      state: 'running', currentTime: 1, destination: {},
      createOscillator: vi.fn(() => beepOscillator),
      createGain: vi.fn(() => beepGain),
      resume: vi.fn(),
    };
    window.__allobotRuntimeAudioContext = audioContext;
    try {
      const bot = await mountBot({ soundEnabled: true });
      const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
      await dispatch(surface, pointerEvent('pointerover'));
      const bubbleText = bot.container.querySelector('.allobot-bubble-text');
      const completedText = bubbleText.textContent;
      expect(completedText.length).toBeGreaterThan(0);
      expect(audioContext.createOscillator).not.toHaveBeenCalled();
      expect(bot.container.querySelector('[data-allobot-voice-cue]')).toBeNull();
      await advance(1000);
      expect(bubbleText.textContent).toBe(completedText);
      expect(audioContext.createOscillator).not.toHaveBeenCalled();

      visibilityState = 'visible';
      await dispatch(document, new Event('visibilitychange'));
      await advance(1000);
      expect(bubbleText.textContent).toBe(completedText);
      expect(audioContext.createOscillator).not.toHaveBeenCalled();
      await bot.unmount();
    } finally {
      delete window.__allobotRuntimeAudioContext;
      if (previousVisibility) Object.defineProperty(document, 'visibilityState', previousVisibility);
      else delete document.visibilityState;
    }
  });
});

describe('AlloBot flight Web Audio ownership', () => {
  it('does not start an externally requested flight graph in an already-hidden tab', async () => {
    const previousVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    const audioContext = {
      createBufferSource: vi.fn(),
      createOscillator: vi.fn(),
    };
    window.__allobotRuntimeAudioContext = audioContext;
    try {
      const bot = await mountBot({ isFlying: true, soundEnabled: true });
      expect(audioContext.createBufferSource).not.toHaveBeenCalled();
      expect(audioContext.createOscillator).not.toHaveBeenCalled();
      await bot.unmount();
    } finally {
      delete window.__allobotRuntimeAudioContext;
      if (previousVisibility) Object.defineProperty(document, 'visibilityState', previousVisibility);
      else delete document.visibilityState;
    }
  });

  it.each(['flight ends', 'bot sleeps', 'document hides', 'sound disables', 'global mute', 'unmount'])(
    'stops and disconnects every owned flight node when %s',
    async (terminalPath) => {
      const previousVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
      let visibilityState = 'visible';
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilityState });
      const makeNode = (extra = {}) => ({ connect: vi.fn(), disconnect: vi.fn(), ...extra });
      const audioParam = () => ({
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      });
      const noise = makeNode({ start: vi.fn(), stop: vi.fn() });
      const noiseFilter = makeNode({ frequency: audioParam() });
      const noiseGain = makeNode({ gain: audioParam() });
      const osc = makeNode({ start: vi.fn(), stop: vi.fn(), frequency: audioParam() });
      const oscGain = makeNode({ gain: audioParam() });
      const audioContext = {
        state: 'running', currentTime: 2, sampleRate: 4, destination: {},
        createBuffer: vi.fn((_channels, length) => ({ getChannelData: () => new Float32Array(length) })),
        createBufferSource: vi.fn(() => noise),
        createBiquadFilter: vi.fn(() => noiseFilter),
        createGain: vi.fn().mockReturnValueOnce(noiseGain).mockReturnValueOnce(oscGain),
        createOscillator: vi.fn(() => osc),
        resume: vi.fn(),
      };
      window.__allobotRuntimeAudioContext = audioContext;
      try {
        const bot = await mountBot({
          isFlying: true,
          soundEnabled: true,
          idleSleepMs: terminalPath === 'bot sleeps' ? 1 : defaultProps.idleSleepMs,
        });
        expect(audioContext.createBufferSource).toHaveBeenCalledTimes(1);
        expect(audioContext.createOscillator).toHaveBeenCalledTimes(1);
        if (terminalPath === 'flight ends') {
          await bot.rerender({ isFlying: false, soundEnabled: true });
        } else if (terminalPath === 'bot sleeps') {
          await advance(15000);
        } else if (terminalPath === 'document hides') {
          visibilityState = 'hidden';
          await dispatch(document, new Event('visibilitychange'));
        } else if (terminalPath === 'sound disables') {
          await bot.rerender({ isFlying: true, soundEnabled: false });
        } else if (terminalPath === 'global mute') {
          await dispatch(window, new CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));
        } else {
          await bot.unmount();
        }
        expect(noise.stop).toHaveBeenCalledWith(0);
        expect(osc.stop).toHaveBeenCalledWith(0);
        for (const node of [noise, noiseFilter, noiseGain, osc, oscGain]) {
          expect(node.disconnect).toHaveBeenCalledTimes(1);
        }
        if (terminalPath !== 'unmount') await bot.unmount();
      } finally {
        delete window.__allobotRuntimeAudioContext;
        if (previousVisibility) Object.defineProperty(document, 'visibilityState', previousVisibility);
        else delete document.visibilityState;
      }
    },
  );
});

describe('AlloBot imperative animation contract', () => {
  it('plays every supported animation and rejects unknown class input', async () => {
    const ref = React.createRef();
    const bot = await mountBot({}, { ref });
    const surface = bot.container.querySelector('[data-allobot-control-surface="true"]');
    const animationLayer = surface.firstElementChild;
    for (const name of ['wave-hello', 'sympathetic-tilt', 'wave', 'backflip', 'shrug', 'look-around']) {
      let accepted;
      await React.act(async () => { accepted = ref.current.playAnimation(name, 500); });
      expect(accepted, `${name} should be accepted`).toBe(true);
      expect(animationLayer.classList.contains(`animate-allo-${name}`), `${name} should reach its authored class`).toBe(true);
    }

    let rejected;
    await React.act(async () => { rejected = ref.current.playAnimation('wave bg-red-500', 500); });
    expect(rejected).toBe(false);
    expect(animationLayer.className).not.toContain('bg-red-500');
    expect(animationLayer.className).not.toContain('wave bg-red-500');
    await bot.unmount();
  });
});

describe('AlloBot delayed-data and intro lifecycle', () => {
  it.each([null, {}, 'not-history'])('mounts safely with malformed history %j', async (history) => {
    const bot = await mountBot({ history });
    expect(bot.container.querySelector('[data-allobot-control-surface="true"]')).toBeTruthy();
  });

  it('handles malformed quiz questions when the delayed event tip runs', async () => {
    const history = [{
      id: 'runtime-malformed-quiz-regression',
      type: 'quiz',
      data: { questions: [null, 'not-a-question', {}, { question: 'Why does this work?' }] },
    }];
    const bot = await mountBot({ history, disableAnimations: true });

    await advance(5000);

    expect(bot.container.querySelector('.allobot-bubble-live')?.textContent).toContain("I've generated 2 questions");
  });

  it('contains malformed quiz question-text types when the delayed event tip runs', async () => {
    const history = [{
      id: 'runtime-malformed-quiz-text-types',
      type: 'quiz',
      data: {
        questions: [
          { question: { nested: 'prompt' } },
          { text: 42 },
          { question: ['array prompt'] },
          { question: null, text: false },
        ],
      },
    }];
    const bot = await mountBot({ history, disableAnimations: true });

    await advance(5000);

    expect(bot.container.querySelector('.allobot-bubble-live')?.textContent).toContain("I've generated 4 questions");
  });

  it('does not schedule the welcome when the intro was already seen', async () => {
    const onBotIntroSeen = vi.fn();
    const languageValue = {
      t: (key) => ({
        'bot_events.intro_greeting': 'Hello!',
        'sidebar.ai_guide_welcome': 'Welcome to AlloFlow!',
      })[key] || key,
    };
    await mountBot(
      { canPlayIntro: true, hasSeenBotIntro: true, onBotIntroSeen },
      { languageValue },
    );

    await advance(3000);
    expect(onBotIntroSeen).not.toHaveBeenCalled();
  });

  it('releases an unmounted pending intro so a later instance can welcome once', async () => {
    const languageValue = {
      t: (key) => ({
        'bot_events.intro_greeting': 'Hello!',
        'sidebar.ai_guide_welcome': 'Welcome to AlloFlow!',
      })[key] || key,
    };
    const abandonedIntro = vi.fn();
    const first = await mountBot(
      { canPlayIntro: true, hasSeenBotIntro: false, onBotIntroSeen: abandonedIntro, disableAnimations: true },
      { languageValue },
    );
    await advance(1000);
    await first.unmount();
    await advance(2000);
    expect(abandonedIntro).not.toHaveBeenCalled();

    const completedIntro = vi.fn();
    const second = await mountBot(
      { canPlayIntro: true, hasSeenBotIntro: false, onBotIntroSeen: completedIntro, disableAnimations: true },
      { languageValue },
    );
    await advance(2499);
    expect(completedIntro).not.toHaveBeenCalled();
    await advance(1);
    expect(completedIntro).toHaveBeenCalledTimes(1);
    expect(second.container.querySelector('.allobot-bubble-live')?.textContent).toBe('Welcome to AlloFlow!');
  });
});

describe('AlloBot speech ownership and cancellation', () => {
  it('keeps the latest browser fallback queued when the superseded utterance starts late', async () => {
    const previousSpeech = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
    const previousUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
    const queue = [];
    const onSpeechStart = vi.fn();
    const speechSynthesis = {
      speak: vi.fn((utterance) => queue.push({ utterance, cancelled: false, started: false })),
      cancel: vi.fn(() => {
        queue.filter((entry) => !entry.started).forEach((entry) => { entry.cancelled = true; });
      }),
      getVoices: vi.fn(() => []),
    };
    function FakeUtterance(text) { this.text = text; }
    Object.defineProperty(globalThis, 'speechSynthesis', { configurable: true, value: speechSynthesis });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    try {
      const ref = React.createRef();
      const bot = await mountBot({ soundEnabled: true, onSpeechStart }, { ref });

      await React.act(async () => { await ref.current.speak('Rapid browser response one.'); });
      await React.act(async () => { await ref.current.speak('Rapid browser response two.'); });
      expect(queue).toHaveLength(2);
      expect.soft(queue[0].cancelled, 'the superseded queued response is cancelled before its replacement is queued').toBe(true);

      const cancellationsAfterSupersede = speechSynthesis.cancel.mock.calls.length;
      queue[0].started = true;
      await React.act(async () => queue[0].utterance.onstart());
      expect.soft(
        speechSynthesis.cancel.mock.calls.length,
        'a stale onstart cannot globally cancel the newer browser response',
      ).toBe(cancellationsAfterSupersede);
      expect.soft(queue[1].cancelled, 'the latest browser response remains eligible to start').toBe(false);

      const latest = queue.find((entry) => !entry.started && !entry.cancelled);
      if (latest) {
        latest.started = true;
        await React.act(async () => latest.utterance.onstart());
      }
      expect.soft(onSpeechStart, 'the latest response reaches audible playback').toHaveBeenCalledTimes(1);

      await bot.unmount();
    } finally {
      if (previousSpeech) Object.defineProperty(globalThis, 'speechSynthesis', previousSpeech);
      else delete globalThis.speechSynthesis;
      if (previousUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', previousUtterance);
      else delete globalThis.SpeechSynthesisUtterance;
    }
  });

  it('refuses a second AlloBot browser fallback while another instance owns the engine', async () => {
    const previousSpeech = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
    const previousUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
    const utterances = [];
    const speechSynthesis = {
      speaking: false,
      pending: false,
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    };
    function FakeUtterance(text) { this.text = text; utterances.push(this); }
    Object.defineProperty(globalThis, 'speechSynthesis', { configurable: true, value: speechSynthesis });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    try {
      const firstRef = React.createRef();
      const secondRef = React.createRef();
      const first = await mountBot({ soundEnabled: true }, { ref: firstRef });
      const second = await mountBot({ soundEnabled: true }, { ref: secondRef });

      await React.act(async () => { await firstRef.current.speak('Exact owner alpha.'); });
      expect(utterances).toHaveLength(1);
      speechSynthesis.speaking = true;
      await React.act(async () => utterances[0].onstart());

      await React.act(async () => { await secondRef.current.speak('Exact owner beta.'); });
      expect(utterances).toHaveLength(1);
      expect(speechSynthesis.cancel).not.toHaveBeenCalled();
      expect(second.container.querySelector('.allobot-bubble-live')?.textContent).toBe('Exact owner beta.');

      speechSynthesis.speaking = false;
      await React.act(async () => utterances[0].onend());
      await React.act(async () => { await secondRef.current.speak('Exact owner gamma.'); });
      expect(utterances).toHaveLength(2);
      await React.act(async () => utterances[1].onstart());
      await React.act(async () => utterances[1].onend());

      await second.unmount();
      await first.unmount();
      expect(speechSynthesis.cancel).not.toHaveBeenCalled();
    } finally {
      if (previousSpeech) Object.defineProperty(globalThis, 'speechSynthesis', previousSpeech);
      else delete globalThis.speechSynthesis;
      if (previousUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', previousUtterance);
      else delete globalThis.SpeechSynthesisUtterance;
    }
  });

  it.each([
    ['no unrelated speech queued', false, 1],
    ['unrelated speech pending behind it', true, 0],
  ])('clears global-mute speech UI with %s', async (_label, hasPendingSpeech, expectedGlobalCancels) => {
    const previousSpeech = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
    const previousUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
    const utterances = [];
    const onSpeechEnd = vi.fn();
    const speechSynthesis = {
      speaking: false,
      pending: false,
      speak: vi.fn(),
      cancel: vi.fn(() => { speechSynthesis.speaking = false; }),
      getVoices: vi.fn(() => []),
    };
    function FakeUtterance(text) { this.text = text; utterances.push(this); }
    Object.defineProperty(globalThis, 'speechSynthesis', { configurable: true, value: speechSynthesis });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    try {
      const ref = React.createRef();
      const bot = await mountBot({ soundEnabled: true, disableAnimations: true, onSpeechEnd }, { ref });
      await React.act(async () => { await ref.current.speak(`Mute coordinator ${hasPendingSpeech}.`); });
      speechSynthesis.speaking = true;
      await React.act(async () => utterances[0].onstart());
      expect(bot.container.querySelector('.allobot-bubble-live')?.textContent).toContain('Mute coordinator');
      expect(bot.container.querySelector('[data-allobot-voice-cue="talking"]')).toBeTruthy();

      speechSynthesis.pending = hasPendingSpeech;
      await dispatch(window, new CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));

      expect(speechSynthesis.cancel).toHaveBeenCalledTimes(expectedGlobalCancels);
      if (hasPendingSpeech) expect(utterances[0].volume).toBe(0);
      expect(bot.container.querySelector('.allobot-bubble-live')?.textContent).toBe('');
      expect(bot.container.querySelector('[data-allobot-voice-cue]')).toBeNull();
      expect(onSpeechEnd).toHaveBeenCalledTimes(1);

      speechSynthesis.pending = false;
      speechSynthesis.speaking = false;
      if (hasPendingSpeech) {
        expect(utterances[0].onstart).toBeNull();
        expect(utterances[0].onend).toBeNull();
        expect(utterances[0].onerror).toBeNull();
      } else {
        await React.act(async () => utterances[0].onend());
      }
      await bot.unmount();
    } finally {
      if (previousSpeech) Object.defineProperty(globalThis, 'speechSynthesis', previousSpeech);
      else delete globalThis.speechSynthesis;
      if (previousUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', previousUtterance);
      else delete globalThis.SpeechSynthesisUtterance;
    }
  });

  it.each(['global mute', 'hide/unmount'])(
    'releases a pre-start owner stuck pending after %s and allows the next idle fallback',
    async (terminalAction) => {
      const previousSpeech = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
      const previousUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
      const utterances = [];
      const speechSynthesis = {
        speaking: false,
        pending: false,
        speak: vi.fn(),
        cancel: vi.fn(),
        getVoices: vi.fn(() => []),
      };
      function FakeUtterance(text) { this.text = text; utterances.push(this); }
      Object.defineProperty(globalThis, 'speechSynthesis', { configurable: true, value: speechSynthesis });
      Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
      try {
        const firstRef = React.createRef();
        const first = await mountBot({ soundEnabled: true }, { ref: firstRef });
        await React.act(async () => { await firstRef.current.speak(`Pending forever before ${terminalAction}.`); });
        expect(utterances).toHaveLength(1);
        expect(utterances[0].onstart).toEqual(expect.any(Function));

        // The browser reports a pending queue but never invokes any lifecycle
        // callback for this utterance. A terminal AlloBot path must release its
        // token without globally discarding the unrelated queued narration.
        speechSynthesis.pending = true;
        if (terminalAction === 'global mute') {
          await dispatch(window, new CustomEvent('alloflow-mute-changed', { detail: { muted: true } }));
        } else {
          await first.unmount();
        }

        expect(speechSynthesis.cancel).not.toHaveBeenCalled();
        expect(utterances[0].volume).toBe(0);
        expect(utterances[0].onstart).toBeNull();
        expect(utterances[0].onend).toBeNull();
        expect(utterances[0].onerror).toBeNull();

        speechSynthesis.pending = false;
        speechSynthesis.speaking = false;
        const nextRef = React.createRef();
        const next = await mountBot({ soundEnabled: true }, { ref: nextRef });
        await React.act(async () => { await nextRef.current.speak(`Fallback after ${terminalAction}.`); });
        expect(utterances).toHaveLength(2);
        expect(speechSynthesis.speak).toHaveBeenCalledTimes(2);
        await React.act(async () => utterances[1].onstart());
        await React.act(async () => utterances[1].onend());
        await next.unmount();
        if (terminalAction === 'global mute') await first.unmount();
        expect(speechSynthesis.cancel).not.toHaveBeenCalled();
      } finally {
        if (previousSpeech) Object.defineProperty(globalThis, 'speechSynthesis', previousSpeech);
        else delete globalThis.speechSynthesis;
        if (previousUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', previousUtterance);
        else delete globalThis.SpeechSynthesisUtterance;
      }
    },
  );

  it.each(['global mute', 'TTS off'])(
    'does not generate audio or consume duplicate suppression while %s',
    async (blockedBy) => {
      const storageKey = 'alloflow_ai_config';
      const previousConfig = localStorage.getItem(storageKey);
      const onGenerateAudio = vi.fn(() => Promise.resolve(null));
      const ref = React.createRef();
      let bot;
      try {
        if (blockedBy === 'global mute') {
          window.__allobotRuntimeGlobalMuted = true;
        } else {
          localStorage.setItem(storageKey, JSON.stringify({ ttsProvider: 'off' }));
        }

        bot = await mountBot({ soundEnabled: true, onGenerateAudio }, { ref });
        const repeatedText = `Blocked duplicate guard: ${blockedBy}.`;
        await React.act(async () => { await ref.current.speak(repeatedText); });
        expect(onGenerateAudio).not.toHaveBeenCalled();

        if (blockedBy === 'global mute') {
          window.__allobotRuntimeGlobalMuted = false;
        } else {
          localStorage.removeItem(storageKey);
        }
        await React.act(async () => { await ref.current.speak(repeatedText); });
        expect(onGenerateAudio).toHaveBeenCalledTimes(1);
        expect(onGenerateAudio.mock.calls[0][0]).toBe(repeatedText);
        expect(onGenerateAudio.mock.calls[0][3]).toEqual(expect.objectContaining({
          reason: 'allobot-speech',
          signal: expect.any(AbortSignal),
        }));
      } finally {
        if (bot) await bot.unmount();
        delete window.__allobotRuntimeGlobalMuted;
        if (previousConfig === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, previousConfig);
      }
    },
  );

  it('queues at most one browser fallback when generated audio reports duplicate errors', async () => {
    const previousSpeech = Object.getOwnPropertyDescriptor(globalThis, 'speechSynthesis');
    const previousUtterance = Object.getOwnPropertyDescriptor(globalThis, 'SpeechSynthesisUtterance');
    const previousAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
    const previousInvalidate = Object.getOwnPropertyDescriptor(window, '__alloInvalidateTtsUrl');
    const utterances = [];
    const audioInstances = [];
    const speechSynthesis = {
      speaking: false,
      pending: false,
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    };
    function FakeUtterance(text) { this.text = text; utterances.push(this); }
    const AudioMock = vi.fn(function FakeGeneratedAudio(src) {
      this.src = src;
      this.play = vi.fn(() => Promise.resolve());
      this.pause = vi.fn();
      audioInstances.push(this);
    });
    const invalidate = vi.fn();
    Object.defineProperty(globalThis, 'speechSynthesis', { configurable: true, value: speechSynthesis });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: FakeUtterance });
    Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioMock });
    Object.defineProperty(window, '__alloInvalidateTtsUrl', { configurable: true, value: invalidate });
    try {
      const ref = React.createRef();
      const onGenerateAudio = vi.fn(() => Promise.resolve('blob:duplicate-generated-error'));
      const bot = await mountBot({ soundEnabled: true, onGenerateAudio }, { ref });
      await React.act(async () => { await ref.current.speak('Generated audio duplicate error guard.'); });
      expect(audioInstances).toHaveLength(1);

      const error = new Error('the same media failure surfaced twice');
      await React.act(async () => {
        audioInstances[0].onerror(error);
        audioInstances[0].onerror(error);
      });

      expect(invalidate).toHaveBeenCalledTimes(1);
      expect(speechSynthesis.speak).toHaveBeenCalledTimes(1);
      expect(utterances).toHaveLength(1);
      await bot.unmount();
    } finally {
      if (previousSpeech) Object.defineProperty(globalThis, 'speechSynthesis', previousSpeech);
      else delete globalThis.speechSynthesis;
      if (previousUtterance) Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', previousUtterance);
      else delete globalThis.SpeechSynthesisUtterance;
      if (previousAudio) Object.defineProperty(globalThis, 'Audio', previousAudio);
      else delete globalThis.Audio;
      if (previousInvalidate) Object.defineProperty(window, '__alloInvalidateTtsUrl', previousInvalidate);
      else delete window.__alloInvalidateTtsUrl;
    }
  });

  it.each(['mute', 'unmount', 'hidden-tab'])('never plays generated audio that resolves after %s cancellation', async (cancelKind) => {
    const previousAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
    const previousVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    const previousRevoke = URL.revokeObjectURL;
    const AudioMock = vi.fn(function FakeAudio() {
      this.play = vi.fn(() => Promise.resolve());
      this.pause = vi.fn();
    });
    URL.revokeObjectURL = vi.fn();
    Object.defineProperty(globalThis, 'Audio', { configurable: true, value: AudioMock });
    let resolveAudio;
    let visibilityState = 'visible';
    if (cancelKind === 'hidden-tab') {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => visibilityState,
      });
    }
    const onGenerateAudio = vi.fn(() => new Promise((resolvePromise) => { resolveAudio = resolvePromise; }));
    const ref = React.createRef();
    try {
      const bot = await mountBot({ soundEnabled: true, onGenerateAudio }, { ref });
      let speechPromise;
      await React.act(async () => {
        speechPromise = ref.current.speak(`Late generated audio after ${cancelKind}.`);
        await Promise.resolve();
      });
      expect(onGenerateAudio).toHaveBeenCalledTimes(1);

      if (cancelKind === 'mute') {
        await bot.rerender({ soundEnabled: false, onGenerateAudio });
      } else if (cancelKind === 'unmount') {
        await bot.unmount();
      } else {
        visibilityState = 'hidden';
        await dispatch(document, new Event('visibilitychange'));
      }
      await React.act(async () => { await speechPromise; });
      await React.act(async () => {
        resolveAudio(`blob:late-${cancelKind}`);
        await Promise.resolve();
      });

      expect(AudioMock).not.toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(`blob:late-${cancelKind}`);
    } finally {
      if (previousAudio) Object.defineProperty(globalThis, 'Audio', previousAudio);
      else delete globalThis.Audio;
      if (cancelKind === 'hidden-tab') {
        if (previousVisibility) Object.defineProperty(document, 'visibilityState', previousVisibility);
        else delete document.visibilityState;
      }
      URL.revokeObjectURL = previousRevoke;
    }
  });
});
