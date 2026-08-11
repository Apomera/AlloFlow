// Live-generator WCAG invariants. This suite once asserted phoneme-reorder
// controls, image wrappers, and violet focus rings that existed ONLY in the
// fossil review panel deleted 2026-08-11 — a11y guarantees for UI no user
// could reach. Everything here now targets the WordSoundsGenerator the
// teacher actually uses; the live review panel is covered by
// word_sounds_review_actions_a11y against misc_components_source.jsx.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('word_sounds_setup_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('word_sounds_setup_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/word_sounds_setup_module.js', 'utf8');

describe('Word Sounds Setup WCAG interaction behavior', () => {
  it('documents a keyboard alternative beside the draggable lesson plan', () => {
    expect(source).toContain('data-keyboard-alternative="Use the Move up and Move down buttons"');
    expect(source).toContain("moveLessonPlanActivity(activity.id, activity.label, 'up')");
    expect(source).toContain("moveLessonPlanActivity(activity.id, activity.label, 'down')");
  });

  it('announces lesson-plan reordering and its resulting position', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true">{lessonPlanReorderStatus}');
    expect(source).toContain('moved to position ${toIndex + 1} of ${next.length}.');
  });

  it('retains visible focus rings without redundant outline suppression', () => {
    expect(source).not.toContain('focus-within:outline-none');
    expect(source).toContain('focus-within:ring-2');
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-indigo-600');
  });

  it('uses explicit non-submit types for all native buttons', () => {
    // Loop-only: every button tag is checked individually — the old equal-
    // count pins (73/73) churned on each compliant addition and could pass
    // with a typeless button offset by a stray type="button" elsewhere.
    const buttons = source.match(/<button\b[\s\S]*?>/g) || [];
    expect(buttons.length).toBeGreaterThan(40); // regex sanity
    for (const button of buttons) expect(button).toContain('type="button"');
  });
});

describe('Word Sounds Setup reduced motion and generated copies', () => {
  it('adds an operating-system fallback to every persistent and entrance animation', () => {
    for (const line of source.split(/\r?\n/)) {
      if (/animate-(?:pulse|spin|bounce)|animate-in/.test(line)) {
        expect(line).toContain('motion-reduce:animate-none');
      }
    }
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('lessonPlanReorderStatus');
    expect(moduleSource).toContain('data-keyboard-alternative');
    expect(publicModule).toBe(moduleSource);
  });
});
