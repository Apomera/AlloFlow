import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { File } from 'node:buffer';
import JSZip from 'jszip';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';
const source=readFileSync(process.env.GW_PACKAGE_CONFIRM_CANDIDATE || 'stem_lab/stem_tool_geometryworld_builder.js','utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let mounted;
function mount(overrides={},freshEngine=false) {
  vi.useFakeTimers();window.THREE=undefined;
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render:()=>React.createElement('main',{id:'geoworld-fs-workspace'},React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}))});
  const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);
  new Function(source)();
  const initial={userData:{gridPos:{x:0,y:1,z:0},blockType:'stone',shape:'cube',rotation:0,_measurementLayer:'student'}};
  let patch,current;
  const navigate=vi.fn();
  const engine=window.__geoWorldEngine={blocks:{'0,1,0':initial},_currentLesson:{sandbox:!overrides.activeLesson || overrides.activeLesson==='builderSandbox'},_showcase:{look:'studio'},_builderSelection:{blocks:[initial.userData.gridPos]},_undoStack:[{type:'place'}],_redoStack:[],blocksPlaced:1,
    getBlocksArr(){return Object.values(this.blocks);},measureStructure(x,y,z,retained){const blocks=(retained||[{x,y,z}]).filter(p=>this.blocks[[p.x,p.y,p.z].join(',')]);return blocks.length?{blocks,count:blocks.length,L:1,W:1,H:1,isComplete:true,totalVolume:blocks.length}:null;},
    rotateShowcase:vi.fn(),endShowcase:vi.fn(()=>{engine._showcase=null;patch({showcaseActive:false});}),
    loadLesson:vi.fn(lesson=>{engine.blocks={};engine._currentLesson=lesson;engine._builderSelection=null;engine._workshopProjectId=null;engine._workshopProjectVersion=null;}),
    placeBlock:vi.fn((x,y,z,type,shape,rotation)=>{engine.blocks[[x,y,z].join(',')]={userData:{gridPos:{x,y,z},blockType:type,shape,rotation,_measurementLayer:'student'}};}),logEvent:vi.fn()};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);
  if(overrides.showcaseActive===false)engine._showcase=null;
  if(freshEngine){engine.blocks={};engine._builderSelection=null;engine._undoStack=[];engine._currentLesson={title:'Initial lesson',sandbox:false};}
  function Host(){const [toolData,setToolData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,showcaseActive:true,showcaseLook:'studio',sandboxDockCollapsed:true,builderPrintContext:{unitMm:12.5},...overrides}});current=toolData.geometryWorld;patch=p=>setToolData(old=>({...old,geometryWorld:{...old.geometryWorld,...p}}));
    return lab._registry.geometryWorld.render(makeCtx({toolData,setToolData,setStemLabTool:navigate,updateMulti:(key,p)=>setToolData(old=>({...old,[key]:{...old[key],...p}})),addToast:vi.fn(),announceToSR:vi.fn()}));}
  React.act(()=>root.render(React.createElement(Host)));mounted={root,host,style};
  const button=text=>Array.from(host.querySelectorAll('button')).find(n=>n.textContent===text);
  const click=node=>React.act(()=>node.click());
  const key=(node,key,shiftKey=false)=>{const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,shiftKey});React.act(()=>node.dispatchEvent(event));return event;};
  const choose=async text=>{const input=host.querySelector('input[type=file]');Object.defineProperty(input,'files',{configurable:true,value:[{size:typeof text==='string'?text.length:20,text:typeof text==='function'?text:()=>Promise.resolve(text)}]});await React.act(async()=>{input.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();await Promise.resolve();});};
  return {host,engine,navigate,button,click,key,choose,state:()=>current,patch:p=>React.act(()=>patch(p)),open:()=>click(button('Use & export'))};
}
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted.style.remove();mounted=null;}for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldPendingBuild','__alloGeometryWorldReturnProject','__alloGeometryWorldLastDraft'])delete window[key];window.localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
const editable=JSON.stringify({schema:'alloflow-geometry-world/2',title:'Imported wedge',blocks:[{x:1,y:1,z:1,type:'wood',shape:'quarter',rotation:3}]});

