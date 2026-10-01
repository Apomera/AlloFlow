import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const source = fs.readFileSync('stem_lab/stem_tool_sourcebook.js', 'utf8');
const box = { console, setTimeout, clearTimeout, window: {} };
vm.runInNewContext(source, box);
const api = box.window.SourcebookProviders;

function sheet(options = {}) {
  const items = Array.from(api.searchCurated('', 'All', 'All')).slice(0, 3).map((item) => ({ ...item }));
  if (options.ccby) items[1].rightsType = 'ccby';
  const prep = { [items[2].id]: { mode: 'tile', tile: 90 } };
  const html = api.buildPrintSheetHtml(items, prep, 'Lesson <sheet>');
  const printed = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://sourcebook.test/',
    beforeParse(win) { win.print = () => printed.push(true); if (options.saved) win.localStorage.setItem('sourcebook-print-options-v1', JSON.stringify(options.saved)); }
  });
  const doc = dom.window.document;
  const field = (name) => doc.getElementById('sb-print-options').elements[name];
  const change = (name, value) => {
    const el = field(name);
    if (el.type === 'checkbox') el.checked = value; else el.value = value;
    el.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  };
  return { dom, doc, field, change, printed, items };
}

describe('Sourcebook print sheet', () => {
  it('opens as a preview with the old full-detail layout and does not print on its own', () => {
    const { doc, field, printed } = sheet();
    expect(printed).toHaveLength(0);
    expect(doc.body.className).toBe('text-full fit-prepared');
    expect(field('size').value).toBe('medium');
    expect(doc.body.style.getPropertyValue('--w')).toBe('3.3in');
    expect(doc.body.style.getPropertyValue('--h')).toBe('2.75in');
    expect(doc.querySelector('h1').textContent).toBe('Lesson <sheet>');
    expect(doc.querySelectorAll('article')).toHaveLength(3);
    doc.getElementById('sb-print-options').dispatchEvent(new doc.defaultView.Event('submit', { cancelable: true }));
    expect(printed).toHaveLength(1);
  });

  it('prints images only and warns on screen when a CC BY credit would be dropped', () => {
    const { doc, change } = sheet({ ccby: true });
    expect(doc.getElementById('sb-credit-warning').hidden).toBe(true);
    change('text', 'none');
    expect(doc.body.classList.contains('text-none')).toBe(true);
    expect(doc.getElementById('sb-credit-warning').hidden).toBe(false);
    expect(doc.getElementById('sb-print-options').classList.contains('screen')).toBe(true);
  });

  it('applies presets, custom sizes, units, fit, and orientation', () => {
    const { doc, field, change } = sheet();
    change('size', 'small');
    expect(doc.body.style.getPropertyValue('--w')).toBe('2in');
    field('width').value = '5';
    change('height', '4');
    expect(field('size').value).toBe('custom');
    expect(doc.body.style.getPropertyValue('--w')).toBe('5in');
    expect(doc.body.style.getPropertyValue('--h')).toBe('4in');
    change('unit', 'cm');
    expect(field('width').value).toBe('12.7');
    change('width', '2.54');
    expect(doc.body.style.getPropertyValue('--w')).toBe('1in');
    change('fit', 'fill');
    expect(doc.body.classList.contains('fit-fill')).toBe(true);
    change('size', 'page');
    change('orient', 'landscape');
    expect(doc.body.classList.contains('one-per-page')).toBe(true);
    expect(doc.body.style.getPropertyValue('--w')).toBe('9.9in');
    expect(doc.getElementById('sb-page-style').textContent).toContain('size:landscape');
  });

  it('swaps to full-resolution files on request and falls back to the preview', () => {
    const { doc, change, items } = sheet();
    const img = doc.querySelector('article img');
    expect(img.getAttribute('src')).toBe(items[0].imageUrl);
    change('hires', true);
    expect(img.getAttribute('src')).toBe(items[0].downloadUrl);
    img.dispatchEvent(new doc.defaultView.Event('error'));
    expect(img.getAttribute('src')).toBe(items[0].imageUrl);
  });

  it('restores saved settings and rejects unknown saved values', () => {
    const { doc, field } = sheet({ saved: { text: 'caption', size: 'custom', unit: 'bogus', fit: 'whole', width: 999, height: 3 } });
    expect(field('text').value).toBe('caption');
    expect(field('unit').value).toBe('in');
    expect(doc.body.className).toBe('text-caption fit-whole');
    expect(doc.body.style.getPropertyValue('--w')).toBe('24in');
    expect(doc.body.style.getPropertyValue('--h')).toBe('3in');
  });
});
