import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('note_taking_templates_source.jsx', 'utf8');

describe('Notebook and note insights dialog accessibility', () => {
  it('uses named and described focus-managed panels with presentation overlays', () => {
    expect(source.match(/role="presentation"/g).length).toBeGreaterThanOrEqual(2);
    expect(source).toContain('ref={notebookDialogRef} tabIndex={-1}');
    expect(source).toContain('aria-labelledby="notebook-dialog-title" aria-describedby="notebook-dialog-description"');
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('aria-labelledby="note-insights-modal-title" aria-describedby="note-insights-modal-subtitle"');
  });

  it('contains focus, dismisses only the active dialog with Escape, and returns focus', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
    expect(source).toContain('_useNoteDialogFocus(isOpen, notebookDialogRef, onClose)');
    expect(source).toContain('_useNoteDialogFocus(isOpen, dialogRef, onClose)');
    expect(source).not.toContain("window.addEventListener('keydown', handleKey)");
  });

  it('hides and inerts Notebook content while Insights is active', () => {
    expect(source).toContain("inert={insightsOpen ? true : undefined} aria-hidden={insightsOpen ? 'true' : undefined}");
  });

  it('announces insight loading and filtered result counts', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('{filtered.length} notebook entries shown.');
    expect(source).not.toContain('</p>`n');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/note_taking_templates_module.js', 'utf8')).toBe(fs.readFileSync('note_taking_templates_module.js', 'utf8'));
  });
});
