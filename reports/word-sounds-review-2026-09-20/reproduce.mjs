import {readFileSync,writeFileSync} from 'node:fs';
import {core,compileWords} from '../../tests/helpers/word_sounds_core.js';
import {makePackItem} from '../../tests/helpers/word_sounds_pack_fixture.js';
const source=readFileSync('word_sounds_module.js','utf8');
const between=(start,end,from=0)=>{const a=source.indexOf(start,from),b=source.indexOf(end,a+start.length);if(a<0||b<0)throw Error(start);return source.slice(a,b);};
const route=between('if (wordSoundsPhonemes?.phonemes) {','if (!isCorrect && answer && expectedAnswer)',source.indexOf('const checkAnswer ='));
const evidence=[];
new Function('wordSoundsPhonemes','wordSoundsActivity','isCorrect','_masteryEvidence','updatePhonemeMastery','isolationStateRef','isolationState',route)({phonemes:['k','a','t']},'sound_sort',true,{presentations:1},(...args)=>evidence.push(args),{current:null},null);
const families={at:['cat','hat','bat','mat'],un:['sun','fun','run']};
const resolveFamily=new Function('WS_CORE','RIME_FAMILIES','SOUND_MATCH_POOL',between('const resolveWordFamilyRime =','const includeOrthographic =')+';return resolveWordFamilyRime;')(core,families,[]);
const raw={...makePackItem(),rimeFamilyMembers:{teacherEdited:true,rime:'at',words:['hat'],distractors:['hat']}};
const compiled=compileWords([raw])[0];
const renderStart=source.indexOf('case "word_families": {');
const renderEnd=source.indexOf('return /*#__PURE__*/ React.createElement(',renderStart);
const renderBoard=new Function('currentWordSoundsWord','wordSoundsPhonemes','wordFamilyRimeRef','resolveWordFamilyRime','RIME_FAMILIES',source.slice(renderStart+'case "word_families": {'.length,renderEnd)+'return {rime:targetRime,options:selectedMembers,distractors:selectedDistractors};');
const missingLetter = new Function('React','packForCurrentWord','currentWordSoundsWord','wordSoundsPhonemes',between('const hiddenIndex = React.useMemo(', 'const letterOptions = React.useMemo(')+'return {hiddenIndex,correctLetter};')({useMemo:fn=>fn()},{missing_letter:{hiddenIndex:99,correctLetter:'x',options:['x']}},'cat',{});
const output={
 malformedMissingLetter:missingLetter,
 soundSortPhonemeAttribution:evidence,
 rejectedBoardFallback:{compiledBoard:compiled.activityItems.word_families||null,renderedBoard:renderBoard('cat',compiled,{current:null},resolveFamily,families)},
 unknownFamilyFallback:{target:'rhythm',resolved:resolveFamily('rhythm',null)},
 teacherTransitionTimer:between('                  setTimeout(() => {\n                    if (!isMountedRef.current || isProbeMode) return;','                }\n              }',source.indexOf('const checkAnswer =')),
};
writeFileSync('reports/word-sounds-review-2026-09-20/reproductions.json',JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
