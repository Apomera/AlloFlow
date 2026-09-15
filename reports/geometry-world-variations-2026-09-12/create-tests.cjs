const fs=require('fs');
const fixture=fs.readFileSync('tests/geometry_world_workshop.test.js','utf8').split("describe('architectural starter recipes'")[0];
const tests=String.raw`
describe('design variations',()=>{
  it('copies current unsaved geometry while preserving the earlier saved draft and edit history',()=>{
    const f=selected(),e=f.engine,store=memoryStorage(),first=api.saveWorldDraft(e,'My pavilion',store).project;
    place(f,block(12));const before=snapshot(f),result=api.saveWorldCopy(e,'My pavilion',store);
    expect(result.ok).toBe(true);expect(snapshot(f)).toEqual(before);
    const projects=api.readWorldShelf(store).projects;expect(projects).toHaveLength(2);expect(projects.find(p=>p.id===first.id)).toEqual(first);
    expect(result.project.world.blocks).toHaveLength(3);expect(result.project.world.title).toBe('My pavilion · variation 2');
    expect(e._workshopProjectId).toBe(result.project.id);expect(api.saveWorldDraft(e,null,store).unchanged).toBe(true);
    place(f,block(13));api.saveWorldDraft(e,null,store);expect(api.readWorldShelf(store).projects.find(p=>p.id===first.id)).toEqual(first);
  });
  it('duplicates a saved project without changing the active project, and assigns bounded unique names',()=>{
    const f=selected(),e=f.engine,store=memoryStorage(),first=api.saveWorldDraft(e,'A'.repeat(80),store).project;
    const a=api.duplicateWorldProject(first.id,store),b=api.duplicateWorldProject(a.project.id,store);
    expect(a.ok&&b.ok).toBe(true);expect(a.project.world.title.length).toBeLessThanOrEqual(80);expect(b.project.world.title).toMatch(/variation 3$/);
    expect(e._workshopProjectId).toBe(first.id);expect(a.project.world.blocks).toEqual(first.world.blocks);expect(api.readWorldShelf(store).projects.find(p=>p.id===first.id)).toEqual(first);
  });
  it('keeps identity and previous storage intact on quota failures, corrupt storage, and a full shelf',()=>{
    const f=selected(),e=f.engine,store=memoryStorage();api.saveWorldDraft(e,'First',store);const id=e._workshopProjectId,version=e._workshopProjectVersion,raw=store.raw();
    expect(api.saveWorldCopy(e,null,{getItem:store.getItem,setItem(){throw Error('quota');}}).ok).toBe(false);expect(store.raw()).toBe(raw);expect(e._workshopProjectId).toBe(id);expect(e._workshopProjectVersion).toBe(version);
    const invalid=memoryStorage('{broken');expect(api.saveWorldCopy(e,null,invalid).ok).toBe(false);expect(invalid.raw()).toBe('{broken');
    for(let i=0;i<7;i++)expect(api.duplicateWorldProject(id,store).ok).toBe(true);const full=store.raw();expect(api.saveWorldCopy(e,null,store).ok).toBe(false);expect(api.duplicateWorldProject(id,store).ok).toBe(false);expect(store.raw()).toBe(full);expect(e._workshopProjectId).toBe(id);
  });
  it('allows a stale tab to preserve its edits as a variation without overwriting the newer saved project',()=>{
    const a=selected(),b=selected(),store=memoryStorage(),first=api.saveWorldDraft(a.engine,'Original',store).project;b.engine._workshopProjectId=first.id;b.engine._workshopProjectVersion=first.version;
    place(a,block(11));const newer=api.saveWorldDraft(a.engine,null,store).project;place(b,block(14));const copy=api.saveWorldCopy(b.engine,null,store);
    expect(copy.ok).toBe(true);expect(api.readWorldShelf(store).projects.find(p=>p.id===first.id)).toEqual(newer);expect(copy.project.world.blocks.some(b=>b.x===14)).toBe(true);expect(copy.project.world.blocks.some(b=>b.x===11)).toBe(false);
  });
  it('refuses empty copies, missing sources, and non-sandbox worlds',()=>{const f=makeFixture(),store=memoryStorage();expect(api.saveWorldCopy(f.engine,null,store).ok).toBe(false);expect(api.duplicateWorldProject('missing',store).ok).toBe(false);f.engine._currentLesson={sandbox:false};expect(api.saveWorldCopy(f.engine,null,store).ok).toBe(false);expect(store.raw()).toBeUndefined();});
});
describe('custom connecting bases',()=>{
  it('creates the requested footprint and thickness while preserving shape, appearance and relative height, with atomic undo/redo',()=>{
    const f=selected([block(0,4,0,'stone','halfA',2),block(3,7,0,'wood','quarter',1)]),e=f.engine,before=api.selectionEditSnapshot(e),plan=api.previewPrintPreparation(e,'base',{padding:2,thickness:3,material:'wood'});
    expect(plan.ok).toBe(true);expect(api.selectionEditSnapshot(e)).toEqual(before);for(let y=1;y<=3;y++)expect(plan.additions.filter(b=>b.y===y&&b.shape==='cube'&&b.type==='wood')).toHaveLength(40);
    expect(plan.additions.find(b=>b.shape==='halfA')).toMatchObject({x:0,y:4,z:0,type:'stone',rotation:2});expect(plan.additions.find(b=>b.shape==='quarter').y).toBe(7);
    expect(api.commitSelectionEdit(e,plan).ok).toBe(true);expect(e._undoStack).toHaveLength(1);e.undo();expect(api.selectionEditSnapshot(e)).toEqual(before);e.redo();expect(e._builderSelection.blocks).toHaveLength(plan.additions.length);
  });
  it('accepts a flush base and rejects incomplete, fractional, out-of-range or unsupported settings without mutation',()=>{
    const f=selected([block(0)]),before=snapshot(f);expect(api.previewPrintPreparation(f.engine,'base',{padding:0,thickness:1}).additions).toHaveLength(2);
    for(const options of [{padding:''},{padding:-1},{padding:1.5},{padding:5},{thickness:0},{thickness:''},{thickness:5},{material:'glass'}])expect(api.previewPrintPreparation(f.engine,'base',options).ok).toBe(false);
    expect(snapshot(f)).toEqual(before);
  });
  it('rechecks collisions and capacity for a custom base',()=>{
    const f=selected([block(0)]),plan=api.previewPrintPreparation(f.engine,'base',{padding:2,thickness:3});place(f,block(2,2,2));const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(false);expect(snapshot(f)).toEqual(before);
    const wide=selected([block(0),block(20,1,20)]);expect(api.previewPrintPreparation(wide.engine,'base',{padding:4,thickness:4}).ok).toBe(false);
  });
});
`;
fs.writeFileSync('tests/geometry_world_variations.test.js',fixture+tests);
const focusFixture=fs.readFileSync('tests/geometry_world_print_guide.test.js','utf8').split("describe('selected mesh print guide'")[0].replace("import {afterEach,beforeAll,beforeEach,describe,expect,it}","import {afterEach,beforeAll,beforeEach,describe,expect,it,vi}");
fs.writeFileSync('tests/geometry_world_print_focus.test.js',focusFixture+String.raw`
function context(e){e._builderSelection={blocks:cells(e),exact:true};e.camera=new THREE.PerspectiveCamera(60,.5,.1,2000);e.setViewPreset=vi.fn(()=>true);window.__geoWorldEngine=e;
  const ctx={toolData:{geometryWorld:{worldActive:true,builderPrintGuide:true,builderPrintContext:{unitMm:20}},printLab:{profile}},updateMulti(tool,patch){Object.assign(this.toolData[tool],patch);},announceToSR:vi.fn()};api.syncGeometryPrintGuide(e,ctx);return ctx;
}
function checked(e,ctx){const bundle=api.buildGeometryWorldStl(e,cells(e));ctx.toolData.geometryWorld.builderPrintCheck={...bundle.topology,contactGroups:bundle.contactGroups,selectionSignature:ctx.toolData.geometryWorld.builderPrintGuideSummary.selectionSignature};api.syncGeometryPrintGuide(e,ctx);}
describe('focused print inspection',()=>{
  it('frames a separate piece without changing selection, blocks, or undo history',()=>{
    const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0,shape:'halfB'}]),ctx=context(e);checked(e,ctx);const selection=e._builderSelection,history=e._undoStack,blocks=Object.values(e.blocks);
    const result=api.focusGeometryPrintIssue(ctx,'part',2);expect(result.ok).toBe(true);expect(result.blocks).toBe(1);expect(e._builderSelection).toBe(selection);expect(e._undoStack).toBe(history);expect(Object.values(e.blocks)).toEqual(blocks);expect(e.setViewPreset).toHaveBeenCalledWith('front',expect.objectContaining({x:3.5,y:4.25,z:.5}));expect(ctx.toolData.geometryWorld.sandboxDockCollapsed).toBe(true);
    api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide.getObjectByName('gwe-print-issue-focus')).toBeTruthy();
  });
  it('can inspect overflow while topology is pending and clears an obsolete highlight after rescaling',()=>{
    const e=fixture([{x:0,y:1,z:0},{x:3,y:1,z:0}]),ctx=context(e);expect(api.focusGeometryPrintIssue(ctx,'overflow').ok).toBe(true);api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide.children).toHaveLength(2);
    ctx.toolData.geometryWorld.builderPrintContext.unitMm=5;api.syncGeometryPrintGuide(e,ctx);expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(e._builderPrintGuide.children).toHaveLength(1);expect(api.focusGeometryPrintIssue(ctx,'overflow').ok).toBe(false);
  });
  it('refuses stale piece checks and disposes highlight resources when the selection changes',()=>{
    const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0}]),ctx=context(e);checked(e,ctx);api.focusGeometryPrintIssue(ctx,'part',2);api.syncGeometryPrintGuide(e,ctx);const focus=e._builderPrintGuide.getObjectByName('gwe-print-issue-focus'),geometry=vi.spyOn(focus.geometry,'dispose'),material=vi.spyOn(focus.material,'dispose');
    e._builderSelection={blocks:[cells(e)[0]],exact:true};expect(api.focusGeometryPrintIssue(ctx,'part',2).ok).toBe(false);api.syncGeometryPrintGuide(e,ctx);expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(geometry).toHaveBeenCalledOnce();expect(material).toHaveBeenCalledOnce();
  });
  it('clears focus on a new lesson even when its block signature is identical',()=>{const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0}]),ctx=context(e);checked(e,ctx);api.focusGeometryPrintIssue(ctx,'part',2);api.syncGeometryPrintGuide(e,ctx);e._currentLesson={sandbox:true};api.syncGeometryPrintGuide(e,ctx);expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(e._builderPrintGuide.children).toHaveLength(1);});
  it('hides the guide behind Home and clears all inspection state when switched off',()=>{const e=fixture([{x:0,y:1,z:0},{x:3,y:4,z:0}]),ctx=context(e);checked(e,ctx);api.focusGeometryPrintIssue(ctx,'part',2);api.syncGeometryPrintGuide(e,ctx);ctx.toolData.geometryWorld.showGeometryHome=true;api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide.visible).toBe(false);ctx.toolData.geometryWorld.builderPrintGuide=false;api.syncGeometryPrintGuide(e,ctx);expect(e._builderPrintGuide).toBeNull();expect(ctx.toolData.geometryWorld.builderPrintFocus).toBeNull();expect(ctx.toolData.geometryWorld.builderPrintGuideSummary).toBeNull();});
});
`);
console.log('Created variation, custom-base, and print-focus behavior tests.');
