import {beforeAll,beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let THREE,makeShape,fixture,api;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeAll(()=>{const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;const core=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');makeShape=new Function(core.slice(core.indexOf('  function createShapeGeometry('),core.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();});
beforeEach(()=>{
  vi.useFakeTimers();window.THREE=THREE;window.localStorage.clear();
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
  const source=readFileSync('tests/geometry_world_selected_inspector.test.js','utf8'),helpers=source.slice(source.indexOf('const key='),source.indexOf('function precedes('));
  fixture=new Function('React','ReactDOMClient','THREE','makeShape','api','vi','let mounted;'+helpers+';return {mount,cleanup(){if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();}}};')(React,ReactDOMClient,THREE,makeShape,api,vi);
});
afterEach(()=>{fixture?.cleanup();window.localStorage.clear();vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();delete window.__geoWorldEngine;});
function draft(input,value){React.act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}
function previewBridge(app){const e=app.engine;e.previewBuildBatch=vi.fn((additions,removals)=>({ok:true,additions,removals}));e.commitBuildBatch=vi.fn(()=>({ok:true}));e.cancelDrawing=vi.fn();e.setDrawMode=vi.fn(mode=>{e._drawMode=mode;app.ctx().updateMulti('geometryWorld',{drawMode:mode});});e.showBuildBatchPreview=vi.fn((plan,owner)=>{e._buildBatchPreview={owner,plan};});e.clearBuildBatchPreview=vi.fn(owner=>{if(e._buildBatchPreview?.owner===owner)e._buildBatchPreview=null;});return e;}
describe('progressive selected creation editing UI',()=>{
  it('starts with closed editing and stamp disclosures and labelled grid inputs',()=>{const app=fixture.mount();expect(app.host.querySelector('.gwe-creation-editor').open).toBe(false);expect(app.host.querySelector('.gwe-stamp-library').open).toBe(false);expect(app.host.querySelector('#gwe-creation-offset-x').labels[0].textContent).toBe('X');expect(app.host.querySelector('#gwe-creation-offset-y').step).toBe('1');expect(app.host.querySelector('[aria-label="Frame selected creation"]')).toBeTruthy();expect(app.button('Apply preview')).toBeUndefined();});
  it('switches to single-block mode for a selection preview and cancels that preview when drawing starts',()=>{const app=fixture.mount(),e=previewBridge(app);e._drawMode='floor';app.patch({drawMode:'floor'});app.click(app.button('Preview change'));expect(e.cancelDrawing).toHaveBeenCalledWith(true);expect(e.setDrawMode).toHaveBeenCalledWith('single');expect(app.state().drawMode).toBe('single');expect(app.button('Apply preview').disabled).toBe(false);expect(e._buildBatchPreview?.owner.kind).toBe('selection-editor');app.patch({drawMode:'wall'});expect(app.button('Apply preview')).toBeUndefined();expect(e._buildBatchPreview).toBeNull();});
  it('will not apply a selection proposal after another preview takes its outline',()=>{const app=fixture.mount(),e=previewBridge(app);app.click(app.button('Preview change'));e._buildBatchPreview={owner:'draw'};app.click(app.button('Apply preview'));expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(app.host.textContent).toContain('Another building preview replaced this one');});
  it('changing an offset clears a preview instead of applying the old location',()=>{const app=fixture.mount(),e=previewBridge(app);app.click(app.button('Preview change'));draft(app.host.querySelector('#gwe-creation-offset-x'),'5');expect(app.button('Apply preview')).toBeUndefined();expect(e.clearBuildBatchPreview).toHaveBeenCalled();});
  it('keeps the reusable library available when no creation is selected',()=>{const app=fixture.mount({retained:null});expect(app.host.querySelector('.gwe-creation-editor')).toBeNull();expect(app.host.querySelector('.gwe-stamp-library')).toBeTruthy();expect(app.host.querySelector('.gwe-stamp-save')).toBeNull();});
  it('saves an editable named recipe without placing or changing blocks',()=>{const app=fixture.mount(),e=previewBridge(app),before=Object.values(e.blocks);draft(app.host.querySelector('#gwe-stamp-name'),'Garden arch');React.act(()=>app.host.querySelector('.gwe-stamp-save').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(api.readBuildStamps().stamps[0].name).toBe('Garden arch');expect(Object.values(e.blocks)).toEqual(before);expect(e.commitBuildBatch).not.toHaveBeenCalled();openStampLibrary(app);expect(app.host.querySelector('.gwe-stamp-card[aria-pressed=true]').textContent).toContain('Garden arch');expect(app.button('Preview stamp')).toBeTruthy();});
  it('uses the aimed cell as a stamp corner without placing it',()=>{const app=fixture.mount(),e=previewBridge(app);draft(app.host.querySelector('#gwe-stamp-name'),'Arch');React.act(()=>app.host.querySelector('.gwe-stamp-save').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));e._placementPreview={cell:{x:14,y:3,z:-2}};app.click(app.button('Use aimed cell'));expect(['x','y','z'].map(axis=>app.host.querySelector('#gwe-stamp-corner-'+axis).value)).toEqual(['14','3','-2']);expect(e.commitBuildBatch).not.toHaveBeenCalled();});
});

function openStampLibrary(app){React.act(()=>{const d=app.host.querySelector('.gwe-stamp-library');d.open=true;d.dispatchEvent(new Event('toggle'));});}
function saveStamp(app,name){draft(app.host.querySelector('#gwe-stamp-name'),name);React.act(()=>app.host.querySelector('.gwe-stamp-save').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
function selectDuplicate(app){React.act(()=>{const input=app.host.querySelector('#gwe-creation-edit-action');input.value='duplicate';input.dispatchEvent(new Event('change',{bubbles:true}));});}
function chooseAction(app,value){
  const select=app.host.querySelector('#gwe-creation-edit-action');
  React.act(()=>{select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));});
}
function openEditor(app){
  const editor=app.host.querySelector('.gwe-creation-editor');
  React.act(()=>{editor.open=true;editor.dispatchEvent(new Event('toggle'));});
}
function settleFocus(){React.act(()=>vi.advanceTimersByTime(80));}
function expectFieldError(app,id,errorId){
  const input=app.host.querySelector('#'+id),error=app.host.querySelector('#'+errorId);
  expect(error).toBeTruthy();expect(error.getAttribute('role')).toBe('alert');
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toBe(errorId);
  expect(document.activeElement).toBe(input);
}

describe('keyboard preview forms',()=>{
  it('submits a creation preview without applying it and describes the same proposal in world review',()=>{
    const app=fixture.mount(),engine=previewBridge(app);engine.setViewPreset=vi.fn();openEditor(app);
    const field=app.host.querySelector('#gwe-creation-offset-x'),form=field.closest('form'),before=Object.values(engine.blocks);
    expect(form.className).toBe('gwe-creation-edit-form');expect(form.noValidate).toBe(true);
    expect(form.querySelector('button[type=submit]').textContent).toBe('Preview change');
    expect(form.querySelector('[type=submit]').closest('form form')).toBeNull();
    draft(field,'2');field.focus();
    React.act(()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));settleFocus();
    const summary=app.host.querySelector('[data-gwe-preview-summary]').textContent;
    expect(summary).toContain('2 grid cells right (+X)');expect(summary).toContain('will be selected');
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(Object.values(engine.blocks)).toEqual(before);
    expect(form.contains(app.button('Apply preview'))).toBe(false);
    app.click(app.button('Review in world'));settleFocus();
    expect(app.host.querySelector('.gwe-preview-review [data-gwe-preview-summary]').textContent).toBe(summary);
    app.click(app.button('Cancel preview'));settleFocus();
    expect(document.activeElement).toBe(app.host.querySelector('#gwe-creation-offset-x'));
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(Object.values(engine.blocks)).toEqual(before);
  });
  it('routes invalid creation form submission through linked custom errors instead of applying',()=>{
    const app=fixture.mount(),engine=previewBridge(app);openEditor(app);
    const field=app.host.querySelector('#gwe-creation-offset-x');draft(field,'0.5');field.focus();
    React.act(()=>field.closest('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));settleFocus();
    expectFieldError(app,field.id,'gwe-creation-field-error');
    expect(engine.previewBuildBatch).not.toHaveBeenCalled();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it.each([
    ['starter','gwe-starter-corner','gwe-starter-placement','gwe-starter-field-error'],
    ['stamp','gwe-stamp-corner','gwe-stamp-placement','gwe-stamp-field-error']
  ])('submits %s placement separately from saving a recipe',(kind,prefix,className,errorId)=>{
    const app=fixture.mount(),engine=previewBridge(app);
    if(kind==='stamp'){saveStamp(app,'Step');openStampLibrary(app);}
    const field=app.host.querySelector('#'+prefix+'-x'),form=field.closest('form'),before=Object.values(engine.blocks);
    expect(form.className).toBe(className);expect(form.noValidate).toBe(true);
    expect(form.querySelector('form')).toBeNull();expect(form.querySelector('#gwe-stamp-name')).toBeNull();
    draft(field,'');field.focus();
    React.act(()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));settleFocus();
    expectFieldError(app,field.id,errorId);expect(engine.previewBuildBatch).not.toHaveBeenCalled();
    draft(field,'12');
    React.act(()=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));settleFocus();
    expect(app.host.querySelector('#'+errorId)).toBeNull();expect(app.button('Apply preview').disabled).toBe(false);
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();expect(Object.values(engine.blocks)).toEqual(before);
  });
});

describe('actionable creation field errors',()=>{
  it('focuses the first invalid offset, links every affected input, and allows a corrected explicit preview',()=>{
    const app=fixture.mount(),engine=previewBridge(app),before=Object.values(engine.blocks);
    const selection=structuredClone(engine._builderSelection);openEditor(app);
    draft(app.host.querySelector('#gwe-creation-offset-x'),'');
    draft(app.host.querySelector('#gwe-creation-offset-y'),'.5');
    app.click(app.button('Preview change'));settleFocus();
    expectFieldError(app,'gwe-creation-offset-x','gwe-creation-field-error');
    expect(app.host.querySelector('#gwe-creation-offset-y').getAttribute('aria-invalid')).toBe('true');
    expect(engine.previewBuildBatch).not.toHaveBeenCalled();expect(app.button('Apply preview')).toBeUndefined();
    expect(Object.values(engine.blocks)).toEqual(before);expect(engine._builderSelection).toEqual(selection);
    draft(app.host.querySelector('#gwe-creation-offset-x'),'3');
    expect(app.host.querySelector('#gwe-creation-field-error')).toBeNull();
    expect(app.host.querySelector('#gwe-creation-offset-y').getAttribute('aria-describedby')).toBeNull();
    draft(app.host.querySelector('#gwe-creation-offset-y'),'0');
    app.click(app.button('Preview change'));
    expect(app.button('Apply preview').disabled).toBe(false);
    expect(engine.previewBuildBatch).toHaveBeenCalledOnce();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it.each([
    ['repeat','gwe-pattern-total','13'],
    ['repeat','gwe-pattern-gap','9'],
    ['align','gwe-align-coordinate','1.5']
  ])('links the invalid %s value in %s and clears it when the editing action changes',(action,id,value)=>{
    const app=fixture.mount(),engine=previewBridge(app);openEditor(app);chooseAction(app,action);
    draft(app.host.querySelector('#'+id),value);app.click(app.button('Preview change'));settleFocus();
    expectFieldError(app,id,'gwe-creation-field-error');expect(engine.previewBuildBatch).not.toHaveBeenCalled();
    chooseAction(app,'rotate');expect(app.host.querySelector('#gwe-creation-field-error')).toBeNull();
    app.click(app.button('Preview change'));expect(app.button('Apply preview').disabled).toBe(false);
    expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('explains an empty move at the offset group without changing any block',()=>{
    const app=fixture.mount(),engine=previewBridge(app);openEditor(app);
    draft(app.host.querySelector('#gwe-creation-offset-x'),'0');app.click(app.button('Preview change'));settleFocus();
    expectFieldError(app,'gwe-creation-offset-x','gwe-creation-field-error');
    expect(app.host.querySelector('#gwe-creation-field-error').textContent).toContain('at least one block');
    expect([...app.host.querySelectorAll('.gwe-creation-editor [aria-invalid=true]')]).toHaveLength(3);
    expect(engine.previewBuildBatch).not.toHaveBeenCalled();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('focuses invalid stamp coordinates and preserves its recipe until a valid preview is requested',()=>{
    const app=fixture.mount(),engine=previewBridge(app);openStampLibrary(app);saveStamp(app,'Arch');
    const recipe=structuredClone(api.readBuildStamps().stamps);
    draft(app.host.querySelector('#gwe-stamp-corner-x'),'.25');
    draft(app.host.querySelector('#gwe-stamp-corner-y'),'');
    app.click(app.button('Preview stamp'));settleFocus();
    expectFieldError(app,'gwe-stamp-corner-x','gwe-stamp-field-error');
    expect(app.host.querySelector('#gwe-stamp-corner-y').getAttribute('aria-invalid')).toBe('true');
    expect(engine.previewBuildBatch).not.toHaveBeenCalled();expect(api.readBuildStamps().stamps).toEqual(recipe);
    draft(app.host.querySelector('#gwe-stamp-corner-x'),'20');
    draft(app.host.querySelector('#gwe-stamp-corner-y'),'1');
    app.click(app.button('Preview stamp'));expect(app.host.querySelector('#gwe-stamp-field-error')).toBeNull();
    expect(app.button('Apply preview').disabled).toBe(false);expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('replaces a fractional move error with a one-step nudge preview without applying it',()=>{
    const app=fixture.mount(),engine=previewBridge(app),before=Object.values(engine.blocks);
    const selection=structuredClone(engine._builderSelection),history=structuredClone(engine._undoStack);
    openEditor(app);draft(app.host.querySelector('#gwe-creation-offset-x'),'.5');
    app.click(app.button('Preview change'));settleFocus();
    expectFieldError(app,'gwe-creation-offset-x','gwe-creation-field-error');
    const direct=app.host.querySelector('.gwe-direct-controls');
    React.act(()=>{direct.open=true;direct.dispatchEvent(new Event('toggle'));});
    app.click(app.button('+ X'));
    const input=app.host.querySelector('#gwe-creation-offset-x');
    expect(input.value).toBe('1');expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(app.host.querySelector('#gwe-creation-field-error')).toBeNull();
    expect(app.button('Apply preview').disabled).toBe(false);
    expect(engine.previewBuildBatch).toHaveBeenCalledOnce();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
    expect(Object.values(engine.blocks)).toEqual(before);
    expect(engine._builderSelection).toEqual(selection);expect(engine._undoStack).toEqual(history);
  });
  it('focuses a contextual collision message while keeping valid numeric fields unmarked',()=>{
    const app=fixture.mount(),engine=previewBridge(app);openEditor(app);
    engine.previewBuildBatch.mockReturnValue({ok:false,code:'occupied',reason:'X 1, Y 1, Z 0 contains one of your blocks.'});
    app.click(app.button('Preview change'));settleFocus();
    const notice=app.host.querySelector('.gwe-edit-preview');
    expect(document.activeElement).toBe(notice);expect(notice.textContent).toContain('contains one of your blocks');
    expect(app.host.querySelectorAll('.gwe-creation-editor [aria-invalid=true]')).toHaveLength(0);
    expect(app.button('Apply preview').disabled).toBe(true);expect(engine.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('clears an old selection error when another creation is selected',()=>{
    const app=fixture.mount();previewBridge(app);openEditor(app);
    draft(app.host.querySelector('#gwe-creation-offset-x'),'');app.click(app.button('Preview change'));
    expect(app.host.querySelector('#gwe-creation-field-error')).toBeTruthy();app.select('b');
    expect(app.host.querySelector('#gwe-creation-field-error')).toBeNull();
  });
});
describe('visual stamps and easy duplicate placement',()=>{
  it('loads shape illustrations only when the stamp library is open',()=>{const app=fixture.mount();previewBridge(app);saveStamp(app,'Stone step');expect(app.host.querySelectorAll('.gwe-stamp-card img')).toHaveLength(0);openStampLibrary(app);const card=app.host.querySelector('.gwe-stamp-card');expect(card.getAttribute('aria-pressed')).toBe('true');expect(card.textContent).toContain('2 blocks');expect(card.textContent).toContain('2 wide · 1 deep · 1 high');expect(decodeURIComponent(card.querySelector('img').src)).toContain('<polygon');});
  it('picking a visual card changes the recipe and cancels a prior preview without placing blocks',()=>{const app=fixture.mount(),e=previewBridge(app);openStampLibrary(app);saveStamp(app,'Stone step');app.select('b');saveStamp(app,'Wood tower');expect(app.host.querySelectorAll('.gwe-stamp-card')).toHaveLength(2);app.click(app.button('Preview stamp'));const card=app.host.querySelector('[aria-label="Use stamp Stone step"]');app.click(card);expect(card.getAttribute('aria-pressed')).toBe('true');expect(app.host.querySelector('[aria-label="Use stamp Wood tower"]').getAttribute('aria-pressed')).toBe('false');expect(app.button('Apply preview')).toBeUndefined();expect(e.commitBuildBatch).not.toHaveBeenCalled();});
  it('suggests a full-width duplicate offset without committing or automatically applying a preview',()=>{const app=fixture.mount(),e=previewBridge(app);selectDuplicate(app);expect(app.host.querySelector('#gwe-creation-offset-x').value).toBe('3');expect(app.button('Apply preview')).toBeUndefined();expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(app.host.textContent).toContain('A clear position is suggested');});
  it('offers a stack preview with one click while keeping Apply explicit',()=>{const app=fixture.mount(),e=previewBridge(app);selectDuplicate(app);app.click(app.button('Stack above'));expect(['x','y','z'].map(a=>app.host.querySelector('#gwe-creation-offset-'+a).value)).toEqual(['0','1','0']);expect(app.button('Apply preview').disabled).toBe(false);expect(e.commitBuildBatch).not.toHaveBeenCalled();});
  it('saving a different stamp clears the previous placement proposal',()=>{const app=fixture.mount();previewBridge(app);saveStamp(app,'First');app.click(app.button('Preview stamp'));expect(app.button('Apply preview')).toBeTruthy();saveStamp(app,'Second');expect(app.button('Apply preview')).toBeUndefined();});
});

describe('architectural starter placement feedback',()=>{
  function openStarters(app){
    const starters=app.host.querySelector('.gwe-starter-library');
    React.act(()=>{starters.open=true;starters.dispatchEvent(new Event('toggle'));});
    return starters;
  }
  it.each([['x',''],['y','.5'],['z','.25']])('focuses invalid starter %s and requires a corrected preview before applying',(axis,value)=>{
    const app=fixture.mount(),engine=previewBridge(app),before=Object.values(engine.blocks);
    const selection=structuredClone(engine._builderSelection),history=structuredClone(engine._undoStack);
    openStarters(app);
    const input=app.host.querySelector('#gwe-starter-corner-'+axis);
    draft(input,value);app.click(app.button('Preview starter'));settleFocus();
    expectFieldError(app,'gwe-starter-corner-'+axis,'gwe-starter-field-error');
    expect(engine.previewBuildBatch).not.toHaveBeenCalled();expect(app.button('Apply preview')).toBeUndefined();
    expect(Object.values(engine.blocks)).toEqual(before);
    expect(engine._builderSelection).toEqual(selection);expect(engine._undoStack).toEqual(history);
    draft(input,axis==='y'?'1':'20');
    expect(app.host.querySelector('#gwe-starter-field-error')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();expect(input.getAttribute('aria-describedby')).toBeNull();
    app.click(app.button('Preview starter'));
    expect(app.button('Apply preview').disabled).toBe(false);
    expect(engine.previewBuildBatch).toHaveBeenCalledOnce();expect(engine.commitBuildBatch).not.toHaveBeenCalled();
    expect(Object.values(engine.blocks)).toEqual(before);
    app.click(app.button('Apply preview'));expect(engine.commitBuildBatch).toHaveBeenCalledOnce();
  });
  it('focuses the starter collision explanation without blaming valid coordinate fields or changing the world',()=>{
    const app=fixture.mount(),engine=previewBridge(app),before=Object.values(engine.blocks);
    const selection=structuredClone(engine._builderSelection),history=structuredClone(engine._undoStack);
    openStarters(app);
    engine.previewBuildBatch.mockReturnValue({ok:false,code:'occupied',reason:'X 0, Y 1, Z 0 contains one of your blocks.'});
    app.click(app.button('Preview starter'));settleFocus();
    const notice=app.host.querySelector('.gwe-edit-preview');
    expect(document.activeElement).toBe(notice);expect(notice.textContent).toContain('contains one of your blocks');
    expect(app.host.querySelectorAll('.gwe-starter-library [aria-invalid=true]')).toHaveLength(0);
    expect(app.host.querySelector('#gwe-starter-field-error')).toBeNull();
    expect(app.button('Apply preview').disabled).toBe(true);expect(engine.commitBuildBatch).not.toHaveBeenCalled();
    expect(Object.values(engine.blocks)).toEqual(before);
    expect(engine._builderSelection).toEqual(selection);expect(engine._undoStack).toEqual(history);
  });
});

it('preserves exact selection mode when the live outline refreshes',()=>{const app=fixture.mount();app.engine._builderSelection={blocks:[{x:0,y:1,z:0}],exact:true};React.act(()=>vi.advanceTimersByTime(900));expect(app.engine._builderSelection?.exact).toBe(true);});
