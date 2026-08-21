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
  var MISSION = Object.freeze({
    name: 'Aurora Test 3',
    facility: 'National Aeronautics Laboratory',
    year: 1962,
    speed: 215,
    angle: 38,
    height: 30,
    gravity: 9.81,
    zoneMin: 4550,
    zoneMax: 4700
  });

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
      if (!pattern.test(joined)) diagnostics.push({ code: codeId, message: message });
    }
    requirePattern(/^PROGRAMAURORA$/m, 'Add the PROGRAM AURORA opening card.', 'E101');
    requirePattern(/^END$/m, 'The final executable card must say END.', 'E102');
    requirePattern(/^V=215(?:\.0+)?$/m, 'Set launch speed V to 215.0 m/s.', 'D201');
    requirePattern(/^ANGLE=38(?:\.0+)?$/m, 'Set ANGLE to 38.0 degrees.', 'D202');
    requirePattern(/^G=9\.81(?:0*)?$/m, 'Gravity is 9.81 m/s^2; check the transposed digits.', 'D203');
    requirePattern(/^Y0=30(?:\.0+)?$/m, 'Set initial height Y0 to 30.0 m.', 'D204');
    if (/ANGEL/.test(joined)) diagnostics.push({ code: 'N301', message: 'ANGEL and ANGLE are different variable names. Correct the transposition.' });
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
      if (index >= 0 && index < lastIndex) diagnostics.push({ code: 'S601', message: 'A value is used before it is calculated. Recheck statement order.' });
      if (index >= 0) lastIndex = index;
    });
    var unique = [];
    diagnostics.forEach(function (item) {
      if (!unique.some(function (prior) { return prior.code === item.code && prior.message === item.message; })) unique.push(item);
    });
    return { pass: unique.length === 0, diagnostics: unique, normalizedLines: lines };
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

  function createSafeguardSummary(state, assignment) {
    state = state || {};
    var trail = normalizeAuditTrail(state.auditTrail);
    var expectedTrail = [
      ['briefing', 'worksheet'], ['worksheet', 'program'], ['program', 'cards'],
      ['cards', 'batch'], ['batch', 'verify'], ['verify', 'complete']
    ];
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

  function createEvidenceRecord(state, timestamp) {
    state = state || {};
    var when = Number.isFinite(timestamp) ? timestamp : Date.now();
    var completed = state.completed || {};
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
        reproducibility: Object.assign({}, state.reproducibility || {}),
        reproducibilityPassed: !!(state.reproducibilityResult && state.reproducibilityResult.pass),
        auditTrail: normalizeAuditTrail(state.auditTrail),
        calculationLedger: buildCalculationLedger(state.worksheet || {}),
        compilePassed: !!(state.compileResult && state.compileResult.pass),
        deckPassed: !!(state.deckResult && state.deckResult.pass),
        batchCompleted: state.runStatus === 'complete',
        verificationPassed: !!(state.verificationResult && state.verificationResult.pass),
        verification: Object.assign({}, state.verification || {}),
        workflow: {
          pattern: state.workPattern === 'solo' ? 'solo' : 'pair',
          assignmentPassed: !!(state.verificationResult && state.verificationResult.assignmentPass)
        },
        angleStudy: state.studyResult ? {
          angle: state.studyResult.angle,
          relation: state.studyResult.relation,
          range: state.studyResult.result && state.studyResult.result.range
        } : null
      },
      timestamp: when
    };
  }

  function createCompletionReport(state) {
    state = state || {};
    var ledger = buildCalculationLedger(state.worksheet || {});
    var pattern = state.workPattern === 'solo' ? 'solo' : 'pair';
    var assignment = checkVerificationAssignment(pattern, state.verification || {});
    var study = state.studyResult || null;
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
      reproducibilityNote: state.reproducibilityResult || null,
      safeguards: createSafeguardSummary(state, assignment),
      auditTrail: normalizeAuditTrail(state.auditTrail),
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
        correct: !!study.correct
      } : null,
      modelLimit: 'Two-dimensional ballistic approximation; air resistance, wind, Earth curvature, propulsion, and orbital mechanics are not modeled.'
    };
  }

  function trajectoryQuestData(data) {
    return (data && data[STATE_KEY]) || data || {};
  }

  window.TrajectoryComputingCore = Object.freeze({
    mission: MISSION,
    trigTable: TRIG_TABLE,
    formatCard: FORMAT_CARD,
    expected: EXPECTED,
    correctProgram: CORRECT_PROGRAM,
    starterProgram: STARTER_PROGRAM,
    cardLibrary: CARD_LIBRARY,
    correctDeck: CORRECT_DECK.slice(),
    starterDeck: STARTER_DECK.slice(),
    computeTrajectory: computeTrajectory,
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
    normalizeDeck: normalizeDeck,
    validateDeck: validateDeck,
    moveCard: moveCard,
    formatPrintout: formatPrintout,
    verifyIndependentCheck: verifyIndependentCheck,
    checkVerificationAssignment: checkVerificationAssignment,
    checkReproducibilityNote: checkReproducibilityNote,
    classifyAngleStudy: classifyAngleStudy,
    createEvidenceRecord: createEvidenceRecord,
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
      '[data-trajectory-lab] button,[data-trajectory-lab] input,[data-trajectory-lab] select,[data-trajectory-lab] textarea{font:inherit}',
      '[data-trajectory-lab] button:focus-visible,[data-trajectory-lab] input:focus-visible,[data-trajectory-lab] select:focus-visible,[data-trajectory-lab] textarea:focus-visible,[data-trajectory-lab] summary:focus-visible,[data-trajectory-lab] a:focus-visible{outline:3px solid #fff;outline-offset:3px;box-shadow:0 0 0 6px #173c32}',
      '[data-trajectory-lab] .tc-back,[data-trajectory-lab] .tc-action,[data-trajectory-lab] .tc-small{border:0;border-radius:9px;font-weight:800;cursor:pointer}',
      '[data-trajectory-lab] .tc-back{background:#f5efd9;color:#173c32;padding:9px 13px;white-space:nowrap}',
      '[data-trajectory-lab] .tc-action{background:#a64220;color:#fff;padding:11px 16px;box-shadow:0 3px 0 #7b2f18}',
      '[data-trajectory-lab] .tc-action.secondary{background:#173c32;box-shadow:0 3px 0 #0b211b}',
      '[data-trajectory-lab] .tc-action:disabled,[data-trajectory-lab] .tc-small:disabled{opacity:.46;cursor:not-allowed;box-shadow:none}',
      '[data-trajectory-lab] .tc-tabs{display:grid;grid-template-columns:repeat(6,minmax(112px,1fr));gap:7px;overflow-x:auto;padding:4px 4px 10px}',
      '[data-trajectory-lab] .tc-tab{min-height:52px;border:1px solid #8e8568;border-radius:8px;background:#ebe4ca;color:#26372f;padding:7px;text-align:left;font-weight:800;cursor:pointer}',
      '[data-trajectory-lab] .tc-tab[aria-selected=true]{background:#a64220;color:#fff;border-color:#7b2f18}',
      '[data-trajectory-lab] .tc-tab:disabled{opacity:.68;background:#d7d1b8;color:#4d5b54;border-style:dashed;cursor:not-allowed}',
      '[data-trajectory-lab] .tc-tab-num{display:block;font:700 10px/1 ui-monospace,monospace;opacity:1;margin-bottom:4px}',
      '[data-trajectory-lab] .tc-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(245px,310px);gap:16px;align-items:start}',
      '[data-trajectory-lab] .tc-paper,[data-trajectory-lab] .tc-side{background:var(--tc-paper);border:1px solid #a99e79;border-radius:12px;box-shadow:0 9px 26px rgba(22,38,32,.2)}',
      '[data-trajectory-lab] .tc-paper{padding:clamp(17px,3vw,30px);min-width:0;min-height:520px;background-image:repeating-linear-gradient(0deg,transparent,transparent 27px,rgba(89,112,101,.09) 28px)}',
      '[data-trajectory-lab] .tc-side{padding:16px;position:sticky;top:12px}',
      '[data-trajectory-lab] .tc-heading{font:800 clamp(21px,3vw,30px)/1.1 Georgia,serif;color:#173c32;margin:0 0 8px}',
      '[data-trajectory-lab] .tc-lede{font-size:14px;line-height:1.6;max-width:74ch}',
      '[data-trajectory-lab] .tc-note{border-left:5px solid #a64220;background:#fff9e7;padding:12px 14px;margin:14px 0;font-size:13px;line-height:1.5}',
      '[data-trajectory-lab] .tc-next-cue{border-left:5px solid #a64220;background:#fff9e7;border-radius:7px;padding:10px 12px;margin:12px 0;font-size:13px;line-height:1.5}',
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
      '[data-trajectory-lab] .tc-code{min-height:360px;resize:vertical;font:600 13px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre;tab-size:6}',
      '[data-trajectory-lab] .tc-diag{padding:9px 11px;margin:7px 0;border-radius:7px;background:#fff0e8;border:1px solid #d99872;font-size:13px}',
      '[data-trajectory-lab] .tc-card{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr) 84px 72px;gap:8px;align-items:center;background:#f7efc8;border:1px solid #9c8f61;border-radius:5px;padding:8px 9px 8px 20px;margin:7px 0;box-shadow:0 2px 0 #c3b787;font:700 12px/1.25 ui-monospace,monospace}',
      '[data-trajectory-lab] .tc-card:before{content:"";position:absolute;left:5px;top:5px;bottom:5px;width:7px;background:repeating-linear-gradient(0deg,#8b805b 0 4px,transparent 4px 10px);opacity:.65}',
      '[data-trajectory-lab] .tc-seq{font-size:10px;color:#675c39}',
      '[data-trajectory-lab] .tc-small{background:#173c32;color:#fff;min-width:31px;min-height:31px;padding:5px}',
      '[data-trajectory-lab] .tc-machine{border:8px solid #355348;border-radius:14px;background:#14221e;padding:18px;color:#c9f6df;box-shadow:inset 0 0 0 2px #779184}',
      '[data-trajectory-lab] .tc-lights{display:flex;gap:9px;margin-bottom:12px}.tc-light{width:14px;height:14px;border-radius:50%;background:#55655e}.tc-light.on{background:#ffbd43;box-shadow:0 0 14px #ffbd43}',
      '[data-trajectory-lab] .tc-printout{white-space:pre-wrap;background:#f8f1d5;color:#1a2922;border-left:16px dotted #d5c797;padding:18px;font:700 13px/1.55 ui-monospace,monospace;overflow:auto}',
      '[data-trajectory-lab] .tc-chart{display:block;width:100%;height:auto;background:#102d27;border-radius:10px;margin-top:14px}',
      '[data-trajectory-lab] .tc-check{border:2px solid #2d6653;background:#e0f2e9;border-radius:10px;padding:14px;margin-top:14px}',
      '[data-trajectory-lab] .tc-certificate{border:7px double #173c32;padding:22px;text-align:center;background:#fff9df;margin-top:18px}',
      '[data-trajectory-lab] .tc-extension{border:2px solid #9c8f61;border-radius:10px;background:#eee5c6;padding:16px;margin-top:18px}',
      '[data-trajectory-lab] .tc-extension h3{margin:0 0 7px;font:800 20px/1.2 Georgia,serif;color:#173c32}',
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
      '[data-trajectory-lab] .tc-role-box{border:1px solid #9c8f61;border-radius:9px;background:#eee5c6;padding:14px;margin:14px 0}',
      '[data-trajectory-lab] .tc-repro-box{border:2px dashed #2d6653;border-radius:9px;background:#e0f2e9;padding:14px;margin:14px 0}',
      '[data-trajectory-lab] .tc-role-grid{display:grid;grid-template-columns:repeat(2,minmax(160px,1fr));gap:12px;margin-top:10px}',
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
      '[data-trajectory-lab] details{margin-top:14px;border-top:1px solid #bcb18d;padding-top:11px}.tc-side summary{font-weight:800;cursor:pointer}',
      '[data-trajectory-lab] .tc-sources{font-size:11px;line-height:1.45}.tc-sources a{color:#0e5a75;font-weight:800}',
      '[data-trajectory-lab] .tc-glossary{display:grid;grid-template-columns:auto 1fr;gap:6px 9px;font-size:11px;line-height:1.4}.tc-glossary dt{font-weight:900;color:#173c32}.tc-glossary dd{margin:0}',
      '[data-trajectory-lab] .tc-teacher-list{padding-left:18px;font-size:11px;line-height:1.5}',
      '@media(max-width:900px){[data-trajectory-lab] .tc-grid{grid-template-columns:minmax(0,1fr)}[data-trajectory-lab] .tc-side{position:static}[data-trajectory-lab] .tc-data{grid-template-columns:repeat(2,1fr)}}',
      '@media(max-width:560px){[data-trajectory-lab] .tc-top{flex-direction:column}[data-trajectory-lab] .tc-fields,[data-trajectory-lab] .tc-study-grid,[data-trajectory-lab] .tc-role-grid,[data-trajectory-lab] .tc-report-grid,[data-trajectory-lab] .tc-checklist{grid-template-columns:1fr}[data-trajectory-lab] .tc-card{grid-template-columns:32px minmax(0,1fr) 66px}[data-trajectory-lab] .tc-card-actions{grid-column:2/4}[data-trajectory-lab] .tc-data{grid-template-columns:1fr 1fr}[data-trajectory-lab] .tc-result-grid{grid-template-columns:1fr}[data-trajectory-lab] .tc-report-head{display:block}}',
      '@media(prefers-reduced-motion:reduce){[data-trajectory-lab] *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}',
      '@media(forced-colors:active){[data-trajectory-lab] .tc-paper,[data-trajectory-lab] .tc-side,[data-trajectory-lab] .tc-machine{border:2px solid CanvasText}[data-trajectory-lab] .tc-action,[data-trajectory-lab] .tc-tab{forced-color-adjust:auto}}',
      '@media print{[data-trajectory-lab] .tc-top,[data-trajectory-lab] .tc-tabs,[data-trajectory-lab] .tc-side,[data-trajectory-lab] .tc-paper>section>*:not(.tc-report){display:none!important}[data-trajectory-lab] .tc-shell{background:#fff;padding:0}[data-trajectory-lab] .tc-grid{display:block}[data-trajectory-lab] .tc-paper{border:0;box-shadow:none;background:#fff;padding:0;min-height:0}[data-trajectory-lab] .tc-report{display:block!important;border:1px solid #000;margin:0}[data-trajectory-lab] .tc-report .tc-action{display:none!important}}'
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

  function trajectoryPath() {
    var width = 680, height = 245, left = 34, bottom = 212;
    var points = [];
    for (var i = 0; i <= 32; i++) {
      var t = EXPECTED.flightTime * i / 32;
      var x = EXPECTED.vx * t;
      var y = MISSION.height + EXPECTED.vy * t - 0.5 * MISSION.gravity * t * t;
      var px = left + (x / 4900) * (width - left - 22);
      var py = bottom - (Math.max(0, y) / (EXPECTED.peakHeight * 1.14)) * (bottom - 22);
      points.push(round(px, 1) + ',' + round(py, 1));
    }
    return points.join(' ');
  }

  window.StemLab.registerTool('trajectoryComputing', {
    icon: '\uD83D\uDDA5\uFE0F',
    label: 'Trajectory Computing Lab',
    desc: 'Recreate the human-computing workflow: calculate a flight path, debug FORTRAN-style code, sequence punch cards, run a batch job, and independently verify the result.',
    color: 'emerald',
    category: 'coding',
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
      }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData[STATE_KEY]) || {};
      var stage = safeStage(d.stage);
      var completed = d.completed || {};
      var mode = ['guided', 'standard', 'expert'].indexOf(d.mode) >= 0 ? d.mode : 'guided';
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
      var reproducibility = d.reproducibility || {};
      var reproducibilityResult = d.reproducibilityResult || null;
      var auditTrail = normalizeAuditTrail(d.auditTrail);
      var verification = d.verification || {};
      var verificationResult = d.verificationResult || null;
      var workPattern = d.workPattern === 'solo' ? 'solo' : 'pair';
      var studyAngle = finiteNumber(d.studyAngle);
      if (studyAngle === null) studyAngle = 46;
      var studyPrediction = d.studyPrediction || '';
      var studyResult = d.studyResult || null;

      function update(patch) {
        ctx.setToolData(function (prev) {
          var nextState = Object.assign({}, (prev && prev[STATE_KEY]) || {}, patch || {});
          var result = Object.assign({}, prev || {});
          result[STATE_KEY] = nextState;
          return result;
        });
      }
      function markComplete(id, nextStage, extra) {
        var nextCompleted = Object.assign({}, completed); nextCompleted[id] = true;
        var nextAuditTrail = auditTrail.concat([{ station: id, nextStage: nextStage, recordedAt: Date.now() }]);
        update(Object.assign({ completed: nextCompleted, stage: nextStage, auditTrail: nextAuditTrail }, extra || {}));
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR(id + ' station complete. Moving to ' + nextStage + '.');
      }
      function setWorksheetField(id, value) {
        var next = Object.assign({}, worksheet); next[id] = value;
        update({ worksheet: next, worksheetResult: null });
      }
      function setTableField(id, value) {
        var next = Object.assign({}, tableLookup); next[id] = value;
        update({ tableLookup: next, tableResult: null, tableApproximationResult: null });
      }
      function setFormatAuditField(id, value) {
        var next = Object.assign({}, formatAudit); next[id] = value;
        update({ formatAudit: next, formatAuditResult: null });
      }
      function setBatchReadbackField(id, value) {
        var next = Object.assign({}, batchReadback); next[id] = value;
        update({ batchReadback: next, batchReadbackResult: null });
      }
      function setReproducibilityField(id, value) {
        var next = Object.assign({}, reproducibility); next[id] = value;
        update({ reproducibility: next, reproducibilityResult: null, verificationResult: null });
      }
      function setVerificationField(id, value) {
        var next = Object.assign({}, verification); next[id] = value;
        update({ verification: next, verificationResult: null });
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
          if (typeof ctx.addToast === 'function') ctx.addToast('Snapshots are unavailable in this host.', 'error');
          return;
        }
        var snapshot = createEvidenceRecord(d, Date.now());
        ctx.setToolSnapshots(function (prev) { return (prev || []).concat([snapshot]); });
        update({ lastSnapshotAt: snapshot.timestamp });
        if (typeof ctx.addToast === 'function') ctx.addToast('Trajectory evidence snapshot saved.', 'success');
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR('Trajectory evidence snapshot saved to the lesson.');
      }
      function restartMission() {
        ctx.setToolData(function (prev) {
          var next = Object.assign({}, prev || {});
          next[STATE_KEY] = { mode: mode, workPattern: workPattern, stage: 'briefing' };
          return next;
        });
        if (typeof ctx.announceToSR === 'function') ctx.announceToSR('Trajectory Computing Lab reset to the briefing.');
      }

      var stages = [
        ['briefing', 'Briefing'], ['worksheet', 'Hand math'], ['program', 'Program'],
        ['cards', 'Card deck'], ['batch', 'Batch run'], ['verify', 'Verify']
      ];
      var currentIndex = stages.findIndex(function (item) { return item[0] === stage; });
      var unlockedIndex = stageCompletionIndex(completed);
      var completedCount = stages.filter(function (item) { return !!completed[item[0]]; }).length;
      var progressPercent = Math.round(completedCount / stages.length * 100);

      function dataTile(label, value) {
        return h('div', { className: 'tc-datum' }, h('b', null, value), h('span', null, label));
      }
      function action(label, onClick, secondary, disabled) {
        return h('button', { type: 'button', className: 'tc-action' + (secondary ? ' secondary' : ''), onClick: onClick, disabled: !!disabled }, label);
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

      function renderLedger(answers, caption) {
        var ledger = buildCalculationLedger(answers);
        return h('div', { className: 'tc-ledger-wrap' },
          h('table', { className: 'tc-ledger' },
            h('caption', { style: { textAlign: 'left', padding: 10, fontWeight: 900 } }, caption || 'Calculation audit ledger'),
            h('thead', null, h('tr', null,
              h('th', { scope: 'col' }, 'Step'), h('th', { scope: 'col' }, 'Substitution'),
              h('th', { scope: 'col' }, 'Entered'), h('th', { scope: 'col' }, 'Reference'), h('th', { scope: 'col' }, 'Audit')
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

      function renderAuditTrail(trail) {
        var labels = {
          briefing: 'Briefing', worksheet: 'Hand math', program: 'Program',
          cards: 'Card deck', batch: 'Batch run', verify: 'Verify', complete: 'Completion'
        };
        var entries = normalizeAuditTrail(trail);
        return h('section', { className: 'tc-audit-log', 'aria-labelledby': 'tc-audit-log-title' },
          h('h4', { id: 'tc-audit-log-title' }, 'Operator audit log'),
          entries.length
            ? h('ol', null, entries.map(function (event, index) {
              var fromLabel = labels[event.station] || event.station;
              var toLabel = labels[event.nextStage] || event.nextStage;
              return h('li', { key: event.station + '-' + event.nextStage + '-' + index },
                h('strong', null, String(index + 1).padStart(2, '0') + ' / ' + fromLabel), ' → ', toLabel
              );
            }))
            : h('p', { className: 'tc-lede' }, 'No station handoffs recorded in this snapshot.')
        );
      }

      function renderCompletionReport() {
        var report = createCompletionReport(d);
        var formatFields = report.formatAudit && report.formatAudit.fields || {};
        var safeguards = report.safeguards || { checks: [], passed: 0, total: 0 };
        return h('section', { className: 'tc-report', 'aria-labelledby': 'tc-report-title' },
          h('div', { className: 'tc-report-head' },
            h('div', null,
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Fictional National Aeronautics Laboratory'),
              h('h3', { id: 'tc-report-title', style: { margin: '4px 0' } }, report.title),
              h('p', { style: { margin: 0 } }, 'Work order ' + report.workOrder + ' / instructional simulation')
            ),
            h('strong', { style: { fontFamily: 'ui-monospace,monospace', color: '#17633f' } }, report.status)
          ),
          h('div', { className: 'tc-report-grid' },
            h('div', { className: 'tc-report-card' }, h('b', null, report.workflow), 'verification workflow'),
            h('div', { className: 'tc-report-card' }, h('b', null, round(report.output.range, 1) + ' m'), 'verified landing range'),
            h('div', { className: 'tc-report-card' }, h('b', null, report.output.verdict), 'landing-zone recommendation')
          ),
          h('h4', null, 'Audit chain'),
          h('ul', { className: 'tc-checklist' }, report.checks.map(function (check) {
            return h('li', { key: check.label }, (check.pass ? '\u2713 ' : '\u25CB ') + check.label);
          })),
          renderAuditTrail(report.auditTrail),
          h('details', { className: 'tc-safeguards' },
            h('summary', null, 'Accessibility and audit safeguards (' + safeguards.passed + '/' + safeguards.total + ' verified)'),
            h('p', { className: 'tc-lede', role: 'status' }, safeguards.passed + ' of ' + safeguards.total + ' evidence safeguards verified in this report.'),
            h('ul', { className: 'tc-checklist' }, safeguards.checks.map(function (check) {
              return h('li', { key: check.id }, (check.pass ? '\u2713 Verified: ' : '\u25CB Needs review: ') + check.label + ' - ' + check.detail);
            })),
            h('p', { className: 'tc-lede' }, 'Interface safeguards: Keyboard station tabs support Arrow keys, Home, and End. Visible focus rings and 24-pixel checkbox and radio targets support keyboard and switch access. The line-printer preview and machine read-back remain separate checks so learners can inspect output independently.')
          ),
          h('p', null, h('strong', null, 'Role separation: '), report.assignment.message),
          renderLedger(d.worksheet || {}, 'Hand-calculation audit ledger'),
          report.tableApproximation && h('p', null, h('strong', null, 'Table-precision control: '), 'The four-place reference estimate was ' + round(report.tableApproximation.range, 1) + ' m, a ' + round(Math.abs(report.tableApproximation.difference), 2) + ' m difference. Prediction ' + (report.tableApproximation.correct ? 'supported.' : 'needs revision.')),
          report.formatAudit && h('p', null, h('strong', null, 'Format card: '), 'TIME ' + (formatFields.timeFormat && formatFields.timeFormat.actual || '\u2014') + ', RANGE ' + (formatFields.rangeFormat && formatFields.rangeFormat.actual || '\u2014') + ', order ' + (formatFields.order && formatFields.order.actual || '\u2014') + '.'),
          report.printPreview && h('div', null,
            h('p', null, h('strong', null, 'Fixed-width preview: '), report.printPreview.pass ? 'confirmed.' : 'needs review.'),
            h('pre', { className: 'tc-print-preview', 'aria-label': 'Confirmed fixed-width line-printer preview' }, report.printPreview.actualLine || '\u2014')
          ),
          report.batchReadback && h('p', null, h('strong', null, 'Machine read-back: '), report.batchReadback.correct + ' of ' + report.batchReadback.total + ' read-back fields matched the printed job.'),
          report.reproducibilityNote && h('p', null, h('strong', null, 'Reproducibility note: '), report.reproducibilityNote.correct + ' of ' + report.reproducibilityNote.total + ' fixed mission inputs recorded.'),
          report.angleStudy && h('p', null, h('strong', null, 'Parameter study: '), report.angleStudy.angle + ' degrees produced ' + round(report.angleStudy.range, 1) + ' m, ' + report.angleStudy.relation + ' than baseline. Prediction ' + (report.angleStudy.correct ? 'supported.' : 'revised.')),
          h('p', { className: 'tc-lede' }, h('strong', null, 'Model limit: '), report.modelLimit),
          h('p', { className: 'tc-lede' }, 'Original fictional mission and report. Historical context is documented separately in the lab; no copyrighted film material is reproduced.'),
          h('div', { className: 'tc-row' },
            action('Print this report', function () { if (typeof window !== 'undefined' && typeof window.print === 'function') window.print(); }),
            action('Close report', function () { update({ reportOpen: false }); }, true)
          )
        );
      }

      function renderReferenceTable() {
        return h('section', { className: 'tc-reference-table', 'aria-labelledby': 'tc-reference-table-title' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Desk card / printed reference'),
          h('h3', { id: 'tc-reference-table-title' }, 'Read the trigonometry table before calculating.'),
          h('p', { className: 'tc-lede' }, 'The table is a shared reference, not a calculator. Find the 38-degree row and record four decimal places for sin(theta) and cos(theta).'),
          h('div', { className: 'tc-ledger-wrap' },
            h('table', { className: 'tc-ledger' },
              h('caption', { style: { textAlign: 'left', padding: 10, fontWeight: 900 } }, 'Printed values / angle in degrees'),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Angle'), h('th', { scope: 'col' }, 'sin(theta)'), h('th', { scope: 'col' }, 'cos(theta)'))),
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
              h('label', { className: 'tc-field' }, 'sin(theta) at 38 deg', h('input', { type: 'number', step: '0.0001', inputMode: 'decimal', value: tableLookup.sin == null ? '' : tableLookup.sin, onChange: function (event) { setTableField('sin', event.target.value); } }),
                tableResult && h('small', { className: tableResult.fields.sin.ok ? 'tc-ok' : 'tc-bad' }, tableResult.fields.sin.message)
              ),
              h('label', { className: 'tc-field' }, 'cos(theta) at 38 deg', h('input', { type: 'number', step: '0.0001', inputMode: 'decimal', value: tableLookup.cos == null ? '' : tableLookup.cos, onChange: function (event) { setTableField('cos', event.target.value); } }),
                tableResult && h('small', { className: tableResult.fields.cos.ok ? 'tc-ok' : 'tc-bad' }, tableResult.fields.cos.message)
              )
            ),
            tableResult && h('p', { role: 'status', className: tableResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, tableResult.correct + ' of ' + tableResult.total + ' reference values recorded.'),
            h('div', { className: 'tc-row' }, h('button', { type: 'submit', className: 'tc-action' }, 'Check table lookup'))
          ),
          h('div', { className: 'tc-control-box' },
            h('h4', { style: { margin: '0 0 6px' } }, 'Control estimate: how much does table precision change the range?'),
            h('p', { className: 'tc-lede' }, 'Predict first. Using the four-place table values, will the landing range differ from the full-precision result by more than 3 meters?'),
            h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
              h('legend', { className: 'tc-field' }, 'My prediction'),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-table-prediction', value: 'within', checked: tableApproximationPrediction === 'within', onChange: function () { update({ tableApproximationPrediction: 'within', tableApproximationResult: null }); } }), ' Within 3 meters'),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-table-prediction', value: 'outside', checked: tableApproximationPrediction === 'outside', onChange: function () { update({ tableApproximationPrediction: 'outside', tableApproximationResult: null }); } }), ' More than 3 meters')
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
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Work order 62-AUR-03'),
          h('h2', { className: 'tc-heading' }, 'The answer must be trusted before the vehicle flies.'),
          h('p', { className: 'tc-lede' }, 'You have joined the fictional National Aeronautics Laboratory as a computation specialist. Aurora Test 3 will release a research capsule from a 30-meter tower. Your team must predict where it lands, translate the method into early scientific code, prepare the card deck, and check the machine independently.'),
          h('div', { className: 'tc-note' }, h('strong', null, 'Historical boundary: '), 'The mission, facility, documents, and interface in this simulation are original and fictional. The workflow is grounded in documented history about women who worked as human computers and later programmed early electronic computers.'),
          h('div', { className: 'tc-data', 'aria-label': 'Mission constants' },
            dataTile('release speed', '215 m/s'), dataTile('launch angle', '38 degrees'),
            dataTile('initial height', '30 m'), dataTile('landing zone', '4.55-4.70 km')
          ),
          h('h3', null, 'Your assignment'),
          h('ol', { className: 'tc-lede' },
            h('li', null, 'Read the printed trigonometry table and record the 38-degree reference values.'),
            h('li', null, 'Resolve velocity into horizontal and vertical components.'),
            h('li', null, 'Calculate time aloft and downrange distance.'),
            h('li', null, 'Debug a FORTRAN-style transcription and order its card deck.'),
            h('li', null, 'Audit the line-printer format card and inspect its fixed-width preview before releasing the deck.'),
            h('li', null, 'Run the batch job, transcribe its printed range and status, then verify it without relying on the printout.')
          ),
          h('fieldset', { className: 'tc-role-box' },
            h('legend', { style: { fontWeight: 900 } }, 'Choose the verification workflow'),
            h('label', { style: { display: 'block', marginTop: 7 } },
              h('input', { type: 'radio', name: 'tc-work-pattern', value: 'pair', checked: workPattern === 'pair', onChange: function () { update({ workPattern: 'pair', verification: {}, verificationResult: null }); } }),
              ' Paired cross-check \u2014 separate calculator and verifier desk codes'
            ),
            h('label', { style: { display: 'block', marginTop: 7 } },
              h('input', { type: 'radio', name: 'tc-work-pattern', value: 'solo', checked: workPattern === 'solo', onChange: function () { update({ workPattern: 'solo', verification: {}, verificationResult: null }); } }),
              ' Solo dual-pass audit \u2014 recompute after a deliberate reset'
            ),
            h('p', { className: 'tc-lede', style: { marginBottom: 0 } }, 'Desk codes represent roles, not student names. The lab stores no personal identifiers.')
          ),
          h('div', { className: 'tc-row' },
            action('Begin hand calculation', function () { markComplete('briefing', 'worksheet'); }),
            action('Read assignment aloud', function () { speak('Aurora Test 3. Calculate the flight path by hand, debug the early scientific program, prepare its punch cards, run the batch job, and independently verify the landing estimate.'); }, true)
          )
        );
      }

      function renderWorksheet() {
        var fieldDefs = [
          ['vx', 'Horizontal velocity Vx', 'm/s'], ['vy', 'Vertical velocity Vy', 'm/s'],
          ['flightTime', 'Positive flight time t', 'seconds'], ['range', 'Downrange distance R', 'meters']
        ];
        return h('section', { role: 'tabpanel', id: 'tc-panel-worksheet', 'aria-labelledby': 'tc-tab-worksheet' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Station 02 / desktop calculation'),
          h('h2', { className: 'tc-heading' }, 'Build a result the electronic computer can be checked against.'),
          h('p', { className: 'tc-lede' }, 'Keep units beside every value. Use at least two decimal places until the final step.'),
          renderReferenceTable(),
          (mode === 'guided' || d.showReference) && h('div', { className: 'tc-formula', 'aria-label': 'Formula reference' },
            'theta radians = theta degrees x pi / 180\n',
            'Vx = V x cos(theta)        Vy = V x sin(theta)\n',
            't = [Vy + sqrt(Vy^2 + 2gY0)] / g\n',
            'R = Vx x t'
          ),
          h('form', { onSubmit: function (event) {
            event.preventDefault();
            var result = checkWorksheet(worksheet);
            update({ worksheetResult: result });
            if (result.pass && tableResult && tableResult.pass && tableApproximationResult && tableApproximationResult.correct) markComplete('worksheet', 'program', { worksheetResult: result });
            else if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR('Hand calculations check out. Complete the printed-reference control estimate before continuing.');
          } },
            h('div', { className: 'tc-fields' }, fieldDefs.map(function (def) {
              var result = worksheetResult && worksheetResult.fields[def[0]];
              return h('label', { className: 'tc-field', key: def[0] }, def[1] + ' (' + def[2] + ')',
                h('input', { type: 'number', step: 'any', inputMode: 'decimal', value: worksheet[def[0]] == null ? '' : worksheet[def[0]], onChange: function (event) { setWorksheetField(def[0], event.target.value); }, 'aria-describedby': 'tc-' + def[0] + '-help' }),
                h('small', { id: 'tc-' + def[0] + '-help', className: result ? feedbackClass(result.ok) : '' }, result ? result.message : (mode === 'guided' ? 'Round only after calculating.' : ''))
              );
            })),
            worksheetResult && h('p', { role: 'status', className: feedbackClass(worksheetResult.pass) }, worksheetResult.correct + ' of ' + worksheetResult.total + ' calculations check out.'),
            h('div', { className: 'tc-row' },
              h('button', { type: 'submit', className: 'tc-action' }, 'Check worksheet'),
              mode !== 'guided' && action(d.showReference ? 'Hide formula reference' : 'Open formula reference', function () { update({ showReference: !d.showReference }); }, true)
            )
          )
        );
      }

      function renderProgram() {
        var diagnostics = compileResult && compileResult.diagnostics ? compileResult.diagnostics : [];
        return h('section', { role: 'tabpanel', id: 'tc-panel-program', 'aria-labelledby': 'tc-tab-program' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Station 03 / transcription desk'),
          h('h2', { className: 'tc-heading' }, 'Debug the FORTRAN-style program.'),
          h('p', { className: 'tc-lede' }, mode === 'expert' ? 'Audit the listing against your worksheet and compile when ready.' : 'Three transcription errors were introduced: one constant, one variable name, and one trigonometric function. Find and repair them.'),
          completed.worksheet && h('details', null,
            h('summary', null, 'Open checked calculation ledger'),
            renderLedger(worksheet, 'Human reference used for program audit')
          ),
          h('label', { className: 'tc-field', htmlFor: 'tc-code-editor' }, 'Program listing'),
          h('textarea', { id: 'tc-code-editor', className: 'tc-code', spellCheck: 'false', value: code, onChange: function (event) { update({ code: event.target.value, compileResult: null, formatAuditResult: null, printPreview: null, printPreviewResult: null, printPreviewConfirmed: false }); }, 'aria-describedby': 'tc-code-help' }),
          h('p', { id: 'tc-code-help', className: 'tc-lede' }, 'This safe learning compiler validates the mathematical statements. It does not execute arbitrary code.'),
          diagnostics.length > 0 && h('div', { role: 'region', 'aria-label': 'Compiler diagnostics', 'aria-live': 'polite' }, diagnostics.map(function (diag) { return h('p', { key: diag.code + diag.message, className: 'tc-diag' }, h('strong', null, diag.code + ': '), diag.message); })),
          compileResult && compileResult.pass && h('p', { role: 'status', className: 'tc-check tc-ok' }, 'COMPILE SUCCESSFUL - 0 errors. The listing is ready to keypunch.'),
          compileResult && compileResult.pass && h('div', { className: 'tc-next-cue' }, h('strong', null, 'Next on the desk: '), 'match the FORMAT card, inspect the fixed-width preview, then release the deck.'),
          compileResult && compileResult.pass && h('div', { className: 'tc-format-box' },
            h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Format card / line-printer audit'),
            h('h3', null, 'Make the batch output readable.'),
            h('p', { className: 'tc-lede' }, 'The program can calculate the right numbers and still produce a confusing record. Match the FORMAT card to the required time and range columns before the deck leaves the desk.'),
            h('div', { className: 'tc-role-grid' },
              h('label', { className: 'tc-field' }, 'Time field format',
                h('select', { value: formatAudit.timeFormat || '', onChange: function (event) { setFormatAuditField('timeFormat', event.target.value); } },
                  h('option', { value: '' }, 'Choose a width'),
                  h('option', { value: 'F8.2' }, 'F8.2 / 8 columns, 2 decimals'),
                  h('option', { value: 'F10.1' }, 'F10.1 / 10 columns, 1 decimal')
                )
              ),
              h('label', { className: 'tc-field' }, 'Range field format',
                h('select', { value: formatAudit.rangeFormat || '', onChange: function (event) { setFormatAuditField('rangeFormat', event.target.value); } },
                  h('option', { value: '' }, 'Choose a width'),
                  h('option', { value: 'F10.1' }, 'F10.1 / 10 columns, 1 decimal'),
                  h('option', { value: 'F8.2' }, 'F8.2 / 8 columns, 2 decimals')
                )
              )
            ),
            h('fieldset', { style: { border: 0, padding: 0, margin: '12px 0 0' } },
              h('legend', { className: 'tc-field' }, 'Printed record order'),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-format-order', value: 'time-range', checked: formatAudit.order === 'time-range', onChange: function () { setFormatAuditField('order', 'time-range'); } }), ' TIME then RANGE'),
              h('label', { style: { display: 'block', marginTop: 5 } }, h('input', { type: 'radio', name: 'tc-format-order', value: 'range-time', checked: formatAudit.order === 'range-time', onChange: function () { setFormatAuditField('order', 'range-time'); } }), ' RANGE then TIME')
            ),
            h('div', { className: 'tc-row' }, action('Check format card', function () {
              var audit = checkFormatAudit(formatAudit);
              var preview = audit.pass ? buildPrintPreview(formatAudit) : null;
              update({ formatAuditResult: audit, printPreview: preview, printPreviewResult: null, printPreviewConfirmed: false });
              if (audit.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR('Format card matches. Inspect the fixed-width preview before releasing the deck.');
            }, false, !formatAudit.timeFormat || !formatAudit.rangeFormat || !formatAudit.order)),
            formatAuditResult && h('p', { role: 'status', className: formatAuditResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, formatAuditResult.correct + ' of ' + formatAuditResult.total + ' format checks pass.'),
            formatAuditResult && !formatAuditResult.pass && h('p', { className: 'tc-diag' }, 'Recheck the field widths, decimal precision, and printed record order.')
          ),
          formatAuditResult && formatAuditResult.pass && printPreview && h('div', { className: 'tc-preview-box', 'aria-labelledby': 'tc-preview-title' },
            h('p', { className: 'tc-kicker', style: { color: '#17633f' } }, 'Output trace / fixed columns'),
            h('h3', { id: 'tc-preview-title' }, 'Inspect the line-printer preview.'),
            h('p', { className: 'tc-lede' }, 'Every character occupies a column. Verify that the values land in the same fields promised by the FORMAT card before releasing the deck to the keypunch room.'),
            h('div', { className: 'tc-print-preview', role: 'img', 'aria-label': 'Fixed-width preview with time in columns 7 through 14 and range in columns 22 through 31' },
              h('code', null, printPreview.ruler),
              h('code', null, printPreview.line)
            ),
            h('p', { className: 'tc-lede' }, h('strong', null, 'TIME: '), 'columns ' + printPreview.fields.time.startColumn + '-' + printPreview.fields.time.endColumn + ' / ' + printPreview.fields.time.format + '; ', h('strong', null, 'RANGE: '), 'columns ' + printPreview.fields.range.startColumn + '-' + printPreview.fields.range.endColumn + ' / ' + printPreview.fields.range.format + '.'),
            h('label', { style: { display: 'block', lineHeight: 1.5, marginTop: 10 } },
              h('input', { type: 'checkbox', checked: printPreviewConfirmed, onChange: function (event) { update({ printPreviewConfirmed: event.target.checked, printPreviewResult: null }); } }),
              ' I checked the ruler, field boundaries, and decimal precision.'
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
              update({ compileResult: result });
              if (result.pass && formatAuditResult && formatAuditResult.pass && printPreviewResult && printPreviewResult.pass) markComplete('program', 'cards', { compileResult: result, formatAuditResult: formatAuditResult, printPreview: printPreview, printPreviewResult: printPreviewResult, code: code, deck: STARTER_DECK.slice() });
              else if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR('Listing compiles. Audit the format card and fixed-width preview before continuing.');
              else if (typeof ctx.announceToSR === 'function') ctx.announceToSR(result.diagnostics.length + ' compiler diagnostics found.');
            }),
            action('Restore training listing', function () { update({ code: STARTER_PROGRAM, compileResult: null, formatAuditResult: null, printPreview: null, printPreviewResult: null, printPreviewConfirmed: false }); }, true)
          )
        );
      }

      function renderCards() {
        return h('section', { role: 'tabpanel', id: 'tc-panel-cards', 'aria-labelledby': 'tc-tab-cards' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Station 04 / keypunch room'),
          h('h2', { className: 'tc-heading' }, 'Put the card deck in machine order.'),
          h('p', { className: 'tc-lede' }, 'A dropped deck could turn a correct program into a failed job. Use the printed sequence field from columns 73-80. One pair is out of order.'),
          h('div', { role: 'list', 'aria-label': 'Punch-card deck' }, deck.map(function (id, index) {
            var card = getCard(id);
            return h('div', { className: 'tc-card', role: 'listitem', key: card.id },
              h('span', { 'aria-hidden': 'true' }, String(index + 1).padStart(2, '0')),
              h('span', null, card.text),
              h('span', { className: 'tc-seq' }, card.seq),
              h('span', { className: 'tc-card-actions' },
                h('button', { type: 'button', className: 'tc-small', disabled: index === 0, onClick: function () { update({ deck: moveCard(deck, index, -1), deckResult: null }); }, 'aria-label': 'Move card ' + card.seq + ' up' }, '\u2191'), ' ',
                h('button', { type: 'button', className: 'tc-small', disabled: index === deck.length - 1, onClick: function () { update({ deck: moveCard(deck, index, 1), deckResult: null }); }, 'aria-label': 'Move card ' + card.seq + ' down' }, '\u2193')
              )
            );
          })),
          deckResult && h('p', { role: 'status', className: deckResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, deckResult.message),
          h('div', { className: 'tc-row' },
            action('Run sequence check', function () {
              var result = validateDeck(deck);
              update({ deckResult: result });
              if (result.pass) markComplete('cards', 'batch', { deckResult: result, deck: deck });
            }),
            action('Return deck to training setup', function () { update({ deck: STARTER_DECK.slice(), deckResult: null }); }, true)
          )
        );
      }

      function renderChart() {
        return h('figure', null,
          h('svg', { className: 'tc-chart', viewBox: '0 0 680 245', role: 'img', 'aria-labelledby': 'tc-chart-title tc-chart-desc' },
            h('title', { id: 'tc-chart-title' }, 'Aurora Test 3 predicted trajectory'),
            h('desc', { id: 'tc-chart-desc' }, 'A parabolic flight path begins 30 meters above ground, reaches about ' + round(EXPECTED.peakHeight, 0) + ' meters, and lands about ' + round(EXPECTED.range, 0) + ' meters downrange inside the target zone.'),
            h('line', { x1: 34, y1: 212, x2: 658, y2: 212, stroke: '#9ad7c0', strokeWidth: 2 }),
            h('rect', { x: 34 + MISSION.zoneMin / 4900 * 624, y: 201, width: (MISSION.zoneMax - MISSION.zoneMin) / 4900 * 624, height: 11, fill: '#a64220' }),
            h('polyline', { points: trajectoryPath(), fill: 'none', stroke: '#fff0b5', strokeWidth: 4, strokeLinecap: 'round' }),
            h('circle', { cx: 34 + EXPECTED.range / 4900 * 624, cy: 212, r: 7, fill: '#ffbf47' }),
            h('text', { x: 38, y: 232, fill: '#d8eee5', fontSize: 12 }, '0 m'),
            h('text', { x: 563, y: 232, fill: '#d8eee5', fontSize: 12 }, 'target zone')
          ),
          h('figcaption', { className: 'tc-lede' }, 'Text alternative: peak height ' + round(EXPECTED.peakHeight, 1) + ' m; flight time ' + round(EXPECTED.flightTime, 2) + ' s; landing distance ' + round(EXPECTED.range, 1) + ' m; predicted landing is inside the 4,550-4,700 m target zone.')
        );
      }

      function renderBatch() {
        var complete = runStatus === 'complete';
        return h('section', { role: 'tabpanel', id: 'tc-panel-batch', 'aria-labelledby': 'tc-tab-batch' },
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Station 05 / electronic computation room'),
          h('h2', { className: 'tc-heading' }, 'Submit the deck as a batch job.'),
          h('p', { className: 'tc-lede' }, 'Early programmers did not receive instant feedback. A prepared deck was read into the machine and the result returned as a printed listing.'),
          h('div', { className: 'tc-machine', role: 'region', 'aria-label': 'Batch computer console' },
            h('div', { className: 'tc-lights', 'aria-hidden': 'true' },
              h('span', { className: 'tc-light on' }), h('span', { className: 'tc-light' + (complete ? ' on' : '') }), h('span', { className: 'tc-light' + (complete ? ' on' : '') })
            ),
            h('p', { style: { fontFamily: 'ui-monospace, monospace', margin: 0 } }, complete ? 'JOB 62-AUR-03 COMPLETE / PRINTER READY' : 'READER READY / 9 CARDS / JOB WAITING'),
            h('div', { className: 'tc-row' }, action(complete ? 'Run again' : 'Feed deck and run job', function () {
              var programCheck = compileProgram(code);
              var cardCheck = validateDeck(deck);
              if (!programCheck.pass || !cardCheck.pass) {
                update({ runStatus: 'error' });
                if (typeof ctx.addToast === 'function') ctx.addToast('The listing or card order changed. Recheck the earlier stations.', 'error');
                return;
              }
              var nextCompleted = Object.assign({}, completed);
              delete nextCompleted.batch;
              update({ completed: nextCompleted, stage: 'batch', runStatus: 'complete', printout: formatPrintout(EXPECTED), batchReadback: {}, batchReadbackResult: null });
              if (typeof ctx.announceToSR === 'function') ctx.announceToSR('Batch job complete. Review the line-printer output and trajectory before verification.');
            }))
          ),
          runStatus === 'error' && h('p', { role: 'alert', className: 'tc-diag' }, 'JOB REJECTED. Return to the program and deck stations to restore a valid job.'),
          complete && h('div', null,
            h('h3', null, 'Line-printer output'),
            h('pre', { className: 'tc-printout' }, d.printout || formatPrintout(EXPECTED)),
            renderChart(),
            h('section', { className: 'tc-readback-box', 'aria-labelledby': 'tc-readback-title' },
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Output interpretation / human read-back'),
              h('h3', { id: 'tc-readback-title' }, 'Read the machine result before signing it.'),
              h('p', { className: 'tc-lede' }, 'A printed job can be accurate and still be misread. Match each status claim to the line-printer output, then release the record to independent verification.'),
              h('div', { className: 'tc-role-grid' },
                h('label', { className: 'tc-field' }, 'Compiler status',
                  h('select', { value: batchReadback.compile || '', onChange: function (event) { setBatchReadbackField('compile', event.target.value); } },
                    h('option', { value: '' }, 'Choose status'),
                    h('option', { value: 'zero-errors' }, '0 errors'),
                    h('option', { value: 'errors' }, 'Errors reported')
                  )
                ),
                h('label', { className: 'tc-field' }, 'Deck status',
                  h('select', { value: batchReadback.deck || '', onChange: function (event) { setBatchReadbackField('deck', event.target.value); } },
                    h('option', { value: '' }, 'Choose status'),
                    h('option', { value: 'ordered' }, '00010001-00010009 / in order'),
                    h('option', { value: 'misordered' }, 'Sequence error')
                  )
                ),
                h('label', { className: 'tc-field' }, 'Target-zone result',
                  h('select', { value: batchReadback.zone || '', onChange: function (event) { setBatchReadbackField('zone', event.target.value); } },
                    h('option', { value: '' }, 'Choose result'),
                    h('option', { value: 'inside' }, 'Inside 4550-4700 m'),
                    h('option', { value: 'outside' }, 'Outside 4550-4700 m')
                  )
                ),
                h('label', { className: 'tc-field' }, 'Printed range (m)',
                  h('input', { type: 'number', step: '0.1', inputMode: 'decimal', value: batchReadback.range == null ? '' : batchReadback.range, onChange: function (event) { setBatchReadbackField('range', event.target.value); } })
                )
              ),
              batchReadbackResult && h('p', { role: 'status', className: batchReadbackResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, batchReadbackResult.correct + ' of ' + batchReadbackResult.total + ' machine read-back fields match the printout.'),
              h('div', { className: 'tc-row' },
                action('Check machine read-back', function () {
                  var result = checkBatchReadback(batchReadback);
                  update({ batchReadbackResult: result });
                  if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR('Machine read-back matches. Release it to independent verification.');
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
          h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Station 06 / independent check'),
          h('h2', { className: 'tc-heading' }, 'Never let the machine check itself.'),
          h('p', { className: 'tc-lede' }, 'Use your original worksheet\u2014not the printout\u2014to record the independent range. Then decide whether the prediction falls inside the assigned landing zone.'),
          h('form', { onSubmit: function (event) {
            event.preventDefault();
            if (!reproducibilityResult || !reproducibilityResult.pass) {
              var note = checkReproducibilityNote(reproducibility);
              update({ reproducibilityResult: note });
              if (typeof ctx.announceToSR === 'function') ctx.announceToSR(note.message);
              return;
            }
            var result = verifyIndependentCheck(verification.range, verification.verdict, Object.assign({ workPattern: workPattern }, verification));
            update({ verificationResult: result });
            if (result.pass && !d.awarded) {
              update({ verificationResult: result, awarded: true, completed: Object.assign({}, completed, { verify: true }), auditTrail: auditTrail.concat([{ station: 'verify', nextStage: 'complete', recordedAt: Date.now() }]) });
              if (typeof ctx.awardXP === 'function') ctx.awardXP(TOOL_ID, 30, 'Trajectory Computing Lab verified');
              if (typeof ctx.celebrate === 'function') ctx.celebrate();
              if (typeof ctx.addToast === 'function') ctx.addToast('Independent verification complete.', 'success');
            }
          } },
            h('div', { className: 'tc-fields' },
              h('label', { className: 'tc-field' }, 'Independent range from worksheet (meters)', h('input', { type: 'number', step: 'any', value: verification.range == null ? '' : verification.range, onChange: function (event) { setVerificationField('range', event.target.value); } })),
              h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
                h('legend', { className: 'tc-field' }, 'Mission recommendation'),
                h('label', null, h('input', { type: 'radio', name: 'tc-verdict', value: 'go', checked: verification.verdict === 'go', onChange: function () { setVerificationField('verdict', 'go'); } }), ' GO - prediction is inside the zone'), h('br'),
                h('label', null, h('input', { type: 'radio', name: 'tc-verdict', value: 'hold', checked: verification.verdict === 'hold', onChange: function () { setVerificationField('verdict', 'hold'); } }), ' HOLD - prediction is outside the zone')
              )
            ),
            h('fieldset', { className: 'tc-role-box' },
              h('legend', { style: { fontWeight: 900 } }, workPattern === 'pair' ? 'Two-desk verification record' : 'Solo second-pass record'),
              workPattern === 'pair' ? h('div', { className: 'tc-role-grid' },
                h('label', { className: 'tc-field' }, 'Calculation desk code',
                  h('select', { value: verification.calculatorDesk || '', onChange: function (event) { setVerificationField('calculatorDesk', event.target.value); } },
                    h('option', { value: '' }, 'Choose a desk'),
                    deskCodes.map(function (desk) { return h('option', { value: desk[0], key: 'calc-' + desk[0] }, desk[1]); })
                  )
                ),
                h('label', { className: 'tc-field' }, 'Independent verifier desk code',
                  h('select', { value: verification.verifierDesk || '', onChange: function (event) { setVerificationField('verifierDesk', event.target.value); } },
                    h('option', { value: '' }, 'Choose a different desk'),
                    deskCodes.map(function (desk) { return h('option', { value: desk[0], key: 'verify-' + desk[0] }, desk[1]); })
                  )
                )
              ) : h('label', { style: { display: 'block', lineHeight: 1.5 } },
                h('input', { type: 'checkbox', checked: verification.secondPass === true, onChange: function (event) { setVerificationField('secondPass', event.target.checked); } }),
                ' I set the first result aside, recomputed from the mission constants, and compared the two passes.'
              ),
              h('p', { className: 'tc-lede', style: { marginBottom: 0 } }, workPattern === 'pair'
                ? 'The verifier must use a different desk code from the original calculation.'
                : 'A second pass is independent only when it begins again from the source constants.')
            ),
            h('fieldset', { className: 'tc-repro-box' },
              h('legend', { style: { fontWeight: 900 } }, 'Reproducibility note'),
              h('p', { className: 'tc-lede', style: { marginTop: 0 } }, 'Record the inputs held constant so another person can repeat this exact machine run.'),
              h('div', { className: 'tc-role-grid' },
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.speed === true, onChange: function (event) { setReproducibilityField('speed', event.target.checked); } }), ' Speed = 215 m/s'),
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.angle === true, onChange: function (event) { setReproducibilityField('angle', event.target.checked); } }), ' Angle = 38 degrees'),
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.height === true, onChange: function (event) { setReproducibilityField('height', event.target.checked); } }), ' Release height = 30 m'),
                h('label', null, h('input', { type: 'checkbox', checked: reproducibility.gravity === true, onChange: function (event) { setReproducibilityField('gravity', event.target.checked); } }), ' Gravity = 9.81 m/s2')
              ),
              reproducibilityResult && h('p', { role: 'status', className: reproducibilityResult.pass ? 'tc-check tc-ok' : 'tc-diag tc-bad' }, reproducibilityResult.correct + ' of ' + reproducibilityResult.total + ' fixed mission inputs recorded. ' + reproducibilityResult.message),
              h('div', { className: 'tc-row' }, action('Check fixed inputs', function () {
                var result = checkReproducibilityNote(reproducibility);
                update({ reproducibilityResult: result });
                if (result.pass && typeof ctx.announceToSR === 'function') ctx.announceToSR(result.message);
              }))
            ),
            h('details', null,
              h('summary', null, 'Review the hand-calculation audit ledger'),
              renderLedger(worksheet, 'Independent reference ledger')
            ),
            verificationResult && !passed && h('div', { role: 'alert', className: 'tc-diag' },
              !verificationResult.pass && !verificationResult.rangePass && h('p', null, 'The independent range does not agree within 15 meters. Revisit your worksheet.'),
              !verificationResult.pass && !verificationResult.verdictPass && h('p', null, 'Compare the predicted range with both boundaries of the target zone.'),
              !verificationResult.pass && !verificationResult.assignmentPass && h('p', null, verificationResult.assignment.message),
              verificationResult.pass && (!reproducibilityResult || !reproducibilityResult.pass) && h('p', null, 'Complete the reproducibility note before signing the verification sheet.')
            ),
            h('div', { className: 'tc-row' }, h('button', { type: 'submit', className: 'tc-action', disabled: !reproducibilityResult || !reproducibilityResult.pass }, 'Sign verification sheet'))
          ),
          passed && h('div', null,
            h('div', { className: 'tc-certificate', role: 'status' },
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Computation specialist certification'),
              h('h3', { className: 'tc-heading' }, 'Aurora Test 3 is verified.'),
              h('p', null, 'You created a hand reference, repaired the program, protected card sequence, interpreted machine output, recorded fixed inputs, and made an independent GO/HOLD decision.'),
              h('p', null, h('strong', null, 'Audit workflow: '), workPattern === 'pair' ? 'paired independent cross-check with separated desk codes.' : 'solo dual-pass recomputation.'),
              h('p', null, h('strong', null, 'Reflection: '), 'Which error was easier for a person to catch than a machine\u2014and which safeguard mattered most?'),
              h('div', { className: 'tc-row', style: { justifyContent: 'center' } },
                action('Save evidence snapshot', saveEvidenceSnapshot),
                action(d.reportOpen ? 'Hide completion report' : 'Review completion report', function () { update({ reportOpen: !d.reportOpen }); }, true),
                action('Run mission again', restartMission, true)
              ),
              d.lastSnapshotAt && h('p', { className: 'tc-ok' }, 'Evidence saved to this lesson.')
            ),
            h('section', { className: 'tc-extension', 'aria-labelledby': 'tc-angle-study-title' },
              h('p', { className: 'tc-kicker', style: { color: '#9b3e21' } }, 'Extension / parameter study'),
              h('h3', { id: 'tc-angle-study-title' }, 'Change one variable. Predict before computing.'),
              h('p', { className: 'tc-lede' }, 'Keep speed and release height fixed. Change only the launch angle, then predict how the landing distance compares with the verified 38-degree baseline.'),
              h('div', { className: 'tc-study-grid' },
                h('label', { className: 'tc-field' }, 'Comparison angle',
                  h('select', { value: String(studyAngle), onChange: function (event) { update({ studyAngle: Number(event.target.value), studyResult: null }); } },
                    [30, 38, 46, 52].map(function (angle) { return h('option', { value: String(angle), key: angle }, angle + ' degrees'); })
                  )
                ),
                h('fieldset', { style: { border: 0, padding: 0, margin: 0 } },
                  h('legend', { className: 'tc-field' }, 'My prediction for downrange distance'),
                  ['shorter', 'about', 'longer'].map(function (relation) {
                    var label = relation === 'about' ? 'About the same' : relation.charAt(0).toUpperCase() + relation.slice(1);
                    return h('label', { key: relation, style: { display: 'block', marginTop: 5 } },
                      h('input', { type: 'radio', name: 'tc-study-prediction', value: relation, checked: studyPrediction === relation, onChange: function () { update({ studyPrediction: relation, studyResult: null }); } }), ' ' + label
                    );
                  })
                )
              ),
              h('div', { className: 'tc-row' }, action('Compute comparison', function () {
                var comparison = classifyAngleStudy(studyAngle);
                comparison.prediction = studyPrediction;
                comparison.correct = studyPrediction === comparison.relation;
                update({ studyResult: comparison });
                if (typeof ctx.announceToSR === 'function') ctx.announceToSR('Angle study computed. The new range is ' + round(comparison.result.range, 1) + ' meters.');
              }, false, !studyPrediction)),
              studyResult && h('div', { className: studyResult.correct ? 'tc-check' : 'tc-diag', role: 'status' },
                h('p', null, h('strong', null, studyResult.correct ? 'Prediction supported. ' : 'Revise your prediction. '), 'At ' + studyResult.angle + ' degrees, the capsule travels ' + studyResult.relation + ' than the 38-degree baseline.'),
                h('div', { className: 'tc-result-grid' },
                  h('div', null, h('b', null, round(studyResult.result.range, 1) + ' m'), 'new range'),
                  h('div', null, h('b', null, (studyResult.difference >= 0 ? '+' : '') + round(studyResult.difference, 1) + ' m'), 'change from baseline'),
                  h('div', null, h('b', null, studyResult.inZone ? 'INSIDE' : 'OUTSIDE'), 'assigned landing zone')
                )
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

      return h('div', { 'data-trajectory-lab': 'true', 'data-stem-tool-shell': 'true' },
        h('div', { className: 'tc-shell' },
          h('a', { className: 'tc-skip-link', href: '#tc-main-content' }, 'Skip to station content'),
          h('header', { className: 'tc-top' },
            h('div', null,
              h('p', { className: 'tc-kicker' }, 'Original historical STEM simulation'),
              h('h1', { className: 'tc-title' }, 'Trajectory Computing Lab'),
              h('p', { className: 'tc-subtitle' }, 'From pencil, table, and trigonometry to FORTRAN-style code, punch cards, batch output, and human verification.'),
              h('div', { className: 'tc-progress', role: 'group', 'aria-label': 'Audit progress' },
            h('div', { className: 'tc-progress-head' },
                  h('span', { id: 'tc-progress-label' }, 'Audit progress'),
                  h('strong', null, completedCount + ' of ' + stages.length + ' stations')
                ),
                h('div', { className: 'tc-progress-track', role: 'progressbar', 'aria-labelledby': 'tc-progress-label', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': progressPercent, 'aria-valuetext': completedCount + ' of ' + stages.length + ' stations complete' },
                  h('span', { className: 'tc-progress-fill', style: { width: progressPercent + '%' } })
                )
              )
            ),
            h('button', { type: 'button', className: 'tc-back', onClick: function () { if (typeof ctx.setStemLabTool === 'function') ctx.setStemLabTool(null); }, 'aria-label': 'Back to all STEAM Lab tools' }, '\u2190 All tools')
          ),
          h('div', { className: 'tc-tabs-region', role: 'region', 'aria-label': 'Simulation stations' },
            h('p', { id: 'tc-tabs-help', className: 'tc-visually-hidden' }, 'Station tabs: use Arrow Right or Arrow Left, or Arrow Down or Arrow Up, to move between unlocked stations. Press Home for the briefing or End for the last unlocked station.'),
            h('nav', { className: 'tc-tabs', role: 'tablist', 'aria-label': 'Simulation stations', 'aria-describedby': 'tc-tabs-help' }, stages.map(function (item, index) {
            var locked = index > unlockedIndex;
            return h('button', { id: 'tc-tab-' + item[0], key: item[0], type: 'button', role: 'tab', className: 'tc-tab', 'aria-selected': stage === item[0], 'aria-controls': stage === item[0] ? 'tc-panel-' + item[0] : undefined, tabIndex: stage === item[0] ? 0 : -1, disabled: locked, onClick: function () { update({ stage: item[0] }); }, onKeyDown: function (event) { handleTabKey(event, index); } },
              h('span', { className: 'tc-tab-num' }, (locked ? 'LOCKED / ' : (completed[item[0]] ? 'CHECKED / ' : '')) + '0' + (index + 1)), item[1]
            );
            }))
          ),
          h('div', { className: 'tc-grid' },
            h('main', { id: 'tc-main-content', className: 'tc-paper', tabIndex: -1 }, renderStage()),
            h('aside', { className: 'tc-side', 'aria-label': 'Desk references and historical context' },
              h('h3', null, 'Desk card'),
              h('dl', null,
                h('dt', null, 'Mission'), h('dd', null, 'AURORA-3'),
                h('dt', null, 'Speed'), h('dd', null, '215.0 m/s'),
                h('dt', null, 'Angle'), h('dd', null, '38.0 deg'),
                h('dt', null, 'Height'), h('dd', null, '30.0 m'),
                h('dt', null, 'Gravity'), h('dd', null, '9.81 m/s2'),
                h('dt', null, 'Zone'), h('dd', null, '4550-4700 m')
              ),
              h('label', { className: 'tc-field', style: { marginTop: 15 } }, 'Support level',
                h('select', { value: mode, onChange: function (event) { update({ mode: event.target.value }); } },
                  h('option', { value: 'guided' }, 'Guided - formulas visible'),
                  h('option', { value: 'standard' }, 'Standard - references on request'),
                  h('option', { value: 'expert' }, 'Expert - audit independently')
                )
              ),
              h('details', null,
                h('summary', null, 'Historical grounding'),
                h('div', { className: 'tc-sources' },
                  h('p', null, 'At NACA and NASA, teams of women performed and checked aerospace calculations. Katherine Johnson calculated trajectories and verified electronic-computer results. Dorothy Vaughan led the West Area Computing unit and became an expert FORTRAN programmer.'),
                  h('ul', { className: 'tc-teacher-list' },
                    h('li', null, 'Human computers organized data, used shared tables, applied mathematical procedures, checked one another\'s work, and documented results.'),
                    h('li', null, 'As electronic computers arrived, mathematical knowledge remained essential for programming, debugging, and verification.'),
                    h('li', null, 'The simulation emphasizes the work process; it does not turn discrimination or segregation into a game mechanic.')
                  ),
                  h('p', null, 'This simulation uses those documented kinds of work as educational context; it does not recreate a copyrighted story or portray a real person as a fictional character.'),
                  h('p', null, h('a', { href: 'https://www.nasa.gov/centers-and-facilities/langley/katherine-johnson-biography/', target: '_blank', rel: 'noreferrer' }, 'NASA: Katherine Johnson biography')),
                  h('p', null, h('a', { href: 'https://www.nasa.gov/people/dorothy-vaughan/', target: '_blank', rel: 'noreferrer' }, 'NASA: Dorothy Vaughan biography'))
                )
              ),
              h('details', null,
                h('summary', null, 'Vocabulary desk'),
                h('dl', { className: 'tc-glossary' },
                  h('dt', null, 'Algorithm'), h('dd', null, 'A repeatable sequence of steps for solving a problem.'),
                  h('dt', null, 'Human computer'), h('dd', null, 'A person employed to perform and verify mathematical calculations.'),
                  h('dt', null, 'FORTRAN'), h('dd', null, 'An early language designed for scientific and engineering computation.'),
                  h('dt', null, 'Compiler'), h('dd', null, 'A program that translates source instructions and reports structural errors.'),
                  h('dt', null, 'Punch card'), h('dd', null, 'A physical card that encoded one line of data or program instructions.'),
                  h('dt', null, 'Batch job'), h('dd', null, 'A prepared program submitted for processing without an interactive screen.'),
                  h('dt', null, 'Verification'), h('dd', null, 'An independent check that a result agrees with requirements and evidence.')
                )
              ),
              h('details', null,
                h('summary', null, 'Teacher guide'),
                h('div', { className: 'tc-sources' },
                  h('p', null, h('strong', null, 'Suggested time: '), '40-60 minutes individually or in pairs.'),
                  h('p', null, h('strong', null, 'Learning objectives')),
                  h('ul', { className: 'tc-teacher-list' },
                    h('li', null, 'Read a printed reference table, decompose velocity, and apply a multi-step mathematical model.'),
                    h('li', null, 'Explain how variable names, constants, functions, and statement order affect a program.'),
                    h('li', null, 'Distinguish compilation, execution, output interpretation, and independent verification.'),
                    h('li', null, 'Connect computing history to the documented labor and expertise of women mathematicians and programmers.')
                  ),
                  h('p', null, h('strong', null, 'Evidence to collect: '), 'printed trigonometry lookup, table-precision prediction, calculation ledger, repaired listing, line-printer format card, fixed-width preview confirmation, ordered deck, machine read-back, reproducibility note, audit-role record, GO/HOLD reasoning, angle-study prediction, and the completion report.'),
                  h('p', null, h('strong', null, 'Debrief prompts: '), 'Why did card order matter? Which errors could a compiler detect? Why should a person verify a machine result?')
                )
              ),
              h('details', null,
                h('summary', null, 'Model limits'),
                h('p', { className: 'tc-sources' }, 'The flight model is a classroom-scale two-dimensional ballistic approximation. It ignores air resistance, winds, Earth curvature, propulsion after release, and orbital mechanics. It is realistic as a verification workflow, not as a complete launch model.')
              ),
              h('p', { className: 'tc-sources', style: { marginTop: 16 } }, 'Fictional mission. Original interface and instructional text. No NASA insignia, film assets, dialogue, music, or character portrayals are used.')
            )
          )
        )
      );
    }
  });

  if (typeof console !== 'undefined') console.log('[StemLab] stem_tool_trajectorycomputing.js loaded - Trajectory Computing Lab');
})();
