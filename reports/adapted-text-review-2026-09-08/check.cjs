const fs=require('fs'),vm=require('vm'),path=require('path'),babel=require('@babel/core');
const React=require(path.resolve('desktop/web-app/node_modules/react'));
const {renderToStaticMarkup}=require(path.resolve('desktop/web-app/node_modules/react-dom/server'));
const {JSDOM}=require('jsdom');
const window={React,AlloModules:{},AlloIcons:new Proxy({},{get:()=>()=>null})};
const ctx=vm.createContext({window,React,console,setTimeout,clearTimeout,URL,AbortController});
for(const f of ['pure_helpers_module.js','phase_n_misc_helpers_module.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const compiled=babel.transformSync(fs.readFileSync('view_simplified_source.jsx','utf8'),{plugins:['@babel/plugin-transform-react-jsx'],babelrc:false,configFile:false}).code;
vm.runInContext(compiled+'\nwindow.View=SimplifiedView;',ctx);
const pure=window.AlloModules.PureHelpers,phase=window.AlloModules.PhaseNHelpers;
const noop=()=>{},format=(s,c)=>phase.formatInteractiveText(s,c,false,{highlightGlossaryTerms:x=>x,latestGlossary:[],MathSymbol:({text})=>text});
function render(extra={}){
 const p={t:k=>k,generatedContent:{id:'review',type:'simplified',data:'## Water\n\n**Read carefully.**\n\n1. Observe water.\n2. Explain changes.'},inputText:'',gradeLevel:'5',leveledTextLanguage:'English',selectedVoice:'Kore',voiceSpeed:1,isTeacherMode:false,isEditingLeveledText:false,isImmersiveReaderActive:false,isCompareMode:false,isSideBySide:false,isZenMode:true,isProcessing:false,isPlaying:false,interactionMode:'read',history:[],textEditorRef:React.createRef(),splitTextToSentences:s=>pure.splitTextToSentences(s,{}),getSideBySideContent:()=>null,handleFormatText:noop,handleSimplifiedTextChange:noop,callTTS:noop,handleSpeak:noop,isLineFocusMode:false,focusedParagraphIndex:null,setFocusedParagraphIndex:noop,cursorStyles:{read:'',define:'','add-glossary':''},getContentDirection:()=> 'ltr',isRtlLang:()=>false,renderFormattedText:s=>React.createElement('div',{'data-table-fixture':true},s),formatInteractiveText:format,SourceReferencesPanel:()=>null,playbackState:{currentIdx:-1},handleTextMouseUp:noop,highlightGlossaryTerms:s=>s,latestGlossary:[],...extra};
 return new JSDOM(renderToStaticMarkup(React.createElement(window.View,p))).window.document;
}
const mono=render();const table='| State | Example |\n| --- | --- |\n| Solid | TABLE_SENTINEL |';
const bilingual={source:['First source.',table],target:['First translation.',table],sourceFull:'First source.\n\n'+table,targetFull:'First translation.\n\n'+table};
const side=render({isSideBySide:true,getSideBySideContent:()=>bilingual});
const stacked=render({getSideBySideContent:()=>bilingual});
const add=render({interactionMode:'add-glossary',getSideBySideContent:()=>bilingual});
const chinese=render({interactionMode:'define',generatedContent:{id:'zh',type:'simplified',data:'水变成水蒸气。它升到空中。'}});
const results={scope:'Isolated current-source React server renders; production inline formatter and sentence splitter; table renderer is a sentinel stub, not a visual browser test.',structure:{headings:mono.querySelectorAll('[data-simplified-reading-body] h1,[data-simplified-reading-body] h2,[data-simplified-reading-body] h3').length,lists:mono.querySelectorAll('[data-simplified-reading-body] ol,[data-simplified-reading-body] ul').length,bold:mono.querySelectorAll('[data-simplified-reading-body] strong').length},tables:{stackedRetainsSentinel:stacked.body.textContent.includes('TABLE_SENTINEL'),sideBySideRetainsSentinel:side.body.textContent.includes('TABLE_SENTINEL')},stackedSentenceControls:[...stacked.querySelectorAll('[id^="sentence-"]')].map(e=>({text:e.textContent,role:e.getAttribute('role'),tabindex:e.getAttribute('tabindex')})),stackedGlossaryControls:[...add.querySelectorAll('[title="common.click_add_glossary"]')].map(e=>({text:e.textContent,role:e.getAttribute('role'),tabindex:e.getAttribute('tabindex')})),chinese:{sentenceUnits:pure.splitTextToSentences('水变成水蒸气。它升到空中。',{}).length,definitionControls:chinese.querySelectorAll('[data-simplified-reading-body] [role="button"]').length}};
fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
