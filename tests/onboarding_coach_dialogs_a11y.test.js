import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('onboarding_coach_source.jsx', 'utf8');

describe('Onboarding coach dialog accessibility', () => {
  it('places named modal semantics on the coach panel, not its backdrop', () => {
    expect(source).toContain('role="presentation"\n          aria-hidden={showConsent');
    expect(source).toContain('ref={panelRef}\n            tabIndex={-1}\n            role="dialog"');
    expect(source).toContain('aria-labelledby="onboarding-panel-title"');
    expect(source).toContain('aria-describedby="onboarding-panel-description"');
  });

  it('contains focus, dismisses with Escape, and returns focus to the launcher', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('fallbackReturnRef && fallbackReturnRef.current');
    expect(source).toContain('ref={launcherRef}');
    expect(source).toContain('useCoachDialogFocus(isOpen, panelRef');
  });

  it('uses a Cancel-first named and described consent alert dialog', () => {
    expect(source).toContain('ref={consentRef}');
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="onboarding-consent-title"');
    expect(source).toContain('aria-describedby="onboarding-consent-description"');
    expect(source).toContain('ref={consentDeclineRef}');
    expect(source).toContain('useCoachDialogFocus(showConsent, consentRef, handleConsentDecline, consentDeclineRef');
  });

  it('removes the underlying coach from interaction while consent is active', () => {
    expect(source).toContain("aria-hidden={showConsent ? 'true' : undefined}");
    expect(source).toContain("inert={showConsent ? '' : undefined}");
  });

  it('provides a 24 CSS pixel Start over target and deploy parity', () => {
    expect(source).toContain("padding: '2px 0', minHeight: '24px'");
    expect(fs.readFileSync('desktop/web-app/public/onboarding_coach_module.js', 'utf8')).toBe(fs.readFileSync('onboarding_coach_module.js', 'utf8'));
  });
});
