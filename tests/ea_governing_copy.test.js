// Governing-aware EA explainer (2026-07-05, maintainer): the "Why the automated layer is the lower
// number" box fired whenever IBM Equal Access beat axe-core — even when the CONTENT layer governed
// the headline (content 80 vs automated 90 on the 7/5 run), flatly contradicting the governing-layer
// caption rendered right beside it. EA < axe only means EA is the stricter DETERMINISTIC engine; it
// says nothing about the headline unless EA is also at-or-below the semantic layer. Both the exported
// report and the live UI now branch on which layer actually governs.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const viewMod = readFileSync(resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');

describe('exported report: EA note claims headline governance only when EA also governs the headline', () => {
  it('source: the branch predicate + both copy variants exist', () => {
    expect(dp).toContain("const _eaGovernsHeadline = _eaGoverns && !(typeof semantic === 'number' && semantic < secondEngine);");
    expect(dp).toContain('The headline is governed by the IBM Equal Access engine');
    expect(dp).toContain('About the automated layer (${secondEngine}):');
    expect(dp).toContain('The headline is governed by the lower <em>content</em> layer (${semantic})');
  });
  it('mirror: 7/5 screenshot case (content 80 / axe 100 / EA 90) → informational variant, never the governing claim', () => {
    const pick = (structural, semantic, secondEngine) => {
      const _eaGoverns = (typeof secondEngine === 'number') && (typeof structural === 'number') && secondEngine < structural;
      const _eaGovernsHeadline = _eaGoverns && !(typeof semantic === 'number' && semantic < secondEngine);
      return !_eaGoverns ? 'none' : (_eaGovernsHeadline ? 'governs' : 'about');
    };
    expect(pick(100, 80, 90)).toBe('about');   // content governs — the note only explains the automated number
    expect(pick(100, 95, 90)).toBe('governs'); // EA genuinely governs the headline — the strong claim is earned
    expect(pick(100, 90, 90)).toBe('governs'); // tie — min() means the headline equals EA; claim stands
    expect(pick(90, 80, 90)).toBe('none');     // EA not below axe — no note at all (unchanged)
  });
});

describe('live UI: the amber box lead/body branch on which layer governs (source + compiled module)', () => {
  it('both the JSX source and the compiled module carry the branch + both variants', () => {
    for (const s of [view, viewMod]) {
      // Harness repair (2026-07-09): the module used to be a HAND-SPLICED copy preserving the
      // source's exact parens; it is now built by _build_view_pdf_audit_module.js, whose transform
      // normalizes `) ? (t(` → ` ? t(`. Tolerate both spellings — the branch is what matters.
      expect(s).toMatch(/afterAi < afterDet\s*\)?\s*\?\s*\(?\s*t\(/);
      expect(s).toContain('About the automated layer:');
      expect(s).toContain('The headline is governed by the lower content layer, not by this number.');
      expect(s).toContain('Why the automated layer is the lower number:'); // the governing variant is kept
    }
  });
});
