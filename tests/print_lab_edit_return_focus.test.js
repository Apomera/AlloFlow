import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {webcrypto,createHash} from 'node:crypto';
import {React,ReactDOMClient,resetStemLab,makeCtx} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const candidate=resolve(process.env.GW_PRINT_FOCUS_CANDIDATE || 'stem_lab/stem_tool_printlab.js');
let THREE,hostEffect,hostMountEffect,mounted=[],frames,nextFrame;
const load=p=>new Function(readFileSync(p,'utf8'))();
beforeAll(()=>{
  THREE={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
  const host=readFileSync('stem_lab/stem_lab_module.js','utf8').replace(/\r\n/g,'\n');
  const start=host.indexOf('      var _previousStemToolRef = React.useRef(null);'),end=host.indexOf('      React.useEffect(function () {\n        if (!stemLabTool) return;',start);
  expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
  hostEffect=new Function('React','_stemDialogRef','stemLabTool',host.slice(start,end));
  const mountStart=host.indexOf('      var _stemOpenerRef = React.useRef(null);');expect(mountStart).toBeGreaterThan(0);
  hostMountEffect=new Function('React','_stemDialogRef',host.slice(mountStart,start));
});
beforeEach(()=>{
  vi.useFakeTimers();frames=new Map();nextFrame=1;
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{const id=nextFrame++;frames.set(id,fn);return id;});
  vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>frames.delete(id));
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(){}});
  vi.stubGlobal('THREE',THREE);vi.stubGlobal('crypto',webcrypto);window.AlloModules={};
  load('stem_lab/stem_tool_geometryworld_builder.js');load('printable_model_module.js');load('prim3d_module.js');load(candidate);
});
afterEach(()=>{
  for(const app of mounted.splice(0))app.close();
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();
  for(const name of ['__alloPrintLabPendingHandoff','__alloPrintLabGeometrySession','__alloPrintLabPackageEditSession','__alloGeometryWorldPendingBuild'])delete window[name];
});
function flushFrame(){const first=frames.entries().next();if(first.done)return false;const [id,fn]=first.value;frames.delete(id);React.act(()=>fn(1));return true;}
function finish(){React.act(()=>vi.advanceTimersByTime(0));flushFrame();flushFrame();}
function element(app,selector){return app.host.querySelector(selector);}
function button(app,label){const node=[...app.host.querySelectorAll('button')].find(n=>n.textContent===label);expect(node,label).toBeTruthy();return node;}
function invoke(node,name='onClick',event){const props=Object.keys(node).find(k=>k.startsWith('__reactProps$'));expect(props).toBeTruthy();React.act(()=>node[props][name](event));}
function sourceBytes(size=1){const mesh=new THREE.Mesh(new THREE.BoxGeometry(size,1,1),new THREE.MeshBasicMaterial());const bytes=new Uint8Array(window.AlloModules.PrintableModel.exportBinaryStl(THREE,mesh));mesh.geometry.dispose();mesh.material.dispose();return bytes;}
async function mount({order='before',resumed=true,stage='Preflight',hostTimer=true,deferredRuntime=false,childBridge=false,mountFocus=false}={}){
  const bytes=sourceBytes(),id='focus-return-package';
  if(resumed)window.__alloPrintLabPackageEditSession={id,bytes,hash:createHash('sha256').update(bytes).digest('hex'),unitMm:1,sourceContext:{sourceTool:'geometryPrintPackage',packageName:'unit-cube.zip',packageDimensions:{width:1,depth:1,height:1},millimetersPerBlock:1,packageMaterialId:'PLA',printTurnDegrees:0,revisionNumber:1,editableWorld:{schema:'alloflow-geometry-world/2',coordinateSystem:'x-right,y-up,z-depth',blocks:[{x:0,y:1,z:0,type:'stone',shape:'cube',rotation:0}]}}};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);
  let data={printLab:{packageEditId:resumed?id:'',printStage:stage,unitMm:1}},alive=true;
  const ctx=makeCtx({toolData:data,setStemLabTool:vi.fn()});ctx.setToolData=fn=>{data=typeof fn==='function'?fn(data):fn;ctx.toolData=data;};
  let support,resolveRuntime;
  if(deferredRuntime){support={PrintableModel:window.AlloModules.PrintableModel,Prim3D:window.AlloModules.Prim3D};delete window.AlloModules.PrintableModel;delete window.AlloModules.Prim3D;const gate=new Promise(resolve=>{resolveRuntime=resolve;});window.StemLab.loadScriptResilient=vi.fn(()=>gate);}
  function Bridge(){return window.StemLab._registry.printLab.render(ctx);}
  function Host(){const dialog=React.useRef(null);if(mountFocus)hostMountEffect(React,dialog);if(hostTimer&&order==='before')hostEffect(React,dialog,'printLab');const tool=childBridge?React.createElement(Bridge):window.StemLab._registry.printLab.render(ctx);if(hostTimer&&order==='after')hostEffect(React,dialog,'printLab');return React.createElement('section',{'data-stem-lab':hostTimer?'true':undefined,role:'dialog','aria-modal':'true',tabIndex:-1,ref:dialog},React.createElement('button',{className:'stem-active-tool-back'},'All tools'),tool);}
  await React.act(async()=>root.render(React.createElement(Host)));
  const app={host,ctx,async readyRuntime(){await React.act(async()=>{Object.assign(window.AlloModules,support);resolveRuntime(true);await Promise.resolve();});},close(){if(alive){React.act(()=>root.unmount());host.remove();alive=false;}},target:()=>element(app,'[data-print-inspect-connections], [data-edit-package-blocks]'),back:()=>element(app,'.stem-active-tool-back')};mounted.push(app);return app;
}

