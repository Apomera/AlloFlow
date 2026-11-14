// Task T6 (2026-11-14): Bring AlloFlow Packets strengths into the main app's
// Word Sounds & Vocabulary Quizzes:
//   1. School Letter Trace stroke guides (`LETTER_TRACE_STROKES` for all 52
//      letters a-z / A-Z, writing lines, non-overlapping numbered start dots,
//      directional arrows, violet-ink-only checkTracing mask, and
//      both / capital / lowercase case choice).
//   2. Vocabulary wrong-answer quality checks across DefinitionDetectiveGame,
//      Glossary Flashcard Quiz, and QuizView.keyQuality (close-meaning
//      paraphrase avoidance, choice length balance, a/an article giveaway
//      prevention including silent-h "hour" and consonant-/ju:/ "unit", and
//      graceful small-pool fallback).
//   3. Missing Letter fallback rule + R9 homophone trap guard in Word Sounds
//      (`see` s-e-_ never offers `a` -> "sea", vowel/consonant kind matching
//      excluding q/x/y, non-word letters first, deterministic FNV-1a ordering,
//      and teacherEdited preservation).

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { setupWordSounds, baseProps } from './helpers/word_sounds_harness.js';
import { makePackItem, studentProps, installCanvasStub } from './helpers/word_sounds_pack_fixture.js';
import { loadGames, mountGame } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, WordSoundsModal, LetterTraceApi, VocabChecks, GlossaryView, QuizView;
const mounted = [];

function mountElement(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(element); });
  mounted.push({ root, host });
  return { root, host };
}

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  window.__alloT = (k) => k;
  window.AlloIcons = window.AlloIcons || {};

  installCanvasStub();
  ({ WordSoundsModal } = setupWordSounds());
  LetterTraceApi = window.AlloModules.WordSoundsLetterTrace;

  loadGames();
  VocabChecks = window.AlloModules.VocabDistractorChecks;

  loadAlloModule('view_glossary_module.js');
  GlossaryView = window.AlloModules.GlossaryView;

  loadAlloModule('view_quiz_module.js');
  QuizView = window.AlloModules.QuizView;
});

afterEach(() => {
  while (mounted.length) {
    const entry = mounted.pop();
    if (entry.unmount) entry.unmount();
    else {
      act(() => entry.root.unmount());
      entry.host.remove();
    }
  }
  vi.restoreAllMocks();
});

