// WHAT A STUDENT DEVICE GETS, AND WHAT IT MUST NOT.
//
// Two things, both about the student side of Word Sounds.
//
// HYDRATION. Every route that opens the player is supposed to populate
// wsPreloadedWords first: the three live-session pushes, the resource card,
// the setup launch. A route that forgets leaves a child looking at "Loading
// your words… ⏳" with nothing behind it. Rather than audit entry points
// forever, the host reconciles at the one place they all pass through — the
// player being open with no words and a word-sounds resource in hand.
//
// TEACHER AFFORDANCES. The player's "Review Words" panel lists every word with
// its phonemes, rhyme answers and distractors, and "Edit" lets the list be
// changed. Those are for a teacher preparing the activity. On a student device
// they hand over the answers to the thing the child is about to be scored on.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const ANTI = read('AlloFlowANTI.txt');
const MODULE = read('word_sounds_module.js');

describe('the player cannot open without its words', () => {
  it('the host reconciles when the player is open and empty', () => {
    const idx = ANTI.indexOf('Hydration safety net');
    expect(idx, 'safety net not found').toBeGreaterThan(0);
    const block = ANTI.slice(idx, idx + 1600);
    expect(block).toMatch(/if \(!isWordSoundsMode\) return;/);
    expect(block).toMatch(/if \(Array\.isArray\(wsPreloadedWords\) && wsPreloadedWords\.length > 0\) return;/);
    expect(block).toMatch(/gc\.type !== 'word-sounds'/);
  });

  it('it fills a gap and never overwrites', () => {
    // Bailing when words are already present is what makes it safe to run on
    // every open, including the routes that hydrate correctly.
    const idx = ANTI.indexOf('Hydration safety net');
    const block = ANTI.slice(idx, idx + 1600);
    const bail = block.indexOf('wsPreloadedWords.length > 0) return;');
    const write = block.indexOf('setWsPreloadedWords(');
    expect(bail).toBeGreaterThan(0);
    expect(bail).toBeLessThan(write);
  });

  it('it accepts either shape the resource can carry', () => {
    const idx = ANTI.indexOf('Hydration safety net');
    const block = ANTI.slice(idx, idx + 1600);
    expect(block).toMatch(/gc\.wsPreloadedWords/);
    expect(block).toMatch(/Array\.isArray\(gc\.data\) \? gc\.data : \[\]/);
  });

  it('and brings the lesson-plan sequence with it', () => {
    const idx = ANTI.indexOf('Hydration safety net');
    expect(ANTI.slice(idx, idx + 1600)).toMatch(/setWsActivitySequence\(seq\)/);
  });

  it('the routes that already hydrate still do', () => {
    // Three live-session push sites plus the resource card. The safety net is
    // a backstop, not a replacement.
    expect((ANTI.match(/hydrateWordSoundsFromSync\(target\)/g) || []).length).toBe(3);
    // The resource-card restore branch moved into misc_handlers (2026-08-22
    // modularization); the three live-push sites above stayed in the host.
    expect(read('misc_handlers_source.jsx')).toMatch(/Restoring preloaded words from saved wsPreloadedWords/);
  });
});

describe('teacher prep surfaces stay on the teacher device', () => {
  it('the player is told who is holding the device', () => {
    expect(ANTI, 'the host must pass it').toMatch(/^\s+isTeacherMode,$/m);
    expect(MODULE, 'the module must accept it').toMatch(/isTeacherMode = false,/);
  });

  it('defaults to hidden, not to shown', () => {
    // A host that does not pass the prop should hide a teacher control, not
    // expose it to a child. The teacher still reaches review from setup.
    expect(MODULE).toMatch(/isTeacherMode = false,/);
  });

  it('Review Words is gated', () => {
    const idx = MODULE.indexOf('onClick: () => setShowReviewPanel(true),');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx - 900, idx)).toMatch(/isTeacherMode &&\s*\n\s*!isProbeMode &&/);
  });

  it('Edit is gated', () => {
    const idx = MODULE.indexOf('onClick: () => setIsEditing((prev) => !prev),');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx - 400, idx)).toMatch(/isTeacherMode &&\s*\n\s*!isProbeMode &&/);
  });

  it('probe mode still hides both, for its own reason', () => {
    // Opening review mid-probe replaces the probe UI and its Start button
    // wipes the evidence. That guard predates this one and must survive it.
    expect(MODULE).toMatch(/isTeacherMode &&\s*\n\s*!isProbeMode &&\s*\n\s*preloadedWords\.length > 0 &&/);
  });
});

describe('the mirrors carry it', () => {
  it('word_sounds_module mirror matches', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(MODULE);
  });
});
