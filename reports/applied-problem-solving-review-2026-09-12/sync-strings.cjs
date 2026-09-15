const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.resolve(__dirname,'../..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'ui_strings.js'),'utf8'));
function set(key,value,overwrite=false){let obj=catalog;const keys=key.split('.');const last=keys.pop();for(const key of keys)obj=obj[key]||(obj[key]={});if(overwrite||typeof obj[last]!=='string')obj[last]=value}
for(const file of ['applied_challenge_source.jsx','doc_pipeline_source.jsx']){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 const re=/(?:tx|tr|_apsT)\((?:t,\s*)?'((?:applied_challenge\.)?[a-z0-9_.]+)',\s*('(?:\\.|[^'\\])*')/g;
 for(const m of source.matchAll(re)){
  if(!m[1].startsWith('applied_challenge.')&&file!=='applied_challenge_source.jsx')continue;
  set(m[1].startsWith('applied_challenge.')?m[1]:'applied_challenge.'+m[1],vm.runInNewContext(m[2]));
 }
}
const overrides={
 'panel.ai_role':'Who frames the problem?',
 'ready.feedback_needs_draft':'Add a written response, or link your work and explain its reasoning, before requesting feedback.',
 'ready.stress_needs_draft':'Add a written response, or link your work and explain its reasoning, before stress-testing it.',
 'review.part.question':'Working question','review.part.response':'My response','review.part.evidence':'Lesson connection','review.part.check':'What I checked','review.part.decision':'Keep or revise, and why','review.part.transfer':'Where else this could help',
 'supports.frameChoices':'Possible directions (one per line)','supports.coachPrompts':'Thinking prompts (one per line)',
 'organizer.investigate.column0':'Question or hypothesis','organizer.investigate.column1':'Evidence needed or collected','organizer.investigate.column2':'Method or limit',
 'organizer.design.column0':'Design option','organizer.design.column1':'Lesson connection','organizer.design.column2':'Constraint or failure point',
 'organizer.decide.column0':'Option','organizer.decide.column1':'Supporting evidence','organizer.decide.column2':'Tradeoff',
 'organizer.propose.column0':'Proposed action','organizer.propose.column1':'Reason or evidence','organizer.propose.column2':'Resource assumption',
 'organizer.explore.column0':'Position or interpretation','organizer.explore.column1':'Supporting reason','organizer.explore.column2':'Counterexample or uncertainty',
 'scope.compact.label':'Quick application','scope.standard.label':'Full challenge','scope.extended.label':'Extended project',
 'scope.compact.description':'A short application with a choice, evidence, one check, and a keep-or-revise decision.',
 'evidence_status.verified.label':'Linked to a reviewed lesson fact','evidence_status.verified.description':'The source fact was reviewed. Explain your own connection; this does not verify your claim.',
 'phase.revision':'9. Keep or revise after checking',
 'stage.understand':'Understand','stage.explore':'Explore','stage.build':'Build','stage.check':'Check','stage.reflect':'Reflect',
 'plan.learningTarget':'Lesson idea to apply','plan.availableTime':'Available time','plan.materials':'Available materials and limits',
 'source.sourceQuote':'Supporting source excerpt','source.sourceLocation':'Source location',
 'example.context':'Parallel example context','example.move':'Reasoning move','example.whyItHelps':'What to notice',
 'export.preset.task':'Student task','export.preset.response':'My response','export.preset.teacher':'Teacher review','export.preset.paper':'Paper organizer',
 'organizer.investigate.heading':'Evidence plan','organizer.investigate.prompt':'Connect a research question to evidence you need, a feasible method, and a limit.',
 'organizer.design.heading':'Design comparison','organizer.design.prompt':'Compare possible designs using a lesson fact, a constraint, and a likely failure point.',
 'organizer.decide.heading':'Compare the options','organizer.decide.prompt':'Use the same criteria for each option. Link evidence and keep the tradeoff visible.',
 'organizer.propose.heading':'Plan and assumptions','organizer.propose.prompt':'Connect an action to the need it serves, its supporting evidence, and a resource assumption.',
 'organizer.explore.heading':'Reasons and alternatives','organizer.explore.prompt':'Compare positions, their supporting reasons, and a counterexample or unresolved question.',
};
Object.entries(overrides).forEach(([key,value])=>set('applied_challenge.'+key,value,true));
const output=JSON.stringify(catalog,null,2)+'\n';fs.writeFileSync(path.join(root,'ui_strings.js'),output);fs.writeFileSync(path.join(root,'desktop/web-app/public/ui_strings.js'),output);
console.log('Applied Challenge English fallbacks registered.');
