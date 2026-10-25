import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const Core = require('../dev-tools/security/school_firestore_retention_core.cjs');
const NOW = Date.UTC(2026, 9, 24, 20, 0);
const SCOPE = { projectId: 'demo-school-retention', databaseId: '(default)', appId: 'synthetic-app', sessionId: 'CASE01', ownerUid: 'synthetic-host' };
const ROOT = 'artifacts/synthetic-app/public/data';
const SESSION = ROOT + '/sessions/CASE01';
const CHILD = SESSION + '/boardAnswers/learner-one';
const ASSET = ROOT + '/session_assets/asset-one';
const PEER = ROOT + '/quiz-signaling/CASE01/peers/learner-one';
const copy = value => structuredClone(value);
function fixture() {
  let sequence = 0;
  const records = new Map(), deletions = [], reads = [];
  const add = (path, data = {}) => records.set(path, { exists: true, path, version: { seconds: ++sequence, nanoseconds: 1 }, data: copy(data) });
  add(SESSION, { kind: 'assignment', hostId: SCOPE.ownerUid, expiresAt: new Date(NOW - 60000), privateBody: 'SYNTHETIC_STUDENT_SECRET' });
  add(CHILD, { privateBody: 'SYNTHETIC_STUDENT_SECRET' });
  add(SESSION + '/missing-parent/placeholder/deeper/nested', { privateBody: 'SYNTHETIC_STUDENT_SECRET' });
  add(ASSET, { parentId: SCOPE.sessionId, parentKind: 'assignment', ownerUid: SCOPE.ownerUid, privateBody: 'SYNTHETIC_STUDENT_SECRET' });
  add(PEER, { privateBody: 'SYNTHETIC_STUDENT_SECRET' });
  add(ROOT + '/session_assets/unrelated', { parentId: 'OTHER1', parentKind: 'assignment', ownerUid: SCOPE.ownerUid });
  add(ROOT + '/sessions/OTHER1', { kind: 'assignment', hostId: SCOPE.ownerUid, expiresAt: new Date(NOW - 60000) });
  const get = path => records.has(path) ? copy(records.get(path)) : { path, exists: false, version: null, data: null };
  const adapter = {
    async get(path) { reads.push(path); return get(path); },
    async listCollections(path) {
      const n = path.split('/').length;
      return [...new Set([...records.keys()].filter(key => key.startsWith(path + '/')).map(key => key.split('/').slice(0, n + 1).join('/')))].sort();
    },
    async listDocuments(path) {
      const n = path.split('/').length;
      return [...new Set([...records.keys()].filter(key => key.startsWith(path + '/')).map(key => key.split('/').slice(0, n + 1).join('/')))].sort();
    },
    async findAssets(base, sessionId, limit) { return [...records.values()].filter(r => r.path.startsWith(base + '/session_assets/') && r.path.split('/').length === 6 && r.data.parentId === sessionId).slice(0, limit).map(copy); },
    async delete(path, expected, parentGuard) {
      if (parentGuard && (!records.has(parentGuard.parentPath) || Core.canonical(records.get(parentGuard.parentPath).version) !== Core.canonical(parentGuard.parentVersion))) throw new Error('synthetic atomic parent guard');
      if (!records.has(path) || Core.canonical(records.get(path).version) !== Core.canonical(expected)) throw new Error('synthetic precondition');
      deletions.push(path); records.delete(path);
    }
  };
  return { records, deletions, reads, adapter, add, get };
}
const input = () => ({ scope: copy(SCOPE), approvalReference: 'PPS-SYNTHETIC-REQUEST-001', holdsReviewed: true });
const plan = h => Core.createPlan(h.adapter, input(), { now: () => NOW });
const opts = p => ({ reviewedHash: p.planHash, confirmProject: p.scope.projectId, execute: true, holdsReviewed: true, writersPaused: true, now: () => NOW });
const rejected = async promise => { try { await promise; throw new Error('Expected rejection'); } catch (error) { return error; } };

