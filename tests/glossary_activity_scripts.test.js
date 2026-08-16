// Lane 1 (fleet 2026-08-16), issues G1/G2/G4.
//
// Every glossary activity is supposed to work with a non-English word list.
// Two things broke that and neither had any coverage, because both live in a
// useEffect that the SSR golden master never runs:
//
//   G2  CrosswordGame cleaned each term with /[^A-ZÀ-ÿ]/, i.e. ASCII
//       plus Latin-1. That deletes every letter of Arabic, Chinese, Cyrillic,
//       Greek, Hebrew, Hindi, Japanese, Korean and Thai, and also of Latin
//       languages whose letters live above U+00FF (Vietnamese, Polish,
//       Turkish, Czech, Romanian). The word list came out empty and the game
//       rendered a blank grid with no message.
//
//   G4  WordScrambleGame tiled the scramble with `scrambled.split('')`, a
//       UTF-16 code-UNIT split. With emoji enabled in Universal Settings the
//       glossary prompt asks for "a relevant emoji for each term" and the
//       schema has no emoji field, so the emoji lands inside `term`. Splitting
//       a non-BMP emoji by code unit yields two lone surrogates, which render
//       as the question-mark-in-a-box glyph Aaron reported.
//
// These tests exercise the real helpers and the real mounted components.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { loadGames, mountGame, utils } from './helpers/games_live_harness.js';

let U;
const cleanups = [];
beforeAll(() => { loadGames(); U = utils(); });
afterEach(() => { while (cleanups.length) cleanups.pop()(); });

const mount = (name, props) => {
  const handle = mountGame(name, props);
  cleanups.push(handle.unmount);
  return handle;
};

// Real word lists. Definitions are in the same language as the terms, which is
// what "a Spanish-only bingo game" actually means.
const LISTS = {
  spanish: [
    { term: 'fotosintesis', def: 'Como las plantas fabrican alimento con la luz' },
    { term: 'nutricion', def: 'La forma en que el cuerpo usa los alimentos' },
    { term: 'energia', def: 'La capacidad de hacer un trabajo' },
  ],
  vietnamese: [
    { term: 'quang hop', def: 'Cach cay xanh tao ra thuc an' },
    { term: 'dinh duong', def: 'Cach co the su dung thuc an' },
    { term: 'nang luong', def: 'Kha nang thuc hien cong viec' },
  ],
  // Vietnamese with its real diacritics: every one of these letters is above
  // U+00FF, so the old Latin-1 filter erased them all.
  vietnameseReal: [
    { term: 'đường', def: 'chất ngọt' },
    { term: 'nước', def: 'chất lỏng' },
    { term: 'ánh sáng', def: 'năng lượng nhìn thấy' },
  ],
  russian: [
    { term: 'энергия', def: 'способность совершать работу' },
    { term: 'генератор', def: 'машина' },
    { term: 'реакция', def: 'изменение' },
  ],
  arabic: [
    { term: 'الماء', def: 'سائل شفاف' },
    { term: 'النبات', def: 'كائن حي' },
    { term: 'الطاقة', def: 'القدرة على العمل' },
  ],
  chinese: [
    { term: '光合作用', def: '植物制造食物的方式' },
    { term: '光线', def: '看得见的能量' },
    { term: '作用力', def: '一种推或拉' },
  ],
};

// U+1F30A WATER WAVE, a single non-BMP code point (two UTF-16 code units).
const WAVE = '\u{1F30A}';
// Family: man + ZWJ + woman + ZWJ + girl. Five code points, eight code units.
const FAMILY = '\u{1F468}‍\u{1F469}‍\u{1F467}';
// Waving hand with a medium-dark skin tone modifier.
const WAVE_HAND = '\u{1F44B}\u{1F3FE}';

