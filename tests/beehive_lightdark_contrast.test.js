// @vitest-environment jsdom
// Beehive, light and dark: the hero's status text ("Day 0 | Model health 70/100") was accent ink at opacity-70, 3.36 and
// 3.67:1. Reading all three modes showed worse: in dark the mode label used the raw accent, and the purple (3.46) and
// indigo (2.98) accents are too dark for a dark hero, so the status under them read 2.23 and 2.03. The pill is translucent
// over a gradient, so this composites the worst case; pixel readings are in the lightdark report.
// BEEHIVE_LD_DIR=<dir> runs against another copy, to show the failure on the old file.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = process.env.BEEHIVE_LD_DIR || path.join(process.cwd(), 'stem_lab');
const src = fs.readFileSync(path.join(DIR, 'stem_tool_beehive.js'), 'utf8');

const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const over = (f, a, b) => f.map((v, i) => v * a + b[i] * (1 - a));
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

const root = /\[data-beehive-root="true"\] \{ (--bee-accent:[^}]*?--bee-secondary-rgb:[^;]+;)/.exec(src)[1];
const queen = /data-beehive-active-mode="queen"\] \{ ([^}]+)\}/.exec(src)[1];
const drone = /data-beehive-active-mode="drone"\] \{ ([^}]+)\}/.exec(src)[1];
const darkRule = /\[data-beehive-theme="dark"\] \[data-beehive-mode-signal="true"\] \{ ([^}]+)\}/.exec(src)[1];
const lineStatus = src.split('\n').find((l) => l.includes("'· ' + simCardStatus(viewMode)"));
const opacityClass = /\bopacity-(\d+)\b/.exec(lineStatus);
const opacity = opacityClass ? Number(opacityClass[1]) / 100 : 1;
const v = (block, name) => { const m = new RegExp(name + ':\\s*([^;]+);').exec(block); return m ? m[1].trim() : null; };
const accentRgb = (block) => v(block, '--bee-accent-rgb').split(',').map(Number);

// Dark ink: whatever the dark rule says the pill's colour is.
function darkInk(block) {
  const named = /color:var\((--[\w-]+)\)/.exec(darkRule);
  return named ? hex(v(block, named[1])) : accentRgb(block);
}
const MODES = [['beekeeper', root], ['queen', queen], ['drone', drone]];

describe('Beehive hero status text', () => {
  it.each(MODES)('light, %s: the status clears 4.5:1 at its opacity', (_n, block) => {
    const ink = hex(v(block, '--bee-accent-deep'));
    const ground = [255, 255, 253]; // read from the screenshot: the pill over the hero, at its palest
    expect(ratio(over(ink, opacity, ground), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(MODES)('dark, %s: the label and the status clear 4.5:1 on the pill', (_n, block) => {
    const ink = darkInk(block);
    // The hero's lightest stop: 18% accent over slate-900, then the pill's 55% near-black over that.
    const hero = over(accentRgb(block), 0.18, [15, 23, 42]);
    const ground = over([2, 6, 23], 0.55, hero);
    expect(ratio(ink, ground), 'label').toBeGreaterThanOrEqual(4.5);
    expect(ratio(over(ink, opacity, ground), ground), 'status').toBeGreaterThanOrEqual(4.5);
  });
});

describe('Beehive notes on checks that are not available yet', () => {
  // The checkbox is disabled, but this note says what to write first. slate-500 on the dark cards read 3.89 and 4.11.
  it.each([
    ['self-review label', "(!item.available ? (dk ? 'border-slate-800 bg-slate-950/30 "],
    ['self-review note', "(item.available ? (dk ? 'text-slate-300' : 'text-slate-600') : (dk ? '"],
    ['fair-test label', "(item.available ? cardTone : (dk ? 'border-slate-800 "],
  ])('%s is slate-400 in dark', (_n, head) => {
    const i = src.indexOf(head);
    expect(i, head).toBeGreaterThan(0);
    expect(src.slice(i + head.length, i + head.length + 11)).toBe('text-slate-');
    expect(src.slice(i + head.length + 11, i + head.length + 14)).toBe('400');
  });
});
