import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('brand_profile_editor_source.jsx', 'utf8');

describe('Brand Profile Editor state and modal semantics', () => {
  it('retains a visible focus indicator on the programmatically focusable dialog', () => {
    const dialogLine = source.split('\n').find((line) => line.includes('aria-labelledby="brand-settings-title"'));
    expect(dialogLine).toBeTruthy();
    expect(dialogLine).not.toContain('focus:outline-none');
  });

  it('makes the underlying editor inert while the sibling delete dialog is active', () => {
    expect(source).toContain("aria-hidden={deleteRequest ? 'true' : undefined} inert={deleteRequest ? '' : undefined}");
    expect(source).toContain(')}\n      </div>\n        {deleteRequest && (');
    expect(source).toContain('role="presentation" onClick={function (event) { event.stopPropagation(); }}');
  });

  it('exposes the profile being edited without relying on border color', () => {
    expect(source).toContain('editProfile(p); }} aria-pressed={isEditing}');
  });

  it('connects invalid color fields to the live validation feedback', () => {
    expect(source).toContain('aria-describedby={!valid ? \'brand-validation-status\' : undefined}');
    expect(source).toContain('id="brand-validation-status"');
  });

  it('names every file, profile, and font input explicitly', () => {
    expect(source).toContain("aria-label={t('brand.import_file', 'Import brand profile JSON file')}");
    expect(source).toContain("aria-label={t('brand.name', 'Profile name')}");
    expect(source).toContain("aria-label={t('brand.font', 'Body font')}");
    expect(source).toContain("aria-label={t('brand.logo_file', 'Upload logo image file')}");
  });

  it('does not expose preview-only accent text as an unusable link', () => {
    expect(source).not.toContain('<a style={{ color: c.accent }}');
    expect(source).toContain("<span style={{ color: c.accent, textDecoration: 'underline' }}>");
  });

  it('uses non-submitting buttons throughout the editor', () => {
    expect(source.match(/<button\b/g)?.length).toBeGreaterThan(10);
    expect(source).not.toMatch(/<button(?![^>]*\btype=)/);
  });
});
