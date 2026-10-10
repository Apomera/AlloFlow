'use strict';
// Verify independent pane scrolling, keyboard navigation, and responsive fallbacks.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=process.env.PERCEPTION_QA_RUNTIME_ROOT||process.cwd(),runtimeRequire=createRequire(path.join(runtime,'package.json'));
const {chromium}=runtimeRequire('playwright');
const read=file=>fs.readFileSync(file,'utf8'),runtimeRead=file=>read(path.join(runtime,file));
const out=path.resolve('reports/artstudio-workspace/perception-focus-bench');fs.mkdirSync(out,{recursive:true});
const hash=()=>crypto.createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell=runtimeRead('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
 .replace('var init = {}; init[id] = state || {};','var init = {otherTool:{preserved:37}}; init[id] = state || {};')
 .replace('var ctx = { React: React','window.__state=pair[0];window.__edit=pair[1];var ctx = { activeProfileId:"focus-bench", React: React')
 .replace('isContrast: false','isContrast:!!window.__qaContrast');
(async()=>{
 const browser=await chromium.launch({args:['--disable-gpu']}),page=await browser.newPage({viewport:{width:1440,height:1000}}),sourceSHA256=hash(),checks=[],errors=[];let phase='mount';
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('http://localhost:47839/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://localhost:47839/');
  await page.setContent('<html><head><style>'+runtimeRead('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'])await page.addScriptTag({content:runtimeRead(file)});
  for(const file of ['stem_lab/stem_lab_module.js','stem_lab/stem_tool_perception.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:runtimeRead('node_modules/axe-core/axe.min.js')});await page.addScriptTag({content:shell});
  const button=name=>page.getByRole('button',{name,exact:true}),state=()=>page.evaluate(()=>__state),controls=page.locator('.perception-controls'),scenes=page.locator('.perception-scenes'),current=page.locator('#perception-stage-current');
  const mount=async(state={},theme='light',font=16)=>page.evaluate(({state,theme,font})=>{ReactDOM.unmountComponentAtNode(document.getElementById('slot'));document.documentElement.style.fontSize=font+'px';window.__qaContrast=theme==='contrast';document.getElementById('slot').className=theme==='dark'?'theme-dark':theme==='contrast'?'theme-contrast':'theme-default';__mount('perceptionLab',theme==='dark',StemLab.PerceptionEngine.normalize(state));},{state,theme,font});
  const axe=async()=>{const violations=await page.evaluate(async()=>(await axe.run(document.querySelector('[data-perception-focus-dialog]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);};
  const fit=async()=>{
   const issue=await page.evaluate(()=>{const dialog=document.querySelector('[data-perception-focus-dialog]');return {page:document.documentElement.scrollWidth>innerWidth+1,dialog:dialog.scrollWidth>dialog.clientWidth+1,panes:[...dialog.querySelectorAll('.perception-controls,.perception-scenes')].filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.className)};});
   assert.deepEqual(issue,{page:false,dialog:false,panes:[]});
  };
  const docking=async(expected)=>{await page.waitForFunction(expected=>(getComputedStyle(document.querySelector('.perception-controls')).overflowY==='auto')===expected,expected);return controls.evaluate(node=>getComputedStyle(node).overflowY==='auto');};
  const visible=async node=>{const box=await node.boundingBox(),bounds=await page.locator('[data-perception-focus-dialog]').boundingBox();assert(box&&box.y>=bounds.y-1&&box.y+box.height<=bounds.y+bounds.height+1,JSON.stringify({box,bounds}));};
  const near=(a,b)=>assert(Math.abs(a-b)<1,`${a} vs ${b}`);
  for(const experiment of ['brightness','ebbinghaus','mullerLyer','cafeWall','necker','moire']){
   phase='dock-'+experiment;await mount({experiment});await button('Focus experiment').click();assert.equal(await docking(true),true);await visible(current);const before=await current.boundingBox();
   await controls.hover();await page.mouse.wheel(0,1000);await page.waitForFunction(()=>document.querySelector('.perception-controls').scrollTop>100);const after=await current.boundingBox();near(before.y,after.y);near(before.height,after.height);
   await page.locator('#perception-note').fill('Drawing remains visible while I take notes.');await visible(current);
   const exact=page.locator('[data-perception-exact]').first(),min=Number(await exact.getAttribute('min')),step=Number(await exact.getAttribute('step'));await exact.fill(String(min+step));await exact.press('Enter');await visible(current);near((await current.boundingBox()).y,before.y);
   await button('Go to controls').click();assert.equal(await page.evaluate(()=>document.activeElement.tagName),'SUMMARY');assert((await controls.evaluate(n=>n.scrollTop))<24);await visible(controls.locator('summary'));
   await button('Go to drawing').click();assert.equal(await page.evaluate(()=>document.activeElement.className),'perception-live-pair');await fit();
   if(experiment==='cafeWall'){await page.locator('#perception-note').focus();await page.screenshot({path:path.join(out,'desktop-live-drawing-and-note.png')});}
   checks.push({experiment,independentWheelScroll:true,drawingStationaryWhileTyping:true,navigation:true});
  }
  phase='comparison';await mount({comparison:{experiment:'brightness',model:{reveal:true,context:false}},models:{brightness:{reveal:true,contrast:62}}});await button('Focus experiment').click();
  assert.equal(await scenes.evaluate(n=>[...n.children].findIndex(c=>c.classList.contains('perception-live-pair'))<[...n.children].findIndex(c=>c.classList.contains('perception-deltas'))),true);
  const layout=page.locator('[data-perception-comparison-layout]');
  for(const mode of ['auto','stacked','switch']){
   await layout.selectOption(mode);if(mode==='switch')await page.locator('[data-perception-show-pinned]').click();
   await scenes.evaluate(n=>n.scrollTop=n.scrollHeight);await button('Go to drawing').click();
   const drawing=mode==='switch'?page.locator('#perception-stage-reference'):current;await visible(drawing);
   const a=await current.boundingBox(),b=await page.locator('#perception-stage-reference').boundingBox();near(a.width,b.width);near(a.height,b.height);
   if(mode==='switch'){assert.equal(await page.locator('[data-perception-show-pinned]').getAttribute('aria-pressed'),'true');await button('Back to workspace').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('[inert]')),false);}
  }
  await axe();await page.screenshot({path:path.join(out,'comparison-switch.png')});checks.push({comparisonModes:3,drawingsBeforeTables:true,equalScale:true,pinnedNavigation:true,hiddenLinksSkipped:true,axe:[]});
  phase='study';await mount({models:{brightness:{matching:true}}});await button('Focus experiment').click();await button('Start three matches').click();
  for(let trial=0;trial<3;trial++){await button('Same').click();await button('Record match').click();}await button('Reveal study results').click();await button('Go to drawing').click();await visible(current);
  assert.equal(await scenes.evaluate(n=>[...n.children].findIndex(c=>c.classList.contains('perception-live-pair'))<[...n.children].findIndex(c=>c.classList.contains('perception-study-result'))),true);
  await page.locator('[data-perception-enlarge="active"]').click();await button('Close enlarged drawing').click();await page.waitForFunction(()=>document.activeElement.hasAttribute('data-perception-enlarge'));await axe();checks.push({revealedResultsBelowDrawing:true,nestedViewerFocus:true,axe:[]});
  phase='expand-resize';await mount({});await button('Focus experiment').click();await button('Expand viewing area').click();assert.equal(await docking(false),false);await button('Go to controls').click();await page.locator('[data-perception-exact="contrast"]').fill('64');await page.locator('[data-perception-exact="contrast"]').press('Enter');await button('Compact viewing area').click();assert.equal(await docking(true),true);
  const before=await state();for(const size of [{width:390,height:844},{width:1440,height:1000},{width:760,height:390},{width:1440,height:1000}]){await page.setViewportSize(size);assert.equal(await docking(size.width===1440),size.width===1440);await fit();assert.deepEqual(await state(),before);}
  checks.push({expandedFullWidth:true,compactIndependentScroll:true,resizePreservesState:true});
  for(const {width,height,font,docked} of [{width:320,height:844,font:16,docked:false},{width:390,height:844,font:32,docked:false},{width:760,height:390,font:32,docked:false},{width:1280,height:1000,font:32,docked:false},{width:1060,height:760,font:16,docked:true},{width:1440,height:1000,font:16,docked:true}]){
   phase=`responsive-${width}-${font}`;await page.setViewportSize({width,height});await mount({experiment:'cafeWall'},'light',font);await button('Focus experiment').click();assert.equal(await docking(docked),docked);await button('Go to controls').click();
   const exact=page.locator('[data-perception-exact="offset"]');await exact.fill('72');await exact.press('Enter');await visible(exact);await page.locator('#perception-note').fill('All controls stay reachable.');await visible(page.locator('#perception-note'));await fit();await axe();
   await button('Go to drawing').click();await visible(current);await page.screenshot({path:path.join(out,`workspace-${width}-${font}.png`)});await button('Back to workspace').click();assert.equal((await state()).perceptionLab.models.cafeWall.offset,72);
   checks.push({width,height,font,docked,controlsReachable:true,noOverflow:true,axe:[]});
  }
  await page.setViewportSize({width:1440,height:1000});
  for(const theme of ['dark','contrast','forced-dark']){
   phase=theme;await page.emulateMedia({forcedColors:theme==='forced-dark'?'active':'none',colorScheme:theme==='forced-dark'?'dark':'light'});await mount({experiment:'moire'},theme);await button('Focus experiment').click();await page.locator('[data-perception-exact="angle"]').fill('13.7');await page.locator('[data-perception-exact="angle"]').press('Enter');await visible(current);await fit();await axe();await page.screenshot({path:path.join(out,theme+'.png')});checks.push({theme,controlsAndDrawingVisible:true,axe:[]});
  }
  assert.equal(hash(),sourceSHA256);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({sourceSHA256,checks,errors},null,2)+'\n');console.log(JSON.stringify({passedGroups:checks.length,sourceSHA256,errors}));
 }catch(error){const focus=await page.evaluate(()=>document.activeElement?.outerHTML).catch(()=>null);fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({phase,message:error.message,stack:error.stack,focus,checks,errors,sourceSHA256},null,2)+'\n');await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
