import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let THREE,makeShape,fixture,api;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const candidate=resolve(process.env.GW_COORDINATE_CANDIDATE || 'stem_lab/stem_tool_geometryworld_builder.js');
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync(candidate,'utf8'))();api=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8');
  const helpers=source.slice(source.indexOf('const key='),source.indexOf('function precedes('));
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,worldState,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
});
afterEach(()=>{
  fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
  for(const name of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[name];
});
const query=(app,selector)=>app.host.querySelector(selector);
const dock=app=>query(app,'.gwe-builder-dock');
const panel=app=>query(app,'.gwe-coordinate-selection');
const apply=app=>query(app,'[data-gwe-apply-coordinate-selection]');
const heading=app=>query(app,'#gwe-selected-creation-title');
const field=(app,name)=>query(app,'#gwe-select-'+name);
const selected=app=>(app.engine._builderSelection?.blocks || []).map(p=>[p.x,p.y,p.z].join(',')).sort();
const settle=()=>React.act(()=>vi.advanceTimersByTime(100));
function click(app,selector){const node=query(app,selector);expect(node).toBeTruthy();app.click(node);}
function choose(node,value){expect(node).toBeTruthy();React.act(()=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));});}
function draft(node,value){expect(node).toBeTruthy();React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});}
function disclosure(node,open){expect(node).toBeTruthy();React.act(()=>{node.open=open;node.dispatchEvent(new Event('toggle'));});}
function openDirect(app){disclosure(query(app,'.gwe-direct-controls'),true);disclosure(panel(app),true);settle();}
function startRegion(app,print=false){click(app,print?'[data-gwe-prepare="print"]':'[data-gwe-choose-selection]');click(app,'[data-gwe-select-region]');settle();expect(panel(app).open).toBe(true);expect(dock(app).dataset.coordinateSelecting).toBe('true');}
function review(app){const form=query(app,'.gwe-coordinate-selection-form'),event=new Event('submit',{bubbles:true,cancelable:true});React.act(()=>form.dispatchEvent(event));expect(event.defaultPrevented).toBe(true);}
function reviewAll(app){click(app,'[data-gwe-selection-bounds="all"]');review(app);expect(apply(app)).toBeTruthy();}
function applyWithFocus(app){const node=apply(app);expect(node).toBeTruthy();node.focus();app.click(node);}
function expectDirect(app){expect(panel(app).open).toBe(true);expect(dock(app).dataset.coordinateSelecting).toBe('true');expect(dock(app).dataset.printPreparing).toBe('false');expect(document.activeElement).toBe(query(app,'#gwe-coordinate-review'));}

