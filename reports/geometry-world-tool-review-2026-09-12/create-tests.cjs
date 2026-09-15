const fs=require('fs');const fixture=fs.readFileSync('tests/geometry_world_selection_editor_ui.test.js','utf8').split("describe('progressive selected creation editing UI'")[0];
fs.writeFileSync('tests/geometry_world_tool_review.test.js',fixture+String.raw`
describe('tool discovery',()=>{
  it('finds tasks by ordinary words, keeps unavailable selection tools discoverable, and never mutates the catalog',()=>{
    expect(api.findWorkshopTools('roof',false).map(t=>t.id)).toEqual(['starters']);expect(api.findWorkshopTools('PRINT SIZE',true).map(t=>t.id)).toContain('scale');expect(api.findWorkshopTools('json',true).map(t=>t.id)).toEqual(['save']);
    const result=api.findWorkshopTools('rotate',false);expect(result.find(t=>t.id==='transform').available).toBe(false);result[0].title='Changed';expect(api.findWorkshopTools('rotate',true).some(t=>t.title==='Changed')).toBe(false);expect(api.findWorkshopTools('zzzz',true)).toEqual([]);
  });
  it('focuses search, filters tools, opens a nested target, and preserves the project-name draft',()=>{
    const app=fixture.mount(),name=app.host.querySelector('#gwe-project-name');draft(name,'An unfinished name');app.click(app.host.querySelector('.gwe-tool-finder-toggle'));expect(document.activeElement).toBe(app.host.querySelector('#gwe-tool-query'));expect(app.host.querySelector('.gwe-builder-body').hidden).toBe(true);
    draft(app.host.querySelector('#gwe-tool-query'),'mm');expect(app.host.querySelectorAll('.gwe-tool-result')).toHaveLength(1);app.click(app.host.querySelector('[data-tool=scale]'));React.act(()=>vi.advanceTimersByTime(100));expect(app.host.querySelector('.gwe-scale-editor').closest('details').open).toBe(true);expect(app.host.querySelector('.gwe-builder-body').hidden).toBe(false);expect(app.host.querySelector('#gwe-project-name')).toBe(name);expect(name.value).toBe('An unfinished name');
  });
  it('provides an empty state and Escape returns focus to the finder toggle',()=>{
    const app=fixture.mount();app.click(app.host.querySelector('.gwe-tool-finder-toggle'));const input=app.host.querySelector('#gwe-tool-query');draft(input,'nothing matches this');expect(app.host.querySelector('.gwe-tool-count').textContent).toContain('No matching tools');React.act(()=>input.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));React.act(()=>vi.advanceTimersByTime(50));expect(app.host.querySelector('.gwe-tool-finder')).toBeNull();expect(document.activeElement).toBe(app.host.querySelector('.gwe-tool-finder-toggle'));
  });
  it('explains unavailable actions and links to selection without mutating the world',()=>{
    const app=fixture.mount({retained:null}),blocks=Object.keys(app.engine.blocks);app.click(app.host.querySelector('.gwe-tool-finder-toggle'));const print=app.host.querySelector('[data-tool=print]');expect(print.disabled).toBe(true);expect(print.textContent).toContain('Select a creation first');app.click(app.host.querySelector('.gwe-finder-select'));React.act(()=>vi.advanceTimersByTime(100));expect(app.host.querySelector('.gwe-direct-controls').open).toBe(true);expect(Object.keys(app.engine.blocks)).toEqual(blocks);expect(app.engine._builderSelection).toBeNull();
  });
});
describe('preview review',()=>{
  it('reports target bounds and the net block count for a move or new structure',()=>{
    const additions=[{x:-2,y:1,z:0},{x:3,y:4,z:2}],facts=api.previewChangeFacts({additions,removals:[{},{}]});expect(facts).toMatchObject({count:2,net:0,width:6,depth:3,height:4});expect(api.previewChangeFacts({additions,removals:[]}).net).toBe(2);expect(api.previewChangeFacts({additions:[{x:0.5,y:1,z:0}]})).toBeNull();expect(api.previewChangeFacts({additions:[]})).toBeNull();
  });
  it('keeps Apply and Cancel in the fixed footer, then frames the proposal without committing geometry',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();const selection=e._builderSelection,undo=e._undoStack;app.click(app.button('Preview change'));expect(app.host.querySelector('.gwe-builder-footer').contains(app.button('Apply preview'))).toBe(true);app.click(app.button('Review in world'));expect(e.setViewPreset).toHaveBeenCalledWith('front',expect.objectContaining({radius:expect.any(Number)}));expect(app.state().sandboxDockCollapsed).toBe(true);expect(app.host.querySelector('.gwe-preview-review')).toBeTruthy();expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(e._builderSelection).toBe(selection);expect(e._undoStack).toBe(undo);expect(app.host.querySelectorAll('button').length).toBeGreaterThan(0);
    app.click(app.button('Back to tools'));expect(app.state().sandboxDockCollapsed).toBe(false);expect(app.button('Apply preview')).toBeTruthy();expect(e._buildBatchPreview).toBeTruthy();
  });
  it('Escape cancels a review and releases only its own outline',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));React.act(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect(app.state().sandboxDockCollapsed).toBe(false);expect(app.button('Apply preview')).toBeUndefined();expect(e._buildBatchPreview).toBeNull();expect(e.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('rejects a replaced outline before camera review and keeps the original build intact',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));e._buildBatchPreview={owner:'someone-else'};app.click(app.button('Review in world'));expect(app.host.textContent).toContain('This outline was replaced');expect(e.setViewPreset).not.toHaveBeenCalled();expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(app.host.querySelector('.gwe-preview-review')).toBeNull();
  });
  it('applies from the review through the same explicit commit, and shows the result in the dock',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));app.click(app.button('Apply preview'));expect(e.commitBuildBatch).toHaveBeenCalledOnce();expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect(app.host.textContent).toContain('applied. Undo reverses the whole change.');expect(app.state().sandboxDockCollapsed).toBe(false);
  });
  it('refuses a stale lesson or preview without target cells',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));const overlay=e._buildBatchPreview,plan=overlay.plan;e._currentLesson={...e._currentLesson};expect(api.frameBuildPreview(app.ctx(),plan,overlay.owner).ok).toBe(false);expect(api.frameBuildPreview(app.ctx(),{...plan,additions:[]},overlay.owner).ok).toBe(false);expect(e.setViewPreset).not.toHaveBeenCalled();
  });
});
`);console.log('Added tool discovery and preview review behavior tests.');
