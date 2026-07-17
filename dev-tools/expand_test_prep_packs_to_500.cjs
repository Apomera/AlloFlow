#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const waitBuffer=new Int32Array(new SharedArrayBuffer(4));
function writeGeneratedFile(file,data){let error;for(let attempt=1;attempt<=8;attempt++){try{fs.writeFileSync(file,data);return}catch(caught){error=caught;if(attempt<8)Atomics.wait(waitBuffer,0,0,150*attempt)}}throw error}

const sourceDir=path.join(root,'test_prep'),deployDir=path.join(root,'prismflow-deploy','public','test_prep');
// The derivation itself lives in test_prep_guided_expansion_core.cjs — shared
// byte-for-byte with the hub module's runtime derivation (release-build parity gate).
const{compact,inlineQuote,sourceFeedback,expandedItem,deriveGuidedReviewItems}=require('./test_prep_guided_expansion_core.cjs');
function replaceBinaryMathOperator(value, escapedOperator, token) {
  const leftOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\))';
  const rightOperand = '(?:\\d+(?:\\.\\d+)?|[A-Za-z]|\\()';
  const pattern = new RegExp(
    '(^|[^A-Za-z0-9_])(' + leftOperand + ')\\s*' + escapedOperator +
      '\\s*(' + rightOperand + ')(?=$|[^A-Za-z0-9_])',
    'g'
  );
  let normalized = value;
  while (true) {
    const next = normalized.replace(pattern, (_, prefix, left, right) =>
      prefix + left + ' ' + token + ' ' + right
    );
    if (next === normalized) return normalized;
    normalized = next;
  }
}

