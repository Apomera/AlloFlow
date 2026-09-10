const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const stage=process.argv[2]||'after';if(!['before','after'].includes(stage))throw Error('Choose before or after');
const sourceDir=path.join(__dirname,stage+'-source');fs.mkdirSync(sourceDir,{recursive:true});
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
if(stage==='after')for(const name of names)fs.copyFileSync('stem_lab/'+name,path.join(sourceDir,name));
const frozen=new Map(names.map(name=>[path.resolve('stem_lab',name),fs.readFileSync(path.join(sourceDir,name))]));
const prior=fs.readFileSync('reports/geometry-world-showcase-composition-2026-09-09/verify-composition-browser.cjs','utf8'),fixtureStart=prior.indexOf('    await page.evaluate(()=>{\n      const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;e.loadLesson');
if(fixtureStart<0)throw Error('Missing fixture');const fixture=prior.slice(fixtureStart,prior.indexOf('    result.buildingPose=',fixtureStart));
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen.get(file)||fs.readFileSync(file));').replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
const assets=['CopyShader.js','LuminosityHighPassShader.js','EffectComposer.js','RenderPass.js','ShaderPass.js','UnrealBloomPass.js'];
harness=harness.replace('const server = http.createServer',"html=html.replace('<script src=\"/stem_lab/stem_tool_geometryworld.js\">',"+JSON.stringify(assets.map(n=>'<script src="/reports/geometry-world-studio-backdrop-2026-09-09/postfx/'+n+'"></script>').join('')+'<script src="/stem_lab/stem_tool_geometryworld.js">')+");\nconst server = http.createServer");
let body=(async function backdropReview(){
  const result={stage,sources:Object.fromEntries(Array.from(frozen,([name,bytes])=>[path.basename(name),crypto.createHash('sha256').update(bytes).digest('hex')])),errors:[],consoleErrors:[],failures:[],captures:[],exports:[]};
  const check=(ok,message)=>{if(!ok)result.failures.push(message);};await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,hasTouch:true,acceptDownloads:true});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
  const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const snapshot=()=>page.evaluate(async()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,w=p.editableWorld(e).blocks;const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');return {world:JSON.stringify(w),stl:await hash(p.buildGeometryWorldStl(e,w).buffer),selection:JSON.stringify(e._builderSelection.blocks),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),geometry:JSON.stringify(Object.values(e.blocks).filter(m=>m.userData._measurementLayer==='student').map(m=>({position:m.position.toArray(),rotation:m.quaternion.toArray(),scale:m.scale.toArray(),attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([k,v])=>[k,Array.from(v.array)])),index:m.geometry.index&&Array.from(m.geometry.index.array)})))};});
  const pose=()=>page.evaluate(()=>{const c=__geoWorldEngine.camera;return {position:c.position.toArray(),quaternion:c.quaternion.toArray(),up:c.up.toArray(),fov:c.fov,far:c.far};});
  async function measure(){return page.evaluate(()=>{
    const e=__geoWorldEngine,r=e.renderer,composed=!!(e.composer&&e._postFxEnabled!==false),autoReset=r.info.autoReset;r.info.autoReset=false;r.info.reset();if(composed)e.composer.render();else r.render(e.scene,e.camera);
    const draw={calls:r.info.render.calls,triangles:r.info.render.triangles};r.info.autoReset=autoReset;
    const gl=r.getContext(),w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,data=new Uint8Array(h*4);gl.readPixels(Math.floor(w*.18),0,1,h,gl.RGBA,gl.UNSIGNED_BYTE,data);
    const sample=y=>Array.from(data.slice((h-1-Math.min(h-1,Math.floor(y*h)))*4,(h-1-Math.min(h-1,Math.floor(y*h)))*4+3));
    const sky=sample(.02),floor=sample(.9),line=[];for(let y=.44;y<=.56;y+=.005)line.push(sample(y));
    const maxStep=Math.max(...line.slice(1).map((rgb,i)=>Math.max(...rgb.map((v,c)=>Math.abs(v-line[i][c])))));
    const shaderErrors=r.info.programs.map(p=>p.diagnostics).filter(d=>d&&d.runnable===false);
    return {floorProgramKey:e._showcase.studio.floor.material.customProgramCacheKey(),shadowType:r.shadowMap.type,shadowMap:e._showcase.studio.lights[0].shadow.mapSize.toArray(),composed,quality:e._renderProfile.tier,sky,floor,maxStep,line,draw,background:e.scene.background.toArray(),fog:e.scene.fog.color.toArray(),floorColor:e._showcase.studio.floor.material.color.toArray(),camera:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),rect:e._showcase.composition.rect,blocks:Object.keys(e.blocks).length,resources:e._showcase.studio.resources.length,materialsUnchanged:Object.entries(window.__materialRefs).every(([k,m])=>e.blocks[k]?.material===m),shaderErrors};
  });}
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    /* FIXTURE */
    result.composerLoaded=await page.evaluate(()=>!!__geoWorldEngine.composer);check(result.composerLoaded,'Actual r128 EffectComposer loaded from local pinned assets');
    result.modelBefore=await snapshot();result.poseBefore=await pose();
    await page.evaluate(()=>{window.__originalSceneHook=__geoWorldEngine.scene.onBeforeRender;window.__originalBackground=__geoWorldEngine.scene.background;window.__originalFog=__geoWorldEngine.scene.fog;window.__materialRefs=Object.fromEntries(Object.entries(__geoWorldEngine.blocks).map(([k,m])=>[k,m.material]));});
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();await frames();
    const cases=[{"q":"saver","v":"front","w":844,"h":390},{"q":"saver","v":"perspective","w":1200,"h":820},{"q":"saver","v":"perspective","w":390,"h":844},{"q":"balanced","v":"front","w":844,"h":390},{"q":"balanced","v":"perspective","w":1200,"h":820},{"q":"balanced","v":"perspective","w":390,"h":844},{"q":"detail","v":"front","w":844,"h":390},{"q":"detail","v":"side","w":844,"h":390},{"q":"detail","v":"perspective","w":1200,"h":820},{"q":"detail","v":"perspective","w":390,"h":844},{"q":"detail","v":"top","w":1200,"h":820},{"q":"detail","v":"perspective","w":844,"h":390}];
    for(const c of cases){
      await page.setViewportSize({width:c.w,height:c.h});await page.evaluate(q=>{const e=__geoWorldEngine;e.applyRenderQuality(q);e._ambientMotionEnabled=false;__ctx.updateMulti('geometryWorld',{renderQuality:q});},c.q);await page.getByRole('button',{name:c.v[0].toUpperCase()+c.v.slice(1),exact:true}).click();await frames();
      const data=await measure(),name=stage+'-'+c.q+'-'+c.v+'-'+c.w+'x'+c.h+'.png';await page.screenshot({path:path.join(out,name)});result.captures.push({case:c,data,screenshot:name});
      check(data.composed===(c.q==='detail'),'Correct actual render path '+name);check(data.materialsUnchanged,'Block material identities preserved '+name);check(data.shaderErrors.length===0,'Shaders compile '+name);
      if(stage==='after'&&c.v==='front'){check(Math.max(...data.sky.map((v,i)=>Math.abs(v-[241,238,232][i])))<=2,'Displayed ivory background '+name);check(Math.max(...data.floor.map((v,i)=>Math.abs(v-data.sky[i])))<=6,'Calm floor meets ivory backdrop '+name);check(data.maxStep<=5,'No abrupt horizon step '+name);}
      if(c.v==='front'&&['saver','detail'].includes(c.q)||c.q==='detail'&&c.v==='perspective'&&c.w===1200){
        const savedPose=await pose(),pending=page.waitForEvent('download');await page.getByRole('button',{name:'Save image',exact:true}).click();const d=await pending,file=stage+'-'+c.q+(c.v==='perspective'?'-perspective':'')+'-export.png';await d.saveAs(path.join(out,file));await page.waitForFunction(()=>!__geoWorldEngine._showcaseExporting);await frames();
        check(JSON.stringify(savedPose)===JSON.stringify(await pose()),'PNG retains camera '+c.q);result.exports.push({quality:c.q,file,bytes:fs.statSync(path.join(out,file)).size});
      }
    }
    result.modelAfter=await snapshot();check(JSON.stringify(result.modelBefore)===JSON.stringify(result.modelAfter),'All geometry, world, STL, selection and history remain exact');
    await page.getByRole('button',{name:'Meadow',exact:true}).click();await frames();result.meadowRestore=await page.evaluate(()=>({hook:__geoWorldEngine.scene.onBeforeRender===__originalSceneHook,background:__geoWorldEngine.scene.background===__originalBackground,fog:__geoWorldEngine.scene.fog===__originalFog,stage:!!__geoWorldEngine.scene.getObjectByName('gwe-studio-stage')}));check(result.meadowRestore.hook&&result.meadowRestore.background&&result.meadowRestore.fog&&!result.meadowRestore.stage,'Meadow restores callback/environment and removes Studio resources');
    await page.getByRole('button',{name:'Studio',exact:true}).click();await frames();await page.getByRole('button',{name:'Back to building',exact:true}).click();result.returnedPose=await pose();check(JSON.stringify(result.poseBefore)===JSON.stringify(result.returnedPose),'Building camera restored exactly');result.exitRestore=await page.evaluate(()=>__geoWorldEngine.scene.onBeforeRender===__originalSceneHook&&!__geoWorldEngine.scene.getObjectByName('gwe-studio-stage'));check(result.exitRestore,'Exit restores callback after re-entry');
  }catch(error){result.failures.push(error.stack);await page.screenshot({path:path.join(out,stage+'-failure.png')}).catch(()=>{});}
  finally{result.pass=result.failures.length===0&&result.errors.length===0&&result.consoleErrors.length===0;fs.writeFileSync(path.join(out,stage+'-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({stage,pass:result.pass,failures:result.failures,errors:result.errors,consoleErrors:result.consoleErrors,captures:result.captures.length}));await browser.close();await new Promise(r=>server.close(r));if(!result.pass)process.exitCode=1;}
}).toString();
body=body.replace('    /* FIXTURE */',fixture);harness+='('+body+')();';eval(harness);
