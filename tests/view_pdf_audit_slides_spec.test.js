// Golden tests for _docxSpecToSlides — the pure chunker behind the accessible
// "📽 PowerPoint (.pptx)" export (2026-06-09). Runtime-extracted from
// view_pdf_audit_source.jsx (anti-drift pattern; markers
// `function _docxSpecToSlides(spec) {` … `// end _docxSpecToSlides`).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const start = src.indexOf('function _docxSpecToSlides(spec) {');
const end = src.indexOf('// end _docxSpecToSlides', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _docxSpecToSlides missing');
const _docxSpecToSlides = new Function(src.slice(start, end) + '; return _docxSpecToSlides;')();

const R = (text) => [{ text }];

describe('view_pdf_audit · _docxSpecToSlides (accessible PowerPoint export)', () => {
  it('h1/h2 start titled slides; h3+ become in-slide subheads', () => {
    const deck = _docxSpecToSlides({ title: 'Doc', lang: 'en', blocks: [
      { type: 'heading', level: 1, runs: R('First Section') },
      { type: 'paragraph', runs: R('Body one.') },
      { type: 'heading', level: 3, runs: R('Minor point') },
      { type: 'heading', level: 2, runs: R('Second Section') },
      { type: 'paragraph', runs: R('Body two.') },
    ] });
    expect(deck.slides.length).toBe(2);
    expect(deck.slides[0].title).toBe('First Section');
    expect(deck.slides[1].title).toBe('Second Section');
    expect(deck.slides[0].items.find(i => i.kind === 'subhead').text).toBe('Minor point');
    expect(deck.counts.titled).toBe(2);
  });

  it('content before any heading gets a slide titled from the doc title', () => {
    const deck = _docxSpecToSlides({ title: 'My Document', lang: 'en', blocks: [
      { type: 'paragraph', runs: R('Orphan intro paragraph.') },
    ] });
    expect(deck.slides.length).toBe(1);
    expect(deck.slides[0].title).toBe('My Document');
  });

  it('lists keep bullet kind + nesting level; tables keep header rows', () => {
    const deck = _docxSpecToSlides({ title: 'Doc', lang: 'en', blocks: [
      { type: 'heading', level: 1, runs: R('T') },
      { type: 'list', ordered: false, items: [ { runs: R('top'), level: 0 }, { runs: R('nested'), level: 1 } ] },
      { type: 'table', rows: [ { header: true, cells: [{ runs: R('H') }] }, { header: false, cells: [{ runs: R('d') }] } ] },
    ] });
    const items = deck.slides[0].items;
    expect(items.filter(i => i.kind === 'bullet').map(i => i.level)).toEqual([0, 1]);
    const tbl = items.find(i => i.kind === 'table');
    expect(tbl.rows[0].header).toBe(true);
    expect(tbl.rows[1].cells[0]).toEqual({ text: 'd', colSpan: 1, rowSpan: 1 });
    expect(deck.counts.bullets).toBe(2);
    expect(deck.counts.tables).toBe(1);
  });

  it('images carry src/alt through; counts tally', () => {
    const deck = _docxSpecToSlides({ title: 'Doc', lang: 'en', blocks: [
      { type: 'heading', level: 1, runs: R('T') },
      { type: 'image', src: 'data:image/png;base64,AAAA', alt: 'A chart' },
      { type: 'image', src: null, alt: 'Remote image' },
    ] });
    // two 8-line images exceed one slide's budget — collect across the deck
    const imgs = deck.slides.flatMap(s => s.items).filter(i => i.kind === 'image');
    expect(imgs[0].src).toMatch(/^data:image\//);
    expect(imgs[0].alt).toBe('A chart');
    expect(imgs[1].src).toBe(null);
    expect(deck.counts.images).toBe(2);
  });

  it('long content overflows onto "(cont.)" slides — nothing dropped', () => {
    const blocks = [{ type: 'heading', level: 1, runs: R('Big Section') }];
    for (let i = 0; i < 20; i++) blocks.push({ type: 'list', ordered: false, items: [{ runs: R('bullet line ' + i), level: 0 }] });
    const deck = _docxSpecToSlides({ title: 'Doc', lang: 'en', blocks });
    expect(deck.slides.length).toBeGreaterThan(1);
    expect(deck.slides[1].title).toBe('Big Section (cont.)');
    const total = deck.slides.reduce((n, s) => n + s.items.filter(i => i.kind === 'bullet').length, 0);
    expect(total).toBe(20);
    // repeated overflow must not stack "(cont.) (cont.)"
    for (const s of deck.slides) expect(s.title).not.toMatch(/\(cont\.\) \(cont\.\)/);
  });

  it('empty runs produce no items; empty headings start no slide', () => {
    const deck = _docxSpecToSlides({ title: 'Doc', lang: 'en', blocks: [
      { type: 'heading', level: 1, runs: R('  ') },
      { type: 'paragraph', runs: R('   ') },
    ] });
    expect(deck.slides.length).toBe(0);
  });
  it('splits a single oversized paragraph so no slide exceeds the line budget', () => {
    const original = 'x'.repeat(2100);
    const deck = _docxSpecToSlides({ title: 'Doc', lang: 'en', blocks: [
      { type: 'heading', level: 1, runs: R('Long section') },
      { type: 'paragraph', runs: R(original) },
    ] });
    expect(deck.slides.length).toBeGreaterThan(2);
    expect(deck.slides.every((slide) => slide.lineEst <= 13)).toBe(true);
    expect(deck.slides.flatMap((slide) => slide.items).filter((item) => item.kind === 'text').map((item) => item.text).join('')).toBe(original);
  });

  it('paginates large tables, repeats header rows, and keeps the logical table count', () => {
    const rows = [{ header: true, cells: [{ runs: R('Name') }, { runs: R('Description') }] }];
    for (let i = 0; i < 24; i++) rows.push({ header: false, cells: [{ runs: R('Row ' + i) }, { runs: R('Detail ' + i) }] });
    const deck = _docxSpecToSlides({ title: 'Doc', lang: 'en', blocks: [
      { type: 'heading', level: 1, runs: R('Data') },
      { type: 'table', rows },
    ] });
    const tables = deck.slides.flatMap((slide) => slide.items).filter((item) => item.kind === 'table');
    expect(tables.length).toBeGreaterThan(1);
    expect(tables.every((table) => table.rows[0].header)).toBe(true);
    expect(tables.flatMap((table, index) => table.rows.slice(index ? 1 : 0)).filter((row) => !row.header)).toHaveLength(24);
    expect(deck.counts.tables).toBe(1);
    expect(deck.slides.every((slide) => slide.lineEst <= 13)).toBe(true);
  });

  it('propagates RTL into the deck consumed by the renderer', () => {
    const deck = _docxSpecToSlides({ title: '?????', lang: 'ar', rtl: true, blocks: [
      { type: 'paragraph', runs: R('?? ??????') },
    ] });
    expect(deck.rtl).toBe(true);
    expect(deck.lang).toBe('ar');
  });

});
