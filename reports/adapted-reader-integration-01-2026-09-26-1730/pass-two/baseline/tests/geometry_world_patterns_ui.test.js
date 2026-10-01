import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let THREE,makeShape,fixture,api;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeAll(()=>{const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8'),helpers=source.slice(source.indexOf('const key='),source.indexOf('function precedes('));
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
});
afterEach(()=>{fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();delete window.__geoWorldEngine;});
function draft(input,value){React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}
function previewBridge(app){const e=app.engine;e.previewBuildBatch=vi.fn((additions,removals)=>({ok:true,additions,removals}));e.commitBuildBatch=vi.fn(()=>({ok:true}));e.cancelDrawing=vi.fn();e.setDrawMode=vi.fn(mode=>{e._drawMode=mode;app.ctx().updateMulti('geometryWorld',{drawMode:mode});});e.showBuildBatchPreview=vi.fn((plan,owner)=>{e._buildBatchPreview={owner,plan};});e.clearBuildBatchPreview=vi.fn(owner=>{if(e._buildBatchPreview?.owner===owner)e._buildBatchPreview=null;});return e;}

describe('discoverable precision building controls',()=>{
 function change(app,id,value){const e=app.host.querySelector('#'+id);React.act(()=>{const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,value);e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
 it('previews a repeat only after an explicit action, includes the original, and clears stale input previews',()=>{
  const app=fixture.mount(),e=previewBridge(app);change(app,'gwe-creation-edit-action','repeat');expect(e.previewBuildBatch).not.toHaveBeenCalled();change(app,'gwe-pattern-total','3');change(app,'gwe-pattern-gap','2');app.click(app.button('Preview change'));expect(e.previewBuildBatch).toHaveBeenCalledTimes(1);expect(app.host.textContent).toContain('Repeat creation · 3 total');expect(e._buildBatchPreview.plan.afterSelection.blocks.length).toBe(e._builderSelection.blocks.length*3);change(app,'gwe-pattern-gap','1');expect(app.button('Apply preview')).toBeUndefined();expect(e._buildBatchPreview).toBeNull();
 });
 it('offers labeled grid alignment and a ground-level shortcut without committing',()=>{
  const app=fixture.mount(),e=previewBridge(app);change(app,'gwe-creation-edit-action','align');app.click(app.button('Use ground level'));expect(app.host.querySelector('#gwe-align-axis').value).toBe('y');expect(app.host.querySelector('#gwe-align-coordinate').value).toBe('1');expect(e.commitBuildBatch).not.toHaveBeenCalled();change(app,'gwe-align-coordinate','4');app.click(app.button('Preview change'));expect(e._buildBatchPreview.plan.additions.every(b=>b.y>=4)).toBe(true);app.click(app.button('Apply preview'));expect(e.commitBuildBatch).toHaveBeenCalledTimes(1);
 });
 it('makes pattern and alignment searchable',()=>{expect(api.findWorkshopTools('repeat pattern',true).some(t=>t.id==='transform')).toBe(true);expect(api.findWorkshopTools('align grid',true).some(t=>t.id==='transform')).toBe(true);});
});