describe('Print Lab package-return focus coexists with the real STEM host timer',()=>{
  it('keeps a legitimate pending return through real runtime-null/report-null into ready preflight',async ()=>{
    const app=await mount({deferredRuntime:true});expect(element(app,'#print-lab-report-summary')).toBeNull();expect(frames.size).toBe(0);React.act(()=>vi.advanceTimersByTime(0));expect(document.activeElement).toBe(app.back());
    await app.readyRuntime();expect(element(app,'#print-lab-report-summary')).toBeTruthy();flushFrame();flushFrame();expect(document.activeElement).toBe(app.target());
  });
  it.each(['pointerdown','touchstart','keydown','click','input','change'])('remembers early %s interaction during real runtime/report loading and never jumps on later readiness',async type=>{
    const app=await mount({deferredRuntime:true});expect(element(app,'#print-lab-report-summary')).toBeNull();const control=['input','change'].includes(type)?element(app,'#print-lab-profile-bedWidthMm'):app.back();React.act(()=>control.dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Tab',bubbles:true}):new Event(type,{bubbles:true})));
    React.act(()=>vi.advanceTimersByTime(0));await app.readyRuntime();flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it('remembers an early genuine focus during runtime wait even after the host timer changes focus again',async ()=>{
    const app=await mount({deferredRuntime:true}),input=document.createElement('input');app.host.appendChild(input);input.focus();React.act(()=>vi.advanceTimersByTime(0));
    await app.readyRuntime();flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it('remembers early modal focus even if that modal closes before runtime becomes ready',async ()=>{
    const app=await mount({deferredRuntime:true}),modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.tabIndex=-1;app.host.appendChild(modal);modal.focus();modal.remove();React.act(()=>vi.advanceTimersByTime(0));
    await app.readyRuntime();flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it('does not resurrect a pending request after tab navigation during runtime wait',async ()=>{
    const app=await mount({deferredRuntime:true});React.act(()=>vi.advanceTimersByTime(0));invoke(button(app,'1. Design'));await app.readyRuntime();flushFrame();flushFrame();expect(document.activeElement).toBe(element(app,'#print-lab-tab-design'));expect(frames.size).toBe(0);
  });
  it('does not schedule a late return after unmount while the runtime promise is pending',async ()=>{
    const app=await mount({deferredRuntime:true}),outside=document.createElement('button');document.body.appendChild(outside);app.close();outside.focus();await app.readyRuntime();finish();expect(document.activeElement).toBe(outside);expect(frames.size).toBe(0);outside.remove();
  });
  it('rejects a different package owner that arrives while runtime/report are still pending',async ()=>{
    const app=await mount({deferredRuntime:true});React.act(()=>vi.advanceTimersByTime(0));window.__alloPrintLabPackageEditSession={...window.__alloPrintLabPackageEditSession,id:'new-package-owner'};
    await app.readyRuntime();flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it('does not restore an old request after applied printer context changes during runtime wait',async ()=>{
    const app=await mount({deferredRuntime:true});React.act(()=>vi.advanceTimersByTime(0));invoke(element(app,'#print-lab-profile-bedWidthMm'),'onChange',{target:{value:'205'}});invoke(element(app,'[data-print-profile-editor]'),'onSubmit',{preventDefault(){}});
    expect(app.ctx.toolData.printLab.profile.bedWidthMm).toBe(205);await app.readyRuntime();flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it.each(['before','after'])('restores the owned Edit action after the actual host effect registered %s Print Lab effects',async order=>{
    const app=await mount({order}),target=app.target();expect(target).toBeTruthy();
    React.act(()=>vi.advanceTimersByTime(0));expect(document.activeElement).toBe(app.back());
    flushFrame();expect(document.activeElement).toBe(app.back());flushFrame();expect(document.activeElement).toBe(target);expect(frames.size).toBe(0);
  });
  it('also tolerates the host timer firing between its two bounded frames',async ()=>{
    const app=await mount();flushFrame();React.act(()=>vi.advanceTimersByTime(0));expect(document.activeElement).toBe(app.back());flushFrame();expect(document.activeElement).toBe(app.target());
  });
  it('restores from body in a standalone Print Lab without the STEM shell',async ()=>{
    const app=await mount({hostTimer:false});expect(document.activeElement).toBe(document.body);flushFrame();flushFrame();expect(document.activeElement).toBe(app.target());
  });
  it('never requests a package focus jump for a regular non-package Print Lab visit',async ()=>{
    const app=await mount({resumed:false});finish();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it.each(['pointerdown','touchstart','keydown','click','input','change'])('cancels the pending jump after a genuine %s interaction even if the host later focuses its fallback',async type=>{
    const app=await mount(),target=['input','change'].includes(type)?element(app,'#print-lab-profile-bedWidthMm'):app.back();React.act(()=>target.dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Tab',bubbles:true}):new Event(type,{bubbles:true})));finish();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it('does not override a newer focused Print Lab control',async ()=>{
    const app=await mount();React.act(()=>vi.advanceTimersByTime(0));const tab=element(app,'#print-lab-tab-materials');tab.focus();flushFrame();flushFrame();expect(document.activeElement).toBe(tab);expect(frames.size).toBe(0);
  });
  it('remembers a newer focus even when the host fallback timer overwrites that focus afterward',async ()=>{
    const app=await mount();const input=document.createElement('input');app.host.appendChild(input);input.focus();finish();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it('allows only the originating shell fallback, not a same-class button in another host',async ()=>{
    const app=await mount(),other=document.createElement('section');other.setAttribute('data-stem-lab','true');other.innerHTML='<button class="stem-active-tool-back">Other tools</button>';document.body.appendChild(other);React.act(()=>vi.advanceTimersByTime(0));other.querySelector('button').focus();flushFrame();flushFrame();expect(document.activeElement).toBe(other.querySelector('button'));other.remove();
  });
  it.each(['nested','outside'])('does not steal focus under a %s modal even when active focus remains the allowed host fallback',async kind=>{
    const app=await mount();React.act(()=>vi.advanceTimersByTime(0));const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');(kind==='nested'?element(app,'[data-print-lab]'):document.body).appendChild(modal);flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());modal.remove();
  });
  it.each(['hidden','inert'])('does not focus an owned return target inside a newly %s workflow',async attribute=>{
    const app=await mount();React.act(()=>vi.advanceTimersByTime(0));element(app,'[data-print-lab]').setAttribute(attribute,'');flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());
  });
  it('cancels on report replacement even without a user event reaching its interaction listeners',async ()=>{
    const app=await mount();React.act(()=>vi.advanceTimersByTime(0));expect(frames.size).toBe(1);invoke(button(app,'Run advisory preflight'));expect(frames.size).toBe(0);finish();expect(document.activeElement).toBe(element(app,'#preflight-report-title'));
  });
  it('cancels on a new tab and preserves the selected tab focus',async ()=>{
    const app=await mount();React.act(()=>vi.advanceTimersByTime(0));invoke(button(app,'3. Materials'));expect(frames.size).toBe(0);finish();expect(document.activeElement).toBe(element(app,'#print-lab-tab-materials'));
  });
  it('does not focus the old package action after a newer edit request changes the owned model session',async ()=>{
    const app=await mount();React.act(()=>vi.advanceTimersByTime(0));const oldId=app.ctx.toolData.printLab.packageEditId;invoke(app.target());
    expect(app.ctx.toolData.printLab.packageEditId).not.toBe(oldId);expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld');
    flushFrame();flushFrame();expect(document.activeElement).toBe(app.back());expect(frames.size).toBe(0);
  });
  it('does not run after unmount, and removes document listeners as well as scheduled frames',async ()=>{
    const app=await mount(),outside=document.createElement('button');document.body.appendChild(outside);app.close();outside.focus();expect(frames.size).toBe(0);finish();expect(document.activeElement).toBe(outside);outside.remove();
  });
  it.each(['disabled','detached'])('refuses a %s edit target at the final frame',async kind=>{
    const app=await mount();React.act(()=>vi.advanceTimersByTime(0));flushFrame();if(kind==='disabled')app.target().disabled=true;else app.target().remove();flushFrame();expect(document.activeElement).toBe(app.back());
  });
});


describe('Print Lab package-return focus across real parent/child host timers',()=>{
  it('preserves the owned package return after the host timer runs later than both child frames',async()=>{
    const app=await mount({childBridge:true}),target=app.target(),session=window.__alloPrintLabPackageEditSession;
    flushFrame();flushFrame();
    React.act(()=>vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(target);expect(window.__alloPrintLabPackageEditSession).toBe(session);
  });
  it('coexists with both actual parent modal-root and active-tool mount focus timers',async()=>{
    const app=await mount({childBridge:true,mountFocus:true}),target=app.target(),session=window.__alloPrintLabPackageEditSession;
    React.act(()=>vi.advanceTimersByTime(0));flushFrame();flushFrame();
    expect(document.activeElement).toBe(target);expect(window.__alloPrintLabPackageEditSession).toBe(session);
  });
  it('does not override a learner interaction after both child frames and before the late host timer',async()=>{
    const app=await mount({childBridge:true}),target=app.target();flushFrame();flushFrame();
    const input=element(app,'#print-lab-profile-bedWidthMm');input.focus();React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'2',bubbles:true})));
    React.act(()=>vi.advanceTimersByTime(0));expect(document.activeElement).not.toBe(target);
  });
  it.each(['pointerdown','touchstart','keydown','click','input','change'])('cancels a queued final return after a genuine %s in the late-host task gap',async type=>{
    const app=await mount({childBridge:true}),session=window.__alloPrintLabPackageEditSession;
    flushFrame();flushFrame();
    const control=['input','change'].includes(type)?element(app,'#print-lab-profile-bedWidthMm'):app.back();
    React.act(()=>control.dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Tab',bubbles:true}):new Event(type,{bubbles:true})));
    React.act(()=>vi.advanceTimersByTime(0));
    expect(document.activeElement).not.toBe(app.target());expect(window.__alloPrintLabPackageEditSession).toBe(session);expect(frames.size).toBe(0);
  });
  it('rechecks package ownership at the final task instead of retaining the preceding frame result',async()=>{
    const app=await mount({childBridge:true});flushFrame();flushFrame();
    window.__alloPrintLabPackageEditSession={...window.__alloPrintLabPackageEditSession,id:'new-owner-in-task-gap'};
    React.act(()=>vi.advanceTimersByTime(0));expect(document.activeElement).not.toBe(app.target());expect(frames.size).toBe(0);
  });
  it.each(['disabled','detached'])('rechecks a target made %s after both frames',async kind=>{
    const app=await mount({childBridge:true}),target=app.target();flushFrame();flushFrame();
    if(kind==='disabled')target.disabled=true;else target.remove();
    React.act(()=>vi.advanceTimersByTime(0));expect(document.activeElement).not.toBe(target);expect(frames.size).toBe(0);
  });
  it('respects a modal opened during the final task gap',async()=>{
    const app=await mount({childBridge:true});flushFrame();flushFrame();
    const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');document.body.appendChild(modal);
    React.act(()=>vi.advanceTimersByTime(0));expect(document.activeElement).not.toBe(app.target());modal.remove();
  });
  it('clears the final task and both parent focus timers on unmount',async()=>{
    const app=await mount({childBridge:true,mountFocus:true});flushFrame();flushFrame();expect(vi.getTimerCount()).toBeGreaterThan(0);
    app.close();expect(vi.getTimerCount()).toBe(0);expect(frames.size).toBe(0);
  });
  it('returns only focus while preserving the exact package session, recipe bytes and persisted form state',async()=>{
    const app=await mount({childBridge:true,mountFocus:true}),session=window.__alloPrintLabPackageEditSession;
    const bytes=Array.from(session.bytes),data=JSON.stringify(app.ctx.toolData),hash=session.hash;
    React.act(()=>vi.advanceTimersByTime(0));flushFrame();flushFrame();React.act(()=>vi.advanceTimersByTime(0));
    expect(document.activeElement).toBe(app.target());expect(window.__alloPrintLabPackageEditSession).toBe(session);
    expect(Array.from(session.bytes)).toEqual(bytes);expect(session.hash).toBe(hash);expect(JSON.stringify(app.ctx.toolData)).toBe(data);
  });
});
