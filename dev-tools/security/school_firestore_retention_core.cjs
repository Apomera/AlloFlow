'use strict';

// Explicitly scoped, reviewed record disposition for an OWNED Firestore project.
// This module does not load credentials, open a connection, or infer a district's
// records schedule. The injected adapter must return metadata only.
const crypto = require('node:crypto');
const KIND = 'alloflow-firestore-retention-plan';
const LIMITS = Object.freeze({ documents: 500, structuralPaths: 1000, collections: 300, depth: 10, planAgeMs: 15 * 60 * 1000 });
const METADATA_FIELDS = Object.freeze(['kind', 'hostId', 'ownerUid', 'parentId', 'parentKind', 'expiresAt', 'legalHold', 'retentionHold', 'holdUntil', 'retentionHoldUntil', 'retention']);
const SIGNALING = Object.freeze(['signaling', 'pictionary-signaling', 'quiz-signaling']);
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype', '.', '..']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const clone = value => JSON.parse(JSON.stringify(value));
const internalErrors = new WeakMap();

function trustedError(code) {
  const error = new Error(code);
  Object.defineProperty(error, 'code', { value: code, enumerable: true });
  internalErrors.set(error, code); return error;
}
function fail(code) { throw trustedError(code); }
function isTrustedError(error) { return internalErrors.has(error); }
function safeErrorCode(error) { return internalErrors.get(error) || 'RETENTION_OPERATION_FAILED'; }
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function sha(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function hashPlan(plan) { const { planHash, ...body } = plan; return sha(canonical(body)); }
function object(value) { return !!value && typeof value === 'object' && !Array.isArray(value) && [null, Object.prototype].includes(Object.getPrototypeOf(value)); }
function exact(value, keys) {
  if (!object(value) || Object.keys(value).some(key => !keys.includes(key) || FORBIDDEN.has(key))) fail('RETENTION_PLAN_INVALID');
}
function identifier(value, min = 1, max = 128) {
  return typeof value === 'string' && value.length >= min && value.length <= max
    && /^[A-Za-z0-9][A-Za-z0-9_.:@-]*$/.test(value) && !FORBIDDEN.has(value);
}
function approvalReference(value) { return typeof value === 'string' && value.trim() === value && value.length >= 1 && value.length <= 160 && !/[\x00-\x1f\x7f]/.test(value); }
function validateScope(scope) {
  exact(scope, ['projectId', 'databaseId', 'appId', 'sessionId', 'ownerUid']);
  if (typeof scope.projectId !== 'string' || !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(scope.projectId)
    || !(scope.databaseId === '(default)' || (typeof scope.databaseId === 'string' && /^[a-z][a-z0-9-]{2,62}$/.test(scope.databaseId)))
    || !identifier(scope.appId) || !identifier(scope.sessionId, 5, 80) || !identifier(scope.ownerUid)) fail('RETENTION_SCOPE_INVALID');
  return clone(scope);
}
function instant(value) {
  let ms;
  if (value instanceof Date) ms = value.getTime();
  else if (value && typeof value.toMillis === 'function') ms = value.toMillis();
  else if (object(value) && Number.isSafeInteger(Number(value.seconds)) && Number.isInteger(value.nanoseconds ?? value.nanos)) ms = Number(value.seconds) * 1000 + (value.nanoseconds ?? value.nanos) / 1e6;
  // Strings and bare numbers are deliberately NOT Firestore timestamp values.
  if (!Number.isFinite(ms) || ms < 0 || ms > 253402300799999) return null;
  return ms;
}
function nowMs(options) {
  const value = typeof options.now === 'function' ? options.now() : Date.now();
  const ms = value instanceof Date ? value.getTime() : value;
  if (!Number.isFinite(ms) || ms < 0) fail('RETENTION_CLOCK_INVALID');
  return ms;
}
function version(value) {
  exact(value, ['seconds', 'nanoseconds']);
  if (!Number.isSafeInteger(value.seconds) || value.seconds < 0 || value.seconds > 253402300799
    || !Number.isInteger(value.nanoseconds) || value.nanoseconds < 0 || value.nanoseconds > 999999999) fail('RETENTION_VERSION_INVALID');
  return { seconds: value.seconds, nanoseconds: value.nanoseconds };
}
function pathParts(value) {
  if (typeof value !== 'string' || value.length > 2048) fail('RETENTION_PATH_INVALID');
  const parts = value.split('/');
  if (!parts.length || !parts.every(part => identifier(part))) fail('RETENTION_PATH_INVALID');
  return parts;
}
function rootPaths(scope) {
  const base = `artifacts/${scope.appId}/public/data`;
  return { base, session: `${base}/sessions/${scope.sessionId}`, assets: `${base}/session_assets`, signaling: SIGNALING.map(name => `${base}/${name}/${scope.sessionId}`) };
}
function inTree(path, tree) { return path === tree || path.startsWith(tree + '/'); }
function checkHold(data, cutoff) {
  if (!object(data)) fail('RETENTION_METADATA_INVALID');
  for (const key of ['legalHold', 'retentionHold']) if (own(data, key) && data[key] !== false && data[key] != null) fail('RETENTION_HOLD_PRESENT');
  for (const key of ['holdUntil', 'retentionHoldUntil']) {
    if (!own(data, key) || data[key] == null) continue;
    const until = instant(data[key]);
    if (until == null || until > cutoff) fail('RETENTION_HOLD_PRESENT');
  }
  if (own(data, 'retention') && data.retention != null) {
    if (!object(data.retention)) fail('RETENTION_HOLD_PRESENT');
    if (own(data.retention, 'hold') && data.retention.hold !== false && data.retention.hold != null) fail('RETENTION_HOLD_PRESENT');
    if (own(data.retention, 'holdUntil') && data.retention.holdUntil != null) {
      const until = instant(data.retention.holdUntil);
      if (until == null || until > cutoff) fail('RETENTION_HOLD_PRESENT');
    }
  }
}
function checkSnapshot(snapshot, path, scope, cutoff) {
  if (!object(snapshot) || snapshot.path !== path || typeof snapshot.exists !== 'boolean') fail('RETENTION_ADAPTER_INVALID');
  if (!snapshot.exists) return null;
  const data = snapshot.data;
  checkHold(data, cutoff);
  if (own(data, 'ownerUid') && data.ownerUid !== scope.ownerUid) fail('RETENTION_OWNER_MISMATCH');
  return { path, version: version(snapshot.version) };
}
function ensureAdapter(adapter) {
  for (const name of ['get', 'listCollections', 'listDocuments', 'findAssets', 'delete']) if (!adapter || typeof adapter[name] !== 'function') fail('RETENTION_ADAPTER_INVALID');
}
async function call(adapter, method, ...args) {
  try { return await adapter[method](...args); }
  catch (error) { if (internalErrors.has(error)) throw error; fail('RETENTION_OPERATION_FAILED'); }
}

async function inspect(adapter, scope, cutoff, { allowMissingParent = false } = {}) {
  ensureAdapter(adapter);
  const paths = rootPaths(scope), documents = new Map(), structural = new Set(), collections = new Set();
  let assignmentExpiresAt = null;
  const parent = await call(adapter, 'get', paths.session);
  const parentRecord = checkSnapshot(parent, paths.session, scope, cutoff);
  if (!parentRecord && !allowMissingParent) fail('RETENTION_PARENT_MISSING');
  if (parentRecord) {
    if (parent.data.kind !== 'assignment' || parent.data.hostId !== scope.ownerUid) fail('RETENTION_NOT_OWNED_ASSIGNMENT');
    const expiresAt = instant(parent.data.expiresAt);
    if (expiresAt == null || expiresAt > cutoff) fail('RETENTION_ASSIGNMENT_NOT_EXPIRED');
    assignmentExpiresAt = new Date(expiresAt).toISOString();
  }
  async function walk(path, tree, role, depth, supplied) {
    const parts = pathParts(path);
    if (parts.length % 2 || !inTree(path, tree) || depth > LIMITS.depth) fail('RETENTION_PATH_INVALID');
    if (structural.has(path)) return;
    structural.add(path);
    if (structural.size > LIMITS.structuralPaths) fail('RETENTION_SCOPE_TOO_LARGE');
    const snapshot = supplied || await call(adapter, 'get', path);
    const entry = checkSnapshot(snapshot, path, scope, cutoff);
    if (entry) {
      entry.role = depth === 0 ? role : role === 'session' ? 'session-child' : role === 'asset' ? 'asset-child' : 'signaling-child';
      documents.set(path, entry);
      if (documents.size > LIMITS.documents) fail('RETENTION_SCOPE_TOO_LARGE');
    }
    const nextCollections = await call(adapter, 'listCollections', path);
    if (!Array.isArray(nextCollections)) fail('RETENTION_ADAPTER_INVALID');
    for (const collection of nextCollections.slice().sort()) {
      const collectionParts = pathParts(collection);
      if (collectionParts.length !== parts.length + 1 || !collection.startsWith(path + '/') || collections.has(collection)) fail('RETENTION_ADAPTER_INVALID');
      collections.add(collection);
      if (collections.size > LIMITS.collections) fail('RETENTION_SCOPE_TOO_LARGE');
      const children = await call(adapter, 'listDocuments', collection);
      if (!Array.isArray(children) || children.length > LIMITS.structuralPaths) fail('RETENTION_SCOPE_TOO_LARGE');
      const unique = new Set(children);
      if (unique.size !== children.length) fail('RETENTION_ADAPTER_INVALID');
      for (const child of children.slice().sort()) {
        if (pathParts(child).length !== collectionParts.length + 1 || !child.startsWith(collection + '/')) fail('RETENTION_ADAPTER_INVALID');
        await walk(child, tree, role, depth + 1);
      }
    }
  }
  await walk(paths.session, paths.session, 'session', 0, parent);
  const assets = await call(adapter, 'findAssets', paths.base, scope.sessionId, LIMITS.documents + 1);
  if (!Array.isArray(assets) || assets.length > LIMITS.documents) fail('RETENTION_SCOPE_TOO_LARGE');
  const assetPaths = new Set();
  for (const asset of assets) {
    if (!object(asset) || !asset.exists || pathParts(asset.path).length !== 6 || !asset.path.startsWith(paths.assets + '/')) fail('RETENTION_ADAPTER_INVALID');
    if (!object(asset.data) || asset.data.parentId !== scope.sessionId || asset.data.parentKind !== 'assignment' || asset.data.ownerUid !== scope.ownerUid) fail('RETENTION_ASSET_SCOPE_MISMATCH');
    if (assetPaths.has(asset.path)) fail('RETENTION_ADAPTER_INVALID');
    assetPaths.add(asset.path);
    await walk(asset.path, asset.path, 'asset', 0, asset);
  }
  for (const signaling of paths.signaling) await walk(signaling, signaling, 'signaling', 0);
  return { documents: [...documents.values()].sort((a, b) => a.path.localeCompare(b.path)), structuralPaths: [...structural].sort(), collectionPaths: [...collections].sort(), assignmentExpiresAt };
}

async function createPlan(adapter, input, options = {}) {
  exact(input, ['scope', 'approvalReference', 'holdsReviewed']);
  const scope = validateScope(input.scope), now = nowMs(options);
  if (input.holdsReviewed !== true) fail('RETENTION_HOLD_REVIEW_REQUIRED');
  if (!approvalReference(input.approvalReference)) fail('RETENTION_APPROVAL_REQUIRED');
  const manifest = await inspect(adapter, scope, now);
  const plan = { kind: KIND, version: 1, createdAt: new Date(now).toISOString(), validUntil: new Date(now + LIMITS.planAgeMs).toISOString(), scope,
    approvalReference: input.approvalReference, holdsReviewed: true, manifest };
  plan.planHash = hashPlan(plan);
  return plan;
}
function validatePlanShape(plan, options, now) {
  exact(plan, ['kind', 'version', 'createdAt', 'validUntil', 'scope', 'approvalReference', 'holdsReviewed', 'manifest', 'planHash']);
  if (plan.kind !== KIND || plan.version !== 1 || plan.holdsReviewed !== true || !approvalReference(plan.approvalReference)) fail('RETENTION_PLAN_INVALID');
  validateScope(plan.scope);
  const created = Date.parse(plan.createdAt), until = Date.parse(plan.validUntil);
  if (!Number.isFinite(created) || !Number.isFinite(until) || new Date(created).toISOString() !== plan.createdAt || new Date(until).toISOString() !== plan.validUntil || until - created !== LIMITS.planAgeMs || created > now || now > until) fail('RETENTION_PLAN_EXPIRED');
  exact(plan.manifest, ['documents', 'structuralPaths', 'collectionPaths', 'assignmentExpiresAt']);
  const manifest = plan.manifest;
  if (!Array.isArray(manifest.documents) || !manifest.documents.length || manifest.documents.length > LIMITS.documents
    || !Array.isArray(manifest.structuralPaths) || manifest.structuralPaths.length > LIMITS.structuralPaths
    || !Array.isArray(manifest.collectionPaths) || manifest.collectionPaths.length > LIMITS.collections) fail('RETENTION_PLAN_INVALID');
  const roots = rootPaths(plan.scope), seen = new Set();
  for (const entry of manifest.documents) {
    exact(entry, ['path', 'version', 'role']); pathParts(entry.path); version(entry.version);
    if (seen.has(entry.path) || !['session', 'session-child', 'asset', 'asset-child', 'signaling', 'signaling-child'].includes(entry.role)) fail('RETENTION_PLAN_INVALID');
    seen.add(entry.path);
    const sessionTree = inTree(entry.path, roots.session);
    const signalingTree = roots.signaling.some(tree => inTree(entry.path, tree));
    const assetTree = entry.path.startsWith(roots.assets + '/');
    if (!sessionTree && !signalingTree && !assetTree) fail('RETENTION_PATH_INVALID');
  }
  for (const p of [...manifest.structuralPaths, ...manifest.collectionPaths]) pathParts(p);
  if (!seen.has(roots.session)) fail('RETENTION_PLAN_INVALID');
  if (options.confirmProject !== plan.scope.projectId) fail('RETENTION_PROJECT_CONFIRMATION_REQUIRED');
  if (typeof plan.planHash !== 'string' || !/^[a-f0-9]{64}$/.test(plan.planHash) || options.reviewedHash !== plan.planHash || hashPlan(plan) !== plan.planHash) fail('RETENTION_PLAN_HASH_MISMATCH');
  return created;
}
function validatePlan(plan, options = {}) { return validatePlanShape(plan, options, nowMs(options)); }

async function applyPlan(adapter, plan, options = {}) {
  ensureAdapter(adapter);
  const started = nowMs(options), cutoff = validatePlanShape(plan, options, started), paths = rootPaths(plan.scope);
  if (options.execute === true && (options.holdsReviewed !== true || options.writersPaused !== true)) fail('RETENTION_EXECUTION_ACKNOWLEDGMENTS_REQUIRED');
  const current = await inspect(adapter, plan.scope, cutoff);
  if (canonical(current) !== canonical(plan.manifest)) fail('RETENTION_SCOPE_CHANGED');
  const receipt = { kind: 'alloflow-firestore-retention-receipt', version: 1, planHash: plan.planHash,
    scopeHash: sha(canonical(plan.scope)), projectId: plan.scope.projectId, databaseId: plan.scope.databaseId,
    approvalReference: plan.approvalReference, startedAt: new Date(started).toISOString(), status: 'dry-run',
    acknowledgments: { holdsReviewed: options.holdsReviewed === true, writersPaused: options.writersPaused === true },
    plannedDocuments: current.documents.length, deleteRequested: 0, deleteAcknowledged: 0, verifiedAbsent: 0, parentDeleted: false,
    remainingCount: current.documents.length, remainingPathHashes: current.documents.map(entry => sha(entry.path)), failureCode: null,
    verification: 'No writes performed. Acknowledgments are operator statements, not proof of a write freeze or legal-hold review.' };
  if (options.execute !== true) return receipt;
  const parentEntry = current.documents.find(entry => entry.path === paths.session);
  const entries = current.documents.filter(entry => entry.path !== paths.session).sort((a, b) => b.path.split('/').length - a.path.split('/').length || a.path.localeCompare(b.path));
  let target = null;
  async function unchanged(entry) {
    if (nowMs(options) > Date.parse(plan.validUntil)) fail('RETENTION_PLAN_EXPIRED');
    const snap = await call(adapter, 'get', entry.path);
    const got = checkSnapshot(snap, entry.path, plan.scope, nowMs(options));
    if (!got || canonical(got.version) !== canonical(entry.version)) fail('RETENTION_DOCUMENT_CHANGED');
  }
  async function remove(entry) {
    target = entry.path;
    await unchanged(parentEntry);
    if (entry.path !== paths.session) await unchanged(entry);
    receipt.deleteRequested++;
    // The adapter must atomically bind the parent read and this conditional
    // delete (for example in a Firestore transaction). A separate parent get
    // cannot protect a legal-hold/version change just before the child write.
    await call(adapter, 'delete', entry.path, clone(entry.version), {
      parentPath: paths.session, parentVersion: clone(parentEntry.version)
    });
    receipt.deleteAcknowledged++;
    const after = await call(adapter, 'get', entry.path);
    if (!after || after.path !== entry.path || after.exists !== false) fail('RETENTION_DELETE_NOT_VERIFIED');
    receipt.verifiedAbsent++;
    if (entry.path === paths.session) receipt.parentDeleted = true;
  }
  try {
    receipt.status = 'incomplete';
    for (const entry of entries) await remove(entry);
    const beforeParent = await inspect(adapter, plan.scope, cutoff);
    if (beforeParent.documents.length !== 1 || beforeParent.documents[0].path !== paths.session
      || canonical(beforeParent.documents[0].version) !== canonical(parentEntry.version)) fail('RETENTION_SCOPE_CHANGED');
    await remove(parentEntry); // Always last; changed/new work keeps the parent.
    const after = await inspect(adapter, plan.scope, cutoff, { allowMissingParent: true });
    receipt.remainingCount = after.documents.length;
    receipt.remainingPathHashes = after.documents.map(entry => sha(entry.path));
    if (after.documents.length) fail('RETENTION_REMAINING_RECORDS');
    receipt.status = 'verified-empty-at-check';
    receipt.verification = 'Scoped backend records were absent at this check. Other stores and future writes are not covered; actual writer quiescence remains required.';
  } catch (error) {
    receipt.failureCode = safeErrorCode(error);
    receipt.failurePathHash = target ? sha(target) : null;
    receipt.verification = 'Deletion incomplete or unverified. Do not interpret this receipt as an all-store deletion result. Keep or replan remaining records after review.';
    try {
      const remaining = await inspect(adapter, plan.scope, cutoff, { allowMissingParent: true });
      receipt.remainingCount = remaining.documents.length; receipt.remainingPathHashes = remaining.documents.map(entry => sha(entry.path));
    } catch (_) { receipt.remainingCount = null; receipt.remainingPathHashes = []; }
    receipt.completedAt = new Date(nowMs(options)).toISOString();
    const out = trustedError(receipt.failureCode); out.receipt = receipt; throw out;
  }
  receipt.completedAt = new Date(nowMs(options)).toISOString();
  return receipt;
}

module.exports = { createPlan, applyPlan, validatePlan, isTrustedError, safeErrorCode, canonical, hashPlan, validateScope, LIMITS, METADATA_FIELDS };
