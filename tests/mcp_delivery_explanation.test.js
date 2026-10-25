// 2026-10-25: staff read the connector's report, not its code. Every withhold/review code a
// tagged PDF can end with must come with a plain meaning and a next step (deliveryExplanation),
// a run that simply did not ask for veraPDF must not be called "validator unavailable", and
// veraPDF runs by default (without it a tagged PDF can never leave review).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const Verification = require(path.join(ROOT, 'desktop/mcp/remediation_verification.cjs'));
const SERVER = fs.readFileSync(path.join(ROOT, 'desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
const DRIVER = fs.readFileSync(path.join(ROOT, 'desktop/mcp/remediation_headless_driver.cjs'), 'utf8');
const GENERIC = 'The tagged PDF was not delivered.';

const withPdf = (extra) => Object.assign({
  files: { taggedPdf: 'x-tagged.pdf' },
  verdict: { level: 'caution', reviewCount: 0, cautionCount: 1 },
  verificationState: 'complete-for-tested-scope',
  taggedPdfDelivery: { ok: true, code: 'verified' },
}, extra);

describe('deliveryExplanation', () => {
  it('names a run that did not request veraPDF as not-requested, not unavailable', () => {
    const s = withPdf();
    Verification.applyPdfDeliveryEvidence(s, Verification.pdfUaEvidence(null, { hasPdf: true, requested: false }));
    expect(s.taggedPdfDelivery.code).toBe('validator-not-requested');
    expect(Verification.explainDelivery(s).items[0].meaning).toMatch(/turned off/);
  });

  it('turns a missing-Java validator error into an install step and keeps the cause', () => {
    const s = withPdf();
    Verification.applyPdfDeliveryEvidence(s, Verification.pdfUaEvidence({ error: 'Java runtime not found' }, { hasPdf: true, requested: true }));
    const item = Verification.explainDelivery(s).items[0];
    expect(item.code).toBe('validator-error');
    expect(item.nextStep).toMatch(/Java 11/);
    expect(item.detail).toBe('Java runtime not found');
  });

  it('explains every withhold code the driver can throw', () => {
    const codes = [...DRIVER.matchAll(/throw (?:new )?Error\('([a-z_]+)'\)/g)].map((m) => m[1])
      .filter((c) => /_(required|unavailable|review)/.test(c));
    expect(codes.length).toBeGreaterThanOrEqual(5);
    for (const code of new Set(codes)) {
      const out = Verification.explainDelivery({ files: {}, taggedPdfError: code, deliveryStatus: 'review-required' });
      expect(out.items[0].meaning, code).not.toBe(GENERIC);
    }
    const unverified = Verification.explainDelivery({ files: {}, taggedPdfError: 'tagged_pdf_delivery_unverified (roundtrip-failed: x)', taggedPdfDelivery: { ok: false, code: 'roundtrip-failed' } });
    expect(unverified.items).toHaveLength(1);
    expect(unverified.items[0].meaning).not.toBe(GENERIC);
  });

  it('explains every non-verified delivery code the server accepts, and the schema enum matches', () => {
    const set = SERVER.match(/const TAGGED_PDF_DELIVERY_CODES = new Set\(\[([\s\S]*?)\]\)/)[1];
    const codes = [...set.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).filter((c) => c !== 'verified');
    expect(codes).toContain('validator-not-requested');
    for (const code of codes) {
      const out = Verification.explainDelivery({ files: { taggedPdf: 'x.pdf' }, taggedPdfDelivery: { ok: false, code } });
      expect(out.items[0].meaning, code).not.toBe(GENERIC);
      expect(SERVER.includes(`'${code}'`), code + ' in output schema').toBe(true);
    }
    const schemaEnum = SERVER.match(/enum: \['verified', 'typeset-content-dropped'[^\]]*\]/)[0];
    for (const code of codes) expect(schemaEnum.includes(`'${code}'`), code + ' in schema enum').toBe(true);
  });

  it('does not invent a problem when checks passed', () => {
    const out = Verification.explainDelivery({ files: { taggedPdf: 'x.pdf' }, deliveryStatus: 'complete-for-tested-scope', taggedPdfDelivery: { ok: true, code: 'verified' } });
    expect(out.items).toEqual([]);
    expect(out.headline).toMatch(/passed/);
  });

  it('is written onto every report', () => {
    expect(SERVER).toMatch(/applyPdfDeliveryEvidence\(summary, pdfEvidence\);\s*summary\.deliveryExplanation = Verification\.explainDelivery\(summary\);/);
  });
});

describe('connector defaults', () => {
  it('runs veraPDF by default', () => {
    expect(SERVER).toMatch(/validateUa: args\.validate_ua === undefined \? true : args\.validate_ua,/);
  });

  it('never re-ingests its own tagged outputs from a folder', () => {
    const re = new RegExp(SERVER.match(/!\/(-tagged[^/]*\\\.pdf\$)\/i\.test\(e\.name\)/)[1], 'i');
    for (const own of ['a-tagged.pdf', 'a-tagged-review-required.pdf', 'a-tagged-2.pdf', 'a-tagged-review-required-3.pdf']) expect(re.test(own), own).toBe(true);
    for (const input of ['tagged.pdf', 'report-tagged-final.pdf', 'handbook.pdf']) expect(re.test(input), input).toBe(false);
  });
});
