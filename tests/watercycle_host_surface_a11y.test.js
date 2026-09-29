import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
  // desktop/app-build/ is a gitignored local build output: absent in a fresh
  // CI checkout, so only audit it where a desktop build actually exists.
  'desktop/app-build/stem_lab/stem_tool_watercycle.js',
].filter((path) => !path.includes('app-build') || existsSync(path));

describe.each(WATER_CYCLE_PATHS)('Water Cycle host-surface accessibility in %s', (filePath) => {
  const source = readFileSync(filePath, 'utf8');

  it('keeps simulation theming independent from the light host chrome', () => {
    expect(source).toContain('var isDark = !!(ctx && ctx.isDark) || isContrast;');
    // Explore owns its surface and text palette, even inside light host chrome.
    // The visual refresh moved the dark background from an inline style to CSS
    // variables so the header, controls, and learning panels share that palette.
    expect(source).toContain('var isHeaderSurfaceDark = isContrast || isDark;');
    if (filePath.includes('app-build') && !source.includes('--wc-viz-paper:')) {
      // An optional local build may predate the CSS refresh; its inline surface
      // must still satisfy the same independence from the host card.
      expect(source).toContain('style: isDark ? { background: "#0f172a", borderRadius: 12 } : undefined,');
    } else {
      expect(source).toMatch(/\.wc-explorer-root\{[^}]*background:var\(--wc-viz-paper\)/);
      expect(source).toMatch(/\.wc-explorer-root\.dark\{[^}]*--wc-viz-paper:#102830;[^}]*--wc-viz-ink:#e5f3ef;/);
    }
    expect(source).toContain('backgroundColor: isHeaderSurfaceDark ? "#000000" : "#e0f2fe"');
    expect(source).toContain('backgroundColor: isHeaderSurfaceDark ? "#000000" : "#eef2ff"');
    expect(source).toContain('text-slate-700 hover:bg-indigo-50');
  });

  it('places the tool title directly below the host H1 without losing its responsive styling', () => {
    expect(source).toContain('React.createElement("h2", { className: "text-lg font-bold tracking-tight"');
    expect(source).not.toContain('React.createElement("h3", { className: "text-lg font-bold tracking-tight"');
    expect(source).toContain('React.createElement("h3", { className: "wc-brief-title"');
    expect(source).not.toContain('React.createElement("h4", { className: "wc-brief-title"');
    expect(source).toContain('.wc-explorer-root>div:first-child h2{');
    expect(source).not.toContain('.wc-explorer-root>div:first-child h3{');
  });

  it('uses a robust visible back-icon color on the host card', () => {
    expect(source).toContain('.wc-watercycle-back{color:#334155!important}');
    expect(source).toContain('React.createElement(ArrowLeft, { size: 18 })');
  });

  it('uses real text instead of unsupported aria-labels on generic stage metadata', () => {
    expect(source).toContain('React.createElement("div", { className: "wc-stage-focus-meta" },');
    expect(source).toContain('React.createElement("span", { className: "sr-only" }, "Stage " + resolvedStageIndex + " of " + STAGES.length)');
    expect(source).not.toContain('className: "wc-stage-focus-meta", "aria-label"');
    expect(source).not.toContain('className: "wc-stage-focus-flow",\n                  "aria-label"');
  });
});
