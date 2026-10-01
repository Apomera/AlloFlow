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
  const render=async options=>{await page.evaluate(o=>{window.savedClips=0;window.saveCalls=0;window.recordingSaves=[];window.syntheticStreams=[];window.recordingSaveMode='success';renderFixture(o);},options);await page.locator('[data-adapted-reader]').waitFor();await page.locator('[data-review-action=audio-retry-save]').waitFor();};
  const manage=()=>page.locator('[data-manage-narration]');
  const record=()=>page.locator('[data-audio-sentence-index="0"]').getByRole('button').nth(2);
  const close=()=>page.getByRole('button',{name:'Close narration',exact:true});
  const status=()=>page.locator('[data-edit-audio-status]');
  const focusVisible=async locator=>locator.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.top>=0&&b.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});
  const open=async()=>{await manage().focus();await page.keyboard.press('Enter');await record().waitFor();};
  const start=async()=>{await record().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-audio-sentence-index="0"] button[aria-pressed="true"]'));await page.waitForFunction(()=>nativeRecorders.at(-1)?.fixtureBytes>0);};
  const retry=()=>page.locator('[data-retry-recording]');
  const discard=()=>page.locator('[data-discard-recording]');
  const failedTake=async()=>{await page.evaluate(()=>window.recordingSaveMode='failure');await start();await close().click();await retry().waitFor();};
  for(const route of ['adapted','original','both'])for(const mode of ['normal','spacing','200-text']) {
   console.log('Checking retry '+route+' / '+mode);
   await render({original:route==='original',compare:route==='both'});await open();await failedTake();
   if(mode==='spacing')await page.evaluate(()=>{document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';});});
   if(mode==='200-text')await page.evaluate(()=>{const values=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);values.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   check(await page.locator('[data-recording-recovery]').isVisible(),'recovery hidden after Close');
   check((await page.locator('[data-recording-recovery]').textContent()).includes('Leaving or reloading clears this take'),'temporary scope unclear');
   const before=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,streams:syntheticStreams.length,stopped:syntheticStreams.every(stream=>stream.getTracks().every(track=>track.readyState==='ended'))}));
   check(before.scrollWidth<=before.width+2&&before.stopped,'recovery overflow or microphone not released');
   await retry().focus();check(await focusVisible(retry()),'Retry focus obscured');
   await page.evaluate(()=>window.recordingSaveMode='pending');
   if(route==='both'&&mode==='normal')await retry().tap();else await page.keyboard.press('Enter');
   await page.waitForFunction(()=>recordingSaves.length===2);
   check(await retry().getAttribute('aria-disabled')==='true'&&await retry().getAttribute('aria-busy')==='true','retry busy state missing');
   check(await retry().evaluate(el=>el===document.activeElement),'retry busy focus lost');
   await page.keyboard.press('Enter');check(await page.evaluate(()=>recordingSaves.length===2),'duplicate retry');
   await page.evaluate(()=>finishRecordingSave(true));await retry().waitFor({state:'detached'});
   check(await manage().evaluate(el=>el===document.activeElement),'removed Retry lost focus');
   check(await focusVisible(manage()),'restored Manage focus obscured');
   const saved=await page.evaluate(()=>({sameBlob:recordingSaves[0].blob===recordingSaves[1].blob,streams:syntheticStreams.length,resourceId:recordingSaves[1].resourceId,bytes:recordingSaves[1].bytes,mime:recordingSaves[1].mime}));
   check(saved.sameBlob&&saved.streams===before.streams&&saved.resourceId===(route==='original'?'original':'adapted'),'retry changed capture or resource');
   check((await status().textContent()).includes('Check device save status'),'recording readiness overstated');
   check(await status().getAttribute('aria-atomic')==='true'&&await status().isVisible(),'result unavailable');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
   check(!overflow,'success caused horizontal overflow');
   check(await page.locator('button button, button input, button select, button a').count()===0,'nested controls');
   results.push({route,mode,...before,...saved,recoveryVisible:true,focusReturned:true});
  }
  console.log('Checking stop-in-panel failure focus');
  await render({});await open();await page.evaluate(()=>window.recordingSaveMode='failure');await start();await record().focus();await page.keyboard.press('Enter');await retry().waitFor();
  check(await retry().evaluate(el=>el===document.activeElement),'stop-in-panel failure lost recovery focus');
  check(await focusVisible(retry()),'first-failure Retry focus obscured');
  results.push({route:'stop-in-panel-failure',retryFocused:true});
  console.log('Checking repeated failure and discard');
  await render({});await open();await failedTake();await retry().focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>recordingSaves.length===2&&document.querySelector('[data-retry-recording]')?.getAttribute('aria-busy')==='false');
  check(await retry().evaluate(el=>el===document.activeElement),'failure stole Retry focus');
  await discard().focus();check(await focusVisible(discard()),'Discard focus obscured');await page.keyboard.press('Space');await retry().waitFor({state:'detached'});
  check(await manage().evaluate(el=>el===document.activeElement),'Discard lost focus');
  check((await status().textContent()).includes('Unsaved take discarded'),'discard status missing');
  await page.evaluate(()=>window.recordingSaveMode='success');await open();await start();await close().click();
  await page.waitForFunction(()=>recordingSaves.length===3&&document.querySelector('[data-edit-audio-status]')?.textContent.includes('Teacher recording ready'));
  check(await page.evaluate(()=>syntheticStreams.length===2),'discard did not allow another recording');
  results.push({route:'repeat-failure-discard-record-again',focusReturned:true});
  console.log('Checking busy guards and moved focus');
  await render({});await open();await failedTake();await page.evaluate(()=>window.recordingSaveMode='pending');await retry().click();
  await page.waitForFunction(()=>recordingSaves.length===2);await discard().focus();await page.keyboard.press('Enter');
  check(await retry().count()===1&&await discard().getAttribute('aria-disabled')==='true','busy discard was not guarded');
  await open();await close().focus();await page.evaluate(()=>finishRecordingSave(true));await retry().waitFor({state:'detached'});
  check(await close().evaluate(el=>el===document.activeElement),'retry completion stole moved focus');
  results.push({route:'retry-busy-and-moved-focus',focusPreserved:true,discardGuarded:true});
  console.log('Checking retry navigation');
  await render({});await open();await failedTake();await page.evaluate(()=>window.recordingSaveMode='pending');await retry().click();await page.waitForFunction(()=>recordingSaves.length===2);
  await page.evaluate(()=>{window.oldFinish=finishRecordingSave;window.oldSignal=recordingSaves[1].signal;switchReading();});
  await page.waitForFunction(()=>activeReadingId==='original'&&oldSignal.aborted);await retry().waitFor({state:'detached'});
  await open();await failedTake();await page.evaluate(()=>oldFinish(true));
  check(await retry().isVisible()&&(await status().textContent()).includes('available to retry'),'old completion removed the new retained take');
  results.push({route:'navigate-during-retry',oldSignalAborted:true,newTakeIndependent:true});
  check(errors.length===0,'browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(out,'recording-retry-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,nativeMediaRecorder:true,results,errors,limitations:['Native MediaRecorder with synthetic audio; no actual microphone or permission dialog','Mock host save callback; no persistent writes, reopen, quota or eviction verification','DOM semantics and focus checks are not actual screen-reader announcement verification','200% computed-font simulation is not actual text-only zoom or 400% browser zoom','No mobile hardware, Firefox or WebKit verification']},null,2));
  console.log(JSON.stringify({passed:results.length,errors}));
 } catch(error) {
  console.error(JSON.stringify(await page.evaluate(()=>({notice:document.querySelector('[data-edit-audio-status]')?.textContent,saves:recordingSaves.map(({signal,blob,...value})=>value),tracks:syntheticStreams.map(stream=>stream.getTracks().map(track=>track.readyState))}))));
  throw error;
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
