// CONNECTED TEXT, BUILT ONLY FROM WORDS THE PACK CAN VOUCH FOR.
//
// Finish the Sentence is the bridge between word-level accuracy and reading:
// a decodable sentence with the target word cut out, the word's picture
// anchoring meaning, and option chips the child must tell apart in print.
// The two rules everything below enforces:
//
//   1. The sentence is trustworthy. An AI sentence is used only when every
//      word of it is the target, a session word, or on the K-2 lists the
//      decodability screen already trusts — otherwise a sight-word frame.
//   2. The printed target is never spoken before the answer. The whole
//      point is reading; audio arrives only AFTER, as the completed
//      sentence read back.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const SOURCE = read('word_sounds_setup_source.jsx');
const MODULE = read('word_sounds_module.js');

/** Evaluate the real helpers — decodability screen plus sentence assembly. */
function loadHelpers(tables) {
  const start = SOURCE.indexOf('let _k2Known = null;');
  const end = SOURCE.indexOf('// ── eSpeak G2P');
  expect(start, 'helpers not found').toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const body = SOURCE.slice(start, end);
  const harness = `
    const PACK_COMMON_WORDS = ['cat', 'dog', 'sun', 'bun'];
    const window = { AlloModules: { AlloData: ${JSON.stringify(tables || {})} } };
    ${body}
    return { packSentenceIsUsable, splitPackSentence, joinPackSentence, packSentenceWords, READ_SENTENCE_FRAMES };`;
  // eslint-disable-next-line no-new-func
  return new Function(harness)();
}

const TABLES = {
  SIGHT_WORD_PRESETS: {
    'Pre-K (Dolch)': ['the', 'a', 'I', 'can', 'see', 'is', 'in', 'on', 'at', 'my', 'we', 'like', 'look', 'here', 'has', 'and'],
  },
  SOUND_MATCH_POOL: ['corn', 'bat', 'hot'],
};

describe('the sentence gate — same standard as the decodability screen', () => {
  const H = loadHelpers(TABLES);
  const ok = (s, w, sess) => H.packSentenceIsUsable(s, w, sess || new Set());

  it('accepts a sentence made entirely of the target and trusted words', () => {
    expect(ok('I can see the corn.', 'corn')).toBe(true);
    expect(ok('Look at the bat!', 'bat')).toBe(true);
  });

  it('rejects a sentence containing a word nothing can vouch for', () => {
    expect(ok('I can see the effervescent corn.', 'corn')).toBe(false);
  });

  it('a session word vouches for itself as glue', () => {
    // "bun" is another word the teacher put in this pack.
    expect(ok('I can see the bun and the corn.', 'corn', new Set(['bun']))).toBe(true);
  });

  it('rejects a sentence that does not contain the target exactly once', () => {
    expect(ok('I can see the dog.', 'corn'), 'absent').toBe(false);
    // A second occurrence would leave the answer in plain view.
    expect(ok('The corn is corn.', 'corn'), 'twice').toBe(false);
  });

  it('rejects lengths a K-2 reader should not face', () => {
    expect(ok('The corn.', 'corn'), 'too short').toBe(false);
    expect(ok('I can see the corn and the dog and the cat here.', 'corn'), 'too long').toBe(false);
  });

  it('rejects anything the word check cannot see through', () => {
    expect(ok("I can't see the corn.", 'corn'), 'contraction').toBe(false);
    expect(ok('I see 2 corn.', 'corn'), 'digits').toBe(false);
  });

  it('never rejects "a" and "I", whatever the tables loaded', () => {
    const bare = loadHelpers({});
    // cat/sun are in the local common-word stub; a/I ride the escape hatch.
    expect(bare.packSentenceIsUsable('I can see a cat.', 'cat', new Set(['can', 'see', 'the']))).toBe(true);
  });
});

describe('cutting the blank', () => {
  const H = loadHelpers(TABLES);

  it('splits around a mid-sentence target', () => {
    expect(H.splitPackSentence('The corn is hot.', 'corn')).toEqual({ before: 'The', after: 'is hot.' });
  });

  it('splits a sentence-initial target, case-insensitively', () => {
    expect(H.splitPackSentence('Corn is hot.', 'corn')).toEqual({ before: '', after: 'is hot.' });
  });

  it('splits a sentence-final target', () => {
    expect(H.splitPackSentence('I like corn.', 'corn')).toEqual({ before: 'I like', after: '.' });
  });

  it('never cuts inside a longer word', () => {
    // "corncob" must not be mistaken for the target.
    expect(H.splitPackSentence('The corncob has corn.', 'corn')).toEqual({ before: 'The corncob has', after: '.' });
    expect(H.splitPackSentence('The corncob is here.', 'corn')).toBe(null);
  });

  it('joins frames without a space before punctuation', () => {
    expect(H.joinPackSentence('Look at the', 'cat', '!')).toBe('Look at the cat!');
    expect(H.joinPackSentence('The', 'cat', 'can run.')).toBe('The cat can run.');
  });

  it('every fallback frame ends in terminal punctuation and survives its own gate', () => {
    for (const f of H.READ_SENTENCE_FRAMES) {
      const s = H.joinPackSentence(f.before, 'corn', f.after);
      expect(/[.!?]$/.test(s), s).toBe(true);
      expect(H.packSentenceIsUsable(s, 'corn', new Set()), s).toBe(true);
    }
  });
});

