import { beforeEach, describe, it, expect } from 'vitest';
import { loadTool, resetStemLab, makeCtx, newStore, renderTool } from './helpers/stem_widgets_smoke_harness.js';
let E;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_treelab.js','treeLab');E=window.__alloTreeLabEngine;});
function nodes(node,out=[]){if(!node)return out;if(Array.isArray(node)){node.forEach(n=>nodes(n,out));return out;}if(typeof node==='object'){out.push(node);nodes(node.props?.children,out);}return out;}
function renderState(data={}){const store=newStore({treeLab:data});const tree=window.StemLab._registry.treeLab.render(makeCtx({},store));return {store,tree,button:nodes(tree).find(n=>n.type==='button'&&n.key==='specimen')};}
describe('Tree Lab field-guide starting point',()=>{
 it('keeps the initial seedling and progress unchanged until the learner chooses a specimen',()=>{
  const original={speciesId:'oak',light:.3};
  const {store,button}=renderState(original);
  expect(button).toBeTruthy();expect(store.toolData.treeLab).toEqual(original);
  expect(renderTool('treeLab',{treeLab:{}})).toContain('its earlier rings are a simulated history');
 });
 it('produces a living 40-year specimen with authentic history for every species',()=>{
  for(const sp of E.SPECIES){
   const {store,button}=renderState({speciesId:sp.id,light:.1,soilWater:.2,experimentTrials:{stale:true}});
   button.props.onClick();
   const d=store.toolData.treeLab,env={tempC:22,light:.8,soilWater:.7,co2ppm:420};
   let expected=E.newTree(sp.id);
   for(let i=1;i<40;i++)expected=E.simulateYear(expected,sp,env,E.normaliseAlloc());
   expect(d.tree,sp.id).toEqual(expected);
   expect(d.tree.alive,sp.id).toBe(true);expect(d.tree.age,sp.id).toBe(40);
   expect(d.tree.rings.length,sp.id).toBe(39);expect(d.tree.history.length,sp.id).toBe(39);
   expect(d.discovery,sp.id).toBeNull();expect(d.experimentTrials,sp.id).toEqual({});
   expect(d.light).toBe(.8);expect(d.soilWater).toBe(.7);expect(d.playing).toBe(false);
   expect(d.discoveries).toEqual({});expect(d.fieldNotes).toEqual([]);
  }
 });
 it('does not offer the shortcut once the learner has made a prediction',()=>{
  const {button}=renderState({discovery:{prediction:'less'}});
  expect(button).toBeUndefined();
 });
 it('does not replace a growing tree or a saved comparison',()=>{
  let tree=E.simulateYear(E.newTree('oak'),E.speciesById('oak'),{tempC:22,light:.8,soilWater:.7,co2ppm:420},E.normaliseAlloc());
  expect(renderState({tree}).button).toBeUndefined();
  expect(renderState({fieldNotes:[{explanation:'My earlier finding'}]}).button).toBeUndefined();
  const record=E.runDroughtDiscovery(tree,'oak',{tempC:22,light:.8,soilWater:.7,co2ppm:420},E.normaliseAlloc());
  expect(renderState({discovery:{prediction:'less',record}}).button).toBeUndefined();
 });
 it('hides quick-growth shortcuts while an experiment owns the conditions',()=>{
  const tree=E.newTree('oak');
  const html=renderTool('treeLab',{treeLab:{discoveryMode:'free',experiment:{phase:'predict',baseline:{tree,speciesId:'oak',env:{},alloc:{}}}}});
  const host=document.createElement('div');host.innerHTML=html;
  expect(host.querySelector('.allo-tree-field-play')).toBeNull();
  expect(host.querySelector('.allo-tree-field-tools').open).toBe(true);
 });
 it('gives quick controls separate labels and disables water during a scheduled drought',()=>{
  const html=renderTool('treeLab',{treeLab:{discoveryMode:'free',droughtYears:[1]}});
  const host=document.createElement('div');host.innerHTML=html;
  expect(host.querySelector('#treelab-field-water').disabled).toBe(true);
  expect(host.querySelectorAll('#treelab-field-water')).toHaveLength(1);
  expect(host.querySelector('label[for="treelab-field-water"]')).not.toBeNull();
 });
});
