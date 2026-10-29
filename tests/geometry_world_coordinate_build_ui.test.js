import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
let THREE,makeShape,baseFixture,fixture,api,engines=[];
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
  const source=readFileSync('tests/geometry_world_placement_transaction.test.js','utf8');
  baseFixture=new Function('source','THREE','makeShape','vi',source.slice(source.indexOf('function engineFunction('),source.indexOf('\nfunction seed('))+'\nreturn fixture;')(core,THREE,makeShape,vi);
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8'),helpers=source.slice(source.indexOf('const key='),source.indexOf('function precedes('));
  // Share the real React host; replace only its render-engine fixture with the
  // production batch, placement, preview and history implementations.
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','createEngine','let mounted;'+helpers+';function fixtureEngine(){return createEngine();}return {mount,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}}};')(React,ReactDOMClient,THREE,makeShape,api,vi,createEngine);
});
afterEach(()=>{
  fixture?.cleanup();engines.forEach(engine=>{engine.clearBuildBatchPreview?.();Object.values(engine.blocks).forEach(mesh=>engine._disposeBlockMesh(mesh));});engines=[];
  document.querySelectorAll('[data-coordinate-test-focus]').forEach(node=>node.remove());window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
  for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[key];
});
function createEngine(){
  const f=baseFixture(),engine=f.engine;engine._worldActive=true;engine._modalState={};engine.releaseInput=vi.fn();engine.setViewPreset=vi.fn();engine._currentLesson=api.FREE_BUILD_LESSON;engine.velocity=new THREE.Vector3();engine.euler=new THREE.Euler();engine.camera.position.set(3,5,9);engine.yaw=0;engine.pitch=0;engine.flyMode=true;engine.blocksPlaced=0;
  const start=core.indexOf('        // Atomic student construction:'),end=core.indexOf('        // End bounded drawing previews.',start),history=core.slice(core.indexOf('        var MAX_UNDO = 200;'),core.indexOf('        engine.undo = function()'));
  const deps={engine,THREE,MAX_BLOCKS:1500,BLOCK_TYPES:[{id:'stone',color:0x998877},{id:'wood',color:0x886644}],BLOCK_SHAPES:[{id:'cube'},{id:'halfB'},{id:'halfA'},{id:'quarter'}],createShapeGeometry:makeShape,getBlockMaterial:()=>new THREE.MeshStandardMaterial({color:0x998877}),upd:(key,value)=>f.updates.push({key,value}),announceToSR:f.effects.sr,__alloT:(_key,fallback)=>fallback};
  new Function(...Object.keys(deps),history+core.slice(start,end))(...Object.values(deps));
  const measurement=cells=>{const blocks=cells.filter(p=>engine.blocks[[p.x,p.y,p.z].join(',')]);if(!blocks.length)return null;const extent=axis=>Math.max(...blocks.map(p=>p[axis]))-Math.min(...blocks.map(p=>p[axis]))+1,shapeCounts={};let totalVolume=0;blocks.forEach(p=>{const d=engine.blocks[[p.x,p.y,p.z].join(',')].userData;shapeCounts[d.shape]=(shapeCounts[d.shape]||0)+1;totalVolume+=d.volume;});return {blocks:blocks.map(p=>({...p})),count:blocks.length,isComplete:true,L:extent('x'),W:extent('z'),H:extent('y'),totalVolume,shapeCounts};};
  engine.measureStructure=(x,y,z,retained)=>measurement(retained||[{x,y,z}]);engine.blockUnderCrosshair=()=>null;window.__geoWorldEngine=engine;engines.push(engine);return {engine,groups:{a:[],b:[],ground:[]},measurement};
}
function mount(){return fixture.mount({retained:null});}
function settle(){React.act(()=>vi.advanceTimersByTime(80));}
function field(app,name){return app.host.querySelector('#gwe-build-'+name);}
function change(app,name,value){const input=field(app,name);expect(input).toBeTruthy();React.act(()=>{if(input.tagName==='SELECT'){input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}else{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}});}
function open(app){app.click(app.host.querySelector('[data-gwe-open-coordinate-build]')||app.host.querySelector('.gwe-coordinate-builder > summary'));settle();return app.host.querySelector('.gwe-coordinate-builder');}
function review(app){const button=app.host.querySelector('#gwe-coordinate-build-review');button.focus();React.act(()=>button.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));settle();}
function complete(app,text){const button=app.button(text);expect(button).toBeTruthy();button.focus();app.click(button);settle();}
function snapshot(engine){return {blocks:Object.entries(engine.blocks).map(([key,mesh])=>({key,mesh,data:structuredClone(mesh.userData)})),undo:structuredClone(engine._undoStack),redo:structuredClone(engine._redoStack),selection:structuredClone(engine._builderSelection),placed:engine.blocksPlaced};}

