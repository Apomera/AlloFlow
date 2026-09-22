// Single-use claim codes (printed QR) for School Rewards (2026-09-22).
//
// A code carries only its token id. The signed-in student supplies the identity;
// the ClaimTokens row supplies the points, category and reason. The token id is
// the idempotency key, so a double scan, a crash between ledger and token row,
// and a second student all resolve to exactly one ledger entry.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { harness, setup, seededCategory, ADMIN, STAFF, CASHIER, STUDENT, DOMAIN } from './helpers/school_rewards_repository.js';

function mint(h, overrides = {}) {
  h.setActive(STAFF);
  const category = seededCategory(h);
  return h.call('mintSchoolRewardsClaimTokens', { count: 3, points: 20, categoryId: category.id, reason: 'Read 20 minutes at home', ...overrides });
}
function addStudent(h, n) {
  h.setActive(ADMIN);
  return h.call('adminUpsertRewardsStudent', { firstName: 'Fictional' + n, lastInitial: 'T', grade: '5', homeroom: '5B', email: 'fictional' + n + '@' + DOMAIN }).student;
}
const claimRows = h => h.rows('ClaimTokens').slice(1).map(r => ({ id: r[0], points: r[1], status: r[5], claimedBy: r[6], ledgerId: r[9] }));
const claimLedger = h => h.rows('Ledger').slice(1).filter(r => r[5] === 'claim_token');
const balanceOf = (h, email) => { h.setActive(email); return h.call('getSchoolRewardsBootstrap').students[0].balance; };

describe('minting', () => {
  it('staff mint a batch whose rows hold the value; the returned tokens carry no identity', () => {
    const h = harness(); setup(h);
    const out = mint(h);
    expect(out.ok).toBe(true);
    expect(out.tokens).toHaveLength(3);
    expect(out.tokens.map(t => t.status)).toEqual(['unused', 'unused', 'unused']);
    expect(JSON.stringify(out.tokens)).not.toMatch(/studentId|email/i);
    expect(claimRows(h).map(r => r.status)).toEqual(['unused', 'unused', 'unused']);
    expect(h.rows('Audit').filter(r => r[1] === 'CLAIM_TOKENS_MINTED')).toHaveLength(1);
    expect(h.rows('Ledger')).toHaveLength(1);
  });

  it('rejects bad value, unknown category, out-of-range counts, and non-staff roles', () => {
    const h = harness(); setup(h);
    expect(() => mint(h, { points: 0 })).toThrow(/Points/);
    expect(() => mint(h, { points: 1001 })).toThrow(/Points/);
    expect(() => mint(h, { count: 201 })).toThrow(/count/i);
    expect(() => mint(h, { reason: '' })).toThrow(/Describe/);
    expect(() => mint(h, { categoryId: 'missing-category-1' })).toThrow(/no longer active/);
    expect(() => mint(h, { expiresAt: '2000-01-01T00:00:00.000Z' })).toThrow(/future/);
    h.setActive(CASHIER); expect(() => h.call('mintSchoolRewardsClaimTokens', { count: 1, points: 5, categoryId: seededCategory(h).id, reason: 'x' })).toThrow(/role/);
    h.setActive(STUDENT); expect(() => h.call('mintSchoolRewardsClaimTokens', { count: 1, points: 5, categoryId: seededCategory(h).id, reason: 'x' })).toThrow(/role/);
    expect(h.rows('ClaimTokens')).toHaveLength(1);
  });
});

