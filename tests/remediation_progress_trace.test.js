import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeline = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('structured remediation progress', () => {
  it('emits a versioned, run-scoped event with terminal success and failure states', () => {
    expect(pipeline).toContain("new CustomEvent('alloflow:remediation-progress'");
    expect(pipeline).toContain("if (_activeRemediationProgress && runId && _activeRemediationProgress.runId !== runId) return;");
    expect(pipeline).toMatch(/status: 'complete'[\s\S]*?overallPercent: 100/);
    expect(pipeline).toMatch(/status: 'failed'[\s\S]*?Remediation stopped before completion/);
  });

  it('keeps the legacy progress callback while publishing structured detail', () => {
    expect(pipeline).toMatch(/const derived = _deriveProgress\(step, detail\);[\s\S]*?_emitRemediationProgress\(_runId/);
    expect(pipeline).toContain("if (_silentMode) { _onProgress(step, msg); } else { setPdfFixStep(msg); }");
  });

  it('shows truthful estimated progress and observable quota telemetry', () => {
    expect(view).toContain("% estimated");
    expect(view).toContain("Throttle signals");
    expect(view).toContain("Waiting safely:");
    expect(view).toContain("remediationProgress?.activity?.message");
  });
});

describe('safe live agent trace', () => {
  it('streams lifecycle metadata without placing unaccepted HTML in chunk-progress events', () => {
    const start = pipeline.indexOf('const emitChunkProgress =');
    const end = pipeline.indexOf('// Per-chunk SOURCE fingerprint', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const helper = pipeline.slice(start, end);
    expect(helper).toContain("new CustomEvent('alloflow:chunk-progress'");
    expect(helper).not.toMatch(/originalHtml|fixedHtml|innerHTML|dangerouslySetInnerHTML/);
  });

  it('traces validation before acceptance or fallback', () => {
    const rules = pipeline.indexOf("emitChunkProgress(chi, 'rules'");
    const integrity = pipeline.indexOf("emitChunkProgress(chi, 'integrity'");
    const verifying = pipeline.indexOf("emitChunkProgress(chi, 'verifying'");
    const scoring = pipeline.indexOf("emitChunkProgress(chi, 'scoring'");
    const accepted = pipeline.indexOf("emitChunkProgress(chi, accepted.usedOriginal");
    expect(rules).toBeGreaterThan(-1);
    expect(integrity).toBeGreaterThan(rules);
    expect(verifying).toBeGreaterThan(integrity);
    expect(scoring).toBeGreaterThan(verifying);
    expect(accepted).toBeGreaterThan(scoring);
  });

  it('copies an allowlisted metadata shape into UI trace state', () => {
    const start = view.indexOf('const appendTrace =');
    const end = view.indexOf('const onProgress =', start);
    const allowlist = view.slice(start, end);
    expect(allowlist).toContain("phase: String(detail.phase");
    expect(allowlist).toContain("label: String(detail.label");
    expect(allowlist).toContain("integrityPassed: detail.integrityPassed === true");
    expect(allowlist).not.toMatch(/originalHtml|fixedHtml|innerHTML|dangerouslySetInnerHTML/);
  });

  it('makes the trace opt-in and explains the isolation boundary', () => {
    expect(view).toContain("const [showAgentTrace, setShowAgentTrace] = useState(false)");
    expect(view).toContain("Show live agent trace");
    expect(view).toContain("Read-only safety view: intermediate AI HTML is isolated; code appears only after validation.");
    expect(view).toContain("Read-only agent trace");
  });
});