import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let mounted,THREE;
const report={status:'WARN',sourceFormat:'STL',triangleCount:1,meshCount:1,dimensionsMm:{width:5,depth:10,height:15},issues:[]};
function bytes(){const b=new Uint8Array(134),v=new DataView(b.buffer);v.setUint32(80,1,true);[0,-1,0,0,0,0,1,-2,0,0,-1,3].forEach((n,i)=>v.setFloat32(84+i*4,n,true));return b;}
beforeAll(()=>{const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;});
beforeEach(()=>{
  resetStemLab();window.StemLab.geometryWorldBuilderPure={};
  window.AlloModules={};new Function(readFileSync('printable_model_module.js','utf8'))();new Function(readFileSync('prim3d_module.js','utf8'))();
  new Function(readFileSync('stem_lab/stem_tool_printlab.js','utf8'))();
  window.__alloPrintLabPendingHandoff={schema:'alloflow-print-source/1',id:'scale-test',projectId:'scale-test',sourceTool:'geometryWorld',format:'STL',bytes:bytes(),title:'Bridge',unitMm:5,
    sourceModel:{schema:'alloflow-geometry-world-build/1',coordinateSystem:'x-right,y-up,z-depth',blocks:[{x:0,y:0,z:0,type:'wood',shape:'cube',rotation:0}]}};
});
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}vi.restoreAllMocks();vi.unstubAllGlobals();for(const key of ['__alloPrintLabPendingHandoff','__alloPrintLabGeometrySession','__alloGeometryWorldPendingBuild','JSZip'])delete window[key];});
function mount(){
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),cfg=window.StemLab._registry.printLab;
  const ctx=makeCtx({toolData:{printLab:{}}});ctx.setStemLabTool=vi.fn();ctx.setToolData=fn=>{ctx.toolData=typeof fn==='function'?fn(ctx.toolData):fn;};
  React.act(()=>root.render(React.createElement(function Host(){return cfg.render(ctx);})));mounted={host,root,ctx};return mounted;
}
function button(app,text){const b=[...app.host.querySelectorAll('button')].find(n=>n.textContent===text);expect(b,text).toBeTruthy();return b;}
function click(n){React.act(()=>{n.focus();n.click();});}
function draft(n,value){const proto=n.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:n.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;React.act(()=>{Object.getOwnPropertyDescriptor(proto,'value').set.call(n,value);n.dispatchEvent(new Event(n.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
function input(app){return app.host.querySelector('#print-lab-scale-input');}
function submit(app){React.act(()=>app.host.querySelector('[data-print-scale-editor]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
function field(app,label){const l=[...app.host.querySelectorAll('label')].find(n=>n.textContent.startsWith(label));expect(l,label).toBeTruthy();return l.querySelector('input,textarea,select');}
async function flush(){await React.act(async()=>{for(let i=0;i<12;i++)await Promise.resolve();});}

describe('Print Lab deliberate physical scale editing',()=>{
  it.each(['','0','-2','1001'])('keeps applied dimensions unchanged for invalid draft %j and identifies the field',value=>{
    const app=mount();draft(input(app),value);expect(app.ctx.toolData.printLab.unitMm).toBe(5);expect(app.host.textContent).toContain('5 × 10 × 15 mm');submit(app);
    expect(input(app).value).toBe(value);expect(app.ctx.toolData.printLab.unitMm).toBe(5);expect(input(app).getAttribute('aria-invalid')).toBe('true');
    expect(input(app).getAttribute('aria-describedby')).toContain('print-lab-scale-error');expect(document.activeElement).toBe(input(app));expect(app.host.querySelector('#print-lab-scale-error').textContent).toContain('unchanged');
  });
  it('applies a decimal deliberately and persists only the applied size',()=>{
    const app=mount();draft(input(app),'12.5');expect(app.ctx.toolData.printLab.unitMm).toBe(5);submit(app);
    expect(app.ctx.toolData.printLab.unitMm).toBe(12.5);expect(app.host.textContent).toContain('12.5 × 25 × 37.5 mm');expect(input(app).value).toBe('12.5');expect(app.host.querySelector('#print-lab-scale-error')).toBeNull();
  });
  it.each(['2. Preflight','3. Materials','4. Submit','Check this model'])('keeps focus at the pending draft before %s',action=>{
    const app=mount();draft(input(app),'10');click(button(app,action));expect(app.host.querySelector('#print-lab-tab-design').getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(input(app));expect(app.host.querySelector('#print-lab-scale-error').textContent).toContain('Apply or discard');expect(app.ctx.toolData.printLab.unitMm).toBe(5);
  });
  it('discards without invalidating existing preflight and lets the workflow continue',()=>{
    const app=mount(),inspect=vi.spyOn(window.AlloModules.PrintableModel,'inspectStl').mockReturnValue(report);click(button(app,'2. Preflight'));click(button(app,'Run advisory preflight'));
    click(button(app,'1. Design'));draft(input(app),'10');click(button(app,'Discard size edit'));expect(input(app).value).toBe('5');click(button(app,'2. Preflight'));
    expect(app.host.textContent).toContain('Preflight reportWARN');expect(inspect).toHaveBeenCalledTimes(1);
  });
  it('resets a pending draft when a scale preset is chosen and invalidates previous preflight',()=>{
    const app=mount();vi.spyOn(window.AlloModules.PrintableModel,'inspectStl').mockReturnValue(report);click(button(app,'2. Preflight'));click(button(app,'Run advisory preflight'));click(button(app,'1. Design'));
    draft(input(app),'');const large=[...app.host.querySelectorAll('button')].find(n=>n.textContent.includes('Large'));click(large);expect(input(app).value).toBe('10');expect(app.ctx.toolData.printLab.unitMm).toBe(10);
    click(button(app,'2. Preflight'));expect(app.host.textContent).toContain('Run preflight after choosing');
  });
  it('requires applying or discarding before returning scale to Geometry World',()=>{
    const app=mount();draft(input(app),'10');click(button(app,'Revise in Geometry World'));expect(app.ctx.setStemLabTool).not.toHaveBeenCalled();expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();
    submit(app);click(button(app,'Revise in Geometry World'));expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld');expect(window.__alloGeometryWorldPendingBuild.printContext.unitMm).toBe(10);
  });
});

describe('Print package metadata corrections',()=>{
  it.each([['Model title','Updated bridge'],['What is it for?','Classroom model'],['Design note for the reviewer','Print upright'],['AI participation','ASSISTED'],['Explain the AI contribution','Generated starting idea']])('cancels a pending ZIP after changing %s',async(label,value)=>{
    const app=mount(),Printable=window.AlloModules.PrintableModel;vi.spyOn(Printable,'inspectStl').mockReturnValue(report);click(button(app,'2. Preflight'));click(button(app,'Run advisory preflight'));click(button(app,'4. Submit'));
    if(label==='Explain the AI contribution'){draft(field(app,'AI participation'),'ASSISTED');draft(field(app,'Explain the AI contribution'),'AI helped with a starting idea.');}
    const generated=[],archives=[];window.JSZip=function(){const files={};archives.push(files);this.file=(name,data)=>{files[name]=data;return this;};this.generateAsync=()=>new Promise(resolve=>generated.push(resolve));};
    window.StemLab.ensureThree=()=>Promise.resolve(THREE);vi.spyOn(Printable,'buildStlObject').mockImplementation(()=>new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial()));vi.spyOn(Printable,'exportBinaryStl').mockReturnValue(bytes().buffer);vi.spyOn(Printable,'sha256Hex').mockResolvedValue('a'.repeat(64));
    const download=vi.fn().mockReturnValue('blob:test');vi.stubGlobal('URL',class extends URL{static createObjectURL=download;static revokeObjectURL=vi.fn();});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
    click(button(app,'Download print package'));await flush();expect(generated).toHaveLength(1);draft(field(app,label),value);if(label==='AI participation')draft(field(app,'Explain the AI contribution'),'AI helped with a starting idea.');generated[0](new Blob(['stale']));await flush();expect(download).not.toHaveBeenCalled();
    click(button(app,'Download print package'));await flush();expect(generated).toHaveLength(2);generated[1](new Blob(['fresh']));await flush();expect(download).toHaveBeenCalledTimes(1);
    const manifest=JSON.parse(archives[1]['manifest.json']),key=({'Model title':'title','What is it for?':'description','Design note for the reviewer':'studentNote','AI participation':'aiUse','Explain the AI contribution':'aiDisclosure'})[label];expect(manifest[key]).toBe(value);
  });
});
