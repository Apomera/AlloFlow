#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const sourceDir=path.join(root,'test_prep');
const deployDir=path.join(root,'desktop/web-app','public','test_prep');
const waitBuffer=new Int32Array(new SharedArrayBuffer(4));
function writeGeneratedFile(file,data){let error;for(let attempt=1;attempt<=8;attempt++){try{fs.writeFileSync(file,data);return}catch(caught){error=caught;if(attempt<8)Atomics.wait(waitBuffer,0,0,150*attempt)}}throw error}

const targeted=JSON.parse(fs.readFileSync(path.join(__dirname,'test_prep_source_review_overrides_targeted_2026-07-16.json'),'utf8'));
const retiredTargetedStems=new Set(['special_education_early_childhood_5692']);
// These two instruction ranges are now authored durably in their item-content
// generators. Do not mask them with the older partial postpass replacements.
const authoredFiles=[];

function choiceFeedback(choices,answerIndex,rationale,notes){
  return choices.map((choice,index)=>index===answerIndex?'Correct. '+rationale:'Not the best answer. '+notes[index]+' '+rationale);
}

const localPatches={
  praxis_core_5752:{
    'core5752-b2-071':{
      prompt:'A printer uses 3 liters of ink for 2 production runs. At the same rate, how many liters of ink are used for 5 runs?',
      choices:['3.3 liters','6 liters','7.5 liters','10 liters'],answerIndex:2,
      rationale:'The unit rate is 3 divided by 2, or 1.5 liters per run. Multiplying 1.5 liters per run by 5 runs gives 7.5 liters, a continuous quantity that does not require rounding to a whole container.',
      notes:['This divides or scales the quantities incorrectly.','This does not maintain the stated ratio of ink to runs.','', 'This multiplies the number of runs without using the 3-to-2 rate.']
    }
  },
  special_education_learning_disabilities_5383:{
    'ld5383-b1-053':{prompt:'During explicit literacy instruction for a student with a learning disability, what combination of supports best promotes engagement with grade-level text?'},
    'ld5383-b2-053':{prompt:'A capable student with a learning disability avoids reading because assigned texts feel irrelevant and successful reading is rare. Which response best supports engagement while preserving meaningful literacy instruction?'}
  },
  special_education_behavior_emotional_5372:{
    'ebd5372-b2-010':{
      prompt:'During independent writing, a student accurately completes brief responses but tears the paper when an assignment requires organizing several paragraphs. What should guide the team’s initial support?',
      choices:['Provide the same consequence after every incomplete assignment.','Define the paper tearing observably, compare task conditions and consequences, and match instruction and a replacement request to the documented pattern.','Infer a global lack of motivation from the writing behavior.','Have an adult permanently complete all multistep writing for the student.'],answerIndex:1,
      rationale:'The uneven pattern calls for direct, contextual evidence rather than a label-based assumption. Operational definition and observation across task demands can clarify relevant antecedents and consequences so the team can teach an efficient help or break request while preserving access to writing instruction.',
      notes:['A uniform consequence ignores the conditions associated with the behavior and does not teach an alternative.','', 'A global motive is not established by the observed task-specific pattern.','Permanent adult completion removes instruction and can strengthen escape from difficult work.']
    }
  },
  special_education_intellectual_disabilities_5322:{
    'id5322-b2-010':{
      prompt:'A student with an intellectual disability independently follows a familiar classroom schedule but needs several prompts when the schedule changes for an assembly. What should guide support?',
      choices:['Assume the student cannot learn any schedule without continuous adult direction.','Analyze the changed cues and adaptive demands, teach a flexible schedule-checking routine with accessible supports, and fade prompts while monitoring independence.','Remove all schedule changes from the student’s school day.','Use the student’s disability label as the only evidence needed to select a prompt level.'],answerIndex:1,
      rationale:'Performance can differ when routines and environmental cues change. Instruction should target the specific adaptive demand with accessible cues, systematic prompting and fading, and data on independent use rather than treating the disability label as a fixed prediction of performance.',
      notes:['This assumes inability and creates prompt dependence without testing teachable supports.','', 'Eliminating ordinary changes prevents instruction and meaningful participation.','A label alone does not identify the student’s current skill, context, or effective support.']
    }
  },
  special_education_severe_profound_5547:{
    'sp5547-b2-010':{
      prompt:'A student with multiple disabilities usually activates a switch to continue a preferred activity but has stopped responding and appears unusually drowsy. What should guide the team’s immediate response?',
      choices:['Increase prompting until the student activates the switch.','Follow the individualized health and safety plan, check for a possible medical or access change with designated personnel, document observations, and avoid treating the change as refusal.','Remove the switch permanently because the student no longer understands cause and effect.','Wait several days before communicating the change so the team has a larger data set.'],answerIndex:1,
      rationale:'A sudden change in alertness and established performance may signal a health, sensory, positioning, fatigue, medication, or access concern. The individualized plan and designated health personnel should guide a timely, documented response before staff make behavioral or ability assumptions.',
      notes:['More prompting may be unsafe and does not address a sudden change in alertness or access.','', 'One performance change does not establish loss of understanding or justify removing communication access.','Delaying communication can miss a time-sensitive health or safety concern.']
    }
  }
};

