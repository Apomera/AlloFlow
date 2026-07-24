import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_study_timer_modal_source.jsx', 'utf8');

describe('Study Timer modal accessibility', () => {
  it('uses one named modal dialog with a presentation-only backdrop', () => {
    expect(source).toContain('role="presentation"');
    expect(source.match(/role="dialog"/g)).toHaveLength(1);
    expect(source).toContain('aria-labelledby="study-timer-title"');
    expect(source).toContain('id="study-timer-title"');
  });

  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('ref={dialogRef}');
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('exposes remaining time and completion progress programmatically', () => {
    expect(source).toContain('role="timer"');
    expect(source).toContain('aria-live="off"');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow={completionPercent}');
    expect(source).toContain('aria-valuetext={`${completionPercent}% complete`}');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('{timerStatus}');
  });

  it('associates the task label and exposes control state accurately', () => {
    expect(source).toContain('htmlFor="study-timer-task"');
    expect(source).toContain('id="study-timer-task"');
    expect(source).toContain('aria-pressed={studyDuration === min * 60 && !customTimerMinutes}');
    expect(source).toContain("aria-label={isStudyTimerRunning ? t('timer.pause') : t('timer.start')}");
    expect(source).not.toContain("aria-label={t('common.pause')}");
  });

  it('respects reduced-motion preferences', () => {
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain('motion-reduce:transform-none');
    expect(source).toContain('motion-reduce:hidden');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_study_timer_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_study_timer_modal_module.js', 'utf8'));
  });
});
