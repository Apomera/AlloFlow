import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_visual_supports_modal_source.jsx', 'utf8');

describe('visual supports modal accessibility', () => {
  it('provides a named modal dialog with contained focus and Escape close', () => {
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="visual-supports-title"');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('implements the keyboard-operable ARIA tabs pattern', () => {
    expect(source).toContain('role="tablist" aria-label="Visual support type"');
    expect(source.match(/role="tab" aria-selected=/g)?.length).toBe(2);
    expect(source).toContain("event.key === 'ArrowRight'");
    expect(source).toContain('role="tabpanel"');
  });

  it('uses a 24 pixel animation target and synchronized artifacts', () => {
    expect(source).toContain('width: 24, height: 24, padding: 0');
    expect(fs.readFileSync('desktop/web-app/src/view_visual_supports_modal_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('desktop/web-app/public/view_visual_supports_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_visual_supports_modal_module.js', 'utf8'));
  });
});
