const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sourceDir=path.join(__dirname,'browser-source');fs.mkdirSync(sourceDir,{recursive:true});
const names=['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js'];
const frozen=new Map(names.map(name=>{const bytes=fs.readFileSync('stem_lab/'+name);fs.writeFileSync(path.join(sourceDir,name),bytes);return [path.resolve('stem_lab',name),bytes];}));
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen.get(file)||fs.readFileSync(file));');
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
harness+='('+(async function showcaseFilesReview(){
  const result={sources:Object.fromEntries(Array.from(frozen,([name,bytes])=>[path.basename(name),crypto.createHash('sha256').update(bytes).digest('hex')])),errors:[],consoleErrors:[],failures:[],captures:[]};
  const check=(ok,message)=>{if(!ok)result.failures.push(message);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true,acceptDownloads:true});page.setDefaultTimeout(30000);
  page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
  const shot=async name=>{const file=name+'.png';await page.screenshot({path:path.join(out,file)});return file;};
  const model=()=>page.evaluate(async()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,w=p.editableWorld(e).blocks,sel=p.selectionMeasurement(e);const hash=async buffer=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');return {world:JSON.stringify(w),worldStl:await hash(p.buildGeometryWorldStl(e,w).buffer),selected:sel&&JSON.stringify(sel.measurement.blocks),selectedStl:sel&&await hash(p.buildGeometryWorldStl(e,sel.measurement.blocks).buffer),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),camera:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),up:e.camera.up.toArray(),fov:e.camera.fov,scale:__ctx.toolData.geometryWorld.builderPrintContext?.unitMm,showcase:!!e._showcase,showcaseState:!!__ctx.toolData.geometryWorld.showcaseActive};});
  const sameModel=(a,b)=>['world','worldStl','selected','selectedStl','undo','redo'].every(k=>a[k]===b[k]);
  async function openFiles(){await page.getByRole('button',{name:'Use & export',exact:true}).click();await page.locator('#gwe-showcase-files').waitFor();}
  async function download(label,name){const pending=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const d=await pending;await d.saveAs(path.join(out,name));return {suggested:d.suggestedFilename(),file:name,size:fs.statSync(path.join(out,name)).size};}
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    result.fixture=await page.evaluate(()=>{
      const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure;e.loadLesson(Object.assign({},p.FREE_BUILD_LESSON,{ground:{xMin:-6,xMax:6,zMin:-5,zMax:5,y:0,type:'grass'}}));e._entryAnim=null;e.flyMode=true;e.releaseInput();e.velocity.set(0,0,0);e._ambientMotionEnabled=false;
      const put=(x,y,z,type='stone',shape='cube',rotation=0)=>e.placeBlock(x,y,z,type,shape,rotation);
      for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)put(x,1,z);
      for(const x of [-2,2])for(const z of [-1,1]){put(x,2,z,'brick');put(x,3,z,'wood');put(x,4,z,'wood');}
      for(let x=-2;x<=2;x++)for(const z of [-1,1])put(x,5,z,'stone','halfB');
      for(let x=-1;x<=1;x++)put(x,1,2,'stone','halfB');put(-3,1,0,'stone','halfA',1);put(3,1,0,'stone','quarter',3);
      const blocks=p.editableWorld(e).blocks;e._builderSelection={blocks:blocks.map(b=>({x:b.x,y:b.y,z:b.z}))};put(9,1,4,'diamond');e.refreshAllAO();e.blocksPlaced=blocks.length+1;
      e.camera.position.set(7.5,6.2,10);e.camera.lookAt(.4,2.9,.2);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);
      __ctx.updateMulti('geometryWorld',{worldActive:true,blocksPlaced:e.blocksPlaced,autoCycle:false,sandboxDockCollapsed:false,measureResult:null,builderPanel:'build',touchMode:false,builderPrintContext:{unitMm:12.5}});
      return {selectedBlocks:blocks.length,totalBlocks:blocks.length+1};
    });
    await page.waitForTimeout(600);result.building=await model();
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.getByRole('button',{name:'Studio',exact:true}).click();await openFiles();
    result.initialShowcase=await model();
    result.jsonDownload=await download('Download editable JSON','selected-creation.json');
    const json=JSON.parse(fs.readFileSync(path.join(out,'selected-creation.json'),'utf8'));result.json={schema:json.schema,blocks:json.blocks.length,types:[...new Set(json.blocks.map(b=>b.type))],minY:Math.min(...json.blocks.map(b=>b.y))};
    check(json.schema==='alloflow-geometry-world/2'&&json.blocks.length===result.fixture.selectedBlocks&&!json.blocks.some(b=>b.type==='diamond'),'Editable download contains only selected student blocks in the existing import format');
    result.jsonValidation=await page.evaluate(json=>StemLab.geometryWorldBuilderPure.normalizeEditableWorld(json),json);check(result.jsonValidation.ok,'Exported JSON validates for re-import');
    result.stlDownload=await download('Download STL','selected-creation-mm.stl');
    const stl=fs.readFileSync(path.join(out,'selected-creation-mm.stl'));result.stl=await page.evaluate(bytes=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,m=p.selectionMeasurement(e).measurement,b=p.buildGeometryWorldStl(e,m.blocks),original=new DataView(b.buffer),actual=new DataView(new Uint8Array(bytes).buffer);let error=0,normalsMatch=true;for(let i=0;i<original.getUint32(80,true);i++){for(let j=0;j<12;j+=4)normalsMatch=normalsMatch&&actual.getFloat32(84+i*50+j,true)===original.getFloat32(84+i*50+j,true);for(let j=12;j<48;j+=4)error=Math.max(error,Math.abs(actual.getFloat32(84+i*50+j,true)-original.getFloat32(84+i*50+j,true)*12.5));}return {maxVertexError:error,normalsMatch,triangles:actual.getUint32(80,true),expectedTriangles:original.getUint32(80,true),header:String.fromCharCode(...bytes.slice(0,80))};},Array.from(stl));
    check(result.stl.maxVertexError<1e-4&&result.stl.normalsMatch&&result.stl.triangles===result.stl.expectedTriangles,'STL applies12.5mm scale exactly once to selected vertices and preserves normals');
    result.afterDownloads=await model();check(sameModel(result.initialShowcase,result.afterDownloads)&&result.afterDownloads.showcase,'JSON/STL downloads preserve the complete world, selected geometry, history, and Showcase');
    check(await page.evaluate(()=>!window.__alloPrintLabPendingHandoff&&!window.__alloGeometryWorldReturnProject),'Direct downloads do not create handoff state');
    for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:700},{width:844,height:390}]){
      await page.setViewportSize(size);await page.waitForTimeout(300);await page.locator('.gwe-files-body').evaluate(n=>n.scrollTop=0);
      const layout=await page.evaluate(()=>{const p=document.getElementById('gwe-showcase-files'),r=p.getBoundingClientRect(),body=p.querySelector('.gwe-files-body');return {x:r.x,y:r.y,width:r.width,height:r.height,inBounds:r.x>=0&&r.y>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,overflow:document.documentElement.scrollWidth>innerWidth,bodyScrolls:body.scrollHeight>body.clientHeight,buttons:Array.from(p.querySelectorAll('button')).map(n=>({text:n.textContent,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width}))};});
      check(layout.inBounds&&!layout.overflow&&layout.buttons.every(b=>b.height>=43.5),'Panel fits and controls stay44px at'+size.width+'x'+size.height);
      result.captures.push({size,layout,screenshot:await shot('files-'+size.width+'x'+size.height)});
    }
    await page.setViewportSize({width:390,height:844});await page.locator('#gwe-showcase-files').focus();await page.keyboard.press('Shift+Tab');check(await page.evaluate(()=>document.activeElement.textContent==='Save image'),'Shift+Tab from the panel wraps to its last visible control');
    await page.keyboard.press('Tab');check(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')==='Close import and export'),'Tab wraps to panel Close');
    await page.keyboard.press('Escape');check(await page.evaluate(()=>!!__geoWorldEngine._showcase&&document.activeElement.id==='gwe-showcase-files-trigger'),'Escape closes files and returns focus without leaving Showcase');await openFiles();
    await page.locator('input[type=file]').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad')});await page.locator('#gwe-showcase-files [role=alert]').waitFor();result.invalid=await model();check(sameModel(result.afterDownloads,result.invalid)&&result.invalid.showcase,'Invalid input leaves the creation unchanged in Showcase');
    await page.locator('input[type=file]').setInputFiles(path.join(out,'selected-creation.json'));await page.getByRole('button',{name:'Replace current sandbox',exact:true}).waitFor();result.beforeCancel=await model();check(sameModel(result.afterDownloads,result.beforeCancel),'Valid file preview does not change the world');
    result.importPreview=await shot('import-preview-390x844');await page.getByRole('button',{name:'Cancel',exact:true}).click();check(sameModel(result.beforeCancel,await model()),'Cancelling import preserves current world and history');check(await page.evaluate(()=>document.activeElement.textContent==='Choose editable JSON'),'Cancel returns focus to Choose editable JSON');await page.keyboard.press('Escape');check(await page.locator('#gwe-showcase-files').count()===0&&(await model()).showcase,'Escape after Cancel closes only the file panel');await page.getByRole('button',{name:'Use & export',exact:true}).click();
    // Print Lab is reached from the live presentation and must capture the prior editing view.
    await page.getByRole('button',{name:'Open in Print Lab',exact:true}).click();await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();result.printScale=await page.evaluate(()=>__ctx.toolData.printLab.unitMm);check(result.printScale===12.5,'Print Lab retains selected print scale');
    await page.getByRole('button',{name:'Revise in Geometry World',exact:true}).click();await page.waitForFunction(()=>!!window.__geoWorldEngine&&!window.__alloGeometryWorldReturnProject&&!window.__alloGeometryWorldPendingBuild);await page.waitForTimeout(350);
    result.returned=await model();check(sameModel(result.building,result.returned),'Print Lab Revise preserves selected and unrelated blocks, STL, and complete history');check(!result.returned.showcase&&!result.returned.showcaseState,'Revise returns to building with no stale Showcase');check(JSON.stringify(result.returned.camera)===JSON.stringify(result.building.camera)&&JSON.stringify(result.returned.quaternion)===JSON.stringify(result.building.quaternion),'Revise restores the original building camera');
    // Reopen presentation and explicitly replace it with the downloaded editable creation.
    await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await openFiles();await page.locator('input[type=file]').setInputFiles(path.join(out,'selected-creation.json'));await page.getByRole('button',{name:'Replace current sandbox',exact:true}).click();await page.waitForFunction(()=>!__geoWorldEngine._showcase&&!__ctx.toolData.geometryWorld.showcaseActive);
    result.imported=await page.evaluate(()=>({world:StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine),undo:__geoWorldEngine._undoStack.length,redo:__geoWorldEngine._redoStack.length,showcase:!!__geoWorldEngine._showcase,panel:__ctx.toolData.geometryWorld.builderPanel}));
    check(JSON.stringify(result.imported.world.blocks)===JSON.stringify(json.blocks)&&result.imported.undo===0&&result.imported.redo===0,'Confirmed import roundtrips every selected block and starts the documented new history baseline');
    result.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics));check(!result.errors.length&&!result.consoleErrors.length&&!result.shaderErrors.length,'No browser, console or shader errors');result.pass=!result.failures.length;
  }catch(e){result.failure=e.stack;result.pass=false;await shot('failure').catch(()=>{});}
  finally{const file=path.join(out,'browser-results.json'),text=JSON.stringify(result,null,2);if(fs.existsSync(file)){const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));fs.closeSync(fd);}else fs.writeFileSync(file,text);console.log(JSON.stringify({pass:result.pass,failures:result.failures,failure:result.failure,errors:result.errors,captures:result.captures.length}));await browser.close();await new Promise(r=>server.close(r));if(!result.pass)process.exitCode=1;}
}).toString()+')();';
eval(harness);
