import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function snippet(marker, length = 1100) {
  const start = source.indexOf(marker);
  expect(start, 'Missing marker: ' + marker).toBeGreaterThanOrEqual(0);
  return source.slice(start, start + length);
}

describe('Typing Practice focus order and visibility', () => {
  it('uses one focus owner for every route transition', () => {
    const routeEffect = snippet('// Move focus to the newly rendered view', 1000);
    expect(routeEffect).toContain("if (state.view === 'drill' || state.view === 'battle') return");
    expect(routeEffect).toContain('region.focus({ preventScroll: true })');
    expect(routeEffect).toContain("scrollTypingPracticeIntoView(region, 'start')");

    const battleEffect = snippet('// Battle is a nested three-view workflow', 900);
    expect(battleEffect).toContain('battleSummaryHeadingRef.current');
    expect(battleEffect).toContain('battleMenuHeadingRef.current');
    expect(battleEffect).toContain('target.focus');
  });

  it('keeps preparation context focused without jumping directly to Start', () => {
    const introEffect = snippet('Keyboard shortcut: space/enter on the intro screen', 1300);
    expect(source).not.toContain('startBtnRef');
    expect(introEffect).not.toContain('setTimeout');
    expect(introEffect).toContain("if (typingPracticeIsInteractiveTarget(e.target)) return");
    expect(introEffect).toContain('e.preventDefault()');
    expect(introEffect).toContain("updMulti({ view: 'drill' })");
  });

  it('gives links and disclosure summaries theme-aware focus rings', () => {
    expect(source).toContain("'.tp-root a:focus-visible,'");
    expect(source).toContain("'.tp-root summary:focus-visible {'");
    for (const theme of ['steampunk', 'cyberpunk', 'kawaii', 'oceanic', 'neutral']) {
      expect(source).toContain("'.tp-root.tp-theme-" + theme + " a:focus-visible,'");
      expect(source).toContain("'.tp-root.tp-theme-" + theme + " summary:focus-visible { outline-color:");
    }
  });

  it('keeps focused controls and settings destinations clear of sticky content', () => {
    expect(source).toContain('scroll-margin-block: 12px;');
    expect(source).toContain(".tp-root .tp-settings-anchor, .tp-root #tp-s-presets { scroll-margin-top: 112px; }");
    expect(source).toContain("'@media (max-width: 760px) {'");
    expect(source).toContain(".tp-root .tp-settings-nav { position: static !important; }");
    expect(source).toContain("scrollMarginTop: '112px'");
  });

  it('retains a labelled focusable view region for non-game routes', () => {
    const shell = snippet("ref: viewRegionRef", 500);
    expect(shell).toContain("role: 'group'");
    expect(shell).toContain('tabIndex: -1');
    expect(shell).toContain("'aria-label': typingPracticeViewLabel(state.view)");
  });
});
