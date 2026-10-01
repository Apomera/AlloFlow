// Correctness fixes from the 2026-06-15 fresh review (fix-now-safe batch B):
//   #7 deterministic <th> scope made geometry-aware
//   #5 OCR dual-engine disagreement only flagged when BOTH engines have text
//   #8 batch report null-score guards (toast avg, CSV, HTML Gain cell)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Runtime-extract the real _stampThScopeGeometryAware (module-scope pure fn, anti-drift).
const start = src.indexOf('function _stampThScopeGeometryAware(html) {');
const end = src.indexOf('\nvar createDocPipeline = function(deps) {', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _stampThScopeGeometryAware missing');
const _stampThScopeGeometryAware = new Function(src.slice(start, end) + '\n; return _stampThScopeGeometryAware;')();

describe('#7 _stampThScopeGeometryAware — scope by grid position, not blanket col', () => {
  it('first-row headers get scope="col"; a later-row header gets scope="row"', () => {
    const out = _stampThScopeGeometryAware('<table><tr><th>Name</th><th>Age</th></tr><tr><th>Ada</th><td>36</td></tr></table>');
    expect(out).toContain('<th scope="col">Name</th>');
    expect(out).toContain('<th scope="col">Age</th>');
    expect(out).toContain('<th scope="row">Ada</th>'); // pre-fix this shipped scope="col" (wrong axis)
  });
  it('honors <thead>/<tbody>: thead th → col, tbody row-header th → row', () => {
    const out = _stampThScopeGeometryAware('<table><thead><tr><th>H1</th></tr></thead><tbody><tr><th>R1</th><td>x</td></tr></tbody></table>');
    expect(out).toContain('<th scope="col">H1</th>');
    expect(out).toContain('<th scope="row">R1</th>');
  });
  it('preserves an explicit AI-declared scope (never re-stamps)', () => {
    const out = _stampThScopeGeometryAware('<table><tr><th scope="rowgroup">X</th></tr></table>');
    expect(out).toContain('scope="rowgroup"');
    expect((out.match(/scope=/g) || []).length).toBe(1); // not double-stamped
  });
  it('keeps attributes on the stamped th', () => {
    const out = _stampThScopeGeometryAware('<table><tr><th class="hd">A</th></tr></table>');
    expect(out).toContain('<th scope="col" class="hd">A</th>');
  });
  it('fail-safe: non-table / odd input never throws and is returned unchanged', () => {
    expect(_stampThScopeGeometryAware('<p>no tables here</p>')).toBe('<p>no tables here</p>');
    expect(() => _stampThScopeGeometryAware(null)).not.toThrow();
  });
});

describe('#5 OCR disagreement — only flag when both engines produced text (anti-drift)', () => {
  it('the reconcile guard requires tLen>0 && vLen>0', () => {
    expect(src).toContain('longest > 0 && tLen > 0 && vLen > 0 && (Math.abs(tLen - vLen)');
  });
});

describe('#8 batch report — null-score guards (anti-drift)', () => {
  it('the completion-toast average filters to files with both scores present', () => {
    expect(src).toContain('done.filter(q => q.result && q.result.afterScore != null && q.result.beforeScore != null)');
  });
  it('the CSV improvement + HTML Gain cells render blank/dash on a null score, not NaN', () => {
    expect(src).toContain('r && r.afterScore != null && r.beforeScore != null ? (r.afterScore - r.beforeScore) : ');
    expect(src).toContain("r && r.afterScore!=null && r.beforeScore!=null ? '+'+(r.afterScore-r.beforeScore)");
  });
});
