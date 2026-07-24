import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

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

describe('Word Sounds decoding drag alternative', () => {
  it('offers every draggable picture as a named, keyboard-focusable native button', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => {
      root.render(React.createElement(WordSoundsModal, studentProps('decoding', [])));
    });
    mounted.push({ root, host });
    await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 20)); });

    expect(host.textContent).toContain('Drag the picture onto the word, or tap the picture');
    const choices = Array.from(host.querySelectorAll('button[draggable="true"]'));
    expect(choices).toHaveLength(4);
    for (const choice of choices) {
      expect(choice.tagName).toBe('BUTTON');
      expect(choice.tabIndex).toBe(0);
      expect(choice.getAttribute('aria-label')).toMatch(/^Picture of /);
      expect(choice.querySelector('img').getAttribute('alt')).toBe(choice.getAttribute('aria-label'));
    }
  });
});
