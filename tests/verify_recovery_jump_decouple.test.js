// Verify/Recovery dashboard chips dead-ending on a 2nd pass (#3, 2026-06-17). The chips jump to DOM
// anchors (#allo-sec-verify / #allo-sec-recovery) that only render from a FULL audit's integrity/
// recovery data. An incremental Additional Sweep / Fix Remaining (or the section-review flow) commits
// new HTML via commitOrRevertPdfFix WITHOUT regenerating that data, so for those flows the anchor is
// absent and _jump used to fire a bare "nothing to show" toast — a confusing dead-end. Safe-first fix:
// _jump now explains honestly (the report comes from a full audit; run a fresh one to refresh it) and
// scrolls the user to the always-present Downloads section instead of stranding them. (The deeper
// recompute-on-incremental-pass is a deferred follow-up touching the host commit path.)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('#3 _jump no longer dead-ends on a missing Verify/Recovery anchor', () => {
  const i = view.indexOf('const _jump = (id) => {');
  const body = view.slice(i, i + 2100);

  it('gives a specific honest explanation for verify/recovery (not a bare "nothing to show")', () => {
    expect(body).toContain("'allo-sec-verify':");
    expect(body).toContain("'allo-sec-recovery':");
    expect(body).toContain('is produced by a full audit');
    expect(body).toContain('section_from_full_audit'); // dedicated i18n key
  });

  it('lands the user on the always-present Downloads section instead of stranding them', () => {
    expect(body).toContain("document.getElementById('allo-sec-downloads')");
    expect(body).toContain("scrollIntoView({ behavior: 'smooth', block: 'start' })");
  });

  // b4d7ed714 (2026-09-13): a present anchor goes through the shared workspace jump, which opens
  // every enclosing disclosure (not only the target) before scrolling. Run it.
  it('still opens + scrolls a present anchor (the happy path is unchanged)', () => {
    expect(body).toContain("_pdfWorkspaceJump(pdfModalRef.current, '#' + id);");
    const ws = readFileSync(resolve(process.cwd(), 'remediation_workspace_component.jsx'), 'utf8');
    const start = ws.indexOf('function _pdfWorkspaceJump(root, selector) {');
    expect(start).toBeGreaterThan(-1);
    const jump = new Function(ws.slice(start, ws.indexOf('\nfunction ', start + 1)) + '\nreturn _pdfWorkspaceJump;')();
    const root = document.createElement('div');
    root.innerHTML = '<details id="outer"><summary>Results</summary><details id="allo-sec-verify"><summary>Verify</summary><p>Report</p></details></details>';
    document.body.append(root);
    const scrolled = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function () { scrolled.push(this.id); };
    try {
      expect(jump(root, '#allo-sec-verify')).toBe(true);
      expect(root.querySelector('#allo-sec-verify').open).toBe(true);
      expect(root.querySelector('#outer').open).toBe(true);
      expect(scrolled).toEqual(['allo-sec-verify']);
      expect(jump(root, '#allo-sec-recovery')).toBe(false);
    } finally { Element.prototype.scrollIntoView = original; root.remove(); }
  });
});
