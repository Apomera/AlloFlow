import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);
const source = files[0][1];
const component = source.slice(source.indexOf('const VennGame ='), source.indexOf('const CauseEffectSortGame ='));
const countInComponent = value => component.split(value).length - 1;

describe('Venn Sort dialog accessibility', () => {
  it.each(files)('%s exposes the workspace as a named focus-managed dialog', (_path, contents) => {
    expect(contents).toContain('venn-game-title');
    expect(contents).toContain('vennDialogRef');
    expect(contents).toContain('useGameDialogFocus');
  });

  it.each(files)('%s makes victory actionable and focus-contained', (_path, contents) => {
    expect(contents).toContain('venn-victory-description');
    expect(contents).toContain('vennPlayAgainRef');
    expect(contents).toContain('resetVennGame');
    expect(contents.includes("event.key !== 'Tab'") || contents.includes('event.key !== "Tab"')).toBe(true);
  });

  it.each(files)('%s contains and labels the destination dialog', (_path, contents) => {
    expect(contents).toContain('venn-move-menu-title');
    expect(contents).toContain('cancelKeyboardSelection');
    expect(contents).toContain('focusVennItem');
    expect(contents).toContain('data-venn-item-id');
  });

  it('uses native item buttons and keeps speech outside the move button', () => {
    expect(component).toContain('toggleKeyboardSelection');
    expect(component).not.toContain('handleItemKeyDown');
    expect(component).not.toContain('role="button"');

    const bank = component.slice(component.indexOf('vennBank.map'), component.indexOf('vennBank.length'));
    expect(bank).toContain('<button');
    expect(bank.indexOf('</button>')).toBeLessThan(bank.indexOf('<SpeakButton'));
  });

  it('provides 44 CSS-pixel targets and visible focus throughout the interaction', () => {
    expect(countInComponent('min-h-11')).toBeGreaterThanOrEqual(12);
    expect(countInComponent('focus:ring-2')).toBeGreaterThanOrEqual(10);
    expect(component).toContain('focus:ring-offset-2');
  });

  it('restores focus and contains Tab or Escape inside nested dialogs', () => {
    expect(component).toContain("querySelectorAll('[data-venn-item-id]')");
    expect(component).toContain("if (event.key === 'Escape')");
    expect(component).toContain("if (event.key !== 'Tab') return");
    expect(component).toContain('event.stopPropagation()');
  });

  it('announces outcomes and cleans up transient hint state', () => {
    expect(component).toContain('concept_map.venn.victory_title');
    expect(countInComponent('concept_map.venn.move_correct')).toBeGreaterThanOrEqual(2);
    expect(countInComponent('games.ce_sort.hint_try')).toBeGreaterThanOrEqual(3);
    expect(component).toContain('useEffect(() => () =>');
    expect(component).toContain('clearTimeout(hintTimerRef.current)');
    expect(component).toContain('setLastHint(null)');
  });

  it('honors reduced motion and hides visual-only icons', () => {
    expect(countInComponent('const reducedMotion = useReducedMotion()')).toBe(1);
    expect(component).not.toContain('useReducedMotion() ?');
    expect(component).toContain("reducedMotion ? '' : 'animate-in");
    expect(component).toContain('<Layout size={24} aria-hidden="true"/>');
    expect(component).toContain('<ArrowDown className="rotate-90" size={14} aria-hidden="true"/>');
    expect(component).toContain('<HelpCircle size={16} aria-hidden="true" />');
  });

  it('marks translated items and set labels with their displayed language', () => {
    expect(component).toContain('const getTitleLang = (key) =>');
    expect(countInComponent('lang={getTitleLang')).toBeGreaterThanOrEqual(7);
    expect(component).toContain('lang={getTextLang(item)}');
  });

  it('supports zoom-safe scrolling and keyboard select-and-place', () => {
    expect(component).toContain('overflow-auto flex flex-col items-center justify-start md:justify-center');
    expect(component).toContain('handleKeyboardMove');
    expect(component).toContain('keyboardSelectedItemId');
  });
});
