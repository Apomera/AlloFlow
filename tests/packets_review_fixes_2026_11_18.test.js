import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// Fixes from the 2026-11-18 review of the Packets activities against the app (owner: "please keep reviewing other
// activities for parity gaps"). Each is a way a file gave an answer away or recorded the wrong thing:
// - Sound Counting at Easy: the right number was the 3rd button for every word of 3 or more sounds (and the largest
//   from 6 on); the row now slides, seeded, so a file is the same each time.
// - Missing Letter: a board that hides a non-letter (the ' of "I'm") is refused (the only non-letter choice).
// - Word Scramble: the tiles never start as the word (also after the ' and - are out, or two equal letters swapped).
// - Symbol Runner: on dot, ink and size cards a lane's name no longer says the card's word ("5 dots" was the answer).
// - Letter Trace: on the lowercase part only its own skip shows ("Skip (not traced)" marked a traced capital).
// - Spelling Bee: the first-letter hint never writes a one-letter word.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const toWav = async () => 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQAAAAA=';
const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
// An env whose clips all exist (prepare asks for the word, the instruction and sounds by name).
const env = (word) => new Proxy({ word }, { get: (t, k) => (k in t ? t[k] : () => 'clip') });

describe('Sound Counting, Easy: the answer is not always in the same place', () => {
  it('the row holds the count, keeps its length, and the count is not always the 3rd button', async () => {
    const words = ['cat', 'dog', 'sun', 'map', 'pig', 'bed', 'hat', 'cup', 'pen', 'top', 'ship', 'frog', 'sand', 'plant', 'stamp'];
    const made = await builder.buildPacket({ words, activities: ['counting'], seed: 1, choices: 'easy', core, dictionary, banks: BANKS, loader, wordlist, toWav });
    const items = made.lesson.blocks[0].items;
    const places = new Set();
    for (const it of items) {
      const base = core.countingChoices(Number(it.target), 'easy').map(String);
      expect(it.values, it.word).toContain(String(it.target));
      expect(it.values.length, it.word).toBe(base.length);
      expect(it.values.map(Number).every((v, i, a) => i === 0 || v === a[i - 1] + 1), it.word).toBe(true);
      places.add(it.values.indexOf(String(it.target)));
    }
    expect(places.size, 'answer places ' + [...places].join(',')).toBeGreaterThan(1);
    // The same file again: the same rows.
    const again = await builder.buildPacket({ words, activities: ['counting'], seed: 1, choices: 'easy', core, dictionary, banks: BANKS, loader, wordlist, toWav });
    expect(again.lesson.blocks[0].items.map((it) => it.values)).toEqual(items.map((it) => it.values));
  });
});

describe('Missing Letter and Word Scramble boards never give the word away', () => {
  it('a Missing Letter board that hides a non-letter is refused', () => {
    const prep = loader.ADAPTERS.missing_letter.prepare;
    const ok = prep({ activityItems: { missing_letter: { hiddenIndex: 0, correctLetter: 'i', options: ['i', 'a', 'o'] } } }, env("i'm"));
    expect(ok.item, JSON.stringify(ok)).toBeTruthy();
    const bad = prep({ activityItems: { missing_letter: { hiddenIndex: 1, correctLetter: "'", options: ["'", 'a', 'o'] } } }, env("i'm"));
    expect(bad.missing).toEqual(['board']);
  });

  it('Word Scramble tiles never spell the word, with a prepared board or without one', () => {
    const prep = loader.ADAPTERS.word_scramble.prepare;
    for (const [word, board] of [['eek', ['e', 'e', 'k']], ["i'll", ['i', "'", 'l', 'l']], ['cat', ['c', 'a', 't']], ['at', ['a', 't']]]) {
      const made = prep({ activityItems: { word_scramble: { letters: board } } }, env(word));
      expect(made.item, word + ' ' + JSON.stringify(made)).toBeTruthy();
      const tiles = (made.item.letters || made.item.tiles || []).map((t) => (typeof t === 'string' ? t : t.text || t.letter)).join('');
      expect(tiles.length, word).toBe(word.replace(/['\-]/g, '').length);
      expect(tiles, word).not.toBe(word.replace(/['\-]/g, ''));
    }
  });
});

describe('Symbol Runner: a dot card\'s lanes do not say how many dots', () => {
  it('the target lane of a dot card is named by its number only', async () => {
    const SR = require('../packet_symbol_runner_builder.js');
    const { html } = SR.buildSymbolRunnerPacket({ loader, mode: 'subitize_dots', control: 'direct', rehearsal: false, title: 'Dots' });
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/d.html', beforeParse(w) {
      w.Audio = class { play() { return Promise.resolve(); } pause() {} };
    } });
    opened.push(dom.window);
    const d = dom.window.document;
    d.getElementById('learner-name').value = 'Ana';
    [...d.querySelectorAll('#app button')].find((b) => b.textContent === 'Start').click();
    for (let i = 0; i < 50 && !d.querySelector('[data-sr-lanes]'); i++) await new Promise((r) => setTimeout(r, 10));
    const names = [...d.querySelectorAll('[data-sr-lanes] button[data-lane]')].map((b) => b.getAttribute('aria-label'));
    expect(names).toEqual(['Lane 1', 'Lane 2', 'Lane 3']);
  });

  it('a letter card still names its target lane', () => {
    const src = read('word_sounds_take_home/check_adapters/symbol_runner.js');
    expect(src).toContain("isTarget && !(item.dots > 0 || item.stroopInk || item.sizePair)");
  });
});

describe('Letter Trace and Spelling Bee guards', () => {
  it('on the lowercase part only "Skip the lowercase letter" shows', () => {
    expect(read('word_sounds_take_home/adapters/letter_tracing.js')).toContain('if (skip) skip.hidden = !skipLower.hidden;');
    // The loader carries the same code (built with dev-tools/build_word_sounds_take_home.cjs).
    expect(read('word_sounds_take_home_loader.js')).toContain('if (skip) skip.hidden = !skipLower.hidden;');
  });
  it('the first-letter hint never writes the whole word', () => {
    expect(read('word_sounds_take_home_loader.js')).toContain("if (String(next).toLowerCase() === written.toLowerCase()) return;");
  });
});
