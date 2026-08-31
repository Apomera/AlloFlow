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
    // The explorer root paints its own #0f172a ground in dark theme (2026-08-25 depth
    // contrast pass): before that, body inks followed the dark theme while the header
    // assumed the host's light card, so the header surface flag now follows the theme.
    expect(source).toContain('var isHeaderSurfaceDark = isContrast || isDark;');
    expect(source).toContain('style: isDark ? { background: "#0f172a", borderRadius: 12 } : undefined,');
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
