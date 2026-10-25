#!/usr/bin/env node
'use strict';

// Owned-project operator tool. Loading this module does not load credentials,
// create SDK clients, inspect an account, or perform any network operation.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const Core = require('./school_firestore_retention_core.cjs');
const ROOT = path.resolve(__dirname, '../..');
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT = 15000;
const trustedErrors = new WeakMap();
function fail(code) { const e = new Error(code); Object.defineProperty(e, 'code', { value: code, enumerable: true }); trustedErrors.set(e, code); throw e; }
function safeErrorCode(error) { return trustedErrors.get(error) || Core.safeErrorCode(error); }
function emulatorAddress(value) {
  if (typeof value !== 'string' || !/^127\.0\.0\.1:[1-9][0-9]{0,4}$/.test(value)) fail('RETENTION_EMULATOR_INVALID');
  const port = Number(value.split(':')[1]);
  if (port > 65535) fail('RETENTION_EMULATOR_INVALID');
  return { hostname: '127.0.0.1', port };
}
function resolveSdk() {
  const local = createRequire(path.join(ROOT, 'desktop/web-app/functions/package.json'));
  return { sdk: local('@google-cloud/firestore'), grpc: () => local('google-gax').grpc };
}
function createSdkAdapter(scopeValue, options = {}) {
  const scope = Core.validateScope(scopeValue);
  const inheritedEmulator = process.env.FIRESTORE_EMULATOR_HOST;
  if (inheritedEmulator && options.emulatorHost !== inheritedEmulator) fail('RETENTION_EMULATOR_EXPLICIT_REQUIRED');
  const emulator = options.emulatorHost ? emulatorAddress(options.emulatorHost) : null;
  if (emulator && !scope.projectId.startsWith('demo-')) fail('RETENTION_EMULATOR_DEMO_PROJECT_REQUIRED');
  const loaded = options.sdk ? { sdk: options.sdk, grpc: options.grpc } : resolveSdk();
  const sdk = loaded.sdk;
  const settings = { projectId: scope.projectId, databaseId: scope.databaseId };
  const lowSettings = { projectId: scope.projectId, servicePath: 'firestore.googleapis.com', fallback: false };
  if (emulator) {
    settings.host = options.emulatorHost; settings.ssl = false;
    lowSettings.servicePath = emulator.hostname; lowSettings.port = emulator.port;
    lowSettings.sslCreds = loaded.grpc().credentials.createInsecure();
    lowSettings.customHeaders = { Authorization: 'Bearer owner' };
  }
  const db = new sdk.Firestore(settings);
  const listing = new sdk.v1.FirestoreClient(lowSettings);
  const prefix = `projects/${scope.projectId}/databases/${scope.databaseId}/documents/`;
  const base = `artifacts/${scope.appId}/public/data`;
  const metadata = Core.METADATA_FIELDS.slice();
  const pathOk = (value, collection = false) => {
    if (typeof value !== 'string' || !value.startsWith(base + '/') || value.length > 2048) fail('RETENTION_PATH_INVALID');
    const parts = value.split('/');
    if (parts.length % 2 !== (collection ? 1 : 0) || parts.some(p => !p || ['.', '..', '__proto__', 'prototype', 'constructor'].includes(p))) fail('RETENTION_PATH_INVALID');
    return value;
  };
  function snapshot(snap) {
    if (!snap || typeof snap.exists !== 'boolean') fail('RETENTION_ADAPTER_INVALID');
    if (!snap.exists) return { path: snap.ref.path, exists: false, data: null, version: null };
    const data = snap.data();
    // A Firestore map resembling {seconds,nanoseconds} is not a Timestamp.
    // The generic core accepts timestamp-shaped adapter metadata, so enforce
    // the SDK's actual field types at this production boundary.
    const timestamp = value => value == null || value instanceof sdk.Timestamp || value instanceof Date;
    for (const field of ['expiresAt', 'holdUntil', 'retentionHoldUntil']) if (!timestamp(data[field])) fail('RETENTION_METADATA_INVALID');
    if (data.retention && typeof data.retention === 'object' && !timestamp(data.retention.holdUntil)) fail('RETENTION_METADATA_INVALID');
    return { path: snap.ref.path, exists: true, data, version: { seconds: snap.updateTime.seconds, nanoseconds: snap.updateTime.nanoseconds } };
  }
  async function paged(method, request, maximum, convert) {
    const output = [], tokens = new Set(); let pageToken = '';
    do {
      const response = await listing[method]({ ...request, pageSize: PAGE_SIZE, pageToken }, { autoPaginate: false, timeout: REQUEST_TIMEOUT,
        ...(emulator ? { otherArgs: { headers: { Authorization: 'Bearer owner' } } } : {}) });
      if (!Array.isArray(response) || !Array.isArray(response[0])) fail('RETENTION_ADAPTER_INVALID');
      for (const item of response[0]) {
        if (output.length >= maximum) fail('RETENTION_SCOPE_TOO_LARGE');
        output.push(convert(item));
      }
      pageToken = response[2]?.nextPageToken || '';
      if (typeof pageToken !== 'string' || (pageToken && tokens.has(pageToken)) || tokens.size > 30) fail('RETENTION_ADAPTER_INVALID');
      tokens.add(pageToken);
    } while (pageToken);
    return output;
  }
  return {
    async get(value) {
      const [snap] = await db.getAll(db.doc(pathOk(value)), { fieldMask: metadata });
      return snapshot(snap);
    },
    async listCollections(value) {
      const doc = pathOk(value);
      return paged('listCollectionIds', { parent: prefix + doc }, Core.LIMITS.collections,
        id => pathOk(doc + '/' + id, true));
    },
    async listDocuments(value) {
      const collection = pathOk(value, true), parts = collection.split('/');
      const collectionId = parts.pop(), parent = parts.join('/');
      return paged('listDocuments', { parent: prefix + parent, collectionId, showMissing: true, mask: { fieldPaths: [] } }, Core.LIMITS.structuralPaths,
        doc => { if (!doc || typeof doc.name !== 'string' || !doc.name.startsWith(prefix)) fail('RETENTION_ADAPTER_INVALID'); return pathOk(doc.name.slice(prefix.length)); });
    },
    async findAssets(expectedBase, sessionId, limit) {
      if (expectedBase !== base || sessionId !== scope.sessionId || !Number.isInteger(limit) || limit > Core.LIMITS.documents + 1 || limit < 1) fail('RETENTION_SCOPE_INVALID');
      const result = await db.collection(base + '/session_assets').where('parentId', '==', sessionId).select(...metadata).limit(limit).get();
      return result.docs.map(snapshot);
    },
    async delete(value, version, guard) {
      if (!version || !Number.isSafeInteger(version.seconds) || !Number.isInteger(version.nanoseconds)) fail('RETENTION_VERSION_INVALID');
      const parent = `${base}/sessions/${scope.sessionId}`;
      if (!guard || guard.parentPath !== parent || !guard.parentVersion || !Number.isSafeInteger(guard.parentVersion.seconds) || !Number.isInteger(guard.parentVersion.nanoseconds)) fail('RETENTION_PARENT_GUARD_REQUIRED');
      const expectedParent = new sdk.Timestamp(guard.parentVersion.seconds, guard.parentVersion.nanoseconds);
      // Bind parent ownership/hold metadata to the same server transaction as
      // the target delete. A new parent hold must not slip between a separate
      // parent read and the target-only updateTime precondition.
      await db.runTransaction(async transaction => {
        const [parentSnapshot] = await transaction.getAll(db.doc(parent), { fieldMask: metadata });
        if (!parentSnapshot.exists || !parentSnapshot.updateTime.isEqual(expectedParent)) fail('RETENTION_DOCUMENT_CHANGED');
        transaction.delete(db.doc(pathOk(value)), { lastUpdateTime: new sdk.Timestamp(version.seconds, version.nanoseconds) });
      }, { maxAttempts: 1 });
    },
    async close() { await Promise.allSettled([db.terminate(), listing.close()]); },
    scope: Object.freeze({ ...scope })
  };
}

