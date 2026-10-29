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
  function act(action,fromScene){
    var s=state();if(replayState||s.submitted||s.done||s.log.length>=500)return;
    setState(K.act(s,action));hintVisible=false;hintLevel=0;render(false);save();if(sceneAPI&&state()!==s)sceneAPI.respond(action,state());
    if(!fromScene&&state().done){$('question').tabIndex=-1;$('question').focus();}
  }
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
      m.actions.forEach(function(a){var b=node('button',a[1]);b.type='button';b.dataset.action=a[0];b.addEventListener('click',function(){act(a[0],false);});$('actionButtons').append(b);});
      $('answers').replaceChildren();m.answers.forEach(function(answer,i){var label=node('label'),input=node('input');input.type='radio';input.name='reason';input.value=String(i);input.checked=s.answer===i;input.addEventListener('change',function(){state().answer=i;render(false);save();});label.append(input,node('span',answer));$('answers').append(label);});
      renderStations();
    }
    $('mode').disabled=$('scenario').disabled=serviceActive||s.log.length>0||s.submitted;$('newChallenge').hidden=serviceActive;$('retry').hidden=serviceActive&&service.stage===6;
    $('modeDescription').textContent=s.mode==='practice'?'Coaching follows the current workspace. Try a step, observe the change, and decide what comes next.':'Apply the skill to this challenge. You can request a thinking prompt or a suggested step; that support is recorded.';
    renderCoaching();
    if(window.KitchenChemistry)window.KitchenChemistry.update($('kitchenChemistry'),{locked:s.mode==='demonstrate'&&!s.submitted,context:s.id,topic:s.id==='heat'?'browning':s.id==='measure'?'starch':'salt-boiling'});
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
  function applyView(){$('scene').hidden=textView||!sceneAPI;$('fallback').hidden=!textView&&!!sceneAPI;$('stationLens').hidden=textView||!sceneAPI;$('viewToggle').setAttribute('aria-pressed',String(textView));$('viewToggle').textContent=textView?'Use 3D view':'Use text view';['resetView','focusView','rotateLeft','rotateRight'].forEach(function(id){$(id).disabled=textView||!sceneAPI;});if(sceneAPI){sceneAPI.interactionView();if(!textView)sceneAPI.resize();}}
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
    renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = .85; renderer.domElement.setAttribute('aria-hidden','true'); host.append(renderer.domElement);
    var scene = new T.Scene(); scene.background = new T.Color('#e9eddf');
    var camera = new T.PerspectiveCamera(37, 1, .1, 100); var controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false; controls.enablePan = false; controls.minDistance = 3.2; controls.maxDistance = 16; controls.maxPolarAngle = Math.PI / 2.2;
    var ambient = new T.HemisphereLight(0xfffae8, 0x71856d, .65); scene.add(ambient);
    var light = new T.DirectionalLight(0xfff2d4, .75); light.position.set(-3, 8, 6); light.castShadow = true; light.shadow.mapSize.set(1024,1024); light.shadow.camera.left=-7; light.shadow.camera.right=7; light.shadow.camera.top=6; light.shadow.camera.bottom=-6; scene.add(light);
    var meshes = [], pickable = [], groups = {}, materials = [],stationLabels=[],stationBadges=[]; var focused=false, focusedStation=null,touch=null,touchTargets={},highlighted=[],feedbackFrame=null,feedbackStart=0,lastSize=null;
    function mat(color, extra) { var m = new T.MeshStandardMaterial(Object.assign({ color: color, roughness: .7 }, extra || {})); m.color.convertSRGBToLinear(); materials.push(m); return m; }
    function mesh(geometry, color, x, y, z, group, extra) { var obj = new T.Mesh(geometry, mat(color, extra)); obj.position.set(x,y,z); obj.castShadow = true; obj.receiveShadow = true; (group || scene).add(obj); meshes.push(obj); return obj; }
    function box(w,h,d,color,x,y,z,group,extra) { return mesh(new T.BoxGeometry(w,h,d),color,x,y,z,group,extra); }
    function cyl(top,bottom,h,color,x,y,z,group,extra) { return mesh(new T.CylinderGeometry(top,bottom,h,32),color,x,y,z,group,extra); }
    function sphere(r,color,x,y,z,group) { return mesh(new T.SphereGeometry(r,24,16),color,x,y,z,group); }
    function badge(w,h,x,y,z,parent){
      var surface=document.createElement('canvas');surface.width=256;surface.height=128;var context=surface.getContext('2d'),texture=new T.CanvasTexture(surface);texture.encoding=T.sRGBEncoding;
      var material=new T.SpriteMaterial({map:texture,toneMapped:false,depthTest:false,depthWrite:false}),sprite=new T.Sprite(material),previous='';sprite.renderOrder=3;sprite.scale.set(w,h,1);sprite.position.set(x,y,z);parent.add(sprite);materials.push(material);stationBadges.push(sprite);
      function write(top,bottom){var key=top+'|'+bottom;if(previous===key)return;previous=key;context.fillStyle='#edf3e8';context.fillRect(0,0,256,128);context.textAlign='center';context.fillStyle='#233e2e';context.font='bold 42px Arial';context.fillText(top,128,57,240);context.font='25px Arial';context.fillText(bottom,128,104,240);texture.needsUpdate=true;}
      return {sprite:sprite,write:write};
    }
    function label(text,x,y,z) { var canvas=document.createElement('canvas'); canvas.width=512; canvas.height=96; var c=canvas.getContext('2d'); c.fillStyle='#fffef9'; c.fillRect(0,0,512,96); c.font='bold 35px sans-serif'; c.textAlign='center'; c.fillStyle='#294837'; c.fillText(text,256,61); var texture=new T.CanvasTexture(canvas); texture.encoding=T.sRGBEncoding; var material=new T.SpriteMaterial({map:texture,toneMapped:false}); var sprite=new T.Sprite(material); sprite.position.set(x,y,z); sprite.scale.set(1.25,.235,1); scene.add(sprite); materials.push(material);stationLabels.push(sprite); }
    // A compact open-front teaching kitchen, built from local geometry.
    box(9,.18,5,'#d7c8aa',0,-.12,0); box(9,3.7,.12,'#d8dfcd',0,1.7,-2.1); box(.12,3.7,4.3,'#e0e5d5',-4.45,1.7,0);
    for(var tx=-4;tx<4.4;tx+=.65) box(.015,.01,4.8,'#baac91',tx,-.02,0);
    // Leave a real opening beneath the temperature station for the oven cavity.
    box(5.225,1.15,1.5,'#456a50',-1.5125,.55,-.95);box(.925,1.15,1.5,'#456a50',2.6625,.55,-.95);box(7.45,.16,1.65,'#f4ebd8',-.5,1.2,-.95);
    [[-3.5,1.1],[-2.32,1.1],[-1.14,1.1],[.04,1.1],[.83,.45],[2.66,.8]].forEach(function(door){box(door[1],.92,.04,'#52785a',door[0],.61,-.18);box(Math.min(.32,door[1]*.5),.035,.08,'#d8bb7f',door[0],.96,-.12);});
    box(2.25,1.25,.08,'#f8f1d3',-.9,2.53,-2); box(.045,1.25,.1,'#a5bda0',-.9,2.53,-1.94); box(2.25,.045,.1,'#a5bda0',-.9,2.53,-1.94);
    box(1.35,.1,.55,'#927252',-3.3,2.45,-1.8); cyl(.14,.12,.33,'#bd825c',-3.4,2.67,-1.7); sphere(.23,'#568255',-3.4,2.94,-1.7);
    var loc={prep:[-3,0,-.85],knife:[-1.5,0,-.85],heat:[.1,0,-.85],probe:[1.65,0,-.85],measure:[3,0,-.6],chill:[3.65,0,-1.4]};
    Object.keys(loc).forEach(function(id){var g=new T.Group();g.position.set.apply(g.position,loc[id]);scene.add(g);groups[id]=g;var p=box(1.25,.07,1.23,'#d5ba73',0,1.31,0,g);p.userData.mission=id;pickable.push(p);});
    // Sink, tap, soap, and a water surface that changes after washing.
    var sink=cyl(.44,.35,.12,'#a9bab1',0,1.37,0,groups.prep); var water=cyl(.35,.34,.015,'#83b8c2',0,1.44,0,groups.prep);
    var bubbles=[];for(var bi=0;bi<8;bi++){var bubble=sphere(.035+(bi%3)*.012,'#e2f4f0',Math.cos(bi)*.25,1.475,Math.sin(bi)*.24,groups.prep);bubble.visible=false;bubbles.push(bubble);}
    var tapStem=box(.065,.52,.065,'#aab7af',0,1.65,-.48,groups.prep),tapSpout=box(.065,.065,.3,'#aab7af',0,1.9,-.34,groups.prep),tapLever=box(.23,.05,.07,'#537d85',-.12,1.9,-.48,groups.prep);
    var waterStream=cyl(.018,.03,.4,'#8ed1df',0,1.68,-.19,groups.prep,{transparent:true,opacity:.65});waterStream.visible=false;
    var soap=box(.18,.29,.16,'#d5ae68',.48,1.53,-.3,groups.prep);box(.12,.035,.06,'#455f49',.48,1.69,-.3,groups.prep);
    var cleanBoard=box(.38,.035,.64,'#b77e58',-.58,1.46,.28,groups.prep);
    var sanitizer=box(.18,.32,.16,'#6a8c9f',-.47,1.57,-.42,groups.prep),sanitizerPump=box(.23,.04,.06,'#354b3c',-.44,1.75,-.42,groups.prep),sanitizerBadge=badge(.34,.17,0,.06,.09,sanitizer);sanitizerBadge.write('SANITIZE','EQUIPMENT');sanitizer.visible=sanitizerPump.visible=false;
    box(.9,.07,.44,'#c39461',.26,1.3,.67,groups.prep);var vegetableBasket=cyl(.21,.17,.13,'#75906a',.30,1.42,.64,groups.prep),basketHandle=mesh(new T.TorusGeometry(.21,.018,8,36),'#456a50',.30,1.51,.64,groups.prep);basketHandle.rotation.x=Math.PI/2;
    var prepVegetables=[];for(var vi=0;vi<4;vi++){var v=sphere(.075,vi%2?'#db8138':'#7ca554',.23+(vi%2)*.14,1.53,.57+Math.floor(vi/2)*.12,groups.prep);prepVegetables.push(v);}
    // Cutting board, safety mat, carrot and diced pieces.
    var matBoard=box(1.08,.025,.8,'#bda676',0,1.365,0,groups.knife),cutBoard=box(1,.06,.72,'#c39461',0,1.405,0,groups.knife);
    var foldedMat=new T.Group();foldedMat.position.set(.43,1.42,.52);groups.knife.add(foldedMat);
    var matParts=[box(.36,.045,.22,'#4b7767',0,0,0,foldedMat)],matRoll=cyl(.026,.026,.36,'#6b9483',0,.024,-.09,foldedMat);matRoll.rotation.z=Math.PI/2;matParts.push(matRoll);
    for(var rib=0;rib<6;rib++)matParts.push(box(.006,.006,.17,'#729586',-.14+rib*.055,.026,.01,foldedMat));
    var whole=mesh(new T.CylinderGeometry(.075,.12,.62,18),'#e88935',0,1.51,0,groups.knife);whole.rotation.z=Math.PI/2;
    var knife=box(.44,.035,.075,'#bdc8c0',0,1.5,-.24,groups.knife),knifeHandle=box(.22,.075,.1,'#354b3c',.32,1.5,-.24,groups.knife);
    var dice=[];for(var i=0;i<12;i++){var d=box(.1,.1,.1,'#e88935',(i%4)*.17-.26,1.5,Math.floor(i/4)*.16-.15,groups.knife);d.visible=false;dice.push(d);}
    var hand=new T.Group();hand.position.set(-.20,1.55,.35);groups.knife.add(hand);
    var handPalm=box(.32,.075,.19,'#bd8e6b',0,0,0,hand),handCuff=box(.27,.08,.12,'#577f72',0,0,.15,hand),fingerJoints=[],fingerTips=[];
    for(var fi=0;fi<4;fi++){var joint=new T.Group();joint.position.set((fi-1.5)*.076,0,-.1);hand.add(joint);box(.058,.06,.14,'#c99b78',0,0,-.065,joint);var tip=sphere(.031,'#d3a583',0,0,-.145,joint);tip.scale.z=1.4;fingerJoints.push(joint);fingerTips.push(tip);}
    var thumb=box(.065,.065,.14,'#c99b78',.19,-.005,.005,hand);thumb.rotation.y=.55;
    function poseHand(curl){fingerJoints.forEach(function(j){j.rotation.x=-curl*1.35;});hand.position.y=1.55+curl*.045;hand.position.z=.35-curl*.08;thumb.rotation.y=.55+curl*.55;renderer.domElement.dataset.gripCurl=String(Math.round(curl*100));}
    // Hob with burner, pan, and mushrooms whose material and spacing reflect state.
    box(1.24,.06,1.1,'#343e36',0,1.39,0,groups.heat);var burner=cyl(.43,.43,.04,'#5c665b',0,1.45,0,groups.heat);
    var panBowl=cyl(.43,.37,.09,'#303c33',0,1.53,0,groups.heat),panHandle=box(.57,.075,.13,'#3b453d',.58,1.54,0,groups.heat);
    var dial=cyl(.14,.14,.07,'#e2cf9d',-.39,1.47,.43,groups.heat),dialMark=box(.025,.012,.09,'#294837',-.39,1.511,.39,groups.heat);
    var towel=box(.27,.04,.22,'#fff6de',.43,1.48,.43,groups.heat),towelFold=box(.25,.016,.11,'#d8d6c1',.43,1.508,.48,groups.heat);
    var cookTimer=box(.32,.22,.17,'#b67b43',-.48,1.54,-.45,groups.heat),timerBadge=badge(.32,.16,0,.025,.10,cookTimer);timerBadge.write('+30 s','SIMULATED');
    box(1.6,.08,.64,'#c39461',.12,1.29,.78,groups.heat);var servingPlate=cyl(.4,.37,.045,'#fff9e9',0,1.37,.83,groups.heat);
    var spatula=new T.Group();spatula.position.set(.69,1.39,.53);spatula.rotation.y=-.18;groups.heat.add(spatula);
    var spatulaBlade=box(.19,.028,.24,'#b58652',0,0,0,spatula),spatulaHandle=box(.055,.035,.36,'#966c43',0,.006,.28,spatula),spatulaParts=[spatulaBlade,spatulaHandle];
    for(var slot=0;slot<3;slot++)spatulaParts.push(box(.012,.004,.15,'#6c5037',-.045+slot*.045,.016,0,spatula));
    function mushroomAngle(index){return index*Math.PI/4;}
    var mushrooms=[],stems=[];for(var j=0;j<8;j++){var stem=cyl(.033,.038,.075,'#c5b58b',Math.cos(mushroomAngle(j))*.2,1.59,Math.sin(mushroomAngle(j))*.2,groups.heat);var mush=sphere(.095,'#e6cfa7',Math.cos(mushroomAngle(j))*.2,1.645,Math.sin(mushroomAngle(j))*.2,groups.heat);mush.scale.y=.5;mushrooms.push(mush);stems.push(stem);}
    var droplets=mushrooms.map(function(m){return sphere(.024,'#8ab9c1',m.position.x,1.69,m.position.z,groups.heat);});
    // The door opens locally while carrying; a drop records one simulated step.
    box(1.05,.84,.045,'#25352e',0,.75,.44,groups.probe);box(.065,.84,.36,'#40594a',-.5,.75,.62,groups.probe);box(.065,.84,.36,'#40594a',.5,.75,.62,groups.probe);box(1.05,.06,.36,'#40594a',0,1.15,.62,groups.probe);box(.94,.025,.35,'#acb5a5',0,.7,.62,groups.probe);
    var ovenDoor=new T.Group();ovenDoor.position.set(0,.35,.81);groups.probe.add(ovenDoor);box(1.05,.78,.065,'#293d31',0,.39,0,ovenDoor);box(.83,.47,.025,'#768d79',0,.39,.046,ovenDoor);box(.65,.045,.075,'#d7bf8c',0,.69,.09,ovenDoor);
    var ovenSign=box(.45,.12,.06,'#456a50',0,1.17,.83,groups.probe),ovenBadge=badge(.45,.19,0,.005,.045,ovenSign);ovenBadge.write('COOK','1 SIM STEP');
    var chickenPlate=cyl(.46,.46,.05,'#fff6e3',0,1.39,0,groups.probe),chicken=sphere(.27,'#bd793b',0,1.56,0,groups.probe);chicken.scale.set(1.15,.65,.8);
    box(1.06,.08,.7,'#c39461',.34,1.3,1.02,groups.probe);var serveMat=box(.76,.025,.58,'#85a69d',.34,1.357,1.02,groups.probe),serveBadge=badge(.42,.19,0,.17,.25,serveMat);serveBadge.write('SERVE','CHICKEN');
    box(.035,.016,.34,'#aab7af',.79,1.37,1.02,groups.probe);box(.2,.012,.36,'#fff9e9',-.15,1.37,1.02,groups.probe);
    var probe=box(.025,.44,.025,'#9badad',.46,1.76,.24,groups.probe);var display=box(.32,.22,.09,'#3a5643',.46,1.99,.24,groups.probe),probeBadge=badge(.3,.15,0,.005,.055,display);probeBadge.write('—','Tap to read');
    // Measuring jug is on a small island, with graduated fill and tick marks.
    groups.measure.position.set(2.4,0,1.05);box(1.4,1.18,1,'#75906a',0,.55,0,groups.measure);box(1.5,.1,1.1,'#f2e7d1',0,1.26,0,groups.measure);
    var jugStart=meshes.length,jug=cyl(.27,.23,.68,'#c9e1d9',0,1.68,0,groups.measure,{transparent:true,opacity:.28,depthWrite:false});var fill=cyl(.24,.21,.6,'#dba94f',0,1.65,0,groups.measure),liquidSurface=cyl(.24,.24,.008,'#f1ce79',0,1.35,0,groups.measure);fill.visible=liquidSurface.visible=false;
    var scaleCanvas=document.createElement('canvas');scaleCanvas.width=300;scaleCanvas.height=660;var scaleContext=scaleCanvas.getContext('2d');scaleContext.fillStyle='rgba(237,243,232,.9)';scaleContext.fillRect(0,0,300,660);scaleContext.strokeStyle=scaleContext.fillStyle='#233e2e';scaleContext.lineWidth=5;scaleContext.font='bold 50px Arial';scaleContext.textBaseline='middle';
    for(var mark=0;mark<=1000;mark+=50){var markY=630-mark*.6;scaleContext.beginPath();scaleContext.moveTo(12,markY);scaleContext.lineTo(mark%250===0?80:mark%100===0?54:35,markY);scaleContext.stroke();if(mark%250===0)scaleContext.fillText(String(mark),90,markY);}
    var scaleTexture=new T.CanvasTexture(scaleCanvas);scaleTexture.encoding=T.sRGBEncoding;mesh(new T.PlaneGeometry(.3,.66),'#ffffff',.03,1.65,.277,groups.measure,{map:scaleTexture,transparent:true,roughness:1});
    var jugHandle=box(.065,.4,.065,'#86a697',.38,1.65,0,groups.measure);box(.15,.045,.045,'#86a697',.32,1.87,0,groups.measure);box(.15,.045,.045,'#86a697',.32,1.44,0,groups.measure);
    var jugParts=meshes.slice(jugStart);
    var measureCheck=box(.42,.15,.18,'#456a50',-.44,1.4,.29,groups.measure),measureBadge=badge(.42,.21,0,.10,.04,measureCheck);measureBadge.write('CHECK','MEASURE');
    var stockCarton=box(.27,.48,.25,'#a9bf8c',-.49,1.55,-.27,groups.measure);box(.27,.06,.25,'#dbe5c6',0,.27,0,stockCarton);cyl(.055,.055,.08,'#f9f3df',0,.34,0,stockCarton);var stockBadge=badge(.33,.17,0,.015,.14,stockCarton);stockBadge.write('STOCK','150 mL');
    var stockStream=cyl(.012,.017,1,'#e8bc68',0,2,0,groups.measure),measureShownMl=0;stockStream.visible=false;
    function showMeasureAmount(ml,preview){
      var amount=Math.max(0,Math.min(1000,ml||0)),level=amount/1000;fill.visible=liquidSurface.visible=amount>0;fill.scale.y=Math.max(.01,level);fill.position.y=1.35+.3*level;liquidSurface.position.y=1.35+.6*level;
      measureBadge.write(preview?amount+' mL':'CHECK',preview?'PREVIEW':amount+' mL');renderer.domElement.dataset.measurePreview=preview?String(amount):'';
    }
    // Fridge with visible shelf and containers once the learner refrigerates them.
    box(1.05,2.4,1.12,'#9fb4a0',0,1.17,0,groups.chill);var fridgeDoor=new T.Group();fridgeDoor.position.set(-.46,1.18,.59);groups.chill.add(fridgeDoor);box(.91,2.18,.055,'#c6d4bf',.46,0,0,fridgeDoor);box(.055,.6,.06,'#566e57',.15,.27,.06,fridgeDoor);box(.86,.025,.06,'#829a80',0,1.55,.64,groups.chill);
    box(1.26,.1,1.12,'#f2e7d1',-.42,1.3,1.48,groups.chill);box(.08,1.25,.08,'#75906a',-.96,.64,1.95,groups.chill);box(.08,1.25,.08,'#75906a',.1,.64,1.95,groups.chill);
    var shallowTray=box(.5,.045,.43,'#79a4a2',-.87,1.39,1.68,groups.chill);box(.44,.025,.37,'#fff9e9',-.87,1.42,1.68,groups.chill);var trayBadge=badge(.49,.22,0,.24,.02,shallowTray);trayBadge.write('SHALLOW','DIVIDE HERE');
    var wasteBin=cyl(.27,.23,1.25,'#6a7a70',.49,.66,1.85,groups.chill);cyl(.29,.29,.06,'#394d43',.49,1.315,1.85,groups.chill);var binBadge=badge(.48,.22,0,.8,.03,wasteBin);binBadge.write('WASTE','DISCARD');
    var labelCard=box(.29,.04,.22,'#f4da9d',-.17,1.41,1.75,groups.chill),labelBadge=badge(.34,.17,0,.12,.02,labelCard);labelBadge.write('FOOD','+ DATE');
    var tub=box(.48,.12,.32,'#f3e9d3',-.3,1.46,1.03,groups.chill),lid=box(.51,.025,.35,'#79a4a2',-.3,1.535,1.03,groups.chill),labelMesh=box(.2,.055,.01,'#fff8de',-.3,1.46,1.198,groups.chill);labelMesh.visible=false;
    var dividedTub=box(.28,.085,.28,'#f3e9d3',-.75,1.43,1.04,groups.chill),dividedLid=box(.3,.02,.3,'#79a4a2',-.75,1.482,1.04,groups.chill);dividedTub.visible=dividedLid.visible=false;
    var selection=new T.Mesh(new T.TorusGeometry(.62,.027,10,60),new T.MeshBasicMaterial({color:'#c08a28'}));selection.rotation.x=Math.PI/2;scene.add(selection);meshes.push(selection);
    label('01  CLEAN',-3,2.07,-.3);label('02  PREP',-1.5,2.05,-.3);label('03  HEAT',.1,2.05,-.3);label('04  CHECK',1.65,2.22,-.3);label('05  MEASURE',2.4,2.32,1.05);label('06  STORE',3.65,2.68,-1.2);
    Object.keys(groups).forEach(function(id){groups[id].traverse(function(obj){if(obj.isMesh||obj.isSprite){obj.userData.mission=id;pickable.push(obj);}});});
    function tool(id,station,kind,objects,hint,action,anchor){
      var info={id:id,station:station,kind:kind,objects:objects,hint:hint,action:action,anchor:anchor||objects[0]};touchTargets[id]=info;
      objects.forEach(function(o){o.traverse(function(child){child.userData.touch=info;});});return info;
    }
    tool('soap','prep','tap',[soap],'Tap the soap to model washing hands.','wash');
    var faucetTool=tool('faucet','prep','tap',[tapStem,tapSpout,tapLever],'Tap the faucet for a water-only hand rinse.','rinse',tapLever);faucetTool.moving=faucetTool.objects.concat(waterStream);
    tool('sanitizer','prep','tap',[sanitizer,sanitizerPump],'Tap to model following the food-contact sanitizer instructions for this equipment.','sanitize',sanitizer);
    tool('prepBoard','prep','tap',[cleanBoard],'Tap the clean board to prepare equipment.','board');
    tool('vegetableBasket','prep','prepare',[vegetableBasket,basketHandle].concat(prepVegetables),'Carry the vegetable basket onto the preparation board, then release.',null,vegetableBasket);
    tool('board','knife','tap',[matBoard,cutBoard],'Tap the board to secure its nonslip mat.','secure',cutBoard);
    var matTool=tool('nonslipMat','knife','mat',matParts,'Slide the folded mat under the cutting board, then release.',null,matParts[0]);matTool.moving=[foldedMat,matBoard,cutBoard,whole,knife,knifeHandle,hand].concat(dice);
    var knifeTool=tool('knife','knife','cut',[knife,knifeHandle],'Pull the knife down, then lift it back before releasing.',null,knifeHandle);knifeTool.moving=[knife,knifeHandle,whole].concat(dice);
    var handParts=[];hand.traverse(function(o){if(o.isMesh)handParts.push(o);});var gripTool=tool('grip','knife','grip',handParts,'Drag up to curl the fingertips into a claw grip, or down to extend them.',null,handPalm);gripTool.moving=[hand,thumb].concat(fingerJoints);
    tool('dial','heat','dial',[dial,dialMark],'Drag up for more heat, down for less. Release to set the burner.');
    tool('mushroom','heat','spread',mushrooms.concat(stems,droplets),'Carry a mushroom outward to make space in the pan.',null,mushrooms[0]);
    var spatulaTool=tool('spatula','heat','spatula',spatulaParts,'Carry the spatula to the outer pan ring to spread mushrooms, or to the centre to gather them.',null,spatulaBlade);spatulaTool.moving=[spatula].concat(mushrooms,stems,droplets);
    tool('towel','heat','dry',[towel,towelFold],'Rub the towel left and right through three passes, then release to dry the mushrooms.');
    tool('cookTimer','heat','tap',[cookTimer],'Tap once to advance the cook by 30 simulated seconds.','advance');
    var panTool=tool('pan','heat','plate',[panBowl,panHandle],'Carry the pan to the serving plate, then release to plate and switch off the burner.',null,panHandle);panTool.moving=[panBowl,panHandle].concat(mushrooms,stems,droplets);
    var probeTool=tool('probe','probe','probe',[probe,display],'Drag to place the thermometer; tap the display to take a fresh reading.',null,display);probeTool.tapAction='read';
    var chickenTool=tool('chickenPlate','probe','chicken',[chickenPlate,chicken],'Carry the plate to the oven for a simulated cooking step, or to the serving board.',null,chickenPlate);chickenTool.moving=[chickenPlate,chicken,probe,display];
    tool('jug','measure','pour',jugParts,'Drag up to add 50 mL, or down to remove 50 mL. Release to pour.',null,jugHandle);
    var stockTool=tool('stockCarton','measure','stock',[stockCarton],'Carry the stock carton over the jug, then release to pour one 150 mL measure.',null,stockCarton);stockTool.moving=[stockCarton,fill,liquidSurface];
    tool('measureCheck','measure','tap',[measureCheck],'Tap to check the measured quantity against the recipe.','check');
    tool('tub','chill','store',[tub,lid,labelMesh,dividedTub,dividedLid],'Carry leftovers to the shallow tray, fridge, or waste bin; release to choose.',null,lid);
    tool('labelCard','chill','label',[labelCard],'Carry the food-and-date label onto the container, then release.');
    var toolNames={soap:'soap',faucet:'faucet',sanitizer:'sanitizer',prepBoard:'clean board',vegetableBasket:'vegetables',board:'cutting board',nonslipMat:'nonslip mat',knife:'knife',grip:'guide hand',dial:'heat dial',mushroom:'mushrooms',spatula:'spatula',towel:'towel',pan:'pan handle',cookTimer:'cook timer',probe:'thermometer',chickenPlate:'chicken plate',jug:'jug',stockCarton:'stock carton',measureCheck:'check card',tub:'leftovers',labelCard:'label'};Object.keys(touchTargets).forEach(function(id){touchTargets[id].name=toolNames[id];});
    var destinations={probeCenter:new T.Vector3(1.65,1.65,-.85),probeSurface:new T.Vector3(1.94,1.65,-.85),fridge:new T.Vector3(3.65,1.65,-.98),servingPlate:new T.Vector3(.1,1.65,-.02),shallowTray:new T.Vector3(2.78,1.65,.28),wasteBin:new T.Vector3(4.14,1.65,.45),containerTarget:new T.Vector3(3.35,1.65,-.37),prepBoardTarget:new T.Vector3(-3.58,1.65,-.57),ovenDrop:new T.Vector3(1.65,.82,-.03),serveDrop:new T.Vector3(1.99,1.45,.17),jugFill:new T.Vector3(2.4,2.04,1.05),boardMat:new T.Vector3(-1.5,1.65,-.85),panCenter:new T.Vector3(.1,1.65,-.85),panEdge:new T.Vector3(.4,1.65,-.85)};
    var targetRing=new T.Mesh(new T.TorusGeometry(.33,.022,8,48),new T.MeshBasicMaterial({color:'#246b57',depthTest:false,transparent:true,opacity:.95}));targetRing.rotation.x=Math.PI/2;targetRing.visible=false;targetRing.renderOrder=4;scene.add(targetRing);meshes.push(targetRing);materials.push(targetRing.material);
    var ovenOutline=new T.Mesh(new T.BoxGeometry(.88,.53,.015),new T.MeshBasicMaterial({color:'#956017',wireframe:true,depthTest:false}));ovenOutline.position.copy(destinations.ovenDrop);ovenOutline.visible=false;ovenOutline.renderOrder=4;scene.add(ovenOutline);meshes.push(ovenOutline);materials.push(ovenOutline.material);
    var matOutline=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-.56,0,-.42),new T.Vector3(.56,0,-.42),new T.Vector3(.56,0,.42),new T.Vector3(-.56,0,.42)]),new T.LineBasicMaterial({color:'#956017',depthTest:false}));matOutline.position.set(-1.5,1.4,-.85);matOutline.visible=false;matOutline.renderOrder=4;scene.add(matOutline);meshes.push(matOutline);materials.push(matOutline.material);
    var spacingRings=[.15,.33].map(function(radius){var ring=new T.Mesh(new T.TorusGeometry(radius,.013,8,48),new T.MeshBasicMaterial({color:'#956017',depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.set(.1,1.7,-.85);ring.visible=false;ring.renderOrder=4;scene.add(ring);meshes.push(ring);materials.push(ring.material);return ring;});
    var storageRings={};['fridge','shallowTray','wasteBin'].forEach(function(id){var ring=new T.Mesh(new T.TorusGeometry(.29,.02,8,48),new T.MeshBasicMaterial({color:'#956017',depthTest:false,transparent:true,opacity:.85}));ring.rotation.x=Math.PI/2;ring.position.copy(destinations[id]);ring.visible=false;ring.renderOrder=4;scene.add(ring);meshes.push(ring);materials.push(ring.material);storageRings[id]=ring;});
    var hoverRing=new T.Mesh(new T.TorusGeometry(.19,.018,8,40),new T.MeshBasicMaterial({color:'#956017',depthTest:false}));hoverRing.rotation.x=Math.PI/2;hoverRing.visible=false;hoverRing.renderOrder=4;scene.add(hoverRing);meshes.push(hoverRing);materials.push(hoverRing.material);
    var contactRing=new T.Mesh(new T.TorusGeometry(.2,.025,8,40),new T.MeshBasicMaterial({color:'#246b57',depthTest:false,transparent:true,opacity:0}));contactRing.rotation.x=Math.PI/2;contactRing.visible=false;contactRing.renderOrder=5;scene.add(contactRing);meshes.push(contactRing);materials.push(contactRing.material);
    var motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
    function stopFeedback(){if(feedbackFrame!==null)cancelAnimationFrame(feedbackFrame);feedbackFrame=null;contactRing.visible=false;renderer.domElement.dataset.feedback='idle';}
    function pulse(id,accepted){stopFeedback();var info=touchTargets[id],drop=destinations[id];if((!info&&!drop)||textView||replayState||motionPreference.matches||document.hidden)return;if(drop)contactRing.position.copy(drop);else info.anchor.getWorldPosition(contactRing.position);contactRing.position.y+=.04;contactRing.material.color.set(accepted?'#246b57':'#956017');contactRing.material.opacity=.8;contactRing.scale.setScalar(1);contactRing.visible=true;renderer.domElement.dataset.feedback=accepted?'accepted':'retry';feedbackStart=performance.now();function frame(now){if(document.hidden||textView||replayState){stopFeedback();draw();return;}var t=Math.min(1,(now-feedbackStart)/420);contactRing.scale.setScalar(1+t*1.8);contactRing.material.opacity=.8*(1-t);if(t>=1)stopFeedback();else feedbackFrame=requestAnimationFrame(frame);draw();}feedbackFrame=requestAnimationFrame(frame);draw();}
    function respond(action,s){var map={wash:'soap',rinse:'faucet',sanitize:'sanitizer',board:'prepBoard',prepare:'prepBoardTarget',secure:'board',claw:'grip',flat:'grip',dice:'knife',largeDice:'knife',dry:'towel',spread:'mushroom',crowd:'spatula',low:'dial',medium:'dial',high:'dial',advance:'cookTimer',plate:'servingPlate',thick:'probe',surface:'probe',read:'probe',cook:'ovenDrop',serve:'serveDrop',add50:'jug',add150:'jug',remove50:'jug',empty:'jug',check:'measureCheck',chill:'fridge',shallow:'shallowTray',label:'containerTarget',discard:'wasteBin'},entry=s.log[s.log.length-1];if(entry)pulse(map[action],entry.accepted);}
    function projectTargets(){
      var rect=renderer.domElement.getBoundingClientRect(),points={};
      Object.keys(touchTargets).forEach(function(id){var o=touchTargets[id].anchor,p=new T.Vector3();o.getWorldPosition(p);if(id==='board')p.set(-1.1,1.445,-.62);if(id==='chickenPlate'){p.x+=.3;p.z+=.22;p.y+=.03;}p.project(camera);points[id]={x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2};});
      Object.keys(destinations).forEach(function(id){var p=destinations[id].clone().project(camera);points[id]={x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2};});
      renderer.domElement.dataset.targets=JSON.stringify(points);
    }
    function draw(){renderer.render(scene,camera);projectTargets();}
    function resize(){if(host.hidden)return;var w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;if(touch&&lastSize&&(lastSize.w!==w||lastSize.h!==h))touch.cancel('View resized. No action recorded.');lastSize={w:w,h:h};renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
    function reset(){if(touch)touch.cancel('View reset. No action recorded.');focused=false;focusedStation=null;stationLabels.concat(stationBadges).forEach(function(s){s.visible=true;});$('focusView').setAttribute('aria-pressed','false');camera.position.set(7.4,6.6,9.7);controls.target.set(0,1,0);controls.update();resize();}
    controls.addEventListener('change',draw);
    var ray=new T.Raycaster(),pointer=new T.Vector2(),workPlane=new T.Plane(new T.Vector3(0,1,0),-1.65);
    function cast(e){var rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);}
    function pick(e){cast(e);var hits=ray.intersectObjects(pickable).filter(function(h){var o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});var hit=hits.find(function(h){return h.object.isSprite&&h.object.userData.touch&&h.object.userData.mission===current;})||hits[0];return hit?(hit.object.userData.touch||{station:hit.object.userData.mission,objects:[]}):null;}
    function point(e){cast(e);return ray.ray.intersectPlane(workPlane,new T.Vector3());}
    function platterTarget(at){
      cast({clientX:at.x,clientY:at.y});
      var oven=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),.03),new T.Vector3()),serve=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-1.45),new T.Vector3());
      var inOven=oven&&Math.abs(oven.x-1.65)<=.44&&Math.abs(oven.y-.82)<=.265,inServe=serve&&Math.abs(serve.x-1.99)<=.38&&Math.abs(serve.z-.17)<=.29;
      if(inOven&&inServe)return ray.ray.origin.distanceTo(oven)<ray.ray.origin.distanceTo(serve)?'oven':'serve';
      return inOven?'oven':inServe?'serve':null;
    }
    function highlight(info){
      highlighted.forEach(function(entry){entry.material.emissive.copy(entry.color);entry.material.emissiveIntensity=entry.intensity;});highlighted=[];hoverRing.visible=!!info;
      if(info){info.objects.forEach(function(o){var m=o.material;if(!m.emissive)return;highlighted.push({material:m,color:m.emissive.clone(),intensity:m.emissiveIntensity});m.emissive.set('#8c632c');m.emissiveIntensity=.3;});info.anchor.getWorldPosition(hoverRing.position);hoverRing.position.y=1.36;}
    }
    function restorePose(g){if(!g)return;g.original.forEach(function(o){o.object.position.copy(o.position);o.object.rotation.copy(o.rotation);o.object.scale.copy(o.scale);o.object.visible=o.visible;});if(g.hit.kind==='grip')renderer.domElement.dataset.gripCurl=String(Math.round(Math.max(0,Math.min(1,-fingerJoints[0].rotation.x/1.35))*100));if(g.hit.kind==='stock'||g.hit.kind==='pour')showMeasureAmount(measureShownMl,false);renderer.domElement.dataset.cutPreview='0';renderer.domElement.dataset.matPreview='false';renderer.domElement.dataset.spatulaPreview='';fridgeDoor.rotation.y=fridgeDoor.userData.restAngle||0;ovenDoor.rotation.x=0;renderer.domElement.dataset.ovenOpen='false';renderer.domElement.dataset.platterTarget='';}
    function destination(g){
      if(g.hit.kind==='mat'||g.hit.kind==='spatula')return window.KitchenStudioPlacement.destination(g.hit.kind,g.current,g.point);
      if(g.hit.kind==='chicken')return window.KitchenStudioPlatter.destination(g.last,g.start,platterTarget(g.last));
      if(g.hit.kind==='stock'){
        cast({clientX:g.last.x,clientY:g.last.y});var mouth=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-2.04),new T.Vector3()),over=mouth&&Math.hypot(mouth.x-2.4,mouth.z-1.05)<=.28,ready=over&&Math.hypot(g.last.x-g.start.x,g.last.y-g.start.y)>=10;
        var space=Math.min(150,1000-(g.source.values.ml||0));return {action:ready?'add150':null,message:ready?(space===0?'Jug is full at 1,000 mL. No more stock will fit.':space<150?'Release to fill the remaining '+space+' mL.':'Release to pour 150 mL of stock.'):'Carry the carton spout over the measuring jug.'};
      }
      var p=g.current;if(!p||!g.point)return {action:null,message:'Carry the object back onto the workspace.'};
      var dist=p.distanceTo(g.point),kind=g.hit.kind;
      if(kind==='probe'){var radius=Math.hypot(p.x-1.65,p.z+.85),action=dist>.1&&radius<=.44?(radius<=.17?'thick':'surface'):null;return {action:action,message:action?'Release to place the probe '+(action==='thick'?'in the thickest part.':'against the surface.'):'Carry the probe over the chicken.'};}
      if(kind==='store'||kind==='label')return window.KitchenStudioStorage.destination(kind,p,g.point);
      if(kind==='prepare'){var onBoard=Math.hypot(p.x+3.58,p.z+.57)<.3;return {action:dist>.12&&onBoard?'prepare':null,message:onBoard?'Release to prepare the vegetables on this board.':'Carry the vegetable basket onto the preparation board.'};}
      if(kind==='plate'){var over=Math.hypot(p.x-.1,p.z+.02)<.38;return {action:dist>.15&&over?'plate':null,message:over?'Release to plate and switch off the burner.':'Carry the pan handle over the serving plate.'};}
      var radius=Math.hypot(p.x-.1,p.z+.85);return {action:dist>.12&&radius>=.22&&radius<=.53?'spread':null,message:radius>=.22&&radius<=.53?'Release to spread the mushrooms.':'Carry outward, keeping the mushroom inside the pan.'};
    }
    function preview(g,old){
      restorePose(g||old);matOutline.visible=false;spacingRings.forEach(function(ring){ring.visible=false;});targetRing.visible=false;ovenOutline.visible=false;stockStream.visible=false;renderer.domElement.dataset.stockStream='false';Object.keys(storageRings).forEach(function(id){storageRings[id].visible=false;});$('stationLens').hidden=textView||!!(g&&g.interactive&&g.hit.kind==='chicken');var placementHint=$('studioPlacementHint');placementHint.hidden=true;if(!g)return;
      var kind=g.hit.kind,trace=g.trace,delta=g.current&&g.point?g.current.clone().sub(g.point):new T.Vector3();
      if((kind==='mat'||kind==='spatula')&&g.interactive){placementHint.hidden=false;var ready=!!(g.destination&&g.destination.action);placementHint.dataset.ready=String(ready);$('studioPlacementTitle').textContent=ready?'Preview · ready to place':'Preview · choose a position';$('studioPlacementDetail').textContent=g.destination?g.destination.message:kind==='mat'?'Move the folded mat under the board.':'Outer ring: spread · centre: gather';}
      if(kind==='mat'){
        var under=!!(g.destination&&g.destination.action==='secure');matOutline.visible=true;matOutline.material.color.set(under?'#246b57':'#956017');
        if(under){foldedMat.visible=false;matBoard.visible=true;[cutBoard,whole,knife,knifeHandle,hand].concat(dice).forEach(function(o){o.position.y+=.13;});}
        else{foldedMat.position.add(delta);foldedMat.position.y+=.1;}
        renderer.domElement.dataset.matPreview=String(under);
      }
      if(kind==='spatula'){
        var placement=g.destination&&g.destination.action;spatula.position.add(delta);spatula.position.y+=.1;
        spacingRings.forEach(function(ring,index){ring.visible=true;ring.material.color.set(placement===(index?'spread':'crowd')?'#246b57':'#956017');});
        if(placement&&g.current){spatula.position.set(g.current.x-groups.heat.position.x,1.7,g.current.z-groups.heat.position.z);spatula.rotation.x=-.12;var radius=placement==='spread'?.29:.14;mushrooms.forEach(function(m,i){m.position.x=Math.cos(mushroomAngle(i))*radius;m.position.z=Math.sin(mushroomAngle(i))*radius;stems[i].position.x=droplets[i].position.x=m.position.x;stems[i].position.z=droplets[i].position.z=m.position.z;});}
        renderer.domElement.dataset.spatulaPreview=placement||'';
      }
      if(kind==='cut'){var depth=trace?trace.depth:0;g.hit.objects.forEach(function(o){o.position.y+=.13-depth*.19;o.position.z+=Math.min(1,depth*1.8)*.24;});if(g.source.values.secure&&g.source.values.claw&&trace){var count=trace.cutReached?12:Math.max(0,Math.floor((depth-.45)/.55*12));renderer.domElement.dataset.cutPreview=String(count);if(count){whole.visible=count<12;whole.scale.y=Math.max(.05,1-count/12);whole.position.x=-.31*count/12;dice.forEach(function(d,i){d.visible=i<count;d.scale.setScalar(trace.action==='largeDice'?1.65:1);});}}}
      if(kind==='grip'&&trace)poseHand(trace.curl);
      if(kind==='pour'&&trace){var amount=Math.max(0,Math.min(1000,(g.source.values.ml||0)+trace.delta)),lift=.06*Math.min(1,trace.travel/30);showMeasureAmount(amount,true);g.hit.objects.forEach(function(o){o.position.y+=lift;});}
      if(kind==='stock'){
        var pouring=!!(g.destination&&g.destination.action),amount=Math.min(1000,(g.source.values.ml||0)+(pouring?150:0));
        if(pouring){stockCarton.position.set(-.38,2.24,0);stockCarton.rotation.z=-.95;}else{stockCarton.position.add(delta);stockCarton.position.y+=.20;}
        showMeasureAmount(amount,true);targetRing.visible=true;targetRing.position.copy(destinations.jugFill);targetRing.material.color.set(pouring?'#246b57':'#956017');
        if(pouring&&amount>(g.source.values.ml||0)){var streamTop=2.24+Math.cos(.95)*.38,streamBottom=1.35+.6*amount/1000;stockStream.visible=true;stockStream.scale.y=streamTop-streamBottom;stockStream.position.set(-.38+Math.sin(.95)*.38,(streamTop+streamBottom)/2,0);}
        renderer.domElement.dataset.stockStream=String(stockStream.visible);
      }
      if(kind==='dial'&&trace){var angle=(trace.level-2)*.8;dialMark.position.set(-.39+Math.sin(angle)*.05,1.511,.43-Math.cos(angle)*.05);dialMark.rotation.y=-angle;}
      if(kind==='dry'&&trace){var offset=Math.max(-.25,Math.min(.25,(trace.current.x-trace.start.x)/trace.unit/160));[towel,towelFold].forEach(function(o,i){o.position.set(offset,1.74+i*.024,i*.035);o.rotation.y=offset*.4;});droplets.forEach(function(d,i){d.visible=!g.source.values.dry&&i>=Math.floor(trace.passes*8/3);});}
      if(kind==='plate'){g.original.forEach(function(o){o.object.position.add(delta);o.object.position.y+=.16;});targetRing.visible=true;targetRing.position.copy(destinations.servingPlate);targetRing.material.color.set(g.destination&&g.destination.action?'#246b57':'#956017');}
      if(kind==='chicken'){
        var target=g.destination&&g.destination.target;
        if(target==='oven')delta.set(0,-.57,.82);else if(target==='serve')delta.set(.34,.005,1.02);else delta.y+=.12;
        [chickenPlate,chicken].forEach(function(o){o.position.add(delta);});probe.position.set(.46,1.76,.24);display.position.set(.46,1.99,.24);probe.rotation.z=0;
        ovenDoor.rotation.x=target==='oven'?1.1:0;renderer.domElement.dataset.ovenOpen=String(target==='oven');renderer.domElement.dataset.platterTarget=target||'';
        ovenOutline.visible=true;ovenOutline.material.color.set(target==='oven'?'#246b57':'#956017');targetRing.visible=true;targetRing.position.copy(destinations.serveDrop);targetRing.material.color.set(target==='serve'?'#246b57':'#956017');
      }
      if(kind==='probe'||kind==='label'){g.hit.objects.forEach(function(o){o.position.add(delta);o.position.y+=.08;});targetRing.visible=true;targetRing.position.copy(destinations[kind==='probe'?'probeCenter':'containerTarget']);targetRing.material.color.set(g.destination&&g.destination.action?'#246b57':'#956017');}
      if(kind==='prepare'){g.hit.objects.forEach(function(o){o.position.add(delta);o.position.y+=.08;});targetRing.visible=true;targetRing.position.copy(destinations.prepBoardTarget);targetRing.material.color.set(g.destination&&g.destination.action?'#246b57':'#956017');}
      if(kind==='store'){g.hit.objects.forEach(function(o){o.position.add(delta);o.position.y+=.08;});Object.keys(storageRings).forEach(function(id){var ring=storageRings[id];ring.visible=true;ring.material.color.set(g.destination&&g.destination.target===id?'#246b57':'#956017');});fridgeDoor.rotation.y=g.destination&&g.destination.target==='fridge'?-.85:fridgeDoor.userData.restAngle||0;}
      if(kind==='spread'){mushrooms.forEach(function(o,i){var radius=Math.min(.3,.14+delta.length()*.45);o.position.x=Math.cos(mushroomAngle(i))*radius;o.position.z=Math.sin(mushroomAngle(i))*radius;stems[i].position.x=droplets[i].position.x=o.position.x;stems[i].position.z=droplets[i].position.z=o.position.z;});}
      if(kind==='tap'){g.hit.objects.forEach(function(o){o.scale.y*=.92;});if(g.hit.id==='faucet')waterStream.visible=true;}
    }
    touch=window.KitchenStudioTouch.mount({canvas:renderer.domElement,orbit:controls,getState:state,hidden:function(){return textView;},locked:function(){var s=state();return textView||!!replayState||s.done||s.submitted||s.log.length>=500;},pick:pick,point:point,draw:draw,highlight:highlight,preview:preview,destination:destination,
      capture:function(hit){stopFeedback();var moving=hit.moving||hit.objects||[];if(hit.kind==='dry')moving=moving.concat(droplets);return moving.map(function(o){return {object:o,position:o.position.clone(),rotation:o.rotation.clone(),scale:o.scale.clone(),visible:o.visible};});},
      tools:function(id){return Object.keys(touchTargets).map(function(key){return touchTargets[key];}).filter(function(info){return info.station===id;});},
      available:function(id){return !!touchTargets[id]&&touchTargets[id].objects.some(function(o){return o.visible;});},
      reveal:function(id){var info=touchTargets[id];if(!info||!info.objects.some(function(o){return o.visible;}))return false;focus();highlight(info);pulse(id,true);draw();return true;},
      select:function(id){if(serviceActive){$('studioTouchStatus').textContent='Pause the meal rehearsal before exploring another station.';return;}select(id,false);},act:function(action){act(action,true);}
    });
    renderer.domElement.addEventListener('webglcontextlost',function(e){e.preventDefault();touch.cancel();textView=true;$('sceneStatus').textContent='3D interrupted. Continue using the text controls.';applyView();});
    function update(s){stopFeedback();if(touch)touch.update();var picture=Object.assign({},sceneStates());picture[s.id]=s;if(focused&&focusedStation!==s.id)focus();var v=s.values,g=groups[s.id];selection.position.set(g.position.x,1.355,g.position.z);var prep=picture.prep?picture.prep.values:{},kv=picture.knife?picture.knife.values:{};bubbles.forEach(function(b){b.visible=!!prep.washed;});water.material.color.set(prep.washed?'#9fdbc8':'#83b8c2');cleanBoard.material.color.set(prep.clean?'#79a47f':'#b77e58');matBoard.material.color.set('#436e58');matBoard.visible=!!kv.secure;foldedMat.visible=!kv.secure;matParts.forEach(function(part){part.visible=!kv.secure;});renderer.domElement.dataset.matSecured=String(!!kv.secure);renderer.domElement.dataset.matPreview='false';renderer.domElement.dataset.spatulaPreview='';whole.visible=!kv.cut;whole.scale.set(1,1,1);whole.position.x=0;dice.forEach(function(d,i){d.visible=!!kv.cut;d.scale.setScalar(kv.cut==='large'?1.65:kv.cut==='uneven'?(i%3+1)*.65:1);});knife.rotation.y=kv.claw?.18:0;poseHand(kv.claw?1:0);renderer.domElement.dataset.cutPreview='0';
      sanitizer.visible=sanitizerPump.visible=!!(picture.prep&&picture.prep.scenario==='shared-board');waterStream.visible=false;var prepared=!!(picture.prep&&picture.prep.done);prepVegetables.forEach(function(v,i){v.position.set(prepared?-.65+(i%2)*.14:.23+(i%2)*.14,1.53,prepared?.18+Math.floor(i/2)*.12:.57+Math.floor(i/2)*.12);});touchTargets.vegetableBasket.anchor=prepared?prepVegetables[0]:vegetableBasket;
      var heat=picture.heat?picture.heat.values:{},plated=!!(picture.heat&&picture.heat.done);burner.material.color.set(heat.heat==='high'?'#e67c33':heat.heat==='medium'?'#b8864b':'#5c665b');mushrooms.forEach(function(m,i){m.material.color.set(heat.brown>4?'#4a3429':heat.brown>=3?'#a66a2c':heat.brown>0?'#c79854':'#e6cfa7');m.position.x=Math.cos(mushroomAngle(i))*(heat.spread?.29:.14);m.position.z=Math.sin(mushroomAngle(i))*(heat.spread?.29:.14)+(plated?.83:0);m.position.y=plated?1.49:1.645;stems[i].position.y=plated?1.435:1.59;stems[i].position.x=droplets[i].position.x=m.position.x;stems[i].position.z=droplets[i].position.z=m.position.z;droplets[i].visible=!heat.dry&&!plated;});
      timerBadge.write('+30 s','SIM · '+(heat.seconds||0)+'s');
      var dialAngle=(['low','medium','high'].indexOf(heat.heat)-1)*.8;dialMark.position.set(-.39+Math.sin(dialAngle)*.05,1.511,.43-Math.cos(dialAngle)*.05);dialMark.rotation.y=-dialAngle;
      var pv=picture.probe?picture.probe.values:{},served=!!(picture.probe&&picture.probe.done),placed=!!pv.probe&&!served;
      chickenPlate.position.set(served?.34:0,served?1.395:1.39,served?1.02:0);chicken.position.set(served?.34:0,served?1.565:1.56,served?1.02:0);
      probe.visible=display.visible=true;probe.position.set(placed?(pv.probe==='surface'?.25:0):.46,placed?1.85:1.76,placed?0:.24);display.position.set(probe.position.x,placed?2.08:1.99,probe.position.z);probe.rotation.z=placed&&pv.probe==='surface'?-.6:0;
      ovenDoor.rotation.x=0;renderer.domElement.dataset.ovenOpen='false';renderer.domElement.dataset.platterTarget='';ovenOutline.visible=false;
      renderer.domElement.dataset.probeReading=pv.reading==null?'—':String(pv.reading);probeBadge.write(pv.reading==null?'—':pv.reading+'°F',pv.reading==null?'Tap to read':served?'RECORDED':pv.probe==='surface'?'SURFACE':'INTERNAL');
      measureShownMl=picture.measure?(picture.measure.values.ml||0):0;showMeasureAmount(measureShownMl,false);renderer.domElement.dataset.measureMl=String(measureShownMl);stockStream.visible=false;renderer.domElement.dataset.stockStream='false';
      var cv=picture.chill?picture.chill.values:{};fridgeDoor.userData.restAngle=fridgeDoor.rotation.y=cv.chilled?-.35:0;tub.visible=lid.visible=!cv.discarded;labelMesh.visible=!!cv.label&&!cv.discarded;labelCard.visible=!cv.label&&!cv.discarded;dividedTub.visible=dividedLid.visible=!!cv.shallow&&!cv.discarded;[tub,lid,labelMesh,dividedTub,dividedLid].forEach(function(o){o.position.z=(o===labelMesh?1.198:o===dividedTub||o===dividedLid?1.04:1.03)-(cv.chilled?.36:0);});tub.scale.y=cv.shallow?1:2;lid.position.y=cv.shallow?1.535:1.595;labelMesh.position.y=cv.shallow?1.46:1.5;[water,cleanBoard,matBoard,burner].concat(mushrooms).forEach(function(o){o.material.color.convertSRGBToLinear();});
      if(touch)touch.update();draw();}
    var observer=new ResizeObserver(resize);observer.observe(host);reset();focus();
    function quietFeedback(){stopFeedback();draw();}
    function visibilityFeedback(){if(document.hidden)quietFeedback();}
    window.addEventListener('blur',quietFeedback);document.addEventListener('visibilitychange',visibilityFeedback);if(motionPreference.addEventListener)motionPreference.addEventListener('change',quietFeedback);
    window.addEventListener('pagehide',function(e){stopFeedback();if(e.persisted)return;touch.dispose();window.removeEventListener('blur',quietFeedback);document.removeEventListener('visibilitychange',visibilityFeedback);if(motionPreference.removeEventListener)motionPreference.removeEventListener('change',quietFeedback);observer.disconnect();controls.dispose();meshes.forEach(function(m){m.geometry.dispose();});materials.forEach(function(m){if(m.map)m.map.dispose();m.dispose();});selection.material.dispose();renderer.dispose();});
    function focus(){if(touch)touch.cancel('View changed. No action recorded.');focused=true;focusedStation=current;stationLabels.forEach(function(s){s.visible=false;});stationBadges.forEach(function(s){s.visible=s.userData.mission===current;});$('focusView').setAttribute('aria-pressed','true');var g=groups[current],isProbe=current==='probe',z=g.position.z+(current==='chill'?.9:isProbe?.35:0);controls.target.set(g.position.x,isProbe?1.25:1.45,z);camera.position.set(g.position.x+(isProbe?-.7:1.7),isProbe?3.4:3.65,z+(isProbe?3.8:3.1));controls.update();draw();}
    function rotate(angle){if(touch)touch.cancel('View changed. No action recorded.');var offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new T.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();draw();}
    return {update:update,resize:resize,reset:reset,focus:focus,rotate:rotate,respond:respond,interactionView:function(){if(textView)stopFeedback();touch.update();}};
  }
  try { sceneAPI=initScene(); } catch(e) { console.warn('Kitchen Studio 3D unavailable:',e);$('sceneStatus').textContent='3D is unavailable on this device. All practice actions work in text view.'; $('viewToggle').disabled=true; }
  if(serviceActive)$('serviceCard').open=true;
  render(true); save();
})();
