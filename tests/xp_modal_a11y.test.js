import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_xp_modal_source.jsx', 'utf8');

describe('XP modal accessibility', () => {
  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('exposes the visual XP meter as a named progressbar', () => {
    expect(source).toContain('role="progressbar"');
    expect(source).toContain("aria-label={t('common.progress')}");
    expect(source).toContain('aria-valuemin={0} aria-valuemax={100}');
    expect(source).toContain('aria-valuenow={Math.round(globalProgress)}');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/view_xp_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_xp_modal_module.js', 'utf8'));
  });
});