const HELP = `Owned Firestore expired-assignment disposition (no default project).
plan --project ID --app-id ID --session ID --owner-uid ID --approval-ref TICKET --holds-reviewed --out FILE
apply --plan FILE --reviewed-hash SHA256 --confirm-project ID --receipt FILE [--execute --holds-reviewed --writers-paused]
Optional --database ID (plan only; default (default)); --emulator-host 127.0.0.1:PORT (demo- project only).
Apply defaults to a dry run. Execute only after authorized retention/hold review and actual writer shutdown.
This tool covers the exact reviewed backend scope, not backups, Drive, browser stores or provider copies.`;
function parseArgs(argv) {
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) return { command: 'help' };
  const command = argv[0]; if (!['plan', 'apply'].includes(command)) fail('RETENTION_USAGE');
  const flags = new Set(['holds-reviewed', 'writers-paused', 'execute']);
  const values = new Set(command === 'plan' ? ['project', 'database', 'app-id', 'session', 'owner-uid', 'approval-ref', 'out', 'emulator-host']
    : ['plan', 'reviewed-hash', 'confirm-project', 'receipt', 'emulator-host']);
  const result = { command };
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) fail('RETENTION_USAGE');
    const key = token.slice(2);
    if (Object.hasOwn(result, key)) fail('RETENTION_USAGE');
    if (flags.has(key)) { if (command === 'plan' && key !== 'holds-reviewed') fail('RETENTION_USAGE'); result[key] = true; }
    else if (values.has(key) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) result[key] = argv[++i];
    else fail('RETENTION_USAGE');
  }
  const required = command === 'plan' ? ['project', 'app-id', 'session', 'owner-uid', 'approval-ref', 'out'] : ['plan', 'reviewed-hash', 'confirm-project', 'receipt'];
  if (required.some(key => !result[key])) fail('RETENTION_USAGE');
  return result;
}
function loadPlan(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) fail('RETENTION_PLAN_INVALID');
  const plan = JSON.parse(fs.readFileSync(file, 'utf8'));
  Core.validateScope(plan.scope);
  if (Core.hashPlan(plan) !== plan.planHash) fail('RETENTION_PLAN_HASH_MISMATCH');
  return plan;
}
async function runCli(argv, io = {}) {
  const stdout = io.stdout || (value => process.stdout.write(value + '\n'));
  const args = parseArgs(argv);
  if (args.command === 'help') { stdout(HELP); return { status: 'help' }; }
  const factory = io.createAdapter || createSdkAdapter;
  let adapter, descriptor;
  try {
    if (args.command === 'plan') {
      const scope = Core.validateScope({ projectId: args.project, databaseId: args.database || '(default)', appId: args['app-id'], sessionId: args.session, ownerUid: args['owner-uid'] });
      if (args['holds-reviewed'] !== true) fail('RETENTION_HOLD_REVIEW_REQUIRED');
      // Reserve the output before making any account/network request.
      descriptor = fs.openSync(args.out, 'wx', 0o600);
      adapter = factory(scope, { emulatorHost: args['emulator-host'] });
      const plan = await Core.createPlan(adapter, { scope, approvalReference: args['approval-ref'], holdsReviewed: true });
      fs.writeFileSync(descriptor, JSON.stringify(plan, null, 2) + '\n');
      stdout(JSON.stringify({ status: 'review-required', planHash: plan.planHash, plannedDocuments: plan.manifest.documents.length }));
      return plan;
    }
    const plan = loadPlan(args.plan);
    if (args['confirm-project'] !== plan.scope.projectId || args['reviewed-hash'] !== plan.planHash) fail('RETENTION_PROJECT_OR_HASH_CONFIRMATION_REQUIRED');
    Core.validatePlan(plan, { confirmProject: args['confirm-project'], reviewedHash: args['reviewed-hash'] });
    if (args.execute && (!args['holds-reviewed'] || !args['writers-paused'])) fail('RETENTION_EXECUTION_ACKNOWLEDGMENTS_REQUIRED');
    descriptor = fs.openSync(args.receipt, 'wx', 0o600);
    fs.writeFileSync(descriptor, JSON.stringify({ kind: 'alloflow-firestore-retention-receipt', version: 1, planHash: plan.planHash, status: 'in-progress-unverified', deletionCompleted: false }) + '\n');
    adapter = factory(plan.scope, { emulatorHost: args['emulator-host'] });
    let receipt;
    try { receipt = await Core.applyPlan(adapter, plan, { reviewedHash: args['reviewed-hash'], confirmProject: args['confirm-project'], execute: args.execute === true, holdsReviewed: args['holds-reviewed'] === true, writersPaused: args['writers-paused'] === true }); }
    catch (error) {
      if (error.receipt) { fs.ftruncateSync(descriptor, 0); fs.writeSync(descriptor, JSON.stringify(error.receipt, null, 2) + '\n', 0, 'utf8'); }
      throw error;
    }
    fs.ftruncateSync(descriptor, 0); fs.writeSync(descriptor, JSON.stringify(receipt, null, 2) + '\n', 0, 'utf8');
    stdout(JSON.stringify({ status: receipt.status, plannedDocuments: receipt.plannedDocuments, verifiedAbsent: receipt.verifiedAbsent, remainingCount: receipt.remainingCount }));
    return receipt;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (adapter && typeof adapter.close === 'function') await adapter.close();
  }
}
module.exports = { createSdkAdapter, parseArgs, loadPlan, runCli, emulatorAddress, safeErrorCode, HELP };
if (require.main === module) runCli(process.argv.slice(2)).catch(error => {
  const code = safeErrorCode(error);
  process.stderr.write(code + '\n'); process.exitCode = 1;
});
