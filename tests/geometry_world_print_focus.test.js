import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');let api,makeShape;const engines=[];
beforeAll(()=>{window.THREE=THREE;const s=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(s.slice(s.indexOf('  function createShapeGeometry('),s.indexOf('  // Format fractional volume for display'))+';return createShapeGeometry;')();});
beforeEach(()=>{window.THREE=THREE;const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(){return null;}});new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;});
afterEach(()=>{for(const e of engines.splice(0)){api.disposeGeometryPrintGuide(e);Object.values(e.blocks).forEach(m=>{m.geometry.dispose();m.material.dispose();});}delete window.__geoWorldEngine;});
function fixture(specs){const e={scene:new THREE.Scene(),blocks:{},_popBlocks:[],_undoStack:[{action:'place'}],_redoStack:[],_currentLesson:{sandbox:true}};engines.push(e);
 for(const b of specs){const shape=b.shape||'cube',m=new THREE.Mesh(makeShape(shape),new THREE.MeshStandardMaterial());m.position.set(b.x+.5,b.y+(shape==='halfB'?.25:shape==='cube'?.5:0),b.z+.5);m.rotation.y=(b.rotation||0)*Math.PI/2;m.updateMatrixWorld(true);m.userData={gridPos:{x:b.x,y:b.y,z:b.z},blockType:b.type||'stone',shape,rotation:b.rotation||0,_measurementLayer:b.ground?'ground':'student',_lessonBlock:!!b.ground};e.blocks[[b.x,b.y,b.z].join(',')]=m;}return e;}
const cells=e=>Object.values(e.blocks).filter(m=>!m.userData._lessonBlock).map(m=>m.userData.gridPos);
const profile={bedWidthMm:50,bedDepthMm:60,bedHeightMm:70};

function context(e){e._builderSelection={blocks:cells(e),exact:true};e.camera=new THREE.PerspectiveCamera(60,.5,.1,2000);e.setViewPreset=vi.fn(()=>true);window.__geoWorldEngine=e;
  const ctx={toolData:{geometryWorld:{worldActive:true,builderPrintGuide:true,builderPrintContext:{unitMm:20}},printLab:{profile}},updateMulti(tool,patch){Object.assign(this.toolData[tool],patch);},announceToSR:vi.fn()};api.syncGeometryPrintGuide(e,ctx);return ctx;
}
function checked(e,ctx){const bundle=api.buildGeometryWorldStl(e,cells(e));ctx.toolData.geometryWorld.builderPrintCheck={...bundle.topology,contactGroups:bundle.contactGroups,selectionSignature:ctx.toolData.geometryWorld.builderPrintGuideSummary.selectionSignature};api.syncGeometryPrintGuide(e,ctx);}
describe('focused print inspection',()=>{
  it('frames a separate piece without changing selection, blocks, or undo history',()=>{
    const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0,shape:'halfB'}]),ctx=context(e);checked(e,ctx);const selection=e._builderSelection,history=e._undoStack,blocks=Object.values(e.blocks);
    const result=api.focusGeometryPrintIssue(ctx,'part',2);expect(result.ok).toBe(true);expect(result.blocks).toBe(1);expect(e._builderSelection).toBe(selection);expect(e._undoStack).toBe(history);expect(Object.values(e.blocks)).toEqual(blocks);expect(e.setViewPreset).toHaveBeenCalledWith('front',expect.objectContaining({x:3.5,y:4.25,z:.5}));expect(ctx.toolData.geometryWorld.sandboxDockCollapsed).toBe(true);
    api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide.getObjectByName('gwe-print-issue-focus')).toBeTruthy();
  });
  it('can inspect overflow while topology is pending and clears an obsolete highlight after rescaling',()=>{
    const e=fixture([{x:0,y:1,z:0},{x:3,y:1,z:0}]),ctx=context(e);expect(api.focusGeometryPrintIssue(ctx,'overflow').ok).toBe(true);api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide.children).toHaveLength(2);
    ctx.toolData.geometryWorld.builderPrintContext.unitMm=5;api.syncGeometryPrintGuide(e,ctx);expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(e._builderPrintGuide.children).toHaveLength(1);expect(api.focusGeometryPrintIssue(ctx,'overflow').ok).toBe(false);
  });
  it('refuses stale piece checks and disposes highlight resources when the selection changes',()=>{
    const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0}]),ctx=context(e);checked(e,ctx);api.focusGeometryPrintIssue(ctx,'part',2);api.syncGeometryPrintGuide(e,ctx);const focus=e._builderPrintGuide.getObjectByName('gwe-print-issue-focus'),geometry=vi.spyOn(focus.geometry,'dispose'),material=vi.spyOn(focus.material,'dispose');
    e._builderSelection={blocks:[cells(e)[0]],exact:true};expect(api.focusGeometryPrintIssue(ctx,'part',2).ok).toBe(false);api.syncGeometryPrintGuide(e,ctx);expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(geometry).toHaveBeenCalledOnce();expect(material).toHaveBeenCalledOnce();
  });
  it('clears focus on a new lesson even when its block signature is identical',()=>{const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0}]),ctx=context(e);checked(e,ctx);api.focusGeometryPrintIssue(ctx,'part',2);api.syncGeometryPrintGuide(e,ctx);e._currentLesson={sandbox:true};api.syncGeometryPrintGuide(e,ctx);expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(e._builderPrintGuide.children).toHaveLength(1);});
  it('hides the guide behind Home and clears all inspection state when switched off',()=>{const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0}]),ctx=context(e);checked(e,ctx);api.focusGeometryPrintIssue(ctx,'part',2);api.syncGeometryPrintGuide(e,ctx);ctx.toolData.geometryWorld.showGeometryHome=true;api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide.visible).toBe(false);ctx.toolData.geometryWorld.builderPrintGuide=false;api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide).toBeNull();expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(ctx.toolData.geometryWorld.builderPrintGuideSummary).toBeNull();});
});
