import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const helpers=source.slice(source.indexOf('function titrationBenchNotebook('),source.indexOf('function TitrationInvestigationCollection('));
const api=new Function(helpers+';return {view:titrationBenchView,key:titrationInvestigationKey};')();
const row=(id,patch={})=>({id,preset:'sa_sb',setup:'HCl (0.1 M) + NaOH (0.1 M)',axis:'pH',volume:0,value:1,indicator:'Phenolphthalein',observation:'Colorless',note:'',...patch});
const first=row(1),second=row(2,{volume:25,value:7}),other=row(3,{preset:'wa_sb'});
const study=(rows,patch={})=>({version:1,active:true,prediction:25,evidence:rows.map(api.key),compared:'',explanation:'',completed:false,...patch});
describe('notebook reading views',()=>{
 it('keeps all saved readings in order and safely defaults unknown views',()=>{
  const rows=[other,first,second];expect(api.view(rows,'all')).toEqual(rows);expect(api.view(rows,'unknown')).toEqual(rows);
 });
 it('matches setup, preset, signal, and indicator without filtering by live volume',()=>{
  const rows=[first,second,other,row(4,{setup:'Diluted HCl'}),row(5,{axis:'E'}),row(6,{indicator:'Methyl orange'})];
  expect(api.view(rows,'current',{...first,volume:40,value:12})).toEqual([first,second]);
 });
 it('returns no current matches without a complete current setup',()=>{
  expect(api.view([first],'current',null)).toEqual([]);expect(api.view([first],'current',{preset:'sa_sb'})).toEqual([]);
 });
 it('includes only evidence belonging to the current study',()=>{
  expect(api.view([first,second,other],'evidence',first,study([second]))).toEqual([second]);
  expect(api.view([first],'evidence',first,null)).toEqual([]);
 });
 it('retains evidence during a paused investigation and excludes stale keys',()=>{
  expect(api.view([first,second],'evidence',other,study([first],{active:false}))).toEqual([first]);
  expect(api.view([row(1,{volume:5})],'evidence',first,study([first]))).toEqual([]);
 });
 it('keeps an edited observation visible without changing evidence membership',()=>{
  const edited={...second,note:'Revised observation'};
  expect(api.view([first,edited],'evidence',first,study([second]))).toEqual([edited]);
 });
 it('sanitizes invalid rows, duplicate ids, and capacity before filtering',()=>{
  expect(api.view([null,first,{...first,note:'duplicate'},row(2,{value:NaN})],'all')).toEqual([first]);
  const rows=Array.from({length:41},(_,i)=>row(i+1,{preset:i===40?'wa_sb':'sa_sb'}));
  expect(api.view(rows,'current',other)).toEqual([]);expect(api.view(rows,'all')).toHaveLength(40);
 });
 it('does not mutate saved records, current reading, or investigation state',()=>{
  const rows=[Object.freeze(first),Object.freeze(second)],current=Object.freeze({...first}),state=study(rows);
  Object.freeze(rows);Object.freeze(state.evidence);Object.freeze(state);
  for(const scope of ['all','current','evidence']){const result=api.view(rows,scope,current,state);expect(result).toEqual(rows);expect(result[0]).not.toBe(first);result[0].note='Local only';}
  expect(first.note).toBe('');expect(state.evidence).toEqual(rows.map(api.key));
 });
});
