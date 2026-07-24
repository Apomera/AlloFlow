#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const waitBuffer=new Int32Array(new SharedArrayBuffer(4));
function writeGeneratedFile(file,data){let error;for(let attempt=1;attempt<=8;attempt++){try{fs.writeFileSync(file,data);return}catch(caught){error=caught;if(attempt<8)Atomics.wait(waitBuffer,0,0,150*attempt)}}throw error}
if(!process.argv.includes('--allow-legacy-collapse'))throw Error('Refusing to collapse canonical test-prep packs without --allow-legacy-collapse. Use only inside the guarded full rebuild pipeline.');
const dirs=[path.join(root,'test_prep'),path.join(root,'desktop/web-app','public','test_prep')];
const sourceDir=dirs[0];let prepared=0;
for(const packFile of fs.readdirSync(sourceDir).filter(name=>name.endsWith('_pack.json')).sort()){
  const pack=JSON.parse(fs.readFileSync(path.join(sourceDir,packFile),'utf8'));
  if(/^eppp/i.test(pack.id||'')||!Array.isArray(pack.items)||pack.items.length<200)continue;
  const stem=packFile.slice(0,-'_pack.json'.length);pack.items=pack.items.slice(0,200);pack.sections=(pack.sections||[]).slice(0,2).map(section=>{const clean={...section};delete clean.kind;return clean});for(const field of['diagnosticBatchCount','sourceDiagnosticBatchCount','independentDiagnosticBatchCount','guidedReviewBatchCount','learningActivityBankCount','distinctSourceContentKernels','parallelSourceVariants','newIndependentItemsNeeded','diagnosticBatchCountSemantics','expansionVersion','assistantReview','assistantAuditUrl','bankDisclosure'])delete pack[field];pack.contentReview='200 source questions prepared for legacy pack regeneration.';
  pack.title=String(pack.title||'').replace(/200 Source Questions \+ 300 Guided Review/gi,'200-Item Diagnostic Bank').replace(/200 Source Questions \+ 300 Guided Review/gi,'200 Item Diagnostic Bank').replace(/500-Item/gi,'200-Item').replace(/500 Item/gi,'200 Item');
  pack.description=String(pack.description||'').replace(/^Contains 200 source diagnostic questions and 300 source-derived guided-review tasks;[^.]*\.\s*/i,'').replace(/Two 100-item source diagnostic banks plus three 100-item guided-review banks/gi,'Two 100-item diagnostics').replace(/Five 100-item/gi,'Two 100-item').replace(/five 100-item/g,'two 100-item');
  const packJson=JSON.stringify(pack,null,2)+'\n',itemsJson=JSON.stringify(pack.items,null,2)+'\n';
  for(const dir of dirs){writeGeneratedFile(path.join(dir,packFile),packJson);writeGeneratedFile(path.join(dir,stem+'_items.json'),itemsJson)}prepared++;
}
if(prepared!==22)throw Error(`Expected to prepare 22 packs, prepared ${prepared}`);
console.log(`Prepared ${prepared} source banks for legacy 200-item builders.`);
