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
const VIEWS = ['lateral', 'medial', 'superior', 'inferior', 'cranialNervesWillis', 'homunculus', 'visualPathway', 'languageNetwork', 'strokeTerritories', 'cerebellumClinic', 'brainstemCrossSection', 'csfHydrocephalus', 'neurotransmitters', 'neuron', 'prenatalDevelopment', 'synapses', 'basalGangliaLoop', 'limbicPapezLoop', 'stimulate', 'sleepStages', 'eegWaves', 'crossLateral'];

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

  it('detail panel: cerebellum (ACCURACY LOCK — ~80%, not 50%)', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'lateral', selectedRegion: 'cerebellum' });
    expect(html).toMatch(/Motor coordination/);
    expect(html).toMatch(/Student takeaway/);
    expect(html).toMatch(/Plain view/);
    expect(html).toMatch(/Advanced/);
    // the 2026-06-15 accuracy fix: cerebellum holds ~80% (four-fifths) of neurons
    expect(html).toMatch(/~?80%|four-fifths/);
    expect(html).not.toMatch(/50% of brain/);
    expect(digest(html)).toMatchSnapshot();
  });

  it('detail panel: dopamine (ACCURACY LOCK — no "pleasure chemical" overclaim)', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'neurotransmitters', selectedRegion: 'dopamine' });
    expect(html).toMatch(/Dopamine|dopamine/);
    // the hedge: reward-prediction framing, "pleasure chemical" flagged as oversimplified
    expect(html).toMatch(/Reward-prediction/);
    expect(html).not.toMatch(/Reward and pleasure signaling/);
    expect(digest(html)).toMatchSnapshot();
  });

  it('quiz mode renders a question + options', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ quizMode: true, quizIdx: 0 });
    expect(digest(html)).toMatchSnapshot();
  });

  it('Patient Simulator is AI-gated: absent by default, present when AI is on', () => {
    loadTool(FILE, 'brainAtlas');
    const off = renderTool('brainAtlas', { brainAtlas: { view: 'stimulate' } });
    expect(off).not.toMatch(/Patient Simulator/);
    const on = renderTool('brainAtlas', { brainAtlas: { view: 'stimulate' } }, { aiHintsEnabled: true });
    expect(on).toMatch(/Patient Simulator/);
    expect(on).toMatch(/Stimulate the patient/);
  });

  it('stimulate view: the predict panel renders the first Penfield scenario', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'stimulate', stimIdx: 0 });
    expect(html).toMatch(/Stimulation Lab/);
    expect(html).toMatch(/Electrode on:/);
    expect(html).toMatch(/primary motor cortex/);
    expect(html).toMatch(/Penfield/);
    // the 4 predict options as a radiogroup
    expect(html).toMatch(/role="radiogroup"/);
    expect(html).toMatch(/opposite hand/);
  });

  it('synapses view: pruning + integrity-hedged neurodiversity content present', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'synapses', selectedRegion: 'pruning' });
    expect(html).toMatch(/use it or lose it/i);
    expect(html).toMatch(/autism/i);
    expect(html).toMatch(/Tang/);            // the cited evidence
    expect(html).toMatch(/NOT diagnostic/i); // the integrity hedge
  });

  it('AI GATE: the tutor panel is hidden by default (aiHintsEnabled off) and shown when on', () => {
    loadTool(FILE, 'brainAtlas');
    const off = renderTool('brainAtlas', { brainAtlas: { view: 'lateral', selectedRegion: 'cerebellum' } });
    expect(off).not.toMatch(/Explain at my level/);
    const on = renderTool('brainAtlas', { brainAtlas: { view: 'lateral', selectedRegion: 'cerebellum' } }, { aiHintsEnabled: true });
    expect(on).toMatch(/Explain at my level/);
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

  it('refinement UI: groups the view rail and gives the canvas a text equivalent', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'lateral' });
    expect(html).toMatch(/data-brainatlas-mode-groups/);
    expect(html).toMatch(/data-brainatlas-visible-group="atlas"/);
    expect(html).toMatch(/data-brainatlas-canvas-summary/);
    expect(html).toMatch(/Canvas summary/);
    expect(html).toMatch(/Teacher move/);
  });

  it('refinement UI: systems group narrows the view rail without removing catalog shortcuts', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'neuron', viewGroup: 'systems' });
    expect(html).toMatch(/data-brainatlas-active-group="systems"/);
    expect(html).toMatch(/data-brainatlas-visible-group="systems"/);
    expect(html).toMatch(/Neurotransmitters/);
    expect(html).toMatch(/Neuron/);
    expect(html).toMatch(/Synapse/);
    expect(html).toMatch(/1 through 22 switch views/);
  });

  it('refinement UI: plain detail hides advanced anatomy until requested', () => {
    loadTool(FILE, 'brainAtlas');
    const plain = render({ view: 'lateral', selectedRegion: 'cerebellum' });
    expect(plain).toMatch(/data-brainatlas-detail-mode="plain"/);
    expect(plain).toMatch(/Student takeaway/);
    expect(plain).not.toMatch(/Brodmann Areas/);
    expect(plain).not.toMatch(/Blood Supply/);

    const advanced = render({ view: 'lateral', selectedRegion: 'cerebellum', detailMode: 'advanced' });
    expect(advanced).toMatch(/data-brainatlas-detail-mode="advanced"/);
    expect(advanced).toMatch(/Brodmann Areas/);
    expect(advanced).toMatch(/Blood Supply/);
  });
});