describe('Showcase file panel',()=>{
  it('keeps a stable import input available while the builder dock is collapsed',()=>{
    const app=mount(),input=app.host.querySelector('input[type=file]');expect(input).toBeTruthy();app.open();expect(app.host.querySelector('input[type=file]')).toBe(input);
    expect(app.host.querySelector('#gwe-showcase-files input[type=file]')).toBeNull();
    expect(app.host.querySelector('#gwe-showcase-files').textContent).toContain('12.5 mm per block');
    expect(app.button('Download editable JSON')).toBeTruthy();expect(app.button('Download STL')).toBeTruthy();expect(app.button('Open in Print Lab')).toBeTruthy();
  });
  it('contains focus and isolates arrow keys, then closes the panel before Showcase on Escape',()=>{
    const app=mount();app.open();const panel=app.host.querySelector('#gwe-showcase-files'),controls=panel.querySelectorAll('button');
    expect(document.activeElement).toBe(panel);expect(app.host.querySelector('.gwe-showcase-tools').hasAttribute('inert')).toBe(true);
    controls[controls.length-1].focus();expect(app.key(controls[controls.length-1],'Tab').defaultPrevented).toBe(true);expect(document.activeElement).toBe(controls[0]);
    app.key(controls[0],'Tab',true);expect(document.activeElement).toBe(controls[controls.length-1]);
    app.key(panel,'ArrowRight');expect(app.engine.rotateShowcase).not.toHaveBeenCalled();
    app.key(panel,'Escape');expect(app.engine.endShowcase).not.toHaveBeenCalled();expect(app.host.querySelector('#gwe-showcase-files')).toBeNull();expect(document.activeElement).toBe(app.button('Use & export'));
    app.key(app.button('Use & export'),'Escape');expect(app.engine.endShowcase).toHaveBeenCalledOnce();
  });
  it('keeps the current model and Showcase intact for invalid input',async()=>{
    const app=mount();app.open();const original=app.engine.blocks;await app.choose('{not json');
    expect(app.host.querySelector('#gwe-showcase-files [role=alert]').textContent).toContain('not valid JSON');
    expect(app.engine.blocks).toBe(original);expect(app.engine.endShowcase).not.toHaveBeenCalled();expect(app.engine.loadLesson).not.toHaveBeenCalled();
  });
  it('requires explicit replacement and exits Showcase before loading the validated model',async()=>{
    const app=mount();app.open();await app.choose(editable);
    expect(app.engine.loadLesson).not.toHaveBeenCalled();expect(app.host.querySelector('.gwe-recovery[data-state=preview]').textContent).toContain('cannot be undone');
    expect(document.activeElement).toBe(app.host.querySelector('.gwe-recovery[data-state=preview]'));
    app.click(app.button('Replace current sandbox'));
    expect(app.engine.endShowcase.mock.invocationCallOrder[0]).toBeLessThan(app.engine.loadLesson.mock.invocationCallOrder[0]);
    expect(app.engine.placeBlock).toHaveBeenCalledWith(1,1,1,'wood','quarter',3);
    expect(app.state()).toMatchObject({showcaseActive:false,sandboxDockCollapsed:false,hudPanel:'',builderPrintContext:null,builderPanel:'build'});
  });
  it('keeps the restored-workspace error visible and focused after automatic Showcase teardown',async()=>{
    const app=mount();app.engine._showcase.collapsed=true;app.open();await app.choose(editable);
    app.engine.placeBlock.mockImplementationOnce(()=>null);app.click(app.button('Replace current sandbox'));
    expect(app.engine._showcase).toBeNull();expect(app.state()).toMatchObject({showcaseActive:false,showcaseSaving:false,sandboxDockCollapsed:false,builderPanel:'build',builderPrintContext:{unitMm:12.5}});
    const alert=app.host.querySelector('.gwe-builder-dock [role=alert]');expect(alert).toBeTruthy();expect(alert.textContent).toContain('Your previous workspace was restored');expect(document.activeElement).toBe(alert);
    expect(app.host.querySelector('.gwe-showcase')).toBeNull();expect(app.host.querySelector('.gwe-recovery[data-state=preview]')).toBeNull();expect(app.engine.blocks['0,1,0'].userData.blockType).toBe('stone');
  });
  it('keeps the recovery download available after failed rollback, a new preview, and Cancel',async()=>{
    const app=mount();app.open();await app.choose(editable);app.engine.placeBlock.mockImplementation(()=>null);app.click(app.button('Replace current sandbox'));
    const backup=app.engine._editableImportRecovery;expect(backup).toBeTruthy();expect(app.button('Download previous build')).toBeTruthy();
    expect(app.host.querySelector('[role=alert]').textContent).toContain('could not be fully restored');
    await app.choose(editable);app.click(app.button('Cancel'));expect(app.host.querySelector('[role=alert]')).toBeNull();expect(app.button('Download previous build')).toBeTruthy();expect(app.engine._editableImportRecovery).toBe(backup);
  });
  it('cancels a preview without replacing or leaving the current creation',async()=>{
    const app=mount();app.open();await app.choose(editable);app.button('Cancel').focus();app.click(app.button('Cancel'));
    expect(app.host.querySelector('.gwe-recovery[data-state=preview]')).toBeNull();expect(app.host.querySelector('#gwe-showcase-files')).toBeTruthy();expect(app.engine.loadLesson).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(app.button('Choose JSON or print package'));
    app.key(document.activeElement,'Escape');expect(app.engine.endShowcase).not.toHaveBeenCalled();expect(app.host.querySelector('#gwe-showcase-files')).toBeNull();expect(document.activeElement).toBe(app.button('Use & export'));
  });
  it('ignores a late file read after closing the panel',async()=>{
    const app=mount();app.open();let resolve;await app.choose(()=>new Promise(r=>{resolve=r;}));app.key(app.host.querySelector('#gwe-showcase-files'),'Escape');
    await React.act(async()=>{resolve(editable);await Promise.resolve();await Promise.resolve();});app.open();
    expect(app.host.querySelector('.gwe-recovery')).toBeNull();expect(app.engine.loadLesson).not.toHaveBeenCalled();
  });
  it('rejects same-tick imports and replacement while an image is encoding',async()=>{
    const app=mount();app.open();await app.choose(editable);app.engine._showcaseExporting=true;app.click(app.button('Replace current sandbox'));
    expect(app.engine.loadLesson).not.toHaveBeenCalled();expect(app.engine.endShowcase).not.toHaveBeenCalled();
    const inputClick=vi.spyOn(HTMLInputElement.prototype,'click');app.click(app.button('Choose JSON or print package'));expect(inputClick).not.toHaveBeenCalled();
    app.patch({showcaseSaving:true});for(const text of ['Download editable JSON','Download STL','Open in Print Lab','Choose JSON or print package'])expect(app.button(text).disabled).toBe(true);
  });
});

async function printArchive({withEditable=true,x=-3}={}) {
  const model=new Uint8Array(134),view=new DataView(model.buffer);
  view.setUint32(80,1,true);
  [[0,0,0],[80,20,0],[5,4,10]].flat().forEach((value,i)=>view.setFloat32(96+i*4,value,true));
  const manifest={schema:'alloflow-print-package/1',model:{file:'model.stl',units:'mm',coordinateSystem:'z-up',sha256:createHash('sha256').update(model).digest('hex')},source:{tool:'geometryWorld',millimetersPerBlock:10,printTurnDegrees:90,editableFile:withEditable?'editable-world.json':null},aiUse:'ASSISTED',aiDisclosure:'Help choosing the shape.'};
  const zip=new JSZip();zip.file('manifest.json',JSON.stringify(manifest));zip.file('model.stl',model);
  if(withEditable)zip.file('editable-world.json',JSON.stringify({schema:'alloflow-geometry-world/2',title:'Bridge spar',blocks:[{x,y:1,z:4,type:'wood',shape:'quarter',rotation:3}]}));
  return new File([await zip.generateAsync({type:'uint8array'})],'student-package.zip',{type:'application/zip'});
}
function chooseFile(app,file) {
  const input=app.host.querySelector('input[type=file]');
  Object.defineProperty(input,'files',{configurable:true,value:[file]});
  input.dispatchEvent(new Event('change',{bubbles:true}));
}
const fileReads=new WeakMap();
function usePackageReader() {
  vi.useRealTimers();vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('JSZip',JSZip);
  const lab=window.StemLab;
  lab.loadScriptResilient=vi.fn(async()=>{
    new Function(readFileSync('stem_lab/geometry_print_package.js','utf8'))();
    const realRead=lab.geometryPrintPackage.read;
    lab.geometryPrintPackage.read=file=>{
      const result=realRead(file);
      fileReads.get(file)?.(result.catch(()=>{}));
      return result;
    };
  });
  return lab;
}
async function choosePackage(app,file) {
  const completed=new Promise(resolve=>fileReads.set(file,resolve));
  await React.act(async()=>{
    chooseFile(app,file);
    await completed;
  });
  fileReads.delete(file);
}

