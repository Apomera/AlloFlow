// Fixes from the 2026-11-18 review of the app's Word Sounds against the practice files (owner: "please keep
// reviewing other activities for parity gaps"). Each was a way a screen gave the answer away or misled a student:
// - the "Help" toggle turned the spoken instructions off: it now says which they are (on screen and to a screen reader);
// - Word Scramble's "Hint" button was named "Play word": its name now starts with the words it shows (WCAG 2.5.3);
// - Sound Counting at Easy put the answer 3rd for every word of 3+ sounds: the row slides by a hash of the word;
// - Blend Sounds (and Syllable Blending) showed the word's picture, the answer, before it was solved;
// - Sound Sort and Word Families printed every word on the board after two misses, while it was open;
// - Spelling Bee's Show More could fill in every letter; the first-letter hint could write a one-letter word;
// - a prepared Missing Letter board could hide the ' of "I'm"; Word Scramble tiles could start as the word.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupWordSounds } from './helpers/word_sounds_harness.js';
import { studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const SRC = readFileSync('word_sounds_module.js', 'utf8');
let React, ReactDOMClient, act, WordSoundsModal;
const mounted = [];
beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
});
afterEach(() => { while (mounted.length) { const { root, host } = mounted.pop(); act(() => root.unmount()); host.remove(); } });
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });
async function mount(activity) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(WordSoundsModal, studentProps(activity, []))); });
  mounted.push({ root, host });
  await settle();
  return host;
}

describe('the app says what its buttons do', () => {
  it('the instructions toggle says whether the spoken instructions are on, not "Help"', async () => {
    const host = await mount('isolation');
    const toggle = Array.from(host.querySelectorAll('button')).find((b) => /^Instructions are (ON|OFF)$/.test(b.getAttribute('aria-label') || ''));
    expect(toggle, 'the toggle').toBeTruthy();
    expect(toggle.textContent).toContain(toggle.getAttribute('aria-label'));
    expect(toggle.textContent).not.toMatch(/\bHelp\b/);
    const before = toggle.getAttribute('aria-label');
    act(() => { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    await settle();
    expect(toggle.getAttribute('aria-label')).not.toBe(before);
  });

  it('Word Scramble\'s hint button is named by the words it shows', async () => {
    const host = await mount('word_scramble');
    // (The harness's t() gives a key back for a string it lacks, and its ts() gives nothing: the name reads
    // "Hint: word_sounds.play_word" here, "Hint: Play word" in the app.)
    const hint = Array.from(host.querySelectorAll('button')).find((b) => /^Hint: /.test(b.getAttribute('aria-label') || ''));
    expect(hint, 'the hint button').toBeTruthy();
    expect(hint.getAttribute('aria-label')).toMatch(/^Hint: (Play word|word_sounds\.play_word)$/);
    const shown = hint.textContent.trim();
    expect(hint.getAttribute('aria-label').startsWith(shown)).toBe(true);
    expect(Array.from(host.querySelectorAll('button')).some((b) => b.getAttribute('aria-label') === 'word_sounds.play_word' && b === hint)).toBe(false);
  });
});

describe('the app gives no answer away (the guards are in place)', () => {
  it('Sound Counting at Easy slides its row by a hash of the word', () => {
    expect(SRC).toContain('if (trimmedCounts && countLevel.difficulty === "easy" && trimmedCounts.length > 1) {');
    expect(SRC).toContain('trimmedCounts = Array.from({ length: w }, (_, i) => low + i);');
  });
  it('Blend Sounds and Syllable Blending show the picture only once the item is done', () => {
    expect(SRC).toContain('if (wordSoundsActivity === "blending" || wordSoundsActivity === "syllable_blending") return "afterCompletion";');
  });
  it('a find-all board does not print its words after two misses', () => {
    expect(SRC).toContain('if (wordSoundsActivity !== "sound_sort" && wordSoundsActivity !== "word_families") setShowWordText(true);');
  });
  it('Spelling Bee hints never write the last letter', () => {
    expect(SRC).toContain('if (nextBlank >= 0 && blanks() > 1) filled[nextBlank] = letters[nextBlank];');
    expect(SRC).toContain('if (!next || next === userAnswer || next.toLowerCase() === word.toLowerCase()) return;');
  });
  it('a prepared Missing Letter board never hides a non-letter; Word Scramble tiles never start as the word', () => {
    expect(SRC).toContain('!!letter && word[ml.hiddenIndex] === letter && !wsSpellFixedChar(letter) &&');
    expect(SRC).toContain('if (tiles.length > 1 && tiles.join("").toLowerCase() === target) {');
  });
});
