'use strict';
// Structural answer-key audit. This cannot establish factual or pedagogical correctness.
function validateAnswers(pack) {
 const errors=[];
 const nonempty=v=>typeof v==='string'&&v.trim().length>0;
 const fail=(path,message)=>errors.push({path,message});
 if(!Array.isArray(pack?.history))return [{path:'history',message:'Expected a resource array.'}];
 pack.history.forEach((resource,ri)=>{
  const base='history['+ri+']';
  if(resource?.type==='quiz'){
   if(!Array.isArray(resource.data?.questions)){fail(base+'.data.questions','Expected a question array.');return;}
   resource.data.questions.forEach((q,qi)=>{
    const at=base+'.data.questions['+qi+']';
    if(!q||typeof q!=='object'||Array.isArray(q)){fail(at,'Expected a question object.');return;}
    if(!q.type||q.type==='mcq'){
     if(!Array.isArray(q.options)||q.options.length<2||q.options.some(o=>!nonempty(o))){fail(at+'.options','Expected at least two nonempty text choices.');return;}
     const normalized=q.options.map(o=>o.trim().toLowerCase());
     if(new Set(normalized).size!==normalized.length)fail(at+'.options','Choices must not repeat.');
     if(q.options.filter(o=>o===q.correctAnswer).length!==1)fail(at+'.correctAnswer','Answer must exactly match one offered choice.');
    }
    if(['shortAnswer','short-answer'].includes(q.type)&&!nonempty(q.expectedAnswer))fail(at+'.expectedAnswer','Expected a nonempty written-response answer guide.');
   });
  }
  if(resource?.type==='math'){
   if(!Array.isArray(resource.data?.problems)){fail(base+'.data.problems','Expected a problem array.');return;}
   resource.data.problems.forEach((p,pi)=>{
    const at=base+'.data.problems['+pi+']';
    if(!p||typeof p!=='object'||Array.isArray(p)){fail(at,'Expected a problem object.');return;}
    if(!(nonempty(p.answer)||(typeof p.answer==='number'&&Number.isFinite(p.answer))))fail(at+'.answer','Expected a text or finite numeric answer, including zero.');
    if(!Array.isArray(p.steps)||!p.steps.length)fail(at+'.steps','Expected worked explanations.');
    else p.steps.forEach((step,si)=>{if(!nonempty(step?.explanation))fail(at+'.steps['+si+'].explanation','Expected a nonempty explanation.');});
   });
  }
 });
 return errors;
}
module.exports={validateAnswers};
