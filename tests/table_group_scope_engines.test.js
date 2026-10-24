// Merged group headers (1954 Form 1040 Schedule I, keyless run 2026-10-19). The table prompt asks for
// scope:"colgroup" on a header spanning a group of columns; the emitter wrote <th scope="colgroup">,
// which IBM Equal Access fails (table_headers_related) with or without <colgroup> elements, and the
// fix gate refused every repair as a table-semantics change. A colspan'd scope="col" header covers
// its columns and passes. Runs the REAL emitter (sliced from the source) and IBM's engine in Chromium.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { sliceBetween } from './helpers/anchored_slice.js';

const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const emit = new Function(sliceBetween(SRC, 'function _emitAccessibleTableHtml(grid, opts) {', '// ── #G (2026-07-05): table-cell rich text', { file: 'doc_pipeline_source.jsx' }) + '\nreturn _emitAccessibleTableHtml;')();
const ACE = resolve(process.cwd(), 'node_modules/accessibility-checker-engine/ace.js');
const H = (text, scope, extra) => ({ text, isHeader: true, scope, ...(extra || {}) });
const D = (text) => ({ text, isHeader: false });
const GRID = { caption: 'Schedule I. Payments by line', rows: [
  { cells: [H('Line', 'col', { rowspan: 2 }), H('Payments', 'colgroup', { colspan: 2 })] },
  { cells: [H('Amount', 'col'), H('Date', 'col')] },
  { cells: [H('1', 'row'), D('10'), D('Jan')] },
  { cells: [H('2', 'row'), D('20'), D('Feb')] },
] };

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { await browser?.close(); });

describe('merged group headers', () => {
  it('are emitted as scope="col" / "row" with their spans', () => {
    const html = emit(GRID, {});
    expect(html).toContain('<th scope="col" colspan="2"');
    expect(html).not.toContain('colgroup');
    const rowGroup = emit({ caption: 'c', rows: [{ cells: [H('Group', 'rowgroup', { rowspan: 2 }), D('a')] }, { cells: [D('b')] }] }, {});
    expect(rowGroup).toContain('<th scope="row" rowspan="2"');
  });
  it('pass IBM Equal Access (no table_headers_related failure)', async () => {
    const tab = await browser.newPage();
    try {
      await tab.setContent('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body><main><h1>t</h1>' + emit(GRID, {}) + '</main></body></html>');
      await tab.addScriptTag({ path: ACE });
      const fails = await tab.evaluate(async () => (await new window.ace.Checker().check(document, ['WCAG_2_2'])).results
        .filter((r) => r.value[0] === 'VIOLATION' && r.value[1] === 'FAIL').map((r) => r.ruleId));
      expect(fails).toEqual([]);
    } finally { await tab.close(); }
  }, 90000);
});
