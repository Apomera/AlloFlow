import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { File } from 'node:buffer';
import JSZip from 'jszip';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const apps = [];
const load = path => new Function(readFileSync(path,'utf8'))();
const cube = {type:'wood',shape:'cube',rotation:0};
const glass = {type:'glass',shape:'halfA',rotation:1};
const rotated = {type:'wood',shape:'cube',rotation:2};
let THREE, makeShape;

beforeAll(() => {
  THREE = {};
  new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
  const core = readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape = new Function('window',core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')({THREE});
});
beforeEach(() => {
  const lab = resetStemLab();lab.registerTool('geometryWorld',{render(){}});
  vi.stubGlobal('THREE',THREE);vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('JSZip',JSZip);window.AlloModules = {};
  load('stem_lab/stem_tool_geometryworld_builder.js');load('printable_model_module.js');load('prim3d_module.js');load('stem_lab/geometry_print_package.js');load(process.env.GW_REVISION_FOCUS_CANDIDATE || 'stem_lab/stem_tool_printlab.js');
});
afterEach(() => {
  for (const {root,host} of apps.splice(0)) { React.act(()=>root.unmount());host.remove(); }
  vi.restoreAllMocks();vi.unstubAllGlobals();
  for (const key of ['__alloPrintLabPendingHandoff','__alloPrintLabPackageEditSession','__alloPrintLabGeometrySession','__alloGeometryWorldPendingBuild','__alloGeometryWorldReturnProject'])delete window[key];
});

function changes() {
  const row=(x,before,after)=>({x,y:1,z:0,before,after});
  return {added:9,removed:2,modified:2,unchanged:5,materialChanged:1,shapeChanged:1,rotationChanged:2,
    entries:[row(-10,cube,null),row(-9,cube,null),...Array.from({length:9},(_,i)=>row(i-8,null,cube)),row(1,cube,glass),row(2,cube,rotated)]};
}
function mount(data={}) {
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host),ctx=makeCtx({toolData:{printLab:data},setStemLabTool:vi.fn(),announceToSR:vi.fn()});
  ctx.setToolData=change=>{ctx.toolData=typeof change==='function'?change(ctx.toolData):change;};
  React.act(()=>root.render(React.createElement(function Host(){return window.StemLab._registry.printLab.render(ctx);})));apps.push({host,root,ctx});
  return host;
}
function revisedBlocks() {
  return Array.from({length:16},(_,i)=>{const x=i-8;return {x,y:1,z:0,...(x===1?glass:x===2?rotated:cube)};});
}
function mountRevision(delta=changes(),workspace) {
  const blocks=revisedBlocks(),meshes={};
  for(const block of blocks){
    const mesh=new THREE.Mesh(makeShape(block.shape));mesh.position.set(block.x,block.y,block.z);mesh.rotation.y=block.rotation*Math.PI/2;mesh.updateMatrixWorld(true);
    mesh.userData={gridPos:{x:block.x,y:block.y,z:block.z},blockType:block.type,shape:block.shape,rotation:block.rotation,_measurementLayer:'student'};
    meshes[[block.x,block.y,block.z].join(',')]=mesh;
  }
  const bundle=window.StemLab.geometryWorldBuilderPure.buildGeometryWorldStl({blocks:meshes},blocks);
  for(const mesh of Object.values(meshes)){mesh.geometry.dispose();mesh.material.dispose();}
  const previousCount=delta.removed+delta.modified+delta.unchanged;
  const previousDimensions={width:90,depth:5,height:5};
  const packageReview={revisionId:'cell-review',revisionNumber:2,title:'Span',previousBlockCount:previousCount,previousDimensions,materialId:'PETG',printTurnDegrees:0,blockChanges:delta,
    referencePrint:{basis:'package',dimensions:previousDimensions,unitMm:5,materialId:'PLA',printTurnDegrees:0}};
  window.__alloPrintLabPackageEditSession={id:packageReview.revisionId};
  window.__alloPrintLabPendingHandoff={schema:'alloflow-print-source/1',id:'new-model',projectId:'new-model',sourceTool:'geometryWorld',format:'STL',bytes:new Uint8Array(bundle.buffer),sourceModel:bundle.sourceModel,unitMm:10,packageReview};
  if(workspace){
    window.__alloGeometryWorldReturnProject={id:'new-model',blocks:blocks.map(block=>({...block})),packageReview:{...packageReview}};
    if(typeof workspace==='function')workspace(window.__alloGeometryWorldReturnProject);
  }
  return mount({packageEditId:packageReview.revisionId});
}
function button(container,label) {
  const found=[...container.querySelectorAll('button')].find(node=>node.textContent.trim()===label);
  expect(found,label).toBeTruthy();return found;
}
// Native keyboard activation dispatches a click with detail 0 on the focused control.
function activate(node) {React.act(()=>{node.focus();node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:0}));});}
function changeText(input,value) {
  const prototype=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
  React.act(()=>{Object.getOwnPropertyDescriptor(prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});
}
function filter(details,value) {
  const select=details.querySelector('[data-print-change-filter]');expect(select.tagName).toBe('SELECT');expect(select.labels.length).toBeGreaterThan(0);
  React.act(()=>{select.focus();select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});return select;
}
function rows(details){return [...details.querySelectorAll('[data-print-change-row]')];}
function assertCount(summary,label,count) {
  const term=[...summary.querySelectorAll('dl dt')].find(node=>node.textContent===label);
  expect(term,label+' count').toBeTruthy();expect(term.nextElementSibling.textContent).toBe(String(count));
}
function assertReceivingBedFinding(host) {
  expect(document.activeElement).toBe(host.querySelector('#preflight-report-title'));
  expect(host.querySelector('#print-lab-report-summary').textContent).toContain('1 blocking item');
  expect(host.querySelector('[data-print-revision-findings]').textContent).toContain('Width is 160 mm, 110 mm over the 50 mm printer limit.');
}

function savedComparison(delta=changes()) {
  const previous={basis:'package',dimensions:{width:90,depth:5,height:5},unitMm:5,materialId:'PLA',printTurnDegrees:0};
  const current={basis:'working',dimensions:{width:160,depth:10,height:10},unitMm:10,materialId:'PETG',printTurnDegrees:0};
  // The complete count is 9 additions. The portable sample stores only 8.
  return {schema:'geometry-world-changes/1',previous,current,blockChanges:{...delta,entries:delta.entries.filter(e=>e.x!==0)}};
}
async function archive(history,editableCount) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(160,10,10));
  const stl=new Uint8Array(window.AlloModules.PrintableModel.exportBinaryStl(THREE,mesh));mesh.geometry.dispose();mesh.material.dispose();
  const manifest={schema:'alloflow-print-package/1',title:'Span',material:'PETG',model:{file:'model.stl',units:'mm',coordinateSystem:'z-up',sha256:createHash('sha256').update(stl).digest('hex'),dimensionsMm:{width:160,depth:10,height:10}},
    source:{tool:'geometryWorld',millimetersPerBlock:10,editableFile:null,printTurnDegrees:0,revisionNumber:2},preflight:{status:'PASS'}};
  if(history)manifest.revisionComparison=history;
  const zip=new JSZip();
  if(editableCount){manifest.source.editableFile='editable-world.json';zip.file('editable-world.json',JSON.stringify({schema:'alloflow-geometry-world/2',title:'Span',blocks:revisedBlocks().slice(0,editableCount)}));}
  zip.file('manifest.json',JSON.stringify(manifest));zip.file('model.stl',stl);
  return new File([await zip.generateAsync({type:'uint8array'})],'span-v2-print-package.zip',{type:'application/zip'});
}
async function reopen(history,editableCount) {
  // A smaller receiving bed deliberately fails, even though the saved STL was accepted by its earlier profile.
  const host=mount({profile:{bedWidthMm:50,bedDepthMm:100,bedHeightMm:50}}),file=await archive(history,editableCount);
  const input=host.querySelector('[data-print-package-open] input[type=file]');
  React.act(()=>{Object.defineProperty(input,'files',{configurable:true,value:[file]});input.dispatchEvent(new Event('change',{bubbles:true}));});
  await vi.waitFor(async()=>{await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,1));});expect(host.querySelector('[data-print-package-preview]')).toBeTruthy();});
  activate(button(host,'Open for preflight'));return host;
}

