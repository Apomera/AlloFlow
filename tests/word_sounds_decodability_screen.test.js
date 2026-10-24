// SCREENING THE WORDS THE AI INVENTS.
//
// A generated rhyme family arrived with "hon" in it. Structurally it is a
// flawless CVC — lowercase, one vowel, three letters — so no shape rule can
// ever catch it. It is a poor K-2 item because it is an informal clipping of
// "honey", and only a word list knows that.
//
// Hence two jobs, kept apart. Hard rejects are things that cannot be phonics
// items under any reading, and dropping those silently is safe. Everything
// else that is merely unrecognised is FLAGGED, because the curated lists are a
// few hundred words against a real vocabulary of tens of thousands: dropping
// what is unfamiliar would gut legitimate content and quietly narrow what a
// teacher is allowed to teach. The teacher makes that call, so the teacher
// gets told.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const SOURCE = read('word_sounds_setup_source.jsx');

/** Evaluate the real screen, with the app's own word tables behind it. */
function loadScreen(tables) {
  const start = SOURCE.indexOf('let _k2Known = null;');
  const end = SOURCE.indexOf('// ── eSpeak G2P');
  expect(start, 'screen not found').toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const body = SOURCE.slice(start, end);
  const harness = `
    const PACK_COMMON_WORDS = ['cat','dog','sun','bun'];
    const window = { AlloModules: { AlloData: ${JSON.stringify(tables || {})} } };
    ${body}
    return { k2KnownWords, isUnusableAsPhonicsWord, isUnverifiedK2Word };`;
  // eslint-disable-next-line no-new-func
  return new Function(harness)();
}

// A slice of the shapes the real tables use.
const TABLES = {
  SOUND_MATCH_POOL: ['bat', 'bus', 'fun', 'hop'],
  RIME_FAMILIES: { un: ['bun', 'fun', 'run', 'sun'], at: ['bat', 'cat'] },
  SIGHT_WORD_PRESETS: { 'Pre-K (Dolch)': ['the', 'and', 'away'] },
  WORD_FAMILY_PRESETS: { short_a: ['man', 'pan'] },
};

describe('things that cannot be phonics words are rejected outright', () => {
  const { isUnusableAsPhonicsWord } = loadScreen(TABLES);

  it('rejects anything not purely alphabetic', () => {
    for (const w of ['b4', 'can\'t', 'two words', 'x-ray', '']) {
      expect(isUnusableAsPhonicsWord(w), w).toBe(true);
    }
  });

  it('rejects a string with no vowel', () => {
    expect(isUnusableAsPhonicsWord('tch')).toBe(true);
  });

  it('rejects single letters and very long words', () => {
    expect(isUnusableAsPhonicsWord('a')).toBe(true);
    expect(isUnusableAsPhonicsWord('extraordinary')).toBe(true);
  });

  it('keeps ordinary words, including ones it has never heard of', () => {
    // The hard filter must not become a vocabulary gate.
    for (const w of ['bun', 'hon', 'chat', 'sky']) {
      expect(isUnusableAsPhonicsWord(w), w).toBe(false);
    }
  });
});

describe('unrecognised words are flagged, not deleted', () => {
  const { isUnverifiedK2Word } = loadScreen(TABLES);

  it('flags "hon", the word that started this', () => {
    expect(isUnverifiedK2Word('hon', new Set())).toBe(true);
  });

  it('does not flag words from any of the curated lists', () => {
    for (const w of ['bun', 'bat', 'the', 'man', 'fun']) {
      expect(isUnverifiedK2Word(w, new Set()), w).toBe(false);
    }
  });

  it('does not flag a word the teacher put in this session', () => {
    // A word the teacher typed has already had the judgement applied to it.
    expect(isUnverifiedK2Word('hon', new Set(['hon']))).toBe(false);
  });

  it('is case and whitespace insensitive', () => {
    expect(isUnverifiedK2Word('  BUN  ', new Set())).toBe(false);
  });

  it('degrades to structure-only when the tables are missing', () => {
    // A CDN sibling that has not loaded allo_data must not start flagging
    // every word in the pack.
    const { isUnverifiedK2Word: screen, k2KnownWords } = loadScreen({});
    expect(k2KnownWords().size).toBeGreaterThan(0); // the local common words
    expect(screen('bun', new Set())).toBe(false);   // still known locally
  });
});

