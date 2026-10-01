// The side view is the first diagram a learner meets, and Plain is the default
// reading mode. Eight of its thirteen regions had an authored plain card; the
// other five fell back to a trimmed slice of clinical prose, which is
// shorter but not plainer. This pins that every region on that view now has an
// authored card, that the card carries all three takeaway fields plus a check,
// and that the "explore related region" chain stays inside the same view so the
// button never renders a nameless target.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: Object.assign({ view: 'lateral' }, state || {}) });

const LATERAL = [
  'frontal', 'prefrontal', 'motor_cortex', 'parietal', 'temporal', 'occipital',
  'cerebellum', 'brainstem', 'brocas', 'wernickes', 'insular', 'angular_gyrus',
  'supramarginal',
];
const LATERAL_AUTHORED = LATERAL;
const NEWLY_AUTHORED = ['brocas', 'wernickes', 'insular', 'angular_gyrus', 'supramarginal'];

describe('brainAtlas side view has an authored plain card for every region', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  LATERAL_AUTHORED.forEach((id) => {
    it(`${id} renders an authored plain card`, () => {
      const html = render({ selectedRegion: id });
      expect(html).toMatch(new RegExp('data-brainatlas-plain-lesson="' + id + '"'));
      expect(html).toMatch(new RegExp('data-brainatlas-authored-plain="' + id + '"'));
      // all three takeaway labels, so no card ships with a hole in it
      expect(html).toMatch(/Big idea/);
      expect(html).toMatch(/Everyday example/);
      expect(html).toMatch(/Connected idea/);
    });
  });

  NEWLY_AUTHORED.forEach((id) => {
    it(`${id} offers an understanding check`, () => {
      const html = render({ selectedRegion: id, plainCheckRegion: id });
      expect(html).toMatch(/data-brainatlas-check-choice="0"/);
      expect(html).toMatch(/data-brainatlas-check-choice="1"/);
      expect(html).toMatch(/data-brainatlas-check-choice="2"/);
    });

    it(`${id} keeps its check buttons focusable after an answer`, () => {
      const html = render({ selectedRegion: id, plainCheckRegion: id, plainCheckAnswers: { [id]: 1 } });
      expect(html).toMatch(/aria-disabled="true"/);
      // aria-disabled, not disabled: answering must not drop keyboard focus
      const choices = html.match(/<button[^>]*data-brainatlas-check-choice[^>]*>/g) || [];
      expect(choices.length).toBe(3);
      choices.forEach((btn) => expect(btn).not.toMatch(/\sdisabled(=|\s|>)/));
    });
  });

  it('leaves no region on the side view without an authored card', () => {
    const html = render({});
    // one preview per region, and every one of them the authored idea
    const previews = html.match(/data-brainatlas-region-preview="([a-z]+)"/g) || [];
    expect(previews.length).toBe(LATERAL.length);
    previews.forEach((p) => expect(p).toMatch(/="idea"/));
  });

  it('the plain cards drop the clinical damage and conditions blocks', () => {
    const html = render({ selectedRegion: 'brocas' });
    // the advanced text names the aphasia; the plain card must not
    expect(html).not.toMatch(/telegraphic/);
    expect(html).toMatch(/data-brainatlas-plain-lesson="brocas"/);
  });

  it('advanced mode still shows the clinical text for a newly authored region', () => {
    const html = render({ selectedRegion: 'brocas', detailMode: 'advanced' });
    expect(html).not.toMatch(/data-brainatlas-plain-lesson=/);
    expect(html).toMatch(/aphasia/i);
  });

  it('every "explore related region" target is a region on the same view', () => {
    NEWLY_AUTHORED.concat(['frontal', 'prefrontal']).forEach((id) => {
      const html = render({ selectedRegion: id });
      const next = /data-brainatlas-plain-next="([a-z_0-9]+)"/.exec(html);
      expect(next, `no next target for ${id}`).toBeTruthy();
      expect(LATERAL).toContain(next[1]);
      expect(next[1]).not.toBe(id);
    });
  });

  it('the new cards avoid single-region ownership language', () => {
    NEWLY_AUTHORED.forEach((id) => {
      const html = render({ selectedRegion: id });
      const card = /<section class="brainatlas-plain-lesson"[\s\S]*?<\/section>/.exec(html);
      expect(card, `no card markup for ${id}`).toBeTruthy();
      expect(card[0]).not.toMatch(/the seat of|is responsible for|controls language|the language center/i);
    });
  });
});
