// Actual Workbench function bodies with injected transports/auditors; no generated build dependency.
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Review = require('../remediation_review_helpers.js');
const pipeline = fs.readFileSync(path.resolve('doc_pipeline_source.jsx'), 'utf8').replace(/\r\n/g, '\n');
const view = fs.readFileSync(path.resolve('view_pdf_audit_source.jsx'), 'utf8').replace(/\r\n/g, '\n');
function arrow(name) {
  const a = pipeline.indexOf('const ' + name + ' = '), b = pipeline.indexOf('\n  };', a);
  if (a < 0 || b < 0) throw new Error('Missing Workbench function: ' + name);
  return pipeline.slice(a, b + '\n  };'.length);
}
const functions = arrow('runAutonomousRemediation') + '\n' + arrow('processExpertCommand');
const ORIGINAL = '<html lang="en"><body><h1>Worksheet</h1><p>Preserved source content.</p></body></html>';
const RECORD = { chunkId: '1', phase: 'chunk', reason: 'image-reference-changed' };
function engine({ fix, score = () => 80, plan = () => 'malformed local plan' } = {}) {
  const audits = [], calls = [];
  const api = new Function('runAxeAudit', 'callGemini', 'aiFixChunked', `
    const SHARED_SURGICAL_TOOLS = {}, PIPELINE_DEFAULTS = { targetScore: 100 };
    const _usesLocalTextBackend = () => true, _neutralizePromptFence = s => s;
    const _emitLocalRemediationProgress = () => {}, warnLog = () => {};
    const _alloAxeWeightedScore = audit => audit.score;
    const runDeterministicWcagFixes = html => html;
    const _headingOutlineIssue = () => ({ missingH1: false, skip: false });
    ${functions}
    return { runAutonomousRemediation, processExpertCommand };
  `)(async html => { audits.push(html); return { score: score(html, audits.length), totalViolations: 1,
      critical: [], serious: [{ id: 'image-alt', description: 'Repair alternative text', nodes: 1 }], moderate: [] }; },
    vi.fn(async (...args) => plan(...args)),
    vi.fn(async (...args) => { calls.push(args); return fix ? fix(...args, calls.length) : args[0]; }));
  return { ...api, audits, calls };
}
afterEach(() => vi.restoreAllMocks());
describe('Workbench local fallback candidate evidence', () => {
  it('forwards onPassEvidence and retains reasons when the fallback returns unchanged HTML', async () => {
    const deltas = [];
    const h = engine({ fix: async (html, instructions, label, routing, control) => {
      expect(label).toBe('local-agent-fallback'); expect(control.onPassEvidence).toBeTypeOf('function');
      control.onPassEvidence({ candidateRejectionCount: 2, candidateRejections: [RECORD] }); return html;
    } });
    const result = await h.runAutonomousRemediation(ORIGINAL, { onPassEvidence: delta => deltas.push(delta) });
    expect(result.html).toBe(ORIGINAL); expect(h.calls).toHaveLength(1);
    expect(result.candidateRejectionCount).toBe(2);
    expect(result.candidateRejections).toEqual([{ pass: 1, ...RECORD }]);
    expect(deltas).toEqual([{ candidateRejectionCount: 2, candidateRejections: [{ pass: 1, ...RECORD }] }]);
  });
  it('keeps cumulative evidence across two passes when keep-best restores original HTML', async () => {
    const deltas = [];
    const first = ORIGINAL.replace('Worksheet', 'First candidate'), second = ORIGINAL.replace('Worksheet', 'Second candidate');
    const h = engine({ score: html => html === ORIGINAL ? 90 : html === first ? 80 : 70,
      fix: async (html, instructions, label, routing, control, call) => {
        control.onPassEvidence({ candidateRejectionCount: call + 1, candidateRejections: [{ ...RECORD, chunkId: String(call) }] });
        return call === 1 ? first : second;
      } });
    const result = await h.runAutonomousRemediation(ORIGINAL, { maxPasses: 2, onPassEvidence: delta => deltas.push(delta) });
    expect(h.calls).toHaveLength(2); expect(result.html).toBe(ORIGINAL); expect(result.score).toBe(90);
    expect(result.candidateRejectionCount).toBe(5);
    expect(result.candidateRejections).toEqual([{ pass: 1, ...RECORD }, { pass: 2, ...RECORD, chunkId: '2' }]);
    expect(deltas.map(delta => delta.candidateRejectionCount)).toEqual([2, 3]);
    expect(result.log.some(entry => /restoring the best verified version/.test(entry.text))).toBe(true);
  });
  it('caps stored records and both cumulative and callback counts', async () => {
    const deltas = [];
    const h = engine({ fix: async (html, instructions, label, routing, control) => {
      control.onPassEvidence({ candidateRejectionCount: 2000000,
        candidateRejections: Array.from({ length: 120 }, (_, i) => ({ ...RECORD, chunkId: String(i + 1), candidateHtml: 'must not persist' })) });
      return html;
    } });
    const result = await h.runAutonomousRemediation(ORIGINAL, { onPassEvidence: delta => deltas.push(delta) });
    expect(result.candidateRejectionCount).toBe(1000000); expect(result.candidateRejections).toHaveLength(100);
    expect(deltas[0].candidateRejectionCount).toBeLessThanOrEqual(1000000); expect(deltas[0].candidateRejections).toHaveLength(100);
    expect(result.candidateRejections.every(entry => !('candidateHtml' in entry))).toBe(true);
  });
  it('does not let a throwing observer interrupt fallback or erase its evidence', async () => {
    const h = engine({ fix: async (html, instructions, label, routing, control) => {
      control.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [RECORD] }); return html;
    } });
    const result = await h.runAutonomousRemediation(ORIGINAL, { onPassEvidence: () => { throw new Error('UI observer failed'); } });
    expect(result.html).toBe(ORIGINAL); expect(result.candidateRejectionCount).toBe(1);
    expect(result.candidateRejections).toEqual([{ pass: 1, ...RECORD }]);
  });
  it('retains prior callback evidence if the fallback subsequently throws', async () => {
    const h = engine({ fix: async (html, instructions, label, routing, control) => {
      control.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [RECORD] }); throw new Error('Transport stopped after a rejected attempt');
    } });
    const result = await h.runAutonomousRemediation(ORIGINAL, {});
    expect(result.html).toBe(ORIGINAL); expect(result.candidateRejectionCount).toBe(1);
  });
  it.each(['auto', 'auto-fix', 'agent'])('%s projects cumulative evidence once and forwards pass deltas', async command => {
    const observed = [];
    const h = engine({ fix: async (html, instructions, label, routing, control) => {
      control.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [RECORD] });
      control.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [{ ...RECORD, chunkId: '2' }] }); return html;
    } });
    const result = await h.processExpertCommand(command, ORIGINAL, { onPassEvidence: delta => observed.push(delta) });
    expect(result.type).toBe('agent'); expect(result.html).toBe(ORIGINAL);
    expect(observed).toHaveLength(2); expect(result.candidateRejectionCount).toBe(2); expect(result.candidateRejections).toHaveLength(2);
  });
  it('reports zero rejection evidence for an unchanged fallback with no rejected proposal', async () => {
    const h = engine(); const result = await h.processExpertCommand('auto', ORIGINAL, {});
    expect(result.candidateRejectionCount).toBe(0); expect(result.candidateRejections).toEqual([]);
  });
});
// Execute the real JSX event-handler body; injected services stand in for React and transport.
const workbenchAt = view.indexOf('{/* Expert Workbench — Advanced Remediation Command Bar');
const bodyAt = view.indexOf('onSubmit={async (e) => {', workbenchAt) + 'onSubmit={async (e) => {'.length;
const bodyEnd = view.indexOf('\n                        }}>', bodyAt);
if (workbenchAt < 0 || bodyAt < 24 || bodyEnd < 0) throw new Error('Missing Workbench submit handler');
const viewBody = view.slice(bodyAt, bodyEnd);
function host(run, { stale = false, reAuditThrows = false } = {}) {
  let current = { accessibleHtml: ORIGINAL, candidateRejectionCount: 3, candidateRejections: [{ pass: 1, ...RECORD }] };
  const initial = current, commits = [], attempted = [];
  const token = { html: ORIGINAL, documentEpoch: 1 };
  const deps = {
    expertCommandInput: 'auto', isAgentRunning: false, pdfFixResult: initial,
    _captureAsyncHtmlToken: () => token,
    setExpertCommandInput: () => {}, setIsAgentRunning: () => {}, setAgentActivityLog: () => {},
    addToast: () => {}, t: () => '',
    processExpertCommand: run,
    _commitAsyncHtmlIfCurrent: (actual, updater) => {
      attempted.push(actual); if (stale || current.accessibleHtml !== actual.html) return false;
      current = updater(current); commits.push(current); return true;
    },
    retireChunkState: () => ({ stale: false }),
    _reauditAndScore: async () => { if (reAuditThrows) throw new Error('Post-commit audit failed'); return { ok: true }; },
    window: { AlloModules: { RemediationReview: Review } },
    console: { info() {}, warn() {}, error() {} },
  };
  const invoke = new Function(...Object.keys(deps), 'return async (e) => {' + viewBody + '\n};')(...Object.values(deps));
  return { run: () => invoke({ preventDefault() {} }), get current() { return current; }, initial, commits, attempted, token };
}
function emitTwo(control) { for (let i = 1; i <= 2; i++) control.onPassEvidence({ candidateRejectionCount: 1, candidateRejections: [{ pass: 1, ...RECORD, chunkId: String(i) }] }); }
describe('Workbench view evidence commits from actual handler source', () => {
  it.each(['unchanged', 'changed'])('merges returned cumulative evidence once for %s HTML', async mode => {
    const h = host(async (cmd, html, controls) => {
      emitTwo(controls); return { html: mode === 'unchanged' ? html : html.replace('Worksheet', 'Improved worksheet'), score: 90,
        candidateRejectionCount: 2, candidateRejections: [{ pass: 1, ...RECORD }, { pass: 1, ...RECORD, chunkId: '2' }] };
    });
    await h.run(); expect(h.commits).toHaveLength(1); expect(h.current.candidateRejectionCount).toBe(5); expect(h.current.candidateRejections).toHaveLength(3);
    expect(h.attempted.every(token => token === h.token)).toBe(true);
  });
  it('commits callback deltas through the ownership guard when the command throws', async () => {
    const h = host(async (cmd, html, controls) => { emitTwo(controls); throw new Error('Command transport failed'); });
    await h.run(); expect(h.commits).toHaveLength(1); expect(h.current.accessibleHtml).toBe(ORIGINAL); expect(h.current.candidateRejectionCount).toBe(5);
    expect(h.attempted).toEqual([h.token]);
  });
  it.each(['unchanged', 'error'])('cannot attach %s command evidence to a stale result', async mode => {
    const h = host(async (cmd, html, controls) => { emitTwo(controls); if (mode === 'error') throw new Error('Failed stale command'); return { html }; }, { stale: true });
    await h.run(); expect(h.commits).toHaveLength(0); expect(h.current).toBe(h.initial);
    expect(h.attempted).toEqual([h.token]);
  });
  it('does not double-count evidence when a post-commit audit throws', async () => {
    const h = host(async (cmd, html, controls) => { emitTwo(controls); return { html: html.replace('Worksheet', 'Improved worksheet'),
      candidateRejectionCount: 2, candidateRejections: [{ pass: 1, ...RECORD }, { pass: 1, ...RECORD, chunkId: '2' }] }; }, { reAuditThrows: true });
    await h.run(); expect(h.commits).toHaveLength(1); expect(h.current.candidateRejectionCount).toBe(5);
    expect(h.attempted).toHaveLength(2);
  });
});
