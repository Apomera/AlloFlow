// Same-view quiz distractors + spoken diagram selection (2026-09-05).
// The June review (docs/brain_atlas_review.md, BB-4/QW-4) found the damage
// quiz drew its three wrong answers from every view at once, so a frontal-lobe
// question could be "answered" by ruling out a sleep stage, and that clicking
// a region on the canvas said nothing to a screen reader.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });

function optionViews(html) {
  const out = [];
  const re = /data-brainatlas-quiz-option="([^"]+)" data-brainatlas-quiz-option-view="([^"]*)" data-brainatlas-quiz-answer-view="([^"]*)"/g;
  let m;
  while ((m = re.exec(html))) out.push({ id: m[1], view: m[2], answerView: m[3] });
  return out;
}

describe('brainAtlas quiz distractors and diagram announcement', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  it('renders four options, each tagged with its source view', () => {
    const opts = optionViews(render({ quizMode: true, quizIdx: 0 }));
    expect(opts.length).toBe(4);
    opts.forEach((o) => { expect(o.view).not.toBe(''); expect(o.answerView).not.toBe(''); });
  });

  it('keeps every distractor inside the answer\'s view for the first twenty questions', () => {
    // Views with damage-bearing regions all hold well over four of them, so the
    // same-view pool always fills all three slots here.
    for (let i = 0; i < 20; i++) {
      const opts = optionViews(render({ quizMode: true, quizIdx: i }));
      expect(opts.length, 'q' + i).toBe(4);
      const answerView = opts[0].answerView;
      opts.forEach((o) => expect(o.view, 'q' + i + ' ' + o.id).toBe(answerView));
    }
  });

  it('falls back to other views only when the same view runs short (source contract)', () => {
    const src = readFileSync(FILE, 'utf8');
    expect(src).toContain('var sameViewWrong = quizPool.filter');
    expect(src).toContain('.slice(0, 3 - sameViewWrong.length)');
    expect(src).toContain('var wrong = sameViewWrong.concat(otherViewWrong);');
  });

  it('announces a region picked on the diagram (label hit and marker hit)', () => {
    const src = readFileSync(FILE, 'utf8');
    expect(src).toContain('function brainAtlasRegionSelectedMessage(regionId)');
    expect(src).toMatch(/upd\('selectedRegion', label\.id\);\s*if \(typeof announceToSR === 'function'\) announceToSR\(brainAtlasRegionSelectedMessage\(label\.id\)\);/);
    expect(src).toMatch(/upd\('selectedRegion', closest\.id\);\s*if \(typeof announceToSR === 'function'\) announceToSR\(brainAtlasRegionSelectedMessage\(closest\.id\)\);/);
  });
});
