import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_pdf_audit_source.jsx', 'utf8');

describe('PDF Audit confirmation accessibility', () => {
  it('replaces every in-app browser confirmation with one awaited decision surface', () => {
    expect(source.match(/window\.confirm\s*\(/g) || []).toHaveLength(0);
    expect(source.match(/await askPdfConfirmation\s*\(/g)).toHaveLength(6);
    expect(source).toContain("title: t('pdf_audit.mo.confirm_title') || 'Build read-along ebook?'");
    expect(source).toContain("title: 'Start batch remediation?'");
    expect(source).toContain("title: 'Download an unverified tagged PDF?'");
    expect(source).toContain("title: 'Clear saved PDF progress?'");
    expect(source).toContain("title: t('pdf_audit.start_new_title_short') || 'Start a new audit?'");
    expect(source).toContain("title: t('pdf_audit.rescan_title') || 'Replace results with a new OCR scan?'");
    // The separate document-builder iframe runtime now uses its own accessible alert dialog too.
    expect(source.match(/\bwin\.confirm\s*\(/g) || []).toHaveLength(0);
  });

  it('uses a named safe-default alert dialog with focus lifecycle and 44px actions', () => {
    const start = source.indexOf('{/* Shared safe-default confirmation');
    const end = source.indexOf('PDF Preview & Edit Modal', start);
    const dialog = source.slice(start, end);
    expect(dialog).toContain('role="presentation"');
    expect(dialog).toContain('role="alertdialog"');
    expect(dialog).toContain('aria-modal="true"');
    expect(dialog).toContain('aria-labelledby="pdf-action-confirm-title"');
    expect(dialog).toContain('aria-describedby="pdf-action-confirm-description"');
    expect(dialog).toContain("if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); settlePdfConfirmation(false);");
    expect(dialog.match(/min-h-11/g)).toHaveLength(3);
    expect(dialog.match(/type="button"/g)).toHaveLength(3);
    expect(dialog.indexOf('{pdfConfirmRequest.cancelLabel}')).toBeLessThan(dialog.indexOf('{pdfConfirmRequest.alternativeLabel}'));
    expect(dialog.indexOf('{pdfConfirmRequest.alternativeLabel}')).toBeLessThan(dialog.indexOf('{pdfConfirmRequest.confirmLabel}'));
    expect(source).toContain('_alloUseFocusTrap(pdfConfirmTrapRef, !!pdfConfirmRequest);');
    expect(source).toContain('ref={pdfConfirmCancelRef}');
    expect(source).toContain('if (pdfConfirmCancelRef.current) pdfConfirmCancelRef.current.focus()');
  });

  it('makes OCR cancellation distinct from both save-and-scan choices', () => {
    expect(source).toContain("alternativeLabel: t('pdf_audit.rescan_without_save') || 'Re-scan without saving'");
    expect(source).toContain('if (!_rescanDecision) return;');
    expect(source).toContain("onClick={() => settlePdfConfirmation('alternative')}");
    expect(source).toContain("if (_rescanDecision === true && typeof saveProjectToFile === 'function')");
  });

  it('keeps the deploy module synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_pdf_audit_module.js', 'utf8'))
      .toBe(readFileSync('view_pdf_audit_module.js', 'utf8'));
  });
});
