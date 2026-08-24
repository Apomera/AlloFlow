import { describe, it, expect } from 'vitest';
import fs from 'fs';

const source = fs.readFileSync('adventure_source.jsx', 'utf8');
const handlers = fs.readFileSync('adventure_handlers_source.jsx', 'utf8');
const anti = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const app = fs.readFileSync('desktop/web-app/src/App.jsx', 'utf8');

describe('mission report follow-ups (2026-08-23)', () => {
  it('the report shows climax attempts - same victory, different journeys', () => {
    expect(source).toContain('{Number(climax?.attempts) > 0 && (');
    expect(source).toContain("'Final challenge attempts'");
  });

  it('partial credit feeds Efficiency at half weight instead of scoring like a misconception', () => {
    expect(source).toContain('((safeStats.successes + (safeStats.partials || 0) * 0.5) / totalDecisions)');
    // The formula is disclosed to the reader, not silently changed.
    expect(source).toContain("'Strong moves count fully, partial credit counts half, out of all decisions.'");
  });
});

describe('portrait consent back-fill (2026-08-23)', () => {
  it('accepted uploads are stamped with explicit consent going forward', () => {
    for (const [name, src] of [['ANTI', anti], ['App.jsx', app]]) {
      expect(src, name).toContain('portrait: dataUrl, isUserUploaded: true, uploadConsent: true, isGenerating: false');
    }
  });

  it('resuming a pre-guard save shows the disclosure once and stamps it distinctly', () => {
    expect(handlers).toContain('c.isUserUploaded && c.portrait && !c.uploadConsent');
    // Distinct stamp: disclosure-shown must never masquerade as consent-clicked.
    expect(handlers).toContain("{ ...c, uploadConsent: 'resume-disclosure' }");
    expect(handlers).toContain("toasts.adventure_portrait_resume_disclosure");
    // The disclosure names the crossing, same language family as the upload guard.
    expect(handlers).toContain('sent to the AI provider configured for this app');
  });
});
