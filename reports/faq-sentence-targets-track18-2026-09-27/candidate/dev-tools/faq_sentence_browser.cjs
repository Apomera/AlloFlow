// Uses real React, FAQ, audio store, bridge, sanitizer and host enumerator.
// Synthesis returns fixture bytes and persistence is memory-only. No app server.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(__dirname,'..'),req=createRequire(path.join(root,'package.json')),web=createRequire(path.join(root,'desktop/web-app/package.json'));
const {chromium}=req('playwright'),esbuild=req('esbuild');
const host=fs.readFileSync(path.join(root,'AlloFlowANTI.txt'),'utf8');
const enumerateSource=host.slice(host.indexOf('  const _enumerateReadAloudResourceSegments ='),host.indexOf('  const _encodeReadAloudBridgeAudio ='));
const audio=Buffer.alloc(256,70);audio.write('RIFF');audio.writeUInt32LE(248,4);audio.write('WAVE',8);audio.write('fmt ',12);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(8000,24);audio.writeUInt32LE(8000,28);audio.writeUInt16LE(1,32);audio.writeUInt16LE(8,34);audio.write('data',36);audio.writeUInt32LE(212,40);
const fixture=String.raw`
const h=React.createElement,noop=()=>{},KS=AlloModules.KaraokeAudioStore;
const resource={id:'faq-browser',type:'faq',data:[{question:'Echo.',answer:'Echo.'},{question:'Echo.',answer:'A different answer.'}]};
window.speed=1;window.calls=[];window.pending=null;window.failNext=false;
const profile=()=>({voice:'Kore',language:'English',speed,synthesisRate:speed,voiceResolverVersion:2,provider:'gemini'});
const enumerate=resource=>hostEnumerator(window,text=>KS.splitSentences(text),'English','English')(resource);
window.store=KS.createStore();KS.current=store;
const bridge=AlloModules.createReadAloudLegacyBridge({getResource:()=>resource,getStore:()=>store,getProfile:profile,enumerateResourceSegments:enumerate,normalize:AlloModules.PhaseKHelpers.toSpokenText,
 synthesize:request=>{calls.push({segmentId:request.segment.segmentId,profile:request.profile,signal:request.signal});if(failNext){failNext=false;return Promise.reject(Error('Fixture provider unavailable'));}return new Promise(resolve=>pending=()=>resolve({b64:fixtureAudio,mime:'audio/wav'}));},persist:async()=>({status:'attached'})});
window.__alloInspectReadAloudAudio=(...args)=>bridge.inspect(...args);window.__alloRegenerateSentenceAudio=(...args)=>bridge.regenerate(...args);
window.__alloPrepareReadAloud=(...args)=>bridge.prepare(...args);
window.__alloGetReadAloudReadiness=async(texts,lane,options)=>({resourceId:resource.id,...bridge.readiness(texts,lane,options)});
window.__alloRetryReadAloudPersistence=async()=>true;
function Harness(){const[editing,setEditing]=React.useState(false),[rate,setRate]=React.useState(1);window.updateSpeed=setRate;window.speed=rate;
return h(AlloModules.FaqView,{t,generatedContent:resource,isTeacherMode:true,isEditingFaq:editing,isPlaying:false,voiceSpeed:rate,selectedVoice:'Kore',effectiveLanguage:'English',leveledTextLanguage:'English',playbackState:{currentIdx:-1},audioRef:{current:null},playbackSessionRef:{current:null},setVoiceSpeed:setRate,setIsPlaying:noop,setPlayingContentId:noop,handleToggleIsEditingFaq:()=>setEditing(x=>!x),handleFaqChange:noop,handleSpeak:noop,getRows:()=>2,splitTextToSentences:text=>KS.splitSentences(text),formatInteractiveText:text=>text});}
window.renderFixture=()=>{window.fixtureRoot?.unmount();store.clear();KS.current=store;calls=[];pending=null;failNext=false;speed=1;window.fixtureRoot=createRoot(document.querySelector('#mount'));fixtureRoot.render(h(Harness));};
`;
(async()=>{
 const css=(await web('postcss')([web('tailwindcss')({...web('./tailwind.config.js'),content:['view_faq_source.jsx','resource_read_aloud_module.js'].map(file=>path.join(root,file))})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:320,height:640},hasTouch:true,reducedMotion:'reduce'}),results=[],errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
 const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
 try{
  await page.route('**/*',route=>route.request().url()==='http://faq-targets-fixture.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="mount"></main></body></html>'}):route.abort());
  await page.goto('http://faq-targets-fixture.test/');await page.addStyleTag({content:css});await page.addScriptTag({content:runtime});
  const strings=JSON.parse(fs.readFileSync(path.join(root,'ui_strings.js'),'utf8'));
  await page.addScriptTag({content:'window.translations='+JSON.stringify(strings)+';window.t=key=>{const value=key.split(".").reduce((o,k)=>o&&o[k],translations);return typeof value==="string"?value:key;};window.AlloModules={};window.hostEnumerator=new Function("window","splitTextToSentences","leveledTextLanguage","currentUiLanguage",'+JSON.stringify(enumerateSource+';return _enumerateReadAloudResourceSegments;')+');window.fixtureAudio='+JSON.stringify(audio.toString('base64'))+';'});
  for(const file of ['karaoke_audio_store_module.js','phase_k_helpers_module.js','read_aloud_audio_service_source.jsx','resource_read_aloud_module.js','view_faq_module.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.addScriptTag({content:fixture});
  const edit=()=>page.locator('[data-help-key=faq_edit_toggle]'),target=()=>page.locator('[data-faq-audio-entry="faq/1/question/0"]');
  const visibleFocus=locator=>locator.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return el===document.activeElement&&el.matches(':focus-visible')&&b.top>=0&&b.bottom<=innerHeight+1&&b.left>=0&&b.right<=innerWidth+1&&(hit===el||el.contains(hit));});
  async function start(){await page.evaluate(()=>renderFixture());await edit().waitFor();await edit().focus();await page.keyboard.press('Enter');await target().waitFor();}
  for(const mode of ['wide','narrow','spacing','200-text']){
   console.log('Checking '+mode);await page.setViewportSize({width:mode==='wide'?1280:320,height:640});await start();
   if(mode==='spacing')await page.evaluate(()=>document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';}));
   if(mode==='200-text')await page.evaluate(()=>{const sizes=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);sizes.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
   const geometry=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert(geometry.scrollWidth<=geometry.viewport+2,'Edit layout overflows '+mode+': '+JSON.stringify(geometry));
   const compressed=await page.locator('[data-faq-view] p, [data-faq-view] button, [data-faq-view] textarea, [data-faq-audio-group] div, [data-faq-audio-group] span').evaluateAll(nodes=>nodes.filter(el=>{const css=getComputedStyle(el);return el.getClientRects().length&&parseFloat(css.lineHeight)<parseFloat(css.fontSize)*1.3;}).map(el=>({tag:el.tagName,text:el.textContent.slice(0,70),font:getComputedStyle(el).fontSize,lineHeight:getComputedStyle(el).lineHeight})));
   assert(!compressed.length,'Text line boxes overlap under '+mode+': '+JSON.stringify(compressed));
   const names=await page.locator('[data-faq-audio-entry]').evaluateAll(nodes=>nodes.map(el=>el.getAttribute('aria-label')));assert(new Set(names).size===4,'repeated sentence labels ambiguous');
   await target().focus();assert(await visibleFocus(target()),'target focus hidden');await page.keyboard.press('Space');await page.waitForFunction(()=>calls.length===1);assert(await target().getAttribute('aria-busy')==='true','busy feedback missing');assert(await visibleFocus(target()),'focus lost while busy');
   await page.keyboard.press('Enter');assert(await page.evaluate(()=>calls.length===1),'duplicate keyboard generation');
   await page.evaluate(()=>pending());await page.waitForFunction(()=>document.querySelector('[data-faq-audio-entry="faq/1/question/0"]')?.getAttribute('data-audio-status')==='ready');
   assert(await visibleFocus(target()),'focus lost on completion');assert(await page.evaluate(()=>Object.values(store.serialize().entries).length===1&&Object.values(store.serialize().entries)[0].identity.segmentId==='faq/1/question/0'),'generated into wrong repeated sentence');
   assert((await page.locator('[data-device-audio-count]').textContent()).includes('Device save not verified'),'generation implied device durability');
   assert(await target().evaluate(el=>{const b=el.getBoundingClientRect();return b.width>=44&&b.height>=44;}),'new action too small');
   await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement?.tagName==='TEXTAREA'),'next field is not reachable');
   if(mode==='narrow'||mode==='200-text')await page.screenshot({path:path.join(root,'validation/faq-editor-'+mode+'.png'),fullPage:true});
   await edit().focus();assert(await visibleFocus(edit()),'Done editing hidden');await page.keyboard.press('Enter');await target().waitFor({state:'detached'});assert(await edit().evaluate(el=>el===document.activeElement),'Done editing lost focus');
   assert(await page.evaluate(()=>document.querySelectorAll('button button,button input,button a,[role=status] button').length===0),'nested interactive controls');results.push({mode,...geometry,exactSentence:true,keyboard:true,focusPreserved:true});
  }
  console.log('Checking settings change and touch');await start();await target().tap();await page.evaluate(()=>pending());await page.waitForFunction(()=>document.querySelector('[data-faq-audio-entry="faq/1/question/0"]')?.getAttribute('data-audio-status')==='ready');
  await page.evaluate(()=>updateSpeed(1.4));await page.waitForFunction(()=>document.querySelector('[data-faq-audio-entry="faq/1/question/0"]')?.getAttribute('data-audio-status')==='stale');await target().tap();assert(await page.evaluate(()=>calls.at(-1).profile.synthesisRate===1.4&&calls.at(-1).segmentId==='faq/1/question/0'),'touch/settings targeted wrong audio');await page.evaluate(()=>pending());results.push({mode:'touch-and-speed',exactSentence:true,profileForwarded:true});
  console.log('Checking failure focus');await start();await page.evaluate(()=>failNext=true);await target().focus();await page.keyboard.press('Enter');await page.getByRole('status').filter({hasText:'Sentence audio could not be generated'}).waitFor();assert(await visibleFocus(target()),'failure lost focus');await page.keyboard.press('Space');await page.evaluate(()=>pending());results.push({mode:'failure-retry',focusPreserved:true});
  console.log('Checking leave-edit cancellation');await start();await target().focus();await page.keyboard.press('Enter');await edit().focus();await page.keyboard.press('Enter');assert(await page.evaluate(()=>calls[0].signal.aborted),'Done editing did not abort generation');await page.evaluate(()=>pending());assert(await page.evaluate(()=>!Object.values(store.serialize()?.entries||{}).length),'late result changed audio');results.push({mode:'leave-edit',aborted:true,noLateStoreWrite:true});
  assert(!errors.length,errors.join(';'));await page.screenshot({path:path.join(root,'validation/faq-targets-browser.png'),fullPage:true});
  fs.writeFileSync(path.join(root,'validation/faq-targets-browser.json'),JSON.stringify({browser:'Chromium',results,errors,simulatedTouch:true,reducedMotion:true,limitations:['Fixture audio and memory-only persistence; no provider, microphone, saved application state or real device durability tested','DOM focus/live-region assertions are not screen-reader verification','Doubled computed fonts are not actual 200% text resizing or 400% browser zoom','No real mobile hardware, Firefox/WebKit, sticky/nested assembled-shell verification']},null,2));console.log(JSON.stringify({passed:results.length,errors}));
 }catch(error){await page.screenshot({path:path.join(root,'validation/faq-targets-browser-failure.png'),fullPage:true});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
