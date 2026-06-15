// Redaction infrastructure (2026-06-15). SAFETY CONTRACT: redaction must TRULY REMOVE the target
// text, never cover it — a covered-but-present string is still copy-pasteable/machine-readable (a
// FERPA breach). These exercise the REAL module-scope helpers (runtime-extracted, anti-drift).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _redactTargets(targets) {');
const end = src.indexOf('var createDocPipeline', start);
if (start === -1 || end === -1) throw new Error('extraction markers for the redaction helpers missing');
const { _redactDocHtml, _redactionLeaks, _redactDocument } =
  new Function(src.slice(start, end) + '\n; return { _redactTargets, _redactDocHtml, _redactionLeaks, _redactDocument };')();

const text = (html) => { const d = new DOMParser().parseFromString(html, 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); };

describe('redaction core — TRUE removal (not a cover)', () => {
  it('removes the target from the text and the string is GONE from the output (not just hidden)', () => {
    const r = _redactDocHtml('<body><p>Student John Doe scored 85 on the test.</p></body>', ['John Doe']);
    expect(r.html).toContain('[redacted]');
    expect(r.html).not.toContain('John Doe');
    expect(text(r.html)).not.toContain('John Doe'); // truly absent from the re-extracted text
    expect(r.count).toBe(1);
  });

  it('removes EVERY occurrence (incl. case variants) so nothing leaks', () => {
    const r = _redactDocHtml('<body><h1>JOHN DOE</h1><p>John Doe again, and john doe.</p></body>', ['John Doe']);
    expect(text(r.html)).not.toMatch(/john doe/i);
    expect(r.count).toBe(3);
  });

  it('also scrubs PII hiding in text-carrying attributes (alt/title/aria-label)', () => {
    const r = _redactDocHtml('<body><img alt="Photo of John Doe"><a title="Email John Doe">x</a></body>', ['John Doe']);
    expect(r.html).not.toContain('John Doe');
  });

  it('matches a target across flexible whitespace', () => {
    const r = _redactDocHtml('<body><p>John   Doe</p></body>', ['John Doe']);
    expect(text(r.html)).not.toContain('John');
  });

  it('redacts the LONGEST target first (no dangling substring)', () => {
    const r = _redactDocHtml('<body><p>John Doe and John Smith</p></body>', ['John', 'John Doe']);
    expect(text(r.html)).not.toContain('John Doe'); // redacted as a unit
  });

  it('leaves unrelated text untouched', () => {
    const r = _redactDocHtml('<body><p>The annual budget was approved.</p></body>', ['John Doe']);
    expect(r.count).toBe(0);
    expect(text(r.html)).toContain('annual budget was approved');
  });

  it('empty/blank targets are a no-op', () => {
    expect(_redactDocHtml('<body><p>x</p></body>', []).count).toBe(0);
    expect(_redactDocHtml('<body><p>x</p></body>', ['', '   ']).count).toBe(0);
  });
});

describe('redaction SAFETY verifier — never report clean when content survives', () => {
  it('confirms clean when the target is fully removed', () => {
    const r = _redactDocument('<body><p>Student John Doe scored 85.</p></body>', ['John Doe']);
    expect(r.clean).toBe(true);
    expect(r.leaks).toEqual([]);
  });

  it('FLAGS a leak the per-node pass could not remove (target split across elements)', () => {
    // "John <b>Doe</b>" — neither text node alone contains "John Doe", so removal misses it, but
    // the verifier reads the concatenated textContent and catches it. clean MUST be false.
    const r = _redactDocument('<body><p>John <b>Doe</b> here</p></body>', ['John Doe']);
    expect(r.clean).toBe(false);
    expect(r.leaks).toContain('John Doe');
  });

  it('verifies attributes too (a leak in alt is not "clean")', () => {
    const v = _redactionLeaks('<body><img alt="contact John Doe"></body>', ['John Doe']);
    expect(v.clean).toBe(false);
  });
});
