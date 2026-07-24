import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('T-Chart Sort WCAG 2.2 interaction accessibility', () => {
  it.each(files)('%s exposes named workspace, move, and completion dialogs', (_path, source) => {
    expect(source).toContain('tchart-game-title');
    expect(source).toContain('tchart-move-menu-title');
    expect(source).toContain('tchart-victory-title');
    expect(source).toContain('tchart-victory-description');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s contains focus restoration and contained dialog keyboard behavior', (_path, source) => {
    expect(source).toContain('focusTChartItem');
    expect(source).toContain('cancelTChartSelection');
    expect(source).toContain('data-tchart-item-id');
    expect(source.includes("event.key === 'Escape'") || source.includes('event.key === "Escape"')).toBe(true);
    expect(source.includes("event.key !== 'Tab'") || source.includes('event.key !== "Tab"')).toBe(true);
    expect(source).toContain('event.stopPropagation()');
  });

  it.each(files)('%s announces errors, completion, reset, and timeout cancellation', (_path, source) => {
    expect(source).toContain('Try');
    expect(source).toContain('Complete! Every item is correctly sorted.');
    expect(source).toContain('Board reset. All items returned to the unsorted bank.');
    expect(source).toContain('Reset cancelled.');
    expect(source).toContain('hintTimerRef.current');
    expect(source).toContain('confirmResetTimerRef.current');
  });

  it.each(files)('%s provides target sizing, focus visibility, reflow, and motion controls', (_path, source) => {
    expect(source).toContain('min-h-11');
    expect(source).toContain('focus:ring-offset-2');
    expect(source).toContain('overflow-auto');
    expect(source).toContain('reducedMotion');
    expect(source).toContain('aria-hidden');
  });

  it('uses native item buttons with the speech action outside the move button', () => {
    const source = files[0][1];
    const start = source.indexOf('const renderTChartItem');
    const end = source.indexOf('const renderColumn', start);
    const renderer = source.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(renderer).toContain('<button');
    expect(renderer).toContain('type="button"');
    expect(renderer).toContain('aria-pressed={selected}');
    expect(renderer).toContain('</button>\n        <SpeakButton');
    expect(renderer).not.toContain('role="button"');
    const component = source.slice(source.indexOf('const TChartSortGame'), source.indexOf('const _MultiBucketSortGame'));
    expect(component).not.toContain('handleItemKeyDown');
  });

  it('uses one reduced-motion preference and preserves 44 CSS-pixel actions', () => {
    const source = files[0][1];
    const start = source.indexOf('const TChartSortGame');
    const end = source.indexOf('const _MultiBucketSortGame', start);
    const component = source.slice(start, end);
    expect(component.split('useReducedMotion()').length - 1).toBe(1);
    expect(component.split('min-h-11').length - 1).toBeGreaterThanOrEqual(8);
  });
});