describe('claiming', () => {
  it('credits the signed-in student from the row, once, and records the token on the ledger', () => {
    const h = harness(); const student = setup(h);
    const token = mint(h).tokens[0];
    h.setActive(STUDENT);
    const out = h.call('claimSchoolRewardsToken', { tokenId: token.id });
    expect(out).toMatchObject({ ok: true, state: 'claimed', points: 20, balance: 20, reason: 'Read 20 minutes at home' });
    expect(out.entry.referenceType).toBe('claim_token');
    expect(claimLedger(h)).toHaveLength(1);
    const ledger = claimLedger(h)[0];
    expect([ledger[1], ledger[2], ledger[3], ledger[6], ledger[9]]).toEqual([student.id, 'EARN', 20, token.id, 'student']);
    expect(claimRows(h)[0]).toMatchObject({ status: 'used', claimedBy: student.id, ledgerId: ledger[0] });
    expect(h.rows('Audit').filter(r => r[1] === 'CLAIM_TOKEN_REDEEMED')).toHaveLength(1);
    expect(balanceOf(h, STUDENT)).toBe(20);
  });

  it('a second scan by the same student replays the saved result without a second ledger entry', () => {
    const h = harness(); setup(h);
    const token = mint(h).tokens[0];
    h.setActive(STUDENT);
    const first = h.call('claimSchoolRewardsToken', { tokenId: token.id });
    const again = h.call('claimSchoolRewardsToken', { tokenId: token.id });
    expect(again).toEqual(first);
    expect(claimLedger(h)).toHaveLength(1);
    expect(balanceOf(h, STUDENT)).toBe(20);
  });

  it('a different student scanning a used code sees already_redeemed and earns nothing', () => {
    const h = harness(); setup(h);
    const other = addStudent(h, 1);
    const token = mint(h).tokens[0];
    h.setActive(STUDENT); h.call('claimSchoolRewardsToken', { tokenId: token.id });
    h.setActive(other.email);
    expect(h.call('claimSchoolRewardsToken', { tokenId: token.id })).toEqual({ ok: false, state: 'already_redeemed' });
    expect(claimLedger(h)).toHaveLength(1);
    expect(balanceOf(h, other.email)).toBe(0);
    expect(balanceOf(h, STUDENT)).toBe(20);
  });

  it('ignores forged points, student, and reason in the request', () => {
    const h = harness(); const student = setup(h);
    const other = addStudent(h, 2);
    const token = mint(h).tokens[0];
    h.setActive(STUDENT);
    const out = h.call('claimSchoolRewardsToken', { tokenId: token.id, points: 999, amount: 999, studentId: other.id, reason: 'Forged', categoryId: 'forged-category-1' });
    expect(out).toMatchObject({ ok: true, points: 20, reason: 'Read 20 minutes at home' });
    expect(claimLedger(h)[0][1]).toBe(student.id);
    expect(claimLedger(h)[0][3]).toBe(20);
  });

  it('unknown codes report not_found without throwing; malformed ids and non-students are refused', () => {
    const h = harness(); setup(h);
    mint(h);
    h.setActive(STUDENT);
    expect(h.call('claimSchoolRewardsToken', { tokenId: 'not-a-real-token-1' })).toEqual({ ok: false, state: 'not_found' });
    expect(() => h.call('claimSchoolRewardsToken', { tokenId: 'x' })).toThrow(/claim token id/);
    expect(() => h.call('claimSchoolRewardsToken', { tokenId: '<script>alert(1)</script>' })).toThrow(/claim token id/);
    const token = claimRows(h)[0].id;
    for (const email of [STAFF, ADMIN, CASHIER]) { h.setActive(email); expect(() => h.call('claimSchoolRewardsToken', { tokenId: token })).toThrow(/role/); }
    expect(claimLedger(h)).toHaveLength(0);
    expect(claimRows(h).every(r => r.status === 'unused')).toBe(true);
  });

  it('expired codes are refused and marked; voided batches refuse unused codes and leave redeemed ones alone', () => {
    const h = harness(); setup(h);
    const category = seededCategory(h);
    h.appendRaw('ClaimTokens', ['expired-token-000001', 50, category.id, 'Old code', 'batch-old-000001', 'unused', '', '', '2000-01-01T00:00:00.000Z', '', STAFF, '2000-01-01T00:00:00.000Z']);
    h.setActive(STUDENT);
    expect(h.call('claimSchoolRewardsToken', { tokenId: 'expired-token-000001' })).toEqual({ ok: false, state: 'expired' });
    expect(claimRows(h)[0].status).toBe('expired');
    expect(balanceOf(h, STUDENT)).toBe(0);

    const batch = mint(h);
    h.setActive(STUDENT); h.call('claimSchoolRewardsToken', { tokenId: batch.tokens[0].id });
    h.setActive(STAFF);
    expect(h.call('voidSchoolRewardsClaimBatch', { batchId: batch.batchId })).toEqual({ ok: true, batchId: batch.batchId, voided: 2 });
    expect(h.call('voidSchoolRewardsClaimBatch', { batchId: batch.batchId }).voided).toBe(0);
    expect(claimRows(h).slice(1).map(r => r.status)).toEqual(['used', 'void', 'void']);
    h.setActive(STUDENT);
    expect(h.call('claimSchoolRewardsToken', { tokenId: batch.tokens[1].id })).toEqual({ ok: false, state: 'void' });
    expect(h.call('claimSchoolRewardsToken', { tokenId: batch.tokens[0].id })).toMatchObject({ ok: true, state: 'claimed' });
    expect(balanceOf(h, STUDENT)).toBe(20);
    expect(h.rows('Audit').filter(r => r[1] === 'CLAIM_TOKENS_VOIDED')).toHaveLength(1);
  });
});

