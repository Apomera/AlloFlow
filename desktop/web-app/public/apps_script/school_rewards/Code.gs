/**
 * AlloFlow School Rewards — school-owned Google Workspace repository.
 * The ledger is append-only and every mutation runs under one script lock.
 * Public calls always derive identity and role from Session.getActiveUser().
 */
var SR_SERVICE = 'alloflow-school-rewards';
var SR_VERSION = 6;
var SR_MAX_POINTS = 1000;
var SR_MAX_BATCH = 500;
var SR_MAIL_CHUNK_DEFAULT = 25;
var SR_MAIL_CHUNK_MAX = 50;
var SR_MAIL_RECEIPT_RESERVE_DEFAULT = 25;
var SR_MAIL_CONTINUATION_DELAY_MS = 5 * 60 * 1000;
var SR_MAIL_QUOTA_DELAY_MS = 6 * 60 * 60 * 1000;
var SR_MAIL_PENDING_STALE_MS = 10 * 60 * 1000;
var SR_MAIL_WORKER_LEASE_MS = 7 * 60 * 1000;
var SR_MAX_PRINT_ASSET_BYTES = 4 * 1024 * 1024;
var SR_MAX_PRINT_MODELS_PER_STUDENT = 100;
var SR_MAX_PRINT_ASSETS_PER_STUDENT = 50;
var SR_MAX_PRINT_ASSET_BYTES_PER_STUDENT = 64 * 1024 * 1024;
var SR_MAX_PRINT_ASSET_UPLOADS_PER_STUDENT_PER_DAY = 10;
var SR_ROLES = ['admin', 'staff', 'cashier'];
var SR_WINDOW_STATES = ['DRAFT', 'PREVIEW', 'OPEN', 'CLOSED', 'ARCHIVED'];
var SR_PRINT_FORMATS = ['RECIPE', 'GLB', 'STL'];
var SR_PRINT_AI_USE = ['NONE', 'ASSISTED', 'MOSTLY_AI'];
var SR_PRINT_PUBLICATION_STATES = ['PRIVATE', 'PENDING', 'PUBLISHED', 'REJECTED', 'REPORTED', 'UNPUBLISHED'];
var SR_PRINT_ASSET_STATES = ['PENDING', 'VERIFIED', 'REJECTED'];
var SR_PRINT_REQUEST_STATES = ['SUBMITTED', 'REVISION_REQUESTED', 'SUPERSEDED', 'REJECTED', 'QUOTED', 'RESERVED', 'QUEUED', 'PRINTING', 'READY', 'CANCELLING', 'CANCELLED', 'FULFILLING', 'FULFILLED', 'REFUNDING', 'REFUNDED'];
var SR_POINT_HOLD_STATES = ['ACTIVE', 'CAPTURED', 'RELEASED'];
// Test-only fault hook. It remains null in Apps Script deployments.
var SR_TEST_FAULT_HOOK = null;
var SR_SHEETS = {
  Config: ['Key', 'Value'],
  Members: ['Email', 'DisplayName', 'Role', 'Active'],
  Students: ['Id', 'FirstName', 'LastInitial', 'Grade', 'Homeroom', 'Email', 'Active', 'CreatedAt', 'UpdatedAt'],
  Ledger: ['Id', 'StudentId', 'Kind', 'Amount', 'Reason', 'ReferenceType', 'ReferenceId', 'ReversesId', 'ActorEmail', 'ActorRole', 'At', 'IdempotencyKey', 'CategoryId'],
  Balances: ['StudentId', 'Earned', 'Spent', 'Balance', 'UpdatedAt'],
  Categories: ['Id', 'Name', 'Description', 'Framework', 'Color', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
  Catalog: ['Id', 'Name', 'Description', 'Cost', 'InventoryLimit', 'Remaining', 'Active', 'ImageUrl', 'CreatedAt', 'UpdatedAt', 'InventoryVersion'],
  InventoryMovements: ['Id', 'CatalogId', 'Version', 'Kind', 'QuantityDelta', 'BeforeLimit', 'BeforeRemaining', 'AfterLimit', 'AfterRemaining', 'ReferenceType', 'ReferenceId', 'ActorEmail', 'ActorRole', 'At', 'IdempotencyKey', 'Reason', 'PreviousHash', 'Hash'],
  StoreWindows: ['Id', 'Name', 'StartsAt', 'EndsAt', 'Status', 'CreatedAt', 'UpdatedAt'],
  Orders: ['Id', 'StudentId', 'WindowId', 'Total', 'Status', 'ActorEmail', 'At', 'IdempotencyKey'],
  OrderLines: ['OrderId', 'CatalogId', 'ItemName', 'Quantity', 'UnitCost', 'LineTotal'],
  Statements: ['Id', 'StudentId', 'PeriodKey', 'Balance', 'Status', 'SentAt', 'Error'],
  Receipts: ['Id', 'OrderId', 'StudentId', 'Kind', 'RecipientEmail', 'Status', 'SentAt', 'Error'],
  PrintModels: ['Id', 'OwnerStudentId', 'FamilyId', 'Version', 'PreviousVersionId', 'RemixOfModelId', 'Title', 'Description', 'SourceFormat', 'OriginalFileId', 'PreviewFileId', 'PrintableFileId', 'ContentHash', 'ByteSize', 'TriangleCount', 'WidthMm', 'DepthMm', 'HeightMm', 'UnitDeclaration', 'ClientPreflightStatus', 'ClientPreflightJson', 'AiUse', 'AiDisclosure', 'PublicationStatus', 'CatalogTitle', 'CatalogDescription', 'CreatorLabel', 'ReusePolicy', 'ModerationReason', 'CreatedAt', 'UpdatedAt'],
  PrintRequests: ['Id', 'StudentId', 'ModelId', 'ModelHash', 'WindowId', 'Status', 'RequestedMaterialId', 'ApprovedMaterialId', 'PrinterProfileId', 'Quantity', 'QuotePoints', 'QuoteExpiresAt', 'EstimatedGrams', 'EstimatedMinutes', 'PreflightDecision', 'PreflightSummary', 'HoldId', 'OrderId', 'RevisionNumber', 'StudentNote', 'StaffReason', 'CreatedAt', 'SubmittedAt', 'ReviewedAt', 'ConfirmedAt', 'QueuedAt', 'PrintingAt', 'ReadyAt', 'FulfilledAt', 'ClosedAt', 'UpdatedAt', 'PreviousRequestId'],
  PrintAssets: ['Id', 'ModelId', 'OwnerStudentId', 'FileName', 'SourceFormat', 'MimeType', 'ContentHash', 'ByteSize', 'DriveFileId', 'Status', 'ReviewReason', 'UploadedAt', 'ReviewedAt', 'ReviewedByHash', 'UpdatedAt'],
  PrintPublications: ['Id', 'ModelId', 'OwnerStudentId', 'Status', 'CatalogTitle', 'CatalogDescription', 'CreatorLabel', 'ReusePolicy', 'ConsentVersion', 'ConsentAt', 'ModerationReason', 'SubmittedAt', 'ReviewedAt', 'UpdatedAt', 'ReportCount'],
  Guardians: ['Id', 'StudentId', 'GuardianEmail', 'GuardianName', 'Relationship', 'Active', 'ConsentConfirmedAt', 'CreatedAt', 'UpdatedAt'],
  GuardianDigests: ['Id', 'StudentId', 'GuardianEmailHash', 'PeriodKey', 'Status', 'SentAt', 'Error'],
  MailRuns: ['Id', 'Kind', 'PeriodKey', 'RequestedLimit', 'CursorKey', 'Attempted', 'Sent', 'Skipped', 'Failed', 'Uncertain', 'Status', 'ActorHash', 'OperationHash', 'CreatedAt', 'UpdatedAt', 'CompletedAt', 'LastError'],
  MailOutbox: ['Id', 'RunId', 'DeliveryKey', 'Kind', 'StudentId', 'GuardianId', 'RecipientHash', 'ConsentConfirmedAt', 'PeriodKey', 'PayloadJson', 'PayloadHash', 'Status', 'CreatedAt', 'AttemptedAt', 'SettledAt', 'ErrorCode', 'Error', 'RetryOfId', 'ResolvedAt', 'ResolvedByHash', 'ResolutionNote'],
  SisImports: ['Id', 'SnapshotId', 'FormatVersion', 'ContentHash', 'CreatedCount', 'UpdatedCount', 'UnchangedCount', 'Status', 'AppliedAt', 'ActorHash', 'CreatedAt'],
  PointHolds: ['Id', 'StudentId', 'PurposeType', 'PurposeId', 'Amount', 'Status', 'ExpiresAt', 'IdempotencyKey', 'CaptureLedgerId', 'CreatedAt', 'UpdatedAt', 'CapturedAt', 'ReleasedAt', 'ReleaseReason'],
  Audit: ['Id', 'Event', 'EntityType', 'EntityId', 'Summary', 'ActorEmail', 'ActorRole', 'At', 'PreviousHash', 'Hash'],
  Idempotency: ['Key', 'Operation', 'ResultJson', 'At']
};

function doGet(e) {
  var api = String(e && e.parameter && e.parameter.api || '');
  if (api === 'health') {
    try { var healthActor = currentActor_(); return jsonOutput_({ ok: true, service: SR_SERVICE, version: SR_VERSION, repositoryVersion: number_(configMap_(book_()).schemaVersion), role: healthActor.role }); }
    catch (err) { return jsonOutput_(publicError_(err)); }
  }
  if (api === 'status') return HtmlService.createHtmlOutput(statusPageHtml_()).setTitle('School Rewards deployment check');
  try {
    currentActor_();
    return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('AlloFlow School Rewards');
  } catch (err) {
    return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><title>Access unavailable</title><main style="font:16px system-ui;max-width:680px;margin:64px auto;padding:24px"><h1>Access unavailable</h1><p>School Rewards could not verify an authorized managed Google Education account.</p><p>Ask the school administrator to check the domain-only deployment and your membership.</p></main>');
  }
}
// The AlloFlow setup checklist opens this page as its deployment check: a
// principal reads a plain result instead of raw JSON. Same facts as ?api=health.
function statusPageHtml_() {
  var esc = function(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rows = [], ok = false, headline, detail;
  try {
    var actor = currentActor_(), config = configMap_(book_());
    ok = true;
    headline = 'Deployment check passed';
    detail = 'This deployment answers for a signed-in ' + esc(actor.role) + ' account. Open the portal once as each intended role and confirm each sees only its own surface.';
    rows = [['Service', SR_SERVICE], ['Script version', SR_VERSION], ['Repository schema', number_(config.schemaVersion) || 'not set up'], ['School', config.schoolName || ''], ['Academic year', config.academicYear || ''], ['Allowed domain', config.allowedDomain || ''], ['Your role', actor.role], ['Setup state', PropertiesService.getScriptProperties().getProperty('SR_SETUP_STATE') || 'not run']];
  } catch (err) {
    var failure = publicError_(err);
    headline = 'Deployment check failed';
    detail = failure.error + ' (' + failure.code + '). Check that you are signed into a managed account in the allowed domain, that the one-time setup ran, and that the deployment is the latest version.';
    rows = [['Service', SR_SERVICE], ['Script version', SR_VERSION]];
  }
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>School Rewards deployment check</title>'
    + '<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f3f6fb;color:#172033}main{max-width:640px;margin:48px auto;padding:24px}h1{font-size:24px;margin:0 0 8px}.badge{display:inline-block;padding:6px 12px;border-radius:999px;font-weight:800}.ok{background:#e7f7ee;color:#17643b}.bad{background:#ffe9ed;color:#92182f}table{width:100%;border-collapse:collapse;margin-top:18px;background:#fff;border:1px solid #dce2eb;border-radius:12px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid #e1e6ed}th{width:42%;color:#455269}p{color:#344057}@media(prefers-color-scheme:dark){body{background:#0f1520;color:#e6ebf5}table{background:#161e2e;border-color:#3a4760}th,td{border-color:#3a4760}th{color:#c7d0e0}p{color:#d3dbe8}.ok{background:#12351f;color:#a8ecc0}.bad{background:#3d1520;color:#ffb3c0}}</style></head>'
    + '<body><main><span class="badge ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'OK' : 'Failed') + '</span><h1>' + esc(headline) + '</h1><p>' + detail + '</p><table>'
    + rows.map(function(row) { return '<tr><th>' + esc(row[0]) + '</th><td>' + esc(row[1]) + '</td></tr>'; }).join('')
    + '</table><p><a href="?">Open the School Rewards portal</a></p></main></body></html>';
}
function doPost() { return jsonOutput_({ ok: false, code: 'method_not_allowed', error: 'HTTP mutation is disabled. Use the authenticated portal.' }); }
function include(name) { if (String(name) !== 'Portal') throw srError_('denied', 'Template include denied.'); return HtmlService.createHtmlOutputFromFile('Portal').getContent(); }

/** Run from the Apps Script editor as the managed account that will own the deployment. */
function setupSchoolRewardsRepository(config) {
  config = object_(config);
  var email = activeEmail_(), props = PropertiesService.getScriptProperties(), existing = configured_();
  if (!existing) {
    if (normalizeEmail_(Session.getEffectiveUser().getEmail()) !== email) throw srError_('denied', 'Initial setup must be run by the deployment owner.');
  } else if (currentActor_().role !== 'admin') throw srError_('denied', 'Only an administrator can update setup.');
  var domain = normalizeDomain_(config.allowedDomain || emailDomain_(email));
  if (!domain || emailDomain_(email) !== domain) throw srError_('bad_config', 'Allowed domain must match the setup account.');
  var adminEmail = normalizeEmail_(config.bootstrapAdmin || email);
  if (!existing && adminEmail !== email) throw srError_('bad_config', 'The first administrator must be the setup account.');
  var book;
  if (!existing) {
    var folder = DriveApp.createFolder('AlloFlow School Rewards Repository');
    setPrivate_(folder);
    book = SpreadsheetApp.create('AlloFlow School Rewards - Protected Ledger');
    var file = DriveApp.getFileById(book.getId());
    try { file.moveTo(folder); } catch (_) {}
    setPrivate_(file);
    props.setProperties({ SR_ALLOWED_DOMAIN: domain, SR_BOOTSTRAP_ADMIN: adminEmail, SR_FOLDER_ID: folder.getId(), SR_SPREADSHEET_ID: book.getId(), SR_SETUP_STATE: 'initializing' }, false);
  } else {
    if (domain !== props.getProperty('SR_ALLOWED_DOMAIN')) throw srError_('bad_config', 'Changing the domain requires a new reviewed deployment.');
    book = book_();
  }
  var priorSchemaVersion = existing ? number_(configMap_(book).schemaVersion) : SR_VERSION;
  if (existing && !priorSchemaVersion) throw srError_('schema', 'The existing repository has no valid schema version. Run the reviewed migration path before reconfiguration.');
  if (existing && priorSchemaVersion >= 6 && !mailDeliverySecret_(false)) throw srError_('mail_integrity', 'The mail delivery signing secret is unavailable. Restore the original Script Property before changing this repository.');
  initializeSheets_(book);
  if (!existing) mailDeliverySecret_(true);
  if (existing && priorSchemaVersion >= 6) ensureMailSafetySweepTrigger_();
  putConfig_(book, { service: SR_SERVICE, schemaVersion: priorSchemaVersion, allowedDomain: domain, schoolName: text_(config.schoolName, 160, 'School'), academicYear: text_(config.academicYear, 30, ''), webAppUrl: webAppUrl_(config.webAppUrl || ''), levelThresholds: normalizeLevelThresholds_(config.levelThresholds).join(',') });
  upsertMemberRow_(book, { email: adminEmail, displayName: text_(config.adminDisplayName, 120, 'School Rewards Administrator'), role: 'admin', active: true });
  (Array.isArray(config.members) ? config.members : []).forEach(function(member) { upsertMemberRow_(book, normalizeMember_(member, domain)); });
  var students = Array.isArray(config.students) ? config.students : [];
  if (students.length > 5000) throw srError_('bad_config', 'Student roster exceeds 5,000 records.');
  students.forEach(function(student) { upsertStudentRow_(book, normalizeStudent_(student, domain, '')); });
  if (!categories_(book).length && config.seedHowls !== false) seedHowlCategories_(book);
  props.setProperty('SR_SETUP_STATE', 'ready');
  appendAudit_({ event: existing ? 'REPOSITORY_RECONFIGURED' : 'REPOSITORY_CREATED', type: 'repository', id: 'repository', summary: existing ? 'Repository configuration reviewed' : 'School rewards repository created' }, { email: email, role: 'admin' });
  if (!existing) ensureMailSafetySweepTrigger_();
  return { ok: true, service: SR_SERVICE, version: SR_VERSION, repositoryVersion: priorSchemaVersion, spreadsheetId: book.getId(), folderId: props.getProperty('SR_FOLDER_ID'), allowedDomain: domain };
}

/** One-time additive migration for existing schema-v3 repositories. */
function migrateSchoolRewardsRepositoryV4() {
  var actor = requireRole_(['admin']);
  return locked_(function() {
    var book = book_(); initializeSheets_(book); putConfig_(book, { schemaVersion: 4 });
    appendAudit_({ event: 'REPOSITORY_MIGRATED_V4', type: 'repository', id: 'repository', summary: 'Additive School Rewards schema v4 migration completed' }, actor);
    return { ok: true, service: SR_SERVICE, version: 4 };
  });
}

/** One-time additive migration for the append-only inventory movement ledger. */
function migrateSchoolRewardsRepositoryV5() {
  var actor = requireRole_(['admin']);
  return locked_(function() {
    var book = book_();
    assertNoPendingCoreOperation_(book, '');
    initializeSheets_(book);
    var migrated = 0, baselines = 0;
    catalog_(book).forEach(function(item) {
      if ((item.inventoryLimit < 0 && item.remaining !== -1) || (item.inventoryLimit >= 0 && (item.remaining < 0 || item.remaining > item.inventoryLimit || Math.floor(item.remaining) !== item.remaining))) throw srError_('inventory_migration_conflict', 'Catalog item ' + item.id + ' has invalid legacy inventory bounds. Correct the source repository before migrating.');
      if (item.inventoryVersion > 0) {
        try { assertInventoryChainTailMatchesCatalog_(book, item); }
        catch (_) { throw srError_('inventory_migration_conflict', 'Catalog item ' + item.id + ' has a versioned inventory snapshot that does not match an exact movement hash chain. Review the repository before migrating.'); }
        return;
      }
      var key = 'migration_v5_' + hash_(item.id).slice(0, 32);
      var movementId = inventoryMovementId_('MIGRATION_BASELINE', key, item.id, 1);
      var prior = inventoryMovementById_(book, movementId), spec;
      if (prior) {
        if (prior.kind !== 'MIGRATION_BASELINE' || prior.catalogId !== item.id || prior.version !== 1 || prior.beforeLimit !== item.inventoryLimit || prior.beforeRemaining !== item.remaining || prior.afterLimit !== item.inventoryLimit || prior.afterRemaining !== item.remaining) throw srError_('inventory_migration_conflict', 'The saved inventory baseline does not match catalog item ' + item.id + '.');
        spec = prior;
      } else {
        spec = buildInventoryMovementSpec_({
          id: movementId, catalogId: item.id, version: 1, kind: 'MIGRATION_BASELINE', quantityDelta: 0,
          beforeLimit: item.inventoryLimit, beforeRemaining: item.remaining, afterLimit: item.inventoryLimit, afterRemaining: item.remaining,
          referenceType: 'migration', referenceId: 'schema-v5', actorEmail: actor.email, actorRole: actor.role,
          at: now_(), idempotencyKey: key, reason: 'Schema v5 inventory baseline', previousHash: 'GENESIS'
        });
        baselines++;
      }
      var after = copyCatalogItem_(item); after.inventoryVersion = 1; after.updatedAt = spec.at;
      applyInventoryMovement_(book, spec, after, 'migration_v5:after_movement', 'migration_v5:after_materialize');
      migrated++;
    });
    appendAuditOnce_({ event: 'REPOSITORY_MIGRATED_V5', type: 'repository', id: 'repository', summary: 'Additive School Rewards schema v5 inventory movement migration completed' }, actor);
    putConfig_(book, { schemaVersion: 5 });
    return { ok: true, service: SR_SERVICE, version: 5, migratedCatalogItems: migrated, baselineMovements: baselines };
  });
}

/** One-time additive migration for resilient bulk-mail runs and outbox attempts. */
function migrateSchoolRewardsRepositoryV6() {
  var actor = requireRole_(['admin']);
  return locked_(function() {
    var book = book_(), configuredVersion = number_(configMap_(book).schemaVersion);
    if (configuredVersion < 5) throw srError_('mail_migration_order', 'Run the schema v5 inventory migration before migrating mail delivery to schema v6.');
    if (configuredVersion >= 6 && !mailDeliverySecret_(false)) throw srError_('mail_integrity', 'The mail delivery signing secret is unavailable. Restore the original Script Property before validating schema v6.');
    assertNoPendingCoreOperation_(book, '');
    initializeSheets_(book);
    var existingMailRuns = rows_(sheet_(book, 'MailRuns'), 17), existingMailOutbox = rows_(sheet_(book, 'MailOutbox'), 21);
    if (configuredVersion < 6 && (existingMailRuns.length || existingMailOutbox.length)) throw srError_('mail_migration_conflict', 'Schema v5 mail tables contain unverifiable rows. Remove or independently archive them before schema v6 migration.');
    if (configuredVersion < 6) mailDeliverySecret_(true);
    ensureMailSafetySweepTrigger_();
    if (configuredVersion >= 6) {
      mailRuns_(book).forEach(assertMailRunSignature_);
      mailOutbox_(book).forEach(assertMailDeliverySignature_);
    }
    appendAuditOnce_({ event: 'REPOSITORY_MIGRATED_V6', type: 'repository', id: 'repository', summary: 'Additive School Rewards schema v6 resilient mail migration completed' }, actor);
    putConfig_(book, { schemaVersion: 6 });
    return { ok: true, service: SR_SERVICE, version: 6 };
  });
}

function getSchoolRewardsBootstrap() {
  // One PointHolds read per request, not one per student: at roster scale the
  // per-student re-read was the dominant cost of every portal load.
  var actor = currentActor_(), book = book_(), config = configMap_(book), balanceMap = balancesMap_(book), holds = pointHolds_(book);
  var allStudents = students_(book), students = actor.role === 'admin' ? allStudents : allStudents.filter(function(student) { return student.active; });
  students.forEach(function(student) {
    var availability = pointAvailability_(book, student.id, balanceMap, holds);
    student.balance = availability.balance;
    student.reservedPoints = availability.reservedPoints;
    student.availableBalance = availability.availableBalance;
  });
  var categories = categories_(book);
  var visible = visibleWindow_(book);
  if (actor.role === 'student') {
    var ownStudent = requireStudent_(book, actor.studentId), ownAvailability = pointAvailability_(book, actor.studentId, balanceMap, holds), ownLanguage = studentLanguage_(book, actor.studentId);
    ownStudent = { id: ownStudent.id, firstName: ownStudent.firstName, lastInitial: ownStudent.lastInitial, grade: ownStudent.grade, homeroom: ownStudent.homeroom, active: true, language: ownLanguage, balance: ownAvailability.balance, reservedPoints: ownAvailability.reservedPoints, availableBalance: ownAvailability.availableBalance };
    var ownLedger = ledger_(book).filter(function(entry) { return entry.studentId === actor.studentId; }).slice(-200).reverse().map(studentLedgerEntry_);
    var ownOrderRows = orders_(book).filter(function(order) { return order.studentId === actor.studentId; }).slice(-50).reverse();
    var ownOrders = ownOrderRows.map(function(order) { return orderDto_(book, order); });
    return { ok: true, service: SR_SERVICE, version: SR_VERSION, actor: actor,
      config: { schoolName: config.schoolName || 'School', academicYear: config.academicYear || '', levelThresholds: normalizeLevelThresholds_(config.levelThresholds), printLabEnabled: printLabEnabled_(config) },
      students: [ownStudent], categories: categories, progress: categoryProgress_(book, actor.studentId, categories, config),
      catalog: visible ? catalog_(book).filter(function(item) { return item.active; }) : [], windows: visible ? [visible] : [],
      recentLedger: ownLedger, recentOrders: ownOrders, recentReceipts: receiptDtosForOrders_(book, ownOrderRows) };
  }
  if (actor.role !== 'admin') students = students.map(function(student) { return { id: student.id, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, active: student.active, balance: student.balance, reservedPoints: student.reservedPoints, availableBalance: student.availableBalance }; });
  var catalogItems = catalog_(book), recentOrderRows = actor.role === 'staff' ? [] : orders_(book).slice(-50).reverse();
  var recentLedgerItems = actor.role === 'cashier' ? [] : ledger_(book).slice(-100).reverse();
  if (actor.role === 'staff') recentLedgerItems = recentLedgerItems.map(studentLedgerEntry_);
  var result = { ok: true, service: SR_SERVICE, version: SR_VERSION, actor: actor,
    config: { schoolName: config.schoolName || 'School', academicYear: config.academicYear || '', webAppUrl: config.webAppUrl || '', levelThresholds: normalizeLevelThresholds_(config.levelThresholds), printLabEnabled: printLabEnabled_(config) },
    students: students, categories: categories, catalog: actor.role === 'admin' ? catalogItems : catalogItems.filter(function(item) { return item.active; }),
    windows: windows_(book).filter(function(item) { return item.status !== 'ARCHIVED'; }),
    recentLedger: recentLedgerItems, recentOrders: recentOrderRows.map(function(order) { return orderDto_(book, order); }), recentReceipts: actor.role === 'staff' ? [] : receiptDtosForOrders_(book, recentOrderRows),
    emailSchedule: emailSchedule_(), mailQuota: mailQuota_() };
  if (actor.role === 'admin') {
    result.members = members_(book);
    result.recentMailRuns = mailRuns_(book).slice(-25).reverse().map(function(run) { return mailRunDto_(book, run); });
    result.unresolvedMailDeliveries = actionableMailDeliveries_(book).slice(-50).reverse().map(function(delivery) { return mailDeliveryDto_(delivery, book); });
  }
  return result;
}

function getSchoolRewardsPrintBootstrap() {
  var actor = currentActor_();
  if (['student', 'staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot access Print Lab requests.');
  var book = book_(), models = printModels_(book), requests = printRequests_(book), holds = pointHolds_(book);
  var assets = printAssets_(book), publications = printPublications_(book), publishedPublicationByModel = {};
  publications.forEach(function(publication) { if (publication.status === 'PUBLISHED') publishedPublicationByModel[publication.modelId] = publication; });
  var published = models.filter(function(model) { return model.publicationStatus === 'PUBLISHED' && publishedPublicationByModel[model.id]; }).map(function(model) {
    var dto = printModelDto_(model, 'community'); dto.publicationId = publishedPublicationByModel[model.id].id; return dto;
  });
  if (actor.role === 'student') {
    return {
      ok: true,
      actor: { role: 'student', studentId: actor.studentId },
      balance: pointAvailability_(book, actor.studentId, undefined, holds),
      models: models.filter(function(model) { return model.ownerStudentId === actor.studentId; }).slice(-100).reverse().map(function(model) { return printModelDto_(model, 'owner'); }),
      requests: requests.filter(function(request) { return request.studentId === actor.studentId; }).slice(-100).reverse().map(printRequestDto_),
      holds: holds.filter(function(hold) { return hold.studentId === actor.studentId && hold.status === 'ACTIVE'; }).map(pointHoldDto_),
      assets: assets.filter(function(asset) { return asset.ownerStudentId === actor.studentId; }).slice(-100).reverse().map(printAssetDto_),
      publications: publications.filter(function(publication) { return publication.ownerStudentId === actor.studentId; }).slice(-100).reverse().map(printPublicationDto_),
      communityModels: published.slice(0, 200)
    };
  }
  var studentsById = {};
  students_(book).forEach(function(student) { studentsById[student.id] = { id: student.id, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom }; });
  return {
    ok: true,
    actor: { role: actor.role },
    models: models.slice(-300).reverse().map(function(model) { return printModelDto_(model, 'staff'); }),
    requests: requests.slice(-300).reverse().map(function(request) { var dto = printRequestDto_(request); dto.student = studentsById[request.studentId] || { id: request.studentId }; return dto; }),
    holds: actor.role === 'admin' ? holds.slice(-300).reverse().map(pointHoldDto_) : [],
    assets: assets.slice(-300).reverse().map(printAssetDto_),
    publications: publications.slice(-300).reverse().map(printPublicationDto_),
    communityModels: published.slice(0, 200)
  };
}

function createSchoolRewardsPrintModel(request) {
  var actor = currentActor_(); request = object_(request);
  if (['student', 'staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot create Print Lab models.');
  var book = book_(), studentId = actor.role === 'student' ? actor.studentId : id_(request.studentId, 'student');
  requireStudent_(book, studentId);
  var key = idemKey_(request.idempotencyKey), normalized = normalizePrintModelInput_(book, request, studentId);
  var operation = printIdemOperation_('print_model_create', actor, normalized.idempotencyPayload);
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    assertPrintModelCapacity_(book, studentId);
    var modelId = uuid_(), at = now_(), sourceFileId = '';
    if (normalized.sourceFormat === 'RECIPE') sourceFileId = storePrintRecipe_(modelId, normalized.recipeJson);
    var model = {
      id: modelId, ownerStudentId: studentId, familyId: normalized.familyId || modelId, version: normalized.version,
      previousVersionId: normalized.previousVersionId, remixOfModelId: normalized.remixOfModelId,
      title: normalized.title, description: normalized.description, sourceFormat: normalized.sourceFormat,
      originalFileId: sourceFileId, previewFileId: '', printableFileId: '', contentHash: normalized.contentHash,
      byteSize: normalized.byteSize, triangleCount: normalized.triangleCount, widthMm: normalized.widthMm,
      depthMm: normalized.depthMm, heightMm: normalized.heightMm, unitDeclaration: normalized.unitDeclaration,
      clientPreflightStatus: normalized.clientPreflightStatus, clientPreflightJson: normalized.clientPreflightJson,
      aiUse: normalized.aiUse, aiDisclosure: normalized.aiDisclosure, publicationStatus: 'PRIVATE',
      catalogTitle: '', catalogDescription: '', creatorLabel: 'School community creator', reusePolicy: 'SCHOOL_VIEW_PRINT',
      moderationReason: '', createdAt: at, updatedAt: at
    };
    upsertPrintModelRow_(book, model);
    var result = { ok: true, model: printModelDto_(model, 'owner') };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'PRINT_MODEL_CREATED', type: 'print_model', id: model.id, summary: 'Private print model version created' }, actor);
    return result;
  });
}

/** Uploads a small imported model into private school-owned Drive storage. */
function uploadSchoolRewardsPrintAsset(request) {
  var actor = currentActor_(); request = object_(request);
  if (['student', 'staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot upload Print Lab assets.');
  var modelId = id_(request.modelId, 'print model'), key = idemKey_(request.idempotencyKey);
  var fileName = printAssetFileName_(request.fileName), mimeType = text_(request.mimeType, 100, '').toLowerCase();
  var suppliedHash = text_(request.contentHash, 100, ''), encoded = String(request.base64 == null ? '' : request.base64).trim();
  var operation = printIdemOperation_('print_asset_upload', actor, { modelId: modelId, fileName: fileName, mimeType: mimeType, contentHash: suppliedHash });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), model = requirePrintModel_(book, modelId);
    if (actor.role === 'student' && model.ownerStudentId !== actor.studentId) throw srError_('denied', 'Students can upload only to their own model.');
    if (['GLB', 'STL'].indexOf(model.sourceFormat) < 0) throw srError_('bad_asset', 'Recipe models do not accept a binary asset upload.');
    validatePrintAssetMetadata_(model, fileName, mimeType, suppliedHash);
    var bytes = decodePrintAssetBase64_(encoded), digests = sha256Bytes_(bytes);
    if (!sameSha256_(suppliedHash, digests)) throw srError_('hash_mismatch', 'The uploaded bytes do not match the supplied SHA-256 hash.');
    if (!sameContentHash_(model.contentHash, suppliedHash)) throw srError_('hash_mismatch', 'The uploaded hash does not match this immutable model version.');
    if (model.byteSize !== bytes.length) throw srError_('size_mismatch', 'The uploaded byte size does not match this immutable model version.');
    validatePrintAssetMagic_(model.sourceFormat, bytes);
    var at = now_(); assertPrintAssetCapacity_(book, model.ownerStudentId, bytes.length, at);
    var assetId = uuid_(), blob = Utilities.newBlob(bytes, mimeType, assetId + '-' + fileName);
    var file = printAssetFolder_().createFile(blob); setPrivate_(file);
    var asset = { id: assetId, modelId: model.id, ownerStudentId: model.ownerStudentId, fileName: fileName, sourceFormat: model.sourceFormat, mimeType: mimeType, contentHash: suppliedHash, byteSize: bytes.length, driveFileId: file.getId(), status: 'PENDING', reviewReason: '', uploadedAt: at, reviewedAt: '', reviewedByHash: '', updatedAt: at };
    upsertPrintAssetRow_(book, asset);
    model.clientPreflightStatus = 'ASSET_PENDING_REVIEW'; model.updatedAt = at; upsertPrintModelRow_(book, model);
    var result = { ok: true, asset: printAssetDto_(asset), model: printModelDto_(model, actor.role === 'student' ? 'owner' : 'staff') };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'PRINT_ASSET_UPLOADED', type: 'print_asset', id: asset.id, summary: 'Private ' + model.sourceFormat + ' asset uploaded for staff verification' }, actor);
    return result;
  });
}

function reviewSchoolRewardsPrintAsset(request) {
  var actor = requireRole_(['admin', 'staff']); request = object_(request);
  var assetId = id_(request.assetId, 'print asset'), action = text_(request.action, 20, '').toUpperCase();
  var reason = text_(request.reason, 500, ''), key = idemKey_(request.idempotencyKey);
  if (['VERIFY', 'REJECT'].indexOf(action) < 0) throw srError_('bad_action', 'Choose verify or reject.');
  if (reason.replace(/\s/g, '').length < 8) throw srError_('reason_required', 'Record meaningful staff review evidence before verifying or rejecting an asset.');
  var operation = printIdemOperation_('print_asset_review', actor, { assetId: assetId, action: action, reason: reason });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), asset = requirePrintAsset_(book, assetId), model = requirePrintModel_(book, asset.modelId), at = now_();
    if (asset.status !== 'PENDING') throw srError_('invalid_transition', 'Only an asset awaiting review can be reviewed.');
    if (asset.ownerStudentId !== model.ownerStudentId || asset.sourceFormat !== model.sourceFormat || !sameContentHash_(asset.contentHash, model.contentHash)) throw srError_('reconciliation', 'The asset does not reconcile with its model version.');
    if (action === 'VERIFY') {
      if (!DriveApp.getFileById(asset.driveFileId)) throw srError_('asset_missing', 'The private Drive asset is unavailable.');
      asset.status = 'VERIFIED'; model.printableFileId = asset.driveFileId; model.originalFileId = model.originalFileId || asset.driveFileId; model.clientPreflightStatus = 'READY';
    } else {
      asset.status = 'REJECTED'; model.clientPreflightStatus = 'ASSET_REJECTED';
    }
    asset.reviewReason = reason; asset.reviewedAt = at; asset.reviewedByHash = hash_(actor.email); asset.updatedAt = at; model.updatedAt = at;
    upsertPrintAssetRow_(book, asset); upsertPrintModelRow_(book, model);
    var result = { ok: true, asset: printAssetDto_(asset), model: printModelDto_(model, 'staff') };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: action === 'VERIFY' ? 'PRINT_ASSET_VERIFIED' : 'PRINT_ASSET_REJECTED', type: 'print_asset', id: asset.id, summary: action === 'VERIFY' ? 'Private print asset verified' : 'Private print asset rejected' }, actor);
    return result;
  });
}

function submitSchoolRewardsPrintRequest(request) {
  var actor = currentActor_(); request = object_(request);
  if (['student', 'staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot submit Print Lab requests.');
  var studentId = actor.role === 'student' ? actor.studentId : id_(request.studentId, 'student');
  var modelId = id_(request.modelId, 'print model'), windowId = id_(request.windowId, 'store window'), key = idemKey_(request.idempotencyKey);
  var payload = { studentId: studentId, modelId: modelId, windowId: windowId, requestedMaterialId: text_(request.requestedMaterialId, 80, ''), studentNote: text_(request.studentNote, 500, '') };
  var operation = printIdemOperation_('print_request_submit', actor, payload);
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(); requireStudent_(book, studentId);
    var model = requirePrintModel_(book, modelId), windowItem = windowById_(book, windowId);
    if (model.ownerStudentId !== studentId && model.publicationStatus !== 'PUBLISHED') throw srError_('denied', 'That model is not available to this student.');
    if (!windowItem || ['PREVIEW', 'OPEN'].indexOf(windowItem.status) < 0) throw srError_('store_closed', 'Print requests are accepted only during a preview or open store window.');
    var duplicate = printRequests_(book).some(function(item) { return item.studentId === studentId && item.modelId === modelId && item.windowId === windowId && ['SUPERSEDED', 'REJECTED', 'CANCELLED', 'REFUNDED'].indexOf(item.status) < 0; });
    if (duplicate) throw srError_('duplicate_request', 'An active request already exists for this model and store window.');
    var at = now_(), saved = emptyPrintRequest_();
    saved.id = uuid_(); saved.studentId = studentId; saved.modelId = model.id; saved.modelHash = model.contentHash; saved.windowId = windowId;
    saved.status = 'SUBMITTED'; saved.requestedMaterialId = payload.requestedMaterialId; saved.quantity = 1; saved.revisionNumber = 1;
    saved.studentNote = payload.studentNote; saved.createdAt = at; saved.submittedAt = at; saved.updatedAt = at;
    upsertPrintRequestRow_(book, saved);
    var result = { ok: true, request: printRequestDto_(saved) };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'PRINT_REQUEST_SUBMITTED', type: 'print_request', id: saved.id, summary: 'Private print request submitted' }, actor);
    return result;
  });
}

/** Creates an immutable request revision and closes the staff-returned request. */
function resubmitSchoolRewardsPrintRequest(request) {
  var actor = currentActor_(); request = object_(request);
  if (['student', 'staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot resubmit Print Lab requests.');
  var requestId = id_(request.requestId, 'print request'), modelId = id_(request.modelId, 'print model');
  var key = idemKey_(request.idempotencyKey);
  var payload = { requestId: requestId, modelId: modelId, windowId: text_(request.windowId, 80, ''), requestedMaterialId: text_(request.requestedMaterialId, 80, ''), studentNote: text_(request.studentNote, 500, '') };
  var operation = printIdemOperation_('print_request_resubmit', actor, payload);
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), previousRequest = requirePrintRequest_(book, requestId), model = requirePrintModel_(book, modelId);
    if (previousRequest.status !== 'REVISION_REQUESTED') throw srError_('invalid_transition', 'Only a request returned for revision can be resubmitted.');
    if (actor.role === 'student' && previousRequest.studentId !== actor.studentId) throw srError_('denied', 'Students can resubmit only their own request.');
    if (model.ownerStudentId !== previousRequest.studentId) throw srError_('denied', 'The revised model must belong to the same student.');
    if (model.previousVersionId !== previousRequest.modelId) throw srError_('bad_revision', 'Create a linked model version from the returned model before resubmitting.');
    var windowId = payload.windowId ? id_(payload.windowId, 'store window') : previousRequest.windowId, windowItem = windowById_(book, windowId);
    if (!windowItem || ['PREVIEW', 'OPEN'].indexOf(windowItem.status) < 0) throw srError_('store_closed', 'The revised request needs a preview or open store window.');
    var at = now_(), saved = emptyPrintRequest_();
    saved.id = uuid_(); saved.studentId = previousRequest.studentId; saved.modelId = model.id; saved.modelHash = model.contentHash; saved.windowId = windowId;
    saved.status = 'SUBMITTED'; saved.requestedMaterialId = payload.requestedMaterialId || previousRequest.requestedMaterialId; saved.quantity = 1;
    saved.revisionNumber = Math.max(1, previousRequest.revisionNumber) + 1; saved.previousRequestId = previousRequest.id;
    saved.studentNote = payload.studentNote; saved.createdAt = at; saved.submittedAt = at; saved.updatedAt = at;
    previousRequest.status = 'SUPERSEDED'; previousRequest.closedAt = at; previousRequest.updatedAt = at;
    upsertPrintRequestRow_(book, previousRequest); upsertPrintRequestRow_(book, saved);
    var result = { ok: true, previousRequest: printRequestDto_(previousRequest), request: printRequestDto_(saved) };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'PRINT_REQUEST_RESUBMITTED', type: 'print_request', id: saved.id, summary: 'Linked print request revision ' + saved.revisionNumber + ' submitted' }, actor);
    return result;
  });
}

function submitSchoolRewardsPrintPublication(request) {
  var actor = requireRole_(['student']); request = object_(request);
  var modelId = id_(request.modelId, 'print model'), key = idemKey_(request.idempotencyKey);
  var consent = request.consent === true;
  var payload = { modelId: modelId, catalogTitle: text_(request.catalogTitle, 120, ''), catalogDescription: text_(request.catalogDescription, 1000, ''), creatorLabel: text_(request.creatorLabel, 80, 'School community creator'), reusePolicy: text_(request.reusePolicy, 40, 'SCHOOL_VIEW_PRINT').toUpperCase(), consent: consent };
  if (!consent) throw srError_('consent_required', 'Publishing requires an explicit student opt-in.');
  if (!payload.catalogTitle) throw srError_('bad_publication', 'A catalog title is required.');
  if (['SCHOOL_VIEW_PRINT', 'SCHOOL_REMIX_PRINT'].indexOf(payload.reusePolicy) < 0) throw srError_('bad_publication', 'Choose school viewing/printing or school remixing/printing.');
  var operation = printIdemOperation_('print_publication_submit', actor, payload);
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), model = requirePrintModel_(book, modelId);
    if (model.ownerStudentId !== actor.studentId) throw srError_('denied', 'Students can publish only their own model.');
    if (!printModelReadyForQuote_(model)) throw srError_('asset_handoff_required', 'The model needs a verified school-managed printable asset before publication.');
    if (['PENDING', 'PUBLISHED', 'REPORTED'].indexOf(model.publicationStatus) >= 0) throw srError_('invalid_transition', 'This model already has an active publication review.');
    var at = now_(), publication = { id: uuid_(), modelId: model.id, ownerStudentId: model.ownerStudentId, status: 'PENDING', catalogTitle: payload.catalogTitle, catalogDescription: payload.catalogDescription, creatorLabel: payload.creatorLabel, reusePolicy: payload.reusePolicy, consentVersion: 'student-opt-in-v1', consentAt: at, moderationReason: '', submittedAt: at, reviewedAt: '', updatedAt: at, reportCount: 0 };
    upsertPrintPublicationRow_(book, publication);
    model.publicationStatus = 'PENDING'; model.catalogTitle = publication.catalogTitle; model.catalogDescription = publication.catalogDescription; model.creatorLabel = publication.creatorLabel; model.reusePolicy = publication.reusePolicy; model.moderationReason = ''; model.updatedAt = at; upsertPrintModelRow_(book, model);
    var result = { ok: true, publication: printPublicationDto_(publication), model: printModelDto_(model, 'owner') };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'PRINT_PUBLICATION_SUBMITTED', type: 'print_publication', id: publication.id, summary: 'Student opted in to school catalog moderation' }, actor);
    return result;
  });
}

function reviewSchoolRewardsPrintPublication(request) {
  var actor = currentActor_(); request = object_(request);
  if (['student', 'staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot access publication review.');
  var action = text_(request.action, 20, '').toUpperCase(), reason = text_(request.reason, 500, ''), key = idemKey_(request.idempotencyKey);
  if (['APPROVE', 'REJECT', 'UNPUBLISH', 'REPORT'].indexOf(action) < 0) throw srError_('bad_action', 'Choose approve, reject, unpublish, or report.');
  if (action !== 'REPORT' && ['staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Only staff can moderate catalog publications.');
  if (['REJECT', 'UNPUBLISH', 'REPORT'].indexOf(action) >= 0 && !reason) throw srError_('reason_required', 'A moderation reason is required.');
  var publicationId = optionalId_(request.publicationId, 'publication'), modelId = optionalId_(request.modelId, 'print model');
  if (!publicationId && !modelId) throw srError_('bad_id', 'A publication or model id is required.');
  var operation = printIdemOperation_('print_publication_review', actor, { publicationId: publicationId, modelId: modelId, action: action, reason: reason });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), publication = publicationId ? requirePrintPublication_(book, publicationId) : requireLatestPrintPublicationForModel_(book, modelId);
    var model = requirePrintModel_(book, publication.modelId), at = now_(), event = '';
    if (action === 'APPROVE') {
      if (['PENDING', 'REPORTED'].indexOf(publication.status) < 0) throw srError_('invalid_transition', 'Only pending or reported content can be approved.');
      if (!printModelReadyForQuote_(model)) throw srError_('asset_handoff_required', 'The model is not ready for the school catalog.');
      publication.status = 'PUBLISHED'; publication.moderationReason = reason; event = 'PRINT_PUBLICATION_APPROVED';
    } else if (action === 'REJECT') {
      if (['PENDING', 'REPORTED'].indexOf(publication.status) < 0) throw srError_('invalid_transition', 'Only pending or reported content can be rejected.');
      publication.status = 'REJECTED'; publication.moderationReason = reason; event = 'PRINT_PUBLICATION_REJECTED';
    } else if (action === 'UNPUBLISH') {
      if (['PUBLISHED', 'REPORTED'].indexOf(publication.status) < 0) throw srError_('invalid_transition', 'Only published or reported content can be unpublished.');
      publication.status = 'UNPUBLISHED'; publication.moderationReason = reason; event = 'PRINT_PUBLICATION_UNPUBLISHED';
    } else {
      if (publication.status !== 'PUBLISHED') throw srError_('invalid_transition', 'Only published catalog content can be reported.');
      publication.status = 'REPORTED'; publication.reportCount += 1; publication.moderationReason = reason; event = 'PRINT_PUBLICATION_REPORTED';
    }
    publication.reviewedAt = at; publication.updatedAt = at; upsertPrintPublicationRow_(book, publication);
    model.publicationStatus = publication.status; model.moderationReason = reason; model.updatedAt = at; upsertPrintModelRow_(book, model);
    var audience = actor.role === 'student' ? (model.ownerStudentId === actor.studentId ? 'owner' : 'community') : 'staff';
    var result = { ok: true, publication: printPublicationDto_(publication), model: printModelDto_(model, audience) };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: event, type: 'print_publication', id: publication.id, summary: action === 'REPORT' ? 'Published model hidden pending staff review' : 'School catalog moderation completed' }, actor);
    return result;
  });
}

function remixSchoolRewardsPrintModel(request) {
  var actor = requireRole_(['student']); request = object_(request);
  var sourceModelId = id_(request.modelId, 'print model'), key = idemKey_(request.idempotencyKey);
  var payload = { modelId: sourceModelId, title: text_(request.title, 120, ''), description: text_(request.description, 1000, ''), aiUse: text_(request.aiUse, 20, 'NONE').toUpperCase(), aiDisclosure: text_(request.aiDisclosure, 500, '') };
  var operation = printIdemOperation_('print_model_remix', actor, payload);
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), source = requirePrintModel_(book, sourceModelId);
    if (source.publicationStatus !== 'PUBLISHED' || source.sourceFormat !== 'RECIPE' || source.reusePolicy !== 'SCHOOL_REMIX_PRINT') throw srError_('remix_denied', 'Only published recipe models that permit school remixing can be remixed.');
    var recipe = loadPrintRecipe_(source), normalized = normalizePrintModelInput_(book, { title: payload.title || ('Remix of ' + (source.catalogTitle || source.title)), description: payload.description || source.catalogDescription || source.description, sourceFormat: 'RECIPE', recipe: recipe, remixOfModelId: source.id, widthMm: source.widthMm, depthMm: source.depthMm, heightMm: source.heightMm, triangleCount: source.triangleCount, unitDeclaration: source.unitDeclaration, clientPreflightStatus: source.clientPreflightStatus, clientPreflightJson: source.clientPreflightJson, aiUse: payload.aiUse, aiDisclosure: payload.aiDisclosure }, actor.studentId);
    var modelId = uuid_(), at = now_(), sourceFileId = storePrintRecipe_(modelId, normalized.recipeJson);
    var model = { id: modelId, ownerStudentId: actor.studentId, familyId: modelId, version: 1, previousVersionId: '', remixOfModelId: source.id, title: normalized.title, description: normalized.description, sourceFormat: 'RECIPE', originalFileId: sourceFileId, previewFileId: '', printableFileId: '', contentHash: normalized.contentHash, byteSize: normalized.byteSize, triangleCount: normalized.triangleCount, widthMm: normalized.widthMm, depthMm: normalized.depthMm, heightMm: normalized.heightMm, unitDeclaration: normalized.unitDeclaration, clientPreflightStatus: normalized.clientPreflightStatus, clientPreflightJson: normalized.clientPreflightJson, aiUse: normalized.aiUse, aiDisclosure: normalized.aiDisclosure, publicationStatus: 'PRIVATE', catalogTitle: '', catalogDescription: '', creatorLabel: 'School community creator', reusePolicy: 'SCHOOL_VIEW_PRINT', moderationReason: '', createdAt: at, updatedAt: at };
    upsertPrintModelRow_(book, model);
    var result = { ok: true, model: printModelDto_(model, 'owner') };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'PRINT_MODEL_REMIXED', type: 'print_model', id: model.id, summary: 'Private recipe remix created from a moderated catalog model' }, actor);
    return result;
  });
}

function reviewSchoolRewardsPrintRequest(request) {
  var actor = requireRole_(['admin', 'staff']); request = object_(request);
  var requestId = id_(request.requestId, 'print request'), action = text_(request.action, 30, '').toUpperCase(), key = idemKey_(request.idempotencyKey);
  var payload = { requestId: requestId, action: action, reason: text_(request.reason, 500, ''), quotePoints: request.quotePoints, quoteExpiresAt: request.quoteExpiresAt || '', approvedMaterialId: text_(request.approvedMaterialId, 80, ''), printerProfileId: text_(request.printerProfileId, 80, ''), estimatedGrams: request.estimatedGrams, estimatedMinutes: request.estimatedMinutes, preflightDecision: text_(request.preflightDecision, 30, '').toUpperCase(), preflightSummary: text_(request.preflightSummary, 2000, '') };
  var operation = printIdemOperation_('print_request_review', actor, payload);
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), item = requirePrintRequest_(book, requestId), at = now_();
    if (['SUBMITTED', 'QUOTED'].indexOf(item.status) < 0) throw srError_('invalid_transition', 'This request is not awaiting staff review.');
    if (action === 'REQUEST_REVISION') {
      if (!payload.reason) throw srError_('reason_required', 'Explain the revision the student should make.');
      item.status = 'REVISION_REQUESTED'; item.staffReason = payload.reason; item.reviewedAt = at;
    } else if (action === 'REJECT') {
      if (!payload.reason) throw srError_('reason_required', 'Explain why the request cannot be accepted.');
      item.status = 'REJECTED'; item.staffReason = payload.reason; item.reviewedAt = at; item.closedAt = at;
    } else if (action === 'QUOTE') {
      var model = requirePrintModel_(book, item.modelId);
      if (model.contentHash !== item.modelHash) throw srError_('model_changed', 'The request no longer matches the reviewed model version.');
      if (!printModelReadyForQuote_(model)) throw srError_('asset_handoff_required', 'This GLB/STL registration still needs a school-managed printable asset before it can be quoted.');
      var decision = payload.preflightDecision || 'APPROVED';
      if (['APPROVED', 'OVERRIDE'].indexOf(decision) < 0) throw srError_('bad_preflight', 'Preflight decision must be approved or override.');
      if (decision === 'OVERRIDE' && !payload.reason) throw srError_('reason_required', 'A preflight override requires a staff reason.');
      var quote = integer_(payload.quotePoints, 1, 100000, 'Quote points'), expiresAt = iso_(payload.quoteExpiresAt);
      if (!expiresAt || new Date(expiresAt).getTime() <= new Date().getTime()) throw srError_('bad_quote', 'Quote expiration must be in the future.');
      item.status = 'QUOTED'; item.quotePoints = quote; item.quoteExpiresAt = expiresAt;
      item.approvedMaterialId = payload.approvedMaterialId; item.printerProfileId = payload.printerProfileId;
      item.estimatedGrams = integer_(payload.estimatedGrams == null ? 0 : payload.estimatedGrams, 0, 100000, 'Estimated grams');
      item.estimatedMinutes = integer_(payload.estimatedMinutes == null ? 0 : payload.estimatedMinutes, 0, 100000, 'Estimated minutes');
      item.preflightDecision = decision; item.preflightSummary = payload.preflightSummary; item.staffReason = payload.reason; item.reviewedAt = at;
    } else throw srError_('bad_action', 'Choose request revision, reject, or quote.');
    item.updatedAt = at; upsertPrintRequestRow_(book, item);
    var result = { ok: true, request: printRequestDto_(item) };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: action === 'QUOTE' ? 'PRINT_REQUEST_QUOTED' : action === 'REJECT' ? 'PRINT_REQUEST_REJECTED' : 'PRINT_REQUEST_REVISION_REQUESTED', type: 'print_request', id: item.id, summary: action === 'QUOTE' ? 'Print request quoted: ' + item.quotePoints + ' points' : 'Print request review completed' }, actor);
    return result;
  });
}

function confirmSchoolRewardsPrintQuote(request) {
  var actor = requireRole_(['student']); request = object_(request);
  var requestId = id_(request.requestId, 'print request'), key = idemKey_(request.idempotencyKey);
  var operation = printIdemOperation_('print_quote_confirm', actor, { requestId: requestId });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(); assertNoPendingCoreOperation_(book, '');
    var item = requirePrintRequest_(book, requestId);
    if (item.studentId !== actor.studentId) throw srError_('denied', 'Students can confirm only their own quote.');
    var existingHold = pointHoldForPurpose_(book, 'PRINT_REQUEST', item.id);
    if (existingHold && existingHold.status === 'ACTIVE') {
      if (existingHold.studentId !== item.studentId || existingHold.amount !== item.quotePoints) throw srError_('reconciliation', 'The existing point reservation does not match this quote.');
      if (['QUOTED', 'RESERVED'].indexOf(item.status) < 0) throw srError_('reconciliation', 'An active point reservation is attached to an incompatible request state.');
      if (item.status === 'QUOTED' || item.holdId !== existingHold.id) { item.status = 'RESERVED'; item.holdId = existingHold.id; item.confirmedAt = item.confirmedAt || now_(); item.updatedAt = now_(); upsertPrintRequestRow_(book, item); }
      var repaired = printReservationResult_(book, item, existingHold); rememberIdem_(key, operation, repaired); return repaired;
    }
    if (item.status !== 'QUOTED') throw srError_('invalid_transition', 'This request does not have a quote awaiting confirmation.');
    if (!item.quoteExpiresAt || new Date(item.quoteExpiresAt).getTime() <= new Date().getTime()) throw srError_('quote_expired', 'This quote has expired. Ask staff to review it again.');
    var windowItem = windowById_(book, item.windowId);
    requireOpenWindowNow_(windowItem, 'Print quote confirmation');
    var model = requirePrintModel_(book, item.modelId);
    if (model.contentHash !== item.modelHash) throw srError_('model_changed', 'The quote does not match the current model version.');
    if (pointAvailability_(book, item.studentId).availableBalance < item.quotePoints) throw srError_('insufficient_balance', 'The student does not have enough points available.');
    var at = now_(), hold = { id: uuid_(), studentId: item.studentId, purposeType: 'PRINT_REQUEST', purposeId: item.id, amount: item.quotePoints, status: 'ACTIVE', expiresAt: '', idempotencyKey: key, captureLedgerId: '', createdAt: at, updatedAt: at, capturedAt: '', releasedAt: '', releaseReason: '' };
    upsertPointHoldRow_(book, hold); item.status = 'RESERVED'; item.holdId = hold.id; item.confirmedAt = at; item.updatedAt = at; upsertPrintRequestRow_(book, item);
    var result = printReservationResult_(book, item, hold); rememberIdem_(key, operation, result);
    appendAudit_({ event: 'PRINT_POINTS_RESERVED', type: 'print_request', id: item.id, summary: 'Print request points reserved: ' + hold.amount }, actor);
    return result;
  });
}

function advanceSchoolRewardsPrintRequest(request) {
  var actor = requireRole_(['admin', 'staff']); request = object_(request);
  var requestId = id_(request.requestId, 'print request'), action = text_(request.action, 30, '').toUpperCase(), reason = text_(request.reason, 500, ''), key = idemKey_(request.idempotencyKey);
  var operation = printIdemOperation_('print_request_advance', actor, { requestId: requestId, action: action, reason: reason });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), item = requirePrintRequest_(book, requestId), at = now_(), event = '';
    if (action === 'QUEUE') {
      if (item.status !== 'RESERVED' || !activePointHoldForRequest_(book, item)) throw srError_('invalid_transition', 'Only a request with an active point reservation can be queued.');
      item.status = 'QUEUED'; item.queuedAt = at; event = 'PRINT_REQUEST_QUEUED';
    } else if (action === 'START_PRINT') {
      if (item.status !== 'QUEUED' || !activePointHoldForRequest_(book, item)) throw srError_('invalid_transition', 'Only a queued request with an active reservation can start printing.');
      item.status = 'PRINTING'; item.printingAt = at; event = 'PRINT_STARTED';
    } else if (action === 'MARK_READY') {
      if (item.status !== 'PRINTING' || !activePointHoldForRequest_(book, item)) throw srError_('invalid_transition', 'Only a printing request can be marked ready.');
      item.status = 'READY'; item.readyAt = at; event = 'PRINT_READY';
    } else if (action === 'RETURN_TO_QUEUE') {
      if (['PRINTING', 'READY'].indexOf(item.status) < 0 || !activePointHoldForRequest_(book, item)) throw srError_('invalid_transition', 'Only a printing or ready request can return to the queue.');
      if (!reason) throw srError_('reason_required', 'Explain why the model needs another print.');
      item.status = 'QUEUED'; item.staffReason = reason; item.queuedAt = at; event = 'PRINT_RETURNED_TO_QUEUE';
    } else throw srError_('bad_action', 'Choose queue, start print, mark ready, or return to queue.');
    item.updatedAt = at; upsertPrintRequestRow_(book, item);
    var result = { ok: true, request: printRequestDto_(item) }; rememberIdem_(key, operation, result);
    appendAudit_({ event: event, type: 'print_request', id: item.id, summary: 'Print request workflow advanced' }, actor); return result;
  });
}

function cancelSchoolRewardsPrintRequest(request) {
  var actor = currentActor_(); request = object_(request);
  if (['student', 'staff', 'admin'].indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot cancel Print Lab requests.');
  var requestId = id_(request.requestId, 'print request'), reason = text_(request.reason, 500, 'Print request cancelled'), key = idemKey_(request.idempotencyKey);
  var operation = printIdemOperation_('print_request_cancel', actor, { requestId: requestId, reason: reason });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(); assertNoPendingCoreOperation_(book, '');
    var item = requirePrintRequest_(book, requestId), at = now_();
    if (actor.role === 'student') {
      if (item.studentId !== actor.studentId) throw srError_('denied', 'Students can cancel only their own request.');
      if (['SUBMITTED', 'REVISION_REQUESTED', 'QUOTED', 'RESERVED', 'CANCELLING'].indexOf(item.status) < 0) throw srError_('invalid_transition', 'Ask staff for help cancelling a request that has entered the print queue.');
    } else if (['SUBMITTED', 'REVISION_REQUESTED', 'QUOTED', 'RESERVED', 'QUEUED', 'PRINTING', 'READY', 'CANCELLING'].indexOf(item.status) < 0 && item.status !== 'CANCELLED') throw srError_('invalid_transition', 'This print request cannot be cancelled.');
    var hold = item.holdId ? pointHoldById_(book, item.holdId) : null;
    if (item.status !== 'CANCELLED') {
      if (hold && hold.status === 'ACTIVE') { item.status = 'CANCELLING'; item.updatedAt = at; upsertPrintRequestRow_(book, item); hold.status = 'RELEASED'; hold.updatedAt = at; hold.releasedAt = at; hold.releaseReason = reason; upsertPointHoldRow_(book, hold); }
      item.status = 'CANCELLED'; item.staffReason = reason; item.closedAt = at; item.updatedAt = at; upsertPrintRequestRow_(book, item);
    }
    var availability = pointAvailability_(book, item.studentId), result = { ok: true, request: printRequestDto_(item), balance: availability };
    rememberIdem_(key, operation, result); appendAudit_({ event: 'PRINT_REQUEST_CANCELLED', type: 'print_request', id: item.id, summary: 'Print request cancelled; reservation released' }, actor); return result;
  });
}

function fulfillSchoolRewardsPrintRequest(request) {
  var actor = requireRole_(['admin', 'staff']); request = object_(request);
  var requestId = id_(request.requestId, 'print request'), key = idemKey_(request.idempotencyKey);
  var operation = printIdemOperation_('print_request_fulfill', actor, { requestId: requestId });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(); assertNoPendingCoreOperation_(book, '');
    var item = requirePrintRequest_(book, requestId);
    if (['READY', 'FULFILLING', 'FULFILLED'].indexOf(item.status) < 0) throw srError_('invalid_transition', 'Only a ready print can be fulfilled.');
    var hold = pointHoldById_(book, item.holdId);
    if (!hold || ['ACTIVE', 'CAPTURED'].indexOf(hold.status) < 0 || hold.amount !== item.quotePoints) throw srError_('reconciliation', 'The print request point reservation does not reconcile.');
    var model = requirePrintModel_(book, item.modelId);
    if (model.contentHash !== item.modelHash) throw srError_('model_changed', 'The fulfilled print must match the approved model version.');
    var student = requireStudentRecord_(book, item.studentId);
    var at = now_();
    if (item.status !== 'FULFILLED') { item.status = 'FULFILLING'; item.updatedAt = at; upsertPrintRequestRow_(book, item); }
    var spend = spendForPrintRequest_(book, item.id);
    if (!spend) spend = appendLedger_(book, { studentId: item.studentId, kind: 'SPEND', amount: -item.quotePoints, reason: '3D print fulfillment', referenceType: 'print_request', referenceId: item.id, reversesId: '', key: key, categoryId: '' }, actor);
    if (spend.amount !== -item.quotePoints || spend.studentId !== item.studentId) throw srError_('reconciliation', 'The print spend ledger entry does not match the request.');
    var after = rebuildBalanceFromLedger_(book, item.studentId);
    hold.status = 'CAPTURED'; hold.captureLedgerId = spend.id; hold.capturedAt = hold.capturedAt || at; hold.updatedAt = at; upsertPointHoldRow_(book, hold);
    var order = orderById_(book, item.id);
    if (order && (order.studentId !== item.studentId || order.total !== item.quotePoints)) throw srError_('reconciliation', 'The linked print order does not match the request.');
    if (!order) sheet_(book, 'Orders').appendRow(safeRow_([item.id, item.studentId, item.windowId, item.quotePoints, 'COMPLETED', actor.email, at, key]));
    else setOrderStatus_(book, item.id, 'COMPLETED');
    var lines = orderLines_(book, item.id);
    if (!lines.length) { sheet_(book, 'OrderLines').appendRow(safeRow_([item.id, model.id, '3D print: ' + model.title + ' (v' + model.version + ')', 1, item.quotePoints, item.quotePoints])); lines = orderLines_(book, item.id); }
    item.status = 'FULFILLED'; item.orderId = item.id; item.fulfilledAt = item.fulfilledAt || at; item.closedAt = at; item.updatedAt = at; upsertPrintRequestRow_(book, item);
    var availability = pointAvailability_(book, item.studentId);
    var receipt = sendOrderReceiptOnce_(book, student, { id: item.id, total: item.quotePoints, at: item.fulfilledAt, lines: lines }, availability.availableBalance, 'PURCHASE');
    var result = { ok: true, request: printRequestDto_(item), ledgerId: spend.id, balance: after.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance, receipt: receipt };
    rememberIdem_(key, operation, result); appendAudit_({ event: 'PRINT_REQUEST_FULFILLED', type: 'print_request', id: item.id, summary: 'Print fulfilled: ' + item.quotePoints + ' points' }, actor); return result;
  });
}

function refundSchoolRewardsPrintRequest(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var requestId = id_(request.requestId, 'print request'), reason = text_(request.reason, 500, '3D print refund'), key = idemKey_(request.idempotencyKey);
  var operation = printIdemOperation_('print_request_refund', actor, { requestId: requestId, reason: reason });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(); assertNoPendingCoreOperation_(book, '');
    var item = requirePrintRequest_(book, requestId);
    if (['FULFILLED', 'REFUNDING', 'REFUNDED'].indexOf(item.status) < 0) throw srError_('invalid_transition', 'Only a fulfilled print can be refunded.');
    assertReceiptDeliverySettled_(book, item.id, 'PURCHASE');
    var spend = spendForPrintRequest_(book, item.id);
    if (!spend || spend.amount !== -item.quotePoints) throw srError_('reconciliation', 'The print request and spending ledger do not reconcile.');
    var student = requireStudentRecord_(book, item.studentId);
    var at = now_();
    if (item.status !== 'REFUNDED') { item.status = 'REFUNDING'; item.updatedAt = at; upsertPrintRequestRow_(book, item); }
    var refund = refundForPrintRequest_(book, item.id);
    if (!refund) refund = appendLedger_(book, { studentId: item.studentId, kind: 'REFUND', amount: item.quotePoints, reason: reason, referenceType: 'print_request_refund', referenceId: item.id, reversesId: spend.id, key: key, categoryId: '' }, actor);
    if (refund.amount !== item.quotePoints || refund.reversesId !== spend.id) throw srError_('reconciliation', 'The print refund ledger entry does not match the original spend.');
    var after = rebuildBalanceFromLedger_(book, item.studentId); setOrderStatus_(book, item.id, 'REFUNDED');
    item.status = 'REFUNDED'; item.staffReason = reason; item.closedAt = at; item.updatedAt = at; upsertPrintRequestRow_(book, item);
    var availability = pointAvailability_(book, item.studentId), lines = orderLines_(book, item.id);
    var receipt = sendOrderReceiptOnce_(book, student, { id: item.id, total: item.quotePoints, at: at, lines: lines }, availability.availableBalance, 'REFUND');
    var result = { ok: true, request: printRequestDto_(item), ledgerId: refund.id, restoredPoints: item.quotePoints, balance: after.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance, receipt: receipt };
    rememberIdem_(key, operation, result); appendAudit_({ event: 'PRINT_REQUEST_REFUNDED', type: 'print_request', id: item.id, summary: 'Print refunded: ' + item.quotePoints + ' points' }, actor); return result;
  });
}

// Print Lab visibility (2026-09-02). Default on so existing pilots are
// unchanged; a school without a reviewed printer workflow hides the tab. This
// is a display setting for the portal, not an access control: the print
// endpoints keep their own role and roster checks.
function printLabEnabled_(config) { return String((config && config.printLabEnabled) || '') !== 'false'; }
function adminUpdateRewardsSettings(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var printLabEnabled = request.printLabEnabled !== false && String(request.printLabEnabled) !== 'false';
  return locked_(function() {
    var book = book_();
    putConfig_(book, { printLabEnabled: printLabEnabled ? 'true' : 'false' });
    appendAudit_({ event: 'SETTINGS_UPDATED', type: 'repository', id: 'settings', summary: 'Print Lab tab ' + (printLabEnabled ? 'shown' : 'hidden') }, actor);
    return { ok: true, printLabEnabled: printLabEnabled };
  });
}
function adminUpsertRewardsMember(value) {
  var actor = requireRole_(['admin']), member = normalizeMember_(value, allowedDomain_());
  return locked_(function() { assertAdminInvariant_(member); upsertMemberRow_(book_(), member); appendAudit_({ event: 'MEMBER_UPDATED', type: 'member', id: hash_(member.email).slice(0, 20), summary: 'Membership updated' }, actor); return { ok: true }; });
}
function adminUpsertRewardsStudent(value) {
  var actor = requireRole_(['admin']), student = normalizeStudent_(value, allowedDomain_(), text_(value && value.id, 80, ''));
  return locked_(function() { var saved = upsertStudentRow_(book_(), student); appendAudit_({ event: 'STUDENT_UPDATED', type: 'student', id: saved.id, summary: 'Student roster entry updated' }, actor); return { ok: true, student: saved }; });
}
function adminBulkUpsertRewardsStudents(values) {
  var actor = requireRole_(['admin']);
  if (!Array.isArray(values) || !values.length || values.length > SR_MAX_BATCH) throw srError_('bad_roster', 'Upload between 1 and ' + SR_MAX_BATCH + ' students per batch.');
  return locked_(function() {
    var book = book_(), domain = allowedDomain_(), existing = students_(book), byEmail = {}, byId = {}, seenEmails = {}, seenIds = {}, saved = [];
    existing.forEach(function(student) { byEmail[student.email] = student; byId[student.id] = student; });
    var normalized = values.map(function(value) {
      var requestedId = text_(value && value.id, 80, ''), student = normalizeStudent_(value, domain, requestedId);
      var matchedId = requestedId ? byId[requestedId] : null, matchedEmail = byEmail[student.email];
      if (matchedEmail && requestedId && matchedEmail.id !== requestedId) throw srError_('duplicate_student', 'That student email is already assigned to another student.');
      if (matchedId && matchedEmail && matchedId.id !== matchedEmail.id) throw srError_('duplicate_student', 'The supplied student ID and email belong to different roster records.');
      student.id = requestedId || (matchedEmail ? matchedEmail.id : uuid_());
      if (seenEmails[student.email]) throw srError_('duplicate_student', 'The upload contains a duplicate student email: ' + student.email);
      if (seenIds[student.id]) throw srError_('duplicate_student', 'The upload resolves more than once to the same student record.');
      seenEmails[student.email] = true; seenIds[student.id] = true;
      return student;
    });
    normalized.forEach(function(student) { saved.push(upsertStudentRow_(book, student)); });
    appendAudit_({ event: 'STUDENT_ROSTER_IMPORTED', type: 'student_batch', id: uuid_(), summary: saved.length + ' student roster entries imported' }, actor);
    return { ok: true, imported: saved.length, students: saved };
  });
}
function adminUpsertSchoolRewardsGuardian(value) {
  var actor = requireRole_(['admin']); value = object_(value);
  var deactivationReason = text_(value.deactivationReason, 300, ''), active = value.active !== false;
  if (!active && !deactivationReason) throw srError_('reason_required', 'Explain why this guardian digest mapping is being disabled.');
  var key = idemKey_(value.idempotencyKey), payload = { id: text_(value.id, 80, ''), studentId: text_(value.studentId, 80, ''), guardianEmail: normalizeEmail_(value.guardianEmail), guardianName: text_(value.guardianName, 120, ''), relationship: text_(value.relationship, 80, 'Guardian'), active: active, consentConfirmed: value.consentConfirmed === true, deactivationReason: deactivationReason };
  var operation = printIdemOperation_('guardian_upsert', actor, payload);
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), guardian = normalizeGuardian_(book, value);
    var saved = upsertGuardianRow_(book, guardian), result = { ok: true, guardian: guardianDto_(saved) };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'GUARDIAN_MAPPING_UPDATED', type: 'guardian_mapping', id: saved.id, summary: saved.active ? 'Authorized guardian digest mapping enabled' : 'Guardian digest mapping disabled: ' + deactivationReason }, actor);
    return result;
  });
}

/** Provider-neutral, read-only roster diff. It never contacts an SIS vendor. */
function previewSchoolRewardsSisSnapshot(request) {
  requireRole_(['admin']); request = object_(request);
  var book = book_(), snapshot = normalizeSisSnapshot_(book, request), diff = sisSnapshotDiff_(book, snapshot.students);
  return { ok: true, contractVersion: 'alloflow-sis-roster/1', snapshotId: snapshot.snapshotId, contentHash: snapshot.contentHash, rosterRevision: sisRosterRevision_(book), counts: diff.counts, changes: diff.changes, deactivationSupported: false };
}

/** Applies only validated creates/updates. Missing rows are never deactivated. */
function applySchoolRewardsSisSnapshot(request) {
  var actor = requireRole_(['admin']); request = object_(request), key = idemKey_(request.idempotencyKey);
  var book = book_(), normalized = normalizeSisSnapshot_(book, request);
  var expectedContentHash = text_(request.expectedContentHash, 100, ''), expectedRosterRevision = text_(request.expectedRosterRevision, 100, '');
  if (!/^[A-Za-z0-9_-]{43}$/.test(expectedContentHash) || !/^[A-Za-z0-9_-]{43}$/.test(expectedRosterRevision)) throw srError_('sis_preview_required', 'Apply the exact content hash and roster revision returned by a fresh SIS preview.');
  var operation = printIdemOperation_('sis_snapshot_apply', actor, { snapshotId: normalized.snapshotId, requestContentHash: normalized.requestContentHash, expectedContentHash: expectedContentHash, expectedRosterRevision: expectedRosterRevision, formatVersion: normalized.formatVersion });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var currentBook = book_(), existingImport = sisImportBySnapshotId_(currentBook, normalized.snapshotId);
    if (expectedContentHash !== normalized.contentHash) throw srError_('sis_content_changed', 'The SIS content no longer matches the reviewed preview. Preview it again.');
    var currentRosterRevision = sisRosterRevision_(currentBook);
    if (expectedRosterRevision !== currentRosterRevision) throw srError_('sis_roster_changed', 'The school roster changed after preview. Preview the SIS snapshot again.');
    if (existingImport && existingImport.contentHash !== normalized.contentHash) throw srError_('snapshot_conflict', 'That SIS snapshot id was already used for different roster content.');
    var diff = sisSnapshotDiff_(currentBook, normalized.students), saved = [];
    normalized.students.forEach(function(student) { saved.push(upsertStudentRow_(currentBook, student)); });
    var at = now_(), importRow = existingImport || { id: uuid_(), snapshotId: normalized.snapshotId, formatVersion: normalized.formatVersion, contentHash: normalized.contentHash, createdAt: at };
    importRow.createdCount = diff.counts.created; importRow.updatedCount = diff.counts.updated; importRow.unchangedCount = diff.counts.unchanged; importRow.status = 'APPLIED'; importRow.appliedAt = at; importRow.actorHash = hash_(actor.email);
    upsertSisImportRow_(currentBook, importRow);
    var result = { ok: true, contractVersion: normalized.formatVersion, snapshotId: normalized.snapshotId, contentHash: normalized.contentHash, previousRosterRevision: currentRosterRevision, rosterRevision: sisRosterRevision_(currentBook), counts: diff.counts, applied: saved.length, deactivated: 0 };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'SIS_SNAPSHOT_APPLIED', type: 'sis_snapshot', id: importRow.id, summary: saved.length + ' provider-neutral roster rows applied; no deactivations' }, actor);
    return result;
  });
}
function adminUpsertRewardsCatalogItem(value) {
  var actor = requireRole_(['admin']), request = normalizeCatalogRequest_(value), key = idemKey_(object_(value).idempotencyKey);
  var operation = printIdemOperation_('catalog', actor, request);
  return locked_(function() {
    var book = book_(), state = loadCoreOperation_(book, key, operation, 'catalog');
    if (state && state.result) return state.result;
    if (!state) {
      var intent = prepareCatalogIntent_(book, request, key, actor);
      state = startCoreOperation_(book, key, operation, 'catalog', intent);
      coreFault_('catalog:after_intent');
    }
    return resumeCoreOperation_(book, key, operation, state.journal, actor);
  });
}
function adminUpsertRewardsCategory(value) {
  var actor = requireRole_(['admin']), category = normalizeCategory_(value);
  return locked_(function() { var saved = upsertCategoryRow_(book_(), category); appendAudit_({ event: 'CATEGORY_UPDATED', type: 'category', id: saved.id, summary: 'Recognition category updated: ' + saved.name }, actor); return { ok: true, category: saved }; });
}
function adminSetRewardsLevelThresholds(value) {
  var actor = requireRole_(['admin']), thresholds = normalizeLevelThresholds_(value);
  return locked_(function() { putConfig_(book_(), { levelThresholds: thresholds.join(',') }); appendAudit_({ event: 'LEVEL_THRESHOLDS_UPDATED', type: 'configuration', id: 'level-thresholds', summary: 'Growth level thresholds updated' }, actor); return { ok: true, thresholds: thresholds }; });
}
function adminUpsertRewardsWindow(value) {
  var actor = requireRole_(['admin']), windowItem = normalizeWindow_(value);
  return locked_(function() { var book = book_(); if (windowItem.status === 'OPEN' || windowItem.status === 'PREVIEW') closeOtherVisibleWindows_(book, windowItem.id); var saved = upsertWindowRow_(book, windowItem); appendAudit_({ event: 'STORE_WINDOW_UPDATED', type: 'store_window', id: saved.id, summary: 'Store window set to ' + saved.status }, actor); return { ok: true, window: saved }; });
}

function awardSchoolRewardsPoints(request) {
  var actor = requireRole_(['admin', 'staff']); request = object_(request);
  var studentId = id_(request.studentId, 'student'), amount = integer_(request.amount, 1, SR_MAX_POINTS, 'Points');
  var reason = text_(request.reason, 180, ''), categoryId = id_(request.categoryId, 'category'), key = idemKey_(request.idempotencyKey);
  if (!reason) throw srError_('bad_award', 'Describe what the student did to earn these points.');
  var operation = printIdemOperation_('award', actor, { studentId: studentId, amount: amount, reason: reason, categoryId: categoryId });
  return locked_(function() {
    var book = book_(), state = loadCoreOperation_(book, key, operation, 'award');
    if (state && state.result) return state.result;
    if (!state) {
      requireStudent_(book, studentId); requireCategory_(book, categoryId);
      state = startCoreOperation_(book, key, operation, 'award', {
        ledgerId: operationEntityId_('ledger', key), studentId: studentId, amount: amount, reason: reason,
        categoryId: categoryId, actorEmail: actor.email, actorRole: actor.role, at: now_()
      });
      coreFault_('award:after_intent');
    }
    return resumeCoreOperation_(book, key, operation, state.journal, actor);
  });
}

var SR_MAX_GROUP_AWARD = 60;
var SR_STAFF_UNDO_MS = 15 * 60 * 1000;
function awardSchoolRewardsPointsBatch(request) {
  var actor = requireRole_(['admin', 'staff']); request = object_(request);
  var studentIds = Array.isArray(request.studentIds) ? request.studentIds : [];
  if (!studentIds.length) throw srError_('bad_award', 'Choose at least one student.');
  if (studentIds.length > SR_MAX_GROUP_AWARD) throw srError_('bad_award', 'Award to ' + SR_MAX_GROUP_AWARD + ' students or fewer at a time.');
  var amount = integer_(request.amount, 1, SR_MAX_POINTS, 'Points'), reason = text_(request.reason, 180, ''), categoryId = id_(request.categoryId, 'category'), key = idemKey_(request.idempotencyKey);
  if (!reason) throw srError_('bad_award', 'Describe what the students did to earn these points.');
  requireCategory_(book_(), categoryId);
  var seen = {}, results = [], recorded = 0, failed = 0;
  studentIds.forEach(function(rawId) {
    var studentId;
    try { studentId = id_(rawId, 'student'); } catch (err) { results.push({ studentId: String(rawId || ''), ok: false, code: 'bad_id', error: err.message }); failed++; return; }
    if (seen[studentId]) return;
    seen[studentId] = true;
    try {
      // Each student is an ordinary journaled award under a key derived from the
      // group key, so a lost response and an exact retry record nothing twice.
      awardSchoolRewardsPoints({ studentId: studentId, amount: amount, reason: reason, categoryId: categoryId, idempotencyKey: (key + ':' + studentId).slice(0, 120) });
      results.push({ studentId: studentId, ok: true }); recorded++;
    } catch (err) {
      var failure = publicError_(err);
      results.push({ studentId: studentId, ok: false, code: failure.code, error: failure.error }); failed++;
    }
  });
  locked_(function() { appendAudit_({ event: 'GROUP_AWARD', type: 'award', id: key, summary: 'Group award: ' + recorded + ' recorded, ' + failed + ' failed' }, actor); });
  return { ok: failed === 0, recorded: recorded, failed: failed, results: results };
}
function reverseSchoolRewardsEntry(request) {
  // Administrators correct any award. The awarding staff member may undo their
  // OWN award for SR_STAFF_UNDO_MS after recording it (a same-key reversal,
  // audited like any other), which keeps slips off the administrator's desk.
  var actor = requireRole_(['admin', 'staff']); request = object_(request);
  var entryId = id_(request.entryId, 'ledger entry'), key = idemKey_(request.idempotencyKey);
  var reason = text_(request.reason, 180, 'Administrative correction');
  var operation = printIdemOperation_('reverse', actor, { entryId: entryId, reason: reason });
  return locked_(function() {
    var book = book_(), state = loadCoreOperation_(book, key, operation, 'reverse');
    if (state && state.result) return state.result;
    if (!state) {
      var original = ledgerById_(book, entryId);
      if (!original) throw srError_('not_found', 'Ledger entry was not found.');
      if (actor.role === 'staff') {
        if (normalizeEmail_(original.actorEmail) !== actor.email) throw srError_('denied', 'Staff can undo only their own awards.');
        var recordedAt = Date.parse(original.at);
        if (!(recordedAt > 0) || Date.now() - recordedAt > SR_STAFF_UNDO_MS) throw srError_('undo_expired', 'The undo window has passed. Ask an administrator to correct this award.');
      }
      if (original.kind === 'REVERSAL' || reversalExists_(book, entryId)) throw srError_('already_reversed', 'That entry has already been reversed.');
      if (original.kind !== 'EARN') throw srError_('order_refund_required', 'This pilot reverses award entries only. Purchase returns require an order-level refund so inventory and the ledger stay aligned.');
      var delta = -original.amount, before = pointAvailability_(book, original.studentId);
      if (before.availableBalance + delta < 0) throw srError_('points_reserved', 'This correction would consume points reserved for an active print request. Cancel the request first.');
      state = startCoreOperation_(book, key, operation, 'reverse', {
        ledgerId: operationEntityId_('ledger', key), originalId: original.id, studentId: original.studentId,
        amount: delta, reason: reason, categoryId: original.categoryId, actorEmail: actor.email,
        actorRole: actor.role, at: now_()
      });
      coreFault_('reverse:after_intent');
    }
    return resumeCoreOperation_(book, key, operation, state.journal, actor);
  });
}

function checkoutSchoolRewardsOrder(request) {
  var actor = requireRole_(['admin', 'cashier']); request = object_(request);
  var studentId = id_(request.studentId, 'student'), windowId = id_(request.windowId, 'store window');
  var key = idemKey_(request.idempotencyKey), lines = cart_(request.lines);
  var operation = printIdemOperation_('checkout', actor, { studentId: studentId, windowId: windowId, lines: lines });
  return locked_(function() {
    var book = book_(), state = loadCoreOperation_(book, key, operation, 'checkout');
    if (state && state.result) return state.result;
    if (!state) {
      requireStudent_(book, studentId);
      requireOpenWindowNow_(windowById_(book, windowId), 'Checkout');
      var items = catalog_(book), byId = {}; items.forEach(function(item) { byId[item.id] = item; });
      var total = 0, orderLines = [];
      lines.forEach(function(line) {
        var item = byId[line.catalogId];
        if (!item || !item.active) throw srError_('catalog_changed', 'A selected item is no longer available.');
        if (item.inventoryLimit >= 0 && item.remaining < line.quantity) throw srError_('inventory', item.name + ' does not have enough inventory.');
        var lineTotal = item.cost * line.quantity; total += lineTotal;
        orderLines.push({ catalogId: item.id, itemName: item.name, quantity: line.quantity, unitCost: item.cost, lineTotal: lineTotal });
      });
      if (pointAvailability_(book, studentId).availableBalance < total) throw srError_('insufficient_balance', 'The student does not have enough points available.');
      var at = now_(), orderId = operationEntityId_('order', key);
      var inventoryMovements = buildStoreInventoryMovements_(book, orderLines, -1, 'SALE', key, 'order', orderId, actor, at, 'School store sale');
      state = startCoreOperation_(book, key, operation, 'checkout', {
        orderId: orderId, ledgerId: operationEntityId_('ledger', key),
        studentId: studentId, windowId: windowId, total: total, lines: orderLines,
        inventoryMovements: inventoryMovements, actorEmail: actor.email, actorRole: actor.role, at: at
      });
      coreFault_('checkout:after_intent');
    }
    return resumeCoreOperation_(book, key, operation, state.journal, actor);
  });
}

function refundSchoolRewardsOrder(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var orderId = id_(request.orderId, 'order'), key = idemKey_(request.idempotencyKey);
  var reason = text_(request.reason, 180, 'Order refund');
  var operation = printIdemOperation_('refund', actor, { orderId: orderId, reason: reason });
  return locked_(function() {
    var book = book_(), state = loadCoreOperation_(book, key, operation, 'refund');
    if (state && state.result) return state.result;
    if (!state) {
      var order = orderById_(book, orderId);
      if (!order) throw srError_('not_found', 'Order was not found.');
      if (printRequestByOrderId_(book, orderId)) throw srError_('print_refund_required', 'Use the print-request refund so its workflow and point hold remain reconciled.');
      if (order.status !== 'COMPLETED') throw srError_('not_refundable', 'Only a completed order can be refunded.');
      assertReceiptDeliverySettled_(book, orderId, 'PURCHASE');
      var spend = spendForOrder_(book, orderId);
      if (!spend || spend.amount !== -order.total) throw srError_('reconciliation', 'The order and spending ledger do not reconcile.');
      if (reversalExists_(book, spend.id)) throw srError_('already_refunded', 'That order has already been refunded.');
      var orderLines = orderLines_(book, orderId);
      if (!orderLines.length) throw srError_('reconciliation', 'The order has no item lines to restore.');
      assertInventoryRestorable_(book, orderLines);
      requireStudentRecord_(book, order.studentId);
      var at = now_();
      var inventoryMovements = buildStoreInventoryMovements_(book, journalLineProjectionForValidation_(orderLines), 1, 'REFUND', key, 'order_refund', order.id, actor, at, reason);
      state = startCoreOperation_(book, key, operation, 'refund', {
        orderId: order.id, sourceSpendId: spend.id, ledgerId: operationEntityId_('ledger', key),
        studentId: order.studentId, total: order.total, lines: journalLineProjectionForValidation_(orderLines), inventoryMovements: inventoryMovements,
        reason: reason, actorEmail: actor.email, actorRole: actor.role, at: at
      });
      coreFault_('refund:after_intent');
    }
    return resumeCoreOperation_(book, key, operation, state.journal, actor);
  });
}

function recoverSchoolRewardsOperation(request) {
  var recoveryActor = requireRole_(['admin']); request = object_(request);
  var key = idemKey_(request.idempotencyKey);
  return locked_(function() {
    var book = book_(), state = loadCoreOperationByKey_(book, key), recoveryId = hash_(key).slice(0, 20);
    if (state.result) {
      if (auditEventExists_('ADMIN_RECOVERY_STARTED', recoveryId)) appendAuditOnce_({ event: 'CORE_OPERATION_ADMIN_RECOVERED', type: 'idempotency', id: recoveryId, summary: 'Administrator recovery completion verified for ' + state.journal.kind + ' operation' }, recoveryActor);
      return { ok: true, recovered: false, kind: state.journal.kind, keyHash: recoveryId, result: state.result };
    }
    appendAuditOnce_({ event: 'ADMIN_RECOVERY_STARTED', type: 'idempotency', id: recoveryId, summary: 'Administrator started recovery for pending ' + state.journal.kind + ' operation' }, recoveryActor);
    var result = resumeCoreOperation_(book, key, state.operation, state.journal);
    coreFault_('admin_recovery:after_complete');
    appendAuditOnce_({ event: 'CORE_OPERATION_ADMIN_RECOVERED', type: 'idempotency', id: recoveryId, summary: 'Administrator recovered pending ' + state.journal.kind + ' operation' }, recoveryActor);
    return { ok: true, recovered: true, kind: state.journal.kind, keyHash: recoveryId, result: result };
  });
}

function getSchoolRewardsReconciliation(request) {
  requireRole_(['admin']); request = object_(request);
  var selectedWindowId = text_(request.windowId, 80, ''), book = book_();
  var orderList = orders_(book).filter(function(order) { return !selectedWindowId || order.windowId === selectedWindowId; });
  var completed = orderList.filter(function(order) { return order.status === 'COMPLETED'; });
  var refunded = orderList.filter(function(order) { return order.status === 'REFUNDED'; });
  var balances = balancesMap_(book), pointsOutstanding = 0;
  Object.keys(balances).forEach(function(studentId) { pointsOutstanding += balances[studentId].balance; });
  var catalog = catalog_(book);
  return {
    ok: true,
    generatedAt: now_(),
    windowId: selectedWindowId,
    orders: orderList.length,
    completedOrders: completed.length,
    refundedOrders: refunded.length,
    netPointsSpent: completed.reduce(function(sum, order) { return sum + order.total; }, 0),
    refundedPoints: refunded.reduce(function(sum, order) { return sum + order.total; }, 0),
    pointsOutstanding: pointsOutstanding,
    finiteInventory: catalog.filter(function(item) { return item.inventoryLimit >= 0; }).map(function(item) { return { id: item.id, name: item.name, inventoryLimit: item.inventoryLimit, remaining: item.remaining, distributed: item.inventoryLimit - item.remaining }; }),
    audit: auditChainStatus_()
  };
}

/**
 * Admin-only, read-only consistency scan. It never changes balances, inventory,
 * workflow rows, delivery records, or operation journals.
 */
function getSchoolRewardsIntegrityReport(request) {
  requireRole_(['admin']); request = object_(request);
  var holdAgeDays = integer_(request.holdAgeDays == null ? 30 : request.holdAgeDays, 1, 3650, 'Hold age');
  var pendingAgeMinutes = integer_(request.pendingAgeMinutes == null ? 15 : request.pendingAgeMinutes, 1, 10080, 'Pending age');
  return locked_(function() { return buildSchoolRewardsIntegrityReport_(book_(), holdAgeDays, pendingAgeMinutes); });
}

function sendSchoolRewardsBalanceStatements(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var period = text_(request.periodKey, 60, now_().slice(0, 10));
  var limit = integer_(request.limit == null ? 100 : request.limit, 1, SR_MAX_BATCH, 'Batch limit');
  var chunkSize = integer_(request.chunkSize == null ? SR_MAIL_CHUNK_DEFAULT : request.chunkSize, 1, SR_MAIL_CHUNK_MAX, 'Mail chunk size');
  return startAndProcessMailRun_('STUDENT_STATEMENT', period, limit, chunkSize, actor, mailRequestKey_(request.idempotencyKey, 'STUDENT_STATEMENT', period));
}

function resendSchoolRewardsOrderReceipt(request) {
  var actor = requireRole_(['admin', 'cashier']); request = object_(request);
  var orderId = id_(request.orderId, 'order'), kind = text_(request.kind, 20, 'PURCHASE').toUpperCase(), key = idemKey_(request.idempotencyKey);
  if (kind !== 'PURCHASE' && kind !== 'REFUND') throw srError_('bad_receipt', 'Receipt kind must be purchase or refund.');
  var operation = printIdemOperation_('receipt_resend', actor, { orderId: orderId, kind: kind });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), order = orderById_(book, orderId);
    if (!order) throw srError_('not_found', 'Order was not found.');
    if (kind === 'PURCHASE' && order.status !== 'COMPLETED') throw srError_('bad_receipt', 'A purchase receipt can be resent only while the order is completed.');
    if (kind === 'REFUND' && order.status !== 'REFUNDED') throw srError_('bad_receipt', 'A refund receipt is available only after the order is refunded.');
    var sent = sentReceiptForOrder_(book, orderId, kind), previous = latestReceiptForOrder_(book, orderId, kind), availability = pointAvailability_(book, order.studentId), receipt;
    if (!sent && previous && (previous.status === 'PENDING' || previous.status === 'UNKNOWN')) throw srError_('receipt_uncertain', 'Receipt delivery is uncertain. Verify the managed mailbox before attempting another copy.');
    if (sent) receipt = { id: sent.id, kind: sent.kind, status: sent.status, sentAt: sent.sentAt, points: kind === 'REFUND' ? order.total : -order.total };
    else receipt = sendOrderReceipt_(book, requireStudentRecord_(book, order.studentId), { id: order.id, total: order.total, at: kind === 'REFUND' ? (previous && previous.sentAt || now_()) : order.at, lines: orderLines_(book, order.id), balanceLabel: 'Current available balance when this copy was sent' }, availability.availableBalance, kind);
    var result = { ok: receipt.status === 'SENT', orderId: order.id, receipt: receipt, alreadySent: !!sent };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: sent ? 'RECEIPT_ALREADY_SENT' : 'RECEIPT_RESEND_ATTEMPTED', type: 'receipt', id: receipt.id, summary: kind + ' receipt status: ' + receipt.status }, actor);
    return result;
  });
}

function resolveSchoolRewardsReceiptDelivery(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var receiptId = id_(request.receiptId, 'receipt'), status = text_(request.status, 20, '').toUpperCase(), note = text_(request.note, 300, ''), key = idemKey_(request.idempotencyKey);
  if (status !== 'SENT' && status !== 'FAILED') throw srError_('bad_receipt', 'Resolved receipt status must be sent or failed.');
  if (!note) throw srError_('reason_required', 'Record how delivery was verified before resolving an uncertain receipt.');
  var operation = printIdemOperation_('receipt_delivery_resolve', actor, { receiptId: receiptId, status: status, note: note });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), receipt = receiptById_(book, receiptId);
    if (!receipt) throw srError_('not_found', 'Receipt attempt was not found.');
    if (receipt.status !== 'PENDING' && receipt.status !== 'UNKNOWN') throw srError_('bad_receipt', 'Only an uncertain receipt attempt can be resolved manually.');
    receipt.status = status; receipt.error = status === 'FAILED' ? note : ''; upsertReceiptRow_(book, receipt);
    var result = { ok: true, receipt: receiptDto_(receipt) }; rememberIdem_(key, operation, result);
    appendAudit_({ event: 'RECEIPT_DELIVERY_RESOLVED', type: 'receipt', id: receipt.id, summary: 'Uncertain ' + receipt.kind + ' receipt marked ' + status + ': ' + note }, actor);
    return result;
  });
}

function sendSchoolRewardsGuardianDigests(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var period = text_(request.periodKey, 60, now_().slice(0, 10));
  var limit = integer_(request.limit == null ? 100 : request.limit, 1, SR_MAX_BATCH, 'Batch limit');
  var chunkSize = integer_(request.chunkSize == null ? SR_MAIL_CHUNK_DEFAULT : request.chunkSize, 1, SR_MAIL_CHUNK_MAX, 'Mail chunk size');
  return startAndProcessMailRun_('GUARDIAN_DIGEST', period, limit, chunkSize, actor, mailRequestKey_(request.idempotencyKey, 'GUARDIAN_DIGEST', period));
}

/** Aggregate-only payload suitable for an approved district collection process. */
function getSchoolRewardsDistrictSummary(request) {
  requireRole_(['admin']); request = object_(request);
  var book = book_(), selectedWindowId = optionalId_(request.windowId, 'store window'), config = configMap_(book);
  var activeStudents = students_(book).filter(function(student) { return student.active; });
  var balances = balancesMap_(book), holds = pointHolds_(book), totalEarned = 0, totalSpent = 0, totalBalance = 0, reserved = 0;
  activeStudents.forEach(function(student) { var value = balances[student.id] || { earned: 0, spent: 0, balance: 0 }; totalEarned += value.earned; totalSpent += value.spent; totalBalance += value.balance; reserved += pointAvailability_(book, student.id, balances, holds).reservedPoints; });
  var requestList = printRequests_(book).filter(function(item) { return !selectedWindowId || item.windowId === selectedWindowId; });
  var orderList = orders_(book).filter(function(item) { return !selectedWindowId || item.windowId === selectedWindowId; });
  var publicationList = printPublications_(book), assetList = printAssets_(book), guardiansActive = guardians_(book).filter(function(item) { return item.active && item.consentConfirmedAt; });
  return {
    ok: true, contractVersion: 'alloflow-district-rewards-summary/1', generatedAt: now_(), scope: selectedWindowId ? 'STORE_WINDOW' : 'SCHOOL',
    school: { name: config.schoolName || 'School', academicYear: config.academicYear || '' },
    counts: { activeStudents: activeStudents.length, activeStaff: members_(book).filter(function(item) { return item.active && ['admin', 'staff'].indexOf(item.role) >= 0; }).length, recognitionCategories: categories_(book).filter(function(item) { return item.active; }).length, orders: orderList.length, printModels: printModels_(book).length, printRequests: requestList.length, consentedGuardianMappings: guardiansActive.length },
    points: { earned: totalEarned, spent: totalSpent, balance: totalBalance, reserved: reserved, available: totalBalance - reserved, orderPoints: orderList.filter(function(item) { return item.status === 'COMPLETED'; }).reduce(function(sum, item) { return sum + item.total; }, 0) },
    printRequestsByStatus: countBy_(requestList, 'status'), publicationsByStatus: countBy_(publicationList, 'status'), printAssetsByStatus: countBy_(assetList, 'status')
  };
}

function configureSchoolRewardsEmailSchedule(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  requireMailSchemaV6_(book_());
  var enabled = request.enabled === true, weekday = text_(request.weekday, 12, 'FRIDAY').toUpperCase();
  var hour = integer_(request.hour == null ? 16 : request.hour, 0, 23, 'Hour');
  if (!{ MONDAY: 1, TUESDAY: 1, WEDNESDAY: 1, THURSDAY: 1, FRIDAY: 1 }[weekday]) throw srError_('bad_schedule', 'Choose a school weekday.');
  ScriptApp.getProjectTriggers().forEach(function(trigger) { if (trigger.getHandlerFunction() === 'runScheduledSchoolRewardsStatements') ScriptApp.deleteTrigger(trigger); });
  PropertiesService.getScriptProperties().setProperty('SR_EMAIL_TRIGGER_REGISTRATION', '');
  if (enabled) {
    var weeklyTrigger = ScriptApp.newTrigger('runScheduledSchoolRewardsStatements').timeBased().onWeekDay(ScriptApp.WeekDay[weekday]).atHour(hour).everyWeeks(1).create();
    saveMailTriggerRegistration_('SR_EMAIL_TRIGGER_REGISTRATION', weeklyTrigger, 'runScheduledSchoolRewardsStatements', 'weekly|' + weekday + '|' + hour);
  }
  PropertiesService.getScriptProperties().setProperties({ SR_EMAIL_ENABLED: String(enabled), SR_EMAIL_WEEKDAY: weekday, SR_EMAIL_HOUR: String(hour) }, false);
  appendAudit_({ event: 'EMAIL_SCHEDULE_UPDATED', type: 'schedule', id: 'balance-statements', summary: enabled ? 'Weekly balance emails enabled' : 'Weekly balance emails disabled' }, actor);
  return { ok: true, schedule: emailSchedule_() };
}

function runScheduledSchoolRewardsStatements(e) {
  var actor = scheduledAdminActor_(e, 'runScheduledSchoolRewardsStatements', 'SR_EMAIL_TRIGGER_REGISTRATION');
  var period = weeklyMailPeriodKey_(now_());
  return startAndProcessMailRun_('STUDENT_STATEMENT', period, SR_MAX_BATCH, SR_MAIL_CHUNK_DEFAULT, actor, 'mail_weekly_' + hash_(period).slice(0, 36));
}

function getSchoolRewardsMailRun(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var runId = id_(request.runId, 'mail run');
  return locked_(function() {
    requireMailSchemaV6_(book_());
    var run = mailRunById_(book_(), runId);
    if (!run) throw srError_('not_found', 'Mail run was not found.');
    reconcileMailRunManifestProgress_(book_(), run);
    run = mailRunById_(book_(), runId);
    reconcileMailRunAudits_(run, actor);
    return { ok: true, run: mailRunDto_(book_(), run), deliveries: mailOutbox_(book_()).filter(function(item) { return item.runId === run.id; }).map(function(delivery) { return mailDeliveryDto_(delivery, book_()); }) };
  });
}

function continueSchoolRewardsMailRuns(e) {
  var actor = scheduledAdminActor_(e, 'continueSchoolRewardsMailRuns', 'SR_MAIL_CONTINUATION_REGISTRATION');
  var runId = locked_(function() {
    var book = book_(); requireMailSchemaV6_(book); requireMailSafetySweep_();
    if (!normalizeEmail_(Session.getActiveUser().getEmail())) consumeMailContinuationTrigger_(e);
    var selected = selectNextMailRun_(book);
    if (selected) {
      try { scheduleMailContinuationLocked_(selected.delay, true); }
      catch (firstScheduleFailure) {
        try { scheduleMailContinuationLocked_(selected.delay, true); }
        catch (_) { throw firstScheduleFailure; }
      }
    }
    return selected ? selected.run.id : '';
  });
  if (!runId) {
    ensureMailContinuationForAnyRun_();
    return { ok: true, runId: '', status: 'COMPLETED', attempted: 0, sent: 0, skipped: 0, failed: 0, uncertain: 0, pending: 0, remaining: 0, canResume: false, continuationScheduled: false };
  }
  return processMailRun_(runId, SR_MAIL_CHUNK_DEFAULT, actor);
}

function sweepSchoolRewardsMailRuns(e) {
  var actor = scheduledAdminActor_(e, 'sweepSchoolRewardsMailRuns', 'SR_MAIL_SWEEP_REGISTRATION');
  var runId = locked_(function() {
    var book = book_(); requireMailSchemaV6_(book); requireMailSafetySweep_();
    var selected = selectNextMailRun_(book);
    return selected ? selected.run.id : '';
  });
  if (!runId) {
    ensureMailContinuationForAnyRun_();
    return { ok: true, runId: '', status: 'COMPLETED', attempted: 0, sent: 0, skipped: 0, failed: 0, uncertain: 0, pending: 0, remaining: 0, canResume: false, continuationScheduled: false };
  }
  return processMailRun_(runId, SR_MAIL_CHUNK_DEFAULT, actor);
}

function resolveSchoolRewardsMailDelivery(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var outboxId = id_(request.outboxId, 'mail delivery'), status = text_(request.status, 20, '').toUpperCase();
  var note = text_(request.note, 240, ''), key = idemKey_(request.idempotencyKey);
  if (status !== 'SENT' && status !== 'FAILED') throw srError_('mail_delivery_state', 'Resolved mail status must be sent or failed.');
  if (note.length < 8) throw srError_('reason_required', 'Record how delivery was verified using at least 8 characters.');
  if (/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(note)) throw srError_('mail_privacy', 'Do not include an email address in the resolution note.');
  var operation = printIdemOperation_('mail_delivery_resolve', actor, { outboxId: outboxId, status: status, note: note });
  var result = locked_(function() {
    var prior = idemResult_(key, operation);
    if (prior) {
      var priorBook = book_(), priorDelivery = mailOutboxById_(priorBook, outboxId);
      if (!priorDelivery) throw srError_('mail_integrity', 'The resolved mail delivery is missing.');
      assertMailDeliverySignature_(priorDelivery);
      var priorRun = mailRunById_(priorBook, priorDelivery.runId);
      if (!priorRun) throw srError_('mail_integrity', 'The resolved mail run is missing.');
      return { ok: true, delivery: mailDeliveryDto_(priorDelivery, priorBook), run: mailRunDto_(priorBook, priorRun) };
    }
    var book = book_(); requireMailSchemaV6_(book);
    var delivery = mailOutboxById_(book, outboxId);
    if (!delivery) throw srError_('not_found', 'Mail delivery was not found.');
    assertMailDeliverySignature_(delivery);
    var resolverHash = mailActorHash_(actor.email, mailDeliverySecret_(false));
    if (delivery.status !== 'UNKNOWN') {
      var exactResolution = delivery.status === status && delivery.resolutionNote === note &&
        secureTextEqual_(delivery.resolvedByHash, resolverHash) && !!delivery.resolvedAt &&
        (status === 'FAILED' ? delivery.errorCode === 'ADMIN_CONFIRMED_FAILED' : delivery.errorCode === '');
      if (!exactResolution) throw srError_('mail_delivery_state', 'Only an unknown delivery can be resolved after stale-attempt reconciliation.');
      var exactRun = mailRunById_(book, delivery.runId);
      if (!exactRun) throw srError_('mail_integrity', 'The mail delivery run is missing.');
      assertMailRunSignature_(exactRun);
      projectMailDelivery_(book, delivery, delivery.recipientHash);
      var exactProgress = mailRunProgress_(book, exactRun), exactRemaining = mailRunRemaining_(book, exactRun, exactProgress);
      var exactNextStatus = exactProgress.pending || exactProgress.uncertain ? 'NEEDS_REVIEW' : exactRemaining ? 'RUNNING' : 'COMPLETED';
      refreshMailRunCounters_(book, exactRun, exactNextStatus, '');
      var exactResult = { ok: true, delivery: mailDeliveryDto_(delivery, book), run: mailRunDto_(book, exactRun) };
      if (exactResult.run.canResume) { scheduleMailContinuationLocked_(SR_MAIL_CONTINUATION_DELAY_MS); exactResult.run.continuationScheduled = true; }
      appendAuditOnce_({ event: 'MAIL_DELIVERY_RESOLVED', type: 'mail_delivery', id: delivery.id, summary: delivery.kind + ' delivery resolved as ' + status }, actor);
      SpreadsheetApp.flush();
      rememberIdem_(key, operation, exactResult);
      return exactResult;
    }
    var at = now_();
    delivery.status = status; delivery.settledAt = at; delivery.resolvedAt = at;
    delivery.resolvedByHash = resolverHash;
    delivery.resolutionNote = note;
    delivery.errorCode = status === 'FAILED' ? 'ADMIN_CONFIRMED_FAILED' : '';
    delivery.error = status === 'FAILED' ? 'An administrator confirmed that delivery did not occur.' : '';
    signMailDelivery_(delivery);
    upsertMailOutbox_(book, delivery);
    coreFault_('mail:resolve_after_delivery');
    projectMailDelivery_(book, delivery, delivery.recipientHash);
    coreFault_('mail:resolve_after_projection');
    var run = mailRunById_(book, delivery.runId);
    if (!run) throw srError_('mail_integrity', 'The mail delivery run is missing.');
    assertMailRunSignature_(run);
    var progress = mailRunProgress_(book, run), remaining = mailRunRemaining_(book, run, progress);
    var nextStatus = progress.pending || progress.uncertain ? 'NEEDS_REVIEW' : remaining ? 'RUNNING' : 'COMPLETED';
    refreshMailRunCounters_(book, run, nextStatus, '');
    result = { ok: true, delivery: mailDeliveryDto_(delivery, book), run: mailRunDto_(book, run) };
    if (result.run.canResume) { scheduleMailContinuationLocked_(SR_MAIL_CONTINUATION_DELAY_MS); result.run.continuationScheduled = true; }
    appendAuditOnce_({ event: 'MAIL_DELIVERY_RESOLVED', type: 'mail_delivery', id: delivery.id, summary: delivery.kind + ' delivery resolved as ' + status }, actor);
    SpreadsheetApp.flush();
    coreFault_('mail:resolve_after_flush');
    rememberIdem_(key, operation, result);
    return result;
  });
  if (result.run && result.run.canResume) {
    scheduleMailContinuation_(SR_MAIL_CONTINUATION_DELAY_MS);
    result.run.continuationScheduled = true;
  }
  return result;
}

function retrySchoolRewardsMailDelivery(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var outboxId = id_(request.outboxId, 'mail delivery'), key = idemKey_(request.idempotencyKey);
  var operation = printIdemOperation_('mail_delivery_retry', actor, { outboxId: outboxId });
  var prior = locked_(function() {
    var saved = idemResult_(key, operation);
    if (!saved) return null;
    var priorBook = book_(), priorDelivery = saved.delivery && mailOutboxById_(priorBook, saved.delivery.id);
    if (!priorDelivery) throw srError_('mail_integrity', 'The retried mail delivery is missing.');
    assertMailDeliverySignature_(priorDelivery);
    reconcileMailRetryAudit_(priorDelivery, actor);
    var priorRun = mailRunById_(priorBook, priorDelivery.runId);
    if (!priorRun) throw srError_('mail_integrity', 'The retried mail run is missing.');
    return { ok: priorDelivery.status === 'SENT', delivery: mailDeliveryDto_(priorDelivery, priorBook), run: mailRunDto_(priorBook, priorRun) };
  });
  if (prior) return prior;
  var leaseToken = acquireMailWorkerLease_('retry_' + outboxId);
  if (!leaseToken) return retryDeferredResult_(outboxId, 'mail_worker_busy', 'QUEUED');
  var retryResult, retryError = null, retryCleanupError = null;
  try {
    if (bulkMailAllowance_() < 1) return retryDeferredResult_(outboxId, 'mail_quota_reserved', 'PAUSED_QUOTA');
    retryResult = retrySchoolRewardsMailDeliveryWithLease_(outboxId, key, operation, actor);
  } catch (retryFailure) { retryError = retryFailure; }
  try { releaseMailWorkerLease_(leaseToken); } catch (retryReleaseFailure) { retryCleanupError = retryReleaseFailure; }
  try { ensureMailContinuationForAnyRun_(); } catch (retryScheduleFailure) { if (!retryCleanupError) retryCleanupError = retryScheduleFailure; }
  if (retryError) throw retryError;
  if (retryCleanupError) throw retryCleanupError;
  return locked_(function() {
    var resultBook = book_(), currentDelivery = retryResult && retryResult.delivery ? mailOutboxById_(resultBook, retryResult.delivery.id) : null;
    if (!currentDelivery) return retryResult;
    assertMailDeliverySignature_(currentDelivery);
    var currentRun = mailRunById_(resultBook, currentDelivery.runId);
    if (!currentRun) throw srError_('mail_integrity', 'The retried mail run is missing.');
    return { ok: currentDelivery.status === 'SENT', delivery: mailDeliveryDto_(currentDelivery, resultBook), run: mailRunDto_(resultBook, currentRun) };
  });
}
function retryDeferredResult_(outboxId, code, status) {
  return locked_(function() {
    var book = book_(), source = mailOutboxById_(book, outboxId);
    if (!source) throw srError_('not_found', 'Mail delivery was not found.');
    assertConfirmedFailedMailDelivery_(source);
    var run = mailRunById_(book, source.runId);
    if (!run) throw srError_('mail_integrity', 'The mail retry run is missing.');
    assertMailRunSignature_(run);
    throw srError_(code, code === 'mail_quota_reserved' ? 'Bulk mail quota is reserved for immediate receipts. Retry after the daily quota resets.' : 'Another bulk mail worker is active. Retry this exact request shortly.');
  });
}
function retrySchoolRewardsMailDeliveryWithLease_(outboxId, key, operation, actor) {
  var prepared = locked_(function() {
    var priorResult = idemResult_(key, operation); if (priorResult) return { action: 'RESULT', result: priorResult };
    var book = book_(); requireMailSchemaV6_(book); requireMailSafetySweep_();
    var source = mailOutboxById_(book, outboxId);
    if (!source) throw srError_('not_found', 'Mail delivery was not found.');
    assertConfirmedFailedMailDelivery_(source);
    var existingRetries = mailOutbox_(book).filter(function(item) { return item.retryOfId === source.id; });
    var retryKey = mailDeliveryKey_(source.kind, source.periodKey + '|retry|' + key, source.studentId, source.guardianId);
    var retryId = mailOutboxId_(retryKey, source.id), exact = existingRetries.filter(function(item) { return item.id === retryId; });
    if (existingRetries.length && !exact.length) throw srError_('mail_retry_exists', 'This failed attempt already has a retry. Retry the newer failed attempt if another attempt is appropriate.');
    if (exact.length) {
      var saved = exact[0]; assertMailDeliverySignature_(saved);
      var changedToUnknown = false;
      if (saved.status === 'PENDING' && mailPendingIsStale_(saved)) {
        saved.status = 'UNKNOWN'; saved.settledAt = now_(); saved.errorCode = 'DELIVERY_AMBIGUOUS';
        saved.error = 'Delivery could not be confirmed after an interrupted retry.';
        signMailDelivery_(saved);
        upsertMailOutbox_(book, saved);
        changedToUnknown = true;
      }
      var savedRun = mailRunById_(book, saved.runId);
      if (!savedRun) throw srError_('mail_integrity', 'The mail retry run is missing.');
      assertMailRunSignature_(savedRun);
      if (saved.status !== 'PENDING') projectMailDelivery_(book, saved, saved.recipientHash);
      var savedProgress = mailRunProgress_(book, savedRun), savedRemaining = mailRunRemaining_(book, savedRun, savedProgress);
      var savedStatus = savedProgress.pending || savedProgress.uncertain ? 'NEEDS_REVIEW' : savedRemaining ? 'RUNNING' : 'COMPLETED';
      refreshMailRunCounters_(book, savedRun, savedStatus, savedStatus === 'NEEDS_REVIEW' ? 'DELIVERY_AMBIGUOUS' : '');
      var savedResult = { ok: saved.status === 'SENT', delivery: mailDeliveryDto_(saved, book), run: mailRunDto_(book, savedRun) };
      if (savedResult.run.canResume) { scheduleMailContinuationLocked_(SR_MAIL_CONTINUATION_DELAY_MS); savedResult.run.continuationScheduled = true; }
      if (saved.status !== 'PENDING') reconcileMailRetryAudit_(saved, actor);
      if (saved.status === 'SENT') rememberIdem_(key, operation, savedResult);
      return { action: 'RESULT', result: savedResult };
    }
    var recipient = resolveCurrentMailRecipient_(book, source), secret = mailDeliverySecret_(false), at = now_();
    var delivery = {
      id: retryId, runId: source.runId, deliveryKey: retryKey, kind: source.kind, studentId: source.studentId,
      guardianId: source.guardianId, recipientHash: source.recipientHash, consentConfirmedAt: source.consentConfirmedAt,
      periodKey: source.periodKey, payloadJson: source.payloadJson, payloadHash: '', status: 'PENDING',
      createdAt: at, attemptedAt: at, settledAt: '', errorCode: '', error: '', retryOfId: source.id,
      resolvedAt: '', resolvedByHash: '', resolutionNote: ''
    };
    delivery.payloadHash = mailOutboxSignature_(delivery, secret);
    scheduleMailContinuationLocked_(SR_MAIL_PENDING_STALE_MS);
    coreFault_('mail:before_pending');
    upsertMailOutbox_(book, delivery);
    coreFault_('mail:after_pending_row');
    var run = mailRunById_(book, delivery.runId);
    if (!run) throw srError_('mail_integrity', 'The mail retry run is missing.');
    assertMailRunSignature_(run);
    refreshMailRunCounters_(book, run, 'RUNNING', '');
    SpreadsheetApp.flush();
    var message = mailMessageForDelivery_(book, delivery, recipient);
    coreFault_('mail:after_pending');
    return { action: 'SEND', deliveryId: delivery.id, message: message, legacyRecipientHash: recipient.legacyRecipientHash };
  });
  if (prepared.action === 'RESULT') return prepared.result;
  try { MailApp.sendEmail(prepared.message); }
  catch (_) { settleMailDelivery_(prepared.deliveryId, 'UNKNOWN', 'MAIL_SERVICE_AMBIGUOUS', prepared.legacyRecipientHash); }
  if (mailOutboxById_(book_(), prepared.deliveryId).status === 'PENDING') {
    coreFault_('mail:after_send');
    settleMailDelivery_(prepared.deliveryId, 'SENT', '', prepared.legacyRecipientHash);
  }
  finalizeMailRun_(mailOutboxById_(book_(), prepared.deliveryId).runId, false, actor);
  return locked_(function() {
    var book = book_(), delivery = mailOutboxById_(book, prepared.deliveryId), run = mailRunById_(book, delivery.runId);
    assertMailDeliverySignature_(delivery); assertMailRunSignature_(run);
    var result = { ok: delivery.status === 'SENT', delivery: mailDeliveryDto_(delivery, book), run: mailRunDto_(book, run) };
    coreFault_('mail:retry_before_audit');
    reconcileMailRetryAudit_(delivery, actor);
    if (delivery.status === 'SENT') rememberIdem_(key, operation, result);
    return result;
  });
}

function reconcileMailRetryAudit_(delivery, actor) {
  if (delivery.status === 'PENDING') return;
  appendAuditOnce_({ event: 'MAIL_DELIVERY_RETRIED', type: 'mail_delivery', id: delivery.id, summary: delivery.kind + ' retry settled as ' + delivery.status }, actor);
}

function verifySchoolRewardsAuditChain() {
  requireRole_(['admin']);
  return auditChainStatus_();
}
function auditChainStatus_() {
  var rows = rows_(sheet_(book_(), 'Audit'), 10), previous = 'GENESIS';
  for (var i = 0; i < rows.length; i++) {
    var fields = rows[i].slice(0, 9).map(cell_);
    if (fields[8] !== previous) return { ok: false, reason: 'link', brokenAtRow: i + 2, entryId: fields[0], verified: i };
    var expected = hash_(fields.join('|')), actual = cell_(rows[i][9]);
    if (actual !== expected && actual !== 'h_' + expected) return { ok: false, reason: 'content', brokenAtRow: i + 2, entryId: fields[0], verified: i };
    previous = cell_(rows[i][9]);
  }
  return { ok: true, rows: rows.length, verified: rows.length };
}

function sendStatements_(period, limit, actor) {
  var book = book_(), config = configMap_(book), balances = balancesMap_(book), holds = pointHolds_(book), existing = statementKeys_(book), languages = languageMap_(book);
  var students = students_(book).filter(function(student) { return student.active && student.email; });
  students.forEach(function(student) { student.language = languages[student.id] || 'en'; });
  var quota = mailQuota_(), cap = Math.min(limit, quota), sent = 0, skipped = 0, failed = 0, asOf = now_();
  var windowItem = visibleWindow_(book);
  var prizes = windowItem ? catalog_(book).filter(function(item) { return item.active; }).slice(0, 12) : [];
  for (var i = 0; i < students.length && sent + failed < cap; i++) {
    var student = students[i], statementKey = student.id + '|' + period;
    if (existing[statementKey]) { skipped++; continue; }
    var availability = pointAvailability_(book, student.id, balances, holds), statementId = uuid_();
    try {
      MailApp.sendEmail({ to: student.email, subject: statementCopy_(student.language).subject(config), name: (config.schoolName || 'School') + ' School Rewards', body: statementText_(student, availability, asOf, config, windowItem, prizes), htmlBody: statementHtml_(student, availability, asOf, config, windowItem, prizes) });
      sheet_(book, 'Statements').appendRow(safeRow_([statementId, student.id, period, availability.balance, 'SENT', asOf, ''])); sent++;
    } catch (err) {
      sheet_(book, 'Statements').appendRow(safeRow_([statementId, student.id, period, availability.balance, 'FAILED', asOf, text_(err && err.message, 300, 'Mail send failed')])); failed++;
    }
  }
  appendAudit_({ event: 'BALANCE_STATEMENTS_SENT', type: 'statement_batch', id: period, summary: sent + ' sent, ' + failed + ' failed' }, actor);
  return { ok: failed === 0, periodKey: period, sent: sent, skipped: skipped, failed: failed, remainingQuota: Math.max(0, quota - sent) };
}
function sendOrderReceipt_(book, student, order, balance, kind) {
  var config = configMap_(book), receiptId = uuid_(), sentAt = now_(), status = 'PENDING', error = '', target = sheet_(book, 'Receipts');
  var isRefund = kind === 'REFUND', movement = isRefund ? order.total : -order.total, balanceLabel = text_(order.balanceLabel, 100, 'Available balance after this transaction');
  var subject = (config.schoolName || 'School') + ' rewards ' + (isRefund ? 'refund' : 'purchase') + ' receipt';
  var lines = order.lines || [];
  var plain = ['Hello ' + student.firstName + ',', '', isRefund ? 'Your school store order was refunded.' : 'Your school store purchase is complete.', 'Order: ' + order.id, 'Date: ' + order.at, ''];
  lines.forEach(function(line) { plain.push(line.quantity + ' x ' + line.itemName + ' — ' + line.lineTotal + ' points'); });
  plain.push('', (isRefund ? 'Points restored: +' : 'Points spent: ') + order.total, balanceLabel + ': ' + balance + ' points', '', 'Keep this email as your receipt. Contact your school if anything looks incorrect.');
  var htmlLines = lines.map(function(line) { return '<li>' + line.quantity + ' × ' + html_(line.itemName) + ' — <strong>' + line.lineTotal + ' points</strong></li>'; }).join('');
  var htmlBody = '<div style="font:16px system-ui;line-height:1.55;color:#172033;max-width:620px"><p>Hello ' + html_(student.firstName) + ',</p><h1 style="font-size:22px">' + (isRefund ? 'Refund receipt' : 'School store receipt') + '</h1><p>Order <strong>' + html_(order.id) + '</strong><br>' + html_(order.at) + '</p><ul>' + htmlLines + '</ul><p>' + (isRefund ? 'Points restored: <strong>+' : 'Points spent: <strong>') + order.total + '</strong><br>' + html_(balanceLabel) + ': <strong>' + balance + ' points</strong></p><p style="font-size:13px;color:#526079">Keep this email as your receipt. Contact your school if anything looks incorrect.</p></div>';
  try { target.appendRow(safeRow_([receiptId, order.id, student.id, kind, student.email, status, sentAt, ''])); }
  catch (persistError) { return { id: '', kind: kind, status: 'FAILED', sentAt: sentAt, points: movement }; }
  try { MailApp.sendEmail({ to: student.email, subject: subject, name: (config.schoolName || 'School') + ' School Rewards', body: plain.join('\n'), htmlBody: htmlBody }); status = 'SENT'; }
  catch (err) { status = 'FAILED'; error = text_(err && err.message, 300, 'Mail send failed'); }
  try { upsert_(target, 8, receiptId, safeRow_([receiptId, order.id, student.id, kind, student.email, status, sentAt, error])); }
  catch (persistError) { status = 'UNKNOWN'; }
  return { id: receiptId, kind: kind, status: status, sentAt: sentAt, points: movement };
}
// Statement language (2026-09-02). A student's language preference lives in a
// small on-demand Preferences sheet (created when first needed, so existing
// repositories need no migration). The portal saves the student's own choice
// from its language menu; an administrator can set it for a student. Balance
// statements then go out in that language. Guardian digests stay English.
var SR_LANGUAGES = ['en', 'es'];
function prefsSheet_(book) {
  var sheet = book.getSheetByName('Preferences');
  if (!sheet) { sheet = book.insertSheet('Preferences'); sheet.getRange(1, 1, 1, 3).setValues([['StudentId', 'Language', 'UpdatedAt']]); }
  return sheet;
}
function languageMap_(book) {
  var sheet = book.getSheetByName('Preferences'), map = {};
  if (!sheet) return map;
  rows_(sheet, 3).forEach(function(row) { var lang = String(row[1] || ''); if (row[0] && SR_LANGUAGES.indexOf(lang) >= 0) map[String(row[0])] = lang; });
  return map;
}
function studentLanguage_(book, studentId) { return languageMap_(book)[studentId] || 'en'; }
function setStudentLanguage_(book, studentId, language) {
  var sheet = prefsSheet_(book), list = rows_(sheet, 3), at = now_();
  for (var i = 0; i < list.length; i++) if (String(list[i][0]) === studentId) { sheet.getRange(i + 2, 1, 1, 3).setValues([[studentId, language, at]]); return; }
  sheet.appendRow([studentId, language, at]);
}
function setSchoolRewardsLanguage(request) {
  var actor = currentActor_(); request = object_(request);
  var language = text_(request.language, 10, '').toLowerCase();
  if (SR_LANGUAGES.indexOf(language) < 0) throw srError_('bad_language', 'Choose a supported language (en or es).');
  var studentId;
  if (actor.role === 'student') studentId = actor.studentId;
  else if (actor.role === 'admin') studentId = id_(request.studentId, 'student');
  else throw srError_('denied', 'Your role cannot perform this action.');
  return locked_(function() {
    var book = book_();
    requireStudent_(book, studentId);
    setStudentLanguage_(book, studentId, language);
    appendAudit_({ event: 'LANGUAGE_SET', type: 'student', id: studentId, summary: 'Statement language set to ' + language }, actor);
    return { ok: true, studentId: studentId, language: language };
  });
}
function statementCopy_(language) {
  if (language === 'es') return {
    subject: function(config) { return (config.schoolName || 'Escuela') + ': actualización de recompensas'; },
    hello: function(name) { return 'Hola ' + name + ','; },
    intro: 'Aquí está tu actualización privada de recompensas escolares.',
    title: 'Tu actualización de recompensas escolares',
    ledger: 'Saldo del registro', reserved: 'Reservado para solicitudes activas', available: 'Disponible para gastar', points: 'puntos',
    asOf: function(asOf) { return 'Saldo al ' + asOf + '.'; },
    preview: 'Vista previa de premios',
    footer: 'Este mensaje es informativo. El registro en vivo en la caja es el saldo oficial. Pregunta en tu escuela si tienes dudas.',
    windowOpen: 'La tienda escolar está abierta ahora.',
    windowPreview: function(item) { return 'La vista previa de premios está disponible para ' + item.name + (item.startsAt ? '; las compras empiezan ' + item.startsAt : '') + '.'; },
    windowOther: function(item) { return item.name + ' está ' + ({ DRAFT: 'en borrador', CLOSED: 'cerrada', ARCHIVED: 'archivada' }[item.status] || item.status.toLowerCase()) + '.'; }
  };
  return {
    subject: function(config) { return (config.schoolName || 'School') + ' rewards update'; },
    hello: function(name) { return 'Hello ' + name + ','; },
    intro: 'Here is your private school rewards update.',
    title: 'Your school rewards update',
    ledger: 'Ledger balance', reserved: 'Reserved for active requests', available: 'Available to spend', points: 'points',
    asOf: function(asOf) { return 'Balance as of ' + asOf + '.'; },
    preview: 'Prize preview',
    footer: 'This message is informational. The live ledger at checkout is the official balance. Contact your school if you have a question.',
    windowOpen: 'The school store is open now.',
    windowPreview: function(item) { return 'Prize preview is available for ' + item.name + (item.startsAt ? '; shopping begins ' + item.startsAt : '') + '.'; },
    windowOther: function(item) { return item.name + ' is ' + item.status.toLowerCase() + '.'; }
  };
}
function statementText_(student, availability, asOf, config, windowItem, prizes) {
  var c = statementCopy_(student && student.language);
  var out = [c.hello(student.firstName), '', c.intro, c.ledger + ': ' + availability.balance + ' ' + c.points + '.', c.reserved + ': ' + availability.reservedPoints + ' ' + c.points + '.', c.available + ': ' + availability.availableBalance + ' ' + c.points + '.', c.asOf(asOf)];
  if (windowItem) out.push('', windowSentence_(windowItem, c));
  if (prizes.length) { out.push('', c.preview + ':'); prizes.forEach(function(item) { out.push('• ' + item.name + ' — ' + item.cost + ' ' + c.points); }); }
  out.push('', c.footer); return out.join('\n');
}
function statementHtml_(student, availability, asOf, config, windowItem, prizes) {
  var c = statementCopy_(student && student.language);
  var catalogPreview = prizes.length ? '<h2 style="font-size:16px">' + html_(c.preview) + '</h2><ul>' + prizes.map(function(item) { return '<li>' + html_(item.name) + ' — <strong>' + item.cost + ' ' + html_(c.points) + '</strong></li>'; }).join('') + '</ul>' : '';
  var windowText = windowItem ? '<p>' + html_(windowSentence_(windowItem, c)) + '</p>' : '';
  return '<div style="font:16px system-ui;line-height:1.55;color:#172033;max-width:620px"><p>' + html_(c.hello(student.firstName)) + '</p><h1 style="font-size:22px">' + html_(c.title) + '</h1><p>' + html_(c.ledger) + ': <strong>' + availability.balance + ' ' + html_(c.points) + '</strong><br>' + html_(c.reserved) + ': <strong>' + availability.reservedPoints + ' ' + html_(c.points) + '</strong><br>' + html_(c.available) + ': <strong style="font-size:1.2em">' + availability.availableBalance + ' ' + html_(c.points) + '</strong></p><p style="color:#526079">' + html_(c.asOf(asOf)) + '</p>' + windowText + catalogPreview + '<p style="font-size:13px;color:#526079">' + html_(c.footer) + '</p></div>';
}
function windowSentence_(item, copy) { var c = copy || statementCopy_('en'); if (item.status === 'OPEN') return c.windowOpen; if (item.status === 'PREVIEW') return c.windowPreview(item); return c.windowOther(item); }

function currentActor_() {
  if (!configured_()) throw srError_('not_configured', 'School Rewards has not been configured.');
  var email = activeEmail_();
  if (emailDomain_(email) !== allowedDomain_()) throw srError_('denied', 'Use an authorized managed Google Education account.');
  var list = members_(book_());
  for (var i = 0; i < list.length; i++) if (list[i].email === email && list[i].active) return { email: email, displayName: list[i].displayName, role: list[i].role };
  var roster = students_(book_());
  for (var j = 0; j < roster.length; j++) if (roster[j].email === email && roster[j].active) return { email: email, displayName: roster[j].firstName, role: 'student', studentId: roster[j].id };
  throw srError_('denied', 'This managed account is not an active School Rewards member.');
}
function scheduledAdminActor_(event, expectedHandler, registrationProperty) {
  if (!configured_()) throw srError_('not_configured', 'School Rewards has not been configured.');
  var interactiveEmail = normalizeEmail_(Session.getActiveUser().getEmail());
  if (interactiveEmail) {
    var interactiveActor = currentActor_();
    if (interactiveActor.role !== 'admin') throw srError_('denied', 'Only an administrator can invoke a scheduled mail handler interactively.');
    return interactiveActor;
  }
  assertMailTriggerEvent_(event, expectedHandler, registrationProperty);
  var email = normalizeEmail_(Session.getEffectiveUser().getEmail());
  if (!email || emailDomain_(email) !== allowedDomain_()) throw srError_('denied', 'The trigger owner must use the configured managed domain.');
  var list = members_(book_());
  for (var i = 0; i < list.length; i++) if (list[i].email === email && list[i].active && list[i].role === 'admin') return { email: email, displayName: list[i].displayName, role: 'admin' };
  throw srError_('denied', 'The trigger owner must remain an active administrator.');
}
function requireRole_(roles) { var actor = currentActor_(); if (roles.indexOf(actor.role) < 0) throw srError_('denied', 'Your role cannot perform this action.'); return actor; }
function configured_() { return PropertiesService.getScriptProperties().getProperty('SR_SETUP_STATE') === 'ready'; }
function allowedDomain_() { return normalizeDomain_(PropertiesService.getScriptProperties().getProperty('SR_ALLOWED_DOMAIN')); }
function book_() { var id = PropertiesService.getScriptProperties().getProperty('SR_SPREADSHEET_ID'); if (!id) throw srError_('not_configured', 'Repository is unavailable.'); return SpreadsheetApp.openById(id); }
function sheet_(book, name) { var sheet = book.getSheetByName(name); if (!sheet) throw srError_('repository', name + ' sheet is missing.'); return sheet; }

function initializeSheets_(book) {
  var names = Object.keys(SR_SHEETS), initial = book.getSheets();
  names.forEach(function(name, index) {
    var sheet = book.getSheetByName(name);
    if (!sheet) { if (index === 0 && initial.length === 1 && initial[0].getLastRow() === 0) { sheet = initial[0]; sheet.setName(name); } else sheet = book.insertSheet(name); }
    var headers = SR_SHEETS[name];
    if (typeof sheet.getMaxColumns === 'function' && sheet.getMaxColumns() < headers.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), headers.length - sheet.getMaxColumns());
    if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    else {
      if (name === 'Ledger' && sheet.getLastRow() >= 1 && String(sheet.getRange(1, 13).getValues()[0][0] || '') === '') sheet.getRange(1, 13).setValues([['CategoryId']]);
      if (name === 'Catalog' && String(sheet.getRange(1, 11).getValues()[0][0] || '') === '') {
        var legacyCatalogHeaders = sheet.getRange(1, 1, 1, 10).getValues()[0], catalogCompatible = true;
        for (var catalogHeaderIndex = 0; catalogHeaderIndex < 10; catalogHeaderIndex++) if (String(legacyCatalogHeaders[catalogHeaderIndex] || '') !== headers[catalogHeaderIndex]) catalogCompatible = false;
        if (catalogCompatible) sheet.getRange(1, 11).setValues([['InventoryVersion']]);
      }
      if (name === 'PrintRequests' && String(sheet.getRange(1, 32).getValues()[0][0] || '') === '') {
        var legacyPrintHeaders = sheet.getRange(1, 1, 1, 31).getValues()[0], compatible = true;
        for (var legacyIndex = 0; legacyIndex < 31; legacyIndex++) if (String(legacyPrintHeaders[legacyIndex] || '') !== headers[legacyIndex]) compatible = false;
        if (compatible) sheet.getRange(1, 32).setValues([['PreviousRequestId']]);
      }
      var actual = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      headers.forEach(function(header, i) { if (String(actual[i] || '') !== header) throw srError_('schema', name + ' headers do not match schema version ' + SR_VERSION + '.'); });
    }
    sheet.setFrozenRows(1);
  });
}
function putConfig_(book, values) { var sheet = sheet_(book, 'Config'), map = configMap_(book); Object.keys(values).forEach(function(key) { map[key] = String(values[key] == null ? '' : values[key]); }); var valuesOut = [['Key', 'Value']]; Object.keys(map).sort().forEach(function(key) { valuesOut.push(safeRow_([key, map[key]])); }); sheet.clearContents(); sheet.getRange(1, 1, valuesOut.length, 2).setValues(valuesOut); sheet.setFrozenRows(1); }
function configMap_(book) { var map = {}; rows_(sheet_(book, 'Config'), 2).forEach(function(row) { map[String(row[0])] = String(row[1] || ''); }); return map; }

function members_(book) { return rows_(sheet_(book, 'Members'), 4).map(function(row) { return { email: normalizeEmail_(row[0]), displayName: String(row[1] || ''), role: String(row[2] || ''), active: bool_(row[3]) }; }); }
function normalizeMember_(value, domain) { value = object_(value); var email = normalizeEmail_(value.email), role = text_(value.role, 20, '').toLowerCase(); if (!email || emailDomain_(email) !== domain) throw srError_('bad_member', 'Member email must be in the configured domain.'); if (SR_ROLES.indexOf(role) < 0) throw srError_('bad_member', 'Role must be admin, staff, or cashier.'); return { email: email, displayName: text_(value.displayName, 120, email.split('@')[0]), role: role, active: value.active !== false }; }
function upsertMemberRow_(book, member) { upsert_(sheet_(book, 'Members'), 4, member.email, safeRow_([member.email, member.displayName, member.role, member.active])); }
function assertAdminInvariant_(member) { var count = 0; members_(book_()).forEach(function(item) { if (item.email !== member.email && item.role === 'admin' && item.active) count++; }); if (member.role === 'admin' && member.active) count++; if (!count) throw srError_('admin_required', 'At least one active administrator is required.'); }

function students_(book) { return rows_(sheet_(book, 'Students'), 9).map(function(row) { return { id: String(row[0] || ''), firstName: String(row[1] || ''), lastInitial: String(row[2] || ''), grade: String(row[3] || ''), homeroom: String(row[4] || ''), email: normalizeEmail_(row[5]), active: bool_(row[6]), createdAt: cell_(row[7]), updatedAt: cell_(row[8]) }; }); }
function normalizeStudent_(value, domain, existingId) { value = object_(value); var email = normalizeEmail_(value.email), firstName = text_(value.firstName, 80, ''); if (!email || emailDomain_(email) !== domain) throw srError_('bad_student', 'Student email must be a managed address in the configured domain.'); if (!firstName) throw srError_('bad_student', 'Student first name is required.'); return { id: existingId || text_(value.id, 80, ''), firstName: firstName, lastInitial: text_(value.lastInitial, 4, '').slice(0, 1).toUpperCase(), grade: text_(value.grade, 20, ''), homeroom: text_(value.homeroom, 80, ''), email: email, active: value.active !== false }; }
function upsertStudentRow_(book, student) {
  var existing = students_(book), studentId = student.id || uuid_(), createdAt = now_();
  existing.forEach(function(item) { if (item.email === student.email && item.id !== studentId) throw srError_('duplicate_student', 'That student email is already assigned.'); if (item.id === studentId) createdAt = item.createdAt || createdAt; });
  assertMailRecipientMutationAllowed_(book, studentId, '');
  var saved = { id: studentId, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, email: student.email, active: student.active, createdAt: createdAt, updatedAt: now_() };
  upsert_(sheet_(book, 'Students'), 9, studentId, safeRow_([saved.id, saved.firstName, saved.lastInitial, saved.grade, saved.homeroom, saved.email, saved.active, saved.createdAt, saved.updatedAt]));
  if (!balancesMap_(book)[studentId]) sheet_(book, 'Balances').appendRow(safeRow_([studentId, 0, 0, 0, now_()])); return saved;
}
function studentById_(book, studentId) { var list = students_(book); for (var i = 0; i < list.length; i++) if (list[i].id === studentId) return list[i]; return null; }
function requireStudentRecord_(book, studentId) { var student = studentById_(book, studentId); if (!student) throw srError_('not_found', 'Student record was not found.'); return student; }
function requireStudent_(book, studentId) { var student = requireStudentRecord_(book, studentId); if (student.active) return student; throw srError_('not_found', 'Active student was not found.'); }

function guardians_(book) { return rows_(sheet_(book, 'Guardians'), 9).map(function(row) { return { id: String(row[0] || ''), studentId: String(row[1] || ''), guardianEmail: normalizeEmail_(row[2]), guardianName: String(row[3] || ''), relationship: String(row[4] || ''), active: bool_(row[5]), consentConfirmedAt: cell_(row[6]), createdAt: cell_(row[7]), updatedAt: cell_(row[8]) }; }); }
function guardianById_(book, guardianId) { var list = guardians_(book); for (var i = 0; i < list.length; i++) if (list[i].id === guardianId) return list[i]; return null; }
function normalizeGuardian_(book, value) {
  value = object_(value); var studentId = id_(value.studentId, 'student'), email = normalizeEmail_(value.guardianEmail), requestedId = optionalId_(value.id, 'guardian mapping'); requireStudent_(book, studentId);
  if (!email) throw srError_('bad_guardian', 'A valid guardian email is required.');
  var list = guardians_(book), existing = requestedId ? guardianById_(book, requestedId) : null;
  if (!existing) for (var i = 0; i < list.length; i++) if (list[i].studentId === studentId && list[i].guardianEmail === email) { existing = list[i]; break; }
  if (existing && existing.studentId !== studentId) throw srError_('bad_guardian', 'A guardian mapping cannot be moved to another student.');
  var active = value.active !== false, consentAt = '';
  if (active) {
    if (value.consentConfirmed === true) consentAt = now_();
    else if (existing && existing.active && existing.guardianEmail === email && existing.consentConfirmedAt) consentAt = existing.consentConfirmedAt;
    else throw srError_('consent_required', 'Confirm fresh guardian communication authorization before enabling or re-enabling digests.');
  }
  return { id: existing ? existing.id : requestedId, studentId: studentId, guardianEmail: email, guardianName: text_(value.guardianName, 120, existing ? existing.guardianName : ''), relationship: text_(value.relationship, 80, existing ? existing.relationship : 'Guardian'), active: active, consentConfirmedAt: consentAt, createdAt: existing ? existing.createdAt : '', updatedAt: '' };
}
function upsertGuardianRow_(book, guardian) {
  var at = now_(); guardian.id = guardian.id || uuid_(); guardian.createdAt = guardian.createdAt || at; guardian.updatedAt = at;
  guardians_(book).forEach(function(item) { if (item.id !== guardian.id && item.studentId === guardian.studentId && item.guardianEmail === guardian.guardianEmail) throw srError_('duplicate_guardian', 'That guardian mapping already exists.'); });
  assertMailRecipientMutationAllowed_(book, guardian.studentId, guardian.id);
  upsert_(sheet_(book, 'Guardians'), 9, guardian.id, safeRow_([guardian.id, guardian.studentId, guardian.guardianEmail, guardian.guardianName, guardian.relationship, guardian.active, guardian.consentConfirmedAt, guardian.createdAt, guardian.updatedAt])); return guardian;
}
function guardianDto_(guardian) { return { id: guardian.id, studentId: guardian.studentId, guardianEmail: guardian.guardianEmail, guardianName: guardian.guardianName, relationship: guardian.relationship, active: guardian.active, consentConfirmedAt: guardian.consentConfirmedAt, updatedAt: guardian.updatedAt }; }
function guardianDigestKeys_(book) { var map = {}; rows_(sheet_(book, 'GuardianDigests'), 7).forEach(function(row) { if (String(row[4]) === 'SENT') map[String(row[1]) + '|' + String(row[2]) + '|' + String(row[3])] = true; }); return map; }
function guardianDigestBodies_(guardian, student, availability, earned, progress, config, at) {
  var greeting = guardian.guardianName ? 'Hello ' + guardian.guardianName + ',' : 'Hello,';
  var plain = [greeting, '', 'Here is a positive School Rewards update for ' + student.firstName + '.', 'Total points earned: ' + earned + '.', 'Current balance: ' + availability.balance + ' points.', 'Available after active reservations: ' + availability.availableBalance + ' points.'];
  if (progress.length) { plain.push('', 'Growth by recognition category:'); progress.forEach(function(item) { plain.push('- ' + item.name + ': ' + item.points + ' points (' + item.levelName + ')'); }); }
  plain.push('', 'This summary intentionally excludes individual notes, staff identities, and classroom details.', 'Generated ' + at + '. Contact the school if this guardian mapping is incorrect.');
  var progressHtml = progress.length ? '<h2 style="font-size:16px">Recognition growth</h2><ul>' + progress.map(function(item) { return '<li>' + html_(item.name) + ': <strong>' + item.points + ' points</strong> (' + html_(item.levelName) + ')</li>'; }).join('') + '</ul>' : '';
  var htmlBody = '<div style="font:16px system-ui;line-height:1.55;color:#172033;max-width:620px"><p>' + html_(greeting) + '</p><p>Here is a positive School Rewards update for <strong>' + html_(student.firstName) + '</strong>.</p><p>Total points earned: <strong>' + earned + '</strong><br>Current balance: <strong>' + availability.balance + ' points</strong><br>Available after active reservations: <strong>' + availability.availableBalance + ' points</strong></p>' + progressHtml + '<p style="font-size:13px;color:#526079">This summary intentionally excludes individual notes, staff identities, and classroom details. Generated ' + html_(at) + '. Contact the school if this guardian mapping is incorrect.</p></div>';
  return { body: plain.join('\n'), htmlBody: htmlBody };
}

function normalizeSisSnapshot_(book, request) {
  var formatVersion = text_(request.formatVersion, 60, ''); if (formatVersion !== 'alloflow-sis-roster/1') throw srError_('bad_sis_snapshot', 'Use SIS snapshot format alloflow-sis-roster/1.');
  var snapshotId = id_(request.snapshotId, 'SIS snapshot'), raw = Array.isArray(request.students) ? request.students : [];
  if (!raw.length || raw.length > SR_MAX_BATCH) throw srError_('bad_sis_snapshot', 'Provide between 1 and ' + SR_MAX_BATCH + ' SIS roster rows.');
  var existing = students_(book), byEmail = {}, byId = {}; existing.forEach(function(student) { byEmail[student.email] = student; byId[student.id] = student; });
  var seen = {}, requestProjection = [], normalized = raw.map(function(value) {
    value = object_(value); if (value.active === false) throw srError_('sis_deactivation_disabled', 'The provider-neutral SIS pilot does not deactivate missing or inactive rows.');
    var email = normalizeEmail_(value.email); if (!email || seen[email]) throw srError_('bad_sis_snapshot', seen[email] ? 'The SIS snapshot contains a duplicate email.' : 'Every SIS row needs a valid managed student email.'); seen[email] = true;
    var suppliedId = optionalId_(value.id, 'student'), matched = suppliedId ? byId[suppliedId] : byEmail[email];
    if (suppliedId && byEmail[email] && byEmail[email].id !== suppliedId) throw srError_('bad_sis_snapshot', 'A supplied student id conflicts with the existing managed email.');
    var student = normalizeStudent_({ firstName: value.firstName, lastInitial: value.lastInitial, grade: value.grade, homeroom: value.homeroom, email: email, active: true }, allowedDomain_(), matched ? matched.id : suppliedId); student.active = true;
    requestProjection.push({ id: suppliedId, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, email: student.email, active: true });
    return student;
  });
  var contentHash = hash_(stableJson_(normalized.map(function(student) { return { id: student.id, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, email: student.email, active: true }; })));
  return { formatVersion: formatVersion, snapshotId: snapshotId, contentHash: contentHash, requestContentHash: hash_(stableJson_(requestProjection)), students: normalized };
}
function sisSnapshotDiff_(book, snapshotStudents) {
  var existing = students_(book), byEmail = {}, byId = {}; existing.forEach(function(student) { byEmail[student.email] = student; byId[student.id] = student; });
  var counts = { created: 0, updated: 0, unchanged: 0, total: snapshotStudents.length }, changes = [];
  snapshotStudents.forEach(function(student) { var current = student.id ? byId[student.id] : byEmail[student.email], action = !current ? 'CREATE' : sameStudentRoster_(current, student) ? 'UNCHANGED' : 'UPDATE'; counts[action.toLowerCase() === 'create' ? 'created' : action.toLowerCase() === 'update' ? 'updated' : 'unchanged']++; changes.push({ action: action, studentId: current ? current.id : student.id || '', email: student.email }); });
  return { counts: counts, changes: changes };
}
function sisRosterRevision_(book) { var projection = students_(book).map(function(student) { return { id: student.id, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, email: student.email, active: student.active, updatedAt: student.updatedAt }; }).sort(function(left, right) { return left.email < right.email ? -1 : left.email > right.email ? 1 : 0; }); return hash_(stableJson_(projection)); }
function sameStudentRoster_(left, right) { return left.firstName === right.firstName && left.lastInitial === right.lastInitial && left.grade === right.grade && left.homeroom === right.homeroom && left.email === right.email && left.active === true; }
function sisImports_(book) { return rows_(sheet_(book, 'SisImports'), 11).map(function(row) { return { id: String(row[0] || ''), snapshotId: String(row[1] || ''), formatVersion: String(row[2] || ''), contentHash: String(row[3] || ''), createdCount: number_(row[4]), updatedCount: number_(row[5]), unchangedCount: number_(row[6]), status: String(row[7] || ''), appliedAt: cell_(row[8]), actorHash: String(row[9] || ''), createdAt: cell_(row[10]) }; }); }
function sisImportBySnapshotId_(book, snapshotId) { var list = sisImports_(book); for (var i = 0; i < list.length; i++) if (list[i].snapshotId === snapshotId) return list[i]; return null; }
function upsertSisImportRow_(book, item) { upsert_(sheet_(book, 'SisImports'), 11, item.id, safeRow_([item.id, item.snapshotId, item.formatVersion, item.contentHash, item.createdCount, item.updatedCount, item.unchangedCount, item.status, item.appliedAt, item.actorHash, item.createdAt])); }

function categories_(book) { return rows_(sheet_(book, 'Categories'), 9).map(function(row) { return { id: String(row[0] || ''), name: String(row[1] || ''), description: String(row[2] || ''), framework: String(row[3] || ''), color: String(row[4] || ''), active: bool_(row[5]), sortOrder: number_(row[6]), createdAt: cell_(row[7]), updatedAt: cell_(row[8]) }; }).sort(function(a, b) { return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name); }); }
function normalizeCategory_(value) { value = object_(value); var framework = text_(value.framework, 30, 'CUSTOM').toUpperCase(); if (framework !== 'HOWL' && framework !== 'CUSTOM') framework = 'CUSTOM'; var color = text_(value.color, 20, '#6046b6'); if (!/^#[0-9a-f]{6}$/i.test(color)) throw srError_('bad_category', 'Category color must be a six-digit hex color.'); return { id: text_(value.id, 80, ''), name: text_(value.name, 80, ''), description: text_(value.description, 300, ''), framework: framework, color: color, active: value.active !== false, sortOrder: integer_(value.sortOrder == null ? 100 : value.sortOrder, 0, 10000, 'Sort order') }; }
function upsertCategoryRow_(book, value) { if (!value.name) throw srError_('bad_category', 'Category name is required.'); var existing = categories_(book), categoryId = value.id || uuid_(), createdAt = now_(); existing.forEach(function(old) { if (old.id === categoryId) createdAt = old.createdAt || createdAt; }); var saved = { id: categoryId, name: value.name, description: value.description, framework: value.framework, color: value.color, active: value.active, sortOrder: value.sortOrder, createdAt: createdAt, updatedAt: now_() }; upsert_(sheet_(book, 'Categories'), 9, categoryId, safeRow_([saved.id, saved.name, saved.description, saved.framework, saved.color, saved.active, saved.sortOrder, saved.createdAt, saved.updatedAt])); return saved; }
function requireCategory_(book, categoryId) { var list = categories_(book); for (var i = 0; i < list.length; i++) if (list[i].id === categoryId && list[i].active) return list[i]; throw srError_('not_found', 'Active recognition category was not found.'); }
function seedHowlCategories_(book) { [
  ['Responsibility', 'Follows through, prepares, and takes ownership of choices.', '#2563eb'],
  ['Collaboration', 'Contributes, listens, and helps a group learn together.', '#0f766e'],
  ['Perseverance', 'Keeps working, seeks strategies, and responds to challenge.', '#b45309'],
  ['Craftsmanship', 'Uses feedback and care to improve the quality of work.', '#7c3aed'],
  ['Reflection', 'Notices growth, names next steps, and learns from experience.', '#be185d']
].forEach(function(item, index) { upsertCategoryRow_(book, normalizeCategory_({ name: item[0], description: item[1], framework: 'HOWL', color: item[2], sortOrder: (index + 1) * 10 })); }); }
function normalizeLevelThresholds_(value) { var raw = Array.isArray(value) ? value : String(value == null ? '' : value).split(','); var clean = raw.map(Number).filter(function(number) { return isFinite(number) && Math.floor(number) === number && number >= 0 && number <= 100000; }).sort(function(a, b) { return a - b; }).filter(function(number, index, all) { return !index || number !== all[index - 1]; }); if (!clean.length || clean[0] !== 0) clean.unshift(0); if (clean.length < 2) clean = [0, 25, 75, 150, 300]; return clean.slice(0, 10); }
function categoryProgress_(book, studentId, categories, config) {
  var totals = {}, thresholds = normalizeLevelThresholds_(config.levelThresholds), levelNames = ['Starting', 'Growing', 'Practicing', 'Leading', 'Flourishing'];
  categories.forEach(function(category) { totals[category.id] = 0; });
  ledger_(book).forEach(function(entry) { if (entry.studentId === studentId && entry.categoryId && (entry.kind === 'EARN' || entry.kind === 'REVERSAL')) totals[entry.categoryId] = Math.max(0, (totals[entry.categoryId] || 0) + entry.amount); });
  return categories.map(function(category) {
    var points = totals[category.id] || 0, level = 0;
    thresholds.forEach(function(threshold, index) { if (points >= threshold) level = index; });
    var current = thresholds[level], next = level + 1 < thresholds.length ? thresholds[level + 1] : null;
    return { categoryId: category.id, name: category.name, description: category.description, framework: category.framework, color: category.color, active: category.active, points: points, level: level, levelName: levelNames[level] || ('Level ' + (level + 1)), currentThreshold: current, nextThreshold: next, pointsToNext: next == null ? null : Math.max(0, next - points) };
  }).filter(function(item) { return item.active || item.points > 0; });
}

function printModels_(book) {
  return rows_(sheet_(book, 'PrintModels'), 31).map(function(row) { return {
    id: String(row[0] || ''), ownerStudentId: String(row[1] || ''), familyId: String(row[2] || ''), version: number_(row[3]), previousVersionId: String(row[4] || ''), remixOfModelId: String(row[5] || ''),
    title: String(row[6] || ''), description: String(row[7] || ''), sourceFormat: String(row[8] || ''), originalFileId: String(row[9] || ''), previewFileId: String(row[10] || ''), printableFileId: String(row[11] || ''),
    contentHash: String(row[12] || ''), byteSize: number_(row[13]), triangleCount: number_(row[14]), widthMm: number_(row[15]), depthMm: number_(row[16]), heightMm: number_(row[17]), unitDeclaration: String(row[18] || ''),
    clientPreflightStatus: String(row[19] || ''), clientPreflightJson: String(row[20] || ''), aiUse: String(row[21] || ''), aiDisclosure: String(row[22] || ''), publicationStatus: String(row[23] || ''),
    catalogTitle: String(row[24] || ''), catalogDescription: String(row[25] || ''), creatorLabel: String(row[26] || ''), reusePolicy: String(row[27] || ''), moderationReason: String(row[28] || ''), createdAt: cell_(row[29]), updatedAt: cell_(row[30])
  }; });
}
function printModelById_(book, modelId) { var list = printModels_(book); for (var i = 0; i < list.length; i++) if (list[i].id === modelId) return list[i]; return null; }
function requirePrintModel_(book, modelId) { var model = printModelById_(book, modelId); if (!model) throw srError_('not_found', 'Print model was not found.'); return model; }
function assertPrintModelCapacity_(book, studentId) {
  var count = 0; printModels_(book).forEach(function(model) { if (model.ownerStudentId === studentId) count++; });
  if (count >= SR_MAX_PRINT_MODELS_PER_STUDENT) throw srError_('print_quota', 'This student has reached the Print Lab model limit. Ask a school administrator to review archived work.');
}
function upsertPrintModelRow_(book, model) { upsert_(sheet_(book, 'PrintModels'), 31, model.id, safeRow_([model.id, model.ownerStudentId, model.familyId, model.version, model.previousVersionId, model.remixOfModelId, model.title, model.description, model.sourceFormat, model.originalFileId, model.previewFileId, model.printableFileId, model.contentHash, model.byteSize, model.triangleCount, model.widthMm, model.depthMm, model.heightMm, model.unitDeclaration, model.clientPreflightStatus, model.clientPreflightJson, model.aiUse, model.aiDisclosure, model.publicationStatus, model.catalogTitle, model.catalogDescription, model.creatorLabel, model.reusePolicy, model.moderationReason, model.createdAt, model.updatedAt])); }
function printModelDto_(model, audience) {
  var title = audience === 'community' ? (model.catalogTitle || model.title) : model.title;
  var description = audience === 'community' ? (model.catalogDescription || model.description) : model.description;
  var assetStatus = printModelReadyForQuote_(model) ? 'READY' : model.clientPreflightStatus === 'ASSET_PENDING_REVIEW' ? 'PENDING_REVIEW' : model.clientPreflightStatus === 'ASSET_REJECTED' ? 'REJECTED' : 'HANDOFF_REQUIRED';
  if (audience === 'community') return { id: model.id, familyId: model.familyId, version: model.version, title: title, description: description, sourceFormat: model.sourceFormat, triangleCount: model.triangleCount, dimensionsMm: { width: model.widthMm, depth: model.depthMm, height: model.heightMm }, aiUse: model.aiUse, publicationStatus: model.publicationStatus, creatorLabel: model.creatorLabel, reusePolicy: model.reusePolicy, assetStatus: assetStatus, createdAt: model.createdAt, updatedAt: model.updatedAt };
  var dto = { id: model.id, familyId: model.familyId, version: model.version, previousVersionId: model.previousVersionId, remixOfModelId: model.remixOfModelId, title: title, description: description, sourceFormat: model.sourceFormat, contentHash: model.contentHash, byteSize: model.byteSize, triangleCount: model.triangleCount, dimensionsMm: { width: model.widthMm, depth: model.depthMm, height: model.heightMm }, unitDeclaration: model.unitDeclaration, clientPreflightStatus: model.clientPreflightStatus, aiUse: model.aiUse, aiDisclosure: model.aiDisclosure, publicationStatus: model.publicationStatus, creatorLabel: model.creatorLabel, reusePolicy: model.reusePolicy, assetStatus: assetStatus, createdAt: model.createdAt, updatedAt: model.updatedAt };
  if (audience === 'owner') dto.clientPreflightJson = model.clientPreflightJson;
  if (audience === 'staff') { dto.ownerStudentId = model.ownerStudentId; dto.clientPreflightJson = model.clientPreflightJson; dto.moderationReason = model.moderationReason; }
  return dto;
}
function normalizePrintModelInput_(book, value, studentId) {
  var sourceFormat = text_(value.sourceFormat, 12, '').toUpperCase();
  if (SR_PRINT_FORMATS.indexOf(sourceFormat) < 0) throw srError_('bad_model', 'Source format must be recipe, GLB, or STL.');
  var title = text_(value.title, 120, ''); if (!title) throw srError_('bad_model', 'Model title is required.');
  var previousVersionId = optionalId_(value.previousVersionId, 'previous model'), previous = previousVersionId ? requirePrintModel_(book, previousVersionId) : null;
  if (previous && previous.ownerStudentId !== studentId) throw srError_('denied', 'A student can version only their own model.');
  var remixOfModelId = optionalId_(value.remixOfModelId, 'remix model'), remix = remixOfModelId ? requirePrintModel_(book, remixOfModelId) : null;
  if (remix && remix.ownerStudentId !== studentId && (remix.publicationStatus !== 'PUBLISHED' || remix.sourceFormat !== 'RECIPE' || remix.reusePolicy !== 'SCHOOL_REMIX_PRINT')) throw srError_('remix_denied', 'Only a published recipe model with school remix permission can be remixed.');
  var aiUse = text_(value.aiUse, 20, 'NONE').toUpperCase(); if (SR_PRINT_AI_USE.indexOf(aiUse) < 0) throw srError_('bad_model', 'AI use must be none, assisted, or mostly AI.');
  var preflight = value.clientPreflight && typeof value.clientPreflight === 'object' ? stableJson_(value.clientPreflight) : text_(value.clientPreflightJson, 20000, '');
  if (preflight.length > 20000) throw srError_('bad_model', 'Preflight summary is too large.');
  var normalized = { sourceFormat: sourceFormat, title: title, description: text_(value.description, 1000, ''), previousVersionId: previousVersionId, remixOfModelId: remixOfModelId, familyId: previous ? previous.familyId : '', version: previous ? previous.version + 1 : 1, aiUse: aiUse, aiDisclosure: text_(value.aiDisclosure, 500, ''), widthMm: boundedNumber_(value.widthMm, 0.1, 1000, 'Model width'), depthMm: boundedNumber_(value.depthMm, 0.1, 1000, 'Model depth'), heightMm: boundedNumber_(value.heightMm, 0.1, 1000, 'Model height'), triangleCount: integer_(value.triangleCount == null ? 0 : value.triangleCount, 0, 2000000, 'Triangle count'), clientPreflightJson: preflight };
  if (sourceFormat === 'RECIPE') {
    var recipe = normalizePrintRecipe_(value.recipe), recipeJson = stableJson_(recipe);
    normalized.recipeJson = recipeJson; normalized.contentHash = hash_(recipeJson); normalized.byteSize = recipeJson.length;
    normalized.unitDeclaration = text_(value.unitDeclaration, 40, 'RECIPE_MM'); normalized.clientPreflightStatus = text_(value.clientPreflightStatus, 30, 'UNKNOWN').toUpperCase();
  } else {
    var suppliedHash = text_(value.contentHash, 100, '');
    if (!/^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{43})$/i.test(suppliedHash)) throw srError_('bad_model', 'GLB/STL handoff requires a SHA-256 content hash.');
    normalized.contentHash = suppliedHash; normalized.byteSize = integer_(value.byteSize, 1, SR_MAX_PRINT_ASSET_BYTES, 'Asset byte size');
    normalized.unitDeclaration = text_(value.unitDeclaration, 40, sourceFormat === 'GLB' ? 'GLB_METERS' : '');
    if (!normalized.unitDeclaration) throw srError_('bad_model', 'STL handoff requires a confirmed unit declaration.');
    normalized.clientPreflightStatus = 'HANDOFF_REQUIRED';
  }
  normalized.idempotencyPayload = { studentId: studentId, title: normalized.title, description: normalized.description, sourceFormat: normalized.sourceFormat, previousVersionId: normalized.previousVersionId, remixOfModelId: normalized.remixOfModelId, contentHash: normalized.contentHash, byteSize: normalized.byteSize, triangleCount: normalized.triangleCount, widthMm: normalized.widthMm, depthMm: normalized.depthMm, heightMm: normalized.heightMm, unitDeclaration: normalized.unitDeclaration, clientPreflightJson: normalized.clientPreflightJson, aiUse: normalized.aiUse, aiDisclosure: normalized.aiDisclosure };
  return normalized;
}
function normalizePrintRecipe_(value) {
  value = object_(value); var raw = Array.isArray(value.parts) ? value.parts : [];
  if (!raw.length || raw.length > 24) throw srError_('bad_model', 'A printable recipe must contain between 1 and 24 parts.');
  var shapes = { box: 1, sphere: 1, cylinder: 1, cone: 1, torus: 1 }, parts = [];
  raw.forEach(function(part) {
    part = object_(part); var shape = text_(part.shape, 20, '').toLowerCase(); if (!shapes[shape]) throw srError_('bad_model', 'Recipe contains an unsupported shape.');
    var sizes = shape === 'box' ? 3 : shape === 'sphere' ? 1 : 2;
    parts.push({ shape: shape, size: normalizeNumberArray_(part.size, sizes, 0.02, 4, 'Part size'), position: normalizeNumberArray_(part.position, 3, -8, 8, 'Part position'), rotation: normalizeNumberArray_(part.rotation, 3, -360, 360, 'Part rotation'), color: printColor_(part.color) });
  });
  return { version: 'p3d/1', name: text_(value.name, 80, ''), parts: parts, scale: boundedNumber_(value.scale == null ? 1 : value.scale, 0.25, 5, 'Recipe scale'), rotY: boundedNumber_(value.rotY == null ? 0 : value.rotY, -360, 360, 'Recipe rotation'), tint: value.tint ? printColor_(value.tint) : null };
}
function normalizeNumberArray_(value, length, min, max, label) { var raw = Array.isArray(value) ? value : [], out = []; for (var i = 0; i < length; i++) out.push(boundedNumber_(raw[i] == null ? 0 : raw[i], min, max, label)); return out; }
function printColor_(value) { var color = text_(value, 20, '#64748b'); if (!/^#[0-9a-f]{6}$/i.test(color)) throw srError_('bad_model', 'Recipe colors must be six-digit hex values.'); return color.toLowerCase(); }
function printModelReadyForQuote_(model) { return !!model.printableFileId || (model.sourceFormat === 'RECIPE' && !!model.originalFileId); }
function printFolder_() { var props = PropertiesService.getScriptProperties(), id = props.getProperty('SR_PRINT_FOLDER_ID'); if (id) return DriveApp.getFolderById(id); var parent = DriveApp.getFolderById(props.getProperty('SR_FOLDER_ID')), folder = parent.createFolder('Print Models'); setPrivate_(folder); props.setProperty('SR_PRINT_FOLDER_ID', folder.getId()); return folder; }
function storePrintRecipe_(modelId, recipeJson) { var file = printFolder_().createFile(modelId + '.json', recipeJson, 'application/json'); setPrivate_(file); return file.getId(); }
function loadPrintRecipe_(model) { if (!model.originalFileId) throw srError_('asset_missing', 'The private recipe asset is unavailable.'); try { return JSON.parse(DriveApp.getFileById(model.originalFileId).getBlob().getDataAsString('UTF-8')); } catch (_) { throw srError_('asset_invalid', 'The private recipe asset could not be read.'); } }

function printAssetFolder_() { var props = PropertiesService.getScriptProperties(), id = props.getProperty('SR_PRINT_ASSET_FOLDER_ID'); if (id) return DriveApp.getFolderById(id); var folder = printFolder_().createFolder('Imported Assets - Private Review'); setPrivate_(folder); props.setProperty('SR_PRINT_ASSET_FOLDER_ID', folder.getId()); return folder; }
function printAssets_(book) { return rows_(sheet_(book, 'PrintAssets'), 15).map(function(row) { return { id: String(row[0] || ''), modelId: String(row[1] || ''), ownerStudentId: String(row[2] || ''), fileName: String(row[3] || ''), sourceFormat: String(row[4] || ''), mimeType: String(row[5] || ''), contentHash: String(row[6] || ''), byteSize: number_(row[7]), driveFileId: String(row[8] || ''), status: String(row[9] || ''), reviewReason: String(row[10] || ''), uploadedAt: cell_(row[11]), reviewedAt: cell_(row[12]), reviewedByHash: String(row[13] || ''), updatedAt: cell_(row[14]) }; }); }
function assertPrintAssetCapacity_(book, studentId, incomingBytes, at) {
  var count = 0, totalBytes = 0, uploadsToday = 0, day = String(at || '').slice(0, 10);
  printAssets_(book).forEach(function(asset) {
    if (asset.ownerStudentId !== studentId) return;
    count++; totalBytes += asset.byteSize;
    if (String(asset.uploadedAt || '').slice(0, 10) === day) uploadsToday++;
  });
  if (count >= SR_MAX_PRINT_ASSETS_PER_STUDENT) throw srError_('print_quota', 'This student has reached the Print Lab asset limit. Ask a school administrator to review stored files.');
  if (totalBytes + incomingBytes > SR_MAX_PRINT_ASSET_BYTES_PER_STUDENT) throw srError_('print_quota', 'This upload would exceed the student Print Lab storage limit.');
  if (uploadsToday >= SR_MAX_PRINT_ASSET_UPLOADS_PER_STUDENT_PER_DAY) throw srError_('print_quota', 'This student has reached today\'s Print Lab upload limit. Try again tomorrow or ask a school administrator.');
}
function printAssetById_(book, assetId) { var list = printAssets_(book); for (var i = 0; i < list.length; i++) if (list[i].id === assetId) return list[i]; return null; }
function requirePrintAsset_(book, assetId) { var asset = printAssetById_(book, assetId); if (!asset) throw srError_('not_found', 'Print asset was not found.'); return asset; }
function upsertPrintAssetRow_(book, asset) { if (SR_PRINT_ASSET_STATES.indexOf(asset.status) < 0) throw srError_('bad_state', 'Print asset state is invalid.'); upsert_(sheet_(book, 'PrintAssets'), 15, asset.id, safeRow_([asset.id, asset.modelId, asset.ownerStudentId, asset.fileName, asset.sourceFormat, asset.mimeType, asset.contentHash, asset.byteSize, asset.driveFileId, asset.status, asset.reviewReason, asset.uploadedAt, asset.reviewedAt, asset.reviewedByHash, asset.updatedAt])); }
function printAssetDto_(asset) { return { id: asset.id, modelId: asset.modelId, fileName: asset.fileName, sourceFormat: asset.sourceFormat, mimeType: asset.mimeType, contentHash: asset.contentHash, byteSize: asset.byteSize, status: asset.status === 'PENDING' ? 'PENDING_REVIEW' : asset.status, reviewReason: asset.reviewReason, uploadedAt: asset.uploadedAt, reviewedAt: asset.reviewedAt, updatedAt: asset.updatedAt }; }
function printAssetFileName_(value) { var name = text_(value, 160, ''); if (!name || name.charAt(0) === '.' || name.indexOf('..') >= 0 || /[\\/:*?"<>|]/.test(name) || !/^[A-Za-z0-9][A-Za-z0-9._ ()-]*\.(?:glb|stl)$/i.test(name)) throw srError_('bad_asset', 'Use a simple .glb or .stl filename without a path.'); return name; }
function validatePrintAssetMetadata_(model, fileName, mimeType, suppliedHash) {
  var extension = fileName.slice(fileName.lastIndexOf('.') + 1).toUpperCase(); if (extension !== model.sourceFormat) throw srError_('bad_asset', 'The filename extension must match the model source format.');
  var allowed = model.sourceFormat === 'GLB' ? { 'model/gltf-binary': 1, 'application/octet-stream': 1 } : { 'model/stl': 1, 'application/sla': 1, 'application/vnd.ms-pki.stl': 1, 'application/octet-stream': 1 };
  if (!allowed[mimeType]) throw srError_('bad_asset', 'The uploaded MIME type is not allowed for this model format.');
  if (!/^(?:[a-f0-9]{64}|[A-Za-z0-9_-]{43})$/i.test(suppliedHash)) throw srError_('bad_asset', 'A SHA-256 content hash is required.');
}
function decodePrintAssetBase64_(encoded) {
  var maxEncoded = Math.ceil(SR_MAX_PRINT_ASSET_BYTES / 3) * 4 + 4;
  if (!encoded || encoded.length > maxEncoded || !/^(?:[A-Za-z0-9+/]*={0,2}|[A-Za-z0-9_-]+)$/.test(encoded)) throw srError_('bad_asset', 'The asset must be valid base64 within the 4 MiB upload limit.');
  var bytes; try { bytes = encoded.indexOf('-') >= 0 || encoded.indexOf('_') >= 0 ? Utilities.base64DecodeWebSafe(encoded) : Utilities.base64Decode(encoded); } catch (_) { throw srError_('bad_asset', 'The asset base64 could not be decoded.'); }
  if (!bytes || !bytes.length || bytes.length > SR_MAX_PRINT_ASSET_BYTES) throw srError_('bad_asset', 'The decoded asset must be between 1 byte and 4 MiB.');
  return bytes;
}
function sha256Bytes_(bytes) { var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes), hex = ''; for (var i = 0; i < digest.length; i++) hex += ('0' + ((Number(digest[i]) + 256) % 256).toString(16)).slice(-2); return { hex: hex, base64url: Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '') }; }
function sameSha256_(value, digests) { return /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() === digests.hex : value === digests.base64url; }
function sameContentHash_(left, right) { if (/^[a-f0-9]{64}$/i.test(left) && /^[a-f0-9]{64}$/i.test(right)) return left.toLowerCase() === right.toLowerCase(); return String(left) === String(right); }
function byte_(value) { return (Number(value) + 256) % 256; }
function uint32Le_(bytes, offset) { return byte_(bytes[offset]) + byte_(bytes[offset + 1]) * 256 + byte_(bytes[offset + 2]) * 65536 + byte_(bytes[offset + 3]) * 16777216; }
function startsWithAscii_(bytes, text) { for (var i = 0; i < text.length; i++) if (byte_(bytes[i]) !== text.charCodeAt(i)) return false; return true; }
function containsAscii_(bytes, text) { outer: for (var i = 0; i <= bytes.length - text.length; i++) { for (var j = 0; j < text.length; j++) if (byte_(bytes[i + j]) !== text.charCodeAt(j)) continue outer; return true; } return false; }
function endsWithAsciiIgnoringWhitespace_(bytes, text) { var end = bytes.length - 1; while (end >= 0 && [9, 10, 13, 32].indexOf(byte_(bytes[end])) >= 0) end--; var start = end - text.length + 1; if (start < 0) return false; for (var i = 0; i < text.length; i++) { var value = byte_(bytes[start + i]), expected = text.charCodeAt(i); if (value >= 65 && value <= 90) value += 32; if (value !== expected) return false; } return true; }
function validatePrintAssetMagic_(format, bytes) {
  if (format === 'GLB') {
    if (bytes.length < 12 || !startsWithAscii_(bytes, 'glTF') || uint32Le_(bytes, 4) !== 2 || uint32Le_(bytes, 8) !== bytes.length) throw srError_('bad_asset', 'The file is not a structurally valid GLB 2 container.');
    return;
  }
  var binary = bytes.length >= 84 && 84 + uint32Le_(bytes, 80) * 50 === bytes.length;
  var ascii = startsWithAscii_(bytes, 'solid') && containsAscii_(bytes, 'facet') && containsAscii_(bytes, 'vertex') && endsWithAsciiIgnoringWhitespace_(bytes, 'endsolid');
  if (!binary && !ascii) throw srError_('bad_asset', 'The file is not a recognized binary or ASCII STL container.');
}

function printPublications_(book) { return rows_(sheet_(book, 'PrintPublications'), 15).map(function(row) { return { id: String(row[0] || ''), modelId: String(row[1] || ''), ownerStudentId: String(row[2] || ''), status: String(row[3] || ''), catalogTitle: String(row[4] || ''), catalogDescription: String(row[5] || ''), creatorLabel: String(row[6] || ''), reusePolicy: String(row[7] || ''), consentVersion: String(row[8] || ''), consentAt: cell_(row[9]), moderationReason: String(row[10] || ''), submittedAt: cell_(row[11]), reviewedAt: cell_(row[12]), updatedAt: cell_(row[13]), reportCount: number_(row[14]) }; }); }
function printPublicationById_(book, publicationId) { var list = printPublications_(book); for (var i = 0; i < list.length; i++) if (list[i].id === publicationId) return list[i]; return null; }
function requirePrintPublication_(book, publicationId) { var item = printPublicationById_(book, publicationId); if (!item) throw srError_('not_found', 'Print publication was not found.'); return item; }
function latestPrintPublicationForModel_(book, modelId) { var list = printPublications_(book); for (var i = list.length - 1; i >= 0; i--) if (list[i].modelId === modelId) return list[i]; return null; }
function requireLatestPrintPublicationForModel_(book, modelId) { var item = latestPrintPublicationForModel_(book, modelId); if (!item) throw srError_('not_found', 'Print publication was not found.'); return item; }
function upsertPrintPublicationRow_(book, item) { if (SR_PRINT_PUBLICATION_STATES.indexOf(item.status) < 0 || item.status === 'PRIVATE') throw srError_('bad_state', 'Print publication state is invalid.'); upsert_(sheet_(book, 'PrintPublications'), 15, item.id, safeRow_([item.id, item.modelId, item.ownerStudentId, item.status, item.catalogTitle, item.catalogDescription, item.creatorLabel, item.reusePolicy, item.consentVersion, item.consentAt, item.moderationReason, item.submittedAt, item.reviewedAt, item.updatedAt, item.reportCount])); }
function printPublicationDto_(item) { return { id: item.id, modelId: item.modelId, status: item.status, catalogTitle: item.catalogTitle, catalogDescription: item.catalogDescription, creatorLabel: item.creatorLabel, reusePolicy: item.reusePolicy, consentVersion: item.consentVersion, consentAt: item.consentAt, moderationReason: item.moderationReason, submittedAt: item.submittedAt, reviewedAt: item.reviewedAt, updatedAt: item.updatedAt, reportCount: item.reportCount }; }

function emptyPrintRequest_() { return { id: '', studentId: '', modelId: '', modelHash: '', windowId: '', status: '', requestedMaterialId: '', approvedMaterialId: '', printerProfileId: '', quantity: 1, quotePoints: 0, quoteExpiresAt: '', estimatedGrams: 0, estimatedMinutes: 0, preflightDecision: '', preflightSummary: '', holdId: '', orderId: '', revisionNumber: 1, studentNote: '', staffReason: '', createdAt: '', submittedAt: '', reviewedAt: '', confirmedAt: '', queuedAt: '', printingAt: '', readyAt: '', fulfilledAt: '', closedAt: '', updatedAt: '', previousRequestId: '' }; }
function printRequests_(book) { return rows_(sheet_(book, 'PrintRequests'), 32).map(function(row) { return { id: String(row[0] || ''), studentId: String(row[1] || ''), modelId: String(row[2] || ''), modelHash: String(row[3] || ''), windowId: String(row[4] || ''), status: String(row[5] || ''), requestedMaterialId: String(row[6] || ''), approvedMaterialId: String(row[7] || ''), printerProfileId: String(row[8] || ''), quantity: number_(row[9]), quotePoints: number_(row[10]), quoteExpiresAt: cell_(row[11]), estimatedGrams: number_(row[12]), estimatedMinutes: number_(row[13]), preflightDecision: String(row[14] || ''), preflightSummary: String(row[15] || ''), holdId: String(row[16] || ''), orderId: String(row[17] || ''), revisionNumber: number_(row[18]), studentNote: String(row[19] || ''), staffReason: String(row[20] || ''), createdAt: cell_(row[21]), submittedAt: cell_(row[22]), reviewedAt: cell_(row[23]), confirmedAt: cell_(row[24]), queuedAt: cell_(row[25]), printingAt: cell_(row[26]), readyAt: cell_(row[27]), fulfilledAt: cell_(row[28]), closedAt: cell_(row[29]), updatedAt: cell_(row[30]), previousRequestId: String(row[31] || '') }; }); }
function printRequestById_(book, requestId) { var list = printRequests_(book); for (var i = 0; i < list.length; i++) if (list[i].id === requestId) return list[i]; return null; }
function requirePrintRequest_(book, requestId) { var item = printRequestById_(book, requestId); if (!item) throw srError_('not_found', 'Print request was not found.'); return item; }
function printRequestByOrderId_(book, orderId) { var list = printRequests_(book); for (var i = 0; i < list.length; i++) if (list[i].orderId === orderId || (list[i].id === orderId && ['FULFILLING', 'FULFILLED', 'REFUNDING', 'REFUNDED'].indexOf(list[i].status) >= 0)) return list[i]; return null; }
function upsertPrintRequestRow_(book, item) { if (SR_PRINT_REQUEST_STATES.indexOf(item.status) < 0) throw srError_('bad_state', 'Print request state is invalid.'); upsert_(sheet_(book, 'PrintRequests'), 32, item.id, safeRow_([item.id, item.studentId, item.modelId, item.modelHash, item.windowId, item.status, item.requestedMaterialId, item.approvedMaterialId, item.printerProfileId, item.quantity, item.quotePoints, item.quoteExpiresAt, item.estimatedGrams, item.estimatedMinutes, item.preflightDecision, item.preflightSummary, item.holdId, item.orderId, item.revisionNumber, item.studentNote, item.staffReason, item.createdAt, item.submittedAt, item.reviewedAt, item.confirmedAt, item.queuedAt, item.printingAt, item.readyAt, item.fulfilledAt, item.closedAt, item.updatedAt, item.previousRequestId || ''])); }
function printRequestDto_(item) { return { id: item.id, studentId: item.studentId, modelId: item.modelId, modelHash: item.modelHash, windowId: item.windowId, status: item.status, requestedMaterialId: item.requestedMaterialId, approvedMaterialId: item.approvedMaterialId, printerProfileId: item.printerProfileId, quantity: item.quantity, quotePoints: item.quotePoints, quoteExpiresAt: item.quoteExpiresAt, estimatedGrams: item.estimatedGrams, estimatedMinutes: item.estimatedMinutes, preflightDecision: item.preflightDecision, preflightSummary: item.preflightSummary, holdId: item.holdId, orderId: item.orderId, revisionNumber: item.revisionNumber, previousRequestId: item.previousRequestId || '', studentNote: item.studentNote, staffReason: item.staffReason, submittedAt: item.submittedAt, reviewedAt: item.reviewedAt, confirmedAt: item.confirmedAt, queuedAt: item.queuedAt, printingAt: item.printingAt, readyAt: item.readyAt, fulfilledAt: item.fulfilledAt, closedAt: item.closedAt, updatedAt: item.updatedAt }; }

function pointHolds_(book) { return rows_(sheet_(book, 'PointHolds'), 14).map(function(row) { return { id: String(row[0] || ''), studentId: String(row[1] || ''), purposeType: String(row[2] || ''), purposeId: String(row[3] || ''), amount: number_(row[4]), status: String(row[5] || ''), expiresAt: cell_(row[6]), idempotencyKey: String(row[7] || ''), captureLedgerId: String(row[8] || ''), createdAt: cell_(row[9]), updatedAt: cell_(row[10]), capturedAt: cell_(row[11]), releasedAt: cell_(row[12]), releaseReason: String(row[13] || '') }; }); }
function pointHoldById_(book, holdId) { var list = pointHolds_(book); for (var i = 0; i < list.length; i++) if (list[i].id === holdId) return list[i]; return null; }
function pointHoldForPurpose_(book, type, purposeId) { var list = pointHolds_(book); for (var i = list.length - 1; i >= 0; i--) if (list[i].purposeType === type && list[i].purposeId === purposeId) return list[i]; return null; }
function upsertPointHoldRow_(book, hold) { if (SR_POINT_HOLD_STATES.indexOf(hold.status) < 0) throw srError_('bad_state', 'Point hold state is invalid.'); upsert_(sheet_(book, 'PointHolds'), 14, hold.id, safeRow_([hold.id, hold.studentId, hold.purposeType, hold.purposeId, hold.amount, hold.status, hold.expiresAt, hold.idempotencyKey, hold.captureLedgerId, hold.createdAt, hold.updatedAt, hold.capturedAt, hold.releasedAt, hold.releaseReason])); }
function pointHoldDto_(hold) { return { id: hold.id, studentId: hold.studentId, purposeType: hold.purposeType, purposeId: hold.purposeId, amount: hold.amount, status: hold.status, expiresAt: hold.expiresAt, capturedAt: hold.capturedAt, releasedAt: hold.releasedAt, releaseReason: hold.releaseReason }; }
function activePointHoldForRequest_(book, item) { var hold = item.holdId ? pointHoldById_(book, item.holdId) : null; return hold && hold.status === 'ACTIVE' && hold.purposeType === 'PRINT_REQUEST' && hold.purposeId === item.id && hold.studentId === item.studentId && hold.amount === item.quotePoints ? hold : null; }
function pointAvailability_(book, studentId, balanceMap, holds) { var row = balanceMap && balanceMap[studentId] ? balanceMap[studentId] : balance_(book, studentId), reserved = 0; (holds || pointHolds_(book)).forEach(function(hold) { if (hold.studentId === studentId && hold.status === 'ACTIVE') reserved += hold.amount; }); var available = row.balance - reserved; if (available < 0) throw srError_('reconciliation', 'Active point reservations exceed the ledger balance.'); return { studentId: studentId, balance: row.balance, reservedPoints: reserved, availableBalance: available }; }
function printReservationResult_(book, item, hold) { var availability = pointAvailability_(book, item.studentId); return { ok: true, request: printRequestDto_(item), hold: pointHoldDto_(hold), balance: availability.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance }; }

function spendForPrintRequest_(book, requestId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].kind === 'SPEND' && list[i].referenceType === 'print_request' && list[i].referenceId === requestId) return list[i]; return null; }
function refundForPrintRequest_(book, requestId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].kind === 'REFUND' && list[i].referenceType === 'print_request_refund' && list[i].referenceId === requestId) return list[i]; return null; }
function rebuildBalanceFromLedger_(book, studentId) { var earned = 0, spent = 0; ledger_(book).forEach(function(entry) { if (entry.studentId !== studentId) return; if (entry.kind === 'EARN' || entry.kind === 'REVERSAL') earned += entry.amount; else if (entry.kind === 'SPEND') spent += -entry.amount; else if (entry.kind === 'REFUND') spent -= entry.amount; }); if (earned < 0 || spent < 0 || earned - spent < 0) throw srError_('reconciliation', 'The ledger cannot produce a valid student balance.'); var value = { studentId: studentId, earned: earned, spent: spent, balance: earned - spent, updatedAt: now_() }; upsert_(sheet_(book, 'Balances'), 5, studentId, safeRow_([studentId, value.earned, value.spent, value.balance, value.updatedAt])); return value; }
function sendOrderReceiptOnce_(book, student, order, availableBalance, kind) {
  var movement = kind === 'REFUND' ? order.total : -order.total, sent = sentReceiptForOrder_(book, order.id, kind);
  if (sent) return { id: sent.id, kind: kind, status: sent.status, sentAt: sent.sentAt, points: movement };
  var previous = latestReceiptForOrder_(book, order.id, kind);
  if (previous) return { id: previous.id, kind: kind, status: previous.status === 'PENDING' || previous.status === 'UNKNOWN' ? 'UNKNOWN' : previous.status, sentAt: previous.sentAt, points: movement };
  return sendOrderReceipt_(book, student, order, availableBalance, kind);
}

function printIdemOperation_(base, actor, payload) { return base + ':' + hash_(actor.email).slice(0, 12) + ':' + hash_(stableJson_(payload)).slice(0, 16); }
function stableJson_(value) { if (value == null) return 'null'; if (typeof value === 'number') return isFinite(value) ? String(value) : 'null'; if (typeof value === 'boolean') return value ? 'true' : 'false'; if (typeof value === 'string') return JSON.stringify(value); if (Array.isArray(value)) return '[' + value.map(stableJson_).join(',') + ']'; if (typeof value === 'object') return '{' + Object.keys(value).sort().map(function(key) { return JSON.stringify(key) + ':' + stableJson_(value[key]); }).join(',') + '}'; return 'null'; }
function boundedNumber_(value, min, max, label) { var number = Number(value); if (!isFinite(number) || number < min || number > max) throw srError_('bad_number', label + ' must be from ' + min + ' to ' + max + '.'); return number; }

function catalog_(book) { return rows_(sheet_(book, 'Catalog'), 11).map(function(row) { return { id: String(row[0] || ''), name: String(row[1] || ''), description: String(row[2] || ''), cost: number_(row[3]), inventoryLimit: number_(row[4]), remaining: number_(row[5]), active: bool_(row[6]), imageUrl: String(row[7] || ''), createdAt: cell_(row[8]), updatedAt: cell_(row[9]), inventoryVersion: number_(row[10]) }; }); }
function catalogById_(book, itemId) { var list = catalog_(book); for (var i = 0; i < list.length; i++) if (list[i].id === itemId) return list[i]; return null; }
function copyCatalogItem_(item) { return { id: item.id, name: item.name, description: item.description, cost: item.cost, inventoryLimit: item.inventoryLimit, remaining: item.remaining, active: item.active, imageUrl: item.imageUrl, createdAt: item.createdAt, updatedAt: item.updatedAt, inventoryVersion: item.inventoryVersion }; }
function normalizeCatalogRequest_(value) {
  value = object_(value);
  var nameProvided = value.name != null && value.name !== '', descriptionProvided = value.description != null;
  var costProvided = value.cost != null && value.cost !== '', activeProvided = value.active != null, imageUrlProvided = value.imageUrl != null;
  var limitProvided = value.inventoryLimit != null && value.inventoryLimit !== '';
  var remainingProvided = value.remaining != null && value.remaining !== '';
  var expectedProvided = value.expectedInventoryVersion != null && value.expectedInventoryVersion !== '';
  var limit = limitProvided ? integer_(value.inventoryLimit, -1, 100000, 'Inventory limit') : null;
  var remaining = remainingProvided ? integer_(value.remaining, -1, 100000, 'Remaining inventory') : null;
  if (remainingProvided && !limitProvided) throw srError_('bad_catalog', 'Inventory adjustments must include the explicit target inventory limit.');
  if (limitProvided && limit < 0 && remainingProvided && remaining !== -1) throw srError_('bad_catalog', 'Unlimited inventory must use -1 as its remaining value.');
  if (limitProvided && limit >= 0 && remainingProvided && (remaining < 0 || remaining > limit)) throw srError_('bad_catalog', 'Remaining inventory must be between zero and the target limit.');
  return {
    id: text_(value.id, 80, ''), name: nameProvided ? text_(value.name, 120, '') : null, nameProvided: nameProvided,
    description: descriptionProvided ? text_(value.description, 500, '') : null, descriptionProvided: descriptionProvided,
    cost: costProvided ? integer_(value.cost, 1, 100000, 'Cost') : null, costProvided: costProvided,
    inventoryLimit: limit, inventoryLimitProvided: limitProvided, remaining: remaining, remainingProvided: remainingProvided,
    active: activeProvided ? value.active !== false : null, activeProvided: activeProvided,
    imageUrl: imageUrlProvided ? httpsUrl_(value.imageUrl || '') : null, imageUrlProvided: imageUrlProvided,
    expectedInventoryVersion: expectedProvided ? integer_(value.expectedInventoryVersion, 0, 100000000, 'Expected inventory version') : null,
    inventoryTransition: text_(value.inventoryTransition, 30, '').toUpperCase(), reason: text_(value.reason, 180, '')
  };
}
function assertInventorySchemaReady_(book) {
  if (number_(configMap_(book).schemaVersion) < 5) throw srError_('inventory_migration_required', 'Run the School Rewards schema v5 inventory migration before changing or selling catalog items.');
}
function prepareCatalogIntent_(book, request, key, actor) {
  assertInventorySchemaReady_(book);
  var at = now_(), oldItem = request.id ? catalogById_(book, id_(request.id, 'catalog item')) : null;
  if (request.id && !oldItem) throw srError_('not_found', 'Store item was not found.');
  if (oldItem && oldItem.inventoryVersion < 1) throw srError_('inventory_migration_required', 'Run the School Rewards schema v5 inventory migration before editing this catalog item.');
  var oldTail = oldItem ? assertInventoryChainTailMatchesCatalog_(book, oldItem) : null;
  var mode, itemId, targetLimit, targetRemaining, targetVersion, createdAt, movements = [];
  if (!oldItem) {
    if (!request.nameProvided || !request.name || !request.costProvided) throw srError_('bad_catalog', 'New store items require a name and point cost.');
    if (request.expectedInventoryVersion != null || request.inventoryTransition) throw srError_('bad_catalog', 'New catalog items cannot include an existing-item version or inventory transition.');
    mode = 'CREATE'; itemId = operationEntityId_('catalog', key); targetLimit = request.inventoryLimitProvided ? request.inventoryLimit : -1;
    targetRemaining = targetLimit < 0 ? -1 : request.remainingProvided ? request.remaining : targetLimit;
    targetVersion = 1; createdAt = at;
    movements = [newInventoryMovementSpec_(itemId, 1, 'INITIALIZE', 0, targetLimit, targetRemaining, targetLimit, targetRemaining, 'catalog', itemId, actor, at, key, request.reason || 'Initial catalog inventory', 'GENESIS')];
  } else {
    itemId = oldItem.id; createdAt = oldItem.createdAt;
    targetLimit = request.inventoryLimitProvided ? request.inventoryLimit : oldItem.inventoryLimit;
    targetRemaining = request.remainingProvided ? request.remaining : oldItem.remaining;
    if (targetLimit < 0) {
      if (request.remainingProvided && targetRemaining !== -1) throw srError_('bad_catalog', 'Unlimited inventory must use -1 as its remaining value.');
      targetRemaining = -1;
    } else if (targetRemaining < 0 || targetRemaining > targetLimit) throw srError_('bad_catalog', 'Remaining inventory must be between zero and the target limit.');
    var changed = targetLimit !== oldItem.inventoryLimit || targetRemaining !== oldItem.remaining;
    if (!changed) {
      if (request.inventoryTransition) throw srError_('bad_catalog', 'Inventory transition is allowed only when changing between finite and unlimited stock.');
      mode = 'METADATA'; targetVersion = oldItem.inventoryVersion;
    } else {
      if (!request.remainingProvided) throw srError_('bad_catalog', 'Inventory changes require an explicit target remaining value.');
      if (request.expectedInventoryVersion !== oldItem.inventoryVersion) throw srError_('inventory_stale', 'Inventory changed after this item was loaded. Refresh the catalog and try the adjustment again.');
      if (request.reason.length < 8) throw srError_('bad_catalog', 'Describe the inventory adjustment with a meaningful reason.');
      var transition = oldItem.inventoryLimit < 0 && targetLimit >= 0 ? 'TO_FINITE' : oldItem.inventoryLimit >= 0 && targetLimit < 0 ? 'TO_UNLIMITED' : '';
      if (transition && request.inventoryTransition !== transition) throw srError_('inventory_transition_required', 'Changing between finite and unlimited inventory requires the explicit ' + transition + ' transition.');
      if (!transition && request.inventoryTransition) throw srError_('bad_catalog', 'Inventory transition is allowed only when changing between finite and unlimited stock.');
      mode = 'INVENTORY'; targetVersion = oldItem.inventoryVersion + 1;
      var delta = oldItem.inventoryLimit >= 0 && targetLimit >= 0 ? targetRemaining - oldItem.remaining : 0;
      movements = [newInventoryMovementSpec_(itemId, targetVersion, 'ADMIN_ADJUST', delta, oldItem.inventoryLimit, oldItem.remaining, targetLimit, targetRemaining, 'catalog_admin', itemId, actor, at, key, request.reason, oldTail.hash)];
    }
  }
  var item = {
    id: itemId,
    name: request.nameProvided ? request.name : oldItem.name,
    description: request.descriptionProvided ? request.description : oldItem ? oldItem.description : '',
    cost: request.costProvided ? request.cost : oldItem.cost,
    inventoryLimit: targetLimit, remaining: targetRemaining,
    active: request.activeProvided ? request.active : oldItem ? oldItem.active : true,
    imageUrl: request.imageUrlProvided ? request.imageUrl : oldItem ? oldItem.imageUrl : '',
    createdAt: createdAt, updatedAt: at, inventoryVersion: targetVersion
  };
  return { mode: mode, payload: request, item: item, inventoryMovements: movements, actorEmail: actor.email, actorRole: actor.role, at: at };
}
function inventoryMovements_(book) {
  return rows_(sheet_(book, 'InventoryMovements'), 18).map(function(row) {
    return { id: String(row[0] || ''), catalogId: String(row[1] || ''), version: number_(row[2]), kind: String(row[3] || ''), quantityDelta: number_(row[4]), beforeLimit: number_(row[5]), beforeRemaining: number_(row[6]), afterLimit: number_(row[7]), afterRemaining: number_(row[8]), referenceType: String(row[9] || ''), referenceId: String(row[10] || ''), actorEmail: String(row[11] || ''), actorRole: String(row[12] || ''), at: cell_(row[13]), idempotencyKey: String(row[14] || ''), reason: String(row[15] || ''), previousHash: String(row[16] || ''), hash: String(row[17] || '') };
  });
}
function inventoryMovementById_(book, movementId) { var list = inventoryMovements_(book); for (var i = 0; i < list.length; i++) if (list[i].id === movementId) return list[i]; return null; }
function inventoryMovementId_(kind, key, catalogId, version) { return 'inventory_' + hash_(SR_SERVICE + '|' + kind + '|' + key + '|' + catalogId + '|' + version).slice(0, 40); }
function inventoryMovementHashBody_(value) { return { id: value.id, catalogId: value.catalogId, version: value.version, kind: value.kind, quantityDelta: value.quantityDelta, beforeLimit: value.beforeLimit, beforeRemaining: value.beforeRemaining, afterLimit: value.afterLimit, afterRemaining: value.afterRemaining, referenceType: value.referenceType, referenceId: value.referenceId, actorEmail: value.actorEmail, actorRole: value.actorRole, at: value.at, idempotencyKey: value.idempotencyKey, reason: value.reason, previousHash: value.previousHash }; }
function inventoryMovementHash_(value) { return 'i1_' + hash_(stableJson_(inventoryMovementHashBody_(value))); }
function buildInventoryMovementSpec_(value) { value = inventoryMovementHashBody_(value); value.hash = inventoryMovementHash_(value); return value; }
function newInventoryMovementSpec_(catalogId, version, kind, delta, beforeLimit, beforeRemaining, afterLimit, afterRemaining, referenceType, referenceId, actor, at, key, reason, previousHash) {
  var storedReason = safeRow_([text_(reason, 180, '')])[0];
  return buildInventoryMovementSpec_({ id: inventoryMovementId_(kind, key, catalogId, version), catalogId: catalogId, version: version, kind: kind, quantityDelta: delta, beforeLimit: beforeLimit, beforeRemaining: beforeRemaining, afterLimit: afterLimit, afterRemaining: afterRemaining, referenceType: referenceType, referenceId: referenceId, actorEmail: actor.email, actorRole: actor.role, at: at, idempotencyKey: key, reason: storedReason, previousHash: previousHash });
}
function sameInventorySnapshot_(item, limit, remaining, version) { return !!item && item.inventoryLimit === limit && item.remaining === remaining && item.inventoryVersion === version; }
function assertInventoryChainTailMatchesCatalog_(book, item) {
  if (!item || item.inventoryVersion < 1) throw srError_('inventory_migration_required', 'Catalog inventory has not been migrated to schema v5.');
  var all = inventoryMovements_(book).filter(function(movement) { return movement.catalogId === item.id; });
  if (all.length !== item.inventoryVersion) throw srError_('inventory_chain_conflict', 'Catalog inventory movement versions are incomplete or duplicated. Review the integrity report.');
  return assertInventoryChainPrefixMatchesCatalog_(book, item);
}
function assertInventoryChainPrefixMatchesCatalog_(book, item) {
  if (!item || item.inventoryVersion < 1) throw srError_('inventory_migration_required', 'Catalog inventory has not been migrated to schema v5.');
  var chain = inventoryMovements_(book).filter(function(movement) { return movement.catalogId === item.id && movement.version <= item.inventoryVersion; }).sort(function(left, right) { return left.version - right.version; });
  if (chain.length !== item.inventoryVersion) throw srError_('inventory_chain_conflict', 'Catalog inventory movement versions are incomplete or duplicated. Review the integrity report.');
  for (var i = 0; i < chain.length; i++) {
    var movement = chain[i], previous = i ? chain[i - 1] : null;
    if (movement.version !== i + 1 || inventoryMovementHash_(movement) !== movement.hash ||
        (!previous && movement.previousHash !== 'GENESIS') ||
        (previous && (movement.previousHash !== previous.hash || movement.beforeLimit !== previous.afterLimit || movement.beforeRemaining !== previous.afterRemaining))) {
      throw srError_('inventory_chain_conflict', 'Catalog inventory movement hash chain is invalid. Review the integrity report.');
    }
  }
  var tail = chain[chain.length - 1];
  if (tail.afterLimit !== item.inventoryLimit || tail.afterRemaining !== item.remaining) throw srError_('inventory_chain_conflict', 'Catalog inventory does not match its movement chain. Review the integrity report.');
  return tail;
}
function appendInventoryMovement_(book, movement) {
  sheet_(book, 'InventoryMovements').appendRow(safeRow_([movement.id, movement.catalogId, movement.version, movement.kind, movement.quantityDelta, movement.beforeLimit, movement.beforeRemaining, movement.afterLimit, movement.afterRemaining, movement.referenceType, movement.referenceId, movement.actorEmail, movement.actorRole, movement.at, movement.idempotencyKey, movement.reason, movement.previousHash, movement.hash]));
}
function writeCatalogInventorySnapshot_(book, item) {
  upsert_(sheet_(book, 'Catalog'), 11, item.id, safeRow_([item.id, item.name, item.description, item.cost, item.inventoryLimit, item.remaining, item.active, item.imageUrl, item.createdAt, item.updatedAt, item.inventoryVersion]));
}
function writeCatalogMetadataOnly_(book, expected) {
  var current = catalogById_(book, expected.id);
  if (!current || !sameInventorySnapshot_(current, expected.inventoryLimit, expected.remaining, expected.inventoryVersion)) throw srError_('recovery_ambiguous', 'Catalog inventory changed while a metadata update was pending.');
  var target = sheet_(book, 'Catalog'), rowIndex = catalog_(book).map(function(item) { return item.id; }).indexOf(expected.id) + 2;
  target.getRange(rowIndex, 2, 1, 3).setValues([safeRow_([expected.name, expected.description, expected.cost])]);
  target.getRange(rowIndex, 7, 1, 2).setValues([safeRow_([expected.active, expected.imageUrl])]);
  target.getRange(rowIndex, 10).setValues([[expected.updatedAt]]);
  return copyCatalogItem_(expected);
}
function applyInventoryMovement_(book, movement, afterItem, movementFaultStage, materializeFaultStage) {
  if (stableJson_(buildInventoryMovementSpec_(movement)) !== stableJson_(movement)) throw srError_('inventory_movement_invalid', 'Inventory movement hash is invalid.');
  if (!afterItem || afterItem.id !== movement.catalogId || !sameInventorySnapshot_(afterItem, movement.afterLimit, movement.afterRemaining, movement.version)) throw srError_('inventory_movement_invalid', 'Inventory movement target does not match its catalog snapshot.');
  var matches = inventoryMovements_(book).filter(function(item) { return item.id === movement.id; });
  if (matches.length > 1) throw srError_('recovery_conflict', 'The deterministic inventory movement id appears more than once.');
  var current = catalogById_(book, movement.catalogId);
  if (matches.length) {
    if (stableJson_(matches[0]) !== stableJson_(movement)) throw srError_('recovery_conflict', 'The deterministic inventory movement does not match its operation intent.');
  } else {
    var all = inventoryMovements_(book).filter(function(item) { return item.catalogId === movement.catalogId; });
    if (movement.version === 1) {
      if (movement.previousHash !== 'GENESIS' || all.length) throw srError_('recovery_ambiguous', 'Inventory genesis does not match the existing movement chain.');
      if (movement.kind === 'INITIALIZE' && current) throw srError_('recovery_ambiguous', 'A catalog row appeared before its initialization movement.');
      if (movement.kind === 'MIGRATION_BASELINE' && !sameInventorySnapshot_(current, movement.beforeLimit, movement.beforeRemaining, 0)) throw srError_('recovery_ambiguous', 'The migration baseline no longer matches the legacy catalog snapshot.');
    } else {
      var prior = all.filter(function(item) { return item.version === movement.version - 1; });
      if (prior.length !== 1 || prior[0].hash !== movement.previousHash || prior[0].afterLimit !== movement.beforeLimit || prior[0].afterRemaining !== movement.beforeRemaining) throw srError_('recovery_ambiguous', 'Inventory movement does not continue the authoritative hash chain.');
      if (!sameInventorySnapshot_(current, movement.beforeLimit, movement.beforeRemaining, movement.version - 1)) throw srError_('recovery_ambiguous', 'Inventory changed while a store operation was pending. Review the integrity report.');
    }
    appendInventoryMovement_(book, movement);
    coreFault_(movementFaultStage);
  }
  current = catalogById_(book, movement.catalogId);
  if (sameInventorySnapshot_(current, movement.afterLimit, movement.afterRemaining, movement.version)) {
    if (stableJson_(copyCatalogItem_(current)) !== stableJson_(copyCatalogItem_(afterItem))) {
      if (movement.kind === 'INITIALIZE' || movement.kind === 'ADMIN_ADJUST') throw srError_('recovery_conflict', 'Catalog metadata does not match its signed operation intent.');
    }
    return current;
  }
  var beforeOkay = movement.version === 1 ? (movement.kind === 'INITIALIZE' ? !current : sameInventorySnapshot_(current, movement.beforeLimit, movement.beforeRemaining, 0)) : sameInventorySnapshot_(current, movement.beforeLimit, movement.beforeRemaining, movement.version - 1);
  if (!beforeOkay) throw srError_('recovery_ambiguous', 'Catalog inventory is neither the signed before state nor the signed after state.');
  writeCatalogInventorySnapshot_(book, afterItem);
  coreFault_(materializeFaultStage);
  return afterItem;
}
function buildStoreInventoryMovements_(book, lines, direction, kind, key, referenceType, referenceId, actor, at, reason) {
  var out = [];
  lines.forEach(function(line) {
    var item = catalogById_(book, line.catalogId);
    if (!item) throw srError_('catalog_changed', 'Store item was not found.');
    var tail = assertInventoryChainTailMatchesCatalog_(book, item), delta = direction * line.quantity;
    var afterRemaining = item.inventoryLimit < 0 ? -1 : item.remaining + delta;
    if (item.inventoryLimit >= 0 && (afterRemaining < 0 || afterRemaining > item.inventoryLimit)) throw srError_(direction < 0 ? 'inventory' : 'reconciliation', direction < 0 ? item.name + ' does not have enough inventory.' : 'Refund would make inventory exceed its configured limit for ' + item.name + '.');
    out.push(newInventoryMovementSpec_(item.id, item.inventoryVersion + 1, kind, delta, item.inventoryLimit, item.remaining, item.inventoryLimit, afterRemaining, referenceType, referenceId, actor, at, key, reason, tail.hash));
  });
  return out;
}
function assertInventoryRestorable_(book, lines) { var byId = {}, quantities = {}; catalog_(book).forEach(function(item) { byId[item.id] = item; }); lines.forEach(function(line) { var quantity = Number(line.quantity); if (!isFinite(quantity) || Math.floor(quantity) !== quantity || quantity < 1) throw srError_('reconciliation', 'Refund order quantities are invalid.'); quantities[line.catalogId] = (quantities[line.catalogId] || 0) + quantity; }); return Object.keys(quantities).map(function(itemId) { var item = byId[itemId]; if (!item) throw srError_('catalog_changed', 'Refund inventory item was not found.'); if (item.inventoryLimit >= 0 && (item.remaining < 0 || item.remaining > item.inventoryLimit || item.remaining + quantities[itemId] > item.inventoryLimit)) throw srError_('reconciliation', 'Refund would make inventory exceed its configured limit for ' + item.name + '.'); return { catalogId: itemId, quantity: quantities[itemId] }; }); }

function windows_(book) { return rows_(sheet_(book, 'StoreWindows'), 7).map(function(row) { return { id: String(row[0] || ''), name: String(row[1] || ''), startsAt: cell_(row[2]), endsAt: cell_(row[3]), status: String(row[4] || ''), createdAt: cell_(row[5]), updatedAt: cell_(row[6]) }; }); }
function normalizeWindow_(value) { value = object_(value); var status = text_(value.status, 20, 'DRAFT').toUpperCase(); if (SR_WINDOW_STATES.indexOf(status) < 0) throw srError_('bad_window', 'Store status is not valid.'); var startsAt = iso_(value.startsAt), endsAt = iso_(value.endsAt); if (startsAt && endsAt && startsAt >= endsAt) throw srError_('bad_window', 'Store end must be after its start.'); return { id: text_(value.id, 80, ''), name: text_(value.name, 120, 'Trimester store'), startsAt: startsAt, endsAt: endsAt, status: status }; }
function upsertWindowRow_(book, value) { var existing = windows_(book), windowId = value.id || uuid_(), createdAt = now_(); existing.forEach(function(old) { if (old.id === windowId) createdAt = old.createdAt || createdAt; }); var saved = { id: windowId, name: value.name, startsAt: value.startsAt, endsAt: value.endsAt, status: value.status, createdAt: createdAt, updatedAt: now_() }; upsert_(sheet_(book, 'StoreWindows'), 7, windowId, safeRow_([saved.id, saved.name, saved.startsAt, saved.endsAt, saved.status, saved.createdAt, saved.updatedAt])); return saved; }
function windowById_(book, windowId) { var list = windows_(book); for (var i = 0; i < list.length; i++) if (list[i].id === windowId) return list[i]; return null; }
function windowTimeState_(item) { var at = new Date().getTime(), starts = item && item.startsAt ? new Date(item.startsAt).getTime() : null, ends = item && item.endsAt ? new Date(item.endsAt).getTime() : null; if (starts != null && at < starts) return 'NOT_STARTED'; if (ends != null && at >= ends) return 'ENDED'; return 'ACTIVE'; }
function requireOpenWindowNow_(item, action) { if (!item || item.status !== 'OPEN') throw srError_('store_closed', action + ' is available only while this store window is open.'); var timeState = windowTimeState_(item); if (timeState === 'NOT_STARTED') throw srError_('store_not_started', action + ' is not available before the shopping window starts.'); if (timeState === 'ENDED') throw srError_('store_ended', action + ' is not available after the shopping window ends.'); return item; }
function closeOtherVisibleWindows_(book, keepId) { windows_(book).forEach(function(item) { if (item.id !== keepId && (item.status === 'OPEN' || item.status === 'PREVIEW')) { item.status = 'CLOSED'; upsertWindowRow_(book, item); } }); }
function visibleWindow_(book) { var list = windows_(book), candidates = list.filter(function(item) { return item.status === 'OPEN' && windowTimeState_(item) === 'ACTIVE'; }); if (!candidates.length) candidates = list.filter(function(item) { return item.status === 'PREVIEW'; }); candidates.sort(function(left, right) { return String(right.updatedAt).localeCompare(String(left.updatedAt)); }); return candidates[0] || null; }

function ledger_(book) { return rows_(sheet_(book, 'Ledger'), 13).map(function(row) { return { id: String(row[0] || ''), studentId: String(row[1] || ''), kind: String(row[2] || ''), amount: number_(row[3]), reason: String(row[4] || ''), referenceType: String(row[5] || ''), referenceId: String(row[6] || ''), reversesId: String(row[7] || ''), actorEmail: String(row[8] || ''), actorRole: String(row[9] || ''), at: cell_(row[10]), idempotencyKey: String(row[11] || ''), categoryId: String(row[12] || '') }; }); }
function appendLedger_(book, value, actor) { var entry = { id: uuid_(), studentId: value.studentId, kind: value.kind, amount: value.amount, reason: value.reason, referenceType: value.referenceType, referenceId: value.referenceId, reversesId: value.reversesId, actorEmail: actor.email, actorRole: actor.role, at: now_(), idempotencyKey: value.key, categoryId: value.categoryId || '' }; sheet_(book, 'Ledger').appendRow(safeRow_([entry.id, entry.studentId, entry.kind, entry.amount, entry.reason, entry.referenceType, entry.referenceId, entry.reversesId, entry.actorEmail, entry.actorRole, entry.at, entry.idempotencyKey, entry.categoryId])); return entry; }
function ensureLedgerEntry_(book, spec) {
  var matches = ledger_(book).filter(function(entry) { return entry.id === spec.id; });
  if (matches.length > 1) throw srError_('recovery_conflict', 'The deterministic ledger id appears more than once.');
  var expected = {
    id: spec.id, studentId: spec.studentId, kind: spec.kind, amount: spec.amount, reason: spec.reason,
    referenceType: spec.referenceType, referenceId: spec.referenceId, reversesId: spec.reversesId,
    actorEmail: spec.actorEmail, actorRole: spec.actorRole, at: spec.at,
    idempotencyKey: spec.idempotencyKey, categoryId: spec.categoryId || ''
  };
  if (matches.length) {
    if (stableJson_(matches[0]) !== stableJson_(expected)) throw srError_('recovery_conflict', 'The deterministic ledger row does not match its operation intent.');
    return matches[0];
  }
  sheet_(book, 'Ledger').appendRow(safeRow_([expected.id, expected.studentId, expected.kind, expected.amount, expected.reason, expected.referenceType, expected.referenceId, expected.reversesId, expected.actorEmail, expected.actorRole, expected.at, expected.idempotencyKey, expected.categoryId]));
  return expected;
}
function studentLedgerEntry_(entry) { return { id: entry.id, studentId: entry.studentId, kind: entry.kind, amount: entry.amount, reason: entry.reason, referenceType: entry.referenceType, referenceId: entry.referenceId, reversesId: entry.reversesId, at: entry.at, categoryId: entry.categoryId }; }
function ledgerById_(book, entryId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].id === entryId) return list[i]; return null; }
function reversalExists_(book, entryId) { return ledger_(book).some(function(entry) { return entry.reversesId === entryId; }); }

function balancesMap_(book) { var map = {}; rows_(sheet_(book, 'Balances'), 5).forEach(function(row) { map[String(row[0])] = { studentId: String(row[0]), earned: number_(row[1]), spent: number_(row[2]), balance: number_(row[3]), updatedAt: cell_(row[4]) }; }); return map; }
function balance_(book, studentId) { return balancesMap_(book)[studentId] || { studentId: studentId, earned: 0, spent: 0, balance: 0, updatedAt: '' }; }
function applyBalance_(book, studentId, earnedDelta, spentDelta) { var value = balance_(book, studentId); value.earned += earnedDelta; value.spent += spentDelta; value.balance = value.earned - value.spent; if (value.balance < 0) throw srError_('insufficient_balance', 'Balance cannot be negative.'); value.updatedAt = now_(); upsert_(sheet_(book, 'Balances'), 5, studentId, safeRow_([studentId, value.earned, value.spent, value.balance, value.updatedAt])); return value; }
function expectedBalanceFromEntries_(entries, studentId) {
  var earned = 0, spent = 0, net = 0;
  entries.forEach(function(entry) {
    if (entry.studentId !== studentId) return;
    net += entry.amount;
    if (entry.kind === 'EARN' || entry.kind === 'REVERSAL') earned += entry.amount;
    else if (entry.kind === 'SPEND') spent += -entry.amount;
    else if (entry.kind === 'REFUND') spent -= entry.amount;
  });
  return { studentId: studentId, earned: earned, spent: spent, balance: earned - spent, ledgerNet: net };
}
function reconcileBalanceFromLedger_(book, studentId) {
  var expected = expectedBalanceFromEntries_(ledger_(book), studentId);
  if (expected.balance < 0 || expected.balance !== expected.ledgerNet) throw srError_('reconciliation', 'The ledger cannot produce a valid non-negative balance.');
  expected.updatedAt = now_();
  upsert_(sheet_(book, 'Balances'), 5, studentId, safeRow_([studentId, expected.earned, expected.spent, expected.balance, expected.updatedAt]));
  return expected;
}
function orders_(book) { return rows_(sheet_(book, 'Orders'), 8).map(function(row) { return { id: String(row[0] || ''), studentId: String(row[1] || ''), windowId: String(row[2] || ''), total: number_(row[3]), status: String(row[4] || ''), actorEmail: String(row[5] || ''), at: cell_(row[6]), idempotencyKey: String(row[7] || '') }; }); }
function orderById_(book, orderId) { var list = orders_(book); for (var i = 0; i < list.length; i++) if (list[i].id === orderId) return list[i]; return null; }
function orderLines_(book, orderId) { return rows_(sheet_(book, 'OrderLines'), 6).filter(function(row) { return String(row[0]) === orderId; }).map(function(row) { return { orderId: String(row[0]), catalogId: String(row[1]), itemName: String(row[2]), quantity: number_(row[3]), unitCost: number_(row[4]), lineTotal: number_(row[5]) }; }); }
function ensureOrderRow_(book, spec, initialStatus) {
  var matches = orders_(book).filter(function(order) { return order.id === spec.id; });
  if (matches.length > 1) throw srError_('recovery_conflict', 'The deterministic order id appears more than once.');
  if (matches.length) {
    var order = matches[0];
    if (order.studentId !== spec.studentId || order.windowId !== spec.windowId || order.total !== spec.total || order.actorEmail !== spec.actorEmail || order.at !== spec.at || order.idempotencyKey !== spec.idempotencyKey || ['PROCESSING', 'COMPLETED'].indexOf(order.status) < 0) throw srError_('recovery_conflict', 'The deterministic order row does not match its operation intent.');
    return order;
  }
  var created = { id: spec.id, studentId: spec.studentId, windowId: spec.windowId, total: spec.total, status: initialStatus, actorEmail: spec.actorEmail, at: spec.at, idempotencyKey: spec.idempotencyKey };
  sheet_(book, 'Orders').appendRow(safeRow_([created.id, created.studentId, created.windowId, created.total, created.status, created.actorEmail, created.at, created.idempotencyKey]));
  return created;
}
function ensureOrderLines_(book, orderId, expectedLines) {
  var current = orderLines_(book, orderId), expectedByCatalog = {};
  expectedLines.forEach(function(line) { expectedByCatalog[line.catalogId] = line; });
  current.forEach(function(line) {
    var expected = expectedByCatalog[line.catalogId];
    if (!expected) throw srError_('recovery_conflict', 'The order contains an unexpected item line.');
    var same = line.itemName === expected.itemName && line.quantity === expected.quantity && line.unitCost === expected.unitCost && line.lineTotal === expected.lineTotal;
    if (!same) throw srError_('recovery_conflict', 'An order item line does not match its operation intent.');
  });
  expectedLines.forEach(function(line) {
    var matches = current.filter(function(item) { return item.catalogId === line.catalogId; });
    if (matches.length > 1) throw srError_('recovery_conflict', 'An order item line appears more than once.');
    if (!matches.length) sheet_(book, 'OrderLines').appendRow(safeRow_([orderId, line.catalogId, line.itemName, line.quantity, line.unitCost, line.lineTotal]));
  });
}
function orderDto_(book, order) { return { id: order.id, studentId: order.studentId, windowId: order.windowId, total: order.total, status: order.status, at: order.at, lines: orderLines_(book, order.id) }; }
function receipts_(book) { return rows_(sheet_(book, 'Receipts'), 8).map(function(row) { return { id: String(row[0] || ''), orderId: String(row[1] || ''), studentId: String(row[2] || ''), kind: String(row[3] || ''), recipientEmail: normalizeEmail_(row[4]), status: String(row[5] || ''), sentAt: cell_(row[6]), error: String(row[7] || '') }; }); }
function receiptById_(book, receiptId) { var list = receipts_(book); for (var i = 0; i < list.length; i++) if (list[i].id === receiptId) return list[i]; return null; }
function upsertReceiptRow_(book, receipt) { upsert_(sheet_(book, 'Receipts'), 8, receipt.id, safeRow_([receipt.id, receipt.orderId, receipt.studentId, receipt.kind, receipt.recipientEmail, receipt.status, receipt.sentAt, receipt.error])); }
function receiptDto_(receipt) { return { id: receipt.id, orderId: receipt.orderId, studentId: receipt.studentId, kind: receipt.kind, status: receipt.status, sentAt: receipt.sentAt }; }
function receiptDtosForOrders_(book, orderList) { var ids = {}, latest = {}; orderList.forEach(function(order) { ids[order.id] = true; }); receipts_(book).forEach(function(receipt) { if (ids[receipt.orderId]) latest[receipt.orderId + '|' + receipt.kind] = receipt; }); return Object.keys(latest).map(function(key) { return receiptDto_(latest[key]); }).sort(function(left, right) { return String(right.sentAt).localeCompare(String(left.sentAt)); }); }
function sentReceiptForOrder_(book, orderId, kind) { var list = receipts_(book); for (var i = list.length - 1; i >= 0; i--) if (list[i].orderId === orderId && list[i].kind === kind && list[i].status === 'SENT') return list[i]; return null; }
function latestReceiptForOrder_(book, orderId, kind) { var list = receipts_(book); for (var i = list.length - 1; i >= 0; i--) if (list[i].orderId === orderId && list[i].kind === kind) return list[i]; return null; }
function assertReceiptDeliverySettled_(book, orderId, kind) { var receipt = latestReceiptForOrder_(book, orderId, kind); if (receipt && (receipt.status === 'PENDING' || receipt.status === 'UNKNOWN')) throw srError_('receipt_uncertain', 'Resolve the uncertain ' + kind.toLowerCase() + ' receipt delivery before continuing.'); }
function setOrderStatus_(book, orderId, status) { var order = orderById_(book, orderId); if (!order) throw srError_('not_found', 'Order was not found.'); upsert_(sheet_(book, 'Orders'), 8, orderId, safeRow_([order.id, order.studentId, order.windowId, order.total, status, order.actorEmail, order.at, order.idempotencyKey])); }
function reconcileInventoryPlan_(book, plan, faultStage) {
  (plan || []).forEach(function(target) {
    var item = catalog_(book).filter(function(candidate) { return candidate.id === target.catalogId; })[0];
    if (!item || item.inventoryLimit !== target.inventoryLimit) throw srError_('recovery_ambiguous', 'Inventory configuration changed while a store operation was pending. Review the integrity report.');
    if (item.remaining === target.afterRemaining) return;
    if (item.remaining !== target.beforeRemaining) throw srError_('recovery_ambiguous', 'Inventory changed while a store operation was pending. Review the integrity report before continuing.');
    if (item.inventoryVersion !== 0) throw srError_('recovery_ambiguous', 'A legacy inventory plan cannot write a schema v5 catalog item.');
    item.remaining = target.afterRemaining;
    upsert_(sheet_(book, 'Catalog'), 10, item.id, safeRow_([item.id, item.name, item.description, item.cost, item.inventoryLimit, item.remaining, item.active, item.imageUrl, item.createdAt, now_()]));
    coreFault_(faultStage);
  });
}
function reconcileInventoryMovements_(book, movements, faultPrefix) {
  (movements || []).forEach(function(movement) {
    var current = catalogById_(book, movement.catalogId);
    var after = copyCatalogItem_(current || {});
    if (!current) throw srError_('recovery_ambiguous', 'Inventory movement catalog item is missing.');
    after.inventoryLimit = movement.afterLimit; after.remaining = movement.afterRemaining; after.inventoryVersion = movement.version; after.updatedAt = movement.at;
    applyInventoryMovement_(book, movement, after, faultPrefix + ':after_inventory_movement', faultPrefix + ':after_inventory');
  });
}
function spendForOrder_(book, orderId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].kind === 'SPEND' && list[i].referenceType === 'order' && list[i].referenceId === orderId) return list[i]; return null; }
function cart_(value) { if (!Array.isArray(value) || !value.length || value.length > 50) throw srError_('bad_cart', 'Choose between 1 and 50 store items.'); var map = {}; value.forEach(function(line) { var itemId = id_(line && line.catalogId, 'catalog item'), quantity = integer_(line && line.quantity, 1, 100, 'Quantity'); map[itemId] = (map[itemId] || 0) + quantity; }); return Object.keys(map).sort().map(function(itemId) { return { catalogId: itemId, quantity: map[itemId] }; }); }
function statementKeys_(book) { var map = {}; rows_(sheet_(book, 'Statements'), 7).forEach(function(row) { if (String(row[4]) === 'SENT') map[String(row[1]) + '|' + String(row[2])] = true; }); return map; }
function emailSchedule_() { var props = PropertiesService.getScriptProperties(); return { enabled: props.getProperty('SR_EMAIL_ENABLED') === 'true', weekday: props.getProperty('SR_EMAIL_WEEKDAY') || 'FRIDAY', hour: number_(props.getProperty('SR_EMAIL_HOUR') || 16) }; }
function mailQuota_() { try { return Math.max(0, Number(MailApp.getRemainingDailyQuota()) || 0); } catch (_) { return 0; } }
function mailReceiptReserve_() {
  var raw = PropertiesService.getScriptProperties().getProperty('SR_MAIL_RECEIPT_RESERVE');
  if (raw == null || raw === '') return SR_MAIL_RECEIPT_RESERVE_DEFAULT;
  var value = Number(raw); return isFinite(value) ? Math.max(0, Math.floor(value)) : SR_MAIL_RECEIPT_RESERVE_DEFAULT;
}
function bulkMailAllowance_() { return Math.max(0, mailQuota_() - mailReceiptReserve_()); }
function requireMailSchemaV6_(book) {
  if (number_(configMap_(book).schemaVersion) < 6 || !book.getSheetByName('MailRuns') || !book.getSheetByName('MailOutbox')) throw srError_('mail_migration_required', 'Run the schema v6 mail migration before using resilient bulk delivery.');
}
function mailDeliverySecret_(createIfMissing) {
  var props = PropertiesService.getScriptProperties(), secret = String(props.getProperty('SR_MAIL_DELIVERY_SECRET') || '');
  if (!secret && createIfMissing) {
    secret = hash_(uuid_() + '|mail|' + uuid_() + '|' + now_()) + hash_(uuid_() + '|' + SR_SERVICE + '|delivery');
    props.setProperty('SR_MAIL_DELIVERY_SECRET', secret);
  }
  return secret;
}
function mailHmac_(value, secret, prefix) {
  var bytes = Utilities.computeHmacSha256Signature(String(value), secret, Utilities.Charset.UTF_8);
  return prefix + Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}
function mailActorHash_(email, secret) { return mailHmac_(normalizeEmail_(email), secret, 'ma1_'); }
function mailRecipientHash_(email, secret) { return mailHmac_(normalizeEmail_(email), secret, 'mr1_'); }
function mailRunOperationHash_(run, secret) {
  return mailHmac_(stableJson_({
    id: run.id, kind: run.kind, periodKey: run.periodKey, requestedLimit: run.requestedLimit,
    cursorKey: run.cursorKey, attempted: run.attempted, sent: run.sent, skipped: run.skipped,
    failed: run.failed, uncertain: run.uncertain, status: run.status, actorHash: run.actorHash,
    createdAt: run.createdAt, updatedAt: run.updatedAt, completedAt: run.completedAt, lastError: run.lastError
  }), secret, 'mo1_');
}
function signMailRun_(run) {
  var secret = mailDeliverySecret_(false);
  if (!secret) throw srError_('mail_integrity', 'The mail run signing secret is unavailable.');
  run.operationHash = mailRunOperationHash_(run, secret);
  return run;
}
function mailOutboxSignature_(delivery, secret) {
  return mailHmac_(stableJson_({
    id: delivery.id, runId: delivery.runId, deliveryKey: delivery.deliveryKey, kind: delivery.kind,
    studentId: delivery.studentId, guardianId: delivery.guardianId, recipientHash: delivery.recipientHash,
    consentConfirmedAt: delivery.consentConfirmedAt, periodKey: delivery.periodKey,
    payloadJson: delivery.payloadJson, status: delivery.status, createdAt: delivery.createdAt,
    attemptedAt: delivery.attemptedAt, settledAt: delivery.settledAt, errorCode: delivery.errorCode,
    error: delivery.error, retryOfId: delivery.retryOfId, resolvedAt: delivery.resolvedAt,
    resolvedByHash: delivery.resolvedByHash, resolutionNote: delivery.resolutionNote
  }), secret, 'md1_');
}
function signMailDelivery_(delivery) {
  var secret = mailDeliverySecret_(false);
  if (!secret) throw srError_('mail_integrity', 'The mail delivery signing secret is unavailable.');
  delivery.payloadHash = mailOutboxSignature_(delivery, secret);
  return delivery;
}
function assertMailRunSignature_(run) {
  var secret = mailDeliverySecret_(false);
  if (!secret || !run.operationHash || !secureTextEqual_(run.operationHash, mailRunOperationHash_(run, secret))) throw srError_('mail_integrity', 'The mail run signature is missing or invalid.');
}
function assertMailDeliverySignature_(delivery) {
  var secret = mailDeliverySecret_(false);
  if (!secret || !delivery.payloadHash || !secureTextEqual_(delivery.payloadHash, mailOutboxSignature_(delivery, secret))) throw srError_('mail_integrity', 'The mail delivery signature is missing or invalid.');
  try {
    var parsed = JSON.parse(delivery.payloadJson);
    if (stableJson_(parsed) !== delivery.payloadJson) throw new Error('noncanonical');
  } catch (_) { throw srError_('mail_integrity', 'The mail delivery payload is invalid.'); }
}
function mailRuns_(book) {
  return rows_(sheet_(book, 'MailRuns'), 17).map(function(row) {
    return {
      id: String(row[0] || ''), kind: String(row[1] || ''), periodKey: String(row[2] || ''), requestedLimit: number_(row[3]),
      cursorKey: String(row[4] || ''), attempted: number_(row[5]), sent: number_(row[6]), skipped: number_(row[7]),
      failed: number_(row[8]), uncertain: number_(row[9]), status: String(row[10] || ''), actorHash: String(row[11] || ''),
      operationHash: String(row[12] || ''), createdAt: cell_(row[13]), updatedAt: cell_(row[14]),
      completedAt: cell_(row[15]), lastError: String(row[16] || '')
    };
  });
}
function mailRunById_(book, runId) {
  var list = mailRuns_(book); for (var i = 0; i < list.length; i++) if (list[i].id === runId) return list[i]; return null;
}
function upsertMailRun_(book, run) {
  upsert_(sheet_(book, 'MailRuns'), 17, run.id, safeRow_([
    run.id, run.kind, run.periodKey, run.requestedLimit, run.cursorKey, run.attempted, run.sent, run.skipped,
    run.failed, run.uncertain, run.status, run.actorHash, run.operationHash, run.createdAt, run.updatedAt,
    run.completedAt, run.lastError
  ]));
}
function mailOutbox_(book) {
  return rows_(sheet_(book, 'MailOutbox'), 21).map(function(row) {
    return {
      id: String(row[0] || ''), runId: String(row[1] || ''), deliveryKey: String(row[2] || ''), kind: String(row[3] || ''),
      studentId: String(row[4] || ''), guardianId: String(row[5] || ''), recipientHash: String(row[6] || ''),
      consentConfirmedAt: cell_(row[7]), periodKey: String(row[8] || ''), payloadJson: String(row[9] || ''),
      payloadHash: String(row[10] || ''), status: String(row[11] || ''), createdAt: cell_(row[12]),
      attemptedAt: cell_(row[13]), settledAt: cell_(row[14]), errorCode: String(row[15] || ''),
      error: String(row[16] || ''), retryOfId: String(row[17] || ''), resolvedAt: cell_(row[18]),
      resolvedByHash: String(row[19] || ''), resolutionNote: String(row[20] || '')
    };
  });
}
function mailOutboxById_(book, outboxId) {
  var list = mailOutbox_(book); for (var i = 0; i < list.length; i++) if (list[i].id === outboxId) return list[i]; return null;
}
function upsertMailOutbox_(book, delivery) {
  upsert_(sheet_(book, 'MailOutbox'), 21, delivery.id, safeRow_([
    delivery.id, delivery.runId, delivery.deliveryKey, delivery.kind, delivery.studentId, delivery.guardianId,
    delivery.recipientHash, delivery.consentConfirmedAt, delivery.periodKey, delivery.payloadJson, delivery.payloadHash,
    delivery.status, delivery.createdAt, delivery.attemptedAt, delivery.settledAt, delivery.errorCode, delivery.error,
    delivery.retryOfId, delivery.resolvedAt, delivery.resolvedByHash, delivery.resolutionNote
  ]));
}
function mailDeliveryCanRetry_(book, delivery) {
  try { assertConfirmedFailedMailDelivery_(delivery); }
  catch (_) { return false; }
  return !mailOutbox_(book).some(function(item) { return item.retryOfId === delivery.id; });
}
function mailDeliveryDto_(delivery, book) {
  return {
    id: delivery.id, runId: delivery.runId, kind: delivery.kind, status: delivery.status,
    attemptedAt: delivery.attemptedAt, errorCode: delivery.errorCode, retryOfId: delivery.retryOfId,
    resolvedAt: delivery.resolvedAt, canRetry: !!book && mailDeliveryCanRetry_(book, delivery)
  };
}
function actionableMailDeliveries_(book) {
  var deliveries = mailOutbox_(book), retried = {};
  deliveries.forEach(function(item) { if (item.retryOfId) retried[item.retryOfId] = true; });
  return deliveries.filter(function(item) {
    try { assertMailDeliverySignature_(item); } catch (_) { return false; }
    if (item.status === 'UNKNOWN') return true;
    if (item.status !== 'FAILED' || retried[item.id]) return false;
    try { assertConfirmedFailedMailDelivery_(item); return true; } catch (_) { return false; }
  });
}
function assertConfirmedFailedMailDelivery_(delivery) {
  assertMailDeliverySignature_(delivery);
  var note = String(delivery.resolutionNote || '');
  if (delivery.status !== 'FAILED' || delivery.errorCode !== 'ADMIN_CONFIRMED_FAILED' || !delivery.resolvedAt ||
      !/^ma1_[A-Za-z0-9_-]{20,}$/.test(delivery.resolvedByHash) || note.length < 8 || note.length > 240 ||
      /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(note)) {
    throw srError_('mail_failed_unconfirmed', 'Only an administrator-confirmed, privacy-safe failed delivery can be retried.');
  }
  return delivery;
}
function mailContinuationScheduled_() {
  try {
    var registration = readMailTriggerRegistration_('SR_MAIL_CONTINUATION_REGISTRATION', 'continueSchoolRewardsMailRuns');
    return ScriptApp.getProjectTriggers().some(function(trigger) { return trigger.getHandlerFunction() === registration.handler && String(trigger.getUniqueId()) === registration.uid; });
  }
  catch (_) { return false; }
}
function mailSafetySweepReady_() {
  try {
    var registration = readMailTriggerRegistration_('SR_MAIL_SWEEP_REGISTRATION', 'sweepSchoolRewardsMailRuns');
    return ScriptApp.getProjectTriggers().some(function(trigger) { return trigger.getHandlerFunction() === registration.handler && String(trigger.getUniqueId()) === registration.uid; });
  } catch (_) { return false; }
}
function requireMailSafetySweep_() {
  if (!mailSafetySweepReady_()) throw srError_('mail_safety_unavailable', 'The recurring mail safety sweep is unavailable. Run repository setup as an administrator before starting or retrying bulk mail.');
}
function ensureMailSafetySweepTrigger_() {
  if (mailSafetySweepReady_()) return true;
  var replacement = ScriptApp.newTrigger('sweepSchoolRewardsMailRuns').timeBased().everyHours(1).create();
  var registration = saveMailTriggerRegistration_('SR_MAIL_SWEEP_REGISTRATION', replacement, 'sweepSchoolRewardsMailRuns', 'hourly');
  try {
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'sweepSchoolRewardsMailRuns' && String(trigger.getUniqueId()) !== registration.uid) {
        try { ScriptApp.deleteTrigger(trigger); } catch (_) {}
      }
    });
  } catch (_) {}
  return true;
}
function mailTriggerRegistrationSignature_(registration, secret) {
  return mailHmac_(stableJson_({ uid: registration.uid, handler: registration.handler, target: registration.target }), secret, 'mt1_');
}
function saveMailTriggerRegistration_(propertyName, trigger, handler, target) {
  var secret = mailDeliverySecret_(false);
  if (!secret) throw srError_('mail_integrity', 'The mail trigger signing secret is unavailable.');
  var registration = { uid: String(trigger.getUniqueId()), handler: String(handler), target: String(target), signature: '' };
  registration.signature = mailTriggerRegistrationSignature_(registration, secret);
  PropertiesService.getScriptProperties().setProperty(propertyName, stableJson_(registration));
  return registration;
}
function readMailTriggerRegistration_(propertyName, expectedHandler) {
  var raw = String(PropertiesService.getScriptProperties().getProperty(propertyName) || ''), registration, secret = mailDeliverySecret_(false);
  if (!raw || !secret) throw srError_('denied', 'A valid installed project trigger is required for non-interactive mail handling.');
  try { registration = JSON.parse(raw); } catch (_) { throw srError_('denied', 'A valid installed project trigger is required for non-interactive mail handling.'); }
  if (!registration || registration.handler !== expectedHandler || !registration.uid || !registration.target || !registration.signature ||
      !secureTextEqual_(registration.signature, mailTriggerRegistrationSignature_(registration, secret))) {
    throw srError_('denied', 'A valid installed project trigger is required for non-interactive mail handling.');
  }
  return registration;
}
function assertMailTriggerEvent_(event, expectedHandler, propertyName) {
  var registration = readMailTriggerRegistration_(propertyName, expectedHandler);
  if (!event || !secureTextEqual_(String(event.triggerUid || ''), registration.uid)) throw srError_('denied', 'A valid installed project trigger is required for non-interactive mail handling.');
  return registration;
}
function consumeMailContinuationTrigger_(event) {
  return assertMailTriggerEvent_(event, 'continueSchoolRewardsMailRuns', 'SR_MAIL_CONTINUATION_REGISTRATION');
}
function mailRunProgress_(book, run) {
  var allDeliveries = mailOutbox_(book);
  allDeliveries.forEach(function(item) { assertMailDeliverySignature_(item); });
  var deliveries = allDeliveries.filter(function(item) { return item.runId === run.id; });
  var primary = deliveries.filter(function(item) { return !item.retryOfId; }).length;
  return {
    deliveries: deliveries, primary: primary, attempted: deliveries.length + run.skipped,
    sent: deliveries.filter(function(item) { return item.status === 'SENT'; }).length,
    failed: deliveries.filter(function(item) { return item.status === 'FAILED'; }).length,
    uncertain: deliveries.filter(function(item) { return item.status === 'UNKNOWN'; }).length,
    pending: deliveries.filter(function(item) { return item.status === 'PENDING'; }).length,
    candidateProgress: primary + run.skipped
  };
}
function mailRunRemaining_(book, run, progress) {
  progress = progress || mailRunProgress_(book, run);
  var manifest = mailCandidateManifest_(run);
  return Math.max(0, manifest.c.length - manifest.i);
}
function mailRunDto_(book, run) {
  assertMailRunSignature_(run);
  var progress = mailRunProgress_(book, run), remaining = mailRunRemaining_(book, run, progress);
  var canResume = ['QUEUED', 'RUNNING', 'PAUSED_QUOTA'].indexOf(run.status) >= 0 && !progress.pending && !progress.uncertain && remaining > 0;
  return {
    id: run.id, runId: run.id, kind: run.kind, periodKey: run.periodKey, requestedLimit: run.requestedLimit,
    attempted: progress.attempted, sent: progress.sent, skipped: run.skipped,
    failed: progress.failed, uncertain: progress.uncertain, pending: progress.pending, status: run.status,
    createdAt: run.createdAt, updatedAt: run.updatedAt, completedAt: run.completedAt,
    remaining: remaining, canResume: canResume, continuationScheduled: (canResume || progress.pending > 0) && mailContinuationScheduled_()
  };
}
function mailRequestKey_(value, kind, period) {
  var supplied = text_(value, 120, '');
  return supplied ? idemKey_(supplied) : 'mail_auto_' + hash_(kind + '|' + period).slice(0, 44);
}
function mailCandidates_(book, kind) {
  var out = [];
  if (kind === 'STUDENT_STATEMENT') {
    students_(book).forEach(function(student) {
      if (student.active && student.email) out.push({ cursorKey: student.id, studentId: student.id, guardianId: '' });
    });
  } else if (kind === 'GUARDIAN_DIGEST') {
    guardians_(book).forEach(function(guardian) {
      if (guardian.active && guardian.consentConfirmedAt && guardian.guardianEmail) out.push({ cursorKey: guardian.id, studentId: guardian.studentId, guardianId: guardian.id });
    });
  } else throw srError_('mail_kind_invalid', 'Mail run kind is not supported.');
  return out.sort(function(left, right) { return String(left.cursorKey).localeCompare(String(right.cursorKey)); });
}
function mailCandidateManifestJson_(book, kind, requestedLimit) {
  var candidates = mailCandidates_(book, kind).slice(0, requestedLimit);
  var json = stableJson_({ v: 1, i: 0, c: candidates.map(function(candidate) { return [candidate.studentId, candidate.guardianId]; }) });
  if (json.length > 45000) throw srError_('mail_candidate_manifest_too_large', 'The frozen mail candidate set exceeds the protected sheet cell limit. Use a smaller run limit.');
  return json;
}
function mailCandidateManifest_(run) {
  var value;
  try { value = JSON.parse(String(run.cursorKey || '')); }
  catch (_) { throw srError_('mail_integrity', 'The signed mail candidate manifest is invalid.'); }
  if (!value || value.v !== 1 || !Array.isArray(value.c) || value.c.length > SR_MAX_BATCH ||
      !isFinite(value.i) || Math.floor(value.i) !== value.i || value.i < 0 || value.i > value.c.length ||
      value.c.length > run.requestedLimit) throw srError_('mail_integrity', 'The signed mail candidate manifest is invalid.');
  var seen = {};
  value.c.forEach(function(pair) {
    var studentId = String(pair && pair[0] || ''), guardianId = String(pair && pair[1] || '');
    if (!Array.isArray(pair) || pair.length !== 2 || !/^[A-Za-z0-9_-]{8,80}$/.test(studentId) ||
        (run.kind === 'STUDENT_STATEMENT' ? guardianId !== '' : !/^[A-Za-z0-9_-]{8,80}$/.test(guardianId)) ||
        seen[studentId + '|' + guardianId]) throw srError_('mail_integrity', 'The signed mail candidate manifest is invalid.');
    seen[studentId + '|' + guardianId] = true;
  });
  return value;
}
function mailManifestCandidate_(manifest) {
  if (manifest.i >= manifest.c.length) return null;
  return { cursorKey: String(manifest.i), studentId: String(manifest.c[manifest.i][0]), guardianId: String(manifest.c[manifest.i][1] || '') };
}
function advanceMailManifest_(run, manifest) {
  manifest.i++;
  run.cursorKey = stableJson_(manifest);
}
function mailDeliveryKey_(kind, periodKey, studentId, guardianId) {
  return 'delivery_' + hash_(SR_SERVICE + '|mail|' + kind + '|' + periodKey + '|' + studentId + '|' + guardianId).slice(0, 48);
}
function mailOutboxId_(deliveryKey, retryOfId) {
  return 'outbox_' + hash_(SR_SERVICE + '|outbox|' + deliveryKey + '|' + String(retryOfId || '')).slice(0, 48);
}
function mailPayloadForCandidate_(book, run, candidate, asOf) {
  var student = requireStudent_(book, candidate.studentId), config = configMap_(book);
  var availability = pointAvailability_(book, student.id), payload = {
    schema: 'alloflow-school-rewards-mail/1', kind: run.kind, studentId: student.id,
    periodKey: run.periodKey, asOf: asOf, balance: availability.balance,
    reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance
  };
  if (run.kind === 'STUDENT_STATEMENT') {
    var windowItem = visibleWindow_(book);
    payload.window = windowItem ? { name: windowItem.name, startsAt: windowItem.startsAt, endsAt: windowItem.endsAt, status: windowItem.status } : null;
    payload.prizes = windowItem ? catalog_(book).filter(function(item) { return item.active; }).slice(0, 12).map(function(item) { return { name: item.name, cost: item.cost }; }) : [];
  } else {
    var guardian = guardianById_(book, candidate.guardianId);
    if (!guardian || !guardian.active || !guardian.consentConfirmedAt || guardian.studentId !== student.id) throw srError_('mail_recipient_changed', 'Guardian authorization is no longer valid.');
    payload.guardianId = guardian.id;
    payload.earned = balance_(book, student.id).earned;
    payload.progress = categoryProgress_(book, student.id, categories_(book), config).filter(function(item) { return item.points > 0; }).slice(0, 8).map(function(item) {
      return { categoryId: item.categoryId, name: item.name, points: item.points, levelName: item.levelName };
    });
  }
  return stableJson_(payload);
}
function mailRecipientForCandidate_(book, run, candidate, secret) {
  var student = requireStudent_(book, candidate.studentId);
  if (run.kind === 'STUDENT_STATEMENT') {
    if (!student.email) throw srError_('mail_recipient_changed', 'The managed student mailbox is unavailable.');
    return { email: student.email, recipientHash: mailRecipientHash_(student.email, secret), consentConfirmedAt: '', student: student, guardian: null };
  }
  var guardian = guardianById_(book, candidate.guardianId);
  if (!guardian || guardian.studentId !== student.id || !guardian.active || !guardian.consentConfirmedAt || !guardian.guardianEmail) throw srError_('mail_recipient_changed', 'Guardian authorization is no longer valid.');
  return {
    email: guardian.guardianEmail, recipientHash: mailRecipientHash_(guardian.guardianEmail, secret),
    consentConfirmedAt: guardian.consentConfirmedAt, student: student, guardian: guardian
  };
}
function resolveCurrentMailRecipient_(book, delivery) {
  assertMailDeliverySignature_(delivery);
  var secret = mailDeliverySecret_(false), student = studentById_(book, delivery.studentId);
  if (!student || !student.active) throw srError_('mail_recipient_changed', 'The student is no longer active for this delivery.');
  if (delivery.kind === 'STUDENT_STATEMENT') {
    if (!student.email || !secureTextEqual_(delivery.recipientHash, mailRecipientHash_(student.email, secret))) throw srError_('mail_recipient_changed', 'The managed student mailbox changed before delivery.');
    return { email: student.email, student: student, guardian: null, legacyRecipientHash: hash_(student.email) };
  }
  var guardian = guardianById_(book, delivery.guardianId);
  if (!guardian || guardian.studentId !== delivery.studentId || !guardian.active || !guardian.consentConfirmedAt ||
      guardian.consentConfirmedAt !== delivery.consentConfirmedAt || !guardian.guardianEmail ||
      !secureTextEqual_(delivery.recipientHash, mailRecipientHash_(guardian.guardianEmail, secret))) {
    throw srError_('mail_recipient_changed', 'Guardian address, consent, status, or student mapping changed before delivery.');
  }
  return { email: guardian.guardianEmail, student: student, guardian: guardian, legacyRecipientHash: hash_(guardian.guardianEmail) };
}
function mailMessageForDelivery_(book, delivery, recipient) {
  assertMailDeliverySignature_(delivery);
  var payload = JSON.parse(delivery.payloadJson), config = configMap_(book);
  if (delivery.kind === 'STUDENT_STATEMENT') {
    var availability = { balance: payload.balance, reservedPoints: payload.reservedPoints, availableBalance: payload.availableBalance };
    recipient.student.language = studentLanguage_(book, recipient.student.id);
    return {
      to: recipient.email, subject: statementCopy_(recipient.student.language).subject(config),
      name: (config.schoolName || 'School') + ' School Rewards',
      body: statementText_(recipient.student, availability, payload.asOf, config, payload.window, payload.prizes || []),
      htmlBody: statementHtml_(recipient.student, availability, payload.asOf, config, payload.window, payload.prizes || [])
    };
  }
  var guardianAvailability = { balance: payload.balance, reservedPoints: payload.reservedPoints, availableBalance: payload.availableBalance };
  var digest = guardianDigestBodies_(recipient.guardian, recipient.student, guardianAvailability, payload.earned, payload.progress || [], config, payload.asOf);
  return {
    to: recipient.email, subject: (config.schoolName || 'School') + ' positive rewards update',
    name: (config.schoolName || 'School') + ' School Rewards', body: digest.body, htmlBody: digest.htmlBody
  };
}
function legacyMailSent_(book, run, candidate, recipient) {
  if (run.kind === 'STUDENT_STATEMENT') return !!statementKeys_(book)[candidate.studentId + '|' + run.periodKey];
  return !!guardianDigestKeys_(book)[candidate.studentId + '|' + hash_(recipient.email) + '|' + run.periodKey];
}
function startAndProcessMailRun_(kind, periodKey, requestedLimit, chunkSize, actor, requestKey) {
  var runId = '', startError = null;
  try { runId = locked_(function() {
    var book = book_(); requireMailSchemaV6_(book);
    var secret = mailDeliverySecret_(false), id = 'mailrun_' + hash_(SR_SERVICE + '|mail-run|' + requestKey).slice(0, 48);
    if (!secret) throw srError_('mail_integrity', 'The mail delivery signing secret is unavailable. Restore the original Script Property before sending mail.');
    requireMailSafetySweep_();
    var matches = mailRuns_(book).filter(function(run) { return run.id === id; });
    if (matches.length > 1) throw srError_('mail_integrity', 'The deterministic mail run id appears more than once.');
    var actorHash = mailActorHash_(actor.email, secret);
    if (matches.length) {
      var prior = matches[0]; assertMailRunSignature_(prior);
      if (prior.kind !== kind || prior.periodKey !== periodKey || prior.requestedLimit !== requestedLimit || !secureTextEqual_(prior.actorHash, actorHash)) throw srError_('idempotency_conflict', 'That mail request key was already used for a different run.');
      reconcileMailRunManifestProgress_(book, prior);
      prior = mailRunById_(book, prior.id);
      reconcileMailRunAudits_(prior, actor);
      return prior.id;
    }
    var at = now_(), run = {
      id: id, kind: kind, periodKey: periodKey, requestedLimit: requestedLimit, cursorKey: mailCandidateManifestJson_(book, kind, requestedLimit),
      attempted: 0, sent: 0, skipped: 0, failed: 0, uncertain: 0, status: 'QUEUED',
      actorHash: actorHash, operationHash: '', createdAt: at, updatedAt: at, completedAt: '', lastError: ''
    };
    run.operationHash = mailRunOperationHash_(run, secret);
    upsertMailRun_(book, run); SpreadsheetApp.flush();
    scheduleMailContinuationLocked_(SR_MAIL_CONTINUATION_DELAY_MS);
    coreFault_('mail:after_start');
    reconcileMailRunAudits_(run, actor);
    return run.id;
  }); } catch (startFailure) { startError = startFailure; }
  if (startError) {
    try { ensureMailContinuationForAnyRun_(); } catch (_) {}
    throw startError;
  }
  return processMailRun_(runId, chunkSize, actor);
}
function reconcileMailRunAudits_(run, actor) {
  appendAuditOnce_({ event: 'MAIL_RUN_CREATED', type: 'mail_run', id: run.id, summary: run.kind + ' run queued for period ' + run.periodKey }, actor);
  if (run.status === 'COMPLETED') appendAuditOnce_({ event: 'MAIL_RUN_COMPLETED', type: 'mail_run', id: run.id, summary: run.kind + ' run completed with ' + run.sent + ' sent and ' + run.failed + ' failed' }, actor);
  if (run.status === 'NEEDS_REVIEW') appendAuditOnce_({ event: 'MAIL_RUN_NEEDS_REVIEW', type: 'mail_run', id: run.id, summary: run.kind + ' run paused for delivery verification' }, actor);
}
function reconcileMailRunManifestProgress_(book, run) {
  assertMailRunSignature_(run);
  var manifest = mailCandidateManifest_(run), allDeliveries = mailOutbox_(book);
  allDeliveries.forEach(function(delivery) { assertMailDeliverySignature_(delivery); });
  var linked = allDeliveries.filter(function(delivery) { return delivery.runId === run.id; });
  var primary = linked.filter(function(delivery) { return !delivery.retryOfId; });
  var expectedIndex = primary.length + run.skipped;
  if (manifest.i > expectedIndex || expectedIndex > manifest.c.length) throw srError_('mail_integrity', 'Mail run manifest progress is inconsistent with its signed delivery attempts.');
  var changed = false;
  while (manifest.i < expectedIndex) {
    var candidate = mailManifestCandidate_(manifest);
    var deliveryKey = mailDeliveryKey_(run.kind, run.periodKey, candidate.studentId, candidate.guardianId);
    var matches = primary.filter(function(delivery) { return delivery.deliveryKey === deliveryKey; });
    if (matches.length !== 1) throw srError_('mail_integrity', 'Mail run manifest cannot be reconciled to exactly one signed delivery attempt.');
    advanceMailManifest_(run, manifest);
    changed = true;
  }
  if (changed || run.attempted !== linked.length + run.skipped) {
    refreshMailRunCounters_(book, run, run.status, run.lastError);
    SpreadsheetApp.flush();
  }
  return run;
}
function reconcileAbandonedMailPending_(book, run) {
  var pending = mailOutbox_(book).filter(function(item) { return item.runId === run.id && item.status === 'PENDING'; });
  if (!pending.length) return '';
  var at = now_(), changed = false;
  pending.forEach(function(delivery) {
    assertMailDeliverySignature_(delivery);
    if (mailPendingIsStale_(delivery)) {
      delivery.status = 'UNKNOWN'; delivery.settledAt = at; delivery.errorCode = 'DELIVERY_AMBIGUOUS';
      delivery.error = 'Delivery could not be confirmed after an interrupted attempt.';
      signMailDelivery_(delivery);
      upsertMailOutbox_(book, delivery);
      changed = true;
    }
  });
  if (changed) {
    refreshMailRunCounters_(book, run, 'NEEDS_REVIEW', 'DELIVERY_AMBIGUOUS');
    SpreadsheetApp.flush();
    return 'STALE';
  }
  return 'IN_FLIGHT';
}
function mailPendingIsStale_(delivery) {
  var attempted = new Date(String(delivery.attemptedAt || delivery.createdAt || '')).getTime();
  return !isFinite(attempted) || new Date().getTime() - attempted >= SR_MAIL_PENDING_STALE_MS;
}
function assertMailRecipientMutationAllowed_(book, studentId, guardianId) {
  if (!book.getSheetByName('MailOutbox') || !book.getSheetByName('MailRuns')) return;
  var deliveries = mailOutbox_(book);
  deliveries.forEach(function(delivery) { assertMailDeliverySignature_(delivery); });
  var matches = deliveries.filter(function(delivery) {
    return delivery.status === 'PENDING' && delivery.studentId === studentId && (!guardianId || delivery.guardianId === guardianId);
  });
  if (!matches.length) return;
  var stale = [], fresh = [];
  matches.forEach(function(delivery) {
    (mailPendingIsStale_(delivery) ? stale : fresh).push(delivery);
  });
  if (fresh.length) throw srError_('mail_recipient_locked', 'Recipient details cannot change while a fresh mail attempt is in flight. Wait for delivery settlement.');
  var at = now_(), runs = {};
  stale.forEach(function(delivery) {
    delivery.status = 'UNKNOWN'; delivery.settledAt = at; delivery.errorCode = 'DELIVERY_AMBIGUOUS';
    delivery.error = 'Delivery could not be confirmed before recipient details changed.';
    signMailDelivery_(delivery); upsertMailOutbox_(book, delivery); runs[delivery.runId] = true;
  });
  Object.keys(runs).forEach(function(runId) {
    var run = mailRunById_(book, runId);
    if (!run) throw srError_('mail_integrity', 'A pending recipient lease references a missing run.');
    assertMailRunSignature_(run);
    refreshMailRunCounters_(book, run, 'NEEDS_REVIEW', 'DELIVERY_AMBIGUOUS');
  });
  SpreadsheetApp.flush();
}
function refreshMailRunCounters_(book, run, status, lastError) {
  var progress = mailRunProgress_(book, run);
  run.attempted = progress.attempted; run.sent = progress.sent; run.failed = progress.failed; run.uncertain = progress.uncertain;
  if (status) run.status = status;
  run.lastError = text_(lastError, 80, '');
  run.updatedAt = now_();
  if (run.status === 'COMPLETED' && !run.completedAt) run.completedAt = run.updatedAt;
  if (run.status !== 'COMPLETED') run.completedAt = '';
  signMailRun_(run);
  upsertMailRun_(book, run);
  return progress;
}
function prepareNextMailDelivery_(runId) {
  return locked_(function() {
    var book = book_(), run = mailRunById_(book, runId);
    if (!run) throw srError_('not_found', 'Mail run was not found.');
    assertMailRunSignature_(run);
    if (['COMPLETED', 'FAILED', 'NEEDS_REVIEW'].indexOf(run.status) >= 0) return { action: 'STOP' };
    var progress = mailRunProgress_(book, run);
    if (progress.candidateProgress >= run.requestedLimit) return { action: 'DONE' };
    var manifest = mailCandidateManifest_(run), candidate = mailManifestCandidate_(manifest);
    if (!candidate) return { action: 'DONE' };
    var secret = mailDeliverySecret_(false), recipient;
    try { recipient = mailRecipientForCandidate_(book, run, candidate, secret); }
    catch (recipientError) {
      advanceMailManifest_(run, manifest); run.skipped++; refreshMailRunCounters_(book, run, 'RUNNING', 'RECIPIENT_INVALID');
      return { action: 'SKIP' };
    }
    var deliveryKey = mailDeliveryKey_(run.kind, run.periodKey, candidate.studentId, candidate.guardianId);
    var prior = mailOutbox_(book).filter(function(item) { return item.deliveryKey === deliveryKey; });
    var exactPrimary = null;
    for (var p = 0; p < prior.length; p++) {
      assertMailDeliverySignature_(prior[p]);
      if (prior[p].runId === run.id && !prior[p].retryOfId) exactPrimary = prior[p];
    }
    if (exactPrimary) {
      advanceMailManifest_(run, manifest);
      refreshMailRunCounters_(book, run, exactPrimary.status === 'PENDING' || exactPrimary.status === 'UNKNOWN' ? 'NEEDS_REVIEW' : 'RUNNING', exactPrimary.status === 'PENDING' || exactPrimary.status === 'UNKNOWN' ? 'DELIVERY_AMBIGUOUS' : '');
      return { action: exactPrimary.status === 'PENDING' || exactPrimary.status === 'UNKNOWN' ? 'STOP' : 'SKIP' };
    }
    for (var q = 0; q < prior.length; q++) {
      if (prior[q].status === 'PENDING' || prior[q].status === 'UNKNOWN') {
        refreshMailRunCounters_(book, run, 'NEEDS_REVIEW', 'DELIVERY_AMBIGUOUS');
        return { action: 'STOP' };
      }
    }
    if (prior.length || legacyMailSent_(book, run, candidate, recipient)) {
      advanceMailManifest_(run, manifest); run.skipped++; refreshMailRunCounters_(book, run, 'RUNNING', '');
      return { action: 'SKIP' };
    }
    var at = now_(), payloadJson = mailPayloadForCandidate_(book, run, candidate, at);
    var delivery = {
      id: mailOutboxId_(deliveryKey, ''), runId: run.id, deliveryKey: deliveryKey, kind: run.kind,
      studentId: candidate.studentId, guardianId: candidate.guardianId, recipientHash: recipient.recipientHash,
      consentConfirmedAt: recipient.consentConfirmedAt, periodKey: run.periodKey, payloadJson: payloadJson,
      payloadHash: '', status: 'PENDING', createdAt: at, attemptedAt: at, settledAt: '',
      errorCode: '', error: '', retryOfId: '', resolvedAt: '', resolvedByHash: '', resolutionNote: ''
    };
    delivery.payloadHash = mailOutboxSignature_(delivery, secret);
    scheduleMailContinuationLocked_(SR_MAIL_PENDING_STALE_MS);
    coreFault_('mail:before_pending');
    upsertMailOutbox_(book, delivery);
    coreFault_('mail:after_pending_row');
    advanceMailManifest_(run, manifest); refreshMailRunCounters_(book, run, 'RUNNING', '');
    SpreadsheetApp.flush();
    var current = resolveCurrentMailRecipient_(book, delivery);
    var message = mailMessageForDelivery_(book, delivery, current);
    coreFault_('mail:after_pending');
    return { action: 'SEND', deliveryId: delivery.id, message: message, legacyRecipientHash: current.legacyRecipientHash };
  });
}
function projectMailDelivery_(book, delivery, legacyRecipientHash) {
  var payload;
  try { payload = JSON.parse(delivery.payloadJson); } catch (_) { return; }
  if (delivery.kind === 'STUDENT_STATEMENT') {
    upsert_(sheet_(book, 'Statements'), 7, delivery.id, safeRow_([
      delivery.id, delivery.studentId, delivery.periodKey, number_(payload.balance), delivery.status,
      delivery.settledAt || delivery.attemptedAt, delivery.status === 'SENT' ? '' : delivery.errorCode
    ]));
  } else {
    upsert_(sheet_(book, 'GuardianDigests'), 7, delivery.id, safeRow_([
      delivery.id, delivery.studentId, legacyRecipientHash || delivery.recipientHash, delivery.periodKey,
      delivery.status, delivery.settledAt || delivery.attemptedAt, delivery.status === 'SENT' ? '' : delivery.errorCode
    ]));
  }
}
function reconcileMailRunProjections_(book, run) {
  mailOutbox_(book).filter(function(delivery) { return delivery.runId === run.id && delivery.status !== 'PENDING'; }).forEach(function(delivery) {
    assertMailDeliverySignature_(delivery);
    projectMailDelivery_(book, delivery, delivery.recipientHash);
  });
}
function settleMailDelivery_(deliveryId, status, errorCode, legacyRecipientHash) {
  return locked_(function() {
    var book = book_(), delivery = mailOutboxById_(book, deliveryId);
    if (!delivery) throw srError_('mail_integrity', 'The queued mail delivery is missing.');
    assertMailDeliverySignature_(delivery);
    if (delivery.status !== 'PENDING') {
      if (delivery.status === status) return delivery;
      throw srError_('mail_delivery_state', 'Mail delivery changed before settlement.');
    }
    coreFault_('mail:before_settle');
    delivery.status = status; delivery.settledAt = now_(); delivery.errorCode = text_(errorCode, 80, '');
    delivery.error = status === 'UNKNOWN' ? 'Mail service outcome could not be confirmed.' : '';
    signMailDelivery_(delivery);
    upsertMailOutbox_(book, delivery);
    coreFault_('mail:after_outbox_settle');
    projectMailDelivery_(book, delivery, legacyRecipientHash);
    var run = mailRunById_(book, delivery.runId);
    if (!run) throw srError_('mail_integrity', 'The mail delivery run is missing.');
    assertMailRunSignature_(run);
    refreshMailRunCounters_(book, run, status === 'UNKNOWN' ? 'NEEDS_REVIEW' : 'RUNNING', status === 'UNKNOWN' ? delivery.errorCode : '');
    SpreadsheetApp.flush();
    coreFault_('mail:after_settle');
    return delivery;
  });
}
function finalizeMailRun_(runId, quotaLimited, actor) {
  return locked_(function() {
    var book = book_(), run = mailRunById_(book, runId);
    if (!run) throw srError_('not_found', 'Mail run was not found.');
    assertMailRunSignature_(run);
    var progress = mailRunProgress_(book, run), remaining = mailRunRemaining_(book, run, progress), status;
    if (progress.pending || progress.uncertain) status = 'NEEDS_REVIEW';
    else if (!remaining) status = 'COMPLETED';
    else status = quotaLimited ? 'PAUSED_QUOTA' : 'RUNNING';
    refreshMailRunCounters_(book, run, status, status === 'PAUSED_QUOTA' ? 'MAIL_QUOTA_RESERVED' : status === 'NEEDS_REVIEW' ? 'DELIVERY_AMBIGUOUS' : '');
    coreFault_('mail:after_finalize');
    reconcileMailRunAudits_(run, actor);
    return mailRunDto_(book, run);
  });
}
function mailRunResponse_(runDto) {
  return {
    ok: runDto.failed === 0 && runDto.uncertain === 0 && runDto.pending === 0,
    runId: runDto.id, kind: runDto.kind, periodKey: runDto.periodKey, status: runDto.status,
    attempted: runDto.attempted, sent: runDto.sent, skipped: runDto.skipped, failed: runDto.failed,
    uncertain: runDto.uncertain, pending: runDto.pending, remaining: runDto.remaining,
    canResume: runDto.canResume, continuationScheduled: runDto.continuationScheduled,
    remainingQuota: mailQuota_()
  };
}
function mailWorkerLeaseSignature_(lease, secret) {
  return mailHmac_(stableJson_({ token: lease.token, runId: lease.runId, expiresAt: lease.expiresAt }), secret, 'mw1_');
}
function acquireMailWorkerLease_(runId) {
  return locked_(function() {
    var props = PropertiesService.getScriptProperties(), raw = String(props.getProperty('SR_MAIL_WORKER_LEASE') || '');
    var secret = mailDeliverySecret_(false), current = null, nowMs = new Date().getTime();
    if (!secret) throw srError_('mail_integrity', 'The mail worker signing secret is unavailable.');
    if (raw) {
      try { current = JSON.parse(raw); } catch (_) { throw srError_('mail_worker_lease_invalid', 'The mail worker lease is corrupt.'); }
      if (!current.signature || !secureTextEqual_(current.signature, mailWorkerLeaseSignature_(current, secret))) throw srError_('mail_worker_lease_invalid', 'The mail worker lease signature is invalid.');
      if (Number(current.expiresAt) > nowMs) return '';
    }
    var lease = { token: 'lease_' + hash_(uuid_() + '|' + runId + '|' + now_()).slice(0, 40), runId: runId, expiresAt: nowMs + SR_MAIL_WORKER_LEASE_MS, signature: '' };
    lease.signature = mailWorkerLeaseSignature_(lease, secret);
    props.setProperty('SR_MAIL_WORKER_LEASE', JSON.stringify(lease));
    return lease.token;
  });
}
function releaseMailWorkerLease_(token) {
  if (!token) return;
  locked_(function() {
    var props = PropertiesService.getScriptProperties(), raw = String(props.getProperty('SR_MAIL_WORKER_LEASE') || '');
    if (!raw) return;
    var current;
    try { current = JSON.parse(raw); } catch (_) { return; }
    var secret = mailDeliverySecret_(false);
    if (!secret || !current.signature || !secureTextEqual_(current.signature, mailWorkerLeaseSignature_(current, secret))) return;
    if (secureTextEqual_(current.token, token)) props.setProperty('SR_MAIL_WORKER_LEASE', '');
  });
}
function processMailRun_(runId, chunkSize, actor) {
  var leaseToken = acquireMailWorkerLease_(runId);
  if (!leaseToken) {
    scheduleMailContinuation_(SR_MAIL_CONTINUATION_DELAY_MS);
    return locked_(function() { return mailRunResponse_(mailRunDto_(book_(), mailRunById_(book_(), runId))); });
  }
  var response, workerError = null, cleanupError = null;
  try { response = processMailRunWithLease_(runId, chunkSize, actor); }
  catch (workerFailure) { workerError = workerFailure; }
  try { releaseMailWorkerLease_(leaseToken); } catch (releaseFailure) { cleanupError = releaseFailure; }
  try { ensureMailContinuationForAnyRun_(); } catch (scheduleFailure) { if (!cleanupError) cleanupError = scheduleFailure; }
  if (workerError) throw workerError;
  if (cleanupError) throw cleanupError;
  return locked_(function() { return mailRunResponse_(mailRunDto_(book_(), mailRunById_(book_(), runId))); });
}
function processMailRunWithLease_(runId, chunkSize, actor) {
  chunkSize = integer_(chunkSize == null ? SR_MAIL_CHUNK_DEFAULT : chunkSize, 1, SR_MAIL_CHUNK_MAX, 'Mail chunk size');
  var pendingState = locked_(function() {
    var book = book_(); requireMailSchemaV6_(book);
    var run = mailRunById_(book, runId);
    if (!run) throw srError_('not_found', 'Mail run was not found.');
    assertMailRunSignature_(run);
    reconcileMailRunManifestProgress_(book, run);
    run = mailRunById_(book, runId); assertMailRunSignature_(run);
    reconcileMailRunAudits_(run, actor);
    var pending = reconcileAbandonedMailPending_(book, run);
    run = mailRunById_(book, runId); assertMailRunSignature_(run);
    reconcileMailRunProjections_(book, run);
    var progress = mailRunProgress_(book, run);
    if (progress.uncertain && run.status !== 'NEEDS_REVIEW') refreshMailRunCounters_(book, run, 'NEEDS_REVIEW', 'DELIVERY_AMBIGUOUS');
    run = mailRunById_(book, runId); assertMailRunSignature_(run);
    reconcileMailRunAudits_(run, actor);
    return pending || (progress.uncertain ? 'AMBIGUOUS' : '');
  });
  if (pendingState) return locked_(function() { return mailRunResponse_(mailRunDto_(book_(), mailRunById_(book_(), runId))); });
  var initialAllowance = bulkMailAllowance_(), sendBudget = initialAllowance, processed = 0, quotaLimited = initialAllowance <= 0;
  while (processed < chunkSize && sendBudget > 0) {
    var prepared = prepareNextMailDelivery_(runId);
    if (prepared.action === 'STOP' || prepared.action === 'DONE') break;
    processed++;
    if (prepared.action === 'SKIP') continue;
    try { MailApp.sendEmail(prepared.message); }
    catch (_) {
      settleMailDelivery_(prepared.deliveryId, 'UNKNOWN', 'MAIL_SERVICE_AMBIGUOUS', prepared.legacyRecipientHash);
      quotaLimited = false;
      break;
    }
    coreFault_('mail:after_send');
    settleMailDelivery_(prepared.deliveryId, 'SENT', '', prepared.legacyRecipientHash);
    sendBudget--; if (sendBudget <= 0) quotaLimited = true;
  }
  var dto = finalizeMailRun_(runId, quotaLimited, actor);
  return mailRunResponse_(dto);
}
function clearMailContinuationTriggersLocked_() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) { if (trigger.getHandlerFunction() === 'continueSchoolRewardsMailRuns') ScriptApp.deleteTrigger(trigger); });
  PropertiesService.getScriptProperties().setProperties({ SR_MAIL_CONTINUATION_AT: '', SR_MAIL_CONTINUATION_REGISTRATION: '' }, false);
}
function clearMailContinuationTriggers_() { return locked_(function() { clearMailContinuationTriggersLocked_(); }); }
function scheduleMailContinuationLocked_(delayMs, replaceExisting) {
  var delay = Math.max(60000, Number(delayMs) || SR_MAIL_CONTINUATION_DELAY_MS);
  var props = PropertiesService.getScriptProperties(), desiredAt = new Date().getTime() + delay;
  var existingAt = Number(props.getProperty('SR_MAIL_CONTINUATION_AT') || 0);
  if (!replaceExisting && mailContinuationScheduled_() && existingAt && existingAt <= desiredAt) {
    try {
      var currentRegistration = readMailTriggerRegistration_('SR_MAIL_CONTINUATION_REGISTRATION', 'continueSchoolRewardsMailRuns');
      pruneMailContinuationTriggersLocked_(currentRegistration.uid);
    } catch (_) {}
    return true;
  }
  var replacement = ScriptApp.newTrigger('continueSchoolRewardsMailRuns').timeBased().after(delay).create();
  var registration = saveMailTriggerRegistration_('SR_MAIL_CONTINUATION_REGISTRATION', replacement, 'continueSchoolRewardsMailRuns', String(desiredAt));
  props.setProperty('SR_MAIL_CONTINUATION_AT', String(desiredAt));
  pruneMailContinuationTriggersLocked_(registration.uid);
  return true;
}
function pruneMailContinuationTriggersLocked_(keepUid) {
  try {
    ScriptApp.getProjectTriggers().forEach(function(trigger) {
      if (trigger.getHandlerFunction() === 'continueSchoolRewardsMailRuns' && String(trigger.getUniqueId()) !== keepUid) {
        try { ScriptApp.deleteTrigger(trigger); } catch (_) {}
      }
    });
  } catch (_) {}
}
function scheduleMailContinuation_(delayMs) { return locked_(function() { return scheduleMailContinuationLocked_(delayMs); }); }
function mailContinuationDelayForRun_(book, run) {
  var pending = mailOutbox_(book).filter(function(item) { return item.runId === run.id && item.status === 'PENDING'; });
  if (pending.length) {
    var nowMs = new Date().getTime(), remaining = SR_MAIL_PENDING_STALE_MS;
    pending.forEach(function(item) {
      var attempted = new Date(String(item.attemptedAt || item.createdAt || '')).getTime();
      if (isFinite(attempted)) remaining = Math.min(remaining, Math.max(60000, attempted + SR_MAIL_PENDING_STALE_MS - nowMs + 1000));
    });
    return remaining;
  }
  return run.status === 'PAUSED_QUOTA' ? SR_MAIL_QUOTA_DELAY_MS : SR_MAIL_CONTINUATION_DELAY_MS;
}
function mailRunNeedsContinuation_(book, run) {
  assertMailRunSignature_(run);
  var progress = mailRunProgress_(book, run);
  if (progress.pending) return true;
  return ['QUEUED', 'RUNNING', 'PAUSED_QUOTA'].indexOf(run.status) >= 0;
}
function selectNextMailRun_(book) {
  var allowance = bulkMailAllowance_(), choices = [];
  mailRuns_(book).forEach(function(run) {
    if (!mailRunNeedsContinuation_(book, run)) return;
    var progress = mailRunProgress_(book, run), priority = 9, due = String(run.createdAt || '');
    if (progress.pending) {
      var pending = progress.deliveries.filter(function(item) { return item.status === 'PENDING'; });
      var stale = pending.filter(mailPendingIsStale_);
      priority = stale.length ? 0 : 1;
      var source = (stale.length ? stale : pending).sort(function(left, right) { return String(left.attemptedAt || left.createdAt).localeCompare(String(right.attemptedAt || right.createdAt)); })[0];
      due = String(source && (source.attemptedAt || source.createdAt) || due);
    } else if (allowance > 0) priority = 2;
    else priority = run.status === 'PAUSED_QUOTA' ? 4 : 3;
    choices.push({ run: run, priority: priority, due: due });
  });
  choices.sort(function(left, right) { return left.priority - right.priority || left.due.localeCompare(right.due) || String(left.run.createdAt).localeCompare(String(right.run.createdAt)) || String(left.run.id).localeCompare(String(right.run.id)); });
  if (!choices.length) return null;
  choices[0].delay = mailContinuationDelayForRun_(book, choices[0].run);
  return choices[0];
}
function ensureMailContinuationForAnyRun_() {
  return locked_(function() {
    var book = book_(), selected = selectNextMailRun_(book);
    if (!selected) { clearMailContinuationTriggersLocked_(); return false; }
    return scheduleMailContinuationLocked_(selected.delay, true);
  });
}
function weeklyMailPeriodKey_(value) {
  var date = new Date(value), day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return 'weekly-' + date.toISOString().slice(0, 10);
}

function appendAudit_(value, actor) { var target = sheet_(book_(), 'Audit'), history = rows_(target, 10), previous = history.length ? cell_(history[history.length - 1][9]) : 'GENESIS'; var fields = safeRow_([uuid_(), value.event, value.type, value.id, text_(value.summary, 240, ''), actor.email, actor.role, now_()]).concat([previous]); target.appendRow(fields.concat(['h_' + hash_(fields.join('|'))])); }
function auditEventExists_(event, entityId) { return rows_(sheet_(book_(), 'Audit'), 10).some(function(row) { return String(row[1]) === event && String(row[3]) === entityId; }); }
function appendAuditOnce_(value, actor) {
  if (auditEventExists_(value.event, value.id)) return;
  appendAudit_(value, actor);
}
function idemKey_(value) { var key = text_(value, 120, ''); if (!/^[A-Za-z0-9:_-]{8,120}$/.test(key)) throw srError_('bad_idempotency_key', 'A stable request key is required.'); return key; }
function idemRecords_(book, key) { return rows_(sheet_(book, 'Idempotency'), 4).filter(function(row) { return String(row[0]) === key; }); }
function parseIdemPayload_(value) { try { return JSON.parse(String(value || '{}')); } catch (_) { throw srError_('idempotency_corrupt', 'The saved request record is not valid JSON. Review the integrity report.'); } }
function idemResult_(key, operation) {
  var records = idemRecords_(book_(), key);
  if (records.length > 1) throw srError_('idempotency_corrupt', 'That request key appears more than once. Review the integrity report.');
  if (!records.length) return null;
  if (String(records[0][1]) !== operation) throw srError_('idempotency_conflict', 'That request key was already used.');
  var saved = parseIdemPayload_(records[0][2]);
  if (saved && saved.journalVersion === 1) return saved.state === 'COMPLETED' ? saved.result : null;
  return saved;
}
function rememberIdem_(key, operation, result) { upsert_(sheet_(book_(), 'Idempotency'), 4, key, safeRow_([key, operation, JSON.stringify(result), now_()])); }
function operationEntityId_(kind, key) { return kind + '_' + hash_(SR_SERVICE + '|' + kind + '|' + key).slice(0, 40); }
function coreFault_(stage) { if (typeof SR_TEST_FAULT_HOOK === 'function') SR_TEST_FAULT_HOOK(stage); }
function coreJournalSecret_(createIfMissing) {
  var props = PropertiesService.getScriptProperties(), secret = String(props.getProperty('SR_CORE_JOURNAL_SECRET') || '');
  if (!secret && createIfMissing) {
    secret = hash_(uuid_() + '|' + uuid_() + '|' + now_()) + hash_(uuid_() + '|' + SR_SERVICE);
    props.setProperty('SR_CORE_JOURNAL_SECRET', secret);
  }
  return secret;
}
function coreJournalSignature_(key, operation, kind, intent, secret) {
  var message = stableJson_({ key: key, operation: operation, kind: kind, intent: intent });
  var bytes = Utilities.computeHmacSha256Signature(message, secret, Utilities.Charset.UTF_8);
  return 'h1_' + Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}
function secureTextEqual_(left, right) {
  left = String(left || ''); right = String(right || '');
  var mismatch = left.length ^ right.length, length = Math.max(left.length, right.length);
  for (var i = 0; i < length; i++) mismatch |= (left.charCodeAt(i % Math.max(1, left.length)) || 0) ^ (right.charCodeAt(i % Math.max(1, right.length)) || 0);
  return mismatch === 0;
}
function assertCoreJournalSignature_(key, operation, journal) {
  var secret = coreJournalSecret_(false);
  if (!secret || !journal.signature || !secureTextEqual_(journal.signature, coreJournalSignature_(key, operation, journal.kind, journal.intent, secret))) throw srError_('journal_signature_invalid', 'The pending operation signature is missing or invalid. No recovery writes were performed.');
}
function journalExactId_(value, label) { var normalized = id_(value, label); if (normalized !== value) throw srError_('journal_intent_invalid', 'The pending operation contains a non-canonical ' + label + ' id.'); return normalized; }
function journalExactText_(value, max, label) { if (typeof value !== 'string' || !value || text_(value, max, '') !== value) throw srError_('journal_intent_invalid', 'The pending operation contains an invalid ' + label + '.'); return value; }
function journalExactInteger_(value, min, max, label) { var normalized = integer_(value, min, max, label); if (normalized !== value) throw srError_('journal_intent_invalid', 'The pending operation contains a non-canonical ' + label + '.'); return normalized; }
function journalExactAt_(value) { var normalized = iso_(value); if (!value || normalized !== value) throw srError_('journal_intent_invalid', 'The pending operation timestamp is invalid.'); return normalized; }
function historicalCategoryById_(book, categoryId) { var list = categories_(book); for (var i = 0; i < list.length; i++) if (list[i].id === categoryId) return list[i]; return null; }
function validatePendingCoreJournal_(book, key, operation, journal) {
  assertCoreJournalSignature_(key, operation, journal);
  var kind = String(journal.kind || ''), intent = object_(journal.intent), actorEmail = normalizeEmail_(intent.actorEmail), actorRole = String(intent.actorRole || ''), allowedRoles = { award: ['admin', 'staff'], reverse: ['admin', 'staff'], checkout: ['admin', 'cashier'], refund: ['admin'], catalog: ['admin'] };
  if (!allowedRoles[kind] || allowedRoles[kind].indexOf(actorRole) < 0 || !actorEmail || actorEmail !== intent.actorEmail || emailDomain_(actorEmail) !== allowedDomain_()) throw srError_('journal_intent_invalid', 'The pending operation has an invalid original business actor.');
  var actor = { email: actorEmail, role: actorRole }, canonical, payload;
  journalExactAt_(intent.at);
  if (kind === 'award') {
    var awardStudentId = journalExactId_(intent.studentId, 'student'), awardCategoryId = journalExactId_(intent.categoryId, 'category'), awardAmount = journalExactInteger_(intent.amount, 1, SR_MAX_POINTS, 'points'), awardReason = journalExactText_(intent.reason, 180, 'award reason');
    requireStudentRecord_(book, awardStudentId);
    if (!historicalCategoryById_(book, awardCategoryId)) throw srError_('journal_intent_invalid', 'The pending award references a missing recognition category.');
    if (intent.ledgerId !== operationEntityId_('ledger', key)) throw srError_('journal_intent_invalid', 'The pending award ledger id is not deterministic.');
    canonical = { ledgerId: intent.ledgerId, studentId: awardStudentId, amount: awardAmount, reason: awardReason, categoryId: awardCategoryId, actorEmail: actorEmail, actorRole: actorRole, at: intent.at };
    payload = { studentId: awardStudentId, amount: awardAmount, reason: awardReason, categoryId: awardCategoryId };
  } else if (kind === 'reverse') {
    var originalId = journalExactId_(intent.originalId, 'ledger entry'), reverseStudentId = journalExactId_(intent.studentId, 'student'), reverseAmount = journalExactInteger_(intent.amount, -SR_MAX_POINTS, -1, 'reversal points'), reverseReason = journalExactText_(intent.reason, 180, 'reversal reason'), reverseCategoryId = journalExactId_(intent.categoryId, 'category');
    var original = ledgerById_(book, originalId);
    requireStudentRecord_(book, reverseStudentId);
    if (!historicalCategoryById_(book, reverseCategoryId) || !original || original.kind !== 'EARN' || original.studentId !== reverseStudentId || original.amount !== -reverseAmount || original.categoryId !== reverseCategoryId) throw srError_('journal_intent_invalid', 'The pending reversal source no longer matches its intent.');
    if (intent.ledgerId !== operationEntityId_('ledger', key)) throw srError_('journal_intent_invalid', 'The pending reversal ledger id is not deterministic.');
    canonical = { ledgerId: intent.ledgerId, originalId: originalId, studentId: reverseStudentId, amount: reverseAmount, reason: reverseReason, categoryId: reverseCategoryId, actorEmail: actorEmail, actorRole: actorRole, at: intent.at };
    payload = { entryId: originalId, reason: reverseReason };
  } else if (kind === 'checkout') {
    var checkoutStudentId = journalExactId_(intent.studentId, 'student'), windowId = journalExactId_(intent.windowId, 'store window'), checkoutTotal = journalExactInteger_(intent.total, 1, 500000000, 'checkout total');
    requireStudentRecord_(book, checkoutStudentId);
    if (!windowById_(book, windowId)) throw srError_('journal_intent_invalid', 'The pending checkout references a missing store window.');
    if (intent.orderId !== operationEntityId_('order', key) || intent.ledgerId !== operationEntityId_('ledger', key)) throw srError_('journal_intent_invalid', 'The pending checkout entity ids are not deterministic.');
    var checkoutLines = validateJournalLines_(book, intent.lines, checkoutTotal);
    if (intent.inventoryMovements) {
      var checkoutMovements = validateJournalInventoryMovements_(book, intent.inventoryMovements, checkoutLines, -1, 'SALE', key, 'order', intent.orderId, actor, intent.at, 'School store sale');
      canonical = { orderId: intent.orderId, ledgerId: intent.ledgerId, studentId: checkoutStudentId, windowId: windowId, total: checkoutTotal, lines: checkoutLines, inventoryMovements: checkoutMovements, actorEmail: actorEmail, actorRole: actorRole, at: intent.at };
    } else {
      var checkoutPlan = validateJournalInventoryPlan_(book, intent.inventoryPlan, checkoutLines, -1);
      canonical = { orderId: intent.orderId, ledgerId: intent.ledgerId, studentId: checkoutStudentId, windowId: windowId, total: checkoutTotal, lines: checkoutLines, inventoryPlan: checkoutPlan, actorEmail: actorEmail, actorRole: actorRole, at: intent.at };
    }
    payload = { studentId: checkoutStudentId, windowId: windowId, lines: checkoutLines.map(function(line) { return { catalogId: line.catalogId, quantity: line.quantity }; }) };
  } else if (kind === 'refund') {
    var refundOrderId = journalExactId_(intent.orderId, 'order'), sourceSpendId = journalExactId_(intent.sourceSpendId, 'ledger entry'), refundStudentId = journalExactId_(intent.studentId, 'student'), refundTotal = journalExactInteger_(intent.total, 1, 500000000, 'refund total'), refundReason = journalExactText_(intent.reason, 180, 'refund reason');
    var sourceOrder = orderById_(book, refundOrderId), sourceSpend = ledgerById_(book, sourceSpendId);
    requireStudentRecord_(book, refundStudentId);
    if (!sourceOrder || sourceOrder.studentId !== refundStudentId || sourceOrder.total !== refundTotal || ['COMPLETED', 'REFUNDED'].indexOf(sourceOrder.status) < 0) throw srError_('journal_intent_invalid', 'The pending refund order no longer matches its intent.');
    if (!sourceSpend || sourceSpend.kind !== 'SPEND' || sourceSpend.referenceType !== 'order' || sourceSpend.referenceId !== refundOrderId || sourceSpend.studentId !== refundStudentId || sourceSpend.amount !== -refundTotal) throw srError_('journal_intent_invalid', 'The pending refund source spend no longer matches its intent.');
    if (intent.ledgerId !== operationEntityId_('ledger', key)) throw srError_('journal_intent_invalid', 'The pending refund ledger id is not deterministic.');
    var refundLines = validateJournalLines_(book, intent.lines, refundTotal);
    if (stableJson_(journalLineProjectionForValidation_(orderLines_(book, refundOrderId))) !== stableJson_(refundLines)) throw srError_('journal_intent_invalid', 'The pending refund order lines no longer match its intent.');
    if (intent.inventoryMovements) {
      var refundMovements = validateJournalInventoryMovements_(book, intent.inventoryMovements, refundLines, 1, 'REFUND', key, 'order_refund', refundOrderId, actor, intent.at, refundReason);
      canonical = { orderId: refundOrderId, sourceSpendId: sourceSpendId, ledgerId: intent.ledgerId, studentId: refundStudentId, total: refundTotal, lines: refundLines, inventoryMovements: refundMovements, reason: refundReason, actorEmail: actorEmail, actorRole: actorRole, at: intent.at };
    } else {
      var refundPlan = validateJournalInventoryPlan_(book, intent.inventoryPlan, refundLines, 1);
      canonical = { orderId: refundOrderId, sourceSpendId: sourceSpendId, ledgerId: intent.ledgerId, studentId: refundStudentId, total: refundTotal, lines: refundLines, inventoryPlan: refundPlan, reason: refundReason, actorEmail: actorEmail, actorRole: actorRole, at: intent.at };
    }
    payload = { orderId: refundOrderId, reason: refundReason };
  } else {
    var catalogValidation = validateCatalogJournalIntent_(book, key, intent, actor);
    canonical = catalogValidation.intent; payload = catalogValidation.payload;
  }
  if (stableJson_(canonical) !== stableJson_(intent)) throw srError_('journal_intent_invalid', 'The pending operation intent is not canonical.');
  if (printIdemOperation_(kind, actor, payload) !== operation) throw srError_('journal_operation_invalid', 'The pending operation digest does not match its signed intent.');
  return actor;
}
function journalLineProjectionForValidation_(lines) { return (lines || []).map(function(line) { return { catalogId: line.catalogId, itemName: line.itemName, quantity: line.quantity, unitCost: line.unitCost, lineTotal: line.lineTotal }; }); }
function validateJournalLines_(book, value, expectedTotal) {
  if (!Array.isArray(value) || !value.length || value.length > 50) throw srError_('journal_intent_invalid', 'The pending store operation has an invalid line count.');
  var seen = {}, total = 0, previous = '', out = [], catalogById = {}; catalog_(book).forEach(function(item) { catalogById[item.id] = item; });
  value.forEach(function(line) {
    line = object_(line); var catalogId = journalExactId_(line.catalogId, 'catalog item'), itemName = journalExactText_(line.itemName, 120, 'item name'), quantity = journalExactInteger_(line.quantity, 1, 5000, 'item quantity'), unitCost = journalExactInteger_(line.unitCost, 1, 100000, 'unit cost'), lineTotal = journalExactInteger_(line.lineTotal, 1, 500000000, 'line total'), item = catalogById[catalogId];
    if (seen[catalogId] || (previous && catalogId < previous) || !item || item.name !== itemName || item.cost !== unitCost || lineTotal !== quantity * unitCost) throw srError_('journal_intent_invalid', 'The pending store line does not match the canonical catalog transaction.');
    seen[catalogId] = true; previous = catalogId; total += lineTotal;
    out.push({ catalogId: catalogId, itemName: itemName, quantity: quantity, unitCost: unitCost, lineTotal: lineTotal });
  });
  if (total !== expectedTotal) throw srError_('journal_intent_invalid', 'The pending store line totals do not match the operation total.');
  return out;
}
function validateJournalInventoryPlan_(book, value, lines, direction) {
  if (!Array.isArray(value)) throw srError_('journal_intent_invalid', 'The pending inventory plan is invalid.');
  var lineById = {}, planById = {}, out = [], catalogById = {}; lines.forEach(function(line) { lineById[line.catalogId] = line; }); catalog_(book).forEach(function(item) { catalogById[item.id] = item; });
  value.forEach(function(target) {
    target = object_(target); var catalogId = journalExactId_(target.catalogId, 'catalog item'), line = lineById[catalogId], item = catalogById[catalogId], limit = journalExactInteger_(target.inventoryLimit, 0, 100000, 'inventory limit'), before = journalExactInteger_(target.beforeRemaining, 0, limit, 'inventory before'), after = journalExactInteger_(target.afterRemaining, 0, limit, 'inventory after');
    if (planById[catalogId] || !line || !item || item.inventoryLimit !== limit || after !== before + direction * line.quantity || (item.remaining !== before && item.remaining !== after)) throw srError_('journal_intent_invalid', 'Inventory changed; the pending inventory plan delta no longer matches its catalog line.');
    planById[catalogId] = true; out.push({ catalogId: catalogId, inventoryLimit: limit, beforeRemaining: before, afterRemaining: after });
  });
  lines.forEach(function(line) { var item = catalogById[line.catalogId]; if (!!planById[line.catalogId] !== !!(item && item.inventoryLimit >= 0)) throw srError_('journal_intent_invalid', 'The pending inventory plan does not exactly cover finite-inventory lines.'); });
  return out;
}
function validateJournalInventoryMovements_(book, value, lines, direction, kind, key, referenceType, referenceId, actor, at, reason) {
  if (!Array.isArray(value) || value.length !== lines.length) throw srError_('journal_intent_invalid', 'The pending inventory movement list does not exactly cover its order lines.');
  var lineById = {}, seen = {}, out = [];
  lines.forEach(function(line) { lineById[line.catalogId] = line; });
  value.forEach(function(raw) {
    var movement = validateInventoryMovementEnvelope_(book, raw);
    var line = lineById[movement.catalogId], expectedReason = safeRow_([text_(reason, 180, '')])[0];
    if (!line || seen[movement.catalogId] || movement.kind !== kind || movement.quantityDelta !== direction * line.quantity ||
        movement.beforeLimit !== movement.afterLimit || movement.referenceType !== referenceType || movement.referenceId !== referenceId ||
        movement.actorEmail !== actor.email || movement.actorRole !== actor.role || movement.at !== at || movement.idempotencyKey !== key ||
        movement.reason !== expectedReason || movement.id !== inventoryMovementId_(kind, key, movement.catalogId, movement.version)) {
      throw srError_('journal_intent_invalid', 'A pending inventory movement does not match its signed order line.');
    }
    if (movement.beforeLimit < 0) {
      if (movement.beforeRemaining !== -1 || movement.afterRemaining !== -1) throw srError_('journal_intent_invalid', 'Unlimited inventory movement markers are invalid.');
    } else if (movement.afterRemaining !== movement.beforeRemaining + movement.quantityDelta || movement.beforeRemaining < 0 || movement.beforeRemaining > movement.beforeLimit || movement.afterRemaining < 0 || movement.afterRemaining > movement.afterLimit) {
      throw srError_('journal_intent_invalid', 'Finite inventory movement arithmetic is invalid.');
    }
    assertPendingMovementRepositoryState_(book, movement);
    seen[movement.catalogId] = true; out.push(movement);
  });
  lines.forEach(function(line) { if (!seen[line.catalogId]) throw srError_('journal_intent_invalid', 'A pending store line has no inventory movement.'); });
  return out;
}
function validateInventoryMovementEnvelope_(book, raw) {
  raw = object_(raw);
  var movement = {
    id: journalExactId_(raw.id, 'inventory movement'), catalogId: journalExactId_(raw.catalogId, 'catalog item'),
    version: journalExactInteger_(raw.version, 1, 100000000, 'inventory version'), kind: journalExactText_(raw.kind, 30, 'inventory movement kind'),
    quantityDelta: journalExactInteger_(raw.quantityDelta, -5000, 5000, 'inventory quantity delta'),
    beforeLimit: journalExactInteger_(raw.beforeLimit, -1, 100000, 'inventory before limit'), beforeRemaining: journalExactInteger_(raw.beforeRemaining, -1, 100000, 'inventory before remaining'),
    afterLimit: journalExactInteger_(raw.afterLimit, -1, 100000, 'inventory after limit'), afterRemaining: journalExactInteger_(raw.afterRemaining, -1, 100000, 'inventory after remaining'),
    referenceType: journalExactText_(raw.referenceType, 40, 'inventory reference type'), referenceId: journalExactText_(raw.referenceId, 80, 'inventory reference'),
    actorEmail: journalExactText_(raw.actorEmail, 254, 'inventory actor'), actorRole: journalExactText_(raw.actorRole, 20, 'inventory actor role'),
    at: journalExactAt_(raw.at), idempotencyKey: idemKey_(raw.idempotencyKey), reason: journalExactText_(raw.reason, 180, 'inventory reason'),
    previousHash: journalExactText_(raw.previousHash, 100, 'inventory previous hash'), hash: journalExactText_(raw.hash, 100, 'inventory hash')
  };
  if (stableJson_(movement) !== stableJson_(raw) || inventoryMovementHash_(movement) !== movement.hash) throw srError_('journal_intent_invalid', 'A pending inventory movement is not canonical or its hash is invalid.');
  return movement;
}
function assertPendingMovementRepositoryState_(book, movement) {
  var matches = inventoryMovements_(book).filter(function(item) { return item.id === movement.id; });
  if (matches.length > 1 || (matches.length === 1 && stableJson_(matches[0]) !== stableJson_(movement))) throw srError_('journal_intent_invalid', 'The pending inventory movement conflicts with the repository.');
  var current = catalogById_(book, movement.catalogId);
  var before = sameInventorySnapshot_(current, movement.beforeLimit, movement.beforeRemaining, movement.version - 1);
  var after = sameInventorySnapshot_(current, movement.afterLimit, movement.afterRemaining, movement.version);
  if (!before && !after) throw srError_('recovery_ambiguous', 'Inventory changed and is neither the signed before state nor the signed after state.');
  if (!matches.length && !before) throw srError_('journal_intent_invalid', 'Inventory reached the after state without its signed movement.');
  if (current && current.inventoryVersion >= 1) assertInventoryChainPrefixMatchesCatalog_(book, current);
  var prior = inventoryMovements_(book).filter(function(item) { return item.catalogId === movement.catalogId && item.version === movement.version - 1; });
  if (movement.version === 1) {
    if (movement.previousHash !== 'GENESIS') throw srError_('journal_intent_invalid', 'Inventory genesis hash is invalid.');
  } else if (prior.length !== 1 || prior[0].hash !== movement.previousHash || prior[0].afterLimit !== movement.beforeLimit || prior[0].afterRemaining !== movement.beforeRemaining) {
    throw srError_('journal_intent_invalid', 'Inventory movement does not continue its item hash chain.');
  }
}
function validateCatalogJournalIntent_(book, key, intent, actor) {
  var payload = normalizeCatalogRequest_(intent.payload);
  if (stableJson_(payload) !== stableJson_(intent.payload)) throw srError_('journal_intent_invalid', 'The pending catalog request payload is not canonical.');
  var mode = String(intent.mode || ''), item = object_(intent.item), itemId = journalExactId_(item.id, 'catalog item');
  if (['CREATE', 'METADATA', 'INVENTORY'].indexOf(mode) < 0 || (mode === 'CREATE' && itemId !== operationEntityId_('catalog', key)) || (mode !== 'CREATE' && itemId !== payload.id)) throw srError_('journal_intent_invalid', 'The pending catalog operation mode or item id is invalid.');
  var canonicalItem = {
    id: itemId, name: journalExactText_(item.name, 120, 'catalog name'), description: text_(item.description, 500, ''),
    cost: journalExactInteger_(item.cost, 1, 100000, 'catalog cost'), inventoryLimit: journalExactInteger_(item.inventoryLimit, -1, 100000, 'catalog limit'),
    remaining: journalExactInteger_(item.remaining, -1, 100000, 'catalog remaining'), active: item.active === true,
    imageUrl: httpsUrl_(item.imageUrl || ''), createdAt: journalExactAt_(item.createdAt), updatedAt: journalExactAt_(item.updatedAt),
    inventoryVersion: journalExactInteger_(item.inventoryVersion, 1, 100000000, 'catalog inventory version')
  };
  if (stableJson_(canonicalItem) !== stableJson_(item) ||
      (payload.nameProvided && canonicalItem.name !== payload.name) ||
      (payload.descriptionProvided && canonicalItem.description !== payload.description) ||
      (payload.costProvided && canonicalItem.cost !== payload.cost) ||
      (payload.activeProvided && canonicalItem.active !== payload.active) ||
      (payload.imageUrlProvided && canonicalItem.imageUrl !== payload.imageUrl) ||
      canonicalItem.updatedAt !== intent.at) throw srError_('journal_intent_invalid', 'Pending catalog item metadata is not canonical or does not match its request.');
  var movements = Array.isArray(intent.inventoryMovements) ? intent.inventoryMovements.map(function(raw) { return validateInventoryMovementEnvelope_(book, raw); }) : [];
  if (mode === 'METADATA') {
    if (movements.length || payload.remainingProvided || (payload.inventoryLimitProvided && payload.inventoryLimit !== canonicalItem.inventoryLimit)) throw srError_('journal_intent_invalid', 'Metadata-only catalog intent attempts to change inventory.');
    var current = catalogById_(book, itemId);
    if (!current || !sameInventorySnapshot_(current, canonicalItem.inventoryLimit, canonicalItem.remaining, canonicalItem.inventoryVersion)) throw srError_('journal_intent_invalid', 'Metadata-only catalog inventory no longer matches its intent.');
    assertInventoryChainTailMatchesCatalog_(book, current);
  } else {
    if (movements.length !== 1 || movements[0].catalogId !== itemId || movements[0].afterLimit !== canonicalItem.inventoryLimit || movements[0].afterRemaining !== canonicalItem.remaining || movements[0].version !== canonicalItem.inventoryVersion || movements[0].actorEmail !== actor.email || movements[0].actorRole !== actor.role || movements[0].at !== intent.at || movements[0].idempotencyKey !== key) throw srError_('journal_intent_invalid', 'Pending catalog movement does not match its target item.');
    if (mode === 'CREATE' && (movements[0].kind !== 'INITIALIZE' || movements[0].version !== 1 || movements[0].previousHash !== 'GENESIS')) throw srError_('journal_intent_invalid', 'New catalog item initialization movement is invalid.');
    if (mode === 'INVENTORY' && movements[0].kind !== 'ADMIN_ADJUST') throw srError_('journal_intent_invalid', 'Catalog inventory adjustment movement is invalid.');
    assertPendingMovementRepositoryStateForCatalog_(book, movements[0], mode);
  }
  var canonical = { mode: mode, payload: payload, item: canonicalItem, inventoryMovements: movements, actorEmail: actor.email, actorRole: actor.role, at: intent.at };
  return { intent: canonical, payload: payload };
}
function assertPendingMovementRepositoryStateForCatalog_(book, movement, mode) {
  if (mode !== 'CREATE') return assertPendingMovementRepositoryState_(book, movement);
  var matches = inventoryMovements_(book).filter(function(item) { return item.id === movement.id; }), current = catalogById_(book, movement.catalogId);
  if (matches.length > 1 || (matches.length === 1 && stableJson_(matches[0]) !== stableJson_(movement))) throw srError_('journal_intent_invalid', 'Catalog initialization movement conflicts with the repository.');
  if (!matches.length && current) throw srError_('journal_intent_invalid', 'Catalog item exists without its initialization movement.');
  if (matches.length && current && !sameInventorySnapshot_(current, movement.afterLimit, movement.afterRemaining, movement.version)) throw srError_('journal_intent_invalid', 'Catalog initialization snapshot conflicts with its movement.');
}
function pendingCoreJournals_(book) {
  var pending = [];
  rows_(sheet_(book, 'Idempotency'), 4).forEach(function(row) {
    var saved;
    try { saved = JSON.parse(String(row[2] || '{}')); } catch (_) { return; }
    if (saved && saved.journalVersion === 1 && saved.state !== 'COMPLETED') pending.push({ key: String(row[0]), operation: String(row[1]), state: String(saved.state || ''), kind: String(saved.kind || ''), createdAt: cell_(saved.createdAt), updatedAt: cell_(saved.updatedAt) });
  });
  return pending;
}
function assertNoPendingCoreOperation_(book, exceptKey) {
  var pending = pendingCoreJournals_(book).filter(function(item) { return item.key !== exceptKey; });
  if (pending.length) throw srError_('recovery_required', 'A previous rewards transaction must be retried or reviewed before another core transaction can start.');
}
function loadCoreOperation_(book, key, operation, kind) {
  var records = idemRecords_(book, key);
  if (records.length > 1) throw srError_('idempotency_corrupt', 'That request key appears more than once. Review the integrity report.');
  if (!records.length) return null;
  if (String(records[0][1]) !== operation) throw srError_('idempotency_conflict', 'That request key was already used.');
  var saved = parseIdemPayload_(records[0][2]);
  if (!saved || saved.journalVersion !== 1) return { legacy: true, result: saved };
  if (saved.kind !== kind || !saved.intent || ['INTENT', 'MUTATIONS_APPLIED', 'COMPLETED'].indexOf(saved.state) < 0) throw srError_('idempotency_corrupt', 'The saved operation journal is invalid. Review the integrity report.');
  return { journal: saved, result: saved.state === 'COMPLETED' ? saved.result : null };
}
function startCoreOperation_(book, key, operation, kind, intent) {
  assertNoPendingCoreOperation_(book, key);
  var at = now_(), journal = { journalVersion: 1, kind: kind, state: 'INTENT', intent: intent, createdAt: at, updatedAt: at };
  journal.signature = coreJournalSignature_(key, operation, kind, intent, coreJournalSecret_(true));
  upsert_(sheet_(book, 'Idempotency'), 4, key, safeRow_([key, operation, JSON.stringify(journal), at]));
  if (SpreadsheetApp && typeof SpreadsheetApp.flush === 'function') SpreadsheetApp.flush();
  return { journal: journal, result: null };
}
function saveCoreOperation_(book, key, operation, journal, state, result) {
  journal.state = state; journal.updatedAt = now_();
  if (state === 'COMPLETED') journal.result = result;
  upsert_(sheet_(book, 'Idempotency'), 4, key, safeRow_([key, operation, JSON.stringify(journal), journal.updatedAt]));
}
function markCoreOperationApplied_(book, key, operation, journal) { if (journal.state !== 'COMPLETED') saveCoreOperation_(book, key, operation, journal, 'MUTATIONS_APPLIED'); }
function completeCoreOperation_(book, key, operation, journal, result) { saveCoreOperation_(book, key, operation, journal, 'COMPLETED', result); }
function loadCoreOperationByKey_(book, key) {
  var records = idemRecords_(book, key);
  if (records.length > 1) throw srError_('idempotency_corrupt', 'That request key appears more than once. Review the integrity report.');
  if (!records.length) throw srError_('not_found', 'No saved operation journal was found for that request key.');
  var saved = parseIdemPayload_(records[0][2]);
  if (!saved || saved.journalVersion !== 1 || !saved.intent || ['award', 'reverse', 'checkout', 'refund', 'catalog'].indexOf(saved.kind) < 0 || ['INTENT', 'MUTATIONS_APPLIED', 'COMPLETED'].indexOf(saved.state) < 0) throw srError_('idempotency_corrupt', 'That request key is not a recoverable core operation journal.');
  return { operation: String(records[0][1]), journal: saved, result: saved.state === 'COMPLETED' ? saved.result : null };
}
function resumeCoreOperation_(book, key, operation, journal) {
  if (!journal || !journal.intent) throw srError_('idempotency_corrupt', 'The saved operation journal has no recovery intent.');
  if (journal.state === 'COMPLETED') return journal.result;
  var businessActor = validatePendingCoreJournal_(book, key, operation, journal);
  if (journal.kind === 'award') return resumeAwardCoreOperation_(book, key, operation, journal, businessActor);
  if (journal.kind === 'reverse') return resumeReverseCoreOperation_(book, key, operation, journal, businessActor);
  if (journal.kind === 'checkout') return resumeCheckoutCoreOperation_(book, key, operation, journal, businessActor);
  if (journal.kind === 'refund') return resumeRefundCoreOperation_(book, key, operation, journal, businessActor);
  if (journal.kind === 'catalog') return resumeCatalogCoreOperation_(book, key, operation, journal, businessActor);
  throw srError_('idempotency_corrupt', 'The saved core operation kind cannot be recovered.');
}
function resumeAwardCoreOperation_(book, key, operation, journal, actor) {
  var intent = journal.intent;
  var entry = ensureLedgerEntry_(book, {
    id: intent.ledgerId, studentId: intent.studentId, kind: 'EARN', amount: intent.amount,
    reason: intent.reason, referenceType: 'award', referenceId: '', reversesId: '',
    actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at,
    idempotencyKey: key, categoryId: intent.categoryId
  });
  coreFault_('award:after_ledger');
  var balance = reconcileBalanceFromLedger_(book, intent.studentId).balance;
  coreFault_('award:after_balance');
  var result = { ok: true, entry: entry, balance: balance };
  appendAuditOnce_({ event: 'POINTS_AWARDED', type: 'ledger', id: entry.id, summary: 'Points awarded: ' + intent.amount }, actor);
  completeCoreOperation_(book, key, operation, journal, result);
  coreFault_('award:after_complete');
  return result;
}
function resumeReverseCoreOperation_(book, key, operation, journal, actor) {
  var intent = journal.intent, source = ledgerById_(book, intent.originalId);
  if (!source || source.kind !== 'EARN' || source.studentId !== intent.studentId || source.amount !== -intent.amount) throw srError_('recovery_conflict', 'The award being corrected no longer matches the recorded operation intent.');
  var entry = ensureLedgerEntry_(book, {
    id: intent.ledgerId, studentId: intent.studentId, kind: 'REVERSAL', amount: intent.amount,
    reason: intent.reason, referenceType: 'reversal', referenceId: intent.originalId, reversesId: intent.originalId,
    actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at,
    idempotencyKey: key, categoryId: intent.categoryId
  });
  coreFault_('reverse:after_ledger');
  var after = reconcileBalanceFromLedger_(book, intent.studentId);
  coreFault_('reverse:after_balance');
  var availability = pointAvailability_(book, intent.studentId);
  var result = { ok: true, entry: entry, balance: after.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance };
  appendAuditOnce_({ event: 'LEDGER_REVERSED', type: 'ledger', id: entry.id, summary: 'Ledger correction recorded' }, actor);
  completeCoreOperation_(book, key, operation, journal, result);
  coreFault_('reverse:after_complete');
  return result;
}
function resumeCheckoutCoreOperation_(book, key, operation, journal, actor) {
  var intent = journal.intent;
  requireStudentRecord_(book, intent.studentId);
  ensureOrderRow_(book, {
    id: intent.orderId, studentId: intent.studentId, windowId: intent.windowId, total: intent.total,
    actorEmail: intent.actorEmail, at: intent.at, idempotencyKey: key
  }, 'PROCESSING');
  coreFault_('checkout:after_order');
  ensureOrderLines_(book, intent.orderId, intent.lines);
  coreFault_('checkout:after_lines');
  if (intent.inventoryMovements) reconcileInventoryMovements_(book, intent.inventoryMovements, 'checkout');
  else reconcileInventoryPlan_(book, intent.inventoryPlan, 'checkout:after_inventory');
  var entry = ensureLedgerEntry_(book, {
    id: intent.ledgerId, studentId: intent.studentId, kind: 'SPEND', amount: -intent.total,
    reason: 'School store order', referenceType: 'order', referenceId: intent.orderId, reversesId: '',
    actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at,
    idempotencyKey: key, categoryId: ''
  });
  coreFault_('checkout:after_ledger');
  var after = reconcileBalanceFromLedger_(book, intent.studentId);
  coreFault_('checkout:after_balance');
  setOrderStatus_(book, intent.orderId, 'COMPLETED');
  coreFault_('checkout:after_status');
  var availability = pointAvailability_(book, intent.studentId);
  markCoreOperationApplied_(book, key, operation, journal);
  var receipt = sendOrderReceiptOnce_(book, requireStudentRecord_(book, intent.studentId), { id: intent.orderId, total: intent.total, at: intent.at, lines: intent.lines }, availability.availableBalance, 'PURCHASE');
  coreFault_('checkout:after_receipt');
  var result = { ok: true, order: { id: intent.orderId, studentId: intent.studentId, windowId: intent.windowId, total: intent.total, status: 'COMPLETED', at: intent.at, lines: intent.lines }, ledgerId: entry.id, balance: after.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance, receipt: receipt };
  appendAuditOnce_({ event: 'ORDER_COMPLETED', type: 'order', id: intent.orderId, summary: 'Checkout: ' + intent.total + ' points' }, actor);
  completeCoreOperation_(book, key, operation, journal, result);
  coreFault_('checkout:after_complete');
  return result;
}
function resumeRefundCoreOperation_(book, key, operation, journal, actor) {
  var intent = journal.intent, sourceOrder = orderById_(book, intent.orderId), sourceSpend = ledgerById_(book, intent.sourceSpendId);
  if (!sourceOrder || sourceOrder.studentId !== intent.studentId || sourceOrder.total !== intent.total || ['COMPLETED', 'REFUNDED'].indexOf(sourceOrder.status) < 0) throw srError_('recovery_conflict', 'The order no longer matches the recorded refund intent.');
  if (!sourceSpend || sourceSpend.studentId !== intent.studentId || sourceSpend.kind !== 'SPEND' || sourceSpend.referenceType !== 'order' || sourceSpend.referenceId !== intent.orderId || sourceSpend.amount !== -intent.total) throw srError_('recovery_conflict', 'The order spending entry no longer matches the recorded refund intent.');
  var student = requireStudentRecord_(book, intent.studentId);
  var entry = ensureLedgerEntry_(book, {
    id: intent.ledgerId, studentId: intent.studentId, kind: 'REFUND', amount: intent.total,
    reason: intent.reason, referenceType: 'order_refund', referenceId: intent.orderId, reversesId: intent.sourceSpendId,
    actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at,
    idempotencyKey: key, categoryId: ''
  });
  coreFault_('refund:after_ledger');
  var balance = reconcileBalanceFromLedger_(book, intent.studentId);
  coreFault_('refund:after_balance');
  if (intent.inventoryMovements) reconcileInventoryMovements_(book, intent.inventoryMovements, 'refund');
  else reconcileInventoryPlan_(book, intent.inventoryPlan, 'refund:after_inventory');
  setOrderStatus_(book, intent.orderId, 'REFUNDED');
  coreFault_('refund:after_status');
  var availability = pointAvailability_(book, intent.studentId);
  markCoreOperationApplied_(book, key, operation, journal);
  var receipt = sendOrderReceiptOnce_(book, student, { id: intent.orderId, total: intent.total, at: intent.at, lines: intent.lines }, availability.availableBalance, 'REFUND');
  coreFault_('refund:after_receipt');
  var result = { ok: true, orderId: intent.orderId, ledgerId: entry.id, restoredPoints: intent.total, balance: balance.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance, receipt: receipt };
  appendAuditOnce_({ event: 'ORDER_REFUNDED', type: 'order', id: intent.orderId, summary: 'Order refunded: ' + intent.total + ' points' }, actor);
  completeCoreOperation_(book, key, operation, journal, result);
  coreFault_('refund:after_complete');
  return result;
}

function resumeCatalogCoreOperation_(book, key, operation, journal, actor) {
  var intent = journal.intent, saved;
  if (intent.mode === 'METADATA') {
    saved = writeCatalogMetadataOnly_(book, intent.item);
    coreFault_('catalog:after_materialize');
  } else {
    saved = applyInventoryMovement_(book, intent.inventoryMovements[0], intent.item, 'catalog:after_movement', 'catalog:after_materialize');
  }
  var result = { ok: true, item: copyCatalogItem_(saved) };
  appendAuditOnce_({ event: intent.mode === 'INVENTORY' ? 'CATALOG_INVENTORY_ADJUSTED' : 'CATALOG_UPDATED', type: 'catalog', id: intent.item.id, summary: intent.mode === 'INVENTORY' ? 'Catalog inventory adjusted: ' + intent.inventoryMovements[0].reason : 'Store item updated' }, actor);
  completeCoreOperation_(book, key, operation, journal, result);
  coreFault_('catalog:after_complete');
  return result;
}

function buildSchoolRewardsIntegrityReport_(book, holdAgeDays, pendingAgeMinutes) {
  var generatedAt = now_(), generatedMs = new Date(generatedAt).getTime(), issues = [], truncated = false, maxIssues = 2000;
  function issue(severity, code, entityType, entityId, message) {
    if (issues.length >= maxIssues) { truncated = true; return; }
    issues.push({ severity: severity, code: code, entityType: entityType, entityId: String(entityId || ''), message: message });
  }
  function indexBy(items, field) { var out = {}; items.forEach(function(item) { var key = String(item[field] || ''); if (key && !out[key]) out[key] = item; }); return out; }
  function groupBy(items, keyFn) { var out = {}; items.forEach(function(item) { var key = String(keyFn(item) || ''); if (!out[key]) out[key] = []; out[key].push(item); }); return out; }
  function ageMs(value) { var parsed = new Date(String(value || '')).getTime(); return isFinite(parsed) ? generatedMs - parsed : null; }
  function flagDuplicateValues(items, keyFn, code, entityType, message) {
    var counts = {};
    items.forEach(function(item) { var key = String(keyFn(item) || ''); if (key) counts[key] = (counts[key] || 0) + 1; });
    Object.keys(counts).forEach(function(key) { if (counts[key] > 1) issue('ERROR', code, entityType, key, message + ' (' + counts[key] + ' rows).'); });
  }

  Object.keys(SR_SHEETS).forEach(function(name) {
    if (name === 'OrderLines') return;
    var raw = rows_(sheet_(book, name), SR_SHEETS[name].length);
    flagDuplicateValues(raw, function(row) { return row[0]; }, 'DUPLICATE_PRIMARY_KEY', name.toLowerCase(), 'Primary key appears more than once in ' + name);
  });

  var students = students_(book), studentById = indexBy(students, 'id');
  var categories = categories_(book), categoryById = indexBy(categories, 'id');
  var catalog = catalog_(book), catalogById = indexBy(catalog, 'id');
  var inventoryMovements = inventoryMovements_(book), inventoryMovementById = indexBy(inventoryMovements, 'id');
  var windows = windows_(book), windowById = indexBy(windows, 'id');
  var ledger = ledger_(book), ledgerById = indexBy(ledger, 'id');
  var orders = orders_(book), orderById = indexBy(orders, 'id');
  var receipts = receipts_(book);
  var mailRuns = mailRuns_(book), mailRunById = indexBy(mailRuns, 'id');
  var mailDeliveries = mailOutbox_(book), mailDeliveryById = indexBy(mailDeliveries, 'id');
  if (number_(configMap_(book).schemaVersion) >= 6 && !mailSafetySweepReady_()) issue('ERROR', 'MAIL_SAFETY_SWEEP_MISSING', 'mail_trigger', 'sweepSchoolRewardsMailRuns', 'The signed recurring mail safety sweep is missing or invalid.');
  var statementProjectionById = {}, guardianProjectionById = {};
  rows_(sheet_(book, 'Statements'), 7).forEach(function(row) { statementProjectionById[String(row[0] || '')] = row; });
  rows_(sheet_(book, 'GuardianDigests'), 7).forEach(function(row) { guardianProjectionById[String(row[0] || '')] = row; });
  var requests = printRequests_(book), requestById = indexBy(requests, 'id'), requestByOrderId = {};
  requests.forEach(function(item) { if (item.orderId) requestByOrderId[item.orderId] = item; });
  var holds = pointHolds_(book), holdById = indexBy(holds, 'id');
  var models = printModels_(book), modelById = indexBy(models, 'id');
  var balanceRows = rows_(sheet_(book, 'Balances'), 5).map(function(row) { return { studentId: String(row[0] || ''), earned: number_(row[1]), spent: number_(row[2]), balance: number_(row[3]), updatedAt: cell_(row[4]) }; });
  var balanceByStudent = indexBy(balanceRows, 'studentId');
  var lineRows = rows_(sheet_(book, 'OrderLines'), 6).map(function(row) { return { orderId: String(row[0] || ''), catalogId: String(row[1] || ''), itemName: String(row[2] || ''), quantity: number_(row[3]), unitCost: number_(row[4]), lineTotal: number_(row[5]) }; });
  var linesByOrder = groupBy(lineRows, function(line) { return line.orderId; });
  var idempotencyRows = rows_(sheet_(book, 'Idempotency'), 4);
  var idempotencyKeys = {}; idempotencyRows.forEach(function(row) { idempotencyKeys[String(row[0] || '')] = true; });
  function journalLineProjection(lines) {
    return (lines || []).map(function(line) { return { catalogId: line.catalogId, itemName: line.itemName, quantity: line.quantity, unitCost: line.unitCost, lineTotal: line.lineTotal }; }).sort(function(left, right) { return String(left.catalogId).localeCompare(String(right.catalogId)); });
  }
  function validateCompletedJournal(saved, key) {
    var intent = saved.intent || {}, result = saved.result || {}, actualLedger = intent.ledgerId ? ledgerById[intent.ledgerId] : null, expectedLedger = null;
    if (saved.kind === 'catalog') {
      if (!result.item || stableJson_(result.item) !== stableJson_(intent.item)) issue('ERROR', 'JOURNAL_RESULT_INTENT_MISMATCH', 'idempotency', key, 'Completed catalog journal result does not match its signed item snapshot.');
      (intent.inventoryMovements || []).forEach(function(expectedMovement) {
        var actualMovement = inventoryMovementById[expectedMovement.id];
        if (!actualMovement || stableJson_(actualMovement) !== stableJson_(expectedMovement)) issue('ERROR', 'JOURNAL_INVENTORY_MOVEMENT_MISMATCH', 'idempotency', key, 'Completed catalog journal movement does not match its signed intent.');
      });
      return;
    }
    if (saved.kind === 'award') expectedLedger = { id: intent.ledgerId, studentId: intent.studentId, kind: 'EARN', amount: intent.amount, reason: intent.reason, referenceType: 'award', referenceId: '', reversesId: '', actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at, idempotencyKey: key, categoryId: intent.categoryId || '' };
    if (saved.kind === 'reverse') expectedLedger = { id: intent.ledgerId, studentId: intent.studentId, kind: 'REVERSAL', amount: intent.amount, reason: intent.reason, referenceType: 'reversal', referenceId: intent.originalId, reversesId: intent.originalId, actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at, idempotencyKey: key, categoryId: intent.categoryId || '' };
    if (saved.kind === 'checkout') expectedLedger = { id: intent.ledgerId, studentId: intent.studentId, kind: 'SPEND', amount: -intent.total, reason: 'School store order', referenceType: 'order', referenceId: intent.orderId, reversesId: '', actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at, idempotencyKey: key, categoryId: '' };
    if (saved.kind === 'refund') expectedLedger = { id: intent.ledgerId, studentId: intent.studentId, kind: 'REFUND', amount: intent.total, reason: intent.reason, referenceType: 'order_refund', referenceId: intent.orderId, reversesId: intent.sourceSpendId, actorEmail: intent.actorEmail, actorRole: intent.actorRole, at: intent.at, idempotencyKey: key, categoryId: '' };
    if (!expectedLedger || !actualLedger || stableJson_(actualLedger) !== stableJson_(expectedLedger)) issue('ERROR', 'JOURNAL_LEDGER_INTENT_MISMATCH', 'idempotency', key, 'Completed journal ledger row does not match its stored intent.');

    if (saved.kind === 'award' || saved.kind === 'reverse') {
      if (!result.entry || result.entry.id !== intent.ledgerId || (actualLedger && stableJson_(result.entry) !== stableJson_(actualLedger)) || !isFinite(Number(result.balance)) || Number(result.balance) < 0) issue('ERROR', 'JOURNAL_RESULT_INTENT_MISMATCH', 'idempotency', key, 'Completed journal result does not match its ledger intent.');
      if (saved.kind === 'reverse') {
        var original = ledgerById[intent.originalId];
        if (!original || original.kind !== 'EARN' || original.studentId !== intent.studentId || original.amount !== -intent.amount) issue('ERROR', 'JOURNAL_SOURCE_INTENT_MISMATCH', 'idempotency', key, 'Completed reversal journal source award does not match its stored intent.');
      }
      return;
    }

    var order = orderById[intent.orderId], actualLines = journalLineProjection(linesByOrder[intent.orderId] || []), expectedLines = journalLineProjection(intent.lines || []);
    var orderMismatch = !order || order.studentId !== intent.studentId || order.total !== intent.total;
    if (saved.kind === 'checkout' && order && (order.windowId !== intent.windowId || order.actorEmail !== intent.actorEmail || order.at !== intent.at || order.idempotencyKey !== key)) orderMismatch = true;
    if (orderMismatch) issue('ERROR', 'JOURNAL_ORDER_INTENT_MISMATCH', 'idempotency', key, 'Completed journal order does not match its stored intent.');
    if (stableJson_(actualLines) !== stableJson_(expectedLines)) issue('ERROR', 'JOURNAL_LINES_INTENT_MISMATCH', 'idempotency', key, 'Completed journal order lines do not match its stored intent.');
    (intent.inventoryMovements || []).forEach(function(expectedMovement) {
      var actualMovement = inventoryMovementById[expectedMovement.id];
      if (!actualMovement || stableJson_(actualMovement) !== stableJson_(expectedMovement)) issue('ERROR', 'JOURNAL_INVENTORY_MOVEMENT_MISMATCH', 'idempotency', key, 'Completed store journal movement does not match its signed intent.');
    });
    if (saved.kind === 'checkout') {
      if (order && ['COMPLETED', 'REFUNDED'].indexOf(order.status) < 0) issue('ERROR', 'JOURNAL_ORDER_STATUS_MISMATCH', 'idempotency', key, 'Completed checkout journal has an invalid authoritative order status.');
      var expectedResultOrder = { id: intent.orderId, studentId: intent.studentId, windowId: intent.windowId, total: intent.total, status: 'COMPLETED', at: intent.at, lines: intent.lines };
      if (result.ledgerId !== intent.ledgerId || stableJson_(result.order) !== stableJson_(expectedResultOrder) || !result.receipt || result.receipt.kind !== 'PURCHASE') issue('ERROR', 'JOURNAL_RESULT_INTENT_MISMATCH', 'idempotency', key, 'Completed checkout result does not match its stored intent.');
    } else {
      var sourceSpend = ledgerById[intent.sourceSpendId];
      if (!sourceSpend || sourceSpend.kind !== 'SPEND' || sourceSpend.referenceType !== 'order' || sourceSpend.referenceId !== intent.orderId || sourceSpend.studentId !== intent.studentId || sourceSpend.amount !== -intent.total) issue('ERROR', 'JOURNAL_SOURCE_INTENT_MISMATCH', 'idempotency', key, 'Completed refund source spend does not match its stored intent.');
      if (order && order.status !== 'REFUNDED') issue('ERROR', 'JOURNAL_ORDER_STATUS_MISMATCH', 'idempotency', key, 'Completed refund journal does not have a refunded authoritative order.');
      if (result.orderId !== intent.orderId || result.ledgerId !== intent.ledgerId || result.restoredPoints !== intent.total || !result.receipt || result.receipt.kind !== 'REFUND') issue('ERROR', 'JOURNAL_RESULT_INTENT_MISMATCH', 'idempotency', key, 'Completed refund result does not match its stored intent.');
    }
  }

  flagDuplicateValues(lineRows, function(line) { return line.orderId + '|' + line.catalogId; }, 'DUPLICATE_ORDER_LINE', 'order_line', 'Order contains the same catalog item more than once');
  flagDuplicateValues(ledger.filter(function(entry) { return entry.idempotencyKey; }), function(entry) { return entry.idempotencyKey; }, 'DUPLICATE_LEDGER_REQUEST_KEY', 'idempotency', 'One request key produced multiple ledger rows');
  flagDuplicateValues(orders.filter(function(order) { return order.idempotencyKey; }), function(order) { return order.idempotencyKey; }, 'DUPLICATE_ORDER_REQUEST_KEY', 'idempotency', 'One request key produced multiple order rows');
  flagDuplicateValues(holds.filter(function(hold) { return hold.idempotencyKey; }), function(hold) { return hold.idempotencyKey; }, 'DUPLICATE_HOLD_REQUEST_KEY', 'idempotency', 'One request key produced multiple point holds');
  flagDuplicateValues(ledger.filter(function(entry) { return entry.reversesId; }), function(entry) { return entry.reversesId; }, 'DUPLICATE_REVERSAL', 'ledger', 'A ledger entry is reversed more than once');

  ledger.forEach(function(entry) {
    if (!studentById[entry.studentId]) issue('ERROR', 'LEDGER_STUDENT_MISSING', 'ledger', entry.id, 'Ledger row references a missing student.');
    if (entry.categoryId && !categoryById[entry.categoryId]) issue('ERROR', 'LEDGER_CATEGORY_MISSING', 'ledger', entry.id, 'Ledger row references a missing recognition category.');
    if (['EARN', 'REVERSAL', 'SPEND', 'REFUND'].indexOf(entry.kind) < 0) issue('ERROR', 'LEDGER_KIND_INVALID', 'ledger', entry.id, 'Ledger kind is not recognized.');
    if ((entry.kind === 'EARN' || entry.kind === 'REFUND') && entry.amount <= 0) issue('ERROR', 'LEDGER_SIGN_INVALID', 'ledger', entry.id, 'Positive ledger movement has a non-positive amount.');
    if ((entry.kind === 'SPEND' || entry.kind === 'REVERSAL') && entry.amount >= 0) issue('ERROR', 'LEDGER_SIGN_INVALID', 'ledger', entry.id, 'Negative ledger movement has a non-negative amount.');
    if (entry.reversesId && !ledgerById[entry.reversesId]) issue('ERROR', 'LEDGER_REVERSAL_TARGET_MISSING', 'ledger', entry.id, 'Ledger reversal target is missing.');
    if (entry.referenceType === 'order' && !orderById[entry.referenceId]) issue('ERROR', 'LEDGER_ORDER_MISSING', 'ledger', entry.id, 'Order spending row references a missing order.');
    if (entry.referenceType === 'order_refund' && !orderById[entry.referenceId]) issue('ERROR', 'LEDGER_REFUND_ORDER_MISSING', 'ledger', entry.id, 'Order refund row references a missing order.');
    if ((entry.referenceType === 'print_request' || entry.referenceType === 'print_request_refund') && !requestById[entry.referenceId]) issue('ERROR', 'LEDGER_PRINT_REQUEST_MISSING', 'ledger', entry.id, 'Print ledger row references a missing print request.');
    if (entry.idempotencyKey && !idempotencyKeys[entry.idempotencyKey]) issue('WARNING', 'LEDGER_REQUEST_RECORD_MISSING', 'ledger', entry.id, 'Ledger row has no matching saved request record.');
  });

  var balanceStudentIds = {};
  students.forEach(function(student) { balanceStudentIds[student.id] = true; });
  ledger.forEach(function(entry) { balanceStudentIds[entry.studentId] = true; });
  balanceRows.forEach(function(row) { balanceStudentIds[row.studentId] = true; });
  Object.keys(balanceStudentIds).forEach(function(studentId) {
    var expected = expectedBalanceFromEntries_(ledger, studentId), actual = balanceByStudent[studentId];
    if (expected.balance !== expected.ledgerNet) issue('ERROR', 'LEDGER_NET_CLASSIFICATION_DRIFT', 'student', studentId, 'Ledger kinds do not reconcile to their net point movement.');
    if (expected.balance < 0 || expected.earned < 0 || expected.spent < 0) issue('ERROR', 'LEDGER_TOTAL_INVALID', 'student', studentId, 'Ledger totals produce a negative earned, spent, or balance value.');
    if (!actual) {
      if (expected.earned || expected.spent || expected.balance) issue('ERROR', 'BALANCE_ROW_MISSING', 'student', studentId, 'Student ledger has no materialized balance row.');
    } else if (actual.earned !== expected.earned || actual.spent !== expected.spent || actual.balance !== expected.balance) {
      issue('ERROR', 'BALANCE_DRIFT', 'student', studentId, 'Materialized earned, spent, or balance totals differ from the append-only ledger.');
    }
    if (!studentById[studentId]) issue('ERROR', 'BALANCE_STUDENT_MISSING', 'student', studentId, 'Balance or ledger totals reference a missing student.');
  });

  lineRows.forEach(function(line) {
    if (!orderById[line.orderId]) issue('ERROR', 'ORDER_LINE_ORDER_MISSING', 'order_line', line.orderId + '|' + line.catalogId, 'Order line references a missing order.');
    var printLineRequest = requestByOrderId[line.orderId];
    if (printLineRequest) {
      if (line.catalogId !== printLineRequest.modelId || !modelById[printLineRequest.modelId]) issue('ERROR', 'PRINT_ORDER_LINE_MODEL_MISMATCH', 'order_line', line.orderId + '|' + line.catalogId, 'Print order line does not reference the request model.');
    } else if (!catalogById[line.catalogId]) issue('ERROR', 'ORDER_LINE_CATALOG_MISSING', 'order_line', line.orderId + '|' + line.catalogId, 'Ordinary store order line references a missing catalog item.');
    if (!isFinite(line.quantity) || Math.floor(line.quantity) !== line.quantity || line.quantity < 1 || line.unitCost < 0 || line.lineTotal !== line.quantity * line.unitCost) issue('ERROR', 'ORDER_LINE_ARITHMETIC_INVALID', 'order_line', line.orderId + '|' + line.catalogId, 'Order line quantity, cost, or total is invalid.');
  });
  orders.forEach(function(order) {
    if (!studentById[order.studentId]) issue('ERROR', 'ORDER_STUDENT_MISSING', 'order', order.id, 'Order references a missing student.');
    if (order.windowId && !windowById[order.windowId]) issue('ERROR', 'ORDER_WINDOW_MISSING', 'order', order.id, 'Order references a missing store window.');
    if (order.idempotencyKey && !idempotencyKeys[order.idempotencyKey]) issue('WARNING', 'ORDER_REQUEST_RECORD_MISSING', 'order', order.id, 'Order has no matching saved request record.');
    var lines = linesByOrder[order.id] || [], lineTotal = lines.reduce(function(sum, line) { return sum + line.lineTotal; }, 0);
    if (!lines.length) issue('ERROR', 'ORDER_LINES_MISSING', 'order', order.id, 'Order has no item lines.');
    if (lineTotal !== order.total) issue('ERROR', 'ORDER_TOTAL_DRIFT', 'order', order.id, 'Order total differs from the sum of its item lines.');
    var printRequest = requestByOrderId[order.id], spendType = printRequest ? 'print_request' : 'order', refundType = printRequest ? 'print_request_refund' : 'order_refund';
    var spends = ledger.filter(function(entry) { return entry.kind === 'SPEND' && entry.referenceType === spendType && entry.referenceId === (printRequest ? printRequest.id : order.id); });
    var refunds = ledger.filter(function(entry) { return entry.kind === 'REFUND' && entry.referenceType === refundType && entry.referenceId === (printRequest ? printRequest.id : order.id); });
    if (order.status === 'PROCESSING') {
      if (!pendingCoreJournals_(book).some(function(item) { return item.key === order.idempotencyKey; })) issue('ERROR', 'ORDER_PROCESSING_ORPHANED', 'order', order.id, 'Processing order has no pending recovery journal.');
    } else if (order.status !== 'COMPLETED' && order.status !== 'REFUNDED') issue('ERROR', 'ORDER_STATUS_INVALID', 'order', order.id, 'Order status is not recognized.');
    if (order.status === 'COMPLETED' || order.status === 'REFUNDED') {
      if (spends.length !== 1) issue('ERROR', 'ORDER_SPEND_COUNT_INVALID', 'order', order.id, 'Completed order must have exactly one spending ledger row.');
      else if (spends[0].studentId !== order.studentId || spends[0].amount !== -order.total) issue('ERROR', 'ORDER_SPEND_DRIFT', 'order', order.id, 'Order spending row does not match the student or total.');
      if (order.status === 'COMPLETED' && refunds.length) issue('ERROR', 'COMPLETED_ORDER_HAS_REFUND', 'order', order.id, 'Completed order already has a refund ledger row.');
      if (order.status === 'REFUNDED' && refunds.length !== 1) issue('ERROR', 'ORDER_REFUND_COUNT_INVALID', 'order', order.id, 'Refunded order must have exactly one refund ledger row.');
      if (order.status === 'REFUNDED' && refunds.length === 1 && (refunds[0].studentId !== order.studentId || refunds[0].amount !== order.total || !spends.length || refunds[0].reversesId !== spends[0].id)) issue('ERROR', 'ORDER_REFUND_DRIFT', 'order', order.id, 'Refund ledger row does not match the order spending row.');
    }
  });

  catalog.forEach(function(item) {
    if (item.inventoryLimit >= 0 && (item.remaining < 0 || item.remaining > item.inventoryLimit || Math.floor(item.remaining) !== item.remaining)) issue('ERROR', 'INVENTORY_OUT_OF_BOUNDS', 'catalog', item.id, 'Finite inventory remaining is outside its configured bounds.');
    if (item.inventoryLimit < 0 && item.remaining !== -1) issue('WARNING', 'UNLIMITED_INVENTORY_MARKER_INVALID', 'catalog', item.id, 'Unlimited inventory should use -1 as its remaining marker.');
  });

  var movementIntentLinks = {};
  idempotencyRows.forEach(function(row) {
    var saved;
    try { saved = JSON.parse(String(row[2] || '{}')); } catch (_) { return; }
    if (!saved || saved.journalVersion !== 1 || !saved.intent || !Array.isArray(saved.intent.inventoryMovements)) return;
    try { assertCoreJournalSignature_(String(row[0] || ''), String(row[1] || ''), saved); } catch (_) { return; }
    saved.intent.inventoryMovements.forEach(function(movement) {
      if (!movement || !movement.id) return;
      if (!movementIntentLinks[movement.id]) movementIntentLinks[movement.id] = [];
      movementIntentLinks[movement.id].push({ key: String(row[0] || ''), kind: saved.kind, state: saved.state, movement: movement });
    });
  });
  flagDuplicateValues(inventoryMovements, function(movement) { return movement.id; }, 'INVENTORY_MOVEMENT_ID_DUPLICATE', 'inventory_movement', 'Inventory movement id appears more than once');
  flagDuplicateValues(inventoryMovements, function(movement) { return movement.catalogId + '|' + movement.version; }, 'INVENTORY_ITEM_VERSION_DUPLICATE', 'inventory_movement', 'Catalog item inventory version appears more than once');
  var movementsByCatalog = groupBy(inventoryMovements, function(movement) { return movement.catalogId; });
  Object.keys(movementsByCatalog).forEach(function(catalogId) {
    var chain = movementsByCatalog[catalogId].slice().sort(function(left, right) { return left.version - right.version; });
    var item = catalogById[catalogId], previous = null;
    if (!item) issue('ERROR', 'INVENTORY_MOVEMENT_CATALOG_MISSING', 'inventory_movement', catalogId, 'Inventory movement chain references a missing catalog item.');
    chain.forEach(function(movement, index) {
      if (['INITIALIZE', 'MIGRATION_BASELINE', 'ADMIN_ADJUST', 'SALE', 'REFUND'].indexOf(movement.kind) < 0) issue('ERROR', 'INVENTORY_MOVEMENT_KIND_INVALID', 'inventory_movement', movement.id, 'Inventory movement kind is invalid.');
      if (!isFinite(movement.version) || Math.floor(movement.version) !== movement.version || movement.version !== index + 1) issue('ERROR', 'INVENTORY_VERSION_GAP', 'inventory_movement', movement.id, 'Inventory item versions must start at one and remain consecutive.');
      if (movement.id !== inventoryMovementId_(movement.kind, movement.idempotencyKey, movement.catalogId, movement.version)) issue('ERROR', 'INVENTORY_MOVEMENT_ID_INVALID', 'inventory_movement', movement.id, 'Inventory movement id is not deterministic for its item, kind, key, and version.');
      if (inventoryMovementHash_(movement) !== movement.hash) issue('ERROR', 'INVENTORY_HASH_INVALID', 'inventory_movement', movement.id, 'Inventory movement hash does not match its canonical fields.');
      if (!previous) {
        if (movement.previousHash !== 'GENESIS' || movement.version !== 1 || ['INITIALIZE', 'MIGRATION_BASELINE'].indexOf(movement.kind) < 0) issue('ERROR', 'INVENTORY_CHAIN_GENESIS_INVALID', 'inventory_movement', movement.id, 'Inventory movement chain has an invalid genesis row.');
      } else {
        if (movement.previousHash !== previous.hash) issue('ERROR', 'INVENTORY_HASH_CHAIN_BROKEN', 'inventory_movement', movement.id, 'Inventory movement previous hash does not match the prior item version.');
        if (movement.beforeLimit !== previous.afterLimit || movement.beforeRemaining !== previous.afterRemaining) issue('ERROR', 'INVENTORY_SNAPSHOT_DISCONTINUITY', 'inventory_movement', movement.id, 'Inventory movement before state does not match the prior after state.');
      }
      function markerValid(limit, remaining) { return limit < 0 ? remaining === -1 : Math.floor(limit) === limit && limit >= 0 && Math.floor(remaining) === remaining && remaining >= 0 && remaining <= limit; }
      if (!markerValid(movement.beforeLimit, movement.beforeRemaining) || !markerValid(movement.afterLimit, movement.afterRemaining)) issue('ERROR', 'INVENTORY_MOVEMENT_BOUNDS_INVALID', 'inventory_movement', movement.id, 'Inventory movement before or after state is outside valid bounds.');
      if (movement.kind === 'INITIALIZE' || movement.kind === 'MIGRATION_BASELINE') {
        if (movement.version !== 1 || movement.quantityDelta !== 0 || movement.beforeLimit !== movement.afterLimit || movement.beforeRemaining !== movement.afterRemaining) issue('ERROR', 'INVENTORY_BASELINE_INVALID', 'inventory_movement', movement.id, 'Inventory initialization or migration baseline is invalid.');
      } else if (movement.kind === 'SALE' || movement.kind === 'REFUND') {
        var expectedSign = movement.kind === 'SALE' ? -1 : 1;
        if (movement.quantityDelta * expectedSign <= 0 || movement.beforeLimit !== movement.afterLimit || (movement.beforeLimit >= 0 && movement.afterRemaining !== movement.beforeRemaining + movement.quantityDelta) || (movement.beforeLimit < 0 && (movement.beforeRemaining !== -1 || movement.afterRemaining !== -1))) issue('ERROR', 'INVENTORY_TRANSACTION_ARITHMETIC_INVALID', 'inventory_movement', movement.id, 'Sale or refund inventory arithmetic is invalid.');
        var links = movementIntentLinks[movement.id] || [], exactLinks = links.filter(function(link) { return stableJson_(link.movement) === stableJson_(movement); });
        if (exactLinks.length !== 1 || exactLinks[0].state !== 'COMPLETED' || exactLinks[0].kind !== (movement.kind === 'SALE' ? 'checkout' : 'refund')) issue('ERROR', 'INVENTORY_JOURNAL_LINK_INVALID', 'inventory_movement', movement.id, 'Post-baseline sale or refund movement lacks one exact completed signed journal intent.');
        var order = orderById[movement.referenceId], orderLine = (linesByOrder[movement.referenceId] || []).filter(function(line) { return line.catalogId === movement.catalogId; });
        if (!order || requestByOrderId[movement.referenceId] || orderLine.length !== 1 || Math.abs(movement.quantityDelta) !== orderLine[0].quantity || movement.referenceType !== (movement.kind === 'SALE' ? 'order' : 'order_refund')) issue('ERROR', 'INVENTORY_ORDER_LINK_INVALID', 'inventory_movement', movement.id, 'Sale or refund movement does not match one ordinary school-store order line.');
      } else if (movement.kind === 'ADMIN_ADJUST') {
        var transition = movement.beforeLimit < 0 !== movement.afterLimit < 0;
        if ((transition && movement.quantityDelta !== 0) || (!transition && movement.beforeLimit >= 0 && movement.afterLimit >= 0 && movement.quantityDelta !== movement.afterRemaining - movement.beforeRemaining) || (!transition && movement.beforeLimit < 0 && movement.quantityDelta !== 0)) issue('ERROR', 'INVENTORY_ADJUSTMENT_ARITHMETIC_INVALID', 'inventory_movement', movement.id, 'Administrator inventory adjustment delta or transition is invalid.');
      }
      previous = movement;
    });
    if (item && (!previous || item.inventoryVersion !== previous.version || item.inventoryLimit !== previous.afterLimit || item.remaining !== previous.afterRemaining)) issue('ERROR', 'INVENTORY_CATALOG_SNAPSHOT_DRIFT', 'catalog', catalogId, 'Catalog materialized inventory does not match the final movement in its item chain.');
  });
  catalog.forEach(function(item) {
    if (!movementsByCatalog[item.id] || !movementsByCatalog[item.id].length) issue('ERROR', 'INVENTORY_CHAIN_MISSING', 'catalog', item.id, 'Catalog item has no append-only inventory movement chain.');
  });

  requests.forEach(function(item) {
    if (!studentById[item.studentId]) issue('ERROR', 'PRINT_REQUEST_STUDENT_MISSING', 'print_request', item.id, 'Print request references a missing student.');
    if (!modelById[item.modelId]) issue('ERROR', 'PRINT_REQUEST_MODEL_MISSING', 'print_request', item.id, 'Print request references a missing model.');
    if (item.windowId && !windowById[item.windowId]) issue('ERROR', 'PRINT_REQUEST_WINDOW_MISSING', 'print_request', item.id, 'Print request references a missing store window.');
    if (item.orderId && !orderById[item.orderId]) issue('ERROR', 'PRINT_REQUEST_ORDER_MISSING', 'print_request', item.id, 'Print request references a missing fulfillment order.');
    var linked = item.holdId ? holdById[item.holdId] : null;
    if (item.holdId && !linked) issue('ERROR', 'PRINT_REQUEST_HOLD_MISSING', 'print_request', item.id, 'Print request references a missing point hold.');
    if (linked && (linked.purposeType !== 'PRINT_REQUEST' || linked.purposeId !== item.id || linked.studentId !== item.studentId)) issue('ERROR', 'PRINT_REQUEST_HOLD_MISMATCH', 'print_request', item.id, 'Print request and point hold linkage do not agree.');
    if (['RESERVED', 'QUEUED', 'PRINTING', 'READY'].indexOf(item.status) >= 0 && (!linked || linked.status !== 'ACTIVE')) issue('ERROR', 'PRINT_REQUEST_ACTIVE_HOLD_MISSING', 'print_request', item.id, 'Reserved print workflow does not have an active point hold.');
    if ((item.status === 'FULFILLED' || item.status === 'REFUNDED') && linked && linked.status !== 'CAPTURED') issue('ERROR', 'PRINT_REQUEST_CAPTURE_MISSING', 'print_request', item.id, 'Fulfilled print workflow does not have a captured point hold.');
  });
  holds.forEach(function(hold) {
    if (!studentById[hold.studentId]) issue('ERROR', 'HOLD_STUDENT_MISSING', 'point_hold', hold.id, 'Point hold references a missing student.');
    if (SR_POINT_HOLD_STATES.indexOf(hold.status) < 0 || hold.amount <= 0) issue('ERROR', 'HOLD_STATE_OR_AMOUNT_INVALID', 'point_hold', hold.id, 'Point hold state or amount is invalid.');
    var request = hold.purposeType === 'PRINT_REQUEST' ? requestById[hold.purposeId] : null;
    if (hold.purposeType !== 'PRINT_REQUEST' || !request) issue('ERROR', 'HOLD_PURPOSE_MISSING', 'point_hold', hold.id, 'Point hold purpose does not resolve to a print request.');
    if (request && (request.holdId !== hold.id || request.studentId !== hold.studentId || request.quotePoints !== hold.amount)) issue('ERROR', 'HOLD_REQUEST_MISMATCH', 'point_hold', hold.id, 'Point hold amount or linkage differs from its print request.');
    if (hold.status === 'ACTIVE') {
      var holdAge = ageMs(hold.createdAt);
      if (holdAge == null) issue('WARNING', 'HOLD_CREATED_AT_INVALID', 'point_hold', hold.id, 'Active point hold has no valid creation time.');
      else if (holdAge > holdAgeDays * 86400000) issue('WARNING', 'HOLD_STALE', 'point_hold', hold.id, 'Active point hold is older than the configured review threshold.');
      if (hold.expiresAt && new Date(hold.expiresAt).getTime() < generatedMs) issue('WARNING', 'HOLD_EXPIRED_ACTIVE', 'point_hold', hold.id, 'Expired point hold is still active.');
    }
    if (hold.status === 'CAPTURED') {
      var capture = hold.captureLedgerId ? ledgerById[hold.captureLedgerId] : null;
      if (!capture || capture.kind !== 'SPEND' || capture.studentId !== hold.studentId || capture.amount !== -hold.amount) issue('ERROR', 'HOLD_CAPTURE_LEDGER_MISMATCH', 'point_hold', hold.id, 'Captured point hold does not match a spending ledger row.');
    }
    if (hold.idempotencyKey && !idempotencyKeys[hold.idempotencyKey]) issue('WARNING', 'HOLD_REQUEST_RECORD_MISSING', 'point_hold', hold.id, 'Point hold has no matching saved request record.');
  });

  var receiptsByOrderKind = groupBy(receipts, function(receipt) { return receipt.orderId + '|' + receipt.kind; });
  receipts.forEach(function(receipt) {
    var order = orderById[receipt.orderId];
    if (!order) issue('ERROR', 'RECEIPT_ORDER_MISSING', 'receipt', receipt.id, 'Receipt references a missing order.');
    if (!studentById[receipt.studentId]) issue('ERROR', 'RECEIPT_STUDENT_MISSING', 'receipt', receipt.id, 'Receipt references a missing student.');
    if (order && (receipt.studentId !== order.studentId)) issue('ERROR', 'RECEIPT_STUDENT_MISMATCH', 'receipt', receipt.id, 'Receipt student does not match its order.');
    if (['PURCHASE', 'REFUND'].indexOf(receipt.kind) < 0 || ['PENDING', 'SENT', 'FAILED', 'UNKNOWN'].indexOf(receipt.status) < 0) issue('ERROR', 'RECEIPT_STATE_INVALID', 'receipt', receipt.id, 'Receipt kind or delivery status is invalid.');
    if (receipt.status === 'PENDING' || receipt.status === 'UNKNOWN') {
      var receiptAge = ageMs(receipt.sentAt), severity = receiptAge != null && receiptAge > pendingAgeMinutes * 60000 ? 'ERROR' : 'WARNING';
      issue(severity, 'RECEIPT_DELIVERY_AMBIGUOUS', 'receipt', receipt.id, 'Receipt delivery remains uncertain and requires mailbox verification.');
    }
  });
  Object.keys(receiptsByOrderKind).forEach(function(key) {
    var attempts = receiptsByOrderKind[key], sent = attempts.filter(function(receipt) { return receipt.status === 'SENT'; });
    if (sent.length > 1) issue('ERROR', 'RECEIPT_MULTIPLE_SENT', 'order', attempts[0].orderId, 'More than one receipt is marked sent for the same order and kind.');
  });
  orders.forEach(function(order) {
    if ((order.status === 'COMPLETED' || order.status === 'REFUNDED') && !(receiptsByOrderKind[order.id + '|PURCHASE'] || []).length) issue('ERROR', 'PURCHASE_RECEIPT_RECORD_MISSING', 'order', order.id, 'Completed order has no purchase receipt delivery record.');
    if (order.status === 'REFUNDED' && !(receiptsByOrderKind[order.id + '|REFUND'] || []).length) issue('ERROR', 'REFUND_RECEIPT_RECORD_MISSING', 'order', order.id, 'Refunded order has no refund receipt delivery record.');
  });

  flagDuplicateValues(mailDeliveries, function(delivery) { return delivery.deliveryKey; }, 'MAIL_DELIVERY_KEY_DUPLICATE', 'mail_delivery', 'Mail delivery key appears more than once');
  flagDuplicateValues(mailDeliveries.filter(function(delivery) { return delivery.retryOfId; }), function(delivery) { return delivery.retryOfId; }, 'MAIL_RETRY_DUPLICATE', 'mail_delivery', 'One failed mail attempt has more than one retry child');
  var mailDeliveriesByRun = groupBy(mailDeliveries, function(delivery) { return delivery.runId; });
  mailDeliveries.forEach(function(delivery) {
    var linkedMailRun = mailRunById[delivery.runId];
    if (!linkedMailRun) issue('ERROR', 'MAIL_RUN_MISSING', 'mail_delivery', delivery.id, 'Mail delivery references a missing run.');
    else if (linkedMailRun.kind !== delivery.kind || linkedMailRun.periodKey !== delivery.periodKey) issue('ERROR', 'MAIL_RUN_DELIVERY_MISMATCH', 'mail_delivery', delivery.id, 'Mail delivery kind or period differs from its run.');
    if (['STUDENT_STATEMENT', 'GUARDIAN_DIGEST'].indexOf(delivery.kind) < 0 || ['PENDING', 'SENT', 'FAILED', 'UNKNOWN'].indexOf(delivery.status) < 0) issue('ERROR', 'MAIL_DELIVERY_STATE_INVALID', 'mail_delivery', delivery.id, 'Mail delivery kind or status is invalid.');
    if (!/^delivery_[A-Za-z0-9_-]{20,64}$/.test(delivery.deliveryKey) || delivery.deliveryKey.indexOf('@') >= 0) issue('ERROR', 'MAIL_DELIVERY_KEY_UNSAFE', 'mail_delivery', delivery.id, 'Mail delivery key is not an opaque safe identifier.');
    if (!studentById[delivery.studentId]) issue('ERROR', 'MAIL_DELIVERY_STUDENT_MISSING', 'mail_delivery', delivery.id, 'Mail delivery references a missing student.');
    if (delivery.kind === 'GUARDIAN_DIGEST') {
      var guardian = guardianById_(book, delivery.guardianId);
      if (!guardian || guardian.studentId !== delivery.studentId) issue('ERROR', 'MAIL_DELIVERY_GUARDIAN_MISMATCH', 'mail_delivery', delivery.id, 'Guardian delivery mapping is missing or linked to a different student.');
    } else if (delivery.guardianId || delivery.consentConfirmedAt) issue('ERROR', 'MAIL_DELIVERY_GUARDIAN_UNEXPECTED', 'mail_delivery', delivery.id, 'Student statement unexpectedly contains guardian authorization fields.');
    if (delivery.retryOfId) {
      var sourceDelivery = mailDeliveryById[delivery.retryOfId];
      if (!sourceDelivery || sourceDelivery.id === delivery.id) issue('ERROR', 'MAIL_RETRY_SOURCE_MISSING', 'mail_delivery', delivery.id, 'Mail retry source is missing or self-referential.');
      else if (sourceDelivery.kind !== delivery.kind || sourceDelivery.studentId !== delivery.studentId || sourceDelivery.guardianId !== delivery.guardianId ||
          sourceDelivery.periodKey !== delivery.periodKey || sourceDelivery.payloadJson !== delivery.payloadJson) issue('ERROR', 'MAIL_RETRY_LINEAGE_MISMATCH', 'mail_delivery', delivery.id, 'Mail retry immutable fields differ from the confirmed failed source.');
      else {
        try { assertConfirmedFailedMailDelivery_(sourceDelivery); }
        catch (_) { issue('ERROR', 'MAIL_RETRY_SOURCE_UNCONFIRMED', 'mail_delivery', delivery.id, 'Mail retry source is not a signed administrator-confirmed failure.'); }
      }
    }
    try { assertMailDeliverySignature_(delivery); }
    catch (_) { issue('ERROR', 'MAIL_DELIVERY_HMAC_INVALID', 'mail_delivery', delivery.id, 'Mail delivery immutable fields or payload no longer match the lifetime signature.'); }
    if (delivery.status === 'FAILED') {
      try { assertConfirmedFailedMailDelivery_(delivery); }
      catch (_) { issue('ERROR', 'MAIL_FAILED_CONFIRMATION_INVALID', 'mail_delivery', delivery.id, 'Failed mail delivery lacks a valid signed administrator confirmation.'); }
    }
    if (/@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(delivery.payloadJson) || /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(delivery.error)) issue('ERROR', 'MAIL_PRIVACY_LEAK', 'mail_delivery', delivery.id, 'Mail outbox payload or error contains an address-like value.');
    if (delivery.status === 'PENDING') {
      var deliveryAge = ageMs(delivery.attemptedAt || delivery.createdAt), deliverySeverity = deliveryAge != null && deliveryAge > pendingAgeMinutes * 60000 ? 'ERROR' : 'WARNING';
      issue(deliverySeverity, 'MAIL_DELIVERY_AMBIGUOUS', 'mail_delivery', delivery.id, 'Pending mail delivery must be treated as unknown before any continuation.');
    }
    if (delivery.status === 'UNKNOWN') issue('ERROR', 'MAIL_DELIVERY_AMBIGUOUS', 'mail_delivery', delivery.id, 'Unknown mail delivery requires explicit administrator verification.');
    if (delivery.status !== 'PENDING') {
      var projection = delivery.kind === 'STUDENT_STATEMENT' ? statementProjectionById[delivery.id] : guardianProjectionById[delivery.id];
      if (!projection) issue('ERROR', 'MAIL_PROJECTION_MISSING', 'mail_delivery', delivery.id, 'Settled mail outbox row is missing its compatibility projection.');
      else {
        var projectionPeriod = String(projection[delivery.kind === 'STUDENT_STATEMENT' ? 2 : 3] || '');
        if (String(projection[1] || '') !== delivery.studentId || projectionPeriod !== delivery.periodKey || String(projection[4] || '') !== delivery.status) issue('ERROR', 'MAIL_PROJECTION_MISMATCH', 'mail_delivery', delivery.id, 'Mail compatibility projection does not match the settled outbox row.');
      }
    }
  });
  mailRuns.forEach(function(run) {
    if (['STUDENT_STATEMENT', 'GUARDIAN_DIGEST'].indexOf(run.kind) < 0 || ['QUEUED', 'RUNNING', 'PAUSED_QUOTA', 'NEEDS_REVIEW', 'COMPLETED', 'FAILED'].indexOf(run.status) < 0) issue('ERROR', 'MAIL_RUN_STATE_INVALID', 'mail_run', run.id, 'Mail run kind or status is invalid.');
    try { assertMailRunSignature_(run); }
    catch (_) { issue('ERROR', 'MAIL_RUN_HMAC_INVALID', 'mail_run', run.id, 'Mail run immutable fields no longer match the lifetime signature.'); }
    var runDeliveries = mailDeliveriesByRun[run.id] || [];
    var expectedAttempted = runDeliveries.length + run.skipped;
    var expectedSent = runDeliveries.filter(function(item) { return item.status === 'SENT'; }).length;
    var expectedFailed = runDeliveries.filter(function(item) { return item.status === 'FAILED'; }).length;
    var expectedUncertain = runDeliveries.filter(function(item) { return item.status === 'UNKNOWN'; }).length;
    var expectedPending = runDeliveries.filter(function(item) { return item.status === 'PENDING'; }).length;
    var expectedStalePending = runDeliveries.filter(function(item) { return item.status === 'PENDING' && mailPendingIsStale_(item); }).length;
    try {
      var runManifest = mailCandidateManifest_(run);
      if (runManifest.i !== runDeliveries.filter(function(item) { return !item.retryOfId; }).length + run.skipped) issue('ERROR', 'MAIL_RUN_MANIFEST_PROGRESS_MISMATCH', 'mail_run', run.id, 'Mail run manifest index does not match completed candidate attempts.');
    } catch (_) { issue('ERROR', 'MAIL_RUN_MANIFEST_INVALID', 'mail_run', run.id, 'Mail run has an invalid signed candidate manifest.'); }
    if (run.attempted !== expectedAttempted || run.sent !== expectedSent || run.failed !== expectedFailed || run.uncertain !== expectedUncertain) issue('ERROR', 'MAIL_RUN_COUNTER_MISMATCH', 'mail_run', run.id, 'Mail run counters do not match linked outbox attempts.');
    if (run.requestedLimit < 1 || run.requestedLimit > SR_MAX_BATCH || [run.requestedLimit, run.attempted, run.sent, run.skipped, run.failed, run.uncertain].some(function(value) { return !isFinite(value) || value < 0 || Math.floor(value) !== value; })) issue('ERROR', 'MAIL_RUN_COUNTER_INVALID', 'mail_run', run.id, 'Mail run counters and requested limit must be valid whole numbers.');
    if (run.status === 'COMPLETED' && (expectedPending || expectedUncertain)) issue('ERROR', 'MAIL_RUN_COMPLETED_AMBIGUOUS', 'mail_run', run.id, 'Completed mail run still has an unresolved delivery.');
    if ((expectedStalePending || expectedUncertain) && run.status !== 'NEEDS_REVIEW') issue('ERROR', 'MAIL_RUN_REVIEW_STATE_MISMATCH', 'mail_run', run.id, 'Mail run with ambiguous delivery is not paused for review.');
  });

  var pendingOperations = 0;
  idempotencyRows.forEach(function(row) {
    var key = String(row[0] || ''), saved;
    try { saved = JSON.parse(String(row[2] || '{}')); }
    catch (_) { issue('ERROR', 'IDEMPOTENCY_JSON_INVALID', 'idempotency', key, 'Saved request result is not valid JSON.'); return; }
    if (!saved || saved.journalVersion !== 1) return;
    if (['INTENT', 'MUTATIONS_APPLIED', 'COMPLETED'].indexOf(saved.state) < 0 || !saved.kind || !saved.intent) issue('ERROR', 'JOURNAL_ENVELOPE_INVALID', 'idempotency', key, 'Core operation journal envelope is incomplete or invalid.');
    if (saved.state !== 'COMPLETED') {
      pendingOperations++;
      issue('ERROR', 'JOURNAL_OPERATION_PENDING', 'idempotency', key, 'Core operation journal is pending recovery at stage ' + String(saved.state || 'UNKNOWN') + '.');
      try { validatePendingCoreJournal_(book, key, String(row[1] || ''), saved); }
      catch (validationError) {
        issue('ERROR', validationError && validationError.code === 'journal_signature_invalid' ? 'JOURNAL_SIGNATURE_INVALID' : 'JOURNAL_PENDING_INTENT_INVALID', 'idempotency', key, text_(validationError && validationError.message, 240, 'Pending operation intent is invalid.'));
      }
    } else {
      if (!saved.result || saved.result.ok !== true) issue('ERROR', 'JOURNAL_RESULT_MISSING', 'idempotency', key, 'Completed core operation journal has no successful saved result.');
      if (saved.signature) {
        try { assertCoreJournalSignature_(key, String(row[1] || ''), saved); }
        catch (signatureError) { issue('ERROR', 'JOURNAL_SIGNATURE_INVALID', 'idempotency', key, 'Completed signed journal no longer matches its signature.'); }
      }
      validateCompletedJournal(saved, key);
    }
  });

  var errors = issues.filter(function(item) { return item.severity === 'ERROR'; }).length;
  var warnings = issues.filter(function(item) { return item.severity === 'WARNING'; }).length;
  var ready = errors === 0 && pendingOperations === 0;
  return {
    ok: ready, ready: ready, readOnly: true, generatedAt: generatedAt,
    readiness: { ok: ready, blockingIssues: errors, pendingOperations: pendingOperations },
    thresholds: { holdAgeDays: holdAgeDays, pendingAgeMinutes: pendingAgeMinutes },
    summary: {
      errors: errors, warnings: warnings, issues: issues.length, truncated: truncated,
      students: students.length, ledgerEntries: ledger.length, balanceRows: balanceRows.length,
      orders: orders.length, orderLines: lineRows.length, catalogItems: catalog.length, inventoryMovements: inventoryMovements.length,
      pointHolds: holds.length, printRequests: requests.length, receipts: receipts.length,
      mailRuns: mailRuns.length, mailDeliveries: mailDeliveries.length,
      idempotencyRecords: idempotencyRows.length, pendingOperations: pendingOperations
    },
    checks: {
      ledgerAndBalances: true, ordersLinesSpendsAndRefunds: true, inventoryBounds: true, inventoryMovementChain: true,
      holdsRequestsAndAging: true, receiptDelivery: true, identifiersAndReferences: true,
      operationJournals: true, resilientMailDelivery: true
    },
    issues: issues
  };
}

function locked_(callback) { var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) throw srError_('busy', 'School Rewards is busy. Try again.'); try { return callback(); } finally { lock.releaseLock(); } }
function rows_(sheet, width) { var last = sheet.getLastRow(); return last < 2 ? [] : sheet.getRange(2, 1, last - 1, width).getValues(); }
function upsert_(sheet, width, key, row) { var current = rows_(sheet, width); for (var i = 0; i < current.length; i++) if (String(current[i][0]) === String(key)) { sheet.getRange(i + 2, 1, 1, width).setValues([row]); return; } sheet.appendRow(row); }
function object_(value) { return value && Object.prototype.toString.call(value) === '[object Object]' ? value : {}; }
function countBy_(items, field) { var counts = {}; items.forEach(function(item) { var key = String(item[field] || 'UNKNOWN'); counts[key] = (counts[key] || 0) + 1; }); return counts; }
function bool_(value) { return value === true || String(value).toLowerCase() === 'true'; }
function number_(value) { var number = Number(value); return isFinite(number) ? number : 0; }
function integer_(value, min, max, label) { var number = Number(value); if (!isFinite(number) || Math.floor(number) !== number || number < min || number > max) throw srError_('bad_number', label + ' must be a whole number from ' + min + ' to ' + max + '.'); return number; }
function text_(value, max, fallback) { var out = String(value == null ? '' : value).replace(/[\u0000-\u001f\u007f]/g, ' ').trim(); return (out || String(fallback || '')).slice(0, max); }
function id_(value, label) { var out = text_(value, 80, ''); if (!/^[A-Za-z0-9_-]{8,80}$/.test(out)) throw srError_('bad_id', 'A valid ' + label + ' id is required.'); return out; }
function optionalId_(value, label) { var out = text_(value, 80, ''); return out ? id_(out, label) : ''; }
function normalizeEmail_(value) { var email = String(value || '').trim().toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''; }
function normalizeDomain_(value) { var domain = String(value || '').trim().toLowerCase().replace(/^@/, ''); return /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(domain) && domain.indexOf('.') > 0 ? domain : ''; }
function emailDomain_(email) { return normalizeEmail_(email).split('@')[1] || ''; }
function activeEmail_() { var email = normalizeEmail_(Session.getActiveUser().getEmail()); if (!email) throw srError_('identity_unavailable', 'Google did not provide a managed account identity.'); return email; }
function now_() { return new Date().toISOString(); }
function uuid_() { return Utilities.getUuid(); }
function iso_(value) { if (!value) return ''; var date = new Date(String(value)); if (isNaN(date.getTime())) throw srError_('bad_date', 'Use a valid date and time.'); return date.toISOString(); }
function httpsUrl_(value) { var out = String(value || '').trim(); if (!out) return ''; if (!/^https:\/\//i.test(out) || out.length > 600) throw srError_('bad_url', 'Use an HTTPS URL.'); return out; }
function webAppUrl_(value) { var out = String(value || '').trim(); if (!out) return ''; if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(out)) throw srError_('bad_url', 'Use the Apps Script /exec URL.'); return out; }
function safeRow_(values) { return values.map(function(value) { return typeof value === 'string' && /^[=+\-@]/.test(value) ? "'" + value : value; }); }
function setPrivate_(item) { try { item.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE); } catch (_) {} try { item.setShareableByEditors(false); } catch (_) {} }
function cell_(value) { if (value == null) return ''; if (Object.prototype.toString.call(value) === '[object Date]') return value.toISOString(); return String(value); }
function hash_(value) { var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value), Utilities.Charset.UTF_8); return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, ''); }
function html_(value) { return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function srError_(code, message) { var error = new Error(message); error.code = code; return error; }
function publicError_(err) { return { ok: false, code: err && err.code ? String(err.code) : 'server_error', error: err && err.message ? String(err.message) : 'School Rewards request failed.' }; }
function jsonOutput_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
