import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = source.indexOf('function _htmlToDocxSpec(html) {');
const end = source.indexOf('\n// _buildDocxBlobFromSpec:', start);
if (start === -1 || end === -1) throw new Error('office semantic helper extraction markers missing');
const helpers = new Function(
  source.slice(start, end) + '; return { spec: _htmlToDocxSpec, odt: _htmlToOdtContentXml, dtbook: _htmlToDtbookXml };'
)();

const wrap = (body) => '<!doctype html><html lang="en"><head><title>Fixture</title></head><body>' + body + '</body></html>';
const parseXml = (xml) => {
  const doc = new DOMParser().parseFromString(xml.replace(/<!DOCTYPE[^>]*>/, ''), 'application/xml');
  const error = doc.querySelector('parsererror');
  return { doc, wellFormed: !error, error: error && error.textContent };
};

describe('shared office semantic fidelity', () => {
  const richHtml = wrap(
    '<p>English <span lang="es-MX">hola <code>const x = 1</code></span> <mark>important</mark> <del>obsolete</del></p>' +
    '<pre>fixed  spacing</pre>'
  );

  it('carries authored language, code, highlight, deletion, and preformatted metadata in the shared model', () => {
    const spec = helpers.spec(richHtml);
    const runs = spec.blocks.flatMap((block) => block.runs || []);
    expect(runs.find((run) => /hola/.test(run.text))).toMatchObject({ lang: 'es-MX' });
    expect(runs.find((run) => /const x/.test(run.text))).toMatchObject({ lang: 'es-MX', code: true });
    expect(runs.find((run) => /important/.test(run.text))).toMatchObject({ highlight: true });
    expect(runs.find((run) => /obsolete/.test(run.text))).toMatchObject({ strike: true });
    expect(runs.find((run) => /fixed spacing/.test(run.text))).toMatchObject({ code: true });
  });

  it('serializes those runs into well-formed ODT and DAISY markup', () => {
    const odt = helpers.odt(richHtml);
    expect(parseXml(odt).wellFormed).toBe(true);
    expect(odt).toContain('style:name="T_Lang_es_MX"');
    expect(odt).toContain('fo:language="es" fo:country="MX"');
    expect(odt).toContain('text:style-name="T_Code"');
    expect(odt).toContain('text:style-name="T_Highlight"');
    expect(odt).toContain('text:style-name="T_Strike"');

    const dtbook = helpers.dtbook(richHtml, 'en');
    expect(parseXml(dtbook).wellFormed).toBe(true);
    expect(dtbook).toContain('<span xml:lang="es-MX">');
    expect(dtbook).toContain('<code>const x = 1</code>');
  });

  it('retains cell scope and emits ODF native header rows plus header columns', () => {
    const html = wrap(
      '<table><tr><th scope="col">Person</th><th scope="col">Score</th></tr>' +
      '<tr><th scope="row">Alice</th><td>90</td></tr><tr><th scope="row">Bob</th><td>82</td></tr></table>'
    );
    const table = helpers.spec(html).blocks.find((block) => block.type === 'table');
    expect(table.rows[0].cells[0]).toMatchObject({ header: true, scope: 'col' });
    expect(table.rows[1].cells[0]).toMatchObject({ header: true, scope: 'row' });

    const odt = helpers.odt(html);
    expect(parseXml(odt).wellFormed).toBe(true);
    expect(odt).toContain('<table:table-header-rows>');
    expect(odt).toContain('<table:table-header-columns><table:table-column table:number-columns-repeated="1"/></table:table-header-columns>');
    expect((odt.match(/table:style-name="TableHeaderCell"/g) || []).length).toBe(4);
  });

  it('threads individual header cells and rich runs into DOCX/PPTX builders', () => {
    expect(source).toContain('language: r.lang ? { value: r.lang } : undefined');
    expect(source).toContain('strike: !!r.strike');
    expect(source).toContain("font: r.code ? 'Courier New' : undefined");
    expect(source).toContain('runsTo(c.header ? c.runs.map');
    expect(source).toContain('header: !!c.header, scope: c.scope ||');
    expect(source).toContain('(r.header || (c && c.header))');
  });
});