describe('accessible coordinate building starts in an empty world',()=>{
  it('offers a working quick action and discoverable keyboard tool without a selected build',()=>{
    const app=mount();expect(Object.keys(app.engine.blocks)).toHaveLength(0);expect(app.host.querySelector('[data-gwe-open-coordinate-build]').disabled).toBe(false);
    const details=open(app);expect(details.open).toBe(true);expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateBuilding).toBe('true');expect(document.activeElement).toBe(details.querySelector('summary'));
    expect(field(app,'origin-x').labels[0].textContent).toBe('X');expect(field(app,'origin-y').min).toBe('1');expect(field(app,'origin-y').max).toBe('128');expect(field(app,'origin-z').step).toBe('1');expect(app.host.querySelector('#gwe-coordinate-build-form').getAttribute('aria-describedby')).toBe('gwe-coordinate-build-help');
    app.click(app.host.querySelector('[aria-label="Return to build tools"]'));settle();app.click(app.host.querySelector('.gwe-tool-finder-bar button'));settle();const tool=app.host.querySelector('[data-tool="construct"]');expect(tool.disabled).toBe(false);expect(tool.textContent).toContain('Build by coordinates');app.click(tool);settle();expect(document.activeElement).toBe(app.host.querySelector('.gwe-coordinate-builder > summary'));
  });
  it('shows only applicable dimensions and keeps the wall direction valid',()=>{
    const app=mount();open(app);expect(field(app,'length')).toBeNull();change(app,'mode','line');expect(field(app,'length')).toBeTruthy();expect(field(app,'width')).toBeNull();expect(Array.from(field(app,'axis').options).map(o=>o.value)).toEqual(['x','y','z']);
    change(app,'axis','y');change(app,'mode','wall');expect(field(app,'axis').value).toBe('x');expect(Array.from(field(app,'axis').options).map(o=>o.value)).toEqual(['x','z']);expect(field(app,'height')).toBeTruthy();
    change(app,'mode','floor');expect(field(app,'axis')).toBeNull();expect(field(app,'height')).toBeNull();expect(field(app,'width').labels[0].textContent).toBe('Depth (Z), cells');expect(field(app,'length').labels[0].textContent).toBe('Width (X), cells');
  });
  it.each(['Tools','Escape'])('%s exits the focused builder and preserves a draft for the next visit',exit=>{
    const app=mount();open(app);change(app,'origin-x','-12');change(app,'shape','quarter');const before=snapshot(app.engine);
    if(exit==='Tools')app.click(app.host.querySelector('[aria-label="Return to build tools"]'));else React.act(()=>field(app,'origin-x').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
    settle();expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateBuilding).toBe('false');expect(app.host.querySelector('.gwe-coordinate-builder').open).toBe(false);expect(document.activeElement).toBe(app.host.querySelector('.gwe-coordinate-builder > summary'));open(app);expect(field(app,'origin-x').value).toBe('-12');expect(field(app,'shape').value).toBe('quarter');expect(snapshot(app.engine)).toEqual(before);
  });
});

