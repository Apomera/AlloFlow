import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_session_modal_source.jsx', 'utf8');

describe('Live session modal accessibility', () => {
  it('provides a named modal dialog and non-interactive backdrop', () => {
    expect(source).toContain('role="presentation" onClick={handleSetShowSessionModalToFalse}');
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="alloflow-session-modal-title"');
    expect(source).toContain('id="alloflow-session-modal-title"');
  });

  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('(first || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/view_session_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_session_modal_module.js', 'utf8'));
  });
});
