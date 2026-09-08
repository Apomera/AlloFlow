const fs=require('node:fs'),path=require('node:path');
let code=fs.readFileSync(path.join(__dirname,'audit.cjs'),'utf8').split('const results =')[0];
code=code.replace('out = __dirname','out = path.join(__dirname,"enhancement")');
code+=`
html=html.replace('_introShownOnce:true','_introShownOnce:true,_mobileDismissed:true,touchMode:true');
(async()=>{
 const results={errors:[]};await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});page.setDefaultTimeout(45000);page.on('pageerror',e=>results.errors.push(e.message));
 async function blockers(){return page.evaluate(()=>Array.from(document.querySelectorAll('.gw-touch-actions button,.gwe-collapse')).map(b=>{const r=b.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {label:b.getAttribute('aria-label'),x:r.x,y:r.y,w:r.width,h:r.height,reachable:top===b||b.contains(top),blocking:top?.className};}));}
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
  await page.getByRole('button',{name:/Free Build Sandbox studio/}).tap();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).tap();
  await page.evaluate(()=>{const en=__geoWorldEngine;en._entryAnim=null;en.placeBlock(0,1,0,'stone','cube',0);en.flyMode=true;en.velocity.set(0,0,0);__aimAt(0,1,0);en.camera.updateMatrixWorld(true);});
  await page.getByRole('button',{name:'Place block',exact:true}).tap();
  await page.waitForTimeout(500);results.placed=await page.evaluate(()=>({count:StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine).blocks.length,undo:__geoWorldEngine._undoStack.length}));
  if(results.placed.count!==2 || results.placed.undo!==2)throw new Error('Touch placement must add exactly one block and one undo entry');
  await page.waitForTimeout(500);results.collapsed=await blockers();await page.screenshot({path:path.join(out,'10-touch-collapsed.png')});
  await page.getByRole('button',{name:'Measure structure',exact:true}).tap();await page.waitForTimeout(500);results.measured=await blockers();await page.screenshot({path:path.join(out,'11-touch-measure.png')});
  await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).tap();await page.screenshot({path:path.join(out,'12-touch-build.png')});
  await page.getByRole('button',{name:'Collapse Free Build Studio',exact:true}).tap();
  await page.getByRole('button',{name:'Undo last block action',exact:true}).tap();
  results.undone=await page.evaluate(()=>StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine).blocks.length);if(results.undone!==1)throw new Error('Touch undo must restore one block');
  results.final=await blockers();results.passed=[...results.collapsed,...results.measured,...results.final].every(b=>b.reachable)&&results.errors.length===0;
  if(!results.passed)process.exitCode=1;
 }catch(e){results.failure=e.stack;process.exitCode=1;console.error(e.stack);await page.screenshot({path:path.join(out,'touch-failure.png')}).catch(()=>{});}
 finally{fs.writeFileSync(path.join(out,'touch-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();await new Promise(r=>server.close(r));}
})();
`;
eval(code);
