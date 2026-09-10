import { beforeAll, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
const Review=require('../remediation_review_helpers.js');
const DOC=s=>'<!DOCTYPE html><html lang="en"><body><main>'+s+'</main></body></html>';
beforeAll(()=>loadAlloModule('doc_pipeline_module.js'));
describe('shipping module source-preservation behavior',()=>{
 it.each([
  ['<label for="student"><img alt="Student name" src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"></label><input id="student" value="Ada">', s=>s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['<table><tr><th scope="col">Group</th><th scope="col">Score</th></tr><tr><td>North</td><td>95</td></tr></table>', s=>s.replace('<table>', '<table role="list">'), 'table-semantics-changed'],
  ['<figure><figcaption>Compute x<sup>2</sup> plus y2.</figcaption></figure>', s=>s.replace('x<sup>2</sup> plus y2', 'x2 plus y<sup>2</sup>'), 'math-content-changed'],
  ['<label for="student">Student name</label><input id="student" value="Ada">', s=>s.replace('<input ', '<input aria-label="Teacher name" '), 'form-state-changed'],
  ['<label for="weight">Weight</label><input id="weight" aria-describedby="kg"><p id="kg">Enter weight in kilograms.</p><p id="lb">Enter weight in pounds.</p>', s=>s.replace('aria-describedby="kg"', 'aria-describedby="lb"'), 'form-state-changed'],
  ['<p>Compute <a href="https://school.example/expression">x<sup>2</sup> plus y2</a> for this expression.</p>', s=>s.replace('x<sup>2</sup> plus y2', 'x2 plus y<sup>2</sup>'), 'math-content-changed'],
  ['<p>Compute <a href="https://school.example/first">x<sup>2</sup></a> plus <a href="https://school.example/second">y2</a>.</p>', s=>s.replace('x<sup>2</sup>', 'x2').replace('>y2</a>', '>y<sup>2</sup></a>'), 'math-content-changed'],
  ['<table><tr><th scope="col">Group</th><th scope="col">Score</th></tr><tr><td>North</td><td>95</td></tr></table>', s=>s.replace(/<th /g, '<th role="cell" '), 'table-semantics-changed'],
  ['<fieldset><legend>Student</legend><input value="Ada"></fieldset>', s=>s.replace('<fieldset>', '<fieldset disabled>'), 'form-state-changed'],
  ['<span id="a">Student</span><span id="b">Teacher</span><input aria-label="Name" aria-labelledby="a" value="Ada">', s=>s.replace('aria-labelledby="a"', 'aria-labelledby="b"'), 'form-state-changed'],
  ['<p>x + y</p>', s=>s.replace('x + y','x − y'), 'math-content-changed'],
  ['<a href="#a">Read topic</a><section id="a">Original</section><section id="b">Archive</section>', s=>s.replace('id="a"','id="temp"').replace('id="b"','id="a"').replace('id="temp"','id="b"'), 'link-destination-changed'],
  ['<p>Keep this instruction.</p>', s=>s.replace('<p>', '<p aria-hidden="true">'), 'source-visibility-changed'],
  ['<label>Name <input value="Ada"></label>', s=>s.replace('value="Ada"', 'value="Lin"'), 'form-state-changed'],
  ['<p>Complete 3 trials.</p>', s=>s.replace('3 trials','8 trials'), 'source-value-changed'],
  ['<p><a href="https://example.test/a">Assignment</a></p>',s=>s.replace('example.test/a','example.test/b'),'link-destination-changed'],
 ])('keeps the source and emits canonical evidence for %s',async(body,change,reason)=>{
  const evidence=[];
  const pipeline=window.AlloModules.createDocPipeline({
   callGemini:async prompt=>change(String(prompt).match(/UNTRUSTED HTML DATA:\n"""\n([\s\S]*?)\n"""/)[1]),
   callGeminiVision:async()=> '{}',callImagen:async()=>null,addToast:()=>{},t:k=>k,isRtlLang:()=>false,
   updateExportPreview:()=>{},getDefaultTitle:()=> 'Document',state:{},
  });
  const input=DOC(body+'<p>Read the original instructions carefully and record your observations.</p>');
  expect(await pipeline.aiFixChunked(input,'Repair accessibility','shipping-test',null,{onPassEvidence:e=>evidence.push(e)})).toBe(input);
  expect(Review.evidence(evidence[0]).candidateRejections).toContainEqual(expect.objectContaining({reason}));
 });
});
const source=fs.readFileSync('view_pdf_audit_source.jsx','utf8');
const a=source.indexOf('  const _runOwnedSectionRefix = '), b=source.indexOf('  const _runOwnedReaudit = ',a);
if(a<0||b<0)throw Error('Missing view refix boundaries');
const reason={candidateRejectionCount:1,candidateRejections:[{chunkId:'1',phase:'chunk',reason:'source-value-changed'}]};
function viewHarness(stale=false){
 let current=true, saved={accessibleHtml:DOC('<p>Complete 3 trials.</p>'),candidateRejectionCount:0,candidateRejections:[]};
 const ticket={htmlToken:{html:saved.accessibleHtml},documentEpoch:2,controller:new AbortController()};
 const ref={current:saved};
 const commit=vi.fn((token,update)=>{saved=update(saved);ref.current=saved;return true;});
 const deps={
  _beginRemediationOperation:()=>ticket,_remediationOperationIsCurrent:()=>current,pdfFixResultRef:ref,
  _completeRemediationOperation:()=>{},setPdfFixLoading:()=>{},_setRemediationOperationStep:()=>{},
  refixChunk:async(index,options)=>{if(stale)current=false;options.onPassEvidence(reason);throw Error('Later verification failed');},
  _commitAsyncHtmlIfCurrent:commit,_commitRefixedSection:()=>{},_toastForRemediationOperation:()=>{},_finishPdfRemediationOperation:()=>{},
 };
 const run=new Function(...Object.keys(deps),source.slice(a,b)+'\nreturn _runOwnedSectionRefix;')(...Object.values(deps));
 return {run:()=>run(0,1),commit,ref};
}
describe('manual section refix evidence ownership',()=>{
 it('retains the rejected reason if later processing fails',async()=>{
  window.AlloModules.RemediationReview=Review;
  const h=viewHarness();await h.run();
  expect(h.commit).toHaveBeenCalledOnce();
  expect(h.ref.current.candidateRejections).toEqual(reason.candidateRejections);
  expect(h.ref.current.accessibleHtml).toContain('Complete 3 trials.');
 });
 it('discards evidence once the document operation is stale',async()=>{
  window.AlloModules.RemediationReview=Review;
  const h=viewHarness(true);await h.run();
  expect(h.commit).not.toHaveBeenCalled();
  expect(h.ref.current.candidateRejectionCount).toBe(0);
 });
});
