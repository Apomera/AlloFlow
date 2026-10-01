import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const s=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');const history=new Function(s.slice(s.indexOf('  function transferExperimentHistory('),s.indexOf('  function transferDebriefSignature('))+';return transferExperimentHistory;')();
const entry=(id,timestamp,patch={})=>({source:'experiment',transferComparisonId:id,observation:'Captured arrival',transferComparison:{route:'earth-mars',offset:30,days:258.9,referenceGap:0,testGap:0.789,timestamp,...patch}});
describe('saved transfer experiment shelf',()=>{
 it('sorts same-route captures without changing the journal',()=>{const entries=[entry('a',100),entry('b',300),entry('c',200,{route:'mars-earth'})],before=JSON.stringify(entries);expect(history(entries,'earth-mars').map(e=>e.transferComparisonId)).toEqual(['b','a']);expect(JSON.stringify(entries)).toBe(before);});
 it('ignores unrelated, duplicate, incomplete and invalid evidence',()=>{const valid=entry('a',100);const entries=[null,{},valid,valid,entry('b',200,{offset:0}),entry('c',200,{days:NaN}),entry('d',200,{testGap:-1}),entry('e',200,{offset:95}),{...entry('f',200),source:'drone'},{...entry('g',200),observation:' '}];expect(history(entries,'earth-mars')).toEqual([valid]);expect(history(null,'earth-mars')).toEqual([]);});
 it('retains every valid result for count and journal access while accepting opposite offsets',()=>{const entries=Array.from({length:9},(_,i)=>entry('e'+i,i,{offset:i%2?-30:30}));expect(history(entries,'earth-mars')).toHaveLength(9);expect(history(entries,'earth-mars')[0]).toBe(entries[8]);});
});
