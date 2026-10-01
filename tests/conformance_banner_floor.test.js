// Report headline floored with the byte validator (audit #18, 2026-06-15). The headline was computed
// only from the IN-MEMORY HTML self-check and never reconciled with the independent byte-level
// validator run on the shipped bytes, so a byte-level FAIL (e.g. a subtree dropped at save) could
// still show a green headline while the lower byte-validation section reported failure. Now the
// headline takes the worse result.
//
// 2026-09-28 (fleet G1): the headline no longer says "Conformant" / "Mostly Conformant" at all.
// Automated checks cannot establish conformance, so the tiers now name what the checks found.
// This file drives the REAL generateAccessibilityReportHtml from the built module (it used to test
// a hand-copied mirror of the logic, which could drift from the code it described).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
let pipeline;

beforeAll(() => {
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Document', state: {},
  });
});

const checksWithFails = (fail) => ({
  checks: [{ category: 'Document', rule: 'Title', status: 'pass', message: 'ok' }],
  summary: { pass: 10, fail, warn: 0, manual: 0, na: 0, conformancePct: fail ? 80 : 100 },
});

function headline(inMemoryFail, pev, veraPdf) {
  const html = pipeline.generateAccessibilityReportHtml({}, {}, checksWithFails(inMemoryFail), {
    fileName: 'floor.pdf', postExportValidator: pev || undefined, veraPdf: veraPdf || undefined,
  });
  const m = html.match(/<div class="headline" style="color:[^"]*">([^<]*)<\/div>/);
  if (!m) throw new Error('headline element not found in the generated report');
  return m[1];
}

describe('report headline is floored with the shipped-file validator', () => {
  it('a clean in-memory check + byte FAIL no longer reads green', () => {
    expect(headline(0, { summary: { overall: 'FAIL', fail: 4 } })).toBe('Automated checks failed (shipped-file check)');
    expect(headline(0, { summary: { overall: 'FAIL', fail: 1 } })).toBe('Some automated checks failed (shipped-file check)');
  });
  it('a clean in-memory check + byte PASS reports no automated failures (never "Conformant")', () => {
    expect(headline(0, { summary: { overall: 'PASS', fail: 0 } })).toBe('No automated failures found');
    expect(headline(0, null)).toBe('No automated failures found');
  });
  it('never UPGRADES: an in-memory failure stays a failure even if the byte check passes', () => {
    expect(headline(5, { summary: { overall: 'PASS', fail: 0 } })).toBe('Automated checks failed');
    expect(headline(2, { summary: { overall: 'PASS', fail: 0 } })).toBe('Some automated checks failed');
  });
  it('a veraPDF pass only relabels a clean result, and says it covers automated checks', () => {
    expect(headline(0, null, { compliant: true, failedRules: [] })).toBe('No failures in veraPDF automated checks (ISO 14289-1)');
    expect(headline(2, null, { compliant: true, failedRules: [] })).toBe('Some automated checks failed');
    expect(headline(0, null, { compliant: false, failedRules: [{ clause: '7.1', testNumber: 1, message: 'x' }] }))
      .toBe('veraPDF found failures (ISO 14289-1, 1 rule failed)');
  });

  it('anti-drift: the floor keys on the tier, not on a label string', () => {
    expect(src).toContain("if (hasChecks && _pevSum && _pevSum.overall === 'FAIL' && _headlineTier === 'pass') {");
    expect(src).toContain("conformanceLabel = _HEADLINE_LABELS[_headlineTier] + ' (shipped-file check)';");
  });
});
