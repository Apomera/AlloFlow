'use strict';
// Canonical final wording/provenance layer used by the dated migration and tests.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {factHash,reviewedFacts}=require('./allopack_fact_review.cjs');
const root=path.resolve(__dirname,'../..');const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));
const patches=Object.assign({},...['language','science','supports'].map(group=>read('dev-tools/data/allopack_quality_'+group+'_20260919.json')));
const quizzes=read('dev-tools/data/allopack_quality_quizzes_20260919.json');
const scaffolds=read('dev-tools/data/allopack_quality_scaffolds_20260919.json');
function boldTerms(text,terms){const parts=text.split(/(\*\*[^*]+\*\*)/);for(const term of terms){if(parts.some((s,i)=>i%2&&s.toLowerCase().includes(term.toLowerCase())))continue;const re=new RegExp('\\b'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:s)?\\b','i');const i=parts.findIndex((s,i)=>i%2===0&&re.test(s));if(i>=0)parts[i]=parts[i].replace(re,m=>'**'+m+'**');}return parts.join('');}
function apply(pack,slugName,options={}){const file=(options.illustrated===false?'allopacks/':'allopacks/illustrated/')+slugName+'.allopack.json';const state={pack,changes:[]};const p=state.pack,slug=path.basename(file,'.allopack.json'),by=type=>p.history.find(r=>r.type===type),patch=file.includes('/illustrated/')?patches[slug]:null;
 if(scaffolds[slug]){by('sentence-frames').data.items=scaffolds[slug].frames.map(text=>({text}));by('applied-challenge').data.supports.parallelExample=scaffolds[slug].parallelExample;state.changes.push('lesson-specific writing and transfer supports');}
 if(patch){
  if(patch.reading)by('simplified').data=patch.reading;
  for(const[term,def]of Object.entries(patch.glossary||{})){const row=by('glossary').data.find(g=>g.term===term);assert(row,slug+': missing term '+term);row.def=def;}
  if(patch.faq){assert.equal(by('faq').data.length,patch.faq.length,slug+': FAQ count');by('faq').data.forEach((q,i)=>q.answer=patch.faq[i]);}
  if(patch.memory){const cards=by('memory-aid').data.cards;assert.equal(cards.length,patch.memory.length,slug+': memory count');cards.forEach((c,i)=>{[c.aiExample,c.mapping]=patch.memory[i];});}
  if(patch.brief)Object.assign(by('applied-challenge').data.brief,patch.brief);
  if(patch.boldTerms)by('simplified').data=boldTerms(by('simplified').data,by('glossary').data.map(g=>g.term));
  if(patch.sortNote){const d=by('directions').data;if(!d.body.includes(patch.sortNote))d.body+='\n\n'+patch.sortNote;}
  state.changes.push('reviewed lesson wording');
 }
 if(file.includes('/illustrated/')&&quizzes[slug]){
  const questions=by('quiz').data.questions;
  for(const fix of quizzes[slug]){const q=questions.find(q=>q.question.startsWith(fix.match)||q.question===fix.question);assert(q,slug+': missing quiz '+fix.match);if(fix.question)q.question=fix.question;q.options=fix.options.slice();q.correctAnswer=q.options[fix.correct];}
  // Move only answers needed to remove missing positions/strong skew; preserve all keys.
  const mcq=questions.filter(q=>q.type==='mcq');let counts=[0,0,0,0];mcq.forEach(q=>counts[q.options.indexOf(q.correctAnswer)]++);
  for(let tries=0;tries<4;tries++){const low=counts.indexOf(Math.min(...counts)),high=counts.indexOf(Math.max(...counts));if(counts[low]>0&&counts[high]<Math.ceil(mcq.length*.6))break;const q=mcq.find(q=>q.options.indexOf(q.correctAnswer)===high);if(!q||counts[high]-counts[low]<2)break;[q.options[low],q.options[high]]=[q.options[high],q.options[low]];counts[high]--;counts[low]++;}
  state.changes.push('quiz distractors and answer positions');
 }

 const targetEnvelope=options.targetEnvelope||p.allopack;
 if(/educator review pending/i.test([targetEnvelope.author,targetEnvelope.reviewStatus].join(' '))){
  const sourcePack=file.includes('/illustrated/')?read('allopacks/'+slug+'.allopack.json'):null;
  const attributedReview=sourcePack && /reviewed by /i.test(sourcePack.allopack.author||'') && !/review pending/i.test(sourcePack.allopack.author||'');
  let reset=0,inherited=0;
  for(const resource of p.history){const sourceResource=sourcePack?.history.find(r=>r.id===resource.id);
   const walk=(node,prior)=>{if(!node||typeof node!=='object')return;
    if(typeof node.factVerified==='boolean'){
     const facts=node.essentialFacts||node.lockedLessonFacts;
     if(facts && attributedReview && prior?.factVerified===true && JSON.stringify(facts)===JSON.stringify(prior.essentialFacts||prior.lockedLessonFacts)){
      node.factVerified=true;node.factReview={status:'inherited-review-attribution',sourcePack:'allopacks/'+slug+'.allopack.json',sourceResourceId:resource.id,sourceAttribution:sourcePack.allopack.author,factsHash:factHash(facts)};inherited++;
     }else if(!reviewedFacts(node.factReview,facts)){
      if(node.factVerified)reset++;node.factVerified=false;
      if(node.factReview?.status==='inherited-review-attribution')delete node.factReview;
     }
    }
    for(const[k,v]of Object.entries(node))if(v&&typeof v==='object'&&k!=='factReview')walk(v,prior?.[k]);
   };walk(resource.data,sourceResource?.data);
  }
  if(reset)state.changes.push('removed '+reset+' unsupported verified flags');
  if(inherited)state.changes.push('recorded '+inherited+' exact-match source review attributions');
 }
 for(const r of p.history.filter(r=>r.type==='simplified'))if(typeof r.meta==='string'&&/~\s*\d+\s*words/i.test(r.meta)){r.meta=r.meta.replace(/~\s*\d+\s*words/gi,'').split(/[•|]/).map(s=>s.trim()).filter(Boolean).join(' • ');state.changes.push('removed hand-maintained word count');}

// Older illustration refiners replace outline.data wholesale; retain the native activity selector.
 for(const r of p.history.filter(r=>r.type==='outline'))if(!r.data.structureType){const source=read('allopacks/'+slug+'.allopack.json').history.find(x=>x.id===r.id);r.data.structureType=source?.data.structureType||'Key Concept Map';state.changes.push('restored outline activity selector');}
if(slug==='body_systems_grade6'){require('./allopack_body_quality_20260919.cjs').refine(p);state.changes.push('aligned Body Systems investigation and accessible supports');}
return state.changes;
}
module.exports={apply};
