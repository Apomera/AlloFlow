// Structural fidelity nets (2026-06-18). The doc-wide char-COVERAGE gate measures bulk text and
// barely moves for a single dropped table or one refusal sentence. These nets catch those:
//  #2 refusal/meta text leaked into the shipped output, #3 collapsed/lost tables, #4 dropped links.
// All WARN-level (feed the content-fidelity concern + diagnostics log, never block). Pure helpers,
// so we exercise them directly; the pipeline wiring + UI surfacing are pinned by source assertion.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const s = src.indexOf('function _detectRefusalText');
const e = src.indexOf('\n// Sanitize an AI-parsed', s);
if (s === -1 || e === -1) throw new Error('extraction markers for fidelity-net helpers missing');
const { _detectRefusalText, _computeStructuralFidelityNotes } =
  new Function(src.slice(s, e) + '\n; return { _detectRefusalText, _computeStructuralFidelityNotes };')();

describe('#2 _detectRefusalText — flags AI meta/refusal that must never ship inside a document', () => {
  it('catches strong refusal phrases', () => {
    expect(_detectRefusalText("<p>I'm sorry, but I can't help with that request.</p>")).toBeTruthy();
    expect(_detectRefusalText('<p>As an AI language model, I cannot do this.</p>')).toBeTruthy();
    expect(_detectRefusalText('<div>I cannot fulfill this request.</div>')).toBeTruthy();
  });
  it('catches meta-commentary preambles', () => {
    expect(_detectRefusalText('<p>Here is the accessible version of the document:</p><h1>Title</h1>')).toBeTruthy();
    expect(_detectRefusalText('<p>Sure! Here is the rewritten content.</p>')).toBeTruthy();
  });
  it('does NOT false-positive on ordinary document prose', () => {
    expect(_detectRefusalText('<h1>Interview Skills</h1><p>I cannot stress enough how important preparation is.</p>')).toBeNull();
    expect(_detectRefusalText('<p>The committee will help students who cannot attend in person.</p>')).toBeNull();
    expect(_detectRefusalText('<p>An overview of artificial intelligence and its history.</p>')).toBeNull();
    expect(_detectRefusalText('')).toBeNull();
  });
});

describe('#4 link preservation + #3 table preservation', () => {
  const md = (links, tables) => {
    let s = '# Doc\n\n';
    for (let i = 0; i < links; i++) s += `See [link ${i}](https://example.com/${i}) here.\n\n`;
    for (let i = 0; i < tables; i++) s += `| A | B |\n| --- | --- |\n| 1 | 2 |\n\n`;
    return s;
  };
  it('#4 flags a meaningful drop in hyperlinks (source markdown vs output anchors)', () => {
    const notes = _computeStructuralFidelityNotes(md(5, 0), '<p><a href="x">link 0</a></p>');
    expect(notes.find((n) => n.kind === 'links')).toBeTruthy();
  });
  it('#4 does NOT fire when links are preserved', () => {
    const out = '<p>' + Array.from({ length: 5 }, (_, i) => `<a href="https://example.com/${i}">link ${i}</a>`).join(' ') + '</p>';
    expect(_computeStructuralFidelityNotes(md(5, 0), out).find((n) => n.kind === 'links')).toBeFalsy();
  });
  it('#4 ignores image syntax ![alt](src) — only real links count', () => {
    const notes = _computeStructuralFidelityNotes('![a](x.png)\n\n![b](y.png)\n\n![c](z.png)', '<p>no links</p>');
    expect(notes.find((n) => n.kind === 'links')).toBeFalsy();
  });
  it('#3 flags a lost table (markdown source had one, output has none)', () => {
    const notes = _computeStructuralFidelityNotes(md(0, 2), '<h1>Doc</h1><p>tables got flattened</p>');
    expect(notes.find((n) => n.kind === 'tables')).toBeTruthy();
  });
  it('#3 does NOT fire when tables are preserved', () => {
    expect(_computeStructuralFidelityNotes(md(0, 1), '<table><tr><td>1</td></tr></table>').find((n) => n.kind === 'tables')).toBeFalsy();
  });
  it('#3 cell-level: a table that SURVIVED but lost most of its rows/cells is flagged', () => {
    // source: one 3-col table with 5 body rows (~18 cells); output: table present but only 2 cells
    let s = '# Doc\n\n| A | B | C |\n| --- | --- | --- |\n';
    for (let i = 0; i < 5; i++) s += `| ${i}a | ${i}b | ${i}c |\n`;
    const notes = _computeStructuralFidelityNotes(s, '<table><tr><td>0a</td><td>0b</td></tr></table>');
    expect(notes.find((n) => n.kind === 'tables' && /cell/.test(n.msg))).toBeTruthy();
  });
  it('#3 cell-level does NOT fire when the full table carried over', () => {
    let s = '# Doc\n\n| A | B | C |\n| --- | --- | --- |\n';
    let out = '<table><thead><tr><th>A</th><th>B</th><th>C</th></tr></thead><tbody>';
    for (let i = 0; i < 5; i++) { s += `| ${i}a | ${i}b | ${i}c |\n`; out += `<tr><td>${i}a</td><td>${i}b</td><td>${i}c</td></tr>`; }
    out += '</tbody></table>';
    expect(_computeStructuralFidelityNotes(s, out).find((n) => n.kind === 'tables')).toBeFalsy();
  });
  it('clean document produces no notes', () => {
    expect(_computeStructuralFidelityNotes('# Title\n\nJust prose, no links or tables.', '<h1>Title</h1><p>Just prose, no links or tables.</p>')).toEqual([]);
  });
});

describe('pipeline + UI wiring (source-pinned)', () => {
  it('the pipeline runs the structural nets and folds them into the content-fidelity concern', () => {
    expect(src).toContain('_structuralFidelityNotes = _computeStructuralFidelityNotes((extractedText || \'\').replace(_ALLO_MARKER_RE, \'\'), accessibleHtml);');
    expect(src).toContain('const _contentFidelityConcern = !!integrityWarning || _structuralFidelityNotes.length > 0;');
  });
  it('the result carries fidelityNotes + the #1 fidelityLimited score qualifier', () => {
    expect(src).toContain('fidelityNotes: _structuralFidelityNotes,');
    expect(src).toContain('fidelityLimited: (integrityCoverage != null && integrityCoverage < 90) || _structuralFidelityNotes.length > 0,');
  });
  it('the view shows the score qualifier chip + the per-note list', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain('pdfFixResult.fidelityLimited');
    expect(view).toContain('pdfFixResult.fidelityNotes.map');
  });
  it('#5 content-fidelity download gate — conservative <80% / refusal threshold, opt-in (never hard-block)', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    // gates the tagged-PDF download on a SEVERE shortfall or a refusal
    expect(view).toContain('pdfFixResult.integrityCoverage < 80');
    expect(view).toContain("n.kind === 'refusal'");
    expect(view).toContain('setFidelityGateIssue(_why)');
    // bytes wait in a ref; the panel offers Review-the-Diff + Download-anyway (opt-in, not a block)
    expect(view).toContain('_fidelityGateBytesRef.current = {');
    expect(view).toContain('setDiffViewOpen(true)');
    expect(view).toMatch(/Download anyway/);
  });
});
