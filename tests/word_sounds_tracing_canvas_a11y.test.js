import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
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
    const { root, host } = mounted.pop();
    act(() => root.unmount());
    host.remove();
  }
});

describe('Word Sounds path-dependent tracing canvas', () => {
  it('hides the internal mask and accurately describes the exposed drawing surface', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => {
      root.render(React.createElement(WordSoundsModal, studentProps('letter_tracing', [])));
    });
    mounted.push({ root, host });
    await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 20)); });

    const canvases = host.querySelectorAll('canvas');
    expect(canvases).toHaveLength(2);
    const [mask, surface] = canvases;

    expect(mask.getAttribute('role')).toBe('presentation');
    expect(mask.getAttribute('aria-hidden')).toBe('true');
    expect(mask.classList.contains('hidden')).toBe(true);

    expect(surface.getAttribute('role')).toBe('img');
    expect(surface.tabIndex).toBe(0);
    expect(surface.getAttribute('aria-label')).toContain('complete movement path');
    const noteId = surface.getAttribute('aria-describedby');
    expect(noteId).toBe('word-sounds-tracing-path-note');
    expect(host.querySelector(`#${noteId}`).textContent).toContain('path-dependent input');

    const buttons = Array.from(host.querySelectorAll('button')).map((button) => button.textContent.trim());
    expect(buttons).toContain('Clear');
    expect(buttons).toContain('Check ✓');
  });
});
