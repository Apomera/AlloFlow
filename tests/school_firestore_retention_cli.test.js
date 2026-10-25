import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const CLI = require('../dev-tools/security/school_firestore_retention.cjs');
const Core = require('../dev-tools/security/school_firestore_retention_core.cjs');
const tempBase = path.resolve('tmp/school-retention-cli-tests');
const folders = [];
function folder() { fs.mkdirSync(tempBase, { recursive: true }); const dir = fs.mkdtempSync(path.join(tempBase, 'run-')); folders.push(dir); return dir; }
afterEach(() => { for (const dir of folders.splice(0)) { const resolved = path.resolve(dir); if (!resolved.startsWith(tempBase + path.sep) || !path.basename(resolved).startsWith('run-')) throw new Error('Unsafe synthetic cleanup path'); fs.rmSync(resolved, { recursive: true, force: true }); } });
function fixture() {
  const dir = folder(), out = path.join(dir, 'plan.json'), receipt = path.join(dir, 'receipt.json');
  const scope = { projectId: 'demo-retention-cli', databaseId: '(default)', appId: 'synthetic', sessionId: 'ABCDE', ownerUid: 'synthetic-owner' };
  const parent = 'artifacts/synthetic/public/data/sessions/ABCDE', child = parent + '/answers/learner';
  const documents = new Map([[parent, { kind: 'assignment', hostId: scope.ownerUid, expiresAt: new Date(Date.now() - 3600000), body: 'SYNTHETIC_PRIVATE_BODY' }], [child, { body: 'SYNTHETIC_PRIVATE_BODY' }]]);
  const adapter = { get: vi.fn(async p => documents.has(p) ? { path: p, exists: true, version: { seconds: 100, nanoseconds: 5 }, data: documents.get(p) } : { path: p, exists: false, version: null, data: null }),
    listCollections: vi.fn(async p => p === parent ? [parent + '/answers'] : []),
    listDocuments: vi.fn(async p => p === parent + '/answers' && documents.has(child) ? [child] : []),
    findAssets: vi.fn(async () => []), delete: vi.fn(async p => { documents.delete(p); }), close: vi.fn(async () => {}) };
  const createAdapter = vi.fn(() => adapter), stdout = vi.fn();
  const planArgs = ['plan', '--project', scope.projectId, '--app-id', scope.appId, '--session', scope.sessionId, '--owner-uid', scope.ownerUid, '--approval-ref', 'SYNTHETIC-TICKET', '--holds-reviewed', '--out', out];
  const applyArgs = hash => ['apply', '--plan', out, '--reviewed-hash', hash, '--confirm-project', scope.projectId, '--receipt', receipt];
  return { dir, out, receipt, scope, parent, child, documents, adapter, createAdapter, stdout, planArgs, applyArgs };
}
describe('owned Firestore retention CLI', () => {
  it('prints help without loading an SDK or creating a client', async () => {
    const h = fixture(); await CLI.runCli(['--help'], h); expect(h.createAdapter).not.toHaveBeenCalled(); expect(h.stdout).toHaveBeenCalled();
  });
  for (const args of [[], ['plan'], ['apply'], ['plan', '--execute'], ['plan', '--project', 'x', '--project', 'y'], ['apply', '--unknown', 'value']]) {
    it('rejects incomplete or ambiguous command ' + JSON.stringify(args), async () => {
      const h = fixture(); await expect(CLI.runCli(args, h)).rejects.toMatchObject({ code: 'RETENTION_USAGE' }); expect(h.createAdapter).not.toHaveBeenCalled();
    });
  }
  it('requires valid project scope and hold review before SDK construction', async () => {
    const h = fixture(); const bad = h.planArgs.slice(); bad[2] = 'x';
    await expect(CLI.runCli(bad, h)).rejects.toMatchObject({ code: 'RETENTION_SCOPE_INVALID' });
    await expect(CLI.runCli(h.planArgs.filter(p => p !== '--holds-reviewed'), h)).rejects.toMatchObject({ code: 'RETENTION_HOLD_REVIEW_REQUIRED' });
    expect(h.createAdapter).not.toHaveBeenCalled(); expect(fs.existsSync(h.out)).toBe(false);
  });
  it('writes a reviewable plan and defaults apply to a no-write dry run', async () => {
    const h = fixture(); const plan = await CLI.runCli(h.planArgs, h);
    expect(JSON.parse(fs.readFileSync(h.out, 'utf8')).planHash).toBe(plan.planHash);
    expect(fs.readFileSync(h.out, 'utf8')).not.toContain('SYNTHETIC_PRIVATE_BODY');
    const receipt = await CLI.runCli(h.applyArgs(plan.planHash), h);
    expect(receipt.status).toBe('dry-run'); expect(h.adapter.delete).not.toHaveBeenCalled(); expect(h.documents.size).toBe(2);
    expect(JSON.stringify(h.stdout.mock.calls)).not.toContain('synthetic-owner');
    expect(fs.readFileSync(h.receipt, 'utf8')).not.toContain('/answers/');
  });
  it('requires both execution acknowledgments before constructing another SDK client', async () => {
    const h = fixture(); const plan = await CLI.runCli(h.planArgs, h); h.createAdapter.mockClear();
    await expect(CLI.runCli([...h.applyArgs(plan.planHash), '--execute'], h)).rejects.toMatchObject({ code: 'RETENTION_EXECUTION_ACKNOWLEDGMENTS_REQUIRED' });
    expect(h.createAdapter).not.toHaveBeenCalled(); expect(h.documents.size).toBe(2); expect(fs.existsSync(h.receipt)).toBe(false);
  });
  it('rejects a wrong reviewed hash before any client construction', async () => {
    const h = fixture(); await CLI.runCli(h.planArgs, h); h.createAdapter.mockClear();
    await expect(CLI.runCli(h.applyArgs('0'.repeat(64)), h)).rejects.toMatchObject({ code: 'RETENTION_PROJECT_OR_HASH_CONFIRMATION_REQUIRED' });
    expect(h.createAdapter).not.toHaveBeenCalled();
  });
  it('rejects an expired plan before SDK/credential initialization', async () => {
    const h = fixture(); const plan = await Core.createPlan(h.adapter, { scope: h.scope, approvalReference: 'SYNTHETIC', holdsReviewed: true }, { now: () => Date.now() - 20 * 60000 });
    fs.writeFileSync(h.out, JSON.stringify(plan));
    await expect(CLI.runCli(h.applyArgs(plan.planHash), h)).rejects.toMatchObject({ code: 'RETENTION_PLAN_EXPIRED' });
    expect(h.createAdapter).not.toHaveBeenCalled(); expect(fs.existsSync(h.receipt)).toBe(false);
  });
  it('does not clobber an existing plan or receipt', async () => {
    const h = fixture(); const plan = await CLI.runCli(h.planArgs, h); h.createAdapter.mockClear();
    await expect(CLI.runCli(h.planArgs, h)).rejects.toBeTruthy();
    fs.writeFileSync(h.receipt, 'preserve prior receipt');
    await expect(CLI.runCli(h.applyArgs(plan.planHash), h)).rejects.toBeTruthy();
    expect(h.createAdapter).not.toHaveBeenCalled(); expect(fs.readFileSync(h.receipt, 'utf8')).toBe('preserve prior receipt');
  });
  it('executes only the explicit reviewed plan and persists verified results', async () => {
    const h = fixture(); const plan = await CLI.runCli(h.planArgs, h);
    const result = await CLI.runCli([...h.applyArgs(plan.planHash), '--execute', '--holds-reviewed', '--writers-paused'], h);
    expect(result.status).toBe('verified-empty-at-check'); expect(h.documents.size).toBe(0);
    expect(h.adapter.delete.mock.calls.map(call => call[0])).toEqual([h.child, h.parent]);
    expect(JSON.parse(fs.readFileSync(h.receipt, 'utf8')).verifiedAbsent).toBe(2);
  });
  it('persists an incomplete receipt instead of accepting a backend acknowledgment', async () => {
    const h = fixture(); const plan = await CLI.runCli(h.planArgs, h); h.adapter.delete.mockImplementation(async () => {});
    await expect(CLI.runCli([...h.applyArgs(plan.planHash), '--execute', '--holds-reviewed', '--writers-paused'], h)).rejects.toMatchObject({ code: 'RETENTION_DELETE_NOT_VERIFIED' });
    const result = JSON.parse(fs.readFileSync(h.receipt, 'utf8'));
    expect(result.status).toBe('incomplete'); expect(result.verifiedAbsent).toBe(0); expect(result.remainingCount).toBe(2);
  });
  it('never treats provider-controlled error codes as safe diagnostics', async () => {
    const h = fixture(); const error = Object.assign(new Error('SYNTHETIC_PRIVATE_BODY'), { code: 'RETENTION_USAGE' });
    h.createAdapter.mockImplementation(() => { throw error; });
    let caught; try { await CLI.runCli(h.planArgs, h); } catch (e) { caught = e; }
    expect(CLI.safeErrorCode(caught)).toBe('RETENTION_OPERATION_FAILED');
    expect(h.stdout).not.toHaveBeenCalled();
  });
});
