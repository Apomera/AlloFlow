// stem_tool_trajectorycomputing.js - Trajectory Computing Lab
// Original educational simulation. The fictional mission and facility are not
// adapted from any book or film. Historical notes link to primary NASA sources.
(function () {
  'use strict';

  if (typeof window === 'undefined' || !window.StemLab || typeof window.StemLab.registerTool !== 'function') {
    if (typeof console !== 'undefined') console.warn('[StemLab] Trajectory Computing Lab loaded before the registry.');
    return;
  }

  var TOOL_ID = 'trajectoryComputing';
  var STATE_KEY = '_trajectoryComputing';
  var MISSION_VARIANTS = Object.freeze([
    Object.freeze({ id: 'aurora-3', name: 'Aurora Test 3', facility: 'National Aeronautics Laboratory', year: 1962, speed: 215, angle: 38, height: 30, gravity: 9.81, zoneMin: 4550, zoneMax: 4700 }),
    Object.freeze({ id: 'meridian-5', name: 'Meridian Test 5', facility: 'National Aeronautics Laboratory', year: 1963, speed: 198, angle: 44, height: 24, gravity: 9.81, zoneMin: 3950, zoneMax: 4100 }),
    Object.freeze({ id: 'horizon-8', name: 'Horizon Test 8', facility: 'National Aeronautics Laboratory', year: 1964, speed: 230, angle: 32, height: 45, gravity: 9.81, zoneMin: 4850, zoneMax: 5000 }),
    Object.freeze({ id: 'aurora-control-3b', name: 'Aurora Control 3B', facility: 'National Aeronautics Laboratory', year: 1962, speed: 210, angle: 38, height: 30, gravity: 9.81, zoneMin: 4550, zoneMax: 4700 })
  ]);
  var MISSION = MISSION_VARIANTS[0];
  var REPLAY_REASONING_OPTIONS = Object.freeze([
    Object.freeze({ id: 'reproducible', label: 'The same inputs reproduced the baseline result.' }),
    Object.freeze({ id: 'isolated-change', label: 'One changed input was isolated, so its effect can be compared.' }),
    Object.freeze({ id: 'combined-not-isolated', label: 'Several inputs changed together, so this replay cannot isolate one cause.' })
  ]);

  function hasMissionVariant(id) {
    return MISSION_VARIANTS.some(function (item) { return item.id === id; });
  }

  function normalizeMissionVariantId(id, fallbackId) {
    if (hasMissionVariant(id)) return id;
    if (hasMissionVariant(fallbackId)) return fallbackId;
    return MISSION.id;
  }

  function getMissionVariant(id) {
    var selected = MISSION_VARIANTS.find(function (item) { return item.id === id; }) || MISSION;
    return Object.assign({}, selected);
  }

  var SUPPORT_PROFILES = Object.freeze({
    guided: Object.freeze({ id: 'guided', formulaVisibility: 'always', diagnosticHintAfter: 1, checkpointPrompt: true }),
    standard: Object.freeze({ id: 'standard', formulaVisibility: 'request', diagnosticHintAfter: 2, checkpointPrompt: true }),
    expert: Object.freeze({ id: 'expert', formulaVisibility: 'request', diagnosticHintAfter: 3, checkpointPrompt: false })
  });

  var SAFEGUARD_OPTIONS = Object.freeze([
    Object.freeze({ id: 'deck-audit', label: 'Deck sequence audit' }),
    Object.freeze({ id: 'compiler', label: 'Compiler diagnostic' }),
    Object.freeze({ id: 'readback', label: 'Machine output read-back' }),
    Object.freeze({ id: 'role-check', label: 'Independent role check' })
  ]);
  var SAFEGUARD_CASES = Object.freeze([
    Object.freeze({ id: 'swapped-cards', title: 'Swapped calculation cards', incident: 'Cards 00010006 and 00010007 arrive in reverse order before the machine run.', expected: 'deck-audit', explanation: 'The printed sequence fields let the deck audit catch the swap before computation.' }),
    Object.freeze({ id: 'misspelled-variable', title: 'Misspelled program variable', incident: 'The listing uses RAT where the declared variable is RAD.', expected: 'compiler', explanation: 'The compiler reports the unknown variable before the calculation can finish.' }),
    Object.freeze({ id: 'transposed-output', title: 'Transposed printed range', incident: 'The printout says 4607.7 m, but the operator records 4067.7 m.', expected: 'readback', explanation: 'A deliberate machine-output read-back compares the transcription with the printed job.' }),
    Object.freeze({ id: 'same-desk-signoff', title: 'Same-desk signoff', incident: 'The calculation and independent verification are assigned to the same desk code.', expected: 'role-check', explanation: 'The role check blocks a signoff that is not independently assigned.' })
  ]);
  var REFLECTION_ERROR_OPTIONS = Object.freeze([
    Object.freeze({ id: 'constant-digits', label: 'Transposed constant digits' }),
    Object.freeze({ id: 'variable-name', label: 'Misspelled variable name' }),
    Object.freeze({ id: 'trig-function', label: 'Wrong trigonometric function' }),
    Object.freeze({ id: 'card-order', label: 'Misordered program card' }),
    Object.freeze({ id: 'output-transcription', label: 'Misread printed output' })
  ]);

  function getSupportProfile(mode) {
    return SUPPORT_PROFILES[mode] || SUPPORT_PROFILES.guided;
  }

  function getSafeguardCase(id) {
    var selected = SAFEGUARD_CASES.find(function (item) { return item.id === id; }) || SAFEGUARD_CASES[0];
    return Object.assign({}, selected);
  }

  function evaluateSafeguardPrediction(caseId, prediction) {
    var incident = getSafeguardCase(caseId);
    var normalized = SAFEGUARD_OPTIONS.some(function (item) { return item.id === prediction; }) ? prediction : '';
    var correct = normalized === incident.expected;
    return {
      caseId: incident.id,
      prediction: normalized,
      expected: incident.expected,
      correct: correct,
      pass: correct,
      message: !normalized
        ? 'Choose the safeguard you predict will catch this incident.'
        : (correct ? 'Prediction supported. ' + incident.explanation : 'Prediction revised. ' + incident.explanation)
    };
  }

  function normalizeReflection(value) {
    value = value || {};
    var errorId = REFLECTION_ERROR_OPTIONS.some(function (item) { return item.id === value.errorId; }) ? value.errorId : '';
    var safeguardId = SAFEGUARD_OPTIONS.some(function (item) { return item.id === value.safeguardId; }) ? value.safeguardId : '';
    var note = String(value.note || '').replace(/^\s+|\s+$/g, '').slice(0, 500);
    return { errorId: errorId, safeguardId: safeguardId, note: note, recorded: !!(errorId || safeguardId || note) };
  }

  function buildDeskNarration(stationLabel, brief, labels) {
    var station = String(stationLabel || '').replace(/^\s+|\s+$/g, '');
    var values = Array.isArray(brief) ? brief : [];
    var headings = Array.isArray(labels) ? labels : [];
    var parts = station ? [station + ' desk.'] : [];
    values.slice(0, 3).forEach(function (value, index) {
      var text = String(value || '').replace(/^\s+|\s+$/g, '');
      var heading = String(headings[index] || '').replace(/^\s+|\s+$/g, '');
      if (text) parts.push((heading ? heading + ': ' : '') + text + '.');
    });
    return parts.join(' ');
  }

  function normalizeConnectionNotes(value) {
    value = value || {};
    var notes = {};
    ['briefing', 'worksheet', 'program', 'cards', 'batch', 'verify'].forEach(function (station) {
      var note = String(value[station] || '').replace(/^\s+|\s+$/g, '').slice(0, 300);
      if (note) notes[station] = note;
    });
    return { notes: notes, recorded: Object.keys(notes).length, total: 6 };
  }

  var ATTEMPT_KEYS = Object.freeze(['worksheet', 'compile', 'format', 'deck', 'readback', 'verification']);

  function normalizeAttempts(value) {
    value = value || {};
    var normalized = {};
    ATTEMPT_KEYS.forEach(function (key) {
      var count = Number(value[key]);
      normalized[key] = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    });
    return normalized;
  }

  function incrementAttempt(value, key) {
    var next = normalizeAttempts(value);
    if (ATTEMPT_KEYS.indexOf(key) >= 0) next[key] += 1;
    return next;
  }

  function mergeDiagnosticCodes(history, diagnostics) {
    var codes = Array.isArray(history) ? history.filter(function (code) { return typeof code === 'string'; }) : [];
    (diagnostics || []).forEach(function (item) {
      if (item && item.code && codes.indexOf(item.code) < 0) codes.push(item.code);
    });
    return codes.slice(0, 24);
  }

  function summarizeRevisionEvidence(attemptValue, diagnosticValue) {
    var attempts = normalizeAttempts(attemptValue);
    var diagnosticCodes = mergeDiagnosticCodes(diagnosticValue, []);
    return {
      attempts: attempts,
      diagnosticCodes: diagnosticCodes,
      totalAttempts: ATTEMPT_KEYS.reduce(function (sum, key) { return sum + attempts[key]; }, 0),
      revisedStations: ATTEMPT_KEYS.filter(function (key) { return attempts[key] > 1; }).length,
      singleCheckStations: ATTEMPT_KEYS.filter(function (key) { return attempts[key] === 1; }).length
    };
  }

  function compareMissionVariant(id) {
    var mission = getMissionVariant(id);
    var result = computeTrajectory(mission);
    var baseline = computeTrajectory(MISSION);
    var changedInputs = ['speed', 'angle', 'height', 'gravity'].filter(function (key) { return mission[key] !== MISSION[key]; });
    var difference = result.range - baseline.range;
    return {
      mission: mission,
      result: result,
      changedInputs: changedInputs,
      rangeDifference: difference,
      flightTimeDifference: result.flightTime - baseline.flightTime,
      peakHeightDifference: result.peakHeight - baseline.peakHeight,
      relation: Math.abs(difference) <= 5 ? 'about' : (difference > 0 ? 'longer' : 'shorter')
    };
  }

  function getReplayComparisonProfile(id) {
    var comparison = compareMissionVariant(id);
    var inputKeys = ['speed', 'angle', 'height', 'gravity'];
    var changedInputs = comparison.changedInputs.slice();
    var type = changedInputs.length === 0 ? 'reproduction' : (changedInputs.length === 1 ? 'controlled' : 'combined');
    return {
      missionId: comparison.mission.id,
      type: type,
      expectedClaim: type === 'reproduction' ? 'reproducible' : (type === 'controlled' ? 'isolated-change' : 'combined-not-isolated'),
      changedInputs: changedInputs,
      changedInputCount: changedInputs.length,
      fixedInputs: inputKeys.filter(function (key) { return changedInputs.indexOf(key) < 0; }),
      fixedInputCount: inputKeys.length - changedInputs.length,
      totalInputs: inputKeys.length
    };
  }

  function evaluateReplayPrediction(id, prediction) {
    var comparison = compareMissionVariant(id);
    comparison.prediction = ['shorter', 'about', 'longer'].indexOf(prediction) >= 0 ? prediction : '';
    comparison.correct = !!comparison.prediction && comparison.prediction === comparison.relation;
    return comparison;
  }

  function getReplayReasoningOption(id) {
    var option = REPLAY_REASONING_OPTIONS.find(function (item) { return item.id === id; });
    return option ? Object.assign({}, option) : null;
  }

  function normalizeReplayLearning(value) {
    value = value || {};
    var initialPrediction = ['shorter', 'about', 'longer'].indexOf(value.initialPrediction) >= 0 ? value.initialPrediction : '';
    if (!initialPrediction) return null;
    var reasoningClaim = getReplayReasoningOption(value.reasoningClaim) ? value.reasoningClaim : '';
    var attempts = Number(value.reasoningAttempts);
    return {
      initialPrediction: initialPrediction,
      reasoningClaim: reasoningClaim,
      reasoningAttempts: Number.isFinite(attempts) && attempts > 0 ? Math.min(99, Math.floor(attempts)) : 0,
      reasoningChecked: value.reasoningChecked === true && !!reasoningClaim
    };
  }

  function evaluateReplayReasoning(missionId, claim, attemptCount) {
    var profile = getReplayComparisonProfile(missionId);
    var normalizedClaim = getReplayReasoningOption(claim) ? claim : '';
    var attempts = Number(attemptCount);
    attempts = Number.isFinite(attempts) && attempts > 0 ? Math.min(99, Math.floor(attempts)) : 0;
    var expectedClaim = profile.expectedClaim;
    var correct = !!normalizedClaim && normalizedClaim === expectedClaim;
    var hintTier = correct ? 0 : (attempts >= 2 ? 2 : (attempts >= 1 ? 1 : 0));
    var tierTwoHint = expectedClaim === 'reproducible'
      ? 'No launch inputs changed. This replay tests whether identical inputs reproduce the baseline result.'
      : (expectedClaim === 'isolated-change'
        ? 'Only launch speed changed; launch angle, release height, and gravity stayed fixed, so the launch speed effect can be compared.'
        : 'More than one input changed. A one-variable causal claim requires the other inputs to stay fixed.');
    var message = !normalizedClaim
      ? 'Choose the conclusion supported by the replay comparison.'
      : (correct
        ? (expectedClaim === 'combined-not-isolated'
          ? 'Comparison reasoning supported. You distinguished a combined comparison from a controlled one-variable test.'
          : (expectedClaim === 'isolated-change'
            ? 'Comparison reasoning supported. One changed input was isolated while the other inputs stayed fixed.'
            : 'Comparison reasoning supported. The unchanged inputs reproduced the baseline result.'))
        : (hintTier >= 2 ? tierTwoHint : 'Compare the input rows, not only the landing range.'));
    return {
      claim: normalizedClaim,
      expectedClaim: expectedClaim,
      correct: correct,
      pass: correct,
      changedInputs: profile.changedInputs.slice(),
      changedInputCount: profile.changedInputCount,
      hintTier: hintTier,
      message: message
    };
  }

  function getReplayLearningStatus(state) {
    state = state || {};
    var rawResult = state.replayResult || null;
    var requestedResultMissionId = rawResult && rawResult.mission && rawResult.mission.id || state.replayVariantId || MISSION.id;
    var resultMissionKnown = hasMissionVariant(requestedResultMissionId);
    var resultMissionId = resultMissionKnown ? requestedResultMissionId : '';
    var resultPrediction = rawResult && ['shorter', 'about', 'longer'].indexOf(rawResult.prediction) >= 0 ? rawResult.prediction : '';
    var comparison = rawResult && resultMissionKnown ? evaluateReplayPrediction(resultMissionId, resultPrediction) : null;
    var unavailableReplay = !!(rawResult && !resultMissionKnown);
    var learning = normalizeReplayLearning(state.replayLearning);
    var currentPrediction = ['shorter', 'about', 'longer'].indexOf(state.replayPrediction) >= 0
      ? state.replayPrediction
      : (comparison && comparison.prediction || resultPrediction);
    var hasRun = !!(comparison && comparison.prediction);
    var legacyRecorded = !!(hasRun && !learning);
    var initialPrediction = learning ? learning.initialPrediction : (comparison && comparison.prediction || resultPrediction);
    var revisionOccurred = !!(learning && hasRun && comparison.prediction !== learning.initialPrediction);
    var reasoning = learning && resultMissionKnown ? evaluateReplayReasoning(resultMissionId, learning.reasoningClaim, learning.reasoningAttempts) : null;
    if (reasoning) {
      reasoning.checked = learning.reasoningChecked;
      reasoning.correct = !!(learning.reasoningChecked && reasoning.correct);
      reasoning.pass = reasoning.correct;
    }
    var complete = !!(learning && hasRun && comparison.correct && reasoning && reasoning.correct);
    var phase;
    if (unavailableReplay) phase = 'Replay unavailable';
    else if (legacyRecorded) phase = 'Replay recorded';
    else if (complete) phase = revisionOccurred ? 'Revision supported' : 'Evidence supported';
    else if (!hasRun && learning && currentPrediction && currentPrediction !== learning.initialPrediction) phase = 'Run revised prediction';
    else if (!hasRun) phase = 'Predict then replay';
    else if (!comparison.correct) phase = 'Revise prediction';
    else if (!reasoning || !reasoning.checked) phase = 'Explain comparison';
    else phase = 'Revise reasoning';
    return {
      comparison: comparison,
      unavailableReplay: unavailableReplay,
      legacyRecorded: legacyRecorded,
      learningRecorded: !!learning,
      hasRun: hasRun,
      initialPrediction: initialPrediction,
      currentPrediction: currentPrediction,
      wrongPrediction: !!(hasRun && !comparison.correct),
      revisionOccurred: revisionOccurred,
      revisionSupported: !!(revisionOccurred && comparison.correct),
      supportedOnFirstRun: !!(learning && hasRun && comparison.correct && !revisionOccurred),
      reasoning: reasoning,
      phase: phase,
      complete: complete,
      questComplete: legacyRecorded || complete,
      progress: phase
    };
  }

  var TRIG_TABLE = Object.freeze([
    { angle: 37, sin: 0.6018, cos: 0.7986 },
    { angle: 38, sin: 0.6157, cos: 0.7880 },
    { angle: 39, sin: 0.6293, cos: 0.7771 }
  ]);

  var FORMAT_CARD = Object.freeze({
    timeFormat: 'F8.2',
    rangeFormat: 'F10.1',
    order: 'time-range'
  });

  function finiteNumber(value) {
    if (value === '' || value == null) return null;
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function round(value, places) {
    var factor = Math.pow(10, places == null ? 2 : places);
    return Math.round(value * factor) / factor;
  }

  function computeTrajectory(input) {
    var m = Object.assign({}, MISSION, input || {});
    var radians = m.angle * Math.PI / 180;
    var vx = m.speed * Math.cos(radians);
    var vy = m.speed * Math.sin(radians);
    var discriminant = (vy * vy) + (2 * m.gravity * m.height);
    var flightTime = (vy + Math.sqrt(discriminant)) / m.gravity;
    var range = vx * flightTime;
    var peakTime = vy / m.gravity;
    var peakHeight = m.height + (vy * peakTime) - (0.5 * m.gravity * peakTime * peakTime);
    return {
      radians: radians,
      vx: vx,
      vy: vy,
      flightTime: flightTime,
      range: range,
      peakTime: peakTime,
      peakHeight: peakHeight,
      inZone: range >= m.zoneMin && range <= m.zoneMax
    };
  }

  var EXPECTED = computeTrajectory(MISSION);

  function checkWorksheet(answers) {
    answers = answers || {};
    var fields = [
      { id: 'vx', label: 'horizontal velocity', expected: EXPECTED.vx, tolerance: 0.6 },
      { id: 'vy', label: 'vertical velocity', expected: EXPECTED.vy, tolerance: 0.6 },
      { id: 'flightTime', label: 'flight time', expected: EXPECTED.flightTime, tolerance: 0.12 },
      { id: 'range', label: 'downrange distance', expected: EXPECTED.range, tolerance: 12 }
    ];
    var results = {};
    var correct = 0;
    fields.forEach(function (field) {
      var actual = finiteNumber(answers[field.id]);
      var ok = actual !== null && Math.abs(actual - field.expected) <= field.tolerance;
      if (ok) correct++;
      results[field.id] = {
        ok: ok,
        label: field.label,
        actual: actual,
        expected: round(field.expected, field.id === 'range' ? 0 : 2),
        message: actual === null ? 'Enter a number.' : (ok ? 'Checks out.' : 'Recheck the formula, units, and rounding.')
      };
    });
    return { pass: correct === fields.length, correct: correct, total: fields.length, fields: results };
  }

  function checkReferenceTable(answers) {
    answers = answers || {};
    var reference = TRIG_TABLE.find(function (row) { return row.angle === MISSION.angle; });
    var fields = [
      { id: 'sin', label: 'sine reference', expected: reference.sin },
      { id: 'cos', label: 'cosine reference', expected: reference.cos }
    ];
    var results = {};
    var correct = 0;
    fields.forEach(function (field) {
      var actual = finiteNumber(answers[field.id]);
      var ok = actual !== null && Math.abs(actual - field.expected) <= 0.00025;
      if (ok) correct++;
      results[field.id] = {
        ok: ok,
        label: field.label,
        actual: actual,
        expected: field.expected,
        message: actual === null ? 'Enter the table value.' : (ok ? 'Reference recorded.' : 'Check the angle row and column heading.')
      };
    });
    return { pass: correct === fields.length, correct: correct, total: fields.length, fields: results, angle: MISSION.angle };
  }

  function computeTableApproximation(answers) {
    var tableResult = checkReferenceTable(answers);
    if (!tableResult.pass) return { pass: false, tableResult: tableResult, difference: null };
    var vx = MISSION.speed * Number(answers.cos);
    var vy = MISSION.speed * Number(answers.sin);
    var discriminant = (vy * vy) + (2 * MISSION.gravity * MISSION.height);
    var flightTime = (vy + Math.sqrt(discriminant)) / MISSION.gravity;
    var range = vx * flightTime;
    var difference = range - EXPECTED.range;
    return {
      pass: true,
      vx: vx,
      vy: vy,
      flightTime: flightTime,
      range: range,
      difference: difference,
      withinTolerance: Math.abs(difference) <= 3,
      tableResult: tableResult
    };
  }

  function checkTableApproximation(answers, prediction) {
    var result = computeTableApproximation(answers);
    if (!result.pass) return Object.assign({}, result, { prediction: prediction || '', correct: false });
    var expected = result.withinTolerance ? 'within' : 'outside';
    return Object.assign({}, result, {
      prediction: prediction || '',
      expectedPrediction: expected,
      correct: prediction === expected
    });
  }

  function checkFormatAudit(answers) {
    answers = answers || {};
    var fields = [
      { id: 'timeFormat', expected: FORMAT_CARD.timeFormat, label: 'time field width and decimals' },
      { id: 'rangeFormat', expected: FORMAT_CARD.rangeFormat, label: 'range field width and decimals' },
      { id: 'order', expected: FORMAT_CARD.order, label: 'printed record order' }
    ];
    var results = {};
    var correct = 0;
    fields.forEach(function (field) {
      var actual = String(answers[field.id] || '');
      var ok = actual === field.expected;
      if (ok) correct++;
      results[field.id] = {
        ok: ok,
        label: field.label,
        actual: actual,
        expected: field.expected,
        message: actual === '' ? 'Choose the format-card entry.' : (ok ? 'Format card matches.' : 'Recheck the width, decimals, and record order.')
      };
    });
    return { pass: correct === fields.length, correct: correct, total: fields.length, fields: results };
  }

  function leftPad(value, width) {
    var text = String(value);
    while (text.length < width) text = ' ' + text;
    return text.length > width ? text.slice(text.length - width) : text;
  }

  function buildPrintPreview(formatAudit) {
    var audit = checkFormatAudit(formatAudit);
    var timeText = leftPad(EXPECTED.flightTime.toFixed(2), 8);
    var rangeText = leftPad(EXPECTED.range.toFixed(1), 10);
    var line = ' TIME=' + timeText + ' RANGE=' + rangeText;
    var ruler = '1234567890123456789012345678901';
    return {
      pass: audit.pass && line.length === ruler.length,
      formatAudit: audit,
      ruler: ruler,
      line: line,
      fields: {
        time: { format: FORMAT_CARD.timeFormat, width: 8, text: timeText, startColumn: 7, endColumn: 14 },
        range: { format: FORMAT_CARD.rangeFormat, width: 10, text: rangeText, startColumn: 22, endColumn: 31 }
      }
    };
  }

  function checkPrintPreview(formatAudit, line) {
    var expected = buildPrintPreview(formatAudit);
    var actual = String(line || '');
    return {
      pass: expected.pass && actual === expected.line,
      expectedLine: expected.line,
      actualLine: actual,
      expectedLength: expected.line.length,
      actualLength: actual.length,
      confirmed: actual === expected.line
    };
  }

  function checkBatchReadback(answers) {
    answers = answers || {};
    var fields = [
      { id: 'compile', expected: 'zero-errors', label: 'compiler status' },
      { id: 'deck', expected: 'ordered', label: 'deck status' },
      { id: 'zone', expected: 'inside', label: 'target-zone result' },
      { id: 'range', expected: EXPECTED.range, tolerance: 0.15, label: 'printed range', numeric: true }
    ];
    var results = {};
    var correct = 0;
    fields.forEach(function (field) {
      var actual = field.numeric ? finiteNumber(answers[field.id]) : String(answers[field.id] || '');
      var ok = field.numeric
        ? actual !== null && Math.abs(actual - field.expected) <= field.tolerance
        : actual === field.expected;
      if (ok) correct++;
      results[field.id] = {
        ok: ok,
        label: field.label,
        actual: actual,
        expected: field.numeric ? round(field.expected, 1) : field.expected,
        message: field.numeric
          ? (actual === null ? 'Enter the printed range.' : (ok ? 'Range transcription matches.' : 'Recheck the printed digits and decimal position.'))
          : (actual === '' ? 'Choose the read-back entry.' : (ok ? 'Read-back matches.' : 'Read the printed job again.'))
      };
    });
    return { pass: correct === fields.length, correct: correct, total: fields.length, fields: results };
  }

  function buildCalculationLedger(answers) {
    answers = answers || {};
    var checked = checkWorksheet(answers);
    var rows = [
      { id: 'vx', step: 'Resolve horizontal velocity', expression: '215 x cos(38 deg)', units: 'm/s' },
      { id: 'vy', step: 'Resolve vertical velocity', expression: '215 x sin(38 deg)', units: 'm/s' },
      { id: 'flightTime', step: 'Solve positive flight time', expression: '[Vy + sqrt(Vy^2 + 2gY0)] / g', units: 's' },
      { id: 'range', step: 'Calculate downrange distance', expression: 'Vx x t', units: 'm' }
    ].map(function (row) {
      var result = checked.fields[row.id];
      var difference = result.actual === null ? null : result.actual - EXPECTED[row.id === 'range' ? 'range' : row.id];
      return Object.assign({}, row, {
        entered: result.actual,
        reference: result.expected,
        difference: difference,
        status: result.actual === null ? 'missing' : (result.ok ? 'checked' : 'recheck')
      });
    });
    return { pass: checked.pass, checked: checked.correct, total: checked.total, rows: rows };
  }

  function checkVerificationAssignment(workPattern, assignment) {
    assignment = assignment || {};
    var pattern = workPattern === 'solo' ? 'solo' : 'pair';
    if (pattern === 'solo') {
      return {
        pass: assignment.secondPass === true,
        pattern: pattern,
        message: assignment.secondPass === true
          ? 'Second-pass self-audit recorded.'
          : 'Complete a fresh second pass before signing.'
      };
    }
    var calculator = String(assignment.calculatorDesk || '');
    var verifier = String(assignment.verifierDesk || '');
    var pass = !!calculator && !!verifier && calculator !== verifier;
    return {
      pass: pass,
      pattern: pattern,
      calculatorDesk: calculator,
      verifierDesk: verifier,
      message: pass
        ? 'Independent desk separation recorded.'
        : 'Choose two different desk codes for calculation and verification.'
    };
  }

  function checkReproducibilityNote(answers) {
    answers = answers || {};
    var fields = [
      { id: 'speed', label: 'launch speed', expected: true },
      { id: 'angle', label: 'launch angle', expected: true },
      { id: 'height', label: 'release height', expected: true },
      { id: 'gravity', label: 'gravity constant', expected: true }
    ];
    var results = {};
    var correct = 0;
    fields.forEach(function (field) {
      var actual = answers[field.id] === true;
      var ok = actual === field.expected;
      if (ok) correct++;
      results[field.id] = {
        ok: ok,
        label: field.label,
        actual: actual,
        expected: field.expected,
        message: ok ? 'Held constant.' : 'Record this fixed input before signing.'
      };
    });
    return {
      pass: correct === fields.length,
      correct: correct,
      total: fields.length,
      fields: results,
      message: correct === fields.length
        ? 'Reproducibility note complete. The independent check can be repeated.'
        : 'Identify every mission input held constant during the machine run.'
    };
  }

  function getVerificationReadiness(state) {
    state = state || {};
    var verification = state.verification || {};
    var assignment = checkVerificationAssignment(state.workPattern, verification);
    var items = [
      { id: 'range', label: 'Independent range recorded', ready: finiteNumber(verification.range) !== null },
      { id: 'verdict', label: 'GO or HOLD selected', ready: verification.verdict === 'go' || verification.verdict === 'hold' },
      { id: 'roles', label: state.workPattern === 'solo' ? 'Fresh second pass recorded' : 'Different desk codes assigned', ready: !!assignment.pass },
      { id: 'inputs', label: 'Fixed mission inputs documented', ready: !!(state.reproducibilityResult && state.reproducibilityResult.pass) }
    ];
    var count = items.filter(function (item) { return item.ready; }).length;
    var nextItem = items.find(function (item) { return !item.ready; }) || null;
    return {
      ready: count === items.length,
      count: count,
      total: items.length,
      items: items,
      nextId: nextItem ? nextItem.id : null,
      assignment: assignment
    };
  }

  var CORRECT_PROGRAM = [
    '      PROGRAM AURORA',
    'C     AURORA TEST 3 - BALLISTIC ESTIMATE',
    '      REAL V,ANGLE,G,Y0,RAD,VX,VY,T,R',
    '      V=215.0',
    '      ANGLE=38.0',
    '      G=9.81',
    '      Y0=30.0',
    '      RAD=ANGLE*3.14159/180.0',
    '      VX=V*COS(RAD)',
    '      VY=V*SIN(RAD)',
    '      T=(VY+SQRT(VY*VY+2.0*G*Y0))/G',
    '      R=VX*T',
    '      PRINT 100,T,R',
    "  100 FORMAT(' TIME=',F8.2,' RANGE=',F10.1)",
    '      END'
  ].join('\n');

  var STARTER_PROGRAM = CORRECT_PROGRAM
    .replace('G=9.81', 'G=9.18')
    .replace('RAD=ANGLE*3.14159/180.0', 'RAD=ANGEL*3.14159/180.0')
    .replace('VY=V*SIN(RAD)', 'VY=V*COS(RAD)');

  var DIAGNOSTIC_CARDS = Object.freeze({
    E101: Object.freeze({ cardId: 'program', cardSequence: '00010001' }),
    E102: Object.freeze({ cardId: 'end', cardSequence: '00010009' }),
    D201: Object.freeze({ cardId: 'inputs', cardSequence: '00010003' }),
    D202: Object.freeze({ cardId: 'inputs', cardSequence: '00010003' }),
    D203: Object.freeze({ cardId: 'inputs', cardSequence: '00010003' }),
    D204: Object.freeze({ cardId: 'inputs', cardSequence: '00010003' }),
    N301: Object.freeze({ cardId: 'inputs', cardSequence: '00010003' }),
    M401: Object.freeze({ cardId: 'radians', cardSequence: '00010004' }),
    M402: Object.freeze({ cardId: 'components', cardSequence: '00010005' }),
    M403: Object.freeze({ cardId: 'components', cardSequence: '00010005' }),
    M404: Object.freeze({ cardId: 'time', cardSequence: '00010006' }),
    M405: Object.freeze({ cardId: 'range', cardSequence: '00010007' }),
    I501: Object.freeze({ cardId: 'print', cardSequence: '00010008' }),
    S601: Object.freeze({ cardId: 'sequence-audit', cardSequence: '00010003-00010008' })
  });

  function diagnosticWithCard(code, message) {
    return Object.assign({ code: code, message: message }, DIAGNOSTIC_CARDS[code] || { cardId: 'listing', cardSequence: 'UNASSIGNED' });
  }

  function getDiagnosticGuidance(diagnostic, mode, attemptCount) {
    var profile = getSupportProfile(mode);
    var count = Math.max(1, Number(attemptCount) || 1);
    var showHint = count >= profile.diagnosticHintAfter;
    return {
      showHint: showHint,
      cardId: diagnostic.cardId || 'listing',
      cardSequence: diagnostic.cardSequence || 'UNASSIGNED',
      message: showHint ? diagnostic.message : 'Audit the named card against the worksheet and desk references.'
    };
  }

  function compactCode(code) {
    return String(code || '')
      .split(/\r?\n/)
      .map(function (line) { return line.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '').toUpperCase(); })
      .filter(function (line) { return line && line.charAt(0) !== 'C'; });
  }

  function compileProgram(code) {
    var lines = compactCode(code);
    var joined = lines.join('\n');
    var diagnostics = [];
    function requirePattern(pattern, message, codeId) {
      if (!pattern.test(joined)) diagnostics.push(diagnosticWithCard(codeId, message));
    }
    requirePattern(/^PROGRAMAURORA$/m, 'Add the PROGRAM AURORA opening card.', 'E101');
    requirePattern(/^END$/m, 'The final executable card must say END.', 'E102');
    requirePattern(/^V=215(?:\.0+)?$/m, 'Set launch speed V to 215.0 m/s.', 'D201');
    requirePattern(/^ANGLE=38(?:\.0+)?$/m, 'Set ANGLE to 38.0 degrees.', 'D202');
    requirePattern(/^G=9\.81(?:0*)?$/m, 'Gravity is 9.81 m/s^2; check the transposed digits.', 'D203');
    requirePattern(/^Y0=30(?:\.0+)?$/m, 'Set initial height Y0 to 30.0 m.', 'D204');
    if (/ANGEL/.test(joined)) diagnostics.push(diagnosticWithCard('N301', 'ANGEL and ANGLE are different variable names. Correct the transposition.'));
    requirePattern(/^RAD=ANGLE\*3\.14159\/180(?:\.0+)?$/m, 'Convert ANGLE from degrees to radians before using SIN or COS.', 'M401');
    requirePattern(/^VX=V\*COS\(RAD\)$/m, 'Horizontal velocity uses COS(RAD).', 'M402');
    requirePattern(/^VY=V\*SIN\(RAD\)$/m, 'Vertical velocity uses SIN(RAD).', 'M403');
    requirePattern(/^T=\(VY\+SQRT\(VY\*VY\+2\.0\*G\*Y0\)\)\/G$/m, 'Use the positive-root flight-time equation shown in the desk reference.', 'M404');
    requirePattern(/^R=VX\*T$/m, 'Compute range R from horizontal velocity times flight time.', 'M405');
    requirePattern(/^PRINT100,T,R$/m, 'Print both T and R using format 100.', 'I501');

    var orderChecks = ['V=', 'ANGLE=', 'G=', 'Y0=', 'RAD=', 'VX=', 'VY=', 'T=', 'R=', 'PRINT100'];
    var lastIndex = -1;
    orderChecks.forEach(function (prefix) {
      var index = lines.findIndex(function (line) { return line.indexOf(prefix) === 0; });
      if (index >= 0 && index < lastIndex) diagnostics.push(diagnosticWithCard('S601', 'A value is used before it is calculated. Recheck statement order.'));
      if (index >= 0) lastIndex = index;
    });
    var unique = [];
    diagnostics.forEach(function (item) {
      if (!unique.some(function (prior) { return prior.code === item.code && prior.message === item.message; })) unique.push(item);
    });
    return { pass: unique.length === 0, diagnostics: unique, normalizedLines: lines };
  }

  function getDiagnosticSelection(source, diagnostic) {
    var text = String(source || '');
    var code = String(diagnostic && diagnostic.code || '');
    var matchers = {
      E101: { label: 'PROGRAM AURORA', test: function (line) { return line === 'PROGRAMAURORA'; } },
      E102: { label: 'END', test: function (line) { return line === 'END'; } },
      D201: { label: 'V=215.0', test: function (line) { return line.indexOf('V=') === 0; } },
      D202: { label: 'ANGLE=38.0', test: function (line) { return line.indexOf('ANGLE=') === 0; } },
      D203: { label: 'G=9.81', test: function (line) { return line.indexOf('G=') === 0; } },
      D204: { label: 'Y0=30.0', test: function (line) { return line.indexOf('Y0=') === 0; } },
      N301: { label: 'RAD=ANGLE*3.14159/180.0', test: function (line) { return line.indexOf('ANGEL') >= 0 && line.indexOf('ANGLE') < 0; } },
      M401: { label: 'RAD=ANGLE*3.14159/180.0', test: function (line) { return line.indexOf('RAD=') === 0; } },
      M402: { label: 'VX=V*COS(RAD)', test: function (line) { return line.indexOf('VX=') === 0; } },
      M403: { label: 'VY=V*SIN(RAD)', test: function (line) { return line.indexOf('VY=') === 0; } },
      M404: { label: 'T=(VY+SQRT(...))/G', test: function (line) { return line.indexOf('T=') === 0; } },
      M405: { label: 'R=VX*T', test: function (line) { return line.indexOf('R=') === 0; } },
      I501: { label: 'PRINT 100,T,R', test: function (line) { return line.indexOf('PRINT100') === 0; } }
    };
    var rawLines = text.split('\n');
    var entries = [];
    var offset = 0;
    rawLines.forEach(function (rawLine, index) {
      var line = rawLine.replace(/\r$/, '');
      entries.push({
        lineNumber: index + 1,
        lineText: line.replace(/^\s+|\s+$/g, ''),
        normalized: line.replace(/^\s+|\s+$/g, '').replace(/\s+/g, '').toUpperCase(),
        start: offset,
        end: offset + line.length
      });
      offset += rawLine.length + 1;
    });
    var selected = null;
    if (code === 'S601') {
      var orderPrefixes = ['V=', 'ANGLE=', 'G=', 'Y0=', 'RAD=', 'VX=', 'VY=', 'T=', 'R=', 'PRINT100'];
      var lastEntryIndex = -1;
      orderPrefixes.some(function (prefix) {
        var entryIndex = entries.findIndex(function (entry) { return entry.normalized.indexOf(prefix) === 0; });
        if (entryIndex >= 0 && entryIndex < lastEntryIndex) {
          selected = entries[entryIndex];
          return true;
        }
        if (entryIndex >= 0) lastEntryIndex = entryIndex;
        return false;
      });
    } else if (matchers[code]) {
      selected = entries.find(function (entry) { return matchers[code].test(entry.normalized); }) || null;
    }
    return selected ? {
      found: true,
      code: code,
      lineNumber: selected.lineNumber,
      lineText: selected.lineText,
      start: selected.start,
      end: selected.end,
      expectedStatement: matchers[code] ? matchers[code].label : 'statement order'
    } : {
      found: false,
      code: code,
      lineNumber: null,
      lineText: '',
      start: 0,
      end: 0,
      expectedStatement: matchers[code] ? matchers[code].label : 'statement order'
    };
  }

  var CARD_LIBRARY = Object.freeze([
    { id: 'program', seq: '00010001', text: '      PROGRAM AURORA', kind: 'control' },
    { id: 'declarations', seq: '00010002', text: '      REAL V,ANGLE,G,Y0,RAD,VX,VY,T,R', kind: 'control' },
    { id: 'inputs', seq: '00010003', text: '      V=215.0  |  ANGLE=38.0  |  G=9.81  |  Y0=30.0', kind: 'data' },
    { id: 'radians', seq: '00010004', text: '      RAD=ANGLE*3.14159/180.0', kind: 'math' },
    { id: 'components', seq: '00010005', text: '      VX=V*COS(RAD)  |  VY=V*SIN(RAD)', kind: 'math' },
    { id: 'time', seq: '00010006', text: '      T=(VY+SQRT(VY*VY+2.0*G*Y0))/G', kind: 'math' },
    { id: 'range', seq: '00010007', text: '      R=VX*T', kind: 'math' },
    { id: 'print', seq: '00010008', text: '      PRINT 100,T,R', kind: 'output' },
    { id: 'end', seq: '00010009', text: '      END', kind: 'control' }
  ]);
  var CORRECT_DECK = CARD_LIBRARY.map(function (card) { return card.id; });
  var STARTER_DECK = ['program', 'declarations', 'inputs', 'radians', 'components', 'range', 'time', 'print', 'end'];

  function getCard(id) {
    return CARD_LIBRARY.find(function (card) { return card.id === id; });
  }

  function normalizeDeck(deck) {
    if (!Array.isArray(deck) || deck.length !== CORRECT_DECK.length) return STARTER_DECK.slice();
    var valid = deck.every(function (id, index) { return !!getCard(id) && deck.indexOf(id) === index; });
    return valid ? deck.slice() : STARTER_DECK.slice();
  }

  function validateDeck(deck) {
    var normalized = normalizeDeck(deck);
    var firstWrong = -1;
    for (var i = 0; i < CORRECT_DECK.length; i++) {
      if (normalized[i] !== CORRECT_DECK[i]) { firstWrong = i; break; }
    }
    return {
      pass: firstWrong === -1,
      firstWrong: firstWrong,
      message: firstWrong === -1
        ? 'Sequence check passed. The deck is ready for the reader.'
        : 'Sequence mismatch near cards ' + (firstWrong + 1) + ' and ' + (firstWrong + 2) + '. Follow the numbers in columns 73-80.'
    };
  }

  function moveCard(deck, index, direction) {
    var next = normalizeDeck(deck);
    var target = index + direction;
    if (index < 0 || index >= next.length || target < 0 || target >= next.length) return next;
    var temp = next[index]; next[index] = next[target]; next[target] = temp;
    return next;
  }

  function getBatchProcessTrace(runStatus, failureStage) {
    var status = runStatus === 'complete' || runStatus === 'error' ? runStatus : 'idle';
    var definitions = [
      { id: 'reader', label: 'Card reader', detail: 'Reads the nine-card deck in sequence.' },
      { id: 'compiler', label: 'Compiler', detail: 'Checks and translates the program listing.' },
      { id: 'computer', label: 'Computer', detail: 'Calculates with the recorded mission inputs.' },
      { id: 'printer', label: 'Line printer', detail: 'Returns the permanent job and output record.' }
    ];
    var failureIndex = definitions.findIndex(function (step) { return step.id === failureStage; });
    if (failureIndex < 0) failureIndex = 0;
    var steps = definitions.map(function (step, index) {
      var state = 'pending';
      var stateLabel = 'Waiting';
      if (status === 'complete') {
        state = 'complete';
        stateLabel = 'Complete';
      } else if (status === 'error') {
        state = index < failureIndex ? 'complete' : (index === failureIndex ? 'error' : 'blocked');
        stateLabel = index < failureIndex ? 'Complete' : (index === failureIndex ? 'Rejected' : 'Not started');
      } else if (index === 0) {
        state = 'ready';
        stateLabel = 'Ready';
      }
      return Object.assign({}, step, { number: index + 1, state: state, stateLabel: stateLabel });
    });
    return {
      status: status,
      completed: steps.filter(function (step) { return step.state === 'complete'; }).length,
      total: steps.length,
      consoleText: status === 'complete'
        ? 'JOB 62-AUR-03 COMPLETE / PRINTER READY'
        : (status === 'error'
          ? 'JOB 62-AUR-03 REJECTED / ' + definitions[failureIndex].label.toUpperCase()
          : 'READER READY / 9 CARDS / JOB WAITING'),
      steps: steps
    };
  }

  function prepareBatchSubmission(state, code, deck, recordedAt) {
    state = state || {};
    var when = Number.isFinite(recordedAt) ? recordedAt : Date.now();
    var programCheck = compileProgram(typeof code === 'string' ? code : STARTER_PROGRAM);
    var cardCheck = validateDeck(deck);
    var hadDownstreamEvidence = !!((state.completed || {}).batch || (state.completed || {}).verify || state.batchReadbackResult || state.verificationResult);
    var sharedPatch = {
      stage: 'batch',
      batchReadback: {},
      batchReadbackResult: null,
      verificationResult: null,
      reproducibilityResult: null
    };
    if (hadDownstreamEvidence) {
      sharedPatch.verification = {};
      sharedPatch.reproducibility = {};
    }
    if (!cardCheck.pass || !programCheck.pass) {
      var failureStage = !cardCheck.pass ? 'reader' : 'compiler';
      var failureMessage = failureStage === 'reader'
        ? 'Card reader rejected the deck. ' + cardCheck.message
        : 'Compiler rejected the listing with ' + programCheck.diagnostics.length + ' diagnostic' + (programCheck.diagnostics.length === 1 ? '' : 's') + '.';
      return invalidateForRevision(state, 'batch', Object.assign(sharedPatch, {
        runStatus: 'error',
        printout: null,
        batchFailure: { stage: failureStage, message: failureMessage }
      }), when);
    }
    var runCount = Math.max(0, Math.floor(Number(state.batchRunCount) || 0)) + 1;
    return invalidateForRevision(state, 'batch', Object.assign(sharedPatch, {
      runStatus: 'complete',
      printout: formatPrintout(EXPECTED),
      batchFailure: null,
      batchRunCount: runCount,
      batchRunId: '62-AUR-03-R' + String(runCount).padStart(2, '0'),
      batchRunAt: when
    }), when);
  }

  function formatPrintout(result) {
    result = result || EXPECTED;
    return [
      'NAL COMPUTATION SERVICE      JOB 62-AUR-03',
      '-------------------------------------------',
      'AURORA TEST 3 / BALLISTIC PATH ESTIMATE',
      'COMPILE:  0 ERRORS       DECK: 00010001-00010009',
      '',
      ' HORIZONTAL VELOCITY      ' + result.vx.toFixed(2) + ' M/S',
      ' VERTICAL VELOCITY        ' + result.vy.toFixed(2) + ' M/S',
      ' FLIGHT TIME              ' + result.flightTime.toFixed(2) + ' S',
      ' PREDICTED RANGE          ' + result.range.toFixed(1) + ' M',
      ' TARGET ZONE              ' + MISSION.zoneMin + '-' + MISSION.zoneMax + ' M',
      '',
      '*** END OF JOB ***'
    ].join('\n');
  }

  function verifyIndependentCheck(rangeValue, verdict, assignment) {
    var value = finiteNumber(rangeValue);
    var error = value === null ? null : Math.abs(value - EXPECTED.range);
    var rangePass = error !== null && error <= 15;
    var verdictPass = verdict === (EXPECTED.inZone ? 'go' : 'hold');
    var assignmentResult = assignment
      ? checkVerificationAssignment(assignment.workPattern, assignment)
      : { pass: true, pattern: 'legacy', message: 'Role check not requested.' };
    return {
      pass: rangePass && verdictPass && assignmentResult.pass,
      rangePass: rangePass,
      verdictPass: verdictPass,
      assignmentPass: assignmentResult.pass,
      assignment: assignmentResult,
      error: error,
      expectedVerdict: EXPECTED.inZone ? 'go' : 'hold'
    };
  }

  function classifyAngleStudy(angleValue) {
    var angle = finiteNumber(angleValue);
    if (angle === null) angle = MISSION.angle;
    angle = Math.max(25, Math.min(55, angle));
    var result = computeTrajectory({ angle: angle });
    var difference = result.range - EXPECTED.range;
    var relation = Math.abs(difference) <= 30 ? 'about' : (difference > 0 ? 'longer' : 'shorter');
    return {
      angle: angle,
      result: result,
      difference: difference,
      relation: relation,
      inZone: result.inZone
    };
  }

  function checkAngleExplanation(value) {
    var normalized = ['components', 'gravity', 'speed'].indexOf(value) >= 0 ? value : '';
    var correct = normalized === 'components';
    return {
      value: normalized,
      pass: correct,
      correct: correct,
      message: !normalized
        ? 'Choose the claim best supported by the controlled comparison.'
        : (correct
          ? 'Supported: changing angle redistributes the same launch speed between horizontal and vertical components.'
          : 'Recheck the controls: launch speed and gravity stayed fixed; only angle changed.')
    };
  }

  function normalizeAuditTrail(trail) {
    if (!Array.isArray(trail)) return [];
    return trail.map(function (event) {
      event = event || {};
      return {
        station: String(event.station || ''),
        nextStage: String(event.nextStage || ''),
        recordedAt: Number.isFinite(event.recordedAt) ? event.recordedAt : null
      };
    }).filter(function (event) { return !!event.station; });
  }

  var WORKFLOW_STATIONS = ['briefing', 'worksheet', 'program', 'cards', 'batch', 'verify'];
  var WORKFLOW_HANDOFFS = [
    ['briefing', 'worksheet'], ['worksheet', 'program'], ['program', 'cards'],
    ['cards', 'batch'], ['batch', 'verify'], ['verify', 'complete']
  ];

  function normalizeRevisionTrail(trail) {
    if (!Array.isArray(trail)) return [];
    return trail.map(function (event) {
      event = event || {};
      return {
        station: WORKFLOW_STATIONS.indexOf(event.station) >= 0 ? event.station : '',
        affectedStations: Array.isArray(event.affectedStations) ? event.affectedStations.filter(function (id) { return WORKFLOW_STATIONS.indexOf(id) >= 0; }) : [],
        recordedAt: Number.isFinite(event.recordedAt) ? event.recordedAt : null
      };
    }).filter(function (event) { return !!event.station; });
  }

  function recordAuditHandoff(trail, station, nextStage, recordedAt) {
    var handoffIndex = WORKFLOW_HANDOFFS.findIndex(function (handoff) { return handoff[0] === station && handoff[1] === nextStage; });
    if (handoffIndex < 0) return normalizeAuditTrail(trail);
    var canonical = normalizeAuditTrail(trail).filter(function (event) {
      var index = WORKFLOW_HANDOFFS.findIndex(function (handoff) { return handoff[0] === event.station && handoff[1] === event.nextStage; });
      return index >= 0 && index < handoffIndex;
    });
    canonical.push({ station: station, nextStage: nextStage, recordedAt: Number.isFinite(recordedAt) ? recordedAt : null });
    return canonical;
  }

  function invalidateForRevision(state, station, patch, recordedAt) {
    state = state || {};
    patch = patch || {};
    var stationIndex = WORKFLOW_STATIONS.indexOf(station);
    if (stationIndex < 0) return Object.assign({}, state, patch);
    var next = Object.assign({}, state);
    var priorCompleted = state.completed || {};
    var affectedStations = WORKFLOW_STATIONS.slice(stationIndex).filter(function (id) { return !!priorCompleted[id]; });
    var nextCompleted = Object.assign({}, priorCompleted);
    WORKFLOW_STATIONS.slice(stationIndex).forEach(function (id) { delete nextCompleted[id]; });
    next.completed = nextCompleted;
    next.auditTrail = normalizeAuditTrail(state.auditTrail).filter(function (event) {
      var index = WORKFLOW_HANDOFFS.findIndex(function (handoff) { return handoff[0] === event.station && handoff[1] === event.nextStage; });
      return index >= 0 && index < stationIndex;
    });

    var resultGroups = [
      [],
      ['tableResult', 'tableApproximationResult', 'worksheetResult'],
      ['compileResult', 'formatAuditResult', 'printPreview', 'printPreviewResult'],
      ['deckResult'],
      ['batchReadbackResult'],
      ['reproducibilityResult', 'verificationResult']
    ];
    for (var groupIndex = stationIndex; groupIndex < resultGroups.length; groupIndex++) {
      resultGroups[groupIndex].forEach(function (key) { next[key] = null; });
    }
    if (stationIndex <= 2) next.printPreviewConfirmed = false;
    if (stationIndex <= 4) {
      next.runStatus = 'idle';
      next.printout = null;
    }
    Object.keys(patch).forEach(function (key) { next[key] = patch[key]; });
    next.reportOpen = false;
    next.studyResult = null;
    next.studyExplanationResult = null;
    next.replayResult = null;
    next.replayLearning = null;
    next.safeguardResult = null;
    next.reflection = {};
    if (affectedStations.length) {
      next.revisionTrail = normalizeRevisionTrail(state.revisionTrail).concat([{
        station: station,
        affectedStations: affectedStations,
        recordedAt: Number.isFinite(recordedAt) ? recordedAt : null
      }]);
      next.revisionNotice = {
        station: station,
        affectedStations: affectedStations
      };
    }
    return next;
  }

  function createSafeguardSummary(state, assignment) {
    state = state || {};
    var trail = normalizeAuditTrail(state.auditTrail);
    var expectedTrail = WORKFLOW_HANDOFFS;
    var auditChainPass = trail.length === expectedTrail.length && expectedTrail.every(function (handoff, index) {
      return trail[index].station === handoff[0] && trail[index].nextStage === handoff[1];
    });
    var roleCheck = assignment || checkVerificationAssignment(state.workPattern, state.verification || {});
    var reproducibility = state.reproducibilityResult || {};
    var preview = state.printPreviewResult || {};
    var readback = state.batchReadbackResult || {};
    var checks = [
      {
        id: 'audit-chain',
        label: 'Ordered operator audit chain',
        pass: auditChainPass,
        detail: trail.length + ' of ' + expectedTrail.length + ' expected handoffs recorded.'
      },
      {
        id: 'role-separation',
        label: 'Independent role separation',
        pass: !!roleCheck.pass,
        detail: roleCheck.message
      },
      {
        id: 'fixed-inputs',
        label: 'Fixed mission inputs',
        pass: !!reproducibility.pass,
        detail: (reproducibility.correct || 0) + ' of ' + (reproducibility.total || 4) + ' inputs recorded.'
      },
      {
        id: 'print-preview',
        label: 'Fixed-width line-printer preview',
        pass: !!preview.pass,
        detail: preview.pass ? 'Preview confirmed.' : (preview.actualLine ? 'Preview needs review.' : 'Preview not confirmed.')
      },
      {
        id: 'machine-readback',
        label: 'Machine output read-back',
        pass: !!readback.pass,
        detail: (readback.correct || 0) + ' of ' + (readback.total || 4) + ' fields matched the printed job.'
      }
    ];
    return {
      checks: checks,
      passed: checks.filter(function (check) { return check.pass; }).length,
      total: checks.length
    };
  }

  function reconcileRangeEvidence(state) {
    state = state || {};
    var sourceValues = [
      ['worksheet', 'Hand worksheet', finiteNumber((state.worksheet || {}).range)],
      ['machine', 'Batch printout read-back', finiteNumber((state.batchReadback || {}).range)],
      ['verification', 'Verification sheet', finiteNumber((state.verification || {}).range)]
    ];
    var sources = sourceValues.map(function (source) {
      var value = source[2];
      var difference = value === null ? null : value - EXPECTED.range;
      return {
        id: source[0],
        label: source[1],
        value: value,
        differenceFromReference: difference === null ? null : round(difference, 2),
        withinReference: difference !== null && Math.abs(difference) <= 15
      };
    });
    var values = sources.filter(function (source) { return source.value !== null; }).map(function (source) { return source.value; });
    var complete = values.length === sources.length;
    var spread = complete ? Math.max.apply(Math, values) - Math.min.apply(Math, values) : null;
    return {
      complete: complete,
      pass: complete && spread <= 15,
      tolerance: 15,
      spread: spread === null ? null : round(spread, 2),
      sources: sources
    };
  }

  function createEvidenceFingerprint(state) {
    var serialized = JSON.stringify(createEvidenceRecord(state || {}, 0).data);
    var hash = 2166136261;
    for (var index = 0; index < serialized.length; index++) {
      hash ^= serialized.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return 'tc-' + ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function createEvidenceProvenance(state, snapshots) {
    state = state || {};
    var currentFingerprint = createEvidenceFingerprint(state);
    var hasSavedSnapshot;
    var savedAt;
    var savedFingerprint;
    if (Array.isArray(snapshots)) {
      var latest = null;
      var latestTime = -Infinity;
      var latestIndex = -1;
      snapshots.forEach(function (snapshot, index) {
        if (!snapshot || snapshot.tool !== TOOL_ID) return;
        var timestamp = Number.isFinite(snapshot.timestamp) ? snapshot.timestamp : -Infinity;
        if (!latest || timestamp > latestTime || (timestamp === latestTime && index > latestIndex)) {
          latest = snapshot;
          latestTime = timestamp;
          latestIndex = index;
        }
      });
      hasSavedSnapshot = !!latest;
      savedAt = latest && Number.isFinite(latest.timestamp) ? latest.timestamp : null;
      savedFingerprint = latest && /^tc-[0-9a-f]{8}$/.test(String(latest.fingerprint || '')) ? String(latest.fingerprint) : '';
    } else {
      hasSavedSnapshot = Number.isFinite(state.lastSnapshotAt);
      savedAt = hasSavedSnapshot ? state.lastSnapshotAt : null;
      savedFingerprint = /^tc-[0-9a-f]{8}$/.test(String(state.lastSnapshotFingerprint || ''))
        ? String(state.lastSnapshotFingerprint)
        : '';
    }
    return {
      currentFingerprint: currentFingerprint,
      savedFingerprint: savedFingerprint,
      savedAt: savedAt,
      status: !hasSavedSnapshot ? 'unsaved' : (savedFingerprint === currentFingerprint ? 'current' : 'outdated')
    };
  }

  function createEvidenceRecord(state, timestamp) {
    state = state || {};
    var when = Number.isFinite(timestamp) ? timestamp : Date.now();
    var completed = state.completed || {};
    var revisionEvidence = summarizeRevisionEvidence(state.attempts, state.diagnosticHistory);
    var replayEvidence = state.replayResult || null;
    if (replayEvidence && (!Array.isArray(replayEvidence.changedInputs) || !Number.isFinite(replayEvidence.rangeDifference))) {
      var recoveryMissionId = replayEvidence.mission && replayEvidence.mission.id;
      var recoveredPrediction = ['shorter', 'about', 'longer'].indexOf(replayEvidence.prediction) >= 0 ? replayEvidence.prediction : '';
      replayEvidence = hasMissionVariant(recoveryMissionId)
        ? (recoveredPrediction ? evaluateReplayPrediction(recoveryMissionId, recoveredPrediction) : compareMissionVariant(recoveryMissionId))
        : null;
    }
    var replayStatus = getReplayLearningStatus(state);
    var replayLearning = normalizeReplayLearning(state.replayLearning);
    var replayCardEvidence = replayEvidence ? {
      id: replayEvidence.mission && replayEvidence.mission.id,
      range: replayEvidence.result && replayEvidence.result.range,
      inZone: !!(replayEvidence.result && replayEvidence.result.inZone),
      relation: replayEvidence.relation || '',
      prediction: replayEvidence.prediction || '',
      predictionCorrect: !!replayEvidence.correct,
      changedInputs: Array.isArray(replayEvidence.changedInputs) ? replayEvidence.changedInputs.slice() : [],
      rangeDifference: replayEvidence.rangeDifference,
      flightTimeDifference: replayEvidence.flightTimeDifference
    } : null;
    if (replayCardEvidence && replayLearning) {
      replayCardEvidence.initialPrediction = replayLearning.initialPrediction;
      replayCardEvidence.finalPrediction = replayEvidence.prediction || '';
      replayCardEvidence.revisionOccurred = replayStatus.revisionOccurred;
      replayCardEvidence.reasoningClaim = replayLearning.reasoningChecked ? replayLearning.reasoningClaim : '';
      replayCardEvidence.reasoningCorrect = !!(replayStatus.reasoning && replayStatus.reasoning.correct);
      replayCardEvidence.reasoningAttempts = replayLearning.reasoningAttempts;
    }
    var completedStations = ['briefing', 'worksheet', 'program', 'cards', 'batch', 'verify'].filter(function (id) { return !!completed[id]; });
    return {
      id: 'trajectory-' + when,
      tool: TOOL_ID,
      label: 'Aurora Test 3 - ' + (completed.verify ? 'verified' : 'in progress'),
      data: {
        mission: Object.assign({}, MISSION),
        completedStations: completedStations,
        worksheet: Object.assign({}, state.worksheet || {}),
        referenceTable: Object.assign({}, state.tableLookup || {}),
        referenceTablePassed: !!(state.tableResult && state.tableResult.pass),
        tableApproximation: Object.assign({}, state.tableApproximationResult || {}),
        formatAudit: Object.assign({}, state.formatAudit || {}),
        formatAuditPassed: !!(state.formatAuditResult && state.formatAuditResult.pass),
        printPreview: Object.assign({}, state.printPreview || {}),
        printPreviewPassed: !!(state.printPreviewResult && state.printPreviewResult.pass),
        batchReadback: Object.assign({}, state.batchReadback || {}),
        batchReadbackPassed: !!(state.batchReadbackResult && state.batchReadbackResult.pass),
        batchRun: {
          id: String(state.batchRunId || ''),
          count: Math.max(0, Math.floor(Number(state.batchRunCount) || 0)),
          recordedAt: Number.isFinite(state.batchRunAt) ? state.batchRunAt : null
        },
        reproducibility: Object.assign({}, state.reproducibility || {}),
        reproducibilityPassed: !!(state.reproducibilityResult && state.reproducibilityResult.pass),
        auditTrail: normalizeAuditTrail(state.auditTrail),
        revisionTrail: normalizeRevisionTrail(state.revisionTrail),
        calculationLedger: buildCalculationLedger(state.worksheet || {}),
        compilePassed: !!(state.compileResult && state.compileResult.pass),
        deckPassed: !!(state.deckResult && state.deckResult.pass),
        batchCompleted: state.runStatus === 'complete',
        verificationPassed: !!(state.verificationResult && state.verificationResult.pass),
        verification: Object.assign({}, state.verification || {}),
        rangeReconciliation: reconcileRangeEvidence(state),
        workflow: {
          pattern: state.workPattern === 'solo' ? 'solo' : 'pair',
          assignmentPassed: !!(state.verificationResult && state.verificationResult.assignmentPass)
        },
        revisionEvidence: {
          attempts: revisionEvidence.attempts,
          diagnosticCodes: revisionEvidence.diagnosticCodes,
          totalAttempts: revisionEvidence.totalAttempts,
          revisedStations: revisionEvidence.revisedStations,
          singleCheckStations: revisionEvidence.singleCheckStations
        },
        replayCard: replayCardEvidence,
        angleStudy: state.studyResult ? {
          angle: state.studyResult.angle,
          relation: state.studyResult.relation,
          range: state.studyResult.result && state.studyResult.result.range,
          explanation: state.studyExplanation || '',
          explanationCorrect: !!(state.studyExplanationResult && state.studyExplanationResult.correct)
        } : null,
        safeguardChallenge: state.safeguardResult ? Object.assign({}, state.safeguardResult) : null,
        connectionNotes: normalizeConnectionNotes(state.connectionNotes),
        reflection: normalizeReflection(state.reflection)
      },
      timestamp: when
    };
  }

  function createCompletionReport(state, snapshots) {
    state = state || {};
    var ledger = buildCalculationLedger(state.worksheet || {});
    var pattern = state.workPattern === 'solo' ? 'solo' : 'pair';
    var assignment = checkVerificationAssignment(pattern, state.verification || {});
    var study = state.studyResult || null;
    var revisionEvidence = summarizeRevisionEvidence(state.attempts, state.diagnosticHistory);
    var replayEvidence = state.replayResult || null;
    if (replayEvidence && (!Array.isArray(replayEvidence.changedInputs) || !Number.isFinite(replayEvidence.rangeDifference))) {
      var recoveryMissionId = replayEvidence.mission && replayEvidence.mission.id;
      var recoveredPrediction = ['shorter', 'about', 'longer'].indexOf(replayEvidence.prediction) >= 0 ? replayEvidence.prediction : '';
      replayEvidence = hasMissionVariant(recoveryMissionId)
        ? (recoveredPrediction ? evaluateReplayPrediction(recoveryMissionId, recoveredPrediction) : compareMissionVariant(recoveryMissionId))
        : null;
    }
    var replayStatus = getReplayLearningStatus(state);
    var replayLearning = normalizeReplayLearning(state.replayLearning);
    var replayReport = replayEvidence;
    if (replayEvidence && replayLearning) {
      replayReport = Object.assign({}, replayEvidence, {
        initialPrediction: replayLearning.initialPrediction,
        finalPrediction: replayEvidence.prediction || '',
        revisionOccurred: replayStatus.revisionOccurred,
        reasoningClaim: replayLearning.reasoningChecked ? replayLearning.reasoningClaim : '',
        reasoningCorrect: !!(replayStatus.reasoning && replayStatus.reasoning.correct),
        reasoningAttempts: replayLearning.reasoningAttempts
      });
    }
    return {
      title: 'Aurora Test 3 Completion Report',
      workOrder: '62-AUR-03',
      year: MISSION.year,
      status: state.verificationResult && state.verificationResult.pass ? 'VERIFIED' : 'IN PROGRESS',
      workflow: pattern === 'solo' ? 'Solo dual-pass audit' : 'Paired independent cross-check',
      assignment: assignment,
      ledger: ledger,
      referenceTable: checkReferenceTable(state.tableLookup || {}),
      tableApproximation: state.tableApproximationResult || null,
      formatAudit: state.formatAuditResult || null,
      printPreview: state.printPreviewResult || null,
      batchReadback: state.batchReadbackResult || null,
      batchRun: {
        id: String(state.batchRunId || ''),
        count: Math.max(0, Math.floor(Number(state.batchRunCount) || 0)),
        recordedAt: Number.isFinite(state.batchRunAt) ? state.batchRunAt : null
      },
      reproducibilityNote: state.reproducibilityResult || null,
      rangeReconciliation: reconcileRangeEvidence(state),
      safeguards: createSafeguardSummary(state, assignment),
      auditTrail: normalizeAuditTrail(state.auditTrail),
      revisionTrail: normalizeRevisionTrail(state.revisionTrail),
      revisionEvidence: {
        attempts: revisionEvidence.attempts,
        diagnosticCodes: revisionEvidence.diagnosticCodes,
        totalAttempts: revisionEvidence.totalAttempts,
        revisedStations: revisionEvidence.revisedStations,
        singleCheckStations: revisionEvidence.singleCheckStations
      },
      checks: [
        { label: 'Printed trigonometry reference', pass: !!(state.tableResult && state.tableResult.pass) },
        { label: 'Table-precision control estimate', pass: !!(state.tableApproximationResult && state.tableApproximationResult.pass && state.tableApproximationResult.correct) },
        { label: 'Hand calculation reference', pass: ledger.pass },
        { label: 'FORTRAN-style listing', pass: !!(state.compileResult && state.compileResult.pass) },
        { label: 'Line-printer format card', pass: !!(state.formatAuditResult && state.formatAuditResult.pass) },
        { label: 'Line-printer preview confirmation', pass: !!(state.printPreviewResult && state.printPreviewResult.pass) },
        { label: 'Punch-card sequence', pass: !!(state.deckResult && state.deckResult.pass) },
        { label: 'Batch job', pass: state.runStatus === 'complete' },
        { label: 'Machine output read-back', pass: !!(state.batchReadbackResult && state.batchReadbackResult.pass) },
        { label: 'Reproducibility note', pass: !!(state.reproducibilityResult && state.reproducibilityResult.pass) },
        { label: 'Independent verification', pass: !!(state.verificationResult && state.verificationResult.pass) }
      ],
      output: {
        flightTime: EXPECTED.flightTime,
        range: EXPECTED.range,
        verdict: EXPECTED.inZone ? 'GO' : 'HOLD'
      },
      angleStudy: study ? {
        angle: study.angle,
        prediction: study.prediction || '',
        relation: study.relation,
        range: study.result && study.result.range,
        correct: !!study.correct,
        explanation: state.studyExplanation || '',
        explanationCorrect: !!(state.studyExplanationResult && state.studyExplanationResult.correct)
      } : null,
      replayCard: replayReport,
      safeguardChallenge: state.safeguardResult ? Object.assign({}, state.safeguardResult) : null,
      connectionNotes: normalizeConnectionNotes(state.connectionNotes),
      reflection: normalizeReflection(state.reflection),
      evidenceProvenance: createEvidenceProvenance(state, snapshots),
      modelLimit: 'Two-dimensional ballistic approximation; air resistance, wind, Earth curvature, propulsion, and orbital mechanics are not modeled.'
    };
  }

  function trajectoryQuestData(data) {
    return (data && data[STATE_KEY]) || data || {};
  }

  window.TrajectoryComputingCore = Object.freeze({
    mission: MISSION,
    missionVariants: MISSION_VARIANTS,
    replayReasoningOptions: REPLAY_REASONING_OPTIONS,
    safeguardCases: SAFEGUARD_CASES,
    safeguardOptions: SAFEGUARD_OPTIONS,
    reflectionErrorOptions: REFLECTION_ERROR_OPTIONS,
    trigTable: TRIG_TABLE,
    formatCard: FORMAT_CARD,
    expected: EXPECTED,
    correctProgram: CORRECT_PROGRAM,
    starterProgram: STARTER_PROGRAM,
    cardLibrary: CARD_LIBRARY,
    correctDeck: CORRECT_DECK.slice(),
    starterDeck: STARTER_DECK.slice(),
    computeTrajectory: computeTrajectory,
    hasMissionVariant: hasMissionVariant,
    normalizeMissionVariantId: normalizeMissionVariantId,
    getMissionVariant: getMissionVariant,
    getSupportProfile: getSupportProfile,
    getSafeguardCase: getSafeguardCase,
    evaluateSafeguardPrediction: evaluateSafeguardPrediction,
    normalizeReflection: normalizeReflection,
    buildDeskNarration: buildDeskNarration,
    normalizeConnectionNotes: normalizeConnectionNotes,
    getDiagnosticGuidance: getDiagnosticGuidance,
    normalizeAttempts: normalizeAttempts,
    incrementAttempt: incrementAttempt,
    mergeDiagnosticCodes: mergeDiagnosticCodes,
    summarizeRevisionEvidence: summarizeRevisionEvidence,
    compareMissionVariant: compareMissionVariant,
    getReplayComparisonProfile: getReplayComparisonProfile,
    evaluateReplayPrediction: evaluateReplayPrediction,
    getReplayReasoningOption: getReplayReasoningOption,
    normalizeReplayLearning: normalizeReplayLearning,
    evaluateReplayReasoning: evaluateReplayReasoning,
    getReplayLearningStatus: getReplayLearningStatus,
    trajectoryPathFor: trajectoryPathFor,
    checkReferenceTable: checkReferenceTable,
    computeTableApproximation: computeTableApproximation,
    checkTableApproximation: checkTableApproximation,
    checkFormatAudit: checkFormatAudit,
    buildPrintPreview: buildPrintPreview,
    checkPrintPreview: checkPrintPreview,
    checkBatchReadback: checkBatchReadback,
    checkWorksheet: checkWorksheet,
    buildCalculationLedger: buildCalculationLedger,
    compileProgram: compileProgram,
    getDiagnosticSelection: getDiagnosticSelection,
    normalizeDeck: normalizeDeck,
    validateDeck: validateDeck,
    moveCard: moveCard,
    getBatchProcessTrace: getBatchProcessTrace,
    prepareBatchSubmission: prepareBatchSubmission,
    formatPrintout: formatPrintout,
    verifyIndependentCheck: verifyIndependentCheck,
    checkVerificationAssignment: checkVerificationAssignment,
    checkReproducibilityNote: checkReproducibilityNote,
    getVerificationReadiness: getVerificationReadiness,
    reconcileRangeEvidence: reconcileRangeEvidence,
    classifyAngleStudy: classifyAngleStudy,
    checkAngleExplanation: checkAngleExplanation,
    normalizeRevisionTrail: normalizeRevisionTrail,
    recordAuditHandoff: recordAuditHandoff,
    invalidateForRevision: invalidateForRevision,
    createEvidenceRecord: createEvidenceRecord,
    createEvidenceFingerprint: createEvidenceFingerprint,
    createEvidenceProvenance: createEvidenceProvenance,
    createCompletionReport: createCompletionReport
  });

  if (typeof document !== 'undefined' && !document.getElementById('trajectory-computing-styles')) {
    var style = document.createElement('style');
    style.id = 'trajectory-computing-styles';
    style.textContent = [
      '[data-trajectory-lab]{--tc-ink:#15241f;--tc-paper:#f5efd9;--tc-paper2:#e8dfbe;--tc-green:#173c32;--tc-mint:#9ad7c0;--tc-orange:#a64220;--tc-line:#b9ad82;color:var(--tc-ink);background:#d8d0b3;font-family:Inter,system-ui,sans-serif}',
      '[data-trajectory-lab] *{box-sizing:border-box}',
      '[data-trajectory-lab] .tc-shell{min-height:100%;background:linear-gradient(135deg,#173c32 0,#173c32 29%,#d8d0b3 29%,#f5efd9 100%);padding:clamp(12px,2.4vw,28px)}',
      '[data-trajectory-lab] .tc-skip-link{position:absolute;left:-10000px;top:8px;z-index:1000;background:#fffdf4;color:#173c32;border:3px solid #173c32;border-radius:7px;padding:9px 12px;font-weight:800;transform:translateY(-200%)}[data-trajectory-lab] .tc-skip-link:focus{left:8px;transform:translateY(0)}',
      '[data-trajectory-lab] .tc-visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
      '[data-trajectory-lab] .tc-top{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;color:#fff;margin-bottom:18px}',
      '[data-trajectory-lab] .tc-kicker{font:700 11px/1.2 ui-monospace,monospace;letter-spacing:.18em;text-transform:uppercase;color:#9ad7c0}',
      '[data-trajectory-lab] .tc-title{font:800 clamp(25px,4vw,42px)/1.05 Georgia,serif;margin:5px 0}',
      '[data-trajectory-lab] .tc-subtitle{display:inline-block;max-width:760px;color:#f4fbf7;background:rgba(23,60,50,.92);padding:6px 10px;border-radius:7px;box-shadow:0 2px 0 rgba(10,33,27,.35);font-size:14px}',
      '[data-trajectory-lab] .tc-progress{max-width:480px;margin-top:12px;color:#e9f7f1}',
      '[data-trajectory-lab] .tc-progress-head{display:flex;justify-content:space-between;gap:12px;align-items:center;font:700 12px/1.3 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-progress-head strong{color:#fff0b5}',
      '[data-trajectory-lab] .tc-progress-track{height:10px;margin-top:6px;border:1px solid #9ad7c0;border-radius:99px;background:#102d27;overflow:hidden}',
      '[data-trajectory-lab] .tc-progress-fill{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#9ad7c0,#ffbf47);transition:width .25s ease}',
      '[data-trajectory-lab] .tc-progress-route{margin:6px 0 0;color:#dcebe5;font-size:11px;line-height:1.35}',
      '[data-trajectory-lab] button,[data-trajectory-lab] input,[data-trajectory-lab] select,[data-trajectory-lab] textarea{font:inherit}',
      '[data-trajectory-lab] button:focus-visible,[data-trajectory-lab] input:focus-visible,[data-trajectory-lab] select:focus-visible,[data-trajectory-lab] textarea:focus-visible,[data-trajectory-lab] summary:focus-visible,[data-trajectory-lab] a:focus-visible,[data-trajectory-lab] .tc-chart-frame:focus-visible,[data-trajectory-lab] .tc-heading:focus-visible,[data-trajectory-lab] .tc-replay-summary:focus-visible,[data-trajectory-lab] .tc-replay-table-wrap:focus-visible{outline:3px solid #fff;outline-offset:3px;box-shadow:0 0 0 6px #173c32}',
      '[data-trajectory-lab] .tc-back,[data-trajectory-lab] .tc-action,[data-trajectory-lab] .tc-small{border:0;border-radius:9px;font-weight:800;cursor:pointer}',
      '[data-trajectory-lab] .tc-back{min-height:44px;background:#f5efd9;color:#173c32;padding:9px 13px;white-space:nowrap}',
      '[data-trajectory-lab] .tc-action{min-height:44px;background:#a64220;color:#fff;padding:11px 16px;box-shadow:0 3px 0 #7b2f18}',
      '[data-trajectory-lab] .tc-action.secondary{background:#173c32;box-shadow:0 3px 0 #0b211b}',
      '[data-trajectory-lab] .tc-action:disabled,[data-trajectory-lab] .tc-small:disabled{opacity:.46;cursor:not-allowed;box-shadow:none}',
      '[data-trajectory-lab] .tc-tabs{display:grid;grid-template-columns:repeat(6,minmax(122px,1fr));gap:18px;overflow-x:auto;padding:4px 7px 12px;scroll-snap-type:x proximity}',
      '[data-trajectory-lab] .tc-tab{position:relative;min-height:62px;border:1px solid #8e8568;border-radius:8px;background:#ebe4ca;color:#26372f;padding:8px;text-align:left;font-weight:800;cursor:pointer;scroll-snap-align:start}',
      '[data-trajectory-lab] .tc-tab:not(:last-child):after{content:"\u2192";position:absolute;z-index:2;right:-16px;top:21px;color:#173c32;font:900 17px/1 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-tab[aria-selected=true]{background:#a64220;color:#fff;border-color:#7b2f18}',
      '[data-trajectory-lab] .tc-tab:disabled{opacity:.68;background:#d7d1b8;color:#4d5b54;border-style:dashed;cursor:not-allowed}',
      '[data-trajectory-lab] .tc-tab.is-complete{border-color:#17633f;background:#e0f2e9;color:#143d2c}',
      '[data-trajectory-lab] .tc-tab.is-complete[aria-selected=true]{background:#17633f;color:#fff}',
      '[data-trajectory-lab] .tc-tab-icon{display:inline-grid;place-items:center;width:25px;height:25px;margin-right:6px;border:1px solid currentColor;border-radius:50%;font:900 11px/1 ui-monospace,monospace;vertical-align:middle}',
      '[data-trajectory-lab] .tc-tab-num{display:inline;font:700 10px/1 ui-monospace,monospace;opacity:1}',
      '[data-trajectory-lab] .tc-tab-label{display:block;margin-top:5px}',
      '[data-trajectory-lab] .tc-tabs-mobile-hint{display:none;margin:0 7px 8px;color:#173c32;font-size:12px;font-weight:800}',
      '[data-trajectory-lab] .tc-desk-brief{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;margin:0 4px 7px;border-radius:10px;overflow:hidden;background:#806f45}',
      '[data-trajectory-lab] .tc-desk-brief div{min-width:0;background:#173c32;color:#eef8f2;padding:10px 12px}',
      '[data-trajectory-lab] .tc-desk-brief dt{color:#9ad7c0;font:800 10px/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase}',
      '[data-trajectory-lab] .tc-desk-brief dd{margin:4px 0 0;font-size:12px;line-height:1.4;font-weight:700}',
      '[data-trajectory-lab] .tc-desk-audio-row{display:flex;justify-content:flex-end;margin:0 4px 14px}',
      '[data-trajectory-lab] .tc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(245px,310px);gap:16px;align-items:start}',
      '[data-trajectory-lab] .tc-paper,[data-trajectory-lab] .tc-side{background:var(--tc-paper);border:1px solid #a99e79;border-radius:12px;box-shadow:0 9px 26px rgba(22,38,32,.2)}',
      '[data-trajectory-lab] .tc-paper{padding:clamp(17px,3vw,30px);min-width:0;min-height:520px;background-image:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(89,112,101,.09) 28px)}',
      '[data-trajectory-lab] .tc-side{padding:16px;position:sticky;top:12px}',
      '[data-trajectory-lab] .tc-heading{font:800 clamp(21px,3vw,30px)/1.1 Georgia,serif;color:#173c32;margin:0 0 8px}',
      '[data-trajectory-lab] .tc-lede{font-size:14px;line-height:1.6;max-width:74ch}',
      '[data-trajectory-lab] .tc-note{border-left:5px solid #a64220;background:#fff9e7;padding:12px 14px;margin:14px 0;font-size:13px;line-height:1.5}',
      '[data-trajectory-lab] .tc-orientation{border:2px solid #2d6653;border-radius:10px;background:#e0f2e9;padding:15px;margin:16px 0}',
      '[data-trajectory-lab] .tc-orientation h3{margin:0;color:#173c32;font:800 20px/1.2 Georgia,serif}',
      '[data-trajectory-lab] .tc-orientation-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;list-style:none;counter-reset:orientation;padding:0;margin:13px 0}',
      '[data-trajectory-lab] .tc-orientation-steps li{counter-increment:orientation;border-left:4px solid #17633f;background:#fffdf4;padding:10px;font-size:12px;line-height:1.45}',
      '[data-trajectory-lab] .tc-orientation-steps li:before{content:counter(orientation);display:inline-grid;place-items:center;width:24px;height:24px;margin-right:7px;border-radius:50%;background:#173c32;color:#fff;font:900 12px/1 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-next-cue{border-left:5px solid #a64220;background:#fff9e7;border-radius:7px;padding:10px 12px;margin:12px 0;font-size:13px;line-height:1.5}',
      '[data-trajectory-lab] .tc-revision-alert{border-left:5px solid #a64220;background:#fff0e8;color:#532312;border-radius:7px;padding:11px 13px;margin:0 4px 14px;font-size:13px;line-height:1.5}',
      '[data-trajectory-lab] .tc-data{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr));gap:9px;margin:16px 0}',
      '[data-trajectory-lab] .tc-datum{background:#173c32;color:#fff;border-radius:8px;padding:12px}',
      '[data-trajectory-lab] .tc-datum b{display:block;font:800 18px/1.2 ui-monospace,monospace;color:#fff0b5}',
      '[data-trajectory-lab] .tc-datum span{font-size:11px;color:#cce3d9}',
      '[data-trajectory-lab] .tc-row{display:flex;flex-wrap:wrap;gap:9px;align-items:center;margin-top:18px}',
      '[data-trajectory-lab] .tc-formula{font:700 13px/1.5 ui-monospace,monospace;background:#16342d;color:#e9f7f1;border-radius:8px;padding:10px;overflow:auto}',
      '[data-trajectory-lab] .tc-fields{display:grid;grid-template-columns:repeat(2,minmax(190px,1fr));gap:13px;margin:16px 0}',
      '[data-trajectory-lab] .tc-field{display:block;font-weight:800;font-size:13px}',
      '[data-trajectory-lab] .tc-field input,[data-trajectory-lab] select,[data-trajectory-lab] textarea{width:100%;border:2px solid #7e866e;border-radius:8px;background:#fffdf4;color:#10231b;padding:10px;margin-top:5px}',
      '[data-trajectory-lab] input[type=checkbox],[data-trajectory-lab] input[type=radio]{width:24px;height:24px;accent-color:#173c32;vertical-align:middle;margin:0 6px 2px 0}',
      '[data-trajectory-lab] .tc-field small{display:block;font-weight:500;min-height:18px;margin-top:4px}',
      '[data-trajectory-lab] .tc-ok{color:#17633f}[data-trajectory-lab] .tc-bad{color:#9a2e24}',
      '[data-trajectory-lab] .tc-program-workspace{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(250px,.75fr);gap:14px;align-items:start}',
      '[data-trajectory-lab] .tc-code{min-height:360px;resize:vertical;font:600 13px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;tab-size:6}',
      '[data-trajectory-lab] .tc-diagnostic-desk{position:sticky;top:12px;border:2px solid #9b3e21;border-radius:10px;background:#fff8df;padding:13px}',
      '[data-trajectory-lab] .tc-diagnostic-desk h3{margin:4px 0 8px;font:800 18px/1.2 Georgia,serif;color:#173c32}',
      '[data-trajectory-lab] .tc-diagnostic-card{position:relative;margin:12px 0;padding:12px 12px 12px 24px;border:1px solid #917f49;border-radius:5px;background:#f7efc8;box-shadow:0 2px 0 #c3b787;font:700 12px/1.45 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-diagnostic-card:before{content:"";position:absolute;left:7px;top:7px;bottom:7px;width:7px;background:repeating-linear-gradient(0deg,#8b805b 0 4px,transparent 4px 10px)}',
      '[data-trajectory-lab] .tc-diagnostic-count{font:800 11px/1.4 ui-monospace,monospace;color:#675c39}',
      '[data-trajectory-lab] .tc-diag{padding:9px 11px;margin:7px 0;border-radius:7px;background:#fff0e8;border:1px solid #d99872;font-size:13px}',
      '[data-trajectory-lab] .tc-card{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) 84px 72px;gap:8px;align-items:center;background:#f7efc8;border:1px solid #9c8f61;border-radius:5px;padding:8px 9px 8px 20px;margin:7px 0;box-shadow:0 2px 0 #c3b787;font:700 12px/1.25 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-card:before{content:"";position:absolute;left:5px;top:5px;bottom:5px;width:7px;background:repeating-linear-gradient(0deg,#8b805b 0 4px,transparent 4px 10px);opacity:.65}',
      '[data-trajectory-lab] .tc-seq{font-size:10px;color:#675c39}',
      '[data-trajectory-lab] .tc-small{background:#173c32;color:#fff;min-width:31px;min-height:36px;padding:6px 8px}',
      '[data-trajectory-lab] .tc-machine{border:8px solid #355348;border-radius:14px;background:#14221e;padding:18px;color:#c9f6df;box-shadow:inset 0 0 0 2px #779184}',
      '[data-trajectory-lab] .tc-lights{display:flex;gap:9px;margin-bottom:12px}.tc-light{width:14px;height:14px;border-radius:50%;background:#55655e}.tc-light.on{background:#ffbd43;box-shadow:0 0 14px #ffbd43}',
      '[data-trajectory-lab] .tc-batch-process{margin-top:15px;padding-top:14px;border-top:1px solid #779184}',
      '[data-trajectory-lab] .tc-batch-process h3{margin:0;color:#fff0b5;font:800 19px/1.2 Georgia,serif}',
      '[data-trajectory-lab] .tc-batch-process>p{margin:5px 0 11px;color:#dcebe5;font-size:12px;line-height:1.5}',
      '[data-trajectory-lab] .tc-batch-trace{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;list-style:none;margin:0;padding:0}',
      '[data-trajectory-lab] .tc-batch-step{min-width:0;border:1px solid #779184;border-radius:7px;background:#203b33;color:#eef8f2;padding:10px}',
      '[data-trajectory-lab] .tc-batch-step.is-ready,[data-trajectory-lab] .tc-batch-step.is-complete{border-color:#9ad7c0;background:#1e493b}',
      '[data-trajectory-lab] .tc-batch-step.is-error{border-color:#ffbf47;background:#4a251a}',
      '[data-trajectory-lab] .tc-batch-step-no{display:inline-grid;place-items:center;width:25px;height:25px;margin-bottom:7px;border:1px solid currentColor;border-radius:50%;font:900 11px/1 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-batch-step strong{display:block;color:#fff;font-size:12px}',
      '[data-trajectory-lab] .tc-batch-step-detail{display:block;min-height:49px;margin-top:5px;color:#dcebe5;font-size:11px;line-height:1.45}',
      '[data-trajectory-lab] .tc-batch-step-status{display:block;margin-top:8px;color:#fff0b5;font:900 10px/1.3 ui-monospace,monospace;text-transform:uppercase}',
      '[data-trajectory-lab] .tc-printout{white-space:pre-wrap;background:#f8f1d5;color:#1a2922;border-left:16px dotted #d5c797;padding:18px;font:700 13px/1.55 ui-monospace,monospace;overflow:auto}',
      '[data-trajectory-lab] .tc-chart{display:block;width:100%;height:auto;background:#102d27;border-radius:10px;margin-top:14px}',
      '[data-trajectory-lab] .tc-chart-frame{overflow-x:auto;border-radius:10px}',
      '[data-trajectory-lab] .tc-chart-mobile-hint{display:none;margin:9px 0 0;font-size:12px;font-weight:800;color:#173c32}',
      '[data-trajectory-lab] .tc-check{border:2px solid #2d6653;background:#e0f2e9;border-radius:10px;padding:14px;margin-top:14px}',
      '[data-trajectory-lab] .tc-certificate{border:7px double #173c32;padding:22px;text-align:center;background:#fff9df;margin-top:18px}',
      '[data-trajectory-lab] .tc-reflection{max-width:760px;margin:17px auto 0;padding-top:14px;border-top:2px solid #2d6653;text-align:left}',
      '[data-trajectory-lab] .tc-reflection h4{margin:0 0 6px;color:#173c32;font:800 18px/1.2 Georgia,serif}',
      '[data-trajectory-lab] .tc-reflection textarea{min-height:96px;resize:vertical}',
      '[data-trajectory-lab] .tc-stamps{display:grid;grid-template-columns:repeat(5,minmax(105px,1fr));gap:8px;list-style:none;padding:0;margin:17px 0}',
      '[data-trajectory-lab] .tc-stamp{border:2px solid #17633f;border-radius:8px;background:#e0f2e9;color:#143d2c;padding:9px 6px;font:800 11px/1.35 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-stamp-symbol{display:block;font-size:19px;line-height:1;margin-bottom:5px}',
      '[data-trajectory-lab] .tc-extension{border:2px solid #9c8f61;border-radius:10px;background:#eee5c6;padding:16px;margin-top:18px}',
      '[data-trajectory-lab] .tc-extension h3{margin:0 0 7px;font:800 20px/1.2 Georgia,serif;color:#173c32}',
      '[data-trajectory-lab] .tc-challenge-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;margin-top:14px}',
      '[data-trajectory-lab] .tc-challenge-card{min-height:150px;border:2px solid #917f49;border-radius:10px;background:#fff9df;color:#173c32;padding:15px;text-align:left;cursor:pointer}',
      '[data-trajectory-lab] .tc-challenge-card:hover{border-color:#a64220;transform:translateY(-2px)}',
      '[data-trajectory-lab] .tc-challenge-card.is-complete{border-color:#17633f;background:#eef8f2}',
      '[data-trajectory-lab] .tc-challenge-icon{display:block;font-size:27px;line-height:1;margin-bottom:10px}',
      '[data-trajectory-lab] .tc-challenge-card strong{display:block;font:800 18px/1.2 Georgia,serif;margin-bottom:7px}',
      '[data-trajectory-lab] .tc-challenge-status{display:block;margin-bottom:7px;color:#17633f;font:900 11px/1.3 ui-monospace,monospace;text-transform:uppercase}',
      '[data-trajectory-lab] .tc-challenge-card span:last-child{display:block;font-size:12px;line-height:1.45}',
      '[data-trajectory-lab] .tc-exploration-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px;font:800 12px/1.35 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-exploration-track{height:8px;margin-top:6px;border-radius:99px;background:#c8bc96;overflow:hidden}',
      '[data-trajectory-lab] .tc-exploration-fill{display:block;height:100%;background:#17633f}',
      '[data-trajectory-lab] .tc-support-cue{border-left:5px solid #a64220;background:#fff8df;padding:10px 12px;margin:12px 0;font-size:13px;line-height:1.45}',
      '[data-trajectory-lab] .tc-revision-summary,[data-trajectory-lab] .tc-replay-note{border-left:5px solid #17633f;background:#eef8f2;padding:10px 12px;margin:12px 0;text-align:left;font-size:13px;line-height:1.5}',
      '[data-trajectory-lab] .tc-replay-card-brief{margin:14px 0;padding:13px;border:2px solid #917f49;border-radius:9px;background:#fff8df}',
      '[data-trajectory-lab] .tc-replay-card-brief>p{margin:0 0 9px}',
      '[data-trajectory-lab] .tc-replay-input-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(125px,1fr));gap:8px;margin:0}',
      '[data-trajectory-lab] .tc-replay-input-grid div{min-width:0;border:1px solid #8f8461;border-left-width:5px;border-radius:7px;background:#fffdf4;padding:9px}',
      '[data-trajectory-lab] .tc-replay-input-grid div.is-changed{border-left-color:#a64220;background:#fff0e8}',
      '[data-trajectory-lab] .tc-replay-input-grid div.is-fixed{border-left-color:#17633f;background:#eef8f2}',
      '[data-trajectory-lab] .tc-replay-input-grid dt{font-size:11px;font-weight:900}',
      '[data-trajectory-lab] .tc-replay-input-grid dd{margin:3px 0;font:800 15px/1.25 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-replay-input-state{display:block;font-size:11px;font-weight:800}',
      '[data-trajectory-lab] .tc-replay-evidence{margin:15px 0;padding:13px 0;border-top:2px solid #2d6653;border-bottom:2px solid #2d6653}',
      '[data-trajectory-lab] .tc-replay-evidence h5{margin:0 0 9px;color:#173c32;font:800 17px/1.2 Georgia,serif}',
      '[data-trajectory-lab] .tc-replay-evidence-key{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;list-style:none;margin:0;padding:0}',
      '[data-trajectory-lab] .tc-replay-evidence-key li{min-width:0;border:1px solid #91845d;border-radius:7px;background:#fffdf4;padding:9px;font-size:11px;line-height:1.4}',
      '[data-trajectory-lab] .tc-replay-evidence-key li.is-current{border:3px solid #a64220;background:#fff0e8;padding:7px}',
      '[data-trajectory-lab] .tc-replay-evidence-key strong,[data-trajectory-lab] .tc-replay-evidence-key span{display:block}',
      '[data-trajectory-lab] .tc-replay-current{margin-top:6px;color:#712812;font:900 10px/1.3 ui-monospace,monospace;text-transform:uppercase}',
      '[data-trajectory-lab] .tc-history-checkpoint{margin-top:14px;border:2px solid #917f49;border-radius:9px;background:#fff8df;padding:12px;font-size:12px;line-height:1.5}',
      '[data-trajectory-lab] .tc-history-checkpoint h4{margin:0 0 6px;font:800 16px/1.2 Georgia,serif;color:#173c32}',
      '[data-trajectory-lab] .tc-history-checkpoint p{margin:6px 0}',
      '[data-trajectory-lab] .tc-history-checkpoint textarea{min-height:84px;resize:vertical}',
      '[data-trajectory-lab] .tc-source-link{display:inline-flex;align-items:center;min-height:24px}',
      '[data-trajectory-lab] .tc-connection-list{margin:8px 0 14px}',
      '[data-trajectory-lab] .tc-connection-list dt{font-weight:900;color:#173c32;margin-top:8px}',
      '[data-trajectory-lab] .tc-connection-list dd{margin:2px 0 0;padding-left:12px;border-left:3px solid #2d6653}',
      '[data-trajectory-lab] .tc-chart-legend{display:flex;flex-wrap:wrap;gap:8px 18px;list-style:none;padding:0;margin:9px 0;font-size:12px}',
      '[data-trajectory-lab] .tc-legend-line{display:inline-block;width:34px;border-top:4px solid #6b3f16;margin-right:7px;vertical-align:middle}',
      '[data-trajectory-lab] .tc-legend-line.compare{border-top-color:#17633f;border-top-style:dashed}',
      '[data-trajectory-lab] .tc-rubric{width:100%;border-collapse:collapse;margin-top:8px;font-size:11px}',
      '[data-trajectory-lab] .tc-rubric th,[data-trajectory-lab] .tc-rubric td{border:1px solid #91845d;padding:6px;text-align:left;vertical-align:top}',
      '[data-trajectory-lab] .tc-rubric caption{text-align:left;font-weight:900;padding:7px 0}',
      '[data-trajectory-lab] .tc-replay-table-wrap{overflow-x:auto;margin-top:14px;border:1px solid #91845d;border-radius:8px;background:#fffdf4}',
      '[data-trajectory-lab] .tc-replay-table{width:100%;min-width:620px;border-collapse:collapse;font-size:12px}',
      '[data-trajectory-lab] .tc-replay-table caption{text-align:left;font-weight:900;padding:10px}',
      '[data-trajectory-lab] .tc-replay-table th,[data-trajectory-lab] .tc-replay-table td{border-top:1px solid #c8bc96;padding:8px;text-align:left;white-space:nowrap}',
      '[data-trajectory-lab] .tc-replay-table thead th{background:#173c32;color:#fff}',
      '[data-trajectory-lab] .tc-reference-table{border:2px solid #9c8f61;border-radius:10px;background:#eee5c6;padding:16px;margin:16px 0}',
      '[data-trajectory-lab] .tc-reference-table h3{margin:0 0 7px;font:800 20px/1.2 Georgia,serif;color:#173c32}',
      '[data-trajectory-lab] .tc-reference-target th,[data-trajectory-lab] .tc-reference-target td{background:#fff0b5}',
      '[data-trajectory-lab] .tc-control-box{border:1px dashed #9c8f61;border-radius:9px;background:#fff9df;padding:13px;margin-top:14px}',
      '[data-trajectory-lab] .tc-readback-box{border:2px solid #9c8f61;border-radius:10px;background:#fff9df;padding:15px;margin:15px 0}',
      '[data-trajectory-lab] .tc-readback-box h3{margin:0 0 7px;font:800 20px/1.2 Georgia,serif;color:#173c32}',
      '[data-trajectory-lab] .tc-format-box{border:2px solid #9c8f61;border-radius:10px;background:#e8dfbe;padding:15px;margin:15px 0}',
      '[data-trajectory-lab] .tc-format-box h3{margin:0 0 7px;font:800 20px/1.2 Georgia,serif;color:#173c32}',
      '[data-trajectory-lab] .tc-preview-box{border:2px solid #2d6653;border-radius:10px;background:#e0f2e9;padding:15px;margin:15px 0}',
      '[data-trajectory-lab] .tc-preview-box h3{margin:0 0 7px;font:800 20px/1.2 Georgia,serif;color:#173c32}',
      '[data-trajectory-lab] .tc-print-preview{margin:12px 0;border:1px solid #173c32;border-radius:7px;background:#14221e;color:#fff0b5;padding:12px;overflow-x:auto;font:700 13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre}',
      '[data-trajectory-lab] .tc-print-preview code{display:block;min-width:max-content}',
      '[data-trajectory-lab] .tc-study-grid{display:grid;grid-template-columns:minmax(145px,.65fr) minmax(220px,1.35fr);gap:13px;align-items:start;margin-top:12px}',
      '[data-trajectory-lab] .tc-result-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}',
      '[data-trajectory-lab] .tc-result-grid div{background:#173c32;color:#fff;border-radius:7px;padding:10px;font-size:11px}',
      '[data-trajectory-lab] .tc-result-grid b{display:block;color:#fff0b5;font:800 16px ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-ledger-wrap{overflow-x:auto;margin:15px 0;border:1px solid #9c8f61;border-radius:9px;background:#fffdf4}',
      '[data-trajectory-lab] .tc-ledger{width:100%;border-collapse:collapse;font-size:12px}',
      '[data-trajectory-lab] .tc-ledger th,[data-trajectory-lab] .tc-ledger td{padding:9px;border-bottom:1px solid #d4caa7;text-align:left;vertical-align:top}',
      '[data-trajectory-lab] .tc-ledger th{background:#173c32;color:#fff;font-size:11px;letter-spacing:.04em}',
      '[data-trajectory-lab] .tc-ledger tr:last-child td{border-bottom:0}[data-trajectory-lab] .tc-ledger code{white-space:nowrap;font-size:11px}',
      '[data-trajectory-lab] .tc-reconciliation{margin:16px 0;padding:13px 0;border-top:2px solid #2d6653;border-bottom:2px solid #2d6653}',
      '[data-trajectory-lab] .tc-reconciliation h3{margin:0 0 6px;color:#173c32;font:800 20px/1.2 Georgia,serif}',
      '[data-trajectory-lab] .tc-reconciliation-status{margin:10px 0;padding-left:12px;border-left:5px solid #17633f;font-weight:800;line-height:1.5}',
      '[data-trajectory-lab] .tc-reconciliation-status.tc-bad{border-left-color:#a64220}',
      '[data-trajectory-lab] .tc-role-box{border:1px solid #9c8f61;border-radius:9px;background:#eee5c6;padding:14px;margin:14px 0}',
      '[data-trajectory-lab] .tc-repro-box{border:2px dashed #2d6653;border-radius:9px;background:#e0f2e9;padding:14px;margin:14px 0}',
      '[data-trajectory-lab] .tc-role-grid{display:grid;grid-template-columns:repeat(2,minmax(160px,1fr));gap:12px;margin-top:10px}',
      '[data-trajectory-lab] .tc-signing-gate{margin:16px 0;padding-top:13px;border-top:2px solid #2d6653}',
      '[data-trajectory-lab] .tc-signing-gate h3{margin:0 0 6px;color:#173c32;font:800 20px/1.2 Georgia,serif}',
      '[data-trajectory-lab] .tc-signing-list{list-style:none;padding:0;margin:10px 0;display:grid;grid-template-columns:repeat(2,minmax(190px,1fr));gap:7px}',
      '[data-trajectory-lab] .tc-signing-list li{display:grid;grid-template-columns:22px 1fr;gap:6px;padding:7px 0;border-bottom:1px solid #c8bc96;font-size:12px;font-weight:800}',
      '[data-trajectory-lab] .tc-signing-list .is-ready{color:#17633f}',
      '[data-trajectory-lab] .tc-signing-status{margin:8px 0;line-height:1.5;font-weight:800}',
      '[data-trajectory-lab] .tc-report{margin-top:18px;border:3px solid #173c32;background:#fffdf4;padding:clamp(15px,3vw,24px);text-align:left}',
      '[data-trajectory-lab] .tc-audit-log{border:1px solid #9c8f61;border-radius:8px;background:#f5efd9;padding:12px;margin:14px 0}',
      '[data-trajectory-lab] .tc-audit-log h4{margin:0 0 7px;color:#173c32}',
      '[data-trajectory-lab] .tc-audit-log ol{margin:0;padding-left:25px;font:700 12px/1.6 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-audit-log li::marker{color:#9b3e21;font-weight:900}',
      '[data-trajectory-lab] .tc-report-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;border-bottom:2px solid #173c32;padding-bottom:10px}',
      '[data-trajectory-lab] .tc-report-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:14px 0}',
      '[data-trajectory-lab] .tc-report-card{border:1px solid #9c8f61;background:#f5efd9;padding:10px;border-radius:7px;font-size:12px}',
      '[data-trajectory-lab] .tc-report-card b{display:block;font:900 15px ui-monospace,monospace;color:#173c32}',
      '[data-trajectory-lab] .tc-checklist{list-style:none;padding:0;margin:10px 0;display:grid;grid-template-columns:repeat(2,minmax(190px,1fr));gap:7px}',
      '[data-trajectory-lab] .tc-checklist li{border:1px solid #b9ad82;border-radius:6px;padding:8px;background:#f5efd9;font-size:12px;font-weight:700}',
      '[data-trajectory-lab] .tc-side h3{font:800 17px/1.2 Georgia,serif;margin:0 0 9px}',
      '[data-trajectory-lab] .tc-side dl{display:grid;grid-template-columns:1fr auto;gap:7px;font-size:12px;margin:0}.tc-side dt{color:#4d5b54}.tc-side dd{margin:0;font:800 12px ui-monospace,monospace}',
      '[data-trajectory-lab] details{margin-top:14px;border-top:1px solid #bcb18d;padding-top:11px}.tc-side summary{display:flex;align-items:center;min-height:24px;font-weight:800;cursor:pointer}',
      '[data-trajectory-lab] .tc-sources{font-size:12px;line-height:1.55}.tc-sources a{color:#0e5a75;font-weight:800}',
      '[data-trajectory-lab] .tc-glossary{display:grid;grid-template-columns:auto 1fr;gap:6px 9px;font-size:12px;line-height:1.5}.tc-glossary dt{font-weight:900;color:#173c32}.tc-glossary dd{margin:0}',
      '[data-trajectory-lab] .tc-teacher-list{padding-left:18px;font-size:12px;line-height:1.55}',
      '[data-trajectory-lab] .tc-distraction-toggle{display:block;margin-top:13px;padding:10px;border:1px solid #9c8f61;border-radius:8px;background:#fff9df;font-size:12px;font-weight:800;line-height:1.45}',
      '[data-trajectory-lab] .tc-evidence-file{margin-top:13px;border:1px solid #9c8f61;border-radius:8px;background:#fff9df;padding:10px}',
      '[data-trajectory-lab] .tc-evidence-file summary{min-height:44px;padding:0;border:0;font-size:13px}',
      '[data-trajectory-lab] .tc-evidence-list{list-style:none;padding:0;margin:8px 0 0;font-size:12px;line-height:1.4}',
      '[data-trajectory-lab] .tc-evidence-list li{display:grid;grid-template-columns:20px 1fr;gap:6px;padding:6px 0;border-top:1px solid #d4caa7}',
      '[data-trajectory-lab] .tc-evidence-list .is-recorded{color:#17633f;font-weight:800}',
      '[data-trajectory-lab][data-low-distraction=true] .tc-shell{background:#f2f0e7}',
      '[data-trajectory-lab][data-low-distraction=true] .tc-paper,[data-trajectory-lab][data-low-distraction=true] .tc-side{background:#fffdf6;background-image:none;box-shadow:none}',
      '[data-trajectory-lab][data-low-distraction=true] .tc-paper{font-size:105%}',
      '[data-trajectory-lab][data-low-distraction=true] .tc-title,[data-trajectory-lab][data-low-distraction=true] .tc-subtitle{background:#173c32;color:#fff}',
      '@media(max-width:900px){[data-trajectory-lab] .tc-grid,[data-trajectory-lab] .tc-program-workspace{grid-template-columns:minmax(0,1fr)}[data-trajectory-lab] .tc-side,[data-trajectory-lab] .tc-diagnostic-desk{position:static}[data-trajectory-lab] .tc-data,[data-trajectory-lab] .tc-batch-trace{grid-template-columns:repeat(2,1fr)}}',
      '@media(max-width:560px){[data-trajectory-lab] .tc-top{flex-direction:column}[data-trajectory-lab] .tc-fields,[data-trajectory-lab] .tc-study-grid,[data-trajectory-lab] .tc-role-grid,[data-trajectory-lab] .tc-report-grid,[data-trajectory-lab] .tc-checklist,[data-trajectory-lab] .tc-signing-list,[data-trajectory-lab] .tc-challenge-grid,[data-trajectory-lab] .tc-stamps,[data-trajectory-lab] .tc-desk-brief,[data-trajectory-lab] .tc-orientation-steps,[data-trajectory-lab] .tc-batch-trace,[data-trajectory-lab] .tc-replay-evidence-key{grid-template-columns:1fr}[data-trajectory-lab] .tc-card{grid-template-columns:32px minmax(0,1fr) 66px}[data-trajectory-lab] .tc-card-actions{grid-column:2/4}[data-trajectory-lab] .tc-data{grid-template-columns:1fr 1fr}[data-trajectory-lab] .tc-result-grid{grid-template-columns:1fr}[data-trajectory-lab] .tc-report-head{display:block}[data-trajectory-lab] .tc-tabs-mobile-hint,[data-trajectory-lab] .tc-chart-mobile-hint{display:block}[data-trajectory-lab] .tc-chart-frame .tc-chart{min-width:620px}[data-trajectory-lab] .tc-batch-step-detail{min-height:0}}',
      '@media(prefers-reduced-motion:reduce){[data-trajectory-lab] *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}',
      '@media(forced-colors:active){[data-trajectory-lab] .tc-paper,[data-trajectory-lab] .tc-side,[data-trajectory-lab] .tc-machine{border:2px solid CanvasText}[data-trajectory-lab] .tc-action,[data-trajectory-lab] .tc-tab{forced-color-adjust:auto}[data-trajectory-lab] .tc-replay-evidence-key li.is-current{outline:3px solid Highlight;outline-offset:2px}}',
      '@media print{[data-trajectory-lab] .tc-top,[data-trajectory-lab] .tc-tabs-region,[data-trajectory-lab] .tc-desk-brief-block,[data-trajectory-lab] .tc-revision-alert,[data-trajectory-lab] .tc-side,[data-trajectory-lab] .tc-paper>section>*:not(.tc-completion-surfaces),[data-trajectory-lab] .tc-completion-surfaces>*:not(.tc-report){display:none!important}[data-trajectory-lab] .tc-shell{background:#fff;padding:0}[data-trajectory-lab] .tc-grid{display:block}[data-trajectory-lab] .tc-paper{border:0;box-shadow:none;background:#fff;padding:0;min-height:0}[data-trajectory-lab] .tc-completion-surfaces,[data-trajectory-lab] .tc-report{display:block!important}[data-trajectory-lab] .tc-report{border:1px solid #000;margin:0}[data-trajectory-lab] .tc-report .tc-action{display:none!important}}'
    ].join('');
    document.head.appendChild(style);
  }

  function safeStage(value) {
    var ids = ['briefing', 'worksheet', 'program', 'cards', 'batch', 'verify'];
    return ids.indexOf(value) >= 0 ? value : 'briefing';
  }

  function stageCompletionIndex(completed) {
    var order = ['briefing', 'worksheet', 'program', 'cards', 'batch'];
    var unlocked = 0;
    for (var i = 0; i < order.length; i++) {
      if (completed && completed[order[i]]) unlocked = i + 1;
      else break;
    }
    return unlocked;
  }

  function trajectoryPathFor(mission, result, scale) {
    var width = 680, height = 245, left = 34, bottom = 212;
    mission = Object.assign({}, MISSION, mission || {});
    result = result || computeTrajectory(mission);
    scale = scale || {};
    var maxRange = Math.max(1, Number(scale.maxRange) || result.range * 1.06);
    var maxPeak = Math.max(1, Number(scale.maxPeak) || result.peakHeight * 1.14);
    var points = [];
    for (var i = 0; i <= 32; i++) {
      var time = result.flightTime * i / 32;
      var x = result.vx * time;
      var y = mission.height + result.vy * time - 0.5 * mission.gravity * time * time;
      var px = left + (x / maxRange) * (width - left - 22);
      var py = bottom - (Math.max(0, y) / maxPeak) * (bottom - 22);
      points.push(round(px, 1) + ',' + round(py, 1));
    }
    return points.join(' ');
  }

  function trajectoryPath() {
    return trajectoryPathFor(MISSION, EXPECTED, { maxRange: 4900, maxPeak: EXPECTED.peakHeight * 1.14 });
  }

  window.StemLab.registerTool('trajectoryComputing', {
    icon: '\uD83D\uDDA5\uFE0F',
    label: 'Trajectory Computing Lab',
    desc: 'Recreate the human-computing workflow: calculate a flight path, debug FORTRAN-style code, sequence punch cards, run a batch job, and independently verify the result.',
    color: 'emerald',
    category: 'coding',
    gradeRange: '7-12',
    aliases: ['human computers', 'fortran', 'punch cards', 'trajectory', 'coding history', 'women in STEM'],
    questHooks: [
      {
        id: 'human_reference', label: 'Complete the independent hand calculation', icon: '\u270F\uFE0F',
        check: function (data) { return !!((trajectoryQuestData(data).completed || {}).worksheet); },
        progress: function (data) { return ((trajectoryQuestData(data).completed || {}).worksheet) ? 'Checked' : '4 calculations'; }
      },
      {
        id: 'reference_table', label: 'Record the printed trigonometry reference', icon: '\uD83D\uDCD0',
        check: function (data) { return !!((trajectoryQuestData(data).tableResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).tableResult || {}).pass) ? '38 deg row recorded' : 'Read the table'; }
      },
      {
        id: 'rounding_control', label: 'Check the table-precision control estimate', icon: '\u2248',
        check: function (data) { return !!((trajectoryQuestData(data).tableApproximationResult || {}).correct); },
        progress: function (data) { return ((trajectoryQuestData(data).tableApproximationResult || {}).correct) ? 'Tolerance understood' : 'Predict the rounding effect'; }
      },
      {
        id: 'zero_error_compile', label: 'Compile the FORTRAN-style listing with 0 errors', icon: '\uD83D\uDDA5\uFE0F',
        check: function (data) { return !!((trajectoryQuestData(data).compileResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).compileResult || {}).pass) ? '0 errors' : 'Debug listing'; }
      },
      {
        id: 'format_card', label: 'Audit the line-printer format card', icon: '\uD83D\uDCC4',
        check: function (data) { return !!((trajectoryQuestData(data).formatAuditResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).formatAuditResult || {}).pass) ? 'Readable output' : 'Audit format card'; }
      },
      {
        id: 'print_preview', label: 'Confirm the fixed-width line-printer preview', icon: '\uD83D\uDDA8\uFE0F',
        check: function (data) { return !!((trajectoryQuestData(data).printPreviewResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).printPreviewResult || {}).pass) ? 'Columns checked' : 'Inspect columns'; }
      },
      {
        id: 'batch_readback', label: 'Interpret the batch job read-back', icon: '\uD83D\uDCC8',
        check: function (data) { return !!((trajectoryQuestData(data).batchReadbackResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).batchReadbackResult || {}).pass) ? 'Output understood' : 'Read the printout'; }
      },
      {
        id: 'reproducibility_note', label: 'Record the fixed mission inputs', icon: '\uD83E\uDDFE',
        check: function (data) { return !!((trajectoryQuestData(data).reproducibilityResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).reproducibilityResult || {}).pass) ? 'Inputs documented' : 'Record fixed inputs'; }
      },
      {
        id: 'protect_the_deck', label: 'Restore the punch-card sequence', icon: '\uD83D\uDCC7',
        check: function (data) { return !!((trajectoryQuestData(data).deckResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).deckResult || {}).pass) ? 'In order' : 'Check sequence'; }
      },
      {
        id: 'independent_verification', label: 'Sign a correct independent verification', icon: '\u2705',
        check: function (data) { return !!((trajectoryQuestData(data).verificationResult || {}).pass); },
        progress: function (data) { return ((trajectoryQuestData(data).verificationResult || {}).pass) ? 'Verified' : 'GO or HOLD?'; }
      },
      {
        id: 'document_audit_chain', label: 'Document an independent audit chain', icon: '\uD83D\uDCCB',
        check: function (data) { return !!((trajectoryQuestData(data).verificationResult || {}).assignmentPass); },
        progress: function (data) { return ((trajectoryQuestData(data).verificationResult || {}).assignmentPass) ? 'Recorded' : 'Assign roles'; }
      },
      {
        id: 'angle_reasoning', label: 'Explain an angle-study result with evidence', icon: '\u2220',
        check: function (data) { return !!((trajectoryQuestData(data).studyExplanationResult || {}).correct); },
        progress: function (data) {
          var state = trajectoryQuestData(data);
          return (state.studyExplanationResult || {}).correct ? 'Evidence supported' : (state.studyResult ? 'Explain the result' : 'Predict then compare');
        }
      },
      {
        id: 'mission_replay_prediction', label: 'Complete a mission replay prediction', icon: '\u2194\uFE0F',
        check: function (data) { return getReplayLearningStatus(trajectoryQuestData(data)).questComplete; },
        progress: function (data) {
          return getReplayLearningStatus(trajectoryQuestData(data)).progress;
        }
      },
      {
        id: 'safeguard_reasoning', label: 'Predict which safeguard catches an error', icon: '\uD83D\uDEE1\uFE0F',
        check: function (data) { return !!((trajectoryQuestData(data).safeguardResult || {}).correct); },
        progress: function (data) {
          var result = trajectoryQuestData(data).safeguardResult || {};
          return result.correct ? 'Safeguard identified' : (result.prediction ? 'Prediction revised' : 'Predict then check');
        }
      }
    ],
    render: function (ctx) {
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; }; // extraction anchor: the codemod requires a ctx.t-shaped init
      t = function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k) ? (fb != null ? fb : k) : v; }; // robust: a host t() that returns undefined or the raw key on a pack miss (see stem_tool_geologyexplorer.js's note) must still yield the English fallback
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData[STATE_KEY]) || {};
      var stage = safeStage(d.stage);
      var completed = d.completed || {};
      var mode = ['guided', 'standard', 'expert'].indexOf(d.mode) >= 0 ? d.mode : 'guided';
      var supportProfile = getSupportProfile(mode);
      var attempts = normalizeAttempts(d.attempts);
      var diagnosticHistory = mergeDiagnosticCodes(d.diagnosticHistory, []);
      var revisionSummary = summarizeRevisionEvidence(attempts, diagnosticHistory);
      var worksheet = d.worksheet || {};
      var worksheetResult = d.worksheetResult || null;
      var tableLookup = d.tableLookup || {};
      var tableResult = d.tableResult || null;
      var tableApproximationPrediction = d.tableApproximationPrediction || '';
      var tableApproximationResult = d.tableApproximationResult || null;
      var formatAudit = d.formatAudit || {};
      var formatAuditResult = d.formatAuditResult || null;
      var printPreview = d.printPreview || null;
      var printPreviewResult = d.printPreviewResult || null;
      var printPreviewConfirmed = d.printPreviewConfirmed === true;
      var batchReadback = d.batchReadback || {};
      var batchReadbackResult = d.batchReadbackResult || null;
      var code = typeof d.code === 'string' ? d.code : STARTER_PROGRAM;
      var compileResult = d.compileResult || null;
      var deck = normalizeDeck(d.deck);
      var deckResult = d.deckResult || null;
      var runStatus = d.runStatus || 'idle';
      var batchFailure = d.batchFailure && ['reader', 'compiler'].indexOf(d.batchFailure.stage) >= 0 ? d.batchFailure : null;
      var reproducibility = d.reproducibility || {};
      var reproducibilityResult = d.reproducibilityResult || null;
      var auditTrail = normalizeAuditTrail(d.auditTrail);
      var verification = d.verification || {};
      var verificationResult = d.verificationResult || null;
      var workPattern = d.workPattern === 'solo' ? 'solo' : 'pair';
      var rangeReconciliation = reconcileRangeEvidence(d);
      var verificationReadiness = getVerificationReadiness({ workPattern: workPattern, verification: verification, reproducibilityResult: reproducibilityResult });
      var studyAngle = finiteNumber(d.studyAngle);
      if (studyAngle === null) studyAngle = 46;
      var studyPrediction = d.studyPrediction || '';
      var studyResult = d.studyResult || null;
      var studyExplanation = ['components', 'gravity', 'speed'].indexOf(d.studyExplanation) >= 0 ? d.studyExplanation : '';
      var studyExplanationResult = d.studyExplanationResult || null;
      var replayVariantId = normalizeMissionVariantId(d.replayVariantId, 'meridian-5');
      var replayPrediction = d.replayPrediction || '';
      var replayResult = d.replayResult || null;
      var replayLearning = normalizeReplayLearning(d.replayLearning);
      var safeguardCaseId = getSafeguardCase(d.safeguardCaseId).id;
      var selectedSafeguardCase = getSafeguardCase(safeguardCaseId);
      var safeguardPrediction = SAFEGUARD_OPTIONS.some(function (item) { return item.id === d.safeguardPrediction; }) ? d.safeguardPrediction : '';
      var safeguardResult = d.safeguardResult || null;
      var connectionNoteState = d.connectionNotes || {};
      var connectionNotes = normalizeConnectionNotes(connectionNoteState);
      var reflection = d.reflection || {};
      var reflectionRecord = normalizeReflection(reflection);
      var lowDistraction = d.lowDistraction === true;
      var orientationDismissed = d.orientationDismissed === true;
      var restartConfirmOpen = d.restartConfirmOpen === true;
      var extensionView = ['menu', 'angle', 'replay', 'safeguard'].indexOf(d.extensionView) >= 0 ? d.extensionView : 'menu';
      var diagnosticCursor = Math.max(0, Math.floor(finiteNumber(d.diagnosticCursor) || 0));
      if (replayResult && (!Array.isArray(replayResult.changedInputs) || !Number.isFinite(replayResult.rangeDifference))) {
        var replayRecoveryMissionId = replayResult.mission && replayResult.mission.id || replayVariantId;
        var recoveredReplayPrediction = ['shorter', 'about', 'longer'].indexOf(replayResult.prediction) >= 0 ? replayResult.prediction : '';
        replayResult = hasMissionVariant(replayRecoveryMissionId)
          ? (recoveredReplayPrediction ? evaluateReplayPrediction(replayRecoveryMissionId, recoveredReplayPrediction) : compareMissionVariant(replayRecoveryMissionId))
          : null;
      }
      if (!replayPrediction && replayResult && replayResult.prediction) replayPrediction = replayResult.prediction;
      var replayLearningStatus = getReplayLearningStatus(Object.assign({}, d, {
        replayVariantId: replayVariantId,
        replayPrediction: replayPrediction,
        replayResult: replayResult,
        replayLearning: replayLearning
      }));
      var selectedReplayMission = getMissionVariant(replayVariantId);
      var selectedReplayProfile = getReplayComparisonProfile(replayVariantId);
      var evidenceProvenance = createEvidenceProvenance(d, ctx.toolSnapshots);
      var currentEvidenceFingerprint = evidenceProvenance.currentFingerprint;
      var hasSavedSnapshot = evidenceProvenance.status !== 'unsaved';
      var snapshotFresh = evidenceProvenance.status === 'current';

      function update(patch) {
        ctx.setToolData(function (prev) {
          var nextState = Object.assign({}, (prev && prev[STATE_KEY]) || {}, patch || {});
          var result = Object.assign({}, prev || {});
          result[STATE_KEY] = nextState;
          return result;
        });
      }
      function reviseFrom(stationId, patch) {
        var stationIndex = WORKFLOW_STATIONS.indexOf(stationId);
        var affected = stationIndex >= 0 ? WORKFLOW_STATIONS.slice(stationIndex).filter(function (id) { return !!completed[id]; }) : [];
        ctx.setToolData(function (prev) {
          var current = (prev && prev[STATE_KEY]) || {};
          var nextState = invalidateForRevision(current, stationId, patch || {}, Date.now());
          var result = Object.assign({}, prev || {});
          result[STATE_KEY] = nextState;
          return result;
        });
        if (affected.length && typeof ctx.announceToSR === 'function') {
          ctx.announceToSR(t('stem.trajectorycomputing.revision_opened', 'Revision opened. Later evidence must be checked again.'));
        }
      }
      function markComplete(id, nextStage, extra) {
        var nextCompleted = Object.assign({}, completed); nextCompleted[id] = true;
        var nextAuditTrail = recordAuditHandoff(auditTrail, id, nextStage, Date.now());
        update(Object.assign({ completed: nextCompleted, stage: nextStage, auditTrail: nextAuditTrail, revisionNotice: null }, extra || {}));
        focusResult('tc-stage-heading-' + nextStage);
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(id + t('stem.trajectorycomputing.station_complete_moving_to', ' station complete. Moving to ') + nextStage + '.');
      }
      function setWorksheetField(id, value) {
        var next = Object.assign({}, worksheet); next[id] = value;
        reviseFrom('worksheet', { worksheet: next });
      }
      function setTableField(id, value) {
        var next = Object.assign({}, tableLookup); next[id] = value;
        reviseFrom('worksheet', { tableLookup: next });
      }
      function setFormatAuditField(id, value) {
        var next = Object.assign({}, formatAudit); next[id] = value;
        reviseFrom('program', { formatAudit: next });
      }
      function setBatchReadbackField(id, value) {
        var next = Object.assign({}, batchReadback); next[id] = value;
        reviseFrom('batch', { batchReadback: next, runStatus: runStatus, printout: d.printout || null });
      }
      function setReproducibilityField(id, value) {
        var next = Object.assign({}, reproducibility); next[id] = value;
        reviseFrom('verify', { reproducibility: next });
      }
      function setVerificationField(id, value) {
        var next = Object.assign({}, verification); next[id] = value;
        reviseFrom('verify', { verification: next, reproducibilityResult: reproducibilityResult });
      }
      function setReflectionField(id, value) {
        var next = Object.assign({}, reflection); next[id] = value;
        update({ reflection: next });
      }
      function setConnectionNote(value) {
        var next = Object.assign({}, connectionNoteState);
        next[stage] = String(value || '').slice(0, 300);
        update({ connectionNotes: next });
      }
      function speak(text) {
        if (typeof ctx.callTTS === 'function') {
          try { ctx.callTTS(text); } catch (_) {}
        } else if (typeof window !== 'undefined' && window.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined') {
          try { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } catch (_) {}
        }
      }
      function saveEvidenceSnapshot() {
        if (typeof ctx.setToolSnapshots !== 'function') {
          if (typeof ctx.addToast === 'function') ctx.addToast(t('stem.trajectorycomputing.snapshots_unavailable', 'Snapshots are unavailable in this host.'), 'error');
          return;
        }
        var snapshot = createEvidenceRecord(d, Date.now());
        snapshot.fingerprint = currentEvidenceFingerprint;
        ctx.setToolSnapshots(function (prev) { return (prev || []).concat([snapshot]); });
        update({ lastSnapshotAt: snapshot.timestamp, lastSnapshotFingerprint: currentEvidenceFingerprint });
        if (typeof ctx.addToast === 'function') ctx.addToast(t('stem.trajectorycomputing.snapshot_saved', 'Trajectory evidence snapshot saved.'), 'success');
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.snapshot_saved_to_lesson', 'Trajectory evidence snapshot saved to the lesson.'));
      }
      function restartMission() {
        ctx.setToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          next[STATE_KEY] = { mode: mode, workPattern: workPattern, stage: 'briefing', lowDistraction: lowDistraction, orientationDismissed: orientationDismissed };
          return next;
        });
        focusResult('tc-stage-heading-briefing');
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.lab_reset_to_briefing', 'Trajectory Computing Lab reset to the briefing.'));
      }
      function closeRestartConfirmation() {
        update({ restartConfirmOpen: false });
        focusResult('tc-run-again');
      }

      var stages = [
        ['briefing', t('stem.trajectorycomputing.stage_briefing', 'Briefing'), '\u25cf'], ['worksheet', t('stem.trajectorycomputing.stage_hand_math', 'Hand math'), '\u03a3'], ['program', t('stem.trajectorycomputing.stage_program', 'Program'), '<>'],
        ['cards', t('stem.trajectorycomputing.stage_card_deck', 'Card deck'), '\u25a4'], ['batch', t('stem.trajectorycomputing.stage_batch_run', 'Batch run'), '\u25b6'], ['verify', t('stem.trajectorycomputing.stage_verify', 'Verify'), '\u2713']
      ];
      var currentIndex = stages.findIndex(function (item) { return item[0] === stage; });
      var unlockedIndex = stageCompletionIndex(completed);
      var completedCount = stages.filter(function (item) { return !!completed[item[0]]; }).length;
      var progressPercent = Math.round(completedCount / stages.length * 100);
      var currentStation = stages[currentIndex >= 0 ? currentIndex : 0];
      var nextStation = stages[currentIndex + 1] || null;
      var deskBriefs = {
        briefing: [t('stem.trajectorycomputing.brief_task_briefing', 'Understand the work order'), t('stem.trajectorycomputing.brief_evidence_briefing', 'Selected audit workflow'), t('stem.trajectorycomputing.brief_ready_briefing', 'Roles and mission limits are clear')],
        worksheet: [t('stem.trajectorycomputing.brief_task_worksheet', 'Build an independent hand reference'), t('stem.trajectorycomputing.brief_evidence_worksheet', 'Trig lookup and four checked values'), t('stem.trajectorycomputing.brief_ready_worksheet', 'The table estimate and full calculation agree')],
        program: [t('stem.trajectorycomputing.brief_task_program', 'Repair and document the listing'), t('stem.trajectorycomputing.brief_evidence_program', 'Compiler check, FORMAT card, and print preview'), t('stem.trajectorycomputing.brief_ready_program', 'Zero errors and fixed columns are confirmed')],
        cards: [t('stem.trajectorycomputing.brief_task_cards', 'Protect machine order'), t('stem.trajectorycomputing.brief_evidence_cards', 'Verified sequence fields'), t('stem.trajectorycomputing.brief_ready_cards', 'Every card follows its printed sequence')],
        batch: [t('stem.trajectorycomputing.brief_task_batch', 'Read the machine record'), t('stem.trajectorycomputing.brief_evidence_batch', 'Batch printout and four-field read-back'), t('stem.trajectorycomputing.brief_ready_batch', 'The job output is transcribed accurately')],
        verify: [t('stem.trajectorycomputing.brief_task_verify', 'Make an independent GO/HOLD decision'), t('stem.trajectorycomputing.brief_evidence_verify', 'Role-separated calculation and fixed-input note'), t('stem.trajectorycomputing.brief_ready_verify', 'Human evidence supports the landing decision')]
      };
      var evidenceItems = [
        { id: 'briefing', label: t('stem.trajectorycomputing.evidence_work_order', 'Work order and audit workflow'), recorded: !!completed.briefing },
        { id: 'worksheet', label: t('stem.trajectorycomputing.evidence_calculation_ledger', 'Trig reference and calculation ledger'), recorded: !!completed.worksheet },
        { id: 'program', label: t('stem.trajectorycomputing.evidence_program_preview', 'Repaired listing and print preview'), recorded: !!completed.program },
        { id: 'cards', label: t('stem.trajectorycomputing.evidence_card_sequence', 'Ordered punch-card sequence'), recorded: !!completed.cards },
        { id: 'batch', label: t('stem.trajectorycomputing.evidence_batch_readback', 'Batch output read-back'), recorded: !!completed.batch },
        { id: 'verify', label: t('stem.trajectorycomputing.evidence_verification', 'Independent verification decision'), recorded: !!(verificationResult && verificationResult.pass && reproducibilityResult && reproducibilityResult.pass) }
      ];
      var recordedEvidenceCount = evidenceItems.filter(function (item) { return item.recorded; }).length;
      var angleInvestigationComplete = !!(studyResult && studyExplanationResult && studyExplanationResult.correct);
      var safeguardInvestigationComplete = !!(safeguardResult && safeguardResult.correct);
      var explorationCount = (angleInvestigationComplete ? 1 : 0) + (replayLearningStatus.questComplete ? 1 : 0) + (safeguardInvestigationComplete ? 1 : 0);

      function dataTile(label, value) {
        return h('div', { className: 'tc-datum' }, h('b', null, value), h('span', null, label));
      }
      function action(label, onClick, secondary, disabled) {
        return h('button', { type: 'button', className: 'tc-action' + (secondary ? ' secondary' : ''), onClick: onClick, disabled: !!disabled }, label);
      }
      function stageLabel(id) {
        var item = stages.find(function (stageItem) { return stageItem[0] === id; });
        return item ? item[1] : id;
      }
      function countPhrase(count, total, nounKey, nounFallback, stateKey, stateFallback) {
        var phrase = count + ' ' + t('stem.trajectorycomputing.count_of', 'of') + ' ' + total;
        if (nounKey) phrase += ' ' + t(nounKey, nounFallback);
        if (stateKey) phrase += ' ' + t(stateKey, stateFallback);
        return phrase;
      }
      function readinessLabel(item) {
        var keys = {
          range: 'signing_range_recorded', verdict: 'signing_verdict_selected',
          roles: workPattern === 'solo' ? 'signing_second_pass_recorded' : 'signing_different_desks',
          inputs: 'signing_fixed_inputs_documented'
        };
        return t('stem.trajectorycomputing.' + (keys[item.id] || 'signing_check'), item.label);
      }
      function renderDeskBrief() {
        var brief = deskBriefs[stage] || deskBriefs.briefing;
        var labels = [t('stem.trajectorycomputing.current_task', 'Current task'), t('stem.trajectorycomputing.evidence_to_capture', 'Evidence to capture'), t('stem.trajectorycomputing.ready_when', 'Ready when')];
        var narration = buildDeskNarration(currentStation[1], brief, labels);
        return h('div', { className: 'tc-desk-brief-block' },
          h('dl', { className: 'tc-desk-brief', 'aria-label': currentStation[1] + t('stem.trajectorycomputing.desk_briefing_label', ' desk briefing') }, brief.map(function (value, index) {
            return h('div', { key: labels[index] }, h('dt', null, labels[index]), h('dd', null, value));
          })),
          h('div', { className: 'tc-desk-audio-row' },
            h('button', { type: 'button', className: 'tc-small', onClick: function () { speak(narration); }, 'aria-label': t('stem.trajectorycomputing.read_desk_summary_aloud_label', 'Read the current desk summary aloud') },
              t('stem.trajectorycomputing.read_desk_summary_aloud', 'Read desk summary aloud')
            )
          )
        );
      }
      function renderEvidenceFile() {
        return h('details', { className: 'tc-evidence-file' },
          h('summary', null, t('stem.trajectorycomputing.evidence_file', 'Evidence file') + ' — ' + countPhrase(recordedEvidenceCount, evidenceItems.length, null, null, 'stem.trajectorycomputing.recorded', 'recorded')),
          h('ul', { className: 'tc-evidence-list', 'aria-label': t('stem.trajectorycomputing.station_evidence_status', 'Station evidence status') }, evidenceItems.map(function (item) {
            return h('li', { key: item.id, className: item.recorded ? 'is-recorded' : '' },
              h('span', { 'aria-hidden': 'true' }, item.recorded ? '\u2713' : '\u25cb'),
              h('span', null, item.label + ' — ' + (item.recorded ? t('stem.trajectorycomputing.recorded', 'recorded') : t('stem.trajectorycomputing.pending', 'pending')))
            );
          }))
        );
      }
      function handleTabKey(event, index) {
        var targetIndex = index;
        var step = 0;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step = 1;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step = -1;
        if (event.key === 'Home') targetIndex = 0;
        if (event.key === 'End') targetIndex = unlockedIndex;
        if (step !== 0) {
          for (var offset = 0; offset < stages.length; offset++) {
            targetIndex = (index + (step * (offset + 1)) + stages.length) % stages.length;
            if (targetIndex <= unlockedIndex) break;
          }
        }
        if (targetIndex === index || targetIndex > unlockedIndex) return;
        event.preventDefault();
        var nextStage = stages[targetIndex][0];
        update({ stage: nextStage });
        if (typeof document !== 'undefined') {
          setTimeout(function () {
            var nextTab = document.getElementById('tc-tab-' + nextStage);
            if (nextTab && typeof nextTab.focus === 'function') nextTab.focus();
          }, 0);
        }
      }
      function feedbackClass(ok) { return ok ? 'tc-ok' : 'tc-bad'; }

      function localizeFeedback(message) {
        if (typeof message !== 'string') return message || '';
        if (message === 'Enter a number.') return t('stem.trajectorycomputing.feedback_enter_number', 'Enter a number.');
        if (message === 'Checks out.') return t('stem.trajectorycomputing.feedback_checks_out', 'Checks out.');
        if (message === 'Recheck the formula, units, and rounding.') return t('stem.trajectorycomputing.feedback_recheck_formula_units', 'Recheck the formula, units, and rounding.');
        if (message === 'Enter the table value.') return t('stem.trajectorycomputing.feedback_enter_table_value', 'Enter the table value.');
        if (message === 'Reference recorded.') return t('stem.trajectorycomputing.feedback_reference_recorded', 'Reference recorded.');
        if (message === 'Check the angle row and column heading.') return t('stem.trajectorycomputing.feedback_check_table_heading', 'Check the angle row and column heading.');
        if (message === 'Sequence check passed. The deck is ready for the reader.') return t('stem.trajectorycomputing.feedback_sequence_passed', 'Sequence check passed. The deck is ready for the reader.');
        if (message.indexOf('Sequence mismatch near cards ') === 0) {
          var mismatchPrefix = t('stem.trajectorycomputing.feedback_sequence_mismatch', 'Sequence mismatch near cards');
          return mismatchPrefix.replace(/\s+$/, '') + ' ' + message.slice('Sequence mismatch near cards '.length);
        }
        if (message === 'Independent desk separation recorded.') return t('stem.trajectorycomputing.feedback_desk_separation_recorded', 'Independent desk separation recorded.');
        if (message === 'Choose two different desk codes for calculation and verification.') return t('stem.trajectorycomputing.feedback_choose_different_desks', 'Choose two different desk codes for calculation and verification.');
        if (message === 'Complete a fresh second pass before signing.') return t('stem.trajectorycomputing.feedback_complete_second_pass', 'Complete a fresh second pass before signing.');
        if (message === 'Reproducibility note complete. The independent check can be repeated.') return t('stem.trajectorycomputing.feedback_reproducibility_complete', 'Reproducibility note complete. The independent check can be repeated.');
        if (message === 'Identify every mission input held constant during the machine run.') return t('stem.trajectorycomputing.feedback_identify_fixed_inputs', 'Identify every mission input held constant during the machine run.');
        if (message === 'Choose the claim best supported by the controlled comparison.') return t('stem.trajectorycomputing.feedback_choose_supported_claim', 'Choose the claim best supported by the controlled comparison.');
        if (message === 'Supported: changing angle redistributes the same launch speed between horizontal and vertical components.') return t('stem.trajectorycomputing.feedback_angle_components_supported', 'Supported: changing angle redistributes the same launch speed between horizontal and vertical components.');
        if (message === 'Recheck the controls: launch speed and gravity stayed fixed; only angle changed.') return t('stem.trajectorycomputing.feedback_recheck_angle_controls', 'Recheck the controls: launch speed and gravity stayed fixed; only angle changed.');
        return message;
      }

      function localizeDiagnosticGuidance(diag, guidance) {
        if (!guidance.showHint) return t('stem.trajectorycomputing.diagnostic_generic_audit', 'Audit the named card against the worksheet and desk references.');
        var keys = {
          E101: 'diagnostic_program_opening', E102: 'diagnostic_program_end', D201: 'diagnostic_speed', D202: 'diagnostic_angle',
          D203: 'diagnostic_gravity', D204: 'diagnostic_height', N301: 'diagnostic_variable_name', M401: 'diagnostic_radians',
          M402: 'diagnostic_horizontal_velocity', M403: 'diagnostic_vertical_velocity', M404: 'diagnostic_flight_time',
          M405: 'diagnostic_range', I501: 'diagnostic_print', S601: 'diagnostic_statement_order'
        };
        return t('stem.trajectorycomputing.' + (keys[diag.code] || 'diagnostic_listing'), guidance.message);
      }

      function focusResult(id) {
        if (typeof document === 'undefined') return;
        setTimeout(function () {
          var node = document.getElementById(id);
          if (node && typeof node.focus === 'function') node.focus();
        }, 0);
      }

      function renderSupportCue(station) {
        var message = mode === 'guided'
          ? t('stem.trajectorycomputing.guided_support_cue', 'Guided desk: formulas stay visible and compiler repair hints appear immediately.')
          : (mode === 'standard'
            ? t('stem.trajectorycomputing.standard_support_cue', 'Standard desk: references open on request; detailed compiler hints appear after a second check.')
            : t('stem.trajectorycomputing.expert_support_cue', 'Expert desk: audit independently; detailed compiler hints appear after a third check.'));
        return h('p', { className: 'tc-support-cue', 'data-support-mode': mode }, h('strong', null, t('stem.trajectorycomputing.support_profile', 'Support profile: ')), message, h('span', { className: 'tc-visually-hidden' }, ' ' + station));
      }

      function renderLedger(answers, caption) {
        var ledger = buildCalculationLedger(answers);
        return h('div', { className: 'tc-ledger-wrap' },
          h('table', { className: 'tc-ledger' },
            h('caption', { style: { textAlign: 'left', padding: 10, fontWeight: 900 } }, caption || 'Calculation audit ledger'),
            h('thead', null, h('tr', null,
              h('th', { scope: 'col' }, t('stem.trajectorycomputing.step', 'Step')), h('th', { scope: 'col' }, t('stem.trajectorycomputing.substitution', 'Substitution')),
              h('th', { scope: 'col' }, t('stem.trajectorycomputing.entered', 'Entered')), h('th', { scope: 'col' }, t('stem.trajectorycomputing.reference', 'Reference')), h('th', { scope: 'col' }, t('stem.trajectorycomputing.audit', 'Audit'))
            )),
            h('tbody', null, ledger.rows.map(function (row) {
              return h('tr', { key: row.id },
                h('td', null, row.step), h('td', null, h('code', null, row.expression)),
                h('td', null, row.entered === null ? '\u2014' : round(row.entered, row.id === 'range' ? 1 : 2) + ' ' + row.units),
                h('td', null, row.reference + ' ' + row.units),
                h('td', { className: row.status === 'checked' ? 'tc-ok' : 'tc-bad' }, row.status === 'checked' ? '\u2713 checked' : row.status)
              );
            }))
          )
        );
      }

      function renderRangeReconciliation(summary, headingId, announce) {
        if (!summary || !summary.complete) return null;
        var sourceKeys = {
          worksheet: 'reconciliation_hand_worksheet',
          machine: 'reconciliation_batch_readback',
          verification: 'reconciliation_verification_sheet'
        };
        return h('section', { className: 'tc-reconciliation', 'aria-labelledby': headingId },
          h('h3', { id: headingId }, t('stem.trajectorycomputing.three_record_agreement', 'Three-record agreement')),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.reconciliation_reveal_help', 'This comparison is revealed only after the verification entry is signed, so the machine output cannot steer the independent record.')),
          h('p', { className: 'tc-reconciliation-status ' + (summary.pass ? 'tc-ok' : 'tc-bad'), role: announce ? 'status' : undefined },
            summary.pass
              ? t('stem.trajectorycomputing.reconciliation_agrees', 'All three records agree. Maximum spread: ') + round(summary.spread, 2) + t('stem.trajectorycomputing.reconciliation_within_limit', ' m, within the 15 m review limit.')
              : t('stem.trajectorycomputing.reconciliation_review', 'The records need review. Maximum spread: ') + round(summary.spread, 2) + t('stem.trajectorycomputing.reconciliation_over_limit', ' m, over the 15 m review limit.')
          ),
          h('div', { className: 'tc-ledger-wrap' },
            h('table', { className: 'tc-ledger' },
              h('caption', { style: { textAlign: 'left', padding: 10, fontWeight: 900 } }, t('stem.trajectorycomputing.reconciliation_caption', 'Range records compared with the mission reference')),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, t('stem.trajectorycomputing.record_source', 'Record source')),
                h('th', { scope: 'col' }, t('stem.trajectorycomputing.recorded_range', 'Recorded range')),
                h('th', { scope: 'col' }, t('stem.trajectorycomputing.reference_difference', 'Difference from reference')),
                h('th', { scope: 'col' }, t('stem.trajectorycomputing.review_result', 'Review result'))
              )),
              h('tbody', null, summary.sources.map(function (source) {
                var difference = source.differenceFromReference;
                return h('tr', { key: source.id },
                  h('th', { scope: 'row' }, t('stem.trajectorycomputing.' + sourceKeys[source.id], source.label)),
                  h('td', null, round(source.value, 1) + ' m'),
                  h('td', null, (difference > 0 ? '+' : '') + round(difference, 1) + ' m'),
                  h('td', { className: source.withinReference ? 'tc-ok' : 'tc-bad' }, source.withinReference ? '\u2713 ' + t('stem.trajectorycomputing.within_15_m', 'within 15 m') : t('stem.trajectorycomputing.review_required', 'review required'))
                );
              }))
            )
          )
        );
      }

      function renderAuditTrail(trail) {
        var labels = {
          briefing: 'Briefing', worksheet: 'Hand math', program: 'Program',
          cards: 'Card deck', batch: 'Batch run', verify: 'Verify', complete: 'Completion'
        };
        var entries = normalizeAuditTrail(trail);
        return h('section', { className: 'tc-audit-log', 'aria-labelledby': 'tc-audit-log-title' },
          h('h4', { id: 'tc-audit-log-title' }, t('stem.trajectorycomputing.operator_audit_log', 'Operator audit log')),
          entries.length
            ? h('ol', null, entries.map(function (event, index) {
              var fromLabel = labels[event.station] || event.station;
              var toLabel = labels[event.nextStage] || event.nextStage;
              return h('li', { key: event.station + '-' + event.nextStage + '-' + index },
                h('strong', null, String(index + 1).padStart(2, '0') + ' / ' + fromLabel), ' → ', toLabel
              );
            }))
            : h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.no_station_handoffs_recorded_in_this_s', 'No station handoffs recorded in this snapshot.'))
        );
      }

      function renderCompletionReport() {
        var report = createCompletionReport(d, ctx.toolSnapshots);
        var formatFields = report.formatAudit && report.formatAudit.fields || {};
        var safeguards = report.safeguards || { checks: [], passed: 0, total: 0 };
        var reflectionError = REFLECTION_ERROR_OPTIONS.find(function (item) { return item.id === report.reflection.errorId; });
        var reflectionSafeguard = SAFEGUARD_OPTIONS.find(function (item) { return item.id === report.reflection.safeguardId; });
        var provenance = report.evidenceProvenance;
        var provenanceMessage = provenance.status === 'current'
          ? t('stem.trajectorycomputing.report_evidence_current', 'Evidence record ID ') + provenance.currentFingerprint + t('stem.trajectorycomputing.report_evidence_current_suffix', ' matches the latest saved snapshot.')
          : (provenance.status === 'outdated'
            ? t('stem.trajectorycomputing.report_evidence_outdated', 'Current report ID ') + provenance.currentFingerprint + (provenance.savedFingerprint ? t('stem.trajectorycomputing.report_evidence_outdated_saved', ' does not match saved snapshot ID ') + provenance.savedFingerprint + '.' : t('stem.trajectorycomputing.report_evidence_outdated_legacy', ' does not match the latest saved snapshot.')) + t('stem.trajectorycomputing.report_evidence_outdated_action', ' Save a new snapshot before sharing.')
            : t('stem.trajectorycomputing.report_evidence_unsaved', 'Current report ID ') + provenance.currentFingerprint + t('stem.trajectorycomputing.report_evidence_unsaved_suffix', ' has no matching saved snapshot. Save a snapshot before sharing.'));
        var replayLearningSummary = '';
        if (report.replayCard) {
          if (!Object.prototype.hasOwnProperty.call(report.replayCard, 'initialPrediction')) {
            replayLearningSummary = 'Earlier replay recorded. This record did not capture a revision or comparison-reasoning step.';
          } else {
            var initialSupported = report.replayCard.initialPrediction === report.replayCard.relation;
            var finalSupported = report.replayCard.finalPrediction === report.replayCard.relation;
            var reasoningOption = getReplayReasoningOption(report.replayCard.reasoningClaim);
            var initialPredictionPhrase = report.replayCard.initialPrediction === 'about' ? 'about the same as Aurora' : report.replayCard.initialPrediction + ' than Aurora';
            var finalPredictionPhrase = report.replayCard.finalPrediction === 'about' ? 'about the same as Aurora' : report.replayCard.finalPrediction + ' than Aurora';
            replayLearningSummary = 'Initial prediction: ' + initialPredictionPhrase + ' - ' + (initialSupported ? 'supported.' : 'not supported.');
            if (report.replayCard.revisionOccurred) replayLearningSummary += ' Final prediction: ' + finalPredictionPhrase + ' - ' + (finalSupported ? 'supported.' : 'not supported.');
            else replayLearningSummary += initialSupported ? ' No revision was needed.' : ' No revised prediction was recorded.';
            replayLearningSummary += reasoningOption
              ? ' Comparison claim: ' + reasoningOption.label + ' - ' + (report.replayCard.reasoningCorrect ? 'supported.' : 'needs revision.')
              : ' No checked comparison claim was recorded.';
          }
        }
        return h('section', { id: 'tc-completion-report', className: 'tc-report', tabIndex: -1, 'aria-labelledby': 'tc-report-title' },
          h('div', { className: 'tc-report-head' },
            h('div', null,
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.fictional_national_aeronautics_laborat', 'Fictional National Aeronautics Laboratory')),
              h('h3', { id: 'tc-report-title', style: { margin: '4px 0' } }, report.title),
              h('p', { style: { margin: 0 } }, 'Work order ' + report.workOrder + ' / instructional simulation')
            ),
            h('strong', { style: { fontFamily: 'ui-monospace,monospace', color: '#17633f' } }, report.status)
          ),
          h('p', { className: 'tc-report-provenance ' + (provenance.status === 'current' ? 'tc-ok' : 'tc-bad') }, provenanceMessage),
          h('div', { className: 'tc-report-grid' },
            h('div', { className: 'tc-report-card' }, h('b', null, report.workflow), t('stem.trajectorycomputing.verification_workflow', 'verification workflow')),
            h('div', { className: 'tc-report-card' }, h('b', null, round(report.output.range, 1) + ' m'), t('stem.trajectorycomputing.verified_landing_range', 'verified landing range')),
            h('div', { className: 'tc-report-card' }, h('b', null, report.output.verdict), t('stem.trajectorycomputing.landing_zone_recommendation', 'landing-zone recommendation'))
          ),
          h('h4', null, t('stem.trajectorycomputing.audit_chain', 'Audit chain')),
          h('ul', { className: 'tc-checklist' }, report.checks.map(function (check) {
            return h('li', { key: check.label }, (check.pass ? '\u2713 ' : '\u25CB ') + check.label);
          })),
          renderAuditTrail(report.auditTrail),
          report.revisionTrail.length > 0 && h('section', { className: 'tc-audit-log', 'aria-labelledby': 'tc-revision-log-title' },
            h('h4', { id: 'tc-revision-log-title' }, t('stem.trajectorycomputing.revision_log', 'Revision log')),
            h('ol', null, report.revisionTrail.map(function (event, index) {
              return h('li', { key: event.station + '-' + index },
                t('stem.trajectorycomputing.revision_at', 'Revision at ') + stageLabel(event.station) + ': ' + event.affectedStations.length + t('stem.trajectorycomputing.downstream_records_rechecked', ' downstream records required rechecking.')
              );
            }))
          ),
          h('details', { className: 'tc-safeguards' },
            h('summary', null, 'Accessibility and audit safeguards (' + safeguards.passed + '/' + safeguards.total + ' verified)'),
            h('p', { className: 'tc-lede', role: 'status' }, safeguards.passed + ' of ' + safeguards.total + ' evidence safeguards verified in this report.'),
            h('ul', { className: 'tc-checklist' }, safeguards.checks.map(function (check) {
              return h('li', { key: check.id }, (check.pass ? '\u2713 Verified: ' : '\u25CB Needs review: ') + check.label + ' - ' + check.detail);
            })),
            h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.interface_safeguards_keyboard_station_', 'Interface safeguards: Keyboard station tabs support Arrow keys, Home, and End. Visible focus rings and 24-pixel checkbox and radio targets support keyboard and switch access. The line-printer preview and machine read-back remain separate checks so learners can inspect output independently.'))
          ),
          h('p', null, h('strong', null, t('stem.trajectorycomputing.role_separation', 'Role separation: ')), localizeFeedback(report.assignment.message)),
          renderLedger(d.worksheet || {}, 'Hand-calculation audit ledger'),
          renderRangeReconciliation(report.rangeReconciliation, 'tc-report-reconciliation-title', false),
          report.tableApproximation && h('p', null, h('strong', null, t('stem.trajectorycomputing.table_precision_control', 'Table-precision control: ')), 'The four-place reference estimate was ' + round(report.tableApproximation.range, 1) + ' m, a ' + round(Math.abs(report.tableApproximation.difference), 2) + ' m difference. Prediction ' + (report.tableApproximation.correct ? 'supported.' : 'needs revision.')),
          report.formatAudit && h('p', null, h('strong', null, t('stem.trajectorycomputing.format_card', 'Format card: ')), 'TIME ' + (formatFields.timeFormat && formatFields.timeFormat.actual || '\u2014') + ', RANGE ' + (formatFields.rangeFormat && formatFields.rangeFormat.actual || '\u2014') + ', order ' + (formatFields.order && formatFields.order.actual || '\u2014') + '.'),
          report.printPreview && h('div', null,
            h('p', null, h('strong', null, t('stem.trajectorycomputing.fixed_width_preview', 'Fixed-width preview: ')), report.printPreview.pass ? 'confirmed.' : 'needs review.'),
            h('pre', { className: 'tc-print-preview', 'aria-label': t('stem.trajectorycomputing.confirmed_fixed_width_line_printer_pre', 'Confirmed fixed-width line-printer preview') }, report.printPreview.actualLine || '\u2014')
          ),
          report.batchReadback && h('p', null, h('strong', null, t('stem.trajectorycomputing.machine_read_back', 'Machine read-back: ')), report.batchReadback.correct + ' of ' + report.batchReadback.total + ' read-back fields matched the printed job.'),
          report.batchRun && report.batchRun.id && h('p', null, h('strong', null, t('stem.trajectorycomputing.batch_run_record', 'Batch run record: ')), report.batchRun.id + ' / run ' + report.batchRun.count + '.'),
          report.reproducibilityNote && h('p', null, h('strong', null, t('stem.trajectorycomputing.reproducibility_note', 'Reproducibility note: ')), countPhrase(report.reproducibilityNote.correct, report.reproducibilityNote.total, 'stem.trajectorycomputing.fixed_mission_inputs', 'fixed mission inputs', 'stem.trajectorycomputing.recorded_period', 'recorded.')),
          h('p', null, h('strong', null, t('stem.trajectorycomputing.revision_evidence', 'Revision evidence: ')), report.revisionEvidence.totalAttempts + ' checks across the workflow; diagnostic categories recorded: ' + (report.revisionEvidence.diagnosticCodes.join(', ') || t('stem.trajectorycomputing.none', 'none')) + '. ' + t('stem.trajectorycomputing.revision_privacy_note', 'Discarded code and personal identifiers are not stored.')),
          report.angleStudy && h('p', null, h('strong', null, t('stem.trajectorycomputing.parameter_study', 'Parameter study: ')), report.angleStudy.angle + ' degrees produced ' + round(report.angleStudy.range, 1) + ' m, ' + report.angleStudy.relation + ' than baseline. Prediction ' + (report.angleStudy.correct ? 'supported.' : 'revised.') + ' Evidence explanation ' + (report.angleStudy.explanationCorrect ? 'supported.' : 'not yet confirmed.')),
          report.replayCard && h('div', null,
            h('p', null, h('strong', null, t('stem.trajectorycomputing.mission_replay_evidence', 'Mission replay evidence: ')), report.replayCard.mission.name + ' produced ' + round(report.replayCard.result.range, 1) + ' m, ' + (report.replayCard.relation === 'about' ? 'about the same as Aurora' : report.replayCard.relation + ' than Aurora') + '.'),
            h('p', null, replayLearningSummary),
            renderReplayComparisonTable(report.replayCard)
          ),
          report.safeguardChallenge && h('p', null, h('strong', null, t('stem.trajectorycomputing.safeguard_challenge_evidence', 'Safeguard challenge: ')), report.safeguardChallenge.message),
          report.connectionNotes.recorded > 0 && h('section', { 'aria-labelledby': 'tc-report-connections-title' },
            h('h4', { id: 'tc-report-connections-title' }, t('stem.trajectorycomputing.historical_reasoning_notes', 'Historical reasoning notes')),
            h('p', { className: 'tc-lede' }, report.connectionNotes.recorded + ' of ' + report.connectionNotes.total + t('stem.trajectorycomputing.station_connections_recorded', ' station connections recorded.')),
            h('dl', { className: 'tc-connection-list' }, WORKFLOW_STATIONS.filter(function (stationId) { return !!report.connectionNotes.notes[stationId]; }).map(function (stationId) {
              return h('div', { key: stationId }, h('dt', null, stageLabel(stationId)), h('dd', null, report.connectionNotes.notes[stationId]));
            }))
          ),
          report.reflection.recorded && h('div', null,
            h('p', null, h('strong', null, t('stem.trajectorycomputing.reflection_evidence', 'Reflection evidence: ')), (reflectionError ? reflectionError.label : t('stem.trajectorycomputing.no_error_category_recorded', 'No error category recorded')) + '; ' + (reflectionSafeguard ? reflectionSafeguard.label : t('stem.trajectorycomputing.no_safeguard_recorded', 'no safeguard recorded')) + '.'),
            report.reflection.note && h('p', null, h('strong', null, t('stem.trajectorycomputing.reflection_note', 'Reflection note: ')), report.reflection.note)
          ),
          h('p', { className: 'tc-lede' }, h('strong', null, t('stem.trajectorycomputing.model_limit', 'Model limit: ')), report.modelLimit),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.original_fictional_mission_and_report_', 'Original fictional mission and report. Historical context is documented separately in the lab; no copyrighted film material is reproduced.')),
          h('div', { className: 'tc-row' },
            action('Print this report', function () { if (typeof window !== 'undefined' && typeof window.print === 'function') window.print(); }),
            action('Close report', function () { update({ reportOpen: false }); }, true)
          )
        );
      }

      function renderReferenceTable() {
        return h('section', { className: 'tc-reference-table', 'aria-labelledby': 'tc-reference-table-title' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.desk_card_printed_reference', 'Desk card / printed reference')),
          h('h3', { id: 'tc-reference-table-title' }, t('stem.trajectorycomputing.read_the_trigonometry_table_before_cal', 'Read the trigonometry table before calculating.')),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.the_table_is_a_shared_reference_not_a_', 'The table is a shared reference, not a calculator. Find the 38-degree row and record four decimal places for sin(theta) and cos(theta).')),
          h('div', { className: 'tc-ledger-wrap' },
            h('table', { className: 'tc-ledger' },
              h('caption', { style: { textAlign: 'left', padding: 10, fontWeight: 900 } }, t('stem.trajectorycomputing.printed_values_angle_in_degrees', 'Printed values / angle in degrees')),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, t('stem.trajectorycomputing.angle', 'Angle')), h('th', { scope: 'col' }, 'sin(theta)'), h('th', { scope: 'col' }, 'cos(theta)'))),
              h('tbody', null, TRIG_TABLE.map(function (row) {
                return h('tr', { key: row.angle, className: row.angle === MISSION.angle ? 'tc-reference-target' : '' },
                  h('th', { scope: 'row' }, row.angle + ' deg'), h('td', null, row.sin.toFixed(4)), h('td', null, row.cos.toFixed(4))
                );
              }))
            )
          ),
          h('form', { onSubmit: function (event) {
            event.preventDefault();
            update({ tableResult: checkReferenceTable(tableLookup) });
          } },
            h('div', { className: 'tc-role-grid' },
              h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.sin_theta_at_38_deg', 'sin(theta) at 38 deg'), h('input', { type: 'number', step: '0.0001', inputMode: 'decimal', value: tableLookup.sin == null ? '' : tableLookup.sin, onChange: function (event) { setTableField('sin', event.target.value); }, 'aria-invalid': tableResult && !tableResult.fields.sin.ok ? true : undefined }),
                tableResult && h('small', { className: tableResult.fields.sin.ok ? 'tc-ok' : 'tc-bad' }, localizeFeedback(tableResult.fields.sin.message))
              ),
              h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.cos_theta_at_38_deg', 'cos(theta) at 38 deg'), h('input', { type: 'number', step: '0.0001', inputMode: 'decimal', value: tableLookup.cos == null ? '' : tableLookup.cos, onChange: function (event) { setTableField('cos', event.target.value); }, 'aria-invalid': tableResult && !tableResult.fields.cos.ok ? true : undefined }),
                tableResult && h('small', { className: tableResult.fields.cos.ok ? 'tc-ok' : 'tc-bad' }, localizeFeedback(tableResult.fields.cos.message))
              )
            ),
            tableResult && h('p', { role: 'status', className: tableResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, countPhrase(tableResult.correct, tableResult.total, 'stem.trajectorycomputing.reference_values', 'reference values', 'stem.trajectorycomputing.recorded_period', 'recorded.')),
            h('div', { className: 'tc-row' }, h('button', { type: 'submit', className: 'tc-action' }, t('stem.trajectorycomputing.check_table_lookup', 'Check table lookup')))
          ),
          h('div', { className: 'tc-control-box' },
            h('h4', { style: { margin: '0 0 6px' } }, t('stem.trajectorycomputing.control_estimate_how_much_does_table_p', 'Control estimate: how much does table precision change the range?')),
            h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.predict_first_using_the_four_place_tab', 'Predict first. Using the four-place table values, will the landing range differ from the full-precision result by more than 3 meters?')),
            h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
              h('legend', { className: 'tc-field' }, t('stem.trajectorycomputing.my_prediction', 'My prediction')),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-table-prediction', value: 'within', checked: tableApproximationPrediction === 'within', onChange: function () { reviseFrom('worksheet', { tableApproximationPrediction: 'within', tableResult: tableResult, worksheetResult: worksheetResult }); } }), t('stem.trajectorycomputing.within_3_meters', ' Within 3 meters')),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-table-prediction', value: 'outside', checked: tableApproximationPrediction === 'outside', onChange: function () { reviseFrom('worksheet', { tableApproximationPrediction: 'outside', tableResult: tableResult, worksheetResult: worksheetResult }); } }), t('stem.trajectorycomputing.more_than_3_meters', ' More than 3 meters'))
            ),
            h('div', { className: 'tc-row' }, action('Run table-precision control', function () { update({ tableApproximationResult: checkTableApproximation(tableLookup, tableApproximationPrediction) }); }, false, !tableResult || !tableResult.pass || !tableApproximationPrediction)),
            tableApproximationResult && h('div', { className: tableApproximationResult.correct ? 'tc-check' : 'tc-diag', role: 'status' },
              h('strong', null, tableApproximationResult.correct ? 'Prediction supported. ' : 'Revise the prediction. '),
              tableApproximationResult.pass ? 'Table-based estimate: ' + round(tableApproximationResult.range, 1) + ' m; difference from full precision: ' + round(Math.abs(tableApproximationResult.difference), 2) + ' m.' : 'Record both table values before running the control.'
            )
          )
        );
      }

      function renderBriefing() {
        return h('section', { role: 'tabpanel', id: 'tc-panel-briefing', 'aria-labelledby': 'tc-tab-briefing' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.work_order_62_aur_03', 'Work order 62-AUR-03')),
          h('h2', { id: 'tc-stage-heading-briefing', className: 'tc-heading', tabIndex: -1 }, t('stem.trajectorycomputing.the_answer_must_be_trusted_before_the_', 'The answer must be trusted before the vehicle flies.')),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.you_have_joined_the_fictional_national', 'You have joined the fictional National Aeronautics Laboratory as a computation specialist. Aurora Test 3 will release a research capsule from a 30-meter tower. Your team must predict where it lands, translate the method into early scientific code, prepare the card deck, and check the machine independently.')),
          !orientationDismissed && h('section', { className: 'tc-orientation', 'aria-labelledby': 'tc-orientation-title' },
            h('h3', { id: 'tc-orientation-title' }, t('stem.trajectorycomputing.how_the_mission_works', 'How the mission works')),
            h('ol', { className: 'tc-orientation-steps' },
              h('li', null, h('strong', null, t('stem.trajectorycomputing.build_a_human_reference', 'Build a human reference. ')), t('stem.trajectorycomputing.build_a_human_reference_help', 'Use printed values and hand calculations before seeing machine output.')),
              h('li', null, h('strong', null, t('stem.trajectorycomputing.prepare_the_machine_job', 'Prepare the machine job. ')), t('stem.trajectorycomputing.prepare_the_machine_job_help', 'Repair code, audit its print format, and protect card order.')),
              h('li', null, h('strong', null, t('stem.trajectorycomputing.verify_independently', 'Verify independently. ')), t('stem.trajectorycomputing.verify_independently_help', 'Read the output, record fixed inputs, and make a separate GO/HOLD decision.'))
            ),
            h('div', { className: 'tc-row' }, action(t('stem.trajectorycomputing.got_it_show_work_order', 'Got it — show my work order'), function () { update({ orientationDismissed: true }); focusResult('tc-main-content'); }))
          ),
          h('div', { className: 'tc-note' }, h('strong', null, t('stem.trajectorycomputing.historical_boundary', 'Historical boundary: ')), t('stem.trajectorycomputing.the_mission_facility_documents_and_int', 'The mission, facility, documents, and interface in this simulation are original and fictional. The workflow is grounded in documented history about women who worked as human computers and later programmed early electronic computers.')),
          h('div', { className: 'tc-data', 'aria-label': t('stem.trajectorycomputing.mission_constants', 'Mission constants') },
            dataTile('release speed', '215 m/s'), dataTile('launch angle', '38 degrees'),
            dataTile('initial height', '30 m'), dataTile('landing zone', '4.55-4.70 km')
          ),
          h('h3', null, t('stem.trajectorycomputing.your_assignment', 'Your assignment')),
          h('ol', { className: 'tc-lede' },
            h('li', null, t('stem.trajectorycomputing.read_the_printed_trigonometry_table_an', 'Read the printed trigonometry table and record the 38-degree reference values.')),
            h('li', null, t('stem.trajectorycomputing.resolve_velocity_into_horizontal_and_v', 'Resolve velocity into horizontal and vertical components.')),
            h('li', null, t('stem.trajectorycomputing.calculate_time_aloft_and_downrange_dis', 'Calculate time aloft and downrange distance.')),
            h('li', null, t('stem.trajectorycomputing.debug_a_fortran_style_transcription_an', 'Debug a FORTRAN-style transcription and order its card deck.')),
            h('li', null, t('stem.trajectorycomputing.audit_the_line_printer_format_card_and', 'Audit the line-printer format card and inspect its fixed-width preview before releasing the deck.')),
            h('li', null, t('stem.trajectorycomputing.run_the_batch_job_transcribe_its_print', 'Run the batch job, transcribe its printed range and status, then verify it without relying on the printout.'))
          ),
          h('fieldset', { className: 'tc-role-box' },
            h('legend', { style: { fontWeight: 900 } }, t('stem.trajectorycomputing.choose_the_verification_workflow', 'Choose the verification workflow')),
            h('label', { style: { display: 'block', marginTop: 7 } },
              h('input', { type: 'radio', name: 'tc-work-pattern', value: 'pair', checked: workPattern === 'pair', onChange: function () { reviseFrom('verify', { workPattern: 'pair', verification: {}, reproducibilityResult: reproducibilityResult }); } }),
              t('stem.trajectorycomputing.paired_cross_check_separate_calculator', ' Paired cross-check \u2014 separate calculator and verifier desk codes')
            ),
            h('label', { style: { display: 'block', marginTop: 7 } },
              h('input', { type: 'radio', name: 'tc-work-pattern', value: 'solo', checked: workPattern === 'solo', onChange: function () { reviseFrom('verify', { workPattern: 'solo', verification: {}, reproducibilityResult: reproducibilityResult }); } }),
              t('stem.trajectorycomputing.solo_dual_pass_audit_recompute_after_a', ' Solo dual-pass audit \u2014 recompute after a deliberate reset')
            ),
            h('p', { className: 'tc-lede', style: { marginBottom: 0 } }, t('stem.trajectorycomputing.desk_codes_represent_roles_not_student', 'Desk codes represent roles, not student names. The lab stores no personal identifiers.'))
          ),
          h('div', { className: 'tc-row' },
            action('Begin hand calculation', function () { markComplete('briefing', 'worksheet'); }),
            action(t('stem.trajectorycomputing.read_assignment_aloud', 'Read assignment aloud'), function () { speak(t('stem.trajectorycomputing.spoken_assignment', 'Aurora Test 3. Calculate the flight path by hand, debug the early scientific program, prepare its punch cards, run the batch job, and independently verify the landing estimate.')); }, true)
          )
        );
      }

      function renderWorksheet() {
        var fieldDefs = [
          ['vx', 'Horizontal velocity Vx', 'm/s'], ['vy', 'Vertical velocity Vy', 'm/s'],
          ['flightTime', 'Positive flight time t', 'seconds'], ['range', 'Downrange distance R', 'meters']
        ];
        return h('section', { role: 'tabpanel', id: 'tc-panel-worksheet', 'aria-labelledby': 'tc-tab-worksheet' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.station_02_desktop_calculation', 'Station 02 / desktop calculation')),
          h('h2', { id: 'tc-stage-heading-worksheet', className: 'tc-heading', tabIndex: -1 }, t('stem.trajectorycomputing.build_a_result_the_electronic_computer', 'Build a result the electronic computer can be checked against.')),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.keep_units_beside_every_value_use_at_l', 'Keep units beside every value. Use at least two decimal places until the final step.')),
          renderSupportCue('worksheet'),
          renderReferenceTable(),
          (supportProfile.formulaVisibility === 'always' || d.showReference) && h('div', { className: 'tc-formula', 'aria-label': t('stem.trajectorycomputing.formula_reference', 'Formula reference') },
            t('stem.trajectorycomputing.theta_radians_theta_degrees_x_pi_180', 'theta radians = theta degrees x pi / 180\n'),
            t('stem.trajectorycomputing.vx_v_x_cos_theta_vy_v_x_sin_theta', 'Vx = V x cos(theta)        Vy = V x sin(theta)\n'),
            t('stem.trajectorycomputing.t_vy_sqrt_vy_2_2gy0_g', 't = [Vy + sqrt(Vy^2 + 2gY0)] / g\n'),
            t('stem.trajectorycomputing.r_vx_x_t', 'R = Vx x t')
          ),
          h('form', { onSubmit: function (event) {
            event.preventDefault();
            var result = checkWorksheet(worksheet);
            var nextAttempts = incrementAttempt(attempts, 'worksheet');
            update({ worksheetResult: result, attempts: nextAttempts });
            if (result.pass && tableResult && tableResult.pass && tableApproximationResult && tableApproximationResult.correct) markComplete('worksheet', 'program', { worksheetResult: result, attempts: nextAttempts });
            else {
              focusResult('tc-worksheet-summary');
              if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.hand_math_control_remaining', 'Hand calculations check out. Complete the printed-reference control estimate before continuing.'));
            }
          } },
            h('div', { className: 'tc-fields' }, fieldDefs.map(function (def) {
              var result = worksheetResult && worksheetResult.fields[def[0]];
              return h('label', { className: 'tc-field', key: def[0] }, def[1] + ' (' + def[2] + ')',
                h('input', { type: 'number', step: 'any', inputMode: 'decimal', value: worksheet[def[0]] == null ? '' : worksheet[def[0]], onChange: function (event) { setWorksheetField(def[0], event.target.value); }, 'aria-describedby': 'tc-' + def[0] + '-help', 'aria-invalid': result && !result.ok ? true : undefined }),
                h('small', { id: 'tc-' + def[0] + '-help', className: result ? feedbackClass(result.ok) : '' }, result ? localizeFeedback(result.message) : (mode === 'guided' ? t('stem.trajectorycomputing.round_after_calculating', 'Round only after calculating.') : ''))
              );
            })),
            worksheetResult && h('p', { id: 'tc-worksheet-summary', role: 'status', tabIndex: -1, className: feedbackClass(worksheetResult.pass) }, worksheetResult.correct + ' of ' + worksheetResult.total + ' calculations check out.'),
            h('div', { className: 'tc-row' },
              h('button', { type: 'submit', className: 'tc-action' }, t('stem.trajectorycomputing.check_worksheet', 'Check worksheet')),
              supportProfile.formulaVisibility !== 'always' && action(d.showReference ? t('stem.trajectorycomputing.hide_formula_reference', 'Hide formula reference') : t('stem.trajectorycomputing.open_formula_reference', 'Open formula reference'), function () { update({ showReference: !d.showReference }); }, true)
            )
          )
        );
      }

      function renderProgram() {
        var diagnostics = compileResult && compileResult.diagnostics ? compileResult.diagnostics : [];
        var activeDiagnostic = diagnostics.length ? diagnostics[diagnosticCursor % diagnostics.length] : null;
        var activeGuidance = activeDiagnostic ? getDiagnosticGuidance(activeDiagnostic, mode, attempts.compile) : null;
        var repairCard = activeGuidance ? getCard(activeGuidance.cardId) : null;
        var diagnosticSelection = activeDiagnostic ? getDiagnosticSelection(code, activeDiagnostic) : null;
        return h('section', { role: 'tabpanel', id: 'tc-panel-program', 'aria-labelledby': 'tc-tab-program' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.station_03_transcription_desk', 'Station 03 / transcription desk')),
          h('h2', { id: 'tc-stage-heading-program', className: 'tc-heading', tabIndex: -1 }, t('stem.trajectorycomputing.debug_the_fortran_style_program', 'Debug the FORTRAN-style program.')),
          h('p', { className: 'tc-lede' }, mode === 'expert' ? t('stem.trajectorycomputing.audit_listing_independently', 'Audit the listing against your worksheet and compile when ready.') : t('stem.trajectorycomputing.three_transcription_errors', 'Three transcription errors were introduced: one constant, one variable name, and one trigonometric function. Find and repair them.')),
          renderSupportCue('program'),
          completed.worksheet && h('details', null,
            h('summary', null, t('stem.trajectorycomputing.open_checked_calculation_ledger', 'Open checked calculation ledger')),
            renderLedger(worksheet, 'Human reference used for program audit')
          ),
          h('div', { className: 'tc-program-workspace' },
            h('div', { className: 'tc-editor-desk' },
              h('label', { className: 'tc-field', htmlFor: 'tc-code-editor' }, t('stem.trajectorycomputing.program_listing', 'Program listing')),
              h('textarea', { id: 'tc-code-editor', className: 'tc-code', spellCheck: 'false', value: code, onChange: function (event) { reviseFrom('program', { code: event.target.value, diagnosticCursor: 0 }); }, 'aria-describedby': 'tc-code-help', 'aria-invalid': compileResult && !compileResult.pass ? true : undefined, 'aria-errormessage': compileResult && !compileResult.pass ? 'tc-compiler-message' : undefined }),
              h('p', { id: 'tc-code-help', className: 'tc-lede' }, t('stem.trajectorycomputing.this_safe_learning_compiler_validates_', 'This safe learning compiler validates the mathematical statements. It does not execute arbitrary code.'))
            ),
            activeDiagnostic && h('aside', { id: 'tc-compiler-diagnostics', className: 'tc-diagnostic-desk', role: 'region', tabIndex: -1, 'aria-labelledby': 'tc-active-diagnostic-title' },
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.next_repair_card', 'Next repair card')),
              h('h3', { id: 'tc-active-diagnostic-title' }, activeDiagnostic.code + ' / ' + t('stem.trajectorycomputing.card', 'CARD') + ' ' + activeGuidance.cardSequence),
              h('p', { id: 'tc-compiler-message', className: 'tc-visually-hidden', role: 'status', 'aria-live': 'polite' }, t('stem.trajectorycomputing.compiler_error', 'Compiler error: ') + localizeDiagnosticGuidance(activeDiagnostic, activeGuidance)),
              h('p', { className: 'tc-diagnostic-count' }, t('stem.trajectorycomputing.diagnostic', 'Diagnostic') + ' ' + ((diagnosticCursor % diagnostics.length) + 1) + ' of ' + diagnostics.length),
              h('p', null, localizeDiagnosticGuidance(activeDiagnostic, activeGuidance)),
              !activeGuidance.showHint && h('small', { style: { display: 'block' } }, t('stem.trajectorycomputing.progressive_hint_notice', 'A more specific repair hint unlocks after another compile check.')),
              h('div', { className: 'tc-diagnostic-card' },
                h('span', { className: 'tc-seq' }, activeGuidance.cardSequence),
                h('code', { style: { display: 'block', marginTop: 5, whiteSpace: 'pre-wrap' } }, repairCard ? repairCard.text : t('stem.trajectorycomputing.audit_statement_order', 'Audit statement order against the full deck.')),
                h('span', { id: 'tc-diagnostic-location', className: 'tc-diagnostic-count', style: { display: 'block', marginTop: 8 } }, diagnosticSelection.found
                  ? t('stem.trajectorycomputing.current_listing_line', 'Current listing line ') + diagnosticSelection.lineNumber + ': ' + diagnosticSelection.lineText
                  : t('stem.trajectorycomputing.statement_missing_from_listing', 'Statement missing from the listing. Restore: ') + diagnosticSelection.expectedStatement)
              ),
              h('div', { className: 'tc-row' },
                h('button', { type: 'button', className: 'tc-small', 'aria-describedby': 'tc-diagnostic-location', onClick: function () {
                  var editor = typeof document !== 'undefined' && document.getElementById('tc-code-editor');
                  var selection = getDiagnosticSelection(code, activeDiagnostic);
                  if (editor && typeof editor.focus === 'function') {
                    editor.focus();
                    if (selection.found && typeof editor.setSelectionRange === 'function') {
                      editor.setSelectionRange(selection.start, selection.end);
                      var lineCount = Math.max(1, String(code || '').split(/\r?\n/).length);
                      editor.scrollTop = Math.max(0, (selection.lineNumber - 2) / lineCount * editor.scrollHeight);
                    }
                  }
                  if (typeof ctx.announceToSR === 'function') ctx.announceToSR(selection.found
                    ? t('stem.trajectorycomputing.focused_listing_line', 'Focused listing line ') + selection.lineNumber + ': ' + selection.lineText
                    : t('stem.trajectorycomputing.missing_statement_announcement', 'The affected statement is missing. Restore ') + selection.expectedStatement + '.');
                } }, t('stem.trajectorycomputing.jump_to_affected_statement', 'Jump to affected statement')),
                diagnostics.length > 1 && h('button', { type: 'button', className: 'tc-small', onClick: function () { update({ diagnosticCursor: (diagnosticCursor - 1 + diagnostics.length) % diagnostics.length }); } }, '\u2190 ' + t('stem.trajectorycomputing.previous_repair', 'Previous')),
                diagnostics.length > 1 && h('button', { type: 'button', className: 'tc-small', onClick: function () { update({ diagnosticCursor: (diagnosticCursor + 1) % diagnostics.length }); } }, t('stem.trajectorycomputing.next_repair', 'Next repair') + ' \u2192')
              ),
              diagnostics.length > 1 && h('details', null,
                h('summary', null, t('stem.trajectorycomputing.all_diagnostics', 'All diagnostics') + ' (' + diagnostics.length + ')'),
                h('ol', null, diagnostics.map(function (diag) { return h('li', { key: diag.code + diag.message }, h('strong', null, diag.code + ': '), localizeDiagnosticGuidance(diag, getDiagnosticGuidance(diag, mode, attempts.compile))); }))
              )
            )
          ),
          compileResult && compileResult.pass && h('p', { role: 'status', className: 'tc-check tc-ok' }, t('stem.trajectorycomputing.compile_successful_0_errors_the_listin', 'COMPILE SUCCESSFUL - 0 errors. The listing is ready to keypunch.')),
          compileResult && compileResult.pass && h('div', { className: 'tc-next-cue' }, h('strong', null, t('stem.trajectorycomputing.next_on_the_desk', 'Next on the desk: ')), t('stem.trajectorycomputing.match_the_format_card_inspect_the_fixe', 'match the FORMAT card, inspect the fixed-width preview, then release the deck.')),
          compileResult && compileResult.pass && h('div', { className: 'tc-format-box' },
            h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.format_card_line_printer_audit', 'Format card / line-printer audit')),
            h('h3', null, t('stem.trajectorycomputing.make_the_batch_output_readable', 'Make the batch output readable.')),
            h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.the_program_can_calculate_the_right_nu', 'The program can calculate the right numbers and still produce a confusing record. Match the FORMAT card to the required time and range columns before the deck leaves the desk.')),
            h('div', { className: 'tc-role-grid' },
              h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.time_field_format', 'Time field format'),
                h('select', { value: formatAudit.timeFormat || '', onChange: function (event) { setFormatAuditField('timeFormat', event.target.value); } },
                  h('option', { value: '' }, t('stem.trajectorycomputing.choose_a_width', 'Choose a width')),
                  h('option', { value: 'F8.2' }, t('stem.trajectorycomputing.f8_2_8_columns_2_decimals', 'F8.2 / 8 columns, 2 decimals')),
                  h('option', { value: 'F10.1' }, t('stem.trajectorycomputing.f10_1_10_columns_1_decimal', 'F10.1 / 10 columns, 1 decimal'))
                )
              ),
              h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.range_field_format', 'Range field format'),
                h('select', { value: formatAudit.rangeFormat || '', onChange: function (event) { setFormatAuditField('rangeFormat', event.target.value); } },
                  h('option', { value: '' }, t('stem.trajectorycomputing.choose_a_width_2', 'Choose a width')),
                  h('option', { value: 'F10.1' }, t('stem.trajectorycomputing.f10_1_10_columns_1_decimal_2', 'F10.1 / 10 columns, 1 decimal')),
                  h('option', { value: 'F8.2' }, t('stem.trajectorycomputing.f8_2_8_columns_2_decimals_2', 'F8.2 / 8 columns, 2 decimals'))
                )
              )
            ),
            h('fieldset', { style: { border: 0, padding: 0, margin: '12px 0 0' } },
              h('legend', { className: 'tc-field' }, t('stem.trajectorycomputing.printed_record_order', 'Printed record order')),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-format-order', value: 'time-range', checked: formatAudit.order === 'time-range', onChange: function () { setFormatAuditField('order', 'time-range'); } }), t('stem.trajectorycomputing.time_then_range', ' TIME then RANGE')),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-format-order', value: 'range-time', checked: formatAudit.order === 'range-time', onChange: function () { setFormatAuditField('order', 'range-time'); } }), t('stem.trajectorycomputing.range_then_time', ' RANGE then TIME'))
            ),
            h('div', { className: 'tc-row' }, action('Check format card', function () {
              var audit = checkFormatAudit(formatAudit);
              var preview = audit.pass ? buildPrintPreview(formatAudit) : null;
              update({ formatAuditResult: audit, printPreview: preview, printPreviewResult: null, printPreviewConfirmed: false, attempts: incrementAttempt(attempts, 'format') });
              if (audit.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.format_matches_inspect_preview', 'Format card matches. Inspect the fixed-width preview before releasing the deck.'));
            }, false, !formatAudit.timeFormat || !formatAudit.rangeFormat || !formatAudit.order)),
            formatAuditResult && h('p', { role: 'status', className: formatAuditResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, formatAuditResult.correct + ' of ' + formatAuditResult.total + ' format checks pass.'),
            formatAuditResult && !formatAuditResult.pass && h('p', { className: 'tc-diag' }, t('stem.trajectorycomputing.recheck_the_field_widths_decimal_preci', 'Recheck the field widths, decimal precision, and printed record order.'))
          ),
          formatAuditResult && formatAuditResult.pass && printPreview && h('div', { className: 'tc-preview-box', 'aria-labelledby': 'tc-preview-title' },
            h('p', { className: 'tc-kicker', style: { color: '#17633f' } }, t('stem.trajectorycomputing.output_trace_fixed_columns', 'Output trace / fixed columns')),
            h('h3', { id: 'tc-preview-title' }, t('stem.trajectorycomputing.inspect_the_line_printer_preview', 'Inspect the line-printer preview.')),
            h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.every_character_occupies_a_column_veri', 'Every character occupies a column. Verify that the values land in the same fields promised by the FORMAT card before releasing the deck to the keypunch room.')),
            h('div', { className: 'tc-print-preview', role: 'img', 'aria-label': t('stem.trajectorycomputing.fixed_width_preview_with_time_in_colum', 'Fixed-width preview with time in columns 7 through 14 and range in columns 22 through 31') },
              h('code', null, printPreview.ruler),
              h('code', null, printPreview.line)
            ),
            h('p', { className: 'tc-lede' }, h('strong', null, 'TIME: '), 'columns ' + printPreview.fields.time.startColumn + '-' + printPreview.fields.time.endColumn + ' / ' + printPreview.fields.time.format + '; ', h('strong', null, 'RANGE: '), 'columns ' + printPreview.fields.range.startColumn + '-' + printPreview.fields.range.endColumn + ' / ' + printPreview.fields.range.format + '.'),
            h('label', { style: { display: 'block', lineHeight: 1.5, marginTop: 10 } },
              h('input', { type: 'checkbox', checked: printPreviewConfirmed, onChange: function (event) { reviseFrom('program', { printPreviewConfirmed: event.target.checked, compileResult: compileResult, formatAuditResult: formatAuditResult, printPreview: printPreview }); } }),
              t('stem.trajectorycomputing.i_checked_the_ruler_field_boundaries_a', ' I checked the ruler, field boundaries, and decimal precision.')
            ),
            h('div', { className: 'tc-row' }, action('Confirm preview and release deck', function () {
              var result = checkPrintPreview(formatAudit, printPreview.line);
              var confirmed = Object.assign({}, result, { confirmed: true });
              update({ printPreviewResult: confirmed });
              if (result.pass && compileResult && compileResult.pass && formatAuditResult && formatAuditResult.pass) markComplete('program', 'cards', { formatAuditResult: formatAuditResult, printPreview: printPreview, printPreviewResult: confirmed, compileResult: compileResult, code: code, deck: STARTER_DECK.slice() });
            }, false, !printPreviewConfirmed)),
            printPreviewResult && h('p', { role: 'status', className: printPreviewResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, printPreviewResult.pass ? 'Preview confirmed. The fixed-width record is ready for the deck.' : 'Preview mismatch. Recheck the format card and column ruler.')
          ),
          h('div', { className: 'tc-row' },
            action('Compile listing', function () {
              var result = compileProgram(code);
              var nextAttempts = incrementAttempt(attempts, 'compile');
              var nextHistory = mergeDiagnosticCodes(diagnosticHistory, result.diagnostics);
              update({ compileResult: result, diagnosticCursor: 0, attempts: nextAttempts, diagnosticHistory: nextHistory });
              if (result.pass && formatAuditResult && formatAuditResult.pass && printPreviewResult && printPreviewResult.pass) markComplete('program', 'cards', { compileResult: result, formatAuditResult: formatAuditResult, printPreview: printPreview, printPreviewResult: printPreviewResult, code: code, deck: STARTER_DECK.slice(), attempts: nextAttempts, diagnosticHistory: nextHistory });
              else if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.compile_then_format', 'Listing compiles. Audit the format card and fixed-width preview before continuing.'));
              else {
                focusResult('tc-compiler-diagnostics');
                if (typeof ctx.announceToSR === 'function') ctx.announceToSR(result.diagnostics.length + t('stem.trajectorycomputing.compiler_diagnostics_found', ' compiler diagnostics found.'));
              }
            }),
            action('Restore training listing', function () { reviseFrom('program', { code: STARTER_PROGRAM, diagnosticCursor: 0 }); }, true)
          )
        );
      }

      function renderCards() {
        return h('section', { role: 'tabpanel', id: 'tc-panel-cards', 'aria-labelledby': 'tc-tab-cards' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.station_04_keypunch_room', 'Station 04 / keypunch room')),
          h('h2', { id: 'tc-stage-heading-cards', className: 'tc-heading', tabIndex: -1 }, t('stem.trajectorycomputing.put_the_card_deck_in_machine_order', 'Put the card deck in machine order.')),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.a_dropped_deck_could_turn_a_correct_pr', 'A dropped deck could turn a correct program into a failed job. Use the printed sequence field from columns 73-80. One pair is out of order.')),
          h('div', { role: 'list', 'aria-label': t('stem.trajectorycomputing.punch_card_deck', 'Punch-card deck') }, deck.map(function (id, index) {
            var card = getCard(id);
            return h('div', { className: 'tc-card', role: 'listitem', key: card.id },
              h('span', { 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
              h('span', null, card.text),
              h('span', { className: 'tc-seq' }, card.seq),
              h('span', { className: 'tc-card-actions' },
                h('button', { type: 'button', className: 'tc-small', disabled: index === 0, onClick: function () { reviseFrom('cards', { deck: moveCard(deck, index, -1) }); }, 'aria-label': t('stem.trajectorycomputing.move_card', 'Move card ') + card.seq + t('stem.trajectorycomputing.up', ' up') }, '\u2191 ' + t('stem.trajectorycomputing.up_label', 'Up')), ' ',
                h('button', { type: 'button', className: 'tc-small', disabled: index === deck.length - 1, onClick: function () { reviseFrom('cards', { deck: moveCard(deck, index, 1) }); }, 'aria-label': t('stem.trajectorycomputing.move_card', 'Move card ') + card.seq + t('stem.trajectorycomputing.down', ' down') }, '\u2193 ' + t('stem.trajectorycomputing.down_label', 'Down'))
              )
            );
          })),
          deckResult && h('p', { id: 'tc-deck-summary', role: 'status', tabIndex: -1, className: deckResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, localizeFeedback(deckResult.message)),
          h('div', { className: 'tc-row' },
            action('Run sequence check', function () {
              var result = validateDeck(deck);
              var nextAttempts = incrementAttempt(attempts, 'deck');
              update({ deckResult: result, attempts: nextAttempts });
              if (result.pass) markComplete('cards', 'batch', { deckResult: result, deck: deck, attempts: nextAttempts });
              else focusResult('tc-deck-summary');
            }),
            action('Return deck to training setup', function () { reviseFrom('cards', { deck: STARTER_DECK.slice() }); }, true)
          )
        );
      }

      function renderChart() {
        return h('figure', null,
          h('p', { className: 'tc-chart-mobile-hint' }, t('stem.trajectorycomputing.scroll_chart_hint', '\u2194 Scroll the chart horizontally to keep every label readable.')),
          h('div', { className: 'tc-chart-frame', role: 'region', tabIndex: 0, 'aria-label': t('stem.trajectorycomputing.scrollable_trajectory_chart', 'Scrollable trajectory chart') },
          h('svg', { className: 'tc-chart', viewBox: '0 0 680 245', role: 'img', 'aria-labelledby': 'tc-chart-title tc-chart-desc' },
            h('title', { id: 'tc-chart-title' }, t('stem.trajectorycomputing.aurora_test_3_predicted_trajectory', 'Aurora Test 3 predicted trajectory')),
            h('desc', { id: 'tc-chart-desc' }, 'A parabolic flight path begins 30 meters above ground, reaches about ' + round(EXPECTED.peakHeight, 0) + ' meters, and lands about ' + round(EXPECTED.range, 0) + ' meters downrange inside the target zone.'),
            h('line', { x1: 34, y1: 212, x2: 658, y2: 212, stroke: '#9ad7c0', strokeWidth: 2 }),
            h('rect', { x: 34 + MISSION.zoneMin / 4900 * 624, y: 201, width: (MISSION.zoneMax - MISSION.zoneMin) / 4900 * 624, height: 11, fill: '#ff8a5b' }),
            h('polyline', { points: trajectoryPath(), fill: 'none', stroke: '#fff0b5', strokeWidth: 4, strokeLinecap: 'round' }),
            h('circle', { cx: 34 + EXPECTED.range / 4900 * 624, cy: 212, r: 7, fill: '#ffbf47' }),
            h('text', { x: 38, y: 232, fill: '#d8eee5', fontSize: 12 }, t('stem.trajectorycomputing.0_m', '0 m')),
            h('text', { x: 563, y: 232, fill: '#d8eee5', fontSize: 12 }, t('stem.trajectorycomputing.target_zone', 'target zone'))
          )),
          h('figcaption', { className: 'tc-lede' }, 'Text alternative: peak height ' + round(EXPECTED.peakHeight, 1) + ' m; flight time ' + round(EXPECTED.flightTime, 2) + ' s; landing distance ' + round(EXPECTED.range, 1) + ' m; predicted landing is inside the 4,550-4,700 m target zone.')
        );
      }

      function renderComparisonChart(comparison) {
        var comparisonMission = Object.assign({}, MISSION, { angle: comparison.angle });
        var maxRange = Math.max(EXPECTED.range, comparison.result.range) * 1.08;
        var maxPeak = Math.max(EXPECTED.peakHeight, comparison.result.peakHeight) * 1.16;
        var plotWidth = 624;
        var plotHeight = 190;
        var baselinePeakX = 34 + (EXPECTED.vx * EXPECTED.peakTime / maxRange) * plotWidth;
        var baselinePeakY = 212 - (EXPECTED.peakHeight / maxPeak) * plotHeight;
        var comparisonPeakX = 34 + (comparison.result.vx * comparison.result.peakTime / maxRange) * plotWidth;
        var comparisonPeakY = 212 - (comparison.result.peakHeight / maxPeak) * plotHeight;
        var baselineLandingX = 34 + EXPECTED.range / maxRange * plotWidth;
        var comparisonLandingX = 34 + comparison.result.range / maxRange * plotWidth;
        var xTicks = [0, 0.25, 0.5, 0.75, 1];
        var yTicks = [0, 0.5, 1];
        var zoneX = 34 + MISSION.zoneMin / maxRange * plotWidth;
        var zoneWidth = (MISSION.zoneMax - MISSION.zoneMin) / maxRange * plotWidth;
        return h('figure', { className: 'tc-comparison-figure' },
          h('p', { className: 'tc-chart-mobile-hint' }, t('stem.trajectorycomputing.scroll_comparison_chart_hint', '\u2194 Scroll the comparison chart horizontally to keep axes and annotations readable.')),
          h('div', { className: 'tc-chart-frame', role: 'region', tabIndex: 0, 'aria-label': t('stem.trajectorycomputing.scrollable_comparison_chart', 'Scrollable baseline and comparison trajectory chart') },
          h('svg', { className: 'tc-chart', viewBox: '0 0 680 270', role: 'img', 'aria-labelledby': 'tc-comparison-title tc-comparison-desc' },
            h('title', { id: 'tc-comparison-title' }, t('stem.trajectorycomputing.dual_trajectory_comparison', 'Baseline and comparison trajectory')),
            h('desc', { id: 'tc-comparison-desc' }, 'Annotated distance-by-height chart. The solid 38-degree baseline peaks at ' + round(EXPECTED.peakHeight, 1) + ' meters and lands at ' + round(EXPECTED.range, 1) + ' meters. The dashed ' + comparison.angle + '-degree path peaks at ' + round(comparison.result.peakHeight, 1) + ' meters and lands at ' + round(comparison.result.range, 1) + ' meters, ' + comparison.relation + ' than baseline. The target zone is shown with a diagonal pattern.'),
            h('defs', null,
              h('pattern', { id: 'tc-target-hatch', width: 8, height: 8, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
                h('rect', { width: 8, height: 8, fill: '#6f351f' }),
                h('line', { x1: 0, y1: 0, x2: 0, y2: 8, stroke: '#ffcf70', strokeWidth: 3 })
              )
            ),
            xTicks.map(function (tick, index) {
              var x = 34 + tick * plotWidth;
              return h('g', { key: 'x-tick-' + index },
                h('line', { x1: x, y1: 22, x2: x, y2: 212, stroke: '#507268', strokeWidth: 1 }),
                h('text', { x: x, y: 231, textAnchor: index === 0 ? 'start' : (index === xTicks.length - 1 ? 'end' : 'middle'), fill: '#fff', fontSize: 11 }, Math.round(maxRange * tick).toLocaleString() + ' m')
              );
            }),
            yTicks.map(function (tick, index) {
              var y = 212 - tick * plotHeight;
              return h('g', { key: 'y-tick-' + index },
                h('line', { x1: 34, y1: y, x2: 658, y2: y, stroke: '#507268', strokeWidth: 1 }),
                h('text', { x: 29, y: y + 4, textAnchor: 'end', fill: '#fff', fontSize: 11 }, Math.round(maxPeak * tick))
              );
            }),
            h('rect', { x: zoneX, y: 22, width: zoneWidth, height: 190, fill: 'url(#tc-target-hatch)', opacity: 0.6 }),
            h('line', { x1: 34, y1: 212, x2: 658, y2: 212, stroke: '#d8eee5', strokeWidth: 2 }),
            h('line', { x1: 34, y1: 22, x2: 34, y2: 212, stroke: '#d8eee5', strokeWidth: 2 }),
            h('polyline', { points: trajectoryPathFor(MISSION, EXPECTED, { maxRange: maxRange, maxPeak: maxPeak }), fill: 'none', stroke: '#ffcf70', strokeWidth: 4, strokeLinecap: 'round' }),
            h('polyline', { points: trajectoryPathFor(comparisonMission, comparison.result, { maxRange: maxRange, maxPeak: maxPeak }), fill: 'none', stroke: '#9ad7c0', strokeWidth: 4, strokeDasharray: '10 7', strokeLinecap: 'round' }),
            h('circle', { cx: baselinePeakX, cy: baselinePeakY, r: 6, fill: '#ffcf70', stroke: '#102d27', strokeWidth: 2 }),
            h('rect', { x: comparisonPeakX - 6, y: comparisonPeakY - 6, width: 12, height: 12, fill: '#9ad7c0', stroke: '#102d27', strokeWidth: 2 }),
            h('circle', { cx: baselineLandingX, cy: 212, r: 6, fill: '#ffcf70', stroke: '#102d27', strokeWidth: 2 }),
            h('rect', { x: comparisonLandingX - 6, y: 206, width: 12, height: 12, fill: '#9ad7c0', stroke: '#102d27', strokeWidth: 2 }),
            h('text', { x: baselinePeakX, y: baselinePeakY - 10, textAnchor: 'middle', fill: '#fff0b5', fontSize: 11, fontWeight: 800 }, '38\u00b0 peak ' + round(EXPECTED.peakHeight, 0) + ' m'),
            h('text', { x: comparisonPeakX, y: comparisonPeakY + 19, textAnchor: 'middle', fill: '#c9f6df', fontSize: 11, fontWeight: 800 }, comparison.angle + '\u00b0 peak ' + round(comparison.result.peakHeight, 0) + ' m'),
            h('text', { x: baselineLandingX - 5, y: 199, textAnchor: 'end', fill: '#fff0b5', fontSize: 11, fontWeight: 800 }, '38\u00b0 lands ' + round(EXPECTED.range, 0) + ' m'),
            h('text', { x: comparisonLandingX - 5, y: 188, textAnchor: 'end', fill: '#c9f6df', fontSize: 11, fontWeight: 800 }, comparison.angle + '\u00b0 lands ' + round(comparison.result.range, 0) + ' m'),
            h('text', { x: 346, y: 258, textAnchor: 'middle', fill: '#fff', fontSize: 12, fontWeight: 800 }, t('stem.trajectorycomputing.distance_m', 'Distance (m)')),
            h('text', { x: 7, y: 118, fill: '#fff', fontSize: 12, transform: 'rotate(-90 7 118)' }, t('stem.trajectorycomputing.height_m', 'Height (m)')),
            h('text', { x: zoneX + zoneWidth / 2, y: 36, textAnchor: 'middle', fill: '#fff', fontSize: 11, fontWeight: 900 }, t('stem.trajectorycomputing.target_zone', 'TARGET ZONE'))
          )),
          h('ul', { className: 'tc-chart-legend', 'aria-label': t('stem.trajectorycomputing.trajectory_legend', 'Trajectory legend') },
            h('li', null, h('span', { className: 'tc-legend-line', 'aria-hidden': 'true' }), t('stem.trajectorycomputing.solid_baseline', 'Solid: 38-degree baseline')),
            h('li', null, h('span', { className: 'tc-legend-line compare', 'aria-hidden': 'true' }), t('stem.trajectorycomputing.dashed_comparison', 'Dashed: ') + comparison.angle + t('stem.trajectorycomputing.degree_comparison', '-degree comparison'))
          ),
          h('figcaption', { className: 'tc-lede' }, t('stem.trajectorycomputing.comparison_text_alternative', 'Text alternative: ') + 'baseline ' + round(EXPECTED.range, 1) + ' m; comparison ' + round(comparison.result.range, 1) + ' m; change ' + (comparison.difference >= 0 ? '+' : '') + round(comparison.difference, 1) + ' m.')
        );
      }

      function renderAngleComparisonTable(comparison) {
        var rows = [
          [t('stem.trajectorycomputing.baseline_case', '38-degree baseline'), MISSION.angle + ' deg', MISSION.speed + ' m/s', round(EXPECTED.flightTime, 2) + ' s', round(EXPECTED.peakHeight, 1) + ' m', round(EXPECTED.range, 1) + ' m', EXPECTED.inZone ? t('stem.trajectorycomputing.inside', 'Inside') : t('stem.trajectorycomputing.outside', 'Outside')],
          [comparison.angle + t('stem.trajectorycomputing.degree_comparison_case', '-degree comparison'), comparison.angle + ' deg', MISSION.speed + ' m/s', round(comparison.result.flightTime, 2) + ' s', round(comparison.result.peakHeight, 1) + ' m', round(comparison.result.range, 1) + ' m', comparison.result.inZone ? t('stem.trajectorycomputing.inside', 'Inside') : t('stem.trajectorycomputing.outside', 'Outside')]
        ];
        return h('details', { className: 'tc-angle-data' },
          h('summary', null, t('stem.trajectorycomputing.open_numeric_chart_data', 'Open numeric chart data')),
          h('div', { className: 'tc-replay-table-wrap' },
            h('table', { className: 'tc-replay-table' },
              h('caption', null, t('stem.trajectorycomputing.angle_comparison_data_caption', 'Numeric data for the baseline and comparison trajectories')),
              h('thead', null, h('tr', null,
                [t('stem.trajectorycomputing.case', 'Case'), t('stem.trajectorycomputing.angle_2', 'Angle'), t('stem.trajectorycomputing.speed', 'Speed'), t('stem.trajectorycomputing.flight_time', 'Flight time'), t('stem.trajectorycomputing.peak_height', 'Peak height'), t('stem.trajectorycomputing.landing_range', 'Landing range'), t('stem.trajectorycomputing.target_zone', 'Target zone')].map(function (label) { return h('th', { scope: 'col', key: label }, label); })
              )),
              h('tbody', null, rows.map(function (row) {
                return h('tr', { key: row[0] }, row.map(function (value, index) { return index === 0 ? h('th', { scope: 'row', key: value }, value) : h('td', { key: index }, value); }));
              }))
            )
          )
        );
      }

      function replayInputName(key) {
        var names = {
          speed: t('stem.trajectorycomputing.launch_speed', 'Launch speed'),
          angle: t('stem.trajectorycomputing.launch_angle', 'Launch angle'),
          height: t('stem.trajectorycomputing.release_height', 'Release height'),
          gravity: t('stem.trajectorycomputing.gravity', 'Gravity')
        };
        return names[key] || key;
      }

      function replayInputValue(mission, key) {
        if (key === 'speed') return mission.speed + ' m/s';
        if (key === 'angle') return mission.angle + ' degrees';
        if (key === 'height') return mission.height + ' m';
        return mission.gravity + ' m/s2';
      }

      function renderReplayInputCard(mission, profile) {
        return h('section', { className: 'tc-replay-card-brief', 'aria-label': mission.name + ' input card' },
          h('p', null,
            h('strong', null, mission.name + ': ' + profile.changedInputCount + ' of ' + profile.totalInputs + ' modeled launch inputs differ from Aurora.'),
            ' Use these inputs to make an evidence-based prediction before computing.'
          ),
          h('dl', { className: 'tc-replay-input-grid' }, ['speed', 'angle', 'height', 'gravity'].map(function (key) {
            var changed = profile.changedInputs.indexOf(key) >= 0;
            return h('div', { key: key, className: changed ? 'is-changed' : 'is-fixed' },
              h('dt', null, replayInputName(key)),
              h('dd', null,
                replayInputValue(mission, key),
                h('span', { className: 'tc-replay-input-state' }, changed ? 'Changed from baseline' : 'Same as baseline')
              )
            );
          }))
        );
      }

      function renderReplayEvidenceKey(replay) {
        var profile = getReplayComparisonProfile(replay.mission.id);
        var states = [
          { id: 'reproduction', title: 'Same inputs', subtitle: 'Reproducibility', pattern: '0 inputs changed' },
          { id: 'controlled', title: 'One controlled change', subtitle: 'Isolated comparison', pattern: '1 input changed' },
          { id: 'combined', title: 'Combined changes', subtitle: 'Outcome comparison only', pattern: '2 or more inputs changed' }
        ];
        var changedNames = profile.changedInputs.map(function (key) { return replayInputName(key).toLowerCase(); });
        var summary = profile.type === 'reproduction'
          ? 'Same inputs. This can test whether the same inputs reproduce the baseline result.'
          : (profile.type === 'controlled'
            ? 'One controlled change (' + changedNames[0] + '). This can isolate that input\'s effect in this model because the other inputs stayed fixed.'
            : 'Combined changes (' + changedNames.join(', ') + '). This compares the overall outcome but cannot isolate one cause.');
        return h('section', { className: 'tc-replay-evidence', role: 'region', 'aria-labelledby': 'tc-replay-evidence-title' },
          h('h5', { id: 'tc-replay-evidence-title' }, 'Comparison evidence'),
          h('ul', { className: 'tc-replay-evidence-key' }, states.map(function (item) {
            var current = item.id === profile.type;
            return h('li', { key: item.id, className: current ? 'is-current' : '', 'aria-current': current ? 'true' : undefined },
              h('strong', null, item.title),
              h('span', null, item.subtitle),
              h('span', null, item.pattern),
              current && h('span', { className: 'tc-replay-current' }, 'Current replay - ' + profile.changedInputCount + ' input' + (profile.changedInputCount === 1 ? '' : 's') + ' changed')
            );
          })),
          h('p', { id: 'tc-replay-evidence-summary', className: 'tc-lede' }, summary)
        );
      }

      function renderReplayComparisonTable(replay, describedBy) {
        function value(number, places, unit) { return round(number, places) + ' ' + unit; }
        function delta(number, places, unit) { return (number >= 0 ? '+' : '') + round(number, places) + ' ' + unit; }
        var rows = [
          [t('stem.trajectorycomputing.launch_speed', 'Launch speed'), value(MISSION.speed, 0, 'm/s'), value(replay.mission.speed, 0, 'm/s'), delta(replay.mission.speed - MISSION.speed, 0, 'm/s')],
          [t('stem.trajectorycomputing.launch_angle', 'Launch angle'), value(MISSION.angle, 0, 'deg'), value(replay.mission.angle, 0, 'deg'), delta(replay.mission.angle - MISSION.angle, 0, 'deg')],
          [t('stem.trajectorycomputing.release_height', 'Release height'), value(MISSION.height, 0, 'm'), value(replay.mission.height, 0, 'm'), delta(replay.mission.height - MISSION.height, 0, 'm')],
          [t('stem.trajectorycomputing.flight_time', 'Flight time'), value(EXPECTED.flightTime, 2, 's'), value(replay.result.flightTime, 2, 's'), delta(replay.flightTimeDifference, 2, 's')],
          [t('stem.trajectorycomputing.peak_height', 'Peak height'), value(EXPECTED.peakHeight, 1, 'm'), value(replay.result.peakHeight, 1, 'm'), delta(replay.peakHeightDifference, 1, 'm')],
          [t('stem.trajectorycomputing.landing_range', 'Landing range'), value(EXPECTED.range, 1, 'm'), value(replay.result.range, 1, 'm'), delta(replay.rangeDifference, 1, 'm')]
        ];
        var wrapperProps = { className: 'tc-replay-table-wrap', role: 'region', tabIndex: 0, 'aria-label': 'Scrollable Aurora and ' + replay.mission.name + ' comparison table' };
        if (describedBy) wrapperProps['aria-describedby'] = describedBy;
        return h('div', { className: 'tc-replay-table-region' },
          h('p', { className: 'tc-chart-mobile-hint' }, '\u2194 Scroll horizontally to compare every column.'),
          h('div', wrapperProps,
            h('table', { className: 'tc-replay-table' },
              h('caption', null, t('stem.trajectorycomputing.replay_comparison_caption', 'Aurora baseline compared with selected replay card')),
              h('thead', null, h('tr', null,
                h('th', { scope: 'col' }, t('stem.trajectorycomputing.measure', 'Measure')),
                h('th', { scope: 'col' }, t('stem.trajectorycomputing.aurora_baseline', 'Aurora baseline')),
                h('th', { scope: 'col' }, replay.mission.name),
                h('th', { scope: 'col' }, t('stem.trajectorycomputing.change', 'Change'))
              )),
              h('tbody', null, rows.map(function (row) {
                return h('tr', { key: row[0] }, h('th', { scope: 'row' }, row[0]), h('td', null, row[1]), h('td', null, row[2]), h('td', null, row[3]));
              }))
            )
          )
        );
      }

      function renderHistoryCheckpoint() {
        var checkpoints = {
          briefing: [t('stem.trajectorycomputing.history_checkpoint_briefing', 'Work was organized across calculation and checking roles; this lab uses fictional desk codes instead of learner names.'), t('stem.trajectorycomputing.nasa_biographies', 'NASA biographies')],
          worksheet: [t('stem.trajectorycomputing.history_checkpoint_worksheet', 'NASA records Katherine Johnson\'s expertise in trajectory calculations and in checking machine-produced results.'), t('stem.trajectorycomputing.nasa_katherine_johnson_biography', 'NASA: Katherine Johnson biography')],
          program: [t('stem.trajectorycomputing.history_checkpoint_program', 'NASA records Dorothy Vaughan\'s leadership in computing and her expertise as an early FORTRAN programmer.'), t('stem.trajectorycomputing.nasa_dorothy_vaughan_biography', 'NASA: Dorothy Vaughan biography')],
          cards: [t('stem.trajectorycomputing.history_checkpoint_cards', 'This fictional deck models how mathematical instructions had to be prepared as an ordered, machine-readable job.'), t('stem.trajectorycomputing.nasa_dorothy_vaughan_biography', 'NASA: Dorothy Vaughan biography')],
          batch: [t('stem.trajectorycomputing.history_checkpoint_batch', 'Electronic computation changed the tools, while mathematical preparation, debugging, and interpretation remained human responsibilities.'), t('stem.trajectorycomputing.nasa_computing_biographies', 'NASA computing biographies')],
          verify: [t('stem.trajectorycomputing.history_checkpoint_verify', 'NASA documents independent checking as an essential part of Katherine Johnson\'s trajectory work.'), t('stem.trajectorycomputing.nasa_katherine_johnson_biography', 'NASA: Katherine Johnson biography')]
        };
        var item = checkpoints[stage] || checkpoints.briefing;
        var url = (stage === 'program' || stage === 'cards') ? 'https://www.nasa.gov/people/dorothy-vaughan/' : 'https://www.nasa.gov/centers-and-facilities/langley/katherine-johnson-biography/';
        return h('section', { className: 'tc-history-checkpoint', 'aria-labelledby': 'tc-history-checkpoint-title' },
          h('h4', { id: 'tc-history-checkpoint-title' }, t('stem.trajectorycomputing.history_checkpoint', 'History checkpoint') + ' / ' + currentStation[1]),
          h('p', null, item[0]),
          supportProfile.checkpointPrompt && h('div', null,
            h('p', null, h('strong', null, t('stem.trajectorycomputing.connection_prompt', 'Connection prompt: ')), t('stem.trajectorycomputing.connection_prompt_text', 'What human judgment or safeguard does this station add?')),
            h('label', { className: 'tc-field', htmlFor: 'tc-connection-note' }, t('stem.trajectorycomputing.optional_connection_note', 'Optional connection note'),
              h('textarea', { id: 'tc-connection-note', maxLength: 300, value: String(connectionNoteState[stage] || '').slice(0, 300), placeholder: t('stem.trajectorycomputing.connection_note_starter', 'Human expertise mattered here because...'), 'aria-describedby': 'tc-connection-note-help', onChange: function (event) { setConnectionNote(event.target.value); } }),
              h('small', { id: 'tc-connection-note-help' }, t('stem.trajectorycomputing.connection_note_privacy', 'Use no names or personal details. Included in saved evidence and the completion report. ') + String(connectionNoteState[stage] || '').slice(0, 300).length + '/300')
            ),
            connectionNotes.notes[stage] && h('p', { className: 'tc-ok' }, t('stem.trajectorycomputing.connection_note_recorded', 'Connection note recorded for this station.'))
          ),
          h('a', { className: 'tc-source-link', href: url, target: '_blank', rel: 'noreferrer' }, item[1])
        );
      }

      function renderBatch() {
        var complete = runStatus === 'complete';
        var batchTrace = getBatchProcessTrace(runStatus, batchFailure && batchFailure.stage);
        return h('section', { role: 'tabpanel', id: 'tc-panel-batch', 'aria-labelledby': 'tc-tab-batch' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.station_05_electronic_computation_room', 'Station 05 / electronic computation room')),
          h('h2', { id: 'tc-stage-heading-batch', className: 'tc-heading', tabIndex: -1 }, t('stem.trajectorycomputing.submit_the_deck_as_a_batch_job', 'Submit the deck as a batch job.')),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.early_programmers_did_not_receive_inst', 'Early programmers did not receive instant feedback. A prepared deck was read into the machine and the result returned as a printed listing.')),
          h('div', { className: 'tc-machine', role: 'region', 'aria-label': t('stem.trajectorycomputing.batch_computer_console', 'Batch computer console') },
            h('div', { className: 'tc-lights', 'aria-hidden': 'true' },
              batchTrace.steps.map(function (step) { return h('span', { key: step.id, className: 'tc-light' + (step.state === 'ready' || step.state === 'complete' ? ' on' : '') }); })
            ),
            h('p', { style: { fontFamily: 'ui-monospace, monospace', margin: 0 }, role: 'status' }, batchTrace.consoleText),
            h('section', { className: 'tc-batch-process', 'aria-labelledby': 'tc-batch-process-title' },
              h('h3', { id: 'tc-batch-process-title' }, t('stem.trajectorycomputing.batch_process_trace', 'Batch process trace')),
              h('p', null, t('stem.trajectorycomputing.batch_process_trace_help', 'The entire job moves through these units before a person can inspect the printed result.')),
              h('ol', { className: 'tc-batch-trace', 'aria-label': t('stem.trajectorycomputing.batch_machine_sequence', 'Batch machine sequence') },
                batchTrace.steps.map(function (step) {
                  return h('li', {
                    key: step.id,
                    className: 'tc-batch-step is-' + step.state,
                    'data-machine-step': step.id,
                    'aria-current': step.state === 'ready' ? 'step' : undefined
                  },
                    h('span', { className: 'tc-batch-step-no', 'aria-hidden': 'true' }, step.number),
                    h('strong', null, step.label),
                    h('span', { className: 'tc-batch-step-detail' }, step.detail),
                    h('span', { className: 'tc-batch-step-status' }, (step.state === 'complete' ? '\u2713 ' : (step.state === 'error' ? '! ' : '')) + step.stateLabel)
                  );
                })
              )
            ),
            h('div', { className: 'tc-row' }, action(complete ? t('stem.trajectorycomputing.run_as_new_job', 'Run as new job') : t('stem.trajectorycomputing.feed_deck_and_run_job', 'Feed deck and run job'), function () {
              var hadSignedEvidence = !!(completed.batch || completed.verify || verificationResult);
              var submission = prepareBatchSubmission(d, code, deck, Date.now());
              ctx.setToolData(function (prev) {
                var result = Object.assign({}, prev || {});
                result[STATE_KEY] = submission;
                return result;
              });
              if (submission.runStatus === 'error') {
                if (typeof ctx.addToast === 'function') ctx.addToast(submission.batchFailure.message, 'error');
                if (typeof ctx.announceToSR === 'function') ctx.announceToSR(submission.batchFailure.message);
                return;
              }
              if (typeof ctx.announceToSR === 'function') ctx.announceToSR(hadSignedEvidence
                ? t('stem.trajectorycomputing.batch_rerun_cleared_signoff', 'New batch run complete. The earlier read-back and verification signoff were cleared and must be checked again.')
                : t('stem.trajectorycomputing.batch_complete_review_output', 'Batch job complete. Review the line-printer output and trajectory before verification.'));
            }))
          ),
          runStatus === 'error' && h('p', { role: 'alert', className: 'tc-diag' }, batchFailure ? batchFailure.message : t('stem.trajectorycomputing.job_rejected_return_to_the_program_and', 'JOB REJECTED. Return to the program and deck stations to restore a valid job.')),
          complete && h('div', null,
            d.batchRunId && h('p', { className: 'tc-next-cue' }, h('strong', null, t('stem.trajectorycomputing.run_record', 'Run record: ')), d.batchRunId + t('stem.trajectorycomputing.requires_fresh_readback', '. This run requires its own read-back and verification signoff.')),
            h('h3', null, t('stem.trajectorycomputing.line_printer_output', 'Line-printer output')),
            h('pre', { className: 'tc-printout' }, d.printout || formatPrintout(EXPECTED)),
            renderChart(),
            h('section', { className: 'tc-readback-box', 'aria-labelledby': 'tc-readback-title' },
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.output_interpretation_human_read_back', 'Output interpretation / human read-back')),
              h('h3', { id: 'tc-readback-title' }, t('stem.trajectorycomputing.read_the_machine_result_before_signing', 'Read the machine result before signing it.')),
              h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.a_printed_job_can_be_accurate_and_stil', 'A printed job can be accurate and still be misread. Match each status claim to the line-printer output, then release the record to independent verification.')),
              h('div', { className: 'tc-role-grid' },
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.compiler_status', 'Compiler status'),
                  h('select', { value: batchReadback.compile || '', onChange: function (event) { setBatchReadbackField('compile', event.target.value); } },
                    h('option', { value: '' }, t('stem.trajectorycomputing.choose_status', 'Choose status')),
                    h('option', { value: 'zero-errors' }, t('stem.trajectorycomputing.0_errors', '0 errors')),
                    h('option', { value: 'errors' }, t('stem.trajectorycomputing.errors_reported', 'Errors reported'))
                  )
                ),
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.deck_status', 'Deck status'),
                  h('select', { value: batchReadback.deck || '', onChange: function (event) { setBatchReadbackField('deck', event.target.value); } },
                    h('option', { value: '' }, t('stem.trajectorycomputing.choose_status_2', 'Choose status')),
                    h('option', { value: 'ordered' }, t('stem.trajectorycomputing.00010001_00010009_in_order', '00010001-00010009 / in order')),
                    h('option', { value: 'misordered' }, t('stem.trajectorycomputing.sequence_error', 'Sequence error'))
                  )
                ),
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.target_zone_result', 'Target-zone result'),
                  h('select', { value: batchReadback.zone || '', onChange: function (event) { setBatchReadbackField('zone', event.target.value); } },
                    h('option', { value: '' }, t('stem.trajectorycomputing.choose_result', 'Choose result')),
                    h('option', { value: 'inside' }, t('stem.trajectorycomputing.inside_4550_4700_m', 'Inside 4550-4700 m')),
                    h('option', { value: 'outside' }, t('stem.trajectorycomputing.outside_4550_4700_m', 'Outside 4550-4700 m'))
                  )
                ),
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.printed_range_m', 'Printed range (m)'),
                  h('input', { type: 'number', step: '0.1', inputMode: 'decimal', value: batchReadback.range == null ? '' : batchReadback.range, onChange: function (event) { setBatchReadbackField('range', event.target.value); } })
                )
              ),
              batchReadbackResult && h('p', { role: 'status', className: batchReadbackResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, batchReadbackResult.correct + ' of ' + batchReadbackResult.total + ' machine read-back fields match the printout.'),
              h('div', { className: 'tc-row' },
                action('Check machine read-back', function () {
                  var result = checkBatchReadback(batchReadback);
                  update({ batchReadbackResult: result, attempts: incrementAttempt(attempts, 'readback') });
                  if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.readback_matches_release', 'Machine read-back matches. Release it to independent verification.'));
                }, false, !batchReadback.compile || !batchReadback.deck || !batchReadback.zone || batchReadback.range == null || batchReadback.range === ''),
                action('Continue to independent verification', function () {
                  var result = batchReadbackResult || checkBatchReadback(batchReadback);
                  if (result.pass) markComplete('batch', 'verify', { batchReadback: batchReadback, batchReadbackResult: result });
                }, true, !batchReadbackResult || !batchReadbackResult.pass)
              )
            )
          )
        );
      }

      function renderVerify() {
        var passed = verificationResult && verificationResult.pass && reproducibilityResult && reproducibilityResult.pass;
        var deskCodes = [
          ['desk-a', 'Desk A / calculator table'],
          ['desk-b', 'Desk B / checking table'],
          ['desk-c', 'Desk C / review table']
        ];
        return h('section', { role: 'tabpanel', id: 'tc-panel-verify', 'aria-labelledby': 'tc-tab-verify' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.station_06_independent_check', 'Station 06 / independent check')),
          h('h2', { id: 'tc-stage-heading-verify', className: 'tc-heading', tabIndex: -1 }, t('stem.trajectorycomputing.never_let_the_machine_check_itself', 'Never let the machine check itself.')),
          h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.use_your_original_worksheet_not_the_pr', 'Use your original worksheet\u2014not the printout\u2014to record the independent range. Then decide whether the prediction falls inside the assigned landing zone.')),
          h('form', { onSubmit: function (event) {
            event.preventDefault();
            if (!verificationReadiness.ready) {
              focusResult('tc-signing-status');
              if (typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.signing_not_ready', 'Verification is not ready to sign. Complete the remaining signing checks.'));
              return;
            }
            if (!reproducibilityResult || !reproducibilityResult.pass) {
              var note = checkReproducibilityNote(reproducibility);
              update({ reproducibilityResult: note });
              focusResult('tc-repro-summary');
              if (typeof ctx.announceToSR === 'function') ctx.announceToSR(localizeFeedback(note.message));
              return;
            }
            var result = verifyIndependentCheck(verification.range, verification.verdict, Object.assign({ workPattern: workPattern }, verification));
            var nextAttempts = incrementAttempt(attempts, 'verification');
            if (result.pass) {
              update({ verificationResult: result, attempts: nextAttempts, awarded: true, completed: Object.assign({}, completed, { verify: true }), auditTrail: recordAuditHandoff(auditTrail, 'verify', 'complete', Date.now()), revisionNotice: null });
              if (!d.awarded) {
                if (typeof ctx.awardXP === 'function') ctx.awardXP(TOOL_ID, 30, 'Trajectory Computing Lab verified');
                if (typeof ctx.celebrate === 'function') ctx.celebrate();
                if (typeof ctx.addToast === 'function') ctx.addToast(t('stem.trajectorycomputing.independent_verification_complete', 'Independent verification complete.'), 'success');
              }
            } else {
              update({ verificationResult: result, attempts: nextAttempts });
            }
            focusResult(result.pass ? 'tc-certificate-title' : 'tc-verification-summary');
          } },
            h('div', { className: 'tc-fields' },
              h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.independent_range_from_worksheet_meter', 'Independent range from worksheet (meters)'), h('input', { type: 'number', step: 'any', value: verification.range == null ? '' : verification.range, onChange: function (event) { setVerificationField('range', event.target.value); } })),
              h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
                h('legend', { className: 'tc-field' }, t('stem.trajectorycomputing.mission_recommendation', 'Mission recommendation')),
                h('label', null, h('input', { type: 'radio', name: 'tc-verdict', value: 'go', checked: verification.verdict === 'go', onChange: function () { setVerificationField('verdict', 'go'); } }), t('stem.trajectorycomputing.go_prediction_is_inside_the_zone', ' GO - prediction is inside the zone')), h('br'),
                h('label', null, h('input', { type: 'radio', name: 'tc-verdict', value: 'hold', checked: verification.verdict === 'hold', onChange: function () { setVerificationField('verdict', 'hold'); } }), t('stem.trajectorycomputing.hold_prediction_is_outside_the_zone', ' HOLD - prediction is outside the zone'))
              )
            ),
            h('fieldset', { className: 'tc-role-box' },
              h('legend', { style: { fontWeight: 900 } }, workPattern === 'pair' ? 'Two-desk verification record' : 'Solo second-pass record'),
              workPattern === 'pair' ? h('div', { className: 'tc-role-grid' },
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.calculation_desk_code', 'Calculation desk code'),
                  h('select', { value: verification.calculatorDesk || '', onChange: function (event) { setVerificationField('calculatorDesk', event.target.value); } },
                    h('option', { value: '' }, t('stem.trajectorycomputing.choose_a_desk', 'Choose a desk')),
                    deskCodes.map(function (desk) { return h('option', { value: desk[0], key: 'calc-' + desk[0] }, desk[1]); })
                  )
                ),
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.independent_verifier_desk_code', 'Independent verifier desk code'),
                  h('select', { value: verification.verifierDesk || '', onChange: function (event) { setVerificationField('verifierDesk', event.target.value); } },
                    h('option', { value: '' }, t('stem.trajectorycomputing.choose_a_different_desk', 'Choose a different desk')),
                    deskCodes.map(function (desk) { return h('option', { value: desk[0], key: 'verify-' + desk[0] }, desk[1]); })
                  )
                )
              ) : h('label', { style: { display: 'block', lineHeight: 1.5 } },
                h('input', { type: 'checkbox', checked: verification.secondPass === true, onChange: function (event) { setVerificationField('secondPass', event.target.checked); } }),
                t('stem.trajectorycomputing.i_set_the_first_result_aside_recompute', ' I set the first result aside, recomputed from the mission constants, and compared the two passes.')
              ),
              h('p', { className: 'tc-lede', style: { marginBottom: 0 } }, workPattern === 'pair'
                ? 'The verifier must use a different desk code from the original calculation.'
                : 'A second pass is independent only when it begins again from the source constants.')
            ),
            h('fieldset', { className: 'tc-repro-box' },
              h('legend', { style: { fontWeight: 900 } }, t('stem.trajectorycomputing.reproducibility_note_2', 'Reproducibility note')),
              h('p', { className: 'tc-lede', style: { marginTop: 0 } }, t('stem.trajectorycomputing.record_the_inputs_held_constant_so_ano', 'Record the inputs held constant so another person can repeat this exact machine run.')),
              h('div', { className: 'tc-role-grid' },
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.speed === true, onChange: function (event) { setReproducibilityField('speed', event.target.checked); } }), t('stem.trajectorycomputing.speed_215_m_s', ' Speed = 215 m/s')),
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.angle === true, onChange: function (event) { setReproducibilityField('angle', event.target.checked); } }), t('stem.trajectorycomputing.angle_38_degrees', ' Angle = 38 degrees')),
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.height === true, onChange: function (event) { setReproducibilityField('height', event.target.checked); } }), t('stem.trajectorycomputing.release_height_30_m', ' Release height = 30 m')),
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.gravity === true, onChange: function (event) { setReproducibilityField('gravity', event.target.checked); } }), t('stem.trajectorycomputing.gravity_9_81_m_s2', ' Gravity = 9.81 m/s2'))
              ),
              reproducibilityResult && h('p', { id: 'tc-repro-summary', tabIndex: -1, role: 'status', className: reproducibilityResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, countPhrase((reproducibilityResult.correct || 0), (reproducibilityResult.total || 4), 'stem.trajectorycomputing.fixed_mission_inputs', 'fixed mission inputs', 'stem.trajectorycomputing.recorded_period', 'recorded.') + ' ' + localizeFeedback(reproducibilityResult.message)),
              h('div', { className: 'tc-row' }, action('Check fixed inputs', function () {
                var result = checkReproducibilityNote(reproducibility);
                update({ reproducibilityResult: result });
                focusResult('tc-repro-summary');
                if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR(localizeFeedback(result.message));
              }))
            ),
            h('details', null,
              h('summary', null, t('stem.trajectorycomputing.review_the_hand_calculation_audit_ledg', 'Review the hand-calculation audit ledger')),
              renderLedger(worksheet, 'Independent reference ledger')
            ),
            verificationResult && !passed && h('div', { id: 'tc-verification-summary', tabIndex: -1, role: 'alert', className: 'tc-diag' },
              !verificationResult.pass && !verificationResult.rangePass && h('p', null, t('stem.trajectorycomputing.the_independent_range_does_not_agree_w', 'The independent range does not agree within 15 meters. Revisit your worksheet.')),
              !verificationResult.pass && !verificationResult.verdictPass && h('p', null, t('stem.trajectorycomputing.compare_the_predicted_range_with_both_', 'Compare the predicted range with both boundaries of the target zone.')),
              !verificationResult.pass && !verificationResult.assignmentPass && h('p', null, localizeFeedback(verificationResult.assignment.message)),
              verificationResult.pass && (!reproducibilityResult || !reproducibilityResult.pass) && h('p', null, t('stem.trajectorycomputing.complete_the_reproducibility_note_befo', 'Complete the reproducibility note before signing the verification sheet.'))
            ),
            verificationResult && renderRangeReconciliation(rangeReconciliation, 'tc-range-reconciliation-title', true),
            !passed && h('section', { className: 'tc-signing-gate', 'aria-labelledby': 'tc-signing-title' },
              h('h3', { id: 'tc-signing-title' }, t('stem.trajectorycomputing.ready_to_sign', 'Ready to sign?')),
              h('p', { id: 'tc-signing-status', className: 'tc-signing-status', tabIndex: -1, role: 'status' },
                verificationReadiness.ready
                  ? t('stem.trajectorycomputing.signing_ready', 'All signing checks are ready. Correctness is evaluated only after you sign.')
                  : countPhrase(verificationReadiness.count, verificationReadiness.total, 'stem.trajectorycomputing.signing_checks', 'signing checks', 'stem.trajectorycomputing.ready_period', 'ready.') + ' ' + t('stem.trajectorycomputing.next_signing_check', 'Next: ') + readinessLabel(verificationReadiness.items.find(function (item) { return !item.ready; })) + '.'
              ),
              h('ul', { className: 'tc-signing-list', 'aria-label': t('stem.trajectorycomputing.signing_prerequisites', 'Verification signing prerequisites') }, verificationReadiness.items.map(function (item) {
                return h('li', { key: item.id, className: item.ready ? 'is-ready' : '' },
                  h('span', { 'aria-hidden': 'true' }, item.ready ? '\u2713' : '\u25cb'),
                  h('span', null, readinessLabel(item))
                );
              })),
              h('div', { className: 'tc-row' }, h('button', { type: 'submit', className: 'tc-action', disabled: !verificationReadiness.ready, 'aria-describedby': 'tc-signing-status' }, t('stem.trajectorycomputing.sign_verification_sheet', 'Sign verification sheet')))
            )
          ),
          passed && h('div', { className: 'tc-completion-surfaces' },
            h('p', { className: 'tc-visually-hidden', role: 'status' }, t('stem.trajectorycomputing.verification_complete_status', 'Independent verification complete. Computation specialist competencies earned.')),
            h('div', { className: 'tc-certificate' },
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.computation_specialist_certification', 'Computation specialist certification')),
              h('h3', { id: 'tc-certificate-title', className: 'tc-heading', tabIndex: -1 }, t('stem.trajectorycomputing.aurora_test_3_is_verified', 'Aurora Test 3 is verified.')),
              h('p', null, t('stem.trajectorycomputing.you_created_a_hand_reference_repaired_', 'You created a hand reference, repaired the program, protected card sequence, interpreted machine output, recorded fixed inputs, and made an independent GO/HOLD decision.')),
              h('p', null, h('strong', null, t('stem.trajectorycomputing.audit_workflow', 'Audit workflow: ')), workPattern === 'pair' ? 'paired independent cross-check with separated desk codes.' : 'solo dual-pass recomputation.'),
              h('ul', { className: 'tc-stamps', 'aria-label': t('stem.trajectorycomputing.earned_competencies', 'Earned competencies') },
                [['\u03a3', 'Hand math'], ['<>', 'Program repair'], ['\u25a4', 'Deck sequence'], ['\u25b6', 'Output reading'], ['\u2713', 'Independent verification']].map(function (stamp) {
                  return h('li', { className: 'tc-stamp', key: stamp[1] }, h('span', { className: 'tc-stamp-symbol', 'aria-hidden': 'true' }, stamp[0]), stamp[1]);
                })
              ),
              h('section', { className: 'tc-reflection', 'aria-labelledby': 'tc-reflection-title' },
                h('h4', { id: 'tc-reflection-title' }, t('stem.trajectorycomputing.reflection_record', 'Reflection record')),
                h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.which_error_was_easier_for_a_person_to', 'Which error was easier for a person to catch than a machine\u2014and which safeguard mattered most?')),
                h('div', { className: 'tc-role-grid' },
                  h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.error_that_stood_out', 'Error that stood out'),
                    h('select', { value: reflectionRecord.errorId, onChange: function (event) { setReflectionField('errorId', event.target.value); } },
                      h('option', { value: '' }, t('stem.trajectorycomputing.choose_an_error', 'Choose an error')),
                      REFLECTION_ERROR_OPTIONS.map(function (option) { return h('option', { key: option.id, value: option.id }, option.label); })
                    )
                  ),
                  h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.safeguard_that_mattered', 'Safeguard that mattered most'),
                    h('select', { value: reflectionRecord.safeguardId, onChange: function (event) { setReflectionField('safeguardId', event.target.value); } },
                      h('option', { value: '' }, t('stem.trajectorycomputing.choose_a_safeguard', 'Choose a safeguard')),
                      SAFEGUARD_OPTIONS.map(function (option) { return h('option', { key: 'reflection-' + option.id, value: option.id }, option.label); })
                    )
                  )
                ),
                h('label', { className: 'tc-field', htmlFor: 'tc-reflection-note' }, t('stem.trajectorycomputing.optional_reflection_note', 'Optional reflection note'),
                  h('textarea', { id: 'tc-reflection-note', maxLength: 500, value: String(reflection.note || '').slice(0, 500), placeholder: t('stem.trajectorycomputing.reflection_sentence_starter', 'A person could catch... The safeguard mattered because...'), 'aria-describedby': 'tc-reflection-help', onChange: function (event) { setReflectionField('note', event.target.value); } }),
                  h('small', { id: 'tc-reflection-help' }, t('stem.trajectorycomputing.reflection_privacy_help', 'Optional. Use no names or personal details. Included in saved evidence and the completion report. ') + String(reflection.note || '').slice(0, 500).length + '/500')
                ),
                reflectionRecord.recorded && h('p', { className: 'tc-ok' }, t('stem.trajectorycomputing.reflection_recorded', 'Reflection recorded for this mission.'))
              ),
              revisionSummary.totalAttempts > 0 && h('p', { className: 'tc-revision-summary' }, h('strong', null, t('stem.trajectorycomputing.revision_journey', 'Revision journey: ')), revisionSummary.revisedStations + t('stem.trajectorycomputing.stations_needed_revision', ' stations needed more than one check; ') + revisionSummary.diagnosticCodes.length + t('stem.trajectorycomputing.diagnostic_categories_encountered', ' compiler diagnostic categories were encountered.')),
              h('div', { className: 'tc-row', style: { justifyContent: 'center' } },
                action('Save evidence snapshot', saveEvidenceSnapshot),
                action(d.reportOpen ? 'Hide completion report' : 'Review completion report', function () { var opening = !d.reportOpen; update({ reportOpen: opening }); if (opening) focusResult('tc-completion-report'); }, true),
                h('button', { id: 'tc-run-again', type: 'button', className: 'tc-action secondary', onClick: function () { update({ restartConfirmOpen: true }); focusResult('tc-restart-confirm'); }, 'aria-expanded': restartConfirmOpen, 'aria-controls': restartConfirmOpen ? 'tc-restart-confirm' : undefined }, t('stem.trajectorycomputing.run_mission_again', 'Run mission again'))
              ),
              snapshotFresh && h('p', { className: 'tc-ok', role: 'status' }, t('stem.trajectorycomputing.latest_evidence_saved', 'Evidence snapshot includes the latest work.')),
              hasSavedSnapshot && !snapshotFresh && h('p', { className: 'tc-bad', role: 'status' }, t('stem.trajectorycomputing.evidence_snapshot_needs_update', 'Work changed after the last snapshot. Save a new snapshot to include it.')),
              restartConfirmOpen && h('section', { id: 'tc-restart-confirm', className: 'tc-diag', role: 'alert', tabIndex: -1, onKeyDown: function (event) { if (event.key === 'Escape') { event.preventDefault(); closeRestartConfirmation(); } } },
                h('h4', null, t('stem.trajectorycomputing.confirm_new_mission', 'Start a new mission?')),
                h('p', null, evidenceProvenance.status === 'current'
                  ? t('stem.trajectorycomputing.restart_current_snapshot', 'Your latest work matches the saved evidence snapshot. Starting a new mission clears the on-screen work, while the saved snapshot remains available.')
                  : (evidenceProvenance.status === 'outdated'
                    ? t('stem.trajectorycomputing.restart_outdated_snapshot', 'The saved snapshot does not include the latest work. Starting a new mission clears those newer changes from the lab.')
                    : t('stem.trajectorycomputing.restart_unsaved_snapshot', 'No evidence snapshot has been saved. Starting a new mission clears this mission\'s work from the lab.'))),
                h('div', { className: 'tc-row' },
                  !snapshotFresh && typeof ctx.setToolSnapshots === 'function' && action(t('stem.trajectorycomputing.save_latest_evidence', 'Save latest evidence'), function () { saveEvidenceSnapshot(); focusResult('tc-restart-confirm'); }),
                  action(t('stem.trajectorycomputing.cancel', 'Cancel'), closeRestartConfirmation, true),
                  action(t('stem.trajectorycomputing.start_new_mission', 'Start new mission'), restartMission, true)
                ),
                h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.restart_escape_help', 'Press Escape to cancel and return to the Run mission again button.'))
              )
            ),
            h('section', { className: 'tc-extension', 'aria-labelledby': extensionView === 'angle' ? 'tc-angle-study-title' : (extensionView === 'replay' ? 'tc-replay-title' : (extensionView === 'safeguard' ? 'tc-safeguard-title' : 'tc-challenge-title')) },
              extensionView === 'menu' && h('div', { className: 'tc-challenge-hub' },
                h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.mission_complete_keep_exploring', 'Mission complete / keep exploring')),
                h('h3', { id: 'tc-challenge-title', tabIndex: -1 }, t('stem.trajectorycomputing.choose_next_challenge', 'Choose your next challenge.')),
                h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.choose_next_challenge_help', 'Your verified work is saved. Extend the science, compare another mission, or package your evidence.')),
                h('div', { className: 'tc-exploration-head' }, h('span', { id: 'tc-exploration-label' }, t('stem.trajectorycomputing.optional_explorations', 'Optional explorations')), h('strong', null, countPhrase(explorationCount, 3, null, null, 'stem.trajectorycomputing.complete', 'complete'))),
                h('div', { className: 'tc-exploration-track', role: 'progressbar', 'aria-labelledby': 'tc-exploration-label', 'aria-valuemin': 0, 'aria-valuemax': 3, 'aria-valuenow': explorationCount, 'aria-valuetext': countPhrase(explorationCount, 3, 'stem.trajectorycomputing.optional_explorations_lower', 'optional explorations', 'stem.trajectorycomputing.complete', 'complete') },
                  h('span', { className: 'tc-exploration-fill', style: { width: (explorationCount / 3 * 100) + '%' } })
                ),
                h('div', { className: 'tc-challenge-grid' },
                  h('button', { type: 'button', className: 'tc-challenge-card' + (angleInvestigationComplete ? ' is-complete' : ''), onClick: function () { update({ extensionView: 'angle' }); focusResult('tc-angle-study-title'); } },
                    h('span', { className: 'tc-challenge-icon', 'aria-hidden': 'true' }, '\u2220'), h('strong', null, t('stem.trajectorycomputing.angle_lab', 'Angle lab')), h('span', { className: 'tc-challenge-status' }, angleInvestigationComplete ? '\u2713 ' + t('stem.trajectorycomputing.completed', 'Completed') : (studyResult ? '\u25d0 ' + t('stem.trajectorycomputing.reasoning_check_pending', 'Reasoning check pending') : '\u25cb ' + t('stem.trajectorycomputing.not_started', 'Not started'))), h('span', null, t('stem.trajectorycomputing.angle_lab_help', 'Change one variable, predict the result, and read an annotated trajectory chart.'))
                  ),
                  h('button', { type: 'button', className: 'tc-challenge-card' + (replayLearningStatus.questComplete ? ' is-complete' : ''), onClick: function () { update({ extensionView: 'replay' }); focusResult('tc-replay-title'); } },
                    h('span', { className: 'tc-challenge-icon', 'aria-hidden': 'true' }, '\u2194'), h('strong', null, t('stem.trajectorycomputing.replay_mission', 'Replay mission')), h('span', { className: 'tc-challenge-status' }, replayLearningStatus.questComplete ? '\u2713 ' + t('stem.trajectorycomputing.completed', 'Completed') : ((replayLearningStatus.hasRun || replayLearningStatus.learningRecorded || replayLearningStatus.unavailableReplay) ? '\u25d0 ' + replayLearningStatus.progress : '\u25cb ' + t('stem.trajectorycomputing.not_started', 'Not started'))), h('span', null, t('stem.trajectorycomputing.replay_mission_help', 'Run a deterministic fictional case and compare each changed input and output.'))
                  ),
                  h('button', { type: 'button', className: 'tc-challenge-card' + (safeguardInvestigationComplete ? ' is-complete' : ''), onClick: function () { update({ extensionView: 'safeguard' }); focusResult('tc-safeguard-title'); } },
                    h('span', { className: 'tc-challenge-icon', 'aria-hidden': 'true' }, '\uD83D\uDEE1'), h('strong', null, t('stem.trajectorycomputing.safeguard_lab', 'Safeguard lab')), h('span', { className: 'tc-challenge-status' }, safeguardInvestigationComplete ? '\u2713 ' + t('stem.trajectorycomputing.completed', 'Completed') : (safeguardResult ? '\u25d0 ' + t('stem.trajectorycomputing.revise_prediction', 'Revise prediction') : '\u25cb ' + t('stem.trajectorycomputing.not_started', 'Not started'))), h('span', null, t('stem.trajectorycomputing.safeguard_lab_help', 'Inspect an authentic workflow error and predict which human or machine check catches it.'))
                  ),
                  h('button', { type: 'button', className: 'tc-challenge-card', onClick: function () { update({ reportOpen: true }); focusResult('tc-completion-report'); } },
                    h('span', { className: 'tc-challenge-icon', 'aria-hidden': 'true' }, '\u25a3'), h('strong', null, t('stem.trajectorycomputing.evidence_report', 'Evidence report')), h('span', { className: 'tc-challenge-status' }, t('stem.trajectorycomputing.ready_to_review', 'Ready to review')), h('span', null, t('stem.trajectorycomputing.evidence_report_help', 'Review the audit trail, revision journey, results, and teacher-ready evidence.'))
                  )
                )
              ),
              extensionView === 'angle' && h('div', { className: 'tc-angle-challenge' },
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.extension_parameter_study', 'Extension / parameter study')),
              h('h3', { id: 'tc-angle-study-title', tabIndex: -1 }, t('stem.trajectorycomputing.change_one_variable_predict_before_com', 'Change one variable. Predict before computing.')),
              h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.keep_speed_and_release_height_fixed_ch', 'Keep speed and release height fixed. Change only the launch angle, then predict how the landing distance compares with the verified 38-degree baseline.')),
              h('div', { className: 'tc-study-grid' },
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.comparison_angle', 'Comparison angle'),
                  h('select', { value: String(studyAngle), onChange: function (event) { update({ studyAngle: Number(event.target.value), studyResult: null, studyExplanation: '', studyExplanationResult: null }); } },
                    [30, 38, 46, 52].map(function (angle) { return h('option', { value: String(angle), key: angle }, angle + ' degrees'); })
                  )
                ),
                h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
                  h('legend', { className: 'tc-field' }, t('stem.trajectorycomputing.my_prediction_for_downrange_distance', 'My prediction for downrange distance')),
                  ['shorter', 'about', 'longer'].map(function (relation) {
                    var label = relation === 'about' ? t('stem.trajectorycomputing.about_the_same', 'About the same') : (relation === 'shorter' ? t('stem.trajectorycomputing.shorter', 'Shorter') : t('stem.trajectorycomputing.longer', 'Longer'));
                    return h('label', { key: relation, style: { display: 'block', marginTop: 5 } },
                      h('input', { type: 'radio', name: 'tc-study-prediction', value: relation, checked: studyPrediction === relation, onChange: function () { update({ studyPrediction: relation, studyResult: null, studyExplanation: '', studyExplanationResult: null }); } }), ' ' + label
                    );
                  })
                )
              ),
              h('div', { className: 'tc-row' }, action(t('stem.trajectorycomputing.compute_comparison', 'Compute comparison'), function () {
                var comparison = classifyAngleStudy(studyAngle);
                comparison.prediction = studyPrediction;
                comparison.correct = studyPrediction === comparison.relation;
                update({ studyResult: comparison, studyExplanation: '', studyExplanationResult: null });
                if (typeof ctx.announceToSR === 'function') ctx.announceToSR(t('stem.trajectorycomputing.angle_study_computed', 'Angle study computed. The new range is ') + round(comparison.result.range, 1) + t('stem.trajectorycomputing.meters_period', ' meters.'));
              }, false, !studyPrediction)),
              studyResult && h('div', { className: studyResult.correct ? 'tc-check' : 'tc-diag' },
                h('p', { role: 'status' }, h('strong', null, studyResult.correct ? t('stem.trajectorycomputing.prediction_supported', 'Prediction supported. ') : t('stem.trajectorycomputing.revise_prediction', 'Revise your prediction. ')), t('stem.trajectorycomputing.angle_result_prefix', 'At ') + studyResult.angle + t('stem.trajectorycomputing.angle_result_relation', ' degrees, the capsule travels ') + studyResult.relation + t('stem.trajectorycomputing.than_baseline_period', ' than the 38-degree baseline.')),
                h('div', { className: 'tc-result-grid' },
                  h('div', null, h('b', null, round(studyResult.result.range, 1) + ' m'), t('stem.trajectorycomputing.new_range', 'new range')),
                  h('div', null, h('b', null, (studyResult.difference >= 0 ? '+' : '') + round(studyResult.difference, 1) + ' m'), t('stem.trajectorycomputing.change_from_baseline', 'change from baseline')),
                  h('div', null, h('b', null, studyResult.inZone ? t('stem.trajectorycomputing.inside_upper', 'INSIDE') : t('stem.trajectorycomputing.outside_upper', 'OUTSIDE')), t('stem.trajectorycomputing.assigned_landing_zone', 'assigned landing zone'))
                ),
                renderComparisonChart(studyResult),
                renderAngleComparisonTable(studyResult),
                h('fieldset', { className: 'tc-role-box' },
                  h('legend', { style: { fontWeight: 900 } }, t('stem.trajectorycomputing.explain_result_with_evidence', 'Explain the result with evidence')),
                  h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.which_claim_best_explains_angle_result', 'Which claim best explains the changed flight path when only launch angle changed?')),
                  [
                    ['components', t('stem.trajectorycomputing.explanation_components', 'The same speed was redistributed between horizontal and vertical components.')],
                    ['gravity', t('stem.trajectorycomputing.explanation_gravity', 'Gravity changed during the comparison.')],
                    ['speed', t('stem.trajectorycomputing.explanation_speed', 'The comparison used a faster launch speed.')]
                  ].map(function (option) {
                    return h('label', { key: option[0], style: { display: 'block', marginTop: 7 } },
                      h('input', { type: 'radio', name: 'tc-study-explanation', value: option[0], checked: studyExplanation === option[0], onChange: function () { update({ studyExplanation: option[0], studyExplanationResult: null }); } }), ' ' + option[1]
                    );
                  }),
                  h('div', { className: 'tc-row' }, action(t('stem.trajectorycomputing.check_explanation', 'Check explanation'), function () { update({ studyExplanationResult: checkAngleExplanation(studyExplanation) }); }, false, !studyExplanation)),
                  studyExplanationResult && h('p', { role: 'status', className: studyExplanationResult.correct ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, localizeFeedback(studyExplanationResult.message))
                )
              ),
              h('div', { className: 'tc-row' }, action('\u2190 Choose another challenge', function () { update({ extensionView: 'menu' }); focusResult('tc-challenge-title'); }, true))
              ),
              extensionView === 'safeguard' && h('div', { className: 'tc-format-box' },
                h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, t('stem.trajectorycomputing.extension_safeguard_reasoning', 'Extension / safeguard reasoning')),
                h('h3', { id: 'tc-safeguard-title', tabIndex: -1 }, t('stem.trajectorycomputing.predict_which_check_catches_error', 'Predict which check catches the error.')),
                h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.safeguard_prediction_help', 'Choose an original incident record, predict the first safeguard that should catch it, then compare your reasoning with the audit workflow.')),
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.incident_record', 'Incident record'),
                  h('select', { value: safeguardCaseId, onChange: function (event) { update({ safeguardCaseId: event.target.value, safeguardPrediction: '', safeguardResult: null }); } }, SAFEGUARD_CASES.map(function (incident) {
                    return h('option', { key: incident.id, value: incident.id }, incident.title);
                  }))
                ),
                h('div', { className: 'tc-control-box', role: 'region', 'aria-labelledby': 'tc-incident-title' },
                  h('p', { id: 'tc-incident-title', style: { marginTop: 0 } }, h('strong', null, selectedSafeguardCase.title)),
                  h('p', { className: 'tc-lede', style: { marginBottom: 0 } }, selectedSafeguardCase.incident)
                ),
                h('fieldset', { className: 'tc-role-box' },
                  h('legend', { style: { fontWeight: 900 } }, t('stem.trajectorycomputing.first_safeguard_prompt', 'Which safeguard should catch this first?')),
                  SAFEGUARD_OPTIONS.map(function (option) {
                    return h('label', { key: option.id, style: { display: 'block', marginTop: 7 } },
                      h('input', { type: 'radio', name: 'tc-safeguard-prediction', value: option.id, checked: safeguardPrediction === option.id, onChange: function () { update({ safeguardPrediction: option.id, safeguardResult: null }); } }), ' ' + option.label
                    );
                  }),
                  h('div', { className: 'tc-row' }, action(t('stem.trajectorycomputing.check_safeguard_prediction', 'Check safeguard prediction'), function () {
                    var result = evaluateSafeguardPrediction(safeguardCaseId, safeguardPrediction);
                    update({ safeguardResult: result });
                    if (typeof ctx.announceToSR === 'function') ctx.announceToSR(result.message);
                  }, false, !safeguardPrediction)),
                  safeguardResult && h('p', { role: 'status', className: safeguardResult.correct ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, safeguardResult.message)
                ),
                h('div', { className: 'tc-row' }, action('\u2190 Choose another challenge', function () { update({ extensionView: 'menu' }); focusResult('tc-challenge-title'); }, true))
              ),
              extensionView === 'replay' && h('div', { className: 'tc-format-box' },
                h('h3', { id: 'tc-replay-title', tabIndex: -1 }, t('stem.trajectorycomputing.deterministic_replay_cards', 'Deterministic mission replay cards')),
                h('p', { className: 'tc-lede' }, t('stem.trajectorycomputing.replay_card_explanation', 'Choose an original fictional case. The same card always produces the same inputs and output, making classroom comparisons reproducible.')),
                h('label', { className: 'tc-field' }, t('stem.trajectorycomputing.replay_case', 'Replay case'),
                  h('select', { id: 'tc-replay-case', value: replayVariantId, onChange: function (event) { update({ replayVariantId: event.target.value, replayPrediction: '', replayResult: null, replayLearning: null }); } }, MISSION_VARIANTS.map(function (mission) {
                    return h('option', { key: mission.id, value: mission.id }, mission.name + ' / ' + mission.year);
                  }))
                ),
                renderReplayInputCard(selectedReplayMission, selectedReplayProfile),
                h('fieldset', { className: 'tc-role-box' },
                  h('legend', { style: { fontWeight: 900 } }, t('stem.trajectorycomputing.replay_prediction_prompt', 'Before computing, predict the replay landing range')),
                  ['shorter', 'about', 'longer'].map(function (relation) {
                    var label = relation === 'shorter' ? t('stem.trajectorycomputing.shorter_than_aurora', 'Shorter than Aurora') : (relation === 'longer' ? t('stem.trajectorycomputing.longer_than_aurora', 'Longer than Aurora') : t('stem.trajectorycomputing.about_same_as_aurora', 'About the same as Aurora'));
                    return h('label', { key: 'replay-' + relation, style: { display: 'block', marginTop: 6 } },
                      h('input', { type: 'radio', name: 'tc-replay-prediction', value: relation, checked: replayPrediction === relation, onChange: function () {
                        var nextReplayLearning = replayLearning;
                        if (!nextReplayLearning && replayResult && replayResult.prediction) {
                          nextReplayLearning = { initialPrediction: replayResult.prediction, reasoningClaim: '', reasoningAttempts: 0, reasoningChecked: false };
                        }
                        if (nextReplayLearning) nextReplayLearning = Object.assign({}, nextReplayLearning, { reasoningClaim: '', reasoningAttempts: 0, reasoningChecked: false });
                        update({ replayPrediction: relation, replayResult: null, replayLearning: nextReplayLearning });
                      } }), ' ' + label
                    );
                  })
                ),
                h('div', { className: 'tc-row' }, action(t('stem.trajectorycomputing.run_replay_card', 'Run replay card'), function () {
                  var replayMission = getMissionVariant(replayVariantId);
                  var nextReplayLearning = replayLearning || { initialPrediction: replayPrediction, reasoningClaim: '', reasoningAttempts: 0, reasoningChecked: false };
                  update({
                    replayResult: evaluateReplayPrediction(replayMission.id, replayPrediction),
                    replayLearning: Object.assign({}, nextReplayLearning, { reasoningClaim: '', reasoningAttempts: 0, reasoningChecked: false })
                  });
                  focusResult('tc-replay-prediction-summary');
                }, false, !replayPrediction)),
                !replayResult && replayLearning && replayPrediction !== replayLearning.initialPrediction && h('p', { role: 'status', className: 'tc-check' }, 'Revised prediction selected. Run the same card to test it.'),
                replayResult && h('div', { className: 'tc-replay-result' },
                  replayResult.prediction && h('h4', { id: 'tc-replay-prediction-summary', tabIndex: -1, 'aria-describedby': replayLearningStatus.unavailableReplay ? undefined : 'tc-replay-evidence-summary', className: 'tc-replay-summary ' + ((replayLearningStatus.unavailableReplay || replayLearningStatus.legacyRecorded) ? 'tc-replay-note' : (replayResult.correct ? 'tc-check tc-ok' : 'tc-diag tc-bad')) },
                    replayLearningStatus.unavailableReplay
                      ? 'This earlier replay card is not available in the current catalog. Its stored result remains visible, but it cannot complete the current reasoning check.'
                      : replayLearningStatus.legacyRecorded
                      ? 'Earlier replay recorded. This record did not capture a revision or comparison-reasoning step.'
                      : (replayResult.correct
                        ? (replayLearningStatus.revisionOccurred ? 'Revised prediction supported. Now explain what this comparison can establish.' : 'Prediction supported. Now explain what this comparison can establish.')
                        : 'Comparison does not support this prediction. The replay traveled ' + (replayResult.relation === 'about' ? 'about the same distance as Aurora' : replayResult.relation + ' than Aurora') + '. Change your prediction, then run the same card again; seeing the result is not yet a revision.')
                  ),
                  h('div', { className: 'tc-result-grid' },
                    h('div', null, h('b', null, replayResult.mission.speed + ' m/s'), t('stem.trajectorycomputing.speed', 'Speed')),
                    h('div', null, h('b', null, replayResult.mission.angle + ' degrees'), t('stem.trajectorycomputing.angle_2', 'Angle')),
                    h('div', null, h('b', null, round(replayResult.result.range, 1) + ' m'), replayResult.result.inZone ? t('stem.trajectorycomputing.inside_zone', 'inside zone') : t('stem.trajectorycomputing.outside_zone', 'outside zone')),
                    h('div', null, h('b', null, (replayResult.rangeDifference >= 0 ? '+' : '') + round(replayResult.rangeDifference, 1) + ' m'), t('stem.trajectorycomputing.range_change_from_aurora', 'range change from Aurora'))
                  ),
                  h('p', { className: 'tc-replay-note' }, h('strong', null, t('stem.trajectorycomputing.changed_inputs', 'Changed inputs: ')), (replayResult.changedInputs.join(', ') || t('stem.trajectorycomputing.none_baseline_card', 'none (baseline card)')) + '. Flight-time change: ' + (replayResult.flightTimeDifference >= 0 ? '+' : '') + round(replayResult.flightTimeDifference, 2) + ' s.'),
                  !replayLearningStatus.unavailableReplay && renderReplayEvidenceKey(replayResult),
                  renderReplayComparisonTable(replayResult, replayLearningStatus.unavailableReplay ? null : 'tc-replay-evidence-summary'),
                  replayResult.correct && replayLearning && !replayLearningStatus.unavailableReplay && h('fieldset', { className: 'tc-role-box', 'aria-describedby': 'tc-replay-evidence-summary' },
                    h('legend', { style: { fontWeight: 900 } }, 'What conclusion is supported by this replay?'),
                    REPLAY_REASONING_OPTIONS.map(function (option) {
                      return h('label', { key: option.id, style: { display: 'block', marginTop: 7 } },
                        h('input', { type: 'radio', name: 'tc-replay-explanation', value: option.id, checked: replayLearning.reasoningClaim === option.id, onChange: function () {
                          update({ replayLearning: Object.assign({}, replayLearning, { reasoningClaim: option.id, reasoningChecked: false }) });
                        } }), ' ' + option.label
                      );
                    }),
                    h('div', { className: 'tc-row' },
                      h('button', { id: 'tc-check-replay-reasoning', type: 'button', className: 'tc-action', disabled: !replayLearning.reasoningClaim, onClick: function () {
                        var attempts = replayLearning.reasoningAttempts + 1;
                        update({ replayLearning: Object.assign({}, replayLearning, { reasoningAttempts: attempts, reasoningChecked: true }) });
                      } }, 'Check comparison claim')
                    ),
                    replayLearningStatus.reasoning && replayLearningStatus.reasoning.checked && h('p', { id: 'tc-replay-reasoning-summary', role: 'status', 'aria-atomic': 'true', className: replayLearningStatus.reasoning.correct ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, replayLearningStatus.reasoning.message)
                  ),
                  h('div', { className: 'tc-row' }, action('Start another replay', function () {
                    update({ replayPrediction: '', replayResult: null, replayLearning: null });
                    focusResult('tc-replay-case');
                  }, true))
                ),
                h('div', { className: 'tc-row' }, action('\u2190 Choose another challenge', function () { update({ extensionView: 'menu' }); focusResult('tc-challenge-title'); }, true))
              )
            ),
            d.reportOpen && renderCompletionReport()
          )
        );
      }

      function renderStage() {
        if (stage === 'worksheet') return renderWorksheet();
        if (stage === 'program') return renderProgram();
        if (stage === 'cards') return renderCards();
        if (stage === 'batch') return renderBatch();
        if (stage === 'verify') return renderVerify();
        return renderBriefing();
      }

      return h('div', { 'data-trajectory-lab': 'true', 'data-stem-tool-shell': 'true', 'data-low-distraction': lowDistraction ? 'true' : 'false' },
        h('div', { className: 'tc-shell' },
          h('a', { className: 'tc-skip-link', href: '#tc-main-content' }, t('stem.trajectorycomputing.skip_to_station_content', 'Skip to station content')),
          h('header', { className: 'tc-top' },
            h('div', null,
              h('p', { className: 'tc-kicker' }, t('stem.trajectorycomputing.original_historical_stem_simulation', 'Original historical STEM simulation')),
              h('h1', { className: 'tc-title' }, t('stem.trajectorycomputing.trajectory_computing_lab', 'Trajectory Computing Lab')),
              h('p', { className: 'tc-subtitle' }, t('stem.trajectorycomputing.from_pencil_table_and_trigonometry_to_', 'From pencil, table, and trigonometry to FORTRAN-style code, punch cards, batch output, and human verification.')),
              h('div', { className: 'tc-progress', role: 'group', 'aria-label': t('stem.trajectorycomputing.audit_progress', 'Audit progress') },
            h('div', { className: 'tc-progress-head' },
                  h('span', { id: 'tc-progress-label' }, t('stem.trajectorycomputing.audit_progress_2', 'Audit progress')),
                  h('strong', null, countPhrase(completedCount, stages.length, 'stem.trajectorycomputing.stations', 'stations'))
                ),
                h('div', { className: 'tc-progress-track', role: 'progressbar', 'aria-labelledby': 'tc-progress-label', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progressPercent, 'aria-valuetext': countPhrase(completedCount, stages.length, 'stem.trajectorycomputing.stations', 'stations', 'stem.trajectorycomputing.complete', 'complete') },
                  h('span', { className: 'tc-progress-fill', style: { width: progressPercent + '%' } })
                ),
                h('p', { className: 'tc-progress-route' },
                  h('span', null, t('stem.trajectorycomputing.current_desk', 'Current desk: ') + currentStation[1]),
                  nextStation
                    ? h('span', null, ' · ' + t('stem.trajectorycomputing.next_desk', 'Next desk: ') + nextStation[1])
                    : h('span', null, ' · ' + t('stem.trajectorycomputing.final_verification_desk', 'Final verification desk'))
                )
              )
            ),
            h('button', { type: 'button', className: 'tc-back', onClick: function () { if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null); }, 'aria-label': t('stem.trajectorycomputing.back_to_all_steam_lab_tools', 'Back to all STEAM Lab tools') }, t('stem.trajectorycomputing.all_tools', '\u2190 All tools'))
          ),
          h('div', { className: 'tc-tabs-region', role: 'region', 'aria-label': t('stem.trajectorycomputing.simulation_stations', 'Simulation stations') },
            h('p', { id: 'tc-tabs-help', className: 'tc-visually-hidden' }, t('stem.trajectorycomputing.station_tabs_use_arrow_right_or_arrow_', 'Station tabs: use Arrow Right or Arrow Left, or Arrow Down or Arrow Up, to move between unlocked stations. Press Home for the briefing or End for the last unlocked station.')),
            h('nav', { className: 'tc-tabs', role: 'tablist', 'aria-label': t('stem.trajectorycomputing.simulation_stations_2', 'Simulation stations'), 'aria-describedby': 'tc-tabs-help' }, stages.map(function (item, index) {
            var locked = index > unlockedIndex;
            var stateClass = locked ? ' is-locked' : (completed[item[0]] ? ' is-complete' : (stage === item[0] ? ' is-current' : ' is-open'));
            return h('button', { id: 'tc-tab-' + item[0], key: item[0], type: 'button', role: 'tab', className: 'tc-tab' + stateClass, 'aria-selected': stage === item[0], 'aria-controls': stage === item[0] ? 'tc-panel-' + item[0] : undefined, tabIndex: stage === item[0] ? 0 : -1, disabled: locked, onClick: function () { update({ stage: item[0] }); }, onKeyDown: function (event) { handleTabKey(event, index); } },
              h('span', { className: 'tc-tab-icon', 'aria-hidden': 'true' }, completed[item[0]] ? '\u2713' : item[2]),
              h('span', { className: 'tc-tab-num' }, (locked ? 'LOCKED / ' : (completed[item[0]] ? 'CHECKED / ' : '')) + '0' + (index + 1)),
              h('span', { className: 'tc-tab-label' }, item[1])
            );
            })),
            h('p', { className: 'tc-tabs-mobile-hint' }, t('stem.trajectorycomputing.swipe_station_map', '\u2194 Swipe the station map to see the full workflow.'))
          ),
          renderDeskBrief(),
          d.revisionNotice && h('p', { className: 'tc-revision-alert', role: 'status' },
            h('strong', null, t('stem.trajectorycomputing.revision_required', 'Revision required: ')),
            t('stem.trajectorycomputing.revision_required_help', 'A checked input changed. Recheck this station and the downstream evidence before verification. '),
            h('span', null, t('stem.trajectorycomputing.affected_stations', 'Affected stations: ') + ((d.revisionNotice.affectedStations || []).map(stageLabel).join(', ') || currentStation[1]) + '.')
          ),
          h('div', { className: 'tc-grid' },
            h('main', { id: 'tc-main-content', className: 'tc-paper', tabIndex: -1 }, renderStage()),
            h('aside', { className: 'tc-side', 'aria-label': t('stem.trajectorycomputing.desk_references_and_historical_context', 'Desk references and historical context') },
              h('h3', null, t('stem.trajectorycomputing.desk_card', 'Desk card')),
              h('dl', null,
                h('dt', null, t('stem.trajectorycomputing.mission', 'Mission')), h('dd', null, 'AURORA-3'),
                h('dt', null, t('stem.trajectorycomputing.speed', 'Speed')), h('dd', null, t('stem.trajectorycomputing.215_0_m_s', '215.0 m/s')),
                h('dt', null, t('stem.trajectorycomputing.angle_2', 'Angle')), h('dd', null, t('stem.trajectorycomputing.38_0_deg', '38.0 deg')),
                h('dt', null, t('stem.trajectorycomputing.height', 'Height')), h('dd', null, t('stem.trajectorycomputing.30_0_m', '30.0 m')),
                h('dt', null, t('stem.trajectorycomputing.gravity', 'Gravity')), h('dd', null, t('stem.trajectorycomputing.9_81_m_s2', '9.81 m/s\u00b2')),
                h('dt', null, t('stem.trajectorycomputing.zone', 'Zone')), h('dd', null, t('stem.trajectorycomputing.4550_4700_m', '4,550\u20134,700 m'))
              ),
              h('label', { className: 'tc-field', style: { marginTop: 15 } }, t('stem.trajectorycomputing.support_level', 'Support level'),
                h('select', { value: mode, onChange: function (event) { update({ mode: event.target.value }); } },
                  h('option', { value: 'guided' }, t('stem.trajectorycomputing.guided_formulas_visible', 'Guided - formulas visible')),
                  h('option', { value: 'standard' }, t('stem.trajectorycomputing.standard_references_on_request', 'Standard - references on request')),
                  h('option', { value: 'expert' }, t('stem.trajectorycomputing.expert_audit_independently', 'Expert - audit independently'))
                )
              ),
              h('label', { className: 'tc-distraction-toggle' },
                h('input', { type: 'checkbox', checked: lowDistraction, onChange: function (event) { update({ lowDistraction: event.target.checked }); } }),
                t('stem.trajectorycomputing.low_distraction_view', ' Low-distraction view'),
                h('span', { style: { display: 'block', fontWeight: 500, marginTop: 4 } }, t('stem.trajectorycomputing.low_distraction_help', 'Simplifies textures and shadows while keeping every control available.'))
              ),
              renderEvidenceFile(),
              renderHistoryCheckpoint(),
              h('details', null,
                h('summary', null, t('stem.trajectorycomputing.historical_grounding', 'Historical grounding')),
                h('div', { className: 'tc-sources' },
                  h('p', null, t('stem.trajectorycomputing.at_naca_and_nasa_teams_of_women_perfor', 'At NACA and NASA, teams of women performed and checked aerospace calculations. Katherine Johnson calculated trajectories and verified electronic-computer results. Dorothy Vaughan led the West Area Computing unit and became an expert FORTRAN programmer.')),
                  h('ul', { className: 'tc-teacher-list' },
                    h('li', null, t('stem.trajectorycomputing.human_computers_organized_data_used_sh', 'Human computers organized data, used shared tables, applied mathematical procedures, checked one another\'s work, and documented results.')),
                    h('li', null, t('stem.trajectorycomputing.as_electronic_computers_arrived_mathem', 'As electronic computers arrived, mathematical knowledge remained essential for programming, debugging, and verification.')),
                    h('li', null, t('stem.trajectorycomputing.the_simulation_emphasizes_the_work_pro', 'The simulation emphasizes the work process; it does not turn discrimination or segregation into a game mechanic.'))
                  ),
                  h('p', null, t('stem.trajectorycomputing.this_simulation_uses_those_documented_', 'This simulation uses those documented kinds of work as educational context; it does not recreate a copyrighted story or portray a real person as a fictional character.')),
                  h('p', null, h('a', { href: 'https://www.nasa.gov/centers-and-facilities/langley/katherine-johnson-biography/', target: '_blank', rel: 'noreferrer' }, t('stem.trajectorycomputing.nasa_katherine_johnson_biography', 'NASA: Katherine Johnson biography'))),
                  h('p', null, h('a', { href: 'https://www.nasa.gov/people/dorothy-vaughan/', target: '_blank', rel: 'noreferrer' }, t('stem.trajectorycomputing.nasa_dorothy_vaughan_biography', 'NASA: Dorothy Vaughan biography')))
                )
              ),
              h('details', null,
                h('summary', null, t('stem.trajectorycomputing.vocabulary_desk', 'Vocabulary desk')),
                h('dl', { className: 'tc-glossary' },
                  h('dt', null, t('stem.trajectorycomputing.algorithm', 'Algorithm')), h('dd', null, t('stem.trajectorycomputing.a_repeatable_sequence_of_steps_for_sol', 'A repeatable sequence of steps for solving a problem.')),
                  h('dt', null, t('stem.trajectorycomputing.human_computer', 'Human computer')), h('dd', null, t('stem.trajectorycomputing.a_person_employed_to_perform_and_verif', 'A person employed to perform and verify mathematical calculations.')),
                  h('dt', null, 'FORTRAN'), h('dd', null, t('stem.trajectorycomputing.an_early_language_designed_for_scienti', 'An early language designed for scientific and engineering computation.')),
                  h('dt', null, t('stem.trajectorycomputing.compiler', 'Compiler')), h('dd', null, t('stem.trajectorycomputing.a_program_that_translates_source_instr', 'A program that translates source instructions and reports structural errors.')),
                  h('dt', null, t('stem.trajectorycomputing.punch_card', 'Punch card')), h('dd', null, t('stem.trajectorycomputing.a_physical_card_that_encoded_one_line_', 'A physical card that encoded one line of data or program instructions.')),
                  h('dt', null, t('stem.trajectorycomputing.batch_job', 'Batch job')), h('dd', null, t('stem.trajectorycomputing.a_prepared_program_submitted_for_proce', 'A prepared program submitted for processing without an interactive screen.')),
                  h('dt', null, t('stem.trajectorycomputing.verification', 'Verification')), h('dd', null, t('stem.trajectorycomputing.an_independent_check_that_a_result_agr', 'An independent check that a result agrees with requirements and evidence.'))
                )
              ),
              h('details', null,
                h('summary', null, t('stem.trajectorycomputing.teacher_guide', 'Teacher guide')),
                h('div', { className: 'tc-sources' },
                  h('p', null, h('strong', null, t('stem.trajectorycomputing.suggested_time', 'Suggested time: ')), t('stem.trajectorycomputing.40_60_minutes_individually_or_in_pairs', '40-60 minutes individually or in pairs.')),
                  h('p', null, h('strong', null, t('stem.trajectorycomputing.learning_objectives', 'Learning objectives'))),
                  h('ul', { className: 'tc-teacher-list' },
                    h('li', null, t('stem.trajectorycomputing.read_a_printed_reference_table_decompo', 'Read a printed reference table, decompose velocity, and apply a multi-step mathematical model.')),
                    h('li', null, t('stem.trajectorycomputing.explain_how_variable_names_constants_f', 'Explain how variable names, constants, functions, and statement order affect a program.')),
                    h('li', null, t('stem.trajectorycomputing.distinguish_compilation_execution_outp', 'Distinguish compilation, execution, output interpretation, and independent verification.')),
                    h('li', null, t('stem.trajectorycomputing.connect_computing_history_to_the_docum', 'Connect computing history to the documented labor and expertise of women mathematicians and programmers.'))
                  ),
                  h('p', null, h('strong', null, t('stem.trajectorycomputing.prerequisites', 'Prerequisites: ')), t('stem.trajectorycomputing.prerequisite_list', 'ratios and signed quantities; introductory sine and cosine; variables and order of operations; units and rounding. No prior FORTRAN experience is required.')),
                  h('p', null, h('strong', null, t('stem.trajectorycomputing.suggested_standards_alignment', 'Suggested standards alignment: ')), t('stem.trajectorycomputing.standards_alignment_text', 'CSTA computational problem solving—decompose, test, debug, and refine a computational artifact; mathematics—model quantities, attend to precision, and interpret functions. Verify wording and identifiers against the standards edition adopted by your district.')),
                  h('table', { className: 'tc-rubric' },
                    h('caption', null, t('stem.trajectorycomputing.compact_evidence_rubric', 'Compact evidence rubric')),
                    h('thead', null, h('tr', null,
                      h('th', { scope: 'col' }, t('stem.trajectorycomputing.criterion', 'Criterion')),
                      h('th', { scope: 'col' }, t('stem.trajectorycomputing.meets', 'Meets')),
                      h('th', { scope: 'col' }, t('stem.trajectorycomputing.developing', 'Developing'))
                    )),
                    h('tbody', null,
                      [
                        [t('stem.trajectorycomputing.rubric_mathematical_model', 'Mathematical model'), t('stem.trajectorycomputing.rubric_math_meets', 'Calculations, units, and tolerance checks agree.'), t('stem.trajectorycomputing.rubric_math_developing', 'One or more steps need correction or clearer units.')],
                        [t('stem.trajectorycomputing.rubric_program_reasoning', 'Program reasoning'), t('stem.trajectorycomputing.rubric_program_meets', 'Listing compiles and revisions connect to card diagnostics.'), t('stem.trajectorycomputing.rubric_program_developing', 'Fixes are incomplete or not connected to evidence.')],
                        [t('stem.trajectorycomputing.rubric_verification', 'Verification'), t('stem.trajectorycomputing.rubric_verification_meets', 'Independent evidence supports a justified GO/HOLD decision.'), t('stem.trajectorycomputing.rubric_verification_developing', 'Decision relies on machine output alone or lacks justification.')],
                        [t('stem.trajectorycomputing.rubric_historical_reasoning', 'Historical reasoning'), t('stem.trajectorycomputing.rubric_history_meets', 'Explains how human expertise and safeguards shaped the workflow.'), t('stem.trajectorycomputing.rubric_history_developing', 'Names a tool or person without explaining the work process.')],
                        [t('stem.trajectorycomputing.rubric_transfer_reasoning', 'Transfer reasoning'), t('stem.trajectorycomputing.rubric_transfer_meets', 'Predicts a replay outcome and uses the comparison evidence to explain or revise the prediction.'), t('stem.trajectorycomputing.rubric_transfer_developing', 'Runs a replay card without connecting the changed inputs to the result.')]
                      ].map(function (row) { return h('tr', { key: row[0] }, h('th', { scope: 'row' }, row[0]), h('td', null, row[1]), h('td', null, row[2])); })
                    )
                  ),
                  h('p', null, h('strong', null, t('stem.trajectorycomputing.evidence_to_collect', 'Evidence to collect: ')), t('stem.trajectorycomputing.printed_trigonometry_lookup_table_prec', 'printed trigonometry lookup, table-precision prediction, calculation ledger, repaired listing, line-printer format card, fixed-width preview confirmation, ordered deck, machine read-back, reproducibility note, audit-role record, GO/HOLD reasoning, angle-study prediction, mission-replay prediction and comparison, and the completion report.')),
                  h('p', null, h('strong', null, t('stem.trajectorycomputing.debrief_prompts', 'Debrief prompts: ')), t('stem.trajectorycomputing.why_did_card_order_matter_which_errors', 'Why did card order matter? Which errors could a compiler detect? Why should a person verify a machine result?'))
                )
              ),
              h('details', null,
                h('summary', null, t('stem.trajectorycomputing.model_limits', 'Model limits')),
                h('p', { className: 'tc-sources' }, t('stem.trajectorycomputing.the_flight_model_is_a_classroom_scale_', 'The flight model is a classroom-scale two-dimensional ballistic approximation. It ignores air resistance, winds, Earth curvature, propulsion after release, and orbital mechanics. It is realistic as a verification workflow, not as a complete launch model.'))
              ),
              h('p', { className: 'tc-sources', style: { marginTop: 16 } }, t('stem.trajectorycomputing.fictional_mission_original_interface_a', 'Fictional mission. Original interface and instructional text. No NASA insignia, film assets, dialogue, music, or character portrayals are used.'))
            )
          )
        )
      );
    }
  });

  if (typeof console !== 'undefined') console.log('[StemLab] stem_tool_trajectorycomputing.js loaded - Trajectory Computing Lab');
})();
