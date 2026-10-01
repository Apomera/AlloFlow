import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
const act = React.act;
let SymbolStudio, root, host, background;
beforeAll(() => { SymbolStudio = setupSymbolStudio().SymbolStudio; globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); background?.remove(); localStorage.clear(); vi.restoreAllMocks();
});
async function mount(overrides = {}) {
  localStorage.setItem('alloStudentProfiles', JSON.stringify([{ id: 'nav', name: 'Demo', codename: 'Quiet Fox' }]));
  localStorage.setItem('alloActiveProfileId', JSON.stringify('nav'));
  background = document.createElement('button'); background.textContent = 'Host application'; document.body.appendChild(background);
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const props = baseProps(overrides);
  await act(async () => root.render(React.createElement(SymbolStudio, props)));
  return props;
}
function find(label) { const item = host.querySelector('[aria-label="' + label + '"]'); expect(item, label).toBeTruthy(); return item; }
function click(el) { act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }
function key(el, value, shiftKey = false) { act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: value, shiftKey, bubbles: true }))); }
function input(el, value) { act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); }); }
describe('Symbol Studio navigation and dialog resilience', () => {
  it('moves focus and tab selection together after rendering another section', async () => {
    await mount();
    const first = host.querySelector('[role="tab"]'); first.focus(); key(first, 'ArrowRight');
    expect(document.activeElement.getAttribute('role')).toBe('tab');
    expect(document.activeElement.getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement.id).toBe('ss-tab-board');
    key(document.activeElement, 'End'); expect(document.activeElement.id).toBe('ss-tab-garden');
    key(document.activeElement, 'Home'); expect(document.activeElement.id).toBe('ss-tab-symbols');
    expect(document.activeElement.getAttribute('aria-selected')).toBe('true');
    expect(host.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('ss-tab-symbols');
  });
  it('recovers an unknown opening section to the Symbol Bank', async () => {
    await mount({ initialTab: 'unknown-section' });
    expect(host.querySelector('[role="tab"][aria-selected="true"]').id).toBe('ss-tab-symbols');
    expect(find('Symbol label')).toBeTruthy();
  });
  it('isolates and restores the host application when the studio closes', async () => {
    const props = await mount();
    expect(background.hasAttribute('inert')).toBe(true);
    expect(background.getAttribute('aria-hidden')).toBe('true');
    await act(async () => root.render(React.createElement(SymbolStudio, { ...props, isOpen: false })));
    expect(background.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
  });
  it('contains Mulberry keyboard focus and closes only the nested dialog on Escape', async () => {
    const onClose = vi.fn(); await mount({ onClose });
    input(find('Symbol label'), 'help');
    const opener = find('Find a validated Mulberry symbol'); opener.focus(); click(opener);
    const nested = host.querySelector('[role="dialog"][aria-label="Find a validated Mulberry symbol"]');
    expect(nested).toBeTruthy();
    expect(document.activeElement.getAttribute('aria-label')).toBe('Search Mulberry symbols');
    const last = nested.querySelector('a'); last.focus(); key(last, 'Tab');
    expect(document.activeElement.getAttribute('aria-label')).toBe('Close');
    key(document.activeElement, 'Escape');
    expect(onClose).not.toHaveBeenCalled();
    expect(host.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(document.activeElement).toBe(opener);
    expect(background.hasAttribute('inert')).toBe(true);
  });
  it('restores the host after unmounting with a nested dialog still open', async () => {
    await mount(); input(find('Symbol label'), 'help'); click(find('Find a validated Mulberry symbol'));
    act(() => root.unmount()); root = null;
    expect(background.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
  });
});
