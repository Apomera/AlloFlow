import {afterEach,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let THREE,makeShape,api,fixture;

beforeAll(()=>{
  const exports={};
  new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});
  THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
  makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();
  const lab=resetStemLab();
  lab.registerTool('geometryWorld',{aliases:[],render(ctx){
    return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));
  }});
  if(!document.getElementById('allo-geometryworld-builder-css')){
    const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);
  }
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  api=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8');
  const helpers=source.slice(source.indexOf('const key='),source.indexOf('function precedes('));
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,worldState,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
});
afterEach(()=>{
  fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();
  for(const key of ['__geoWorldEngine','__alloPrintLabPendingHandoff','__alloGeometryWorldReturnProject','__alloGeometryWorldPendingBuild'])delete window[key];
});

function settle(){React.act(()=>vi.advanceTimersByTime(80));}
function activate(node){expect(node).toBeTruthy();node.focus();React.act(()=>node.click());}
function choose(select,value){React.act(()=>{select.focus();select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});}
function openMove(app){activate(app.host.querySelector('[data-gwe-edit-selection]'));settle();return app.host.querySelector('.gwe-creation-editor');}
function direction(app,name){return app.host.querySelector('[data-gwe-move-direction="'+name+'"]');}
function offsets(app){return ['x','y','z'].map(axis=>app.host.querySelector('#gwe-creation-offset-'+axis).value);}
function bridge(app){
  const engine=app.engine;
  engine.previewBuildBatch=vi.fn((additions,removals)=>({ok:true,additions,removals}));
  engine.commitBuildBatch=vi.fn(()=>({ok:true}));
  engine.cancelDrawing=vi.fn();engine.setDrawMode=vi.fn();engine.setViewPreset=vi.fn();
  engine.showBuildBatchPreview=vi.fn((plan,owner)=>{engine._buildBatchPreview={owner,plan};});
  engine.clearBuildBatchPreview=vi.fn(owner=>{if(engine._buildBatchPreview?.owner===owner)engine._buildBatchPreview=null;});
  return engine;
}

