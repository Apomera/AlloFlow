import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);
const source = files[0][1];
const component = source.slice(source.indexOf('const CauseEffectSortGame ='), source.indexOf('const TChartSortGame ='));
const count = value => component.split(value).length - 1;

describe('Cause and Effect Sort dialog accessibility', () => {
  it.each(files)('%s exposes named workspace and completion dialogs', (_path, contents) => {
    expect(contents).toContain('cause-effect-game-title');
    expect(contents).toContain('cause-effect-win-title');
    expect(contents).toContain('cause-effect-win-description');
    expect(contents).toContain('useGameDialogFocus');
  });

  it.each(files)('%s provides completion and destination-dialog containment', (_path, contents) => {
    expect(contents).toContain('playAgainRef');
    expect(contents).toContain('cause-effect-move-menu-title');
    expect(contents).toContain('cancelCauseEffectSelection');
    expect(contents).toContain('focusCauseEffectItem');
    expect(contents.includes("event.key === 'Escape'") || contents.includes('event.key === "Escape"')).toBe(true);
    expect(contents.includes("event.key !== 'Tab'") || contents.includes('event.key !== "Tab"')).toBe(true);
  });

  it('uses native item buttons with speech outside the move action', () => {
    expect(component).toContain('renderCauseEffectItem');
    expect(component).toContain('data-cause-effect-item-id');
    expect(component).toContain('toggleCauseEffectSelection');
    expect(component).not.toContain('handleItemKeyDown');

    const renderer = component.slice(component.indexOf('const renderCauseEffectItem'), component.indexOf('return (', component.indexOf('const renderCauseEffectItem')) + 1800);
    expect(renderer).toContain('<button');
    expect(renderer.indexOf('</button>')).toBeLessThan(renderer.indexOf('<SpeakButton'));
  });

  it('provides target sizing and visible focus for actions and item controls', () => {
    expect(count('min-h-11')).toBeGreaterThanOrEqual(10);
    expect(count('focus:ring-2')).toBeGreaterThanOrEqual(8);
    expect(component).toContain('focus:ring-offset-2');
    expect(count('role="group"')).toBeGreaterThanOrEqual(2);
    expect(component).not.toContain('role={keyboardSelectedItemId');
  });

  it('announces keyboard, drag, completion, reset, and cancellation outcomes', () => {
    expect(count('setAnnouncement')).toBeGreaterThanOrEqual(10);
    expect(component).toContain('concept_map.venn.victory_title');
    expect(component).toContain('games.ce_sort.hint_try');
    expect(component).toContain('games.bucket_sort.reset_announcement');
    expect(component).toContain('games.bucket_sort.reset_cancelled');
  });

  it('cleans transient timers and honors reduced motion', () => {
    expect(count('const reducedMotion = useReducedMotion()')).toBe(1);
    expect(component).not.toContain('useReducedMotion() ?');
    expect(component).toContain('useEffect(() => () =>');
    expect(component).toContain('clearTimeout(hintTimerRef.current)');
    expect(component).toContain('clearTimeout(confirmResetTimerRef.current)');
    expect(component).toContain("reducedMotion ? '' : 'animate-in");
  });

  it('hides visual-only icons and supports zoom-safe scrolling', () => {
    expect(component).toContain('<ArrowRight size={24} aria-hidden="true"/>');
    expect(component).toContain('<ArrowDown className="rotate-90" size={14} aria-hidden="true"/>');
    expect(component).toContain('<HelpCircle size={16} aria-hidden="true" />');
    expect(component).toContain('overflow-auto flex flex-col lg:flex-row');
  });

  it('retains keyboard placement and focus return after replay or menu dismissal', () => {
    expect(component).toContain('handleKeyboardMove');
    expect(component).toContain("querySelectorAll('[data-cause-effect-item-id]')");
    expect(component).toContain('gameContainerRef.current?.focus()');
    expect(component).toContain('focusCauseEffectItem(selectedId)');
  });
});
