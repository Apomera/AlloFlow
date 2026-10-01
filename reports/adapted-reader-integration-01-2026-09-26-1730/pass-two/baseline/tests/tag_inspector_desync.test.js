// ed-outline-desync (2026-06-15): the tag-inspector outline is a snapshot; a row's
// positional domIndex desyncs after any preview insert/move/delete, so a row action
// (re-tag / decorative / table-header / move) would silently hit the WRONG element and
// corrupt reading order. The fix makes _editTagAt fail-closed: it takes the snapshot
// row, and before mutating verifies the live element still matches the row's identity
// (PDF role + leading text); on mismatch it rebuilds the outline + toasts instead of
// mutating. The guard lives in a React closure (not extractable), so we anti-drift-guard
// the shipped source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('ed-outline-desync — fail-closed identity guard in _editTagAt', () => {
  it('_editTagAt takes the row (not a bare index) and derives domIndex from it', () => {
    expect(src).toContain('const _editTagAt = (row, mutate) => {');
    expect(src).toContain("const domIndex = row && typeof row === 'object' ? row.domIndex : row;");
  });

  it('verifies live role + leading text against the snapshot row before mutating', () => {
    expect(src).toContain('if (_liveRole !== row.role || !_txtOk) {');
    expect(src).toContain('setTagOutline(_buildTagOutline(srcHtml))'); // rebuild on desync
    expect(src).toContain("'pdf_audit.taginspect.desync'");            // honest toast
  });

  it('every tag-inspector row action passes the row object n (not n.domIndex)', () => {
    // the desync bug only closes if the callers thread `n`, enabling the guard
    expect(src).not.toMatch(/_editTagAt\(n\.domIndex/);
    // sanity: the row-action call sites exist and pass `n`
    expect((src.match(/_editTagAt\(n,/g) || []).length).toBeGreaterThanOrEqual(6);
  });
});
