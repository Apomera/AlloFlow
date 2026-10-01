// Disposable browser fixture: production React, Tailwind and reader modules;
// no application server, model calls, or saved user data.
const fs = require('fs'), path = require('path');
const { createRequire } = require('module');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const req = createRequire(path.join(root, 'package.json'));
const web = createRequire(path.join(root, 'desktop/web-app/package.json'));
const { chromium } = req('playwright'), esbuild = req('esbuild');
const out = path.join(root, 'reports/reader-route-a11y');
const fixture = String.raw`
const h=React.createElement, noop=()=>{};
const text='# Plants\n\nSee [the garden guide](https://example.org/guide) for details. Plants grow in sunlight.\n\n## Flowers\n\nBees carry pollen.\n\n## Roots\n\nRoots take up water.';
const original=AlloModules.InstructionalContext.createSupportedReading(text,{id:'original'});
const adapted={id:'adapted',type:'simplified',data:text,config:{language:'English',grade:'5'},sourceSnapshot:original.sourceSnapshot,instructionalText:{form:'adapted',role:'supplemental'}};
function Harness({options}) {
 const [selection,setSelection]=React.useState(options.selectionMenu||null),[custom,setCustom]=React.useState(!!options.isCustomReviseOpen),[instruction,setInstruction]=React.useState('');
 const [definition,setDefinition]=React.useState(options.definitionData||null),[phonics,setPhonics]=React.useState(options.phonicsData||null),[revision,setRevision]=React.useState(options.revisionData||null);
 const [immersive,setImmersive]=React.useState(!!options.immersive),[focus,setFocus]=React.useState(false),[crawl,setCrawl]=React.useState(false),[karaoke,setKaraoke]=React.useState(false);
 const [chunk,setChunk]=React.useState(false),[chunkIdx,setChunkIdx]=React.useState(0),[chunkAuto,setChunkAuto]=React.useState(false),[chunkSpeed,setChunkSpeed]=React.useState(3500),[chunkMood,setChunkMood]=React.useState('calm');
 const [settings,setSettings]=React.useState({textSize:24,lineFocus:false,bgColor:'#fff',fontColor:'#1e293b'}),[ruler,setRuler]=React.useState(0);
 const item=options.original?original:adapted;
 const props={t,generatedContent:{...item,immersiveData:AlloModules.TextPipelineHelpers.parseTaggedContent(item.data)},inputText:'',gradeLevel:'5',leveledTextLanguage:'English',studentInterests:[],history:[original,adapted],
 isTeacherMode:!!options.teacher,isZenMode:!options.teacher,isEditingLeveledText:false,isProcessing:false,isPlaying:false,isCompareMode:!!options.compare,interactionMode:options.mode||'read',textEditorRef:React.useRef(null),
 cursorStyles:{},latestGlossary:[],playbackState:{currentIdx:-1},getSideBySideContent:()=>null,getContentDirection:()=> 'ltr',isRtlLang:()=>false,highlightGlossaryTerms:x=>x,
 splitTextToSentences:x=>AlloModules.PureHelpers.splitTextToSentences(x,{}),formatInteractiveText:(x,c)=>AlloModules.PhaseNHelpers.formatInteractiveText(x,c,false,{highlightGlossaryTerms:x=>x,latestGlossary:[],MathSymbol:({text})=>text}),renderFormattedText:x=>x,
 SourceReferencesPanel:()=>null,ComplexityGauge:()=>null,handleSpeak:noop,handleWordClick:(word,event)=>setDefinition({word,text:'A word explained.',x:event.clientX,y:event.clientY}),handlePhonicsClick:noop,handleQuickAddGlossary:noop,handleTextMouseUp:noop,
 setFocusedParagraphIndex:noop,stopPlayback:noop,setComplexityLevel:noop,setSaveOriginalOnAdjust:noop,setReadingTheme:noop,setInteractionMode:noop,setIsCompareMode:noop,setIsFluencyMode:noop,handleToggleIsTeacherToolbarExpanded:noop,handleToggleIsEditingLeveledText:noop,
 selectionMenu:selection,setSelectionMenu:setSelection,isCustomReviseOpen:custom,setIsCustomReviseOpen:setCustom,customReviseInstruction:instruction,setCustomReviseInstruction:setInstruction,handleSetIsCustomReviseOpenToFalse:()=>setCustom(false),handleReviseSelection:()=>{setSelection(null);setRevision({type:'explain',result:'A useful explanation.',x:160,y:100});},
 definitionData:definition,closeDefinition:()=>setDefinition(null),phonicsData:phonics,closePhonics:()=>setPhonics(null),revisionData:revision,closeRevision:()=>setRevision(null),applyTextRevision:noop,
 immersiveSettings:settings,setImmersiveSettings:setSettings,immersiveRulerY:ruler,setImmersiveRulerY:setRuler,isImmersiveReaderActive:immersive,handleCloseImmersiveReader:()=>setImmersive(false),
 isFocusReaderActive:focus,setIsFocusReaderActive:setFocus,handleCloseSpeedReader:()=>setFocus(false),isCrawlReaderActive:crawl,setIsCrawlReaderActive:setCrawl,isKaraokeOverlayActive:karaoke,setIsKaraokeOverlayActive:setKaraoke,
 isChunkReaderActive:chunk,setIsChunkReaderActive:setChunk,setChunkReaderIdx:setChunkIdx,setChunkReaderAutoPlay:setChunkAuto,setChunkReaderSpeed:setChunkSpeed,setChunkReaderMood:setChunkMood,chunkReaderIdx:chunkIdx,chunkReaderAutoPlay:chunkAuto,chunkReaderSpeed:chunkSpeed,chunkReaderMood:chunkMood,playbackRate:1,setPlaybackRate:noop,lineHeight:1.5,setLineHeight:noop,letterSpacing:0,setLetterSpacing:noop,handleGeneratePOSData:noop,
 ImmersiveToolbar:AlloModules.ImmersiveToolbar,ImmersiveWord:AlloModules.ImmersiveWord,FocusReaderOverlay:AlloModules.FocusReaderOverlay,PerspectiveCrawlOverlay:AlloModules.PerspectiveCrawlOverlay,KaraokeReaderOverlay:AlloModules.KaraokeReaderOverlay,ErrorBoundary:({children})=>children};
 return h('div',{className:'theme-'+(options.shell||'light')+' allo-docsuite'},h(AlloModules.AppStyles.AppStyles),h('div',{'data-reading-theme':options.theme||'default','data-allo-anno-host':'true'},h(AlloModules.SimplifiedView,props)));
}
let serial=0;
window.renderFixture=options=>{if(window.fixtureRoot)fixtureRoot.unmount();document.querySelector('#mount').textContent='';window.fixtureRoot=createRoot(document.querySelector('#mount'));fixtureRoot.render(h(Harness,{key:++serial,options:options||{}}));};
`;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const config={...web('./tailwind.config.js'),content:['view_simplified_source.jsx','immersive_reader_source.jsx'].map(f=>path.join(root,f))};
 const css=(await web('postcss')([web('tailwindcss')(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const strings=JSON.parse(fs.readFileSync(path.join(root,'ui_strings.js'),'utf8'));
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:320,height:640},hasTouch:true,reducedMotion:'reduce'}), errors=[], results=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url()==='http://reader-fixture.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html id="reader-fixture" lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="mount"></main></body></html>'}):route.abort());
 try {
  await page.goto('http://reader-fixture.test/');
  await page.addStyleTag({content:css}); await page.addScriptTag({content:runtime});
  await page.addScriptTag({content:'window.translations='+JSON.stringify(strings)+';window.t=(key,vars={})=>{const value=key.split(".").reduce((o,k)=>o&&o[k],translations);return typeof value==="string"?value.replace(/\\{(\\w+)\\}/g,(m,k)=>vars[k]??m):key;};window.AlloLanguageContext=React.createContext({t});window.AlloModules={};'});
  for(const file of ['app_styles_module.js','instructional_context_module.js','pure_helpers_module.js','phase_n_misc_helpers_module.js','text_pipeline_helpers_module.js','immersive_reader_module.js','view_simplified_module.js']) await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.addScriptTag({content:fixture});
  const render=async options=>{await page.evaluate(options=>renderFixture(options),options);await page.locator('[data-adapted-reader]').first().waitFor();};
  const inspect=async name=>{
   const geometry=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},width:document.documentElement.scrollWidth,dialogs:[...document.querySelectorAll('[role=dialog]')].map(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight}))}));
   results.push({name,...geometry});
   if(geometry.width>geometry.viewport.width+2||geometry.dialogs.some(d=>d.scrollWidth>d.width+2))throw Error(name+' horizontal overflow: '+JSON.stringify(geometry));
  };
  for(const spacing of [false,true]){
   await page.evaluate(spacing=>{document.querySelector('#spacing')?.remove();if(spacing){const style=document.createElement('style');style.id='spacing';style.textContent='#reader-fixture .allo-docsuite [data-adapted-reader] *:not(svg,svg *){line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#reader-fixture .allo-docsuite [data-adapted-reader] p{margin-bottom:2em!important}';document.head.append(style);}},spacing);
   for(const [name,options] of [
    ['definition',{definitionData:{word:'Pneumonoultramicroscopicsilicovolcanoconiosis',text:'A long explanation. '.repeat(40),x:315,y:620}}],
    ['revision',{teacher:true,revisionData:{type:'custom',result:'Revised text. '.repeat(50),x:315,y:620}}],
    ['selection',{teacher:true,mode:'revise',selectionMenu:{text:'Plants grow in sunlight.',x:315,y:620},isCustomReviseOpen:true}],
    ['comparison',{compare:true,mode:'explain'}],
   ]){
    await render(options);await inspect(name+(spacing?'-spacing':''));
    const close=page.locator('[data-selection-close], [role=dialog] button[aria-label="Close"]').first();
    if(await close.count()){await close.focus();const box=await close.boundingBox();if(!box||box.x<0||box.x+box.width>322||box.y<0||box.y+box.height>642)throw Error(name+' close is out of view');}
    if(name==='revision') {
     const save=page.locator('[role=dialog] button').last(); await save.focus();
     const box=await save.boundingBox();
     if(!box||box.x<0||box.x+box.width>322||box.y<0||box.y+box.height>642)throw Error('Revision Replace is out of view');
    }
   }
  }
  await page.evaluate(()=>document.querySelector('#spacing')?.remove());
  await render({original:true,mode:'explain',teacher:true});
  if(await page.locator('[data-original-source] [role=button] a, [data-original-source] [role=button] button').count())throw Error('Nested interactive original');
  await page.locator('[data-exact-explain]').last().focus();await page.keyboard.press('Enter');
  await page.locator('[data-selection-close]').waitFor();await page.keyboard.press('Escape');
  if(!await page.locator('[data-exact-explain]').last().evaluate(el=>el===document.activeElement))throw Error('Explain did not restore focus');
  await render({teacher:true});await page.locator('[data-student-preview-open]').click();
  const duplicateIds=await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return ids.filter((id,i)=>ids.indexOf(id)!==i);});
  if(duplicateIds.length)throw Error('Duplicate IDs: '+duplicateIds);
  await inspect('student-preview');await page.screenshot({path:path.join(out,'student-preview-320.png')});
  await page.keyboard.press('Escape');if(!await page.locator('[data-student-preview-open]').evaluate(el=>el===document.activeElement))throw Error('Preview did not restore focus');
  await render({immersive:true});await page.locator('[data-immersive-toolbar]').waitFor();
  if (await page.locator('[aria-controls="immersive-reader-settings"]').getAttribute("aria-expanded") !== "true") await page.locator('[aria-controls="immersive-reader-settings"]').click();
  await page.locator('[data-help-key="immersive_focus_mode"]').click();
  await page.locator('#focus-reader-dialog-title').waitFor();await page.keyboard.press('Escape');
  await page.locator('#focus-reader-dialog-title').waitFor({state:'detached'});
  if(await page.locator('[data-immersive-toolbar]').count()!==1)throw Error('Nested Escape closed immersive reader');
  if(!await page.locator('[data-help-key="immersive_focus_mode"]').evaluate(el=>el===document.activeElement))throw Error('Nested Escape did not return focus to its opener');
  results.push({name:'nested-escape',passed:true});
  for (const doubled of [false, true]) {
   await page.setViewportSize({width:320,height:256});
   await render({teacher:true}); await page.locator('[data-student-preview-open]').click();
   if (doubled) await page.evaluate(()=>{
    const sizes=[...document.querySelectorAll('[data-student-preview] *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);
    for(const [el,size] of sizes) el.style.setProperty('font-size',size*2+'px','important');
   });
   await inspect('short-preview'+(doubled?'-200-percent-text':''));
   await page.locator('[data-student-preview-close]').focus();
   for(let n=0;n<20;n++) {
    await page.keyboard.press('Tab');
    const state=await page.evaluate(()=>{
     const el=document.activeElement;
     const visible=[...el.getClientRects()].some(r=>{
      if(r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth) return false;
      const x=(Math.max(0,r.left)+Math.min(innerWidth-1,r.right))/2, y=(Math.max(0,r.top)+Math.min(innerHeight-1,r.bottom))/2;
      const hit=document.elementFromPoint(x,y);
      return el===hit||el.contains(hit);
     });
     return {name:el.textContent.trim().slice(0,80),visible};
    });
    if(!state.visible){await page.screenshot({path:path.join(out,'obscured-focus.png')});throw Error('Preview focus obscured ('+doubled+'): '+JSON.stringify(state));}
   }
  }
  if (process.env.READER_EXTENDED_CHECKS) results.push(...await require('./reader_overlay_browser.cjs')(page, render, out));
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({baseline:'fd4044c862ed9b345b340d69cb1411a19c09dafb',browser:browser.version(),results,errors,limits:'Automated Chromium fixtures; not real assistive technology, mobile hardware, or browser zoom acceptance.'},null,2));
  console.log('Passed '+results.length+' reader route checks in Chromium '+browser.version());
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