for(const pack of Object.values(localPatches))for(const patch of Object.values(pack)){
  if(patch.choices&&patch.notes)patch.choiceRationales=choiceFeedback(patch.choices,patch.answerIndex,patch.rationale,patch.notes);
  delete patch.notes;
}

const byStem={};
for(const entry of targeted)if(!retiredTargetedStems.has(entry.stem))(byStem[entry.stem]||(byStem[entry.stem]={}))[entry.id]=entry.item;
for(const [stem,file] of authoredFiles){
  const entries=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));
  if(entries.length!==34)throw Error(`${file}: expected 34 authored replacements, found ${entries.length}`);
  for(const entry of entries)(byStem[stem]||(byStem[stem]={}))[entry.id]=entry;
}

const misplacedLdSentence=' For 5383 preparation, connect the response to the learner’s uneven skill profile, explicit and systematic instruction, appropriate access, culturally and linguistically responsive evidence, and observable progress rather than assuming that a learning-disability label predicts performance.';
function cleanString(value,stem){
  let text=value
    .split(misplacedLdSentence).join('')
    .replace(/\b([A-Za-z]+)\?s\b/g,"$1's")
    .replace(/\byoung childs\b/gi,'young children')
    .replace(/\bA early\b/g,'An early').replace(/\ba early\b/g,'an early')
    .replace(/\bA elementary\b/g,'An elementary').replace(/\ba elementary\b/g,'an elementary')
    .replace(/\bA inclusive\b/g,'An inclusive').replace(/\ba inclusive\b/g,'an inclusive');
  text=text.replace(/phoneme\?grapheme/g,'phoneme–grapheme')
    .replace(/cannot segment \?map\.\?/g,'cannot segment the word map.')
    .replace(/spells \?jumped\? as \?jumpt\? and \?running\? as \?runing\.\?/g,'spells “jumped” as “jumpt” and “running” as “runing.”');
  if(stem==='early_childhood_5025')text=text.replace(/\bK–6\b/g,'early-childhood and early-elementary');
  return text;
}
function clean(value,stem){
  if(typeof value==='string')return cleanString(value,stem);
  if(Array.isArray(value))return value.map(entry=>clean(entry,stem));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,clean(entry,stem)]));
  return value;
}

let corrected=0;
for(const packFile of fs.readdirSync(sourceDir).filter(name=>name.endsWith('_pack.json')).sort()){
  const stem=packFile.slice(0,-'_pack.json'.length);
  if(stem.startsWith('eppp'))continue;
  const file=path.join(sourceDir,packFile),pack=JSON.parse(fs.readFileSync(file,'utf8'));
  if(!Array.isArray(pack.items)||pack.items.length<200)continue;
  const overrides=byStem[stem]||{},patches=localPatches[stem]||{};
  const sourceItems=pack.items.slice(0,200).map(item=>{
    let next=overrides[item.id]?{...item,...overrides[item.id]}:item;
    if(patches[item.id])next={...next,...patches[item.id]};
    if(overrides[item.id]||patches[item.id])corrected++;
    next=clean(next,stem);
    if(!Array.isArray(next.choices)||next.choices.length!==4||!Number.isInteger(next.answerIndex)||next.answerIndex<0||next.answerIndex>3)throw Error(`${stem}/${next.id}: invalid answer shape`);
    if(!Array.isArray(next.choiceRationales)||next.choiceRationales.length!==4)throw Error(`${stem}/${next.id}: invalid choice feedback`);
    return next;
  });
  for(const id of [...Object.keys(overrides),...Object.keys(patches)])if(!sourceItems.some(item=>item.id===id))throw Error(`${stem}: override item ${id} not found`);
  pack.items=[...sourceItems,...pack.items.slice(200)];
  const packJson=JSON.stringify(pack,null,2)+'\n';
  const itemsJson=JSON.stringify(pack.items,null,2)+'\n';
  for(const dir of[sourceDir,deployDir]){
    writeGeneratedFile(path.join(dir,packFile),packJson);
    writeGeneratedFile(path.join(dir,stem+'_items.json'),itemsJson);
  }
}
console.log(`Applied ${corrected} item-specific source-review corrections plus global editorial cleanup.`);
