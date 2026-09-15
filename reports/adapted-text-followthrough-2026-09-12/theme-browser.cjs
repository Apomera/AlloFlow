const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=__dirname,DEPS=path.join(ROOT,'desktop/web-app/node_modules');
const postcss=require(path.join(DEPS,'postcss')),tailwind=require(path.join(DEPS,'tailwindcss'));
(async()=>{
 const css=(await postcss([tailwind({...require(path.join(ROOT,'desktop/web-app/tailwind.config.js')),content:[{raw:fs.readFileSync(path.join(ROOT,'view_simplified_source.jsx'),'utf8'),extension:'jsx'}]})]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
 const browser=await chromium.launch({headless:true}),results=[];
 try {for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:true,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
    const props={t:k=>k.split('.').reduce((v,p)=>v?.[p],window.readerCatalog)||k,generatedContent:{id:'reading',type:'simplified',title:'The water cycle',data:text,config:{grade:'3',language:'English'},levelCheck:{feedback:'TEACHER_LEVEL'},alignmentCheck:{rigorReport:'TEACHER_RIGOR'}},inputText:'Original text.',gradeLevel:'3',leveledTextLanguage:'English',studentInterests:[],history:[],isTeacherMode:false,isZenMode:false,isCompareMode:compare,isEditingLeveledText:editing,interactionMode:mode,isFluencyMode:false,selectionMenu:selection,revisionData:revision,isPlaying:playing,playingContentId:playing?'simplified-main':null,playbackState:{currentIdx:playing?0:-1},complexityLevel:complexity,saveOriginalOnAdjust:true,selectedVoice:'Kore',voiceSpeed:1,readingTheme:'default',theme:'light',textEditorRef:R.createRef(),focusedParagraphIndex:focused,setFocusedParagraphIndex:setFocused,isLineFocusMode:false,isSideBySide:false,getSideBySideContent:value=>{const p=value.split('--- ENGLISH TRANSLATION ---');return p.length<2?null:{source:p[0].trim().split(/\n{2,}/),target:p[1].trim().split(/\n{2,}/),sourceFull:p[0].trim(),targetFull:p[1].trim()};},splitTextToSentences:s=>pure.splitTextToSentences(s,{}),formatInteractiveText:s=>AlloModules.PhaseNHelpers.formatInteractiveText(s,false,false,{highlightGlossaryTerms:v=>v,latestGlossary:[],MathSymbol:({text})=>text}),renderFormattedText:s=>h('div',null,s),SourceReferencesPanel:()=>null,ComplexityGauge:()=>null,getContentDirection:lang=>lang==='Arabic'?'rtl':'ltr',isRtlLang:lang=>lang==='Arabic',cursorStyles:{},setInteractionMode:setMode,setIsCompareMode:setCompare,setIsFluencyMode:noop,setSelectionMenu:setSelection,setRevisionData:setRevision,setPhonicsData:noop,setIsCustomReviseOpen:noop,handleToggleIsEditingLeveledText:()=>setEditing(v=>!v),closeDefinition:noop,closePhonics:noop,closeRevision:()=>{setRevision(null);setSelection(null);},stopPlayback:()=>setPlaying(false),handleSpeak:(...args)=>{calls.push(args);setPlaying(true);},setComplexityLevel:setComplexity,handleComplexityAdjustment:()=>calls.push(['adjust',complexity]),setSaveOriginalOnAdjust:noop,setReadingTheme:value=>setExtra(prev=>({...prev,readingTheme:value})),handleFormatText:noop,handleSimplifiedTextChange:noop,handleTextMouseUp:noop,handleReviseSelection:()=>{setRevision({type:'explain',result:'Water changes between liquid and vapor as it warms and cools.',x:20,y:20});setSelection(null);},handleWordClick:noop,handlePhonicsClick:noop,handleQuickAddGlossary:noop,handleSetIsSyntaxGameToTrue:noop,callTTS:noop,latestGlossary:[],highlightGlossaryTerms:v=>v,...extra};
    return h(React.Fragment,null,h(AlloModules.AppStyles.AppStyles,{disableAnimations:true,baseFontSize:16,lineHeight:1.6,letterSpacing:0}),h('div',{className:'theme-'+props.theme},h('div',{className:'allo-docsuite theme-'+props.theme},h('div',{'data-reading-theme':props.readingTheme,'data-allo-anno-host':'true'},h(AlloModules.SimplifiedView,props)))));
   }
   ReactDOM.createRoot(document.getElementById('root')).render(h(Harness));
  },JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8')));


  await page.locator('[data-reading-passage]').waitFor();
  await page.addScriptTag({path:path.join(ROOT,'node_modules/axe-core/axe.min.js')});
  const ratio=(a,b)=>{const l=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};return (Math.max(l(a),l(b))+.05)/(Math.min(l(a),l(b))+.05)};
  for(const app of ['light','dark','contrast'])for(const reading of ['default','warm','sepia','dark','highContrast','blue','green','rose','dyslexia','dim']){
   const state={theme:app,readingTheme:reading,isPlaying:true,playingContentId:'simplified-main',playbackState:{currentIdx:0}};
   await page.evaluate(state=>updateReader(state),state);await page.waitForTimeout(50);
   const sample=await page.evaluate(()=>{
    const get=s=>getComputedStyle(document.querySelector(s));const c=get('[data-reading-sentence]'),next=get('[data-reading-sentence="1"]');
    const selected=document.querySelector('[data-adapted-theme-picker]');
    return {active:{bg:c.backgroundColor,color:c.color,border:c.borderWidth,underline:c.textDecorationLine},inactive:{bg:next.backgroundColor,border:next.borderWidth},themeValue:selected?.value,options:Array.from(selected.options).map(o=>o.value),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   const key=width+'/'+app+'/'+reading;
   assert.equal(sample.themeValue,reading,key);assert.equal(sample.options.length,10,key);
   assert.equal(sample.active.border,'0px',key);assert.equal(sample.inactive.border,'0px',key);assert.equal(sample.inactive.bg,'rgba(0, 0, 0, 0)',key);
   assert.ok(sample.active.underline.includes('underline'),key);assert.ok(ratio(sample.active.bg,sample.active.color)>=4.5,key+JSON.stringify(sample.active));assert.equal(sample.overflow,false,key);
   // Paragraph focus follows the same palette, including the app-default dark case.
   await page.evaluate(state=>updateReader({...state,isLineFocusMode:true}),state);
   const focused=await page.locator('[data-reading-focused="true"]').first().evaluate(el=>{const s=getComputedStyle(el),c=getComputedStyle(el.querySelector('[data-reading-sentence]'));return {bg:s.backgroundColor,color:s.color,border:s.borderInlineStartWidth,sentenceBg:c.backgroundColor,sentenceColor:c.color}});
   assert.ok(ratio(focused.bg,focused.color)>=4.5,key+JSON.stringify(focused));assert.ok(ratio(focused.sentenceBg,focused.sentenceColor)>=4.5,key+' focus highlight');assert.equal(focused.border,'3px',key);
   await page.evaluate(state=>updateReader({...state,isPlaying:false,interactionMode:'define'}),state);
   const word=page.locator('[data-reading-word]').first();await word.focus();
   const wordStyle=await word.evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color,border:s.borderWidth,outline:s.outlineWidth}});
   assert.equal(wordStyle.border,'0px',key);assert.ok(ratio(wordStyle.bg,wordStyle.color)>=4.5,key+' focused word');assert.equal(wordStyle.outline,'3px',key);
   await page.evaluate(state=>updateReader({...state,isPlaying:false,definitionData:{word:'vapor',text:'Water in its gas form.',x:24,y:140}}),state);
   const popup=page.locator('[role="dialog"]').first();await popup.waitFor();
   const popupStyle=await popup.evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color}});
   assert.ok(ratio(popupStyle.bg,popupStyle.color)>=4.5,key+' popup '+JSON.stringify(popupStyle));
   if(width===390){
    const violations=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('[data-adapted-reader]'),{runOnly:['color-contrast']});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
    assert.deepEqual(violations,[],key+' contrast audit');
   }
   await page.evaluate(state=>updateReader(state),state);
   if(width===390&&((app==='light'&&['warm','dark','highContrast'].includes(reading))||(app==='dark'&&reading==='default')))await page.screenshot({path:path.join(OUT,'after-'+app+'-'+reading+'.png'),fullPage:true});
   results.push({width,app,reading,picker:true,inlineText:true,highlightContrast:ratio(sample.active.bg,sample.active.color),paragraphFocus:true,wordFocus:true,popupContrast:ratio(popupStyle.bg,popupStyle.color),overflow:false});
  }
  await page.emulateMedia({forcedColors:'active'});
  await page.evaluate(()=>updateReader({theme:'dark',readingTheme:'highContrast',isPlaying:true,playingContentId:'simplified-main',playbackState:{currentIdx:0}}));
  const forced=await page.locator('[data-reading-sentence]').first().evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color,underline:s.textDecorationLine}});
  assert.ok(ratio(forced.bg,forced.color)>=4.5);assert.ok(forced.underline.includes('underline'));
  await page.screenshot({path:path.join(OUT,'forced-colors-'+width+'.png'),fullPage:true});
  await page.emulateMedia({media:'print',forcedColors:'none'});
  const print=await page.locator('[data-reading-sentence]').first().evaluate(el=>{const s=getComputedStyle(el);return {color:s.color,border:s.borderWidth,bg:s.backgroundColor}});
  assert.equal(print.color,'rgb(0, 0, 0)');assert.equal(print.border,'0px');
  await page.emulateMedia({media:'screen',forcedColors:'none'});
  await page.evaluate(()=>updateReader({theme:'dark',readingTheme:'warm',isZenMode:true,isSideBySide:true,generatedContent:{id:'bilingual',type:'simplified',data:'الماء مهم.\n\n--- ENGLISH TRANSLATION ---\n\nWater is important.',config:{language:'Arabic'}}}));
  const picker=page.locator('[data-adapted-theme-picker]');await picker.waitFor();
  await picker.selectOption('dim');
  assert.equal(await picker.inputValue(),'dim');
  assert.equal(await page.locator('[data-reading-sentence]').count(),2);
  assert.equal(await page.locator('[data-help-key="simplified_immersive_reader"]').count(),1);
  assert.equal(await page.locator('[data-help-key="simplified_teacher_tools"]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(OUT,'focused-bilingual-'+width+'.png'),fullPage:true});
  await page.locator('[data-reading-sentence]').nth(1).press('Enter');
  assert.equal(await page.evaluate(()=>calls.at(-1)[2]),1);
  // A real hover must apply the enabled variant without affecting disabled controls.
  await page.evaluate(()=>{const wrap=document.createElement('div');wrap.id='hover-test';wrap.innerHTML='<div class="theme-dark"><div class="allo-docsuite"><button id="enabled" class="bg-white text-slate-800 enabled:hover:bg-indigo-50">Enabled</button><button id="disabled" disabled class="bg-white text-slate-800 enabled:hover:bg-indigo-50">Disabled</button></div></div>';document.body.append(wrap);});
  const bg=selector=>page.locator(selector).evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.mouse.move(0,0);const rest=await bg('#enabled'),disabledRest=await bg('#disabled');
  await page.locator('#enabled').hover();const hovered=await bg('#enabled');assert.notEqual(hovered,rest);
  assert.ok(ratio(hovered,await page.locator('#enabled').evaluate(el=>getComputedStyle(el).color))>=4.5);
  await page.locator('#disabled').hover();assert.equal(await bg('#disabled'),disabledRest);
  await page.locator('#hover-test').evaluate(el=>el.remove());
  assert.deepEqual(errors,[]);await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(OUT,'theme-matrix.json'),JSON.stringify(results,null,2));console.log('Passed '+results.length+' app/reading theme and viewport combinations, plus forced colors.');
})().catch(e=>{console.error(e);process.exitCode=1});

