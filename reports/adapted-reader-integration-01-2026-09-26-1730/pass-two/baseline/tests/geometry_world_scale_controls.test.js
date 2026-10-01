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
function pureContext(){
  const context=initialPrintContext(),updates=[];
  const ctx={toolData:{geometryWorld:{builderPrintContext:context,selectedBlock:6,selectedShape:3,blockRotation:2,otherState:'keep'}},updateMulti(tool,patch){updates.push({tool,patch});this.toolData[tool]={...this.toolData[tool],...patch};}};
  return {ctx,context,updates};
}
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
function axisValues(app){return Array.from(app.host.querySelectorAll('.gwe-print-axis strong')).map(el=>el.textContent);}

describe('validated builder print-scale updates',()=>{
  it.each([.01,5,10,20,12.5,1000,'12.5',' 0.05 '])('accepts %j and preserves existing AI/context fields in one patch',value=>{
    const f=pureContext(),oldState=f.ctx.toolData.geometryWorld;Object.freeze(f.context);
    expect(api.setBuilderPrintScale(f.ctx,value)).toEqual({ok:true,value:Number(value)});
    expect(f.updates).toHaveLength(1);expect(f.updates[0].tool).toBe('geometryWorld');expect(Object.keys(f.updates[0].patch)).toEqual(['builderPrintContext']);
    expect(f.ctx.toolData.geometryWorld.builderPrintContext).toEqual({...f.context,unitMm:Number(value)});expect(f.ctx.toolData.geometryWorld.builderPrintContext.custom).toBe(f.context.custom);expect(f.context.unitMm).toBe(5);expect(f.ctx.toolData.geometryWorld.otherState).toBe(oldState.otherState);
  });
  it.each([null,true,false,'','   ',{},[],[5],NaN,Infinity,-Infinity,0,-1,.009,1000.001,'not a number','Infinity'])('rejects %j without changing context or publishing state',value=>{
    const f=pureContext(),before=JSON.stringify(f.ctx.toolData);const result=api.setBuilderPrintScale(f.ctx,value);expect(result.ok).toBe(false);expect(typeof result.error).toBe('string');expect(result.error.length).toBeGreaterThan(0);expect(JSON.stringify(f.ctx.toolData)).toBe(before);expect(f.updates).toHaveLength(0);
  });
  it('supports the existing update-only host fallback',()=>{
    const f=pureContext(),updates=[];delete f.ctx.updateMulti;f.ctx.update=(tool,key,value)=>updates.push({tool,key,value});expect(api.setBuilderPrintScale(f.ctx,8)).toEqual({ok:true,value:8});expect(updates).toEqual([{tool:'geometryWorld',key:'builderPrintContext',value:{...f.context,unitMm:8}}]);
  });
});

