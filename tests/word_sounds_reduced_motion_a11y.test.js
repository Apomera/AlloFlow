import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
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

describe('Word Sounds reduced motion', () => {
  it('gates every pulse, spin, and bounce utility at the point of use', () => {
    const source = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    const motionLines = source.split(/\r?\n/).filter((line) => /animate-(?:pulse|spin|bounce)/.test(line));
    expect(motionLines).toHaveLength(32);
    for (const line of motionLines) expect(line).toContain('motion-reduce:animate-none');
  });

  it('covers overlay roots and the minimized widget, including descendant transitions', async () => {
    const style = document.getElementById('ws-a11y-css');
    expect(style.textContent).toContain('.fixed.inset-0, .fixed.inset-0::before');
    expect(style.textContent).toContain('.word-sounds-minimized *::after');

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => {
      root.render(React.createElement(WordSoundsModal, studentProps('blending', [])));
    });
    mounted.push({ root, host });
    await act(async () => { await new Promise((resolveWait) => setTimeout(resolveWait, 10)); });

    const minimize = host.querySelector('button[aria-label="common.minimize_to_background"]');
    expect(minimize).not.toBeNull();
    act(() => minimize.click());

    const minimized = host.querySelector('.word-sounds-minimized');
    expect(minimized).not.toBeNull();
    expect(minimized.className).toContain('motion-reduce:animate-none');
    expect(minimized.className).toContain('motion-reduce:transition-none');
  });
});
