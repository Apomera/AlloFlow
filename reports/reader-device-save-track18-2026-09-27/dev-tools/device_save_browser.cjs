// Isolated fixture: real React/components/CSS; mocked host readback and writes.
// No app server, microphone, provider, account or saved application state.
const fs=require('fs'),path=require('path'),{createRequire}=require('module');
const root=path.resolve(__dirname,'..'),req=createRequire(path.join(root,'package.json')),web=createRequire(path.join(root,'desktop/web-app/package.json'));
const {chromium}=req('playwright'),esbuild=req('esbuild');
const fixture=String.raw`
const h=React.createElement,noop=()=>{},split=text=>String(text||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(x=>x.trim())||[];
window.savedCount=0;window.readCount=0;window.writeCount=0;window.generateCount=0;
window.__alloGetReadAloudReadiness=async texts=>{readCount++;return {resourceId:'one',scope:'device-audio',total:texts.length,ready:texts.length,durableReady:Math.min(savedCount,texts.length),verifiedAt:'2026-09-27T00:00:00Z'};};
window.__alloRetryReadAloudPersistence=async()=>{writeCount++;savedCount=2;return {status:'saved',verified:true};};
window.__alloPrepareReadAloud=async()=>{generateCount++;return {ok:true,remaining:0};};
const content='Plants need light. Roots take in water.';
function Harness({route}) {
 const [open,setOpen]=React.useState(false),[editing,setEditing]=React.useState(false);
 return h('div',null,h('button',{id:'opener',className:'min-h-11 border p-2',onClick:()=>setOpen(true)},'Open karaoke reader'),route==='faq'
  ?h(AlloModules.FaqView,{t,generatedContent:{id:'one',type:'faq',data:[{question:'Plants need light.',answer:'Roots take in water.'}]},isTeacherMode:true,isEditingFaq:editing,isPlaying:false,voiceSpeed:1,selectedVoice:'Kore',effectiveLanguage:'English',playbackState:{currentIdx:-1},audioRef:{current:null},playbackSessionRef:{current:null},setVoiceSpeed:noop,setIsPlaying:noop,setPlayingContentId:noop,handleToggleIsEditingFaq:()=>setEditing(x=>!x),handleFaqChange:noop,handleSpeak:noop,getRows:()=>2,splitTextToSentences:split,formatInteractiveText:x=>x})
  :h(AlloModules.KaraokeReaderOverlay,{text:content,sentenceList:split(content),resourceId:'one',audioSaveContext:'profile-one',audioProfile:{voice:'Kore',speed:1},language:'English',isOpen:open,isTeacher:true,captureOn:false,onClose:()=>setOpen(false),getAudioUrl:async()=>null}));
}
window.renderFixture=route=>{window.fixtureRoot?.unmount();savedCount=0;readCount=0;writeCount=0;generateCount=0;window.fixtureRoot=createRoot(document.querySelector('#mount'));fixtureRoot.render(h(Harness,{route}));};
`;
(async()=>{
const css=(await web('postcss')([web('tailwindcss')({...web('./tailwind.config.js'),content:['view_faq_source.jsx','immersive_reader_source.jsx','resource_read_aloud_module.js'].map(file=>path.join(root,file))})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;",resolveDir:path.join(root,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:320,height:640},hasTouch:true,reducedMotion:'reduce'}),results=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
const check=(ok,label)=>{if(!ok)throw Error(label);};
try{
await page.route('**/*',route=>route.request().url()==='http://device-save-fixture.test/'?route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="mount"></main></body></html>'}):route.abort());
await page.goto('http://device-save-fixture.test/');await page.addStyleTag({content:css});await page.addScriptTag({content:runtime});
const strings=JSON.parse(fs.readFileSync(path.join(root,'ui_strings.js'),'utf8'));
await page.addScriptTag({content:'window.translations='+JSON.stringify(strings)+';window.t=key=>{const value=key.split(".").reduce((o,k)=>o&&o[k],translations);return typeof value==="string"?value:key;};window.AlloLanguageContext=React.createContext({t});window.AlloModules={};'});
for(const file of ['resource_read_aloud_module.js','view_faq_module.js','immersive_reader_module.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
await page.addScriptTag({content:fixture});
const counts=()=>page.locator('[data-device-audio-count]'),retry=()=>page.locator('[data-device-audio-retry]'),verify=()=>page.locator('[data-device-audio-check]');
const visibleFocus=locator=>locator.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return document.activeElement===el&&el.matches(':focus-visible')&&b.top>=0&&b.bottom<=innerHeight+1&&(hit===el||el.contains(hit));});
async function render(route){await page.evaluate(route=>renderFixture(route),route);if(route==='overlay'){await page.locator('#opener').focus();await page.keyboard.press('Enter');}await counts().waitFor();await page.waitForFunction(()=>document.querySelector('[data-device-audio-count]')?.textContent.includes('0/2 saved'));}
for(const route of ['faq','overlay'])for(const mode of ['normal','spacing','200-text']){
 console.log('Checking '+route+' / '+mode);await render(route);
 if(mode==='spacing')await page.evaluate(()=>document.querySelectorAll('#mount *').forEach(el=>{el.style.lineHeight='1.5';el.style.letterSpacing='.12em';el.style.wordSpacing='.16em';if(el.tagName==='P')el.style.marginBottom='2em';}));
 if(mode==='200-text')await page.evaluate(()=>{const sizes=[...document.querySelectorAll('#mount *')].map(el=>[el,parseFloat(getComputedStyle(el).fontSize)]);sizes.forEach(([el,size])=>el.style.fontSize=(size*2)+'px');});
 await verify().focus();await page.keyboard.press('Tab');check(await visibleFocus(retry()),route+' '+mode+' retry focus hidden');
 await page.keyboard.press('Space');await page.waitForFunction(()=>document.querySelector('[data-device-audio-count]')?.textContent.includes('2/2 saved'));
 check(await retry().evaluate(el=>el===document.activeElement),'retry focus lost after result');check(await page.evaluate(()=>writeCount===1&&generateCount===0),'retry generated speech or duplicated save');
 check(await retry().evaluate(el=>el.getBoundingClientRect().height>=44&&el.getBoundingClientRect().width>=44),'retry target smaller than intended');
 check(await page.evaluate(()=>document.querySelectorAll('button button,button input,button a,[role=status] button').length===0),'nested interactive controls or status contains button');
 const geometry=await page.evaluate(()=>{const dialog=document.querySelector('[role=dialog]');return {width:innerWidth,documentWidth:document.documentElement.scrollWidth,dialogWidth:dialog?.scrollWidth,dialogClientWidth:dialog?.clientWidth};});
 check(geometry.documentWidth<=geometry.width+2,route+' '+mode+' page overflow: '+JSON.stringify(geometry));if(route==='overlay')check(geometry.dialogWidth<=geometry.dialogClientWidth+2,'dialog overflows');
 if(route==='overlay'){
  const close=page.locator('[role=dialog] button').first();await close.focus();check(await visibleFocus(close),'Close focus hidden');
  await page.keyboard.press('Shift+Tab');check(await page.locator('[role=dialog]').evaluate(el=>el.contains(document.activeElement)),'Tab escaped modal');
  await page.keyboard.press('Escape');await page.locator('[role=dialog]').waitFor({state:'detached'});check(await page.locator('#opener').evaluate(el=>el===document.activeElement),'Escape did not return focus');
 }
 results.push({route,mode,...geometry,focusPreserved:true,keyboardSave:true,noGeneration:true});
}
console.log('Checking overlay themes and touch');await render('overlay');
for(const theme of ['warm','dark','sepia']){
 await page.locator('select').filter({has:page.locator('option[value="sepia"]')}).selectOption(theme);
 await verify().tap();await page.waitForFunction(()=>!document.querySelector('[data-device-audio-count]')?.textContent.includes('Checking'));
 const colors=await counts().evaluate(el=>({ink:getComputedStyle(el).color,background:getComputedStyle(el.closest('[role=dialog]')).backgroundColor}));
 const ratio=(({ink,background})=>{const lum=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};const a=lum(ink),b=lum(background);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);})(colors);
 check(ratio>=4.5,'status contrast below AA in '+theme);results.push({route:'overlay',theme,contrast:ratio,touchCheck:true});
}
check(errors.length===0,'page errors: '+errors.join(';'));fs.writeFileSync(path.join(root,'validation/device-save-browser.json'),JSON.stringify({browser:'Chromium',viewport:{width:320,height:640},simulatedTouch:true,reducedMotion:true,results,errors,limitations:['Storage/TTS mocked; no real saved-state or device durability proof','DOM live regions are not actual screen-reader announcements','Doubled computed fonts are not real 200% text-only resize or 400% browser zoom','No hardware touch, Firefox/WebKit or deployed-shell integration tested']},null,2));
await page.screenshot({path:path.join(root,'validation/device-save-overlay.png'),fullPage:true});console.log(JSON.stringify({passed:results.length,errors}));
}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
