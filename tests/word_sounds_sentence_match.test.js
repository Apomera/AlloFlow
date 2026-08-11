// ANSWERING A SENTENCE WITH PICTURES.
//
// Picture the Sentence closes the loop the other connected-text activities
// left open: the response itself is meaning, not print. One board shape,
// two tiers — a sequence of 2 means "place both pictures in the order the
// sentence names them" (which cannot be answered without reading left to
// right), a sequence of 1 is the classic sentence→picture match.
//
// The tiles are pack words on purpose: they reuse the exact images Read &
// Match already packs into _decodingAssets, so the activity costs zero new
// image generation — the constraint that shaped the whole design.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const SOURCE = read('word_sounds_setup_source.jsx');
const MODULE = read('word_sounds_module.js');

/** Execute the real pair-frame join. */
function loadFrames() {
  const start = SOURCE.indexOf('const SENTENCE_MATCH_FRAMES');
  const end = SOURCE.indexOf('// A micro-story is three sentences');
  expect(start, 'frames not found').toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const body = SOURCE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${body} return { SENTENCE_MATCH_FRAMES, joinPackPairSentence };`)();
}

describe('the pair frames', () => {
  const { SENTENCE_MATCH_FRAMES, joinPackPairSentence } = loadFrames();

  it('name both words in a fixed left-to-right order', () => {
    const s = joinPackPairSentence(SENTENCE_MATCH_FRAMES[0], 'cat', 'bun');
    expect(s).toBe('The cat can see the bun.');
    expect(s.indexOf('cat')).toBeLessThan(s.indexOf('bun'));
  });

  it('use only sight-word glue and end in terminal punctuation', () => {
    const glue = new Set(['the', 'i', 'see', 'and', 'look', 'at', 'can', 'is', 'with']);
    for (const f of SENTENCE_MATCH_FRAMES) {
      const s = joinPackPairSentence(f, 'cat', 'bun');
      expect(/[.!?]$/.test(s), s).toBe(true);
      for (const w of s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)) {
        expect(w === 'cat' || w === 'bun' || glue.has(w), w).toBe(true);
      }
    }
  });
});

describe('the compiled board', () => {
  it('two tiers from one shape, only for packs with a partner word', () => {
    expect(SOURCE).toMatch(/const smOthers = itemWords\.filter\(\(v\) => v !== word\);/);
    expect(SOURCE).toMatch(/sequence: \[first, second\],/);
    expect(SOURCE).toMatch(/sequence: \[word\],/);
    expect(SOURCE).toMatch(/sentence_match: sentenceMatch/);
  });

  it('never ships fewer than two pictures', () => {
    expect(SOURCE).toMatch(/if \(sentenceMatch\.sequence\.length \+ sentenceMatch\.extras\.length < 2\) sentenceMatch = null;/);
  });

  it('a distractor picture never names a word already in the sentence', () => {
    // In the single tier that would be a second right answer.
    expect(SOURCE).toMatch(/smOthers\.filter\(\(v\) => !smUsed\.has\(v\)\)/);
  });

  it('tiles ride the Read & Match image manifest — no new generation path', () => {
    const idx = SOURCE.indexOf('const decodingWords = [...new Set(processed.flatMap((item) => [');
    expect(idx).toBeGreaterThan(0);
    const block = SOURCE.slice(idx, idx + 400);
    expect(block).toMatch(/sentence_match\?\.sequence/);
    expect(block).toMatch(/sentence_match\?\.extras/);
  });

  it('the prewarm packs the sentence clip, the instruction, and the tile words', () => {
    expect(SOURCE).toMatch(/tasks\.add\(boards\.sentence_match\.sentence\);/);
    expect(SOURCE).toMatch(/tasks\.add\('Read the sentence\. Match the pictures to it\.'\);/);
  });
});

describe('the player treats the sentence as print', () => {
  it('registers in the orthographic tier and the Sentences group', () => {
    const idx = MODULE.indexOf('id: "sentence_match"');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx, idx + 400)).toMatch(/tier: "orthographic"/);
    expect(MODULE).toMatch(/sentence_match: "text",/);
  });

  it('is graded, English-only, and word-level like its siblings', () => {
    const nonGraded = MODULE.match(/WS_NON_GRADED_ACTIVITIES = new Set\(\[([^\]]*)\]\)/);
    expect(nonGraded[1]).not.toMatch(/sentence_match/);
    const gate = MODULE.indexOf('case "read_passage": // same frames');
    expect(MODULE.slice(gate, gate + 200)).toMatch(/case "sentence_match":/);
    const acts = MODULE.match(/_wordLevelActs = \[([^\]]*)\]/);
    expect(acts[1]).toMatch(/sentence_match/);
  });

  it('every mid-item re-speak site excludes it (all five)', () => {
    const guards = MODULE.match(/!== "read_passage" &&\s+wordSoundsActivity !== "sentence_match"/g) || [];
    expect(guards.length).toBe(5);
  });

  it('the instructions-off skip names it', () => {
    const m = MODULE.match(/if \(wordSoundsActivity === "decoding"[^\n]*\) return;/);
    expect(m).toBeTruthy();
    expect(m[0]).toContain('wordSoundsActivity === "sentence_match"');
  });

  it('grades locally with sentinels — the answer pair is never speakable', () => {
    expect(MODULE).toMatch(/checkAnswer\(ok \? "correct" : "incorrect", "correct"\);/);
  });

  it('a wrong ordering marks WHICH slots were right before the retry clears', () => {
    expect(MODULE).toMatch(/setSentenceMatchMarks\(slotsNext\.map\(\(w, i\) => w === smBoard\.sequence\[i\]\)\);/);
    // Marks render on the slots (green keeps, red shakes)...
    expect(MODULE).toMatch(/sentenceMatchMarks\[i\]\s*\?\s*"border-emerald-500/);
    // ...and are held long enough to read before the tray clears.
    const idx = MODULE.indexOf('setSentenceMatchMarks(null);\n                  }\n                }, 1400);');
    expect(idx).toBeGreaterThan(0);
    // Cleared on every board rebuild and activity change.
    expect((MODULE.match(/setSentenceMatchMarks\(null\);/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it('reads the sentence back on correct via the shared read-back map', () => {
    const idx = MODULE.indexOf('const _rbText =');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx, idx + 900)).toMatch(/sentenceMatchBoardRef\.current\?\.sentence/);
  });

  it('the tray only reveals when EVERY tile has its picture', () => {
    const idx = MODULE.indexOf('case "sentence_match": {');
    expect(idx).toBeGreaterThan(0);
    const block = MODULE.slice(idx, MODULE.indexOf('default:', idx));
    expect(block).toMatch(/smBoard\.tiles\.every\(\(w\) => smImgFor\(w\)\)/);
  });

  it('tap works wherever drag does, and a placed tile can be taken back', () => {
    const idx = MODULE.indexOf('case "sentence_match": {');
    const block = MODULE.slice(idx, MODULE.indexOf('default:', idx));
    expect(block).toMatch(/onClick: \(\) => smPlace\(w\)/);
    expect(block).toMatch(/onClick: \(\) => smClear\(i\)/);
    expect(block).toMatch(/onDrop:/);
  });

  it('tile order is shuffled once per board, not per render', () => {
    expect(MODULE).toMatch(/board\.tiles = fisherYatesShuffle\(\[\.\.\.board\.sequence, \.\.\.board\.extras\]\)/);
  });

  it('a one-word pack says why it cannot play, instead of "Preparing..." forever', () => {
    expect(MODULE).toMatch(/sentenceMatchBoard === null && \(preloadedWords \|\| \[\]\)\.length < 2/);
    expect(MODULE).toMatch(/needs at least two words in this pack/);
    expect(read('ui_strings.js')).toMatch(/"sentence_match_needs_words":/);
    expect(read('allo_data_source.jsx')).toMatch(/'word_sounds\.sentence_match_needs_words':/);
  });

  it('startActivity clears the board and the slots', () => {
    expect(MODULE).toMatch(/setSentenceMatchBoard\(null\);/);
    expect(MODULE).toMatch(/setSentenceMatchSlots\(\[\]\);/);
    expect(MODULE).toMatch(/lastWordForSentenceMatch\.current = null;/);
  });
});

describe('one instruction string, three homes', () => {
  const INSTRUCTION = 'Read the sentence. Match the pictures to it.';

  it('setup prewarm, player fallback, and both string tables agree', () => {
    expect(SOURCE.includes(`tasks.add('${INSTRUCTION}');`)).toBe(true);
    expect(MODULE.includes(`|| "${INSTRUCTION}"`)).toBe(true);
    expect(read('allo_data_source.jsx').includes(`'word_sounds.sentence_match_prompt': '${INSTRUCTION}'`)).toBe(true);
    expect(read('ui_strings.js').includes(`"sentence_match_prompt": "${INSTRUCTION}"`)).toBe(true);
  });

  it('brace conventions: single in ui_strings, double in allo_data', () => {
    expect(read('ui_strings.js')).toMatch(/"sentence_match_slot_empty": "Slot \{n\}, empty"/);
    expect(read('allo_data_source.jsx')).toMatch(/'word_sounds\.sentence_match_slot_empty': 'Slot \{\{n\}\}, empty'/);
  });
});

describe('the built modules and mirrors carry it', () => {
  it('setup module and allo_data module', () => {
    expect(read('word_sounds_setup_module.js')).toMatch(/SENTENCE_MATCH_FRAMES/);
    expect(read('allo_data_module.js')).toMatch(/sentence_match_prompt/);
  });

  it('mirrors are byte-identical', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(MODULE);
    expect(read('desktop/web-app/public/word_sounds_setup_module.js')).toBe(read('word_sounds_setup_module.js'));
    expect(read('desktop/web-app/public/allo_data_module.js')).toBe(read('allo_data_module.js'));
    expect(read('desktop/web-app/public/ui_strings.js')).toBe(read('ui_strings.js'));
  });
});