describe('accessible directional move previews',()=>{
  it.each([
    ['left',[-1,0,0]],['right',[1,0,0]],['down',[0,-1,0]],
    ['up',[0,1,0]],['negative-z',[0,0,-1]],['positive-z',[0,0,1]]
  ])('previews the %s direction with the displayed step and leaves Apply explicit',(name,offset)=>{
    const app=fixture.mount(),engine=bridge(app);openMove(app);
    const before=fixture.worldState(engine),selection=structuredClone(engine._builderSelection);
    const button=direction(app,name);expect(button.type).toBe('button');
    expect(app.host.querySelector('#gwe-move-step').labels.length).toBeGreaterThan(0);
    activate(button);
    expect(offsets(app)).toEqual(offset.map(String));
    expect(engine.previewBuildBatch).toHaveBeenCalledOnce();
    const [additions,removals]=engine.previewBuildBatch.mock.calls[0];
    expect(additions.map(block=>[block.x,block.y,block.z])).toEqual(selection.blocks.map(block=>[block.x+offset[0],block.y+offset[1],block.z+offset[2]]));
    expect(removals).toHaveLength(selection.blocks.length);
    expect(app.host.querySelector('[data-gwe-preview-summary]').textContent).toContain('After Apply');
    expect(app.button('Apply preview').disabled).toBe(false);
    expect(document.activeElement).toBe(button);
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();
    expect(engine._builderSelection).toEqual(selection);expect(fixture.worldState(engine)).toEqual(before);
  });

  it('uses five cells and replaces the previous proposed offset instead of accumulating it',()=>{
    const app=fixture.mount(),engine=bridge(app);openMove(app);
    const before=fixture.worldState(engine),step=app.host.querySelector('#gwe-move-step');
    choose(step,'5');activate(direction(app,'right'));expect(offsets(app)).toEqual(['5','0','0']);
    expect(app.host.querySelector('[data-gwe-preview-summary]').textContent).toContain('5 grid cells right');
    activate(direction(app,'right'));expect(offsets(app)).toEqual(['5','0','0']);
    activate(direction(app,'up'));expect(offsets(app)).toEqual(['0','5','0']);
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(fixture.worldState(engine)).toEqual(before);
    activate(app.button('Apply preview'));
    expect(engine.commitBuildBatch).toHaveBeenCalledOnce();
    expect(engine.commitBuildBatch.mock.calls[0][0].map(block=>block.y)).toEqual([6,6]);
  });

  it('clears an old proposal when the step changes and keeps the selector focused',()=>{
    const app=fixture.mount(),engine=bridge(app);openMove(app);activate(direction(app,'right'));
    expect(app.button('Apply preview')).toBeTruthy();
    const step=app.host.querySelector('#gwe-move-step');choose(step,'5');
    expect(app.button('Apply preview')).toBeUndefined();expect(engine._buildBatchPreview).toBeNull();
    expect(document.activeElement).toBe(step);expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });

  it('explains a blocked grid move without committing or marking valid offsets as malformed',()=>{
    const app=fixture.mount(),engine=bridge(app);openMove(app);
    engine.previewBuildBatch.mockImplementation(()=>({ok:false,reason:'That move intersects the protected ground.'}));
    const before=fixture.worldState(engine);activate(direction(app,'down'));settle();
    expect(offsets(app)).toEqual(['0','-1','0']);
    expect(app.host.querySelector('.gwe-edit-preview').textContent).toContain('protected ground');
    expect(document.activeElement).toBe(app.host.querySelector('.gwe-edit-preview'));
    expect(app.host.querySelectorAll('.gwe-creation-editor [aria-invalid=true]')).toHaveLength(0);
    expect(app.button('Apply preview').disabled).toBe(true);expect(engine.commitBuildBatch).not.toHaveBeenCalled();
    expect(fixture.worldState(engine)).toEqual(before);
  });

  it('restores the originating direction control after world review cancellation',()=>{
    const app=fixture.mount(),engine=bridge(app);openMove(app);activate(direction(app,'right'));
    const before=fixture.worldState(engine);
    activate(app.button('Review in world'));settle();
    expect(app.state().sandboxDockCollapsed).toBe(true);
    activate(app.button('Cancel preview'));
    settle();
    expect(document.activeElement).toBe(direction(app,'right'));
    expect(app.button('Apply preview')).toBeUndefined();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
    expect(fixture.worldState(engine)).toEqual(before);
  });

  it('offers directions only for a retained selection in Move mode',()=>{
    const app=fixture.mount();bridge(app);openMove(app);
    expect(app.host.querySelectorAll('[data-gwe-move-direction]')).toHaveLength(6);
    choose(app.host.querySelector('#gwe-creation-edit-action'),'duplicate');
    expect(app.host.querySelectorAll('[data-gwe-move-direction]')).toHaveLength(0);
    app.select(null);expect(app.host.querySelector('.gwe-creation-editor')).toBeNull();
  });
});

function prepareCanvas(app){
  const canvas=document.createElement('canvas');
  app.host.querySelector('#geoworld-fs-wrap').appendChild(canvas);
  canvas.getBoundingClientRect=()=>({left:0,top:0,right:800,bottom:600,width:800,height:600});
  app.engine.renderer={domElement:canvas};app.engine.releaseInput=vi.fn();
  app.engine.camera.position.set(.5,2.5,8);app.engine.camera.lookAt(.5,1.5,.5);app.engine.camera.updateMatrixWorld(true);
  app.engine.getRaycastTargets=()=>Object.values(app.engine.blocks);
  return canvas;
}
function selectAt(canvas,x,y){
  React.act(()=>{
    for(const type of ['pointerdown','pointerup']){
      const event=new MouseEvent(type,{clientX:x,clientY:y,button:0,bubbles:true,cancelable:true});
      Object.defineProperty(event,'pointerId',{value:1});canvas.dispatchEvent(event);
    }
  });
}
function selectBlock(app,canvas,cell){
  const mesh=app.engine.blocks[cell];mesh.geometry.computeBoundingBox();
  const point=mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrixWorld).project(app.engine.camera);
  selectAt(canvas,(point.x+1)*400,(1-point.y)*300);
}
function status(app){return app.host.querySelector('[data-gwe-canvas-selection-status]');}

