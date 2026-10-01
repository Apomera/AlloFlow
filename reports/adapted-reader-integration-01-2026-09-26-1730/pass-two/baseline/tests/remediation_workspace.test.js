import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
let workspace;
beforeAll(() => {
  window.React = React;
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('view_pdf_audit_module.js');
  workspace = window.AlloModules.PdfWorkspace;
});
describe('remediation workspace status', () => {
  const draft = { accessibleHtml: '<h1>Draft</h1>', afterScore: 100 };
  it.each([
    [{ busy: true, progress: { status: 'complete', overallPercent: 100 }, result: draft }, 'Remediation in progress', 2],
    [{ busy: true, verifying: true, progress: { overallPercent: 100 }, result: draft }, 'Verifying improvements', 3],
    [{ busy: true, progress: { status: 'throttled' } }, 'Waiting for AI', 2],
    [{ auditLoading: true, progress: { status: 'throttled' } }, 'Auditing document', 1],
    [{ result: { ...draft, _remediationThrottlePaused: true } }, 'Remediation paused', 2],
    [{ result: draft, progress: { status: 'cancelled' } }, 'Remediation stopped', 2],
    [{ result: draft, progress: { status: 'failed' } }, 'Remediation interrupted', 2],
    [{ result: draft }, 'Needs review', 4],
    [{ result: draft, evidence: { fullyVerifiedSuccess: true }, verdict: { level: 'caution' } }, 'Needs review', 4],
    [{ result: draft, evidence: { fullyVerifiedSuccess: true }, verdict: { level: 'ready' } }, 'Review & download', 4],
    [{ audit: { score: -1 } }, 'Audit did not finish', 1],
    [{ audit: { score: 85 } }, 'Audit available', 2],
    [{ audit: { _choosing: true } }, 'Prepare your document', 0],
  ])('keeps stage and outcome honest for %j', (input, title, stage) => {
    expect(workspace.state(input)).toMatchObject({ title, stage });
  });
  it('prioritizes batch ownership over an intermediate single-file result', () => {
    const result = workspace.state({ batchMode: true, batchProcessing: true, result: draft, queue: [{ status: 'done' }, { status: 'failed' }, { status: 'pending' }] });
    expect(result.title).toBe('Processing batch');
    expect(result.detail).toContain('1 / 3 processed');
    expect(result.detail).toContain('1 failed');
    expect(result.destination).toBeNull();
  });
  it.each(['paused-quota', 'stopped', 'interrupted'])('keeps %s batch resumable', status => {
    expect(workspace.state({ batchMode: true, batchSummary: { status }, queue: [] })).toMatchObject({ stage: 2, tone: 'attention', destination: '#pdf-workspace-batch' });
  });
  it('opens nested disclosures and moves focus to the requested destination', () => {
    const root = document.createElement('div');
    root.innerHTML = '<details><summary>Tools</summary><details><summary>Formats</summary><p id="export-target">Downloads</p></details></details>';
    document.body.appendChild(root);
    const target = root.querySelector('#export-target'); target.scrollIntoView = () => {};
    expect(workspace.jump(root, '#export-target')).toBe(true);
    expect([...root.querySelectorAll('details')].every(detail => detail.open)).toBe(true);
    expect(document.activeElement).toBe(target);
    expect(workspace.jump(root, '#missing')).toBe(false);
    root.remove();
  });
});


