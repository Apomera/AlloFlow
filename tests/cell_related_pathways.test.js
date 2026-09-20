import {beforeAll,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
let C;
beforeAll(()=>{window.StemLab={registerTool(){}};new Function(readFileSync('stem_lab/stem_tool_cell.js','utf8'))();C=window.__alloCellPure;});
it('finds only pathways containing the selected structure in the current cell model',()=>{
 for(const type of ['animal','plant','bacterium']) for(const key of C.interiorOrganelles(type)) {
  const links=C.cellStructureGuides(type,key);
  for(const link of links) {const guide=C.cellGuideForType(link.id,type);expect(guide.steps[link.stepIndex].key).toBe(key);expect(link.stepCount).toBe(guide.steps.length);expect(link.title).not.toMatch(/^\d+\./);}
  const expected=Object.keys(C.INTERIOR_GUIDES).filter(id=>C.cellGuideForType(id,type)?.steps.some(step=>step.key===key));
  expect(links.map(link=>link.id)).toEqual(expected);
 }
});
it('uses the visible step count for the animal energy pathway',()=>{
 expect(C.cellStructureGuides('animal','peroxisome')[0]).toMatchObject({id:'energy',stepIndex:0,stepCount:2});
 expect(C.cellStructureGuides('plant','peroxisome')[0]).toMatchObject({id:'energy',stepIndex:1,stepCount:3});
});
it('handles structures outside guided tours and invalid selections without inventing links',()=>{
 expect(C.cellStructureGuides('animal','lysosome')).toEqual([]);
 expect(C.cellStructureGuides('animal','chloroplast')).toEqual([]);
 expect(C.cellStructureGuides('bacterium','nucleus')).toEqual([]);
 expect(C.cellStructureGuides('animal','constructor')).toEqual([]);
 expect(C.cellStructureGuides('animal',null)).toEqual([]);
});
