// COMPONENT IDENTITY / CHILD-STATE SURVIVAL.
//
// The activity sub-views (RhymeView, OrthographyView, SoundMappingView,
// LetterTraceView, ...) used to be declared INSIDE WordSoundsModal's body. That
// gave each one a fresh function identity on every parent render, so React saw a
// new component type and unmounted + remounted the whole subtree. React.memo and
// the `key` props were inert. The parent re-renders constantly — every audio
// play flips isPlayingAudio, and probe mode ticks a 1s timer — so any state the
// child owned was wiped mid-task:
//
//   * Sight & Spell (orthography): the letters a child had typed vanished the
//     moment they tapped a letter tile to HEAR it, because that tap calls
//     onPlayAudio -> handleAudio -> setIsPlayingAudio(true).
//   * Sound Mapping: filled grapheme slots reset.
//   * Letter Tracing: captured strokes + canvas reset (that feeds formation score).
//
// These tests pin the fix at the level that actually matters — observable child
// state surviving a parent render — rather than asserting where the code lives.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, ReactDOMServer, act, WordSoundsModal;
const mounted = [];

function mount(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ host, root });
  return { host, root };
}

const spellingInput = (host) => host.querySelector('input[type="text"], input:not([type])');

function typeInto(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ReactDOMServer = require(resolve(MODULES_DIR, 'react-dom/server'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
});

afterEach(() => {
  while (mounted.length) {
    const { host, root } = mounted.pop();
    try { act(() => { root.unmount(); }); } catch (_) { /* already gone */ }
    host.remove();
  }
});

describe('activity sub-views keep their identity across parent renders', () => {
  it('orthography: a typed spelling survives tapping a letter tile to hear it', async () => {
    const { host } = mount(React.createElement(WordSoundsModal, studentProps('orthography', [])));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    const input = spellingInput(host);
    expect(input).not.toBeNull();
    typeInto(input, 'ca');
    expect(spellingInput(host).value).toBe('ca');

    // The letter bank tiles play the letter name on click. That call reaches the
    // parent (handleAudio -> setIsPlayingAudio), which re-renders WordSoundsModal.
    const tiles = [...host.querySelectorAll('[draggable="true"]')];
    expect(tiles.length).toBeGreaterThan(0);
    await act(async () => {
      tiles[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(spellingInput(host).value).toBe('ca');
  });

  it('orthography: a typed spelling survives an unrelated parent prop change', async () => {
    const props = studentProps('orthography', []);
    const { host, root } = mount(React.createElement(WordSoundsModal, props));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });

    typeInto(spellingInput(host), 'ca');
    act(() => {
      root.render(React.createElement(WordSoundsModal, {
        ...props,
        wordSoundsScore: { correct: 3, total: 6, streak: 2 },
      }));
    });

    expect(spellingInput(host).value).toBe('ca');
  });

  it('every activity sub-view is declared at module scope, not inside the component', () => {
    // Structural backstop: the behavioural tests above only cover the views whose
    // state is reachable from markup. This catches a regression in any of them.
    const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    const componentStart = src.indexOf('window.AlloModules.WordSoundsModal = ({');
    expect(componentStart).toBeGreaterThan(0);
    for (const name of ['RhymeView', 'ManipulationView', 'SyllableBlendingView',
      'SyllableCountingView', 'OrthographyView', 'SoundMappingView', 'LetterTraceView']) {
      const at = src.indexOf(`const ${name} = React.memo(`);
      expect(at, `${name} declaration not found`).toBeGreaterThan(0);
      expect(at, `${name} is declared INSIDE WordSoundsModal — it will be re-created every render`)
        .toBeLessThan(componentStart);
    }
  });
});

describe('no module-scope component renders raw i18n keys', () => {
  // window.ts is never assigned anywhere in the app. AnchorStrip sits at module
  // scope and used to bind a module-level `ts` that degraded to `(key) => key`,
  // so `ts(k) || "English"` returned the truthy raw key and the anchor strip
  // showed literal "word_sounds.anchor_badge" text above most activities.
  it('the anchor strip renders English, not word_sounds.* keys', () => {
    const html = ReactDOMServer.renderToStaticMarkup(
      React.createElement(WordSoundsModal, baseProps('isolation')),
    );
    const leaked = [...new Set(html.match(/word_sounds\.[a-z_]+/g) || [])];
    expect(leaked, `raw i18n keys reached the UI: ${leaked.join(', ')}`).toEqual([]);
    expect(html).toContain('Anchor');
  });

  it('there is no module-scope `ts` binding to silently fall back to', () => {
    const src = readFileSync(resolve(process.cwd(), 'word_sounds_module.js'), 'utf8');
    expect(src).not.toMatch(/^\s{0,6}const ts = typeof window\.ts/m);
  });
});
