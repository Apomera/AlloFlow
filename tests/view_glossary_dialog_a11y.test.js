import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_glossary_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'view_glossary_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_glossary_module.js'), 'utf8');

describe('Glossary layered dialog accessibility', () => {
  it('keeps the generated and deployed modules synchronized', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('flashcardDialogRef');
    expect(built).toContain('phonicsDialogRef');
  });

  it('focus-manages the full-screen flashcard dialog', () => {
    // f5b045fc9 (2026-09-20) added an inline style between the ref and the role.
    expect(/ref=\{flashcardDialogRef\} (?:style=\{\{[^}]*\}\} )?role="dialog" aria-modal="true"/.test(source), 'flashcard dialog role').toBe(true);
    expect(source).toContain('ref={flashcardCloseRef} type="button"');
    expect(source).toContain('containModalFocus(e, flashcardDialogRef.current, closeInteractiveFlashcards)');
    expect(source).toContain('flashcardCloseRef.current.focus()');
  });

  it('uses a focus-managed phonics dialog instead of a fake backdrop button', () => {
    expect(source).toContain('ref={phonicsDialogRef} role="dialog" aria-modal="true"');
    expect(source).toContain('ref={phonicsCloseRef} type="button"');
    expect(source).toContain('containModalFocus(e, phonicsDialogRef.current, closePhonics)');
    expect(source).toContain('<div aria-hidden="true" className="fixed inset-0 z-[90]"');
    expect(source).not.toContain('<div role="button" tabIndex={0} onKeyDown={function (e)');
  });

  it('keeps nested editor keyboard events inside the nested dialog', () => {
    expect(source).toContain("if (typeof e.stopPropagation === 'function') e.stopPropagation();");
    expect(source).toContain('motion-reduce:animate-none motion-reduce:transition-none');
  });

  it('no longer hosts the screening overlays it could not run', () => {
    // 2026-10-19: the host never passed classifyScreeningRisk / advanceRoster /
    // exportScreeningCSV here, so a finished battery crashed the next glossary
    // opened. The overlays moved to the Assessment Center panel, which owns
    // those helpers (tests/screening_overlays_assessment_center.test.js mounts
    // them; tests/glossary_batch1_fixes.test.js mounts this view with a
    // finished battery).
    for (const gone of ['classifyScreeningRisk', 'advanceRoster', 'exportScreeningCSV', 'screenerDialogRef', "screenerSession.status === 'complete'"]) {
      expect(source.includes(gone), gone).toBe(false);
    }
  });});