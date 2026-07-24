import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);
const component = files[0][1].slice(files[0][1].indexOf('const TimelineGame ='), files[0][1].indexOf('const ConceptSortGame ='));

describe('Timeline Game WCAG 2.2 accessibility', () => {
  it.each(files)('%s exposes a named focus-managed modal dialog', (_path, source) => {
    expect(source).toContain('timeline-game-title');
    expect(source).toContain('timelineDialogRef');
    expect(source).toContain('useGameDialogFocus');
    expect(source).toMatch(/(?:aria-modal="true"|"aria-modal":\s*"true")/);
  });

  it.each(files)('%s retains native keyboard alternatives to dragging', (_path, source) => {
    expect(source).toContain('keyboardLiftedIdx');
    expect(source).toContain('toggleKeyboardLift');
    expect(source).toContain('handleKeyDown');
    expect(source).toContain('moveItem');
    expect(source).toContain('aria-pressed');
  });

  it('uses a native lift/drop button with speech and secondary actions as siblings', () => {
    expect(component).toContain('ref={el => itemRefs.current[idx] = el}');
    expect(component).toContain('ref={el => itemButtonRefs.current[idx] = el}');
    expect(component).toContain('const el = itemButtonRefs.current[keyboardLiftedIdx]');
    expect(component).toContain('type="button"');
    expect(component).toContain('onClick={() => toggleKeyboardLift(idx)}');
    expect(component).toContain('</button>\n                                                       <SpeakButton');
    expect(component).not.toContain('tabIndex={isWon ? -1 : 0}');
    expect(component).not.toContain('aria-roledescription="draggable item"');
  });

  it('provides visible 44 CSS-pixel actions and persistent mobile reorder controls', () => {
    expect(component.split('min-h-11').length - 1).toBeGreaterThanOrEqual(11);
    expect(component).toContain('focus:ring-offset-2');
    expect(component).toContain('sm:hidden opacity-100');
    expect(component).toContain('data-help-key="timeline_move_up"');
    expect(component).toContain('data-help-key="timeline_move_down"');
    expect(component).toContain('ref={timelineCloseRef}');
  });

  it('supports reflow and keeps image-size adjustment available at narrow widths', () => {
    expect(component).toContain('flex flex-wrap justify-between');
    expect(component).toContain('flex flex-wrap gap-3');
    expect(component).toContain('min-h-11 flex items-center');
    expect(component).not.toContain('hidden sm:flex items-center');
  });

  it('hides decorative icons and consistently honors reduced motion', () => {
    expect(component).toContain('<ListOrdered size={20} className="text-yellow-300" aria-hidden="true"/>');
    expect(component).toContain('<Trophy size={14} className="text-yellow-300" aria-hidden="true"/>');
    expect(component).toContain('<GripVertical size={20} aria-hidden="true" />');
    expect(component.split('useReducedMotion()').length - 1).toBe(1);
    expect(component).toContain('!reducedMotion && <ConfettiExplosion />');
    expect(component).toContain("reducedMotion ? '' : 'transition-all duration-300'");
  });
});