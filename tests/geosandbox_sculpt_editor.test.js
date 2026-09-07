import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const SOURCE=process.env.GEO_SCULPT_SOURCE || 'stem_lab/stem_tool_geosandbox.js';
const box=extra=>({shape:'box',size:[1,1,1],position:[0,0.5,0],rotation:[0,0,0],color:'#60a5fa',...extra});
let cfg,P,mounted;
beforeAll(()=>{resetStemLab();cfg=loadTool(SOURCE,'geoSandbox');P=window.StemLab.geoPure;});
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.container.remove();mounted=null;}});
function mount(bucket={}){
 const container=document.createElement('div');document.body.appendChild(container);
 const view={container,state:null,update:null,root:ReactDOMClient.createRoot(container)};
 function Host(){const[data,setData]=React.useState({_threeLoaded:true,geoSandbox:{mode:'sculpt',sculptRecipe:{parts:[box()]},...bucket}});view.state=data.geoSandbox;view.update=patch=>setData(p=>({...p,geoSandbox:{...p.geoSandbox,...patch}}));return cfg.render(makeCtx({toolData:data,setToolData:setData}));}
 mounted=view;React.act(()=>view.root.render(React.createElement(Host)));return view;
}
function button(pattern,scope){const node=[...(scope||mounted.container).querySelectorAll('button')].find(el=>pattern.test(el.textContent.trim()));expect(node).toBeTruthy();return node;}
function click(node){expect(node).toBeTruthy();React.act(()=>node.click());}
function edit(){click(mounted.container.querySelector('#geo-sculpt-tab-edit'));}
function input(label){const node=mounted.container.querySelector('[aria-label="'+label+'"]');expect(node).toBeTruthy();return node;}
function setValue(node,value,blur=false){React.act(()=>{const proto=node.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(node,String(value));node.dispatchEvent(new window.Event('input',{bubbles:true}));node.dispatchEvent(new window.Event('change',{bubbles:true}));if(blur)node.dispatchEvent(new window.FocusEvent('focusout',{bubbles:true}));});}
const undo=()=>click(button(/^↶ Undo$/));
const redo=()=>click(button(/^Redo$/));
function rotate(v,r){const [a,b,c]=r.map(n=>n*Math.PI/180),cz=Math.cos(c),sz=Math.sin(c),cb=Math.cos(b),sb=Math.sin(b),ca=Math.cos(a),sa=Math.sin(a);const z=[cz*v[0]-sz*v[1],sz*v[0]+cz*v[1],v[2]],y=[cb*z[0]+sb*z[2],z[1],-sb*z[0]+cb*z[2]];return[y[0],ca*y[1]-sa*y[2],sa*y[1]+ca*y[2]];}

describe('Sculpt arrangement fidelity',()=>{
 it.each(['x','y','z'])('mirrors a rotated cone across %s with an exact reflected orientation',axis=>{
  const original=box({shape:'cone',position:[1,2,-0.8],rotation:[20,-35,70]});
  const copy=P.geoSculptCopyPart(original,axis,0,1,true),sample=[0.3,0.7,0.2],local=sample.slice(),i={x:0,y:1,z:2}[axis];
  local[axis==='z'?2:0]*=-1;
  const expected=rotate(local,original.rotation).map((n,k)=>n+original.position[k]);expected[i]*=-1;
  const actual=rotate(sample,copy.rotation).map((n,k)=>n+copy.position[k]);
  actual.forEach((n,k)=>expect(n).toBeCloseTo(expected[k],12));
  expect(copy.size).toEqual(original.size);
 });
 it('uses display-unit copy spacing at the whole-sculpture scale',()=>{const copy=P.geoSculptCopyPart(box(),'z',-2,2,false);expect(copy.position[2]*5.2).toBeCloseTo(-2,12);});
 it('refuses copies and reflections outside position bounds rather than moving them elsewhere',()=>{expect(P.geoSculptCopyPart(box({position:[3.9,0.5,0]}),'x',2,1,false)).toBeNull();expect(P.geoSculptCopyPart(box({position:[0,6,0]}),'y',0,1,true)).toBeNull();});
 it('snaps in the displayed unit system while preserving other part data',()=>{const p=box({label:'Pier',group:'Bridge',position:[0.39,0.51,-0.4]}),q=P.geoSculptSnapPart(p,0.5,2);q.position.forEach(n=>expect(n*5.2/0.5).toBeCloseTo(Math.round(n*5.2/0.5),12));expect(q.label).toBe('Pier');expect(q.group).toBe('Bridge');expect(p.position).toEqual([0.39,0.51,-0.4]);});
 it('converts semantic dimensions when explicitly switching primitive',()=>{const q=P.geoSculptReshapePart(box({size:[2,3,2],label:'Tower',partId:'tower'}),'cylinder');expect(q.size.slice(0,2)).toEqual([1,3]);expect(q.label).toBe('Tower');expect(q.partId).toBe('tower');});
});

