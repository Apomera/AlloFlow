import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab,makeCtx} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const RECIPE={version:'p3d/1',name:'Test model',scale:1,parts:[{shape:'box',size:[1,1,1],position:[0,.5,0],rotation:[0,0,0],color:'#22d3ee'}]};
const mounted=[];
beforeAll(()=>{
  window.AlloModules=window.AlloModules||{};
  new Function(readFileSync('printable_model_module.js','utf8'))();
  new Function(readFileSync('prim3d_module.js','utf8'))();
});
afterEach(()=>{
  for(const app of mounted.splice(0))app.unmount();
  ['__alloPrintLabPendingHandoff','__alloPrintLabGeometrySession','__alloPrintLabRejectedHandoff'].forEach(key=>delete window[key]);
  vi.useRealTimers();vi.restoreAllMocks();
});
function mount(options={}){
  resetStemLab();window.StemLab.geometryWorldBuilderPure={};
  new Function(readFileSync('stem_lab/stem_tool_printlab.js','utf8'))();
  const cfg=window.StemLab._registry.printLab,pure=window.StemLab.printLabPure;
  const report=options.report?{status:options.report,sourceFormat:'RECIPE',triangleCount:12,meshCount:1,dimensionsMm:{width:20,depth:20,height:20},issues:options.report==='FAIL'?[{code:'EXAMPLE',severity:'ERROR',message:'Review the model.'}]:[]}:null;
  let toolData={printLab:{recipe:RECIPE,unitMm:20,printStage:options.stage||'Design',preflight:report,preflightBinding:report?pure.persistedPreflightBinding(RECIPE,20,{}):''}};
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host),ctx=makeCtx({toolData});
  ctx.setToolData=fn=>{toolData=typeof fn==='function'?fn(toolData):fn;ctx.toolData=toolData;};
  React.act(()=>root.render(React.createElement(function Host(){return cfg.render(ctx);})));
  let alive=true;
  const app={host,ctx,button(label){return [...host.querySelectorAll('button')].find(n=>n.textContent===label);},click(node){expect(node).toBeTruthy();React.act(()=>{node.focus();node.dispatchEvent(new MouseEvent('click',{bubbles:true}));});},tab(name){return host.querySelector('[role="tab"][id="print-lab-tab-'+name.toLowerCase()+'"]');},unmount(){if(alive){React.act(()=>root.unmount());host.remove();alive=false;}}};
  mounted.push(app);return app;
}
function geometryHandoff(unitMm=12.5){
  const bytes=new Uint8Array(134),view=new DataView(bytes.buffer);view.setUint32(80,1,true);
  [0,-1,0,0,0,0,1,-2,0,0,-1,3].forEach((value,index)=>view.setFloat32(84+index*4,value,true));
  return {schema:'alloflow-print-source/1',id:'journey-gw',projectId:'journey-gw',sourceTool:'geometryWorld',format:'STL',unitMm,bytes,
    sourceModel:{schema:'alloflow-geometry-world-build/1',title:'Two pieces',coordinateSystem:'x-right,y-up,z-depth',blocks:[{x:0,y:1,z:0,type:'wood',shape:'cube',rotation:0},{x:5,y:1,z:0,type:'stone',shape:'cube',rotation:0}]}};
}
function expectStage(app,name){
  const tab=app.tab(name);expect(tab.getAttribute('aria-selected')).toBe('true');expect(document.activeElement).toBe(tab);
  expect(app.host.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe(tab.id);
}

describe('Print Lab accessible building-to-printing journey',()=>{
  it('reports selected blocks and the applied scale without claiming separated pieces are connected',()=>{
    window.__alloPrintLabPendingHandoff=geometryHandoff();const app=mount();
    const source=app.host.querySelector('[aria-labelledby="print-lab-geometry-source-title"]');
    expect(source.textContent).toContain('Applied: 12.5 mm / block');expect(source.textContent).toContain('Selected blocks2');
    expect(source.textContent).not.toContain('Connected blocks');expect(source.textContent).not.toContain('Default: 5');
    expect(app.host.textContent).toContain('Loaded your selected Geometry World blocks locally.');
  });
  it('moves focus out of the replaced model panel to the Preflight tab',()=>{
    window.__alloPrintLabPendingHandoff=geometryHandoff();const app=mount(),next=app.button('Check this model');
    app.click(next);expect(next.isConnected).toBe(false);expectStage(app,'Preflight');
  });
  it.each(['PASS','WARN'])('provides a focused route through Materials to Submit after %s checks',report=>{
    const app=mount({stage:'Preflight',report});app.click(app.button('Continue to Materials'));expectStage(app,'Materials');
    expect(app.host.querySelector('[data-print-next-step="materials"]').textContent).toContain('Selected filament:');
    app.click(app.button('Continue to Submit'));expectStage(app,'Submit');
  });
  it('routes a failed report back to model review instead of presenting it as ready',()=>{
    const app=mount({stage:'Preflight',report:'FAIL'});expect(app.button('Continue to Materials')).toBeUndefined();
    app.click(app.button('Review model & scale'));expectStage(app,'Design');
  });
  it.each([undefined,'FAIL'])('directs Materials back to unresolved preflight (%s)',report=>{
    const app=mount({stage:'Materials',report});expect(app.button('Continue to Submit')).toBeUndefined();
    app.click(app.button('Return to Preflight'));expectStage(app,'Preflight');
  });
  it('keeps arrow, Home and End tab navigation aligned with keyboard focus',()=>{
    const app=mount();app.tab('Design').focus();
    for(const [key,name] of [['ArrowRight','Preflight'],['End','Submit'],['Home','Design'],['ArrowLeft','Submit']]){
      const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true});React.act(()=>document.activeElement.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(true);expectStage(app,name);
    }
  });
  it('focuses only the originating Print Lab when another mounted instance has the same tab ids',()=>{
    const first=mount(),second=mount();second.click(second.button('Continue to Preflight'));
    expectStage(second,'Preflight');expect(first.tab('Design').getAttribute('aria-selected')).toBe('true');
  });
  it('does not queue a focus jump after newer navigation or after the view unmounts',()=>{
    vi.useFakeTimers();const app=mount();app.click(app.button('Continue to Preflight'));app.click(app.tab('Materials'));expectStage(app,'Materials');
    const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();
    React.act(()=>vi.advanceTimersByTime(100));expect(document.activeElement).toBe(outside);
    app.unmount();React.act(()=>vi.advanceTimersByTime(100));expect(document.activeElement).toBe(outside);outside.remove();
  });
});
