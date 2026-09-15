const fs=require('node:fs'),vm=require('node:vm'),file='reports/geometry-world-preview-navigation-2026-09-12/browser.cjs';let s=fs.readFileSync(file,'utf8');
const marker="  }catch(error){result.failure=error.stack;";
if(s.split(marker).length!==2)throw Error('Browser end marker missing');
s=s.replace(marker,`  const lifecycle=await page.evaluate(async()=>{
    const e=__geoWorldEngine,api=StemLab.geometryWorldBuilderPure,frame=()=>new Promise(r=>requestAnimationFrame(r));
    function review(){const p=api.previewBuildStamp(e,api.architecturalStarters()[0],{x:30,y:1,z:30}),owner={};if(!p.ok)throw Error(p.reason);e.showBuildBatchPreview(p,owner);return api.installPreviewCamera(e,p,owner,api.capturePreviewCamera(e));}
    let c=review();await frame();const center=c.focus.clone().project(e.camera);c.zoom(2);await frame();const zoomed=c.focus.clone().project(e.camera),far=e.camera.far;
    for(let i=0;i<30;i++){c.scheduleFit();await frame();}
    const stableFar=Math.abs(e.camera.far-far)<1e-6,stableAnchor=Math.abs(center.x-zoomed.x)<1e-6&&Math.abs(center.y-zoomed.y)<1e-6;c.dispose(true);e.clearBuildBatchPreview();
    c=review();await frame();const next={...e._currentLesson,id:'preview-lifecycle-check',structures:[]};e.loadLesson(next);const position=e.camera.position.toArray();c.dispose(true);const loaded=e._currentLesson===next&&!e._previewReviewCamera&&JSON.stringify(e.camera.position.toArray())===JSON.stringify(position)&&e.renderer.domElement.style.touchAction!=='none';
    c=review();await frame();e.destroy();const destroyed=e._destroyed&&!e._previewReviewCamera;c.dispose(true);
    return {stableFar,stableAnchor,loaded,destroyed};
  });
  check('Repeated zoom and refit keep the clipping range finite and stable',lifecycle.stableFar);check('Zoom keeps the model anchored in the unobstructed screen area',lifecycle.stableAnchor);check('Loading a different lesson releases review controls without restoring a stale pose',lifecycle.loaded);check('Engine teardown releases preview camera ownership',lifecycle.destroyed);
`+marker);
new vm.Script(s);const b=Buffer.from(s),fd=fs.openSync(file,'r+');fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);fs.closeSync(fd);console.log('Browser validation includes zoom stability and real engine cleanup.');
