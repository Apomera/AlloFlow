// Isolated fixture only: no app server, credentials, saved data, or TTS calls.
const fs = require('fs'), path = require('path'), { createRequire } = require('module');
const root = path.resolve(__dirname, '..'), req = createRequire(path.join(root, 'package.json'));
const web = createRequire(path.join(root, 'desktop/web-app/package.json'));
const { chromium } = req('playwright'), esbuild = req('esbuild');
const out = path.join(root, 'reports/adapted-reader-integration-01-2026-09-26-1730/narration-browser');
const fixture = String.raw`
const h = React.createElement, noop = () => {};
const text = 'Plants need light. Roots take in water. '+ 'Longword'.repeat(14) + '.';
const original = AlloModules.InstructionalContext.createSupportedReading(text, {id:'original',config:{language:'English'}});
const adapted = {id:'adapted',type:'simplified',data:text,config:{language:'English',grade:'5'},sourceSnapshot:original.sourceSnapshot,instructionalText:{form:'adapted',role:'supplemental'}};
window.__alloGetReadAloudAudioSummary = () => ({ready:0,missing:3,total:3});
window.__alloPrepareReadAloud = async () => ({ok:false,remaining:3,failure:{reason:'Fixture: narration could not be saved. Try again.'}});
function Harness({options}) {
 const [editing,setEditing]=React.useState(false), [compare,setCompare]=React.useState(!!options.compare);
 const props={t,generatedContent:options.original?original:adapted,gradeLevel:'5',leveledTextLanguage:'English',selectedVoice:'Kore',voiceSpeed:1,studentInterests:[],history:[original,adapted],
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
  const render=async options=>{await page.evaluate(o=>renderFixture(o),options);await page.locator('[data-adapted-reader]').waitFor();};
  for(const route of ['adapted','original','both'])for(const mode of ['normal','spacing','200-text','dark','contrast']) {
   await render({original:route==='original',compare:route==='both',shell:mode==='dark'?'dark':mode==='contrast'?'contrast':'light',theme:'default'});
   const toggle=page.locator('[data-manage-narration]');await toggle.focus();await page.keyboard.press('Enter');
   await page.locator('[data-close-narration]').waitFor();
   if(mode==='spacing')await page.evaluate(()=>{document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';});});
   if(mode==='200-text')await page.evaluate(()=>{const values=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);values.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   const geometry=await page.evaluate(()=>{const panel=document.querySelector('[data-narration-tools]');return {scrollX:scrollX,width:innerWidth,pageWidth:document.documentElement.scrollWidth,panelWidth:panel.clientWidth,panelScrollWidth:panel.scrollWidth,nested:panel.querySelectorAll('button button,button a,button input,a button').length, overflow:[...document.querySelectorAll('#mount *')].filter(el=>el.clientWidth && el.scrollWidth>el.clientWidth+2).map(el=>({tag:el.tagName,text:el.textContent.slice(0,100),class:el.className,width:el.clientWidth,scrollWidth:el.scrollWidth,overflow:getComputedStyle(el).overflowX}))};});
   check(geometry.pageWidth<=geometry.width+2&&geometry.panelScrollWidth<=geometry.panelWidth+2,route+'/'+mode+' overflow '+JSON.stringify(geometry));check(geometry.nested===0,'nested controls');
   const save=page.locator('[data-review-action="audio"]');await save.focus();await page.keyboard.press('Enter');
   check((await page.locator('[data-tts-prep-status]').textContent()).includes('could not be saved'),'error status missing');
   const close=page.locator('[data-close-narration]');await close.focus();
   const visible=await close.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return b.top>=0&&b.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});
   check(visible,'close focus obscured');await page.keyboard.press('Escape');check(await toggle.evaluate(el=>el===document.activeElement),'focus not returned');
   await page.keyboard.press('Space');await page.locator('[data-close-narration]').tap();check(await toggle.evaluate(el=>el===document.activeElement),'touch close focus not returned');
   results.push({route,mode,...geometry,closeFocusVisible:visible});
  }
  await render({compare:true});await page.locator('[data-review-action="edit"]').focus();await page.keyboard.press('Enter');
  check(await page.locator('textarea').evaluate(el=>el===document.activeElement),'Edit did not focus adapted text');results.push({route:'both-to-edit',editorFocused:true});
  await render({teacher:false});check(await page.locator('[data-manage-narration]').count()===0,'student authoring controls');results.push({route:'student',authoringHidden:true});
  check(errors.length===0,'browser errors: '+errors.join(';'));
  fs.writeFileSync(path.join(out,'narration-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,results,errors,limitations:['No real assistive technology or microphone','200% computed-font simulation; not real browser text zoom','320 CSS px is reflow coverage, not real 400% browser zoom','No live storage, network, device restart or cloud/export verification']},null,2));
  console.log(JSON.stringify({passed:results.length,errors}));
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
