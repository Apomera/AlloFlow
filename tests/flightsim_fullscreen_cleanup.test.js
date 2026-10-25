import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, latest, patchSaved, previousHelper, previousOverflow, previousOverscroll;
let fullscreenDescriptors, scrollDescriptors;
const deck = () => host.querySelector('#skyschool-flight-container');
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const fullButton = () => host.querySelector('[data-flight-fullscreen], [aria-label="Toggle fullscreen flight view"]');

function loadSharedFullscreen() {
  const source = readFileSync('stem_lab/stem_lab_module.js', 'utf8');
  const start = source.indexOf('var _stemFsProps =');
  const end = source.indexOf('// Fullscreen button binder', start);
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  const segment = source.slice(start, end);
  new Function('window', 'document', segment.slice(0, segment.lastIndexOf('};') + 2))(window, document);
}

async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}

beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__testHooks = {}; window.__RR_TEST_EXPORTS__ = {};
  previousHelper = window.__alloStemFS;
  delete window.__alloStemFS; loadSharedFullscreen();
  previousOverflow = document.body.style.overflow;
  previousOverscroll = document.body.style.overscrollBehavior;
  document.body.style.overflow = 'auto'; document.body.style.overscrollBehavior = 'contain';
  fullscreenDescriptors = new Map();
  scrollDescriptors = new Map(['scrollX', 'scrollY'].map(name => [name, Object.getOwnPropertyDescriptor(window, name)]));
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  const gfx = new Proxy({ measureText: text => ({ width: String(text).length * 6 }),
    createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
  }, { get: (target, name) => name in target ? target[name] : () => {},
    set: (target, name, value) => { target[name] = value; return true; } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(gfx);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
  for (const [name, descriptor] of fullscreenDescriptors) {
    if (descriptor) Object.defineProperty(document, name, descriptor); else delete document[name];
  }
  for (const [name, descriptor] of scrollDescriptors) {
    if (descriptor) Object.defineProperty(window, name, descriptor); else delete window[name];
  }
  if (previousHelper) window.__alloStemFS = previousHelper; else delete window.__alloStemFS;
  document.body.style.overflow = previousOverflow; document.body.style.overscrollBehavior = previousOverscroll;
  delete window.__testHooks; delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

async function mount(guided = false) {
  const tool = loadTool(process.env.SKYSCHOOL_FULLSCREEN_SOURCE || 'stem_lab/stem_tool_flightsim.js', 'flightSim');
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: guided ? 'stallHunt' : 'menu',
      railCollapsed: false, takeoffTutorialDismissed: true, landingTutorialDismissed: true,
      stallInvestigation: { phase: 'transfer' } } });
    latest = data.flightSim;
    patchSaved = patch => setData(old => ({ ...old, flightSim: { ...old.flightSim, ...patch } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(old => ({ ...old, [id]: { ...old[id], [key]: value } })),
      updateMulti: (id, patch) => setData(old => ({ ...old, [id]: { ...old[id], ...patch } })) }));
  }
  await act(async () => root.render(React.createElement(App)));
  await click(guided ? button('Try flight practice') : host.querySelector('[aria-label="Free Flight from Portland, ME"]'));
  expect(latest.view).toBe('flying'); expect(deck()).toBeTruthy();
}

function nativeFullscreen(mode, activeElement, pending = false) {
  const property = mode === 'standard' ? 'fullscreenElement' : 'webkitFullscreenElement';
  const method = mode === 'standard' ? 'exitFullscreen' : 'webkitExitFullscreen';
  for (const name of [property, method]) fullscreenDescriptors.set(name, Object.getOwnPropertyDescriptor(document, name));
  let active = activeElement, resolveExit;
  const finish = () => { active = null; document.dispatchEvent(new Event(mode === 'standard' ? 'fullscreenchange' : 'webkitfullscreenchange')); };
  const exit = vi.fn(() => {
    if (!pending) { finish(); return Promise.resolve(); }
    return new Promise(resolve => { resolveExit = () => { finish(); resolve(); }; });
  });
  Object.defineProperty(document, property, { configurable: true, get: () => active });
  Object.defineProperty(document, method, { configurable: true, value: exit });
  return { exit, active: () => active, resolve: () => resolveExit() };
}

function expectBodyRestored() {
  expect(document.body.style.overflow).toBe('auto');
  expect(document.body.style.overscrollBehavior).toBe('contain');
}