describe('canvas selection feedback remains available outside Studio',()=>{
  it('reports the actual selected count after a canvas click and keeps geometry and history untouched',()=>{
    const app=fixture.mount(),canvas=prepareCanvas(app),before=fixture.worldState(app.engine);
    activate(app.button('Select blocks'));activate(app.button('Open canvas controls'));settle();
    expect(app.state().sandboxDockCollapsed).toBe(true);
    expect(status(app).getAttribute('role')).toBe('status');expect(status(app).getAttribute('aria-live')).toBe('polite');
    selectBlock(app,canvas,'0,1,0');
    expect(app.engine._builderSelection).toEqual({blocks:[{x:0,y:1,z:0}],exact:true});
    expect(status(app).textContent).toContain('1 block selected.');
    expect(fixture.worldState(app.engine)).toEqual(before);
    selectAt(canvas,-500,-500);
    expect(app.engine._builderSelection).toBeNull();expect(status(app).textContent).toContain('0 blocks selected.');
    expect(fixture.worldState(app.engine)).toEqual(before);
  });

  it('shows current counts without a duplicate live region while Studio is expanded',()=>{
    const app=fixture.mount();prepareCanvas(app);activate(app.button('Select blocks'));
    expect(status(app).textContent).toContain('2 blocks selected.');
    expect(status(app).getAttribute('aria-live')).not.toBe('polite');
    expect(status(app).getAttribute('role')).not.toBe('status');
    app.select('b');expect(status(app).textContent).toContain('3 blocks selected.');
    expect(app.engine._undoStack).toHaveLength(1);
  });

  it.each(['selection','action','depth','lesson','engine'])('drops an aimed-selection error after the %s context changes',change=>{
    const app=fixture.mount();prepareCanvas(app);activate(app.button('Select blocks'));
    app.engine.blockUnderCrosshair=()=>null;
    const before=fixture.worldState(app.engine),selection=structuredClone(app.engine._builderSelection);
    activate(app.button('Use aimed block for selection'));
    expect(status(app).textContent).toContain('Aim at a block you placed');
    expect(status(app).textContent).toContain('2 blocks selected.');
    expect(app.engine._builderSelection).toEqual(selection);expect(fixture.worldState(app.engine)).toEqual(before);
    if(change==='selection')app.select('b');
    if(change==='action')choose(app.host.querySelector('select[aria-label="Selection action"]'),'add');
    if(change==='depth')choose(app.host.querySelector('select[aria-label="Selection depth"]'),'all');
    if(change==='lesson'){app.engine._currentLesson={...app.engine._currentLesson};app.patch({moveTestRevision:1});}
    if(change==='engine'){window.__geoWorldEngine={...app.engine};app.patch({moveTestRevision:1});}
    expect(status(app).textContent).not.toContain('Aim at a block you placed');
    expect(status(app).textContent).toContain(change==='selection'?'3 blocks selected.':'2 blocks selected.');
    expect(app.engine._undoStack).toHaveLength(1);
  });
});

describe('inline preview cancellation coexists with installed canvas controls',()=>{
  it.each([
    ['Select blocks','Select blocks','_workshopCameraActions'],
    ['Move handles','Move & rotate','_workshopTransformActions']
  ])('lets Studio cancel a form preview while %s stays active',(mode,label,actionsKey)=>{
    const app=fixture.mount(),engine=bridge(app),canvas=prepareCanvas(app);
    const direct=app.host.querySelector('.gwe-direct-controls');
    React.act(()=>{direct.open=true;direct.dispatchEvent(new Event('toggle'));});
    activate(app.button(mode));settle();
    const actions=engine[actionsKey];expect(actions).toBeTruthy();
    expect(app.host.querySelector('.gwe-pointer-hud strong').textContent).toBe(label);
    openMove(app);
    const input=app.host.querySelector('#gwe-creation-offset-x'),before=fixture.worldState(engine);
    React.act(()=>{
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2');
      input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    input.focus();
    // Native Enter submits this form while focus remains on its input.
    React.act(()=>input.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
    expect(app.button('Apply preview')).toBeTruthy();expect(engine._buildBatchPreview).toBeTruthy();
    const escape=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true});
    React.act(()=>input.dispatchEvent(escape));settle();
    expect(escape.defaultPrevented).toBe(true);
    expect(app.button('Apply preview')).toBeUndefined();expect(engine._buildBatchPreview).toBeNull();
    expect(app.host.querySelector('.gwe-edit-preview .gwe-edit-notice').textContent).toContain('Preview canceled');
    expect(app.host.querySelector('.gwe-pointer-hud strong').textContent).toBe(label);
    expect(engine[actionsKey]).toBe(actions);expect(document.activeElement).toBe(input);expect(input.value).toBe('2');
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(fixture.worldState(engine)).toEqual(before);
    React.act(()=>canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true})));
    expect(app.host.querySelector('.gwe-pointer-hud')).toBeNull();
    expect(fixture.worldState(engine)).toEqual(before);
  });
});
