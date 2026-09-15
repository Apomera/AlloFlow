const fs=require('node:fs'),assert=require('node:assert/strict');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n',s=fn(raw.replace(/\r\n/g,'\n')),bytes=Buffer.from(s.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}}
edit('stem_lab/stem_tool_geometryworld_builder.js',s=>{const comment="  // Rotate about the selection's grid-aligned footprint and keep its minimum\n  // corner fixed. Odd/even footprints remain integral without rounding cells.\n";assert(s.includes(comment));return s.replace(comment,'').replace('  function transformCreationBlocks(',comment+'  function transformCreationBlocks(');});
edit('tests/geometry_world_selection_editing.test.js',s=>s+`
describe('clear-position duplicate suggestions',()=>{
  it('uses the whole footprint, preserves the source during preview, and duplicates in one Undo',()=>{
    const f=selected([block(0),block(1),block(2)]),before=snapshot(f),plan=api.suggestCreationDuplicate(f.engine);
    expect(plan.ok).toBe(true);expect(plan.suggestedOffset).toEqual({x:4,y:0,z:0});expect(snapshot(f)).toEqual(before);
    expect(api.commitSelectionEdit(f.engine,plan).ok).toBe(true);expect(f.engine._undoStack).toHaveLength(1);expect(Object.keys(f.engine.blocks)).toHaveLength(6);
    expect(f.engine.undo()).toBe(true);expect(api.selectionEditSnapshot(f.engine).blocks).toEqual([block(0),block(1),block(2)]);expect(Object.keys(f.engine.blocks)).toHaveLength(3);
  });
  it('tries the opposite side when the first full-copy destination is occupied',()=>{
    const f=selected([block(0),block(1),block(2)]);place(f,block(4));const before=snapshot(f),plan=api.suggestCreationDuplicate(f.engine,'x');
    expect(plan.suggestedOffset).toEqual({x:-4,y:0,z:0});expect(snapshot(f)).toEqual(before);
  });
  it('tries another axis when both X sides are occupied',()=>{
    const f=selected([block(0)]);place(f,block(2));place(f,block(-2));place(f,block(0,1,2));
    expect(api.suggestCreationDuplicate(f.engine).suggestedOffset).toEqual({x:0,y:0,z:-2});
  });
  it('stacks fractional shapes on the next grid layer and retains rotations',()=>{
    const f=selected([block(0,1,0,'stone','quarter',3)]),plan=api.suggestCreationDuplicate(f.engine,'y');
    expect(plan.suggestedOffset).toEqual({x:0,y:1,z:0});expect(plan.additions).toEqual([block(0,2,0,'stone','quarter',3)]);
  });
  it('chooses the inward side at the sandbox edge',()=>{const f=selected([block(64)]);expect(api.suggestCreationDuplicate(f.engine,'x').suggestedOffset).toEqual({x:-2,y:0,z:0});});
  it('reports the actual block limit without mutating a full world',()=>{const f=selected([block(0)]);f.engine.getConstructionBlockCount=()=>1500;const before=snapshot(f);expect(api.suggestCreationDuplicate(f.engine).code).toBe('block_limit');expect(snapshot(f)).toEqual(before);});
  it('leaves an enclosed creation unchanged when all adjacent positions are blocked',()=>{
    const f=selected([block(0)]);[block(2),block(-2),block(0,1,2),block(0,1,-2),block(0,2)].forEach(b=>place(f,b));const before=snapshot(f);
    expect(api.suggestCreationDuplicate(f.engine).ok).toBe(false);expect(snapshot(f)).toEqual(before);
  });
  it('rechecks a suggested destination before Apply',()=>{const f=selected([block(0)]),plan=api.suggestCreationDuplicate(f.engine);place(f,block(2));const before=snapshot(f);expect(api.commitSelectionEdit(f.engine,plan).code).toBe('occupied');expect(snapshot(f)).toEqual(before);});
});
`);
edit('tests/geometry_world_selection_editor_ui.test.js',s=>{
  const old="expect(app.host.querySelector('#gwe-stamp-choice').selectedOptions[0].textContent).toContain('Garden arch');";
  assert.equal(s.split(old).length,2);s=s.replace(old,"openStampLibrary(app);expect(app.host.querySelector('.gwe-stamp-card[aria-pressed=true]').textContent).toContain('Garden arch');");
  return s+`
function openStampLibrary(app){React.act(()=>{const d=app.host.querySelector('.gwe-stamp-library');d.open=true;d.dispatchEvent(new Event('toggle'));});}
function saveStamp(app,name){draft(app.host.querySelector('#gwe-stamp-name'),name);React.act(()=>app.host.querySelector('.gwe-stamp-save').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
function selectDuplicate(app){React.act(()=>{const input=app.host.querySelector('#gwe-creation-edit-action');input.value='duplicate';input.dispatchEvent(new Event('change',{bubbles:true}));});}
describe('visual stamps and easy duplicate placement',()=>{
  it('loads shape illustrations only when the stamp library is open',()=>{const app=fixture.mount();previewBridge(app);saveStamp(app,'Stone step');expect(app.host.querySelectorAll('.gwe-stamp-card img')).toHaveLength(0);openStampLibrary(app);const card=app.host.querySelector('.gwe-stamp-card');expect(card.getAttribute('aria-pressed')).toBe('true');expect(card.textContent).toContain('2 blocks');expect(card.textContent).toContain('2 wide · 1 deep · 1 high');expect(decodeURIComponent(card.querySelector('img').src)).toContain('<polygon');});
  it('picking a visual card changes the recipe and cancels a prior preview without placing blocks',()=>{const app=fixture.mount(),e=previewBridge(app);openStampLibrary(app);saveStamp(app,'Stone step');app.select('b');saveStamp(app,'Wood tower');expect(app.host.querySelectorAll('.gwe-stamp-card')).toHaveLength(2);app.click(app.button('Preview stamp'));const card=app.host.querySelector('[aria-label="Use stamp Stone step"]');app.click(card);expect(card.getAttribute('aria-pressed')).toBe('true');expect(app.host.querySelector('[aria-label="Use stamp Wood tower"]').getAttribute('aria-pressed')).toBe('false');expect(app.button('Apply preview')).toBeUndefined();expect(e.commitBuildBatch).not.toHaveBeenCalled();});
  it('suggests a full-width duplicate offset without committing or automatically applying a preview',()=>{const app=fixture.mount(),e=previewBridge(app);selectDuplicate(app);expect(app.host.querySelector('#gwe-creation-offset-x').value).toBe('3');expect(app.button('Apply preview')).toBeUndefined();expect(e.commitBuildBatch).not.toHaveBeenCalled();expect(app.host.textContent).toContain('A clear position is suggested');});
  it('offers a stack preview with one click while keeping Apply explicit',()=>{const app=fixture.mount(),e=previewBridge(app);selectDuplicate(app);app.click(app.button('Stack above'));expect(['x','y','z'].map(a=>app.host.querySelector('#gwe-creation-offset-'+a).value)).toEqual(['0','1','0']);expect(app.button('Apply preview').disabled).toBe(false);expect(e.commitBuildBatch).not.toHaveBeenCalled();});
  it('saving a different stamp clears the previous placement proposal',()=>{const app=fixture.mount();previewBridge(app);saveStamp(app,'First');app.click(app.button('Preview stamp'));expect(app.button('Apply preview')).toBeTruthy();saveStamp(app,'Second');expect(app.button('Apply preview')).toBeUndefined();});
});
`;});
console.log('Added duplicate transaction and mounted stamp-gallery regressions.');
