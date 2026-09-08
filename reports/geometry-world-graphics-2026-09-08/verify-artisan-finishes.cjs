const fs=require('node:fs');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness+=String.raw`
(async()=>{
 const assert=require('node:assert/strict'),results={passed:false,errors:[],checks:{}};
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1180,height:820}});page.setDefaultTimeout(60000);page.on('pageerror',e=>results.errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.__geoWorldEngine,{}, {timeout:120000});
  await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
  await page.evaluate(()=>{
   const en=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure;
   en.loadLesson({...pure.FREE_BUILD_LESSON,ground:{xMin:-7,xMax:7,zMin:-5,zMax:6,y:0}});en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);
   const types=['stone','wood','brick','gold','diamond','sand'];window.__finishBlocks=[];
   types.forEach((type,i)=>['cube','halfB','halfA'].forEach((shape,j)=>{const p={x:i*2-5,y:1,z:j*2-2};en.placeBlock(p.x,p.y,p.z,type,shape,j%4);__finishBlocks.push(p);}));
   for(const [type,x]of [['grass',-5],['glass',-3],['water',-1],['ice',1],['lava',3],['torch',5]]){const p={x,y:1,z:5};en.placeBlock(x,1,5,type,'cube',0);__finishBlocks.push(p);}
   ['halfB','halfA','quarter'].forEach((shape,i)=>{const p={x:i*2-2,y:1,z:-4};en.placeBlock(p.x,p.y,p.z,'water',shape,i);__finishBlocks.push(p);});
   window.__waterPlacement=__finishBlocks.map(p=>en.blocks[[p.x,p.y,p.z].join(',')]).filter(m=>m.userData.blockType==='water').map(m=>({shape:m.userData.shape,position:m.position.toArray()}));
   en.refreshAllAO();en.camera.position.set(9,7,14);en.camera.fov=42;en.camera.updateProjectionMatrix();en.camera.lookAt(0.5,1.3,1);en.euler.setFromQuaternion(en.camera.quaternion);en.camera.updateMatrixWorld(true);
   __ctx.updateMulti('geometryWorld',{sandboxDockCollapsed:true,autoCycle:false,renderQuality:'detail',showGameSettings:false});
  });
  await page.waitForFunction(()=>__geoWorldEngine._renderProfile.tier==='detail'&&!!__geoWorldEngine.composer);await page.waitForTimeout(700);
  await page.getByRole('button',{name:'Open game settings and tools',exact:true}).focus();
  await page.evaluate(()=>{__geoWorldEngine.camera.fov=42;__geoWorldEngine.camera.updateProjectionMatrix();});
  const initial=await page.evaluate(()=>{
   const en=__geoWorldEngine,meshes=__finishBlocks.map(p=>en.blocks[[p.x,p.y,p.z].join(',')]);
   const snapshot=()=>JSON.stringify(meshes.map(m=>({p:Array.from(m.geometry.attributes.position.array),i:m.geometry.index?Array.from(m.geometry.index.array):null})));
   window.__finishGeometry=snapshot();window.__finishSnapshot=snapshot;
   window.__finishStl=Array.from(new Uint8Array(StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(en,__finishBlocks).buffer));
   return {eligible:meshes.filter(m=>m.material._gwBlockFinish).map(m=>({type:m.userData.blockType,shape:m.userData.shape,half:m.material._gwBlockFinish.gwBlockHalfSize.value.toArray(),strength:m.material._gwBlockFinish.gwBlockBevelStrength.value})),excluded:meshes.filter(m=>!m.material._gwBlockFinish).map(m=>({type:m.userData.blockType,shape:m.userData.shape})),swatches:document.querySelectorAll('.gw-material-swatch').length};
  });results.checks.materials=initial;
  assert.equal(initial.eligible.length,12);assert.equal(initial.excluded.length,15);assert.equal(initial.swatches,12);
  for(const m of initial.eligible){assert.equal(m.half[1],m.shape==='halfB'?0.25:0.5);assert.equal(m.strength,0.45);}
  await page.evaluate(()=>{Object.values(__geoWorldEngine.blocks).forEach(m=>{if(m.material._gwBlockFinish)m.material._gwBlockFinish.gwBlockBevelStrength.value=0;});});
  await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'artisan-finishes-flat.png')});
  await page.evaluate(()=>{Object.values(__geoWorldEngine.blocks).forEach(m=>{if(m.material._gwBlockFinish)m.material._gwBlockFinish.gwBlockBevelStrength.value=0.45;});});
  await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'artisan-finishes-crafted.png')});
  results.checks.quality=[];
  for(const tier of ['saver','balanced','detail']){
   await page.getByRole('button',{name:'Open game settings and tools',exact:true}).click();
   await page.getByRole('combobox',{name:'3D graphics quality',exact:true}).selectOption(tier);
   await page.waitForFunction(tier=>__geoWorldEngine._renderProfile.tier===tier,tier);
   await page.getByRole('button',{name:'Close game settings and tools',exact:true}).click();await page.waitForTimeout(100);
   const status=await page.evaluate(()=>({strengths:Object.values(__geoWorldEngine.blocks).filter(m=>m.material._gwBlockFinish).map(m=>m.material._gwBlockFinish.gwBlockBevelStrength.value),geometryUnchanged:__finishGeometry===__finishSnapshot(),waterPlacement:__finishBlocks.map(p=>__geoWorldEngine.blocks[[p.x,p.y,p.z].join(',')]).filter(m=>m.userData.blockType==='water').map(m=>({shape:m.userData.shape,position:m.position.toArray()})),waterPlacementUnchanged:JSON.stringify(__waterPlacement)===JSON.stringify(__finishBlocks.map(p=>__geoWorldEngine.blocks[[p.x,p.y,p.z].join(',')]).filter(m=>m.userData.blockType==='water').map(m=>({shape:m.userData.shape,position:m.position.toArray()}))),stlUnchanged:JSON.stringify(__finishStl)===JSON.stringify(Array.from(new Uint8Array(StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(__geoWorldEngine,__finishBlocks).buffer)))}));
   results.checks.quality.push({tier,...status});
   assert.ok(status.strengths.every(v=>v===(tier==='saver'?0:0.45)));assert.ok(status.geometryUnchanged&&status.stlUnchanged);assert.ok(status.waterPlacementUnchanged);
  }
  const gold=page.getByRole('button',{name:/Select Gold block, key 5/});await gold.click();assert.equal(await gold.getAttribute('aria-pressed'),'true');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'artisan-materials-phone.png')});
  results.checks.phone=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,swatches:document.querySelectorAll('.gw-material-swatch').length}));assert.equal(results.checks.phone.overflow,false);
  results.checks.shaders=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics&&p.diagnostics.runnable===false).map(p=>p.diagnostics));assert.equal(results.checks.shaders.length,0);assert.equal(results.errors.length,0);results.passed=true;
 }catch(e){results.failure=e.stack;process.exitCode=1;await page.screenshot({path:path.join(out,'artisan-finishes-failure.png')}).catch(()=>{});}
 finally{fs.writeFileSync(path.join(out,'artisan-finishes-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({passed:results.passed,failure:results.failure,errors:results.errors,eligible:results.checks.materials?.eligible.length,quality:results.checks.quality?.map(q=>({tier:q.tier,geometryUnchanged:q.geometryUnchanged,stlUnchanged:q.stlUnchanged}))},null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
`;
eval(harness);
