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
const _viewSanitizeMarkupForExport = extractFn('_viewSanitizeMarkupForExport');
const listReconRaw = extractFn('_listReconstructedTables');
const PIPE = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');
const sanitizerStart = PIPE.indexOf('function _alloDecodeImportedCss');
const sanitizerEnd = PIPE.indexOf('function _alloSanitizeRemediationProject', sanitizerStart);
if (sanitizerStart < 0 || sanitizerEnd < 0) throw new Error('Sanitizer markers missing');
const sanitizeRemediationHtml = new Function('DOMParser',
  'const _ALLO_MAX_IMPORTED_HTML_CHARS = 128 * 1024 * 1024;\n'
  + PIPE.slice(sanitizerStart, sanitizerEnd) + '\nreturn _alloSanitizeRemediationHtml;'
)(globalThis.DOMParser);
const listRecon = (html) => listReconRaw(html, { sanitizeRemediationHtml });

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

  it('removes active markup from a forged reconstructed table before live insertion', () => {
    const input = '<table data-allo-reconstructed="image" onclick="steal()"><caption>Review</caption><tbody><tr><td>'
      + '<img src="x" onerror="steal()"><a href="jav&#x61;script:steal()">link</a>'
      + '<svg><set attributeName="href" to="javascript:steal()" /></svg>'
      + '<iframe srcdoc="&lt;script&gt;steal()&lt;/script&gt;"></iframe>'
      + '<style>body{display:none}</style></td></tr></tbody></table>';
    const [result] = listRecon(input);
    const host = document.createElement('div');
    host.innerHTML = result.html;
    expect(host.querySelector('table')).not.toBeNull();
    expect(host.querySelector('script,iframe,set,style,[onclick],[onerror],[srcdoc]')).toBeNull();
    expect(host.querySelector('a').hasAttribute('href')).toBe(false);
    expect(result.caption).toBe('Review');
    expect(result.rows).toBe(1);
  });

  it('preserves accessible table content, math, inline formatting and safe links', () => {
    const input = '<table data-allo-reconstructed="image" aria-label="Measurements"><caption>Mass</caption>'
      + '<thead><tr><th id="mass" scope="col">Mass</th></tr></thead><tbody><tr><td headers="mass" style="color:blue">'
      + '<strong>2 kg</strong><math><mi>m</mi></math><a href="https://example.org">Source</a>'
      + '</td></tr></tbody></table>';
    const [result] = listRecon(input);
    expect(result.html).toBe(input);
  });

  it('keeps review metadata but withholds the preview when sanitization fails', () => {
    const [result] = listReconRaw(RECON('Keep review controls', 2), {
      sanitizeRemediationHtml() { throw new Error('not ready'); },
    });
    expect(result).toEqual({ caption: 'Keep review controls', rows: 2, html: '' });
  });
});
