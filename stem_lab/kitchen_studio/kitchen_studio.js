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
    var meshes = [], pickable = [], groups = {}, materials = [],stationLabels=[],stationBadges=[]; var focused=false, focusedStation=null,touch=null,keyboardView=null,feedbackView=null,rubGuide=null,discoveryView=null,discovered=null,dropView=null,dropGesture=null,stopDropUpdates=null,ovenView=null,ovenInspection=false,ovenDecorations=[],ovenPreference=false,ovenRevision=null,probeView=null,probeDepthInspection=false,probeDepthDecorations=[],measureView=null,panView=null,panInspection=false,panDecorations=[],boardView=null,boardInspection=false,boardDecorations=[],containerView=null,containerInspection=false,containerDecorations=[],containerDoorPreference=null,containerRevision=null,shownContainerRevision=null,lidPreference=false,measureInspection=false,inspectionDecorations=[],touchTargets={},probeCutaway=false,probeShownValues={},probeServed=false,probeHistorical=false,highlighted=[],feedbackFrame=null,feedbackStart=0,lastSize=null;
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
    Object.keys(loc).forEach(function(id){var g=new T.Group();g.position.set.apply(g.position,loc[id]);scene.add(g);groups[id]=g;var p=box(1.25,.07,1.23,'#d5ba73',0,1.31,0,g);p.visible=id!=='chill';p.userData.mission=id;pickable.push(p);});
    // Sink, tap, soap, and a water surface that changes after washing.
    var sink=cyl(.44,.35,.12,'#a9bab1',0,1.37,0,groups.prep); var water=cyl(.35,.34,.015,'#83b8c2',0,1.44,0,groups.prep);
    var bubbles=[];for(var bi=0;bi<8;bi++){var bubble=sphere(.035+(bi%3)*.012,'#e2f4f0',Math.cos(bi)*.25,1.475,Math.sin(bi)*.24,groups.prep);bubble.visible=false;bubbles.push(bubble);}
    var tapStem=box(.065,.52,.065,'#aab7af',0,1.65,-.48,groups.prep),tapSpout=box(.065,.065,.3,'#aab7af',0,1.9,-.34,groups.prep),tapLever=box(.23,.05,.07,'#537d85',-.12,1.9,-.48,groups.prep);
    var waterStream=cyl(.018,.03,.4,'#8ed1df',0,1.68,-.19,groups.prep,{transparent:true,opacity:.65});waterStream.visible=false;
    var soap=box(.18,.29,.16,'#d5ae68',.48,1.53,-.3,groups.prep),soapPump=box(.12,.035,.06,'#455f49',.48,1.69,-.3,groups.prep);
    var washingHands=new T.Group();washingHands.position.set(0,1.67,.25);washingHands.scale.setScalar(1.35);groups.prep.add(washingHands);
    var washPalms=[],washParts=[],washLather=[];
    [-1,1].forEach(function(side){
      var palm=new T.Group();palm.position.set(side*.085,side===1?.025:0,side===1?-.025:.035);washingHands.add(palm);washPalms.push(palm);
      var body=sphere(.1,'#c99b78',0,0,0,palm);body.scale.set(.7,.27,.9);washParts.push(body);
      var cuff=box(.13,.045,.075,'#577f72',0,0,.11,palm);washParts.push(cuff);
      for(var finger=0;finger<4;finger++){var digit=sphere(.025,'#d3a583',(finger-1.5)*.035,0,-.12,palm);digit.scale.set(.63,.8,2.7-(finger===0||finger===3?.5:0));washParts.push(digit);}
      var thumb=sphere(.034,'#c99b78',side*.072,0,-.025,palm);thumb.scale.set(.7,.8,1.7);thumb.rotation.y=side*.45;washParts.push(thumb);
    });
    for(var foamIndex=0;foamIndex<12;foamIndex++){var foam=sphere(.019+(foamIndex%3)*.004,'#f5faf3',(foamIndex%4-1.5)*.045,.05+Math.floor(foamIndex/4)*.011,(Math.floor(foamIndex/4)-1)*.062,washingHands);foam.visible=false;washLather.push(foam);washParts.push(foam);}
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
    var hobSurface=box(1.24,.06,1.1,'#343e36',0,1.39,0,groups.heat);var burner=cyl(.43,.43,.04,'#5c665b',0,1.45,0,groups.heat);
    var panBowl=cyl(.43,.37,.09,'#303c33',0,1.53,0,groups.heat),panHandle=box(.57,.075,.13,'#3b453d',.58,1.54,0,groups.heat);
    var dials=window.KitchenBurnerDials, dialRadius=.17, dialGrip=new T.Group(),dialScaleParts=[];
    dialGrip.position.set(-.39,1.49,.43);groups.heat.add(dialGrip);
    var dial=cyl(dialRadius,dialRadius,.1,'#395749',0,0,0,dialGrip);
    var dialMark=box(.028,.012,.13,'#fff0c8',0,.056,-.082,dialGrip);
    var dialParts=[dial,dialMark], dialCap=new T.Vector3();
    dialGrip.getWorldPosition(dialCap);dialCap.y+=.05;
    for(var tooth=0;tooth<16;tooth++){
      var toothAngle=tooth*Math.PI/8;
      var rib=box(.016,.068,.012,'#6a8571',Math.sin(toothAngle)*dialRadius,0,Math.cos(toothAngle)*dialRadius,dialGrip);
      rib.rotation.y=toothAngle;dialParts.push(rib);
    }
    function addDialScale(){
      var surface=document.createElement('canvas');surface.width=surface.height=256;
      var ctx=surface.getContext('2d');ctx.fillStyle='#f6eed6';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 19px system-ui';
      dials.levels.forEach(function(name,index){
        var angle=dials.angle(index),x=Math.sin(angle),z=-Math.cos(angle);
        ctx.fillText(name==='Medium'?'MED':name.toUpperCase(),128+105*x,128+105*z);
        ctx.beginPath();ctx.moveTo(128+82*x,128+82*z);ctx.lineTo(128+90*x,128+90*z);ctx.strokeStyle='#f6eed6';ctx.lineWidth=3;ctx.stroke();
      });
      var texture=new T.CanvasTexture(surface);texture.encoding=T.sRGBEncoding;
      dialScaleParts.push(cyl(.274,.27,.024,'#41534a',dialGrip.position.x,1.434,dialGrip.position.z,groups.heat));
      var scale=mesh(new T.PlaneGeometry(.55,.55),'#ffffff',dialGrip.position.x,1.448,dialGrip.position.z,groups.heat,{map:texture,transparent:true,depthWrite:false});
      scale.rotation.x=-Math.PI/2;scale.castShadow=false;dialScaleParts.push(scale);
    }
    addDialScale();
    var towel=box(.27,.04,.22,'#fff6de',.43,1.48,.43,groups.heat),towelFold=box(.25,.016,.11,'#d8d6c1',.43,1.508,.48,groups.heat);
    var cookTimer=box(.32,.22,.17,'#b67b43',-.48,1.54,-.45,groups.heat),timerBadge=badge(.32,.16,0,.025,.10,cookTimer);timerBadge.write('+30 s','SIMULATED');
    box(1.6,.08,.64,'#c39461',.12,1.29,.78,groups.heat);var servingPlate=cyl(.4,.37,.045,'#fff9e9',0,1.37,.83,groups.heat);
    var spatula=new T.Group();spatula.position.set(.69,1.39,.53);spatula.rotation.y=-.18;groups.heat.add(spatula);
    var spatulaBlade=box(.19,.028,.24,'#b58652',0,0,0,spatula),spatulaHandle=box(.055,.035,.36,'#966c43',0,.006,.28,spatula),spatulaParts=[spatulaBlade,spatulaHandle];
    for(var slot=0;slot<3;slot++)spatulaParts.push(box(.012,.004,.15,'#6c5037',-.045+slot*.045,.016,0,spatula));
    function mushroomAngle(index){return index*Math.PI/4;}
    var mushrooms=[],stems=[];for(var j=0;j<8;j++){var stem=cyl(.033,.038,.075,'#c5b58b',Math.cos(mushroomAngle(j))*.2,1.59,Math.sin(mushroomAngle(j))*.2,groups.heat);var mush=sphere(.095,'#e6cfa7',Math.cos(mushroomAngle(j))*.2,1.645,Math.sin(mushroomAngle(j))*.2,groups.heat);mush.scale.y=.5;mushrooms.push(mush);stems.push(stem);}
    var droplets=mushrooms.map(function(m){return sphere(.024,'#8ab9c1',m.position.x,1.69,m.position.z,groups.heat);});
    // The door is a view-only tool; a platter drop records a simulated step.
    var ovenStart=meshes.length;
    box(1.05,.84,.045,'#25352e',0,.75,.44,groups.probe);box(.065,.84,.36,'#40594a',-.5,.75,.62,groups.probe);box(.065,.84,.36,'#40594a',.5,.75,.62,groups.probe);box(1.05,.06,.36,'#40594a',0,1.15,.62,groups.probe);box(.94,.025,.35,'#acb5a5',0,.7,.62,groups.probe);
    for(var rack=0;rack<7;rack++)box(.012,.014,.32,'#d0d6c9',-.36+rack*.12,.721,.62,groups.probe);
    var ovenDoor=new T.Group();ovenDoor.position.set(0,.35,.81);groups.probe.add(ovenDoor);var ovenPanel=box(1.05,.78,.065,'#293d31',0,.39,0,ovenDoor),ovenGlass=box(.83,.47,.025,'#768d79',0,.39,.046,ovenDoor),ovenHandle=box(.65,.045,.075,'#d7bf8c',0,.69,.09,ovenDoor);
    var ovenSign=box(.45,.12,.06,'#456a50',0,1.17,.83,groups.probe),ovenBadge=badge(.45,.19,0,.005,.045,ovenSign);ovenBadge.write('COOK','1 SIM STEP');
    var ovenParts=meshes.slice(ovenStart).concat([ovenDoor]);
    function poseOven(opening,preview){
      var fraction=Math.max(0,Math.min(1,opening));ovenDoor.rotation.x=1.1*fraction;
      renderer.domElement.dataset.ovenOpening=String(fraction);renderer.domElement.dataset.ovenAngle=String(ovenDoor.rotation.x);renderer.domElement.dataset.ovenOpen=String(fraction>=.5);renderer.domElement.dataset.ovenPreview=String(!!preview);
      var toggle=$('studioOvenToggle');toggle.textContent=fraction>=.5?'Close oven':'Open oven';toggle.setAttribute('aria-expanded',String(fraction>=.5));toggle.disabled=textView||probeDepthInspection;
      var description=preview?'Door preview · release to finish, or press Escape to cancel.':'Oven door: '+(fraction>=.5?'open. Explore the shelf.':'closed. Pull the handle or use Open oven.');
      if($('studioOvenReadout').textContent!==description)$('studioOvenReadout').textContent=description;
    }
    function setOvenView(opened){ovenPreference=!!opened;poseOven(ovenPreference?1:0,false);draw();}
    var chickenPlate=cyl(.46,.46,.05,'#fff6e3',0,1.39,0,groups.probe),chicken=sphere(.27,'#bd793b',0,1.56,0,groups.probe);chicken.scale.set(1.15,.65,.8);
    box(1.06,.08,.7,'#c39461',.34,1.3,1.02,groups.probe);var serveMat=box(.76,.025,.58,'#85a69d',.34,1.357,1.02,groups.probe),serveBadge=badge(.42,.19,0,.17,.25,serveMat);serveBadge.write('SERVE','CHICKEN');
    box(.035,.016,.34,'#aab7af',.79,1.37,1.02,groups.probe);box(.2,.012,.36,'#fff9e9',-.15,1.37,1.02,groups.probe);
    var probe=box(.025,.44,.025,'#9badad',.46,1.76,.24,groups.probe);var display=box(.32,.22,.09,'#3a5643',.46,1.99,.24,groups.probe),probeBadge=badge(.3,.15,0,.005,.055,display);probeBadge.write('—','Tap to read');
    // Measuring jug is on a small island, with graduated fill and tick marks.
    groups.measure.position.set(2.4,0,1.05);box(1.4,1.18,1,'#75906a',0,.55,0,groups.measure);box(1.5,.1,1.1,'#f2e7d1',0,1.26,0,groups.measure);
    var jugStart=meshes.length,jug=cyl(.27,.23,.68,'#c9e1d9',0,1.68,0,groups.measure,{transparent:true,opacity:.28,depthWrite:false});var fill=cyl(.24,.21,.6,'#dba94f',0,1.65,0,groups.measure),liquidSurface=cyl(.24,.24,.008,'#f1ce79',0,1.35,0,groups.measure);fill.visible=liquidSurface.visible=false;
    var scaleCanvas=document.createElement('canvas');scaleCanvas.width=300;scaleCanvas.height=660;var scaleContext=scaleCanvas.getContext('2d');scaleContext.fillStyle='rgba(237,243,232,.9)';scaleContext.fillRect(0,0,300,660);scaleContext.strokeStyle=scaleContext.fillStyle='#233e2e';scaleContext.lineWidth=5;scaleContext.font='bold 42px Arial';scaleContext.textBaseline='middle';
    for(var mark=0;mark<=1000;mark+=50){var markY=630-mark*.6;scaleContext.beginPath();scaleContext.moveTo(12,markY);scaleContext.lineTo(mark%100===0?80:42,markY);scaleContext.stroke();if(mark%100===0)scaleContext.fillText(String(mark),90,mark===0?markY-20:markY);}
    var scaleTexture=new T.CanvasTexture(scaleCanvas);scaleTexture.encoding=T.sRGBEncoding;mesh(new T.PlaneGeometry(.3,.66),'#ffffff',.03,1.65,.277,groups.measure,{map:scaleTexture,transparent:true,roughness:1});
    var jugHandle=box(.065,.4,.065,'#86a697',.38,1.65,0,groups.measure);box(.15,.045,.045,'#86a697',.32,1.87,0,groups.measure);box(.15,.045,.045,'#86a697',.32,1.44,0,groups.measure);
    var jugParts=meshes.slice(jugStart);
    var measureCheck=box(.42,.15,.18,'#456a50',-.44,1.4,.29,groups.measure),measureBadge=badge(.42,.21,0,.10,.04,measureCheck);measureBadge.write('CHECK','MEASURE');
    var stockCarton=box(.27,.48,.25,'#a9bf8c',-.49,1.55,-.27,groups.measure);box(.27,.06,.25,'#dbe5c6',0,.27,0,stockCarton);var stockSpout=cyl(.055,.055,.08,'#f9f3df',0,.34,0,stockCarton);cyl(.034,.034,.003,'#53664a',0,.043,0,stockSpout);var stockBadge=badge(.33,.17,0,.015,.14,stockCarton);stockBadge.write('STOCK','150 mL');
    var stockStream=cyl(.012,.017,1,'#e8bc68',0,2,0,groups.measure),measureShownMl=0;stockStream.visible=false;
    var probeTip=sphere(.018,'#f09a40',0,-.22,0,probe);probeTip.material.emissive.set('#a34e10');probeTip.material.emissiveIntensity=.35;
    var probeMaterialBase={transparent:chicken.material.transparent,opacity:chicken.material.opacity,depthWrite:chicken.material.depthWrite};
    var measureGuide=new T.Group();measureGuide.position.set(2.4,0,1.35);measureGuide.visible=false;scene.add(measureGuide);
    var guideGeometry=new T.BufferGeometry().setFromPoints([new T.Vector3(-.26,0,0),new T.Vector3(.3,0,0)]);
    var guideMaterial=new T.LineBasicMaterial({color:'#245c42',depthTest:false});
    var guideLine=new T.Line(guideGeometry,guideMaterial);guideLine.renderOrder=4;measureGuide.add(guideLine);meshes.push(guideLine);materials.push(guideMaterial);
    function showMeasureAmount(ml,preview){
      var amount=Math.max(0,Math.min(1000,ml||0)),level=amount/1000;fill.visible=liquidSurface.visible=amount>0;fill.scale.y=Math.max(.01,level);fill.position.y=1.35+.3*level;liquidSurface.position.y=1.35+.6*level;
      measureBadge.write(preview?amount+' mL':'CHECK',preview?'PREVIEW':amount+' mL');renderer.domElement.dataset.measurePreview=preview?String(amount):'';
      if(measureView)measureView.preview(preview?amount:null);
    }
    // Open cavity and shelves keep stored containers visible through the doorway.
    box(1.05,2.4,.065,'#9fb4a0',0,1.17,-.53,groups.chill);
    box(.065,2.4,1.12,'#9fb4a0',-.5,1.17,0,groups.chill);
    box(.065,2.4,1.12,'#9fb4a0',.5,1.17,0,groups.chill);
    box(.94,.065,1.12,'#9fb4a0',0,2.34,0,groups.chill);
    box(.94,.065,1.12,'#9fb4a0',0,.015,0,groups.chill);
    box(.91,2.23,.025,'#e2eadb',0,1.17,-.485,groups.chill);
    [ .48,1.35,1.97 ].forEach(function(height){
      box(.93,.025,.94,'#e1e7db',0,height,0,groups.chill);
      box(.93,.045,.035,'#718e80',0,height,.46,groups.chill);
    });
    var fridgeDoor=new T.Group();fridgeDoor.position.set(.46,1.18,.59);groups.chill.add(fridgeDoor);
    var fridgePanel=box(.91,2.18,.055,'#c6d4bf',-.46,0,0,fridgeDoor);
    box(.85,2.08,.025,'#edf1e6',-.46,0,-.04,fridgeDoor);
    box(.76,.07,.16,'#a0b4a2',-.46,-.68,-.11,fridgeDoor);
    var fridgeHandle=box(.075,.6,.08,'#566e57',-.81,.65,.07,fridgeDoor);
    var storageShownValues={},storageViewKey='',storageLogLength=0,doorPreference=null;
    function fridgeIsOpen(){return doorPreference===null?!!storageShownValues.chilled:doorPreference;}
    function poseFridge(opening){
      var fraction=Math.max(0,Math.min(1,opening));fridgeDoor.rotation.y=1.9*fraction;
      renderer.domElement.dataset.fridgeOpening=String(fraction);
      renderer.domElement.dataset.fridgeOpen=String(fraction>=.5);
      $('studioFridgeToggle').textContent=fraction>=.5?'Close refrigerator':'Open refrigerator';
      $('studioFridgeToggle').setAttribute('aria-expanded',String(fraction>=.5));
    }
    function setFridgeView(opened){doorPreference=!!opened;poseFridge(fridgeIsOpen()?1:0);draw();}
    box(1.26,.1,1.12,'#f2e7d1',-.42,1.3,1.48,groups.chill);box(.08,1.25,.08,'#75906a',-.96,.64,1.95,groups.chill);box(.08,1.25,.08,'#75906a',.1,.64,1.95,groups.chill);
    var shallowTray=box(.5,.045,.43,'#79a4a2',-.87,1.39,1.68,groups.chill);box(.44,.025,.37,'#fff9e9',-.87,1.42,1.68,groups.chill);var trayBadge=badge(.49,.22,0,.24,.02,shallowTray);trayBadge.write('SHALLOW','DIVIDE HERE');
    var wasteBin=cyl(.27,.23,1.25,'#6a7a70',.49,.66,1.85,groups.chill);cyl(.29,.29,.06,'#394d43',.49,1.315,1.85,groups.chill);var binBadge=badge(.48,.22,0,.8,.03,wasteBin);binBadge.write('WASTE','DISCARD');
    var labelCard=box(.29,.04,.22,'#f4da9d',-.17,1.41,1.75,groups.chill),labelBadge=badge(.34,.17,0,.12,.02,labelCard);labelBadge.write('FOOD','+ DATE');
    var tub=box(.48,.12,.32,'#f3e9d3',-.3,1.46,1.03,groups.chill),lid=box(.51,.025,.35,'#79a4a2',-.3,1.535,1.03,groups.chill),labelMesh=box(.2,.055,.01,'#fff8de',-.3,1.46,1.198,groups.chill);labelMesh.visible=false;
    var dividedTub=box(.28,.085,.28,'#f3e9d3',-.75,1.43,1.04,groups.chill),dividedLid=box(.3,.02,.3,'#79a4a2',-.75,1.482,1.04,groups.chill);dividedTub.visible=dividedLid.visible=false;
    function foodInside(body,small){
      var food=new T.Group();body.add(food);food.visible=false;
      var width=small?.23:.41,depth=small?.23:.25,height=small?.055:.09;
      box(width,height,depth,'#bc995b',0,small?-.003:-.008,0,food);
      for(var piece=0;piece<8;piece++){
        var bit=box(small?.038:.05,.017,small?.04:.05,piece%3===0?'#d48842':piece%3===1?'#739057':'#dfc58b',(piece%4-1.5)*width/4,small?.031:.041,(Math.floor(piece/4)-.5)*depth*.45,food);bit.rotation.y=piece*.7;
      }
      return food;
    }
    var mainFood=foodInside(tub,false),dividedFood=foodInside(dividedTub,true);
    var containerMaterials=[tub,dividedTub].map(function(body){return {material:body.material,transparent:body.material.transparent,opacity:body.material.opacity,depthWrite:body.material.depthWrite};});
    var containerEdges=[tub,dividedTub].map(function(body){var edgeMaterial=new T.LineBasicMaterial({color:'#58766c',transparent:true,opacity:.75}),edges=new T.LineSegments(new T.EdgesGeometry(body.geometry),edgeMaterial);body.add(edges);edges.visible=false;meshes.push(edges);materials.push(edgeMaterial);return edges;});
    function refreshContainerReadout(fraction,preview){
      var v=storageShownValues;
      $('studioLidToggle').disabled=!containerInspection||!!v.discarded||textView;
      $('studioLidToggle').textContent=lidPreference?'Close lids':'Lift lids';$('studioLidToggle').setAttribute('aria-pressed',String(lidPreference));
      $('studioFridgeToggle').disabled=containerInspection;
      var subject=replayState?'Recorded containers: ':'Containers: ';
      $('studioContainerReadout').textContent=v.discarded?subject+'Leftovers discarded.':(preview?'Preview · ':subject)+(v.shallow?'Two shallow containers. ':'One deep container. ')+(fraction>.5?'Lids lifted. ':'Lids closed. ')+(v.chilled?'In the refrigerator.':'On the counter.');
    }
    function poseLids(opening,preview){
      var fraction=containerInspection&&!storageShownValues.discarded?Math.max(0,Math.min(1,opening)):0;
      lid.position.set(tub.position.x,tub.position.y+.06*tub.scale.y+.0125+fraction*.22,tub.position.z-fraction*.10);lid.rotation.x=-fraction*.25;
      dividedLid.position.set(dividedTub.position.x,dividedTub.position.y+.0525+fraction*.22,dividedTub.position.z-fraction*.10);dividedLid.rotation.x=-fraction*.25;
      var cutaway=containerInspection&&fraction>.04&&!storageShownValues.discarded;
      mainFood.visible=dividedFood.visible=cutaway;containerEdges.forEach(function(edge){edge.visible=cutaway;});
      containerMaterials.forEach(function(saved){var m=saved.material,transparent=cutaway?true:saved.transparent;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=cutaway?.22:saved.opacity;m.depthWrite=cutaway?false:saved.depthWrite;});
      renderer.domElement.dataset.lidOpening=String(fraction);renderer.domElement.dataset.lidsOpen=String(fraction>=.5);renderer.domElement.dataset.lidPreview=String(!!preview);
      renderer.domElement.dataset.containerCutaway=String(cutaway);renderer.domElement.dataset.bodyOpacity=String(tub.material.opacity);renderer.domElement.dataset.bodyDepthWrite=String(tub.material.depthWrite);
      renderer.domElement.dataset.foodDepth=storageShownValues.discarded?'none':storageShownValues.shallow?'shallow':'deep';renderer.domElement.dataset.foodHeight=String(storageShownValues.discarded?0:.09*tub.scale.y);
      refreshContainerReadout(fraction,preview);
    }
    function placeContainers(values,inside){
      var base=inside?1.3625:1.35,mainX=inside?(values.shallow?.16:0):-.3,mainZ=inside?.07:1.03;
      var height=values.shallow?.12:.24;
      tub.visible=lid.visible=!values.discarded;tub.scale.y=values.shallow?1:2;
      tub.position.set(mainX,base+height/2,mainZ);lid.position.set(mainX,base+height+.0125,mainZ);
      labelMesh.visible=!!values.label&&!values.discarded;labelMesh.position.set(mainX,base+height/2,mainZ+.168);
      dividedTub.visible=dividedLid.visible=!!values.shallow&&!values.discarded;
      dividedTub.position.set(inside?-.30:-.75,base+.0425,inside?.07:1.04);
      dividedLid.position.set(dividedTub.position.x,base+.095,dividedTub.position.z);
      labelCard.visible=!values.label&&!values.discarded;
    }
    var selection=new T.Mesh(new T.TorusGeometry(.62,.027,10,60),new T.MeshBasicMaterial({color:'#c08a28'}));selection.rotation.x=Math.PI/2;scene.add(selection);meshes.push(selection);
    label('01  CLEAN',-3,2.07,-.3);label('02  PREP',-1.5,2.05,-.3);label('03  HEAT',.1,2.05,-.3);label('04  CHECK',1.65,2.22,-.3);label('05  MEASURE',2.4,2.32,1.05);label('06  STORE',3.65,2.68,-1.2);
    Object.keys(groups).forEach(function(id){groups[id].traverse(function(obj){if(obj.isMesh||obj.isSprite){obj.userData.mission=id;pickable.push(obj);}});});
    function tool(id,station,kind,objects,hint,action,anchor){
      var info={id:id,station:station,kind:kind,objects:objects,hint:hint,action:action,anchor:anchor||objects[0]};touchTargets[id]=info;
      objects.forEach(function(o){o.traverse(function(child){child.userData.touch=info;});});return info;
    }
    tool('soap','prep','tap',[soap,soapPump],'Tap the soap to model washing hands.','wash');
    var handsTool=tool('washingHands','prep','handwash',washParts,'Rub the hands side to side three times, then carry them under the tap and release to model the full wash.',null,washPalms[0]);handsTool.moving=[washingHands,soapPump,waterStream].concat(washPalms,washLather);
    var faucetTool=tool('faucet','prep','tap',[tapStem,tapSpout,tapLever],'Tap the faucet for a water-only hand rinse.','rinse',tapLever);faucetTool.moving=faucetTool.objects.concat(waterStream);
    tool('sanitizer','prep','tap',[sanitizer,sanitizerPump],'Tap to model following the food-contact sanitizer instructions for this equipment.','sanitize',sanitizer);
    tool('prepBoard','prep','tap',[cleanBoard],'Tap the clean board to prepare equipment.','board');
    tool('vegetableBasket','prep','prepare',[vegetableBasket,basketHandle].concat(prepVegetables),'Carry the vegetable basket onto the preparation board, then release.',null,vegetableBasket);
    tool('board','knife','tap',[matBoard,cutBoard],'Tap the board to secure its nonslip mat.','secure',cutBoard);
    var matTool=tool('nonslipMat','knife','mat',matParts,'Slide the folded mat under the cutting board, then release.',null,matParts[0]);matTool.moving=[foldedMat,matBoard,cutBoard,whole,knife,knifeHandle,hand].concat(dice);
    var knifeTool=tool('knife','knife','cut',[knife,knifeHandle],'Pull the knife down, then lift it back before releasing.',null,knifeHandle);knifeTool.moving=[knife,knifeHandle,whole].concat(dice);
    var handParts=[];hand.traverse(function(o){if(o.isMesh)handParts.push(o);});var gripTool=tool('grip','knife','grip',handParts,'Drag up to curl the fingertips into a claw grip, or down to extend them.',null,handPalm);gripTool.moving=[hand,thumb].concat(fingerJoints);
    var dialTool=tool('dial','heat','dial',dialParts,'Turn the rim clockwise for more heat or back toward Off. You can also drag the centre up for more heat or down toward Off. Release to set the burner.',null,dial);
    dialTool.moving=[dialGrip];
    tool('mushroom','heat','spread',mushrooms.concat(stems,droplets),'Carry a mushroom outward to make space in the pan.',null,mushrooms[0]);
    var spatulaTool=tool('spatula','heat','spatula',spatulaParts,'Carry the spatula to the outer pan ring to spread mushrooms, or to the centre to gather them.',null,spatulaBlade);spatulaTool.moving=[spatula].concat(mushrooms,stems,droplets);
    tool('towel','heat','dry',[towel,towelFold],'Rub the towel left and right through three passes, then release to dry the mushrooms.');
    tool('cookTimer','heat','tap',[cookTimer],'Tap once to advance the cook by 30 simulated seconds.','advance');
    var panTool=tool('pan','heat','plate',[panBowl,panHandle],'Carry the pan to the serving plate, then release to plate and switch off the burner.',null,panHandle);panTool.moving=[panBowl,panHandle].concat(mushrooms,stems,droplets);
    var probeTool=tool('probe','probe','probe',[probe,display],'Drag to place the thermometer; tap the display to take a fresh reading.',null,display);probeTool.tapAction='read';
    var ovenTool=tool('ovenHandle','probe','ovenDoor',[ovenPanel,ovenGlass,ovenHandle],'Tap the handle, pull down to open, or push up to close the oven. Door exploration does not advance cooking.',null,ovenHandle);ovenTool.moving=[ovenDoor];ovenTool.viewOnly=true;
    var chickenTool=tool('chickenPlate','probe','chicken',[chickenPlate,chicken],'Carry the plate to the oven for a simulated cooking step, or to the serving board.',null,chickenPlate);chickenTool.moving=[chickenPlate,chicken,probe,display];
    var jugTool=tool('jug','measure','pour',jugParts,'Tap for an eye-level inspection, or drag up to add 50 mL and down to remove 50 mL.',null,jugHandle);jugTool.inspect=true;
    var stockTool=tool('stockCarton','measure','stock',[stockCarton],'Carry the stock carton over the jug, then release to pour one 150 mL measure.',null,stockCarton);stockTool.moving=[stockCarton,fill,liquidSurface];
    tool('measureCheck','measure','tap',[measureCheck],'Tap to check the measured quantity against the recipe.','check');
    tool('tub','chill','store',[tub,lid,labelMesh,dividedTub,dividedLid],'Carry leftovers to the shallow tray, fridge, or waste bin; release to choose.',null,lid);
    tool('labelCard','chill','label',[labelCard],'Carry the food-and-date label onto the container, then release.');
    var doorTool=tool('fridgeHandle','chill','door',[fridgePanel,fridgeHandle],'Tap the handle, or pull down to open and push up to close. Release to leave the door in place.',null,fridgeHandle);
    doorTool.moving=[fridgeDoor];doorTool.viewOnly=true;doorTool.viewTap=true;
    var toolNames={soap:'soap',washingHands:'washing hands',faucet:'faucet',sanitizer:'sanitizer',prepBoard:'clean board',vegetableBasket:'vegetables',board:'cutting board',nonslipMat:'nonslip mat',knife:'knife',grip:'guide hand',dial:'heat dial',mushroom:'mushrooms',spatula:'spatula',towel:'towel',pan:'pan handle',cookTimer:'cook timer',probe:'thermometer',ovenHandle:'oven handle',chickenPlate:'chicken plate',jug:'jug',stockCarton:'stock carton',measureCheck:'check card',tub:'leftovers',labelCard:'label',fridgeHandle:'refrigerator handle'};Object.keys(touchTargets).forEach(function(id){touchTargets[id].name=toolNames[id];});
    var destinations={washWater:new T.Vector3(-3,1.67,-1.04),probeCenter:new T.Vector3(1.65,1.65,-.85),probeSurface:new T.Vector3(1.94,1.65,-.85),fridge:new T.Vector3(3.65,1.65,-.98),servingPlate:new T.Vector3(.1,1.65,-.02),shallowTray:new T.Vector3(2.78,1.65,.28),wasteBin:new T.Vector3(4.14,1.65,.45),containerTarget:new T.Vector3(3.35,1.65,-.37),prepBoardTarget:new T.Vector3(-3.58,1.65,-.57),ovenDrop:new T.Vector3(1.65,.82,-.03),serveDrop:new T.Vector3(1.99,1.45,.17),jugFill:new T.Vector3(2.4,2.04,1.05),boardMat:new T.Vector3(-1.5,1.65,-.85),panCenter:new T.Vector3(.1,1.65,-.85),panEdge:new T.Vector3(.4,1.65,-.85)};
    var targetRing=new T.Mesh(new T.TorusGeometry(.33,.022,8,48),new T.MeshBasicMaterial({color:'#246b57',depthTest:false,transparent:true,opacity:.95}));targetRing.rotation.x=Math.PI/2;targetRing.visible=false;targetRing.renderOrder=4;scene.add(targetRing);meshes.push(targetRing);materials.push(targetRing.material);
    var ovenOutline=new T.Mesh(new T.BoxGeometry(.88,.53,.015),new T.MeshBasicMaterial({color:'#956017',wireframe:true,depthTest:false}));ovenOutline.position.copy(destinations.ovenDrop);ovenOutline.visible=false;ovenOutline.renderOrder=4;scene.add(ovenOutline);meshes.push(ovenOutline);materials.push(ovenOutline.material);
    var matOutline=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-.56,0,-.42),new T.Vector3(.56,0,-.42),new T.Vector3(.56,0,.42),new T.Vector3(-.56,0,.42)]),new T.LineBasicMaterial({color:'#956017',depthTest:false}));matOutline.position.set(-1.5,1.4,-.85);matOutline.visible=false;matOutline.renderOrder=4;scene.add(matOutline);meshes.push(matOutline);materials.push(matOutline.material);
    var spacingRings=[.15,.33].map(function(radius){var ring=new T.Mesh(new T.TorusGeometry(radius,.013,8,48),new T.MeshBasicMaterial({color:'#956017',depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.set(.1,1.7,-.85);ring.visible=false;ring.renderOrder=4;scene.add(ring);meshes.push(ring);materials.push(ring.material);return ring;});
    var storageRings={};['fridge','shallowTray','wasteBin'].forEach(function(id){var ring=new T.Mesh(new T.TorusGeometry(.29,.02,8,48),new T.MeshBasicMaterial({color:'#956017',depthTest:false,transparent:true,opacity:.85}));ring.rotation.x=Math.PI/2;ring.position.copy(destinations[id]);if(id==='fridge')ring.position.set(3.65,1.385,-1.33);ring.visible=false;ring.renderOrder=4;scene.add(ring);meshes.push(ring);materials.push(ring.material);storageRings[id]=ring;});
    var hoverRing=new T.Mesh(new T.TorusGeometry(.19,.018,8,40),new T.MeshBasicMaterial({color:'#956017',depthTest:false}));hoverRing.rotation.x=Math.PI/2;hoverRing.visible=false;hoverRing.renderOrder=4;scene.add(hoverRing);meshes.push(hoverRing);materials.push(hoverRing.material);
    var probeRings=[.12,.29].map(function(radius){var ring=new T.Mesh(new T.TorusGeometry(radius,.012,8,48),new T.MeshBasicMaterial({color:'#f6cf7b',depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.set(1.65,1.745,-.85);ring.visible=false;ring.renderOrder=4;scene.add(ring);meshes.push(ring);materials.push(ring.material);return ring;});
    var depthMarkers=[1.7355,1.56].map(function(y){var material=new T.MeshBasicMaterial({color:'#f6cf7b',depthTest:false}),ring=new T.Mesh(new T.TorusGeometry(.027,.0035,8,24),material);ring.position.set(0,y,0);ring.visible=false;ring.renderOrder=5;groups.probe.add(ring);meshes.push(ring);materials.push(material);return ring;});
    var depthLineMaterial=new T.LineBasicMaterial({color:'#8aa99a',depthTest:false}),depthLine=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(.045,1.7355,0),new T.Vector3(.045,1.56,0)]),depthLineMaterial);depthLine.visible=false;depthLine.renderOrder=4;groups.probe.add(depthLine);meshes.push(depthLine);materials.push(depthLineMaterial);
    function refreshDepthMarkers(depth,preview){
      var visible=probeDepthInspection&&!probeServed&&!textView,selected=preview?window.KitchenStudioProbeDepth.placement(depth):probeShownValues.probe;
      depthMarkers.forEach(function(marker,i){marker.visible=visible;marker.material.color.set(selected===(i?'thick':'surface')?'#8cddce':'#f6cf7b');});depthLine.visible=visible;
    }
    function showProbeDepth(depth,preview){
      if(probeDepthInspection&&!probeServed){var pose=window.KitchenStudioProbeDepth.pose(depth);probe.position.copy(pose.shaft);display.position.copy(pose.display);probe.rotation.set(0,0,0);display.rotation.set(0,0,0);updateProbeTip();}
      else poseProbe(probeShownValues.probe,probeServed);
      renderer.domElement.dataset.probePlacement=probeServed?'resting':probeShownValues.probe||'unplaced';
      writeProbeBadge();renderer.domElement.dataset.probePreview=preview?'depth':'';refreshProbeConsole();draw();
    }
    function updateProbeTip(){var p=new T.Vector3();probeTip.getWorldPosition(p);renderer.domElement.dataset.probeTip=JSON.stringify({x:p.x,y:p.y,z:p.z});}
    function poseProbe(placement,served){
      var pose=probeDepthInspection&&!served?window.KitchenStudioProbeDepth.pose(placement==='thick'?1:0):window.KitchenStudioProbe.pose(placement,served);
      probe.position.copy(pose.shaft);display.position.copy(pose.display);probe.rotation.set(0,0,pose.rotationZ);display.rotation.set(0,0,pose.rotationZ);
      renderer.domElement.dataset.probePlacement=served?'resting':placement||'unplaced';updateProbeTip();
    }
    function writeProbeBadge(){
      var v=probeShownValues;probeBadge.write(v.reading==null?'—':v.reading+'°F',v.reading==null?(probeDepthInspection?(v.probe?'TAKE READING':'NOT PLACED'):'Tap to read'):probeServed?'RECORDED':v.probe==='surface'?'SURFACE':'INTERNAL');
      renderer.domElement.dataset.probeBadge=v.reading==null?'unread':probeServed?'recorded':v.probe==='surface'?'surface':'internal';
    }
    function showProbeTargets(placement,visible){probeRings.forEach(function(ring,index){ring.visible=visible&&!probeDepthInspection;ring.material.color.set(placement===(index?'surface':'thick')?'#8cddce':'#f6cf7b');});}
    function applyProbeCutaway(preview){
      var active=current==='probe'&&!textView&&(probeCutaway||probeDepthInspection||preview),material=chicken.material,transparent=active?true:probeMaterialBase.transparent;
      if(material.transparent!==transparent){material.transparent=transparent;material.needsUpdate=true;}
      material.opacity=active?.3:probeMaterialBase.opacity;material.depthWrite=active?false:probeMaterialBase.depthWrite;
      renderer.domElement.dataset.probeCutaway=String(active);
    }
    function refreshProbeConsole(){
      var v=probeShownValues,section=$('studioProbeControls'),active=current==='probe'&&!textView&&!ovenInspection;
      section.hidden=!active;$('studioProbeCutaway').setAttribute('aria-pressed',String(probeCutaway||probeDepthInspection));$('studioProbeCutaway').disabled=!active||probeDepthInspection||ovenInspection;
      $('studioProbeCutawayHelp').hidden=!probeCutaway&&!probeDepthInspection;$('studioProbeRead').disabled=!active||sceneLocked()||!v.probe||probeServed||!!(probeView&&probeView.isPreviewing());
      var placement=v.probe==='thick'?'Tip in the centre':v.probe==='surface'?'Tip at the surface':'Probe not placed';
      var reading=v.reading==null?'No current reading.':v.reading+'°F / '+Math.round((v.reading-32)*5/9)+'°C.';
      var message=(probeHistorical||probeServed?'Recorded thermometer: ':'Thermometer: ')+placement+'. '+reading+(probeServed?' Food served; thermometer at rest.':'');
      var depthPreview=probeDepthInspection&&probeView&&probeView.isPreviewing();
      if(depthPreview){var candidate=window.KitchenStudioProbeDepth.placement(probeView.getDepth());message='Placement preview. '+(candidate==='thick'?'Tip near the centre marker.':candidate==='surface'?'Tip near the surface marker.':'Move to the surface or centre marker.')+' Place the tip, then take a fresh reading.';probeBadge.write('PREVIEW','PLACE THEN READ');renderer.domElement.dataset.probeBadge='preview';renderer.domElement.dataset.probePreview='depth';}
      refreshDepthMarkers(probeView?probeView.getDepth():0,!!depthPreview);
      if($('studioProbeReadout').textContent!==message)$('studioProbeReadout').textContent=message;
      applyProbeCutaway(false);showProbeTargets(v.probe,active&&probeCutaway&&!probeServed);
    }
    var stirGuide=new T.Group();stirGuide.position.set(.1,1.65,-.85);stirGuide.visible=false;scene.add(stirGuide);
    var circlePoints=[];
    for(var circleStep=0;circleStep<=64;circleStep++){
      var circleAngle=Math.PI+circleStep*Math.PI/32;
      circlePoints.push(new T.Vector3(Math.cos(circleAngle)*.23,0,Math.sin(circleAngle)*.23));
    }
    var stirGuideMaterial=new T.LineDashedMaterial({color:'#fff2d3',dashSize:.035,gapSize:.025,depthTest:false});
    var guideCircle=new T.Line(new T.BufferGeometry().setFromPoints(circlePoints),stirGuideMaterial);guideCircle.computeLineDistances();guideCircle.renderOrder=4;
    stirGuide.add(guideCircle);meshes.push(guideCircle);materials.push(stirGuideMaterial);
    var stirProgressMaterial=new T.MeshBasicMaterial({color:'#9ee3b5',side:T.DoubleSide,depthTest:false});
    var stirArc=new T.Mesh(new T.RingGeometry(.218,.242,64,1,Math.PI,Math.PI*2),stirProgressMaterial);stirArc.renderOrder=5;stirArc.visible=false;
    stirGuide.add(stirArc);meshes.push(stirArc);materials.push(stirProgressMaterial);
    var stirStartRing=new T.Mesh(new T.RingGeometry(.032,.043,28),new T.MeshBasicMaterial({color:'#e7ba57',side:T.DoubleSide,depthTest:false}));
    stirStartRing.rotation.x=-Math.PI/2;stirStartRing.position.x=-.23;stirStartRing.renderOrder=6;
    stirGuide.add(stirStartRing);meshes.push(stirStartRing);materials.push(stirStartRing.material);
    function pourMode(){return $('studioControlledPour').getAttribute('aria-pressed')==='true'?'controlled':'portion';}
    function setPourMode(mode){
      if(current!=='measure'||sceneLocked())return;
      touch.cancel('Pouring technique changed. Start a fresh pour.');if(measureView)measureView.close();
      $('studioPortionPour').setAttribute('aria-pressed',String(mode==='portion'));$('studioControlledPour').setAttribute('aria-pressed',String(mode==='controlled'));
      $('studioPourHelp').hidden=$('studioPourStep').hidden=mode!=='controlled';
      stockTool.hint=mode==='controlled'?'Carry the carton to the jug mouth, tip down along the guide and return upright. Release to add up to 50 mL.':'Carry the stock carton over the jug, then release to pour one 150 mL measure.';
      stockBadge.write('STOCK',mode==='controlled'?'50 mL':'150 mL');touch.handsOn();focus();touch.update();draw();renderer.domElement.scrollIntoView({block:'center',behavior:'auto'});
    }
    function pourInstruction(trace,ml){
      var result=window.KitchenStudioPour.finish(trace);
      if(!result.complete)return result.message;
      var addition=Math.max(0,Math.min(50,1000-(ml||0)));
      return addition?'Release to add '+addition+' mL. The jug will contain '+((ml||0)+addition)+' mL.':'Jug is full at 1,000 mL. Release to record the pour without adding more.';
    }
    function renderRubGuide(g){
      if(!rubGuide)return;
      var kind=g&&g.interactive&&!sceneLocked()?g.hit.kind:null;
      var model=rubGuide.update(kind,kind==='handwash'?g.wash:kind==='dry'?g.trace:null);
      if(model)$('studioTouchHint').textContent=model.instruction+' · Esc to cancel';
    }
    function renderCutGuide(g){
      var guide=$('studioCutGuide'),trace=g&&g.interactive&&g.hit.kind==='cut'?g.trace:null;
      renderer.domElement.dataset.cutPhase=trace?trace.phase:'idle';
      guide.hidden=!trace||trace.invalid||textView;
      if(guide.hidden)return;
      var rect=renderer.domElement.getBoundingClientRect(),x=trace.start.x-rect.left,y=trace.start.y-rect.top;
      guide.style.left=x+'px';guide.style.top=y+'px';guide.style.height=(45*trace.unit)+'px';
      guide.dataset.phase=trace.phase;guide.dataset.side=x>rect.width-105?'left':'right';
      guide.querySelector('i').style.top=(trace.depth*100)+'%';
    }
    function renderPourGuide(trace){
      var guide=$('studioPourGuide'),canvas=renderer.domElement,rect=canvas.getBoundingClientRect();
      canvas.dataset.pourPhase=trace?trace.phase:'idle';canvas.dataset.pourTilt=trace?String(trace.tilt):'0';canvas.dataset.pourAnchor=trace&&trace.anchor?JSON.stringify(trace.anchor):'';
      guide.hidden=!trace||!trace.anchor||trace.invalid;
      if(guide.hidden)return;
      guide.style.left=(trace.anchor.x-rect.left)+'px';guide.style.top=(trace.anchor.y-rect.top)+'px';guide.style.height=(40*trace.unit)+'px';guide.dataset.ready=String(trace.phase==='ready');
    }
    function platingMode(){return $('studioControlledPlate').getAttribute('aria-pressed')==='true'?'controlled':'quick';}
    function renderPlatingGuide(trace){
      var guide=$('studioPlatingGuide'),canvas=renderer.domElement,rect=canvas.getBoundingClientRect();
      canvas.dataset.platingPhase=trace?trace.phase:'idle';canvas.dataset.platingTilt=trace?String(trace.tilt):'0';canvas.dataset.platingAnchor=trace&&trace.anchor?JSON.stringify(trace.anchor):'';
      if(!trace){canvas.dataset.platingPreview='false';canvas.dataset.platingTransfer='0';canvas.dataset.platingFoodCount='0';canvas.dataset.panPreviewAngle='0';}
      guide.hidden=!trace||!trace.anchor||trace.invalid;
      if(guide.hidden)return;
      guide.style.left=(trace.anchor.x-rect.left)+'px';guide.style.top=(trace.anchor.y-rect.top)+'px';guide.style.height=(40*trace.unit)+'px';guide.dataset.ready=String(trace.phase==='ready');
    }
    function setPlatingMode(mode){
      if(current!=='heat'||sceneLocked())return;touch.cancel('Plating technique changed. Start a fresh transfer.');
      var controlled=mode==='controlled';$('studioControlledPlate').setAttribute('aria-pressed',String(controlled));$('studioQuickPlate').setAttribute('aria-pressed',String(!controlled));
      $('studioPlatingHelp').hidden=$('studioPlatingStep').hidden=!controlled;
      panTool.hint=controlled?'Carry the pan over the plate, follow the guide down to tip, return level, then release.':'Carry the pan to the serving plate, then release to plate and switch off the burner.';
      touch.handsOn();if(panView)panView.update({plating:controlled});if(!panInspection)focus();touch.update();draw();renderer.domElement.scrollIntoView({block:'center',behavior:'auto'});
    }
    function resetStockStream(){
      stockStream.visible=false;stockStream.scale.x=stockStream.scale.z=1;renderer.domElement.dataset.stockStream='false';
    }
    function drawStockStream(amount,visible,tilt){
      resetStockStream();
      var width=visible?window.KitchenStudioPourFlow.width(tilt===undefined?1:tilt):0;
      if(width>0){
        stockStream.visible=true;stockStream.scale.x=stockStream.scale.z=width;
        stockCarton.updateWorldMatrix(true,false);var top=stockCarton.localToWorld(new T.Vector3(0,.385,0)),bottom=new T.Vector3(2.4,1.35+.6*amount/1000,1.05);
        top=groups.measure.worldToLocal(top);bottom=groups.measure.worldToLocal(bottom);
        var direction=top.clone().sub(bottom);stockStream.scale.y=direction.length();stockStream.position.copy(top.clone().add(bottom).multiplyScalar(.5));stockStream.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
      }
      renderer.domElement.dataset.stockStream=String(stockStream.visible);
    }
    function panMode(){return $('studioStirMode').getAttribute('aria-pressed')==='true'?'stir':'arrange';}
    function renderStirGuide(trace){
      var enabled=current==='heat'&&panMode()==='stir'&&!sceneLocked()&&!(panView&&panView.isDialFocused());
      stirGuide.visible=enabled;stirArc.visible=enabled&&!!trace&&!trace.invalid;
      var progress=trace?window.KitchenStudioStir.progress(trace):0;
      renderer.domElement.dataset.stirProgress=String(progress);
      renderer.domElement.dataset.stirPhase=trace?trace.phase:'idle';
      if(!stirArc.visible)return;
      stirArc.rotation.x=trace.travel<0?-Math.PI/2:Math.PI/2;
      stirArc.geometry.setDrawRange(0,Math.floor(progress*64)*6);
    }
    function setPanMode(mode){
      if(sceneLocked())return;
      touch.cancel('Spatula technique changed. Start a fresh movement.');
      $('studioArrangeMode').setAttribute('aria-pressed',String(mode==='arrange'));
      $('studioStirMode').setAttribute('aria-pressed',String(mode==='stir'));
      $('studioStirHelp').hidden=$('studioStirStep').hidden=mode!=='stir';
      spatulaTool.hint=mode==='stir'?'Move the spatula to the start ring, follow one circle, then release for a 30-second simulated cooking step.':'Carry the spatula to the outer pan ring to spread mushrooms, or to the centre to gather them.';
      renderStirGuide(null);touch.update();draw();
    }
    var heatContext=new T.Group(),dialFocusParts=[hobSurface,dialGrip].concat(dialScaleParts);
    groups.heat.children.slice().forEach(function(object){if(dialFocusParts.indexOf(object)===-1)heatContext.add(object);});groups.heat.add(heatContext);
    function refreshDialContext(){
      var dialFocused=!!(panView&&panView.isDialFocused());heatContext.visible=!dialFocused;renderStirGuide(null);
      if(panInspection)$('sceneStatus').textContent=dialFocused?'Burner dial view · turn the rim, then release':'Pan working view · use the tools or adjust the viewing angle';
    }
    var contactRing=new T.Mesh(new T.TorusGeometry(.2,.025,8,40),new T.MeshBasicMaterial({color:'#246b57',depthTest:false,transparent:true,opacity:0}));contactRing.rotation.x=Math.PI/2;contactRing.visible=false;contactRing.renderOrder=5;scene.add(contactRing);meshes.push(contactRing);materials.push(contactRing.material);
    var motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
    function stopFeedback(){if(feedbackFrame!==null)cancelAnimationFrame(feedbackFrame);feedbackFrame=null;contactRing.visible=false;renderer.domElement.dataset.feedback='idle';}
    function pulse(id,accepted){stopFeedback();var info=touchTargets[id],drop=destinations[id];if((!info&&!drop)||textView||measureInspection||replayState||motionPreference.matches||document.hidden)return;if(drop)contactRing.position.copy(drop);else info.anchor.getWorldPosition(contactRing.position);contactRing.position.y+=.04;contactRing.material.color.set(accepted?'#246b57':'#956017');contactRing.material.opacity=.8;contactRing.scale.setScalar(1);contactRing.visible=true;renderer.domElement.dataset.feedback=accepted?'accepted':'retry';feedbackStart=performance.now();function frame(now){if(document.hidden||textView||replayState){stopFeedback();draw();return;}var t=Math.min(1,(now-feedbackStart)/420);contactRing.scale.setScalar(1+t*1.8);contactRing.material.opacity=.8*(1-t);if(t>=1)stopFeedback();else feedbackFrame=requestAnimationFrame(frame);draw();}feedbackFrame=requestAnimationFrame(frame);draw();}
    function respond(action,s){var map={wash:'soap',rinse:'faucet',sanitize:'sanitizer',board:'prepBoard',prepare:'prepBoardTarget',secure:'board',claw:'grip',flat:'grip',dice:'knife',largeDice:'knife',dry:'towel',spread:'mushroom',crowd:'spatula',off:'dial',low:'dial',medium:'dial',high:'dial',advance:'cookTimer',plate:'servingPlate',thick:'probe',surface:'probe',read:'probe',cook:'ovenDrop',serve:'serveDrop',add50:'jug',add150:'jug',remove50:'jug',empty:'jug',check:'measureCheck',chill:'fridge',shallow:'shallowTray',label:'containerTarget',discard:'wasteBin'},entry=s.log[s.log.length-1];if(entry)pulse(map[action],entry.accepted);}
    function projectTargets(){
      var rect=renderer.domElement.getBoundingClientRect(),points={};
      Object.keys(touchTargets).forEach(function(id){var o=touchTargets[id].anchor,p=new T.Vector3();o.getWorldPosition(p);if(id==='board')p.set(-1.1,1.445,-.62);if(id==='dial')p.copy(dialCap);if(id==='chickenPlate'){p.x+=.3;p.z+=.22;p.y+=.03;}p.project(camera);points[id]={x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2};});
      var tipPoint=new T.Vector3();probeTip.getWorldPosition(tipPoint);tipPoint.project(camera);points.probeTip={x:(tipPoint.x+1)*rect.width/2,y:(1-tipPoint.y)*rect.height/2};
      var depthGuide=$('studioProbeDepthGuide');depthGuide.hidden=!probeDepthInspection||probeServed||textView;
      depthMarkers.forEach(function(marker,i){var p=new T.Vector3();marker.getWorldPosition(p);p.project(camera);var at={x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2};points[i?'probeCore':'probeSkin']=at;if(!depthGuide.hidden){var label=depthGuide.children[i];label.style.left=(at.x+16)+'px';label.style.top=(at.y-7)+'px';}});
      Object.keys(destinations).forEach(function(id){var p=destinations[id].clone().project(camera);points[id]={x:(p.x+1)*rect.width/2,y:(1-p.y)*rect.height/2};});
      if(current==='heat'){
        for(var stirStep=0;stirStep<16;stirStep++){
          var stirAngle=Math.PI+stirStep*Math.PI/8;
          var stirPoint=new T.Vector3(.1+Math.cos(stirAngle)*.23,1.65,-.85+Math.sin(stirAngle)*.23).project(camera);
          points['stirPoint'+stirStep]={x:(stirPoint.x+1)*rect.width/2,y:(1-stirPoint.y)*rect.height/2};
        }
        points.stirStart=points.stirPoint0;
        for(var i=0;i<16;i++){
          var angle=i*Math.PI/8,rim=dialCap.clone();
          rim.x+=Math.sin(angle)*dialRadius*.8;rim.z-=Math.cos(angle)*dialRadius*.8;rim.project(camera);
          points['dialRim'+i]={x:(rim.x+1)*rect.width/2,y:(1-rim.y)*rect.height/2};
        }
      }
      renderer.domElement.dataset.targetWidth=String(rect.width);renderer.domElement.dataset.targetHeight=String(rect.height);renderer.domElement.dataset.targets=JSON.stringify(points);
    }
    function renderDiscovery(){
      if(!discoveryView)return;
      if(!discovered||textView||document.hidden||renderer.domElement.dataset.held){discoveryView.clear();return;}
      var info=inputTool(discovered.info);
      var visible=info&&info.kind&&info.station===current&&info.anchor&&Array.isArray(info.objects)&&info.objects.some(function(object){for(var p=object;p;p=p.parent)if(p.visible===false)return false;return true;});
      if(!visible){discoveryView.clear();return;}
      info.anchor.updateWorldMatrix(true,false);var p=info.anchor.getWorldPosition(new T.Vector3()).project(camera);
      var at=JSON.parse(renderer.domElement.dataset.targets||'{}')[info.id];
      if(!at||!Number.isFinite(p.z)||p.z< -1||p.z>1){discoveryView.clear();return;}
      discoveryView.render({id:info.id,name:info.name||info.id,hint:discovered.hint,readOnly:discovered.readOnly,point:{x:at.x,y:at.y}});
    }
    function renderDropTargets(){
      if(!dropView)return;
      var g=dropGesture,info=g&&inputTool(g.hit),api=window.KitchenStudioDropTargets;
      var markerObjects=info&&Array.isArray(info.objects)?info.objects.slice():[];if(info&&info.kind==='mat')markerObjects.push(matBoard);
      var visible=markerObjects.some(function(object){for(var parent=object;parent;parent=parent.parent)if(parent.visible===false)return false;return true;});
      if(!g||!g.interactive||g.source!==state()||textView||document.hidden||sceneLocked()||!renderer.domElement.getClientRects().length||!info||info.viewOnly||info.station!==current||!visible||!api.supports(info.kind)||renderer.domElement.dataset.held!==g.hit.id){dropView.clear();return;}
      var points=JSON.parse(renderer.domElement.dataset.targets||'{}'),targets=[];
      keyboardTargets(info,g).forEach(function(target){var position=destinations[target.id],at=points[target.id];if(!position||!at)return;var projected=position.clone().project(camera);if(!Number.isFinite(projected.z)||projected.z< -1||projected.z>1)return;targets.push({id:target.id,label:target.label,point:{x:at.x,y:at.y}});});
      dropView.render({targets:targets,active:g.moved>=8?api.activeTarget(info.kind,g.destination):null});
    }
    function draw(){renderer.render(scene,camera);renderer.domElement.dataset.platingFoodColors=mushrooms.map(function(m){return m.material.color.getHexString();}).join(',');projectTargets();renderDiscovery();renderDropTargets();}
    function setMeasureInspection(opened){
      measureInspection=opened;
      if(opened){
        stopFeedback();hoverRing.visible=false;
        var decorations=stationLabels.concat(stationBadges,[selection,stockCarton,measureCheck]);
        Object.keys(groups).forEach(function(id){if(id!=='measure')decorations.push(groups[id]);});
        inspectionDecorations=decorations.map(function(object){var saved={object:object,visible:object.visible};object.visible=false;return saved;});
      }else{
        inspectionDecorations.forEach(function(saved){saved.object.visible=saved.visible;});inspectionDecorations=[];
      }
      $('stationLens').hidden=textView||opened||panInspection||boardInspection||containerInspection||probeDepthInspection||ovenInspection;
      if(touch)touch.update();
    }
    function setPanInspection(opened){
      panInspection=opened;
      if(opened){
        if(touch)touch.handsOn();
        stopFeedback();hoverRing.visible=false;
        var decorations=stationLabels.concat(stationBadges,[selection]);
        Object.keys(groups).forEach(function(id){if(id!=='heat')decorations.push(groups[id]);});
        panDecorations=decorations.map(function(object){var saved={object:object,visible:object.visible};object.visible=false;return saved;});
      }else{panDecorations.forEach(function(saved){saved.object.visible=saved.visible;});panDecorations=[];}
      $('stationLens').hidden=textView||measureInspection||opened||boardInspection||containerInspection||probeDepthInspection||ovenInspection;
      refreshDialContext();if(!opened)$('sceneStatus').textContent='Drag empty space to orbit · Scroll to zoom · Tap a station';
      if(touch)touch.update();
    }
    function setBoardInspection(opened){
      boardInspection=opened;
      if(opened){
        if(touch)touch.handsOn();
        stopFeedback();hoverRing.visible=false;
        var decorations=stationLabels.concat(stationBadges,[selection]);
        Object.keys(groups).forEach(function(id){if(id!=='knife')decorations.push(groups[id]);});
        boardDecorations=decorations.map(function(object){var saved={object:object,visible:object.visible};object.visible=false;return saved;});
      }else{boardDecorations.forEach(function(saved){saved.object.visible=saved.visible;});boardDecorations=[];}
      $('stationLens').hidden=textView||measureInspection||panInspection||containerInspection||opened||probeDepthInspection||ovenInspection;
      $('sceneStatus').textContent=opened?'Board working view · use the tools or adjust the viewing angle':'Drag empty space to orbit · Scroll to zoom · Tap a station';
      if(touch)touch.update();
      if(opened)renderer.domElement.scrollIntoView({block:'center',behavior:'auto'});
    }
    function setContainerInspection(opened){
      containerInspection=opened;lidPreference=false;
      if(opened){
        containerRevision=shownContainerRevision;containerDoorPreference=doorPreference;
        if(touch)touch.handsOn();stopFeedback();hoverRing.visible=false;
        var decorations=stationLabels.concat(stationBadges,[selection]);Object.keys(groups).forEach(function(id){if(id!=='chill')decorations.push(groups[id]);});
        containerDecorations=decorations.map(function(object){var saved={object:object,visible:object.visible};object.visible=false;return saved;});
        if(storageShownValues.chilled)doorPreference=true;
      }else{containerDecorations.forEach(function(saved){saved.object.visible=saved.visible;});containerDecorations=[];doorPreference=containerDoorPreference;containerRevision=null;}
      poseFridge(fridgeIsOpen()?1:0);poseLids(0,false);
      $('stationLens').hidden=textView||measureInspection||panInspection||boardInspection||opened||probeDepthInspection||ovenInspection;
      $('sceneStatus').textContent=opened?'Container inspection · tap or lift the lids':'Drag empty space to orbit · Scroll to zoom · Tap a station';
      if(touch)touch.update();if(opened)renderer.domElement.scrollIntoView({block:'center',behavior:'auto'});
    }
    function containerFrame(){
      groups.chill.updateWorldMatrix(true,true);var points=[],centres=[];
      [tub,dividedTub].forEach(function(body,index){if(!body.visible)return;var halfX=index?.21:.32,halfY=index?.0425:.06;
        [-halfX,halfX].forEach(function(x){[-halfY,halfY+.29/body.scale.y].forEach(function(y){[-.34,.22].forEach(function(z){points.push(body.localToWorld(new T.Vector3(x,y,z)));});});});
        centres.push(body.getWorldPosition(new T.Vector3()));
      });
      var target=new T.Vector3();centres.forEach(function(c){target.add(c);});target.multiplyScalar(1/Math.max(1,centres.length));target.y+=.09;target.z-=.04;
      return {target:target,points:points};
    }
    function ovenFrame(){
      groups.probe.updateWorldMatrix(true,true);var points=[];
      [-.62,.62].forEach(function(x){[.30,1.24].forEach(function(y){[.40,1.60].forEach(function(z){points.push(groups.probe.localToWorld(new T.Vector3(x,y,z)));});});});
      return {target:groups.probe.localToWorld(new T.Vector3(0,.78,.96)),points:points};
    }
    function setOvenInspection(opened){
      ovenInspection=opened;
      if(opened){
        if(touch)touch.handsOn();stopFeedback();hoverRing.visible=false;
        var decorations=stationLabels.concat(stationBadges,[selection]);Object.keys(groups).forEach(function(id){if(id!=='probe')decorations.push(groups[id]);});
        groups.probe.children.forEach(function(object){if(ovenParts.indexOf(object)===-1)decorations.push(object);});
        ovenDecorations=decorations.map(function(object){var saved={object:object,visible:object.visible};object.visible=false;return saved;});
      }else{ovenDecorations.forEach(function(saved){saved.object.visible=saved.visible;});ovenDecorations=[];}
      $('stationLens').hidden=textView||measureInspection||panInspection||boardInspection||containerInspection||probeDepthInspection||opened;
      $('sceneStatus').textContent=opened?'Oven inspection · pull the handle down to open, or push up to close':'Drag empty space to orbit · Scroll to zoom · Tap a station';
      refreshProbeConsole();
      if(touch)touch.update();if(opened)renderer.domElement.scrollIntoView({block:'center',behavior:'auto'});
    }
    function setProbeDepthInspection(opened){
      probeDepthInspection=opened;
      if(opened){
        if(touch)touch.handsOn();stopFeedback();hoverRing.visible=false;
        var decorations=stationLabels.concat(stationBadges.filter(function(sprite){return sprite!==probeBadge.sprite;}),[selection]);Object.keys(groups).forEach(function(id){if(id!=='probe')decorations.push(groups[id]);});
        probeDepthDecorations=decorations.map(function(object){var saved={object:object,visible:object.visible};object.visible=false;return saved;});
        probeTool.hint='Drag the display down to insert the sensing tip, or up to withdraw. Release at a marker, then take a fresh reading.';
      }else{probeDepthDecorations.forEach(function(saved){saved.object.visible=saved.visible;});probeDepthDecorations=[];probeTool.hint='Drag to place the thermometer; tap the display to take a fresh reading.';}
      poseProbe(probeShownValues.probe,probeServed);writeProbeBadge();refreshProbeConsole();poseOven(ovenPreference?1:0,false);
      $('stationLens').hidden=textView||measureInspection||panInspection||boardInspection||containerInspection||opened||ovenInspection;
      $('sceneStatus').textContent=opened?'Probe insertion view · move the sensing tip between the markers':'Drag empty space to orbit · Scroll to zoom · Tap a station';
      if(touch)touch.update();if(opened)renderer.domElement.scrollIntoView({block:'center',behavior:'auto'});
    }
    function resize(){if(host.hidden)return;var w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;var changed=!lastSize||lastSize.w!==w||lastSize.h!==h;if(touch&&lastSize&&changed)touch.cancel('View resized. No action recorded.');lastSize={w:w,h:h};renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(panView&&changed)panView.resize();if(boardView&&changed)boardView.resize();if(containerView&&changed)containerView.resize();if(probeView&&changed)probeView.resize();if(ovenView&&changed)ovenView.resize();draw();}
    function reset(){if(ovenView)ovenView.close();if(probeView)probeView.close();if(containerView)containerView.close();if(boardView)boardView.close();if(panView)panView.close();if(measureView)measureView.close();if(touch)touch.cancel('View reset. No action recorded.');focused=false;focusedStation=null;stationLabels.concat(stationBadges).forEach(function(s){s.visible=true;});$('focusView').setAttribute('aria-pressed','false');camera.position.set(7.4,6.6,9.7);controls.target.set(0,1,0);controls.update();resize();}
    controls.addEventListener('change',draw);
    var ray=new T.Raycaster(),pointer=new T.Vector2(),workPlane=new T.Plane(new T.Vector3(0,1,0),-1.65);
    function cast(e){var rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);}
    function pick(e){cast(e);var hits=ray.intersectObjects(pickable).filter(function(h){var o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});var hit=hits.find(function(h){return h.object.isSprite&&h.object.userData.touch&&h.object.userData.mission===current;})||(probeCutaway&&current==='probe'?hits.find(function(h){return h.object.userData.touch&&h.object.userData.touch.id==='probe';}):null)||hits[0];var info=hit?(hit.object.userData.touch||{station:hit.object.userData.mission,objects:[]}):null;return inputTool(info);}
    function inputTool(info){if(panView&&panView.isDialFocused())return info&&info.id==='dial'?info:null;if(ovenInspection)return info&&info.id==='ovenHandle'?info:null;if(probeDepthInspection)return info&&info.id==='probe'?Object.assign({},info,{kind:'insertProbe',tapAction:null}):null;if(containerInspection)return info&&info.id==='tub'?Object.assign({},info,{kind:'lid',viewOnly:true,viewTap:true,moving:[lid,dividedLid]}):null;if(info&&info.id==='pan'&&platingMode()==='controlled')return Object.assign({},info,{kind:'tipPlate'});if(info&&info.id==='stockCarton'&&pourMode()==='controlled')return Object.assign({},info,{kind:'tipPour'});return info&&info.id==='spatula'&&panMode()==='stir'?Object.assign({},info,{kind:'stir'}):info;}
    function keyboardPoint(id){
      var targets=JSON.parse(renderer.domElement.dataset.targets||'{}'),at=targets[id],b=renderer.domElement.getBoundingClientRect();
      return at?{x:b.left+at.x,y:b.top+at.y}:null;
    }
    function keyboardTargets(info,g){
      if(g&&(g.trace&&g.trace.invalid||g.insertion&&g.insertion.invalid||g.ovenDoor&&g.ovenDoor.invalid||g.lid&&g.lid.invalid||g.pour&&g.pour.invalid||g.plating&&g.plating.invalid||g.wash&&g.wash.invalid||g.stir&&g.stir.invalid))return [];
      var choices={prepare:['prepBoardTarget'],mat:['boardMat'],spatula:['panCenter','panEdge'],spread:['panEdge'],plate:['servingPlate'],tipPlate:['servingPlate'],stock:['jugFill'],tipPour:['jugFill'],probe:['probeCenter','probeSurface'],chicken:['ovenDrop','serveDrop'],store:['shallowTray','fridge','wasteBin'],label:['containerTarget']},ids=choices[info.kind]||[];
      if(info.kind==='stir'&&g.stir&&g.stir.phase==='carry')ids=['stirStart'];
      if(info.kind==='handwash'&&g.wash&&g.wash.passes===3)ids=['washWater'];
      var names={prepBoardTarget:'Preparation board',boardMat:'Under the board',panCenter:'Pan centre',panEdge:'Outer pan ring',servingPlate:'Serving plate',jugFill:'Jug opening',probeCenter:'Chicken centre',probeSurface:'Chicken surface',ovenDrop:'Oven',serveDrop:'Serving place',shallowTray:'Shallow tray',fridge:'Refrigerator shelf',wasteBin:'Waste bin',containerTarget:'Leftovers container',stirStart:'Stirring start ring',washWater:'Running water'};
      return ids.map(function(id){return {id:id,label:names[id]};});
    }
    function point(e){cast(e);return ray.ray.intersectPlane(workPlane,new T.Vector3());}
    function platingTarget(e){
      var hit=point(e),rect=renderer.domElement.getBoundingClientRect(),anchor=destinations.servingPlate.clone().project(camera);
      return {overPlate:!!hit&&Math.hypot(hit.x-.1,hit.z+.02)<=.38,anchor:{x:rect.left+(anchor.x+1)*rect.width/2,y:rect.top+(1-anchor.y)*rect.height/2}};
    }
    function washWater(e){
      cast(e);var hit=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-1.67),new T.Vector3());
      return {overWater:!!hit&&Math.hypot(hit.x+3,hit.z+1.04)<=.17};
    }
    function pourMouth(e){
      cast(e);var hit=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-2.04),new T.Vector3()),rect=renderer.domElement.getBoundingClientRect(),anchor=destinations.jugFill.clone().project(camera);
      return {over:!!hit&&Math.hypot(hit.x-2.4,hit.z-1.05)<=.28,anchor:{x:rect.left+(anchor.x+1)*rect.width/2,y:rect.top+(1-anchor.y)*rect.height/2}};
    }
    function stirPoint(e){var hit=point(e);return hit?{x:hit.x-.1,z:hit.z+.85}:null;}
    var dialPlane=new T.Plane(new T.Vector3(0,1,0),-dialCap.y);
    function dialPoint(e){
      cast(e);
      var hit=ray.ray.intersectPlane(dialPlane,new T.Vector3());
      return hit?{x:(hit.x-dialCap.x)/dialRadius,z:(hit.z-dialCap.z)/dialRadius}:null;
    }
    function platterTarget(at){
      cast({clientX:at.x,clientY:at.y});
      var oven=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),.03),new T.Vector3()),serve=ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-1.45),new T.Vector3());
      var inOven=oven&&Math.abs(oven.x-1.65)<=.44&&Math.abs(oven.y-.82)<=.265,inServe=serve&&Math.abs(serve.x-1.99)<=.38&&Math.abs(serve.z-.17)<=.29;
      if(inOven&&inServe)return ray.ray.origin.distanceTo(oven)<ray.ray.origin.distanceTo(serve)?'oven':'serve';
      return inOven?'oven':inServe?'serve':null;
    }
    function highlight(info){
      highlighted.forEach(function(entry){entry.material.emissive.copy(entry.color);entry.material.emissiveIntensity=entry.intensity;});highlighted=[];hoverRing.visible=!!info&&!measureInspection;
      if(info){info.objects.forEach(function(o){var m=o.material;if(!m.emissive)return;highlighted.push({material:m,color:m.emissive.clone(),intensity:m.emissiveIntensity});m.emissive.set('#8c632c');m.emissiveIntensity=.3;});info.anchor.getWorldPosition(hoverRing.position);hoverRing.position.y=1.36;}
    }
    function restorePose(g){if(!g)return;g.original.forEach(function(o){o.object.position.copy(o.position);o.object.rotation.copy(o.rotation);o.object.scale.copy(o.scale);o.object.visible=o.visible;});if(g.hit.kind==='grip')renderer.domElement.dataset.gripCurl=String(Math.round(Math.max(0,Math.min(1,-fingerJoints[0].rotation.x/1.35))*100));if(g.hit.kind==='stock'||g.hit.kind==='tipPour'||g.hit.kind==='pour')showMeasureAmount(measureShownMl,false);renderer.domElement.dataset.washPhase='idle';renderer.domElement.dataset.washPasses='0';renderer.domElement.dataset.washPreview='false';renderer.domElement.dataset.handLather='0';renderer.domElement.dataset.waterFlow='false';renderer.domElement.dataset.platingPreview='false';renderer.domElement.dataset.platingTransfer='0';renderer.domElement.dataset.platingFoodCount='0';renderer.domElement.dataset.panPreviewAngle='0';renderer.domElement.dataset.cutPreview='0';renderer.domElement.dataset.matPreview='false';renderer.domElement.dataset.spatulaPreview='';poseFridge(fridgeIsOpen()?1:0);poseLids(lidPreference?1:0,false);renderer.domElement.dataset.storagePreview='';poseOven(ovenPreference?1:0,false);renderer.domElement.dataset.platterTarget='';}
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
      dropGesture=g&&g.interactive?g:null;if(!dropGesture&&dropView)dropView.clear();
      renderer.domElement.dataset.dialPreview='';
      $('studioDialScale').hidden=true;
      restorePose(g||old);if(!g&&old&&old.hit.kind==='insertProbe'&&probeView)probeView.preview(null);if(!g&&old&&(old.hit.kind==='probe'||old.hit.kind==='insertProbe'||old.hit.kind==='chicken')){writeProbeBadge();refreshProbeConsole();updateProbeTip();renderer.domElement.dataset.probePlacement=probeServed?'resting':probeShownValues.probe||'unplaced';renderer.domElement.dataset.probePreview='';}matOutline.visible=false;spacingRings.forEach(function(ring){ring.visible=false;});targetRing.visible=false;targetRing.scale.setScalar(1);ovenOutline.visible=false;resetStockStream();Object.keys(storageRings).forEach(function(id){storageRings[id].visible=false;});$('stationLens').hidden=textView||measureInspection||panInspection||boardInspection||containerInspection||!!(g&&g.interactive&&(g.hit.kind==='tipPlate'||g.hit.kind==='handwash'||g.hit.kind==='chicken'||g.hit.kind==='tipPour'||g.hit.kind==='probe'&&g.moved>=8))||probeDepthInspection||ovenInspection;var placementHint=$('studioPlacementHint');placementHint.hidden=true;placementHint.dataset.tool=g?g.hit.kind:'';renderStirGuide(g&&g.stir);renderPourGuide(g&&g.pour);renderPlatingGuide(g&&g.plating);renderCutGuide(g);renderRubGuide(g);if(!g)return;
      var kind=g.hit.kind,trace=g.trace,delta=g.current&&g.point?g.current.clone().sub(g.point):new T.Vector3();
      if(kind==='handwash'&&g.wash){
        hoverRing.visible=false;
        var wash=g.wash,washResult=window.KitchenStudioWash.finish(wash),rinsing=wash.phase==='rinse'||wash.phase==='ready',ready=wash.phase==='ready';
        renderer.domElement.dataset.washPhase=wash.phase;renderer.domElement.dataset.washPasses=String(wash.passes);renderer.domElement.dataset.washPreview='true';
        placementHint.hidden=false;placementHint.dataset.ready=String(ready);
        $('studioPlacementTitle').textContent=wash.invalid?'Handwash preview · start again':ready?'Handwash preview · release under water':rinsing?'Handwash preview · rinse':'Handwash preview · scrub '+wash.passes+' of 3';
        $('studioPlacementDetail').textContent=washResult.message;
        if(!wash.invalid){
          var sway=Math.max(-1,Math.min(1,(wash.current.x-wash.start.x)/wash.unit/30));
          if(rinsing){washingHands.position.add(delta);if(ready)washingHands.position.set(0,1.67,-.19);}
          else{washingHands.rotation.y=sway*.18;washPalms[0].position.x+=sway*.045;washPalms[1].position.x-=sway*.045;soapPump.scale.y=.65;}
          var foamCount=rinsing?ready?3:7:Math.min(12,3+wash.passes*3);washLather.forEach(function(o,i){o.visible=i<foamCount;});
          renderer.domElement.dataset.handLather=String(foamCount);
          waterStream.visible=rinsing;renderer.domElement.dataset.waterFlow=String(rinsing);
          if(rinsing){targetRing.visible=true;targetRing.scale.setScalar(.6);targetRing.position.copy(destinations.washWater);targetRing.material.color.set(ready?'#246b57':'#537d85');}
        }
      }
      if((kind==='mat'||kind==='spatula')&&g.interactive){placementHint.hidden=false;var ready=!!(g.destination&&g.destination.action);placementHint.dataset.ready=String(ready);$('studioPlacementTitle').textContent=ready?'Preview · ready to place':'Preview · choose a position';$('studioPlacementDetail').textContent=g.destination?g.destination.message:kind==='mat'?'Move the folded mat under the board.':'Outer ring: spread · centre: gather';}
      if((kind==='store'||kind==='label')&&g.interactive){
        var storageReady=!!(g.destination&&g.destination.action);
        placementHint.hidden=false;placementHint.dataset.ready=String(storageReady);
        $('studioPlacementTitle').textContent=storageReady?'Storage preview · release to place':'Storage preview · choose a destination';
        $('studioPlacementDetail').textContent=g.destination?g.destination.message:g.hit.hint;
        if(kind==='label')renderer.domElement.dataset.storagePreview=storageReady?'container':'';
      }
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
      if(kind==='stir'&&g.stir){
        highlight(null);spatula.position.add(delta);spatula.position.y+=.15;
        var stirResult=window.KitchenStudioStir.finish(g.stir),stirProgress=window.KitchenStudioStir.progress(g.stir);
        placementHint.hidden=false;placementHint.dataset.ready=String(stirResult.complete);
        $('studioPlacementTitle').textContent=stirResult.complete?'Stir preview · ready':'Stir preview · '+Math.round(stirProgress*100)+'%';
        $('studioPlacementDetail').textContent=stirResult.message;
        if(g.stir.phase!=='carry'&&!g.stir.invalid&&g.current){
          var localX=g.current.x-.1,localZ=g.current.z+.85;
          spatula.position.set(g.current.x-groups.heat.position.x,1.72,g.current.z-groups.heat.position.z);
          spatula.rotation.set(-.18,Math.atan2(localX,localZ),0);
          var stirBase=mushrooms.map(function(m,i){var angle=mushroomAngle(i)+g.stir.travel*.2,radius=g.source.values.spread?.29:.14;return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius};});
          var stirFood=window.KitchenStudioStirContact.layout(stirBase,g.stir.current,g.stir.travel);
          mushrooms.forEach(function(m,i){
            var contact=stirFood[i]||stirBase[i];m.position.x=contact.x;m.position.z=contact.z;
            stems[i].position.x=droplets[i].position.x=m.position.x;stems[i].position.z=droplets[i].position.z=m.position.z;
          });
        }
      }
      if(kind==='cut'&&trace){
        hoverRing.visible=false;
        var cutResult=window.KitchenStudioGestures.finish(trace);placementHint.hidden=false;placementHint.dataset.ready=String(cutResult.complete);
        $('studioPlacementTitle').textContent=trace.invalid?'Knife preview · start again':trace.phase==='ready'?'Knife preview · release to cut':trace.phase==='up'?'Knife preview · lift back':'Knife preview · move down';
        $('studioPlacementDetail').textContent=cutResult.complete?'Release to record one '+(trace.action==='largeDice'?'large':'small')+' dice decision.':cutResult.message;
      }
      if(kind==='cut'){
        var depth=trace?trace.depth:0,rockAngle=window.KitchenStudioKnifeRock.angle(depth);
        if(rockAngle>0){
          var knifePivot=new T.Vector3(-.22,-.0175,0).multiply(knife.scale).applyQuaternion(knife.quaternion).add(knife.position),knifeAxis=new T.Vector3(0,0,1).applyQuaternion(knife.quaternion),knifeRock=new T.Quaternion().setFromAxisAngle(knifeAxis,rockAngle);
          g.hit.objects.forEach(function(o){o.position.sub(knifePivot).applyQuaternion(knifeRock).add(knifePivot);o.quaternion.premultiply(knifeRock);});
        }
        g.hit.objects.forEach(function(o){o.position.y+=.13-depth*.19;o.position.z+=Math.min(1,depth*1.8)*.24;});if(g.source.values.secure&&g.source.values.claw&&trace){var count=trace.cutReached?12:Math.max(0,Math.floor((depth-.45)/.55*12));renderer.domElement.dataset.cutPreview=String(count);if(count){whole.visible=count<12;whole.scale.y=Math.max(.05,1-count/12);whole.position.x=-.31*count/12;dice.forEach(function(d,i){d.visible=i<count;d.scale.setScalar(trace.action==='largeDice'?1.65:1);});}}}
      if(kind==='grip'&&trace)poseHand(trace.curl);
      if(kind==='pour'&&trace){var amount=Math.max(0,Math.min(1000,(g.source.values.ml||0)+trace.delta)),lift=.06*Math.min(1,trace.travel/30);showMeasureAmount(amount,true);if(!measureInspection)g.hit.objects.forEach(function(o){o.position.y+=lift;});}
      if(kind==='stock'){
        var pouring=!!(g.destination&&g.destination.action),amount=Math.min(1000,(g.source.values.ml||0)+(pouring?150:0));
        if(pouring){stockCarton.position.set(-.38,2.24,0);stockCarton.rotation.z=-.95;}else{stockCarton.position.add(delta);stockCarton.position.y+=.20;}
        showMeasureAmount(amount,true);targetRing.visible=true;targetRing.position.copy(destinations.jugFill);targetRing.material.color.set(pouring?'#246b57':'#956017');
        drawStockStream(amount,pouring&&amount>(g.source.values.ml||0));
      }
      if(kind==='tipPour'&&g.pour){
        var pour=g.pour,base=g.source.values.ml||0,amount=Math.min(1000,base+(pour.tipped&&!pour.invalid?50:0)),anchored=!!pour.anchor&&!pour.invalid;
        if(anchored){stockCarton.position.set(-.38,2.24,0);stockCarton.rotation.z=-.95*pour.tilt;}else{stockCarton.position.add(delta);stockCarton.position.y+=.2;}
        showMeasureAmount(amount,true);targetRing.visible=true;targetRing.position.copy(destinations.jugFill);targetRing.material.color.set(anchored?'#246b57':'#956017');hoverRing.visible=false;
        drawStockStream(amount,anchored&&pour.tilt>.4&&base<1000,pour.tilt);
        placementHint.hidden=false;placementHint.dataset.ready=String(pour.phase==='ready');
        $('studioPlacementTitle').textContent=pour.invalid?'Pour preview · start again':pour.phase==='ready'?'Pour preview · upright':pour.tipped?'Pour preview · return upright':anchored?'Pour preview · tip the carton':'Pour preview · aim over the jug';
        var instruction=pourInstruction(pour,base);
        $('studioPlacementDetail').textContent=instruction;
      }
      if(kind==='dial'&&trace){
        hoverRing.visible=false;
        var readyToSet=trace.phase==='ready'&&!trace.invalid;
        var initial=['low','medium','high'].indexOf(g.source.values.heat)+1;
        var position=trace.turn&&!trace.invalid?trace.turn.position:readyToSet?trace.level:initial;
        var selectedLevel=readyToSet?trace.level:initial,candidate=dials.levels[selectedLevel];
        dialGrip.rotation.y=-dials.angle(position);
        renderer.domElement.dataset.dialPreview=candidate.toLowerCase();
        placementHint.hidden=false;placementHint.dataset.ready=String(readyToSet);
        $('studioPlacementTitle').textContent='Burner dial · '+candidate;
        $('studioPlacementDetail').textContent=window.KitchenStudioGestures.finish(trace).message;
        var scale=$('studioDialScale');scale.hidden=false;
        Array.from(scale.children).forEach(function(mark,index){mark.classList.toggle('selected',index===selectedLevel);});
      }
      if(kind==='dry'&&trace){var offset=Math.max(-.25,Math.min(.25,(trace.current.x-trace.start.x)/trace.unit/160));[towel,towelFold].forEach(function(o,i){o.position.set(offset,1.74+i*.024,i*.035);o.rotation.y=offset*.4;});droplets.forEach(function(d,i){d.visible=!g.source.values.dry&&i>=Math.floor(trace.passes*8/3);});}
      if(kind==='tipPlate'&&g.plating){
        timerBadge.sprite.visible=false;
        var transferTrace=g.plating,anchored=!!transferTrace.anchor&&!transferTrace.invalid,angle=anchored?transferTrace.tilt*.95:0;
        var result=window.KitchenStudioPlating.finish(transferTrace),transfer=anchored?(transferTrace.tipped?1:Math.max(0,Math.min(1,(transferTrace.tilt-.35)/.65))):0;
        placementHint.hidden=false;placementHint.dataset.ready=String(result.complete);$('studioPlacementTitle').textContent=transferTrace.invalid?'Pan preview · start again':result.complete?'Pan preview · release to plate':transferTrace.tipped?'Pan preview · return level':'Pan preview · aim and tip';$('studioPlacementDetail').textContent=result.message;
        highlight(null);renderer.domElement.dataset.platingPreview='true';renderer.domElement.dataset.platingTransfer=String(transfer);renderer.domElement.dataset.panPreviewAngle=String(angle);
        targetRing.visible=true;targetRing.position.copy(destinations.servingPlate);targetRing.material.color.set(result.complete?'#246b57':'#956017');
        if(!anchored){if(!transferTrace.invalid)g.original.forEach(function(saved){saved.object.position.add(delta);saved.object.position.y+=.16;});}
        else{
          var pivot=new T.Vector3(0,1.53,0),base=new T.Vector3(0,1.93,.63),axis=new T.Vector3(1,0,0),rotation=new T.Quaternion().setFromAxisAngle(axis,angle),landed=0;
          function source(object){return g.original.find(function(saved){return saved.object===object;});}
          [panBowl,panHandle].forEach(function(object){var saved=source(object);object.position.copy(saved.position).sub(pivot).applyQuaternion(rotation).add(base);object.quaternion.copy(rotation).multiply(new T.Quaternion().setFromEuler(saved.rotation));});
          mushrooms.forEach(function(cap,i){
            var fraction=transferTrace.tipped?1:Math.max(0,Math.min(1,transfer*1.45-i*.45/7));if(fraction===1)landed++;
            [cap,stems[i],droplets[i]].forEach(function(object,index){
              var saved=source(object),start=saved.position.clone().sub(pivot).applyQuaternion(rotation).add(base);
              var rim=new T.Vector3(saved.position.x*.65,index===0?.10:index===1?.045:.145,.40).applyQuaternion(rotation).add(base);
              var destination=new T.Vector3(saved.position.x,index===0?1.49:index===1?1.435:1.535,saved.position.z+.83);
              object.position.copy(fraction<.5?start.lerp(rim,fraction*2):rim.lerp(destination,(fraction-.5)*2));
              object.quaternion.setFromAxisAngle(axis,angle*(1-fraction)).multiply(new T.Quaternion().setFromEuler(saved.rotation));
              if(index===2)object.visible=saved.visible&&fraction<.8;
            });
          });renderer.domElement.dataset.platingFoodCount=String(landed);
        }
      }
      if(kind==='plate'){g.original.forEach(function(o){o.object.position.add(delta);o.object.position.y+=.16;});targetRing.visible=true;targetRing.position.copy(destinations.servingPlate);targetRing.material.color.set(g.destination&&g.destination.action?'#246b57':'#956017');}
      if(kind==='chicken'){
        var target=g.destination&&g.destination.target;
        if(target==='oven')delta.set(0,-.57,.82);else if(target==='serve')delta.set(.34,.005,1.02);else delta.y+=.12;
        [chickenPlate,chicken].forEach(function(o){o.position.add(delta);});poseProbe(null,true);if(g.interactive&&g.moved>=8){probeBadge.write('PREVIEW','PLACE THEN READ');renderer.domElement.dataset.probeBadge='preview';showProbeTargets(null,false);var chickenPreview='Chicken movement preview. Release over the oven or serving board. Take a fresh reading after cooking.';if($('studioProbeReadout').textContent!==chickenPreview)$('studioProbeReadout').textContent=chickenPreview;$('studioProbeRead').disabled=true;}
        poseOven(target==='oven'?1:ovenPreference?1:0,target==='oven');renderer.domElement.dataset.platterTarget=target||'';
        ovenOutline.visible=true;ovenOutline.material.color.set(target==='oven'?'#246b57':'#956017');targetRing.visible=true;targetRing.position.copy(destinations.serveDrop);targetRing.material.color.set(target==='serve'?'#246b57':'#956017');
      }
      if(kind==='insertProbe'&&g.insertion&&g.interactive){
        hoverRing.visible=false;probeView.preview(g.insertion.invalid?(probeShownValues.probe==='thick'?1:0):g.insertion.depth);
        var insertionResult=window.KitchenStudioProbeDepth.finish(g.insertion);placementHint.hidden=false;placementHint.dataset.ready=String(insertionResult.complete);
        $('studioPlacementTitle').textContent=g.insertion.invalid?'Probe preview · start again':insertionResult.complete?'Probe preview · release to place':'Probe preview · choose a marker';$('studioPlacementDetail').textContent=insertionResult.message;
      }
      if(kind==='probe'&&g.interactive){
        var candidate=g.destination&&g.destination.action,moving=g.moved>=8;
        if(candidate)poseProbe(candidate,false);else{[probe,display].forEach(function(o){o.position.add(delta);o.position.y+=.08;});updateProbeTip();}
        showProbeTargets(candidate,true);hoverRing.visible=false;applyProbeCutaway(moving);
        placementHint.hidden=false;placementHint.dataset.ready=String(!!candidate);
        $('studioPlacementTitle').textContent=candidate==='thick'?'Probe preview · centre':candidate==='surface'?'Probe preview · surface':'Probe preview · choose a position';
        $('studioPlacementDetail').textContent=(g.destination?g.destination.message:'Carry the thermometer over the chicken.')+' Take a fresh reading after placing.';
        if(moving){
          probeBadge.write('PREVIEW','PLACE THEN READ');renderer.domElement.dataset.probeBadge='preview';renderer.domElement.dataset.probePreview=candidate||'carry';
          var previewText='Placement preview. '+(candidate==='thick'?'Tip at the centre.':candidate==='surface'?'Tip at the surface.':'Carry the probe over the chicken.')+(candidate?' Release to place, then take a fresh reading.':' Move onto a target, or press Escape to cancel.');
          if($('studioProbeReadout').textContent!==previewText)$('studioProbeReadout').textContent=previewText;$('studioProbeRead').disabled=true;
        }
      }
      if(kind==='label'){g.hit.objects.forEach(function(o){o.position.add(delta);o.position.y+=.08;});targetRing.visible=true;targetRing.position.copy(destinations.containerTarget);targetRing.material.color.set(g.destination&&g.destination.action?'#246b57':'#956017');}
      if(kind==='prepare'){g.hit.objects.forEach(function(o){o.position.add(delta);o.position.y+=.08;});targetRing.visible=true;targetRing.position.copy(destinations.prepBoardTarget);targetRing.material.color.set(g.destination&&g.destination.action?'#246b57':'#956017');}
      if(kind==='store'){
        var target=g.destination&&g.destination.target,ready=!!(g.destination&&g.destination.action);
        if(ready)highlight(null);
        if(ready&&target==='fridge')placeContainers(g.source.values,true);
        else if(ready&&target==='shallowTray')placeContainers(Object.assign({},g.source.values,{shallow:true}),false);
        else g.hit.objects.forEach(function(o){o.position.add(delta);o.position.y+=.08;});
        Object.keys(storageRings).forEach(function(id){var ring=storageRings[id];ring.visible=true;ring.material.color.set(ready&&target===id?'#246b57':'#956017');});
        poseFridge(ready&&target==='fridge'?1:fridgeIsOpen()?1:0);
        renderer.domElement.dataset.storagePreview=ready?target:'';
      }
      if(kind==='lid'&&g.lid){hoverRing.visible=false;poseLids(g.lid.invalid?(lidPreference?1:0):g.lid.opening,true);placementHint.hidden=false;placementHint.dataset.ready=String(window.KitchenStudioLid.finish(g.lid).complete);$('studioPlacementTitle').textContent='Lid preview';$('studioPlacementDetail').textContent=window.KitchenStudioLid.finish(g.lid).message;}
      if(kind==='ovenDoor'&&g.ovenDoor){hoverRing.visible=false;poseOven(g.ovenDoor.invalid?(ovenPreference?1:0):g.ovenDoor.opening,true);}
      if(kind==='door'&&trace){poseFridge(trace.opening);hoverRing.visible=false;}

      if(kind==='spread'){mushrooms.forEach(function(o,i){var radius=Math.min(.3,.14+delta.length()*.45);o.position.x=Math.cos(mushroomAngle(i))*radius;o.position.z=Math.sin(mushroomAngle(i))*radius;stems[i].position.x=droplets[i].position.x=o.position.x;stems[i].position.z=droplets[i].position.z=o.position.z;});}
      if(kind==='tap'){g.hit.objects.forEach(function(o){o.scale.y*=.92;});if(g.hit.id==='faucet'){waterStream.visible=true;renderer.domElement.dataset.waterFlow='true';}}
    }
    function sceneLocked(){var s=state();return textView||!!replayState||s.done||s.submitted||s.log.length>=500;}
    touch=window.KitchenStudioTouch.mount({canvas:renderer.domElement,orbit:controls,discover:function(info,hint,readOnly){discovered=info?{info:info,hint:hint,readOnly:readOnly}:null;if(!info&&discoveryView)discoveryView.clear();},feedback:function(signal){if(feedbackView)feedbackView.cue(signal);},getState:state,hidden:function(){return textView;},locked:sceneLocked,pick:pick,inputTool:inputTool,keyboardPoint:keyboardPoint,keyboardTargets:keyboardTargets,point:point,dialPoint:dialPoint,panMode:panMode,stirPoint:stirPoint,platingMode:platingMode,platingTarget:platingTarget,pourMode:pourMode,pourMouth:pourMouth,pourInstruction:pourInstruction,washWater:washWater,measureInspecting:function(){return measureInspection;},probeCloseup:function(){return probeDepthInspection;},ovenCloseup:function(){return ovenInspection;},ovenOpen:function(){return ovenPreference;},probeDepth:function(){return probeView.getDepth();},draw:draw,highlight:highlight,preview:preview,destination:destination,
      capture:function(hit){stopFeedback();var moving=hit.moving||hit.objects||[];if(hit.kind==='dry')moving=moving.concat(droplets);if(hit.kind==='tipPlate')moving=moving.concat(timerBadge.sprite);return moving.map(function(o){return {object:o,position:o.position.clone(),rotation:o.rotation.clone(),scale:o.scale.clone(),visible:o.visible};});},
      tools:function(id){return Object.keys(touchTargets).map(function(key){return touchTargets[key];}).filter(function(info){return info.station===id;});},
      available:function(id){if(panView&&panView.isDialFocused()&&id!=='dial')return false;if(ovenInspection&&id!=='ovenHandle')return false;if(probeDepthInspection&&id!=='probe')return false;if(containerInspection&&id!=='tub')return false;return !!touchTargets[id]&&touchTargets[id].objects.some(function(o){return o.visible;});},
      reveal:function(id){if(panView&&panView.isDialFocused()&&id!=='dial')return false;var info=touchTargets[id];if(!info||!info.objects.some(function(o){return o.visible;}))return false;if(!measureInspection&&!panInspection&&!boardInspection&&!containerInspection&&!probeDepthInspection&&!ovenInspection)focus();if(id==='tub'&&storageShownValues.chilled)setFridgeView(true);highlight(info);pulse(id,true);draw();return true;},
      inspect:function(){measureView.open();},dialCloseup:function(){return !!(panView&&panView.isDialFocused());},panCloseup:function(){return panInspection;},boardCloseup:function(){return boardInspection;},containerCloseup:function(){return containerInspection;},lidsOpen:function(){return lidPreference;},interactionMode:function(enabled){if(!enabled){if(ovenView)ovenView.close();if(panView)panView.close();if(boardView)boardView.close();if(containerView)containerView.close();if(probeView)probeView.close();}},fridgeOpen:fridgeIsOpen,view:function(result){if(result.view==='oven')setOvenView(result.open);if(result.view==='fridge')setFridgeView(result.open);if(result.view==='lids'){lidPreference=!!result.open;poseLids(lidPreference?1:0,false);draw();}},
      select:function(id){if(serviceActive){$('studioTouchStatus').textContent='Pause the meal rehearsal before exploring another station.';return;}select(id,false);},act:function(action){act(action,true);}
    });
    measureView=window.KitchenStudioMeasureView.mount({
      THREE:T,camera:camera,controls:controls,canvas:renderer.domElement,guide:measureGuide,
      origin:{x:2.4,z:1.05},getAmount:function(){return measureShownMl;},getLocked:sceneLocked,
      cancel:function(){touch.cancel('Movement cancelled for jug inspection.');},draw:draw,onViewChange:setMeasureInspection,
      check:function(){act('check',true);}
    });
    panView=window.KitchenStudioPanView.mount({
      THREE:T,camera:camera,controls:controls,canvas:renderer.domElement,
      getDialFrame:function(){var points=[];[dialCap.y-.12,dialCap.y+.075].forEach(function(y){for(var i=0;i<16;i++){var angle=i*Math.PI/8;points.push(new T.Vector3(dialCap.x+Math.sin(angle)*.31,y,dialCap.z+Math.cos(angle)*.31));}});return {target:dialCap.clone(),points:points};},
      cancel:function(){touch.cancel('Movement cancelled for a pan view change.');},draw:draw,onViewChange:setPanInspection,onModeChange:function(){refreshDialContext();touch.update();draw();}
    });
    boardView=window.KitchenStudioBoardView.mount({
      THREE:T,camera:camera,controls:controls,canvas:renderer.domElement,
      cancel:function(){touch.cancel('Movement cancelled for a board view change.');},draw:draw,onViewChange:setBoardInspection
    });
    containerView=window.KitchenStudioContainerView.mount({
      THREE:T,camera:camera,controls:controls,canvas:renderer.domElement,getFrame:containerFrame,
      cancel:function(){touch.cancel('Movement cancelled for container inspection.');},draw:draw,onViewChange:setContainerInspection
    });
    probeView=window.KitchenStudioProbeView.mount({
      THREE:T,camera:camera,controls:controls,canvas:renderer.domElement,
      cancel:function(){if(ovenView)ovenView.close();touch.cancel('Movement cancelled for probe inspection.');},draw:draw,onViewChange:setProbeDepthInspection,onDepthPreview:showProbeDepth,
      place:function(action){if(current!=='probe'||sceneLocked()||!probeDepthInspection||(action!=='thick'&&action!=='surface'))return;touch.cancel('Depth preview placed.');act(action,true);}
    });
    ovenView=window.KitchenStudioOvenView.mount({
      THREE:T,camera:camera,controls:controls,canvas:renderer.domElement,getFrame:ovenFrame,
      beforeOpen:function(){probeView.close();containerView.close();boardView.close();panView.close();measureView.close();},
      cancel:function(){touch.cancel('Movement cancelled for oven inspection.');},draw:draw,onViewChange:setOvenInspection
    });
    $('studioOvenToggle').addEventListener('click',function(){if(current!=='probe'||textView||probeDepthInspection)return;touch.cancel('Oven movement cancelled.');setOvenView(!ovenPreference);$('studioTouchStatus').textContent=ovenPreference?'Oven opened. Explore the shelf.':'Oven closed.';});
    keyboardView=window.KitchenStudioKeyboard.mount({canvas:renderer.domElement,adapter:touch,onPrecisionChange:renderDropTargets});
    feedbackView=window.KitchenStudioFeedback.mount({canvas:renderer.domElement});
    rubGuide=window.KitchenStudioRubGuide.mount({canvas:renderer.domElement});
    discoveryView=window.KitchenStudioDiscovery.mount({canvas:renderer.domElement});
    dropView=window.KitchenStudioDropTargets.mount({canvas:renderer.domElement,avoidElements:[$('studioPlacementHint'),$('studioCarryNotice'),$('studioKeyboardLabel'),$('studioKeyboardCursor'),$('stationLens')]});
    stopDropUpdates=touch.subscribeKeyboard(renderDropTargets);
    $('studioLidToggle').addEventListener('click',function(){if(!containerInspection||textView||storageShownValues.discarded)return;touch.cancel('Lid movement cancelled.');lidPreference=!lidPreference;poseLids(lidPreference?1:0,false);draw();});
    $('studioWashStep').addEventListener('click',function(){if(current!=='prep'||sceneLocked())return;touch.cancel('Movement cancelled for a full handwashing rehearsal.');act('wash',true);});
    $('studioPortionPour').addEventListener('click',function(){setPourMode('portion');});
    $('studioControlledPour').addEventListener('click',function(){setPourMode('controlled');});
    $('studioPourStep').addEventListener('click',function(){if(current!=='measure'||sceneLocked()||pourMode()!=='controlled')return;touch.cancel('Movement cancelled for a measured pour.');act('add50',true);});
    $('studioProbeCutaway').addEventListener('click',function(){if(current!=='probe'||textView||probeDepthInspection)return;touch.cancel('Movement cancelled to inspect probe placement.');probeCutaway=!probeCutaway;refreshProbeConsole();draw();renderer.domElement.scrollIntoView({block:'center',behavior:'auto'});});
    $('studioProbeRead').addEventListener('click',function(){if(current!=='probe'||sceneLocked()||!probeShownValues.probe||probeServed||(probeView&&probeView.isPreviewing()))return;touch.cancel('Movement cancelled for a fresh thermometer reading.');act('read',true);});
    $('studioQuickPlate').addEventListener('click',function(){setPlatingMode('quick');});
    $('studioControlledPlate').addEventListener('click',function(){setPlatingMode('controlled');});
    $('studioPlatingStep').addEventListener('click',function(){if(current!=='heat'||sceneLocked()||platingMode()!=='controlled')return;touch.cancel('Pan transfer cancelled for the plating step.');act('plate',true);});
    $('studioArrangeMode').addEventListener('click',function(){setPanMode('arrange');});
    $('studioStirMode').addEventListener('click',function(){setPanMode('stir');});
    $('studioStirStep').addEventListener('click',function(){
      if(sceneLocked()||current!=='heat'||panMode()!=='stir')return;
      touch.cancel('Movement cancelled for a stirring step.');act('advance',true);
    });
    $('studioFridgeToggle').addEventListener('click',function(){
      if(containerInspection)return;
      touch.cancel('Movement cancelled to use the refrigerator door.');
      setFridgeView(!fridgeIsOpen());
      $('studioTouchStatus').textContent=fridgeIsOpen()?'Refrigerator opened. Inspect the shelves.':'Refrigerator closed.';
    });
    renderer.domElement.addEventListener('webglcontextlost',function(e){e.preventDefault();touch.cancel();textView=true;$('sceneStatus').textContent='3D interrupted. Continue using the text controls.';applyView();});
    function update(s){stopFeedback();if(feedbackView)feedbackView.update({visible:!textView});if(touch)touch.update();if(ovenView)ovenView.update({active:s.id==='probe',visible:!textView,revision:s});if(s!==ovenRevision){ovenPreference=false;ovenRevision=s;}if(containerView&&containerInspection&&s!==containerRevision)containerView.close();shownContainerRevision=s;if(boardView)boardView.update({active:s.id==='knife',visible:!textView,values:s.id==='knife'?s.values:{},historical:!!replayState,revision:s});if(panView)panView.update({active:s.id==='heat',visible:!textView,locked:sceneLocked(),values:s.id==='heat'?s.values:{},historical:!!replayState,plated:!!s.done,plating:platingMode()==='controlled'&&!sceneLocked(),revision:s});var picture=Object.assign({},sceneStates());picture[s.id]=s;if(focused&&focusedStation!==s.id)focus();var v=s.values,g=groups[s.id];selection.position.set(g.position.x,1.355,g.position.z);var prep=picture.prep?picture.prep.values:{},kv=picture.knife?picture.knife.values:{};bubbles.forEach(function(b){b.visible=!!prep.washed;});water.material.color.set(prep.washed?'#9fdbc8':'#83b8c2');cleanBoard.material.color.set(prep.clean?'#79a47f':'#b77e58');matBoard.material.color.set('#436e58');matBoard.visible=!!kv.secure;foldedMat.visible=!kv.secure;matParts.forEach(function(part){part.visible=!kv.secure;});renderer.domElement.dataset.matSecured=String(!!kv.secure);renderer.domElement.dataset.matPreview='false';renderer.domElement.dataset.spatulaPreview='';whole.visible=!kv.cut;whole.scale.set(1,1,1);whole.position.x=0;dice.forEach(function(d,i){d.visible=!!kv.cut;d.scale.setScalar(kv.cut==='large'?1.65:kv.cut==='uneven'?(i%3+1)*.65:1);});knife.rotation.y=kv.claw?.18:0;poseHand(kv.claw?1:0);renderer.domElement.dataset.cutPreview='0';
      washLather.forEach(function(o){o.visible=false;});renderer.domElement.dataset.washPhase='idle';renderer.domElement.dataset.washPasses='0';renderer.domElement.dataset.washPreview='false';renderer.domElement.dataset.handLather='0';renderer.domElement.dataset.waterFlow='false';sanitizer.visible=sanitizerPump.visible=!!(picture.prep&&picture.prep.scenario==='shared-board');waterStream.visible=false;var prepared=!!(picture.prep&&picture.prep.done);prepVegetables.forEach(function(v,i){v.position.set(prepared?-.65+(i%2)*.14:.23+(i%2)*.14,1.53,prepared?.18+Math.floor(i/2)*.12:.57+Math.floor(i/2)*.12);});touchTargets.vegetableBasket.anchor=prepared?prepVegetables[0]:vegetableBasket;
      var heat=picture.heat?picture.heat.values:{},plated=!!(picture.heat&&picture.heat.done);burner.material.color.set(heat.heat==='high'?'#e67c33':heat.heat==='medium'?'#b8864b':'#5c665b');mushrooms.forEach(function(m,i){m.material.color.set(heat.brown>4?'#4a3429':heat.brown>=3?'#a66a2c':heat.brown>0?'#c79854':'#e6cfa7');m.position.x=Math.cos(mushroomAngle(i))*(heat.spread?.29:.14);m.position.z=Math.sin(mushroomAngle(i))*(heat.spread?.29:.14)+(plated?.83:0);m.position.y=plated?1.49:1.645;stems[i].position.y=plated?1.435:1.59;stems[i].position.x=droplets[i].position.x=m.position.x;stems[i].position.z=droplets[i].position.z=m.position.z;droplets[i].visible=!heat.dry&&!plated;});
      timerBadge.write('+30 s','SIM · '+(heat.seconds||0)+'s');
      var heatLevel=['low','medium','high'].indexOf(heat.heat)+1;
      dialGrip.rotation.y=-dials.angle(heatLevel);
      renderer.domElement.dataset.dialHeat=dials.levels[heatLevel].toLowerCase();
      renderer.domElement.dataset.dialPreview='';
      var pv=picture.probe?picture.probe.values:{},served=!!(picture.probe&&picture.probe.done),placed=!!pv.probe&&!served;
      chickenPlate.position.set(served?.34:0,served?1.395:1.39,served?1.02:0);chicken.position.set(served?.34:0,served?1.565:1.56,served?1.02:0);
      probeShownValues=pv;probeServed=served;probeHistorical=!!replayState;if(s.id!=='probe')probeCutaway=false;probe.visible=display.visible=true;poseProbe(pv.probe,served);
      poseOven(ovenPreference?1:0,false);renderer.domElement.dataset.platterTarget='';ovenOutline.visible=false;
      if(probeView)probeView.update({active:s.id==='probe',visible:!textView,available:!served,locked:sceneLocked(),historical:!!replayState,values:pv,revision:s});
      renderer.domElement.dataset.probeReading=pv.reading==null?'—':String(pv.reading);writeProbeBadge();renderer.domElement.dataset.probePreview='';refreshProbeConsole();
      measureShownMl=picture.measure?(picture.measure.values.ml||0):0;showMeasureAmount(measureShownMl,false);renderer.domElement.dataset.measureMl=String(measureShownMl);resetStockStream();
      var cv=picture.chill?picture.chill.values:{},storagePicture=picture.chill;
      var nextStorageKey=[storagePicture&&storagePicture.scenario,!!cv.chilled,!!cv.discarded,s.id==='chill',replayState?'replay-'+s.log.length:'live'].join('|');
      var nextStorageLog=storagePicture?storagePicture.log.length:0;
      if(nextStorageKey!==storageViewKey||nextStorageLog<storageLogLength){
        if(touch)touch.cancel('Storage view changed. Movement cancelled.');
        doorPreference=null;
      }
      storageViewKey=nextStorageKey;storageLogLength=nextStorageLog;storageShownValues=cv;
      placeContainers(cv,!!cv.chilled);poseFridge(fridgeIsOpen()?1:0);poseLids(lidPreference?1:0,false);if(containerView)containerView.update({active:s.id==='chill',visible:!textView,available:!cv.discarded,revision:s});
      renderer.domElement.dataset.storageLocation=cv.discarded?'discarded':cv.chilled?'fridge':'counter';
      renderer.domElement.dataset.storagePreview='';
      [water,cleanBoard,matBoard,burner].concat(mushrooms).forEach(function(o){o.material.color.convertSRGBToLinear();});
      if(measureView)measureView.update({active:s.id==='measure',visible:!textView,locked:sceneLocked(),historical:!!replayState});
      selection.visible=s.id!=='chill'&&!measureInspection&&!panInspection&&!boardInspection&&!containerInspection&&!probeDepthInspection&&!ovenInspection;renderStirGuide(null);renderPourGuide(null);renderPlatingGuide(null);renderCutGuide(null);renderRubGuide(null);
      if(ovenInspection)ovenDecorations.forEach(function(saved){saved.object.visible=false;});if(touch)touch.update();draw();}
    var observer=new ResizeObserver(resize);observer.observe(host);reset();focus();
    function quietFeedback(){stopFeedback();draw();}
    function visibilityFeedback(){if(document.hidden)quietFeedback();}
    window.addEventListener('blur',quietFeedback);document.addEventListener('visibilitychange',visibilityFeedback);if(motionPreference.addEventListener)motionPreference.addEventListener('change',quietFeedback);
    window.addEventListener('pagehide',function(e){stopFeedback();if(e.persisted)return;if(stopDropUpdates)stopDropUpdates();dropView.dispose();discoveryView.dispose();rubGuide.dispose();feedbackView.dispose();keyboardView.dispose();ovenView.dispose();probeView.dispose();containerView.dispose();boardView.dispose();panView.dispose();measureView.dispose();touch.dispose();window.removeEventListener('blur',quietFeedback);document.removeEventListener('visibilitychange',visibilityFeedback);if(motionPreference.removeEventListener)motionPreference.removeEventListener('change',quietFeedback);observer.disconnect();controls.dispose();meshes.forEach(function(m){m.geometry.dispose();});materials.forEach(function(m){if(m.map)m.map.dispose();m.dispose();});selection.material.dispose();renderer.dispose();});
    function focus(){if(ovenView)ovenView.close();if(probeView)probeView.close();if(containerView)containerView.close();if(boardView)boardView.close();if(panView)panView.close();if(measureView)measureView.close();if(touch)touch.cancel('View changed. No action recorded.');focused=true;focusedStation=current;stationLabels.forEach(function(s){s.visible=false;});stationBadges.forEach(function(s){s.visible=s.userData.mission===current;});$('focusView').setAttribute('aria-pressed','true');var g=groups[current],isProbe=current==='probe',isPrep=current==='prep',isPour=current==='measure'&&pourMode()==='controlled',z=g.position.z+(current==='chill'?.9:isProbe?.35:isPrep?.08:0);controls.target.set(g.position.x,isProbe?1.25:isPrep?1.6:isPour?1.75:1.45,z);camera.position.set(g.position.x+(isProbe?-.7:isPrep?.65:current==='chill'?.7:1.7),isProbe?3.4:isPrep?3.1:isPour?3.95:3.65,z+(isProbe?3.8:isPrep?2.3:3.1));controls.update();draw();}
    function rotate(angle){if(ovenView)ovenView.close();if(probeView)probeView.close();if(containerView)containerView.close();if(boardView)boardView.close();if(panView)panView.close();if(measureView)measureView.close();if(touch)touch.cancel('View changed. No action recorded.');var offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new T.Vector3(0,1,0),angle);camera.position.copy(controls.target).add(offset);controls.update();draw();}
    return {update:update,resize:resize,reset:reset,focus:focus,rotate:rotate,respond:respond,interactionView:function(){if(textView)stopFeedback();feedbackView.update({visible:!textView});ovenView.update({visible:!textView});measureView.update({visible:!textView});panView.update({visible:!textView});boardView.update({visible:!textView});containerView.update({visible:!textView});probeView.update({visible:!textView});if(textView)probeCutaway=false;refreshProbeConsole();renderStirGuide(null);renderPourGuide(null);renderPlatingGuide(null);renderCutGuide(null);renderRubGuide(null);$('stationLens').hidden=textView||measureInspection||panInspection||boardInspection||containerInspection||probeDepthInspection||ovenInspection;touch.update();}};
  }
  try { sceneAPI=initScene(); } catch(e) { console.warn('Kitchen Studio 3D unavailable:',e);$('sceneStatus').textContent='3D is unavailable on this device. All practice actions work in text view.'; $('viewToggle').disabled=true; }
  if(serviceActive)$('serviceCard').open=true;
  render(true); save();
})();
