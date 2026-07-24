import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('misc_handlers_source.jsx', 'utf8');
const built = readFileSync('misc_handlers_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/misc_handlers_module.js', 'utf8');

describe('project-load error announcement accessibility', () => {
  it('contains no blocking native alerts', () => {
    expect(source).not.toMatch(/\b(?:window\.)?alert\s*\(/);
    expect(built).not.toMatch(/\b(?:window\.)?alert\s*\(/);
  });

  it('announces invalid and unreadable projects once through the accessible toast path', () => {
    expect(source).toContain("addToast(t('errors.project_file_invalid') || t('toasts.invalid_project_file') || 'This project file is not valid.', 'error')");
    expect(source).toContain("addToast(t('errors.project_file_load_failed') || t('toasts.project_load_failed') || 'The project file could not be loaded.', 'error')");
    expect(source.match(/errors\.project_file_invalid/g)).toHaveLength(1);
    expect(source.match(/errors\.project_file_load_failed/g)).toHaveLength(1);
  });

  it('keeps both generated modules byte-identical', () => {
    expect(deployed).toBe(built);
  });
});
