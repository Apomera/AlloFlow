// Behavior Lens printing.
//
// WHY: until 2026-09-23 the print buttons in 18 tools (contract, pocket BIP, home note,
// IEP prep, IEP goals, GAS rubric, BIP, restitution, crisis plan...) called window.print()
// on the whole page. The tool sits in a fixed, scrolling overlay, so Chromium printed the
// visible part of it over the app behind it, and a textarea printed only the lines in its
// box. Measured in Chromium with the same layout: 29 of 150 lines of the tool, all of
// the app behind it, and none of a 40-line note. With blPreparePrint: 150 of 150, no app,
// 40 of 40 (C:/tmp/bl_scratch/print_probe.cjs).
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});
afterEach(() => { document.body.innerHTML = ''; document.head.querySelectorAll('[data-bl-print-style]').forEach(s => s.remove()); });
const src = readFileSync('behavior_lens_module.js', 'utf8');
const P = () => window.AlloModules.BehaviorLensPrint;

function page() {
  document.body.innerHTML = '<div id="host"><div id="app">APP</div><div id="root" class="bl-root"><div id="hdr">HEADER</div>' +
    '<div id="panel" data-bl-panel-content><div id="tool"><p>Tool</p><textarea id="ta"></textarea><input id="inp"><select id="sel"><option>One</option><option>Two</option></select>' +
    '<textarea id="skip" class="print:hidden"></textarea><button id="print">Print</button></div></div></div></div>';
  document.getElementById('ta').value = 'Line 1\nLine 2\nLine 3';
  document.getElementById('inp').value = 'Typed value';
  document.getElementById('sel').selectedIndex = 1;
}

describe('printing the tool panel', () => {
  it('hides everything outside the panel, un-clips its ancestors and prints each field in full', () => {
    page();
    const cleanup = P().blPreparePrint(document.getElementById('panel'));
    const has = (id, attr) => document.getElementById(id).hasAttribute(attr);
    expect(has('panel', 'data-bl-print-root')).toBe(true);
    expect(has('root', 'data-bl-print-path') && has('host', 'data-bl-print-path')).toBe(true);
    expect(has('app', 'data-bl-print-hide') && has('hdr', 'data-bl-print-hide')).toBe(true);
    expect(has('ta', 'data-bl-print-field') && has('inp', 'data-bl-print-field') && has('sel', 'data-bl-print-field')).toBe(true);
    const copies = [...document.querySelectorAll('[data-bl-print-copy]')].map(n => n.textContent);
    expect(copies).toEqual(['Line 1\nLine 2\nLine 3', 'Typed value', 'Two']);          // not the print:hidden one
    expect(document.head.querySelector('[data-bl-print-style]').textContent).toContain('@media print');
    cleanup();
    expect(document.querySelectorAll('[data-bl-print-root],[data-bl-print-path],[data-bl-print-hide],[data-bl-print-field],[data-bl-print-copy],[data-bl-print-style]')).toHaveLength(0);
  });
  it('the print button finds its own panel and cleans up after printing', () => {
    page();
    let printedWith = null;
    const realPrint = window.print;
    window.print = () => { printedWith = document.querySelectorAll('[data-bl-print-copy]').length; };
    try {
      P().blPrintPanel({ currentTarget: document.getElementById('print') });
      expect(printedWith).toBe(3);
      expect(document.getElementById('panel').hasAttribute('data-bl-print-root')).toBe(true);
      window.dispatchEvent(new Event('afterprint'));
      expect(document.querySelectorAll('[data-bl-print-copy],[data-bl-print-root]')).toHaveLength(0);
    } finally { window.print = realPrint; }
  });
  it('a second print cleans up the first even if afterprint never came', () => {
    page();
    P().blPreparePrint(document.getElementById('panel'));
    P().blPreparePrint(document.getElementById('panel'));
    expect(document.querySelectorAll('[data-bl-print-copy]')).toHaveLength(3);
    expect(document.head.querySelectorAll('[data-bl-print-style]')).toHaveLength(1);
  });
  it('no tool prints the whole page any more', () => {
    // Outside the helper itself, only the report written into its own window may call it.
    const start = src.indexOf('    // Printing a tool.'), end = src.indexOf('window.AlloModules.BehaviorLensPrint');
    expect(start).toBeGreaterThan(0);
    const rest = src.slice(0, start) + src.slice(end);
    const calls = [...rest.matchAll(/window\.print\(\)/g)].map(m => rest.slice(m.index - 17, m.index + 15));
    expect(calls).toEqual(['<button onclick="window.print()"']);
    expect((src.match(/onClick: blPrintPanel/g) || []).length).toBeGreaterThanOrEqual(16);
  });
});
