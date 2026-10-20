// Pictures inside table cells and list items reach the Office/DAISY exports (2026-10-20).
//
// inlineRuns had no <img> case, so the default glossary export (a table with a
// picture column) reached Word with every picture gone and no placeholder; list
// items holding only a picture vanished. The spec builder and the Word builder
// run from the source the module is built from; the docx library is a recorder.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const src = readFileSync('view_pdf_audit_source.jsx', 'utf8');
const specRegion = sliceBetween(src, 'function _htmlToDocxSpec(html) {', '\n// _buildDocxBlobFromSpec:', { file: 'view_pdf_audit_source.jsx' });
const builderRegion = sliceBetween(src, 'async function _buildDocxBlobFromSpec(spec, d, mode) {', '\nfunction _ensurePdfHarper() {', { file: 'view_pdf_audit_source.jsx' });
const api = new Function(specRegion + '\n' + builderRegion + '\nreturn { _htmlToDocxSpec, _odtRuns, _expDtbookRuns, _buildDocxBlobFromSpec };')();

// A 2x2 PNG.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR4nGP4z8DwnwEJMMJ5AFn/A/xhFh+yAAAAAElFTkSuQmCC';
const glossaryTable = `<table><thead><tr><th>Term</th><th>Picture</th></tr></thead><tbody>
  <tr><td>Leaf</td><td><img src="${PNG}" alt="A green leaf"></td></tr>
  <tr><td>Root</td><td><img src="https://example.org/root.svg" alt="A root"></td></tr>
  <tr><td>Stem</td><td><img src="https://example.org/line.svg" alt=""></td></tr>
</tbody></table><ul><li><img src="${PNG}" alt="Seed"></li></ul>`;

function recordingDocx() {
  const made = [];
  const fake = (name) => new Proxy(function () {}, {
    construct(_t, args) { const r = { __type: name, opts: args[0] }; made.push(r); return r; },
    apply() { return 0; },
    get(_t, prop) { return typeof prop === 'symbol' || prop === 'prototype' ? undefined : name + '.' + String(prop); },
  });
  const d = new Proxy({}, { get(_t, prop) {
    if (prop === 'Packer') return { toBlob: async (doc) => ({ doc }), toBuffer: async () => new Uint8Array(0) };
    return typeof prop === 'symbol' ? undefined : fake(String(prop));
  } });
  return { d, made };
}
const cellsOf = (spec) => spec.blocks.find((b) => b.type === 'table').rows.slice(1).map((row) => row.cells[1].runs);

describe('pictures inside table cells and list items', () => {
  it('the spec keeps each informative picture as an image run; a decorative remote one is dropped', () => {
    const spec = api._htmlToDocxSpec(glossaryTable);
    const [leaf, root, stem] = cellsOf(spec);
    expect(leaf.find((r) => r.img)?.img).toMatchObject({ src: PNG, alt: 'A green leaf' });
    expect(root.find((r) => r.img)?.img).toMatchObject({ src: null, alt: 'A root' });
    expect(stem.some((r) => r.img), 'decorative remote picture').toBe(false);
    const list = spec.blocks.find((b) => b.type === 'list');
    expect(list?.items?.[0]?.runs?.[0]?.img?.alt, 'a list item holding only a picture').toBe('Seed');
  });

  it('Word gets an embedded, cell-sized picture with its alt text, and the alt text when it cannot embed', async () => {
    const { d, made } = recordingDocx();
    await api._buildDocxBlobFromSpec(api._htmlToDocxSpec(glossaryTable), d, {});
    const images = made.filter((r) => r.__type === 'ImageRun');
    expect(images.map((r) => r.opts.altText.description)).toEqual(['A green leaf', 'Seed']);
    expect(images.every((r) => r.opts.transformation.width <= 160 && r.opts.transformation.width > 0)).toBe(true);
    const texts = made.filter((r) => r.__type === 'TextRun').map((r) => r.opts && r.opts.text);
    expect(texts.includes('[Image: A root]'), 'placeholder for a picture Word cannot embed').toBe(true);
  });

  it('ODT and DAISY keep the alt text where the picture was', () => {
    const runs = [{ text: 'Leaf ' }, { img: { src: PNG, alt: 'A green leaf' } }, { img: { src: null, alt: '' } }];
    expect(api._odtRuns(runs, {})).toContain('[Image: A green leaf]');
    expect(api._expDtbookRuns(runs)).toContain('[Image: A green leaf]');
    expect(api._odtRuns([{ img: { src: null, alt: '' } }], {})).toBe('');
  });
});
