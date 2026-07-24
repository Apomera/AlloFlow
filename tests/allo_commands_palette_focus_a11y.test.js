import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let AlloCommandPalette;
let root;
let host;
let opener;
let outside;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('allo_commands_module.js');
  AlloCommandPalette = window.AlloModules.AlloCommands.AlloCommandPalette;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  localStorage.removeItem('allo_command_favorites_v1');
  localStorage.removeItem('allo_command_usage_v1');
  sessionStorage.removeItem('allo_command_recents_v1');
  host = opener = outside = null;
});

describe('AlloCommandPalette focus behavior', () => {
  it('moves focus inside, wraps Tab, recovers outside focus, and restores the opener', async () => {
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open commands';
    document.body.appendChild(opener);
    opener.focus();

    outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'Outside';
    document.body.appendChild(outside);

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => root.render(React.createElement(AlloCommandPalette, { ctx: { t: () => null } })));

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'k', ctrlKey: true, bubbles: true,
    })));
    await act(async () => { await Promise.resolve(); });

    const dialog = host.querySelector('[role="dialog"]');
    const input = dialog.querySelector('[role="combobox"]');
    const close = dialog.querySelector('button[aria-label*="Close"]');
    expect(document.activeElement).toBe(input);

    const axeResults = await axe.run(host, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      'scrollable-region-focusable': { enabled: false },
    } });
    const serious = axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true,
    })));
    expect(document.activeElement).toBe(close);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true,
    })));
    expect(document.activeElement).toBe(input);

    act(() => outside.focus());
    expect(document.activeElement).toBe(input);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('pins the selected command locally and promotes it to a Favorites group', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => root.render(React.createElement(AlloCommandPalette, { ctx: { t: () => null } })));

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    const pin = host.querySelector('button[aria-label^="Pin selected command"]');
    expect(pin).toBeTruthy();
    const selectedLabel = host.querySelector('[role="option"][aria-selected="true"]')?.textContent;
    act(() => pin.click());
    expect(JSON.parse(localStorage.getItem('allo_command_favorites_v1'))).toHaveLength(1);
    expect(host.querySelector('button[aria-label^="Remove selected command"]')).toBeTruthy();

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]').textContent).toContain('Favorites');
    expect(host.querySelector('[role="dialog"]').textContent).toContain(selectedLabel.trim());
  });

  it('opens with a prefilled query from an external launcher and restores focus', async () => {
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Atlas launcher';
    document.body.appendChild(opener);
    opener.focus();

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => root.render(React.createElement(AlloCommandPalette, { ctx: { t: () => null } })));

    act(() => window.dispatchEvent(new window.CustomEvent('alloflow:open-command-palette', {
      detail: { query: 'stem lab', source: 'atlas' },
    })));
    await act(async () => { await Promise.resolve(); });

    const dialog = host.querySelector('[role="dialog"]');
    const input = dialog.querySelector('[role="combobox"]');
    expect(input.value).toBe('stem lab');
    expect(document.activeElement).toBe(input);
    expect(dialog.textContent).toContain('Open the STEM Lab');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

});
