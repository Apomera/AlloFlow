import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(process.cwd());
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const between = (source, startMarker, endMarker) => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Could not find contract markers: ${startMarker} -> ${endMarker}`);
  return source.slice(start, end);
};

describe('School Rewards integration contract', () => {
  it('ships every HTML file referenced by the Apps Script service', () => {
    const servicePath = path.join(ROOT, 'apps_script/school_rewards/Code.gs');
    const source = fs.readFileSync(servicePath, 'utf8');
    const references = [...source.matchAll(/HtmlService\.(?:createTemplateFromFile|createHtmlOutputFromFile)\(\s*['"]([^'"]+)['"]\s*\)/g)]
      .map(match => match[1]);

    expect(references).toEqual(expect.arrayContaining(['Index', 'Portal']));
    expect(references.length).toBeGreaterThan(0);
    references.forEach(reference => {
      expect(fs.existsSync(path.join(path.dirname(servicePath), `${reference}.html`)), `Missing Apps Script HTML file: ${reference}.html`).toBe(true);
    });
  });

  it('has a parseable Apps Script service and domain-only least-privilege deployment', () => {
    expect(() => new vm.Script(read('apps_script/school_rewards/Code.gs'))).not.toThrow();
    const portalScript = read('apps_script/school_rewards/Portal.html').match(/<script>([\s\S]*)<\/script>/)[1];
    expect(() => new vm.Script(portalScript)).not.toThrow();
    const manifest = JSON.parse(read('apps_script/school_rewards/appsscript.json'));
    expect(manifest.webapp).toEqual({ access: 'DOMAIN', executeAs: 'USER_DEPLOYING' });
    expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/script.send_mail');
    expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/script.scriptapp');
  });

  it('keeps official points behind the ledger, lock, role, and idempotency boundaries', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    expect(source).toContain("requireRole_(['admin', 'staff'])");
    expect(source).toContain("requireRole_(['admin', 'cashier'])");
    expect(source).toContain('LockService.getScriptLock()');
    expect(source).toContain("kind: 'SPEND'");
    expect(source).toContain("kind: 'REVERSAL'");
    expect(source).toContain("printIdemOperation_('checkout'");
    expect(source).toContain('idemResult_(key, operation)');
    expect(source).not.toMatch(/havenRewards|AlloHaven/i);
  });

  it('retains schema-v5 catalog snapshots and an append-only inventory movement ledger in schema v6', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const initialize = between(source, 'function initializeSheets_', 'function putConfig_');

    expect(source).toContain('var SR_VERSION = 6');
    expect(source).toContain("Catalog: ['Id', 'Name', 'Description', 'Cost', 'InventoryLimit', 'Remaining', 'Active', 'ImageUrl', 'CreatedAt', 'UpdatedAt', 'InventoryVersion']");
    expect(source).toContain("InventoryMovements: ['Id', 'CatalogId', 'Version', 'Kind', 'QuantityDelta', 'BeforeLimit', 'BeforeRemaining', 'AfterLimit', 'AfterRemaining', 'ReferenceType', 'ReferenceId', 'ActorEmail', 'ActorRole', 'At', 'IdempotencyKey', 'Reason', 'PreviousHash', 'Hash']");
    expect(initialize).toContain("sheet.getRange(1, 11).setValues([['InventoryVersion']])");
    expect(source).toContain("rows_(sheet_(book, 'Catalog'), 11)");
    expect(source).toContain("rows_(sheet_(book, 'InventoryMovements'), 18)");
  });

  it('migrates legacy inventory to deterministic schema-v5 baselines before enabling writes', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const migration = between(source, 'function migrateSchoolRewardsRepositoryV5', 'function getSchoolRewardsBootstrap');
    const schemaGate = between(source, 'function assertInventorySchemaReady_', 'function prepareCatalogIntent_');
    const prepare = between(source, 'function prepareCatalogIntent_', 'function inventoryMovements_');

    expect(migration).toContain("requireRole_(['admin'])");
    expect(migration).toContain("assertNoPendingCoreOperation_(book, '')");
    expect(migration).toContain("inventoryMovementId_('MIGRATION_BASELINE', key, item.id, 1)");
    expect(migration).toContain("kind: 'MIGRATION_BASELINE'");
    expect(migration).toContain("previousHash: 'GENESIS'");
    expect(migration).toContain('assertInventoryChainTailMatchesCatalog_');
    expect(migration.indexOf('applyInventoryMovement_')).toBeLessThan(migration.indexOf('putConfig_(book, { schemaVersion: 5 })'));
    expect(schemaGate).toContain("srError_('inventory_migration_required'");
    expect(prepare).toContain('assertInventorySchemaReady_(book)');
  });

  it('creates fresh schema-v6 repositories and requires the ordered v4-to-v5-to-v6 migration', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const setup = between(source, 'function setupSchoolRewardsRepository', 'function migrateSchoolRewardsRepositoryV4');
    const migration = between(source, 'function migrateSchoolRewardsRepositoryV6', 'function getSchoolRewardsBootstrap');

    expect(source).toContain("MailRuns: ['Id', 'Kind', 'PeriodKey', 'RequestedLimit', 'CursorKey'");
    expect(source).toContain("MailOutbox: ['Id', 'RunId', 'DeliveryKey', 'Kind', 'StudentId', 'GuardianId'");
    expect(setup).toContain('var priorSchemaVersion = existing ? number_(configMap_(book).schemaVersion) : SR_VERSION');
    expect(setup).toContain('schemaVersion: priorSchemaVersion');
    expect(setup).toContain('if (existing && priorSchemaVersion >= 6 && !mailDeliverySecret_(false))');
    expect(setup).toContain('if (!existing) mailDeliverySecret_(true)');
    expect(setup).toContain('if (existing && priorSchemaVersion >= 6) ensureMailSafetySweepTrigger_()');
    expect(setup).toContain('if (!existing) ensureMailSafetySweepTrigger_()');
    expect(setup.indexOf("props.setProperty('SR_SETUP_STATE', 'ready')")).toBeLessThan(setup.lastIndexOf('if (!existing) ensureMailSafetySweepTrigger_()'));
    expect(migration).toContain("requireRole_(['admin'])");
    expect(migration).toContain("if (configuredVersion < 5) throw srError_('mail_migration_order'");
    expect(migration).toContain("assertNoPendingCoreOperation_(book, '')");
    expect(migration).toContain('initializeSheets_(book)');
    expect(migration).toContain('mailDeliverySecret_(true)');
    expect(migration).toContain('ensureMailSafetySweepTrigger_()');
    expect(migration.indexOf('mailDeliverySecret_(true)')).toBeLessThan(migration.indexOf('putConfig_(book, { schemaVersion: 6 })'));
    expect(migration.indexOf("event: 'REPOSITORY_MIGRATED_V6'")).toBeLessThan(migration.indexOf('putConfig_(book, { schemaVersion: 6 })'));
  });

  it('hashes and versions inventory movements deterministically', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const movementHelpers = between(source, 'function inventoryMovementId_', 'function appendInventoryMovement_');

    expect(movementHelpers).toContain("return 'inventory_' + hash_(SR_SERVICE + '|' + kind + '|' + key + '|' + catalogId + '|' + version)");
    expect(movementHelpers).toContain("return 'i1_' + hash_(stableJson_(inventoryMovementHashBody_(value)))");
    expect(movementHelpers).toContain('previousHash: value.previousHash');
    expect(movementHelpers).toContain('movement.version !== i + 1');
    expect(movementHelpers).toContain('movement.previousHash !== previous.hash');
    expect(movementHelpers).toContain('tail.afterLimit !== item.inventoryLimit');
    expect(movementHelpers).toContain('tail.afterRemaining !== item.remaining');
  });

  it('makes catalog creates, metadata saves, and stock adjustments signed recoverable operations', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const endpoint = between(source, 'function adminUpsertRewardsCatalogItem', 'function adminUpsertRewardsCategory');
    const validation = between(source, 'function validatePendingCoreJournal_', 'function journalLineProjectionForValidation_');
    const lookup = between(source, 'function loadCoreOperationByKey_', 'function resumeCoreOperation_');
    const resume = between(source, 'function resumeCoreOperation_', 'function resumeAwardCoreOperation_');
    const catalogResume = between(source, 'function resumeCatalogCoreOperation_', 'function buildSchoolRewardsIntegrityReport_');

    expect(endpoint).toContain("printIdemOperation_('catalog', actor, request)");
    expect(endpoint).toContain("loadCoreOperation_(book, key, operation, 'catalog')");
    expect(endpoint).toContain("startCoreOperation_(book, key, operation, 'catalog', intent)");
    expect(validation).toContain("catalog: ['admin']");
    expect(validation).toContain('validateCatalogJournalIntent_(book, key, intent, actor)');
    expect(lookup).toContain("'catalog'");
    expect(resume).toContain("journal.kind === 'catalog'");
    expect(catalogResume).toContain('applyInventoryMovement_');
    expect(catalogResume).toContain('completeCoreOperation_');
  });

  it('journals core point and store mutations before writes and recovers conservatively', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const block = (start, end) => source.slice(source.indexOf(`function ${start}`), source.indexOf(`function ${end}`));
    const award = block('awardSchoolRewardsPoints', 'reverseSchoolRewardsEntry');
    const reversal = block('reverseSchoolRewardsEntry', 'checkoutSchoolRewardsOrder');
    const checkout = block('checkoutSchoolRewardsOrder', 'refundSchoolRewardsOrder');
    const refund = block('refundSchoolRewardsOrder', 'getSchoolRewardsReconciliation');

    [award, reversal, checkout, refund].forEach(operation => {
      expect(operation).toContain('loadCoreOperation_');
      expect(operation).toContain('startCoreOperation_');
      expect(operation).toContain('resumeCoreOperation_');
    });
    [award, reversal, checkout, refund].forEach(operation => {
      expect(operation.indexOf('startCoreOperation_')).toBeLessThan(operation.indexOf('resumeCoreOperation_'));
    });
    const awardResume = block('resumeAwardCoreOperation_', 'resumeReverseCoreOperation_');
    const reversalResume = block('resumeReverseCoreOperation_', 'resumeCheckoutCoreOperation_');
    const checkoutResume = block('resumeCheckoutCoreOperation_', 'resumeRefundCoreOperation_');
    const refundResume = block('resumeRefundCoreOperation_', 'buildSchoolRewardsIntegrityReport_');
    [awardResume, reversalResume, checkoutResume, refundResume].forEach(operation => {
      expect(operation).toContain('completeCoreOperation_');
    });
    expect(awardResume.indexOf('ensureLedgerEntry_')).toBeLessThan(awardResume.indexOf('completeCoreOperation_'));
    expect(reversalResume.indexOf('ensureLedgerEntry_')).toBeLessThan(reversalResume.indexOf('completeCoreOperation_'));
    expect(checkoutResume.indexOf('ensureOrderRow_')).toBeLessThan(checkoutResume.indexOf('completeCoreOperation_'));
    expect(refundResume.indexOf('ensureLedgerEntry_')).toBeLessThan(refundResume.indexOf('completeCoreOperation_'));
    expect(source).toContain("journalVersion: 1, kind: kind, state: 'INTENT'");
    expect(source).toContain("saveCoreOperation_(book, key, operation, journal, 'MUTATIONS_APPLIED')");
    expect(source).toContain("operationEntityId_('order', key)");
    expect(source).toContain("operationEntityId_('ledger', key)");
    expect(source).toContain('assertNoPendingCoreOperation_');
    expect(source).toContain("srError_('recovery_required'");
    expect(source).toContain("srError_('recovery_conflict'");
    expect(source).toContain("srError_('recovery_ambiguous'");
  });

  it('records signed sale/refund movement specs and replays them before completing store journals', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const checkout = between(source, 'function checkoutSchoolRewardsOrder', 'function refundSchoolRewardsOrder');
    const refund = between(source, 'function refundSchoolRewardsOrder', 'function recoverSchoolRewardsOperation');
    const validation = between(source, 'function validatePendingCoreJournal_', 'function journalLineProjectionForValidation_');
    const checkoutResume = between(source, 'function resumeCheckoutCoreOperation_', 'function resumeRefundCoreOperation_');
    const refundResume = between(source, 'function resumeRefundCoreOperation_', 'function resumeCatalogCoreOperation_');

    expect(checkout).toContain("buildStoreInventoryMovements_(book, orderLines, -1, 'SALE'");
    expect(checkout).toContain('inventoryMovements: inventoryMovements');
    expect(refund).toContain("buildStoreInventoryMovements_(book, journalLineProjectionForValidation_(orderLines), 1, 'REFUND'");
    expect(refund).toContain('inventoryMovements: inventoryMovements');
    expect(validation).toContain("validateJournalInventoryMovements_(book, intent.inventoryMovements, checkoutLines, -1, 'SALE'");
    expect(validation).toContain("validateJournalInventoryMovements_(book, intent.inventoryMovements, refundLines, 1, 'REFUND'");
    expect(checkoutResume.indexOf('reconcileInventoryMovements_')).toBeLessThan(checkoutResume.indexOf('completeCoreOperation_'));
    expect(refundResume.indexOf('reconcileInventoryMovements_')).toBeLessThan(refundResume.indexOf('completeCoreOperation_'));
  });

  it('requires an exact inventory version, reason, and explicit finite/unlimited transition for adjustments', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const prepare = between(source, 'function prepareCatalogIntent_', 'function inventoryMovements_');

    expect(prepare).toContain('request.expectedInventoryVersion !== oldItem.inventoryVersion');
    expect(prepare).toContain("srError_('inventory_stale'");
    expect(prepare).toContain('request.reason.length < 8');
    expect(prepare).toContain("'TO_FINITE'");
    expect(prepare).toContain("'TO_UNLIMITED'");
    expect(prepare).toContain("srError_('inventory_transition_required'");
    expect(prepare).toContain('targetVersion = oldItem.inventoryVersion + 1');
    expect(prepare).toContain("newInventoryMovementSpec_(itemId, targetVersion, 'ADMIN_ADJUST'");
    expect(prepare).toContain("mode = 'METADATA'; targetVersion = oldItem.inventoryVersion");
  });

  it('supports admin-reviewed journal recovery while preserving the original business actor', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const recovery = between(source, 'function recoverSchoolRewardsOperation', 'function getSchoolRewardsReconciliation');
    const resume = between(source, 'function resumeCoreOperation_', 'function resumeAwardCoreOperation_');
    const validation = between(source, 'function validatePendingCoreJournal_', 'function journalLineProjectionForValidation_');
    const journalStart = between(source, 'function startCoreOperation_', 'function saveCoreOperation_');

    expect(recovery).toContain("requireRole_(['admin'])");
    expect(recovery).toContain('loadCoreOperationByKey_');
    expect(recovery).toMatch(/resumeCoreOperation_\(book,\s*key,\s*state\.operation,\s*state\.journal\)/);
    expect(recovery).toContain("event: 'CORE_OPERATION_ADMIN_RECOVERED'");
    expect(recovery).toContain("event: 'ADMIN_RECOVERY_STARTED'");
    expect(recovery).toContain("coreFault_('admin_recovery:after_complete')");
    expect(recovery).toMatch(/appendAuditOnce_\([\s\S]*recoveryActor\)/);
    expect(resume).toContain('validatePendingCoreJournal_(book, key, operation, journal)');
    expect(resume).toContain('businessActor');
    expect(validation).toContain('assertCoreJournalSignature_(key, operation, journal)');
    expect(validation).toContain('intent.actorEmail');
    expect(validation).toContain('intent.actorRole');
    expect(validation).toContain('printIdemOperation_(kind, actor, payload)');
    expect(validation).toContain("srError_('journal_intent_invalid'");
    expect(validation).toContain("srError_('journal_operation_invalid'");
    expect(source).toContain("getProperty('SR_CORE_JOURNAL_SECRET')");
    expect(source).toContain('Utilities.computeHmacSha256Signature');
    expect(source).toContain("return 'h1_' +");
    expect(journalStart).toContain('journal.signature = coreJournalSignature_');
    expect(journalStart).toContain('SpreadsheetApp.flush()');
  });

  it('provides an admin-only read-only integrity report and blocks readiness for every pending journal', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const wrapper = source.slice(source.indexOf('function getSchoolRewardsIntegrityReport'), source.indexOf('function sendSchoolRewardsBalanceStatements'));
    const report = source.slice(source.indexOf('function buildSchoolRewardsIntegrityReport_'), source.indexOf('function locked_'));
    const pendingScan = between(report, 'var pendingOperations = 0;', 'var errors =');

    expect(wrapper).toContain("requireRole_(['admin'])");
    expect(wrapper).toContain('buildSchoolRewardsIntegrityReport_');
    expect(report).toContain('readOnly: true');
    expect(report).toContain('operationJournals: true');
    expect(report).toContain("'JOURNAL_OPERATION_PENDING'");
    expect(report).toContain("'JOURNAL_SIGNATURE_INVALID'");
    expect(report).toContain("'JOURNAL_PENDING_INTENT_INVALID'");
    expect(report).toContain("'RECEIPT_DELIVERY_AMBIGUOUS'");
    expect(pendingScan).toContain("if (saved.state !== 'COMPLETED')");
    expect(pendingScan).toContain("issue('ERROR', 'JOURNAL_OPERATION_PENDING'");
    expect(pendingScan).toContain('validatePendingCoreJournal_');
    expect(pendingScan).not.toContain('pendingAgeMinutes');
    expect(report).toMatch(/var ready\s*=\s*errors === 0 && pendingOperations === 0/);
    expect(report).toContain('readiness: { ok: ready, blockingIssues: errors, pendingOperations: pendingOperations }');
    expect(report).not.toMatch(/\.appendRow\(|\.setValues\(|upsert_\(|appendAudit_\(/);
  });

  it('deep-checks completed journals against stored intent and authoritative rows', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const report = between(source, 'function buildSchoolRewardsIntegrityReport_', 'function locked_');

    [
      'JOURNAL_LEDGER_INTENT_MISMATCH',
      'JOURNAL_SOURCE_INTENT_MISMATCH',
      'JOURNAL_ORDER_INTENT_MISMATCH',
      'JOURNAL_LINES_INTENT_MISMATCH',
      'JOURNAL_ORDER_STATUS_MISMATCH',
      'JOURNAL_RESULT_INTENT_MISMATCH'
    ].forEach(code => expect(report).toContain(`'${code}'`));
    expect(report).toContain('function validateCompletedJournal');
    expect(report).toContain('validateCompletedJournal(saved, key)');
    expect(report).toContain('stableJson_(actualLedger) !== stableJson_(expectedLedger)');
    expect(report).toContain('stableJson_(actualLines) !== stableJson_(expectedLines)');
  });

  it('verifies inventory chains, materialized snapshots, signed linkage, and ordinary-store order lines', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const report = between(source, 'function buildSchoolRewardsIntegrityReport_', 'function locked_');
    const lineChecks = between(report, 'lineRows.forEach(function(line)', 'orders.forEach(function(order)');
    const movementChecks = between(report, 'var movementIntentLinks = {}', 'requests.forEach(function(item)');

    [
      'INVENTORY_ITEM_VERSION_DUPLICATE',
      'INVENTORY_VERSION_GAP',
      'INVENTORY_MOVEMENT_ID_INVALID',
      'INVENTORY_HASH_INVALID',
      'INVENTORY_HASH_CHAIN_BROKEN',
      'INVENTORY_SNAPSHOT_DISCONTINUITY',
      'INVENTORY_JOURNAL_LINK_INVALID',
      'INVENTORY_ORDER_LINK_INVALID',
      'INVENTORY_CATALOG_SNAPSHOT_DRIFT',
      'INVENTORY_CHAIN_MISSING'
    ].forEach(code => expect(movementChecks).toContain(`'${code}'`));
    expect(movementChecks).toContain('assertCoreJournalSignature_');
    expect(movementChecks).toContain("exactLinks[0].state !== 'COMPLETED'");
    expect(movementChecks).toContain('stableJson_(link.movement) === stableJson_(movement)');
    expect(lineChecks).toContain('var printLineRequest = requestByOrderId[line.orderId]');
    expect(lineChecks).toContain("else if (!catalogById[line.catalogId])");
    expect(movementChecks).toContain('requestByOrderId[movement.referenceId]');
    expect(report).toContain('inventoryMovementChain: true');
  });

  it('gates every Print Lab points or hold mutation while a core journal is pending', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const operations = [
      between(source, 'function confirmSchoolRewardsPrintQuote', 'function advanceSchoolRewardsPrintRequest'),
      between(source, 'function cancelSchoolRewardsPrintRequest', 'function fulfillSchoolRewardsPrintRequest'),
      between(source, 'function fulfillSchoolRewardsPrintRequest', 'function refundSchoolRewardsPrintRequest'),
      between(source, 'function refundSchoolRewardsPrintRequest', 'function adminUpsertRewardsMember')
    ];

    operations.forEach(operation => expect(operation).toContain("assertNoPendingCoreOperation_(book, '')"));
    expect(operations[0].indexOf('assertNoPendingCoreOperation_')).toBeLessThan(operations[0].indexOf('upsertPointHoldRow_'));
    expect(operations[1].indexOf('assertNoPendingCoreOperation_')).toBeLessThan(operations[1].indexOf('upsertPointHoldRow_'));
    expect(operations[2].indexOf('assertNoPendingCoreOperation_')).toBeLessThan(operations[2].indexOf('appendLedger_'));
    expect(operations[3].indexOf('assertNoPendingCoreOperation_')).toBeLessThan(operations[3].indexOf('appendLedger_'));
  });

  it('ships the connection surface and Leadership Hub launcher in generated modules', () => {
    const settings = read('view_project_settings_module.js');
    const hub = read('admin_hub_module.js');
    expect(settings).toContain('School Rewards & Store');
    expect(settings).toContain('allo_school_rewards_portal_url_v1');
    expect(settings).toContain("url.hostname !== 'script.google.com'");
    expect(hub).toContain('School Rewards & Store');
    expect(hub).toContain('allo_school_rewards_portal_url_v1');
  });

  it('keeps student identity managed and detailed reasons out of routine balance email', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const readme = read('apps_script/school_rewards/README.md');
    expect(readme).toMatch(/use the system without opening the portal/i);
    expect(readme).toMatch(/opaque student UUID/i);
    expect(source).toContain("subject: (config.schoolName || 'School') + ' rewards update'");
    expect(source).not.toMatch(/subject:[^\n]+balance/);
    expect(source).not.toMatch(/statementHtml_\([\s\S]{0,500}reason/);
  });

  it('routes both bulk-mail entry points through bounded schema-v6 runs', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const statements = between(source, 'function sendSchoolRewardsBalanceStatements', 'function configureSchoolRewardsEmailSchedule');
    const guardians = between(source, 'function sendSchoolRewardsGuardianDigests', 'function runScheduledSchoolRewardsStatements');
    const scheduled = between(source, 'function runScheduledSchoolRewardsStatements', 'function getSchoolRewardsMailRun');

    expect(source).toContain('var SR_MAIL_CHUNK_DEFAULT = 25');
    expect(source).toContain('var SR_MAIL_CHUNK_MAX = 50');
    expect(source).toContain('var SR_MAIL_RECEIPT_RESERVE_DEFAULT = 25');
    expect(statements).toContain("startAndProcessMailRun_('STUDENT_STATEMENT'");
    expect(guardians).toContain("startAndProcessMailRun_('GUARDIAN_DIGEST'");
    expect(scheduled).toContain("startAndProcessMailRun_('STUDENT_STATEMENT'");
    expect(statements).not.toContain('MailApp.sendEmail');
    expect(guardians).not.toContain('MailApp.sendEmail');
  });

  it('freezes a bounded signed candidate manifest while revalidating recipients at send time', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const signature = between(source, 'function mailRunOperationHash_', 'function assertMailRunSignature_');
    const manifest = between(source, 'function mailCandidateManifestJson_', 'function mailDeliveryKey_');
    const start = between(source, 'function startAndProcessMailRun_', 'function reconcileMailRunAudits_');
    const prepare = between(source, 'function prepareNextMailDelivery_', 'function projectMailDelivery_');

    expect(signature).toContain('cursorKey: run.cursorKey');
    expect(manifest).toContain('mailCandidates_(book, kind).slice(0, requestedLimit)');
    expect(manifest).toContain('stableJson_({ v: 1, i: 0, c:');
    expect(manifest).toContain("srError_('mail_candidate_manifest_too_large'");
    expect(manifest).toContain("srError_('mail_integrity'");
    expect(manifest).toContain('value.c.length > SR_MAX_BATCH');
    expect(start).toContain('cursorKey: mailCandidateManifestJson_(book, kind, requestedLimit)');
    expect(prepare).toContain('mailCandidateManifest_(run)');
    expect(prepare).toContain('mailManifestCandidate_(manifest)');
    expect(prepare).toContain('mailRecipientForCandidate_(book, run, candidate, secret)');
    expect(prepare).toContain('advanceMailManifest_(run, manifest)');
  });

  it('persists and flushes a signed pending attempt before sending outside the repository lock', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const prepare = between(source, 'function prepareNextMailDelivery_', 'function projectMailDelivery_');
    const worker = between(source, 'function processMailRunWithLease_', 'function clearMailContinuationTriggersLocked_');
    const pendingWrite = prepare.indexOf("status: 'PENDING'");
    const upsert = prepare.indexOf('upsertMailOutbox_', pendingWrite);
    const flush = prepare.indexOf('SpreadsheetApp.flush()', upsert);

    expect(pendingWrite).toBeGreaterThan(-1);
    expect(upsert).toBeGreaterThan(pendingWrite);
    expect(flush).toBeGreaterThan(upsert);
    expect(prepare).toContain('mailOutboxSignature_');
    expect(prepare).toContain('resolveCurrentMailRecipient_');
    expect(prepare).toContain('scheduleMailContinuationLocked_(SR_MAIL_PENDING_STALE_MS)');
    expect(prepare).not.toContain('MailApp.sendEmail');
    expect(worker.indexOf('prepareNextMailDelivery_')).toBeLessThan(worker.indexOf('MailApp.sendEmail'));
    expect(worker).toContain("settleMailDelivery_(prepared.deliveryId, 'UNKNOWN'");
    expect(worker).toContain("settleMailDelivery_(prepared.deliveryId, 'SENT'");
  });

  it('treats fresh pending delivery as in-flight, converts only stale pending to unknown, and never auto-retries unknown', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const reconcile = between(source, 'function reconcileAbandonedMailPending_', 'function mailPendingIsStale_');
    const prepare = between(source, 'function prepareNextMailDelivery_', 'function projectMailDelivery_');
    const resolution = between(source, 'function resolveSchoolRewardsMailDelivery', 'function retrySchoolRewardsMailDelivery');

    expect(reconcile).toContain("delivery.status = 'UNKNOWN'");
    expect(reconcile).toContain("return 'IN_FLIGHT'");
    expect(reconcile).toContain("return 'STALE'");
    expect(prepare).toMatch(/status === 'PENDING' \|\| [^\n]+status === 'UNKNOWN'/);
    expect(prepare).toContain("return { action: 'STOP' }");
    expect(resolution).toContain("if (delivery.status !== 'UNKNOWN')");
    expect(resolution).not.toContain('MailApp.sendEmail');
  });

  it('allows one linked retry only from an authenticated administrator-confirmed failure', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const signatures = between(source, 'function mailOutboxSignature_', 'function mailRuns_');
    const confirmed = between(source, 'function assertConfirmedFailedMailDelivery_', 'function mailPayloadForCandidate_');
    const retry = between(source, 'function retrySchoolRewardsMailDeliveryWithLease_', 'function verifySchoolRewardsAuditChain');

    expect(signatures).toContain('status: delivery.status');
    expect(signatures).toContain('resolvedAt: delivery.resolvedAt');
    expect(signatures).toContain('resolvedByHash: delivery.resolvedByHash');
    expect(signatures).toContain('resolutionNote: delivery.resolutionNote');
    expect(confirmed).toContain('assertMailDeliverySignature_(delivery)');
    expect(confirmed).toContain("delivery.status !== 'FAILED'");
    expect(confirmed).toContain("delivery.errorCode !== 'ADMIN_CONFIRMED_FAILED'");
    expect(retry).toContain('assertConfirmedFailedMailDelivery_(source)');
    expect(retry).toContain('item.retryOfId === source.id');
    expect(retry).toContain("srError_('mail_retry_exists'");
    expect(retry).toContain('retryOfId: source.id');
    expect(retry.indexOf("status: 'PENDING'")).toBeLessThan(retry.indexOf('MailApp.sendEmail'));
  });

  it('throws definite busy or reserved-quota retry errors before creating a retry attempt or result', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const runCase = (leaseToken, allowance) => {
      const context = vm.createContext({});
      new vm.Script(source).runInContext(context);
      const calls = { worker: 0, outbox: 0, idempotency: 0, release: 0, continuation: 0 };
      const sourceDelivery = { id: 'outbox_source', runId: 'mailrun_source' };
      Object.assign(context, {
        requireRole_: () => ({ email: 'admin@school.example', role: 'admin' }),
        object_: value => value || {},
        id_: value => String(value),
        idemKey_: value => String(value),
        printIdemOperation_: () => 'mail_retry_operation',
        locked_: callback => callback(),
        idemResult_: () => null,
        acquireMailWorkerLease_: () => leaseToken,
        bulkMailAllowance_: () => allowance,
        book_: () => ({}),
        mailOutboxById_: () => sourceDelivery,
        assertConfirmedFailedMailDelivery_: () => sourceDelivery,
        mailRunById_: () => ({ id: 'mailrun_source' }),
        assertMailRunSignature_: () => true,
        retrySchoolRewardsMailDeliveryWithLease_: () => { calls.worker++; },
        upsertMailOutbox_: () => { calls.outbox++; },
        rememberIdem_: () => { calls.idempotency++; },
        releaseMailWorkerLease_: () => { calls.release++; },
        ensureMailContinuationForAnyRun_: () => { calls.continuation++; }
      });
      let error;
      try {
        context.retrySchoolRewardsMailDelivery({ outboxId: 'outbox_source', idempotencyKey: 'stable_retry_key' });
      } catch (failure) {
        error = failure;
      }
      return { calls, error };
    };

    const busy = runCase('', 99);
    const quota = runCase('signed_lease', 0);
    expect(busy.error && busy.error.code).toBe('mail_worker_busy');
    expect(quota.error && quota.error.code).toBe('mail_quota_reserved');
    [busy, quota].forEach(result => {
      expect(result.calls.worker).toBe(0);
      expect(result.calls.outbox).toBe(0);
      expect(result.calls.idempotency).toBe(0);
    });
    expect(busy.calls.release).toBe(0);
    expect(quota.calls.release).toBe(1);
    expect(quota.calls.continuation).toBe(1);
  });

  it('rechecks live recipients, interlocks recipient mutation, and keeps legacy sheets as projections', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const currentRecipient = between(source, 'function resolveCurrentMailRecipient_', 'function mailMessageForDelivery_');
    const studentWrite = between(source, 'function upsertStudentRow_', 'function studentById_');
    const guardianWrite = between(source, 'function upsertGuardianRow_', 'function guardianDto_');
    const interlock = between(source, 'function assertMailRecipientMutationAllowed_', 'function refreshMailRunCounters_');
    const projection = between(source, 'function projectMailDelivery_', 'function settleMailDelivery_');

    expect(currentRecipient).toContain('!student || !student.active');
    expect(currentRecipient).toContain('mailRecipientHash_(student.email, secret)');
    expect(currentRecipient).toContain('guardian.consentConfirmedAt !== delivery.consentConfirmedAt');
    expect(currentRecipient).toContain('mailRecipientHash_(guardian.guardianEmail, secret)');
    expect(studentWrite.indexOf('assertMailRecipientMutationAllowed_')).toBeLessThan(studentWrite.indexOf("upsert_(sheet_(book, 'Students')"));
    expect(guardianWrite.indexOf('assertMailRecipientMutationAllowed_')).toBeLessThan(guardianWrite.indexOf("upsert_(sheet_(book, 'Guardians')"));
    expect(interlock).toContain("throw srError_('mail_recipient_locked'");
    expect(interlock).toContain("delivery.status = 'UNKNOWN'");
    expect(projection).toContain("sheet_(book, 'Statements')");
    expect(projection).toContain("sheet_(book, 'GuardianDigests')");
  });

  it('uses a signed expiring lease plus signed trigger-UID ownership for deduplicated continuations', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const lease = between(source, 'function mailWorkerLeaseSignature_', 'function processMailRun_');
    const worker = between(source, 'function processMailRun_', 'function weeklyMailPeriodKey_');
    const triggerContract = between(source, 'function mailContinuationScheduled_', 'function mailRunProgress_');
    const weekly = between(source, 'function configureSchoolRewardsEmailSchedule', 'function runScheduledSchoolRewardsStatements');
    const continuation = between(source, 'function continueSchoolRewardsMailRuns', 'function resolveSchoolRewardsMailDelivery');
    const sweep = between(source, 'function sweepSchoolRewardsMailRuns', 'function resolveSchoolRewardsMailDelivery');
    const start = between(source, 'function startAndProcessMailRun_', 'function reconcileMailRunAudits_');
    const retry = between(source, 'function retrySchoolRewardsMailDeliveryWithLease_', 'function verifySchoolRewardsAuditChain');
    const continuationSchedule = between(source, 'function clearMailContinuationTriggersLocked_', 'function mailContinuationDelayForRun_');
    const triggerActor = between(source, 'function scheduledAdminActor_', 'function requireRole_');

    expect(source).toContain('var SR_MAIL_WORKER_LEASE_MS = 7 * 60 * 1000');
    expect(lease).toContain("getProperty('SR_MAIL_WORKER_LEASE')");
    expect(lease).toContain('mailWorkerLeaseSignature_');
    expect(lease).toContain('expiresAt: nowMs + SR_MAIL_WORKER_LEASE_MS');
    expect(worker).toContain('acquireMailWorkerLease_');
    expect(worker).toContain('releaseMailWorkerLease_');
    expect(worker).toContain('ensureMailContinuationForAnyRun_');
    expect(worker).toContain('if (progress.pending) return true');
    expect(triggerContract).toContain('mailTriggerRegistrationSignature_');
    expect(triggerContract).toContain('mailHmac_');
    expect(triggerContract).toContain('secureTextEqual_(registration.signature');
    expect(triggerContract).toContain("String(event.triggerUid || ''), registration.uid");
    expect(triggerContract).toContain("readMailTriggerRegistration_('SR_MAIL_SWEEP_REGISTRATION', 'sweepSchoolRewardsMailRuns')");
    expect(triggerContract).toContain("ScriptApp.newTrigger('sweepSchoolRewardsMailRuns').timeBased().everyHours(1).create()");
    expect(triggerContract).toContain("srError_('mail_safety_unavailable'");
    expect(weekly).toContain("saveMailTriggerRegistration_('SR_EMAIL_TRIGGER_REGISTRATION'");
    expect(continuation).toContain("scheduledAdminActor_(e, 'continueSchoolRewardsMailRuns', 'SR_MAIL_CONTINUATION_REGISTRATION')");
    expect(continuation).toContain('requireMailSafetySweep_()');
    expect(sweep).toContain("scheduledAdminActor_(e, 'sweepSchoolRewardsMailRuns', 'SR_MAIL_SWEEP_REGISTRATION')");
    expect(sweep).toContain('selectNextMailRun_(book)');
    expect(sweep).toContain('processMailRun_(runId, SR_MAIL_CHUNK_DEFAULT, actor)');
    expect(start).toContain('requireMailSafetySweep_()');
    expect(start.indexOf('upsertMailRun_')).toBeLessThan(start.indexOf('scheduleMailContinuationLocked_'));
    expect(start.indexOf('SpreadsheetApp.flush()')).toBeLessThan(start.indexOf('scheduleMailContinuationLocked_'));
    expect(start).toContain('if (startError)');
    expect(retry).toContain('requireMailSafetySweep_()');
    expect(continuationSchedule).toContain("saveMailTriggerRegistration_('SR_MAIL_CONTINUATION_REGISTRATION'");
    expect(continuationSchedule).toContain('pruneMailContinuationTriggersLocked_(registration.uid)');
    expect(continuationSchedule).toContain('trigger.getUniqueId()');
    expect(triggerActor).toContain('assertMailTriggerEvent_(event, expectedHandler, registrationProperty)');
    expect(triggerActor).toContain('Session.getEffectiveUser().getEmail()');
    expect(triggerActor).toContain("list[i].role === 'admin'");
  });

  it('returns privacy-safe mail DTOs and keeps pending or malformed deliveries non-actionable in the Portal', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    const runDto = between(source, 'function mailRunDto_', 'function mailCandidates_');
    const deliveryDto = between(source, 'function mailDeliveryDto_', 'function actionableMailDeliveries_');
    const portalMail = between(portal, 'function normalizedMailKind', 'function localDateTime');

    ['actorHash', 'operationHash', 'cursorKey'].forEach(field => expect(runDto).not.toContain(field));
    ['studentId', 'guardianId', 'recipientHash', 'consentConfirmedAt', 'payloadJson', 'payloadHash', 'error:', 'resolvedByHash', 'resolutionNote']
      .forEach(field => expect(deliveryDto).not.toContain(field));
    expect(portal).toContain('id="recent-mail-runs"');
    expect(portal).toContain('id="unresolved-mail-deliveries"');
    expect(portal).toContain('Recipient names, addresses, message payloads, and raw provider errors are never shown here.');
    expect(portalMail).toContain("deliveryStatus(value)==='UNKNOWN'");
    expect(portalMail).toContain("deliveryStatus(value)==='FAILED'");
    expect(portalMail).toContain("status==='PENDING'");
    expect(portalMail).toContain('Resolution controls stay unavailable while this attempt is pending.');
    expect(portalMail).toContain("stableRetryKey('mail_delivery_resolve',payload)");
    expect(portalMail).toContain("stableRetryKey('mail_delivery_retry',payload)");
    expect(portalMail).toContain('Do not include an email address or other recipient information in the resolution note.');
    expect(portalMail).not.toMatch(/\.(?:studentId|guardianId|recipientHash|payloadJson|payloadHash|resolvedByHash|resolutionNote)\b/);
  });

  it('documents the backup-first v6 migration and uncertain-delivery operating boundary', () => {
    const readme = read('apps_script/school_rewards/README.md');
    expect(readme).toContain('(schema v6)');
    expect(readme).toContain('v4 -> v5 -> v6');
    expect(readme).toContain('migrateSchoolRewardsRepositoryV5()');
    expect(readme).toContain('migrateSchoolRewardsRepositoryV6()');
    expect(readme).toContain('A fresh `PENDING` row is an in-flight, read-only attempt');
    expect(readme).toContain('`UNKNOWN` is deliberately never retried automatically');
    expect(readme).toContain('one deterministic linked retry');
    expect(readme).toContain('compact, signed manifest in `CursorKey`');
    expect(readme).toContain('authenticated recurring hourly safety sweep');
    expect(readme).toContain('`mail_worker_busy` or `mail_quota_reserved`');
    expect(readme).toContain('`SENT` means `MailApp` accepted the send request');
    expect(readme).toContain('Preserve `SR_MAIL_DELIVERY_SECRET`');
    expect(readme).toContain('never rerun the v5 migration after v6');
  });

  it('separates growth from spending and records order receipts', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(source).toContain("Categories: ['Id', 'Name'");
    expect(source).toContain("Receipts: ['Id', 'OrderId'");
    expect(source).toContain("actor.role === 'student'");
    expect(source).toContain("entry.kind === 'EARN' || entry.kind === 'REVERSAL'");
    expect(source).toContain("sendOrderReceipt_");
    expect(source).toContain('function resendSchoolRewardsOrderReceipt');
    expect(source).toContain('function resolveSchoolRewardsReceiptDelivery');
    expect(source).toContain('function receiptDto_');
    expect(source).toContain("status = 'PENDING'");
    expect(source).toContain("srError_('receipt_uncertain'");
    expect(portal).toContain('HOWLs & custom categories');
    expect(portal).toContain('Store purchases never lower these levels');
    expect(portal).toContain("rpc('resendSchoolRewardsOrderReceipt'");
    expect(portal).toContain("rpc('resolveSchoolRewardsReceiptDelivery'");
    expect(portal).toContain('data-receipt-kind');
    expect(portal).toContain('data-resolve-receipt');
  });

  it('provides keyboard tabs, contextual cart controls, and an on-screen receipt surface', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(portal).toContain('role="tablist"');
    expect(portal).toContain('role="tab"');
    expect(portal).toContain('role="tabpanel"');
    expect(portal).toContain("event.key==='ArrowRight'");
    expect(portal).toContain('<caption class="sr-only">');
    expect(portal).toContain('scope="col"');
    expect(portal).toContain('id="checkout-receipt"');
    expect(portal).toContain('aria-label="Add \'+esc(item.name)+\' to cart"');
  });

  it('supports safer student lookup, stable checkout retry, receipt recovery, and guarded bulk actions', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    const readme = read('apps_script/school_rewards/README.md');

    ['award-student-search', 'award-grade-filter', 'award-room-filter', 'award-student-confirmation',
      'checkout-student-search', 'checkout-grade-filter', 'checkout-room-filter', 'checkout-student-confirmation']
      .forEach(id => expect(portal).toContain(`id="${id}"`));
    expect(portal).toContain('function checkoutRequestKey');
    expect(portal).toContain('function readStoredRetry');
    expect(portal).toContain('function storeRetry');
    expect(portal).toContain('function existingRetryKey');
    expect(portal).toContain('The cart and retry key were preserved');
    expect(portal).toContain('id="show-unresolved-receipts"');
    expect(portal).toContain('data-view-receipt');
    expect(portal).toContain('data-print-order-receipt');
    expect(portal).toContain("window.confirm('Start one private student statement run");
    expect(portal).toContain("window.confirm('Start one privacy-minimized guardian digest run");
    expect(portal).toContain('state.pending.balanceSend');
    expect(portal).toContain('state.pending.guardianDigest');
    expect(readme).toContain('## Pilot shopping-day runbook');
    expect(readme).toContain('getSchoolRewardsIntegrityReport');
    expect(readme).toMatch(/stable retry key/i);
    expect(readme).toContain('recoverSchoolRewardsOperation');
    expect(readme).toMatch(/does not repair/i);
  });

  it('separates inventory review from confirmation and carries explicit reason, transition, and version', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    const buildReview = between(portal, 'function buildInventoryReview', 'function renderInventoryReview');
    const renderReview = between(portal, 'function renderInventoryReview', 'function isInventoryStale');
    const reviewSubmit = between(portal, "$('inventory-form').onsubmit", "$('inventory-edit-review').onclick");
    const confirm = between(portal, "$('inventory-confirm').onclick", "$('category-form').onsubmit");

    ['inventory-review-button', 'inventory-review', 'inventory-confirm', 'inventory-edit-review', 'inventory-cancel']
      .forEach(id => expect(portal).toContain(`id="${id}"`));
    expect(buildReview).toContain("reason.replace(/\\s/g,'').length<8");
    expect(buildReview).toContain('expectedInventoryVersion:version');
    expect(buildReview).toContain("transition='TO_UNLIMITED'");
    expect(buildReview).toContain("transition='TO_FINITE'");
    expect(renderReview).toContain('Review only');
    expect(renderReview).toContain('<strong>Old:</strong>');
    expect(renderReview).toContain('<strong>New:</strong>');
    expect(renderReview).toContain('<strong>Reason:</strong>');
    expect(reviewSubmit).toContain('state.inventoryReview=buildInventoryReview()');
    expect(reviewSubmit).not.toContain("rpc('adminUpsertRewardsCatalogItem'");
    expect(confirm).toContain('review.attempted=true');
    expect(confirm).toContain("stableRetryKey('inventory_adjust',review.payload)");
    expect(confirm).toContain("rpc('adminUpsertRewardsCatalogItem'");
  });

  it('omits inventory from metadata saves and freezes ambiguous catalog creates to one exact draft', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    const saveState = between(portal, 'function renderCatalogSaveState', 'function populateCatalogEditor');
    const submit = between(portal, "$('catalog-form').onsubmit", "$('inventory-form').onsubmit");
    const draftCreated = submit.indexOf('state.catalogRetryDraft={payload:normalizedRetryValue(payload),key:requestKey');
    const rpcCall = submit.indexOf("rpc('adminUpsertRewardsCatalogItem'");

    expect(submit).toContain('if(editing)payload.id=state.catalogEditId;else{var mode=');
    expect(submit).toContain("stableRetryKey('catalog_save',payload)");
    expect(draftCreated).toBeGreaterThan(-1);
    expect(rpcCall).toBeGreaterThan(draftCreated);
    expect(submit).toContain('var request=Object.assign({},payload,{idempotencyKey:draft.key})');
    expect(submit).toContain('state.catalogRetryDraft=draft');
    expect(submit).toContain('The exact draft and key are frozen');
    expect(saveState).toContain('locked=pending||!!draft||orphan');
    expect(saveState).toContain('Retry exact create');
    expect(saveState).toContain('Do not recreate or edit the prize here');
  });

  it('reloads authoritative inventory on stale versions while preserving exact ambiguous adjustment retry', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    const staleRefresh = between(portal, 'async function refreshAfterInventoryStale', 'function renderCategoryEditor');
    const confirm = between(portal, "$('inventory-confirm').onclick", "$('category-form').onsubmit");

    expect(staleRefresh).toContain("clearRetryKey('inventory_adjust')");
    expect(staleRefresh).toContain('state.inventoryReview=null');
    expect(staleRefresh).toContain("rpc('getSchoolRewardsBootstrap')");
    expect(confirm).toContain('isInventoryStale(err)');
    expect(confirm).toContain('refreshAfterInventoryStale(review.itemId)');
    expect(confirm).toContain('state.inventoryReview=review');
    expect(confirm).toContain('exact reviewed draft and retry key were preserved');
  });

  it('retries an exact stored checkout before any fresh availability preflight', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    const checkout = between(portal, "$('checkout-form').onsubmit", "$('student-form').onsubmit");
    const storedRetry = checkout.indexOf("existingRetryKey('checkout',replayPayload)");
    const retryCall = checkout.indexOf("rpc('checkoutSchoolRewardsOrder'", storedRetry);
    const liveRefresh = checkout.indexOf('refreshStoreBootstrap()');

    expect(storedRetry).toBeGreaterThan(-1);
    expect(retryCall).toBeGreaterThan(storedRetry);
    expect(liveRefresh).toBeGreaterThan(retryCall);
    expect(checkout).toContain('Retrying the saved checkout result before refreshing availability');
  });

  it('exposes bounded admin integrity recovery while retaining a separate audit-chain check', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    const render = between(portal, 'function renderIntegrityReport', 'async function runRepositoryIntegrity');
    const scan = between(portal, 'async function runRepositoryIntegrity', 'async function recoverIntegrityOperation');
    const recovery = between(portal, 'async function recoverIntegrityOperation', 'function renderActivity');

    expect(portal).toContain('id="run-integrity"');
    expect(portal).toContain('id="integrity-issues"');
    expect(scan).toContain("rpc('getSchoolRewardsIntegrityReport'");
    expect(render).toContain('allIssues.slice(0,100)');
    expect(render).toContain("issue.code==='JOURNAL_OPERATION_PENDING'");
    expect(render).toContain('Resume stored operation');
    expect(recovery.indexOf('window.confirm')).toBeGreaterThan(-1);
    expect(recovery.indexOf("rpc('recoverSchoolRewardsOperation'")).toBeGreaterThan(recovery.indexOf('window.confirm'));
    expect(portal).toContain('id="verify-audit"');
    expect(portal).toContain("rpc('verifySchoolRewardsAuditChain')");
  });

  it('uses a visual student reference for disambiguation, never as a PIN or sign-in code', () => {
    const portal = read('apps_script/school_rewards/Portal.html');
    const reference = between(portal, 'function studentRef', 'function studentById');
    const confirmation = between(portal, 'function renderStudentConfirmation', 'function renderStudentChoosers');

    expect(reference).toContain("return 'Ref '");
    expect(reference).toContain('slice(0,6).toUpperCase()');
    expect(portal).toContain('studentRef(student)');
    expect(confirmation).toContain('visual disambiguator only, not a PIN or sign-in code');
    expect(portal).not.toMatch(/(?:id|name)=["'][^"']*(?:student-)?(?:pin|passcode)[^"']*["']/i);
  });

  it('retains the schema-v5 private asset and immutable revision boundary in schema v6', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(source).toContain('var SR_VERSION = 6');
    expect(source).toContain('SR_MAX_PRINT_ASSET_BYTES = 4 * 1024 * 1024');
    expect(source).toContain("PrintAssets: ['Id', 'ModelId'");
    expect(source).toContain("'PreviousRequestId'");
    expect(source).toContain("'SUPERSEDED'");
    expect(source).toContain('function migrateSchoolRewardsRepositoryV4');
    expect(source).toContain('function uploadSchoolRewardsPrintAsset');
    expect(source).toContain('function reviewSchoolRewardsPrintAsset');
    expect(source).toContain('function resubmitSchoolRewardsPrintRequest');
    expect(source).toMatch(/computeDigest\(\s*Utilities\.DigestAlgorithm\.SHA_256/);
    expect(source).not.toMatch(/driveUrl|alternateLink|webContentLink/i);
    expect(portal).toContain("rpc('uploadSchoolRewardsPrintAsset'");
    expect(portal).toContain("rpc('resubmitSchoolRewardsPrintRequest'");
  });

  it('keeps publishing, guardian communication, SIS import, and district reporting authenticated and bounded', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    [
      'submitSchoolRewardsPrintPublication',
      'reviewSchoolRewardsPrintPublication',
      'remixSchoolRewardsPrintModel',
      'adminUpsertSchoolRewardsGuardian',
      'sendSchoolRewardsGuardianDigests',
      'getSchoolRewardsDistrictSummary',
      'previewSchoolRewardsSisSnapshot',
      'applySchoolRewardsSisSnapshot'
    ].forEach(name => {
      expect(source).toContain(`function ${name}`);
      if (name === 'sendSchoolRewardsGuardianDigests') expect(portal).toContain(`'${name}'`);
      else expect(portal).toContain(`rpc('${name}'`);
    });
    expect(source).toContain("requireRole_(['admin'])");
    expect(source).toContain('SR_MAX_BATCH');
    expect(source).not.toMatch(/sis.*(password|secret|token)|guardian.*student.*reason/i);
  });

  it('carries the moderated publication id through the flat community DTO and report action', () => {
    const source = read('apps_script/school_rewards/Code.gs');
    const portal = read('apps_script/school_rewards/Portal.html');
    expect(source).toMatch(/dto\.publicationId\s*=\s*publishedPublicationByModel\[model\.id\]\.id/);
    expect(portal).toMatch(/entry&&entry\.publicationId\?\{id:entry\.publicationId/);
    expect(portal).toMatch(/payload\.publicationId\s*=\s*button\.dataset\.communityReport/);
  });

  it('keeps manufacturing evidence local and real printer capabilities disabled by default', () => {
    const model = read('printable_model_module.js');
    const tool = read('stem_lab/stem_tool_printlab.js');
    expect(model).toContain('alloflow-print-job/1');
    expect(model).toContain('payloadSha256');
    expect(model).toContain("scope:'ticket-without-integrity'");
    expect(model).toContain('verifyPrintJobTicketIntegrity');
    expect(model).toMatch(/simulator/i);
    expect(model).toMatch(/disabled/i);
    expect(tool).toMatch(/job ticket/i);
    expect(tool).toMatch(/simulator/i);
    expect(`${model}\n${tool}`).not.toMatch(/fetch\([^)]*(octoprint|moonraker)|XMLHttpRequest[^\n]*(octoprint|moonraker)/i);
  });
});
