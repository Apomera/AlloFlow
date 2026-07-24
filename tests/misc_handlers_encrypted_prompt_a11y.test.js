import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('misc_handlers_source.jsx', 'utf8');
const built = readFileSync('misc_handlers_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/misc_handlers_module.js', 'utf8');

describe('encrypted project password prompt accessibility', () => {
  it('never falls back to the native browser password prompt', () => {
    expect(source).not.toContain('window.prompt');
    expect(source).toContain("typeof window.AlloFlowUX.prompt === 'function'");
    expect(source).toContain('const _pw = await window.AlloFlowUX.prompt(');
  });

  it('fails clearly and safely while the shared dialog is unavailable', () => {
    expect(source).toContain("t('save.password_dialog_loading') || 'The password dialog is still loading. Please wait a moment and try again.'");
    expect(source).toMatch(/'error'\);\r?\n\s+return;/);
  });

  it('labels and bounds the masked password entry', () => {
    expect(source).toContain("inputType: 'password'");
    expect(source).toContain("title: t('save.encrypted_title') || 'Encrypted project'");
    expect(source).toContain("confirmText: t('save.open_project') || 'Open project'");
    expect(source).toContain("cancelText: t('common.cancel') || 'Cancel'");
    expect(source).toContain('maxLength: 1024');
  });

  it('keeps both generated modules byte-identical', () => {
    expect(deployed).toBe(built);
    expect(built).not.toContain('window.prompt');
    expect(built).toContain('AlloFlowUX.prompt(');
  });
});
