import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let THREE,makeShape,api,mounted;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
});
afterEach(()=>{
  if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}
  vi.restoreAllMocks();vi.unstubAllGlobals();vi.clearAllTimers();vi.useRealTimers();
  for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[key];
});

const initialPrintContext=()=>({unitMm:5,aiUse:'ASSISTED',aiDisclosure:'Student modeled the geometry.',custom:{source:'school-profile',revision:4}});
function engineFixture(){
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(48,800/600,.1,200);scene.fog=new THREE.Fog(0xabcabc,55,145);camera.position.set(3,5,9);camera.rotation.set(-.2,.3,0,'YXZ');
  const engine={scene,camera,blocks:{},_currentLesson:api.FREE_BUILD_LESSON,_undoStack:[{action:'place',x:1,y:1,z:0}],_redoStack:[{action:'remove',x:7,y:1,z:0}],blocksPlaced:3,_popBlocks:[],velocity:new THREE.Vector3(),euler:new THREE.Euler(),yaw:.3,pitch:-.2,flyMode:true,
    getBlocksArr(){return Object.values(this.blocks);},measureStructure(_x,_y,_z,retained){const blocks=(retained||[]).filter(p=>this.blocks[[p.x,p.y,p.z].join(',')]);if(!blocks.length)return null;const span=axis=>Math.max(...blocks.map(p=>p[axis]))-Math.min(...blocks.map(p=>p[axis]))+1;const counts={};let volume=0;blocks.forEach(p=>{const shape=this.blocks[[p.x,p.y,p.z].join(',')].userData.shape;counts[shape]=(counts[shape]||0)+1;volume+=shape==='cube'?1:shape==='quarter'?.25:.5;});return {blocks,count:blocks.length,isComplete:true,L:span('x'),W:span('z'),H:span('y'),totalVolume:volume,shapeCounts:counts,materialCounts:{stone:1,wood:1}};}};
  [{x:0,y:1,z:0,shape:'cube',rotation:0,type:'stone'},{x:1,y:1,z:0,shape:'quarter',rotation:2,type:'wood'},{x:8,y:1,z:0,shape:'cube',rotation:0,type:'gold'}].forEach(p=>{
    const mesh=new THREE.Mesh(makeShape(p.shape),new THREE.MeshStandardMaterial({color:0x709580}));mesh.position.set(p.x+.5,p.y+(p.shape==='cube'?.5:0),p.z+.5);mesh.rotation.y=p.rotation*Math.PI/2;mesh.userData={gridPos:{x:p.x,y:p.y,z:p.z},blockType:p.type,shape:p.shape,rotation:p.rotation,_measurementLayer:'student'};mesh.updateMatrixWorld(true);engine.blocks[[p.x,p.y,p.z].join(',')]=mesh;scene.add(mesh);
  });
  engine._builderSelection={blocks:[{x:0,y:1,z:0},{x:1,y:1,z:0}]};window.__geoWorldEngine=engine;return engine;
}
function worldState(engine){return {blocks:Object.entries(engine.blocks).map(([key,mesh])=>({key,mesh,geometry:mesh.geometry,material:mesh.material,vertices:Array.from(mesh.geometry.attributes.position.array),position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray(),scale:mesh.scale.toArray(),data:{...mesh.userData}})),undo:JSON.stringify(engine._undoStack),redo:JSON.stringify(engine._redoStack),selection:JSON.stringify(engine._builderSelection),camera:[engine.camera.position.toArray(),engine.camera.quaternion.toArray()],placed:engine.blocksPlaced};}
function mount({unit=5}={}){
  const engine=engineFixture(),host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),toasts=vi.fn(),navigate=vi.fn();let patch,current,ctx;
  function Host(){
    const [toolData,setToolData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,sandboxDockCollapsed:false,builderPanel:'build',builderPrintContext:{...initialPrintContext(),unitMm:unit}},printLab:{profile:{bedWidthMm:50,bedDepthMm:50,bedHeightMm:50}}});current=toolData;
    patch=next=>setToolData(old=>({...old,geometryWorld:{...old.geometryWorld,...next}}));
    ctx={React,toolData,updateMulti:(tool,next)=>setToolData(old=>({...old,[tool]:{...old[tool],...next}})),update:(tool,key,value)=>setToolData(old=>({...old,[tool]:{...old[tool],[key]:value}})),addToast:toasts,announceToSR:vi.fn(),setStemLabTool:navigate};
    return window.StemLab._registry.geometryWorld.render(ctx);
  }
  React.act(()=>root.render(React.createElement(Host)));mounted={root,host};
  const form=()=>host.querySelector('.gwe-scale-editor'),input=()=>form().querySelector('input[type=number]');
  return {engine,host,toasts,navigate,ctx:()=>ctx,state:()=>current.geometryWorld,form,input,preset:value=>host.querySelector('[aria-label="Use '+value+' millimeters per block"]'),click:node=>React.act(()=>node.click()),
    draft(value){React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input(),value);input().dispatchEvent(new Event('input',{bubbles:true}));input().dispatchEvent(new Event('change',{bubbles:true}));});},
    submit(){const event=new Event('submit',{bubbles:true,cancelable:true});React.act(()=>form().dispatchEvent(event));return event;},patch:next=>React.act(()=>patch(next))};
}

