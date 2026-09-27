import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let host, root, state, update, media, hidden, configuration;

function mount(overrides = {}) {
  function Lab() {
    const [value, setValue] = React.useState({ bridgeLab: {
      tab: 'build', loadMode: 'vehicle', vehiclePos: 0.5, introDismissed: true, ...overrides
    } });
    state = value.bridgeLab;
    update = patch => setValue(previous => ({ ...previous, bridgeLab: { ...previous.bridgeLab, ...patch } }));
    return configuration.render(makeCtx({ toolData: value, setToolData: setValue }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Lab)));
}

function button(text) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
  expect(found, 'button containing ' + text).toBeTruthy();
  return found;
}

function click(text) { act(() => button(text).click()); }
function tick(ms) { act(() => vi.advanceTimersByTime(ms)); }

beforeEach(() => {
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  const listeners = new Set();
  media = {
    matches: false,
    addEventListener: vi.fn((_, listener) => listeners.add(listener)),
    removeEventListener: vi.fn((_, listener) => listeners.delete(listener)),
    change(matches) { this.matches = matches; listeners.forEach(listener => listener()); }
  };
  vi.stubGlobal('matchMedia', () => media);
  resetStemLab();
  configuration = loadTool('stem_lab/stem_tool_bridgelab.js', 'bridgeLab');
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  document.getElementById('allo-live-bridgelab')?.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Bridge Lab vehicle playback', () => {
  it('moves the vehicle after an explicit start and stops at the far support', () => {
    mount();
    click('Auto-Drive Vehicle');
    expect(state.autoDriving).toBe(true);
    expect(state.vehiclePos).toBe(0);
    expect(button('Stop Drive').getAttribute('aria-pressed')).toBe('true');
    tick(600);
    expect(state.vehiclePos).toBeCloseTo(0.1);
    tick(6000);
    expect(state.vehiclePos).toBe(1);
    expect(state.autoDriving).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the vehicle at the paused position and clears playback on load-mode changes', () => {
    mount();
    click('Auto-Drive Vehicle');
    tick(600);
    click('Stop Drive');
    const paused = state.vehiclePos;
    tick(600);
    expect(state.vehiclePos).toBe(paused);
    click('Auto-Drive Vehicle');
    tick(600);
    click('Uniform load');
    expect(state.autoDriving).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases its interval when leaving the Stress Test or unmounting', () => {
    mount();
    click('Auto-Drive Vehicle');
    tick(240);
    act(() => update({ tab: 'forces' }));
    expect(state.autoDriving).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    act(() => update({ tab: 'build' }));
    click('Auto-Drive Vehicle');
    tick(240);
    expect(document.getElementById('allo-live-bridgelab')).toBeTruthy();
    act(() => root.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
    expect(document.getElementById('allo-live-bridgelab')).toBeNull();
    expect(media.removeEventListener).toHaveBeenCalled();
  });

  it('pauses when the page becomes hidden and does not silently resume', () => {
    mount();
    click('Auto-Drive Vehicle');
    tick(240);
    hidden = true;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    const paused = state.vehiclePos;
    expect(state.autoDriving).toBe(false);
    hidden = false;
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    tick(600);
    expect(state.vehiclePos).toBe(paused);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not autoplay a restored design that was saved during playback', () => {
    mount({ autoDriving: true, vehiclePos: 0.4 });
    expect(state.autoDriving).toBe(false);
    tick(600);
    expect(state.vehiclePos).toBe(0.4);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('offers deliberate position steps when reduced motion is preferred', () => {
    media.matches = true;
    mount({ vehiclePos: 0.9 });
    click('Advance vehicle 10%');
    expect(state.vehiclePos).toBe(1);
    tick(1000);
    expect(state.vehiclePos).toBe(1);
    click('Advance vehicle 10%');
    expect(state.vehiclePos).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops active playback when reduced motion is enabled', () => {
    mount();
    click('Auto-Drive Vehicle');
    tick(240);
    act(() => media.change(true));
    expect(state.autoDriving).toBe(false);
    expect(button('Advance vehicle 10%')).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('exposes the selected loading mode, material, and truss style', () => {
    mount();
    expect(button('Moving vehicle').getAttribute('aria-pressed')).toBe('true');
    expect(button('Uniform load').getAttribute('aria-pressed')).toBe('false');
    expect(button('Structural Steel').getAttribute('aria-pressed')).toBe('true');
    expect(button('Warren').getAttribute('aria-pressed')).toBe('true');
    click('Cast Iron');
    expect(button('Cast Iron').getAttribute('aria-pressed')).toBe('true');
  });
});
