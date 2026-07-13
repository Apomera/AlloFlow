// Residual Document-Builder findings (2026-06-22): DB-P0.3 (authored-export header text bypassed the
// contrast helper), DB-P0.5 (typeset PDF/UA self-check passed merged/multi-row-header tables on scope
// alone), DB-B3 (renderJsonToHtml mutated the caller's block objects → non-idempotent on chunked retry).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8')
  + '\n' + readFileSync(resolve(process.cwd(), 'doc_builder_renderer_source.jsx'), 'utf8');

// ── Extract + run the real _accessibleHeaderColors (top-level; anchor-extract — it has regex braces) ──
const _aS = dp.indexOf('function _accessibleHeaderColors(hex) {');
const _aE = dp.indexOf('\n}', dp.indexOf('return _r;', _aS)) + 2;
const _accessibleHeaderColors = new Function(dp.slice(_aS, _aE) + '\nreturn _accessibleHeaderColors;')();

// WCAG contrast ratio for the test's own assertions
const _lum = (hex) => { const h = hex.replace('#', ''); const v = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const _ratio = (a, b) => { const l1 = _lum(a), l2 = _lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
const _hexStops = (css) => String(css || '').match(/#[0-9a-f]{3}(?:[0-9a-f]{3})?\b/gi) || [];

describe('DB-P0.3: export header text is contrast-safe (via _accessibleHeaderColors)', () => {
  it('a light background gets dark text; a dark background gets light text', () => {
    expect(_accessibleHeaderColors('#fde047').fg.toLowerCase()).toBe('#0f172a'); // yellow → dark text
    expect(_accessibleHeaderColors('#1e3a5f').fg.toLowerCase()).toBe('#ffffff'); // navy → light text
  });
  it('the returned {bg,fg} pair reaches WCAG AA (>= 4.5:1)', () => {
    for (const bg of ['#2563eb', '#7c3aed', '#fde047', '#1e3a5f', '#888888']) {
      const r = _accessibleHeaderColors(bg);
      expect(_ratio(r.bg, r.fg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('handles gradient backgrounds without shipping unreadable header text', () => {
    const gradient = 'linear-gradient(135deg, #7c3aed, #be185d)';
    const r = _accessibleHeaderColors(gradient);
    if (r == null) {
      expect(r).toBe(null); // legacy path: caller keeps the original palette
      return;
    }
    expect(r.fg.toLowerCase()).toMatch(/^#(?:ffffff|0f172a)$/);
    if (/^#[0-9a-f]{6}$/i.test(r.bg)) {
      expect(_ratio(r.bg, r.fg)).toBeGreaterThanOrEqual(4.5);
    } else {
      expect(r.bg).toBe(gradient);
      for (const stop of _hexStops(r.bg)) {
        expect(_ratio(stop.length === 4 ? '#' + stop[1] + stop[1] + stop[2] + stop[2] + stop[3] + stop[3] : stop, r.fg)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  it('anti-drift: the export header routes its text color through _accessibleHeaderColors', () => {
    const oldInlinePath = /color:\$\{\(_accessibleHeaderColors\(theme\.headerBg\) \|\| \{\}\)\.fg \|\| theme\.headerText\}/.test(dp);
    const localHeaderPath = /const _headerColors = _accessibleHeaderColors\(theme\.headerBg\) \|\| \{ bg: theme\.headerBg, fg: theme\.headerText \|\| '#ffffff' \};/.test(dp)
      && /style="background:\$\{_headerColors\.bg\};color:\$\{_headerColors\.fg\};/.test(dp)
      && /<h1 style="color:\$\{_headerColors\.fg\};/.test(dp);
    expect(oldInlinePath || localHeaderPath).toBe(true);
  });
});

// ── Mirror of the upgraded Tables self-check status ──
const tableStatus = (thNoScope, merged) => thNoScope > 0 ? 'fail' : (merged > 0 ? 'warn' : 'pass');

describe('DB-P0.5: merged-cell tables downgrade the self-check pass→warn (not a silent pass)', () => {
  it('clean table passes; missing scope fails; merged cells warn', () => {
    expect(tableStatus(0, 0)).toBe('pass');
    expect(tableStatus(2, 0)).toBe('fail');
    expect(tableStatus(0, 3)).toBe('warn');
  });
  it('a scope failure takes precedence over a merged-cell warning', () => {
    expect(tableStatus(1, 3)).toBe('fail');
  });
  it('anti-drift: merged cells are counted from _outlineItems colSpan/rowSpan + drive the warn', () => {
    expect(dp).toMatch(/if \(\(it\.colSpan \|\| 1\) > 1 \|\| \(it\.rowSpan \|\| 1\) > 1\) cellsMerged\+\+;/);
    expect(dp).toMatch(/_thNoScope > 0 \? 'fail' : \(_merged > 0 \? 'warn' : 'pass'\)/);
  });
});

describe('DB-B3: renderJsonToHtml is idempotent (operates on a block clone, not the caller array)', () => {
  it('anti-drift: the map callback shallow-clones the block before normalizing', () => {
    const mapIdx = dp.indexOf('return blocks.map((block, blockIdx) => {');
    const guardIdx = dp.indexOf("if (!block || typeof block !== 'object') return '';", mapIdx);
    const cloneIdx = dp.indexOf('block = { ...block };', mapIdx);
    const firstMutationIdx = dp.indexOf('if (!block.type && block.tag) block.type = block.tag;', mapIdx);
    expect(guardIdx).toBeGreaterThan(0);
    expect(cloneIdx).toBeGreaterThan(guardIdx);        // clone after the guard
    expect(cloneIdx).toBeLessThan(firstMutationIdx);   // clone BEFORE any field normalization
  });
});