describe('the compiled pack carries the board', () => {
  it('the board is built in compileActivityItems, gated, with the frame fallback', () => {
    expect(SOURCE).toMatch(/packSentenceIsUsable\(item\.sentence, word, rsSessionWords\)/);
    expect(SOURCE).toMatch(/read_sentence: readSentence/);
  });

  it('distractors prefer same-family look-alikes and never reuse a sentence word', () => {
    const idx = SOURCE.indexOf('const rsOptions = boardWithAnswer(word, [');
    expect(idx).toBeGreaterThan(0);
    const block = SOURCE.slice(idx, idx + 500);
    expect(block).toMatch(/item\.sentenceDistractors/);
    expect(block).toMatch(/familySource/);
    expect(block).toMatch(/!rsUsed\.has\(v\)/);
  });

  it('the AI is asked for the sentence and its look-alike distractors', () => {
    expect(SOURCE).toMatch(/DECODABLE SENTENCE \(Finish the Sentence activity\)/);
    expect(SOURCE).toMatch(/"sentenceDistractors": \["core", "cord", "torn"\]/);
  });

  it('AI sentence distractors pass through the unverified-word flag', () => {
    const sweep = SOURCE.indexOf('const candidates = [');
    expect(sweep).toBeGreaterThan(0);
    expect(SOURCE.slice(sweep, sweep + 400)).toMatch(/item\.sentenceDistractors/);
  });

  it('the prewarm packs the option words, the sentence clip, and the instruction', () => {
    expect(SOURCE).toMatch(/\.\.\.\(boards\.read_sentence\?\.options \|\| \[\]\),/);
    expect(SOURCE).toMatch(/tasks\.add\(boards\.read_sentence\.sentence\);/);
    expect(SOURCE).toMatch(/tasks\.add\('Read the sentence\. Which word finishes it\?'\);/);
  });
});

