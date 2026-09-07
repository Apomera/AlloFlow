// Full reader browser QA using production React, reader/view modules, Tailwind and app styles.
const fs=require('fs'),path=require('path'),http=require('http');
const {createRequire}=require('module');const {chromium}=require('playwright'),esbuild=require('esbuild');
const ROOT=path.resolve(__dirname,'..'),req=createRequire(path.join(ROOT,'desktop/web-app/package.json'));
const OUT=path.join(ROOT,'reports/immersive-reader-review');fs.mkdirSync(OUT,{recursive:true});
(async()=>{
const config={...req('./tailwind.config.js'),content:['immersive_reader_source.jsx','view_simplified_source.jsx'].map(f=>path.join(ROOT,f))};
const css=(await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
const runtime=esbuild.buildSync({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import * as icons from 'lucide-react';window.React=React;window.createRoot=createRoot;window.AlloIcons=icons;",resolveDir:path.join(ROOT,'desktop/web-app')},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).outputFiles[0].text;
const translations=JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8'));
const bootstrap='window.translations='+JSON.stringify(translations)+';'+
"window.t=(key,vars={})=>{const value=key.split('.').reduce((o,k)=>o&&o[k],translations);return typeof value==='string'?value.replace(/\\{(\\w+)\\}/g,(m,k)=>vars[k]??m):key;};window.AlloLanguageContext=React.createContext({t});window.AlloModules={};";
const mount=String.raw`
const noop=()=>{},h=React.createElement;
const passage='## A garden of discoveries\n\nPlants use sunlight to make their own food. Their roots take in water and minerals from the soil. Bees carry pollen between flowers, helping new seeds grow. Every part of a garden has a role to play.\n\nLook closely at a leaf. What patterns can you see? Scientific observation begins with curiosity, careful attention, and a willingness to ask questions.';
const words=AlloModules.TextPipelineHelpers.parseTaggedContent(passage);
const split=text=>String(text||'').match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(s=>s.trim()).filter(Boolean)||[];
function ReaderHarness(){
const [settings,setSettings]=React.useState({textSize:24,bgColor:'#fdfbf7',fontColor:'#1e293b',lineFocus:false});
const [ruler,setRuler]=React.useState(0),[active,setActive]=React.useState(true),[focus,setFocus]=React.useState(false),[crawl,setCrawl]=React.useState(false),[karaoke,setKaraoke]=React.useState(false),[chunk,setChunk]=React.useState(false),[idx,setIdx]=React.useState(0),[auto,setAuto]=React.useState(false),[speed,setSpeed]=React.useState(3500),[mode,setMode]=React.useState('read'),[rate,setRate]=React.useState(1),[line,setLine]=React.useState(1.8),[letter,setLetter]=React.useState(0);
return h(AlloModules.SimplifiedView,{
t,generatedContent:{id:'reader-review',type:'simplified',data:passage,immersiveData:words},inputText:'',gradeLevel:'5',leveledTextLanguage:'English',selectedVoice:'Kore',voiceSpeed:1,isTeacherMode:false,isEditingLeveledText:false,
isImmersiveReaderActive:active,immersiveSettings:settings,setImmersiveSettings:setSettings,immersiveRulerY:ruler,setImmersiveRulerY:setRuler,handleCloseImmersiveReader:()=>setActive(false),
isFocusReaderActive:focus,setIsFocusReaderActive:setFocus,handleCloseSpeedReader:()=>setFocus(false),isCrawlReaderActive:crawl,setIsCrawlReaderActive:setCrawl,isKaraokeOverlayActive:karaoke,setIsKaraokeOverlayActive:setKaraoke,
isChunkReaderActive:chunk,setIsChunkReaderActive:setChunk,chunkReaderIdx:idx,setChunkReaderIdx:setIdx,chunkReaderAutoPlay:auto,setChunkReaderAutoPlay:setAuto,chunkReaderSpeed:speed,setChunkReaderSpeed:setSpeed,chunkReaderMood:'calm',setChunkReaderMood:noop,chunkReaderReadAlong:false,
playbackRate:rate,setPlaybackRate:setRate,lineHeight:line,setLineHeight:setLine,letterSpacing:letter,setLetterSpacing:setLetter,
isCompareMode:false,isSideBySide:false,isZenMode:true,isProcessing:false,isPlaying:false,interactionMode:mode,setInteractionMode:setMode,history:[],textEditorRef:React.createRef(),splitTextToSentences:split,getSideBySideContent:()=>null,
handleFormatText:noop,handleSimplifiedTextChange:noop,callTTS:noop,handleSpeak:(text)=>window.spoken=text,handleGeneratePOSData:noop,isLineFocusMode:false,focusedParagraphIndex:null,setFocusedParagraphIndex:noop,cursorStyles:{read:'',revise:''},getContentDirection:()=> 'ltr',isRtlLang:()=>false,
renderFormattedText:value=>value,formatInteractiveText:value=>value,SourceReferencesPanel:()=>null,playbackState:{currentIdx:-1},handleTextMouseUp:noop,highlightGlossaryTerms:value=>value,latestGlossary:[],
ImmersiveToolbar:AlloModules.ImmersiveToolbar,ImmersiveWord:AlloModules.ImmersiveWord,FocusReaderOverlay:AlloModules.FocusReaderOverlay,PerspectiveCrawlOverlay:AlloModules.PerspectiveCrawlOverlay,KaraokeReaderOverlay:AlloModules.KaraokeReaderOverlay,ErrorBoundary:({children})=>children
});
}
window.renderReader=(name='main',overrides={})=>{if(window.readerRoot)readerRoot.unmount();window.readerRoot=createRoot(document.querySelector('#reader'));readerRoot.render(h(React.Fragment,null,h(AlloModules.AppStyles.AppStyles),name==='main'?h(ReaderHarness):h(AlloModules[name],{isOpen:true,text:passage.replace(/^## /,''),onClose:noop,captureOn:false,...overrides})));};
`;
const assets={'/pipeline.js':fs.readFileSync(path.join(ROOT,'text_pipeline_helpers_module.js'),'utf8'),'/runtime.js':runtime,'/bootstrap.js':bootstrap,'/mount.js':mount,'/styles.css':css,'/styles.js':fs.readFileSync(path.join(ROOT,'app_styles_module.js'),'utf8'),'/reader.js':fs.readFileSync(path.join(ROOT,'immersive_reader_module.js'),'utf8'),'/view.js':fs.readFileSync(path.join(ROOT,'view_simplified_module.js'),'utf8')};
const server=http.createServer((request,response)=>{if(assets[request.url]){response.setHeader('Content-Type',request.url.endsWith('.css')?'text/css':'text/javascript');response.end(assets[request.url]);return;}response.setHeader('Content-Type','text/html');response.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Immersive Reader review</title><link rel="stylesheet" href="/styles.css"></head><body class="theme-light"><main class="allo-docsuite" id="reader"></main><script src="/runtime.js"></script><script src="/bootstrap.js"></script><script src="/styles.js"></script><script src="/reader.js"></script><script src="/view.js"></script><script src="/pipeline.js"></script><script src="/mount.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
browser=await chromium.launch({headless:true});const page=await browser.newPage({reducedMotion:'reduce'}),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:'+server.address().port);
async function snap(name,width){if(name==='PerspectiveCrawlOverlay')await page.screenshot({path:path.join(OUT,name+'-'+width+'.jpg'),type:'jpeg',quality:65});await page.screenshot({path:path.join(OUT,name+'-'+width+'.png')});const metrics=await page.evaluate(()=>({width:innerWidth,bodyWidth:document.documentElement.scrollWidth,dialogs:[...document.querySelectorAll('[role=dialog]')].map(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth,height:el.clientHeight,scrollHeight:el.scrollHeight}))}));results.push({name,metrics});if(metrics.bodyWidth>width+2||metrics.dialogs.some(d=>d.scrollWidth>d.width+2))throw Error(name+' horizontal overflow at '+width+': '+JSON.stringify(metrics));}
for(const width of [1280,390,320]){
await page.setViewportSize({width,height:width===1280?900:844});
await page.evaluate(()=>renderReader());await page.locator('[data-immersive-toolbar]').waitFor();await snap('Reader-settings',width);
const wide=page.locator('[data-help-key=immersive_wide_text]');await wide.focus();await page.keyboard.press('Space');if(!await wide.evaluate(el=>el===document.activeElement&&el.getAttribute('aria-pressed')==='true'))throw Error('Toolbar lost focus');
await page.locator('[data-help-key=immersive_line_focus]').click();await page.locator('[aria-controls=immersive-reader-settings]').click();await page.locator('[data-immersive-passage]').focus();await page.keyboard.press('ArrowDown');await snap('Reader-line-focus',width);
const bounds=await page.evaluate(()=>({toolbar:document.querySelector('[data-immersive-toolbar]').getBoundingClientRect().bottom,shade:[...document.querySelectorAll('[style]')].find(el=>el.className.includes?.('bg-black/80'))?.getBoundingClientRect().top}));if(bounds.shade<bounds.toolbar-1)throw Error('Ruler shades toolbar');
await page.locator('[data-immersive-passage] [role=button]').first().focus();await page.keyboard.press('Enter');if(!await page.evaluate(()=>!!window.spoken))throw Error('Word keyboard action did not speak');
await page.locator('[aria-controls=immersive-reader-settings]').click();await page.locator('[data-help-key=immersive_focus_mode]').click();await page.locator('#focus-reader-dialog-title').waitFor();await page.keyboard.press('Escape');await page.locator('#focus-reader-dialog-title').waitFor({state:'detached'});if(await page.locator('[data-immersive-toolbar]').count()!==1)throw Error('Nested Escape closed parent');
for(const name of ['FocusReaderOverlay','KaraokeReaderOverlay','PerspectiveCrawlOverlay']){
await page.evaluate(name=>renderReader(name),name);await page.locator('[role=dialog]').waitFor();await snap(name,width);
}
await page.evaluate(()=>renderReader('FocusReaderOverlay',{text:'Pneumonoultramicroscopicsilicovolcanoconiosis'}));await page.locator('#focus-reader-dialog-title').waitFor();await snap('Focus-long-word',width);
const clipped=await page.locator('[data-focus-word]').evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()].some(rect=>rect.left<0||rect.right>innerWidth);});if(clipped)throw Error('Long Focus word is clipped at '+width);
}
await page.setViewportSize({width:390,height:844});await page.evaluate(()=>renderReader());await page.locator('[aria-label="Color preset"]').selectOption('high-contrast');await page.locator('[aria-controls=immersive-reader-settings]').click();await snap('Reader-high-contrast',390);
const orphan=await page.locator('[data-immersive-passage]').evaluate(el=>[...el.querySelectorAll('span')].filter(span=>span.textContent===',').some(span=>span.getBoundingClientRect().left<25));if(orphan)throw Error('Punctuation separated from its word');
if(errors.length)throw Error(errors.join('\n'));
fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify({results,errors},null,2));console.log('Passed '+results.length+' browser layouts plus toolbar focus, word activation, ruler bounds and nested Escape.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});

