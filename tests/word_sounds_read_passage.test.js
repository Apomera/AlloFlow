// A STORY IS THREE SENTENCES THAT SHARE A REFERENT.
//
// Read the Story is the micro-passage step of the connected-text bridge:
// three short sentences about ONE word, every occurrence of that word
// blanked, one choice filling them all. What makes it a story rather than
// three unrelated lines is the referent carrying across sentences — so the
// gate demands the target in at least two of the three, and the fallback
// rotates three DIFFERENT frames instead of repeating one.
//
// Same print-target discipline as its siblings: the word is never spoken
// before the answer; the whole story is read back after it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const SOURCE = read('word_sounds_setup_source.jsx');
const MODULE = read('word_sounds_module.js');

/** Evaluate the real gate helpers, story gate included. */
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
    return { packStoryIsUsable, packSentenceIsUsable, joinPackSentence, READ_SENTENCE_FRAMES };`;
  // eslint-disable-next-line no-new-func
  return new Function(harness)();
}

const TABLES = {
  SIGHT_WORD_PRESETS: {
    'Pre-K (Dolch)': ['the', 'a', 'I', 'can', 'see', 'is', 'in', 'on', 'at', 'my', 'we', 'like', 'look', 'here', 'has', 'and', 'hot'],
  },
  SOUND_MATCH_POOL: ['corn', 'bat'],
};

describe('the story gate', () => {
  const H = loadHelpers(TABLES);
  const ok = (story, w, sess) => H.packStoryIsUsable(story, w, sess || new Set());

  it('accepts three connected sentences about the word', () => {
    expect(ok(['Look at the corn.', 'The corn is hot.', 'We like the corn.'], 'corn')).toBe(true);
  });

  it('accepts one target-less sentence when the other two carry the referent', () => {
    expect(ok(['Look at the corn.', 'The corn is hot.', 'We like it here.'], 'corn')).toBe(false);
    // "it" is not on the stub lists — but with vouched glue it passes:
    expect(ok(['Look at the corn.', 'The corn is hot.', 'I can see the bat.'], 'corn')).toBe(true);
  });

  it('rejects a "story" the word barely appears in', () => {
    // One sentence with the target is a sentence, not a story about it.
    expect(ok(['Look at the corn.', 'I can see the bat.', 'Here is the bat.'], 'corn')).toBe(false);
  });

  it('rejects the word twice in one sentence, unknown words, and wrong shapes', () => {
    expect(ok(['The corn is corn.', 'The corn is hot.', 'We like the corn.'], 'corn'), 'twice').toBe(false);
    expect(ok(['Look at the corn.', 'The corn is effervescent.', 'We like the corn.'], 'corn'), 'unknown').toBe(false);
    expect(ok(['Look at the corn.', 'The corn is hot.'], 'corn'), 'two sentences').toBe(false);
    expect(ok('Look at the corn.', 'corn'), 'not an array').toBe(false);
  });

  it('the fallback frame triplet always survives its own gate', () => {
    for (let seed = 0; seed < 4; seed++) {
      const story = [0, 1, 2].map((off) => {
        const f = H.READ_SENTENCE_FRAMES[(seed + off) % H.READ_SENTENCE_FRAMES.length];
        return H.joinPackSentence(f.before, 'corn', f.after);
      });
      expect(ok(story, 'corn'), story.join(' ')).toBe(true);
      // Three DIFFERENT sentences — a story, not an echo.
      expect(new Set(story).size).toBe(3);
    }
  });
});

describe('the compiled pack carries the board', () => {
  it('gated AI story or rotated frames, cut into parts', () => {
    expect(SOURCE).toMatch(/packStoryIsUsable\(item\.story, word, rsSessionWords\)/);
    expect(SOURCE).toMatch(/read_passage: readPassage/);
    // A story with no cuttable blank is skipped, never shipped unscoreable.
    expect(SOURCE).toMatch(/if \(rpParts\.some\(\(p\) => !p\.text\)\) \{/);
  });

  it('the AI is asked for the story, and the raw array is stored for compile', () => {
    expect(SOURCE).toMatch(/DECODABLE STORY \(Read the Story activity\)/);
    expect(SOURCE).toMatch(/story: Array\.isArray\(data\.story\) \? data\.story : \[\],/);
  });

  it('the prewarm packs the story clip, the options, and the instruction', () => {
    expect(SOURCE).toMatch(/\.\.\.\(boards\.read_passage\?\.options \|\| \[\]\),/);
    expect(SOURCE).toMatch(/tasks\.add\(boards\.read_passage\.story\);/);
    expect(SOURCE).toMatch(/tasks\.add\('Read the story\. Which word finishes it\?'\);/);
  });
});

describe('the player treats the story as print', () => {
  it('registers in the orthographic tier and the Sentences group', () => {
    const idx = MODULE.indexOf('id: "read_passage"');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx, idx + 400)).toMatch(/tier: "orthographic"/);
    expect(MODULE).toMatch(/read_passage: "text",/);
  });

  it('is graded, English-only, and word-level like its siblings', () => {
    const nonGraded = MODULE.match(/WS_NON_GRADED_ACTIVITIES = new Set\(\[([^\]]*)\]\)/);
    expect(nonGraded[1]).not.toMatch(/read_passage/);
    const gate = MODULE.indexOf('case "read_sentence": // sight-word frames');
    expect(MODULE.slice(gate, gate + 200)).toMatch(/case "read_passage":/);
    const acts = MODULE.match(/_wordLevelActs = \[([^\]]*)\]/);
    expect(acts[1]).toMatch(/read_passage/);
  });

  it('every mid-item re-speak site excludes it (all five)', () => {
    const guards = MODULE.match(/!== "read_sentence" &&\s+wordSoundsActivity !== "read_passage"/g) || [];
    expect(guards.length).toBe(5);
  });

  it('reads the whole story back on correct, never mid-probe', () => {
    const idx = MODULE.indexOf('(wordSoundsActivity === "read_sentence" || wordSoundsActivity === "read_passage") && !isProbeMode');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx, idx + 300)).toMatch(/readPassageBoardRef\.current\?\.story/);
  });

  it('every blank is a drop target and every chip a tappable button', () => {
    const idx = MODULE.indexOf('case "read_passage": {');
    expect(idx).toBeGreaterThan(0);
    const block = MODULE.slice(idx, MODULE.indexOf('default:', idx));
    expect(block).toMatch(/onClick: \(\) => rpCheck\(w\)/);
    expect(block).toMatch(/rpBlank\("rp-blank-" \+ i\)/);
    // Target-less sentences render as plain lines.
    expect(block).toMatch(/p\.text\s*\?/);
  });

  it('startActivity clears the board', () => {
    expect(MODULE).toMatch(/setReadPassageBoard\(null\);/);
    expect(MODULE).toMatch(/lastWordForReadPassage\.current = null;/);
  });

  it('the local fallback rotates three different frames', () => {
    const idx = MODULE.indexOf('const parts = [0, 1, 2].map((offset) => {');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx, idx + 220)).toMatch(/\(seed \+ offset\) % READ_SENTENCE_FRAMES\.length/);
  });
});

describe('one instruction string, three homes', () => {
  const INSTRUCTION = 'Read the story. Which word finishes it?';

  it('setup prewarm, player fallback, and both string tables agree', () => {
    expect(SOURCE.includes(`tasks.add('${INSTRUCTION}');`)).toBe(true);
    expect(MODULE.includes(`|| "${INSTRUCTION}"`)).toBe(true);
    expect(read('allo_data_source.jsx').includes(`'word_sounds.read_passage_prompt': '${INSTRUCTION}'`)).toBe(true);
    expect(read('ui_strings.js').includes(`"read_passage_prompt": "${INSTRUCTION}"`)).toBe(true);
  });
});

describe('the built modules and mirrors carry it', () => {
  it('setup module and allo_data module', () => {
    expect(read('word_sounds_setup_module.js')).toMatch(/packStoryIsUsable/);
    expect(read('allo_data_module.js')).toMatch(/read_passage_prompt/);
  });

  it('mirrors are byte-identical', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(MODULE);
    expect(read('desktop/web-app/public/word_sounds_setup_module.js')).toBe(read('word_sounds_setup_module.js'));
    expect(read('desktop/web-app/public/allo_data_module.js')).toBe(read('allo_data_module.js'));
    expect(read('desktop/web-app/public/ui_strings.js')).toBe(read('ui_strings.js'));
    expect(read('desktop/web-app/public/student_analytics_module.js')).toBe(read('student_analytics_module.js'));
  });
});
