// Skip-to-content link focus-indicator contrast (2026-06-22). The pipeline injects a skip link whose
// :focus state used an amber outline (#fbbf24) — ~1.5:1 against a white page background, failing WCAG
// 1.4.3/1.4.11. Replaced with a dark-blue outline (#1e3a8a, ~7.5:1 on white) PLUS a white box-shadow
// halo so the ring is also visible if the remediated doc has a dark background. Both injection sites
// (the two fix paths) carry the fix. A tiny WCAG-luminance check pins that the new color actually passes.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// WCAG relative-luminance contrast ratio between two #rrggbb colors.
const _lum = (hex) => {
  const c = hex.replace('#', '');
  const ch = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = (a, b) => { const la = _lum(a), lb = _lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

describe('skip-link focus indicator passes WCAG contrast on a white page', () => {
  it('the old amber outline really was failing, and the new dark-blue really passes', () => {
    expect(contrast('#fbbf24', '#ffffff')).toBeLessThan(3);     // amber: ~1.5:1 — the bug
    expect(contrast('#1e3a8a', '#ffffff')).toBeGreaterThanOrEqual(4.5); // dark blue: comfortably AA
  });
});

describe('anti-drift: both skip-link injection sites carry the contrast fix', () => {
  it('no skip-link :focus rule still uses the low-contrast amber outline', () => {
    expect(dp).not.toMatch(/outline:3px solid #fbbf24!important;outline-offset:2px!important;text-decoration/);
  });
  it('the live injection site uses the dark-blue outline + white halo', () => {
    // Harness repair (2026-07-09): the SECOND injection site lived in the dead legacy batch loop
    // deleted @3a5d9280 (S4) — the known dead-loop-orphan class. One live site remains.
    const hits = dp.match(/outline:3px solid #1e3a8a!important;outline-offset:2px!important;box-shadow:0 0 0 2px #ffffff!important/g) || [];
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
});
