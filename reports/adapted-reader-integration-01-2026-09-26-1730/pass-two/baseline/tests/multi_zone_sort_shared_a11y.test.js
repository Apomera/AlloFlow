import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Shared MultiZone sorter WCAG 2.2 accessibility', () => {
  it.each(files)('%s exposes named outer, move, and win dialogs', (_path, source) => {
    expect(source).toContain('multi-zone-game-title');
    expect(source).toContain('multi-zone-move-title');
    expect(source).toContain('multi-zone-win-title');
    expect(source).toContain('multi-zone-win-description');
    expect(source).toContain('useGameDialogFocus');
  });

  it.each(files)('%s restores item focus and contains destination keyboard interaction', (_path, source) => {
    expect(source).toContain('focusMultiZoneItem');
    expect(source).toContain('cancelMultiZoneSelection');
    expect(source).toContain('data-multi-zone-item-id');
    expect(source.includes("event.key === 'Escape'") || source.includes('event.key === "Escape"')).toBe(true);
    expect(source.includes("event.key !== 'Tab'") || source.includes('event.key !== "Tab"')).toBe(true);
  });

  it.each(files)('%s announces accurate errors, completion, reset, and initialization', (_path, source) => {
    expect(source).toContain('correctLabel');
    expect(source).toContain('All sorted!');
    expect(source).toContain('Board reset. All items returned to the bank.');
    expect(source).toContain('items are in the bank.');
  });

  it('uses native item buttons and noninteractive named drop groups', () => {
    const source = files[0][1];
    const start = source.indexOf('const MultiZoneSortGame =');
    const end = source.indexOf('const FrayerSortGame =', start);
    const component = source.slice(start, end);
    const renderer = component.slice(component.indexOf('const renderMultiZoneItem'), component.indexOf('const renderZone'));
    expect(renderer).toContain('<button');
    expect(renderer).toContain('type="button"');
    expect(renderer).toContain('aria-pressed={selected}');
    expect(component).toContain('role="group"');
    expect(component).not.toContain('role="button"');
    expect(component).not.toContain('handleItemKeyDown');
  });

  it('provides 44 CSS-pixel actions, visible focus, reflow, and reduced motion', () => {
    const source = files[0][1];
    const start = source.indexOf('const MultiZoneSortGame =');
    const end = source.indexOf('const FrayerSortGame =', start);
    const component = source.slice(start, end);
    expect(component.split('min-h-11').length - 1).toBeGreaterThanOrEqual(8);
    expect(component).toContain('focus:ring-offset-2');
    expect(component).toContain('grid-cols-1 sm:grid-cols-2');
    expect(component).toContain('flex flex-wrap justify-between');
    expect(component.split('useReducedMotion()').length - 1).toBe(1);
    expect(component).toContain('aria-hidden="true"');
  });
});