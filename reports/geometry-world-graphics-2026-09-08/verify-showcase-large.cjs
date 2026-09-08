const fs=require('node:fs');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+='('+(async function(){
  const assert=require('node:assert/strict'),results={scope:'Actual WebGL, portrait viewport, real Select build and Showcase controls',errors:[]};
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(45000);page.on('pageerror',e=>results.errors.push(e.message));
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
    await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.waitForFunction(()=>!!window.__geoWorldEngine?._currentLesson?.sandbox);
    results.fixture=await page.evaluate(()=>{
      const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e._ambientMotionEnabled=false;
      for(let x=-64;x<=64;x++)e.placeBlock(x,1,0,x%8===0?'brick':'stone','cube',0);
      e.refreshAllAO();e.applyRenderQuality('balanced');__ctx.updateMulti('geometryWorld',{renderQuality:'balanced',autoCycle:false,sandboxDockCollapsed:false});
      __aimAt(0,1,0);e.camera.updateMatrixWorld(true);
      return {studentBlocks:Object.values(e.blocks).filter(m=>!m.userData._lessonBlock).length};
    });
    assert.equal(results.fixture.studentBlocks,129);
    await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
    await page.getByRole('button',{name:'Showcase creation',exact:true}).waitFor();
    results.before=await page.evaluate(()=>({far:__geoWorldEngine.camera.far,fog:{near:__geoWorldEngine.scene.fog.near,far:__geoWorldEngine.scene.fog.far}}));
    await page.getByRole('button',{name:'Showcase creation',exact:true}).evaluate(button=>button.addEventListener('click',()=>{const e=__geoWorldEngine;e._touchControlsEnabled=true;e._touchLookId=71;e._touchLookStart={x:250,y:300};e._touchMoveId=72;e._touchMoveStart={x:80,y:300};e._touchMoveVec={x:.4,z:.7};},{once:true,capture:true}));
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();
    await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor();
    await page.waitForFunction(()=>{const e=__geoWorldEngine,c=e.renderer.domElement;return Math.abs(e.camera.aspect-c.clientWidth/c.clientHeight)<.02;},{},{timeout:20000});
    await page.waitForTimeout(700);
    results.touchHandler=await page.evaluate(()=>{
      const e=__geoWorldEngine,canvas=e.renderer.domElement,before=e.camera.quaternion.toArray();
      const cleared={lookId:e._touchLookId,lookStart:e._touchLookStart,moveId:e._touchMoveId,moveStart:e._touchMoveStart,vector:e._touchMoveVec};
      const touch=new Touch({identifier:71,target:canvas,clientX:310,clientY:340,pageX:310,pageY:340,screenX:310,screenY:340});
      canvas.dispatchEvent(new TouchEvent('touchmove',{touches:[touch],targetTouches:[touch],changedTouches:[touch],bubbles:true,cancelable:true}));
      return {level:'Real canvas handler with a synthetic stale-touch payload',cleared,before,after:e.camera.quaternion.toArray()};
    });
    assert.deepEqual(results.touchHandler.cleared,{lookId:null,lookStart:null,moveId:null,moveStart:null,vector:{x:0,z:0}});
    assert.deepEqual(results.touchHandler.after,results.touchHandler.before,'A stale touch cannot rotate the Showcase camera');
    results.frame=await page.evaluate(()=>{
      const e=__geoWorldEngine;e.camera.updateMatrixWorld(true);const extrema={x:[Infinity,-Infinity],y:[Infinity,-Infinity],z:[Infinity,-Infinity]},distances=[];
      e._builderSelection.blocks.forEach(p=>{const mesh=e.blocks[[p.x,p.y,p.z].join(',')];mesh.updateMatrixWorld(true);const points=mesh.geometry.attributes.position;for(let i=0;i<points.count;i++){
        const world=new THREE.Vector3().fromBufferAttribute(points,i).applyMatrix4(mesh.matrixWorld);distances.push(world.distanceTo(e.camera.position));const ndc=world.project(e.camera);['x','y','z'].forEach(k=>{extrema[k][0]=Math.min(extrema[k][0],ndc[k]);extrema[k][1]=Math.max(extrema[k][1],ndc[k]);});
      }});
      return {selectedBlocks:e._builderSelection.blocks.length,vertices:distances.length,extrema,maxVertexDistance:Math.max(...distances),far:e.camera.far,fog:{near:e.scene.fog.near,far:e.scene.fog.far},profile:e._renderProfile.tier,aspect:e.camera.aspect};
    });
    assert.equal(results.frame.selectedBlocks,129);
    assert.ok(results.frame.far>results.before.far,'The view expands depth range for long creations');
    assert.ok(results.frame.extrema.z[0]>-1&&results.frame.extrema.z[1]<1,'Every model vertex remains inside near/far clipping planes');
    assert.ok(results.frame.extrema.x.every(n=>Math.abs(n)<.94)&&results.frame.extrema.y.every(n=>Math.abs(n)<.94),'The long row fits the portrait frame');
    assert.ok(results.frame.maxVertexDistance<results.frame.fog.near,'Every model vertex stays ahead of fog');
    await page.screenshot({path:path.join(out,'showcase-large-phone.png')});
    await page.getByRole('button',{name:'Back to building',exact:true}).click();
    await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor({state:'hidden'});
    results.restored=await page.evaluate(()=>({far:__geoWorldEngine.camera.far,fog:{near:__geoWorldEngine.scene.fog.near,far:__geoWorldEngine.scene.fog.far}}));
    assert.deepEqual(results.restored,results.before,'Closing restores the original camera depth and fog');
    assert.equal(results.errors.length,0);results.passed=true;
  }catch(error){results.passed=false;results.failure=error.stack;process.exitCode=1;}
  finally{
    const p=path.join(out,'showcase-large-results.json'),s=JSON.stringify(results,null,2);if(fs.existsSync(p)){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}else fs.writeFileSync(p,s);
    console.log(s);await browser.close();await new Promise(r=>server.close(r));
  }
}).toString()+')();';
eval(harness);
