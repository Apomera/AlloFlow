import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { inspectPacket, planDigest, AREAS } = require('../dev-tools/security/check_mailbox_deletion_receipt.cjs');
const copy = x => JSON.parse(JSON.stringify(x));

function packet() {
  const plan = { kind: 'alloflow-mailbox-deletion-plan', version: 1, requestRef: 'synthetic_request_001',
    scope: { accountRef: 'school_account_reference', scriptId: 'synthetic_script_id', mailboxFolderId: 'synthetic_mailbox_folder', deliveryFolderId: 'synthetic_delivery_folder' },
    reviewedAt: '2026-10-24T19:00:00Z', resources: [
      { ref: 'submission_001', type: 'submission', id: 'synthetic_drive_file_id', parentId: 'synthetic_mailbox_folder', modifiedAt: '2026-10-23T18:00:00Z', hold: 'clear', action: 'permanent-delete' },
      { ref: 'session_001', type: 'live-session', id: 'ABC23', parentId: null, modifiedAt: null, hold: 'clear', action: 'end-session' },
    ] };
  const receipt = { kind: 'alloflow-mailbox-deletion-receipt', version: 1, requestRef: plan.requestRef, scope: copy(plan.scope), planSha256: planDigest(plan),
    outcomes: [
      { ref: 'submission_001', state: 'permanent-delete-confirmed', checkedAt: '2026-10-24T19:05:00Z', beforeModifiedAt: plan.resources[0].modifiedAt },
      { ref: 'session_001', state: 'session-ended', checkedAt: '2026-10-24T19:05:00Z', beforeModifiedAt: null },
    ], externalReviews: AREAS.map(area => ({ area, state: 'reviewed-no-copy', checkedAt: '2026-10-24T19:10:00Z' })) };
  return { plan, receipt, rebind() { receipt.planSha256 = planDigest(plan); } };
}

