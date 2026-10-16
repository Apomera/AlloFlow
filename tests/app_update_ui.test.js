import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const app = readFileSync('AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n');
const hostSource = readFileSync('host_handlers_source.jsx', 'utf8');
const index = readFileSync('desktop/web-app/public/index.html', 'utf8');
const updateHooks = app.slice(app.indexOf('  const [appUpdateReady'), app.indexOf('  const [stemLabTool'));
const banner = app.slice(app.indexOf('      {appUpdateReady &&'), app.indexOf('      {!isZenMode && <HeaderBar'));
const handler = hostSource.slice(hostSource.indexOf('const applyAppUpdate = async () => {'), hostSource.indexOf('const handleStemArtworkUse'));
const bootstrap = index.slice(index.lastIndexOf('<script>', index.indexOf('navigator.serviceWorker.register')) + 8, index.indexOf('</script>', index.indexOf('navigator.serviceWorker.register')));
let React, createRoot, act, Component;
const mounted = new Set();

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const source = 'function Component({ addToast, _alloHostHandlers, _isCanvasEnv = false }) { const { useState, useRef } = React; const addToastRef = { current: addToast };\n' + updateHooks + '\nreturn <>' + banner + '</>; }';
  const compiled = transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Component = new Function('React', compiled + '\nreturn Component;')(React);
});

afterEach(() => {
  for (const view of mounted) { act(() => view.root.unmount()); view.element.remove(); }
  mounted.clear();
  delete window.__alloAppUpdates;
  delete window.__alloUpdateReady;
  vi.restoreAllMocks();
});

function managerFixture() {
  let state = { ready: false, applying: false, releaseId: null, error: null };
  const listeners = new Set();
  const manager = {
    start: vi.fn(),
    getState: () => ({ ...state }),
    subscribe: vi.fn(callback => { listeners.add(callback); callback(state); return () => listeners.delete(callback); }),
    apply: vi.fn(async () => true),
    dismiss: vi.fn(() => manager.emit({ ready: false })),
    emit(next) { state = { ...state, ...next }; for (const listener of listeners) listener(state); },
    get listenerCount() { return listeners.size; },
  };
  return manager;
}

function mount(manager, { canvas = false, strict = false } = {}) {
  window.__alloAppUpdates = manager;
  const element = document.createElement('div');
  document.body.append(element);
  const root = createRoot(element);
  const addToast = vi.fn();
  const deps = { addToastRef: { current: addToast } };
  const applyAppUpdate = new Function('__d', handler + '\nreturn applyAppUpdate;')(deps);
  act(() => root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null,
    React.createElement(Component, { addToast, _isCanvasEnv: canvas, _alloHostHandlers: () => { throw new Error('A cached host-handler module must not be used for updates'); } }))));
  const view = { root, element, addToast, applyAppUpdate, button: label => [...element.querySelectorAll('button')].find(button => button.textContent === label) };
  mounted.add(view);
  return view;
}

