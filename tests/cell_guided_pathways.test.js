import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
let C;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  new Function(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'))();
  C = window.__alloCellPure;
});
describe('Cell-type-aware guided pathways', () => {
  it('only offers structures present in the selected model without changing the catalogue', () => {
    const original = JSON.stringify(C.INTERIOR_GUIDES);
    for (const [id, source] of Object.entries(C.INTERIOR_GUIDES)) {
      for (const type of ['animal','plant','bacterium']) {
        const guide = C.cellGuideForType(id,type);
        if (!source.types.includes(type)) { expect(guide).toBeNull(); continue; }
        expect(guide.steps.length).toBeGreaterThan(0);
        for (const step of guide.steps) {
          expect(C.interiorHas(type,step.key)).toBe(true);
          expect(source.steps[step.sourceIndex].key).toBe(step.key);
        }
      }
    }
    expect(JSON.stringify(C.INTERIOR_GUIDES)).toBe(original);
    expect(C.cellGuideForType('constructor','animal')).toBeNull();
  });
  it('keeps the animal energy tour and saved positions aligned after removing its plant-only stop', () => {
    const guide=C.cellGuideForType('energy','animal');
    expect(guide.steps.map(s=>s.key)).toEqual(['peroxisome','mitochondria']);
    expect(C.cellGuideVisibleStep(guide,0)).toBe(0);
    expect(C.cellGuideVisibleStep(guide,1)).toBe(0);
    expect(C.cellGuideVisibleStep(guide,2)).toBe(1);
    expect(C.cellGuideVisibleStep(guide,99)).toBe(1);
    expect(C.cellGuideForType('energy','plant').steps).toHaveLength(3);
  });
  it('repairs the absent selection from older progress and round-trips original step indices', () => {
    for (const [saved,key,index] of [[0,'peroxisome',1],[1,'peroxisome',1],[2,'mitochondria',2]]) {
      const progress=C.normalizeCellProgress({schemaVersion:1,currentType:'animal',byCellType:{animal:{guideId:'energy',guideStep:saved,selected:'chloroplast'}}},{});
      const cell=C.applyCellProgressToCell({},progress.byCellType.animal,'animal');
      expect(cell.interiorSel).toBe(key);
      expect(cell.interiorGuideStep).toBe(index);
      expect(C.extractCellProgress(cell,'animal',{}).guideStep).toBe(index);
    }
  });
});
