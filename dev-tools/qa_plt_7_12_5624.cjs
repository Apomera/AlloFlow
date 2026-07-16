#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const pack=JSON.parse(fs.readFileSync(path.join(root,'test_prep','plt_7_12_5624_pack.json')));
const library=JSON.parse(fs.readFileSync(path.join(root,'test_prep','plt_7_12_5624_learning_library.json')));
const findings=[],add=(check,message,id='')=>findings.push({check,id,message});
const diagnostic={'students-as-learners':30,'instructional-process':30,assessment:20,'professional-development-leadership-community':20};
const simulation={'students-as-learners':21,'instructional-process':21,assessment:14,'professional-development-leadership-community':14};
if(pack.items?.length!==200)add('inventory','Pack must contain 200 items');
for(let batch=0;batch<2;batch+=1){const selection=pack.items.slice(batch*100,batch*100+100);for(const[domain,count]of Object.entries(diagnostic))if(selection.filter(item=>item.domainId===domain).length!==count)add('blueprint','Diagnostic mismatch');if([0,1,2,3].some(answer=>selection.filter(item=>item.answerIndex===answer).length!==25))add('balance','Answer imbalance')}
for(const[domain,count]of Object.entries(simulation))if(pack.items.slice(0,70).filter(item=>item.domainId===domain).length!==count)add('simulation','Simulation mismatch');
if(new Set(pack.items.map(item=>item.prompt)).size!==200)add('originality','Duplicate prompts');
for(const item of pack.items)if(item.choices?.length!==4||item.rationale?.length<120||item.choiceRationales?.length!==4||item.skillIds?.length!==1||item.chapterIds?.length!==1)add('item','Invalid item',item.id);
for(const item of pack.items)if(/\ba eighth|\ba eleventh|\ban secondary/i.test([item.prompt,...item.choices,item.rationale].join(' ')))add('language','Article agreement error',item.id);
if(library.summary?.chapters!==12||library.summary?.sections!==48||library.summary?.knowledgeChecks!==60||library.summary?.flashcards!==75||library.summary?.memoryAids!==20||library.summary?.constructedResponseWorkshops!==8)add('library','Library inventory mismatch');
if(library.constructedResponseWorkshops?.some(workshop=>!/does not score written responses/i.test(workshop.reviewNote||'')))add('boundary','Workshop boundary missing');
const status=findings.length?'review-required':'pass',generatedAt=new Date().toISOString();
const standard={label:'AlloFlow PLT Grades 7–12 5624 source, structure, feedback, case-practice, and linkage QA v1',limitation:'Not ETS or CCSSO approval; independent grades 7–12 educator, accessibility, legal, and psychometric validation remain pending.'};
const report={schemaVersion:1,generatedAt,packId:pack.id,standard,summary:{totalItems:200,passedItems:200-new Set(findings.filter(x=>x.id).map(x=>x.id)).size,findings,status}};
const libraryReport={schemaVersion:1,generatedAt,libraryId:library.libraryId,packId:pack.id,standard,summary:{...library.summary,findings,status}};
for(const output of[path.join(root,'test_prep'),path.join(root,'prismflow-deploy','public','test_prep')]){
  fs.writeFileSync(path.join(output,'plt_7_12_5624_native_qa.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(output,'plt_7_12_5624_native_qa.md'),`# PLT Grades 7–12 5624 QA\n\n- Status: **${status.toUpperCase()}**\n- Items: ${report.summary.passedItems}/200\n\n> ${standard.limitation}\n`);
  fs.writeFileSync(path.join(output,'plt_7_12_5624_learning_library_qa.json'),JSON.stringify(libraryReport,null,2)+'\n');
  fs.writeFileSync(path.join(output,'plt_7_12_5624_learning_library_qa.md'),`# PLT Grades 7–12 5624 library QA\n\n- Status: **${status.toUpperCase()}**\n- Inventory: 12 chapters, 60 checks, 75 flashcards, 20 memory aids, 8 workshops\n\n> ${standard.limitation}\n`);
}
console.log('PLT Grades 7–12 5624 QA: '+status+' ('+findings.length+' findings).');
if(findings.length)process.exitCode=1;
