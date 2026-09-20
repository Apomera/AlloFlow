'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),service=require('../agent_core_resource_pack_module.js'),{validateAnswers}=require('./lib/allopack_answer_integrity.cjs');
const files=['allopacks','allopacks/illustrated'].flatMap(dir=>fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.allopack.json')).map(f=>dir+'/'+f));
const report={date:'2026-09-19',scope:'All quiz/math resources audited for catalog answer structure; generated-pack objective and reference checks applied to all existing pack files. Not factual verification or full generated-draft compatibility.',packs:files.length,quizResources:0,mathResources:0,questions:0,mathProblems:0,objectives:0,errors:[]};
for(const file of files){const p=JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\uFEFF/,''));for(const r of p.history){if(r.type==='quiz'){report.quizResources++;report.questions+=r.data.questions.length;}if(r.type==='math'){report.mathResources++;report.mathProblems+=r.data.problems.length;}if(r.type==='directions')report.objectives+=(r.data.objectives||[]).length;}
 const answers=validateAnswers(p);const boundary=service.validatePack(p,{strict:false}).errors||[];
 const refs=boundary.filter(e=>['invalid-resource-reference','unresolved-resource-reference','invalid-lesson-reference'].includes(e.code)||e.path.includes('.objectives'));
 report.errors.push(...answers.map(e=>({file,...e})),...refs.map(e=>({file,...e})));
}
report.status=report.errors.length?'failed':'passed';const dir=path.join(root,'docs/allopack-quality-2026-09-19');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'answer-and-reference-validation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.equal(report.errors.length,0);
assert.equal(fs.readFileSync(path.join(root,'agent_core_resource_pack_module.js'),'utf8'),fs.readFileSync(path.join(root,'desktop/web-app/public/agent_core_resource_pack_module.js'),'utf8'),'Desktop module mirror differs');
