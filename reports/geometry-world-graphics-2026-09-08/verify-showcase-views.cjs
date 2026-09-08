const fs=require('node:fs');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+='('+(async function(){
 const assert=require('node:assert/strict'),results={scope:'Real Showcase standard camera views and fractional geometry in local React/WebGL',errors:[],consoleErrors:[],checks:{frames:[]}};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1180,height:860},acceptDownloads:true});page.setDefaultTimeout(60000);
 page.on('pageerror',e=>results.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
 async function geometry(){return page.evaluate(async()=>{
   const e=__geoWorldEngine,b=StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,e._builderSelection.blocks,{title:'Showcase view invariant'}),hash=await crypto.subtle.digest('SHA-256',b.buffer);
   return {hash:Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join(''),triangles:b.triangleCount,dimensions:b.dimensions,blocks:JSON.stringify(Object.keys(e.blocks).sort().map(k=>[k,e.blocks[k].userData.blockType,e.blocks[k].userData.shape,e.blocks[k].userData.rotation,e.blocks[k].position.toArray(),e.blocks[k].scale.toArray()])),selection:JSON.stringify(e._builderSelection.blocks),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack)};
 });}
 async function camera(){return page.evaluate(()=>{const e=__geoWorldEngine,c=e.camera;return {position:c.position.toArray(),quaternion:c.quaternion.toArray(),up:c.up.toArray(),fov:c.fov,far:c.far,fog:[e.scene.fog.near,e.scene.fog.far],collapsed:!!__toolData.geometryWorld.sandboxDockCollapsed};});}
 async function frame(){return page.evaluate(()=>{
   const e=__geoWorldEngine,c=e.camera,canvas=e.renderer.domElement,r=canvas.getBoundingClientRect(),box=new THREE.Box3();c.updateMatrixWorld(true);
   e._builderSelection.blocks.forEach(p=>box.expandByObject(e.blocks[[p.x,p.y,p.z].join(',')]));
   const points=[];for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z).project(c).toArray());
   const buttons=Array.from(document.querySelectorAll('.gwe-showcase-views button')).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent,pressed:b.getAttribute('aria-pressed'),height:r.height,width:r.width,hit:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};});
   return {view:e._showcase.view,look:e._showcase.look||'meadow',canvas:[r.width,r.height],aspect:c.aspect,points,up:c.up.toArray(),direction:c.getWorldDirection(new THREE.Vector3()).toArray(),buttons,overflow:document.documentElement.scrollWidth>innerWidth};
 });}
 function assertFrame(f,view,look){
   assert.equal(f.view,view);assert.equal(f.look,look);assert.equal(f.overflow,false);
   assert.ok(f.buttons.every(b=>b.height>=44&&b.hit));assert.equal(f.buttons.filter(b=>b.pressed==='true').length,1);assert.equal(f.buttons.find(b=>b.pressed==='true').text.toLowerCase(),view);
   const safeX=Math.max(.35,(f.canvas[0]-128)/f.canvas[0]),safeY=Math.max(.25,(f.canvas[1]-320)/f.canvas[1]);
   assert.ok(f.points.every(p=>Math.abs(p[0])<=safeX+1e-6&&Math.abs(p[1])<=safeY+1e-6&&p[2]>-1&&p[2]<1),'All bounding corners stay inside the clear presentation area');
   if(view==='top'){assert.deepEqual(f.up,[0,0,-1]);assert.ok(Math.abs(f.direction[1]+1)<1e-8&&Math.abs(f.direction[0])<1e-8&&Math.abs(f.direction[2])<1e-8);}
   if(view==='front')assert.ok(Math.abs(f.direction[2]+1)<1e-8);
   if(view==='side')assert.ok(Math.abs(f.direction[0]+1)<1e-8);
 }
 try{
   await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
   await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
   await page.waitForFunction(()=>__geoWorldEngine._currentLesson?.sandbox===true);
   await page.evaluate(()=>{
     const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=false;e.velocity.set(0,0,0);
     for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)e.placeBlock(x,1,z,'stone','cube',0);
     for(const x of[-2,2])for(const z of[-1,1])for(let y=2;y<=3;y++)e.placeBlock(x,y,z,'wood','cube',0);
     for(let x=-3;x<=2;x++)for(let z=-2;z<=1;z++){const y=4+Math.min(x+3,2-x);e.placeBlock(x,y,z,'brick','halfA',x<0?0:2);if(y>4)e.placeBlock(x,y-1,z,'wood','cube',0);}
     e.placeBlock(0,1,2,'stone','halfB',0);e.placeBlock(1,1,2,'stone','quarter',1);
     e.applyRenderQuality('balanced');__ctx.updateMulti('geometryWorld',{sandboxDockCollapsed:false,renderQuality:'balanced'});
     __aimAt(0,1,1);e.camera.updateMatrixWorld(true);
   });
   await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
   await page.getByRole('button',{name:'Showcase creation',exact:true}).waitFor();
   await page.evaluate(()=>{const e=__geoWorldEngine;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(7,7,10);e.camera.fov=75;e.camera.lookAt(0,3,0);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateProjectionMatrix();});
   const originalGeometry=await geometry(),originalCamera=await camera();results.checks.fixture={hash:originalGeometry.hash,triangles:originalGeometry.triangles,dimensions:originalGeometry.dimensions,selected:JSON.parse(originalGeometry.selection).length};
   await page.getByRole('button',{name:'Showcase creation',exact:true}).click();
   await page.waitForFunction(()=>!!__geoWorldEngine._showcase);await page.waitForTimeout(500);
   for(const viewport of[{width:1180,height:860},{width:320,height:700}]){
     await page.setViewportSize(viewport);
     await page.waitForFunction(()=>{const e=__geoWorldEngine,c=e.renderer.domElement;return Math.abs(e.camera.aspect-c.clientWidth/c.clientHeight)<.001;});
     for(const look of['meadow','studio']){
       await page.getByRole('button',{name:look==='meadow'?'Meadow':'Studio',exact:true}).click();
       for(const view of['perspective','front','side','top']){
         await page.getByRole('group',{name:'Camera view',exact:true}).getByRole('button',{name:view.charAt(0).toUpperCase()+view.slice(1),exact:true}).click();
         const f=await frame();assertFrame(f,view,look);results.checks.frames.push({viewport:[viewport.width,viewport.height],...f});
       }
       if(look==='studio')await page.screenshot({path:path.join(out,viewport.width===320?'showcase-views-phone-top.png':'showcase-views-desktop-top.png')});
     }
   }
   const topCamera=await camera();await page.getByRole('button',{name:'Rotate view right',exact:true}).click();
   let f=await frame();assertFrame(f,'perspective','studio');assert.notDeepEqual((await camera()).position,topCamera.position);
   await page.getByRole('button',{name:'Perspective',exact:true}).click();const p1=await camera();
   await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');const p2=await camera();assert.ok(p1.position.every((v,i)=>Math.abs(v-p2.position[i])<1e-8));results.checks.orbitAndKeyboard=true;
   await page.screenshot({path:path.join(out,'showcase-views-phone-perspective.png')});
   const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();const download=await downloaded,bytes=fs.readFileSync(await download.path());
   assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.ok(bytes.length>1000);results.checks.png={bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
   assert.deepEqual(await geometry(),originalGeometry);results.checks.geometryUnchanged=true;
   await page.setViewportSize({width:1180,height:860});await page.waitForFunction(()=>{const e=__geoWorldEngine,c=e.renderer.domElement;return Math.abs(e.camera.aspect-c.clientWidth/c.clientHeight)<.001;});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!__geoWorldEngine._showcase);
   assert.deepEqual(await camera(),originalCamera);assert.deepEqual(await geometry(),originalGeometry);results.checks.exactCameraAndGeometryRestore=true;
   assert.equal(results.errors.length,0);assert.equal(results.consoleErrors.length,0);results.pass=true;
 }catch(e){results.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'showcase-views-failure.png')}).catch(()=>{});}
 finally{const target=path.join(out,'showcase-views-results.json'),value=JSON.stringify(results,null,2);if(fs.existsSync(target)){const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,value);fs.ftruncateSync(fd,Buffer.byteLength(value));fs.closeSync(fd);}else fs.writeFileSync(target,value);console.log(JSON.stringify({pass:results.pass,failure:results.failure,errors:results.errors,consoleErrors:results.consoleErrors,frames:results.checks.frames.length,checks:Object.keys(results.checks)},null,2));await browser.close();await new Promise(r=>server.close(r));}
}).toString()+')();';eval(harness);