describe('live React print-scale editor',()=>{
  it('offers labeled native numeric editing and presets inside the existing disclosure',()=>{
    const app=mount(),form=app.form(),input=app.input();expect(form).toBeTruthy();expect(form.noValidate).toBe(true);expect(form.closest('details').querySelector('summary').textContent).toBe('Adjust print size');
    const label=app.host.querySelector('label[for="'+input.id+'"]');expect(label.textContent).toBe('Millimeters per block');expect(input.min).toBe('0.01');expect(input.max).toBe('1000');expect(input.step).toBe('any');expect(input.value).toBe('5');
    for(const value of [5,10,20]){const button=app.preset(value);expect(button).toBeTruthy();expect(button.type).toBe('button');expect(button.getAttribute('aria-pressed')).toBe(String(value===5));}
    expect(Array.from(form.querySelectorAll('button')).some(button=>button.textContent==='Apply scale')).toBe(true);
  });
  it('updates the selected envelope immediately through presets while preserving blocks, history and selection',()=>{
    const app=mount(),before=worldState(app.engine),context=app.state().builderPrintContext,bytes=new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer);
    expect(axisValues(app)).toEqual(['10','5','5']);app.click(app.preset(20));expect(axisValues(app)).toEqual(['40','20','20']);expect(app.input().value).toBe('20');expect(app.preset(20).getAttribute('aria-pressed')).toBe('true');expect(app.preset(5).getAttribute('aria-pressed')).toBe('false');expect(app.state().builderPrintContext).toEqual({...context,unitMm:20});
    expect(worldState(app.engine)).toEqual(before);expect(new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer)).toEqual(bytes);
    app.click(app.preset(5));expect(axisValues(app)).toEqual(['10','5','5']);expect(app.host.querySelector('.gwe-print-ready').dataset.fit).toBe('true');
  });
  it('keeps a draft separate until Apply, then updates dimensions, occupied volume and over-limit axes together',()=>{
    const app=mount(),before=worldState(app.engine);app.draft('30');expect(app.state().builderPrintContext.unitMm).toBe(5);expect(axisValues(app)).toEqual(['10','5','5']);expect(app.input().value).toBe('30');
    expect(app.submit().defaultPrevented).toBe(true);expect(app.state().builderPrintContext.unitMm).toBe(30);expect(axisValues(app)).toEqual(['60','30','30']);expect(app.host.querySelector('.gwe-print-ready').dataset.fit).toBe('false');expect(Array.from(app.host.querySelectorAll('.gwe-print-axis[data-over=true]')).map(el=>el.dataset.axis)).toEqual(['width']);expect(app.host.querySelector('[data-gwe-print-volume]').textContent).toContain('33,750');
    for(const value of [5,10,20])expect(app.preset(value).getAttribute('aria-pressed')).toBe('false');expect(worldState(app.engine)).toEqual(before);
  });
  it.each(['','0','0.001','1001'])('keeps an invalid %j draft and applied scale unchanged with a linked accessible error',value=>{
    const app=mount({unit:12.5}),before=worldState(app.engine),context=app.state().builderPrintContext;app.draft(value);app.submit();expect(app.state().builderPrintContext).toEqual(context);expect(axisValues(app)).toEqual(['25','12.5','12.5']);expect(app.input().value).toBe(value);expect(app.input().getAttribute('aria-invalid')).toBe('true');
    const error=app.form().querySelector('[role=alert]');expect(error).toBeTruthy();expect(error.textContent.length).toBeGreaterThan(0);expect(app.input().getAttribute('aria-describedby').split(/\s+/)).toContain(error.id);expect(worldState(app.engine)).toEqual(before);
    app.click(app.preset(10));expect(app.state().builderPrintContext.unitMm).toBe(10);expect(app.input().value).toBe('10');expect(app.form().querySelector('[role=alert]')).toBeNull();expect(app.input().getAttribute('aria-invalid')).not.toBe('true');
  });
  it('keeps the user-opened editor and focused custom input available through oversized and fitting presets',()=>{
    const app=mount(),mesh=app.engine.blocks['1,1,0'];delete app.engine.blocks['1,1,0'];mesh.userData.gridPos={x:2,y:1,z:0};mesh.position.x=2.5;mesh.updateMatrixWorld(true);app.engine.blocks['2,1,0']=mesh;app.engine._builderSelection.blocks[1]={x:2,y:1,z:0};app.patch({historyRevision:1});
    const form=app.form(),details=form.closest('details'),input=app.input();expect(details.open).toBe(false);
    React.act(()=>{details.querySelector('summary').click();vi.advanceTimersByTime(1);});expect(details.open).toBe(true);
    app.click(app.preset(20));expect(app.host.querySelector('.gwe-print-ready').dataset.fit).toBe('false');expect(details.open).toBe(true);
    app.click(app.preset(5));expect(app.host.querySelector('.gwe-print-ready').dataset.fit).toBe('true');expect(details.open).toBe(true);expect(app.form()).toBe(form);expect(app.input()).toBe(input);
    input.focus();app.draft('12.5');app.submit();expect(app.state().builderPrintContext.unitMm).toBe(12.5);expect(details.open).toBe(true);expect(document.activeElement).toBe(input);
  });
  it('preserves an explicit disclosure close through unrelated renders and a new oversized scale',()=>{
    const app=mount(),details=app.form().closest('details');
    React.act(()=>{details.querySelector('summary').click();vi.advanceTimersByTime(1);});expect(details.open).toBe(true);
    React.act(()=>{details.querySelector('summary').click();vi.advanceTimersByTime(1);});expect(details.open).toBe(false);
    app.patch({selectedBlock:4});expect(details.open).toBe(false);app.patch({builderPrintContext:{...app.state().builderPrintContext,unitMm:30}});expect(app.host.querySelector('.gwe-print-ready').dataset.fit).toBe('false');expect(details.open).toBe(false);
  });
  it('automatically opens the disclosure for an initially oversized retained creation',()=>{
    const app=mount({unit:30});expect(app.host.querySelector('.gwe-print-ready').dataset.fit).toBe('false');expect(app.form().closest('details').open).toBe(true);expect(app.input().value).toBe('30');
  });

  it('synchronizes the draft when a new Print Lab context changes the live scale',()=>{
    const app=mount(),before=worldState(app.engine);app.draft('7.5');app.patch({builderPrintContext:{unitMm:12.5,aiUse:'REVISED',aiDisclosure:'Reviewed in Print Lab',custom:{source:'returned',revision:8}}});expect(app.input().value).toBe('12.5');expect(axisValues(app)).toEqual(['25','12.5','12.5']);app.draft('8');app.submit();expect(app.state().builderPrintContext).toEqual({unitMm:8,aiUse:'REVISED',aiDisclosure:'Reviewed in Print Lab',custom:{source:'returned',revision:8}});expect(worldState(app.engine)).toEqual(before);
  });
});

