// view_pdf_audit hang/leak follow-up (2026-06-22), the deferred siblings from the completeness sweep
// (wn2purm25): the Compare PDF-preview path (_renderPdfInto) leaked a pdf.js worker doc on every
// render/toggle and had unbounded getDocument/getPage/render awaits; five bare fetch() sites (TTS audio
// ×3, allorigins proxy, image) could hang the audit UI. Fix = a local _withTimeout helper (the module had
// none) bounding every such await, plus tracking + destroying the Compare doc.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const audit = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

// ── Extract + run the real _withTimeout (top-level, no regex/braces to confuse extraction) ──
const _s = audit.indexOf('function _withTimeout(promise, ms, label) {');
const _e = audit.indexOf('\n}', _s) + 2;
const _withTimeout = new Function(audit.slice(_s, _e) + '\nreturn _withTimeout;')();

describe('_withTimeout (view_pdf_audit) bounds a promise', () => {
  it('resolves a fast promise with its value', async () => {
    await expect(_withTimeout(Promise.resolve('ok'), 1000, 'x')).resolves.toBe('ok');
  });
  it('rejects a hung promise after the timeout (does not wait forever)', async () => {
    const never = new Promise(() => {}); // never settles
    await expect(_withTimeout(never, 20, 'hang')).rejects.toThrow(/Timed out after 20ms: hang/);
  });
  it('propagates the underlying rejection if it loses the race', async () => {
    await expect(_withTimeout(Promise.reject(new Error('boom')), 1000, 'x')).rejects.toThrow('boom');
  });
});

describe('anti-drift: Compare PDF-preview no longer leaks the pdf.js doc + is bounded', () => {
  it('tracks the active doc and destroys it on re-entry + on completion', () => {
    expect(audit).toMatch(/var _cmpPdfDoc = null;/);
    expect(audit).toMatch(/if \(_cmpPdfDoc\) \{ try \{ _cmpPdfDoc\.destroy\(\); \} catch \(_\) \{\} _cmpPdfDoc = null; \}/); // re-entry
    expect(audit).toMatch(/try \{ doc\.destroy\(\); \} catch \(_\) \{\} if \(_cmpPdfDoc === doc\) _cmpPdfDoc = null;/);  // completion
  });
  it('bounds getDocument / getPage / render with _withTimeout', () => {
    expect(audit).toMatch(/_withTimeout\(pdfjs\.getDocument\(\{ data: _b64ToBytes\(b64\) \}\)\.promise, 30000, 'Compare getDocument'\)/);
    expect(audit).toMatch(/_withTimeout\(doc\.getPage\(n\), 30000, 'Compare getPage '/);
    expect(audit).toMatch(/_withTimeout\(page\.render\([\s\S]{0,80}\)\.promise, 30000, 'Compare render '/);
  });
});

describe('anti-drift: every remote fetch in view_pdf_audit is timeout-bounded', () => {
  it('routes the sole direct fetch through an AbortController that spans headers and body', () => {
    expect(audit.match(/await fetch\(/g) || []).toHaveLength(1);
    expect(audit).toContain("response = await fetch(url, { ...(options || {}), signal: controller.signal })");
    expect(audit).toContain("const timer = setTimeout(() => { timedOut = true; try { controller.abort(); } catch (_) {} }, timeoutMs);");
    expect(audit).toContain("timedOut ? (label + ' timed out.')");
  });
  it('streams website bodies with a byte counter and aborts above the 5 MB limit', () => {
    expect(audit).toContain('const reader = response.body.getReader();');
    expect(audit).toContain('const part = await reader.read();');
    expect(audit).toContain('total += part.value.byteLength;');
    expect(audit).toContain('if (total > limit) {');
    expect(audit).toContain('try { await reader.cancel(); } catch (_) {}');
    const proxyCall = audit.indexOf('_fetchWebsiteSourceOnce(', audit.indexOf('const proxyUrl ='));
    expect(proxyCall).toBeGreaterThan(-1);
    const proxySlice = audit.slice(proxyCall, proxyCall + 500);
    expect(proxySlice).toContain('proxyUrl');
    expect(proxySlice).toContain('20000');
    expect(proxySlice).toContain('maxWebsiteBytes');
  });
  it('keeps the TTS and image fetches promise-timeout wrapped', () => {
    const wrapped = audit.split('_withTimeout(fetch(').slice(1);
    expect(wrapped.length).toBeGreaterThanOrEqual(4); // TTS ×3 + image
    expect(audit).toContain("_withTimeout(fetch(img.src), 20000, 'image fetch')");
  });
});