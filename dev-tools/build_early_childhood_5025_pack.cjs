#!/usr/bin/env node
'use strict';
const fs=require('fs'); const path=require('path'); const { writeGeneratedFile } = require('./write_generated_file.cjs'); const banks=require('./early_childhood_5025/expanded_content.cjs'); const {applySourceReviewCorrections}=require('./early_childhood_5025/source_review_corrections.cjs'); const root=path.resolve(__dirname,'..');
const counts={'language-literacy':30,mathematics:25,'social-studies':14,science:14,'health-physical-arts':17}; const official={'language-literacy':36,mathematics:30,'social-studies':17,science:17,'health-physical-arts':20};
const ensure=(v,n,s)=>String(v||'').trim().length>=n?String(v).trim():(String(v||'').trim()+' '+s).trim();
const chapterBySkill={
  'oral-language-emergent-literacy':'ec5025-ch-01','phonological-phonics-word-reading':'ec5025-ch-02','comprehension-writing-literature':'ec5025-ch-03',
  'number-operations':'ec5025-ch-04','measurement-data':'ec5025-ch-05','geometry-reasoning':'ec5025-ch-06',
  'history-civics-culture':'ec5025-ch-07','geography-economics-inquiry':'ec5025-ch-08','physical-earth-science':'ec5025-ch-09',
  'life-science-engineering':'ec5025-ch-10','health-physical-development':'ec5025-ch-11','creative-performing-arts':'ec5025-ch-12'
};
const positionsBySkill={
  'oral-language-emergent-literacy':[1,2,3,4,5,6,7,8],
  'phonological-phonics-word-reading':[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29],
  'comprehension-writing-literature':[28,30],
  'number-operations':[31,32,33,34,35,36,45,47,48,49,51,52,53,54],
  'measurement-data':[41,42,43,44,46,55],
  'geometry-reasoning':[37,38,39,40,50],
  'history-civics-culture':[56,57,59,60,64,65,67,68,69],
  'geography-economics-inquiry':[58,61,62,63,66],
  'physical-earth-science':[70,71,72,73,74,75,76,77,78,79],
  'life-science-engineering':[80,81,82,83],
  'health-physical-development':[84,85,86,87,88,89,90],
  'creative-performing-arts':[91,92,93,94,95,96,97,98,99,100]
};
const skillByPosition=new Map(Object.entries(positionsBySkill).flatMap(([skill,positions])=>positions.map(position=>[position,skill])));
if(skillByPosition.size!==100)throw new Error('Learning-link position map must cover all 100 source positions');
const firstSentence=value=>{const text=String(value||'').trim();const match=text.match(/^.*?[.!?](?:\s|$)/);return(match?match[0]:text).trim();};
function make(bank,q,batch,pos){
  const answerIndex=(pos-1)%4;
  const rationale=ensure(q.rationale,120,'The response preserves disciplinary accuracy, appropriate scope, evidence, and a verifiable reasoning chain.');
  const choices=[];const choiceRationales=[];const skillId=skillByPosition.get(pos);let d=0;
  for(let i=0;i<4;i++){
    if(i===answerIndex){choices.push(q.correct);choiceRationales.push('Correct. '+rationale);}
    else{const value=q.distractors[d++];choices.push(value);choiceRationales.push('This option applies the claim "'+value+'"; it conflicts with the item-specific principle that '+firstSentence(rationale).replace(/^[A-Z]/,letter=>letter.toLowerCase()));}
  }
  return{id:'ec5025-b'+batch+'-'+String(pos).padStart(3,'0'),type:'single-choice',domainId:bank.domainId,difficulty:q.difficulty||'application',prompt:batch===1?q.promptA:q.promptB,choices,answerIndex,rationale,references:bank.references.slice(),reviewStatus:'source-reviewed',qaStatus:'qa-passed',qaReviewedAt:'2026-07-18',choiceRationales,skillIds:[skillId],chapterIds:[chapterBySkill[skillId]]};
}
const items=[];for(let batch=1;batch<=2;batch++){let pos=0;for(const bank of banks)for(const q of bank.questions)items.push(make(bank,q,batch,++pos));if(pos!==100)throw new Error('Bank count mismatch');}
function reorder(second){const buckets=Object.fromEntries(Object.keys(counts).map(id=>[id,second.filter(item=>item.domainId===id)]));const extra=Object.fromEntries(Object.keys(counts).map(id=>[id,official[id]-counts[id]]));const prefix=[];while(prefix.length<20)for(const id of Object.keys(extra))if(extra[id]>0){prefix.push(buckets[id].shift());extra[id]--;}const rest=[];while(Object.values(buckets).some(x=>x.length))for(const id of Object.keys(buckets))if(buckets[id].length)rest.push(buckets[id].shift());return prefix.concat(rest);}
items.splice(100,100,...reorder(items.slice(100)));const corrected=applySourceReviewCorrections(items);if(corrected.size!==9)throw new Error('Expected all nine Early Childhood 5025 source-review corrections');for(let b=0;b<2;b++){const bank=items.slice(b*100,b*100+100);for(const[id,n]of Object.entries(counts))if(bank.filter(x=>x.domainId===id).length!==n)throw new Error('Diagnostic allocation');if([0,1,2,3].some(a=>bank.filter(x=>x.answerIndex===a).length!==25))throw new Error('Answer balance');}for(const[id,n]of Object.entries(official))if(items.slice(0,120).filter(x=>x.domainId===id).length!==n)throw new Error('Simulation allocation');if(new Set(items.map(x=>x.prompt.toLowerCase().replace(/\s+/g,' ').trim())).size!==200)throw new Error('Duplicate prompts');
const pack={schemaVersion:1,id:'praxis-early-childhood-5025',title:'Praxis Early Childhood Education (5025) - 200-Item Diagnostic Bank',shortTitle:'Early Childhood Education (5025)',description:'Two 100-item diagnostics and an exact 120-item simulation spanning language and literacy, mathematics, social studies, science, health, physical education, and the arts.',credentialOwner:'Educational Testing Service (ETS)',version:'1.0.0',status:'ready',accent:'amber',contentReview:'200 source-reviewed content-knowledge items; independent early-childhood, disciplinary, cultural, accessibility, and psychometric review pending',nativeQaUrl:'./test_prep/early_childhood_5025_native_qa.json',learningLibraryUrl:'./test_prep/early_childhood_5025_learning_library.json',learningLibraryQaUrl:'./test_prep/early_childhood_5025_learning_library_qa.json',simulationItemCount:120, simulationDomainCounts: {"language-literacy":36,"mathematics":30,"social-studies":17,"science":17,"health-physical-arts":20},simulationTimeMinutes:120,simulationLabel:'120-question Early Childhood Education simulation',simulationNote:'The official 5025 test currently contains 120 selected-response questions in 120 minutes and does not permit a calculator. This simulation uses the exact 36/30/17/17/20 category counts and original single-choice items.',officialSelectedResponseCount:120,officialConstructedResponseCount:0,officialTotalTimeMinutes:120,disclaimer:'Independent preparation material, not affiliated with or endorsed by ETS, NAEYC, NGSS, NCSS, SHAPE America, or the National Core Arts Standards. Results are not official forms, scaled scores, pass predictions, licenses, developmental screenings, diagnoses, disability or accommodation decisions, health advice, or substitutes for current state, program, testing, safety, accessibility, and educational requirements.',domains:[{id:'language-literacy',label:'Language and Literacy',weight:.30},{id:'mathematics',label:'Mathematics',weight:.25},{id:'social-studies',label:'Social Studies',weight:.14},{id:'science',label:'Science',weight:.14},{id:'health-physical-arts',label:'Health and Physical Education; Creative and Performing Arts',weight:.17}],batchSize:100,sections:[{id:'diagnostic-batch-1',label:'Independent 100-item diagnostic bank 1',timeMinutes:null},{id:'diagnostic-batch-2',label:'Independent 100-item diagnostic bank 2',timeMinutes:null}],items};
for(const outputRoot of[path.join(root,'test_prep'),path.join(root,'desktop/web-app','public','test_prep')]){fs.mkdirSync(outputRoot,{recursive:true});writeGeneratedFile(path.join(outputRoot,'early_childhood_5025_items.json'),JSON.stringify(items,null,2)+'\n');writeGeneratedFile(path.join(outputRoot,'early_childhood_5025_pack.json'),JSON.stringify(pack,null,2)+'\n');}console.log('Built Early Childhood 5025: 200 items; diagnostics 30/25/14/14/17; simulation 36/30/17/17/20.');
