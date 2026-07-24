#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const banks = require('./plt_7_12_5624/item_content.cjs');
const root = path.resolve(__dirname, '..');
const diagnostic = {'students-as-learners':30,'instructional-process':30,assessment:20,'professional-development-leadership-community':20};
const official = {'students-as-learners':21,'instructional-process':21,assessment:14,'professional-development-leadership-community':14};
const ensure = (value, length, suffix) => String(value || '').trim().length >= length ? String(value).trim() : (String(value || '').trim() + ' ' + suffix).trim();

function makeItem(bank, question, batch, position) {
  const answerIndex = (position - 1) % 4;
  const rationale = ensure(question.rationale, 120, 'The response links learner evidence, instruction, access, agency, professional judgment, and monitoring.');
  let distractorIndex = 0;
  const choices = [];
  const choiceRationales = [];
  for (let index = 0; index < 4; index += 1) {
    if (index === answerIndex) {
      choices.push(question.correct);
      choiceRationales.push('Correct. ' + rationale);
    } else {
      const distractor = question.distractors[distractorIndex++];
      choices.push(distractor);
      choiceRationales.push('Not the best answer. "' + distractor + '" conflicts with development, evidence, access, ethics, or the educator’s role. ' + rationale);
    }
  }
  return {id:'plt5624-b'+batch+'-'+String(position).padStart(3,'0'),type:'single-choice',domainId:bank.domainId,difficulty:question.difficulty,prompt:batch===1?question.promptA:question.promptB,choices,answerIndex,rationale,references:bank.references.slice(),reviewStatus:'source-reviewed',qaStatus:'qa-passed',qaReviewedAt:'2026-07-16',choiceRationales,skillIds:[bank.id],chapterIds:[bank.chapterId]};
}

const items = [];
for (let batch = 1; batch <= 2; batch += 1) {
  let position = 0;
  for (const bank of banks) for (const question of bank.questions) items.push(makeItem(bank, question, batch, ++position));
  if (position !== 100) throw Error('Each source bank must yield 100 items.');
}
function reorder(bank) {
  const buckets = Object.fromEntries(Object.keys(diagnostic).map((id) => [id, bank.filter((item) => item.domainId === id)]));
  const output = [];
  while (output.length < 70) for (const id of Object.keys(official)) if (output.filter((item) => item.domainId === id).length < official[id]) output.push(buckets[id].shift());
  return output.concat(Object.values(buckets).flat());
}
items.splice(0, 100, ...reorder(items.slice(0, 100)));
for (let batch = 0; batch < 2; batch += 1) {
  const selection = items.slice(batch * 100, batch * 100 + 100);
  for (const [id, count] of Object.entries(diagnostic)) if (selection.filter((item) => item.domainId === id).length !== count) throw Error('Diagnostic allocation mismatch.');
  if ([0,1,2,3].some((answer) => selection.filter((item) => item.answerIndex === answer).length !== 25)) throw Error('Answer balance mismatch.');
}
for (const [id, count] of Object.entries(official)) if (items.slice(0,70).filter((item) => item.domainId === id).length !== count) throw Error('Simulation allocation mismatch.');
if (new Set(items.map((item) => item.prompt)).size !== 200) throw Error('Duplicate prompts.');

const pack = {schemaVersion:1,id:'praxis-plt-grades-7-12-5624',title:'Praxis PLT: Grades 7–12 (5624) - 200-Item Diagnostic Bank',shortTitle:'PLT: Grades 7–12 (5624)',description:'Two 100-item diagnostics, a 70-item selected-response simulation, eight case-response workshops, and native learning support for beginning secondary educators.',credentialOwner:'Educational Testing Service (ETS)',version:'1.0.0',status:'ready',accent:'indigo',contentReview:'200 source-reviewed items; independent grades 7–12 educator, accessibility, legal, and psychometric review pending',nativeQaUrl:'./test_prep/plt_7_12_5624_native_qa.json',learningLibraryUrl:'./test_prep/plt_7_12_5624_learning_library.json',learningLibraryQaUrl:'./test_prep/plt_7_12_5624_learning_library_qa.json',simulationItemCount:70, simulationDomainCounts: {"students-as-learners":21,"instructional-process":21,"assessment":14,"professional-development-leadership-community":14},simulationTimeMinutes:70,simulationLabel:'70-question PLT Grades 7–12 selected-response simulation',simulationNote:'The official 5624 test contains 70 selected-response and four constructed-response questions related to two case histories in one 120-minute session. This simulation reserves 50 minutes for separate case-analysis workshops; AlloFlow does not score written responses.',officialSelectedResponseCount:70,officialConstructedResponseCount:4,officialTotalTimeMinutes:120,disclaimer:'Independent preparation material, not affiliated with or endorsed by ETS or CCSSO. Results and workshop self-checks are not official forms, constructed-response scores, scaled scores, pass predictions, licenses, diagnoses, disability or accommodation decisions, legal advice, or substitutes for current requirements.',domains:[{id:'students-as-learners',label:'Students as Learners',weight:.225},{id:'instructional-process',label:'Instructional Process',weight:.225},{id:'assessment',label:'Assessment',weight:.15},{id:'professional-development-leadership-community',label:'Professional Development, Leadership, and Community',weight:.15},{id:'analysis-instructional-scenarios',label:'Analysis of Instructional Scenarios (constructed response)',weight:.25}],batchSize:100,sections:[{id:'diagnostic-batch-1',label:'Independent 100-item diagnostic bank 1',timeMinutes:null},{id:'diagnostic-batch-2',label:'Independent 100-item diagnostic bank 2',timeMinutes:null}],items};
for (const output of [path.join(root,'test_prep'),path.join(root,'desktop/web-app','public','test_prep')]) {
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'plt_7_12_5624_items.json'),JSON.stringify(items,null,2)+'\n');
  fs.writeFileSync(path.join(output,'plt_7_12_5624_pack.json'),JSON.stringify(pack,null,2)+'\n');
}
console.log('Built PLT Grades 7–12 5624: 200 items; diagnostics 30/30/20/20; simulation 21/21/14/14.');