describe('the player treats the target as print, not sound', () => {
  it('registers the activity in the orthographic tier', () => {
    const idx = MODULE.indexOf('id: "read_sentence"');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx, idx + 600)).toMatch(/tier: "orthographic"/);
  });

  it('is graded — never in the practice-only set', () => {
    const nonGraded = MODULE.match(/WS_NON_GRADED_ACTIVITIES = new Set\(\[([^\]]*)\]\)/);
    expect(nonGraded).toBeTruthy();
    expect(nonGraded[1]).not.toMatch(/read_sentence/);
  });

  it('is English-only, alongside the other English-machinery activities', () => {
    const gate = MODULE.indexOf('case "letter_tracing": // LETTER_SVG_PATHS covers a–z only');
    expect(gate).toBeGreaterThan(0);
    expect(MODULE.slice(gate, gate + 200)).toMatch(/case "read_sentence":/);
  });

  it('never auto-speaks the word with instructions off', () => {
    // Growth-proof: the skip line must name this activity, however many
    // siblings later join the print-target family.
    const m = MODULE.match(/if \(wordSoundsActivity === "decoding"[^\n]*\) return;/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain('wordSoundsActivity === "read_sentence"');
  });

  it('every mid-item re-speak of the answer excludes it (all five sites)', () => {
    // Count the paired guard, not the bare comparison — the board effect's
    // own early return also compares against "read_sentence".
    const guards = MODULE.match(/!== "decoding" &&\s+wordSoundsActivity !== "read_sentence"/g) || [];
    expect(guards.length).toBe(5);
  });

  it('reads the completed sentence back on a correct answer, never mid-probe', () => {
    const idx = MODULE.indexOf('const _rbText =');
    expect(idx).toBeGreaterThan(0);
    const block = MODULE.slice(idx, idx + 900);
    expect(block).toMatch(/readSentenceBoardRef\.current\?\.sentence/);
    expect(block).toMatch(/_rbText && !isProbeMode/);
  });

  it('word-level judgment: no per-phoneme mastery attribution', () => {
    const acts = MODULE.match(/_wordLevelActs = \[([^\]]*)\]/);
    expect(acts).toBeTruthy();
    expect(acts[1]).toMatch(/read_sentence/);
  });

  it('startActivity clears the board like every other per-word surface', () => {
    expect(MODULE).toMatch(/setReadSentenceBoard\(null\);/);
    expect(MODULE).toMatch(/lastWordForReadSentence\.current = null;/);
  });

  it('sits in its own continuum group between phonics and spelling', () => {
    expect(MODULE).toMatch(/read_sentence: "text",/);
    expect(MODULE).toMatch(/"pa_large", "pa_phoneme", "phonics", "text", "spelling", "handwriting"/);
  });

  it('the adaptive ladder culminates in connected text — English sessions only', () => {
    const idx = MODULE.indexOf('const ORTHO_ORDER = [');
    expect(idx).toBeGreaterThan(0);
    const ladder = MODULE.slice(idx, idx + 900);
    expect(ladder).toMatch(/"missing_letter",/);
    expect(ladder).toContain('"read_sentence",');
    expect(ladder).toContain('"read_passage",');
    // Gated through the same availability predicate as the picker: never
    // auto-advance into an activity the current language would hide.
    expect(ladder).toMatch(/\]\.filter\(wsActivityAvailableForLang\);/);
  });

  it('a sentence-initial blank fills capitalized', () => {
    expect(MODULE).toMatch(/rsBoard\.before \? rsWord : rsWord\.charAt\(0\)\.toUpperCase\(\) \+ rsWord\.slice\(1\)/);
  });

  it('the tapped chip itself shows right/wrong, where the child is looking', () => {
    const idx = MODULE.indexOf('const rsChipClass = (w) =>');
    expect(idx).toBeGreaterThan(0);
    const block = MODULE.slice(idx, idx + 500);
    expect(block).toMatch(/ws-bounce/);
    expect(block).toMatch(/animate-shake/);
    // Applied to the chip, cleared on activity change.
    expect(MODULE).toMatch(/cursor-grab active:cursor-grabbing" \+ rsChipClass\(w\)/);
    expect(MODULE).toMatch(/setRsChipFeedback\(null\);/);
  });

  it('with no picture packed, the printed word anchors instead of a guessing game', () => {
    expect(MODULE).toMatch(/ts\("word_sounds\.read_sentence_word_hint"\) \|\| "Your word:"/);
    // The key exists in both string tables (the i18n gate enforces the pair).
    expect(read('allo_data_source.jsx')).toMatch(/'word_sounds\.read_sentence_word_hint': 'Your word:'/);
    expect(read('ui_strings.js')).toMatch(/"read_sentence_word_hint": "Your word:"/);
  });

  it('tap works wherever drag does (WCAG 2.5.7)', () => {
    const idx = MODULE.indexOf('case "read_sentence": {');
    expect(idx).toBeGreaterThan(0);
    const block = MODULE.slice(idx, MODULE.indexOf('default:', idx));
    expect(block).toMatch(/onClick: \(\) => rsCheck\(w\)/);
    expect(block).toMatch(/onDrop:/);
  });
});

describe('one instruction string, three homes', () => {
  // The packed clip is keyed by the exact text; if the player's prompt and
  // the setup's prewarm string drift apart, the clip silently never plays.
  const INSTRUCTION = 'Read the sentence. Which word finishes it?';

  it('setup prewarm, player fallback, and allo_data all agree', () => {
    expect(SOURCE.includes(`tasks.add('${INSTRUCTION}');`)).toBe(true);
    expect(MODULE.includes(`|| "${INSTRUCTION}"`)).toBe(true);
    expect(read('allo_data_source.jsx').includes(`'word_sounds.read_sentence_prompt': '${INSTRUCTION}'`)).toBe(true);
  });

  it('the fallback frames match between setup and player', () => {
    const H = loadHelpers(TABLES);
    const moduleFrames = MODULE.match(/READ_SENTENCE_FRAMES = \[[\s\S]*?\];/);
    expect(moduleFrames).toBeTruthy();
    for (const f of H.READ_SENTENCE_FRAMES) {
      expect(moduleFrames[0]).toContain(`before: "${f.before}"`);
      expect(moduleFrames[0]).toContain(`after: "${f.after}"`);
    }
  });
});

describe('the built modules and mirrors carry it', () => {
  it('setup module and allo_data module', () => {
    expect(read('word_sounds_setup_module.js')).toMatch(/packSentenceIsUsable/);
    expect(read('allo_data_module.js')).toMatch(/read_sentence_prompt/);
  });

  it('mirrors are byte-identical', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(MODULE);
    expect(read('desktop/web-app/public/word_sounds_setup_module.js')).toBe(read('word_sounds_setup_module.js'));
    expect(read('desktop/web-app/public/allo_data_module.js')).toBe(read('allo_data_module.js'));
  });
});
