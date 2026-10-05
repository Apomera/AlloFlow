import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n');
function extract(text){
 const start='        function syncStrokeComparison(p) {',end='        function sync() {';
 const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
 if(a<0||b<=a||text.indexOf(start,a+start.length)>=0)throw Error('Missing or ambiguous shipped stroke sync');
 return text.slice(a,b);
}
const syncSource=extract(source);
const column=(index,delta=1)=>Object.freeze({index,coord:String.fromCharCode(65+index%6)+(Math.floor(index/6)+1),row:Math.floor(index/6),col:index%6,beforeRemaining:3,remaining:3-delta,delta,newContact:delta===0});
const comparison=Object.freeze({columns:Object.freeze([column(0),column(1),column(6),column(7),column(12,0)])});
function fixture(){
 const strokeGroup={visible:false,userData:{}};
 const strokeCells=Array.from({length:9},()=>({visible:false,userData:{},position:{set(x,y,z){this.x=x;this.y=y;this.z=z;}},children:Array.from({length:3},()=>({visible:true,position:{y:0},scale:{y:1}}))}));
 const sync=new Function('strokeGroup','strokeCells',syncSource+'\nreturn syncStrokeComparison;')(strokeGroup,strokeCells);
 return{sync,strokeGroup,strokeCells};
}
function visible(f){return f.strokeCells.filter(cell=>cell.visible);}
describe('shipped observed last-stroke renderer',()=>{
 it('ships identical renderer synchronization in the desktop mirror',()=>{
  expect(extract(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js','utf8').replace(/\r\n/g,'\n'))).toBe(syncSource);
 });
 it('places former/current surfaces and removed spans at the observed heights only',()=>{
  const f=fixture();f.sync({comparison,focus:7});
  expect(f.strokeGroup.visible).toBe(true);expect(visible(f)).toHaveLength(5);
  expect(f.strokeGroup.userData.columns).toEqual(comparison.columns);
  for(let i=0;i<5;i++){
   const cell=f.strokeCells[i],record=comparison.columns[i];
   expect(cell.position).toMatchObject({x:(record.col-2.5)*1.08,y:0,z:(record.row-1.5)*1.08});
   expect(cell.children[0].position.y).toBeCloseTo(record.beforeRemaining*.52+.045);
   expect(cell.children[1].position.y).toBeCloseTo(record.remaining*.52+.028);
   expect(cell.children[2].position.y).toBeCloseTo(record.remaining*.52+.028);
   expect(cell.children[2].scale.y).toBeCloseTo(record.delta*.52);
   expect(cell.children[2].visible).toBe(record.delta>0);
   expect(cell.userData).toEqual(record);expect(cell.userData).not.toBe(record);
  }
 });
 it.each([false,undefined])('shows only the completed stroke regardless of preview preference (%s)',preview=>{
  const f=fixture();f.sync({comparison,focus:7,preview});expect(visible(f)).toHaveLength(5);
 });
 it.each([0,7,12])('clips section comparison to the selected row (%s)',focus=>{
  const f=fixture();f.sync({comparison,focus,inspect:true});
  const expected=comparison.columns.filter(record=>record.row===Math.floor(focus/6));
  expect(f.strokeGroup.userData.columns).toEqual(expected);
  expect(visible(f).map(cell=>cell.userData.index)).toEqual(expected.map(record=>record.index));
 });
 it('hides a section with no changed columns without retaining prior cell metadata',()=>{
  const f=fixture();f.sync({comparison,focus:7});f.sync({comparison,focus:23,inspect:true});
  expect(f.strokeGroup.visible).toBe(false);expect(f.strokeGroup.userData.columns).toEqual([]);
  expect(visible(f)).toEqual([]);expect(f.strokeCells.every(cell=>Object.keys(cell.userData).length===0)).toBe(true);
 });
 it.each([{findMode:true},{strokeCompare:false},{comparison:null}])('clears overrides when comparison is hidden or unavailable (%j)',patch=>{
  const f=fixture();f.sync({comparison,focus:7});f.sync({comparison,focus:7,...patch});
  expect(f.strokeGroup.visible).toBe(false);expect(f.strokeGroup.userData.columns).toEqual([]);
  expect(visible(f)).toEqual([]);expect(f.strokeCells.every(cell=>Object.keys(cell.userData).length===0)).toBe(true);
 });
 it('retains contact-only marks at equal surface heights without a fictitious removed span',()=>{
  const f=fixture(),contact=Object.freeze({columns:Object.freeze([column(12,0)])});
  f.sync({comparison:contact,focus:12});const cell=visible(f)[0];
  expect(cell.userData.delta).toBe(0);expect(cell.userData.newContact).toBe(true);expect(cell.children[2].visible).toBe(false);
  expect(cell.children[0].position.y-cell.children[1].position.y).toBeCloseTo(.017);
 });
 it('uses a fixed pool of nine cells through repeated changes and never mutates inputs',()=>{
  const f=fixture(),before=JSON.stringify(comparison),identities=[...f.strokeCells],parts=f.strokeCells.map(cell=>[...cell.children]);
  for(let i=0;i<100;i++)f.sync({comparison,focus:i%24,inspect:i%2===0,strokeCompare:i%3!==0});
  expect(f.strokeCells).toHaveLength(9);expect(f.strokeCells).toEqual(identities);
  f.strokeCells.forEach((cell,i)=>expect(cell.children).toEqual(parts[i]));expect(JSON.stringify(comparison)).toBe(before);
  f.sync({comparison:{columns:Array.from({length:24},(_,i)=>column(i))},focus:0});expect(visible(f)).toHaveLength(9);
 });
 it('does not read burial, fossil placements, catalog records, future actions or state',()=>{
  const f=fixture(),props={comparison,focus:7};
  for(const key of ['site','state','action','pose','onExcavate','bones','burial','catalog'])Object.defineProperty(props,key,{get(){throw Error('Unexpected read: '+key);}});
  expect(()=>f.sync(props)).not.toThrow();
 });
});
