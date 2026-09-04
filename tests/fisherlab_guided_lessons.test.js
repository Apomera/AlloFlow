import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab classroom lesson plans', () => {
  it('provides bounded topic-specific plans with detached teaching notes', () => {
    const get = window.__FisherLabCore.getCoreGuidedLesson;
    for (const topic of ['navigation','sampling']) {
      const lesson = get(topic);
      expect(lesson.id).toBe(topic);
      expect(lesson.steps.map(s => s.label)).toEqual(['Predict','Compare','Inspect','Explain']);
      expect(lesson.checklist).toHaveLength(4);
      expect(lesson.supports).toHaveLength(3);
      lesson.steps[0].prompt = 'Changed';
      lesson.checklist.push('Changed');
      expect(get(topic).steps[0].prompt).not.toBe('Changed');
      expect(get(topic).checklist).toHaveLength(4);
    }
    expect(get('missing')).toBeNull();
    expect(get('__proto__')).toBeNull();
  });
  it('exports a blank worksheet with the correct investigation and evidence expectations', () => {
    const build = window.__FisherLabCore.buildCoreLessonSheetText;
    const navigation = build('navigation');
    expect(navigation).toContain('How long will the trip take?');
    expect(navigation).toContain('nautical miles, knots, and minutes');
    expect(navigation).toContain('1. PREDICT');
    expect(navigation).toContain('4. EXPLAIN');
    expect(navigation).toContain('My response / values and units:');
    expect(navigation).toContain('[ ] Two trials use the same distance');
    const sampling = build('sampling');
    expect(sampling).toContain('If empty, state that');
    expect(sampling).toContain('pooled counts when sizes differ');
    expect(sampling).toContain('not a voyage record or an automatic grade');
    expect(build('unknown')).toBe('');
  });
  it('does not include saved student writing or alter saved state in a blank sheet', () => {
    localStorage.setItem('fisherLab.learningNotes.v1', JSON.stringify({ navigation: { claim: 'Private learner response' } }));
    localStorage.setItem('fisherLab.state.v1', '{"trips":8}');
    const before = localStorage.getItem('fisherLab.learningNotes.v1');
    expect(window.__FisherLabCore.buildCoreLessonSheetText('navigation')).not.toContain('Private learner response');
    expect(localStorage.getItem('fisherLab.learningNotes.v1')).toBe(before);
    expect(localStorage.getItem('fisherLab.state.v1')).toBe('{"trips":8}');
  });
});
