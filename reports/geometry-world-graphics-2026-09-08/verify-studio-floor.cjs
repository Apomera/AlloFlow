const fs=require('node:fs');
const previous=fs.readFileSync('reports/geometry-world-graphics-2026-09-08/verify-showcase.cjs','utf8');
const fixtureBody=previous.match(/results\.checks\.fixture = await page\.evaluate\(\(\) => \{([\s\S]*?)\n    \}\);\n    await page\.waitForTimeout\(800\);/)[1];
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+='('+(async function(){
 const assert=require('node:assert/strict'),results={scope:'Studio floor perimeter beyond full fog in real WebGL',errors:[],consoleErrors:[],checks:{frames:[]}};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
 async function geometry(){return page.evaluate(async()=>{const e=__geoWorldEngine,b=StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,e._builderSelection.blocks,{title:'Studio floor invariant'}),h=await crypto.subtle.digest('SHA-256',b.buffer);return {hash:Array.from(new Uint8Array(h)).map(v=>v.toString(16).padStart(2,'0')).join(''),triangles:b.triangleCount,selected:e._builderSelection.blocks.length,blocks:JSON.stringify(Object.keys(e.blocks).sort().map(k=>[k,e.blocks[k].userData.shape,e.blocks[k].userData.rotation,e.blocks[k].userData.blockType,e.blocks[k].position.toArray(),e.blocks[k].scale.toArray()])),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack)};});}
 async function camera(){return page.evaluate(()=>{const e=__geoWorldEngine,c=e.camera;return {position:c.position.toArray(),quaternion:c.quaternion.toArray(),up:c.up.toArray(),fov:c.fov,far:c.far,fog:[e.scene.fog.near,e.scene.fog.far]};});}
 async function floorBounds(){return page.evaluate(()=>{
   const e=__geoWorldEngine,c=e.camera,f=e._showcase.studio.floor,depth=e.scene.fog.far,t=Math.tan(c.fov*Math.PI/360),half=f.geometry.parameters.width*f.scale.x/2;
   c.updateMatrixWorld(true);const corners=[];
   for(const x of[-1,1])for(const y of[-1,1]){const p=new THREE.Vector3(x*depth*t*c.aspect,y*depth*t,-depth).applyMatrix4(c.matrixWorld);corners.push({x:Math.abs(p.x-f.position.x),z:Math.abs(p.z-f.position.z)});}
   return {view:e._showcase.view,viewport:[innerWidth,innerHeight],floorSize:half*2,triangles:f.geometry.index.count/3,fogFar:depth,minimumMargin:Math.min(...corners.map(p=>Math.min(half-p.x,half-p.z))),cameraInside:Math.abs(c.position.x-f.position.x)<half&&Math.abs(c.position.z-f.position.z)<half};
 });}
 try{
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
   await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._currentLesson?.sandbox===true);
   await page.evaluate(new Function(fixtureBody));
   await page.evaluate(()=>{const e=__geoWorldEngine;e.applyRenderQuality('balanced');__ctx.updateMulti('geometryWorld',{renderQuality:'balanced'});__aimAt(-2,1,2);e.camera.updateMatrixWorld(true);});
   await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();await page.getByRole('button',{name:'Showcase creation',exact:true}).waitFor();
   await page.evaluate(()=>{const e=__geoWorldEngine;e.flyMode=true;e.camera.position.set(7,6,11);e.camera.fov=75;e.camera.lookAt(0,2,2);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateProjectionMatrix();});
   const original=await geometry(),originalCamera=await camera();results.checks.fixture={hash:original.hash,triangles:original.triangles,selected:original.selected};
   await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();
   await page.waitForTimeout(500);
   for(const size of[{width:1440,height:900},{width:390,height:844}]){
     await page.setViewportSize(size);await page.waitForFunction(()=>{const e=__geoWorldEngine,c=e.renderer.domElement;return Math.abs(e.camera.aspect-c.clientWidth/c.clientHeight)<.001;});
     for(const view of['Perspective','Top']){
       await page.getByRole('button',{name:view,exact:true}).click();const f=await floorBounds();assert.ok(f.minimumMargin>0&&f.cameraInside);assert.equal(f.triangles,2);results.checks.frames.push(f);
       if(view==='Perspective')await page.screenshot({path:path.join(out,size.width===1440?'studio-seamless-desktop.png':'studio-seamless-phone.png')});
     }
   }
   assert.deepEqual(await geometry(),original);results.checks.geometryUnchanged=true;
   await page.setViewportSize({width:1440,height:900});await page.waitForFunction(()=>{const e=__geoWorldEngine,c=e.renderer.domElement;return Math.abs(e.camera.aspect-c.clientWidth/c.clientHeight)<.001;});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!__geoWorldEngine._showcase);assert.deepEqual(await camera(),originalCamera);assert.deepEqual(await geometry(),original);results.checks.exactCameraRestore=true;
   assert.equal(results.errors.length,0);assert.equal(results.consoleErrors.length,0);results.pass=true;
 }catch(e){results.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'studio-floor-failure.png')}).catch(()=>{});}
 finally{const p=path.join(out,'studio-floor-results.json'),value=JSON.stringify(results,null,2);if(fs.existsSync(p)){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value));fs.closeSync(fd);}else fs.writeFileSync(p,value);console.log(JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
}).toString()+')();';eval(harness);
