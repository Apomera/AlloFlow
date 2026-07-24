import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('ui_modals_source.jsx', 'utf8');
const moduleText = fs.readFileSync('ui_modals_module.js', 'utf8');

describe('Shared UI modal accessibility', () => {
  it('exposes Teacher Gate as a named and described Escape-dismissible dialog', () => {
    expect(source).toContain('useFocusTrap(gateRef, isOpen, onClose)');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="teacher-gate-title" aria-describedby="teacher-gate-helper"');
    expect(source).toContain('aria-invalid={error}');
    expect(source).toContain("aria-describedby={error ? 'teacher-gate-error' : undefined}");
  });

  it('renders the password error only when present and announces it', () => {
    expect(source).toContain('{error && (');
    expect(source).not.toContain('{String(error) && (');
    expect(source).toContain('id="teacher-gate-error" role="alert"');
  });

  it('uses visible role and microphone names and announces microphone state', () => {
    expect(source).not.toContain("aria-label={t('common.like')}");
    expect(source).not.toContain("aria-label={t('common.confirm')}");
    expect(source).toContain('<span role="status" aria-live="polite" aria-atomic="true">');
  });

  it('names Student Entry and Welcome and connects Escape to their focus traps', () => {
    expect(source).toContain('useFocusTrap(entryRef, isOpen, onClose)');
    expect(source).toContain('aria-labelledby="student-entry-title"');
    expect(source).toContain('aria-describedby="student-entry-description"');
    expect(source).toContain('useFocusTrap(welcomeRef, isOpen, onClose)');
    expect(source).toContain('aria-labelledby="student-welcome-title"');
    expect(source).toContain('aria-describedby="student-welcome-description"');
  });

  it('announces codename changes and preserves visible button names', () => {
    expect(source).toContain('tracking-tight truncate mr-2" role="status" aria-live="polite"');
    expect(source).not.toContain("aria-label={t('common.generate')}");
    expect(source).not.toContain("aria-label={t('common.upload')}");
    expect(source).toContain('mt-4 min-h-6 inline-flex items-center');
  });

  it('preserves all five runtime exports and deploy parity', () => {
    for (const name of ['StudentQuizOverlay', 'TeacherGate', 'RoleSelectionModal', 'StudentEntryModal', 'StudentWelcomeModal']) {
      expect(moduleText).toContain(`window.AlloModules.${name} = ${name}`);
    }
    expect(fs.readFileSync('desktop/web-app/public/ui_modals_module.js', 'utf8')).toBe(moduleText);
  });
});
