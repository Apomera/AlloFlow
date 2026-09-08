// Real WebGL allocation verification; uses a tiny scene and Battery saver mode.
const fs = require('node:fs');
let harness = fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs', 'utf8').split('const results =')[0];
harness = harness.replace('__mount({_introShownOnce:true})', '__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false})');
harness += String.raw`
(async () => {
  const results = {scope:'Actual Three r128/WebGL geometry allocations at 640×480, DPR 1, Battery saver; six repeated 43-block lessons',errors:[]};
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport:{width:640,height:480},deviceScaleFactor:1});
  page.on('pageerror', error => results.errors.push(error.message));
  try {
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => !!window.__geoWorldEngine && __geoWorldEngine.renderer.info.programs.length > 0,{}, {timeout:120000});
    results.cycles = await page.evaluate(() => {
      const en = __geoWorldEngine;
      const fixture = {title:'GPU lifecycle verification',ground:{xMin:-2,xMax:2,zMin:-2,zMax:2,y:0,type:'grass'},
        structures:[{type:'fill',x1:-1,x2:1,y1:1,y2:2,z1:-1,z2:1,block:'brick'}],npcs:[],spawnPoint:[6,5,8],objectives:[]};
      en._ambientMotionEnabled = false;
      en.applyRenderQuality('saver');
      const counts = [];
      for(let cycle=0;cycle<6;cycle++) {
        en.loadLesson(fixture);
        en._entryAnim = null;en.flyMode=true;en.velocity.set(0,0,0);
        en.camera.position.set(6,5,8);en.camera.lookAt(0.5,1,0.5);en.camera.updateMatrixWorld(true);
        en.renderer.setRenderTarget(null);
        en.renderer.render(en.scene,en.camera);
        en.renderer.render(en.scene,en.camera);
        counts.push({cycle,blocks:Object.keys(en.blocks).length,geometries:en.renderer.info.memory.geometries,
          textures:en.renderer.info.memory.textures,landscapeMeshes:en._landscape.children.length});
      }
      window.__gpuFixture=fixture;
      return {counts,renderQuality:en._renderProfile.tier,dpr:en.renderer.getPixelRatio(),
        pass:counts.every(c=>c.blocks===43&&c.geometries===counts[0].geometries&&c.landscapeMeshes===4)};
    });
    results.removal = await page.evaluate(() => {
      const en = __geoWorldEngine;
      const events = window.__edgeLifecycleEvents = {sharedMaterialDisposes:{},removedGeometryDisposes:0,remainingGeometryDisposes:0,remainingGeometryExpected:0};
      Object.entries(en._edgeMatCache).forEach(([key,material]) => { events.sharedMaterialDisposes[key]=0;material.addEventListener('dispose',()=>events.sharedMaterialDisposes[key]++); });
      const block = en.blocks['0,1,0'];
      block.traverse(part=>{if(part.geometry)part.geometry.addEventListener('dispose',()=>events.removedGeometryDisposes++);});
      en.removeBlock(0,1,0,true);
      Object.values(en.blocks).forEach(mesh=>mesh.traverse(part=>{if(part.geometry){events.remainingGeometryExpected++;part.geometry.addEventListener('dispose',()=>events.remainingGeometryDisposes++);}}));
      en._landscape.children.forEach(mesh=>{events.remainingGeometryExpected++;mesh.geometry.addEventListener('dispose',()=>events.remainingGeometryDisposes++);});
      return {removedGeometryDisposes:events.removedGeometryDisposes,sharedMaterialDisposes:{...events.sharedMaterialDisposes},
        remainingGeometryExpected:events.remainingGeometryExpected,
        pass:events.removedGeometryDisposes===2 && Object.keys(events.sharedMaterialDisposes).length>=2 && Object.values(events.sharedMaterialDisposes).every(count=>count===0)};
    });
    results.teardown = await page.evaluate(() => {
      __root.unmount();
      const events=window.__edgeLifecycleEvents;
      return {engineGone:!window.__geoWorldEngine,canvasGone:!document.querySelector('#geoworld-fs-wrap canvas'),events,
        pass:!window.__geoWorldEngine && events.remainingGeometryDisposes===events.remainingGeometryExpected && Object.values(events.sharedMaterialDisposes).every(count=>count===1)};
    });
    results.pass=!results.errors.length&&results.cycles.pass&&results.removal.pass&&results.teardown.pass;
  } catch(error) {results.failure=error.stack;results.pass=false;}
  finally {
    fs.writeFileSync(path.join(out,'gpu-lifecycle-results.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
    await browser.close();await new Promise(resolve=>server.close(resolve));
    if(!results.pass)process.exitCode=1;
  }
})();
`;
eval(harness);