describe('it runs where the generated words land', () => {
  it('hard rejects are applied to the generated option lists', () => {
    expect(SOURCE).toMatch(/familyMembers: \(data\.familyMembers \|\| \[\]\)\.filter\(\(w\) => !isUnusableAsPhonicsWord\(w\)\)/);
    expect(SOURCE).toMatch(/rhymeDistractors: \(data\.rhymeDistractors \|\| \[\]\)\.filter\(\(w\) => !isUnusableAsPhonicsWord\(w\)\)/);
  });

  it('the flag pass runs after every word, so the session counts as vouched for', () => {
    const flagIdx = SOURCE.indexOf('const sessionWords = new Set(');
    const compileIdx = SOURCE.indexOf('compileActivityItems(processed);');
    expect(flagIdx).toBeGreaterThan(0);
    expect(flagIdx, 'must run before the boards are compiled').toBeLessThan(compileIdx);
    expect(SOURCE).toMatch(/item\._unverifiedWords = unverified;/);
  });

  /** Renders the canonical review panel, as the teacher sees it, and hands
   *  the unverified-word line (or null) to `check`. */
  async function withUnverifiedGap(preloadedWords, activitySequence, check) {
    const require = createRequire(import.meta.url);
    const React = require(resolve('desktop/web-app/node_modules/react'));
    const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
    const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const code = transformSync(read('misc_components_source.jsx'), { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
    const Panel = new Function('React', `
      const Ban = () => null, CheckCircle2 = Ban, ChevronDown = Ban, ChevronLeft = Ban,
        ImageIcon = Ban, Play = Ban, RefreshCw = Ban, Send = Ban, Sparkles = Ban, Volume2 = Ban;
      ${code}
      return WordSoundsReviewPanel;`)(React);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(React.createElement(Panel, {
        t: () => '', onClose: () => {}, onStartActivity: () => {}, activitySequence,
        // Every fixer is available, so a button wired to this line would render.
        onRegenerateWord: () => {}, onCheckPhonemes: () => {}, onRegenerateManipulationTask: () => {},
        onRetryFailedTTS: () => {}, onGenerateImage: () => {},
        preloadedWords,
      })));
      check(container.querySelector('[data-review-gap="unverified"]'));
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  }

  it('the teacher sees the list, and it is not presented as an error', async () => {
    await withUnverifiedGap([
      { id: 'bun', word: 'bun', ttsReady: true, rhymeWord: 'sun', _unverifiedWords: ['hon'] },
      { id: 'fun', word: 'fun', ttsReady: true, rhymeWord: 'run' },
    ], ['rhyming'], (gap) => {
      expect(gap, 'the unverified-word line must be shown').not.toBeNull();
      expect(gap.textContent).toContain('outside the K-2 word lists: 1');
      expect(gap.textContent).toContain('Examples: hon');
      expect(gap.textContent).toContain('Worth a look before teaching them');
      // No fix button: this is a judgement, not a repair. And not an alert.
      expect(gap.querySelector('button')).toBeNull();
      expect(gap.closest('[role="alert"]')).toBeNull();
    });
  });

  it('a lesson is shown only the generated words its activities use', async () => {
    const tagged = [{ id: 'bun', word: 'bun', ttsReady: true, rhymeWord: 'sun',
      _unverifiedWords: ['hon', 'zorp', 'vog'], _unverifiedBySource: { rhyme: ['hon'], sentence: ['zorp'], blending: ['vog'] } }];
    const examples = (gap) => gap && gap.textContent.match(/Examples: ([^.]*)\./)[1];
    await withUnverifiedGap(tagged, ['rhyming'], (gap) => expect(examples(gap)).toBe('hon'));
    await withUnverifiedGap(tagged, ['read_sentence'], (gap) => expect(examples(gap)).toBe('zorp, vog'));
    await withUnverifiedGap(tagged, ['read_passage'], (gap) => expect(examples(gap)).toBe('zorp, vog'));
    await withUnverifiedGap(tagged, ['blending'], (gap) => expect(examples(gap)).toBe('vog'));
    await withUnverifiedGap(tagged, ['word_families', 'syllable_counting'], (gap) => expect(gap).toBeNull());
    // A pack prepared before the source tags still warns sentence lessons.
    const legacy = [{ id: 'bun', word: 'bun', ttsReady: true, rhymeWord: 'sun', _unverifiedWords: ['zorp'] }];
    await withUnverifiedGap(legacy, ['read_passage'], (gap) => expect(examples(gap)).toBe('zorp'));
    await withUnverifiedGap(legacy, ['blending'], (gap) => expect(gap).toBeNull());
  });

  it('the built modules carry it', () => {
    expect(read('word_sounds_setup_module.js')).toMatch(/isUnverifiedK2Word/);
    expect(read('misc_components_module.js')).toMatch(/_unverifiedWords/);
  });
});
