const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const stage=process.argv[2]||'after';if(!['before','after'].includes(stage))throw Error('Choose before or after');
const sourceDir=path.join(__dirname,stage+'-source');fs.mkdirSync(sourceDir,{recursive:true});
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
if(stage==='after')for(const name of names)fs.copyFileSync('stem_lab/'+name,path.join(sourceDir,name));
const frozen=new Map(names.map(name=>[path.resolve('stem_lab',name),fs.readFileSync(path.join(sourceDir,name))]));
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen.get(file)||fs.readFileSync(file));');
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
harness+='('+(async function compositionReview(){
  const result={stage,sources:Object.fromEntries(Array.from(frozen,([name,bytes])=>[path.basename(name),crypto.createHash('sha256').update(bytes).digest('hex')])),errors:[],consoleErrors:[],failures:[],captures:[]};
  const check=(ok,message)=>{if(!ok)result.failures.push(message);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1200,height:820},deviceScaleFactor:1,hasTouch:true,acceptDownloads:true});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
  const frames=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const pose=()=>page.evaluate(()=>{const e=__geoWorldEngine;return {position:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),up:e.camera.up.toArray(),fov:e.camera.fov,far:e.camera.far};});
  const model=()=>page.evaluate(async()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,w=p.editableWorld(e).blocks;const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b))).map(v=>v.toString(16).padStart(2,'0')).join('');return {world:JSON.stringify(w),stl:await hash(p.buildGeometryWorldStl(e,w).buffer),selected:JSON.stringify(e._builderSelection.blocks),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack)};});
  async function layout(){return page.evaluate(()=>{
    const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,canvas=e.renderer.domElement,r=canvas.getBoundingClientRect(),b=p.creationGeometryBounds(e,e._builderSelection.blocks);e.camera.updateMatrixWorld(true);
    const vertices=[];for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const n=new THREE.Vector3(x,y,z).project(e.camera);vertices.push({x:r.left+(n.x+1)*r.width/2,y:r.top+(1-n.y)*r.height/2,z:n.z});}
    const projected={left:Math.min(...vertices.map(v=>v.x)),right:Math.max(...vertices.map(v=>v.x)),top:Math.min(...vertices.map(v=>v.y)),bottom:Math.max(...vertices.map(v=>v.y))};projected.width=projected.right-projected.left;projected.height=projected.bottom-projected.top;
    const rect=n=>{const a=n.getBoundingClientRect();return {left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height};};
    const controls=Array.from(document.querySelectorAll('.gwe-showcase-caption,.gwe-showcase-tools,.gwe-showcase-orbit')).map(n=>({className:n.className,...rect(n)}));
    const overlap=controls.filter(n=>projected.left<n.right&&projected.right>n.left&&projected.top<n.bottom&&projected.bottom>n.top).map(n=>n.className);
    const buttons=Array.from(document.querySelectorAll('.gwe-showcase button')).map(n=>({label:n.textContent||n.getAttribute('aria-label'),...rect(n)}));
    return {viewport:{width:innerWidth,height:innerHeight},projected,vertices,controls,buttons,overlap,overflow:document.documentElement.scrollWidth>innerWidth,pose:{position:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),up:e.camera.up.toArray()},bounds:[b.min.toArray(),b.max.toArray()],composition:e._showcase.composition?JSON.parse(JSON.stringify(e._showcase.composition)):null,draw:{calls:e.renderer.info.render.calls,triangles:e.renderer.info.render.triangles}};
  });}
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.evaluate(()=>{
      const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;e.loadLesson(Object.assign({},p.FREE_BUILD_LESSON,{ground:{xMin:-6,xMax:6,zMin:-5,zMax:5,y:0,type:'grass'}}));e._entryAnim=null;e.flyMode=true;e.releaseInput();e.velocity.set(0,0,0);e._ambientMotionEnabled=false;
      const put=(x,y,z,type='stone',shape='cube',rotation=0)=>e.placeBlock(x,y,z,type,shape,rotation);
      for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)put(x,1,z);
      for(const x of [-2,2])for(const z of [-1,1]){put(x,2,z,'brick');put(x,3,z,'wood');put(x,4,z,'wood');}
      for(let x=-2;x<=2;x++)for(const z of [-1,1])put(x,5,z,'stone','halfB');
      for(let x=-1;x<=1;x++)put(x,1,2,'stone','halfB');put(-3,1,0,'stone','halfA',1);put(3,1,0,'stone','quarter',3);
      const positions=p.editableWorld(e).blocks.map(({x,y,z})=>({x,y,z}));e._builderSelection={blocks:positions};put(9,1,4,'diamond');
      (e._popBlocks||[]).forEach(m=>m.scale.set(1,1,1));e._popBlocks=[];e.camera.position.set(7.5,6.2,10);e.camera.lookAt(.4,2.9,.2);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);
      __ctx.updateMulti('geometryWorld',{measureResult:e.measureStructure(0,1,0,positions),sandboxDockCollapsed:false,builderPrintContext:{unitMm:12.5}});
    });
    result.buildingPose=await pose();result.modelBefore=await model();
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();await frames();
    const cases=[{width:1200,height:820,view:'perspective'},{width:390,height:844,view:'perspective'},{width:320,height:700,view:'perspective'},...['perspective','front','side','top'].map(view=>({width:844,height:390,view})),{width:667,height:375,view:'perspective'}];
    for(const c of cases){
      await page.setViewportSize({width:c.width,height:c.height});await page.getByRole('button',{name:c.view[0].toUpperCase()+c.view.slice(1),exact:true}).click();await frames();
      const capture={case:c,layout:await layout(),screenshot:stage+'-'+c.view+'-'+c.width+'x'+c.height+'.png'};await page.screenshot({path:path.join(out,capture.screenshot)});result.captures.push(capture);
      check(!capture.layout.overflow,'No overflow '+capture.screenshot);check(capture.layout.buttons.every(b=>b.height>=43.5),'44px buttons '+capture.screenshot);
      check(capture.layout.vertices.every(v=>v.x>=-.5&&v.x<=c.width+.5&&v.y>=-.5&&v.y<=c.height+.5&&v.z>=-1&&v.z<=1),'Model visible '+capture.screenshot);
      if(stage==='after')check(capture.layout.overlap.length===0,'Model clear of controls '+capture.screenshot);
    }
    await page.setViewportSize({width:844,height:390});await page.getByRole('button',{name:'Perspective',exact:true}).click();await frames();
    result.poseBeforeFiles=await pose();await page.getByRole('button',{name:'Use & export',exact:true}).click();await frames();result.poseWithFiles=await pose();check(JSON.stringify(result.poseBeforeFiles)===JSON.stringify(result.poseWithFiles),'Opening files preserves camera composition');
    const pending=page.waitForEvent('download');await page.locator('#gwe-showcase-files').getByRole('button',{name:'Save image',exact:true}).click();const download=await pending;await download.saveAs(path.join(out,stage+'-creation.png'));await page.waitForFunction(()=>!__geoWorldEngine._showcaseExporting);result.poseAfterImage=await pose();check(JSON.stringify(result.poseBeforeFiles)===JSON.stringify(result.poseAfterImage),'Image capture preserves camera composition');
    await page.getByRole('button',{name:'Close import and export',exact:true}).click();await frames();check(JSON.stringify(result.poseBeforeFiles)===JSON.stringify(await pose()),'Closing files preserves camera composition');
    if(stage==='after'){
      await page.evaluate(()=>{const c=__geoWorldEngine.renderer.domElement;window.__nativeImageEncode=c.toBlob;c.toBlob=function(callback,type){window.__nativeImageEncode.call(c,blob=>{window.__releaseImage=()=>{c.toBlob=window.__nativeImageEncode;delete window.__nativeImageEncode;delete window.__releaseImage;callback(blob);};},type);};});
      await page.getByRole('button',{name:'Use & export',exact:true}).click();const deferredDownload=page.waitForEvent('download');await page.locator('#gwe-showcase-files').getByRole('button',{name:'Save image',exact:true}).click();await page.waitForFunction(()=>typeof window.__releaseImage==='function');
      await page.getByRole('button',{name:'Close import and export',exact:true}).click();const heldPose=await pose();await page.getByRole('button',{name:'Top',exact:true}).click();await page.setViewportSize({width:667,height:375});await frames();
      result.deferredBefore=await page.evaluate(()=>({busy:__geoWorldEngine._showcaseExporting,pending:__geoWorldEngine._showcase.fitPending,view:__geoWorldEngine._showcase.view}));check(result.deferredBefore.busy&&result.deferredBefore.pending&&result.deferredBefore.view==='top','View and resize queue one fit while the encoder is pending');check(JSON.stringify(heldPose)===JSON.stringify(await pose()),'Pending encoding does not partly change the camera');
      await page.evaluate(()=>window.__releaseImage());const deferred=await deferredDownload;await deferred.saveAs(path.join(out,'after-deferred-creation.png'));await page.waitForFunction(()=>!__geoWorldEngine._showcaseExporting&&!__geoWorldEngine._showcase.fitPending);await frames();result.deferredAfter=await layout();
      check(result.deferredAfter.composition.view==='top'&&result.deferredAfter.overlap.length===0,'Encoder completion applies the latest top view and resized safe area');check(result.deferredAfter.vertices.every(v=>v.x>=0&&v.x<=667&&v.y>=0&&v.y<=375),'Deferred view remains in the resized viewport');
    }
    result.modelAfter=await model();check(JSON.stringify(result.modelBefore)===JSON.stringify(result.modelAfter),'Scene views preserve world, STL, retained selection, and history');
    await page.getByRole('button',{name:'Back to building',exact:true}).click();result.returnedPose=await pose();check(JSON.stringify(result.buildingPose)===JSON.stringify(result.returnedPose),'Building camera restored exactly');
    if(stage==='after'){
      await page.evaluate(()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;const meshes=e._builderSelection.blocks.map(b=>e.blocks[[b.x,b.y,b.z].join(',')]);meshes.forEach(m=>m.scale.set(.15,.15,.15));e._popBlocks=meshes;const button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Showcase creation');button.click();window.__popCanonical=p.creationGeometryBounds(e,e._builderSelection.blocks);});
      await page.getByRole('button',{name:'Studio',exact:true}).click();await frames();
      result.popBounds=await page.evaluate(()=>{const e=__geoWorldEngine,b=__popCanonical;return {canonical:[b.min.toArray(),b.max.toArray()],composition:e._showcase.composition?.bounds,floorY:e._showcase.studio.floor.position.y};});
      check(Math.abs(result.popBounds.floorY-result.popBounds.canonical[0][1]+.015)<1e-8,'Studio floor uses canonical placement height during pop');
      await page.getByRole('button',{name:'Back to building',exact:true}).click();
    }
    result.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.map(p=>p.diagnostics).filter(d=>d&&d.runnable===false));
  }catch(error){result.failures.push(error.stack);await page.screenshot({path:path.join(out,stage+'-failure.png')}).catch(()=>{});}
  finally{result.pass=result.failures.length===0&&result.errors.length===0&&result.consoleErrors.length===0&&!(result.shaderErrors||[]).length;fs.writeFileSync(path.join(out,stage+'-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({stage,pass:result.pass,failures:result.failures,errors:result.errors,captures:result.captures.length}));await browser.close();await new Promise(r=>server.close(r));if(!result.pass)process.exitCode=1;}
}).toString()+')();';
eval(harness);
