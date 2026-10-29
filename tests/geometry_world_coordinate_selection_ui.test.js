import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let THREE,makeShape,fixture,api;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
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
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,worldState,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
});
afterEach(()=>{
  fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();delete window.__geoWorldEngine;
});

const fields=['from-x','from-y','from-z','to-x','to-y','to-z'];
function input(app,name){return app.host.querySelector('#gwe-select-'+name);}
function form(app){return app.host.querySelector('.gwe-coordinate-selection-form');}
function status(app){return app.host.querySelector('#gwe-coordinate-selection-status');}
function review(app){return app.host.querySelector('[data-gwe-coordinate-preview]');}
function apply(app){return app.host.querySelector('[data-gwe-apply-coordinate-selection]');}
function keys(engine){return (engine._builderSelection?.blocks||[]).map(p=>[p.x,p.y,p.z].join(',')).sort();}
function draft(node,value){expect(node).toBeTruthy();React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));});}
function choose(node,value){expect(node).toBeTruthy();React.act(()=>{node.value=value;node.dispatchEvent(new Event('change',{bubbles:true}));});}
function submit(app){const event=new Event('submit',{bubbles:true,cancelable:true});React.act(()=>form(app).dispatchEvent(event));expect(event.defaultPrevented).toBe(true);}
function settleFocus(){React.act(()=>vi.advanceTimersByTime(50));}
function allBounds(app){app.click(app.host.querySelector('[data-gwe-selection-bounds="all"]'));}
function openCoordinates(app){
  const outer=app.host.querySelector('.gwe-direct-controls');if(!outer.open)app.click(outer.querySelector('summary'));
  const panel=app.host.querySelector('.gwe-coordinate-selection');if(!panel.open)app.click(panel.querySelector('summary'));
  settleFocus();return panel;
}

describe('keyboard-accessible coordinate selection workbench',()=>{
  it('offers a closed, labelled form even before any creation is selected',()=>{
    const app=fixture.mount({retained:null}),panel=app.host.querySelector('.gwe-coordinate-selection');
    expect(panel).toBeTruthy();expect(panel.open).toBe(false);expect(panel.querySelector('summary').textContent).toBe('Select by coordinates');
    expect(panel.closest('.gwe-direct-controls')).toBeTruthy();expect(form(app).noValidate).toBe(true);
    expect(fields.map(name=>input(app,name).value)).toEqual(['0','1','0','0','1','0']);
    for(const name of fields){expect(input(app,name).labels.length).toBeGreaterThan(0);expect(input(app,name).step).toBe('1');}
    expect(app.host.querySelector('#gwe-select-operation').value).toBe('replace');expect(app.host.querySelector('#gwe-select-material').value).toBe('all');
    expect(apply(app)).toBeNull();
  });

  it('fills all student bounds and clears the material filter without changing the outline or world',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine),selected=keys(app.engine);
    choose(app.host.querySelector('#gwe-select-material'),'wood');allBounds(app);
    expect(fields.map(name=>input(app,name).value)).toEqual(['0','1','0','9','2','0']);
    expect(app.host.querySelector('#gwe-select-material').value).toBe('all');expect(keys(app.engine)).toEqual(selected);
    expect(apply(app)).toBeNull();expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('fills selection bounds without implicitly selecting other blocks',()=>{
    const app=fixture.mount({retained:'b'}),selected=keys(app.engine);
    const button=app.host.querySelector('[data-gwe-selection-bounds="selected"]');expect(button.textContent).toBe('Use selection bounds');app.click(button);
    expect(fields.map(name=>input(app,name).value)).toEqual(['8','1','0','9','2','0']);expect(keys(app.engine)).toEqual(selected);expect(apply(app)).toBeNull();
  });

  it('reviews hidden student cells without editing geometry, then applies the exact selection and measurement',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine),selected=keys(app.engine);
    app.engine.blocks['8,2,0'].visible=false;allBounds(app);submit(app);
    expect(keys(app.engine)).toEqual(selected);expect(review(app).textContent).toMatch(/\b5\b/);expect(apply(app)).toBeTruthy();
    app.click(apply(app));settleFocus();
    expect(keys(app.engine)).toEqual(['0,1,0','1,1,0','8,1,0','8,2,0','9,1,0']);expect(app.engine._builderSelection.exact).toBe(true);
    expect(app.state().measureResult.count).toBe(5);expect(app.state().measureResult.blocks).toEqual(app.engine._builderSelection.blocks);
    expect(apply(app)).toBeNull();expect(document.activeElement).toBe(form(app).querySelector('[type="submit"]'));
    expect(fixture.worldState(app.engine)).toEqual(before);expect(app.engine.blocks['8,2,0'].visible).toBe(false);
  });

  it('filters by material and supports exact addition and removal without deleting blocks',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine);allBounds(app);
    choose(app.host.querySelector('#gwe-select-material'),'wood');choose(app.host.querySelector('#gwe-select-operation'),'add');submit(app);app.click(apply(app));
    expect(keys(app.engine)).toHaveLength(5);expect(app.engine._builderSelection.exact).toBe(true);
    choose(app.host.querySelector('#gwe-select-operation'),'remove');submit(app);app.click(apply(app));
    expect(keys(app.engine)).toEqual(['0,1,0','1,1,0']);expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('can explicitly remove all selected cells while preserving the entire build',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine);allBounds(app);choose(app.host.querySelector('#gwe-select-operation'),'remove');submit(app);
    expect(review(app).textContent).toMatch(/\b0\b/);app.click(apply(app));expect(app.engine._builderSelection).toBeNull();expect(app.state().measureResult).toBeNull();expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('links invalid coordinates to actionable feedback and focuses the first invalid field',()=>{
    const app=fixture.mount(),selected=keys(app.engine);draft(input(app,'from-x'),'1.5');draft(input(app,'to-y'),'');submit(app);settleFocus();
    expect(apply(app)).toBeNull();expect(keys(app.engine)).toEqual(selected);expect(status(app).textContent).not.toBe('');
    expect(document.activeElement).toBe(input(app,'from-x'));
    for(const name of ['from-x','to-y']){expect(input(app,name).getAttribute('aria-invalid')).toBe('true');expect(input(app,name).getAttribute('aria-describedby').split(/\s+/)).toContain('gwe-coordinate-selection-status');}
    expect(input(app,'from-y').getAttribute('aria-invalid')).not.toBe('true');
  });

  it('keeps an existing selection when the region contains no student blocks',()=>{
    const app=fixture.mount(),selected=keys(app.engine),before=fixture.worldState(app.engine);draft(input(app,'from-x'),'40');draft(input(app,'to-x'),'40');submit(app);
    expect(apply(app)).toBeNull();expect(status(app).textContent).toMatch(/no|none|empty/i);expect(keys(app.engine)).toEqual(selected);expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it.each(['coordinate','operation','material'])('invalidates the reviewed plan after a %s draft change',kind=>{
    const app=fixture.mount();allBounds(app);submit(app);expect(apply(app)).toBeTruthy();const selected=keys(app.engine);
    if(kind==='coordinate')draft(input(app,'to-x'),'8');
    else choose(app.host.querySelector(kind==='operation'?'#gwe-select-operation':'#gwe-select-material'),kind==='operation'?'add':'wood');
    expect(apply(app)).toBeNull();expect(keys(app.engine)).toEqual(selected);
  });

  it('refuses a reviewed selection if matching geometry changes before Apply',()=>{
    const app=fixture.mount();allBounds(app);submit(app);const selected=keys(app.engine);
    app.engine.blocks['8,1,0'].userData.blockType='brick';const changed=fixture.worldState(app.engine);app.click(apply(app));
    expect(keys(app.engine)).toEqual(selected);expect(status(app).textContent).toMatch(/changed|again/i);expect(fixture.worldState(app.engine)).toEqual(changed);
  });

  it('never overwrites a different selection made after review',()=>{
    const app=fixture.mount();submit(app);app.select('b');const selected=keys(app.engine);if(apply(app))app.click(apply(app));
    expect(keys(app.engine)).toEqual(selected);
  });

  it.each(['empty','ground'])('preserves the current outline when aimed selection hits %s',target=>{
    const app=fixture.mount(),selected=keys(app.engine),before=fixture.worldState(app.engine);
    app.click(app.button('Select blocks'));
    if(target==='empty')app.engine.blockUnderCrosshair=()=>null;else app.engine.aimed='ground';
    app.click(app.button('Use aimed block for selection'));expect(keys(app.engine)).toEqual(selected);expect(fixture.worldState(app.engine)).toEqual(before);
  });
});

