'use strict';
// Actual server SDK + local emulator only. Never imports credentials or selects
// a real project; the outer runner removes cloud credentials from the env.
const assert = require('node:assert/strict');
const path = require('node:path');
const { createRequire } = require('node:module');
const Core = require('../dev-tools/security/school_firestore_retention_core.cjs');
const { createSdkAdapter, emulatorAddress } = require('../dev-tools/security/school_firestore_retention.cjs');
const projectId = 'demo-alloflow-session-metadata';
const host = process.env.FIRESTORE_EMULATOR_HOST;
emulatorAddress(host);
if (process.env.FIREBASE_RULES_TEST_PROJECT_ID !== projectId || process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('Synthetic emulator environment required');
const local = createRequire(path.resolve('desktop/web-app/functions/package.json'));
const { Firestore, Timestamp } = local('@google-cloud/firestore');
const db = new Firestore({ projectId, host, ssl: false });
const appId = 'synthetic-retention-emulator';
const base = `artifacts/${appId}/public/data`;
const ownerUid = 'synthetic-host';
const adapters = [];
let checks = 0;
let stage = 'initialization';
const check = (condition, label) => { assert.ok(condition, label); checks++; };
async function rejects(promise, code) {
  let error; try { await promise; } catch (e) { error = e; }
  check(!!error, 'expected rejection');
  if (code) check(error.code === code, 'expected safe error code ' + code);
  return error;
}
async function fixture(id) {
  stage = id;
  const parent = `${base}/sessions/${id}`;
  const paths = [parent, `${parent}/boardAnswers/learner`, `${parent}/boardAnswers/missing-container/notes/leaf`,
    `${base}/session_assets/${id}-asset`, `${base}/session_assets/${id}-asset/chunks/part`,
    ...['signaling', 'pictionary-signaling', 'quiz-signaling'].map(name => `${base}/${name}/${id}/peers/learner`)];
  const batch = db.batch();
  batch.set(db.doc(parent), { kind: 'assignment', hostId: ownerUid, expiresAt: Timestamp.fromMillis(Date.now() - 3600000), lesson: 'SYNTHETIC_BODY_CANARY' });
  for (const p of paths.slice(1)) batch.set(db.doc(p), p === paths[3]
    ? { ownerUid, parentId: id, parentKind: 'assignment', kind: 'manifest', expiresAt: Timestamp.fromMillis(Date.now() + 3600000), content: 'SYNTHETIC_BODY_CANARY' }
    : { content: 'SYNTHETIC_BODY_CANARY' });
  const unrelated = `${base}/sessions/${id}-other`;
  batch.set(db.doc(unrelated), { kind: 'assignment', hostId: ownerUid, expiresAt: Timestamp.fromMillis(Date.now() - 3600000), content: 'unrelated synthetic content' });
  await batch.commit();
  const scope = { projectId, databaseId: '(default)', appId, sessionId: id, ownerUid };
  const adapter = createSdkAdapter(scope, { emulatorHost: host }); adapters.push(adapter);
  const input = { scope, approvalReference: 'SYNTHETIC-APPROVED-DISPOSITION', holdsReviewed: true };
  const plan = () => Core.createPlan(adapter, input);
  const options = planValue => ({ reviewedHash: planValue.planHash, confirmProject: projectId, execute: true, holdsReviewed: true, writersPaused: true });
  return { parent, paths, unrelated, scope, adapter, input, plan, options };
}

(async () => {
  try {
    const h = await fixture('DELETE1');
    const metadata = await h.adapter.get(h.parent);
    check(!JSON.stringify(metadata).includes('SYNTHETIC_BODY_CANARY'), 'SDK field mask excludes record bodies');
    const collections = await h.adapter.listCollections(h.parent);
    check(collections.includes(h.parent + '/boardAnswers'), 'paged collection enumeration');
    const refs = await h.adapter.listDocuments(h.parent + '/boardAnswers');
    check(refs.includes(h.parent + '/boardAnswers/missing-container'), 'showMissing preserves orphan traversal');
    const plan = await h.plan();
    check(plan.manifest.documents.length === 8, 'all scoped docs, nested children and three signaling trees');
    check(!JSON.stringify(plan).includes('SYNTHETIC_BODY_CANARY'), 'plan contains no record bodies');
    const dry = await Core.applyPlan(h.adapter, plan, { reviewedHash: plan.planHash, confirmProject: projectId });
    check(dry.status === 'dry-run' && (await db.doc(h.parent).get()).exists, 'default dry run does not delete');
    const order = [], remove = h.adapter.delete.bind(h.adapter);
    h.adapter.delete = async (...args) => { order.push(args[0]); return remove(...args); };
    const receipt = await Core.applyPlan(h.adapter, plan, h.options(plan));
    check(receipt.status === 'verified-empty-at-check' && receipt.verifiedAbsent === 8 && receipt.remainingCount === 0, 'verified scoped deletion');
    check(order.at(-1) === h.parent, 'parent deleted last');
    check((await db.getAll(...h.paths.map(p => db.doc(p)))).every(s => !s.exists), 'independent SDK read verifies all scoped documents absent');
    check((await db.doc(h.unrelated).get()).exists, 'unrelated assignment remains');
    check(!JSON.stringify(receipt).includes('SYNTHETIC_BODY_CANARY') && !JSON.stringify(receipt).includes('/boardAnswers/'), 'receipt omits content and exact paths');

    const stale = await fixture('STALE1'); const old = await stale.plan();
    await db.doc(stale.paths[1]).set({ content: 'new synthetic work' });
    await rejects(Core.applyPlan(stale.adapter, old, stale.options(old)), 'RETENTION_SCOPE_CHANGED');
    check((await db.doc(stale.parent).get()).exists && (await db.doc(stale.paths[1]).get()).data().content === 'new synthetic work', 'stale plan preserves current work');

    const held = await fixture('HELD01');
    await db.doc(held.paths[1]).set({ legalHold: true }, { merge: true });
    await rejects(held.plan(), 'RETENTION_HOLD_PRESENT');
    check((await db.doc(held.parent).get()).exists, 'held records retained');

    const malformed = await fixture('BADMAP');
    await db.doc(malformed.parent).update({ expiresAt: { seconds: 100, nanoseconds: 0 } });
    // Adapter failures are deliberately normalized by the core so provider
    // messages or invented error codes cannot become diagnostics.
    await rejects(malformed.plan(), 'RETENTION_OPERATION_FAILED');
    check((await db.doc(malformed.parent).get()).exists, 'timestamp-shaped map never authorizes deletion');

    const race = await fixture('RACE01'); const rp = await race.plan();
    const originalDelete = race.adapter.delete.bind(race.adapter); let changed;
    race.adapter.delete = async (p, v, guard) => { if (!changed) { changed = p; await db.doc(p).update({ content: 'changed between check and delete' }); } return originalDelete(p, v, guard); };
    const raceError = await rejects(Core.applyPlan(race.adapter, rp, race.options(rp)), 'RETENTION_OPERATION_FAILED');
    check(raceError.receipt.status === 'incomplete' && raceError.receipt.deleteAcknowledged === 0, 'SDK updateTime precondition rejects racing change');
    check((await db.doc(changed).get()).exists && (await db.doc(race.parent).get()).exists, 'racing document and parent retained');

    const newChild = await fixture('NEWCH1'); const np = await newChild.plan();
    const expectedChildren = np.manifest.documents.length - 1; let removed = 0;
    const childDelete = newChild.adapter.delete.bind(newChild.adapter);
    const created = newChild.parent + '/boardAnswers/new-missing-container/notes/new-leaf';
    newChild.adapter.delete = async (p, v, guard) => { await childDelete(p, v, guard); if (++removed === expectedChildren) await db.doc(created).set({ content: 'new synthetic child' }); };
    const newError = await rejects(Core.applyPlan(newChild.adapter, np, newChild.options(np)), 'RETENTION_SCOPE_CHANGED');
    check(newError.receipt.parentDeleted === false && (await db.doc(created).get()).exists && (await db.doc(newChild.parent).get()).exists, 'new orphan discovered before parent deletion');

    const noOp = await fixture('NOOP01'); const noPlan = await noOp.plan();
    noOp.adapter.delete = async () => {};
    const noError = await rejects(Core.applyPlan(noOp.adapter, noPlan, noOp.options(noPlan)), 'RETENTION_DELETE_NOT_VERIFIED');
    check(noError.receipt.status === 'incomplete' && noError.receipt.verifiedAbsent === 0, 'acknowledgment alone is not a deletion receipt');

    const mismatch = await fixture('OWNER1');
    await db.doc(base + '/session_assets/unrelated-owner').set({ parentId: 'OWNER1', parentKind: 'assignment', ownerUid: 'other-owner' });
    await rejects(mismatch.plan(), 'RETENTION_ASSET_SCOPE_MISMATCH');
    check((await db.doc(mismatch.parent).get()).exists, 'ownership mismatch preserves scope');

    const holdRace = await fixture('HOLDR1'); const hp = await holdRace.plan();
    const holdDelete = holdRace.adapter.delete.bind(holdRace.adapter); let holdAdded = false;
    holdRace.adapter.delete = async (p, v, guard) => { if (!holdAdded) { holdAdded = true; await db.doc(holdRace.parent).update({ legalHold: true }); } return holdDelete(p, v, guard); };
    const holdError = await rejects(Core.applyPlan(holdRace.adapter, hp, holdRace.options(hp)), 'RETENTION_OPERATION_FAILED');
    check(holdError.receipt.status === 'incomplete' && holdError.receipt.deleteAcknowledged === 0 && holdError.receipt.verifiedAbsent === 0, 'transaction binds newly added parent hold before child deletion');
    check((await db.getAll(...holdRace.paths.map(p => db.doc(p)))).every(s => s.exists), 'new hold preserves every scoped record');
    console.log(JSON.stringify({ passed: true, checks, projectId, scope: 'Synthetic emulator fixtures only', serverSdk: local('@google-cloud/firestore/package.json').version }));
  } finally {
    await Promise.allSettled(adapters.map(a => a.close()));
    await db.terminate();
  }
})().catch(error => { console.error(JSON.stringify({ stage, code: error.code || error.name || 'SYNTHETIC_RETENTION_TEST_FAILED', assertion: error.code === 'ERR_ASSERTION' ? error.message : undefined })); process.exitCode = 1; });
