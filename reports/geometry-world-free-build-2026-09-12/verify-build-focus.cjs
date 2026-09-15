'use strict';
const fs=require('node:fs'),path=require('node:path');let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={checks:[],errors:[],consoleErrors:[]};const check=(label,pass,detail)=>{r.checks.push({label,pass:!!pass,detail});if(!pass)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:320,height:700}});page.setDefaultTimeout(90000);page.on('pageerror',err=>r.errors.push(err.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor();await page.waitForFunction(()=>!!__geoWorldEngine);await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();
  const initial=await page.evaluate(()=>JSON.stringify({camera:__geoWorldEngine.camera.position.toArray(),blocks:StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine).blocks}));
  for(const choice of ['material','shape']){
   await page.getByRole('button',{name:new RegExp('^Change '+choice)}).click();
   await page.waitForFunction(kind=>document.activeElement?.matches(kind==='material'?'.gw-hotbar-item[aria-pressed="true"]':'.gw-shape-item[aria-pressed="true"]'),choice,{timeout:15000});
   const detail=await page.evaluate(()=>{const n=document.activeElement,b=n.getBoundingClientRect();return {label:n.getAttribute('aria-label'),collapsed:__ctx.toolData.geometryWorld.sandboxDockCollapsed,atCenter:n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)),width:b.width,height:b.height};});
   check('Change '+choice+' closes the panel and focuses a reachable native selected choice',detail.collapsed&&detail.atCenter&&detail.width>=44&&detail.height>=44,detail);
   check('Change '+choice+' preserves camera and blocks',await page.evaluate(old=>old===JSON.stringify({camera:__geoWorldEngine.camera.position.toArray(),blocks:StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine).blocks}),initial));
   await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();
  }
  await page.getByRole('button',{name:'Start building',exact:true}).click();await page.waitForFunction(()=>document.activeElement?.id==='geoworld-fs-wrap',{}, {timeout:15000});check('Start building returns keyboard focus to the world',true);
  await page.keyboard.press('KeyB');await page.waitForFunction(()=>__worldState().studentBlocks===1);check('B places the first block after keyboard Start building',true);
  await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();await page.locator('.gwe-builder-body').evaluate(n=>n.scrollTop=n.scrollHeight);await page.locator('.gwe-resume-building').click();await page.waitForFunction(()=>document.activeElement?.id==='geoworld-fs-wrap',{}, {timeout:15000});check('Scrolled Back to building restores world focus',true);
  await page.screenshot({path:path.join(out,'final-keyboard-focus-320.png'),timeout:120000});
 }catch(error){r.failure=error.stack;await page.screenshot({path:path.join(out,'focus-failure.png'),timeout:30000}).catch(()=>{});}
 finally{r.pass=!r.failure&&!r.errors.length&&!r.consoleErrors.length&&r.checks.every(c=>c.pass);fs.writeFileSync(path.join(out,'final-build-focus.json'),JSON.stringify(r,null,2));console.log(JSON.stringify(r));await browser.close();await new Promise(resolve=>server.close(resolve));if(!r.pass)process.exitCode=1;}
};eval(harness+'('+run.toString()+')();');
