// Unit tests for _listReconstructedTables (view_pdf_audit_source.jsx) — the lister behind the
// AI-reconstructed-structure accept/reject gate. It finds data-allo-reconstructed tables (emitted
// by doc_pipeline when an infographic is rebuilt as a table) so the teacher can verify/reject each.
// jsdom provides DOMParser. Anti-drift: extracts the real function from source.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../view_pdf_audit_source.jsx'), 'utf8');
function extractFn(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) throw new Error('not found: ' + name);
  const braceStart = SRC.indexOf('{', at);
  let i = braceStart, d = 0, end = -1;
  for (; i < SRC.length; i++) { const c = SRC[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  // eslint-disable-next-line no-eval
  return eval('(' + SRC.slice(at, end + 1) + ')');
}
const listRecon = extractFn('_listReconstructedTables');

const RECON = (cap, rows) => `<table data-allo-reconstructed="image"><caption>${cap}</caption><tbody>${'<tr><td>x</td><td>y</td></tr>'.repeat(rows)}</tbody></table>`;

describe('_listReconstructedTables', () => {
  it('lists each reconstructed table with caption + row count', () => {
    const html = '<html><body>' + RECON('Bias types', 5) + '<p>prose</p>' + RECON('Question forms', 3) + '</body></html>';
    const out = listRecon(html);
    expect(out.length).toBe(2);
    expect(out[0].caption).toBe('Bias types');
    expect(out[0].rows).toBe(5);
    expect(out[1].rows).toBe(3);
  });

  it('ignores ordinary (non-reconstructed) tables', () => {
    const html = '<html><body><table><caption>Normal</caption><tbody><tr><td>a</td></tr></tbody></table></body></html>';
    expect(listRecon(html)).toEqual([]);
  });

  it('handles a reconstructed table with no caption', () => {
    const html = '<html><body><table data-allo-reconstructed="image"><tbody><tr><td>a</td><td>b</td></tr></tbody></table></body></html>';
    const out = listRecon(html);
    expect(out.length).toBe(1);
    expect(out[0].caption).toBe('');
    expect(out[0].rows).toBe(1);
  });

  it('returns [] for empty/garbage input', () => {
    expect(listRecon('')).toEqual([]);
    expect(listRecon(null)).toEqual([]);
  });
});
