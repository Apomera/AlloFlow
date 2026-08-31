/**
 * AlloFlow School Rewards — school-owned Google Workspace repository.
 * The ledger is append-only and every mutation runs under one script lock.
 * Public calls always derive identity and role from Session.getActiveUser().
 */
var SR_SERVICE = 'alloflow-school-rewards';
var SR_VERSION = 4;
var SR_MAX_POINTS = 1000;
var SR_MAX_BATCH = 500;
var SR_MAX_PRINT_ASSET_BYTES = 4 * 1024 * 1024;
var SR_ROLES = ['admin', 'staff', 'cashier'];
var SR_WINDOW_STATES = ['DRAFT', 'PREVIEW', 'OPEN', 'CLOSED', 'ARCHIVED'];
var SR_PRINT_FORMATS = ['RECIPE', 'GLB', 'STL'];
var SR_PRINT_AI_USE = ['NONE', 'ASSISTED', 'MOSTLY_AI'];
var SR_PRINT_PUBLICATION_STATES = ['PRIVATE', 'PENDING', 'PUBLISHED', 'REJECTED', 'REPORTED', 'UNPUBLISHED'];
var SR_PRINT_ASSET_STATES = ['PENDING', 'VERIFIED', 'REJECTED'];
var SR_PRINT_REQUEST_STATES = ['SUBMITTED', 'REVISION_REQUESTED', 'SUPERSEDED', 'REJECTED', 'QUOTED', 'RESERVED', 'QUEUED', 'PRINTING', 'READY', 'CANCELLING', 'CANCELLED', 'FULFILLING', 'FULFILLED', 'REFUNDING', 'REFUNDED'];
var SR_POINT_HOLD_STATES = ['ACTIVE', 'CAPTURED', 'RELEASED'];
var SR_SHEETS = {
  Config: ['Key', 'Value'],
  Members: ['Email', 'DisplayName', 'Role', 'Active'],
  Students: ['Id', 'FirstName', 'LastInitial', 'Grade', 'Homeroom', 'Email', 'Active', 'CreatedAt', 'UpdatedAt'],
  Ledger: ['Id', 'StudentId', 'Kind', 'Amount', 'Reason', 'ReferenceType', 'ReferenceId', 'ReversesId', 'ActorEmail', 'ActorRole', 'At', 'IdempotencyKey', 'CategoryId'],
  Balances: ['StudentId', 'Earned', 'Spent', 'Balance', 'UpdatedAt'],
  Categories: ['Id', 'Name', 'Description', 'Framework', 'Color', 'Active', 'SortOrder', 'CreatedAt', 'UpdatedAt'],
  Catalog: ['Id', 'Name', 'Description', 'Cost', 'InventoryLimit', 'Remaining', 'Active', 'ImageUrl', 'CreatedAt', 'UpdatedAt'],
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
  SisImports: ['Id', 'SnapshotId', 'FormatVersion', 'ContentHash', 'CreatedCount', 'UpdatedCount', 'UnchangedCount', 'Status', 'AppliedAt', 'ActorHash', 'CreatedAt'],
  PointHolds: ['Id', 'StudentId', 'PurposeType', 'PurposeId', 'Amount', 'Status', 'ExpiresAt', 'IdempotencyKey', 'CaptureLedgerId', 'CreatedAt', 'UpdatedAt', 'CapturedAt', 'ReleasedAt', 'ReleaseReason'],
  Audit: ['Id', 'Event', 'EntityType', 'EntityId', 'Summary', 'ActorEmail', 'ActorRole', 'At', 'PreviousHash', 'Hash'],
  Idempotency: ['Key', 'Operation', 'ResultJson', 'At']
};

function doGet(e) {
  if (String(e && e.parameter && e.parameter.api || '') === 'health') {
    try { return jsonOutput_({ ok: true, service: SR_SERVICE, version: SR_VERSION, role: currentActor_().role }); }
    catch (err) { return jsonOutput_(publicError_(err)); }
  }
  try {
    currentActor_();
    return HtmlService.createTemplateFromFile('Index').evaluate().setTitle('AlloFlow School Rewards');
  } catch (err) {
    return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><title>Access unavailable</title><main style="font:16px system-ui;max-width:680px;margin:64px auto;padding:24px"><h1>Access unavailable</h1><p>School Rewards could not verify an authorized managed Google Education account.</p><p>Ask the school administrator to check the domain-only deployment and your membership.</p></main>');
  }
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
  initializeSheets_(book);
  putConfig_(book, { service: SR_SERVICE, schemaVersion: SR_VERSION, allowedDomain: domain, schoolName: text_(config.schoolName, 160, 'School'), academicYear: text_(config.academicYear, 30, ''), webAppUrl: webAppUrl_(config.webAppUrl || ''), levelThresholds: normalizeLevelThresholds_(config.levelThresholds).join(',') });
  upsertMemberRow_(book, { email: adminEmail, displayName: text_(config.adminDisplayName, 120, 'School Rewards Administrator'), role: 'admin', active: true });
  (Array.isArray(config.members) ? config.members : []).forEach(function(member) { upsertMemberRow_(book, normalizeMember_(member, domain)); });
  var students = Array.isArray(config.students) ? config.students : [];
  if (students.length > 5000) throw srError_('bad_config', 'Student roster exceeds 5,000 records.');
  students.forEach(function(student) { upsertStudentRow_(book, normalizeStudent_(student, domain, '')); });
  if (!categories_(book).length && config.seedHowls !== false) seedHowlCategories_(book);
  props.setProperty('SR_SETUP_STATE', 'ready');
  appendAudit_({ event: existing ? 'REPOSITORY_RECONFIGURED' : 'REPOSITORY_CREATED', type: 'repository', id: 'repository', summary: existing ? 'Repository configuration reviewed' : 'School rewards repository created' }, { email: email, role: 'admin' });
  return { ok: true, service: SR_SERVICE, version: SR_VERSION, spreadsheetId: book.getId(), folderId: props.getProperty('SR_FOLDER_ID'), allowedDomain: domain };
}

