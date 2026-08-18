// The audit log is hash-chained: each row carries the previous row's hash and a
// hash of its own fields. That only makes it tamper-EVIDENT if something
// recomputes it, so these tests exercise verifyAuditChain() against a clean log
// and against each way the chain can break.
//
// Harness note: setSheetCell takes ZERO-based indices into the sheet's row
// array, so row index 1 is the first data row (spreadsheet row 2), and column
// index 3 is the summary while index 10 is the previous-hash link and 11 the
// row's own hash.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repositoryFixture, ADMIN, EVALUATOR, TEACHER_ONE } from './helpers/educator_evaluation_gs_harness.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const SUMMARY_COLUMN = 3;
const LINK_COLUMN = 10;
const HASH_COLUMN = 11;

// Produce genuine audit rows through the normal save path.
const withActivity = () => {
  const harness = repositoryFixture();
  const save = (email, mutate, mutation) => {
    harness.setActiveEmail(email);
    const boot = harness.invoke('bootstrap');
    mutate(boot.workspace);
    const result = harness.invoke('saveWorkspace', { expectedVersion: boot.revision, workspace: boot.workspace, mutation });
    expect(result.ok).toBe(true);
  };
  save(EVALUATOR, (workspace) => {
    workspace.walkthroughs.push({ id: 'walk-1', teacherId: 't1', date: '2026-08-09', evidence: 'Observed discourse.', interpretation: 'Anchor chart is working.', privacyChecked: true, publishedAt: '2026-08-09T15:00:00.000Z' });
  }, { teacherId: 't1', event: 'EVIDENCE_PUBLISHED', entityType: 'walkthrough', entityId: 'walk-1', version: 1 });
  save(TEACHER_ONE, (workspace) => {
    workspace.teachers.find((item) => item.id === 't1').educatorStatement = { text: 'My words.' };
  }, { teacherId: 't1', event: 'STATEMENT_SAVED', entityType: 'evaluation', entityId: 't1', version: 1 });
  return harness;
};

const verifyAs = (harness, email) => {
  harness.setActiveEmail(email);
  return harness.invoke('verifyAuditChain');
};

describe('audit chain verification', () => {
  it('verifies a chain written by the normal save path', () => {
    const harness = withActivity();
    const result = verifyAs(harness, ADMIN);
    expect(result.ok).toBe(true);
    expect(result.rows).toBeGreaterThan(1);
    expect(result.verified).toBe(result.rows);
  });

  it('detects a row edited in place after it was written', () => {
    const harness = withActivity();
    harness.setSheetCell('Audit', 2, SUMMARY_COLUMN, 'Summary rewritten after the fact');
    const result = verifyAs(harness, ADMIN);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('content');
    expect(result.brokenAtRow).toBe(3);
  });

  it('detects a forged hash that does not match its own row', () => {
    const harness = withActivity();
    harness.setSheetCell('Audit', 1, HASH_COLUMN, 'not-the-real-hash');
    const result = verifyAs(harness, ADMIN);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('content');
    expect(result.brokenAtRow).toBe(2);
  });

  it('detects a broken link, which is what a deleted or reordered row leaves behind', () => {
    const harness = withActivity();
    harness.setSheetCell('Audit', 2, LINK_COLUMN, 'GENESIS');
    const result = verifyAs(harness, ADMIN);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('link');
    expect(result.brokenAtRow).toBe(3);
  });

  it('reports positions and ids only, never the evaluation text of a row', () => {
    const harness = withActivity();
    harness.setSheetCell('Audit', 2, SUMMARY_COLUMN, 'CONFIDENTIAL-SUMMARY-TEXT');
    const result = verifyAs(harness, ADMIN);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('CONFIDENTIAL-SUMMARY-TEXT');
    expect(result.entryId).toBeTruthy();
  });

  it('reports the chain in the Setup health panel, so no script editor is needed', () => {
    const harness = withActivity();
    harness.setActiveEmail(ADMIN);
    const health = harness.invoke('getPortalSetupHealth');
    expect(health.ok).toBe(true);
    expect(health.checks.auditChainIntact).toBe(true);
    expect(health.checks.auditChainRows).toBeGreaterThan(1);
    expect(health.checks.auditChainBreakReason).toBe('');
    expect(health.checks.auditChainBrokenAtRow).toBe(0);
  });

  it('flags a tampered log in Setup health with the same verdict as the direct check', () => {
    const harness = withActivity();
    harness.setSheetCell('Audit', 2, SUMMARY_COLUMN, 'Rewritten');
    harness.setActiveEmail(ADMIN);
    const direct = harness.invoke('verifyAuditChain');
    const health = harness.invoke('getPortalSetupHealth');
    expect(direct.ok).toBe(false);
    expect(health.checks.auditChainIntact).toBe(false);
    // One implementation behind both entry points, so the verdicts cannot diverge.
    expect(health.checks.auditChainBrokenAtRow).toBe(direct.brokenAtRow);
    expect(health.checks.auditChainBreakReason).toBe(direct.reason);
  });

  it('still returns the rest of the health report when the audit sheet is unusable', () => {
    const harness = withActivity();
    harness.setActiveEmail(ADMIN);
    const health = harness.invoke('getPortalSetupHealth');
    // The other checks are present regardless of the audit outcome.
    expect(health.checks.allowedDomain).toBeTruthy();
    expect(typeof health.checks.repositoryFolderAccessible).toBe('boolean');
  });

  it('renders an audit row in the Setup health table', () => {
    const source = fs.readFileSync(path.join(ROOT, 'educator_evaluation_source.jsx'), 'utf8');
    expect(source).toContain("'Audit log integrity'");
    expect(source).toContain('checks.auditChainIntact');
    expect(source).toContain('a row was deleted, inserted, or reordered');
  });

  it('is administrator-only', () => {
    const harness = withActivity();
    for (const email of [EVALUATOR, TEACHER_ONE]) {
      harness.setActiveEmail(email);
      const error = harness.invokeError('verifyAuditChain');
      expect(error.code).toBe('denied');
    }
  });
});