describe('flight fullscreen cleanup', () => {
  it.each([false, true])('releases actual CSS fullscreen when native Exit ends a flight, paused %s', async paused => {
    await mount();
    const stage = deck();
    Object.defineProperty(window, 'scrollX', { configurable: true, value: 7 });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 123 });
    await click(fullButton());
    expect(stage.hasAttribute('data-allo-fullscreen-active')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.overscrollBehavior).toBe('none');
    if (paused) await click(host.querySelector('[aria-label="Pause flight"]'));
    await click(button('✕ Exit'));
    expect(latest.view).toBe('debrief'); expect(deck()).toBeNull();
    expect(stage.hasAttribute('data-allo-fullscreen-active')).toBe(false);
    expect(stage.__alloFsOn).toBe(false);
    const debrief = host.querySelector('#skyschool-debrief');
    expect(debrief).toBeTruthy();
    expect(debrief.style.position).not.toBe('fixed');
    expect(debrief.style.minHeight).toBe('min(400px, calc(100vh - 80px))');
    expect(debrief.style.overflow).toBe('auto');
    expectBodyRestored(); expect(window.scrollTo).toHaveBeenLastCalledWith(7, 123);
  });

  it('releases CSS fullscreen when optional flight returns to its investigation', async () => {
    await mount(true); const stage = deck(); await click(fullButton());
    await click(button('Return to investigation'));
    expect(latest.view).toBe('stallHunt'); expect(deck()).toBeNull();
    expect(stage.__alloFsOn).toBe(false); expectBodyRestored();
  });

  it.each(['view replacement', 'tool unmount'])('restores CSS body locks on direct %s without another keyboard event', async leave => {
    await mount(); const stage = deck(); await click(fullButton());
    const resize = vi.fn(); window.addEventListener('resize', resize);
    try {
      if (leave === 'view replacement') await act(async () => patchSaved({ view: 'menu' }));
      else { await act(async () => root.unmount()); root = null; }
      if (leave === 'tool unmount') expect(stage.isConnected).toBe(false);
      else {
        // Replacing an active flight with the menu recovers its checkpoint
        // into a debrief. That replacement must release the fullscreen lock.
        const debrief = host.querySelector('#skyschool-debrief');
        expect(latest.view).toBe('debrief');
        expect(latest.lastDebrief.interrupted).toBe(true);
        expect(debrief).toBeTruthy();
        expect(debrief.style.position).not.toBe('fixed');
        expect(debrief.style.overflow).toBe('auto');
      }
      expect(stage.__alloFsOn).toBe(false);
      expect(stage.hasAttribute('data-allo-fullscreen-active')).toBe(false);
      expectBodyRestored();
      const afterCleanup = resize.mock.calls.length;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(resize).toHaveBeenCalledTimes(afterCleanup); // No orphaned fallback listener.
    } finally { window.removeEventListener('resize', resize); }
  });

  it.each(['standard', 'webkit'])('exits owned %s fullscreen once when Exit and teardown share a pending request', async mode => {
    await mount(); const stage = deck(); const native = nativeFullscreen(mode, stage, true);
    await click(button('✕ Exit'));
    expect(latest.view).toBe('debrief'); expect(native.exit).toHaveBeenCalledOnce();
    await act(async () => native.resolve());
    expect(native.active()).toBeNull(); expect(native.exit).toHaveBeenCalledOnce(); expectBodyRestored();
  });

  it.each(['standard', 'webkit'])('exits owned %s fullscreen when the tool unmounts directly', async mode => {
    await mount(); const native = nativeFullscreen(mode, deck());
    await act(async () => root.unmount()); root = null;
    expect(native.exit).toHaveBeenCalledOnce(); expect(native.active()).toBeNull(); expectBodyRestored();
  });

  it.each(['other tool', 'host ancestor'])('preserves native fullscreen owned by the %s', async owner => {
    await mount();
    const unrelated = owner === 'host ancestor' ? host : document.createElement('div');
    if (owner === 'other tool') document.body.appendChild(unrelated);
    const native = nativeFullscreen('standard', unrelated);
    await click(button('✕ Exit'));
    expect(latest.view).toBe('debrief'); expect(native.exit).not.toHaveBeenCalled();
    expect(native.active()).toBe(unrelated); expectBodyRestored();
    if (owner === 'other tool') unrelated.remove();
  });

  it.each(['Exit', 'unmount'])('releases its CSS lock on %s while preserving another native fullscreen owner', async leave => {
    await mount(); const stage = deck(); await click(fullButton());
    const unrelated = document.createElement('div'); document.body.appendChild(unrelated);
    const native = nativeFullscreen('standard', unrelated);
    try {
      if (leave === 'Exit') await click(button('✕ Exit'));
      else { await act(async () => root.unmount()); root = null; }
      expect(native.exit).not.toHaveBeenCalled(); expect(native.active()).toBe(unrelated);
      expect(stage.__alloFsOn).toBe(false); expectBodyRestored();
    } finally { unrelated.remove(); }
  });

  it('does not toggle fullscreen during an ordinary flight exit', async () => {
    await mount(); const shared = vi.spyOn(window, '__alloStemFS');
    await click(button('✕ Exit'));
    expect(latest.view).toBe('debrief'); expect(shared).not.toHaveBeenCalled(); expectBodyRestored();
  });
});