describe('Sculpt editor controls',()=>{
 it('presents three compact views and keeps the part picker available in Edit',()=>{const view=mount();expect(view.container.querySelector('#geo-sculpt-panel-parts').hidden).toBe(false);expect(view.container.querySelector('#geo-sculpt-panel-project').hidden).toBe(true);edit();expect(view.container.querySelector('#geo-sculpt-panel-edit').hidden).toBe(false);expect(view.container.querySelector('#geo-sculpt-panel-parts').hidden).toBe(true);expect(view.container.querySelector('#geo-sculpt-panel-edit [aria-label="Sculpture parts"]')).toBeTruthy();expect(view.container.querySelector('#geo-part-inspector')).toBeTruthy();});
 it('adds an intentional primitive from an empty project',()=>{const view=mount({sculptRecipe:null});click(input('Add cone'));expect(view.state.sculptRecipe.parts).toHaveLength(1);expect(view.state.sculptRecipe.parts[0].shape).toBe('cone');undo();expect(view.state.sculptRecipe).toBeNull();redo();expect(view.state.sculptRecipe.parts[0].shape).toBe('cone');});
 it('changes selected primitive without discarding its name and restores it with Undo',()=>{const view=mount({sculptRecipe:{parts:[box({label:'Tower',size:[2,3,2]})]}});edit();setValue(input('Primitive shape'),'cylinder');expect(view.state.sculptRecipe.parts[0].shape).toBe('cylinder');expect(view.state.sculptRecipe.parts[0].label).toBe('Tower');expect(view.state.sculptRecipe.parts[0].size.slice(0,2)).toEqual([1,3]);undo();expect(view.state.sculptRecipe.parts[0].shape).toBe('box');});
 it('copies along the selected direction with chosen spacing as one reversible edit',()=>{const view=mount({sculptRecipe:{scale:2,parts:[box()]}});edit();setValue(input('Local copy axis'),'z');setValue(input('Direction'),'-1');setValue(input('Copy spacing (u)'),2,true);click(button(/^Duplicate$/));expect(view.state.sculptRecipe.parts).toHaveLength(2);expect(view.state.sculptRecipe.parts[1].position[2]*5.2).toBeCloseTo(-2,12);undo();expect(view.state.sculptRecipe.parts).toHaveLength(1);redo();expect(view.state.sculptRecipe.parts).toHaveLength(2);});
 it('reports a refused copy without changing geometry or losing Redo',()=>{const view=mount({sculptRecipe:{parts:[box({position:[3.9,0.5,0]})]}});edit();setValue(input('Rotation Z (°)'),15,true);undo();const before=JSON.stringify(view.state.sculptRecipe);click(button(/^Duplicate$/));expect(JSON.stringify(view.state.sculptRecipe)).toBe(before);expect(view.container.querySelector('.geo-status').textContent).toContain('outside');expect(button(/^Redo$/).disabled).toBe(false);});
 it('applies a material to unlocked group members in one undo step',()=>{const view=mount({sculptRecipe:{parts:[box({group:'pair'}),box({group:'pair',position:[1,0.5,0]}),box({group:'pair',locked:true,position:[2,0.5,0]})]}});edit();setValue(input('Apply material to'),'group');click(input('Apply material Steel'));expect(view.state.sculptRecipe.parts.map(p=>p.finish)).toEqual(['metal','metal',undefined]);expect(view.state.sculptRecipe.parts[2].color).toBe('#60a5fa');undo();expect(view.state.sculptRecipe.parts.every(p=>p.color==='#60a5fa')).toBe(true);redo();expect(view.state.sculptRecipe.parts[1].color).toBe('#91a4b6');});
 it('respects locks in exact transforms while still allowing an unlocked copy',()=>{const view=mount({sculptRecipe:{parts:[box({locked:true,label:'Anchor'})]}});edit();expect(input('Primitive shape').disabled).toBe(true);expect(input('Width (u)').disabled).toBe(true);expect(input('Apply material Steel').disabled).toBe(true);click(button(/^Duplicate$/));expect(view.state.sculptRecipe.parts[1].locked).toBe(false);expect(view.state.sculptRecipe.parts[0].locked).toBe(true);});
 it('resets rotations and snaps positions with independent undo steps',()=>{const view=mount({sculptRecipe:{parts:[box({position:[0.39,0.51,-0.4],rotation:[20,30,40]})]}});edit();click(button(/^Reset rotation$/));expect(view.state.sculptRecipe.parts[0].rotation).toEqual([0,0,0]);click(button(/^Snap to step$/));undo();expect(view.state.sculptRecipe.parts[0].position).toEqual([0.39,0.51,-0.4]);undo();expect(view.state.sculptRecipe.parts[0].rotation).toEqual([20,30,40]);});
 it('edits exact project scale and rotation without changing primitive dimensions',()=>{const view=mount();click(view.container.querySelector('#geo-sculpt-tab-project'));setValue(input('Whole sculpture scale'),2.25,true);setValue(input('Whole sculpture rotation (°)'),35,true);expect(view.state.sculptRecipe.scale).toBe(2.25);expect(view.state.sculptRecipe.rotY).toBe(35);expect(view.state.sculptRecipe.parts[0].size).toEqual([1,1,1]);undo();expect(view.state.sculptRecipe.rotY).toBe(0);expect(view.state.sculptRecipe.scale).toBe(2.25);});
});


describe('Sculpt exact project value commits',()=>{
 it('keeps intermediate typed values as drafts and commits the final value as one undo step',()=>{
  const view=mount();click(view.container.querySelector('#geo-sculpt-tab-project'));
  const field=input('Whole sculpture scale'),before=JSON.stringify(view.state.sculptRecipe);
  React.act(()=>field.focus());
  setValue(field,1.5);setValue(field,2.25);
  expect(JSON.stringify(view.state.sculptRecipe)).toBe(before);
  React.act(()=>field.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true})));
  expect(view.state.sculptRecipe.scale).toBe(2.25);
  undo();expect(view.state.sculptRecipe.scale).toBe(1);
  expect(button(/^↶ Undo$/).disabled).toBe(true);
  redo();expect(view.state.sculptRecipe.scale).toBe(2.25);
 });
 it('does not create an undo step when an out-of-range draft normalizes to the current limit',()=>{
  const view=mount({sculptRecipe:{parts:[box()],scale:5}});click(view.container.querySelector('#geo-sculpt-tab-project'));
  setValue(input('Whole sculpture scale'),9,true);
  expect(view.state.sculptRecipe.scale).toBe(5);
  expect(button(/^↶ Undo$/).disabled).toBe(true);
 });
});
