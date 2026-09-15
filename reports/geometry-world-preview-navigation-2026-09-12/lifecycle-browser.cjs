const fs=require('node:fs');let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false,tutorialDismissed:true});');
const run=async function(){
 const result={assertions:[],errors:[]};await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1200,height:800}});page.on('pageerror',e=>result.errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:60000});await page.waitForFunction(()=>!!window.__geoWorldEngine);await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._currentLesson.sandbox&&!document.querySelector('.gwe-home'));
  const checks=await page.evaluate(async()=>{
    const e=__geoWorldEngine,api=StemLab.geometryWorldBuilderPure,frame=()=>new Promise(r=>requestAnimationFrame(r));
    // A real preview/transaction with an asymmetric control obstacle.
    const card=document.createElement('section');card.className='gwe-preview-review';Object.assign(card.style,{position:'absolute',left:'12px',top:'70px',width:'290px',height:'320px'});e.renderer.domElement.closest('#geoworld-fs-workspace').append(card);
    function review(){const p=api.previewBuildStamp(e,api.architecturalStarters()[0],{x:30,y:1,z:30}),owner={};if(!p.ok)throw Error(p.reason);e.showBuildBatchPreview(p,owner);return api.installPreviewCamera(e,p,owner,api.capturePreviewCamera(e));}
    let c=review();await frame();const center=c.focus.clone().project(e.camera);c.zoom(2);await frame();const zoomed=c.focus.clone().project(e.camera),far=e.camera.far;
    for(let i=0;i<30;i++){c.scheduleFit();await frame();}
    const stableFar=Number.isFinite(far)&&Math.abs(e.camera.far-far)<1e-6,stableAnchor=Math.abs(center.x-zoomed.x)<1e-6&&Math.abs(center.y-zoomed.y)<1e-6;c.dispose(true);e.clearBuildBatchPreview();
    const originalTouch=e.renderer.domElement.style.touchAction;c=review();await frame();const next={...e._currentLesson,id:'preview-lifecycle-check',structures:[]};e.loadLesson(next);const position=e.camera.position.toArray();c.dispose(true);const loaded=e._currentLesson===next&&!e._previewReviewCamera&&JSON.stringify(e.camera.position.toArray())===JSON.stringify(position)&&e.renderer.domElement.style.touchAction===originalTouch;
    c=review();await frame();window.__root.unmount();await frame();const destroyed=e._destroyed&&!e._previewReviewCamera;c.dispose(true);
    return {stableFar,stableAnchor,loaded,destroyed};
  });
  for(const [key,name] of [['stableFar','Repeated zoom and refit keep the clipping range finite and stable'],['stableAnchor','Zoom keeps the model anchored in the unobstructed screen area'],['loaded','Loading a different lesson releases review controls without restoring a stale pose'],['destroyed','Unmounting Geometry World releases preview camera ownership']])result.assertions.push({name,pass:!!checks[key]});
 }catch(error){result.failure=error.stack;}
 finally{fs.writeFileSync(path.join(out,'lifecycle-browser.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();await new Promise(r=>server.close(r));if(result.failure||result.errors.length||result.assertions.some(a=>!a.pass))process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