describe('reviewing changes by grid cell',()=>{
  it.each([['added',-8,cube],['modified',1,glass]])('opens the current %s cell in its signed editing coordinates without starting another revision',(kind,x,recipe)=>{
    const host=mountRevision(changes(),true),app=apps.at(-1),saved=window.__alloGeometryWorldReturnProject;
    const baseline=JSON.stringify(saved);
    const details=host.querySelector('[data-print-change-details]');activate(details.querySelector('summary'));filter(details,kind);
    const action=details.querySelector('[data-print-inspect-cell]');expect(action).toBeTruthy();
    expect(action.getAttribute('aria-label')).toBe('Inspect block at X '+x+', Y 1, Z 0 in Geometry World');
    activate(action);
    expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld');
    const pending=window.__alloGeometryWorldPendingBuild;
    expect(pending).toMatchObject({projectId:'new-model',printContext:{unitMm:10,inspect:{kind:'cell',cell:{x,y:1,z:0},recipe},packageReview:{revisionId:'cell-review',revisionNumber:2}}});
    expect(pending.printContext.packageReview.blockChanges).toEqual(changes());
    expect(JSON.stringify(saved)).toBe(baseline);
    expect(window.__alloPrintLabPackageEditSession.id).toBe('cell-review');
  });

  it('carries the latest typed print details and applied scale when inspecting the current block',()=>{
    const host=mountRevision(changes(),true);
    activate(button(host,'4. Submit'));changeText(host.querySelector('#print-lab-model-title'),'Current revision title');
    const note=[...host.querySelectorAll('label')].find(label=>label.textContent.includes('Design note for the reviewer')).querySelector('textarea');changeText(note,'Check the changed corner.');
    activate(button(host,'1. Design'));changeText(host.querySelector('#print-lab-scale-input'),'7.5');activate(button(host,'Apply scale'));
    activate(button(host,'3. Materials'));
    const filament=[...host.querySelectorAll('button[aria-pressed]')].find(node=>node.firstElementChild.textContent==='PLA');activate(filament);
    activate(button(host,'2. Preflight'));
    changeText(host.querySelector('#print-lab-profile-bedWidthMm'),'50');changeText(host.querySelector('#print-lab-profile-bedDepthMm'),'200');activate(button(host,'Apply printer profile'));
    activate(button(host,'Preview 90° turn'));activate(button(host,'Apply 90° turn'));
    const details=host.querySelector('[data-print-change-details]');activate(details.querySelector('summary'));filter(details,'modified');
    activate(details.querySelector('[data-print-inspect-cell]'));
    expect(window.__alloGeometryWorldPendingBuild.printContext).toMatchObject({unitMm:7.5,inspect:{kind:'cell',cell:{x:1,y:1,z:0},recipe:glass},packageReview:{revisionId:'cell-review',revisionNumber:2,title:'Current revision title',studentNote:'Check the changed corner.',materialId:'PLA',printTurnDegrees:90,
      referencePrint:{unitMm:5,printTurnDegrees:0},blockChanges:changes()}});
  });

  it.each(['missing workspace','different project','different revision','missing block','different recipe'])('omits the direct inspection action for a %s',reason=>{
    const alter=project=>{
      if(reason==='different project')project.id='another-project';
      if(reason==='different revision')project.packageReview.revisionId='another-revision';
      if(reason==='missing block')project.blocks=[];
      if(reason==='different recipe')project.blocks.forEach(block=>{block.type='gold';});
    };
    const host=mountRevision(changes(),reason==='missing workspace'?undefined:alter);
    const details=host.querySelector('[data-print-change-details]');activate(details.querySelector('summary'));filter(details,'modified');
    expect(details.querySelector('[data-print-inspect-cell]')).toBeNull();
    expect(rows(details)).toHaveLength(2);
  });

  it('never offers a removed block and rechecks a visible action if its workspace changes before activation',()=>{
    const host=mountRevision(changes(),true),app=apps.at(-1);
    const details=host.querySelector('[data-print-change-details]');activate(details.querySelector('summary'));filter(details,'removed');
    expect(rows(details)).toHaveLength(2);expect(details.querySelector('[data-print-inspect-cell]')).toBeNull();
    filter(details,'modified');const action=details.querySelector('[data-print-inspect-cell]');expect(action).toBeTruthy();
    window.__alloGeometryWorldReturnProject.id='another-project';activate(action);
    expect(app.ctx.setStemLabTool).not.toHaveBeenCalled();expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
    expect(app.ctx.announceToSR).toHaveBeenCalledWith(expect.stringContaining('no longer available'));
  });

  it('opens a native disclosure, filters by edit kind, and keeps paging buttons focused at the bounds',()=>{
    const host=mountRevision(),summary=host.querySelector('[data-print-block-changes]');expect(summary).toBeTruthy();
    const details=summary.querySelector('[data-print-change-details]');expect(details.tagName).toBe('DETAILS');expect(details.open).toBe(false);
    const heading=details.querySelector('summary');activate(heading);expect(details.open).toBe(true);expect(document.activeElement).toBe(heading);
    expect([...filter(details,'added').options].map(option=>option.value)).toEqual(['all','added','removed','modified']);
    expect(rows(details)).toHaveLength(6);expect(rows(details)[0].textContent).toMatch(/-8/);
    const next=button(details,'Next cells'),previous=button(details,'Previous cells');
    activate(next);expect(rows(details)).toHaveLength(3);expect(document.activeElement).toBe(next);expect(next.getAttribute('aria-disabled')).toBe('true');
    const atEnd=rows(details).map(row=>row.textContent);activate(next);expect(rows(details).map(row=>row.textContent)).toEqual(atEnd);
    activate(previous);expect(rows(details)).toHaveLength(6);expect(document.activeElement).toBe(previous);expect(previous.getAttribute('aria-disabled')).toBe('true');
    activate(next);const select=filter(details,'modified');expect(document.activeElement).toBe(select);expect(rows(details)).toHaveLength(2);
    const changed=rows(details)[0].textContent;expect(changed).toMatch(/before/i);expect(changed).toMatch(/after/i);expect(changed).toMatch(/wood/i);expect(changed).toMatch(/glass/i);expect(changed).toMatch(/diagonal half/i);expect(changed).toMatch(/90\s*°/);
    expect(rows(details)[1].textContent).toMatch(/180\s*°/);filter(details,'removed');expect(rows(details)).toHaveLength(2);expect(rows(details)[0].textContent).toMatch(/-10/);
    filter(details,'all');expect(rows(details)).toHaveLength(6);expect(rows(details)[0].textContent).toMatch(/-10/);
    assertCount(summary,'Added',9);assertCount(summary,'Removed',2);assertCount(summary,'Edited',2);assertCount(summary,'Unchanged',5);
    expect(summary.textContent).toContain('1 with a different block material');expect(summary.textContent).toContain('1 with a different shape');expect(summary.textContent).toContain('2 with a different rotation');
  });
  it('reports unchanged geometry independently of a different physical scale',()=>{
    const delta={added:0,removed:0,modified:0,unchanged:16,materialChanged:0,shapeChanged:0,rotationChanged:0,entries:[]};
    const host=mountRevision(delta),summary=host.querySelector('[data-print-block-changes]');expect(summary).toBeTruthy();
    assertCount(summary,'Unchanged',16);expect(rows(summary)).toHaveLength(0);expect(summary.textContent).toContain('positions, materials, shapes, and rotations are unchanged');
    const report=host.querySelector('[data-print-revision-summary]');expect(report.textContent).toMatch(/5\s*mm/);expect(report.textContent).toMatch(/10\s*mm/);
  });
  it('keeps the live revision check but omits a change list whose final total disagrees with the actual source',()=>{
    const delta=changes();delta.unchanged=4; // 15 alleged current cells, but the handoff carries 16.
    const host=mountRevision(delta);
    expect(host.querySelector('[data-print-revision-summary]')).toBeTruthy();
    expect(host.querySelector('[data-print-block-changes]')).toBeNull();expect(host.querySelector('[data-print-change-row]')).toBeNull();
    expect(document.activeElement).toBe(host.querySelector('#preflight-report-title'));
  });
});