function captureDownloads(){
  const downloads=[];vi.stubGlobal('Blob',class{constructor(parts,options){this.parts=parts;this.type=options?.type;}});vi.stubGlobal('URL',{createObjectURL(blob){downloads.push(blob);return 'blob:geometry-scale';},revokeObjectURL:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});return downloads;
}
function records(buffer){const view=new DataView(buffer),count=view.getUint32(80,true),result={count,normals:[],vertices:[],attributes:[]};for(let triangle=0;triangle<count;triangle++){const offset=84+triangle*50;for(let axis=0;axis<3;axis++)result.normals.push(view.getFloat32(offset+axis*4,true));for(let axis=0;axis<9;axis++)result.vertices.push(view.getFloat32(offset+12+axis*4,true));result.attributes.push(view.getUint16(offset+48,true));}return result;}

function settleFocus(){React.act(()=>vi.advanceTimersByTime(100));}
function download(app){return app.host.querySelector('[data-gwe-download="stl"]');}
function handoff(app){return app.host.querySelector('[data-gwe-send="print"]');}
function receipt(app){return app.host.querySelector('#gwe-print-export-status');}

describe('Geometry World guided print preparation',()=>{
  it('takes keyboard focus from Prepare 3D print to a named preparation section before exporting',()=>{
    const app=mount(),prepare=app.host.querySelector('[data-gwe-prepare="print"]'),section=app.host.querySelector('#gwe-print-preparation');
    expect(prepare.textContent).toBe('Prepare 3D print');expect(prepare.tagName).toBe('BUTTON');expect(prepare.type).toBe('button');
    expect(section).toBeTruthy();const title=section.querySelector('#gwe-print-title');expect(title).toBeTruthy();expect(title.tabIndex).toBe(-1);
    prepare.focus();app.click(prepare);settleFocus();expect(document.activeElement).toBe(title);
    expect(section.contains(download(app))).toBe(true);expect(section.contains(handoff(app))).toBe(true);
    expect(app.navigate).not.toHaveBeenCalled();expect(window.__alloPrintLabPendingHandoff).toBeUndefined();
    expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('true');
    app.click(app.host.querySelector('[aria-label="Return to build tools"]'));settleFocus();
    expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('false');
    expect(document.activeElement).toBe(prepare);
  });

  it.each(['download','handoff'])('blocks %s for an unapplied scale, reveals the editor and focuses its linked error',route=>{
    const app=mount(),downloads=captureDownloads(),before=worldState(app.engine),pending={keep:'existing'};
    window.__alloPrintLabPendingHandoff=pending;app.draft('12.5');const details=app.form().closest('details');expect(details.open).toBe(false);
    app.click(route==='download'?download(app):handoff(app));settleFocus();
    expect(downloads).toHaveLength(0);expect(app.navigate).not.toHaveBeenCalled();expect(window.__alloPrintLabPendingHandoff).toBe(pending);
    expect(details.open).toBe(true);expect(document.activeElement).toBe(app.input());expect(app.input().value).toBe('12.5');
    expect(app.state().builderPrintContext.unitMm).toBe(5);const error=app.form().querySelector('[role=alert]');expect(error).toBeTruthy();
    expect(app.input().getAttribute('aria-describedby').split(/\s+/)).toContain(error.id);expect(app.input().getAttribute('aria-invalid')).toBe('true');
    expect(receipt(app)?.textContent||'').not.toMatch(/downloaded/i);expect(worldState(app.engine)).toEqual(before);
  });

  it('exports the newly applied physical scale, preserves meshes and publishes a persistent accessible receipt',()=>{
    const app=mount(),downloads=captureDownloads(),before=worldState(app.engine),raw=api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer;
    app.draft('12.5');app.click(download(app));settleFocus();expect(downloads).toHaveLength(0);app.submit();app.click(download(app));
    expect(downloads).toHaveLength(1);const a=records(raw),b=records(downloads[0].parts[0]);expect(b.count).toBe(a.count);expect(b.normals).toEqual(a.normals);expect(b.attributes).toEqual(a.attributes);
    b.vertices.forEach((value,index)=>expect(value).toBeCloseTo(a.vertices[index]*12.5,5));expect(worldState(app.engine)).toEqual(before);
    const status=receipt(app);expect(status).toBeTruthy();expect(status.getAttribute('role')).toBe('status');expect(status.textContent).toMatch(/downloaded/i);expect(status.textContent).toContain('12.5');expect(status.textContent).toMatch(/mm|millimeters/);expect(status.textContent).toContain('100%');
    const message=status.textContent;app.patch({selectedBlock:4});settleFocus();expect(receipt(app).textContent).toBe(message);
  });

  it('discards the draft explicitly and exports at the unchanged applied scale',()=>{
    const app=mount(),downloads=captureDownloads(),raw=records(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer);
    app.draft('40');app.click(download(app));settleFocus();app.click(app.host.querySelector('[data-gwe-scale-discard]'));
    expect(app.input().value).toBe('5');expect(app.state().builderPrintContext.unitMm).toBe(5);expect(app.form().querySelector('[role=alert]')).toBeNull();
    app.click(download(app));expect(downloads).toHaveLength(1);records(downloads[0].parts[0]).vertices.forEach((value,index)=>expect(value).toBeCloseTo(raw.vertices[index]*5,5));
  });

  it('allows Print Lab handoff after applying the pending scale',()=>{
    const app=mount(),downloads=captureDownloads();app.draft('12.5');app.click(handoff(app));settleFocus();expect(app.navigate).not.toHaveBeenCalled();
    app.submit();app.click(handoff(app));expect(app.navigate).toHaveBeenCalledWith('printLab');expect(downloads).toHaveLength(0);
    expect(window.__alloPrintLabPendingHandoff?.unitMm).toBe(12.5);
  });

  it.each(['scale','selection'])('clears a prior download receipt when the %s changes',change=>{
    const app=mount(),downloads=captureDownloads();app.click(download(app));expect(downloads).toHaveLength(1);expect(receipt(app).textContent).toMatch(/downloaded/i);
    if(change==='scale')app.click(app.preset(10));
    else{app.engine._builderSelection={blocks:[{x:8,y:1,z:0}]};app.patch({historyRevision:1});}
    expect(receipt(app)?.textContent||'').not.toMatch(/downloaded/i);expect(downloads).toHaveLength(1);
  });

  it('preserves the download receipt when connection checking resolves for the same selection and scale',()=>{
    const app=mount(),downloads=captureDownloads(),check=app.state().builderPrintCheck;
    expect(check?.selectionSignature).toBeTruthy();app.patch({builderPrintCheck:null});
    app.click(download(app));expect(downloads).toHaveLength(1);const message=receipt(app).textContent;expect(message).toMatch(/downloaded/i);
    app.patch({builderPrintCheck:{...check}});
    expect(receipt(app).textContent).toBe(message);expect(receipt(app).getAttribute('role')).toBe('status');
    expect(app.state().builderPrintContext.unitMm).toBe(5);expect(downloads).toHaveLength(1);
  });

  it('hides print preparation after the retained selection disappears even with a stale student measurement',()=>{
    const app=mount(),stale=app.engine.measureStructure(0,1,0,app.engine._builderSelection.blocks);
    expect(stale.isComplete).toBe(true);expect(api.measurementIsStudentBuild(app.engine,stale)).toBe(true);
    app.patch({measureResult:stale});expect(app.host.querySelector('#gwe-print-preparation')).toBeTruthy();
    delete app.engine._builderSelection;app.patch({historyRevision:1});
    expect(app.state().measureResult).toBe(stale);expect(app.host.querySelector('#gwe-print-preparation')).toBeNull();
    expect(download(app)).toBeNull();expect(handoff(app)).toBeNull();expect(app.navigate).not.toHaveBeenCalled();
  });

  it.each([30,25])('offers a fitting scale for an oversized or tight build at %s mm without modifying geometry',unit=>{
    const app=mount({unit}),before=worldState(app.engine),context=app.state().builderPrintContext,raw=new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer);
    const fit=app.host.querySelector('[data-gwe-fit-scale]');expect(fit).toBeTruthy();expect(fit.type).toBe('button');app.click(fit);
    expect(app.state().builderPrintContext.unitMm).toBeLessThan(unit);expect(app.state().builderPrintContext.unitMm).toBeGreaterThanOrEqual(.01);
    expect(app.host.querySelector('.gwe-print-ready').dataset.fit).toBe('true');expect(app.input().value).toBe(String(app.state().builderPrintContext.unitMm));
    expect(app.state().builderPrintContext.aiUse).toBe(context.aiUse);expect(app.state().builderPrintContext.custom).toBe(context.custom);
    expect(worldState(app.engine)).toEqual(before);expect(new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer)).toEqual(raw);
  });

  it('does not offer a fit action when the applied scale already has room on the printer bed',()=>{
    const app=mount({unit:5});expect(app.host.querySelector('[data-gwe-fit-scale]')).toBeNull();
  });
});

