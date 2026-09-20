'use strict';
// Repeatable final checks for the dated content/provenance pass; no model or network calls.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');process.chdir(root);
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const {factHash}=require('./lib/allopack_fact_review.cjs');
const {records}=require('./reconcile_allopack_content_audits.cjs');
const {validateEditionPair}=require('./lib/allopack_edition_consistency.cjs');
let packs=0,outlines=0,inherited=0,auditRecords=0;const sourceOnly=[];
for(const dir of ['allopacks','allopacks/illustrated'])for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.allopack.json'))){const p=read(dir+'/'+f);packs++;
 for(const r of p.history){if(r.type==='outline'){assert(r.data.structureType,dir+'/'+f+': missing organizer selector');outlines++;}
 function walk(n,keys){if(!n||typeof n!=='object')return;
  if(n.factReview?.status==='inherited-review-attribution'){
   const review=n.factReview,source=read(review.sourcePack);let prior=source.history.find(x=>x.id===review.sourceResourceId);
   for(const k of keys)prior=prior[k];
   assert.equal(source.allopack.author,review.sourceAttribution);assert.equal(prior.factVerified,true);assert.equal(n.factVerified,true);
   const facts=n.essentialFacts||n.lockedLessonFacts;assert.deepEqual(facts,prior.essentialFacts||prior.lockedLessonFacts);assert.equal(review.factsHash,factHash(facts));inherited++;
  }
  for(const[k,v]of Object.entries(n))if(k!=='factReview'&&v&&typeof v==='object')walk(v,[...keys,k]);
 }walk(r.data,['data']);
 }
 if(dir.endsWith('/illustrated')){assert.deepEqual(validateEditionPair(read('allopacks/'+f),p),[],f+': edition mismatch');const result=records(f.slice(0,-14));assert.deepEqual(read(result.folder+'content-refinements.json'),result.rows);assert.equal(p.allopack.contentRefinements.count,result.rows.length);auditRecords+=result.rows.length;if(result.sourceOnlyResourceIds.length)sourceOnly.push({pack:f,sourceOnlyResourceIds:result.sourceOnlyResourceIds});}
}
console.log(JSON.stringify({packs,outlines,inheritedReviewAttributions:inherited,exactAuditRecords:auditRecords,sourceOnlyResources:sourceOnly,status:'passed'}));