function normalizeMathOperators(value) {
  let normalized = value
    .replace(/<=|≤/g, ' mathoplte ')
    .replace(/>=|≥/g, ' mathopgte ')
    .replace(/!=|≠/g, ' mathopneq ')
    .replace(/=/g, ' mathopeq ')
    .replace(/</g, ' mathoplt ')
    .replace(/>/g, ' mathopgt ')
    .replace(/×/g, ' mathopmul ')
    .replace(/÷/g, ' mathopdiv ')
    .replace(/−/g, ' mathopminus ')
    .replace(/\+/g, ' mathopplus ')
    .replace(/\^/g, ' mathoppow ');
  normalized = normalized.replace(
    /(^|[\s(\[{,:=<>+*/^])-(?=\s*(?:\d|[A-Za-z]\b))/g,
    (_, prefix) => prefix + ' mathopminus '
  );
  normalized = replaceBinaryMathOperator(normalized, '\\*', 'mathopmul');
  normalized = replaceBinaryMathOperator(normalized, '\\/', 'mathopdiv');
  return replaceBinaryMathOperator(normalized, '-', 'mathopminus');
}

function canonical(value, options = {}) {
  const raw = String(value ?? '').normalize('NFKC');
  const isStandaloneUrl = /^https?:\/\/\S+$/i.test(raw.trim());
  const operatorAware = options.mathOperators !== false && !isStandaloneUrl
    ? normalizeMathOperators(raw)
    : raw;
  return operatorAware
    .toLowerCase()
    .replace(/[“”"'’\u0060]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices?.[item.answerIndex]),
    distractors: (item.choices || [])
      .filter((_, index) => index !== item.answerIndex)
      .map(value => canonical(value))
      .sort(),
    rationale: canonical(item.rationale),
    references: (item.references || [])
      .map(value => canonical(value, { mathOperators: false }))
      .sort(),
  });
}


const countBy=(items,key)=>items.reduce((counts,item)=>(counts[item[key]]=(counts[item[key]]||0)+1,counts),{});
const equalCounts=(left,right)=>JSON.stringify(Object.fromEntries(Object.entries(left).sort()))===JSON.stringify(Object.fromEntries(Object.entries(right).sort()));




function updateQa(stem,pack,findings){
  const name=stem+'_native_qa.json',file=path.join(sourceDir,name);if(!fs.existsSync(file))return;
  const report=JSON.parse(fs.readFileSync(file,'utf8')),summary=report.summary||(report.summary={});
  summary.totalItems=500;summary.passedItems=findings.length?500-findings.length:500;summary.sourceItems=200;summary.distinctSourceContentKernels=pack.distinctSourceContentKernels;summary.parallelSourceVariants=pack.parallelSourceVariants;summary.guidedReasoningItems=300;summary.independentQuestionTarget=500;summary.newIndependentItemsNeeded=pack.newIndependentItemsNeeded;summary.structuralStatus=findings.length?'fail':'pass';summary.contentDistinctnessStatus='target-not-met';summary.assistantReviewVerdict='reviewed-target-not-met';
  if('reviewRequiredItems'in summary)summary.reviewRequiredItems=0;
  summary.diagnosticBanks=5;summary.diagnosticBanksSemantics='legacy-total-learning-activity-bank-alias';summary.sourceDiagnosticBanks=2;summary.guidedReviewBanks=3;summary.learningActivityBanks=5;
  if('bankSize'in summary)summary.bankSize=100;
  if('findings'in summary)summary.findings=Array.isArray(summary.findings)?findings:findings.length;
  if('packFindings'in summary)summary.packFindings=findings;
  if('answerPositions'in summary){const positions=[0,1,2,3].map(answer=>pack.items.filter(item=>item.answerIndex===answer).length);summary.answerPositions=Array.isArray(summary.answerPositions)?positions:Object.fromEntries(['A','B','C','D'].map((label,index)=>[label,positions[index]]))}
  summary.status=findings.length?'structural-fail':'pass';
  if(report.diagnosticBatch){report.diagnosticBatch.batchCount=5;report.diagnosticBatch.batchCountSemantics='legacy-total-learning-activity-bank-alias';report.diagnosticBatch.sourceBatchCount=2;report.diagnosticBatch.guidedReviewBatchCount=3;report.diagnosticBatch.learningActivityBankCount=5}
  report.generatedAt=new Date().toISOString();
  report.expansion={independentQuestionTarget:500,totalLearningActivities:500,batchSize:100,learningActivityBanks:5,sourceItems:200,distinctSourceContentKernels:pack.distinctSourceContentKernels,parallelSourceVariants:pack.parallelSourceVariants,guidedReasoningItems:300,newIndependentItemsNeeded:pack.newIndependentItemsNeeded,structurallyReviewedItems:500,reviewer:'OpenAI Codex',examItemReview:'reviewed-target-not-met',taskForms:['misconception-correction','principle-justification','evidence-comparison'],method:'The assistant reviewed structure and answer derivation across all activities and conducted a cross-domain qualitative sample. Normalized answer-set, rationale, and reference reuse was counted as one source content kernel. The 300 transformations are approved as guided practice only, not as independent exam items.',findings};
  const json=JSON.stringify(report,null,2)+'\n';writeGeneratedFile(file,json);writeGeneratedFile(path.join(deployDir,name),json);
  const mdName=stem+'_native_qa.md',mdFile=path.join(sourceDir,mdName);if(fs.existsSync(mdFile)){let md=fs.readFileSync(mdFile,'utf8').replace(/- Expansion: five 100-item diagnostic batches; 500 total items\.\s*/ig,'').replace(/- Expansion review: two independent 100-item diagnostic batches plus three 100-item guided-review banks; 500 total learning activities\. The guided-review banks are not independent exam-item banks\.\s*/ig,'').replace(/- Assistant audit: 200 source questions contain .*?The 500-distinct-question target is not met\.\s*/ig,'');md+='\n- Assistant audit: 200 source questions contain '+pack.distinctSourceContentKernels+' distinct source content kernels and '+pack.parallelSourceVariants+' parallel variants under the normalized answer-set/rationale/reference test. Three additional 100-item banks are source-derived guided review, not independent exam-item banks. The 500-distinct-question target is not met.\n';writeGeneratedFile(mdFile,md);writeGeneratedFile(path.join(deployDir,mdName),md)}
}

const packFiles=fs.readdirSync(sourceDir).filter(name=>name.endsWith('_pack.json')).sort();let expanded=0;
for(const packFile of packFiles){
  const stem=packFile.slice(0,-'_pack.json'.length),packPath=path.join(sourceDir,packFile),pack=JSON.parse(fs.readFileSync(packPath,'utf8'));
  if(/^eppp/i.test(pack.id||'')||!Array.isArray(pack.items))continue;
  if(pack.items.length<200)throw Error(`${pack.id}: expected at least 200 source items`);
  const base=pack.items.slice(0,200),batch1=base.slice(0,100),batch2=base.slice(100,200);
  if(batch1.length!==100||batch2.length!==100)throw Error(`${pack.id}: two 100-item source batches required`);
  const additions=deriveGuidedReviewItems(base);
  const distinctSourceContentKernels=new Set(base.map(contentKernel)).size,parallelSourceVariants=base.length-distinctSourceContentKernels,newIndependentItemsNeeded=500-distinctSourceContentKernels;pack.items=[...base,...additions];pack.batchSize=100;pack.diagnosticBatchCount=5;pack.diagnosticBatchCountSemantics='legacy-total-learning-activity-bank-alias';pack.sourceDiagnosticBatchCount=2;pack.guidedReviewBatchCount=3;pack.learningActivityBankCount=5;pack.distinctSourceContentKernels=distinctSourceContentKernels;pack.parallelSourceVariants=parallelSourceVariants;pack.newIndependentItemsNeeded=newIndependentItemsNeeded;pack.expansionVersion='source-kernel-audit-plus-guided-review-v1';pack.assistantReview={reviewer:'OpenAI Codex',structurallyReviewedItems:500,sourceItems:200,distinctSourceContentKernels,parallelSourceVariants,guidedReviewItems:300,independentQuestionTarget:500,newIndependentItemsNeeded,verdict:'reviewed-target-not-met',categories:['source alignment','answer-key consistency','distractor plausibility','editorial clarity','accessibility language','structural integrity','content-kernel duplication'],taskForms:['misconception-correction','principle-justification','evidence-comparison'],limitation:'Normalized answer-set, rationale, and reference reuse is counted as one content kernel. Source-derived transformations are approved as guided practice, not as independent exam questions. Assistant review is not independent licensed-professional review or psychometric validation.'};
  pack.title=String(pack.title||'').replace(/(?:200|500)-Item Diagnostic Bank|200-Item Diagnostic \+ 300 Guided Review/gi,'200 Source Questions + 300 Guided Review').replace(/(?:200|500) Item Diagnostic Bank|200 Item Diagnostic \+ 300 Guided Review/gi,'200 Source Questions + 300 Guided Review');
  pack.description=String(pack.description||'').replace(/^Includes 200 independent diagnostic questions and 300 source-derived guided-review tasks\.\s*/i,'').replace(/^Contains 200 source diagnostic questions and 300 source-derived guided-review tasks;[^.]*\.\s*/i,'').replace(/Two independent 100-item diagnostic batches plus three 100-item guided-review banks/gi,'Two 100-item source diagnostic banks plus three 100-item guided-review banks').replace(/Two independent 100-item diagnostics plus three 100-item guided-review banks/gi,'Two 100-item source diagnostic banks plus three 100-item guided-review banks').replace(/Five 100-item diagnostic batches/gi,'Two 100-item source diagnostic banks plus three 100-item guided-review banks').replace(/Five 100-item diagnostics/gi,'Two 100-item source diagnostic banks plus three 100-item guided-review banks');pack.description='Contains 200 source diagnostic questions and 300 source-derived guided-review tasks; the assistant audit found '+distinctSourceContentKernels+' distinct source content kernels. '+pack.description;
  pack.contentReview='Assistant audit completed: the 200 source questions contain '+distinctSourceContentKernels+' distinct content kernels and '+parallelSourceVariants+' parallel variants under the normalized answer-set/rationale/reference test. The 300 additional activities are assistant-reviewed guided reasoning transformations, not independent exam questions. The 500-distinct-question target is not met.';pack.bankDisclosure='This pack has 500 learning activities, not 500 independent exam questions: 200 source questions ('+distinctSourceContentKernels+' distinct content kernels; '+parallelSourceVariants+' parallel variants) plus 300 source-derived guided-review activities. '+newIndependentItemsNeeded+' newly authored independent questions are needed to reach the 500-question target.';
  pack.assistantAuditUrl='./test_prep/test_prep_assistant_review_2026-07-16.json';
  pack.sections=Array.from({length:5},(_,index)=>({...(pack.sections?.[index]||{}),id:index<2?`diagnostic-batch-${index+1}`:`guided-review-bank-${index-1}`,label:index<2?`100-item source diagnostic bank ${index+1}`:`Guided reasoning review bank ${index-1}`,kind:index<2?'source-diagnostic':'guided-review',timeMinutes:null}));
  const findings=[];
  if(pack.items.length!==500)findings.push({check:'inventory',message:'Pack must contain 500 items'});
  if(new Set(pack.items.map(item=>item.id)).size!==500)findings.push({check:'ids',message:'Item IDs must be unique'});
  if(new Set(pack.items.map(item=>item.prompt)).size!==500)findings.push({check:'prompts',message:'Prompts must be unique'});
  const templates=[batch1,batch2,batch1,batch2,batch1];
  for(let batch=0;batch<5;batch++){
    const items=pack.items.slice(batch*100,batch*100+100),answers=[0,1,2,3].map(answer=>items.filter(item=>item.answerIndex===answer).length);
    if(items.length!==100)findings.push({check:'batch-size',batch:batch+1,message:'Batch must contain 100 items'});
    if(!equalCounts(countBy(items,'domainId'),countBy(templates[batch],'domainId')))findings.push({check:'domain-allocation',batch:batch+1,message:'Domain distribution differs from its source blueprint'});
    if(answers.some(count=>count!==25))findings.push({check:'answer-balance',batch:batch+1,message:`Answer positions ${answers.join('/')}`});
  }
  for(const item of pack.items)if(!Array.isArray(item.choices)||item.choices.length<2||item.answerIndex<0||item.answerIndex>=item.choices.length||!item.rationale||!Array.isArray(item.choiceRationales)||item.choiceRationales.length!==item.choices.length)findings.push({check:'item-shape',id:item.id,message:'Answer, rationale, or option feedback invalid'});
  const sourceById=Object.fromEntries(base.map(item=>[item.id,item]));
  for(const item of pack.items.slice(200)){
    const source=sourceById[item.sourceItemId];
    if(!source){findings.push({check:'source-link',id:item.id,message:'Source item missing'});continue}
    if(item.prompt===source.prompt||item.prompt.toLowerCase().endsWith(source.prompt.toLowerCase()))findings.push({check:'guided-transform-variation',id:item.id,message:'Prompt is only a prefix variation'});
    if(JSON.stringify([...item.choices].sort())===JSON.stringify([...source.choices].sort()))findings.push({check:'guided-transform-variation',id:item.id,message:'Choice set duplicates source'});
    if(item.rationale===source.rationale)findings.push({check:'guided-transform-variation',id:item.id,message:'Rationale duplicates source'});
    const correctIndex=source.answerIndex,wrongIndexes=source.choices.map((_,choiceIndex)=>choiceIndex).filter(choiceIndex=>choiceIndex!==correctIndex),principle=compact(source.rationale,300),feedbacks=source.choices.map((_,choiceIndex)=>sourceFeedback(source,choiceIndex,principle)),authoredCorrect=canonical(item.choices[item.answerIndex]);
    let answerValid=false;
    if(item.expansionBatch===3)answerValid=authoredCorrect===canonical(feedbacks[wrongIndexes[0]]);
    else if(item.expansionBatch===4)answerValid=authoredCorrect.includes(canonical(source.choices[correctIndex]))&&authoredCorrect.includes(canonical(feedbacks[correctIndex]).slice(0,Math.min(36,canonical(feedbacks[correctIndex]).length)));
    else if(item.expansionBatch===5)answerValid=authoredCorrect.includes(canonical(source.choices[correctIndex]))&&authoredCorrect.includes(canonical(feedbacks[correctIndex]).slice(0,Math.min(36,canonical(feedbacks[correctIndex]).length)))&&authoredCorrect.includes(canonical(source.choices[wrongIndexes[0]]));
    if(!answerValid)findings.push({check:'answer-key-derivation',id:item.id,message:'Authored answer does not follow its declared source-feedback derivation'});
    if(new Set(item.choices).size!==4)findings.push({check:'choice-uniqueness',id:item.id,message:'Duplicate authored choices'});
    if(!item.editorialReviewer||item.assistantReviewStatus!=='reviewed-guided-practice-only'||item.expansionStatus!=='assistant-authored-guided-reasoning-task'||item.examItemStatus!=='not-approved-as-independent-exam-item')findings.push({check:'review-provenance',id:item.id,message:'Guided-practice review provenance missing'});
  }
  if(findings.length)throw Error(`${pack.id}: expansion QA failed: ${JSON.stringify(findings.slice(0,5))}`);
  const itemsName=stem+'_items.json',packJson=JSON.stringify(pack,null,2)+'\n',itemsJson=JSON.stringify(pack.items,null,2)+'\n';
  for(const dir of[sourceDir,deployDir]){fs.mkdirSync(dir,{recursive:true});writeGeneratedFile(path.join(dir,packFile),packJson);writeGeneratedFile(path.join(dir,itemsName),itemsJson)}
  updateQa(stem,pack,findings);expanded++;
}
if(expanded!==22)throw Error(`Expected 22 non-EPPP packs, expanded ${expanded}`);
require('./apply_test_prep_independent_additions.cjs');
console.log(`Reviewed ${expanded} non-EPPP packs and applied all manifest-backed independent diagnostic batches; the cross-pack 500-independent-question target remains in progress.`);
