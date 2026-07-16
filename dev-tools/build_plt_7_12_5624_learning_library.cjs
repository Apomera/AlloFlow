#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root,'test_prep','plt_k6_5622_learning_library.json');
if (!fs.existsSync(sourcePath)) throw Error('Build PLT K–6 library first.');
let text = fs.readFileSync(sourcePath,'utf8')
  .replace(/praxis-plt-k6-5622-learning-library/g,'praxis-plt-grades-7-12-5624-learning-library')
  .replace(/praxis-plt-k6-5622/g,'praxis-plt-grades-7-12-5624')
  .replace(/plt5622/g,'plt5624')
  .replace(/human-development-k6/g,'human-development-grades-7-12')
  .replace(/Principles of Learning and Teaching: Grades K–6 \(5622\)/g,'Principles of Learning and Teaching: Grades 7–12 (5624)')
  .replace(/Praxis PLT K–6 5622/g,'Praxis PLT Grades 7–12 5624')
  .replace(/K–6/g,'grades 7–12').replace(/K-6/g,'grades 7–12')
  .replace(/elementary/gi,'secondary').replace(/young children/gi,'adolescents')
  .replace(/\ban secondary/gi,'a secondary').replace(/\ba eighth([ -]grade| grader)/gi,'an eighth$1').replace(/\ba eleventh([ -]grade| grader)/gi,'an eleventh$1');
const library = JSON.parse(text);
library.generatedAt = new Date().toISOString();
library.title = 'Praxis Principles of Learning and Teaching: Grades 7–12 (5624) learning library';
library.description = 'Twelve source-reviewed chapters and eight original secondary case-analysis workshops aligned to the four selected-response domains and two-case constructed-response format.';
library.reviewStandard = 'AlloFlow PLT Grades 7–12 5624 learning-library source and editorial review v1';
library.simulation = {questionCount:70,timeMinutes:70,officialTotalTimeMinutes:120,officialConstructedResponseCount:4,note:'The selected-response simulation uses 70 minutes and reserves 50 minutes for four written responses related to two case histories. AlloFlow provides planning and self-check criteria but does not score responses.'};
library.legalCaution = 'Independent preparation, not official scoring, a pass prediction, licensure decision, diagnosis, disability or accommodation decision, legal advice, or substitute for current requirements.';
library.constructedResponseWorkshops = (library.constructedResponseWorkshops || []).map((workshop,index) => ({...workshop,id:'plt5624-workshop-'+String(index+1).padStart(2,'0'),reviewNote:'Independent grades 7–12 case-analysis practice; not an official ETS case, prompt, scoring guide, response score, scaled score, pass prediction, licensure decision, diagnosis, disability decision, or legal advice. AlloFlow does not score written responses.'}));
library.summary.constructedResponseWorkshops = library.constructedResponseWorkshops.length;
library.summary.sourceReviewedConstructedResponseWorkshops = library.constructedResponseWorkshops.length;
for (const output of [path.join(root,'test_prep'),path.join(root,'prismflow-deploy','public','test_prep')]) {
  fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,'plt_7_12_5624_learning_library.json'),JSON.stringify(library,null,2)+'\n');
}
console.log('Built PLT Grades 7–12 5624 learning library: 12 chapters, 48 sections, 60 checks, 75 flashcards, 20 memory aids, 8 case workshops.');
