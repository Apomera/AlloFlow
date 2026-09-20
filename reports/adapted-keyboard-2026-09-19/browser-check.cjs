const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=__dirname,DEPS=path.join(ROOT,'desktop/web-app/node_modules');
const postcss=require(path.join(DEPS,'postcss')),tailwind=require(path.join(DEPS,'tailwindcss'));
(async()=>{
 const css=(await postcss([tailwind({...require(path.join(ROOT,'desktop/web-app/tailwind.config.js')),content:[{raw:fs.readFileSync(path.join(ROOT,'view_simplified_source.jsx'),'utf8')+fs.readFileSync(path.join(ROOT,'reports/focus-view-discoverability-2026-09-12/host-focus-exit.js'),'utf8'),extension:'jsx'}]})]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
 const browser=await chromium.launch({headless:true}),results=[];
 try {for(const width of [320,1280]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:true,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><title>Adapted reading review</title></head><body><main id="root" style="max-width:1080px;margin:16px auto"></main></body></html>');
  await page.addStyleTag({content:css});
  for(const f of ['react/umd/react.development.js','react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(DEPS,f)});
  for(const f of ['instructional_context_module.js','pure_helpers_module.js','phase_n_misc_helpers_module.js','view_simplified_module.js','app_styles_module.js'])await page.addScriptTag({path:path.join(ROOT,f)});
  await page.addScriptTag({path:path.join(ROOT,'reports/focus-view-discoverability-2026-09-12/host-focus-exit.js')});
  await page.evaluate(catalog=>{
   window.readerCatalog=catalog;
   const R=React,h=R.createElement,noop=()=>{},pure=AlloModules.PureHelpers;
   window.calls=[];
   function Harness(){
    const [extra,setExtra]=R.useState({});window.updateReader=setExtra;
    const [mode,setMode]=R.useState('read'),[compare,setCompare]=R.useState(false),[editing,setEditing]=R.useState(false),[selection,setSelection]=R.useState(null),[revision,setRevision]=R.useState(null),[playing,setPlaying]=R.useState(false),[complexity,setComplexity]=R.useState(5),[focused,setFocused]=R.useState(null);
    const text='## Where does rain come from?\n\nThe sun warms water in lakes and rivers. Some of the water becomes vapor and rises into the air.\n\n### Inside a cloud\n\nHigh in the sky, water vapor cools. Tiny drops gather to make clouds.\n\n1. Sunlight warms water.\n2. Water vapor rises and cools.\n3. Drops fall as rain.';
    const props={t:k=>k.split('.').reduce((v,p)=>v?.[p],window.readerCatalog)||k,generatedContent:{id:'reading',type:'simplified',title:'The water cycle',data:text,config:{grade:'3',language:'English'},levelCheck:{feedback:'TEACHER_LEVEL'},alignmentCheck:{rigorReport:'TEACHER_RIGOR'}},inputText:'Original text.',gradeLevel:'3',leveledTextLanguage:'English',studentInterests:[],history:[],isTeacherMode:false,isZenMode:false,isCompareMode:compare,isEditingLeveledText:editing,interactionMode:mode,isFluencyMode:false,selectionMenu:selection,revisionData:revision,isPlaying:playing,playingContentId:playing?'simplified-main':null,playbackState:{currentIdx:playing?0:-1},complexityLevel:complexity,saveOriginalOnAdjust:true,selectedVoice:'Kore',voiceSpeed:1,readingTheme:'default',theme:'light',textEditorRef:R.createRef(),focusedParagraphIndex:focused,setFocusedParagraphIndex:setFocused,isLineFocusMode:false,isSideBySide:false,getSideBySideContent:value=>{const p=value.split('--- ENGLISH TRANSLATION ---');return p.length<2?null:{source:p[0].trim().split(/\n{2,}/),target:p[1].trim().split(/\n{2,}/),sourceFull:p[0].trim(),targetFull:p[1].trim()};},splitTextToSentences:s=>pure.splitTextToSentences(s,{}),formatInteractiveText:s=>AlloModules.PhaseNHelpers.formatInteractiveText(s,false,false,{highlightGlossaryTerms:v=>v,latestGlossary:[],MathSymbol:({text})=>text}),renderFormattedText:s=>h('div',null,s),SourceReferencesPanel:()=>null,ComplexityGauge:()=>null,getContentDirection:lang=>lang==='Arabic'?'rtl':'ltr',isRtlLang:lang=>lang==='Arabic',cursorStyles:{},setInteractionMode:setMode,setIsCompareMode:setCompare,setIsFluencyMode:noop,setSelectionMenu:setSelection,setRevisionData:setRevision,setPhonicsData:noop,setIsCustomReviseOpen:noop,handleToggleIsEditingLeveledText:()=>setEditing(v=>!v),closeDefinition:noop,closePhonics:noop,closeRevision:()=>{setRevision(null);setSelection(null);},stopPlayback:()=>setPlaying(false),handleSpeak:(...args)=>{calls.push(args);setPlaying(true);},setComplexityLevel:setComplexity,handleComplexityAdjustment:()=>calls.push(['adjust',complexity]),setSaveOriginalOnAdjust:noop,onFocusViewChange:value=>setExtra(prev=>({...prev,isZenMode:value})),setReadingTheme:value=>setExtra(prev=>({...prev,readingTheme:value})),handleFormatText:noop,handleSimplifiedTextChange:noop,handleTextMouseUp:noop,handleReviseSelection:()=>{setRevision({type:'explain',result:'Water changes between liquid and vapor as it warms and cools.',x:20,y:20});setSelection(null);},handleWordClick:noop,handlePhonicsClick:noop,handleQuickAddGlossary:noop,handleSetIsSyntaxGameToTrue:noop,callTTS:noop,latestGlossary:[],highlightGlossaryTerms:v=>v,...extra};
    return h(React.Fragment,null,h(AlloModules.AppStyles.AppStyles,{disableAnimations:true,baseFontSize:16,lineHeight:1.6,letterSpacing:0}),h('div',{className:'theme-'+props.theme},h('div',{className:'allo-docsuite theme-'+props.theme},h('div',{'data-reading-theme':props.readingTheme,'data-allo-anno-host':'true'},h('div',{className:'flex flex-col'},h(HostFocusExit,{isZenMode:props.isZenMode,t:props.t,handleSetIsZenModeToFalse:()=>props.onFocusViewChange(false)}),h(AlloModules.SimplifiedView,props))))));
   }
   ReactDOM.createRoot(document.getElementById('root')).render(h(Harness));
  },JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8')));


  await page.locator('[data-reading-passage]').waitFor();
  await page.addScriptTag({path:path.join(ROOT,'node_modules/axe-core/axe.min.js')});
  const ratio=(a,b)=>{const l=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};return (Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05)};
  await page.evaluate(()=>{window.globalEscapes=0;window.addEventListener('keydown',event=>{if(event.key==='Escape')globalEscapes++;});updateReader({isZenMode:true,phonicsData:{word:'water',language:'English',x:20,y:20,data:{phoneticSpelling:'waw-ter',ipa:'wɔtər',syllables:['wa','ter']}},closePhonics:()=>updateReader({isZenMode:true})});});
  const dialog=page.locator('[aria-labelledby="phonics-popup-title"]');await dialog.waitFor();
  const close=dialog.locator('button').first(),summary=dialog.locator('summary');
  await close.focus();await page.keyboard.press('Shift+Tab');assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Enter');assert.equal(await summary.evaluate(el=>el.parentElement.open),true);
  await page.keyboard.press('Tab');assert.equal(await close.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');assert.equal(await dialog.locator('[data-word-help-audio]').evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Tab');assert.equal(await summary.evaluate(el=>el===document.activeElement),true);
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>globalEscapes),0);
  assert.equal(await page.locator('[data-reader-focus-view]').getAttribute('aria-pressed'),'true');
  results.push({width,tabCycle:true,summaryKeyboardActivation:true,escapeClosesOnlyHelp:true,focusViewPreserved:true});
  assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(results,null,2));console.log('Passed keyboard navigation at '+results.length+' viewport sizes.');
})().catch(e=>{console.error(e);process.exitCode=1});
