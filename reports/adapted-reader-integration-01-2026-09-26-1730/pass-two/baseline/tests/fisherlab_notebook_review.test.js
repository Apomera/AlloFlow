import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab notebook review', () => {
  it('counts writing without grading it and identifies the first missing part', () => {
    const review = window.__FisherLabCore.getCoreLearningNoteReview;
    expect(review('navigation', {}, {})).toMatchObject({ filled: 0, dirty: false, started: false, nextField: 'claim', label: 'No note yet' });
    expect(review('navigation', { claim: 'A claim', evidence: '   ' }, {})).toMatchObject({ filled: 1, dirty: true, nextField: 'evidence', label: 'Unsaved changes' });
    const note = { claim: 'x', evidence: 'x', next: 'x' };
    const complete = review('sampling', note, note);
    expect(complete).toMatchObject({ filled: 3, dirty: false, label: 'Saved copy matches', missing: [] });
    expect(complete).not.toHaveProperty('score');
    expect(complete).not.toHaveProperty('mastery');
    expect(review('unknown', {}, {})).toBeNull();
  });
  it('recognizes exact reverts and unsaved deletion independently of the last action', () => {
    const review = window.__FisherLabCore.getCoreLearningNoteReview;
    const saved = { claim: 'Saved claim', evidence: 'Model result', next: 'Check current' };
    expect(review('navigation', { ...saved, claim: 'New claim' }, saved).dirty).toBe(true);
    expect(review('navigation', { ...saved }, saved).dirty).toBe(false);
    expect(review('navigation', {}, saved)).toMatchObject({ dirty: true, started: true, filled: 0, hasText: false, label: 'Unsaved changes' });
    const dirty = review('navigation', { claim: 'Draft' }, {});
    dirty.missing.length = 0;
    expect(review('navigation', { claim: 'Draft' }, {}).missing).toEqual(['evidence','next']);
  });
  it('exports current bounded writing in topic order without mutating data or including blank topics', () => {
    const build = window.__FisherLabCore.buildCoreLearningNotebookText;
    const notes = { sampling: { claim: 'Latest unsaved claim' }, navigation: { evidence: '<literal text>' }, measurement: { claim: '  ' }, extra: { claim: 'Ignore me' } };
    const before = JSON.stringify(notes), text = build(notes);
    expect(text).toContain('Current drafts');
    expect(text).toContain('Latest unsaved claim');
    expect(text).toContain('<literal text>');
    expect(text.indexOf('Navigation math')).toBeLessThan(text.indexOf('Evidence & sampling'));
    expect(text).not.toContain('Measurement & uncertainty');
    expect(text).not.toContain('Ignore me');
    expect(text).toContain('not a voyage or catch record');
    expect(JSON.stringify(notes)).toBe(before);
    expect(build(null)).toBe('');
    expect(build({ navigation: { claim: 'x'.repeat(900) } })).not.toContain('x'.repeat(601));
  });
});