/** One-time additive migration for existing schema-v3 repositories. */
function migrateSchoolRewardsRepositoryV4() {
  var actor = requireRole_(['admin']);
  return locked_(function() {
    var book = book_(); initializeSheets_(book); putConfig_(book, { schemaVersion: SR_VERSION });
    appendAudit_({ event: 'REPOSITORY_MIGRATED_V4', type: 'repository', id: 'repository', summary: 'Additive School Rewards schema v4 migration completed' }, actor);
    return { ok: true, service: SR_SERVICE, version: SR_VERSION };
  });
}

function getSchoolRewardsBootstrap() {
  var actor = currentActor_(), book = book_(), config = configMap_(book), balanceMap = balancesMap_(book);
  var allStudents = students_(book), students = actor.role === 'admin' ? allStudents : allStudents.filter(function(student) { return student.active; });
  students.forEach(function(student) {
    var availability = pointAvailability_(book, student.id, balanceMap);
    student.balance = availability.balance;
    student.reservedPoints = availability.reservedPoints;
    student.availableBalance = availability.availableBalance;
  });
  var categories = categories_(book);
  var visible = visibleWindow_(book);
  if (actor.role === 'student') {
    var ownStudent = requireStudent_(book, actor.studentId), ownAvailability = pointAvailability_(book, actor.studentId, balanceMap);
    ownStudent = { id: ownStudent.id, firstName: ownStudent.firstName, lastInitial: ownStudent.lastInitial, grade: ownStudent.grade, homeroom: ownStudent.homeroom, active: true, balance: ownAvailability.balance, reservedPoints: ownAvailability.reservedPoints, availableBalance: ownAvailability.availableBalance };
    var ownLedger = ledger_(book).filter(function(entry) { return entry.studentId === actor.studentId; }).slice(-200).reverse().map(studentLedgerEntry_);
    var ownOrderRows = orders_(book).filter(function(order) { return order.studentId === actor.studentId; }).slice(-50).reverse();
    var ownOrders = ownOrderRows.map(function(order) { return orderDto_(book, order); });
    return { ok: true, service: SR_SERVICE, version: SR_VERSION, actor: actor,
      config: { schoolName: config.schoolName || 'School', academicYear: config.academicYear || '', levelThresholds: normalizeLevelThresholds_(config.levelThresholds) },
      students: [ownStudent], categories: categories, progress: categoryProgress_(book, actor.studentId, categories, config),
      catalog: visible ? catalog_(book).filter(function(item) { return item.active; }) : [], windows: visible ? [visible] : [],
      recentLedger: ownLedger, recentOrders: ownOrders, recentReceipts: receiptDtosForOrders_(book, ownOrderRows) };
  }
  if (actor.role !== 'admin') students = students.map(function(student) { return { id: student.id, firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, active: student.active, balance: student.balance, reservedPoints: student.reservedPoints, availableBalance: student.availableBalance }; });
  var catalogItems = catalog_(book), recentOrderRows = actor.role === 'staff' ? [] : orders_(book).slice(-50).reverse();
  var recentLedgerItems = actor.role === 'cashier' ? [] : ledger_(book).slice(-100).reverse();
  if (actor.role === 'staff') recentLedgerItems = recentLedgerItems.map(studentLedgerEntry_);
  var result = { ok: true, service: SR_SERVICE, version: SR_VERSION, actor: actor,
    config: { schoolName: config.schoolName || 'School', academicYear: config.academicYear || '', webAppUrl: config.webAppUrl || '', levelThresholds: normalizeLevelThresholds_(config.levelThresholds) },
    students: students, categories: categories, catalog: actor.role === 'admin' ? catalogItems : catalogItems.filter(function(item) { return item.active; }),
    windows: windows_(book).filter(function(item) { return item.status !== 'ARCHIVED'; }),
    recentLedger: recentLedgerItems, recentOrders: recentOrderRows.map(function(order) { return orderDto_(book, order); }), recentReceipts: actor.role === 'staff' ? [] : receiptDtosForOrders_(book, recentOrderRows),
    emailSchedule: emailSchedule_(), mailQuota: mailQuota_() };
  if (actor.role === 'admin') result.members = members_(book);
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
      balance: pointAvailability_(book, actor.studentId),
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
    var at = now_(), assetId = uuid_(), blob = Utilities.newBlob(bytes, mimeType, assetId + '-' + fileName);
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
  if (action === 'REJECT' && !reason) throw srError_('reason_required', 'Explain why the asset was rejected.');
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
    var book = book_(), item = requirePrintRequest_(book, requestId);
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
    var book = book_(), item = requirePrintRequest_(book, requestId), at = now_();
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
    var book = book_(), item = requirePrintRequest_(book, requestId);
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
    var book = book_(), item = requirePrintRequest_(book, requestId);
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
  var operation = printIdemOperation_('sis_snapshot_apply', actor, { snapshotId: normalized.snapshotId, contentHash: normalized.contentHash, expectedContentHash: expectedContentHash, expectedRosterRevision: expectedRosterRevision, formatVersion: normalized.formatVersion });
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
  var actor = requireRole_(['admin']), item = normalizeCatalog_(value);
  return locked_(function() { var saved = upsertCatalogRow_(book_(), item); appendAudit_({ event: 'CATALOG_UPDATED', type: 'catalog', id: saved.id, summary: 'Store item updated' }, actor); return { ok: true, item: saved }; });
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
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(); requireStudent_(book, studentId); if (categoryId) requireCategory_(book, categoryId);
    var entry = appendLedger_(book, { studentId: studentId, kind: 'EARN', amount: amount, reason: reason, referenceType: 'award', referenceId: '', reversesId: '', key: key, categoryId: categoryId }, actor);
    var balance = applyBalance_(book, studentId, amount, 0).balance;
    var result = { ok: true, entry: entry, balance: balance }; rememberIdem_(key, operation, result);
    appendAudit_({ event: 'POINTS_AWARDED', type: 'ledger', id: entry.id, summary: 'Points awarded: ' + amount }, actor); return result;
  });
}

