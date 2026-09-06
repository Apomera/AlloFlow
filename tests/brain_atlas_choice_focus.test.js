// Keyboard focus survives answering a choice.
//
// A `disabled` button leaves the tab order. For a keyboard or screen-reader
// user that means the element under focus vanishes at the moment they answer,
// focus falls to the document, and the feedback that just appeared below is
// only reachable by tabbing from the top of the tool again. The authored-card
// checks in this same file already use aria-disabled to avoid that; the
// headline check and the Stimulation Lab did not, and now do.
//
// These widgets are ungraded practice, so the guard also has to make a second
// click a no-op rather than letting a locked answer be overwritten.
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const render = (state) => renderTool('brainAtlas', { brainAtlas: state || {} });

const answeredHeadline = () => render({
  view: 'neuromyths',
  mythHeadlineIdx: 0,
  mythHeadlineFeedback: { id: 'hl_styles', chosen: 'promising', correct: false },
});

describe('brainAtlas choices keep keyboard focus after answering', () => {
  beforeAll(() => { resetStemLab(); vi.spyOn(Math, 'random').mockReturnValue(0.4242); });
  afterAll(() => vi.restoreAllMocks());
  beforeEach(() => { resetStemLab(); loadTool(FILE, 'brainAtlas'); });

  it('headline choices are aria-disabled, never removed from the tab order', () => {
    const html = answeredHeadline();
    // four choices, all still focusable
    const choices = html.match(/data-brainatlas-headline-choice="[a-z_]+"/g) || [];
    expect(choices.length).toBe(4);
    expect(html).toMatch(/aria-disabled="true"[^>]*data-brainatlas-headline-choice/);
    // the answered row must not carry the HTML disabled attribute
    const row = html.slice(html.indexOf('data-brainatlas-headline-choice'));
    const upToFeedback = row.slice(0, row.indexOf('data-brainatlas-headline-feedback'));
    expect(upToFeedback).not.toMatch(/\sdisabled(=|\s|>)/);
  });

  it('unanswered headline choices are not aria-disabled', () => {
    const html = render({ view: 'neuromyths' });
    expect(html).toMatch(/aria-disabled="false"[^>]*data-brainatlas-headline-choice/);
  });

  it('stimulation lab options are aria-disabled rather than disabled once answered', () => {
    const html = render({ view: 'stimulate', stimIdx: 0, stimFeedback: { chosen: 0, correct: false } });
    expect(html).toMatch(/role="radio"/);
    expect(html).toMatch(/aria-disabled="true"/);
    const panel = html.slice(html.indexOf('Predict the effect of stimulation'));
    expect(panel.slice(0, 2000)).not.toMatch(/\sdisabled(=|\s|>)/);
  });

  it('a second click cannot overwrite a locked answer', () => {
    const src = readFileSync(FILE, 'utf8');
    // headline: guard runs before the state write
    const headline = src.slice(src.indexOf('data-brainatlas-headline-choice'), src.indexOf('data-brainatlas-headline-feedback'));
    expect(headline).toMatch(/if \(hlShow\) return;[\s\S]{0,120}mythHeadlineFeedback/);
    // stimulation lab: same shape
    const stim = src.slice(src.indexOf("upd('stimFeedback'") - 200, src.indexOf("upd('stimFeedback'") + 80);
    expect(stim).toContain('if (show) return;');
  });
});
