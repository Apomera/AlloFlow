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

describe('tool discovery',()=>{
  it('finds tasks by ordinary words, keeps unavailable selection tools discoverable, and never mutates the catalog',()=>{
    expect(api.findWorkshopTools('roof',false).map(t=>t.id)).toEqual(['starters']);expect(api.findWorkshopTools('save',true)[0].id).toBe('save');expect(api.findWorkshopTools('camera',false)[0].id).toBe('select');expect(api.findWorkshopTools('PRINT SIZE',true).map(t=>t.id)).toContain('scale');expect(api.findWorkshopTools('json',true).map(t=>t.id)).toEqual(['save']);
    const result=api.findWorkshopTools('rotate',false);expect(result.find(t=>t.id==='transform').available).toBe(false);result[0].title='Changed';expect(api.findWorkshopTools('rotate',true).some(t=>t.title==='Changed')).toBe(false);expect(api.findWorkshopTools('zzzz',true)).toEqual([]);
  });
  it('focuses search, filters tools, opens a nested target, and preserves the project-name draft',()=>{
    const app=fixture.mount(),name=app.host.querySelector('#gwe-project-name');draft(name,'An unfinished name');app.click(app.host.querySelector('.gwe-tool-finder-toggle'));expect(document.activeElement).toBe(app.host.querySelector('#gwe-tool-query'));expect(app.host.querySelector('.gwe-builder-body').hidden).toBe(true);
    draft(app.host.querySelector('#gwe-tool-query'),'mm');expect(app.host.querySelectorAll('.gwe-tool-result')).toHaveLength(1);app.click(app.host.querySelector('[data-tool=scale]'));React.act(()=>vi.advanceTimersByTime(100));expect(app.host.querySelector('.gwe-scale-editor').closest('details').open).toBe(true);expect(app.host.querySelector('.gwe-builder-body').hidden).toBe(false);expect(app.host.querySelector('#gwe-project-name')).toBe(name);expect(name.value).toBe('An unfinished name');
  });
  it('provides an empty state and Escape returns focus to the finder toggle',()=>{
    const app=fixture.mount();app.click(app.host.querySelector('.gwe-tool-finder-toggle'));const input=app.host.querySelector('#gwe-tool-query');draft(input,'nothing matches this');expect(app.host.querySelector('.gwe-tool-count').textContent).toContain('No matching tools');React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));React.act(()=>vi.advanceTimersByTime(50));expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();expect(document.activeElement).toBe(app.host.querySelector('.gwe-tool-finder-toggle'));
  });
  it('explains unavailable actions and links to selection without mutating the world',()=>{
    const app=fixture.mount({retained:null}),blocks=Object.keys(app.engine.blocks);app.click(app.host.querySelector('.gwe-tool-finder-toggle'));const print=app.host.querySelector('[data-tool=print]');expect(print.disabled).toBe(true);expect(print.textContent).toContain('Select a creation first');app.click(app.host.querySelector('.gwe-finder-select'));React.act(()=>vi.advanceTimersByTime(100));expect(app.host.querySelector('.gwe-direct-controls').open).toBe(true);expect(Object.keys(app.engine.blocks)).toEqual(blocks);expect(app.engine._builderSelection).toBeNull();
  });
});
describe('preview review',()=>{
  it('reports target bounds and the net block count for a move or new structure',()=>{
    const additions=[{x:-2,y:1,z:0},{x:3,y:4,z:2}],facts=api.previewChangeFacts({additions,removals:[{},{}]});expect(facts).toMatchObject({count:2,net:0,width:6,depth:3,height:4});expect(api.previewChangeFacts({additions,removals:[]}).net).toBe(2);expect(api.previewChangeFacts({additions:[{x:0.5,y:1,z:0}]})).toBeNull();expect(api.previewChangeFacts({additions:[]})).toBeNull();
  });
  it('keeps Apply and Cancel in the fixed footer, then frames the proposal without committing geometry',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();const selection=e._builderSelection,undo=e._undoStack;app.click(app.button('Preview change'));expect(app.host.querySelector('.gwe-builder-footer').contains(app.button('Apply preview'))).toBe(true);app.click(app.button('Review in world'));expect(e.setViewPreset).toHaveBeenCalledWith('side',expect.objectContaining({radius:expect.any(Number)}));expect(app.state().sandboxDockCollapsed).toBe(true);expect(app.host.querySelector('.gwe-preview-review')).toBeTruthy();expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(e._builderSelection).toBe(selection);expect(e._undoStack).toBe(undo);expect(app.host.querySelectorAll('button').length).toBeGreaterThan(0);
    app.click(app.button('Back to tools'));expect(app.state().sandboxDockCollapsed).toBe(false);expect(app.button('Apply preview')).toBeTruthy();expect(e._buildBatchPreview).toBeTruthy();
  });
  it('Escape cancels a review and releases only its own outline',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));React.act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect(app.state().sandboxDockCollapsed).toBe(false);expect(app.button('Apply preview')).toBeUndefined();expect(e._buildBatchPreview).toBeNull();expect(e.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('rejects a replaced outline before camera review and keeps the original build intact',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));e._buildBatchPreview={owner:'someone-else'};app.click(app.button('Review in world'));expect(app.host.textContent).toContain('This outline was replaced');expect(e.setViewPreset).not.toHaveBeenCalled();expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(app.host.querySelector('.gwe-preview-review')).toBeNull();
  });
  it('applies from the review through the same explicit commit, and shows the result in the dock',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));app.click(app.button('Apply preview'));expect(e.commitBuildBatch).toHaveBeenCalledOnce();expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect(app.host.textContent).toContain('applied. Undo reverses the whole change.');expect(app.state().sandboxDockCollapsed).toBe(false);
  });
  it('refuses a stale lesson or preview without target cells',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));const overlay=e._buildBatchPreview,plan=overlay.plan;e._currentLesson={...e._currentLesson};expect(api.frameBuildPreview(app.ctx(),plan,overlay.owner).ok).toBe(false);expect(api.frameBuildPreview(app.ctx(),{...plan,additions:[]},overlay.owner).ok).toBe(false);expect(e.setViewPreset).not.toHaveBeenCalled();
  });
});

