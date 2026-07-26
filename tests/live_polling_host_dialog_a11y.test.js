import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let LivePolling;
let root;
let host;
let opener;
let outside;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  axe = require(resolve(moduleDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('live_polling_module.js');
  LivePolling = window.AlloModules.LivePolling;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

function setInputValue(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('Live Polling host dialog accessibility', () => {
  it('contains focus, replaces window.confirm with a nested safe-default alert, and restores focus', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    opener = document.createElement('button');
    opener.textContent = 'Open live polling';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(LivePolling.HostPanel, {
        sessionCode: 'A11Y',
        isOpen: true,
        onClose: () => setOpen(false),
        roster: {},
        sessionGroups: {},
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const close = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Close');
    expect(dialog.getAttribute('aria-labelledby')).toBe('live-polling-host-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('live-polling-host-description');
    expect(document.activeElement).toBe(close);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

    const axeResult = await axe.run(dialog, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(axeResult.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);

    const routing = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent.includes('Routing rules'));
    click(routing);
    const nameInput = dialog.querySelector('input[aria-label="New group name"]');
    setInputValue(nameInput, 'Advanced');
    const addGroup = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent.includes('Add group'));
    addGroup.focus();
    click(addGroup);

    const alertDialog = host.querySelector('[role="alertdialog"]');
    const alertButtons = Array.from(alertDialog.querySelectorAll('button'));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(alertDialog.getAttribute('aria-labelledby')).toBe('live-polling-group-warning-title');
    expect(alertDialog.getAttribute('aria-describedby')).toBe('live-polling-group-warning-message live-polling-group-warning-guidance');
    expect(alertDialog.textContent).toContain('"Advanced" looks like an ability-tiered group name.');
    expect(document.activeElement).toBe(alertButtons[0]);
    expect(alertButtons[0].textContent).toBe('Choose a neutral name');
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(dialog.hasAttribute('inert')).toBe(true);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(alertDialog);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(alertButtons.at(-1));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(alertButtons[0]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(addGroup);
    expect(nameInput.value).toBe('Advanced');

    click(addGroup);
    const useAnyway = Array.from(host.querySelectorAll('[role="alertdialog"] button'))
      .find((button) => button.textContent === 'Use anyway');
    click(useAnyway);
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(nameInput.value).toBe('');
    const addRule = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent.includes('Add rule'));
    expect(addRule.disabled).toBe(false);
    click(addRule);
    const targetGroups = Array.from(dialog.querySelectorAll('select[aria-label="Target group"] option'))
      .map((option) => option.textContent);
    expect(targetGroups).toContain('Advanced');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(warnSpy).toHaveBeenCalled();
  });
});
