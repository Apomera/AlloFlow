// @vitest-environment jsdom
// Review Words panel polish (2026-11-08): clicking a row's word opens its details (controls inside the row keep
// their own action), choices sit in an even grid with the correct answer tagged, and the rhyme readiness note
// says what happens and what the teacher can do.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SOURCE = readFileSync('misc_components_source.jsx', 'utf8');
let Panel, root, container;

beforeAll(() => {
  window.React = React;
  window.AlloModules ||= {};
  const stub = () => null;
  for (const m of readFileSync('misc_components_module.js', 'utf8').matchAll(/createElement\(([A-Z][A-Za-z0-9]+)[,)]/g)) if (!globalThis[m[1]] && !window[m[1]]) globalThis[m[1]] = stub;
  delete window.AlloModules.MiscComponentsModule;
  new Function(readFileSync('misc_components_module.js', 'utf8'))();
  Panel = window.WordSoundsReviewPanel;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; container?.remove(); });

async function mount() {
  container = document.createElement('div'); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(React.createElement(Panel, {
    preloadedWords: [{ word: 'cat', targetWord: 'cat', phonemes: ['k', 'a', 't'], ttsReady: true, rhymeWord: 'hat', rhymeDistractors: ['dog'] }],
    t: () => '', onClose: () => {}, onStartActivity: () => {}, onUpdateWord: () => {}, onPlayAudio: async () => {}, activitySequence: ['rhyming'],
  })));
}
const details = () => container.querySelector('#word-sounds-details-0');

describe('review rows', () => {
  it('clicking the word opens and closes its details', async () => {
    await mount();
    expect(details()).toBeNull();
    const word = [...container.querySelectorAll('span')].find((s) => s.textContent === 'cat');
    await act(async () => word.click());
    expect(details()).not.toBeNull();
    await act(async () => word.click());
    expect(details()).toBeNull();
  });
  it('a control inside the row keeps its own action and does not toggle the details', async () => {
    await mount();
    const move = [...container.querySelectorAll('button')].find((b) => b.getAttribute('data-word-delete-button') !== 'true' && b.closest('[data-ws-review-row-actions]') && !b.getAttribute('aria-controls'));
    await act(async () => move.click());
    expect(details()).toBeNull();
  });
  it('choices are an even grid with the answer tagged, and the rhyme note is plain', () => {
    expect(SOURCE.match(/<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">/g).length).toBe(3);
    expect(SOURCE.match(/\{t\('word_sounds\.review_answer_tag'\) \|\| '✓ Answer'\}/g).length).toBe(2);
    expect(SOURCE).toContain("Rhyme Time words without a saved rhyme: {count}. Student devices will pick one; type your own in the word's details to choose it.");
    expect(SOURCE).not.toContain('board is built on-device');
  });
});