describe('focused coordinate selection navigation',()=>{
  it.each(['tools','escape'])('returns from %s with draft values, outline, and focus preserved',route=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine),selected=keys(app.engine),panel=openCoordinates(app);
    expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateSelecting).toBe('true');expect(panel.open).toBe(true);
    expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('false');
    draft(input(app,'to-x'),'9');choose(app.host.querySelector('#gwe-select-material'),'wood');
    if(route==='tools')app.click(app.host.querySelector('[aria-label="Return to build tools"]'));
    else {const event=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});input(app,'to-x').focus();React.act(()=>input(app,'to-x').dispatchEvent(event));expect(event.defaultPrevented).toBe(true);}
    settleFocus();expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateSelecting).toBe('false');expect(panel.open).toBe(false);
    expect(document.activeElement).toBe(panel.querySelector('summary'));expect(input(app,'to-x').value).toBe('9');expect(app.host.querySelector('#gwe-select-material').value).toBe('wood');
    openCoordinates(app);expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateSelecting).toBe('true');expect(input(app,'to-x').value).toBe('9');
    expect(keys(app.engine)).toEqual(selected);expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('opens the same focused selection path from the finder without requiring a retained selection',()=>{
    const app=fixture.mount({retained:null}),before=fixture.worldState(app.engine);app.click(app.host.querySelector('.gwe-tool-finder-toggle'));
    const choice=app.host.querySelector('[data-tool="coordinates"]');expect(choice.disabled).toBe(false);app.click(choice);React.act(()=>vi.advanceTimersByTime(100));
    expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();expect(app.host.querySelector('.gwe-direct-controls').open).toBe(true);
    const panel=app.host.querySelector('.gwe-coordinate-selection');expect(panel.open).toBe(true);expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateSelecting).toBe('true');
    expect(document.activeElement).toBe(panel.querySelector('summary'));expect(app.engine._builderSelection).toBeNull();expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('leaves focused mode without committing a reviewed selection and does not resurrect it on lesson return',()=>{
    const app=fixture.mount(),selected=keys(app.engine),before=fixture.worldState(app.engine);openCoordinates(app);allBounds(app);submit(app);expect(apply(app)).toBeTruthy();
    app.click(app.button('Back to building'));settleFocus();expect(app.state().sandboxDockCollapsed).toBe(true);expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateSelecting).toBe('false');expect(keys(app.engine)).toEqual(selected);
    app.patch({sandboxDockCollapsed:false});openCoordinates(app);app.patch({activeLesson:'volumeExplorer'});app.patch({activeLesson:'builderSandbox'});React.act(()=>vi.advanceTimersByTime(100));
    expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateSelecting).toBe('false');expect(app.host.querySelector('.gwe-coordinate-selection').open).toBe(false);
    expect(keys(app.engine)).toEqual(selected);expect(fixture.worldState(app.engine)).toEqual(before);
  });
});
