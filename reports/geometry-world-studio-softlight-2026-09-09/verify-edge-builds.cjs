const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
const frozen=new Map(names.map(name=>[path.resolve('stem_lab',name),fs.readFileSync(path.join(__dirname,'after-source',name))]));
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen.get(file)||fs.readFileSync(file));').replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"balanced",autoCycle:false});');
const assets=['CopyShader.js','LuminosityHighPassShader.js','EffectComposer.js','RenderPass.js','ShaderPass.js','UnrealBloomPass.js'];
harness=harness.replace('const server = http.createServer',"html=html.replace('<script src=\"/stem_lab/stem_tool_geometryworld.js\">',"+JSON.stringify(assets.map(n=>'<script src="/reports/geometry-world-studio-backdrop-2026-09-09/postfx/'+n+'"></script>').join('')+'<script src="/stem_lab/stem_tool_geometryworld.js">')+");\nconst server = http.createServer");
let body=(async function edgeBuildReview(){
  const result={sources:Object.fromEntries(Array.from(frozen,([name,b])=>[path.basename(name),crypto.createHash('sha256').update(b).digest('hex')])),errors:[],consoleErrors:[],failures:[],captures:[]};
  const check=(ok,msg)=>{if(!ok)result.failures.push(msg);};await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1200,height:820},deviceScaleFactor:1,hasTouch:true});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
  const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const data=()=>page.evaluate(async()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,w=p.editableWorld(e).blocks,b=p.buildGeometryWorldStl(e,w).buffer,h=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(x=>x.toString(16).padStart(2,'0')).join('');return JSON.stringify({world:w,stl:h,history:[e._undoStack,e._redoStack],camera:[e.camera.position.toArray(),e.camera.quaternion.toArray(),e.camera.up.toArray(),e.camera.fov,e.camera.far]});});
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    for(const name of ['rotated-wedge','tall-tower','wide-span']){
      await page.evaluate(name=>{
        const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;e.loadLesson({...p.FREE_BUILD_LESSON,ground:{xMin:-12,xMax:12,zMin:-4,zMax:4,y:0,type:'grass'}});e._entryAnim=null;e.flyMode=true;e.releaseInput();e.velocity.set(0,0,0);e._ambientMotionEnabled=false;
        const put=(x,y,z,type='stone',shape='cube',rotation=0)=>e.placeBlock(x,y,z,type,shape,rotation);
        if(name==='rotated-wedge')put(0,1,0,'stone','quarter',3);
        if(name==='tall-tower'){for(let y=1;y<=12;y++)for(let x=0;x<2;x++)for(let z=0;z<2;z++)put(x,y,z,y%4===0?'stone':'brick');put(0,13,0,'stone','quarter',1);put(1,13,0,'stone','quarter',3);}
        if(name==='wide-span'){for(const x of [-9,9])for(let z=-1;z<=1;z++)for(let y=1;y<=4;y++)put(x,y,z,y===4?'stone':'wood');for(let x=-9;x<=9;x++)for(const z of [-1,0,1])put(x,5,z,'stone','halfB');}
        const positions=p.editableWorld(e).blocks.map(({x,y,z})=>({x,y,z}));e._builderSelection={blocks:positions};(e._popBlocks||[]).forEach(m=>m.scale.set(1,1,1));e._popBlocks=[];e.camera.position.set(7.5,6.2,10);e.camera.lookAt(.4,2.9,.2);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);
        window.__edgeMaterialRefs=Object.values(e.blocks).map(m=>[m,m.material]);__ctx.updateMulti('geometryWorld',{measureResult:e.measureStructure(0,1,0,positions),sandboxDockCollapsed:false});
      },name);
      const before=await data();await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();
      for(const size of [{w:1200,h:820,q:'balanced'},{w:390,h:844,q:'detail'}]){
        await page.setViewportSize({width:size.w,height:size.h});await page.evaluate(q=>{__geoWorldEngine.applyRenderQuality(q);__geoWorldEngine._ambientMotionEnabled=false;__ctx.updateMulti('geometryWorld',{renderQuality:q});},size.q);await frames();
        const state=await page.evaluate(()=>{const e=__geoWorldEngine,r=e.renderer;if(e.composer&&e._postFxEnabled!==false)e.composer.render();else r.render(e.scene,e.camera);return {count:e._builderSelection.blocks.length,resources:e._showcase.studio.resources.length,programKey:e._showcase.studio.floor.material.customProgramCacheKey(),shaders:r.info.programs.map(p=>p.diagnostics).filter(d=>d&&d.runnable===false),materialIdentity:__edgeMaterialRefs.every(([m,material])=>m.material===material),overflow:document.documentElement.scrollWidth>innerWidth};});
        const screenshot='after-'+name+'-'+size.q+'-'+size.w+'x'+size.h+'.png';await page.screenshot({path:path.join(out,screenshot)});result.captures.push({name,size,state,screenshot});check(state.shaders.length===0&&state.materialIdentity&&state.resources===8&&!state.overflow,'Render and ownership '+screenshot);
      }
      await page.getByRole('button',{name:'Back to building',exact:true}).click();await frames();check(before===await data(),'Exact world/STL/history/camera restored '+name);
    }
  }catch(e){result.failures.push(e.stack);}
  finally{result.pass=!result.failures.length&&!result.errors.length&&!result.consoleErrors.length;fs.writeFileSync(path.join(out,'edge-build-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({pass:result.pass,captures:result.captures.length,failures:result.failures,errors:result.errors,consoleErrors:result.consoleErrors}));await browser.close();await new Promise(r=>server.close(r));if(!result.pass)process.exitCode=1;}
}).toString();harness+='('+body+')();';eval(harness);
