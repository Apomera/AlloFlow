import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let THREE;
const mounted=[];
const report={status:'WARN',sourceFormat:'STL',triangleCount:1,meshCount:1,dimensionsMm:{width:5,depth:10,height:15},issues:[]};
function bytes(){const b=new Uint8Array(134),v=new DataView(b.buffer);v.setUint32(80,1,true);[0,-1,0,0,0,0,1,-2,0,0,-1,3].forEach((n,i)=>v.setFloat32(84+i*4,n,true));return b;}
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
beforeAll(()=>{const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;});
beforeEach(()=>{
  resetStemLab();window.StemLab.geometryWorldBuilderPure={};window.AlloModules={};
  new Function(readFileSync('printable_model_module.js','utf8'))();new Function(readFileSync('prim3d_module.js','utf8'))();
  new Function(readFileSync('stem_lab/stem_tool_printlab.js','utf8'))();
});
afterEach(()=>{for(const app of mounted.splice(0)){if(app.alive)React.act(()=>app.root.unmount());app.host.remove();}vi.restoreAllMocks();vi.unstubAllGlobals();for(const key of ['__alloPrintLabPendingHandoff','__alloPrintLabGeometrySession','__alloGeometryWorldPendingBuild','JSZip'])delete window[key];});
function mount({checked=true,status='WARN'}={}){
  window.__alloPrintLabPendingHandoff={schema:'alloflow-print-source/1',id:'download-'+mounted.length,projectId:'download-'+mounted.length,sourceTool:'geometryWorld',format:'STL',bytes:bytes(),title:'Bridge',unitMm:5,
    sourceModel:{schema:'alloflow-geometry-world-build/1',coordinateSystem:'x-right,y-up,z-depth',blocks:[{x:0,y:1,z:0,type:'wood',shape:'cube',rotation:0}]}};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),cfg=window.StemLab._registry.printLab,ctx=makeCtx({toolData:{printLab:{}}});
  ctx.setToolData=fn=>{ctx.toolData=typeof fn==='function'?fn(ctx.toolData):fn;};
  React.act(()=>root.render(React.createElement(function Host(){return cfg.render(ctx);})));const app={host,root,ctx,alive:true};mounted.push(app);
  vi.spyOn(window.AlloModules.PrintableModel,'inspectStl').mockReturnValue({...report,status});
  if(checked){click(button(app,'2. Preflight'));click(button(app,'Run advisory preflight'));}
  click(button(app,'4. Submit'));return app;
}
function button(app,text){const node=[...app.host.querySelectorAll('button')].find(n=>n.textContent===text);expect(node,text).toBeTruthy();return node;}
function click(node){React.act(()=>{node.focus();node.click();});}
function draft(node,value){const proto=node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:node.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;React.act(()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);node.dispatchEvent(new Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
function action(app,kind){return app.host.querySelector('[data-print-download="'+kind+'"]');}
function feedback(app){return app.host.querySelector('[data-print-download-feedback]');}
async function flush(){await React.act(async()=>{for(let i=0;i<15;i++)await Promise.resolve();});}
function exporting(){
  const P=window.AlloModules.PrintableModel,archives=[],jobs=[];
  window.StemLab.ensureThree=vi.fn().mockResolvedValue(THREE);
  vi.spyOn(P,'buildStlObject').mockImplementation(()=>new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial()));
  vi.spyOn(P,'exportBinaryStl').mockReturnValue(bytes().buffer);vi.spyOn(P,'sha256Hex').mockResolvedValue('a'.repeat(64));
  window.JSZip=function(){const files={};archives.push(files);this.file=(name,data)=>{files[name]=data;return this;};this.generateAsync=()=>{const job=deferred();jobs.push(job);return job.promise;};};
  const download=vi.fn().mockReturnValue('blob:test');vi.stubGlobal('URL',class extends URL{static createObjectURL=download;static revokeObjectURL=vi.fn();});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  return {P,archives,jobs,download};
}

describe('Print Lab download-first Submit',()=>{
  it('puts ordinary downloads before closed staff and simulator details in DOM order',()=>{
    const app=mount(),primary=action(app,'package'),staff=app.host.querySelector('[data-print-staff-details]'),simulator=app.host.querySelector('[data-print-simulator-details]');
    expect(staff.tagName).toBe('DETAILS');expect(staff.open).toBe(false);expect(simulator.open).toBe(false);expect(staff.firstElementChild.tagName).toBe('SUMMARY');expect(simulator.firstElementChild.tagName).toBe('SUMMARY');
    expect(primary.compareDocumentPosition(staff)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(primary.compareDocumentPosition(simulator)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const importer=staff.querySelector('input[type=file]');expect(importer.parentElement.className).toContain('focus-within:outline');
  });
  it.each([{checked:false},{status:'FAIL'}])('provides a focused recovery route when preflight is missing or blocked (%j)',options=>{
    const app=mount(options);expect(action(app,'package').disabled).toBe(true);expect(action(app,'package').getAttribute('aria-describedby')).toBe('print-lab-download-prerequisite');click(button(app,'Return to Preflight'));expect(document.activeElement).toBe(app.host.querySelector('#print-lab-tab-preflight'));
  });
  it('explains a missing handoff title and focuses it without blocking the package or STL',()=>{
    const app=mount();draft(app.host.querySelector('#print-lab-model-title'),'');expect(action(app,'handoff').disabled).toBe(true);expect(action(app,'package').disabled).toBe(false);expect(action(app,'stl').disabled).toBe(false);click(button(app,'Add model title'));expect(document.activeElement).toBe(app.host.querySelector('#print-lab-model-title'));draft(document.activeElement,'New bridge');expect(action(app,'handoff').disabled).toBe(false);expect(app.host.querySelector('#print-lab-title-prerequisite')).toBeNull();
  });
});

describe('Print Lab asynchronous download feedback',()=>{
  it('keeps the active button focused and prevents duplicate or competing preparations',async()=>{
    const app=mount(),out=exporting();click(action(app,'package'));expect(document.activeElement).toBe(action(app,'package'));expect(action(app,'package').disabled).toBe(false);expect(action(app,'package').getAttribute('aria-disabled')).toBe('true');expect(feedback(app).textContent).toContain('Preparing the print package');
    click(action(app,'package'));click(action(app,'stl'));click(action(app,'handoff'));await flush();expect(out.jobs).toHaveLength(1);expect(window.StemLab.ensureThree).toHaveBeenCalledOnce();expect(out.P.sha256Hex).toHaveBeenCalledOnce();
    out.jobs[0].resolve(new Blob(['zip']));await flush();expect(out.download).toHaveBeenCalledOnce();expect(feedback(app).dataset.printDownloadState).toBe('complete');expect(feedback(app).textContent).toContain('100% scale');expect(action(app,'package').hasAttribute('aria-disabled')).toBe(false);
  });
  it('cancels a package, restores the originating action focus, and ignores its late result',async()=>{
    const app=mount(),out=exporting();click(action(app,'package'));await flush();click(button(app,'Cancel preparation'));expect(document.activeElement).toBe(action(app,'package'));expect(feedback(app).dataset.printDownloadState).toBe('cancelled');
    click(action(app,'package'));await flush();expect(out.jobs).toHaveLength(2);out.jobs[0].resolve(new Blob(['stale']));await flush();expect(out.download).not.toHaveBeenCalled();expect(feedback(app).dataset.printDownloadState).toBe('busy');out.jobs[1].resolve(new Blob(['fresh']));await flush();expect(out.download).toHaveBeenCalledOnce();expect(feedback(app).dataset.printDownloadState).toBe('complete');
  });
  it('cancels changed metadata and lets the latest package finish without an older failure replacing its status',async()=>{
    const app=mount(),out=exporting();click(action(app,'package'));await flush();draft(app.host.querySelector('#print-lab-model-title'),'Updated bridge');expect(feedback(app).dataset.printDownloadState).toBe('cancelled');click(action(app,'package'));await flush();out.jobs[0].reject(new Error('Old ZIP failed'));await flush();expect(feedback(app).dataset.printDownloadState).toBe('busy');expect(feedback(app).textContent).not.toContain('Old ZIP failed');out.jobs[1].resolve(new Blob(['latest']));await flush();expect(JSON.parse(out.archives[1]['manifest.json']).title).toBe('Updated bridge');expect(out.download).toHaveBeenCalledOnce();
  });
  it('shows package errors beside the action and permits a successful retry',async()=>{
    const app=mount(),out=exporting();click(action(app,'package'));await flush();out.jobs[0].reject(new Error('Compression failed'));await flush();expect(feedback(app).dataset.printDownloadState).toBe('error');expect(feedback(app).textContent).toContain('Compression failed');expect(feedback(app).textContent).toContain('Try the download again');click(action(app,'package'));await flush();out.jobs[1].resolve(new Blob(['retry']));await flush();expect(feedback(app).dataset.printDownloadState).toBe('complete');expect(out.download).toHaveBeenCalledOnce();
  });
  it.each(['stl','handoff'])('cancels pending %s preparation before it can download',async(kind)=>{
    const app=mount(),out=exporting(),pending=deferred();if(kind==='stl')window.StemLab.ensureThree.mockReturnValue(pending.promise);else out.P.sha256Hex.mockReturnValue(pending.promise);
    click(action(app,kind));await flush();expect(feedback(app).dataset.printDownloadState).toBe('busy');click(button(app,'Cancel preparation'));expect(document.activeElement).toBe(action(app,kind));pending.resolve(kind==='stl'?THREE:'a'.repeat(64));await flush();expect(out.download).not.toHaveBeenCalled();expect(feedback(app).dataset.printDownloadState).toBe('cancelled');
  });
  it.each(['stl','handoff'])('shows an actionable %s error and clears busy state for retry',async(kind)=>{
    const app=mount(),out=exporting();if(kind==='stl')window.StemLab.ensureThree.mockRejectedValueOnce(new Error('STL engine unavailable'));else out.P.sha256Hex.mockRejectedValueOnce(new Error('Hash unavailable'));
    click(action(app,kind));await flush();expect(feedback(app).dataset.printDownloadState).toBe('error');expect(action(app,kind).hasAttribute('aria-disabled')).toBe(false);click(action(app,kind));await flush();expect(feedback(app).dataset.printDownloadState).toBe('complete');expect(out.download).toHaveBeenCalledOnce();
  });
  it('ignores the completion of a package after unmounting',async()=>{
    const app=mount(),out=exporting();click(action(app,'package'));await flush();React.act(()=>app.root.unmount());app.alive=false;out.jobs[0].resolve(new Blob(['closed']));await flush();expect(out.download).not.toHaveBeenCalled();
  });
});

describe('Print Lab AI explanation recovery',()=>{
  it.each([['handoff','ASSISTED'],['handoff','MOSTLY_AI'],['package','ASSISTED'],['package','MOSTLY_AI']])('focuses the linked empty AI explanation before preparing %s with %s',async(kind,aiUse)=>{
    const app=mount(),out=exporting();draft(app.host.querySelector('select'),aiUse);const explanation=app.host.querySelector('#print-lab-ai-disclosure');draft(explanation,'   ');click(action(app,kind));await flush();
    expect(document.activeElement).toBe(explanation);expect(explanation.getAttribute('aria-invalid')).toBe('true');expect(explanation.getAttribute('aria-describedby')).toBe('print-lab-ai-disclosure-error');expect(app.host.querySelector('#print-lab-ai-disclosure-error').textContent).toContain('Explain how AI assisted');expect(feedback(app).dataset.printDownloadState).toBe('idle');expect(window.StemLab.ensureThree).not.toHaveBeenCalled();expect(out.P.sha256Hex).not.toHaveBeenCalled();expect(out.download).not.toHaveBeenCalled();
    draft(explanation,'AI helped arrange the starting blocks.');expect(explanation.hasAttribute('aria-invalid')).toBe(false);expect(explanation.hasAttribute('aria-describedby')).toBe(false);expect(app.host.querySelector('#print-lab-ai-disclosure-error')).toBeNull();click(action(app,kind));await flush();
    if(kind==='package'){expect(JSON.parse(out.archives[0]['manifest.json']).aiDisclosure).toBe('AI helped arrange the starting blocks.');out.jobs[0].resolve(new Blob(['package']));await flush();}
    expect(feedback(app).dataset.printDownloadState).toBe('complete');expect(out.download).toHaveBeenCalledOnce();
  });
  it.each(['handoff','package'])('clears the field error when No AI is selected and permits %s',async(kind)=>{
    const app=mount(),out=exporting();draft(app.host.querySelector('select'),'ASSISTED');click(action(app,kind));expect(app.host.querySelector('#print-lab-ai-disclosure-error')).toBeTruthy();draft(app.host.querySelector('select'),'NONE');expect(app.host.querySelector('#print-lab-ai-disclosure-error')).toBeNull();expect(app.host.querySelector('#print-lab-ai-disclosure')).toBeNull();click(action(app,kind));await flush();if(kind==='package'){out.jobs[0].resolve(new Blob(['package']));await flush();}expect(out.download).toHaveBeenCalledOnce();
  });
  it('keeps standalone STL available without an AI review explanation',async()=>{
    const app=mount(),out=exporting();draft(app.host.querySelector('select'),'ASSISTED');click(action(app,'stl'));await flush();expect(out.download).toHaveBeenCalledOnce();expect(app.host.querySelector('#print-lab-ai-disclosure-error')).toBeNull();expect(feedback(app).dataset.printDownloadState).toBe('complete');
  });
});
