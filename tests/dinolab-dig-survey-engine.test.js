import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n');
function extract(text){
 const a=text.indexOf('        function syncSurveyGuides(p) {'),b=text.indexOf('        function syncStrokeComparison(p) {',a);
 if(a<0||b<=a)throw Error('Missing shipped survey synchronization');
 return text.slice(a,b);
}
const syncSource=extract(source);
function part(){return{visible:false,userData:{},position:{set(x,y,z){this.x=x;this.y=y;this.z=z;}},scale:{y:1,z:1}};}
function fixture(){
 const surveyGroup=part(),surveyAxes=part(),surveyProfile=part(),surveyDatum=part(),surveyRemaining=part(),surveyRemoved=part();
 const sync=new Function('surveyGroup','surveyAxes','surveyProfile','surveyDatum','surveyRemaining','surveyRemoved',syncSource+'\nreturn syncSurveyGuides;')(surveyGroup,surveyAxes,surveyProfile,surveyDatum,surveyRemaining,surveyRemoved);
 return{sync,surveyGroup,surveyAxes,surveyProfile,surveyDatum,surveyRemaining,surveyRemoved};
}
function survey(index=0,removed=0){return Object.freeze({seed:1,focus:index,selected:Object.freeze({index,row:Math.floor(index/6),col:index%6,coord:String.fromCharCode(65+index%6)+(Math.floor(index/6)+1),removed,remaining:4-removed,status:removed===4?'cleared':removed?'partial':'covered',shape:null})});}

describe('observed field-survey renderer',()=>{
 it('ships the same synchronization in the desktop mirror',()=>expect(extract(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n'))).toBe(syncSource));
 it.each([0,1,2,3,4])('anchors removed/remaining spans to actual observed cover (%s removed)',removed=>{
  const f=fixture(),record=survey(8,removed);f.sync({survey:record,focus:8});
  expect(f.surveyGroup.visible).toBe(true);expect(f.surveyAxes.visible).toBe(true);
  expect(f.surveyProfile.position).toMatchObject({x:(2-2.5)*1.08,y:0,z:(1-1.5)*1.08});
  expect(f.surveyRemaining.scale.y).toBeCloseTo((4-removed)*.52);expect(f.surveyRemaining.position.y).toBe(0);
  expect(f.surveyRemoved.scale.y).toBeCloseTo(removed*.52);expect(f.surveyRemoved.position.y).toBeCloseTo((4-removed)*.52);
  expect(f.surveyRemaining.visible).toBe(removed<4);expect(f.surveyRemoved.visible).toBe(removed>0);
  expect(f.surveyGroup.userData.selection).toEqual(record.selected);expect(f.surveyGroup.userData.selection).not.toBe(record.selected);
  expect(f.surveyDatum.position).toMatchObject({x:0,y:2.105,z:0});expect(f.surveyDatum.userData.originalY).toBe(2.08);
 });
 it.each([0,7,23])('moves the reference datum with section row %s',focus=>{
  const f=fixture();f.sync({survey:survey(focus,2),focus,inspect:true});
  expect(f.surveyAxes.visible).toBe(false);expect(f.surveyProfile.visible).toBe(true);expect(f.surveyDatum.scale.z).toBe(.26);
  expect(f.surveyDatum.position.z).toBeCloseTo((Math.floor(focus/6)-1.5)*1.08);expect(f.surveyDatum.userData.row).toBe(Math.floor(focus/6));
 });
 it.each([{surveyGuides:false},{findMode:true},{survey:null}])('clears current selection metadata when annotations are unavailable (%j)',patch=>{
  const f=fixture(),record=survey(6,2);f.sync({survey:record,focus:6});f.sync({survey:record,focus:6,...patch});
  expect(f.surveyGroup.visible).toBe(false);expect(f.surveyAxes.visible).toBe(false);expect(f.surveyProfile.visible).toBe(false);
  expect(f.surveyGroup.userData.selection).toBe(null);expect(f.surveyGroup.userData.seed).toBe(null);expect(f.surveyProfile.userData).toEqual({});
 });
 it('rejects a stale selection and invalid cover instead of displaying misleading heights',()=>{
  const f=fixture();f.sync({survey:survey(6,2),focus:7});expect(f.surveyGroup.visible).toBe(false);
  f.sync({survey:{seed:1,selected:{...survey().selected,remaining:3}},focus:0});expect(f.surveyGroup.visible).toBe(false);
 });
 it('keeps annotations independent of previews and comparison toggles without mutating observations',()=>{
  const f=fixture(),record=survey(13,3),before=JSON.stringify(record);
  f.sync({survey:record,focus:13,preview:false,strokeCompare:false});expect(f.surveyGroup.visible).toBe(true);expect(JSON.stringify(record)).toBe(before);
  f.sync({survey:record,focus:13,inspect:true});f.sync({survey:record,focus:13});expect(f.surveyDatum.scale.z).toBe(1);expect(f.surveyAxes.visible).toBe(true);
 });
 it('does not read hidden sites, buried templates, prospective actions or excavation callbacks',()=>{
  const f=fixture(),props={survey:survey(1,2),focus:1};
  for(const key of ['site','state','action','bones','burial','pose','onExcavate','comparison'])Object.defineProperty(props,key,{get(){throw Error('Unexpected read '+key);}});
  expect(()=>f.sync(props)).not.toThrow();
 });
 it('copies only the eight public observation fields, without reading enumerable hidden extras',()=>{
  const f=fixture(),selected={...survey(1,2).selected,species:'private-catalog-value'};
  Object.defineProperty(selected,'burial',{enumerable:true,get(){throw Error('Hidden burial was read');}});
  expect(()=>f.sync({survey:{seed:1,selected},focus:1})).not.toThrow();
  const keys=['index','row','col','coord','removed','remaining','status','shape'].sort();
  expect(Object.keys(f.surveyGroup.userData.selection).sort()).toEqual(keys);expect(Object.keys(f.surveyProfile.userData).sort()).toEqual(keys);
 });
});
