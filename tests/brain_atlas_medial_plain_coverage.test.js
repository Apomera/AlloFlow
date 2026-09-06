// The midline view is the second one in the rail and holds the memory and
// limbic structures the quiz and the case decoders lean on. Six of its twelve
// regions had an authored plain card; the other six fell back to a trimmed
// slice of clinical prose. Three of those six are not processing areas at all
// (a fiber bundle, a membrane, a gland), which is exactly the distinction a
// learner needs and cannot get from truncated anatomy. This pins the completed
// coverage, and that the walk-on chain now runs through the new cards instead
// of closing on itself after six.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: Object.assign({ view: 'medial' }, state || {}) });

const MEDIAL = [
  'corpus_callosum', 'thalamus', 'hypothalamus', 'cingulate', 'hippocampus',
  'amygdala', 'basal_ganglia', 'ventricles', 'pineal_brain', 'fornix',
  'mammillary', 'septum_pell',
];
const NEWLY_AUTHORED = ['cingulate', 'basal_ganglia', 'fornix', 'mammillary', 'septum_pell', 'pineal_brain'];

describe('brainAtlas midline view has an authored plain card for every region', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  MEDIAL.forEach((id) => {
    it(`${id} renders an authored plain card`, () => {
      const html = render({ selectedRegion: id });
      expect(html).toMatch(new RegExp('data-brainatlas-plain-lesson="' + id + '"'));
      expect(html).toMatch(new RegExp('data-brainatlas-authored-plain="' + id + '"'));
      expect(html).toMatch(/Big idea/);
      expect(html).toMatch(/Everyday example/);
      expect(html).toMatch(/Connected idea/);
    });
  });

  it('leaves no region on the midline view without an authored card', () => {
    const html = render({});
    const previews = html.match(/data-brainatlas-region-preview="([a-z]+)"/g) || [];
    expect(previews.length).toBe(MEDIAL.length);
    previews.forEach((p) => expect(p).toMatch(/="idea"/));
  });

  NEWLY_AUTHORED.forEach((id) => {
    it(`${id} offers an understanding check whose choices stay focusable`, () => {
      const answered = render({ selectedRegion: id, plainCheckRegion: id, plainCheckAnswers: { [id]: 2 } });
      const choices = answered.match(/<button[^>]*data-brainatlas-check-choice[^>]*>/g) || [];
      expect(choices.length).toBe(3);
      expect(answered).toMatch(/aria-disabled="true"/);
      choices.forEach((btn) => expect(btn).not.toMatch(/\sdisabled(=|\s|>)/));
    });
  });

  it('the walk-on chain reaches every new card from the six that already existed', () => {
    const nextOf = (id) => {
      const html = render({ selectedRegion: id });
      const m = /data-brainatlas-plain-next="([a-z_0-9]+)"/.exec(html);
      expect(m, `no next target for ${id}`).toBeTruthy();
      expect(MEDIAL).toContain(m[1]);
      return m[1];
    };
    // ventricles used to close the loop back to the start; it now leads on
    const seen = new Set();
    let at = 'ventricles';
    for (let step = 0; step < MEDIAL.length + 2 && !seen.has(at); step += 1) {
      seen.add(at);
      at = nextOf(at);
    }
    NEWLY_AUTHORED.forEach((id) => expect(seen.has(id), `chain never reaches ${id}`).toBe(true));
  });

  it('the three non-processing structures say what kind of thing they are', () => {
    expect(render({ selectedRegion: 'fornix' })).toMatch(/bundle of nerve fibers/);
    expect(render({ selectedRegion: 'septum_pell' })).toMatch(/thin membrane/);
    expect(render({ selectedRegion: 'pineal_brain' })).toMatch(/small gland/);
  });

  it('the melatonin card frames it as a timing signal, not a sleep switch', () => {
    const html = render({ selectedRegion: 'pineal_brain' });
    expect(html).toMatch(/timing signal/);
    expect(html).not.toMatch(/sleep hormone|makes you fall asleep/i);
  });

  it('advanced mode still shows the clinical text for a newly authored region', () => {
    const html = render({ selectedRegion: 'basal_ganglia', detailMode: 'advanced' });
    expect(html).not.toMatch(/data-brainatlas-plain-lesson=/);
    expect(html).toMatch(/globus pallidus/i);
  });

  it('the new cards avoid single-region ownership language', () => {
    NEWLY_AUTHORED.forEach((id) => {
      const html = render({ selectedRegion: id });
      const card = /<section class="brainatlas-plain-lesson"[\s\S]*?<\/section>/.exec(html);
      expect(card, `no card markup for ${id}`).toBeTruthy();
      expect(card[0]).not.toMatch(/the seat of|is responsible for|the reward center|the pleasure center/i);
    });
  });
});
