import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');

let React, ReactDOMClient, act, WordSoundsModal;
const mounted = [];

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
});

afterEach(() => {
  while (mounted.length) {
    const { root, host, opener } = mounted.pop();
    act(() => root.unmount());
    host.remove();
    opener.remove();
  }
});

describe('Word Sounds dialog keyboard behavior', () => {
  it('names the main dialog, focuses its heading, traps Tab, closes on Escape, and restores focus', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Open Word Sounds';
    document.body.appendChild(opener);
    opener.focus();

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const onClose = vi.fn();
    act(() => {
      root.render(React.createElement(WordSoundsModal, { ...studentProps('blending', []), onClose }));
    });
    mounted.push({ root, host, opener });
    await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 10)); });

    const dialog = host.querySelector('[role="dialog"]');
    const heading = host.querySelector('#word-sounds-dialog-title');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-labelledby')).toBe('word-sounds-dialog-title');
    expect(heading.textContent).toContain('Word Sounds Studio');
    expect(document.activeElement).toBe(heading);

    const focusable = Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
    expect(focusable.length).toBeGreaterThan(1);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const hiddenButton = document.createElement('button');
    hiddenButton.className = 'hidden';
    dialog.appendChild(hiddenButton);

    last.focus();
    act(() => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(first);

    first.focus();
    act(() => first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);

    act(() => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);
    mounted.pop();
    host.remove();
    opener.remove();
  });

  it('keeps both result overlays reachable, modal, labelled, keyboard-contained, and scrollable', () => {
    const source = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    expect(source).toContain('if (showProbeResults) return renderProbeResults();');
    for (const id of ['word-sounds-probe-results-title', 'word-sounds-session-complete-title']) {
      expect(source).toContain(`"aria-labelledby": "${id}"`);
      expect(source).toContain(`id: "${id}"`);
    }
    expect(source).toContain('onKeyDown: (event) => handleDialogKeyDown(event, finishProbe)');
    expect(source).toContain('onKeyDown: (event) => handleDialogKeyDown(event, closeSessionDialog)');
    expect(source.match(/max-h-\[calc\(100vh-2rem\)\] overflow-y-auto/g)).toHaveLength(2);
  });
});
