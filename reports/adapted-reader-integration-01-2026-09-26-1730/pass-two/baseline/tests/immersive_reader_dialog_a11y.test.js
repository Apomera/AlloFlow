import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('immersive_reader_source.jsx', 'utf8');

let React;
let ReactDOMClient;
let act;
let FocusReaderOverlay;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  window.AlloLanguageContext = React.createContext({ t: (key) => key });
  loadAlloModule('immersive_reader_module.js');
  FocusReaderOverlay = window.AlloModules.FocusReaderOverlay;
});

afterEach(() => {
  if (root) {
    try { act(() => root.unmount()); } catch (_) {}
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
});

describe('Immersive Reader modal dialog accessibility', () => {
  it('names all three modal overlays and provides reduced-motion entry transitions', () => {
    expect(source.match(/role="dialog"/g)).toHaveLength(3);
    expect(source.match(/aria-modal="true"/g)).toHaveLength(3);
    expect(source).toContain('aria-labelledby="focus-reader-dialog-title"');
    expect(source).toContain('aria-labelledby="perspective-crawl-dialog-title"');
    expect(source).toContain('aria-labelledby="karaoke-reader-dialog-title"');
    expect(source.match(/motion-reduce:animate-none/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('contains focus, restores the opener, and protects native control keys', () => {
    expect(source).toContain("document.addEventListener('keydown', containFocus, true)");
    expect(source).toContain("document.removeEventListener('keydown', containFocus, true)");
    expect(source).toContain('document.contains(previous)) previous.focus()');
    expect(source.match(/isInteractiveShortcutTarget\(e\.target\)/g)).toHaveLength(3);
  });

  it('uses explicit button types throughout the module', () => {
    expect(source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) || []).toEqual([]);
  });

  it('moves focus into Focus Mode, wraps both directions, and restores the opener', async () => {
    const opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open reader';
    document.body.appendChild(opener);
    opener.focus();

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const props = {
      text: 'A short passage for the focus reader.',
      onClose: () => {},
      isOpen: true,
    };
    act(() => root.render(React.createElement(FocusReaderOverlay, props)));
    await act(async () => { await new Promise((resolveTimer) => setTimeout(resolveTimer, 0)); });

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBe('focus-reader-dialog-title');
    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
    expect(document.activeElement).toBe(focusable[0]);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(focusable[0]);

    act(() => root.render(React.createElement(FocusReaderOverlay, { ...props, isOpen: false })));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