function reverseSchoolRewardsEntry(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var entryId = id_(request.entryId, 'ledger entry'), key = idemKey_(request.idempotencyKey);
  var reason = text_(request.reason, 180, 'Administrative correction');
  var operation = printIdemOperation_('reverse', actor, { entryId: entryId, reason: reason });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), original = ledgerById_(book, entryId);
    if (!original) throw srError_('not_found', 'Ledger entry was not found.');
    if (original.kind === 'REVERSAL' || reversalExists_(book, entryId)) throw srError_('already_reversed', 'That entry has already been reversed.');
    if (original.kind !== 'EARN') throw srError_('order_refund_required', 'This pilot reverses award entries only. Purchase returns require an order-level refund so inventory and the ledger stay aligned.');
    var delta = -original.amount, before = pointAvailability_(book, original.studentId);
    if (before.availableBalance + delta < 0) throw srError_('points_reserved', 'This correction would consume points reserved for an active print request. Cancel the request first.');
    var entry = appendLedger_(book, { studentId: original.studentId, kind: 'REVERSAL', amount: delta, reason: reason, referenceType: 'reversal', referenceId: entryId, reversesId: entryId, key: key, categoryId: original.categoryId }, actor);
    var after = applyBalance_(book, original.studentId, delta, 0);
    var availability = pointAvailability_(book, original.studentId);
    var result = { ok: true, entry: entry, balance: after.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance }; rememberIdem_(key, operation, result);
    appendAudit_({ event: 'LEDGER_REVERSED', type: 'ledger', id: entry.id, summary: 'Ledger correction recorded' }, actor); return result;
  });
}

function checkoutSchoolRewardsOrder(request) {
  var actor = requireRole_(['admin', 'cashier']); request = object_(request);
  var studentId = id_(request.studentId, 'student'), windowId = id_(request.windowId, 'store window');
  var key = idemKey_(request.idempotencyKey), lines = cart_(request.lines);
  var operation = printIdemOperation_('checkout', actor, { studentId: studentId, windowId: windowId, lines: lines });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(); requireStudent_(book, studentId);
    var windowItem = windowById_(book, windowId);
    requireOpenWindowNow_(windowItem, 'Checkout');
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
    var orderId = uuid_(), at = now_();
    sheet_(book, 'Orders').appendRow(safeRow_([orderId, studentId, windowId, total, 'COMPLETED', actor.email, at, key]));
    orderLines.forEach(function(line) {
      sheet_(book, 'OrderLines').appendRow(safeRow_([orderId, line.catalogId, line.itemName, line.quantity, line.unitCost, line.lineTotal]));
      decrementInventory_(book, line.catalogId, line.quantity);
    });
    var entry = appendLedger_(book, { studentId: studentId, kind: 'SPEND', amount: -total, reason: 'School store order', referenceType: 'order', referenceId: orderId, reversesId: '', key: key, categoryId: '' }, actor);
    var after = applyBalance_(book, studentId, 0, total);
    var availability = pointAvailability_(book, studentId);
    var receipt = sendOrderReceipt_(book, requireStudent_(book, studentId), { id: orderId, total: total, at: at, lines: orderLines }, availability.availableBalance, 'PURCHASE');
    var result = { ok: true, order: { id: orderId, studentId: studentId, windowId: windowId, total: total, status: 'COMPLETED', at: at, lines: orderLines }, ledgerId: entry.id, balance: after.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance, receipt: receipt };
    rememberIdem_(key, operation, result); appendAudit_({ event: 'ORDER_COMPLETED', type: 'order', id: orderId, summary: 'Checkout: ' + total + ' points' }, actor); return result;
  });
}