describe('review navigation recovery',()=>{
  it('opening Build tools exits the world review and keeps exactly one Apply action',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));app.click(app.host.querySelector('.gwe-collapse'));
    expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect([...app.host.querySelectorAll('button')].filter(b=>b.textContent==='Apply preview')).toHaveLength(1);expect(app.state().sandboxDockCollapsed).toBe(false);expect(e.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('looks across the broad side of a long depth-oriented proposal',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));const overlay=e._buildBatchPreview,plan={...overlay.plan,additions:[{x:0,y:1,z:0},{x:0,y:1,z:7}]};expect(api.frameBuildPreview(app.ctx(),plan,overlay.owner).ok).toBe(true);expect(e.setViewPreset).toHaveBeenCalledWith('front',expect.objectContaining({x:.5,z:4}));
  });
});

describe('unobstructed preview presentation',()=>{
  it('hides only scenery while reviewing and restores it when the user returns to tools',()=>{
    const app=fixture.mount(),e=previewBridge(app);e._landscape=new THREE.Group();e.setViewPreset=vi.fn();const blocks=Object.values(e.blocks);app.click(app.button('Preview change'));app.click(app.button('Review in world'));expect(e._landscape.visible).toBe(false);expect(Object.values(e.blocks)).toEqual(blocks);expect(blocks.every(b=>b.visible)).toBe(true);app.click(app.button('Back to tools'));expect(e._landscape.visible).toBe(true);
  });
  it('restores the original visibility after render-quality replacement without revealing scenery during studio presentation',()=>{
    const e={_landscape:new THREE.Group()},old=e._landscape,restore=api.suspendPreviewScenery(e);e._landscape=new THREE.Group();e._landscape.visible=false;restore();expect(old.visible).toBe(true);expect(e._landscape.visible).toBe(true);
    const finish=api.suspendPreviewScenery(e);e._showcase={studio:{hidden:[[e._landscape,false]]}};finish();expect(e._landscape.visible).toBe(false);expect(e._showcase.studio.hidden[0][1]).toBe(true);
  });
  it('preserves already hidden scenery when review ends',()=>{const e={_landscape:new THREE.Group()};e._landscape.visible=false;const restore=api.suspendPreviewScenery(e);restore();expect(e._landscape.visible).toBe(false);});
});