describe('coordinate review protects drafts and world geometry',()=>{
  it.each([['origin-x',''],['origin-y','0'],['origin-z','65']])('links an invalid %s value to its error and focuses the field',(name,value)=>{
    const app=mount();open(app);change(app,name,value);const before=snapshot(app.engine);review(app);const input=field(app,name),error=app.host.querySelector('#gwe-coordinate-build-error');expect(error.getAttribute('role')).toBe('alert');expect(input.getAttribute('aria-invalid')).toBe('true');expect(input.getAttribute('aria-describedby')).toBe(error.id);expect(document.activeElement).toBe(input);expect(app.button('Apply preview')).toBeUndefined();expect(snapshot(app.engine)).toEqual(before);
    change(app,name,'1');expect(input.hasAttribute('aria-invalid')).toBe(false);expect(app.host.querySelector('#gwe-coordinate-build-error')).toBeNull();
  });
  it('focuses an occupied-cell error and preserves the existing block',()=>{
    const app=mount(),mesh=app.engine.placeBlock(0,1,0,'stone','cube',0);open(app);const before=snapshot(app.engine);review(app);const error=app.host.querySelector('#gwe-coordinate-build-error');expect(error.textContent).toMatch(/block is in the way/i);expect(document.activeElement).toBe(error);expect(snapshot(app.engine)).toEqual(before);expect(app.engine.blocks['0,1,0']).toBe(mesh);
  });
  it('edits a live recipe without applying stale geometry or moving input focus',()=>{
    const app=mount();open(app);change(app,'mode','floor');change(app,'length','2');change(app,'width','3');const before=snapshot(app.engine);review(app);expect(app.engine._buildBatchPreview).toBeTruthy();expect(app.button('Apply preview').disabled).toBe(false);expect(document.activeElement).toBe(app.host.querySelector('.gwe-edit-preview'));expect(snapshot(app.engine)).toEqual(before);
    const input=field(app,'origin-x');input.focus();change(app,'origin-x','8');settle();expect(document.activeElement).toBe(input);expect(app.engine._buildBatchPreview).toBeNull();expect(app.button('Apply preview')).toBeUndefined();expect(snapshot(app.engine)).toEqual(before);
  });
  it.each(['Apply preview','Cancel preview'])('returns from in-world %s to the preserved keyboard recipe',action=>{
    const app=mount();open(app);change(app,'origin-x','6');change(app,'mode','line');change(app,'length','2');review(app);const before=snapshot(app.engine);app.click(app.button('Review in world'));settle();expect(app.state().sandboxDockCollapsed).toBe(true);expect(document.activeElement).toBe(app.host.querySelector('.gwe-preview-review'));
    complete(app,action);expect(app.state().sandboxDockCollapsed).toBe(false);expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateBuilding).toBe('true');expect(field(app,'origin-x').value).toBe('6');expect(field(app,'mode').value).toBe('line');expect(document.activeElement).toBe(app.host.querySelector('#gwe-coordinate-build-review'));expect(app.button('Apply preview')).toBeUndefined();
    if(action==='Cancel preview')expect(snapshot(app.engine)).toEqual(before);else expect(app.engine._builderSelection).toEqual({blocks:[{x:6,y:1,z:0},{x:7,y:1,z:0}],exact:true});
  });
  it('returns from world review with the proposal still ready and coordinate controls open',()=>{
    const app=mount();open(app);change(app,'origin-x','5');review(app);const before=snapshot(app.engine);app.click(app.button('Review in world'));settle();app.click(app.button('Back to tools'));settle();expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateBuilding).toBe('true');expect(field(app,'origin-x').value).toBe('5');expect(document.activeElement).toBe(app.host.querySelector('.gwe-edit-preview'));expect(app.button('Apply preview').disabled).toBe(false);expect(snapshot(app.engine)).toEqual(before);
  });
  it.each(['modal','transition'])('does not move queued review focus over a newer %s',change=>{
    const app=mount();open(app);const button=app.host.querySelector('#gwe-coordinate-build-review');button.focus();React.act(()=>button.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    if(change==='modal')app.patch({showGameSettings:true});else app.engine._pendingWorldTransition={};const target=document.createElement('button');target.dataset.coordinateTestFocus='true';document.body.appendChild(target);target.focus();settle();expect(document.activeElement).toBe(target);
    if(change==='transition'){const before=snapshot(app.engine);app.click(app.button('Apply preview'));expect(snapshot(app.engine)).toEqual(before);expect(app.host.querySelector('.gwe-edit-notice').textContent).toContain('Preview this change again before applying it.');}
  });
  it.each(['Apply preview','Cancel preview','Back to tools'])('keeps print preparation active after %s on an earlier coordinate proposal',action=>{
    const app=mount(),engine=app.engine;engine.placeBlock(-8,1,0,'stone','cube',0);engine._builderSelection={blocks:[{x:-8,y:1,z:0}],exact:true};app.patch({historyRevision:1});React.act(()=>vi.advanceTimersByTime(900));open(app);review(app);
    app.click(app.host.querySelector('[aria-label="Return to build tools"]'));settle();app.click(app.host.querySelector('[data-gwe-prepare="print"]'));settle();expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('true');
    if(action==='Back to tools'){app.click(app.button('Review in world'));settle();}complete(app,action);const dock=app.host.querySelector('.gwe-builder-dock');expect(dock.dataset.printPreparing).toBe('true');expect(dock.dataset.coordinateBuilding).toBe('false');expect(app.host.querySelector('.gwe-coordinate-builder').open).toBe(false);
    expect(document.activeElement).toBe(app.host.querySelector(action==='Back to tools'?'.gwe-edit-preview':'#gwe-print-connections'));expect(!!app.button('Apply preview')).toBe(action==='Back to tools');
  });
});

