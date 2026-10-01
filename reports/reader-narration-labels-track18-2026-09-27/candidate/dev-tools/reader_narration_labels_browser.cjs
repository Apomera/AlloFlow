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
window.activeReadingId='adapted';window.clipStates=['ready','stale','corrupt'];window.labelMode='normal';window.actionCalls=[];
const countClips=()=>{const result={ready:0,stale:0,corrupt:0,missing:0,unverified:0,total:3};clipStates.forEach(state=>result[state]++);return result;};
window.__alloGetReadAloudAudioSummary=()=>labelMode==='unavailable'?null:countClips();
window.__alloInspectReadAloudAudio=sentence=>{if(labelMode==='unavailable')return null;const index=sentence.startsWith('Plants')?0:sentence.startsWith('Roots')?1:2;const status=clipStates[index];return {status,storedUrl:['ready','stale'].includes(status)?'blob:fixture':null,source:'ai'};};
window.__alloGetReadAloudReadiness=async()=>{const state=countClips();return {...state,state:'session-only',resourceId:activeReadingId,scope:'device-audio',remaining:3-state.ready,durableReady:0,sessionOnly:state.ready,nextActions:['retry-save']};};
window.__alloPrepareReadAloud=async()=>{actionCalls.push('prepare');return {ok:true,remaining:0};};
window.__alloRegenerateSentenceAudio=async()=>{actionCalls.push('generate');return 'blob:fixture';};
window.__alloRemoveSentenceAudio=async()=>{actionCalls.push('remove');return true;};
window.refreshLabels=states=>{clipStates=states;window.dispatchEvent(new CustomEvent('alloflow:karaoke-audio-updated',{detail:{resourceId:activeReadingId}}));};

function Harness({options}) {
 const [editing,setEditing]=React.useState(false),[compare,setCompare]=React.useState(!!options.compare);const originalRoute=!!options.original;window.activeReadingId=originalRoute?'original':'adapted';
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
  const render=async options=>{await page.evaluate(o=>{localStorage.clear();window.clipStates=['ready','stale','corrupt'];window.labelMode='normal';window.actionCalls=[];renderFixture(o);},options);await page.locator('[data-adapted-reader]').waitFor();await page.locator('[data-review-action=audio-retry-save]').waitFor();};
  const manage=()=>page.locator('[data-manage-narration]'),close=()=>page.locator('[data-close-narration]');
  const row=index=>page.locator(`[data-audio-sentence-index="${index}"]`);
  const label=index=>row(index).locator('[role="group"]').first().locator('span').first();
  const focusVisible=async locator=>locator.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.top>=0&&b.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});
  const checkbox=()=>page.getByRole('checkbox',{name:'Save TTS as it plays',exact:true});
  for(const route of ['adapted','original','both'])for(const mode of ['normal','spacing','200-text']){
   console.log('Checking labels '+route+' / '+mode);await render({original:route==='original',compare:route==='both'});await manage().focus();await page.keyboard.press('Enter');await close().waitFor();
   if(mode==='spacing')await page.evaluate(()=>{document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';});});
   if(mode==='200-text')await page.evaluate(()=>{const values=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);values.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   check((await manage().textContent()).includes('1/3 ready for playback'),'badge falsely counts stale/damaged');
   check((await label(0).textContent())==='ready for playback','ready label missing');check((await label(1).textContent())==='Stored audio · settings changed','stale label inaccurate');check((await label(2).textContent())==='Audio needs repair','corrupt label inaccurate');
   check((await page.locator('[data-review-state="audio"]').textContent()).includes('0 of 3 clips saved'),'playback confused with device save');
   await checkbox().focus();check(await focusVisible(checkbox()),'capture checkbox focus obscured');const before=await checkbox().isChecked();await page.keyboard.press('Space');check(await checkbox().isChecked()!==before,'Space failed to toggle capture');
   check((await manage().textContent()).includes('1/3 ready for playback'),'capture toggle removed clips');
   const help=await checkbox().evaluate(el=>document.getElementById(el.getAttribute('aria-describedby'))?.textContent);check(help?.includes('Turning it off keeps existing clips')&&help.includes('device-save status'),'capture help missing');
   check(await checkbox().evaluate(el=>el.closest('label').getBoundingClientRect().height>=44),'capture label touch height');
   const generate=row(2).locator('[data-generate-sentence]');await generate.focus();check(await focusVisible(generate),'repair action focus obscured');
   await close().focus();check(await focusVisible(close()),'Close focus obscured');await page.keyboard.press('Escape');check(await manage().evaluate(el=>el===document.activeElement),'Escape lost focus');check(await focusVisible(manage()),'Manage focus obscured');
   const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));check(geometry.scrollWidth<=geometry.width+2,'labels reflow overflow');
   check(await page.evaluate(()=>document.querySelectorAll('button button,button input,button a,input input').length===0),'nested interactive controls');check(await page.evaluate(()=>actionCalls.length===0),'label interaction changed clips');
   results.push({route,mode,...geometry,accurateCounts:true,focusVisible:true,captureNameAndHelp:true,deviceSaveSeparate:true});
  }
  console.log('Checking background readiness update');await render({});await manage().focus();await page.evaluate(()=>refreshLabels(['ready','ready','ready']));await page.waitForFunction(()=>document.querySelector('[data-manage-narration]')?.textContent.includes('3/3 ready'));
  check(await manage().evaluate(el=>el===document.activeElement),'background readiness update moved focus');check((await page.locator('[data-review-state="audio"]').textContent()).includes('0 of 3 clips saved'),'background ready implies saved');results.push({route:'background-update',focusPreserved:true,noDurabilityClaim:true});
  console.log('Checking unavailable readiness');await page.evaluate(()=>{labelMode='unavailable';refreshLabels(['ready','ready','ready']);});await page.waitForFunction(()=>document.querySelector('[data-manage-narration]')?.textContent.includes('Playback readiness not verified'));
  check(!(await manage().textContent()).includes('3/3 ready'),'unavailable falsely ready');check(await manage().evaluate(el=>el===document.activeElement),'unavailable moved focus');results.push({route:'unavailable',explicitUnverified:true,focusPreserved:true});
  console.log('Checking touch capture label');await render({compare:true});await checkbox().locator('..').tap();check(await checkbox().isChecked()===false,'touch capture label did not toggle');check(await page.evaluate(()=>actionCalls.length===0),'touch changed stored clips');results.push({route:'touch-label',labelActivatesCheckbox:true});
  check(errors.length===0,'browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(out,'labels-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,results,errors,limitations:['Mocked readiness/persistence; no real storage writes or provider calls','DOM semantics are not screen-reader announcement proof','Doubled computed fonts are not actual text-only zoom or 400% browser zoom','No hardware mobile, Firefox or WebKit verification']},null,2));console.log(JSON.stringify({passed:results.length,errors}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