describe('saved package changes and the current check',()=>{
  it('shows complete counts separately from the saved sample, while checking the receiving bed anew',async()=>{
    const host=await reopen(savedComparison()),history=host.querySelector('[data-print-saved-history]');expect(history).toBeTruthy();
    assertReceivingBedFinding(host);
    expect(history.textContent).toContain('PETG');expect(history.textContent).toContain('PLA');expect(history.textContent).toMatch(/90\s*×\s*5\s*×\s*5/);expect(history.textContent).toMatch(/160\s*×\s*10\s*×\s*10/);
    const summary=history.querySelector('[data-print-block-changes]');assertCount(summary,'Added',9);
    const details=summary.querySelector('[data-print-change-details]');activate(details.querySelector('summary'));filter(details,'added');expect(rows(details)).toHaveLength(6);
    expect(details.querySelector('[data-print-inspect-cell]')).toBeNull();
    activate(button(details,'Next cells'));expect(rows(details)).toHaveLength(2);expect(details.textContent).toContain('up to 8 examples');expect(details.querySelector('[role=status]').textContent).toContain('7–8 of 8 saved examples');
  });
  it.each(['absent','unknown version','inconsistent counts'])('opens and checks a valid STL when %s history cannot be shown',async(kind)=>{
    const history=savedComparison();if(kind==='unknown version')history.schema='geometry-world-changes/unknown';if(kind==='inconsistent counts')history.blockChanges.added=1;
    const host=await reopen(kind==='absent'?null:history);
    expect(host.querySelector('[data-print-saved-history]')).toBeNull();assertReceivingBedFinding(host);
  });
  it.each(['dimensions','scale','turn','material','editable count'])('omits a comparison whose current %s does not match the verified package',async(field)=>{
    const history=savedComparison();
    if(field==='dimensions')history.current.dimensions.width=159;
    if(field==='scale')history.current.unitMm=5;
    if(field==='turn')history.current.printTurnDegrees=90;
    if(field==='material')history.current.materialId='PLA';
    const host=await reopen(history,field==='editable count'?1:undefined);
    expect(host.querySelector('[data-print-saved-history]')).toBeNull();assertReceivingBedFinding(host);
  });
});

