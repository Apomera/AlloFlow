// No module-injected "accessibility" CSS makes body text LIGHTER than Tailwind's own colour.
//
// Found 2026-09-24 by an axe sweep of the Crew packs as a teacher: the inactive sidebar tab "Create"
// read #64748b on #f2f6f9, 4.37:1, although its class is text-slate-600 (#475569, ~7:1). The cause was a
// rule build.js wraps around persona_ui_module.js ("WCAG 2.2 AA: Accessibility CSS", 2026-04-18):
// an UNSCOPED `.text-slate-600 { color: #64748b !important; }`, which repainted every text-slate-600 in
// the app one shade lighter once that module loaded. The dark and high-contrast remaps are more
// specific and still win, so only light mode lost contrast.
// The gate: an unscoped `.text-<gray>-<n>` rule in injected CSS must not be lighter than Tailwind's value.
// INJECTED_CSS_ROOT points it at copies (mutation runs).
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.env.INJECTED_CSS_ROOT || process.cwd();
const FILES = ['build.js', 'persona_ui_module.js', 'desktop/web-app/public/persona_ui_module.js', 'desktop/app-build/persona_ui_module.js', 'desktop/web-app/build/persona_ui_module.js'];
const TAILWIND = {
  slate: { 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
  gray: { 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
};
const hex = (h) => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
const onWhite = (h) => 1.05 / (lum(hex(h)) + 0.05);

// Unscoped: the class selector starts the rule (after a quote, a brace, a semicolon or the start).
function lightenings(src) {
  const out = [];
  for (const m of src.matchAll(/(^|["'}{;]\s*)\.text-(slate|gray)-(\d{3})\s*\{\s*color:\s*(#[0-9a-fA-F]{3,6})\s*!important/g)) {
    const orig = TAILWIND[m[2]] && TAILWIND[m[2]][m[3]];
    if (!orig) continue;
    if (onWhite(m[4]) < onWhite(orig) - 0.01) out.push('.text-' + m[2] + '-' + m[3] + ' -> ' + m[4] + ' (' + onWhite(orig).toFixed(2) + ' -> ' + onWhite(m[4]).toFixed(2) + ' on white)');
  }
  return out;
}

describe('injected CSS never lightens body text', () => {
  it('the gate catches the shape it was written for', () => {
    expect(lightenings('_s.textContent = "@media x {} .text-slate-600 { color: #64748b !important; }"')).toHaveLength(1);
    expect(lightenings('.bl-root .text-slate-600 { color: #64748b !important; }')).toEqual([]); // scoped: not this gate
    expect(lightenings('.text-slate-500 { color: #475569 !important; }')).toEqual([]); // darker is fine
  });
  it.each(FILES.filter((f) => existsSync(resolve(ROOT, f))))('%s', (file) => {
    expect(lightenings(readFileSync(resolve(ROOT, file), 'utf8'))).toEqual([]);
  });
});
