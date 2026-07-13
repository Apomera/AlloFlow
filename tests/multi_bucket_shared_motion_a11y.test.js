import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['games_source.jsx', 'games_module.js', 'prismflow-deploy/public/games_module.js'];
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
    expect(sourceComponent).toContain('focus:ring-4');
  });

  it('prevents child item activation from bubbling into actionable buckets', () => {
    expect(sourceComponent.match(/event\.stopPropagation\(\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(sourceComponent).toContain("e.preventDefault(); e.stopPropagation()");
  });

  it('exposes the destination chooser as nonmodal and lets Escape cancel selection', () => {
    const chooserStart = sourceComponent.indexOf('ref={moveMenuRef}');
    const chooser = sourceComponent.slice(chooserStart, sourceComponent.indexOf('</div>', chooserStart));
    expect(chooser).toContain('role="dialog"');
    expect(chooser).not.toContain('aria-modal="true"');
    expect(chooser).toContain("event.key === 'Escape'");
    expect(chooser).toContain('setKeyboardSelectedItemId(null)');
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