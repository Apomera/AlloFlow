// Table-refinement slice 2 (2026-06-17): an in-preview "🔧 Refine table" affordance so a teacher can
// fix a table IN PLACE instead of typing into the Workbench. Runs in the PARENT context over the
// iframe's idoc, so it REUSES slice-1's string tools + readback (no logic duplication). Controls carry
// class 'allo-img-controls' so the same snapshot/export strip that removes the resize handles removes
// these (never saved into the document). Purely additive + reversible: snapshot before the first op;
// Keep syncs via __alloflowOnPdfPreviewMutated, Undo restores the snapshot. Iframe-injected UI (cross-
// frame DOM + event handlers) → assert the wiring + safety invariants; the underlying ops are covered
// functionally in slice 1.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const i = src.indexOf('const _attachPreviewTableRefiner = (idoc) => {');
const body = src.slice(i, i + 4600);

describe('#slice2 in-preview Refine-table affordance', () => {
  it('exists and is attached on preview load right after the image resizer', () => {
    expect(i).toBeGreaterThan(-1);
    expect(src).toContain('const _attachPreviewTableRefiner = (idoc) => {');
    expect(src).toContain('_attachPreviewImageResizer(doc);\n      _attachPreviewTableRefiner(doc);');
  });

  it('REUSES slice-1 string tools + readback (no duplicated table logic)', () => {
    expect(src).toContain('reg.fix_table_header_row.fn(wrapped, { index: 0 })');
    expect(src).toContain('reg.fix_table_header_col.fn(wrapped, { index: 0 })');
    expect(src).toContain('reg.fix_table_caption.fn(wrapped, { index: 0, caption: arg || \'Table\' })');
    expect(src).toContain('reg.fix_table_mark_layout.fn(wrapped, { index: 0 })');
    expect(src).toContain('readback: _tableSemanticReadback(out, 0)');
  });

  it('its controls are stripped from saved/exported HTML (classed allo-img-controls + style id in both strip lists)', () => {
    expect(src).toContain("btn.className = 'allo-img-controls allo-table-refine-btn'");
    expect(src).toContain("pop.className = 'allo-img-controls allo-table-refine-pop'");
    // the <style> id is added to BOTH the snapshot-sync and export strip selectors
    expect((src.match(/#allo-img-resize-style, #allo-table-refine-style'\)\.forEach\(\(el\) => el\.remove\(\)\)/g) || []).length).toBe(2);
  });

  it('is additive + reversible: snapshot before the first op, Keep syncs, Undo restores', () => {
    expect(src).toContain('if (_snapshot == null) _snapshot = _cur.outerHTML;'); // snapshot the ORIGINAL once
    expect(src).toContain('keep.onclick'); expect(src).toContain('notify(); closePop();'); // Keep → sync
    expect(src).toContain('w.parent.__alloflowOnPdfPreviewMutated'); // the sync bridge
    expect(src).toContain('undo.onclick'); expect(src).toContain('if (orig) _cur.replaceWith(orig)'); // Undo → restore
  });

  it('adds one Refine button per table + shows the semantic readback before Keep/Undo', () => {
    expect(src).toContain("btn.textContent = '🔧 Refine table'");
    expect(src).toContain('const tables = idoc.querySelectorAll(\'table\');');
    expect(src).toContain("let _ctxt = '📊 ' + res.readback.text");
    expect(src).toContain("res.readback.kind === 'layout' ? '#b91c1c' : '#3730a3'"); // layout = red warning
  });
});
