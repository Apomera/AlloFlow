// _alloStripPageLabels (2026-11-09): short documents get one structure pass with no per-chunk page evidence, so the
// page-furniture pass does not run and the garden newsletter scan kept its printed "Page 1" as a paragraph. Only an
// explicit page label whose number is a page of the run is removed. Runs the REAL function, sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const strip = new Function(sliceBetween(SRC, 'var _alloStripPageLabels = function', '\n};', { file: 'doc_pipeline_source.jsx' }) + '\n};\nreturn _alloStripPageLabels;')();
const p = (text) => ({ type: 'p', text });

describe('_alloStripPageLabels', () => {
  it('removes the garden scan\'s printed "Page 1" and says what it removed', () => {
    const blocks = [{ type: 'h1', text: 'Maple Street School Garden' }, p('Questions? Contact Ms. Okafor in room 112.'), p('Page 1')];
    const r = strip(blocks, 1, 1);
    expect(r.blocks.map((b) => b.text)).toEqual(['Maple Street School Garden', 'Questions? Contact Ms. Okafor in room 112.']);
    expect(r.removed).toEqual([{ kind: 'page number', text: 'Page 1' }]);
    expect(r.numbers).toEqual(['1']);
  });
  it('knows "Page N of M" and a few other languages and digit scripts', () => {
    const r = strip([p('Page 2 of 3'), p('Página 1'), p('Seite 3'), p('صفحة ٢'), p('<strong>Page 3</strong>')], 1, 3);
    expect(r.blocks).toEqual([]);
    expect(r.numbers).toEqual(['2', '1', '3', '2', '3']);
  });
  it('keeps a page number outside the run, a bare number, a longer sentence, a heading and a link', () => {
    const blocks = [p('Page 9'), p('3'), p('Turn to page 2 for the map.'), p('Page 2: Planting guide'), { type: 'h2', text: 'Page 1' }, p('<a href="#p2">Page 2</a>')];
    expect(strip(blocks, 1, 3).blocks).toBe(blocks);
    expect(strip(blocks, 1, 3).removed).toEqual([]);
  });
  it('counts a page range: pages 12 to 15 of a longer document', () => {
    expect(strip([p('Page 13'), p('Page 2')], 12, 15).blocks.map((b) => b.text)).toEqual(['Page 2']);
  });
  it('the short-document path uses it and records what it removed for the report', () => {
    expect(SRC).toContain('const _pl = _alloStripPageLabels(_legendRepairedBlocks, _sdFirst, _sdFirst + pageCount - 1);');
    expect(SRC).toContain('window.__alloPageFurniture = _pl.removed.length ? { removed: _pl.removed, numbers: _pl.numbers, joined: 0 } : null;');
  });
});
