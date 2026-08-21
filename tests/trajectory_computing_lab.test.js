import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_trajectorycomputing.js';
const PUBLIC_FILE = 'desktop/web-app/public/stem_lab/stem_tool_trajectorycomputing.js';
const ID = 'trajectoryComputing';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
  delete window.TrajectoryComputingCore;
});

describe('Trajectory Computing Lab', () => {
  it('registers an original coding-history simulation with deterministic physics', () => {
    const tool = loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;

    expect(tool.label).toBe('Trajectory Computing Lab');
    expect(tool.category).toBe('coding');
    expect(tool.aliases).toContain('human computers');
    expect(tool.questHooks).toHaveLength(11);
    expect(core.expected.vx).toBeCloseTo(169.42, 1);
    expect(core.expected.vy).toBeCloseTo(132.37, 1);
    expect(core.expected.flightTime).toBeCloseTo(27.2, 1);
    expect(core.expected.range).toBeGreaterThanOrEqual(core.mission.zoneMin);
    expect(core.expected.range).toBeLessThanOrEqual(core.mission.zoneMax);
    expect(core.expected.inZone).toBe(true);
  });

  it('checks the independent hand calculation with instructional tolerances', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const expected = core.expected;
    const pass = core.checkWorksheet({
      vx: expected.vx.toFixed(2),
      vy: expected.vy.toFixed(2),
      flightTime: expected.flightTime.toFixed(2),
      range: expected.range.toFixed(1),
    });
    expect(pass.pass).toBe(true);
    expect(pass.correct).toBe(4);

    const fail = core.checkWorksheet({ vx: '', vy: 0, flightTime: 27, range: 3000 });
    expect(fail.pass).toBe(false);
    expect(fail.fields.vx.message).toBe('Enter a number.');

    const ledger = core.buildCalculationLedger({
      vx: expected.vx.toFixed(2),
      vy: expected.vy.toFixed(2),
      flightTime: expected.flightTime.toFixed(2),
      range: expected.range.toFixed(1),
    });
    expect(ledger).toEqual(expect.objectContaining({ pass: true, checked: 4, total: 4 }));
    expect(ledger.rows.map((row) => row.status)).toEqual(['checked', 'checked', 'checked', 'checked']);

    const table = core.checkReferenceTable({ sin: '0.6157', cos: '0.7880' });
    expect(table.pass).toBe(true);
    expect(core.checkReferenceTable({ sin: '0.7880', cos: '0.6157' }).pass).toBe(false);
    const control = core.computeTableApproximation({ sin: '0.6157', cos: '0.7880' });
    expect(control.pass).toBe(true);
    expect(control.withinTolerance).toBe(true);
    expect(core.checkTableApproximation({ sin: '0.6157', cos: '0.7880' }, 'within').correct).toBe(true);
    expect(core.checkTableApproximation({ sin: '0.6157', cos: '0.7880' }, 'outside').correct).toBe(false);

    const format = core.checkFormatAudit({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' });
    expect(format.pass).toBe(true);
    expect(format.correct).toBe(3);
    expect(core.checkFormatAudit({ timeFormat: 'F10.1', rangeFormat: 'F8.2', order: 'range-time' }).pass).toBe(false);

    const preview = core.buildPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' });
    expect(preview.pass).toBe(true);
    expect(preview.line.length).toBe(31);
    expect(preview.fields.time).toEqual(expect.objectContaining({ startColumn: 7, endColumn: 14 }));
    expect(preview.fields.range).toEqual(expect.objectContaining({ startColumn: 22, endColumn: 31 }));
    expect(core.checkPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }, preview.line).pass).toBe(true);
    expect(core.checkPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }, preview.line.replace('RANGE=', 'RANG?=')).pass).toBe(false);

    const readback = core.checkBatchReadback({ compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: core.expected.range.toFixed(1) });
    expect(readback.pass).toBe(true);
    expect(readback.correct).toBe(4);
    expect(readback.fields.range.expected).toBeCloseTo(core.expected.range, 1);
    expect(core.checkBatchReadback({ compile: 'errors', deck: 'ordered', zone: 'outside' }).pass).toBe(false);
    expect(core.checkBatchReadback({ compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4609.0' }).fields.range.ok).toBe(false);
  });

  it('uses a validator instead of executing student program text', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const broken = core.compileProgram(core.starterProgram);
    expect(broken.pass).toBe(false);
    expect(broken.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining(['D203', 'N301', 'M403']));

    const correct = core.compileProgram(core.correctProgram);
    expect(correct).toEqual(expect.objectContaining({ pass: true, diagnostics: [] }));
    const source = fs.readFileSync(FILE, 'utf8');
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toContain('new Function');
  });

  it('models dropped-card recovery and a batch printout', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    expect(core.validateDeck(core.starterDeck).pass).toBe(false);

    const fixed = core.moveCard(core.starterDeck, 6, -1);
    expect(core.validateDeck(fixed).pass).toBe(true);
    expect(core.formatPrintout()).toContain('JOB 62-AUR-03');
    expect(core.formatPrintout()).toContain('*** END OF JOB ***');
  });

  it('requires agreement and a correct GO/HOLD decision for verification', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    expect(core.verifyIndependentCheck(core.expected.range.toFixed(1), 'go').pass).toBe(true);
    expect(core.verifyIndependentCheck(3000, 'go').rangePass).toBe(false);
    expect(core.verifyIndependentCheck(core.expected.range, 'hold').verdictPass).toBe(false);

    const pair = { workPattern: 'pair', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' };
    expect(core.checkVerificationAssignment('pair', pair).pass).toBe(true);
    expect(core.checkVerificationAssignment('pair', { calculatorDesk: 'desk-a', verifierDesk: 'desk-a' }).pass).toBe(false);
    expect(core.checkVerificationAssignment('solo', { secondPass: true }).pass).toBe(true);
    expect(core.verifyIndependentCheck(core.expected.range, 'go', pair).assignmentPass).toBe(true);
    expect(core.verifyIndependentCheck(core.expected.range, 'go', { workPattern: 'solo' }).pass).toBe(false);

    const reproducibility = core.checkReproducibilityNote({ speed: true, angle: true, height: true, gravity: true });
    expect(reproducibility.pass).toBe(true);
    expect(reproducibility.correct).toBe(4);
    expect(core.checkReproducibilityNote({ speed: true, angle: true, height: false, gravity: true }).pass).toBe(false);
  });

  it('supports a predict-before-compute angle study', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const lower = core.classifyAngleStudy(30);
    const baseline = core.classifyAngleStudy(38);
    const higher = core.classifyAngleStudy(46);

    expect(lower.relation).toBe('shorter');
    expect(baseline.relation).toBe('about');
    expect(higher.relation).toBe('longer');
    expect(core.classifyAngleStudy(100).angle).toBe(55);
  });

  it('creates a privacy-minimal lesson evidence record and quest progress', () => {
    const tool = loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const state = {
      completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
      worksheet: { vx: '169.42', vy: '132.37', flightTime: '27.20', range: '4607.7' },
      tableLookup: { sin: '0.6157', cos: '0.7880' },
      tableResult: { pass: true },
      tableApproximationResult: core.checkTableApproximation({ sin: '0.6157', cos: '0.7880' }, 'within'),
      compileResult: { pass: true },
      formatAudit: { timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' },
      formatAuditResult: core.checkFormatAudit({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }),
      printPreview: core.buildPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }),
      printPreviewResult: core.checkPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }, core.buildPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }).line),
      batchReadback: { compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' },
      batchReadbackResult: core.checkBatchReadback({ compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' }),
      reproducibility: { speed: true, angle: true, height: true, gravity: true },
      reproducibilityResult: core.checkReproducibilityNote({ speed: true, angle: true, height: true, gravity: true }),
      auditTrail: [
        { station: 'briefing', nextStage: 'worksheet', recordedAt: 1 },
        { station: 'worksheet', nextStage: 'program', recordedAt: 2 },
        { station: 'program', nextStage: 'cards', recordedAt: 3 },
        { station: 'cards', nextStage: 'batch', recordedAt: 4 },
        { station: 'batch', nextStage: 'verify', recordedAt: 5 },
        { station: 'verify', nextStage: 'complete', recordedAt: 6 },
      ],
      deckResult: { pass: true },
      runStatus: 'complete',
      workPattern: 'pair',
      verification: { range: '4607.7', verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
      verificationResult: { pass: true, assignmentPass: true },
      studyResult: core.classifyAngleStudy(46),
    };
    const evidence = core.createEvidenceRecord(state, 12345);

    expect(evidence.id).toBe('trajectory-12345');
    expect(evidence.tool).toBe(ID);
    expect(evidence.data.completedStations).toHaveLength(6);
    expect(evidence.data.verificationPassed).toBe(true);
    expect(evidence.data.calculationLedger.pass).toBe(true);
    expect(evidence.data.referenceTablePassed).toBe(true);
    expect(evidence.data.formatAuditPassed).toBe(true);
    expect(evidence.data.formatAudit).toEqual({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' });
    expect(evidence.data.printPreviewPassed).toBe(true);
    expect(evidence.data.printPreview.line).toHaveLength(31);
    expect(evidence.data.batchReadbackPassed).toBe(true);
    expect(evidence.data.batchReadback).toEqual({ compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' });
    expect(evidence.data.reproducibilityPassed).toBe(true);
    expect(evidence.data.reproducibility).toEqual({ speed: true, angle: true, height: true, gravity: true });
    expect(evidence.data.auditTrail).toHaveLength(6);
    expect(evidence.data.workflow).toEqual({ pattern: 'pair', assignmentPassed: true });
    expect(evidence.data).not.toHaveProperty('studentName');
    expect(tool.questHooks.every((quest) => quest.check({ _trajectoryComputing: state }))).toBe(true);

    const report = core.createCompletionReport(state);
    expect(report.status).toBe('VERIFIED');
    expect(report.workflow).toBe('Paired independent cross-check');
    expect(report.auditTrail).toHaveLength(6);
    expect(report.checks.every((check) => check.pass)).toBe(true);
    expect(report.safeguards).toEqual(expect.objectContaining({ passed: 5, total: 5 }));
    expect(report.safeguards.checks.every((check) => check.pass)).toBe(true);
    const partialReport = core.createCompletionReport({
      workPattern: 'pair',
      auditTrail: [{ station: 'briefing', nextStage: 'worksheet' }],
      reproducibilityResult: { correct: 2, total: 4, pass: false },
      printPreviewResult: { pass: false },
      batchReadbackResult: { correct: 1, total: 4, pass: false },
    });
    expect(partialReport.safeguards.passed).toBe(0);
    expect(partialReport.safeguards.checks.find((check) => check.id === 'audit-chain').detail).toBe('1 of 6 expected handoffs recorded.');
    expect(report).not.toHaveProperty('studentName');
  });

  it('renders every station with accessible controls and text alternatives', () => {
    loadTool(FILE, ID);
    const states = {
      briefing: 'The answer must be trusted',
      worksheet: 'Build a result',
      program: 'Debug the FORTRAN-style program',
      cards: 'Put the card deck',
      batch: 'Submit the deck',
      verify: 'Never let the machine check itself',
    };
    for (const [stage, anchor] of Object.entries(states)) {
      const html = renderTool(ID, { _trajectoryComputing: { stage } });
      expect(html).toContain(anchor);
      expect(html).toContain('role="tablist"');
      expect(html).toContain('Audit progress');
      expect(html).toContain('role="progressbar"');
      expect(html).toContain('class="tc-skip-link"');
      expect(html).toContain('href="#tc-main-content"');
      expect(html).toContain('id="tc-main-content"');
      expect(html).toContain('id="tc-tabs-help"');
      expect(html).toContain('aria-describedby="tc-tabs-help"');
      expect(html).toContain('Press Home for the briefing or End for the last unlocked station.');
      expect(html).toContain('Back to all STEAM Lab tools');
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }
    const worksheetHtml = renderTool(ID, { _trajectoryComputing: { stage: 'worksheet' } });
    expect(worksheetHtml).toContain('Read the trigonometry table before calculating.');
    expect(worksheetHtml).toContain('Check table lookup');
    const programReadyHtml = renderTool(ID, {
      _trajectoryComputing: {
        stage: 'program',
        compileResult: { pass: true, diagnostics: [] },
        formatAudit: { timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' },
        formatAuditResult: window.TrajectoryComputingCore.checkFormatAudit({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }),
        printPreview: window.TrajectoryComputingCore.buildPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }),
      },
    });
    expect(programReadyHtml).toContain('Format card / line-printer audit');
    expect(programReadyHtml).toContain('Check format card');
    expect(programReadyHtml).toContain('Inspect the line-printer preview.');
    expect(programReadyHtml).toContain('Confirm preview and release deck');
    expect(programReadyHtml).toContain('Next on the desk:');
    expect(programReadyHtml).toContain('match the FORMAT card');

    const completed = renderTool(ID, {
      _trajectoryComputing: {
        stage: 'batch',
        runStatus: 'complete',
        printout: window.TrajectoryComputingCore.formatPrintout(),
        batchReadback: { compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' },
        batchReadbackResult: window.TrajectoryComputingCore.checkBatchReadback({ compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' }),
        reproducibility: { speed: true, angle: true, height: true, gravity: true },
        reproducibilityResult: window.TrajectoryComputingCore.checkReproducibilityNote({ speed: true, angle: true, height: true, gravity: true }),
      },
    });
    expect(completed).toContain('role="img"');
    expect(completed).toContain('Text alternative: peak height');
    expect(completed).toContain('Printed range (m)');
    expect(completed).toContain('Continue to independent verification');
  });

  it('renders the extension, evidence controls, vocabulary, and teacher guide after verification', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, {
      _trajectoryComputing: {
        stage: 'verify',
        completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
        workPattern: 'pair',
        tableLookup: { sin: '0.6157', cos: '0.7880' },
        tableResult: { pass: true },
        tableApproximationResult: Object.assign(window.TrajectoryComputingCore.checkTableApproximation({ sin: '0.6157', cos: '0.7880' }, 'within'), { correct: true }),
        formatAudit: { timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' },
        formatAuditResult: window.TrajectoryComputingCore.checkFormatAudit({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }),
        printPreview: window.TrajectoryComputingCore.buildPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }),
        printPreviewResult: window.TrajectoryComputingCore.checkPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }, window.TrajectoryComputingCore.buildPrintPreview({ timeFormat: 'F8.2', rangeFormat: 'F10.1', order: 'time-range' }).line),
        batchReadback: { compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' },
        batchReadbackResult: window.TrajectoryComputingCore.checkBatchReadback({ compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' }),
        reproducibility: { speed: true, angle: true, height: true, gravity: true },
        reproducibilityResult: window.TrajectoryComputingCore.checkReproducibilityNote({ speed: true, angle: true, height: true, gravity: true }),
        auditTrail: [
          { station: 'briefing', nextStage: 'worksheet' },
          { station: 'worksheet', nextStage: 'program' },
          { station: 'program', nextStage: 'cards' },
          { station: 'cards', nextStage: 'batch' },
          { station: 'batch', nextStage: 'verify' },
          { station: 'verify', nextStage: 'complete' },
        ],
        verification: { range: '4607.7', verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
        verificationResult: { pass: true, assignmentPass: true },
        studyAngle: 46,
        studyPrediction: 'longer',
        studyResult: Object.assign(window.TrajectoryComputingCore.classifyAngleStudy(46), { correct: true }),
        reportOpen: true,
      },
    });

    expect(html).toContain('Change one variable. Predict before computing.');
    expect(html).toContain('Save evidence snapshot');
    expect(html).toContain('Run mission again');
    expect(html).toContain('Vocabulary desk');
    expect(html).toContain('Teacher guide');
    expect(html).toContain('Prediction supported.');
    expect(html).toContain('Two-desk verification record');
    expect(html).toContain('Aurora Test 3 Completion Report');
    expect(html).toContain('Hand-calculation audit ledger');
    expect(html).toContain('Accessibility and audit safeguards');
    expect(html).toContain('Accessibility and audit safeguards (5/5 verified)');
    expect(html).toContain('5 of 5 evidence safeguards verified in this report.');
    expect(html).toContain('Verified: Ordered operator audit chain');
    expect(html).toContain('Keyboard station tabs support Arrow keys, Home, and End.');
    expect(html).toContain('machine read-back remain separate checks');
    expect(html).toContain('Print this report');
    expect(html).toContain('Table-precision control');
    expect(html).toContain('Line-printer format card');
    expect(html).toContain('Format card:');
    expect(html).toContain('Line-printer preview confirmation');
    expect(html).toContain('Fixed-width preview:');
    expect(html).toContain('confirmed.');
    expect(html).toContain('Machine output read-back');
    expect(html).toContain('Machine read-back:');
    expect(html).toContain('Reproducibility note');
    expect(html).toContain('Reproducibility note:');
    expect(html).toContain('6 of 6 stations');
    expect(html).toContain('Operator audit log');
    expect(html).toContain('01 / Briefing');
    expect(html).toContain('06 / Verify');
  });

  it('keeps the station tabs and status surfaces WCAG-friendly', () => {
    loadTool(FILE, ID);
    const toolSource = fs.readFileSync(FILE, 'utf8');
    const html = renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } });

    expect(html).toContain('id="tc-progress-label"');
    expect(html).toContain('aria-labelledby="tc-progress-label"');
    expect(html).toContain('role="region" aria-label="Simulation stations"');
    expect(html).not.toContain('aria-controls="tc-panel-worksheet"');
    expect(toolSource).toContain("event.key === 'ArrowRight'");
    expect(toolSource).toContain("event.key === 'Home'");
    expect(toolSource).toContain("'aria-live': 'polite'");
    expect(toolSource).toContain('.tc-skip-link:focus');
    expect(toolSource).toContain('input[type=checkbox],[data-trajectory-lab] input[type=radio]{width:24px');
  });

  it('states the fictional boundary and cites primary historical sources', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } });
    expect(html).toContain('original and fictional');
    expect(html).toContain('NASA: Katherine Johnson biography');
    expect(html).toContain('NASA: Dorothy Vaughan biography');
    expect(html).toContain('No NASA insignia');
    expect(html).toContain('Desk codes represent roles, not student names');
  });

  it('is wired into the tile, fallback, lazy-loader, build, and desktop mirror', () => {
    const module = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const shell = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    const build = fs.readFileSync('build.js', 'utf8');

    expect(module).toContain("id: 'trajectoryComputing'");
    expect(module).toContain('trajectoryComputing: true');
    expect(shell).toContain("'stem_lab/stem_tool_trajectorycomputing.js'");
    expect(build).toContain("'stem_lab/stem_tool_trajectorycomputing.js'");
    expect(fs.existsSync(PUBLIC_FILE)).toBe(true);
    expect(fs.readFileSync(PUBLIC_FILE, 'utf8')).toBe(fs.readFileSync(FILE, 'utf8'));
  });
});
