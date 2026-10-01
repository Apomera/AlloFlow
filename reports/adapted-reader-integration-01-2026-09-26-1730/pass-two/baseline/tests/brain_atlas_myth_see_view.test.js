// Myth cards cross-reference other views in their evidence prose ("see the
// Cross-Lateral view"). Before this, that reference was a dead end: the reader
// was told where to look and given no way to get there. Each such card now
// carries a jump, and this pins the promise to the destination: if a card names
// a view in its text, the button must go to a view that actually exists, and to
// a region that actually lives in that view.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });
const detail = (id) => render({ view: 'neuromyths', selectedRegion: id, detailMode: 'advanced' });

// card -> the view its own text points at, and the region to land on
const EXPECTED = {
  myth_left_right_brain: { view: 'crossLateral', region: null },
  myth_ten_percent: { view: 'stimulate', region: null },
  myth_first_three_years: { view: 'synapses', region: 'critical_periods' },
  myth_brain_training: { view: 'synapses', region: 'neuroplasticity' },
  myth_adhd_brain: { view: 'eegWaves', region: 'theta_wave' },
  myth_autism_brain: { view: 'synapses', region: 'pruning' },
  myth_retina_screening: { view: 'visualPathway', region: null },
};

describe('brainAtlas myth cards link to the view they cite', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  Object.entries(EXPECTED).forEach(([card, want]) => {
    it(`${card} offers a jump to ${want.view}`, () => {
      const html = detail(card);
      expect(html).toMatch(new RegExp('data-brainatlas-myth-see-view="' + want.view + '"'));
      expect(html).toMatch(/See it in the atlas/);
      if (want.region) expect(html).toMatch(new RegExp('data-brainatlas-myth-see-region="' + want.region + '"'));
      else expect(html).not.toMatch(/data-brainatlas-myth-see-region=/);
    });
  });

  it('learning styles has no jump, because its text cites no view', () => {
    const html = detail('myth_learning_styles');
    expect(html).not.toMatch(/data-brainatlas-myth-see-view/);
    expect(html).not.toMatch(/See it in the atlas/);
  });

  it('every destination view exists and every named region lives in it', () => {
    const src = readFileSync(FILE, 'utf8');
    Object.values(EXPECTED).forEach(({ view, region }) => {
      // the view key is a real entry in VIEWS
      expect(src, view).toMatch(new RegExp('\\n\\s{12}' + view + ': \\{'));
      if (!region) return;
      // the region id belongs to that view's block, not merely to the file
      const start = src.search(new RegExp('\\n\\s{12}' + view + ': \\{'));
      const after = src.slice(start + 1);
      const end = after.search(/\n {12}[a-zA-Z0-9_]+: \{/);
      const block = end > 0 ? after.slice(0, end) : after;
      expect(block, region + ' in ' + view).toContain("id: '" + region + "'");
    });
  });

  it('the jump switches view, group and region together', () => {
    const src = readFileSync(FILE, 'utf8');
    const fn = src.slice(src.indexOf('function openBrainAtlasMythView'), src.indexOf('function openStimTreatmentAtlas'));
    expect(fn).toContain("upd('view', card.seeView)");
    expect(fn).toContain("upd('viewGroup', brainAtlasViewGroupFor(card.seeView))");
    expect(fn).toContain("upd('selectedRegion', card.seeRegion || null)");
    // leaving quiz mode and clearing a stale search matches the other jumps
    expect(fn).toContain("upd('quizMode', false)");
    expect(fn).toContain("upd('search', '')");
    expect(fn).toContain('announceToSR');
  });
});