describe('crash recovery', () => {
  it.each(['claim:after_intent', 'claim:after_ledger', 'claim:after_token'])('a crash at %s leaves one pending journal that the same student completes with a single ledger entry', stage => {
    const h = harness(); const student = setup(h);
    const other = addStudent(h, 3);
    const token = mint(h).tokens[0];
    h.setActive(STUDENT); h.setCoreFault(stage);
    expect(() => h.call('claimSchoolRewardsToken', { tokenId: token.id })).toThrow(/Injected core fault/);
    h.clearCoreFault();
    // Another student cannot take over a pending claim.
    h.setActive(other.email);
    expect(h.call('claimSchoolRewardsToken', { tokenId: token.id })).toEqual({ ok: false, state: 'already_redeemed' });
    h.setActive(STUDENT);
    const out = h.call('claimSchoolRewardsToken', { tokenId: token.id });
    expect(out).toMatchObject({ ok: true, state: 'claimed', points: 20, balance: 20 });
    expect(claimLedger(h)).toHaveLength(1);
    expect(claimRows(h)[0]).toMatchObject({ status: 'used', claimedBy: student.id });
    expect(h.rows('Audit').filter(r => r[1] === 'CLAIM_TOKEN_REDEEMED')).toHaveLength(1);
    expect(balanceOf(h, STUDENT)).toBe(20);
    expect(balanceOf(h, other.email)).toBe(0);
  });

  it('an administrator can recover a pending claim by its token key', () => {
    const h = harness(); const student = setup(h);
    const token = mint(h).tokens[0];
    h.setActive(STUDENT); h.setCoreFault('claim:after_ledger');
    expect(() => h.call('claimSchoolRewardsToken', { tokenId: token.id })).toThrow(/Injected core fault/);
    h.clearCoreFault();
    h.setActive(ADMIN);
    const recovered = h.call('recoverSchoolRewardsOperation', { idempotencyKey: 'claim:' + token.id });
    expect(recovered).toMatchObject({ ok: true, kind: 'claim' });
    expect(recovered.result).toMatchObject({ ok: true, state: 'claimed', points: 20 });
    expect(claimLedger(h)).toHaveLength(1);
    expect(claimRows(h)[0]).toMatchObject({ status: 'used', claimedBy: student.id });
    expect(balanceOf(h, STUDENT)).toBe(20);
  });

  it('a tampered pending claim (points changed on the token row) is refused rather than paid', () => {
    const h = harness(); setup(h);
    const token = mint(h).tokens[0];
    h.setActive(STUDENT); h.setCoreFault('claim:after_intent');
    expect(() => h.call('claimSchoolRewardsToken', { tokenId: token.id })).toThrow(/Injected core fault/);
    h.clearCoreFault();
    h.setDataCell('ClaimTokens', 0, 1, 500);
    expect(() => h.call('claimSchoolRewardsToken', { tokenId: token.id })).toThrow(/does not match its token/);
    expect(claimLedger(h)).toHaveLength(0);
  });
});

