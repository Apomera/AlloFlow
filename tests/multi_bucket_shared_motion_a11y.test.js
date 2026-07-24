import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'desktop/web-app/public/games_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);
const sourceComponent = files[0][1].slice(files[0][1].indexOf('const _MultiBucketSortGame ='), files[0][1].indexOf('const ConceptMapSortGame ='));

describe('Shared MultiBucket sorter accessibility', () => {
  it.each(files)('%s retains the named focus-managed dialog and win focus target', (_path, source) => {
    expect(source).toContain('multi-bucket-game-title');
    expect(source).toContain('multiBucketCloseRef');
    expect(source).toContain('multiBucketWinRef');
    expect(source).toContain('useGameDialogFocus');
  });

  it('powers all four wrapper games', () => {
    const source = files[0][1];
    for (const name of ['ConceptMapSortGame', 'ProblemSolutionSortGame', 'FishboneSortGame', 'OutlineSortGame']) {
      expect(source).toContain(`const ${name} =`);
    }
    expect(source.match(/<_MultiBucketSortGame/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('announces completion, reset, and timed reset cancellation', () => {
    expect(sourceComponent).toContain("t('concept_map.venn.victory_title')");
    expect(sourceComponent).toContain("t('games.bucket_sort.reset_announcement')");
    expect(sourceComponent).toContain("t('games.bucket_sort.reset_cancelled')");
  });

  it('provides larger item, reset, destination, and dialog controls with visible focus', () => {
    expect(sourceComponent.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(9);
    expect(sourceComponent).toContain('focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2');
    expect(sourceComponent).toContain('grid-cols-1 sm:grid-cols-2');
  });

  it('uses native item buttons, separate speech actions, and named bucket groups', () => {
    expect(sourceComponent).toContain('data-multi-bucket-item-id');
    expect(sourceComponent).toContain('aria-pressed={selected}');
    expect(sourceComponent).toContain('</button>\n        <SpeakButton');
    expect(sourceComponent).toContain('role="group"');
    expect(sourceComponent).not.toContain('role="button"');
    expect(sourceComponent).not.toContain('handleItemKeyDown');
  });

  it('contains the named destination modal and restores origin-item focus', () => {
    expect(sourceComponent).toContain('multi-bucket-move-title');
    expect(sourceComponent).toContain('aria-modal="true"');
    expect(sourceComponent).toContain("event.key === 'Escape'");
    expect(sourceComponent).toContain("event.key !== 'Tab'");
    expect(sourceComponent).toContain('cancelMultiBucketSelection');
    expect(sourceComponent).toContain('focusMultiBucketItem');
  });
  it('cleans up timers and honors reduced motion for all shared animations and transforms', () => {
    expect(sourceComponent).toContain('if (hintTimerRef.current) clearTimeout');
    expect(sourceComponent).toContain('if (confirmResetTimerRef.current) clearTimeout');
    expect(sourceComponent).toContain('const reducedMotion = useReducedMotion()');
    expect(sourceComponent.match(/useReducedMotion\(\)/g)?.length).toBe(1);
    expect(sourceComponent).toContain("!reducedMotion ? 'scale-[1.02]' : ''");
    expect(sourceComponent).toContain("reducedMotion ? '' : ' animate-in");
  });
});