#!/usr/bin/env node
'use strict';

// Offline evidence review only. This module has no Google client, network call,
// credential lookup, deletion endpoint, or filesystem mutation.
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const TYPES = ['pack-manifest', 'pack-chunk', 'activity-sidecar', 'submission', 'delivered-document', 'form-response-store', 'admin-recovery-note', 'live-session'];
const AREAS = ['drive-trash', 'vault-and-provider-retention', 'exports-and-backups', 'recipient-copies'];
const ACTIONS = ['trash', 'permanent-delete', 'end-session', 'retain'];
const STATES = ['trashed', 'permanent-delete-confirmed', 'session-ended', 'retained', 'not-found', 'pending', 'failed', 'changed'];
function invalid(message) { const e = new Error(message); e.code = 'MAILBOX_DELETION_REVIEW_INVALID'; throw e; }
function object(value, fields, required = fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid('Expected a plain record.');
  if (Object.keys(value).some(key => !fields.includes(key)) || required.some(key => !Object.hasOwn(value, key))) invalid('Missing or unrecognized evidence fields.');
}
function opaque(value) { return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{2,199}$/.test(value); }
function stamp(value) { return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().replace('.000Z', 'Z') === value.replace('.000Z', 'Z'); }
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function validatePlan(plan) {
  object(plan, ['kind', 'version', 'requestRef', 'scope', 'reviewedAt', 'resources']);
  if (plan.kind !== 'alloflow-mailbox-deletion-plan' || plan.version !== 1 || !opaque(plan.requestRef) || !stamp(plan.reviewedAt)) invalid('Invalid plan identity or review timestamp.');
  object(plan.scope, ['accountRef', 'scriptId', 'mailboxFolderId', 'deliveryFolderId']);
  if (Object.values(plan.scope).some(value => !opaque(value))) invalid('Use opaque scope identifiers, not URLs or credentials.');
  if (plan.scope.mailboxFolderId === plan.scope.deliveryFolderId) invalid('Mailbox and delivery folders must be distinct.');
  if (!Array.isArray(plan.resources) || plan.resources.length < 1 || plan.resources.length > 1000) invalid('A bounded, nonempty resource list is required.');
  const refs = new Set(), ids = new Set();
  for (const row of plan.resources) {
    object(row, ['ref', 'type', 'id', 'parentId', 'modifiedAt', 'hold', 'action']);
    if (!opaque(row.ref) || !opaque(row.id) || !TYPES.includes(row.type) || !ACTIONS.includes(row.action) || !['clear', 'held', 'unknown'].includes(row.hold)) invalid('Invalid resource review.');
    if (refs.has(row.ref) || ids.has(row.id)) invalid('Duplicate resource review.');
    refs.add(row.ref); ids.add(row.id);
    if (row.hold !== 'clear' && row.action !== 'retain') invalid('Held or unreviewed resources cannot be planned for deletion.');
    if (row.type === 'live-session') {
      if (!/^[A-Z0-9]{4,8}$/.test(row.id) || row.parentId !== null || row.modifiedAt !== null || !['end-session', 'retain'].includes(row.action)) invalid('Invalid live-session scope.');
    } else {
      const expectedParent = ['delivered-document', 'form-response-store'].includes(row.type) ? plan.scope.deliveryFolderId : plan.scope.mailboxFolderId;
      if (row.parentId !== expectedParent || !stamp(row.modifiedAt) || !['trash', 'permanent-delete', 'retain'].includes(row.action)) invalid('Drive resources require the exact reviewed parent and modification time.');
      if (Date.parse(row.modifiedAt) > Date.parse(plan.reviewedAt)) invalid('Resource changed after the plan review.');
    }
  }
  return plan;
}
function planDigest(plan) { validatePlan(plan); return createHash('sha256').update(canonical(plan)).digest('hex'); }
function inspectPacket(plan, receipt) {
  validatePlan(plan);
  object(receipt, ['kind', 'version', 'requestRef', 'scope', 'planSha256', 'outcomes', 'externalReviews']);
  if (receipt.kind !== 'alloflow-mailbox-deletion-receipt' || receipt.version !== 1 || receipt.requestRef !== plan.requestRef || canonical(receipt.scope) !== canonical(plan.scope) || receipt.planSha256 !== planDigest(plan)) invalid('Receipt does not match the reviewed plan and scope.');
  if (!Array.isArray(receipt.outcomes) || receipt.outcomes.length > 1000 || !Array.isArray(receipt.externalReviews) || receipt.externalReviews.length !== AREAS.length) invalid('Invalid outcome or external-review list.');
  const resources = new Map(plan.resources.map(row => [row.ref, row])), observed = new Set();
  const counts = { planned: plan.resources.length, reported: 0, pending: 0, failed: 0, changed: 0, trashed: 0, permanentlyDeletedReported: 0, sessionsEndedReported: 0, retained: 0, notFound: 0, unknownHold: plan.resources.filter(row => row.hold === 'unknown').length };
  for (const outcome of receipt.outcomes) {
    object(outcome, ['ref', 'state', 'checkedAt', 'beforeModifiedAt']);
    const row = resources.get(outcome.ref);
    if (!row || observed.has(outcome.ref) || !STATES.includes(outcome.state) || !stamp(outcome.checkedAt) || Date.parse(outcome.checkedAt) < Date.parse(plan.reviewedAt)) invalid('Unrecognized, duplicate, or mistimed resource outcome.');
    observed.add(outcome.ref); counts.reported++;
    if (row.hold !== 'clear' && !['retained', 'pending', 'failed'].includes(outcome.state)) invalid('Held or unreviewed resources cannot be reported as deleted.');
    if (row.type === 'live-session' ? outcome.beforeModifiedAt !== null : !stamp(outcome.beforeModifiedAt)) invalid('Invalid pre-action observation.');
    const success = ['trashed', 'permanent-delete-confirmed', 'session-ended', 'retained', 'not-found'].includes(outcome.state);
    if (success && row.type !== 'live-session' && outcome.beforeModifiedAt !== row.modifiedAt) invalid('A changed resource needs a new plan, not a success claim.');
    const expected = { trash: 'trashed', 'permanent-delete': 'permanent-delete-confirmed', 'end-session': 'session-ended', retain: 'retained' }[row.action];
    if (success && outcome.state !== expected && outcome.state !== 'not-found') invalid('An observation cannot claim a different action was completed.');
    const counter = { pending: 'pending', failed: 'failed', changed: 'changed', trashed: 'trashed', 'permanent-delete-confirmed': 'permanentlyDeletedReported', 'session-ended': 'sessionsEndedReported', retained: 'retained', 'not-found': 'notFound' }[outcome.state];
    counts[counter]++;
  }
  counts.pending += counts.planned - counts.reported;
  const areas = new Set(); let externalOutstanding = 0, externalRetained = 0;
  for (const review of receipt.externalReviews) {
    object(review, ['area', 'state', 'checkedAt']);
    if (!AREAS.includes(review.area) || areas.has(review.area) || !['reviewed-no-copy', 'retained-under-policy', 'pending', 'outstanding-deletion'].includes(review.state) || !stamp(review.checkedAt) || Date.parse(review.checkedAt) < Date.parse(plan.reviewedAt)) invalid('Invalid external-copy review.');
    areas.add(review.area);
    if (['pending', 'outstanding-deletion'].includes(review.state)) externalOutstanding++;
    if (review.state === 'retained-under-policy') externalRetained++;
  }
  const outstanding = counts.pending + counts.failed + counts.changed + counts.unknownHold + externalOutstanding;
  return { kind: 'alloflow-mailbox-deletion-evidence-review', version: 1,
    evidenceStatus: outstanding ? 'incomplete' : 'review-complete', planSha256: planDigest(plan), counts, externalOutstanding, externalRetained,
    evidenceSource: 'Operator observations; this offline tool did not contact Google or inspect files.',
    providerPurgeVerified: false, allCopiesDeleted: false,
    permanentDeletionOfTrashedFilesEstablished: counts.trashed === 0 ? null : false,
  };
}
function readBounded(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size > 2 * 1024 * 1024) invalid('Evidence must be a JSON file no larger than 2 MiB.');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function main(args) {
  if (args.length !== 2) invalid('Usage: check_mailbox_deletion_receipt.cjs plan.json receipt.json');
  const result = inspectPacket(readBounded(args[0]), readBounded(args[1]));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  return result.evidenceStatus === 'review-complete' ? 0 : 1;
}
module.exports = { inspectPacket, validatePlan, planDigest, canonical, AREAS };
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (_) { process.stderr.write('MAILBOX_DELETION_REVIEW_INVALID: Invalid or unreadable evidence packet.\n'); process.exitCode = 2; }
}
