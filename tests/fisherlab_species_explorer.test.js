import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab species explorer', () => {
  it('finds existing profiles by scientific name and multiple diagnostic terms', () => {
    const filter = window.__FisherLabCore.filterCoreSpeciesProfiles;
    expect(filter('maine', ' GADUS morhua ', 'all').map(s => s.id)).toEqual(['cod']);
    expect(filter('maine', 'pale curved', 'all').map(s => s.id)).toEqual(['cod']);
    expect(filter('maine', 'thumbprint', 'all').map(s => s.id)).toContain('haddock');
    expect(filter('maine', 'missing-species-xyz', 'all')).toEqual([]);
  });
  it('combines group and text filters without mutating the regional catalog', () => {
    const filter = window.__FisherLabCore.filterCoreSpeciesProfiles;
    const before = filter('maine', '', 'all').map(s => s.id);
    expect(filter('maine', 'Gadus morhua', 'inshore')).toEqual([]);
    expect(filter('maine', '', 'groundfish').every(s => s.group === 'groundfish')).toBe(true);
    expect(filter('maine', '', 'all').map(s => s.id)).toEqual(before);
    expect(filter('pnw', 'Gadus morhua', 'all')).toEqual([]);
  });
  it('keeps comparisons distinct and inside the selected region, including stale choices', () => {
    const { filterCoreSpeciesProfiles: filter, getCoreSpeciesComparison: compare } = window.__FisherLabCore;
    expect(compare('maine', 'pollock', 'cod').map(s => s.id)).toEqual(['pollock', 'cod']);
    for (const region of ['maine', 'chesapeake', 'pnw', 'greatlakes']) {
      const ids = filter(region, '', 'all').map(s => s.id);
      for (const selections of [['cod', 'cod'], ['__proto__', 'missing'], ['chinook', 'coho']]) {
        const pair = compare(region, ...selections);
        expect(pair).toHaveLength(2);
        expect(pair[0].id).not.toBe(pair[1].id);
        expect(pair.every(s => ids.includes(s.id))).toBe(true);
        expect(pair.every(s => typeof s.idMarks === 'string')).toBe(true);
      }
    }
  });
});