describe('coordinate selection returns to editable creation only for chooser intent',()=>{
  it('takes a newly selected exact region directly to Selected creation and allows editing without Tools',()=>{
    const app=fixture.mount({retained:null}),before=fixture.worldState(app.engine);app.engine.blocks['8,2,0'].visible=false;
    startRegion(app);reviewAll(app);expect(app.engine._builderSelection).toBeNull();expect(fixture.worldState(app.engine)).toEqual(before);
    const announcement=app.ctx().announceToSR;applyWithFocus(app);settle();
    expect(panel(app).open).toBe(false);expect(dock(app).dataset.coordinateSelecting).toBe('false');expect(dock(app).dataset.selectionChoosing).toBe('false');expect(dock(app).dataset.printPreparing).toBe('false');
    expect(document.activeElement).toBe(heading(app));expect(heading(app).tabIndex).toBe(-1);expect(announcement).toHaveBeenCalledWith('5 of your blocks selected. Ready to edit.');
    expect(selected(app)).toEqual(['0,1,0','1,1,0','8,1,0','8,2,0','9,1,0']);expect(app.engine._builderSelection.exact).toBe(true);
    expect(app.state().measureResult.count).toBe(5);expect(app.engine.blocks['8,2,0'].visible).toBe(false);expect(fixture.worldState(app.engine)).toEqual(before);
    const edit=query(app,'[data-gwe-edit-selection]');expect(edit.disabled).toBe(false);app.click(edit);settle();expect(query(app,'.gwe-creation-editor').open).toBe(true);expect(document.activeElement).toBe(query(app,'.gwe-creation-editor > summary'));
  });
  it('brings the new heading into the scroll body when the focused coordinate form was scrolled',()=>{
    const app=fixture.mount({retained:null});startRegion(app);reviewAll(app);applyWithFocus(app);
    const body=query(app,'.gwe-builder-body'),target=heading(app);body.scrollTop=240;
    vi.spyOn(body,'getBoundingClientRect').mockReturnValue({top:80,bottom:600,height:520});vi.spyOn(target,'getBoundingClientRect').mockReturnValue({top:-150,bottom:-120,height:30});settle();
    expect(document.activeElement).toBe(target);expect(body.scrollTop).toBeLessThan(240);
  });
  it('keeps chosen range and material drafts, but clears chooser intent before a later direct edit',()=>{
    const app=fixture.mount();startRegion(app);choose(query(app,'#gwe-select-material'),'wood');review(app);applyWithFocus(app);settle();
    expect(selected(app)).toEqual(['8,1,0','8,2,0','9,1,0']);expect(document.activeElement).toBe(heading(app));
    openDirect(app);expect(field(app,'to-x').value).toBe('9');expect(query(app,'#gwe-select-material').value).toBe('wood');review(app);applyWithFocus(app);settle();expectDirect(app);
  });
  it('returns a nonempty partial removal to the retained creation rather than using preview match count',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine);startRegion(app);choose(query(app,'#gwe-select-operation'),'remove');draft(field(app,'to-x'),'0');review(app);applyWithFocus(app);settle();
    expect(selected(app)).toEqual(['1,1,0']);expect(document.activeElement).toBe(heading(app));expect(panel(app).open).toBe(false);expect(fixture.worldState(app.engine)).toEqual(before);
  });
  it('keeps remove-all results in coordinates with actionable focus and unchanged geometry/history',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine);startRegion(app);choose(query(app,'#gwe-select-operation'),'remove');reviewAll(app);applyWithFocus(app);settle();
    expect(app.engine._builderSelection).toBeNull();expect(app.state().measureResult).toBeNull();expectDirect(app);expect(query(app,'#gwe-coordinate-selection-status').textContent).toContain('Selection cleared');expect(fixture.worldState(app.engine)).toEqual(before);
  });
  it('carries chooser-print directly into print preparation, preserving its established focus target',()=>{
    const app=fixture.mount({retained:null}),before=fixture.worldState(app.engine);startRegion(app,true);reviewAll(app);expect(apply(app).textContent).toBe('Use selection & prepare print');applyWithFocus(app);settle();
    expect(panel(app).open).toBe(false);expect(dock(app).dataset.printPreparing).toBe('true');expect(document.activeElement).toBe(query(app,'#gwe-print-title'));expect(selected(app)).toHaveLength(5);expect(fixture.worldState(app.engine)).toEqual(before);
  });
  it('keeps directly opened coordinates available for repeated selection refinements',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine);openDirect(app);reviewAll(app);applyWithFocus(app);settle();expectDirect(app);
    choose(query(app,'#gwe-select-material'),'wood');review(app);applyWithFocus(app);settle();expectDirect(app);expect(selected(app)).toHaveLength(3);expect(fixture.worldState(app.engine)).toEqual(before);
  });
  it('keeps directly opened finder coordinates in place after applying',()=>{
    const app=fixture.mount({retained:null});click(app,'.gwe-tool-finder-toggle');click(app,'[data-tool="coordinates"]');settle();reviewAll(app);applyWithFocus(app);settle();expectDirect(app);
  });
  it.each(['native-summary','tools','escape'])('does not carry an abandoned chooser intent into direct coordinates after %s',route=>{
    const app=fixture.mount();startRegion(app);
    if(route==='native-summary')app.click(panel(app).querySelector('summary'));
    else if(route==='tools')click(app,'[aria-label="Return to build tools"]');
    else {const node=field(app,'from-x');node.focus();React.act(()=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));}
    settle();openDirect(app);reviewAll(app);applyWithFocus(app);settle();expectDirect(app);
  });
  it.each(['select','print'])('keeps fresh %s chooser intent despite a delayed native toggle from an earlier programmatic close',intent=>{
    const app=fixture.mount({retained:null});startRegion(app);click(app,'[aria-label="Return to build tools"]');settle();
    click(app,intent==='print'?'[data-gwe-prepare="print"]':'[data-gwe-choose-selection]');
    disclosure(panel(app),false);click(app,'[data-gwe-select-region]');settle();reviewAll(app);applyWithFocus(app);settle();
    expect(panel(app).open).toBe(false);expect(selected(app)).toHaveLength(5);
    if(intent==='print'){expect(dock(app).dataset.printPreparing).toBe('true');expect(document.activeElement).toBe(query(app,'#gwe-print-title'));}
    else {expect(dock(app).dataset.printPreparing).toBe('false');expect(document.activeElement).toBe(heading(app));}
  });
  it('keeps a stale reviewed selection in the coordinate workbench with its error and prior outline',()=>{
    const app=fixture.mount();startRegion(app);reviewAll(app);const previous=selected(app);app.engine.blocks['8,1,0'].userData.blockType='brick';const changed=fixture.worldState(app.engine);applyWithFocus(app);settle();
    expectDirect(app);expect(selected(app)).toEqual(previous);expect(query(app,'#gwe-coordinate-selection-status').textContent).toMatch(/changed|again/i);expect(fixture.worldState(app.engine)).toEqual(changed);
  });
  it('keeps invalid-field focus and existing selection while a chooser proposal is incomplete',()=>{
    const app=fixture.mount(),selection=selected(app),before=fixture.worldState(app.engine);startRegion(app);draft(field(app,'from-x'),'1.5');review(app);settle();
    expect(apply(app)).toBeNull();expect(document.activeElement).toBe(field(app,'from-x'));expect(field(app,'from-x').getAttribute('aria-invalid')).toBe('true');expect(panel(app).open).toBe(true);expect(selected(app)).toEqual(selection);expect(fixture.worldState(app.engine)).toEqual(before);
  });
  it.each(['modal','engine','transition','lesson','focus-request'])('does not let the queued editing handoff steal focus after a new %s owner',kind=>{
    const app=fixture.mount();startRegion(app);reviewAll(app);applyWithFocus(app);
    const target=document.createElement(kind==='modal'?'section':'button');target.tabIndex=-1;app.host.querySelector('main').appendChild(target);
    if(kind==='modal'){target.setAttribute('role','dialog');target.setAttribute('aria-modal','true');}
    else if(kind==='engine')window.__geoWorldEngine={...app.engine};
    else if(kind==='transition')app.engine._pendingWorldTransition={};
    else if(kind==='lesson')app.patch({activeLesson:'volumeExplorer'});
    else click(app,'.gwe-tool-finder-toggle');
    target.focus();settle();expect(document.activeElement).toBe(target);
  });
});


