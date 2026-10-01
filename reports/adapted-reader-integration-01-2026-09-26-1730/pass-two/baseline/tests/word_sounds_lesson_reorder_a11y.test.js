import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');

describe('Word Sounds lesson-plan pointer-independent reordering', () => {
  it('exposes the activity order as a named semantic list', () => {
    expect(source).toContain('role="list" aria-label="Lesson plan activity order"');
    expect(source).toContain('role="listitem"');
    expect(source).toContain('Drag activities or use the Move up and Move down buttons to reorder.');
  });

  it('provides boundary-aware native move controls with large visible focus targets', () => {
    expect(source).toContain("moveLessonPlanActivity(activity.id, activity.label, 'up')");
    expect(source).toContain("moveLessonPlanActivity(activity.id, activity.label, 'down')");
    expect(source).toContain('disabled={activityIndex === 0}');
    expect(source).toContain('disabled={activityIndex === lessonPlanOrder.length - 1}');
    expect(source.match(/min-h-11 min-w-11/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-indigo-600');
  });

  it('announces the moved activity and its new position', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('moved to position ${toIndex + 1} of ${next.length}.');
  });

  it('keeps the root and deployed generated modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/word_sounds_setup_module.js', 'utf8'))
      .toBe(readFileSync('word_sounds_setup_module.js', 'utf8'));
  });
});
