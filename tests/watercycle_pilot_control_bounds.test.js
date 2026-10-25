import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, prepareStemBrowserRender, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const catalog = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], catalog) ?? fallback ?? key;
const mounted = [];

// Mount the actual shipped component with React. Only physical dimensions and
// ResizeObserver delivery are simulated: jsdom has no layout engine. Native QA
// checks the resulting bounds against real text and control geometry.
function stageComponent(path) {
  const source = readFileSync(path, 'utf8');
  const start = source.indexOf('  function WaterCyclePilotStage(');
  const end = source.indexOf('  if(!window.StemLab', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate the shipped pilot stage component');
  return new Function(source.slice(start, end) + '\nreturn WaterCyclePilotStage;')();
}

function observerHarness() {
  const observers = [];
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback) {
      this.deliver = callback;
      this.observe = vi.fn();
      this.disconnect = vi.fn();
      observers.push(this);
    }
  });
  return observers;
}

function mountStage(Component, onboarding = 'false') {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let disposed = false;
  const dimensions = { top: 10, toolbar: 48, flightDeck: 118 };
  const canvasRef = vi.fn();
  function dimensionRef(type) {
    return element => {
      if (!element) return;
      Object.defineProperty(element, 'offsetHeight', { configurable: true, get: () => dimensions[type] });
      if (type === 'toolbar') Object.defineProperty(element, 'offsetTop', { configurable: true, get: () => dimensions.top });
    };
  }
  const toolbarRef = dimensionRef('toolbar'), deckRef = dimensionRef('flightDeck');
  function render(mode = 'false', title = 'Camera', overlays = {}) {
    act(() => root.render(React.createElement(Component, {
      React, className: 'wc-pilot-stage', 'data-onboarding': mode,
      'data-cycle-open': String(overlays.cycle === true),
      'data-look-open': String(overlays.look === true),
      'data-learning-pause': String(overlays.notice === true),
    },
    React.createElement('canvas', { className: 'wc-pilot-canvas', ref: canvasRef, tabIndex: 0 }),
    React.createElement('div', { className: 'wc-pilot-camera-switch', ref: toolbarRef },
      React.createElement('button', { type: 'button' }, title)),
    React.createElement('div', { className: 'wc-pilot-pad', ref: deckRef }, 'Flight controls'),
    React.createElement('section', { className: 'wc-pilot-map', tabIndex: 0, 'aria-label': 'Landing map' },
      React.createElement('button', { type: 'button', className: 'map-close' }, 'Hide map')),
    overlays.cycle && React.createElement('div', { className: 'wc-pilot-cycle' },
      React.createElement('button', { type: 'button', className: 'wc-pilot-cycle-btn' }, 'Keep flying')))));
  }
  function unmount() {
    if (disposed) return;
    act(() => root.unmount());
    host.remove(); disposed = true;
  }
  mounted.push(unmount);
  render(onboarding);
  const stage = host.firstElementChild;
  return { host, stage, dimensions, render, unmount, canvasRef,
    bounds: () => [stage.style.getPropertyValue('--wc-pilot-controls-top'), stage.style.getPropertyValue('--wc-pilot-controls-bottom')] };
}