describe('batch queue presentation', () => {
  const verified = { id: 'verified', status: 'done', result: { verificationState: 'complete', fullyVerifiedSuccess: true } };
  const partial = { id: 'partial', status: 'done', result: { verificationState: 'partial', afterScore: 100 } };
  const failed = { id: 'failed', status: 'failed', error: 'Original error' };
  const running = { id: 'running', status: 'processing' };
  it('counts completed processing without advancing for the last running file', () => {
    const model = workspace.batchModel([verified, failed, running]);
    expect(model.counts).toEqual({ all: 3, done: 1, pending: 1, failed: 1, review: 0 });
    expect(model.percent).toBeCloseTo(100 / 3);
    expect(workspace.batchModel([verified, { ...failed, status: 'processing' }, running]).percent).toBe(model.percent);
    expect(workspace.batchModel([verified]).percent).toBe(100);
  });
  it('filters retain original row identities and do not modify saved results or errors', () => {
    const queue = Object.freeze([Object.freeze(verified), Object.freeze(partial), Object.freeze(failed), Object.freeze(running)]);
    expect(workspace.batchModel(queue, 'failed').rows).toEqual([failed]);
    expect(workspace.batchModel(queue, 'failed').rows[0]).toBe(failed);
    expect(workspace.batchModel(queue, 'pending').rows).toEqual([running]);
    expect(workspace.batchModel(queue, 'done').rows).toEqual([verified, partial]);
    expect(queue[0].result.fullyVerifiedSuccess).toBe(true);
    expect(queue[2].error).toBe('Original error');
  });
  it('includes incomplete or expert-review evidence even when a score is 100', () => {
    const expert = { ...verified, id: 'expert', result: { ...verified.result, needsExpertReview: true } };
    const unknown = { id: 'unknown', status: 'done', result: { afterScore: 100 } };
    expect(workspace.batchModel([verified, partial, expert, unknown], 'review').rows).toEqual([partial, expert, unknown]);
    expect(workspace.state({ batchMode: true, batchSummary: { status: 'complete' }, queue: [unknown] }).tone).toBe('attention');
  });
  it('handles empty or sparse saved queues without an invalid percentage', () => {
    expect(workspace.batchModel(null)).toMatchObject({ rows: [], percent: 0 });
    const queue = [null, undefined, , { id: 'legacy' }, verified];
    expect(workspace.batchModel(queue, 'pending').rows).toEqual([{ id: 'legacy' }]);
    expect(workspace.batchModel(queue, 'invalid').counts.all).toBe(2);
    expect(workspace.state({ batchMode: true, queue }).detail).toBeTruthy();
  });
  it.each([
    { queue: [running], pending: 0 }, { queue: [verified], pending: 1 },
  ])('keeps unfinished work visible despite an older complete summary: %j', input => {
    expect(workspace.state({ batchMode: true, queue: input.queue, batchSummary: { status: 'complete', pending: input.pending } }))
      .toMatchObject({ title: 'Batch paused or interrupted', stage: 2, tone: 'attention' });
  });
  it('keeps a stop request in the working stage until the batch owner finishes', () => {
    expect(workspace.state({ batchMode: true, batchProcessing: true, batchStopping: true, queue: [running] }))
      .toMatchObject({ title: 'Stopping batch', stage: 2, tone: 'working', destination: null });
    expect(workspace.state({ batchMode: true, batchProcessing: false, batchStopping: true, batchSummary: { status: 'stopped' } }).title)
      .toBe('Batch paused or interrupted');
  });
});