describe('coordinate navigation focus belongs to the current learner action',()=>{
  function holdNavigationFrames(){
    const held=new Map();let next=100000,capturing=false,scheduled=0;
    const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
    const capture=action=>{const previous=capturing;capturing=true;try{return action();}finally{capturing=previous;}};
    vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{if(capturing){const id=next++;held.set(id,fn);scheduled++;return id;}return request(fn);});
    vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>{if(!held.delete(id))cancel(id);});
    function flushOne(){const entry=held.entries().next();if(entry.done)return false;const [id,fn]=entry.value;held.delete(id);capture(()=>React.act(()=>fn(1)));return true;}
    return {held,capture,flushOne,get scheduled(){return scheduled;},flush(){let count=0;while(flushOne()){if(++count>20)throw Error('Unexpected unbounded frame fixture');}}};
  }
  function beginHeldRegion(app,frames,print=false){
    click(app,print?'[data-gwe-prepare="print"]':'[data-gwe-choose-selection]');settle();
    frames.capture(()=>click(app,'[data-gwe-select-region]'));settle();
    expect(panel(app).open).toBe(true);expect(frames.scheduled).toBe(1);
  }
  function bodyFocus(){if(document.activeElement!==document.body)document.activeElement.blur();expect(document.activeElement).toBe(document.body);}
  it.each(['outer','inner'])('does not let a stale %s source navigation frame overwrite direct-review focus after native summary reopen',phase=>{
    const frames=holdNavigationFrames(),app=fixture.mount(),before=fixture.worldState(app.engine);
    beginHeldRegion(app,frames);expect(document.activeElement).toBe(panel(app).querySelector('summary'));
    if(phase==='inner'){frames.flushOne();settle();expect(frames.held.size).toBe(1);}
    const summary=panel(app).querySelector('summary');summary.focus();app.click(summary);settle();expect(panel(app).open).toBe(false);
    app.click(summary);settle();expect(panel(app).open).toBe(true);
    reviewAll(app);applyWithFocus(app);settle();expectDirect(app);
    frames.flush();settle();expectDirect(app);expect(fixture.worldState(app.engine)).toEqual(before);
  });
  it('keeps normal chooser autofocus when no newer learner intent supersedes either frame',()=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);
    frames.flush();settle();expect(document.activeElement).toBe(panel(app).querySelector('summary'));
    expect(query(app,'.gwe-direct-controls').open).toBe(true);expect(panel(app).open).toBe(true);
    reviewAll(app);applyWithFocus(app);settle();expect(document.activeElement).toBe(heading(app));
  });
  it.each(['pointerdown','touchstart','keydown','click','input','change'])('permanently cancels a queued scroll/focus handoff on later %s, even when focus stays on its destination',type=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);frames.flushOne();settle();
    const summary=panel(app).querySelector('summary');summary.focus();
    React.act(()=>summary.dispatchEvent(type==='keydown'?new KeyboardEvent(type,{key:'Tab',bubbles:true}):new Event(type,{bubbles:true})));
    const body=query(app,'.gwe-builder-body');body.scrollTop=200;frames.flush();settle();
    expect(document.activeElement).toBe(summary);expect(body.scrollTop).toBe(200);expect(frames.held.size).toBe(0);
  });
  it.each(['other-focus','modal-focus','other-summary'])('never resurrects a request after %s returns to body before the queued frame',kind=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);
    let target;
    if(kind==='other-summary')target=query(app,'.gwe-starter-library > summary');
    else {target=document.createElement(kind==='modal-focus'?'section':'button');target.tabIndex=-1;query(app,'main').appendChild(target);if(kind==='modal-focus'){target.setAttribute('role','dialog');target.setAttribute('aria-modal','true');}}
    target.focus();bodyFocus();if(kind==='modal-focus')target.remove();
    frames.flush();settle();expect(document.activeElement).toBe(document.body);expect(frames.held.size).toBe(0);
  });
  it.each(['engine','lesson','blocks','workspace','dock'])('rejects a stale request after the %s owner is replaced',kind=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);bodyFocus();
    if(kind==='engine')window.__geoWorldEngine={...app.engine};
    if(kind==='lesson')app.engine._currentLesson={...app.engine._currentLesson};
    if(kind==='blocks')app.engine.blocks={...app.engine.blocks};
    if(kind==='workspace'){query(app,'main').id='old-coordinate-workspace';const replacement=document.createElement('main');replacement.id='geoworld-fs-workspace';app.host.appendChild(replacement);}
    if(kind==='dock'){dock(app).className='old-coordinate-dock';const replacement=document.createElement('aside');replacement.className='gwe-builder-dock';replacement.innerHTML='<details class="gwe-coordinate-selection"><summary>Other session</summary></details>';query(app,'main').appendChild(replacement);}
    frames.flush();settle();expect(document.activeElement).toBe(document.body);expect(frames.held.size).toBe(0);
  });
  it('rejects a target replaced after the first frame while the old target is still connected to its dock',()=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);frames.flushOne();settle();bodyFocus();
    const old=panel(app),replacement=old.cloneNode(true);old.className='gwe-details previous-coordinate-selection';old.parentElement.appendChild(replacement);
    frames.flush();settle();expect(document.activeElement).toBe(document.body);expect(old.isConnected).toBe(true);
  });
  it('keeps the existing modal guard before opening a queued tool',()=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);bodyFocus();
    const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');query(app,'main').appendChild(modal);
    frames.flush();settle();expect(document.activeElement).toBe(document.body);expect(frames.held.size).toBe(0);
  });
  it('a newer finder action supersedes and removes both old frame and listeners',()=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);frames.flushOne();settle();click(app,'.gwe-tool-finder-toggle');
    const input=query(app,'#gwe-tool-query');expect(document.activeElement).toBe(input);expect(frames.held.size).toBe(0);frames.flush();settle();expect(document.activeElement).toBe(input);
  });
  it.each(['outer','inner'])('unmount cancels the owned %s frame without leaving a later focus handoff',phase=>{
    const frames=holdNavigationFrames(),app=fixture.mount();beginHeldRegion(app,frames);if(phase==='inner'){frames.flushOne();settle();}
    expect(frames.held.size).toBe(1);fixture.cleanup();expect(frames.held.size).toBe(0);
    const target=document.createElement('button');document.body.appendChild(target);target.focus();frames.flush();settle();expect(document.activeElement).toBe(target);target.remove();
  });
});
