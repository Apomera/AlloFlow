const fs=require('fs');
let fixture=fs.readFileSync('tests/geometry_world_workshop.test.js','utf8').split("describe('architectural starter recipes'")[0];
fixture=fixture.replace('const deps={engine,THREE,MAX_BLOCKS:',"const deps={engine,THREE,getBlockMaterial:type=>new THREE.MeshStandardMaterial({color:type==='wood'?0x886644:0x998877}),MAX_BLOCKS:");
fs.writeFileSync('tests/geometry_world_patterns.test.js',fixture+`
describe('atomic repeated creations',()=>{
 it.each(['x','y','z'])('spaces mixed shapes along %s and preserves every recipe',axis=>{
  const input=[block(1,3,2,'stone','halfA',3),block(3,5,4,'wood','quarter',1)],f=selected(input),before=snapshot(f),plan=api.previewSelectionEdit(f.engine,'repeat',{axis,direction:1,total:4,gap:2});
  expect(plan.ok).toBe(true);expect(snapshot(f)).toEqual(before);expect(plan.removals).toEqual([]);expect(plan.additions).toHaveLength(6);expect(plan.afterSelection.blocks).toHaveLength(8);expect(plan.afterSelection.exact).toBe(true);
  for(let copy=1;copy<=3;copy++)for(let i=0;i<input.length;i++)expect(plan.additions[(copy-1)*2+i]).toEqual({...input[i],[axis]:input[i][axis]+copy*5});
  expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);expect(f.engine._undoStack).toHaveLength(1);f.engine.undo();expect(api.selectionEditSnapshot(f.engine).blocks).toEqual(input);f.engine.redo();expect(f.engine._builderSelection.blocks).toHaveLength(8);
 });
 it('keeps zero-gap touching copies and the original selected as a single pattern',()=>{
  const f=selected([block(0)]),plan=api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:-1,total:3,gap:0});expect(plan.ok).toBe(true);expect(plan.additions.map(b=>b.x)).toEqual([-1,-2]);expect(plan.afterSelection.blocks).toHaveLength(3);expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);
 });
 it.each([{total:1},{total:13},{total:2.5},{total:NaN},{gap:-1},{gap:9},{gap:1.5},{axis:'q'},{direction:0}])('refuses malformed options %j without changing the world',bad=>{const f=selected([block(0)]),before=snapshot(f);expect(api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:4,gap:1,...bad}).ok).toBe(false);expect(snapshot(f)).toEqual(before);});
 it('refuses an occupied copy, an out-of-world pattern, and an oversized allocation',()=>{
  const f=selected([block(0)]);place(f,block(4));const before=snapshot(f);expect(api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:4,gap:1}).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  expect(api.previewSelectionEdit(selected([block(63)]).engine,'repeat',{axis:'x',direction:1,total:3,gap:0}).ok).toBe(false);
  expect(api.transformCreationBlocks(Array.from({length:751},(_,i)=>block(i)),'repeat',{axis:'x',direction:1,total:2,gap:0}).reason).toContain('1500');
 });
 it('revalidates the source and destination after preview',()=>{
  const f=selected([block(0)]),plan=api.previewSelectionEdit(f.engine,'repeat',{axis:'x',direction:1,total:3,gap:1});place(f,block(2));const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  const g=selected([block(0)]),next=api.previewSelectionEdit(g.engine,'repeat',{axis:'x',direction:1,total:3,gap:1});g.engine.blocks['0,1,0'].userData.rotation=2;expect(api.commitSelectionEdit(g.engine,next).ok).toBe(false);
 });
});
describe('align the grid footprint without deforming the build',()=>{
 it.each([['x','start',10,[10,12]],['x','end',10,[7,9]],['y','start',1,[1,3]],['y','end',8,[5,7]],['z','start',-5,[-5,-3]],['z','end',0,[-3,-1]]])('aligns %s %s to grid line %s',(axis,edge,coordinate,expected)=>{
  const f=selected([block(1,3,2,'stone','halfA',3),block(3,5,4,'wood','quarter',1)]),before=api.selectionEditSnapshot(f.engine),plan=api.previewSelectionEdit(f.engine,'align',{axis,edge,coordinate});expect(plan.ok).toBe(true);expect(plan.additions.map(b=>b[axis])).toEqual(expected);expect(plan.additions.map(b=>[b.type,b.shape,b.rotation])).toEqual(before.blocks.map(b=>[b.type,b.shape,b.rotation]));expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);f.engine.undo();expect(api.selectionEditSnapshot(f.engine)).toEqual(before);
 });
 it('reports already aligned, noninteger lines, and blocked moves',()=>{
  const f=selected([block(0)]);expect(api.previewSelectionEdit(f.engine,'align',{axis:'x',edge:'start',coordinate:0}).reason).toContain('already aligned');expect(api.previewSelectionEdit(f.engine,'align',{axis:'x',edge:'start',coordinate:.5}).ok).toBe(false);place(f,block(4));expect(api.previewSelectionEdit(f.engine,'align',{axis:'x',edge:'start',coordinate:4}).ok).toBe(false);
 });
});
describe('material preview ownership and geometry fidelity',()=>{
 it('keeps drawing wireframes lightweight, builds surfaces only on review, and reuses them',()=>{
  const f=selected([block(-10)]),e=f.engine,plan={ok:true,additions:[block(0,1,0,'stone','halfB'),block(1,1,0,'wood','halfA',1)]},before=api.editableWorld(e);e.showBuildBatchPreview(plan,'test');expect(e._buildBatchPreview.group.children).toHaveLength(1);expect(e.setBuildPreviewSurface(true,'other')).toBe(false);expect(e.setBuildPreviewSurface(true,'test')).toBe(true);const state=e._buildBatchPreview,surfaces=state.surfaces;
  expect(surfaces.children).toHaveLength(2);expect(surfaces.children.every(m=>m.material.transparent&&m.userData.gwDecorative)).toBe(true);
  for(let i=0;i<2;i++){const b=plan.additions[i],geo=surfaces.children[i].geometry,p=geo.attributes.position,actual=[];for(let j=0;j<p.count;j++)actual.push(new THREE.Vector3().fromBufferAttribute(p,j));expect(pointSet(actual)).toEqual(pointSet(worldVertices(b)));expect(geo.attributes.normal.count).toBe(p.count);expect(geo.attributes.uv.count).toBe(p.count);}
  expect(api.editableWorld(e)).toEqual(before);expect(e._undoStack).toHaveLength(0);e.setBuildPreviewSurface(false,'test');expect(surfaces.visible).toBe(false);e.setBuildPreviewSurface(true,'test');expect(state.surfaces).toBe(surfaces);
 });
 it('disposes all preview geometry and material once and does not dispose another owner',()=>{
  const e=makeFixture().engine;e.showBuildBatchPreview({ok:true,additions:[block(0),block(2,1,0,'wood')]},'test');e.setBuildPreviewSurface(true,'test');const spies=[];e._buildBatchPreview.group.traverse(p=>{if(p.geometry)spies.push(vi.spyOn(p.geometry,'dispose'));if(p.material)spies.push(vi.spyOn(p.material,'dispose'));});e.clearBuildBatchPreview('other');expect(spies.every(s=>s.mock.calls.length===0)).toBe(true);e.clearBuildBatchPreview('test');expect(spies.every(s=>s.mock.calls.length===1)).toBe(true);
 });
 it('rebuilds the material when only the recipe color changes and keeps blocked previews as wireframes',()=>{
  const e=makeFixture().engine;e.showBuildBatchPreview({ok:true,additions:[block(0)]},'test');e.setBuildPreviewSurface(true,'test');const first=e._buildBatchPreview;e.showBuildBatchPreview({ok:true,additions:[block(0,1,0,'wood')]},'test');expect(e._buildBatchPreview).not.toBe(first);e.setBuildPreviewSurface(true,'test');expect(e._buildBatchPreview.surfaces.children[0].name).toBe('gw-preview-wood');e.showBuildBatchPreview({ok:false,additions:[block(0)]},'test');expect(e.setBuildPreviewSurface(true,'test')).toBe(false);expect(e._buildBatchPreview.group.children).toHaveLength(1);
 });
});
`);
let ui=fs.readFileSync('tests/geometry_world_selection_editor_ui.test.js','utf8').split('describe(')[0];
fs.writeFileSync('tests/geometry_world_patterns_ui.test.js',ui+`
describe('discoverable precision building controls',()=>{
 function change(app,id,value){const e=app.host.querySelector('#'+id);React.act(()=>{const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,value);e.dispatchEvent(new Event(e.tagName==='SELECT'?'change':'input',{bubbles:true}));});}
 it('previews a repeat only after an explicit action, includes the original, and clears stale input previews',()=>{
  const app=fixture.mount(),e=previewBridge(app);change(app,'gwe-creation-edit-action','repeat');expect(e.previewBuildBatch).not.toHaveBeenCalled();change(app,'gwe-pattern-total','3');change(app,'gwe-pattern-gap','2');app.click(app.button('Preview change'));expect(e.previewBuildBatch).toHaveBeenCalledTimes(1);expect(app.host.textContent).toContain('Repeat creation · 3 total');expect(e._buildBatchPreview.plan.afterSelection.blocks.length).toBe(e._builderSelection.blocks.length*3);change(app,'gwe-pattern-gap','1');expect(app.button('Apply preview')).toBeUndefined();expect(e._buildBatchPreview).toBeNull();
 });
 it('offers labeled grid alignment and a ground-level shortcut without committing',()=>{
  const app=fixture.mount(),e=previewBridge(app);change(app,'gwe-creation-edit-action','align');app.click(app.button('Use ground level'));expect(app.host.querySelector('#gwe-align-axis').value).toBe('y');expect(app.host.querySelector('#gwe-align-coordinate').value).toBe('1');expect(e.commitBuildBatch).not.toHaveBeenCalled();change(app,'gwe-align-coordinate','4');app.click(app.button('Preview change'));expect(e._buildBatchPreview.plan.additions.every(b=>b.y>=4)).toBe(true);app.click(app.button('Apply preview'));expect(e.commitBuildBatch).toHaveBeenCalledTimes(1);
 });
 it('makes pattern and alignment searchable',()=>{expect(api.findWorkshopTools('repeat pattern',true).some(t=>t.id==='transform')).toBe(true);expect(api.findWorkshopTools('align grid',true).some(t=>t.id==='transform')).toBe(true);});
});
`);
console.log('Created transaction, graphics, and UI tests');
