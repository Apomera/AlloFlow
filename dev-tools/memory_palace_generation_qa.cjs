const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const {chromium}=require('@playwright/test'),esbuild=require('esbuild'),{parse}=require('@babel/parser');
const root=path.resolve(__dirname,'..'),req=createRequire(path.join(root,'desktop/web-app/package.json'));
const out=path.join(root,'reports/memory-palace-enhancement',process.argv.includes('--feedback')?'recall-feedback-review':process.argv.includes('--controls')?'controls-review':process.argv.includes('--previews')?'preview-practice-review':'generation-review');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const src=fs.readFileSync(path.join(root,'view_renderers_source.jsx'),'utf8');
 const ast=parse(src,{sourceType:'script',plugins:['jsx']});
 const nodes=ast.program.body.flatMap(n=>n.declarations||[]).filter(n=>['MemoryPalaceView','_mpTourPaces','_mpEsc','_mpStampImage'].includes(n.id.name));
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
 await page.addScriptTag({content:component});
 await page.evaluate(()=>{
  const R=window.React;window.__toasts=[];window.__pending=[];window.callGemini=()=>Promise.resolve('{"verdict":"ok"}');
  const MP=window.AlloModules.MemoryPalace,render=MP.render;
  MP.render=function(...args){const h=render.apply(this,args);window.__handle=h;return h;};
  const sample={main:'The Water Cycle',branches:[{title:'Sky Observatory',items:['Evaporation','Condensation'],mnemonics:['A kettle the size of a house boils a lake into golden steam.','A cloud knitting itself from silver wool.']}]};
  function App(){const[data,setData]=R.useState(sample);window.__data=data;window.__setData=setData;const[imagesOn,setImagesOn]=R.useState(true);window.__setImagesOn=setImagesOn;return R.createElement(window.PalaceView,{data,title:'Water Cycle',t:()=>null,onPersist:(v)=>setData(p=>({...p,memoryPalace:v})),addToast:(...args)=>window.__toasts.push(args),callImagen:imagesOn?()=>new Promise((resolve,reject)=>window.__pending.push({resolve,reject})):undefined});}
  window.__root=window.createRoot(document.getElementById('root'));window.__root.render(R.createElement(App));
 });
 await page.waitForSelector('#root canvas');

 if(process.argv.includes('--feedback')){
  const panel=page.locator('[data-palace-recall-panel]');
  const assertFocus=async(locator,label)=>{if(!await locator.evaluate(el=>el===document.activeElement))throw Error('Focus not on '+label);};
  await page.getByRole('button',{name:'🧠 Recall walk',exact:true}).click();
  await page.getByText(/Review stop 1 of 2/).waitFor();
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
  await panel.getByText(/Recalled 0 of 2/).waitFor();await assertFocus(page.getByRole('button',{name:'Exit recall',exact:true}),'deliberately moved focus');
  if(errors.length)throw Error(errors.join('\n'));
  await page.evaluate(()=>window.__root.unmount());fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,targetedFollowUp:true,firstTryExcluded:true,unselectedMasteryPreserved:true,persistentFeedback:true,revealWaitsForContinue:true,keyboardFocus:true,selfCheckKeyboard:true,respectsFocusElsewhere:true,widths:[1280,390,320],pageErrors:errors},null,2));
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
  const completion=page.getByRole('status').filter({hasText:'Recalled 0 of 2'});
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
