// TWO REFINEMENTS THE FIRST REVIEW PASS FOUND.
//
// 1. The story read-back was being talked over: the advance to the next
//    word fired at a flat 2s while a three-sentence read-back runs 5-7s,
//    so the payoff of Read the Story collided with the next item's
//    instruction audio. The advance now waits for the read-back, scaled
//    by text length and clamped so it can never stall a session.
//
// 2. The readiness panel was blind to the new boards. A rate-limited
//    packing run can land every WORD clip yet miss the sentence/story
//    clips; a failed image backfill leaves Picture the Sentence tiles
//    bare, and its tray deliberately waits for every picture. Both now
//    have gap lines — with NO fix button, for the same reason as portable
//    word audio: only the setup compiler can write the pack.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MODULE = read('word_sounds_module.js');
const MISC = read('misc_components_source.jsx');

describe('the advance waits for the read-back', () => {
  it('scales with text length, clamped to [2000, 6500]', () => {
    expect(MODULE).toMatch(/let _rbAdvanceMs = 2000;/);
    expect(MODULE).toMatch(/_rbAdvanceMs = Math\.min\(6500, Math\.max\(2000, 350 \+ _rbText\.split\(\/\\s\+\/\)\.length \* 400\)\);/);
  });

  it('uses correctness-neutral exposure time in scored probes', () => {
    const marker = MODULE.indexOf('// Keep scored probe exposure intervals correctness-neutral.');
    expect(marker).toBeGreaterThan(0);
    const advance = MODULE.slice(marker, marker + 450);
    expect(advance).toMatch(/isProbeMode \? 800 : isCorrect \? _rbAdvanceMs : 3000,/);
    expect(advance).not.toMatch(/isProbeMode\s*\?\s*\(isCorrect/);
  });

  it('a story-length read-back gets the time it needs', () => {
    // 15 words → 350 + 6000 = 6350ms, inside the clamp; a 5-word sentence
    // stays at the familiar ~2.35s.
    const delay = (words) => Math.min(6500, Math.max(2000, 350 + words * 400));
    expect(delay(15)).toBe(6350);
    expect(delay(5)).toBe(2350);
    expect(delay(40)).toBe(6500);
  });
});

describe('the readiness panel sees the connected-text boards', () => {
  it('flags sentence/story clips missing from the portable pack', () => {
    const idx = MISC.indexOf("key: 'sentence_audio'");
    expect(idx).toBeGreaterThan(0);
    const gap = MISC.slice(idx, idx + 1600);
    expect(gap).toMatch(/read_sentence && b\.read_sentence\.sentence/);
    expect(gap).toMatch(/read_passage && b\.read_passage\.story/);
    expect(gap).toMatch(/sentence_match && b\.sentence_match\.sentence/);
    expect(gap).toMatch(/!portableKeys\.has\(norm\(s\)\)/);
    // No fix button: nothing in the player can write _ttsAssets.
    expect(gap).toMatch(/each: null/);
  });

  it('flags Picture the Sentence tiles with no image', () => {
    const idx = MISC.indexOf("key: 'tile_images'");
    expect(idx).toBeGreaterThan(0);
    const gap = MISC.slice(idx, idx + 1200);
    expect(gap).toMatch(/sm\.sequence \|\| \[\]/);
    expect(gap).toMatch(/sm\.extras \|\| \[\]/);
    expect(gap).toMatch(/!imageKeys\.has\(norm\(c\)\)/);
    expect(gap).toMatch(/each: null/);
  });

  it('both sit before the unverified-words gap, leaving existing pins intact', () => {
    expect(MISC.indexOf("key: 'sentence_audio'")).toBeLessThan(MISC.indexOf("key: 'unverified'"));
    expect(MISC.indexOf("key: 'tile_images'")).toBeLessThan(MISC.indexOf("key: 'unverified'"));
  });
});

describe('the teacher can read and hear the sentences at prep time', () => {
  it('the review panel shows each word\'s sentence, story, and pair sentence', () => {
    const idx = MISC.indexOf("t('word_sounds.connected_text_label')");
    expect(idx).toBeGreaterThan(0);
    const block = MISC.slice(idx - 1200, idx + 2600);
    expect(block).toMatch(/read_sentence\.sentence/);
    expect(block).toMatch(/read_passage\.story/);
    expect(block).toMatch(/sentence_match\.sentence/);
    // The target word is bolded, and each line has a play button.
    expect(block).toMatch(/wsHighlightTarget\(line\.text, _ctWord\)/);
    expect(block).toMatch(/onPlayAudio\(line\.text\)/);
  });

  it('the highlighter bolds every occurrence, case-insensitively, on word boundaries', () => {
    const idx = MISC.indexOf('const wsHighlightTarget =');
    expect(idx).toBeGreaterThan(0);
    const helper = MISC.slice(idx, idx + 700);
    expect(helper).toMatch(/gi/);
    expect(helper).toMatch(/\\\\b/);
  });
});

describe('the built modules carry it', () => {
  it('misc module and mirrors', () => {
    expect(read('misc_components_module.js')).toMatch(/sentence_audio/);
    expect(read('desktop/web-app/public/misc_components_module.js')).toBe(read('misc_components_module.js'));
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(MODULE);
  });
});
