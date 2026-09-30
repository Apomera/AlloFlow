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
  var packingSelection = null;
  var packingActions = { bottle: 'pack_water', card: 'pack_document', raincoat: 'pack_raincoat', hat: 'pack_hat' };
  var wardrobePreview = null;
  var wardrobeNames = { wear_ready: 'Clean, dry outfit', prepare_clothes: 'Outfit that needs drying' };
  var updateTopic = null, updateSnapshot = null;
  var departureGuess = null, departureReview = null, departureVisited = false;
  var waterMoment = null, waterMotionTimer = null;
  var motionPreference = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var routePreview = null;
  var routeActions = {walk:'choose_walk', bus:'choose_bus', ride:'choose_ride', late_bus:'choose_late_bus'};
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
    clearRoute(true);
    clearWater(true);
    clearRehearsal(true);
    clearPacking(true);
    clearWardrobe(true);
    clearUpdate(true); updateSnapshot = null;
    clearDeparture(true); departureVisited = false;
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
    clearRoute(true);
    clearWater(true);
    clearRehearsal(true);
    clearPacking(true);
    clearWardrobe(true);
    clearUpdate(true);
    clearDeparture(true);
    activeStation = id;
    selectedObject = null;
    renderActions();
    if (moveFocus) byId('stationActions').focus({ preventScroll: true });
    announce(latestView.stations.find(function (s) { return s.id === id; }).label + '. Choose an action below.');
  }
  function selectObject(id, moveFocus) {
    var object = latestView.objects.find(function (item) { return item.id === id; });
    if (!object) return;
    clearRoute(true);
    clearWater(true);
    clearRehearsal(true);
    clearPacking(true);
    clearWardrobe(true);
    clearUpdate(true);
    clearDeparture(true);
    selectedObject = id;
    activeStation = object.station;
    if (id === 'route' && !latestView.completed) departureVisited = true;
    renderActions();
    if (id === 'bottle' && !latestView.completed) byId('waterWorkbench').open = true;
    if (id === 'bag' && !latestView.completed) byId('packingWorkbench').open = true;
    if (id === 'outfit' && !latestView.completed) byId('wardrobeWorkbench').open = true;
    if (id === 'forecast' && latestView.event && !latestView.completed) byId('updateWorkbench').open = true;
    if (id === 'route' && !latestView.completed) byId('departureWorkbench').open = true;
    if (moveFocus) byId('stationActions').focus();
    announce(object.label + '. ' + object.status + '. ' + object.description);
  }
  function act(id, source) {
    var focusedAction = document.activeElement && document.activeElement.dataset.action;
    var wasComplete = latestView.completed, oldEvent = latestView.event && latestView.event.title;
    var bottlePosition = byId('bottleObject') && byId('bottleObject').getAttribute('position');
    var bottleFrom = bottlePosition && typeof bottlePosition === 'object' ? [bottlePosition.x,bottlePosition.y,bottlePosition.z].join(' ') : bottlePosition;
    try {
      var next = E.dispatch(current, id, current.commands.length, 'ui-' + Date.now().toString(36) + '-' + (++eventSerial));
      abortStory();
      clearRoute(false);
      clearWater(false);
      clearRehearsal(true);
      clearPacking(false);
      clearWardrobe(false);
      clearUpdate(false);
      clearDeparture(false);
      exploredDeparture = null;
      current = next;
      if (id === 'hint') shownHint = true;
      render();
      if (id === 'fill_water' || id === 'pack_water') playWaterMoment(id, bottleFrom);
      persist();
      if (id === 'hint') byId('hintButton').focus({ preventScroll: true });
      else if (source === 'route') {
        text('routeStatus', latestView.feedback + ' Choosing a route takes no practice time.');
        byId('routeChosenTitle').focus();
      }
      else if (source === 'water') {
        text('waterStatus', latestView.feedback + ' Practice clock: ' + latestView.clock + '.');
        (latestView.scene.bottlePacked ? byId('waterReadyTitle') : byId('packAtTap')).focus();
      }
      else if (source === 'packing') (byId('packingItems').querySelector('button:not(:disabled)') || byId('packingWorkbench').querySelector('summary')).focus();
      else if (source === 'wardrobe') byId('wardrobeReadyTitle').focus();
      else if (source === 'update') byId('updateReadStatus').focus();
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
    byId('openWater').hidden = v.completed || station.id !== 'kitchen' || selectedObject === 'bottle';
    byId('openPacking').hidden = v.completed || (station.id !== 'kitchen' && station.id !== 'entry');
    byId('openWardrobe').hidden = v.completed || station.id !== 'wardrobe';
    byId('openUpdates').hidden = v.completed || station.id !== 'entry' || !v.event;
    byId('openRoutes').hidden = v.completed || station.id !== 'travel';
    byId('openDeparture').hidden = v.completed || station.id !== 'travel' || selectedObject === 'route';
    byId('backToDeparture').hidden = v.completed || !departureVisited || station.id === 'travel';
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
    renderRouteWorkbench();
    renderWaterWorkbench();
    renderPackingWorkbench();
    renderWardrobeWorkbench();
    renderUpdateWorkbench();
    renderDepartureWorkbench();
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
  function clearWater(collapse) {
    clearWaterMotion(); text('waterStatus', '');
    if (collapse) byId('waterWorkbench').open = false;
  }
  function clearWaterMotion() {
    if (waterMotionTimer !== null) window.clearTimeout(waterMotionTimer);
    waterMotionTimer = null; waterMoment = null;
    var bottle = byId('bottleObject'); if (bottle) bottle.removeAttribute('animation__transfer');
    var stream = byId('tapStream'); if (stream) stream.setAttribute('visible', false);
    var cap = byId('bottleCap'); if (cap) cap.setAttribute('visible', true);
    if (latestView) { renderWaterWorkbench(); updateScene(); }
  }
  function waterIllustration() {
    var s = latestView.scene, svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 320 184'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', waterMoment ? 'water-moment-' + waterMoment : '');
    function shape(tag, attrs, parent) {
      var el = document.createElementNS(svg.namespaceURI, tag);
      Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); }); (parent || svg).appendChild(el); return el;
    }
    shape('rect', {x:4,y:4,width:312,height:176,rx:16,fill:'#e8f1ed'});
    shape('rect', {x:16,y:24,width:165,height:132,rx:10,fill:'#d6e9e4'});
    shape('path', {d:'M42 138V54Q42 34 63 34H92Q115 34 115 57V66',fill:'none',stroke:'#587275','stroke-width':10,'stroke-linecap':'round'});
    shape('path', {d:'M42 138V54Q42 34 63 34H92Q115 34 115 57V66',fill:'none',stroke:'#99b4b5','stroke-width':4,'stroke-linecap':'round'});
    shape('path', {d:'M29 81H55',stroke:'#587275','stroke-width':7,'stroke-linecap':'round'});
    shape('rect', {x:16,y:148,width:170,height:12,rx:4,fill:'#b6c9bc'});
    shape('ellipse', {cx:114,cy:148,rx:48,ry:7,fill:'#7f9e9d'});
    shape('path', {d:'M205 162H301',stroke:'#b7cbbd','stroke-width':4,'stroke-linecap':'round'});
    shape('path', {d:'M232 110V98Q232 80 250 80Q268 80 268 98V110',fill:'none',stroke:'#a86e54','stroke-width':7});
    shape('rect', {x:208,y:106,width:84,height:54,rx:10,fill:'#c38c70',stroke:'#80523f','stroke-width':2});
    if (waterMoment === 'fill' && !s.bottlePacked) shape('path', {d:'M115 69V98',stroke:'#4595a0','stroke-width':4,'stroke-linecap':'round',class:'water-picture-stream'});
    var location = shape('g', {transform:s.bottlePacked?'translate(234 71)':'translate(97 87)'});
    var bottle = shape('g', {class:'water-picture-bottle'}, location);
    shape('rect', {x:0,y:9,width:36,height:51,rx:10,fill:'#f5fbf9',stroke:'#375762','stroke-width':2}, bottle);
    if (s.bottleFilled) shape('path', {d:'M3 29H33V49Q33 57 25 57H11Q3 57 3 49Z',fill:'#4595a0',class:'water-picture-level'}, bottle);
    shape('rect', {x:8,y:0,width:20,height:11,rx:3,fill:'#375762',visibility:waterMoment==='fill'?'hidden':'visible'}, bottle);
    shape('path', {d:'M7 20V26',stroke:'#fffef9','stroke-width':3,'stroke-linecap':'round'}, bottle);
    if (s.bottlePacked) shape('rect', {x:216,y:119,width:68,height:34,rx:6,fill:'#b57859',stroke:'#80523f','stroke-width':2});
    return svg;
  }
  function renderWaterWorkbench() {
    var v = latestView, panel = byId('waterWorkbench');
    panel.hidden = selectedObject !== 'bottle' || v.completed;
    if (panel.hidden) return;
    var actions = v.stations.find(function (station) { return station.id === 'kitchen'; }).actions;
    var fill = actions.find(function (action) { return action.id === 'fill_water'; });
    var pack = actions.find(function (action) { return action.id === 'pack_water'; });
    byId('waterIllustration').replaceChildren(waterIllustration());
    text('waterPictureCaption', v.scene.bottlePacked ? 'Filled water bottle · in your bag' : v.scene.bottleFilled ? 'Filled water bottle · on the counter' : 'Empty water bottle · on the counter');
    text('waterFillState', v.scene.bottleFilled ? 'Done · water inside' : 'Ready to fill');
    text('waterPackState', v.scene.bottlePacked ? 'Done · packed' : v.scene.bottleFilled ? 'Ready to pack' : 'Fill the bottle first');
    byId('waterFillStep').classList.toggle('water-step-done', v.scene.bottleFilled);
    byId('waterPackStep').classList.toggle('water-step-done', v.scene.bottlePacked);
    byId('fillAtTap').disabled = !fill || fill.disabled; byId('packAtTap').disabled = !pack || pack.disabled;
    text('waterFillReason', fill && fill.reason); text('waterPackReason', pack && pack.reason);
    byId('waterReady').hidden = !v.scene.bottlePacked;
  }
  function openWaterWorkbench() {
    if (latestView.completed) return;
    selectObject('bottle', false);
    (latestView.scene.bottlePacked ? byId('waterReadyTitle') : latestView.scene.bottleFilled ? byId('packAtTap') : byId('fillAtTap')).focus();
  }
  function prepareWater(id) {
    if (latestView.completed || selectedObject !== 'bottle') return;
    var action = latestView.stations.find(function (station) { return station.id === 'kitchen'; }).actions.find(function (item) { return item.id === id; });
    if (!action || action.disabled) return;
    act(id, 'water');
  }
  function playWaterMoment(id, from) {
    if (latestView.completed || motionPreference && motionPreference.matches || document.hidden) return;
    waterMoment = id === 'fill_water' ? 'fill' : 'pack'; renderWaterWorkbench();
    if (sceneReady && !byId('sceneContainer').hidden) {
      if (waterMoment === 'fill') { byId('tapStream').setAttribute('visible', true); byId('bottleCap').setAttribute('visible', false); }
      else if (from) byId('bottleObject').setAttribute('animation__transfer', 'property: position; from: ' + from + '; to: 2.08 1.05 -1.61; dur: 600; easing: easeInOutCubic');
    }
    waterMotionTimer = window.setTimeout(clearWaterMotion, 650);
  }
  function motionPreferenceChanged(event) { if (event.matches) clearWaterMotion(); }
  if (motionPreference && motionPreference.addEventListener) motionPreference.addEventListener('change', motionPreferenceChanged);
  document.addEventListener('visibilitychange', function () { if (document.hidden) clearWaterMotion(); });
  function clearPacking(collapse) {
    packingSelection = null;
    text('packingStatus', '');
    byId('packingFill').hidden = true;
    byId('packingPlace').disabled = true;
    if (collapse) byId('packingWorkbench').open = false;
  }
  function packingAction(id) {
    return latestView.stations.reduce(function (all, station) { return all.concat(station.actions); }, []).find(function (action) { return action.id === packingActions[id]; });
  }
  function packingIcon(id) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 80 80');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    function shape(tag, attrs) {
      var el = document.createElementNS(svg.namespaceURI, tag);
      Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); });
      svg.appendChild(el);
    }
    if (id === 'bottle') {
      shape('rect', {x:26,y:18,width:28,height:54,rx:10,fill:'#e6f3ee',stroke:'#375762','stroke-width':2});
      if (latestView.scene.bottleFilled) shape('path', {d:'M28 39H52V61Q52 70 44 70H36Q28 70 28 61Z',fill:'#4595a0'});
      shape('rect', {x:31,y:9,width:18,height:11,rx:3,fill:'#375762'});
      shape('path', {d:'M32 27V34',stroke:'#fffef9','stroke-width':3,'stroke-linecap':'round'});
    } else if (id === 'card') {
      shape('rect', {x:12,y:18,width:56,height:44,rx:6,fill:'#fff8e6',stroke:'#88785d','stroke-width':2});
      shape('circle', {cx:27,cy:34,r:7,fill:'#c5d8bc'});
      shape('path', {d:'M42 31H58M42 38H54M22 50H58',stroke:'#596c5d','stroke-width':3,'stroke-linecap':'round'});
    } else if (id === 'raincoat') {
      shape('path', {d:'M30 22Q40 6 50 22L66 32L73 51L60 56L53 42V72H27V42L20 56L7 51L14 32Z',fill:'#d5a845',stroke:'#7b6048','stroke-width':2,'stroke-linejoin':'round'});
      shape('path', {d:'M31 23Q40 37 49 23M40 33V70',fill:'none',stroke:'#7b6048','stroke-width':2});
    } else {
      shape('ellipse', {cx:40,cy:52,rx:32,ry:10,fill:'#c49a68',stroke:'#7b6048','stroke-width':2});
      shape('path', {d:'M22 49L27 28Q40 18 53 28L58 49Q40 57 22 49Z',fill:'#e1bd8b',stroke:'#7b6048','stroke-width':2});
      shape('path', {d:'M25 40Q40 47 55 40',fill:'none',stroke:'#80523f','stroke-width':5});
    }
    return svg;
  }
  function renderPackingWorkbench() {
    var v = latestView, panel = byId('packingWorkbench');
    panel.hidden = selectedObject !== 'bag' || v.completed;
    if (panel.hidden) return;
    var tray = byId('packingItems'); tray.replaceChildren();
    Object.keys(packingActions).forEach(function (id) {
      var object = v.objects.find(function (item) { return item.id === id; });
      var packed = id === 'bottle' ? v.scene.bottlePacked : id === 'card' ? v.scene.documentPacked : v.inventory.some(function (item) { return item.id === id; });
      var button = node('button', 'packing-item'); button.type = 'button'; button.dataset.packItem = id;
      button.disabled = packed; button.setAttribute('aria-pressed', String(packingSelection === id));
      button.append(packingIcon(id), node('span', 'packing-item-name', object.label), node('span', 'packing-item-state', object.status));
      if (packingSelection === id) button.appendChild(node('span', 'packing-selected', 'Selected'));
      button.addEventListener('click', function () {
        if (latestView.completed || selectedObject !== 'bag') return;
        packingSelection = id; byId('packingFill').hidden = true;
        renderPackingWorkbench(); highlightObjects();
        text('packingStatus', object.label + ' selected. ' + object.status + '. Choose the bag button to pack it.');
        byId('packingPlace').focus();
      });
      tray.appendChild(button);
    });
    var contents = byId('packingContents'); contents.replaceChildren();
    var water = v.inventory.find(function (item) { return item.id === 'water'; });
    var card = v.inventory.find(function (item) { return item.id === 'document'; });
    var weather = v.inventory.find(function (item) { return item.id === 'raincoat' || item.id === 'hat'; });
    [['Filled water', water], ['Outing card', card], ['Weather item', weather]].forEach(function (slot) {
      var li = node('li', slot[1] ? 'packing-packed' : '');
      var mark = node('span', 'packing-mark', slot[1] ? '✓' : '○'); mark.setAttribute('aria-hidden', 'true');
      var copy = node('span'); copy.append(node('strong', '', slot[0]), node('span', '', slot[1] ? slot[1].label + ' · packed' : 'To pack'));
      li.append(mark, copy); contents.appendChild(li);
    });
    text('packingCount', [water, card, weather].filter(Boolean).length + ' of 3 packed');
    byId('packingPlace').disabled = !packingSelection;
    var action = packingSelection && packingAction(packingSelection);
    byId('packingPlace').textContent = action ? action.label : 'Put selected item in your bag';
    var forecast = v.objects.find(function (item) { return item.id === 'forecast'; });
    text('packingForecast', 'Weather note: ' + forecast.status + '. Check it when choosing what to pack.');
    text('packingSwapNote', weather ? 'Choose the other weather item to swap it with your ' + weather.label.toLowerCase() + '. The first item returns to its hook.' : 'Your bag holds one weather item. You can swap it if the forecast changes.');
  }
  function openPackingWorkbench() {
    if (latestView.completed) return;
    selectObject('bag', false); byId('packingWorkbench').open = true;
    (byId('packingItems').querySelector('button:not(:disabled)') || byId('packingWorkbench').querySelector('summary')).focus();
  }
  function placePackingItem() {
    if (latestView.completed || selectedObject !== 'bag' || !packingSelection) return;
    var action = packingAction(packingSelection);
    if (!action || action.disabled) {
      text('packingStatus', action && action.reason || 'Choose another item to pack.');
      byId('packingFill').hidden = packingSelection !== 'bottle' || latestView.scene.bottleFilled;
      return;
    }
    act(action.id, 'packing');
  }
  function clearWardrobe(collapse) {
    wardrobePreview = null;
    text('wardrobeStatus', '');
    byId('wardrobePreviewResult').hidden = true;
    byId('prepareOutfit').disabled = true;
    if (collapse) byId('wardrobeWorkbench').open = false;
  }
  function wardrobeTiming(preview) {
    var clockChange = preview.changes.find(function (change) { return change.label === 'Practice clock'; });
    function minute(value) { var parts = value.split(':'); return Number(parts[0]) * 60 + Number(parts[1]) - 540; }
    var after = minute(clockChange.after), before = minute(clockChange.before);
    return { before: clockChange.before, after: clockChange.after, minutes: after - before, travel: E.travelAt(current, after) };
  }
  function wardrobeIcon(needsDrying) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    function shape(tag, attrs) {
      var el = document.createElementNS(svg.namespaceURI, tag);
      Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); }); svg.appendChild(el);
    }
    shape('path', {d:'M46 11Q46 3 52 5Q60 9 51 16V20M27 30L51 20L75 30Z',fill:'none',stroke:'#7b6048','stroke-width':2,'stroke-linejoin':'round'});
    shape('path', {d:'M38 27Q50 37 62 27L81 39L73 53L63 47V74H37V47L27 53L19 39Z',fill:needsDrying?'#f3d27f':'#659884',stroke:'#496557','stroke-width':2,'stroke-linejoin':'round'});
    shape('path', {d:'M38 76H62L67 95H54L50 83L46 95H33Z',fill:'#5e7784',stroke:'#375762','stroke-width':2,'stroke-linejoin':'round'});
    if (needsDrying) shape('path', {d:'M87 56Q79 66 79 71A8 8 0 0 0 95 71Q95 66 87 56Z',fill:'#a8d2dc',stroke:'#375762','stroke-width':2});
    return svg;
  }
  function renderWardrobeWorkbench() {
    var v = latestView, panel = byId('wardrobeWorkbench');
    panel.hidden = selectedObject !== 'outfit' || v.completed;
    if (panel.hidden) return;
    var ready = v.scene.clothingReady, options = byId('wardrobeOptions'); options.replaceChildren();
    options.hidden = ready; byId('wardrobeTimeKey').hidden = ready;
    text('wardrobeInstructions', ready ? 'Your outfit is prepared. Continue packing, or use your choice history to try another way.' : 'Explore an outfit to see when it would be ready. Compare the time for getting dressed with your travel plan.');
    Object.keys(wardrobeNames).forEach(function (id) {
      var preview = ready ? null : E.previewAction(current, id), timing = preview && wardrobeTiming(preview);
      var button = node('button', 'wardrobe-option'); button.type = 'button'; button.dataset.outfit = id; button.disabled = ready;
      button.setAttribute('aria-pressed', String(!!wardrobePreview && wardrobePreview.actionId === id));
      button.append(wardrobeIcon(id === 'prepare_clothes'), node('strong', 'wardrobe-option-name', wardrobeNames[id]), node('span', 'wardrobe-condition', id === 'prepare_clothes' ? 'Dry before wearing' : 'Ready to wear'));
      if (timing) {
        button.appendChild(node('span', 'wardrobe-duration', timing.minutes + ' minutes to get ready'));
        var bar = node('span', 'wardrobe-time-bar'); bar.setAttribute('aria-hidden', 'true');
        for (var i = 0; i < 8; i++) bar.appendChild(node('i', i < timing.minutes ? 'time-used' : ''));
        button.appendChild(bar);
      }
      if (wardrobePreview && wardrobePreview.actionId === id) button.appendChild(node('span', 'wardrobe-selected', 'Selected for the example'));
      button.addEventListener('click', function () {
        if (latestView.completed || latestView.scene.clothingReady || selectedObject !== 'outfit') return;
        wardrobePreview = E.previewAction(current, id); renderWardrobeWorkbench();
        var example = wardrobeTiming(wardrobePreview), route = example.travel.routes.find(function (item) { return item.selected; });
        text('wardrobeStatus', wardrobeNames[id] + ' would be ready at ' + example.after + '.' + (route ? ' Your chosen ' + route.label + (route.available ? ' would arrive at ' + route.arrival + '.' : ' would have left by then.') : '') + ' The practice clock stays ' + latestView.clock + '.');
        byId('prepareOutfit').focus();
      });
      options.appendChild(button);
    });
    byId('wardrobeReady').hidden = !ready;
    if (ready) {
      var choice = E.history(current).find(function (entry) { return entry.actionId === 'wear_ready' || entry.actionId === 'prepare_clothes'; });
      text('wardrobeReadyCopy', choice.label + '. Your clothes were ready at ' + choice.clock + '. Review this choice in your history if you want to try another way.');
      clearWardrobe(false); return;
    }
    byId('wardrobePreviewResult').hidden = !wardrobePreview;
    byId('prepareOutfit').disabled = !wardrobePreview;
    if (!wardrobePreview) return;
    var example = wardrobeTiming(wardrobePreview);
    text('wardrobePreviewTitle', wardrobeNames[wardrobePreview.actionId]);
    text('wardrobeClock', 'Now ' + example.before + ' → clothes ready ' + example.after + ' · ' + example.minutes + ' minutes');
    var routes = byId('wardrobeRoutes'); routes.replaceChildren();
    example.travel.routes.forEach(function (route) {
      var li = node('li', route.selected ? 'wardrobe-chosen-route' : ''); li.dataset.outfitRoute = route.id;
      var label = node('span', '', route.label);
      if (route.selected) label.appendChild(node('small', '', 'Chosen in outing'));
      var result = node('span'); result.appendChild(node('strong', '', route.available ? 'Arrive ' + route.arrival : 'Bus missed'));
      result.appendChild(node('small', '', !route.available ? 'It would have left already' : route.minutesBeforeStart > 0 ? route.minutesBeforeStart + ' min before the start' : route.onTime ? 'At the start · no extra time' : Math.abs(route.minutesBeforeStart) + ' min after the start'));
      li.append(label, result); routes.appendChild(li);
    });
    text('wardrobeKnowledge', wardrobePreview.forecastMayChange ? 'This example uses the information you have now. Forecast and travel updates may change your plan as you prepare.' : 'This example uses the latest forecast and travel updates. Your other preparation still needs time.');
    text('prepareOutfit', wardrobePreview.label);
  }
  function openWardrobeWorkbench() {
    if (latestView.completed) return;
    selectObject('outfit', false);
    (latestView.scene.clothingReady ? byId('wardrobeReadyTitle') : byId('wardrobeOptions').querySelector('button:not(:disabled)')).focus();
  }
  function prepareSelectedOutfit() {
    if (latestView.completed || latestView.scene.clothingReady || selectedObject !== 'outfit' || !wardrobePreview) return;
    if (wardrobePreview.revision !== current.commands.length) { clearWardrobe(false); renderWardrobeWorkbench(); text('wardrobeStatus', 'The outing changed. Explore an outfit again.'); return; }
    act(wardrobePreview.actionId, 'wardrobe');
  }
  function clearUpdate(collapse) {
    updateTopic = null; byId('updateTopicResult').hidden = true;
    text('updateStatus', '');
    if (collapse) byId('updateWorkbench').open = false;
  }
  function receivedUpdate() {
    if (updateSnapshot) return updateSnapshot;
    if (!latestView.event) return null;
    // Reconstruct the received change from the journal; never infer future updates from settings.
    for (var revision = 1; revision <= current.commands.length; revision++) {
      var prefix = Object.assign({}, current, {commands: current.commands.slice(0, revision), content: []});
      var after = E.view(prefix);
      if (!after.event) continue;
      var before = E.view(Object.assign({}, prefix, {commands: current.commands.slice(0, revision - 1)}));
      updateSnapshot = {revision: revision, clock: after.clock,
        beforeForecast: before.objects.find(function (item) { return item.id === 'forecast'; }).status,
        afterForecast: after.objects.find(function (item) { return item.id === 'forecast'; }).status,
        beforeWeather: before.scene.weather, afterWeather: after.scene.weather,
        beforeBus: before.routes.find(function (route) { return route.id === 'bus'; }).arrival,
        afterBus: after.routes.find(function (route) { return route.id === 'bus'; }).arrival};
      return updateSnapshot;
    }
    return null;
  }
  function updateWeatherIcon(weather) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 80'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    function shape(tag, attrs) {
      var el = document.createElementNS(svg.namespaceURI, tag);
      Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); }); svg.appendChild(el);
    }
    if (weather === 'warm') {
      shape('circle', {cx:50,cy:40,r:19,fill:'#e5b653',stroke:'#8f702e','stroke-width':2});
      shape('path', {d:'M50 5V13M50 67V75M15 40H23M77 40H85M25 15L31 21M69 59L75 65M25 65L31 59M69 21L75 15',stroke:'#8f702e','stroke-width':3,'stroke-linecap':'round'});
    } else {
      shape('path', {d:'M24 52C6 52 7 30 24 30C24 8 56 6 61 27C86 18 99 53 75 53Z',fill:weather==='rain'?'#afc6d4':'#d1ddd6',stroke:'#587275','stroke-width':2,'stroke-linejoin':'round'});
      if (weather === 'rain') shape('path', {d:'M29 62L25 71M49 62L45 71M69 62L65 71',stroke:'#37758f','stroke-width':4,'stroke-linecap':'round'});
    }
    return svg;
  }
  function renderUpdateWorkbench() {
    var v = latestView, panel = byId('updateWorkbench');
    panel.hidden = selectedObject !== 'forecast' || !v.event || v.completed;
    if (panel.hidden) return;
    var received = receivedUpdate(); if (!received) { panel.hidden = true; return; }
    text('updateAfterTitle', 'Update at ' + received.clock);
    text('updateBeforeForecast', received.beforeForecast); text('updateAfterForecast', received.afterForecast);
    byId('updateBeforeIcon').replaceChildren(updateWeatherIcon(received.beforeWeather));
    byId('updateAfterIcon').replaceChildren(updateWeatherIcon(received.afterWeather));
    text('updateBeforeBus', '09:20 bus · arrival ' + received.beforeBus);
    text('updateAfterBus', '09:20 bus · arrival ' + received.afterBus);
    text('updateBusChange', received.beforeBus === received.afterBus ? 'The bus arrival time did not change in this update. Recheck your arrival as you prepare.' : 'The bus arrival moved from ' + received.beforeBus + ' to ' + received.afterBus + '. Compare it with the 09:35 start.');
    var read = v.stations.reduce(function (all, station) { return all.concat(station.actions); }, []).find(function (action) { return action.id === 'inspect_forecast'; });
    byId('readUpdateNote').disabled = !read || read.disabled;
    text('updateReadStatus', read && read.disabled ? 'You have read the latest note in this outing. You can keep reviewing your plan.' : 'Practice clock: ' + v.clock + '. Choose the reading action when you are ready.');
    var topics = byId('updateTopics'); topics.replaceChildren();
    [['weather', 'Weather item in my bag'], ['travel', 'My travel plan']].forEach(function (topic) {
      var button = node('button', 'update-topic', topic[1]); button.type = 'button'; button.dataset.updateTopic = topic[0];
      button.setAttribute('aria-pressed', String(updateTopic === topic[0]));
      button.addEventListener('click', function () {
        if (!latestView.event || latestView.completed || selectedObject !== 'forecast') return;
        updateTopic = topic[0]; renderUpdateWorkbench(); byId('updateTopicTitle').focus();
        text('updateStatus', topic[1] + ' review opened. The practice clock stays ' + latestView.clock + '.');
      }); topics.appendChild(button);
    });
    byId('updateTopicResult').hidden = !updateTopic;
    if (!updateTopic) return;
    var facts = byId('updateTopicFacts'); facts.replaceChildren();
    function fact(label, value) { facts.append(node('dt', '', label), node('dd', '', value)); }
    if (updateTopic === 'weather') {
      var packed = v.inventory.find(function (item) { return item.id === 'raincoat' || item.id === 'hat'; });
      text('updateTopicTitle', 'Weather and your bag'); fact('Received forecast', received.afterForecast); fact('Weather item packed now', packed ? packed.label : 'No weather item packed');
      text('updateTopicQuestion', 'A raincoat helps keep clothes dry. A sun hat gives shade. Does your packed item fit this forecast?');
      text('updateTopicAction', 'Open bag table');
    } else {
      text('updateTopicTitle', 'Travel and your plan'); fact('Outing start', '09:35'); fact('Chosen route now', v.travel ? v.travel.label : 'No route chosen');
      fact('Current arrival', v.travel ? v.travel.arrival + (v.travel.arrival === 'Unavailable' ? '' : v.travel.onTime ? ' · ' + v.travel.minutesBeforeStart + ' min before the start' : ' · ' + Math.abs(v.travel.minutesBeforeStart) + ' min after the start') : 'Choose a route to compare its arrival');
      text('updateTopicQuestion', 'Would your current plan still get you there in time? Compare another route if you need to change it.');
      text('updateTopicAction', 'Compare routes in the outing');
    }
  }
  function openUpdateWorkbench() {
    if (!latestView.event || latestView.completed) return;
    selectObject('forecast', false); byId('updateTopics').querySelector('button').focus();
  }
  function clearDeparture(collapse) {
    departureGuess = null; departureReview = null;
    byId('departureResult').hidden = true; byId('departFromCheck').disabled = true;
    text('departureStatus', '');
    if (collapse) byId('departureWorkbench').open = false;
  }
  function departureAction() {
    return latestView.stations.reduce(function (all, station) { return all.concat(station.actions); }, []).find(function (action) { return action.id === 'depart'; });
  }
  function departureMark(ready) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('class', 'departure-mark');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    var path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', ready ? 'M4 12L9 17L20 6' : 'M21 12A9 9 0 1 1 3 12A9 9 0 1 1 21 12');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path); return svg;
  }
  function renderDepartureWorkbench() {
    var v = latestView, panel = byId('departureWorkbench');
    panel.hidden = selectedObject !== 'route' || v.completed;
    if (panel.hidden) return;
    byId('departureGuesses').querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.departureGuess === departureGuess));
    });
    var fresh = departureReview && departureReview.revision === current.commands.length;
    byId('departureResult').hidden = !fresh;
    var depart = departureAction();
    byId('departFromCheck').disabled = !fresh || !depart || depart.disabled;
    if (!fresh) return;
    var checks = v.objectives.filter(function (objective) { return objective.id !== 'depart'; });
    text('departureResultTitle', checks.filter(function (check) { return check.complete; }).length + ' of ' + checks.length + ' preparation checks ready');
    var estimate = {ready: 'You expected to be ready. Compare that with the checks below.', prepare: 'You expected more preparation. Look at what is ready and what needs another check.', unsure: 'You were unsure. Use the current details to decide what to do next.'};
    text('departureEstimate', estimate[departureGuess] || 'Use these current details to decide what to do next.');
    var list = byId('departureChecks'); list.replaceChildren();
    checks.forEach(function (check) {
      var objectId = {clothing:'outfit', water:'bottle', document:'card', weather:'forecast', travel:'route'}[check.id];
      var object = v.objects.find(function (item) { return item.id === objectId; });
      var detail = object.status;
      if (check.id === 'weather') {
        var packed = v.inventory.find(function (item) { return item.id === 'raincoat' || item.id === 'hat'; });
        detail += '. ' + (packed ? packed.label + ' packed.' : 'No weather item packed.');
        if (!v.event) detail += ' Wait for the forecast update as you prepare.';
      } else if (check.id === 'travel' && v.travel) {
        detail = v.travel.label + ' · arrival ' + v.travel.arrival + (v.travel.arrival === 'Unavailable' ? '.' : v.travel.onTime ? ' · by the 09:35 start.' : ' · after the 09:35 start.');
      }
      var row = node('li', 'departure-check' + (check.complete ? ' departure-ready' : '')); row.dataset.departureCheck = check.id;
      var mark = departureMark(check.complete);
      var copy = node('div', 'departure-check-copy');
      copy.append(node('strong', '', check.label), node('span', 'departure-check-state', check.complete ? 'Ready' : 'To check'), node('p', '', detail));
      var button = node('button', 'quiet-button', {clothing:'Review clothes', water:'Review water', document:'Review outing card', weather:'Review forecast and bag', travel:'Compare travel choices'}[check.id]);
      button.type = 'button'; button.dataset.departureTarget = check.id;
      button.addEventListener('click', function () { openDepartureTarget(check.id); });
      copy.appendChild(button); row.append(mark, copy); list.appendChild(row);
    });
    text('departureNext', depart && !depart.disabled ? 'Your preparation is ready. Choose to leave when you are ready.' : 'Review a check above, prepare what you need, then recheck before leaving.');
  }
  function openDepartureWorkbench() {
    if (latestView.completed) return;
    selectObject('route', false);
    byId('departureGuesses').querySelector('button').focus();
  }
  function checkDepartureReadiness() {
    if (latestView.completed || selectedObject !== 'route') return;
    departureReview = {revision: current.commands.length}; renderDepartureWorkbench();
    byId('departureResultTitle').focus();
    text('departureStatus', 'Current outing checked at ' + latestView.clock + '. Checking takes no practice time.');
  }
  function openDepartureTarget(id) {
    if (latestView.completed || selectedObject !== 'route' || !departureReview || departureReview.revision !== current.commands.length) return;
    if (id === 'clothing') openWardrobeWorkbench();
    else if ((id === 'water' && latestView.scene.bottleFilled && !latestView.scene.bottlePacked) || (id === 'document' && !latestView.scene.documentPacked)) {
      openPackingWorkbench();
      byId('packingItems').querySelector('[data-pack-item="' + (id === 'water' ? 'bottle' : 'card') + '"]').focus();
    } else if (id === 'weather' && latestView.event) {
      openUpdateWorkbench(); updateTopic = 'weather'; renderUpdateWorkbench(); byId('updateTopicTitle').focus();
    } else if (id === 'travel') {
      openRouteWorkbench();
    } else {
      if (id === 'water' && !latestView.scene.bottleFilled) { openWaterWorkbench(); return; }
      selectObject({water:'bottle', document:'card', weather:'forecast'}[id], false);
      (byId('actionList').querySelector('button:not(:disabled)') || byId('objectTitle')).focus();
    }
  }
  function leaveFromDepartureCheck() {
    var depart = departureAction();
    if (latestView.completed || selectedObject !== 'route' || !departureReview || departureReview.revision !== current.commands.length || !depart || depart.disabled) return;
    act('depart', 'departure');
  }
  function clearRoute(collapse) {
    routePreview = null; byId('routePreviewResult').hidden = true; byId('confirmRoute').disabled = true;
    text('routeStatus', '');
    if (collapse) byId('routeWorkbench').open = false;
  }
  function routeOutcome(route) {
    if (!route.available) return 'This bus has already left.';
    if (route.minutesBeforeStart === 0) return 'At the 09:35 start · no extra time.';
    return Math.abs(route.minutesBeforeStart) + ' min ' + (route.onTime ? 'before' : 'after') + ' the 09:35 start.';
  }
  function routeIcon(id) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 96 72'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    function shape(tag, attrs) {
      var el = document.createElementNS(svg.namespaceURI, tag);
      Object.keys(attrs).forEach(function (key) { el.setAttribute(key, attrs[key]); }); svg.appendChild(el);
    }
    shape('rect', {x:2,y:2,width:92,height:68,rx:16,fill:'#e6efe4'});
    shape('path', {d:'M14 61H82',stroke:'#849e89','stroke-width':2,'stroke-linecap':'round'});
    if (id === 'walk') {
      shape('circle', {cx:44,cy:16,r:6,fill:'#d4ad8c',stroke:'#596c5d','stroke-width':2});
      shape('path', {d:'M43 24L38 39L50 45L55 59M39 39L28 58M42 26L56 35L64 34M41 28L30 37',fill:'none',stroke:'#346959','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'});
    } else if (id === 'ride') {
      shape('path', {d:'M20 39L29 26H60L72 39L79 43V55H17V44Z',fill:'#c99874',stroke:'#80523f','stroke-width':2,'stroke-linejoin':'round'});
      shape('path', {d:'M32 29H43V39H25ZM47 29H59L68 39H47Z',fill:'#e8f4f0',stroke:'#80523f','stroke-width':1.5});
      shape('path', {d:'M51 45H56',stroke:'#80523f','stroke-width':2,'stroke-linecap':'round'});
      [29,67].forEach(function (x) { shape('circle', {cx:x,cy:55,r:6,fill:'#375762'}); shape('circle', {cx:x,cy:55,r:2.5,fill:'#d6e9e4'}); });
    } else {
      shape('rect', {x:20,y:14,width:57,height:42,rx:8,fill:id==='late_bus'?'#c39b56':'#629b9c',stroke:'#375762','stroke-width':2});
      shape('rect', {x:26,y:21,width:44,height:16,rx:3,fill:'#eef7ee'});
      shape('path', {d:'M41 21V37M56 21V37M25 45H71',stroke:'#375762','stroke-width':2});
      [31,66].forEach(function (x) { shape('circle', {cx:x,cy:56,r:6,fill:'#375762'}); shape('circle', {cx:x,cy:56,r:2.5,fill:'#d6e9e4'}); });
    }
    return svg;
  }
  function renderRouteWorkbench() {
    var v = latestView, panel = byId('routeWorkbench');
    panel.hidden = selectedObject !== 'route' || v.completed;
    if (panel.hidden) return;
    // Actual route choices always use the current clock, independently of the later-departure explorer.
    var timing = E.travelAt(current), options = byId('routeOptions'); options.replaceChildren();
    text('routeClock', 'Practice clock: ' + timing.practiceClock + ' · outing starts at 09:35');
    timing.routes.forEach(function (route) {
      var button = node('button', 'route-option' + (route.onTime ? '' : ' route-option-late')); button.type = 'button'; button.dataset.routeOption = route.id;
      button.setAttribute('aria-pressed', String(!!routePreview && routePreview.id === route.id));
      button.append(routeIcon(route.id), node('strong', 'route-option-name', route.label), node('span', 'route-option-arrival', route.available ? 'Arrive ' + route.arrival : 'Bus missed'), node('span', 'route-option-outcome', routeOutcome(route)));
      if (route.selected) button.appendChild(node('span', 'route-actual-badge', 'Chosen in outing'));
      if (routePreview && routePreview.id === route.id) button.appendChild(node('span', 'route-preview-badge', 'Exploring this route'));
      button.addEventListener('click', function () {
        if (latestView.completed || selectedObject !== 'route' || !byId('routeWorkbench').open || !latestView.routes.some(function (item) { return item.id === route.id; })) return;
        routePreview = {id:route.id, revision:current.commands.length}; renderRouteWorkbench();
        (byId('confirmRoute').disabled ? byId('routePreviewTitle') : byId('confirmRoute')).focus();
        text('routeStatus', route.label + ' example opened. The practice clock stays ' + latestView.clock + '.');
      }); options.appendChild(button);
    });
    text('routeKnowledge', timing.forecastMayChange ? 'These arrivals use the information available now. Recheck after the forecast or travel update.' : 'These arrivals use the latest received forecast and travel information.');
    byId('routeChosen').hidden = !v.travel;
    if (v.travel) text('routeChosenSummary', v.travel.label + ' · arrival ' + v.travel.arrival + '. ' + routeOutcome(timing.routes.find(function (route) { return route.selected; })));
    var route = routePreview && routePreview.revision === current.commands.length && timing.routes.find(function (item) { return item.id === routePreview.id; });
    byId('routePreviewResult').hidden = !route; byId('confirmRoute').disabled = true;
    if (!route) return;
    text('routePreviewTitle', route.label + ' · leave at ' + timing.preparationTime);
    var journey = byId('routeJourney'); journey.replaceChildren();
    var wait = route.scheduledDeparture === null ? ['Start the journey', timing.preparationTime] : ['Wait at the stop', route.available ? route.waitingMinutes + ' min' : 'Bus already left'];
    [wait, ['Travel', route.travelMinutes + ' min'], ['Arrive', route.available ? route.arrival : 'Unavailable']].forEach(function (part, index) {
      var li = node('li', index === 0 && route.scheduledDeparture !== null ? 'route-waiting' : '');
      li.append(node('span', '', part[0]), node('strong', '', part[1])); journey.appendChild(li);
    });
    text('routeArrivalNote', routeOutcome(route));
    text('routePreparationNote', timing.preparationReady ? 'Your clothes and bag are ready. Recheck arrival if your plan changes.' : 'These times assume no more preparation. Finish your clothes and bag, then compare arrival again.');
    var action = v.stations.find(function (station) { return station.id === 'travel'; }).actions.find(function (item) { return item.id === routeActions[route.id]; });
    byId('confirmRoute').disabled = !action || action.disabled;
    text('confirmRoute', action && action.disabled ? 'Already your chosen route' : 'Use this route in my outing');
    text('routeConfirmReason', action && action.reason);
  }
  function openRouteWorkbench() {
    if (latestView.completed) { selectObject('route', true); return; }
    selectObject('route', false); byId('departureWorkbench').open = false; byId('routeWorkbench').open = true;
    byId('routeOptions').querySelector('button').focus();
  }
  function confirmExploredRoute() {
    if (latestView.completed || selectedObject !== 'route' || !byId('routeWorkbench').open || !routePreview || routePreview.revision !== current.commands.length) return;
    var action = latestView.stations.find(function (station) { return station.id === 'travel'; }).actions.find(function (item) { return item.id === routeActions[routePreview.id]; });
    if (!action || action.disabled) return;
    act(action.id, 'route');
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
    byId('reviewUpdate').hidden = v.completed;
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
  function sceneLabel(value, attrs, parent, style) {
    var previous = byId(attrs.id);
    if (previous && previous.dataset.noteText === value) return previous;
    if (previous) {
      var canvas = byId(previous.dataset.canvasId); if (canvas) canvas.remove(); previous.remove();
    }
    var plane = textPlane(value, attrs, parent, style); plane.dataset.noteText = value;
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
            if (id === selectedObject || id === hoveredObject || id === packingSelection) { material.emissive.set('#39725b'); material.emissiveIntensity = .4; }
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
    var tap = entity('a-entity', {id:'tapObject'}, kitchen);
    cylinder(-3.35,1.48,-2.16,.025,.72,'#587275',tap);
    cylinder(-3.35,1.84,-2.02,.025,.29,'#587275',tap,{rotation:'90 0 0'});
    cylinder(-3.35,1.8,-1.88,.032,.1,'#587275',tap);
    cylinder(-3.35,1.65,-1.88,.015,.25,'#4595a0',kitchen,{id:'tapStream',visible:false,material:'opacity: .7; transparent: true'});
    var bottle = entity('a-entity',{id:'bottleObject',position:'-2.1 1.32 -1.8'},kitchen);
    cylinder(0,0,0,.105,.39,'#8ecbd0',bottle,{class:'pickable',material:'opacity: .7; transparent: true'});
    cylinder(0,-.1,0,.097,.03,'#21778c',bottle,{id:'bottleWater'});
    cylinder(0,.23,0,.075,.085,'#375762',bottle,{id:'bottleCap'});
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
    box(1.64,2.3,-2.48,1.32,.48,.06,'#fff6d8',forecast,{id:'forecastBoard'});
    sceneLabel('Cloudy · update expected',{id:'forecastNote',position:'1.64 2.3 -2.435',width:1.22,height:.31,class:'pickable'},forecast);
    textPlane('PACKING',{position:'1.62 .13 -.83',rotation:'-25 0 0'},entry);
    var travel=stationGroup('travel');
    box(3.17,1.3,-2.57,1.13,2.6,.2,'#f4ecda',travel);
    box(3.17,1.23,-2.44,.95,2.4,.02,'#83ac98',travel);
    var hinge=entity('a-entity',{id:'doorHinge',position:'2.72 0 -2.4'},travel);
    box(.45,1.23,.03,.9,2.4,.09,'#719c89',hinge,{class:'pickable'});
    box(.45,1.46,.09,.62,1.53,.025,'#82ac98',hinge);
    entity('a-sphere',{position:'.77 1.17 .13',radius:.045,color:'#efd697'},hinge);
    sceneLabel('Check before leaving',{id:'departureSign',position:'.45 2.12 .13',width:.8,height:.24,class:'pickable'},hinge,{background:'#fff6d8'});
    sceneLabel('Choose a route',{id:'routeSign',position:'.45 .72 .13',width:.8,height:.26,class:'pickable'},hinge,{background:'#fff6d8'});
    box(3.15,.045,-1.26,1.15,.03,.56,'#83957e',travel,{class:'pickable'});
    textPlane('HEAD OUT',{position:'3.12 .13 -.83',rotation:'-25 0 0',width:1.4},travel);
    [['bottleObject','bottle'],['tapObject','bottle'],['shirtObject','outfit'],['clothesFolded','outfit'],['documentObject','card'],['packedDocument','card'],['forecastObject','forecast'],['weatherObject','raincoat'],['hatObject','hat'],['bagObject','bag'],['doorHinge','route']].forEach(function (pair) { attachObject(byId(pair[0]),pair[1]); });
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
    byId('bottleObject').setAttribute('position',s.bottlePacked?'2.08 1.05 -1.61':s.bottleFilled?'-3.35 1.32 -1.88':'-2.1 1.32 -1.8');
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
    byId('forecastBoard').setAttribute('color',latestView.event?'#e5c788':'#fff6d8');
    var noteText = s.busDelayed ? 'Rain · bus arrives 09:45' : s.weather === 'cloudy' ? 'Cloudy · update expected' : s.weather === 'rain' ? 'Updated forecast · rain' : 'Updated forecast · warm';
    sceneLabel(noteText,{id:'forecastNote',position:'1.64 2.3 -2.435',width:1.22,height:.31,class:'pickable'},byId('forecastObject'));
    var depart = departureAction(), ready = depart && !depart.disabled;
    sceneLabel(s.departed ? 'Outing complete' : ready ? 'Ready to leave' : 'Check before leaving',{id:'departureSign',position:'.45 2.12 .13',width:.8,height:.24,class:'pickable'},byId('doorHinge'),{background:ready || s.departed ? '#e4eedc' : '#fff6d8'});
    var routeSign = sceneLabel(latestView.travel ? latestView.travel.label + ' · ' + latestView.travel.arrival : 'Choose a route',{id:'routeSign',position:'.45 .72 .13',width:.8,height:.26,class:'pickable'},byId('doorHinge'),{background:latestView.travel && !latestView.travel.onTime ? '#f5dfb1' : '#fff6d8'});
    if (!routeSign.dataset.routeControl) {
      routeSign.dataset.routeControl = 'true';
      routeSign.addEventListener('click', function (event) { event.stopPropagation(); openRouteWorkbench(); });
    }
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
    clearWaterMotion();
    sceneHidden=!sceneHidden;byId('sceneContainer').hidden=sceneHidden;this.setAttribute('aria-pressed',String(sceneHidden));this.textContent=sceneHidden?'Show 3D view':'Hide 3D view';
    byId('focusView').disabled=sceneHidden;
    var scene=byId('outingScene'); if (scene.canvas) scene.canvas.setAttribute('tabindex','-1');if(sceneHidden&&scene.pause)scene.pause();if(!sceneHidden&&scene.play){scene.play();window.dispatchEvent(new Event('resize'));}
    announce(sceneHidden?'3D view hidden. All practice actions remain available.':'3D view shown.');
  });
  byId('focusView').addEventListener('click',function(){
    closeView=!closeView;this.setAttribute('aria-pressed',String(closeView));this.textContent=closeView?'Whole room':'Closer view';fitScene();
    announce(closeView?'Closer view of the selected station. Use the action buttons below the room.':'Whole room shown.');
  });
  byId('travelPreview').addEventListener('click',openRouteWorkbench);
  byId('openRoutes').addEventListener('click',openRouteWorkbench);
  byId('confirmRoute').addEventListener('click',confirmExploredRoute);
  byId('compareRouteAgain').addEventListener('click',function(){
    if(latestView.completed||selectedObject!=='route'||!routePreview||!byId('routeWorkbench').open)return;
    var option=Array.from(byId('routeOptions').querySelectorAll('button')).find(function(button){return button.dataset.routeOption===routePreview.id;});
    if(option)option.focus();
  });
  byId('routeToDeparture').addEventListener('click',function(){if(latestView.completed)return;openDepartureWorkbench();checkDepartureReadiness();});
  byId('routeToExplorer').addEventListener('click',openTravelExplorer);
  byId('openPacking').addEventListener('click', openPackingWorkbench);
  byId('openWater').addEventListener('click', openWaterWorkbench);
  byId('fillAtTap').addEventListener('click', function () { prepareWater('fill_water'); });
  byId('packAtTap').addEventListener('click', function () { prepareWater('pack_water'); });
  byId('waterToBag').addEventListener('click', openPackingWorkbench);
  byId('openWardrobe').addEventListener('click', openWardrobeWorkbench);
  byId('reviewUpdate').addEventListener('click', openUpdateWorkbench);
  byId('openUpdates').addEventListener('click', openUpdateWorkbench);
  byId('openDeparture').addEventListener('click', openDepartureWorkbench);
  byId('backToDeparture').addEventListener('click', function () { openDepartureWorkbench(); checkDepartureReadiness(); });
  byId('departureGuesses').querySelectorAll('button').forEach(function (button) {
    button.addEventListener('click', function () {
      if (latestView.completed || selectedObject !== 'route') return;
      clearDeparture(false); departureGuess = button.dataset.departureGuess; renderDepartureWorkbench();
      byId('checkDeparture').focus();
    });
  });
  byId('checkDeparture').addEventListener('click', checkDepartureReadiness);
  byId('departFromCheck').addEventListener('click', leaveFromDepartureCheck);
  byId('readUpdateNote').addEventListener('click', function () {
    if (!latestView.event || latestView.completed || selectedObject !== 'forecast' || byId('readUpdateNote').disabled) return;
    act('inspect_forecast', 'update');
  });
  byId('updateTopicAction').addEventListener('click', function () {
    if (!latestView.event || latestView.completed || selectedObject !== 'forecast') return;
    if (updateTopic === 'weather') openPackingWorkbench();
    else if (updateTopic === 'travel') openRouteWorkbench();
  });
  byId('prepareOutfit').addEventListener('click', prepareSelectedOutfit);
  byId('wardrobeToBag').addEventListener('click', openPackingWorkbench);
  byId('packingPlace').addEventListener('click', placePackingItem);
  byId('packingFill').addEventListener('click', function () {
    if (latestView.completed || packingSelection !== 'bottle' || latestView.scene.bottleFilled) return;
    openWaterWorkbench();
  });
  byId('exploreTravel').addEventListener('click',openTravelExplorer);
  byId('openTravelLab').addEventListener('click',openTravelExplorer);
  byId('departureTime').addEventListener('input',function(){exploreDeparture(Number(this.value),false);});
  byId('departureTime').addEventListener('change',function(){exploreDeparture(Number(this.value),true);});
  byId('earlierDeparture').addEventListener('click',function(){exploreDeparture(Number(byId('departureTime').value)-1,true);if(this.disabled)byId('departureTime').focus();});
  byId('laterDeparture').addEventListener('click',function(){exploreDeparture(Number(byId('departureTime').value)+1,true);if(this.disabled)byId('departureTime').focus();});
  byId('resetDeparture').addEventListener('click',function(){exploredDeparture=null;var timing=renderTravelLab();text('travelLabStatus','Example reset to '+timing.preparationTime+'.');byId('departureTime').focus();});
  byId('returnToTravel').addEventListener('click',openRouteWorkbench);
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
  window.addEventListener('beforeunload',function(){abortStory();clearWaterMotion();if(motionPreference&&motionPreference.removeEventListener)motionPreference.removeEventListener('change',motionPreferenceChanged);if(client)client.destroy();});
  var restored;
  try{var key=storage&&storage.getItem(ACTIVE_KEY);if(key)restored=E.readRun(storage,key);}catch(_){}
  if(!restored){var valid=savedRuns().find(function(entry){return entry.run;});if(valid)restored=valid.run;}
  try { buildScene(); } catch (_) { sceneReady = false; byId('sceneContainer').hidden = true; byId('sceneUnavailable').hidden = false; byId('sceneToggle').disabled = true; byId('focusView').disabled = true; }
  changeRun(restored||E.createRun({context:'community',support:'guided',language:'plain',variation:'rain'}));
}());