function refundSchoolRewardsOrder(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var orderId = id_(request.orderId, 'order'), key = idemKey_(request.idempotencyKey);
  var reason = text_(request.reason, 180, 'Order refund');
  var operation = printIdemOperation_('refund', actor, { orderId: orderId, reason: reason });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), order = orderById_(book, orderId);
    if (!order) throw srError_('not_found', 'Order was not found.');
    if (printRequestByOrderId_(book, orderId)) throw srError_('print_refund_required', 'Use the print-request refund so its workflow and point hold remain reconciled.');
    if (order.status !== 'COMPLETED') throw srError_('not_refundable', 'Only a completed order can be refunded.');
    assertReceiptDeliverySettled_(book, orderId, 'PURCHASE');
    var spend = spendForOrder_(book, orderId);
    if (!spend || spend.amount !== -order.total) throw srError_('reconciliation', 'The order and spending ledger do not reconcile.');
    if (reversalExists_(book, spend.id)) throw srError_('already_refunded', 'That order has already been refunded.');
    var lines = orderLines_(book, orderId);
    if (!lines.length) throw srError_('reconciliation', 'The order has no item lines to restore.');
    var restorePlan = assertInventoryRestorable_(book, lines), student = requireStudentRecord_(book, order.studentId);
    var entry = appendLedger_(book, { studentId: order.studentId, kind: 'REFUND', amount: order.total, reason: reason, referenceType: 'order_refund', referenceId: orderId, reversesId: spend.id, key: key, categoryId: '' }, actor);
    var balance = applyBalance_(book, order.studentId, 0, -order.total);
    restorePlan.forEach(function(line) { incrementInventory_(book, line.catalogId, line.quantity); });
    setOrderStatus_(book, orderId, 'REFUNDED');
    var availability = pointAvailability_(book, order.studentId);
    var receipt = sendOrderReceipt_(book, student, { id: orderId, total: order.total, at: now_(), lines: lines }, availability.availableBalance, 'REFUND');
    var result = { ok: true, orderId: orderId, ledgerId: entry.id, restoredPoints: order.total, balance: balance.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance, receipt: receipt };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'ORDER_REFUNDED', type: 'order', id: orderId, summary: 'Order refunded: ' + order.total + ' points' }, actor);
    return result;
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

function sendSchoolRewardsBalanceStatements(request) {
  var actor = requireRole_(['admin']); request = object_(request);
  var period = text_(request.periodKey, 60, now_().slice(0, 10));
  var limit = integer_(request.limit == null ? 100 : request.limit, 1, SR_MAX_BATCH, 'Batch limit');
  return locked_(function() { return sendStatements_(period, limit, actor); });
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
  var key = idemKey_(request.idempotencyKey), operation = printIdemOperation_('guardian_digest_send', actor, { periodKey: period, limit: limit });
  return locked_(function() {
    var prior = idemResult_(key, operation); if (prior) return prior;
    var book = book_(), config = configMap_(book), guardianList = guardians_(book).filter(function(guardian) { return guardian.active && guardian.consentConfirmedAt; });
    var sentKeys = guardianDigestKeys_(book), quota = mailQuota_(), cap = Math.min(limit, quota), sent = 0, skipped = 0, failed = 0, at = now_();
    for (var i = 0; i < guardianList.length && sent + failed < cap; i++) {
      var guardian = guardianList[i], student;
      try { student = requireStudent_(book, guardian.studentId); } catch (_) { skipped++; continue; }
      var emailHash = hash_(guardian.guardianEmail), digestKey = guardian.studentId + '|' + emailHash + '|' + period;
      if (sentKeys[digestKey]) { skipped++; continue; }
      var availability = pointAvailability_(book, student.id), balance = balance_(book, student.id);
      var positiveProgress = categoryProgress_(book, student.id, categories_(book), config).filter(function(item) { return item.points > 0; }).slice(0, 8);
      var digest = guardianDigestBodies_(guardian, student, availability, balance.earned, positiveProgress, config, at), digestId = uuid_(), status = 'SENT', error = '';
      try { MailApp.sendEmail({ to: guardian.guardianEmail, subject: (config.schoolName || 'School') + ' positive rewards update', name: (config.schoolName || 'School') + ' School Rewards', body: digest.body, htmlBody: digest.htmlBody }); sent++; }
      catch (err) { status = 'FAILED'; error = text_(err && err.message, 300, 'Mail send failed'); failed++; }
      sheet_(book, 'GuardianDigests').appendRow(safeRow_([digestId, student.id, emailHash, period, status, at, error]));
    }
    var result = { ok: failed === 0, periodKey: period, sent: sent, skipped: skipped, failed: failed, remainingQuota: Math.max(0, quota - sent) };
    rememberIdem_(key, operation, result);
    appendAudit_({ event: 'GUARDIAN_DIGESTS_SENT', type: 'guardian_digest_batch', id: period, summary: sent + ' privacy-minimized positive digests sent, ' + failed + ' failed' }, actor);
    return result;
  });
}

