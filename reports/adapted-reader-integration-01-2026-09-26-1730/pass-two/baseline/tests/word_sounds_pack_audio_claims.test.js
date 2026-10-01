// A PACK MUST NOT CLAIM AUDIO IT NO LONGER HAS, AND "LOADING" MUST END.
//
// Aaron's saved project would not open: the player sat on "Loading your
// words… ⏳". The file itself was fine — five words, phonemes on all of them —
// but the inspector found something worse inside it:
//
//   pack words : bun, done, fun, hon, none
//   _ttsAssets : bus, bug, but, run, bin, dog        (six DISTRACTORS)
//   target words with portable audio: 0 / 5
//   every one of them flagged ttsReady: true
//
// Regenerating a word in the review panel deletes its clip from _ttsAssets so
// the fresh one wins, but ttsReady lives on the word's own entry and was left
// alone. The two drifted apart, the pack advertised audio it did not hold, and
// the readiness panel called it complete.
//
// The second half is why it never recovered. startActivity's "no words yet"
// branch set a message and returned, and the only effect that could start the
// player later is gated on firstWordReady — which is set inside
// preloadInitialBatch, which returns early when wordPool is empty. wordPool is
// built from glossaryTerms alone, so a pack-only project (what a saved Word
// Sounds session IS) could never set it. The message was terminal.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MODULE = read('word_sounds_module.js');

/** The real dropPackedClip, executed rather than pattern-matched. */
function loadDropPackedClip() {
  const start = MODULE.indexOf('const dropPackedClip = (words, packKey) =>');
  const end = MODULE.indexOf('// A word\'s packed audio is keyed by its TEXT');
  expect(start, 'dropPackedClip not found').toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(`${MODULE.slice(start, end)}\nreturn dropPackedClip;`)();
}

const pack = () => ([
  {
    targetWord: 'bun',
    ttsReady: true,
    _ttsAssets: { bun: { mime: 'audio/wav', base64: 'AAAA' }, bus: { mime: 'audio/wav', base64: 'BBBB' } },
  },
  { targetWord: 'done', ttsReady: true },
  { targetWord: 'fun', ttsReady: true },
]);

describe('dropping a packed clip drops the claim with it', () => {
  const dropPackedClip = loadDropPackedClip();

  it('removes the clip from whichever word carries the asset map', () => {
    const out = dropPackedClip(pack(), 'bun');
    expect(Object.keys(out[0]._ttsAssets)).toEqual(['bus']);
  });

  it('and marks that word as no longer ready', () => {
    // This is the bug. The clip lives on word[0]'s asset map; ttsReady lives on
    // the word's own entry. Updating one without the other is what produced a
    // pack claiming audio for five words it had none for.
    const out = dropPackedClip(pack(), 'bun');
    expect(out[0].ttsReady).toBe(false);
    expect(out[0]._ttsFailed).toBe(false);
    expect(out[0]._audioRequested).toBe(false);
  });

  it('clears the flag even when the clip lives on a different word', () => {
    // The asset map is carried on word[0] by convention, so regenerating
    // "done" deletes from word[0] while the flag to clear is on word[1].
    const out = dropPackedClip(pack(), 'done');
    expect(out[1].ttsReady).toBe(false);
    expect(out[0].ttsReady, 'word[0] was not regenerated and keeps its claim').toBe(true);
  });

  it('leaves untouched words completely alone', () => {
    const before = pack();
    const out = dropPackedClip(before, 'bun');
    expect(out[2]).toBe(before[2]);
  });

  it('is a no-op for a word that is not in the pack', () => {
    const before = pack();
    const out = dropPackedClip(before, 'zebra');
    expect(out[0]).toBe(before[0]);
    expect(out[1]).toBe(before[1]);
  });

  it('survives holes in the array', () => {
    expect(() => dropPackedClip([null, undefined, { targetWord: 'bun' }], 'bun')).not.toThrow();
  });
});

describe('both invalidation sites use the shared helper', () => {
  it('regenerate-word and refresh-audio both route through it', () => {
    expect((MODULE.match(/dropPackedClip\(prev, packKey\)/g) || []).length).toBe(4);
  });

  it('the persisted copy is updated too', () => {
    // Without this the stale ttsReady rides into the saved project file, which
    // is exactly how the bug was found: in a file, days later.
    expect((MODULE.match(/setWsPreloadedWords\(\(prev\) => dropPackedClip/g) || []).length).toBe(2);
  });

  it('no site deletes from _ttsAssets by hand any more', () => {
    // Exactly one: the deletion inside the helper itself. Two would mean a
    // call site had drifted back to updating the assets without the flag.
    expect((MODULE.match(/delete nextAssets\[packKey\]/g) || []).length).toBe(1);
  });
});

describe('"Loading your words" is no longer a dead end', () => {
  it('startActivity arms a retry instead of giving up', () => {
    // The banner ASSIGNMENT, not the several comments that quote it.
    const idx = MODULE.indexOf('message: "Loading your words');
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx - 600, idx)).toMatch(/waitingForWordsRef\.current = true;/);
  });

  it('the retry effect clears the flag before retrying, so it cannot spin', () => {
    const idx = MODULE.indexOf('if (!waitingForWordsRef.current) return;');
    expect(idx).toBeGreaterThan(0);
    const effect = MODULE.slice(idx, idx + 900);
    // Clearing first means a retry that also finds nothing simply re-arms.
    expect(effect.indexOf('waitingForWordsRef.current = false;'))
      .toBeLessThan(effect.indexOf('startActivity('));
    expect(effect).toMatch(/if \(!haveWords\) return;/);
  });

  it('a pack-only project can reach firstWordReady', () => {
    // wordPool is glossary-derived, so a saved Word Sounds session has none and
    // preloadInitialBatch returns early. Returning without setting the flag
    // left the auto-start effect permanently disarmed.
    const idx = MODULE.indexOf('Word pool empty, skipping preload');
    expect(idx).toBeGreaterThan(0);
    const block = MODULE.slice(idx, idx + 700);
    expect(block).toMatch(/preloadedWords && preloadedWords\.length > 0/);
    expect(block).toMatch(/setFirstWordReady\(true\)/);
  });
});

describe('the mirror carries all of it', () => {
  it('matches the root module', () => {
    expect(read('desktop/web-app/public/word_sounds_module.js')).toBe(MODULE);
  });
});
