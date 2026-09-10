// Bounded actual React/Three WebGL verification. Run only after source-ready.
// Owns report artifacts only; fixture construction uses the production engine.
const fs=require('node:fs');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('__mount({_introShownOnce:true})','__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false})');
harness+='('+(async function verifyFocusCreation(){
  const result={scope:'One actual local React/Three WebGL browser; Focus creation, exact editor/print invariants; no app source edits',errors:[],consoleErrors:[],failures:[],cases:[]};
  const check=(ok,message)=>{if(!ok)result.failures.push(message);};
  const actionNames={focus:'Focus creation',restore:'Previous view'};
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true,acceptDownloads:true});
  page.setDefaultTimeout(30000);
  page.on('pageerror',error=>result.errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')result.consoleErrors.push(message.text());});
  const frames=(n=2)=>page.evaluate(n=>new Promise(resolve=>{let i=0;function tick(){if(++i>=n)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}),n);
  const stable=async()=>{await page.waitForTimeout(550);await page.waitForFunction(()=>{const f=window.__geoWorldEngine?._creationFocus;return !f||(!!f.frame&&!f.transition);},{},{timeout:30000});await frames();};
  const screenshot=name=>page.screenshot({path:path.join(out,'focus-'+name+'.png'),timeout:60000});
  const signature=()=>page.evaluate(()=>__focusSignature());
  const pose=()=>page.evaluate(()=>__focusPose());
  const exact=(before,after,label)=>check(JSON.stringify(before)===JSON.stringify(after),label);
  const cameraEqual=(a,b)=>['position','quaternion','up'].every(key=>a[key].every((v,i)=>Math.abs(v-b[key][i])<1e-6))&&['fov','far','near'].every(key=>Math.abs(a[key]-b[key])<1e-6)&&a.flyMode===b.flyMode;
  async function expand(value){const button=page.getByRole('button',{name:value?'Expand Free Build Studio':'Collapse Free Build Studio',exact:true});if(await button.count())await button.click();}
  async function clickAction(name){await expand(true);const button=page.getByRole('button',{name,exact:true});await button.scrollIntoViewIfNeeded();await button.click();}
  async function frame(){return page.evaluate(()=>{
    const en=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure,selected=pure.selectionMeasurement(en);en.camera.updateMatrixWorld(true);
    const points=[];selected.measurement.blocks.forEach(p=>{const mesh=en.blocks[[p.x,p.y,p.z].join(',')],a=mesh.geometry.attributes.position;mesh.updateMatrixWorld(true);for(let i=0;i<a.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).project(en.camera).toArray());});
    const canvas=en.renderer.domElement.getBoundingClientRect(),minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1]));
    return {count:selected.measurement.count,vertices:points.length,minX,maxX,minY,maxY,minZ:Math.min(...points.map(p=>p[2])),maxZ:Math.max(...points.map(p=>p[2])),canvas:{x:canvas.x,y:canvas.y,width:canvas.width,height:canvas.height},camera:__focusPose(),safeRect:en._showcase?null:en._creationFocus?.frame?.rect,manual:!!en._creationFocus?.manual,transitioning:!!en._creationFocus?.transition,dockCollapsed:!!__ctx.toolData.geometryWorld.sandboxDockCollapsed,overflow:document.documentElement.scrollWidth>innerWidth,engineValid:!en._destroyed&&!en._runtimeFailed,activeElement:document.activeElement?.id||document.activeElement?.getAttribute('aria-label')};
  });}
  function checkFrame(row,label){check(row.minX>-0.99&&row.maxX<0.99&&row.minY>-0.99&&row.maxY<0.99&&row.minZ>-1&&row.maxZ<1,label+': every actual mesh vertex fits the camera frustum');check(!row.overflow&&row.engineValid,label+': no page overflow or engine teardown');if(row.safeRect){const r=row.safeRect;check(row.minX>=r.left-1e-5&&row.maxX<=r.right+1e-5&&row.minY>=r.bottom-1e-5&&row.maxY<=r.top+1e-5,label+': every selected vertex fits the clear area between controls');}}
  async function installFixture(kind){return page.evaluate(kind=>{
    const en=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure;
    const origin=kind==='offcenter'?{x:31,z:-27}:kind==='tall'?{x:-25,z:22}:{x:0,z:0};
    const gx=origin.x,gz=origin.z;
    en.loadLesson(Object.assign({},pure.FREE_BUILD_LESSON,{ground:{xMin:gx-5,xMax:gx+5,zMin:gz-4,zMax:gz+4,y:0,type:'grass'}}));
    en._entryAnim=null;en._viewPresetAnim=null;en.flyMode=true;en.velocity.set(0,0,0);en._ambientMotionEnabled=false;en.applyRenderQuality('saver');
    const positions=[],put=(x,y,z,type='stone',shape='cube',rotation=0)=>{if(en.placeBlock(x,y,z,type,shape,rotation))positions.push({x,y,z});};
    if(kind==='wide'){
      for(let x=-24;x<=24;x++)put(x,1,0,x%3?'wood':'stone');
      for(let x=-24;x<=24;x+=6){put(x,2,0,'brick');put(x,3,0,'gold','quarter',Math.abs(x/6)%4);}
      put(-24,1,1,'wood','halfB',1);put(24,1,-1,'stone','halfA',3);
    }else if(kind==='tall'){
      for(let x=0;x<3;x++)for(let z=0;z<3;z++)put(gx+x,1,gz+z);
      for(let y=2;y<=20;y++)put(gx+1,y,gz+1,y%4===0?'brick':'wood',y===20?'quarter':'cube',3);
      for(let x=0;x<3;x++)for(let z=0;z<3;z++)if(x!==1||z!==1)put(gx+x,19,gz+z,'gold','halfB',1);
    }else{
      for(let x=0;x<5;x++)for(let z=0;z<3;z++)put(gx+x,1,gz+z);
      for(const x of [0,4])for(const z of [0,2])for(let y=2;y<=4;y++)put(gx+x,y,gz+z,y===2?'brick':'wood');
      for(let x=0;x<5;x++)for(let z=0;z<3;z++)put(gx+x,5,gz+z,'brick',z===1?'cube':'halfA',z===0?1:3);
      put(gx+5,1,gz+1,'sand','quarter',2);put(gx+2,1,gz+3,'wood','halfB',3);
    }
    // An independent unselected authored block detects selection-only roundtrips.
    en.placeBlock(gx+8,1,gz+7,'glass','quarter',1);
    en.refreshAllAO();en.blocksPlaced=positions.length+1;
    __ctx.updateMulti('geometryWorld',{worldActive:true,renderQuality:'saver',autoCycle:false,showGameSettings:false,sandboxDockCollapsed:false,touchMode:true,blocksPlaced:en.blocksPlaced,measureResult:null,builderPanel:'build'});
    window.__focusFixture={kind,positions,aim:kind==='wide'?{x:0,y:1,z:0}:{x:gx+1,y:1,z:gz}};
    __aimAt(__focusFixture.aim.x,__focusFixture.aim.y,__focusFixture.aim.z);en.camera.updateMatrixWorld(true);
    return {kind,expected:positions.length,world:positions.length+1,origin};
  },kind);}
  try{
    await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
    await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
    await page.waitForFunction(()=>window.__geoWorldEngine?._currentLesson?.sandbox===true);
    await page.evaluate(()=>{
      window.__focusEngine=__geoWorldEngine;
      window.__focusPose=()=>{const e=__geoWorldEngine,c=e.camera;return {position:c.position.toArray(),quaternion:c.quaternion.toArray(),up:c.up.toArray(),fov:c.fov,near:c.near,far:c.far,flyMode:e.flyMode};};
      window.__focusSignature=async()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,m=p.selectionMeasurement(e).measurement,b=p.buildGeometryWorldStl(e,m.blocks);return {world:JSON.stringify(p.editableWorld(e).blocks),selected:JSON.stringify(m.blocks),count:m.count,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b.buffer))).map(x=>x.toString(16).padStart(2,'0')).join(''),bytes:b.buffer.byteLength,undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),placed:e.blocksPlaced,xp:e._sessionXP||0,milestones:JSON.stringify(e._blockMilestones||{})};};
    });
    for(const kind of ['wide','tall','offcenter']){
      await page.setViewportSize({width:1440,height:900});const fixture=await installFixture(kind);await frames();
      await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
      await page.waitForFunction(count=>__geoWorldEngine._builderSelection?.blocks?.length===count,fixture.expected);
      const baseline=await signature();
      for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:700}]){
        const label=kind+'-'+size.width+'x'+size.height;console.log('Checking '+label);
        const row={label,fixture,size};result.cases.push(row);await page.setViewportSize(size);await stable();
        check(await page.evaluate(()=>__geoWorldEngine===__focusEngine),label+': same engine survives resize');
        await page.evaluate(()=>{const e=__geoWorldEngine,p=__focusFixture.aim;e._entryAnim=null;e._viewPresetAnim=null;e.flyMode=true;e.velocity.set(0,0,0);e.camera.position.set(p.x+0.5,p.y+3.2,p.z+3.5);e.camera.up.set(0,1,0);e.camera.lookAt(p.x+0.5,p.y+0.5,p.z+0.5);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});
        await expand(true);const focus=page.getByRole('button',{name:actionNames.focus,exact:true});await focus.scrollIntoViewIfNeeded();
        // Capture phase records the camera immediately before the real React action.
        // Injected held input is explicitly a handler-level cleanup regression.
        await focus.evaluate(button=>button.addEventListener('click',()=>{
          const e=__geoWorldEngine;window.__focusBefore=__focusPose();
          Object.keys(e.moveState||{}).forEach(k=>e.moveState[k]=true);Object.keys(e.lookState||{}).forEach(k=>e.lookState[k]=true);
          e._touchLookId=97;e._touchLookStart={x:14,y:26};e._touchMoveId=98;e._touchMoveStart={x:30,y:40};e._touchMoveVec={x:.7,z:-.4};e._touchActive=true;e.velocity.set(3,-2,4);
        },{capture:true,once:true}));
        await focus.click();await stable();row.before=await page.evaluate(()=>__focusBefore);row.fitted=await frame();checkFrame(row.fitted,label);
        row.input=await page.evaluate(()=>{const e=__geoWorldEngine;return {move:Object.values(e.moveState||{}).some(Boolean),look:Object.values(e.lookState||{}).some(Boolean),touchLook:e._touchLookId,touchMove:e._touchMoveId,touchVector:e._touchMoveVec,velocity:e.velocity.toArray(),pointerLock:!!document.pointerLockElement};});
        check(!row.input.move&&!row.input.look&&row.input.touchLook==null&&row.input.touchMove==null&&row.input.touchVector.x===0&&row.input.touchVector.z===0&&row.input.velocity.every(v=>Math.abs(v)<1e-9)&&!row.input.pointerLock,label+': handler releases held keyboard/touch/velocity input');
        await stable();row.stable=await pose();check(cameraEqual(row.fitted.camera,row.stable),label+': fitted camera stays stable without held input');exact(baseline,await signature(),label+': focus preserves exact world, selected STL and history');
        if(kind==='offcenter'||(kind==='tall'&&size.width===320)||(kind==='wide'&&size.width===390))await screenshot(label);
        if(kind==='offcenter'&&size.width===1440){
          await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.down('KeyW');await frames(4);
          row.keyboardMovement=await page.evaluate(()=>({forward:__geoWorldEngine.moveState.forward,manual:__geoWorldEngine._creationFocus?.manual,pose:__focusPose()}));
          check(row.keyboardMovement.forward&&row.keyboardMovement.manual&&!cameraEqual(row.stable,row.keyboardMovement.pose),label+': real keyboard movement takes manual control after framing');
        }
        await clickAction(actionNames.restore);await page.keyboard.up('KeyW');await stable();row.restored=await pose();check(cameraEqual(row.before,row.restored),label+': return restores exact camera, projection and navigation mode');exact(baseline,await signature(),label+': return preserves exact world, selected STL and history');
      }
    }
    // Framing preserves walking mode while suppressing idle gravity.
    await page.evaluate(()=>{__geoWorldEngine.flyMode=false;__geoWorldEngine.velocity.set(0,0,0);});
    await clickAction(actionNames.focus);await stable();result.walking={fitted:await frame()};await stable();result.walking.stable=await pose();checkFrame(result.walking.fitted,'Walking mode');check(!result.walking.stable.flyMode&&cameraEqual(result.walking.fitted.camera,result.walking.stable),'Walking mode stays unchanged and does not drop the framed camera');
    // Use fly mode for the later comparison after the normal edit loop resumes.
    await page.evaluate(()=>{__geoWorldEngine.flyMode=true;});await clickAction(actionNames.restore);await stable();
    // One actual Showcase cycle and actual Print Lab transfer after using Focus.
    await clickAction(actionNames.focus);await stable();const baseline=await signature(),focusedPose=await pose();
    await clickAction('Showcase creation');await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor();await page.getByRole('button',{name:'Studio',exact:true}).click();
    await page.getByRole('group',{name:'Camera view',exact:true}).getByRole('button',{name:'Top',exact:true}).click();await stable();result.showcase=await frame();checkFrame(result.showcase,'Focus → Studio Top');
    await page.getByRole('button',{name:'Back to building',exact:true}).click();await stable();check(cameraEqual(focusedPose,await pose()),'Showcase returns to the focused edit camera');exact(baseline,await signature(),'Showcase preserves exact selection/STL/history after Focus');
    await page.evaluate(()=>{const e=__geoWorldEngine,p=StemLab.geometryWorldBuilderPure,b=p.buildGeometryWorldStl(e,e._builderSelection.blocks);window.__focusExpectedProject=p.captureProject(__ctx,e,'focus-verifier');window.__focusExpectedBytes=Array.from(new Uint8Array(b.buffer));const change=__ctx.setStemLabTool;__ctx.setStemLabTool=function(id){if(id==='printLab'){const h=window.__alloPrintLabPendingHandoff;window.__focusHandoff={bytes:Array.from(h.bytes),count:h.sourceModel.blocks.length};}return change.apply(this,arguments);};});
    await clickAction('Send selected build to Print Lab');await page.getByRole('heading',{name:'Print Lab',exact:true}).waitFor();
    result.printHandoff=await page.evaluate(()=>({exact:JSON.stringify(__focusHandoff.bytes)===JSON.stringify(__focusExpectedBytes),count:__focusHandoff.count,bytes:__focusHandoff.bytes.length}));check(result.printHandoff.exact&&result.printHandoff.count===baseline.count,'Focus → Print Lab transfers exact selected STL');
    await page.getByRole('button',{name:'Revise in Geometry World',exact:true}).click();await page.waitForFunction(()=>!!window.__geoWorldEngine&&!window.__alloGeometryWorldPendingBuild&&!window.__alloGeometryWorldReturnProject);await stable();
    result.printReturn=await page.evaluate(()=>{const a=StemLab.geometryWorldBuilderPure.captureProject(__ctx,__geoWorldEngine,'focus-verifier'),b=__focusExpectedProject;return {world:JSON.stringify(a.blocks)===JSON.stringify(b.blocks),selection:JSON.stringify(a.selection)===JSON.stringify(b.selection),undo:JSON.stringify(a.undo)===JSON.stringify(b.undo),redo:JSON.stringify(a.redo)===JSON.stringify(b.redo),camera:a.camera.every((v,i)=>Math.abs(v-b.camera[i])<1e-6),quaternion:a.cameraQuaternion.every((v,i)=>Math.abs(v-b.cameraQuaternion[i])<1e-6),flyMode:a.flyMode===b.flyMode,blocks:a.blocks.length};});check(Object.entries(result.printReturn).filter(([k])=>k!=='blocks').every(([,v])=>v===true),'Print Lab returns the complete focused workspace and history');exact(baseline,await signature(),'Print Lab roundtrip preserves exact world/selection/STL/history');
    result.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics));check(!result.shaderErrors.length,'No shader compilation failures');check(!result.errors.length&&!result.consoleErrors.length,'No page or console errors');result.pass=!result.failures.length;
  }catch(error){result.failure=error.stack;result.pass=false;await screenshot('failure').catch(()=>{});}
  finally{
    const target=path.join(out,'focus-creation-results.json'),content=JSON.stringify(result,null,2);if(fs.existsSync(target)){const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,content);fs.ftruncateSync(fd,Buffer.byteLength(content));fs.closeSync(fd);}else fs.writeFileSync(target,content);
    console.log(JSON.stringify({pass:result.pass,failure:result.failure,failures:result.failures,errors:result.errors,cases:result.cases.map(r=>({label:r.label,count:r.fitted?.count}))},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));if(!result.pass)process.exitCode=1;
  }
}).toString()+')();';
eval(harness);
