module.exports=async function(page){
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
     window.readerProps={generatedContent:reading,history:[],t:k=>k,isTeacherMode:true,isZenMode:false,interactionMode:'read',readingTheme:'default',readingLearnerKey:'teacher|browser-fixture',gradeLevel:'5',leveledTextLanguage:'English',studentInterests:[],latestGlossary:[],playbackState:{currentIdx:-1},cursorStyles:{},setInteractionMode:noop,setIsCompareMode:noop,setIsFluencyMode:noop,setSelectionMenu:noop,setIsCustomReviseOpen:noop,setFocusedParagraphIndex:noop,setReadingTheme:noop,setComplexityLevel:noop,setSaveOriginalOnAdjust:noop,handleFormatText:noop,handleTextMouseUp:noop,handleSimplifiedTextChange:noop,handleToggleIsEditingLeveledText:noop,textEditorRef:React.createRef(),handleSpeak:count,stopPlayback:count,callTTS:count,handleWordClick:count,handlePhonicsClick:count,handleAnalyzePOS:count,handleSetIsSyntaxGameToTrue:count,splitTextToSentences:text=>pure.splitTextToSentences(text,{}),getSideBySideContent:()=>null,getContentDirection:()=> 'ltr',isRtlLang:()=>false,formatInteractiveText:text=>text,renderFormattedText:text=>text,highlightGlossaryTerms:text=>text,SourceReferencesPanel:()=>null,ComplexityGauge:()=>null};previewRoot.render(React.createElement(AlloModules.SimplifiedView,readerProps));
   });

};