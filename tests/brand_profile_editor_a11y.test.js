import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('brand_profile_editor_source.jsx', 'utf8');

describe('Brand Settings editor accessibility', () => {
  it('uses one named modal with contained and restored focus', () => {
    expect(source).toContain('role="presentation" onClick={onClose}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="brand-settings-title"');
    expect(source).toContain('(closeButtonRef.current || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('reflows the three editor regions into a narrow-width stack', () => {
    expect(source).toContain('flex flex-col lg:flex-row');
    expect(source).toContain('w-full lg:w-56');
    expect(source).toContain('w-full lg:w-72');
  });

  it('names editable fields and exposes validation state changes', () => {
    expect(source).toContain("aria-label={f.label + ' hex value'} aria-invalid={!valid}");
    expect(source).toContain("aria-label={t('brand.logo_alt', 'Logo alternative text')}");
    expect(source).toContain("aria-label={t('brand.header_text', 'Header text')}");
    expect(source).toContain("aria-label={t('brand.footer_text', 'Footer text')}");
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="false"');
  });

  it('provides 24 CSS pixel profile action targets', () => {
    expect(source.match(/inline-flex min-h-6 items-center/g)).toHaveLength(3);
    expect(source).toContain('truncate flex-1 min-h-6');
  });

  it('uses a safe-default accessible dialog for profile deletion', () => {
    expect(source).not.toContain('window.confirm');
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="brand-delete-dialog-title"');
    expect(source).toContain('aria-describedby="brand-delete-dialog-description"');
    expect(source).toContain('data-safe-default="true"');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
  });

  it('restores focus safely after cancellation or deletion', () => {
    expect(source).toContain('trigger.isConnected');
    expect(source).toContain('closeButtonRef.current.focus()');
    expect(source).toContain('requestRemove(event, p.id, p.name)');
    expect(source).toContain('min-h-11 rounded-lg');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/brand_profile_editor_module.js', 'utf8')).toBe(fs.readFileSync('brand_profile_editor_module.js', 'utf8'));
  });
});