/** Aggregate-only payload suitable for an approved district collection process. */
function getSchoolRewardsDistrictSummary(request) {
  requireRole_(['admin']); request = object_(request);
  var book = book_(), selectedWindowId = optionalId_(request.windowId, 'store window'), config = configMap_(book);
  var activeStudents = students_(book).filter(function(student) { return student.active; });
  var balances = balancesMap_(book), totalEarned = 0, totalSpent = 0, totalBalance = 0, reserved = 0;
  activeStudents.forEach(function(student) { var value = balances[student.id] || { earned: 0, spent: 0, balance: 0 }; totalEarned += value.earned; totalSpent += value.spent; totalBalance += value.balance; reserved += pointAvailability_(book, student.id, balances).reservedPoints; });
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
  var enabled = request.enabled === true, weekday = text_(request.weekday, 12, 'FRIDAY').toUpperCase();
  var hour = integer_(request.hour == null ? 16 : request.hour, 0, 23, 'Hour');
  if (!{ MONDAY: 1, TUESDAY: 1, WEDNESDAY: 1, THURSDAY: 1, FRIDAY: 1 }[weekday]) throw srError_('bad_schedule', 'Choose a school weekday.');
  ScriptApp.getProjectTriggers().forEach(function(trigger) { if (trigger.getHandlerFunction() === 'runScheduledSchoolRewardsStatements') ScriptApp.deleteTrigger(trigger); });
  if (enabled) ScriptApp.newTrigger('runScheduledSchoolRewardsStatements').timeBased().onWeekDay(ScriptApp.WeekDay[weekday]).atHour(hour).everyWeeks(1).create();
  PropertiesService.getScriptProperties().setProperties({ SR_EMAIL_ENABLED: String(enabled), SR_EMAIL_WEEKDAY: weekday, SR_EMAIL_HOUR: String(hour) }, false);
  appendAudit_({ event: 'EMAIL_SCHEDULE_UPDATED', type: 'schedule', id: 'balance-statements', summary: enabled ? 'Weekly balance emails enabled' : 'Weekly balance emails disabled' }, actor);
  return { ok: true, schedule: emailSchedule_() };
}

