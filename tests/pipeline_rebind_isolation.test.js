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

// Steps 1-8 append their pins here as each migration lands:
// - per migrated function: sliceFn('const <name> = async') must contain zero bare
//   references to the legacy bound value names it used to read.
// - read-fresh EXEMPTIONS (deliberate, do not "fix"): window.__docPipelineState.pdfOcrLanguage
//   (mid-run OCR-language correction applies to later chunks by design) and the
//   _s().exportAuditResult duplicate-audit gate in updatePdfPreview.
