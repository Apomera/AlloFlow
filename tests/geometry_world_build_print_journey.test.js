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
  fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();
  for(const name of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[name];
});
const query=(app,selector)=>app.host.querySelector(selector);
const dock=app=>query(app,'.gwe-builder-dock');
const chooser=app=>query(app,'.gwe-selection-chooser');
function settle(){React.act(()=>vi.advanceTimersByTime(80));}
function click(app,selector){const button=query(app,selector);expect(button).toBeTruthy();app.click(button);}
function selectedKeys(app){return (app.engine._builderSelection?.blocks||[]).map(p=>[p.x,p.y,p.z].join(',')).sort();}
function captureDownloads(){const records=[];vi.stubGlobal('URL',{createObjectURL(blob){records.push(blob);return 'blob:journey';},revokeObjectURL:vi.fn()});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});return records;}

describe('Geometry World build-to-print journey',()=>{
  it('offers explicit selection choices before print without auto-aiming or exporting',()=>{
    const app=fixture.mount({retained:null}),before=fixture.worldState(app.engine),aim=vi.spyOn(app.engine,'blockUnderCrosshair');
    click(app,'[data-gwe-prepare="print"]');settle();
    expect(chooser(app)).toBeTruthy();expect(dock(app).dataset.selectionChoosing).toBe('true');expect(dock(app).dataset.printPreparing).toBe('false');
    expect(query(app,'#gwe-selection-choice-title').textContent).toBe('Choose what to print');expect(document.activeElement).toBe(query(app,'#gwe-selection-choice-title'));
    expect(aim).not.toHaveBeenCalled();expect(app.engine._builderSelection).toBeNull();expect(app.navigate).not.toHaveBeenCalled();expect(window.__alloPrintLabPendingHandoff).toBeUndefined();expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('selects all student blocks exactly, including hidden and separate pieces, and proceeds to print',()=>{
    const app=fixture.mount({retained:null});app.engine.blocks['8,2,0'].visible=false;const before=fixture.worldState(app.engine);
    click(app,'[data-gwe-prepare="print"]');expect(query(app,'[data-gwe-select-all]').textContent).toContain('5 blocks');click(app,'[data-gwe-select-all]');settle();
    expect(selectedKeys(app)).toEqual(['0,1,0','1,1,0','8,1,0','8,2,0','9,1,0']);expect(app.engine._builderSelection.exact).toBe(true);expect(app.engine.blocks['8,2,0'].visible).toBe(false);
    expect(chooser(app)).toBeNull();expect(dock(app).dataset.printPreparing).toBe('true');expect(document.activeElement).toBe(query(app,'#gwe-print-title'));expect(query(app,'.gwe-print-intro').textContent).toContain('5 selected blocks');
    expect(app.navigate).not.toHaveBeenCalled();expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('reviews a coordinate region before applying it and carrying print intent forward',()=>{
    const app=fixture.mount({retained:null}),before=fixture.worldState(app.engine);click(app,'[data-gwe-prepare="print"]');click(app,'[data-gwe-select-region]');settle();
    expect(dock(app).dataset.coordinateSelecting).toBe('true');expect(chooser(app)).toBeNull();expect(app.engine._builderSelection).toBeNull();
    const form=query(app,'.gwe-coordinate-selection-form');React.act(()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(query(app,'[data-gwe-coordinate-preview]')).toBeTruthy();expect(query(app,'[data-gwe-apply-coordinate-selection]').textContent).toBe('Use selection & prepare print');expect(app.engine._builderSelection).toBeNull();expect(app.navigate).not.toHaveBeenCalled();
    click(app,'[data-gwe-apply-coordinate-selection]');settle();expect(selectedKeys(app)).toHaveLength(5);expect(dock(app).dataset.coordinateSelecting).toBe('false');expect(dock(app).dataset.printPreparing).toBe('true');expect(document.activeElement).toBe(query(app,'#gwe-print-title'));expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('keeps a previous selection and an actionable inline error when aiming misses',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine),selection=selectedKeys(app);app.engine.blockUnderCrosshair=()=>null;
    click(app,'[data-gwe-choose-selection]');click(app,'[data-gwe-select-aimed]');settle();
    expect(selectedKeys(app)).toEqual(selection);expect(chooser(app).querySelector('[role=alert]').textContent).toMatch(/No build found.*all your blocks.*coordinate region/);expect(query(app,'[data-gwe-select-region]').disabled).toBe(false);expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('uses the aimed connected build only after the student explicitly chooses that route',()=>{
    const app=fixture.mount({retained:null}),before=fixture.worldState(app.engine);app.engine.aimed='b';click(app,'[data-gwe-prepare="print"]');click(app,'[data-gwe-select-aimed]');settle();
    expect(app.engine._builderSelection.blocks).toEqual(app.groups.b);expect(dock(app).dataset.printPreparing).toBe('true');expect(document.activeElement).toBe(query(app,'#gwe-print-title'));expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it.each(['tools','escape'])('returns from the chooser with %s without changing the selection',route=>{
    const app=fixture.mount(),selection=selectedKeys(app),before=fixture.worldState(app.engine);click(app,'[data-gwe-choose-selection]');settle();
    if(route==='tools')click(app,'[aria-label="Return to build tools"]');else React.act(()=>query(app,'#gwe-selection-choice-title').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true})));
    settle();expect(chooser(app)).toBeNull();expect(dock(app).dataset.selectionChoosing).toBe('false');expect(document.activeElement).toBe(query(app,'[data-gwe-choose-selection]'));expect(selectedKeys(app)).toEqual(selection);expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('returns from an empty chooser to Start building after the last student blocks disappear',()=>{
    const app=fixture.mount();click(app,'[data-gwe-choose-selection]');settle();
    for(const [key,mesh] of Object.entries(app.engine.blocks))if(mesh.userData._measurementLayer==='student'){app.engine.scene.remove(mesh);delete app.engine.blocks[key];}
    app.engine._builderSelection=null;app.engine.blocksPlaced=0;app.patch({historyRevision:1});React.act(()=>vi.advanceTimersByTime(300));
    expect(query(app,'[data-gwe-select-all]').disabled).toBe(true);expect(chooser(app).textContent).toContain('first block');
    click(app,'[aria-label="Return to build tools"]');settle();
    const start=query(app,'.gwe-builder-quick-actions button:not(:disabled)');expect(start.textContent).toBe('Start building');expect(document.activeElement).toBe(start);expect(chooser(app)).toBeNull();expect(app.engine._builderSelection).toBeNull();expect(app.navigate).not.toHaveBeenCalled();
  });

  it('can keep the reviewed current selection when changing included print blocks',()=>{
    const app=fixture.mount(),selection=selectedKeys(app);click(app,'[data-gwe-prepare="print"]');click(app,'.gwe-print-change-selection');settle();expect(chooser(app)).toBeTruthy();
    click(app,'[data-gwe-keep-selection]');settle();expect(selectedKeys(app)).toEqual(selection);expect(dock(app).dataset.printPreparing).toBe('true');expect(document.activeElement).toBe(query(app,'#gwe-print-title'));
  });

  it('offers a recovery route when the prepared selection disappears',()=>{
    const app=fixture.mount(),before=fixture.worldState(app.engine);click(app,'[data-gwe-prepare="print"]');settle();
    app.engine._builderSelection=null;app.patch({historyRevision:1});
    expect(dock(app).dataset.printPreparing).toBe('true');expect(query(app,'#gwe-print-selection-lost').textContent).toBe('Choose a selection to continue');
    expect(query(app,'[data-gwe-send="print"]')).toBeNull();expect(query(app,'[data-gwe-download="stl"]')).toBeNull();
    app.click(app.button('Choose print blocks'));settle();expect(chooser(app)).toBeTruthy();expect(document.activeElement).toBe(query(app,'#gwe-selection-choice-title'));
    click(app,'[data-gwe-select-all]');settle();expect(query(app,'#gwe-print-selection-lost')).toBeNull();expect(query(app,'#gwe-print-preparation')).toBeTruthy();expect(selectedKeys(app)).toHaveLength(5);expect(app.navigate).not.toHaveBeenCalled();expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it.each([['1. Size','gwe-print-size'],['2. Connections','gwe-print-connections'],['3. Export','gwe-print-export']])('moves keyboard focus to the named %s preparation step', (label,id)=>{
    const app=fixture.mount();click(app,'[data-gwe-prepare="print"]');app.click([...query(app,'.gwe-print-jumps').querySelectorAll('button')].find(node=>node.textContent===label));settle();
    expect(document.activeElement).toBe(query(app,'#'+id));expect(document.activeElement.tabIndex).toBe(-1);expect(app.navigate).not.toHaveBeenCalled();
  });

  it.each(['stl','lab'])('requires a pending geometry preview to be resolved before %s export',route=>{
    const app=fixture.mount(),downloads=captureDownloads(),before=fixture.worldState(app.engine);app.engine.previewBuildBatch=vi.fn((additions,removals)=>({ok:true,additions,removals}));
    app.click(app.button('Preview connecting base'));settle();expect(query(app,'.gwe-edit-preview').dataset.ready).toBe('true');
    click(app,route==='stl'?'[data-gwe-download="stl"]':'[data-gwe-send="print"]');settle();
    expect(downloads).toHaveLength(0);expect(app.navigate).not.toHaveBeenCalled();expect(query(app,'.gwe-edit-preview').textContent).toMatch(/Apply or cancel your build preview before exporting/);expect(document.activeElement).toBe(query(app,'.gwe-edit-preview'));expect(fixture.worldState(app.engine)).toEqual(before);
    app.click(app.button('Cancel preview'));click(app,route==='stl'?'[data-gwe-download="stl"]':'[data-gwe-send="print"]');
    if(route==='stl')expect(downloads).toHaveLength(1);else expect(app.navigate).toHaveBeenCalledWith('printLab');
  });

  it.each(['stl','lab'])('rechecks live selection before a stale %s export action can choose an aimed build',route=>{
    const app=fixture.mount(),downloads=captureDownloads(),before=fixture.worldState(app.engine);app.engine.aimed='b';
    const staleAction=query(app,route==='stl'?'[data-gwe-download="stl"]':'[data-gwe-send="print"]');expect(staleAction).toBeTruthy();
    // The engine changed before React's next poll; the old export button is still mounted.
    app.engine._builderSelection=null;const aim=vi.spyOn(app.engine,'blockUnderCrosshair');app.click(staleAction);settle();
    expect(downloads).toHaveLength(0);expect(app.navigate).not.toHaveBeenCalled();expect(window.__alloPrintLabPendingHandoff).toBeUndefined();expect(aim).not.toHaveBeenCalled();
    expect(app.engine._builderSelection).toBeNull();expect(chooser(app)).toBeTruthy();expect(query(app,'#gwe-selection-choice-title').textContent).toBe('Choose what to print');expect(document.activeElement).toBe(query(app,'#gwe-selection-choice-title'));expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('does not let queued preparation focus steal focus from a newly opened modal',()=>{
    const app=fixture.mount();click(app,'[data-gwe-prepare="print"]');const modal=document.createElement('div');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.tabIndex=-1;app.host.querySelector('main').appendChild(modal);modal.focus();settle();expect(document.activeElement).toBe(modal);modal.remove();
  });
});
