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
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuenow={completionPercent}');
    expect(source).toContain('aria-valuetext={`${completionPercent}% complete`}');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/view_study_timer_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_study_timer_modal_module.js', 'utf8'));
  });
});