describe('initial revision report focus across the actual STEM plugin-child transition',()=>{
 let hostEffect,modalEffect,bridgeFactory,setterFactory,frames,nextFrame,revisionApps=[];
 beforeAll(()=>{
  const source=readFileSync('stem_lab/stem_lab_module.js','utf8').replace(/\r\n/g,'\n');
  const focusStart=source.indexOf('      var _previousStemToolRef = React.useRef(null);'),focusEnd=source.indexOf('      React.useEffect(function () {\n        if (!stemLabTool) return;',focusStart);
  const modalStart=source.indexOf('      var _stemOpenerRef = React.useRef(null);');
  const bridgeStart=source.indexOf('            if (!window.__stemPluginComponents) window.__stemPluginComponents = {};'),bridgeEnd=source.indexOf('            // The deferred setState bridge',bridgeStart);
  const setterStart=source.indexOf('          var _renderingFlag = { current: false };'),setterEnd=source.indexOf('          var _safeSetStemLabTab =',setterStart);
  for(const index of [focusStart,focusEnd,modalStart,bridgeStart,bridgeEnd,setterStart,setterEnd])expect(index).toBeGreaterThan(0);
  hostEffect=new Function('React','_stemDialogRef','stemLabTool',source.slice(focusStart,focusEnd));
  modalEffect=new Function('React','_stemDialogRef',source.slice(modalStart,focusStart));
  bridgeFactory=new Function('React','stemLabTool',source.slice(bridgeStart,bridgeEnd)+'\nreturn window.__stemPluginComponents[stemLabTool];');
  setterFactory=new Function('setLabToolData','setStemLabTool',source.slice(setterStart,setterEnd)+'\nreturn {flag:_renderingFlag,data:_safeSetLabToolData,tool:_safeSetStemLabTool};');
 });
 beforeEach(()=>{
  vi.useFakeTimers();frames=new Map();nextFrame=1;delete window.__stemPluginComponents;
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{const id=nextFrame++;frames.set(id,callback);return id;});
  vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
 });
 afterEach(()=>{
  for(const app of revisionApps.splice(0))app.close();
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
  delete window.__stemPluginComponents;delete window.__geoWorldEngine;delete window.__alloGeometryWorldReturnProject;
 });
 function frame(){const item=frames.entries().next();if(item.done)return false;const [id,callback]=item.value;frames.delete(id);React.act(()=>callback(1));return true;}
 function timers(){React.act(()=>vi.advanceTimersByTime(0));}
 function finish(){for(let i=0;i<6;i++){timers();frame();}timers();}
 async function incoming({deferredRuntime=false,hostTimer=true,mountFocus=true}={}){
  const blocks=[0,1,2].map(x=>({x,y:1,z:0,type:'stone',shape:'cube',rotation:0})),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,800/600,.1,200),meshes={};camera.position.set(3,5,9);
  for(const b of blocks){const mesh=new THREE.Mesh(makeShape(b.shape),new THREE.MeshStandardMaterial({color:0x71957b}));mesh.position.set(b.x+.5,b.y+.5,b.z+.5);mesh.updateMatrixWorld(true);mesh.userData={gridPos:{x:b.x,y:b.y,z:b.z},blockType:b.type,shape:b.shape,rotation:b.rotation,_measurementLayer:'student'};meshes[[b.x,b.y,b.z].join(',')]=mesh;scene.add(mesh);}
  const engine={blocks:meshes,scene,camera,_undoStack:[{action:'coordinate-add',count:1}],_redoStack:[],_builderSelection:{blocks:blocks.map(({x,y,z})=>({x,y,z})),exact:true}};window.__geoWorldEngine=engine;
  const bundle=window.StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(engine,blocks),bytes=new Uint8Array(bundle.buffer);
  const packageReview={revisionId:'revision-report-focus',revisionNumber:2,title:'Revised three blocks',studentNote:'Keep the third block',previousBlockCount:2,previousDimensions:{width:10,depth:5,height:5},materialId:'PLA',printTurnDegrees:0,blockChanges:{added:1,removed:0,modified:0,unchanged:2,materialChanged:0,shapeChanged:0,rotationChanged:0,entries:[{x:2,y:1,z:0,before:null,after:{type:'stone',shape:'cube',rotation:0}}]},referencePrint:{basis:'package',dimensions:{width:10,depth:5,height:5},unitMm:5,materialId:'PLA',printTurnDegrees:0}};
  const originalSession={id:packageReview.revisionId};window.__alloPrintLabPackageEditSession=originalSession;
  window.__alloPrintLabPendingHandoff={schema:'alloflow-print-source/1',id:'revision-body',projectId:'revision-body',sourceTool:'geometryWorld',format:'STL',bytes,sourceModel:bundle.sourceModel,unitMm:5,packageReview};
  window.__alloGeometryWorldReturnProject={id:'revision-body',blocks:blocks.map(b=>({...b})),packageReview:{...packageReview}};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);let data,ctx,alive=true,support,resolveRuntime;
  if(deferredRuntime){support={PrintableModel:window.AlloModules.PrintableModel,Prim3D:window.AlloModules.Prim3D};delete window.AlloModules.PrintableModel;delete window.AlloModules.Prim3D;const gate=new Promise(resolve=>{resolveRuntime=resolve;});window.StemLab.loadScriptResilient=vi.fn(()=>gate);}
  function Host(){
   const [tool,setTool]=React.useState('printLab'),[toolData,setToolData]=React.useState({printLab:{packageEditId:packageReview.revisionId,printStage:'Preflight',unitMm:5,title:'Typed original title',studentNote:'Typed original note',materialId:'PLA'}}),dialog=React.useRef(null);data=toolData;
   if(hostTimer&&mountFocus)modalEffect(React,dialog);if(hostTimer)hostEffect(React,dialog,tool);
   const setters=setterFactory(setToolData,setTool);ctx=makeCtx({toolData,setToolData:setters.data,setStemLabTool:setters.tool,updateMulti(section,patch){setters.data(previous=>({...previous,[section]:{...previous[section],...patch}}));},update(section,key,value){setters.data(previous=>({...previous,[section]:{...previous[section],[key]:value}}));}});ctx._renderingFlag=setters.flag;ctx.stemLabTool=tool;
   const Bridge=bridgeFactory(React,tool),mode=toolData[tool]||{},signature=[tool,'',mode.subtool||mode.tab||mode.mode||mode.activeTab||mode.activeSubtool||''].join(':');
   return React.createElement('section',{'data-stem-lab':hostTimer?'true':undefined,role:hostTimer?'dialog':undefined,'aria-modal':hostTimer?'true':undefined,tabIndex:-1,ref:dialog},React.createElement('button',{className:'stem-active-tool-back'},'All tools'),React.createElement(Bridge,{key:'plugin-'+signature,_toolId:tool,_ctx:ctx}));
  }
  await React.act(async()=>root.render(React.createElement(Host)));
  const app={host,root,engine,originalSession,bytes,heading:()=>host.querySelector('#preflight-report-title'),back:()=>host.querySelector('.stem-active-tool-back'),data:()=>data,ctx:()=>ctx,async ready(){await React.act(async()=>{Object.assign(window.AlloModules,support);resolveRuntime(true);await Promise.resolve();});},close(){if(alive){React.act(()=>root.unmount());host.remove();alive=false;}}};revisionApps.push(app);return app;
 }
 function snapshot(app){return {world:Object.entries(app.engine.blocks).map(([key,mesh])=>({key,mesh,geometry:mesh.geometry,material:mesh.material,vertices:Array.from(mesh.geometry.attributes.position.array),position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray()})),history:[JSON.stringify(app.engine._undoStack),JSON.stringify(app.engine._redoStack)],camera:[app.engine.camera.position.toArray(),app.engine.camera.quaternion.toArray()],selection:JSON.stringify(app.engine._builderSelection),form:JSON.stringify(app.data()),session:window.__alloPrintLabGeometrySession,sessionBytes:Array.from(window.__alloPrintLabGeometrySession.bytes),returnProject:JSON.stringify(window.__alloGeometryWorldReturnProject)};}
 function preserve(app,before){expect(snapshot(app)).toEqual(before);expect(window.__alloPrintLabPackageEditSession).toBeUndefined();expect(app.data().printLab.packageEditId).toBe('');expect(app.originalSession).toEqual({id:'revision-report-focus'});}
 it.each(['before','between','after'])('focuses the report with actual parent host tasks %s its child frames',async order=>{
  const app=await incoming(),before=snapshot(app);expect(app.heading()).toBeTruthy();
  if(order==='before')timers();frame();if(order==='between')timers();frame();timers();
  expect(document.activeElement).toBe(app.heading());expect(frames.size).toBe(0);preserve(app,before);
 });
 it('keeps the standalone revision arrival focus immediate',async()=>{
  const app=await incoming({hostTimer:false});expect(document.activeElement).toBe(app.heading());expect(frames.size).toBe(0);
 });
 it('keeps manual Run advisory preflight focus immediate after the transition completes',async()=>{
  const app=await incoming();finish();const before=snapshot(app);activate(button(app.host,'Run advisory preflight'));expect(document.activeElement).toBe(app.heading());expect(frames.size).toBe(0);before.form=JSON.stringify(app.data());preserve(app,before);
 });
 it.each(['pointerdown','touchstart','keydown','click','input','change'])('remembers early %s while runtime/report are pending',async type=>{
  const app=await incoming({deferredRuntime:true}),before=snapshot(app);expect(app.host.querySelector('#print-lab-report-summary')).toBeNull();
  const control=['input','change'].includes(type)?app.host.querySelector('#print-lab-profile-bedWidthMm'):app.back();
  React.act(()=>control.dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Tab',bubbles:true}):new Event(type,{bubbles:true})));
  timers();await app.ready();finish();expect(app.heading()).toBeTruthy();expect(document.activeElement).not.toBe(app.heading());expect(frames.size).toBe(0);preserve(app,before);
 });
 it('remembers genuine early focus even after the host overwrites it during runtime loading',async()=>{
  const app=await incoming({deferredRuntime:true}),before=snapshot(app),input=app.host.querySelector('#print-lab-profile-bedWidthMm');React.act(()=>input.focus());timers();await app.ready();finish();expect(document.activeElement).not.toBe(app.heading());preserve(app,before);
 });
 it('remembers an early modal that closes before the report is ready',async()=>{
  const app=await incoming({deferredRuntime:true}),before=snapshot(app),modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.tabIndex=-1;app.host.appendChild(modal);React.act(()=>modal.focus());modal.remove();timers();await app.ready();finish();expect(document.activeElement).not.toBe(app.heading());preserve(app,before);
 });
 it('preserves a newer typed printer draft in the final host-task gap',async()=>{
  const app=await incoming(),before=snapshot(app);frame();frame();const input=app.host.querySelector('#print-lab-profile-bedWidthMm');React.act(()=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'205');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});timers();expect(input.value).toBe('205');expect(document.activeElement).not.toBe(app.heading());preserve(app,before);
 });
 it('rejects a new package owner introduced during the final host-task gap',async()=>{
  const app=await incoming();frame();frame();const next={id:'new-package-owner'};window.__alloPrintLabPackageEditSession=next;timers();expect(document.activeElement).not.toBe(app.heading());expect(window.__alloPrintLabPackageEditSession).toBe(next);expect(frames.size).toBe(0);
 });
 it('cancels when the report is manually replaced without a captured learner event',async()=>{
  const app=await incoming();frame();frame();const run=button(app.host,'Run advisory preflight'),props=Object.keys(run).find(k=>k.startsWith('__reactProps$'));React.act(()=>run[props].onClick());expect(document.activeElement).toBe(app.heading());expect(frames.size).toBe(0);timers();expect(frames.size).toBe(0);
 });
 it('declines the obsolete report after a printer-context submit',async()=>{
  const app=await incoming();frame();frame();const input=app.host.querySelector('#print-lab-profile-bedWidthMm'),props=Object.keys(input).find(k=>k.startsWith('__reactProps$'));React.act(()=>input[props].onChange({target:{value:'205'}}));React.act(()=>app.host.querySelector('[data-print-profile-editor]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));timers();expect(document.activeElement).not.toBe(app.heading());expect(frames.size).toBe(0);
 });
 it('respects a modal opened without moving the allowed host focus',async()=>{
  const app=await incoming();frame();frame();const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');app.host.appendChild(modal);timers();expect(document.activeElement).not.toBe(app.heading());modal.remove();expect(frames.size).toBe(0);
 });
 it.each(['hidden','inert'])('refuses a report in a newly %s workflow',async attribute=>{
  const app=await incoming();frame();frame();app.host.querySelector('[data-print-lab]').setAttribute(attribute,'');timers();expect(document.activeElement).not.toBe(app.heading());expect(frames.size).toBe(0);
 });
 it('refuses a detached report heading at the final owned task',async()=>{
  const app=await incoming(),heading=app.heading();frame();frame();heading.remove();timers();expect(document.activeElement).not.toBe(heading);expect(frames.size).toBe(0);
 });
 it('removes its document listeners and all parent/child tasks on unmount',async()=>{
  const added=vi.spyOn(document,'addEventListener'),removed=vi.spyOn(document,'removeEventListener'),app=await incoming();frame();frame();const listeners=added.mock.calls.filter(call=>call[0]==='focusin').map(call=>call[1]);expect(listeners.length).toBeGreaterThan(0);app.close();expect(frames.size).toBe(0);expect(vi.getTimerCount()).toBe(0);for(const listener of listeners)expect(removed.mock.calls.some(call=>call[0]==='focusin'&&call[1]===listener)).toBe(true);
 });
});
