const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const dir=__dirname,root=path.resolve(dir,'../..');
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 try {for(const viewport of [{width:1280,height:800},{width:390,height:700}]){
   const context=await browser.newContext({viewport});let network=0;await context.route('**/*',route=>{network++;return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><title>Isolated reader fixture</title></head><body><button id="outside">Outside</button><main id="mount"></main></body></html>'});});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto('http://reader-preview.test/');
   await page.addStyleTag({content:'[data-student-preview]{position:fixed;inset:0;z-index:150;overflow-y:auto;background:white;padding:8px} [data-student-preview] button,[data-student-preview] select{min-height:44px} [hidden]{display:none!important} [data-adapted-reader]{max-width:100%;overflow-wrap:anywhere}'});
   for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','pure_helpers_module.js'])await page.addScriptTag({path:path.join(root,file)});
   await page.addScriptTag({path:path.join(root,'instructional_context_module.js')});
   await page.evaluate(()=>{window.AlloIcons=new Proxy({},{get:()=>()=>null});});
   await page.addScriptTag({path:path.join(root,'view_simplified_module.js')});
   await page.evaluate(()=>{
     const React=window.React,api=window.AlloModules.InstructionalContext,pure=window.AlloModules.PureHelpers;
     window.calls={media:0,network:0,hostEvents:0,help:0,writes:[],lifecycle:[]};
     const count=()=>{window.calls.media++;};window.Audio=count;window.MediaRecorder=count;window.fetch=()=>{window.calls.network++;return Promise.reject(Error('Unexpected fetch'));};Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:count},configurable:true});
     const store=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){window.calls.writes.push(key);return store.call(this,key,value);};
     window.addEventListener('alloflow:reading-preview',event=>calls.lifecycle.push(event.detail));
     const original=api.createSupportedReading('The heron waded through the marsh.',{id:'original',sourceFamilyId:'heron'});
     const data='## Birds\n\nThe heron walked slowly.\n\n## Food\n\nIt waited for a fish.\n\n## Nests\n\nHerons build nests in trees.';
     const reading={id:'reading',type:'simplified',data,sourceSnapshot:original.sourceSnapshot,sourceFamilyId:'heron',instructionalText:{form:'adapted',role:'supplemental'},config:{language:'English'}};
     const start=data.indexOf('heron'),help=api.upsertAdaptedReadingSupport(reading,null,{id:'heron',start,end:start+5,quote:'heron',text:'A water bird.'});reading.adaptedReadingSupports=api.setAdaptedReadingSupportsShown(reading,help,true);
     const noop=()=>{};window.previewRoot=ReactDOM.createRoot(document.getElementById('mount'));
     previewRoot.render(React.createElement(AlloModules.SimplifiedView,{generatedContent:reading,history:[],t:k=>k,isTeacherMode:true,isZenMode:false,interactionMode:'read',readingTheme:'default',readingLearnerKey:'teacher|browser-fixture',gradeLevel:'5',leveledTextLanguage:'English',studentInterests:[],latestGlossary:[],playbackState:{currentIdx:-1},cursorStyles:{},setInteractionMode:noop,setIsCompareMode:noop,setIsFluencyMode:noop,setSelectionMenu:noop,setIsCustomReviseOpen:noop,setFocusedParagraphIndex:noop,setReadingTheme:noop,setComplexityLevel:noop,setSaveOriginalOnAdjust:noop,handleFormatText:noop,handleTextMouseUp:noop,handleSimplifiedTextChange:noop,handleToggleIsEditingLeveledText:noop,textEditorRef:React.createRef(),handleSpeak:count,stopPlayback:count,callTTS:count,handleWordClick:count,handlePhonicsClick:count,handleAnalyzePOS:count,handleSetIsSyntaxGameToTrue:count,splitTextToSentences:text=>pure.splitTextToSentences(text,{}),getSideBySideContent:()=>null,getContentDirection:()=> 'ltr',isRtlLang:()=>false,formatInteractiveText:text=>text,renderFormattedText:text=>text,highlightGlossaryTerms:text=>text,SourceReferencesPanel:()=>null,ComplexityGauge:()=>null}));
   });
   const opener=page.locator('[data-student-preview-open]');await opener.click();const modal=page.locator('[data-student-preview]'),close=modal.locator('[data-student-preview-close]');await close.waitFor();
   await page.evaluate(()=>{
     calls.writes=[];for(const name of ['click','pointerdown','wheel','mousemove','paste','keydown'])window.addEventListener(name,()=>calls.hostEvents++);
     document.addEventListener('click',event=>{if(event.target.closest('[data-help-ignore]'))return;event.preventDefault();event.stopPropagation();calls.help++;},true);
   });
   assert.equal(await close.evaluate(node=>document.activeElement===node),true);
   await page.keyboard.press('Shift+Tab');assert.equal(await modal.evaluate(node=>node.contains(document.activeElement)),true);await page.keyboard.press('Tab');assert.equal(await close.evaluate(node=>document.activeElement===node),true);
   await page.evaluate(()=>document.getElementById('outside').focus());assert.equal(await close.evaluate(node=>document.activeElement===node),true);
   await modal.locator('[data-reader-display]').click();await modal.locator('[data-adapted-theme-picker]').selectOption('dark');assert.equal(await modal.locator('[data-adapted-theme-picker]').inputValue(),'dark');
   await modal.locator('[data-reading-mode="define"]').click();await modal.locator('[data-reading-word]').filter({hasText:/^heron$/}).click();assert.equal(await modal.locator('[data-word-help-card-text]').textContent(),'A water bird.');
   await page.keyboard.press('Escape');assert.equal(await modal.locator('[data-word-help-card]').count(),0);assert.equal(await modal.evaluate(node=>node.contains(document.activeElement)),true);
   const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(node=>node.id));assert.equal(new Set(ids).size,ids.length);
   await close.click();assert.equal(await opener.evaluate(node=>document.activeElement===node),true);assert.equal(await page.locator('#outside').getAttribute('inert'),null);
   const calls=await page.evaluate(()=>window.calls);assert.deepEqual(calls.writes,[]);assert.equal(calls.media,0);assert.equal(calls.network,0);assert.equal(calls.hostEvents,0);assert.equal(calls.help,0);assert.deepEqual(calls.lifecycle.map(entry=>entry.active),[true,false]);assert.deepEqual(errors,[]);assert.equal(network,1);
   results.push({viewport,status:'passed',checks:['native Tab/Shift+Tab loop','inert background','prepared-help Escape and focus return','local theme control under Help capture','unique IDs','no media/network/persistent writes','no host input events','balanced lifecycle'],pageErrors:errors,networkRequests:network});await context.close();
 }
 fs.writeFileSync(path.join(dir,'browser-results.json'),JSON.stringify({at:new Date().toISOString(),browser:browser.version(),scope:'Fresh Chromium contexts with a local fixture and frozen merged reader; no deployed app or server',results},null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