function captureDownloads(){
  const downloads=[];vi.stubGlobal('Blob',class{constructor(parts,options){this.parts=parts;this.type=options?.type;}});vi.stubGlobal('URL',{createObjectURL(blob){downloads.push(blob);return 'blob:geometry-scale';},revokeObjectURL:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});return downloads;
}
function records(buffer){const view=new DataView(buffer),count=view.getUint32(80,true),result={count,normals:[],vertices:[],attributes:[]};for(let triangle=0;triangle<count;triangle++){const offset=84+triangle*50;for(let axis=0;axis<3;axis++)result.normals.push(view.getFloat32(offset+axis*4,true));for(let axis=0;axis<9;axis++)result.vertices.push(view.getFloat32(offset+12+axis*4,true));result.attributes.push(view.getUint16(offset+48,true));}return result;}

describe('the applied scale is shared by selected STL download and Print Lab',()=>{
  it('scales only a downloaded copy of the selected mesh and preserves all other work and pending routes',()=>{
    const app=mount(),before=worldState(app.engine),raw=api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer,original=new Uint8Array(raw.slice(0)),pending={keep:'handoff'},project={keep:'return'};window.__alloPrintLabPendingHandoff=pending;window.__alloGeometryWorldReturnProject=project;const downloads=captureDownloads();
    app.draft('12.5');app.submit();expect(api.selectedBuildStlDownload(app.ctx())).toBe(true);expect(downloads).toHaveLength(1);const bytes=downloads[0].parts[0],a=records(raw),b=records(bytes);expect(bytes).not.toBe(raw);expect(b.count).toBe(a.count);expect(b.normals).toEqual(a.normals);expect(b.attributes).toEqual(a.attributes);b.vertices.forEach((value,index)=>expect(value).toBeCloseTo(a.vertices[index]*12.5,5));
    expect(new Uint8Array(raw)).toEqual(original);expect(new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer)).toEqual(original);expect(worldState(app.engine)).toEqual(before);expect(window.__alloPrintLabPendingHandoff).toBe(pending);expect(window.__alloGeometryWorldReturnProject).toBe(project);
  });
  it('hands off unchanged selected block-unit geometry with the applied scale and preserved AI context',()=>{
    const app=mount(),before=worldState(app.engine),raw=new Uint8Array(api.buildGeometryWorldStl(app.engine,app.engine._builderSelection.blocks).buffer);app.click(app.preset(20));
    React.act(()=>api.openSelectedBuildInPrintLab(app.ctx()));const handoff=window.__alloPrintLabPendingHandoff;expect(app.navigate).toHaveBeenCalledWith('printLab');expect(handoff.unitMm).toBe(20);expect(handoff.aiUse).toBe('ASSISTED');expect(handoff.aiDisclosure).toBe(initialPrintContext().aiDisclosure);expect(handoff.bytes).toEqual(raw);expect(handoff.sourceModel.blocks).toHaveLength(2);expect(handoff.sourceModel.blocks.some(block=>block.type==='gold')).toBe(false);expect(worldState(app.engine)).toEqual(before);
  });
});
