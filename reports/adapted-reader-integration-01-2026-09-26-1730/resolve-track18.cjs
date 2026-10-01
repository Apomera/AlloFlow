'use strict';
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'merge-track18'),file=path.join(dir,'resolved/view_simplified_source.jsx');
let text=fs.readFileSync(file,'utf8'),index=0;
function once(s,a,b){if(s.split(a).length!==2)throw new Error('Anchor not unique in conflict '+index+': '+a);return s.replace(a,b);}
function take(s,re){const m=s.match(re);if(!m)throw new Error('Incoming markup missing');return m[0];}
text=text.replace(/^<<<<<<< integrated\n([\s\S]*?)^\|\|\|\|\|\|\| release-base\n([\s\S]*?)^=======\n([\s\S]*?)^>>>>>>> track18\n/gm,(_,o,b,t)=>{
 switch(index++){
 case 0:return o+t;
 case 1:return once(o,"var readerId = function (name) { return props.isStudentPreview ? previewInstanceId + '-' + name : name; };","var readerId = function (name) { return !props.isStudentPreview && /^sentence-/.test(name) ? name : name + '-' + previewInstanceId.replace(/:/g, ''); };");
 case 2:return once(o,'aria-label={active ? simplifiedPopupStopReadingLabel : label || simplifiedPopupReadAloudLabel}','aria-label={active ? simplifiedPopupStopLabel : label || simplifiedPopupListenLabel}');
 case 3:case 5:case 7:case 8:case 12:case 15:case 16:case 17:case 18:case 19:case 20:case 21:return o;
 case 4:return once(o,"aria-controls={readerId('simplified-reading-outline')}","aria-controls={outlineOpen ? readerId('simplified-reading-outline') : undefined}");
 case 6:return once(o,"aria-controls={readerId('simplified-section-prompts')}","aria-controls={promptsOpen ? readerId('simplified-section-prompts') : undefined}");
 case 9:return once(o,'sticky top-0 z-10 flex flex-wrap','flex flex-wrap');
 case 10:return once(t,'[generatedContent?.id, generatedContent?.data]','[generatedContent?.id, generatedContent?.data, complexityLevel, adaptOptions.shorterSentences, adaptOptions.explainVocabulary, adaptOptions.keepTerms]');
 case 11:{
  let value=once(t,'handleComplexityAdjustment({ apply: adaptPreview })','handleComplexityAdjustment({ apply: adaptPreview, options: currentAdaptOptions() })');
  value=once(value,"        } else if (result && result.status === 'stale') {","        } else if (result && result.status === 'rejected') {\n          if (adaptFocusRecoveryRef.current) adaptFocusRecoveryRef.current = 'preview';\n          dismissAdaptationPreview(); setAdaptNotice(result.message || 'Current text kept. Essential terms could not be verified.');\n        } else if (result && result.status === 'stale') {");
  return value;
 }
 case 13:return once(o,'<button type="button" data-apply-complexity','<button ref={adaptPreviewTriggerRef} type="button" data-apply-complexity');
 case 14:return once(t,'data-reading-language={language} data-reading-paragraph=','data-reading-language={language} onMouseUp={interactionMode === \'define\' ? handleTextMouseUp : undefined} data-reading-paragraph=');
 case 22:{
  let v=o.replaceAll("readerId('simplified-definition-title')",'readerId("simplified-definition-title")');
  v=once(v,'style={simplifiedPopupStyle(definitionData, 16)}><div className="flex justify-between items-start mb-2">','style={simplifiedPopupStyle(definitionData, 16)}><SimplifiedPopupStatus message={definitionData.text || definitionData.preparedText ? viewText(\'common.ready\', \'Ready\') : definitionData.status === \'error\' || definitionData.status === \'disabled\' ? viewText(\'glossary.popups.failed\', \'Definition unavailable.\') : viewText(\'glossary.popups.finding\', \'Finding a definition…\')} /><div className="flex flex-wrap justify-between items-start gap-2 mb-2">');
  v=once(v,'id={readerId("simplified-definition-title")} className="font-bold','id={readerId("simplified-definition-title")} className="min-w-0 break-words font-bold');
  v=v.replaceAll('aria-labelledby="phonics-popup-title"','aria-labelledby={readerId("phonics-popup-title")}').replaceAll('id="phonics-popup-title"','id={readerId("phonics-popup-title")}');
  v=once(v,'style={simplifiedPopupStyle(phonicsData, 18)}><div','style={simplifiedPopupStyle(phonicsData, 18)}>'+take(t,/<SimplifiedPopupStatus message=\{phonicsData[\s\S]*? \/>/)+'<div');
  v=once(v,'style={simplifiedPopupStyle(selectionMenu, 20)}>','style={simplifiedPopupStyle(selectionMenu, 20)}>'+take(t,/<button type="button" data-selection-close[\s\S]*?<\/button>/));
  v=once(v,'className="bg-slate-800 text-white rounded-full shadow-xl p-1 flex items-center gap-1"','className="max-w-full bg-slate-800 text-white rounded-2xl shadow-xl p-1 flex flex-wrap items-center justify-center gap-1"');
  v=once(v,'className="flex items-center gap-1 px-1 animate-in','className="flex w-full min-w-0 flex-wrap items-center gap-1 px-1 animate-in');
  return v;
 }
 case 23:{
  let v=o.replaceAll("readerId('simplified-revision-title')",'readerId("simplified-revision-title")');
  v=once(v,'style={simplifiedPopupStyle(revisionData, 18)}><div className="flex justify-between items-center mb-3','style={simplifiedPopupStyle(revisionData, 18)}>'+take(t,/<SimplifiedPopupStatus message=\{revisionData[\s\S]*? \/>/)+'<div className="flex flex-wrap justify-between items-center gap-2 mb-3');
  return once(v,'id={readerId("simplified-revision-title")} className="font-bold','id={readerId("simplified-revision-title")} className="min-w-0 break-words font-bold');
 }
 default:throw new Error('Unexpected conflict');
 }
});
if(index!==24)throw new Error('Conflict count changed');
require('@babel/parser').parse(text,{sourceType:'script',plugins:['jsx']});
fs.writeFileSync(file,text);
const test=path.join(dir,'resolved/tests/view_simplified_dialog_a11y.test.js');
let testText=fs.readFileSync(test,'utf8'),testCount=0;
testText=testText.replace(/^<<<<<<< integrated\n[\s\S]*?^\|\|\|\|\|\|\| release-base\n[\s\S]*?^=======\n([\s\S]*?)^>>>>>>> track18\n/gm,(_,theirs)=>{testCount++;return theirs;});
if(testCount!==2)throw new Error('Test conflict count changed');
fs.writeFileSync(test,testText);
console.log('Resolved 24 source conflicts and two equivalent selector assertions; JSX parses.');

