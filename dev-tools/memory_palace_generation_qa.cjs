const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const {chromium}=require('@playwright/test'),esbuild=require('esbuild'),{parse}=require('@babel/parser');
const root=path.resolve(__dirname,'..'),req=createRequire(path.join(root,'desktop/web-app/package.json'));
const out=path.join(root,'reports/memory-palace-enhancement',process.argv.includes('--prompt-format')?'prompt-format-review':process.argv.includes('--attempt-feedback')?'recall-attempt-feedback-review':process.argv.includes('--vr-choices')?'recall-vr-choices-review':process.argv.includes('--auto-navigation')?'recall-auto-navigation-review':process.argv.includes('--position')?'recall-position-review':process.argv.includes('--scene-recall')?'recall-scene-review':process.argv.includes('--self-resume')?'recall-self-resume-review':process.argv.includes('--single-answer')?'recall-single-answer-review':process.argv.includes('--choice-layout')?'recall-choice-layout-review':process.argv.includes('--choice-identity')?'recall-choice-identity-review':process.argv.includes('--stop-feedback')?'recall-stop-feedback-review':process.argv.includes('--drafts')?'recall-drafts-review':process.argv.includes('--typing')?'recall-typing-review':process.argv.includes('--navigation')?'recall-navigation-review':process.argv.includes('--help')?'recall-help-review':process.argv.includes('--content')?'recall-content-review':process.argv.includes('--pacing')?'recall-pacing-review':process.argv.includes('--feedback')?'recall-feedback-review':process.argv.includes('--controls')?'controls-review':process.argv.includes('--previews')?'preview-practice-review':'generation-review');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const src=fs.readFileSync(path.join(root,'view_renderers_source.jsx'),'utf8');
 const ast=parse(src,{sourceType:'script',plugins:['jsx']});
 const nodes=ast.program.body.flatMap(n=>n.declarations||[]).filter(n=>['_alloRuntimeAiAvailable','MemoryPalaceView','_mpTourPaces','_mpEsc','_mpStampImage'].includes(n.id.name));
 const code=nodes.map(n=>'const '+src.slice(n.start,n.end)+';').join('\n');
 const component=esbuild.transformSync('const _voPalaceEnsure=()=>Promise.resolve(true),_voPrim3dEnsure=()=>Promise.resolve(true),_voGlbEnsure=()=>Promise.resolve(false);'+code+'\nwindow.PalaceView=MemoryPalaceView;',{loader:'jsx',target:'es2020'}).code;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import{createRoot}from'react-dom/client';window.React=React;window.createRoot=createRoot;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const config={...req('./tailwind.config.js'),content:[path.join(root,'view_renderers_source.jsx')]};
 const css=(await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<!doctype html><html><head></head><body style="background:#f8fafc;font-family:system-ui"><main id="root" style="max-width:1200px;margin:auto;padding:16px"></main></body></html>');
 await page.addStyleTag({content:css});await page.addScriptTag({content:runtime});
 for(const file of ['vendor/three-r128/three.min.js','memory_palace_module.js','prim3d_module.js'])await page.addScriptTag({path:path.join(root,file)});
 if(process.argv.includes('--scene-recall'))await page.evaluate(()=>{
  const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){(this.canvas.__qaTexts||(this.canvas.__qaTexts=[])).push(String(text));return draw.call(this,text,...args);};
  const Renderer=THREE.WebGLRenderer;THREE.WebGLRenderer=function(...args){const r=new Renderer(...args),render=r.render;r.render=function(scene,...rest){window.__lastScene=scene;return render.call(r,scene,...rest);};return r;};
 });
 await page.addScriptTag({content:component});
 await page.evaluate(teacherMode=>{
  const R=window.React;window.__toasts=[];window.__pending=[];window.__completions=[];window.__closeCount=0;window.callGemini=()=>Promise.resolve('{"verdict":"ok"}');
  const MP=window.AlloModules.MemoryPalace,render=MP.render;
  MP.render=function(...args){const h=render.apply(this,args);window.__handle=h;window.__vrRecall=args[2]?.vrRecall;return h;};
  const sample={main:'The Water Cycle',branches:[{title:'Sky Observatory',items:['Evaporation','Condensation'],mnemonics:['A kettle the size of a house boils a lake into golden steam.','A cloud knitting itself from silver wool.']}]};
  function App(){const[armed,setArmed]=R.useState(false);window.__setArmed=setArmed;const[data,setData]=R.useState(sample);window.__data=data;window.__setData=setData;const[imagesOn,setImagesOn]=R.useState(true);window.__setImagesOn=setImagesOn;return R.createElement(window.PalaceView,{data,armed,isTeacherMode:teacherMode,onRecallClose:()=>window.__closeCount++,onGameComplete:(...args)=>window.__completions.push(args),title:'Water Cycle',t:()=>null,onPersist:(v)=>setData(p=>({...p,memoryPalace:v})),addToast:(...args)=>window.__toasts.push(args),callImagen:imagesOn?()=>new Promise((resolve,reject)=>window.__pending.push({resolve,reject})):undefined});}
  window.__root=window.createRoot(document.getElementById('root'));window.__root.render(R.createElement(App));
 },process.argv.includes('--typing')||process.argv.includes('--drafts')||process.argv.includes('--position')||process.argv.includes('--attempt-feedback'));
 await page.waitForSelector('#root canvas');





 if(process.argv.includes('--prompt-format')){
  await page.evaluate(()=>{window.__evaluations=[];window.callGemini=prompt=>{window.__evaluations.push(prompt);return Promise.resolve(JSON.stringify({verdict:'enhance',reason:'Make the cue more vivid.',enhancedPrompt:'A giant golden kettle'}));};});
  await page.getByRole('button',{name:/Art & customize/}).click();await page.getByRole('button',{name:/Direct the AI/,exact:false}).click();await page.evaluate(()=>window.__handle.goTo(1));
  const input=page.getByRole('textbox',{name:'Describe what the AI should create here',exact:true}),image=page.getByRole('button',{name:'🖼 Image',exact:true}),sculpture=page.getByRole('button',{name:'🗿 Sculpture',exact:true});
  const draft='A giant kettle sending golden steam across the lake';await input.fill(draft);await sculpture.focus();await page.keyboard.press('Enter');
  if(await input.inputValue()!==draft)throw Error('Changing format erased the prompt');await image.click();if(await input.inputValue()!==draft)throw Error('Returning to image erased the prompt');
  await page.getByRole('button',{name:'Check & create',exact:true}).click();await page.getByRole('button',{name:/Use the improved version/}).waitFor();await sculpture.click();await input.waitFor();
  if(await input.inputValue()!==draft)throw Error('Changing format after evaluation erased the prompt');if(await page.getByRole('button',{name:/Use the improved version/}).count())throw Error('Old format evaluation remained actionable');
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');await input.locator('xpath=../../..').screenshot({path:path.join(out,'format-draft-'+width+'.png')});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Prompt format overflow');}
  await page.getByRole('button',{name:'Check & create',exact:true}).click();await page.getByRole('button',{name:/Use the improved version/}).waitFor();
  const checks=await page.evaluate(()=>window.__evaluations);if(checks.length!==2||checks[0]===checks[1])throw Error('New format was not reevaluated');if(await page.evaluate(()=>window.__pending.length))throw Error('Format changes unexpectedly generated an image');
  await image.click();await page.evaluate(()=>window.__handle.goTo(2));await input.waitFor();if(await input.inputValue())throw Error('Prompt carried into a different stop');
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,formatDraftPreserved:true,keyboardSwitch:true,oldEvaluationCleared:true,newFormatRechecked:true,noUnrequestedGeneration:true,newStopClears:true,widths:[1280,390,320],pageErrors:errors},null,2));console.log('Image/sculpture switching preserves prompts and requires a fresh format-specific check.');return;
 }
 if(process.argv.includes('--attempt-feedback')){
  const panel=page.locator('[data-palace-recall-panel]'),input=panel.getByRole('textbox');
  await page.locator('[data-recall-mode="type"]').click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();await input.fill('rain');
  for(let n=1;n<=3;n++){await input.press('Enter');await panel.getByText('Attempt '+n,{exact:true}).waitFor();if(!await input.evaluate(el=>el===document.activeElement))throw Error('Wrong answer moved typing focus');}
  const status=panel.getByRole('status').filter({hasText:'Not quite — try again.'});if(!await status.getByText('Attempt 3',{exact:true}).count())throw Error('Attempt number is outside the live feedback');
  await page.evaluate(()=>window.__handle.goTo(2));await panel.getByText('Palace frame 2',{exact:true}).waitFor();if(await status.count())throw Error('Feedback leaked to untouched stop');
  await page.evaluate(()=>window.__handle.goTo(1));await panel.getByText('Attempt 3',{exact:true}).waitFor();
  for(const width of [1280,390,320]){await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');await panel.screenshot({path:path.join(out,'attempt-feedback-'+width+'.png')});if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Attempt feedback overflow');}
  await input.fill('Evaporation');await input.press('Enter');await panel.getByText('Correct after another try',{exact:true}).waitFor();if(await status.count())throw Error('Wrong feedback remained after success');await panel.getByRole('button',{name:'Continue review',exact:true}).click();await input.fill('Condensation');await input.press('Enter');await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  const scores=await page.evaluate(()=>window.__completions);if(scores.length!==1||scores[0][1].attempts!==5)throw Error('Feedback updates changed scoring');
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.locator('[data-recall-mode="type"]').click();await input.fill('rain');await input.press('Enter');await panel.getByText('Attempt 1',{exact:true}).waitFor();
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,eachRetryUpdatesLiveText:true,typingFocusPreserved:true,attemptsRestorePerStop:true,untouchedStopsClear:true,successClears:true,newReviewResets:true,scoringUnchanged:true,widths:[1280,390,320],pageErrors:errors},null,2));console.log('Repeated retry feedback updates, preserves focus, and remains scoped to its stop.');return;
 }
 if(process.argv.includes('--vr-choices')){
  const panel=page.locator('[data-palace-recall-panel]');
  await page.evaluate(()=>window.__setData({main:'Many stops',branches:[{title:'Science Room',items:['Proton','Photon','Neutron','Electron','Atom','Molecule','Ion','Isotope']}]}));
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  const sync=await page.evaluate(()=>{const pal=window.AlloModules.MemoryPalace.buildPalace(window.__data);const before=window.__vrRecall.getBank('b0_i0');const missing=pal.route.find(id=>id!=='__entry'&&!before.some(c=>c.id===id));const idx=pal.route.indexOf(missing);window.__handle.goTo(idx);const choices=window.__vrRecall.getBank(missing);return {missing,idx,choices,old:before[0]};});
  if(!sync.choices.some(c=>c.id===sync.missing))throw Error('VR target answer missing immediately after navigation');
  await page.evaluate(({old})=>window.__vrRecall.onPick('b0_i0',old),sync);
  if(await panel.getByText('Not quite — try again.',{exact:true}).count()||await panel.getByRole('button',{name:'Continue review',exact:true}).count())throw Error('Stale VR pick recorded a response');
  const invalid=await page.evaluate(({missing})=>{const api=window.__vrRecall;api.onPick(missing,{id:'invented',label:'fake'});const choice=api.getBank(missing).find(c=>c.id===missing);api.onPick(missing,choice);return api.getBank(missing);},sync);
  if(invalid.length)throw Error('Completed stop still offers VR choices');await panel.getByText('Correct on the first try',{exact:true}).waitFor();
  await page.evaluate(()=>window.__handle.goTo(0));if((await page.evaluate(()=>window.__vrRecall.getBank('__entry'))).length)throw Error('Entrance offers answers');
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).click();if((await page.evaluate(()=>window.__vrRecall.getBank('b0_i0'))).length)throw Error('Self-check exposes VR answer choices');
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,synchronousTargetChoices:true,stalePickIgnored:true,invalidPickIgnored:true,completedBankEmpty:true,entranceBankEmpty:true,selfCheckBankEmpty:true,realReactWebGLCallbacks:true,headsetTested:false,pageErrors:errors},null,2));console.log('VR callbacks resolve the target immediately, reject stale picks, and hide completed or ineligible banks.');return;
 }
 if(process.argv.includes('--auto-navigation')){
  const panel=page.locator('[data-palace-recall-panel]'),start=page.getByRole('button',{name:'🧠 Recall walk',exact:true});
  await start.click();await panel.getByRole('button',{name:'Evaporation',exact:true}).waitFor();
  await page.evaluate(()=>{const p=document.querySelector('[data-palace-recall-panel]');[...p.querySelectorAll('button')].find(b=>b.textContent.trim()==='Evaporation').click();window.__handle.goTo(0);});
  await panel.getByText('You are at the entrance',{exact:true}).waitFor();await page.waitForTimeout(1000);await panel.getByText('You are at the entrance',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Continue review',exact:true}).click();await panel.getByText('Review stop 2 of 2',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Condensation',exact:true}).click();await panel.getByText(/Perfect walk/).waitFor();
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await start.click();await panel.getByRole('button',{name:'Evaporation',exact:true}).waitFor();
  await page.evaluate(()=>{const p=document.querySelector('[data-palace-recall-panel]');[...p.querySelectorAll('button')].find(b=>b.textContent.trim()==='Evaporation').click();window.__handle.goTo(2);window.__handle.goTo(1);});
  await page.waitForTimeout(1000);await panel.getByText('Palace frame 1',{exact:true}).waitFor();await panel.getByText('Correct on the first try',{exact:true}).waitFor();
  const next=panel.getByRole('button',{name:'Continue review',exact:true});await next.focus();await page.keyboard.press('Enter');await panel.getByText('Palace frame 2',{exact:true}).waitFor();await panel.getByRole('button',{name:'Condensation',exact:true}).click();await panel.getByText(/Perfect walk/).waitFor();
  const results=await page.evaluate(()=>window.__completions);if(results.length!==2||results.some(r=>r[1].attempts!==2))throw Error('Navigation timers changed scoring');if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,entranceRemainsSelected:true,awayAndBackCancelsOldMove:true,manualContinueWorks:true,newAnswersStillAdvance:true,keyboardContinue:true,noExtraAttempts:true,pageErrors:errors},null,2));console.log('Automatic progression respects entrance and manual detours; fresh answers still advance.');return;
 }
 if(process.argv.includes('--position')){
  const panel=page.locator('[data-palace-recall-panel]'),input=panel.getByRole('textbox');
  const rebuild=async(theme)=>{await page.evaluate(theme=>{window.__positionOld=window.__handle;window.__setData(p=>({...p,memoryPalace:{...p.memoryPalace,generatedAt:Date.now(),...(theme?{theme}:{})}}));},theme);await page.waitForFunction(()=>window.__handle!==window.__positionOld);};
  const frame=async(n)=>{await panel.getByText('Palace frame '+n,{exact:true}).waitFor();};
  await page.locator('[data-recall-mode="type"]').click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();await page.evaluate(()=>window.__handle.goTo(2));await frame(2);await input.fill('Cond');await rebuild();
  if(!await panel.getByText('Palace frame 2',{exact:true}).isVisible())throw Error('Scene refresh moved away from selected stop');
  if(await input.inputValue()!=='Cond')throw Error('Selected draft not restored');
  await rebuild('pasture');await frame(2);if(await input.inputValue()!=='Cond')throw Error('Theme change lost draft');
  await page.evaluate(()=>window.__handle.goTo(0));await panel.getByText('You are at the entrance',{exact:true}).waitFor();await rebuild('space');await panel.getByText('You are at the entrance',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Continue review',exact:true}).click();await frame(1);await input.fill('Evaporation');await input.press('Enter');await panel.getByRole('button',{name:'Continue review',exact:true}).click();await frame(2);await input.fill('Condensation');await input.press('Enter');await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  await panel.getByRole('button',{name:'↩ Backwards',exact:true}).click();await frame(2);if(await input.inputValue())throw Error('Retry retained previous draft');await page.evaluate(()=>window.__handle.goTo(1));await frame(1);await rebuild();await frame(1);
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.locator('[data-recall-mode="type"]').click();await frame(1);
  await page.evaluate(()=>window.__handle.goTo(2));await frame(2);await page.evaluate(()=>window.__setData(p=>({...p,branches:p.branches.map(b=>({...b,items:['Boiling','Condensation']}))})));await page.getByText('The palace has changed',{exact:true}).waitFor();await page.locator('[data-recall-mode="type"]').click();await frame(1);
  const scores=await page.evaluate(()=>window.__completions);if(scores.length!==1||scores[0][1].attempts!==2)throw Error('Rebuild navigation changed completion scoring');
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,currentStopPreserved:true,draftPreserved:true,pastureAndSpaceRebuilds:true,entrancePreserved:true,backwardRetryStartsCorrectly:true,newReviewAndContentReset:true,noExtraAttempts:true,pageErrors:errors},null,2));console.log('Selected stop, drafts and entrance survive scene refreshes; retries and new reviews start correctly.');return;
 }
 if(process.argv.includes('--scene-recall')){
  const panel=page.locator('[data-palace-recall-panel]');
  const rebuild=async()=>{await page.evaluate(()=>{window.__oldScene=window.__lastScene;window.__setData(p=>({...p,memoryPalace:{...p.memoryPalace,generatedAt:Date.now()}}));});await page.waitForFunction(()=>window.__lastScene&&window.__lastScene!==window.__oldScene);};
  const state=()=>page.evaluate(()=>{const found={};window.__lastScene.traverse(o=>{if(o.userData.visualRole==='locus-caption'){const colors=[];o.parent.traverse(n=>{if(n.material?.color)colors.push(n.material.color.getHexString());});found[o.userData.locusId]={texts:o.material.map.image.__qaTexts||[],colors};}});return found;});
  const expectFrame=async(id,label,color)=>{const frames=await state();if(!frames[id]?.texts.includes(label))throw Error('Wrong restored caption for '+id+': '+JSON.stringify(frames[id]));if(color&&!frames[id].colors.includes(color))throw Error('Missing restored status '+color);};
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();await panel.getByRole('button',{name:'Evaporation',exact:true}).click();await rebuild();await expectFrame('b0_i0','Evaporation','22c55e');await expectFrame('b0_i1','?');
  await page.evaluate(()=>window.__handle.goTo(2));await panel.getByRole('button',{name:'Reveal answer (no points)',exact:true}).click();await rebuild();await expectFrame('b0_i0','Evaporation','22c55e');await expectFrame('b0_i1','Condensation','ef4444');
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).click();await panel.getByRole('button',{name:/Reveal, then rate my recall/}).click();await rebuild();await expectFrame('b0_i0','Evaporation');await expectFrame('b0_i1','?');
  await panel.getByRole('button',{name:/I missed it/}).click();await rebuild();await expectFrame('b0_i0','Evaporation','ef4444');await expectFrame('b0_i1','?');
  for(const width of [1280,390]){await page.setViewportSize({width,height:1000});await page.locator('#root canvas').first().screenshot({path:path.join(out,'restored-scene-'+width+'.png')});}
  if(await page.evaluate(()=>window.__completions.length))throw Error('Scene restore completed an unfinished review');
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await rebuild();await expectFrame('b0_i0','?');await expectFrame('b0_i1','?');
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,correctAndRevealedRestored:true,pendingAndMissedSelfCheckRestored:true,unansweredHidden:true,newReviewHidden:true,noExtraCompletion:true,actualCanvasCaptionsAndBorderColors:true,pageErrors:errors},null,2));console.log('Actual WebGL captions and grading colors survive scene rebuilds; new and unanswered stops stay hidden.');return;
 }
 if(process.argv.includes('--self-resume')){
  const panel=page.locator('[data-palace-recall-panel]'),start=page.getByRole('button',{name:'✨ Guided self-check',exact:true});
  const reveal=panel.getByRole('button',{name:/Reveal, then rate my recall/}),remembered=panel.getByRole('button',{name:/I remembered/});
  const visit=async(i)=>{await page.evaluate(i=>window.__handle.goTo(i),i);await panel.getByText('Palace frame '+i,{exact:true}).waitFor();};
  await start.click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();await reveal.click();await visit(2);await reveal.waitFor();await visit(1);
  if(!await remembered.isVisible())throw Error('Pending rating disappeared after revisiting');
  await visit(2);await reveal.click();await page.evaluate(()=>window.__handle.goTo(0));await panel.getByRole('button',{name:'Continue review',exact:true}).click();await remembered.waitFor();
  await page.evaluate(()=>{window.__selfHandle=window.__handle;window.__setData(p=>({...p,memoryPalace:{...p.memoryPalace,generatedAt:Date.now()}}));});await page.waitForFunction(()=>window.__selfHandle!==window.__handle);await remembered.waitFor();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');await panel.screenshot({path:path.join(out,'pending-rating-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Pending rating overflow');
  }
  await remembered.focus();await page.keyboard.press('Enter');await panel.getByRole('button',{name:'Continue review',exact:true}).click();await remembered.waitFor();await panel.getByRole('button',{name:/I missed it/}).click();await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  await panel.getByText('Self-check complete: you marked 1 of 2 as remembered.',{exact:true}).waitFor();const scores=await page.evaluate(()=>window.__completions);if(scores.length!==1||scores[0][1].attempts!==2)throw Error('Pending reveals created attempts');
  await panel.getByRole('button',{name:'↩ Backwards',exact:true}).click();await reveal.waitFor();await reveal.click();await page.getByRole('button',{name:'Exit recall',exact:true}).click();await start.click();await reveal.waitFor();await visit(2);await reveal.waitFor();
  await reveal.click();await page.evaluate(()=>window.__setData(p=>({...p,branches:p.branches.map(b=>({...b,items:['Boiling','Condensation']}))})));await page.getByText('The palace has changed',{exact:true}).waitFor();await start.click();await reveal.waitFor();await visit(2);await reveal.waitFor();
  if(errors.length)throw Error(errors.join('\n'));await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,pendingRatingsSurviveNavigation:true,unseenAnswersStayHidden:true,entranceAndRemount:true,keyboardRating:true,retryExitContentReset:true,onlyRatingsCountAsAttempts:true,widths:[1280,390,320],pageErrors:errors},null,2));console.log('Pending self-ratings, navigation, reset boundaries, scoring and mobile layout passed.');return;
 }
 if(process.argv.includes('--single-answer')){
  const panel=page.locator('[data-palace-recall-panel]'),notice=panel.locator('[data-palace-choice-fallback]');
  const start=page.getByRole('button',{name:'🧠 Recall walk',exact:true});
  await page.evaluate(()=>window.__setData({main:'Repeated answer',branches:[{title:'Sky Room',items:['Evaporation','Evaporation'],mnemonics:['A giant kettle boils a lake.','Steam rises from a tiny cup.']}]}));
  await start.focus();await page.keyboard.press('Enter');await panel.getByText('Review stop 1 of 2',{exact:true}).waitFor();
  if(!await notice.isVisible())throw Error('One-choice recall did not switch to explained self-check');
  const reveal=panel.getByRole('button',{name:/Reveal, then rate my recall/});
  if(await panel.getByRole('button',{name:'Evaporation',exact:true}).count())throw Error('Single choice exposed the answer');
  if(!await reveal.evaluate(el=>el===document.activeElement))throw Error('Fallback keyboard entry lost focus');
  await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'single-answer-self-check-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Fallback notice overflow');
  }
  for(let i=0;i<2;i++){await reveal.focus();await page.keyboard.press('Enter');await panel.getByRole('button',{name:/I remembered/}).click();await panel.getByRole('button',{name:'Continue review',exact:true}).click();}
  await panel.getByText('Self-check complete: you marked 2 of 2 as remembered.',{exact:true}).waitFor();
  const scores=await page.evaluate(()=>window.__completions);if(scores.length!==1||scores[0][1].isPerfect||scores[0][1].attempts!==2)throw Error('Fallback awarded verified first-try results');
  const mastery=await page.evaluate(()=>window.__data.memoryPalace.mastery);if(Object.values(mastery).some(m=>m.strength>=1))throw Error('Fallback awarded first-try mastery');
  await panel.getByRole('button',{name:'↩ Backwards',exact:true}).click();await notice.waitFor();await reveal.waitFor();
  const exit=page.getByRole('button',{name:'Exit recall',exact:true});await exit.focus();await page.keyboard.press('Enter');
  if(!await start.evaluate(el=>el===document.activeElement))throw Error('Fallback did not return keyboard focus to Recall walk');
  await page.evaluate(()=>window.__setArmed(true));await notice.waitFor();await reveal.waitFor();
  await page.evaluate(()=>window.__setArmed(false));await exit.waitFor({state:'hidden'});
  await page.evaluate(()=>window.__setData(p=>({...p,branches:[{title:'Sky Room',items:['Evaporation','Condensation']}]})));await start.click();
  await panel.getByRole('button',{name:'Condensation',exact:true}).waitFor();if(await notice.count())throw Error('Fallback leaked to a normal choice review');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,singleAnswerUsesSelfCheck:true,noAnswerLeak:true,noFalsePerfectScore:true,selfRatedMastery:true,retryPreservesMode:true,keyboardEntryAndExit:true,liveArmFallback:true,distinctAnswersUseChoices:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Single-answer self-check, keyboard flow, live arming, honest scoring and mobile layout passed.');return;
 }
 if(process.argv.includes('--choice-layout')){
  const longTerm='Pneumonoultramicroscopicsilicovolcanoconiosis';
  const panel=page.locator('[data-palace-recall-panel]'),choices=panel.locator('[data-palace-recall-choices]');
  await page.evaluate(term=>window.__setData({main:'Long terms and repeated facts',branches:[{title:'Study Room',items:[term,'Condensation','Condensation','Condensation','Precipitation']}]}),longTerm);
  const start=page.getByRole('button',{name:'🧠 Recall walk',exact:true});await start.focus();await page.keyboard.press('Enter');await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  if(await choices.getByRole('button').count()!==3)throw Error('Repeated distractors remained');
  const labels=await choices.getByRole('button').allTextContents();if(new Set(labels.map(x=>x.trim())).size!==3)throw Error('Choice labels were duplicated');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'long-choices-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Long answer page overflow');
   const bounds=await choices.boundingBox();for(const button of await choices.getByRole('button').all()){
    const box=await button.boundingBox();if(box.x<bounds.x-1||box.x+box.width>bounds.x+bounds.width+1||box.height<44)throw Error('Answer button bounds or touch target incorrect');
    if(await button.evaluate(el=>el.scrollWidth>el.clientWidth+2))throw Error('Long answer text overflow');
   }
  }
  await choices.getByRole('button',{name:longTerm,exact:true}).focus();await page.keyboard.press('Enter');await panel.getByText('Correct on the first try',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  if(await choices.getByRole('button',{name:'Condensation',exact:true}).count()!==1)throw Error('Repeated target became ambiguous');
  await choices.getByRole('button',{name:'Condensation',exact:true}).click();await panel.getByText('Correct on the first try',{exact:true}).waitFor();
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,uniqueDistractors:true,targetIdentityPreserved:true,longTermsWrap:true,keyboardSelection:true,touchTargets44:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Unique distractors, long answer wrapping, keyboard selection and mobile bounds passed.');return;
 }
 if(process.argv.includes('--choice-identity')){
  const panel=page.locator('[data-palace-recall-panel]');
  await page.evaluate(()=>window.__setData({main:'Particles',branches:[{title:'Particle Room',items:['Proton','Photon'],mnemonics:['A positive charge on a giant proton.','A bright beam carried by a photon.']}]}));
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  await panel.getByRole('button',{name:'Photon',exact:true}).click();await panel.getByText('Not quite — try again.',{exact:true}).waitFor();
  if(await panel.getByRole('button',{name:'Continue review',exact:true}).count())throw Error('Similar distractor completed the stop');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'similar-choices-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Answer-choice layout overflow');
  }
  await panel.getByRole('button',{name:'Proton',exact:true}).click();await panel.getByText('Correct after another try',{exact:true}).waitFor();await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  await panel.getByRole('button',{name:'Photon',exact:true}).click();await panel.getByText('Correct on the first try',{exact:true}).waitFor();await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  const scores=await page.evaluate(()=>window.__completions);if(scores.length!==1||scores[0][1].isPerfect||scores[0][1].attempts!==3||scores[0][1].incorrectPlacements.length!==1)throw Error('Similar-choice scoring incorrect');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,similarDistractorRejected:true,correctChoiceAccepted:true,retryRecorded:true,noFalsePerfectScore:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Similar answer choices, retry scoring and mobile layout passed.');return;
 }
 if(process.argv.includes('--stop-feedback')){
  const panel=page.locator('[data-palace-recall-panel]');
  const visit=async(index)=>{await page.evaluate(i=>window.__handle.goTo(i),index);await panel.getByText('Palace frame '+index,{exact:true}).waitFor();};
  const wrong=panel.getByText('Not quite — try again.',{exact:true});
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  await panel.getByRole('button',{name:'Condensation',exact:true}).click();await wrong.waitFor();await visit(2);
  if(await wrong.isVisible())throw Error('Incorrect feedback leaked to untouched stop');
  await visit(1);if(!await wrong.isVisible())throw Error('Incorrect feedback disappeared on returning to its stop');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'revisited-feedback-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Feedback layout overflow');
  }
  await panel.getByRole('button',{name:'Evaporation',exact:true}).click();await panel.getByText('Correct after another try',{exact:true}).waitFor();
  if(await wrong.isVisible())throw Error('Incorrect feedback remained after success');
  await visit(2);await panel.getByRole('button',{name:'Condensation',exact:true}).click();await panel.getByText('Correct on the first try',{exact:true}).waitFor();
  await visit(1);await panel.getByText('Correct after another try',{exact:true}).waitFor();await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).click();
  await panel.getByRole('button',{name:/Reveal, then rate my recall/}).click();await panel.getByRole('button',{name:/I missed it/}).click();
  await panel.getByText('Self-check: you marked this as missed',{exact:true}).waitFor();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'missed-self-rating-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Self-rating layout overflow');
  }
  await visit(2);await panel.getByRole('button',{name:/Reveal, then rate my recall/}).click();await panel.getByRole('button',{name:/I remembered/}).click();await panel.getByText('Self-check: you marked this as remembered',{exact:true}).waitFor();
  await visit(1);await panel.getByText('Self-check: you marked this as missed',{exact:true}).waitFor();await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();
  if(await wrong.isVisible())throw Error('Old feedback leaked into a new review');
  await panel.getByRole('button',{name:'Reveal answer (no points)',exact:true}).click();await panel.getByText('Answer revealed',{exact:true}).waitFor();
  const results=await page.evaluate(()=>window.__completions);if(results.length!==2||results[0][1].attempts!==3||results[1][1].attempts!==2)throw Error('Feedback navigation changed scoring');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,revisitedIncorrectFeedback:true,noUntouchedStopFeedback:true,firstTryAndRetryLabels:true,rememberedAndMissedLabels:true,revealLabel:true,freshReviewClears:true,scoringUnchanged:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Revisited feedback, specific result labels, scoring and responsive layout passed.');return;
 }
 if(process.argv.includes('--drafts')){
  const panel=page.locator('[data-palace-recall-panel]'),start=page.locator('[data-recall-mode="type"]');
  const input=panel.getByRole('textbox');
  const visit=async(index)=>{await page.evaluate(i=>window.__handle.goTo(i),index);await panel.getByText('Palace frame '+index,{exact:true}).waitFor();};
  const expectDraft=async(value)=>{if(await input.inputValue()!==value)throw Error('Expected draft '+JSON.stringify(value)+', received '+JSON.stringify(await input.inputValue()));};
  await start.click();await input.fill('Evap');await visit(2);await expectDraft('');await input.fill('Cond');await visit(1);await expectDraft('Evap');
  await visit(1);await expectDraft('Evap');await visit(2);await expectDraft('Cond');
  await page.evaluate(()=>window.__handle.goTo(0));await panel.getByRole('button',{name:'Continue review',exact:true}).click();await expectDraft('Evap');
  await page.evaluate(()=>{window.__draftHandle=window.__handle;window.__setData(p=>({...p,memoryPalace:{...p.memoryPalace,generatedAt:Date.now()}}));});
  await page.waitForFunction(()=>window.__draftHandle!==window.__handle);await expectDraft('Evap');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'retained-draft-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Draft guidance overflow');
  }
  if(await page.evaluate(()=>window.__completions.length))throw Error('Draft navigation scored the review');
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await start.click();await expectDraft('');await visit(2);await expectDraft('');
  await input.fill('old content draft');await page.evaluate(()=>window.__setData(p=>({...p,branches:p.branches.map(b=>({...b,items:['Boiling','Condensation']}))})));
  await page.getByText('The palace has changed',{exact:true}).waitFor();await start.click();await expectDraft('');await visit(2);await expectDraft('');await visit(1);
  await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  await input.fill('Boiling');await input.press('Enter');await panel.getByRole('button',{name:'Continue review',exact:true}).click();await input.fill('Condensation');await input.press('Enter');await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  const results=await page.evaluate(()=>window.__completions);if(results.length!==1||results[0][1].attempts!==2)throw Error('Drafts counted as attempts');
  await panel.getByRole('button',{name:'↩ Backwards',exact:true}).click();await expectDraft('');await visit(1);await expectDraft('');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,perStopDrafts:true,sameStopDraft:true,entranceRecovery:true,decorationRemount:true,exitClears:true,changedContentClears:true,retryClears:true,noDraftAttempts:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Per-stop drafts, navigation, remounts, fresh-review resets and scoring passed.');return;
 }
 if(process.argv.includes('--typing')){
  const panel=page.locator('[data-palace-recall-panel]');
  const start=page.locator('[data-recall-mode="type"]');await start.focus();await page.keyboard.press('Enter');
  const input=panel.getByRole('textbox');await input.waitFor();
  if(!await input.evaluate(el=>el===document.activeElement))throw Error('Typed recall keyboard entry did not focus answer');
  await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  const check=panel.getByRole('button',{name:'Check',exact:true});
  await input.fill('   ');if(!await check.isDisabled())throw Error('Whitespace answer enabled Check');
  await input.press('Enter');if(await panel.getByText('Not quite — try again.',{exact:true}).count())throw Error('Whitespace created an attempt');
  await input.fill('Evaporation');
  for(const init of [{isComposing:true},{keyCode:229}]){
   const blocked=await input.evaluate((el,init)=>{const e=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,...init});el.dispatchEvent(e);return e.defaultPrevented;},init);
   if(!blocked)throw Error('Character confirmation Enter was not prevented: '+JSON.stringify(init));
  }
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'typed-answer-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Typed recall overflow');
   for(const control of [input,check]){const box=await control.boundingBox();if(box.height<44)throw Error('Typed recall touch target too short');}
  }
  await input.press('Enter');await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  await panel.getByText('Review stop 2 of 2',{exact:true}).waitFor();
  if(await input.inputValue())throw Error('Previous typed answer carried into next stop');
  await input.fill('rain');await input.press('Enter');await panel.getByText('Not quite — try again.',{exact:true}).waitFor();
  if(!await input.evaluate(el=>el===document.activeElement))throw Error('Incorrect answer lost typing focus');
  await input.fill('Condensation');await check.click();await panel.getByRole('button',{name:'Continue review',exact:true}).click();
  const completions=await page.evaluate(()=>window.__completions);if(completions.length!==1||completions[0][1].attempts!==3)throw Error('Typed answer attempts were incorrect');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,compositionEnterProtected:true,legacyCompositionProtected:true,whitespaceIgnored:true,enterAndButtonSubmit:true,incorrectAnswerRetainsFocus:true,nextAnswerStartsEmpty:true,attempts:3,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Typed recall composition guards, keyboard submission, attempts and mobile layout passed.');return;
 }
 if(process.argv.includes('--navigation')){
  const panel=page.locator('[data-palace-recall-panel]');
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  for(const answer of ['Evaporation','Condensation']){await panel.getByRole('button',{name:answer,exact:true}).click();await panel.getByRole('button',{name:'Continue review',exact:true}).click();}
  await panel.getByText(/Perfect walk/).waitFor();await panel.getByRole('button',{name:'↩ Backwards',exact:true}).click();
  await panel.getByText('Review stop 1 of 2',{exact:true}).waitFor();await panel.getByText('Palace frame 2',{exact:true}).waitFor();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'review-frame-number-'+width+'.png')});
   await page.evaluate(()=>window.__handle.goTo(0));await panel.getByText('You are at the entrance',{exact:true}).waitFor();
   await panel.screenshot({path:path.join(out,'entrance-return-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Navigation panel overflow');
   const next=panel.getByRole('button',{name:'Continue review',exact:true});await next.focus();await page.keyboard.press('Enter');
   await panel.getByText('Palace frame 2',{exact:true}).waitFor();
   if(!await panel.evaluate(el=>el.contains(document.activeElement)))throw Error('Entrance continuation lost keyboard focus');
  }
  await panel.getByRole('button',{name:'Condensation',exact:true}).click();await page.evaluate(()=>window.__handle.goTo(0));
  await panel.getByRole('button',{name:'Continue review',exact:true}).click();await panel.getByText('Review stop 2 of 2',{exact:true}).waitFor();await panel.getByText('Palace frame 1',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Evaporation',exact:true}).click();await page.evaluate(()=>window.__handle.goTo(0));
  await panel.getByText('All review stops are complete. Continue to see your results.',{exact:true}).waitFor();
  await panel.getByRole('button',{name:'Continue review',exact:true}).click();await panel.getByText(/Perfect walk/).waitFor();
  const completions=await page.evaluate(()=>window.__completions);if(completions.length!==2||completions.some(c=>c[1].attempts!==2))throw Error('Entrance changed results or completion count');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,backwardsEntrance:true,skipsRecordedStops:true,finishesFromEntrance:true,frameNumbersDistinct:true,keyboardContinuation:true,preservesAttempts:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Entrance continuation, backwards order, physical frame numbers and mobile layout passed.');return;
 }
 if(process.argv.includes('--help')){
  const panel=page.locator('[data-palace-recall-panel]');
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await page.getByText(/Review stop 1 of 2/).waitFor();
  const reveal=panel.getByRole('button',{name:'Reveal answer (no points)',exact:true});await reveal.waitFor();
  if(await panel.getByText('Not quite — try again.',{exact:true}).count())throw Error('An attempt occurred before help');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'help-before-attempt-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Help layout overflow');
  }
  await reveal.focus();await page.keyboard.press('Enter');
  await panel.getByText('Evaporation',{exact:true}).waitFor();await page.waitForTimeout(900);await page.getByText(/Review stop 1 of 2/).waitFor();
  if(await reveal.count())throw Error('Reveal action remained after revealing');
  const next=panel.getByRole('button',{name:'Continue review',exact:true});if(!await next.evaluate(el=>document.activeElement===el))throw Error('Keyboard reveal lost focus');
  await page.keyboard.press('Enter');await page.getByText(/Review stop 2 of 2/).waitFor();await reveal.click();await next.click();
  await panel.getByText(/Recalled 0 of 2/).waitFor();
  const score=await page.evaluate(()=>window.__completions[0]?.[1]);if(!score||score.attempts!==0||score.score!==0)throw Error('Reveals created attempts or points');
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).click();
  await panel.getByRole('button',{name:/Reveal, then rate my recall/}).waitFor();if(await reveal.count())throw Error('Quiz reveal appeared in self-check');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,helpBeforeAttempts:true,noInventedAttempts:true,noRevealPoints:true,learnerControlsContinue:true,keyboardReveal:true,selfCheckSeparate:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Immediate answer help, reveal scoring, keyboard flow and mobile layout passed.');return;
 }
 if(process.argv.includes('--content')){
  const panel=page.locator('[data-palace-recall-panel]');const start=page.getByRole('button',{name:'🧠 Recall walk',exact:true});
  await start.click();await page.getByText(/Review stop 1 of 2/).waitFor();await page.getByRole('checkbox',{name:'Move on automatically',exact:true}).uncheck();
  await panel.getByRole('button',{name:'Evaporation',exact:true}).click();
  await page.evaluate(()=>window.__setData(p=>({...p,memoryPalace:{...p.memoryPalace,images:{},generatedAt:1,mastery:{b0_i1:{strength:0.7,dueAt:'2099-01-01T00:00:00.000Z'}}}})));
  await panel.getByRole('button',{name:'Continue review',exact:true}).waitFor();
  if(await page.getByText('The palace has changed',{exact:true}).count())throw Error('Artwork/mastery save invalidated practice');
  await page.evaluate(()=>window.__setData(p=>({...p,branches:p.branches.map(b=>({...b,items:['Boiling','Condensation']}))})));
  await page.getByText('The palace has changed',{exact:true}).waitFor();await start.waitFor();
  if(await page.evaluate(()=>window.__completions.length))throw Error('Changed review awarded results');
  if(await page.evaluate(()=>window.__data.memoryPalace.mastery.b0_i1.strength!==0.7))throw Error('Changed review rewrote mastery');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await page.getByRole('status').filter({hasText:'The palace has changed'}).screenshot({path:path.join(out,'changed-review-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Changed-review notice overflow');
  }
  await start.click();await panel.getByRole('button',{name:'Boiling',exact:true}).waitFor();
  if(await page.getByText('The palace has changed',{exact:true}).count())throw Error('Restart notice did not clear');
  await page.evaluate(()=>window.__setData(p=>({...p,branches:p.branches.map(b=>({...b,items:['Boiling']}))})));
  await page.getByText('The palace has changed',{exact:true}).waitFor();
  if(await start.count())throw Error('Practice remained available for a single stop');
  await page.evaluate(()=>{window.__setData(p=>({...p,branches:p.branches.map(b=>({...b,items:['Boiling','Condensation']}))}));window.__setArmed(true);});
  // A pending restart notice holds an existing arm until it is cycled.
  await page.evaluate(()=>window.__setArmed(false));await page.getByText('The palace has changed',{exact:true}).waitFor({state:'hidden'});await start.waitFor();await page.evaluate(()=>window.__setArmed(true));
  await page.getByText(/Review stop 1 of 2/).waitFor();
  await page.evaluate(()=>window.__setData(p=>({...p,memoryPalace:{...p.memoryPalace,routeOrder:['b0_i1','b0_i0']}})));
  await page.getByText('The palace has changed',{exact:true}).waitFor();await page.waitForTimeout(850);
  if(await page.getByRole('button',{name:'Exit recall',exact:true}).count())throw Error('Old live arm restarted changed review');
  await page.evaluate(()=>window.__setArmed(false));await page.getByText('The palace has changed',{exact:true}).waitFor({state:'hidden'});await start.waitFor();await page.evaluate(()=>window.__setArmed(true));
  await page.getByText(/Review stop 1 of 2/).waitFor();
  if(await page.evaluate(()=>window.__completions.length))throw Error('Invalidated reviews were scored');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,changedFactsExit:true,removedStopsExit:true,unrelatedSavesContinue:true,noStaleScore:true,masteryPreserved:true,manualRestart:true,liveArmWaits:true,newArmRestarts:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Content-change invalidation, restart notices and live-arm recovery passed.');return;
 }
 if(process.argv.includes('--pacing')){
  const panel=page.locator('[data-palace-recall-panel]');
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();await page.getByText(/Review stop 1 of 2/).waitFor();
  const pace=page.getByRole('checkbox',{name:'Move on automatically',exact:true});
  if(!await pace.isChecked())throw Error('Automatic pacing should be the default');
  await page.evaluate(()=>window.__paceHandle=window.__handle);await pace.focus();await page.keyboard.press('Space');
  if(await pace.isChecked())throw Error('Keyboard toggle failed');
  if(!await page.evaluate(()=>window.__paceHandle===window.__handle))throw Error('Pacing remounted the palace');
  await panel.getByRole('button',{name:'Evaporation',exact:true}).click();
  await page.waitForTimeout(1000);await page.getByText(/Review stop 1 of 2/).waitFor();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await page.locator('[data-palace-recall-pace]').screenshot({path:path.join(out,'pacing-control-'+width+'.png')});
   await panel.screenshot({path:path.join(out,'manual-response-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Pacing layout overflow');
  }
  const next=panel.getByRole('button',{name:'Continue review',exact:true});await next.focus();await page.keyboard.press('Enter');
  await page.getByText(/Review stop 2 of 2/).waitFor();await panel.getByRole('button',{name:'Condensation',exact:true}).click();
  await page.waitForTimeout(1000);await next.waitFor();
  if(await panel.getByText(/Perfect walk/).count())throw Error('Manual practice finished before Continue');
  await next.click();await panel.getByText(/Perfect walk/).waitFor();
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).click();
  await panel.getByRole('button',{name:/Reveal, then rate my recall/}).waitFor();if(await pace.isChecked())throw Error('Pacing preference was reset');
  await panel.getByRole('button',{name:/Reveal, then rate my recall/}).click();await panel.getByRole('button',{name:/I missed it/}).click();
  await page.waitForTimeout(1000);await page.getByText(/Review stop 1 of 2/).waitFor();
  await pace.check();await page.waitForTimeout(850);await page.getByText(/Review stop 1 of 2/).waitFor();
  await next.click();await page.getByText(/Review stop 2 of 2/).waitFor();
  await panel.getByRole('button',{name:/Reveal, then rate my recall/}).click();await panel.getByRole('button',{name:/I remembered/}).click();
  await panel.getByText(/Self-check complete: you marked 1 of 2/).waitFor();
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,manualQuiz:true,manualSelfCheck:true,manualFinalStop:true,keyboardToggle:true,noSceneRemount:true,preferenceRetained:true,automaticResume:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Manual and automatic pacing, keyboard toggle, completion and mobile layout passed.');return;
 }
 if(process.argv.includes('--feedback')){
  const panel=page.locator('[data-palace-recall-panel]');
  const assertFocus=async(locator,label)=>{if(!await locator.evaluate(el=>el===document.activeElement))throw Error('Focus not on '+label);};
  const start=page.getByRole('button',{name:'🧠 Recall walk',exact:true});await start.focus();await page.keyboard.press('Enter');
  await page.getByText(/Review stop 1 of 2/).waitFor();
  if(!await panel.evaluate(el=>el.contains(document.activeElement)))throw Error('Keyboard entry lost focus');
  for(let i=0;i<3;i++)await panel.getByRole('button',{name:'Condensation',exact:true}).click();
  await panel.getByRole('status').filter({hasText:'Not quite'}).waitFor();
  await page.waitForTimeout(850);
  if(!await panel.getByText('Not quite — try again.',{exact:true}).isVisible())throw Error('Feedback disappeared after flash');
  if(await panel.locator('p').filter({hasText:/^Evaporation$/}).count())throw Error('Answer leaked before reveal');
  const reveal=panel.getByRole('button',{name:'Reveal answer (no points)',exact:true});await reveal.focus();await page.keyboard.press('Enter');
  const next=panel.getByRole('button',{name:'Continue review',exact:true});await next.waitFor();await assertFocus(next,'Continue review');
  await page.waitForTimeout(1000);await page.getByText(/Review stop 1 of 2/).waitFor();
  await panel.getByText('Evaporation',{exact:true}).waitFor();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'revealed-answer-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Feedback overflow at '+width);
  }
  await page.keyboard.press('Enter');await page.getByText(/Review stop 2 of 2/).waitFor();
  if(!await panel.evaluate(el=>el.contains(document.activeElement)))throw Error('Keyboard focus lost after Continue');
  const correct=panel.getByRole('button',{name:'Condensation',exact:true});await correct.focus();await page.keyboard.press('Enter');
  await panel.getByText(/Recalled 1 of 2/).waitFor();await assertFocus(panel.locator('[data-recall-focus]'),'completion result');
  const strengthen=panel.getByRole('region',{name:'Stops to strengthen',exact:true});await strengthen.waitFor();
  await strengthen.locator('summary').click();
  await strengthen.getByText('Evaporation',{exact:true}).waitFor();
  if(await strengthen.getByText('Condensation',{exact:true}).count())throw Error('First-try answer included in follow-up');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'follow-up-practice-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Follow-up overflow at '+width);
  }
  const untouched=await page.evaluate(()=>JSON.stringify(window.__data.memoryPalace.mastery.b0_i1));
  const practice=strengthen.getByRole('button',{name:'Practice these stops',exact:true});await practice.focus();await page.keyboard.press('Enter');
  await page.getByText(/Review stop 1 of 1/).waitFor();
  if(await panel.getByRole('region',{name:'Stops to strengthen',exact:true}).count())throw Error('Follow-up answers leaked into retry');
  const retryAnswer=panel.getByRole('button',{name:'Evaporation',exact:true});await retryAnswer.focus();await page.keyboard.press('Enter');
  await panel.getByText(/Perfect walk/).waitFor();
  if(await panel.getByRole('region',{name:'Stops to strengthen',exact:true}).count())throw Error('Perfect walk still suggests difficult stops');
  if(await page.evaluate(()=>JSON.stringify(window.__data.memoryPalace.mastery.b0_i1))!==untouched)throw Error('Focused retry changed another stop');

  await page.getByRole('button',{name:'Exit recall',exact:true}).click();
  await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).click();
  for(let i=0;i<2;i++){
   const show=panel.getByRole('button',{name:/Reveal, then rate my recall/});await show.waitFor();await show.focus();await page.keyboard.press('Enter');
   const answer=panel.locator('[data-recall-focus]');await answer.waitFor();await assertFocus(answer,'self-check answer');
   await page.keyboard.press('Tab');await assertFocus(panel.getByRole('button',{name:/I remembered/}),'remembered rating');
   await page.keyboard.press('Tab');await assertFocus(panel.getByRole('button',{name:/I missed it/}),'missed rating');await page.keyboard.press('Enter');
   if(i===0){await page.getByText(/Review stop 2 of 2/).waitFor();await assertFocus(show,'next self-check');}
  }
  await page.getByRole('button',{name:'Exit recall',exact:true}).focus();
  await panel.getByText(/Self-check complete: you marked 0 of 2/).waitFor();await assertFocus(page.getByRole('button',{name:'Exit recall',exact:true}),'deliberately moved focus');
  await page.keyboard.press('Enter');
  const selfStart=page.getByRole('button',{name:'✨ Guided self-check',exact:true});await selfStart.waitFor();await assertFocus(selfStart,'self-check return button');
  await page.keyboard.press('Enter');
  for(let i=0;i<2;i++){
   const show=panel.getByRole('button',{name:/Reveal, then rate my recall/});await show.waitFor();await assertFocus(show,'keyboard self-check entry');await page.keyboard.press('Enter');
   await page.keyboard.press('Tab');await assertFocus(panel.getByRole('button',{name:/I remembered/}),'remembered rating');await page.keyboard.press('Enter');
   if(i===0)await page.getByText(/Review stop 2 of 2/).waitFor();
  }
  await panel.getByText('Self-check complete: you marked 2 of 2 as remembered.',{exact:true}).waitFor();
  if(await panel.getByText(/first try/).count())throw Error('Self-check claims first-try scoring');
  if(await panel.getByRole('region',{name:'Stops to strengthen',exact:true}).count())throw Error('Remembered ratings marked difficult');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await panel.screenshot({path:path.join(out,'self-check-result-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Self-check summary overflow');
  }

  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,accurateSelfCheckSummary:true,keyboardEntryExit:true,targetedFollowUp:true,firstTryExcluded:true,unselectedMasteryPreserved:true,persistentFeedback:true,revealWaitsForContinue:true,keyboardFocus:true,selfCheckKeyboard:true,respectsFocusElsewhere:true,widths:[1280,390,320],pageErrors:errors},null,2));
  console.log('Readable feedback, manual reveal, keyboard continuation and self-check passed.');return;
 }
 if(process.argv.includes('--controls')){
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1100});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   const toolbar=page.locator('[data-palace-toolbar]');
   await toolbar.locator('..').screenshot({path:path.join(out,'controls-closed-'+width+'.png')});
   await page.getByRole('button',{name:/Art & customize/}).click();
   await page.getByRole('group',{name:'Create & personalize',exact:true}).waitFor();
   await toolbar.locator('..').screenshot({path:path.join(out,'controls-open-'+width+'.png')});
   const sizes=await toolbar.locator('button:visible').evaluateAll(els=>els.map(el=>({text:el.textContent,disabled:el.disabled,height:el.getBoundingClientRect().height,right:el.getBoundingClientRect().right})));
   for(const el of sizes)if(el.height<43.5||el.right>width+1)throw Error('Control bounds: '+JSON.stringify(el));
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Overflow at '+width);
   await page.getByRole('button',{name:/Art & customize/}).click();
   if(await page.getByRole('group',{name:'Create & personalize',exact:true}).count())throw Error('Disclosure stayed open');
  }
  await page.setViewportSize({width:1280,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize='16px');
  for(const name of ['Pasture','Space','Gallery']){
   const button=page.getByRole('group',{name:'Palace setting',exact:true}).getByRole('button',{name:new RegExp(name)});await button.click();await page.waitForSelector('#root canvas');
   if(await button.getAttribute('aria-pressed')!=='true')throw Error('Setting state not exposed');
  }
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,widths:[1280,390,320],minimumTarget:44,settings:['gallery','pasture','space'],pageErrors:errors},null,2));
  console.log('Grouped controls, 44px targets, disclosure, and all setting selectors passed on desktop/mobile.');return;
 }
 if(process.argv.includes('--previews')){
  await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).waitFor();
  await page.evaluate(()=>window.__handle.goTo(1));
  await page.getByRole('button',{name:/Quick image here/}).click();
  const resolveImage=async(color)=>{await page.waitForFunction(()=>window.__pending.length===1);await page.evaluate(color=>{const c=document.createElement('canvas');c.width=16;c.height=16;const g=c.getContext('2d');g.fillStyle=color;g.fillRect(0,0,16,16);window.__pending.shift().resolve(c.toDataURL());},color);};
  await resolveImage('#f59e0b');
  await page.getByText('Saved cue: Evaporation',{exact:true}).waitFor();
  await page.getByRole('button',{name:'↻ Regenerate',exact:true}).click();await resolveImage('#22c55e');
  await page.getByRole('button',{name:'Use saved version 1',exact:true}).waitFor();
  await page.getByRole('button',{name:'↻ Regenerate',exact:true}).click();
  await page.waitForFunction(()=>window.__pending.length===1);await page.evaluate(()=>window.__pending.shift().reject(Error('simulated provider failure')));
  await page.getByRole('alert').filter({hasText:'Could not make a new version'}).waitFor();
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.documentElement.style.fontSize=innerWidth<500?'20px':'16px');
   await page.screenshot({path:path.join(out,'retry-recovery-'+width+'.png'),fullPage:true});
   await page.getByRole('region',{name:'Customization options for this gallery spot'}).screenshot({path:path.join(out,'retry-card-'+width+'.png')});
   if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Preview overflow at '+width);
  }
  await page.getByRole('button',{name:'Use saved version 1',exact:true}).click();
  if(!await page.getByRole('button',{name:'Use saved version 1',exact:true}).getAttribute('aria-pressed').then(x=>x==='true'))throw Error('Variant selection not announced');
  await page.getByRole('button',{name:'↶ Undo',exact:true}).click();
  await page.waitForFunction(()=>!window.__data.memoryPalace?.images?.b0_i0);
  await page.getByRole('button',{name:'✨ Guided self-check',exact:true}).click();
  await page.getByRole('button',{name:/Reveal, then rate my recall/}).waitFor();
  await page.screenshot({path:path.join(out,'two-stop-self-check-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:/Reveal, then rate my recall/}).click();
  await page.getByRole('button',{name:/I missed it/}).click();
  await page.getByText(/Review stop 2 of 2/).waitFor();
  await page.getByRole('button',{name:/Reveal, then rate my recall/}).click();
  await page.getByRole('button',{name:/I missed it/}).click();
  await page.waitForFunction(()=>Object.keys(window.__data.memoryPalace?.mastery||{}).length===2);
  if(await page.getByRole('button',{name:/Reveal, then rate my recall/}).count())throw Error('Self-check did not finish');
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2))throw Error('Completion overflow');
  const completion=page.getByRole('status').filter({hasText:'Self-check complete: you marked 0 of 2'});
  for(const height of await completion.locator('button').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height)))if(height<43.5)throw Error('Small completion target');
  await page.screenshot({path:path.join(out,'missed-self-check-completion-mobile.png'),fullPage:true});
  await page.getByRole('button',{name:'Exit recall',exact:true}).click();
  await page.evaluate(()=>window.__setData(p=>({...p,memoryPalace:{...p.memoryPalace,mastery:{
    b0_i0:{reps:1,strength:0.8,dueAt:'2099-01-01T00:00:00.000Z'},
    b0_i1:{reps:1,strength:0.2,dueAt:'2000-01-01T00:00:00.000Z'}
  }}})));
  await page.getByRole('button',{name:/Review now/}).click();
  await page.getByText(/Review stop 1 of 1/).waitFor();
  await page.getByText(/0\/1 reviewed/).waitFor();
  await page.evaluate(()=>window.__handle.goTo(1));
  await page.getByRole('button',{name:'Return to review',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'focused-review-return-mobile.png'),fullPage:true});
  if(await page.getByRole('button',{name:'Evaporation',exact:true}).count())throw Error('Out-of-scope answers visible');
  await page.getByRole('button',{name:'Return to review',exact:true}).click();
  await page.getByText(/Review stop 1 of 1/).waitFor();
  await page.getByRole('button',{name:'Condensation',exact:true}).click();
  await page.getByText(/Focused review: 1 selected stops/).waitFor();
  if(await page.evaluate(()=>window.__data.memoryPalace.mastery.b0_i0.dueAt!=='2099-01-01T00:00:00.000Z'))throw Error('Unselected stop rescheduled');


  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,failedRetryRecovered:true,variantsAccessible:true,undoRestored:true,twoStopRecall:true,allMissedSelfCheckCompletes:true,focusedReviewIsolated:true,widths:[1280,390,320]},null,2));
  console.log('Saved-preview recovery, versions, Undo, and two-stop self-check passed across desktop/mobile.');return;
 }
 await page.getByRole('button',{name:/Art & customize/}).click();
 await page.locator('[data-palace-art-guide]').waitFor();
 await page.screenshot({path:path.join(out,'art-controls-desktop.png'),fullPage:true});
 await page.evaluate(()=>window.__handle.goTo(1));
 await page.getByRole('button',{name:/Direct the AI/}).click();
 const prompt=page.getByRole('textbox',{name:'Describe what the AI should create here'});await prompt.fill('A huge kettle turning a lake into golden steam');
 await page.getByRole('button',{name:'Check & create',exact:true}).click();
 await page.waitForFunction(()=>window.__pending.length===1);
 await page.evaluate(()=>window.__handle.goTo(2));
 await page.getByRole('status').filter({hasText:'Working on the cue for Evaporation'}).waitFor();
 await page.screenshot({path:path.join(out,'generation-destination-desktop.png'),fullPage:true});
 await page.evaluate(()=>{const c=document.createElement('canvas');c.width=16;c.height=16;const g=c.getContext('2d');g.fillStyle='#f59e0b';g.fillRect(0,0,16,16);window.__pending.shift().resolve(c.toDataURL());});
 await page.waitForFunction(()=>!!window.__data.memoryPalace?.images?.b0_i0);
 if(await page.evaluate(()=>!!window.__data.memoryPalace?.images?.b0_i1))throw Error('Generation moved to wrong stop');
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(()=>{document.documentElement.style.fontSize='20px';window.__setImagesOn(false);});
  await page.locator('[data-palace-art-guide]').waitFor();
  await page.screenshot({path:path.join(out,'art-controls-mobile-'+width+'.png'),fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);if(overflow){const offenders=await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(e=>({tag:e.tagName,text:e.textContent.slice(0,65),class:e.className,x:e.getBoundingClientRect().x,right:e.getBoundingClientRect().right})).filter(e=>e.right>innerWidth+2));console.log(JSON.stringify(offenders.slice(-18)));throw Error('Horizontal overflow at '+width);}
 }
 if(errors.length)throw Error(errors.join('\n'));
 await page.evaluate(()=>window.__root.unmount());
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,widths:[1280,390,320],destinationPreserved:true,pageErrors:errors},null,2));
 console.log('Generation UI reviewed at desktop, 390px, and enlarged 320px; original target preserved.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
