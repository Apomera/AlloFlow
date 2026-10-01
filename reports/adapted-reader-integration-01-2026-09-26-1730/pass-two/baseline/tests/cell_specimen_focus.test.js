import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_cell.js','utf8');
const body=source.match(/canvasEl\._cellSimFocusOrganism = function \(orgId\) \{([\s\S]*?)\n            \};/)[1];
function focus(selected,player,id) {
 const first={def:{id:'amoeba'},x:10,y:20};
 const other={def:{id:'plantcell'},x:100,y:200};
 const world={organisms:[first,other,selected].filter(Boolean)};
 const run=new Function('world','selectedOrg','playAsOrg','orgId', 'var cam={},canvasEl={};function clampCamera(){}function renderStaticFrame(){};' + body + ';return {selected:selectedOrg,cam};');
 return {result:run(world,selected,player,id),first,other};
}
describe('centering keeps the actual specimen',()=>{
 it('keeps a later individual of the same species',()=>{
  const selected={def:{id:'amoeba'},x:340,y:210};
  const {result}=focus(selected,null,'amoeba');
  expect(result.selected).toBe(selected);expect(result.cam).toEqual({x:340,y:210,zoom:3});
 });
 it('prioritizes the controlled individual',()=>{
  const player={def:{id:'amoeba'},x:200,y:90};
  const {result}=focus({def:{id:'amoeba'},x:50,y:60},player,'amoeba');
  expect(result.selected).toBe(player);expect(result.cam.x).toBe(200);
 });
 it('finds another species when explicitly requested',()=>{
  const {result,other}=focus({def:{id:'amoeba'},x:1,y:2},null,'plantcell');
  expect(result.selected).toBe(other);
 });
 it('leaves selection intact if the species is absent',()=>{
  const selected={def:{id:'amoeba'},x:1,y:2};
  expect(focus(selected,null,'missing').result.selected).toBe(selected);
 });
});
