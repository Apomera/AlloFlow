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

// Real, muted HTMLAudioElements and a local silent WAV. No microphone or network audio.
const samples=8000*120,buffer=new ArrayBuffer(44+samples*2),wav=new DataView(buffer);
const ascii=(offset,value)=>{for(let i=0;i<value.length;i++)wav.setUint8(offset+i,value.charCodeAt(i));};
ascii(0,'RIFF');wav.setUint32(4,36+samples*2,true);ascii(8,'WAVE');ascii(12,'fmt ');wav.setUint32(16,16,true);wav.setUint16(20,1,true);wav.setUint16(22,1,true);wav.setUint32(24,8000,true);wav.setUint32(28,16000,true);wav.setUint16(32,2,true);wav.setUint16(34,16,true);ascii(36,'data');wav.setUint32(40,samples*2,true);
window.silentUrl=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));window.replacementUrl=URL.createObjectURL(new Blob([buffer],{type:'audio/wav'}));window.brokenUrl=URL.createObjectURL(new Blob(['invalid WAV fixture'],{type:'audio/wav'}));
window.previewUrl=silentUrl;window.previewPlayers=[];window.previewMode='normal';window.nativeStarts=0;window.quarantineCount=0;
window.__alloInspectReadAloudAudio=()=>({status:previewUrl?'ready':'missing',storedUrl:previewUrl,url:previewUrl,source:'human-teacher'});
window.__alloGetReadAloudAudioSummary=()=>({ready:previewUrl?3:0,missing:previewUrl?0:3,total:3});
window.__alloQuarantineReadAloudAudio=async()=>{quarantineCount++;return true;};
const NativeAudio=window.Audio;
window.Audio=function(url){
 const audio=new NativeAudio(url);audio.muted=true;audio.fixturePlayCalls=0;const nativePlay=audio.play.bind(audio);
 audio.play=()=>{
  audio.fixturePlayCalls++;
  if(previewMode==='deny')return Promise.reject(new DOMException('Fixture autoplay denial','NotAllowedError'));
  let gate=null;if(previewMode==='pending')gate=new Promise((resolve,reject)=>{window.finishPreview=resolve;window.failPreview=reject;});
  return nativePlay().then(()=>{window.nativeStarts++;return gate||undefined;});
 };
 previewPlayers.push(audio);return audio;
};

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
  const render=async options=>{await page.evaluate(o=>{window.savedClips=0;window.saveCalls=0;window.recordingSaves=[];window.syntheticStreams=[];window.recordingSaveMode='success';window.actionCalls=[];window.savedByResource={original:true,adapted:true};window.previewUrl=window.silentUrl;window.previewMode='normal';window.previewPlayers=[];window.nativeStarts=0;window.quarantineCount=0;renderFixture(o);},options);await page.locator('[data-adapted-reader]').waitFor();await page.locator('[data-review-action=audio-retry-save]').waitFor();};
  const manage=()=>page.locator('[data-manage-narration]');
  const record=()=>page.locator('[data-audio-sentence-index="0"]').getByRole('button').nth(2);
  const close=()=>page.getByRole('button',{name:'Close narration',exact:true});
  const status=()=>page.locator('[data-edit-audio-status]');
  const focusVisible=async locator=>locator.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.top>=0&&b.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});
  const open=async()=>{await manage().focus();await page.keyboard.press('Enter');await record().waitFor();};
  const start=async()=>{await record().focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('[data-audio-sentence-index="0"] button[aria-pressed="true"]'));await page.waitForFunction(()=>nativeRecorders.at(-1)?.fixtureBytes>0);};
  const play=()=>page.locator('[data-preview-sentence="simplified-0"]');
  const generate=()=>page.locator('[data-generate-sentence="simplified-0"]');
  const pressPlay=async()=>{await play().focus();await page.keyboard.press('Enter');};
  for(const route of ['adapted','original','both'])for(const mode of ['normal','spacing','200-text']){
   console.log('Checking preview '+route+' / '+mode);await render({original:route==='original',compare:route==='both'});await open();
   if(mode==='spacing')await page.evaluate(()=>{document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';});});
   if(mode==='200-text')await page.evaluate(()=>{const values=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);values.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   await page.evaluate(()=>window.previewMode='pending');await pressPlay();await page.waitForFunction(()=>nativeStarts===1);
   check(await play().getAttribute('aria-busy')==='true'&&await play().evaluate(el=>el===document.activeElement),'busy Play focus/semantics');check(await focusVisible(play()),'Play focus obscured');
   await page.keyboard.press('Enter');check(await page.evaluate(()=>previewPlayers.length===1&&previewPlayers[0].fixturePlayCalls===1),'duplicate initial Play');
   await page.evaluate(()=>finishPreview());await page.waitForFunction(()=>document.querySelector('[data-preview-sentence]')?.getAttribute('aria-pressed')==='true');
   await page.keyboard.press('Enter');check(await page.evaluate(()=>previewPlayers[0].paused),'Pause did not pause native audio');
   if(route==='both'&&mode==='normal')await play().tap();else await page.keyboard.press('Enter');await page.waitForFunction(()=>nativeStarts===2);
   await page.keyboard.press('Enter');check(await page.evaluate(()=>previewPlayers[0].fixturePlayCalls===2),'duplicate resume');
   await page.keyboard.press('Escape');check(await manage().evaluate(el=>el===document.activeElement),'Escape lost focus');check(await focusVisible(manage()),'Manage focus obscured');
   await page.evaluate(()=>finishPreview());await page.waitForFunction(()=>previewPlayers[0].paused);
   check((await status().textContent()).includes('Audio preview stopped')&&await status().isVisible(),'late resume replaced stopped result');
   const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));check(geometry.scrollWidth<=geometry.width+2,'preview reflow overflow');
   check(await status().getAttribute('aria-live')==='polite'&&await status().getAttribute('aria-atomic')==='true','preview status semantics');
   results.push({route,mode,...geometry,nativePlayback:true,muted:true,busyFocusPreserved:true,closeStopsPreview:true});
  }
  console.log('Checking delayed resume across navigation');await render({});await open();await pressPlay();await page.waitForFunction(()=>nativeStarts===1);await pressPlay();await page.evaluate(()=>window.previewMode='pending');await pressPlay();await page.waitForFunction(()=>nativeStarts===2);
  await page.evaluate(()=>{window.oldFail=failPreview;window.oldPlayer=previewPlayers[0];window.previewMode='normal';switchReading();});await page.waitForFunction(()=>activeReadingId==='original');await open();await pressPlay();await page.waitForFunction(()=>nativeStarts===3);
  await page.evaluate(()=>oldFail(new DOMException('Old decode rejection','NotSupportedError')));
  check(await page.evaluate(()=>oldPlayer.paused&&!previewPlayers[1].paused&&quarantineCount===0),'old resume affected the new reading');check((await status().textContent()).includes('Playing sentence'),'old error leaked into status');results.push({route:'navigate-during-resume',newPlaybackPreserved:true,noWrongQuarantine:true});
  console.log('Checking clip replacement');await render({});await open();await pressPlay();await page.waitForFunction(()=>nativeStarts===1);
  await page.evaluate(()=>{previewUrl=replacementUrl;window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId:activeReadingId}}));});await page.waitForFunction(()=>previewPlayers[0].paused);await pressPlay();await page.waitForFunction(()=>nativeStarts===2);check(await page.evaluate(()=>previewPlayers[1].src===replacementUrl),'old clip reused');results.push({route:'replacement',oldAudioStopped:true,newAudioLoaded:true});
  console.log('Checking removed paused clip');await render({});await open();await pressPlay();await page.waitForFunction(()=>nativeStarts===1);await pressPlay();await page.evaluate(()=>{previewUrl=null;window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId:activeReadingId}}));});
  await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-generate-sentence'));check(await focusVisible(generate()),'removed clip recovery focus obscured');results.push({route:'removed-paused-clip',generateFocused:true});
  console.log('Checking autoplay denial');await render({});await open();await page.evaluate(()=>window.previewMode='deny');await pressPlay();await page.waitForFunction(()=>document.querySelector('[data-edit-audio-status]')?.textContent.includes('blocked'));
  check(await page.evaluate(()=>quarantineCount===0)&&await play().evaluate(el=>el===document.activeElement),'denial damaged clip or lost focus');await page.evaluate(()=>window.previewMode='normal');await pressPlay();await page.waitForFunction(()=>nativeStarts===1);results.push({route:'injected-autoplay-denial',retryWorks:true,noQuarantine:true});
  console.log('Checking native invalid media');await render({});await open();await page.evaluate(()=>previewUrl=brokenUrl);await pressPlay();await page.waitForFunction(()=>quarantineCount===1&&document.querySelector('[data-edit-audio-status]')?.textContent.includes('could not be played'));await page.waitForTimeout(100);
  check(await page.evaluate(()=>quarantineCount===1),'native media error reported twice');check(await play().getAttribute('aria-pressed')==='false','invalid media reported Playing');results.push({route:'native-invalid-media',oneQuarantine:true});
  check(errors.length===0,'browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(out,'preview-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,nativeMutedAudio:true,results,errors,limitations:['Silent local WAV and invalid local media; no real user audio or storage writes','Play acknowledgements are gated for deterministic races; autoplay denial is injected','DOM semantics are not actual screen-reader announcement verification','200% computed-font simulation is not actual text-only zoom or 400% browser zoom','No mobile hardware, Firefox or WebKit verification']},null,2));console.log(JSON.stringify({passed:results.length,errors}));
 }catch(error){console.error(JSON.stringify(await page.evaluate(()=>({notice:document.querySelector('[data-edit-audio-status]')?.textContent,active:document.activeElement?.outerHTML.slice(0,400),quarantineCount,players:previewPlayers.map(p=>({paused:p.paused,playCalls:p.fixturePlayCalls,error:p.error?.code}))}))));throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
