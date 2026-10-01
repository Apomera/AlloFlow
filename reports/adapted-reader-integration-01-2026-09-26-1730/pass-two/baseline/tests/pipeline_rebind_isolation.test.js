// S1 (deep dive 2026-07-02): rebind-isolation pins.
// The doc pipeline's _bindState() copies window.__docPipelineState into shared factory-level
// vars at every public-call entry, with no rebind after `await` — so a call entering while an
// async run is awaiting used to clobber the run's state mid-flight. S1 migrates the async
// paths to a per-run snapshot (_makeRunCtx). This file pins each completed step so the
// hazard can't silently regrow. Pattern follows tests/pdf_remediation_reentry.test.js
// (readFileSync + function-slice assertions).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(path.join(path.resolve(__dirname, '..'), 'doc_pipeline_source.jsx'), 'utf8');

// Slice a function body: from its declaration to the next top-level `  const ` at the same
// factory indent (2 spaces). Coarse but stable — the same approach the reentry test uses.
function sliceFn(decl) {
  const start = src.indexOf(decl);
  expect(start, `declaration not found: ${decl}`).toBeGreaterThan(-1);
  const rest = src.slice(start + decl.length);
  const end = rest.search(/\n  (const|var|function) /);
  return rest.slice(0, end === -1 ? undefined : end);
}

describe('S1 step 0: dead bindings stay dead', () => {
  const bindBody = (() => {
    const start = src.indexOf('var _bindState = function() {');
    return src.slice(start, src.indexOf('};', start));
  })();
  const DEAD = ['projectName', 'pdfFixModeRef', 'inputText', 'gradeLevel', 'studentNickname',
    'isTeacherMode', 'generatedContent', 'exportPreviewMode', 'pdfExperimentMode',
    'pdfExperimentRuns', 'history', 'responses'];
  it('none of the 12 deleted names reappears in _bindState', () => {
    for (const name of DEAD) {
      expect(bindBody.includes('s.' + name), `s.${name} rebound`).toBe(false);
    }
  });
  it('_bindState assignment count is pinned (grow it deliberately, not by drift)', () => {
    const count = (bindBody.match(/= s\./g) || []).length;
    expect(count).toBe(44); // 24 values/refs + 20 setters after the step-0 deletion
  });
});

// Bare-identifier check with comments stripped (our own migration comments name the
// legacy vars; only CODE references count).
function bareRefs(slice, name) {
  const noComments = slice.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  // Excludes property access (.name), string content, and object-KEY position (name:) —
  // `{ pdfAuditorCount: _run.auditorCount }` is a snapshot being BUILT, not a read.
  return (noComments.match(new RegExp("(?<![.\\w'\"])" + name + "\\b(?!\\s*:)", 'g')) || []).length;
}

describe('S1 steps 1-8: migrated async runs read their snapshot, never the shared bound vars', () => {
  // function declaration → legacy bound VALUE names it used to read mid-run
  const PINS = [
    ['const generateCustomExportStyle = async', ['exportStylePrompt']],
    ['const proceedWithPdfTransform = async', ['pendingPdfBase64', 'pendingPdfFile']],
    ['const runPdfAccessibilityAudit = async', ['pdfAuditorCount', 'leveledTextLanguage', 'pendingPdfFile', 'pendingPdfBase64']],
    ['const autoFixAxeViolations = async', ['pendingPdfFile', 'pendingPdfBase64']],
    ['const fixAndVerifyPdf = async', ['pendingPdfBase64', 'pendingPdfFile', 'pdfAuditResult', 'pdfPolishPasses', 'pdfTargetScore', 'pdfAutoFixPasses']],
    ['const _runMainFixLoop = async', ['pdfTargetScore', 'pdfAutoFixPasses']],
    ['const runPdfBatchRemediation = async', ['pdfAuditorCount', 'leveledTextLanguage', 'pdfTargetScore', 'pdfAutoFixPasses', 'pdfPolishPasses', 'pdfBatchQueue', 'pdfBatchSummary']],
    ['const downloadBatchResults = async', ['pdfBatchQueue', 'pdfBatchSummary', 'pdfAuditorCount', 'pdfAutoFixPasses', 'pdfPolishPasses']],
  ];
  for (const [decl, names] of PINS) {
    it(`${decl.replace('const ', '').replace(' = async', '')} has zero legacy bound-value reads`, () => {
      const body = sliceFn(decl);
      for (const name of names) {
        expect(bareRefs(body, name), `${name} read inside ${decl}`).toBe(0);
      }
    });
  }
  it('the restoration flow passes its HTML explicitly (no module-var patch, no bare re-render)', () => {
    const body = sliceFn('const applyWordRestorationInPlace = ');
    expect(body.includes('sourceHtml: _restoredHtml')).toBe(true);
    expect(/pdfFixResult\s*=\s*\{/.test(body.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n'))).toBe(false);
  });
  it('read-fresh exemptions stay: pdfOcrLanguage + the exportAuditResult gate (deliberate)', () => {
    // These are DESIGN decisions, not drift — pdfOcrLanguage applies mid-run corrections to
    // later OCR chunks; the _s().exportAuditResult read gates duplicate auto-audits against
    // CURRENT state. If either disappears, someone "fixed" them — check the S1 plan first.
    expect(src.includes('.pdfOcrLanguage')).toBe(true);
    expect(src.includes('_s().exportAuditResult')).toBe(true);
  });
});
