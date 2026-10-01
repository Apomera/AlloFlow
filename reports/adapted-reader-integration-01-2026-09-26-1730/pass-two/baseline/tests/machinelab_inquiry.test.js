import { beforeEach, describe, expect, it } from 'vitest';
import { findInquirySignal, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const state = (o = {}) => ({ machineLab: Object.assign({ view: 'compare' }, o) });

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

// Every other surface in this tool grades you against a number. Nothing invited
// a student to form a theory in their own words. This follows the house inquiry
// pattern (stem_tool_atctower.js and friends), which the shared smoke harness
// already knows how to recognise.
describe('Machine Lab: inquiry widget', () => {
  it('carries the signature the shared harness looks for', () => {
    const html = renderTool('machineLab', state());
    expect(findInquirySignal(html)).toBeTruthy();
    expect(html).toContain('no score, no reveal, no answer dump');
  });

  it('says plainly that nothing here is marked', () => {
    const html = renderTool('machineLab', state());
    expect(html).toContain('Nothing here is marked');
    expect(html).toContain('will not tell you the answer');
  });

  it('repeats that the numbers are a model, not a measurement', () => {
    const html = renderTool('machineLab', state());
    expect(html).toContain('not a measurement of any real machine');
  });

  it('asks for a hypothesis before anything else', () => {
    const html = renderTool('machineLab', state());
    expect(html).toContain('Your hypothesis');
    expect(html).toMatch(/aria-label="Your hypothesis about the three machines"/);
    expect(html).toContain('before you test it');
  });

  it('pitches the question at the reader’s level', () => {
    const k2 = renderTool('machineLab', state({ bandOverride: 'k2' }));
    const g912 = renderTool('machineLab', state({ bandOverride: 'g912' }));
    expect(k2).toContain('Which machine do you think throws best');
    expect(g912).toContain('m_p/(m_p + m_eff)');
    expect(k2).not.toContain('m_eff');
  });

  it('hides the open questions until the student opts in', () => {
    const closed = renderTool('machineLab', state());
    expect(closed).toContain('show open questions');
    expect(closed).not.toContain('Open questions (no answer key)');

    const open = renderTool('machineLab', state({ iqStuck: true }));
    expect(open).toContain('Open questions (no answer key)');
    expect(open).not.toContain('show open questions');
  });

  it('reveals questions, not answers', () => {
    const open = renderTool('machineLab', state({ iqStuck: true }));
    const idx = open.indexOf('Open questions (no answer key)');
    const section = open.slice(idx, idx + 1400);
    const items = section.match(/<li[^>]*>([^<]+)</g) || [];
    expect(items.length).toBeGreaterThanOrEqual(4);
    // Every revealed line must be a question, not a statement of the answer.
    for (const item of items) {
      expect(item, item).toContain('?');
    }
  });

  it('offers the explanation box only once the student claims they can explain', () => {
    const before = renderTool('machineLab', state());
    expect(before).toContain('I can explain, in my own words');
    expect(before).not.toMatch(/aria-label="Your explanation in your own words"/);

    const after = renderTool('machineLab', state({ iqUnderstood: true }));
    expect(after).toMatch(/aria-label="Your explanation in your own words"/);
  });

  it('keeps what the student wrote', () => {
    const html = renderTool('machineLab', state({
      iqHypothesis: 'The onager wins on light stones.',
      iqUnderstood: true,
      iqExplanation: 'Because it only moves one arm.'
    }));
    expect(html).toContain('The onager wins on light stones.');
    expect(html).toContain('Because it only moves one arm.');
  });

  it('logs comparisons into a captioned table', () => {
    const html = renderTool('machineLab', state({
      iqLog: [
        { projMass: 5, rows: [{ id: 'trebuchet', range: 210 }, { id: 'ballista', range: 90 }, { id: 'onager', range: 130 }] },
        { projMass: 200, rows: [{ id: 'trebuchet', range: 80 }, { id: 'ballista', range: 20 }, { id: 'onager', range: 35 }] }
      ]
    }));
    expect(html).toContain('Comparisons you have logged, by stone mass');
    expect(html).toContain('5 kg');
    expect(html).toContain('210 m');
    expect(html).toContain('200 kg');
    expect(html).toContain('scope="row"');
  });

  it('shows a dash for a machine that could not fire, not a blank or NaN', () => {
    const html = renderTool('machineLab', state({
      iqLog: [{ projMass: 5, rows: [{ id: 'trebuchet', range: 100 }, { id: 'ballista', range: null }, { id: 'onager', range: 40 }] }]
    }));
    expect(html).toContain('—');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('null');
  });

  it('appears on the Compare view and nowhere it would distract', () => {
    expect(renderTool('machineLab', state({ view: 'compare' }))).toContain('Build your own theory');
    expect(renderTool('machineLab', state({ view: 'machines' }))).not.toContain('Build your own theory');
    expect(renderTool('machineLab', state({ view: 'range' }))).not.toContain('Build your own theory');
  });
});
