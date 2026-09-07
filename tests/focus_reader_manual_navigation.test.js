import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, Reader, host, root;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: key => key });
  loadAlloModule('immersive_reader_module.js');
  Reader = window.AlloModules.FocusReaderOverlay;
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  vi.useRealTimers();
});
function render(text = 'One two three four five six', extra = {}) {
  if (!host) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Reader, { isOpen: true, text, onClose: () => {}, ...extra }))));
}
const surface = () => host.querySelector('[role="button"][aria-pressed]');
const progress = () => Number(host.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'));
const button = label => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === label);
const click = node => act(() => node.click());
const key = (node, code, extra = {}) => {
  const event = new KeyboardEvent('keydown', { key: code, code, bubbles: true, cancelable: true, ...extra });
  act(() => node.dispatchEvent(event));
  return event;
};
const tick = async ms => { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); };
function chunkSize(size) {
  const slider = host.querySelector('input[aria-label="Words per chunk"]');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(slider, String(size));
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Focus Reader manual rereading', () => {
  it('exposes touch controls and clamps them at both ends', () => {
    render('One two');
    expect(button('Previous').disabled).toBe(true);
    expect(button('Next').disabled).toBe(false);
    click(button('Next'));
    expect(progress()).toBe(100);
    expect(button('Next').disabled).toBe(true);
    click(button('Previous'));
    expect(progress()).toBe(50);
    expect(button('Previous').disabled).toBe(true);
  });
  it('supports Left and Right on the focused reading surface without double movement', () => {
    render('One two three four');
    act(() => surface().focus());
    expect(key(surface(), 'ArrowRight').defaultPrevented).toBe(true);
    expect(progress()).toBe(50);
    key(surface(), 'ArrowLeft');
    expect(progress()).toBe(25);
    key(surface(), 'ArrowLeft');
    expect(progress()).toBe(25);
  });
  it('pauses and cancels the start countdown when a touch control navigates', async () => {
    render('One two three four');
    click(surface());
    await tick(650);
    click(button('Next'));
    expect(surface().getAttribute('aria-pressed')).toBe('false');
    expect(progress()).toBe(50);
    await tick(4000);
    expect(progress()).toBe(50);
  });
  it('cancels an active pacing timer when manual keyboard navigation occurs', async () => {
    render('One two three four');
    click(surface());
    await tick(650);
    await tick(650);
    await tick(650);
    await tick(100);
    key(surface(), 'ArrowRight');
    expect(surface().getAttribute('aria-pressed')).toBe('false');
    expect(progress()).toBe(50);
    await tick(1000);
    expect(progress()).toBe(50);
  });
  it('preserves the word position when chunk size changes after manual navigation', () => {
    render();
    for (let i = 0; i < 4; i++) click(button('Next'));
    chunkSize(2);
    expect(host.textContent).toContain('3 / 3');
    expect(surface().textContent).toContain('five six');
    expect(button('Next').disabled).toBe(true);
    click(button('Previous'));
    expect(surface().textContent).toContain('three four');
  });
  it('resets safely for new or empty text and keeps native/modifier arrows independent', () => {
    render('One two three four');
    key(host.querySelector('input'), 'ArrowRight');
    key(surface(), 'ArrowRight', { ctrlKey: true });
    expect(progress()).toBe(25);
    click(button('Next'));
    render('Replacement');
    expect(progress()).toBe(100);
    expect(surface().getAttribute('aria-pressed')).toBe('false');
    expect(button('Previous').disabled).toBe(true);
    expect(button('Next').disabled).toBe(true);
    render('');
    expect(progress()).toBe(0);
    expect(button('Previous').disabled).toBe(true);
    expect(button('Next').disabled).toBe(true);
  });
});
