
const fs=require('fs'),path=require('path'),http=require('http');
const {createRequire}=require('module'),{chromium}=require('playwright'),esbuild=require('esbuild');
const ROOT=path.resolve(__dirname,'..'),req=createRequire(path.join(ROOT,'desktop/web-app/package.json'));
const OUT=path.join(ROOT,'reports/main24-foundations-20260908');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const config={...req('./tailwind.config.js'),content:['view_faq_source.jsx','view_word_sounds_preview_source.jsx','view_simplified_source.jsx'].map(f=>path.join(ROOT,f))};
 const css=(await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined})).css;
 const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;",resolveDir:path.join(ROOT,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
 const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8'));
 const tests=fs.readFileSync(path.join(ROOT,'tests/main24_foundations_refinements_20260908.test.js'),'utf8');
 const readingFunction=tests.slice(tests.indexOf('function readingProps(){'),tests.indexOf("describe('Adapted Reading teacher toolbar disclosure'"));
 const bootstrap="window.catalog="+JSON.stringify(catalog)+";window.t=(key)=>{const v=key.split('.').reduce((o,k)=>o&&o[k],catalog);return typeof v==='string'?v:key;};window.AlloModules={};const noop=()=>{};const split=text=>String(text||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];"+readingFunction+"\nwindow.renderView=(name,options={})=>{\n if(window.qaRoot)qaRoot.unmount();window.qaRoot=createRoot(document.querySelector('#view'));\n let props={t,generatedContent:{id:'faq-demo',type:'faq',data:[{question:'Why does water evaporate?',answer:'Heat gives liquid water enough energy to become water vapor.'},{question:'Where does rain come from?',answer:'Small water droplets in clouds combine and fall to the ground.'}]},isTeacherMode:true,isEditingFaq:false,isPlaying:false,voiceSpeed:1,leveledTextLanguage:'English',selectedVoice:'Kore',effectiveLanguage:'English',playbackState:{currentIdx:-1},getRows:()=>2,splitTextToSentences:split,formatInteractiveText:s=>s,handleSpeak:noop,handleToggleIsEditingFaq:noop};\n if(name==='WordSoundsPreviewView')props={t,generatedContent:{id:'ws-demo',title:'Word Sounds: Blending practice',data:[{word:'rain'},{word:'cloud'}],configSummary:'Blend sounds to read words about weather.'},wsActivitySequence:['blending'],isTeacherMode:true,wordSoundsAudioCoverage:{ready:3,total:4,complete:false,missingLabels:['cloud: word audio']},setWordSoundsActivity:noop,setIsWordSoundsMode:noop,setWordSoundsAutoReview:noop,prepareWordSoundsSession:noop};\n if(name==='SimplifiedView')props={...readingProps(),t};\n qaRoot.render(React.createElement(React.Fragment,null,React.createElement(AlloModules.AppStyles.AppStyles),React.createElement(AlloModules[name],{...props,...options})));\n};";
 const assets={'/runtime.js':runtime,'/bootstrap.js':bootstrap,'/styles.css':css,'/appstyles.js':fs.readFileSync(path.join(ROOT,'app_styles_module.js'),'utf8')};
 for(const name of ['faq','word_sounds_preview','simplified'])assets['/'+name+'.js']=fs.readFileSync(path.join(ROOT,'view_'+name+'_module.js'),'utf8');
 const server=http.createServer((request,response)=>{
  if(assets[request.url]){response.setHeader('Content-Type',request.url.endsWith('.css')?'text/css':'text/javascript');return response.end(assets[request.url]);}
  response.setHeader('Content-Type','text/html');response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Foundation resources QA</title><link rel="stylesheet" href="/styles.css"></head><body class="theme-light"><main class="allo-docsuite p-4" id="view"></main><script src="/runtime.js"></script><script src="/bootstrap.js"></script><script src="/appstyles.js"></script><script src="/faq.js"></script><script src="/word_sounds_preview.js"></script><script src="/simplified.js"></script></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;try{
  browser=await chromium.launch({headless:true});const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],results=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});
   for(const name of ['FaqView','WordSoundsPreviewView','SimplifiedView']){
    await page.evaluate(name=>renderView(name),name);await page.locator('#view button').first().waitFor();
    if(name==='FaqView')await page.locator('button[aria-expanded]').first().click();
    if(name==='SimplifiedView'){
     const toggle=page.locator('[data-help-key=simplified_teacher_tools]');
     await toggle.focus();await page.keyboard.press('Tab');
     if(await page.evaluate(()=>!!document.activeElement.closest('#simplified-teacher-tools-panel')))throw Error('Closed teacher tools received focus');
     await page.evaluate(()=>renderView('SimplifiedView',{isTeacherToolbarExpanded:true}));await toggle.waitFor();await toggle.focus();await page.keyboard.press('Tab');
     if(!await page.evaluate(()=>!!document.activeElement.closest('#simplified-teacher-tools-panel')))throw Error('Expanded teacher tools did not receive focus');
    }
    const bodyWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
    if(bodyWidth>width+2){console.log(await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(el=>el.getBoundingClientRect().right>innerWidth).map(el=>({tag:el.tagName,cls:el.className,text:el.textContent.slice(0,65),right:el.getBoundingClientRect().right})).slice(-15)));await page.screenshot({path:path.join(OUT,'overflow.png'),fullPage:true});throw Error(name+' overflows at '+width+': '+bodyWidth);}
    results.push({name,width,bodyWidth});await page.screenshot({path:path.join(OUT,name+'-'+width+'.png'),fullPage:true});
   }
  }
  if(errors.length)throw Error(errors.join('\n'));
  fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({results,errors},null,2));console.log('Passed '+results.length+' resource/viewport checks and actual keyboard toolbar navigation.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});

