// Language Deck practice marked correct answers wrong (fleet 2026-08-16, C2).
//
// Three code paths independently decided what the right answer was:
//   1. option generation        AlloFlowANTI.txt, the isFlashcardQuizMode effect
//   2. grading                  AlloFlowANTI.txt, handleQuizOptionClick
//   3. the green highlight      view_glossary_source.jsx, inside flashcardOptions.map
//
// Path 3 compared the option against `currentItem.def`, the English definition,
// with no reference to flashcardMode. In the Standard Deck that is the right
// answer, so the bug hid. In the Language Deck the options are translations, so
// nothing ever matched: the grader scored the pick correct, added 20 points and
// played the success chime, while the option the student pressed was painted red
// with an X. Audio said right, the screen said wrong.
//
// The fix is one shared pure function, flashcardCorrectAnswer, called by all
// three. This file lifts that function out of the monolith and checks both the
// behaviour and the fact that no path re-derives the answer on its own.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const ANTI_PATH = 'AlloFlowANTI.txt';
const VIEW_PATH = 'view_glossary_source.jsx';

let anti;
let view;
let correctAnswer;
let NO_ANSWER;

beforeAll(() => {
  anti = fs.readFileSync(ANTI_PATH, 'utf8');
  view = fs.readFileSync(VIEW_PATH, 'utf8');

  // Source-literal extraction rather than importing the monolith: it is ~2.5MB
  // of JSX and this test only needs one pure top-level helper.
  const start = anti.indexOf("const FLASHCARD_NO_ANSWER = 'Translation unavailable';");
  if (start < 0) throw new Error('FLASHCARD_NO_ANSWER not found in ' + ANTI_PATH);
  const end = anti.indexOf('window.flashcardCorrectAnswer = flashcardCorrectAnswer;', start);
  if (end < 0) throw new Error('flashcardCorrectAnswer export not found in ' + ANTI_PATH);

  const lifted = new Function(
    anti.slice(start, end) + '; return { flashcardCorrectAnswer, FLASHCARD_NO_ANSWER };'
  )();
  correctAnswer = lifted.flashcardCorrectAnswer;
  NO_ANSWER = lifted.FLASHCARD_NO_ANSWER;
});

const ITEM = {
  term: 'photosynthesis',
  def: 'how a plant makes food from sunlight',
  translations: {
    Spanish: 'fotosintesis: como una planta hace comida con la luz del sol',
    Hmong: 'kev ua zaub mov los ntawm lub hnub ci',
  },
};

const OTHER = {
  term: 'evaporation',
  def: 'when water turns into vapor',
  translations: { Spanish: 'evaporacion: cuando el agua se convierte en vapor' },
};

describe('flashcardCorrectAnswer is the single source of truth', () => {
  it('returns the translation, not the English definition, for the Language Deck', () => {
    const answer = correctAnswer(ITEM, 'language', 'Spanish');
    expect(answer).toBe('como una planta hace comida con la luz del sol');
    expect(answer).not.toBe(ITEM.def);
  });

  it('keeps the whole translation when it carries no "term:" prefix', () => {
    expect(correctAnswer(ITEM, 'language', 'Hmong')).toBe(ITEM.translations.Hmong);
  });

  it('splits only on the first colon so a colon inside the definition survives', () => {
    const item = { def: 'd', translations: { Spanish: 'razon: la causa: el porque' } };
    expect(correctAnswer(item, 'language', 'Spanish')).toBe('la causa: el porque');
  });

  it('returns the English definition for the Standard Deck', () => {
    expect(correctAnswer(ITEM, 'standard', null)).toBe(ITEM.def);
    expect(correctAnswer(ITEM, 'standard', 'Spanish')).toBe(ITEM.def);
  });

  it('falls back to the placeholder instead of an empty or undefined answer', () => {
    expect(correctAnswer(null, 'language', 'Spanish')).toBe(NO_ANSWER);
    expect(correctAnswer(ITEM, 'language', 'Karen')).toBe(NO_ANSWER);
    expect(correctAnswer({ def: '', translations: {} }, 'standard', null)).toBe(NO_ANSWER);
    expect(correctAnswer({ def: 'd', translations: { Spanish: 'termino:   ' } }, 'language', 'Spanish')).toBe(NO_ANSWER);
  });
});

