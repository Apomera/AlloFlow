'use strict';
// Checks live layouts in Chromium: scale, stationary switching, focus, masking, and pixels.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=process.env.PERCEPTION_QA_RUNTIME_ROOT||process.cwd(),runtimeRequire=createRequire(path.join(runtime,'package.json'));
const {chromium}=runtimeRequire('playwright');
const read=file=>fs.readFileSync(file,'utf8'),runtimeRead=file=>read(path.join(runtime,file));
const out=path.resolve('reports/artstudio-workspace/perception-live-comparison');fs.mkdirSync(out,{recursive:true});
const hash=()=>crypto.createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell=runtimeRead('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
 .replace('var init = {}; init[id] = state || {};','var init = {otherTool:{preserved:37}}; init[id] = state || {};')
 .replace('var ctx = { React: React','window.__state=pair[0];window.__edit=pair[1];var pp=React.useState("comparison-profile");window.__setProfile=pp[1];var ctx = { activeProfileId:pp[0], React: React')
 .replace('isContrast: false','isContrast:!!window.__qaContrast');
(async()=>{
 const downloadsPath=path.join(out,'.downloads');fs.mkdirSync(downloadsPath,{recursive:true});
 const browser=await chromium.launch({downloadsPath}),page=await browser.newPage({acceptDownloads:true,viewport:{width:1600,height:1100}}),sourceSHA256=hash(),checks=[],errors=[];let phase='mount';
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('http://localhost:47839/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://localhost:47839/');
  await page.setContent('<html><head><style>'+runtimeRead('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'])await page.addScriptTag({content:runtimeRead(file)});
  for(const file of ['stem_lab/stem_lab_module.js','stem_lab/stem_tool_perception.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:runtimeRead('node_modules/axe-core/axe.min.js')});await page.addScriptTag({content:shell});
  const mount=async(state={},theme='light')=>page.evaluate(({state,theme})=>{ReactDOM.unmountComponentAtNode(document.getElementById('slot'));document.documentElement.style.fontSize='';window.__qaContrast=theme==='contrast';document.getElementById('slot').className=theme==='dark'?'theme-dark':theme==='contrast'?'theme-contrast':'theme-default';__mount('perceptionLab',theme==='dark',StemLab.PerceptionEngine.normalize(state));},{state,theme});
  const button=name=>page.getByRole('button',{name,exact:true}),state=()=>page.evaluate(()=>__state),layout=page.locator('[data-perception-comparison-layout]'),showCurrent=page.locator('[data-perception-show-current]'),showPinned=page.locator('[data-perception-show-pinned]');
  const seed=(experiment='brightness')=>({experiment,models:{[experiment]:{target:117,note:'Keep my draft',prediction:'Unsure'}},comparison:{experiment,model:{context:false,target:200}},studies:[{id:'saved',experiment,model:{note:'Keep my observation'}}]});
  const geometry=()=>page.evaluate(()=>{
   const pair=document.querySelector('.perception-live-pair'),base=pair.getBoundingClientRect(),rect=id=>{const node=document.getElementById(id),box=node.getBoundingClientRect(),style=getComputedStyle(node);return{x:box.x-base.x,y:box.y-base.y,width:box.width,height:box.height,visibility:style.visibility,opacity:style.opacity,filter:style.filter,background:style.backgroundColor,forcedColorAdjust:style.forcedColorAdjust};};
   return{width:base.width,height:base.height,current:rect('perception-stage-current'),pinned:rect('perception-stage-reference')};
  });
  const near=(a,b,message)=>assert(Math.abs(a-b)<1,message+': '+a+' / '+b);
  const axe=async(scope='[data-perception-lab]')=>{const violations=await page.evaluate(async scope=>(await window.axe.run(document.querySelector(scope),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.length})),scope);assert.deepEqual(violations,[]);};
  const controlsFit=async()=>{const result=await page.locator('[data-perception-comparison-tools]').evaluate(node=>({overflow:node.scrollWidth>node.clientWidth+1,small:[...node.querySelectorAll('button,select')].filter(item=>{const box=item.getBoundingClientRect();return box.width<44||box.height<44;}).map(node=>node.textContent)}));assert.deepEqual(result,{overflow:false,small:[]});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));};
  const switchCheck=async()=>{
   await layout.selectOption('switch');const before=await geometry();near(before.current.x,before.pinned.x,'Same x');near(before.current.y,before.pinned.y,'Same y');near(before.current.width,before.pinned.width,'Same width');near(before.current.height,before.pinned.height,'Same height');
   await showPinned.click();assert.equal(await showPinned.getAttribute('aria-pressed'),'true');const after=await geometry();assert.equal(after.current.visibility,'hidden');assert.equal(after.pinned.visibility,'visible');near(before.height,after.height,'Stable pair height');near(before.current.y,after.pinned.y,'No drawing shift');
   for(const item of [after.current,after.pinned]){assert.equal(item.opacity,'1');assert.equal(item.filter,'none');assert.equal(item.forcedColorAdjust,'none');assert.equal(item.background,'rgb(255, 255, 255)');}
   await showCurrent.click();assert.equal(await showCurrent.getAttribute('aria-pressed'),'true');return after;
  };
  for(const experiment of ['brightness','ebbinghaus','mullerLyer','cafeWall','necker','moire']){
   phase='experiment-'+experiment;await mount(seed(experiment));const before=await state(),g=await geometry();near(g.current.width,g.pinned.width,'Equal automatic scale');near(g.current.y,g.pinned.y,'Aligned automatic canvases');assert(g.pinned.x>g.current.x);
   await layout.selectOption('stacked');const stacked=await geometry();assert(stacked.current.width>g.current.width*1.8);near(stacked.current.width,stacked.pinned.width,'Equal stacked scale');assert(stacked.pinned.y>stacked.current.y+stacked.current.height);
   await switchCheck();assert.deepEqual(await state(),before);checks.push({experiment,allLayouts:true,equalScale:true,stationarySwitch:true,colorsUnmodified:true,savedStateUnchanged:true});
  }
  for(const width of [320,390,768,1280,1600]){
   phase='viewport-'+width;await page.setViewportSize({width,height:1000});await mount(seed('ebbinghaus'));
   for(const mode of ['auto','stacked','switch']){
    await layout.selectOption(mode);if(mode==='switch')await switchCheck();const g=await geometry();near(g.current.width,g.pinned.width,'Responsive equal scale');if(mode==='auto'&&width<1000)assert(g.pinned.y>g.current.y,'Narrow automatic layout should stack');await controlsFit();await axe();
    if(width===1600)await page.locator('.perception-scenes').screenshot({path:path.join(out,'desktop-'+mode+'.png')});
   }
   await button('Focus experiment').click();const before=await state();await switchCheck();await controlsFit();await axe('[data-perception-focus-dialog]');assert.deepEqual(await state(),before);
   await showPinned.click();await page.screenshot({path:path.join(out,'focused-'+width+'.png')});await button('Back to workspace').click();assert.equal(await showPinned.getAttribute('aria-pressed'),'true');checks.push({width,threeLayoutsResponsive:true,focusedSwitch:true,axe:[],controls44px:true,noOverflow:true});
  }
  phase='keyboard';await page.setViewportSize({width:1280,height:1000});const revealed=seed();revealed.models.brightness.reveal=true;await mount(revealed);await layout.selectOption('switch');await showCurrent.focus();await page.keyboard.press('Tab');assert.equal(await showPinned.evaluate(node=>node===document.activeElement),true);await page.keyboard.press('Enter');
  assert.equal(await showPinned.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.perception-live-stage a').evaluate(node=>{node.focus();return document.activeElement===node;}),false);
  await page.keyboard.press('Shift+Tab');assert.equal(await showCurrent.evaluate(node=>node===document.activeElement),true);await page.keyboard.press('Space');assert.equal(await showCurrent.getAttribute('aria-pressed'),'true');
  await showPinned.click();await button('Clear comparison').click();assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Current experiment');checks.push({nativeKeyboardControls:true,inactiveDrawingInert:true,clearRestoresFocus:true});
  phase='editing';await mount(seed());await layout.selectOption('switch');await showPinned.click();await page.locator('#perception-note').fill('A new note');assert.equal(await showPinned.getAttribute('aria-pressed'),'true');await page.locator('#perception-contrast').focus();await page.keyboard.press('ArrowLeft');assert.equal(await showCurrent.getAttribute('aria-pressed'),'true');checks.push({notesKeepSelection:true,drawingEditShowsCurrent:true});
  for(const theme of ['dark','contrast','forced-light','forced-dark']){
   phase=theme;await page.emulateMedia({forcedColors:theme.startsWith('forced')?'active':'none',colorScheme:theme==='forced-dark'?'dark':'light'});await mount(seed(),theme);await switchCheck();await showPinned.click();await axe();await controlsFit();await page.locator('.perception-scenes').screenshot({path:path.join(out,theme+'.png')});checks.push({theme,colorsPreserved:true,axe:[]});
  }
  await page.emulateMedia({forcedColors:'none',colorScheme:'light'});
  phase='text-200';await page.setViewportSize({width:390,height:844});await mount({...seed('mullerLyer'),comparison:{experiment:'necker',model:{}}});await page.evaluate(()=>document.documentElement.style.fontSize='32px');await button('Focus experiment').click();await switchCheck();await controlsFit();await axe('[data-perception-focus-dialog]');await page.screenshot({path:path.join(out,'text-200.png')});checks.push({text200Percent:true,differentExperimentsSamePosition:true,noOverflow:true,axe:[]});
  phase='study';await mount({...seed(),models:{brightness:{matching:true}}});await layout.selectOption('switch');await showPinned.click();await button('Start three matches').click();assert.equal(await layout.count(),0);assert.equal(await page.locator('#perception-stage-reference').count(),0);assert.equal(await button('Export PNG').isDisabled(),true);
  for(let trial=0;trial<3;trial++){await button('Same').click();await button('Record match').click();}assert.equal(await showCurrent.getAttribute('aria-pressed'),'true');assert.equal(await button('Export PNG').isDisabled(),true);await button('Reveal study results').click();checks.push({studyMasksComparisonWhileCollecting:true,resultsRemainHiddenUntilRevealed:true});
  phase='current-export';await page.setViewportSize({width:1600,height:1100});await mount(seed());await layout.selectOption('switch');await showPinned.click();const before=await state();const event=page.waitForEvent('download');await button('Export PNG').click();const download=await event,file=path.join(out,'current-from-pinned.png');await download.saveAs(file);const png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),2400);assert.equal(png.readUInt32BE(20),1440);
  const pixel=await page.evaluate(async encoded=>{const image=new Image();image.src='data:image/png;base64,'+encoded;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);return Array.from(context.getImageData(660,720,1,1).data);},png.toString('base64'));assert.deepEqual(pixel,[117,117,117,255]);assert.equal(await showPinned.getAttribute('aria-pressed'),'true');assert.deepEqual(await state(),before);checks.push({exportUsesCurrentWhilePinnedVisible:true,currentPixel:pixel,savedStateUnchanged:true});
  const finalSourceSHA256=hash();assert.equal(finalSourceSHA256,sourceSHA256);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'comparison-browser-results.json'),JSON.stringify({sourceSHA256,loadedSourceSHA256:sourceSHA256,finalSourceSHA256,checks,errors},null,2)+'\n');console.log(JSON.stringify({passedGroups:checks.length,sourceSHA256,errors}));
 }catch(error){fs.writeFileSync(path.join(out,'comparison-browser-failure.json'),JSON.stringify({phase,message:error.message,stack:error.stack,checks,errors,sourceSHA256,finalSourceSHA256:hash()},null,2)+'\n');console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