describe('batches', () => {
  const OTHER = 'other.teacher@' + DOMAIN;
  function otherStaff(h) { h.setActive(ADMIN); h.call('adminUpsertRewardsMember', { email: OTHER, displayName: 'Other', role: 'staff' }); }

  it('staff list only the batches they minted with counts and unused ids; administrators see every batch; no identity leaks', () => {
    const h = harness(); setup(h); otherStaff(h);
    const mine = mint(h);
    h.setActive(OTHER); const theirs = h.call('mintSchoolRewardsClaimTokens', { count: 2, points: 5, categoryId: seededCategory(h).id, reason: 'Line leader' });
    h.setActive(STUDENT); h.call('claimSchoolRewardsToken', { tokenId: mine.tokens[0].id });
    h.setActive(STAFF);
    const list = h.call('listSchoolRewardsClaimBatches').batches;
    expect(list.map(b => b.batchId)).toEqual([mine.batchId]);
    expect(list[0]).toMatchObject({ points: 20, reason: 'Read 20 minutes at home', mine: true, counts: { unused: 2, used: 1, void: 0, expired: 0 } });
    expect(list[0].unusedTokenIds.sort()).toEqual([mine.tokens[1].id, mine.tokens[2].id].sort());
    expect(JSON.stringify(list)).not.toMatch(/@|studentId|ClaimedBy/i);
    h.setActive(ADMIN);
    expect(h.call('listSchoolRewardsClaimBatches').batches.map(b => b.batchId).sort()).toEqual([mine.batchId, theirs.batchId].sort());
    h.setActive(CASHIER); expect(() => h.call('listSchoolRewardsClaimBatches')).toThrow(/role/);
    h.setActive(STUDENT); expect(() => h.call('listSchoolRewardsClaimBatches')).toThrow(/role/);
  });

  it('only the minting staff member or an administrator can cancel a batch; expired codes count as expired', () => {
    const h = harness(); setup(h); otherStaff(h);
    const mine = mint(h);
    h.setActive(OTHER);
    expect(() => h.call('voidSchoolRewardsClaimBatch', { batchId: mine.batchId })).toThrow(/Only the staff member/);
    expect(() => h.call('voidSchoolRewardsClaimBatch', { batchId: 'missing-batch-000001' })).toThrow(/could not be found/);
    expect(claimRows(h).every(r => r.status === 'unused')).toBe(true);
    h.setActive(ADMIN); expect(h.call('voidSchoolRewardsClaimBatch', { batchId: mine.batchId }).voided).toBe(3);
    h.appendRaw('ClaimTokens', ['expired-token-000002', 5, seededCategory(h).id, 'Old', 'batch-old-000002', 'unused', '', '', '2000-01-01T00:00:00.000Z', '', STAFF, '2000-01-01T00:00:00.000Z']);
    h.setActive(STAFF);
    const old = h.call('listSchoolRewardsClaimBatches').batches.find(b => b.batchId === 'batch-old-000002');
    expect(old.counts).toEqual({ unused: 0, used: 0, void: 0, expired: 1 });
    expect(old.unusedTokenIds).toEqual([]);
  });
});

describe('integrity report', () => {
  it('is clean after mint and claim, and flags a token/ledger disagreement without changing data', () => {
    const h = harness(); setup(h);
    const batch = mint(h);
    h.setActive(STUDENT); h.call('claimSchoolRewardsToken', { tokenId: batch.tokens[0].id });
    h.setActive(ADMIN);
    const clean = h.call('getSchoolRewardsIntegrityReport', {});
    expect(clean).toMatchObject({ ok: true, summary: { errors: 0 }, checks: { claimTokens: true } });
    h.setDataCell('ClaimTokens', 1, 5, 'used');            // unused token marked used with no ledger row
    h.setDataCell('ClaimTokens', 2, 5, 'bogus');           // unknown status
    h.setDataCell('ClaimTokens', 0, 1, 999);               // redeemed token's points no longer match its ledger row
    const ledgerRow = h.rows('Ledger')[1]; h.appendRaw('Ledger', ledgerRow);  // token credited twice
    const before = JSON.stringify([h.rows('ClaimTokens'), h.rows('Ledger')]);
    const report = h.call('getSchoolRewardsIntegrityReport', {});
    const codes = report.issues.map(i => i.code);
    expect(report.ok).toBe(false);
    expect(codes).toEqual(expect.arrayContaining(['CLAIM_TOKEN_LEDGER_MISSING', 'CLAIM_TOKEN_STATUS_INVALID', 'CLAIM_TOKEN_LEDGER_MISMATCH', 'DUPLICATE_CLAIM_LEDGER']));
    expect(JSON.stringify([h.rows('ClaimTokens'), h.rows('Ledger')])).toBe(before);
  });

  it('refuses to report on a v6 repository until the claim migration runs, like every earlier schema step', () => {
    const h = harness(); setup(h); h.simulateV6Claims(); h.setActive(ADMIN);
    expect(() => h.call('getSchoolRewardsIntegrityReport', {})).toThrow(/ClaimTokens sheet is missing/);
    h.call('migrateSchoolRewardsRepositoryV7');
    expect(h.call('getSchoolRewardsIntegrityReport', {})).toMatchObject({ ok: true, checks: { claimTokens: true } });
  });
});

