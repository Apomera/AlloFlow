/* Opt-in, static observation activity. Flight state and rewards stay with the host. */
(function (global) {
  'use strict';
  function Component(props) {
    var React = props.React, h = React.createElement, model = global.RaptorDistanceModel, evidence = global.RaptorDistanceEvidence, investigations = global.RaptorDistanceInvestigations;
    var settings = model.normalize(props.settings), metrics = model.metrics(settings), fieldwork = global.RaptorDistanceFieldwork, resultsAPI = global.RaptorDistanceResults, matchAPI = global.RaptorDistanceMatch, signalAPI = global.RaptorDistanceSignal;
    var root = React.useRef(null), scene = React.useRef(null);
    var wide = React.useRef(null), reference = React.useRef(null), eagle = React.useRef(null);
    var current = React.useRef(settings); current.current = settings;
    var statusPair = React.useState('loading'), status = statusPair[0], setStatus = statusPair[1];
    var attemptPair = React.useState(0), attempt = attemptPair[0], setAttempt = attemptPair[1];
    var choicePair = React.useState(null), choice = choicePair[0], setChoice = choicePair[1];
    var revealPair = React.useState(false), revealed = revealPair[0], setRevealed = revealPair[1];
    var notePair = React.useState(''), note = notePair[0], setNote = notePair[1];
    var draftPair = React.useState(null), draft = draftPair[0], setDraft = draftPair[1];
    var pinPair = React.useState(null), pinned = pinPair[0], setPinned = pinPair[1];
    var pinMessagePair = React.useState(''), pinMessage = pinMessagePair[0], setPinMessage = pinMessagePair[1];
    var comparisonHeading = React.useRef(null);
    var inspectionPair = React.useState(null), inspection = inspectionPair[0], setInspection = inspectionPair[1];
    var snapshotMessagePair = React.useState(''), snapshotMessage = snapshotMessagePair[0], setSnapshotMessage = snapshotMessagePair[1];
    var inspectorSourcePair = React.useState('current'), inspectorSource = inspectorSourcePair[0], setInspectorSource = inspectorSourcePair[1];
    var inspectorSharePair = React.useState(50), inspectorShare = inspectorSharePair[0], setInspectorShare = inspectorSharePair[1];
    var magnifierZoomPair = React.useState(1), magnifierZoom = magnifierZoomPair[0], setMagnifierZoom = magnifierZoomPair[1];
    var magnifierXPair = React.useState(50), magnifierX = magnifierXPair[0], setMagnifierX = magnifierXPair[1];
    var magnifierYPair = React.useState(50), magnifierY = magnifierYPair[0], setMagnifierY = magnifierYPair[1];
    var guidePair = React.useState(null), guide = guidePair[0], setGuide = guidePair[1], guideNumber = React.useRef(0);
    var reflectionPair = React.useState(null), reflection = reflectionPair[0], setReflection = reflectionPair[1];
    var huntPair = React.useState(null), hunt = huntPair[0], setHunt = huntPair[1], huntNumber = React.useRef(0);
    var huntMessagePair = React.useState(''), huntMessage = huntMessagePair[0], setHuntMessage = huntMessagePair[1];
    var trialDistancePair = React.useState(String(settings.distance)), trialDistance = trialDistancePair[0], setTrialDistance = trialDistancePair[1];
    var trialErrorPair = React.useState(''), trialError = trialErrorPair[0], setTrialError = trialErrorPair[1];
    var exactPair = React.useState(null), exact = exactPair[0], setExact = exactPair[1];
    var exactErrorsPair = React.useState({}), exactErrors = exactErrorsPair[0], setExactErrors = exactErrorsPair[1];
    var exactMessagePair = React.useState(''), exactMessage = exactMessagePair[0], setExactMessage = exactMessagePair[1];
    var exactFocus = React.useRef(null);
    var repairPair = React.useState(null), repair = repairPair[0], setRepair = repairPair[1];
    var repairMessagePair = React.useState(null), repairMessage = repairMessagePair[0], setRepairMessage = repairMessagePair[1];
    var repairFocus = React.useRef(null);
    var resultsMessagePair = React.useState(''), resultsMessage = resultsMessagePair[0], setResultsMessage = resultsMessagePair[1];
    var resultsAnswerPair = React.useState(null), resultsAnswer = resultsAnswerPair[0], setResultsAnswer = resultsAnswerPair[1];
    var matchPair = React.useState(null), match = matchPair[0], setMatch = matchPair[1], matchNumber = React.useRef(0);
    var matchCheckPair = React.useState(null), matchCheck = matchCheckPair[0], setMatchCheck = matchCheckPair[1];
    var signalPair = React.useState(null), signal = signalPair[0], setSignal = signalPair[1];
    var signalErrorPair = React.useState(null), signalError = signalErrorPair[0], setSignalError = signalErrorPair[1];
    var probePair = React.useState(0), probe = probePair[0], setProbe = probePair[1];
    var probeJump = React.useRef(null);
    var pairProbePair = React.useState(null), pairProbe = pairProbePair[0], setPairProbe = pairProbePair[1];
    var pairJump = React.useRef(null);
    var pairAnswersPair = React.useState(null), pairAnswers = pairAnswersPair[0], setPairAnswers = pairAnswersPair[1];
    var signalAnswerPair = React.useState(null), signalAnswer = signalAnswerPair[0], setSignalAnswer = signalAnswerPair[1];
    var keptSignalPair = React.useState(null), keptSignal = keptSignalPair[0], setKeptSignal = keptSignalPair[1], keptSignalNumber = React.useRef(0);
    var savedPair = React.useState(''), savedMessage = savedPair[0], setSavedMessage = savedPair[1];
    var labels = { both: 'Within both selected references', eagle: 'Above human reference; within eagle reference', neither: 'Above both selected references' };
    var key = [settings.distance, settings.cycles, settings.contrast].join('/');
    var records = evidence.readRecords(props.settings);
    var savedResults = resultsAPI ? resultsAPI.read(props.settings && props.settings.fieldworkResults) : null;
    var resultsComparison = savedResults && resultsAPI ? resultsAPI.compare(savedResults) : null;
    var resultsKey = JSON.stringify(savedResults);
    var activeResultsAnswer = resultsAnswer && resultsAnswer.key === resultsKey ? resultsAnswer.answer : null;
    var comparison = pinned ? evidence.compare(pinned.settings, settings) : null;
    var activityContextKey = key + '|' + (pinned ? conditionKey(pinned.settings) : 'none') + '|' + (guide ? guide.id + '/' + guide.run : 'free') + '|' + (hunt ? hunt.id + '/' + hunt.run : 'no-hunt') + '|' + (match ? 'match/' + match.run : 'no-match');
    var contextKey = activityContextKey + '|' + (keptSignal ? 'pixel-reading/' + keptSignal.run : 'no-pixel-reading');
    var staleDraft = !!note.trim() && (!draft || draft.key !== contextKey);
    var noteState = status !== 'ready' ? status : !choice || !revealed ? 'prediction' : staleDraft ? 'review' : !note.trim() ? 'write' : 'ready';
    var noteReadiness = {
      loading: 'The scene is loading. You can write a draft while you wait; recording becomes available after you predict and reveal.',
      error: 'The scene is unavailable. Your draft is kept here. Retry the scene, then predict and reveal before recording.',
      prediction: 'Before recording, choose a prediction and reveal the current conditions. Your draft stays here.',
      review: 'Before recording, review this draft because its investigation context changed. Revise it if needed, then use it for the current conditions.',
      write: 'The current conditions are revealed. Write an observation to enable recording; personal observations are not scored.',
      ready: 'Ready to record this observation with the current conditions' + (pinned ? ' and pinned comparison.' : '.')
    }[noteState];
    var noteNext = {
      error: ['Go to scene recovery', '[data-distance-retry]'], prediction: ['Go to prediction', '[data-distance-prediction-heading]'],
      review: ['Review draft', '[data-distance-adopt-draft]'], write: ['Write an observation', '[data-distance-note]']
    }[noteState];
    var factorNames = { distance: 'viewing distance', cycles: 'stripe-pair count', contrast: 'display contrast' };
    function conditionKey(value) { return [value.distance, value.cycles, value.contrast].join('/'); }
    function conditionLabel(value) { return value.distance + ' m · ' + value.cycles + ' stripe pairs · ' + value.contrast + '% display contrast'; }
    var inquiry = guide ? investigations.get(guide.id) : null;
    var matchedInquiry = !!(inquiry && pinned && investigations.match(inquiry.id, pinned.settings, settings));
    var guideStage = !inquiry ? null : matchedInquiry ? (revealed && status === 'ready' ? 'inspect' : 'changed') :
      conditionKey(settings) === conditionKey(inquiry.reference) ? (!pinned ? 'starter' : conditionKey(pinned.settings) === conditionKey(inquiry.reference) ? 'pinned' : 'diverged') : 'diverged';
    var currentImages = revealed && status === 'ready' && inspection && inspection.key === key ? inspection : null;
    var currentSignal = currentImages && signal && signal.key === key && signal.inspection === currentImages ? signal.data : null;
    var currentSignalError = currentImages && signalError && signalError.key === key && signalError.inspection === currentImages ? signalError.text : null;
    var activeSignalAnswer = currentSignal && signalAnswer && signalAnswer.data === currentSignal ? signalAnswer.answer : null;
    var signalState = status !== 'ready' ? status : !choice || !revealed ? 'prediction' : !currentImages ? 'copy' : !currentSignal ? 'read' : 'ready';
    var signalReadiness = {
      loading: 'The scene is loading. Pixel reading becomes available after you predict and reveal.',
      error: 'The scene is unavailable. Retry it, then predict and reveal before reading pixels. Your kept reading remains available.',
      prediction: 'Choose a prediction and reveal the current conditions before reading pixels. Your kept reading remains available.',
      copy: 'The revealed image copies are unavailable. Reveal again to retry copying before reading pixels; the original canvases remain above.',
      read: currentSignalError ? 'The pixel read failed. Try reading the revealed view again. Your kept reading remains available.' : 'Read pixels from the revealed view to explore its measured values or keep this reading.',
      ready: 'The current pixel reading is ready to explore or keep. Keeping it replaces any previously kept reading.'
    }[signalState];
    var signalNext = {
      error: ['Go to scene recovery', '[data-distance-retry]'], prediction: ['Go to prediction', '[data-distance-prediction-heading]'],
      copy: ['Go to reveal and retry copying', '[data-distance-reveal]'], read: ['Go to pixel reading', '[data-distance-signal-read]']
    }[signalState];
    var inspectorImages = inspectorSource === 'pinned' ? pinned : currentImages;
    var inspectorSettings = inspectorSource === 'pinned' ? (pinned && pinned.settings) : settings;
    var inspectorLabel = inspectorSource === 'pinned' ? 'Pinned condition' : 'Current condition';
    var explanation = pinned && revealed && status === 'ready' ? investigations.explain(pinned.settings, settings) : null;
    var reflectionResult = matchedInquiry && revealed && reflection ? investigations.check(inquiry.id, pinned.settings, settings, reflection) : null;
    var huntPlan = hunt && fieldwork ? fieldwork.plan(hunt.id) : null;
    var huntSummary = huntPlan ? fieldwork.summarize(hunt.id, hunt.trials) : null;
    var huntHeld = settings.cycles === 12 && settings.contrast === 95;
    var trialState = status !== 'ready' ? status : !huntHeld ? 'held' : !choice || !revealed ? 'prediction' : 'ready';
    var trialReadiness = {
      loading: 'The scene is loading. You can plan a distance while you wait; predict and reveal before recording a trial.',
      error: 'The scene is unavailable. Retry the scene before setting a distance or recording a new trial. Your collected trials remain available.',
      held: 'Restore 12 stripe pairs and 95% display contrast before setting the next distance or recording a comparable trial.',
      prediction: 'Choose a prediction and reveal the current conditions before recording this trial. A planned distance is not collected evidence.',
      ready: 'Ready to record the revealed trial at ' + settings.distance + ' m. Repeating a distance replaces its earlier trial.'
    }[trialState];
    var trialNext = {
      error: ['Go to scene recovery', '[data-distance-retry]'], held: ['Go to held conditions', '[data-distance-fieldwork-restore]'],
      prediction: ['Go to prediction', '[data-distance-prediction-heading]']
    }[trialState];
    var matchPlan = matchAPI && matchAPI.plan(), matchReference = !!(match && matchPlan && pinned && matchAPI.isReference(pinned.settings));
    var matchHeld = settings.cycles === 8 && settings.contrast === 95;
    var matchComparison = matchReference && matchHeld ? matchAPI.compare(pinned.settings, settings) : null;
    // A new render, pin or run must never inherit the previous match verdict.
    var checkedMatch = match && matchReference && matchHeld && currentImages && matchCheck && matchCheck.run === match.run && matchCheck.pin === pinned && matchCheck.inspection === currentImages ? matchCheck.result : null;
    function draftContext() { return { key: contextKey, settings: evidence.snapshot(settings), reference: pinned ? evidence.snapshot(pinned.settings) : null, pixelReference: keptSignal ? evidence.snapshot(keptSignal.data.settings) : null, question: inquiry ? inquiry.title : huntPlan ? huntPlan.title : match ? 'Match the model’s stripe contrast' : null }; }
    function comparisonLabel(value) {
      if (value.kind === 'same') return 'Conditions match. Choose one factor to change.';
      if (value.kind === 'single') return 'One factor changed: ' + factorNames[value.factor] + '. ' + value.heldFields.map(function (name) { return factorNames[name]; }).join(' and ') + ' stayed fixed.';
      return 'Several factors changed: ' + value.changedFields.map(function (name) { return factorNames[name]; }).join(', ') + '. This comparison cannot isolate one cause.';
    }
    React.useEffect(function () {
      var cancelled = false;
      setStatus('loading');
      Promise.resolve().then(props.loadResources).then(function () {
        if (cancelled) return;
        var controller = global.RaptorDistanceScene.create({ THREE: global.THREE, catalog: global.StemSimAssets, model: model,
          wideCanvas: wide.current, referenceCanvas: reference.current, eagleCanvas: eagle.current });
        scene.current = controller; root.current._distanceScene = controller;
        controller.update(current.current); setStatus('ready');
      }).catch(function () {
        if (cancelled) return;
        if (scene.current) scene.current.dispose(); scene.current = null;
        setStatus('error');
      });
      return function () { cancelled = true; if (scene.current) scene.current.dispose(); scene.current = null; };
    }, [attempt]);
    React.useEffect(function () {
      setChoice(null); setRevealed(false); setInspection(null); setSnapshotMessage(''); setSavedMessage('');
      setSignal(null); setSignalError(null);
      if (scene.current) {
        try { scene.current.update(settings); }
        catch (error) { scene.current.dispose(); scene.current = null; setStatus('error'); }
      }
    }, [key]);
    React.useEffect(function () { setReflection(null); }, [activityContextKey]);
    React.useEffect(function () {
      setRepair(null);
      setRepairMessage(function (previous) { return previous && previous.pin === pinned && previous.key === key ? previous : null; });
      if (!repairFocus.current) return;
      var pending = repairFocus.current; repairFocus.current = null;
      if (pending.pin === pinned && pending.key === key) focus('[data-distance-prediction-heading]');
    }, [pinned, key]);
    React.useEffect(function () { setTrialDistance(String(settings.distance)); setTrialError(''); }, [settings.distance, hunt && hunt.run]);
    React.useEffect(function () {
      if (!exactFocus.current) return;
      var field = exactFocus.current; exactFocus.current = null;
      focus('[data-distance-exact-input="' + field + '"]');
    }, [exactErrors]);
    React.useEffect(function () {
      if (!probeJump.current) return;
      var reading = probeJump.current; probeJump.current = null;
      if (reading === currentSignal) focus('[data-distance-signal-probe]');
    }, [probe, currentSignal]);
    React.useEffect(function () { if (keptSignal) focus('[data-distance-signal-kept-heading]'); }, [keptSignal]);
    React.useEffect(function () {
      if (!pairJump.current) return;
      var pending = pairJump.current; pairJump.current = null;
      if (pending.kept === keptSignal && pending.data === currentSignal) focus('[data-distance-pair-probe]');
    }, [pairProbe, keptSignal, currentSignal]);
    React.useEffect(function () { setPairProbe(null); setPairAnswers(null); }, [keptSignal, currentSignal]);
    React.useEffect(function () { if (root.current) root.current.querySelector('h3').focus(); }, []);
    function commitSettings(patch, resultOverride) {
      var kept = resultOverride === undefined ? savedResults : resultsAPI && resultsAPI.read(resultOverride);
      var next = Object.assign({}, settings, { records: records }, patch);
      if (kept) next.fieldworkResults = kept;
      else delete next.fieldworkResults;
      props.onChange(next);
    }
    function change(patch) { commitSettings(Object.assign({}, patch, { records: records })); }
    function save() {
      if (!revealed || !choice || !note.trim() || staleDraft || status !== 'ready') return;
      var record = evidence.makeRecord(settings, choice, note, pinned ? pinned.settings : null);
      if (!record) return;
      commitSettings({ records: records.concat([record]).slice(-6) });
      setNote(''); setDraft(null); setSavedMessage('Observation saved with its conditions' + (pinned ? ' and the pinned comparison' : '') + '. Your notebook keeps the latest six observations.');
      focus('[data-distance-note]');
    }
    function pin() {
      if (!revealed || status !== 'ready') return;
      try {
        // A host can commit new props before the canvas update effect runs.
        // Require evidence already rendered at these conditions before pinning.
        if (!scene.current || conditionKey(scene.current.getDiagnostics().settings) !== key) {
          setPinMessage('Reveal the current conditions before pinning.'); return;
        }
        var referenceImage = reference.current.toDataURL('image/png'), eagleImage = eagle.current.toDataURL('image/png');
        if (referenceImage === 'data:,' || eagleImage === 'data:,') throw new Error('Snapshot unavailable');
        setPinned({ settings: evidence.snapshot(settings), referenceImage: referenceImage, eagleImage: eagleImage });
        setPinMessage('Pinned both views at ' + conditionLabel(settings) + '. The snapshots stay fixed while you investigate.');
      } catch (error) { setPinMessage('The snapshots could not be captured. Try pinning the revealed views again.'); }
    }
    function experiment(kind) {
      var next = pinned && evidence.experiment(pinned.settings, kind);
      if (next) change(next);
    }
    function experimentControls() {
      var items = [['distance', 'Double distance', 'Pin a distance of 150 m or less to double it within the 300 m limit.'],
        ['cycles', 'Double stripe pairs', 'Pin 10 stripe pairs or fewer to double them within the 20-pair limit.'],
        ['contrast', 'Set contrast to 25%', 'The pinned display contrast is already 25%. Choose another pinned contrast to test a change.'],
        ['restore', 'Restore pinned conditions', '']];
      function help(item) {
        var next = evidence.experiment(pinned.settings, item[0]);
        var prefix = status === 'loading' ? 'The scene is loading; this command is unavailable until it is ready. ' : status === 'error' ? 'The scene is unavailable; retry it before applying this command. ' : '';
        return prefix + (next ? 'Starts from the pin: ' + conditionLabel(pinned.settings) + '. Applies: ' + conditionLabel(next) + '. Make a prediction before revealing.' : item[2]);
      }
      return h('div', null,
        h('div', { className: 'rh-distance-actions' }, items.map(function (item) {
          var available = !!evidence.experiment(pinned.settings, item[0]);
          return h('button', { key: item[0], type: 'button', 'data-distance-experiment': item[0], disabled: !available || status !== 'ready',
            'aria-describedby': 'rh-distance-experiment-' + item[0] + '-help', onClick: function () { experiment(item[0]); } }, item[1]);
        })),
        h('details', { className: 'rh-distance-command-help', 'data-distance-experiment-help-panel': 'true', open: true },
          h('summary', null, 'Experiment availability and starting conditions'),
          h('ul', { 'data-distance-experiment-guidance': 'true' }, items.map(function (item) {
            return h('li', { key: item[0], id: 'rh-distance-experiment-' + item[0] + '-help', 'data-distance-experiment-help': item[0] }, h('strong', null, item[1] + ': '), help(item));
          })),
          status === 'error' && h('button', { type: 'button', 'data-distance-experiment-retry': 'true', onClick: function () { focus('[data-distance-retry]'); } }, 'Go to scene recovery')));
    }
    function repairComparison() {
      var multiple = comparison.kind === 'multiple';
      var active = multiple && repair && repair.pin === pinned && repair.key === key && comparison.changedFields.indexOf(repair.field) !== -1 ? repair.field : null;
      var planned = active ? Object.assign({}, pinned.settings) : null;
      if (planned) planned[active] = settings[active];
      var state = status !== 'ready' ? status : !multiple ? comparison.kind : active ? 'ready' : 'choose';
      var guidance = state === 'loading' ? 'The scene is loading. You can choose a factor now; apply after the scene is ready.' :
        state === 'error' ? 'The scene is unavailable. Your pin and notes remain available. Retry the scene before applying a repair.' :
        state === 'same' ? 'No factor differs from the pin. Change the conditions to begin a comparison.' :
        state === 'single' ? 'Only one factor differs from the pin. This comparison already isolates one control; predict and reveal to inspect the result.' :
        state === 'choose' ? 'Several factors differ from the pin. Choose one changed factor to keep; preview the other controls returning to their pinned values.' :
        'Ready to apply the preview. This keeps the chosen current value, restores the other controls from the pin, and moves focus to prediction. Make a fresh prediction and reveal afterward.';
      var message = repairMessage && repairMessage.pin === pinned && repairMessage.key === key ? repairMessage.text : null;
      var names = { distance: 'Viewing distance', cycles: 'Stripe pairs', contrast: 'Display contrast' };
      function format(field, value) { return value + (field === 'distance' ? ' m' : field === 'contrast' ? '%' : ' pairs'); }
      function apply() {
        if (state !== 'ready' || !planned) return;
        var next = evidence.compare(pinned.settings, planned);
        if (!next || next.kind !== 'single' || next.factor !== active) return;
        var nextKey = conditionKey(planned);
        repairFocus.current = { pin: pinned, key: nextKey };
        setRepairMessage({ pin: pinned, key: nextKey, text: 'Applied a comparison changing only ' + names[active].toLowerCase() + ' from the pin. Make a fresh prediction and reveal, then compare the same reference in both views.' });
        change(planned);
      }
      return h('details', { className: 'rh-distance-repair', 'data-distance-repair': 'true' },
        h('summary', null, 'Repair a comparison · Keep one changed factor'),
        h('div', { className: 'rh-distance-repair-body' },
          h('h5', { id: 'rh-distance-repair-question', tabIndex: -1, 'data-distance-repair-heading': 'true' }, 'Which changed factor will you investigate?'),
          h('p', null, 'A comparison changing several controls cannot isolate one cause. Choose one current value to keep and restore the other controls from the pin. Choosing previews a plan; applying it changes the scene.'),
          multiple && h('div', { className: 'rh-distance-actions', role: 'group', 'aria-labelledby': 'rh-distance-repair-question' }, comparison.changedFields.map(function (field) {
            return h('button', { key: field, type: 'button', 'data-distance-repair-factor': field, 'aria-pressed': active === field,
              onClick: function () { setRepair({ pin: pinned, key: key, field: field }); } }, 'Keep ' + names[field].toLowerCase());
          })),
          planned && h('div', null,
            h('table', { className: 'rh-distance-text-table', 'data-distance-repair-preview': 'true' },
              h('caption', null, 'Planned conditions compared with the pin. Only the chosen control will differ; values apply after you activate the button below.'),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Control'), h('th', { scope: 'col' }, 'Pinned'), h('th', { scope: 'col' }, 'Planned'))),
              h('tbody', null, ['distance', 'cycles', 'contrast'].map(function (field) {
                return h('tr', { key: field, 'data-distance-repair-row': field }, h('th', { scope: 'row' }, names[field] + (field === active ? ' · Keep current' : ' · Use pinned')),
                  h('td', null, format(field, pinned.settings[field])), h('td', { 'data-distance-repair-value': field, 'data-value': planned[field] }, format(field, planned[field])));
              }))),
            h('p', { 'data-distance-repair-held': 'true' }, 'Keep current ' + factorNames[active] + '. Restore ' + comparison.changedFields.filter(function (field) { return field !== active; }).map(function (field) { return factorNames[field]; }).join(' and ') + ' to the pin. The other controls will be held at their pinned values.')),
          h('p', { id: 'rh-distance-repair-readiness', 'data-distance-repair-readiness': 'true', 'data-state': state }, guidance),
          h('div', { className: 'rh-distance-actions' },
            h('button', { type: 'button', 'data-distance-repair-apply': 'true', className: 'rh-distance-primary', disabled: state !== 'ready', 'aria-describedby': 'rh-distance-repair-readiness', onClick: apply }, 'Apply one-factor plan and go to prediction'),
            ['error', 'same', 'single'].indexOf(state) !== -1 && h('button', { type: 'button', 'data-distance-repair-next': 'true', onClick: function () { focus(state === 'error' ? '[data-distance-retry]' : '#rh-distance-distance'); } }, state === 'error' ? 'Go to scene recovery' : 'Go to conditions'),
            h('button', { type: 'button', 'data-distance-repair-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Explain your comparison in the notebook')),
          announcement('repair', message && h('p', { 'data-distance-repair-feedback': 'true' }, message)),
          h('p', null, 'After revealing, compare the same reference in the pinned and current images or use the model values as evidence. Explain which factor changed, which controls stayed fixed, and why that matters. Repairing controls does not establish animal detection ability.')));
    }
    function reveal() {
      if (!choice || status !== 'ready' || !scene.current) return;
      // Keep copied evidence tied to the exact rendered conditions, even when
      // a host supplies a settings update immediately before this event.
      try {
        if (conditionKey(scene.current.getDiagnostics().settings) !== key) scene.current.update(settings);
      } catch (error) { scene.current.dispose(); scene.current = null; setStatus('error'); return; }
      try {
        var referenceImage = reference.current.toDataURL('image/png'), eagleImage = eagle.current.toDataURL('image/png');
        if (referenceImage === 'data:,' || eagleImage === 'data:,') throw new Error('Snapshot unavailable');
        setInspection({ key: key, referenceImage: referenceImage, eagleImage: eagleImage }); setSnapshotMessage('');
      } catch (error) {
        setInspection(null); setSnapshotMessage('The current snapshots could not be copied. Inspect the original current views above; your pinned views are still available.');
      }
      setRevealed(true);
    }
    function startInquiry(id) {
      var next = investigations.get(id); if (!next) return;
      setMatch(null); setMatchCheck(null);
      setHunt(null); setHuntMessage('');
      setGuide({ id: id, run: ++guideNumber.current }); setPinned(null); setPinMessage('');
      setChoice(null); setRevealed(false); setInspection(null); setSnapshotMessage(''); setReflection(null); setSavedMessage('');
      change(next.reference);
    }
    function focus(selector) {
      var element = root.current && root.current.querySelector(selector);
      if (!element) return;
      for (var parent = element.parentElement; parent && parent !== root.current; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS') parent.open = true;
      }
      element.focus();
    }
    // Keep live regions mounted before their feedback is inserted. Continuous
    // controls and notebook typing stay outside these atomic announcements.
    function announcement(name, content) {
      return h('div', { 'data-distance-announcement': name, role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' }, content);
    }
    function startHunt(id) {
      var plan = fieldwork && fieldwork.plan(id); if (!plan || status !== 'ready') return;
      setMatch(null); setMatchCheck(null);
      setHunt({ id: id, run: ++huntNumber.current, trials: [] }); setHuntMessage('');
      setGuide(null); setPinned(null); setPinMessage(''); setChoice(null); setRevealed(false);
      setInspection(null); setSnapshotMessage(''); setReflection(null); setSavedMessage('');
      change(plan.reference);
    }
    function startMatch() {
      if (!matchPlan || status !== 'ready') return;
      setMatch({ run: ++matchNumber.current }); setMatchCheck(null);
      setGuide(null); setHunt(null); setHuntMessage(''); setPinned(null); setPinMessage('');
      setChoice(null); setRevealed(false); setInspection(null); setSnapshotMessage(''); setReflection(null); setSavedMessage('');
      change(matchPlan.reference);
    }
    function matchNext() {
      if (!match || status !== 'ready') return;
      if (matchReference) { focus('#rh-distance-distance'); return; }
      if (pinned || !matchAPI.isReference(settings)) { startMatch(); return; }
      if (revealed) { pin(); return; }
      focus('[data-distance-prediction="both"]');
    }
    function checkMatch() {
      if (!match || !matchComparison || !currentImages || status !== 'ready') return;
      try { if (!scene.current || conditionKey(scene.current.getDiagnostics().settings) !== key) return; }
      catch (error) { return; }
      setMatchCheck({ run: match.run, pin: pinned, inspection: currentImages, result: matchComparison });
    }
    function matchPanel() {
      if (!matchPlan) return null;
      var starter = matchAPI.isReference(settings), ready = matchReference && matchHeld && currentImages && status === 'ready';
      var referenceMetrics = matchReference ? model.metrics(pinned.settings) : null;
      function view(id) {
        var human = id === 'human', cfg = human ? pinned.settings : settings;
        var imageSource = human ? pinned.referenceImage : ready ? currentImages.eagleImage : null;
        var transfer = human ? referenceMetrics.referenceTransfer : ready ? matchComparison.eagleTransfer : null;
        var angle = human ? referenceMetrics.angleDeg : metrics.angleDeg;
        return h('figure', { key: id, className: 'rh-distance-match-view' },
          h('figcaption', null, h('strong', null, human ? 'Pinned human reference · 60 m' : 'Current eagle reference · ' + settings.distance + ' m'), h('span', null, conditionLabel(cfg))),
          imageSource ? h('img', { 'data-distance-match-image': id, src: imageSource, width: 1024, height: 512, alt: (human ? 'Pinned human' : 'Current eagle') + ' reference at ' + conditionLabel(cfg) + '. Original field of view and target scale.' }) :
            h('div', { className: 'rh-distance-match-cover', 'data-distance-match-cover': 'true' }, h('strong', null, !matchHeld ? 'Restore the held conditions' : snapshotMessage && revealed ? 'Image copy unavailable' : 'Predict and reveal this distance'), h('p', null, !matchHeld ? 'Keep eight stripe pairs and 95% contrast before comparing.' : snapshotMessage && revealed ? 'The original canvases remain available below. Reveal again to retry this image comparison.' : 'The pinned human evidence stays fixed while you choose an eagle distance.')),
          transfer !== null && h('div', { className: 'rh-distance-match-measure' },
            h('span', { 'data-distance-match-transfer': id, 'data-transfer': transfer }, (transfer * 100).toFixed(1) + '% of input stripe modulation retained'),
            h('div', { className: 'rh-distance-match-track', role: 'meter', 'aria-label': (human ? 'Human' : 'Eagle') + ' model fraction of stripe modulation retained', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': transfer * 100, 'aria-valuetext': (transfer * 100).toFixed(1) + ' percent, calculated from the illustrative filter' }, h('span', { 'data-distance-match-meter': id, 'aria-hidden': 'true', style: { width: (transfer * 100) + '%' } })),
            h('small', { 'data-distance-match-angle': id, 'data-angle': angle }, 'Plaque angular span: ' + angle.toFixed(3) + '° · fixed 0.75° inspection field')));
      }
      return h('details', { className: 'rh-distance-match', 'data-distance-match': 'true' },
        h('summary', null, 'Distance trade-off · Match the stripe contrast'),
        h('div', { className: 'rh-distance-match-body' },
          h('h4', { tabIndex: -1, 'data-distance-match-heading': 'true' }, 'How far back can the eagle reference move?'),
          h('p', null, 'Keep a nearby human-reference view, then find a farther eagle-reference view with similar calculated stripe-contrast retention. Both images keep their original scale: the farther plaque will look smaller.'),
          h('p', null, 'Start at 60 m, eight stripe pairs and 95% contrast. Starting ends the current guided question or range-finding trial series and clears the pin. Your notebook, draft and kept results remain available.'),
          h('button', { type: 'button', 'data-distance-match-start': 'true', disabled: status !== 'ready', onClick: startMatch }, match ? 'Restart match challenge' : 'Start match challenge'),
          match && h('section', { 'data-distance-match-active': 'true', 'aria-label': 'Stripe contrast matching challenge' },
            h('ol', { className: 'rh-distance-match-steps' }, h('li', null, 'Predict and reveal the 60 m starter; pin it.'), h('li', null, 'Change distance only. Predict and reveal each new condition.'), h('li', null, 'Compare the pinned human view with the current eagle view; check the match.')),
            h('p', { role: 'status' }, matchReference ? 'The human starter is pinned. Explore the viewing-distance control; keep eight stripe pairs and 95% contrast.' : pinned || !starter ? 'The starter evidence has changed. Restart this challenge to pin a fresh 60 m human reference.' : revealed ? 'The starter is revealed. Pin the human reference before moving farther away.' : 'Predict and reveal the starter, then pin it.'),
            h('div', { className: 'rh-distance-actions' }, h('button', { type: 'button', 'data-distance-match-next': 'true', disabled: status !== 'ready', onClick: matchNext }, matchReference ? 'Adjust viewing distance' : pinned || !starter ? 'Restart at the starter' : revealed ? 'Pin the human starter' : 'Go to prediction'), matchReference && h('button', { type: 'button', 'data-distance-match-predict': 'true', disabled: status !== 'ready', onClick: function () { focus('[data-distance-prediction="both"]'); } }, 'Go to prediction'), h('button', { type: 'button', 'data-distance-match-exit': 'true', onClick: function () { setMatch(null); setMatchCheck(null); focus('[data-distance-match-start]'); } }, 'Explore freely')),
            !matchHeld && h('div', { className: 'rh-distance-match-warning', 'data-distance-match-held-warning': 'true' }, h('p', null, 'Stripe count or display contrast changed. Restore the held conditions to isolate distance.'), h('button', { type: 'button', 'data-distance-match-restore': 'true', onClick: function () { change({ cycles: 8, contrast: 95 }); focus('[data-distance-prediction-heading]'); } }, 'Restore eight pairs and 95% contrast')),
            matchReference && h('div', { className: 'rh-distance-match-evidence' },
              h('div', { className: 'rh-distance-match-views' }, ['human', 'eagle'].map(view)),
              h('p', { className: 'rh-distance-match-method' }, 'The bars share a 0–100% scale. They are calculated from the chosen Gaussian filter, not measured from these images. They show retained input modulation; display contrast stays at 95%.'),
              h('button', { type: 'button', 'data-distance-match-check': 'true', disabled: !ready, onClick: checkMatch }, 'Check this distance'),
              h('p', null, 'Activity rule: compare spatial frequency divided by each selected reference value (60 or 140 cycles/degree). Within 1% counts as a model match; this tolerance is not a perceptual threshold.'),
              announcement('match', checkedMatch && h('div', { className: 'rh-distance-match-feedback', 'data-distance-match-feedback': 'true', 'data-matched': String(checkedMatch.matched), 'data-direction': checkedMatch.direction },
                h('strong', null, checkedMatch.matched ? 'Matched the model’s stripe-contrast retention.' : checkedMatch.direction === 'farther' ? 'The eagle filter retains more stripe contrast. Try farther away.' : 'The eagle filter retains less stripe contrast. Try moving closer.'),
                h('p', null, 'Eagle/human normalized spatial frequency: ' + checkedMatch.ratio.toFixed(3) + '×. Difference from a match: ' + (checkedMatch.error * 100).toFixed(2) + '%.'),
                checkedMatch.matched && h('p', null, 'The eagle view is ' + checkedMatch.distanceRatio.toFixed(2) + '× farther away, while the plaque spans ' + (checkedMatch.angleRatio * 100).toFixed(1) + '% of its pinned angular size. Similar model contrast does not make the images identical or establish equivalent animal vision.'))),
              checkedMatch && h('button', { type: 'button', 'data-distance-match-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Explain the result in your notebook')))));
    }
    function recordTrial() {
      if (!hunt || !fieldwork || !revealed || !choice || status !== 'ready') return;
      var trial = fieldwork.trial(settings, choice); if (!trial) return;
      try {
        if (!scene.current || conditionKey(scene.current.getDiagnostics().settings) !== key) {
          setHuntMessage('Reveal the current conditions before recording this trial.'); return;
        }
      } catch (error) { setHuntMessage('The rendered conditions could not be checked. Reveal again before recording.'); return; }
      var run = hunt.run;
      setHunt(function (previous) {
        if (!previous || previous.run !== run) return previous;
        return { id: previous.id, run: previous.run, trials: fieldwork.summarize(previous.id, previous.trials.concat([trial])).trials };
      });
      setHuntMessage('Recorded ' + settings.distance + ' m. Repeating a distance replaces its earlier trial; the latest eight unique distances are kept.');
    }
    function keepResult() {
      if (!hunt || !resultsAPI) return;
      // Retain the recorded series, independently of the live controls or PNGs.
      var result = resultsAPI.capture(hunt.id, hunt.trials); if (!result) return;
      var next = Object.assign({ version: 1 }, savedResults || {}); next[hunt.id] = result;
      commitSettings({}, next);
      setResultsMessage('Saved the completed ' + hunt.id + ' trial set. It remains available after closing this activity.');
    }
    function removeResult(id) {
      if (!savedResults || !savedResults[id]) return;
      var next = Object.assign({}, savedResults); delete next[id]; commitSettings({}, next);
      setResultsMessage('Removed the saved ' + id + ' result. Your current trials and notebook remain available.');
      focus('[data-distance-fieldwork] > summary');
    }
    function savedResultsPanel() {
      if (!savedResults || !fieldwork) return null;
      var comparison = resultsComparison;
      function x(distance) { return 54 + distance / 300 * 546; }
      var ratioLabel = comparison ? (Math.floor(comparison.ratioLow * 100) / 100).toFixed(2) + '–' + (Math.ceil(comparison.ratioHigh * 100) / 100).toFixed(2) + '×' : '';
      return h('section', { className: 'rh-distance-results', 'data-distance-results': 'true', 'aria-label': 'Saved range-finding evidence' },
        h('h4', null, 'Keep the evidence. Compare the ranges.'),
        h('p', null, 'These results use saved trial sets, independent of the live controls. Keep one completed result for each reference to compare the same 30 cm pattern with 12 stripe pairs and 95% contrast.'),
        h('div', { className: 'rh-distance-results-cards' }, ['human', 'eagle'].map(function (id) {
          var record = savedResults[id], summary = record && fieldwork.summarize(id, record.trials);
          return h('article', { key: id, className: 'rh-distance-result-card', 'data-distance-saved-result': record ? id : undefined },
            h('h5', null, id === 'human' ? 'Saved human reference' : 'Saved eagle reference'),
            summary ? h('div', null,
              h('strong', { className: 'rh-distance-result-range' }, summary.below.distance + '–' + summary.above.distance + ' m'),
              h('p', null, summary.width + ' m bracket · ' + summary.trials.length + ' collected trials · ' + summary.limit + ' cycles/degree reference'),
              h('details', { 'data-distance-results-trials': id }, h('summary', null, 'Inspect the saved trials'),
                h('table', { className: 'rh-distance-results-table' }, h('caption', null, 'Saved conditions: 12 stripe pairs, 95% contrast. Frequency is recalculated from these conditions.'),
                  h('thead', null, h('tr', null, ['Distance', 'Cycles/degree', 'Original prediction'].map(function (label) { return h('th', { key: label, scope: 'col' }, label); }))),
                  h('tbody', null, summary.trials.map(function (trial) { return h('tr', { key: trial.settings.distance, 'data-distance-saved-trial': 'true', 'data-distance': trial.settings.distance }, h('th', { scope: 'row' }, trial.settings.distance + ' m'), h('td', null, trial.frequency.toFixed(2)), h('td', null, labels[trial.prediction])); })))),
              h('button', { type: 'button', 'data-distance-results-remove': id, onClick: function () { removeResult(id); } }, 'Remove saved ' + id + ' result')) : h('p', null, 'Complete and keep the ' + id + ' challenge to add its evidence.'));
        })),
        comparison && h('section', { className: 'rh-distance-results-comparison', 'data-distance-results-comparison': 'true', 'aria-label': 'Compare saved reference crossings' },
          h('svg', { viewBox: '0 0 640 210', className: 'rh-distance-results-plot', 'data-distance-results-plot': 'true', role: 'img', 'aria-label': 'Saved distance brackets for the same pattern. Each bar starts at zero metres; its marked end interval is the recorded bracket. Exact endpoints are in the saved result cards.' },
            [0, 100, 200, 300].map(function (distance) { return h('g', { key: distance }, h('line', { x1: x(distance), x2: x(distance), y1: 40, y2: 170, stroke: '#45665a' }), h('text', { x: x(distance), y: 188, textAnchor: 'middle' }, distance)); }),
            ['human', 'eagle'].map(function (id, index) { var result = comparison[id], y = 65 + index * 72; return h('g', { key: id, 'data-distance-results-range': id, 'data-low': result.below.distance, 'data-high': result.above.distance },
              h('text', { x: 54, y: y - 12 }, (id === 'human' ? 'Human' : 'Eagle') + ' reference · ' + result.below.distance + '–' + result.above.distance + ' m'),
              h('rect', { x: x(0), y: y, width: x(result.below.distance) - x(0), height: 20, fill: '#75b6a0' }),
              h('rect', { 'data-distance-results-interval': id, x: x(result.below.distance), y: y, width: x(result.above.distance) - x(result.below.distance), height: 20, fill: '#f1cb84' }),
              [result.below.distance, result.above.distance].map(function (distance) { return h('line', { key: distance, x1: x(distance), x2: x(distance), y1: y - 3, y2: y + 23, stroke: '#f9dfab', strokeWidth: 1 }); })); }),
            h('text', { x: 325, y: 207, textAnchor: 'middle' }, 'Distance from the same pattern (m)')),
          h('p', { className: 'rh-distance-results-ratio' }, 'Eagle/human distance ratio implied by your brackets: ', h('strong', { 'data-distance-results-ratio': 'true' }, ratioLabel)),
          h('p', null, 'The lower ratio uses the nearer eagle endpoint and farther human endpoint; the upper ratio uses the farther eagle endpoint and nearer human endpoint. Displayed bounds are rounded outward. This is a range from sampled model brackets, not a statistical confidence interval or a prey-detection estimate.'),
          h('h5', { id: 'rh-distance-results-question' }, 'Which conclusion is supported by these saved trials?'),
          h('div', { className: 'rh-distance-choices', role: 'group', 'aria-labelledby': 'rh-distance-results-question' }, [['frequency', 'The same pattern crosses the eagle reference at a greater distance.'], ['size', 'The eagle view uses a larger bird or plaque.'], ['detection', 'These brackets prove exactly how far a real eagle detects prey.']].map(function (item) { return h('button', { key: item[0], type: 'button', 'data-distance-results-answer': item[0], 'aria-pressed': activeResultsAnswer === item[0], onClick: function () { setResultsAnswer({ key: resultsKey, answer: item[0] }); } }, item[1]); })),
          announcement('results-answer', activeResultsAnswer && h('p', { className: 'rh-distance-results-feedback', 'data-distance-results-feedback': 'true', 'data-correct': String(activeResultsAnswer === 'frequency') },
            activeResultsAnswer === 'frequency' ? 'Supported by these model trials: the pattern crosses the selected eagle spatial-frequency reference farther away, while its size and stripe count stay fixed. Real detection also depends on the animal, task and viewing conditions.' : activeResultsAnswer === 'size' ? 'Check what stayed fixed: both saved series use the same 30 cm plaque and 12 stripe pairs. The reference value changes; the animal and pattern do not grow.' : 'These are selected spatial-frequency references and sampled model brackets. Resolving a stripe pattern does not establish a real animal’s prey-detection distance.'))));
    }
    function trialSuggestion(summary) {
      // Use collected endpoints only. Never solve the model for an unseen crossing.
      if (!summary.trials.length) return { distance: 40, reason: 'Start with a trial at the near end of the allowed range.' };
      if (!summary.above) return { distance: 300, reason: 'Your collected trials are at or below the reference. Test the far end of the allowed range to look for the other side.' };
      if (!summary.below) return { distance: 40, reason: 'Your collected trials are above the reference. Test the near end of the allowed range to look for the other side.' };
      if (summary.width <= 1) return { distance: null, reason: 'Your recorded endpoints are ' + summary.below.distance + ' and ' + summary.above.distance + ' m. No whole-metre distance remains between them. You can keep this result or repeat a trial.' };
      return { distance: Math.floor((summary.below.distance + summary.above.distance) / 2), reason:
        (summary.complete ? 'You have met the 10 m goal. To refine it optionally, ' : 'To narrow the bracket, ') +
        'test near the midpoint of your recorded ' + summary.below.distance + '–' + summary.above.distance + ' m interval. Predict and collect it before deciding which half to keep.' };
    }
    function applyTrialDistance(event) {
      event.preventDefault();
      if (!huntPlan || status !== 'ready' || !huntHeld) return;
      var next = Number(trialDistance);
      if (!trialDistance.trim() || !Number.isFinite(next) || !Number.isInteger(next) || next < 40 || next > 300) {
        setTrialError('Enter a whole-metre distance from 40 to 300. No conditions or collected trials have changed.');
        focus('[data-distance-trial-distance]'); return;
      }
      setTrialError(''); setTrialDistance(String(next));
      if (next !== settings.distance) change({ distance: next });
      focus('[data-distance-prediction-heading]');
    }
    function trialPlanner(summary) {
      var suggestion = trialSuggestion(summary);
      return h('form', { className: 'rh-distance-trial-plan', 'data-distance-trial-plan': 'true', noValidate: true,
        'aria-labelledby': 'rh-distance-trial-heading', onSubmit: applyTrialDistance },
        h('h5', { id: 'rh-distance-trial-heading' }, 'Plan your next trial'),
        h('p', { 'data-distance-trial-current': 'true' }, 'Current viewing distance: ' + settings.distance + ' m. Typing a plan does not change it.'),
        h('label', { htmlFor: 'rh-distance-trial-distance' }, 'Next trial distance (metres)'),
        h('p', { id: 'rh-distance-trial-help' }, 'Use a whole number from 40 to 300. Set the distance to move to prediction; revealing and recording are separate steps.'),
        h('input', { id: 'rh-distance-trial-distance', 'data-distance-trial-distance': 'true', type: 'number', min: 40, max: 300, step: 1,
          value: trialDistance, 'aria-describedby': 'rh-distance-trial-help rh-distance-trial-error', 'aria-invalid': trialError ? 'true' : undefined,
          onChange: function (event) { setTrialDistance(event.target.value); setTrialError(''); } }),
        announcement('trial-input', h('p', { id: 'rh-distance-trial-error' }, trialError)),
        h('p', { id: 'rh-distance-trial-suggestion', 'data-distance-trial-suggestion': 'true' },
          (suggestion.distance === null ? '' : 'Suggested next trial: ' + suggestion.distance + ' m. ') + suggestion.reason),
        h('div', { className: 'rh-distance-actions' },
          suggestion.distance !== null && h('button', { type: 'button', 'data-distance-trial-suggest': 'true', 'aria-describedby': 'rh-distance-trial-suggestion',
            onClick: function () { setTrialDistance(String(suggestion.distance)); setTrialError(''); focus('[data-distance-trial-distance]'); } }, 'Use suggested distance'),
          h('button', { type: 'submit', 'data-distance-trial-apply': 'true', disabled: status !== 'ready' || !huntHeld,
            'aria-describedby': 'rh-distance-trial-help rh-distance-fieldwork-readiness' }, 'Set distance and go to prediction')));
    }
    function fieldworkPanel() {
      if (!fieldwork) return null;
      var summary = huntSummary, progress = !summary ? '' : summary.below && summary.above ?
        'Crossing bracket: ' + summary.below.distance + '–' + summary.above.distance + ' m (' + summary.width + ' m interval). ' + (summary.complete ? 'You narrowed it to 10 m or less.' : 'Choose a distance inside this interval to narrow it.') :
        !summary.below ? 'Record a trial at or below the selected reference.' : 'Now find a trial above the selected reference.';
      function px(distance) { return 58 + (distance - 40) / 260 * 554; }
      function py(frequency) { return 208 - frequency / 220 * 180; }
      return h('details', { className: 'rh-distance-fieldwork', 'data-distance-fieldwork': 'true' },
        h('summary', null, 'Range-finding challenge · Map the distance bands'),
        h('div', { className: 'rh-distance-fieldwork-body' }, h('h4', null, 'How tightly can you bracket the crossing?'),
          h('p', null, 'Keep 12 stripe pairs and 95% display contrast fixed. Collect one trial at or below a selected spatial-frequency reference and another above it, then narrow their distance interval to 10 m or less. This finds a model-reference crossing, not an animal’s sight limit.'),
          h('p', null, 'Starting restarts at 40 m and clears the pin and guided comparison. Your notebook, draft and saved results remain available. Working trials last only while this activity is open; keep a completed result below to retain it. The latest eight unique distances are kept.'),
          h('div', { className: 'rh-distance-actions' }, ['human', 'eagle'].map(function (id) { return h('button', { key: id, type: 'button', 'data-distance-fieldwork-start': id,
            disabled: status !== 'ready', 'aria-pressed': !!hunt && hunt.id === id, onClick: function () { startHunt(id); } }, (hunt && hunt.id === id ? 'Restart ' : 'Find ') + (id === 'human' ? 'human reference · 60 cycles/degree' : 'eagle reference · 140 cycles/degree')); })),
          huntPlan && h('section', { 'data-distance-fieldwork-run': hunt.id, 'aria-label': huntPlan.title },
            h('p', { className: 'rh-distance-fieldwork-progress', 'data-distance-fieldwork-status': 'true', 'data-complete': String(summary.complete), role: 'status', tabIndex: -1 }, progress),
            !huntHeld && h('div', { className: 'rh-distance-fieldwork-warning' }, h('strong', null, 'Restore the held variables to collect a comparable trial.'),
              h('p', null, 'Your distance stays where you set it. Predict and reveal again after restoring.'),
              h('button', { type: 'button', 'data-distance-fieldwork-restore': 'true', onClick: function () { change({ cycles: 12, contrast: 95 }); focus('[data-distance-prediction-heading]'); } }, 'Restore 12 pairs and 95% contrast')),
            trialPlanner(summary),
            h('p', { id: 'rh-distance-fieldwork-readiness', 'data-distance-fieldwork-readiness': 'true', 'data-state': trialState }, trialReadiness),
            h('div', { className: 'rh-distance-actions' },
              trialNext && h('button', { type: 'button', 'data-distance-fieldwork-next': 'true', onClick: function () { focus(trialNext[1]); } }, trialNext[0]),
              h('button', { type: 'button', 'data-distance-fieldwork-distance': 'true', onClick: function () { focus('#rh-distance-distance'); } }, 'Choose a distance'),
              h('button', { type: 'button', 'data-distance-fieldwork-record': 'true', 'aria-describedby': 'rh-distance-fieldwork-readiness', disabled: !revealed || !choice || status !== 'ready' || !huntHeld, onClick: recordTrial }, 'Record this revealed trial'),
              h('button', { type: 'button', 'data-distance-fieldwork-exit': 'true', onClick: function () { setHunt(null); setHuntMessage(''); focus('[data-distance-fieldwork-start="' + hunt.id + '"]'); } }, 'Finish range finding')),
            h('p', { 'data-distance-fieldwork-message': 'true', role: 'status' }, huntMessage || 'Choose a distance, predict its reference band, reveal the views, then record the trial here.'),
            summary.trials.length > 0 && h('div', null,
              h('svg', { viewBox: '0 0 640 250', className: 'rh-distance-fieldwork-plot', 'data-distance-fieldwork-plot': 'true', role: 'img', 'aria-label': 'Collected trials: distance in metres versus spatial frequency in cycles per degree. The labeled horizontal line is the selected reference. Exact results are in the table below.' },
                h('rect', { x: 58, y: 28, width: 554, height: 180, fill: '#102a22' }),
                [0, 60, 140, 220].map(function (value) { return h('g', { key: 'y' + value }, h('line', { x1: 58, x2: 612, y1: py(value), y2: py(value), stroke: '#45665a' }), h('text', { x: 49, y: py(value) + 4, textAnchor: 'end' }, value)); }),
                [40, 120, 200, 300].map(function (value) { return h('text', { key: 'x' + value, x: px(value), y: 226, textAnchor: 'middle' }, value); }),
                h('text', { x: 58, y: 16 }, 'Spatial frequency (cycles/degree)'), h('text', { x: 335, y: 245, textAnchor: 'middle' }, 'Viewing distance (m)'),
                h('line', { x1: 58, x2: 612, y1: py(summary.limit), y2: py(summary.limit), stroke: '#f7d895', strokeWidth: 2, strokeDasharray: '6 4' }),
                h('text', { x: 606, y: py(summary.limit) - 8, textAnchor: 'end', fill: '#ffe8b7' }, (hunt.id === 'human' ? 'Human' : 'Eagle') + ' reference · ' + summary.limit),
                summary.trials.map(function (trial) { return h('circle', { key: trial.settings.distance, 'data-distance-fieldwork-point': 'true', 'data-distance': trial.settings.distance, cx: px(trial.settings.distance), cy: py(trial.frequency), r: 5, fill: trial.frequency <= summary.limit ? '#a9e3cf' : '#f1cb84', stroke: '#102a22', strokeWidth: 2 }, h('title', null, trial.settings.distance + ' m: ' + trial.frequency.toFixed(2) + ' cycles/degree')); })),
              h('table', { className: 'rh-distance-fieldwork-table' }, h('caption', null, 'Collected trials · 12 pairs · 95% contrast. Values shown to two decimals; comparisons use unrounded values.'),
                h('thead', null, h('tr', null, ['Distance', 'Cycles/degree', 'Selected reference', 'Your prediction'].map(function (title) { return h('th', { key: title, scope: 'col' }, title); }))),
                h('tbody', null, summary.trials.map(function (trial) { return h('tr', { key: trial.settings.distance, 'data-distance-fieldwork-trial': 'true', 'data-distance': trial.settings.distance },
                  h('th', { scope: 'row' }, trial.settings.distance + ' m'), h('td', null, trial.frequency.toFixed(2)), h('td', null, trial.frequency <= summary.limit ? 'At or below ' + summary.limit : 'Above ' + summary.limit), h('td', null, labels[trial.prediction])); })))),
            h('p', { className: 'rh-distance-fieldwork-prompt' }, summary.complete ? 'Explain your evidence: which two distances bracket the crossing, what did you hold fixed, and why does this not establish a prey-detection distance? Keep this completed trial set, and write your conclusion in the notebook below.' : 'Plan your next trial: which distance would reduce the uncertainty most? Inspect the revealed scene or sweep between the reference images before recording.'),
            resultsAPI && h('p', { id: 'rh-distance-result-readiness', 'data-distance-result-readiness': 'true' }, summary.complete ?
              'Your collected ' + summary.below.distance + '–' + summary.above.distance + ' m bracket is ' + summary.width + ' m wide and meets the 10 m goal. You can keep it even if the live controls change.' :
              'To keep a result, collect a trial on each side of the reference and narrow the recorded bracket to 10 m or less. Planning or revealing a distance does not collect it.'),
            resultsAPI && h('button', { type: 'button', className: 'rh-distance-keep-result', 'data-distance-results-save': 'true', 'aria-describedby': 'rh-distance-result-readiness', disabled: !summary.complete, onClick: keepResult }, (savedResults && savedResults[hunt.id] ? 'Replace saved ' : 'Keep completed ') + hunt.id + ' result'),
            h('button', { type: 'button', 'data-distance-fieldwork-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Write your conclusion')),
          announcement('results-save', resultsMessage && h('p', { 'data-distance-results-message': 'true' }, resultsMessage)),
          savedResultsPanel()));
    }
    function guideNext() {
      if (!inquiry || status !== 'ready') return;
      if (guideStage === 'diverged') { startInquiry(inquiry.id); return; }
      if (guideStage === 'starter' && revealed) { pin(); return; }
      if (guideStage === 'pinned') { experiment(inquiry.factor); focus('[data-distance-prediction="both"]'); return; }
      if (guideStage === 'inspect') { focus(reflection ? '[data-distance-note]' : '[data-distance-reflection-heading]'); return; }
      focus('[data-distance-prediction="both"]');
    }
    function pairedViews(name) {
      var title = name === 'reference' ? 'Human reference model' : 'Wedge-tailed eagle reference model';
      return h('section', { key: name, className: 'rh-distance-pair', 'data-distance-pair': name, 'aria-label': title + ': pinned and current conditions' },
        h('h5', null, title, h('span', null, (name === 'reference' ? '60' : '140') + ' cycles/degree · same filter in both views')),
        h('div', { className: 'rh-distance-pair-images' },
          h('figure', { className: 'rh-distance-panel' }, h('figcaption', null, h('strong', null, 'Pinned condition'), h('span', null, conditionLabel(pinned.settings))),
            h('img', { 'data-distance-pinned-image': name, src: pinned[name + 'Image'], width: 1024, height: 512, alt: 'Frozen ' + title + ' at ' + conditionLabel(pinned.settings) })),
          h('figure', { className: 'rh-distance-panel' }, h('figcaption', null, h('strong', null, 'Current condition'), h('span', null, conditionLabel(settings))),
            currentImages ? h('img', { 'data-distance-current-image': name, src: currentImages[name + 'Image'], width: 1024, height: 512, alt: 'Current ' + title + ' at ' + conditionLabel(settings) }) :
              h('div', { className: 'rh-distance-current-cover', 'data-distance-current-cover': name },
                h('strong', null, snapshotMessage && revealed ? 'Use the current views above' : 'Predict this condition first'),
                h('p', null, snapshotMessage && revealed ? 'Copying this view was unavailable. The original canvas remains visible above.' : 'The pinned view stays visible. Make a fresh prediction, then reveal the current view.')))));
    }
    function magnifierPanel() {
      var cropWidth = 1024 / magnifierZoom, cropHeight = 512 / magnifierZoom;
      var cropX = (1024 - cropWidth) * magnifierX / 100, cropY = (512 - cropHeight) * magnifierY / 100;
      var canPan = !!inspectorImages && magnifierZoom > 1;
      function panControl(axis, label, value, setter) {
        return h('label', { className: 'rh-distance-magnifier-pan', htmlFor: 'rh-distance-magnifier-' + axis },
          h('span', null, label), h('output', { htmlFor: 'rh-distance-magnifier-' + axis, 'aria-live': 'off' }, magnifierZoom === 1 ? 'Full frame · no crop movement' : value + '% of available movement'),
          h('input', { id: 'rh-distance-magnifier-' + axis, 'data-distance-magnifier-pan': axis, type: 'range', min: 0, max: 100, step: 1, value: value, disabled: !canPan,
            'aria-label': label, 'aria-valuetext': (axis === 'x' ? 'Horizontal' : 'Vertical') + ' position ' + value + ' percent. Source crop starts at ' + (axis === 'x' ? cropX : cropY).toFixed(1) + ' pixels.',
            onChange: function (event) { setter(Math.max(0, Math.min(100, Number(event.target.value) || 0))); } }),
          h('small', null, axis === 'x' ? 'Left edge' : 'Top edge', h('span', null, axis === 'x' ? 'Right edge' : 'Bottom edge')));
      }
      return h('details', { className: 'rh-distance-magnifier', 'data-distance-magnifier': 'true' },
        h('summary', null, 'Enlarge the existing image · Does zoom restore detail?'),
        h('div', { className: 'rh-distance-magnifier-body' },
          h('h4', null, 'Move through the same patch in both views'),
          h('p', null, 'Enlarge the revealed images together. The factor is relative to the full-frame display: both crops cover the same image coordinates and reuse their saved pixels. This changes display size, while the scene, viewing distance, animal size and detail filters stay fixed.'),
          h('p', { className: 'rh-distance-magnifier-condition', 'data-distance-magnifier-condition': 'true', role: 'status' }, inspectorLabel + (inspectorSettings ? ': ' + conditionLabel(inspectorSettings) : ': no pin available')),
          h('div', { className: 'rh-distance-actions', role: 'group', 'aria-label': 'Display enlargement relative to full frame' }, [1, 2, 4].map(function (zoom) {
            return h('button', { key: zoom, type: 'button', 'data-distance-magnifier-zoom': zoom, 'aria-pressed': magnifierZoom === zoom, disabled: !inspectorImages, onClick: function () { setMagnifierZoom(zoom); } }, zoom + '× display' + (zoom === 1 ? ' · full frame' : ''));
          })),
          h('div', { className: 'rh-distance-magnifier-pans' }, panControl('x', 'Move crop horizontally', magnifierX, setMagnifierX), panControl('y', 'Move crop vertically', magnifierY, setMagnifierY)),
          h('button', { type: 'button', 'data-distance-magnifier-center': 'true', disabled: !canPan, onClick: function () { setMagnifierX(50); setMagnifierY(50); } }, 'Center crop'),
          !inspectorImages && h('p', { className: 'rh-distance-magnifier-unavailable', 'data-distance-magnifier-unavailable': 'true', role: 'status' }, inspectorSource === 'pinned' ? 'No pinned image is selected. Create a new pin or choose an available current condition above.' : snapshotMessage && revealed ? 'The current image copies are unavailable. Inspect the original canvases, reveal again to retry, or choose an available pin above.' : 'Predict and reveal the current condition, or choose an available pin above, before enlarging an image.'),
          inspectorImages && h('div', { className: 'rh-distance-magnifier-evidence' },
            h('p', { 'data-distance-magnifier-crop': 'true', 'data-x': cropX, 'data-y': cropY, 'data-width': cropWidth, 'data-height': cropHeight, 'data-zoom': magnifierZoom },
              magnifierZoom + '× display · ' + cropWidth + ' × ' + cropHeight + ' source-pixel patch of a 1024 × 512 image · left ' + cropX.toFixed(1) + ', top ' + cropY.toFixed(1)),
            h('div', { className: 'rh-distance-magnifier-views' }, ['human', 'eagle'].map(function (id) {
              return h('figure', { key: id, className: 'rh-distance-magnifier-view' }, h('figcaption', null, id === 'human' ? 'Human reference · same crop' : 'Eagle reference · same crop'),
                h('div', { className: 'rh-distance-magnifier-frame', 'data-distance-magnifier-frame': id },
                  h('img', { 'data-distance-magnifier-image': id, src: inspectorImages[id === 'human' ? 'referenceImage' : 'eagleImage'], width: 1024, height: 512, draggable: false,
                    alt: (id === 'human' ? 'Human' : 'Eagle') + ' reference crop, ' + magnifierZoom + ' times the full-frame display scale, at ' + conditionLabel(inspectorSettings) + '.',
                    style: { width: (magnifierZoom * 100) + '%', height: (magnifierZoom * 100) + '%', maxWidth: 'none', left: (-(magnifierZoom - 1) * magnifierX) + '%', top: (-(magnifierZoom - 1) * magnifierY) + '%' } })));
            })),
            h('figure', { className: 'rh-distance-magnifier-map' }, h('figcaption', null, 'Crop location · eagle-reference full frame'),
              h('svg', { 'data-distance-magnifier-overview': 'true', viewBox: '0 0 1024 512', role: 'img', 'aria-label': 'Full eagle-reference image with the shared crop outlined. Move the crop using the horizontal and vertical controls.' },
                h('image', { href: inspectorImages.eagleImage, width: 1024, height: 512 }),
                h('rect', { x: cropX, y: cropY, width: cropWidth, height: cropHeight, fill: 'none', stroke: '#10291e', strokeWidth: 16 }),
                h('rect', { 'data-distance-magnifier-region': 'true', x: cropX, y: cropY, width: cropWidth, height: cropHeight, fill: 'none', stroke: '#fff0b8', strokeWidth: 6 }))),
            h('p', { className: 'rh-distance-magnifier-question' }, 'Try it: compare one stripe boundary at 1× and 4×, then move across the saved frame to inspect the bird when it is present. What becomes easier to see? Enlargement can reveal variation already in the image; it cannot recreate detail removed by the filter or show objects outside this saved frame.'),
            h('button', { type: 'button', 'data-distance-magnifier-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Write what enlargement changed'),
            h('p', { className: 'rh-distance-magnifier-help' }, 'The browser may smooth enlarged pixels. These are two filtered illustrations, not measurements of your eyesight or animal detection. Zoom and crop position are viewing tools and are not saved with your observation.'))));
    }
    function inspectSameCondition() {
      var shareLabel = inspectorShare + '% human reference; ' + (100 - inspectorShare) + '% eagle reference';
      var textMetrics = inspectorImages ? model.metrics(inspectorSettings) : null;
      return h('details', { className: 'rh-distance-inspector', 'data-distance-inspector': 'true' },
        h('summary', null, 'Sweep between the two reference models'),
        h('div', { className: 'rh-distance-inspector-body' },
          h('h4', null, 'Same scene. Different detail.'),
          h('p', null, 'Move the divider across the stripes and the bird. Compare the same position through each filter. The images stay aligned; moving the divider changes which image is visible, not its sharpness, scale or viewing distance.'),
          h('div', { className: 'rh-distance-actions', role: 'group', 'aria-label': 'Condition to inspect' }, ['current', 'pinned'].map(function (source) {
            return h('button', { key: source, type: 'button', 'data-distance-inspector-source': source, 'aria-pressed': inspectorSource === source,
              disabled: source === 'pinned' && !pinned, onClick: function () { setInspectorSource(source); } }, source === 'pinned' ? 'Inspect pinned condition' : 'Inspect current condition');
          })),
          h('p', { className: 'rh-distance-inspector-condition', 'data-distance-inspector-condition': 'true', role: 'status' },
            inspectorLabel + (inspectorSettings ? ': ' + conditionLabel(inspectorSettings) : ': no pin available')),
          inspectorImages ? h('div', { className: 'rh-distance-inspector-frame', 'data-distance-inspector-frame': 'true', role: 'img',
            'aria-label': inspectorLabel + ' at ' + conditionLabel(inspectorSettings) + '. ' + shareLabel + '. Both images have the same field of view and magnification.' },
            h('img', { 'data-distance-inspector-image': 'eagle', src: inspectorImages.eagleImage, width: 1024, height: 512, alt: '', 'aria-hidden': 'true', draggable: false }),
            h('img', { 'data-distance-inspector-image': 'reference', src: inspectorImages.referenceImage, width: 1024, height: 512, alt: '', 'aria-hidden': 'true', draggable: false,
              style: { clipPath: 'inset(0 ' + (100 - inspectorShare) + '% 0 0)' } }),
            inspectorShare > 0 && inspectorShare < 100 && h('span', { className: 'rh-distance-inspector-divider', 'aria-hidden': 'true', style: { left: inspectorShare + '%' } })) :
            h('div', { className: 'rh-distance-inspector-unavailable', 'data-distance-inspector-unavailable': 'true' },
              h('strong', null, inspectorSource === 'pinned' ? 'Pin a revealed condition to inspect it here.' : snapshotMessage && revealed ? 'The current image copies are unavailable.' : 'Predict and reveal the current condition first.'),
              h('p', null, inspectorSource === 'pinned' ? 'Your previous pin has been cleared. Choose the current condition or create a new pin.' : snapshotMessage && revealed ? 'You can still inspect the original canvases above. Reveal again to retry copying, or select an available pin.' : 'This comparison uses revealed evidence only. An existing pin remains available through the pinned-condition button.')),
          h('div', { className: 'rh-distance-inspector-legend', 'aria-hidden': 'true' }, h('span', null, 'Human reference · 60 cycles/degree'), h('span', null, 'Eagle reference · 140 cycles/degree')),
          h('label', { className: 'rh-distance-inspector-range', htmlFor: 'rh-distance-inspector-share' },
            h('span', { id: 'rh-distance-inspector-share-label' }, 'Human model share of comparison'),
            h('output', { htmlFor: 'rh-distance-inspector-share', 'aria-live': 'off', style: { display: 'block', fontWeight: 400 } }, inspectorShare + '% human · ' + (100 - inspectorShare) + '% eagle'),
            h('input', { id: 'rh-distance-inspector-share', 'data-distance-inspector-range': 'true', type: 'range', min: 0, max: 100, step: 1, value: inspectorShare,
              disabled: !inspectorImages, 'aria-labelledby': 'rh-distance-inspector-share-label', 'aria-valuetext': shareLabel, 'aria-describedby': 'rh-distance-inspector-help',
              onChange: function (event) { setInspectorShare(Number(event.target.value)); } })),
          h('p', { id: 'rh-distance-inspector-help', className: 'rh-distance-inspector-help' }, 'Human image appears to the left of the divider; eagle image to the right. Use the slider, arrow keys or the full-image buttons. These percentages describe image area, not visual ability.'),
          h('div', { className: 'rh-distance-actions', role: 'group', 'aria-label': 'Comparison divider position' }, [['human', 100, 'Full human reference'], ['split', 50, 'Split view'], ['eagle', 0, 'Full eagle reference']].map(function (item) {
            return h('button', { key: item[0], type: 'button', 'data-distance-inspector-preset': item[0], disabled: !inspectorImages, 'aria-pressed': inspectorShare === item[1], onClick: function () { setInspectorShare(item[1]); } }, item[2]);
          })),
          h('p', { className: 'rh-distance-inspector-question' }, 'Look for evidence: which stripe boundaries remain distinct in each reference image? What stays fixed as you move the divider? Record what you notice in your observation below. This illustration does not predict whether an animal would detect prey.'),
          textMetrics && h('details', { className: 'rh-distance-text-comparison', 'data-distance-text-comparison': 'true' },
            h('summary', null, 'Read the detail comparison as text'),
            h('div', { className: 'rh-distance-text-body' },
              h('p', { 'data-distance-text-condition': 'true' }, inspectorLabel + ': ' + conditionLabel(inspectorSettings)),
              h('p', null, 'The same plaque spans ' + textMetrics.angleDeg.toFixed(3) + ' degrees. Its stripe spacing is ' + textMetrics.cyclesPerDegree.toFixed(1) + ' cycles per degree. Reference band: ' + labels[textMetrics.referenceBand] + '.'),
              h('table', { className: 'rh-distance-text-table' }, h('caption', null, 'Calculated detail-filter comparison · limits in cycles/degree; retained values are percentages of input stripe modulation.'),
                h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Model'), h('th', { scope: 'col' }, 'Limit'), h('th', { scope: 'col' }, 'Retained'))),
                h('tbody', null, ['human', 'eagle'].map(function (id) {
                  var human = id === 'human', transfer = human ? textMetrics.referenceTransfer : textMetrics.eagleTransfer;
                  return h('tr', { key: id, 'data-distance-text-reference': id }, h('th', { scope: 'row' }, human ? 'Human' : 'Eagle'), h('td', null, human ? '60' : '140'),
                    h('td', { 'data-distance-text-transfer': id, 'data-transfer': transfer }, (transfer * 100).toFixed(1) + '%'));
                }))),
              h('p', null, 'Higher retained modulation means stronger light–dark variation in this illustrative filter. These are calculated model values, not measured image pixels or animal detection probabilities. Display contrast sets the input variation; it does not change the retained fraction at fixed distance and stripe count.'),
              h('button', { type: 'button', onClick: function () { focus('[data-distance-note]'); } }, 'Record the model comparison'))),
          magnifierPanel()));
    }
    function readSignal() {
      if (!signalAPI || !currentImages || status !== 'ready') return;
      try {
        if (!scene.current || conditionKey(scene.current.getDiagnostics().settings) !== key) throw new Error('Unrendered conditions');
        var area = signalAPI.region(settings, reference.current.width, reference.current.height);
        if (!area || eagle.current.width !== area.width || eagle.current.height !== area.height) throw new Error('Unsupported image size');
        var a = reference.current.getContext('2d').getImageData(area.x0, area.y, area.count, 1).data;
        var b = eagle.current.getContext('2d').getImageData(area.x0, area.y, area.count, 1).data;
        var data = signalAPI.fromRows(settings, a, b); if (!data) throw new Error('Invalid samples');
        setSignal({ key: key, inspection: currentImages, data: data }); setSignalError(null);
        setProbe(Math.floor((data.region.count - 1) / 2));
      } catch (error) {
        setSignal(null); setSignalError({ key: key, inspection: currentImages, text: 'Pixel reading is unavailable for this view. Your images and notebook remain available. Try reading again, or reveal the view again.' });
      }
    }
    function pairedPixelExplorer(before, after, index) {
      var positions = [['start', 'Start of strip', 0], ['middle', 'Middle of strip', Math.floor((before.region.count - 1) / 2)], ['end', 'End of strip', before.region.count - 1]];
      ['human', 'eagle'].forEach(function (id) {
        ['min', 'max'].forEach(function (kind) {
          positions.push([id + '-' + kind, (kind === 'min' ? 'Lowest kept ' : 'Highest kept ') + id + ' sample', before[id].values.indexOf(before[id][kind])]);
        });
      });
      var answers = pairAnswers && pairAnswers.kept === keptSignal && pairAnswers.data === after ? pairAnswers.values : {};
      function move(value, jump) {
        var next = Math.max(0, Math.min(before.region.count - 1, Math.round(Number(value) || 0)));
        if (jump && next === index) { focus('[data-distance-pair-probe]'); return; }
        if (jump) pairJump.current = { kept: keptSignal, data: after };
        setPairProbe({ kept: keptSignal, data: after, index: next });
      }
      function check(id, answer) {
        var next = Object.assign({}, answers); next[id] = answer;
        setPairAnswers({ kept: keptSignal, data: after, values: next });
      }
      function valueText(id) { return (id === 'human' ? 'Human' : 'Eagle') + ': kept ' + before[id].values[index].toFixed(1) + ', current ' + after[id].values[index].toFixed(1); }
      return h('details', { className: 'rh-distance-pair-explorer', 'data-distance-pair-explorer': 'true' },
        h('summary', null, 'Compare the same pixel · Before and after contrast changes'),
        h('div', { className: 'rh-distance-pair-explorer-body' },
          h('h5', null, 'Does a fading pattern make every pixel darker?'),
          h('p', null, 'Kept: ' + conditionLabel(before.settings) + '. Current: ' + conditionLabel(after.settings) + '. Both readings sample the same positions.'),
          h('p', { id: 'rh-distance-pair-help' }, 'Choose a position, then use arrow keys to inspect neighboring pixels. The low and high shortcuts use the kept reading’s first matching sample from the left. All four values refer to the same image pixel; moving this comparison probe leaves the current-only probe unchanged.'),
          h('div', { className: 'rh-distance-actions', role: 'group', 'aria-label': 'Choose a shared pixel position' }, positions.map(function (item) {
            return h('button', { key: item[0], type: 'button', 'data-distance-pair-jump': item[0], 'data-index': item[2], 'aria-describedby': 'rh-distance-pair-help', onClick: function () { move(item[2], true); } }, item[1]);
          })),
          h('label', { htmlFor: 'rh-distance-pair-probe', className: 'rh-distance-signal-probe' },
            h('strong', null, 'Compare the same pixel'),
            h('output', { htmlFor: 'rh-distance-pair-probe', 'aria-live': 'off', 'data-distance-pair-pixel': 'true', 'data-x': before.region.x0 + index, 'data-y': before.region.y }, 'Image pixel ' + (before.region.x0 + index) + ', row ' + before.region.y),
            h('input', { id: 'rh-distance-pair-probe', 'data-distance-pair-probe': 'true', type: 'range', min: 0, max: before.region.count - 1, step: 1, value: index,
              'aria-label': 'Compare the same pixel', 'aria-describedby': 'rh-distance-pair-help',
              'aria-valuetext': 'Image pixel ' + (before.region.x0 + index) + ', row ' + before.region.y + '. ' + valueText('human') + '. ' + valueText('eagle') + '. Mean RGB code values.',
              onChange: function (event) { move(event.target.value, false); } })),
          h('table', { className: 'rh-distance-text-table', 'data-distance-pair-samples': 'true' },
            h('caption', null, 'Mean RGB code values at the shared pixel. Change = current − kept, calculated before rounding to one decimal; displayed subtraction can differ by 0.1.'),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Reading'), h('th', { scope: 'col' }, 'Human'), h('th', { scope: 'col' }, 'Eagle'))),
            h('tbody', null, [['kept', 'Kept'], ['current', 'Current'], ['change', 'Change']].map(function (item) {
              return h('tr', { key: item[0] }, h('th', { scope: 'row' }, item[1]), ['human', 'eagle'].map(function (id) {
                var value = item[0] === 'kept' ? before[id].values[index] : item[0] === 'current' ? after[id].values[index] : after[id].values[index] - before[id].values[index];
                var rounded = Number(value.toFixed(1));
                return h('td', { key: id, 'data-distance-pair-value': id + '-' + item[0], 'data-value': value }, (item[0] === 'change' && rounded > 0 ? '+' : '') + rounded.toFixed(1));
              }));
            }))),
          h('p', null, 'A positive change means this pixel became brighter in RGB code values; a negative change means it became darker. One pixel does not measure the strip’s light–dark range. Use the full-strip ranges above for the next two questions.'),
          ['human', 'eagle'].map(function (id) {
            var label = id === 'human' ? 'Human' : 'Eagle', keptRange = Number(before[id].range.toFixed(1)), currentRange = Number(after[id].range.toFixed(1));
            var correct = currentRange < keptRange ? 'smaller' : currentRange > keptRange ? 'larger' : 'same';
            return h('section', { key: id, className: 'rh-distance-pair-question' },
              h('h5', { id: 'rh-distance-pair-question-' + id }, label + ' reference: how did the displayed full-strip range change?'),
              h('div', { className: 'rh-distance-actions', role: 'group', 'aria-labelledby': 'rh-distance-pair-question-' + id }, [['smaller', 'Smaller range'], ['same', 'Same range'], ['larger', 'Larger range']].map(function (item) {
                return h('button', { key: item[0], type: 'button', 'data-distance-pair-answer': id + '-' + item[0], 'aria-pressed': answers[id] === item[0], onClick: function () { check(id, item[0]); } }, item[1]);
              })),
              announcement('signal-pair-' + id, answers[id] && h('p', { 'data-distance-pair-feedback': id, 'data-correct': String(answers[id] === correct) },
                (answers[id] === correct ? 'Supported by these readings. ' : 'Compare the full-strip ranges again. ') + label + ' kept range: ' + keptRange.toFixed(1) + '; current range: ' + currentRange.toFixed(1) + '. ' +
                (correct === 'same' ? 'The displayed ranges are equal.' : 'The current displayed range is ' + correct + '.') + ' These are sampled image values, not a measure of animal detection.')));
          }),
          h('ol', { className: 'rh-distance-pair-inquiry' },
            h('li', null, 'Visit a low and a high kept sample in each reference. Compare the current value at those exact positions.'),
            h('li', null, 'Compare the full-strip ranges. Did the low and high positions you inspected move in the same direction? What evidence supports your explanation?'),
            h('li', null, 'Write both conditions, selected pixel positions and measured values in your notebook. Explain what stayed fixed and what the illustration cannot tell you about eyesight.')),
          h('button', { type: 'button', 'data-distance-pair-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Explain the before-and-after evidence')));
    }
    function signalComparisonPanel() {
      if (!keptSignal) return null;
      var before = keptSignal.data, after = currentSignal;
      var held = settings.distance === before.settings.distance && settings.cycles === before.settings.cycles;
      var sameRegion = after && ['x0', 'x1', 'y', 'count', 'width', 'height'].every(function (field) { return before.region[field] === after.region[field]; });
      var compatible = after && held && sameRegion;
      var same = compatible && before.settings.contrast === after.settings.contrast;
      var index = compatible && pairProbe && pairProbe.kept === keptSignal && pairProbe.data === after ? Math.max(0, Math.min(before.region.count - 1, pairProbe.index)) : Math.floor((before.region.count - 1) / 2);
      function plotY(value) { return 216 - value / 255 * 192; }
      function pairPlot(id) {
        var title = id === 'human' ? 'Human reference' : 'Eagle reference';
        return h('figure', { key: id, className: 'rh-distance-signal-pair-plot' },
          h('figcaption', null, title),
          h('svg', { 'data-distance-signal-pair-chart': id, viewBox: '0 0 640 260', role: 'img', 'aria-label': title + ' measured pixels. Kept reading dashed; current reading solid. Fixed scale zero to 255.', 'data-plot-left': 54, 'data-plot-right': 620, 'data-plot-top': 24, 'data-plot-bottom': 216, 'data-max': 255, 'data-count': before.region.count },
            [0, 128, 255].map(function (value) { return h('g', { key: value }, h('line', { x1: 54, x2: 620, y1: plotY(value), y2: plotY(value), stroke: '#587e6b' }), h('text', { x: 44, y: plotY(value) + 6, textAnchor: 'end' }, value)); }),
            ['kept', 'current'].map(function (kind) { var values = (kind === 'kept' ? before : after)[id].values; return h('polyline', { key: kind, 'data-distance-signal-pair-line': id + '-' + kind,
              points: values.map(function (value, i) { return (54 + i / (values.length - 1) * 566).toFixed(3) + ',' + plotY(value).toFixed(3); }).join(' '), fill: 'none', stroke: kind === 'kept' ? '#d9dfce' : id === 'human' ? '#f3cf8d' : '#70dfd5', strokeWidth: 3, strokeDasharray: kind === 'kept' ? '7 5' : undefined }); }),
            h('line', { 'data-distance-pair-cursor': id, x1: 54 + index / (before.region.count - 1) * 566, x2: 54 + index / (before.region.count - 1) * 566, y1: 24, y2: 216, stroke: '#ffffff', strokeWidth: 1, strokeDasharray: '3 4' }),
            ['kept', 'current'].map(function (kind) { return h('circle', { key: kind, 'data-distance-pair-marker': id + '-' + kind,
              cx: 54 + index / (before.region.count - 1) * 566, cy: plotY((kind === 'kept' ? before : after)[id].values[index]), r: kind === 'kept' ? 6 : 3,
              fill: kind === 'kept' ? '#142e24' : '#ffffff', stroke: '#ffffff', strokeWidth: 2 }); }),
            [0, 50, 100].map(function (value) { return h('text', { key: value, x: 54 + value / 100 * 566, y: 245, textAnchor: value === 0 ? 'start' : value === 100 ? 'end' : 'middle' }, value + '%'); })));
      }
      return h('section', { className: 'rh-distance-signal-kept', 'data-distance-signal-kept': 'true', 'aria-label': 'Kept pixel reading and contrast comparison' },
        h('h4', { tabIndex: -1, 'data-distance-signal-kept-heading': 'true' }, 'What changes when the pattern fades?'),
        h('p', { 'data-distance-signal-kept-label': 'true' }, 'Kept reading: ' + conditionLabel(before.settings) + ' · ' + before.region.count + ' pixels'),
        h('dl', { className: 'rh-distance-signal-kept-ranges' }, ['human', 'eagle'].map(function (id) { return h('div', { key: id }, h('dt', null, (id === 'human' ? 'Human' : 'Eagle') + ' kept range'), h('dd', { 'data-distance-signal-kept-range': id, 'data-range': before[id].range }, before[id].range.toFixed(1))); })),
        h('p', null, 'Keep distance and stripe count fixed. Predict how the light–dark variation will change, then try 25% contrast and make a fresh prediction, reveal and pixel reading.'),
        h('div', { className: 'rh-distance-actions' },
          h('button', { type: 'button', 'data-distance-signal-lower': 'true', disabled: status !== 'ready' || before.settings.contrast === 25, onClick: function () { change({ distance: before.settings.distance, cycles: before.settings.cycles, contrast: 25 }); focus('[data-distance-prediction="both"]'); } }, 'Try 25% contrast with kept distance and stripes'),
          h('button', { type: 'button', 'data-distance-signal-held': 'true', disabled: status !== 'ready' || held, onClick: function () { change({ distance: before.settings.distance, cycles: before.settings.cycles }); focus('[data-distance-prediction="both"]'); } }, 'Restore kept distance and stripe count'),
          h('button', { type: 'button', 'data-distance-signal-clear': 'true', onClick: function () { setKeptSignal(null); focus(currentSignal ? '[data-distance-signal-keep]' : '[data-distance-signal] > summary'); } }, 'Clear kept reading')),
        h('p', { className: 'rh-distance-signal-pair-status', 'data-distance-signal-pair-status': 'true', role: 'status' }, !held ? 'Distance or stripe count changed. Restore the kept distance and stripe count to isolate contrast; your current contrast will stay as it is.' : !after ? 'The kept reading stays available. Predict, reveal and read the current pixels before comparing.' : !sameRegion ? 'The sampled pixel regions differ. Read a fresh view at the kept distance and stripe count before comparing.' : same ? 'No factor changed. Both readings use the same conditions; change display contrast to investigate its effect.' : 'Only display contrast changed: ' + before.settings.contrast + '% → ' + after.settings.contrast + '%. Distance, stripe count and sampled pixel positions are held fixed.'),
        compatible && h('div', { 'data-distance-signal-pair': 'true', 'data-kind': same ? 'same' : 'contrast' },
          h('p', { className: 'rh-distance-signal-pair-label' }, 'Kept: ' + before.settings.contrast + '% contrast · Current: ' + after.settings.contrast + '% contrast'),
          h('p', null, '– – Kept reading   ━━ Current reading · mean RGB code value, fixed 0–255 scale'),
          h('div', { className: 'rh-distance-signal-pair-plots' }, ['human', 'eagle'].map(pairPlot)),
          h('p', { className: 'rh-distance-signal-help' }, 'Horizontal position runs from 0% to 100% of the same sampled strip in each graph. Compare the trace heights and the spacing between their peaks. The outlined marker is kept; the filled marker is current. The comparison probe below moves both markers to the same position.'),
          h('table', { className: 'rh-distance-signal-pair-table' }, h('caption', null, 'Sampled ranges are maximum minus minimum RGB code value. Ratios are current ÷ kept within each reference.'),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Reference'), h('th', { scope: 'col' }, 'Kept range'), h('th', { scope: 'col' }, 'Current range'), h('th', { scope: 'col' }, 'Current ÷ kept'))),
            h('tbody', null, ['human', 'eagle'].map(function (id) { var ratio = before[id].range > 0 ? after[id].range / before[id].range : null; return h('tr', { key: id },
              h('th', { scope: 'row' }, id === 'human' ? 'Human' : 'Eagle'), h('td', null, before[id].range.toFixed(1)),
              h('td', { 'data-distance-signal-pair-range': id, 'data-range': after[id].range }, after[id].range.toFixed(1)),
              h('td', { 'data-distance-signal-pair-ratio': id, 'data-ratio': ratio === null ? undefined : ratio }, ratio === null ? 'Not defined (kept range is zero)' : ratio.toFixed(2) + '×')); }))),
          h('p', { className: 'rh-distance-signal-question' }, 'Explain the evidence: did the range change by about the same fraction as display contrast? What stayed fixed? Current ÷ kept display contrast is ' + (after.settings.contrast / before.settings.contrast).toFixed(2) + '×. Pixel rounding and browser blur can make the measured ratios differ; there is no exact-match score.'),
          pairedPixelExplorer(before, after, index)),
        h('p', { className: 'rh-distance-signal-help' }, 'This kept reading is separate from your image pin and lasts until you clear it or close the investigation. To keep pixel evidence in the notebook, write both conditions and measured ranges in your observation; the pixel traces are not saved with it.'));
    }
    function signalExplorer(data, index) {
      var humanRange = Number(data.human.range.toFixed(1)), eagleRange = Number(data.eagle.range.toFixed(1));
      var answer = humanRange === eagleRange ? 'equal' : humanRange > eagleRange ? 'human' : 'eagle';
      var positions = [['start', 'Start of strip', 0], ['middle', 'Middle of strip', Math.floor((data.region.count - 1) / 2)], ['end', 'End of strip', data.region.count - 1]];
      ['human', 'eagle'].forEach(function (id) {
        ['min', 'max'].forEach(function (kind) {
          // IndexOf selects the first measured occurrence when extrema repeat.
          positions.push([id + '-' + kind, (kind === 'min' ? 'Lowest ' : 'Highest ') + id + ' sample', data[id].values.indexOf(data[id][kind])]);
        });
      });
      return h('details', { className: 'rh-distance-signal-explorer', 'data-distance-signal-explorer': 'true' },
        h('summary', null, 'Explore the measured values · Find the light–dark range'),
        h('div', { className: 'rh-distance-signal-explorer-body' },
          h('h5', null, 'Find the low and high points without tracing the graph'),
          h('p', null, 'Current reading: ' + conditionLabel(data.settings) + '. These measurements come from the same pixel strip as the graph.'),
          h('p', { id: 'rh-distance-signal-explore-help' }, 'Choose a sample to move and focus the pixel probe. Its value gives both references at the same image position; arrow keys inspect neighboring pixels. Repeated lowest or highest values use their first position from the left. Each reference can reach its extreme at a different position.'),
          h('div', { className: 'rh-distance-actions', role: 'group', 'aria-label': 'Move probe to a measured sample' }, positions.map(function (item) {
            return h('button', { key: item[0], type: 'button', 'data-distance-signal-jump': item[0], 'data-index': item[2], 'aria-describedby': 'rh-distance-signal-explore-help',
              onClick: function () {
                if (item[2] === index) { focus('[data-distance-signal-probe]'); return; }
                probeJump.current = data; setProbe(item[2]);
              } }, item[1]);
          })),
          h('table', { className: 'rh-distance-text-table', 'data-distance-signal-extremes': 'true' },
            h('caption', null, 'Current measured RGB code values. Range = highest − lowest, calculated before rounding to one decimal; subtracting the displayed values can differ by 0.1.'),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Measure'), h('th', { scope: 'col' }, 'Human'), h('th', { scope: 'col' }, 'Eagle'))),
            h('tbody', null, [['min', 'Lowest'], ['max', 'Highest'], ['range', 'Range']].map(function (item) {
              return h('tr', { key: item[0] }, h('th', { scope: 'row' }, item[1]), ['human', 'eagle'].map(function (id) {
                return h('td', { key: id, 'data-distance-signal-extreme': item[0] === 'range' ? undefined : id + '-' + item[0],
                  'data-value': item[0] === 'range' ? undefined : data[id][item[0]], 'data-distance-signal-explorer-range': item[0] === 'range' ? id : undefined,
                  'data-range': item[0] === 'range' ? data[id].range : undefined }, data[id][item[0]].toFixed(1));
              }));
            }))),
          h('h5', { id: 'rh-distance-signal-range-question' }, 'Which reference has the larger displayed light–dark range in this reading?'),
          h('div', { className: 'rh-distance-actions', role: 'group', 'aria-labelledby': 'rh-distance-signal-range-question' },
            [['human', 'Human reference'], ['eagle', 'Eagle reference'], ['equal', 'Same displayed range']].map(function (item) {
              return h('button', { key: item[0], type: 'button', 'data-distance-signal-range-answer': item[0], 'aria-pressed': activeSignalAnswer === item[0],
                onClick: function () { setSignalAnswer({ data: data, answer: item[0] }); } }, item[1]);
            })),
          announcement('signal-range', activeSignalAnswer && h('p', { 'data-distance-signal-range-feedback': 'true', 'data-correct': String(activeSignalAnswer === answer) },
            (activeSignalAnswer === answer ? 'Supported by this reading. ' : 'Compare the displayed ranges again. ') +
            'Human range: ' + humanRange.toFixed(1) + '; eagle range: ' + eagleRange.toFixed(1) + ' mean RGB code values. ' +
            (answer === 'equal' ? 'The displayed ranges are equal. ' : 'The ' + answer + ' reference has greater sampled variation here. ') +
            'This describes these rendered pixels, not a general measure of eyesight or prey detection.')),
          h('p', null, 'Try it: visit each reference’s lowest and highest sample and compare the other reference at those positions. Then keep this reading, lower only display contrast and measure again. Use the notebook to explain the ranges and what you held fixed; your personal observations are not scored.')));
    }
    function signalPanel() {
      if (!signalAPI) return null;
      var data = currentSignal, index = data ? Math.max(0, Math.min(data.region.count - 1, probe)) : 0;
      var colors = { human: '#f3cf8d', eagle: '#70dfd5' };
      function plotX(i) { return 50 + i / (data.region.count - 1) * 570; }
      function plotY(value) { return 246 - value / 255 * 222; }
      function sampledImage(id) {
        return h('figure', { key: id, className: 'rh-distance-signal-image' },
          h('figcaption', null, id === 'human' ? 'Human reference · sampled strip' : 'Eagle reference · same sampled strip'),
          h('div', null, h('img', { 'data-distance-signal-image': id, src: currentImages[id === 'human' ? 'referenceImage' : 'eagleImage'], width: 1024, height: 512, alt: (id === 'human' ? 'Human' : 'Eagle') + ' reference at ' + conditionLabel(data.settings) + '. The line marks the measured central strip.' }),
            h('svg', { 'data-distance-signal-overlay': id, viewBox: '0 0 1024 512', 'aria-hidden': 'true' },
              h('line', { x1: data.region.x0, x2: data.region.x1, y1: data.region.y, y2: data.region.y, stroke: '#10241d', strokeWidth: 12 }),
              h('line', { 'data-distance-signal-sample': id, x1: data.region.x0, x2: data.region.x1, y1: data.region.y, y2: data.region.y, stroke: colors[id], strokeWidth: 5 }),
              h('circle', { 'data-distance-signal-marker': id, cx: data.region.x0 + index, cy: data.region.y, r: 10, fill: colors[id], stroke: '#10241d', strokeWidth: 4 }))));
      }
      return h('details', { className: 'rh-distance-signal', 'data-distance-signal': 'true' },
        h('summary', null, 'Read the stripe signal · Measure the rendered pixels'),
        h('div', { className: 'rh-distance-signal-body' },
          h('h4', null, 'Follow a light–dark pattern through both views'),
          h('p', null, 'Sample the same horizontal strip in both revealed images. The graph uses their actual pixel values. Its vertical scale stays fixed, so a flatter trace means less variation in this sampled strip.'),
          h('div', { className: 'rh-distance-actions' },
            h('button', { type: 'button', 'data-distance-signal-start': 'true', disabled: status !== 'ready', onClick: function () { startInquiry('contrast'); focus('[data-distance-prediction="both"]'); } }, 'Start a controlled contrast experiment'),
            h('button', { type: 'button', 'data-distance-signal-read': 'true', 'aria-describedby': 'rh-distance-signal-readiness', disabled: !currentImages || status !== 'ready', onClick: readSignal }, data ? 'Read these pixels again' : 'Read pixels from the revealed view'),
            h('button', { type: 'button', 'data-distance-signal-keep': 'true', 'aria-describedby': 'rh-distance-signal-readiness', disabled: !data || status !== 'ready', onClick: function () { if (currentSignal) setKeptSignal({ run: ++keptSignalNumber.current, data: currentSignal }); } }, keptSignal ? 'Replace kept reading' : 'Keep this reading')),
          h('p', { id: 'rh-distance-signal-readiness', 'data-distance-signal-readiness': 'true', 'data-state': signalState }, signalReadiness),
          signalNext && h('button', { type: 'button', 'data-distance-signal-next': 'true', onClick: function () { focus(signalNext[1]); } }, signalNext[0]),
          h('p', { className: 'rh-distance-signal-help' }, 'The starter uses 80 m, eight stripe pairs and 95% contrast in the existing guided activity. Starting clears the pin and other working challenges; your notebook, draft and kept results remain available. Predict and reveal, read the signal, then hold distance and stripe count fixed while lowering contrast.'),
          announcement('signal', !currentImages ? h('p', { 'data-distance-signal-unavailable': 'true' }, snapshotMessage && revealed ? 'Image copies are unavailable. The original canvases remain above; reveal again to retry before reading this signal.' : 'Predict and reveal the current condition before reading its pixels. This inspector measures the current view only.') :
            currentSignalError ? h('p', { className: 'rh-distance-signal-error', 'data-distance-signal-error': 'true' }, currentSignalError) :
            data ? h('p', { className: 'rh-distance-signal-condition' }, 'Sampled: ' + conditionLabel(data.settings) + ' · ' + data.region.count + ' image pixels') : null),
          data && h('section', { 'data-distance-signal-evidence': 'true', 'aria-label': 'Measured stripe signal' },
            h('div', { className: 'rh-distance-signal-images' }, ['human', 'eagle'].map(sampledImage)),
            h('p', null, 'The marked line samples the central 60% of the plaque at image row 256. The graph spreads that strip across its width; the images keep their original scale. Changing distance changes the strip’s angular size and pixel count.'),
            h('div', { className: 'rh-distance-signal-legend' }, h('span', null, '– – Human reference'), h('span', null, '━━ Eagle reference')),
            h('div', { style: { fontSize: 13, marginBottom: 6 } }, 'Mean RGB code value · fixed 0–255 scale'),
            h('svg', { className: 'rh-distance-signal-chart', 'data-distance-signal-chart': 'true', viewBox: '0 0 640 300', role: 'img', 'aria-label': 'Actual mean RGB code values across the same sampled strip. Fixed vertical scale zero to 255. Human trace is dashed; eagle trace is solid.', 'data-plot-left': 50, 'data-plot-right': 620, 'data-plot-top': 24, 'data-plot-bottom': 246, 'data-max': 255, 'data-count': data.region.count },
              [0, 64, 128, 192, 255].map(function (value) { return h('g', { key: value }, h('line', { x1: 50, x2: 620, y1: plotY(value), y2: plotY(value), stroke: '#4c7362' }), h('text', { x: 42, y: plotY(value) + 5, textAnchor: 'end' }, value)); }),
              ['human', 'eagle'].map(function (id) { return h('polyline', { key: id, 'data-distance-signal-line': id, points: data[id].values.map(function (value, i) { return plotX(i).toFixed(3) + ',' + plotY(value).toFixed(3); }).join(' '), fill: 'none', stroke: colors[id], strokeWidth: 2.5, strokeDasharray: id === 'human' ? '6 3' : undefined }); }),
              h('line', { 'data-distance-signal-cursor': 'true', x1: plotX(index), x2: plotX(index), y1: 24, y2: 246, stroke: '#ffffff', strokeWidth: 1, strokeDasharray: '3 4' }),
              ['human', 'eagle'].map(function (id) { return h('circle', { key: id, cx: plotX(index), cy: plotY(data[id].values[index]), r: 4, fill: colors[id], stroke: '#14271f' }); }),
              [0, 25, 50, 75, 100].map(function (percent) { return h('text', { key: percent, x: 50 + percent / 100 * 570, y: 269, textAnchor: percent === 0 ? 'start' : percent === 100 ? 'end' : 'middle' }, percent + '%'); }),
              h('text', { x: 335, y: 294, textAnchor: 'middle' }, 'Position along the sampled strip')),
            h('label', { htmlFor: 'rh-distance-signal-probe', className: 'rh-distance-signal-probe' },
              h('strong', null, 'Move the pixel probe'),
              h('output', { htmlFor: 'rh-distance-signal-probe', 'aria-live': 'off', 'data-distance-signal-pixel': 'true', 'data-x': data.region.x0 + index, 'data-y': data.region.y }, 'Image pixel ' + (data.region.x0 + index) + ', row ' + data.region.y),
              h('input', { id: 'rh-distance-signal-probe', 'data-distance-signal-probe': 'true', type: 'range', min: 0, max: data.region.count - 1, step: 1, value: index, 'aria-label': 'Move the pixel probe', 'aria-describedby': 'rh-distance-signal-explore-help', 'aria-valuetext': 'Image pixel ' + (data.region.x0 + index) + '. Human ' + data.human.values[index].toFixed(1) + '; eagle ' + data.eagle.values[index].toFixed(1) + ' mean RGB code value.', onChange: function (event) { setProbe(Math.max(0, Math.min(data.region.count - 1, Math.round(Number(event.target.value) || 0)))); } })),
            h('table', { className: 'rh-distance-signal-table' }, h('caption', null, 'Measured RGB code values · each value is the mean of red, green and blue'),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Reference'), h('th', { scope: 'col' }, 'At probe'), h('th', { scope: 'col' }, 'Sampled range (max − min)'))),
              h('tbody', null, ['human', 'eagle'].map(function (id) { return h('tr', { key: id }, h('th', { scope: 'row' }, id === 'human' ? 'Human' : 'Eagle'), h('td', { 'data-distance-signal-value': id }, data[id].values[index].toFixed(1)), h('td', { 'data-distance-signal-range': id, 'data-range': data[id].range }, data[id].range.toFixed(1))); }))),
            signalExplorer(data, index),
            h('p', { className: 'rh-distance-signal-question' }, 'Try it: record the sampled ranges, lower display contrast, and read again after a fresh prediction and reveal. Does the height of the trace change? Does the stripe spacing change? Keep distance and stripe count fixed to isolate contrast.'),
            h('button', { type: 'button', 'data-distance-signal-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Record your pixel evidence in the notebook')),
          signalComparisonPanel(),
          h('p', { className: 'rh-distance-signal-limit' }, 'These are rendered RGB code values, not physical luminance, retinal responses or detection probabilities. Browser sampling, blur and screen pixels affect the traces. The graph measures the image; it is separate from the calculated filter-retention meters.')));
    }
    function exactConditions() {
      var fields = [
        { id: 'distance', label: 'Exact viewing distance (m)', min: 40, max: 300, unit: 'm' },
        { id: 'cycles', label: 'Exact stripe pairs', min: 4, max: 20, unit: 'pairs' },
        { id: 'contrast', label: 'Exact display contrast (%)', min: 10, max: 100, unit: '%' }
      ];
      var values = exact ? exact.values : { distance: String(settings.distance), cycles: String(settings.cycles), contrast: String(settings.contrast) };
      var stale = !!exact && exact.key !== key, proposed = { version: 1 }, invalid = {};
      fields.forEach(function (field) {
        var text = values[field.id].trim(), value = Number(text);
        if (!text || !Number.isFinite(value) || !Number.isInteger(value) || value < field.min || value > field.max) {
          invalid[field.id] = field.label + ': enter a whole number from ' + field.min + ' to ' + field.max + '.';
        } else proposed[field.id] = value;
      });
      var valid = !Object.keys(invalid).length;
      var comparison = valid && !stale ? evidence.compare(settings, proposed) : null;
      var state = status !== 'ready' ? status : stale ? 'stale' : 'ready';
      var readiness = state === 'loading' ? 'The scene is loading. You can plan values here; apply them when it is ready.' :
        state === 'error' ? 'The scene is unavailable. Your planned values are kept here. Retry the scene before applying.' :
        state === 'stale' ? 'The live conditions changed elsewhere. Your planned values are kept here. Use current conditions to replace this plan, then edit again.' :
        'Apply checks all three values and moves to prediction. Changed conditions require a fresh prediction and reveal; unchanged values keep the existing evidence.';
      function reset() {
        exactFocus.current = 'distance';
        setExact(null); setExactErrors({}); setExactMessage('The form now uses the current conditions. No scene or evidence changed.');
      }
      function submit(event) {
        event.preventDefault();
        if (state !== 'ready') return;
        setExactErrors(invalid);
        if (!valid) {
          exactFocus.current = fields.filter(function (field) { return invalid[field.id]; })[0].id;
          setExactMessage('Check the planned conditions. ' + fields.filter(function (field) { return invalid[field.id]; }).map(function (field) { return invalid[field.id]; }).join(' '));
          return;
        }
        setExact(null);
        setExactMessage(comparison.kind === 'same' ? 'These values already match the current conditions. Any existing evidence is preserved.' : 'Applied ' + conditionLabel(proposed) + '. Make a fresh prediction, then reveal.');
        if (comparison.kind !== 'same') change(proposed);
        focus('[data-distance-prediction-heading]');
      }
      return h('details', { className: 'rh-distance-exact', 'data-distance-exact': 'true' },
        h('summary', null, 'Set exact conditions · Plan a controlled change'),
        h('form', { noValidate: true, onSubmit: submit, 'data-distance-exact-form': 'true', 'aria-label': 'Exact investigation conditions', 'aria-describedby': 'rh-distance-exact-help' },
          h('p', { id: 'rh-distance-exact-help' }, 'Type whole numbers, then apply. To test one cause, pin a revealed starter and change just one factor. Typing here leaves the live scene and collected evidence unchanged.'),
          fields.map(function (field) {
            var id = 'rh-distance-exact-' + field.id, error = exactErrors[field.id];
            return h('div', { key: field.id, className: 'rh-distance-exact-field' },
              h('label', { htmlFor: id }, field.label),
              h('p', { id: id + '-help' }, 'Whole numbers: ' + field.min + '–' + field.max + ' ' + field.unit + '. Current: ' + settings[field.id] + ' ' + field.unit + '.'),
              h('input', { id: id, type: 'number', inputMode: 'numeric', required: true, min: field.min, max: field.max, step: 1, value: values[field.id],
                'data-distance-exact-input': field.id, 'aria-invalid': error ? 'true' : undefined, 'aria-describedby': id + '-help ' + id + '-error',
                onChange: function (event) {
                  var next = Object.assign({}, values); next[field.id] = event.target.value;
                  setExact({ key: exact ? exact.key : key, values: next });
                  var errors = Object.assign({}, exactErrors); delete errors[field.id]; setExactErrors(errors); setExactMessage('');
                } }),
              h('p', { id: id + '-error', 'data-distance-exact-error': field.id, className: 'rh-distance-exact-error' }, error || ''));
          }),
          h('div', { className: 'rh-distance-exact-preview', 'data-distance-exact-preview': 'true', 'data-kind': stale ? 'stale' : !valid ? 'invalid' : comparison.kind === 'same' ? 'same' : comparison.kind === 'single' ? 'single' : 'multiple' },
            h('strong', null, 'Changes from the current conditions'),
            h('p', null, stale ? 'Refresh this plan from the current conditions before comparing changes.' : !valid ? 'Enter allowed whole numbers in all three fields to preview the comparison.' : comparisonLabel(comparison)),
            valid && !stale && h('p', null, 'Planned: ' + conditionLabel(proposed) + '.'),
            valid && !stale && comparison.kind === 'single' && h('p', { 'data-distance-exact-reference': !pinned ? 'missing' : conditionKey(pinned.settings) === key ? 'matching' : 'different' },
              !pinned ? 'To keep evidence of this starter, predict and reveal the current conditions, then pin them before applying. Your plan stays here.' :
              conditionKey(pinned.settings) !== key ? 'Your pin uses different conditions. To isolate this change in a pinned comparison, reveal and pin the current conditions before applying. Pinning replaces the earlier pin; your plan stays here.' :
              'Your pin matches the current conditions. After applying, predict and reveal. Compare the same reference in the pinned and current views, then explain what changed in your notebook.')),
          h('p', { id: 'rh-distance-exact-readiness', 'data-distance-exact-readiness': 'true', 'data-state': state }, readiness),
          h('div', { className: 'rh-distance-actions' },
            h('button', { type: 'submit', 'data-distance-exact-apply': 'true', disabled: state !== 'ready', 'aria-describedby': 'rh-distance-exact-readiness', className: 'rh-distance-primary' }, 'Apply values and go to prediction'),
            h('button', { type: 'button', 'data-distance-exact-reset': 'true', onClick: reset }, 'Use current conditions'),
            state === 'error' && h('button', { type: 'button', 'data-distance-exact-retry': 'true', onClick: function () { focus('[data-distance-retry]'); } }, 'Go to scene recovery')),
          announcement('exact', exactMessage && h('p', { 'data-distance-exact-feedback': 'true' }, exactMessage))));
    }
    function slider(name, label, value, min, max, unit) {
      return h('label', { className: 'rh-distance-range', htmlFor: 'rh-distance-' + name },
        h('span', null, label, h('output', { htmlFor: 'rh-distance-' + name, 'aria-live': 'off' }, value + unit)),
        h('input', { id: 'rh-distance-' + name, type: 'range', min: min, max: max, step: 1, value: value,
          'aria-label': label, 'aria-valuetext': value + (name === 'distance' ? ' metres' : name === 'cycles' ? ' light–dark stripe pairs' : ' percent display contrast'),
          onChange: function (event) { var patch = {}; patch[name] = Number(event.target.value); change(patch); } }),
        h('small', null, min + unit, h('span', null, max + unit)));
    }
    function panel(name, title, subtitle, ref) {
      return h('figure', { className: 'rh-distance-panel' }, h('figcaption', null, h('strong', null, title), h('span', null, subtitle)),
        h('div', { className: 'rh-distance-image' }, h('canvas', { ref: ref, width: 1024, height: 512, 'data-distance-canvas': name,
          role: 'img', 'aria-hidden': !revealed ? 'true' : undefined, 'aria-label': title + '. Same distant scene; ' + (name === 'reference' ? '60' : '140') + ' cycles per degree illustrative detail filter.' }),
          !revealed && h('div', { className: 'rh-distance-cover' }, h('span', null, 'Predict first'), h('p', null, 'Choose a reference band, then reveal both views.'))),
        h('p', null, name === 'reference' ? 'Selected human reference · 60 cycles/degree' : 'Selected wedge-tailed eagle reference · 140 cycles/degree'));
    }
    return h('section', { ref: root, className: 'rh-distance-study', 'data-raptor-distance-study': 'true', 'data-render-ready': String(status === 'ready'), 'aria-label': 'Find the distant detail' },
      h('style', null, CSS),
      h('header', { className: 'rh-distance-head' }, h('div', null, h('span', { className: 'rh-distance-kicker' }, 'Field investigation · Spatial detail'),
        h('h3', { tabIndex: -1 }, 'Find the distant detail'), h('p', null, 'A bird can remain in view while its fine details disappear. Keep the scene fixed and investigate what distance does to a pattern.')),
        h('button', { type: 'button', 'data-raptor-distance-close': 'true', onClick: props.onClose }, 'Close investigation')),
      h('p', { className: 'rh-distance-boundary' }, 'This display models spatial detail. It is not a view through an eagle’s eyes or a test of your eyesight. Resolving stripes is different from detecting an animal.'),
      h('nav', { className: 'rh-distance-nav', 'data-distance-nav': 'true', 'aria-label': 'Investigation shortcuts' },
        h('p', null, 'Jump to a part of the investigation. The image comparison also offers the model values as text.'),
        h('div', { className: 'rh-distance-actions' }, [
          ['conditions', 'Conditions', '#rh-distance-distance'], ['prediction', 'Prediction', '[data-distance-prediction-heading]'],
          ['inspector', 'Image comparison', '[data-distance-inspector] > summary'], ['signal', 'Pixel measurements', '[data-distance-signal] > summary'],
          ['notebook', 'Notebook', '[data-distance-note]']
        ].filter(function (item) { return item[0] !== 'signal' || signalAPI; }).map(function (item) {
          return h('button', { key: item[0], type: 'button', 'data-distance-jump': item[0], onClick: function () { focus(item[2]); } }, item[1]);
        }))),
      h('section', { className: 'rh-distance-inquiries', 'aria-label': 'Guided investigations' },
        h('span', { className: 'rh-distance-kicker' }, 'Start with a question'), h('h4', null, 'What makes fine detail disappear?'),
        h('p', null, 'Start a guided comparison at 80 m, eight stripe pairs and 95% contrast. Starting a question clears the current pin; your notebook and unfinished note remain available.'),
        h('div', { className: 'rh-distance-inquiry-cards' }, ['distance', 'cycles', 'contrast'].map(function (id) { var item = investigations.get(id); return h('button', {
          key: id, type: 'button', 'data-distance-inquiry': id, 'aria-pressed': !!guide && guide.id === id, disabled: status !== 'ready', onClick: function () { startInquiry(id); }
        }, h('strong', null, item.title), h('span', null, item.question)); })),
        inquiry && h('div', { className: 'rh-distance-guide', 'data-distance-guide': inquiry.id, 'data-stage': guideStage },
          h('div', { className: 'rh-distance-guide-heading' }, h('strong', null, inquiry.title), h('button', { type: 'button', 'data-distance-guide-exit': 'true', onClick: function () { setGuide(null); setReflection(null); focus('[data-distance-inquiry="' + inquiry.id + '"]'); } }, 'Explore freely')),
          h('ol', { className: 'rh-distance-guide-steps', 'aria-label': 'Investigation steps' }, ['Inspect the starter', 'Pin the starter', 'Change one factor', 'Compare and explain'].map(function (label, index) {
            var step = guideStage === 'starter' ? (revealed ? 1 : 0) : guideStage === 'pinned' || guideStage === 'changed' ? 2 : guideStage === 'inspect' ? 3 : -1;
            return h('li', { key: label, 'aria-current': step === index ? 'step' : undefined, 'data-complete': step > index ? 'true' : undefined }, h('span', { 'aria-hidden': 'true' }, index + 1), label);
          })),
          h('p', { role: 'status' }, guideStage === 'starter' ? (revealed ? 'The starter view is revealed. Pin it to keep evidence of the original conditions.' : 'Predict the starter’s reference band, then reveal both views.') : guideStage === 'pinned' ? 'Your starting evidence is pinned. Apply the selected one-factor change.' : guideStage === 'changed' ? 'The selected factor has changed. Make a fresh prediction and reveal the current views.' : guideStage === 'inspect' ? 'Compare pinned and current views through the same filter. Explain how the angle and spatial frequency changed.' : 'Your conditions differ from this guided comparison. You can keep exploring freely or restart its starter.'),
          h('button', { type: 'button', 'data-distance-guide-next': 'true', disabled: status !== 'ready', onClick: guideNext }, guideStage === 'starter' && revealed ? 'Pin starter view' : guideStage === 'pinned' ? 'Apply selected experiment' : guideStage === 'inspect' ? (reflection ? 'Record your explanation' : 'Compare and explain') : guideStage === 'diverged' ? 'Restart this investigation' : 'Go to prediction'))),
      fieldworkPanel(),
      matchPanel(),
      h('div', { className: 'rh-distance-workspace' },
        h('figure', { className: 'rh-distance-wide' }, h('figcaption', null, h('strong', null, 'The same meadow'), h('span', null, '20° horizontal field · animal scale stays fixed')),
          h('div', { className: 'rh-distance-context-image' }, h('canvas', { ref: wide, width: 1024, height: 512, 'data-distance-canvas': 'wide', role: 'img', 'aria-label': 'Wide context: a fixed-size dove and test plaque at the selected distance' }), h('div', { className: 'rh-distance-locator', 'aria-hidden': 'true' })),
          h('p', null, 'The marker locates the plaque-centered inspection area. The plaque is 30 cm wide. At the nearest distance, the narrow crop excludes the neighboring dove. The dove keeps its authored metre scale and illustrative anatomy.')),
        h('aside', { className: 'rh-distance-controls', 'aria-label': 'Distance investigation controls' }, h('span', { className: 'rh-distance-kicker' }, '01 · Set the conditions'),
          slider('distance', 'Viewing distance', settings.distance, 40, 300, ' m'), slider('cycles', 'Light–dark stripe pairs', settings.cycles, 4, 20, ''), slider('contrast', 'Display contrast', settings.contrast, 10, 100, '%'),
          h('div', { className: 'rh-distance-actions' }, [['near', 'Near · 40 m'], ['middle', 'Middle · 120 m'], ['far', 'Far · 300 m']].map(function (item) {
            return h('button', { type: 'button', key: item[0], 'data-distance-preset': item[0], onClick: function () { change(model.presets[item[0]]); } }, item[1]);
          })), h('p', null, 'Presets restore 12 stripe pairs and 95% display contrast. One cycle is one light stripe plus one dark stripe.'), exactConditions())),
      h('div', { className: 'rh-distance-status', 'data-distance-status': status, tabIndex: -1, role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
        status === 'loading' ? 'Preparing the shared dove and observation scene…' : status === 'error' ? 'The observation scene could not load. Your existing activities and saved observations are still available.' : 'Scene ready. Both detail views use the same camera, lighting, distance and target.',
        status === 'error' && h('button', { type: 'button', 'data-distance-retry': 'true', onClick: function () { focus('[data-distance-status]'); setAttempt(attempt + 1); } }, 'Retry scene')),
      h('section', { className: 'rh-distance-predict', 'aria-label': 'Predict and inspect' }, h('span', { className: 'rh-distance-kicker' }, '02 · Predict, then inspect'),
        h('h4', { id: 'rh-distance-prediction-question', tabIndex: -1, 'data-distance-prediction-heading': 'true' }, 'Which high-contrast reference band contains this pattern?'),
        h('p', null, 'Use distance and stripe spacing to make a prediction. The bands compare spatial frequency with selected references; they do not predict whether a living animal could detect this target.'),
        h('div', { className: 'rh-distance-choices', role: 'group', 'aria-labelledby': 'rh-distance-prediction-question' }, Object.keys(labels).map(function (id) { return h('button', { key: id, type: 'button', 'data-distance-prediction': id, 'aria-pressed': choice === id,
          onClick: function () { setChoice(id); setRevealed(false); setInspection(null); setSnapshotMessage(''); setReflection(null); setSavedMessage(''); } }, labels[id]); })),
        h('button', { type: 'button', className: 'rh-distance-primary', 'data-distance-reveal': 'true', disabled: !choice || status !== 'ready', onClick: reveal }, 'Reveal both views'),
        announcement('reveal', revealed && h('div', { className: 'rh-distance-result', 'data-distance-result': 'true' },
          h('strong', null, choice === metrics.referenceBand ? 'Your prediction matches the reference band. ' : 'Compare your prediction with the reference band. '),
          h('span', null, labels[metrics.referenceBand] + '. ' + settings.cycles + ' pairs across ' + metrics.angleDeg.toFixed(3) + '° = ' + metrics.cyclesPerDegree.toFixed(1) + ' cycles/degree.'),
          h('p', null, 'These are selected high-contrast references. Reducing display contrast fades the stripes without changing their angular spacing or the reference band.'))),
        hunt && revealed && h('button', { type: 'button', className: 'rh-distance-primary', 'data-distance-fieldwork-record-inline': 'true', 'aria-describedby': 'rh-distance-fieldwork-readiness', disabled: !choice || status !== 'ready' || !huntHeld,
          style: { marginTop: '12px' }, onClick: function () { recordTrial(); var panel = root.current && root.current.querySelector('[data-distance-fieldwork]'); if (panel) panel.open = true; focus('[data-distance-fieldwork-status]'); } }, 'Record trial and view range-finding evidence'),
        matchReference && revealed && h('button', { type: 'button', className: 'rh-distance-primary', 'data-distance-match-check-inline': 'true', disabled: !matchComparison || !currentImages || status !== 'ready',
          style: { marginTop: '12px' }, onClick: function () { checkMatch(); var panel = root.current && root.current.querySelector('[data-distance-match]'); if (panel) panel.open = true; focus('[data-distance-match-heading]'); } }, 'Check distance and return to the match challenge')),
      h('div', { className: 'rh-distance-magnification' }, h('strong', null, 'Equal inspection magnification · ' + metrics.magnification.toFixed(1) + '×'),
        h('span', null, 'Both panels show a 0.75° horizontal field. This is a display aid; the bird and plaque have not grown or moved closer.')),
      h('div', { className: 'rh-distance-panels', 'data-distance-original-panels': 'true', style: pinned && !snapshotMessage ? { display: 'none' } : undefined }, panel('reference', 'Human reference model', 'Same crop · illustrative detail filter', reference), panel('eagle', 'Wedge-tailed eagle reference model', 'Same crop · illustrative detail filter', eagle)),
      announcement('snapshot', snapshotMessage && revealed && h('p', { className: 'rh-distance-snapshot-error', 'data-distance-snapshot-error': 'true' }, snapshotMessage)),
      inspectSameCondition(),
      signalPanel(),
      h('section', { className: 'rh-distance-compare', 'aria-label': 'Compare one change' }, h('span', { className: 'rh-distance-kicker' }, '03 · Change one thing'),
        h('h4', { ref: comparisonHeading, tabIndex: -1 }, 'Keep a view. Test a change.'),
        h('p', null, 'Reveal both views, then pin them as your starting condition. Each experiment starts from that pin, keeping the other two controls fixed. Predict again before revealing the changed views.'),
        h('div', { className: 'rh-distance-actions' }, h('button', { type: 'button', 'data-distance-pin': 'true', disabled: !revealed || status !== 'ready', onClick: pin }, pinned ? 'Replace pinned condition' : 'Pin revealed condition'),
          pinned && h('button', { type: 'button', 'data-distance-clear-pin': 'true', onClick: function () { setPinned(null); setPinMessage('Pinned condition cleared. Saved comparisons remain in your notebook.'); comparisonHeading.current.focus(); } }, 'Clear pin')),
        h('p', { className: 'rh-distance-pin-status', role: 'status' }, pinMessage || 'A pin keeps two still images during this visit. Recording an observation saves both sets of conditions; closing clears the pin.'),
        pinned && h('div', { 'data-distance-comparison': 'true', 'data-kind': comparison.kind },
          h('p', { className: 'rh-distance-pair-intro' }, 'Read across each pair to compare conditions through the same filter. Both images keep the same inspection magnification.'),
          ['reference', 'eagle'].map(pairedViews),
          experimentControls(),
          h('p', { className: 'rh-distance-comparison-summary', role: 'status' }, comparisonLabel(comparison)),
          h('table', { className: 'rh-distance-evidence-table' }, h('caption', null, 'Pinned and current conditions · target size, lighting and filters stay fixed'),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Measure'), h('th', { scope: 'col' }, 'Pinned'), h('th', { scope: 'col' }, 'Current'))),
            h('tbody', null, [['Viewing distance', pinned.settings.distance + ' m', settings.distance + ' m', 'distance'], ['Stripe pairs', pinned.settings.cycles, settings.cycles, 'cycles'], ['Display contrast', pinned.settings.contrast + '%', settings.contrast + '%', 'contrast'], ['Angular span', model.metrics(pinned.settings).angleDeg.toFixed(3) + '°', metrics.angleDeg.toFixed(3) + '°'], ['Cycles/degree', model.metrics(pinned.settings).cyclesPerDegree.toFixed(1), metrics.cyclesPerDegree.toFixed(1)]].map(function (row) {
              return h('tr', { key: row[0], 'data-changed': row[3] ? String(comparison.changedFields.indexOf(row[3]) !== -1) : undefined }, h('th', { scope: 'row' }, row[0]), h('td', null, row[1]), h('td', null, row[2]));
            }))),
          h('p', { className: 'rh-distance-ratios' }, 'Current ÷ pinned: angular span ' + comparison.angleRatio.toFixed(2) + '×; spatial frequency ' + comparison.frequencyRatio.toFixed(2) + '×. Compare the same reference model across the two conditions.'),
          repairComparison(),
          matchedInquiry && revealed && status === 'ready' && h('section', { className: 'rh-distance-reflection', 'data-distance-reflection': 'true', 'aria-label': 'Explain the change' },
            h('h5', { id: 'rh-distance-reflection-question', tabIndex: -1, 'data-distance-reflection-heading': 'true' }, 'What happened to angular span and spatial frequency?'),
            h('p', null, 'Use your comparison and the measurements above. This checks the model relationship; your personal visual observations are not scored.'),
            h('div', { className: 'rh-distance-choices', role: 'group', 'aria-labelledby': 'rh-distance-reflection-question' }, inquiry.choices.map(function (answer) { return h('button', { key: answer.id, type: 'button', 'data-distance-reflection-answer': answer.id, 'aria-pressed': reflection === answer.id, onClick: function () { setReflection(answer.id); } }, answer.text); })),
            announcement('reflection', reflectionResult && h('div', { className: 'rh-distance-feedback', 'data-distance-reflection-feedback': 'true', 'data-correct': String(reflectionResult.correct) },
              h('strong', null, reflectionResult.correct ? 'That matches the model relationship.' : 'Use the measurements to reconsider.'), h('p', null, reflectionResult.explanation)))),
          explanation && !matchedInquiry && h('p', { className: 'rh-distance-mechanism', 'data-distance-mechanism': 'true' }, explanation.text),
          h('p', { className: 'rh-distance-pin-help' }, 'For doubling experiments, pin 150 m or nearer and 10 stripe pairs or fewer. To test fading, compare the 25% contrast condition with a stronger pinned pattern.'))),
      h('section', { className: 'rh-distance-notebook', 'aria-label': 'Distance investigation notebook' }, h('span', { className: 'rh-distance-kicker' }, '04 · Keep the evidence'), h('h4', null, 'What stayed the same? What changed?'),
        h('p', null, pinned ? 'Compare the pinned and current views. Describe your evidence, name the factor you changed and explain what you kept fixed.' : 'Describe what you observed. Pin a revealed condition above to record a comparison with your next observation.'),
        h('label', { htmlFor: 'rh-distance-note' }, 'Your observation'), h('p', { id: 'rh-distance-note-help' }, 'Up to 600 characters. You can use the model values or measured pixel values as evidence; judging the pictures is optional.'),
        h('textarea', { id: 'rh-distance-note', 'data-distance-note': 'true', 'aria-describedby': 'rh-distance-note-help rh-distance-note-count rh-distance-note-readiness', value: note, maxLength: 600, rows: 3,
          placeholder: 'At … metres, I noticed … . I kept … fixed.', onChange: function (event) { if (!note.trim()) setDraft(draftContext()); setNote(event.target.value); setSavedMessage(''); } }),
        h('p', { id: 'rh-distance-note-count', 'data-distance-note-count': 'true', 'aria-live': 'off' }, note.length + ' of 600 characters used.'),
        h('div', { className: staleDraft ? 'rh-distance-draft-warning' : undefined, 'data-distance-draft-stale': staleDraft ? 'true' : undefined },
          announcement('draft', staleDraft && h('div', null,
          h('strong', null, 'Review this draft before saving.'),
          h('p', null, 'Your conditions, pinned comparison, kept pixel reading or investigation changed after this note began.' + (draft ? ' Draft condition: ' + conditionLabel(draft.settings) + '. ' + (draft.reference ? 'Draft pin: ' + conditionLabel(draft.reference) + '.' : 'The draft had no pinned comparison.') + (draft.pixelReference ? ' Draft kept reading: ' + conditionLabel(draft.pixelReference) + '.' : '') + (draft.question ? ' Draft question: ' + draft.question + '.' : '') : '')),
          h('p', null, 'Revise the observation if needed, then choose whether to use it for the current conditions.'))),
          staleDraft && h('div', { className: 'rh-distance-actions' }, h('button', { type: 'button', 'data-distance-adopt-draft': 'true', onClick: function () { setDraft(draftContext()); root.current.querySelector('[data-distance-note]').focus(); } }, 'Use this draft for current conditions'),
            h('button', { type: 'button', 'data-distance-clear-draft': 'true', onClick: function () { setNote(''); setDraft(null); root.current.querySelector('[data-distance-note]').focus(); } }, 'Start a new observation'))),
        h('p', { id: 'rh-distance-note-readiness', 'data-distance-note-readiness': 'true', 'data-state': noteState }, noteReadiness),
        h('div', { className: 'rh-distance-actions' },
          noteNext && h('button', { type: 'button', 'data-distance-note-next': 'true', onClick: function () { focus(noteNext[1]); } }, noteNext[0]),
          h('button', { type: 'button', 'data-distance-save': 'true', 'aria-describedby': 'rh-distance-note-readiness', disabled: !revealed || !note.trim() || staleDraft || status !== 'ready', onClick: save }, 'Record observation')),
        h('p', { role: 'status' }, savedMessage || 'Reveal a comparison, then record your own evidence. Personal observations are not scored.'),
        records.map(function (record, index) { var m = model.metrics(Object.assign({ version: 1 }, record)); return h('article', { className: 'rh-distance-record', key: index, 'data-distance-record': 'true', 'data-record-distance': record.distance },
          h('strong', null, record.distance + ' m · ' + record.cycles + ' stripe pairs · ' + record.contrast + '% display contrast'), h('p', null, record.note),
          record.comparison && h('div', { className: 'rh-distance-record-comparison', 'data-distance-record-comparison': 'true' }, h('strong', null, 'Compared with: ' + conditionLabel(record.comparison.reference)), h('p', null, comparisonLabel(evidence.compare(record.comparison.reference, Object.assign({ version: 1 }, record))))),
          h('small', null, 'Prediction: ' + labels[record.prediction] + '. Reference band: ' + labels[m.referenceBand] + '. ' + m.cyclesPerDegree.toFixed(1) + ' cycles/degree · 30 cm plaque · 60/140 references · model 1.')); })),
      h('details', { className: 'rh-distance-method' }, h('summary', null, 'Evidence and how this display works'),
        h('p', null, 'The human reference is a selected 60 cycles/degree, at the upper end of the 30–60 range discussed by Potier and colleagues. The eagle reference is a selected 140 from the 132–143 cycles/degree maxima reported for wedge-tailed eagles by Reymond. These are not measurements of every human or raptor; illumination, contrast, individual and task matter.'),
        h('p', null, 'The chosen Gaussian display filter retains 10% of input modulation at each reference frequency. That filter shape and 10% convention are authored illustrations, not measured retinal filters or biological detection thresholds. Display contrast changes RGB stripe values around the same mean; this screen is not luminance-calibrated.'),
        h('p', null, 'Angular span = 2 × atan(0.30 m ÷ (2 × distance)). Spatial frequency = stripe pairs ÷ angular span in degrees. Both detail panels start from one render; only their filters differ. Screen pixels and your own vision also limit what you can see.'),
        h('a', { href: 'https://pubmed.ncbi.nlm.nih.gov/4090282/', target: '_blank', rel: 'noopener noreferrer' }, 'Reymond, 1985 · eagle acuity and luminance'), ' · ',
        h('a', { href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6125913/', target: '_blank', rel: 'noopener noreferrer' }, 'Potier et al., 2018 · resolution and contrast')));
  }
  var CSS = `
.rh-distance-repair{margin-top:18px;border:1px solid #91b49f;border-radius:10px;background:#142e24}.rh-distance-repair>summary,.rh-distance-command-help>summary{cursor:pointer;min-height:44px;padding:12px;font-size:13px;font-weight:750;color:#f7e2b1}.rh-distance-repair-body{padding:12px;min-width:0}.rh-distance-repair-body h5{font-size:16px;line-height:1.5;margin:8px 0;color:#f6e2b6}.rh-distance-repair-body p{font-size:13px;line-height:1.65;margin:12px 0}.rh-distance-repair-body .rh-distance-text-table{font-size:12px;font-variant-numeric:tabular-nums}.rh-distance-repair-body .rh-distance-text-table th:first-child{width:34%}.rh-distance-repair-body .rh-distance-text-table th:nth-child(2),.rh-distance-repair-body .rh-distance-text-table th:nth-child(3){width:33%}.rh-distance-repair .rh-distance-actions>button{flex:1 1 170px}.rh-distance-repair [data-distance-repair-feedback]{border-left:3px solid #bfd5b2;padding-left:10px}.rh-distance-command-help{border:1px solid #819d89;border-radius:8px;background:#142e24;margin:12px 0}.rh-distance-command-help ul{padding:0 14px 0 30px;margin:10px 0;font-size:12px;line-height:1.65}.rh-distance-command-help li{margin:12px 0}.rh-distance-command-help>button{margin:0 12px 12px}
.rh-distance-pair-explorer-body .rh-distance-text-table th:nth-child(2),.rh-distance-pair-explorer-body .rh-distance-text-table th:nth-child(3){width:33%}
.rh-distance-pair-explorer{margin-top:16px;border:1px solid #91b49f;border-radius:10px;background:#142e24}.rh-distance-pair-explorer>summary{cursor:pointer;min-height:44px;padding:12px;font-size:14px;font-weight:750;color:#f7e2b1}.rh-distance-pair-explorer-body{padding:12px;min-width:0}.rh-distance-pair-explorer-body h5{font-size:15px;line-height:1.5;margin:10px 0;color:#f6e2b6}.rh-distance-pair-explorer-body p{font-size:13px;line-height:1.65;margin:10px 0}.rh-distance-pair-explorer-body .rh-distance-text-table{font-size:12px;font-variant-numeric:tabular-nums}.rh-distance-pair-explorer-body .rh-distance-text-table th:first-child{width:34%}.rh-distance-pair-explorer .rh-distance-actions>button{flex:1 1 150px}.rh-distance-pair-question{margin:16px 0;padding-top:10px;border-top:1px solid #819d89}.rh-distance-pair-inquiry{padding-left:22px;font-size:13px;line-height:1.65}.rh-distance-pair-inquiry li{margin:10px 0}.rh-distance-pair-explorer [data-distance-pair-feedback]{border-left:3px solid #bfd5b2;padding-left:10px}
@media(forced-colors:active){.rh-distance-study [data-distance-pair-marker]{stroke:CanvasText;fill:CanvasText}.rh-distance-study [data-distance-pair-marker$="-kept"]{fill:Canvas}}
.rh-distance-exact{margin-top:16px;border-top:1px solid #8fa997;padding-top:8px}.rh-distance-exact summary{cursor:pointer;min-height:44px;padding:10px 4px;font-size:13px;font-weight:750;color:#f7e2b1}.rh-distance-exact form{min-width:0;padding:6px 4px}.rh-distance-exact form p{font-size:12px;line-height:1.65;margin:8px 0}.rh-distance-exact-field{margin:16px 0}.rh-distance-exact-field label{display:block;font-size:13px;font-weight:750}.rh-distance-exact-field input{display:block;width:100%;min-width:0;min-height:44px;font:400 16px/1.5 system-ui;padding:8px 10px;border:1px solid #a8c3a3;border-radius:7px;background:#10291e;color:#f0eee0}.rh-distance-exact-field input[aria-invalid=true]{border:2px solid #f5ce8f}.rh-distance-exact-error:not(:empty){border-left:3px solid #f5ce8f;padding-left:9px;color:#ffe3b9}.rh-distance-exact-preview{margin:14px 0;padding:12px;border:1px solid #91aa8d;border-radius:8px;background:#142e24;font-size:13px}.rh-distance-exact .rh-distance-actions>button{flex:1 1 180px}.rh-distance-exact [data-distance-exact-feedback]{border-left:3px solid #bfd5b2;padding-left:9px}
.rh-distance-signal-explorer{margin-top:16px;border:1px solid #91b49f;border-radius:10px;background:#142e24;overflow:hidden}.rh-distance-signal-explorer>summary{padding:12px;min-height:44px;font-weight:700;cursor:pointer}.rh-distance-signal-explorer-body{padding:12px;min-width:0}.rh-distance-signal-explorer-body h5{font-size:15px;line-height:1.5;margin:8px 0;color:#f6e2b6}.rh-distance-signal-explorer-body p{font-size:13px;margin:10px 0}.rh-distance-signal-explorer-body .rh-distance-text-table{font-variant-numeric:tabular-nums}
.rh-distance-signal-explorer-body .rh-distance-text-table{font-size:12px}.rh-distance-signal-explorer-body .rh-distance-text-table th:first-child{width:36%}
.rh-distance-trial-plan{margin-top:14px;padding:14px;min-width:0;border:1px solid #91aa8d;border-radius:10px;background:#142e24}
.rh-distance-trial-plan h5{margin:0;font-size:16px;line-height:1.5;color:#f6e2b6}.rh-distance-trial-plan label{display:block;margin-top:12px;font-weight:700;font-size:13px}
.rh-distance-trial-plan input{display:block;width:100%;max-width:100%;min-height:44px;margin-top:8px;padding:10px;border:1px solid #9bad91;border-radius:8px;font:inherit;background:#10291e;color:#f0eee0}.rh-distance-trial-plan input[aria-invalid=true]{border-width:2px}
/* Keep keyboard focus inside clipped disclosures; distinguish selection from focus. */
.rh-distance-study[data-raptor-distance-study] :is(button,input,textarea,summary,a,[tabindex="-1"]):focus-visible,.rh-distance-study[data-raptor-distance-study] [tabindex="-1"]:focus{outline:3px solid #f0cf82!important;outline-offset:3px!important;box-shadow:none!important;scroll-margin-block:24px}
.rh-distance-study[data-raptor-distance-study] summary:focus:focus-visible{outline-offset:-5px!important}
.rh-distance-study[data-raptor-distance-study] :is(button,summary){overflow-wrap:anywhere;max-width:100%}
.rh-distance-study[data-raptor-distance-study] :is(h3,h4,h5,p,figcaption,li){overflow-wrap:anywhere}
.rh-distance-nav{margin-top:16px;padding:12px;border:1px solid #8fa997;border-radius:10px;background:#203d32}.rh-distance-nav>p{font-size:12px}.rh-distance-nav .rh-distance-actions{margin-bottom:0}
.rh-distance-text-comparison{margin-top:16px;border:1px solid #91b49f;border-radius:10px;background:#142e24;overflow:hidden}.rh-distance-text-body{padding:12px}.rh-distance-text-body p{font-size:13px;line-height:1.65;margin-bottom:12px}.rh-distance-text-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px;margin:12px 0}.rh-distance-text-table th,.rh-distance-text-table td{text-align:left;vertical-align:top;overflow-wrap:anywhere;padding:10px 6px;border-bottom:1px solid #819d89}.rh-distance-text-table th:first-child{width:25%}.rh-distance-text-table caption{text-align:left;font-size:12px;padding:8px 0}
.rh-distance-study[data-raptor-distance-study] .rh-distance-image{display:grid}.rh-distance-study[data-raptor-distance-study] .rh-distance-image>canvas{grid-area:1/1}.rh-distance-study[data-raptor-distance-study] .rh-distance-cover{position:relative;inset:auto;grid-area:1/1;min-height:160px}
@container(max-width:400px){.rh-distance-study[data-raptor-distance-study] .rh-distance-guide-steps{grid-template-columns:1fr}.rh-distance-text-body{padding:10px 8px}.rh-distance-text-table th,.rh-distance-text-table td{padding:9px 3px}.rh-distance-text-table th:first-child{width:30%}.rh-distance-text-table th:nth-child(2){width:25%}}
@media(prefers-reduced-motion:reduce){.rh-distance-study[data-raptor-distance-study],.rh-distance-study[data-raptor-distance-study] *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
@media(forced-colors:active){
 .rh-distance-study[data-raptor-distance-study] button[aria-pressed=true]{border:3px double ButtonText}
 .rh-distance-study[data-raptor-distance-study] button[aria-pressed=true]:not(:focus-visible){outline:none}
 .rh-distance-study[data-raptor-distance-study] :is(button,input,textarea,summary,a,[tabindex="-1"]):focus-visible,.rh-distance-study[data-raptor-distance-study] [tabindex="-1"]:focus{outline:3px solid Highlight!important}
 .rh-distance-study[data-raptor-distance-study] button:disabled{opacity:1;color:GrayText}
 .rh-distance-study[data-raptor-distance-study] .rh-distance-match-track{forced-color-adjust:none;background:Canvas;border:1px solid CanvasText}
 .rh-distance-study[data-raptor-distance-study] .rh-distance-match-track>span{background:CanvasText}
 .rh-distance-study[data-raptor-distance-study] :is(.rh-distance-fieldwork-plot,.rh-distance-results-plot,.rh-distance-signal-chart,.rh-distance-signal-pair-plot svg){background:Canvas;fill:CanvasText}
 .rh-distance-study[data-raptor-distance-study] :is(.rh-distance-fieldwork-plot,.rh-distance-results-plot) rect{fill:Canvas}
 .rh-distance-study[data-raptor-distance-study] .rh-distance-results-plot rect{stroke:CanvasText;stroke-width:1}
 .rh-distance-study[data-raptor-distance-study] .rh-distance-results-plot [data-distance-results-interval]{fill:CanvasText}
 .rh-distance-study[data-raptor-distance-study] :is(.rh-distance-fieldwork-plot,.rh-distance-results-plot,.rh-distance-signal-chart,.rh-distance-signal-pair-plot svg) :is(line,polyline){stroke:CanvasText}
 .rh-distance-study[data-raptor-distance-study] :is(.rh-distance-fieldwork-plot,.rh-distance-results-plot,.rh-distance-signal-chart,.rh-distance-signal-pair-plot svg) text{fill:CanvasText}
 .rh-distance-study[data-raptor-distance-study] :is(.rh-distance-fieldwork-plot,.rh-distance-results-plot,.rh-distance-signal-chart) circle{fill:CanvasText;stroke:Canvas}
}
.rh-distance-magnifier{margin-top:18px;border:1px solid #91b49f;border-radius:12px;background:#102c22;overflow:hidden}.rh-distance-magnifier>summary{padding:15px!important;font-size:14px;font-weight:700;color:#f3dfb0;cursor:pointer}.rh-distance-magnifier-body{padding:0 16px 16px}.rh-distance-magnifier-body>h4{font-size:19px;margin-top:14px}.rh-distance-magnifier-body p{font-size:13px;line-height:1.65;margin-top:12px}.rh-distance-magnifier-condition,.rh-distance-magnifier-unavailable{padding:12px;background:#244837;border-left:3px solid #c6dfb9}.rh-distance-magnifier-pans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:14px 0}.rh-distance-magnifier-pan{display:grid;gap:5px;font-size:13px}.rh-distance-magnifier-pan>span{font-weight:700}.rh-distance-magnifier-pan output,.rh-distance-magnifier-pan small{font-size:12px;color:#d7e4d0}.rh-distance-magnifier-pan input{display:block;width:100%;height:44px;accent-color:#e9d39b}.rh-distance-magnifier-pan small{display:flex;justify-content:space-between;gap:8px}.rh-distance-magnifier-views{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.rh-distance-magnifier-view{margin:0;min-width:0;border:1px solid #7e9f89;border-radius:9px;overflow:hidden;background:#17372b}.rh-distance-magnifier-view figcaption{font-weight:700}.rh-distance-magnifier-frame{position:relative;overflow:hidden;aspect-ratio:2;background:#10291e}.rh-distance-magnifier-frame img{display:block;position:absolute;max-width:none;pointer-events:none;user-select:none;image-rendering:auto}.rh-distance-magnifier-map{margin:14px 0 0;max-width:360px;border:1px solid #7e9f89;border-radius:9px;overflow:hidden}.rh-distance-magnifier-map svg{display:block;width:100%;height:auto}.rh-distance-magnifier-frame,.rh-distance-magnifier-frame *,.rh-distance-magnifier-map *{transition:none!important}.rh-distance-magnifier-question{padding:12px;background:#244837;border-left:3px solid #d3c38e}.rh-distance-magnifier-help{font-size:12px!important;color:#d2dfca}@container(max-width:720px){.rh-distance-magnifier-body{padding:0 10px 14px}.rh-distance-magnifier-pans,.rh-distance-magnifier-views{grid-template-columns:1fr}.rh-distance-magnifier .rh-distance-actions>button{flex:1 1 130px}}
.rh-distance-signal-kept{margin-top:20px;padding:16px;border:1px solid #91bba4;border-radius:12px;background:#102c22}.rh-distance-signal-kept>h4{font-size:19px}.rh-distance-signal-kept>p{font-size:13px;margin-top:10px}.rh-distance-signal-kept-ranges{display:flex;gap:24px;flex-wrap:wrap;margin:14px 0}.rh-distance-signal-kept-ranges dt{font-size:12px;color:#d9e4cf}.rh-distance-signal-kept-ranges dd{margin:4px 0 0;font-size:25px;font-weight:700;color:#f3dfb0;font-variant-numeric:tabular-nums}.rh-distance-signal-pair-status{padding:12px;background:#244837;border-left:3px solid #c6dfb9}.rh-distance-signal-pair-label{color:#f3dfb0;font-weight:700;margin-top:14px!important}.rh-distance-signal-pair-plots{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0 8px}.rh-distance-signal-pair-plot{margin:0;min-width:0;border:1px solid #71947f;border-radius:8px;overflow:hidden;background:#142f25}.rh-distance-signal-pair-plot figcaption{font-weight:700}.rh-distance-signal-pair-plot svg{display:block;width:100%;height:auto;font:18px system-ui;fill:#e3ebda}.rh-distance-signal-pair-plot *{transition:none!important}.rh-distance-signal-pair-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px;margin-top:16px;font-variant-numeric:tabular-nums}.rh-distance-signal-pair-table th,.rh-distance-signal-pair-table td{text-align:left;vertical-align:top;padding:10px 6px;border-bottom:1px solid #6c917c;overflow-wrap:anywhere}.rh-distance-signal-pair-table th:first-child{width:22%}.rh-distance-signal-pair-table th:last-child{width:30%}.rh-distance-signal-pair-table caption{text-align:left;caption-side:bottom;padding:10px 0;font-size:12px;color:#d1dfc9}@container(max-width:720px){.rh-distance-signal-kept{padding:12px 8px}.rh-distance-signal-pair-plots{grid-template-columns:1fr}.rh-distance-signal-pair-plot svg{font-size:24px}.rh-distance-signal-pair-table{font-size:12px}.rh-distance-signal-pair-table th,.rh-distance-signal-pair-table td{padding:9px 3px}}@media(forced-colors:active){.rh-distance-signal-pair-plot svg polyline{stroke:CanvasText}.rh-distance-signal-pair-plot svg text{fill:CanvasText}.rh-distance-signal-pair-plot{background:Canvas}}
.rh-distance-signal{margin-top:16px;border:1px solid #8db5a4;border-radius:14px;background:#17362c}.rh-distance-signal>summary{padding:16px;cursor:pointer;font-weight:700;color:#e9dfb9;font-size:15px}.rh-distance-signal-body{padding:0 18px 18px}.rh-distance-signal-body h4{font-size:20px;margin:8px 0;color:#f3dfb0}.rh-distance-signal-body p{line-height:1.65}.rh-distance-signal-help,.rh-distance-signal-limit{font-size:12px;color:#d2dfd0}.rh-distance-signal-images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rh-distance-signal-image{margin:0;min-width:0;border:1px solid #789d8c;border-radius:10px;overflow:hidden;background:#10281f}.rh-distance-signal-image figcaption{padding:12px;font-size:13px;font-weight:700;color:#eeddb4}.rh-distance-signal-image>div{position:relative}.rh-distance-signal-image img{display:block;width:100%;height:auto;aspect-ratio:2/1}.rh-distance-signal-image svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.rh-distance-signal-chart{display:block;width:100%;height:auto;background:#0f271f;border:1px solid #6f9987;border-radius:8px;font:14px system-ui;fill:#e6eddd}.rh-distance-signal-chart *,.rh-distance-signal-image *{transition:none!important}.rh-distance-signal-legend{display:flex;flex-wrap:wrap;gap:18px;margin:12px 0;font-size:13px;font-weight:700}.rh-distance-signal-legend span:first-child{color:#f3cf8d}.rh-distance-signal-legend span:last-child{color:#70dfd5}.rh-distance-signal-probe{display:grid;gap:7px;margin:16px 0;font-size:14px}.rh-distance-signal-probe output{font-size:12px}.rh-distance-signal-probe input{width:100%;accent-color:#e9c98a;min-height:32px}.rh-distance-signal-table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:13px}.rh-distance-signal-table th,.rh-distance-signal-table td{text-align:left;padding:10px 6px;border-bottom:1px solid #628a76;overflow-wrap:anywhere}.rh-distance-signal-table th:first-child{width:25%}.rh-distance-signal-table th:nth-child(2){width:25%}.rh-distance-signal-table caption{text-align:left;caption-side:bottom;font-size:11px;padding:9px 0;color:#cbdcc8}.rh-distance-signal-question,.rh-distance-signal-error{padding:12px;border-left:3px solid #b9d1ac;background:#244837}.rh-distance-signal-condition{color:#f3dfb0;font-weight:700}.rh-distance-signal-limit{margin-top:16px!important}@container(max-width:720px){.rh-distance-signal-body{padding:0 12px 14px}.rh-distance-signal-images{grid-template-columns:1fr}.rh-distance-signal-chart{font-size:21px}.rh-distance-signal .rh-distance-actions>button{flex:1 1 100%}.rh-distance-signal-table{font-size:12px}}@media(forced-colors:active){.rh-distance-signal-chart polyline{stroke:CanvasText}.rh-distance-signal-chart text{fill:CanvasText}.rh-distance-signal-chart{background:Canvas}.rh-distance-signal-legend span{color:CanvasText!important}}
.rh-distance-match{margin:18px 0;border:1px solid #91aa8d;border-radius:14px;background:#19392d}.rh-distance-match>summary{cursor:pointer;padding:16px;font-size:15px;font-weight:700;color:#f6e2b6}.rh-distance-match-body{padding:0 18px 18px}.rh-distance-match-body h4{font-size:20px;color:#f6e2b6;margin:8px 0}.rh-distance-match-body p{line-height:1.65}.rh-distance-match-steps{padding-left:22px;line-height:1.8}.rh-distance-match-views{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.rh-distance-match-view{min-width:0;margin:0;border:1px solid #799d86;background:#10271e;border-radius:12px;overflow:hidden}.rh-distance-match-view figcaption{padding:12px;display:grid;gap:6px;color:#f6e2b6}.rh-distance-match-view figcaption span{font-size:12px;color:#d5e1ce}.rh-distance-match-view img{display:block;width:100%;height:auto;aspect-ratio:2/1}.rh-distance-match-cover{box-sizing:border-box;aspect-ratio:2/1;display:flex;flex-direction:column;justify-content:center;padding:16px;background:#263c31}.rh-distance-match-cover,.rh-distance-match-view img{transition:none!important}.rh-distance-match-cover strong{color:#f6e2b6}.rh-distance-match-cover p{margin-bottom:0;font-size:12px}.rh-distance-match-measure{padding:12px;font-size:13px;line-height:1.6}.rh-distance-match-measure small{display:block;font-size:12px;color:#cbdcc8}.rh-distance-match-track{height:14px;overflow:hidden;border:1px solid #91aa8d;border-radius:3px;background:#0b1c14;margin:9px 0}.rh-distance-match-track>span{display:block;height:100%;background:#edcf92;transition:none!important}.rh-distance-match-method{padding:10px 12px;border-left:3px solid #9cbb9b;background:#244737}.rh-distance-match-feedback,.rh-distance-match-warning{margin:12px 0;padding:14px;border:1px solid #91aa8d;border-radius:10px;background:#294636}.rh-distance-match-feedback>strong{color:#f8dfac;font-size:16px}@container(max-width:720px){.rh-distance-match-body{padding:0 12px 14px}.rh-distance-match-views{grid-template-columns:1fr}.rh-distance-match .rh-distance-actions>button{flex:1 1 100%}.rh-distance-match-cover{min-height:150px}}
.rh-distance-results{margin-top:20px;padding-top:18px;border-top:1px solid #819d89}.rh-distance-results-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.rh-distance-result-card{min-width:0;padding:16px;border:1px solid #91aa8d;border-radius:12px;background:#142e24}.rh-distance-result-card h5,.rh-distance-results-comparison h5{margin:0 0 9px;font-size:16px;line-height:1.45;color:#f6e2b6}.rh-distance-result-range{display:block;font-size:27px;color:#f5dfae;letter-spacing:-.5px}.rh-distance-result-card details{margin:12px 0}.rh-distance-result-card details summary{font-size:12px;padding:10px 0;border:0}.rh-distance-result-card button{margin-top:8px}.rh-distance-results-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:11px}.rh-distance-results-table th,.rh-distance-results-table td{text-align:left;vertical-align:top;padding:8px 4px;border-bottom:1px solid #5b7c67;overflow-wrap:anywhere}.rh-distance-results-table th:first-child{width:20%}.rh-distance-results-table th:nth-child(2){width:30%}.rh-distance-results-table caption{text-align:left;caption-side:bottom;font-size:11px;padding:9px 0;color:#cbdcc8}.rh-distance-results-comparison{margin-top:16px;padding:16px;border:1px solid #91aa8d;border-radius:12px;background:#142e24}.rh-distance-results-plot{display:block;width:100%;height:auto;font:14px system-ui;fill:#e4eddd}.rh-distance-results-plot *{transition:none!important}.rh-distance-results-ratio{padding:12px;border-left:3px solid #e5c887;background:#294636}.rh-distance-results-ratio strong{display:block;font-size:27px;color:#f8dfac}.rh-distance-results-comparison h5{margin-top:18px}.rh-distance-results-feedback{padding:12px;border-left:3px solid #bfd5b2;background:#294636}.rh-distance-fieldwork .rh-distance-keep-result,.rh-distance-fieldwork [data-distance-fieldwork-note]{margin-top:12px;margin-right:6px}@container(max-width:720px){.rh-distance-results-cards{grid-template-columns:1fr}.rh-distance-result-card,.rh-distance-results-comparison{padding:12px}.rh-distance-results-plot{font-size:21px}.rh-distance-fieldwork .rh-distance-keep-result,.rh-distance-fieldwork [data-distance-fieldwork-note]{width:100%;margin-right:0}}
.rh-distance-fieldwork-progress:focus{outline:3px solid #f0cf82;outline-offset:3px}
@container(max-width:720px){.rh-distance-fieldwork .rh-distance-fieldwork-plot{font-size:20px}.rh-distance-fieldwork .rh-distance-fieldwork-table th:first-child{width:20%}.rh-distance-fieldwork .rh-distance-fieldwork-table th:nth-child(2){width:26%}.rh-distance-fieldwork .rh-distance-fieldwork-table th:nth-child(3){width:22%}}
.rh-distance-fieldwork{margin-top:18px;border:1px solid #9bad91;border-radius:12px;background:#203d32;overflow:hidden}.rh-distance-fieldwork summary{padding:14px 16px;min-height:48px;font-weight:750;color:#f7e2b1;cursor:pointer}.rh-distance-fieldwork[open] summary{border-bottom:1px solid #6f8d78}.rh-distance-fieldwork-body{padding:16px}.rh-distance-fieldwork-body p{font-size:12px;margin-top:9px}.rh-distance-fieldwork-progress,.rh-distance-fieldwork-prompt{padding:12px;background:#142e24;border-left:3px solid #bddbc5}.rh-distance-fieldwork-progress[data-complete=true]{border-color:#efcf83;background:#304934;color:#f8e4b1}.rh-distance-fieldwork-warning{padding:12px;border:1px solid #e0c185;border-radius:8px;font-size:12px}.rh-distance-fieldwork-warning button{margin-top:10px}.rh-distance-fieldwork-plot{display:block;width:100%;height:auto;margin-top:16px;font:12px system-ui;fill:#dce9db}.rh-distance-fieldwork-plot *{transition:none!important}.rh-distance-fieldwork-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;margin:14px 0}.rh-distance-fieldwork-table th,.rh-distance-fieldwork-table td{text-align:left;vertical-align:top;padding:9px 7px;border-bottom:1px solid #647e67;overflow-wrap:anywhere}.rh-distance-fieldwork-table caption{text-align:left;caption-side:bottom;padding:10px 0;font-size:11px;color:#d1dfcc}.rh-distance-fieldwork-table th:first-child{width:16%}.rh-distance-fieldwork-table th:nth-child(2){width:19%}.rh-distance-fieldwork-table th:nth-child(3){width:26%}.rh-distance-fieldwork-prompt+button{margin-top:12px}@container(max-width:720px){.rh-distance-fieldwork-body{padding:12px}.rh-distance-fieldwork .rh-distance-actions>button{flex:1 1 180px}.rh-distance-fieldwork-table{font-size:11px}.rh-distance-fieldwork-table th,.rh-distance-fieldwork-table td{padding:8px 4px}}
/* The empty state and image frame share a DOM node. Keep its padding and
   border changes immediate so the app-wide transition cannot skew the wipe. */
.rh-distance-inspector-frame,.rh-distance-inspector-unavailable{transition:none!important}
.rh-distance-inspector{margin-top:18px;border:1px solid #8fa997;border-radius:12px;background:#203d32;overflow:hidden}.rh-distance-inspector summary{cursor:pointer;min-height:48px;padding:13px 16px;font-size:14px;font-weight:750;color:#f7e2b1}.rh-distance-inspector[open] summary{border-bottom:1px solid #6f8d78}.rh-distance-inspector-body{padding:16px}.rh-distance-inspector-body>p{font-size:12px}.rh-distance-inspector-condition{padding:10px 12px;margin:10px 0!important;background:#142e24;border-left:3px solid #d8c28e;color:#f4e6bf}.rh-distance-inspector-frame{display:grid;position:relative;isolation:isolate;overflow:hidden;aspect-ratio:2;background:#152e24;border-radius:8px}.rh-distance-inspector-frame img{grid-area:1/1;width:100%;height:100%;min-width:0;display:block;pointer-events:none;user-select:none;transition:none!important}.rh-distance-inspector-divider{position:absolute;top:0;bottom:0;width:2px;transform:translateX(-1px);background:#fff5cc;box-shadow:0 0 0 1px #10291e;pointer-events:none;transition:none!important}.rh-distance-inspector-legend{display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;padding:8px 0;color:#e6e9d4;font-size:11px}.rh-distance-inspector-range{display:block;font-size:12px;font-weight:700;margin-top:10px}.rh-distance-inspector-range input{display:block;width:100%;height:44px;accent-color:#e7d3a1}.rh-distance-inspector-help{color:#cddfc9}.rh-distance-inspector-unavailable{padding:24px 16px;background:#152e24;border:1px dashed #9cb393;border-radius:8px;font-size:12px}.rh-distance-inspector-unavailable strong{color:#f3dfb3;font-size:14px}.rh-distance-inspector-unavailable p{margin-top:8px!important}.rh-distance-inspector-question{padding:12px;background:#142e24;border-left:3px solid #bfd5b2}@container(max-width:720px){.rh-distance-inspector-body{padding:12px}.rh-distance-inspector .rh-distance-actions>button{flex:1 1 160px}}@media(forced-colors:active){.rh-distance-inspector-divider{background:CanvasText;box-shadow:0 0 0 1px Canvas}}
.rh-distance-inquiries{padding:18px;margin-top:18px;background:#203d32;border:1px solid #9cb393;border-radius:12px}.rh-distance-inquiries>p{font-size:12px;max-width:850px}.rh-distance-inquiry-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.rh-distance-study .rh-distance-inquiry-cards button{text-align:left;padding:14px;min-width:0}.rh-distance-inquiry-cards strong{display:block;font-size:14px;margin-bottom:6px}.rh-distance-inquiry-cards span{display:block;font-size:12px;font-weight:400}.rh-distance-guide{margin-top:15px;border-top:1px solid #6f8d78;padding-top:14px;font-size:12px}.rh-distance-guide-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.rh-distance-guide-heading>strong{font-size:15px;color:#f7e2b1}.rh-distance-guide-steps{list-style:none;padding:0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:14px 0}.rh-distance-guide-steps li{display:flex;align-items:center;gap:7px;padding:8px;background:#162e24;border:1px solid #6e8e77;border-radius:8px;font-size:11px}.rh-distance-guide-steps li span{display:grid;place-items:center;min-width:22px;height:22px;border:1px solid #9eb693;border-radius:50%;color:#e5ecca;font-weight:700}.rh-distance-guide-steps li[aria-current=step]{background:#e7d3a1;color:#23372b;font-weight:700;border-color:#e7d3a1}.rh-distance-guide-steps li[aria-current=step] span{color:#23372b;border-color:#476642}.rh-distance-guide-steps li[data-complete=true]{border-color:#c4dca9}.rh-distance-guide>button{margin-top:10px}.rh-distance-pair{margin-top:18px}.rh-distance-pair h5{font-size:15px;line-height:1.4;color:#f7e2b1;margin:0 0 10px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}.rh-distance-pair h5 span{font-size:11px;color:#d4e4cc;font-weight:400}.rh-distance-pair-images{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rh-distance-pair-images img{display:block;width:100%;height:auto;aspect-ratio:2}.rh-distance-pair-intro{font-size:12px;margin-top:14px!important}.rh-distance-pair .rh-distance-panel figcaption{flex-direction:column;align-items:start;gap:4px}.rh-distance-pair .rh-distance-panel figcaption span{font-size:10px}.rh-distance-current-cover{aspect-ratio:2;background:#152e24;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;padding:14px;font-size:12px}.rh-distance-current-cover strong{font-size:16px;color:#f2ddaf}.rh-distance-current-cover p{margin-top:7px!important;max-width:310px}.rh-distance-reflection{padding:16px;margin-top:18px;border:1px solid #a2b38c;border-radius:10px;background:#294433}.rh-distance-reflection h5{font-size:17px;line-height:1.4;margin:0 0 8px;color:#f5dfb6}.rh-distance-reflection>p,.rh-distance-mechanism{font-size:12px}.rh-distance-reflection h5:focus{outline:3px solid #f0cf82;outline-offset:4px}.rh-distance-feedback{padding:12px;border-left:3px solid #e7cd93;background:#173024;font-size:12px}.rh-distance-feedback strong{display:block;color:#f7e2b1;margin-bottom:5px}.rh-distance-mechanism{margin-top:12px!important;padding:12px 14px;background:#294433;border-left:3px solid #bfd5b2}.rh-distance-snapshot-error{margin-top:10px!important;padding:12px;border:1px solid #dfc48f;border-radius:8px;font-size:12px}@container(max-width:720px){.rh-distance-inquiry-cards,.rh-distance-pair-images{grid-template-columns:1fr}.rh-distance-guide-steps{grid-template-columns:1fr 1fr}.rh-distance-inquiries{padding:15px}.rh-distance-current-cover strong{font-size:14px}.rh-distance-current-cover p{font-size:11px}}@media(forced-colors:active){.rh-distance-study .rh-distance-guide-steps li[aria-current=step]{outline:2px solid Highlight}.rh-distance-study button[aria-pressed=true]{outline:2px solid Highlight}}
.rh-distance-compare{padding:20px;margin-top:20px;background:#203d32;border:1px solid #9cb393;border-radius:12px}.rh-distance-compare>p{font-size:12px}.rh-distance-pinned-heading{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:6px;margin:17px 0 10px}.rh-distance-pinned-heading strong{color:#f7e2b1;font-size:15px}.rh-distance-pinned-heading span{font-size:12px;color:#d4e4cc}.rh-distance-study .rh-distance-pinned-panels img{display:block;width:100%;height:auto;aspect-ratio:2}.rh-distance-pin-status{color:#d0e4c8}.rh-distance-comparison-summary{padding:12px 14px;background:#132e23;border-left:3px solid #e7cd93;font-size:12px}.rh-distance-evidence-table{width:100%;border-collapse:collapse;font-size:12px;margin:14px 0;table-layout:fixed}.rh-distance-evidence-table caption{caption-side:bottom;text-align:left;font-size:11px;color:#d0e4c8;padding-top:8px}.rh-distance-evidence-table :is(th,td){text-align:left;padding:9px 7px;border-bottom:1px solid #647e67;overflow-wrap:anywhere}.rh-distance-evidence-table th:first-child{width:44%}.rh-distance-evidence-table thead{color:#f2ddb2}.rh-distance-evidence-table tbody th{font-weight:500}.rh-distance-evidence-table tr[data-changed=true]{background:#355342;color:#ffebbc}.rh-distance-evidence-table tr[data-changed=true] th{font-weight:750}.rh-distance-ratios,.rh-distance-pin-help{font-size:12px;color:#d7e5ce}.rh-distance-pin-help{margin-top:10px!important}.rh-distance-draft-warning{padding:14px;margin:12px 0;border:1px solid #dec78e;border-radius:9px;background:#394532;font-size:12px}.rh-distance-draft-warning strong{color:#ffebbc}.rh-distance-draft-warning p{margin-top:6px!important}.rh-distance-record-comparison{margin:10px 0;padding:10px;border-left:2px solid #cbb67d;background:#203e2e}.rh-distance-study .rh-distance-record-comparison p{font-size:11px;margin-bottom:0}.rh-distance-compare h4:focus{outline:3px solid #f0cf82;outline-offset:3px}@container(max-width:720px){.rh-distance-compare{padding:15px}.rh-distance-compare .rh-distance-actions>button{flex:1 1 160px}}
.rh-distance-study{container-type:inline-size;margin-top:20px;color:#e4ecdf;font:400 14px/1.6 system-ui,sans-serif;background:#142b26;border:1px solid #769382;border-radius:18px;padding:clamp(14px,3vw,26px);overflow:hidden}.rh-distance-study *{box-sizing:border-box}.rh-distance-study :is(h3,h4,p,figure){margin:0}.rh-distance-study h3{color:#f9e8be;font-size:clamp(25px,4vw,37px);line-height:1.15;margin:7px 0 12px;letter-spacing:-.7px}.rh-distance-study h4{font-size:19px;line-height:1.4;color:#f4e5c6;margin:6px 0 10px}.rh-distance-kicker{color:#c3deca;text-transform:uppercase;letter-spacing:1.6px;font-size:10px;font-weight:800}.rh-distance-head{display:flex;gap:20px;align-items:start;justify-content:space-between}.rh-distance-head>div{max-width:730px}.rh-distance-study button{font:650 12px/1.4 system-ui;cursor:pointer;min-height:44px;border:1px solid #8fa997;border-radius:9px;padding:10px 13px;background:#28483b;color:#f0f1de}.rh-distance-study button:hover{background:#375b49}.rh-distance-study button[aria-pressed=true],.rh-distance-study button.rh-distance-primary{background:#eed7a6;color:#23382d;border-color:#eed7a6}.rh-distance-study button:disabled{opacity:.58;cursor:default}.rh-distance-study :is(button,input,textarea,summary,a):focus-visible{outline:3px solid #f0cf82;outline-offset:3px}.rh-distance-study h3:focus{outline:none}.rh-distance-boundary{margin-top:16px!important;padding:12px 15px;background:#203e33;border-left:3px solid #ddc28a;color:#deead8;font-size:12px}.rh-distance-workspace{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,1fr);gap:16px;margin-top:18px}.rh-distance-wide,.rh-distance-panel{border:1px solid #6f8d78;border-radius:12px;overflow:hidden;min-width:0;background:#203b30}.rh-distance-study figcaption{padding:13px 15px;display:flex;flex-wrap:wrap;gap:5px;justify-content:space-between;font-size:13px}.rh-distance-study figcaption span{color:#ceddca;font-size:11px}.rh-distance-study canvas{display:block;width:100%;height:auto;aspect-ratio:2;background:#8eaa84}.rh-distance-study figure>p{padding:12px 15px;font-size:11px;color:#d1dfcc}.rh-distance-context-image,.rh-distance-image{position:relative}.rh-distance-locator{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:3.712%;height:3.712%;min-width:8px;min-height:8px;outline:2px solid #fff0bc;box-shadow:0 0 0 3px #18392b88;pointer-events:none}.rh-distance-controls{padding:17px;border:1px solid #6f8d78;border-radius:12px;background:#1d392e;min-width:0}.rh-distance-range{display:block;margin-top:14px;font-size:12px}.rh-distance-range>span{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}.rh-distance-range output{color:#f4dba7;font-weight:750}.rh-distance-range input{display:block;width:100%;height:44px;accent-color:#cce4b7}.rh-distance-range small{display:flex;justify-content:space-between;font-size:10px;color:#cfddc9}.rh-distance-actions{display:flex;flex-wrap:wrap;gap:7px;margin:15px 0 10px}.rh-distance-controls>p{font-size:11px}.rh-distance-status{margin-top:12px;font-size:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}.rh-distance-predict,.rh-distance-notebook{padding:20px;margin-top:20px;background:#1b372d;border:1px solid #708a72;border-radius:12px}.rh-distance-choices{display:flex;gap:9px;flex-wrap:wrap;margin:15px 0}.rh-distance-choices>button{flex:1 1 180px;text-align:left}.rh-distance-predict>p{font-size:12px}.rh-distance-result{margin-top:15px;padding:15px;background:#2a4737;border-left:3px solid #ecd39d;font-size:13px}.rh-distance-result strong{display:block;color:#fae9be}.rh-distance-result p{margin-top:8px;font-size:12px}.rh-distance-magnification{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0 10px;font-size:12px}.rh-distance-magnification strong{color:#f5dfb6}.rh-distance-magnification span{color:#d1dfcc}.rh-distance-panels{display:grid;grid-template-columns:1fr 1fr;gap:14px}.rh-distance-cover{position:absolute;inset:0;background:#223d31f5;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:20px}.rh-distance-cover span{font-weight:750;color:#f2ddaf;font-size:19px}.rh-distance-cover p{font-size:12px;max-width:260px}.rh-distance-notebook ol{padding-left:23px;font-size:12px;color:#d9e6d4}.rh-distance-notebook label{display:block;font-size:12px;font-weight:700;margin-top:15px}.rh-distance-notebook textarea{font:400 14px/1.5 system-ui;display:block;resize:vertical;width:100%;max-width:100%;min-height:95px;margin:6px 0 10px;padding:12px;background:#10291e;color:#f0eee0;border:1px solid #9bad91;border-radius:8px}.rh-distance-notebook textarea::placeholder{color:#b8cbb7}.rh-distance-notebook>p{font-size:12px;margin-top:8px}.rh-distance-record{padding:14px;margin-top:13px;background:#102a1f;border:1px solid #66866f;border-radius:8px;overflow-wrap:anywhere}.rh-distance-record strong{color:#f1ddb0;font-size:12px}.rh-distance-record p{white-space:pre-wrap;margin:7px 0;font-size:13px}.rh-distance-record small{color:#c6d8c0;font-size:11px}.rh-distance-method{margin-top:18px;border-top:1px solid #6f8a75;padding-top:12px;font-size:12px}.rh-distance-method summary{cursor:pointer;min-height:44px;padding:10px 0;color:#edddb6;font-weight:750}.rh-distance-method p{margin:10px 0}.rh-distance-method a{color:#bce6dc;text-decoration:underline;overflow-wrap:anywhere}@container(max-width:720px){.rh-distance-workspace,.rh-distance-panels{grid-template-columns:1fr}.rh-distance-head{flex-direction:column}.rh-distance-predict,.rh-distance-notebook{padding:15px}}`;
  global.RaptorDistanceStudy = Object.freeze({ version: '1.0.0', Component: Component });
})(typeof window !== 'undefined' ? window : globalThis);
