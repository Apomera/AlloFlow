#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),banks=require('./school_librarian_5312/item_content.cjs'),root=path.resolve(__dirname,'..');
const diagnostic={'program-administration':20,'organization-access':19,'information-access-learning-environment':20,'teaching-learning':29,'professional-development-leadership-advocacy':12};
const official={'program-administration':24,'organization-access':23,'information-access-learning-environment':24,'teaching-learning':35,'professional-development-leadership-advocacy':14};
const additions=Object.fromEntries(Object.keys(official).map(id=>[id,official[id]-diagnostic[id]]));
function learningLink(bank,q){
  const ordinal=bank.questions.indexOf(q)+1;
  let chapterNumber,skillNumber;
  if(bank.id==='program-administration'){
    [chapterNumber,skillNumber]=ordinal<=8?[1,1]:[2,2];
  }else if(bank.id==='organization-access'){
    [chapterNumber,skillNumber]=(ordinal<=4||(ordinal>=9&&ordinal<=12))?[3,1]:[4,2];
  }else if(bank.id==='information-access-learning-environment'){
    [chapterNumber,skillNumber]=ordinal<=8?[5,1]:[6,2];
  }else if(bank.id==='teaching-learning'){
    if(ordinal<=8)[chapterNumber,skillNumber]=[7,1];
    else if(ordinal<=16)[chapterNumber,skillNumber]=[8,2];
    else if(ordinal<=24)[chapterNumber,skillNumber]=[9,3];
    else [chapterNumber,skillNumber]=[10,4];
  }else{
    [chapterNumber,skillNumber]=ordinal<=4?[11,1]:[12,2];
  }
  return{skillId:bank.id+'-'+String(skillNumber).padStart(2,'0'),chapterId:'sl5312-ch-'+String(chapterNumber).padStart(2,'0')};
}
function makeItem(bank,q,batch,pos){
  const answerIndex=(pos-1)%4,choices=[],choiceRationales=[],link=learningLink(bank,q);let d=0;
  for(let i=0;i<4;i++){
    if(i===answerIndex){choices.push(q.correct);choiceRationales.push('Correct. '+q.rationale)}
    else{const wrong=q.distractors[d++];choices.push(wrong);choiceRationales.push('Not the best answer. "'+wrong+'" substitutes a narrow, unsupported, inequitable, or procedurally weak action for the evidence-based approach. '+q.rationale)}
  }
  return{id:'sl5312-b'+batch+'-'+String(pos).padStart(3,'0'),type:'single-choice',domainId:bank.id,difficulty:q.difficulty,prompt:batch===1?q.promptA:q.promptB,choices,answerIndex,rationale:q.rationale,references:bank.references.slice(),reviewStatus:'source-reviewed',qaStatus:'qa-passed',qaReviewedAt:'2026-07-16',choiceRationales,skillIds:[link.skillId],chapterIds:[link.chapterId]}
}
const items=[];for(let batch=1;batch<=2;batch++){let pos=0;for(const bank of banks)for(const q of bank.questions)items.push(makeItem(bank,q,batch,++pos));if(pos!==100)throw Error('Each diagnostic must contain 100 items')}
function frontload(selection,counts){const buckets=Object.fromEntries(Object.keys(diagnostic).map(id=>[id,selection.filter(x=>x.domainId===id)])),front=[];let remaining=true;while(remaining){remaining=false;for(const id of Object.keys(counts))if(front.filter(x=>x.domainId===id).length<counts[id]){front.push(buckets[id].shift());remaining=true}}return front.concat(Object.values(buckets).flat())}
items.splice(100,100,...frontload(items.slice(100,200),additions));
for(let b=0;b<2;b++){const x=items.slice(b*100,b*100+100);for(const[id,n]of Object.entries(diagnostic))if(x.filter(i=>i.domainId===id).length!==n)throw Error('Diagnostic allocation mismatch');if([0,1,2,3].some(a=>x.filter(i=>i.answerIndex===a).length!==25))throw Error('Answer balance mismatch')}
for(const[id,n]of Object.entries(official))if(items.slice(0,120).filter(i=>i.domainId===id).length!==n)throw Error('Official simulation mismatch');if(new Set(items.map(i=>i.prompt)).size!==200)throw Error('Duplicate prompts');
const pack={schemaVersion:1,id:'praxis-school-librarian-5312',title:'Praxis School Librarian (5312) - 200-Item Diagnostic Bank',shortTitle:'School Librarian (5312)',description:'Two 100-item diagnostics and a 120-item simulation with source-rich feedback and learning support for beginning school librarians.',credentialOwner:'Educational Testing Service (ETS)',version:'1.0.0',status:'ready',accent:'amber',contentReview:'200 source-reviewed items; independent school-librarian, accessibility, legal, and psychometric review pending',nativeQaUrl:'./test_prep/school_librarian_5312_native_qa.json',learningLibraryUrl:'./test_prep/school_librarian_5312_learning_library.json',learningLibraryQaUrl:'./test_prep/school_librarian_5312_learning_library_qa.json',simulationItemCount:120, simulationDomainCounts: {"program-administration":24,"organization-access":23,"information-access-learning-environment":24,"teaching-learning":35,"professional-development-leadership-advocacy":14},simulationTimeMinutes:120,simulationLabel:'120-question School Librarian simulation',simulationNote:'The simulation matches the published 5312 question count, time, and five-domain distribution. It uses single-choice practice items; the official test may use several selected-response interaction types.',officialSelectedResponseCount:120,officialTotalTimeMinutes:120,disclaimer:'Independent preparation material, not affiliated with or endorsed by ETS, AASL, or ALA. Results are not official forms, scaled scores, pass predictions, licenses, legal advice, copyright determinations, privacy determinations, or substitutes for current state and local requirements.',domains:[{id:'program-administration',label:'Program Administration',weight:.20},{id:'organization-access',label:'Organization and Access',weight:.19},{id:'information-access-learning-environment',label:'Information Access in the Learning Environment',weight:.20},{id:'teaching-learning',label:'Teaching and Learning',weight:.29},{id:'professional-development-leadership-advocacy',label:'Professional Development, Leadership, and Advocacy',weight:.12}],batchSize:100,sections:[{id:'diagnostic-batch-1',label:'Independent 100-item diagnostic batch 1',timeMinutes:null},{id:'diagnostic-batch-2',label:'Independent 100-item diagnostic batch 2',timeMinutes:null}],items};
for(const out of[path.join(root,'test_prep'),path.join(root,'desktop/web-app','public','test_prep')]){fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'school_librarian_5312_items.json'),JSON.stringify(items,null,2)+'\n');fs.writeFileSync(path.join(out,'school_librarian_5312_pack.json'),JSON.stringify(pack,null,2)+'\n')}console.log('Built School Librarian 5312: 200 items; diagnostics 20/19/20/29/12; simulation 24/23/24/35/14.');
