import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('Shared MultiZone sorter accessibility', () => {
  it.each(files)('%s exposes a named focus-managed outer dialog', (_path, source) => {
    expect(source).toContain('multi-zone-game-title');
    expect(source).toContain('closeButtonRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it('keeps keyboard select-and-place operation for items and zones', () => {
    const source = files[0][1];
    const component = source.slice(source.indexOf('const MultiZoneSortGame ='), source.indexOf('const FrayerSortGame ='));
    expect(component).toContain("e.key === 'Enter' || e.key === ' '");
    expect(component).toContain("role={hasSelection ? 'button' : undefined}");
    expect(component).toContain('aria-pressed={keyboardSelectedItemId === item.id}');
    expect(component.match(/event\.stopPropagation\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(component).toContain('focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2');
  });

  it('allows a keyboard-selected item to return to the bank', () => {
    const source = files[0][1];
    expect(source).toContain("handleKeyboardMove('bank')");
    expect(source).toContain("role={hasKeyboardSelection ? 'button' : undefined}");
    expect(source).toContain("tabIndex={hasKeyboardSelection ? 0 : undefined}");
    expect(source).toContain('focus:ring-4 focus:ring-indigo-500');
  });

  it('provides 44 CSS-pixel items and header controls', () => {
    const source = files[0][1];
    const component = source.slice(source.indexOf('const MultiZoneSortGame ='), source.indexOf('const FrayerSortGame ='));
    expect(component.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(6);
    expect(component).toContain('ref={closeButtonRef}');
  });

  it('announces completion and isolates the nested win dialog keyboard handler', () => {
    const source = files[0][1];
    expect(source).toContain("t('games.bucket_sort.all_sorted')");
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('multi-zone-win-title');
    expect(source).toContain('ref={playAgainRef}');
  });

  it('hides the decorative heading icon and honors reduced motion', () => {
    const source = files[0][1];
    expect(source).toContain('<Gamepad2 size={22} className="text-indigo-600" aria-hidden="true" />');
    expect(source).toContain('const reducedMotion = useReducedMotion()');
    expect(source).toContain("!reducedMotion ? 'animate-in zoom-in duration-300' : ''");
    expect(source).toContain("!reducedMotion ? 'scale-[1.02]' : ''");
  });
});