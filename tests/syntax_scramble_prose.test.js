// Sentence scramble offers only the reading's prose sentences.
//
// WHY (2026-09-24): the game is opened from the adapted reading, whose text is
// Markdown. It stripped "#*_~" and kept any line of four or more words, so
// students were asked to unscramble headings, bold labels, table rows (with "|"
// tiles), chart JSON, reference URLs, list numbers, citation links and the
// English translation of a bilingual reading.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, mountGame } from './helpers/games_live_harness.js';

const cleanups = [];
afterEach(() => { cleanups.splice(0).reverse().forEach(fn => fn()); });
const click = el => { expect(el).toBeTruthy(); act(() => el.click()); };
const control = (container, key) => container.querySelector('[data-help-key="' + key + '"]');
const tiles = container => [...container.querySelectorAll('[data-help-key="syntax_pool_word"]')].map(el => el.textContent);
const sorted = words => [...words].sort().join(' ');

const TEXT = [
  '# The Water Cycle Explained For Students',
  '',
  '**How Water Moves Around Earth**',
  '',
  'Water moves between the land and the sky.[⁽¹⁾](https://example.org/water)',
  '',
  '| Stage | What happens to water |',
  '|---|---|',
  '| Evaporation | Water turns into a gas |',
  '',
  '[[CHART: {"type":"bar","title":"Rain in four big cities","data":[1,2]}]]',
  '',
  '---',
  '',
  '1. Clouds form when water vapor cools.',
  '- See [the rain guide](https://example.org/rain) for more.',
  '',
  'References:',
  '1. https://example.org/water Water facts for kids today',
  '',
  '--- ENGLISH TRANSLATION ---',
  '',
  'This English sentence should not appear here.',
].join('\n');
const PROSE = ['Water moves between the land and the sky.', 'Clouds form when water vapor cools.', 'See the rain guide for more.'];

describe('sentences offered from an adapted reading', () => {
  it('are its prose sentences only, with links read as their words', () => {
    const onGameComplete = vi.fn();
    const game = mountGame('SyntaxScramble', { text: TEXT, onClose: vi.fn(), onGameComplete });
    cleanups.push(game.unmount);
    const played = [];
    for (let round = 0; round < PROSE.length; round++) {
      const pool = tiles(game.container);
      const sentence = PROSE.find(s => sorted(s.split(' ')) === sorted(pool));
      expect(sentence, 'unexpected tiles: ' + pool.join(' ')).toBeTruthy();
      played.push(sentence);
      for (const word of sentence.split(' ')) click([...game.container.querySelectorAll('[data-help-key="syntax_pool_word"]')].find(el => el.textContent === word));
      click(control(game.container, 'syntax_check'));
      click(control(game.container, 'syntax_next'));
    }
    expect(played.sort()).toEqual([...PROSE].sort());
    expect(onGameComplete).toHaveBeenCalledWith('syntaxScramble', expect.objectContaining({ totalSentences: PROSE.length }));
  });
  it('a bold line that is a sentence is still offered', () => {
    const game = mountGame('SyntaxScramble', { text: '**Plants need light to grow.**', onClose: vi.fn() });
    cleanups.push(game.unmount);
    expect(sorted(tiles(game.container))).toBe(sorted('Plants need light to grow.'.split(' ')));
  });
});