describe('opening an editable print package',()=>{
  it('checks a real turned ZIP, permits cancellation, then restores named original blocks and print scale after confirmation',async()=>{
    const app=mount({showcaseActive:false,sandboxDockCollapsed:false});const lab=usePackageReader(),original=app.engine.blocks;
    const file=await printArchive();const opener=app.button('Open JSON or print package');
    expect(app.host.querySelector('input[type=file]').accept).toContain('.zip');opener.focus();
    await choosePackage(app,file);
    let preview=app.host.querySelector('.gwe-recovery[data-state=preview]');expect(document.activeElement).toBe(preview);
    expect(app.host.querySelector('.gwe-builder-dock').dataset.editableReview).toBe('true');
    expect(app.button('Replace current sandbox').closest('.gwe-builder-footer')).toBeTruthy();
    expect(preview.textContent).toContain(file.name);expect(preview.textContent).toContain('80 × 20 × 10 mm');expect(preview.textContent).toContain('original building orientation');
    expect(app.engine.blocks).toBe(original);expect(app.engine.loadLesson).not.toHaveBeenCalled();
    app.click(app.button('Cancel'));expect(document.activeElement).toBe(opener);expect(app.engine.blocks).toBe(original);
    await choosePackage(app,file);app.click(app.button('Replace current sandbox'));
    expect(app.engine.placeBlock).toHaveBeenCalledWith(-3,1,4,'wood','quarter',3);
    expect(app.engine._builderSelection).toEqual({blocks:[{x:-3,y:1,z:4}],exact:true});
    expect(app.state().builderPrintContext).toEqual({unitMm:10,aiUse:'ASSISTED',aiDisclosure:'Help choosing the shape.'});
    expect(app.host.querySelector('#gwe-project-name').value).toBe('Bridge spar');
    expect(lab.geometryWorldBuilderPure.readWorldShelf().projects.find(p=>p.id===app.engine._workshopProjectId).world.title).toBe('Bridge spar');
    expect(lab.loadScriptResilient).toHaveBeenCalledOnce();
    await React.act(async()=>{await new Promise(resolve=>requestAnimationFrame(resolve));});
    expect(document.activeElement.id).toBe('gwe-selected-creation-title');
  });
  it.each(['Tools','Escape'])('returns from Studio review with %s, preserves blocks and restores the file opener',async(action)=>{
    const app=mount({showcaseActive:false,sandboxDockCollapsed:false}),original=app.engine.blocks;
    const opener=app.button('Open JSON or print package');opener.focus();
    await app.choose(editable);const preview=app.host.querySelector('.gwe-recovery[data-state=preview]');expect(document.activeElement).toBe(preview);
    if(action==='Tools')app.click(app.button('Tools'));else app.key(preview,'Escape');
    expect(app.host.querySelector('.gwe-builder-dock').dataset.editableReview).toBe('false');expect(document.activeElement).toBe(opener);
    expect(app.engine.blocks).toBe(original);expect(app.engine.loadLesson).not.toHaveBeenCalled();
  });
  it.each(['alloflow-print-package/1','alloflow-geometry-world-build/1'])('guides a misplaced %s JSON file back to the editable entry or ZIP',async(schema)=>{
    const app=mount({showcaseActive:false,sandboxDockCollapsed:false}),original=app.engine.blocks;
    await app.choose(JSON.stringify({schema}));const error=app.host.querySelector('.gwe-recovery[data-state=error]');
    expect(error.textContent).toContain('Choose the original Print Lab ZIP or its editable-world.json');expect(document.activeElement).toBe(error);
    expect(app.host.querySelector('.gwe-builder-dock').dataset.editableReview).toBe('false');expect(app.engine.blocks).toBe(original);
    expect(app.button('Open JSON or print package')).toBeTruthy();expect(app.button('Choose another file')).toBeTruthy();
  });
  it.each([['mesh only',{withEditable:false},'Open the ZIP in Print Lab'],['invalid editable coordinates',{x:1200},'outside the editable sandbox']])('keeps the original workspace for %s and focuses a retryable error',async(_name,options,message)=>{
    const app=mount({showcaseActive:false,sandboxDockCollapsed:false,showGeometryHome:true,geometryHomePage:'open'});usePackageReader();const original=app.engine.blocks;
    await choosePackage(app,await printArchive(options));const error=app.host.querySelector('.gwe-recovery[data-state=error]');
    expect(error.textContent).toContain(message);expect(document.activeElement).toBe(error);expect(error.querySelector('button').textContent).toBe('Choose another file');
    expect(app.engine.blocks).toBe(original);expect(app.engine.loadLesson).not.toHaveBeenCalled();expect(app.button('Replace current sandbox')).toBeUndefined();
  });
  it.each(['engine','world','surface'])('ignores a late ZIP after a change of %s without moving focus',async(change)=>{
    const app=mount({showcaseActive:false,sandboxDockCollapsed:false}),lab=usePackageReader();let release;
    lab.geometryPrintPackage={read:()=>new Promise(resolve=>{release=resolve;})};
    const opener=app.button('Open JSON or print package');opener.focus();
    await React.act(async()=>{chooseFile(app,{name:'late.zip',size:100});await Promise.resolve();});
    expect(opener.getAttribute('aria-busy')).toBe('true');expect(document.activeElement).toBe(opener);
    if(change==='engine')window.__geoWorldEngine={...app.engine};else if(change==='world')app.engine.blocks={...app.engine.blocks};
    app.patch(change==='surface'?{showGeometryHome:true,geometryHomePage:'open'}:{historyRevision:9});
    const sentinel=document.createElement('button');app.host.appendChild(sentinel);sentinel.focus();
    await React.act(async()=>{release({editableWorld:null});await Promise.resolve();});
    expect(app.host.querySelector('.gwe-recovery[data-state=preview],.gwe-recovery[data-state=error]')).toBeNull();expect(document.activeElement).toBe(sentinel);expect(app.engine.loadLesson).not.toHaveBeenCalled();
  });
});