describe('the graded answer and the highlighted answer agree', () => {
  // Reproduces all three paths against the shared helper and asserts they land
  // on the same string. The pre-fix highlight rule is checked explicitly so this
  // test fails if anyone reintroduces it.
  const cases = [
    { mode: 'language', lang: 'Spanish' },
    { mode: 'standard', lang: null },
  ];

  cases.forEach(({ mode, lang }) => {
    it(`agrees in ${mode} mode`, () => {
      const bank = [ITEM, OTHER];
      const idx = 0;

      // 1. option generation
      const generated = correctAnswer(bank[idx], mode, lang);
      const distractors = bank
        .filter((_, i) => i !== idx)
        .map((item) => correctAnswer(item, mode, lang))
        .filter((d) => d !== NO_ANSWER && d !== generated);
      const options = [generated, ...distractors];

      // 2. grading, as handleQuizOptionClick does it
      const graded = correctAnswer(bank[idx], mode, lang);

      // 3. the highlight, as the view does it
      const highlighted = options.filter((opt) => opt === correctAnswer(bank[idx], mode, lang));

      expect(options).toContain(graded);
      expect(highlighted).toEqual([graded]);
      expect(generated).toBe(graded);
    });
  });

  it('the old highlight rule would have highlighted nothing in the Language Deck', () => {
    const generated = correctAnswer(ITEM, 'language', 'Spanish');
    const oldRule = [generated].filter((opt) => opt === ITEM.def);
    expect(oldRule).toEqual([]);
  });

  it('never offers the same answer twice in the option list', () => {
    const twin = { term: 'x', def: ITEM.def, translations: { Spanish: ITEM.translations.Spanish } };
    const bank = [ITEM, twin, OTHER];
    const generated = correctAnswer(bank[0], 'language', 'Spanish');
    const options = [
      generated,
      ...bank
        .filter((_, i) => i !== 0)
        .map((item) => correctAnswer(item, 'language', 'Spanish'))
        .filter((d) => d !== NO_ANSWER && d !== generated),
    ];
    expect(options.filter((o) => o === generated)).toHaveLength(1);
  });
});

describe('no path re-derives the answer', () => {
  it('the host grader calls the shared helper', () => {
    const grader = anti.slice(
      anti.indexOf('const handleQuizOptionClick = (e, option) =>'),
      anti.indexOf('const prevFlashcard =')
    );
    expect(grader).toContain('flashcardCorrectAnswer(currentItem, flashcardMode, flashcardLang)');
    expect(grader).not.toContain('trans.substring(trans.indexOf(":") + 1)');
  });

  it('the option-list effect calls the shared helper', () => {
    expect(anti).toContain('const correctOption = flashcardCorrectAnswer(currentItem, flashcardMode, flashcardLang);');
    expect(anti).not.toContain('const parseTrans = (text) =>');
  });

  it('the view is handed the helper and no longer compares against item.def', () => {
    expect(anti).toMatch(/handleQuizOptionClick,[\s\S]{0,400}\n\s*flashcardCorrectAnswer,/);
    expect(view).toContain('var flashcardCorrectAnswer = props.flashcardCorrectAnswer');
    expect(view).toContain('opt === flashcardCorrectAnswer(currentItem, flashcardMode, flashcardLang)');
    expect(view).not.toContain('const isCorrectAnswer = opt === currentItem.def;');
  });

  it('announces the verdict to screen readers, not by colour alone', () => {
    expect(view).toContain("<h3 role=\"status\" aria-live=\"polite\" aria-atomic=\"true\"");
  });

  it('keeps the built and deployed glossary modules synchronized', () => {
    const built = fs.readFileSync('view_glossary_module.js', 'utf8');
    const deployed = fs.readFileSync('desktop/web-app/public/view_glossary_module.js', 'utf8');
    expect(deployed).toBe(built);
  });
});