function runScheduledSchoolRewardsStatements() {
  var actor = scheduledAdminActor_();
  return locked_(function() { return sendStatements_('weekly-' + now_().slice(0, 10), SR_MAX_BATCH, actor); });
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
  var book = book_(), config = configMap_(book), balances = balancesMap_(book), existing = statementKeys_(book);
  var students = students_(book).filter(function(student) { return student.active && student.email; });
  var quota = mailQuota_(), cap = Math.min(limit, quota), sent = 0, skipped = 0, failed = 0, asOf = now_();
  var windowItem = visibleWindow_(book);
  var prizes = windowItem ? catalog_(book).filter(function(item) { return item.active; }).slice(0, 12) : [];
  for (var i = 0; i < students.length && sent + failed < cap; i++) {
    var student = students[i], statementKey = student.id + '|' + period;
    if (existing[statementKey]) { skipped++; continue; }
    var availability = pointAvailability_(book, student.id, balances), statementId = uuid_();
    try {
      MailApp.sendEmail({ to: student.email, subject: (config.schoolName || 'School') + ' rewards update', name: (config.schoolName || 'School') + ' School Rewards', body: statementText_(student, availability, asOf, config, windowItem, prizes), htmlBody: statementHtml_(student, availability, asOf, config, windowItem, prizes) });
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
function statementText_(student, availability, asOf, config, windowItem, prizes) {
  var out = ['Hello ' + student.firstName + ',', '', 'Here is your private school rewards update.', 'Ledger balance: ' + availability.balance + ' points.', 'Reserved for active requests: ' + availability.reservedPoints + ' points.', 'Available to spend: ' + availability.availableBalance + ' points.', 'Balance as of ' + asOf + '.'];
  if (windowItem) out.push('', windowSentence_(windowItem));
  if (prizes.length) { out.push('', 'Prize preview:'); prizes.forEach(function(item) { out.push('• ' + item.name + ' — ' + item.cost + ' points'); }); }
  out.push('', 'This message is informational. The live ledger at checkout is the official balance. Contact your school if you have a question.'); return out.join('\n');
}
function statementHtml_(student, availability, asOf, config, windowItem, prizes) {
  var catalogPreview = prizes.length ? '<h2 style="font-size:16px">Prize preview</h2><ul>' + prizes.map(function(item) { return '<li>' + html_(item.name) + ' — <strong>' + item.cost + ' points</strong></li>'; }).join('') + '</ul>' : '';
  var windowText = windowItem ? '<p>' + html_(windowSentence_(windowItem)) + '</p>' : '';
  return '<div style="font:16px system-ui;line-height:1.55;color:#172033;max-width:620px"><p>Hello ' + html_(student.firstName) + ',</p><h1 style="font-size:22px">Your school rewards update</h1><p>Ledger balance: <strong>' + availability.balance + ' points</strong><br>Reserved for active requests: <strong>' + availability.reservedPoints + ' points</strong><br>Available to spend: <strong style="font-size:1.2em">' + availability.availableBalance + ' points</strong></p><p style="color:#526079">Balance as of ' + html_(asOf) + '.</p>' + windowText + catalogPreview + '<p style="font-size:13px;color:#526079">This message is informational. The live ledger at checkout is the official balance. Contact your school with questions.</p></div>';
}
function windowSentence_(item) { if (item.status === 'OPEN') return 'The school store is open now.'; if (item.status === 'PREVIEW') return 'Prize preview is available for ' + item.name + (item.startsAt ? '; shopping begins ' + item.startsAt : '') + '.'; return item.name + ' is ' + item.status.toLowerCase() + '.'; }

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
function scheduledAdminActor_() {
  if (!configured_()) throw srError_('not_configured', 'School Rewards has not been configured.');
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
  var active = value.active !== false, consentAt = existing && existing.guardianEmail === email ? existing.consentConfirmedAt : '';
  if (value.consentConfirmed === true) consentAt = now_();
  if (active && !consentAt) throw srError_('consent_required', 'Confirm guardian communication authorization before enabling digests.');
  return { id: existing ? existing.id : requestedId, studentId: studentId, guardianEmail: email, guardianName: text_(value.guardianName, 120, existing ? existing.guardianName : ''), relationship: text_(value.relationship, 80, existing ? existing.relationship : 'Guardian'), active: active, consentConfirmedAt: consentAt, createdAt: existing ? existing.createdAt : '', updatedAt: '' };
}
function upsertGuardianRow_(book, guardian) {
  var at = now_(); guardian.id = guardian.id || uuid_(); guardian.createdAt = guardian.createdAt || at; guardian.updatedAt = at;
  guardians_(book).forEach(function(item) { if (item.id !== guardian.id && item.studentId === guardian.studentId && item.guardianEmail === guardian.guardianEmail) throw srError_('duplicate_guardian', 'That guardian mapping already exists.'); });
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
  var seen = {}, normalized = raw.map(function(value) {
    value = object_(value); if (value.active === false) throw srError_('sis_deactivation_disabled', 'The provider-neutral SIS pilot does not deactivate missing or inactive rows.');
    var email = normalizeEmail_(value.email); if (!email || seen[email]) throw srError_('bad_sis_snapshot', seen[email] ? 'The SIS snapshot contains a duplicate email.' : 'Every SIS row needs a valid managed student email.'); seen[email] = true;
    var suppliedId = optionalId_(value.id, 'student'), matched = suppliedId ? byId[suppliedId] : byEmail[email];
    if (suppliedId && byEmail[email] && byEmail[email].id !== suppliedId) throw srError_('bad_sis_snapshot', 'A supplied student id conflicts with the existing managed email.');
    var student = normalizeStudent_({ firstName: value.firstName, lastInitial: value.lastInitial, grade: value.grade, homeroom: value.homeroom, email: email, active: true }, allowedDomain_(), matched ? matched.id : suppliedId); student.active = true; return student;
  });
  var contentHash = hash_(stableJson_(normalized.map(function(student) { return { firstName: student.firstName, lastInitial: student.lastInitial, grade: student.grade, homeroom: student.homeroom, email: student.email, active: true }; })));
  return { formatVersion: formatVersion, snapshotId: snapshotId, contentHash: contentHash, students: normalized };
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
  if (remix && remix.ownerStudentId !== studentId && remix.publicationStatus !== 'PUBLISHED') throw srError_('denied', 'Only a published community model can be remixed.');
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
function pointAvailability_(book, studentId, balanceMap) { var row = balanceMap && balanceMap[studentId] ? balanceMap[studentId] : balance_(book, studentId), reserved = 0; pointHolds_(book).forEach(function(hold) { if (hold.studentId === studentId && hold.status === 'ACTIVE') reserved += hold.amount; }); var available = row.balance - reserved; if (available < 0) throw srError_('reconciliation', 'Active point reservations exceed the ledger balance.'); return { studentId: studentId, balance: row.balance, reservedPoints: reserved, availableBalance: available }; }
function printReservationResult_(book, item, hold) { var availability = pointAvailability_(book, item.studentId); return { ok: true, request: printRequestDto_(item), hold: pointHoldDto_(hold), balance: availability.balance, reservedPoints: availability.reservedPoints, availableBalance: availability.availableBalance }; }

function spendForPrintRequest_(book, requestId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].kind === 'SPEND' && list[i].referenceType === 'print_request' && list[i].referenceId === requestId) return list[i]; return null; }
function refundForPrintRequest_(book, requestId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].kind === 'REFUND' && list[i].referenceType === 'print_request_refund' && list[i].referenceId === requestId) return list[i]; return null; }
function rebuildBalanceFromLedger_(book, studentId) { var earned = 0, spent = 0; ledger_(book).forEach(function(entry) { if (entry.studentId !== studentId) return; if (entry.kind === 'EARN' || entry.kind === 'REVERSAL') earned += entry.amount; else if (entry.kind === 'SPEND') spent += -entry.amount; else if (entry.kind === 'REFUND') spent -= entry.amount; }); if (earned < 0 || spent < 0 || earned - spent < 0) throw srError_('reconciliation', 'The ledger cannot produce a valid student balance.'); var value = { studentId: studentId, earned: earned, spent: spent, balance: earned - spent, updatedAt: now_() }; upsert_(sheet_(book, 'Balances'), 5, studentId, safeRow_([studentId, value.earned, value.spent, value.balance, value.updatedAt])); return value; }
function sendOrderReceiptOnce_(book, student, order, availableBalance, kind) { var sent = sentReceiptForOrder_(book, order.id, kind); if (sent) return { id: sent.id, kind: kind, status: sent.status, sentAt: sent.sentAt, points: kind === 'REFUND' ? order.total : -order.total }; var previous = latestReceiptForOrder_(book, order.id, kind); if (previous && (previous.status === 'PENDING' || previous.status === 'UNKNOWN')) return { id: previous.id, kind: kind, status: 'UNKNOWN', sentAt: previous.sentAt, points: kind === 'REFUND' ? order.total : -order.total }; return sendOrderReceipt_(book, student, order, availableBalance, kind); }

