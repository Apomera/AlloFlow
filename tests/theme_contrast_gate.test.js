// Runner for dev-tools/scan_theme_contrast.cjs.
//
// Added in the same commit as the scanner so it never joins the orphan list
// that tests/dev_tools_orphan_gates.test.js tracks (18 of 102 dev-tools scripts
// once had zero callers).
//
// HOW THIS DIFFERS FROM dark_mode_contrast_gate
// That gate measures Tailwind `dark:` UTILITIES against the app-theme mechanism.
// This one measures hardcoded hex TEXT colours in inline style objects, which
// Tailwind never sees. They are complementary; neither subsumes the other.
//
// WHY IT EXISTS
// One audit of stem_tool_watercycle.js turned up the same defect four separate
// times: a colour chosen against a dark card, then used flat or as the light
// branch on a white one. Shipped examples measured 1.67:1, 2.05:1 and 2.28:1.
// Each looked deliberate in source and correct in whichever theme its author had
// open, so review and reading both missed them; only measurement caught them.
//
// THE NEGATIVE CONTROL IS THE POINT
// A clean run means "no findings", and a scanner that silently stopped matching
// would report exactly the same thing. Vacuous passes have bitten this repo
// before. So the second test feeds the scanner a fixture containing one
// deliberate violation per rule and asserts it goes red on each, and the third
// asserts the false-positive suppressions still suppress.

import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { scanFile, contrast } = require('../dev-tools/scan_theme_contrast.cjs');

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

function scanSource(source) {
  const dir = mkdtempSync(join(tmpdir(), 'wc-contrast-'));
  const file = join(dir, 'fixture.js');
  try {
    writeFileSync(file, source, 'utf8');
    return scanFile(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('theme contrast gate', () => {
  it('keeps both shipped copies of the water cycle tool free of failing text colours', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const findings = scanFile(filePath);
      const detail = findings
        .map((f) => `${filePath}:${f.line} ${f.color} ${f.ratio.toFixed(2)}:1 on ${f.ground} (needs ${f.bar})`)
        .join('\n');
      expect(findings, `failing text colours:\n${detail}`).toHaveLength(0);
    });
  });

  it('computes WCAG ratios correctly on known pairs', () => {
    // Anchors from the W3C definition; black on white is exactly 21:1.
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // Three of the real defects this gate was built from.
    expect(contrast('#fbbf24', '#ffffff')).toBeLessThan(2);
    expect(contrast('#22c55e', '#ffffff')).toBeLessThan(2.5);
    expect(contrast('#f59e0b', '#f8fafc')).toBeLessThan(2.5);
  });

  it('NEGATIVE CONTROL: goes red on one deliberate instance of each rule', () => {
    // 1. flat colour that fails on white
    const flat = scanSource("h('p', { style: { fontSize: 12, color: '#22c55e' } }, x)");
    expect(flat, 'flat low-contrast colour must be caught').toHaveLength(1);
    expect(flat[0].ground).toBe('light');

    // 2. themed ternary whose LIGHT branch fails (the commonest real shape)
    const lightBranch = scanSource("h('p', { style: { fontSize: 12, color: isDark ? '#7dd3fc' : '#fbbf24' } }, x)");
    expect(lightBranch, 'failing light branch must be caught').toHaveLength(1);
    expect(lightBranch[0].color).toBe('#fbbf24');

    // 3. themed ternary whose DARK branch fails
    const darkBranch = scanSource("h('p', { style: { fontSize: 12, color: isDark ? '#334155' : '#0f172a' } }, x)");
    expect(darkBranch.some((f) => f.ground === 'dark'), 'failing dark branch must be caught').toBe(true);

    // 4. text on its own solid background that still fails
    const ownBg = scanSource("h('p', { style: { fontSize: 12, background: '#fef3c7', color: '#fde68a' } }, x)");
    expect(ownBg, 'low contrast against its own background must be caught').toHaveLength(1);

    // 5. large text still has to clear 3:1
    const large = scanSource("h('p', { style: { fontSize: 24, fontWeight: 800, color: '#fbbf24' } }, x)");
    expect(large, 'large text below 3:1 must be caught').toHaveLength(1);
    expect(large[0].bar).toBe(3);

    // 6. a THEMED background is resolved per theme, not skipped. Here the dark
    //    branch puts near-black text on a near-black ground; the light branch is
    //    fine. Skipping the line (the old behaviour) would have missed it.
    const themedBg = scanSource(
      "h('p', { style: { fontSize: 12, background: isDark ? '#0f172a' : '#ffffff', color: isDark ? '#1e293b' : '#0f172a' } }, x)",
    );
    expect(themedBg, 'failing branch on a themed background must be caught').toHaveLength(1);
    expect(themedBg[0].ground).toBe('dark');
  });

  it('does not fire on the shapes it deliberately exempts', () => {
    // Descriptor records carry `color:` as data driving borders and canvas
    // paint, not DOM text. Flagging them produced ~17 false positives.
    expect(scanSource("{ id: 'headwaterStreams', name: 'X', icon: 'A', color: '#0ea5e9', padding: 1 }")).toHaveLength(0);
    // White on a solid brand button is correct, not a 1:1 failure.
    expect(scanSource("h('b', { style: { padding: 4, background: '#0369a1', color: '#ffffff' } }, x)")).toHaveLength(0);
    // Large bold text conforming at 3:1 is not a finding.
    expect(scanSource("h('p', { style: { fontSize: 20, fontWeight: 800, color: '#a855f7' } }, x)")).toHaveLength(0);
    // Grounds that cannot be resolved from source are skipped, never guessed.
    // Only a hex literal counts as resolved; anything else with a background
    // declared is unknowable. `background: color` is the one that mattered --
    // it slipped past the original enumeration and caused 143 false positives
    // repo-wide, so each of these shapes is pinned.
    expect(scanSource("h('p', { style: { fontSize: 12, background: 'linear-gradient(135deg,#fff,#eee)', color: '#22c55e' } }, x)")).toHaveLength(0);
    expect(scanSource("h('span', { style: { padding: 2, background: color, color: '#0f172a' } }, band)")).toHaveLength(0);
    expect(scanSource("h('p', { style: { fontSize: 12, background: def.color, color: '#22c55e' } }, x)")).toHaveLength(0);
    expect(scanSource("h('p', { style: { fontSize: 12, background: 'var(--allo-stem-surface)', color: '#22c55e' } }, x)")).toHaveLength(0);
    expect(scanSource("h('p', { style: { fontSize: 12, background: 'rgba(15,23,42,0.6)', color: '#22c55e' } }, x)")).toHaveLength(0);
    // Canvas painting is pixels, not text.
    expect(scanSource("ctx.fillStyle = '#22c55e'; ctx.font = '11px sans-serif';")).toHaveLength(0);
  });
});
