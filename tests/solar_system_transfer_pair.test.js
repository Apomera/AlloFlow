import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const s=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');const compare=new Function(s.slice(s.indexOf('  function transferExperimentHistory('),s.indexOf('  function transferDebriefSignature('))+';return compareTransferExperiments;')();
const entry=(id,patch={})=>({source:'experiment',transferComparisonId:id,observation:'Saved evidence',transferComparison:{route:'earth-mars',offset:30,days:258.9,referenceGap:0,testGap:0.789,timestamp:100,...patch}});
describe('two saved transfer experiments',()=>{
 it('compares opposite offsets without changing the source evidence',()=>{const a=entry('a'),b=entry('b',{offset:-30}),before=JSON.stringify([a,b]),r=compare(a,b);expect(r).toMatchObject({oppositeOffsets:true,sameOffset:false,sameGap:true,sameTime:true,sameReference:true,gapChange:0,ruler:1});expect(JSON.stringify([a,b])).toBe(before);});
 it('reports the signed change and uses one sufficient ruler',()=>{const a=entry('a'),b=entry('b',{offset:60,testGap:1.524});expect(compare(a,b).gapChange).toBeCloseTo(.735);expect(compare(b,a).gapChange).toBeCloseTo(-.735);expect(compare(a,b).ruler).toBe(2);});
 it('identifies repeated offsets and changed control conditions',()=>{expect(compare(entry('a'),entry('b',{days:270,referenceGap:.01}))).toMatchObject({sameOffset:true,sameTime:false,sameReference:false});});
 it('rejects self comparisons, cross-route entries and invalid measurements',()=>{const a=entry('a');expect(compare(a,a)).toBeNull();expect(compare(null,a)).toBeNull();for(const patch of [{route:'mars-earth'},{testGap:NaN},{days:0},{offset:0}])expect(compare(a,entry('b',patch))).toBeNull();});
 it('does not call unequal rounded gaps equal',()=>{expect(compare(entry('a'),entry('b',{testGap:.7891}))).toMatchObject({sameGap:false});});
});
