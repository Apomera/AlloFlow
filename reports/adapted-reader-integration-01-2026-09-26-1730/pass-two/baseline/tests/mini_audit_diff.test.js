// Workbench mini-audit (2026-06-16): a single manual Workbench fix now self-verifies — re-audit the
// document with axe BEFORE vs AFTER, classify which rules improved (resolved) and which regressed
// (introduced), and surface a verdict + one-click Revert. This brings the manual path up to the
// auto-loop's accept-or-revert discipline. _diffAxeForMiniAudit is the pure classifier; extract +
// exercise its verdict logic against synthetic axe results. Key rule: 'regressed' beats 'improved'
// (any newly introduced violation is the actionable signal), and axe verifies STRUCTURE not MEANING
// (so 'no-change' means "axe can't see a difference", which may be a semantic fix).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('function _diffAxeForMiniAudit(beforeAxe, afterAxe) {');
const end = src.indexOf('\n}', start);
if (start === -1 || end === -1) throw new Error('extraction markers for _diffAxeForMiniAudit missing');
const { _diffAxeForMiniAudit } = new Function(src.slice(start, end + 2) + '\n; return { _diffAxeForMiniAudit };')();

// Minimal axe-result shape: { totalViolations, critical/serious/moderate/minor: [{id, description, nodes, wcag}] }
const axe = (total, buckets) => ({ totalViolations: total, critical: buckets.critical || [], serious: buckets.serious || [], moderate: buckets.moderate || [], minor: buckets.minor || [] });
const v = (id, nodes) => ({ id, description: id + ' help', nodes, wcag: 'wcag2a' });

describe('_diffAxeForMiniAudit — verdict classification', () => {
  it('improved: a rule went away → verdict improved, rule listed as resolved, none introduced', () => {
    const before = axe(2, { serious: [v('table-fake-caption', 1)], moderate: [v('scope-attr-valid', 1)] });
    const after = axe(1, { moderate: [v('scope-attr-valid', 1)] }); // caption rule resolved
    const d = _diffAxeForMiniAudit(before, after);
    expect(d.verdict).toBe('improved');
    expect(d.resolved.map(r => r.id)).toContain('table-fake-caption');
    expect(d.introduced).toHaveLength(0);
    expect(d.beforeTotal).toBe(2);
    expect(d.afterTotal).toBe(1);
  });

  it('regressed: a NEW rule appeared → verdict regressed even if total dropped, with introduced listed', () => {
    const before = axe(3, { serious: [v('color-contrast', 3)] });
    const after = axe(2, { serious: [v('color-contrast', 1)], minor: [v('empty-heading', 1)] }); // fewer contrast, but a NEW rule
    const d = _diffAxeForMiniAudit(before, after);
    expect(d.verdict).toBe('regressed');
    expect(d.introduced.map(x => x.id)).toContain('empty-heading');
    expect(d.resolved.map(x => x.id)).toContain('color-contrast'); // contrast count fell → also resolved
  });

  it('regressed wins when one rule resolves and another is introduced (net total flat)', () => {
    const before = axe(1, { moderate: [v('a', 1)] });
    const after = axe(1, { moderate: [v('b', 1)] }); // a gone, b new
    const d = _diffAxeForMiniAudit(before, after);
    expect(d.verdict).toBe('regressed');
    expect(d.resolved.map(x => x.id)).toEqual(['a']);
    expect(d.introduced.map(x => x.id)).toEqual(['b']);
  });

  it('no-change: identical audits → no-change (axe sees nothing; may be a semantic-only fix)', () => {
    const same = axe(1, { serious: [v('link-name', 2)] });
    const d = _diffAxeForMiniAudit(same, JSON.parse(JSON.stringify(same)));
    expect(d.verdict).toBe('no-change');
    expect(d.resolved).toHaveLength(0);
    expect(d.introduced).toHaveLength(0);
  });

  it('counts by node count, and an INCREASE in an existing rule counts as introduced (regression)', () => {
    const before = axe(1, { serious: [v('image-alt', 1)] });
    const after = axe(3, { serious: [v('image-alt', 3)] }); // same rule, more violating nodes
    const d = _diffAxeForMiniAudit(before, after);
    expect(d.verdict).toBe('regressed');
    expect(d.introduced.find(x => x.id === 'image-alt').delta).toBe(2);
  });

  it('falls back to summed node counts when totalViolations is absent', () => {
    const before = { critical: [v('x', 2)], serious: [v('y', 1)] }; // no totalViolations field
    const after = { serious: [v('y', 1)] };
    const d = _diffAxeForMiniAudit(before, after);
    expect(d.beforeTotal).toBe(3);
    expect(d.afterTotal).toBe(1);
    expect(d.verdict).toBe('improved');
  });

  it('is robust to null / empty audits (never throws)', () => {
    expect(() => _diffAxeForMiniAudit(null, null)).not.toThrow();
    const d = _diffAxeForMiniAudit({}, {});
    expect(d.verdict).toBe('no-change');
    expect(d.beforeTotal).toBe(0);
  });
});

describe('anti-drift: the mini-audit is wired into the manual paths + UI', () => {
  it('_miniAuditFix exists and runs axe before/after via runAxeAudit', () => {
    expect(src).toContain('const _miniAuditFix = async (beforeHtml, afterHtml, onActivity, ts) =>');
    expect(src).toContain('Promise.all([runAxeAudit(beforeHtml), runAxeAudit(afterHtml)])');
    expect(src).toContain('var d = _diffAxeForMiniAudit(beforeAxe, afterAxe);');
  });
  it('both manual fix paths (AI-interpreted + contrast) return miniAudit', () => {
    // the command path also returns tableReadback (table-refinement slice 1) — miniAudit unchanged
    expect(src).toContain('miniAudit: cmdAudit, tableReadback: tableReadback }');
    expect(src).toContain('return { type: \'fix\', html: fixed, miniAudit: contrastAudit }');
  });
  it('fail-safe: a fix with no HTML change returns null (nothing to verify), axe failure returns ran:false', () => {
    expect(src).toContain('if (!afterHtml || afterHtml === beforeHtml) return null;');
    expect(src).toContain('var _na = { ran: false }; return _na;');
  });
  it('the Workbench UI snapshots before-HTML, stores the verdict, and offers Revert', () => {
    const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
    expect(view).toContain('_preCmdHtml: _preCmdHtml');
    expect(view).toContain('_lastMiniAudit: result.miniAudit || null');
    expect(view).toContain("pdfFixResult._lastMiniAudit.verdict === 'regressed'");
    expect(view).toContain('accessibleHtml: p._preCmdHtml, _preCmdHtml: null');
  });
});
