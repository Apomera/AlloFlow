import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n');
function bounded(text,start,end){const a=text.indexOf(start),b=text.indexOf(end,a+start.length);if(a<0||b<=a)throw Error('Missing transect seam');return text.slice(a,b);}
const model=bounded(source,'  // DINO_VOXEL_DIG_TRANSECT_START','  // DINO_VOXEL_DIG_TRANSECT_END');
const sync=bounded(source,'        function syncTransectGuides(p) {','        function syncStrokeComparison(p) {');
const normalize=new Function(model+'\nreturn digVoxelTransect;')();
function item(){return{visible:false,userData:{},position:{set(x,y,z){Object.assign(this,{x,y,z});}},scale:{set(x,y,z){Object.assign(this,{x,y,z});}}};}
function fixture(){const group=item(),datum=item(),segments=Array.from({length:11},item);return{group,datum,segments,run:new Function('digVoxelTransect','transectGroup','transectDatum','transectSegments',sync+'\nreturn syncTransectGuides;')(normalize,group,datum,segments)};}
function row(row=0,removed=[0,1,3,3,2,4]){return{row,focus:row*6+2,coord:'C'+(row+1),columns:removed.map((depth,col)=>({index:row*6+col,coord:String.fromCharCode(65+col)+(row+1),removed:depth,remaining:4-depth,status:depth===4?'cleared':depth?'partial':'covered'}))};}
function props(section,extra={}){return{transect:normalize(section),focus:section.focus,inspect:true,...extra};}

describe('retained observed row surface',()=>{
 it('ships identical synchronization in the desktop mirror',()=>expect(bounded(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n'),'        function syncTransectGuides(p) {','        function syncStrokeComparison(p) {')).toBe(sync));
 it.each([0,1,2,3])('matches six current cover surfaces in row %s',r=>{
  const f=fixture(),section=row(r);f.run(props(section));
  expect(f.group.visible).toBe(true);expect(f.group.userData).toEqual({role:'observed-row-transect',row:r,focus:section.focus,columns:normalize(section).columns,removedMin:0,removedMax:4});
  for(let col=0;col<6;col++){const segment=f.segments[col],current=section.columns[col];expect(segment.visible).toBe(true);expect(segment.position.x).toBeCloseTo((col-2.5)*1.08);expect(segment.position.y).toBeCloseTo(current.remaining*.52+.025);expect(segment.position.z).toBe(.573);expect(segment.scale).toMatchObject({x:1.08,y:.027,z:.027});expect(segment.userData).toEqual({role:'observed-excavation-surface',columnIndices:[current.index],remaining:[current.remaining]});}
  expect(f.datum.userData).toEqual({role:'original-model-surface',originalY:2.08,row:r});
 });
 it('joins unequal observed surfaces without a step across equal-depth neighbors',()=>{
  const f=fixture(),section=row();f.run(props(section));
  for(let col=0;col<5;col++){const a=section.columns[col],b=section.columns[col+1],step=f.segments[6+col],height=Math.abs(a.remaining-b.remaining)*.52;expect(step.visible).toBe(height>0);if(!height){expect(step.userData).toEqual({});continue;}expect(step.position.x).toBeCloseTo((col-2)*1.08);expect(step.position.y).toBeCloseTo((a.remaining+b.remaining)*.26+.025);expect(step.scale.y).toBeCloseTo(height);expect(step.userData).toEqual({role:'observed-excavation-surface',columnIndices:[a.index,b.index],remaining:[a.remaining,b.remaining]});}
 });
 it('stays finite and within the four cover levels for every permitted height',()=>{
  const f=fixture();for(let removed=0;removed<=4;removed++){const section=row(3,Array(6).fill(removed));f.run(props(section));expect(f.segments.slice(6).every(part=>!part.visible)).toBe(true);for(const part of f.segments.slice(0,6)){expect(Number.isFinite(part.position.y)).toBe(true);expect(part.position.y).toBeCloseTo((4-removed)*.52+.025);}}
 });
 it('changes status from contact to exposed without using buried shape or age data',()=>{
  const f=fixture(),section=row(2,[1,2,3,3,2,4]);section.columns[1].status='contact';f.run(props(section));expect(f.group.userData.columns[1].status).toBe('contact');
  section.columns[1].removed=3;section.columns[1].remaining=1;section.columns[1].status='exposed';f.run(props(section));expect(f.group.userData.columns[1].status).toBe('exposed');expect(f.segments[1].position.y).toBeCloseTo(.545);
 });
 it.each([{inspect:false},{findMode:true},{surveyGuides:false},{focus:23},{transect:null}])('hides and clears stale observations when the display is unavailable (%j)',extra=>{
  const f=fixture(),section=row();f.run(props(section));f.run(props(section,extra));expect(f.group.visible).toBe(false);expect(f.group.userData).toEqual({role:'observed-row-transect',row:null,focus:null,columns:[],removedMin:null,removedMax:null});expect(f.datum.visible).toBe(false);expect(f.datum.userData).toEqual({});expect(f.segments.every(part=>!part.visible&&Object.keys(part.userData).length===0)).toBe(true);
 });
 it('updates existing segments after changing rows and restoring a previous observation',()=>{
  const f=fixture(),first=row(0),second=row(3,[2,2,2,2,2,2]),identities=f.segments.slice();f.run(props(first));f.run(props(second));expect(f.group.userData.row).toBe(3);expect(f.segments[0].userData.columnIndices).toEqual([18]);f.run(props(first));expect(f.group.userData.row).toBe(0);expect(f.segments).toEqual(identities);expect(f.segments[0].userData.columnIndices).toEqual([0]);
 });
 it('reads only public transect observations and display settings',()=>{
  const f=fixture(),section=row(),p=props(section);for(const key of ['site','state','action','bones','burial','pose','onSelect','onExcavate','comparison'])Object.defineProperty(p,key,{get(){throw Error('Unexpected read '+key);}});const before=JSON.stringify(p.transect);expect(()=>f.run(p)).not.toThrow();expect(JSON.stringify(p.transect)).toBe(before);
 });
});
