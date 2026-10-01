// Unit tests for _deriveDocMeta (view_pdf_audit_source.jsx) — the shared derivation that both the
// editable Document-metadata panel (prefill) and the tagged-PDF export call sites use, so what the
// user sees prefilled is exactly what ships. Title: <title> -> <h1> -> filename (.pdf stripped);
// language: <html lang> -> ''. Anti-drift: extracts the real function from source. (jsdom env
// provides DOMParser.)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../view_pdf_audit_source.jsx'), 'utf8');
function extractFn(name) {
  const anchor = 'function ' + name + '(';
  const at = SRC.indexOf(anchor);
  if (at < 0) throw new Error('not found in source: ' + name);
  const braceStart = SRC.indexOf('{', at);
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(at, end + 1) + ')');
}
const deriveDocMeta = extractFn('_deriveDocMeta');

describe('_deriveDocMeta', () => {
  it('prefers <title>, reads <html lang>', () => {
    const m = deriveDocMeta('<html lang="es"><head><title>My Document</title></head><body><h1>Other</h1></body></html>', 'file.pdf');
    expect(m.title).toBe('My Document');
    expect(m.lang).toBe('es');
  });

  it('falls back to <h1> when there is no <title>', () => {
    const m = deriveDocMeta('<html><body><h1>Heading Title</h1><p>body</p></body></html>', 'file.pdf');
    expect(m.title).toBe('Heading Title');
    expect(m.lang).toBe('');
  });

  it('falls back to the filename (with .pdf stripped) when no title/h1', () => {
    const m = deriveDocMeta('<html><body><p>no headings</p></body></html>', 'Quarterly Report.pdf');
    expect(m.title).toBe('Quarterly Report');
  });

  it('defaults title to "document" when filename is missing too', () => {
    const m = deriveDocMeta('<html><body></body></html>', undefined);
    expect(m.title).toBe('document');
  });

  it('truncates a very long title to 200 chars and lang to 10', () => {
    const longTitle = 'A'.repeat(500);
    const m = deriveDocMeta(`<html lang="en-US-x-verylongsubtag"><head><title>${longTitle}</title></head></html>`, 'f.pdf');
    expect(m.title.length).toBe(200);
    expect(m.lang.length).toBe(10);
  });

  it('handles empty/garbage input without throwing', () => {
    expect(deriveDocMeta('', 'x.pdf').title).toBe('x');
    expect(deriveDocMeta(null, null).title).toBe('document');
  });
});
