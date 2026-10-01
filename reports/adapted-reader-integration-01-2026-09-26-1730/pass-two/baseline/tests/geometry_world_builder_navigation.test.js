import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let mounted;
beforeEach(()=>{
  vi.useFakeTimers();
  const lab=resetStemLab();
  lab.registerTool('geometryWorld',{aliases:[],render(ctx){
    const h=ctx.React.createElement;
    return h('main',{id:'geoworld-fs-workspace'},
      h('div',{id:'geoworld-fs-wrap',tabIndex:0}),
      h('div',{className:'gw-hotbar'},
        h('button',{className:'gw-hotbar-item','aria-pressed':'false'},'Stone'),
        h('button',{className:'gw-hotbar-item','aria-pressed':'true'},'Wood')),
      h('div',{className:'gw-shape-tray'},
        h('button',{className:'gw-shape-item','aria-pressed':'false'},'Cube'),
        h('button',{className:'gw-shape-item','aria-pressed':'true'},'Half slab')));
  }});
  if(!document.getElementById('allo-geometryworld-builder-css')){
    const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);
  }
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
});
afterEach(()=>{
  if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}
  delete window.__geoWorldEngine;
  vi.restoreAllMocks();vi.clearAllTimers();vi.useRealTimers();
});
function mesh(layer='student'){
  return {userData:{gridPos:{x:0,y:layer==='ground'?0:1,z:0},blockType:layer==='ground'?'grass':'wood',shape:'halfB',rotation:2,volume:.5,_measurementLayer:layer,_lessonBlock:layer==='ground'}};
}
function mount({empty=false,initial={}}={}){
  const api=window.StemLab.geometryWorldBuilderPure;
  const engine={_currentLesson:api.FREE_BUILD_LESSON,blocks:{'0,0,0':mesh('ground')},blocksPlaced:47,_undoStack:[{action:'place',x:0,y:1,z:0}],_redoStack:[{action:'remove',x:2,y:1,z:0}],_builderSelection:{blocks:[{x:0,y:1,z:0}]},releaseInput:vi.fn(),camera:{position:{x:1,y:3,z:6}},getBlocksArr(){return Object.values(this.blocks);}};
  if(!empty)engine.blocks['0,1,0']=mesh();
  window.__geoWorldEngine=engine;
  let current,patch;
  const announce=vi.fn(),navigate=vi.fn(),host=document.createElement('div');document.body.appendChild(host);
  function Host(){
    const [data,setData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,sandboxDockCollapsed:false,...initial,builderPanel:'build',selectedBlock:2,selectedShape:2,blockRotation:2,builderPrintContext:{unitMm:12.5,aiUse:'NONE'}}});
    current=data.geometryWorld;patch=values=>setData(old=>({...old,geometryWorld:{...old.geometryWorld,...values}}));
    return window.StemLab._registry.geometryWorld.render({React,toolData:data,updateMulti:(tool,values)=>setData(old=>({...old,[tool]:{...old[tool],...values}})),setStemLabTool:navigate,addToast:vi.fn(),announceToSR:announce});
  }
  const root=ReactDOMClient.createRoot(host);React.act(()=>root.render(React.createElement(Host)));mounted={root,host};
  const button=text=>Array.from(host.querySelectorAll('button')).find(node=>node.textContent===text);
  return {engine,host,root,announce,navigate,state:()=>current,button,patch:values=>React.act(()=>patch(values)),click:node=>React.act(()=>node.click()),tick:ms=>React.act(()=>vi.advanceTimersByTime(ms)),print:()=>host.querySelector('[aria-label="Send selected build to Print Lab"]'),step:()=>host.querySelector('.gwe-workflow [aria-current="step"]')?.textContent};
}
function immutableState(app){
  return JSON.stringify({blocks:app.engine.blocks,selection:app.engine._builderSelection,undo:app.engine._undoStack,redo:app.engine._redoStack,camera:app.engine.camera,placed:app.engine.blocksPlaced,print:app.state().builderPrintContext,recipe:[app.state().selectedBlock,app.state().selectedShape,app.state().blockRotation]});
}
describe('Free Build dock guides the current stage',()=>{
  it('prioritizes building and explains unavailable printing in an empty world despite old placement totals',()=>{
    const app=mount({empty:true});
    expect(app.step()).toBe('1Build');expect(app.button('Start building')).toBeTruthy();expect(app.print().disabled).toBe(true);
    const help=app.host.querySelector('#'+app.print().getAttribute('aria-describedby'));expect(help?.textContent).toContain('Then choose Select build');
    app.click(app.print());expect(app.navigate).not.toHaveBeenCalled();
  });
  it('tracks actual block presence when the first block is built, then removed',()=>{
    const app=mount({empty:true});app.engine.blocks['0,1,0']=mesh();app.tick(250);
    expect(app.step()).toBe('2Select');expect(app.button('Select build')).toBeTruthy();expect(app.print().disabled).toBe(false);
    delete app.engine.blocks['0,1,0'];app.tick(250);
    expect(app.step()).toBe('1Build');expect(app.button('Start building')).toBeTruthy();expect(app.print().disabled).toBe(true);
  });
  it.each(['Start building','Back to building'])('%s restores the world focus and preserves project data',label=>{
    const app=mount({empty:true}),before=immutableState(app);app.click(app.button(label));app.tick(40);
    expect(app.state().sandboxDockCollapsed).toBe(true);expect(app.host.querySelector('.gwe-builder-body')).toBeNull();
    expect(document.activeElement.id).toBe('geoworld-fs-wrap');expect(app.button('Build tools')).toBeTruthy();
    expect(app.engine.releaseInput).toHaveBeenCalledOnce();expect(immutableState(app)).toBe(before);
  });
});
// The palette and shape tray are open in Free Build, so the Studio panel stopped
// repeating them as Change material / Change shape cards (2026-09-24). Collapsing the
// panel still hands focus to the world after a short delay, and that hand-off keeps
// its safety rules.
describe('collapsing the Studio panel returns to building without changing the recipe',()=>{
  it('no longer repeats the material and shape choices the bottom bar already shows',()=>{
    const app=mount();
    expect(app.host.querySelector('[aria-label^="Change material."]')).toBeNull();
    expect(app.host.querySelector('[aria-label^="Change shape."]')).toBeNull();
    expect(app.host.querySelector('.gwe-current-tools')).toBeNull();
  });
  it('the header collapse action returns focus to the world',()=>{
    const app=mount(),before=immutableState(app);app.click(app.host.querySelector('[aria-label="Collapse Free Build Studio"]'));app.tick(40);
    expect(app.state().sandboxDockCollapsed).toBe(true);expect(document.activeElement.id).toBe('geoworld-fs-wrap');expect(immutableState(app)).toBe(before);
  });
  it.each(['home','engine','expanded'])('does not steal focus after %s changes during the delayed focus handoff',change=>{
    const app=mount();app.click(app.host.querySelector('[aria-label="Collapse Free Build Studio"]'));
    const outside=document.createElement('button');app.host.appendChild(outside);outside.focus();
    if(change==='home')app.patch({showGeometryHome:true});
    if(change==='expanded')app.patch({sandboxDockCollapsed:false});
    if(change==='engine')window.__geoWorldEngine={};
    const expectedFocus=change==='home'?app.host.querySelector('.gwe-home'):outside;
    app.tick(40);expect(document.activeElement).toBe(expectedFocus);outside.remove();
  });
  it('respects a modal opened before the delayed focus handoff',()=>{
    const app=mount();app.click(app.host.querySelector('[aria-label="Collapse Free Build Studio"]'));
    const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.tabIndex=-1;
    app.host.querySelector('#geoworld-fs-workspace').appendChild(modal);modal.focus();app.tick(40);
    expect(document.activeElement).toBe(modal);modal.remove();
  });
  it('cancels pending focus when the tool unmounts',()=>{
    const app=mount();app.click(app.host.querySelector('[aria-label="Collapse Free Build Studio"]'));
    React.act(()=>app.root.unmount());mounted=null;
    const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();app.tick(40);
    expect(document.activeElement).toBe(outside);outside.remove();app.host.remove();
  });
});

// A phone, upright or sideways, starts the Studio panel folded when no choice is saved
// (2026-09-24); it covered 70% of an upright phone's world and 46% of a sideways one's.
describe('the Studio panel starts folded on a phone',()=>{
  const original=window.matchMedia;
  afterEach(()=>{window.matchMedia=original;});
  it.each([[true,'true'],[false,'false']])('narrow or short screen %s: data-collapsed %s',(small,collapsed)=>{
    window.matchMedia=query=>({matches:small && /max-width:800px|max-height:520px/.test(query),media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    const app=mount({initial:{sandboxDockCollapsed:undefined}});
    expect(app.host.querySelector('.gwe-builder-dock').getAttribute('data-collapsed')).toBe(collapsed);
  });
  it('a saved choice wins over the screen size',()=>{
    window.matchMedia=query=>({matches:true,media:query,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
    const app=mount({initial:{sandboxDockCollapsed:false}});
    expect(app.host.querySelector('.gwe-builder-dock').getAttribute('data-collapsed')).toBe('false');
  });
});
