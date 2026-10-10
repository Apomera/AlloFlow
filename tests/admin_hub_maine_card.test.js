import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const destination = 'https://alloflow-cdn.pages.dev/app/?tool=maine-sld-practice';
let React, ReactDOMClient, act, Panel, root, host;

beforeAll(() => {
  React = require(resolve(modules, 'react'));
  ReactDOMClient = require(resolve(modules, 'react-dom/client'));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.AdminHub;
  new Function(readFileSync(resolve('admin_hub_module.js'), 'utf8'))();
  Panel = window.AlloModules.AdminHub.AdminHubPanel;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  delete window.__alloOpenMaineSldPractice;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

async function mount(openTool) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Panel, {
    onClose() {}, t() {}, openTool, addToast() {},
  })));
  return host.querySelector('[data-hub-id="maineSldPractice"]');
}

async function click(card, options = {}) {
  let nativeNavigation;
  // Record whether React allowed the link, then suppress jsdom navigation.
  host.addEventListener('click', event => {
    nativeNavigation = !event.defaultPrevented;
    event.preventDefault();
  }, { once: true });
  await act(async () => card.dispatchEvent(new MouseEvent('click', {
    bubbles: true, cancelable: true, button: 0, ...options,
  })));
  return nativeNavigation;
}

describe('Maine SLD card across app shell versions', () => {
  it('opens the hosted link instead of sending an unknown action to an older shell', async () => {
    const legacyOpenTool = vi.fn(() => root.render(null));
    const card = await mount(legacyOpenTool);
    expect(card.tagName).toBe('A');
    expect(card.href).toBe(destination);
    expect(card.target).toBe('_blank');
    expect(card.rel.split(' ')).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    expect(await click(card)).toBe(true);
    expect(legacyOpenTool).not.toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('keeps the current shell launch inside the app', async () => {
    const opener = window.__alloOpenMaineSldPractice = vi.fn();
    const openTool = vi.fn();
    const card = await mount(openTool);
    expect(await click(card)).toBe(false);
    expect(opener).toHaveBeenCalledExactlyOnceWith({ fromLeadership: true });
    expect(openTool).not.toHaveBeenCalled();
  });

  it('opens through the functional bridge when the generic callback cannot launch the case', async () => {
    const openTool = vi.fn();
    const card = await mount(openTool);
    const opener = window.__alloOpenMaineSldPractice = vi.fn(() => {
      root.render(React.createElement('section', { 'data-testid': 'opened-case' }, 'Case content'));
    });
    expect(await click(card)).toBe(false);
    expect(opener).toHaveBeenCalledExactlyOnceWith({ fromLeadership: true });
    expect(openTool).not.toHaveBeenCalled();
    expect(host.querySelector('[data-testid="opened-case"]')?.textContent).toBe('Case content');
  });

  it('keeps the native hosted link available when the opener throws', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const opener = window.__alloOpenMaineSldPractice = vi.fn(() => {
      throw new Error('The inline case could not open.');
    });
    const openTool = vi.fn();
    const card = await mount(openTool);
    expect(await click(card)).toBe(true);
    expect(opener).toHaveBeenCalledExactlyOnceWith({ fromLeadership: true });
    expect(openTool).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledOnce();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('keeps the native hosted link available when the opener declines the request', async () => {
    const opener = window.__alloOpenMaineSldPractice = vi.fn(() => false);
    const openTool = vi.fn();
    const card = await mount(openTool);
    expect(await click(card)).toBe(true);
    expect(opener).toHaveBeenCalledExactlyOnceWith({ fromLeadership: true });
    expect(openTool).not.toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('uses the hosted link for modifier clicks even in the current shell', async () => {
    const opener = window.__alloOpenMaineSldPractice = vi.fn();
    const openTool = vi.fn();
    const card = await mount(openTool);
    for (const key of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
      expect(await click(card, { [key]: true })).toBe(true);
    }
    expect(opener).not.toHaveBeenCalled();
    expect(openTool).not.toHaveBeenCalled();
  });

  it('checks shell support at activation so a late opener keeps inline navigation', async () => {
    const openTool = vi.fn();
    const card = await mount(openTool);
    const opener = window.__alloOpenMaineSldPractice = vi.fn();
    expect(await click(card, { detail: 0 })).toBe(false);
    expect(opener).toHaveBeenCalledExactlyOnceWith({ fromLeadership: true });
    expect(openTool).not.toHaveBeenCalled();
  });
});
