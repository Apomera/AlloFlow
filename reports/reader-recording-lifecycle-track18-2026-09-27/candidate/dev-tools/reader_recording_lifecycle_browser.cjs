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
 const [editing,setEditing]=React.useState(false), [compare,setCompare]=React.useState(!!options.compare), [originalRoute,setOriginalRoute]=React.useState(!!options.original);window.switchReading=()=>setOriginalRoute(x=>!x);window.activeReadingId=originalRoute?'original':'adapted';window.__alloStoreRecordedSentenceAudio=((resourceId)=>async(sentence,blob,source,options)=>{window.recordingSaves.push({resourceId,sentence,bytes:blob.size,mime:blob.type,source,signal:options?.signal});if(window.recordingSaveMode==='pending')return new Promise(resolve=>window.finishRecordingSave=resolve);return window.recordingSaveMode==='success';})(window.activeReadingId);
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
  for(const route of ['adapted','original','both'])for(const mode of ['normal','spacing','200-text']) {
   console.log('Checking '+route+' / '+mode);
   await render({original:route==='original',compare:route==='both'});await open();
   if(mode==='spacing')await page.evaluate(()=>{document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';});});
   if(mode==='200-text')await page.evaluate(()=>{const values=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);values.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   await start();await close().focus();check(await focusVisible(close()),'Close focus obscured');
   if(route==='both'&&mode==='normal')await close().tap();else await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('[data-edit-audio-status]')?.textContent.includes('Teacher recording ready'));
   const saved=await page.evaluate(()=>({saves:recordingSaves.map(({signal,...value})=>value),ended:syntheticStreams.every(stream=>stream.getTracks().every(track=>track.readyState==='ended'))}));
   check(saved.saves.length===1&&saved.saves[0].bytes>0,'native recording blob missing');
   check(saved.saves[0].resourceId===(route==='original'?'original':'adapted'),'recording bound to wrong reading');
   check(saved.saves[0].source==='human-teacher'&&saved.ended,'recording ownership or track cleanup');
   check(await close().count()===0,'narration did not close');
   check(await manage().evaluate(el=>el===document.activeElement),'Close focus not restored');
   check(await focusVisible(manage()),'restored focus obscured');
   check(await status().isVisible(),'completion hidden after Close');
   const semantics=await status().evaluate(el=>({role:el.getAttribute('role'),live:el.getAttribute('aria-live'),atomic:el.getAttribute('aria-atomic')}));
   check(semantics.role==='status'&&semantics.live==='polite'&&semantics.atomic==='true','completion semantics');
   const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   check(geometry.scrollWidth<=geometry.width+2,'narrow recording overflow '+JSON.stringify(geometry));
   results.push({route,mode,...geometry,...saved,semantics,focusReturned:true,completionVisible:true});
  }
  console.log('Checking navigation during save');
  await render({});await open();await page.evaluate(()=>window.recordingSaveMode='pending');await start();await record().click();
  await page.waitForFunction(()=>recordingSaves.length===1);
  await page.evaluate(()=>{window.oldSignal=recordingSaves[0].signal;window.oldFinish=finishRecordingSave;switchReading();});
  await page.waitForFunction(()=>activeReadingId==='original'&&oldSignal.aborted);
  if(!await record().count())await open();await page.evaluate(()=>window.recordingSaveMode='success');await start();
  await page.evaluate(()=>oldFinish(false));
  check(await record().getAttribute('aria-pressed')==='true','old save disrupted new recording');
  await close().click();await page.waitForFunction(()=>recordingSaves.length===2&&document.querySelector('[data-edit-audio-status]')?.textContent.includes('Teacher recording ready'));
  check(await page.evaluate(()=>recordingSaves[1].resourceId==='original'&&syntheticStreams.every(stream=>stream.getTracks().every(track=>track.readyState==='ended'))),'new recording not scoped or cleaned');
  results.push({route:'navigate-during-recording-save',oldSignalAborted:true,newRecordingIndependent:true});
  console.log('Checking close during permission');
  await render({});await open();
  await page.evaluate(()=>{window.realSyntheticMicrophone=syntheticMicrophone;window.syntheticMicrophone=()=>new Promise(resolve=>window.resolveMicrophone=resolve);});
  await record().click();await page.waitForFunction(()=>typeof resolveMicrophone==='function');await close().click();
  await page.evaluate(async()=>{resolveMicrophone(await realSyntheticMicrophone());window.syntheticMicrophone=realSyntheticMicrophone;});
  await page.waitForFunction(()=>syntheticStreams.length===1&&syntheticStreams[0].getTracks().every(track=>track.readyState==='ended'));
  check(await page.evaluate(()=>recordingSaves.length===0),'cancelled permission saved recording');
  results.push({route:'close-during-permission',lateStreamStopped:true,noSave:true});
  console.log('Checking failure after close');
  await render({});await open();await page.evaluate(()=>window.recordingSaveMode='failure');await start();await close().click();
  await page.waitForFunction(()=>document.querySelector('[data-edit-audio-status]')?.textContent.includes('Could not save'));
  check(await status().isVisible(),'failed recording invisible after Close');
  check(!(await status().textContent()).includes('Teacher recording ready'),'failed recording reported ready');
  results.push({route:'failure-after-close',failureVisible:true});
  check(errors.length===0,'browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(out,'recording-lifecycle-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,nativeMediaRecorder:true,results,errors,limitations:['Synthetic audio stream, no microphone permission prompt or hardware use','Mock host save callback; no actual persistent writes or reopen verification','DOM live-region semantics are not real AT announcement verification','200% computed-font simulation is not real browser text zoom or 400% zoom','No hardware mobile, WebKit, or Firefox verification']},null,2));
  console.log(JSON.stringify({passed:results.length,errors}));
 } catch(error) {
  console.error(JSON.stringify(await page.evaluate(()=>({notice:document.querySelector('[data-edit-audio-status]')?.textContent,saves:recordingSaves.map(({signal,...value})=>value),tracks:syntheticStreams.map(stream=>stream.getTracks().map(track=>track.readyState))}))));
  throw error;
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
