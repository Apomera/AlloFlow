// Phase B (teacher-facing) — the export preview's opt-in "Run WCAG Audit" must run BOTH
// deterministic engines (axe-core + IBM Equal Access), the same two-engine consensus the
// PDF-remediation pipeline uses. The 2nd engine is borrowed from the doc-pipeline factory at
// click time (the audit engines use window/document/fetch, not the AI deps), cached on
// window.__alloAuditPipeline. This test locks (a) that borrow contract and (b) that the
// consensus + honesty surfacing ships in the COMPILED module — so a future refactor of the
// exposed pipeline API, or of the view render, can't silently drop the second engine or the
// "automation ≠ conformance" disclosure.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let moduleSrc;

beforeAll(() => {
  // The view module destructures React off window at load time — give it a minimal stand-in.
  window.React = window.React || {
    createElement: () => null, Fragment: 'Fragment',
    useState: () => [null, () => {}], useMemo: (f) => f(), useCallback: (f) => f,
    useRef: () => ({ current: null }), useEffect: () => {},
  };
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('view_export_preview_module.js');
  moduleSrc = readFileSync('view_export_preview_module.js', 'utf-8');
});

describe('Export preview · two-engine deterministic consensus (Phase B, teacher-facing)', () => {
  it('the export-preview module loads and registers ExportPreviewView', () => {
    expect(typeof window.AlloModules.ExportPreviewView).toBe('function');
  });

  it('the 2nd engine is borrowable from the doc-pipeline factory (the contract the audit relies on)', () => {
    const mk = window.AlloModules.createDocPipeline;
    expect(typeof mk).toBe('function');
    const inst = mk({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: (k) => k, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => '',
    });
    // axe was already wired into the export audit; IBM Equal Access is the engine this change adds.
    expect(typeof inst.runAxeAudit).toBe('function');
    expect(typeof inst.runEqualAccessAudit).toBe('function');
  });

  it('the compiled module wires IBM Equal Access into the audit onClick', () => {
    // borrow + cache + run, then merge into the result object the report reads
    expect(moduleSrc).toContain('window.__alloAuditPipeline');
    expect(moduleSrc).toContain('runEqualAccessAudit');
    expect(moduleSrc).toContain('combined.eaViolations');
    expect(moduleSrc).toContain('deterministicConsensus');
  });

  it('the report surfaces the consensus AND an honest automation-≠-conformance disclosure', () => {
    expect(moduleSrc).toContain('Two independent rule engines agree');
    expect(moduleSrc).toContain('IBM Equal Access');
    expect(moduleSrc).toMatch(/confirm full WCAG 2\.2 AA conformance/);
    expect(moduleSrc).toContain('a guide, not a certification');
  });
});
