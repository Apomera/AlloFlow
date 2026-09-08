// Combined bounded QA for touch movement, placement eligibility, and camera views.
// Run after the coordinated source-ready notices; this script edits no app source.
const fs=require('node:fs');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('__mount({_introShownOnce:true})','__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false})');
harness+='('+(async function verifyControlsViewsPass(){
 const results={scope:'Actual local React/Three WebGL in touch-capable Chromium; small fractional creation; no source edits',errors:[],failures:[],placements:[],viewports:[]};
 const check=(ok,message)=>{if(!ok)results.failures.push(message);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,hasTouch:true,acceptDownloads:true});
 const cdp=await page.context().newCDPSession(page);page.setDefaultTimeout(18000);page.on('pageerror',error=>results.errors.push(error.message));
 const frames=async(count=3)=>page.evaluate(count=>new Promise(resolve=>{let n=0;function tick(){if(++n>=count)resolve();else requestAnimationFrame(tick);}requestAnimationFrame(tick);}),count);
 const shot=async(name)=>page.screenshot({path:path.join(out,'controls-views-'+name+'.png'),timeout:45000});
 const signature=async()=>page.evaluate(()=>window.__controlsViewsSignature());
 const unchanged=(before,after,message)=>check(JSON.stringify(before)===JSON.stringify(after),message);
 async function collapse(value){const button=page.getByRole('button',{name:value?'Collapse Free Build Studio':'Expand Free Build Studio',exact:true});if(await button.count())await button.click();}
 async function pose(position,target){await page.evaluate(({position,target})=>{const en=__geoWorldEngine;en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);en.camera.position.fromArray(position);en.camera.lookAt(...target);en.euler.setFromQuaternion(en.camera.quaternion);en.scene.updateMatrixWorld(true);en.camera.updateMatrixWorld(true);}, {position,target});await page.locator('#geoworld-fs-wrap').focus();await frames();await page.evaluate(()=>__geoWorldEngine.updateGhostPreview());}
 async function preview(code){await page.waitForFunction(code=>window.__geoWorldEngine?._placementPreview?.code===code,code);return page.evaluate(()=>{const en=__geoWorldEngine,g=en._ghostMesh;return {preview:en._placementPreview,ghost:g?{visible:g.visible,color:g.material.color.getHexString(),opacity:g.material.opacity,allowed:g.userData.placementAllowed,reason:g.userData.placementReason,edgeColor:g.children[0]?.material.color.getHexString(),edgeDepthTest:g.children[0]?.material.depthTest}:null,hint:__ctx.toolData.geometryWorld.placementHint};});}
 async function hit(locator){return locator.evaluate(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {name:node.getAttribute('aria-label')||node.textContent.trim(),text:node.textContent.trim(),width:r.width,height:r.height,x:r.x,y:r.y,visible:s.visibility!=='hidden'&&s.display!=='none'&&r.width>0&&r.height>0,inViewport:r.left>=-0.5&&r.top>=-0.5&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5,hit:!!top&&(top===node||node.contains(top))};});}
 async function heldTouch(locator,direction,ending){
   const rect=await locator.boundingBox();if(!rect)throw new Error('Touch control has no bounds');
   const before=await page.evaluate(()=>__geoWorldEngine.camera.position.y);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width/2,y:rect.y+rect.height/2,id:17}]});await frames(6);
   const during=await page.evaluate(()=>({y:__geoWorldEngine.camera.position.y,up:!!__geoWorldEngine.moveState.flyUp,down:!!__geoWorldEngine.moveState.flyDown}));
   if(ending==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   if(ending==='mode-off'){await page.locator('.gw-viewport-control--touch').focus();await page.keyboard.press('Enter');await frames();}
   await cdp.send('Input.dispatchTouchEvent',{type:ending==='cancel'?'touchCancel':'touchEnd',touchPoints:[]});await frames();
   const after=await page.evaluate(()=>({y:__geoWorldEngine.camera.position.y,up:!!__geoWorldEngine.moveState.flyUp,down:!!__geoWorldEngine.moveState.flyDown,enabled:__geoWorldEngine._touchControlsEnabled,nativePointerLock:!!document.pointerLockElement}));
   if(ending==='mode-off'){await page.locator('.gw-viewport-control--touch').click();await frames();}
   return {before,during,after,direction,ending,pass:(direction==='up'?during.y>before+0.005:during.y<before-0.005)&&!after.up&&!after.down&&!after.nativePointerLock};
 }
 async function cameraFrame(){return page.evaluate(()=>{const en=__geoWorldEngine,m=StemLab.geometryWorldBuilderPure.selectionMeasurement(en).measurement;en.camera.updateMatrixWorld(true);const points=[];m.blocks.forEach(p=>{const mesh=en.blocks[[p.x,p.y,p.z].join(',')],a=mesh.geometry.attributes.position;mesh.updateMatrixWorld(true);for(let i=0;i<a.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld).project(en.camera).toArray());});const direction=new THREE.Vector3();en.camera.getWorldDirection(direction);return {view:en._showcase.view,up:en.camera.up.toArray(),direction:direction.toArray(),selected:m.count,maxX:Math.max(...points.map(p=>Math.abs(p[0]))),maxY:Math.max(...points.map(p=>Math.abs(p[1]))),clipped:points.some(p=>p[2]<-1||p[2]>1),overflow:document.documentElement.scrollWidth>innerWidth};});}
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>!!window.__geoWorldEngine,{}, {timeout:120000});
  await page.getByRole('button',{name:/Free Build Sandbox studio/}).click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
  results.fixture=await page.evaluate(()=>{
   const en=__geoWorldEngine,pure=StemLab.geometryWorldBuilderPure;
   en.loadLesson(Object.assign({},pure.FREE_BUILD_LESSON,{ground:{xMin:-5,xMax:5,zMin:-4,zMax:4,y:0,type:'grass'}}));
   en._entryAnim=null;en.flyMode=true;en.velocity.set(0,0,0);en._ambientMotionEnabled=false;en.applyRenderQuality('saver');
   const put=(x,y,z,type,shape='cube',rotation=0)=>en.placeBlock(x,y,z,type,shape,rotation);
   for(let x=-2;x<=1;x++)for(let z=-1;z<=1;z++)put(x,1,z,'stone');
   for(const x of [-2,1])for(const z of [-1,1]){put(x,2,z,'brick');put(x,3,z,'wood');}
   for(let x=-2;x<=1;x++)for(const z of [-1,1])put(x,4,z,'wood');
   for(let x=-2;x<=1;x++)for(let z=-1;z<=1;z++){const y=5+Math.min(x+2,1-x);put(x,y,z,'brick','halfA',x<0?0:2);if(y>5)put(x,y-1,z,'wood');}
   put(2,1,0,'sand','quarter',1);put(-1,1,2,'stone','halfB');
   put(4,1,0,'stone');put(5,1,0,'wood','halfB');en.refreshAllAO();en.blocksPlaced=Object.values(en.blocks).filter(m=>!m.userData._lessonBlock).length;
   __ctx.updateMulti('geometryWorld',{blocksPlaced:en.blocksPlaced,renderQuality:'saver',autoCycle:false,showGameSettings:false,sandboxDockCollapsed:false,touchMode:true,selectedBlock:0,selectedShape:0,blockRotation:0});
   window.__controlsViewsEngine=en;
   window.__controlsViewsSignature=async()=>{const e=__geoWorldEngine,m=pure.selectionMeasurement(e).measurement,b=pure.buildGeometryWorldStl(e,m.blocks);return {world:JSON.stringify(pure.editableWorld(e).blocks),studentBlocks:pure.editableWorld(e).blocks.length,selected:m.count,bytes:b.buffer.byteLength,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b.buffer))).map(v=>v.toString(16).padStart(2,'0')).join(''),undo:JSON.stringify(e._undoStack),redo:JSON.stringify(e._redoStack),placed:e.blocksPlaced,displayedPlaced:__ctx.toolData.geometryWorld.blocksPlaced,xp:e._sessionXP||0,milestones:JSON.stringify(e._blockMilestones||{})};};
   return {studentBlocks:en.blocksPlaced,groundBlocks:Object.values(en.blocks).filter(m=>m.userData._lessonBlock).length};
  });
  await pose([-0.5,3,6],[-0.5,1.3,2.6]);await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();await page.waitForFunction(()=>__geoWorldEngine._builderSelection?.blocks?.length===48);await collapse(true);
  const initial=results.initial=await signature();check(initial.selected===48&&initial.studentBlocks===50,'Fixture has 48 selected fractional blocks and two isolated probes');
  await pose([8,2.5,0.5],[4.98,1.8,0.5]);const blocked=results.blocked=await preview('occupied');check(blocked.ghost?.visible&&blocked.ghost.allowed===false&&blocked.ghost.edgeDepthTest===false,'Occupied cell uses the blocked ghost and visible outline');
  await shot('blocked-preview-desktop');await page.keyboard.press('KeyB');await frames();unchanged(initial,await signature(),'Rejected keyboard placement changes no blocks, counters, history, XP, or STL');
  results.guards=await page.evaluate(()=>{
   const en=__geoWorldEngine,rows=[];
   for(const [name,p,code] of [['occupied',[5,1,0],'occupied'],['below-floor',[0,-1,0],'below_floor'],['world-edge',[65,1,0],'out_of_bounds'],['fractional-grid',[0.5,1,0],'out_of_bounds'],['non-finite',[NaN,1,0],'out_of_bounds']]){const eligibility=en.getPlacementEligibility(...p),created=en.placeBlock(...p,'stone','cube',0);rows.push({name,code:eligibility.code,expected:code,allowed:eligibility.allowed,created:!!created});}
   const original=en.getBlocksArr,full=Array(1500).fill(Object.values(en.blocks)[0]);try{en.getBlocksArr=()=>full;const eligibility=en.getPlacementEligibility(-6,1,0),created=en.placeBlock(-6,1,0,'stone','cube',0);rows.push({name:'block-quota (bounded count stub)',code:eligibility.code,expected:'block_limit',allowed:eligibility.allowed,created:!!created});}finally{en.getBlocksArr=original;}
   return rows;
  });check(results.guards.every(row=>row.code===row.expected&&!row.allowed&&!row.created),'All direct placement guards return rejection and create no mesh');unchanged(initial,await signature(),'All rejected direct placements preserve exact model and action state');
  await pose([0,9,7],[0,25,7]);const noTarget=results.noTarget=await preview('no_target');check(!noTarget.ghost?.visible,'No target hides the placement ghost');await page.keyboard.press('KeyB');await frames();unchanged(initial,await signature(),'No-target placement preserves exact model and action state');
  await pose([4,3.8,1.5],[1.98,2.7,1.5]);const ready=results.ready=await preview('ready');check(ready.ghost?.visible&&ready.ghost.allowed===true&&ready.ghost.color!==blocked.ghost.color,'Allowed preview uses its distinct ready color');
  await page.keyboard.press('KeyB');await page.waitForFunction(()=>!!__geoWorldEngine.blocks['2,2,1']);await frames();const placed=results.intentionalPlacement=await signature();
  check(placed.studentBlocks===initial.studentBlocks+1&&placed.selected===initial.selected+1&&placed.hash!==initial.hash&&placed.placed===initial.placed+1,'One approved action adds exactly one connected block and changes selected STL once');
  await page.keyboard.press('Control+z');await frames();const baseline=results.afterUndo=await signature();check(baseline.world===initial.world&&baseline.hash===initial.hash&&baseline.undo===initial.undo,'Undo restores the exact fractional creation and previous undo history');
  for(const size of [{width:1440,height:900},{width:390,height:844},{width:320,height:700},{width:844,height:390,landscape:true}]){
   const label=size.width+'x'+size.height;console.log('Verifying '+label);const row={size,touch:[],views:[]};results.viewports.push(row);
   if(size.width<800||size.landscape){await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();Object.defineProperty(navigator,'userAgent',{value:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',configurable:true});});await page.waitForFunction(()=>!document.pointerLockElement);}
   await page.setViewportSize(size);await frames(5);check(await page.evaluate(()=>__geoWorldEngine===__controlsViewsEngine),label+': resize keeps the same engine');
   await collapse(true);await pose([10,8,13],[0,2.5,0.5]);
   if(size.width<800||size.landscape){
    await page.waitForFunction(()=>document.querySelector('#geoworld-fs-workspace').dataset.touchActive==='true');
    const controls=page.locator('.gw-touch-actions button');
    for(let i=0;i<await controls.count();i++){const state=await hit(controls.nth(i));row.touch.push(state);check(state.hit&&state.inViewport&&state.width>=43.5&&state.height>=43.5,label+': '+state.name+' has a visible touch target');check(state.text.length>1,label+': '+state.name+' has a visible text label');}
    check(await page.getByRole('button',{name:'Talk to nearby character',exact:true}).count()===0,label+': Talk is absent in a world without NPCs');
    for(const selector of ['.gw-viewport-control--touch','.gw-viewport-control--fullscreen']){const state=await hit(page.locator(selector));check(state.hit&&state.inViewport,label+': '+state.name+' viewport control remains reachable');}
    row.overlaps=await page.evaluate(()=>{const groups=['.gw-hotbar','.gw-shape-tray','.gwe-builder-dock','.gw-touch-look-panel','.gw-action-bar'],found=[];document.querySelectorAll('.gw-touch-actions button').forEach(button=>{const b=button.getBoundingClientRect();groups.forEach(selector=>{const node=document.querySelector(selector);if(!node||getComputedStyle(node).visibility==='hidden')return;const r=node.getBoundingClientRect(),w=Math.min(b.right,r.right)-Math.max(b.left,r.left),h=Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top);if(w>1&&h>1)found.push({button:button.getAttribute('aria-label'),selector,area:w*h});});});return found;});check(row.overlaps.length===0,label+': touch actions do not overlap palette, shapes, build dock, or look settings');
    row.joystickOverlaps=await page.evaluate(()=>{const stick=document.querySelector('.gw-touch-joystick'),b=stick.getBoundingClientRect(),found=[];for(const selector of ['.gw-hotbar','.gw-shape-tray','.gwe-builder-dock','.gw-touch-look-panel','.gw-touch-actions','.gw-minimap','.gw-coordinate-hud']){const node=document.querySelector(selector);if(!node||getComputedStyle(node).visibility==='hidden')continue;const r=node.getBoundingClientRect(),w=Math.min(b.right,r.right)-Math.max(b.left,r.left),h=Math.min(b.bottom,r.bottom)-Math.max(b.top,r.top);if(w>1&&h>1)found.push({selector,area:w*h,joystick:{x:b.x,y:b.y,width:b.width,height:b.height}});}return found;});check(row.joystickOverlaps.length===0,label+': joystick does not overlap palette, shapes, build dock, look settings or touch actions');
    const beforeMotion=await signature(),up=page.getByRole('button',{name:'Jump or fly up',exact:true}),down=page.getByRole('button',{name:/^(Fly down|Move down)$/});
    row.flight=[];
    for(const [button,direction,ending] of [[up,'up','release'],[down,'down','cancel'],[down,'down','blur'],[down,'down','mode-off']]){const state=await heldTouch(button,direction,ending);row.flight.push(state);check(state.pass,label+': '+direction+' held touch and '+ending+' cleanup');}
    unchanged(beforeMotion,await signature(),label+': touch flight preserves blocks, history and selected STL');
    await pose([8,2.5,0.5],[4.98,1.8,0.5]);await preview('occupied');const beforeRejected=await signature(),place=page.getByRole('button',{name:'Place block',exact:true});if(await place.isEnabled())await place.tap();await frames();unchanged(beforeRejected,await signature(),label+': rejected touch Place has no model or action-state effect');
    await pose([10,8,13],[0,2.5,0.5]);await shot(label+'-touch');
   }
   if(size.landscape)continue;
   await collapse(false);const showcase=page.getByRole('button',{name:'Showcase creation',exact:true});await showcase.scrollIntoViewIfNeeded();
   const savedPose=await page.evaluate(()=>({position:__geoWorldEngine.camera.position.toArray(),quaternion:__geoWorldEngine.camera.quaternion.toArray(),up:__geoWorldEngine.camera.up.toArray(),fov:__geoWorldEngine.camera.fov}));
   await showcase.click();await page.getByRole('dialog',{name:'Showcase creation',exact:true}).waitFor();await page.getByRole('button',{name:'Studio',exact:true}).click();
   const viewGroup=page.getByRole('group',{name:'Camera view',exact:true});
   for(const [name,view] of [['Perspective','perspective'],['Front','front'],['Side','side'],['Top','top']]){
    const button=viewGroup.getByRole('button',{name,exact:true});await button.click();await frames();const state=await cameraFrame();state.control=await hit(button);row.views.push(state);
    check(state.view===view&&await button.getAttribute('aria-pressed')==='true',label+': '+name+' is the active camera view');
    check(state.maxX<0.96&&state.maxY<0.96&&!state.clipped&&!state.overflow,label+': '+name+' fits every selected mesh vertex');
    check(state.control.hit&&state.control.inViewport&&state.control.width>=43.5&&state.control.height>=43.5,label+': '+name+' view button remains reachable');
    if(view==='front')check(state.direction[2]<-0.99999,label+': Front looks from positive Z');
    if(view==='side')check(state.direction[0]<-0.99999,label+': Side looks from positive X');
    if(view==='top')check(state.direction[1]<-0.99999&&state.up[2]===-1,label+': Top keeps negative Z at screen top');
    unchanged(baseline,await signature(),label+': '+name+' does not change selected STL, counters or history');
    if(size.width===1440||view==='perspective'||view==='top')await shot(label+'-studio-'+view);
   }
   await page.getByRole('button',{name:'Rotate view right',exact:true}).click();check(await page.evaluate(()=>__geoWorldEngine._showcase.view)==='perspective',label+': orbit returns to Perspective');
   await viewGroup.getByRole('button',{name:'Top',exact:true}).click();await page.getByRole('button',{name:'Back to building',exact:true}).click();await frames();
   row.restoredPose=await page.evaluate(()=>({position:__geoWorldEngine.camera.position.toArray(),quaternion:__geoWorldEngine.camera.quaternion.toArray(),up:__geoWorldEngine.camera.up.toArray(),fov:__geoWorldEngine.camera.fov}));
   check(['position','quaternion','up'].every(key=>row.restoredPose[key].every((v,i)=>Math.abs(v-savedPose[key][i])<1e-6))&&Math.abs(row.restoredPose.fov-savedPose.fov)<0.02,label+': Top exit restores the exact editor camera and up direction');
   unchanged(baseline,await signature(),label+': Showcase exit preserves geometry, STL and action history');
  }
  results.final=await signature();results.shaderErrors=await page.evaluate(()=>__geoWorldEngine.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics));check(results.shaderErrors.length===0,'No failed shader programs');check(results.errors.length===0,'No page errors');results.pass=results.failures.length===0;
 }catch(error){results.failure=error.stack;results.pass=false;await shot('failure').catch(()=>{});}
 finally{fs.writeFileSync(path.join(out,'controls-views-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({pass:results.pass,failure:results.failure,failures:results.failures,errors:results.errors,fixture:results.fixture,viewports:results.viewports.map(v=>({size:v.size,views:v.views.length,touch:v.touch.length}))},null,2));await browser.close();await new Promise(resolve=>server.close(resolve));if(!results.pass)process.exitCode=1;}
}).toString()+')();';
eval(harness);
