const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'../..'),OUT=__dirname,DEPS=path.join(ROOT,'desktop/web-app/node_modules');
const postcss=require(path.join(DEPS,'postcss')),tailwind=require(path.join(DEPS,'tailwindcss'));
(async()=>{
 const css=(await postcss([tailwind({...require(path.join(ROOT,'desktop/web-app/tailwind.config.js')),content:[{raw:fs.readFileSync(path.join(ROOT,'view_simplified_source.jsx'),'utf8'),extension:'jsx'}]})]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
 const browser=await chromium.launch({headless:true}),results=[];
 try {for(const width of [320,390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en"><head><title>Adapted reading review</title></head><body><main id="root" style="max-width:1080px;margin:16px auto"></main></body></html>');
  await page.addStyleTag({content:css});
  for(const f of ['react/umd/react.development.js','react-dom/umd/react-dom.development.js'])await page.addScriptTag({path:path.join(DEPS,f)});
  for(const f of ['pure_helpers_module.js','phase_n_misc_helpers_module.js','view_simplified_module.js'])await page.addScriptTag({path:path.join(ROOT,f)});
  await page.evaluate(catalog=>{
   window.readerCatalog=catalog;
   const R=React,h=R.createElement,noop=()=>{},pure=AlloModules.PureHelpers;
   window.calls=[];
   function Harness(){
    const [extra,setExtra]=R.useState({});window.updateReader=setExtra;
    const [mode,setMode]=R.useState('read'),[compare,setCompare]=R.useState(false),[editing,setEditing]=R.useState(false),[selection,setSelection]=R.useState(null),[revision,setRevision]=R.useState(null),[playing,setPlaying]=R.useState(false),[complexity,setComplexity]=R.useState(5),[focused,setFocused]=R.useState(null);
    const text='## Where does rain come from?\n\nThe sun warms water in lakes and rivers. Some of the water becomes vapor and rises into the air.\n\n### Inside a cloud\n\nHigh in the sky, water vapor cools. Tiny drops gather to make clouds.\n\n1. Sunlight warms water.\n2. Water vapor rises and cools.\n3. Drops fall as rain.';
    const props={t:k=>k.split('.').reduce((v,p)=>v?.[p],window.readerCatalog)||k,generatedContent:{id:'reading',type:'simplified',title:'The water cycle',data:text,config:{grade:'3',language:'English'},levelCheck:{feedback:'TEACHER_LEVEL'},alignmentCheck:{rigorReport:'TEACHER_RIGOR'}},inputText:'Original text.',gradeLevel:'3',leveledTextLanguage:'English',studentInterests:[],history:[],isTeacherMode:false,isZenMode:false,isCompareMode:compare,isEditingLeveledText:editing,interactionMode:mode,isFluencyMode:false,selectionMenu:selection,revisionData:revision,isPlaying:playing,playingContentId:playing?'simplified-main':null,playbackState:{currentIdx:playing?0:-1},complexityLevel:complexity,saveOriginalOnAdjust:true,selectedVoice:'Kore',voiceSpeed:1,readingTheme:'default',theme:'light',textEditorRef:R.createRef(),focusedParagraphIndex:focused,setFocusedParagraphIndex:setFocused,isLineFocusMode:false,isSideBySide:false,getSideBySideContent:value=>{const p=value.split('--- ENGLISH TRANSLATION ---');return p.length<2?null:{source:p[0].trim().split(/\n{2,}/),target:p[1].trim().split(/\n{2,}/),sourceFull:p[0].trim(),targetFull:p[1].trim()};},splitTextToSentences:s=>pure.splitTextToSentences(s,{}),formatInteractiveText:s=>s,renderFormattedText:s=>h('div',null,s),SourceReferencesPanel:()=>null,ComplexityGauge:()=>null,getContentDirection:lang=>lang==='Arabic'?'rtl':'ltr',isRtlLang:lang=>lang==='Arabic',cursorStyles:{},setInteractionMode:setMode,setIsCompareMode:setCompare,setIsFluencyMode:noop,setSelectionMenu:setSelection,setRevisionData:setRevision,setPhonicsData:noop,setIsCustomReviseOpen:noop,handleToggleIsEditingLeveledText:()=>setEditing(v=>!v),closeDefinition:noop,closePhonics:noop,closeRevision:()=>{setRevision(null);setSelection(null);},stopPlayback:()=>setPlaying(false),handleSpeak:(...args)=>{calls.push(args);setPlaying(true);},setComplexityLevel:setComplexity,handleComplexityAdjustment:()=>calls.push(['adjust',complexity]),setSaveOriginalOnAdjust:noop,setReadingTheme:noop,handleFormatText:noop,handleSimplifiedTextChange:noop,handleTextMouseUp:noop,handleReviseSelection:()=>{setRevision({type:'explain',result:'Water changes between liquid and vapor as it warms and cools.',x:20,y:20});setSelection(null);},handleWordClick:noop,handlePhonicsClick:noop,handleQuickAddGlossary:noop,handleSetIsSyntaxGameToTrue:noop,callTTS:noop,latestGlossary:[],highlightGlossaryTerms:v=>v,...extra};
    return h(AlloModules.SimplifiedView,props);
   }
   ReactDOM.createRoot(document.getElementById('root')).render(h(Harness));
  },JSON.parse(fs.readFileSync(path.join(ROOT,'ui_strings.js'),'utf8')));
  await page.locator('[data-reading-passage]').waitFor();
  await page.addScriptTag({path:path.join(ROOT,'node_modules/axe-core/axe.min.js')});
  const audit=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('[data-adapted-reader]'));return result.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});
  assert.deepEqual(audit,[]);
  assert.equal(await page.locator('[data-instructional-role]').count(),0);
  assert.equal(await page.getByText('TEACHER_LEVEL').count(),0);
  assert.equal(await page.locator('#simplified-practice-tools').isVisible(),false);
  for(const button of await page.locator('[data-reading-mode]').all())assert.ok((await button.boundingBox()).height>=44);
  await page.getByRole('button',{name:'Skip reading controls',exact:true}).click();
  assert.equal(await page.locator('[data-reading-passage]').evaluate(el=>el===document.activeElement),true);
  await page.locator('[data-reader-listen]').click();assert.equal(await page.locator('[data-reader-listen]').textContent(),'Stop reading aloud');
  await page.locator('[data-reader-listen]').click();
  await page.locator('[data-reading-mode="explain"]').click();
  await page.locator('[data-reading-sentence]').first().focus();await page.keyboard.press('Enter');
  const selected=page.getByRole('dialog',{name:'Selected passage',exact:true});await selected.waitFor();
  assert.equal(await selected.evaluate(el=>el.contains(document.activeElement)),true);
  const bounds=await selected.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width);
  await page.keyboard.press('Escape');await selected.waitFor({state:'detached'});
  assert.equal(await page.locator('[data-reading-sentence]').first().evaluate(el=>el===document.activeElement),true);
  await page.locator('[data-reading-mode="read"]').click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(OUT,'student-'+width+'.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // Enlarge text to check reflow with the app's responsive spacing.
  await page.addStyleTag({content:'html{font-size:24px}'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(OUT,'student-large-text-'+width+'.png'),fullPage:true});
  await page.addStyleTag({content:'html{font-size:16px}'});
  await page.evaluate(()=>updateReader({isTeacherMode:true}));
  assert.equal(await page.locator('[data-teacher-reading-review]').getAttribute('open'),null);
  await page.screenshot({path:path.join(OUT,'teacher-collapsed-'+width+'.png'),fullPage:true});
  await page.locator('[data-teacher-reading-review] summary').click();
  await page.locator('[data-apply-complexity]').waitFor();assert.equal(await page.locator('[data-apply-complexity]').isDisabled(),true);
  const slider=page.getByRole('slider',{name:'Adjust text complexity'});await slider.focus();await slider.press('ArrowLeft');
  assert.equal(await page.evaluate(()=>calls.some(c=>c[0]==='adjust')),false);
  await page.locator('[data-apply-complexity]').click();assert.equal(await page.evaluate(()=>calls.filter(c=>c[0]==='adjust').length),1);
  await page.screenshot({path:path.join(OUT,'teacher-'+width+'.png'),fullPage:true});
  await page.evaluate(()=>updateReader({isTeacherMode:false,isCompareMode:true,isEditingLeveledText:true,interactionMode:'revise',revisionData:{type:'simplify',result:'TEACHER_ONLY',x:10,y:10}}));
  await page.locator('[data-reading-passage]').waitFor();assert.equal(await page.locator('textarea,[data-reading-comparison]').count(),0);
  assert.equal(await page.getByText('TEACHER_ONLY').count(),0);
  await page.evaluate(()=>updateReader({isTeacherMode:false,isSideBySide:true,generatedContent:{id:'arabic',type:'simplified',title:'Water / الماء',data:'## الماء\n\nيتحول الماء إلى بخار.\n\n--- ENGLISH TRANSLATION ---\n\n## Water\n\nWater changes into vapor.',config:{language:'Arabic'}}}));
  await page.locator('[data-reading-language="Arabic"]').first().waitFor();
  assert.equal(await page.locator('[data-reading-language="Arabic"]').first().getAttribute('dir'),'rtl');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(OUT,'bilingual-'+width+'.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  results.push({width,studentControls:true,teacherBoundaries:true,keyboardExplain:true,popupBounds:true,focusRestored:true,largeTextReflow:true,explicitAdjustment:true,bilingualRtl:true,seriousAxeViolations:[],errors});await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(OUT,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
