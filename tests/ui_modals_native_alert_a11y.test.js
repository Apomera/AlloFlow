import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('ui_modals_source.jsx', 'utf8');
const built = readFileSync('ui_modals_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/ui_modals_module.js', 'utf8');

describe('Shared UI modal error announcements', () => {
  it('renders quiz submission failures persistently and clears stale failures on retry', () => {
    expect(source).toContain("const [submitError, setSubmitError] = useState('');");
    expect(source).toContain('id="quiz-submit-error" role="alert"');
    expect(source).toContain("setSubmitError(t('errors.quiz_submit_failed') || 'Your answer could not be submitted. Please try again.');");
    expect(source.match(/setSubmitError\(''\);/g) || []).toHaveLength(2);
    expect(source).not.toContain("else alert(t('errors.quiz_submit_failed'))");
  });

  it('announces unsupported speech recognition through the existing mic status', () => {
    expect(source).toContain("setMicStatus('unsupported');");
    expect(source).toContain("micStatus === 'unsupported' ? t('roles.voice_not_supported')");
    expect(source).toContain('<span role="status" aria-live="polite" aria-atomic="true">');
    expect(source).not.toContain("else alert(t('roles.voice_not_supported'))");
  });

  it('keeps generated and deployed modal bundles synchronized without native alerts', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('quiz-submit-error');
    expect(built).toContain('roles.voice_not_supported');
    expect(built).not.toMatch(/\balert\s*\(/);
  });
});
