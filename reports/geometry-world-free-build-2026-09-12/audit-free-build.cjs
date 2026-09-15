'use strict';
const fs=require('node:fs'),path=require('node:path');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,worldActive:true,renderQuality:"saver",autoCycle:false});');
const run=async function(){
 const r={scope:'Current local production; Free Build native entry and controls, fixture model for selection/showcase; one WebGL page at a time',checks:{},errors:[],consoleErrors:[]};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page;
 const persist=()=>fs.writeFileSync(path.join(out,'free-build-audit.json'),JSON.stringify(r,null,2));
 const snap=async name=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:120000});console.log('SCREENSHOT '+name);persist();};
 const ui=()=>page.evaluate(()=>{
  const e=__geoWorldEngine; const wrap=document.querySelector('#geoworld-fs-wrap');const rect=wrap.getBoundingClientRect();
  const visible=node=>{const s=getComputedStyle(node),b=node.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&b.width>0&&b.height>0;};
  const all=[...document.querySelectorAll('button,summary,input,select,textarea')].filter(visible).map(node=>{const b=node.getBoundingClientRect();return {text:node.getAttribute('aria-label')||node.textContent.trim(),class:node.className,disabled:node.disabled,rect:{x:b.x,y:b.y,w:b.width,h:b.height},atCenter:node.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))};});
  return {text:document.body.innerText,controls:all,overflow:document.documentElement.scrollWidth>innerWidth,world:{x:rect.x,y:rect.y,w:rect.width,h:rect.height},center:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)?.outerHTML.slice(0,300),state:__worldState(),data:__ctx.toolData.geometryWorld,active:document.activeElement?.outerHTML.slice(0,240)};
 });
 const enter=async options=>{
  page=await browser.newPage(options);page.setDefaultTimeout(90000);page.on('pageerror',err=>r.errors.push(err.message));page.on('console',m=>{if(m.type()==='error')r.consoleErrors.push(m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  await page.locator('.gwe-home').waitFor();await page.waitForFunction(()=>!!window.__geoWorldEngine);
  await page.locator('.gwe-home-card[data-path=build]').click();await page.getByRole('button',{name:'Open blank sandbox',exact:true}).click();
  await page.waitForFunction(()=>__geoWorldEngine?._currentLesson?.sandbox===true&&!document.querySelector('.gwe-home'));
  await page.evaluate(()=>{__geoWorldEngine._entryAnim=null;});
 };
 try {
  await enter({viewport:{width:1440,height:900}});
  r.checks.desktopEntry=await ui(); await snap('01-desktop-native-entry');
  await page.locator('#geoworld-fs-wrap').focus();await page.keyboard.press('KeyB');
  r.checks.firstNativeB=await ui();r.checks.firstNativeB.toasts=await page.evaluate(()=>__events.toasts.slice(-5));await snap('02-desktop-first-b');
  // Original arch fixture gives the actual selection/focus/showcase controls something to frame.
  await page.evaluate(()=>{const e=__geoWorldEngine;e._entryAnim=null;e.flyMode=true;e.velocity.set(0,0,0);for(let x=-2;x<=2;x++)for(let z=-1;z<=1;z++)e.placeBlock(x,1,z,'stone','cube',0);for(const x of [-2,2])for(let y=2;y<=4;y++)e.placeBlock(x,y,0,'wood','cube',0);for(let x=-2;x<=2;x++)e.placeBlock(x,5,0,'stone','cube',0);e.placeBlock(0,6,0,'glass','cube',0);e.camera.position.set(6,5,9);e.camera.lookAt(0,3,0);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});
  if(await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).isVisible())await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();
  await page.getByRole('button',{name:'Select and measure aimed build',exact:true}).click();
  await page.waitForFunction(()=>!!__geoWorldEngine._builderSelection);
  r.checks.selected=await ui();await snap('03-desktop-selected-arch');
  const signature=await page.evaluate(()=>JSON.stringify(__geoWorldEngine._builderSelection));
  await page.evaluate(()=>{const e=__geoWorldEngine;e.camera.lookAt(10,3,10);e.euler.setFromQuaternion(e.camera.quaternion);e.camera.updateMatrixWorld(true);});
  r.checks.selectionRetainedAfterLook=await page.evaluate(old=>JSON.stringify(__geoWorldEngine._builderSelection)===old,signature);
  await page.getByRole('button',{name:'Focus creation',exact:true}).click();
  r.checks.focus=await ui();await snap('04-desktop-focused-arch');
  if(await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).isVisible())await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();await page.getByRole('button',{name:'Showcase creation',exact:true}).click();await page.locator('.gwe-showcase').waitFor();
  r.checks.showcase=await ui();await snap('05-desktop-showcase');
  await page.keyboard.press('Escape');await page.locator('.gwe-showcase').waitFor({state:'hidden'});
  r.checks.showcaseReturn={...(await ui()),selectionPreserved:await page.evaluate(old=>JSON.stringify(__geoWorldEngine._builderSelection)===old,signature)};
  await page.setViewportSize({width:390,height:844});r.checks.phoneSelected=await ui();await snap('06-phone-selected');
  await page.getByRole('button',{name:'Collapse Free Build Studio',exact:true}).click();r.checks.phoneCollapsed=await ui();await snap('07-phone-collapsed');
  await page.setViewportSize({width:320,height:700});r.checks.smallCollapsed=await ui();await snap('08-small-collapsed');
  if(await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).isVisible())await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();r.checks.smallSelected=await ui();await snap('09-small-selected');
  await page.close();
  await enter({viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'});
  r.checks.touchEntry=await ui();await snap('10-touch-entry');
  const place=page.getByRole('button',{name:/Place block/i}).filter({visible:true});r.checks.touchPlaceNames=await place.allTextContents();
  if(await place.count()===1){await place.tap();r.checks.touchFirstPlace=await ui();r.checks.touchFirstPlace.toasts=await page.evaluate(()=>__events.toasts.slice(-5));await snap('11-touch-first-place');}
  await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).tap();r.checks.touchOpenPanel=await ui();await snap('12-touch-open-panel');
  await page.setViewportSize({width:320,height:700});r.checks.touchSmallPanel=await ui();await snap('13-touch-small-panel');
 } catch(error){r.failure=error.stack;console.error(error.stack);if(page)await snap('failure').catch(()=>{});}
 finally{persist();console.log(JSON.stringify({checks:Object.keys(r.checks),errors:r.errors,consoleErrors:r.consoleErrors,failure:r.failure}));await browser.close();await new Promise(resolve=>server.close(resolve));if(r.failure)process.exitCode=1;}
};
eval(harness+'('+run.toString()+')();');
