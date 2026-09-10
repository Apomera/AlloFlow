const fs=require('node:fs'),path='tests/geometry_world_showcase_composition.test.js';
let source=fs.readFileSync(path,'utf8');
if(source.includes('Showcase deferred fitting during image encoding'))throw new Error('Pending-fit tests already installed');
source+=`
function controlledImageSave(){
  let resolve,reject;const encoding=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const source=readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'),start=source.indexOf('  function saveShowcaseImage(ctx)'),end=source.indexOf('  function measureSelectedBuild(ctx)',start);
  if(start<0 || end<start)throw new Error('Production save-image boundaries not found');
  // The renderer/encoder is covered separately. Here only its pending promise
  // is controlled; the production completion and session scheduler execute.
  const save=new Function('ENGINE_KEY','captureShowcaseImage','patchGeometryState','downloadBlob','announce','scheduleShowcaseLayoutFit',source.slice(start,end)+';return saveShowcaseImage;')('__geoWorldEngine',()=>encoding,(ctx,patch)=>ctx.updateMulti('geometryWorld',patch),vi.fn(),vi.fn(),api.scheduleLayoutFitForTest);
  return {save,resolve:()=>resolve({blob:new Blob(['png']),width:2048,height:1200}),reject:()=>reject(new Error('Encoder refused'))};
}
describe('Showcase deferred fitting during image encoding',()=>{
  it('coalesces pending view and resize requests into one fit after the image finishes',async()=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);const original=cameraState(engine.camera),encoding=controlledImageSave(),saving=encoding.save(app.ctx);
    engine.setShowcaseView('side');expect(engine._showcase.fitPending).toBe(true);expect(cameraState(engine.camera)).toEqual(original);
    app.canvas.getBoundingClientRect=()=>rect(7,60,306,628);app.captionNode.getBoundingClientRect=()=>rect(20,20,225,128);app.toolsNode.getBoundingClientRect=()=>rect(10,556,300,132);engine.camera.aspect=306/628;engine.camera.updateProjectionMatrix();
    expect(engine.fitShowcase()).toBe(false);expect(engine._showcase.composition.canvasRect.width).toBe(822);
    const fit=vi.spyOn(engine,'fitShowcase');encoding.resolve();expect(await saving).toBe(true);expect(engine._showcaseExporting).toBe(false);expect(frameCallbacks.size).toBe(1);expect(fit).not.toHaveBeenCalled();
    flushFrame();expect(fit).toHaveBeenCalledTimes(1);expect(engine._showcase.fitPending).toBe(false);expect(engine._showcase.composition.view).toBe('side');expect(engine._showcase.composition.canvasRect).toMatchObject({width:306,height:628});assertFramed(engine.camera,engine._showcase.composition.bounds,engine._showcase.composition.rect);
    expect(engine.camera.position.clone().sub(engine._showcase.composition.target).normalize().distanceTo(new THREE.Vector3(1,0,0))).toBeLessThan(1e-8);
  });
  it('applies a pending view after an encoder failure and clears busy state',async()=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);const encoding=controlledImageSave(),saving=encoding.save(app.ctx);engine.setShowcaseView('top');encoding.reject();expect(await saving).toBe(false);expect(engine._showcaseExporting).toBe(false);expect(frameCallbacks.size).toBe(1);flushFrame();expect(engine._showcase.fitPending).toBe(false);expect(engine._showcase.composition.view).toBe('top');expect(engine.camera.up.toArray()).toEqual([0,0,-1]);assertFramed(engine.camera,engine._showcase.composition.bounds,engine._showcase.composition.rect);
  });
  it.each(['before completion','after completion'])('does not move the restored building camera when Showcase exits %s',async when=>{
    const app=fixture(),{engine}=app,original=cameraState(engine.camera);api.showcaseBuildForTest(app.ctx);const encoding=controlledImageSave(),saving=encoding.save(app.ctx);engine.setShowcaseView('top');
    if(when==='before completion'){engine.endShowcase();encoding.resolve();await saving;}else{encoding.resolve();await saving;expect(frameCallbacks.size).toBe(1);engine.endShowcase();}
    expect(frameCallbacks.size).toBe(0);flushFrame();expect(engine._showcase).toBeNull();expect(cameraState(engine.camera)).toEqual(original);expect(engine._showcaseExporting).toBe(false);
  });
  it.each(['replaced','destroyed'])('never schedules camera work for an engine that was %s during encoding',async condition=>{
    const app=fixture(),{engine}=app;api.showcaseBuildForTest(app.ctx);const encoding=controlledImageSave(),saving=encoding.save(app.ctx);engine.setShowcaseView('side');const pose=cameraState(engine.camera);
    if(condition==='replaced')window.__geoWorldEngine={};else engine._destroyed=true;
    encoding.resolve();await saving;expect(frameCallbacks.size).toBe(0);flushFrame();expect(cameraState(engine.camera)).toEqual(pose);expect(engine._showcaseExporting).toBe(false);
  });
});
`;
const fd=fs.openSync(path,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
console.log('Installed six production save-completion camera lifecycle regressions.');
