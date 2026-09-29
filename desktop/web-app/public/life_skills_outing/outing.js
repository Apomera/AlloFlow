(function () {
  'use strict';
  var E = window.AlloOutingEngine;
  var byId = function (id) { return document.getElementById(id); };
  var text = function (id, value) { byId(id).textContent = value || ''; };
  var storage;
  try { storage = window.localStorage; } catch (_) { storage = null; }
  if (!E) {
    text('feedback', 'The practice could not load. Reload this page to try again.');
    byId('sceneContainer').hidden = true;
    return;
  }
  var current, activeStation = 'kitchen', shownHint = false, sceneHidden = false;
  var selectedObject = null, hoveredObject = null, closeView = false, objectNodes = {};
  var originalEmissive = new WeakMap();
  var requestSerial = 0, pendingController = null, busy = false, selectedContentId = null;
  var contentNotice = '', sceneReady = false, textSerial = 0, eventSerial = 0, latestView;
  var ACTIVE_KEY = 'alloflow-life-outing-active:v1';
  var REFLECTION_PREFIX = 'alloflow-life-outing-reflection:v1:';
  var COMPARISON_PREFIX = 'alloflow-life-outing-comparison:v1:';
  var PLAN_PREFIX = 'alloflow-life-outing-plan:v1:';
  var plan = null;
  var rehearsalPreview = null;
  var exploredDeparture = null;
  var notes = Object.create(null), comparison = null, reviewRevision = null, importSerial = 0, lastSaveOk = false;
  var icons = { kitchen: '◒', wardrobe: '♧', entry: '▣', travel: '↗' };
  var supportNames = { guided: 'Guided', try: 'Try it', independent: 'Independent' };
  var client = window.AlloOutingAI ? window.AlloOutingAI.createClient({ onAvailability: function () { if (current) renderStory(); } }) : null;

  function node(tag, className, value) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function announce(value) { text('announcer', value); }
  function savedRuns() { try { return storage ? E.listRuns(storage) : []; } catch (_) { return []; } }
  function configToControls() {
    byId('contextSelect').value = current.config.context;
    byId('supportSelect').value = current.config.support;
    byId('languageSelect').value = current.config.language;
    byId('scenarioSelect').value = current.config.variation;
  }
  function refreshSaved() {
    var select = byId('savedRuns'), entries = savedRuns();
    select.replaceChildren();
    entries.forEach(function (entry) {
      var option = node('option');
      option.value = entry.key;
      if (entry.error || !entry.run) { option.textContent = 'Unreadable saved practice (preserved)'; option.disabled = true; }
      else {
        var run = entry.run, date = new Date(run.createdAt);
        option.textContent = (run.config.context === 'work' ? 'Work' : 'Community') + ' · ' + ({rain:'Rain',warm:'Warm','bus-delay':'Bus delay'})[run.config.variation] + ' · ' + run.commands.length + ' steps · ' + (isNaN(date.getTime()) ? run.runId : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
        if (run.runId === current.runId) option.selected = true;
      }
      select.appendChild(option);
    });
    if (!entries.length) { var empty = node('option', '', 'No saved practices yet'); empty.value = ''; select.appendChild(empty); }
    byId('resumeButton').disabled = !entries.some(function (entry) { return entry.run; });
  }
  function persist() {
    var result;
    try { result = storage ? E.saveRun(storage, current) : { ok: false, message: 'Device storage is unavailable.' }; }
    catch (_) { result = { ok: false, message: 'This practice could not be saved on this device.' }; }
    if (result.ok) {
      try { storage.setItem(ACTIVE_KEY, E.saveKey(current)); } catch (_) {}
      text('saveStatus', 'Saved on this device · ' + current.commands.length + ' practice steps');
      try {
        storage.setItem(REFLECTION_PREFIX + current.runId, byId('reflection').value.slice(0,600));
        if (comparison) storage.setItem(COMPARISON_PREFIX + current.runId, JSON.stringify(comparison));
        if (plan) storage.setItem(PLAN_PREFIX + current.runId, JSON.stringify(plan));
      } catch (_) { text('saveStatus', 'Practice steps saved. Download a backup to keep your plan, reflection and comparison.'); }
    } else {
      text('saveStatus', (result.message || 'This practice could not be saved.') + ' You can download a backup.');
    }
    lastSaveOk = result.ok;
    refreshSaved();
  }
  function abortStory() {
    requestSerial += 1;
    if (pendingController) pendingController.abort();
    pendingController = null;
    if (busy) contentNotice = 'Your practice changed, so the pending story was set aside.';
    busy = false;
  }
  function changeRun(run, extras) {
    abortStory();
    clearRehearsal(true);
    exploredDeparture = null;
    byId('travelLab').open = false;
    text('travelLabStatus', '');
    importSerial += 1;
    text('backupStatus', '');
    if (current) notes[current.runId] = { reflection: byId('reflection').value.slice(0,600), comparison: comparison, plan: plan };
    current = run;
    var savedNotes = extras || notes[run.runId];
    if (!savedNotes) {
      savedNotes = { reflection: '', comparison: null };
      try { savedNotes.reflection = storage && storage.getItem(REFLECTION_PREFIX + run.runId) || ''; } catch (_) {}
      try {
        var storedComparison = storage && storage.getItem(COMPARISON_PREFIX + run.runId);
        if (storedComparison && storedComparison.length <= 300000) savedNotes.comparison = E.validateComparison(run, JSON.parse(storedComparison));
      } catch (_) { text('backupStatus', 'The saved comparison could not be read. Your practice can still continue.'); }
      try {
        var storedPlan = storage && storage.getItem(PLAN_PREFIX + run.runId);
        if (storedPlan) {
          if (storedPlan.length > 10000) throw new Error('Invalid plan size');
          savedNotes.plan = E.validatePlan(run, JSON.parse(storedPlan));
        }
      } catch (_) { text('backupStatus', 'The saved plan could not be read. Your practice can still continue.'); }
    }
    comparison = savedNotes.comparison || null;
    plan = savedNotes.plan || null;
    text('planStatus', '');
    byId('planner').open = !!plan && plan.steps.length > 0 && !E.view(run).completed;
    reviewRevision = null;
    activeStation = 'kitchen';
    selectedObject = null; hoveredObject = null;
    shownHint = false;
    selectedContentId = null;
    contentNotice = '';
    configToControls();
    byId('reflection').value = savedNotes.reflection.slice(0,600);
    text('reflectionStatus', 'Optional. Saved on this device as you type.');
    render();
    persist();
    announce('Practice ready. ' + latestView.goal);
  }
  function selectStation(id, moveFocus) {
    if (!latestView.stations.some(function (s) { return s.id === id; })) return;
    clearRehearsal(true);
    activeStation = id;
    selectedObject = null;
    renderActions();
    if (moveFocus) byId('stationActions').focus({ preventScroll: true });
    announce(latestView.stations.find(function (s) { return s.id === id; }).label + '. Choose an action below.');
  }
  function selectObject(id, moveFocus) {
    var object = latestView.objects.find(function (item) { return item.id === id; });
    if (!object) return;
    clearRehearsal(true);
    selectedObject = id;
    activeStation = object.station;
    renderActions();
    if (moveFocus) byId('stationActions').focus();
    announce(object.label + '. ' + object.status + '. ' + object.description);
  }
  function act(id, source) {
    var focusedAction = document.activeElement && document.activeElement.dataset.action;
    var wasComplete = latestView.completed, oldEvent = latestView.event && latestView.event.title;
    try {
      var next = E.dispatch(current, id, current.commands.length, 'ui-' + Date.now().toString(36) + '-' + (++eventSerial));
      abortStory();
      clearRehearsal(true);
      exploredDeparture = null;
      current = next;
      if (id === 'hint') shownHint = true;
      render();
      persist();
      if (id === 'hint') byId('hintButton').focus({ preventScroll: true });
      else if (source !== 'scene' && focusedAction) {
        var exact = Array.from(byId('actionList').querySelectorAll('button')).find(function (button) { return button.dataset.action === focusedAction && !button.disabled; });
        var nextButton = byId('actionList').querySelector('button:not(:disabled)');
        (exact || nextButton || byId('stationActions')).focus({ preventScroll: true });
      }
      else if (source === 'rehearsal') (byId('actionList').querySelector('button:not(:disabled)') || byId('stationActions')).focus({preventScroll:true});
      if (!wasComplete && latestView.completed) {
        focusOutcome();
      } else if (latestView.event && latestView.event.title !== oldEvent) {
        announce(latestView.feedback + '. ' + latestView.event.title + '. ' + latestView.event.body);
      } else if (source === 'scene') announce(latestView.feedback);
    } catch (error) {
      text('feedback', error && error.message ? error.message : 'That action is not available. Choose another action.');
    }
  }
  function renderActions() {
    var v = latestView;
    var plannedNext = E.planView(current, plan).next;
    var station = v.stations.find(function (s) { return s.id === activeStation; }) || v.stations[0];
    activeStation = station.id;
    var nav = byId('stationNavigation');
    nav.replaceChildren();
    v.stations.forEach(function (item) {
      var button = node('button', 'station-tab');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(item.id === station.id));
      button.setAttribute('aria-controls', 'stationActions');
      var icon = node('span', 'station-icon', icons[item.id] || '·'); icon.setAttribute('aria-hidden', 'true');
      button.append(icon, node('span', '', item.label));
      button.addEventListener('click', function () { selectStation(item.id, true); });
      nav.appendChild(button);
    });
    text('stationTitle', station.label);
    text('stationDescription', station.description);
    byId('exploreTravel').hidden = station.id !== 'travel';
    text('stepTag', v.completed ? 'Practice complete' : 'Step ' + (current.commands.length + 1));
    var list = byId('actionList');
    list.replaceChildren();
    var object = v.objects.find(function (item) { return item.id === selectedObject; });
    var visibleActions = object ? v.stations.reduce(function (all, item) { return all.concat(item.actions); }, []).filter(function (action) { return object.actionIds.indexOf(action.id) >= 0; }) : station.actions;
    renderRehearsal(visibleActions);
    var choices = byId('objectChoices'); choices.replaceChildren();
    var allButton = node('button', 'object-chip', 'All actions'); allButton.type = 'button';
    allButton.setAttribute('aria-pressed', String(!object));
    allButton.addEventListener('click', function () { selectStation(station.id, true); });
    choices.appendChild(allButton);
    v.objects.filter(function (item) { return item.station === station.id; }).forEach(function (item) {
      var button = node('button', 'object-chip', item.label); button.type = 'button'; button.dataset.inspect = item.id;
      button.setAttribute('aria-pressed', String(item.id === selectedObject));
      button.addEventListener('click', function () { selectObject(item.id, true); }); choices.appendChild(button);
    });
    byId('objectInspector').hidden = !object;
    if (object) { text('objectTitle', object.label); text('objectStatus', object.status); text('objectDescription', object.description); }
    visibleActions.forEach(function (action) {
      var button = node('button', 'action-button');
      button.type = 'button';
      button.dataset.action = action.id;
      button.disabled = Boolean(action.disabled);
      var copy = node('span');
      copy.appendChild(node('span', 'action-name', action.label));
      if (plannedNext && plannedNext.actionId === action.id) {
        button.classList.add('planned-action'); copy.appendChild(node('span', 'planned-badge', 'Next in your plan'));
      }
      if (action.reason) copy.appendChild(node('span', 'action-reason', action.reason));
      var arrow = node('span', 'action-arrow', action.disabled ? '−' : '↗'); arrow.setAttribute('aria-hidden', 'true');
      button.append(copy, arrow);
      button.addEventListener('click', function () { act(action.id, 'button'); });
      list.appendChild(button);
    });
    if (!visibleActions.length) list.appendChild(node('p', 'muted', v.completed ? 'This practice is complete. Reflect below or try another outing.' : 'Choose another object or station to continue.'));
    text('sceneCaption', object ? object.label + ' · ' + object.status : station.label + ' · select an object to inspect it.');
    updateSceneActions(visibleActions);
    highlightObjects();
    if (closeView) fitScene();
  }
  function renderStory() {
    var entries = current.content || [];
    if (latestView && latestView.completed) text('debriefSummary', latestView.summary + ' Optional story moments saved: ' + entries.length + '.');
    text('storyAvailability', client && client.available() ? 'Optional generated wording is available. The plan and room always follow the practice rules.' : 'Prepared story available. An AI connection is optional.');
    var keyFor = function (button) { return button.id === 'introButton' ? 'intro' : 'dialogue-' + button.dataset.intent; };
    document.querySelectorAll('.story-buttons button').forEach(function (button) {
      var saved = entries.some(function (entry) { return entry.id === keyFor(button); });
      button.disabled = busy;
      button.setAttribute('aria-label', button.textContent + (saved ? ' · read saved story moment' : ''));
    });
    var selected = entries.find(function (entry) { return entry.id === selectedContentId; }) || entries[entries.length - 1];
    byId('storyMoment').hidden = !selected;
    if (selected) {
      text('storyLabel', (selected.status === 'generated' ? 'Generated story' : 'Prepared story') + ' · at step ' + selected.revision);
      text('storyText', selected.text);
    }
    text('storyStatus', busy ? 'Preparing a short story moment. You can keep practicing.' : contentNotice);
  }
  function clearRehearsal(clearPrediction) {
    rehearsalPreview=null;
    byId('rehearsalResult').hidden=true;
    text('rehearsalStatus','');
    if(clearPrediction)byId('prediction').value='';
  }
  function renderRehearsal(visibleActions) {
    var select=byId('rehearsalAction'),selected=select.value;
    select.replaceChildren();
    visibleActions.forEach(function(action){var option=node('option','',action.label);option.value=action.id;option.disabled=action.disabled;select.appendChild(option);});
    if(visibleActions.some(function(action){return action.id===selected&&!action.disabled;}))select.value=selected;
    else {var first=visibleActions.find(function(action){return !action.disabled;});select.value=first?first.id:'';}
    var available=visibleActions.some(function(action){return !action.disabled;});
    byId('rehearsal').hidden=!available;
    byId('previewActionButton').disabled=!available;
    if(rehearsalPreview&&!visibleActions.some(function(action){return action.id===rehearsalPreview.actionId&&!action.disabled;}))clearRehearsal(false);
  }
  function renderReview() {
    var entries = E.history(current), select = byId('reviewChoice');
    select.replaceChildren();
    if (!entries.length) select.appendChild(node('option', '', 'Make a choice to start your history'));
    entries.forEach(function (entry) {
      var option = node('option', '', 'Step ' + entry.revision + ' · ' + entry.label);
      option.value = entry.revision; select.appendChild(option);
    });
    var decisions = entries.filter(function (entry) { return entry.actionId !== 'depart' && entry.actionId !== 'hint'; });
    var suggested = decisions[decisions.length - 1] || entries[entries.length - 1];
    var selectedRevision = entries.some(function (entry) { return entry.revision === reviewRevision; }) ? reviewRevision : suggested ? suggested.revision : 0;
    select.value = String(selectedRevision); select.disabled = !entries.length;
    var entry = entries[selectedRevision - 1];
    byId('decisionReview').hidden = !entry;
    if (entry) text('reviewConsequence', entry.label + '\n' + entry.consequence + '\nPractice clock after this choice: ' + entry.clock + '.');
  }
  function renderComparison() {
    byId('comparisonCard').hidden = !comparison;
    if (!comparison) return;
    var original = comparison.original, at = comparison.revision;
    var oldChoice = E.history(original)[at], newChoice = E.history(current)[at];
    text('comparisonContext', 'Restarted before step ' + (at + 1) + '. The situation, coaching and earlier actions are the same.');
    text('originalChoice', oldChoice.label + '\n' + oldChoice.consequence + '\nClock afterward: ' + oldChoice.clock);
    text('revisedChoice', newChoice ? newChoice.label + '\n' + newChoice.consequence + '\nClock afterward: ' + newChoice.clock : 'Make your next choice in the room or with the action buttons.');
    var a = E.materialize(original), b = E.materialize(current), bothComplete = a.departed && b.departed;
    text('comparisonSummary', !newChoice ? 'Pause to predict what might change, then try your idea.' : bothComplete ? 'Compare your choices and outcomes below. Earlier arrival is one part of a plan; comfort, access and support matter too.' : newChoice.actionId === oldChoice.actionId ? 'You repeated the original choice. You can still make a different choice later.' : 'You tried a different choice from the same starting point. Notice its effect, then continue your plan.');
    if (!a.departed) text('comparisonSummary', byId('comparisonSummary').textContent + ' The original practice ended before departure, so a final arrival comparison is not available.');
    byId('outcomeComparison').hidden = !bothComplete;
    var rows = byId('comparisonRows'); rows.replaceChildren();
    if (bothComplete) {
      var av = E.view(original), bv = latestView;
      [['Time preparing', a.minutes + ' min', b.minutes + ' min'], ['Arrival', av.clock, bv.clock], ['Travel plan', av.travel.label, bv.travel.label], ['Before the start', (a.deadline-a.arrival) + ' min', (b.deadline-b.arrival) + ' min'], ['Clues requested', String(a.hints), String(b.hints)]].forEach(function (values) {
        var row = node('tr'), heading = node('th', '', values[0]); heading.scope = 'row';
        row.append(heading, node('td', '', values[1]), node('td', '', values[2])); rows.appendChild(row);
      });
    }
  }
  function focusOutcome() {
    var target = byId(comparison && !byId('outcomeComparison').hidden ? 'comparisonTitle' : 'debriefTitle');
    target.setAttribute('tabindex', '-1'); target.focus();
  }
  function editPlan(steps, focusId, operation, message) {
    try {
      plan = E.validatePlan(current, {version:1, steps:steps, checkedAt:plan ? plan.checkedAt : null});
      renderPlanner(); renderActions(); persist();
      var row = Array.from(byId('planSteps').children).find(function(item){return item.dataset.planId===focusId;});
      var button = row && row.querySelector('[data-plan-operation="'+operation+'"]');
      if (focusId) (button && !button.disabled ? button : row && row.querySelector('button:not(:disabled)') || byId('planAction')).focus();
      text('planStatus', message);
    } catch (error) { text('planStatus', error.message); }
  }
  function renderPlanner() {
    var v=E.planView(current,plan),checked=!!plan&&plan.checkedAt!==null,select=byId('planAction'),selected=select.value;
    var options=E.planOptions(current);
    select.replaceChildren();
    latestView.stations.forEach(function(station){
      var group=node('optgroup');group.label=station.label;
      options.filter(function(action){return action.station===station.id;}).forEach(function(action){var option=node('option','',action.label);option.value=action.id;group.appendChild(option);});
      select.appendChild(group);
    });
    if(Array.from(select.options).some(function(option){return option.value===selected;}))select.value=selected;
    select.disabled=v.completed;
    byId('addPlanStep').disabled=v.completed||v.steps.length>=12;
    byId('checkPlanButton').disabled=!v.steps.length||v.completed;
    byId('nextPlanButton').disabled=!v.next||v.completed;
    var list=byId('planSteps');list.replaceChildren();
    v.steps.forEach(function(step,index){
      var li=node('li','plan-step'+(step.doneAt!==null?' plan-done':'')+(checked&&step.problem?' plan-problem':''));li.dataset.planId=step.id;
      var description=node('div','plan-step-copy');
      description.append(node('strong','',step.label),node('span','plan-step-status',step.doneAt!==null?'Done at step '+step.doneAt:index===v.steps.findIndex(function(item){return item.doneAt===null;})?'Next in your plan':'Planned'));
      if(checked&&step.problem)description.appendChild(node('p','plan-problem-text',step.problem));
      var controls=node('div','plan-step-controls');
      [['up','Move up'],['down','Move down'],['remove','Remove']].forEach(function(entry){
        var operation=entry[0],button=node('button','quiet-button',entry[1]);button.type='button';button.dataset.planOperation=operation;
        button.setAttribute('aria-label',entry[1]+' planned step '+(index+1)+': '+step.label);
        button.disabled=v.completed||(operation==='up'&&index===0)||(operation==='down'&&index===v.steps.length-1);
        button.addEventListener('click',function(){
          var steps=plan.steps.slice(),target=step.id;
          if(operation==='remove'){steps.splice(index,1);target=steps[Math.min(index,steps.length-1)]&&steps[Math.min(index,steps.length-1)].id;}
          else {var at=index+(operation==='up'?-1:1),other=steps[at];steps[at]=steps[index];steps[index]=other;}
          editPlan(steps,target||'removed',operation,operation==='remove'?'Step removed from your plan.':'Step moved '+(operation==='up'?'earlier':'later')+' in your plan.');
        });
        controls.appendChild(button);
      });
      li.append(description,controls);list.appendChild(li);
    });
    if(!v.steps.length)list.appendChild(node('li','plan-empty','Your plan is empty. Add the steps you want to try.'));
    text('planNext',v.next?'Next: '+v.next.label+'. Going to a step opens its controls. Choose the action when you are ready.':'You can explore and act with or without a plan.');
    byId('planGuide').hidden=!v.steps.length||v.completed;
    text('planGuideText',(v.next?'Next in your plan: '+v.next.label+'.':'You have tried every step on your board. Check the outing list or add to your plan.')+(checked&&v.issues?' Your plan has '+v.issues+' '+(v.issues===1?'step':'steps')+' to review.':''));
    byId('planGuide').classList.toggle('plan-needs-review',checked&&v.issues>0);
    byId('followPlanButton').hidden=!v.next;
    byId('planCheck').hidden=!checked||!v.steps.length;
    text('planSummary',v.message);
    text('planUncertainty',v.completed?'The board records actions from this simulated outing.':v.forecastMayChange?'This check uses the current information. A forecast or travel update may change your plan. Recheck after an update.':'This check uses the latest forecast and travel information. You can change your plan at any time.');
    byId('planDebrief').hidden=!plan||!plan.steps.length;
    text('planDebrief',plan?'Planning support: used a plan board'+(plan.checkedAt!==null?' and its plan check':'')+'. '+v.steps.filter(function(step){return step.doneAt!==null;}).length+' of '+v.steps.length+' planned actions were recorded. You can discuss why your plan changed.':'');
  }
  function renderTravelLab() {
    function minutes(value){return value+' minute'+(value===1?'':'s');}
    var timing=E.travelAt(current,exploredDeparture===null?undefined:exploredDeparture);
    var slider=byId('departureTime');
    slider.min=String(timing.minimumDeparture);slider.value=String(timing.departureMinute);
    slider.setAttribute('aria-valuetext',timing.departure+' example departure');
    text('departureOutput',timing.departure);
    byId('earlierDeparture').disabled=timing.departureMinute<=timing.minimumDeparture;
    byId('laterDeparture').disabled=timing.departureMinute>=60;
    byId('resetDeparture').disabled=!timing.hypothetical;
    text('resetDeparture',timing.completed?'Use actual departure':'Use practice clock');
    text('returnToTravel',timing.completed?'Review your completed travel plan':'Review travel choices in the outing');
    text('travelTimeNote',timing.completed?'Your outing departed at '+timing.preparationTime+' and arrived at '+timing.practiceClock+'. These examples keep that outcome saved.':'Practice clock: '+timing.practiceClock+'. '+(timing.preparationReady?'Your clothes and bag are ready. Compare routes for the example departure.':'Finish preparing your clothes and bag before leaving. These examples compare travel timing.'));
    var rows=byId('travelTimelines');rows.replaceChildren();
    timing.routes.forEach(function(route){
      var row=node('li','travel-timeline'+(route.selected?' actual-route':''));row.dataset.route=route.id;
      var heading=node('div','timeline-heading'),name=node('h3','',route.label);
      if(route.selected)name.appendChild(node('span','timeline-selected','Chosen in outing'));
      heading.append(name,node('strong','timeline-arrival',route.available?'Arrive '+route.arrival:'Bus missed'));row.appendChild(heading);
      var outcome=!route.available?'This bus leaves at '+(route.id==='bus'?'09:20':'09:40')+'. It would have gone before '+timing.departure+'.':route.minutesBeforeStart>0?minutes(route.minutesBeforeStart)+' before the 09:35 start.':route.onTime?'Arrives at the 09:35 start, with no extra time.':minutes(Math.abs(route.minutesBeforeStart))+' after the 09:35 start.';
      row.appendChild(node('p','timeline-outcome'+(route.onTime?'':' timeline-caution'),outcome));
      var diagram=node('div','timeline-diagram');diagram.setAttribute('aria-hidden','true');
      var axis=node('div','timeline-axis');axis.append(node('span','','09:00'),node('span','timeline-start','09:35'),node('span','','10:20'));diagram.appendChild(axis);
      var track=node('div','timeline-track');
      var marker=node('span','timeline-deadline');marker.style.left=(100*timing.deadlineMinute/timing.axisEnd)+'%';track.appendChild(marker);
      if(route.available){
        if(route.waitingMinutes){var wait=node('span','timeline-wait');wait.style.left=(100*timing.departureMinute/timing.axisEnd)+'%';wait.style.width=(100*route.waitingMinutes/timing.axisEnd)+'%';track.appendChild(wait);}
        var journey=node('span','timeline-journey');journey.style.left=(100*(timing.departureMinute+route.waitingMinutes)/timing.axisEnd)+'%';journey.style.width=(100*route.travelMinutes/timing.axisEnd)+'%';track.appendChild(journey);
        var leave=node('span','timeline-leave');leave.style.left=(100*timing.departureMinute/timing.axisEnd)+'%';track.appendChild(leave);
      }
      diagram.appendChild(track);row.appendChild(diagram);
      if(route.available)row.appendChild(node('p','timeline-duration',route.scheduledDeparture===null?minutes(route.travelMinutes)+' of travel.':minutes(route.waitingMinutes)+' waiting at the stop + '+minutes(route.travelMinutes)+' of travel.'));
      row.appendChild(node('p','timeline-latest',route.latestOnTimeDeparture?'To arrive by 09:35, leave by '+route.latestOnTimeDeparture+'.':'This service arrives after the 09:35 start. Compare another route.'));
      rows.appendChild(row);
    });
    text('travelKnowledge',timing.forecastMayChange?'These examples use the information available now. Recheck after a forecast or travel update.':'These examples use the latest forecast and travel information.');
    return timing;
  }
  function openTravelExplorer() {
    byId('travelLab').open=true;
    renderTravelLab();byId('departureTime').focus();
    announce('Travel time explorer. Move the example departure to compare routes. The practice clock stays the same.');
  }
  function exploreDeparture(value,announceChange) {
    var minimum=E.travelAt(current).minimumDeparture;
    exploredDeparture=Math.max(minimum,Math.min(60,value));
    var timing=renderTravelLab();
    if(announceChange)text('travelLabStatus','At '+timing.departure+', '+timing.routes.filter(function(route){return route.onTime;}).length+' of '+timing.routes.length+' routes arrive by 09:35. The practice clock stays '+timing.practiceClock+'.');
  }
  function render() {
    latestView = E.view(current);
    var v = latestView;
    text('missionTitle', v.title);
    text('missionIntro', v.intro);
    text('clock', v.clock);
    text('goal', v.goal);
    text('summary', v.summary);
    var factsList = byId('missionFacts'); factsList.replaceChildren();
    v.facts.forEach(function (fact) { factsList.appendChild(node('li', '', fact)); });
    text('feedback', v.feedback);
    text('supportLabel', supportNames[current.config.support] || 'Guided');
    var completed = v.objectives.filter(function (o) { return o.complete; }).length;
    text('progressCount', completed + ' / ' + v.objectives.length + ' ready');
    byId('progressBar').style.width = (v.objectives.length ? 100 * completed / v.objectives.length : 0) + '%';
    var goals = byId('objectives');
    goals.replaceChildren();
    v.objectives.forEach(function (goal) {
      var item = node('li', goal.complete ? 'complete' : '');
      var mark = node('span', 'objective-mark', '✓'); mark.setAttribute('aria-hidden', 'true');
      item.append(mark, node('span', '', goal.label + (goal.complete ? ' · ready' : '')));
      goals.appendChild(item);
    });
    byId('eventCard').hidden = !v.event;
    if (v.event) { text('eventTitle', v.event.title); text('eventBody', v.event.body); }
    var inventory = byId('inventory');
    inventory.replaceChildren();
    v.inventory.forEach(function (item) {
      var li = node('li'), button = node('button', 'inventory-item', item.label); button.type = 'button';
      var id = item.id === 'water' ? 'bottle' : item.id === 'document' ? 'card' : item.id;
      button.setAttribute('aria-label', 'Inspect ' + item.label);
      button.addEventListener('click', function () { selectObject(id, true); }); li.appendChild(button); inventory.appendChild(li);
    });
    if (!v.inventory.length) inventory.appendChild(node('li', 'empty', 'Your bag is empty. Decide what you will need.'));
    byId('hintContent').hidden = !(shownHint || current.config.support === 'guided');
    byId('hintButton').disabled = v.completed;
    text('hintNotice', v.hint && v.hint.notice);
    text('hintConnect', v.hint && v.hint.connect);
    text('hintTry', v.hint && v.hint.try);
    byId('debrief').hidden = !v.completed;
    text('debriefSummary', v.summary + ' Optional story moments saved: ' + (current.content || []).length + '.');
    var observations = byId('observations');
    observations.replaceChildren();
    v.observations.forEach(function (observation) {
      var item = node('li');
      item.append(node('strong', '', observation.skill), node('span', '', observation.text));
      if (observation.support) item.appendChild(node('span', 'muted', ' · Support: ' + observation.support));
      observations.appendChild(item);
    });
    var travel = v.travel;
    text('travelPreview', travel ? travel.label + ' → ' + travel.arrival + ' · ' + (travel.onTime ? travel.minutesBeforeStart + ' min before the start' : Math.abs(travel.minutesBeforeStart) + ' min late') + '. Review your route.' : 'Choose a route to see your arrival time.');
    byId('travelPreview').classList.toggle('route-late', !!travel && !travel.onTime);
    var routes = byId('routeComparison'); routes.replaceChildren();
    v.routes.forEach(function (route) { var li = node('li'); li.append(node('span', '', route.label + (route.selected ? ' · selected' : '')), node('strong', '', route.arrival)); routes.appendChild(li); });
    renderTravelLab();
    var recent = byId('recentChoices'); recent.replaceChildren();
    v.recent.forEach(function (entry) { var li = node('li'); li.append(node('strong', '', 'Step ' + entry.revision + ' · ' + entry.clock), node('span', '', entry.consequence)); recent.appendChild(li); });
    if (!v.recent.length) recent.appendChild(node('li', 'muted', 'Your choices and their effects will appear here.'));
    renderReview();
    renderComparison();
    renderPlanner();
    renderActions();
    renderStory();
    updateScene();
  }
  function boundedFacts(values) {
    var remaining = 1200, result = [];
    (values || []).forEach(function (value) {
      if (result.length >= 8 || remaining < 1 || typeof value !== 'string') return;
      var clean = value.replace(/[\u0000-\u001f]/g, ' ').slice(0, Math.min(200, remaining));
      if (clean) { result.push(clean); remaining -= clean.length; }
    });
    return result;
  }
  function requestStory(kind, intent) {
    var id = kind === 'intro' ? 'intro' : 'dialogue-' + intent;
    var existing = (current.content || []).find(function (entry) { return entry.id === id; });
    if (existing) { selectedContentId = id; contentNotice = 'Showing the saved story moment from this practice.'; renderStory(); return; }
    if (busy) return;

    var owner = { runId: current.runId, revision: current.commands.length, serial: ++requestSerial };
    var payload = { kind: kind, runId: owner.runId, revision: owner.revision, context: current.config.context, language: current.config.language, facts: boundedFacts(latestView.facts) };
    if (kind === 'dialogue') payload.intent = intent;
    pendingController = new AbortController();
    var signal = pendingController.signal;
    busy = true; contentNotice = ''; renderStory();
    var request = client ? client.request(payload, { signal: signal }) : Promise.resolve({ text: latestView.intro, status: 'authored' });
    Promise.resolve(request).then(function (result) {
      if (signal.aborted || owner.serial !== requestSerial || owner.runId !== current.runId || owner.revision !== current.commands.length) return;
      if (!result || typeof result.text !== 'string' || !result.text.trim() || result.text.length > 1200 || ['generated', 'authored', 'fallback'].indexOf(result.status) < 0) throw new Error('The story response was not usable.');
      var entry = { id: id, revision: owner.revision, kind: kind, text: result.text, status: result.status };
      if (kind === 'dialogue') entry.intent = intent;
      current = E.addContent(current, entry);
      selectedContentId = id;
      contentNotice = result.status === 'fallback' ? 'A prepared story is shown because generation was unavailable.' : 'Story saved. Your choices still determine what happens.';
      busy = false; pendingController = null; persist(); renderStory();
    }).catch(function (error) {
      if (signal.aborted || owner.serial !== requestSerial || owner.runId !== current.runId || owner.revision !== current.commands.length) return;
      busy = false; pendingController = null;
      contentNotice = 'The story is unavailable right now. Your practice is ready to continue.';
      renderStory();
    });
  }

  function entity(tag, attrs, parent) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) { el.setAttribute(key, attrs[key]); });
    (parent || byId('room')).appendChild(el);
    return el;
  }
  function box(x, y, z, w, h, d, color, parent, extra) {
    return entity('a-box', Object.assign({ position: [x,y,z].join(' '), width:w, height:h, depth:d, color:color }, extra || {}), parent);
  }
  function cylinder(x, y, z, radius, height, color, parent, extra) {
    return entity('a-cylinder', Object.assign({ position:[x,y,z].join(' '), radius:radius, height:height, color:color }, extra || {}), parent);
  }
  function textPlane(value, attrs, parent, style) {
    style = style || {};
    var canvas = document.createElement('canvas');
    canvas.id = 'outing-label-' + (++textSerial);
    canvas.width = 768; canvas.height = 192; canvas.hidden = true;
    var ctx = canvas.getContext('2d');
    if (style.background) { ctx.fillStyle = style.background; ctx.fillRect(0,0,768,192); }
    ctx.fillStyle = style.color || '#28413c'; ctx.font = '600 ' + (style.fontSize || 38) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var words = String(value).split(/\s+/), lines = [], line = '';
    words.forEach(function (word) { var next = line ? line + ' ' + word : word; if (ctx.measureText(next).width > 704 && line) { lines.push(line); line = word; } else line = next; });
    if (line) lines.push(line);
    lines.slice(0,3).forEach(function (part, i) { ctx.fillText(part, 384, 96 + (i - (Math.min(lines.length,3)-1)/2) * 46); });
    byId('roomLabels').appendChild(canvas);
    var plane = entity('a-plane', Object.assign({ width:1.7, height:.42, material:'src: #' + canvas.id + '; shader: flat; transparent: true; side: double' }, attrs), parent);
    plane.dataset.canvasId = canvas.id;
    return plane;
  }
  function stationGroup(id) {
    var group = entity('a-entity', { 'data-station': id });
    group.addEventListener('click', function () { selectStation(id, false); });
    return group;
  }
  function highlightObjects() {
    Object.keys(objectNodes).forEach(function (id) {
      objectNodes[id].forEach(function (el) {
        if (!el.object3D) return;
        el.object3D.traverse(function (mesh) {
          var materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(function (material) {
            if (!material || !material.emissive) return;
            if (!originalEmissive.has(material)) originalEmissive.set(material, {color:material.emissive.clone(),intensity:material.emissiveIntensity});
            var original = originalEmissive.get(material);
            if (id === selectedObject || id === hoveredObject) { material.emissive.set('#39725b'); material.emissiveIntensity = .4; }
            else { material.emissive.copy(original.color); material.emissiveIntensity = original.intensity; }
          });
        });
      });
    });
  }
  function attachObject(el, id) {
    if (!el) return;
    (objectNodes[id] || (objectNodes[id] = [])).push(el);
    el.dataset.object = id;
    [el].concat(Array.from(el.querySelectorAll('a-box,a-cylinder,a-sphere,a-torus,a-plane'))).forEach(function (part) { part.classList.add('pickable'); });
    el.addEventListener('click', function (event) { event.stopPropagation(); selectObject(id, false); });
    el.addEventListener('mouseenter', function () {
      hoveredObject = id; highlightObjects();
      var object = latestView && latestView.objects.find(function (item) { return item.id === id; });
      if (object) text('sceneCaption', object.label + ' · ' + object.status + ' · select to inspect.');
      if (byId('outingScene').canvas) byId('outingScene').canvas.style.cursor = 'pointer';
    }, true);
    el.addEventListener('mouseleave', function () {
      hoveredObject = null; highlightObjects();
      var object = latestView && latestView.objects.find(function (item) { return item.id === selectedObject; });
      text('sceneCaption', object ? object.label + ' · ' + object.status : 'Select an object in the room or use the controls below.');
      if (byId('outingScene').canvas) byId('outingScene').canvas.style.cursor = '';
    }, true);
  }
  function fitScene() {
    var scene = byId('outingScene'), camera = scene.querySelector('a-camera');
    var bounds = scene.getBoundingClientRect();
    if (!camera || !bounds.width || !bounds.height) return;
    // Fit the whole home at both wide desktop and narrow phone aspect ratios.
    var visibleHeight = Math.max(6.5, 10.5 / (bounds.width / bounds.height));
    var center = closeView ? ({kitchen:-2.4,wardrobe:-.3,entry:1.55,travel:3})[activeStation] : 0;
    camera.setAttribute('position', center + ' 6.2 10');
    camera.setAttribute('camera', 'fov', 2 * Math.atan(visibleHeight / (closeView ? 32 : 23)) * 180 / Math.PI);
    byId('sceneActionButtons').setAttribute('visible', !closeView);
  }
  function buildScene() {
    if (!window.AFRAME) { byId('sceneContainer').hidden = true; byId('sceneUnavailable').hidden = false; byId('sceneToggle').disabled = true; byId('focusView').disabled = true; return; }
    var labels = node('div'); labels.id = 'roomLabels'; labels.hidden = true; document.body.appendChild(labels);
    box(0,-.12,-.2,8.2,.24,5.2,'#d6bf9e');
    box(0,.015,-.2,7.95,.04,4.95,'#e2ccaf');
    box(0,1.45,-2.8,8.2,3.15,.16,'#c2d3c8');
    box(-4.04,1.45,-.2,.16,3.15,5.2,'#e9dec8');
    box(0,.7,-2.68,8,.05,.05,'#acbfb3');
    box(0,.04,.7,4.1,.03,2,'#f2eee2'); box(0,.06,.7,3.85,.02,1.75,'#d8b798');
    box(-2.6,2,-2.64,1.75,1.4,.12,'#fffaf0');
    box(-2.6,2,-2.56,1.5,1.14,.025,'#b6d6df',null,{id:'windowSky'});
    box(-2.6,2,-2.53,.055,1.2,.04,'#fffaf0'); box(-2.6,2,-2.52,1.55,.055,.04,'#fffaf0');
    var rain = entity('a-entity',{id:'rainDrops',visible:false});
    [[-3.12,2.3],[-2.82,1.8],[-2.2,2.27],[-2.02,1.75]].forEach(function(p){cylinder(p[0],p[1],-2.51,.018,.17,'#598cb0',rain,{rotation:'0 0 -15'});});
    var kitchen = stationGroup('kitchen');
    box(-2.63,.52,-1.9,2.45,1.04,1.2,'#a2b7a3',kitchen,{class:'pickable'});
    box(-2.63,1.06,-1.9,2.6,.12,1.35,'#faf5e8',kitchen,{class:'pickable'});
    [-3.16,-2.08].forEach(function(x){box(x,.52,-1.275,.91,.87,.035,'#94ad97',kitchen);});
    [-2.83,-2.39].forEach(function(x){box(x,.68,-1.24,.035,.18,.05,'#596c5d',kitchen);});
    box(-3.23,1.13,-1.92,.72,.025,.66,'#789392',kitchen);
    cylinder(-3.35,1.32,-2.16,.025,.42,'#587275',kitchen);
    cylinder(-3.35,1.51,-2.02,.025,.29,'#587275',kitchen,{rotation:'90 0 0'});
    var bottle = entity('a-entity',{id:'bottleObject',position:'-2.1 1.32 -1.8'},kitchen);
    cylinder(0,0,0,.105,.39,'#8ecbd0',bottle,{class:'pickable',material:'opacity: .7; transparent: true'});
    cylinder(0,-.1,0,.097,.03,'#21778c',bottle,{id:'bottleWater'});
    cylinder(0,.23,0,.075,.085,'#375762',bottle);
    textPlane('KITCHEN',{position:'-2.63 .13 -.83',rotation:'-25 0 0'},kitchen);
    var wardrobe = stationGroup('wardrobe');
    box(-.3,.94,-2.1,1.65,1.88,.85,'#b48765',wardrobe,{class:'pickable'});
    box(-.3,1.12,-1.64,1.4,1.36,.03,'#d4ad8c',wardrobe);
    cylinder(-.3,1.69,-1.45,.027,1.37,'#735944',wardrobe,{rotation:'0 0 90'});
    var shirt=entity('a-entity',{id:'shirtObject'},wardrobe);
    box(-.3,1.1,-1.4,.56,.71,.09,'#f3d27f',shirt,{class:'pickable'});
    box(-.69,1.36,-1.4,.24,.34,.09,'#f3d27f',shirt,{class:'pickable',rotation:'0 0 -20'});
    box(.09,1.36,-1.4,.24,.34,.09,'#f3d27f',shirt,{class:'pickable',rotation:'0 0 20'});
    box(-.3,.37,-1.32,.68,.17,.42,'#659884',wardrobe,{id:'clothesFolded',visible:false});
    textPlane('WARDROBE',{position:'-.3 .13 -.83',rotation:'-25 0 0'},wardrobe);
    var entry = stationGroup('entry');
    box(1.63,.25,-1.75,1.45,.5,.85,'#d4b696',entry,{class:'pickable'});
    box(1.63,.54,-1.75,1.55,.09,.95,'#f6e9d3',entry);
    var bag=entity('a-entity',{id:'bagObject',position:'1.7 .83 -1.64'},entry);
    box(0,0,0,.61,.59,.35,'#bd785e',bag,{class:'pickable'});
    box(0,-.09,.21,.42,.27,.08,'#9f624f',bag);
    entity('a-torus',{position:'0 .33 0',radius:.13,'radius-tubular':.025,arc:180,color:'#80523f'},bag);
    box(1.16,.61,-1.6,.3,.018,.4,'#fffbed',entry,{id:'documentObject',class:'pickable'});
    box(1.68,1.19,-1.65,.25,.26,.025,'#fffbed',entry,{id:'packedDocument',visible:false,rotation:'0 0 -10'});
    cylinder(1.1,1.6,-2.6,.025,1.5,'#7b6048',entry,{rotation:'0 0 90'});
    var weather=entity('a-entity',{id:'weatherObject'},entry);
    box(1.05,1.28,-2.45,.38,.57,.09,'#d5a845',weather,{class:'pickable'});
    entity('a-sphere',{position:'1.05 1.59 -2.45',radius:.15,scale:'1 1 .35',color:'#d5a845',class:'pickable'},weather);
    var hat = entity('a-entity',{id:'hatObject'},entry);
    cylinder(2.06,1.48,-2.43,.25,.035,'#c49a68',hat,{rotation:'90 0 0',class:'pickable'});
    cylinder(2.06,1.48,-2.35,.15,.16,'#e1bd8b',hat,{rotation:'90 0 0',class:'pickable'});
    var forecast = entity('a-entity', {id:'forecastObject'}, entry);
    box(1.64,2.3,-2.48,1.32,.48,.06,'#fff6d8',forecast);
    textPlane('OUTING UPDATES',{position:'1.64 2.3 -2.435',width:1.22,height:.31},forecast);
    textPlane('PACKING',{position:'1.62 .13 -.83',rotation:'-25 0 0'},entry);
    var travel=stationGroup('travel');
    box(3.17,1.3,-2.57,1.13,2.6,.2,'#f4ecda',travel);
    box(3.17,1.23,-2.44,.95,2.4,.02,'#83ac98',travel);
    var hinge=entity('a-entity',{id:'doorHinge',position:'2.72 0 -2.4'},travel);
    box(.45,1.23,.03,.9,2.4,.09,'#719c89',hinge,{class:'pickable'});
    box(.45,1.46,.09,.62,1.53,.025,'#82ac98',hinge);
    entity('a-sphere',{position:'.77 1.17 .13',radius:.045,color:'#efd697'},hinge);
    box(3.15,.045,-1.26,1.15,.03,.56,'#83957e',travel,{class:'pickable'});
    textPlane('HEAD OUT',{position:'3.12 .13 -.83',rotation:'-25 0 0',width:1.4},travel);
    [['bottleObject','bottle'],['shirtObject','outfit'],['clothesFolded','outfit'],['documentObject','card'],['packedDocument','card'],['forecastObject','forecast'],['weatherObject','raincoat'],['hatObject','hat'],['bagObject','bag'],['doorHinge','route']].forEach(function (pair) { attachObject(byId(pair[0]),pair[1]); });
    sceneReady=true;
    var scene=byId('outingScene'); if (scene.canvas) scene.canvas.setAttribute('tabindex','-1');
    scene.addEventListener('loaded', function () {
      if (scene.canvas) scene.canvas.setAttribute('tabindex','-1');
      fitScene(); updateScene(); renderActions();
    });
    scene.addEventListener('render-target-loaded', function () { if(scene.canvas) scene.canvas.setAttribute('tabindex','-1'); });
    scene.addEventListener('webglcontextlost', function () { byId('sceneContainer').hidden=true; byId('sceneUnavailable').hidden=false; byId('focusView').disabled=true; });
    window.addEventListener('resize', fitScene);
    fitScene();
  }
  function updateSceneActions(actions) {
    if (!sceneReady) return;
    var parent=byId('sceneActionButtons');
    Array.from(parent.children).forEach(function (child) { var canvas=byId(child.dataset.canvasId); if(canvas)canvas.remove(); child.remove(); });
    actions.slice(0,6).forEach(function(action,index){
      var count=Math.min(actions.length,3),column=index%3,row=Math.floor(index/3);
      var plane=textPlane(action.label,{position:((column-(count-1)/2)*2.36)+' '+(.38-row*.62)+' 0',width:2.18,height:.52,class:action.disabled?'':'pickable'},parent,{background:action.disabled?'#cdd9c9':'#346959',color:action.disabled?'#65796a':'#fff9eb',fontSize:35});
      plane.dataset.action=action.id;
      if(!action.disabled)plane.addEventListener('click',function(event){event.stopPropagation();act(action.id,'scene');});
    });
  }
  function updateScene() {
    if(!sceneReady || !latestView)return;
    var s=latestView.scene;
    byId('bottleObject').setAttribute('position',s.bottlePacked?'2.08 1.05 -1.61':'-2.1 1.32 -1.8');
    byId('bottleObject').setAttribute('visible',!s.departed);
    byId('bottleWater').setAttribute('height',s.bottleFilled?.31:.03);
    byId('bottleWater').setAttribute('position',s.bottleFilled?'0 0 0':'0 -.1 0');
    byId('shirtObject').querySelectorAll('a-box').forEach(function(el){el.setAttribute('color',s.clothingReady?'#659884':'#f3d27f');});
    byId('clothesFolded').setAttribute('visible',Boolean(s.clothingReady));
    byId('documentObject').setAttribute('visible',!s.documentPacked);
    byId('packedDocument').setAttribute('visible',Boolean(s.documentPacked) && !s.departed);
    var raincoatPacked=latestView.inventory.some(function(item){return item.id==='raincoat';});
    var hatPacked=latestView.inventory.some(function(item){return item.id==='hat';});
    byId('weatherObject').setAttribute('position',raincoatPacked?'1 .1 0':'0 0 0');
    byId('weatherObject').setAttribute('scale',raincoatPacked?'.65 .65 .65':'1 1 1');
    byId('weatherObject').setAttribute('visible',!(s.departed&&raincoatPacked));
    byId('hatObject').setAttribute('position',hatPacked?'.5 .05 0':'0 0 0');
    byId('hatObject').setAttribute('scale',hatPacked?'.65 .65 .65':'1 1 1');
    byId('hatObject').setAttribute('visible',!(s.departed&&hatPacked));
    byId('windowSky').setAttribute('color',s.weather==='rain'?'#a6bdcb':'#b9dcd7');
    byId('rainDrops').setAttribute('visible',s.weather==='rain');
    byId('doorHinge').setAttribute('rotation',s.departed?'0 -65 0':'0 0 0');
    byId('bagObject').setAttribute('visible',!s.departed);
    if(s.departed)text('sceneCaption','Ready to head out · reflect on your choices below.');
  }

  byId('settingsToggle').addEventListener('click',function(){
    var panel=byId('settings');panel.hidden=!panel.hidden;
    byId('settingsToggle').setAttribute('aria-expanded',String(!panel.hidden));
    if(!panel.hidden){refreshSaved();byId('contextSelect').focus();}
  });
  byId('settingsForm').addEventListener('submit',function(event){
    event.preventDefault();
    changeRun(E.createRun({context:byId('contextSelect').value,support:byId('supportSelect').value,language:byId('languageSelect').value,variation:byId('scenarioSelect').value}));
    byId('settings').hidden=true;byId('settingsToggle').setAttribute('aria-expanded','false');byId('stationActions').focus();
  });
  byId('resumeButton').addEventListener('click',function(){
    try{changeRun(E.readRun(storage,byId('savedRuns').value));byId('stationActions').focus();}
    catch(error){text('saveStatus','That saved practice could not be read. It has been preserved.');}
  });
  byId('sceneToggle').addEventListener('click',function(){
    sceneHidden=!sceneHidden;byId('sceneContainer').hidden=sceneHidden;this.setAttribute('aria-pressed',String(sceneHidden));this.textContent=sceneHidden?'Show 3D view':'Hide 3D view';
    byId('focusView').disabled=sceneHidden;
    var scene=byId('outingScene'); if (scene.canvas) scene.canvas.setAttribute('tabindex','-1');if(sceneHidden&&scene.pause)scene.pause();if(!sceneHidden&&scene.play){scene.play();window.dispatchEvent(new Event('resize'));}
    announce(sceneHidden?'3D view hidden. All practice actions remain available.':'3D view shown.');
  });
  byId('focusView').addEventListener('click',function(){
    closeView=!closeView;this.setAttribute('aria-pressed',String(closeView));this.textContent=closeView?'Whole room':'Closer view';fitScene();
    announce(closeView?'Closer view of the selected station. Use the action buttons below the room.':'Whole room shown.');
  });
  byId('travelPreview').addEventListener('click',function(){selectObject('route',true);});
  byId('exploreTravel').addEventListener('click',openTravelExplorer);
  byId('openTravelLab').addEventListener('click',openTravelExplorer);
  byId('departureTime').addEventListener('input',function(){exploreDeparture(Number(this.value),false);});
  byId('departureTime').addEventListener('change',function(){exploreDeparture(Number(this.value),true);});
  byId('earlierDeparture').addEventListener('click',function(){exploreDeparture(Number(byId('departureTime').value)-1,true);if(this.disabled)byId('departureTime').focus();});
  byId('laterDeparture').addEventListener('click',function(){exploreDeparture(Number(byId('departureTime').value)+1,true);if(this.disabled)byId('departureTime').focus();});
  byId('resetDeparture').addEventListener('click',function(){exploredDeparture=null;var timing=renderTravelLab();text('travelLabStatus','Example reset to '+timing.preparationTime+'.');byId('departureTime').focus();});
  byId('returnToTravel').addEventListener('click',function(){selectObject('route',true);});
  byId('rehearsalAction').addEventListener('change',function(){clearRehearsal(false);});
  byId('prediction').addEventListener('input',function(){clearRehearsal(false);});
  byId('previewActionButton').addEventListener('click',function(){
    try {
      rehearsalPreview=E.previewAction(current,byId('rehearsalAction').value);
      text('rehearsalTitle','Preview: '+rehearsalPreview.label);
      var prediction=byId('prediction').value.trim().slice(0,240);
      text('rehearsalPrediction',prediction?'Your prediction: '+prediction:'You can compare this with what you thought or discussed.');
      var rows=byId('rehearsalChanges');rows.replaceChildren();
      rehearsalPreview.changes.forEach(function(change){var row=node('tr'),heading=node('th','',change.label);heading.scope='row';row.append(heading,node('td','',change.before),node('td','',change.after));rows.appendChild(row);});
      if(!rehearsalPreview.changes.length){var row=node('tr'),cell=node('td','','The room and timing would stay the same.');cell.colSpan=3;row.appendChild(cell);rows.appendChild(row);}
      text('rehearsalFeedback',rehearsalPreview.feedback);
      text('rehearsalUncertainty',rehearsalPreview.forecastMayChange?'This preview uses the current information. Forecast and travel updates appear during the outing; recheck your plan when they arrive.':'This preview uses the latest forecast and travel information.');
      byId('rehearsalResult').hidden=false;byId('rehearsalTitle').focus();
      text('rehearsalStatus','Preview ready. The outing has not changed. Your prediction stays in this rehearsal panel and is not saved or sent to the story service.');
    } catch(error){clearRehearsal(false);text('rehearsalStatus',error.message);}
  });
  byId('takeRehearsedAction').addEventListener('click',function(){
    if(!rehearsalPreview||rehearsalPreview.revision!==current.commands.length){clearRehearsal(false);text('rehearsalStatus','The outing changed. Preview your current choice again.');return;}
    act(rehearsalPreview.actionId,'rehearsal');
  });
  byId('hintButton').addEventListener('click',function(){act('hint','button');});
  byId('introButton').addEventListener('click',function(){requestStory('intro');});
  document.querySelectorAll('.dialogue-button').forEach(function(button){button.addEventListener('click',function(){requestStory('dialogue',button.dataset.intent);});});
  byId('replayButton').addEventListener('click',function(){changeRun(E.forkRun(current,{variation:current.config.variation==='rain'?'warm':'rain'}));byId('stationActions').focus();});
  byId('sameReplayButton').addEventListener('click',function(){changeRun(E.forkRun(current,{}));byId('stationActions').focus();});
  byId('delayReplayButton').addEventListener('click',function(){changeRun(E.forkRun(current,{variation:'bus-delay'}));byId('stationActions').focus();});
  byId('reviewChoice').addEventListener('change',function(){reviewRevision=Number(this.value);renderReview();});
  byId('reviewButton').addEventListener('click',function(){byId('choiceHistory').open=true;byId('reviewChoice').focus();});
  byId('planForm').addEventListener('submit',function(event){
    event.preventDefault();if(latestView.completed)return;
    var steps=plan?plan.steps.slice():[];
    steps.push({id:'plan-'+Date.now().toString(36)+'-'+(++eventSerial),actionId:byId('planAction').value,addedAt:current.commands.length});
    editPlan(steps,null,null,steps.length===12?'Your plan has 12 steps. Remove a step before adding another.':'Step added. You can move it earlier or later.');byId('planAction').focus();
  });
  byId('checkPlanButton').addEventListener('click',function(){
    if(!plan||!plan.steps.length||latestView.completed)return;
    plan=E.validatePlan(current,{version:1,steps:plan.steps,checkedAt:current.commands.length});
    renderPlanner();persist();text('planStatus',E.planView(current,plan).message);
  });
  function goToPlannedStep(){
    var next=E.planView(current,plan).next;if(!next||latestView.completed)return;
    selectStation(next.station,false);
    var button=Array.from(byId('actionList').querySelectorAll('button')).find(function(item){return item.dataset.action===next.actionId;});
    (button&&!button.disabled?button:byId('stationActions')).focus();
    announce('Next in your plan: '+next.label+'. '+(next.available?'Choose the action when you are ready.':next.reason));
  }
  byId('nextPlanButton').addEventListener('click',goToPlannedStep);
  byId('followPlanButton').addEventListener('click',goToPlannedStep);
  byId('editPlanButton').addEventListener('click',function(){byId('planner').open=true;byId('planner').querySelector('summary').focus();});
  byId('retryChoiceButton').addEventListener('click',function(){
    try {
      var original=current, revision=Number(byId('reviewChoice').value)-1, choice=E.history(original)[revision];
      var retry=E.branchRun(original,revision);
      var retryPlan=plan?E.validatePlan(retry,{version:1,steps:plan.steps.filter(function(step){return step.addedAt<=revision;}),checkedAt:plan.checkedAt!==null&&plan.checkedAt<=revision?plan.checkedAt:null}):null;
      changeRun(retry,{reflection:'',comparison:E.validateComparison(retry,{original:original,revision:revision}),plan:retryPlan});
      byId('choiceHistory').open=false;
      selectStation(choice.station==='support'?'kitchen':choice.station,true);
      byId('stationActions').focus();
      announce('New practice started before step '+(revision+1)+'. Your earlier actions are kept. Try your next choice, then compare below.');
    } catch (error) { text('feedback',error.message); }
  });
  function saveReflection() {
    notes[current.runId]={reflection:byId('reflection').value.slice(0,600),comparison:comparison,plan:plan};
    try{if(!storage||!lastSaveOk)throw new Error('unavailable');storage.setItem(REFLECTION_PREFIX+current.runId,notes[current.runId].reflection);text('reflectionStatus','Your optional reflection is saved on this device.');}
    catch(_){text('reflectionStatus','Your reflection is kept in this page. Download your practice to keep a copy.');}
  }
  byId('reflection').addEventListener('input',saveReflection);
  byId('reflection').addEventListener('change',saveReflection);
  byId('downloadButton').addEventListener('click',function(){
    try {
      var backup=E.createBackup(current,byId('reflection').value.slice(0,600),comparison,plan);
      var url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
      var link=node('a');link.href=url;link.download='life-skills-outing-'+current.runId+'.json';document.body.appendChild(link);link.click();link.remove();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);
      text('backupStatus','Download prepared with your practice, plan, reflection and any comparison.');
    } catch (_) { text('backupStatus','The download could not be prepared. Keep this page open and try again.'); }
  });
  byId('restoreButton').addEventListener('click',function(){byId('restoreFile').click();});
  byId('restoreFile').addEventListener('change',function(){
    var file=this.files&&this.files[0];this.value='';if(!file)return;
    var serial=++importSerial, owner=current, ownerPlan=plan, reflection=byId('reflection').value;
    if(file.size>300000){text('backupStatus','Choose a practice backup smaller than 300 KB. Your current practice is unchanged.');return;}
    text('backupStatus','Opening your practice backup…');
    var reader=new FileReader();
    reader.onload=function(){
      if(serial!==importSerial)return;
      if(owner!==current||ownerPlan!==plan||reflection!==byId('reflection').value){text('backupStatus','Your practice changed while the file was opening. Open the backup again when you are ready.');return;}
      try {
        var backup=E.readBackup(reader.result), restored=E.copyRun(backup.run);
        changeRun(restored,{reflection:backup.reflection,comparison:backup.comparison||null,plan:backup.plan||null});
        byId('settings').hidden=true;byId('settingsToggle').setAttribute('aria-expanded','false');
        if(latestView.completed)focusOutcome();else byId('stationActions').focus();
        text('backupStatus','Backup opened as a new copy. Existing practices are kept.');
        announce('Backup opened as a new copy. '+latestView.summary);
      } catch (error) { text('backupStatus',error.message+' Your current practice is unchanged.'); }
    };
    reader.onerror=function(){if(serial===importSerial)text('backupStatus','This file could not be opened. Your current practice is unchanged.');};
    reader.readAsText(file);
  });
  window.addEventListener('beforeunload',function(){abortStory();if(client)client.destroy();});
  var restored;
  try{var key=storage&&storage.getItem(ACTIVE_KEY);if(key)restored=E.readRun(storage,key);}catch(_){}
  if(!restored){var valid=savedRuns().find(function(entry){return entry.run;});if(valid)restored=valid.run;}
  try { buildScene(); } catch (_) { sceneReady = false; byId('sceneContainer').hidden = true; byId('sceneUnavailable').hidden = false; byId('sceneToggle').disabled = true; byId('focusView').disabled = true; }
  changeRun(restored||E.createRun({context:'community',support:'guided',language:'plain',variation:'rain'}));
}());
