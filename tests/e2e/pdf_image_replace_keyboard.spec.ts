// The image toolbar's Replace control ships inside remediated HTML (inline Replace still works in the
// raw MCP file), so it must work from the keyboard (WCAG 2.1.1). A file input hidden with display:none
// left it unreachable; a label given role="button" failed IBM Equal Access (aria_role_valid,
// input_label_exists). The input is now visually hidden but focusable, named by its label, and the label
// shows the focus ring. This renders the REAL template and base stylesheet sliced from the source.
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../../doc_pipeline_source.jsx'), 'utf8');
const sliceBetween = (start: string, end: string) => {
  const a = SRC.indexOf(start);
  if (a < 0) throw new Error('start marker not found: ' + start);
  const b = SRC.indexOf(end, a + start.length);
  if (b < 0) throw new Error('end marker not found: ' + end);
  return SRC.slice(a, b + end.length);
};
const LABEL_TPL = sliceBetween('<label data-alloflow-image-replace="${imgId}"', '</label>');
const BASE_CSS = sliceBetween('figure[data-img-idx] { break-inside: avoid; }', '</style>');
const render = (hasSrc: boolean) => new Function('imgId', 'hasSrc', 'isRegenerated', '_uploadHandler2', 'return `' + LABEL_TPL + '`;')('pdf-img-1', hasSrc, false, '');

for (const hasSrc of [true, false]) {
  test('Replace/Upload control is reachable and operable from the keyboard (' + (hasSrc ? 'Replace' : 'Upload image') + ')', async ({ page }) => {
    await page.setContent('<!doctype html><html lang="en"><head><style>' + BASE_CSS + '</head><body><button id="before">Before</button>' + render(hasSrc) + '</body></html>');
    await page.focus('#before');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const label = el && el.closest('[data-alloflow-image-replace]');
      return { tag: el && el.tagName, type: el && el.getAttribute('type'), inLabel: !!label, name: label ? (label.textContent || '').trim() : '', ring: label ? getComputedStyle(label).boxShadow : '' };
    });
    expect(focused).toMatchObject({ tag: 'INPUT', type: 'file', inLabel: true, name: hasSrc ? 'Replace' : 'Upload image' });
    expect(focused.ring, 'the label shows a focus ring while its input has keyboard focus').toContain('4px');
    const chooser = page.waitForEvent('filechooser', { timeout: 5000 });
    await page.keyboard.press('Space');
    expect(await chooser).toBeTruthy();
  });
}

test('the Replace label carries no ARIA role (role="button" on a label fails IBM Equal Access)', () => {
  expect(render(true)).not.toMatch(/<label[^>]*\srole=/);
});
