const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=__dirname,DEPS=path.join(ROOT,'desktop/web-app/node_modules');
const postcss=require(path.join(DEPS,'postcss')),tailwind=require(path.join(DEPS,'tailwindcss'));
(async()=>{
 const css=(await postcss([tailwind({...require(path.join(ROOT,'desktop/web-app/tailwind.config.js')),content:[{raw:fs.readFileSync(path.join(ROOT,'view_simplified_source.jsx'),'utf8'),extension:'jsx'}]})]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
 const browser=await chromium.launch({headless:true}),results=[];
 try {for(const width of [390]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><title>Adapted reading review</title></head><body><main id="root" style="max-width:1080px;margin:16px auto"></main></body></html>');
  await page.addStyleTag({content:css});
  for(const f of ['react/umd/react.development.js','react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(DEPS,f)});
  for(const f of ['pure_helpers_module.js','phase_n_misc_helpers_module.js','view_simplified_module.js','app_styles_module.js'])await page.addScriptTag({path:path.join(ROOT,f)});
  await page.evaluate(catalog=>{
   window.readerCatalog=catalog;
   const R=React,h=R.createElement,noop=()=>{},pure=AlloModules.PureHelpers;
   window.calls=[];
   function Harness(){
    const [extra,setExtra]=R.useState({});window.updateReader=setExtra;
    const [mode,setMode]=R.useState('read'),[compare,setCompare]=R.useState(false),[editing,setEditing]=R.useState(false),[selection,setSelection]=R.useState(null),[revision,setRevision]=R.useState(null),[playing,setPlaying]=R.useState(false),[complexity,setComplexity]=R.useState(5),[focused,setFocused]=R.useState(null);
    const text='## Where does rain come from?\n\nThe sun warms water in lakes and rivers. Some of the water becomes vapor and rises into the air.\n\n### Inside a cloud\n\nHigh in the sky, water vapor cools. Tiny drops gather to make clouds.\n\n1. Sunlight warms water.\n2. Water vapor rises and cools.\n3. Drops fall as rain.';
    const props={t:k=>k.split('.').reduce((v,p)=>v?.[p],window.readerCatalog)||k,generatedContent:{id:'reading',type:'simplified',title:'The water cycle',data:text,config:{grade:'3',language:'English'},levelCheck:{feedback:'TEACHER_LEVEL'},alignmentCheck:{rigorReport:'TEACHER_RIGOR'}},inputText:'Original text.',gradeLevel:'3',leveledTextLanguage:'English',studentInterests:[],history:[],isTeacherMode:false,isZenMode:false,isCompareMode:compare,isEditingLeveledText:editing,interactionMode:mode,isFluencyMode:false,selectionMenu:selection,revisionData:revision,isPlaying:playing,playingContentId:playing?'simplified-main':null,playbackState:{currentIdx:playing?0:-1},complexityLevel:complexity,saveOriginalOnAdjust:true,selectedVoice:'Kore',voiceSpeed:1,readingTheme:'default',theme:'light',textEditorRef:R.createRef(),focusedParagraphIndex:focused,setFocusedParagraphIndex:setFocused,isLineFocusMode:false,isSideBySide:false,getSideBySideContent:value=>{const p=value.split('--- ENGLISH TRANSLATION ---');return p.length<2?null:{source:p[0].trim().split(/\n{2,}/),target:p[1].trim().split(/\n{2,}/),sourceFull:p[0].trim(),targetFull:p[1].trim()};},splitTextToSentences:s=>pure.splitTextToSentences(s,{}),formatInteractiveText:s=>s,renderFormattedText:s=>h('div',null,s),SourceReferencesPanel:()=>null,ComplexityGauge:()=>null,getContentDirection:lang=>lang==='Arabic'?'rtl':'ltr',isRtlLang:lang=>lang==='Arabic',cursorStyles:{},setInteractionMode:setMode,setIsCompareMode:setCompare,setIsFluencyMode:noop,setSelectionMenu:setSelection,setRevisionData:setRevision,setPhonicsData:noop,setIsCustomReviseOpen:noop,handleToggleIsEditingLeveledText:()=>setEditing(v=>!v),closeDefinition:noop,closePhonics:noop,closeRevision:()=>{setRevision(null);setSelection(null);},stopPlayback:()=>setPlaying(false),handleSpeak:(...args)=>{calls.push(args);setPlaying(true);},setComplexityLevel:setComplexity,handleComplexityAdjustment:()=>calls.push(['adjust',complexity]),setSaveOriginalOnAdjust:noop,setReadingTheme:value=>setExtra(prev=>({...prev,readingTheme:value})),handleFormatText:noop,handleSimplifiedTextChange:noop,handleTextMouseUp:noop,handleReviseSelection:()=>{setRevision({type:'explain',result:'Water changes between liquid and vapor as it warms and cools.',x:20,y:20});setSelection(null);},handleWordClick:noop,handlePhonicsClick:noop,handleQuickAddGlossary:noop,handleSetIsSyntaxGameToTrue:noop,callTTS:noop,latestGlossary:[],highlightGlossaryTerms:v=>v,...extra};
    return h(React.Fragment,null,h(AlloModules.AppStyles.AppStyles,{baseFontSize:16,lineHeight:1.6,letterSpacing:0}),h('div',{className:'theme-'+props.theme},h('div',{className:'allo-docsuite theme-'+props.theme},h('div',{'data-reading-theme':props.readingTheme,'data-allo-anno-host':'true'},h(AlloModules.SimplifiedView,props)))));
   }
   ReactDOM.createRoot(document.getElementById('root')).render(h(Harness));
  },JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8')));

  await page.locator('[data-reading-passage]').waitFor();
  for(const app of ['light','dark','contrast'])for(const reading of ['default','warm','sepia','dark','highContrast','blue','green','rose','dyslexia','dim']){
   await page.evaluate(({app,reading})=>updateReader({theme:app,readingTheme:reading,isPlaying:true,playingContentId:'simplified-main',playbackState:{currentIdx:0}}),{app,reading});
   await page.waitForTimeout(70);
   const sample=await page.evaluate(()=>{
    const get=s=>getComputedStyle(document.querySelector(s));const c=get('[data-reading-sentence]'),p=get('[data-reading-paragraph]');
    const selected=document.querySelector('select[aria-label="Reading theme"]');
    return {sentence:{bg:c.backgroundColor,color:c.color,border:c.borderWidth},paragraph:{bg:p.backgroundColor,color:p.color},themeValue:selected?.value,options:selected?Array.from(selected.options).map(o=>o.value):[],overflow:document.documentElement.scrollWidth>innerWidth};
   });
   results.push({app,reading,...sample});
   if(['warm','dark','highContrast'].includes(reading)&&app==='light')await page.screenshot({path:path.join(OUT,'before-'+app+'-'+reading+'.png'),fullPage:true});
  }
  await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(OUT,'before-matrix.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