function printIdemOperation_(base, actor, payload) { return base + ':' + hash_(actor.email).slice(0, 12) + ':' + hash_(stableJson_(payload)).slice(0, 16); }
function stableJson_(value) { if (value == null) return 'null'; if (typeof value === 'number') return isFinite(value) ? String(value) : 'null'; if (typeof value === 'boolean') return value ? 'true' : 'false'; if (typeof value === 'string') return JSON.stringify(value); if (Array.isArray(value)) return '[' + value.map(stableJson_).join(',') + ']'; if (typeof value === 'object') return '{' + Object.keys(value).sort().map(function(key) { return JSON.stringify(key) + ':' + stableJson_(value[key]); }).join(',') + '}'; return 'null'; }
function boundedNumber_(value, min, max, label) { var number = Number(value); if (!isFinite(number) || number < min || number > max) throw srError_('bad_number', label + ' must be from ' + min + ' to ' + max + '.'); return number; }

function catalog_(book) { return rows_(sheet_(book, 'Catalog'), 10).map(function(row) { return { id: String(row[0] || ''), name: String(row[1] || ''), description: String(row[2] || ''), cost: number_(row[3]), inventoryLimit: number_(row[4]), remaining: number_(row[5]), active: bool_(row[6]), imageUrl: String(row[7] || ''), createdAt: cell_(row[8]), updatedAt: cell_(row[9]) }; }); }
function normalizeCatalog_(value) { value = object_(value); var inventory = value.inventoryLimit == null || value.inventoryLimit === '' ? -1 : integer_(value.inventoryLimit, -1, 100000, 'Inventory'); var remainingProvided = value.remaining != null && value.remaining !== '', remaining = remainingProvided ? integer_(value.remaining, 0, 100000, 'Remaining inventory') : null; if (inventory >= 0 && remainingProvided && remaining > inventory) throw srError_('bad_catalog', 'Remaining inventory cannot exceed the limit.'); return { id: text_(value.id, 80, ''), name: text_(value.name, 120, ''), description: text_(value.description, 500, ''), cost: integer_(value.cost, 1, 100000, 'Cost'), inventoryLimit: inventory, remaining: inventory < 0 ? -1 : remaining, remainingProvided: remainingProvided, active: value.active !== false, imageUrl: httpsUrl_(value.imageUrl || '') }; }
function upsertCatalogRow_(book, item) { if (!item.name) throw srError_('bad_catalog', 'Store item name is required.'); var existing = catalog_(book), itemId = item.id || uuid_(), createdAt = now_(), oldItem = null; existing.forEach(function(old) { if (old.id === itemId) { oldItem = old; createdAt = old.createdAt || createdAt; } }); var explicitRemaining = item.remainingProvided === false ? false : item.remaining != null && item.remaining !== '', remaining = item.inventoryLimit < 0 ? -1 : explicitRemaining ? item.remaining : oldItem && oldItem.inventoryLimit >= 0 ? Math.min(oldItem.remaining, item.inventoryLimit) : item.inventoryLimit; var saved = { id: itemId, name: item.name, description: item.description, cost: item.cost, inventoryLimit: item.inventoryLimit, remaining: remaining, active: item.active, imageUrl: item.imageUrl, createdAt: createdAt, updatedAt: now_() }; upsert_(sheet_(book, 'Catalog'), 10, itemId, safeRow_([saved.id, saved.name, saved.description, saved.cost, saved.inventoryLimit, saved.remaining, saved.active, saved.imageUrl, saved.createdAt, saved.updatedAt])); return saved; }
function decrementInventory_(book, itemId, quantity) { var list = catalog_(book); for (var i = 0; i < list.length; i++) if (list[i].id === itemId) { if (list[i].inventoryLimit >= 0) { list[i].remaining -= quantity; upsertCatalogRow_(book, list[i]); } return; } throw srError_('catalog_changed', 'Store item was not found.'); }
function incrementInventory_(book, itemId, quantity) { var list = catalog_(book); for (var i = 0; i < list.length; i++) if (list[i].id === itemId) { if (list[i].inventoryLimit >= 0) { if (list[i].remaining + quantity > list[i].inventoryLimit) throw srError_('reconciliation', 'Refund would make inventory exceed its configured limit for ' + list[i].name + '.'); list[i].remaining += quantity; upsertCatalogRow_(book, list[i]); } return; } throw srError_('catalog_changed', 'Store item was not found.'); }
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
function studentLedgerEntry_(entry) { return { id: entry.id, studentId: entry.studentId, kind: entry.kind, amount: entry.amount, reason: entry.reason, referenceType: entry.referenceType, referenceId: entry.referenceId, reversesId: entry.reversesId, at: entry.at, categoryId: entry.categoryId }; }
function ledgerById_(book, entryId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].id === entryId) return list[i]; return null; }
function reversalExists_(book, entryId) { return ledger_(book).some(function(entry) { return entry.reversesId === entryId; }); }