describe('schema v7 migration', () => {
  it('claims are blocked on a v6 repository until an administrator runs the additive migration', () => {
    const h = harness(); setup(h); h.simulateV6Claims();
    expect(h.configValue('schemaVersion')).toBe('6');
    expect(() => mint(h)).toThrow(/schema v7/);
    h.setActive(STUDENT); expect(() => h.call('claimSchoolRewardsToken', { tokenId: 'token-000000000001' })).toThrow(/schema v7/);
    h.setActive(STAFF); expect(() => h.call('migrateSchoolRewardsRepositoryV7')).toThrow(/role/);
    h.setActive(ADMIN);
    const migrated = h.call('migrateSchoolRewardsRepositoryV7');
    expect(migrated).toMatchObject({ ok: true, version: 7 });
    expect(h.call('migrateSchoolRewardsRepositoryV7')).toEqual(migrated);
    expect(h.configValue('schemaVersion')).toBe('7');
    expect(h.rows('Audit').filter(r => r[1] === 'REPOSITORY_MIGRATED_V7')).toHaveLength(1);
    expect(mint(h).tokens).toHaveLength(3);
  });

  it('refuses to skip the v6 mail migration', () => {
    const h = harness(); setup(h); h.simulateV5Mail();
    h.setActive(ADMIN);
    expect(() => h.call('migrateSchoolRewardsRepositoryV7')).toThrow(/schema v6 mail migration/);
    expect(h.configValue('schemaVersion')).toBe('5');
  });
});

describe('claim entry link', () => {
  const code = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards/Code.gs'), 'utf8');
  const index = readFileSync(resolve(process.cwd(), 'apps_script/school_rewards/Index.html'), 'utf8');
  function entry(role) {
    const templates = [];
    const output = content => ({ content, setTitle() { return this; } });
    const context = { HtmlService: { createTemplateFromFile(name) { const t = { name, evaluate() { return output(JSON.stringify({ claimToken: this.claimToken })); } }; templates.push(t); return t; }, createHtmlOutput: output } };
    runInNewContext(code, context);
    context.currentActor_ = () => ({ role });
    return event => context.doGet(event).content;
  }
  it('forwards only a well-formed token id, only to a student, and nothing else from the query', () => {
    const student = entry('student');
    expect(student({ parameter: { claim: 'abcdef12-3456-7890-abcd-ef1234567890' } })).toBe('{"claimToken":"abcdef12-3456-7890-abcd-ef1234567890"}');
    for (const bad of ['short', 'has space 12345', '<script>alert(1)</script>', 'x'.repeat(81), '', undefined]) expect(student({ parameter: { claim: bad } })).toBe('{"claimToken":""}');
    expect(student({ parameter: { claim: 'abcdef12-3456-7890-abcd-ef1234567890', points: '999', studentId: 'PRIVATE' } })).not.toMatch(/999|PRIVATE/);
    for (const role of ['admin', 'staff', 'cashier']) expect(entry(role)({ parameter: { claim: 'abcdef12-3456-7890-abcd-ef1234567890' } })).toBe('{"claimToken":""}');
    expect(index).toContain('data-school-rewards-claim="<?= claimToken ?>"');
    expect(index).not.toContain('<?!= claimToken');
  });
});
