import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let mounted,frames;
beforeEach(()=>{
  vi.useFakeTimers();
  const lab=resetStemLab();
  lab.registerTool('geometryWorld',{aliases:[],render(ctx){
    const h=ctx.React.createElement;
    return h('main',{id:'geoworld-fs-workspace'},h('div',{id:'geoworld-fs-wrap',tabIndex:0}),
      h('div',{className:'gw-hotbar'},h('button',{className:'gw-hotbar-item','aria-pressed':'false'},'Stone'),h('button',{className:'gw-hotbar-item','aria-pressed':'true'},'Wood')));
  }});
  if(!document.getElementById('allo-geometryworld-builder-css')){
    const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);
  }
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  frames=[];
  vi.spyOn(window,'requestAnimationFrame').mockImplementation(callback=>{frames.push(callback);return frames.length;});
});
afterEach(()=>{
  if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}
  delete window.__geoWorldEngine;
  vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
});
function mount(){
  const engine={_currentLesson:window.StemLab.geometryWorldBuilderPure.FREE_BUILD_LESSON,blocks:{},blocksPlaced:0,_builderSelection:null,_modalState:{},releaseInput:vi.fn(),camera:{position:{x:1,y:3,z:6}},getBlocksArr(){return Object.values(this.blocks);}};
  window.__geoWorldEngine=engine;
  const host=document.createElement('div');document.body.appendChild(host);
  let current;
  function Host(){
    const [data,setData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,sandboxDockCollapsed:false,builderPanel:'build',selectedBlock:2,selectedShape:2,blockRotation:2}});
    current=data.geometryWorld;
    return window.StemLab._registry.geometryWorld.render({React,toolData:data,updateMulti:(tool,patch)=>setData(old=>({...old,[tool]:{...old[tool],...patch}})),addToast:vi.fn(),announceToSR:vi.fn()});
  }
  const root=ReactDOMClient.createRoot(host);React.act(()=>root.render(React.createElement(Host)));mounted={root,host};
  return {engine,host,state:()=>current,click:node=>React.act(()=>node.click())};
}
function frame(){expect(frames.length).toBeGreaterThan(0);React.act(()=>frames.shift()(0));}
function drainFrames(){while(frames.length)frame();}
function openFinder(app){app.click(app.host.querySelector('.gwe-tool-finder-toggle'));return app.host.querySelector('#gwe-tool-query');}
function selectTool(app){openFinder(app);app.click(app.host.querySelector('[data-tool=select]'));}
function modal(app){
  const dialog=document.createElement('section');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
  app.host.querySelector('#geoworld-fs-workspace').appendChild(dialog);app.engine._modalState.showGameSettings=true;dialog.focus();return dialog;
}