function stageRevision() {
  const review={revisionId:'review-bridge-2',revisionNumber:2,title:'Bridge spar',description:'Fit test',studentNote:'Keep the slot.',materialId:'PLA',printTurnDegrees:90,previousBlockCount:1,previousDimensions:{width:80,depth:20,height:10}};
  const intent={schema:'alloflow-geometry-world-intent/1',intent:'reviewPrintPackage',id:review.revisionId,editableWorld:JSON.parse(editable),packageName:'bridge.zip',dimensions:review.previousDimensions,printTurnDegrees:90,printContext:{unitMm:10,aiUse:'ASSISTED',aiDisclosure:'Help selecting a shape.',packageReview:review}};
  window.__alloGeometryWorldPendingBuild=intent;
  return intent;
}
const studio={showcaseActive:false,sandboxDockCollapsed:false};
function giveBlocksExportGeometry(engine) {
  const three={},module={exports:three};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(three,module);
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  const makeShape=new Function('window',core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')({THREE:three});
  Object.entries(engine.blocks).forEach(([key,fixture])=>{
    const {gridPos,shape,rotation}=fixture.userData,mesh=new three.Mesh(makeShape(shape));mesh.position.set(gridPos.x,gridPos.y,gridPos.z);mesh.rotation.y=rotation*Math.PI/2;mesh.userData=fixture.userData;mesh.updateMatrixWorld(true);engine.blocks[key]=mesh;
  });
}
describe('direct package revision from Print Lab',()=>{
  it('opens Connections only after confirming a reopened package and keeps its full print selection',()=>{
    const pending=stageRevision();pending.printContext.inspect={kind:'connections'};
    pending.editableWorld.blocks.push({x:3,y:2,z:-3,type:'glass',shape:'quarter',rotation:1});
    pending.printContext.packageReview.previousBlockCount=2;
    const app=mount(studio);
    expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('false');
    app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));React.act(()=>vi.advanceTimersByTime(80));
    expect(app.engine._builderSelection).toEqual({blocks:[{x:1,y:1,z:1},{x:3,y:2,z:-3}],exact:true});
    expect(document.activeElement.id).toBe('gwe-print-connections');
    expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('true');
    expect(app.engine._undoStack).toHaveLength(0);
    expect(app.state().builderPrintContext).not.toHaveProperty('inspect');
  });
  it('returns to a changed cell without losing the full revision, baseline, or undo history',()=>{
    const first=stageRevision(),app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));
    app.engine.placeBlock(3,2,-3,'glass','quarter',1);app.engine._undoStack=[{type:'place',x:3,y:2,z:-3}];
    giveBlocksExportGeometry(app.engine);app.patch({historyRevision:2});app.click(app.host.querySelector('[data-gwe-review-revision]'));
    const sent=window.__alloPrintLabPendingHandoff,history=structuredClone(app.engine._undoStack);
    window.__alloGeometryWorldPendingBuild={projectId:sent.projectId,draftId:sent.draftId,sourceModel:sent.sourceModel,
      printContext:{...first.printContext,inspect:{kind:'cell',cell:{x:3,y:2,z:-3},recipe:{type:'glass',shape:'quarter',rotation:1}}}};
    const ctx=makeCtx({toolData:{geometryWorld:app.state()},updateMulti:(_key,p)=>app.patch(p)});
    React.act(()=>window.StemLab.geometryWorldBuilderPure.restorePendingEditableBuild(ctx,app.engine));React.act(()=>vi.advanceTimersByTime(80));
    expect(app.engine._builderSelection).toEqual({blocks:[{x:3,y:2,z:-3}],exact:true});
    expect(document.activeElement.id).toBe('gwe-selected-creation-title');expect(Object.keys(app.engine.blocks)).toHaveLength(2);
    expect(app.engine._undoStack).toEqual(history);expect(app.engine._packageRevision.review.revisionId).toBe(first.id);
    expect(app.engine._printReturnInspection).toBeUndefined();
    giveBlocksExportGeometry(app.engine);app.click(app.host.querySelector('[data-gwe-review-revision]'));
    expect(window.__alloPrintLabPendingHandoff.summary.blockCount).toBe(2);
    expect(window.__alloPrintLabPendingHandoff.packageReview.blockChanges).toMatchObject({added:1,modified:0,unchanged:1});
  });
  it('opens Connections for every revision block after a narrow editor selection',()=>{
    const first=stageRevision(),app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));
    app.engine.placeBlock(3,2,-3,'glass','cube',0);giveBlocksExportGeometry(app.engine);app.patch({historyRevision:2});
    app.click(app.host.querySelector('[data-gwe-review-revision]'));const sent=window.__alloPrintLabPendingHandoff;
    window.__alloGeometryWorldReturnProject.selection={blocks:[{x:1,y:1,z:1}],exact:true};
    window.__alloGeometryWorldPendingBuild={projectId:sent.projectId,sourceModel:sent.sourceModel,
      printContext:{...first.printContext,inspect:{kind:'connections'}}};
    const ctx=makeCtx({toolData:{geometryWorld:app.state()},updateMulti:(_key,p)=>app.patch(p)});
    React.act(()=>window.StemLab.geometryWorldBuilderPure.restorePendingEditableBuild(ctx,app.engine));React.act(()=>vi.advanceTimersByTime(80));
    expect(app.engine._builderSelection.blocks).toHaveLength(2);expect(document.activeElement.id).toBe('gwe-print-connections');
    const returns=app.host.querySelectorAll('[data-gwe-review-revision]');
    expect(returns).toHaveLength(1);expect(returns[0].closest('.gwe-print-ready')).toBeTruthy();
    expect(app.host.querySelector('[data-gwe-send="print"]').textContent).toBe('Send selection as a separate model');
    expect(app.engine._packageRevision.review.revisionId).toBe(first.id);
  });
  it.each(['missing','recipe mismatch'])('preserves the restored selection when a changed-cell target is %s',kind=>{
    const first=stageRevision(),app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));
    giveBlocksExportGeometry(app.engine);app.patch({historyRevision:2});app.click(app.host.querySelector('[data-gwe-review-revision]'));
    const sent=window.__alloPrintLabPendingHandoff,selection=structuredClone(app.engine._builderSelection);
    window.__alloGeometryWorldPendingBuild={projectId:sent.projectId,sourceModel:sent.sourceModel,
      printContext:{...first.printContext,inspect:{kind:'cell',cell:kind==='missing'?{x:7,y:1,z:7}:{x:1,y:1,z:1},recipe:{type:'stone',shape:'cube',rotation:0}}}};
    const ctx=makeCtx({toolData:{geometryWorld:app.state()},updateMulti:(_key,p)=>app.patch(p)});
    React.act(()=>window.StemLab.geometryWorldBuilderPure.restorePendingEditableBuild(ctx,app.engine));React.act(()=>vi.advanceTimersByTime(80));
    expect(app.engine._builderSelection).toEqual(selection);expect(Object.keys(app.engine.blocks)).toEqual(['1,1,1']);
    expect(app.engine._printReturnInspection).toBeUndefined();expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('false');
  });
  it('stages a review over the existing lesson and returns to Print Lab without loading a replacement',()=>{
    stageRevision();const app=mount({...studio,activeLesson:'volumeExplorer'}),original=app.engine.blocks;
    const panel=app.host.querySelector('[data-gwe-package-revision-review]'),notice=panel.querySelector('.gwe-recovery[data-state=preview]');
    expect(document.activeElement).toBe(notice);expect(notice.textContent).toContain('Bridge spar · v2');expect(notice.textContent).toContain('bridge.zip');expect(notice.textContent).toContain('original building orientation');
    expect(app.engine.loadLesson).not.toHaveBeenCalled();expect(app.engine._currentLesson.sandbox).toBe(false);
    app.click(panel.querySelector('[data-gwe-cancel-package-edit]'));
    expect(app.navigate).toHaveBeenCalledWith('printLab');expect(app.engine.blocks).toBe(original);expect(app.engine._undoStack).toEqual([{type:'place'}]);expect(app.engine.loadLesson).not.toHaveBeenCalled();
    expect(app.host.querySelector('[data-gwe-package-revision-review]')).toBeNull();
  });
  it('rejects mismatched intent identity without touching the existing world',()=>{
    const pending=stageRevision();pending.id='different-revision';const app=mount(studio),panel=app.host.querySelector('[data-gwe-package-revision-review]');
    expect(panel.querySelector('[role=alert]').textContent).toContain('could not be verified');expect(panel.querySelector('[data-gwe-confirm-package-edit]')).toBeNull();expect(app.engine.loadLesson).not.toHaveBeenCalled();
  });
  it('keeps the staged package visible when a previous file check finishes and keeps a way back after the world changes',async()=>{
    const app=mount(studio);let conclude;await app.choose(()=>new Promise(resolve=>{conclude=resolve;}));
    stageRevision();app.patch({historyRevision:2});const panel=app.host.querySelector('[data-gwe-package-revision-review]');
    await React.act(async()=>{conclude('{invalid');await Promise.resolve();});
    expect(panel.querySelector('.gwe-recovery[data-state=preview]').textContent).toContain('Bridge spar · v2');expect(panel.querySelector('[data-gwe-confirm-package-edit]')).toBeTruthy();
    app.engine.blocks={...app.engine.blocks};app.patch({historyRevision:3});
    expect(panel.querySelector('[role=alert]').textContent).toContain('workspace changed');expect(panel.querySelector('[data-gwe-confirm-package-edit]')).toBeNull();expect(panel.querySelector('[data-gwe-cancel-package-edit]')).toBeTruthy();
  });
  it('rehydrates the previously sent sandbox before staging on a new empty engine',()=>{
    window.__alloGeometryWorldReturnProject={id:'sent-world',lesson:{title:'Prior sandbox',sandbox:true},state:{activeLesson:'builderSandbox',worldActive:true,sandboxDockCollapsed:false},blocks:[{x:9,y:1,z:9,type:'stone',shape:'cube',rotation:0}],selection:{blocks:[{x:9,y:1,z:9}],exact:true},undo:[],redo:[],blocksPlaced:1,milestones:{},workshopDraft:{id:'prior-draft',version:'1'}};
    window.__alloGeometryWorldLastDraft={id:'prior-draft'};stageRevision();const app=mount(studio,true);
    expect(app.host.querySelector('[data-gwe-package-revision-review]')).toBeTruthy();expect(app.engine.blocks['9,1,9']).toBeTruthy();expect(app.engine.blocks['1,1,1']).toBeUndefined();expect(app.engine._workshopProjectId).toBe('prior-draft');
    app.click(app.host.querySelector('[data-gwe-cancel-package-edit]'));expect(app.engine.blocks['9,1,9']).toBeTruthy();expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
  });
  it('requires the world transition and ignores a queued replacement after the learner cancels',()=>{
    stageRevision();const app=mount(studio),original=app.engine.blocks;let retry;
    app.engine.transitionWorld=vi.fn((_target,action)=>{retry=action;return false;});
    app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));
    expect(app.engine.transitionWorld).toHaveBeenCalled();expect(app.engine.loadLesson).not.toHaveBeenCalled();expect(app.engine.blocks).toBe(original);
    app.click(app.host.querySelector('[data-gwe-cancel-package-edit]'));expect(retry()).toBe(false);expect(app.engine.blocks).toBe(original);
  });
  it('exports new and disconnected blocks without widening the editor selection and keeps revisions out of ordinary selection exports',()=>{
    const pending=stageRevision(),app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));React.act(()=>vi.advanceTimersByTime(80));
    expect(document.activeElement.id).toBe('gwe-selected-creation-title');expect(app.host.querySelector('#gwe-project-name').value).toBe('Bridge spar · v2');expect(app.engine._builderSelection).toEqual({blocks:[{x:1,y:1,z:1}],exact:true});expect(app.state().builderPrintContext.unitMm).toBe(10);
    const originalSelection=structuredClone(app.engine._builderSelection);
    app.engine.placeBlock(-6,1,0,'stone','cube',0);giveBlocksExportGeometry(app.engine);app.patch({historyRevision:2});
    const full=app.host.querySelector('[data-gwe-review-revision]');expect(full.textContent).toBe('Review all 2 blocks in Print Lab');app.click(full);
    const sent=window.__alloPrintLabPendingHandoff;expect(sent.packageReview).toEqual({...pending.printContext.packageReview,blockChanges:{added:1,removed:0,modified:0,unchanged:1,materialChanged:0,shapeChanged:0,rotationChanged:0,entries:[{x:-6,y:1,z:0,before:null,after:{type:'stone',shape:'cube',rotation:0}}]}});expect(sent.unitMm).toBe(10);expect(sent.summary.blockCount).toBe(2);expect(sent.bytes.length).toBeGreaterThan(84);
    // Export anchors the printable source at the selection's minimum corner.
    expect(sent.sourceModel.blocks.map(b=>[b.x,b.y,b.z]).sort()).toEqual([[0,0,0],[7,0,1]]);expect(app.engine._builderSelection).toEqual(originalSelection);expect(app.navigate).toHaveBeenCalledWith('printLab');
    app.click(app.host.querySelector('[data-gwe-prepare="print"]'));app.click(app.host.querySelector('[data-gwe-send="print"]'));
    expect(window.__alloPrintLabPendingHandoff.packageReview).toBeUndefined();expect(window.__alloPrintLabPendingHandoff.summary.blockCount).toBe(1);
  });
  it('drops the revision shortcut when the workspace is replaced',()=>{
    stageRevision();const app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));expect(app.host.querySelector('[data-gwe-review-revision]')).toBeTruthy();
    app.click(app.button('Open meadow'));expect(app.host.querySelector('[data-gwe-review-revision]')).toBeTruthy();
    app.engine.blocks={...app.engine.blocks};app.patch({historyRevision:5});expect(app.host.querySelector('[data-gwe-review-revision]')).toBeNull();
  });
  it('compares actual signed cells before export recentering, with overlapping recipe edits counted once',()=>{
    const pending=stageRevision();pending.editableWorld.blocks=[
      {x:-7,y:3,z:8,type:'wood',shape:'quarter',rotation:3},
      {x:5,y:2,z:1,type:'stone',shape:'cube',rotation:0},
      {x:-6,y:1,z:0,type:'glass',shape:'cube',rotation:0},
      {x:5,y:1,z:0,type:'stone',shape:'cube',rotation:0}];
    const reference={basis:'package',unitMm:5,materialId:'PETG',printTurnDegrees:90,dimensions:{width:22,depth:11,height:3}};
    Object.assign(pending.printContext.packageReview,{previousBlockCount:4,referencePrint:reference});
    const app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));app.click(app.button('Open meadow'));
    delete app.engine.blocks['-6,1,0'];app.engine.placeBlock(-9,2,3,'marble','halfA',2);app.engine.placeBlock(-7,3,8,'stone','cube',1);app.engine.placeBlock(5,2,1,'stone','cube',2);
    giveBlocksExportGeometry(app.engine);app.patch({historyRevision:8});app.click(app.host.querySelector('[data-gwe-review-revision]'));
    const review=window.__alloPrintLabPendingHandoff.packageReview;
    expect(review.referencePrint).toEqual(reference);
    expect(review.blockChanges).toEqual({added:1,removed:1,modified:2,unchanged:1,materialChanged:1,shapeChanged:1,rotationChanged:2,entries:[
      {x:-9,y:2,z:3,before:null,after:{type:'marble',shape:'halfA',rotation:2}},
      {x:-7,y:3,z:8,before:{type:'wood',shape:'quarter',rotation:3},after:{type:'stone',shape:'cube',rotation:1}},
      {x:-6,y:1,z:0,before:{type:'glass',shape:'cube',rotation:0},after:null},
      {x:5,y:2,z:1,before:{type:'stone',shape:'cube',rotation:0},after:{type:'stone',shape:'cube',rotation:2}}]});
    expect(Object.keys(review)).not.toContain('baseline');expect(Object.keys(window.__alloPrintLabPendingHandoff)).not.toContain('packageRevisionBaseline');
  });
  it('protects an unapplied size edit even after the editor selection is cleared',()=>{
    stageRevision();const app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));
    app.click(app.host.querySelector('[data-gwe-prepare="print"]'));const input=app.host.querySelector('#gwe-print-scale-value');
    React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'8');input.dispatchEvent(new Event('input',{bubbles:true}));});
    app.click(app.button('Tools'));app.engine._builderSelection=null;app.patch({historyRevision:4,measureResult:null});
    app.click(app.host.querySelector('[data-gwe-review-revision]'));React.act(()=>vi.advanceTimersByTime(100));
    expect(window.__alloPrintLabPendingHandoff).toBeUndefined();expect(document.activeElement).toBe(app.host.querySelector('[data-gwe-revision-size]'));expect(app.state().builderPrintContext.unitMm).toBe(10);
  });
  it('uses the new review identity when Print Lab returns to its matching full revision snapshot',()=>{
    const first=stageRevision(),app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));app.engine.placeBlock(3,1,-3,'glass','cube',1);giveBlocksExportGeometry(app.engine);app.patch({historyRevision:2});
    app.click(app.host.querySelector('[data-gwe-review-revision]'));const prior=window.__alloPrintLabPendingHandoff,review={...first.printContext.packageReview,revisionId:'review-bridge-3',revisionNumber:3,previousBlockCount:2,previousDimensions:{width:55,depth:20,height:10}};
    expect(window.__alloGeometryWorldReturnProject.packageReview.revisionId).toBe(first.id);
    window.__alloGeometryWorldPendingBuild={schema:'alloflow-geometry-world-build/1',projectId:prior.projectId,draftId:prior.draftId,sourceModel:prior.sourceModel,printContext:{...first.printContext,unitMm:7.5,packageReview:review}};
    const ctx=makeCtx({toolData:{geometryWorld:app.state()},updateMulti:(_key,p)=>app.patch(p)});
    React.act(()=>window.StemLab.geometryWorldBuilderPure.restorePendingEditableBuild(ctx,app.engine));delete app.engine.blocks['3,1,-3'];giveBlocksExportGeometry(app.engine);app.patch({historyRevision:3});
    app.click(app.host.querySelector('[data-gwe-review-revision]'));
    expect(window.__alloPrintLabPendingHandoff.packageReview).toEqual({...review,blockChanges:{added:0,removed:1,modified:0,unchanged:1,materialChanged:0,shapeChanged:0,rotationChanged:0,entries:[{x:3,y:1,z:-3,before:{type:'glass',shape:'cube',rotation:1},after:null}]}});expect(window.__alloPrintLabPendingHandoff.unitMm).toBe(7.5);
  });
  it('keeps the accepted baseline across same-revision restore and omits invalid or unrelated reference details',()=>{
    const request=stageRevision();Object.assign(request.printContext.packageReview,{referencePrint:{basis:'package',unitMm:-4,materialId:'PLA',printTurnDegrees:90,dimensions:{width:80,depth:20,height:10}},blockChanges:{added:999}});
    const app=mount(studio);app.click(app.host.querySelector('[data-gwe-confirm-package-edit]'));
    app.engine.placeBlock(4,2,0,'glass','cube',2);giveBlocksExportGeometry(app.engine);app.patch({historyRevision:2});app.click(app.host.querySelector('[data-gwe-review-revision]'));
    const first=window.__alloPrintLabPendingHandoff;
    expect(first.packageReview.referencePrint).toBeUndefined();expect(first.packageReview.blockChanges.added).toBe(1);
    const ctx=makeCtx({toolData:{geometryWorld:app.state()},updateMulti:(_key,p)=>app.patch(p)});
    let restored;const previousMap=app.engine.blocks;
    React.act(()=>{restored=window.StemLab.geometryWorldBuilderPure.resumeSandboxWorkspace(ctx,app.engine);});
    expect(restored).toBe(true);expect(app.engine.blocks).not.toBe(previousMap);
    giveBlocksExportGeometry(app.engine);app.click(app.host.querySelector('[data-gwe-review-revision]'));
    expect(window.__alloPrintLabPendingHandoff.packageReview.blockChanges).toEqual(first.packageReview.blockChanges);
  });
});

