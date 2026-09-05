// The return leg. Four atlas regions state a contested clinical association in
// their own text; those are the places a reader can over-read a finding, so each
// links back to the evidence card that gives the honest verdict. The pairing is
// derived from the myth cards' own seeView/seeRegion, so the two directions
// cannot drift apart: this pins that derivation, both that it fires where it
// should and that it stays silent everywhere else.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });

// region (in its view) -> the evidence card that should be offered
const PAIRS = [
  { view: 'eegWaves', region: 'theta_wave', card: 'myth_adhd_brain' },
  { view: 'synapses', region: 'pruning', card: 'myth_autism_brain' },
  { view: 'synapses', region: 'neuroplasticity', card: 'myth_brain_training' },
  { view: 'synapses', region: 'critical_periods', card: 'myth_first_three_years' },
];

describe('brainAtlas links a region back to its evidence card', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  PAIRS.forEach(({ view, region, card }) => {
    it(`${region} offers ${card}`, () => {
      const html = render({ view, selectedRegion: region, detailMode: 'advanced' });
      expect(html).toMatch(new RegExp('data-brainatlas-myth-backlink="' + card + '"'));
      expect(html).toMatch(new RegExp('data-brainatlas-open-myth-card="' + card + '"'));
      expect(html).toMatch(/The claim you may have heard/);
    });
  });

  it('the theta card, which carries the theta/beta caveat, reaches the ADHD evidence card', () => {
    const html = render({ view: 'eegWaves', selectedRegion: 'theta_wave', detailMode: 'advanced' });
    // the caveat and the way out of it appear together
    expect(html).toMatch(/Arns/);
    expect(html).toMatch(/NOT diagnostically reliable/);
    expect(html).toMatch(/data-brainatlas-open-myth-card="myth_adhd_brain"/);
  });

  it('stays silent on regions with no paired card, and inside the myths view itself', () => {
    ['frontal', 'cerebellum'].forEach((region) => {
      expect(render({ view: 'lateral', selectedRegion: region, detailMode: 'advanced' }), region)
        .not.toMatch(/data-brainatlas-myth-backlink/);
    });
    // a myth card must not link to itself
    expect(render({ view: 'neuromyths', selectedRegion: 'myth_adhd_brain', detailMode: 'advanced' }))
      .not.toMatch(/data-brainatlas-myth-backlink/);
    // a region in a linked view that is not the paired one stays clean
    expect(render({ view: 'synapses', selectedRegion: 'synaptogenesis', detailMode: 'advanced' }))
      .not.toMatch(/data-brainatlas-myth-backlink/);
  });

  it('is derived from the myth cards, not a second hand-kept list', () => {
    const src = readFileSync(FILE, 'utf8');
    const fn = src.slice(src.indexOf('function brainAtlasMythFor'), src.indexOf('function openBrainAtlasMythCard'));
    expect(fn).toContain('VIEWS.neuromyths');
    expect(fn).toContain('card.seeView === currentViewKey');
    expect(fn).toContain('card.seeRegion === regionId');
    // every pairing above must be expressible from the card data alone
    PAIRS.forEach(({ view, region, card }) => {
      const start = src.indexOf("{ id: '" + card + "'");
      expect(start, card).toBeGreaterThan(-1);
      const decl = src.slice(start, start + 400);
      expect(decl, card).toContain("seeView: '" + view + "'");
      expect(decl, card).toContain("seeRegion: '" + region + "'");
    });
  });

  it('opening the card switches into the myths view and selects it', () => {
    const src = readFileSync(FILE, 'utf8');
    const fn = src.slice(src.indexOf('function openBrainAtlasMythCard'), src.indexOf('function openBrainAtlasMythView'));
    expect(fn).toContain("upd('view', 'neuromyths')");
    expect(fn).toContain("upd('selectedRegion', card.id)");
    expect(fn).toContain("upd('quizMode', false)");
    expect(fn).toContain('announceToSR');
  });
});
