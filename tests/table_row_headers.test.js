// Row headers on structure-block tables (1954 Form 1040 scan, keyless run 2026-10-19). The flat
// headers/rows table rendered every body cell as <td>, so "Line 1 ... Line 9" label columns were
// announced as data and a screen reader never paired an amount with its line. The structure prompt
// now offers "rowHeaders": true; the renderer turns each body row's first cell into <th scope="row">.
// Runs the BUILT renderer module and IBM Equal Access in Chromium.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { loadAlloModule } from './setup.js';

loadAlloModule('doc_builder_renderer_module.js');
const render = window.AlloModules.DocBuilderRenderer.createRenderer({
  docStyle: { headingColor: '#0f172a', textColor: '#1e293b', accentColor: '#2563eb', bgColor: '#ffffff', tableBg: '#e2e8f0', tableBorder: '#475569' },
  _accessibleHeaderColors: () => null,
  _alloCellRichText: (value, escape) => escape(value),
  _emitAccessibleTableHtml: () => '<table></table>',
  _pipeLog: () => {},
  _sanitizeRawHtmlBlock: (html) => String(html || ''),
  _validateTableGrid: () => ({ ok: false }),
  renderWordArtHtml: (text) => '<span>' + text + '</span>',
  warnLog: () => {},
});
const SRC = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const ACE = resolve(process.cwd(), 'node_modules/accessibility-checker-engine/ace.js');
const TABLE = { type: 'table', caption: 'Income', headers: ['Line', 'Item', 'Amount'],
  rows: [['1', 'Wages', '$4,200'], ['2', 'Dividends', '$85'], ['', 'Subtotal', '$4,285']] };
const cells = (html, tag) => (html.match(new RegExp('<' + tag + '[\\s>]', 'g')) || []).length;

let browser;
beforeAll(async () => { browser = await chromium.launch({ headless: true }); }, 60000);
afterAll(async () => { await browser?.close(); }, 60000);

describe('structure-block table row headers', () => {
  it('rowHeaders:true makes the first cell of each body row a scope="row" header', () => {
    const html = render([{ ...TABLE, rowHeaders: true }]);
    expect(html).toContain('<th scope="row"');
    expect(html.includes('>1</th>') && html.includes('>2</th>'), html).toBe(true);
    expect(html.includes('>Wages</td>') && html.includes('>$4,200</td>'), html).toBe(true);
    // 3 column headers + 2 row headers; the empty first cell of the subtotal row stays a <td>.
    expect(cells(html, 'th')).toBe(5);
    expect(cells(html, 'td')).toBe(7);
  });
  it('without the flag every body cell is still a <td>', () => {
    const html = render([TABLE]);
    expect(html).not.toContain('scope="row"');
    expect(cells(html, 'th')).toBe(3);
    expect(cells(html, 'td')).toBe(9);
  });
  it('only a literal true turns it on, and a one-cell row is never a header', () => {
    expect(render([{ ...TABLE, rowHeaders: 'true' }])).not.toContain('scope="row"');
    expect(render([{ type: 'table', caption: 'c', headers: ['Note'], rows: [['Only cell']], rowHeaders: true }])).not.toContain('scope="row"');
  });
  it('row-header cell text is escaped like every other cell', () => {
    const html = render([{ ...TABLE, rows: [['<img src=x onerror=alert(1)>', 'a', 'b']], rowHeaders: true }]);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
  it('both structure prompts offer the flag', () => {
    expect(SRC.includes('Add "rowHeaders":true ONLY when the first cell of every body row is a label naming that row')).toBe(true);
    expect(SRC.includes('(add "rowHeaders":true only when each row\'s first cell labels that row)')).toBe(true);
  });
  it('passes IBM Equal Access with row headers', async () => {
    const tab = await browser.newPage();
    try {
      await tab.setContent('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>t</title></head><body><main><h1>t</h1>' + render([{ ...TABLE, rowHeaders: true }]) + '</main></body></html>');
      await tab.addScriptTag({ path: ACE });
      const fails = await tab.evaluate(async () => (await new window.ace.Checker().check(document, ['WCAG_2_2'])).results
        .filter((r) => r.value[0] === 'VIOLATION' && r.value[1] === 'FAIL').map((r) => r.ruleId));
      expect(fails).toEqual([]);
    } finally { await tab.close(); }
  }, 90000);
});
