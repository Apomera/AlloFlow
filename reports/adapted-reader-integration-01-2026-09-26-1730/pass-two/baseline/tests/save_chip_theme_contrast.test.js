// The "Saved to Device" status chip is readable in every theme.
//
// Measured 2026-09-24 in Chromium (Crew week 5): the chip (bottom left, 11 px bold) had a
// translucent white background, bg-white/90. The dark theme remaps .bg-white globally but not
// bg-white/90 (only inside .allo-docsuite, and the chip is outside it), while it DOES remap the
// chip's text-green-700 to #86efac. Result in dark mode: light green on near-white, 1.15:1,
// effectively invisible. In light mode the 10% see-through let dark content behind the chip pull
// green-700 to 4.02:1 and the "Unsaved" red-600 to 3.87:1 (axe flagged 4.24 on a phone).
// A solid bg-white reads 5.02 / 4.83 in light and 11.62 in dark; high contrast is unchanged.
//
// The gate: every background class on the chip must have a global .theme-dark remap in the app
// styles, and none may be translucent white. HOST_CHIP_PATHS points it at copies (mutation runs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = (process.env.HOST_CHIP_PATHS || 'AlloFlowANTI.txt,desktop/web-app/src/App.jsx').split(',');
const styles = readFileSync(resolve(process.cwd(), 'app_styles_source.jsx'), 'utf8');

function chipClasses(file) {
  const src = readFileSync(resolve(process.cwd(), file), 'utf8');
  const m = src.match(/<div role="status" aria-live="polite" aria-atomic="true" className="(fixed bottom-4 left-4 z-\[1000\][^"]*)"/);
  if (!m) throw new Error('save chip not found in ' + file);
  return m[1].split(/\s+/);
}
// A global dark-theme rule for this class: `.theme-dark .<class>` not scoped to .allo-docsuite.
function hasGlobalDarkRemap(cls) {
  const sel = '.theme-dark .' + cls;
  return styles.split('\n').some((line) => !line.includes('allo-docsuite') && [':', ' ', ',', '{'].some((end) => line.includes(sel + end)));
}

describe.each(FILES)('save status chip (%s)', (file) => {
  it('its background is opaque, not a see-through white', () => {
    const cls = chipClasses(file);
    expect(cls.filter((c) => /^bg-white\/\d+$/.test(c))).toEqual([]);
    expect(cls.some((c) => /^bg-/.test(c)), 'the chip has no background class at all').toBe(true);
  });
  it('every background class on it is remapped by the dark theme', () => {
    const bgs = chipClasses(file).filter((c) => /^bg-/.test(c));
    expect(bgs.filter((c) => !hasGlobalDarkRemap(c))).toEqual([]);
  });
});

describe('the gate itself', () => {
  it('knows a remapped class from one that is not', () => {
    expect(hasGlobalDarkRemap('bg-white')).toBe(true);
    expect(hasGlobalDarkRemap('bg-white/90')).toBe(false);
  });
});
