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
function Harness({options}) {
 const [editing,setEditing]=React.useState(false), [compare,setCompare]=React.useState(!!options.compare), [originalRoute,setOriginalRoute]=React.useState(!!options.original);window.switchReading=()=>setOriginalRoute(x=>!x);window.activeReadingId=originalRoute?'original':'adapted';
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
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url()==='http://narration-fixture.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="mount"></main></body></html>'}):route.abort());
 const check=(ok,label)=>{if(!ok)throw Error(label);};
 try {
  await page.goto('http://narration-fixture.test/');await page.addStyleTag({content:css});await page.addScriptTag({content:runtime});
  await page.addScriptTag({content:'window.translations='+JSON.stringify(strings)+';window.t=(key)=>{const value=key.split(".").reduce((o,k)=>o&&o[k],translations);return typeof value==="string"?value:key;};window.AlloLanguageContext=React.createContext({t});window.AlloModules={};'});
  for(const file of ['app_styles_module.js','instructional_context_module.js','pure_helpers_module.js','phase_n_misc_helpers_module.js','view_simplified_module.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.addScriptTag({content:fixture});
  const render=async options=>{await page.evaluate(o=>{window.savedClips=0;window.saveCalls=0;renderFixture(o);},options);await page.locator('[data-adapted-reader]').waitFor();await page.locator('[data-review-action=audio-retry-save]').waitFor();};
  const retry=()=>page.locator('[data-review-action=audio-retry-save]');
  const notice=()=>page.locator('[data-device-audio-notice]');
  const status=()=>page.locator('[data-device-audio-status]');
  const focusVisible=async locator=>locator.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.top>=0&&b.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});
  for(const route of ['adapted','original','both'])for(const mode of ['normal','spacing','200-text']) {
   await render({original:route==='original',compare:route==='both'});
   if(mode==='spacing')await page.evaluate(()=>{document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';});});
   if(mode==='200-text')await page.evaluate(()=>{const values=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);values.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   await retry().focus();check(await focusVisible(retry()),'Retry focus obscured');
   await page.keyboard.press('Enter');await page.keyboard.press('Enter');
   check(await page.evaluate(()=>saveCalls)===1,'duplicate save request');
   check((await status().textContent()).includes('Saving audio on this device'),'saving status missing');
   await page.evaluate(()=>finishSave(false));await notice().waitFor();
   check((await notice().textContent()).includes('Audio saving was not confirmed'),'unconfirmed result invisible');
   check(await retry().evaluate(el=>el===document.activeElement),'retry focus lost after failure');
   check(await focusVisible(retry()),'retry focus obscured after failure');
   const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
   check(geometry.scrollWidth<=geometry.width+2,'narrow recovery overflow '+JSON.stringify(geometry));
   const semantics=await status().evaluate(el=>({role:el.getAttribute('role'),live:el.getAttribute('aria-live'),atomic:el.getAttribute('aria-atomic')}));
   check(semantics.role==='status'&&semantics.live==='polite'&&semantics.atomic==='true','status semantics');
   await page.evaluate(()=>{savedClips=3;window.dispatchEvent(new CustomEvent('alloflow:offline-media-persistence',{detail:{resourceId:activeReadingId}}));});
   await retry().waitFor({state:'detached'});
   check(await page.locator('[data-manage-narration]').evaluate(el=>el===document.activeElement),'background completion lost focus');
   check(await focusVisible(page.locator('[data-manage-narration]')),'restored focus obscured');
   results.push({route,mode,...geometry,semantics,unconfirmedResultVisible:true,duplicateGuard:true,focusReturned:true});
  }
  await render({});await retry().focus();
  await page.evaluate(()=>{savedClips=3;window.dispatchEvent(new CustomEvent('alloflow:offline-media-persistence',{detail:{resourceId:activeReadingId}}));});
  await retry().waitFor({state:'detached'});check(await page.locator('[data-manage-narration]').evaluate(el=>el===document.activeElement),'unclicked focused action lost focus');
  results.push({route:'background-save-before-activation',focusReturned:true});
  await render({});await retry().focus();await page.locator('[data-review-action=edit]').focus();
  await page.evaluate(()=>{savedClips=3;window.dispatchEvent(new CustomEvent('alloflow:offline-media-persistence',{detail:{resourceId:activeReadingId}}));});
  await retry().waitFor({state:'detached'});check(await page.locator('[data-review-action=edit]').evaluate(el=>el===document.activeElement),'background completion stole focus');
  results.push({route:'background-save-focus-moved',focusPreserved:true});
  await render({});await retry().tap();
  await page.evaluate(()=>{window.oldSignal=saveSignal;window.oldFail=failSave;switchReading();});
  await page.waitForFunction(()=>activeReadingId==='original'&&document.querySelector('[data-review-action=audio-retry-save]')?.getAttribute('aria-busy')!=='true');
  check(await page.evaluate(()=>oldSignal.aborted),'navigation did not abort old request');
  await retry().focus();await page.keyboard.press('Enter');
  await page.evaluate(()=>oldFail(new Error('Old save failure')));
  check(await retry().getAttribute('aria-busy')==='true','old completion changed new request');
  check(await notice().count()===0,'old failure leaked to next resource');
  await page.evaluate(()=>failSave(new Error('Current storage failure')));await notice().waitFor();
  check((await status().textContent()).includes('Audio could not be saved on this device'),'current failure not announced');
  results.push({route:'navigate-during-save',oldRequestAborted:true,newRequestIndependent:true});
  check(errors.length===0,'browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(out,'narration-recovery-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,results,errors,limitations:['Mock storage APIs; no actual persistent writes or reopen verification','DOM live-region semantics are not real AT announcement verification','200% computed-font simulation is not real browser text zoom or 400% zoom','No hardware mobile or microphone use']},null,2));
  console.log(JSON.stringify({passed:results.length,errors}));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
