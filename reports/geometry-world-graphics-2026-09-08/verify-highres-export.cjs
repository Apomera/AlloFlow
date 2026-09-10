const fs=require('node:fs');
const previous=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-showcase.cjs','utf8');
const fixtureBody=previous.match(/results\.checks\.fixture = await page\.evaluate\(\(\) => \{([\s\S]*?)\n    \}\);\n    await page\.waitForTimeout\(800\);/)[1];
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+='('+(async function(){
 const assert=require('node:assert/strict'),results={scope:'Native high-resolution Showcase PNG in real WebGL, both raw and composer pipelines',errors:[],consoleErrors:[],checks:{exports:[]}};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1180,height:860},deviceScaleFactor:1.25,acceptDownloads:true});page.setDefaultTimeout(90000);
 page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
 async function state(){return page.evaluate(()=>{
   const e=__geoWorldEngine,r=e.renderer,c=e.composer,cam=e.camera;
   return {size:r.getSize(new THREE.Vector2()).toArray(),ratio:r.getPixelRatio(),drawing:r.getDrawingBufferSize(new THREE.Vector2()).toArray(),viewport:r.getViewport(new THREE.Vector4()).toArray(),scissor:r.getScissor(new THREE.Vector4()).toArray(),scissorTest:r.getScissorTest(),target:r.getRenderTarget()?.uuid||null,autoClear:r.autoClear,clear:[...r.getClearColor(new THREE.Color()).toArray(),r.getClearAlpha()],xr:r.xr.enabled,composer:c?{width:c._width,height:c._height,ratio:c._pixelRatio,target1:[c.renderTarget1.width,c.renderTarget1.height],target2:[c.renderTarget2.width,c.renderTarget2.height]}:null,
     camera:{position:cam.position.toArray(),quaternion:cam.quaternion.toArray(),up:cam.up.toArray(),fov:cam.fov,aspect:cam.aspect,far:cam.far},look:e._showcase?.look,view:e._showcase?.view,fog:[e.scene.fog.near,e.scene.fog.far],postFx:e._postFxEnabled};
 });}
 async function geometry(){return page.evaluate(async()=>{const e=__geoWorldEngine,b=StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,e._builderSelection.blocks,{title:'High-resolution export invariant'}),hash=await crypto.subtle.digest('SHA-256',b.buffer);return {hash:Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join(''),triangles:b.triangleCount,selected:e._builderSelection.blocks.length,blocks:JSON.stringify(Object.keys(e.blocks).sort().map(k=>[k,e.blocks[k].userData.shape,e.blocks[k].userData.rotation,e.blocks[k].userData.blockType,e.blocks[k].position.toArray(),e.blocks[k].scale.toArray()])),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),selection:JSON.stringify(e._builderSelection.blocks)};});}
 function writeFile(p,bytes){if(fs.existsSync(p)){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);fs.closeSync(fd);}else fs.writeFileSync(p,bytes);}
 try{
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
   await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._currentLesson?.sandbox===true);
   await page.evaluate(new Function(fixtureBody));await page.waitForFunction(()=>!!__geoWorldEngine.composer,{},{timeout:90000});
   await page.evaluate(()=>{const e=__geoWorldEngine;e.applyRenderQuality('balanced');__ctx.updateMulti('geometryWorld',{renderQuality:'balanced'});__aimAt(-2,1,2);e.camera.updateMatrixWorld(true);});
   await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();await page.getByRole('button',{name:'Showcase creation',exact:true}).waitFor();
   await page.evaluate(()=>{const e=__geoWorldEngine;e.flyMode=true;e.camera.fov=75;e.camera.position.set(7,6,11);e.camera.lookAt(0,2,2);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateProjectionMatrix();});
   const originalGeometry=await geometry();results.checks.fixture={hash:originalGeometry.hash,selected:originalGeometry.selected,triangles:originalGeometry.triangles};
   await page.getByRole('button',{name:'Showcase creation',exact:true}).click();
   await page.evaluate(()=>{
     const e=__geoWorldEngine,r=e.renderer,canvas=r.domElement,native=canvas.toBlob;window.__exportCaptures=[];
     canvas.toBlob=function(callback,type){const c=e.composer;__exportCaptures.push({canvas:[canvas.width,canvas.height],logical:r.getSize(new THREE.Vector2()).toArray(),ratio:r.getPixelRatio(),composer:c&&e._postFxEnabled!==false?[c._width,c._height,c._pixelRatio]:null,busy:__toolData.geometryWorld.showcaseSaving,camera:JSON.stringify({position:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),fov:e.camera.fov,aspect:e.camera.aspect})});return native.call(this,callback,type);};
   });
   for(const config of[{width:1180,height:860,look:'Meadow',postFx:false,file:'showcase-hires-desktop.png'},{width:390,height:844,look:'Studio',postFx:true,file:'showcase-hires-phone.png'}]){
     await page.setViewportSize({width:config.width,height:config.height});await page.waitForFunction(()=>{const e=__geoWorldEngine,c=e.renderer.domElement;return Math.abs(e.camera.aspect-c.clientWidth/c.clientHeight)<.001;});
     await page.getByRole('button',{name:config.look,exact:true}).click();await page.evaluate(value=>{__geoWorldEngine._postFxEnabled=value;},config.postFx);
     await page.waitForTimeout(300);const before=await state();
     const downloadEvent=page.waitForEvent('download',{timeout:120000});await page.getByRole('button',{name:'Save image',exact:true}).click();const download=await downloadEvent;
     await page.waitForFunction(()=>!__geoWorldEngine._showcaseExporting);const after=await state();assert.deepEqual(after,before,'Export restores exact renderer/composer and camera state');
     const bytes=fs.readFileSync(await download.path());assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);assert.equal(Math.max(width,height),2048);assert.ok(bytes.length>10000);
     assert.ok(Math.abs(width/height-before.size[0]/before.size[1])<.002);writeFile(path.join(out,config.file),bytes);
     const observed=await page.evaluate(()=>__exportCaptures.at(-1));assert.deepEqual(observed.canvas,[width,height]);assert.deepEqual(observed.logical,[width,height]);assert.equal(observed.ratio,1);assert.equal(observed.busy,true);
     if(config.postFx)assert.deepEqual(observed.composer,[width,height,1]);
     const pixels=await page.evaluate(async file=>{const img=new Image();img.src='/reports/geometry-world-graphics-2026-09-08/'+file;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const data=x.getImageData(0,0,c.width,c.height).data,colors=new Set();let opaque=0;for(let i=0;i<data.length;i+=4*257){colors.add([data[i]>>4,data[i+1]>>4,data[i+2]>>4].join(','));if(data[i+3]===255)opaque++;}return {colors:colors.size,opaqueSamples:opaque};},config.file);
     assert.ok(pixels.colors>30&&pixels.opaqueSamples>100);assert.deepEqual(await geometry(),originalGeometry);
     results.checks.exports.push({viewport:[config.width,config.height],look:config.look,postFx:config.postFx,width,height,bytes:bytes.length,originalDrawing:before.drawing,restored:true,observed,pixels});
   }
   const failureBefore=await state();await page.evaluate(()=>{const r=__geoWorldEngine.renderer,render=r.render;window.__originalExportRender=render;let pending=true;r.render=function(){const s=r.getDrawingBufferSize(new THREE.Vector2());if(pending&&Math.max(s.x,s.y)>=1600){pending=false;throw new Error('Injected capture render failure');}return render.apply(this,arguments);};});
   await page.getByRole('button',{name:'Save image',exact:true}).click();await page.waitForFunction(()=>!__geoWorldEngine._showcaseExporting);await page.evaluate(()=>{__geoWorldEngine.renderer.render=__originalExportRender;delete window.__originalExportRender;});
   assert.deepEqual(await state(),failureBefore);assert.deepEqual(await geometry(),originalGeometry);results.checks.actualRenderFailureRestored=true;
   results.checks.failureToast=await page.evaluate(()=>__events.toasts.slice(-1));assert.match(JSON.stringify(results.checks.failureToast),/could not be saved/);
   assert.equal(results.errors.length,0);assert.equal(results.consoleErrors.length,0);results.pass=true;
 }catch(e){results.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'highres-export-failure.png'),timeout:60000}).catch(()=>{});}
 finally{writeFile(path.join(out,'highres-export-results.json'),Buffer.from(JSON.stringify(results,null,2)));console.log(JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
}).toString()+')();';eval(harness);
