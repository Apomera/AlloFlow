// Neuromyths & Neurodiversity view (2026-09-04). Locks the scientific framing the
// view exists to teach: learning styles is presented as DEBUNKED, hemispheric
// "types" as oversimplified, ADHD/autism group differences as real but small and
// NOT diagnostic, and the retina-photo ADHD model as promising but unvalidated.
// A regression that softens any of these into a confident claim (or hardens a
// hedge into a denial) should fail here before it reaches a classroom.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });
const CARDS = ['myth_learning_styles', 'myth_left_right_brain', 'myth_ten_percent', 'myth_first_three_years', 'myth_brain_training', 'myth_adhd_brain', 'myth_autism_brain', 'myth_retina_screening'];

describe('brainAtlas neuromyths view', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  it('renders as its own Evidence group with the framing panel', () => {
    const html = render({ view: 'neuromyths' });
    expect(html).toMatch(/Neuromyths &amp; Neurodiversity|Neuromyths & Neurodiversity/);
    expect(html).toMatch(/data-brainatlas-neuromyths-panel="true"/);
    expect(html).toMatch(/The brain science, honestly/);
    expect(html).toMatch(/Nothing here is a diagnosis or a treatment claim/);
    expect(html).toMatch(/<canvas/);
  });

  it('lists all eight cards in the directory', () => {
    const html = render({ view: 'neuromyths' });
    CARDS.forEach((id) => expect(html).toMatch(new RegExp('brainatlas-region-neuromyths-' + id)));
  });

  it('learning styles: debunked, with the matching hedge and an alternative', () => {
    const html = render({ view: 'neuromyths', selectedRegion: 'myth_learning_styles', detailMode: 'advanced' });
    expect(html).toMatch(/data-brainatlas-myth-verdict="debunked"/);
    expect(html).toMatch(/Pashler/);
    expect(html).toMatch(/meshing hypothesis/);
    expect(html).toMatch(/retrieval practice/);
    expect(html).toMatch(/Instead, try/);
    // must never read as an endorsement
    expect(html).not.toMatch(/learns best when lessons are matched to that style\.?<\/p>\s*<\/div>\s*<div[^>]*>\s*<p[^>]*>What the evidence says<\/p>\s*<p[^>]*>Yes/);
  });

  it('left/right brain: oversimplified, keeps real lateralization', () => {
    const html = render({ view: 'neuromyths', selectedRegion: 'myth_left_right_brain', detailMode: 'advanced' });
    expect(html).toMatch(/data-brainatlas-myth-verdict="oversimplified"/);
    expect(html).toMatch(/Nielsen/);
    expect(html).toMatch(/language is usually left-dominant/);
  });

  it('ADHD: real but small, explicitly NOT diagnostic, theta/beta hedge retained', () => {
    const html = render({ view: 'neuromyths', selectedRegion: 'myth_adhd_brain', detailMode: 'advanced' });
    expect(html).toMatch(/data-brainatlas-myth-verdict="real_small"/);
    expect(html).toMatch(/not diagnostic/i);
    expect(html).toMatch(/ENIGMA/);
    expect(html).toMatch(/no scan can sort an individual/);
    expect(html).toMatch(/Arns et al\. 2013/);
    expect(html).toMatch(/Diagnosis stays clinical/);
    expect(html).toMatch(/Both extremes are wrong/);
  });

  it('autism: heterogeneity + neurodiversity framing, no single-brain claim', () => {
    const html = render({ view: 'neuromyths', selectedRegion: 'myth_autism_brain', detailMode: 'advanced' });
    expect(html).toMatch(/data-brainatlas-myth-verdict="real_small"/);
    expect(html).toMatch(/Heterogeneity is the main finding/);
    expect(html).toMatch(/neurodiversity/);
    expect(html).toMatch(/not a scan or a stereotype/);
  });

  it('retina screening: promising, NOT a diagnostic test, case-control caveat', () => {
    const html = render({ view: 'neuromyths', selectedRegion: 'myth_retina_screening', detailMode: 'advanced' });
    expect(html).toMatch(/data-brainatlas-myth-verdict="promising"/);
    expect(html).toMatch(/matched case-control/);
    expect(html).toMatch(/It is not a diagnostic test/);
    expect(html).toMatch(/npj Digital Medicine/);
  });

  it('every card carries a claim, evidence, alternative, and source link', () => {
    CARDS.forEach((id) => {
      const html = render({ view: 'neuromyths', selectedRegion: id, detailMode: 'advanced' });
      expect(html, id).toMatch(/The claim/);
      expect(html, id).toMatch(/What the evidence says/);
      expect(html, id).toMatch(/Instead, try/);
      expect(html, id).toMatch(/rel="noopener noreferrer"/);
      expect(html, id).toMatch(/Evidence verdict/);
    });
  });

  it('myth cards never enter the damage-localization quiz pool', () => {
    // quiz draws from regions with a `damage` field; myth cards have none
    for (let i = 0; i < 60; i++) {
      const html = render({ quizMode: true, quizIdx: i });
      expect(html).not.toMatch(/myth_/);
    }
  });
});
