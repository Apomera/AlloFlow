import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';
const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let mounted;
function mount() {
  vi.useFakeTimers();window.THREE=undefined;
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render:()=>React.createElement('main',{id:'geoworld-fs-workspace'},React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}))});
  const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);
  new Function(source)();
  const initial={userData:{gridPos:{x:0,y:1,z:0},blockType:'stone',shape:'cube',rotation:0,_measurementLayer:'student'}};
  let patch,current;
  const engine=window.__geoWorldEngine={blocks:{'0,1,0':initial},_currentLesson:{sandbox:true},_showcase:{look:'studio'},_builderSelection:{blocks:[initial.userData.gridPos]},_undoStack:[{type:'place'}],_redoStack:[],blocksPlaced:1,
    getBlocksArr(){return Object.values(this.blocks);},measureStructure(){return {blocks:[initial.userData.gridPos],count:1,L:1,W:1,H:1,isComplete:true,totalVolume:1};},
    rotateShowcase:vi.fn(),endShowcase:vi.fn(()=>{engine._showcase=null;patch({showcaseActive:false});}),
    loadLesson:vi.fn(()=>{engine.blocks={};engine._builderSelection=null;}),
    placeBlock:vi.fn((x,y,z,type,shape,rotation)=>{engine.blocks[[x,y,z].join(',')]={userData:{gridPos:{x,y,z},blockType:type,shape,rotation,_measurementLayer:'student'}};}),logEvent:vi.fn()};
  const host=document.createElement('div');document.body.appendChild(host);const root=ReactDOMClient.createRoot(host);
  function Host(){const [toolData,setToolData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,showcaseActive:true,showcaseLook:'studio',sandboxDockCollapsed:true,builderPrintContext:{unitMm:12.5}}});current=toolData.geometryWorld;patch=p=>setToolData(old=>({...old,geometryWorld:{...old.geometryWorld,...p}}));
    return lab._registry.geometryWorld.render(makeCtx({toolData,setToolData,updateMulti:(key,p)=>setToolData(old=>({...old,[key]:{...old[key],...p}})),addToast:vi.fn(),announceToSR:vi.fn()}));}
  React.act(()=>root.render(React.createElement(Host)));mounted={root,host,style};
  const button=text=>Array.from(host.querySelectorAll('button')).find(n=>n.textContent===text);
  const click=node=>React.act(()=>node.click());
  const key=(node,key,shiftKey=false)=>{const event=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,shiftKey});React.act(()=>node.dispatchEvent(event));return event;};
  const choose=async text=>{const input=host.querySelector('input[type=file]');Object.defineProperty(input,'files',{configurable:true,value:[{size:typeof text==='string'?text.length:20,text:typeof text==='function'?text:()=>Promise.resolve(text)}]});await React.act(async()=>{input.dispatchEvent(new Event('change',{bubbles:true}));await Promise.resolve();await Promise.resolve();});};
  return {host,engine,button,click,key,choose,state:()=>current,patch:p=>React.act(()=>patch(p)),open:()=>click(button('Use & export'))};
}
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted.style.remove();mounted=null;}delete window.__geoWorldEngine;vi.restoreAllMocks();vi.useRealTimers();});
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
    expect(app.state()).toMatchObject({showcaseActive:false,sandboxDockCollapsed:false,builderPrintContext:null,builderPanel:'build'});
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
    expect(document.activeElement).toBe(app.button('Choose editable JSON'));
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
    const inputClick=vi.spyOn(HTMLInputElement.prototype,'click');app.click(app.button('Choose editable JSON'));expect(inputClick).not.toHaveBeenCalled();
    app.patch({showcaseSaving:true});for(const text of ['Download editable JSON','Download STL','Open in Print Lab','Choose editable JSON'])expect(app.button(text).disabled).toBe(true);
  });
});
