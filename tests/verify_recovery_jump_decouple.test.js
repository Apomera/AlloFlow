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

  it('still opens + scrolls a present anchor (the happy path is unchanged)', () => {
    expect(body).toContain("if (el.tagName === 'DETAILS') el.open = true;");
  });
});
