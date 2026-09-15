'use strict';
const fs=require('node:fs'),path=require('node:path');let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={checks:[],errors:[],consoleErrors:[]};const check=(label,pass,detail)=>{r.checks.push({label,pass:!!pass,detail});if(!pass)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(90000);page.on('pageerror',err=>r.errors.push(err.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor();await page.waitForFunction(()=>!!__geoWorldEngine);await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.screenshot({path:path.join(out,'final-native-entry-latest.png'),timeout:120000});await page.getByRole('button',{name:'Start building',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='geoworld-fs-wrap');
  const nativeCamera=await page.evaluate(()=>__geoWorldEngine.camera.position.toArray());
  await page.keyboard.press('KeyB');await page.waitForFunction(()=>__worldState().studentBlocks===1,{},{timeout:15000});
  check('Native first B places one block before camera fixtures',true);await page.screenshot({path:path.join(out,'final-native-first-b-latest.png'),timeout:120000});
  check('Native first B preserves the entry camera position',await page.evaluate(old=>JSON.stringify(old)===JSON.stringify(__geoWorldEngine.camera.position.toArray()),nativeCamera));
  await page.keyboard.press('Control+z');await page.waitForFunction(()=>__worldState().studentBlocks===0,{},{timeout:15000});check('Native Undo removes the first block',true);
  // Reopen a native blank world because first-block guidance tracks prior placement input, not the Undo count.
  await page.getByRole('button',{name:'Geometry World home',exact:true}).filter({visible:true}).first().click();await page.locator('.gwe-home').waitFor();
  if(!await page.getByRole('button',{name:'Open blank sandbox',exact:true}).isVisible())await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.getByRole('button',{name:'Start building',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='geoworld-fs-wrap');
  await page.evaluate(()=>{const e=__geoWorldEngine,p=e.camera.position;e.flyMode=true;e.velocity.set(0,0,0);e.camera.lookAt(p.x,p.y+5,p.z-5);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});
  await page.locator('.gw-placement-hint[data-placement-state="aim"]').waitFor();
  const detail=await page.evaluate(()=>{const n=document.querySelector('.gw-placement-hint'),b=n.querySelector('.gw-placement-aim'),r=b.getBoundingClientRect(),s=getComputedStyle(n);const rgb=x=>x.match(/[\d.]+/g).slice(0,3).map(Number);const lum=xs=>xs.map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4);}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);const a=lum(rgb(s.color)),c=lum(rgb(s.backgroundColor));return {state:n.dataset.placementState,code:n.dataset.placementCode,color:s.color,background:s.backgroundColor,contrast:(Math.max(a,c)+.05)/(Math.min(a,c)+.05),width:r.width,height:r.height,atCenter:b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),text:n.innerText};});
  check('Looking above ground shows neutral aim guidance instead of blocked state',detail.state==='aim'&&detail.code==='no_target',detail);
  check('Aim has a reachable target at least44×44',detail.width>=44&&detail.height>=44&&detail.atCenter);
  check('Neutral aim text has at least4.5:1 nominal contrast',detail.contrast>=4.5);
  await page.screenshot({path:path.join(out,'final-neutral-aim.png'),timeout:120000});
  const signature=await page.evaluate(()=>JSON.stringify({position:__geoWorldEngine.camera.position.toArray(),blocks:StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine).blocks}));
  await page.getByRole('button',{name:'Aim at the build area',exact:true}).click();await page.locator('.gw-placement-hint[data-placement-state="ready"]').waitFor();
  check('Aim points to a valid placement target',await page.evaluate(()=>__ctx.toolData.geometryWorld.placementHint.allowed===true));
  check('Aim preserves camera position and world geometry',await page.evaluate(old=>old===JSON.stringify({position:__geoWorldEngine.camera.position.toArray(),blocks:StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine).blocks}),signature));
  await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press('KeyQ');
  r.feedback=await page.evaluate(()=>{const a=document.querySelector('.gw-action-feedback')?.getBoundingClientRect(),b=document.querySelector('.gw-placement-hint')?.getBoundingClientRect();return a&&b?{feedback:{x:a.x,y:a.y,w:a.width,h:a.height},hint:{x:b.x,y:b.y,w:b.width,h:b.height},overlap:a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top}:null;});
  check('Shape feedback and placement guidance are visually separated',r.feedback&&r.feedback.overlap===false,r.feedback);
  await page.screenshot({path:path.join(out,'final-aim-ready-and-shape-feedback.png'),timeout:120000});
  await page.setViewportSize({width:1440,height:550});await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press('KeyQ');
  r.compactLayout=await page.evaluate(()=>{const stack=document.querySelector('.gw-feedback-stack')?.getBoundingClientRect(),cross=document.querySelector('.gw-crosshair')?.getBoundingClientRect(),view=document.querySelector('#geoworld-fs-wrap').getBoundingClientRect(),canvas=__geoWorldEngine.renderer.domElement.getBoundingClientRect();if(!stack||!cross)return null;const x=cross.x+cross.width/2,y=cross.y+cross.height/2,rect=r=>({x:r.x,y:r.y,w:r.width,h:r.height});return {stack:rect(stack),crosshair:rect(cross),crosshairCenter:{x,y},viewport:rect(view),canvas:rect(canvas),canvasCenter:{x:canvas.x+canvas.width/2,y:canvas.y+canvas.height/2},overlapsCrosshair:x>=stack.left&&x<=stack.right&&y>=stack.top&&y<=stack.bottom};});
  check('Compact desktop feedback leaves the actual crosshair clear',r.compactLayout&&r.compactLayout.overlapsCrosshair===false,r.compactLayout);
  check('Actual crosshair matches the rendered canvas center',r.compactLayout&&Math.abs(r.compactLayout.crosshairCenter.x-r.compactLayout.canvasCenter.x)<=1&&Math.abs(r.compactLayout.crosshairCenter.y-r.compactLayout.canvasCenter.y)<=1);

  await page.screenshot({path:path.join(out,'final-feedback-wide-550.png'),timeout:120000});
  r.alignmentLayouts=[];
  for(const spec of [{name:'desktop hidden game bar',width:1440,height:550,hide:true},{name:'390px hidden game bar',width:390,height:844},{name:'320px hidden game bar',width:320,height:700},{name:'390px shown game bar',width:390,height:844,show:true}]){
   await page.setViewportSize({width:spec.width,height:spec.height});if(spec.hide)await page.getByRole('button',{name:'Hide the Geometry World game bar',exact:true}).click();if(spec.show)await page.getByRole('button',{name:'Show the Geometry World game bar',exact:true}).click({timeout:15000});
   await page.waitForFunction(()=>{const a=document.querySelector('.gw-crosshair').getBoundingClientRect(),b=__geoWorldEngine.renderer.domElement.getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)<=1&&Math.abs(a.y+a.height/2-b.y-b.height/2)<=1;},{},{timeout:15000});
   const detail=await page.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,cx:r.x+r.width/2,cy:r.y+r.height/2};};return{crosshair:rect(document.querySelector('.gw-crosshair')),canvas:rect(__geoWorldEngine.renderer.domElement),viewport:rect(document.querySelector('#geoworld-fs-wrap'))};});r.alignmentLayouts.push({name:spec.name,...detail});
   if(spec.name==='390px hidden game bar'||spec.name==='320px hidden game bar'){
    const recovery=await page.evaluate(()=>{const read=selector=>{const n=document.querySelector(selector),b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height,atCenter:n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};};const home=read('.gwe-home-shortcut'),bar=read('.gw-toolbar-reveal');return {home,bar,overlap:home.x<bar.x+bar.w&&home.x+home.w>bar.x&&home.y<bar.y+bar.h&&home.y+home.h>bar.y,overflow:document.documentElement.scrollWidth>innerWidth};});
    check(spec.name+' exposes both recovery controls without overlap',recovery.home.atCenter&&recovery.bar.atCenter&&!recovery.overlap,recovery);
    check(spec.name+' gives both recovery controls 44px targets',recovery.home.w>=44&&recovery.home.h>=44&&recovery.bar.w>=44&&recovery.bar.h>=44);
    check(spec.name+' has no document overflow',!recovery.overflow);
    if(spec.name==='320px hidden game bar'){
     const position=page.locator('.gw-coordinate-hud summary');if(await position.count()){
      await position.click();const expanded=await page.evaluate(()=>{const reach=selector=>{const n=document.querySelector(selector),r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));};return{positionOpen:document.querySelector('.gw-coordinate-hud').open,home:reach('.gwe-home-shortcut'),bar:reach('.gw-toolbar-reveal'),overflow:document.documentElement.scrollWidth>innerWidth};});
      check('320px expanded Position keeps recovery controls reachable',expanded.positionOpen&&expanded.home&&expanded.bar&&!expanded.overflow,expanded);await page.screenshot({path:path.join(out,'final-toolbar-recovery-320-expanded.png'),timeout:120000});await position.click();
     }
     await page.screenshot({path:path.join(out,'final-toolbar-recovery-320.png'),timeout:120000});
    }

    if(spec.name==='390px hidden game bar'){await page.locator('.gwe-home-shortcut').click({timeout:15000});await page.locator('.gwe-home').waitFor();check('Narrow World home opens the welcome screen',true);await page.locator('.gwe-home-continue').click();await page.locator('.gwe-home').waitFor({state:'hidden'});check('Continue returns from World home with the game bar still hidden',await page.evaluate(()=>__ctx.toolData.geometryWorld.toolbarCollapsed===true));}
   }
if(spec.name==='390px hidden game bar')await page.screenshot({path:path.join(out,'final-toolbar-recovery-390.png'),timeout:120000});check(spec.name+' aligns crosshair with the canvas',Math.abs(detail.crosshair.cx-detail.canvas.cx)<=1&&Math.abs(detail.crosshair.cy-detail.canvas.cy)<=1,detail);
  }


 }catch(error){r.failure=error.stack;r.failureState=await page.evaluate(()=>{const e=__geoWorldEngine,h=e.blockUnderCrosshair();return {camera:e.camera.position.toArray(),quaternion:e.camera.quaternion.toArray(),preview:e._placementPreview,hint:__ctx.toolData.geometryWorld.placementHint,hit:h?{point:h.point.toArray(),normal:h.face.normal.toArray(),grid:h.object.userData.gridPos}:null};}).catch(()=>null);await page.screenshot({path:path.join(out,'neutral-aim-failure.png'),timeout:30000}).catch(()=>{});}
 finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length&&r.checks.every(c=>c.pass);fs.writeFileSync(path.join(out,'final-neutral-aim.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
