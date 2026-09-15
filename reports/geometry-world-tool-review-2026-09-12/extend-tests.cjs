const fs=require('fs');const file='tests/geometry_world_tool_review.test.js';let source=fs.readFileSync(file,'utf8');source+=String.raw`
describe('review navigation recovery',()=>{
  it('opening Build tools exits the world review and keeps exactly one Apply action',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));app.click(app.button('Review in world'));app.click(app.host.querySelector('.gwe-collapse'));
    expect(app.host.querySelector('.gwe-preview-review')).toBeNull();expect([...app.host.querySelectorAll('button')].filter(b=>b.textContent==='Apply preview')).toHaveLength(1);expect(app.state().sandboxDockCollapsed).toBe(false);expect(e.commitBuildBatch).not.toHaveBeenCalled();
  });
  it('looks across the broad side of a long depth-oriented proposal',()=>{
    const app=fixture.mount(),e=previewBridge(app);e.setViewPreset=vi.fn();app.click(app.button('Preview change'));const overlay=e._buildBatchPreview,plan={...overlay.plan,additions:[{x:0,y:1,z:0},{x:0,y:1,z:7}]};expect(api.frameBuildPreview(app.ctx(),plan,overlay.owner).ok).toBe(true);expect(e.setViewPreset).toHaveBeenCalledWith('front',expect.objectContaining({x:.5,z:4}));
  });
});
`;const fd=fs.openSync(file,'r+');fs.writeSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));fs.closeSync(fd);console.log('Added review navigation and directional framing checks.');
