// Tests for the read-only tag-structure inspector (view_pdf_audit_source.jsx).
//  (1) DRIFT SENTINEL: the inspector's _TAG_TO_PDF_ROLE must equal doc_pipeline's TAG_TO_PDF_ROLE
//      (the real HTML-tag -> PDF role map createTaggedPdf uses) — else the inspector lies about
//      what the tagged PDF will contain. This fails the instant the source map changes.
//  (2) _buildTagOutline behavior: roles, heading nesting/indent + skipped-heading warning,
//      missing-alt, table missing-th / missing-scope, and that container internals aren't
//      double-surfaced. (jsdom provides DOMParser.)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const VIEW_SRC = fs.readFileSync(path.resolve(__dirname, '../view_pdf_audit_source.jsx'), 'utf8');
const PIPE_SRC = fs.readFileSync(path.resolve(__dirname, '../doc_pipeline_source.jsx'), 'utf8');

function extractObject(src, name) {
  const anchor = 'const ' + name + ' = {';
  const at = src.indexOf(anchor);
  if (at < 0) throw new Error('not found: ' + name);
  const braceStart = src.indexOf('{', at);
  let i = braceStart, d = 0, end = -1;
  for (; i < src.length; i++) { const c = src[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  // eslint-disable-next-line no-eval
  return eval('(' + src.slice(braceStart, end + 1) + ')');
}
function extractFn(src, name, injectName, injectVal) {
  const at = src.indexOf('function ' + name + '(');
  const braceStart = src.indexOf('{', at);
  let i = braceStart, d = 0, end = -1;
  for (; i < src.length; i++) { const c = src[i]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = i; break; } } }
  return new Function(injectName, src.slice(at, end + 1) + '\n; return ' + name + ';')(injectVal);
}

const viewMap = extractObject(VIEW_SRC, '_TAG_TO_PDF_ROLE');
const pipeMap = extractObject(PIPE_SRC, 'TAG_TO_PDF_ROLE');
const buildTagOutline = extractFn(VIEW_SRC, '_buildTagOutline', '_TAG_TO_PDF_ROLE', viewMap);

describe('tag-tree role map drift sentinel', () => {
  it("the inspector's role map is identical to doc_pipeline's TAG_TO_PDF_ROLE", () => {
    expect(viewMap).toEqual(pipeMap);
  });
});

describe('_buildTagOutline', () => {
  it('maps roles + nests headings by level, flags a skipped level', () => {
    const o = buildTagOutline('<html><body><h1>Title</h1><p>intro</p><h3>Sub</h3></body></html>');
    expect(o.map(n => n.role)).toEqual(['H1', 'P', 'H3']);
    expect(o[0].indent).toBe(0);
    expect(o[2].indent).toBe(2);
    expect(o[2].warnings.join(' ')).toMatch(/Skipped heading/);
  });

  it('flags an image with no alt and a figure with no alt/caption', () => {
    const o = buildTagOutline('<html><body><img src="x"><figure><img src="y"></figure></body></html>');
    expect(o.every(n => n.warnings.some(w => /alt/i.test(w)))).toBe(true);
    expect(o.find(n => n.role === 'Figure')).toBeTruthy();
  });

  it('does NOT flag a figure that has alt or a caption', () => {
    const o = buildTagOutline('<html><body><figure><img alt="a chart"></figure><figure><figcaption>Caption</figcaption></figure></body></html>');
    expect(o.every(n => n.warnings.length === 0)).toBe(true);
  });

  it('flags a table with no <th>, and th missing scope', () => {
    const noTh = buildTagOutline('<html><body><table><tr><td>a</td></tr></table></body></html>');
    expect(noTh.find(n => n.role === 'Table').warnings.join(' ')).toMatch(/header cells/i);
    const noScope = buildTagOutline('<html><body><table><tr><th>H</th></tr><tr><td>a</td></tr></table></body></html>');
    expect(noScope.find(n => n.role === 'Table').warnings.join(' ')).toMatch(/scope/i);
  });

  it('summarizes containers as ONE node (no double-surfacing of img-in-figure or li-in-ul)', () => {
    const o = buildTagOutline('<html><body><ul><li>one</li><li>two</li></ul><figure><img alt="z"></figure></body></html>');
    expect(o.length).toBe(2);                       // the <ul> and the <figure>, not their children
    expect(o[0].role).toBe('L');
    expect(o[0].text).toMatch(/2 item/);
    expect(o[1].role).toBe('Figure');
  });

  it('returns [] for empty/garbage input', () => {
    expect(buildTagOutline('')).toEqual([]);
    expect(buildTagOutline(null)).toEqual([]);
  });
});