describe('release-aware update UI', () => {
  it('ignores stale flags and legacy events until the manager verifies an update', () => {
    window.__alloUpdateReady = true;
    const manager = managerFixture();
    const view = mount(manager);
    act(() => window.dispatchEvent(new Event('alloflow:update-ready')));
    expect(view.element.textContent).not.toContain('AlloFlow update ready');
    expect(view.addToast).not.toHaveBeenCalled();
    expect(manager.start).toHaveBeenCalledOnce();
    act(() => manager.emit({ ready: true, releaseId: 'release-two' }));
    expect(view.element.textContent).toContain('AlloFlow update ready');
    expect(view.button('Refresh now')).toBeDefined();
    expect(view.addToast).toHaveBeenCalledOnce();
  });

  it('announces each verified release once through repeated checks and StrictMode effects', () => {
    const manager = managerFixture();
    manager.emit({ ready: true, releaseId: 'release-two' });
    const view = mount(manager, { strict: true });
    expect(manager.listenerCount).toBe(1);
    expect(view.addToast).toHaveBeenCalledOnce();
    act(() => { manager.emit({ ready: true }); manager.emit({ ready: false }); manager.emit({ ready: true }); });
    expect(view.addToast).toHaveBeenCalledOnce();
    act(() => manager.emit({ ready: true, releaseId: 'release-three' }));
    expect(view.addToast).toHaveBeenCalledTimes(2);
    act(() => view.root.unmount());
    mounted.delete(view); view.element.remove();
    expect(manager.listenerCount).toBe(0);
  });

  it('Later delegates dismissal and updates visibility from manager state', () => {
    const manager = managerFixture();
    manager.emit({ ready: true, releaseId: 'release-two' });
    const view = mount(manager);
    act(() => view.button('Later').click());
    expect(manager.dismiss).toHaveBeenCalledOnce();
    expect(view.element.textContent).not.toContain('AlloFlow update ready');
    act(() => manager.emit({ ready: false }));
    expect(view.element.textContent).not.toContain('AlloFlow update ready');
    expect(manager.apply).not.toHaveBeenCalled();
  });

  it('Refresh now uses manager apply and disables both buttons while activation is pending', async () => {
    const manager = managerFixture();
    manager.emit({ ready: true, releaseId: 'release-two' });
    manager.apply.mockImplementation(async () => { manager.emit({ applying: true }); return true; });
    const view = mount(manager);
    await act(async () => view.button('Refresh now').click());
    expect(manager.apply).toHaveBeenCalledOnce();
    expect(view.button('Refreshing…').disabled).toBe(true);
    expect(view.button('Later').disabled).toBe(true);
    expect(await view.applyAppUpdate()).toBe(false);
    expect(manager.apply).toHaveBeenCalledOnce();
  });

  it('reports an actionable apply error and enables a retry', async () => {
    const manager = managerFixture();
    manager.emit({ ready: true, releaseId: 'release-two' });
    manager.apply.mockImplementation(async () => { manager.emit({ applying: false, error: 'The update could not be activated. Please try again.' }); return false; });
    const view = mount(manager);
    await act(async () => view.button('Refresh now').click());
    expect(view.button('Refresh now').disabled).toBe(false);
    expect(view.addToast).toHaveBeenLastCalledWith('The update could not be activated. Please try again.', 'warning');
    manager.apply.mockResolvedValue(true);
    await act(async () => view.button('Refresh now').click());
    expect(manager.apply).toHaveBeenCalledTimes(2);
  });

  it('silently withdraws an update that disappeared instead of saying it is still preparing', async () => {
    const manager = managerFixture();
    manager.emit({ ready: true, releaseId: 'release-two' });
    manager.apply.mockImplementation(async () => { manager.emit({ ready: false, error: null }); return false; });
    const view = mount(manager);
    await act(async () => view.button('Refresh now').click());
    expect(view.element.textContent).not.toContain('AlloFlow update ready');
    expect(view.addToast).toHaveBeenCalledOnce();
  });

  it('does not start update UI in Canvas or when the manager is unavailable', () => {
    const manager = managerFixture();
    const canvas = mount(manager, { canvas: true });
    expect(canvas.element.textContent.trim()).toBe('');
    expect(manager.subscribe).not.toHaveBeenCalled();
    expect(manager.start).not.toHaveBeenCalled();
    const unavailable = mount(undefined);
    expect(unavailable.element.textContent.trim()).toBe('');
  });

  it('keeps update hooks and banner identical across all shell source mirrors', () => {
    for (const file of ['desktop/web-app/src/App.jsx', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const mirror = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
      expect(mirror).toContain(updateHooks);
      expect(mirror).toContain(banner);
    }
    expect(updateHooks).not.toMatch(/controllerchange|__alloReloadForUpdate|alloflow:update-ready/);
    expect(readFileSync('host_handlers_module.js', 'utf8')).toEqual(readFileSync('desktop/web-app/public/host_handlers_module.js', 'utf8'));
  });
});

describe('service-worker bootstrap handoff', () => {
  it.each([false, true])('passes registration to the manager without announcing unverified updates (manager loaded: %s)', async loaded => {
    const registration = {};
    const manager = { watchRegistration: vi.fn() };
    const page = loaded ? { __alloAppUpdates: manager } : {};
    const serviceWorker = { register: vi.fn(async () => registration) };
    new Function('navigator', 'window', 'console', bootstrap)({ serviceWorker }, page, { log() {}, warn() {} });
    await Promise.resolve();
    expect(page.__alloSWRegistration).toBe(registration);
    expect(page.__alloUpdateReady).toBeUndefined();
    expect(manager.watchRegistration).toHaveBeenCalledTimes(loaded ? 1 : 0);
    expect(serviceWorker.register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' });
  });
});
