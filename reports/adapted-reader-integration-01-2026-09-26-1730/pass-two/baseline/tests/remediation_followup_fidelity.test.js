import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
const harnessText=fs.readFileSync('tests/aifix_chunk_gates.test.js','utf8');
const make=new Function('fs','path',harnessText.slice(harnessText.indexOf('const SRC ='),harnessText.indexOf('const DOC ='))+'\nreturn harness;')(fs,path);
const probe=fs.readFileSync('reports/document-remediation-followup-review-2026-09-09/probe.cjs','utf8');
const {cases,wrap}=new Function(probe.slice(probe.indexOf('const pad ='),probe.indexOf('async function main'))+'\nreturn {cases,wrap};')();
describe('follow-up source preservation regressions',()=>{
 for(const [name,expected,body,change] of cases)it(name,async()=>{
  const input=wrap(body),candidate=change(input),h=make(change);
  expect(h.acceptFixedHtmlDetailed(candidate,input,{strictContent:true,mode:'faithful'}).accepted).toBe(expected==='accept');
  expect(await h.run(input)).toBe(expected==='accept'?candidate:input);
 });
});
const edges=[
 ['first legend exception',true,'<fieldset><legend>Name <input value="Ada"></legend></fieldset>',s=>s.replace('<fieldset>','<fieldset disabled>')],
 ['other legend disabled',false,'<fieldset><legend>Group</legend><legend>Name <input value="Ada"></legend></fieldset>',s=>s.replace('<fieldset>','<fieldset disabled>')],
 ['link ID rename',true,'<a href="#topic">Read topic</a><section id="topic"><h2>Topic</h2><p>Original source text.</p></section>',s=>s.replace(/"#?topic"/g,m=>m.replace('topic','renamed'))],
 ['encoded link ID rename',true,'<a href="#a%20b">Read topic</a><section id="a b"><p>Original source text.</p></section>',s=>s.replace('#a%20b','#renamed').replace('id="a b"','id="renamed"')],
 ['invalid ARIA reference fallback',false,'<input aria-labelledby="missing" aria-label="Student" value="Ada">',s=>s.replace('aria-label="Student"','aria-label="Teacher"')],
 ['valid empty ARIA reference',true,'<span id="empty"></span><input aria-labelledby="empty" aria-label="Student" value="Ada">',s=>s.replace('aria-label="Student"','aria-label="Teacher"')],
 ['CSS ID specificity',true,'<style>#note{display:block}.quiet{display:none}</style><p id="note" class="quiet">Original text.</p>',s=>s.replace('class="quiet"','class="quiet" style="display:block"')],
 ['CSS important hide',false,'<style>.note{display:block}</style><p class="note">Original text.</p>',s=>s.replace('.note{display:block}', '.note{display:block}.note{display:none!important}')],
 ['source hidden duplicate remains',true,'<p>Required text.</p><p hidden>Required text.</p>',s=>s.replace('<p hidden>Required text.</p>','<p hidden>Required <strong>text.</strong></p>')],
 ['complex header scope',false,'<table><tr><th scope="row" colspan="2">Group</th><th scope="row">Score</th></tr><tr><td>Ada</td><td>Class</td><td>95</td></tr></table>',s=>s.replace(/scope="row"/g,'scope="col"')],
 ['good column scope downgrade',false,'<table><tr><th scope="col">Name</th><th scope="col">Score</th></tr><tr><td>Ada</td><td>95</td></tr></table>',s=>s.replace(/scope="col"/g,'scope="row"')],
 ['math name ID rename',true,'<span id="desc">x plus y</span><math aria-labelledby="desc"><mi>x</mi><mo>+</mo><mi>y</mi></math>',s=>s.replace(/"desc"/g,'"renamed"')],
 ['comparison symbol',false,'<p>x &lt; y</p>',s=>s.replace('&lt;','&gt;')],
];
describe('effective semantics and constrained repairs',()=>{
 for(const [name,accepted,body,change]of edges)it(name,()=>{
  const input=wrap(body),h=make(change);
  expect(h.acceptFixedHtmlDetailed(change(input),input,{strictContent:true,mode:'faithful'}).accepted).toBe(accepted);
 });
});
