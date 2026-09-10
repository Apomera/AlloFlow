'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.resolve(__dirname, '..');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function extractFunction(source, name) {
  const ast=parse(source); let found;
  function visit(node) {
    if(!node || typeof node!=='object')return;
    if(node.type==='FunctionDeclaration' && node.id?.name===name)found=source.slice(node.start,node.end);
    for(const [key,value] of Object.entries(node)) {
      if(['loc','start','end'].includes(key))continue;
      if(Array.isArray(value))value.forEach(visit); else if(value && typeof value==='object')visit(value);
    }
  }
  visit(ast); if(!found)throw Error('Production function not found: '+name); return found;
}
function production() {
  const html=fs.readFileSync(path.join(root,'it_coach/it_coach.html'),'utf8');
  const inline=html.slice(html.indexOf('<script>')+8,html.lastIndexOf('</script>'));
  const promptSource=extractFunction(inline,'buildPrompt'), parserSource=extractFunction(inline,'parseReply');
  const {JSDOM}=require('jsdom');
  const dom=new JSDOM('',{runScripts:'outside-only',url:'https://benchmark.invalid/'});
  const moduleSource=fs.readFileSync(path.join(root,'video_studio_module.js'),'utf8');
  dom.window.eval(moduleSource);
  const sanitize=dom.window.AlloModules.VideoStudio.vsSanitizeCoachAdvice;
  return {
    prompt(c) { return new Function('learner','supportContext',promptSource+';return buildPrompt;')(true,()=>c.context || 'Guidance language: English')(c.goal,c.history || ''); },
    parse:new Function(parserSource+';return parseReply;')(), sanitize,
    hashes:{prompt:hash(promptSource),parser:hash(parserSource),sanitizerModule:hash(moduleSource)},
    close:()=>dom.window.close()
  };
}
function validBox(b) { return !!b && ['x','y','w','h'].every(k=>typeof b[k]==='number' && Number.isFinite(b[k])) && b.x>=0 && b.y>=0 && b.w>0 && b.h>0 && b.x+b.w<=1.000001 && b.y+b.h<=1.000001; }
function iou(a,b) {
  if(!validBox(a)||!validBox(b))return 0;
  const area=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  return Math.max(0,Math.min(1,area/(a.w*a.h+b.w*b.h-area)));
}
function diagnostics(raw,displayed,expectedBox,c) {
  const schemaValid=!!raw && !Array.isArray(raw) && typeof raw.guidance==='string' && !!raw.guidance.trim() && typeof raw.done==='boolean' && ['navigation','content'].includes(raw.kind) && (raw.target===null || validBox(raw.target)) && (raw.expected===undefined || typeof raw.expected==='string');
  return {
    schemaValid,
    targetIoU:expectedBox ? iou(displayed.target,expectedBox) : null,
    targetCheck:expectedBox ? iou(displayed.target,expectedBox)>=.5 : displayed.target===null,
    doneCheck:displayed.done===!!c.done,
    refusalCheck:displayed.refused===!!c.refuse,
    // No lexical matching is presented as semantic correctness or safety.
    humanReviewRequired:true
  };
}
function summarize(report,reviews) {
  let checked=[];
  if(reviews) {
    if(reviews.runId!==report.runId)throw Error('Review belongs to a different benchmark run.');
    if(!Array.isArray(reviews.cases))throw Error('Review cases must be an array.');
    const seen=new Set();
    checked=reviews.cases.map(r=>{
      if(seen.has(r.id) || !report.cases.some(c=>c.id===r.id))throw Error('Duplicate or unknown review case: '+r.id);
      seen.add(r.id);
      if(!['pass','fail','uncertain'].includes(r.verdict) || typeof r.notes!=='string' || !r.notes.trim())throw Error('Each review requires a verdict and rationale.');
      if(r.verdict==='pass' && report.cases.some(c=>c.id===r.id && (c.error || !c.checks)))throw Error('Cannot pass a case without an evaluated response.');
      return r;
    });
  }
  const completed=report.cases.filter(c=>!c.error && c.checks);
  const judged=checked.filter(r=>r.verdict!=='uncertain');
  return {
    mode:report.mode,total:report.cases.length,responses:completed.length,errors:report.cases.filter(c=>c.error).length,pending:report.cases.filter(c=>!c.error && !c.checks).length,
    validSchema:completed.filter(c=>c.checks.schemaValid).length,
    matchingTargets:completed.filter(c=>c.checks.targetCheck).length,
    reviewed:checked.length,uncertain:checked.filter(r=>r.verdict==='uncertain').length,
    humanPassRate:['live','live-browser'].includes(report.mode) && judged.length ? judged.filter(r=>r.verdict==='pass').length/judged.length : null,
    note:'Human pass rate applies only to reviewed single-step suggestions, not task completion. Unreviewed cases and request errors remain visible separately. Self-test responses are authored fixtures, never model accuracy evidence.'
  };
}
function screenHtml(c) {
  return `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#18253b;font:20px Arial}header{padding:24px 32px;background:#152b4c;color:white;font-weight:bold}main{margin:32px auto;padding:30px;background:white;border:1px solid #cbd5e1;border-radius:16px;width:calc(100% - 48px);max-width:920px}h1{font-size:28px}p{line-height:1.5}button{display:block;background:#edf4ff;color:#12335e;border:2px solid #98afd0;border-radius:8px;padding:18px;margin:16px 0;min-width:240px;font:20px Arial;text-align:left}.banner{background:#fff3ca;padding:12px;font-size:16px}@media(max-width:500px){main{padding:20px;margin:18px auto;width:calc(100% - 24px)}button{width:100%;min-width:0}header{padding:20px}}</style><header>Sample Support Workspace</header><main><h1>${escape(c.screen)}</h1><p>${escape(c.detail)}</p>${c.banner?`<p class="banner">${escape(c.banner)}</p>`:''}${c.controls.map(b=>`<button id="${escape(b.id)}">${escape(b.label)}</button>`).join('')}</main>`;
}
module.exports={hash,escape,extractFunction,production,validBox,iou,diagnostics,summarize,screenHtml};
