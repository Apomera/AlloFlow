import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let THREE,makeShape,api,fixture;
beforeAll(()=>{
  THREE={};
  new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8');
  const helpers=source.slice(source.indexOf('const key='),source.indexOf('function precedes('));
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
});
afterEach(()=>{
  fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
  for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[key];
});

function settle(){React.act(()=>vi.advanceTimersByTime(80));}
function activate(node){expect(node).toBeTruthy();React.act(()=>{node.focus();node.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:0}));});}
function button(container,label){const node=[...container.querySelectorAll('button')].find(item=>item.textContent===label);expect(node,label).toBeTruthy();return node;}
function open(details){React.act(()=>{details.open=true;details.dispatchEvent(new Event('toggle'));});settle();}
function draft(input,value){React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}
function snapshot(engine){return JSON.stringify({blocks:Object.values(engine.blocks).map(mesh=>({...mesh.userData,position:mesh.position.toArray(),quaternion:mesh.quaternion.toArray()})),undo:engine._undoStack,redo:engine._redoStack,selection:engine._builderSelection,camera:engine.camera.position.toArray(),cameraQuaternion:engine.camera.quaternion.toArray()});}
function rawLibrary(){return window.localStorage.getItem(api.BUILD_STAMP_KEY);}
function library(){return api.readBuildStamps().stamps;}
function externalLibrary(stamps){window.localStorage.setItem(api.BUILD_STAMP_KEY,JSON.stringify({schema:'alloflow-build-stamps/1',stamps}));}
function confirmation(app){return app.host.querySelector('[data-gwe-stamp-remove-confirmation]');}
function selectedCard(app){return app.host.querySelector('.gwe-stamp-card[aria-pressed="true"]');}
function mountStamps(names=['Stone step']){
  const app=fixture.mount();
  const engine=app.engine;
  engine.previewBuildBatch=vi.fn((additions,removals)=>({ok:true,additions,removals}));
  engine.commitBuildBatch=vi.fn(()=>({ok:true}));
  engine.cancelDrawing=vi.fn();engine.setDrawMode=vi.fn();
  engine.showBuildBatchPreview=vi.fn((plan,owner)=>{engine._buildBatchPreview={owner,plan};});
  engine.clearBuildBatchPreview=vi.fn(owner=>{if(engine._buildBatchPreview?.owner===owner)engine._buildBatchPreview=null;});
  const section=app.host.querySelector('.gwe-stamp-library');open(section);
  for(const name of names){
    draft(app.host.querySelector('#gwe-stamp-name'),name);
    React.act(()=>app.host.querySelector('.gwe-stamp-save').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  }
  open(app.host.querySelector('.gwe-stamp-manage'));
  return app;
}
function requestRemoval(app){activate(app.host.querySelector('[data-gwe-remove-stamp]'));settle();const panel=confirmation(app);expect(panel).toBeTruthy();return panel;}

describe('named stamp removal preserves reusable recipes until confirmation',()=>{
  it.each(['Keep stamp','Escape'])('restores stamp drafts, scroll, preview and origin focus after focused %s',route=>{
    const app=mountStamps(),before=snapshot(app.engine),raw=rawLibrary();
    const name=app.host.querySelector('#gwe-stamp-name');
    const corner=app.host.querySelector('#gwe-stamp-corner-x');
    draft(name,'A window for later');draft(corner,'11');
    activate(button(app.host,'Preview stamp'));settle();
    const preview=app.engine._buildBatchPreview;
    const body=app.host.querySelector('.gwe-builder-body');
    body.scrollTop=180;
    const remove=app.host.querySelector('[data-gwe-remove-stamp]'),panel=requestRemoval(app);
    expect(app.host.querySelector('.gwe-builder-dock').getAttribute('data-stamp-removing')).toBe('true');
    expect(panel.parentElement).toBe(body);
    expect(app.host.querySelectorAll('[data-gwe-stamp-remove-confirmation]')).toHaveLength(1);
    expect([...panel.querySelectorAll('button')].map(node=>node.textContent)).toEqual(['Remove stamp','Keep stamp']);
    expect(document.activeElement).toBe(app.host.querySelector('#'+panel.getAttribute('aria-labelledby')));
    if(route==='Escape')React.act(()=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    else activate(button(panel,route));
    settle();
    expect(confirmation(app)).toBeNull();expect(document.activeElement).toBe(remove);
    expect(app.host.querySelector('.gwe-builder-dock').getAttribute('data-stamp-removing')).toBe('false');
    expect(body.scrollTop).toBe(180);
    expect(app.host.querySelector('#gwe-stamp-name')).toBe(name);expect(name.value).toBe('A window for later');
    expect(app.host.querySelector('#gwe-stamp-corner-x')).toBe(corner);expect(corner.value).toBe('11');
    expect(rawLibrary()).toBe(raw);expect(app.engine._buildBatchPreview).toBe(preview);
    expect(snapshot(app.engine)).toBe(before);
  });

  it.each(['Keep stamp','Escape'])('names the exact recipe and preserves the current preview on %s',route=>{
    const app=mountStamps(),before=snapshot(app.engine),raw=rawLibrary();
    activate(button(app.host,'Preview stamp'));const preview=app.engine._buildBatchPreview;
    const remove=app.host.querySelector('[data-gwe-remove-stamp]'),panel=requestRemoval(app);
    expect(panel.getAttribute('role')).toBe('group');
    const heading=app.host.querySelector('#'+panel.getAttribute('aria-labelledby'));
    expect(heading.textContent).toContain('Stone step');expect(document.activeElement).toBe(heading);
    expect(rawLibrary()).toBe(raw);
    if(route==='Escape')React.act(()=>heading.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    else activate(button(panel,route));
    settle();expect(confirmation(app)).toBeNull();expect(document.activeElement).toBe(remove);
    expect(rawLibrary()).toBe(raw);expect(app.engine._buildBatchPreview).toBe(preview);expect(snapshot(app.engine)).toBe(before);
  });

  it('removes the last saved recipe only after confirmation and returns focus to the library summary',()=>{
    const app=mountStamps(),before=snapshot(app.engine);
    activate(button(app.host,'Preview stamp'));expect(app.engine._buildBatchPreview).toBeTruthy();
    const panel=requestRemoval(app);activate(button(panel,'Remove stamp'));settle();
    expect(library()).toEqual([]);expect(confirmation(app)).toBeNull();expect(app.host.querySelector('[data-gwe-remove-stamp]')).toBeNull();
    expect(document.activeElement).toBe(app.host.querySelector('.gwe-stamp-library > summary'));
    expect(app.engine._buildBatchPreview).toBeNull();expect(snapshot(app.engine)).toBe(before);
  });

  it('keeps fresh recipes from another tab and focuses a remaining selected card',()=>{
    const app=mountStamps(['Stone step','Wood tower']),before=snapshot(app.engine),current=library(),target=current[1];
    const panel=requestRemoval(app);
    const added={...structuredClone(current[0]),id:'another_tab_recipe',name:'New window'};
    externalLibrary([...current,added]);activate(button(panel,'Remove stamp'));settle();
    expect(library().map(item=>item.id)).toEqual([current[0].id,added.id]);expect(library().some(item=>item.id===target.id)).toBe(false);
    expect(selectedCard(app)).toBeTruthy();expect(document.activeElement).toBe(selectedCard(app));expect(snapshot(app.engine)).toBe(before);
  });

  it('refreshes a changed recipe and requires a fresh named confirmation before deleting it',()=>{
    const app=mountStamps(),before=snapshot(app.engine),original=library()[0],panel=requestRemoval(app);
    const updated={...structuredClone(original),name:'Updated stone step',blocks:original.blocks.map(block=>({...block,rotation:(block.rotation+1)%4}))};
    externalLibrary([updated]);const raw=rawLibrary();
    activate(button(panel,'Remove stamp'));settle();
    expect(rawLibrary()).toBe(raw);expect(confirmation(app)).toBeNull();expect(selectedCard(app).textContent).toContain(updated.name);
    expect(document.activeElement).toBe(selectedCard(app));expect(snapshot(app.engine)).toBe(before);
    const next=requestRemoval(app);expect(next.textContent).toContain(updated.name);activate(button(next,'Remove stamp'));settle();
    expect(library()).toEqual([]);expect(snapshot(app.engine)).toBe(before);
  });

  it('refreshes a recipe removed elsewhere without reporting another successful deletion or writing again',()=>{
    const app=mountStamps(),before=snapshot(app.engine),panel=requestRemoval(app);
    externalLibrary([]);const write=vi.spyOn(Storage.prototype,'setItem');
    activate(button(panel,'Remove stamp'));settle();
    expect(write.mock.calls.filter(([key])=>key===api.BUILD_STAMP_KEY)).toHaveLength(0);
    expect(confirmation(app)).toBeNull();expect(library()).toEqual([]);
    expect(document.activeElement).toBe(app.host.querySelector('.gwe-stamp-library > summary'));expect(snapshot(app.engine)).toBe(before);
  });

  it('keeps the named confirmation and recipe available when storage fails so removal can be retried',()=>{
    const app=mountStamps(),before=snapshot(app.engine),raw=rawLibrary(),panel=requestRemoval(app);
    const original=Storage.prototype.setItem;
    const write=vi.spyOn(Storage.prototype,'setItem').mockImplementation(function(key,value){if(key===api.BUILD_STAMP_KEY)throw new Error('Synthetic quota denied');return original.call(this,key,value);});
    activate(button(panel,'Remove stamp'));settle();
    expect(confirmation(app)).toBeTruthy();expect(confirmation(app).querySelector('[role="alert"]')).toBeTruthy();
    expect(rawLibrary()).toBe(raw);expect(snapshot(app.engine)).toBe(before);
    write.mockRestore();activate(button(confirmation(app),'Remove stamp'));settle();
    expect(library()).toEqual([]);expect(confirmation(app)).toBeNull();expect(snapshot(app.engine)).toBe(before);
  });

  it('does not steal modal focus when a cancellation focus return is still queued',()=>{
    const app=mountStamps(),raw=rawLibrary(),panel=requestRemoval(app);
    activate(button(panel,'Keep stamp'));
    const dialog=document.createElement('section');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;
    app.host.querySelector('#geoworld-fs-workspace').appendChild(dialog);app.engine._modalState={showGameSettings:true};dialog.focus();
    settle();expect(document.activeElement).toBe(dialog);expect(rawLibrary()).toBe(raw);expect(confirmation(app)).toBeNull();
  });

  it('does not restore a previous stamp scroll or focus after its workspace is replaced',()=>{
    const app=mountStamps(),raw=rawLibrary(),panel=requestRemoval(app);
    const body=app.host.querySelector('.gwe-builder-body');body.scrollTop=72;
    activate(button(panel,'Keep stamp'));
    const outside=document.createElement('button');app.host.appendChild(outside);outside.focus();
    window.__geoWorldEngine={_destroyed:false};body.scrollTop=23;
    settle();
    expect(document.activeElement).toBe(outside);expect(body.scrollTop).toBe(23);
    expect(rawLibrary()).toBe(raw);expect(confirmation(app)).toBeNull();
  });

  it.each(['blocks','lesson','modal'])('rejects a queued confirmation after its %s context changes',change=>{
    const app=mountStamps(),raw=rawLibrary(),before=snapshot(app.engine),panel=requestRemoval(app);
    if(change==='blocks')app.engine.blocks={...app.engine.blocks};
    if(change==='lesson')app.engine._currentLesson={...app.engine._currentLesson};
    if(change==='modal')app.engine._modalState={showGameSettings:true};
    activate(button(panel,'Remove stamp'));settle();
    expect(rawLibrary()).toBe(raw);expect(library()).toHaveLength(1);expect(snapshot(app.engine)).toBe(before);
  });

  it('can keep a stamp, visit the tool finder and request a fresh confirmation',()=>{
    const app=mountStamps(),before=snapshot(app.engine),first=requestRemoval(app);
    activate(button(first,'Keep stamp'));settle();
    expect(confirmation(app)).toBeNull();
    activate(app.host.querySelector('.gwe-tool-finder-toggle'));settle();
    const query=app.host.querySelector('#gwe-tool-query');expect(query).toBeTruthy();query.focus();
    React.act(()=>query.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));settle();
    expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();expect(confirmation(app)).toBeNull();
    expect(document.activeElement).toBe(app.host.querySelector('.gwe-tool-finder-toggle'));
    const next=requestRemoval(app);activate(button(next,'Remove stamp'));settle();
    expect(library()).toEqual([]);expect(confirmation(app)).toBeNull();expect(snapshot(app.engine)).toBe(before);
  });
});

describe('stamp-name feedback stays with the name field',()=>{
  it.each(['','  ','Stone step'])('identifies the invalid name %j without changing recipes or the creation',value=>{
    const app=mountStamps(),before=snapshot(app.engine),raw=rawLibrary(),input=app.host.querySelector('#gwe-stamp-name');
    draft(input,value);React.act(()=>app.host.querySelector('.gwe-stamp-save').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));settle();
    const error=app.host.querySelector('#gwe-stamp-name-error');expect(error).toBeTruthy();expect(error.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-invalid')).toBe('true');expect(input.getAttribute('aria-describedby')).toContain('gwe-stamp-name-error');
    expect(document.activeElement).toBe(input);expect(rawLibrary()).toBe(raw);expect(snapshot(app.engine)).toBe(before);
    draft(input,'A different step');expect(app.host.querySelector('#gwe-stamp-name-error')).toBeNull();expect(input.getAttribute('aria-invalid')).not.toBe('true');
  });

  it('reports a full library without marking a valid new name as invalid',()=>{
    const app=mountStamps(),recipe=library()[0],input=app.host.querySelector('#gwe-stamp-name'),before=snapshot(app.engine);
    externalLibrary(Array.from({length:12},(_,index)=>({...structuredClone(recipe),id:'recipe_'+index,name:'Step '+index})));
    const raw=rawLibrary();draft(input,'Thirteenth window');
    React.act(()=>app.host.querySelector('.gwe-stamp-save').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));settle();
    expect(app.host.textContent).toContain('12 stamps');expect(input.getAttribute('aria-invalid')).not.toBe('true');
    expect(app.host.querySelector('#gwe-stamp-name-error')).toBeNull();expect(rawLibrary()).toBe(raw);expect(snapshot(app.engine)).toBe(before);
  });
});
