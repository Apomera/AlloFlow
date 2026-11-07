// notifications keyless run (2026-11-05): veraPDF ran past its 5-minute limit on a busy machine (the same file passes in 5 s by
// hand), so a clean PDF was marked review-required, and the headline said it "did not pass every check". One more try for a
// timeout only; a failed PDF or a broken report is never re-rolled. The headline says the check could not finish.
// Module path overridable (ALLO_VERIFICATION_MODULE) for mutation checks on private copies.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const V = require(process.env.ALLO_VERIFICATION_MODULE ? resolve(process.env.ALLO_VERIFICATION_MODULE) : '../desktop/mcp/remediation_verification.cjs');
const seq = (...steps) => { let n = 0; const f = async () => { const s = steps[n++]; if (s instanceof Error) throw s; return s; }; f.calls = () => n; return f; };
const TIMEOUT = () => new Error('veraPDF validation timed out');

describe('retryValidatorTimeoutOnce', () => {
  it('a timeout gets one more try, and the second result stands', async () => {
    const run = seq(TIMEOUT(), { status: 'compliant' });
    const notes = [];
    await expect(V.retryValidatorTimeoutOnce(run, (m) => notes.push(m))).resolves.toEqual({ status: 'compliant' });
    expect(run.calls()).toBe(2);
    expect(notes.join(' ')).toMatch(/trying once more/);
  });
  it('so does Java not answering on a busy machine (osep4)', async () => {
    const run = seq(new Error('Java did not respond in time: `java -version` took longer than 60 s (spawnSync java ETIMEDOUT).'), { status: 'compliant' });
    await expect(V.retryValidatorTimeoutOnce(run)).resolves.toEqual({ status: 'compliant' });
    expect(run.calls()).toBe(2);
  });
  it('a noncompliant result is never re-rolled', async () => {
    const run = seq({ status: 'noncompliant' }, { status: 'compliant' });
    await expect(V.retryValidatorTimeoutOnce(run)).resolves.toEqual({ status: 'noncompliant' });
    expect(run.calls()).toBe(1);
  });
  it('two timeouts end as a timeout: only one retry', async () => {
    const run = seq(TIMEOUT(), TIMEOUT(), { status: 'compliant' });
    await expect(V.retryValidatorTimeoutOnce(run)).rejects.toThrow(/timed out/);
    expect(run.calls()).toBe(2);
  });
  it('other errors are not retried', async () => {
    for (const msg of ['veraPDF CLI returned no valid JSON (exit 1)', 'veraPDF validation cancelled', 'Java runtime not found', 'veraPDF validation timed out after 90s in the browser']) {
      const run = seq(new Error(msg), { status: 'compliant' });
      await expect(V.retryValidatorTimeoutOnce(run)).rejects.toThrow(msg);
      expect(run.calls()).toBe(1);
    }
  });
  it('a cancelled run is not retried', async () => {
    const run = seq(TIMEOUT(), { status: 'compliant' });
    await expect(V.retryValidatorTimeoutOnce(run, null, { aborted: true })).rejects.toThrow(/timed out/);
    expect(run.calls()).toBe(1);
  });
  it('the connector uses it for local veraPDF', () => {
    const src = fs.readFileSync(resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs'), 'utf8');
    expect(src.includes('await Verification.retryValidatorTimeoutOnce(() => getDriver().validatePdfUaCli({')).toBe(true);
  });
});

describe('the headline when the check could not finish', () => {
  const base = { deliveryStatus: 'review-required', verdictReasons: { review: [], cautions: [] }, verification: {}, files: { taggedPdf: 'x-tagged-review-required.pdf' } };
  it('says no check found a problem', () => {
    const h = V.explainDelivery({ ...base, taggedPdfDelivery: { ok: false, code: 'validator-error' }, taggedPdfError: 'tagged_pdf_delivery_unverified (validator-error: x)' }).headline;
    expect(h).toMatch(/could not finish/);
    expect(h).toMatch(/No check found a problem/);
    expect(h).not.toMatch(/did not pass every check/);
  });
  it('a busy machine does not send a teacher to install Java; a missing Java still does', () => {
    const item = (error) => V.explainDelivery({ ...base, taggedPdfDelivery: { ok: false, code: 'validator-error' }, pdfUa: { status: 'unavailable', error } }).items.find((x) => x.code === 'validator-error');
    const busy = item('Java did not respond in time: `java -version` took longer than 60 s. Restart nothing; the machine may be busy.');
    expect(busy.nextStep).toMatch(/Run the document again/);
    expect(busy.nextStep).not.toMatch(/Install Java/);
    expect(item('Java runtime not found: `java -version` failed').nextStep).toMatch(/Install Java/);
  });
  it('a real failure keeps its plain wording', () => {
    const h = V.explainDelivery({ ...base, taggedPdfDelivery: { ok: false, code: 'pdf-ua-noncompliant' }, taggedPdfError: 'tagged_pdf_delivery_unverified (pdf-ua-noncompliant: x)' }).headline;
    expect(h).toMatch(/did not pass every check/);
    expect(h).not.toMatch(/No check found a problem/);
  });
});