// ───────────────────────────────────────────────────────────── G4: emoji ───
describe('G4 emoji are decoration, never scrambleable characters', () => {
  it('strips a plain emoji without touching the letters', () => {
    expect(U.gameWordLetters(WAVE + ' Erosion')).toBe('Erosion');
    expect(U.firstGameEmoji(WAVE + ' Erosion')).toBe(WAVE);
  });

  it('strips a ZWJ sequence as ONE unit instead of tearing it into people', () => {
    expect(U.gameWordLetters(FAMILY + ' Family')).toBe('Family');
    expect(U.firstGameEmoji('Family ' + FAMILY)).toBe(FAMILY);
    // The failure mode being guarded: a per-code-point strip would leave the
    // two zero-width joiners behind.
    expect(U.gameWordLetters(FAMILY + 'Family')).not.toContain('‍');
  });

  it('strips a skin-tone modifier with its base emoji', () => {
    expect(U.gameWordLetters(WAVE_HAND + ' Greeting')).toBe('Greeting');
    expect(U.firstGameEmoji(WAVE_HAND)).toBe(WAVE_HAND);
  });

  it('never leaves a lone surrogate in a scramble, which is the tofu glyph', () => {
    const scrambled = U.scrambleWord(WAVE + ' Erosion');
    for (const unit of scrambled) {
      const code = unit.charCodeAt(0);
      expect(code < 0xd800 || code > 0xdfff, 'lone surrogate U+' + code.toString(16)).toBe(true);
    }
  });

  it('does not count an emoji toward the "long enough to scramble" test', () => {
    // Three emoji and one letter is not a three-letter word.
    expect(U.canScrambleWord(WAVE + WAVE + WAVE + 'a')).toBe(false);
    expect(U.canScrambleWord(WAVE + 'ab')).toBe(true);
  });

  it('mounted Word Scramble puts no emoji on a tile and shows it beside the clue', () => {
    const { container } = mount('WordScrambleGame', {
      data: [{ term: WAVE + ' Erosion', def: 'Wearing away of rock' }],
      onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}
    });
    const tiles = [...container.querySelectorAll('div')]
      .filter(el => /w-12 h-12/.test(el.className));
    expect(tiles.length).toBe('Erosion'.length);
    for (const tile of tiles) {
      expect(tile.textContent).not.toContain(WAVE);
      expect(tile.textContent).toMatch(/^[A-Za-z]$/);
    }
    // Decoration survives, next to the definition.
    expect(container.textContent).toContain(WAVE);
  });

  it('accepts the answer typed without the emoji, because it cannot be typed', () => {
    expect(U.gameFoldAnswer('EROSION')).toBe(U.gameFoldAnswer(WAVE + ' Erosion'));
  });
});

// ────────────────────────────────────────────────────────── G1/G2: scripts ───
describe('G2 crossword accepts non-Latin-1 word lists', () => {
  const gridable = (list, lang) => U.buildCrosswordWords(list, lang || 'English');

  it('Spanish (Latin-1) was already fine and stays fine', () => {
    const out = gridable(LISTS.spanish);
    expect(out.words.length).toBe(3);
    expect(out.script).toBe('latin');
    expect(out.isRtl).toBe(false);
  });

  it('Vietnamese with real diacritics is no longer erased', () => {
    const out = gridable(LISTS.vietnameseReal);
    expect(out.words.length).toBe(3);
    // The old filter kept only A-Z and U+00C0-U+00FF, so every one of these
    // words reduced to fewer than three characters and was dropped.
    expect(out.words.map(w => w.cells.length).every(n => n >= 3)).toBe(true);
  });

  it('Russian (Cyrillic) produces a placeable word list', () => {
    const out = gridable(LISTS.russian);
    expect(out.words.length).toBe(3);
    expect(out.script).toBe('cyrillic');
  });

  it('Arabic produces a placeable word list and is marked right-to-left', () => {
    const out = gridable(LISTS.arabic);
    expect(out.words.length).toBe(3);
    expect(out.script).toBe('arabic');
    expect(out.isRtl).toBe(true);
  });

  it('Chinese produces a placeable list using the two-character floor', () => {
    const out = gridable(LISTS.chinese);
    expect(out.script).toBe('han');
    // "光线" is two characters: a real word that the alphabetic
    // three-letter floor would have thrown away.
    expect(out.words.length).toBe(3);
    expect(out.words.some(w => w.cells.length === 2)).toBe(true);
  });

  it('folds Arabic alef variants and harakat so squares can be shared', () => {
    // ALEF WITH HAMZA ABOVE and bare ALEF must occupy the same square.
    expect(U.gameNormalizeGridLetters('أسد', 'arabic'))
      .toBe(U.gameNormalizeGridLetters('اسد', 'arabic'));
    // FATHA is a diacritic, not a square of its own.
    expect(U.gameNormalizeGridLetters('كَتَب', 'arabic'))
      .toBe(U.gameNormalizeGridLetters('كتب', 'arabic'));
  });

  it('folds Hebrew final forms, which are positional not distinct letters', () => {
    // FINAL MEM vs MEM.
    expect(U.gameNormalizeGridLetters('ם', 'hebrew'))
      .toBe(U.gameNormalizeGridLetters('מ', 'hebrew'));
  });

  it('classifies a mixed list by its dominant script, not its first letter', () => {
    const mixed = [
      { term: 'AlloFlow', def: 'x' },
      ...LISTS.arabic,
    ];
    expect(gridable(mixed).script).toBe('arabic');
  });
});

