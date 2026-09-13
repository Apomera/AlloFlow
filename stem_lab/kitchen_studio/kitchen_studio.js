(function () {
  'use strict';
  var K=window.KitchenStudio, $=function(id){return document.getElementById(id);};
  var key='alloflow-kitchen-studio-v1';
  var drafts={}, attempts=[], achievements={}, current='prep', textView=false, storageOK=true;
  var sceneAPI=null, hintVisible=false, hintLevel=0, service=null, serviceActive=false, serviceRuns=[], replayState=null;
  function node(tag,text,cls){var el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;}
  function restore(raw){
    if(!raw||!K.missions.some(function(m){return m.id===raw.id;}))return null;
    var s=K.start(raw.id,raw.mode,raw.scenario);
    (Array.isArray(raw.log)?raw.log.slice(0,500):[]).forEach(function(entry){if(entry&&typeof entry.action==='string')s=K.act(s,entry.action);});
    s=K.restoreHints(s,raw);
    s.answer=Number.isInteger(raw.answer)&&raw.answer>=0&&raw.answer<=2?raw.answer:null;
    s.plan=typeof raw.plan==='string'?raw.plan.slice(0,600):'';
    s.reflection=typeof raw.reflection==='string'?raw.reflection.slice(0,2000):'';
    return raw.submitted?K.submit(s):s;
  }
  function remember(s){if(K.evidence(s).status==='Completed independently'){var id=s.id+'|'+s.scenario;if(!achievements[id]||s.log.length<achievements[id].log.length)achievements[id]=s;}}
  try{
    var saved=JSON.parse(localStorage.getItem(key)||'null');
    if(saved&&saved.version===1){
      K.missions.forEach(function(m){var d=saved.drafts&&restore(saved.drafts[m.id]);if(d&&d.id===m.id)drafts[m.id]=d;});
      attempts=(Array.isArray(saved.attempts)?saved.attempts.slice(-60):[]).map(restore).filter(Boolean);
      if(saved.achievements&&typeof saved.achievements==='object')Object.keys(saved.achievements).slice(0,12).forEach(function(k){var s=restore(saved.achievements[k]);if(s)remember(s);});
      attempts.forEach(remember);Object.values(drafts).forEach(remember);
      if(K.missions.some(function(m){return m.id===saved.current;}))current=saved.current;
      textView=saved.textView===true;
      service=K.service.restore(saved.service,restore);
      serviceRuns=(Array.isArray(saved.serviceRuns)?saved.serviceRuns.slice(-10):[]).map(function(r){return K.service.restore(r,restore);}).filter(Boolean);
      serviceActive=!!service&&saved.serviceActive===true;
      if(serviceActive)current=(service.work||service.completed[5]).id;
    }
  }catch(e){storageOK=false;}
  function state(){if(serviceActive)return service.work||service.completed[5];if(!drafts[current])drafts[current]=K.start(current,'practice');return drafts[current];}
  function setState(s){if(serviceActive)service.work=s;else drafts[current]=s;}
  function sceneStates(){if(!serviceActive)return drafts;var picture={};service.completed.forEach(function(s){picture[s.id]=s;});if(service.work)picture[service.work.id]=service.work;return picture;}
  function save(){
    try{localStorage.setItem(key,JSON.stringify({version:1,current:current,drafts:drafts,attempts:attempts.slice(-60),achievements:achievements,textView:textView,service:service,serviceActive:serviceActive,serviceRuns:serviceRuns}));storageOK=true;}catch(e){storageOK=false;}
    $('storageStatus').textContent=storageOK?'Saved in this browser. Your best demonstrations, latest 60 station attempts, current rehearsal, and latest 10 earlier rehearsals are retained. Download a copy to share.':'Browser saving is unavailable. Keep this page open and download your evidence before leaving.';
  }
  function archive(s){if((s.log.length||s.plan||s.hints)&&!s.submitted)attempts.push(s);attempts=attempts.slice(-60);}
  function fresh(scenario,mode){if(serviceActive){var retried=K.service.retry(service);if(retried===service){$('feedback').textContent='This rehearsal has reached its retry limit. Start a new rehearsal to continue; this run will stay in your report.';return;}service=retried;hintVisible=false;hintLevel=0;render(true);save();$('actions').focus();return;}var s=state();archive(s);drafts[current]=K.start(current,mode||s.mode,scenario||s.scenario);hintVisible=false;hintLevel=0;render(true);save();$('actions').focus();}
  function description(snapshot){
    var s=snapshot||state(),v=s.values,m=K.mission(s.id,s.scenario);
    if(s.id==='prep')return 'Hands: '+(v.washed?'washed with soap':'need washing')+'. Equipment: '+(v.clean?'clean and ready':v.cleaned?'washed; sanitizing still needed':'not yet ready')+'.';
    if(s.id==='knife')return 'Board: '+(v.secure?'secured':'not secured')+'. Grip: '+(v.claw?'claw':'not protected')+'. Cut: '+(v.cut==='large'?'uniform large dice':v.cut==='even'?'uniform small dice':v.cut||'whole carrot')+'.';
    if(s.id==='heat')return 'Heat: '+(v.heat||'off')+'. Mushrooms: '+(v.brown>4?'burned':v.brown>=3?'golden':v.brown>0?'beginning to brown':'pale')+', '+(v.dry?'dry surface':'wet surface')+', '+(v.spread?'spread out':'crowded')+'. Elapsed: '+(v.seconds||0)+' simulated seconds.';
    if(s.id==='probe')return 'Chicken: browned outside. Probe: '+(v.probe==='thick'?'thickest part':v.probe==='surface'?'surface only':'not placed')+'. Latest reading: '+(v.reading==null?'not yet taken or needs updating':v.reading+'°F ('+Math.round((v.reading-32)*5/9)+'°C)')+'.';
    if(s.id==='measure')return 'Measuring jug: '+(v.ml||0)+' mL of stock. Recipe: 150 mL for 2 servings. Target: '+m.servings+' servings.';
    return 'Leftovers: '+(v.discarded?'discarded':v.chilled?'refrigerated':'on the counter')+'. Container: '+(v.shallow?'shallow':'deep pot')+'. Label: '+(v.label?'added':'not added')+'. Time without temperature control: '+(m.elapsedMinutes+(v.extraMinutes||0))+' minutes at '+m.ambientF+'°F.';
  }
  function select(id,focus){serviceActive=false;current=id;hintVisible=false;hintLevel=0;render(true);save();if(focus){$('missionTitle').tabIndex=-1;$('missionTitle').focus();}}
  function summaries(){var rehearsed=[];serviceRuns.concat(service?[service]:[]).forEach(function(run){rehearsed=rehearsed.concat(run.completed);if(run.work&&run.work.submitted)rehearsed.push(run.work);});return K.summarize(attempts.concat(Object.values(achievements),rehearsed));}
  function renderStations(){
    $('stations').replaceChildren();var summary=summaries();
    K.missions.forEach(function(m,i){
      var b=node('button',undefined,'station');b.type='button';b.dataset.station=m.id;b.setAttribute('aria-pressed',String(m.id===current));
      b.append(node('small','STATION 0'+(i+1)),node('span',m.skill));
      var info=summary[i];b.append(node('span',info.independent?'Independent · '+info.scenarios.length+'/2 challenges':info.recorded?info.status:drafts[m.id]&&drafts[m.id].log.length?'In progress':'Ready to explore','station-state'));
      b.addEventListener('click',function(){select(m.id,false);$('stations').querySelector('[data-station="'+m.id+'"]').focus();});$('stations').append(b);
    });
  }
  function lens(s){var v=s.values,m=K.mission(s.id,s.scenario),value,detail;
    if(s.id==='prep'){value=v.clean&&v.washed?'Workspace ready':v.clean?'Wash your hands':'Prepare the workspace';detail=m.scenario==='shared-board'?'One board · clean, sanitize, wash hands':'Separate equipment · clean hands';}
    if(s.id==='knife'){value=v.cut==='large'?'Large dice':v.cut==='even'?'Small dice':v.cut==='uneven'?'Mixed sizes':'Whole carrot';detail=(v.secure?'Stable board':'Board not secured')+' · '+(v.claw?'Claw grip':'Check your grip');}
    if(s.id==='heat'){value=v.brown>4?'Burned':v.brown>=3?'Golden':v.brown>0?'Browning':'Pale';detail='Heat '+(v.heat||'off')+' · '+(v.seconds||0)+' simulated seconds';}
    if(s.id==='probe'){value=v.reading==null?'Take a reading':v.reading+'°F / '+Math.round((v.reading-32)*5/9)+'°C';detail=v.probe==='surface'?'Surface only · not internal evidence':v.probe==='thick'?'Probe in thickest part':'Position the thermometer';}
    if(s.id==='measure'){value=(v.ml||0)+' mL';detail='Recipe request · '+m.servings+' servings';}
    if(s.id==='chill'){value=v.discarded?'Discarded':v.chilled?'Refrigerated':(m.elapsedMinutes+(v.extraMinutes||0))+' minutes out';detail=m.ambientF+'°F ambient · '+(v.shallow?'Shallow containers':'Deep pot');}
    $('lensTitle').textContent=m.skill;$('lensValue').textContent=value;$('lensDetail').textContent=detail;
  }
  function renderCoaching(){
    var s=state(),c=K.coaching(s),guided=s.mode==='practice',open=!s.submitted&&(guided||hintVisible),specific=guided||hintLevel===2;
    $('hint').hidden=guided||s.submitted;$('hint').disabled=s.submitted||s.hints>=500;$('hint').textContent=hintVisible?'Hide coaching':'Show a thinking prompt';$('hint').setAttribute('aria-expanded',String(open&&!guided));
    $('hintText').hidden=!open;$('coachHeading').textContent=guided?'Coaching for this moment':specific?'A suggested next step':'A thinking prompt';
    $('coachPrompt').textContent=c.prompt;$('coachNext').textContent=c.next;$('coachWhy').textContent=c.why;$('coachNext').hidden=$('coachWhy').hidden=!specific;
    $('hintMore').hidden=guided||specific;$('hintMore').disabled=s.hints>=500;$('coachRetry').hidden=!specific||!c.restart;$('hintAccounting').hidden=guided;
  }
  function appendHintReview(target,s){if(!(s.hintLog||[]).length)return;var detail=node('details',undefined,'hint-review');detail.append(node('summary','Review requested coaching'));var list=node('ol');s.hintLog.forEach(function(h){list.append(node('li','After '+h.afterAction+' actions · '+(h.level===1?'Thinking prompt: ':'Suggested step: ')+h.text));});detail.append(list);target.append(detail);}
  function render(build){
    var s=state(),m=K.mission(current,s.scenario),index=K.missions.findIndex(function(x){return x.id===current;});
    if(build){
      replayState=null;$('replayPanel').open=false;$('replayStep').value='0';
      $('stationNumber').textContent=serviceActive?'DINNER FOR FOUR · CHECKPOINT '+Math.min(service.stage+1,6)+' / 6':'STATION 0'+(index+1)+' / 06';$('skill').textContent=m.skill;$('missionTitle').textContent=m.title;$('brief').textContent=serviceActive?K.service.steps[Math.min(service.stage,5)].brief:m.brief;
      $('goal').textContent=s.mode==='demonstrate'&&s.id==='measure'?'Use the serving ratio to measure the requested stock, then check it at eye level.':m.goal;
      $('question').textContent=m.question;$('transfer').textContent=m.transfer;$('mode').value=s.mode;$('reflection').value=s.reflection;$('plan').value=s.plan||'';
      $('scenario').replaceChildren();K.scenarios(current).forEach(function(c){var o=node('option',c.label);o.value=c.id;$('scenario').append(o);});$('scenario').value=s.scenario;
      $('actionButtons').replaceChildren();
      m.actions.forEach(function(a){var b=node('button',a[1]);b.type='button';b.dataset.action=a[0];b.addEventListener('click',function(){setState(K.act(state(),a[0]));hintVisible=false;hintLevel=0;render(false);save();if(state().done){$('question').tabIndex=-1;$('question').focus();}});$('actionButtons').append(b);});
      $('answers').replaceChildren();m.answers.forEach(function(answer,i){var label=node('label'),input=node('input');input.type='radio';input.name='reason';input.value=String(i);input.checked=s.answer===i;input.addEventListener('change',function(){state().answer=i;render(false);save();});label.append(input,node('span',answer));$('answers').append(label);});
      renderStations();
    }
    $('mode').disabled=$('scenario').disabled=serviceActive||s.log.length>0||s.submitted;$('newChallenge').hidden=serviceActive;$('retry').hidden=serviceActive&&service.stage===6;
    $('modeDescription').textContent=s.mode==='practice'?'Coaching follows the current workspace. Try a step, observe the change, and decide what comes next.':'Apply the skill to this challenge. You can request a thinking prompt or a suggested step; that support is recorded.';
    renderCoaching();
    $('plan').disabled=s.log.length>0||s.submitted;$('plan').closest('details').hidden=s.submitted;$('actionButtons').hidden=$('actions').hidden=s.submitted;
    $('actionButtons').querySelectorAll('button').forEach(function(b){b.disabled=s.done||s.log.length>=500;});
    $('feedback').textContent=s.log.length>=500&&!s.done?'This attempt reached its 500-action limit. Start a fresh attempt; this notebook will be archived.':s.feedback;
    $('sceneDescription').textContent=description();$('workObservation').textContent=description();lens(s);
    var criteria=K.criteria(s);$('criteriaList').replaceChildren();criteria.forEach(function(c){var item=node('li',undefined,c.met?'criterion met':'criterion');item.append(node('span',c.met?'✓':'○','criterion-icon'),node('span',c.label),node('span',c.met?'Ready':'Not yet','criterion-state'));$('criteriaList').append(item);});
    $('criteriaCount').textContent=criteria.filter(function(c){return c.met;}).length+'/'+criteria.length+' ready';
    $('phaseAct').setAttribute('aria-current',!s.done?'step':'false');$('phaseExplain').setAttribute('aria-current',s.done&&!s.submitted?'step':'false');$('phaseRecord').setAttribute('aria-current',s.submitted?'step':'false');
    $('reasoning').hidden=!s.done||s.submitted;$('answers').querySelectorAll('input').forEach(function(r){r.disabled=s.submitted;});$('reflection').disabled=s.submitted;$('submit').disabled=s.answer===null||s.submitted;
    $('logCount').textContent='('+s.log.length+')';$('actionLog').replaceChildren();s.log.slice(-30).forEach(function(entry){var a=m.actions.find(function(a){return a[0]===entry.action;});$('actionLog').append(node('li',a[1]+' — '+entry.observation));});if(s.log.length>30)$('actionLog').prepend(node('li','Showing the most recent 30 actions. The download contains the full attempt.'));
    $('result').hidden=!s.submitted;
    if(s.submitted){
      var e=K.evidence(s);$('result').replaceChildren(node('h3',e.status),node('p',m.scenarioLabel+' · '+e.actionCount+' actions · '+e.corrections+' corrections · '+e.hints+' hints'),node('p','Your explanation: '+e.answer),node('p',(e.reasoningCorrect?'Reasoning supported: ':'Revisit your explanation: ')+m.why),node('p','Your plan: '+(s.plan||'No written prediction recorded.')),node('p','Transfer reflection: '+(s.reflection||'No written response. Invite a spoken, signed, or practical explanation.')),node('p','Teacher review: written responses are recorded, not automatically graded. Observe physical skill in an appropriately supervised kitchen.'));
      appendHintReview($('result'),s);
      if(!serviceActive){var suggested=node('button',e.status==='Completed independently'?'Try a different challenge':e.reasoningCorrect?'Try this independently':'Revisit this challenge');suggested.type='button';suggested.addEventListener('click',function(){if(e.status==='Completed independently')nextChallenge();else fresh(s.scenario,e.reasoningCorrect?'demonstrate':'practice');});$('result').append(suggested);
      var next=node('button',index===5?'Return to the first station':'Explore the next station');next.type='button';next.addEventListener('click',function(){select(K.missions[(index+1)%6].id,true);});$('result').append(next);}else renderServiceResult(e);
    }
    var summary=summaries();$('progress').value=summary.filter(function(x){return x.recorded;}).length;$('progressCount').textContent=$('progress').value+' of 6 stations';
    var independent=summary.filter(function(x){return x.independent;}).length,variationCount=summary.reduce(function(n,x){return n+x.scenarios.length;},0);
    $('masteryCount').textContent=independent+' of 6 skills demonstrated independently · '+variationCount+' of 12 challenges';
    renderPortfolio();appendRehearsalPortfolio();renderService();renderRecommendation();renderTaskbar();renderReplay();if(sceneAPI)sceneAPI.update(replayState||s);applyView();
  }
  function renderPortfolio(){
    $('portfolio').replaceChildren();if(!attempts.length&&!service&&!serviceRuns.length)$('portfolio').append(node('p','Archived attempts will appear here. Current actions are in the notebook.'));
    attempts.slice().reverse().forEach(function(s){var e=K.evidence(s),a=node('article');a.append(node('strong',e.title),node('p',e.scenarioLabel+' · '+e.status+' · '+e.actionCount+' actions · '+e.corrections+' corrections · '+e.hints+' hints'));var detail=node('details');detail.append(node('summary','Review this evidence'),node('p','Plan: '+(e.plan||'Not recorded')),node('p','Reasoning: '+(e.answer||'Not submitted')),node('p','Transfer: '+(e.reflection||'Not recorded')));a.append(detail);$('portfolio').append(a);});
  }
  function appendRehearsalPortfolio(){serviceRuns.concat(service?[service]:[]).slice().reverse().forEach(function(run){var r=K.service.report(run),a=node('article',undefined,'rehearsal-record');a.append(node('strong','Dinner for four'),node('p',r.status+' · '+r.checkpointsCompleted+'/6 checkpoints · '+r.corrections+' corrections · '+r.hints+' hints'));var details=node('details');details.append(node('summary','Review rehearsal checkpoints'));r.entries.forEach(function(entry){var e=entry.evidence,d=node('details');d.append(node('summary','Checkpoint '+entry.checkpoint+' · '+K.service.steps[entry.checkpoint-1].label+' · '+entry.kind),node('p',e.status),node('p','Plan: '+(e.plan||'Not recorded')),node('p','Reasoning: '+(e.answer||'Not submitted')),node('p','Transfer: '+(e.reflection||'Not recorded')));var notebookLoaded=false;d.addEventListener('toggle',function(){if(!d.open||notebookLoaded)return;notebookLoaded=true;var list=node('ol');e.actions.forEach(function(action){list.append(node('li',action.action+' — '+action.observation));});d.append(list);});details.append(d);});a.append(details);$('portfolio').append(a);});}
  function nextChallenge(){var s=state(),list=K.scenarios(current),i=list.findIndex(function(c){return c.id===s.scenario;});fresh(list[(i+1)%list.length].id);}
  $('mode').addEventListener('change',function(){fresh(state().scenario,this.value);});$('scenario').addEventListener('change',function(){fresh(this.value);});
  $('hint').addEventListener('click',function(){if(hintVisible){hintVisible=false;}else{setState(K.requestHint(state(),1));hintVisible=true;hintLevel=1;}render(false);save();});
  $('hintMore').addEventListener('click',function(){setState(K.requestHint(state(),2));hintVisible=true;hintLevel=2;render(false);save();$('coachHeading').tabIndex=-1;$('coachHeading').focus();});
  $('coachRetry').addEventListener('click',function(){fresh();});
  $('retry').addEventListener('click',function(){fresh();});$('newChallenge').addEventListener('click',nextChallenge);
  $('plan').addEventListener('input',function(){state().plan=this.value;save();});$('reflection').addEventListener('input',function(){state().reflection=this.value;save();});
  $('submit').addEventListener('click',function(){var s=K.submit(state());if(!s.submitted||state().submitted)return;setState(s);if(!serviceActive){attempts.push(s);attempts=attempts.slice(-60);remember(s);}render(true);save();$('result').tabIndex=-1;$('result').focus();});
  $('reviewToggle').addEventListener('click',function(){var open=$('portfolio').hidden;$('portfolio').hidden=!open;this.setAttribute('aria-expanded',String(open));});
  function report(){var pending=Object.values(drafts).filter(function(s){return !s.submitted&&(s.log.length||s.plan||s.hints);});return {title:'Kitchen Lab skills evidence',version:4,exportedAt:new Date().toISOString(),scope:'Simulated decisions and reasoning; not certification of physical kitchen competence. Written responses require human review.',skills:summaries(),bestDemonstrations:Object.values(achievements).map(K.evidence),attempts:attempts.concat(pending).map(K.evidence),rehearsals:serviceRuns.concat(service?[service]:[]).map(K.service.report)};}
  function download(content,type,name){var url=URL.createObjectURL(new Blob([content],{type:type})),a=node('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  $('export').addEventListener('click',function(){download(JSON.stringify(report(),null,2),'application/json','kitchen-lab-evidence.json');});
  $('exportReadable').addEventListener('click',function(){var r=report(),lines=[r.title,r.exportedAt,r.scope,'','SKILL PASSPORT'];r.skills.forEach(function(s){lines.push(K.mission(s.id).skill+': '+s.status+' ('+s.scenarios.length+'/2 independent challenges)');});r.attempts.forEach(function(e,i){lines.push('','ATTEMPT '+(i+1)+' · '+e.title,e.scenarioLabel+' | '+e.mode+' | '+e.status,'Corrections: '+e.corrections+' | Requested hints: '+e.hints,'Plan: '+(e.plan||'Not recorded'),'Reasoning: '+(e.answer||'Not submitted'),'Transfer reflection: '+(e.reflection||'Not recorded'),'Action notebook:');(e.hintLog||[]).forEach(function(h){lines.push('Coaching after '+h.afterAction+' actions (level '+h.level+'): '+h.text);});e.actions.forEach(function(a,n){lines.push((n+1)+'. '+a.action+': '+a.observation);});});r.rehearsals.forEach(function(run,i){lines.push('','DINNER FOR FOUR · REHEARSAL '+(i+1),run.status+' | '+run.checkpointsCompleted+'/6 checkpoints','Corrections: '+run.corrections+' | Requested hints: '+run.hints);run.entries.forEach(function(entry){var e=entry.evidence;lines.push('','Checkpoint '+entry.checkpoint+' · '+entry.kind+' · '+e.title,e.status,'Plan: '+(e.plan||'Not recorded'),'Reasoning: '+(e.answer||'Not submitted'),'Transfer reflection: '+(e.reflection||'Not recorded'));(e.hintLog||[]).forEach(function(h){lines.push('Coaching after '+h.afterAction+' actions (level '+h.level+'): '+h.text);});e.actions.forEach(function(a,n){lines.push((n+1)+'. '+a.action+': '+a.observation);});});});download(lines.join('\n'),'text/plain;charset=utf-8','kitchen-lab-learning-report.txt');});
  function applyView(){$('scene').hidden=textView||!sceneAPI;$('fallback').hidden=!textView&&!!sceneAPI;$('stationLens').hidden=textView||!sceneAPI;$('viewToggle').setAttribute('aria-pressed',String(textView));$('viewToggle').textContent=textView?'Use 3D view':'Use text view';['resetView','focusView','rotateLeft','rotateRight'].forEach(function(id){$(id).disabled=textView||!sceneAPI;});if(sceneAPI&&!textView)sceneAPI.resize();}
  $('viewToggle').addEventListener('click',function(){textView=!textView;applyView();save();});
  $('resetView').addEventListener('click',function(){if(sceneAPI)sceneAPI.reset();});$('focusView').addEventListener('click',function(){if(sceneAPI)sceneAPI.focus();});$('rotateLeft').addEventListener('click',function(){if(sceneAPI)sceneAPI.rotate(-.25);});$('rotateRight').addEventListener('click',function(){if(sceneAPI)sceneAPI.rotate(.25);});


  function openRehearsal(){serviceActive=true;current=(service.work||service.completed[5]).id;hintVisible=false;hintLevel=0;render(true);save();$('serviceCard').open=true;$('missionTitle').tabIndex=-1;$('missionTitle').focus();}
  function startRehearsal(){if(service)serviceRuns=serviceRuns.concat([service]).slice(-10);service=K.service.start($('serviceMode').value);openRehearsal();}
  function renderService(){
    var r=K.service.report(service),running=!!r&&!r.finished;
    $('serviceSummary').textContent=r?(r.finished?r.status:(serviceActive?'In rehearsal':'Rehearsal paused')+' · '+r.checkpointsCompleted+'/6 recorded'):'Bring six skills together in one meal';
    $('serviceResume').hidden=!service||serviceActive;$('serviceResume').textContent=r&&r.finished?'Review rehearsal':'Resume rehearsal';
    $('servicePause').hidden=!serviceActive;$('serviceMode').disabled=serviceActive&&running;if(serviceActive&&running)$('serviceMode').value=service.mode;
    $('serviceStart').textContent=service?'Start a new rehearsal':'Start rehearsal';
    $('serviceSteps').replaceChildren();K.service.steps.forEach(function(step,i){var li=node('li');var status=service&&i<service.stage?'Recorded':service&&i===service.stage?'Current':'Ahead';li.dataset.status=status;li.append(node('span',String(i+1),'checkpoint-number'),node('span',step.label),node('small',status));if(status==='Current')li.setAttribute('aria-current','step');$('serviceSteps').append(li);});
    $('serviceStatus').textContent=r?(r.finished?r.status+'. Review or download the evidence below.':'Checkpoint '+(r.checkpointsCompleted+1)+' of 6 · '+K.service.steps[r.checkpointsCompleted].label+'. Complete the actions and explain your decision to move on.'):'A fresh sequence with its own evidence. Previous station badges do not complete the rehearsal.';
  }
  function renderServiceResult(e){
    if(service.stage===6){var r=K.service.report(service);$('result').prepend(node('h3',r.status),node('p','Six checkpoints recorded · '+r.corrections+' corrections · '+r.hints+' hints across all attempts.'));var leave=node('button','Return to station practice');leave.addEventListener('click',function(){select(current,true);});$('result').append(leave);return;}
    if(K.service.ready(service)){var step=service.stage,next=node('button',step===5?'Finish rehearsal':'Continue: '+K.service.steps[step+1].label,'primary');next.id='serviceNext';next.addEventListener('click',function(){var completed=service.work;service=K.service.advance(service);remember(completed);current=(service.work||service.completed[5]).id;hintVisible=false;hintLevel=0;render(true);save();var target=service.work?$('missionTitle'):$('result');target.tabIndex=-1;target.focus();});$('result').append(next);}
    else {var retry=node('button','Retry this checkpoint');retry.id='serviceRetry';retry.addEventListener('click',function(){fresh();});$('result').append(node('p','Use the explanation above to revise your thinking. Your earlier attempt stays in this rehearsal record.'),retry);}
  }
  function recommendation(){return K.nextPractice(attempts,Object.values(achievements));}
  function renderRecommendation(){var next=recommendation();$('nextPracticeReason').textContent=next.reason;$('nextPractice').textContent=next.service?'Open the meal rehearsal':'Practice next: '+K.mission(next.id,next.scenario).skill;$('nextPracticeCard').hidden=serviceActive;}
  $('serviceStart').addEventListener('click',startRehearsal);
  $('serviceResume').addEventListener('click',openRehearsal);
  $('servicePause').addEventListener('click',function(){select(current,true);});
  $('nextPractice').addEventListener('click',function(){var next=recommendation();if(next.service){$('serviceCard').open=true;$('serviceStart').focus();return;}serviceActive=false;current=next.id;var d=drafts[current];if(!d||d.submitted||d.scenario!==next.scenario||d.mode!==next.mode){if(d)archive(d);drafts[current]=K.start(next.id,next.mode,next.scenario);}select(current,true);});


  function taskTarget(){return state().submitted?$('result'):state().done?$('question'):$('actions');}
  function goTo(target){target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});}
  function renderTaskbar(){var s=state();$('taskbarTitle').textContent=K.mission(s.id,s.scenario).skill;$('taskbarContext').textContent=serviceActive?'DINNER FOR FOUR · '+Math.min(service.stage+1,6)+'/6':'YOUR CURRENT TASK';$('goTask').textContent=s.submitted?'Review result':s.done?'Explain decision':'Go to actions';$('goPlan').hidden=!service;}
  $('goTask').addEventListener('click',function(){goTo(taskTarget());});
  $('goKitchen').addEventListener('click',function(){goTo($('kitchenHeading'));});
  $('goPlan').addEventListener('click',function(){$('serviceCard').open=true;goTo($('serviceCard').querySelector('summary'));});
  document.querySelector('.skip').addEventListener('click',function(e){e.preventDefault();goTo(taskTarget());});
  function showReplay(index){
    var s=state();if(!s.submitted)return;
    var r=K.replay(s,index),m=K.mission(s.id,s.scenario);replayState=r.state;
    $('replayStep').value=String(r.step);$('replayStep').setAttribute('aria-valuetext',r.step?'After action '+r.step+' of '+r.total:'Before the first action');
    $('replayPosition').textContent=r.step+' / '+r.total;$('replayPrevious').disabled=$('replayScenePrevious').disabled=r.step===0;$('replayNext').disabled=$('replaySceneNext').disabled=r.step===r.total;
    var action=r.entry?m.actions.find(function(a){return a[0]===r.entry.action;}):null;
    $('replayAction').textContent=r.entry?(r.entry.accepted?'Action: ':'Correction needed: ')+action[1]:'Before your first action';
    $('replayObservation').textContent=r.entry?r.entry.observation:'Inspect the starting conditions before any decisions were made.';
    $('replayWorkspace').textContent=description(r.state);$('sceneDescription').textContent='Replay: '+description(r.state);
    $('replayBanner').hidden=false;$('replaySceneStep').textContent=r.step?'After action '+r.step+' of '+r.total:'Before the first action';
    lens(r.state);$('lensTitle').textContent='REPLAY · '+m.skill;if(sceneAPI)sceneAPI.update(r.state);
  }
  function stopReplay(){replayState=null;$('replayPanel').open=false;$('replayBanner').hidden=true;$('sceneDescription').textContent=description();lens(state());if(sceneAPI)sceneAPI.update(state());}
  function renderReplay(){var s=state();$('replayPanel').hidden=!s.submitted;$('replayStep').max=String(s.log.length);if(replayState&&$('replayPanel').open)showReplay(Number($('replayStep').value));else $('replayBanner').hidden=true;}
  $('replayPanel').addEventListener('toggle',function(){if(this.open&&state().submitted)showReplay(Number($('replayStep').value));else if(replayState)stopReplay();});
  $('replayStep').addEventListener('input',function(){showReplay(Number(this.value));});
  $('replayPrevious').addEventListener('click',function(){showReplay(Number($('replayStep').value)-1);});
  $('replayNext').addEventListener('click',function(){showReplay(Number($('replayStep').value)+1);});
  $('replayScenePrevious').addEventListener('click',function(){showReplay(Number($('replayStep').value)-1);});
  $('replaySceneNext').addEventListener('click',function(){showReplay(Number($('replayStep').value)+1);});
  $('replayClose').addEventListener('click',function(){stopReplay();goTo($('replayPanel').querySelector('summary'));});
  $('returnLatest').addEventListener('click',function(){stopReplay();goTo($('kitchenHeading'));});
  $('replayKitchen').addEventListener('click',function(){if(sceneAPI&&!textView)sceneAPI.focus();goTo($('kitchenHeading'));});

  function initScene() {
    if (!window.THREE || !window.THREE.OrbitControls) throw new Error('3D runtime unavailable');
    var T = window.THREE, host = $('scene'), renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .85; host.append(renderer.domElement);
    var scene = new T.Scene(); scene.background = new T.Color('#e9eddf');
    var camera = new T.PerspectiveCamera(37, 1, .1, 100); var controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; controls.enablePan = false; controls.minDistance = 3.2; controls.maxDistance = 16; controls.maxPolarAngle = Math.PI / 2.2;
    var ambient = new T.HemisphereLight(0xfffae8, 0x71856d, .65); scene.add(ambient);
    var light = new T.DirectionalLight(0xfff2d4, .75); light.position.set(-3, 8, 6); light.castShadow = true; light.shadow.mapSize.set(1024,1024); light.shadow.camera.left=-7; light.shadow.camera.right=7; light.shadow.camera.top=6; light.shadow.camera.bottom=-6; scene.add(light);
    var meshes = [], pickable = [], groups = {}, materials = []; var focused=false, focusedStation=null;
    function mat(color, extra) { var m = new T.MeshStandardMaterial(Object.assign({ color: color, roughness: .7 }, extra || {})); m.color.convertSRGBToLinear(); materials.push(m); return m; }
    function mesh(geometry, color, x, y, z, group, extra) { var obj = new T.Mesh(geometry, mat(color, extra)); obj.position.set(x,y,z); obj.castShadow = true; obj.receiveShadow = true; (group || scene).add(obj); meshes.push(obj); return obj; }
    function box(w,h,d,color,x,y,z,group,extra) { return mesh(new T.BoxGeometry(w,h,d),color,x,y,z,group,extra); }
    function cyl(top,bottom,h,color,x,y,z,group,extra) { return mesh(new T.CylinderGeometry(top,bottom,h,32),color,x,y,z,group,extra); }
    function sphere(r,color,x,y,z,group) { return mesh(new T.SphereGeometry(r,24,16),color,x,y,z,group); }
    function label(text,x,y,z) { var canvas=document.createElement('canvas'); canvas.width=512; canvas.height=96; var c=canvas.getContext('2d'); c.fillStyle='#fffef9'; c.fillRect(0,0,512,96); c.font='bold 35px sans-serif'; c.textAlign='center'; c.fillStyle='#294837'; c.fillText(text,256,61); var texture=new T.CanvasTexture(canvas); texture.encoding=T.sRGBEncoding; var material=new T.SpriteMaterial({map:texture,toneMapped:false}); var sprite=new T.Sprite(material); sprite.position.set(x,y,z); sprite.scale.set(1.25,.235,1); scene.add(sprite); materials.push(material); }
    // A compact open-front teaching kitchen, built from local geometry.
    box(9,.18,5,'#d7c8aa',0,-.12,0); box(9,3.7,.12,'#d8dfcd',0,1.7,-2.1); box(.12,3.7,4.3,'#e0e5d5',-4.45,1.7,0);
    for(var tx=-4;tx<4.4;tx+=.65) box(.015,.01,4.8,'#baac91',tx,-.02,0);
    box(7.25,1.15,1.5,'#456a50',-.5,.55,-.95); box(7.45,.16,1.65,'#f4ebd8',-.5,1.2,-.95);
    for(var dx=-3.5;dx<3;dx+=1.18){box(1.1,.92,.04,'#52785a',dx,.61,-.18);box(.32,.035,.08,'#d8bb7f',dx,.96,-.12);}
    box(2.25,1.25,.08,'#f8f1d3',-.9,2.53,-2); box(.045,1.25,.1,'#a5bda0',-.9,2.53,-1.94); box(2.25,.045,.1,'#a5bda0',-.9,2.53,-1.94);
    box(1.35,.1,.55,'#927252',-3.3,2.45,-1.8); cyl(.14,.12,.33,'#bd825c',-3.4,2.67,-1.7); sphere(.23,'#568255',-3.4,2.94,-1.7);
    var loc={prep:[-3,0,-.85],knife:[-1.5,0,-.85],heat:[.1,0,-.85],probe:[1.65,0,-.85],measure:[3,0,-.6],chill:[3.65,0,-1.4]};
    Object.keys(loc).forEach(function(id){var g=new T.Group();g.position.set.apply(g.position,loc[id]);scene.add(g);groups[id]=g;var p=box(1.25,.07,1.23,'#d5ba73',0,1.31,0,g);p.userData.mission=id;pickable.push(p);});
    // Sink, tap, soap, and a water surface that changes after washing.
    var sink=cyl(.44,.35,.12,'#a9bab1',0,1.37,0,groups.prep); var water=cyl(.35,.34,.015,'#83b8c2',0,1.44,0,groups.prep);
    var bubbles=[];for(var bi=0;bi<8;bi++){var bubble=sphere(.035+(bi%3)*.012,'#e2f4f0',Math.cos(bi)*.25,1.475,Math.sin(bi)*.24,groups.prep);bubble.visible=false;bubbles.push(bubble);}
    box(.065,.52,.065,'#aab7af',0,1.65,-.48,groups.prep);box(.065,.065,.3,'#aab7af',0,1.9,-.34,groups.prep);box(.18,.29,.16,'#d5ae68',.48,1.53,-.3,groups.prep);
    var cleanBoard=box(.35,.025,.6,'#b77e58',-.48,1.38,0,groups.prep);
    // Cutting board, safety mat, carrot and diced pieces.
    var matBoard=box(1.08,.025,.8,'#bda676',0,1.365,0,groups.knife);box(1,.06,.72,'#c39461',0,1.405,0,groups.knife);
    var whole=mesh(new T.CylinderGeometry(.075,.12,.62,18),'#e88935',0,1.51,0,groups.knife);whole.rotation.z=Math.PI/2;
    var knife=box(.44,.035,.075,'#bdc8c0',0,1.5,-.24,groups.knife);box(.22,.055,.07,'#354b3c',.32,1.5,-.24,groups.knife);
    var dice=[];for(var i=0;i<12;i++){var d=box(.1,.1,.1,'#e88935',(i%4)*.17-.26,1.5,Math.floor(i/4)*.16-.15,groups.knife);d.visible=false;dice.push(d);}
    // Hob with burner, pan, and mushrooms whose material and spacing reflect state.
    box(1.24,.06,1.1,'#343e36',0,1.39,0,groups.heat);var burner=cyl(.43,.43,.04,'#5c665b',0,1.45,0,groups.heat);
    cyl(.43,.37,.09,'#303c33',0,1.53,0,groups.heat);box(.57,.055,.11,'#3b453d',.58,1.54,0,groups.heat);
    var mushrooms=[],stems=[];for(var j=0;j<8;j++){var stem=cyl(.033,.038,.075,'#c5b58b',Math.cos(j)*.2,1.59,Math.sin(j)*.2,groups.heat);var mush=sphere(.095,'#e6cfa7',Math.cos(j)*.2,1.645,Math.sin(j)*.2,groups.heat);mush.scale.y=.5;mushrooms.push(mush);stems.push(stem);}
    // Oven and chicken plate, thermometer position is visible.
    box(1.05,.85,.065,'#293d31',0,.66,.74,groups.probe);box(.84,.5,.025,'#768d79',0,.62,.79,groups.probe);box(.65,.045,.075,'#d7bf8c',0,1,.82,groups.probe);
    cyl(.46,.46,.05,'#fff6e3',0,1.39,0,groups.probe);var chicken=sphere(.27,'#bd793b',0,1.56,0,groups.probe);chicken.scale.set(1.15,.65,.8);
    var probe=box(.025,.44,.025,'#9badad',0,1.85,0,groups.probe);var display=box(.18,.14,.07,'#3a5643',0,2.08,0,groups.probe);probe.visible=false;display.visible=false;
    // Measuring jug is on a small island, with graduated fill and tick marks.
    groups.measure.position.set(2.4,0,1.05);box(1.4,1.18,1,'#75906a',0,.55,0,groups.measure);box(1.5,.1,1.1,'#f2e7d1',0,1.26,0,groups.measure);
    cyl(.27,.23,.68,'#c9e1d9',0,1.68,0,groups.measure,{transparent:true,opacity:.28,depthWrite:false});var fill=cyl(.24,.21,.6,'#dba94f',0,1.65,0,groups.measure);fill.visible=false;
    for(var k=1;k<6;k++)box(.16,.018,.02,'#455f49',.14,1.35+k*.11,.237,groups.measure);
    box(.045,.4,.045,'#86a697',.38,1.65,0,groups.measure);box(.15,.045,.045,'#86a697',.32,1.87,0,groups.measure);box(.15,.045,.045,'#86a697',.32,1.44,0,groups.measure);
    // Fridge with visible shelf and containers once the learner refrigerates them.
    box(1.05,2.4,1.12,'#9fb4a0',0,1.17,0,groups.chill);var fridgeDoor=new T.Group();fridgeDoor.position.set(-.46,1.18,.59);groups.chill.add(fridgeDoor);box(.91,2.18,.055,'#c6d4bf',.46,0,0,fridgeDoor);box(.055,.6,.06,'#566e57',.15,.27,.06,fridgeDoor);box(.86,.025,.06,'#829a80',0,1.55,.64,groups.chill);
    var tub=box(.48,.12,.32,'#f3e9d3',-.3,1.46,1.03,groups.chill),lid=box(.51,.025,.35,'#79a4a2',-.3,1.535,1.03,groups.chill),labelMesh=box(.2,.055,.01,'#fff8de',-.3,1.46,1.198,groups.chill);labelMesh.visible=false;
    var selection=new T.Mesh(new T.TorusGeometry(.62,.027,10,60),new T.MeshBasicMaterial({color:'#c08a28'}));selection.rotation.x=Math.PI/2;scene.add(selection);meshes.push(selection);
    label('01  CLEAN',-3,2.07,-.3);label('02  PREP',-1.5,2.05,-.3);label('03  HEAT',.1,2.05,-.3);label('04  CHECK',1.65,2.22,-.3);label('05  MEASURE',2.4,2.32,1.05);label('06  STORE',3.65,2.68,-1.2);
    Object.keys(groups).forEach(function(id){groups[id].traverse(function(obj){if(obj.isMesh){obj.userData.mission=id;pickable.push(obj);}});});
    function draw(){renderer.render(scene,camera);}
    function resize(){if(host.hidden)return;var w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
    function reset(){focused=false;focusedStation=null;$('focusView').setAttribute('aria-pressed','false');camera.position.set(7.4,6.6,9.7);controls.target.set(0,1,0);controls.update();resize();}
    controls.addEventListener('change',draw);
    var startPointer=null;
    renderer.domElement.addEventListener('pointerdown',function(e){startPointer={x:e.clientX,y:e.clientY};});
    renderer.domElement.addEventListener('pointerup',function(e){if(!startPointer||Math.hypot(e.clientX-startPointer.x,e.clientY-startPointer.y)>6)return;var rect=renderer.domElement.getBoundingClientRect();var ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);var hit=ray.intersectObjects(pickable)[0];if(hit)select(hit.object.userData.mission,false);});
    renderer.domElement.addEventListener('webglcontextlost',function(e){e.preventDefault();textView=true;$('sceneStatus').textContent='3D interrupted. Continue using the text controls.';applyView();});
    function update(s){var picture=Object.assign({},sceneStates());picture[s.id]=s;if(focused&&focusedStation!==s.id)focus();var v=s.values,g=groups[s.id];selection.position.set(g.position.x,1.355,g.position.z);var prep=picture.prep?picture.prep.values:{},kv=picture.knife?picture.knife.values:{};bubbles.forEach(function(b){b.visible=!!prep.washed;});water.material.color.set(prep.washed?'#9fdbc8':'#83b8c2');cleanBoard.material.color.set(prep.clean?'#79a47f':'#b77e58');matBoard.material.color.set(kv.secure?'#436e58':'#bda676');whole.visible=!kv.cut;dice.forEach(function(d,i){d.visible=!!kv.cut;d.scale.setScalar(kv.cut==='large'?1.65:kv.cut==='uneven'?(i%3+1)*.65:1);});knife.rotation.y=kv.claw?.18:0;
      var heat=picture.heat?picture.heat.values:{};burner.material.color.set(heat.heat==='high'?'#e67c33':heat.heat==='medium'?'#b8864b':'#5c665b');mushrooms.forEach(function(m,i){m.material.color.set(heat.brown>4?'#4a3429':heat.brown>=3?'#a66a2c':heat.brown>0?'#c79854':'#e6cfa7');m.position.x=Math.cos(i)*(heat.spread?.29:.14);m.position.z=Math.sin(i)*(heat.spread?.29:.14);stems[i].position.x=m.position.x;stems[i].position.z=m.position.z;});
      var pv=picture.probe?picture.probe.values:{};probe.visible=display.visible=!!pv.probe;probe.position.x=display.position.x=pv.probe==='surface'?.25:0;probe.rotation.z=pv.probe==='surface'?-.6:0;
      var ml=picture.measure?(picture.measure.values.ml||0):0;fill.visible=ml>0;fill.scale.y=Math.max(.01,ml/1000);fill.position.y=1.35+.3*ml/1000;
      var cv=picture.chill?picture.chill.values:{};fridgeDoor.rotation.y=cv.chilled?-.35:0;tub.visible=lid.visible=!cv.discarded;labelMesh.visible=!!cv.label&&!cv.discarded;[tub,lid,labelMesh].forEach(function(o){o.position.z=(o===labelMesh?1.198:1.03)-(cv.chilled?.36:0);});tub.scale.y=cv.shallow?1:2;[water,cleanBoard,matBoard,burner].concat(mushrooms).forEach(function(o){o.material.color.convertSRGBToLinear();});
      draw();}
    var observer=new ResizeObserver(resize);observer.observe(host);reset();
    window.addEventListener('pagehide',function(e){if(e.persisted)return;observer.disconnect();controls.dispose();meshes.forEach(function(m){m.geometry.dispose();});materials.forEach(function(m){if(m.map)m.map.dispose();m.dispose();});selection.material.dispose();renderer.dispose();});
    function focus(){focused=true;focusedStation=current;$('focusView').setAttribute('aria-pressed','true');var g=groups[current];controls.target.set(g.position.x,1.4,g.position.z);camera.position.set(g.position.x+2.4,4.2,g.position.z+3.8);controls.update();draw();}
    function rotate(angle){var offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new T.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();draw();}
    return {update:update,resize:resize,reset:reset,focus:focus,rotate:rotate};
  }
  try { sceneAPI=initScene(); } catch(e) { $('sceneStatus').textContent='3D is unavailable on this device. All practice actions work in text view.'; $('viewToggle').disabled=true; }
  if(serviceActive)$('serviceCard').open=true;
  render(true); save();
})();