describe('batch recovery and per-file review', () => {
  it('ignores recovery feedback from another document or an older run', () => {
    const current = { batchId: 'current', generation: 2, sequence: 5, documentEpoch: 4, documentEpochSource: 'host', checkpoint: 'saved' };
    expect(workspace.acceptRecovery(current, { ...current, sequence: 4, checkpoint: 'tab-only' }, 4, 1)).toBe(current);
    expect(workspace.acceptRecovery(current, { ...current, sequence: 6, documentEpoch: 3 }, 4, 1)).toBe(current);
    expect(workspace.acceptRecovery(current, { ...current, generation: 1, sequence: 99 }, 4, 1)).toBe(current);
    expect(workspace.acceptRecovery(current, { ...current, sequence: 6, checkpoint: 'tab-only' }, 4, 1).checkpoint).toBe('tab-only');
  });
  it('requires the current host generation for focused-batch recovery feedback', () => {
    const event = { batchId: 'focused', generation: 1, sequence: 1, documentEpoch: 1, documentEpochSource: 'batch', hostGeneration: 2 };
    expect(workspace.acceptRecovery(null, event, null, 3)).toBeNull();
    expect(workspace.acceptRecovery(null, event, null, 2)).toBe(event);
  });
  it.each([['preparing', 'Preparing batch'], ['saving', 'Saving batch checkpoint'], ['cooldown', 'Waiting before retry']])('explains the %s phase', (batchPhase, title) => {
    expect(workspace.state({ batchMode: true, batchProcessing: true, batchPhase }).title).toBe(title);
  });
  it('collects findings only from the selected result without interpreting HTML', () => {
    const item = { result: { verificationAudit: { issues: [{ issue: '<script>untrusted()</script>' }] }, axeAudit: { serious: [{ description: 'Missing image name' }] }, fidelityNotes: ['Table needs review'], needsExpertReview: true, expertReviewReason: 'Reading order' } };
    const snapshot = JSON.stringify(item);
    expect(workspace.batchFindings(item).map(item => item.text)).toEqual(['<script>untrusted()</script>', 'Missing image name', 'Table needs review', 'Reading order']);
    expect(JSON.stringify(item)).toBe(snapshot);
    expect(workspace.batchFindings({})).toEqual([]);
  });
});


it('includes production review findings, fidelity messages and readable expert reasons', () => {
  const item = { result: {
    axeAudit: { incomplete: [{ description: 'Contrast needs human review' }] },
    secondEngineAudit: { fails: [{ description: 'Missing table header' }], potentialFindings: [{ description: 'Check image meaning' }], manualFindings: [{ description: 'Check reading order' }] },
    fidelityNotes: [{ kind: 'numeric', msg: 'An equation may have changed' }],
    integrityWarning: 'Some original content needs comparison',
    needsExpertReview: true, expertReviewReason: 'both',
  } };
  expect(workspace.batchFindings(item).map(finding => finding.text)).toEqual([
    'Contrast needs human review', 'Missing table header', 'Check image meaning', 'Check reading order',
    'An equation may have changed', 'Some original content needs comparison',
    'Accessibility and content preservation need expert review.',
  ]);
});

describe('workspace queue and pacing explanations', () => {
  it.each([['pacing', 'Spacing AI requests'], ['queue', 'AI request queued']])('explains %s without implying a service failure', (reason, title) => {
    expect(workspace.state({ busy: true, progress: { status: 'running', wait: { reason }, activity: { message: 'Continuing automatically.' } } }))
      .toMatchObject({ title, detail: 'Continuing automatically.', tone: 'working' });
  });
  it('does not carry a previous wait into a later audit', () => {
    expect(workspace.state({ auditLoading: true, progress: { wait: { reason: 'pacing' } } }).title).toBe('Auditing document');
  });
});

it.each([
  ['pacing', 'Audit: spacing AI requests'], ['queue', 'Audit: AI request queued'], ['recovery', 'Audit: waiting for AI service'],
])('opening audit displays its own %s wait without using the last remediation status', (reason, title) => {
  expect(workspace.state({ auditLoading: true, auditWait: { reason }, progress: { status: 'complete' } })).toMatchObject({ stage: 1, title, tone: 'working' });
});