describe('reviewed owned-Firestore record disposition', () => {
  it('plans exact dependent paths and nested orphans without document bodies', async () => {
    const h = fixture(), p = await plan(h);
    expect(p.manifest.documents).toHaveLength(5);
    expect(p.manifest.structuralPaths).toContain(SESSION + '/missing-parent/placeholder');
    expect(JSON.stringify(p)).not.toContain('SYNTHETIC_STUDENT_SECRET');
    expect(p.manifest.documents.some(d => d.path.includes('unrelated'))).toBe(false);
    expect(h.deletions).toEqual([]);
    expect(Core.hashPlan(p)).toBe(p.planHash);
  });
  it('defaults apply to read-only revalidation', async () => {
    const h = fixture(), p = await plan(h);
    const result = await Core.applyPlan(h.adapter, p, { ...opts(p), execute: undefined, writersPaused: false, holdsReviewed: false });
    expect(result.status).toBe('dry-run'); expect(h.deletions).toEqual([]);
    expect(result.remainingCount).toBe(5);
  });
  it('deletes descendants and associated records first, parent last, and verifies absence', async () => {
    const h = fixture(), p = await plan(h);
    const receipt = await Core.applyPlan(h.adapter, p, opts(p));
    expect(receipt.status).toBe('verified-empty-at-check'); expect(receipt.remainingCount).toBe(0);
    expect(receipt.parentDeleted).toBe(true); expect(receipt.verifiedAbsent).toBe(5);
    expect(h.deletions.at(-1)).toBe(SESSION);
    expect(h.records.has(ROOT + '/sessions/OTHER1')).toBe(true);
    expect(h.records.has(ROOT + '/session_assets/unrelated')).toBe(true);
    expect(JSON.stringify(receipt)).not.toMatch(/SYNTHETIC_STUDENT_SECRET|learner-one|CASE01|synthetic-host/);
  });
  it.each(['live', undefined, null])('does not infer a disposition schedule for kind %s', async kind => {
    const h = fixture(); h.records.get(SESSION).data.kind = kind;
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_NOT_OWNED_ASSIGNMENT' });
    expect(h.deletions).toEqual([]);
  });
  it.each([undefined, null, '2026-10-01', NOW - 60000, new Date(NOW + 1)])('rejects missing, malformed, or future assignment expiry', async expiry => {
    const h = fixture(); h.records.get(SESSION).data.expiresAt = expiry;
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_ASSIGNMENT_NOT_EXPIRED' });
  });
  it('does not infer an absent parent owner from orphan child content', async () => {
    const h = fixture(); h.records.delete(SESSION);
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_PARENT_MISSING' });
    expect(h.records.has(CHILD)).toBe(true);
  });
  it.each([SESSION, CHILD])('preserves mismatched owner metadata at %s', async path => {
    const h = fixture(); h.records.get(path).data.ownerUid = 'another-owner';
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_OWNER_MISMATCH' });
  });
  it.each(['ownerUid', 'parentKind'])('refuses conflicting associated-asset %s', async field => {
    const h = fixture(); h.records.get(ASSET).data[field] = 'different';
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_ASSET_SCOPE_MISMATCH' });
  });
  it.each([
    { legalHold: true }, { legalHold: 'false' }, { retentionHold: true }, { holdUntil: new Date(NOW + 1) },
    { holdUntil: 'tomorrow' }, { retentionHoldUntil: new Date(NOW + 1) }, { retention: { hold: true } }, { retention: { holdUntil: new Date(NOW + 1) } }
  ])('preserves configured hold metadata %j', async hold => {
    const h = fixture(); Object.assign(h.records.get(CHILD).data, hold);
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_HOLD_PRESENT' });
  });
  it('requires an external hold-review acknowledgment and approved request reference', async () => {
    const h = fixture();
    await expect(Core.createPlan(h.adapter, { ...input(), holdsReviewed: false }, { now: () => NOW })).rejects.toMatchObject({ code: 'RETENTION_HOLD_REVIEW_REQUIRED' });
    await expect(Core.createPlan(h.adapter, { ...input(), approvalReference: '' }, { now: () => NOW })).rejects.toMatchObject({ code: 'RETENTION_APPROVAL_REQUIRED' });
  });
  it('keeps the no-hold and elapsed-hold metadata compatible', async () => {
    const h = fixture(); Object.assign(h.records.get(CHILD).data, { legalHold: false, retentionHold: false, holdUntil: new Date(NOW - 1) });
    expect((await plan(h)).manifest.documents).toHaveLength(5);
  });
  it.each(['confirmProject', 'reviewedHash'])('requires exact %s before revalidation or deletion', async field => {
    const h = fixture(), p = await plan(h);
    await expect(Core.applyPlan(h.adapter, p, { ...opts(p), [field]: 'incorrect' })).rejects.toBeTruthy();
    expect(h.deletions).toEqual([]);
  });
  it.each(['holdsReviewed', 'writersPaused'])('requires actual apply acknowledgment %s', async field => {
    const h = fixture(), p = await plan(h);
    await expect(Core.applyPlan(h.adapter, p, { ...opts(p), [field]: false })).rejects.toMatchObject({ code: 'RETENTION_EXECUTION_ACKNOWLEDGMENTS_REQUIRED' });
    expect(h.deletions).toEqual([]);
  });
  it('rejects forged out-of-scope paths even if the JSON hash is recomputed', async () => {
    const h = fixture(), p = await plan(h);
    p.manifest.documents[0].path = 'artifacts/another-app/public/data/sessions/CASE01'; p.planHash = Core.hashPlan(p);
    await expect(Core.applyPlan(h.adapter, p, opts(p))).rejects.toMatchObject({ code: 'RETENTION_PATH_INVALID' });
    expect(h.deletions).toEqual([]);
  });
  it('rejects recomputed in-scope omission rather than silently missing an asset', async () => {
    const h = fixture(), p = await plan(h);
    p.manifest.documents = p.manifest.documents.filter(e => e.path !== ASSET); p.planHash = Core.hashPlan(p);
    await expect(Core.applyPlan(h.adapter, p, opts(p))).rejects.toMatchObject({ code: 'RETENTION_SCOPE_CHANGED' });
    expect(h.deletions).toEqual([]);
  });
  it('rejects prototype fields, traversal identifiers and nonplain scopes', async () => {
    for (const scope of [{ ...SCOPE, appId: '..' }, { ...SCOPE, sessionId: 'constructor' }, Object.assign(Object.create({ polluted: true }), SCOPE)]) {
      expect(() => Core.validateScope(scope)).toThrow();
    }
    const h = fixture(), p = await plan(h); Object.defineProperty(p, '__proto__', { value: 'unsafe', enumerable: true });
    p.planHash = Core.hashPlan(p);
    await expect(Core.applyPlan(h.adapter, p, opts(p))).rejects.toMatchObject({ code: 'RETENTION_PLAN_INVALID' });
  });
  it('expires a reviewed plan rather than applying it on a later day', async () => {
    const h = fixture(), p = await plan(h);
    await expect(Core.applyPlan(h.adapter, p, { ...opts(p), now: () => NOW + Core.LIMITS.planAgeMs + 1 })).rejects.toMatchObject({ code: 'RETENTION_PLAN_EXPIRED' });
    expect(h.deletions).toEqual([]);
  });
  it('validates the complete plan offline before a CLI needs to construct SDK clients', async () => {
    const h = fixture(), p = await plan(h);
    expect(Core.validatePlan(p, opts(p))).toBe(NOW);
    const changed = copy(p); changed.kind = 'another-tool'; changed.planHash = Core.hashPlan(changed);
    expect(() => Core.validatePlan(changed, opts(changed))).toThrow('RETENTION_PLAN_INVALID');
    expect(() => Core.validatePlan(p, { ...opts(p), now: () => NOW + Core.LIMITS.planAgeMs + 1 })).toThrow('RETENTION_PLAN_EXPIRED');
    expect(h.deletions).toEqual([]);
  });
  it('does not trust a provider error even when its code looks like an intentional refusal', async () => {
    const h = fixture(), p = await plan(h);
    h.adapter.delete = async () => { throw Object.assign(new Error('SYNTHETIC_STUDENT_SECRET'), { code: 'RETENTION_SCOPE_CHANGED' }); };
    const error = await rejected(Core.applyPlan(h.adapter, p, opts(p)));
    expect(error.code).toBe('RETENTION_OPERATION_FAILED'); expect(Core.isTrustedError(error)).toBe(true);
    expect(Core.safeErrorCode(error)).toBe('RETENTION_OPERATION_FAILED');
    expect(Core.isTrustedError({ code: 'RETENTION_SCOPE_CHANGED' })).toBe(false);
    expect(Core.safeErrorCode({ code: 'RETENTION_SYNTHETIC_STUDENT_SECRET' })).toBe('RETENTION_OPERATION_FAILED');
    expect(Core.safeErrorCode({ code: 'RETENTION_SCOPE_CHANGED' })).toBe('RETENTION_OPERATION_FAILED');
  });
  it('keeps the private diagnostic category stable if a caller edits an intentional error', async () => {
    const h = fixture(), p = await plan(h);
    const error = await rejected(Core.applyPlan(h.adapter, p, { ...opts(p), confirmProject: 'different' }));
    try { error.code = 'RETENTION_SYNTHETIC_STUDENT_SECRET'; } catch (_) {}
    error.message = 'SYNTHETIC_STUDENT_SECRET';
    expect(Core.safeErrorCode(error)).toBe('RETENTION_PROJECT_CONFIRMATION_REQUIRED');
  });
  it('rejects new, changed or newly held work before any write', async () => {
    for (const mutate of [h => h.add(SESSION + '/boardAnswers/new-learner', {}), h => h.add(CHILD, {}), h => { h.records.get(CHILD).data.legalHold = true; }]) {
      const h = fixture(), p = await plan(h); mutate(h);
      await expect(Core.applyPlan(h.adapter, p, opts(p))).rejects.toBeTruthy(); expect(h.deletions).toEqual([]);
    }
  });
  it('passes full target and parent versions into every atomic delete precondition', async () => {
    const h = fixture(), p = await plan(h), original = h.adapter.delete;
    const versions = new Map(p.manifest.documents.map(e => [e.path, e.version]));
    h.adapter.delete = async (path, version, guard) => {
      expect(version).toEqual(versions.get(path));
      expect(guard).toEqual({ parentPath: SESSION, parentVersion: versions.get(SESSION) });
      await original(path, version, guard);
    };
    await Core.applyPlan(h.adapter, p, opts(p));
  });
  it('does not delete a child if a parent hold changes after its last ordinary read', async () => {
    const h = fixture(), p = await plan(h), original = h.adapter.delete;
    h.adapter.delete = async (path, version, guard) => {
      h.add(SESSION, { ...h.records.get(SESSION).data, legalHold: true });
      await original(path, version, guard);
    };
    const error = await rejected(Core.applyPlan(h.adapter, p, opts(p)));
    expect(error.receipt.status).toBe('incomplete'); expect(error.receipt.deleteRequested).toBe(1);
    expect(error.receipt.deleteAcknowledged).toBe(0); expect(error.receipt.verifiedAbsent).toBe(0);
    expect(h.deletions).toEqual([]); expect(h.records.has(CHILD)).toBe(true); expect(h.records.has(SESSION)).toBe(true);
    expect(h.records.get(SESSION).data.legalHold).toBe(true);
  });
  it('stops with a partial receipt if the parent changes during deletion', async () => {
    const h = fixture(), p = await plan(h), original = h.adapter.delete;
    h.adapter.delete = async (...args) => { await original(...args); h.add(SESSION, { kind: 'assignment', hostId: SCOPE.ownerUid, expiresAt: new Date(NOW - 1) }); };
    const error = await rejected(Core.applyPlan(h.adapter, p, opts(p)));
    expect(error.code).toBe('RETENTION_DOCUMENT_CHANGED'); expect(error.receipt.status).toBe('incomplete');
    expect(error.receipt.deleteAcknowledged).toBe(1); expect(error.receipt.parentDeleted).toBe(false); expect(h.records.has(SESSION)).toBe(true);
  });
  it('keeps new children and the parent if a writer appears during deletion', async () => {
    const h = fixture(), p = await plan(h), original = h.adapter.delete;
    h.adapter.delete = async (...args) => { await original(...args); h.add(SESSION + '/new-collection/new-work', {}); };
    const error = await rejected(Core.applyPlan(h.adapter, p, opts(p)));
    expect(error.code).toBe('RETENTION_SCOPE_CHANGED'); expect(error.receipt.parentDeleted).toBe(false);
    expect(h.records.has(SESSION + '/new-collection/new-work')).toBe(true); expect(h.records.has(SESSION)).toBe(true);
  });
  it('does not treat a resolved delete request as proof of absence', async () => {
    const h = fixture(), p = await plan(h); h.adapter.delete = async () => {};
    const error = await rejected(Core.applyPlan(h.adapter, p, opts(p)));
    expect(error.code).toBe('RETENTION_DELETE_NOT_VERIFIED'); expect(error.receipt.verifiedAbsent).toBe(0); expect(error.receipt.parentDeleted).toBe(false);
  });
  it('does not claim completion when a post-parent write recreates content', async () => {
    const h = fixture(), p = await plan(h), original = h.adapter.delete;
    h.adapter.delete = async (path, v, guard) => { await original(path, v, guard); if (path === SESSION) h.add(CHILD, {}); };
    const error = await rejected(Core.applyPlan(h.adapter, p, opts(p)));
    expect(error.code).toBe('RETENTION_REMAINING_RECORDS'); expect(error.receipt.parentDeleted).toBe(true); expect(error.receipt.remainingCount).toBe(1);
    expect(h.records.has(CHILD)).toBe(true);
  });
  it('does not copy backend messages or arbitrary error codes into receipts', async () => {
    const h = fixture(), p = await plan(h);
    h.adapter.delete = async () => { throw Object.assign(new Error('SYNTHETIC_STUDENT_SECRET'), { code: 'RETENTION_SYNTHETIC_STUDENT_SECRET' }); };
    const error = await rejected(Core.applyPlan(h.adapter, p, opts(p)));
    expect(error.code).toBe('RETENTION_OPERATION_FAILED'); expect(JSON.stringify(error.receipt)).not.toContain('SYNTHETIC_STUDENT_SECRET');
    expect(error.receipt.remainingCount).toBe(5);
  });
  it('normalizes backend failures during planning and preflight before they can be logged', async () => {
    const h = fixture(), p = await plan(h);
    h.adapter.get = async () => { throw Object.assign(new Error('SYNTHETIC_STUDENT_SECRET'), { code: 'SYNTHETIC_STUDENT_SECRET' }); };
    for (const pending of [plan(h), Core.applyPlan(h.adapter, p, opts(p))]) {
      const error = await rejected(pending);
      expect(error.code).toBe('RETENTION_OPERATION_FAILED'); expect(error.message).not.toContain('SYNTHETIC_STUDENT_SECRET');
    }
    expect(h.deletions).toEqual([]);
  });
  it('rejects unbounded collection responses before walking or deleting them', async () => {
    const h = fixture(); h.adapter.listDocuments = async path => Array.from({ length: Core.LIMITS.structuralPaths + 1 }, (_, i) => path + '/id' + i);
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_SCOPE_TOO_LARGE' }); expect(h.deletions).toEqual([]);
  });
  it('rejects adapter document paths outside the requested child collection', async () => {
    const h = fixture(); h.adapter.listDocuments = async () => [ROOT + '/sessions/OTHER1'];
    await expect(plan(h)).rejects.toMatchObject({ code: 'RETENTION_ADAPTER_INVALID' }); expect(h.deletions).toEqual([]);
  });
});
