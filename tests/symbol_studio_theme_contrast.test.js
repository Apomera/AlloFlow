// Symbol Studio text contrast under the light and dark host themes.
//
// Dark mode used to leave light-surface greys (#6b7280, #374151, #1f2937) on the dark
// modal and settings cards (1.2-3.7:1), and the Social Stories and Sequences input
// panels stayed light while their labels turned pale (1.4:1). Text now takes theme ink
// via ink() when it sits on a theme surface, and keeps dark ink on self-painted light
// surfaces (white cells, pastel tiles, gradient cards).
//
// This walks the server-rendered markup of every tab (settings column included) and
// scores each text node's inline colour against the inline background it sits on
// (translucent layers composited, gradients scored at their worst stop). It reads
// inline styles only, so text with no inline colour or background in its chain is
// skipped; the browser sweep covers what the markup cannot.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupSymbolStudio, renderStudio } from './helpers/symbol_studio_harness.js';

const TABS = ['symbols', 'board', 'schedule', 'stories', 'quickboards', 'books', 'quest', 'search', 'garden'];
const MODULE = process.env.ALLO_SYMBOL_STUDIO_CANDIDATE || 'symbol_studio_module.js';

function parseColor(value) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === '#fff' || v === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  let m = v.match(/^#([0-9a-f]{3})$/);
  if (m) return { r: parseInt(m[1][0] + m[1][0], 16), g: parseInt(m[1][1] + m[1][1], 16), b: parseInt(m[1][2] + m[1][2], 16), a: 1 };
  m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  if (v === 'transparent' || v === 'none') return { r: 0, g: 0, b: 0, a: 0 };
  return null;
}
const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

function decls(el) {
  const out = {};
  const s = el.getAttribute && el.getAttribute('style');
  if (!s) return out;
  let depth = 0, start = 0;
  for (let i = 0; i <= s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if ((ch === ';' || i === s.length) && depth === 0) {
      const part = s.slice(start, i); start = i + 1;
      const k = part.indexOf(':');
      if (k > 0) out[part.slice(0, k).trim().toLowerCase()] = part.slice(k + 1).trim();
    }
  }
  return out;
}

// Background candidates under an element: composited inline layers down to the first opaque one.
function backgroundsOf(el) {
  const layers = [];
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const d = decls(n);
    const bg = d['background-color'] || d.background;
    if (!bg) continue;
    if (/gradient\(/.test(bg)) {
      const stops = (bg.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]+\)/gi) || []).map(parseColor).filter(Boolean);
      if (!stops.length) return null;
      return stops.map((stop) => layers.reduceRight((acc, layer) => over(layer, acc), over(stop, { r: 255, g: 255, b: 255, a: 1 })));
    }
    const c = parseColor(bg.split(/\s+/)[0]);
    if (!c) return null; // a background we cannot read: do not guess
    if (c.a === 0) continue;
    layers.push(c);
    if (c.a >= 1) return [layers.reduceRight((acc, layer) => over(layer, acc), { r: 255, g: 255, b: 255, a: 1 })];
  }
  return null;
}

function inherited(el, prop) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const d = decls(n); if (d[prop]) return d[prop]; }
  return null;
}

function scan(html) {
  const host = document.createElement('div');
  host.innerHTML = html;
  const fails = [];
  let scored = 0;
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  let t;
  while ((t = walker.nextNode())) {
    const text = t.textContent.replace(/\s+/g, ' ').trim();
    if (!/[A-Za-z0-9]/.test(text)) continue;
    const el = t.parentElement;
    if (el.closest('[aria-hidden="true"], option, style, script, [disabled]')) continue;
    if (/clip:\s*rect\(0/.test(el.getAttribute('style') || '')) continue; // sr-only
    const fgRaw = inherited(el, 'color');
    const fg0 = parseColor(fgRaw);
    const bgs = backgroundsOf(el);
    if (!fg0 || !bgs) continue;
    let alpha = fg0.a;
    for (let n = el; n && n !== host; n = n.parentElement) { const o = decls(n).opacity; if (o) alpha *= Number(o); }
    const size = parseFloat(inherited(el, 'font-size') || '16');
    const weight = Number(inherited(el, 'font-weight') || (/^H[1-4]$/.test(el.tagName) ? 700 : 400));
    const need = size >= 24 || (weight >= 700 && size >= 18.66) ? 3 : 4.5;
    const worst = Math.min(...bgs.map((bg) => contrast(over({ ...fg0, a: alpha }, bg), bg)));
    scored++;
    if (worst < need) fails.push(`${worst.toFixed(2)}:1 "${text.slice(0, 50)}" ${fgRaw}`);
  }
  host.remove();
  return { scored, fails };
}

beforeAll(() => { setupSymbolStudio(); });

describe('Symbol Studio text contrast (inline styles, every tab)', () => {
  for (const theme of ['default', 'dark']) {
    for (const tab of TABS) {
      it(`${theme} theme, ${tab} tab: every scored text node meets WCAG AA`, () => {
        const { scored, fails } = scan(renderStudio({ theme, tab }));
        expect(scored, 'the walker scored nothing: the markup or the parser changed').toBeGreaterThan(40);
        expect(fails, fails.join('\n')).toEqual([]);
      });
    }
  }
});

describe('Symbol Studio theme ink wiring', () => {
  const src = readFileSync(resolve(process.cwd(), MODULE), 'utf8');

  it('every dark-theme ink value reads on both dark surfaces', () => {
    const map = src.match(/var SS_DARK_INK = (\{[^}]+\});/);
    expect(map, 'SS_DARK_INK map missing').toBeTruthy();
    const pairs = JSON.parse(map[1].replace(/'/g, '"'));
    for (const [light, dark] of Object.entries(pairs)) {
      for (const surface of ['#0f172a', '#1e293b']) {
        expect(contrast(parseColor(dark), parseColor(surface)), `${light} -> ${dark} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('a printed region is mapped back to paper ink when printed from a dark theme', () => {
    const start = src.indexOf('function printRegion(');
    const body = src.slice(start, src.indexOf('function printStory(', start));
    expect(body.includes("if (ssTheme === 'dark' || ssTheme === 'contrast') paperInk(clone);")).toBe(true);
    expect(src.includes('function paperInk(root)')).toBe(true);
  });
});
