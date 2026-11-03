import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let THREE,makeShape,fixture,api;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
  const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8'),helpers=source.slice(source.indexOf('const key='),source.indexOf('function precedes('));
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,worldState,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
});
afterEach(()=>{fixture?.cleanup();document.querySelectorAll('[data-preview-test-target]').forEach(node=>node.remove());window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();delete window.__geoWorldEngine;});
function settle(){React.act(()=>vi.advanceTimersByTime(80));}
function bridge(app){
  const e=app.engine;e.previewBuildBatch=vi.fn((additions,removals)=>({ok:true,additions,removals}));e.commitBuildBatch=vi.fn(()=>({ok:true}));e.cancelDrawing=vi.fn();e.setDrawMode=vi.fn();e.setViewPreset=vi.fn();
  e.showBuildBatchPreview=vi.fn((plan,owner)=>{e._buildBatchPreview={owner,plan};});e.clearBuildBatchPreview=vi.fn(owner=>{if(e._buildBatchPreview?.owner===owner)e._buildBatchPreview=null;});return e;
}
function openEditor(app){const details=app.host.querySelector('.gwe-creation-editor');React.act(()=>{details.open=true;details.dispatchEvent(new Event('toggle'));});return details;}
function startPreview(app){openEditor(app);const origin=app.button('Preview change');origin.focus();app.click(origin);return origin;}
function complete(app,label){const button=app.button(label);expect(button).toBeTruthy();button.focus();app.click(button);}
function sentinel(){const target=document.createElement('button');target.dataset.previewTestTarget='true';document.body.appendChild(target);target.focus();return target;}
function draft(input,value){
  React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});
}
function escapeFrom(node){
  const event=new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true});
  React.act(()=>node.dispatchEvent(event));return event;
}
function openDetails(details){React.act(()=>{details.open=true;details.dispatchEvent(new Event('toggle'));});}
function submit(form){React.act(()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}

describe('preview completion keeps keyboard users in their workflow',()=>{
  it.each([
    ['creation','.gwe-creation-edit-form','#gwe-creation-offset-x','3'],
    ['stamp','.gwe-stamp-placement','#gwe-stamp-corner-x','8'],
    ['starter','.gwe-starter-placement','#gwe-starter-corner-x','8']
  ])('cancels the inline %s preview with Escape and restores its unchanged input draft', (kind,formSelector,inputSelector,value)=>{
    const app=fixture.mount(),engine=bridge(app);
    if(kind==='creation')openEditor(app);
    else if(kind==='stamp'){
      openDetails(app.host.querySelector('.gwe-stamp-library'));
      draft(app.host.querySelector('#gwe-stamp-name'),'Arch');submit(app.host.querySelector('.gwe-stamp-save'));
    }else openDetails(app.host.querySelector('.gwe-starter-library'));
    const input=app.host.querySelector(inputSelector);draft(input,value);input.focus();
    const before=fixture.worldState(engine);submit(app.host.querySelector(formSelector));
    expect(app.button('Apply preview')).toBeTruthy();expect(engine._buildBatchPreview?.owner.kind).toBe('selection-editor');
    const coreEscape=vi.fn();document.addEventListener('keydown',coreEscape);
    const event=escapeFrom(input);document.removeEventListener('keydown',coreEscape);settle();
    expect(event.defaultPrevented).toBe(true);expect(coreEscape).not.toHaveBeenCalled();
    expect(app.button('Apply preview')).toBeUndefined();expect(engine._buildBatchPreview).toBeNull();
    expect(input.value).toBe(value);expect(document.activeElement).toBe(input);
    expect(app.host.querySelector(formSelector).closest('details').open).toBe(true);
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(fixture.worldState(engine)).toEqual(before);
  });
  it('cancels a coordinate-building proposal before a second Escape closes its tools',()=>{
    const app=fixture.mount(),engine=bridge(app),details=app.host.querySelector('.gwe-coordinate-builder');
    openDetails(details);settle();
    const origin=app.host.querySelector('#gwe-build-origin-x');draft(origin,'7');origin.focus();
    const before=fixture.worldState(engine);submit(app.host.querySelector('.gwe-coordinate-build-form'));settle();
    expect(app.button('Apply preview')).toBeTruthy();
    const event=escapeFrom(app.host.querySelector('.gwe-edit-preview'));settle();
    expect(event.defaultPrevented).toBe(true);expect(details.open).toBe(true);
    expect(app.button('Apply preview')).toBeUndefined();expect(origin.value).toBe('7');
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(fixture.worldState(engine)).toEqual(before);
    escapeFrom(origin);settle();expect(details.open).toBe(false);
    expect(document.activeElement).toBe(details.querySelector('summary'));
  });
  it('cancels a direct one-step nudge with Escape and restores its button without changing the build',()=>{
    const app=fixture.mount(),engine=bridge(app),controls=app.host.querySelector('.gwe-direct-controls');
    openDetails(controls);
    const origin=app.button('+ X'),before=fixture.worldState(engine),selection=structuredClone(engine._builderSelection);
    origin.focus();app.click(origin);
    expect(app.button('Apply preview')).toBeTruthy();expect(engine._buildBatchPreview?.owner.kind).toBe('selection-editor');
    const event=escapeFrom(origin);settle();
    expect(event.defaultPrevented).toBe(true);expect(app.button('Apply preview')).toBeUndefined();
    expect(engine._buildBatchPreview).toBeNull();expect(document.activeElement).toBe(origin);
    expect(controls.open).toBe(true);expect(engine._builderSelection).toEqual(selection);
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(fixture.worldState(engine)).toEqual(before);
  });
  it.each(['engine','lesson','modal','transition','another-preview'])('leaves an unrelated inline proposal alone after %s takes ownership',change=>{
    const app=fixture.mount(),engine=bridge(app);startPreview(app);
    const input=app.host.querySelector('#gwe-creation-offset-x');input.focus();
    if(change==='engine')window.__geoWorldEngine={...engine};
    if(change==='lesson')engine._currentLesson={sandbox:true};
    if(change==='modal')engine._modalState={showHelp:true};
    if(change==='transition')engine._pendingWorldTransition={kind:'saved-project'};
    if(change==='another-preview')engine._buildBatchPreview={owner:{kind:'another-tool'}};
    const before=engine._buildBatchPreview,event=escapeFrom(input);
    expect(event.defaultPrevented).toBe(false);expect(engine._buildBatchPreview).toBe(before);
    expect(app.button('Apply preview')).toBeTruthy();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
  });
  it('lets Escape close the tool finder without canceling an inline proposal',()=>{
    const app=fixture.mount(),engine=bridge(app);startPreview(app);
    app.click(app.host.querySelector('.gwe-tool-finder-toggle'));
    const query=app.host.querySelector('#gwe-tool-query');query.focus();escapeFrom(query);settle();
    expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();expect(app.button('Apply preview')).toBeTruthy();
    expect(engine._buildBatchPreview?.owner.kind).toBe('selection-editor');
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it.each(['Apply preview','Cancel preview'])('returns from %s to the control that created the proposal',action=>{
    const app=fixture.mount(),engine=bridge(app),origin=startPreview(app),before=fixture.worldState(engine);
    complete(app,action);settle();expect(document.activeElement).toBe(origin);expect(app.button('Apply preview')).toBeUndefined();
    if(action==='Apply preview')expect(engine.commitBuildBatch).toHaveBeenCalledOnce();else{expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(fixture.worldState(engine)).toEqual(before);expect(app.host.querySelector('.gwe-edit-notice').textContent).toMatch(/Preview canceled/);}
  });
  it.each(['Apply preview','Cancel preview'])('returns to print connections after %s on a preparation proposal',action=>{
    const app=fixture.mount();bridge(app);app.click(app.host.querySelector('[data-gwe-prepare="print"]'));settle();
    const options=app.host.querySelector('.gwe-print-guide-options');React.act(()=>{options.open=true;options.dispatchEvent(new Event('toggle'));});
    const origin=app.button('Preview connecting base');origin.focus();app.click(origin);settle();complete(app,action);settle();
    expect(document.activeElement).toBe(app.host.querySelector('#gwe-print-connections'));expect(app.host.querySelector('.gwe-builder-dock').dataset.printPreparing).toBe('true');
  });
  it('keeps an apply failure readable and offers a route back to the original edit control',()=>{
    const app=fixture.mount(),engine=bridge(app),origin=startPreview(app),before=fixture.worldState(engine);engine._buildBatchPreview={owner:'another-tool'};
    complete(app,'Apply preview');settle();const notice=app.host.querySelector('.gwe-edit-preview');expect(document.activeElement).toBe(notice);expect(notice.textContent).toContain('Another building preview replaced this one');
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(fixture.worldState(engine)).toEqual(before);
    app.click(app.button('Return to edit controls'));settle();expect(document.activeElement).toBe(origin);
  });
  it('does not move focus when changing a draft implicitly cancels a preview',()=>{
    const app=fixture.mount();bridge(app);startPreview(app);const input=app.host.querySelector('#gwe-creation-offset-x');input.focus();
    React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'4');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});settle();
    expect(app.button('Apply preview')).toBeUndefined();expect(document.activeElement).toBe(input);
  });
  it.each(['Apply preview','Cancel preview'])('restores a useful editor control after %s from in-world review',action=>{
    const app=fixture.mount();bridge(app);const origin=startPreview(app);app.click(app.button('Review in world'));settle();expect(app.state().sandboxDockCollapsed).toBe(true);expect(document.activeElement).toBe(app.host.querySelector('.gwe-preview-review'));
    complete(app,action);settle();expect(app.state().sandboxDockCollapsed).toBe(false);expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect(origin.isConnected).toBe(false);expect(document.activeElement).toBe(app.host.querySelector('.gwe-creation-editor > summary'));
  });
  it('keeps a pending proposal when returning from in-world review to tools',()=>{
    const app=fixture.mount(),engine=bridge(app);startPreview(app);app.click(app.button('Review in world'));settle();app.click(app.button('Back to tools'));settle();
    expect(document.activeElement).toBe(app.host.querySelector('.gwe-edit-preview'));expect(app.button('Apply preview')).toBeTruthy();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it.each(['modal','engine','new-preview','unmount'])('does not steal focus after a newer %s replaces the completion handoff',change=>{
    const app=fixture.mount(),engine=bridge(app);startPreview(app);complete(app,'Cancel preview');let target;
    if(change==='modal'){app.patch({showGameSettings:true});target=sentinel();}
    else if(change==='engine'){window.__geoWorldEngine={...engine};target=sentinel();}
    else if(change==='new-preview'){target=app.host.querySelector('#gwe-creation-offset-x');target.focus();app.click(app.button('Preview change'));}
    else{fixture.cleanup();target=sentinel();}
    settle();expect(document.activeElement).toBe(target);
  });
  it('does not focus a world review over a dialog opened before its queued frame',()=>{
    const app=fixture.mount();bridge(app);startPreview(app);app.click(app.button('Review in world'));app.patch({showGameSettings:true});const target=sentinel();settle();expect(document.activeElement).toBe(target);
  });
});
