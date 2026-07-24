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
    expect(source).toContain('ref={flashcardDialogRef} role="dialog" aria-modal="true"');
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

  it('announces interstitial progress and focus-manages completed screener results', () => {
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true" aria-label="Screening subtest progress"');
    expect(source).toContain('role="progressbar" aria-label="Completed screening subtests"');
    expect(source).toContain('ref={screenerDialogRef} role="dialog" aria-modal="true"');
    expect(source).toContain('aria-labelledby="glossary-screener-results-title"');
    expect(source).toContain('containModalFocus(e, screenerDialogRef.current, closeScreenerResults)');
    expect(source).toContain("querySelector('button:not([disabled])')");
  });});