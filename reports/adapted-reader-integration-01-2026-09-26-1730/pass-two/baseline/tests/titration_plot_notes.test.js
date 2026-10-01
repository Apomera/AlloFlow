import fs from 'node:fs';
import {describe,it,expect} from 'vitest';
const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const helpers=source.slice(source.indexOf('function titrationBenchNotebook('),source.indexOf('function TitrationBenchTools('));
const api=new Function(helpers+';return {note:titrationBenchNote,key:titrationInvestigationKey,capture:titrationInvestigationCapture,progress:titrationInvestigationProgress};')();
const row=(id,patch={})=>({id,preset:'sa_sb',setup:'HCl + NaOH',axis:'pH',volume:25,value:7,indicator:'Phenolphthalein',observation:'Colorless',note:'',...patch});
describe('shared notebook observation editing',()=>{
 it('updates exactly one observation without dropping hidden readings or changing order',()=>{
  const rows=[row(1,{note:'Keep first'}),row(2),row(3,{preset:'redox',axis:'E',note:'Keep other setup'})];
  expect(api.note(rows,2,'My observation')).toEqual([rows[0],{...rows[1],note:'My observation'},rows[2]]);
 });
 it('targets the saved id rather than matching volume, setup, or plotted coordinates',()=>{
  const rows=[row(1),row(2),row(3,{axis:'E'})];const next=api.note(rows,2,'Second duplicate');expect(next.map(r=>r.note)).toEqual(['','Second duplicate','']);
 });
 it('preserves student text, newlines, and whitespace within the 500-character limit',()=>{
  const text='  =Observation <b>kept literally</b>\nSecond line  ';expect(api.note([row(1)],1,text)[0].note).toBe(text);expect(api.note([row(1)],1,'x'.repeat(600))[0].note).toHaveLength(500);
 });
 it('allows clearing an existing observation without changing the reading',()=>{
  const r=row(1,{note:'Previous note'});expect(api.note([r],1,'')).toEqual([{...r,note:''}]);
 });
 it('ignores unchanged text and invalid targets so they cannot invalidate undo',()=>{
  const rows=[row(1,{note:'Existing'}),row(2,{note:'x'.repeat(500)})];
  expect(api.note(rows,1,'Existing')).toBeNull();expect(api.note(rows,2,'x'.repeat(510))).toBeNull();
  for(const id of [null,undefined,'1',0,3,NaN])expect(api.note(rows,id,'Changed')).toBeNull();
  for(const value of [null,undefined,42,{}])expect(api.note(rows,1,value)).toBeNull();expect(api.note([],1,'Changed')).toBeNull();
 });
 it('does not mutate frozen notebook rows',()=>{
  const rows=Object.freeze([Object.freeze(row(1)),Object.freeze(row(2,{note:'Keep'}))]);const next=api.note(rows,1,'Changed');expect(next[0]).not.toBe(rows[0]);expect(rows[0].note).toBe('');expect(rows[1].note).toBe('Keep');
 });
 it('preserves investigation attribution and completion when evidence notes change',()=>{
  const rows=[row(1,{volume:0,value:1}),row(2),row(3,{volume:25.1,value:10.3})],keys=rows.map(api.key),study={version:1,active:true,prediction:25,evidence:keys,compared:JSON.stringify([keys[1],keys[2]]),explanation:'Saved conclusion',completed:true};
  const next=api.note(rows,3,'Pink at this saved volume');expect(next.map(api.key)).toEqual(keys);expect(api.capture(study,rows,next,'sa_sb','phenolphthalein')).toEqual(study);expect(api.progress(study,next).step).toBe(5);
 });
 it('uses notebook validation and capacity without restoring invalid or extra rows',()=>{
  const rows=[null,row(1),row(1,{note:'Duplicate'}),...Array.from({length:40},(_,i)=>row(i+2))];const next=api.note(rows,40,'Last retained reading');expect(next).toHaveLength(40);expect(next.at(-1)).toMatchObject({id:40,note:'Last retained reading'});expect(api.note(rows,41,'Outside capacity')).toBeNull();
 });
});
