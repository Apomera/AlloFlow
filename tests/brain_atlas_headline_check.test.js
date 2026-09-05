// Headline check (2026-09-05): ungraded practice in the Neuromyths view where a
// paraphrased, fictional headline is sorted into one of the four evidence verdicts.
// Locks: every headline maps to an existing myth card and a real verdict key,
// feedback is choice-aware, and the activity never leaks into other views.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });
const VERDICTS = ['debunked', 'oversimplified', 'real_small', 'promising'];

describe('brainAtlas headline check', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  it('renders the first headline with four verdict choices and a position badge', () => {
    const html = render({ view: 'neuromyths' });
    expect(html).toMatch(/data-brainatlas-headline-check="hl_styles"/);
    expect(html).toMatch(/data-brainatlas-headline-position="true">1 \/ 8</);
    VERDICTS.forEach((v) => expect(html).toMatch(new RegExp('data-brainatlas-headline-choice="' + v + '"')));
    expect(html).toMatch(/This is practice, not a grade/);
    expect(html).not.toMatch(/data-brainatlas-headline-feedback/);
  });

  it('does not appear outside the neuromyths view', () => {
    ['lateral', 'synapses', 'stimulate'].forEach((view) => {
      expect(render({ view }), view).not.toMatch(/data-brainatlas-headline-check/);
    });
  });

  it('gives choice-aware feedback and offers the linked card plus next', () => {
    const right = render({ view: 'neuromyths', mythHeadlineIdx: 0, mythHeadlineFeedback: { id: 'hl_styles', chosen: 'debunked', correct: true } });
    expect(right).toMatch(/data-brainatlas-headline-feedback="fits"/);
    expect(right).toMatch(/meshing hypothesis/);
    expect(right).toMatch(/data-brainatlas-headline-open-card="myth_learning_styles"/);
    expect(right).toMatch(/data-brainatlas-headline-next="true"/);

    const wrong = render({ view: 'neuromyths', mythHeadlineIdx: 0, mythHeadlineFeedback: { id: 'hl_styles', chosen: 'promising', correct: false } });
    expect(wrong).toMatch(/data-brainatlas-headline-feedback="different"/);
    expect(wrong).toMatch(/The evidence verdict is Debunked\./);
  });

  it('ignores stale feedback from a different headline', () => {
    const html = render({ view: 'neuromyths', mythHeadlineIdx: 1, mythHeadlineFeedback: { id: 'hl_styles', chosen: 'debunked', correct: true } });
    expect(html).toMatch(/data-brainatlas-headline-check="hl_sides"/);
    expect(html).not.toMatch(/data-brainatlas-headline-feedback/);
  });

  it('wraps the index and keeps every headline bound to a real card and verdict', () => {
    const src = readFileSync(FILE, 'utf8');
    const block = src.slice(src.indexOf('var MYTH_HEADLINES = ['), src.indexOf('var EEG_ACTIVITY_MODES = ['));
    const cards = [...block.matchAll(/card: '([a-z_]+)'/g)].map((m) => m[1]);
    const verdicts = [...block.matchAll(/verdict: '([a-z_]+)'/g)].map((m) => m[1]);
    expect(cards.length).toBe(8);
    cards.forEach((c) => expect(src, c).toContain("id: '" + c + "'"));
    verdicts.forEach((v) => expect(VERDICTS, v).toContain(v));
    // every verdict class is exercised at least once
    VERDICTS.forEach((v) => expect(verdicts, v).toContain(v));
    // index 8 wraps to the first headline
    expect(render({ view: 'neuromyths', mythHeadlineIdx: 8 })).toMatch(/data-brainatlas-headline-check="hl_styles"/);
  });
});
