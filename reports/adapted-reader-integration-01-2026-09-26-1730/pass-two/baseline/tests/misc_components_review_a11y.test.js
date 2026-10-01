import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('misc_components_source.jsx', 'utf8');
const built = readFileSync('misc_components_module.js', 'utf8');
const deployed = readFileSync('desktop/web-app/public/misc_components_module.js', 'utf8');

describe('Word Sounds Review accessibility', () => {
  it('keeps generated and deployed artifacts synchronized', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('showProbeEndConfirm');
  });

  it('focus-manages the named review dialog', () => {
    expect(source).toContain('ref={reviewDialogRef} role="dialog" aria-modal="true"');
    expect(source).toContain('aria-labelledby="word-sounds-review-title" aria-describedby="word-sounds-review-description"');
    expect(source).toContain('reviewBackRef.current?.focus()');
    expect(source).toContain('trapReviewFocus(event, reviewDialogRef.current, requestBackToSetup)');
  });

  it('uses an accessible probe decision instead of browser confirm', () => {
    expect(source).not.toMatch(/\bwindow\.confirm\s*\(/);
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="probe-end-title" aria-describedby="probe-end-message"');
    expect(source).toContain('ref={probeCancelRef}');
    expect(source).toContain('probeCancelRef.current?.focus()');
  });

  it('uses cancellable scheduling only for audio readiness, not a user time limit', () => {
    expect(source).not.toContain('setInterval(');
    expect(source).toContain('pollTimer = setTimeout(pollAudioReadiness, 1000)');
    expect(source).toContain('if (pollTimer) clearTimeout(pollTimer)');
    expect(source).not.toContain('time limit');
  });
});