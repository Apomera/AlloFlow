import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import axe from 'axe-core';
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
    expect(tool.questHooks).toHaveLength(14);
    expect(tool.questHooks.map((quest) => quest.id)).toContain('mission_replay_prediction');
    expect(tool.questHooks.map((quest) => quest.id)).toContain('angle_reasoning');
    expect(tool.questHooks.map((quest) => quest.id)).toContain('safeguard_reasoning');
    expect(core.expected.vx).toBeCloseTo(169.42, 1);
    expect(core.expected.vy).toBeCloseTo(132.37, 1);
    expect(core.expected.flightTime).toBeCloseTo(27.2, 1);
    expect(core.expected.range).toBeGreaterThanOrEqual(core.mission.zoneMin);
    expect(core.expected.range).toBeLessThanOrEqual(core.mission.zoneMax);
    expect(core.expected.inZone).toBe(true);
    const replayQuest = tool.questHooks.find((quest) => quest.id === 'mission_replay_prediction');
    expect(replayQuest.check({ _trajectoryComputing: {} })).toBe(false);
    expect(replayQuest.check({ _trajectoryComputing: { replayResult: core.evaluateReplayPrediction('meridian-5', 'shorter') } })).toBe(true);
    expect(replayQuest.progress({ _trajectoryComputing: { replayResult: core.evaluateReplayPrediction('meridian-5', 'longer') } })).toBe('Prediction revised');
    const angleQuest = tool.questHooks.find((quest) => quest.id === 'angle_reasoning');
    expect(angleQuest.check({ _trajectoryComputing: { studyExplanationResult: core.checkAngleExplanation('components') } })).toBe(true);
    expect(angleQuest.progress({ _trajectoryComputing: { studyResult: core.classifyAngleStudy(46) } })).toBe('Explain the result');
    const safeguardQuest = tool.questHooks.find((quest) => quest.id === 'safeguard_reasoning');
    expect(safeguardQuest.check({ _trajectoryComputing: { safeguardResult: core.evaluateSafeguardPrediction('misspelled-variable', 'compiler') } })).toBe(true);
    expect(core.missionVariants.map((mission) => mission.id)).toEqual(['aurora-3', 'meridian-5', 'horizon-8']);
    for (const mission of core.missionVariants) {
      expect(core.computeTrajectory(core.getMissionVariant(mission.id))).toEqual(core.computeTrajectory(core.getMissionVariant(mission.id)));
    }
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
    expect(broken.diagnostics.find((item) => item.code === 'D203')).toEqual(expect.objectContaining({ cardId: 'inputs', cardSequence: '00010003' }));
    expect(broken.diagnostics.find((item) => item.code === 'M403')).toEqual(expect.objectContaining({ cardId: 'components', cardSequence: '00010005' }));

    const correct = core.compileProgram(core.correctProgram);
    expect(correct).toEqual(expect.objectContaining({ pass: true, diagnostics: [] }));
    const source = fs.readFileSync(FILE, 'utf8');
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toContain('new Function');
  });

  it('maps compiler diagnostics to the exact editable source statement', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const diagnostics = core.compileProgram(core.starterProgram).diagnostics;
    const gravity = core.getDiagnosticSelection(core.starterProgram, diagnostics.find((item) => item.code === 'D203'));
    expect(gravity).toEqual(expect.objectContaining({ found: true, lineNumber: 6, lineText: 'G=9.18' }));
    expect(core.starterProgram.slice(gravity.start, gravity.end)).toContain('G=9.18');

    const variable = core.getDiagnosticSelection(core.starterProgram, diagnostics.find((item) => item.code === 'N301'));
    expect(variable).toEqual(expect.objectContaining({ found: true, lineNumber: 8, lineText: 'RAD=ANGEL*3.14159/180.0' }));

    const missingGravity = core.correctProgram.replace('      G=9.81\n', '');
    const missingDiagnostic = core.compileProgram(missingGravity).diagnostics.find((item) => item.code === 'D203');
    expect(core.getDiagnosticSelection(missingGravity, missingDiagnostic)).toEqual(expect.objectContaining({ found: false, expectedStatement: 'G=9.81' }));
  });

  it('normalizes privacy-conscious structured reflection evidence', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const reflection = core.normalizeReflection({ errorId: 'variable-name', safeguardId: 'compiler', note: `  ${'x'.repeat(520)}  ` });
    expect(reflection).toEqual(expect.objectContaining({ errorId: 'variable-name', safeguardId: 'compiler', recorded: true }));
    expect(reflection.note).toHaveLength(500);
    expect(core.normalizeReflection({ errorId: 'unknown', safeguardId: 'unknown', note: '   ' })).toEqual({ errorId: '', safeguardId: '', note: '', recorded: false });
  });

  it('builds a concise desk narration from the same visible briefing text', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    expect(core.buildDeskNarration(
      'Program',
      ['Repair and document the listing', 'Compiler check and print preview', 'Zero errors are confirmed'],
      ['Current task', 'Evidence to capture', 'Ready when'],
    )).toBe('Program desk. Current task: Repair and document the listing. Evidence to capture: Compiler check and print preview. Ready when: Zero errors are confirmed.');
    expect(core.buildDeskNarration('', [], [])).toBe('');
  });

  it('normalizes privacy-minimal historical connection notes by station', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const normalized = core.normalizeConnectionNotes({
      worksheet: '  Human math established an independent reference.  ',
      program: 'x'.repeat(320),
      unknown: 'This field must not be retained.',
    });
    expect(normalized).toEqual(expect.objectContaining({ recorded: 2, total: 6 }));
    expect(normalized.notes.worksheet).toBe('Human math established an independent reference.');
    expect(normalized.notes.program).toHaveLength(300);
    expect(normalized.notes).not.toHaveProperty('unknown');
  });

  it('fingerprints normalized evidence while ignoring view-only state', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const state = {
      worksheet: { range: '4607.7' },
      connectionNotes: { verify: 'Independent checking supports the decision.' },
      reflection: { errorId: 'variable-name', safeguardId: 'compiler', note: 'A spelling error was caught.' },
    };
    const fingerprint = core.createEvidenceFingerprint(state);
    expect(fingerprint).toMatch(/^tc-[0-9a-f]{8}$/);
    expect(core.createEvidenceFingerprint({ ...state, stage: 'verify', reportOpen: true, extensionView: 'menu', lastSnapshotAt: 99 })).toBe(fingerprint);
    expect(core.createEvidenceFingerprint({ ...state, connectionNotes: { verify: 'A revised connection.' } })).not.toBe(fingerprint);
    expect(core.createEvidenceFingerprint({ ...state, worksheet: { range: '4610.1' } })).not.toBe(fingerprint);
  });

  it('makes the batch-machine pipeline inspectable before, after, and on rejection', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;

    const waiting = core.getBatchProcessTrace('idle');
    expect(waiting).toEqual(expect.objectContaining({ status: 'idle', completed: 0, total: 4 }));
    expect(waiting.steps.map((step) => step.id)).toEqual(['reader', 'compiler', 'computer', 'printer']);
    expect(waiting.steps.map((step) => step.state)).toEqual(['ready', 'pending', 'pending', 'pending']);
    expect(waiting.consoleText).toContain('JOB WAITING');

    const complete = core.getBatchProcessTrace('complete');
    expect(complete.completed).toBe(4);
    expect(complete.steps.every((step) => step.state === 'complete')).toBe(true);
    expect(complete.consoleText).toContain('PRINTER READY');

    const readerRejected = core.getBatchProcessTrace('error', 'reader');
    expect(readerRejected.steps.map((step) => step.state)).toEqual(['error', 'blocked', 'blocked', 'blocked']);
    expect(readerRejected.consoleText).toContain('CARD READER');
    const compilerRejected = core.getBatchProcessTrace('error', 'compiler');
    expect(compilerRejected.steps.map((step) => step.state)).toEqual(['complete', 'error', 'blocked', 'blocked']);
    expect(compilerRejected.consoleText).toContain('COMPILER');
  });

  it('treats every batch rerun as a new auditable record and clears the old signoff', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const fullTrail = [
      ['briefing', 'worksheet'], ['worksheet', 'program'], ['program', 'cards'],
      ['cards', 'batch'], ['batch', 'verify'], ['verify', 'complete'],
    ].map(([station, nextStage]) => ({ station, nextStage }));
    const signed = {
      completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
      auditTrail: fullTrail,
      batchRunCount: 1,
      batchReadbackResult: { pass: true },
      verification: { range: '4607.7', verdict: 'go' },
      verificationResult: { pass: true },
      reproducibility: { speed: true, angle: true, height: true, gravity: true },
      reproducibilityResult: { pass: true },
    };

    const rerun = core.prepareBatchSubmission(signed, core.correctProgram, core.correctDeck, 1234);
    expect(rerun.runStatus).toBe('complete');
    expect(rerun.batchRunId).toBe('62-AUR-03-R02');
    expect(rerun.batchRunAt).toBe(1234);
    expect(rerun.completed).toEqual({ briefing: true, worksheet: true, program: true, cards: true });
    expect(rerun.auditTrail).toEqual(fullTrail.slice(0, 4).map((entry) => ({ ...entry, recordedAt: null })));
    expect(rerun.batchReadbackResult).toBeNull();
    expect(rerun.verification).toEqual({});
    expect(rerun.verificationResult).toBeNull();
    expect(rerun.reproducibility).toEqual({});
    expect(rerun.reproducibilityResult).toBeNull();

    const readerFailure = core.prepareBatchSubmission(signed, core.correctProgram, core.starterDeck, 1235);
    expect(readerFailure).toEqual(expect.objectContaining({ runStatus: 'error', printout: null }));
    expect(readerFailure.batchFailure).toEqual(expect.objectContaining({ stage: 'reader' }));
    const compilerFailure = core.prepareBatchSubmission(signed, core.starterProgram, core.correctDeck, 1236);
    expect(compilerFailure.batchFailure).toEqual(expect.objectContaining({ stage: 'compiler' }));
  });

  it('checks original safeguard incidents without revealing the answer before prediction', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    expect(core.safeguardCases).toHaveLength(4);
    expect(core.getSafeguardCase('transposed-output')).toEqual(expect.objectContaining({ expected: 'readback' }));
    expect(core.evaluateSafeguardPrediction('misspelled-variable', '')).toEqual(expect.objectContaining({ correct: false, prediction: '' }));
    expect(core.evaluateSafeguardPrediction('misspelled-variable', 'deck-audit')).toEqual(expect.objectContaining({ correct: false, expected: 'compiler' }));
    expect(core.evaluateSafeguardPrediction('misspelled-variable', 'compiler')).toEqual(expect.objectContaining({ correct: true, pass: true }));
  });

  it('uses distinct support profiles with progressive card-specific guidance', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const diagnostic = core.compileProgram(core.starterProgram).diagnostics.find((item) => item.code === 'D203');

    expect(core.getSupportProfile('guided')).toEqual(expect.objectContaining({ formulaVisibility: 'always', diagnosticHintAfter: 1 }));
    expect(core.getSupportProfile('standard')).toEqual(expect.objectContaining({ formulaVisibility: 'request', diagnosticHintAfter: 2 }));
    expect(core.getSupportProfile('expert')).toEqual(expect.objectContaining({ formulaVisibility: 'request', diagnosticHintAfter: 3, checkpointPrompt: false }));
    expect(core.getDiagnosticGuidance(diagnostic, 'guided', 1).showHint).toBe(true);
    expect(core.getDiagnosticGuidance(diagnostic, 'standard', 1).showHint).toBe(false);
    expect(core.getDiagnosticGuidance(diagnostic, 'standard', 2).message).toContain('9.81');
    expect(core.getDiagnosticGuidance(diagnostic, 'expert', 2).showHint).toBe(false);
    expect(core.getDiagnosticGuidance(diagnostic, 'expert', 3).showHint).toBe(true);

    const guidedWorksheet = renderTool(ID, { _trajectoryComputing: { stage: 'worksheet', mode: 'guided' } });
    const standardWorksheet = renderTool(ID, { _trajectoryComputing: { stage: 'worksheet', mode: 'standard' } });
    expect(guidedWorksheet).toContain('theta radians = theta degrees');
    expect(standardWorksheet).not.toContain('theta radians = theta degrees');

    const standardFirstCheck = renderTool(ID, { _trajectoryComputing: { stage: 'program', mode: 'standard', attempts: { compile: 1 }, compileResult: core.compileProgram(core.starterProgram) } });
    const standardSecondCheck = renderTool(ID, { _trajectoryComputing: { stage: 'program', mode: 'standard', attempts: { compile: 2 }, compileResult: core.compileProgram(core.starterProgram) } });
    expect(standardFirstCheck).toContain('CARD 00010003');
    expect(standardFirstCheck).toContain('Next repair card');
    expect(standardFirstCheck).toContain('Diagnostic 1 of 4');
    expect(standardFirstCheck).toContain('Jump to affected statement');
    expect(standardFirstCheck).toContain('Next repair');
    expect(standardFirstCheck).toContain('All diagnostics (4)');
    expect(standardFirstCheck).toContain('class="tc-diagnostic-card"');
    expect(standardFirstCheck).toContain('more specific repair hint unlocks');
    expect(standardFirstCheck).not.toContain('Gravity is 9.81');
    expect(standardSecondCheck).toContain('Gravity is 9.81');
  });

  it('normalizes privacy-minimal attempt evidence and generates repeatable chart paths', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const attempts = core.incrementAttempt({ compile: 1, worksheet: -4 }, 'compile');
    expect(attempts).toEqual({ worksheet: 0, compile: 2, format: 0, deck: 0, readback: 0, verification: 0 });
    expect(core.mergeDiagnosticCodes(['D203'], [{ code: 'D203' }, { code: 'M403' }])).toEqual(['D203', 'M403']);

    const mission = core.getMissionVariant('meridian-5');
    const result = core.computeTrajectory(mission);
    const firstPath = core.trajectoryPathFor(mission, result, { maxRange: 5200, maxPeak: 2800 });
    const secondPath = core.trajectoryPathFor(mission, result, { maxRange: 5200, maxPeak: 2800 });
    expect(firstPath).toBe(secondPath);
    expect(firstPath.split(' ')).toHaveLength(33);

    const replay = core.compareMissionVariant('meridian-5');
    expect(replay.mission.id).toBe('meridian-5');
    expect(replay.changedInputs).toEqual(['speed', 'angle', 'height']);
    expect(replay.rangeDifference).toBeCloseTo(replay.result.range - core.expected.range, 8);
    expect(core.compareMissionVariant('meridian-5')).toEqual(replay);
    expect(core.evaluateReplayPrediction('meridian-5', 'shorter')).toEqual(expect.objectContaining({ prediction: 'shorter', relation: 'shorter', correct: true }));
    expect(core.evaluateReplayPrediction('meridian-5', 'longer')).toEqual(expect.objectContaining({ prediction: 'longer', relation: 'shorter', correct: false }));
    expect(core.evaluateReplayPrediction('meridian-5', 'invalid')).toEqual(expect.objectContaining({ prediction: '', correct: false }));

    expect(core.summarizeRevisionEvidence({ worksheet: 1, compile: 3, deck: 2 }, ['D203', 'M403'])).toEqual({
      attempts: { worksheet: 1, compile: 3, format: 0, deck: 2, readback: 0, verification: 0 },
      diagnosticCodes: ['D203', 'M403'],
      totalAttempts: 6,
      revisedStations: 2,
      singleCheckStations: 1,
    });
  });

  it('invalidates dependent evidence once and keeps the audit chain revision-safe', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const fullTrail = [
      ['briefing', 'worksheet'], ['worksheet', 'program'], ['program', 'cards'],
      ['cards', 'batch'], ['batch', 'verify'], ['verify', 'complete'],
    ].map(([station, nextStage], index) => ({ station, nextStage, recordedAt: index + 1 }));
    const state = {
      completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
      auditTrail: fullTrail,
      compileResult: { pass: true }, formatAuditResult: { pass: true }, printPreview: { line: 'preview' }, printPreviewResult: { pass: true },
      deckResult: { pass: true }, runStatus: 'complete', printout: 'output', batchReadbackResult: { pass: true },
      reproducibilityResult: { pass: true }, verificationResult: { pass: true }, reportOpen: true,
      studyResult: core.classifyAngleStudy(46), studyExplanationResult: core.checkAngleExplanation('components'),
      replayResult: core.evaluateReplayPrediction('meridian-5', 'shorter'), awarded: true,
    };
    const revised = core.invalidateForRevision(state, 'program', { code: 'changed listing' }, 99);
    expect(revised.completed).toEqual({ briefing: true, worksheet: true });
    expect(revised.auditTrail).toEqual(fullTrail.slice(0, 2));
    expect(revised.compileResult).toBeNull();
    expect(revised.deckResult).toBeNull();
    expect(revised.runStatus).toBe('idle');
    expect(revised.verificationResult).toBeNull();
    expect(revised.studyResult).toBeNull();
    expect(revised.replayResult).toBeNull();
    expect(revised.awarded).toBe(true);
    expect(revised.revisionTrail).toEqual([{ station: 'program', affectedStations: ['program', 'cards', 'batch', 'verify'], recordedAt: 99 }]);
    expect(revised.revisionNotice).toEqual({ station: 'program', affectedStations: ['program', 'cards', 'batch', 'verify'] });

    const repeatedEdit = core.invalidateForRevision(revised, 'program', { code: 'changed again' }, 100);
    expect(repeatedEdit.revisionTrail).toHaveLength(1);
    expect(core.recordAuditHandoff(fullTrail, 'program', 'cards', 200)).toEqual([...fullTrail.slice(0, 2), { station: 'program', nextStage: 'cards', recordedAt: 200 }]);
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

    const emptyReadiness = core.getVerificationReadiness({ workPattern: 'pair' });
    expect(emptyReadiness).toEqual(expect.objectContaining({ ready: false, count: 0, total: 4, nextId: 'range' }));
    expect(core.getVerificationReadiness({
      workPattern: 'pair',
      verification: { range: '3000', verdict: 'hold', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
      reproducibilityResult: reproducibility,
    })).toEqual(expect.objectContaining({ ready: true, count: 4, nextId: null }));
    expect(core.getVerificationReadiness({
      workPattern: 'pair',
      verification: { range: '3000', verdict: 'hold', calculatorDesk: 'desk-a', verifierDesk: 'desk-a' },
      reproducibilityResult: reproducibility,
    }).nextId).toBe('roles');
    expect(core.getVerificationReadiness({
      workPattern: 'solo',
      verification: { range: '3000', verdict: 'hold', secondPass: true },
      reproducibilityResult: reproducibility,
    }).ready).toBe(true);
  });

  it('explains every signing prerequisite before enabling verification', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const incomplete = renderTool(ID, { _trajectoryComputing: { stage: 'verify', workPattern: 'pair' } });
    expect(incomplete).toContain('Ready to sign?');
    expect(incomplete).toContain('0 of 4 signing checks ready. Next: Independent range recorded.');
    expect(incomplete).toContain('Verification signing prerequisites');
    expect(incomplete).toContain('Different desk codes assigned');
    expect(incomplete).toContain('Fixed mission inputs documented');
    expect(incomplete).toContain('aria-describedby="tc-signing-status"');
    expect(incomplete).toContain('<button type="submit" class="tc-action" disabled="" aria-describedby="tc-signing-status"');

    const ready = renderTool(ID, { _trajectoryComputing: {
      stage: 'verify',
      workPattern: 'pair',
      verification: { range: core.expected.range.toFixed(1), verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
      reproducibilityResult: core.checkReproducibilityNote({ speed: true, angle: true, height: true, gravity: true }),
    } });
    expect(ready).toContain('All signing checks are ready. Correctness is evaluated only after you sign.');
    expect(ready).toContain('<button type="submit" class="tc-action" aria-describedby="tc-signing-status"');
  });

  it('reconciles hand, machine, and verification ranges without revealing identity data', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const reference = core.expected.range;
    const agreed = core.reconcileRangeEvidence({
      worksheet: { range: String(reference - 2) },
      batchReadback: { range: String(reference + 3) },
      verification: { range: String(reference + 1) },
    });
    expect(agreed).toEqual(expect.objectContaining({ complete: true, pass: true, tolerance: 15, spread: 5 }));
    expect(agreed.sources.map((source) => source.id)).toEqual(['worksheet', 'machine', 'verification']);
    expect(agreed.sources.every((source) => source.withinReference)).toBe(true);

    const divergent = core.reconcileRangeEvidence({
      worksheet: { range: String(reference - 2) },
      batchReadback: { range: String(reference + 3) },
      verification: { range: String(reference + 30) },
    });
    expect(divergent.complete).toBe(true);
    expect(divergent.pass).toBe(false);
    expect(divergent.spread).toBe(32);
    expect(divergent.sources.find((source) => source.id === 'verification').withinReference).toBe(false);
    expect(core.reconcileRangeEvidence({ worksheet: { range: reference } }).complete).toBe(false);
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
    expect(core.checkAngleExplanation('components')).toEqual(expect.objectContaining({ pass: true, correct: true }));
    expect(core.checkAngleExplanation('gravity')).toEqual(expect.objectContaining({ pass: false, correct: false }));
    expect(core.checkAngleExplanation('')).toEqual(expect.objectContaining({ pass: false, value: '' }));
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
      revisionTrail: [{ station: 'program', affectedStations: ['program', 'cards', 'batch', 'verify'], recordedAt: 7 }],
      deckResult: { pass: true },
      runStatus: 'complete',
      workPattern: 'pair',
      verification: { range: '4607.7', verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
      verificationResult: { pass: true, assignmentPass: true },
      studyResult: core.classifyAngleStudy(46),
      studyExplanation: 'components',
      studyExplanationResult: core.checkAngleExplanation('components'),
      attempts: { worksheet: 2, compile: 3, format: 1, deck: 2, readback: 1, verification: 1 },
      diagnosticHistory: ['D203', 'N301', 'M403'],
      replayResult: core.evaluateReplayPrediction('meridian-5', 'shorter'),
      safeguardResult: core.evaluateSafeguardPrediction('misspelled-variable', 'compiler'),
      connectionNotes: { worksheet: 'The hand calculation gave the machine result an independent reference.', program: 'Programmers used mathematical knowledge to diagnose the listing.', unexpected: 'discard this' },
      reflection: { errorId: 'variable-name', safeguardId: 'compiler', note: 'The compiler caught a spelling error before computation.' },
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
    expect(evidence.data.revisionTrail).toEqual([{ station: 'program', affectedStations: ['program', 'cards', 'batch', 'verify'], recordedAt: 7 }]);
    expect(evidence.data.workflow).toEqual({ pattern: 'pair', assignmentPassed: true });
    expect(evidence.data.rangeReconciliation).toEqual(expect.objectContaining({ complete: true, pass: true, spread: 2.4, tolerance: 15 }));
    expect(evidence.data.revisionEvidence).toEqual({
      attempts: { worksheet: 2, compile: 3, format: 1, deck: 2, readback: 1, verification: 1 },
      diagnosticCodes: ['D203', 'N301', 'M403'],
      totalAttempts: 10,
      revisedStations: 3,
      singleCheckStations: 3,
    });
    expect(evidence.data.replayCard).toEqual(expect.objectContaining({
      id: 'meridian-5',
      relation: 'shorter',
      prediction: 'shorter',
      predictionCorrect: true,
      changedInputs: ['speed', 'angle', 'height'],
    }));
    expect(evidence.data.angleStudy).toEqual(expect.objectContaining({ explanation: 'components', explanationCorrect: true }));
    expect(evidence.data.connectionNotes).toEqual({
      notes: {
        worksheet: 'The hand calculation gave the machine result an independent reference.',
        program: 'Programmers used mathematical knowledge to diagnose the listing.',
      },
      recorded: 2,
      total: 6,
    });
    expect(evidence.data.reflection).toEqual({ errorId: 'variable-name', safeguardId: 'compiler', note: 'The compiler caught a spelling error before computation.', recorded: true });
    expect(evidence.data).not.toHaveProperty('code');
    expect(evidence.data).not.toHaveProperty('studentName');
    expect(tool.questHooks.every((quest) => quest.check({ _trajectoryComputing: state }))).toBe(true);

    const report = core.createCompletionReport(state);
    expect(report.status).toBe('VERIFIED');
    expect(report.workflow).toBe('Paired independent cross-check');
    expect(report.auditTrail).toHaveLength(6);
    expect(report.revisionTrail).toHaveLength(1);
    expect(report.checks.every((check) => check.pass)).toBe(true);
    expect(report.safeguards).toEqual(expect.objectContaining({ passed: 5, total: 5 }));
    expect(report.safeguards.checks.every((check) => check.pass)).toBe(true);
    expect(report.revisionEvidence.totalAttempts).toBe(10);
    expect(report.replayCard).toEqual(expect.objectContaining({ prediction: 'shorter', correct: true }));
    expect(report.angleStudy).toEqual(expect.objectContaining({ explanation: 'components', explanationCorrect: true }));
    expect(report.connectionNotes).toEqual(evidence.data.connectionNotes);
    expect(report.rangeReconciliation).toEqual(expect.objectContaining({ complete: true, pass: true, spread: 2.4 }));
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
      expect(html).toContain('class="tc-tab-icon"');
      expect(html).toContain('class="tc-tab-label"');
      expect(html).toContain('Swipe the station map to see the full workflow.');
      expect(html).toContain('Low-distraction view');
      expect(html).toContain('Audit progress');
      expect(html).toContain('Current task');
      expect(html).toContain('Evidence to capture');
      expect(html).toContain('Ready when');
      expect(html).toContain('desk briefing');
      expect(html).toContain('Read desk summary aloud');
      expect(html).toContain('aria-label="Read the current desk summary aloud"');
      expect(html).toContain('Optional connection note');
      expect(html).toContain('Included in saved evidence and the completion report.');
      expect(html).toContain('Evidence file');
      expect(html).toContain('Station evidence status');
      expect(html).toContain('role="progressbar"');
      expect(html).toContain('Current desk: ' + (stage === 'briefing' ? 'Briefing' : stage === 'worksheet' ? 'Hand math' : stage === 'program' ? 'Program' : stage === 'cards' ? 'Card deck' : stage === 'batch' ? 'Batch run' : 'Verify'));
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
    expect(completed).toContain('Batch process trace');
    expect(completed).toContain('data-machine-step="reader"');
    expect(completed.match(/tc-batch-step is-complete/g)).toHaveLength(4);

    const waitingBatch = renderTool(ID, { _trajectoryComputing: { stage: 'batch' } });
    expect(waitingBatch).toContain('The entire job moves through these units');
    expect(waitingBatch).toContain('aria-current="step"');
    expect(waitingBatch).toContain('Card reader');
    expect(waitingBatch).toContain('Line printer');

    const firstVisitHtml = renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } });
    expect(firstVisitHtml).toContain('How the mission works');
    expect(firstVisitHtml).toContain('Build a human reference.');
    expect(firstVisitHtml).toContain('Prepare the machine job.');
    expect(firstVisitHtml).toContain('Verify independently.');
    expect(firstVisitHtml).toContain('Got it — show my work order');
    const returningVisitHtml = renderTool(ID, { _trajectoryComputing: { stage: 'briefing', orientationDismissed: true } });
    expect(returningVisitHtml).not.toContain('How the mission works');

    const lowDistractionHtml = renderTool(ID, { _trajectoryComputing: { stage: 'briefing', lowDistraction: true } });
    expect(lowDistractionHtml).toContain('data-low-distraction="true"');
  });

  it('renders the extension, evidence controls, vocabulary, and teacher guide after verification', () => {
    loadTool(FILE, ID);
    const verifiedState = {
        stage: 'verify',
        completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
        workPattern: 'pair',
        worksheet: { vx: '169.42', vy: '132.37', flightTime: '27.20', range: '4607.7' },
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
        revisionTrail: [{ station: 'program', affectedStations: ['program', 'cards', 'batch', 'verify'] }],
        verification: { range: '4607.7', verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
        verificationResult: { pass: true, assignmentPass: true },
        studyAngle: 46,
        studyPrediction: 'longer',
        studyResult: Object.assign(window.TrajectoryComputingCore.classifyAngleStudy(46), { correct: true }),
        studyExplanation: 'components',
        studyExplanationResult: window.TrajectoryComputingCore.checkAngleExplanation('components'),
        replayVariantId: 'meridian-5',
        replayPrediction: 'shorter',
        replayResult: window.TrajectoryComputingCore.evaluateReplayPrediction('meridian-5', 'shorter'),
        safeguardCaseId: 'misspelled-variable',
        safeguardPrediction: 'compiler',
        safeguardResult: window.TrajectoryComputingCore.evaluateSafeguardPrediction('misspelled-variable', 'compiler'),
        connectionNotes: {
          program: 'Mathematical expertise helped diagnose the program rather than trusting the machine alone.',
          verify: 'Independent checking made the final decision more trustworthy.',
        },
        reflection: { errorId: 'variable-name', safeguardId: 'compiler', note: 'The compiler caught the transposed variable.' },
        attempts: { worksheet: 2, compile: 3, format: 1, deck: 2, readback: 1, verification: 1 },
        diagnosticHistory: ['D203', 'N301', 'M403'],
        reportOpen: true,
    };
    verifiedState.lastSnapshotAt = 123;
    verifiedState.lastSnapshotFingerprint = window.TrajectoryComputingCore.createEvidenceFingerprint(verifiedState);
    const menuHtml = renderTool(ID, { _trajectoryComputing: verifiedState });
    const staleSnapshotHtml = renderTool(ID, { _trajectoryComputing: { ...verifiedState, connectionNotes: { ...verifiedState.connectionNotes, verify: 'This connection changed after the snapshot.' } } });
    const angleHtml = renderTool(ID, { _trajectoryComputing: { ...verifiedState, extensionView: 'angle' } });
    const replayHtml = renderTool(ID, { _trajectoryComputing: { ...verifiedState, extensionView: 'replay' } });
    const safeguardHtml = renderTool(ID, { _trajectoryComputing: { ...verifiedState, extensionView: 'safeguard' } });
    const html = menuHtml + angleHtml + replayHtml + safeguardHtml;

    expect(menuHtml).toContain('Choose your next challenge.');
    expect(menuHtml).toContain('Angle lab');
    expect(menuHtml).toContain('Replay mission');
    expect(menuHtml).toContain('Safeguard lab');
    expect(menuHtml).toContain('Reflection record');
    expect(menuHtml).toContain('Use no names or personal details.');
    expect(menuHtml).toContain('Connection note recorded for this station.');
    expect(menuHtml).toContain('Evidence report');
    expect(menuHtml).toContain('Optional explorations');
    expect(menuHtml).toContain('3 of 3 complete');
    expect(menuHtml).toContain('✓ Completed');
    expect(menuHtml).toContain('Ready to review');
    expect(menuHtml).toContain('Evidence snapshot includes the latest work.');
    expect(staleSnapshotHtml).toContain('Work changed after the last snapshot. Save a new snapshot to include it.');
    expect(menuHtml).toContain('Evidence file — 6 of 6 recorded');
    expect(menuHtml).not.toContain('Change one variable. Predict before computing.');
    expect(menuHtml).not.toContain('Deterministic mission replay cards');
    expect(menuHtml).toContain('Earned competencies');
    expect(menuHtml).toContain('Independent verification');
    expect(menuHtml).toContain('Three-record agreement');
    expect(menuHtml).toContain('This comparison is revealed only after the verification entry is signed');
    expect(menuHtml).toContain('Maximum spread: 2.4 m');
    expect(menuHtml).toContain('Hand worksheet');
    expect(menuHtml).toContain('Batch printout read-back');
    expect(menuHtml).toContain('Verification sheet');
    expect(menuHtml).toContain('id="tc-range-reconciliation-title"');
    expect(menuHtml).not.toContain('class="tc-certificate" role="status"');

    expect(html).toContain('Change one variable. Predict before computing.');
    expect(html).toContain('Save evidence snapshot');
    expect(html).toContain('Run mission again');
    expect(html).toContain('Vocabulary desk');
    expect(html).toContain('Teacher guide');
    expect(html).toContain('Prediction supported.');
    expect(html).toContain('Reflection evidence:');
    expect(html).toContain('Historical reasoning notes');
    expect(html).toContain('2 of 6 station connections recorded.');
    expect(html).toContain('Mathematical expertise helped diagnose the program rather than trusting the machine alone.');
    expect(html).toContain('Independent checking made the final decision more trustworthy.');
    expect(html).toContain('Misspelled variable name; Compiler diagnostic.');
    expect(html).toContain('The compiler caught the transposed variable.');
    expect(safeguardHtml).toContain('Predict which check catches the error.');
    expect(safeguardHtml).toContain('The listing uses RAT where the declared variable is RAD.');
    expect(safeguardHtml).toContain('Machine output read-back');
    expect(html).toContain('Two-desk verification record');
    expect(html).toContain('Aurora Test 3 Completion Report');
    expect(html).toContain('id="tc-completion-report"');
    expect(html).toContain('tabindex="-1"');
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
    expect(html).toContain('Revision log');
    expect(html).toContain('4 downstream records required rechecking.');
    expect(html).toContain('01 / Briefing');
    expect(html).toContain('06 / Verify');
    expect(html).toContain('Baseline and comparison trajectory');
    expect(html).toContain('stroke-dasharray="10 7"');
    expect(angleHtml).toContain('id="tc-target-hatch"');
    expect(angleHtml).toContain('TARGET ZONE');
    expect(angleHtml).toContain('38\u00b0 peak');
    expect(angleHtml).toContain('46\u00b0 lands');
    expect(angleHtml).toContain('Scrollable baseline and comparison trajectory chart');
    expect(angleHtml).toContain('Open numeric chart data');
    expect(angleHtml).toContain('Numeric data for the baseline and comparison trajectories');
    expect(angleHtml).toContain('scope="row"');
    expect(angleHtml).toContain('Explain the result with evidence');
    expect(angleHtml).toContain('name="tc-study-explanation"');
    expect(angleHtml).toContain('Supported: changing angle redistributes');
    expect(angleHtml).toContain('class="tc-check"><p role="status"');
    expect(angleHtml).not.toContain('class="tc-check" role="status"');
    expect(html).toContain('Solid: 38-degree baseline');
    expect(html).toContain('Deterministic mission replay cards');
    expect(html).toContain('Prerequisites:');
    expect(html).toContain('Suggested standards alignment:');
    expect(html).toContain('Compact evidence rubric');
    expect(html).toContain('Revision evidence:');
    expect(html).toContain('Discarded code and personal identifiers are not stored.');
    expect(html).toContain('Revision journey:');
    expect(html).toContain('3 stations needed more than one check');
    expect(html).toContain('range change from Aurora');
    expect(html).toContain('Changed inputs:');
    expect(html).toContain('speed, angle, height');
    expect(html).toContain('Before computing, predict the replay landing range');
    expect(html).toContain('name="tc-replay-prediction"');
    expect(html).toContain('Replay prediction supported.');
    expect(html).toContain('Aurora baseline compared with selected replay card');
    expect(html).toContain('scope="row"');
    expect(html).toContain('Peak height');
    expect(html).toContain('Mission replay evidence:');
    expect(html).toContain('Transfer reasoning');
    expect(html).toContain('mission-replay prediction and comparison');
  });

  it('localizes core feedback at the rendered boundary and identifies invalid fields', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const worksheetResult = core.checkWorksheet({ vx: '', vy: '', flightTime: '', range: '' });
    const html = renderTool(ID, {
      _trajectoryComputing: { stage: 'worksheet', mode: 'guided', worksheetResult },
    }, {
      t: (key, fallback) => key === 'stem.trajectorycomputing.feedback_enter_number' ? 'ENTER A LOCALIZED NUMBER' : (fallback || key),
    });
    expect(html).toContain('ENTER A LOCALIZED NUMBER');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="tc-worksheet-summary"');
    expect(html).toContain('tabindex="-1"');

    const program = renderTool(ID, {
      _trajectoryComputing: { stage: 'program', compileResult: core.compileProgram(core.starterProgram), attempts: { compile: 1 } },
    });
    expect(program).toContain('aria-invalid="true"');
    expect(program).toContain('aria-errormessage="tc-compiler-message"');
    expect(program).toContain('id="tc-compiler-message"');
    expect(program).toContain('id="tc-compiler-diagnostics"');

    const localizedBrief = renderTool(ID, {
      _trajectoryComputing: { stage: 'briefing', completed: { briefing: true } },
    }, {
      t: (key, fallback) => ({
        'stem.trajectorycomputing.brief_task_briefing': 'LOCAL TASK',
        'stem.trajectorycomputing.evidence_work_order': 'LOCAL EVIDENCE',
        'stem.trajectorycomputing.count_of': 'LOCAL OF',
        'stem.trajectorycomputing.stations': 'LOCAL STATIONS',
      }[key] || fallback || key),
    });
    expect(localizedBrief).toContain('LOCAL TASK');
    expect(localizedBrief).toContain('LOCAL EVIDENCE');
    expect(localizedBrief).toContain('1 LOCAL OF 6 LOCAL STATIONS');
  });

  it('upgrades legacy replay state without producing undefined or NaN output', () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const mission = core.getMissionVariant('meridian-5');
    const html = renderTool(ID, {
      _trajectoryComputing: {
        stage: 'verify',
        completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
        reproducibilityResult: { pass: true },
        verificationResult: { pass: true, assignmentPass: true },
        replayVariantId: 'meridian-5',
        extensionView: 'replay',
        replayResult: { mission, result: core.computeTrajectory(mission) },
      },
    });
    expect(html).toContain('range change from Aurora');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('NaN');
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
    expect(toolSource).toContain('@media(prefers-reduced-motion:reduce)');
    expect(toolSource).toContain('@media(forced-colors:active)');
    expect(toolSource).toContain("'aria-labelledby': 'tc-comparison-title tc-comparison-desc'");
    expect(toolSource).toContain("strokeDasharray: '10 7'");
    expect(toolSource).toContain('.tc-chart-frame .tc-chart{min-width:620px}');
    expect(toolSource).toContain("lowDistraction: lowDistraction, orientationDismissed: orientationDismissed");
    expect(toolSource).toContain('.tc-completion-surfaces>*:not(.tc-report)');
  });

  it('passes axe-core structural WCAG checks in diagnostic and completed states', async () => {
    loadTool(FILE, ID);
    const core = window.TrajectoryComputingCore;
    const states = [
      { stage: 'briefing' },
      {
        stage: 'program',
        mode: 'standard',
        attempts: { compile: 1 },
        compileResult: core.compileProgram(core.starterProgram),
      },
      {
        stage: 'verify',
        completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
        workPattern: 'pair',
        reproducibilityResult: { pass: true, correct: 4, total: 4 },
        verification: { range: core.expected.range.toFixed(1), verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
        verificationResult: { pass: true, assignmentPass: true },
        studyAngle: 46,
        studyPrediction: 'longer',
        studyResult: Object.assign(core.classifyAngleStudy(46), { correct: true }),
        studyExplanation: 'components',
        studyExplanationResult: core.checkAngleExplanation('components'),
        extensionView: 'angle',
      },
    ];
    states.push({ ...states[2], extensionView: 'menu' });

    for (const state of states) {
      document.body.innerHTML = '<div id="root">' + renderTool(ID, { _trajectoryComputing: state }) + '</div>';
      const result = await axe.run(document.getElementById('root'), {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
        rules: { 'color-contrast': { enabled: false } },
      });
      expect(result.violations.map((violation) => violation.id), JSON.stringify(result.violations.map((violation) => ({ id: violation.id, nodes: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })) })), null, 2)).toEqual([]);
    }
  }, 15000);

  it('states the fictional boundary and cites primary historical sources', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _trajectoryComputing: { stage: 'briefing' } });
    expect(html).toContain('original and fictional');
    expect(html).toContain('NASA: Katherine Johnson biography');
    expect(html).toContain('NASA: Dorothy Vaughan biography');
    expect(html).toContain('No NASA insignia');
    expect(html).toContain('Desk codes represent roles, not student names');
    expect(html).toContain('History checkpoint / Briefing');
    expect(html).toContain('Connection prompt:');
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