describe('keyboard construction leads directly to the exact printable selection',()=>{
  it('applies a fractional wall as one action, preserves the origin, and prepares only the new blocks',()=>{
    const app=mount(),engine=app.engine,existing=engine.placeBlock(-8,1,0,'stone','cube',0);engine._undoStack=[];engine._builderSelection={blocks:[{x:-8,y:1,z:0}],exact:true};app.patch({historyRevision:1});open(app);
    change(app,'mode','wall');change(app,'axis','z');change(app,'origin-x','3');change(app,'origin-y','2');change(app,'origin-z','-4');change(app,'length','2');change(app,'height','2');change(app,'type','wood');change(app,'shape','halfA');change(app,'rotation','3');const origin=field(app,'origin-x'),before=snapshot(engine);review(app);expect(snapshot(engine)).toEqual(before);complete(app,'Apply preview');
    expect(engine._undoStack).toHaveLength(1);expect(engine._undoStack[0].action).toBe('batch');expect(engine.blocks['-8,1,0']).toBe(existing);expect(engine._builderSelection).toEqual({blocks:[{x:3,y:2,z:-4},{x:3,y:2,z:-3},{x:3,y:3,z:-4},{x:3,y:3,z:-3}],exact:true});expect(field(app,'origin-x')).toBe(origin);expect(origin.value).toBe('3');expect(document.activeElement).toBe(app.host.querySelector('#gwe-coordinate-build-review'));
    const selected=engine._builderSelection.blocks,bytes=new Uint8Array(api.buildGeometryWorldStl(engine,selected).buffer);expect(selected.every(p=>{const data=engine.blocks[[p.x,p.y,p.z].join(',')].userData;return data.blockType==='wood'&&data.shape==='halfA'&&data.rotation===3;})).toBe(true);
    app.click(app.host.querySelector('.gwe-coordinate-print-next'));settle();expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('true');expect(app.host.querySelector('.gwe-builder-dock').dataset.coordinateBuilding).toBe('false');expect(document.activeElement).toBe(app.host.querySelector('#gwe-print-title'));
    app.click(app.host.querySelector('[data-gwe-send="print"]'));const handoff=window.__alloPrintLabPendingHandoff;expect(app.navigate).toHaveBeenCalledWith('printLab');expect(handoff.bytes).toEqual(bytes);expect(handoff.sourceModel.blocks).toHaveLength(4);expect(handoff.sourceModel.blocks.every(block=>block.type==='wood'&&block.shape==='halfA'&&block.rotation===3)).toBe(true);expect(engine.blocks['-8,1,0']).toBe(existing);
  });
});