describe('G2 a mounted crossword really lays out a non-Latin grid', () => {
  const props = (data) => ({
    data, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}
  });
  const filledCells = (container) =>
    [...container.querySelectorAll('[id^="crossword-cell-"]')];

  it('Arabic fills real squares and sets the grid direction to rtl', () => {
    const { container } = mount('CrosswordGame', props(LISTS.arabic));
    const cells = filledCells(container);
    expect(cells.length).toBeGreaterThan(0);
    const grid = container.querySelector('[role="grid"]');
    expect(grid.getAttribute('dir')).toBe('rtl');
  });

  it('Chinese fills real squares and stays left-to-right', () => {
    const { container } = mount('CrosswordGame', props(LISTS.chinese));
    expect(filledCells(container).length).toBeGreaterThan(0);
    expect(container.querySelector('[role="grid"]').getAttribute('dir')).toBe('ltr');
  });

  it('Russian fills real squares', () => {
    const { container } = mount('CrosswordGame', props(LISTS.russian));
    expect(filledCells(container).length).toBeGreaterThan(0);
  });

  it('a word list with nothing placeable explains itself instead of going blank', () => {
    const { container } = mount('CrosswordGame', props([
      { term: 'a', def: 'one letter' },
      { term: WAVE, def: 'only an emoji' },
    ]));
    expect(filledCells(container).length).toBe(0);
    // The old build set an empty grid and returned, leaving a bare page. Look
    // for the visible explanation specifically: the component always carries
    // an sr-only role="status" for announcements, so "a status node exists"
    // would pass against the broken build too.
    const explained = [...container.querySelectorAll('[role="status"]')]
      .some(el => !el.className.includes('sr-only') && el.textContent.trim().length > 0);
    expect(explained).toBe(true);
  });
});

describe('G1 the activities that pass terms through untouched really do', () => {
  const props = (data) => ({
    data, onClose: () => {}, playSound: () => {}, onScoreUpdate: () => {}, onGameComplete: () => {}
  });

  it('Memory shows Arabic terms verbatim', () => {
    const { container } = mount('MemoryGame', props(LISTS.arabic));
    expect(container.textContent).toContain(LISTS.arabic[0].term);
  });

  it('Matching shows Chinese terms verbatim', () => {
    const { container } = mount('MatchingGame', props(LISTS.chinese));
    expect(container.textContent).toContain(LISTS.chinese[0].term);
  });

  it('Word Scramble runs on a Russian list', () => {
    const { container } = mount('WordScrambleGame', props(LISTS.russian));
    const tiles = [...container.querySelectorAll('div')].filter(el => /w-12 h-12/.test(el.className));
    expect(tiles.length).toBeGreaterThan(2);
  });

  it('Word Scramble runs on a Vietnamese list with diacritics intact', () => {
    const { container } = mount('WordScrambleGame', props(LISTS.vietnameseReal));
    const tiles = [...container.querySelectorAll('div')].filter(el => /w-12 h-12/.test(el.className));
    expect(tiles.length).toBeGreaterThan(2);
    // Every tile holds exactly one printed character.
    for (const tile of tiles) {
      expect(U.gameGraphemes(tile.textContent).length).toBe(1);
    }
  });
});
