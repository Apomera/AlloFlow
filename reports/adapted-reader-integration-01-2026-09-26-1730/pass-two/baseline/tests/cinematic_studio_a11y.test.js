import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = fs.readFileSync('cinematic_studio_module.js', 'utf8');
const deployed = fs.readFileSync('desktop/web-app/public/cinematic_studio_module.js', 'utf8');
let React;
let ReactDOMClient;
let act;
let CinematicStudio;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  new Function(source)();
  CinematicStudio = window.AlloModules.CinematicStudio;
});

describe('Cinematic Studio WCAG 2.2 interaction accessibility', () => {
  let host;
  let root;
  let originalClipboard;
  let originalExecCommand;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    originalExecCommand = document.execCommand;
    document.execCommand = vi.fn(() => true);
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    host?.remove();
    document.querySelectorAll('textarea[aria-label="Temporary clipboard helper"]').forEach((node) => node.remove());
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete navigator.clipboard;
    if (originalExecCommand) document.execCommand = originalExecCommand;
    else delete document.execCommand;
    vi.restoreAllMocks();
  });

  it('places modal semantics on the focus-managed panel and implements the complete tabs pattern', async () => {
    const toasts = [];
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('button', { id: 'cinematic-opener', type: 'button', onClick: () => setOpen(true) }, 'Open Cinematic Studio'),
        open ? React.createElement(CinematicStudio, {
          onClose: () => setOpen(false),
          addToast: (message, type) => toasts.push({ message, type }),
          t: null,
          callGemini: null,
          initialTab: 'build',
        }) : null
      );
    }

    await act(async () => root.render(React.createElement(Harness)));
    const opener = document.getElementById('cinematic-opener');
    opener.focus();
    await act(async () => {
      opener.click();
      await Promise.resolve();
    });

    const dialog = document.querySelector('[role="dialog"]');
    const heading = document.getElementById('cs-title');
    expect(dialog).not.toBeNull();
    expect(dialog.parentElement.getAttribute('role')).toBe('presentation');
    expect(dialog.getAttribute('aria-labelledby')).toBe('cs-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('cs-subtitle');
    expect(document.activeElement).toBe(heading);

    heading.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(heading);

    const tabs = Array.from(dialog.querySelectorAll('[role="tab"]'));
    expect(tabs).toHaveLength(5);
    expect(tabs[0].getAttribute('aria-controls')).toBe('cs-panel-build');
    expect(tabs[0].tabIndex).toBe(0);
    expect(tabs.slice(1).every((tab) => tab.tabIndex === -1)).toBe(true);
    expect(document.getElementById('cs-panel-build').getAttribute('aria-labelledby')).toBe('cs-tab-build');

    const copyButton = Array.from(document.getElementById('cs-panel-build').querySelectorAll('button')).find((button) => button.textContent === 'Copy');
    copyButton.focus();
    await act(async () => copyButton.click());
    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea[aria-label="Temporary clipboard helper"]')).toBeNull();
    expect(document.activeElement).toBe(copyButton);
    expect(toasts.some((toast) => toast.type === 'success')).toBe(true);

    tabs[0].focus();
    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    });
    const selected = document.querySelector('[role="tab"][aria-selected="true"]');
    expect(selected.id).toBe('cs-tab-diagnose');
    expect(document.activeElement).toBe(selected);
    expect(document.getElementById('cs-panel-diagnose').getAttribute('aria-labelledby')).toBe('cs-tab-diagnose');

    await act(async () => {
      selected.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('pins progress, compact-target, focus, and deploy-mirror safeguards in source', () => {
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain("'aria-valuenow': Math.round(Math.max(0, Math.min(1, tpct || 0)) * 100)");
    expect(source).toContain('min-w-6 min-h-6');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain('grid grid-cols-1 sm:grid-cols-3');
    expect(source.match(/flex flex-col sm:flex-row items-start/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/min-h-6 min-w-6/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain("style.display !== 'none' && style.visibility !== 'hidden'");
    expect(deployed).toBe(source);
  });
});