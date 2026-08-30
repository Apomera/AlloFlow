// ttsReady MEANT TWO THINGS, AND THE PACK PAID FOR IT.
//
// A demo project saved five words all flagged ttsReady: true while _ttsAssets
// held clips for six DISTRACTORS and none of the five targets. The first
// explanation — that regenerating a word had deleted its clip — was wrong, and
// the file says so: the compiler packs the target word, every board option
// (47, 51, 46, 36 and 48 of them) and a dozen-plus instruction fragments per
// word, so 100+ clips were expected. Six arrived, all of them options of the
// FIRST word, and not one instruction fragment. That is a rate limit aborting
// the packing run (prewarmAborted), not an edit.
//
// The compiler was honest about it: with no target clip packed, ttsReady was
// false on all five. Then the player's runtime prefetch wrote ttsReady: ok
// into the PERSISTED pack, where ok means "a blob was fetched a moment ago" —
// something that dies with the tab and can never reach a student device. So
// opening the player rewrote the honest false to true, and that is what got
// saved. One name, two meanings, and a pack that claimed audio it never had.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MODULE = read('word_sounds_module.js');
const MISC = read('misc_components_source.jsx');
// The restore branch lived in AlloFlowANTI.txt until the 2026-08-22 modularization
// moved the resource-open handlers into misc_handlers; the recompute went with it.
const HANDLERS = read('misc_handlers_source.jsx');

describe('the pack owns ttsReady; the player does not', () => {
  it('the runtime prefetch writes a runtime flag', () => {
    const idx = MODULE.indexOf('_runtimeAudioReady: ok');
    expect(idx, 'the persisted writer must not claim pack readiness').toBeGreaterThan(0);
  });

  it('nothing in the player sets ttsReady true any more', () => {
    // Only the setup compiler may assert that a portable clip exists.
    // Comment lines are excluded — one of them quotes the old bug.
    const code = MODULE.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
    const assignments = code.match(/ttsReady: true/g) || [];
    expect(assignments.length, 'found a player-side ttsReady:true').toBe(0);
  });

  it('the compiler still owns it, and computes it from the assets', () => {
    expect(read('word_sounds_setup_source.jsx'))
      .toMatch(/item\.ttsReady = !!packedTtsAssets\[normalizePackKey\(word\)\]/);
  });

  it('a word needs fetching only when neither kind of audio is present', () => {
    expect(MODULE).toMatch(/!w\.ttsReady && !w\._runtimeAudioReady && !w\._audioRequested/);
  });
});

describe('what the teacher sees stays accurate', () => {
  it('the play button accepts either kind of audio', () => {
    // Otherwise splitting the flag would grey out a button for audio that
    // plays perfectly well on this device.
    expect(MISC).toMatch(/disabled=\{playingWordIndex !== null \|\| !\(word\.ttsReady \|\| word\._runtimeAudioReady\)\}/);
  });

  it('the portable-audio gap offers no fix, because none exists in the player', () => {
    // Retry audio fetches a blob. It cannot write _ttsAssets, so a button here
    // could never close this gap. Saying what does fix it beats a button that
    // reports "unchanged" forever.
    const gap = MISC.slice(MISC.indexOf("key: 'audio',"), MISC.indexOf("key: 'audio_runtime',"));
    expect(gap).toMatch(/each: null/);
    expect(gap).not.toMatch(/batch:/);
    // The remedy is named in packNote, which the line interpolates.
    expect(gap).toMatch(/\$\{packNote\}/);
    expect(MISC).toMatch(/re-prepare the pack in setup/);
  });

  it('runtime failures keep the Retry button, which is what it does fix', () => {
    const gap = MISC.slice(MISC.indexOf("key: 'audio_runtime',"), MISC.indexOf("key: 'rhyme',"));
    expect(gap).toMatch(/test: \(w\) => w && w\._ttsFailed/);
    expect(gap).toMatch(/batch: onRetryFailedTTS/);
  });
});

describe('opening a saved pack repairs the claim', () => {
  it('the host recomputes ttsReady from the assets it actually holds', () => {
    const idx = HANDLERS.indexOf('const _portableKeys = new Set();');
    expect(idx, 'restore should not trust the saved flag').toBeGreaterThan(0);
    const block = HANDLERS.slice(idx - 600, idx + 900);
    expect(block).toMatch(/ttsReady: _portableKeys\.has\(/);
    expect(block).toMatch(/_runtimeAudioReady: false/);
  });

  it('the recomputation normalises keys the same way the pack does', () => {
    // _ttsAssets keys are normalised text; comparing raw would report every
    // word missing.
    const idx = HANDLERS.indexOf('const _portableKeys = new Set();');
    const block = HANDLERS.slice(idx, idx + 900);
    expect((block.match(/\.trim\(\)\.toLowerCase\(\)\.replace\(\/\\s\+\/g, ' '\)/g) || []).length).toBe(2);
  });
});

describe('the reported file, replayed', () => {
  // The exact shape that shipped: five targets flagged ready, six distractor
  // clips, no instruction fragments.
  const saved = [
    { targetWord: 'bun', ttsReady: true, _ttsAssets: { bus: { mime: 'audio/wav', base64: 'x' }, bug: { mime: 'audio/wav', base64: 'x' }, run: { mime: 'audio/wav', base64: 'x' } } },
    { targetWord: 'done', ttsReady: true },
    { targetWord: 'fun', ttsReady: true },
  ];

  /** The host's recomputation, lifted out of the restore branch. */
  const recompute = (words) => {
    const keys = new Set();
    words.forEach((w) => {
      if (w && w._ttsAssets && typeof w._ttsAssets === 'object') {
        Object.keys(w._ttsAssets).forEach((k) => {
          if (w._ttsAssets[k]) keys.add(String(k).trim().toLowerCase().replace(/\s+/g, ' '));
        });
      }
    });
    return words.map((w) => ({
      ...w,
      ttsReady: keys.has(String((w && (w.targetWord || w.word || w.term)) || '').trim().toLowerCase().replace(/\s+/g, ' ')),
    }));
  };

  it('turns three false claims into three honest ones', () => {
    expect(saved.every((w) => w.ttsReady)).toBe(true);
    expect(recompute(saved).map((w) => w.ttsReady)).toEqual([false, false, false]);
  });

  it('would keep a genuine claim', () => {
    const good = [{ targetWord: 'bun', ttsReady: false, _ttsAssets: { bun: { mime: 'audio/wav', base64: 'x' } } }];
    expect(recompute(good)[0].ttsReady).toBe(true);
  });
});