describe('coordinate continuation keeps a multipart build together',()=>{
  it('keeps the first placement simple while explaining its selection and unavailable history actions',()=>{
    const app=mount();open(app);expect(field(app,'selectionMode')).toBeNull();expect(app.host.querySelector('[data-gwe-position-next]')).toBeNull();expect(app.host.querySelector('#gwe-build-selection-help').textContent).toContain('Only this placement will be selected for printing');expect(app.host.querySelector('[data-gwe-build-selection-summary]').textContent).toContain('No blocks selected yet');
    const before=snapshot(app.engine);for(const action of ['undo','redo']){const button=app.host.querySelector('[data-gwe-coordinate-history='+action+']');expect(button.disabled).toBe(false);expect(button.getAttribute('aria-disabled')).toBe('true');button.focus();app.click(button);expect(document.activeElement).toBe(button);expect(snapshot(app.engine)).toEqual(before);}
  });
  it('keeps additive selection controls available to recover after undoing the last selected part',()=>{
    const app=mount();open(app);review(app);complete(app,'Apply preview');expect(field(app,'selectionMode').value).toBe('new');expect(field(app,'selectionMode').getAttribute('aria-describedby')).toBe('gwe-build-selection-help');change(app,'selectionMode','add');app.click(app.host.querySelector('[data-gwe-coordinate-history=undo]'));settle();expect(field(app,'selectionMode').value).toBe('add');const before=snapshot(app.engine);review(app);const select=field(app,'selectionMode'),error=app.host.querySelector('#gwe-coordinate-build-error');expect(select.getAttribute('aria-invalid')).toBe('true');expect(select.getAttribute('aria-describedby')).toBe(error.id);expect(document.activeElement).toBe(select);expect(snapshot(app.engine)).toEqual(before);
    change(app,'selectionMode','new');expect(field(app,'selectionMode')).toBeNull();expect(app.host.querySelector('#gwe-coordinate-build-error')).toBeNull();review(app);expect(app.button('Apply preview').disabled).toBe(false);
  });
  it('fills a neighboring starting cell without previewing and clears a superseded proposal',()=>{
    const app=mount();open(app);change(app,'mode','line');change(app,'length','2');review(app);complete(app,'Apply preview');change(app,'mode','floor');change(app,'length','3');change(app,'width','2');change(app,'origin-x','10');review(app);expect(app.engine._buildBatchPreview).toBeTruthy();const before=snapshot(app.engine);
    change(app,'attach-face','x-');app.click(app.host.querySelector('[data-gwe-position-next]'));settle();expect(['x','y','z'].map(axis=>field(app,'origin-'+axis).value)).toEqual(['-3','1','0']);expect(app.engine._buildBatchPreview).toBeNull();expect(app.button('Apply preview')).toBeUndefined();expect(snapshot(app.engine)).toEqual(before);expect(document.activeElement).toBe(field(app,'origin-x'));expect(app.host.querySelector('[data-gwe-position-status]').getAttribute('role')).toBe('status');expect(app.host.querySelector('[data-gwe-position-status]').textContent).toContain('Preview placement');
  });
  it('keeps the entered origin when a neighboring position would fall below the buildable world',()=>{
    const app=mount();open(app);review(app);complete(app,'Apply preview');change(app,'origin-x','12');change(app,'origin-y','4');change(app,'origin-z','-7');change(app,'attach-face','y-');const before=snapshot(app.engine);app.click(app.host.querySelector('[data-gwe-position-next]'));settle();
    expect(['x','y','z'].map(axis=>field(app,'origin-'+axis).value)).toEqual(['12','4','-7']);const select=field(app,'attach-face');expect(select.getAttribute('aria-invalid')).toBe('true');expect(select.getAttribute('aria-describedby')).toBe('gwe-coordinate-build-error');expect(document.activeElement).toBe(select);expect(app.host.querySelector('[data-gwe-position-status]')).toBeNull();expect(app.button('Apply preview')).toBeUndefined();expect(snapshot(app.engine)).toEqual(before);
  });
  it('adds a second material to the printable selection and retains coordinates across grouped history',()=>{
    const app=mount(),engine=app.engine;open(app);change(app,'mode','line');change(app,'length','2');review(app);complete(app,'Apply preview');expect(app.host.querySelector('[data-gwe-build-selection-summary]').textContent).toContain('2 blocks');
    change(app,'mode','floor');change(app,'length','2');change(app,'width','2');change(app,'type','wood');change(app,'shape','quarter');change(app,'rotation','1');change(app,'selectionMode','add');change(app,'attach-face','x+');app.click(app.host.querySelector('[data-gwe-position-next]'));settle();expect(['x','y','z'].map(axis=>field(app,'origin-'+axis).value)).toEqual(['2','1','0']);review(app);expect(app.host.querySelector('.gwe-edit-notice').textContent).toContain('6 blocks will be selected');complete(app,'Apply preview');
    const expected=[{x:0,y:1,z:0},{x:1,y:1,z:0},{x:2,y:1,z:0},{x:2,y:1,z:1},{x:3,y:1,z:0},{x:3,y:1,z:1}];expect(engine._builderSelection).toEqual({blocks:expected,exact:true});expect(app.host.querySelector('[data-gwe-build-selection-summary]').textContent).toContain('6 blocks');expect(engine._undoStack).toHaveLength(2);
    const undo=app.host.querySelector('[data-gwe-coordinate-history=undo]');undo.focus();app.click(undo);settle();expect(document.activeElement).toBe(undo);expect(engine._builderSelection).toEqual({blocks:expected.slice(0,2),exact:true});expect(Object.keys(engine.blocks)).toHaveLength(2);expect(field(app,'origin-x').value).toBe('2');expect(field(app,'selectionMode').value).toBe('add');
    const redo=app.host.querySelector('[data-gwe-coordinate-history=redo]');redo.focus();app.click(redo);settle();expect(document.activeElement).toBe(redo);expect(redo.getAttribute('aria-disabled')).toBe('true');expect(engine._builderSelection).toEqual({blocks:expected,exact:true});expect(app.host.querySelector('[data-gwe-build-selection-summary]').textContent).toContain('6 blocks');
    const bytes=new Uint8Array(api.buildGeometryWorldStl(engine,expected).buffer);app.click(app.host.querySelector('.gwe-coordinate-print-next'));settle();app.click(app.host.querySelector('[data-gwe-send=print]'));const handoff=window.__alloPrintLabPendingHandoff;expect(handoff.bytes).toEqual(bytes);expect(handoff.sourceModel.blocks).toHaveLength(6);expect(handoff.sourceModel.blocks.filter(block=>block.type==='stone'&&block.shape==='cube')).toHaveLength(2);expect(handoff.sourceModel.blocks.filter(block=>block.type==='wood'&&block.shape==='quarter'&&block.rotation===1)).toHaveLength(4);
  });
  it('keeps focus on the final Undo, cancels its pending preview, and offers Redo without losing the draft',()=>{
    const app=mount(),engine=app.engine;open(app);review(app);complete(app,'Apply preview');change(app,'origin-x','8');review(app);expect(engine._buildBatchPreview).toBeTruthy();const undo=app.host.querySelector('[data-gwe-coordinate-history=undo]');undo.focus();app.click(undo);settle();
    expect(document.activeElement).toBe(undo);expect(undo.getAttribute('aria-disabled')).toBe('true');expect(app.host.querySelector('[data-gwe-coordinate-history=redo]').hasAttribute('aria-disabled')).toBe(false);expect(Object.keys(engine.blocks)).toHaveLength(0);expect(engine._builderSelection).toBeNull();expect(engine._buildBatchPreview).toBeNull();expect(app.button('Apply preview')).toBeUndefined();expect(field(app,'origin-x').value).toBe('8');
    const redo=app.host.querySelector('[data-gwe-coordinate-history=redo]');redo.focus();app.click(redo);settle();expect(document.activeElement).toBe(redo);expect(redo.getAttribute('aria-disabled')).toBe('true');expect(engine._builderSelection).toEqual({blocks:[{x:0,y:1,z:0}],exact:true});expect(field(app,'origin-x').value).toBe('8');
  });
  it.each(['modal','transition'])('does not perform coordinate history while a %s owns the world',guard=>{
    const app=mount();open(app);review(app);complete(app,'Apply preview');if(guard==='modal')app.patch({showGameSettings:true});else app.engine._pendingWorldTransition={};const before=snapshot(app.engine);app.click(app.host.querySelector('[data-gwe-coordinate-history=undo]'));settle();expect(snapshot(app.engine)).toEqual(before);
  });
  it.each(['undo','redo'])('explains a rejected %s without losing focus, geometry, or its history entry',action=>{
    const app=mount(),engine=app.engine;open(app);review(app);complete(app,'Apply preview');
    if(action==='undo')engine.blocks['0,1,0'].userData.blockType='wood';
    else{app.click(app.host.querySelector('[data-gwe-coordinate-history=undo]'));engine._replayingHistory=true;engine.placeBlock(0,1,0,'wood','cube',0);engine._replayingHistory=false;}
    change(app,'origin-x','8');review(app);expect(engine._buildBatchPreview).toBeTruthy();const before=snapshot(engine),button=app.host.querySelector('[data-gwe-coordinate-history='+action+']');button.focus();app.click(button);settle();
    expect(snapshot(engine)).toEqual(before);expect(document.activeElement).toBe(button);expect(button.hasAttribute('aria-disabled')).toBe(false);expect(engine._buildBatchPreview).toBeNull();expect(app.button('Apply preview')).toBeUndefined();expect(field(app,'origin-x').value).toBe('8');
    const notice=app.host.querySelector('.gwe-edit-notice');expect(notice.getAttribute('role')).toBe('status');expect(notice.textContent).toContain('That action could not be '+(action==='undo'?'undone':'redone'));expect(notice.textContent).toContain('Your build is unchanged');
  });
});