describe('package confirmation focus after the actual STEM child commit',()=>{
 let THREE,makeShape,hostEffect,modalEffect,bridgeFactory,setterFactory,createWorld,frames,nextFrame,liveApps=[];
 beforeAll(()=>{
  THREE={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function('window',core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')({THREE});
  const stem=readFileSync('stem_lab/stem_lab_module.js','utf8').replace(/\r\n/g,'\n'),focusStart=stem.indexOf('      var _previousStemToolRef = React.useRef(null);'),focusEnd=stem.indexOf('      React.useEffect(function () {\n        if (!stemLabTool) return;',focusStart),modalStart=stem.indexOf('      var _stemOpenerRef = React.useRef(null);'),bridgeStart=stem.indexOf('            if (!window.__stemPluginComponents) window.__stemPluginComponents = {};'),bridgeEnd=stem.indexOf('            // The deferred setState bridge',bridgeStart),setterStart=stem.indexOf('          var _renderingFlag = { current: false };'),setterEnd=stem.indexOf('          var _safeSetStemLabTab =',setterStart);
  for(const n of [focusStart,focusEnd,modalStart,bridgeStart,bridgeEnd,setterStart,setterEnd])expect(n).toBeGreaterThan(0);
  hostEffect=new Function('React','_stemDialogRef','stemLabTool',stem.slice(focusStart,focusEnd));modalEffect=new Function('React','_stemDialogRef',stem.slice(modalStart,focusStart));bridgeFactory=new Function('React','stemLabTool',stem.slice(bridgeStart,bridgeEnd)+'\nreturn window.__stemPluginComponents[stemLabTool];');setterFactory=new Function('setLabToolData','setStemLabTool',stem.slice(setterStart,setterEnd)+'\nreturn {flag:_renderingFlag,data:_safeSetLabToolData,tool:_safeSetStemLabTool};');
 });
 beforeEach(()=>{
  vi.useFakeTimers();window.localStorage.clear();window.THREE=THREE;frames=new Map();nextFrame=1;delete window.__stemPluginComponents;
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{const id=nextFrame++;frames.set(id,callback);return id;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return React.createElement('main',{id:'geoworld-fs-workspace'},React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(source)();const api=lab.geometryWorldBuilderPure,transaction=readFileSync('tests/geometry_world_import_transaction.test.js','utf8'),helpers=transaction.slice(transaction.indexOf('const key='),transaction.indexOf('function snapshot('));createWorld=new Function('THREE','api','vi','makeShape',helpers+'\nreturn fixture;')(THREE,api,vi,makeShape);
 });
 afterEach(()=>{for(const app of liveApps.splice(0))app.close();delete window.__stemPluginComponents;delete window.__alloPrintLabPackageEditSession;vi.clearAllTimers();});
 function frameRaw(){const next=frames.entries().next();if(next.done)return false;const[id,callback]=next.value;frames.delete(id);callback(0);return true;}
 function frame(){React.act(()=>frameRaw());}
 function timers(){React.act(()=>vi.advanceTimersByTime(0));}
 function settle(){for(let i=0;i<6;i++){timers();frame();}timers();}
 function mountConfirm({nestedHostDialog=false,inspect=null}={}){
  const pending=stageRevision();if(inspect)pending.printContext.inspect=inspect;const session={id:pending.id,bytes:new Uint8Array([17,29,41])};window.__alloPrintLabPackageEditSession=session;
  const base=createWorld(),engine=base.engine;engine.getBlocksArr=()=>Object.values(engine.blocks);engine.measureStructure=(x,y,z,retained)=>{const blocks=(retained||[{x,y,z}]).filter(p=>engine.blocks[[p.x,p.y,p.z].join(',')]);if(!blocks.length)return null;const extent=axis=>Math.max(...blocks.map(p=>p[axis]))-Math.min(...blocks.map(p=>p[axis]))+1;return {blocks:blocks.map(p=>({...p})),count:blocks.length,isComplete:true,L:extent('x'),W:extent('z'),H:extent('y'),totalVolume:blocks.reduce((sum,p)=>sum+engine.blocks[[p.x,p.y,p.z].join(',')].userData.volume,0)};};const seed={geometryWorld:{...base.state(),activeLesson:'builderSandbox',worldActive:true,showGeometryHome:false,sandboxDockCollapsed:false,showcaseActive:false},printLab:{title:'Keep the print form',unitMm:10,packageEditId:pending.id}};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);let data,ctx,alive=true;
  function Host(){
   const[toolData,setToolData]=React.useState(seed),dialog=React.useRef(null);data=toolData;const tool='geometryWorld';modalEffect(React,dialog);hostEffect(React,dialog,tool);
   const setters=setterFactory(setToolData,vi.fn());ctx=makeCtx({toolData,setToolData:setters.data,setStemLabTool:setters.tool,updateMulti(section,patch){setters.data(previous=>({...previous,[section]:{...previous[section],...patch}}));},update(section,key,value){setters.data(previous=>({...previous,[section]:{...previous[section],[key]:value}}));},addToast:vi.fn(),announceToSR:vi.fn()});ctx._renderingFlag=setters.flag;ctx.stemLabTool=tool;base.ctx.updateMulti=ctx.updateMulti;base.ctx.toolData=toolData;
   const Bridge=bridgeFactory(React,tool),mode=toolData[tool]||{},signature=[tool,'',mode.subtool||mode.tab||mode.mode||mode.activeTab||mode.activeSubtool||''].join(':');
   const bridge=React.createElement(Bridge,{key:'plugin-'+signature,_toolId:tool,_ctx:ctx});return React.createElement('section',{'data-stem-lab':'true',role:'dialog','aria-modal':'true',tabIndex:-1,ref:dialog},React.createElement('button',{className:'stem-active-tool-back'},'All tools'),nestedHostDialog?React.createElement('section',{role:'dialog','aria-modal':'true'},bridge):bridge);
  }
  React.act(()=>root.render(React.createElement(Host)));settle();
  const app={host,engine,pending,session,data:()=>data,ctx:()=>ctx,query:selector=>host.querySelector(selector),confirm(beforeCommit=false,transientParentFocus=false){const button=host.querySelector('[data-gwe-confirm-package-edit]');expect(button).toBeTruthy();React.act(()=>{button.focus();button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:0}));if(transientParentFocus)host.querySelector('.stem-active-tool-back').focus();if(beforeCommit)frameRaw();});expect(host.querySelector('#gwe-selected-creation-title')).toBeTruthy();},close(){if(alive){React.act(()=>root.unmount());host.remove();alive=false;}}};liveApps.push(app);return app;
 }
 function snapshot(app){const e=app.engine;return {blocks:Object.entries(e.blocks).map(([key,mesh])=>({key,mesh,geometry:mesh.geometry,material:mesh.material,position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),vertices:Array.from(mesh.geometry.attributes.position.array)})),lesson:e._currentLesson,undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),selection:JSON.stringify(e._builderSelection),revision:e._packageRevision,history:e._historyRevision,form:JSON.stringify(app.data()),camera:[e.camera.position.toArray(),e.camera.quaternion.toArray(),e.camera.up.toArray(),e.camera.fov,e.camera.near,e.camera.far],session:window.__alloPrintLabPackageEditSession,sessionBytes:Array.from(app.session.bytes),shelf:window.localStorage.getItem('alloflow.geometry-world.projects.v1')};}
 function preserve(app,before){expect(snapshot(app)).toEqual(before);expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();expect(window.__alloPrintLabPackageEditSession).toBe(app.session);}
 it.each([false,true])('focuses committed Selected creation when an old completion frame arrives before commit=%s',early=>{
  const app=mountConfirm();app.confirm(early);const before=snapshot(app);expect(app.query('[data-gwe-package-revision-review]')).toBeNull();expect(app.engine.loadLesson).toHaveBeenCalledOnce();expect(app.engine.placeBlock).toHaveBeenCalledOnce();settle();expect(document.activeElement).toBe(app.query('#gwe-selected-creation-title'));preserve(app,before);
 });
 it('restores Selected creation focus after the enclosing STEM dialog takes focus during the child commit',()=>{
  const app=mountConfirm();app.confirm(false,true);const before=snapshot(app);expect(document.activeElement).toBe(app.query('.stem-active-tool-back'));settle();expect(document.activeElement).toBe(app.query('#gwe-selected-creation-title'));preserve(app,before);
 });
  it('lets the package focus handoff settle after a programmatic focus move inside the workspace',()=>{
   const app=mountConfirm();app.confirm();const before=snapshot(app),finder=app.query('.gwe-tool-finder-toggle');expect(finder).toBeTruthy();React.act(()=>finder.focus());expect(document.activeElement).toBe(finder);settle();expect(document.activeElement).toBe(app.query('#gwe-selected-creation-title'));preserve(app,before);
  });
 it('exposes the committed creation instead of leaving the phone inventory HUD open',()=>{
  const app=mountConfirm();app.confirm();expect(app.data().geometryWorld.hudPanel).toBe('');expect(app.query('.gwe-builder-dock').dataset.collapsed).toBe('false');expect(app.query('.gwe-builder-dock').dataset.printPreparing).toBe('false');const before=snapshot(app);settle();expect(document.activeElement).toBe(app.query('#gwe-selected-creation-title'));preserve(app,before);
 });
 it('keeps requested connection inspection open and focused after the child commit',()=>{
  const app=mountConfirm({inspect:{kind:'connections'}});app.confirm();expect(app.data().geometryWorld.hudPanel).toBe('');expect(app.query('.gwe-builder-dock').dataset.printPreparing).toBe('true');const before=snapshot(app);settle();expect(document.activeElement).toBe(app.query('#gwe-print-connections'));preserve(app,before);
 });
 it('keeps the host return-focus handoff through the first completion frame when the workspace is nested',()=>{
  const app=mountConfirm({nestedHostDialog:true});app.confirm();const before=snapshot(app);React.act(()=>app.query('.stem-active-tool-back').focus());expect(document.activeElement).toBe(app.query('.stem-active-tool-back'));settle();expect(document.activeElement).toBe(app.query('#gwe-selected-creation-title'));preserve(app,before);
 });
 it('preserves a newer typed project name and its focus while confirmation focus is pending',()=>{
  const app=mountConfirm();app.confirm();const input=app.query('#gwe-project-name'),before=snapshot(app);React.act(()=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'New project draft');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});settle();expect(document.activeElement).toBe(input);expect(input.value).toBe('New project draft');preserve(app,before);
 });
 it.each(['pointerdown','touchstart','keydown','input','change'])('remembers newer %s while the removed confirm control leaves body focus',type=>{
  const app=mountConfirm();app.confirm();const before=snapshot(app);React.act(()=>app.query('.gwe-builder-head').dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Tab',bubbles:true}):new Event(type,{bubbles:true})));settle();expect(document.activeElement).not.toBe(app.query('#gwe-selected-creation-title'));preserve(app,before);
 });
 it('declines a different package session introduced before the focus task',()=>{
  const app=mountConfirm();app.confirm();const session={id:'new-package-owner'};window.__alloPrintLabPackageEditSession=session;settle();expect(document.activeElement).not.toBe(app.query('#gwe-selected-creation-title'));expect(window.__alloPrintLabPackageEditSession).toBe(session);
 });
 it('declines a newer incoming package intent without consuming it',()=>{
  const app=mountConfirm();app.confirm();const next={intent:'newer-build'};window.__alloGeometryWorldPendingBuild=next;settle();expect(document.activeElement).not.toBe(app.query('#gwe-selected-creation-title'));expect(window.__alloGeometryWorldPendingBuild).toBe(next);
 });
 it('respects a new modal while confirmation focus is pending',()=>{
  const app=mountConfirm();app.confirm();const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');app.host.appendChild(modal);settle();expect(document.activeElement).not.toBe(app.query('#gwe-selected-creation-title'));
 });
 it('removes its completion frames and learner listeners when the plugin unmounts',()=>{
  const add=vi.spyOn(document,'addEventListener'),remove=vi.spyOn(document,'removeEventListener'),app=mountConfirm();app.confirm();const listeners=add.mock.calls.filter(call=>call[0]==='focusin').map(call=>call[1]);expect(listeners.length).toBeGreaterThan(0);app.close();settle();expect(frames.size).toBe(0);for(const listener of listeners)expect(remove.mock.calls.some(call=>call[0]==='focusin'&&call[1]===listener)).toBe(true);
 });
});
