// Word Sounds golden master.
//
// A characterization baseline for WordSoundsModal (the ~25k-line god-component
// slated for decomposition). These snapshots pin the component's observable
// behavior so internals can be refactored with a safety net — a diff here means
// a behavior change, intended or not. Re-baseline deliberately with
// `vitest -u` ONLY when a change is reviewed and expected.
//
// Two layers, both read-only (no changes to word_sounds_module.js):
//   Layer 1 — linguistic anchor data (window.__alloAnchor): the grapho-phonemic
//             anchor table + getAnchor outputs. Pure, deterministic.
//   Layer 2 — render behavior: SSR render of every activity + the correct /
//             incorrect feedback UI, under a frozen deterministic environment.
//
// See tests/helpers/word_sounds_harness.js for how the component is rendered
// headlessly and what its ambient-global contract is.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupWordSounds, renderActivity, baseProps, ACTIVITIES } from './helpers/word_sounds_harness.js';

let H;
const _origRandom = Math.random;
const _origNow = Date.now;

beforeAll(() => {
  H = setupWordSounds();
});

afterAll(() => {
  // restore the primitives the harness froze (hygiene for any later suite)
  Math.random = _origRandom;
  Date.now = _origNow;
});

describe('layer 1 — linguistic anchor data (window.__alloAnchor)', () => {
  it('exposes the anchor table', () => {
    expect(H.anchor).toBeTruthy();
    expect(typeof H.anchor.getAnchor).toBe('function');
    expect(Object.keys(H.anchor.GRAPHOPHONEME_ANCHORS).length).toBeGreaterThan(0);
  });

  it('grapho-phonemic anchor table (snapshot)', () => {
    expect(H.anchor.GRAPHOPHONEME_ANCHORS).toMatchSnapshot();
  });

  it('getAnchor — single letters a..z (snapshot)', () => {
    const out = {};
    for (let c = 97; c <= 122; c++) {
      const letter = String.fromCharCode(c);
      out[letter] = H.anchor.getAnchor(letter);
    }
    expect(out).toMatchSnapshot();
  });

  it('getAnchor — digraphs / trigraphs (snapshot)', () => {
    const graphemes = ['sh', 'ch', 'th', 'wh', 'ck', 'ng', 'ph', 'oo', 'ee', 'ai', 'ay', 'oa', 'igh', 'tch', 'dge', 'ar', 'or', ' er', 'ir', 'ur'];
    const out = {};
    for (const g of graphemes) out[g.trim()] = H.anchor.getAnchor(g.trim());
    expect(out).toMatchSnapshot();
  });
});

describe('layer 2 — render behavior per activity', () => {
  for (const activity of ACTIVITIES) {
    it(`activity "${activity}" renders identically (snapshot)`, () => {
      expect(renderActivity(activity)).toMatchSnapshot();
    });
  }

  it('correct-answer feedback banner (snapshot)', () => {
    const props = baseProps('blending');
    props.wordSoundsFeedback = { isCorrect: true, type: 'correct', message: 'Great job!' };
    expect(renderActivity(props)).toMatchSnapshot();
  });

  it('incorrect-answer feedback banner (snapshot)', () => {
    const props = baseProps('blending');
    props.wordSoundsFeedback = { isCorrect: false, type: 'incorrect', message: 'Listen again' };
    expect(renderActivity(props)).toMatchSnapshot();
  });
});

describe('determinism guard — the golden master is only trustworthy if stable', () => {
  it('every activity renders byte-identically on a repeat render', () => {
    for (const activity of ACTIVITIES) {
      expect(renderActivity(activity)).toBe(renderActivity(activity));
    }
  });
});
