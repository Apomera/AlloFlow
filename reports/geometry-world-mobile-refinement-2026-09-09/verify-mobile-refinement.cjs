// Matched before/after local React + actual Three WebGL capture, one browser.
// Usage: node this-file.cjs before|after. Only report artifacts are written.
const fs=require('node:fs');
const phase=process.argv[2]||'before';if(!['before','after'].includes(phase))throw Error('Use before or after');
const prior=fs.readFileSync('reports/geometry-world-focus-2026-09-09/verify-focus-final.cjs','utf8');
const fixtureHelper=prior.slice(prior.indexOf('  async function installFixture(kind)'),prior.indexOf('  try{'));
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('let html =',`const frozen={},sourceHashes={};for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js']){const live=path.join(root,'stem_lab',name),source=phase==='before'?path.join(out,'before-source',name):live;frozen[live]=fs.readFileSync(source);sourceHashes[name]=require('node:crypto').createHash('sha256').update(frozen[live]).digest('hex');} console.log('Frozen '+phase+' source '+JSON.stringify(sourceHashes));\nlet html =`);
harness=harness.replace('res.end(fs.readFileSync(file));','res.end(frozen[file]||fs.readFileSync(file));');
harness=harness.replace('__mount({_introShownOnce:true})','__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false})');
harness+='('+(async function mobileRefinement(){
  const result={phase,sourceHashes,scope:'Matched actual local React/Three WebGL; DPR1; 44-block off-center fractional pavilion plus one unrelated authored block',errors:[],consoleErrors:[],failures:[],viewports:[]};
  const check=(ok,message)=>{if(!ok)result.failures.push(message);};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true});page.setDefaultTimeout(30000);
  page.on('pageerror',error=>result.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});
  const frames=(n=2)=>page.evaluate(n=>new Promise(resolve=>{let i=0;function tick(){if(++i>=n)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}),n);
  const stable=async()=>{await page.waitForTimeout(550);await page.waitForFunction(()=>{const f=window.__geoWorldEngine?._creationFocus;return !f||(!!f.frame&&!f.transition);},{},{timeout:30000});await frames();};
  const shot=name=>page.screenshot({path:path.join(out,phase+'-'+name+'.png'),timeout:60000});
  async function expand(value){const b=page.getByRole('button',{name:value?'Expand Free Build Studio':'Collapse Free Build Studio',exact:true});if(await b.count())await b.click();}
  async function clickAction(name){await expand(true);const b=page.getByRole('button',{name,exact:true});await b.scrollIntoViewIfNeeded();await b.click();}
  const signature=()=>page.evaluate(()=>__mobileSignature());
  async function layout(){return page.evaluate(()=>{
    const en=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure,canvas=en.renderer.domElement.getBoundingClientRect(),selection=pure.selectionMeasurement(en),points=[];
    en.camera.updateMatrixWorld(true);for(const p of selection.measurement.blocks){const m=en.blocks[[p.x,p.y,p.z].join(',')],a=m.geometry.attributes.position;m.updateMatrixWorld(true);for(let i=0;i<a.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(m.matrixWorld).project(en.camera).toArray());}
    const minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
    const creation={x:canvas.x+(minX+1)*canvas.width/2,y:canvas.y+(1-maxY)*canvas.height/2,width:(maxX-minX)*canvas.width/2,height:(maxY-minY)*canvas.height/2,minX,maxX,minY,maxY,minZ:Math.min(...points.map(p=>p[2])),maxZ:Math.max(...points.map(p=>p[2]))};
    const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {x:r.x,y:r.y,width:r.width,height:r.height,visible:s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.width>0&&r.height>0};};
    const intersects=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1;
    const obstacles=[];for(const selector of ['.gw-hotbar','.gw-shape-tray','.gw-action-bar','.gw-touch-actions','.gw-touch-joystick','.gw-touch-look-panel','.gwe-builder-dock','.gwe-focus-return','.gw-measure-card']){const r=rect(document.querySelector(selector));if(r?.visible)obstacles.push({selector,...r,overlap:intersects(creation,r)});}
    const controls=[];document.querySelectorAll('.gw-touch-actions button,.gw-action-bar button,.gwe-focus-return button,.gw-measure-card button,.gw-measure-card summary,.gwe-builder-toggle,.gw-hotbar button,.gw-shape-tray button').forEach(node=>{const r=rect(node);if(!r?.visible)return;const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);controls.push({kind:node.closest('.gw-touch-actions')?'touch':node.closest('.gw-action-bar')?'utility':node.closest('.gwe-focus-return')?'return':node.closest('.gw-measure-card')?'inspector':'other',name:node.getAttribute('aria-label')||node.textContent.trim(),...r,disabled:!!node.disabled,hit:!!hit&&(node===hit||node.contains(hit)),inViewport:r.x>=0&&r.y>=0&&r.x+r.width<=innerWidth+.5&&r.y+r.height<=innerHeight+.5,outline:getComputedStyle(node).outlineWidth,focused:document.activeElement===node});});
    const inspector=document.querySelector('.gw-measure-card'),ir=rect(inspector),body=document.querySelector('.gw-measure-body');
    const focus=en._creationFocus,fr=focus?.frame?.rect;
    return {viewport:{width:innerWidth,height:innerHeight},canvas:rect(en.renderer.domElement),creation,clearRect:fr?{...fr,width:(fr.right-fr.left)*canvas.width/2,height:(fr.top-fr.bottom)*canvas.height/2}:null,controls,obstacles,inspector:ir?{...ir,scrollHeight:inspector.scrollHeight,clientHeight:inspector.clientHeight,bodyScrollHeight:body?.scrollHeight,bodyClientHeight:body?.clientHeight,text:inspector.innerText,disclosures:Array.from(inspector.querySelectorAll('details')).map(d=>({open:d.open,summary:d.querySelector('summary')?.textContent}))}:null,focus:focus?{manual:focus.manual,transition:!!focus.transition}:null,overflow:document.documentElement.scrollWidth>innerWidth,activeElement:document.activeElement?.getAttribute('aria-label')||document.activeElement?.textContent?.slice(0,70),camera:{position:en.camera.position.toArray(),quaternion:en.camera.quaternion.toArray(),fov:en.camera.fov}};
  });}
  /* FIXTURE_HELPER */
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine?._currentLesson?.sandbox);
    result.fixture=await installFixture('offcenter');await frames();await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._builderSelection?.blocks.length===44);
    await page.evaluate(()=>{window.__mobileEngine=__geoWorldEngine;window.__mobileSignature=async()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,m=p.selectionMeasurement(e).measurement,b=p.buildGeometryWorldStl(e,m.blocks);return {world:JSON.stringify(p.editableWorld(e).blocks),selection:JSON.stringify(m.blocks),count:m.count,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b.buffer))).map(x=>x.toString(16).padStart(2,'0')).join(''),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),placed:e.blocksPlaced};};});
    let baseline=result.initial=await signature();
    for(const size of [{width:320,height:700},{width:390,height:844},{width:844,height:390},{width:1440,height:900}]){
      const label=size.width+'x'+size.height,row={size,label};result.viewports.push(row);console.log(phase+' '+label);
      await page.setViewportSize(size);await stable();check(await page.evaluate(()=>__geoWorldEngine===__mobileEngine),label+': same engine across resize');
      await page.evaluate(()=>{const e=__geoWorldEngine,p=__focusFixture.aim;e._entryAnim=null;e._viewPresetAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.up.set(0,1,0);__aimAt(p.x,p.y,p.z);e.camera.updateMatrixWorld(true);});
      await clickAction('Explore measurements');await page.getByRole('region',{name:'Measurement inspector',exact:true}).waitFor();await stable();row.inspector=await layout();await shot('measure-'+label);
      if(phase==='after'){
        const card=page.getByRole('region',{name:'Measurement inspector',exact:true}),summary=card.locator('summary').filter({hasText:'Explore measurement details'});
        row.inspectorState=await card.evaluate(node=>({compact:node.dataset.measurementCompact,open:node.dataset.detailsOpen,volume:node.innerText.includes('Occupied volume'),dimensions:node.querySelectorAll('.gw-measure-dimension').length===3&&['Length','Width','Height'].every(label=>node.innerText.includes(label))}));
        if(size.width<=390)check(row.inspectorState.compact==='true',label+': portrait phone uses compact measurement summary');
        if(row.inspectorState.compact==='true'){
          check(row.inspectorState.compact==='true'&&row.inspectorState.open==='false',label+': phone inspector starts with concise summary');
          check(row.inspectorState.volume&&row.inspectorState.dimensions,label+': dimensions and occupied volume remain visible');
          check(row.inspector.inspector.height<=240.5,label+': collapsed inspector has a compact natural height');
          await summary.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.gw-measure-card')?.dataset.detailsOpen==='true');
          const slider=card.getByRole('slider').first();await slider.scrollIntoViewIfNeeded();await slider.focus();
          const beforeValue=await slider.inputValue(),min=Number(await slider.getAttribute('min')),max=Number(await slider.getAttribute('max'));await page.keyboard.press(Number(beforeValue)<max?'ArrowRight':'ArrowLeft');
          const afterValue=await slider.inputValue();row.inspectorSlider={before:beforeValue,after:afterValue,min,max};check(beforeValue!==afterValue,label+': expanded layer slider works with keyboard');
          row.expanded=await layout();check(row.expanded.inspector.height<=size.height-135,label+': expanded inspector remains inside its viewport cap');
          if(size.width===320||size.width===390)await shot('measure-expanded-'+label);
          if(size.width===320){
            const previousState=await signature();
            await page.evaluate(()=>{const e=__geoWorldEngine,p=__focusFixture.aim;if(!e.placeBlock(p.x+1,6,p.z+1,'gold','quarter',3))throw Error('Live edit fixture block failed');e.blocksPlaced++;__ctx.updateMulti('geometryWorld',{blocksPlaced:e.blocksPlaced});});
            await page.waitForFunction(()=>__ctx.toolData.geometryWorld.measureResult?.count===45);row.liveEditExpanded=await card.getAttribute('data-details-open');check(row.liveEditExpanded==='true',label+': connected edit does not collapse open inspector details');
            await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press('Control+z');await page.waitForFunction(()=>__ctx.toolData.geometryWorld.measureResult?.count===44);await stable();
            check(await card.getAttribute('data-details-open')==='true',label+': keyboard Undo also leaves details expanded');
            const afterUndo=await signature();check(previousState.world===afterUndo.world&&previousState.hash===afterUndo.hash&&previousState.undo===afterUndo.undo,label+': intentional connected edit and keyboard Undo restore exact model and prior undo stack');
            baseline=afterUndo;result.intentionalEditCheckpoint=afterUndo;
          }
          await summary.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.gw-measure-card')?.dataset.detailsOpen==='false');
        }else{
          check(row.inspectorState.compact==='false',label+': wider inspector keeps its tools expanded');
          check(await card.getByRole('slider').first().isVisible(),label+': wider layer tools remain directly visible');
        }
      }
      const close=page.getByRole('button',{name:'Close measurement inspector',exact:true});await close.focus();row.inspectorCloseFocus=await close.evaluate(node=>({focused:document.activeElement===node,outline:getComputedStyle(node).outlineWidth}));await page.keyboard.press('Enter');await page.waitForFunction(()=>!document.querySelector('.gw-measure-card'));
      check(row.inspectorCloseFocus.focused,label+': inspector close accepts keyboard focus');
      await clickAction('Focus creation');await stable();row.focused=await layout();await shot('focus-'+label);
      check(!row.focused.overflow,label+': no page overflow');check(row.focused.creation.minX>-1&&row.focused.creation.maxX<1&&row.focused.creation.minY>-1&&row.focused.creation.maxY<1&&row.focused.creation.minZ>-1&&row.focused.creation.maxZ<1,label+': every actual selected vertex fits');
      if(phase==='after'){check(row.focused.obstacles.every(o=>!o.overlap),label+': focused creation remains clear of controls');const primary=row.focused.controls.filter(c=>['touch','utility','return'].includes(c.kind));row.primary=primary;check(primary.every(c=>c.hit&&c.inViewport&&c.width>=43.5&&c.height>=43.5),label+': primary controls are reachable at 44px or larger');}
      if(phase==='after'&&size.width===320){
        await page.getByRole('button',{name:'Undo last action',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._redoStack.length>0);await stable();row.withRedo=await layout();
        const utilities=row.withRedo.controls.filter(c=>c.kind==='utility');row.utilitiesWithRedo=utilities;
        check(utilities.length===5,label+': all five utility actions are present with Redo');
        check(utilities.every(c=>c.hit&&c.inViewport&&c.width>=43.5&&c.height>=43.5),label+': all five utility controls remain reachable at44px or larger');
        const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1;
        const primary=row.withRedo.controls.filter(c=>['touch','utility','return'].includes(c.kind));
        check(primary.every((a,i)=>primary.every((b,j)=>i===j||!overlap(a,b))),label+': no primary control rectangles overlap with Undo and Redo visible');
        await shot('utilities-with-redo-'+label);await page.getByRole('button',{name:'Redo last action',exact:true}).click();await stable();
        check(JSON.stringify(baseline)===JSON.stringify(await signature()),label+': real Undo/Redo restores exact world, selected STL and history');
      }
      const previous=page.getByRole('button',{name:'Previous view',exact:true});await previous.focus();row.previousFocus=await previous.evaluate(node=>({focused:document.activeElement===node,outline:getComputedStyle(node).outlineWidth}));await page.keyboard.press('Enter');await stable();row.returned=await layout();
      check(row.previousFocus.focused,label+': Previous view accepts keyboard focus');check(JSON.stringify(baseline)===JSON.stringify(await signature()),label+': measurements/focus/return preserve exact selected STL, world and history');
    }
    if(phase==='after'){
      await stable();await page.waitForTimeout(300);
      await page.evaluate(()=>{const e=__geoWorldEngine;window.__mobileOriginalMeasure=e.measureStructure;window.__mobileIdleMeasures=0;e.measureStructure=function(){window.__mobileIdleMeasures++;return __mobileOriginalMeasure.apply(this,arguments);};});
      await page.waitForTimeout(700);result.idleWarmupCalls=await page.evaluate(()=>{const n=__mobileIdleMeasures;window.__mobileIdleMeasures=0;return n;});
      await page.waitForTimeout(1250);
      result.idleTraversalCalls=await page.evaluate(()=>{const e=__geoWorldEngine,n=__mobileIdleMeasures;e.measureStructure=__mobileOriginalMeasure;delete window.__mobileOriginalMeasure;return n;});
      check(result.idleTraversalCalls===0,'Unchanged selected build triggers zero structure traversals across five idle polls');
    }
    result.final=await signature();result.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics));check(!result.errors.length&&!result.consoleErrors.length&&!result.shaderErrors.length,'No page, console or shader errors');result.pass=!result.failures.length;
  }catch(error){result.failure=error.stack;result.pass=false;await shot('failure').catch(()=>{});}
  finally{const target=path.join(out,phase+'-results.json'),content=JSON.stringify(result,null,2);if(fs.existsSync(target)){const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,content);fs.ftruncateSync(fd,Buffer.byteLength(content));fs.closeSync(fd);}else fs.writeFileSync(target,content);console.log(JSON.stringify({phase,pass:result.pass,failure:result.failure,failures:result.failures,viewports:result.viewports.map(v=>({label:v.label,creation:v.focused?.creation,clearRect:v.focused?.clearRect,inspectorHeight:v.inspector?.inspector?.height}))},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));if(!result.pass)process.exitCode=1;}
}).toString().replace('/* FIXTURE_HELPER */',fixtureHelper)+')();';
eval(harness);