describe('offline mailbox deletion evidence review', () => {
  it('reviews exact-scope operator observations without claiming provider purge or all copies deleted', () => {
    const { plan, receipt } = packet();
    const result = inspectPacket(plan, receipt);
    expect(result).toMatchObject({ evidenceStatus: 'review-complete', providerPurgeVerified: false, allCopiesDeleted: false, counts: { permanentlyDeletedReported: 1, sessionsEndedReported: 1 } });
    expect(JSON.stringify(result)).not.toContain(plan.resources[0].id);
    expect(JSON.stringify(result)).not.toContain(plan.scope.accountRef);
  });
  it('does not count trash as permanent deletion', () => {
    const f = packet(); f.plan.resources[0].action = 'trash'; f.rebind(); f.receipt.outcomes[0].state = 'trashed';
    expect(inspectPacket(f.plan, f.receipt)).toMatchObject({ evidenceStatus: 'review-complete', permanentDeletionOfTrashedFilesEstablished: false, counts: { trashed: 1, permanentlyDeletedReported: 0 } });
    f.receipt.outcomes[0].state = 'permanent-delete-confirmed';
    expect(() => inspectPacket(f.plan, f.receipt)).toThrow();
  });
  it('binds the receipt to the exact reviewed plan, independent of object key order', () => {
    const f = packet(), reordered = Object.fromEntries(Object.entries(f.plan).reverse());
    expect(planDigest(reordered)).toBe(planDigest(f.plan));
    f.plan.resources[0].id = 'another_file_id';
    expect(() => inspectPacket(f.plan, f.receipt)).toThrow();
  });
  it.each(['held', 'unknown'])('refuses deletion plans for %s hold status', hold => {
    const f = packet(); f.plan.resources[0].hold = hold;
    expect(() => planDigest(f.plan)).toThrow();
  });
  it('records retained held material without calling it deleted', () => {
    const f = packet(); f.plan.resources[0].hold = 'held'; f.plan.resources[0].action = 'retain'; f.rebind(); f.receipt.outcomes[0].state = 'retained';
    expect(inspectPacket(f.plan, f.receipt)).toMatchObject({ evidenceStatus: 'review-complete', allCopiesDeleted: false, counts: { retained: 1 } });
    f.receipt.outcomes[0].state = 'permanent-delete-confirmed';
    expect(() => inspectPacket(f.plan, f.receipt)).toThrow();
  });
  it('keeps unknown hold review incomplete even when the item was retained', () => {
    const f = packet(); f.plan.resources[0].hold = 'unknown'; f.plan.resources[0].action = 'retain'; f.rebind(); f.receipt.outcomes[0].state = 'retained';
    expect(inspectPacket(f.plan, f.receipt)).toMatchObject({ evidenceStatus: 'incomplete', counts: { unknownHold: 1 } });
  });
  it.each(['studentName', 'adminToken', 'payload', 'joinSecret'])('rejects an accidental sensitive %s field', field => {
    const f = packet(); f.plan.resources[0][field] = 'SYNTHETIC_PRIVATE_CANARY';
    expect(() => planDigest(f.plan)).toThrow();
  });
  it('rejects cross-folder, cross-account and cross-script scope changes', () => {
    for (const target of ['accountRef', 'scriptId']) { const f = packet(); f.receipt.scope[target] = 'other_scope'; expect(() => inspectPacket(f.plan, f.receipt)).toThrow(); }
    const f = packet(); f.plan.resources[0].parentId = f.plan.scope.deliveryFolderId;
    expect(() => planDigest(f.plan)).toThrow();
  });
  it('rejects duplicate identities even when a file is mislabeled as two types', () => {
    const f = packet(); f.plan.resources.push({ ...f.plan.resources[0], ref: 'different_ref', type: 'pack-chunk' });
    expect(() => planDigest(f.plan)).toThrow();
  });
  it('requires a new review when modification metadata changed', () => {
    const f = packet(); f.receipt.outcomes[0].beforeModifiedAt = '2026-10-24T18:30:00Z';
    expect(() => inspectPacket(f.plan, f.receipt)).toThrow();
    f.receipt.outcomes[0].state = 'changed';
    expect(inspectPacket(f.plan, f.receipt)).toMatchObject({ evidenceStatus: 'incomplete', counts: { changed: 1 } });
  });
  it('reports missing, failed and pending outcomes as incomplete', () => {
    for (const state of ['pending', 'failed']) { const f = packet(); f.receipt.outcomes[0].state = state; expect(inspectPacket(f.plan, f.receipt).evidenceStatus).toBe('incomplete'); }
    const f = packet(); f.receipt.outcomes.pop();
    expect(inspectPacket(f.plan, f.receipt)).toMatchObject({ evidenceStatus: 'incomplete', counts: { pending: 1 } });
  });
  it('rejects duplicate or extra outcomes and observations predating the plan', () => {
    const f = packet(); f.receipt.outcomes.push(copy(f.receipt.outcomes[0])); expect(() => inspectPacket(f.plan, f.receipt)).toThrow();
    f.receipt.outcomes.pop(); f.receipt.outcomes[0].ref = 'unreviewed_resource'; expect(() => inspectPacket(f.plan, f.receipt)).toThrow();
    const old = packet(); old.receipt.outcomes[0].checkedAt = '2026-10-23T12:00:00Z'; expect(() => inspectPacket(old.plan, old.receipt)).toThrow();
  });
  it('requires all external-copy areas and distinguishes retained material from outstanding deletion', () => {
    const f = packet(); f.receipt.externalReviews[0].state = 'pending';
    expect(inspectPacket(f.plan, f.receipt)).toMatchObject({ evidenceStatus: 'incomplete', externalOutstanding: 1 });
    f.receipt.externalReviews[0].state = 'retained-under-policy';
    expect(inspectPacket(f.plan, f.receipt)).toMatchObject({ evidenceStatus: 'review-complete', externalRetained: 1, allCopiesDeleted: false });
    f.receipt.externalReviews.pop(); expect(() => inspectPacket(f.plan, f.receipt)).toThrow();
  });
  it('keeps CLI exit states and diagnostics free of input content', () => {
    const directory = fs.mkdtempSync(path.resolve('tmp/mailbox-retention-20261024/receipt-'));
    const planFile = path.join(directory, 'plan.json'), receiptFile = path.join(directory, 'receipt.json');
    const run = () => spawnSync(process.execPath, ['dev-tools/security/check_mailbox_deletion_receipt.cjs', planFile, receiptFile], { encoding: 'utf8', timeout: 15000 });
    try {
      const f = packet(); fs.writeFileSync(planFile, JSON.stringify(f.plan)); fs.writeFileSync(receiptFile, JSON.stringify(f.receipt));
      expect(run().status).toBe(0);
      f.receipt.outcomes[0].state = 'pending'; fs.writeFileSync(receiptFile, JSON.stringify(f.receipt)); expect(run().status).toBe(1);
      f.plan.resources[0].studentName = 'SYNTHETIC_SECRET_MUST_NOT_PRINT'; fs.writeFileSync(planFile, JSON.stringify(f.plan));
      const bad = run(); expect(bad.status).toBe(2); expect(bad.stderr + bad.stdout).not.toContain('SYNTHETIC_SECRET_MUST_NOT_PRINT');
    } finally { fs.unlinkSync(planFile); fs.unlinkSync(receiptFile); fs.rmdirSync(directory); }
  });
});
