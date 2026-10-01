// Isolated fixture only: no app server, credentials, saved data, or TTS calls.
const fs = require('fs'), path = require('path'), { createRequire } = require('module');
const root = path.resolve(__dirname, '..'), req = createRequire(path.join(root, 'package.json'));
const web = createRequire(path.join(root, 'desktop/web-app/package.json'));
const { chromium } = req('playwright'), esbuild = req('esbuild');
const out = path.join(root, 'validation');
const fixture = String.raw`
const h = React.createElement, noop = () => {};
const text = 'Plants need light. Roots take in water. '+ 'Longword'.repeat(14) + '.';
const original = AlloModules.InstructionalContext.createSupportedReading(text, {id:'original',config:{language:'English'}});
const adapted = {id:'adapted',type:'simplified',data:text,config:{language:'English',grade:'5'},sourceSnapshot:original.sourceSnapshot,instructionalText:{form:'adapted',role:'supplemental'}};
window.saveCalls=0; window.savedClips=0; window.activeReadingId='adapted'; window.__alloGetReadAloudAudioSummary = () => ({ready:3,missing:0,total:3});
window.__alloGetReadAloudReadiness = async () => ({resourceId:activeReadingId,scope:'device-audio',state:savedClips===3?'ready':'session-only',ready:3,total:3,remaining:0,durableReady:savedClips,sessionOnly:3-savedClips,nextActions:savedClips===3?[]:['retry-save']});
window.__alloRetryReadAloudPersistence = (lane,options)=>{window.saveCalls++;window.saveSignal=options?.signal;return new Promise((resolve,reject)=>{window.finishSave=resolve;window.failSave=reject;});};
window.__alloPrepareReadAloud = async () => ({ok:false,remaining:3,failure:{reason:'Fixture: narration could not be saved. Try again.'}});

window.recordingSaves=[];window.syntheticStreams=[];window.nativeRecorders=[];window.recordingSaveMode='success';
const NativeMediaRecorder=window.MediaRecorder;
window.MediaRecorder=class extends NativeMediaRecorder {
 constructor(...args){super(...args);this.fixtureBytes=0;this.addEventListener('dataavailable',event=>this.fixtureBytes+=event.data.size);window.nativeRecorders.push(this);}
};
const AudioContextCtor=window.AudioContext||window.webkitAudioContext;
window.syntheticMicrophone = async ()=>{
 const context=new AudioContextCtor(),destination=context.createMediaStreamDestination(),oscillator=context.createOscillator();
 oscillator.frequency.value=220;oscillator.connect(destination);oscillator.start();await context.resume();
 const stream=destination.stream;window.syntheticStreams.push(stream);
 stream.getTracks().forEach(track=>{const stop=track.stop.bind(track);track.stop=()=>{stop();try{oscillator.stop();}catch(_){}oscillator.disconnect();context.close().catch(()=>{});};});
 return stream;
};
Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>window.syntheticMicrophone()}});

window.savedByResource={original:true,adapted:true};window.actionCalls=[];
window.__alloInspectReadAloudAudio=()=>({status:savedByResource[activeReadingId]?'ready':'missing',url:savedByResource[activeReadingId]?'blob:fixture':null});
window.__alloGetReadAloudAudioSummary=()=>({ready:savedByResource[activeReadingId]?3:0,missing:savedByResource[activeReadingId]?0:3,total:3});
for(const [kind,name] of [['generate','__alloRegenerateSentenceAudio'],['remove','__alloRemoveSentenceAudio']]){
 window[name]=(sentence,options)=>{
  const resourceId=activeReadingId;window.actionCalls.push({kind,resourceId,sentence,signal:options?.signal});
  return new Promise((resolve,reject)=>{
   window.stageAction=()=>{savedByResource[resourceId]=kind==='generate';window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId}}));};
   const stage=window.stageAction;
   window.finishAction=value=>{if(value)stage();resolve(value);};window.failAction=reject;
  });
 };
}

function Harness({options}) {
 const [editing,setEditing]=React.useState(false), [compare,setCompare]=React.useState(!!options.compare), [originalRoute,setOriginalRoute]=React.useState(!!options.original);window.switchReading=()=>setOriginalRoute(x=>!x);window.activeReadingId=originalRoute?'original':'adapted';window.__alloStoreRecordedSentenceAudio=((resourceId)=>async(sentence,blob,source,options)=>{window.recordingSaves.push({blob,resourceId,sentence,bytes:blob.size,mime:blob.type,source,signal:options?.signal});if(window.recordingSaveMode==='pending')return new Promise(resolve=>window.finishRecordingSave=resolve);return window.recordingSaveMode==='success';})(window.activeReadingId);
 const props={t,generatedContent:originalRoute?original:adapted,gradeLevel:'5',leveledTextLanguage:'English',selectedVoice:'Kore',voiceSpeed:1,studentInterests:[],history:[original,adapted],
 isTeacherMode:options.teacher!==false,isZenMode:false,isEditingLeveledText:editing,isProcessing:false,isPlaying:false,isCompareMode:compare,interactionMode:'read',textEditorRef:React.useRef(null),
 cursorStyles:{},latestGlossary:[],playbackState:{currentIdx:-1},getSideBySideContent:()=>null,getContentDirection:()=> 'ltr',isRtlLang:()=>false,highlightGlossaryTerms:x=>x,
 splitTextToSentences:x=>AlloModules.PureHelpers.splitTextToSentences(x,{}),formatInteractiveText:(x,c)=>AlloModules.PhaseNHelpers.formatInteractiveText(x,c,false,{highlightGlossaryTerms:x=>x,latestGlossary:[],MathSymbol:({text})=>text}),renderFormattedText:x=>x,
 SourceReferencesPanel:()=>null,ComplexityGauge:()=>null,handleSpeak:noop,handleWordClick:noop,handlePhonicsClick:noop,handleQuickAddGlossary:noop,handleTextMouseUp:noop,
 setFocusedParagraphIndex:noop,stopPlayback:noop,setComplexityLevel:noop,setSaveOriginalOnAdjust:noop,setReadingTheme:noop,setInteractionMode:noop,setIsCompareMode:setCompare,setIsFluencyMode:noop,handleToggleIsTeacherToolbarExpanded:noop,handleToggleIsEditingLeveledText:()=>setEditing(x=>!x),handleSimplifiedTextChange:noop,handleFormatText:noop,setSelectionMenu:noop};
 return h('div',{className:'theme-'+(options.shell||'light')},h('div',{className:'allo-docsuite'},h(AlloModules.AppStyles.AppStyles),h('div',{'data-reading-theme':options.theme||'default'},h(AlloModules.SimplifiedView,props))));
}
window.renderFixture=options=>{if(window.fixtureRoot)fixtureRoot.unmount();document.querySelector('#mount').textContent='';window.fixtureRoot=createRoot(document.querySelector('#mount'));fixtureRoot.render(h(Harness,{options}));};
`;
(async () => {
 fs.mkdirSync(out,{recursive:true});
 const css=(await web('postcss')([web('tailwindcss')({...web('./tailwind.config.js'),content:[path.join(root,'view_simplified_source.jsx')]})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const strings=JSON.parse(fs.readFileSync(path.join(root,'ui_strings.js'),'utf8'));
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:320,height:640},hasTouch:true,reducedMotion:'reduce'}), results=[], errors=[];
 page.setDefaultTimeout(15000);
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url()==='http://narration-fixture.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="mount"></main></body></html>'}):route.abort());
 const check=(ok,label)=>{if(!ok)throw Error(label);};
 try {
  await page.goto('http://narration-fixture.test/');await page.addStyleTag({content:css});await page.addScriptTag({content:runtime});
  await page.addScriptTag({content:'window.translations='+JSON.stringify(strings)+';window.t=(key)=>{const value=key.split(".").reduce((o,k)=>o&&o[k],translations);return typeof value==="string"?value:key;};window.AlloLanguageContext=React.createContext({t});window.AlloModules={};'});
  for(const file of ['app_styles_module.js','instructional_context_module.js','pure_helpers_module.js','phase_n_misc_helpers_module.js','view_simplified_module.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.addScriptTag({content:fixture});
  const render=async options=>{await page.evaluate(o=>{window.savedClips=0;window.saveCalls=0;window.recordingSaves=[];window.syntheticStreams=[];window.recordingSaveMode='success';window.actionCalls=[];window.savedByResource={original:true,adapted:true};renderFixture(o);},options);await page.locator('[data-adapted-reader]').waitFor();await page.locator('[data-review-action=audio-retry-save]').waitFor();};
  const manage=()=>page.locator('[data-manage-narration]');
  const record=()=>page.locator('[data-audio-sentence-index="0"]').getByRole('button').nth(2);
  const close=()=>page.getByRole('button',{name:'Close narration',exact:true});
  const status=()=>page.locator('[data-edit-audio-status]');
  const focusVisible=async locator=>locator.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.top>=0&&b.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});
  const open=async()=>{await manage().focus();await page.keyboard.press('Enter');await record().waitFor();};
  const start=async()=>{await record().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-audio-sentence-index="0"] button[aria-pressed="true"]'));await page.waitForFunction(()=>nativeRecorders.at(-1)?.fixtureBytes>0);};
  const generate=()=>page.locator('[data-generate-sentence="simplified-0"]');
  const remove=()=>page.locator('[data-remove-sentence="simplified-0"]');
  for(const route of ['adapted','original','both'])for(const mode of ['normal','spacing','200-text']){
   console.log('Checking '+route+' / '+mode);await render({original:route==='original',compare:route==='both'});await open();
   if(mode==='spacing')await page.evaluate(()=>{document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';});});
   if(mode==='200-text')await page.evaluate(()=>{const values=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);values.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   await remove().focus();check(await focusVisible(remove()),'Remove obscured');
   if(route==='both'&&mode==='normal')await remove().tap();else await page.keyboard.press('Enter');
   await page.waitForFunction(()=>actionCalls.length===1);await page.keyboard.press('Enter');
   check(await page.evaluate(()=>actionCalls.length===1),'duplicate removal');
   check(await remove().getAttribute('aria-busy')==='true'&&await remove().evaluate(el=>el===document.activeElement),'busy Remove lost focus');
   await page.evaluate(()=>stageAction());check(await remove().count()===1,'early store update removed busy control');
   await page.evaluate(()=>finishAction(true));await remove().waitFor({state:'detached'});
   check(await generate().evaluate(el=>el===document.activeElement),'removed control lost focus');check(await focusVisible(generate()),'Generate focus obscured');
   check((await status().textContent()).includes('Check device save status'),'removal status overclaims durability');
   await page.keyboard.press('Enter');await page.waitForFunction(()=>actionCalls.length===2);await page.keyboard.press('Enter');
   check(await page.evaluate(()=>actionCalls.length===2),'duplicate generation');
   check(await generate().getAttribute('aria-busy')==='true'&&await generate().evaluate(el=>el===document.activeElement),'busy generation lost focus');
   await page.evaluate(()=>finishAction('blob:generated'));await page.waitForFunction(()=>document.querySelector('[data-generate-sentence]')?.getAttribute('aria-busy')==='false');
   check(await generate().evaluate(el=>el===document.activeElement),'generation completion lost focus');
   const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   check(geometry.scrollWidth<=geometry.width+2,'action layout overflow '+JSON.stringify(geometry));
   check(await page.locator('button button, button input, button select, button a').count()===0,'nested control');
   check(await status().getAttribute('aria-live')==='polite'&&await status().getAttribute('aria-atomic')==='true','result semantics');
   results.push({route,mode,...geometry,busyFocusPreserved:true,removalFocusReturned:true,noDuplicateActions:true});
  }
  for(const kind of ['generate','remove']){
   console.log('Checking navigation during '+kind);await render({});await open();const control=kind==='generate'?generate:remove;await control().click();
   await page.waitForFunction(()=>actionCalls.length===1);await page.evaluate(()=>{window.oldFail=failAction;window.oldSignal=actionCalls[0].signal;switchReading();});
   await page.waitForFunction(()=>activeReadingId==='original'&&oldSignal.aborted);await open();await control().click();await page.waitForFunction(()=>actionCalls.length===2);
   await page.evaluate(()=>oldFail(new Error('Old action failed')));check(await control().getAttribute('aria-busy')==='true','old result cleared new busy state');check(!(await status().textContent()).includes('Could not'),'old error leaked');
   await page.evaluate(value=>finishAction(value),kind==='generate'?'blob:current':false);
   await page.waitForFunction(()=>!document.querySelector('[data-generate-sentence][aria-busy="true"], [data-remove-sentence][aria-busy="true"]'));
   results.push({route:'navigate-during-'+kind,oldSignalAborted:true,newActionIndependent:true});
  }
  console.log('Checking failure after Escape');await render({});await open();await generate().focus();await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  check(await manage().evaluate(el=>el===document.activeElement),'Escape focus lost');await page.evaluate(()=>failAction(new Error('Current generation failed')));
  await page.waitForFunction(()=>document.querySelector('[data-edit-audio-status]')?.textContent.includes('Could not generate'));
  check(await status().isVisible()&&await manage().evaluate(el=>el===document.activeElement),'closed failure invisible or stole focus');
  results.push({route:'generate-failure-after-close',statusVisible:true,focusPreserved:true});
  console.log('Checking unconfirmed removal');await render({});await open();await remove().focus();await page.keyboard.press('Space');await page.evaluate(()=>finishAction(undefined));
  await page.waitForFunction(()=>document.querySelector('[data-edit-audio-status]')?.textContent.includes('Could not confirm'));
  check(await remove().evaluate(el=>el===document.activeElement),'unconfirmed removal lost focus');results.push({route:'unconfirmed-removal',truthfulStatus:true,focusPreserved:true});
  console.log('Checking moved focus');await render({});await open();await remove().click();await close().focus();await page.evaluate(()=>{stageAction();finishAction(true);});await remove().waitFor({state:'detached'});
  check(await close().evaluate(el=>el===document.activeElement),'removal stole moved focus');results.push({route:'moved-focus',focusPreserved:true});
  check(errors.length===0,'browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(out,'sentence-actions-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,results,errors,limitations:['Mock generation/removal/store APIs; no real synthesis, microphone or persistent writes','DOM semantics are not real screen-reader announcement verification','200% computed-font simulation is not actual text-only zoom or 400% browser zoom','No mobile hardware, Firefox or WebKit verification']},null,2));
  console.log(JSON.stringify({passed:results.length,errors}));
 }catch(error){console.error(JSON.stringify(await page.evaluate(()=>({notice:document.querySelector('[data-edit-audio-status]')?.textContent,active:document.activeElement?.outerHTML.slice(0,500),calls:actionCalls.map(({signal,...value})=>value)}))));throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
