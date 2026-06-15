// SSR golden master for stem_tool_brainatlas.js (registered StemLab tool
// 'brainAtlas'). The 2026-06-15 deep-dive (docs/brain_atlas_review.md) found a
// 4663-line file with 9 views, 2 quiz systems, an AI tutor, and integrity
// disclaimers — all UNPROTECTED. This pins the render across every view + the
// load-bearing detail panels + the felt-state disclaimers, so the accuracy
// hardening (and any future refactor) can't silently regress.
//
// Reuses the stem widgets smoke harness (loadTool + renderTool(id, toolData)).
// Re-baseline an INTENTIONAL render change with: npx vitest -u tests/brain_atlas_golden.test.js

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

// The quiz shuffles its options with Math.random(); freeze it so digests are stable.

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const VIEWS = ['lateral', 'medial', 'superior', 'inferior', 'neurotransmitters', 'neuron', 'sleepStages', 'eegWaves', 'crossLateral'];

function digest(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    lengthBucket: Math.round(html.length / 200),
    buttons: count(/role="button"|<button/g),
    svgs: count(/<svg/g),
    canvases: count(/<canvas/g),
    inputs: count(/<input/g),
    sha: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16),
  };
}
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });

describe('brainAtlas render goldens', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => resetStemLab());

  it('registers brainAtlas', () => {
    loadTool(FILE, 'brainAtlas');
    expect(window.StemLab._registry.brainAtlas).toBeTruthy();
  });

  VIEWS.forEach((v) => {
    it(`view: ${v} renders + pins a digest`, () => {
      loadTool(FILE, 'brainAtlas');
      const html = render({ view: v });
      expect(html.length).toBeGreaterThan(0);
      expect(digest(html)).toMatchSnapshot();
    });
  });

  it('detail panel: cerebellum (pins the accuracy-critical fn string)', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'lateral', selectedRegion: 'cerebellum' });
    // the cerebellum fn is rendered verbatim in the detail panel
    expect(html).toMatch(/Motor coordination/);
    expect(digest(html)).toMatchSnapshot();
  });

  it('detail panel: dopamine (pins a localizationism-hedge target)', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'neurotransmitters', selectedRegion: 'dopamine' });
    expect(html).toMatch(/Dopamine|dopamine/);
    expect(digest(html)).toMatchSnapshot();
  });

  it('quiz mode renders a question + options', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ quizMode: true, quizIdx: 0 });
    expect(digest(html)).toMatchSnapshot();
  });

  it('INTEGRITY: the felt-state disclaimer survives (the exemplar the review flagged)', () => {
    // The neurotransmitter view's always-visible disclaimer is the scientific-
    // integrity exemplar. Guard its load-bearing phrases against silent removal.
    // (The Moncrieff 2022 citation lives in the "I'm stuck" open-questions block,
    // a toggle state, so it is not asserted here.)
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'neurotransmitters' });
    expect(html).toMatch(/teaching heuristic/i);
    expect(html).toMatch(/NOT a clinical model/i);
    expect(html).toMatch(/chemical imbalance/i);
    expect(html).toMatch(/contested/i);
  });
});
