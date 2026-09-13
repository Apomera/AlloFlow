/* A fresh, connected rehearsal. Station achievements never substitute for this run's work. */
(function(root){
  'use strict';
  var K=root.KitchenStudio;
  var steps=[
    {id:'prep',scenario:'standard',label:'Prepare safely',brief:'Dinner is for four people. You have handled raw chicken; make the workspace ready for the vegetable side.'},
    {id:'knife',scenario:'standard',label:'Prepare the carrots',brief:'The vegetable side needs a uniform small dice for a quick cook. Set up safely and make the requested cut.'},
    {id:'measure',scenario:'four',label:'Scale the sauce',brief:'Measure the stock for four servings of sauce, using the original two-serving recipe.'},
    {id:'heat',scenario:'standard',label:'Brown the mushrooms',brief:'Prepare the mushrooms for the side dish. Manage surface moisture, spacing, and heat.'},
    {id:'probe',scenario:'standard',label:'Check the chicken',brief:'Before serving the main course, gather reliable evidence that the chicken is safely cooked.'},
    {id:'chill',scenario:'standard',label:'Store the leftovers',brief:'The meal is over. Forty-five minutes have passed in a 72°F room. Store the leftovers safely.'}
  ];
  function start(mode){mode=mode==='practice'?'practice':'demonstrate';return {version:1,mode:mode,stage:0,completed:[],history:[],work:K.start(steps[0].id,mode,steps[0].scenario)};}
  function matches(s,stage,mode){var step=steps[stage];return !!(s&&step&&s.id===step.id&&(s.scenario||'standard')===step.scenario&&s.mode===mode);}
  function ready(run){return !!(run&&run.stage<steps.length&&matches(run.work,run.stage,run.mode)&&run.work.submitted&&run.work.done&&K.evidence(run.work).reasoningCorrect);}
  function advance(run){
    if(!ready(run))return run;
    var stage=run.stage+1,step=steps[stage];
    return Object.assign({},run,{stage:stage,completed:run.completed.concat([run.work]),work:step?K.start(step.id,run.mode,step.scenario):null});
  }
  function retry(run){
    if(!run||run.stage>=steps.length)return run;
    var s=run.work,step=steps[run.stage],history=run.history.slice();
    if(s&&(s.log.length||s.plan||s.hints))history.push({stage:run.stage,attempt:s});
    // Retain the full bounded run; stop retries at the limit rather than erase evidence.
    if(history.length>30)return run;
    return Object.assign({},run,{history:history,work:K.start(step.id,run.mode,step.scenario)});
  }
  function report(run){
    if(!run)return null;
    var entries=run.history.map(function(h){return {checkpoint:h.stage+1,kind:'earlier attempt',evidence:K.evidence(h.attempt)};});
    run.completed.forEach(function(s,i){entries.push({checkpoint:i+1,kind:'checkpoint evidence',evidence:K.evidence(s)});});
    if(run.work)entries.push({checkpoint:run.stage+1,kind:'current attempt',evidence:K.evidence(run.work)});
    var finished=run.stage===steps.length&&run.completed.length===steps.length;
    var supported=entries.some(function(x){var e=x.evidence;return e.corrections>0||e.hints>0||(e.submitted&&!e.reasoningCorrect);});
    var status=!finished?'In progress':run.mode==='practice'?'Rehearsal completed with coaching':supported?'Rehearsal completed with support':'Rehearsal completed independently';
    return {title:'Dinner for four',mode:run.mode,checkpointsCompleted:run.stage,checkpointCount:steps.length,status:status,finished:finished,corrections:entries.reduce(function(n,x){return n+x.evidence.corrections;},0),hints:entries.reduce(function(n,x){return n+x.evidence.hints;},0),entries:entries};
  }
  function restore(raw,restoreAttempt){
    if(!raw||raw.version!==1)return null;
    var run=start(raw.mode);
    (Array.isArray(raw.completed)?raw.completed.slice(0,6):[]).some(function(entry){
      var s=restoreAttempt(entry);if(!matches(s,run.stage,run.mode)||!s.submitted||!K.evidence(s).reasoningCorrect)return true;
      run.work=s;var next=advance(run);if(next===run)return true;run=next;return false;
    });
    if(run.stage<6){var work=restoreAttempt(raw.work);if(matches(work,run.stage,run.mode))run.work=work;}
    run.history=(Array.isArray(raw.history)?raw.history.slice(0,30):[]).map(function(h){
      if(!h||!Number.isInteger(h.stage)||h.stage<0||h.stage>run.stage||h.stage>=6)return null;
      var s=restoreAttempt(h.attempt);return matches(s,h.stage,run.mode)?{stage:h.stage,attempt:s}:null;
    }).filter(Boolean);
    return run;
  }
  function nextPractice(attempts,best){
    var latest={},independent={};
    best.concat(attempts).forEach(function(s){if(K.evidence(s).status==='Completed independently')independent[s.id+'|'+(s.scenario||'standard')]=true;});
    attempts.forEach(function(s){if(s.submitted){var key=s.id+'|'+(s.scenario||'standard');delete latest[key];latest[key]=s;}});
    var recent=Object.values(latest).reverse();
    var revisit=recent.find(function(s){return !K.evidence(s).reasoningCorrect;});
    if(revisit)return {id:revisit.id,scenario:revisit.scenario||'standard',mode:'practice',reason:'Revisit the explanation from your latest attempt at this challenge.'};
    var transfer=recent.find(function(s){return !independent[s.id+'|'+(s.scenario||'standard')];});
    if(transfer)return {id:transfer.id,scenario:transfer.scenario||'standard',mode:'demonstrate',reason:'You have practiced this challenge. Try a fresh attempt with the strategy hidden.'};
    var base=K.missions.find(function(m){return !independent[m.id+'|standard'];});
    if(base)return {id:base.id,scenario:'standard',mode:'practice',reason:'Build a foundation in '+base.skill.toLowerCase()+'.'};
    for(var i=0;i<K.missions.length;i++){var m=K.missions[i],other=K.scenarios(m.id)[1];if(!independent[m.id+'|'+other.id])return {id:m.id,scenario:other.id,mode:'demonstrate',reason:'Apply a familiar skill to a different situation.'};}
    return {service:true,reason:'You have independent evidence for all twelve challenges. Bring the skills together in one fresh rehearsal.'};
  }
  K.service={steps:steps,start:start,ready:ready,advance:advance,retry:retry,report:report,restore:restore};K.nextPractice=nextPractice;
})(typeof window!=='undefined'?window:globalThis);
