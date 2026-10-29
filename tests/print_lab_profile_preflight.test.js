import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const mounted=[];
const baseProfile={name:'Classroom printer',bedWidthMm:220,bedDepthMm:220,bedHeightMm:250,planningClearanceMm:5,nozzleMm:.4,maxTriangles:90000,maxBytes:2000000};
const baseReport={status:'WARN',sourceFormat:'STL',triangleCount:1,meshCount:1,dimensionsMm:{width:5,depth:10,height:15},issues:[]};
function bytes(){const b=new Uint8Array(134),v=new DataView(b.buffer);v.setUint32(80,1,true);[0,-1,0,0,0,0,1,-2,0,0,-1,3].forEach((n,i)=>v.setFloat32(84+i*4,n,true));return b;}
beforeEach(()=>{
  resetStemLab();window.StemLab.geometryWorldBuilderPure={};window.AlloModules={};
  new Function(readFileSync('printable_model_module.js','utf8'))();new Function(readFileSync('prim3d_module.js','utf8'))();
  new Function(readFileSync('stem_lab/stem_tool_printlab.js','utf8'))();
});
afterEach(()=>{for(const app of mounted.splice(0)){React.act(()=>app.root.unmount());app.host.remove();}vi.restoreAllMocks();for(const key of ['__alloPrintLabPendingHandoff','__alloPrintLabGeometrySession','__alloGeometryWorldPendingBuild'])delete window[key];});
function mount({unit=5,profile=baseProfile}={}){
  window.__alloPrintLabPendingHandoff={schema:'alloflow-print-source/1',id:'profile-'+mounted.length,projectId:'profile-'+mounted.length,sourceTool:'geometryWorld',format:'STL',bytes:bytes(),title:'Bridge',unitMm:unit,
    sourceModel:{schema:'alloflow-geometry-world-build/1',coordinateSystem:'x-right,y-up,z-depth',blocks:[{x:0,y:1,z:0,type:'wood',shape:'cube',rotation:0}]}};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host),cfg=window.StemLab._registry.printLab,ctx=makeCtx({toolData:{printLab:{profile:{...profile}}}});
  ctx.setStemLabTool=vi.fn();ctx.setToolData=fn=>{ctx.toolData=typeof fn==='function'?fn(ctx.toolData):fn;};
  React.act(()=>root.render(React.createElement(function Host(){return cfg.render(ctx);})));const app={host,root,ctx};mounted.push(app);return app;
}
function button(app,text){const node=[...app.host.querySelectorAll('button')].find(n=>n.textContent===text);expect(node,text).toBeTruthy();return node;}
function click(node){React.act(()=>{node.focus();node.click();});}
function draft(node,value){React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));});}
function input(app,key){return app.host.querySelector('#print-lab-profile-'+key);}
function preflight(app){click(button(app,'2. Preflight'));}
function apply(app){React.act(()=>app.host.querySelector('[data-print-profile-editor]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
function inspect(app,report=baseReport){const spy=vi.spyOn(window.AlloModules.PrintableModel,'inspectStl').mockReturnValue(report);click(button(app,'Run advisory preflight'));return spy;}
function tab(app,name){return app.host.querySelector('[role=tab][id="print-lab-tab-'+name.toLowerCase()+'"]');}

describe('Print Lab deliberate printer profile editing',()=>{
  it.each([['bedWidthMm',''],['bedDepthMm',''],['bedHeightMm',''],['planningClearanceMm',''],['nozzleMm',''],['bedWidthMm','49'],['bedDepthMm','1001'],['bedHeightMm','-1'],['planningClearanceMm','51'],['nozzleMm','0']])('preserves applied profile and report for invalid %s=%j', (key,value)=>{
    const app=mount();preflight(app);inspect(app);const applied={...app.ctx.toolData.printLab.profile};
    draft(input(app,key),value);expect(app.ctx.toolData.printLab.profile).toEqual(applied);expect(app.host.querySelector('#print-lab-report-summary')).toBeTruthy();
    apply(app);expect(app.ctx.toolData.printLab.profile).toEqual(applied);expect(app.host.querySelector('#print-lab-report-summary')).toBeTruthy();
    expect(document.activeElement).toBe(input(app,key));expect(input(app,key).value).toBe(value);expect(input(app,key).getAttribute('aria-invalid')).toBe('true');expect(input(app,key).getAttribute('aria-describedby')).toContain('print-lab-profile-error');
  });
  it('applies all edited fields atomically, keeps profile limits and clears old checks',()=>{
    const app=mount();preflight(app);inspect(app);draft(input(app,'bedWidthMm'),'180.5');draft(input(app,'nozzleMm'),'.6');
    expect(app.ctx.toolData.printLab.profile).toEqual(baseProfile);apply(app);
    expect(app.ctx.toolData.printLab.profile).toEqual({...baseProfile,bedWidthMm:180.5,nozzleMm:.6});expect(app.host.querySelector('#print-lab-report-summary')).toBeNull();expect(input(app,'bedWidthMm').value).toBe('180.5');
    expect(app.host.querySelector('#print-lab-profile-help').textContent).toContain('180.5 × 220 × 250');
  });
  it('validates the whole form before changing any applied field',()=>{
    const app=mount();preflight(app);draft(input(app,'bedWidthMm'),'180');draft(input(app,'nozzleMm'),'');apply(app);expect(app.ctx.toolData.printLab.profile).toEqual(baseProfile);expect(document.activeElement).toBe(input(app,'nozzleMm'));
  });
  it('discards without rerunning or deleting the last preflight report',()=>{
    const app=mount();preflight(app);const spy=inspect(app);draft(input(app,'bedWidthMm'),'');click(button(app,'Discard profile edit'));
    expect(input(app,'bedWidthMm').value).toBe('220');expect(app.ctx.toolData.printLab.profile).toEqual(baseProfile);expect(app.host.querySelector('#print-lab-report-summary')).toBeTruthy();expect(spy).toHaveBeenCalledOnce();expect(document.activeElement).toBe(input(app,'bedWidthMm'));
  });
  it.each(['1. Design','3. Materials','4. Submit','Run advisory preflight','Create conservative repair candidate'])('keeps %s from using an unapplied printer profile',label=>{
    const app=mount();preflight(app);const spy=vi.spyOn(window.AlloModules.PrintableModel,'inspectStl'),repair=vi.spyOn(window.AlloModules.PrintableModel,'repairStl');draft(input(app,'bedDepthMm'),'180');click(button(app,label));
    expect(tab(app,'preflight').getAttribute('aria-selected')).toBe('true');expect(document.activeElement).toBe(input(app,'bedDepthMm'));expect(app.host.querySelector('#print-lab-profile-error').textContent).toContain('Apply or discard');expect(app.ctx.toolData.printLab.profile).toEqual(baseProfile);expect(spy).not.toHaveBeenCalled();expect(repair).not.toHaveBeenCalled();
  });
  it('does not apply an old fit-scale suggestion while a printer profile edit is pending',()=>{
    const app=mount({unit:20,profile:{...baseProfile,bedWidthMm:50,bedDepthMm:50,bedHeightMm:50}});preflight(app);const suggested=[...app.host.querySelectorAll('button')].find(n=>n.getAttribute('aria-label')?.startsWith('Apply suggested Geometry World scale'));expect(suggested).toBeTruthy();draft(input(app,'bedHeightMm'),'100');click(suggested);
    expect(app.ctx.toolData.printLab.unitMm).toBe(20);expect(document.activeElement).toBe(input(app,'bedHeightMm'));expect(input(app,'bedHeightMm').value).toBe('100');
  });
  it.each(['Adjust physical size','Revise selected blocks'])('resolves the pending profile before the report action %s',action=>{
    const app=mount();preflight(app);inspect(app,{...baseReport,status:'FAIL',issues:[{code:'BED_FIT',severity:'ERROR',message:'Too wide.'},{code:'OPEN_EDGES',severity:'WARNING',message:'Open surfaces.'}]});draft(input(app,'bedWidthMm'),'180');click(button(app,action));
    expect(app.ctx.setStemLabTool).not.toHaveBeenCalled();expect(window.__alloGeometryWorldPendingBuild).toBeUndefined();expect(tab(app,'preflight').getAttribute('aria-selected')).toBe('true');expect(document.activeElement).toBe(input(app,'bedWidthMm'));expect(app.host.querySelector('#print-lab-report-summary')).toBeTruthy();
  });
});

describe('Print Lab actionable preflight results',()=>{
  it('focuses the updated report after every explicit check and counts findings clearly',()=>{
    const app=mount();preflight(app);const report={...baseReport,status:'FAIL',issues:[{code:'BED_FIT',severity:'ERROR',message:'Too wide.'},{code:'OPEN_EDGES',severity:'WARNING',message:'Open.'},{code:'MULTIPLE_SHELLS',severity:'WARNING',message:'Separate.'},{code:'INFO_ONLY',severity:'INFO',message:'Note.'}]};inspect(app,report);
    const title=app.host.querySelector('#preflight-report-title');expect(document.activeElement).toBe(title);expect(title.getAttribute('aria-describedby')).toBe('print-lab-report-summary');expect(app.host.querySelector('#print-lab-report-summary').textContent).toBe('1 blocking item · 2 review warnings · 1 information note');
    click(button(app,'Run advisory preflight'));expect(document.activeElement).toBe(title);
    click(button(app,'Adjust physical size'));expect(tab(app,'design').getAttribute('aria-selected')).toBe('true');expect(document.activeElement).toBe(app.host.querySelector('#print-lab-scale-input'));
  });
  it('offers Geometry World revision for surface findings while preserving the applied scale',()=>{
    const app=mount({unit:12.5});preflight(app);inspect(app,{...baseReport,issues:[{code:'OPEN_EDGES',severity:'WARNING',message:'Review surfaces.'}]});click(button(app,'Revise selected blocks'));
    expect(app.ctx.setStemLabTool).toHaveBeenCalledWith('geometryWorld');expect(window.__alloGeometryWorldPendingBuild.printContext.unitMm).toBe(12.5);
  });
  it('keeps a passing result advisory without inventing repair actions',()=>{
    const app=mount();preflight(app);inspect(app,{...baseReport,status:'PASS',issues:[]});expect(app.host.querySelector('#print-lab-report-summary').textContent).toBe('0 blocking items · 0 review warnings');expect(app.host.querySelector('[data-print-finding-actions]')).toBeNull();expect(app.host.textContent).toContain('Advisory, not certification.');
  });
  it('preserves an unknown blocking finding without suggesting an unrelated fix',()=>{
    const app=mount();preflight(app);inspect(app,{...baseReport,status:'FAIL',issues:[{code:'FUTURE_CHECK',severity:'ERROR',message:'An additional condition needs review.'}]});expect(app.host.querySelector('#print-lab-report-summary').textContent).toBe('1 blocking item · 0 review warnings');expect(app.host.querySelector('[data-print-finding-actions]')).toBeNull();expect(app.host.textContent).toContain('An additional condition needs review.');
  });
  it('focuses the report only in the originating mounted view',()=>{
    const first=mount(),second=mount();preflight(first);preflight(second);const spy=inspect(second);expect(spy).toHaveBeenCalledOnce();expect(document.activeElement).toBe(second.host.querySelector('[data-print-report-heading]'));expect(first.host.querySelector('[id="print-lab-report-summary"]')).toBeNull();
  });
});
