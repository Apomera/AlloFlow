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


describe('accessible preview navigation',()=>{
 it('keeps view controls discoverable without expanding them over a phone preview by default',()=>{const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));const controls=app.host.querySelector('.gwe-preview-camera-tools');expect(controls).toBeTruthy();expect(controls.open).toBe(false);expect(controls.querySelectorAll('button')).toHaveLength(7);expect(controls.textContent).toContain('Pinch or scroll');});
 it('routes named views and zoom controls to the owned camera without committing blocks',()=>{const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));const controller={view:vi.fn(),zoom:vi.fn(),fit:vi.fn()};e._previewReviewCamera=controller;app.click(app.button('Top'));app.click(app.button('Closer'));app.click(app.button('Fit model'));expect(controller.view).toHaveBeenCalledWith('top');expect(controller.zoom).toHaveBeenCalledWith(1/1.18);expect(controller.fit).toHaveBeenCalled();expect(e.commitBuildBatch).not.toHaveBeenCalled();delete e._previewReviewCamera;});
 it('leaves review when settings open while keeping the unapplied proposal',()=>{const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));app.patch({showGameSettings:true});expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(e._buildBatchPreview).toBeTruthy();});
});
