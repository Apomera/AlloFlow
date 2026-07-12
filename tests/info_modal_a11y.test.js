import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_info_modal_source.jsx', 'utf8');

describe('Info modal accessibility', () => {
  it('uses a named modal dialog and non-interactive backdrop', () => {
    expect(source).toContain('<div role="presentation"');
    expect(source).not.toContain('<div role="button" tabIndex={0}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="info-modal-title"');
    expect(source).toContain('id="info-modal-title"');
  });

  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('implements the five-section selector as a keyboard-operable tablist', () => {
    expect(source).toContain('role="tablist"');
    expect(source.match(/id="info-tab-[^"]+" role="tab"/g)).toHaveLength(5);
    expect(source.match(/aria-selected=\{infoModalTab ===/g)).toHaveLength(5);
    expect(source.match(/aria-controls="info-modal-panel"/g)).toHaveLength(5);
    expect(source).toContain("['ArrowLeft', 'ArrowRight', 'Home', 'End']");
    expect(source).toContain('role="tabpanel"');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/view_info_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_info_modal_module.js', 'utf8'));
  });
});
