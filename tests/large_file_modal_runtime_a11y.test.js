import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let LargeFileTranscriptionModal;
let root;
let host;
let opener;
let outside;

const file = { name: 'lecture-recording.mp3', size: 32 * 1024 * 1024, type: 'audio/mpeg' };
const t = (key) => ({
  'common.close': 'Close large file dialog',
  'common.cancel': 'Cancel',
}[key] || null);

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('large_file_module.js');
  LargeFileTranscriptionModal = window.AlloModules.LargeFileTranscriptionModal;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
});

function createFixture() {
  opener = document.createElement('button');
  opener.type = 'button';
  opener.textContent = 'Choose large file';
  document.body.appendChild(opener);
  opener.focus();

  outside = document.createElement('button');
  outside.type = 'button';
  outside.textContent = 'Outside control';
  document.body.appendChild(outside);

  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
}

describe('Large-file transcription modal runtime accessibility', () => {
  it('moves focus inside, wraps and recovers Tab focus, passes axe, and restores its opener', async () => {
    createFixture();

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return React.createElement(LargeFileTranscriptionModal, {
        isOpen: open,
        file,
        onClose: () => setOpen(false),
        onConfirm: vi.fn(),
        progress: 0,
        totalChunks: 0,
        status: '',
        isProcessing: false,
        t,
      });
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const controls = Array.from(dialog.querySelectorAll('button:not([disabled])'));
    const first = controls[0];
    const last = controls[controls.length - 1];
    expect(document.activeElement).toBe(first);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

    const axeResults = await axe.run(dialog, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    } });
    const serious = axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true,
    })));
    expect(document.activeElement).toBe(last);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true,
    })));
    expect(document.activeElement).toBe(first);

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true,
    })));
    expect(document.activeElement).toBe(first);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toEqual([]);
  });

  it('keeps Escape inert while busy and exposes unknown progress as indeterminate', async () => {
    createFixture();
    const onClose = vi.fn();

    await act(async () => {
      root.render(React.createElement(LargeFileTranscriptionModal, {
        isOpen: true,
        file,
        onClose,
        onConfirm: vi.fn(),
        progress: 0,
        totalChunks: 0,
        status: 'Preparing chunks',
        isProcessing: true,
        t,
      }));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const progressbar = dialog.querySelector('[role="progressbar"]');
    expect(dialog.getAttribute('aria-busy')).toBe('true');
    expect(progressbar.hasAttribute('aria-valuenow')).toBe(false);
    expect(progressbar.getAttribute('aria-valuetext')).toBe('Preparing chunks');

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true,
    })));
    expect(onClose).not.toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).toBe(dialog);
  });
});
