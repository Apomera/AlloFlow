import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url), modulesDir = resolve('desktop/web-app/node_modules');
let React, createRoot, act, Crawl, root, host, write;
const keys = ['allo_crawl_speed', 'allo_crawl_palette', 'allo_crawl_ambient'];
beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ({ createRoot } = require(resolve(modulesDir, 'react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  loadAlloModule('immersive_reader_module.js');
  Crawl = window.AlloModules.PerspectiveCrawlOverlay;
});
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
function unmount() {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
}
afterEach(() => { unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function render(strict = false) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const node = React.createElement(Crawl, { text: 'A short reading.', isOpen: true, onClose() {} });
  act(() => root.render(strict ? React.createElement(React.StrictMode, null, node) : node));
}
function seed(values) { keys.forEach((key, i) => localStorage.setItem(key, values[i])); }
function track() { write = vi.spyOn(Storage.prototype, 'setItem'); return write; }
function change(selector, value) {
  const node = host.querySelector(selector);
  const prototype = node.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
  act(() => node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })));
}

describe('crawl preference write budget', () => {
  it('initializes missing defaults once, including StrictMode effect replay', () => {
    track(); render(true);
    expect(write.mock.calls).toEqual(keys.map((key, i) => [key, ['70', 'gold', '0'][i]]));
  });
  it('does not rewrite valid preferences across repeated remounts', () => {
    seed(['95', 'teal', '1']); track();
    for (let i = 0; i < 10; i++) { render(); unmount(); }
    expect(write).not.toHaveBeenCalled();
    expect(keys.map(key => localStorage.getItem(key))).toEqual(['95', 'teal', '1']);
  });
  it('saves genuine changes once and reads the latest stored values on remount', () => {
    seed(['70', 'gold', '0']); track(); render();
    change('input[type="range"]', '80');
    change('select', 'paper');
    act(() => host.querySelector('[data-help-key="perspective_crawl_ambient_toggle"]').click());
    expect(write.mock.calls).toEqual([[keys[0], '80'], [keys[1], 'paper'], [keys[2], '1']]);
    unmount();
    seed(['110', 'teal', '0']); write.mockClear(); render();
    expect(host.querySelector('input[type="range"]').value).toBe('110');
    expect(host.querySelector('select').value).toBe('teal');
    expect(host.querySelector('[data-help-key="perspective_crawl_ambient_toggle"]').getAttribute('aria-pressed')).toBe('false');
    expect(write).not.toHaveBeenCalled();
  });
  it('normalizes invalid stored values, then stops rewriting them', () => {
    seed(['invalid', 'invalid', 'invalid']); track(); render(); unmount(); render();
    expect(write.mock.calls).toEqual(keys.map((key, i) => [key, ['70', 'gold', '0'][i]]));
  });
  it.each(['getItem', 'setItem'])('keeps controls usable when storage %s fails', method => {
    vi.spyOn(Storage.prototype, method).mockImplementation(() => { throw new DOMException('Unavailable', method === 'getItem' ? 'SecurityError' : 'QuotaExceededError'); });
    expect(() => render()).not.toThrow();
    change('select', 'teal');
    expect(host.querySelector('select').value).toBe('teal');
  });
});
