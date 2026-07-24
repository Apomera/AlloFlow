import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_guided_mode_banner_source.jsx', 'utf8');

describe('Guided full-lesson dialog accessibility', () => {
  it('places named modal semantics on the focus-managed panel', () => {
    expect(source).toContain('<div role="presentation" onClick={() => setShowFullLesson(false)}');
    expect(source).toContain('ref={_modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="guided-full-lesson-title" aria-describedby="guided-full-lesson-description"');
    expect(source).toContain('id="guided-full-lesson-title"');
    expect(source).toContain('id="guided-full-lesson-description"');
    expect(source).not.toContain("outline: 'none'");
  });

  it('retains focus containment, Escape dismissal, and focus return', () => {
    expect(source).toContain("if (e.key === 'Escape')");
    expect(source).toContain("if (e.key === 'Tab' && root)");
    expect(source).toContain('if (r && r.focus && document.contains(r)) r.focus()');
  });

  it('identifies the keyboard-scrollable lesson content as a region', () => {
    expect(source).toContain('tabIndex={0} role="region" aria-label={t(');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_guided_mode_banner_module.js', 'utf8')).toBe(fs.readFileSync('view_guided_mode_banner_module.js', 'utf8'));
  });
});