function balancesMap_(book) { var map = {}; rows_(sheet_(book, 'Balances'), 5).forEach(function(row) { map[String(row[0])] = { studentId: String(row[0]), earned: number_(row[1]), spent: number_(row[2]), balance: number_(row[3]), updatedAt: cell_(row[4]) }; }); return map; }
function balance_(book, studentId) { return balancesMap_(book)[studentId] || { studentId: studentId, earned: 0, spent: 0, balance: 0, updatedAt: '' }; }
function applyBalance_(book, studentId, earnedDelta, spentDelta) { var value = balance_(book, studentId); value.earned += earnedDelta; value.spent += spentDelta; value.balance = value.earned - value.spent; if (value.balance < 0) throw srError_('insufficient_balance', 'Balance cannot be negative.'); value.updatedAt = now_(); upsert_(sheet_(book, 'Balances'), 5, studentId, safeRow_([studentId, value.earned, value.spent, value.balance, value.updatedAt])); return value; }
function orders_(book) { return rows_(sheet_(book, 'Orders'), 8).map(function(row) { return { id: String(row[0] || ''), studentId: String(row[1] || ''), windowId: String(row[2] || ''), total: number_(row[3]), status: String(row[4] || ''), actorEmail: String(row[5] || ''), at: cell_(row[6]), idempotencyKey: String(row[7] || '') }; }); }
function orderById_(book, orderId) { var list = orders_(book); for (var i = 0; i < list.length; i++) if (list[i].id === orderId) return list[i]; return null; }
function orderLines_(book, orderId) { return rows_(sheet_(book, 'OrderLines'), 6).filter(function(row) { return String(row[0]) === orderId; }).map(function(row) { return { orderId: String(row[0]), catalogId: String(row[1]), itemName: String(row[2]), quantity: number_(row[3]), unitCost: number_(row[4]), lineTotal: number_(row[5]) }; }); }
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
function spendForOrder_(book, orderId) { var list = ledger_(book); for (var i = 0; i < list.length; i++) if (list[i].kind === 'SPEND' && list[i].referenceType === 'order' && list[i].referenceId === orderId) return list[i]; return null; }
function cart_(value) { if (!Array.isArray(value) || !value.length || value.length > 50) throw srError_('bad_cart', 'Choose between 1 and 50 store items.'); var map = {}; value.forEach(function(line) { var itemId = id_(line && line.catalogId, 'catalog item'), quantity = integer_(line && line.quantity, 1, 100, 'Quantity'); map[itemId] = (map[itemId] || 0) + quantity; }); return Object.keys(map).sort().map(function(itemId) { return { catalogId: itemId, quantity: map[itemId] }; }); }
function statementKeys_(book) { var map = {}; rows_(sheet_(book, 'Statements'), 7).forEach(function(row) { if (String(row[4]) === 'SENT') map[String(row[1]) + '|' + String(row[2])] = true; }); return map; }
function emailSchedule_() { var props = PropertiesService.getScriptProperties(); return { enabled: props.getProperty('SR_EMAIL_ENABLED') === 'true', weekday: props.getProperty('SR_EMAIL_WEEKDAY') || 'FRIDAY', hour: number_(props.getProperty('SR_EMAIL_HOUR') || 16) }; }
function mailQuota_() { try { return Math.max(0, Number(MailApp.getRemainingDailyQuota()) || 0); } catch (_) { return 0; } }

function appendAudit_(value, actor) { var target = sheet_(book_(), 'Audit'), history = rows_(target, 10), previous = history.length ? cell_(history[history.length - 1][9]) : 'GENESIS'; var fields = safeRow_([uuid_(), value.event, value.type, value.id, text_(value.summary, 240, ''), actor.email, actor.role, now_()]).concat([previous]); target.appendRow(fields.concat(['h_' + hash_(fields.join('|'))])); }
function idemKey_(value) { var key = text_(value, 120, ''); if (!/^[A-Za-z0-9:_-]{8,120}$/.test(key)) throw srError_('bad_idempotency_key', 'A stable request key is required.'); return key; }
function idemResult_(key, operation) { var entries = rows_(sheet_(book_(), 'Idempotency'), 4); for (var i = 0; i < entries.length; i++) if (String(entries[i][0]) === key) { if (String(entries[i][1]) !== operation) throw srError_('idempotency_conflict', 'That request key was already used.'); return JSON.parse(String(entries[i][2] || '{}')); } return null; }
function rememberIdem_(key, operation, result) { sheet_(book_(), 'Idempotency').appendRow(safeRow_([key, operation, JSON.stringify(result), now_()])); }

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
