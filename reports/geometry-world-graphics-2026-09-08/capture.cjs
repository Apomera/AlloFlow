const fs=require('node:fs'),path=require('node:path');
let code=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
code=code.replace('out = __dirname','out = __dirname');
code+=`
(async()=>{
 const label=process.argv[2]||'after',results={errors:[]};await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(45000);page.on('pageerror',e=>results.errors.push(e.message));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
  await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
  await page.evaluate(()=>{
   const en=__geoWorldEngine;en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);en.applyRenderQuality('detail');en._ambientMotionEnabled=false;
   const place=(x,y,z,type,shape='cube',rot=0)=>en.placeBlock(x,y,z,type,shape,rot);
   for(let x=-3;x<=4;x++)for(let z=-2;z<=2;z++)place(x,1,z,'stone');
   for(const x of [-3,4])for(const z of [-2,2])for(let y=2;y<=4;y++)place(x,y,z,'brick');
   for(let x=-3;x<=4;x++)for(const z of [-2,2])place(x,5,z,'wood');
   for(let x=-3;x<=4;x++)for(let z=-2;z<=2;z++)place(x,6,z,'wood','halfA',z<0?0:2);
   for(let i=0;i<7;i++){const type=['stone','wood','brick','gold','diamond','sand','ice'][i];place(i-3,1,5,type);place(i-3,2,5,type,i%2?'quarter':'halfA',i%4);}
   for(let x=-1;x<=2;x++)place(x,2,0,'water','halfB');
   en.refreshAllAO();en.camera.position.set(14,11,19);en.camera.fov=48;en.camera.updateProjectionMatrix();en.camera.lookAt(0.5,2.8,0.5);en.euler.setFromQuaternion(en.camera.quaternion);en.camera.updateMatrixWorld(true);
   __ctx.updateMulti('geometryWorld',{sandboxDockCollapsed:true,autoCycle:false,renderQuality:'detail',showGameSettings:false});
  });
  await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,label+'-desktop.png')});
  results.graphics=await page.evaluate(()=>{const en=__geoWorldEngine;return {blocks:Object.keys(en.blocks).length,drawCalls:en.renderer.info.render.calls,triangles:en.renderer.info.render.triangles,geometries:en.renderer.info.memory.geometries,textures:en.renderer.info.memory.textures,profile:en._renderProfile,surfaceNormals:Object.values(en.blocks).filter(m=>m.material.userData.gwSurfaceKey && m.material.normalMap).length,wedges:Object.values(en.blocks).filter(m=>m.userData.shape==='halfA').map(m=>({hasUv:!!m.geometry.attributes.uv,volume:m.userData.volume})),programErrors:en.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics)};});
  await page.evaluate(()=>{const en=__geoWorldEngine;en.camera.position.set(5,5.5,11);en.camera.lookAt(0.3,1.8,5);en.euler.setFromQuaternion(en.camera.quaternion);});await page.waitForTimeout(250);await page.screenshot({path:path.join(out,label+'-materials.png')});
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const en=__geoWorldEngine;__ctx.updateMulti('geometryWorld',{renderQuality:'saver'});en.applyRenderQuality('saver');en.camera.position.set(16,12,22);en.camera.lookAt(0.5,2.8,1);en.euler.setFromQuaternion(en.camera.quaternion);});await page.waitForTimeout(250);await page.screenshot({path:path.join(out,label+'-phone.png')});
  results.battery=await page.evaluate(()=>({profile:__geoWorldEngine._renderProfile,surfaceNormals:Object.values(__geoWorldEngine.blocks).filter(m=>m.material.userData.gwSurfaceKey && m.material.normalMap).length,errors:__events.errors}));
  results.passed=!results.errors.length&&!results.graphics.programErrors.length;
 }catch(e){results.failure=e.stack;process.exitCode=1;console.error(e.stack);}
 finally{fs.writeFileSync(path.join(out,label+'-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
`;
eval(code);
