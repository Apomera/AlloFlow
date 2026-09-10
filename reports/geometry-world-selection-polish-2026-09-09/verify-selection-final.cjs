// Read-only source baseline: actual React + Three.js UI, a controlled authored fixture.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('let html =',`const frozen={}; for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js','stem_tool_printlab.js']) frozen[path.join(root,'stem_lab',name)]=fs.readFileSync(path.join(out,'after-source',name));\nlet html =`);
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen[file]||fs.readFileSync(file));');
harness=harness.replace('__mount({_introShownOnce:true})','__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false})');
const previous=fs.readFileSync('reports/geometry-world-focus-2026-09-09/verify-focus-final.cjs','utf8');
const fixtureHelper=previous.slice(previous.indexOf('  async function installFixture(kind)'),previous.indexOf('  try{'));
let run='('+(async function selectionBaseline(){
  const result={scope:'Frozen-source baseline in one actual React/Three WebGL browser; fixture camera is controlled, all selection/dock/measurement/Print Lab actions are actual UI',sources:{},errors:[],consoleErrors:[],failures:[],cases:[]};
  for(const [file,bytes] of Object.entries(frozen))result.sources[path.basename(file)]=require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  const check=(ok,message)=>{if(!ok)result.failures.push(message);};
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true,acceptDownloads:true});
  page.setDefaultTimeout(30000);
  page.on('pageerror',e=>result.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());});
  const shot=async name=>{const filename='after-'+name+'.png';await page.screenshot({path:path.join(out,filename),timeout:60000});return filename;};
  async function expand(value){const b=page.getByRole('button',{name:value?'Expand Free Build Studio':'Collapse Free Build Studio',exact:true});if(await b.count())await b.click();}
  async function click(name){await expand(true);const b=page.getByRole('button',{name,exact:true});await b.scrollIntoViewIfNeeded();await b.click();}
  async function snapshot(){return page.evaluate(()=>{
    const e=__geoWorldEngine,visible=o=>o&&o.visible!==false&&(!o.parent||visible(o.parent));
    const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,width:r.width,height:r.height,visible:s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};};
    const helpers=[];e.scene.traverse(o=>{if(o.type==='Box3Helper'||o.userData.gwSelectionFrame)helpers.push({type:o.type,name:o.name,needsReview:o.userData.needsReview,vertices:o.geometry?.attributes.position?.count,visible:visible(o),color:o.material?.color?.getHexString(),opacity:o.material?.opacity,depthTest:o.material?.depthTest,renderOrder:o.renderOrder});});
    const counts={};for(const key of ['_dimLines','_selectionGlows','_layerGhosts','_angleHelpers','_netHelpers'])counts[key]={all:(e[key]||[]).length,visible:(e[key]||[]).filter(visible).length};
    const buttons=Array.from(document.querySelectorAll('.gwe-builder-dock button,.gw-measure-close')).map(n=>{const r=rect(n),b=n.getBoundingClientRect(),top=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2),s=getComputedStyle(n);return {name:n.getAttribute('aria-label')||n.textContent.trim(),disabled:n.disabled,rect:r,hit:!!(top&&(top===n||n.contains(top))),fontSize:s.fontSize,color:s.color,background:s.backgroundColor};});
    const d=document.querySelector('.gwe-builder-dock'),m=document.querySelector('.gw-measure-card');
    return {selectionCount:e._builderSelection?.blocks?.length||0,measureCount:__ctx.toolData.geometryWorld.measureResult?.count||null,dockText:d?.innerText,dock:rect(d),dockCollapsed:__ctx.toolData.geometryWorld.sandboxDockCollapsed,inspector:rect(m),inspectorText:m?.innerText||null,axes:Array.from(document.querySelectorAll('.gwe-print-axis')).map(n=>({axis:n.dataset.axis,over:n.dataset.over,value:n.querySelector('strong').textContent,text:n.textContent})),envelope:document.querySelector('[aria-label="Print Lab block envelope"]')?.textContent,helpers,counts,buttons,overflow:document.documentElement.scrollWidth>innerWidth,camera:{position:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),fov:e.camera.fov},shaderErrors:e.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics)};
  });}
  async function signature(){return page.evaluate(async()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,m=p.selectionMeasurement(e).measurement,b=p.buildGeometryWorldStl(e,m.blocks);return {world:JSON.stringify(p.editableWorld(e).blocks),selection:JSON.stringify(m.blocks),count:m.count,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b.buffer))).map(x=>x.toString(16).padStart(2,'0')).join(''),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack)};});}

  async function settled(){await page.waitForTimeout(550);await page.waitForFunction(()=>!__geoWorldEngine._creationFocus?.transition);}
  async function viewFit(){return page.evaluate(()=>{const e=__geoWorldEngine,pts=[],p=StemLab.geometryWorldBuilderPure.selectionMeasurement(e).measurement.blocks;e.camera.updateMatrixWorld(true);for(const b of p){const m=e.blocks[[b.x,b.y,b.z].join(',')],a=m.geometry.attributes.position;m.updateMatrixWorld(true);for(let i=0;i<a.count;i++)pts.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld).project(e.camera));}return {minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minY:Math.min(...pts.map(p=>p.y)),maxY:Math.max(...pts.map(p=>p.y)),minZ:Math.min(...pts.map(p=>p.z)),maxZ:Math.max(...pts.map(p=>p.z))};});}
  function fits(r){return r.minX>-1&&r.maxX<1&&r.minY>-1&&r.maxY<1&&r.minZ>-1&&r.maxZ<1;}
  // FIXTURE_HELPER
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.waitForFunction(()=>window.__geoWorldEngine?._currentLesson?.sandbox===true);
    result.fixture=await installFixture('offcenter');
    await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
    await page.waitForFunction(()=>__geoWorldEngine._builderSelection?.blocks?.length===44);
    result.initial=await signature();
    for(const size of [{width:1440,height:900},{width:390,height:844}]){
      console.log('Baseline '+size.width+'x'+size.height);
      const row={size,screenshots:[]};result.cases.push(row);await page.setViewportSize(size);await page.waitForTimeout(700);
      // A fixed per-aspect overview pose preserves every production helper.
      await page.evaluate(phone=>{const e=__geoWorldEngine;e._entryAnim=null;e._viewPresetAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(phone?48:45,phone?14:11,phone?-7:-12);e.camera.up.set(0,1,0);e.camera.lookAt(34,3,-25);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);},size.width<600);
      await expand(true);await page.waitForTimeout(350);row.expanded=await snapshot();row.screenshots.push(await shot('dock-'+size.width+'x'+size.height));
      check(row.expanded.selectionCount===44,'Selected dock count remains44 at '+size.width);check(!row.expanded.overflow,'No horizontal overflow at '+size.width);
      for(const name of ['Select and measure aimed build','Send selected build to Print Lab']){const b=row.expanded.buttons.find(x=>x.name===name);check(b&&!b.disabled&&b.hit&&b.rect.height>=44,name+' is enabled and hit-testable at '+size.width);}
      const send=page.getByRole('button',{name:'Send selected build to Print Lab',exact:true});await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).focus();await page.keyboard.press('Tab');row.keyboardFocus=await send.evaluate(n=>{const s=getComputedStyle(n);return {active:document.activeElement===n,outline:s.outline,boxShadow:s.boxShadow};});check(row.keyboardFocus.active&&row.keyboardFocus.outline.includes('solid'),'Send takes visible keyboard focus at '+size.width);
      await click('Explore measurements');await page.waitForTimeout(350);row.measuring=await snapshot();row.screenshots.push(await shot('measurement-'+size.width+'x'+size.height));
      const close=page.getByRole('button',{name:'Close measurement inspector',exact:true});row.closeTarget=await close.evaluate(n=>{const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,hit:n===top||n.contains(top)};});check(row.closeTarget.height>=44&&row.closeTarget.hit,'Measurement Close has an accessible44px target at '+size.width);
      if(size.width===390){const details=page.locator('.gw-measure-card summary');await details.focus();await page.keyboard.press('Enter');await page.waitForTimeout(200);row.expandedMeasurement=await snapshot();row.screenshots.push(await shot('measurement-expanded-'+size.width+'x'+size.height));check(!row.expandedMeasurement.overflow,'Expanded phone measurement has no page overflow');}
      await page.getByRole('button',{name:'Close measurement inspector',exact:true}).click();await page.waitForTimeout(350);row.closed=await snapshot();row.screenshots.push(await shot('selection-'+size.width+'x'+size.height));
      check(row.closed.selectionCount===44&&row.closed.measureCount===null,'Closing inspector keeps the44-block selection at '+size.width);

      check(row.closed.helpers.length===1&&row.closed.helpers[0].name==='gwe-selection-frame'&&row.closed.helpers[0].vertices===48,'One24-segment corner frame replaces the box cage at '+size.width);
      await click('Focus creation');await settled();row.focused=await snapshot();row.focusFit=await viewFit();check(fits(row.focusFit),'Focus fits selected fractional geometry at '+size.width);row.screenshots.push(await shot('focus-'+size.width+'x'+size.height));
      // Record every render while the real Showcase action enters/leaves and exports.
      await page.evaluate(()=>{const e=__geoWorldEngine,render=e.renderer.render;window.__frameFlashes=0;e.renderer.render=function(){if(e._showcase&&e._builderSelectionFrame?.visible)__frameFlashes++;return render.apply(this,arguments);};});
      await click('Showcase creation');await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor();row.showcase={};
      for(const look of ['Meadow','Studio']){
        await page.getByRole('button',{name:look,exact:true}).click();
        const hidden=await page.evaluate(()=>!__geoWorldEngine._builderSelectionFrame?.visible);check(hidden,look+' synchronously hides corner frame at '+size.width);
        row.showcase[look]={hidden,fit:await viewFit(),screenshot:await shot('showcase-'+look.toLowerCase()+'-'+size.width+'x'+size.height)};check(fits(row.showcase[look].fit),look+' fits geometry at '+size.width);
      }
      if(size.width===390){
        const pose=await snapshot(),downloadPromise=page.waitForEvent('download',{timeout:120000});await page.getByRole('button',{name:'Save image',exact:true}).click();const download=await downloadPromise;const pngFile='after-studio-export-phone.png';await download.saveAs(path.join(out,pngFile));const bytes=fs.readFileSync(path.join(out,pngFile));row.showcase.export={filename:pngFile,bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),png:bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))};check(row.showcase.export.png&&Math.max(row.showcase.export.width,row.showcase.export.height)>=1600,'Phone Save image exports a genuine high-resolution PNG');check(JSON.stringify(pose.camera)===JSON.stringify((await snapshot()).camera),'PNG export restores the exact Showcase camera');
      }
      row.showcase.flashes=await page.evaluate(()=>__frameFlashes);check(row.showcase.flashes===0,'Corner frame never renders in Showcase, including entry and export at '+size.width);
      await page.getByRole('button',{name:'Back to building',exact:true}).click();await settled();row.showcase.returned=await snapshot();check(row.showcase.returned.helpers[0]?.visible,'Showcase restores corner-frame visibility at '+size.width);check(JSON.stringify(row.showcase.returned.camera)===JSON.stringify(row.focused.camera),'Showcase restores the exact focused camera at '+size.width);
      // Showcase deliberately releases Focus ownership; its entry camera was verified above.
      await expand(true);const clear=page.getByRole('button',{name:'Clear selection',exact:true});await clear.scrollIntoViewIfNeeded();row.clearTarget=await clear.evaluate(n=>{const r=n.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,hit:n===top||n.contains(top)};});check(row.clearTarget.height>=44&&row.clearTarget.hit,'Clear selection has an accessible44px hit target at '+size.width);
      const envelope=page.getByRole('region',{name:'Print Lab block envelope',exact:true});await envelope.scrollIntoViewIfNeeded();row.envelope=await snapshot();check(row.envelope.axes.map(a=>a.axis+':'+a.value).join(',')==='width:30,depth:20,height:25','Default envelope axes explicitly map physical width/depth/height at '+size.width);row.screenshots.push(await shot('envelope-'+size.width+'x'+size.height));
      await expand(false);
      row.signature=await signature();check(JSON.stringify(row.signature)===JSON.stringify(result.initial),'Dock/inspector actions preserve exact world, selected STL and history at '+size.width);
    }

    // Seed a retained real-school profile/scale: later actions stay real UI.
    await page.evaluate(()=>{__ctx.updateMulti('printLab',{profile:{bedWidthMm:100,bedDepthMm:70,bedHeightMm:80}});__ctx.updateMulti('geometryWorld',{builderPrintContext:{unitMm:20}});});await expand(true);await page.waitForTimeout(350);await page.getByRole('region',{name:'Print Lab block envelope',exact:true}).scrollIntoViewIfNeeded();result.customEnvelope=await snapshot();check(result.customEnvelope.axes.every(a=>a.over==='true')&&result.customEnvelope.axes.map(a=>a.value).join(',')==='120,80,100','Custom20mm scale labels each over-limit axis');result.customEnvelopeScreenshot=await shot('envelope-over-limit-390x844');
    await page.evaluate(()=>__ctx.updateMulti('printLab',{profile:{bedWidthMm:100,bedDepthMm:100,bedHeightMm:110}}));await page.waitForTimeout(350);result.singleOverEnvelope=await snapshot();check(result.singleOverEnvelope.axes.filter(a=>a.over==='true').map(a=>a.axis).join(',')==='width','Only the over-limit width is marked against an asymmetric bed');check(result.singleOverEnvelope.envelope.includes('width exceeds'),'Screen-reader singular over-limit message uses exceeds');
    await page.evaluate(()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,b=p.buildGeometryWorldStl(e,e._builderSelection.blocks);window.__baselineExpectedProject=p.captureProject(__ctx,e,'selection-baseline');window.__baselineExpectedBytes=Array.from(new Uint8Array(b.buffer));const change=__ctx.setStemLabTool;__ctx.setStemLabTool=function(id){if(id==='printLab'){const h=window.__alloPrintLabPendingHandoff;window.__baselineHandoff={bytes:Array.from(h.bytes),count:h.sourceModel.blocks.length,unitMm:h.unitMm};}return change.apply(this,arguments);};});
    await click('Send selected build to Print Lab');await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();await page.waitForTimeout(500);
    result.print={phoneScreenshot:await shot('print-entry-390x844'),phoneText:await page.locator('body').innerText(),transfer:await page.evaluate(()=>({exact:JSON.stringify(__baselineHandoff.bytes)===JSON.stringify(__baselineExpectedBytes),count:__baselineHandoff.count,bytes:__baselineHandoff.bytes.length,unitMm:__baselineHandoff.unitMm,storedUnit:__ctx.toolData.printLab.unitMm}))};
    check(result.print.transfer.exact&&result.print.transfer.count===44&&result.print.transfer.unitMm===20&&result.print.transfer.storedUnit===20,'Actual Send transfers exact44-block selected STL');
    await page.setViewportSize({width:1440,height:900});result.print.desktopScreenshot=await shot('print-entry-1440x900');
    await page.getByRole('button',{name:'Revise in Geometry World',exact:true}).click();await page.waitForFunction(()=>!!window.__geoWorldEngine&&!window.__alloGeometryWorldPendingBuild&&!window.__alloGeometryWorldReturnProject);await page.waitForTimeout(550);
    result.print.returned=await page.evaluate(()=>{const a=StemLab.geometryWorldBuilderPure.captureProject(__ctx,__geoWorldEngine,'selection-baseline'),b=__baselineExpectedProject;return {world:JSON.stringify(a.blocks)===JSON.stringify(b.blocks),selection:JSON.stringify(a.selection)===JSON.stringify(b.selection),undo:JSON.stringify(a.undo)===JSON.stringify(b.undo),redo:JSON.stringify(a.redo)===JSON.stringify(b.redo),blocks:a.blocks.length,unitMm:__ctx.toolData.geometryWorld.builderPrintContext.unitMm};});
    check(Object.entries(result.print.returned).filter(([k])=>k!=='blocks'&&k!=='unitMm').every(([,v])=>v===true)&&result.print.returned.blocks===45&&result.print.returned.unitMm===20,'Revise returns all45 authored blocks, selection and history');
    result.final=await signature();check(JSON.stringify(result.final)===JSON.stringify(result.initial),'Print Lab roundtrip preserves exact world, selected STL and history');
    check(!result.errors.length&&!result.consoleErrors.length,'No page or console errors');result.pass=!result.failures.length;
  }catch(e){result.failure=e.stack;result.pass=false;await shot('failure').catch(()=>{});}
  finally{const target=path.join(out,'after-results.json'),data=JSON.stringify(result,null,2);if(fs.existsSync(target)){const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,data);fs.ftruncateSync(fd,Buffer.byteLength(data));fs.closeSync(fd);}else fs.writeFileSync(target,data);console.log(JSON.stringify({pass:result.pass,failures:result.failures,failure:result.failure,errors:result.errors,consoleErrors:result.consoleErrors,cases:result.cases.map(c=>({size:c.size,screenshots:c.screenshots}))},null,2));await browser.close();await new Promise(r=>server.close(r));}
}).toString()+')();';
run=run.replace('// FIXTURE_HELPER',fixtureHelper);
harness+=run;
eval(harness);
