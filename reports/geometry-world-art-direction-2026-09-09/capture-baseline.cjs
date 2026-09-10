const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const rootDir = process.cwd();
const frozenSources = new Map(['stem_lab/stem_tool_geometryworld.js','stem_lab/stem_tool_geometryworld_builder.js'].map(f => [path.resolve(rootDir,f),fs.readFileSync(f)]));
for (const [file,bytes] of frozenSources) fs.writeFileSync(path.join(__dirname,'before-'+path.basename(file)),bytes);
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozenSources.get(file) || fs.readFileSync(file));');
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"balanced"});');
harness+='('+(async function captureArtDirectionBaseline(){
  const results={scope:'Frozen baseline sources, actual WebGL pavilion and material gallery, balanced and saver',errors:[],consoleErrors:[],captures:[],sources:Array.from(frozenSources,([file,bytes])=>({file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}))};
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1200,height:820},deviceScaleFactor:1});
  page.setDefaultTimeout(45000);
  page.on('pageerror',e=>results.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')results.consoleErrors.push(m.text());});
  async function capture(name){
    await page.waitForTimeout(180);
    const file='before-'+name+'.png';
    await page.screenshot({path:path.join(out,file)});
    results.captures.push(await page.evaluate(file=>{const e=__geoWorldEngine;return {file,profile:e._renderProfile,position:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),fov:e.camera.fov,look:e._showcase?.look,draws:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles,programs:e.renderer.info.programs.length,shaderErrors:e.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics)};},file));
    console.log(JSON.stringify({stage:'captured',file}));
  }
  async function profiles(prefix){
    for(const quality of ['balanced','saver']){
      await page.evaluate(quality=>{const e=__geoWorldEngine;e.applyRenderQuality(quality);e._ambientMotionEnabled=false;__ctx.updateMulti('geometryWorld',{renderQuality:quality,autoCycle:false});},quality);
      for(const look of ['Meadow','Studio']){
        await page.getByRole('button',{name:look,exact:true}).click();
        await capture(prefix+'-'+look.toLowerCase()+'-'+quality);
      }
    }
  }
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__geoWorldEngine || !!window.__geoWorldEngine_failed,{},{timeout:120000});
    if(await page.evaluate(()=>!!window.__geoWorldEngine_failed))throw Error('Initial engine failed: '+await page.evaluate(()=>String(window.__geoWorldEngine_failed)));
    console.log(JSON.stringify({stage:'baseline-source-loaded',errors:results.errors}));
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();
    await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.evaluate(()=>{
      const e=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure;e.loadLesson(pure.FREE_BUILD_LESSON);e._entryAnim=null;e.flyMode=true;e._ambientMotionEnabled=false;e.releaseInput();e.velocity.set(0,0,0);
      const put=(x,y,z,type,shape='cube',rotation=0)=>e.placeBlock(x,y,z,type,shape,rotation);
      for(let x=-3;x<=2;x++)for(let z=-2;z<=2;z++)put(x,1,z,(x===-3||x===2||z===-2||z===2)?'stone':'wood');
      for(const x of [-3,2])for(const z of [-2,2]){put(x,2,z,'brick');for(let y=3;y<=4;y++)put(x,y,z,'wood');put(x,5,z,'gold');}
      for(let x=-3;x<=2;x++)for(const z of [-2,2])if(x!==-3&&x!==2)put(x,5,z,'wood');
      for(let z=-1;z<=1;z++)for(const x of [-3,2])put(x,5,z,'wood');
      for(let x=-4;x<=3;x++)for(let z=-3;z<=3;z++){const roofY=5+Math.min(x+4,3-x);put(x,roofY,z,'brick','halfA',x<0?0:2);if(roofY>5)put(x,roofY-1,z,'wood');}
      for(let x=-1;x<=0;x++)put(x,1,3,'stone','halfB');
      e.refreshAllAO();const m=e.measureStructure(-3,1,-2);e._builderSelection={blocks:m.blocks.slice()};e.blocksPlaced=m.count;
      e.camera.position.set(14,11,19);e.camera.lookAt(.5,2.8,.5);e.euler.setFromQuaternion(e.camera.quaternion);
      __ctx.updateMulti('geometryWorld',{renderQuality:'balanced',autoCycle:false,sandboxDockCollapsed:false,measureResult:m,builderPanel:'build',touchMode:false});
    });
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();
    await profiles('pavilion');
    await page.getByRole('button',{name:'Back to building',exact:true}).click();
    await page.evaluate(()=>{
      const e=__geoWorldEngine;e.loadLesson(StemLab.geometryWorldBuilderPure.FREE_BUILD_LESSON);e._entryAnim=null;e._ambientMotionEnabled=false;e.releaseInput();
      const types=['stone','wood','brick','sand','gold','diamond','glass','ice','water'];
      for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++)e.placeBlock(x,1,z,'stone','halfB');
      types.forEach((type,i)=>{const x=(i%3-1)*3,z=(Math.floor(i/3)-1)*3;e.placeBlock(x,2,z,type);e.placeBlock(x,3,z,type,'halfB');});
      e.refreshAllAO();const blocks=Object.values(e.blocks).filter(m=>!m.userData._lessonBlock).map(m=>m.userData.gridPos),m=e.measureStructure(-4,1,-4,blocks);e._builderSelection={blocks:blocks.slice()};e.blocksPlaced=blocks.length;
      e.camera.position.set(10,10,13);e.camera.lookAt(.5,1.5,.5);e.euler.setFromQuaternion(e.camera.quaternion);
      __ctx.updateMulti('geometryWorld',{sandboxDockCollapsed:false,measureResult:m,builderPanel:'build',showcaseActive:false});
    });
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();
    await profiles('materials');
    results.passed=!results.errors.length && results.captures.every(c=>!c.shaderErrors.length);
  }catch(error){results.failure=error.stack;results.passed=false;process.exitCode=1;console.error(error.stack);await page.screenshot({path:path.join(out,'before-failure.png'),timeout:10000}).catch(()=>{});}
  finally{fs.writeFileSync(path.join(out,'baseline-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({stage:'complete',passed:results.passed,captures:results.captures.length,errors:results.errors,failure:results.failure}));await browser.close();await new Promise(r=>server.close(r));}
}).toString()+')();';
eval(harness);
