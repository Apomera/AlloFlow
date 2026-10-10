'use strict';
// Native focused-workspace browsing, draft blur, study protection, and visual access.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=process.env.PERCEPTION_QA_RUNTIME_ROOT||process.cwd(),runtimeRequire=createRequire(path.join(runtime,'package.json'));
const {chromium}=runtimeRequire('playwright');
const read=file=>fs.readFileSync(file,'utf8'),runtimeRead=file=>read(path.join(runtime,file));
const out=path.resolve('reports/artstudio-workspace/perception-focus-browsing');fs.mkdirSync(out,{recursive:true});
const hash=()=>crypto.createHash('sha256').update(read('stem_lab/stem_tool_perception.js')).digest('hex');
const shell=runtimeRead('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
 .replace('var init = {}; init[id] = state || {};','var init = {otherTool:{preserved:37}}; init[id] = state || {};')
 .replace('var ctx = { React: React','window.__state=pair[0];window.__edit=pair[1];var ctx = { activeProfileId:"focus-browsing", React: React')
 .replace('isContrast: false','isContrast:!!window.__qaContrast')
 .replace('announceToSR: function(){}','announceToSR: function(message){window.__announcements.push(message);}');
const experiments=[
 ['brightness','Brightness & context','contrast',63],['ebbinghaus','Size & surroundings','surround',44],
 ['mullerLyer','Lines & arrowheads','angle',55],['cafeWall','Café wall','offset',72],
 ['necker','Ambiguous cube','depth',73],['moire','Moiré interference','angle',13.7],
];
(async()=>{
 const browser=await chromium.launch({args:['--disable-gpu']}),page=await browser.newPage({viewport:{width:1440,height:1000}}),sourceSHA256=hash(),checks=[],errors=[];let phase='mount';
 page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.route('http://localhost:47839/**',route=>route.fulfill({contentType:'text/html',body:'<html><body></body></html>'}));await page.goto('http://localhost:47839/');
  await page.setContent('<html><head><style>'+runtimeRead('dev-tools/.cache/sweep-tailwind.css')+'</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
  for(const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js','desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js'])await page.addScriptTag({content:runtimeRead(file)});
  for(const file of ['stem_lab/stem_lab_module.js','stem_lab/stem_tool_perception.js'])await page.addScriptTag({content:read(file)});
  await page.addScriptTag({content:runtimeRead('node_modules/axe-core/axe.min.js')});await page.addScriptTag({content:shell});
  await page.evaluate(()=>{const close=HTMLDialogElement.prototype.close;HTMLDialogElement.prototype.close=function(...args){if(this.hasAttribute('data-perception-focus-dialog'))window.__focusCloseCount++;return close.apply(this,args);};});
  const dialog=page.locator('[data-perception-focus-dialog]'),picker=page.locator('[data-perception-focus-picker]'),previous=page.locator('[data-perception-focus-previous]'),next=page.locator('[data-perception-focus-next]'),description=page.locator('[data-perception-focus-description]');
  const button=name=>page.getByRole('button',{name,exact:true}),state=()=>page.evaluate(()=>__state),exact=key=>page.locator('[data-perception-exact="'+key+'"]');
  const mount=async(state={},theme='light',font=16)=>page.evaluate(({state,theme,font})=>{
   ReactDOM.unmountComponentAtNode(document.getElementById('slot'));document.documentElement.style.fontSize=font+'px';window.__qaContrast=theme==='contrast';window.__announcements=[];window.__focusCloseCount=0;
   document.getElementById('slot').className=theme==='dark'?'theme-dark':theme==='contrast'?'theme-contrast':'theme-default';__mount('perceptionLab',theme==='dark',StemLab.PerceptionEngine.normalize(state));
  },{state,theme,font});
  const seed=()=>({models:Object.fromEntries(experiments.map(([id,,key,value])=>[id,{[key]:value,note:'Saved note for '+id,prediction:'Unsure'}])),studies:[{id:'existing-observation',experiment:'cafeWall',model:{offset:31,note:'Keep notebook observation',prediction:'Level'}}],comparison:{experiment:'necker',model:{depth:64,cue:'front',note:'Pinned interpretation'}}});
  const enter=async()=>{await button('Focus experiment').click();await dialog.evaluate(node=>{window.__originalFocusDialog=node;});assert.equal(await dialog.evaluate(node=>node.open),true);};
  const sameDialog=async()=>{
   const result=await page.evaluate(()=>({open:document.querySelector('[data-perception-focus-dialog]')?.open,same:document.querySelector('[data-perception-focus-dialog]')===window.__originalFocusDialog,closeCount:window.__focusCloseCount,currentScenes:document.querySelectorAll('#perception-stage-current').length,notes:document.querySelectorAll('#perception-note').length,modalCount:[...document.querySelectorAll('dialog')].filter(n=>n.open).length}));
   assert.deepEqual(result,{open:true,same:true,closeCount:0,currentScenes:1,notes:1,modalCount:1});
  };
  const changed=async(id,control)=>{
   await page.waitForFunction(id=>__state.perceptionLab.experiment===id,id);await page.waitForFunction(id=>document.querySelector('[data-perception-focus-picker]')?.value===id,id);
   await page.waitForFunction(control=>document.activeElement?.hasAttribute('data-perception-focus-'+control),control);
   const title=experiments.find(item=>item[0]===id)[1];
   assert.equal(await picker.inputValue(),id);assert((await dialog.locator('h2').textContent()).includes(title));
   assert.equal(await page.locator('[data-perception-focus-'+control+']').evaluate(node=>node===document.activeElement),true);
   const index=experiments.findIndex(item=>item[0]===id);assert.equal(await previous.getAttribute('aria-label'),'Previous experiment: '+experiments[(index+5)%6][1]);assert.equal(await next.getAttribute('aria-label'),'Next experiment: '+experiments[(index+1)%6][1]);
   assert((await page.evaluate(()=>__announcements.at(-1))).includes(title));await sameDialog();
   // A short dialog may scroll its header to retain focus on the initiating control.
   const scroll=await dialog.evaluate(node=>[...node.querySelectorAll('.perception-focus-body,.perception-controls,.perception-scenes')].map(n=>n.scrollTop));assert(scroll.every(value=>value<12),JSON.stringify(scroll));
  };
  const choose=async id=>{await picker.focus();await picker.selectOption(id);await changed(id,'picker');};
  const axe=async()=>{const violations=await page.evaluate(async()=>(await axe.run(document.querySelector('[data-perception-focus-dialog]'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})));assert.deepEqual(violations,[]);};
  const fit=async()=>{
   const issues=await dialog.evaluate(node=>({page:document.documentElement.scrollWidth>innerWidth+1,dialog:node.scrollWidth>node.clientWidth+1,panes:[...node.querySelectorAll('.perception-controls,.perception-scenes,.perception-focus-heading')].filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.className),targets:[...node.querySelectorAll('[data-perception-focus-picker],[data-perception-focus-previous],[data-perception-focus-next]')].filter(n=>{const b=n.getBoundingClientRect();return b.width<44||b.height<44;}).map(n=>n.outerHTML)}));
   assert.deepEqual(issues,{page:false,dialog:false,panes:[],targets:[]});
  };
  const headerSafe=async matching=>{
   const text=await description.textContent();assert(text.trim());assert(!/Both squares: RGB|Both center diameters:|Both shafts:|Reference: \d|right RGB \d|no unique front face|identical endpoints|same RGB fill/.test(text),text);
   if(matching)assert(/fixed|reference|adjustable|match/i.test(text),text);
  };
  const drawingVisible=async()=>{
   const metrics=await page.locator('#perception-stage-current').evaluate(svg=>{
    const rect=svg.getBoundingClientRect(),body=svg.closest('.perception-focus-body'),bodyStyle=getComputedStyle(body),font=parseFloat(bodyStyle.fontSize);
    let left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right),top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom);
    for(let ancestor=svg.parentElement;ancestor;ancestor=ancestor.parentElement){
     const style=getComputedStyle(ancestor),box=ancestor.getBoundingClientRect();
     if(/auto|scroll|hidden|clip/.test(style.overflowX)){left=Math.max(left,box.left+ancestor.clientLeft);right=Math.min(right,box.left+ancestor.clientLeft+ancestor.clientWidth);}
     if(/auto|scroll|hidden|clip/.test(style.overflowY)){top=Math.max(top,box.top+ancestor.clientTop);bottom=Math.min(bottom,box.top+ancestor.clientTop+ancestor.clientHeight);}
    }
    const art=[...svg.querySelectorAll('[data-perception-target],[data-perception-context],[data-perception-edge]')],clippedArt=art.filter(node=>{const box=node.getBoundingClientRect();return box.left<left-1||box.right>right+1||box.top<top-1||box.bottom>bottom+1;}).map(node=>node.outerHTML);
    return {drawingWidth:rect.width,drawingHeight:rect.height,visibleWidth:Math.max(0,right-left),visibleHeight:Math.max(0,bottom-top),bodyHeight:body.clientHeight,bodyOverflow:bodyStyle.overflowY,minimumBodyHeight:8*font,artNodeCount:art.length,clippedArt};
   });
   assert(metrics.bodyOverflow!=='auto'||metrics.bodyHeight>=metrics.minimumBodyHeight,JSON.stringify(metrics));
   assert(metrics.visibleWidth>=metrics.drawingWidth*.98&&metrics.visibleHeight>=metrics.drawingHeight*.98,JSON.stringify(metrics));assert(metrics.artNodeCount>0);assert.deepEqual(metrics.clippedArt,[]);return metrics;
  };
  phase='six-experiment-cycle';await mount(seed());await enter();const baseline=(await state()).perceptionLab;
  for(let index=0;index<experiments.length;index++){
   const [id,,key,value]=experiments[index];phase='native-blur-'+id;if(index>0)await choose(id);
   await page.locator('#perception-note').fill('Edited note for '+id);await exact(key).fill(String(value===13.7?17.2:value+1));
   assert.equal((await state()).perceptionLab.models[id][key],value);await next.click();await changed(experiments[(index+1)%6][0],'next');
   assert.equal((await state()).perceptionLab.models[id][key],value===13.7?17.2:value+1);await previous.click();await changed(id,'previous');
   assert.equal((await state()).perceptionLab.models[id].note,'Edited note for '+id);assert.equal((await state()).perceptionLab.models[id].prediction,'Unsure');assert.equal(Number(await exact(key).inputValue()),value===13.7?17.2:value+1);await headerSafe(false);
   assert.deepEqual((await state()).perceptionLab.studies,baseline.studies);assert.deepEqual((await state()).perceptionLab.comparison,baseline.comparison);assert.deepEqual((await state()).otherTool,{preserved:37});
   checks.push({experiment:id,nativeNumberBlurAppliedBeforeButtonSwitch:true,returnKeepsModelNotePrediction:true,oneNativeDialog:true,scrollReset:true,announcedTitle:true});
  }
  phase='native-picker-blur';await choose('brightness');await exact('contrast').fill('67');await picker.focus();await picker.selectOption('necker');await changed('necker','picker');await choose('brightness');assert.equal((await state()).perceptionLab.models.brightness.contrast,67);assert.equal(await exact('contrast').inputValue(),'67');checks.push({nativePickerFocusAppliesNumericDraft:true});
  phase='wrap-and-keyboard';await choose('brightness');await previous.focus();await previous.press('Enter');await changed('moire','previous');await next.focus();await next.press('Space');await changed('brightness','next');
  await picker.focus();await picker.press('End');await picker.press('Enter');await changed('moire','picker');await next.click();await changed('brightness','next');
  const targets=await dialog.evaluate(node=>[...node.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],summary')].filter(item=>{const closed=item.closest('details:not([open])');return !item.closest('[hidden],[inert],[aria-hidden=true]')&&(!closed||item===closed.querySelector('summary'));}).map((n,index)=>{n.dataset.qaTabIndex=index;return index;}));
  const first=page.locator('[data-qa-tab-index="0"]'),last=page.locator('[data-qa-tab-index="'+targets.at(-1)+'"]');await last.focus();await last.press('Tab');assert.equal(await first.evaluate(n=>n===document.activeElement),true);await first.press('Shift+Tab');assert.equal(await last.evaluate(n=>n===document.activeElement),true);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-perception-focus-dialog]').open);assert.equal(await dialog.evaluate(n=>n.open),false);assert.equal(await button('Focus experiment').evaluate(n=>n===document.activeElement),true);checks.push({previousAndNextWrap:true,nativePickerKeyboard:true,keyboardTrapAndEscape:true});
  for(const mode of ['auto','stacked','switch']){
   phase='comparison-'+mode;await mount(seed());await enter();const pinned=(await state()).perceptionLab.comparison;await page.locator('[data-perception-comparison-layout]').selectOption(mode);if(mode==='switch')await page.locator('[data-perception-show-pinned]').click();
   await page.locator('.perception-controls').evaluate(n=>n.scrollTop=n.scrollHeight);await page.locator('.perception-scenes').evaluate(n=>n.scrollTop=n.scrollHeight);await next.click();await changed('ebbinghaus','next');
   assert.equal(await page.locator('[data-perception-comparison-layout]').inputValue(),mode);assert.deepEqual((await state()).perceptionLab.comparison,pinned);assert.equal(await page.locator('#perception-stage-reference title').textContent(),'Ambiguous cube');await previous.click();await changed('brightness','previous');await fit();await axe();
   if(mode==='switch')await page.screenshot({path:path.join(out,'comparison-browsing.png')});checks.push({comparisonLayout:mode,pinnedDrawingAndLayoutPreserved:true,panesResetAfterScroll:true,axe:[]});
  }
  phase='expanded';await mount({...seed(),expanded:true});await enter();await next.click();await changed('ebbinghaus','next');assert.equal((await state()).perceptionLab.expanded,true);await button('Compact viewing area').click();await next.click();await changed('mullerLyer','next');assert.equal((await state()).perceptionLab.expanded,false);checks.push({expandedAndCompactLayoutsPreservedAcrossBrowsing:true});
  phase='motion';await mount({experiment:'moire',models:{moire:{angle:13.7}}});await enter();await button('Play slow rotation').click();await page.waitForFunction(()=>Number(document.querySelector('#perception-angle').value)>14);
  await next.evaluate(node=>node.addEventListener('pointerdown',()=>window.__angleAtSwitch=Number(document.querySelector('#perception-angle').value),{once:true}));await next.click();await changed('brightness','next');
  const visible=await page.evaluate(()=>__angleAtSwitch),saved=(await state()).perceptionLab.models.moire.angle;assert(Math.abs(saved-visible)<.11,JSON.stringify({visible,saved}));await previous.click();await changed('moire','previous');assert.equal(Number(await exact('angle').inputValue()),saved);assert.equal(await button('Play slow rotation').getAttribute('aria-pressed'),'false');checks.push({moireSwitchPausesAtVisibleFrame:true,visibleAngle:visible,savedAngle:saved});
  for(const experiment of ['brightness','ebbinghaus','mullerLyer']){
   phase='study-lock-'+experiment;await mount({experiment,models:{[experiment]:{matching:true,matchValue:experiment==='brightness'?117:experiment==='ebbinghaus'?43:382}}});await enter();await headerSafe(true);await button('Start three matches').click();
   const locked=async()=>{for(const control of [picker,previous,next])assert.equal(await control.isDisabled(),true);const before=await state();await page.evaluate(()=>{const picker=document.querySelector('[data-perception-focus-picker]');picker.value='necker';picker.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-perception-focus-next]').click();});assert.deepEqual(await state(),before);await sameDialog();};
   await locked();for(let trial=0;trial<3;trial++){await button('Same').click();await button('Record match').click();await locked();}await button('Reveal study results').click();await locked();await headerSafe(true);await button('End repeated study').click();
   for(const control of [picker,previous,next])assert.equal(await control.isDisabled(),false);const count=(await state()).perceptionLab.studies.length;await next.click();await changed(experiments[(experiments.findIndex(e=>e[0]===experiment)+1)%6][0],'next');assert.equal((await state()).perceptionLab.studies.length,count);checks.push({experiment,browsingLockedThroughoutStudyAndReveal:true,endStudyUnlocks:true,headerKeepsAnswersHidden:true,recordsPreserved:true});
  }
  for(const {width,height,font} of [{width:320,height:844,font:16},{width:390,height:844,font:16},{width:760,height:390,font:16},{width:1060,height:760,font:16},{width:1440,height:1000,font:16},{width:320,height:844,font:32},{width:390,height:844,font:32},{width:760,height:390,font:32},{width:1060,height:760,font:32},{width:1440,height:1000,font:32}]){
   phase=`layout-${width}-${font}`;await page.setViewportSize({width,height});await mount(seed(),'light',font);await enter();await next.click();await changed('ebbinghaus','next');await fit();await axe();
   await picker.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`navigation-${width}-${font}.png`)});await button('Go to controls').click();await page.locator('#perception-note').fill('Reachable note');await exact('surround').fill('41');await next.click();await changed('mullerLyer','next');assert.equal((await state()).perceptionLab.models.ebbinghaus.surround,41);await button('Go to drawing').click();
   const visibility=await drawingVisible();await fit();await page.screenshot({path:path.join(out,`drawing-${width}-${font}.png`)});checks.push({width,height,font,headerTargets44px:true,noHorizontalOverflow:true,navigationAndDraftReachable:true,drawingReachable:true,visibility,axe:[]});
  }
  await page.setViewportSize({width:1440,height:1000});
  for(const theme of ['dark','contrast','forced-light','forced-dark']){
   phase='theme-'+theme;await page.emulateMedia({forcedColors:theme.startsWith('forced')?'active':'none',colorScheme:theme==='forced-dark'?'dark':'light'});await mount(seed(),theme);await enter();await next.click();await changed('ebbinghaus','next');await fit();await axe();await picker.focus();await page.screenshot({path:path.join(out,theme+'.png')});checks.push({theme,headerNavigationAccessible:true,targets44px:true,axe:[]});
  }
  const finalSourceSHA256=hash();assert.equal(finalSourceSHA256,sourceSHA256);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({sourceSHA256,loadedSourceSHA256:sourceSHA256,finalSourceSHA256,checks,errors},null,2)+'\n');console.log(JSON.stringify({passedGroups:checks.length,sourceSHA256,errors}));
 }catch(error){const focus=await page.evaluate(()=>document.activeElement?.outerHTML).catch(()=>null);fs.writeFileSync(path.join(out,'browser-failure.json'),JSON.stringify({phase,message:error.message,stack:error.stack,focus,checks,errors,sourceSHA256,finalSourceSHA256:hash()},null,2)+'\n');await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
