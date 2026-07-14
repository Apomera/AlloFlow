// Export-format review ROUND 2 (2026-07-13) — regression locks.
// Deep-dive across every export type surfaced a cluster of defects; these tests
// pin the fixes to the SOURCE (and, where a lane ships a compiled module, that
// the old-and-busted form is gone from it too) so a future edit or a concurrent
// shared-tree sweep can't silently regress them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const R = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const viewAudit = R('view_pdf_audit_source.jsx');
const viewAuditMod = R('view_pdf_audit_module.js');

describe('plain-language summary popup — XSS + language hardening (R2 #1/#2)', () => {
  it('escapes the model summary before it enters the same-origin popup document', () => {
    // A local escaper is defined and the summary is run through it BEFORE the
    // plain-text -> HTML structure transform, so injected markup is inert.
    expect(viewAudit).toMatch(/const _escSum = \(s\) =>[^\n]*replace\(\/&\/g, '&amp;'\)/);
    expect(viewAudit).toMatch(/const _summaryHtml = _escSum\(summary\)/);
  });

  it('escapes the user-controlled filename in the footer', () => {
    expect(viewAudit).toMatch(/const _safeName = _escSum\(pendingPdfFile\?\.name \|\| 'document'\)/);
  });

  it('resolves a real BCP-47 subtag instead of slicing the language NAME', () => {
    // The old bug: lang.substring(0,2) turned "Spanish" -> "sp", "Dari" -> "da".
    expect(viewAudit).not.toMatch(/lang\.substring\(0\s*,\s*2\)/);
    expect(viewAudit).toMatch(/languageToTTSCode\(lang\)/);
    // Absent beats wrong: no lang attribute when the code can't be resolved.
    expect(viewAudit).toMatch(/const _langAttr = _langCode \? ` lang="\$\{_langCode\}"` : ''/);
  });

  it('derives RTL from the resolved code the way the export spec does (not a 6-name list)', () => {
    expect(viewAudit).toMatch(/\/\^\(ar\|he\|iw\|fa\|ur\|ps\|sd\|ug\|yi\|dv\|ckb\)\(\[-_\]\|\$\)\/i\.test\(_langCode\)/);
  });

  it('the compiled module carries the same fix (old slice form is gone)', () => {
    expect(viewAuditMod).not.toMatch(/lang\.substring\(0,\s*2\)/);
    expect(viewAuditMod).toMatch(/const _summaryHtml = _escSum\(summary\)/);
  });
});
