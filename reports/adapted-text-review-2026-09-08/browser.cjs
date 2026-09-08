const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..'),DEPS=path.join(ROOT,'desktop/web-app/node_modules');
async function main(){
 const postcss=require(path.join(DEPS,'postcss')),tailwind=require(path.join(DEPS,'tailwindcss'));
 const config=require(path.join(ROOT,'desktop/web-app/tailwind.config.js'));
 const css=(await postcss([tailwind({...config,content:[{raw:fs.readFileSync(path.join(ROOT,'view_simplified_source.jsx'),'utf8')+'\n'+fs.readFileSync(path.join(ROOT,'view_renderers_source.jsx'),'utf8'),extension:'jsx'}]})]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
 const browser=await chromium.launch({headless:true});const results=[];
 try{for(const [width,font]of [[320,16],[390,24],[1280,16],[1280,24]]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><title>Adapted reading checks</title></head><body><main id="root"></main></body></html>');
  await page.addStyleTag({content:css+'\nhtml{font-size:'+font+'px}body{margin:0;padding:8px;}'});
  for(const f of [path.join(DEPS,'react/umd/react.development.js'),path.join(DEPS,'react-dom/umd/react-dom.development.js')])await page.addScriptTag({path:f});
  await page.evaluate(()=>{window.AlloModules={};window.AlloIcons=new Proxy({},{get:()=>()=>null});});
  for(const f of ['pure_helpers_module.js','phase_n_misc_helpers_module.js','view_renderers_module.js','view_simplified_module.js'])await page.addScriptTag({path:path.join(ROOT,f)});
  await page.evaluate(()=>{
   const noop=()=>{},pure=AlloModules.PureHelpers,phase=AlloModules.PhaseNHelpers,root=ReactDOM.createRoot(document.getElementById('root'));
   const parts=text=>{const v=text.split('--- ENGLISH TRANSLATION ---');return v.length<2?null:{source:v[0].trim().split(/\n{2,}/),target:v[1].trim().split(/\n{2,}/),sourceFull:v[0].trim(),targetFull:v[1].trim()};};
   const inline=(text,cloze)=>phase.formatInteractiveText(text,cloze,false,{highlightGlossaryTerms:x=>x,latestGlossary:[],MathSymbol:({text})=>text});
   const table='| State | Example |\n| --- | --- |\n| Solid | Ice |\n| Liquid | Water |';
   window.renderReading=(overrides={})=>{const p={t:k=>k,generatedContent:{id:'browser',type:'simplified',config:{language:'Spanish'},data:'## Agua\n\nEl agua es **importante**.\n\n1. Observa el agua.\n  - Hielo\n  - Vapor\n2. Explica el cambio.\n\n'+table+'\n\n--- ENGLISH TRANSLATION ---\n\n## Water\n\nWater is **important**.\n\n1. Observe the water.\n  - Ice\n  - Steam\n2. Explain the change.\n\n'+table},inputText:'',gradeLevel:'5',leveledTextLanguage:'French',studentInterests:[],selectedVoice:'Kore',voiceSpeed:1,isTeacherMode:false,isEditingLeveledText:false,isImmersiveReaderActive:false,isCompareMode:false,isSideBySide:true,isZenMode:true,isProcessing:false,isPlaying:false,interactionMode:'read',history:[],textEditorRef:React.createRef(),splitTextToSentences:s=>pure.splitTextToSentences(s,{}),getSideBySideContent:parts,handleFormatText:noop,handleSimplifiedTextChange:noop,callTTS:noop,handleSpeak:(...args)=>{window.lastSpeak=args},handleWordClick:(word)=>{window.lastWord=word},handleQuickAddGlossary:(word)=>{window.lastGlossary=word},handlePhonicsClick:noop,isLineFocusMode:false,focusedParagraphIndex:null,setFocusedParagraphIndex:noop,cursorStyles:{read:'',define:''},getContentDirection:lang=>lang==='Arabic'?'rtl':'ltr',isRtlLang:lang=>lang==='Arabic',renderFormattedText:s=>AlloModules.ViewRenderers.renderFormattedText(s,false,false,{sanitizeTruncatedCitations:x=>x,normalizeResourceLinks:x=>x,formatInlineText:inline,t:()=>null}),formatInteractiveText:inline,SourceReferencesPanel:()=>null,playbackState:{currentIdx:-1},handleTextMouseUp:noop,highlightGlossaryTerms:x=>x,latestGlossary:[],setInteractionMode:noop,setIsCompareMode:noop,setIsFluencyMode:noop,setSelectionMenu:noop,setRevisionData:noop,setPhonicsData:noop, ...overrides};root.render(React.createElement(AlloModules.SimplifiedView,p));};
   window.renderReading();
  });
  await page.locator('[data-reading-table] table').first().waitFor();assert.equal(await page.locator('[data-reading-table] table').count(),2);
  assert.equal(await page.locator('[data-simplified-reading-body] ol').count(),2);
  await page.locator('[data-reading-sentence="2"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>lastSpeak[2]),2);
  await page.getByRole('combobox',{name:'Reading width'}).selectOption('40');
  let overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);if(overflow>1){console.log(JSON.stringify(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,70),r:e.getBoundingClientRect().right,w:e.getBoundingClientRect().width})).filter(e=>e.r>innerWidth+1).slice(0,20)),null,2));await page.screenshot({path:path.join(__dirname,'overflow.png'),fullPage:true});}assert.ok(overflow<=1,'Reading overflow '+overflow);
  await page.screenshot({path:path.join(__dirname,'reading-'+width+'-'+font+'.png'),fullPage:true});
  await page.evaluate(()=>renderReading({interactionMode:'define',isSideBySide:false}));
  await page.locator('[data-reading-word]').first().waitFor();const words=page.locator('[data-reading-paragraph="src-1"] [data-reading-word]');await words.first().focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>lastWord),'agua');
  await page.evaluate(()=>renderReading({isCompareMode:true,inputText:'Water.\n\nChanges.'}));await page.locator('[data-reading-comparison]').waitFor();overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(overflow<=1,'Compare overflow '+overflow);
  await page.screenshot({path:path.join(__dirname,'comparison-'+width+'-'+font+'.png'),fullPage:true});
  await page.evaluate(()=>renderReading({definitionData:{word:'agua',text:'Water is a liquid. '.repeat(40),x:0,y:880},closeDefinition:()=>{}}));const dialog=page.locator('[role=dialog]');await dialog.waitFor();const box=await dialog.boundingBox();assert.ok(box.x>=8&&box.x+box.width<=width+1,'Popup horizontal bounds');assert.ok(box.y+box.height<=900,'Popup vertical bounds');assert.deepEqual(errors,[]);results.push({width,font,readingTables:2,semanticLists:2,keyboardSentence:true,keyboardWord:true,horizontalOverflow:overflow,errors});await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'browser.json'),JSON.stringify(results,null,2));console.log('Browser checks passed: '+results.length+' viewport/type combinations.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