describe('T6.1 — App Letter Trace school stroke guides & capital/lowercase choice', () => {
  it('exposes school ball-and-stick STROKES for all 52 letters (a-z, A-Z) with non-overlapping numbered start dots', () => {
    expect(LetterTraceApi).toBeTruthy();
    const { STROKES, parse, layout, solveGuides } = LetterTraceApi;

    for (let code = 97; code <= 122; code++) {
      const lower = String.fromCharCode(code);
      const upper = lower.toUpperCase();
      expect(typeof STROKES[lower]).toBe('string');
      expect(typeof STROKES[upper]).toBe('string');

      for (const ch of [lower, upper]) {
        const parsed = parse(STROKES[ch]);
        expect(parsed.length).toBeGreaterThanOrEqual(1);
        const shape = layout(ch, 260);
        expect(shape).toBeTruthy();
        const guides = solveGuides(shape, 260);
        expect(guides.dots).toHaveLength(parsed.length);
        expect(guides.many).toBe(parsed.length > 1);

        for (let i = 0; i < guides.dots.length; i++) {
          const [sx, sy] = guides.dots[i].p;
          expect(guides.dots[i].number).toBe(i + 1);
          expect(Number.isFinite(sx)).toBe(true);
          expect(Number.isFinite(sy)).toBe(true);
          for (let j = i + 1; j < guides.dots.length; j++) {
            const [ox, oy] = guides.dots[j].p;
            const dist = Math.hypot(sx - ox, sy - oy);
            expect(dist).toBeGreaterThanOrEqual(35.5);
          }
        }
      }
    }

    // Single-story school 'a' and 'g': 2 strokes each (ball + stick/hook).
    expect(parse(STROKES.a)).toHaveLength(2);
    expect(parse(STROKES.g)).toHaveLength(2);
    expect(layout('sh', 260)).toBeNull();
  });

  it('draws school writing lines, dashed centerlines, numbered green start dots, and directional arrows onto the guide canvas', () => {
    const ops = [];
    const makeRecorderCtx = () => new Proxy({}, {
      get(_target, prop) {
        if (prop === 'canvas') return null;
        return (...args) => { ops.push({ fn: prop, args }); };
      },
      set(_target, prop, value) {
        ops.push({ set: prop, value });
        return true;
      },
    });
    const ctx = makeRecorderCtx();
    const maskOps = [];
    const mCtx = new Proxy({}, {
      get(_target, prop) {
        return (...args) => { maskOps.push({ fn: prop, args }); };
      },
      set() { return true; },
    });

    const shapeA = LetterTraceApi.layout('A', 260);
    const drawn = LetterTraceApi.drawSchoolGuide(ctx, mCtx, shapeA, 260, 260);
    expect(drawn.dots).toHaveLength(3);
    expect(drawn.many).toBe(true);
    // Numbered start dots 1, 2, 3 drawn back-to-front ('3', '2', '1') so dot 1 sits topmost.
    const fillTexts = ops.filter((o) => o.fn === 'fillText').map((o) => o.args[0]);
    expect(fillTexts).toEqual(['3', '2', '1']);
    expect(ops.some((o) => o.set === 'fillStyle' && o.value === '#15803d')).toBe(true);
    // Mask strokes the 3 path segments without drawing writing lines or text numbers.
    expect(maskOps.filter((o) => o.fn === 'stroke')).toHaveLength(3);
    expect(maskOps.filter((o) => o.fn === 'fillText')).toHaveLength(0);
  });

  it('renders numbered arrow caption and supports capital, lowercase, and both case choices in WordSoundsModal', async () => {
    const pack = {
      ...makePackItem(),
      term: 'ant',
      word: 'ant',
      targetWord: 'ant',
      displayWord: 'ant',
      phonemes: ['a', 'n', 't'],
      graphemes: ['a', 'n', 't'],
      activityItems: {
        ...makePackItem().activityItems,
        letter_tracing: { letter: 'a', cases: 'both' },
      },
    };
    const props = {
      ...studentProps('letter_tracing', []),
      isTeacherMode: true,
      wsPreloadedWords: [pack],
      currentWordSoundsWord: 'ant',
      wordSoundsPhonemes: pack,
    };
    const { host } = mountElement(React.createElement(WordSoundsModal, props));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });

    // Starts on capital 'A' (multi-stroke -> numbered start dot caption).
    const how = host.querySelector('[data-ws-trace-how="true"]');
    expect(how).toBeTruthy();
    expect(how.textContent).toContain('Start at the green dot 1. Follow the arrow.');
    expect(host.querySelector('canvas[role="img"]').getAttribute('aria-label')).toContain('for A.');

    const select = host.querySelector('select[data-ws-tracing-cases="true"]');
    expect(select).toBeTruthy();
    expect(select.value).toBe('both');

    // Switch to Lowercase only -> lowercase 'a'.
    act(() => {
      select.value = 'lowercase';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(select.value).toBe('lowercase');
    expect(host.querySelector('canvas[role="img"]').getAttribute('aria-label')).toContain('for a.');

    // Switch to Capital only -> capital 'A'.
    act(() => {
      select.value = 'capital';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(select.value).toBe('capital');
    expect(host.querySelector('canvas[role="img"]').getAttribute('aria-label')).toContain('for A.');
  });
});

describe('T6.2 — Vocabulary wrong-answer checks in the app quizzes', () => {
  it('DefinitionDetectiveGame rejects close-meaning paraphrases, self-naming clues, same-family words, and a/an giveaways while falling back gracefully on small pools', () => {
    expect(VocabChecks).toBeTruthy();
    expect(VocabChecks.vocabCloseMeaning('A natural home where an animal lives', 'The natural place where an animal lives')).toBe(true);
    expect(VocabChecks.vocabCloseMeaning('A natural home where an animal lives', 'Water falling from clouds as rain')).toBe(false);

    // Silent-h "hour" & "honest" take "an" (vowel onset); /ju:/ "unit" & "uniform" take "a" (consonant onset).
    expect(VocabChecks.vocabArticleOnset('hour')).toBe('vowel');
    expect(VocabChecks.vocabArticleOnset('honest')).toBe('vowel');
    expect(VocabChecks.vocabArticleOnset('unit')).toBe('consonant');
    expect(VocabChecks.vocabArticleOnset('uniform')).toBe('consonant');
    expect(VocabChecks.vocabArticleOnset('orbit')).toBe('vowel');

    const target = { key: 'habitat', term: 'habitat', defs: ['The natural place where an animal lives.'] };
    const clue = { key: 'def-habitat', def: 'An ___ where an organism lives.', accepted: new Set(['habitat']) };
    const candidates = [
      target,
      // Close-meaning synonym -> hard rejected
      { key: 'homeplace', term: 'ecological niche', defs: ['A natural place where an animal lives.'] },
      // Consonant onset after "An ___" -> rejected when vowel-onset choices exist
      { key: 'unit', term: 'unit', defs: ['A single standard quantity used to measure.'] },
      { key: 'planet', term: 'planet', defs: ['A rocky or icy world orbiting a star.'] },
      // Valid vowel-onset distractors
      { key: 'orbit', term: 'orbit', defs: ['A curved path around a star or planet.'] },
      { key: 'atom', term: 'atom', defs: ['The smallest building block of an element.'] },
      { key: 'estuary', term: 'estuary', defs: ['A coastal mouth where river water meets sea tide.'] },
    ];
    // Give target a vowel-onset term for the "An ___" blank test:
    const vowelTarget = { key: 'ecosystem', term: 'ecosystem', defs: ['The natural place where an animal lives.'] };
    const vowelClue = { key: 'def-eco', def: 'An ___ where living things interact with water and soil.', accepted: new Set(['ecosystem']) };
    const picked = VocabChecks.selectDetectiveDistractors(vowelTarget, vowelClue, candidates, (arr) => arr);
    expect(picked.map((p) => p.term)).toEqual(['orbit', 'atom', 'estuary']);

    // Small 2-term glossary fallback: still produces a round instead of crashing or returning empty.
    const smallGame = mountGame('DefinitionDetectiveGame', {
      data: [
        { term: 'Sun', def: 'The star at the center of our solar system.' },
        { term: 'Sunlight', def: 'Light and warmth coming from the sky.' },
      ],
      onClose: vi.fn(),
    });
    mounted.push(smallGame);
    expect(smallGame.container.querySelectorAll('[data-help-key="detective_choice"]')).toHaveLength(2);
  });

  it('Glossary Flashcard Quiz filters close-meaning & self-naming options, balances lengths to 4 choices, and falls back gracefully on 2-item decks', () => {
    expect(GlossaryView.selectFlashcardOptions).toBeTypeOf('function');
    const correctFn = (item) => item.def;
    const bank = [
      { term: 'Erosion', def: 'Gradual wearing away of rock or soil by wind and water.' },
      { term: 'Weathering', def: 'Gradual wearing away of rock and soil by water or wind.' }, // closeMeaning!
      { term: 'Runoff', def: 'Water that causes erosion across bare hillsides.' }, // names "erosion"!
      { term: 'Orbit', def: 'Tiny.' }, // stark length outlier (5 chars vs 55 chars)
      { term: 'Photosynthesis', def: 'Process by which green plants make food using sunlight.' },
      { term: 'Condensation', def: 'Change of water vapor into liquid droplets on cool air.' },
      { term: 'Evaporation', def: 'Turning of liquid water into vapor when heated by sun.' },
    ];
    const rawOptions = bank.slice(0, 6).map((x) => x.def); // 6 options as AlloFlowANTI.txt passes
    const filtered = GlossaryView.selectFlashcardOptions(rawOptions, bank[0], bank, correctFn, 'standard', null, null);

    expect(filtered).toHaveLength(4);
    expect(filtered).toContain(bank[0].def);
    expect(filtered).not.toContain(bank[1].def); // close-meaning dropped
    expect(filtered).not.toContain(bank[2].def); // self-naming dropped
    expect(filtered).not.toContain(bank[3].def); // extreme length outlier replaced by balanced extra

    // Graceful 2-item glossary fallback:
    const tiny = bank.slice(0, 2);
    const tinyOut = GlossaryView.selectFlashcardOptions([tiny[0].def, tiny[1].def], tiny[0], tiny, correctFn, 'standard', null, null);
    expect(tinyOut).toEqual([tiny[0].def, tiny[1].def]);
  });

  it('QuizView.keyQuality flags close-meaning, a/an article cues, and single-item length outliers as warnings while keeping ready=true', () => {
    const { keyQuality } = QuizView;
    expect(keyQuality.selectVocabDistractors).toBeTypeOf('function');

    const audit = keyQuality.auditAssessment({
      questions: [
        {
          type: 'mcq',
          question: 'Wait here for an ___ before checking the beaker.',
          options: ['hour', 'minute', 'unit', 'second'],
          correctAnswer: 'hour',
          conceptLabel: 'time',
        },
        {
          type: 'mcq',
          question: 'What does habitat mean?',
          options: [
            'The natural home where an animal or plant lives',
            'A natural home where a plant or animal lives',
            'A tool for measuring wind speed',
            'A chart showing daily rainfall',
          ],
          correctAnswer: 'The natural home where an animal or plant lives',
          conceptLabel: 'habitat',
        },
        {
          type: 'mcq',
          question: 'Which describes photosynthesis?',
          options: [
            'The chemical process in chloroplasts that converts light energy, water, and carbon dioxide into glucose',
            'Cell wall',
            'Dry root',
            'Red leaf',
          ],
          correctAnswer: 'The chemical process in chloroplasts that converts light energy, water, and carbon dioxide into glucose',
          conceptLabel: 'photosynthesis',
        },
      ],
    });

    expect(audit.ready).toBe(true);
    const codes = audit.issues.map((i) => `${i.code}:${i.questionIdx}:${i.severity}`);
    expect(codes).toContain('article-cue-option:0:warning');
    expect(codes).toContain('close-meaning-option:1:warning');
    expect(codes).toContain('option-length-outlier:2:warning');

    const chosen = keyQuality.selectVocabDistractors('hour', ['minute', 'unit', 'orbit', 'atom', 'instant'], {
      stem: 'Wait for an ___ before stirring.',
      count: 3,
      seed: 'hour-test',
    });
    expect(chosen).toEqual(['orbit', 'atom', 'instant']);
  });
});

describe('T6.3 / R9 — App Missing Letter fallback & homophone trap prevention', () => {
  it('never offers "a" on see (s-e-_) in runtime fallback OR non-teacher-edited prepared packs, while preserving teacherEdited packs', async () => {
    // 1. Non-teacher-edited prepared pack with ['e', 'a', 'i', 'u'] on "see" (R9):
    const seePack = {
      ...makePackItem(),
      id: 10,
      term: 'see',
      word: 'see',
      targetWord: 'see',
      displayWord: 'see',
      phonemes: ['s', 'ee'],
      graphemes: ['s', 'ee'],
      activityItems: {
        ...makePackItem().activityItems,
        missing_letter: { hiddenIndex: 2, correctLetter: 'e', options: ['e', 'a', 'i', 'u'] },
      },
    };
    const { host: hostPrepared } = mountElement(React.createElement(WordSoundsModal, {
      ...baseProps('missing_letter'),
      allowRuntimeAi: false,
      wsPreloadedWords: [seePack],
      currentWordSoundsWord: 'see',
      wordSoundsPhonemes: seePack,
    }));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    const preparedChoiceBtns = [...hostPrepared.querySelectorAll('button')]
      .map((b) => b.textContent.trim().toLowerCase())
      .filter((t) => /^[a-z]$/.test(t));
    expect(preparedChoiceBtns).toContain('e');
    expect(preparedChoiceBtns).not.toContain('a'); // "sea" homophone swapped out!
    expect(preparedChoiceBtns).toHaveLength(4);

    // 2. Runtime fallback (no prepared missing_letter board) on "son" & "see":
    const sonUnprepared = { word: 'son', phonemes: ['s', 'u', 'n'] };
    const { host: hostRuntime } = mountElement(React.createElement(WordSoundsModal, {
      ...baseProps('missing_letter'),
      currentWordSoundsWord: 'see',
      wordSoundsPhonemes: { word: 'see', phonemes: ['s', 'ee'] },
    }));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    const runtimeBtns = [...hostRuntime.querySelectorAll('button')]
      .map((b) => b.textContent.trim().toLowerCase())
      .filter((t) => /^[a-z]$/.test(t));
    expect(runtimeBtns).toContain('e');
    expect(runtimeBtns).not.toContain('a'); // "sea" avoided in runtime fallback too
    expect(runtimeBtns.every((ch) => 'aeiou'.includes(ch))).toBe(true); // vowel hidden -> all vowel choices

    // 3. Teacher-edited prepared pack is respected verbatim:
    const teacherPack = {
      ...seePack,
      activityItems: {
        ...seePack.activityItems,
        missing_letter: { hiddenIndex: 2, correctLetter: 'e', options: ['e', 'a', 'i', 'u'], teacherEdited: true },
      },
    };
    const { host: hostTeacher } = mountElement(React.createElement(WordSoundsModal, {
      ...baseProps('missing_letter'),
      allowRuntimeAi: false,
      wsPreloadedWords: [teacherPack],
      currentWordSoundsWord: 'see',
      wordSoundsPhonemes: teacherPack,
    }));
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    const teacherBtns = [...hostTeacher.querySelectorAll('button')]
      .map((b) => b.textContent.trim().toLowerCase())
      .filter((t) => /^[a-z]$/.test(t));
    expect(teacherBtns).toEqual(['e', 'a', 'i', 'u']);
    expect(sonUnprepared.word).toBe('son');
  });
});

describe('T6.4 — 4-copy mirror parity across app bundles', () => {
  it.each([
    'word_sounds_module.js',
    'games_module.js',
    'view_glossary_module.js',
    'view_quiz_module.js',
  ])('keeps %s byte-identical across root, public, app-build, and web-app/build', (filename) => {
    const copies = [
      filename,
      `desktop/web-app/public/${filename}`,
      `desktop/app-build/${filename}`,
      `desktop/web-app/build/${filename}`,
    ];
    const digests = copies.map((p) => createHash('sha256').update(readFileSync(p)).digest('hex'));
    expect(new Set(digests).size).toBe(1);
  });
});
