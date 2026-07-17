'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..'),sourceDir=path.join(root,'test_prep'),deployDir=path.join(root,'prismflow-deploy','public','test_prep');
const files=fs.readdirSync(sourceDir).filter(name=>name.endsWith('_pack.json')&&!name.startsWith('eppp')).sort();
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const perPack=files.map(file=>{const stem=file.replace('_pack.json',''),packBytes=fs.readFileSync(path.join(sourceDir,file)),itemsBytes=fs.readFileSync(path.join(sourceDir,stem+'_items.json')),pack=JSON.parse(packBytes);return{stem,packId:pack.id,title:pack.shortTitle||pack.title,learningActivities:pack.items.length,sourceQuestions:200,distinctSourceContentKernels:pack.distinctSourceContentKernels,parallelSourceVariants:pack.parallelSourceVariants,guidedReviewActivities:300,independentQuestionTarget:500,newIndependentItemsNeeded:pack.newIndependentItemsNeeded,verdict:pack.assistantReview?.verdict,packSha256:sha(packBytes),itemsSha256:sha(itemsBytes)}});
const snapshotHash=sha(perPack.map(row=>`${row.stem}:${row.packSha256}:${row.itemsSha256}`).join('\n'));
const sum=key=>perPack.reduce((total,row)=>total+row[key],0);
const audit={
  schemaVersion:1,
  id:'test-prep-assistant-review-2026-07-16',
  reviewedAt:'2026-07-16',
  reviewer:'OpenAI Codex',
  status:'reviewed-target-not-met',
  snapshot:{algorithm:'sha256',generatedAt:new Date().toISOString(),hash:snapshotHash},
  standard:{
    target:'500 genuinely distinct exam-style questions per non-EPPP pack',
    independentQuestionDefinition:'A question must introduce its own assessable stimulus, scenario, passage, dataset, or decision; its own plausible answer set; and item-specific reasoning. A changed prefix, reordered answers, parallel framing, or a task derived from an existing answer/rationale does not create a new independent content kernel.',
    kernelMethod:'Within each pack, source questions were normalized by keyed answer, sorted distractor set, rationale, and sorted reference set. Punctuation and case differences and answer-position shuffles were ignored.',
  },
  scope:{packs:perPack.length,totalLearningActivities:sum('learningActivities'),sourceQuestions:sum('sourceQuestions'),guidedReviewActivities:sum('guidedReviewActivities'),existingItemsQualitativelySampled:169,newCredentialSpecificReplacementsReviewed:68,allActivitiesStructurallyChecked:true,allGuidedAnswerDerivationsChecked:true},
  inventory:{distinctSourceContentKernels:sum('distinctSourceContentKernels'),parallelSourceVariants:sum('parallelSourceVariants'),guidedReviewActivities:sum('guidedReviewActivities'),independentQuestionTarget:perPack.length*500,newIndependentItemsNeeded:sum('newIndependentItemsNeeded')},
  verdict:{structuralStatus:'pass',answerDerivationStatus:'pass',sampledKeyDefensibilityStatus:'pass-after-corrections',contentDistinctnessStatus:'target-not-met',guidedReviewStatus:'approved-for-guided-practice-only',independentExamItemStatus:'not-approved-for-source-derived-guided-items'},
  systemicFindings:[
    'The 300 expansion activities per pack are mechanically linked to existing source answers and rationales. They support misconception correction, justification, and comparison practice but do not introduce independent exam content.',
    'The misconception-correction form repeats the selected response in keyed feedback, creating a lexical matching cue.',
    'The response-and-evidence form repeats the same evidence across all four options, so the task largely asks the learner to reselect the original answer.',
    'The comparison form always presents the source-correct response first in the prompt and commonly includes only two choices that directly evaluate the named pair.',
    'The original 200-question banks also contain substantial parallel-form reuse. Across 4,400 source questions, the normalized within-pack audit found 2,300 distinct content kernels and 2,100 parallel variants.',
    'Source mapping remains broad in many packs. The prior cross-pack audit found named title/summary catalog entries for 21 of 65 used URLs; 44 URLs remain uncataloged, and several packs reuse one broad reference bundle across many items.',
  ],
  correctionsCompleted:[
    'Replaced 68 credential-mismatched or mechanically stacked EBD 5372 and Intellectual Disabilities 5322 items with new school-based scenarios and item-specific feedback.',
    'Removed misplaced 5383 learning-disability rationale fragments from 51 EBD and 51 Intellectual Disabilities source questions and their option feedback.',
    'Rewrote remaining SLD-contaminated EBD, Intellectual Disabilities, and Severe/Profound scenarios.',
    'Corrected four IDEA Part B/Part C, IEP/IFSP, LRE/natural-environment, and payment-rule items using current official IDEA regulations.',
    'Corrected targeted Early Childhood Special Education, Praxis Core, reading, grammar, possessive, quotation, and mojibake defects identified during sampling.',
    'Added a durable source-correction pass to both full build pipelines and guarded the legacy 200-item collapse step behind an explicit authorization flag.',
    'Separated guided-review attempt mode from diagnostic analytics and excluded guided activities from smart review, targeted sets, and custom quizzes.',
  ],
  limitations:[
    'Assistant review is not licensed-professional endorsement, independent legal/clinical review, field testing, psychometric calibration, or validation of score interpretations.',
    'The qualitative review used a stratified 169-item sample of existing activities plus review of all 68 new replacements; it did not simulate examinee response data.',
    'Content-kernel counts detect normalized within-pack reuse. They do not by themselves establish item quality or detect every semantically similar question across different wording.',
  ],
  nextWork:[
    'Author the per-pack gap shown below as genuinely new credential-specific questions; the total gap is 8,700.',
    'Give each new question a new stimulus or decision, plausible distractors, item-specific feedback, and a source that directly supports the tested principle.',
    'Review and release additions pack by pack in 100-item stages; keep guided-review activities as a separate learning mode.',
    'After authoring, run independent subject-matter and psychometric review if the product will make stronger validity or readiness claims.',
  ],
  officialSources:[
    {title:'IDEA §300.17 — Free appropriate public education',url:'https://sites.ed.gov/idea/regs/b/a/300.17'},
    {title:'IDEA §300.116 — Placements',url:'https://sites.ed.gov/idea/regs/b/b/300.116'},
    {title:'IDEA §303.126 — Early intervention services in natural environments',url:'https://sites.ed.gov/idea/regs/c/b/303.126'},
    {title:'IDEA §303.521 — System of payments and fees',url:'https://sites.ed.gov/idea/regs/c/f/303.521'},
  ],
  perPack,
};
const table=perPack.map(row=>`| ${row.title.replace(/\|/g,'/')} | ${row.distinctSourceContentKernels} | ${row.parallelSourceVariants} | 300 | ${row.newIndependentItemsNeeded} |`).join('\n');
const md=`# Test Prep Assistant Review — July 16, 2026

Status: **Reviewed — 500-distinct-question target not met.** This is a completed assistant review, not a “review required” placeholder.

## Bottom line

The 22 non-EPPP packs contain **11,000 learning activities**, but they do not contain 11,000 independent exam questions. The strict audit found **${audit.inventory.distinctSourceContentKernels.toLocaleString()} normalized source content kernels**, **${audit.inventory.parallelSourceVariants.toLocaleString()} parallel source variants**, and **${audit.inventory.guidedReviewActivities.toLocaleString()} source-derived guided-review activities**. Reaching 500 genuinely distinct questions in every pack requires **${audit.inventory.newIndependentItemsNeeded.toLocaleString()} newly authored questions**.

Structural integrity and guided-answer derivation passed. The source-derived additions are approved for guided practice only and are excluded from diagnostic analytics. They are not approved as independent exam items.

## Review standard and scope

An independent question must introduce its own assessable stimulus, scenario, passage, dataset, or decision; its own plausible answer set; and item-specific reasoning. Prefix changes, answer-position shuffles, parallel framing, and tasks built from an existing answer/rationale do not count as new content kernels.

The assistant checked all 11,000 activities structurally, checked all 6,600 guided answer derivations, manually sampled 169 existing activities across every pack family, and reviewed all 68 newly authored EBD/ID replacements. This work is separate from licensed subject-matter endorsement, field testing, and psychometric calibration.

## Per-pack inventory

| Pack | Distinct source kernels | Parallel source variants | Guided review | New independent items needed |
|---|---:|---:|---:|---:|
${table}

## Main findings

- The misconception-correction form contains a lexical matching cue: the response named in the prompt reappears in the keyed feedback.
- The response-and-evidence form repeats identical evidence across choices and largely asks learners to reselect the source answer.
- The comparison form consistently names the source-correct response first and often offers only two choices that directly compare the named pair.
- The original source banks also contain extensive parallel-form reuse. School Librarian 5312 is the most pronounced case under this normalized test: 26 source kernels and 174 parallel variants.
- Citation mapping is often bundle-level rather than item-specific; 44 of 65 used URLs lack a named title/summary catalog entry.

## Corrections completed

- Replaced 68 EBD/ID arithmetic, stacked-context, or credential-mismatched items with new school-based scenarios.
- Removed misplaced 5383 language from 102 EBD/ID questions and their feedback.
- Corrected SLD-contaminated scenarios, Praxis Core ambiguity/rationale defects, reading/grammar/quotation issues, and Early Childhood/ECSE defects.
- Corrected IDEA Part B/Part C content using [§300.17](https://sites.ed.gov/idea/regs/b/a/300.17), [§300.116](https://sites.ed.gov/idea/regs/b/b/300.116), [§303.126](https://sites.ed.gov/idea/regs/c/b/303.126), and [§303.521](https://sites.ed.gov/idea/regs/c/f/303.521).
- Added durable build-time corrections, an explicit guard against accidental legacy collapse, honest bank labels, and a separate guided-review attempt mode excluded from diagnostic analytics.

## Next release standard

Author the ${audit.inventory.newIndependentItemsNeeded.toLocaleString()}-question gap pack by pack in 100-item stages. Every addition should use a new credential-specific stimulus, plausible distractors, item-specific feedback, and directly relevant sources. Guided-review activities should remain available as a separate learning tool.
`;
for(const dir of[sourceDir,deployDir]){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'test_prep_assistant_review_2026-07-16.json'),JSON.stringify(audit,null,2)+'\n');fs.writeFileSync(path.join(dir,'test_prep_assistant_review_2026-07-16.md'),md)}
console.log(`Wrote assistant audit for ${perPack.length} packs; ${audit.inventory.newIndependentItemsNeeded} new independent questions remain.`);
