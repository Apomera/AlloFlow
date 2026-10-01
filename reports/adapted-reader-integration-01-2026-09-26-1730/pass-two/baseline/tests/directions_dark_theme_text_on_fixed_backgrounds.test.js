// Directions view · no text turns light in dark mode on a background that stays light.
//
// Found 2026-09-24 by an axe sweep in the dark theme (Crew week 5): "Go here next: ...", the view's
// main call to action, is bg-amber-500 + text-slate-900. The dark theme remaps .text-slate-900 to
// #f8fafc but leaves bg-amber-500 alone, so the label read near-white on amber, 2.05:1.
// The gate: an element whose text class the dark theme remaps must not keep a background class it
// does not remap. Both lists come from app_styles_source.jsx (global .theme-dark rules only; the
// .allo-docsuite ones do not reach this view). DIRECTIONS_ROOT points it at copies (mutation runs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.env.DIRECTIONS_ROOT || process.cwd();
const FILES = ['view_directions_result_source.jsx', 'view_directions_result_module.js', 'desktop/web-app/public/view_directions_result_module.js'];
const styles = readFileSync(resolve(process.cwd(), 'app_styles_source.jsx'), 'utf8').split('\n').filter((l) => !l.includes('allo-docsuite'));
const remapped = new Set();
for (const line of styles) for (const m of line.matchAll(/\.theme-dark \.((?:text|bg)-[a-z]+-\d+)(?=[:,\s{)])/g)) remapped.add(m[1]);

function mismatches(src) {
  const out = [];
  // JSX className="..." / className={`...`} in the source; className: "..." in the build.
  for (const m of src.matchAll(/className(?:=\{?|:\s*)["`]([^"`]+)["`]/g)) {
    const cls = m[1].split(/\s+/).filter((c) => c && !c.includes(':') && !c.includes('${'));
    const bgKept = cls.filter((c) => /^bg-[a-z]+-\d+$/.test(c) && !remapped.has(c));
    const textFlipped = cls.filter((c) => /^text-[a-z]+-\d+$/.test(c) && remapped.has(c));
    if (bgKept.length && textFlipped.length) out.push(bgKept.join(',') + ' + ' + textFlipped.join(','));
  }
  return out;
}

describe('dark theme: text that turns light keeps a background that turns dark', () => {
  it('reads the remap lists (the gate is not empty)', () => {
    expect(remapped.has('text-slate-900')).toBe(true);
    expect(remapped.has('bg-slate-200')).toBe(true);
    expect(remapped.has('bg-amber-500')).toBe(false);
    expect(mismatches('<b className="bg-amber-500 text-slate-900">x</b>')).toEqual(['bg-amber-500 + text-slate-900']);
  });
  it.each(FILES)('%s has no element whose text flips while its background stays', (file) => {
    const src = readFileSync(resolve(ROOT, file), 'utf8');
    expect(src.includes('bg-amber-500'), 'the amber call to action is gone from ' + file + '; update this test').toBe(true);
    expect(mismatches(src)).toEqual([]);
  });
});