describe('finder focus handoffs respect the current workspace',()=>{
  it('normally opens selection controls and focuses their summary without changing geometry',()=>{
    const app=mount(),blocks=app.engine.blocks;selectTool(app);frame();frame();
    const controls=app.host.querySelector('.gwe-direct-controls');
    expect(controls.open).toBe(true);expect(document.activeElement).toBe(controls.querySelector('summary'));expect(app.engine.blocks).toBe(blocks);expect(app.engine._builderSelection).toBeNull();
  });
  it.each(['first','second'])('does not steal a modal focus before the %s navigation frame',phase=>{
    const app=mount();selectTool(app);if(phase==='second')frame();const dialog=modal(app);drainFrames();
    expect(document.activeElement).toBe(dialog);expect(app.host.querySelector('.gwe-builder-body').scrollTop).toBe(0);
  });
  it('does not focus a still-connected target after the engine changes between frames',()=>{
    const app=mount();selectTool(app);frame();const outside=document.createElement('button');app.host.appendChild(outside);outside.focus();
    window.__geoWorldEngine={_destroyed:false};drainFrames();expect(document.activeElement).toBe(outside);
  });
  it.each(['first','second'])('defers to a pending world transition before the %s navigation frame',phase=>{
    const app=mount();selectTool(app);if(phase==='second')frame();const outside=document.createElement('button');app.host.appendChild(outside);outside.focus();
    app.engine._pendingWorldTransition={};drainFrames();expect(document.activeElement).toBe(outside);
  });
  it('normally restores finder trigger focus after Escape',()=>{
    const app=mount(),input=openFinder(app);React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));drainFrames();
    expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();expect(document.activeElement).toBe(app.host.querySelector('.gwe-tool-finder-toggle'));
  });
  it('does not restore finder trigger focus over a modal opened after Escape',()=>{
    const app=mount(),input=openFinder(app);React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));const dialog=modal(app);drainFrames();
    expect(document.activeElement).toBe(dialog);expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();
  });
  it('keeps focus in the finder when it reopens before the queued Escape return',()=>{
    const app=mount(),input=openFinder(app);React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    const reopened=openFinder(app);drainFrames();
    expect(app.host.querySelector('.gwe-tool-finder')).not.toBeNull();expect(document.activeElement).toBe(reopened);
  });
  it.each(['first','second'])('cancels stale tool navigation when the finder reopens before its %s frame',phase=>{
    const app=mount();selectTool(app);if(phase==='second')frame();const reopened=openFinder(app);drainFrames();
    expect(document.activeElement).toBe(reopened);expect(app.host.querySelector('.gwe-builder-body').scrollTop).toBe(0);
    if(phase==='first')expect(app.host.querySelector('.gwe-direct-controls').open).toBe(false);
  });
  it.each(['first','second'])('lets only the latest tool request focus after superseding the %s frame',phase=>{
    const app=mount();selectTool(app);if(phase==='second')frame();
    const obsoleteFocus=vi.spyOn(app.host.querySelector('.gwe-direct-controls summary'),'focus');openFinder(app);app.click(app.host.querySelector('[data-tool=draw]'));drainFrames();
    expect(obsoleteFocus).not.toHaveBeenCalled();expect(app.host.querySelector('.gwe-drawing-tools').contains(document.activeElement)).toBe(true);
  });
  it('does not focus the trigger between a queued Escape return and a newer tool request',()=>{
    const app=mount(),input=openFinder(app),triggerFocus=vi.spyOn(app.host.querySelector('.gwe-tool-finder-toggle'),'focus');
    React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));openFinder(app);app.click(app.host.querySelector('[data-tool=draw]'));drainFrames();
    expect(triggerFocus).not.toHaveBeenCalled();expect(app.host.querySelector('.gwe-drawing-tools').contains(document.activeElement)).toBe(true);
  });
  it('routes Shapes & materials to the live palette without changing the build recipe',()=>{
    const app=mount(),before=[app.state().selectedBlock,app.state().selectedShape,app.state().blockRotation];openFinder(app);app.click(app.host.querySelector('[data-tool=palette]'));
    drainFrames();React.act(()=>vi.advanceTimersByTime(40));
    expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();expect(app.state().sandboxDockCollapsed).toBe(true);
    expect(document.activeElement).toBe(app.host.querySelector('.gw-hotbar-item[aria-pressed="true"]'));expect([app.state().selectedBlock,app.state().selectedShape,app.state().blockRotation]).toEqual(before);
  });
  it('does not move palette-route focus over a newly opened modal',()=>{
    const app=mount();openFinder(app);app.click(app.host.querySelector('[data-tool=palette]'));const dialog=modal(app);
    drainFrames();React.act(()=>vi.advanceTimersByTime(40));expect(document.activeElement).toBe(dialog);
  });
});

describe('fresh-sandbox launcher keeps keyboard shortcuts inside its dialog',()=>{
  it.each([['u','KeyU'],['q','KeyQ'],['r','KeyR'],['Escape','Escape']])('does not forward %s to document-level world shortcuts',(key,code)=>{
    const app=mount();React.act(()=>app.engine.openFreeBuildLauncher());React.act(()=>vi.advanceTimersByTime(30));
    const launcher=app.host.querySelector('#gwe-sandbox-launcher'),forwarded=vi.fn();document.addEventListener('keydown',forwarded);
    try{
      React.act(()=>launcher.dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true,cancelable:true})));
      expect(forwarded).not.toHaveBeenCalled();expect(!!app.host.querySelector('#gwe-sandbox-launcher')).toBe(key!=='Escape');
    }finally{document.removeEventListener('keydown',forwarded);}
  });
});