beforeEach(() => vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true));
afterEach(() => {
  mounted.splice(0).forEach(unmount => unmount());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Be the Water control bounds: %s', path => {
  it('remeasures resized controls without replacing the scene canvas or observer on ordinary renders', () => {
    const observers = observerHarness();
    const view = mountStage(stageComponent(path));
    const canvas = view.host.querySelector('canvas');
    expect(view.bounds()).toEqual(['66px', '134px']);
    expect(observers).toHaveLength(1);
    expect(observers[0].observe.mock.calls.map(([element]) => element.className))
      .toEqual(['wc-pilot-camera-switch', 'wc-pilot-pad']);

    // Text enlargement/wrapping changes both control bands independently.
    Object.assign(view.dimensions, { top: 12, toolbar: 116.4, flightDeck: 198.2 });
    act(() => observers[0].deliver());
    expect(view.bounds()).toEqual(['137px', '215px']);
    view.render('false', 'Translated camera controls');
    expect(view.bounds()).toEqual(['137px', '215px']);
    expect(view.host.querySelector('canvas')).toBe(canvas);
    expect(view.canvasRef.mock.calls).toEqual([[canvas]]);
    expect(observers).toHaveLength(1);
    expect(observers[0].disconnect).not.toHaveBeenCalled();
  });

  it('connects only for the active scene and releases observers on onboarding and unmount', () => {
    const observers = observerHarness();
    const view = mountStage(stageComponent(path), 'true');
    expect(observers).toHaveLength(0);
    view.render('false');
    expect(observers).toHaveLength(1);
    view.render('true');
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1);
    view.render('false');
    expect(observers).toHaveLength(2);
    view.unmount();
    expect(observers[1].disconnect).toHaveBeenCalledTimes(1);

    // An already queued observer delivery cannot mutate a detached stage.
    const lastBounds = view.bounds();
    view.dimensions.toolbar = 500;
    act(() => observers[1].deliver());
    expect(view.bounds()).toEqual(lastBounds);
  });

  it('uses and removes the window resize fallback when ResizeObserver is unavailable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const view = mountStage(stageComponent(path));
    const listener = add.mock.calls.find(([type]) => type === 'resize')?.[1];
    expect(listener).toBeTypeOf('function');
    view.dimensions.flightDeck = 240;
    act(() => window.dispatchEvent(new Event('resize')));
    expect(view.bounds()).toEqual(['66px', '256px']);
    view.unmount();
    expect(remove).toHaveBeenCalledWith('resize', listener);
  });

  it.each(['.wc-pilot-map', '.map-close'])('moves %s focus to the cycle action when completion replaces the map', selector => {
    const observers = observerHarness();
    const view = mountStage(stageComponent(path));
    const canvas = view.host.querySelector('canvas');
    const mapTarget = view.host.querySelector(selector);
    mapTarget.focus();
    expect(document.activeElement).toBe(mapTarget);

    view.render('false', 'Camera', { cycle: true });
    expect(document.activeElement).toBe(view.host.querySelector('.wc-pilot-cycle-btn'));
    expect(view.host.querySelector('canvas')).toBe(canvas);
    expect(view.canvasRef.mock.calls).toEqual([[canvas]]);
    expect(observers).toHaveLength(1);
    expect(observers[0].disconnect).not.toHaveBeenCalled();

    // A later completed journey must preserve orientation in the same way.
    view.render('false', 'Camera', { cycle: false });
    mapTarget.focus();
    view.render('false', 'Camera', { cycle: true });
    expect(document.activeElement).toBe(view.host.querySelector('.wc-pilot-cycle-btn'));
    expect(view.host.querySelector('canvas')).toBe(canvas);
  });

  it.each(['.wc-pilot-canvas', '.wc-pilot-camera-switch button'])('keeps %s focus when a cycle opens elsewhere', selector => {
    observerHarness();
    const view = mountStage(stageComponent(path));
    const target = view.host.querySelector(selector);
    target.focus();
    expect(document.activeElement).toBe(target);

    view.render('false', 'Camera', { cycle: true });
    expect(document.activeElement).toBe(target);
    expect(view.host.querySelector('.wc-pilot-cycle-btn')).not.toBeNull();
  });

  it.each(['look', 'notice'])('does not send map focus to a cycle covered by %s', blocker => {
    observerHarness();
    const view = mountStage(stageComponent(path));
    const map = view.host.querySelector('.wc-pilot-map');
    map.focus();
    expect(document.activeElement).toBe(map);

    // jsdom does not apply the production visibility rules. Retaining real
    // focus here isolates the guard against focusing a covered cycle action;
    // native QA verifies visibility and the resulting browser focus behavior.
    view.render('false', 'Camera', { cycle: true, [blocker]: true });
    expect(document.activeElement).toBe(map);
    expect(view.host.querySelector('.wc-pilot-cycle-btn')).not.toBeNull();

    view.render('false', 'Camera', { cycle: true });
    expect(document.activeElement).toBe(view.host.querySelector('.wc-pilot-cycle-btn'));
  });

  it('preserves the learner’s next focus choice through repeated snapshot renders', () => {
    observerHarness();
    const view = mountStage(stageComponent(path));
    view.host.querySelector('.map-close').focus();
    view.render('false', 'Camera', { cycle: true });
    expect(document.activeElement).toBe(view.host.querySelector('.wc-pilot-cycle-btn'));

    const canvas = view.host.querySelector('canvas');
    canvas.focus();
    for (const title of ['Camera', 'Translated camera controls', 'Camera']) {
      view.render('false', title, { cycle: true });
      expect(document.activeElement).toBe(canvas);
      expect(view.host.querySelector('canvas')).toBe(canvas);
    }
    expect(view.canvasRef.mock.calls).toEqual([[canvas]]);
  });

  it('renders the scrollable watershed map as a named keyboard focus target', () => {
    resetStemLab(); loadTool(path, 'waterCycle');
    const rendered = prepareStemBrowserRender(renderTool('waterCycle', {
      _threeLoaded: true, waterCycle: { wcMode: 'pilot', pilot: {
        onboardingComplete: true, paused: true, showLandingMap: true,
      } },
    }, { t: translate }));
    const host = document.createElement('div'); host.innerHTML = rendered.html;
    document.body.appendChild(host);
    try {
      const map = host.querySelector('.wc-pilot-map');
      expect(map).not.toBeNull();
      expect(map.tagName).toBe('SECTION');
      expect(map.tabIndex).toBe(0);
      const name = host.querySelector('#' + map.getAttribute('aria-labelledby'));
      expect(name?.textContent.trim().length).toBeGreaterThan(0);
      expect(map.contains(name)).toBe(true);
      map.focus(); expect(document.activeElement).toBe(map);
      expect(map.querySelector('button')).not.toBeNull();
    } finally { host.remove(); }
  });
});
