// OMML math golden (2026-06-10, STEM item 7): proves the real CDN chain —
// LaTeX → MathML (temml) → OMML (mathml2omml via +esm) — produces Word-native
// math markup. This validates the one assumption built on faith: the
// mathml2omml package's +esm export shape. CDN-heavy → non-blocking CI job.
import { test, expect } from '@playwright/test';
import * as path from 'path';

const VIEW_PATH = path.resolve(__dirname, '../../view_pdf_audit_module.js');

test('LaTeX → OMML chain produces m:oMath with the math namespace', async ({ page }) => {
  await page.goto('about:blank');
  // The view module expects React in scope for its components — stub enough
  // for module-level code to evaluate (the seam is module-scope, not a component).
  await page.addScriptTag({ content: 'window.React = { useState: () => [null, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), useCallback: (f) => f, useMemo: (f) => f(), createElement: () => null, Fragment: {} };' });
  await page.addScriptTag({ path: VIEW_PATH });
  const r = await page.evaluate(async () => {
    const fn = (window as any).__alloLatexToOmml;
    if (typeof fn !== 'function') return { error: 'seam missing' };
    const omml = await fn('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
    return { omml: omml ? String(omml).slice(0, 4000) : null };
  });
  expect(r.error, r.error).toBeFalsy();
  expect(r.omml, 'conversion chain returned null — check temml/mathml2omml CDN shapes').toBeTruthy();
  expect(r.omml!).toMatch(/<m:oMath/);
  expect(r.omml!).toContain('xmlns:m=');
  // The fraction must survive the round trip as Word fraction markup.
  expect(r.omml!).toMatch(/<m:f[ >]/);
});
