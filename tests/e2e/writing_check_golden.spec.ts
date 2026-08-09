// Writing-check sentinel: proves the Builder's Harper integration works
// end-to-end in a real browser — the exact _ensureHarper code path
// (runtime-extracted from view_export_preview_source.jsx) loads the ESM +
// WASM from CDN and produces spelling + grammar lints with spans + suggestions.
// Catches CDN outages, harper.js API drift, and WASM-loading regressions.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../../view_export_preview_source.jsx'), 'utf8');
const cut = (startMarker: string, endMarker: string) => {
  const s = SRC.indexOf(startMarker);
  const e = SRC.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error('extraction markers missing: ' + startMarker);
  return SRC.slice(s, e);
};
const HELPER = cut('let _harperPromise = null;', '// end _ensureHarper');

test.describe('Builder writing check — Harper integration', () => {
  test('loads from CDN and returns an app-usable spelling replacement', async ({ page }) => {
    test.setTimeout(180000);
    await page.goto('about:blank');
    const out = await page.evaluate(async (helper) => {
      try {
        // eslint-disable-next-line no-eval
        const ensure = new Function(helper + '; return _ensureHarper;')();
        const linter = await ensure();
        const input = 'She go to the store. The the cat sat. This word is mispelled.';
        const lints = await linter.lint(input, { language: 'plaintext' });
        const normalized = lints.map((lint) => {
          const span = lint.span();
          return {
            bad: input.slice(span.start, span.end),
            replacements: (lint.suggestions ? lint.suggestions() : [])
              .map((suggestion) => suggestion && suggestion.get_replacement_text ? suggestion.get_replacement_text() : null)
              .filter((replacement) => replacement !== null),
          };
        });
        const spelling = normalized.find((lint) => lint.bad.toLowerCase() === 'mispelled') || null;
        return {
          ok: true,
          count: lints.length,
          spelling,
          first: lints.length ? {
            msg: lints[0].message ? lints[0].message() : '',
            hasSpan: !!(lints[0].span && typeof lints[0].span().start === 'number'),
            hasSuggestion: !!(lints[0].suggestions && lints[0].suggestions().length > 0),
          } : null,
        };
      } catch (e: any) { return { ok: false, msg: String(e && (e.message || e)).slice(0, 300) }; }
    }, HELPER);
    expect(out.ok, 'harper load/lint error: ' + (out as any).msg).toBe(true);
    expect(out.count, 'expected lints on a deliberately broken sentence').toBeGreaterThanOrEqual(2);
    expect(out.spelling, 'expected a spelling lint for "mispelled"').not.toBeNull();
    expect(out.spelling!.replacements, 'spelling lint must offer the Apply replacement').toContain('misspelled');
    expect(out.first!.hasSpan, 'lint must carry a span for locate/apply').toBe(true);
    expect(out.first!.hasSuggestion, 'lint must carry suggestions for the Apply chips').toBe(true);
  });
});
