// Header labels + scan banner caught up to the weakest-layer model (2026-06-21). The redesign updated
// the score-breakdown CARD ("lower of X and Y / governing layer / never averaged") but the audit HEADER
// summary still said "(AI + axe-core blend)" and "Blended: N (50/50)" — contradicting the card on the
// same screen. AND the divergence banner said "Structurally compliant but semantically weak" for an
// image-only SCAN, where axe's high score is purely by-construction (it sees an empty reconstruction) —
// the exact by-construction trap the redesign warns about. Surfaced by a real scanned-doc screenshot.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('the audit header no longer calls the score a 50/50 blend', () => {
  it('the stale "blend" / "50/50" labels are gone', () => {
    expect(view).not.toMatch(/\(AI \+ axe-core blend\)/);
    expect(view).not.toMatch(/Blended: \{pdfAuditResult\.score\} \(50\/50\)/);
    expect(view).not.toMatch(/\(50\/50 blend\)/);
  });
  it('the header reflects the governing (lower) layer', () => {
    expect(view).toMatch(/\(lower of AI & automated\)/);
    expect(view).toMatch(/Governing: \{pdfAuditResult\.score\}/);
    expect(view).toMatch(/the lower of the engines.*never averaged/);
    expect(view).toMatch(/then the lower of the two layers governs/);
  });
});

describe('the divergence banner is honest for an image-only scan', () => {
  it('branches on hasSearchableText === false and forces the OCR message for a scan', () => {
    expect(view).toMatch(/const noTextLayer = pdfAuditResult\.hasSearchableText === false;/);
    expect(view).toMatch(/if \(spread < 15 && !axeCrit && !noTextLayer\) return null;/);
    expect(view).toMatch(/const msg = noTextLayer\s*\n\s*\? \(t\('pdf_audit\.divergence\.no_text_layer'\)/);
    expect(view).toMatch(/needs OCR before it can be made accessible/);
  });
  it('the scan message does NOT claim the doc is "structurally compliant" (the by-construction trap)', () => {
    // The semantic message still exists for real text docs, but the SCAN path must not reach it.
    expect(view).toMatch(/Image-only scan — no searchable text layer/);
    expect(view).toMatch(/high automated score is by construction/);
  });
  it('the critical-override message no longer references a "blended"/"average" score', () => {
    expect(view).not.toMatch(/trusting the blended score; an average can hide/);
    expect(view).toMatch(/the governing \(lower\) layer should already reflect this/);
  });
});

// ── Behaviour mirror: which banner message fires ──
const bannerMsg = ({ ai, axe, axeCrit, hasSearchableText }) => {
  const spread = Math.abs(ai - axe);
  const noTextLayer = hasSearchableText === false;
  if (spread < 15 && !axeCrit && !noTextLayer) return null;
  if (noTextLayer) return 'ocr';
  if (axeCrit) return 'critical';
  return ai < axe ? 'semantic' : 'structural';
};

describe('banner selection logic (mirror)', () => {
  it('a no-text-layer scan (AI 0, axe 80) → the OCR message, NOT "structurally compliant/semantic"', () => {
    expect(bannerMsg({ ai: 0, axe: 80, axeCrit: 0, hasSearchableText: false })).toBe('ocr');
  });
  it('a real text doc with poor alt/reading-order (AI 60, axe 90) → semantic', () => {
    expect(bannerMsg({ ai: 60, axe: 90, axeCrit: 0, hasSearchableText: true })).toBe('semantic');
  });
  it('a doc with code-level WCAG fails (AI 90, axe 60) → structural', () => {
    expect(bannerMsg({ ai: 90, axe: 60, axeCrit: 0, hasSearchableText: true })).toBe('structural');
  });
  it('any critical axe violation surfaces regardless of spread', () => {
    expect(bannerMsg({ ai: 85, axe: 88, axeCrit: 1, hasSearchableText: true })).toBe('critical');
  });
  it('a close, clean text doc → no banner', () => {
    expect(bannerMsg({ ai: 88, axe: 90, axeCrit: 0, hasSearchableText: true })).toBe(null);
  });
});
