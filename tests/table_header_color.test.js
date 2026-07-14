// Table color-fidelity (2026-06-16): a reconstructed-from-image table can keep the ORIGINAL header
// fill colour (estimated by the vision pass as `headerFill`) while staying accessible —
// _accessibleHeaderColors returns {bg,fg} that preserve the hue but GUARANTEE the header text meets
// WCAG AA (>=4.5:1). Invalid/absent colour → null (caller keeps the doc palette). The semantic
// <th scope> structure is untouched; only colour is added.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _accessibleHeaderColors(hex) {');
const end = src.indexOf('function _emitAccessibleTableHtml', start);
if (start === -1 || end === -1) throw new Error('extraction markers missing');
const { _accessibleHeaderColors } = new Function(src.slice(start, end) + '\n; return { _accessibleHeaderColors };')();

const _hx = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
const _lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const l1 = _lum(a), l2 = _lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };

describe('_accessibleHeaderColors — original hue, guaranteed AA', () => {
  it('every valid fill yields a header text/bg pair that meets WCAG AA (>=4.5:1)', () => {
    for (const c of ['#7c3aed', '#3b82f6', '#f1f5f9', '#808080', '#ffeb3b', '#000', '#ffffff', '#1a1a2e']) {
      const r = _accessibleHeaderColors(c);
      expect(r, c).toBeTruthy();
      expect(ratio(_hx(r.bg), _hx(r.fg)), c + ' ratio').toBeGreaterThanOrEqual(4.5);
    }
  });

  it('a dark fill keeps white text; a light fill keeps dark text (hue preserved)', () => {
    expect(_accessibleHeaderColors('#7c3aed').fg).toBe('#ffffff'); // dark purple → white text, bg unchanged
    expect(_accessibleHeaderColors('#7c3aed').bg).toBe('#7c3aed');
    expect(_accessibleHeaderColors('#f1f5f9').fg).toBe('#0f172a'); // light → dark text
  });

  it('invalid / absent colour → null (caller falls back to the doc palette)', () => {
    expect(_accessibleHeaderColors('purple')).toBeNull();
    expect(_accessibleHeaderColors('')).toBeNull();
    expect(_accessibleHeaderColors(null)).toBeNull();
    expect(_accessibleHeaderColors('#xyz')).toBeNull();
  });
});

describe('anti-drift: table-color wired end to end, accessibility preserved', () => {
  it('the emitter applies thColor to the header cell text', () => {
    expect(src).toContain("const thColor = opts.thColor || '';");
    expect(src).toContain("(thColor ? ';color:' + thColor : '')");
  });
  it('the vision reconstruction prompt asks for headerFill (cosmetic-only) and the result captures it', () => {
    expect(src).toContain('"headerFill"');
    expect(src).toContain('NEVER let it change the transcribed cell TEXT');
    expect(src).toContain('_reconstructed: true, headerBg: _headerBg }');
  });
  it('the table render routes the captured colour through the AA picker', () => {
    expect(src).toContain('const _hdr = _accessibleHeaderColors(block.headerBg);');
    expect(src).toContain('tableBg: _hdr ? _hdr.bg : docStyle.tableBg');
    expect(src).toContain('thColor: _hdr ? _hdr.fg : undefined');
  });
});
