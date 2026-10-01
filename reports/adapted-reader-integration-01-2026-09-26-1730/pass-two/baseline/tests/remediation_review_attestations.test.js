import { describe, it, expect, beforeAll } from 'vitest';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
let update;
beforeAll(() => {
  window.React = React;
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('view_pdf_audit_module.js');
  update = window.AlloModules.PdfReviewAttestations;
});
function boundResult() {
  const html = '<h1>Current output</h1><p>Review this text.</p>';
  const binding = { version: 1, algorithm: 'SHA-256', digest: createHash('sha256').update(html).digest('hex'), utf8ByteLength: Buffer.byteLength(html) };
  const result = { accessibleHtml: html, verificationHtmlBinding: binding, verificationState: 'review-required', afterScoreVerified: false, engineExecutionComplete: true,
    verificationCoverage: { ai: 'complete', axe: 'complete-with-review', equalAccess: 'complete' }, reviewedFindings: { old: 123 } };
  Object.defineProperties(result, {
    _verificationHtmlSnapshot: { value: html, writable: true, configurable: true, enumerable: false },
    _verificationHtmlBindingDigest: { value: binding.digest, writable: true, configurable: true, enumerable: false },
  });
  return result;
}
// AlloModules.DocPipelineModule is the duplicate-load guard (a boolean), never a namespace.
// The static helpers hang off createDocPipeline; reading them off the guard threw
// "is not a function" and failed all five cases here for one reason.
const live = result => window.AlloModules.createDocPipeline.isLiveVerificationHtmlBound(result, result.accessibleHtml);
describe('human-review metadata updates', () => {
  it('retains exact live proof and canonical verification while replacing only the attestation map', () => {
    const previous = boundResult(); const before = Object.getOwnPropertyDescriptors(previous);
    expect(live(previous)).toBe(true);
    Object.freeze(previous);
    const map = { 'axe|incomplete|color-contrast': 456 };
    const next = update(previous, map);
    expect(next).not.toBe(previous);
    expect(next.reviewedFindings).toEqual(map);
    expect(next.accessibleHtml).toBe(previous.accessibleHtml);
    expect(next.verificationState).toBe('review-required');
    expect(next.engineExecutionComplete).toBe(true);
    expect(next.verificationCoverage).toBe(previous.verificationCoverage);
    expect(live(next)).toBe(true);
    expect(Object.getOwnPropertyDescriptor(next, '_verificationHtmlSnapshot').enumerable).toBe(false);
    expect(Object.getOwnPropertyDescriptor(next, '_verificationHtmlBindingDigest').enumerable).toBe(false);
    expect(previous.reviewedFindings).toEqual({ old: 123 });
    expect(previous._verificationHtmlSnapshot).toBe(before._verificationHtmlSnapshot.value);
    expect(previous._verificationHtmlBindingDigest).toBe(before._verificationHtmlBindingDigest.value);
  });
  it('supports undo and reset without changing HTML or granting a passing outcome', () => {
    const previous = boundResult();
    const next = update(previous, null);
    expect(next.reviewedFindings).toBeNull();
    expect(next.verificationState).toBe('review-required');
    expect(next.afterScoreVerified).toBe(false);
    expect(next.accessibleHtml).toBe(previous.accessibleHtml);
    expect(live(next)).toBe(true);
  });
  it('does not create runtime proof from a serialized saved result', () => {
    const previous = JSON.parse(JSON.stringify(boundResult()));
    const next = update(previous, { reviewed: 456 });
    expect(live(next)).toBe(false);
    expect(Object.hasOwn(next, '_verificationHtmlSnapshot')).toBe(false);
    expect(Object.hasOwn(next, '_verificationHtmlBindingDigest')).toBe(false);
  });
  it('does not bless verification after the HTML changes', () => {
    const previous = boundResult(); previous.accessibleHtml += '<p>New text</p>';
    const next = update(previous, { reviewed: 456 });
    expect(live(next)).toBe(false);
    expect(Object.hasOwn(next, '_verificationHtmlSnapshot')).toBe(false);
  });
  it('does not bless a replaced binding record with stale runtime proof', () => {
    const previous = boundResult(); previous.verificationHtmlBinding = { ...previous.verificationHtmlBinding, digest: 'a'.repeat(64) };
    const next = update(previous, { reviewed: 456 });
    expect(live(next)).toBe(false);
    expect(Object.hasOwn(next, '_verificationHtmlBindingDigest')).toBe(false);
  });
  it('handles the absence of a result without manufacturing one', () => {
    expect(update(null, { reviewed: 456 })).toBeNull();
    expect(update(undefined, null)).toBeUndefined();
  });
});