describe('contextual result next actions', () => {
  const result = { accessibleHtml: '<h1>Current output</h1>', afterScore: 100 };
  const evidence = { verification: { verificationState: 'review-required' }, allThreeComplete: true, totalEngineFindings: 0, reviewCount: 0, fullyVerifiedSuccess: false };
  const state = (input = {}) => workspace.state({ result, evidence, verdict: { level: 'review' }, ...input });
  const verificationDestination = '[data-help-key="pdf_audit_verification_status"]';

  it('prioritizes incomplete checks over repairs and human-review findings', () => {
    expect(state({ result: { ...result, fidelityLimited: true }, evidence: { ...evidence, allThreeComplete: false, totalEngineFindings: 2, reviewCount: 1 }, reviewFindingsAvailable: true }))
      .toMatchObject({ tone: 'attention', destination: verificationDestination, action: 'Review verification' });
  });
  it('uses canonical HTML-bound coverage despite a saved complete status and high score', () => {
    expect(state({ result: { ...result, verificationState: 'complete', fullyVerifiedSuccess: true }, evidence: { ...evidence, verification: { verificationState: 'partial' }, totalEngineFindings: 2 } }))
      .toMatchObject({ tone: 'attention', destination: verificationDestination, action: 'Review verification' });
  });
  it('prioritizes canonical stale-bound evidence over previously completed engines and review findings', () => {
    expect(state({ evidence: { ...evidence, verification: { verificationState: 'review-required', engineExecutionComplete: false }, totalEngineFindings: 2, reviewCount: 1 }, reviewFindingsAvailable: true }))
      .toMatchObject({ tone: 'attention', destination: verificationDestination, action: 'Review verification' });
  });
  it('takes completed checks with known failures to repair options before review-only findings', () => {
    expect(state({ evidence: { ...evidence, totalEngineFindings: 2, reviewCount: 1 }, reviewFindingsAvailable: true }))
      .toMatchObject({ destination: '#pdf-additional-repairs', action: 'Review repair options' });
  });
  it('takes human-review findings to their available queue without changing verification', () => {
    const original = JSON.stringify(evidence);
    const next = state({ evidence: { ...evidence, reviewCount: 1 }, reviewFindingsAvailable: true });
    expect(next).toMatchObject({ tone: 'attention', destination: '#pdf-review-findings', action: 'Review findings' });
    expect(next.detail).toContain('does not change the verification result');
    expect(JSON.stringify(evidence)).toBe(original);
  });
  it('does not navigate to an absent human-review queue', () => {
    expect(state({ evidence: { ...evidence, reviewCount: 1 }, reviewFindingsAvailable: false }))
      .toMatchObject({ destination: verificationDestination, action: 'Review verification' });
  });
  it('explains successful static-source coverage without claiming the live website was checked', () => {
    const next = state({ evidence: { ...evidence, verification: { verificationState: 'complete-for-tested-scope' } } });
    expect(next).toMatchObject({ tone: 'attention', destination: verificationDestination, action: 'Review tested scope' });
    expect(next.detail).toContain('Checks completed for the static source');
    expect(next.detail).toContain('Review live interactions');
  });
  it.each([
    { fidelityLimited: true }, { integrityWarning: 'Check missing content' }, { integrityCoverage: 82 },
    { fidelityNotes: [{ kind: 'numeric', msg: 'A value may have changed' }] },
    { needsExpertReview: true, expertReviewReason: 'content-fidelity' },
  ])('surfaces preservation review for an actual content concern: %j', concern => {
    expect(state({ result: { ...result, ...concern } }))
      .toMatchObject({ tone: 'attention', destination: '#pdf-content-fidelity-review', action: 'Review document preservation' });
  });
  it('does not turn safely rejected suggestions into a claim of damaged output', () => {
    expect(state({ result: { ...result, candidateRejectionCount: 3, preservationAcknowledgments: {} } }))
      .toMatchObject({ destination: verificationDestination, action: 'Review verification' });
  });
  it('does not navigate to preservation controls without an output to inspect', () => {
    expect(state({ result: { fidelityLimited: true } }).destination).toBe(verificationDestination);
  });
  it('keeps download readiness dependent on both canonical verification and the distribution verdict', () => {
    expect(state({ evidence: { ...evidence, fullyVerifiedSuccess: true }, verdict: { level: 'ready' } }))
      .toMatchObject({ tone: 'ready', destination: '#allo-sec-downloads', action: 'Go to downloads' });
    expect(state({ evidence: { ...evidence, fullyVerifiedSuccess: true }, verdict: { level: 'caution' } }).tone).toBe('attention');
  });
});
