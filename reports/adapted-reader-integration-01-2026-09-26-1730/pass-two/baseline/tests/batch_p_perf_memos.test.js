import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Batch P (2026-07-13): 7/12 ledger C1 + C2 — the verification-binding checks
// UTF-8-encoded the FULL document on every call (batch-end ~9×/file; view once
// per render after any tagged validation). byteLength of a (holder, exact-html)
// pair is immutable, so it memoizes on holder identity + string equality.

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipe = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');

describe('C1 — pipeline binding check memoizes the UTF-8 length', () => {
  it('WeakMap memo keyed on result identity, guarded by exact html equality', () => {
    expect(pipe).toContain("var _alloUtf8LenMemo = typeof WeakMap !== 'undefined' ? new WeakMap() : null;");
    expect(pipe).toContain('if (memo && memo.html === liveHtml) {');
    expect(pipe).toContain('_alloUtf8LenMemo.set(result, { html: liveHtml, len: byteLen })');
  });
});

describe('C2 — view render-path check memoizes the UTF-8 length', () => {
  const start = view.indexOf('const _viewUtf8LenMemo');
  const end = view.indexOf('\n}', view.indexOf('function _viewValidationMatchesHtml', start)) + 2;
  const factory = new Function('_viewValidVerificationHtmlBinding', 'TextEncoder',
    view.slice(start, end) + '\nreturn _viewValidationMatchesHtml;');

  const mkValidation = (html, byteLen) => {
    const v = { sourceHtmlBinding: { digest: 'd1', utf8ByteLength: byteLen } };
    Object.defineProperties(v, {
      _sourceHtmlSnapshot: { value: html, enumerable: false, configurable: true },
      _sourceHtmlBindingDigest: { value: 'd1', enumerable: false, configurable: true },
    });
    return v;
  };

  it('encodes once per (validation, html) pair; repeat calls hit the memo', () => {
    let encodes = 0;
    class CountingEncoder {
      encode(s) { encodes++; return new TextEncoder().encode(s); }
    }
    const fn = factory(() => true, CountingEncoder);
    const html = '<p>hello world</p>';
    const v = mkValidation(html, new TextEncoder().encode(html).byteLength);
    expect(fn(v, html)).toBe(true);
    expect(fn(v, html)).toBe(true);
    expect(fn(v, html)).toBe(true);
    expect(encodes).toBe(1);
  });

  it('a DIFFERENT html string misses the memo and re-verifies (no stale acceptance)', () => {
    let encodes = 0;
    class CountingEncoder {
      encode(s) { encodes++; return new TextEncoder().encode(s); }
    }
    const fn = factory(() => true, CountingEncoder);
    const html = '<p>doc A</p>';
    const v = mkValidation(html, new TextEncoder().encode(html).byteLength);
    expect(fn(v, html)).toBe(true);
    // Snapshot identity check fails first for changed html — the memo can never
    // convert a stale pair into a pass.
    expect(fn(v, '<p>doc B</p>')).toBe(false);
    expect(encodes).toBe(1);
  });

  it('a wrong byteLength still fails even when memoized', () => {
    const fn = factory(() => true, TextEncoder);
    const html = '<p>doc</p>';
    const v = mkValidation(html, 999999);
    expect(fn(v, html)).toBe(false);
    expect(fn(v, html)).toBe(false);
  });
});
