/* Opt-in, static observation activity. Flight state and rewards stay with the host. */
(function (global) {
  'use strict';
  function Component(props) {
    var React = props.React, h = React.createElement, model = global.RaptorDistanceModel, evidence = global.RaptorDistanceEvidence, investigations = global.RaptorDistanceInvestigations;
    var settings = model.normalize(props.settings), metrics = model.metrics(settings), fieldwork = global.RaptorDistanceFieldwork, resultsAPI = global.RaptorDistanceResults, matchAPI = global.RaptorDistanceMatch;
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
    var guidePair = React.useState(null), guide = guidePair[0], setGuide = guidePair[1], guideNumber = React.useRef(0);
    var reflectionPair = React.useState(null), reflection = reflectionPair[0], setReflection = reflectionPair[1];
    var huntPair = React.useState(null), hunt = huntPair[0], setHunt = huntPair[1], huntNumber = React.useRef(0);
    var huntMessagePair = React.useState(''), huntMessage = huntMessagePair[0], setHuntMessage = huntMessagePair[1];
    var resultsMessagePair = React.useState(''), resultsMessage = resultsMessagePair[0], setResultsMessage = resultsMessagePair[1];
    var resultsAnswerPair = React.useState(null), resultsAnswer = resultsAnswerPair[0], setResultsAnswer = resultsAnswerPair[1];
    var matchPair = React.useState(null), match = matchPair[0], setMatch = matchPair[1], matchNumber = React.useRef(0);
    var matchCheckPair = React.useState(null), matchCheck = matchCheckPair[0], setMatchCheck = matchCheckPair[1];
    var savedPair = React.useState(''), savedMessage = savedPair[0], setSavedMessage = savedPair[1];
    var labels = { both: 'Within both selected references', eagle: 'Above human reference; within eagle reference', neither: 'Above both selected references' };
    var key = [settings.distance, settings.cycles, settings.contrast].join('/');
    var records = evidence.readRecords(props.settings);
    var savedResults = resultsAPI ? resultsAPI.read(props.settings && props.settings.fieldworkResults) : null;
    var resultsComparison = savedResults && resultsAPI ? resultsAPI.compare(savedResults) : null;
    var resultsKey = JSON.stringify(savedResults);
    var activeResultsAnswer = resultsAnswer && resultsAnswer.key === resultsKey ? resultsAnswer.answer : null;
    var comparison = pinned ? evidence.compare(pinned.settings, settings) : null;
    var contextKey = key + '|' + (pinned ? conditionKey(pinned.settings) : 'none') + '|' + (guide ? guide.id + '/' + guide.run : 'free') + '|' + (hunt ? hunt.id + '/' + hunt.run : 'no-hunt') + '|' + (match ? 'match/' + match.run : 'no-match');
    var staleDraft = !!note.trim() && (!draft || draft.key !== contextKey);
    var factorNames = { distance: 'viewing distance', cycles: 'stripe-pair count', contrast: 'display contrast' };
    function conditionKey(value) { return [value.distance, value.cycles, value.contrast].join('/'); }
    function conditionLabel(value) { return value.distance + ' m · ' + value.cycles + ' stripe pairs · ' + value.contrast + '% display contrast'; }
    var inquiry = guide ? investigations.get(guide.id) : null;
    var matchedInquiry = !!(inquiry && pinned && investigations.match(inquiry.id, pinned.settings, settings));
    var guideStage = !inquiry ? null : matchedInquiry ? (revealed && status === 'ready' ? 'inspect' : 'changed') :
      conditionKey(settings) === conditionKey(inquiry.reference) ? (!pinned ? 'starter' : conditionKey(pinned.settings) === conditionKey(inquiry.reference) ? 'pinned' : 'diverged') : 'diverged';
    var currentImages = revealed && status === 'ready' && inspection && inspection.key === key ? inspection : null;
    var inspectorImages = inspectorSource === 'pinned' ? pinned : currentImages;
    var inspectorSettings = inspectorSource === 'pinned' ? (pinned && pinned.settings) : settings;
    var inspectorLabel = inspectorSource === 'pinned' ? 'Pinned condition' : 'Current condition';
    var explanation = pinned && revealed && status === 'ready' ? investigations.explain(pinned.settings, settings) : null;
    var reflectionResult = matchedInquiry && revealed && reflection ? investigations.check(inquiry.id, pinned.settings, settings, reflection) : null;
    var huntPlan = hunt && fieldwork ? fieldwork.plan(hunt.id) : null;
    var huntSummary = huntPlan ? fieldwork.summarize(hunt.id, hunt.trials) : null;
    var huntHeld = settings.cycles === 12 && settings.contrast === 95;
    var matchPlan = matchAPI && matchAPI.plan(), matchReference = !!(match && matchPlan && pinned && matchAPI.isReference(pinned.settings));
    var matchHeld = settings.cycles === 8 && settings.contrast === 95;
    var matchComparison = matchReference && matchHeld ? matchAPI.compare(pinned.settings, settings) : null;
    // A new render, pin or run must never inherit the previous match verdict.
    var checkedMatch = match && matchReference && matchHeld && currentImages && matchCheck && matchCheck.run === match.run && matchCheck.pin === pinned && matchCheck.inspection === currentImages ? matchCheck.result : null;
    function draftContext() { return { key: contextKey, settings: evidence.snapshot(settings), reference: pinned ? evidence.snapshot(pinned.settings) : null, question: inquiry ? inquiry.title : huntPlan ? huntPlan.title : match ? 'Match the model’s stripe contrast' : null }; }
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
      if (scene.current) {
        try { scene.current.update(settings); }
        catch (error) { scene.current.dispose(); scene.current = null; setStatus('error'); }
      }
    }, [key]);
    React.useEffect(function () { setReflection(null); }, [contextKey]);
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
    function focus(selector) { var element = root.current && root.current.querySelector(selector); if (element) element.focus(); }
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
            !matchHeld && h('div', { className: 'rh-distance-match-warning', 'data-distance-match-held-warning': 'true' }, h('p', null, 'Stripe count or display contrast changed. Restore the held conditions to isolate distance.'), h('button', { type: 'button', 'data-distance-match-restore': 'true', onClick: function () { change({ cycles: 8, contrast: 95 }); } }, 'Restore eight pairs and 95% contrast')),
            matchReference && h('div', { className: 'rh-distance-match-evidence' },
              h('div', { className: 'rh-distance-match-views' }, ['human', 'eagle'].map(view)),
              h('p', { className: 'rh-distance-match-method' }, 'The bars share a 0–100% scale. They are calculated from the chosen Gaussian filter, not measured from these images. They show retained input modulation; display contrast stays at 95%.'),
              h('button', { type: 'button', 'data-distance-match-check': 'true', disabled: !ready, onClick: checkMatch }, 'Check this distance'),
              h('p', null, 'Activity rule: compare spatial frequency divided by each selected reference value (60 or 140 cycles/degree). Within 1% counts as a model match; this tolerance is not a perceptual threshold.'),
              checkedMatch && h('div', { className: 'rh-distance-match-feedback', 'data-distance-match-feedback': 'true', 'data-matched': String(checkedMatch.matched), 'data-direction': checkedMatch.direction, role: 'status' },
                h('strong', null, checkedMatch.matched ? 'Matched the model’s stripe-contrast retention.' : checkedMatch.direction === 'farther' ? 'The eagle filter retains more stripe contrast. Try farther away.' : 'The eagle filter retains less stripe contrast. Try moving closer.'),
                h('p', null, 'Eagle/human normalized spatial frequency: ' + checkedMatch.ratio.toFixed(3) + '×. Difference from a match: ' + (checkedMatch.error * 100).toFixed(2) + '%.'),
                checkedMatch.matched && h('p', null, 'The eagle view is ' + checkedMatch.distanceRatio.toFixed(2) + '× farther away, while the plaque spans ' + (checkedMatch.angleRatio * 100).toFixed(1) + '% of its pinned angular size. Similar model contrast does not make the images identical or establish equivalent animal vision.'),
                h('button', { type: 'button', 'data-distance-match-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Explain the result in your notebook'))))));
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
          h('svg', { viewBox: '0 0 640 210', className: 'rh-distance-results-plot', 'data-distance-results-plot': 'true', role: 'img', 'aria-label': 'Saved distance brackets for the same pattern. Each bar starts at zero metres; its gold end interval is the recorded bracket. Exact endpoints are in the saved result cards.' },
            [0, 100, 200, 300].map(function (distance) { return h('g', { key: distance }, h('line', { x1: x(distance), x2: x(distance), y1: 40, y2: 170, stroke: '#45665a' }), h('text', { x: x(distance), y: 188, textAnchor: 'middle' }, distance)); }),
            ['human', 'eagle'].map(function (id, index) { var result = comparison[id], y = 65 + index * 72; return h('g', { key: id, 'data-distance-results-range': id, 'data-low': result.below.distance, 'data-high': result.above.distance },
              h('text', { x: 54, y: y - 12 }, (id === 'human' ? 'Human' : 'Eagle') + ' reference · ' + result.below.distance + '–' + result.above.distance + ' m'),
              h('rect', { x: x(0), y: y, width: x(result.below.distance) - x(0), height: 20, fill: '#75b6a0' }),
              h('rect', { 'data-distance-results-interval': id, x: x(result.below.distance), y: y, width: x(result.above.distance) - x(result.below.distance), height: 20, fill: '#f1cb84' }),
              [result.below.distance, result.above.distance].map(function (distance) { return h('line', { key: distance, x1: x(distance), x2: x(distance), y1: y - 3, y2: y + 23, stroke: '#f9dfab', strokeWidth: 1 }); })); }),
            h('text', { x: 325, y: 207, textAnchor: 'middle' }, 'Distance from the same pattern (m)')),
          h('p', { className: 'rh-distance-results-ratio' }, 'Eagle/human distance ratio implied by your brackets: ', h('strong', { 'data-distance-results-ratio': 'true' }, ratioLabel)),
          h('p', null, 'The lower ratio uses the nearer eagle endpoint and farther human endpoint; the upper ratio uses the farther eagle endpoint and nearer human endpoint. Displayed bounds are rounded outward. This is a range from sampled model brackets, not a statistical confidence interval or a prey-detection estimate.'),
          h('h5', null, 'Which conclusion is supported by these saved trials?'),
          h('div', { className: 'rh-distance-choices' }, [['frequency', 'The same pattern crosses the eagle reference at a greater distance.'], ['size', 'The eagle view uses a larger bird or plaque.'], ['detection', 'These brackets prove exactly how far a real eagle detects prey.']].map(function (item) { return h('button', { key: item[0], type: 'button', 'data-distance-results-answer': item[0], 'aria-pressed': activeResultsAnswer === item[0], onClick: function () { setResultsAnswer({ key: resultsKey, answer: item[0] }); } }, item[1]); })),
          activeResultsAnswer && h('p', { className: 'rh-distance-results-feedback', 'data-distance-results-feedback': 'true', 'data-correct': String(activeResultsAnswer === 'frequency'), role: 'status' },
            activeResultsAnswer === 'frequency' ? 'Supported by these model trials: the pattern crosses the selected eagle spatial-frequency reference farther away, while its size and stripe count stay fixed. Real detection also depends on the animal, task and viewing conditions.' : activeResultsAnswer === 'size' ? 'Check what stayed fixed: both saved series use the same 30 cm plaque and 12 stripe pairs. The reference value changes; the animal and pattern do not grow.' : 'These are selected spatial-frequency references and sampled model brackets. Resolving a stripe pattern does not establish a real animal’s prey-detection distance.')));
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
              h('button', { type: 'button', 'data-distance-fieldwork-restore': 'true', onClick: function () { change({ cycles: 12, contrast: 95 }); } }, 'Restore 12 pairs and 95% contrast')),
            h('div', { className: 'rh-distance-actions' },
              h('button', { type: 'button', 'data-distance-fieldwork-distance': 'true', onClick: function () { focus('#rh-distance-distance'); } }, 'Choose a distance'),
              h('button', { type: 'button', 'data-distance-fieldwork-record': 'true', disabled: !revealed || !choice || status !== 'ready' || !huntHeld, onClick: recordTrial }, 'Record this revealed trial'),
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
            resultsAPI && h('button', { type: 'button', className: 'rh-distance-keep-result', 'data-distance-results-save': 'true', disabled: !summary.complete, onClick: keepResult }, (savedResults && savedResults[hunt.id] ? 'Replace saved ' : 'Keep completed ') + hunt.id + ' result'),
            h('button', { type: 'button', 'data-distance-fieldwork-note': 'true', onClick: function () { focus('[data-distance-note]'); } }, 'Write your conclusion')),
          resultsMessage && h('p', { 'data-distance-results-message': 'true', role: 'status' }, resultsMessage),
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
    function inspectSameCondition() {
      var shareLabel = inspectorShare + '% human reference; ' + (100 - inspectorShare) + '% eagle reference';
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
            h('output', { htmlFor: 'rh-distance-inspector-share', style: { display: 'block', fontWeight: 400 } }, inspectorShare + '% human · ' + (100 - inspectorShare) + '% eagle'),
            h('input', { id: 'rh-distance-inspector-share', 'data-distance-inspector-range': 'true', type: 'range', min: 0, max: 100, step: 1, value: inspectorShare,
              disabled: !inspectorImages, 'aria-labelledby': 'rh-distance-inspector-share-label', 'aria-valuetext': shareLabel, 'aria-describedby': 'rh-distance-inspector-help',
              onChange: function (event) { setInspectorShare(Number(event.target.value)); } })),
          h('p', { id: 'rh-distance-inspector-help', className: 'rh-distance-inspector-help' }, 'Human image appears to the left of the divider; eagle image to the right. Use the slider, arrow keys or the full-image buttons. These percentages describe image area, not visual ability.'),
          h('div', { className: 'rh-distance-actions', role: 'group', 'aria-label': 'Comparison divider position' }, [['human', 100, 'Full human reference'], ['split', 50, 'Split view'], ['eagle', 0, 'Full eagle reference']].map(function (item) {
            return h('button', { key: item[0], type: 'button', 'data-distance-inspector-preset': item[0], disabled: !inspectorImages, 'aria-pressed': inspectorShare === item[1], onClick: function () { setInspectorShare(item[1]); } }, item[2]);
          })),
          h('p', { className: 'rh-distance-inspector-question' }, 'Look for evidence: which stripe boundaries remain distinct in each reference image? What stays fixed as you move the divider? Record what you notice in your observation below. This illustration does not predict whether an animal would detect prey.')));
    }
    function slider(name, label, value, min, max, unit) {
      return h('label', { className: 'rh-distance-range', htmlFor: 'rh-distance-' + name },
        h('span', null, label, h('output', { htmlFor: 'rh-distance-' + name }, value + unit)),
        h('input', { id: 'rh-distance-' + name, type: 'range', min: min, max: max, step: 1, value: value,
          onChange: function (event) { var patch = {}; patch[name] = Number(event.target.value); change(patch); } }),
        h('small', null, min + unit, h('span', null, max + unit)));
    }
    function panel(name, title, subtitle, ref) {
      return h('figure', { className: 'rh-distance-panel' }, h('figcaption', null, h('strong', null, title), h('span', null, subtitle)),
        h('div', { className: 'rh-distance-image' }, h('canvas', { ref: ref, width: 1024, height: 512, 'data-distance-canvas': name,
          role: 'img', 'aria-label': title + '. Same distant scene; ' + (name === 'reference' ? '60' : '140') + ' cycles per degree illustrative detail filter.' }),
          !revealed && h('div', { className: 'rh-distance-cover' }, h('span', null, 'Predict first'), h('p', null, 'Choose a reference band, then reveal both views.'))),
        h('p', null, name === 'reference' ? 'Selected human reference · 60 cycles/degree' : 'Selected wedge-tailed eagle reference · 140 cycles/degree'));
    }
    return h('section', { ref: root, className: 'rh-distance-study', 'data-raptor-distance-study': 'true', 'data-render-ready': String(status === 'ready'), 'aria-label': 'Find the distant detail' },
      h('style', null, CSS),
      h('header', { className: 'rh-distance-head' }, h('div', null, h('span', { className: 'rh-distance-kicker' }, 'Field investigation · Spatial detail'),
        h('h3', { tabIndex: -1 }, 'Find the distant detail'), h('p', null, 'A bird can remain in view while its fine details disappear. Keep the scene fixed and investigate what distance does to a pattern.')),
        h('button', { type: 'button', 'data-raptor-distance-close': 'true', onClick: props.onClose }, 'Close investigation')),
      h('p', { className: 'rh-distance-boundary' }, 'This display models spatial detail. It is not a view through an eagle’s eyes or a test of your eyesight. Resolving stripes is different from detecting an animal.'),
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
          })), h('p', null, 'Presets restore 12 stripe pairs and 95% display contrast. One cycle is one light stripe plus one dark stripe.'))),
      h('div', { className: 'rh-distance-status', 'data-distance-status': status, role: 'status' },
        status === 'loading' ? 'Preparing the shared dove and observation scene…' : status === 'error' ? 'The observation scene could not load. Your existing activities and saved observations are still available.' : 'Scene ready. Both detail views use the same camera, lighting, distance and target.',
        status === 'error' && h('button', { type: 'button', 'data-distance-retry': 'true', onClick: function () { setAttempt(attempt + 1); } }, 'Retry scene')),
      h('section', { className: 'rh-distance-predict', 'aria-label': 'Predict and inspect' }, h('span', { className: 'rh-distance-kicker' }, '02 · Predict, then inspect'),
        h('h4', null, 'Which high-contrast reference band contains this pattern?'),
        h('p', null, 'Use distance and stripe spacing to make a prediction. The bands compare spatial frequency with selected references; they do not predict whether a living animal could detect this target.'),
        h('div', { className: 'rh-distance-choices' }, Object.keys(labels).map(function (id) { return h('button', { key: id, type: 'button', 'data-distance-prediction': id, 'aria-pressed': choice === id,
          onClick: function () { setChoice(id); setRevealed(false); setInspection(null); setSnapshotMessage(''); setReflection(null); setSavedMessage(''); } }, labels[id]); })),
        h('button', { type: 'button', className: 'rh-distance-primary', 'data-distance-reveal': 'true', disabled: !choice || status !== 'ready', onClick: reveal }, 'Reveal both views'),
        revealed && h('div', { className: 'rh-distance-result', 'data-distance-result': 'true', role: 'status' },
          h('strong', null, choice === metrics.referenceBand ? 'Your prediction matches the reference band. ' : 'Compare your prediction with the reference band. '),
          h('span', null, labels[metrics.referenceBand] + '. ' + settings.cycles + ' pairs across ' + metrics.angleDeg.toFixed(3) + '° = ' + metrics.cyclesPerDegree.toFixed(1) + ' cycles/degree.'),
          h('p', null, 'These are selected high-contrast references. Reducing display contrast fades the stripes without changing their angular spacing or the reference band.')),
        hunt && revealed && h('button', { type: 'button', className: 'rh-distance-primary', 'data-distance-fieldwork-record-inline': 'true', disabled: !choice || status !== 'ready' || !huntHeld,
          style: { marginTop: '12px' }, onClick: function () { recordTrial(); var panel = root.current && root.current.querySelector('[data-distance-fieldwork]'); if (panel) panel.open = true; focus('[data-distance-fieldwork-status]'); } }, 'Record trial and view range-finding evidence'),
        matchReference && revealed && h('button', { type: 'button', className: 'rh-distance-primary', 'data-distance-match-check-inline': 'true', disabled: !matchComparison || !currentImages || status !== 'ready',
          style: { marginTop: '12px' }, onClick: function () { checkMatch(); var panel = root.current && root.current.querySelector('[data-distance-match]'); if (panel) panel.open = true; focus('[data-distance-match-heading]'); } }, 'Check distance and return to the match challenge')),
      h('div', { className: 'rh-distance-magnification' }, h('strong', null, 'Equal inspection magnification · ' + metrics.magnification.toFixed(1) + '×'),
        h('span', null, 'Both panels show a 0.75° horizontal field. This is a display aid; the bird and plaque have not grown or moved closer.')),
      h('div', { className: 'rh-distance-panels', 'data-distance-original-panels': 'true', style: pinned && !snapshotMessage ? { display: 'none' } : undefined }, panel('reference', 'Human reference model', 'Same crop · illustrative detail filter', reference), panel('eagle', 'Wedge-tailed eagle reference model', 'Same crop · illustrative detail filter', eagle)),
      snapshotMessage && revealed && h('p', { className: 'rh-distance-snapshot-error', 'data-distance-snapshot-error': 'true', role: 'status' }, snapshotMessage),
      inspectSameCondition(),
      h('section', { className: 'rh-distance-compare', 'aria-label': 'Compare one change' }, h('span', { className: 'rh-distance-kicker' }, '03 · Change one thing'),
        h('h4', { ref: comparisonHeading, tabIndex: -1 }, 'Keep a view. Test a change.'),
        h('p', null, 'Reveal both views, then pin them as your starting condition. Each experiment starts from that pin, keeping the other two controls fixed. Predict again before revealing the changed views.'),
        h('div', { className: 'rh-distance-actions' }, h('button', { type: 'button', 'data-distance-pin': 'true', disabled: !revealed || status !== 'ready', onClick: pin }, pinned ? 'Replace pinned condition' : 'Pin revealed condition'),
          pinned && h('button', { type: 'button', 'data-distance-clear-pin': 'true', onClick: function () { setPinned(null); setPinMessage('Pinned condition cleared. Saved comparisons remain in your notebook.'); comparisonHeading.current.focus(); } }, 'Clear pin')),
        h('p', { className: 'rh-distance-pin-status', role: 'status' }, pinMessage || 'A pin keeps two still images during this visit. Recording an observation saves both sets of conditions; closing clears the pin.'),
        pinned && h('div', { 'data-distance-comparison': 'true', 'data-kind': comparison.kind },
          h('p', { className: 'rh-distance-pair-intro' }, 'Read across each pair to compare conditions through the same filter. Both images keep the same inspection magnification.'),
          ['reference', 'eagle'].map(pairedViews),
          h('div', { className: 'rh-distance-actions' }, [['distance', 'Double distance', 'Pin a distance of 150 m or less.'], ['cycles', 'Double stripe pairs', 'Pin 10 stripe pairs or fewer.'], ['contrast', 'Set contrast to 25%', 'The pinned contrast is already 25%.'], ['restore', 'Restore pinned conditions', '']].map(function (item) {
            var available = !!evidence.experiment(pinned.settings, item[0]);
            return h('button', { key: item[0], type: 'button', 'data-distance-experiment': item[0], disabled: !available || status !== 'ready', title: available ? 'Start from the pinned condition' : item[2], onClick: function () { experiment(item[0]); } }, item[1]);
          })),
          h('p', { className: 'rh-distance-comparison-summary', role: 'status' }, comparisonLabel(comparison)),
          h('table', { className: 'rh-distance-evidence-table' }, h('caption', null, 'Pinned and current conditions · target size, lighting and filters stay fixed'),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Measure'), h('th', { scope: 'col' }, 'Pinned'), h('th', { scope: 'col' }, 'Current'))),
            h('tbody', null, [['Viewing distance', pinned.settings.distance + ' m', settings.distance + ' m', 'distance'], ['Stripe pairs', pinned.settings.cycles, settings.cycles, 'cycles'], ['Display contrast', pinned.settings.contrast + '%', settings.contrast + '%', 'contrast'], ['Angular span', model.metrics(pinned.settings).angleDeg.toFixed(3) + '°', metrics.angleDeg.toFixed(3) + '°'], ['Cycles/degree', model.metrics(pinned.settings).cyclesPerDegree.toFixed(1), metrics.cyclesPerDegree.toFixed(1)]].map(function (row) {
              return h('tr', { key: row[0], 'data-changed': row[3] ? String(comparison.changedFields.indexOf(row[3]) !== -1) : undefined }, h('th', { scope: 'row' }, row[0]), h('td', null, row[1]), h('td', null, row[2]));
            }))),
          h('p', { className: 'rh-distance-ratios' }, 'Current ÷ pinned: angular span ' + comparison.angleRatio.toFixed(2) + '×; spatial frequency ' + comparison.frequencyRatio.toFixed(2) + '×. Compare the same reference model across the two conditions.'),
          matchedInquiry && revealed && status === 'ready' && h('section', { className: 'rh-distance-reflection', 'data-distance-reflection': 'true', 'aria-label': 'Explain the change' },
            h('h5', { tabIndex: -1, 'data-distance-reflection-heading': 'true' }, 'What happened to angular span and spatial frequency?'),
            h('p', null, 'Use your comparison and the measurements above. This checks the model relationship; your personal visual observations are not scored.'),
            h('div', { className: 'rh-distance-choices' }, inquiry.choices.map(function (answer) { return h('button', { key: answer.id, type: 'button', 'data-distance-reflection-answer': answer.id, 'aria-pressed': reflection === answer.id, onClick: function () { setReflection(answer.id); } }, answer.text); })),
            reflectionResult && h('div', { className: 'rh-distance-feedback', 'data-distance-reflection-feedback': 'true', 'data-correct': String(reflectionResult.correct), role: 'status' },
              h('strong', null, reflectionResult.correct ? 'That matches the model relationship.' : 'Use the measurements to reconsider.'), h('p', null, reflectionResult.explanation))),
          explanation && !matchedInquiry && h('p', { className: 'rh-distance-mechanism', 'data-distance-mechanism': 'true' }, explanation.text),
          h('p', { className: 'rh-distance-pin-help' }, 'For doubling experiments, pin 150 m or nearer and 10 stripe pairs or fewer. To test fading, compare the 25% contrast condition with a stronger pinned pattern.'))),
      h('section', { className: 'rh-distance-notebook', 'aria-label': 'Distance investigation notebook' }, h('span', { className: 'rh-distance-kicker' }, '04 · Keep the evidence'), h('h4', null, 'What stayed the same? What changed?'),
        h('p', null, pinned ? 'Compare the pinned and current views. Describe your evidence, name the factor you changed and explain what you kept fixed.' : 'Describe what you observed. Pin a revealed condition above to record a comparison with your next observation.'),
        h('label', { htmlFor: 'rh-distance-note' }, 'Your observation'), h('textarea', { id: 'rh-distance-note', 'data-distance-note': 'true', value: note, maxLength: 600, rows: 3,
          placeholder: 'At … metres, I noticed … . I kept … fixed.', onChange: function (event) { if (!note.trim()) setDraft(draftContext()); setNote(event.target.value); setSavedMessage(''); } }),
        staleDraft && h('div', { className: 'rh-distance-draft-warning', 'data-distance-draft-stale': 'true', role: 'status' },
          h('strong', null, 'Review this draft before saving.'),
          h('p', null, 'Your conditions, pinned comparison or investigation changed after this note began.' + (draft ? ' Draft condition: ' + conditionLabel(draft.settings) + '. ' + (draft.reference ? 'Draft pin: ' + conditionLabel(draft.reference) + '.' : 'The draft had no pinned comparison.') + (draft.question ? ' Draft question: ' + draft.question + '.' : '') : '')),
          h('p', null, 'Revise the observation if needed, then choose whether to use it for the current conditions.'),
          h('div', { className: 'rh-distance-actions' }, h('button', { type: 'button', 'data-distance-adopt-draft': 'true', onClick: function () { setDraft(draftContext()); root.current.querySelector('[data-distance-note]').focus(); } }, 'Use this draft for current conditions'),
            h('button', { type: 'button', 'data-distance-clear-draft': 'true', onClick: function () { setNote(''); setDraft(null); root.current.querySelector('[data-distance-note]').focus(); } }, 'Start a new observation'))),
        h('button', { type: 'button', 'data-distance-save': 'true', disabled: !revealed || !note.trim() || staleDraft || status !== 'ready', onClick: save }, 'Record observation'),
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
