import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let Studio, root, host;
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  new Function(readFileSync('studio_module.js', 'utf8'))();
  Studio = window.AlloModules.AlloStudio;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); window.localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers();
});
function button(text) { return [...host.querySelectorAll('button')].find(b => b.textContent.replace(/^[^A-Za-z]+/, '').trim() === text); }
function click(text) { const b = button(text); expect(b, text).toBeTruthy(); act(() => b.click()); }
function mount(props = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const onClose = vi.fn();
  act(() => root.render(React.createElement(Studio, { t: key => key, onClose, addToast: vi.fn(), ...props })));
  click('Use template');
  return onClose;
}
function editTitle(value) {
  const input = host.querySelector('[aria-label="Document title"]');
  act(() => { input.value = value; input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
}
function saved() { return JSON.parse(localStorage.getItem('alloStudioAutosave_v1') || 'null'); }

describe('Page Designer recovery and workspace improvements', () => {
  it('saves the latest edit before the close callback, without waiting for autosave', () => {
    const onClose = mount(); editTitle('The latest teacher edit');
    act(() => host.querySelector('[aria-label="Close AlloStudio"]').click());
    expect(saved().doc.title).toBe('The latest teacher edit'); expect(onClose).toHaveBeenCalledOnce();
  });
  it('captures pending title text on pagehide', () => {
    mount(); const input = host.querySelector('[aria-label="Document title"]');
    act(() => { input.focus(); input.value = 'Final pending title'; window.dispatchEvent(new Event('pagehide')); });
    expect(saved().doc.title).toBe('Final pending title');
  });
  it('persists on unmount even if the debounce has not fired', () => {
    mount(); editTitle('Recovery after host navigation'); act(() => root.unmount()); root = null;
    expect(saved().doc.title).toBe('Recovery after host navigation');
  });
  it('keeps work open after a storage failure and supports retry', () => {
    const onClose = mount(); editTitle('Still recoverable in the editor');
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage is full', 'QuotaExceededError'); });
    act(() => host.querySelector('[aria-label="Close AlloStudio"]').click());
    expect(onClose).not.toHaveBeenCalled(); expect(host.textContent).toContain('Could not save on this device'); expect(button('Retry save')).toBeTruthy();
    write.mockRestore(); click('Retry save');
    expect(saved().doc.title).toBe('Still recoverable in the editor');
    expect(host.textContent).toContain('Saved on this device');
  });
  it('does not postpone autosave when an unrelated control changes', async () => {
    vi.useFakeTimers(); mount(); editTitle('Autosave independently');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); click('Snap');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saved().doc.title).toBe('Autosave independently');
  });
  it('offers immediate text editing with secondary geometry collapsed', () => {
    mount();
    const object = host.querySelector('[role="group"][aria-label^="text: Your Event Title"]');
    expect(object).toBeTruthy(); act(() => object.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
    const text = host.querySelector('textarea[aria-label="Text"]'); expect(text).toBeTruthy();
    const layout = [...host.querySelectorAll('summary')].find(s => s.textContent === 'Layout and position');
    expect(layout.parentElement.open).toBe(false);
    expect(text.compareDocumentPosition(layout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('shows safe foreground colors for active snap and supports optional reading numbers', () => {
    mount(); const snap = button('Snap');
    expect(snap.style.color).toBe('rgb(15, 23, 42)'); expect(snap.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-st-reading-number]')).toBeNull(); click('Order numbers');
    expect(host.querySelector('[data-st-reading-number]')).toBeTruthy();
  });
  it('closes the export panel before closing the designer with Escape', () => {
    const onClose = mount(); click('Export');
    expect(host.querySelector('section[aria-label="Export choices"]')).toBeTruthy();
    act(() => button('Export').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('section[aria-label="Export choices"]')).toBeNull(); expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Measured page fit', () => {
  it('fits a portrait page within both dimensions of a short laptop viewport', () => {
    const scale = Studio.stCanvasViewportFitScale({ w: 816, h: 1056 }, { w: 717, h: 510 }, 'page');
    expect(1056 * scale).toBeLessThanOrEqual(494); expect(816 * scale).toBeLessThanOrEqual(701);
  });
  it('distinguishes fit width from fit page', () => {
    const canvas = { w: 816, h: 1056 }, viewport = { w: 372, h: 200 };
    const page = Studio.stCanvasViewportFitScale(canvas, viewport, 'page');
    const width = Studio.stCanvasViewportFitScale(canvas, viewport, 'width');
    expect(width).toBeGreaterThan(page); expect(width * 816).toBeCloseTo(356);
  });
});
