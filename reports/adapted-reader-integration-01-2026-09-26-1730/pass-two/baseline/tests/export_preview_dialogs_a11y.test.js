import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_export_preview_source.jsx', 'utf8');

describe('Document Builder dialog accessibility', () => {
  it('places the main dialog role on its focus-managed panel', () => {
    expect(source).toContain('role="presentation"\n            onClick={(e) => { if (e.target === e.currentTarget) setShowExportPreview(false); }}');
    expect(source).toContain('ref={exportDialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="document-builder-title"');
    expect(source).not.toContain('el.__focusTrap');
  });

  it('uses one main focus trap that includes the editable iframe', () => {
    expect(source).toContain('textarea:not([disabled]), iframe, [tabindex]');
    expect(source).toContain("if (event.key === 'Escape') { event.preventDefault(); setShowExportPreview(false)");
    expect(source).toContain("if (event.key !== 'Tab') return");
  });

  it('uses an independent named and described image dialog', () => {
    expect(source).toContain('ref={imageDialogRef} tabIndex={-1}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="image-description-title" aria-describedby="image-description-help"');
    expect(source).toContain('id="image-description-help"');
    expect(source).toContain('event.stopPropagation(); closeImageDialog()');
  });

  it('hides and inerts the builder while image description is active', () => {
    expect(source).toContain('inert={pendingImageFile ? true : undefined} aria-hidden={pendingImageFile ? \'true\' : undefined}');
  });

  it('stacks settings and preview regions at narrow widths', () => {
    expect(source).toContain('flex flex-col lg:flex-row');
    expect(source).toContain('w-full lg:w-72');
    expect(source).toContain('min-h-[60vh] lg:min-h-0');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_export_preview_module.js', 'utf8')).toBe(fs.readFileSync('view_export_preview_module.js', 'utf8'));
  });
});
