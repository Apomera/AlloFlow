/**
 * AlloFlow Educator Evaluation Repository
 *
 * District-owned Apps Script service for the shared AlloFlow evaluation UI.
 * Every public operation derives the actor from Session.getActiveUser(); no
 * email, role, timestamp, author, or audit identity supplied by a client is
 * trusted. Deployments must be restricted to the district Workspace domain.
 */

var EE_SERVICE = 'alloflow-educator-evaluation';
var EE_VERSION = 1;
var EE_MAX_WORKSPACE_BYTES = 5 * 1024 * 1024;
var EE_MAX_MESSAGE_CHARS = 3000;
var EE_MAX_SUMMARY_CHARS = 240;
var EE_MAX_DEPTH = 18;
var EE_MIN_COHORT = 10;
var EE_MAX_AUDIT = 5000;
var EE_ROLLOVER_REVIEW_SECONDS = 600;
var EE_ADMIN_REVIEW_SECONDS = 600;
var EE_RELEASE_ACL_BATCH_SIZE = 20;
var EE_MAX_RELEASE_VIEWERS = 100;
var EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS = 250;
var EE_RELEASE_RECOVERY_MAX_ITEMS = 24;
var EE_RELEASE_RECOVERY_MAX_CHARS = 6500;
var EE_SECONDARY_AUDIT_MAX_ITEMS = 12;
var EE_SECONDARY_RECOVERY_MAX_CHARS = 6500;
var EE_SECONDARY_ISSUE_SAMPLE_MAX = 12;
var EE_NOTIFICATION_OPERATION_JOURNAL_PROPERTY = 'EE_NOTIFICATION_OPERATION_JOURNAL';
var EE_NOTIFICATION_OPERATION_MAX_ITEMS = 12;
var EE_NOTIFICATION_OPERATION_MAX_CHARS = 7800;
var EE_NOTIFICATION_REVIEW_SECONDS = 600;
var EE_PROP_PREFIX = 'EE_';
var EE_SHEETS = {
  Config: ['Key', 'Value'],
  Members: ['Email', 'DisplayName', 'Role', 'TeacherId', 'Active'],
  Assignments: ['TeacherId', 'EvaluatorEmail', 'Active'],
  Workspace: ['Key', 'Revision', 'FileId', 'Sha256', 'UpdatedAt', 'UpdatedBy'],
  Messages: ['Id', 'TeacherId', 'RecordType', 'RecordId', 'AuthorEmail', 'AuthorRole', 'Text', 'At'],
  Receipts: ['Id', 'TeacherId', 'RecordType', 'RecordId', 'ReceiptType', 'ActorEmail', 'ActorRole', 'At'],
  Audit: ['Id', 'TeacherId', 'Event', 'Summary', 'EntityType', 'EntityId', 'EntityVersion', 'ActorEmail', 'ActorRole', 'At', 'PreviousHash', 'Hash'],
  Snapshots: ['Id', 'TeacherId', 'StaffCode', 'AcademicYear', 'Building', 'EmployeeType', 'FinalizedAt', 'FinalScore', 'D1', 'D2', 'D3', 'D4', 'FrameworkVersion']
};

function assertNoAnnualRolloverRecovery_(options) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED')) {
    throw eeError_('rollover_recovery_required', 'An interrupted annual rollover must be rechecked before making any other changes. Ask an administrator to run Recheck interrupted rollover.');
  }
  if (!(options && options.allowArtifactRecovery)) assertNoArtifactOperationRecovery_();
}

function assertNoArtifactOperationRecovery_() {
  var props = PropertiesService.getScriptProperties();
  var journal = readArtifactOperationJournal_();
  if (journal.ambiguous || journal.unreadable || props.getProperty('EE_ARTIFACT_RECOVERY_MANUAL_REQUIRED')) throw eeError_('manual_recovery_required', 'Artifact recovery metadata requires district IT review before making another change.');
  var pending = false;
  for (var i = 0; i < journal.entries.length; i++) if (journal.entries[i].stage !== 'completed') { pending = true; break; }
  var marked = !!props.getProperty('EE_ARTIFACT_RECOVERY_REQUIRED');
  try {
    if (pending && !marked) props.setProperty('EE_ARTIFACT_RECOVERY_REQUIRED', '1');
    else if (!pending && marked) props.deleteProperty('EE_ARTIFACT_RECOVERY_REQUIRED');
  } catch (markerErr) {
    try { props.setProperty('EE_ARTIFACT_RECOVERY_MANUAL_REQUIRED', '1'); } catch (manualMarkerErr) {}
    throw eeError_('manual_recovery_required', 'Artifact recovery status could not be reconciled safely. District IT must inspect the repository before another change.');
  }
  if (pending) throw artifactRecoveryRequiredError_();
}

function assertNoPendingWorkspaceCommit_() {
  if (PropertiesService.getScriptProperties().getProperty('EE_COMMIT_RECOVERY_REQUIRED')) {
    throw eeError_('commit_recovery_required', 'A pending workspace journal must be reviewed and reconciled from Setup health before preparing or confirming this operation.');
  }
}

function doGet(e) {
  var mode = String(e && e.parameter && e.parameter.api || '');
  if (mode === 'health') {
    try {
      currentActor_();
      return jsonOutput_({ ok: true, service: EE_SERVICE, version: EE_VERSION, configured: true });
    } catch (healthErr) { return jsonOutput_(publicError_(healthErr)); }
  }
  try {
    currentActor_(); // fail closed before rendering confidential UI
    return HtmlService.createTemplateFromFile('Index').evaluate()
      .setTitle('AlloFlow Educator Growth & Evaluation');
  } catch (err) {
    return HtmlService.createHtmlOutput('<!doctype html><meta charset="utf-8"><title>Access unavailable</title><main style="font:16px system-ui;max-width:680px;margin:64px auto;padding:24px"><h1>Access unavailable</h1><p>This district evaluation portal could not verify an authorized managed Google account.</p><p>Ask your district administrator to verify the deployment access setting and your membership.</p></main>');
  }
}

function doPost(e) {
  // The authenticated portal uses google.script.run, which supplies Apps
  // Script's same-deployment origin and user context. A generic HTTP mutation
  // dispatcher would add a needless cross-origin/CSRF surface.
  return jsonOutput_({ ok: false, code: 'method_not_allowed', error: 'HTTP mutation is disabled. Use the authenticated district portal.' });
}function include(filename) {
  var allowed = { Portal: true };
  if (!allowed[String(filename || '')]) throw eeError_('denied', 'Template include denied.');
  return HtmlService.createHtmlOutputFromFile(String(filename)).getContent();
}

/**
 * One-time/bootstrap helper. Run from the Apps Script editor as the intended
 * district repository owner. Re-running is admin-only and never changes the
 * repository owner implicitly.
 *
 * config: {allowedDomain, bootstrapAdmin, organization, building,
 * academicYear, webAppUrl?, teachers?, members?, assignments?}
 */
function setupEvaluationRepository(config) {
  config = isPlainObject_(config) ? config : {};
  var email = activeEmail_();
  var existing = repositoryConfigured_();
  if (!existing) {
    var effectiveEmail = '';
    try { effectiveEmail = normalizeEmail_(Session.getEffectiveUser().getEmail()); } catch (ownerErr) {}
    if (!effectiveEmail || effectiveEmail !== email) throw eeError_('denied', 'Initial setup must be run by the Apps Script deployment owner.');
  }
  if (existing) {
    var existingActor = currentActor_();
    if (existingActor.role !== 'admin') throw eeError_('denied', 'Only an administrator can update repository setup.');
    assertNoAnnualRolloverRecovery_();
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    // A second setup may have completed while this caller waited. Re-detect
    // and re-authorize under the same lock used by rollover and mutations.
    existing = repositoryConfigured_();
    if (!existing) {
      var lockedEffectiveEmail = '';
      try { lockedEffectiveEmail = normalizeEmail_(Session.getEffectiveUser().getEmail()); } catch (lockedOwnerErr) {}
      if (!lockedEffectiveEmail || lockedEffectiveEmail !== email) throw eeError_('denied', 'Initial setup must be run by the Apps Script deployment owner.');
    } else {
      var lockedExistingActor = currentActor_();
      if (lockedExistingActor.role !== 'admin') throw eeError_('denied', 'Only an administrator can update repository setup.');
      assertNoAnnualRolloverRecovery_();
    }
    var domain = normalizeDomain_(config.allowedDomain || email.split('@')[1]);
    if (!domain || emailDomain_(email) !== domain) throw eeError_('bad_config', 'Allowed domain must match the setup account.');
    var bootstrapAdmin = normalizeEmail_(config.bootstrapAdmin || email);
    if (!existing && bootstrapAdmin !== email) throw eeError_('bad_config', 'The first bootstrap administrator must be the setup account.');
    var initialWorkspace = blankWorkspace_(config);
    var setupMembers = normalizeSetupMembers_(config.members, domain);
    var setupAssignments = normalizeSetupAssignments_(config.assignments, domain);
    if (!existing) validateDeclaredSetupReferences_(initialWorkspace.teachers, setupMembers, setupAssignments, bootstrapAdmin);
    for (var setupMemberIndex = 0; setupMemberIndex < setupMembers.length; setupMemberIndex++) if (setupMembers[setupMemberIndex].email === bootstrapAdmin && (!setupMembers[setupMemberIndex].active || setupMembers[setupMemberIndex].role !== 'admin')) throw eeError_('bad_config', 'Setup members cannot deactivate or demote the bootstrap administrator.');

    var props = PropertiesService.getScriptProperties();
    var folder;
    var spreadsheet;
    var workspaceFile;
    var pendingFile;
    if (!existing) {
      folder = DriveApp.createFolder('AlloFlow Educator Evaluation Repository');
      setPrivate_(folder);
      spreadsheet = SpreadsheetApp.create('AlloFlow Educator Evaluation Repository - Protected Index');
      var spreadsheetFile = DriveApp.getFileById(spreadsheet.getId());
      try { spreadsheetFile.moveTo(folder); } catch (moveErr) {}
      setPrivate_(spreadsheetFile);
      workspaceFile = folder.createFile('workspace.json', JSON.stringify(initialWorkspace), MimeType.PLAIN_TEXT);
      setPrivate_(workspaceFile);
      pendingFile = folder.createFile('workspace.pending.json', '', MimeType.PLAIN_TEXT);
      setPrivate_(pendingFile);
      props.setProperties({
        EE_ALLOWED_DOMAIN: domain,
        EE_BOOTSTRAP_ADMIN: bootstrapAdmin,
        EE_FOLDER_ID: folder.getId(),
        EE_SPREADSHEET_ID: spreadsheet.getId(),
        EE_WORKSPACE_FILE_ID: workspaceFile.getId(),
        EE_PENDING_COMMIT_FILE_ID: pendingFile.getId(),
        EE_SETUP_STATE: 'initializing'
      }, false);
    } else {
      spreadsheet = repositorySpreadsheet_();
      folder = DriveApp.getFolderById(props.getProperty('EE_FOLDER_ID'));
      workspaceFile = DriveApp.getFileById(props.getProperty('EE_WORKSPACE_FILE_ID'));
      var pendingId = props.getProperty('EE_PENDING_COMMIT_FILE_ID');
      if (pendingId) pendingFile = DriveApp.getFileById(pendingId);
      else { pendingFile = folder.createFile('workspace.pending.json', '', MimeType.PLAIN_TEXT); setPrivate_(pendingFile); props.setProperty('EE_PENDING_COMMIT_FILE_ID', pendingFile.getId()); }
      if (domain !== props.getProperty('EE_ALLOWED_DOMAIN')) throw eeError_('bad_config', 'Changing the allowed domain requires a new reviewed deployment.');
    }

    initializeSheets_(spreadsheet);
    putConfigRows_(spreadsheet, {
      service: EE_SERVICE,
      schemaVersion: String(EE_VERSION),
      allowedDomain: domain,
      organization: safeString_(config.organization, 160, 'District'),
      building: safeString_(config.building, 160, ''),
      academicYear: safeString_(config.academicYear, 20, ''),
      webAppUrl: safePortalUrl_(config.webAppUrl || '')
    });
    upsertMemberRow_(spreadsheet, { email: bootstrapAdmin, displayName: safeString_(config.adminDisplayName, 160, 'Repository Administrator'), role: 'admin', teacherId: '', active: true });
    seedMembersAndAssignments_(spreadsheet, setupMembers, setupAssignments, domain);

    if (existing) assertNoPendingWorkspaceCommit_();
    var state = readWorkspaceState_();
    validateRepositoryReferences_(state.workspace);
    if (!state.metadataExists) writeWorkspaceState_(state.workspace, 0, email, lock);
    syncSnapshots_(state.workspace);
    appendOperationAuditBestEffort_({ teacherId: '', event: existing ? 'REPOSITORY_RECONFIGURED' : 'REPOSITORY_CREATED', summary: existing ? 'Repository configuration reviewed' : 'District repository created', entityType: 'repository', entityId: 'repository', version: state.revision }, { email: email, role: 'admin' });
    props.setProperty('EE_SETUP_STATE', 'ready');
    return { ok: true, service: EE_SERVICE, version: EE_VERSION, allowedDomain: domain, spreadsheetId: spreadsheet.getId(), folderId: folder.getId(), activeUserEmail: email };
  } finally { lock.releaseLock(); }
}

function verifyDeploymentIdentity() {
  var actor = currentActor_();
  return { ok: true, email: actor.email, role: actor.role, teacherId: actor.teacherId || '', domain: emailDomain_(actor.email) };
}

// Every audit row stores the previous row's hash plus a hash of its own fields,
// which makes the log tamper-EVIDENT only if something actually recomputes it.
// Admin-callable, read-only, and deliberately content-free: it reports positions
// and entry ids so an administrator can investigate in the sheet, never the
// evaluation text of the rows themselves.
function verifyAuditChain() {
  requireAdmin_();
  return auditChainStatus_();
}

// Shared by verifyAuditChain() and the Setup health panel, so an administrator
// gets the same answer whether they run it from the script editor or the portal.
function auditChainStatus_(rows) {
  // Callers that already fetched the ledger may supply that exact snapshot so
  // identity checks and chain verification cannot observe different reads.
  if (rows === undefined) rows = auditLedgerRows_();
  var previous = 'GENESIS';
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    var fields = [];
    for (var c = 0; c < 11; c++) fields.push(auditCellText_(row[c]));
    var stored = auditCellText_(row[11]);
    // A break in the link means a row was removed, reordered, or inserted.
    if (fields[10] !== previous) {
      return { ok: false, reason: 'link', rows: rows.length, verified: i, brokenAtRow: i + 2, entryId: fields[0] };
    }
    // A content mismatch means a row was edited in place after it was written.
    if (hashText_(fields.join('|')) !== stored) {
      return { ok: false, reason: 'content', rows: rows.length, verified: i, brokenAtRow: i + 2, entryId: fields[0] };
    }
    previous = stored;
  }
  return { ok: true, rows: rows.length, verified: rows.length };
}

// Spreadsheets can hand back a typed value (a Date for an ISO timestamp, a
// number for the version) where a string was written, so both sides of the
// comparison are normalized the same way.
function auditCellText_(value) {
  if (value == null) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return value.toISOString();
  return String(value);
}

function emptySecondaryRecoveryJournal_() {
  return { version: 1, at: '', workspaceIndexes: false, configuration: false, auditEntries: [], manualReviewRequired: false, unreadable: false };
}

function readSecondaryRecoveryJournal_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('EE_SECONDARY_RECOVERY_JOURNAL');
  if (!raw) {
    if (!props.getProperty('EE_SECONDARY_RECONCILE_REQUIRED')) return emptySecondaryRecoveryJournal_();
    // Older deployments used one untyped flag for several sinks. Repair what
    // can be reconstructed, but retain manual review because a direct audit
    // event from an older deployment may not exist in workspace.audit.
    return { version: 1, workspaceIndexes: true, configuration: true, auditEntries: [], manualReviewRequired: true, unreadable: false, legacy: true };
  }
  var parsed;
  try { parsed = JSON.parse(raw); }
  catch (parseErr) { return { version: 1, workspaceIndexes: true, configuration: true, auditEntries: [], manualReviewRequired: true, unreadable: true }; }
  if (!isPlainObject_(parsed) || Number(parsed.version) !== 1 || !Array.isArray(parsed.auditEntries)) {
    return { version: 1, workspaceIndexes: true, configuration: true, auditEntries: [], manualReviewRequired: true, unreadable: true };
  }
  var journal = emptySecondaryRecoveryJournal_();
  try { journal.at = optionalTimestamp_(parsed.at) || ''; } catch (timestampErr) { journal.unreadable = true; journal.manualReviewRequired = true; }
  journal.workspaceIndexes = parsed.workspaceIndexes === true;
  journal.configuration = parsed.configuration === true;
  journal.manualReviewRequired = parsed.manualReviewRequired === true;
  if (parsed.auditEntries.length > EE_SECONDARY_AUDIT_MAX_ITEMS) journal.manualReviewRequired = true;
  for (var i = 0; i < Math.min(parsed.auditEntries.length, EE_SECONDARY_AUDIT_MAX_ITEMS); i++) {
    try { journal.auditEntries.push(sanitizeAuditObject_(parsed.auditEntries[i])); }
    catch (entryErr) { journal.manualReviewRequired = true; journal.unreadable = true; }
  }
  return journal;
}

function writeSecondaryRecoveryJournal_(journal) {
  journal = journal || emptySecondaryRecoveryJournal_();
  if (journal.unreadable) throw eeError_('manual_recovery_required', 'Secondary recovery metadata is unreadable. District IT must inspect it before any repair.');
  var props = PropertiesService.getScriptProperties(), seen = {}, entries = [];
  for (var i = 0; i < (journal.auditEntries || []).length; i++) {
    var entry = sanitizeAuditObject_(journal.auditEntries[i]);
    if (!seen[entry.id] && entries.length < EE_SECONDARY_AUDIT_MAX_ITEMS) { seen[entry.id] = true; entries.push(entry); }
    else if (!seen[entry.id]) journal.manualReviewRequired = true;
  }
  var stored = {
    version: 1,
    at: nowIso_(),
    workspaceIndexes: journal.workspaceIndexes === true,
    configuration: journal.configuration === true,
    auditEntries: entries,
    manualReviewRequired: journal.manualReviewRequired === true,
  };
  var encoded = JSON.stringify(stored);
  while (encoded.length > EE_SECONDARY_RECOVERY_MAX_CHARS && stored.auditEntries.length) {
    stored.auditEntries.pop();
    stored.manualReviewRequired = true;
    encoded = JSON.stringify(stored);
  }
  if (encoded.length > EE_SECONDARY_RECOVERY_MAX_CHARS) throw eeError_('manual_recovery_required', 'Secondary recovery metadata exceeds its safe storage limit. District IT must inspect the repository.');
  if (!stored.workspaceIndexes && !stored.configuration && !stored.auditEntries.length && !stored.manualReviewRequired) {
    props.deleteProperty('EE_SECONDARY_RECOVERY_JOURNAL');
    props.deleteProperty('EE_SECONDARY_RECONCILE_REQUIRED');
    return stored;
  }
  props.setProperty('EE_SECONDARY_RECOVERY_JOURNAL', encoded);
  props.setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1');
  return stored;
}

function updateSecondaryRecoveryJournal_(update) {
  var journal = readSecondaryRecoveryJournal_();
  if (journal.unreadable) throw eeError_('manual_recovery_required', 'Secondary recovery metadata is unreadable. District IT must inspect it before another dependent operation.');
  update(journal);
  return writeSecondaryRecoveryJournal_(journal);
}

function markWorkspaceIndexRecovery_() {
  return updateSecondaryRecoveryJournal_(function (journal) { journal.workspaceIndexes = true; });
}

function clearWorkspaceIndexRecovery_() {
  return updateSecondaryRecoveryJournal_(function (journal) { journal.workspaceIndexes = false; });
}

function markConfigurationRecovery_() {
  return updateSecondaryRecoveryJournal_(function (journal) { journal.configuration = true; });
}

function clearConfigurationRecovery_() {
  return updateSecondaryRecoveryJournal_(function (journal) { journal.configuration = false; });
}

function recordOperationAuditRecovery_(entry) {
  return updateSecondaryRecoveryJournal_(function (journal) {
    var exists = journal.auditEntries.some(function (item) { return item.id === entry.id; });
    if (exists) return;
    if (journal.auditEntries.length >= EE_SECONDARY_AUDIT_MAX_ITEMS) { journal.manualReviewRequired = true; return; }
    journal.auditEntries.push(entry);
  });
}

function appendOperationAuditBestEffort_(mutation, actor) {
  var entry = canonicalAuditEntry_(mutation, actor);
  try { appendCanonicalAuditRow_(entry); return { pending: false, entry: entry }; }
  catch (auditErr) {
    try { recordOperationAuditRecovery_(entry); }
    catch (journalErr) {
      try {
        var props = PropertiesService.getScriptProperties();
        props.setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1');
        props.setProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED', '1');
      } catch (propertyErr) {}
    }
    return { pending: true, entry: entry };
  }
}

function appendDirectoryAuditBestEffort_(mutation, actor) {
  return appendOperationAuditBestEffort_(mutation, actor).pending;
}

function recordDirectoryAclIntents_(teacherIds, actor) {
  var ids = uniqueTeacherIds_(teacherIds || []);
  if (ids.length > 12) {
    recordReleaseRecovery_({ at: nowIso_(), stage: 'directory_acl_pending_all', actorEmail: actor && actor.email });
    return;
  }
  for (var i = 0; i < ids.length; i++) {
    recordReleaseRecovery_({ at: nowIso_(), teacherId: ids[i], stage: 'directory_acl_pending', actorEmail: actor && actor.email });
  }
}

function clearDirectoryAclIntents_(teacherIds, clearGlobal) {
  var wanted = {}, ids = uniqueTeacherIds_(teacherIds || []);
  for (var i = 0; i < ids.length; i++) wanted[ids[i]] = true;
  if (!ids.length && !clearGlobal) return;
  writeReleaseRecoveryQueue_(readReleaseRecoveryQueue_().filter(function (item) {
    var stage = safeString_(item && item.stage, 60, '');
    if (stage === 'directory_acl_pending_all') return !clearGlobal;
    return stage !== 'directory_acl_pending' || !wanted[safeId_(item && item.teacherId || '', false)];
  }));
}

function boundedDirectoryAclScope_(workspace, teacherIds) {
  var ids = uniqueTeacherIds_(teacherIds || []);
  return ids.length > 12 ? allReleasedTeacherIds_(workspace) : ids;
}

function recordDirectoryDocumentRecovery_(payload) {
  var count = readReleaseRecoveryQueue_().filter(function (item) {
    return !!safeId_(item && item.documentId || '', false) && /^directory_/.test(safeString_(item && item.stage, 60, ''));
  }).length;
  if (count < 8) recordReleaseRecovery_(payload);
  recordReleaseRecovery_({ at: payload.at, teacherId: payload.teacherId, stage: 'directory_acl_failures', actorEmail: payload.actorEmail });
}

function reconcileDirectoryReleasedAccess_(state, teacherIds, actor, reason, reviewedDocumentIds, lock) {
  var access;
  try { access = reconcileReleasedDocsForTeachers_(state, teacherIds, actor, reason, { reviewedDocumentIds: reviewedDocumentIds, lock: lock }); }
  catch (accessErr) {
    if (!accessErr || accessErr.code !== 'release_recovery_required') {
      recordReleaseRecovery_({ at: nowIso_(), stage: 'directory_acl_dispatch', actorEmail: actor.email });
      throw eeError_('release_recovery_required', 'The directory change was saved, but released-summary access reconciliation did not complete. Run administrator access recovery before treating the change as complete.');
    }
    throw accessErr;
  }
  if (access.accessRecoveryPending) throw eeError_('release_recovery_required', 'The directory change was saved, but exact released-summary Drive access could not be confirmed. Run released-summary access recovery before treating the change as complete.');
  return access;
}

function getPortalBootstrap() { return bootstrap(); }

function bootstrap() {
  var actor = currentActor_();
  var state = readWorkspaceState_();
  var visible = filterWorkspaceForActor_(state.workspace, actor);
  return {
    ok: true,
    workspace: visible,
    revision: state.revision,
    version: state.revision,
    currentUser: { email: actor.email, displayName: actor.displayName, role: actor.role, teacherId: actor.teacherId || '' },
    deployment: { service: EE_SERVICE, version: EE_VERSION, mode: 'district_workspace', domain: emailDomain_(actor.email), localOnly: false, portalUrl: safePortalUrl_(configMap_().webAppUrl || ScriptApp.getService().getUrl() || '') }
  };
}

function savePortalWorkspace(request) { return saveWorkspace(request); }

function saveWorkspace(request) {
  var actor = currentActor_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request, 'request');
  var expected = requireRevision_(request.expectedVersion);
  var incoming = sanitizeWorkspace_(request.workspace);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'busy', error: 'Repository is busy. Retry the save.' };
  try {
    actor = requireSameActorLocked_(actor);
    var lockedTeacherId = safeId_(request.mutation && request.mutation.teacherId || '', false);
    if (lockedTeacherId) requireTeacherAccess_(actor, lockedTeacherId);
    assertNoAnnualRolloverRecovery_();
    assertNoPendingWorkspaceCommit_();
    var state = readWorkspaceState_();
    if (state.revision !== expected) return { ok: false, code: 'conflict', error: 'This evaluation changed in another session. Reload before saving.', revision: state.revision, version: state.revision };
    var merged = mergeWorkspaceForActor_(state.workspace, incoming, actor, request.mutation);
    enforceFinalizedCycleClosure_(state.workspace, merged);
    canonicalizeServerFields_(state.workspace, merged, actor);
    freezeCycleWeights_(state.workspace, merged);
    deriveFinalizedSnapshots_(state.workspace, merged, actor, request.mutation);
    var mutation = deriveMutation_(request.mutation, state.workspace, merged, actor);
    if (mutation) appendWorkspaceAudit_(merged, mutation, actor);
    var nextRevision = state.revision + 1;
    var visible = filterWorkspaceForActor_(merged, actor);
    var commit = writeWorkspaceState_(merged, nextRevision, actor.email, lock);
    if (commit.pending) throw eeError_('commit_recovery_required', 'The workspace journal was written, but the primary evaluation record was not confirmed. Do not retry this change; reload the district record or ask an administrator to check Setup health.');
    var reconciliationPending = false;
    try { syncSecondaryIndexes_(merged); clearWorkspaceIndexRecovery_(); }
    catch (sinkErr) { try { markWorkspaceIndexRecovery_(); } catch (markerErr) {} reconciliationPending = true; }
    return { ok: true, workspace: visible, revision: nextRevision, version: nextRevision, reconciliationPending: reconciliationPending };
  } finally { lock.releaseLock(); }
}

function notificationReviewCacheKey_(token) { return 'EE_NOTIFICATION_REVIEW_' + safeId_(token, true); }

function notificationOperationKey_(token) {
  return 'notification_' + hashText_('portal_notification|' + safeId_(token, true)).slice(0, 48);
}

function notificationAuditId_(token) {
  return 'audit-notification-' + hashText_('portal_notification_audit|' + safeId_(token, true)).slice(0, 48);
}

function notificationHash_(value) {
  var hash = String(value || '');
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(hash)) throw eeError_('bad_request', 'Invalid notification integrity hash.');
  return hash;
}

function notificationOperationEntryPayload_(raw) {
  raw = requireObject_(raw, 'notification operation');
  var revision = Number(raw.revision);
  if (Math.floor(revision) !== revision || revision < 0) throw eeError_('bad_request', 'Invalid notification source revision.');
  var actorEmail = normalizeEmail_(raw.actorEmail), actorRole = String(raw.actorRole || '');
  if (!emailDomain_(actorEmail) || ['admin', 'evaluator', 'teacher'].indexOf(actorRole) === -1) throw eeError_('bad_request', 'Invalid notification actor metadata.');
  var createdAt = optionalTimestamp_(raw.createdAt), updatedAt = optionalTimestamp_(raw.updatedAt);
  if (!createdAt || !updatedAt) throw eeError_('bad_request', 'Notification recovery timestamps are required.');
  return {
    version: 1,
    key: safeId_(raw.key, true),
    reviewTokenHash: notificationHash_(raw.reviewTokenHash),
    actorEmail: actorEmail,
    actorRole: actorRole,
    teacherId: safeId_(raw.teacherId, true),
    target: oneOf_(raw.target, ['teacher', 'evaluator'], 'notification target'),
    recipientHash: notificationHash_(raw.recipientHash),
    directoryFingerprint: notificationHash_(raw.directoryFingerprint),
    revision: revision,
    bodyHash: notificationHash_(raw.bodyHash),
    createdAt: createdAt,
    updatedAt: updatedAt,
    stage: oneOf_(raw.stage, ['dispatch_started', 'mail_sent', 'audit_pending', 'delivery_unknown'], 'notification recovery stage'),
    auditEntry: sanitizeAuditObject_(raw.auditEntry),
  };
}

function sealNotificationOperationEntry_(raw) {
  var payload = notificationOperationEntryPayload_(raw);
  payload.integrityHash = hashText_(JSON.stringify(payload));
  return payload;
}

function readNotificationOperationJournal_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('EE_NOTIFICATION_RECOVERY_MANUAL_REQUIRED')) return { version: 1, entries: [], ambiguous: true, unreadable: true };
  var raw = props.getProperty(EE_NOTIFICATION_OPERATION_JOURNAL_PROPERTY);
  if (!raw) return { version: 1, entries: [], ambiguous: false, unreadable: false };
  try {
    var parsed = JSON.parse(raw);
    if (!isPlainObject_(parsed) || Number(parsed.version) !== 1 || !Array.isArray(parsed.entries) || parsed.entries.length > EE_NOTIFICATION_OPERATION_MAX_ITEMS) throw new Error('shape');
    var entries = [], seen = {};
    for (var i = 0; i < parsed.entries.length; i++) {
      var sealed = sealNotificationOperationEntry_(parsed.entries[i]);
      if (sealed.integrityHash !== String(parsed.entries[i].integrityHash || '') || seen[sealed.key]) throw new Error('entry integrity');
      seen[sealed.key] = true;
      entries.push(sealed);
    }
    var at = optionalTimestamp_(parsed.at), expected = hashText_(JSON.stringify({ version: 1, at: at, entries: entries }));
    if (!at || expected !== String(parsed.integrityHash || '')) throw new Error('journal integrity');
    return { version: 1, at: at, entries: entries, ambiguous: false, unreadable: false };
  } catch (journalErr) {
    try { props.setProperty('EE_NOTIFICATION_RECOVERY_MANUAL_REQUIRED', '1'); } catch (markerErr) {}
    return { version: 1, entries: [], ambiguous: true, unreadable: true };
  }
}

function writeNotificationOperationJournal_(journal) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('EE_NOTIFICATION_RECOVERY_MANUAL_REQUIRED')) throw eeError_('manual_recovery_required', 'Notification recovery metadata requires district IT review.');
  var entries = (journal.entries || []).map(sealNotificationOperationEntry_);
  if (entries.length > EE_NOTIFICATION_OPERATION_MAX_ITEMS) throw eeError_('busy', 'Unresolved notification outcomes have reached the bounded recovery limit.');
  try {
    if (!entries.length) {
      props.deleteProperty(EE_NOTIFICATION_OPERATION_JOURNAL_PROPERTY);
      if (props.getProperty(EE_NOTIFICATION_OPERATION_JOURNAL_PROPERTY)) throw new Error('delete readback');
      props.deleteProperty('EE_NOTIFICATION_RECOVERY_REQUIRED');
      return { version: 1, at: nowIso_(), entries: [] };
    }
    var at = nowIso_(), stored = { version: 1, at: at, entries: entries };
    stored.integrityHash = hashText_(JSON.stringify(stored));
    var encoded = JSON.stringify(stored);
    if (encoded.length > EE_NOTIFICATION_OPERATION_MAX_CHARS) throw new Error('size');
    props.setProperty(EE_NOTIFICATION_OPERATION_JOURNAL_PROPERTY, encoded);
    if (props.getProperty(EE_NOTIFICATION_OPERATION_JOURNAL_PROPERTY) !== encoded) throw new Error('readback');
    props.setProperty('EE_NOTIFICATION_RECOVERY_REQUIRED', '1');
    return stored;
  } catch (writeErr) {
    try { props.setProperty('EE_NOTIFICATION_RECOVERY_MANUAL_REQUIRED', '1'); } catch (markerErr) {}
    throw eeError_('manual_recovery_required', 'Notification recovery metadata could not be persisted and verified. No automatic resend is allowed.');
  }
}

function upsertNotificationOperationEntry_(entry) {
  var journal = readNotificationOperationJournal_();
  if (journal.ambiguous || journal.unreadable) throw eeError_('manual_recovery_required', 'Notification recovery metadata is unreadable or ambiguous.');
  entry.updatedAt = nowIso_();
  var replaced = false;
  for (var i = 0; i < journal.entries.length; i++) if (journal.entries[i].key === entry.key) { journal.entries[i] = entry; replaced = true; break; }
  if (!replaced) journal.entries.push(entry);
  writeNotificationOperationJournal_(journal);
  return sealNotificationOperationEntry_(entry);
}

function removeNotificationOperationEntry_(key) {
  var journal = readNotificationOperationJournal_();
  if (journal.ambiguous || journal.unreadable) throw eeError_('manual_recovery_required', 'Notification recovery metadata is unreadable or ambiguous.');
  journal.entries = journal.entries.filter(function (entry) { return entry.key !== key; });
  return writeNotificationOperationJournal_(journal);
}

function notificationDirectoryFingerprint_() {
  var members = memberObjects_().map(function (member) {
    return { email: member.email, displayName: member.displayName, role: member.role, teacherId: member.teacherId || '', active: member.active !== false };
  });
  var assignments = assignmentObjects_().map(function (assignment) {
    return { teacherId: assignment.teacherId, evaluatorEmail: assignment.evaluatorEmail, active: assignment.active !== false };
  });
  members.sort(function (a, b) { var x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : (x > y ? 1 : 0); });
  assignments.sort(function (a, b) { var x = JSON.stringify(a), y = JSON.stringify(b); return x < y ? -1 : (x > y ? 1 : 0); });
  return hashText_(JSON.stringify({ members: members, assignments: assignments }));
}

function notificationTarget_(request, actor) {
  var target = oneOf_(request.target || (actor.role === 'teacher' ? 'evaluator' : 'teacher'), ['teacher', 'evaluator'], 'target');
  if (actor.role === 'teacher' && target !== 'evaluator') throw eeError_('denied', 'Teachers may notify only their assigned evaluator.');
  return target;
}

function notificationRecipientResolution_(teacherId, target, actor, requestedRecipient) {
  var members = memberObjects_(), memberByEmail = {}, candidates = [], seen = {};
  for (var i = 0; i < members.length; i++) if (members[i].active) memberByEmail[members[i].email] = members[i];
  if (target === 'teacher') {
    for (var j = 0; j < members.length; j++) {
      var teacherMember = members[j];
      if (teacherMember.active && teacherMember.role === 'teacher' && teacherMember.teacherId === teacherId && !seen[teacherMember.email]) {
        seen[teacherMember.email] = true;
        candidates.push({ email: teacherMember.email, displayName: teacherMember.displayName || teacherMember.email });
      }
    }
    if (candidates.length > 1) throw eeError_('manual_recovery_required', 'More than one active teacher account is bound to this educator. District IT must resolve the directory before notification.');
  } else {
    var assignments = assignmentObjects_();
    for (var k = 0; k < assignments.length; k++) {
      var assignment = assignments[k];
      if (!assignment.active || assignment.teacherId !== teacherId) continue;
      if (actor.role === 'evaluator' && assignment.evaluatorEmail !== actor.email) continue;
      var evaluatorMember = memberByEmail[assignment.evaluatorEmail];
      if (!evaluatorMember || (evaluatorMember.role !== 'evaluator' && evaluatorMember.role !== 'admin') || seen[evaluatorMember.email]) continue;
      seen[evaluatorMember.email] = true;
      candidates.push({ email: evaluatorMember.email, displayName: evaluatorMember.displayName || evaluatorMember.email });
    }
  }
  candidates.sort(function (a, b) { return a.email < b.email ? -1 : (a.email > b.email ? 1 : 0); });
  if (!candidates.length) throw eeError_('not_configured', 'No authorized notification recipient is configured.');
  var selected = normalizeEmail_(requestedRecipient || '');
  if (selected) {
    for (var n = 0; n < candidates.length; n++) if (candidates[n].email === selected) return { recipient: selected, candidates: candidates, selectionRequired: false };
    throw eeError_('denied', 'The selected notification recipient is not currently authorized for this educator.');
  }
  if (target === 'evaluator' && candidates.length > 1) return { recipient: '', candidates: candidates, selectionRequired: true };
  return { recipient: candidates[0].email, candidates: candidates, selectionRequired: false };
}

function notificationPortalBody_() {
  var config = configMap_();
  var configured = safeString_(config.webAppUrl || '', 1000, '');
  var fallback = safeString_(ScriptApp.getService().getUrl() || '', 1000, '');
  var url = safePortalUrl_(configured || fallback);
  if (!url) throw eeError_('not_configured', 'A reviewed Apps Script /exec portal URL is required before sending notifications.');
  var body = 'There is new activity in the AlloFlow Educator Evaluation portal.\n\nSign in with your district Google account:\n' + url;
  body += '\n\nFor privacy, this email contains no evaluation content, ratings, evidence, comments, educator name, or record identifier.';
  return { url: url, body: body, hash: hashText_(body) };
}

function assertNotificationOperationGates_() {
  assertNoAnnualRolloverRecovery_({ allowArtifactRecovery: true });
  assertNoArtifactOperationRecovery_();
  assertNoPendingWorkspaceCommit_();
}

function assertNotificationMailQuota_() {
  var quota = mailQuotaStatus_();
  if (!quota.available) throw eeError_('mail_quota_unavailable', 'Remaining notification mail quota could not be verified. No email was sent.');
  if (Number(quota.remainingDaily) < 1) throw eeError_('mail_quota_exhausted', 'The daily notification mail quota is exhausted. No email was sent.');
  return quota;
}

function notificationAuditEntry_(token, actor, teacherId, target, at) {
  return sanitizeAuditObject_({
    id: notificationAuditId_(token), teacherId: teacherId, event: 'NOTIFICATION_SENT',
    summary: 'Content-free portal notification sent', entityType: 'notification', entityId: target, version: 1,
    actor: actor.displayName || actor.email || 'Unknown', actorEmail: actor.email, actorRole: actor.role,
    role: actor.role === 'teacher' ? 'Teacher' : 'Evaluator', at: at,
  });
}

function notificationAuditEntryMatchesScope_(entry, token, actor, teacherId, target) {
  try {
    var clean = sanitizeAuditObject_(entry);
    return clean.id === notificationAuditId_(token) && clean.teacherId === teacherId && clean.event === 'NOTIFICATION_SENT' && clean.summary === 'Content-free portal notification sent' && clean.entityType === 'notification' && clean.entityId === target && Number(clean.version) === 1 && clean.actorEmail === actor.email && clean.actorRole === actor.role;
  } catch (entryErr) { return false; }
}

function notificationAuditRowMatchesScope_(row, token, actor, teacherId, target) {
  row = normalizeSecondaryRow_('audit', row);
  return row[0] === notificationAuditId_(token) && row[1] === teacherId && row[2] === 'NOTIFICATION_SENT' && row[3] === 'Content-free portal notification sent' && row[4] === 'notification' && row[5] === target && String(row[6]) === '1' && row[7] === actor.email && row[8] === actor.role;
}

function assertNotificationAuditOutboxHeadroom_(entry) {
  var props = PropertiesService.getScriptProperties(), journal = readSecondaryRecoveryJournal_();
  if (journal.unreadable || journal.manualReviewRequired || props.getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED')) throw eeError_('manual_recovery_required', 'Audit recovery metadata requires district IT review before another notification.');
  var expected = normalizeSecondaryRow_('audit', expectedAuditIndexRow_(entry)), exists = false;
  for (var i = 0; i < journal.auditEntries.length; i++) if (journal.auditEntries[i].id === entry.id) {
    if (!same_(normalizeSecondaryRow_('audit', expectedAuditIndexRow_(journal.auditEntries[i])), expected)) throw eeError_('manual_recovery_required', 'The notification Audit recovery identity has different canonical content.');
    exists = true;
  }
  if (exists) return { available: true, queued: journal.auditEntries.length };
  if (journal.auditEntries.length >= EE_SECONDARY_AUDIT_MAX_ITEMS) throw eeError_('busy', 'The bounded Audit recovery outbox is full. Reconcile it before sending another notification.');
  var projected = { version: 1, at: nowIso_(), workspaceIndexes: journal.workspaceIndexes === true, configuration: journal.configuration === true, auditEntries: journal.auditEntries.concat([entry]), manualReviewRequired: false };
  if (JSON.stringify(projected).length > EE_SECONDARY_RECOVERY_MAX_CHARS) throw eeError_('busy', 'The bounded Audit recovery outbox has no safe headroom for another notification.');
  return { available: true, queued: journal.auditEntries.length };
}

function assertNotificationJournalHeadroom_() {
  var journal = readNotificationOperationJournal_();
  if (journal.ambiguous || journal.unreadable) throw eeError_('manual_recovery_required', 'Notification recovery metadata requires district IT review.');
  if (journal.entries.length >= EE_NOTIFICATION_OPERATION_MAX_ITEMS) throw eeError_('busy', 'Unresolved notification outcomes have reached the bounded recovery limit.');
  return journal;
}

function notificationValidateOperationEntry_(entry, token, actor, teacherId, target) {
  if (!entry || entry.key !== notificationOperationKey_(token) || entry.reviewTokenHash !== hashText_(token) || entry.actorEmail !== actor.email || entry.actorRole !== actor.role || entry.teacherId !== teacherId || entry.target !== target || !notificationAuditEntryMatchesScope_(entry.auditEntry, token, actor, teacherId, target)) {
    throw eeError_('review_required', 'This notification review is unavailable for the current actor, educator, or target.');
  }
  return entry;
}

function notificationOperationEntryForToken_(token, actor, teacherId, target) {
  var journal = readNotificationOperationJournal_();
  if (journal.ambiguous || journal.unreadable) throw eeError_('manual_recovery_required', 'Notification recovery metadata requires district IT review.');
  var key = notificationOperationKey_(token), entry = null;
  for (var i = 0; i < journal.entries.length; i++) if (journal.entries[i].key === key) entry = journal.entries[i];
  return entry ? notificationValidateOperationEntry_(entry, token, actor, teacherId, target) : null;
}

function notificationValidateTokenlessOperationEntry_(entry, actor, teacherId, target) {
  var audit;
  try { audit = sanitizeAuditObject_(entry && entry.auditEntry); }
  catch (auditErr) { throw eeError_('manual_recovery_required', 'The notification recovery entry has invalid Audit metadata.'); }
  if (!entry || entry.teacherId !== teacherId || entry.target !== target ||
      !/^notification_[A-Za-z0-9_-]{40,64}$/.test(entry.key) || !/^audit-notification-[A-Za-z0-9_-]{40,64}$/.test(audit.id) ||
      audit.teacherId !== teacherId || audit.event !== 'NOTIFICATION_SENT' || audit.summary !== 'Content-free portal notification sent' ||
      audit.entityType !== 'notification' || audit.entityId !== target || Number(audit.version) !== 1 ||
      audit.actorEmail !== entry.actorEmail || audit.actorRole !== entry.actorRole) {
    throw eeError_('manual_recovery_required', 'The notification recovery entry does not match its sealed actor, educator, target, or Audit scope.');
  }
  return entry;
}

function notificationOperationEntryForScope_(actor, teacherId, target) {
  var journal = readNotificationOperationJournal_();
  if (journal.ambiguous || journal.unreadable) throw eeError_('manual_recovery_required', 'Notification recovery metadata requires district IT review.');
  var matches = [];
  for (var i = 0; i < journal.entries.length; i++) {
    var entry = journal.entries[i];
    if (entry.teacherId === teacherId && entry.target === target) matches.push(entry);
  }
  if (matches.length > 1) throw eeError_('manual_recovery_required', 'More than one unresolved notification operation matches this educator and delivery target.');
  return matches.length ? notificationValidateTokenlessOperationEntry_(matches[0], actor, teacherId, target) : null;
}

function notificationCanonicalAuditReceipt_(token, actor, teacherId, target) {
  var auditRows = auditLedgerRows_(), rows = auditLedgerRowsForId_(auditRows, notificationAuditId_(token));
  if (rows.length > 1) throw eeError_('manual_recovery_required', 'The deterministic notification Audit receipt is duplicated.');
  if (!rows.length) return false;
  if (!notificationAuditRowMatchesScope_(rows[0], token, actor, teacherId, target)) throw eeError_('review_required', 'This notification receipt belongs to a different actor, educator, or target.');
  if (auditChainStatus_(auditRows).ok !== true) throw eeError_('manual_recovery_required', 'The Audit chain is not intact, so notification replay was refused.');
  return true;
}

function notificationSecondaryAuditEntry_(token, actor, teacherId, target) {
  var props = PropertiesService.getScriptProperties(), journal = readSecondaryRecoveryJournal_(), matches = [];
  if (journal.unreadable || journal.manualReviewRequired || props.getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED')) throw eeError_('manual_recovery_required', 'Audit recovery metadata is ambiguous, so notification replay was refused.');
  var auditId = notificationAuditId_(token);
  for (var i = 0; i < journal.auditEntries.length; i++) if (journal.auditEntries[i].id === auditId) matches.push(journal.auditEntries[i]);
  if (matches.length > 1) throw eeError_('manual_recovery_required', 'The deterministic notification Audit recovery entry is duplicated.');
  if (!matches.length) return null;
  if (!notificationAuditEntryMatchesScope_(matches[0], token, actor, teacherId, target)) throw eeError_('review_required', 'This notification recovery entry belongs to a different actor, educator, or target.');
  return matches[0];
}

function notificationOperationAuditStatus_(entry) {
  var expected = normalizeSecondaryRow_('audit', expectedAuditIndexRow_(entry.auditEntry));
  var auditRows = auditLedgerRows_(), rows = auditLedgerRowsForId_(auditRows, entry.auditEntry.id);
  if (rows.length > 1 || (rows.length === 1 && !same_(rows[0], expected))) throw eeError_('manual_recovery_required', 'The deterministic notification Audit receipt is duplicated or mismatched.');
  if (rows.length === 1) {
    if (auditChainStatus_(auditRows).ok !== true) throw eeError_('manual_recovery_required', 'The Audit chain is not intact, so notification recovery was refused.');
    return 'canonical';
  }
  var recovery = readSecondaryRecoveryJournal_(), found = 0;
  if (recovery.unreadable || recovery.manualReviewRequired || PropertiesService.getScriptProperties().getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED')) throw eeError_('manual_recovery_required', 'Audit recovery metadata is ambiguous, so notification recovery was refused.');
  for (var i = 0; i < recovery.auditEntries.length; i++) if (recovery.auditEntries[i].id === entry.auditEntry.id) {
    found++;
    if (!same_(normalizeSecondaryRow_('audit', expectedAuditIndexRow_(recovery.auditEntries[i])), expected)) throw eeError_('manual_recovery_required', 'The queued notification Audit entry does not match its deterministic intent.');
  }
  if (found > 1) throw eeError_('manual_recovery_required', 'The queued notification Audit entry is duplicated.');
  return found === 1 ? 'pending' : 'missing';
}

function notificationCompletedResponse_(target, idempotent) {
  return { ok: true, sent: true, target: target, status: 'completed', recoveryPending: false, auditPending: false, idempotent: idempotent === true };
}

function notificationRecoveryResponse_(target, idempotent, manualReviewRequired) {
  return { ok: true, sent: true, target: target, status: 'recovery_pending', recoveryPending: true, auditPending: true, idempotent: idempotent === true, manualReviewRequired: manualReviewRequired === true };
}

function notificationDeliveryUnknownResponse_(target, idempotent) {
  return { ok: true, sent: null, target: target, status: 'delivery_unknown', recoveryPending: true, auditPending: false, deliveryUnknown: true, idempotent: idempotent === true };
}

function completeNotificationAudit_(entry, idempotent) {
  var status;
  try { status = notificationOperationAuditStatus_(entry); }
  catch (statusErr) {
    entry.stage = 'audit_pending';
    try { upsertNotificationOperationEntry_(entry); } catch (journalErr) {}
    return notificationRecoveryResponse_(entry.target, idempotent, true);
  }
  if (status === 'missing') {
    try { appendCanonicalAuditRow_(entry.auditEntry); } catch (appendErr) {}
    try { status = notificationOperationAuditStatus_(entry); } catch (readbackErr) { status = 'missing'; }
  }
  if (status === 'missing') {
    try {
      assertNotificationAuditOutboxHeadroom_(entry.auditEntry);
      recordOperationAuditRecovery_(entry.auditEntry);
      status = notificationOperationAuditStatus_(entry);
    } catch (queueErr) {
      entry.stage = 'audit_pending';
      try { upsertNotificationOperationEntry_(entry); } catch (journalErr) {}
      return notificationRecoveryResponse_(entry.target, idempotent, true);
    }
  }
  if (status === 'canonical') {
    try { removeNotificationOperationEntry_(entry.key); }
    catch (cleanupErr) { return notificationRecoveryResponse_(entry.target, idempotent, true); }
    return notificationCompletedResponse_(entry.target, idempotent);
  }
  entry.stage = 'audit_pending';
  try { upsertNotificationOperationEntry_(entry); }
  catch (journalErr) { return notificationRecoveryResponse_(entry.target, idempotent, true); }
  return notificationRecoveryResponse_(entry.target, idempotent, false);
}

function notificationKnownOperation_(token, actor, teacherId, target, repairAudit) {
  var entry = notificationOperationEntryForToken_(token, actor, teacherId, target);
  if (entry) {
    var auditStatus;
    try { auditStatus = notificationOperationAuditStatus_(entry); } catch (auditErr) { auditStatus = 'ambiguous'; }
    if (auditStatus === 'canonical') {
      try { removeNotificationOperationEntry_(entry.key); }
      catch (cleanupErr) { return notificationRecoveryResponse_(target, true, true); }
      return notificationCompletedResponse_(target, true);
    }
    if (auditStatus === 'pending') return notificationRecoveryResponse_(target, true, false);
    if (entry.stage === 'dispatch_started' || entry.stage === 'delivery_unknown') {
      if (entry.stage !== 'delivery_unknown') { entry.stage = 'delivery_unknown'; try { upsertNotificationOperationEntry_(entry); } catch (stageErr) {} }
      return notificationDeliveryUnknownResponse_(target, true);
    }
    return repairAudit ? completeNotificationAudit_(entry, true) : notificationRecoveryResponse_(target, true, auditStatus === 'ambiguous');
  }
  if (notificationCanonicalAuditReceipt_(token, actor, teacherId, target)) return notificationCompletedResponse_(target, true);
  if (notificationSecondaryAuditEntry_(token, actor, teacherId, target)) return notificationRecoveryResponse_(target, true, false);
  return null;
}

function notificationKnownOperationForScope_(actor, teacherId, target) {
  var entry = notificationOperationEntryForScope_(actor, teacherId, target);
  if (!entry) return null;
  var auditStatus;
  try { auditStatus = notificationOperationAuditStatus_(entry); } catch (auditErr) { auditStatus = 'ambiguous'; }
  if (auditStatus === 'canonical') {
    try { removeNotificationOperationEntry_(entry.key); }
    catch (cleanupErr) { return notificationRecoveryResponse_(target, true, true); }
    return notificationCompletedResponse_(target, true);
  }
  if (auditStatus === 'pending') return notificationRecoveryResponse_(target, true, false);
  if (entry.stage === 'dispatch_started' || entry.stage === 'delivery_unknown') {
    if (entry.stage !== 'delivery_unknown') {
      entry.stage = 'delivery_unknown';
      try { upsertNotificationOperationEntry_(entry); } catch (stageErr) {}
    }
    return notificationDeliveryUnknownResponse_(target, true);
  }
  return notificationRecoveryResponse_(target, true, auditStatus === 'ambiguous');
}

function notificationLatestCanonicalScopeReceipt_(teacherId, target) {
  var rows = auditLedgerRows_(), seen = {}, latest = null, latestMs = -1;
  for (var i = 0; i < rows.length; i++) {
    var row = normalizeSecondaryRow_('audit', rows[i]);
    if (!/^audit-notification-[A-Za-z0-9_-]{40,64}$/.test(row[0]) || row[1] !== teacherId ||
        row[2] !== 'NOTIFICATION_SENT' || row[3] !== 'Content-free portal notification sent' ||
        row[4] !== 'notification' || row[5] !== target || String(row[6]) !== '1') continue;
    if (seen[row[0]]) throw eeError_('manual_recovery_required', 'A canonical notification receipt is duplicated.');
    seen[row[0]] = true;
    var atMs = Date.parse(String(row[9] || ''));
    if (!isFinite(atMs)) throw eeError_('manual_recovery_required', 'A canonical notification receipt has an invalid timestamp.');
    if (atMs >= latestMs) { latest = row; latestMs = atMs; }
  }
  if (!latest) return null;
  if (auditChainStatus_(rows).ok !== true) throw eeError_('manual_recovery_required', 'The Audit chain is not intact, so the prior notification receipt could not be trusted.');
  return { auditId: latest[0], completedAt: new Date(latestMs).toISOString() };
}
function assertNotificationReviewAvailable_(actor, teacherId, target) {
  var journal = assertNotificationJournalHeadroom_();
  for (var i = 0; i < journal.entries.length; i++) {
    var entry = journal.entries[i];
    if (entry.teacherId === teacherId && entry.target === target) throw eeError_('notification_recovery_required', 'A prior notification outcome for this educator and target is unresolved. Check that exact outcome before reviewing another notice.');
  }
  var secondary = readSecondaryRecoveryJournal_();
  if (secondary.unreadable || secondary.manualReviewRequired || PropertiesService.getScriptProperties().getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED')) throw eeError_('manual_recovery_required', 'Audit recovery metadata requires district IT review before another notification.');
  for (var j = 0; j < secondary.auditEntries.length; j++) {
    var audit = secondary.auditEntries[j];
    if (audit.event === 'NOTIFICATION_SENT' && audit.teacherId === teacherId && audit.entityId === target) throw eeError_('notification_recovery_required', 'A prior notification Audit entry for this educator and target is still pending reconciliation.');
  }
}

function reviewPortalNotification(request) {
  var actor = currentActor_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameActorLocked_(actor);
    assertNotificationOperationGates_();
    requireTeacherAccess_(actor, teacherId);
    var target = notificationTarget_(request, actor);
    var directoryFingerprint = notificationDirectoryFingerprint_();
    var resolution = notificationRecipientResolution_(teacherId, target, actor, request.recipient || '');
    if (resolution.selectionRequired) {
      return { ok: true, status: 'recipient_selection_required', recipients: resolution.candidates, candidates: resolution.candidates };
    }
    var allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
    if (!allowedDomain || emailDomain_(resolution.recipient) !== allowedDomain) throw eeError_('denied', 'Notification recipient is outside the district domain.');
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    var educator = findById_(state.workspace.teachers || [], teacherId);
    if (!educator) throw eeError_('not_found', 'Educator record not found.');
    var body = notificationPortalBody_(), quota = assertNotificationMailQuota_();
    assertNotificationReviewAvailable_(actor, teacherId, target);
    var priorScopeReceipt = notificationLatestCanonicalScopeReceipt_(teacherId, target);
    var token = newId_('notification-review'), createdAt = nowIso_();
    var auditEntry = notificationAuditEntry_(token, actor, teacherId, target, createdAt);
    assertNotificationAuditOutboxHeadroom_(auditEntry);
    CacheService.getScriptCache().put(notificationReviewCacheKey_(token), JSON.stringify({
      actorEmail: actor.email, actorRole: actor.role, teacherId: teacherId, target: target,
      recipient: resolution.recipient, recipientHash: hashText_(resolution.recipient), revision: state.revision,
      directoryFingerprint: directoryFingerprint, bodyHash: body.hash, createdAt: createdAt,
      priorScopeAuditId: priorScopeReceipt ? priorScopeReceipt.auditId : '', auditEntry: auditEntry,
    }), EE_NOTIFICATION_REVIEW_SECONDS);
    var selected = resolution.candidates.filter(function (item) { return item.email === resolution.recipient; })[0];
    return {
      ok: true,
      review: {
        token: token,
        expiresAt: new Date(Date.now() + EE_NOTIFICATION_REVIEW_SECONDS * 1000).toISOString(),
        teacherId: teacherId,
        educatorName: safeString_(educator.name, 160, 'Educator'),
        target: target,
        recipient: resolution.recipient,
        recipientDisplayName: selected ? selected.displayName : resolution.recipient,
        contentFree: true,
        genericPortalLink: true,
        portalUrl: body.url,
      },
    };
  } finally { lock.releaseLock(); }
}

function sendPortalNotification(request) {
  var dispatchIntentSealed = false, operationMayAlreadyExist = false;
  var dispatchTarget = '', lock = null, lockHeld = false, actor = null;
  try {
    actor = currentActor_();
    request = requireObject_(request || {}, 'request');
    var teacherId = safeId_(request.teacherId, true);
    var token = safeId_(request.reviewToken || '', false);
    if (!token) throw eeError_('review_required', 'Review the notification recipient and delivery impact before confirming.');
    if (request.acknowledged !== true) throw eeError_('acknowledgment_required', 'Confirm the reviewed content-free notification before sending.');
    dispatchTarget = request.target === 'evaluator' ? 'evaluator' : (request.target === 'teacher' ? 'teacher' : (actor.role === 'teacher' ? 'evaluator' : 'teacher'));
    lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) {
      operationMayAlreadyExist = true;
      throw eeError_('busy', 'Repository is busy. Check the exact notification outcome before retrying.');
    }
    lockHeld = true;
    actor = requireSameActorLocked_(actor);
    requireTeacherAccess_(actor, teacherId);
    var target = notificationTarget_(request, actor);
    dispatchTarget = target;
    var known;
    try { known = notificationKnownOperation_(token, actor, teacherId, target, true); }
    catch (knownErr) {
      operationMayAlreadyExist = true;
      throw knownErr;
    }
    if (known) return known;
    assertNotificationReviewAvailable_(actor, teacherId, target);
    assertNotificationOperationGates_();
    var cache = CacheService.getScriptCache(), reviewKey = notificationReviewCacheKey_(token), raw = cache.get(reviewKey), review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.actorRole !== actor.role || review.teacherId !== teacherId || review.target !== target) throw eeError_('review_required', 'The notification review expired, was already used, or belongs to a different scope.');
    if (request.recipient && normalizeEmail_(request.recipient) !== review.recipient) throw eeError_('review_required', 'The notification recipient differs from the reviewed recipient.');
    var latestScopeReceipt = notificationLatestCanonicalScopeReceipt_(teacherId, target);
    var latestScopeAuditId = latestScopeReceipt ? latestScopeReceipt.auditId : '';
    if (latestScopeAuditId !== String(review.priorScopeAuditId || '')) {
      cache.remove(reviewKey);
      throw eeError_('review_stale', 'Another reviewed notification completed after this review was prepared. Review the current notice outcome before preparing another.');
    }
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    var directoryFingerprint = notificationDirectoryFingerprint_();
    var resolution = notificationRecipientResolution_(teacherId, target, actor, review.recipient);
    var allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
    var body = notificationPortalBody_();
    if (!allowedDomain || emailDomain_(resolution.recipient) !== allowedDomain) throw eeError_('denied', 'Notification recipient is outside the district domain.');
    if (Number(review.revision) !== Number(state.revision) || review.directoryFingerprint !== directoryFingerprint || review.recipient !== resolution.recipient || review.recipientHash !== hashText_(resolution.recipient) || review.bodyHash !== body.hash) {
      cache.remove(reviewKey);
      throw eeError_('review_stale', 'The workspace, directory, recipient, or portal link changed after notification review. Review again.');
    }
    var auditEntry = sanitizeAuditObject_(review.auditEntry);
    if (!notificationAuditEntryMatchesScope_(auditEntry, token, actor, teacherId, target)) throw eeError_('review_required', 'The notification review Audit identity is invalid.');
    assertNotificationMailQuota_();
    assertNotificationAuditOutboxHeadroom_(auditEntry);
    assertNotificationJournalHeadroom_();
    var throttleKey = 'EE_NOTIFY_' + hashText_(actor.email + '|' + teacherId + '|' + target).slice(0, 32);
    if (cache.get(throttleKey)) return { ok: false, code: 'rate_limited', error: 'A portal notification was sent recently. Please wait before sending another.', retryAfterMs: 300000, preDispatch: true };
    var entry = {
      version: 1, key: notificationOperationKey_(token), reviewTokenHash: hashText_(token),
      actorEmail: actor.email, actorRole: actor.role, teacherId: teacherId, target: target,
      recipientHash: hashText_(resolution.recipient), directoryFingerprint: directoryFingerprint,
      revision: state.revision, bodyHash: body.hash, createdAt: review.createdAt, updatedAt: nowIso_(),
      stage: 'dispatch_started', auditEntry: auditEntry,
    };
    entry = upsertNotificationOperationEntry_(entry);
    dispatchIntentSealed = true;
    cache.remove(reviewKey);
    cache.put(throttleKey, '1', 300);
    try {
      MailApp.sendEmail({ to: resolution.recipient, subject: 'AlloFlow evaluation portal activity', body: body.body, name: 'AlloFlow Evaluation Portal', noReply: true });
    } catch (mailErr) {
      entry.stage = 'delivery_unknown';
      try { upsertNotificationOperationEntry_(entry); } catch (stageErr) {}
      return notificationDeliveryUnknownResponse_(target, false);
    }
    entry.stage = 'mail_sent';
    try { entry = upsertNotificationOperationEntry_(entry); }
    catch (stageErr) { return notificationRecoveryResponse_(target, false, true); }
    return completeNotificationAudit_(entry, false);
  } catch (sendErr) {
    if (!dispatchIntentSealed && !operationMayAlreadyExist) {
      var failure = publicError_(sendErr);
      failure.preDispatch = true;
      return failure;
    }
    return notificationDeliveryUnknownResponse_(dispatchTarget || 'teacher', operationMayAlreadyExist);
  } finally {
    if (lockHeld && lock) lock.releaseLock();
  }
}

function getPortalNotificationOutcome(request) {
  var actor = currentActor_();
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true), token = safeId_(request.reviewToken || '', false);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameActorLocked_(actor);
    requireTeacherAccess_(actor, teacherId);
    var target = notificationTarget_(request, actor);
    var known = token
      ? notificationKnownOperation_(token, actor, teacherId, target, false)
      : notificationKnownOperationForScope_(actor, teacherId, target);
    if (known) return known;
    if (!token) {
      var priorReceipt = notificationLatestCanonicalScopeReceipt_(teacherId, target);
      if (priorReceipt) {
        var completed = notificationCompletedResponse_(target, true);
        completed.completedAt = priorReceipt.completedAt;
        completed.priorCompletion = true;
        completed.repeatEligible = true;
        return completed;
      }
      return { ok: true, status: 'no_unresolved', recoveryPending: false, reviewUsable: false };
    }
    var review = null;
    var raw = CacheService.getScriptCache().get(notificationReviewCacheKey_(token));
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (review && (review.actorEmail !== actor.email || review.actorRole !== actor.role || review.teacherId !== teacherId || review.target !== target)) throw eeError_('review_required', 'This notification review belongs to a different actor, educator, or target.');
    return { ok: true, status: 'not_started', recoveryPending: false, reviewUsable: !!review };
  } finally { lock.releaseLock(); }
}

/**
 * Share a released (finalized) evaluation with the evaluated educator as a
 * strengths-first Google Doc: created in a repository subfolder, shared
 * VIEW-ONLY to the educator's active district member account (single-file ACL: * the central folder stays unshared), recorded on the educator record and in
 * the audit log. The confirmation screen treats Drive access and the separate
 * content-free portal notice as two distinct actions and makes no promise
 * about Google-controlled Drive activity surfaces.
 */
var EE_DOC_DOMAINS = [
  { id: 'd1', code: '1', label: 'Planning and Preparation', plain: 'how the lesson and its goals were designed' },
  { id: 'd2', code: '2', label: 'Classroom Environment', plain: 'the respect, routines, and culture students experience' },
  { id: 'd3', code: '3', label: 'Instruction', plain: 'the teaching itself: engagement, questioning, and feedback' },
  { id: 'd4', code: '4', label: 'Professional Responsibilities', plain: 'reflection, communication, and professional growth' },
];

function eeBandLabel_(score, frameworkProfile) {
  var value = Number(score);
  if (!isFinite(value) || value < 0 || value > 3) return null;
  var truncated = Math.floor((value + 1e-9) * 1000) / 1000;
  var rounded = Math.round((truncated + 1e-9) * 100) / 100;
  var labels = frameworkProfile === 'portland_me'
    ? ['Excellent', 'Proficient', 'Novice/Needs Improvement', 'Unsatisfactory']
    : frameworkProfile === 'maine_pepg'
      ? ['Distinguished', 'Effective', 'Developing', 'Ineffective']
      : ['Distinguished', 'Proficient', 'Needs Improvement', 'Failing'];
  if (rounded >= 2.5) return labels[0];
  if (rounded >= 1.5) return labels[1];
  if (rounded >= 0.5) return labels[2];
  return labels[3];
}

// Guidebook v1.0 domain-to-practice operating principles (mirror of the
// client's aePortlandPracticeRating, keep the two in step).
function eePortlandPracticeRating_(domains) {
  var ids = ['d1', 'd2', 'd3', 'd4'];
  var levels = [];
  for (var i = 0; i < ids.length; i++) {
    var value = Number(domains && domains[ids[i]]);
    if (!isFinite(value)) return null;
    levels.push(value >= 2.5 ? 3 : value >= 1.5 ? 2 : value >= 0.5 ? 1 : 0);
  }
  var count = function (level) { return levels.filter(function (item) { return item === level; }).length; };
  if (count(0) > 0) return { label: 'Unsatisfactory', rule: 'any domain rated Unsatisfactory' };
  var allAtLeastProficient = levels.every(function (level) { return level >= 2; });
  if (count(3) >= 2 && allAtLeastProficient) return { label: 'Excellent', rule: 'two or more domains Excellent, none below Proficient' };
  if (count(1) >= 3) return { label: 'Novice/Needs Improvement', rule: 'three or more domains at Novice/Needs Improvement' };
  return { label: 'Proficient', rule: 'no more than two domains below Proficient, none Unsatisfactory' };
}

function teacherMemberEmail_(teacherId) {
  var members = memberObjects_();
  var matches = [];
  for (var i = 0; i < members.length; i++) {
    if (members[i].active && members[i].role === 'teacher' && members[i].teacherId === teacherId) matches.push(members[i].email);
  }
  if (matches.length > 1) throw eeError_('bad_member', 'More than one active portal member account is linked to this educator record. Resolve the directory conflict before sharing the document.');
  if (matches.length === 1) return matches[0];
  throw eeError_('not_configured', 'No active portal member account is linked to this educator record, so the document cannot be shared. Add the educator as a member first.');
}

function releasedDocExpectedViewers_(teacherId, requireTeacher) {
  teacherId = safeId_(teacherId, true);
  var allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  if (!allowedDomain) throw eeError_('not_configured', 'The district email domain is not configured.');
  var members = memberObjects_();
  var activeByEmail = {};
  var teacherEmails = [];
  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    if (!member.active) continue;
    activeByEmail[member.email] = member;
    if (member.role === 'teacher' && member.teacherId === teacherId) teacherEmails.push(member.email);
  }
  if (teacherEmails.length > 1) throw eeError_('bad_member', 'More than one active portal member account is linked to this educator record. Resolve the directory conflict before reconciling Drive access.');
  if (requireTeacher && teacherEmails.length !== 1) throw eeError_('not_configured', 'No active portal member account is linked to this educator record, so the document cannot be shared.');
  var expected = teacherEmails.slice();
  var assignments = assignmentObjects_();
  for (var j = 0; j < assignments.length; j++) {
    var assignment = assignments[j];
    var evaluator = activeByEmail[assignment.evaluatorEmail];
    if (assignment.active && assignment.teacherId === teacherId && evaluator && (evaluator.role === 'evaluator' || evaluator.role === 'admin')) expected.push(assignment.evaluatorEmail);
  }
  var ownerEmail = effectiveDriveOwnerEmail_();
  var clean = [], seen = {};
  for (var k = 0; k < expected.length; k++) {
    var email = normalizeEmail_(expected[k]);
    if (!email || emailDomain_(email) !== allowedDomain) throw eeError_('denied', 'Released-summary access is limited to managed district accounts.');
    if (email === ownerEmail || seen[email]) continue;
    seen[email] = true;
    clean.push(email);
  }
  clean.sort();
  if (clean.length > EE_MAX_RELEASE_VIEWERS) throw eeError_('not_configured', 'The released-summary viewer list exceeds the supported direct-grant limit. District IT must reduce or redesign the evaluation-team access policy before release.');
  return clean;
}

function protectReleasedEvaluationsFolder_(folder) {
  if (!folder || typeof folder.getId !== 'function' || typeof folder.getOwner !== 'function' || typeof folder.getParents !== 'function' || typeof folder.getSharingAccess !== 'function' || typeof folder.getViewers !== 'function' || typeof folder.getEditors !== 'function' || typeof folder.isTrashed !== 'function' || typeof folder.isShareableByEditors !== 'function') {
    throw eeError_('acl_manual_review_required', 'Google Drive did not expose enough permission detail to verify the released-evaluations folder.');
  }
  var expectedOwner = effectiveDriveOwnerEmail_();
  var actualOwner = driveUserEmail_(folder.getOwner());
  if (!actualOwner || actualOwner !== expectedOwner) throw eeError_('acl_manual_review_required', 'The released-evaluations folder is not owned by the configured deployment account. District IT must review Drive custody.');
  if (folder.isTrashed()) throw eeError_('acl_manual_review_required', 'The configured released-evaluations folder is in Drive trash and cannot be used. District IT must review retention and restore policy.');
  var expectedParentId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_FOLDER_ID') || '', true);
  var parents = folder.getParents(), parentIds = [];
  while (parents && parents.hasNext()) parentIds.push(String(parents.next().getId()));
  if (parentIds.length !== 1 || parentIds[0] !== expectedParentId) throw eeError_('acl_manual_review_required', 'The released-evaluations folder is outside the managed repository folder. District IT must review its location and permissions.');
  setPrivate_(folder);
  var verified = DriveApp.getFolderById(folder.getId());
  if (!verified || typeof verified.isTrashed !== 'function' || typeof verified.isShareableByEditors !== 'function') throw eeError_('acl_manual_review_required', 'Google Drive did not expose enough permission detail to re-verify the released-evaluations folder.');
  var verifiedOwner = driveUserEmail_(verified.getOwner()), verifiedParents = verified.getParents(), verifiedParentIds = [];
  while (verifiedParents && verifiedParents.hasNext()) verifiedParentIds.push(String(verifiedParents.next().getId()));
  var viewers = verified.getViewers() || [], editors = verified.getEditors() || [];
  if (verifiedOwner !== expectedOwner || verified.isTrashed() || verifiedParentIds.length !== 1 || verifiedParentIds[0] !== expectedParentId || verified.getSharingAccess() !== DriveApp.Access.PRIVATE || verified.isShareableByEditors() || viewers.length || editors.length) throw eeError_('protection_failed', 'The released-evaluations folder could not be verified as private, owner-only, non-trashed, and inside the managed repository.');
  return verified;
}

function quarantineUncommittedReleaseFolder_(folder) {
  var clean = true, id = '';
  try { id = safeId_(folder && folder.getId ? folder.getId() : '', true); } catch (idErr) { return false; }
  try { setPrivate_(folder); } catch (privacyErr) { clean = false; }
  try { folder.setTrashed(true); } catch (trashErr) { clean = false; }
  try {
    var verified = DriveApp.getFolderById(id);
    if (driveUserEmail_(verified.getOwner()) !== effectiveDriveOwnerEmail_() || typeof verified.isTrashed !== 'function' || !verified.isTrashed() || typeof verified.isShareableByEditors !== 'function' || verified.isShareableByEditors() || verified.getSharingAccess() !== DriveApp.Access.PRIVATE || (verified.getViewers() || []).length || (verified.getEditors() || []).length) clean = false;
  } catch (verifyErr) { clean = false; }
  return clean;
}

function releasedEvaluationsFolder_() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('EE_RELEASED_FOLDER_ID');
  if (existingId) {
    try { return protectReleasedEvaluationsFolder_(DriveApp.getFolderById(existingId)); }
    catch (err) {
      recordReleaseRecovery_({ at: nowIso_(), documentId: existingId, stage: 'release_folder_acl' });
      throw eeError_('release_recovery_required', 'The configured released-evaluations folder could not be verified. An administrator must run released-summary access recovery before another release.');
    }
  }
  var parent = DriveApp.getFolderById(props.getProperty('EE_FOLDER_ID'));
  var folder = parent.createFolder('Released evaluations');
  try {
    recordReleaseRecovery_({ at: nowIso_(), documentId: folder.getId(), stage: 'release_folder_build' });
    var protectedFolder = protectReleasedEvaluationsFolder_(folder);
    props.setProperty('EE_RELEASED_FOLDER_ID', protectedFolder.getId());
    clearReleaseRecovery_([protectedFolder.getId()]);
    return protectedFolder;
  } catch (createErr) {
    if (quarantineUncommittedReleaseFolder_(folder)) {
      clearReleaseRecovery_([folder.getId()]);
    } else {
      recordReleaseRecovery_({ at: nowIso_(), documentId: folder.getId(), stage: 'release_folder_compensation' });
      throw eeError_('release_recovery_required', 'The released-evaluations folder could not be protected and automatic cleanup was not confirmed. An administrator must run released-summary access recovery.');
    }
    throw createErr;
  }
}

function releasedDocId_(releasedDoc) {
  if (!isPlainObject_(releasedDoc)) return '';
  var explicit = safeId_(releasedDoc.id || '', false);
  if (explicit) return explicit;
  var match = safeString_(releasedDoc.url, 400, '').match(/^https:\/\/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]{1,200})/);
  return match ? match[1] : '';
}

function releaseReviewCacheKey_(token) { return 'EE_RELEASE_REVIEW_' + safeId_(token, true); }

function reviewPortalReleasedEvaluationShare(request) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try { return reviewPortalReleasedEvaluationShareLocked_(request); }
  finally { lock.releaseLock(); }
}

function reviewPortalReleasedEvaluationShareLocked_(request) {
  var actor = currentActor_();
  if (actor.role !== 'admin' && actor.role !== 'evaluator') throw eeError_('denied', 'Only an assigned evaluator or administrator can review released-summary access.');
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  var recipient = teacherMemberEmail_(teacherId);
  var allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  if (!allowedDomain || emailDomain_(recipient) !== allowedDomain) throw eeError_('denied', 'The educator account is outside the district domain.');
  assertNoPendingWorkspaceCommit_();
  var state = readWorkspaceState_({ skipPendingRecovery: true });
  if (releaseRecoveryRequiredForState_(state)) throw eeError_('release_recovery_required', 'A prior released-summary operation still needs administrator recovery. Run Setup health and resolve it before reviewing another release.');
  var teacher = findById_(state.workspace.teachers || [], teacherId);
  if (!teacher) throw eeError_('not_found', 'Educator record not found.');
  if (!teacher.finalizedAt) throw eeError_('invalid_transition', 'The educator cycle must be finalized before the evaluation can be shared.');
  var expectedViewers = releasedDocExpectedViewers_(teacherId, true);
  var directoryFingerprint = directoryFingerprint_();
  var existingId = releasedDocId_(teacher.releasedDoc);
  var releaseAction = 'create';
  if (teacher.releasedDoc) {
    if (!existingId) {
      recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, stage: 'release_pointer_invalid', actorEmail: actor.email });
      throw eeError_('release_recovery_required', 'The recorded released-summary document identifier is invalid. An administrator must review the release record before another document is created.');
    }
    var existingFile;
    try { existingFile = DriveApp.getFileById(existingId); }
    catch (existingErr) {
      recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: existingId, stage: 'release_file_lookup', actorEmail: actor.email });
      throw eeError_('release_recovery_required', 'The existing released summary could not be opened. An administrator must verify its Drive access before another document is created.');
    }
    if (typeof existingFile.isTrashed !== 'function') {
      recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: existingId, stage: 'release_file_state', actorEmail: actor.email });
      throw eeError_('release_recovery_required', 'Google Drive did not expose the existing released-summary state. An administrator must verify it before another document is created.');
    }
    releaseAction = existingFile.isTrashed() ? 'replace_trashed' : 'verify_existing';
  }
  var token = newId_('release-review');
  var expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  CacheService.getScriptCache().put(releaseReviewCacheKey_(token), JSON.stringify({
    actorEmail: actor.email,
    teacherId: teacherId,
    recipient: recipient,
    revision: state.revision,
    finalizedAt: teacher.finalizedAt,
    existingId: existingId,
    action: releaseAction,
    directoryFingerprint: directoryFingerprint,
    viewerHash: hashText_(JSON.stringify(expectedViewers)),
  }), 600);
  return {
    ok: true,
    review: {
      token: token,
      expiresAt: expiresAt,
      teacherId: teacherId,
      educatorName: safeString_(teacher.name, 160, '') || safeString_(teacher.code, 40, 'Educator'),
      recipient: recipient,
      finalizedAt: teacher.finalizedAt,
      action: releaseAction,
      currentDocumentUrl: teacher.releasedDoc ? safeString_(teacher.releasedDoc.url, 400, '') : '',
      currentSharedAt: teacher.releasedDoc ? optionalTimestamp_(teacher.releasedDoc.at) : '',
      directViewerCount: expectedViewers.length,
      actorWillReceiveAccess: expectedViewers.indexOf(actor.email) !== -1,
      separatePortalNoticeSent: false,
    },
  };
}

function requireReleaseReview_(request, actor, teacher, recipient, revision) {
  var token = safeId_(request.reviewToken || '', false);
  if (!token) throw eeError_('review_required', 'Review the recipient and disclosure before changing Drive access.');
  var cache = CacheService.getScriptCache();
  var key = releaseReviewCacheKey_(token);
  var raw = cache.get(key);
  if (!raw) throw eeError_('review_required', 'The release review expired or was already used. Review the recipient and disclosure again.');
  var review;
  try { review = JSON.parse(raw); } catch (parseErr) { review = null; }
  var expectedViewers = releasedDocExpectedViewers_(teacher.id, true);
  if (!review || review.actorEmail !== actor.email || review.teacherId !== teacher.id || review.recipient !== recipient || Number(review.revision) !== Number(revision) || review.finalizedAt !== teacher.finalizedAt || review.existingId !== releasedDocId_(teacher.releasedDoc) || review.directoryFingerprint !== directoryFingerprint_() || review.viewerHash !== hashText_(JSON.stringify(expectedViewers))) {
    cache.remove(key);
    throw eeError_('review_stale', 'The evaluation or release record changed after review. Reload and review the disclosure again.');
  }
  cache.remove(key);
  review.expectedViewers = expectedViewers;
  return review;
}

function driveUserEmail_(user) {
  try { return normalizeEmail_(user && typeof user.getEmail === 'function' ? user.getEmail() : user); } catch (err) { return ''; }
}

function effectiveDriveOwnerEmail_() {
  var email = '';
  try { email = normalizeEmail_(Session.getEffectiveUser().getEmail()); } catch (err) {}
  if (!email) throw eeError_('acl_manual_review_required', 'The deployment owner identity could not be verified.');
  var configuredOwner = normalizeEmail_(PropertiesService.getScriptProperties().getProperty('EE_BOOTSTRAP_ADMIN'));
  if (!configuredOwner || email !== configuredOwner) throw eeError_('acl_manual_review_required', 'The effective Apps Script account does not match the configured repository owner. District IT must verify deployment and Drive custody.');
  return configuredOwner;
}

function releasedDocAclSnapshot_(file, releasedFolderId) {
  if (!file || typeof file.getOwner !== 'function' || typeof file.getParents !== 'function' || typeof file.getSharingAccess !== 'function' || typeof file.getViewers !== 'function' || typeof file.getEditors !== 'function' || typeof file.getAccess !== 'function' || typeof file.isShareableByEditors !== 'function') {
    throw eeError_('acl_manual_review_required', 'Google Drive did not expose enough permission detail to verify this released summary.');
  }
  var effectiveOwner = effectiveDriveOwnerEmail_();
  var fileOwner = driveUserEmail_(file.getOwner());
  if (!fileOwner || fileOwner !== effectiveOwner) throw eeError_('acl_manual_review_required', 'The released summary is not owned by the deployment account and requires manual permission review.');
  releasedFolderId = safeId_(releasedFolderId || releasedEvaluationsFolder_().getId(), true);
  var parents = file.getParents(), parentIds = [];
  while (parents && parents.hasNext()) parentIds.push(String(parents.next().getId()));
  if (parentIds.length !== 1 || parentIds[0] !== releasedFolderId) throw eeError_('acl_manual_review_required', 'The released summary is outside the managed private folder and requires manual permission review.');
  var collect = function (users, label) {
    var out = [], seen = {};
    for (var i = 0; i < users.length; i++) {
      var email = driveUserEmail_(users[i]);
      if (!email) throw eeError_('acl_manual_review_required', 'A named ' + label + ' could not be identified, so exact Drive access cannot be verified.');
      if (email === fileOwner || seen[email]) continue;
      seen[email] = true;
      out.push(email);
    }
    out.sort();
    return out;
  };
  return {
    owner: fileOwner,
    sharingAccess: file.getSharingAccess(),
    shareableByEditors: file.isShareableByEditors(),
    viewers: collect(file.getViewers() || [], 'viewer'),
    editors: collect(file.getEditors() || [], 'editor'),
  };
}

function sameEmailSet_(left, right) {
  if (left.length !== right.length) return false;
  for (var i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
  return true;
}

function reconcileReleasedDocAccess_(file, teacherId, requireTeacher, expectedOverride, releasedFolderId) {
  var expected = Array.isArray(expectedOverride) ? expectedOverride.slice().sort() : releasedDocExpectedViewers_(teacherId, requireTeacher === true);
  if (expected.length > EE_MAX_RELEASE_VIEWERS) throw eeError_('not_configured', 'The released-summary viewer list exceeds the supported direct-grant limit.');
  var before = releasedDocAclSnapshot_(file, releasedFolderId);
  var changed = false, revoked = 0, granted = 0, demoted = 0;
  if (typeof file.isShareableByEditors === 'function' && file.isShareableByEditors()) { file.setShareableByEditors(false); changed = true; }
  else if (typeof file.isShareableByEditors !== 'function') file.setShareableByEditors(false);
  if (before.sharingAccess !== DriveApp.Access.PRIVATE) { file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.VIEW); changed = true; }
  var expectedMap = {};
  for (var i = 0; i < expected.length; i++) expectedMap[expected[i]] = true;
  for (var e = 0; e < before.editors.length; e++) {
    var editorEmail = before.editors[e];
    file.removeEditor(editorEmail);
    if (!expectedMap[editorEmail]) {
      file.removeViewer(editorEmail);
      revoked++;
    } else {
      demoted++;
    }
    changed = true;
  }
  for (var v = 0; v < before.viewers.length; v++) {
    var viewerEmail = before.viewers[v];
    if (!expectedMap[viewerEmail]) { file.removeViewer(viewerEmail); revoked++; changed = true; }
  }
  // DriveApp.getViewers() combines readers and commenters. getAccess() lets us
  // refresh only principals whose direct permission is not already VIEW.
  for (var x = 0; x < expected.length; x++) {
    if (file.getAccess(expected[x]) !== DriveApp.Permission.VIEW) {
      file.removeEditor(expected[x]);
      file.removeViewer(expected[x]);
      file.addViewer(expected[x]);
      granted++; changed = true;
    }
  }
  var verifiedFile = DriveApp.getFileById(file.getId());
  var after = releasedDocAclSnapshot_(verifiedFile, releasedFolderId);
  var exactViewerRoles = true;
  for (var p = 0; p < expected.length; p++) if (verifiedFile.getAccess(expected[p]) !== DriveApp.Permission.VIEW) exactViewerRoles = false;
  if (after.sharingAccess !== DriveApp.Access.PRIVATE || after.shareableByEditors || after.editors.length || !sameEmailSet_(after.viewers, expected) || !exactViewerRoles) {
    throw eeError_('share_verification_failed', 'Google Drive did not confirm the exact private, view-only recipient list.');
  }
  return { grants: expected, owner: after.owner, changed: changed, granted: granted, revoked: revoked, demoted: demoted, aclMode: 'private_named_viewers', aclVersion: 1, aclVerifiedAt: nowIso_() };
}

function supersededReleasedDocs_(releasedDoc) {
  if (!isPlainObject_(releasedDoc)) return [];
  var history = Array.isArray(releasedDoc.history) ? releasedDoc.history.slice(-24) : [];
  var id = releasedDocId_(releasedDoc);
  if (id || releasedDoc.url) history.push({ id: id, url: safeString_(releasedDoc.url, 400, ''), academicYear: safeString_(releasedDoc.academicYear, 20, ''), at: optionalTimestamp_(releasedDoc.at), by: safeString_(releasedDoc.by, 160, ''), openedAt: optionalTimestamp_(releasedDoc.openedAt), status: 'superseded_unavailable', supersededAt: nowIso_() });
  return history.slice(-25);
}

function releaseRegistrySeed_(teacher, doc, status) {
  if (!teacher || !isPlainObject_(doc)) return null;
  var id = releasedDocId_(doc);
  var url = safeString_(doc.url, 400, '');
  if (!id || url.indexOf('https://docs.google.com/') !== 0) return null;
  return {
    id: id,
    url: url,
    teacherId: teacher.id,
    academicYear: safeString_(doc.academicYear || teacher.academicYear || '', 20, ''),
    releasedAt: optionalTimestamp_(doc.at || doc.releasedAt),
    releasedBy: safeString_(doc.by || doc.releasedBy, 160, ''),
    grants: Array.isArray(doc.grants) ? doc.grants.slice() : [],
    aclMode: safeString_(doc.aclMode, 40, 'private_named_viewers'),
    aclVersion: Number(doc.aclVersion) || 1,
    aclVerifiedAt: optionalTimestamp_(doc.aclVerifiedAt || doc.accessReviewedAt),
    status: status || safeString_(doc.status, 40, 'active'),
  };
}

function hydrateReleaseRegistry_(workspace) {
  if (!Array.isArray(workspace.releaseRegistry)) workspace.releaseRegistry = [];
  var byId = {}, changed = false;
  for (var i = 0; i < workspace.releaseRegistry.length; i++) byId[workspace.releaseRegistry[i].id] = workspace.releaseRegistry[i];
  var teachers = workspace.teachers || [];
  for (var t = 0; t < teachers.length; t++) {
    var teacher = teachers[t];
    var current = releaseRegistrySeed_(teacher, teacher.releasedDoc, 'active');
    if (current && !byId[current.id]) { workspace.releaseRegistry.push(current); byId[current.id] = current; changed = true; }
    var history = teacher.releasedDoc && Array.isArray(teacher.releasedDoc.history) ? teacher.releasedDoc.history : [];
    for (var h = 0; h < history.length; h++) {
      var historical = releaseRegistrySeed_(teacher, history[h], 'historical');
      if (historical && !byId[historical.id]) { workspace.releaseRegistry.push(historical); byId[historical.id] = historical; changed = true; }
    }
  }
  return changed;
}

function upsertReleaseRegistry_(workspace, teacher, doc, acl, status) {
  hydrateReleaseRegistry_(workspace);
  var seed = releaseRegistrySeed_(teacher, doc, status || 'active');
  if (!seed) throw eeError_('bad_request', 'Released-summary registry metadata is incomplete.');
  var existing = findById_(workspace.releaseRegistry, seed.id);
  if (existing) {
    existing.url = seed.url;
    existing.teacherId = teacher.id;
    existing.academicYear = seed.academicYear || existing.academicYear;
    existing.releasedAt = seed.releasedAt || existing.releasedAt;
    existing.releasedBy = seed.releasedBy || existing.releasedBy;
    existing.status = status || 'active';
    if (acl) { existing.grants = acl.grants.slice(); existing.aclMode = acl.aclMode; existing.aclVersion = acl.aclVersion; existing.aclVerifiedAt = acl.aclVerifiedAt; }
    return existing;
  }
  if (acl) { seed.grants = acl.grants.slice(); seed.aclMode = acl.aclMode; seed.aclVersion = acl.aclVersion; seed.aclVerifiedAt = acl.aclVerifiedAt; }
  workspace.releaseRegistry.push(seed);
  return seed;
}

function readReleaseRecoveryQueue_() {
  var raw = PropertiesService.getScriptProperties().getProperty('EE_RELEASE_RECOVERY_REQUIRED');
  if (!raw) return [];
  var parsed;
  try { parsed = JSON.parse(raw); } catch (err) { return [{ kind: 'released_summary_acl_recovery', version: 1, at: nowIso_(), stage: 'unreadable' }]; }
  var items = Array.isArray(parsed) ? parsed : [parsed], valid = [], unreadable = false;
  for (var i = 0; i < items.length; i++) {
    if (!isPlainObject_(items[i]) || !safeString_(items[i].stage, 60, '')) { unreadable = true; continue; }
    valid.push(items[i]);
  }
  var overflow = raw.length > EE_RELEASE_RECOVERY_MAX_CHARS || items.length > EE_RELEASE_RECOVERY_MAX_ITEMS;
  var markers = [];
  if (unreadable) markers.push({ kind: 'released_summary_acl_recovery', version: 1, at: '', teacherId: '', documentId: '', stage: 'unreadable' });
  if (overflow) markers.push({ kind: 'released_summary_acl_recovery', version: 1, at: '', teacherId: '', documentId: '', stage: 'queue_overflow' });
  var keep = Math.max(0, EE_RELEASE_RECOVERY_MAX_ITEMS - markers.length);
  return markers.concat(valid.slice(-keep));
}

function writeReleaseRecoveryQueue_(queue) {
  var props = PropertiesService.getScriptProperties();
  queue = Array.isArray(queue) ? queue.filter(function (item) { return isPlainObject_(item); }) : [];
  var overflow = queue.some(function (item) { return safeString_(item.stage, 60, '') === 'queue_overflow'; });
  queue = queue.filter(function (item) { return safeString_(item.stage, 60, '') !== 'queue_overflow'; });
  var kept = [];
  for (var i = queue.length - 1; i >= 0; i--) {
    var candidate = [queue[i]].concat(kept);
    if (candidate.length > EE_RELEASE_RECOVERY_MAX_ITEMS - 1 || JSON.stringify(candidate).length > EE_RELEASE_RECOVERY_MAX_CHARS - 240) { overflow = true; continue; }
    kept.unshift(queue[i]);
  }
  if (overflow) kept.unshift({ kind: 'released_summary_acl_recovery', version: 1, at: nowIso_(), teacherId: '', documentId: '', stage: 'queue_overflow', actorEmail: '', expectedAclHash: '' });
  while (kept.length > 1 && JSON.stringify(kept).length > EE_RELEASE_RECOVERY_MAX_CHARS) kept.splice(1, 1);
  queue = kept;
  if (!queue.length) props.deleteProperty('EE_RELEASE_RECOVERY_REQUIRED');
  else props.setProperty('EE_RELEASE_RECOVERY_REQUIRED', JSON.stringify(queue.length === 1 ? queue[0] : queue));
}

function releaseRecoveryItemKey_(item) {
  return safeId_(item && item.teacherId || '', false) + '|' + safeId_(item && item.documentId || '', false) + '|' + safeString_(item && item.stage, 60, '');
}

function recordReleaseRecovery_(payload) {
  payload = isPlainObject_(payload) ? payload : {};
  var item = {
    kind: 'released_summary_acl_recovery', version: 1, at: optionalTimestamp_(payload.at) || nowIso_(),
    teacherId: safeId_(payload.teacherId || '', false), documentId: safeId_(payload.documentId || '', false),
    stage: safeString_(payload.stage, 60, 'unknown'), actorEmail: normalizeEmail_(payload.actorEmail),
    expectedAclHash: safeString_(payload.expectedAclHash, 128, ''),
  };
  var itemKey = releaseRecoveryItemKey_(item);
  var queue = readReleaseRecoveryQueue_().filter(function (existing) { return releaseRecoveryItemKey_(existing) !== itemKey; });
  queue.push(item);
  writeReleaseRecoveryQueue_(queue);
}

function clearReleaseRecovery_(documentIds) {
  if (!Array.isArray(documentIds)) return;
  var ids = {};
  for (var i = 0; i < documentIds.length; i++) ids[safeId_(documentIds[i] || '', false)] = true;
  var remaining = readReleaseRecoveryQueue_().filter(function (item) { return safeString_(item && item.stage, 60, '') === 'queue_overflow' || !ids[safeId_(item.documentId || '', false)]; });
  writeReleaseRecoveryQueue_(remaining);
}

function clearReleaseRecoveryItems_(items) {
  var keys = {};
  for (var i = 0; i < (items || []).length; i++) keys[releaseRecoveryItemKey_(items[i])] = true;
  writeReleaseRecoveryQueue_(readReleaseRecoveryQueue_().filter(function (item) {
    return safeString_(item && item.stage, 60, '') === 'queue_overflow' || !keys[releaseRecoveryItemKey_(item)];
  }));
}

function releaseRecoveryRequiredForState_(state) {
  var registryPending = !!(state && state.workspace && (state.workspace.releaseRegistry || []).some(function (entry) { return entry.status === 'recovery_pending' || entry.status === 'retirement_pending'; }));
  return registryPending || readReleaseRecoveryQueue_().length > 0;
}

function clearCommittedReleaseRecovery_(state, teacherId) {
  if (!state || !state.workspace) return;
  var workspace = state.workspace;
  teacherId = safeId_(teacherId || '', false);
  hydrateReleaseRegistry_(workspace);
  writeReleaseRecoveryQueue_(readReleaseRecoveryQueue_().filter(function (item) {
    if (teacherId && safeId_(item && item.teacherId || '', false) !== teacherId) return true;
    var stage = safeString_(item && item.stage, 60, '');
    if (stage !== 'workspace_commit' && stage !== 'document_build') return true;
    var documentId = safeId_(item && item.documentId || '', false);
    var teacher = findById_(workspace.teachers || [], safeId_(item && item.teacherId || '', false));
    return !(documentId && teacher && releasedDocId_(teacher.releasedDoc) === documentId && findById_(workspace.releaseRegistry || [], documentId));
  }));
}

function quarantineUncommittedRelease_(file, emails) {
  var clean = true;
  try { setPrivate_(file); } catch (privacyErr) { clean = false; }
  try { file.setTrashed(true); } catch (trashErr) { clean = false; }
  try {
    var verified = DriveApp.getFileById(file.getId());
    if (driveUserEmail_(verified.getOwner()) !== effectiveDriveOwnerEmail_() || typeof verified.isTrashed !== 'function' || !verified.isTrashed() || typeof verified.isShareableByEditors !== 'function' || verified.isShareableByEditors() || verified.getSharingAccess() !== DriveApp.Access.PRIVATE || (verified.getViewers() || []).length || (verified.getEditors() || []).length) clean = false;
  } catch (verifyErr) { clean = false; }
  return clean;
}

function quarantineRecoveryRelease_(item) {
  var documentId;
  try { documentId = safeId_(item && item.documentId || '', true); } catch (idErr) { return false; }
  try {
    var file = DriveApp.getFileById(documentId);
    if (!file || typeof file.getOwner !== 'function' || typeof file.isTrashed !== 'function' || typeof file.getParents !== 'function') return false;
    if (driveUserEmail_(file.getOwner()) !== effectiveDriveOwnerEmail_()) return false;
    if (file.isTrashed()) return false;
    var expectedFolderId = releasedEvaluationsFolder_().getId();
    var parents = file.getParents(), parentIds = [];
    while (parents && parents.hasNext()) parentIds.push(String(parents.next().getId()));
    if (parentIds.length !== 1 || parentIds[0] !== expectedFolderId) return false;
    setPrivate_(file);
    file.setTrashed(true);
    var verified = DriveApp.getFileById(documentId);
    return driveUserEmail_(verified.getOwner()) === effectiveDriveOwnerEmail_() && typeof verified.isTrashed === 'function' && verified.isTrashed() && typeof verified.isShareableByEditors === 'function' && !verified.isShareableByEditors() && verified.getSharingAccess() === DriveApp.Access.PRIVATE && !(verified.getViewers() || []).length && !(verified.getEditors() || []).length;
  } catch (recoveryErr) { return false; }
}

function quarantineRecoveryFolder_(item) {
  var folderId;
  try { folderId = safeId_(item && item.documentId || '', true); } catch (idErr) { return false; }
  try {
    var folder = DriveApp.getFolderById(folderId);
    if (!folder || typeof folder.getOwner !== 'function' || typeof folder.isTrashed !== 'function') return false;
    if (driveUserEmail_(folder.getOwner()) !== effectiveDriveOwnerEmail_()) return false;
    setPrivate_(folder);
    folder.setTrashed(true);
    var verified = DriveApp.getFolderById(folderId);
    return driveUserEmail_(verified.getOwner()) === effectiveDriveOwnerEmail_() && verified.isTrashed() && typeof verified.isShareableByEditors === 'function' && !verified.isShareableByEditors() && verified.getSharingAccess() === DriveApp.Access.PRIVATE && !(verified.getViewers() || []).length && !(verified.getEditors() || []).length;
  } catch (recoveryErr) { return false; }
}

function recoverReleaseFolderQueue_() {
  var queue = readReleaseRecoveryQueue_(), recovered = [], failed = 0;
  var storedFolderId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_RELEASED_FOLDER_ID') || '', false);
  for (var i = 0; i < queue.length; i++) {
    var item = queue[i], stage = safeString_(item && item.stage, 60, '');
    if (stage !== 'release_folder_acl' && stage !== 'release_folder_build' && stage !== 'release_folder_compensation') continue;
    var folderId = safeId_(item && item.documentId || '', false), ok = false;
    try {
      if (stage === 'release_folder_acl' || (stage === 'release_folder_build' && folderId === storedFolderId)) ok = !!folderId && folderId === storedFolderId && !!protectReleasedEvaluationsFolder_(DriveApp.getFolderById(folderId));
      else ok = quarantineRecoveryFolder_(item);
    } catch (folderErr) { ok = false; }
    if (ok) recovered.push(item); else failed++;
  }
  if (recovered.length) clearReleaseRecoveryItems_(recovered);
  return { recovered: recovered.length, failed: failed };
}

function recoverReviewedOrphanedReleaseQueue_(workspace, reviewedItems) {
  hydrateReleaseRegistry_(workspace);
  var registered = {};
  for (var r = 0; r < (workspace.releaseRegistry || []).length; r++) registered[workspace.releaseRegistry[r].id] = true;
  reviewedItems = Array.isArray(reviewedItems) ? reviewedItems : [];
  if (reviewedItems.length > EE_RELEASE_RECOVERY_MAX_ITEMS) throw eeError_('manual_recovery_required', 'The reviewed orphan quarantine scope exceeds the bounded recovery limit.');
  var queue = readReleaseRecoveryQueue_(), queueByKey = {}, recovered = [], candidates = [], failed = 0, seenDocuments = {};
  for (var q = 0; q < queue.length; q++) {
    var queueKey = releaseRecoveryItemKey_(queue[q]);
    if (!queueByKey[queueKey]) queueByKey[queueKey] = [];
    queueByKey[queueKey].push(queue[q]);
  }
  for (var i = 0; i < reviewedItems.length; i++) {
    var reviewed = reviewedItems[i];
    if (!isPlainObject_(reviewed)) throw eeError_('review_stale', 'The exact orphan quarantine scope changed after review. Review it again.');
    var key = safeString_(reviewed.key, 300, ''), documentId = safeId_(reviewed.documentId || '', false), stage = safeString_(reviewed.stage, 60, '');
    var matches = key && queueByKey[key] || [];
    if (!documentId || !releaseOrphanRecoveryStage_(stage) || matches.length !== 1 || safeId_(matches[0].documentId || '', false) !== documentId || safeString_(matches[0].stage, 60, '') !== stage || registered[documentId] || seenDocuments[documentId]) {
      throw eeError_('review_stale', 'The exact orphan quarantine scope changed after review. Review it again.');
    }
    seenDocuments[documentId] = true;
    candidates.push(matches[0]);
  }
  for (var c = 0; c < candidates.length; c++) {
    if (quarantineRecoveryRelease_(candidates[c])) recovered.push(candidates[c]); else failed++;
  }
  if (recovered.length) clearReleaseRecoveryItems_(recovered);
  return { quarantined: recovered.length, failed: failed };
}

function clearGlobalReleaseRecoveryStages_(stages) {
  var wanted = {};
  for (var i = 0; i < stages.length; i++) wanted[stages[i]] = true;
  writeReleaseRecoveryQueue_(readReleaseRecoveryQueue_().filter(function (item) {
    return safeString_(item && item.stage, 60, '') === 'queue_overflow' || safeId_(item && item.documentId || '', false) || !wanted[safeString_(item && item.stage, 60, '')];
  }));
}

function sharePortalReleasedEvaluation(request) {
  var actor = currentActor_();
  if (actor.role !== 'admin' && actor.role !== 'evaluator') throw eeError_('denied', 'Only an assigned evaluator or administrator can share a released evaluation.');
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  var recipient = teacherMemberEmail_(teacherId);
  var allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  if (!allowedDomain || emailDomain_(recipient) !== allowedDomain) throw eeError_('denied', 'The educator account is outside the district domain.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameActorLocked_(actor);
    requireTeacherAccess_(actor, teacherId);
    recipient = teacherMemberEmail_(teacherId);
    allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
    if (!allowedDomain || emailDomain_(recipient) !== allowedDomain) throw eeError_('denied', 'The educator account is outside the district domain.');
    assertNoAnnualRolloverRecovery_();
    assertNoPendingWorkspaceCommit_();
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    if (releaseRecoveryRequiredForState_(state)) throw eeError_('release_recovery_required', 'A prior released-summary operation still needs administrator recovery. Run Setup health and resolve it before sharing another release.');
    var workspace = state.workspace;
    var teacher = findById_(workspace.teachers || [], teacherId);
    if (!teacher) throw eeError_('not_found', 'Educator record not found.');
    if (!teacher.finalizedAt) throw eeError_('invalid_transition', 'The educator cycle must be finalized before the evaluation can be shared.');
    var releaseReview = requireReleaseReview_(request, actor, teacher, recipient, state.revision);
    var existingId = releasedDocId_(teacher.releasedDoc);
    var file = null;
    var built = null;
    var created = false;
    var commitStarted = false;
    var aclAttempted = false;
    var retiredId = '';
    var expectedViewers = releaseReview.expectedViewers;
    if (teacher.releasedDoc && !existingId) {
      recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, stage: 'release_pointer_invalid', actorEmail: actor.email });
      throw eeError_('release_recovery_required', 'The recorded released-summary document identifier is invalid. An administrator must review the release record before another document is created.');
    }
    var existingTrashed = false;
    if (existingId) {
      try { file = DriveApp.getFileById(existingId); }
      catch (missingErr) {
        recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: existingId, stage: 'release_file_lookup', actorEmail: actor.email });
        throw eeError_('release_recovery_required', 'The existing released summary could not be opened. An administrator must verify its Drive access before another document is created.');
      }
      if (typeof file.isTrashed !== 'function') {
        recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: existingId, stage: 'release_file_state', actorEmail: actor.email });
        throw eeError_('release_recovery_required', 'Google Drive did not expose the existing released-summary state. An administrator must verify it before another document is created.');
      }
      existingTrashed = file.isTrashed();
    }
    var currentAction = existingId ? (existingTrashed ? 'replace_trashed' : 'verify_existing') : 'create';
    if (releaseReview.action !== currentAction) throw eeError_('review_stale', 'The current Drive document changed after review. Review the disclosure again before changing access.');
    try {
      var releaseFolder = releasedEvaluationsFolder_();
      var releaseFolderId = releaseFolder.getId();
      if (currentAction === 'replace_trashed') {
        built = { id: existingId, url: teacher.releasedDoc.url };
        aclAttempted = true;
        var retiredAcl = reconcileReleasedDocAccess_(file, teacherId, false, [], releaseFolderId);
        hydrateReleaseRegistry_(workspace);
        var retiredEntry = findById_(workspace.releaseRegistry || [], existingId);
        if (!retiredEntry) {
          retiredEntry = releaseRegistrySeed_(teacher, teacher.releasedDoc, 'retired');
          if (retiredEntry) workspace.releaseRegistry.push(retiredEntry);
        }
        if (retiredEntry) {
          retiredEntry.grants = []; retiredEntry.aclMode = retiredAcl.aclMode; retiredEntry.aclVersion = retiredAcl.aclVersion;
          retiredEntry.aclVerifiedAt = retiredAcl.aclVerifiedAt; retiredEntry.status = 'retired';
        }
        retiredId = existingId;
        file = null; built = null; aclAttempted = false;
      }
      if (!file) {
        built = buildReleasedEvaluationDoc_(workspace, teacher, actor, function (createdDoc) {
          built = createdDoc; created = true;
          recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: createdDoc.id, stage: 'document_build', actorEmail: actor.email, expectedAclHash: hashText_(JSON.stringify(expectedViewers)) });
        });
        file = DriveApp.getFileById(built.id);
        file.moveTo(releaseFolder);
        setPrivate_(file);
      } else {
        built = { id: existingId, url: teacher.releasedDoc.url };
      }
      aclAttempted = true;
      var acl = reconcileReleasedDocAccess_(file, teacherId, true, expectedViewers, releaseFolderId);
      var releasedAt = created ? nowIso_() : (teacher.releasedDoc.at || nowIso_());
      var mutation = {
        teacherId: teacherId,
        event: created ? 'RELEASED_DOC_SHARED' : 'RELEASED_DOC_ACCESS_VERIFIED',
        summary: created ? 'Released evaluation document shared with the exact private evaluation-team viewer list' : 'Released evaluation document private viewer list reconciled without creating a duplicate',
        entityType: 'released_summary',
        entityId: built.id,
        version: 1,
      };
      teacher.releasedDoc = {
        id: built.id,
        url: built.url,
        academicYear: safeString_(workspace.config && workspace.config.academicYear, 20, ''),
        at: releasedAt,
        by: created ? actor.email : (teacher.releasedDoc.by || actor.email),
        sharedWith: recipient,
        openedAt: created ? '' : optionalTimestamp_(teacher.releasedDoc.openedAt),
        accessReviewedAt: acl.aclVerifiedAt,
        grants: acl.grants.slice(),
        aclMode: acl.aclMode,
        aclVersion: acl.aclVersion,
        aclVerifiedAt: acl.aclVerifiedAt,
        history: created && teacher.releasedDoc ? supersededReleasedDocs_(teacher.releasedDoc) : (teacher.releasedDoc && teacher.releasedDoc.history ? teacher.releasedDoc.history : []),
      };
      upsertReleaseRegistry_(workspace, teacher, teacher.releasedDoc, acl, 'active');
      var auditEntry = appendWorkspaceAudit_(workspace, mutation, actor);
      commitStarted = true;
      var commit = writeWorkspaceState_(workspace, state.revision + 1, actor.email, lock);
      var recoveryPending = !!commit.pending;
      if (recoveryPending) {
        try {
          var confirmed = readWorkspaceState_();
          var confirmedTeacher = findById_(confirmed.workspace.teachers || [], teacherId);
          recoveryPending = !confirmedTeacher || releasedDocId_(confirmedTeacher.releasedDoc) !== built.id;
        } catch (confirmErr) { recoveryPending = true; }
      }
      var auditPending = false;
      if (!recoveryPending) {
        try { appendCanonicalAuditRow_(auditEntry); }
        catch (auditErr) { try { markWorkspaceIndexRecovery_(); } catch (markerErr) {} auditPending = true; }
        clearReleaseRecovery_([built.id].concat(retiredId ? [retiredId] : []));
      } else {
        try { markWorkspaceIndexRecovery_(); } catch (markerErr) {}
        auditPending = true;
        recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: built.id, stage: 'workspace_commit', actorEmail: actor.email });
      }
      var resultRecoveryPending = recoveryPending || auditPending;
      return {
        ok: true,
        status: resultRecoveryPending ? 'recovery_pending' : 'released',
        doc: { id: built.id, url: built.url, sharedAt: releasedAt },
        url: built.url,
        sharedWith: recipient,
        access: { educator: 'viewer', actor: actor.email === acl.owner ? 'owner' : (acl.grants.indexOf(actor.email) !== -1 ? 'viewer' : 'not_granted'), mode: acl.aclMode, directViewerCount: acl.grants.length },
        created: created,
        idempotent: !created,
        recoveryPending: resultRecoveryPending,
        auditPending: auditPending,
        separatePortalNoticeSent: false,
      };
    } catch (releaseErr) {
      if (created && !commitStarted) {
        var cleanupFile = file;
        if (!cleanupFile && built && built.id) {
          try { cleanupFile = DriveApp.getFileById(built.id); } catch (cleanupLookupErr) {}
        }
        var quarantined = !!cleanupFile && quarantineUncommittedRelease_(cleanupFile, expectedViewers);
        if (!quarantined) {
          recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: built && built.id, stage: 'compensation', actorEmail: actor.email, expectedAclHash: hashText_(JSON.stringify(expectedViewers)) });
          throw eeError_('release_recovery_required', 'The release did not complete and automatic Drive cleanup could not be confirmed. An administrator must run Setup health and inspect the recovery item before trying again.');
        }
        clearReleaseRecovery_([built.id]);
      } else if (!created && file && aclAttempted && !commitStarted) {
        recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: built && built.id, stage: 'share_acl', actorEmail: actor.email, expectedAclHash: hashText_(JSON.stringify(expectedViewers)) });
        throw eeError_('release_recovery_required', 'Exact Drive access could not be confirmed for the existing released summary. An administrator must run released-summary access recovery before another release.');
      } else if (file && commitStarted) {
        recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: built && built.id, stage: 'workspace_commit', actorEmail: actor.email, expectedAclHash: hashText_(JSON.stringify(expectedViewers)) });
        throw eeError_('release_recovery_required', 'Drive access changed, but the released-summary registry commit was not confirmed. Run released-summary access recovery before another release.');
      }
      throw releaseErr;
    }
  } finally { lock.releaseLock(); }
}

function eeDocPlainDate_(iso) {
  if (!iso) return '';
  try { return Utilities.formatDate(new Date(iso), Session.getScriptTimeZone(), 'MMMM d, yyyy'); } catch (err) { return String(iso).slice(0, 10); }
}

function buildReleasedEvaluationDoc_(workspace, teacher, actor, onCreated) {
  var config = configMap_();
  var frameworkProfile = (workspace.config && workspace.config.frameworkProfile) || 'maine_pepg';
  var teacherName = safeString_(teacher.name, 160, '') || safeString_(teacher.code, 60, 'Educator');
  var year = safeString_(teacher.academicYear || (workspace.config && workspace.config.academicYear), 40, '');
  var doc = DocumentApp.create('Released evaluation - ' + teacherName + (year ? ' - ' + year : ''));
  var createdDoc = { id: doc.getId(), url: doc.getUrl() };
  if (typeof onCreated === 'function') onCreated(createdDoc);
  var body = doc.getBody();
  var H = DocumentApp.ParagraphHeading;

  body.appendParagraph('Educator Effectiveness Summary' + (year ? ', ' + year : '')).setHeading(H.HEADING1);
  body.appendParagraph('Prepared for ' + teacherName + ' on ' + eeDocPlainDate_(nowIso_()) + ' by ' + (actor.displayName || actor.email) + '.').setHeading(H.NORMAL);
  body.appendParagraph('This document is a plain-language summary of your finalized evaluation. It is shared view-only with you and your evaluation team, no one else. The district portal remains the official record and holds every observation, note, timestamp, and revision behind this summary; nothing here is hidden from you there.').setHeading(H.NORMAL);

  // ── The educator's own words lead the document when provided. ──────────
  if (teacher.educatorStatement && teacher.educatorStatement.text) {
    body.appendParagraph('In your own words').setHeading(H.HEADING2);
    body.appendParagraph(safeString_(teacher.educatorStatement.text, 20000, '')).setHeading(H.NORMAL);
    body.appendParagraph('Written by you in the portal' + (teacher.educatorStatement.updatedAt ? ' (' + eeDocPlainDate_(teacher.educatorStatement.updatedAt) + ')' : '') + '; no one edited it.').setHeading(H.NORMAL);
  }

  // ── Strengths come FIRST, and are drawn from the evaluator's own
  // evidence-linked rationale text, never generated. ─────────────────────
  body.appendParagraph('Your strengths').setHeading(H.HEADING2);
  var observations = (workspace.observations || []).filter(function (o) { return o.teacherId === teacher.id && o.finalizedAt; });
  var strengths = [];
  var growth = [];
  observations.forEach(function (observation) {
    EE_DOC_DOMAINS.forEach(function (domain) {
      var rating = observation.ratings ? observation.ratings[domain.id] : null;
      var rationale = observation.rationales ? safeString_(observation.rationales[domain.id], 15000, '') : '';
      if (rating == null) return;
      var entry = { domain: domain, rating: rating, rationale: rationale, date: observation.observedAt || observation.finalizedAt };
      if (rating >= 2) strengths.push(entry); else growth.push(entry);
    });
  });
  (workspace.spms || []).forEach(function (spm) {
    if (spm.teacherId !== teacher.id || spm.status !== 'locked' || spm.rating == null || spm.rating < 2) return;
    strengths.push({ spm: true, rating: spm.rating, goal: safeString_(spm.goal, 20000, ''), rationale: safeString_(spm.ratingRationale, 15000, '') });
  });
  // Published walkthroughs carry the informal praise: include the five most
  // recent PUBLISHED interpretations (private drafts never enter documents).
  (workspace.walkthroughs || [])
    .filter(function (w) { return w.teacherId === teacher.id && w.publishedAt && safeString_(w.interpretation, 20000, ''); })
    .sort(function (a, b) { return String(b.publishedAt).localeCompare(String(a.publishedAt)); })
    .slice(0, 5)
    .forEach(function (w) {
      strengths.push({ walkthrough: true, date: w.date || w.publishedAt, rationale: safeString_(w.interpretation, 20000, '') });
    });
  if (strengths.length) {
    strengths.forEach(function (entry) {
      var lead = entry.spm
        ? 'Student performance goal, rated ' + eeBandLabel_(entry.rating, frameworkProfile)
        : entry.walkthrough
          ? 'Walkthrough observation' + (entry.date ? ' (' + eeDocPlainDate_(entry.date) + ')' : '')
          : entry.domain.label + ', rated ' + eeBandLabel_(entry.rating, frameworkProfile) + ' (' + entry.domain.plain + ')';
      var item = body.appendListItem(lead);
      item.setGlyphType(DocumentApp.GlyphType.BULLET);
      var detail = entry.spm ? (entry.goal ? 'Goal: ' + entry.goal + (entry.rationale ? ', ' + entry.rationale : '') : entry.rationale) : entry.rationale;
      if (detail) body.appendListItem(detail).setNestingLevel(1).setGlyphType(DocumentApp.GlyphType.HOLLOW_BULLET);
    });
  } else {
    body.appendParagraph('Your strongest observed areas and the evidence behind them are discussed in your post-conference records in the portal. This summary lists strengths whenever a component is rated Proficient or Distinguished.').setHeading(H.NORMAL);
  }

  // ── Ratings, with the arithmetic explained in words. ───────────────────
  body.appendParagraph('Your overall rating, in plain language').setHeading(H.HEADING2);
  var bandLabel = eeBandLabel_(teacher.finalScore, frameworkProfile);
  if (frameworkProfile === 'portland_me') {
    var rollup = eePortlandPracticeRating_(teacher.ratings && teacher.ratings.domains);
    if (rollup) {
      body.appendParagraph('Practice rating: "' + rollup.label + '", reached because ' + rollup.rule + '. Under the Portland guidebook the practice rating is derived from the four domain ratings by rule, never by averaging. The student-growth portion of the summative rating combines under the district’s current plan documents; confirm this summary against the current PEPG plan.').setHeading(H.NORMAL);
    }
  } else if (teacher.finalScore != null && bandLabel) {
    var bandSentence = frameworkProfile === 'maine_pepg'
      ? 'Overall score: ' + teacher.finalScore + ' out of 3, shown here with the default label "' + bandLabel + '". Your district’s PEPG plan defines the official rating levels and cut points, confirm this label against the plan; the score arithmetic itself is shown below.'
      : 'Overall score: ' + teacher.finalScore + ' out of 3, which is the "' + bandLabel + '" performance band. Bands are fixed statewide cut points: 2.50 and above is Distinguished, 1.50 to 2.49 Proficient, 0.50 to 1.49 Needs Improvement, below 0.50 Failing.';
    body.appendParagraph(bandSentence).setHeading(H.NORMAL);
  }
  var profile = teacher.weightSnapshot ? teacher.weightSnapshot : serverWeightProfile_(teacher, workspace.config);
  var table = body.appendTable();
  var header = table.appendTableRow();
  ['Component', 'Weight', 'What it measures'].forEach(function (label) { header.appendTableCell(label).editAsText().setBold(true); });
  (profile || []).forEach(function (component) {
    var row = table.appendTableRow();
    row.appendTableCell(component.label);
    row.appendTableCell(component.weight + '%');
    row.appendTableCell(component.id === 'observation' ? 'Your observed practice across the four domains below.' : component.short === 'BLD' ? 'Your building\'s performance data for the year.' : 'The measures selected for your role and assignment.');
  });
  body.appendParagraph('Your final score is the weighted average of these components, each score is multiplied by its weight and the results are added. No component is hidden and no other factor enters the calculation.').setHeading(H.NORMAL);
  var domainTable = body.appendTable();
  var domainHeader = domainTable.appendTableRow();
  ['Domain', 'Rating', 'Annual rationale', 'Evidence used'].forEach(function (label) { domainHeader.appendTableCell(label).editAsText().setBold(true); });
  EE_DOC_DOMAINS.forEach(function (domain) {
    var rating = teacher.ratings && teacher.ratings.domains ? teacher.ratings.domains[domain.id] : null;
    var rationale = teacher.annualRationales ? safeString_(teacher.annualRationales[domain.id], 15000, '') : '';
    var evidenceTokens = teacher.annualEvidenceRefs && Array.isArray(teacher.annualEvidenceRefs[domain.id]) ? teacher.annualEvidenceRefs[domain.id] : [];
    var evidenceLabels = [];
    for (var evidenceIndex = 0; evidenceIndex < evidenceTokens.length; evidenceIndex++) {
      var resolved = resolveAnnualEvidenceRef_(workspace, teacher.id, evidenceTokens[evidenceIndex], false);
      if (resolved) evidenceLabels.push(resolved.title + (resolved.date ? ' (' + eeDocPlainDate_(resolved.date) + ')' : ''));
    }
    var row = domainTable.appendTableRow();
    row.appendTableCell(domain.code + '. ' + domain.label);
    row.appendTableCell(rating == null ? 'Not rated' : rating + ', ' + eeBandLabel_(rating, frameworkProfile));
    row.appendTableCell(rationale || 'No annual rationale was recorded for this legacy cycle.');
    row.appendTableCell(evidenceLabels.length ? evidenceLabels.join('; ') : 'No annual evidence references were recorded for this legacy cycle.');
  });

  // ── Growth framed constructively, tied to the evaluator's own words. ───
  body.appendParagraph('Growth focus').setHeading(H.HEADING2);
  if (growth.length) {
    body.appendParagraph('These areas were rated below Proficient. They are the focus of support, not a verdict, and each one comes with your evaluator\'s written reasoning:').setHeading(H.NORMAL);
    growth.forEach(function (entry) {
      var item = body.appendListItem(entry.domain.label + (entry.rationale ? ', ' + entry.rationale : ''));
      item.setGlyphType(DocumentApp.GlyphType.BULLET);
    });
    body.appendParagraph('You are entitled to discuss supports, resources, and timelines for each of these in your post-conference and through the portal dialogue.').setHeading(H.NORMAL);
  } else {
    body.appendParagraph('No component of your finalized evaluation was rated below Proficient.').setHeading(H.NORMAL);
  }

  // ── Rights and transparency. ───────────────────────────────────────────
  body.appendParagraph('Transparency and your rights').setHeading(H.HEADING2);
  body.appendParagraph('This summary was assembled only from the finalized records in the district portal: ' + observations.length + ' finalized formal observation' + (observations.length === 1 ? '' : 's') + ' and your locked student performance measures. Every rating shown here was assigned by a person and carries that person\'s written rationale in the portal; the software performs arithmetic only.').setHeading(H.NORMAL);
  var rights = [
    'You can read every underlying record, timestamp, and revision in the portal at any time.',
    'You acknowledged the observation before finalization; acknowledgment records that you received it, not that you agree.',
    'You can add a written response through the portal dialogue, and it becomes part of the record.',
    'Finalized records are immutable, nothing in this summary can be edited after release without a new, visible record.',
  ];
  rights.forEach(function (line) { body.appendListItem(line).setGlyphType(DocumentApp.GlyphType.BULLET); });
  body.appendParagraph('Questions about this evaluation go first to your evaluator' + (config.organization ? ' or to ' + safeString_(config.organization, 160, 'your district') + ' leadership' : '') + '. This copy is shared view-only to your district account; if any detail here disagrees with the portal, the portal record governs.').setHeading(H.NORMAL);

  doc.saveAndClose();
  return createdDoc;
}

/**
 * Honest open receipt for the released summary: records that the educator
 * clicked the portal link to their shared Doc. Deliberately labeled a LINK
 * click, Drive itself cannot tell us the document was read.
 */
function recordReleasedSummaryOpened(request) {
  var actor = currentActor_();
  if (actor.role !== 'teacher') return { ok: true, skipped: true };
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  if (actor.teacherId !== teacherId) throw eeError_('denied', 'Educator record is outside this account.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameActorLocked_(actor);
    if (actor.role !== 'teacher' || actor.teacherId !== teacherId) throw eeError_('denied', 'Educator record is outside this account.');
    requireTeacherAccess_(actor, teacherId);
    assertNoAnnualRolloverRecovery_();
    assertNoPendingWorkspaceCommit_();
    var state = readWorkspaceState_();
    var teacher = findById_(state.workspace.teachers || [], teacherId);
    if (!teacher || !teacher.releasedDoc) return { ok: true, skipped: true };
    if (teacher.releasedDoc.openedAt) return { ok: true, openedAt: teacher.releasedDoc.openedAt, duplicate: true };
    teacher.releasedDoc.openedAt = nowIso_();
    var mutation = { teacherId: teacherId, event: 'RECEIPT_OPENED', summary: 'Educator opened the released summary link', entityType: 'released_summary', entityId: teacherId, version: 1 };
    var auditEntry = appendWorkspaceAudit_(state.workspace, mutation, actor);
    var commit = writeWorkspaceState_(state.workspace, state.revision + 1, actor.email, lock);
    if (commit.pending) return { ok: true, status: 'recovery_pending', recoveryPending: true, auditPending: true, openedAt: teacher.releasedDoc.openedAt };
    var auditPending = false;
    try { appendCanonicalAuditRow_(auditEntry); }
    catch (auditErr) { try { markWorkspaceIndexRecovery_(); } catch (markerErr) {} auditPending = true; }
    return { ok: true, status: auditPending ? 'recovery_pending' : 'completed', recoveryPending: auditPending, auditPending: auditPending, openedAt: teacher.releasedDoc.openedAt, revision: state.revision + 1, version: state.revision + 1 };
  } finally { lock.releaseLock(); }
}

function pendingCommitInspection_() {
  var props=PropertiesService.getScriptProperties(),required=!!props.getProperty('EE_COMMIT_RECOVERY_REQUIRED');
  if(!required)return{pending:false,valid:true,at:'',fingerprint:''};
  try{
    var raw=DriveApp.getFileById(props.getProperty('EE_PENDING_COMMIT_FILE_ID')).getBlob().getDataAsString('UTF-8'),envelope=JSON.parse(raw||'null');
    if(!envelope||!isPlainObject_(envelope))throw new Error('missing envelope');
    var revision=Number(envelope.revision);if(Math.floor(revision)!==revision||revision<0)throw new Error('invalid revision');
    var workspace=sanitizeStoredWorkspace_(envelope.workspace),at='';
    try{at=optionalTimestamp_(envelope.at)||'';}catch(timestampErr){}
    return{pending:true,valid:true,at:at,revision:revision,workspace:workspace,fingerprint:hashText_(raw)};
  }catch(err){return{pending:true,valid:false,at:'',fingerprint:'unreadable'};}
}

function workspaceIntegrityInspection_() {
  var props=PropertiesService.getScriptProperties(),state=readWorkspaceState_({skipPendingRecovery:true}),pendingCommit=pendingCommitInspection_();
  var workspace=pendingCommit.pending&&pendingCommit.valid?pendingCommit.workspace:state.workspace;
  var journal=readSecondaryRecoveryJournal_();
  if(props.getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED'))journal.manualReviewRequired=true;
  var auditRows=auditLedgerRows_();
  var parity=secondaryIndexStatus_(workspace,{audit:auditRows}),configuration=configurationIndexStatus_(workspace),outbox=operationAuditOutboxStatus_(journal,auditRows),audit;
  try{audit=auditChainStatus_(auditRows);}catch(auditErr){audit={ok:false,reason:'unavailable',rows:0,verified:0,brokenAtRow:0};}
  var auditLedgerFingerprint=hashText_(JSON.stringify(auditRows.map(function(row){return row.map(auditCellText_);})));
  var metadataManual=journal.unreadable||journal.manualReviewRequired||!!props.getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED');
  var ambiguous=metadataManual||!pendingCommit.valid||parity.ambiguous||configuration.ambiguous||outbox.ambiguous||audit.ok!==true;
  var recoveryPending=pendingCommit.pending||journal.workspaceIndexes||journal.configuration||journal.auditEntries.length>0||metadataManual||parity.totalMissing>0||parity.ambiguous||!configuration.ok||outbox.ambiguous;
  var fingerprint=hashText_(JSON.stringify({
    revision:state.revision,pending:{pending:pendingCommit.pending,valid:pendingCommit.valid,revision:pendingCommit.revision||0,fingerprint:pendingCommit.fingerprint},
    parity:parity.fingerprint,configuration:configuration.fingerprint,outbox:outbox.fingerprint,
    journal:{at:journal.at||'',workspaceIndexes:journal.workspaceIndexes,configuration:journal.configuration,manualReviewRequired:journal.manualReviewRequired,unreadable:journal.unreadable,auditEntries:(journal.auditEntries||[]).map(function(entry){return normalizeSecondaryRow_('audit',expectedAuditIndexRow_(entry));})},
    audit:{ok:audit.ok===true,reason:audit.reason||'',rows:audit.rows||0,verified:audit.verified||0,brokenAtRow:audit.brokenAtRow||0,ledger:auditLedgerFingerprint},
  }));
  var issueSamples=parity.issueSamples.concat(outbox.issueSamples||[]);
  if(configuration.duplicate)issueSamples.push({ledger:'configuration',issue:'duplicate_academic_year_key',occurrences:configuration.keyCount,idFingerprint:hashText_('configuration|academicYear').slice(0,16)});
  if(!pendingCommit.valid)issueSamples.push({ledger:'workspace_commit',issue:'unreadable_pending_commit',idFingerprint:hashText_('workspace_commit|unreadable').slice(0,16)});
  if(audit.ok!==true)issueSamples.push({ledger:'audit_chain',issue:'chain_'+String(audit.reason||'unavailable'),row:audit.brokenAtRow||0,idFingerprint:hashText_('audit_chain|'+String(audit.reason||'unavailable')+'|'+String(audit.brokenAtRow||0)).slice(0,16)});
  return{state:state,workspace:workspace,pendingCommit:pendingCommit,journal:journal,parity:parity,configuration:configuration,outbox:outbox,audit:audit,fingerprint:fingerprint,ambiguous:ambiguous,manualReviewRequired:ambiguous,recoveryPending:recoveryPending,repairable:!ambiguous,issueSamples:issueSamples.slice(0,EE_SECONDARY_ISSUE_SAMPLE_MAX)};
}

function workspaceIntegrityEffectCounts_(inspection){return{
  completePendingCommit:inspection.pendingCommit.pending&&inspection.pendingCommit.valid,
  appendMissingMessageRows:inspection.parity.missingMessages,
  appendMissingAuditRows:inspection.parity.missingAuditRows,
  appendMissingSnapshotRows:inspection.parity.missingSnapshots,
  appendOperationAuditEntries:inspection.outbox.missing,
  clearAlreadyPresentOperationAuditEntries:inspection.outbox.exactPresent,
  synchronizeAcademicYear:!inspection.configuration.ok&&!inspection.configuration.ambiguous,
};}
function workspaceIntegrityEffects_(inspection){
  var counts=workspaceIntegrityEffectCounts_(inspection),effects=[];
  if(counts.completePendingCommit)effects.push('Complete 1 pending canonical workspace commit.');
  if(counts.appendMissingMessageRows)effects.push('Append '+counts.appendMissingMessageRows+' missing message ledger row'+(counts.appendMissingMessageRows===1?'':'s')+'.');
  if(counts.appendMissingAuditRows)effects.push('Append '+counts.appendMissingAuditRows+' missing canonical audit row'+(counts.appendMissingAuditRows===1?'':'s')+'.');
  if(counts.appendMissingSnapshotRows)effects.push('Append '+counts.appendMissingSnapshotRows+' missing finalized-cycle snapshot row'+(counts.appendMissingSnapshotRows===1?'':'s')+'.');
  if(counts.appendOperationAuditEntries)effects.push('Append '+counts.appendOperationAuditEntries+' queued operation audit entr'+(counts.appendOperationAuditEntries===1?'y':'ies')+'.');
  if(counts.clearAlreadyPresentOperationAuditEntries)effects.push('Clear '+counts.clearAlreadyPresentOperationAuditEntries+' queued operation audit entr'+(counts.clearAlreadyPresentOperationAuditEntries===1?'y':'ies')+' already present with an exact payload.');
  if(counts.synchronizeAcademicYear)effects.push('Synchronize the canonical academic-year configuration projection.');
  if(inspection.journal.workspaceIndexes||inspection.journal.configuration)effects.push('Clear recovery markers only after their derived rows are verified.');
  effects.push('Record the successful integrity verification timestamp only after every reviewed check is clean.');
  return effects.slice(0,8);
}
function workspaceIntegrityReviewCounts_(inspection){
  var parity=inspection.parity,blankIds=parity.messages.blankIdRows+parity.audit.blankIdRows+parity.snapshots.blankIdRows;
  var totalAmbiguous=parity.totalMismatched+parity.totalDuplicateIds+parity.ledgerOnlySnapshots+blankIds+inspection.outbox.mismatched+(inspection.configuration.duplicate?1:0)+(inspection.audit.ok===true?0:1)+(inspection.journal.manualReviewRequired||inspection.journal.unreadable?1:0)+(inspection.pendingCommit.valid?0:1);
  var totalRepairable=parity.totalMissing+inspection.outbox.missing+inspection.outbox.exactPresent+(inspection.pendingCommit.pending&&inspection.pendingCommit.valid?1:0)+(!inspection.configuration.ok&&!inspection.configuration.ambiguous?1:0);
  return{missingMessages:parity.missingMessages,mismatchedMessages:parity.mismatchedMessages,duplicateMessages:parity.duplicateMessageIds,ledgerOnlyMessages:parity.ledgerOnlyMessages,missingAuditRows:parity.missingAuditRows,mismatchedAuditRows:parity.mismatchedAuditRows,duplicateAuditRows:parity.duplicateAuditIds,ledgerOnlyAuditRows:parity.ledgerOnlyAuditRows,missingSnapshots:parity.missingSnapshots,mismatchedSnapshots:parity.mismatchedSnapshots,duplicateSnapshots:parity.duplicateSnapshotIds,ledgerOnlySnapshots:parity.ledgerOnlySnapshots,operationAuditEntries:inspection.journal.auditEntries.length,configurationMismatch:!inspection.configuration.ok,pendingCommit:inspection.pendingCommit.pending,totalRepairable:totalRepairable,totalAmbiguous:totalAmbiguous};
}
function workspaceIntegrityReviewSamples_(inspection){
  var issues=inspection.issueSamples||[];
  return{mismatched:issues.filter(function(item){return item.issue==='canonical_mismatch';}).slice(0,5),duplicates:issues.filter(function(item){return item.issue==='duplicate_id'||item.issue==='duplicate_academic_year_key';}).slice(0,5),ledgerOnlySnapshots:issues.filter(function(item){return item.ledger==='snapshots'&&item.issue==='unexpected_ledger_only';}).slice(0,5)};
}

function reviewPortalWorkspaceIntegrity() {
  var actor=requireAdmin_(),inspection=workspaceIntegrityInspection_(),token=newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token),JSON.stringify({actorEmail:actor.email,operation:'workspace_integrity',fingerprint:inspection.fingerprint}),EE_ADMIN_REVIEW_SECONDS);
  var expiresAt=new Date(Date.now()+EE_ADMIN_REVIEW_SECONDS*1000).toISOString(),counts=workspaceIntegrityReviewCounts_(inspection),samples=workspaceIntegrityReviewSamples_(inspection),effects=workspaceIntegrityEffects_(inspection),revision=inspection.pendingCommit.pending&&inspection.pendingCommit.valid?inspection.pendingCommit.revision:inspection.state.revision;
  var review={token:token,expiresAt:expiresAt,repairable:inspection.repairable,manualReviewRequired:inspection.manualReviewRequired,auditChainIntact:inspection.audit.ok===true,revision:revision,fingerprint:inspection.fingerprint,counts:counts,samples:samples,effects:effects};
  return{ok:true,status:inspection.manualReviewRequired?'manual_review_required':(inspection.recoveryPending?'recovery_pending':'none'),recoveryPending:inspection.recoveryPending,manualReviewRequired:inspection.manualReviewRequired,repairable:inspection.repairable,fingerprint:inspection.fingerprint,revision:revision,counts:counts,samples:samples,parity:inspection.parity,configuration:inspection.configuration,outbox:inspection.outbox,auditChainIntact:inspection.audit.ok===true,auditChainRows:inspection.audit.rows||0,auditChainVerifiedRows:inspection.audit.verified||0,issueSamples:inspection.issueSamples,effects:effects,review:review};
}

function reconcilePortalWorkspaceIntegrity(request) {
  var actor = requireAdmin_();
  request=requireObject_(request||{},'request');
  var token=safeId_(request.reviewToken||'',false);
  if(!token)throw eeError_('review_required','Review workspace integrity before applying a repair.');
  if(request.acknowledgeRepair!==true)throw eeError_('acknowledgment_required','Confirm the reviewed workspace-ledger repair before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    var cache=CacheService.getScriptCache(),key=adminReviewCacheKey_(token),rawReview=cache.get(key),review;
    try{review=rawReview?JSON.parse(rawReview):null;}catch(reviewParseErr){review=null;}
    if(!review||review.actorEmail!==actor.email||review.operation!=='workspace_integrity')throw eeError_('review_required','The workspace-integrity review expired or was already used. Review again.');
    var inspection=workspaceIntegrityInspection_();
    if(review.fingerprint!==inspection.fingerprint){cache.remove(key);throw eeError_('review_stale','Workspace integrity changed after review. Run the read-only review again.');}
    cache.remove(key);
    if(!inspection.repairable)throw eeError_('manual_recovery_required','The review found ambiguous ledger data, recovery metadata, configuration, or a broken audit chain. District IT must inspect it; automated repair was refused.');
    var props = PropertiesService.getScriptProperties();
    var commitWasPending = inspection.pendingCommit.pending;
    if (commitWasPending) {
      try { reconcilePendingCommit_(lock); }
      catch (commitErr) { throw eeError_('manual_recovery_required', 'The pending workspace journal could not be completed safely. District IT must inspect the canonical file, metadata row, and journal.'); }
    }
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    var journal = readSecondaryRecoveryJournal_();
    if (journal.unreadable) throw eeError_('manual_recovery_required', 'Secondary recovery metadata is unreadable. District IT must inspect it before any repair.');
    if (commitWasPending) journal.workspaceIndexes = true;
    if (props.getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED')) journal.manualReviewRequired = true;

    var beforeIndexes = secondaryIndexStatus_(state.workspace);
    if (beforeIndexes.totalMissing) journal.workspaceIndexes = true;
    var beforeConfigurationStatus=configurationIndexStatus_(state.workspace),beforeConfigurationMismatch=!beforeConfigurationStatus.ok;
    if (beforeConfigurationMismatch) journal.configuration = true;
    var beforeAuditEntries = journal.auditEntries.length;
    var repairedAuditEntries = 0;
    var audit = auditChainStatus_();

    if ((journal.workspaceIndexes || journal.auditEntries.length) && audit.ok !== true) {
      journal.manualReviewRequired = true;
    } else {
      if (journal.workspaceIndexes) {
        try {
          syncSecondaryIndexes_(state.workspace);
          var synchronizedIndexes=secondaryIndexStatus_(state.workspace);
          journal.workspaceIndexes = synchronizedIndexes.totalMissing > 0;
          if(synchronizedIndexes.ambiguous)journal.manualReviewRequired=true;
        } catch (indexErr) { journal.workspaceIndexes = true; }
      }
      if (journal.auditEntries.length) {
        try { repairedAuditEntries = drainOperationAuditRecovery_(journal); }
        catch (outboxErr) {}
      }
    }

    if (journal.configuration) {
      try { syncConfigurationIndex_(state.workspace); journal.configuration = false; }
      catch (configurationErr) { journal.configuration = true; }
    }

    if (props.getProperty('EE_COMMIT_RECOVERY_REQUIRED')) journal.manualReviewRequired = true;
    writeSecondaryRecoveryJournal_(journal);
    var afterIndexes = secondaryIndexStatus_(state.workspace);
    var configurationStatus=configurationIndexStatus_(state.workspace),configurationMismatch=!configurationStatus.ok;
    var afterOutbox=operationAuditOutboxStatus_(journal),finalAudit=auditChainStatus_();
    if(afterIndexes.ambiguous||configurationStatus.ambiguous||afterOutbox.ambiguous||finalAudit.ok!==true)journal.manualReviewRequired=true;
    var pending = journal.workspaceIndexes || journal.configuration || journal.auditEntries.length > 0 || journal.manualReviewRequired || configurationMismatch || afterIndexes.totalMissing > 0 || afterIndexes.ambiguous || afterOutbox.ambiguous || !!props.getProperty('EE_COMMIT_RECOVERY_REQUIRED');
    if(!pending)props.setProperty('EE_LAST_SUCCESSFUL_INTEGRITY_RECONCILIATION_AT',nowIso_());
    return {
      ok: true,
      status: journal.manualReviewRequired ? 'manual_review_required' : (pending ? 'recovery_pending' : ((commitWasPending || beforeIndexes.totalMissing || beforeConfigurationMismatch || beforeAuditEntries) ? 'completed' : 'none')),
      recoveryPending: pending,
      manualReviewRequired: journal.manualReviewRequired,
      revision: state.revision,
      repaired: {
        workspaceIndexRows: Math.max(0, beforeIndexes.totalMissing - afterIndexes.totalMissing),
        operationAuditEntries: repairedAuditEntries,
        configuration: beforeConfigurationMismatch && !configurationMismatch,
        pendingCommit: commitWasPending && !props.getProperty('EE_COMMIT_RECOVERY_REQUIRED'),
      },
      remaining: {
        missingMessages: afterIndexes.missingMessages,
        missingAuditRows: afterIndexes.missingAuditRows,
        missingSnapshots: afterIndexes.missingSnapshots,
        mismatchedMessages: afterIndexes.mismatchedMessages,
        mismatchedAuditRows: afterIndexes.mismatchedAuditRows,
        mismatchedSnapshots: afterIndexes.mismatchedSnapshots,
        duplicateMessageIds: afterIndexes.duplicateMessageIds,
        duplicateAuditIds: afterIndexes.duplicateAuditIds,
        duplicateSnapshotIds: afterIndexes.duplicateSnapshotIds,
        ledgerOnlyMessages: afterIndexes.ledgerOnlyMessages,
        ledgerOnlyAuditRows: afterIndexes.ledgerOnlyAuditRows,
        ledgerOnlySnapshots: afterIndexes.ledgerOnlySnapshots,
        operationAuditEntries: journal.auditEntries.length,
        configurationMismatch: configurationMismatch,
      },
      parity: afterIndexes,
      configuration: configurationStatus,
      outbox: afterOutbox,
      auditChainIntact: finalAudit.ok === true,
      actorRole: actor.role,
    };
  } finally { lock.releaseLock(); }
}

function oldestRecoveryTimestamp_(items) {
  var oldest='';
  for(var i=0;i<(items||[]).length;i++){
    var at='';try{at=optionalTimestamp_(items[i]&&items[i].at)||'';}catch(timestampErr){}
    if(at&&(!oldest||at<oldest))oldest=at;
  }
  return oldest;
}
function propertyRecoveryTimestamp_(raw){if(!raw)return'';try{var parsed=JSON.parse(raw);return optionalTimestamp_(parsed&&parsed.at)||'';}catch(err){return'';}}
function mailQuotaStatus_(){try{if(typeof MailApp!=='undefined'&&typeof MailApp.getRemainingDailyQuota==='function'){var remaining=Number(MailApp.getRemainingDailyQuota());if(isFinite(remaining)&&remaining>=0)return{available:true,remainingDaily:Math.floor(remaining)};}}catch(err){}return{available:false,remainingDaily:null};}

/**
 * Admin-only, read-only bootstrap health check: surfaces in the portal the
 * verifications that previously required running functions in the script
 * editor. Names counts, never member emails.
 */
function getPortalSetupHealth() {
  var actor = requireAdmin_();
  var checkedAt=nowIso_();
  var props = PropertiesService.getScriptProperties();
  var members = memberObjects_();
  var assignments = assignmentObjects_();
  var releaseRecoveryRequired = !!props.getProperty('EE_RELEASE_RECOVERY_REQUIRED');
  var releaseRecoveryQueue=readReleaseRecoveryQueue_();
  var releaseRecoveryCount = releaseRecoveryQueue.length;
  var rolloverRecoveryRequired = !!props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
  var workspaceCommitRecoveryRequired = !!props.getProperty('EE_COMMIT_RECOVERY_REQUIRED');
  var artifactJournal = readArtifactOperationJournal_();
  var artifactManualReviewRequired = artifactJournal.ambiguous || artifactJournal.unreadable || !!props.getProperty('EE_ARTIFACT_RECOVERY_MANUAL_REQUIRED');
  var artifactPendingEntries = (artifactJournal.entries || []).filter(function (entry) { return entry.stage !== 'completed'; });
  // The integrity-checked journal is authoritative. The marker is only an
  // advisory fast path and may survive a crash after every entry completed.
  var artifactRecoveryRequired = artifactPendingEntries.length > 0 || artifactManualReviewRequired;
  var artifactRecoveryCount = artifactPendingEntries.length + (artifactManualReviewRequired && !artifactPendingEntries.length ? 1 : 0);
  var artifactRecoveryOldestAt = oldestRecoveryTimestamp_(artifactPendingEntries.map(function (entry) { return { at: entry.createdAt || entry.updatedAt || '' }; }));
  if (!artifactRecoveryOldestAt && artifactRecoveryRequired) artifactRecoveryOldestAt = artifactJournal.at || '';
  var notificationJournal = readNotificationOperationJournal_();
  var notificationManualReviewRequired = notificationJournal.ambiguous || notificationJournal.unreadable || !!props.getProperty('EE_NOTIFICATION_RECOVERY_MANUAL_REQUIRED');
  var notificationPendingEntries = notificationJournal.entries || [];
  var notificationRecoveryRequired = notificationPendingEntries.length > 0 || notificationManualReviewRequired;
  var notificationRecoveryCount = notificationPendingEntries.length + (notificationManualReviewRequired && !notificationPendingEntries.length ? 1 : 0);
  var notificationDeliveryUnknownCount = notificationPendingEntries.filter(function (entry) { return entry.stage === 'delivery_unknown' || entry.stage === 'dispatch_started'; }).length;
  var notificationRecoveryOldestAt = oldestRecoveryTimestamp_(notificationPendingEntries.map(function (entry) { return { at: entry.createdAt || entry.updatedAt || '' }; }));
  if (!notificationRecoveryOldestAt && notificationRecoveryRequired) notificationRecoveryOldestAt = notificationJournal.at || '';
  var secondaryJournal = readSecondaryRecoveryJournal_();
  if (props.getProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED')) secondaryJournal.manualReviewRequired = true;
  var state;
  try {
    state = readWorkspaceState_({ skipPendingRecovery: true });
    releaseRecoveryRequired = releaseRecoveryRequiredForState_(state);
    releaseRecoveryQueue=readReleaseRecoveryQueue_();
    releaseRecoveryCount = releaseRecoveryQueue.length;
  }
  catch (workspaceErr) {
    if (!releaseRecoveryRequired && !rolloverRecoveryRequired && !workspaceCommitRecoveryRequired && !artifactRecoveryRequired && !notificationRecoveryRequired && !props.getProperty('EE_SECONDARY_RECONCILE_REQUIRED')) throw workspaceErr;
    state = { workspace: { teachers: [] }, revision: -1, metadataExists: false };
  }
  var secondaryIndexes = { messages:{blankIdRows:0},audit:{blankIdRows:0},snapshots:{blankIdRows:0},missingMessages:0,missingAuditRows:0,missingSnapshots:0,mismatchedMessages:0,mismatchedAuditRows:0,mismatchedSnapshots:0,duplicateMessageIds:0,duplicateAuditIds:0,duplicateSnapshotIds:0,ledgerOnlyMessages:0,ledgerOnlyAuditRows:0,ledgerOnlySnapshots:0,totalMissing:0,totalMismatched:0,totalDuplicateIds:0,totalLedgerOnly:0,ambiguous:false,issueSamples:[],fingerprint:'' };
  var secondaryInspectionUnavailable = false;
  var configurationStatus={keyCount:0,missing:false,mismatched:false,duplicate:false,ambiguous:false,ok:true,fingerprint:''};
  var outboxStatus={queued:secondaryJournal.auditEntries.length,missing:secondaryJournal.auditEntries.length,exactPresent:0,mismatched:0,duplicateIds:0,ambiguous:false,issueSamples:[]};
  if (state.metadataExists) {
    try { secondaryIndexes = secondaryIndexStatus_(state.workspace); }
    catch (secondaryErr) { secondaryInspectionUnavailable = true; }
    try { configurationStatus=configurationIndexStatus_(state.workspace); }
    catch (configurationErr) { secondaryInspectionUnavailable = true; }
    try { outboxStatus=operationAuditOutboxStatus_(secondaryJournal); }
    catch (outboxErr) { secondaryInspectionUnavailable=true;outboxStatus.ambiguous=true; }
  } else if (workspaceCommitRecoveryRequired) secondaryInspectionUnavailable = true;
  var configurationMismatch=!configurationStatus.ok;
  var secondaryManualReviewRequired=secondaryJournal.manualReviewRequired||secondaryIndexes.ambiguous||configurationStatus.ambiguous||outboxStatus.ambiguous;
  var secondaryRecoveryRequired = workspaceCommitRecoveryRequired || secondaryJournal.workspaceIndexes || secondaryJournal.configuration || secondaryJournal.auditEntries.length > 0 || secondaryManualReviewRequired || secondaryInspectionUnavailable || configurationMismatch || secondaryIndexes.totalMissing > 0;
  var teachers = (state.workspace.teachers || []).filter(function (t) { return t.active !== false; });
  var counts = { admin: 0, evaluator: 0, teacher: 0, inactive: 0 };
  members.forEach(function (m) { if (!m.active) counts.inactive++; else if (counts[m.role] !== undefined) counts[m.role]++; });
  var teacherIdsWithMember = {};
  members.forEach(function (m) { if (m.active && m.role === 'teacher' && m.teacherId) teacherIdsWithMember[m.teacherId] = true; });
  var teacherIdsWithAssignment = {};
  assignments.forEach(function (a) { if (a.active && a.teacherId) teacherIdsWithAssignment[a.teacherId] = true; });
  var withoutMember = 0, withoutAssignment = 0;
  teachers.forEach(function (t) {
    if (!teacherIdsWithMember[t.id]) withoutMember++;
    if (!teacherIdsWithAssignment[t.id]) withoutAssignment++;
  });
  var folderOk = false;
  try { DriveApp.getFolderById(props.getProperty('EE_FOLDER_ID')); folderOk = true; } catch (folderErr) {}
  var effectiveOwner = '';
  try { effectiveOwner = normalizeEmail_(Session.getEffectiveUser().getEmail()); } catch (ownerErr) {}
  var bootstrapAdmin = normalizeEmail_(props.getProperty('EE_BOOTSTRAP_ADMIN'));
  var lastRollover = null;
  try { lastRollover = JSON.parse(props.getProperty('EE_LAST_ROLLOVER') || 'null'); } catch (lastRolloverErr) {}
  // Recomputed on demand, and defensively: a chain problem must not take the
  // rest of the health report down with it.
  var audit;
  try { audit = auditChainStatus_(); }
  catch (auditErr) { audit = { ok: false, reason: 'unavailable', rows: 0, verified: 0, brokenAtRow: 0 }; }
  var pendingCommitInspection=pendingCommitInspection_(),rolloverRaw=props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED'),mailQuota=mailQuotaStatus_();
  var secondaryRecoveryCount=(secondaryJournal.workspaceIndexes?1:0)+(secondaryJournal.configuration?1:0)+secondaryJournal.auditEntries.length+(secondaryManualReviewRequired?1:0)+secondaryIndexes.totalMissing+secondaryIndexes.totalMismatched+secondaryIndexes.totalDuplicateIds+secondaryIndexes.ledgerOnlySnapshots+(configurationMismatch?1:0);
  var pendingRecoveryTotal=(workspaceCommitRecoveryRequired?1:0)+(secondaryRecoveryRequired?Math.max(1,secondaryRecoveryCount):0)+(releaseRecoveryRequired?Math.max(1,releaseRecoveryCount):0)+(rolloverRecoveryRequired?1:0)+(artifactRecoveryRequired?Math.max(1,artifactRecoveryCount):0)+(notificationRecoveryRequired?Math.max(1,notificationRecoveryCount):0);
  var recoveryTimes=[pendingCommitInspection.at||'',secondaryJournal.at||'',oldestRecoveryTimestamp_(releaseRecoveryQueue),propertyRecoveryTimestamp_(rolloverRaw),artifactRecoveryOldestAt,notificationRecoveryOldestAt].filter(function(value){return !!value;}).sort();
  var oldestRecoveryAt=recoveryTimes.length?recoveryTimes[0]:'',oldestRecoveryAgeHours=oldestRecoveryAt?Math.max(0,(new Date(checkedAt).getTime()-new Date(oldestRecoveryAt).getTime())/3600000):null;
  var secondaryAmbiguousIssueCount=secondaryIndexes.totalMismatched+secondaryIndexes.totalDuplicateIds+secondaryIndexes.ledgerOnlySnapshots+secondaryIndexes.messages.blankIdRows+secondaryIndexes.audit.blankIdRows+secondaryIndexes.snapshots.blankIdRows+outboxStatus.mismatched+outboxStatus.duplicateIds+(configurationStatus.duplicate?1:0)+(secondaryJournal.manualReviewRequired||secondaryJournal.unreadable?1:0);
  return {
    ok: true,
    checkedAt: checkedAt,
    checks: {
      allowedDomain: normalizeDomain_(props.getProperty('EE_ALLOWED_DOMAIN')) || '',
      webAppUrlConfigured: !!(configMap_().webAppUrl || safePortalUrl_(ScriptApp.getService().getUrl() || '')),
      repositoryFolderAccessible: folderOk,
      workspaceMetadataIntact: !!state.metadataExists,
      workspaceRevision: state.revision,
      memberCounts: counts,
      activeEducators: teachers.length,
      educatorsWithoutMemberAccount: withoutMember,
      educatorsWithoutEvaluatorAssignment: withoutAssignment,
      auditChainIntact: audit.ok === true,
      auditChainRows: audit.rows || 0,
      auditChainVerifiedRows: audit.verified || 0,
      auditChainCheckedAt: checkedAt,
      auditChainBreakReason: audit.ok ? '' : String(audit.reason || 'unknown'),
      auditChainBrokenAtRow: audit.ok ? 0 : (audit.brokenAtRow || 0),
      workspaceCommitRecoveryRequired: workspaceCommitRecoveryRequired,
      secondaryReconciliationRequired: secondaryRecoveryRequired,
      secondaryWorkspaceIndexesRequired: secondaryJournal.workspaceIndexes || secondaryIndexes.totalMissing > 0,
      secondaryConfigurationRequired: secondaryJournal.configuration || configurationMismatch,
      secondaryOperationAuditCount: secondaryJournal.auditEntries.length,
      secondaryMissingMessageCount: secondaryIndexes.missingMessages,
      secondaryMissingAuditCount: secondaryIndexes.missingAuditRows,
      secondaryMissingSnapshotCount: secondaryIndexes.missingSnapshots,
      secondaryMismatchedMessageCount: secondaryIndexes.mismatchedMessages,
      secondaryMismatchedAuditCount: secondaryIndexes.mismatchedAuditRows,
      secondaryMismatchedSnapshotCount: secondaryIndexes.mismatchedSnapshots,
      secondaryDuplicateMessageIdCount: secondaryIndexes.duplicateMessageIds,
      secondaryDuplicateAuditIdCount: secondaryIndexes.duplicateAuditIds,
      secondaryDuplicateSnapshotIdCount: secondaryIndexes.duplicateSnapshotIds,
      secondaryDuplicateMessageCount: secondaryIndexes.duplicateMessageIds,
      secondaryDuplicateAuditCount: secondaryIndexes.duplicateAuditIds,
      secondaryDuplicateSnapshotCount: secondaryIndexes.duplicateSnapshotIds,
      secondaryLedgerOnlyMessageCount: secondaryIndexes.ledgerOnlyMessages,
      secondaryLedgerOnlyAuditCount: secondaryIndexes.ledgerOnlyAuditRows,
      secondaryLedgerOnlySnapshotCount: secondaryIndexes.ledgerOnlySnapshots,
      secondaryIssueSamples: secondaryIndexes.issueSamples,
      secondaryParityFingerprint: secondaryIndexes.fingerprint,
      secondaryOutboxMismatchCount: outboxStatus.mismatched,
      secondaryOutboxDuplicateIdCount: outboxStatus.duplicateIds,
      secondaryAmbiguousIssueCount: secondaryAmbiguousIssueCount,
      secondaryInspectionUnavailable: secondaryInspectionUnavailable,
      secondaryManualReviewRequired: secondaryManualReviewRequired,
      configurationAcademicYearKeyCount: configurationStatus.keyCount,
      configurationAcademicYearDuplicate: configurationStatus.duplicate,
      releasedSummaryRecoveryRequired: releaseRecoveryRequired,
      releasedSummaryRecoveryCount: releaseRecoveryCount,
      annualRolloverRecoveryRequired: rolloverRecoveryRequired,
      artifactRecoveryRequired: artifactRecoveryRequired,
      artifactRecoveryPending: artifactPendingEntries.length > 0,
      artifactRecoveryManualRequired: artifactManualReviewRequired,
      artifactRecoveryCount: artifactRecoveryCount,
      artifactRecoveryOldestAt: artifactRecoveryOldestAt,
      notificationRecoveryRequired: notificationRecoveryRequired,
      notificationRecoveryManualRequired: notificationManualReviewRequired,
      notificationRecoveryCount: notificationRecoveryCount,
      notificationDeliveryUnknownCount: notificationDeliveryUnknownCount,
      notificationRecoveryOldestAt: notificationRecoveryOldestAt,
      deploymentOwnerMatchesBootstrapAdmin: !!effectiveOwner && !!bootstrapAdmin && effectiveOwner === bootstrapAdmin,
      lastAnnualRolloverAt: lastRollover && optionalTimestamp_(lastRollover.at) || '',
      lastAnnualRolloverFromYear: lastRollover ? safeString_(lastRollover.fromYear, 20, '') : '',
      lastAnnualRolloverToYear: lastRollover ? safeString_(lastRollover.toYear, 20, '') : '',
      lastSuccessfulReconciliationAt: (function(){try{return optionalTimestamp_(props.getProperty('EE_LAST_SUCCESSFUL_INTEGRITY_RECONCILIATION_AT'))||'';}catch(err){return'';}})(),
      mailQuotaAvailable: mailQuota.available,
      mailRemainingDailyQuota: mailQuota.remainingDaily,
      checkedAt: checkedAt,
      pendingRecoveryTotal: pendingRecoveryTotal,
      oldestRecoveryAt: oldestRecoveryAt,
      oldestRecoveryAgeHours: oldestRecoveryAgeHours,
      emailQuotaAvailable: mailQuota.available,
      emailQuotaRemaining: mailQuota.remainingDaily,
      releaseQueueCount: releaseRecoveryCount,
    },
    parity: secondaryIndexes,
    emailQuota: mailQuota,
    recoveryQueues: {
      pendingCommit:{pending:workspaceCommitRecoveryRequired,count:workspaceCommitRecoveryRequired?1:0,oldestAt:pendingCommitInspection.at||''},
      secondary:{pending:secondaryRecoveryRequired,count:secondaryRecoveryCount,oldestAt:secondaryJournal.at||''},
      releasedSummary:{pending:releaseRecoveryRequired,count:releaseRecoveryCount,oldestAt:oldestRecoveryTimestamp_(releaseRecoveryQueue)},
      annualRollover:{pending:rolloverRecoveryRequired,count:rolloverRecoveryRequired?1:0,oldestAt:propertyRecoveryTimestamp_(rolloverRaw)},
      artifactOperations:{pending:artifactRecoveryRequired,count:artifactRecoveryCount,oldestAt:artifactRecoveryOldestAt,manualReviewRequired:artifactManualReviewRequired},
      notificationOperations:{pending:notificationRecoveryRequired,count:notificationRecoveryCount,oldestAt:notificationRecoveryOldestAt,manualReviewRequired:notificationManualReviewRequired,deliveryUnknownCount:notificationDeliveryUnknownCount},
    },
  };
}

/* ---------------- district administrator operations ---------------- */

function adminReviewCacheKey_(token) { return 'EE_ADMIN_REVIEW_' + safeId_(token, true); }
function directoryFingerprint_() { return hashText_(JSON.stringify({ members: memberObjects_(), assignments: assignmentObjects_() })); }

function uniqueTeacherIds_(items) {
  var out = [], seen = {};
  for (var i = 0; i < items.length; i++) {
    var id = safeId_(items[i] || '', false);
    if (id && !seen[id]) { seen[id] = true; out.push(id); }
  }
  out.sort();
  return out;
}

function affectedTeacherIdsForMember_(workspace, candidate, current) {
  hydrateReleaseRegistry_(workspace);
  var ids = [];
  if (candidate && candidate.teacherId) ids.push(candidate.teacherId);
  if (current && current.teacherId) ids.push(current.teacherId);
  var email = normalizeEmail_(candidate && candidate.email);
  var assignments = assignmentObjects_();
  for (var i = 0; i < assignments.length; i++) if (assignments[i].evaluatorEmail === email) ids.push(assignments[i].teacherId);
  var registry = workspace.releaseRegistry || [];
  for (var r = 0; r < registry.length; r++) if ((registry[r].grants || []).indexOf(email) !== -1 || normalizeEmail_(registry[r].releasedBy) === email) ids.push(registry[r].teacherId);
  var teachers = workspace.teachers || [];
  for (var t = 0; t < teachers.length; t++) {
    var doc = teachers[t].releasedDoc;
    if (doc && (normalizeEmail_(doc.sharedWith) === email || normalizeEmail_(doc.by) === email || (doc.grants || []).indexOf(email) !== -1)) ids.push(teachers[t].id);
  }
  return uniqueTeacherIds_(ids);
}

function directoryCurrentRecord_(kind, candidate, directory) {
  var rows = kind === 'member' ? directory.members : directory.assignments;
  for (var i = 0; i < rows.length; i++) {
    if (kind === 'member' && rows[i].email === candidate.email) return rows[i];
    if (kind === 'assignment' && rows[i].teacherId === candidate.teacherId && rows[i].evaluatorEmail === candidate.evaluatorEmail) return rows[i];
  }
  return null;
}

function directoryReviewedScope_(state, kind, candidate, current) {
  var workspace = state.workspace;
  hydrateReleaseRegistry_(workspace);
  var affectedTeacherIds = kind === 'member'
    ? boundedDirectoryAclScope_(workspace, affectedTeacherIdsForMember_(workspace, candidate, current))
    : boundedDirectoryAclScope_(workspace, [candidate.teacherId]);
  var wanted = {};
  for (var i = 0; i < affectedTeacherIds.length; i++) wanted[affectedTeacherIds[i]] = true;
  var affectedEntries = (workspace.releaseRegistry || []).filter(function (entry) { return !!wanted[entry.teacherId]; });
  var affectedDocumentIds = uniqueTeacherIds_(affectedEntries.slice(0, EE_RELEASE_ACL_BATCH_SIZE).map(function (entry) { return entry.id; }));
  var releasedDocs = (workspace.teachers || []).map(function (teacher) {
    return { teacherId: teacher.id, releasedDoc: teacher.releasedDoc || null };
  }).sort(function (left, right) { return left.teacherId.localeCompare(right.teacherId); });
  var releaseRegistry = (workspace.releaseRegistry || []).slice().sort(function (left, right) { return left.id.localeCompare(right.id); });
  return {
    revision: state.revision,
    affectedTeacherIds: affectedTeacherIds,
    affectedDocumentIds: affectedDocumentIds,
    workspaceScopeFingerprint: hashText_(JSON.stringify({
      revision: state.revision,
      workspaceHash: hashText_(JSON.stringify(workspace)),
      affectedTeacherIds: affectedTeacherIds,
      affectedDocumentIds: affectedDocumentIds,
      releaseRegistry: releaseRegistry,
      releasedDocs: releasedDocs,
    })),
  };
}

function allReleasedTeacherIds_(workspace) {
  hydrateReleaseRegistry_(workspace);
  return uniqueTeacherIds_((workspace.releaseRegistry || []).map(function (entry) { return entry.teacherId; }));
}

function clearReleaseRecoveryStagesForTeacher_(teacherId, stages) {
  teacherId = safeId_(teacherId || '', false);
  if (!teacherId) return;
  var wanted = {};
  for (var i = 0; i < (stages || []).length; i++) wanted[String(stages[i])] = true;
  writeReleaseRecoveryQueue_(readReleaseRecoveryQueue_().filter(function (item) {
    return !wanted[safeString_(item && item.stage, 60, '')] || safeId_(item && item.teacherId || '', false) !== teacherId;
  }));
}

function reconcileReleasedDocsForTeachers_(state, teacherIds, actor, reason, options) {
  options = options || {};
  var allowGlobalRecovery = options.allowGlobalRecovery !== false;
  var scopeTeacherId = safeId_(options.teacherId || '', false);
  var workspace = state.workspace;
  var registryChanged = hydrateReleaseRegistry_(workspace);
  var wanted = {}, ids = uniqueTeacherIds_(teacherIds || []);
  for (var i = 0; i < ids.length; i++) wanted[ids[i]] = true;
  var allEntries = (workspace.releaseRegistry || []).filter(function (entry) { return !!wanted[entry.teacherId]; });
  var queueBefore = readReleaseRecoveryQueue_();
  var sweepActive = queueBefore.some(function (item) {
    if (safeString_(item && item.stage, 60, '') !== 'directory_acl_deferred') return false;
    var itemTeacherId = safeId_(item && item.teacherId || '', false);
    return allowGlobalRecovery || itemTeacherId === scopeTeacherId;
  });
  var pendingEntries = allEntries.filter(function (entry) { return entry.status === 'recovery_pending' || entry.status === 'retirement_pending'; });
  var candidates = sweepActive && pendingEntries.length ? pendingEntries : allEntries;
  var entries = candidates.slice(0, EE_RELEASE_ACL_BATCH_SIZE), deferredEntries = candidates.slice(EE_RELEASE_ACL_BATCH_SIZE);
  if (Array.isArray(options.reviewedDocumentIds)) {
    var reviewedDocumentIds = uniqueTeacherIds_(options.reviewedDocumentIds);
    var currentDocumentIds = uniqueTeacherIds_(entries.map(function (entry) { return entry.id; }));
    if (JSON.stringify(reviewedDocumentIds) !== JSON.stringify(currentDocumentIds)) {
      throw eeError_('review_stale', 'The exact released-summary document scope changed after review. Reload and review the directory change again.');
    }
    var reviewedDocuments = {};
    for (var documentIndex = 0; documentIndex < reviewedDocumentIds.length; documentIndex++) reviewedDocuments[reviewedDocumentIds[documentIndex]] = true;
    entries = candidates.filter(function (entry) { return !!reviewedDocuments[entry.id]; });
    deferredEntries = candidates.filter(function (entry) { return !reviewedDocuments[entry.id]; });
  }
  if (!sweepActive && deferredEntries.length) {
    for (var pendingIndex = 0; pendingIndex < deferredEntries.length; pendingIndex++) {
      var deferredEntry = deferredEntries[pendingIndex];
      deferredEntry.status = (deferredEntry.status === 'retired' || deferredEntry.status === 'unavailable' || deferredEntry.status === 'retirement_pending') ? 'retirement_pending' : 'recovery_pending';
    }
    registryChanged = true;
  }
  if (deferredEntries.length) recordReleaseRecovery_({ at: nowIso_(), teacherId: allowGlobalRecovery ? '' : scopeTeacherId, stage: 'directory_acl_deferred', actorEmail: actor.email });
  var releasedFolderId = entries.length ? releasedEvaluationsFolder_().getId() : '';
  var reconciled = 0, unavailable = 0, retired = 0, failed = 0, changed = registryChanged;
  var successfulIds = [], auditEntries = [];
  var failedTeachers = {}, deferredTeachers = {};
  for (var d = 0; d < deferredEntries.length; d++) deferredTeachers[deferredEntries[d].teacherId] = true;
  for (var e = 0; e < entries.length; e++) {
    var entry = entries[e], file = null;
    var retirementRequired = entry.status === 'retired' || entry.status === 'unavailable' || entry.status === 'retirement_pending';
    try { file = DriveApp.getFileById(entry.id); }
    catch (missingErr) {
      entry.status = retirementRequired ? 'retirement_pending' : 'recovery_pending'; failed++; changed = true; failedTeachers[entry.teacherId] = true;
      recordDirectoryDocumentRecovery_({ at: nowIso_(), teacherId: entry.teacherId, documentId: entry.id, stage: 'directory_file_lookup', actorEmail: actor.email });
      continue;
    }
    if (typeof file.isTrashed !== 'function') {
      entry.status = retirementRequired ? 'retirement_pending' : 'recovery_pending'; failed++; changed = true; failedTeachers[entry.teacherId] = true;
      recordDirectoryDocumentRecovery_({ at: nowIso_(), teacherId: entry.teacherId, documentId: entry.id, stage: 'directory_file_state', actorEmail: actor.email });
      continue;
    }
    try {
      var shouldRetire = retirementRequired || file.isTrashed();
      var acl = reconcileReleasedDocAccess_(file, entry.teacherId, false, shouldRetire ? [] : undefined, releasedFolderId);
      var teacher = findById_(workspace.teachers || [], entry.teacherId);
      var isCurrent = !!(teacher && releasedDocId_(teacher.releasedDoc) === entry.id);
      entry.grants = acl.grants.slice(); entry.aclMode = acl.aclMode; entry.aclVersion = acl.aclVersion; entry.aclVerifiedAt = acl.aclVerifiedAt;
      entry.status = shouldRetire ? 'retired' : (isCurrent ? 'active' : 'historical');
      if (shouldRetire) { retired++; unavailable++; }
      if (isCurrent && !shouldRetire) {
        teacher.releasedDoc.grants = acl.grants.slice(); teacher.releasedDoc.aclMode = acl.aclMode; teacher.releasedDoc.aclVersion = acl.aclVersion;
        teacher.releasedDoc.aclVerifiedAt = acl.aclVerifiedAt; teacher.releasedDoc.accessReviewedAt = acl.aclVerifiedAt;
      }
      reconciled++; changed = true; successfulIds.push(entry.id);
    } catch (aclErr) {
      failed++; changed = true; entry.status = (retirementRequired || shouldRetire) ? 'retirement_pending' : 'recovery_pending'; failedTeachers[entry.teacherId] = true;
      var expected = [];
      try { expected = releasedDocExpectedViewers_(entry.teacherId, false); } catch (expectedErr) {}
      recordDirectoryDocumentRecovery_({ at: nowIso_(), teacherId: entry.teacherId, documentId: entry.id, stage: 'directory_acl', actorEmail: actor.email, expectedAclHash: hashText_(JSON.stringify(expected)) });
    }
  }
  if (entries.length) {
    var processed = {}, untouchedRegistry = [], processedRegistry = [];
    for (var rotateIndex = 0; rotateIndex < entries.length; rotateIndex++) processed[entries[rotateIndex].id] = true;
    for (var registryIndex = 0; registryIndex < workspace.releaseRegistry.length; registryIndex++) {
      (processed[workspace.releaseRegistry[registryIndex].id] ? processedRegistry : untouchedRegistry).push(workspace.releaseRegistry[registryIndex]);
    }
    workspace.releaseRegistry = untouchedRegistry.concat(processedRegistry);
    changed = true;
  }
  var allReleaseIds = allReleasedTeacherIds_(workspace), fullRegistryScope = allReleaseIds.every(function (id) { return !!wanted[id]; });
  if (!changed && !entries.length) {
    clearDirectoryAclIntents_(ids, allowGlobalRecovery && fullRegistryScope);
    if (allowGlobalRecovery) clearGlobalReleaseRecoveryStages_(['directory_acl_deferred', 'directory_acl_failures']);
    else clearReleaseRecoveryStagesForTeacher_(scopeTeacherId, ['directory_acl_deferred', 'directory_acl_failures']);
    return { status: 'completed', recoveryPending: false, accessRecoveryPending: false, auditPending: false, reconciled: 0, unavailable: 0, retired: 0, failed: 0, deferred: 0 };
  }
  for (var a = 0; a < ids.length; a++) {
    var count = allEntries.filter(function (entry) { return entry.teacherId === ids[a]; }).length;
    if (!count) continue;
    auditEntries.push(appendWorkspaceAudit_(workspace, {
      teacherId: ids[a], event: (failed || deferredEntries.length) ? 'RELEASED_DOC_ACCESS_RECOVERY_PENDING' : 'RELEASED_DOC_ACCESS_RECONCILED',
      summary: (failed || deferredEntries.length) ? 'Released-summary access reconciliation requires another bounded administrator recovery pass' : 'Released-summary private viewer access reconciled after ' + safeString_(reason, 80, 'a directory change'),
      entityType: 'released_summary_acl', entityId: ids[a], version: 1,
    }, actor));
  }
  var commit;
  try { commit = writeWorkspaceState_(workspace, state.revision + 1, actor.email, options.lock); }
  catch (commitErr) {
    recordReleaseRecovery_({ at: nowIso_(), teacherId: allowGlobalRecovery ? '' : scopeTeacherId, stage: 'acl_workspace_commit', actorEmail: actor.email });
    throw eeError_('release_recovery_required', 'Drive access changed, but the released-summary registry commit was not confirmed. Run released-summary access recovery before continuing.');
  }
  var commitPending = !!commit.pending, auditPending = false;
  if (commitPending) {
    try { markWorkspaceIndexRecovery_(); } catch (markerErr) {}
    auditPending = true;
    recordReleaseRecovery_({ at: nowIso_(), teacherId: allowGlobalRecovery ? '' : scopeTeacherId, stage: 'acl_workspace_commit', actorEmail: actor.email });
  } else {
    clearReleaseRecovery_(successfulIds);
    var completedTeacherIds = ids.filter(function (id) { return !failedTeachers[id] && !deferredTeachers[id]; });
    clearDirectoryAclIntents_(completedTeacherIds, allowGlobalRecovery && fullRegistryScope && completedTeacherIds.length === ids.length);
    if (!deferredEntries.length && !failed) {
      if (allowGlobalRecovery) clearGlobalReleaseRecoveryStages_(['directory_acl_deferred', 'directory_acl_failures']);
      else clearReleaseRecoveryStagesForTeacher_(scopeTeacherId, ['directory_acl_deferred', 'directory_acl_failures']);
    }
    for (var c = 0; c < auditEntries.length; c++) {
      try { appendCanonicalAuditRow_(auditEntries[c]); }
      catch (auditErr) { try { markWorkspaceIndexRecovery_(); } catch (markerErr) {} auditPending = true; }
    }
  }
  var accessRecoveryPending = !!(failed || commitPending || deferredEntries.length);
  var recoveryPending = accessRecoveryPending || auditPending;
  return { status: recoveryPending ? 'recovery_pending' : 'completed', recoveryPending: recoveryPending, accessRecoveryPending: accessRecoveryPending, auditPending: auditPending, reconciled: reconciled, unavailable: unavailable, retired: retired, failed: failed, deferred: deferredEntries.length };
}

function releaseRecoveryFolderStage_(stage) {
  return ['release_folder_acl', 'release_folder_build', 'release_folder_compensation'].indexOf(safeString_(stage, 60, '')) !== -1;
}

function releaseOrphanRecoveryStage_(stage) {
  return ['compensation', 'document_build', 'workspace_commit'].indexOf(safeString_(stage, 60, '')) !== -1;
}

function inspectReleasedOrphanRecoveryScope_(workspace, scopedQueue, releasedFolderId) {
  hydrateReleaseRegistry_(workspace);
  var registered = {}, items = [], states = [], seenDocuments = {};
  var duplicateDocuments = 0, unavailableDocuments = 0, manualReviewCandidates = 0;
  for (var r = 0; r < (workspace.releaseRegistry || []).length; r++) registered[workspace.releaseRegistry[r].id] = true;
  for (var i = 0; i < (scopedQueue || []).length; i++) {
    var item = scopedQueue[i], stage = safeString_(item && item.stage, 60, ''), documentId = safeId_(item && item.documentId || '', false);
    if (!releaseOrphanRecoveryStage_(stage) || !documentId || registered[documentId]) continue;
    var key = releaseRecoveryItemKey_(item), idHash = hashText_('released_orphan|' + documentId).slice(0, 16);
    items.push({ key: key, documentId: documentId, stage: stage });
    if (seenDocuments[documentId]) {
      duplicateDocuments++;
      manualReviewCandidates++;
      states.push({ itemKeyHash: hashText_(key), documentIdHash: idHash, stage: stage, condition: 'duplicate_document' });
      continue;
    }
    seenDocuments[documentId] = true;
    var file;
    try { file = DriveApp.getFileById(documentId); }
    catch (lookupErr) {
      unavailableDocuments++;
      manualReviewCandidates++;
      states.push({ itemKeyHash: hashText_(key), documentIdHash: idHash, stage: stage, condition: 'unavailable' });
      continue;
    }
    try {
      if (!releasedFolderId || !file || typeof file.getId !== 'function' || typeof file.isTrashed !== 'function' || typeof file.getAccess !== 'function' || typeof file.getSharingPermission !== 'function') throw eeError_('acl_manual_review_required', 'The orphan recovery candidate state could not be inspected.');
      if (safeId_(file.getId(), true) !== documentId) throw eeError_('acl_manual_review_required', 'The orphan recovery candidate identity could not be verified.');
      var trashed = !!file.isTrashed(), acl = releasedDocAclSnapshot_(file, releasedFolderId);
      var principals = acl.viewers.concat(acl.editors), seenPrincipals = {}, directRoles = [];
      for (var p = 0; p < principals.length; p++) {
        var principal = normalizeEmail_(principals[p]);
        if (!principal || seenPrincipals[principal]) continue;
        seenPrincipals[principal] = true;
        directRoles.push({ principalHash: hashText_(principal), role: String(file.getAccess(principal)) });
      }
      directRoles.sort(function (left, right) { return left.principalHash < right.principalHash ? -1 : (left.principalHash > right.principalHash ? 1 : 0); });
      states.push({
        itemKeyHash: hashText_(key), documentIdHash: idHash, stage: stage, condition: trashed ? 'trashed' : 'verified',
        ownerHash: hashText_(acl.owner), expectedFolderHash: hashText_(releasedFolderId),
        sharingAccess: String(acl.sharingAccess), sharingPermission: String(file.getSharingPermission()), shareableByEditors: !!acl.shareableByEditors,
        viewerHashes: acl.viewers.map(function (email) { return hashText_(email); }),
        editorHashes: acl.editors.map(function (email) { return hashText_(email); }), directRoles: directRoles,
      });
      if (trashed) manualReviewCandidates++;
    } catch (custodyErr) {
      manualReviewCandidates++;
      states.push({ itemKeyHash: hashText_(key), documentIdHash: idHash, stage: stage, condition: 'custody_uninspectable' });
    }
  }
  items.sort(function (left, right) { return left.key < right.key ? -1 : (left.key > right.key ? 1 : 0); });
  states.sort(function (left, right) { return left.itemKeyHash < right.itemKeyHash ? -1 : (left.itemKeyHash > right.itemKeyHash ? 1 : 0); });
  var overLimit = items.length > EE_RELEASE_RECOVERY_MAX_ITEMS;
  return {
    items: items, candidateItems: items.length, candidateDocuments: Object.keys(seenDocuments).length,
    duplicateDocuments: duplicateDocuments, unavailableDocuments: unavailableDocuments,
    manualReviewCandidates: manualReviewCandidates, manualReviewRequired: overLimit || duplicateDocuments > 0 || manualReviewCandidates > 0,
    fingerprint: hashText_(JSON.stringify({ states: states, overLimit: overLimit })),
  };
}

function releaseRecoveryIssueSample_(category, value, occurrences) {
  return {
    category: category,
    occurrences: occurrences || 1,
    idFingerprint: hashText_(category + '|' + String(value || '')).slice(0, 16),
  };
}

function releaseRecoveryStageCategory_(stage) {
  stage = safeString_(stage, 60, '');
  if (releaseRecoveryFolderStage_(stage)) return 'folder_recovery';
  if (/^directory_/.test(stage)) return 'directory_recovery';
  if (stage === 'workspace_commit' || stage === 'acl_workspace_commit') return 'workspace_commit_recovery';
  if (stage === 'document_build' || stage === 'compensation') return 'orphan_recovery';
  if (stage === 'unreadable' || stage === 'queue_overflow') return 'recovery_metadata';
  return 'other_recovery_item';
}

function inspectReleasedRecoveryFolder_() {
  var props = PropertiesService.getScriptProperties();
  var repositoryFolderId = safeId_(props.getProperty('EE_FOLDER_ID') || '', false);
  var releasedFolderId = safeId_(props.getProperty('EE_RELEASED_FOLDER_ID') || '', false);
  if (!releasedFolderId) {
    return { configured: false, inspectable: true, manualReviewRequired: false, aclDrift: false, releasedFolderId: '', fingerprint: hashText_(JSON.stringify({ configured: false, repositoryFolderId: repositoryFolderId })) };
  }
  try {
    var folder = DriveApp.getFolderById(releasedFolderId);
    var acl = inspectPrivateDriveItemAcl_(folder, effectiveDriveOwnerEmail_());
    if (typeof folder.getParents !== 'function') throw eeError_('acl_manual_review_required', 'The released-summary folder parents could not be inspected.');
    var parents = folder.getParents(), parentIds = [];
    while (parents && parents.hasNext()) parentIds.push(String(parents.next().getId()));
    parentIds.sort();
    var state = {
      configured: true,
      repositoryFolderHash: hashText_(repositoryFolderId),
      releasedFolderHash: hashText_(releasedFolderId),
      parentHashes: parentIds.map(function (id) { return hashText_(id); }),
      expectedParent: parentIds.length === 1 && parentIds[0] === repositoryFolderId,
      acl: acl.fingerprintState,
    };
    var manualReviewRequired = !acl.fingerprintState.ownerMatches || acl.fingerprintState.trashed || !state.expectedParent;
    return {
      configured: true, inspectable: true, manualReviewRequired: manualReviewRequired,
      aclDrift: acl.drift, releasedFolderId: releasedFolderId,
      fingerprint: hashText_(JSON.stringify(state)),
    };
  } catch (folderErr) {
    return {
      configured: true, inspectable: false, manualReviewRequired: true, aclDrift: false,
      releasedFolderId: releasedFolderId,
      fingerprint: hashText_(JSON.stringify({ configured: true, repositoryFolderHash: hashText_(repositoryFolderId), releasedFolderHash: hashText_(releasedFolderId), inspectable: false })),
    };
  }
}

function inspectReleasedRecoveryCandidate_(entry, releasedFolderId) {
  var idHash = hashText_('released_document|' + entry.id).slice(0, 16);
  var status = safeString_(entry.status, 40, 'historical');
  var retirementRequired = ['retired', 'unavailable', 'retirement_pending'].indexOf(status) !== -1;
  var file;
  try { file = DriveApp.getFileById(entry.id); }
  catch (lookupErr) {
    return { idHash: idHash, available: false, trashed: false, retirementRequired: retirementRequired, manualReviewRequired: false, aclDrift: false, fingerprint: hashText_('unavailable|' + idHash + '|' + status) };
  }
  if (!releasedFolderId || typeof file.isTrashed !== 'function' || typeof file.getAccess !== 'function') {
    return { idHash: idHash, available: true, trashed: false, retirementRequired: retirementRequired, manualReviewRequired: true, aclDrift: false, fingerprint: hashText_('uninspectable|' + idHash + '|' + status) };
  }
  var trashed = !!file.isTrashed();
  retirementRequired = retirementRequired || trashed;
  var expected;
  try { expected = retirementRequired ? [] : releasedDocExpectedViewers_(entry.teacherId, false); }
  catch (expectedErr) {
    return { idHash: idHash, available: true, trashed: trashed, retirementRequired: retirementRequired, manualReviewRequired: true, aclDrift: false, fingerprint: hashText_('viewer_policy_unavailable|' + idHash + '|' + status) };
  }
  try {
    var acl = releasedDocAclSnapshot_(file, releasedFolderId);
    var exactViewerRoles = true, directRoles = [];
    for (var i = 0; i < expected.length; i++) {
      var role = file.getAccess(expected[i]);
      directRoles.push(String(role));
      if (role !== DriveApp.Permission.VIEW) exactViewerRoles = false;
    }
    var aclDrift = acl.sharingAccess !== DriveApp.Access.PRIVATE || acl.shareableByEditors || acl.editors.length > 0 || !sameEmailSet_(acl.viewers, expected) || !exactViewerRoles;
    return {
      idHash: idHash, available: true, trashed: trashed, retirementRequired: retirementRequired,
      manualReviewRequired: false, aclDrift: aclDrift,
      fingerprint: hashText_(JSON.stringify({ status: status, trashed: trashed, acl: acl, expected: expected, directRoles: directRoles })),
    };
  } catch (aclErr) {
    return { idHash: idHash, available: true, trashed: trashed, retirementRequired: retirementRequired, manualReviewRequired: true, aclDrift: false, fingerprint: hashText_('acl_uninspectable|' + idHash + '|' + status) };
  }
}

function releasedAccessRecoveryInspection_(teacherId) {
  teacherId = safeId_(teacherId || '', false);
  if (pendingCommitInspection_().pending) throw eeError_('commit_recovery_required', 'Complete the reviewed pending workspace commit before preparing released-summary access recovery.');
  var props = PropertiesService.getScriptProperties();
  var state = readWorkspaceState_({ skipPendingRecovery: true });
  if (pendingCommitInspection_().pending) throw eeError_('commit_recovery_required', 'Complete the reviewed pending workspace commit before preparing released-summary access recovery.');
  var workspace = state.workspace;
  hydrateReleaseRegistry_(workspace);
  var queueRaw = props.getProperty('EE_RELEASE_RECOVERY_REQUIRED') || '';
  var queue = readReleaseRecoveryQueue_();
  var registry = workspace.releaseRegistry || [];
  var byDocument = {};
  for (var r = 0; r < registry.length; r++) byDocument[registry[r].id] = registry[r].teacherId;
  var folderQueue = queue.filter(function (item) { return releaseRecoveryFolderStage_(item && item.stage); });
  var folderInspection = inspectReleasedRecoveryFolder_();
  var folderManualReviewRequired = !folderInspection.inspectable || folderInspection.manualReviewRequired;
  var folderAclRepairRequired = !!(folderInspection.configured && folderInspection.aclDrift && !folderManualReviewRequired && !folderQueue.length);
  if (teacherId && (folderQueue.length || folderManualReviewRequired || folderInspection.aclDrift)) throw eeError_('release_recovery_required', 'Folder-level released-summary recovery is pending. Review all released-summary access recovery instead of an educator-scoped pass.');
  var queueHasTeacher = queue.some(function (item) { return safeId_(item && item.teacherId || '', false) === teacherId; });
  if (teacherId && !findById_(workspace.teachers || [], teacherId) && !registry.some(function (entry) { return entry.teacherId === teacherId; }) && !queueHasTeacher) {
    throw eeError_('not_found', 'Educator release registry was not found.');
  }
  var queuedTeacherIds = queue.map(function (item) { return safeId_(item && item.teacherId || '', false); });
  var targetTeacherIds = teacherId ? [teacherId] : uniqueTeacherIds_(allReleasedTeacherIds_(workspace).concat(queuedTeacherIds));
  var wanted = {};
  for (var i = 0; i < targetTeacherIds.length; i++) wanted[targetTeacherIds[i]] = true;
  var targetEntries = registry.filter(function (entry) { return !!wanted[entry.teacherId]; });
  var scopedQueue = teacherId ? queue.filter(function (item) {
    var itemTeacher = safeId_(item && item.teacherId || '', false);
    var documentId = safeId_(item && item.documentId || '', false);
    return itemTeacher === teacherId || (!itemTeacher && documentId && byDocument[documentId] === teacherId);
  }) : queue.slice();
  var orphanInspection = inspectReleasedOrphanRecoveryScope_(workspace, scopedQueue, folderInspection.releasedFolderId);
  var sweepActive = queue.some(function (item) {
    if (safeString_(item && item.stage, 60, '') !== 'directory_acl_deferred') return false;
    var itemTeacher = safeId_(item && item.teacherId || '', false);
    return !teacherId || itemTeacher === teacherId;
  });
  var pendingEntries = targetEntries.filter(function (entry) { return entry.status === 'recovery_pending' || entry.status === 'retirement_pending'; });
  var candidates = sweepActive && pendingEntries.length ? pendingEntries : targetEntries;
  var batch = candidates.slice(0, EE_RELEASE_ACL_BATCH_SIZE);
  var deferred = candidates.slice(EE_RELEASE_ACL_BATCH_SIZE);
  var aclStates = [], issues = [], unavailable = 0, retirementCandidates = 0, batchRetirements = 0, aclDriftCount = 0, candidateManualReview = false;
  if (folderManualReviewRequired) issues.push(releaseRecoveryIssueSample_('manual_folder_review', folderInspection.releasedFolderId || 'configured'));
  else if (folderInspection.aclDrift) issues.push(releaseRecoveryIssueSample_('folder_acl_drift', folderInspection.releasedFolderId));
  for (var c = 0; c < candidates.length; c++) {
    if (['retired', 'unavailable', 'retirement_pending'].indexOf(candidates[c].status) !== -1) retirementCandidates++;
  }
  for (var a = 0; a < batch.length; a++) {
    var aclState = inspectReleasedRecoveryCandidate_(batch[a], folderInspection.releasedFolderId);
    aclStates.push(aclState);
    if (!aclState.available) {
      unavailable++;
      issues.push(releaseRecoveryIssueSample_('unavailable_document', batch[a].id));
    }
    if (aclState.retirementRequired) {
      batchRetirements++;
      if (['retired', 'unavailable', 'retirement_pending'].indexOf(batch[a].status) === -1) retirementCandidates++;
      issues.push(releaseRecoveryIssueSample_('retirement_candidate', batch[a].id));
    }
    if (aclState.aclDrift) {
      aclDriftCount++;
      issues.push(releaseRecoveryIssueSample_('acl_drift', batch[a].id));
    }
    if (aclState.manualReviewRequired) {
      candidateManualReview = true;
      issues.push(releaseRecoveryIssueSample_('manual_permission_review', batch[a].id));
    }
  }
  for (var q = 0; q < scopedQueue.length && issues.length < EE_SECONDARY_ISSUE_SAMPLE_MAX; q++) {
    issues.push(releaseRecoveryIssueSample_(releaseRecoveryStageCategory_(scopedQueue[q] && scopedQueue[q].stage), releaseRecoveryItemKey_(scopedQueue[q])));
  }
  if (deferred.length && issues.length < EE_SECONDARY_ISSUE_SAMPLE_MAX) issues.push(releaseRecoveryIssueSample_('deferred_batch', String(deferred.length), deferred.length));
  issues = issues.slice(0, EE_SECONDARY_ISSUE_SAMPLE_MAX);
  var ambiguousQueue = scopedQueue.some(function (item) { return ['unreadable', 'queue_overflow'].indexOf(safeString_(item && item.stage, 60, '')) !== -1; });
  if (orphanInspection.manualReviewRequired && issues.length < EE_SECONDARY_ISSUE_SAMPLE_MAX) {
    issues.push(releaseRecoveryIssueSample_('manual_orphan_review', String(orphanInspection.manualReviewCandidates) + '|' + String(orphanInspection.duplicateDocuments), orphanInspection.manualReviewCandidates || orphanInspection.duplicateDocuments));
  }
  var manualReviewRequired = ambiguousQueue || candidateManualReview || folderManualReviewRequired || orphanInspection.manualReviewRequired;
  var repairable = !manualReviewRequired;
  var counts = {
    targetEducators: targetTeacherIds.length, targetDocuments: targetEntries.length,
    batchDocuments: batch.length, deferredDocuments: deferred.length,
    queuedItems: scopedQueue.length, folderQueueItems: teacherId ? 0 : folderQueue.length + (folderAclRepairRequired ? 1 : 0),
    retirementCandidates: retirementCandidates, unavailableDocuments: unavailable,
    orphanQueueItems: orphanInspection.candidateItems, orphanCandidates: orphanInspection.candidateDocuments,
    orphanManualReviewCandidates: orphanInspection.manualReviewCandidates,
  };
  var effects = [];
  if (folderManualReviewRequired) effects.push('Do not change released-summary access until District IT verifies the managed folder owner, location, retention state, and permission visibility.');
  else if (!teacherId && folderQueue.length) effects.push('Repair or safely quarantine ' + folderQueue.length + ' reviewed released-summary folder recovery item' + (folderQueue.length === 1 ? '' : 's') + '.');
  if (folderAclRepairRequired) effects.push('Restore exact private, owner-only access on the reviewed released-summary folder before document reconciliation.');
  if (batch.length) effects.push('Reconcile exact private named-viewer access for ' + batch.length + ' released-summary document' + (batch.length === 1 ? '' : 's') + ' in this bounded pass.');
  if (batchRetirements) effects.push('Remove named access from ' + batchRetirements + ' retired, unavailable, or trashed document candidate' + (batchRetirements === 1 ? '' : 's') + ' in this bounded pass.');
  if (aclDriftCount) effects.push('Correct ' + aclDriftCount + ' reviewed document access polic' + (aclDriftCount === 1 ? 'y' : 'ies') + ' to exact private view-only grants.');
  if (orphanInspection.candidateDocuments && orphanInspection.manualReviewRequired) effects.push('Do not quarantine ' + orphanInspection.candidateDocuments + ' unregistered released-summary recovery file' + (orphanInspection.candidateDocuments === 1 ? '' : 's') + ' until District IT verifies exact owner, managed location, retention state, and permission visibility.');
  else if (orphanInspection.candidateDocuments) effects.push('Restore private owner-only access and move exactly ' + orphanInspection.candidateDocuments + ' reviewed unregistered released-summary recovery file' + (orphanInspection.candidateDocuments === 1 ? '' : 's') + ' to trash.');
  if (deferred.length) effects.push('Leave ' + deferred.length + ' document' + (deferred.length === 1 ? '' : 's') + ' queued for another reviewed bounded pass.');
  effects.push('Commit verified registry status and content-free audit milestones only after Drive access checks complete.');
  var scope = teacherId ? 'educator' : 'all';
  var directoryFingerprint = directoryFingerprint_();
  var registryFingerprint = hashText_(JSON.stringify(registry));
  var queueFingerprint = hashText_(queueRaw);
  var fingerprint = hashText_(JSON.stringify({
    scope: scope, teacherIdHash: teacherId ? hashText_(teacherId) : '', revision: state.revision,
    directory: directoryFingerprint, registry: registryFingerprint, queue: queueFingerprint,
    releasedFolder: folderInspection.fingerprint, acl: aclStates, orphanRecovery: orphanInspection.fingerprint,
  }));
  return {
    state: state, teacherId: teacherId, scope: scope, targetTeacherIds: targetTeacherIds,
    counts: counts, effects: effects, issueSamples: issues,
    repairable: repairable, manualReviewRequired: manualReviewRequired,
    fingerprint: fingerprint, recoveryPending: scopedQueue.length > 0 || pendingEntries.length > 0 || folderAclRepairRequired,
    folderInspection: folderInspection, folderAclRepairRequired: folderAclRepairRequired,
    orphanRecovery: orphanInspection,
  };
}

function reviewPortalReleasedEvaluationAccessRecovery(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId || '', false);
  var inspection = releasedAccessRecoveryInspection_(teacherId);
  var token = newId_('admin-review');
  var expiresAt = new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString();
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({
    actorEmail: actor.email, operation: 'released_access_recovery',
    teacherId: teacherId, scope: inspection.scope, revision: inspection.state.revision,
    fingerprint: inspection.fingerprint, orphanItems: inspection.orphanRecovery.items,
  }), EE_ADMIN_REVIEW_SECONDS);
  var review = {
    token: token, expiresAt: expiresAt, revision: inspection.state.revision, scope: inspection.scope,
    repairable: inspection.repairable, manualReviewRequired: inspection.manualReviewRequired,
    counts: inspection.counts, effects: inspection.effects, issueSamples: inspection.issueSamples,
  };
  return {
    ok: true,
    status: inspection.manualReviewRequired ? 'manual_review_required' : (inspection.recoveryPending ? 'recovery_pending' : 'none'),
    recoveryPending: inspection.recoveryPending,
    repairable: inspection.repairable, manualReviewRequired: inspection.manualReviewRequired,
    counts: inspection.counts, effects: inspection.effects, issueSamples: inspection.issueSamples,
    review: review,
  };
}

function reconcilePortalReleasedEvaluationAccess(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  if (request.acknowledgeAccessPolicy !== true) throw eeError_('acknowledgment_required', 'Confirm exact private named-viewer reconciliation before changing Drive access.');
  var token = safeId_(request.reviewToken || '', false);
  if (!token) throw eeError_('review_required', 'Review released-summary access recovery before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    assertNoAnnualRolloverRecovery_();
    var cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = cache.get(key), review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'released_access_recovery') throw eeError_('review_required', 'The released-summary access recovery review expired or was already used. Review it again.');
    var requestedTeacherId = safeId_(request.teacherId || '', false);
    if (request.teacherId !== undefined && requestedTeacherId !== safeId_(review.teacherId || '', false)) {
      cache.remove(key);
      throw eeError_('review_stale', 'The released-summary recovery scope changed after review. Review it again.');
    }
    var inspection;
    try { inspection = releasedAccessRecoveryInspection_(review.teacherId || ''); }
    catch (inspectionErr) {
      cache.remove(key);
      if (inspectionErr && inspectionErr.code === 'commit_recovery_required') throw eeError_('review_stale', 'Workspace commit recovery became pending after review. Complete integrity recovery, then review released-summary access again.');
      throw inspectionErr;
    }
    if (review.fingerprint !== inspection.fingerprint || Number(review.revision) !== Number(inspection.state.revision) || review.scope !== inspection.scope || JSON.stringify(review.orphanItems || []) !== JSON.stringify(inspection.orphanRecovery.items)) {
      cache.remove(key);
      throw eeError_('review_stale', 'Released-summary access recovery state changed after review. Review the current bounded scope again.');
    }
    cache.remove(key);
    if (!inspection.repairable) throw eeError_('manual_recovery_required', 'Released-summary recovery metadata or Drive permission state requires District IT review before automated access changes.');
    var teacherId = inspection.teacherId;
    var folderRecovery = { recovered: 0, failed: 0, skipped: !!teacherId };
    if (!teacherId) {
      if (inspection.folderAclRepairRequired) recordReleaseRecovery_({ at: nowIso_(), documentId: inspection.folderInspection.releasedFolderId, stage: 'release_folder_acl', actorEmail: actor.email });
      folderRecovery = recoverReleaseFolderQueue_();
      if (folderRecovery.failed) {
        return { ok: true, status: 'recovery_pending', recoveryPending: true, accessRecoveryPending: true, auditPending: false, reconciled: 0, unavailable: 0, retired: 0, failed: folderRecovery.failed, deferred: 0, folderRecovery: folderRecovery, recoveryItemsRemaining: readReleaseRecoveryQueue_().length };
      }
    }
    var state = inspection.state;
    clearCommittedReleaseRecovery_(state, teacherId);
    var result = reconcileReleasedDocsForTeachers_(state, inspection.targetTeacherIds, actor, 'administrator recovery', { allowGlobalRecovery: !teacherId, teacherId: teacherId, lock: lock });
    if (pendingCommitInspection_().pending) {
      result.status = 'recovery_pending';
      result.recoveryPending = true;
      result.accessRecoveryPending = true;
      result.auditPending = true;
      result.folderRecovery = folderRecovery;
      result.ok = true;
      result.recoveryItemsRemaining = readReleaseRecoveryQueue_().length;
      return result;
    }
    var refreshed = readWorkspaceState_({ skipPendingRecovery: true });
    clearCommittedReleaseRecovery_(refreshed, teacherId);
    var orphanRecovery = recoverReviewedOrphanedReleaseQueue_(refreshed.workspace, review.orphanItems || []);
    if (!teacherId && !result.accessRecoveryPending && !orphanRecovery.failed) clearGlobalReleaseRecoveryStages_(['acl_workspace_commit', 'directory_acl_dispatch']);
    var finalState = readWorkspaceState_({ skipPendingRecovery: true });
    var releaseRecoveryPending = releaseRecoveryRequiredForState_(finalState);
    var journal = readSecondaryRecoveryJournal_();
    var missingAuditRows = 0;
    try { missingAuditRows = secondaryIndexStatus_(finalState.workspace).missingAuditRows; }
    catch (secondaryErr) { missingAuditRows = 1; }
    var auditRepairPending = !!result.auditPending || journal.auditEntries.length > 0 || missingAuditRows > 0;
    var recoveryPending = releaseRecoveryPending || auditRepairPending;
    result.status = recoveryPending ? 'recovery_pending' : 'completed';
    result.recoveryPending = recoveryPending;
    result.accessRecoveryPending = releaseRecoveryPending;
    result.auditPending = auditRepairPending;
    result.quarantinedOrphans = orphanRecovery.quarantined;
    result.orphanRecoveryFailed = orphanRecovery.failed;
    result.folderRecovery = folderRecovery;
    result.ok = true;
    result.recoveryItemsRemaining = readReleaseRecoveryQueue_().length;
    return result;
  } finally { lock.releaseLock(); }
}

function assertUniqueTeacherMember_(candidate, members) {
  if (!candidate.active || candidate.role !== 'teacher') return;
  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    if (member.active && member.role === 'teacher' && member.teacherId === candidate.teacherId && member.email !== candidate.email) {
      throw eeError_('bad_member', 'That educator record is already linked to another active managed account. Deactivate the old account first.');
    }
  }
}

function portalAdminDirectory_(state) {
  state = state || readWorkspaceState_({ skipPendingRecovery: true });
  return {
    revision: state.revision,
    academicYear: safeString_(state.workspace.config && state.workspace.config.academicYear, 20, ''),
    educators: (state.workspace.teachers || []).map(function (teacher) {
      return { id: teacher.id, code: teacher.code, name: teacher.name, building: teacher.building, assignment: teacher.assignment, active: teacher.active !== false, dueDate: teacher.dueDate || '', finalized: !!teacher.finalizedAt };
    }),
    members: memberObjects_(),
    assignments: assignmentObjects_(),
  };
}

function getPortalAdminOperations() {
  requireAdmin_();
  return { ok: true, directory: portalAdminDirectory_() };
}

function reviewPortalDirectoryChange(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  var kind = oneOf_(request.kind, ['member', 'assignment'], 'directory change kind');
  var domain = PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN');
  var candidate = kind === 'member' ? normalizeMember_(request.candidate, domain) : normalizeAssignment_(request.candidate, domain);
  assertNoPendingWorkspaceCommit_();
  var state = readWorkspaceState_({ skipPendingRecovery: true });
  if (releaseRecoveryRequiredForState_(state)) throw eeError_('release_recovery_required', 'A prior released-summary access operation still needs administrator recovery before another directory change can be reviewed.');
  var directory = portalAdminDirectory_(state);
  var current = directoryCurrentRecord_(kind, candidate, directory);
  if (kind === 'member') {
    if (candidate.role === 'teacher' && !findById_(directory.educators, candidate.teacherId)) throw eeError_('bad_member', 'Teacher membership must reference an existing educator record.');
    assertUniqueTeacherMember_(candidate, directory.members);
  } else {
    if (!findById_(directory.educators, candidate.teacherId)) throw eeError_('bad_assignment', 'Assignment must reference an existing educator record.');
    var evaluatorFound = directory.members.some(function (member) { return member.active && member.email === candidate.evaluatorEmail && (member.role === 'evaluator' || member.role === 'admin'); });
    if (!evaluatorFound) throw eeError_('bad_assignment', 'Assignment must reference an active evaluator or administrator member.');
  }
  var scope = directoryReviewedScope_(state, kind, candidate, current);
  var token = newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({
    actorEmail: actor.email,
    operation: 'directory',
    kind: kind,
    candidate: candidate,
    current: current,
    currentHash: hashText_(JSON.stringify(current)),
    fingerprint: directoryFingerprint_(),
    revision: scope.revision,
    affectedTeacherIds: scope.affectedTeacherIds,
    affectedDocumentIds: scope.affectedDocumentIds,
    workspaceScopeFingerprint: scope.workspaceScopeFingerprint,
  }), EE_ADMIN_REVIEW_SECONDS);
  var impacts = kind === 'member' ? {
    removesPortalAccess: !!current && current.active && !candidate.active,
    changesRole: !!current && current.role !== candidate.role,
    activeEvaluatorAssignments: directory.assignments.filter(function (assignment) { return assignment.active && assignment.evaluatorEmail === candidate.email; }).length,
  } : {
    educatorName: (findById_(directory.educators, candidate.teacherId) || {}).name || candidate.teacherId,
    removesEvaluatorAccess: !!current && current.active && !candidate.active,
  };
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), kind: kind, action: current ? 'update' : 'create', current: current, candidate: candidate, impacts: impacts, affectedEducators: scope.affectedTeacherIds.length, affectedDocuments: scope.affectedDocumentIds.length } };
}

function performPortalDirectoryChange(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  if (request.acknowledgeImpact !== true) throw eeError_('acknowledgment_required', 'Confirm the membership or assignment impact before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    assertNoAnnualRolloverRecovery_();
    assertNoPendingWorkspaceCommit_();
    var token = safeId_(request.reviewToken || '', false);
    if (!token) throw eeError_('review_required', 'Review the directory change before applying it.');
    var cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = cache.get(key), review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'directory') throw eeError_('review_required', 'The directory review expired or was already used. Review the change again.');
    var workspaceState = readWorkspaceState_({ skipPendingRecovery: true }), workspace = workspaceState.workspace;
    if (releaseRecoveryRequiredForState_(workspaceState)) throw eeError_('release_recovery_required', 'A prior released-summary access operation still needs administrator recovery before another directory change.');
    var kind = oneOf_(review.kind, ['member', 'assignment'], 'directory change kind');
    var domain = PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN');
    var candidate = kind === 'member' ? normalizeMember_(review.candidate, domain) : normalizeAssignment_(review.candidate, domain);
    var directory = portalAdminDirectory_(workspaceState);
    var current = directoryCurrentRecord_(kind, candidate, directory);
    var scope = directoryReviewedScope_(workspaceState, kind, candidate, current);
    var staleScope = review.fingerprint !== directoryFingerprint_()
      || hashText_(JSON.stringify(current)) !== review.currentHash
      || Number(review.revision) !== Number(scope.revision)
      || !Array.isArray(review.affectedTeacherIds)
      || !Array.isArray(review.affectedDocumentIds)
      || JSON.stringify(review.affectedTeacherIds) !== JSON.stringify(scope.affectedTeacherIds)
      || JSON.stringify(review.affectedDocumentIds) !== JSON.stringify(scope.affectedDocumentIds)
      || review.workspaceScopeFingerprint !== scope.workspaceScopeFingerprint;
    if (staleScope) { cache.remove(key); throw eeError_('review_stale', 'Membership, assignments, workspace revision, or released-summary scope changed after review. Reload and review the exact directory impact again.'); }
    var affectedTeacherIds = review.affectedTeacherIds.slice();
    var affectedDocumentIds = review.affectedDocumentIds.slice();
    var directoryMutation = null, member = null, assignment = null;
    if (kind === 'member') {
      member = candidate;
      if (member.role === 'teacher' && !findById_(workspace.teachers || [], member.teacherId)) throw eeError_('bad_member', 'Teacher membership must reference an existing educator record.');
      assertUniqueTeacherMember_(member, directory.members);
      assertAdminInvariantAfterMember_(member);
    } else {
      assignment = candidate;
      if (!findById_(workspace.teachers || [], assignment.teacherId)) throw eeError_('bad_assignment', 'Assignment must reference an existing educator record.');
      var evaluatorFound = directory.members.some(function (memberRow) { return memberRow.active && memberRow.email === assignment.evaluatorEmail && (memberRow.role === 'evaluator' || memberRow.role === 'admin'); });
      if (!evaluatorFound) throw eeError_('bad_assignment', 'Assignment must reference an active evaluator or administrator member.');
    }
    cache.remove(key);
    if (kind === 'member') {
      recordDirectoryAclIntents_(affectedTeacherIds, actor);
      upsertMemberRow_(repositorySpreadsheet_(), member);
      directoryMutation = { teacherId: member.teacherId, event: 'MEMBER_UPDATED', summary: member.active ? 'Repository membership created or updated' : 'Repository membership deactivated', entityType: 'member', entityId: hashText_(member.email).slice(0, 20), version: 1 };
    } else {
      recordDirectoryAclIntents_(affectedTeacherIds, actor);
      upsertAssignmentRow_(repositorySpreadsheet_(), assignment);
      directoryMutation = { teacherId: assignment.teacherId, event: 'ASSIGNMENT_UPDATED', summary: assignment.active ? 'Evaluator assignment created or activated' : 'Evaluator assignment deactivated', entityType: 'assignment', entityId: assignment.teacherId, version: 1 };
    }
    var auditPending = appendDirectoryAuditBestEffort_(directoryMutation, actor);
    var access = reconcileDirectoryReleasedAccess_(workspaceState, affectedTeacherIds, actor, kind === 'member' ? 'a membership change' : 'an evaluator assignment change', affectedDocumentIds, lock);
    auditPending = auditPending || !!access.auditPending;
    return { ok: true, status: (access.recoveryPending || auditPending) ? 'recovery_pending' : access.status, recoveryPending: access.recoveryPending || auditPending, auditPending: auditPending, releasedSummaryAccess: access, directory: portalAdminDirectory_() };
  } finally { lock.releaseLock(); }
}

function scheduleTargets_(workspace, request) {
  var date = optionalDate_(request.dueDate);
  if (!date) throw eeError_('bad_request', 'A cycle due date is required.');
  var applyTo = oneOf_(request.applyTo || 'missing', ['missing', 'all_open'], 'schedule scope');
  var building = safeString_(request.building, 160, '');
  var targets = (workspace.teachers || []).filter(function (teacher) {
    return teacher.active !== false && !teacher.finalizedAt && (!building || teacher.building === building) && (applyTo === 'all_open' || !teacher.dueDate);
  });
  return { dueDate: date, applyTo: applyTo, building: building, targets: targets };
}

function reviewPortalCycleSchedule(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  assertNoPendingWorkspaceCommit_();
  var state = readWorkspaceState_({ skipPendingRecovery: true }), plan = scheduleTargets_(state.workspace, request);
  var token = newId_('admin-review');
  var targetIds = plan.targets.map(function (teacher) { return teacher.id; });
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({ actorEmail: actor.email, operation: 'schedule', revision: state.revision, dueDate: plan.dueDate, applyTo: plan.applyTo, building: plan.building, targetHash: hashText_(JSON.stringify(targetIds)) }), EE_ADMIN_REVIEW_SECONDS);
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), dueDate: plan.dueDate, applyTo: plan.applyTo, building: plan.building, affectedEducators: targetIds.length, skippedFinalized: (state.workspace.teachers || []).filter(function (teacher) { return teacher.active !== false && !!teacher.finalizedAt && (!plan.building || teacher.building === plan.building); }).length, sample: plan.targets.slice(0, 8).map(function (teacher) { return { id: teacher.id, code: teacher.code, name: teacher.name, previousDueDate: teacher.dueDate || '' }; }) } };
}

function performPortalCycleSchedule(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  if (request.acknowledgeImpact !== true) throw eeError_('acknowledgment_required', 'Confirm the cycle schedule impact before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    assertNoAnnualRolloverRecovery_();
    assertNoPendingWorkspaceCommit_();
    var token = safeId_(request.reviewToken || '', false), cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'schedule') throw eeError_('review_required', 'The schedule review expired or was already used. Review it again.');
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    if (Number(review.revision) !== Number(state.revision)) { cache.remove(key); throw eeError_('review_stale', 'The workspace changed after review. Reload and review the schedule again.'); }
    var plan = scheduleTargets_(state.workspace, review);
    var ids = plan.targets.map(function (teacher) { return teacher.id; });
    if (hashText_(JSON.stringify(ids)) !== review.targetHash) { cache.remove(key); throw eeError_('review_stale', 'The eligible educator set changed after review. Review the schedule again.'); }
    cache.remove(key);
    for (var i = 0; i < plan.targets.length; i++) plan.targets[i].dueDate = plan.dueDate;
    var auditEntry = appendWorkspaceAudit_(state.workspace, { event: 'CYCLE_SCHEDULE_UPDATED', summary: 'Administrator applied a reviewed cycle due-date schedule to ' + ids.length + ' educator records', entityType: 'cycle_schedule', entityId: 'schedule-' + plan.dueDate, version: 1 }, actor);
    var commit = writeWorkspaceState_(state.workspace, state.revision + 1, actor.email, lock), pending = !!commit.pending;
    var auditPending = false;
    if (!pending) { try { appendCanonicalAuditRow_(auditEntry); } catch (auditErr) { try { markWorkspaceIndexRecovery_(); } catch (markerErr) {} auditPending = true; } }
    return { ok: true, status: (pending || auditPending) ? 'recovery_pending' : 'completed', recoveryPending: pending || auditPending, auditPending: auditPending, dueDate: plan.dueDate, affectedEducators: ids.length, revision: state.revision + 1 };
  } finally { lock.releaseLock(); }
}

function workspaceConfigurationCandidate_(current, requestConfig) {
  current = sanitizeConfig_(current || {});
  requestConfig = requireObject_(requestConfig || {}, 'configuration');
  var profile = oneOf_(requestConfig.frameworkProfile || current.frameworkProfile || 'maine_pepg', ['pa_act13', 'maine_pepg', 'portland_me'], 'frameworkProfile');
  function proposed_(field) { return requestConfig[field] === undefined ? current[field] : requestConfig[field]; }
  return sanitizeConfig_({
    organization: proposed_('organization'),
    building: proposed_('building'),
    academicYear: proposed_('academicYear'),
    evaluatorName: proposed_('evaluatorName'),
    evaluatorInitials: proposed_('evaluatorInitials'),
    frameworkProfile: profile,
    pepgPracticeWeight: profile === 'maine_pepg' ? proposed_('pepgPracticeWeight') : null,
    aiReflectionEnabled: proposed_('aiReflectionEnabled'),
  });
}

function workspaceConfigurationChanges_(current, candidate) {
  var fields = [
    ['organization', 'Organization / LEA'],
    ['building', 'Default building'],
    ['academicYear', 'Academic year'],
    ['evaluatorName', 'Evaluator display name'],
    ['evaluatorInitials', 'Evaluator initials'],
    ['frameworkProfile', 'Evaluation framework'],
    ['pepgPracticeWeight', 'Professional Practice weight'],
    ['aiReflectionEnabled', 'AI reflection'],
  ];
  var profileNames = { pa_act13: 'Pennsylvania Act 13 (Danielson 2021)', maine_pepg: 'Maine PEPG (district plan governs)', portland_me: 'Portland ME (PEPG guidebook)' };
  function display_(field, value) {
    if (field === 'frameworkProfile') return profileNames[value] || String(value || 'Not set');
    if (field === 'aiReflectionEnabled') return value ? 'Allowed' : 'Off';
    if (field === 'pepgPracticeWeight') return value === null || value === undefined || value === '' ? 'Not set (district plan governs)' : String(value) + '%';
    return value === null || value === undefined || value === '' ? 'Not set' : String(value);
  }
  var changes = [];
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i][0];
    if (!same_(current[field], candidate[field])) changes.push({ field: field, label: fields[i][1], current: display_(field, current[field]), candidate: display_(field, candidate[field]) });
  }
  return changes;
}

function reviewPortalWorkspaceConfiguration(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  assertNoPendingWorkspaceCommit_();
  var state = readWorkspaceState_({ skipPendingRecovery: true });
  var current = sanitizeConfig_(state.workspace.config || {});
  var candidate = workspaceConfigurationCandidate_(current, request.config);
  var changes = workspaceConfigurationChanges_(current, candidate);
  if (!changes.length) throw eeError_('bad_request', 'Change at least one district setting before review.');
  var token = newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({
    actorEmail: actor.email,
    operation: 'configuration',
    revision: state.revision,
    currentHash: hashText_(JSON.stringify(current)),
    candidate: candidate,
  }), EE_ADMIN_REVIEW_SECONDS);
  var teachers = state.workspace.teachers || [];
  return { ok: true, review: {
    token: token,
    expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(),
    changes: changes,
    impacts: {
      activeEducators: teachers.filter(function (teacher) { return teacher.active !== false; }).length,
      openCycles: teachers.filter(function (teacher) { return teacher.active !== false && !teacher.finalizedAt; }).length,
      protectedSnapshots: teachers.filter(function (teacher) { return !!teacher.weightSnapshot || !!teacher.finalizedAt; }).length,
      frameworkOrWeightChange: changes.some(function (change) { return change.field === 'frameworkProfile' || change.field === 'pepgPracticeWeight'; }),
      finalizedRecordsRetainSnapshots: true,
    },
  } };
}

function performPortalWorkspaceConfiguration(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  if (request.acknowledgeImpact !== true) throw eeError_('acknowledgment_required', 'Confirm the district-wide configuration impact before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    assertNoAnnualRolloverRecovery_();
    assertNoPendingWorkspaceCommit_();
    var token = safeId_(request.reviewToken || '', false);
    var cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'configuration') throw eeError_('review_required', 'The configuration review expired or was already used. Review the settings again.');
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    var current = sanitizeConfig_(state.workspace.config || {});
    if (Number(review.revision) !== Number(state.revision) || review.currentHash !== hashText_(JSON.stringify(current))) {
      cache.remove(key);
      throw eeError_('review_stale', 'The workspace changed after review. Reload and review the district settings again.');
    }
    var candidate = sanitizeConfig_(review.candidate || {});
    var changes = workspaceConfigurationChanges_(current, candidate);
    if (!changes.length) { cache.remove(key); throw eeError_('review_stale', 'The reviewed settings already match the current workspace. Reload before making another change.'); }
    cache.remove(key);
    state.workspace.config = candidate;
    var auditEntry = appendWorkspaceAudit_(state.workspace, { event: 'CONFIGURATION_UPDATED', summary: 'Administrator applied ' + changes.length + ' reviewed district configuration change' + (changes.length === 1 ? '' : 's'), entityType: 'workspace_configuration', entityId: 'configuration', version: 1 }, actor);
    var nextRevision = state.revision + 1;
    var commit = writeWorkspaceState_(state.workspace, nextRevision, actor.email, lock), pending = !!commit.pending;
    var auditPending = false, configurationPending = false;
    if (!pending) {
      try { appendCanonicalAuditRow_(auditEntry); }
      catch (auditErr) { try { markWorkspaceIndexRecovery_(); } catch (markerErr) {} auditPending = true; }
      try { syncConfigurationIndex_(state.workspace); clearConfigurationRecovery_(); }
      catch (configurationErr) { try { markConfigurationRecovery_(); } catch (markerErr) {} configurationPending = true; }
    }
    return { ok: true, status: (pending || auditPending || configurationPending) ? 'recovery_pending' : 'completed', recoveryPending: pending || auditPending || configurationPending, auditPending: auditPending, configurationPending: configurationPending, revision: nextRevision, version: nextRevision, changes: changes, workspace: filterWorkspaceForActor_(state.workspace, actor) };
  } finally { lock.releaseLock(); }
}

function inspectManagedPrivateDriveItem_(item, expectedParentId, label) {
  label = safeString_(label, 120, 'Sensitive Drive item');
  expectedParentId = safeId_(expectedParentId, true);
  if (!item || typeof item.getParents !== 'function') throw eeError_('acl_manual_review_required', 'The ' + label + ' custody could not be inspected.');
  var acl;
  try { acl = inspectPrivateDriveItemAcl_(item, effectiveDriveOwnerEmail_()); }
  catch (inspectionErr) { throw eeError_('acl_manual_review_required', 'The ' + label + ' owner or access could not be inspected. District IT must verify Drive custody.'); }
  if (acl.manualReviewRequired) throw eeError_('acl_manual_review_required', 'The ' + label + ' is not owned by the deployment owner or is trashed. District IT must verify Drive custody.');
  var parents, parentIds = [];
  try {
    parents = item.getParents();
    if (!parents || typeof parents.hasNext !== 'function' || typeof parents.next !== 'function') throw new Error('parents');
    while (parents.hasNext()) parentIds.push(String(parents.next().getId()));
  } catch (parentErr) {
    throw eeError_('acl_manual_review_required', 'The ' + label + ' managed parent could not be inspected. District IT must verify Drive custody.');
  }
  parentIds.sort();
  if (parentIds.length !== 1 || parentIds[0] !== expectedParentId) throw eeError_('acl_manual_review_required', 'The ' + label + ' is outside its exact managed folder. District IT must verify Drive custody.');
  return { item: item, expectedParentId: expectedParentId, label: label, acl: acl };
}

function enforceManagedPrivateDriveInspection_(inspection) {
  if (!inspection.acl.drift) return inspection.item;
  try { setPrivate_(inspection.item); }
  catch (privacyErr) { throw eeError_('protection_failed', 'The ' + inspection.label + ' could not be made and verified private.'); }
  var verified = inspectManagedPrivateDriveItem_(inspection.item, inspection.expectedParentId, inspection.label);
  if (verified.acl.drift) throw eeError_('protection_failed', 'The ' + inspection.label + ' could not be made and verified private.');
  return inspection.item;
}

function configuredSensitiveFolder_(propertyKey, label) {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty(propertyKey);
  if (!id) return null;
  var folder;
  try { folder = DriveApp.getFolderById(id); }
  catch (lookupErr) { throw eeError_('not_found', 'The configured ' + label + ' folder is unavailable; no replacement was created.'); }
  return enforceManagedPrivateDriveInspection_(inspectManagedPrivateDriveItem_(folder, props.getProperty('EE_FOLDER_ID'), label + ' folder'));
}

function protectSensitiveFolderFiles_(folder, label) {
  if (!folder || typeof folder.getFiles !== 'function' || typeof folder.getId !== 'function') throw eeError_('protection_failed', 'The ' + label + ' folder contents could not be inspected for private access.');
  var props = PropertiesService.getScriptProperties();
  var folderInspection = inspectManagedPrivateDriveItem_(folder, props.getProperty('EE_FOLDER_ID'), label + ' folder');
  var files = folder.getFiles();
  if (!files || typeof files.hasNext !== 'function' || typeof files.next !== 'function') throw eeError_('protection_failed', 'The ' + label + ' folder contents could not be inspected for private access.');
  var fileInspections = [], folderId = safeId_(folder.getId(), true);
  while (files.hasNext()) {
    if (fileInspections.length >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) throw eeError_('acl_manual_review_required', 'The ' + label + ' folder exceeds the bounded custody inspection limit.');
    fileInspections.push(inspectManagedPrivateDriveItem_(files.next(), folderId, label + ' file'));
  }
  // Inspect every item's immutable custody first so an owner, trash, or parent
  // mismatch cannot cause a partial ACL mutation before the operation fails.
  enforceManagedPrivateDriveInspection_(folderInspection);
  for (var i = 0; i < fileInspections.length; i++) enforceManagedPrivateDriveInspection_(fileInspections[i]);
  return folder;
}

function inspectPrivateDriveItemAcl_(item, expectedOwner) {
  if (!item || typeof item.getId !== 'function' || typeof item.getOwner !== 'function' || typeof item.isTrashed !== 'function' || typeof item.getSharingAccess !== 'function' || typeof item.isShareableByEditors !== 'function' || typeof item.getViewers !== 'function' || typeof item.getEditors !== 'function') {
    throw eeError_('acl_manual_review_required', 'Google Drive did not expose enough permission detail to inspect Authorized exports.');
  }
  var id = safeId_(item.getId(), true), owner = driveUserEmail_(item.getOwner());
  if (!owner) throw eeError_('acl_manual_review_required', 'The owner of an Authorized exports item could not be identified.');
  function principals_(users) {
    if (!Array.isArray(users)) throw eeError_('acl_manual_review_required', 'Named access on an Authorized exports item could not be inspected.');
    var out = [];
    for (var i = 0; i < users.length; i++) {
      var email = driveUserEmail_(users[i]);
      if (!email) throw eeError_('acl_manual_review_required', 'A named Authorized exports principal could not be identified.');
      if (email !== expectedOwner) out.push(hashText_(email));
    }
    out.sort();
    return out;
  }
  var viewers = principals_(item.getViewers() || []), editors = principals_(item.getEditors() || []);
  var sharingAccess = item.getSharingAccess(), shareable = !!item.isShareableByEditors(), trashed = !!item.isTrashed(), ownerMatches = owner === expectedOwner;
  return {
    drift: !ownerMatches || trashed || sharingAccess !== DriveApp.Access.PRIVATE || shareable || viewers.length > 0 || editors.length > 0,
    manualReviewRequired: !ownerMatches || trashed,
    explicitAccessCount: viewers.length + editors.length,
    fingerprintState: {
      id: id, ownerHash: hashText_(owner), ownerMatches: ownerMatches, trashed: trashed,
      sharingAccess: String(sharingAccess), shareableByEditors: shareable,
      viewerHashes: viewers, editorHashes: editors,
    },
  };
}

function inspectAuthorizedExportsAcl_() {
  var configuredId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_AUTHORIZED_EXPORTS_FOLDER_ID') || '', false);
  if (!configuredId) {
    return {
      status: 'not_created', inspectable: true, manualReviewRequired: false,
      folderDrift: false, fileCount: 0, driftedFileCount: 0, explicitAccessCount: 0,
      inventoryFingerprint: hashText_(JSON.stringify([])),
      fingerprint: hashText_(JSON.stringify({ configured: false })),
    };
  }
  try {
    var expectedOwner = effectiveDriveOwnerEmail_(), folder = DriveApp.getFolderById(configuredId), folderAcl = inspectPrivateDriveItemAcl_(folder, expectedOwner);
    if (folderAcl.manualReviewRequired || typeof folder.getParents !== 'function') throw eeError_('acl_manual_review_required', 'The Authorized exports folder custody could not be verified.');
    var expectedParentId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_FOLDER_ID') || '', true);
    var folderParents = folder.getParents(), folderParentIds = [];
    while (folderParents && folderParents.hasNext()) folderParentIds.push(String(folderParents.next().getId()));
    folderParentIds.sort();
    if (folderParentIds.length !== 1 || folderParentIds[0] !== expectedParentId) throw eeError_('acl_manual_review_required', 'The Authorized exports folder is outside the managed repository.');
    folderAcl.fingerprintState.parentHashes = folderParentIds.map(function (id) { return hashText_(id); });
    if (typeof folder.getFiles !== 'function') throw eeError_('acl_manual_review_required', 'The Authorized exports folder contents could not be inspected.');
    var iterator = folder.getFiles();
    if (!iterator || typeof iterator.hasNext !== 'function' || typeof iterator.next !== 'function') throw eeError_('acl_manual_review_required', 'The Authorized exports folder contents could not be inspected.');
    var fileStates = [], fileIds = [], fileCount = 0, driftedFileCount = 0, explicitAccessCount = folderAcl.explicitAccessCount;
    while (iterator.hasNext()) {
      if (fileCount >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) throw eeError_('authorized_export_capacity_exceeded', 'The Authorized exports folder exceeds the bounded ACL inspection limit.');
      var exportFile = iterator.next(), fileAcl = inspectPrivateDriveItemAcl_(exportFile, expectedOwner);
      if (fileAcl.manualReviewRequired || typeof exportFile.getParents !== 'function') throw eeError_('acl_manual_review_required', 'Authorized export file custody could not be verified.');
      var fileParents = exportFile.getParents(), fileParentIds = [];
      while (fileParents && fileParents.hasNext()) fileParentIds.push(String(fileParents.next().getId()));
      fileParentIds.sort();
      if (fileParentIds.length !== 1 || fileParentIds[0] !== configuredId) throw eeError_('acl_manual_review_required', 'An Authorized export is outside its managed folder.');
      fileAcl.fingerprintState.parentHashes = fileParentIds.map(function (id) { return hashText_(id); });
      fileCount++;
      fileIds.push(fileAcl.fingerprintState.id);
      explicitAccessCount += fileAcl.explicitAccessCount;
      if (fileAcl.drift) driftedFileCount++;
      fileStates.push(fileAcl.fingerprintState);
    }
    fileStates.sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
    fileIds.sort();
    var fingerprint = hashText_(JSON.stringify({ configuredId: configuredId, folder: folderAcl.fingerprintState, files: fileStates }));
    var drift = folderAcl.drift || driftedFileCount > 0;
    return {
      status: drift ? 'drift_detected' : 'clean', inspectable: true, manualReviewRequired: false,
      folderDrift: folderAcl.drift, fileCount: fileCount, driftedFileCount: driftedFileCount,
      explicitAccessCount: explicitAccessCount, inventoryFingerprint: hashText_(JSON.stringify(fileIds)), fingerprint: fingerprint,
    };
  } catch (inspectionErr) {
    var capacityExceeded = !!inspectionErr && inspectionErr.code === 'authorized_export_capacity_exceeded';
    return {
      status: capacityExceeded ? 'capacity_exceeded' : 'manual_review_required', inspectable: false, manualReviewRequired: true,
      capacityExceeded: capacityExceeded, folderDrift: false,
      fileCount: capacityExceeded ? EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS + 1 : 0,
      driftedFileCount: 0, explicitAccessCount: 0,
      inventoryFingerprint: hashText_(JSON.stringify({ configuredId: configuredId, inspectable: false, capacityExceeded: capacityExceeded })),
      fingerprint: hashText_(JSON.stringify({ configuredId: configuredId, inspectable: false, capacityExceeded: capacityExceeded })),
    };
  }
}

function assertAuthorizedExportCapacity_(aclReview) {
  if (aclReview && (aclReview.capacityExceeded === true || (aclReview.inspectable && !aclReview.manualReviewRequired && Number(aclReview.fileCount) >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS))) {
    throw eeError_('acl_manual_review_required', 'The Authorized exports folder has reached the bounded ACL inspection limit. District IT must review retention and retire exports before another export.');
  }
}

function inspectRestoreRehearsalsAcl_() {
  var configuredId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_RESTORE_REHEARSALS_FOLDER_ID') || '', false);
  if (!configuredId) {
    return {
      status: 'not_created', inspectable: true, manualReviewRequired: false,
      folderDrift: false, fileCount: 0, driftedFileCount: 0, explicitAccessCount: 0,
      inventoryFingerprint: hashText_(JSON.stringify([])),
      fingerprint: hashText_(JSON.stringify({ configured: false })),
    };
  }
  try {
    var parentId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_FOLDER_ID') || '', true);
    var folder = DriveApp.getFolderById(configuredId);
    var folderInspection = inspectManagedPrivateDriveItem_(folder, parentId, 'Restore rehearsals folder');
    var iterator = folder.getFiles();
    if (!iterator || typeof iterator.hasNext !== 'function' || typeof iterator.next !== 'function') throw eeError_('acl_manual_review_required', 'The Restore rehearsals folder contents could not be inspected.');
    var fileStates = [], fileIds = [], fileCount = 0, driftedFileCount = 0;
    var explicitAccessCount = folderInspection.acl.explicitAccessCount;
    while (iterator.hasNext()) {
      if (fileCount >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) throw eeError_('restore_rehearsal_capacity_exceeded', 'The Restore rehearsals folder exceeds the bounded ACL inspection limit.');
      var rehearsalFile = iterator.next();
      var fileInspection = inspectManagedPrivateDriveItem_(rehearsalFile, configuredId, 'Restore rehearsal file');
      fileCount++;
      fileIds.push(fileInspection.acl.fingerprintState.id);
      explicitAccessCount += fileInspection.acl.explicitAccessCount;
      if (fileInspection.acl.drift) driftedFileCount++;
      fileStates.push(fileInspection.acl.fingerprintState);
    }
    fileStates.sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
    fileIds.sort();
    var drift = folderInspection.acl.drift || driftedFileCount > 0;
    return {
      status: drift ? 'drift_detected' : 'clean', inspectable: true, manualReviewRequired: false,
      folderDrift: folderInspection.acl.drift, fileCount: fileCount, driftedFileCount: driftedFileCount,
      explicitAccessCount: explicitAccessCount, inventoryFingerprint: hashText_(JSON.stringify(fileIds)),
      fingerprint: hashText_(JSON.stringify({ configuredId: configuredId, folder: folderInspection.acl.fingerprintState, files: fileStates })),
    };
  } catch (inspectionErr) {
    var capacityExceeded = !!inspectionErr && inspectionErr.code === 'restore_rehearsal_capacity_exceeded';
    return {
      status: capacityExceeded ? 'capacity_exceeded' : 'manual_review_required', inspectable: false, manualReviewRequired: true,
      capacityExceeded: capacityExceeded, folderDrift: false,
      fileCount: capacityExceeded ? EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS + 1 : 0,
      driftedFileCount: 0, explicitAccessCount: 0,
      inventoryFingerprint: hashText_(JSON.stringify({ configuredId: configuredId, inspectable: false, capacityExceeded: capacityExceeded })),
      fingerprint: hashText_(JSON.stringify({ configuredId: configuredId, inspectable: false, capacityExceeded: capacityExceeded })),
    };
  }
}

function assertRestoreRehearsalCapacity_(aclReview) {
  if (aclReview && (aclReview.capacityExceeded === true || (aclReview.inspectable && !aclReview.manualReviewRequired && Number(aclReview.fileCount) >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS))) {
    throw eeError_('acl_manual_review_required', 'The Restore rehearsals folder has reached the bounded ACL inspection limit. District IT must review retention and retire rehearsal candidates before another rehearsal.');
  }
}

function authorizedExportsFolder_() {
  var props = PropertiesService.getScriptProperties(), existing = configuredSensitiveFolder_('EE_AUTHORIZED_EXPORTS_FOLDER_ID', 'Authorized exports');
  if (existing) return existing;
  var parentId = safeId_(props.getProperty('EE_FOLDER_ID'), true);
  var folder = DriveApp.getFolderById(parentId).createFolder('Authorized exports');
  setPrivate_(folder);
  enforceManagedPrivateDriveInspection_(inspectManagedPrivateDriveItem_(folder, parentId, 'Authorized exports folder'));
  props.setProperty('EE_AUTHORIZED_EXPORTS_FOLDER_ID', folder.getId());
  return folder;
}

function csvCell_(value) { var text = String(sheetSafeCell_(String(value == null ? '' : value))); return '"' + text.replace(/"/g, '""') + '"'; }
function statusExportCsv_(workspace) {
  var rows = [['Staff code','Educator','Building','Assignment','Active','Cycle status','Due date','Finalized at']];
  (workspace.teachers || []).forEach(function (teacher) { rows.push([teacher.code,teacher.name,teacher.building,teacher.assignment,teacher.active !== false ? 'yes' : 'no',teacher.cycleStatus,teacher.dueDate || '',teacher.finalizedAt || '']); });
  return '\uFEFF' + rows.map(function (row) { return row.map(csvCell_).join(','); }).join('\r\n');
}

function educatorRecordExport_(workspace, teacherId) {
  var teacher = findById_(workspace.teachers || [], teacherId);
  if (!teacher) throw eeError_('not_found', 'Educator record not found.');
  return { teacher: teacher, walkthroughs: filterByTeacher_(workspace.walkthroughs || [], (function(){var x={};x[teacherId]=true;return x;})(), false), observations: filterByTeacher_(workspace.observations || [], (function(){var x={};x[teacherId]=true;return x;})(), false), spms: filterByTeacher_(workspace.spms || [], (function(){var x={};x[teacherId]=true;return x;})(), false), comments: filterByTeacher_(workspace.comments || [], (function(){var x={};x[teacherId]=true;return x;})(), false), audit: filterByTeacher_(workspace.audit || [], (function(){var x={};x[teacherId]=true;return x;})(), false), cycleSnapshots: filterByTeacher_(workspace.cycleSnapshots || [], (function(){var x={};x[teacherId]=true;return x;})(), false) };
}

/* Durable idempotency for export and restore-rehearsal artifacts. The journal
 * stores no workspace payload, but it binds a reviewed operation to the exact
 * source, output hash, managed folder, and canonical audit entry. */
var EE_ARTIFACT_OPERATION_JOURNAL_PROPERTY = 'EE_ARTIFACT_OPERATION_JOURNAL';
var EE_ARTIFACT_OPERATION_MAX_ITEMS = 6;
var EE_ARTIFACT_OPERATION_MAX_CHARS = 7800;
var EE_ARTIFACT_OPERATION_RECEIPT_SECONDS = EE_ADMIN_REVIEW_SECONDS + 300;

function artifactRecoveryRequiredError_() {
  var err = eeError_('artifact_recovery_required', 'The artifact outcome could not be confirmed. Do not start a new review. Repeat this exact reviewed confirmation, or ask district IT to inspect artifact recovery metadata.');
  err.recoveryPending = true;
  return err;
}

function artifactOperationKey_(kind, token) {
  return 'artifact_' + hashText_(safeToken_(kind, 40) + '|' + safeId_(token, true));
}

function artifactOperationHash_(value) {
  var hash = String(value || '');
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(hash)) throw eeError_('bad_request', 'Invalid artifact integrity hash.');
  return hash;
}

function artifactOperationEntryPayload_(raw) {
  raw = requireObject_(raw, 'artifact operation');
  var revision = Number(raw.revision);
  if (Math.floor(revision) !== revision || revision < 0) throw eeError_('bad_request', 'Invalid artifact source revision.');
  var kind = oneOf_(raw.kind, ['district_export','restore_rehearsal'], 'artifact operation');
  var scope = oneOf_(raw.scope, ['status_csv','educator_record','repository_backup','restore_rehearsal'], 'artifact scope');
  if ((kind === 'restore_rehearsal') !== (scope === 'restore_rehearsal')) throw eeError_('bad_request', 'Artifact operation scope is inconsistent.');
  var actorEmail = normalizeEmail_(raw.actorEmail), actorRole = String(raw.actorRole || '');
  if (!emailDomain_(actorEmail) || actorRole !== 'admin') throw eeError_('bad_request', 'Artifact actor metadata is invalid.');
  var stage = oneOf_(raw.stage, ['intent','file_created','audit_pending','completed','manual_review_required'], 'artifact recovery stage');
  var fileId = safeId_(raw.fileId || '', false), auditEntry = raw.auditEntry ? sanitizeAuditObject_(raw.auditEntry) : null;
  if ((stage === 'file_created' || stage === 'audit_pending' || stage === 'completed') && !fileId) throw eeError_('bad_request', 'Artifact recovery metadata is missing its file identifier.');
  if ((stage === 'audit_pending' || stage === 'completed') && !auditEntry) throw eeError_('bad_request', 'Artifact recovery metadata is missing its audit entry.');
  return {
    version: 1,
    key: safeId_(raw.key, true),
    reviewTokenHash: artifactOperationHash_(raw.reviewTokenHash),
    actorEmail: actorEmail,
    actorRole: actorRole,
    actorDisplayName: safeString_(raw.actorDisplayName, 160, actorEmail),
    kind: kind,
    revision: revision,
    scope: scope,
    purpose: safeString_(raw.purpose, 240, ''),
    sourceId: safeId_(raw.sourceId || '', false),
    sourceHash: artifactOperationHash_(raw.sourceHash),
    requestHash: artifactOperationHash_(raw.requestHash),
    folderId: safeId_(raw.folderId, true),
    fileName: safeString_(raw.fileName, 220, '', true),
    mime: safeString_(raw.mime, 100, '', true),
    contentHash: artifactOperationHash_(raw.contentHash),
    createdAt: optionalTimestamp_(raw.createdAt),
    updatedAt: optionalTimestamp_(raw.updatedAt),
    stage: stage,
    fileId: fileId,
    auditEntry: auditEntry,
  };
}

function sealArtifactOperationEntry_(raw) {
  var payload = artifactOperationEntryPayload_(raw);
  payload.integrityHash = hashText_(JSON.stringify(payload));
  return payload;
}

function readArtifactOperationJournal_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('EE_ARTIFACT_RECOVERY_MANUAL_REQUIRED')) return { version: 1, entries: [], ambiguous: true, unreadable: true };
  var raw = props.getProperty(EE_ARTIFACT_OPERATION_JOURNAL_PROPERTY);
  if (!raw) return { version: 1, entries: [], ambiguous: false, unreadable: false };
  try {
    var parsed = JSON.parse(raw);
    if (!isPlainObject_(parsed) || Number(parsed.version) !== 1 || !Array.isArray(parsed.entries) || parsed.entries.length > EE_ARTIFACT_OPERATION_MAX_ITEMS) throw new Error('shape');
    var entries = [], seen = {};
    for (var i = 0; i < parsed.entries.length; i++) {
      var sealed = sealArtifactOperationEntry_(parsed.entries[i]);
      if (sealed.integrityHash !== String(parsed.entries[i].integrityHash || '') || seen[sealed.key]) throw new Error('entry integrity');
      seen[sealed.key] = true; entries.push(sealed);
    }
    var at = optionalTimestamp_(parsed.at), expected = hashText_(JSON.stringify({ version: 1, at: at, entries: entries }));
    if (!at || expected !== String(parsed.integrityHash || '')) throw new Error('journal integrity');
    return { version: 1, at: at, entries: entries, ambiguous: false, unreadable: false };
  } catch (journalErr) {
    try { props.setProperty('EE_ARTIFACT_RECOVERY_MANUAL_REQUIRED', '1'); } catch (markerErr) {}
    return { version: 1, entries: [], ambiguous: true, unreadable: true };
  }
}

function artifactOperationReceiptEvictable_(entry, cutoffMillis) {
  if (!entry || entry.stage !== 'completed') return false;
  var completedAt = Date.parse(String(entry.updatedAt || entry.createdAt || ''));
  return isFinite(completedAt) && completedAt <= cutoffMillis;
}

function writeArtifactOperationJournal_(journal) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('EE_ARTIFACT_RECOVERY_MANUAL_REQUIRED')) throw eeError_('manual_recovery_required', 'Artifact recovery metadata requires manual review before another export or restore rehearsal.');
  var entries = (journal.entries || []).map(sealArtifactOperationEntry_);
  var receiptCutoff = Date.now() - EE_ARTIFACT_OPERATION_RECEIPT_SECONDS * 1000;
  while (entries.length > EE_ARTIFACT_OPERATION_MAX_ITEMS) {
    var removable = -1;
    for (var i = 0; i < entries.length; i++) if (artifactOperationReceiptEvictable_(entries[i], receiptCutoff)) { removable = i; break; }
    if (removable < 0) throw eeError_('busy', 'Recent artifact completion receipts are retained for exact replay. Wait before starting another export or restore rehearsal.');
    entries.splice(removable, 1);
  }
  var at = nowIso_(), stored = { version: 1, at: at, entries: entries };
  stored.integrityHash = hashText_(JSON.stringify(stored));
  var encoded = JSON.stringify(stored);
  while (encoded.length > EE_ARTIFACT_OPERATION_MAX_CHARS) {
    var completedIndex = -1;
    for (var j = 0; j < entries.length; j++) if (artifactOperationReceiptEvictable_(entries[j], receiptCutoff)) { completedIndex = j; break; }
    if (completedIndex < 0) throw eeError_('busy', 'Recent artifact completion receipts are retained for exact replay. Wait before starting another export or restore rehearsal.');
    entries.splice(completedIndex, 1); stored = { version: 1, at: at, entries: entries }; stored.integrityHash = hashText_(JSON.stringify(stored)); encoded = JSON.stringify(stored);
  }
  try {
    props.setProperty(EE_ARTIFACT_OPERATION_JOURNAL_PROPERTY, encoded);
    if (props.getProperty(EE_ARTIFACT_OPERATION_JOURNAL_PROPERTY) !== encoded) throw new Error('readback');
    var pending = entries.some(function (entry) { return entry.stage !== 'completed'; });
    if (pending) props.setProperty('EE_ARTIFACT_RECOVERY_REQUIRED', '1'); else props.deleteProperty('EE_ARTIFACT_RECOVERY_REQUIRED');
    return stored;
  } catch (writeErr) {
    try { props.setProperty('EE_ARTIFACT_RECOVERY_MANUAL_REQUIRED', '1'); } catch (markerErr) {}
    throw eeError_('manual_recovery_required', 'Artifact recovery metadata could not be persisted and verified. District IT must inspect the repository.');
  }
}

function upsertArtifactOperationEntry_(entry) {
  var journal = readArtifactOperationJournal_();
  if (journal.ambiguous) throw eeError_('manual_recovery_required', 'Artifact recovery metadata is unreadable or ambiguous. District IT must inspect it.');
  entry.updatedAt = nowIso_();
  var replaced = false;
  for (var i = 0; i < journal.entries.length; i++) if (journal.entries[i].key === entry.key) { journal.entries[i] = entry; replaced = true; break; }
  if (!replaced) journal.entries.push(entry);
  return writeArtifactOperationJournal_(journal);
}

function artifactOperationJournalEntry_(kind, token, actor) {
  var journal = readArtifactOperationJournal_();
  if (journal.ambiguous) throw eeError_('manual_recovery_required', 'Artifact recovery metadata is unreadable or ambiguous. District IT must inspect it.');
  var key = artifactOperationKey_(kind, token), entry = null;
  for (var i = 0; i < journal.entries.length; i++) {
    if (journal.entries[i].key === key) entry = journal.entries[i];
    else if (journal.entries[i].stage !== 'completed') throw artifactRecoveryRequiredError_();
  }
  if (entry && (entry.reviewTokenHash !== hashText_(token) || entry.kind !== kind || entry.actorEmail !== actor.email)) throw eeError_('review_required', 'This artifact review is unavailable for the current administrator.');
  if (entry && entry.stage === 'manual_review_required') throw eeError_('manual_recovery_required', 'This artifact operation is ambiguous and requires district IT review.');
  return entry;
}

function assertArtifactOperationReviewAvailable_() {
  var journal = readArtifactOperationJournal_();
  if (journal.ambiguous) throw eeError_('manual_recovery_required', 'Artifact recovery metadata is unreadable or ambiguous. District IT must inspect it.');
  for (var i = 0; i < journal.entries.length; i++) if (journal.entries[i].stage !== 'completed') throw artifactRecoveryRequiredError_();
}

function getPortalArtifactOperationOutcome(request) {
  var actor = requireAdmin_();
  request = requireObject_(request || {}, 'request');
  var kind = oneOf_(request.kind, ['district_export','restore_rehearsal'], 'artifact operation');
  var token = safeId_(request.reviewToken, true);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    var journal = readArtifactOperationJournal_();
    if (journal.ambiguous || journal.unreadable) return { ok: true, status: 'ambiguous' };
    var key = artifactOperationKey_(kind, token), entry = null, blocked = false;
    for (var i = 0; i < journal.entries.length; i++) {
      if (journal.entries[i].key === key) entry = journal.entries[i];
      else if (journal.entries[i].stage !== 'completed') blocked = true;
    }
    if (entry && (entry.reviewTokenHash !== hashText_(token) || entry.kind !== kind || entry.actorEmail !== actor.email || entry.actorRole !== 'admin')) {
      throw eeError_('review_required', 'This artifact review is unavailable for the current administrator.');
    }
    if (blocked) return { ok: true, status: 'blocked' };
    if (entry) return { ok: true, status: entry.stage === 'completed' ? 'completed' : (entry.stage === 'manual_review_required' ? 'ambiguous' : 'pending') };

    var expectedReviewOperation = kind === 'district_export' ? 'export' : 'restore_rehearsal';
    var raw = CacheService.getScriptCache().get(adminReviewCacheKey_(token)), review = null;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    var reviewUsable = !!review && isPlainObject_(review) && review.actorEmail === actor.email && review.operation === expectedReviewOperation;
    return { ok: true, status: 'not_started', reviewUsable: reviewUsable };
  } finally { lock.releaseLock(); }
}

function artifactOperationRequestHash_(entry) {
  return hashText_(JSON.stringify({
    actorEmail: entry.actorEmail, actorRole: entry.actorRole, kind: entry.kind,
    revision: entry.revision, scope: entry.scope, purpose: entry.purpose || '',
    sourceId: entry.sourceId || '', sourceHash: entry.sourceHash, folderId: entry.folderId,
  }));
}

function artifactOperationFolder_(entry) {
  var props = PropertiesService.getScriptProperties();
  var propertyKey = entry.kind === 'district_export' ? 'EE_AUTHORIZED_EXPORTS_FOLDER_ID' : 'EE_RESTORE_REHEARSALS_FOLDER_ID';
  if (safeId_(props.getProperty(propertyKey) || '', false) !== entry.folderId) throw eeError_('manual_recovery_required', 'The managed artifact folder changed after the operation began. District IT must inspect recovery metadata.');
  var folder;
  try { folder = DriveApp.getFolderById(entry.folderId); } catch (lookupErr) { throw eeError_('manual_recovery_required', 'The managed artifact folder is unavailable. District IT must inspect recovery metadata.'); }
  try {
    var acl = inspectPrivateDriveItemAcl_(folder, effectiveDriveOwnerEmail_());
    if (acl.manualReviewRequired || typeof folder.getParents !== 'function') throw new Error('custody');
    var parents = folder.getParents(), parentIds = [];
    while (parents && parents.hasNext()) parentIds.push(String(parents.next().getId()));
    if (parentIds.length !== 1 || parentIds[0] !== safeId_(props.getProperty('EE_FOLDER_ID'), true)) throw new Error('parent');
    if (acl.drift) {
      try { setPrivate_(folder); } catch (privacyErr) { throw artifactRecoveryRequiredError_(); }
      acl = inspectPrivateDriveItemAcl_(folder, effectiveDriveOwnerEmail_());
      if (acl.drift || acl.manualReviewRequired) throw new Error('privacy');
    }
    return folder;
  } catch (custodyErr) {
    if (custodyErr && custodyErr.code === 'artifact_recovery_required') throw custodyErr;
    throw eeError_('manual_recovery_required', 'The managed artifact folder no longer has exact private repository custody. District IT must inspect it.');
  }
}

function artifactOperationFile_(folder, entry) {
  var files, matches = [], inspected = 0;
  try { files = folder.getFiles(); } catch (listErr) { throw eeError_('manual_recovery_required', 'Artifact recovery could not inspect the managed folder.'); }
  if (!files || typeof files.hasNext !== 'function' || typeof files.next !== 'function') throw eeError_('manual_recovery_required', 'Artifact recovery could not inspect the managed folder.');
  while (files.hasNext()) {
    if (inspected++ >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) throw eeError_('manual_recovery_required', 'The managed artifact folder exceeds the bounded recovery inspection limit.');
    var candidate = files.next(), candidateId = String(candidate.getId()), candidateName = typeof candidate.getName === 'function' ? String(candidate.getName()) : '';
    if (candidateName === entry.fileName || (entry.fileId && candidateId === entry.fileId)) matches.push(candidate);
  }
  if (!matches.length) {
    if (entry.stage !== 'intent') throw eeError_('manual_recovery_required', 'The journaled artifact file is missing from its managed folder.');
    return null;
  }
  if (matches.length !== 1) throw eeError_('manual_recovery_required', 'Artifact recovery found multiple files matching one reviewed operation.');
  var file = matches[0], fileId = String(file.getId());
  if ((entry.fileId && fileId !== entry.fileId) || (typeof file.getName !== 'function') || String(file.getName()) !== entry.fileName) throw eeError_('manual_recovery_required', 'The journaled artifact identity no longer matches Drive.');
  var raw;
  try { raw = file.getBlob().getDataAsString('UTF-8'); } catch (readErr) { throw eeError_('manual_recovery_required', 'The journaled artifact content could not be verified.'); }
  if (hashText_(raw) !== entry.contentHash) throw eeError_('manual_recovery_required', 'The journaled artifact content hash does not match Drive.');
  try {
    var owner = effectiveDriveOwnerEmail_(), acl = inspectPrivateDriveItemAcl_(file, owner);
    if (acl.manualReviewRequired || typeof file.getParents !== 'function') throw new Error('custody');
    var parents = file.getParents(), parentIds = [];
    while (parents && parents.hasNext()) parentIds.push(String(parents.next().getId()));
    if (parentIds.length !== 1 || parentIds[0] !== entry.folderId) throw new Error('parent');
    if (acl.drift) {
      try { setPrivate_(file); } catch (privacyErr) { throw artifactRecoveryRequiredError_(); }
      acl = inspectPrivateDriveItemAcl_(file, owner);
      if (acl.drift || acl.manualReviewRequired) throw new Error('privacy');
    }
  } catch (custodyErr) {
    if (custodyErr && custodyErr.code === 'artifact_recovery_required') throw custodyErr;
    throw eeError_('manual_recovery_required', 'The journaled artifact no longer has exact private managed custody.');
  }
  return file;
}

function verifyJournaledArtifactFilesInFolder_(kind, folder) {
  var journal = readArtifactOperationJournal_();
  if (journal.ambiguous) throw eeError_('manual_recovery_required', 'Artifact recovery metadata is unreadable or ambiguous. District IT must inspect it.');
  var folderId = safeId_(folder && folder.getId ? folder.getId() : '', true);
  for (var i = 0; i < journal.entries.length; i++) {
    var entry = journal.entries[i];
    if (entry.kind !== kind) continue;
    if (entry.folderId !== folderId || !entry.fileId) throw eeError_('manual_recovery_required', 'A journaled artifact is outside its exact managed folder or has an incomplete identity.');
    try { artifactOperationFile_(folder, entry); }
    catch (verificationErr) {
      if (entry.stage === 'completed' && verificationErr && verificationErr.code === 'artifact_recovery_required') {
        throw eeError_('protection_failed', 'A completed journaled artifact could not be made and verified private. No new artifact was created.');
      }
      throw verificationErr;
    }
  }
  return folder;
}

function artifactOperationContent_(entry) {
  var content;
  if (entry.kind === 'district_export') {
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    if (Number(state.revision) !== Number(entry.revision)) throw eeError_('manual_recovery_required', 'The reviewed export source changed before its artifact could be confirmed.');
    var source = entry.scope === 'educator_record' ? educatorRecordExport_(state.workspace, entry.sourceId) : state.workspace;
    if (hashText_(JSON.stringify(source)) !== entry.sourceHash) throw eeError_('manual_recovery_required', 'The reviewed export source hash changed before its artifact could be confirmed.');
    if (entry.scope === 'status_csv') content = statusExportCsv_(state.workspace);
    else content = JSON.stringify({ kind: 'alloflow-educator-evaluation-authorized-export', version: 1, scope: entry.scope, purpose: entry.purpose, exportedAt: entry.createdAt, exportedBy: entry.actorEmail, sourceRevision: entry.revision, payloadHash: entry.sourceHash, payload: source });
  } else {
    var live = readWorkspaceState_({ skipPendingRecovery: true });
    if (Number(live.revision) !== Number(entry.revision)) throw eeError_('manual_recovery_required', 'The live workspace changed before the restore rehearsal artifact could be confirmed.');
    var archiveFile = annualArchiveFileById_(entry.sourceId), check = verifiedAnnualArchive_(archiveFile);
    if (!check.verified || check.sha256 !== entry.sourceHash) throw eeError_('manual_recovery_required', 'The reviewed archive changed before the restore rehearsal artifact could be confirmed.');
    content = JSON.stringify({ kind: 'alloflow-educator-evaluation-restore-rehearsal', version: 1, createdAt: entry.createdAt, createdBy: entry.actorEmail, sourceArchiveId: entry.sourceId, sourceArchiveHash: entry.sourceHash, liveRevisionAtReview: entry.revision, liveWorkspaceChanged: false, candidateWorkspace: check.envelope.workspace });
  }
  if (hashText_(content) !== entry.contentHash) throw eeError_('manual_recovery_required', 'The reconstructed artifact does not match the verified journal intent.');
  return content;
}

function artifactOperationAuditStatus_(entry) {
  var expected = normalizeSecondaryRow_('audit', expectedAuditIndexRow_(entry.auditEntry));
  var auditRows = auditLedgerRows_();
  var rows = auditLedgerRowsForId_(auditRows, entry.auditEntry.id);
  if (rows.length > 1 || (rows.length === 1 && !same_(rows[0], expected))) throw eeError_('manual_recovery_required', 'The canonical artifact audit entry is duplicated or mismatched.');
  if (rows.length === 1) {
    var chain = auditChainStatus_(auditRows);
    if (chain.ok !== true) throw eeError_('manual_recovery_required', 'The audit chain is not intact, so artifact recovery was refused.');
    return 'canonical';
  }
  var recovery = readSecondaryRecoveryJournal_(), found = 0;
  if (recovery.unreadable || recovery.manualReviewRequired) throw eeError_('manual_recovery_required', 'Audit recovery metadata is ambiguous, so artifact recovery was refused.');
  for (var i = 0; i < recovery.auditEntries.length; i++) if (recovery.auditEntries[i].id === entry.auditEntry.id) {
    found++;
    if (!same_(normalizeSecondaryRow_('audit', expectedAuditIndexRow_(recovery.auditEntries[i])), expected)) throw eeError_('manual_recovery_required', 'The queued artifact audit entry does not match its verified intent.');
  }
  if (found > 1) throw eeError_('manual_recovery_required', 'The artifact audit recovery entry is duplicated.');
  return found === 1 ? 'pending' : 'missing';
}

function artifactOperationResponse_(entry, file, idempotent, auditPending) {
  var pending = auditPending === true;
  var result = { ok: true, status: pending ? 'recovery_pending' : 'completed', recoveryPending: pending, auditPending: pending, idempotent: idempotent === true };
  if (entry.kind === 'district_export') result.export = { id: entry.fileId, url: annualArchiveUrl_(file), scope: entry.scope, createdAt: entry.createdAt, private: true, sha256: entry.contentHash };
  else { result.liveWorkspaceChanged = false; result.candidate = { id: entry.fileId, url: annualArchiveUrl_(file), createdAt: entry.createdAt, sha256: entry.contentHash }; }
  return result;
}

function completeArtifactOperation_(entry, actor, initialContent, idempotent) {
  if (entry.actorEmail !== actor.email || entry.actorRole !== 'admin' || artifactOperationRequestHash_(entry) !== entry.requestHash) throw eeError_('manual_recovery_required', 'Artifact recovery metadata is inconsistent with the reviewed operation.');
  var folder = artifactOperationFolder_(entry), file = artifactOperationFile_(folder, entry);
  if (!file) {
    var content = initialContent === undefined ? artifactOperationContent_(entry) : String(initialContent);
    if (hashText_(content) !== entry.contentHash) throw eeError_('manual_recovery_required', 'The artifact content does not match its verified journal intent.');
    try {
      file = folder.createFile(entry.fileName, content, entry.mime);
      setPrivate_(file);
      file = artifactOperationFile_(folder, entry);
    } catch (createErr) {
      if (createErr && createErr.code === 'manual_recovery_required') throw createErr;
      throw artifactRecoveryRequiredError_();
    }
  }
  if (!entry.fileId) {
    entry.fileId = safeId_(file.getId(), true); entry.stage = 'file_created'; upsertArtifactOperationEntry_(entry);
  }
  if (!entry.auditEntry) {
    var mutation = entry.kind === 'district_export'
      ? { teacherId: entry.scope === 'educator_record' ? entry.sourceId : '', event: 'DISTRICT_EXPORT_CREATED', summary: 'Reviewed private district export created for authorized purpose: ' + entry.purpose, entityType: 'district_export', entityId: entry.fileId, version: 1 }
      : { teacherId: '', event: 'RESTORE_REHEARSAL_CREATED', summary: 'Verified private restore rehearsal created without changing the live workspace', entityType: 'restore_rehearsal', entityId: entry.fileId, version: 1 };
    entry.auditEntry = canonicalAuditEntry_(mutation, { email: entry.actorEmail, role: entry.actorRole, displayName: entry.actorDisplayName });
    entry.stage = 'audit_pending'; upsertArtifactOperationEntry_(entry);
  } else if (entry.stage === 'file_created') {
    entry.stage = 'audit_pending'; upsertArtifactOperationEntry_(entry);
  }
  var auditStatus = artifactOperationAuditStatus_(entry);
  if (entry.stage === 'completed' && auditStatus !== 'canonical') throw eeError_('manual_recovery_required', 'A completed artifact no longer has its exact canonical audit entry.');
  if (auditStatus === 'missing') {
    try { appendCanonicalAuditRow_(entry.auditEntry); }
    catch (auditErr) {
      try { recordOperationAuditRecovery_(entry.auditEntry); } catch (recoveryErr) {}
    }
    auditStatus = artifactOperationAuditStatus_(entry);
  }
  if (auditStatus === 'canonical') {
    if (entry.stage !== 'completed') { entry.stage = 'completed'; upsertArtifactOperationEntry_(entry); }
    return artifactOperationResponse_(entry, file, idempotent, false);
  }
  return artifactOperationResponse_(entry, file, idempotent, true);
}

function reviewPortalDistrictExport(request) {
  var actor = requireAdmin_(); assertNoAnnualRolloverRecovery_(); request = requireObject_(request || {}, 'request');
  var scope = oneOf_(request.scope, ['status_csv','educator_record','repository_backup'], 'export scope');
  var purpose = safeString_(request.purpose, 240, '', true), teacherId = scope === 'educator_record' ? safeId_(request.teacherId, true) : '';
  if (pendingCommitInspection_().pending) throw eeError_('commit_recovery_required', 'Complete the reviewed pending workspace commit before preparing a district export.');
  assertArtifactOperationReviewAvailable_();
  var state = readWorkspaceState_({ skipPendingRecovery: true }), teacher = teacherId ? findById_(state.workspace.teachers || [], teacherId) : null;
  if (teacherId && !teacher) throw eeError_('not_found', 'Educator record not found.');
  var aclReview = inspectAuthorizedExportsAcl_();
  assertAuthorizedExportCapacity_(aclReview);
  var token = newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({ actorEmail: actor.email, operation: 'export', revision: state.revision, scope: scope, purpose: purpose, teacherId: teacherId, authorizedExportsAclFingerprint: aclReview.fingerprint, authorizedExportsInventoryFingerprint: aclReview.inventoryFingerprint }), EE_ADMIN_REVIEW_SECONDS);
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), scope: scope, purpose: purpose, teacherId: teacherId, educatorName: teacher ? teacher.name : '', recordCounts: annualRolloverCounts_(state.workspace).records, activeEducators: (state.workspace.teachers || []).filter(function (item) { return item.active !== false; }).length, destination: 'Private Authorized exports folder in the deployment owner\'s Drive', authorizedExportsAcl: aclReview } };
}

function performPortalDistrictExport(request) {
  var actor = requireAdmin_(); assertNoAnnualRolloverRecovery_({ allowArtifactRecovery: true }); request = requireObject_(request || {}, 'request');
  if (request.acknowledgePolicy !== true) throw eeError_('acknowledgment_required', 'Confirm district export policy, purpose, destination, retention, and legal-hold handling.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    assertNoAnnualRolloverRecovery_({ allowArtifactRecovery: true });
    actor = requireSameAdminLocked_(actor);
    if (pendingCommitInspection_().pending) throw eeError_('commit_recovery_required', 'Complete the reviewed pending workspace commit before confirming a district export.');
    var token = safeId_(request.reviewToken || '', false), cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    if (!token) throw eeError_('review_required', 'Review the export before confirming it.');
    var existingOperation = artifactOperationJournalEntry_('district_export', token, actor);
    if (existingOperation) return completeArtifactOperation_(existingOperation, actor, undefined, true);
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'export') throw eeError_('review_required', 'The export review expired or was already used. Review it again.');
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    if (Number(review.revision) !== Number(state.revision)) { cache.remove(key); throw eeError_('review_stale', 'The workspace changed after review. Reload and review the export again.'); }
    var aclReview = inspectAuthorizedExportsAcl_();
    if (review.authorizedExportsAclFingerprint !== aclReview.fingerprint) { cache.remove(key); throw eeError_('review_stale', 'Authorized exports access changed after review. Review the export again.'); }
    if (review.authorizedExportsInventoryFingerprint !== aclReview.inventoryFingerprint) { cache.remove(key); throw eeError_('review_stale', 'The reviewed Authorized exports file inventory changed. Review the export again.'); }
    if (!aclReview.inspectable || aclReview.manualReviewRequired) { cache.remove(key); throw eeError_('acl_manual_review_required', 'Authorized exports access could not be safely inspected. District IT must review Drive custody before exporting.'); }
    assertAuthorizedExportCapacity_(aclReview);
    var exportFolder = authorizedExportsFolder_();
    try { protectSensitiveFolderFiles_(exportFolder, 'Authorized exports'); }
    catch (protectionErr) {
      var afterProtectionFailure = inspectAuthorizedExportsAcl_();
      if (afterProtectionFailure.inspectable && review.authorizedExportsInventoryFingerprint !== afterProtectionFailure.inventoryFingerprint) {
        cache.remove(key);
        throw eeError_('review_stale', 'The reviewed Authorized exports file inventory changed during protection. No new export was created; review it again.');
      }
      throw protectionErr;
    }
    var protectedAcl = inspectAuthorizedExportsAcl_();
    if (!protectedAcl.inspectable || protectedAcl.manualReviewRequired) throw eeError_('acl_manual_review_required', 'Authorized exports access could not be safely re-verified after protection.');
    if (protectedAcl.folderDrift || protectedAcl.driftedFileCount > 0) throw eeError_('protection_failed', 'Authorized exports could not be made and verified private; no new export was created.');
    if (review.authorizedExportsInventoryFingerprint !== protectedAcl.inventoryFingerprint) { cache.remove(key); throw eeError_('review_stale', 'The reviewed Authorized exports file inventory changed during protection. No new export was created; review it again.'); }
    assertAuthorizedExportCapacity_(protectedAcl);
    var content, extension, mime, source = review.scope === 'educator_record' ? educatorRecordExport_(state.workspace, review.teacherId) : state.workspace;
    var sourceHash = hashText_(JSON.stringify(source)), createdAt = nowIso_();
    if (review.scope === 'status_csv') { content = statusExportCsv_(state.workspace); extension = '.csv'; mime = 'text/csv'; }
    else {
      var envelope = { kind: 'alloflow-educator-evaluation-authorized-export', version: 1, scope: review.scope, purpose: review.purpose, exportedAt: createdAt, exportedBy: actor.email, sourceRevision: state.revision, payloadHash: sourceHash, payload: source };
      content = JSON.stringify(envelope); extension = '.json'; mime = MimeType.PLAIN_TEXT;
    }
    var operationKey = artifactOperationKey_('district_export', token);
    var entry = {
      key: operationKey, reviewTokenHash: hashText_(token), actorEmail: actor.email, actorRole: actor.role,
      actorDisplayName: actor.displayName || actor.email, kind: 'district_export', revision: state.revision,
      scope: review.scope, purpose: review.purpose, sourceId: review.teacherId || '', sourceHash: sourceHash,
      folderId: exportFolder.getId(), fileName: 'educator-evaluation-' + review.scope.replace(/_/g,'-') + '-' + createdAt.slice(0,10) + '-' + operationKey.slice(0,16) + extension,
      mime: mime, contentHash: hashText_(content), createdAt: createdAt, updatedAt: createdAt, stage: 'intent', fileId: '', auditEntry: null,
    };
    entry.requestHash = artifactOperationRequestHash_(entry);
    upsertArtifactOperationEntry_(entry);
    cache.remove(key);
    return completeArtifactOperation_(entry, actor, content, false);
  } finally { lock.releaseLock(); }
}

function verifiedAnnualArchive_(file, expectedFolderId) {
  expectedFolderId = safeId_(expectedFolderId || PropertiesService.getScriptProperties().getProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID') || '', true);
  enforceManagedPrivateDriveInspection_(inspectManagedPrivateDriveItem_(file, expectedFolderId, 'Annual archive file'));
  var raw;
  try {
    if (!file || typeof file.getBlob !== 'function') throw new Error('blob');
    var blob = file.getBlob();
    if (!blob || typeof blob.getDataAsString !== 'function') throw new Error('content');
    raw = blob.getDataAsString('UTF-8');
  } catch (readErr) {
    throw eeError_('archive_verification_failed', 'The annual archive content could not be read and verified.');
  }
  var envelope;
  try { envelope = JSON.parse(raw); } catch (parseErr) { envelope = null; }
  var verified = !!envelope && envelope.kind === 'alloflow-educator-evaluation-annual-archive' && envelope.workspaceHash === hashText_(JSON.stringify(envelope.workspace));
  return { verified: verified, envelope: verified ? envelope : null, sha256: hashText_(raw) };
}

function annualArchiveFileById_(archiveId) {
  archiveId = safeId_(archiveId, true);
  var folder = configuredSensitiveFolder_('EE_ANNUAL_ARCHIVES_FOLDER_ID', 'Annual archives');
  if (!folder) throw eeError_('not_found', 'The selected annual archive is unavailable.');
  var files = folder.getFiles(), inspected = 0;
  while (files.hasNext()) {
    if (inspected >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) {
      throw eeError_('acl_manual_review_required', 'The Annual archives folder exceeds the bounded lookup inspection limit. District IT must inspect its custody before continuing.');
    }
    var file = files.next();
    inspected += 1;
    if (file.getId() === archiveId) {
      enforceManagedPrivateDriveInspection_(inspectManagedPrivateDriveItem_(file, folder.getId(), 'Annual archive file'));
      return file;
    }
  }
  throw eeError_('not_found', 'The selected file is not in this repository\'s Annual archives folder.');
}

function getPortalAnnualArchives() {
  var actor = requireAdmin_(), lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    requireSameAdminLocked_(actor);
    assertNoArtifactOperationRecovery_();
    assertNoPendingWorkspaceCommit_();
    var props = PropertiesService.getScriptProperties(), id = props.getProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID'); if (!id) return { ok: true, archives: [] };
    var folder = configuredSensitiveFolder_('EE_ANNUAL_ARCHIVES_FOLDER_ID', 'Annual archives');
    verifyKnownAnnualArchiveCustody_(folder);
    protectSensitiveFolderFiles_(folder, 'Annual archives');
    var files = folder.getFiles(), archives = [], limit = 100;
    while (files.hasNext() && archives.length < limit) {
      var file = files.next(), check = verifiedAnnualArchive_(file), envelope = check.envelope;
      archives.push({ id: file.getId(), name: typeof file.getName === 'function' ? file.getName() : 'Annual archive', url: annualArchiveUrl_(file), verified: check.verified, sha256: check.sha256, fromAcademicYear: envelope ? envelope.fromAcademicYear : '', plannedNextAcademicYear: envelope ? envelope.plannedNextAcademicYear : '', sourceRevision: envelope ? envelope.sourceRevision : null, archivedAt: envelope ? envelope.archivedAt : '', counts: envelope ? envelope.counts : null });
    }
    archives.sort(function (a,b) { return String(b.archivedAt).localeCompare(String(a.archivedAt)); });
    return { ok: true, archives: archives };
  } finally {
    lock.releaseLock();
  }
}

function restoreRehearsalsFolder_() {
  var props = PropertiesService.getScriptProperties(), existing = configuredSensitiveFolder_('EE_RESTORE_REHEARSALS_FOLDER_ID', 'Restore rehearsals');
  if (existing) {
    verifyJournaledArtifactFilesInFolder_('restore_rehearsal', existing);
    return protectSensitiveFolderFiles_(existing, 'Restore rehearsals');
  }
  var parentId = safeId_(props.getProperty('EE_FOLDER_ID'), true);
  var folder = DriveApp.getFolderById(parentId).createFolder('Restore rehearsals');
  setPrivate_(folder);
  enforceManagedPrivateDriveInspection_(inspectManagedPrivateDriveItem_(folder, parentId, 'Restore rehearsals folder'));
  props.setProperty('EE_RESTORE_REHEARSALS_FOLDER_ID', folder.getId());
  return folder;
}

function reviewPortalArchiveRestoreRehearsal(request) {
  var actor = requireAdmin_();
  assertNoAnnualRolloverRecovery_();
  request = requireObject_(request || {}, 'request');
  assertNoPendingWorkspaceCommit_();
  assertArtifactOperationReviewAvailable_();
  var rehearsalAcl = inspectRestoreRehearsalsAcl_();
  assertRestoreRehearsalCapacity_(rehearsalAcl);
  var archiveId = safeId_(request.archiveId, true), file = annualArchiveFileById_(archiveId), check = verifiedAnnualArchive_(file);
  if (!check.verified) throw eeError_('archive_verification_failed', 'The selected archive failed verification and cannot be rehearsed.');
  var state = readWorkspaceState_({ skipPendingRecovery: true }), archivedCounts = annualRolloverCounts_(check.envelope.workspace), currentCounts = annualRolloverCounts_(state.workspace), token = newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({ actorEmail: actor.email, operation: 'restore_rehearsal', revision: state.revision, archiveId: archiveId, archiveHash: check.sha256, restoreRehearsalsAclFingerprint: rehearsalAcl.fingerprint, restoreRehearsalsInventoryFingerprint: rehearsalAcl.inventoryFingerprint, restoreRehearsalsFileCount: rehearsalAcl.fileCount }), EE_ADMIN_REVIEW_SECONDS);
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), archiveId: archiveId, fromAcademicYear: check.envelope.fromAcademicYear, archivedRevision: check.envelope.sourceRevision, activeAcademicYear: state.workspace.config.academicYear, activeRevision: state.revision, archivedCounts: archivedCounts, currentCounts: currentCounts, liveWorkspaceWillChange: false, restoreRehearsalsAcl: rehearsalAcl } };
}

function performPortalArchiveRestoreRehearsal(request) {
  var actor = requireAdmin_(); assertNoAnnualRolloverRecovery_({ allowArtifactRecovery: true }); request = requireObject_(request || {}, 'request'); if (request.acknowledgeNoLiveRestore !== true) throw eeError_('acknowledgment_required', 'Confirm this creates a private restore candidate and does not overwrite the live workspace.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    assertNoAnnualRolloverRecovery_({ allowArtifactRecovery: true });
    assertNoPendingWorkspaceCommit_();
    var token = safeId_(request.reviewToken || '', false), cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    if (!token) throw eeError_('review_required', 'Review the restore rehearsal before confirming it.');
    var existingOperation = artifactOperationJournalEntry_('restore_rehearsal', token, actor);
    if (existingOperation) return completeArtifactOperation_(existingOperation, actor, undefined, true);
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'restore_rehearsal') throw eeError_('review_required', 'The restore rehearsal review expired or was already used. Review it again.');
    var state = readWorkspaceState_({ skipPendingRecovery: true }); if (Number(review.revision) !== Number(state.revision)) { cache.remove(key); throw eeError_('review_stale', 'The live workspace changed after review. Reload and review the rehearsal again.'); }
    var archiveFile = annualArchiveFileById_(review.archiveId), check = verifiedAnnualArchive_(archiveFile); if (!check.verified || check.sha256 !== review.archiveHash) { cache.remove(key); throw eeError_('review_stale', 'The archive changed after review or failed verification.'); }
    var rehearsalAcl = inspectRestoreRehearsalsAcl_();
    if (!rehearsalAcl.inspectable || rehearsalAcl.manualReviewRequired) {
      var configuredRehearsalId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_RESTORE_REHEARSALS_FOLDER_ID') || '', false);
      if (configuredRehearsalId) {
        try { verifyJournaledArtifactFilesInFolder_('restore_rehearsal', DriveApp.getFolderById(configuredRehearsalId)); }
        catch (journalVerificationErr) { throw journalVerificationErr; }
      }
      cache.remove(key);
      throw eeError_('acl_manual_review_required', 'Restore rehearsals access could not be safely inspected. District IT must review Drive custody before creating another candidate.');
    }
    if (review.restoreRehearsalsAclFingerprint !== rehearsalAcl.fingerprint || review.restoreRehearsalsInventoryFingerprint !== rehearsalAcl.inventoryFingerprint) {
      if (Number(rehearsalAcl.fileCount) < Number(review.restoreRehearsalsFileCount)) {
        var rehearsalFolderId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_RESTORE_REHEARSALS_FOLDER_ID') || '', true);
        verifyJournaledArtifactFilesInFolder_('restore_rehearsal', DriveApp.getFolderById(rehearsalFolderId));
        throw eeError_('manual_recovery_required', 'A reviewed restore candidate left its exact managed custody. District IT must inspect it.');
      }
      cache.remove(key);
      throw eeError_('review_stale', 'The reviewed Restore rehearsals destination changed. Review the rehearsal again.');
    }
    assertRestoreRehearsalCapacity_(rehearsalAcl);
    var folder;
    try { folder = restoreRehearsalsFolder_(); }
    catch (protectionErr) {
      var afterProtectionFailure = inspectRestoreRehearsalsAcl_();
      if (afterProtectionFailure.inspectable && review.restoreRehearsalsInventoryFingerprint !== afterProtectionFailure.inventoryFingerprint) {
        cache.remove(key);
        throw eeError_('review_stale', 'The reviewed Restore rehearsals inventory changed during protection. No new candidate was created; review it again.');
      }
      throw protectionErr;
    }
    var protectedAcl = inspectRestoreRehearsalsAcl_();
    if (!protectedAcl.inspectable || protectedAcl.manualReviewRequired) throw eeError_('acl_manual_review_required', 'Restore rehearsals access could not be safely re-verified after protection.');
    if (protectedAcl.folderDrift || protectedAcl.driftedFileCount > 0) throw eeError_('protection_failed', 'Restore rehearsals could not be made and verified private; no new candidate was created.');
    if (review.restoreRehearsalsInventoryFingerprint !== protectedAcl.inventoryFingerprint) { cache.remove(key); throw eeError_('review_stale', 'The reviewed Restore rehearsals inventory changed during protection. No new candidate was created; review it again.'); }
    assertRestoreRehearsalCapacity_(protectedAcl);
    var createdAt = nowIso_();
    var candidate = { kind: 'alloflow-educator-evaluation-restore-rehearsal', version: 1, createdAt: createdAt, createdBy: actor.email, sourceArchiveId: review.archiveId, sourceArchiveHash: review.archiveHash, liveRevisionAtReview: state.revision, liveWorkspaceChanged: false, candidateWorkspace: check.envelope.workspace };
    var content = JSON.stringify(candidate), operationKey = artifactOperationKey_('restore_rehearsal', token);
    var entry = {
      key: operationKey, reviewTokenHash: hashText_(token), actorEmail: actor.email, actorRole: actor.role,
      actorDisplayName: actor.displayName || actor.email, kind: 'restore_rehearsal', revision: state.revision,
      scope: 'restore_rehearsal', purpose: '', sourceId: review.archiveId, sourceHash: review.archiveHash,
      folderId: folder.getId(), fileName: 'restore-rehearsal-' + check.envelope.fromAcademicYear + '-' + createdAt.slice(0,10) + '-' + operationKey.slice(0,16) + '.json',
      mime: MimeType.PLAIN_TEXT, contentHash: hashText_(content), createdAt: createdAt, updatedAt: createdAt, stage: 'intent', fileId: '', auditEntry: null,
    };
    entry.requestHash = artifactOperationRequestHash_(entry);
    upsertArtifactOperationEntry_(entry);
    cache.remove(key);
    return completeArtifactOperation_(entry, actor, content, false);
  } finally { lock.releaseLock(); }
}

/* ---------------- annual rollover and continuity ---------------- */

function annualRolloverReviewCacheKey_(token) { return 'EE_ROLLOVER_REVIEW_' + safeId_(token, true); }

function normalizeAcademicYear_(value) {
  var text = safeString_(value, 20, '').replace(/[\u2013\u2014]/g, '-');
  var match = text.match(/^(\d{4})-(\d{2})$/);
  if (!match || Number(match[2]) !== (Number(match[1]) + 1) % 100) throw eeError_('bad_request', 'Academic year must use YYYY-YY and name consecutive years, for example 2027-28.');
  return match[1] + '-' + match[2];
}

function annualRolloverCounts_(workspace) {
  var active = (workspace.teachers || []).filter(function (teacher) { return teacher.active !== false; });
  var recordTeacherIds = {};
  ['walkthroughs', 'observations', 'spms'].forEach(function (key) {
    (workspace[key] || []).forEach(function (record) { recordTeacherIds[record.teacherId] = true; });
  });
  var finalized = 0, open = 0;
  active.forEach(function (teacher) {
    if (teacher.finalizedAt) finalized++;
    else if (teacher.cycleStatus !== 'not_started' || teacher.lastActivityAt || recordTeacherIds[teacher.id]) open++;
  });
  var records = {
    walkthroughs: (workspace.walkthroughs || []).length,
    observations: (workspace.observations || []).length,
    spms: (workspace.spms || []).length,
    comments: (workspace.comments || []).length,
  };
  records.total = records.walkthroughs + records.observations + records.spms + records.comments;
  return {
    activeEducators: active.length,
    inactiveEducators: (workspace.teachers || []).length - active.length,
    finalizedCycles: finalized,
    openCycles: open,
    notStartedCycles: Math.max(0, active.length - finalized - open),
    releasedDocuments: (workspace.teachers || []).filter(function (teacher) { return !!teacher.releasedDoc; }).length,
    retainedCycleSnapshots: (workspace.cycleSnapshots || []).length,
    records: records,
  };
}

function inspectAnnualArchiveCapacity_() {
  var props = PropertiesService.getScriptProperties();
  var configuredId = safeId_(props.getProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID') || '', false);
  if (!configuredId) return { inspectable: true, manualReviewRequired: false, fileCount: 0, capacityExceeded: false, inventoryFingerprint: hashText_(JSON.stringify([])), fingerprint: hashText_(JSON.stringify({ configured: false })) };
  try {
    var folder = DriveApp.getFolderById(configuredId);
    var folderInspection = inspectManagedPrivateDriveItem_(folder, safeId_(props.getProperty('EE_FOLDER_ID'), true), 'Annual archives folder');
    var files = folder.getFiles(), ids = [], count = 0;
    if (!files || typeof files.hasNext !== 'function' || typeof files.next !== 'function') throw eeError_('acl_manual_review_required', 'The Annual archives folder contents could not be inspected.');
    while (files.hasNext()) {
      if (count >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) throw eeError_('annual_archive_capacity_exceeded', 'The Annual archives folder exceeds the bounded custody inspection limit.');
      var file = files.next();
      inspectManagedPrivateDriveItem_(file, configuredId, 'Annual archive file');
      ids.push(safeId_(file.getId(), true));
      count++;
    }
    ids.sort();
    return {
      inspectable: true, manualReviewRequired: false, fileCount: count, capacityExceeded: false,
      inventoryFingerprint: hashText_(JSON.stringify(ids)),
      fingerprint: hashText_(JSON.stringify({ configuredId: configuredId, folder: folderInspection.acl.fingerprintState, fileIds: ids })),
    };
  } catch (inspectionErr) {
    var capacityExceeded = !!inspectionErr && inspectionErr.code === 'annual_archive_capacity_exceeded';
    return {
      inspectable: false, manualReviewRequired: true, capacityExceeded: capacityExceeded,
      fileCount: capacityExceeded ? EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS + 1 : 0,
      inventoryFingerprint: hashText_(JSON.stringify({ configuredId: configuredId, inspectable: false, capacityExceeded: capacityExceeded })),
      fingerprint: hashText_(JSON.stringify({ configuredId: configuredId, inspectable: false, capacityExceeded: capacityExceeded })),
    };
  }
}

function assertAnnualArchiveCapacity_(status) {
  if (!status || !status.inspectable || status.manualReviewRequired || status.capacityExceeded || Number(status.fileCount) >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) {
    throw eeError_('acl_manual_review_required', 'The Annual archives folder has reached or exceeded the bounded custody inspection limit. District IT must review retention before another annual rollover.');
  }
}

function annualArchivesFolder_() {
  var props = PropertiesService.getScriptProperties();
  var existing = configuredSensitiveFolder_('EE_ANNUAL_ARCHIVES_FOLDER_ID', 'Annual archives');
  if (existing) {
    verifyKnownAnnualArchiveCustody_(existing);
    return protectSensitiveFolderFiles_(existing, 'Annual archives');
  }
  var parentId = safeId_(props.getProperty('EE_FOLDER_ID'), true);
  var parent = DriveApp.getFolderById(parentId);
  var folder = parent.createFolder('Annual archives');
  setPrivate_(folder);
  enforceManagedPrivateDriveInspection_(inspectManagedPrivateDriveItem_(folder, parentId, 'Annual archives folder'));
  props.setProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID', folder.getId());
  return folder;
}

function annualArchiveUrl_(file) {
  if (file && typeof file.getUrl === 'function') return safeString_(file.getUrl(), 1000, '');
  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

function verifyKnownAnnualArchiveCustody_(folder) {
  var record = readAnnualRolloverCompletion_();
  if (!record) return folder;
  if (!record || !record.archiveId) throw eeError_('manual_recovery_required', 'The latest annual archive custody record is invalid. District IT must inspect it before continuing.');
  var file;
  try { file = DriveApp.getFileById(safeId_(record.archiveId, true)); }
  catch (lookupErr) { throw eeError_('manual_recovery_required', 'The latest annual archive is unavailable. District IT must inspect archive custody before continuing.'); }
  var check = verifiedAnnualArchive_(file, folder.getId());
  if (!check.verified || (record.archiveHash && check.sha256 !== String(record.archiveHash))) throw eeError_('manual_recovery_required', 'The latest annual archive no longer matches its exact verified content. District IT must inspect it before continuing.');
  return folder;
}

function buildAnnualArchive_(state, actor, fromYear, toYear, counts) {
  var workspaceJson = JSON.stringify(state.workspace);
  var envelope = {
    kind: 'alloflow-educator-evaluation-annual-archive',
    version: 1,
    archivedAt: nowIso_(),
    fromAcademicYear: fromYear,
    plannedNextAcademicYear: toYear,
    sourceRevision: state.revision,
    archivedBy: actor.email,
    counts: counts,
    workspaceHash: hashText_(workspaceJson),
    workspace: state.workspace,
  };
  var content = JSON.stringify(envelope);
  var name = 'educator-evaluation-' + fromYear + '-archive-' + envelope.archivedAt.slice(0, 10) + '.json';
  var folder = annualArchivesFolder_();
  var file = folder.createFile(name, content, MimeType.PLAIN_TEXT);
  var check = verifiedAnnualArchive_(file, folder.getId()), verified = check.envelope;
  if (!check.verified || !verified || verified.kind !== envelope.kind || verified.sourceRevision !== state.revision || verified.workspaceHash !== hashText_(JSON.stringify(verified.workspace)) || check.sha256 !== hashText_(content)) {
    throw eeError_('archive_verification_failed', 'The private annual archive could not be verified. The active year was not changed.');
  }
  return { id: file.getId(), url: annualArchiveUrl_(file), name: name, hash: hashText_(content), archivedAt: envelope.archivedAt };
}

function annualArchiveIntentContent_(state, recovery) {
  if (!state || !recovery || Number(recovery.version) !== 2 || recovery.kind !== 'annual_rollover') throw eeError_('manual_recovery_required', 'Annual archive intent metadata is invalid. District IT must inspect it.');
  var sourceRevision = Number(recovery.sourceRevision);
  var sourceHash = hashText_(JSON.stringify(state.workspace));
  var counts = annualRolloverCounts_(state.workspace);
  if (Math.floor(sourceRevision) !== sourceRevision || sourceRevision < 0 || Number(state.revision) !== sourceRevision || recovery.sourceWorkspaceHash !== sourceHash || recovery.countsHash !== hashText_(JSON.stringify(counts))) throw eeError_('manual_recovery_required', 'The active workspace no longer matches the exact annual archive intent. District IT must inspect it.');
  if (safeString_(state.workspace.config && state.workspace.config.academicYear, 20, '').replace(/[\u2013\u2014]/g, '-') !== recovery.fromYear) throw eeError_('manual_recovery_required', 'The active academic year no longer matches the annual archive intent. District IT must inspect it.');
  var envelope = {
    kind: 'alloflow-educator-evaluation-annual-archive',
    version: 1,
    operationKey: safeId_(recovery.key, true),
    archivedAt: optionalTimestamp_(recovery.createdAt),
    fromAcademicYear: safeString_(recovery.fromYear, 20, '', true),
    plannedNextAcademicYear: safeString_(recovery.toYear, 20, '', true),
    sourceRevision: sourceRevision,
    archivedBy: normalizeEmail_(recovery.actorEmail),
    counts: counts,
    workspaceHash: sourceHash,
    workspace: state.workspace,
  };
  return JSON.stringify(envelope);
}

function newAnnualArchiveIntent_(state, actor, review, token, folder) {
  var createdAt = nowIso_();
  var key = 'rollover_' + hashText_('annual_rollover|' + token).slice(0, 48);
  var recovery = {
    version: 2, kind: 'annual_rollover', key: key, reviewTokenHash: hashText_(token),
    actorEmail: actor.email, actorRole: actor.role, sourceRevision: state.revision,
    sourceWorkspaceHash: hashText_(JSON.stringify(state.workspace)),
    fromYear: review.fromYear, toYear: review.toYear,
    countsHash: hashText_(JSON.stringify(review.counts)), createdAt: createdAt, at: createdAt,
    folderId: safeId_(folder.getId(), true),
    fileName: 'educator-evaluation-' + review.fromYear + '-archive-' + key.slice(0, 20) + '.json',
    contentHash: '', stage: 'archive_intent', archiveId: '', archiveUrl: '', archiveHash: '', errorCode: '',
  };
  var content = annualArchiveIntentContent_(state, recovery);
  recovery.contentHash = hashText_(content);
  recovery.archiveHash = recovery.contentHash;
  return { recovery: recovery, content: content };
}

function completeAnnualArchiveIntent_(recovery, state) {
  var content = annualArchiveIntentContent_(state, recovery);
  if (hashText_(content) !== recovery.contentHash || recovery.archiveHash !== recovery.contentHash) throw eeError_('manual_recovery_required', 'The annual archive intent content hash is inconsistent. District IT must inspect it.');
  var configuredId = safeId_(PropertiesService.getScriptProperties().getProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID') || '', true);
  if (configuredId !== safeId_(recovery.folderId, true)) throw eeError_('manual_recovery_required', 'The managed Annual archives folder changed after the reviewed intent. District IT must inspect it.');
  var folder = annualArchivesFolder_();
  if (safeId_(folder.getId(), true) !== configuredId) throw eeError_('manual_recovery_required', 'The managed Annual archives folder identity is inconsistent. District IT must inspect it.');
  var files = folder.getFiles(), matches = [], inspected = 0;
  if (!files || typeof files.hasNext !== 'function' || typeof files.next !== 'function') throw eeError_('manual_recovery_required', 'Annual archive recovery could not inspect the managed folder.');
  while (files.hasNext()) {
    if (inspected >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) throw eeError_('manual_recovery_required', 'The Annual archives folder exceeds the bounded recovery inspection limit.');
    var candidate = files.next();
    inspected++;
    var candidateId = safeId_(candidate.getId(), true);
    var candidateName = typeof candidate.getName === 'function' ? safeString_(candidate.getName(), 220, '') : '';
    if (candidateName === recovery.fileName || (recovery.archiveId && candidateId === recovery.archiveId)) matches.push(candidate);
  }
  if (matches.length > 1) throw eeError_('manual_recovery_required', 'Annual archive recovery found multiple files matching one reviewed rollover.');
  var file = matches.length ? matches[0] : null;
  if (!file) {
    if (inspected >= EE_SENSITIVE_ACL_INSPECTION_MAX_ITEMS) throw eeError_('acl_manual_review_required', 'The Annual archives folder has no bounded headroom for the reviewed archive. District IT must review retention.');
    try { file = folder.createFile(recovery.fileName, content, MimeType.PLAIN_TEXT); }
    catch (createErr) { throw eeError_('rollover_recovery_required', 'Annual archive creation was interrupted after its durable intent. Run the recovery recheck.'); }
    recovery.archiveId = safeId_(file.getId(), true);
    recovery.archiveUrl = annualArchiveUrl_(file);
    recovery.stage = 'archive_created';
    recordAnnualRolloverRecovery_(recovery);
  } else {
    var foundId = safeId_(file.getId(), true);
    if ((recovery.archiveId && recovery.archiveId !== foundId) || (typeof file.getName !== 'function') || safeString_(file.getName(), 220, '') !== recovery.fileName) throw eeError_('manual_recovery_required', 'The recovered annual archive identity does not match its durable intent.');
    if (!recovery.archiveId || recovery.stage === 'archive_intent') {
      recovery.archiveId = foundId;
      recovery.archiveUrl = annualArchiveUrl_(file);
      recovery.stage = 'archive_created';
      recordAnnualRolloverRecovery_(recovery);
    }
  }
  var check = verifiedAnnualArchive_(file, configuredId), envelope = check.envelope;
  if (!check.verified || check.sha256 !== recovery.contentHash || !envelope || envelope.operationKey !== recovery.key || Number(envelope.sourceRevision) !== Number(recovery.sourceRevision) || envelope.fromAcademicYear !== recovery.fromYear || envelope.plannedNextAcademicYear !== recovery.toYear) throw eeError_('manual_recovery_required', 'The recovered annual archive does not match its exact reviewed content. District IT must inspect it.');
  recovery.archiveId = safeId_(file.getId(), true);
  recovery.archiveUrl = annualArchiveUrl_(file);
  recovery.archiveHash = check.sha256;
  recovery.stage = 'archive_verified';
  delete recovery.errorCode;
  recordAnnualRolloverRecovery_(recovery);
  return annualRolloverArchiveRecord_(recovery, { file: file, check: check, envelope: envelope });
}

function resetTeacherForAnnualRollover_(teacher) {
  return sanitizeTeacher_({
    id: teacher.id,
    code: teacher.code,
    name: teacher.name,
    building: teacher.building,
    assignment: teacher.assignment,
    employeeType: teacher.employeeType,
    buildingData: teacher.buildingData,
    teacherSpecificData: teacher.teacherSpecificData,
    active: teacher.active,
    evaluator: teacher.evaluator,
    dueDate: '',
    cycleStatus: 'not_started',
    frameworkVersion: teacher.frameworkVersion,
    ratings: { domains: { d1: null, d2: null, d3: null, d4: null }, building: null, teacher: null, lea: null },
    weightSnapshot: null,
    finalScore: null,
    releasedDoc: null,
    educatorStatement: null,
  });
}

function workspaceForAnnualRollover_(workspace, toYear) {
  var next = clone_(workspace);
  hydrateReleaseRegistry_(next);
  next.config.academicYear = toYear;
  next.config.sampleMode = false;
  next.teachers = (workspace.teachers || []).map(resetTeacherForAnnualRollover_);
  next.walkthroughs = [];
  next.observations = [];
  next.spms = [];
  next.comments = [];
  next.cycleSnapshots = clone_(workspace.cycleSnapshots || []);
  next.audit = clone_(workspace.audit || []);
  return sanitizeStoredWorkspace_(next);
}

function reviewPortalAnnualRollover(request) {
  var actor = requireAdmin_();
  assertNoArtifactOperationRecovery_();
  var retryRecovery = annualRolloverRetryRecovery_();
  request = requireObject_(request || {}, 'request');
  var toYear = normalizeAcademicYear_(request.nextAcademicYear);
  assertNoPendingWorkspaceCommit_();
  var state = readWorkspaceState_({ skipPendingRecovery: true });
  var fromYear = safeString_(state.workspace.config && state.workspace.config.academicYear, 20, '').replace(/[\u2013\u2014]/g, '-');
  if (fromYear === toYear) throw eeError_('bad_request', 'The next academic year must differ from the active year.');
  var fromMatch = fromYear.match(/^(\d{4})-(\d{2})$/);
  var toMatch = toYear.match(/^(\d{4})-(\d{2})$/);
  if (fromMatch && toMatch && Number(toMatch[1]) !== Number(fromMatch[1]) + 1) throw eeError_('bad_request', 'Annual rollover must advance exactly one academic year.');
  if (retryRecovery) {
    verifiedAnnualRolloverRecoveryArchive_(retryRecovery, state);
    if (toYear !== retryRecovery.toYear) throw eeError_('bad_request', 'The reviewed retry must use the academic year recorded with the verified archive.');
  }
  var archiveCapacity = retryRecovery ? null : inspectAnnualArchiveCapacity_();
  if (!retryRecovery) assertAnnualArchiveCapacity_(archiveCapacity);
  var counts = annualRolloverCounts_(state.workspace);
  var token = newId_('rollover-review');
  CacheService.getScriptCache().put(annualRolloverReviewCacheKey_(token), JSON.stringify({
    actorEmail: actor.email,
    revision: state.revision,
    fromYear: fromYear,
    toYear: toYear,
    countsHash: hashText_(JSON.stringify(counts)),
    retryArchiveId: retryRecovery ? retryRecovery.archiveId : '',
    retryArchiveHash: retryRecovery ? retryRecovery.archiveHash : '',
    annualArchivesAclFingerprint: archiveCapacity ? archiveCapacity.fingerprint : '',
    annualArchivesInventoryFingerprint: archiveCapacity ? archiveCapacity.inventoryFingerprint : '',
    annualArchivesFileCount: archiveCapacity ? archiveCapacity.fileCount : 0,
  }), EE_ROLLOVER_REVIEW_SECONDS);
  return {
    ok: true,
    review: {
      token: token,
      expiresAt: new Date(Date.now() + EE_ROLLOVER_REVIEW_SECONDS * 1000).toISOString(),
      currentAcademicYear: fromYear,
      nextAcademicYear: toYear,
      counts: counts,
      archiveCreatedBeforeReset: true,
      archiveWillBeReused: !!retryRecovery,
      retryArchiveId: retryRecovery ? retryRecovery.archiveId : '',
      annualArchiveCapacity: archiveCapacity,
      rosterRetained: true,
      cycleSnapshotsRetained: true,
      releasedDocumentsDeleted: false,
    },
  };
}

function requireAnnualRolloverReview_(request, actor, state, retryRecovery) {
  var token = safeId_(request.reviewToken || '', false);
  if (!token) throw eeError_('review_required', 'Review the annual rollover impact before confirming it.');
  var cache = CacheService.getScriptCache();
  var key = annualRolloverReviewCacheKey_(token);
  var raw = cache.get(key);
  if (!raw) throw eeError_('review_required', 'The annual rollover review expired or was already used. Review it again.');
  var review;
  try { review = JSON.parse(raw); } catch (parseErr) { review = null; }
  var currentYear = safeString_(state.workspace.config && state.workspace.config.academicYear, 20, '').replace(/[\u2013\u2014]/g, '-');
  var counts = annualRolloverCounts_(state.workspace);
  var retryArchiveId = retryRecovery ? retryRecovery.archiveId : '';
  var retryArchiveHash = retryRecovery ? retryRecovery.archiveHash : '';
  if (!review || review.actorEmail !== actor.email || Number(review.revision) !== Number(state.revision) || review.fromYear !== currentYear || review.countsHash !== hashText_(JSON.stringify(counts)) || String(review.retryArchiveId || '') !== retryArchiveId || String(review.retryArchiveHash || '') !== retryArchiveHash) {
    cache.remove(key);
    throw eeError_('review_stale', 'The active workspace changed after review. Reload and review the annual rollover again.');
  }
  if (!retryRecovery) {
    var archiveCapacity = inspectAnnualArchiveCapacity_();
    if (!archiveCapacity.inspectable || archiveCapacity.manualReviewRequired) throw eeError_('acl_manual_review_required', 'Annual archive custody could not be safely inspected. District IT must review it before confirming rollover.');
    if (review.annualArchivesAclFingerprint !== archiveCapacity.fingerprint || review.annualArchivesInventoryFingerprint !== archiveCapacity.inventoryFingerprint) {
      cache.remove(key);
      if (Number(archiveCapacity.fileCount) < Number(review.annualArchivesFileCount)) throw eeError_('acl_manual_review_required', 'A reviewed annual archive left its exact managed custody. District IT must inspect the Annual archives folder.');
      throw eeError_('review_stale', 'The reviewed Annual archives destination changed. Reload and review the annual rollover again.');
    }
    assertAnnualArchiveCapacity_(archiveCapacity);
    review.annualArchiveCapacity = archiveCapacity;
  }
  review.counts = counts;
  return review;
}

function recordAnnualRolloverRecovery_(payload) {
  var props = PropertiesService.getScriptProperties();
  if (Number(payload && payload.version) === 2) {
    delete payload.integrityHash;
    payload.updatedAt = nowIso_();
    payload.integrityHash = hashText_(JSON.stringify(payload));
  }
  var raw = JSON.stringify(payload);
  props.setProperty('EE_ROLLOVER_RECOVERY_REQUIRED', raw);
  if (props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED') !== raw) throw eeError_('server_error', 'Annual rollover recovery metadata could not be verified. District IT must inspect the repository before any retry.');
}

function parseAnnualRolloverRecovery_(raw) {
  var recovery;
  try { recovery = JSON.parse(raw); } catch (parseErr) { recovery = null; }
  if (!recovery || !isPlainObject_(recovery)) throw eeError_('manual_recovery_required', 'Rollover recovery metadata is invalid. District IT must inspect the repository before any retry.');
  if (Number(recovery.version) === 2) {
    var storedHash = String(recovery.integrityHash || '');
    if (!storedHash || storedHash.length > 200) throw eeError_('manual_recovery_required', 'Rollover recovery metadata is missing its integrity seal. District IT must inspect the repository before any retry.');
    delete recovery.integrityHash;
    if (hashText_(JSON.stringify(recovery)) !== storedHash) throw eeError_('manual_recovery_required', 'Rollover recovery metadata failed its integrity check. District IT must inspect the repository before any retry.');
    recovery.integrityHash = storedHash;
  }
  return recovery;
}

function writeAnnualRolloverCompletion_(record) {
  var stored = clone_(record || {});
  stored.version = 2;
  stored.kind = 'annual_rollover_completion';
  delete stored.integrityHash;
  stored.integrityHash = hashText_(JSON.stringify(stored));
  var raw = JSON.stringify(stored), props = PropertiesService.getScriptProperties();
  props.setProperty('EE_LAST_ROLLOVER', raw);
  if (props.getProperty('EE_LAST_ROLLOVER') !== raw) throw eeError_('server_error', 'The annual rollover completion receipt could not be persisted and verified. Recovery remains required.');
  return stored;
}

function readAnnualRolloverCompletion_() {
  var raw = PropertiesService.getScriptProperties().getProperty('EE_LAST_ROLLOVER');
  if (!raw) return null;
  var record;
  try { record = JSON.parse(raw); } catch (parseErr) { record = null; }
  if (!record || !isPlainObject_(record)) throw eeError_('manual_recovery_required', 'The latest annual rollover completion receipt is invalid. District IT must inspect it.');
  if (Number(record.version) === 2) {
    var storedHash = String(record.integrityHash || '');
    if (!storedHash || storedHash.length > 200) throw eeError_('manual_recovery_required', 'The latest annual rollover completion receipt is missing its integrity seal. District IT must inspect it.');
    delete record.integrityHash;
    if (record.kind !== 'annual_rollover_completion' || hashText_(JSON.stringify(record)) !== storedHash) throw eeError_('manual_recovery_required', 'The latest annual rollover completion receipt failed its integrity check. District IT must inspect it.');
    record.integrityHash = storedHash;
  }
  return record;
}

function verifiedAnnualRolloverCompletion_(record) {
  try {
    if (!record) throw new Error('missing receipt');
    var archiveId = safeId_(record.archiveId, true), archiveHash = safeString_(record.archiveHash, 200, '', true);
    var fromYear = safeString_(record.fromYear, 20, '', true), toYear = safeString_(record.toYear, 20, '', true);
    var revision = Number(record.revision);
    if (!/^(\d{4})-(\d{2})$/.test(fromYear) || !/^(\d{4})-(\d{2})$/.test(toYear) || Math.floor(revision) !== revision || revision < 0) throw new Error('receipt scope');
    var state = readWorkspaceState_();
    if (Number(state.revision) < revision || safeString_(state.workspace.config && state.workspace.config.academicYear, 20, '') !== toYear) throw new Error('active state');
    var file = annualArchiveFileById_(archiveId), check = verifiedAnnualArchive_(file), envelope = check.envelope;
    if (!check.verified || check.sha256 !== archiveHash || !envelope || envelope.fromAcademicYear !== fromYear || envelope.plannedNextAcademicYear !== toYear) throw new Error('archive receipt');
    var recovery = { archiveId: archiveId, toYear: toYear, auditEntryId: record.auditEntryId || '' };
    var auditEntry = annualRolloverWorkspaceAuditEntry_(state, recovery);
    var auditStatus = annualRolloverAuditProjectionStatus_(auditEntry);
    var configurationStatus = configurationIndexStatus_(state.workspace);
    if (!auditStatus.present || !configurationStatus.ok || Number(configurationStatus.keyCount) !== 1) throw new Error('secondary receipt');
    return {
      ok: true, status: 'completed', recoveryPending: false, idempotent: true,
      archive: { id: archiveId, url: annualArchiveUrl_(file), hash: archiveHash },
      fromAcademicYear: fromYear, toAcademicYear: toYear, activeAcademicYear: toYear,
      counts: envelope.counts || record.counts || null,
    };
  } catch (receiptErr) {
    if (receiptErr && receiptErr.code === 'manual_recovery_required') throw receiptErr;
    throw eeError_('manual_recovery_required', 'The latest annual rollover completion receipt no longer matches the active workspace, archive, Audit row, and Config projection. District IT must inspect it.');
  }
}

function annualRolloverRetryRecovery_() {
  var raw = PropertiesService.getScriptProperties().getProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
  if (!raw) return null;
  var recovery = parseAnnualRolloverRecovery_(raw);
  if (!recovery || recovery.stage !== 'archive_retry_ready') {
    throw eeError_('rollover_recovery_required', 'An interrupted annual rollover must be rechecked before making any other changes. Ask an administrator to run Recheck interrupted rollover.');
  }
  return recovery;
}

function verifiedAnnualRolloverRecoveryArchive_(recovery, sourceState) {
  try {
    if (!recovery || !isPlainObject_(recovery)) throw new Error('missing recovery metadata');
    var archiveId = safeId_(recovery.archiveId, true);
    var archiveHash = safeString_(recovery.archiveHash, 200, '', true);
    var fromYear = safeString_(recovery.fromYear, 20, '', true);
    var toYear = safeString_(recovery.toYear, 20, '', true);
    var sourceRevision = Number(recovery.sourceRevision);
    if (!/^(\d{4})-(\d{2})$/.test(fromYear) || !/^(\d{4})-(\d{2})$/.test(toYear) || Math.floor(sourceRevision) !== sourceRevision || sourceRevision < 0) throw new Error('invalid recovery scope');
    var fromMatch = fromYear.match(/^(\d{4})-(\d{2})$/), toMatch = toYear.match(/^(\d{4})-(\d{2})$/);
    if (Number(fromMatch[2]) !== (Number(fromMatch[1]) + 1) % 100 || Number(toMatch[2]) !== (Number(toMatch[1]) + 1) % 100 || Number(toMatch[1]) !== Number(fromMatch[1]) + 1) throw new Error('invalid recovery years');
    var file = annualArchiveFileById_(archiveId);
    if (file.getId() !== archiveId) throw new Error('archive identity mismatch');
    var check = verifiedAnnualArchive_(file), envelope = check.envelope;
    if (!check.verified || check.sha256 !== archiveHash || !envelope || Number(envelope.sourceRevision) !== sourceRevision || envelope.fromAcademicYear !== fromYear || envelope.plannedNextAcademicYear !== toYear || safeString_(envelope.workspace && envelope.workspace.config && envelope.workspace.config.academicYear, 20, '') !== fromYear) throw new Error('archive verification mismatch');
    if (sourceState && (Number(sourceState.revision) !== sourceRevision || safeString_(sourceState.workspace && sourceState.workspace.config && sourceState.workspace.config.academicYear, 20, '').replace(/[\u2013\u2014]/g, '-') !== fromYear || hashText_(JSON.stringify(sourceState.workspace)) !== envelope.workspaceHash)) throw new Error('active source mismatch');
    return { file: file, check: check, envelope: envelope };
  } catch (archiveErr) {
    if (archiveErr && archiveErr.code === 'manual_recovery_required') throw archiveErr;
    throw eeError_('manual_recovery_required', 'The recorded annual archive no longer matches the exact verified rollover source. District IT must inspect the repository before any retry.');
  }
}

function annualRolloverArchiveRecord_(recovery, verified) {
  var file = verified.file, envelope = verified.envelope;
  return {
    id: recovery.archiveId,
    url: annualArchiveUrl_(file),
    name: typeof file.getName === 'function' ? file.getName() : '',
    hash: verified.check.sha256,
    archivedAt: envelope.archivedAt,
  };
}

function annualRolloverCommitted_(state, recovery) {
  if (!state || !recovery || state.workspace.config.academicYear !== recovery.toYear) return false;
  return (state.workspace.audit || []).some(function (entry) { return entry.event === 'ANNUAL_ROLLOVER' && entry.entityId === recovery.archiveId; });
}

function annualRolloverWorkspaceAuditEntry_(state, recovery) {
  var matches = (state && state.workspace && state.workspace.audit || []).filter(function (entry) {
    return entry && entry.event === 'ANNUAL_ROLLOVER' && entry.entityId === recovery.archiveId;
  });
  if (matches.length !== 1) throw eeError_('manual_recovery_required', 'The active workspace does not contain exactly one audit entry for the recorded annual rollover. District IT must inspect it.');
  var entry = sanitizeAuditObject_(matches[0]);
  if (recovery.auditEntryId && recovery.auditEntryId !== entry.id) throw eeError_('manual_recovery_required', 'The recorded annual rollover audit identity does not match the active workspace. District IT must inspect it.');
  recovery.auditEntryId = entry.id;
  return entry;
}

function annualRolloverAuditProjectionStatus_(entry) {
  var rows = auditLedgerRows_(), chain = auditChainStatus_(rows);
  if (!chain.ok) throw eeError_('manual_recovery_required', 'The canonical Audit chain is not intact, so annual rollover recovery was refused.');
  var expected = normalizeSecondaryRow_('audit', expectedAuditIndexRow_(entry));
  var identityRows = [], semanticRows = [];
  for (var i = 0; i < rows.length; i++) {
    var row = normalizeSecondaryRow_('audit', rows[i]);
    if (row[0] === entry.id) identityRows.push(row);
    if (row[2] === 'ANNUAL_ROLLOVER' && row[5] === entry.entityId) semanticRows.push(row);
  }
  if (identityRows.length > 1 || (identityRows.length === 1 && !same_(identityRows[0], expected))) throw eeError_('manual_recovery_required', 'The canonical annual rollover audit identity is duplicated or mismatched. District IT must inspect it.');
  if (semanticRows.length > 1 || (semanticRows.length === 1 && semanticRows[0][0] !== entry.id)) throw eeError_('manual_recovery_required', 'The canonical Audit sheet contains an ambiguous annual rollover entry. District IT must inspect it.');
  return { present: identityRows.length === 1, rows: rows };
}

function retainAnnualRolloverAuditRecovery_(entry) {
  try { recordOperationAuditRecovery_(entry); }
  catch (journalErr) {
    try {
      var props = PropertiesService.getScriptProperties();
      props.setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1');
      props.setProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED', '1');
    } catch (propertyErr) {}
  }
}

function settleAnnualRolloverSecondary_(state, recovery) {
  var entry = annualRolloverWorkspaceAuditEntry_(state, recovery);
  recovery.stage = 'secondary_recovery';
  recordAnnualRolloverRecovery_(recovery);
  var auditPending = false, configurationPending = false;
  try {
    var auditStatus = annualRolloverAuditProjectionStatus_(entry);
    if (!auditStatus.present) appendCanonicalAuditRow_(entry);
    if (!annualRolloverAuditProjectionStatus_(entry).present) throw new Error('annual rollover audit readback');
  } catch (auditErr) {
    if (auditErr && auditErr.code === 'manual_recovery_required') throw auditErr;
    retainAnnualRolloverAuditRecovery_(entry);
    auditPending = true;
  }
  try {
    var configurationStatus = configurationIndexStatus_(state.workspace);
    if (configurationStatus.duplicate) throw eeError_('manual_recovery_required', 'The academic-year projection contains duplicate keys. District IT must inspect it before annual rollover recovery.');
    if (!configurationStatus.ok) setConfigValue_('academicYear', state.workspace.config.academicYear);
    configurationStatus = configurationIndexStatus_(state.workspace);
    if (configurationStatus.duplicate) throw eeError_('manual_recovery_required', 'The academic-year projection contains duplicate keys. District IT must inspect it before annual rollover recovery.');
    if (!configurationStatus.ok || Number(configurationStatus.keyCount) !== 1) throw new Error('annual rollover configuration readback');
  } catch (configurationErr) {
    if (configurationErr && configurationErr.code === 'manual_recovery_required') throw configurationErr;
    try { markConfigurationRecovery_(); }
    catch (journalErr) {
      try {
        var props = PropertiesService.getScriptProperties();
        props.setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1');
        props.setProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED', '1');
      } catch (propertyErr) {}
    }
    configurationPending = true;
  }
  if (auditPending || configurationPending) {
    recordAnnualRolloverRecovery_(recovery);
    return { pending: true, auditPending: auditPending, configurationPending: configurationPending };
  }
  try {
    updateSecondaryRecoveryJournal_(function (journal) {
      journal.auditEntries = (journal.auditEntries || []).filter(function (item) { return item.id !== entry.id; });
      journal.configuration = false;
    });
  } catch (cleanupErr) {
    recordAnnualRolloverRecovery_(recovery);
    return { pending: true, auditPending: false, configurationPending: false, cleanupPending: true };
  }
  return { pending: false, auditPending: false, configurationPending: false };
}

function performPortalAnnualRollover(request) {
  var actor = requireAdmin_();
  assertNoArtifactOperationRecovery_();
  annualRolloverRetryRecovery_();
  request = requireObject_(request || {}, 'request');
  var props = PropertiesService.getScriptProperties();
  if (request.acknowledgeArchive !== true) throw eeError_('acknowledgment_required', 'Confirm district archive, retention, legal-hold, and ownership responsibility.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  var archive = null;
  var recovery = null;
  try {
    actor = requireSameAdminLocked_(actor);
    assertNoArtifactOperationRecovery_();
    var retryRecovery = annualRolloverRetryRecovery_();
    assertNoPendingWorkspaceCommit_();
    var state = readWorkspaceState_({ skipPendingRecovery: true });
    var review = requireAnnualRolloverReview_(request, actor, state, retryRecovery);
    if (review.counts.openCycles > 0 && request.acknowledgeOpenCycles !== true) throw eeError_('acknowledgment_required', 'Confirm that open cycles will be archived and will not carry into the new active year.');
    if (retryRecovery) {
      var verifiedRetry = verifiedAnnualRolloverRecoveryArchive_(retryRecovery, state);
      archive = annualRolloverArchiveRecord_(retryRecovery, verifiedRetry);
      recovery = retryRecovery;
      recovery.stage = 'archive_verified';
      recovery.archiveUrl = archive.url;
      recovery.retryReviewedAt = nowIso_();
      delete recovery.errorCode;
    } else {
      var archiveFolder = annualArchivesFolder_();
      var protectedCapacity = inspectAnnualArchiveCapacity_();
      if (!protectedCapacity.inspectable || protectedCapacity.manualReviewRequired) throw eeError_('acl_manual_review_required', 'Annual archive custody could not be safely re-verified after protection.');
      if (review.annualArchivesInventoryFingerprint !== protectedCapacity.inventoryFingerprint) {
        CacheService.getScriptCache().remove(annualRolloverReviewCacheKey_(safeId_(request.reviewToken || '', false)));
        throw eeError_('review_stale', 'The reviewed Annual archives inventory changed during protection. No new archive was created; review the rollover again.');
      }
      assertAnnualArchiveCapacity_(protectedCapacity);
      var intent = newAnnualArchiveIntent_(state, actor, review, safeId_(request.reviewToken || '', true), archiveFolder);
      recovery = intent.recovery;
      recordAnnualRolloverRecovery_(recovery);
      archive = completeAnnualArchiveIntent_(recovery, state);
    }
    CacheService.getScriptCache().remove(annualRolloverReviewCacheKey_(safeId_(request.reviewToken || '', false)));
    recordAnnualRolloverRecovery_(recovery);
    var nextWorkspace = workspaceForAnnualRollover_(state.workspace, review.toYear);
    var auditEntry = appendWorkspaceAudit_(nextWorkspace, {
      event: 'ANNUAL_ROLLOVER',
      summary: 'Verified private annual archive created; active evaluation cycles reset for ' + review.toYear,
      entityType: 'annual_archive',
      entityId: archive.id,
      version: 1,
    }, actor);
    recovery.auditEntryId = auditEntry.id;
    recovery.stage = 'workspace_commit';
    recordAnnualRolloverRecovery_(recovery);
    var commit = writeWorkspaceState_(nextWorkspace, state.revision + 1, actor.email, lock);
    var recoveryPending = !!commit.pending;
    if (recoveryPending) {
      try { recoveryPending = !annualRolloverCommitted_(readWorkspaceState_(), recovery); }
      catch (confirmErr) { recoveryPending = true; }
    }
    if (recoveryPending) {
      return { ok: true, status: 'recovery_pending', recoveryPending: true, archive: archive, fromAcademicYear: review.fromYear, toAcademicYear: review.toYear, counts: review.counts };
    }
    var settlement = settleAnnualRolloverSecondary_({ workspace: nextWorkspace, revision: state.revision + 1 }, recovery);
    if (settlement.pending) {
      return { ok: true, status: 'recovery_pending', recoveryPending: true, auditPending: settlement.auditPending, configurationPending: settlement.configurationPending, secondaryCleanupPending: settlement.cleanupPending === true, archive: archive, fromAcademicYear: review.fromYear, toAcademicYear: review.toYear, counts: review.counts };
    }
    writeAnnualRolloverCompletion_({ archiveId: archive.id, archiveUrl: archive.url, archiveHash: archive.hash, fromYear: review.fromYear, toYear: review.toYear, at: archive.archivedAt, actorEmail: actor.email, revision: state.revision + 1, sourceRevision: recovery.sourceRevision, auditEntryId: recovery.auditEntryId, operationKey: recovery.key || '', reviewTokenHash: hashText_(safeId_(request.reviewToken || '', true)), counts: review.counts });
    props.deleteProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
    return { ok: true, status: 'completed', recoveryPending: false, auditPending: false, configurationPending: false, archive: archive, fromAcademicYear: review.fromYear, toAcademicYear: review.toYear, counts: review.counts };
  } catch (err) {
    if (recovery) {
      recovery.errorCode = String(err && err.code || 'server_error');
      recordAnnualRolloverRecovery_(recovery);
      if (err && err.code === 'manual_recovery_required') throw err;
      throw eeError_('rollover_recovery_required', 'Annual rollover has a durable recovery record, but completion was not confirmed. Do not start a new review; run the recovery recheck.');
    }
    throw err;
  } finally { lock.releaseLock(); }
}

function reconcilePortalAnnualRollover() {
  var actor = requireAdmin_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    actor = requireSameAdminLocked_(actor);
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
    if (!raw) {
      var completedReceipt = readAnnualRolloverCompletion_();
      return completedReceipt ? verifiedAnnualRolloverCompletion_(completedReceipt) : { ok: true, status: 'none', recoveryPending: false };
    }
    var recovery = parseAnnualRolloverRecovery_(raw);
    var state = readWorkspaceState_();
    if (Number(recovery.version) === 2 && (recovery.stage === 'archive_intent' || recovery.stage === 'archive_created')) {
      completeAnnualArchiveIntent_(recovery, state);
    }
    var verifiedRecovery = verifiedAnnualRolloverRecoveryArchive_(recovery);
    var archiveFile = verifiedRecovery.file;
    var envelope = verifiedRecovery.envelope;
    if (annualRolloverCommitted_(state, recovery)) {
      var settlement = settleAnnualRolloverSecondary_(state, recovery);
      if (settlement.pending) {
        return { ok: true, status: 'recovery_pending', recoveryPending: true, auditPending: settlement.auditPending, configurationPending: settlement.configurationPending, secondaryCleanupPending: settlement.cleanupPending === true, archive: { id: recovery.archiveId, url: annualArchiveUrl_(archiveFile) }, activeAcademicYear: state.workspace.config.academicYear };
      }
      recovery.archiveUrl = annualArchiveUrl_(archiveFile);
      writeAnnualRolloverCompletion_({ archiveId: recovery.archiveId, archiveUrl: recovery.archiveUrl, archiveHash: recovery.archiveHash, fromYear: recovery.fromYear, toYear: recovery.toYear, at: envelope.archivedAt, actorEmail: recovery.actorEmail, revision: state.revision, sourceRevision: recovery.sourceRevision, auditEntryId: recovery.auditEntryId, operationKey: recovery.key || '', reviewTokenHash: recovery.reviewTokenHash || '', counts: envelope.counts || null });
      props.deleteProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
      return { ok: true, status: 'completed', recoveryPending: false, archive: { id: recovery.archiveId, url: recovery.archiveUrl }, activeAcademicYear: state.workspace.config.academicYear };
    }
    if (Number(state.revision) === Number(recovery.sourceRevision) && safeString_(state.workspace.config.academicYear, 20, '').replace(/[\u2013\u2014]/g, '-') === recovery.fromYear) {
      verifiedAnnualRolloverRecoveryArchive_(recovery, state);
      recovery.stage = 'archive_retry_ready';
      recovery.archiveUrl = annualArchiveUrl_(archiveFile);
      delete recovery.errorCode;
      recordAnnualRolloverRecovery_(recovery);
      return { ok: true, status: 'archive_only', recoveryPending: true, resumable: true, archive: { id: recovery.archiveId, url: recovery.archiveUrl, hash: recovery.archiveHash }, activeAcademicYear: state.workspace.config.academicYear };
    }
    throw eeError_('manual_recovery_required', 'The workspace is neither the reviewed old year nor the confirmed new year. District IT must inspect both the active workspace and archive before any retry.');
  } finally { lock.releaseLock(); }
}

function historicalObservationScore_(domains, frameworkVersion) {
  if (!completeDomains_(domains)) return null;
  var keys = ['d1', 'd2', 'd3', 'd4'];
  var tag = String(frameworkVersion || '');
  if (tag.indexOf('me-') === 0) {
    var total = 0;
    for (var i = 0; i < keys.length; i++) total += Math.round(Number(domains[keys[i]]) * 100);
    return total / (keys.length * 100);
  }
  var weights = { d1: 20, d2: 30, d3: 30, d4: 20 };
  var scaled = 0;
  for (var j = 0; j < keys.length; j++) scaled += Math.round(Number(domains[keys[j]]) * weights[keys[j]] * 100);
  return scaled / 10000;
}

function getPortalCohortStats(request) {
  var actor = currentActor_();
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  if (actor.role === 'teacher') return { ok: true, suppressed: true, minimum: EE_MIN_COHORT, reason: 'teacher_view' };
  var metric = oneOf_(request.metric || 'overall', ['overall', 'finalScore', 'd1', 'd2', 'd3', 'd4'], 'metric');
  var from = optionalDate_(request.from);
  var to = optionalDate_(request.to);
  var workspace = readWorkspaceState_().workspace;
  var selected = findById_(workspace.teachers || [], teacherId);
  if (!selected) throw eeError_('not_found', 'Educator record not found.');
  var allowed = accessibleTeacherIds_(actor, workspace);
  var teachersById = indexById_(workspace.teachers || []);
  var rows = workspace.observations || [];
  var byTeacher = {};
  var selectedValues = [];
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (!row.finalizedAt || !dateInRange_(row.observedAt || row.finalizedAt, from, to)) continue;
    var domains = row.ratings || {};
    var value = metric === 'd1' || metric === 'd2' || metric === 'd3' || metric === 'd4'
      ? numberOrNull_(domains[metric])
      : historicalObservationScore_(domains, row.frameworkVersion);
    if (value === null) continue;
    if (row.teacherId === teacherId) { selectedValues.push(value); continue; }
    if (!allowed[row.teacherId]) continue;
    var peer = teachersById[row.teacherId];
    if (!peer || peer.active === false || peer.building !== selected.building || peer.employeeType !== selected.employeeType) continue;
    if (!byTeacher[row.teacherId]) byTeacher[row.teacherId] = [];
    byTeacher[row.teacherId].push(value);
  }
  var peerMeans = [];
  var peerIds = Object.keys(byTeacher);
  for (var j = 0; j < peerIds.length; j++) peerMeans.push(mean_(byTeacher[peerIds[j]]));
  if (peerMeans.length < EE_MIN_COHORT) return { ok: true, suppressed: true, minimum: EE_MIN_COHORT, metric: metric, source: 'finalized_formal_observations', selectedMean: selectedValues.length ? round_(mean_(selectedValues), 3) : null };
  return { ok: true, suppressed: false, minimum: EE_MIN_COHORT, metric: metric, source: 'finalized_formal_observations', peerCount: peerMeans.length, cohortMedian: round_(median_(peerMeans), 3), selectedMean: selectedValues.length ? round_(mean_(selectedValues), 3) : null, aggregation: 'median_of_distinct_teacher_means' };
}

/* --------------------------- identity / access -------------------------- */

function activeEmail_() {
  var email = '';
  try { email = normalizeEmail_(Session.getActiveUser().getEmail()); } catch (err) {}
  if (!email) throw eeError_('identity_unavailable', 'A managed Google account could not be verified.');
  return email;
}

function currentActor_() {
  if (!repositoryConfigured_()) throw eeError_('not_configured', 'The district repository is not configured.');
  var email = activeEmail_();
  var domain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  if (!domain || emailDomain_(email) !== domain) throw eeError_('wrong_domain', 'This account is outside the allowed district domain.');
  var members = memberObjects_();
  for (var i = 0; i < members.length; i++) {
    if (members[i].email === email && members[i].active) {
      if (members[i].role === 'teacher' && !members[i].teacherId) throw eeError_('membership_invalid', 'Teacher membership has no educator record.');
      return members[i];
    }
  }
  throw eeError_('not_member', 'This managed account is not an active portal member.');
}

function requireAdmin_() {
  var actor = currentActor_();
  if (actor.role !== 'admin') throw eeError_('denied', 'Administrator authority is required.');
  return actor;
}

function requireSameActorLocked_(actor) {
  var lockedActor;
  try { lockedActor = currentActor_(); }
  catch (actorErr) { throw eeError_('denied', 'Portal identity or authority changed while this operation waited for the repository lock. Retry from the current portal session.'); }
  var expectedEmail = normalizeEmail_(actor && actor.email);
  var expectedRole = String(actor && actor.role || '');
  var expectedTeacherId = safeId_(actor && actor.teacherId || '', false);
  var lockedEmail = normalizeEmail_(lockedActor && lockedActor.email);
  var lockedRole = String(lockedActor && lockedActor.role || '');
  var lockedTeacherId = safeId_(lockedActor && lockedActor.teacherId || '', false);
  if (!expectedEmail || lockedEmail !== expectedEmail || lockedRole !== expectedRole || lockedTeacherId !== expectedTeacherId) throw eeError_('denied', 'Portal identity or authority changed while this operation waited for the repository lock. Retry from the current portal session.');
  return lockedActor;
}

function requireSameAdminLocked_(actor) {
  var lockedActor = requireSameActorLocked_(actor);
  if (lockedActor.role !== 'admin') throw eeError_('denied', 'Administrator authority changed while this operation waited for the repository lock. Review the operation again.');
  return lockedActor;
}

function requireTeacherAccess_(actor, teacherId) {
  if (actor.role === 'admin') return true;
  if (actor.role === 'teacher') {
    if (actor.teacherId === teacherId) return true;
    throw eeError_('denied', 'Educator record is outside this account.');
  }
  var assignments = assignmentObjects_();
  for (var i = 0; i < assignments.length; i++) if (assignments[i].active && assignments[i].teacherId === teacherId && assignments[i].evaluatorEmail === actor.email) return true;
  throw eeError_('denied', 'Educator record is not assigned to this evaluator.');
}

function accessibleTeacherIds_(actor, workspace) {
  var ids = {};
  var teachers = workspace.teachers || [];
  if (actor.role === 'admin') {
    for (var i = 0; i < teachers.length; i++) ids[teachers[i].id] = true;
  } else if (actor.role === 'teacher') ids[actor.teacherId] = true;
  else {
    var assignments = assignmentObjects_();
    for (var j = 0; j < assignments.length; j++) if (assignments[j].active && assignments[j].evaluatorEmail === actor.email) ids[assignments[j].teacherId] = true;
  }
  return ids;
}

/* -------------------------- workspace security ------------------------- */

function filterWorkspaceForActor_(workspace, actor) {
  var copy = clone_(workspace);
  var ids = accessibleTeacherIds_(actor, workspace);
  copy.teachers = filterByTeacher_(copy.teachers, ids, true);
  copy.walkthroughs = filterByTeacher_(copy.walkthroughs, ids, false);
  copy.observations = filterByTeacher_(copy.observations, ids, false);
  copy.spms = filterByTeacher_(copy.spms, ids, false);
  copy.comments = filterByTeacher_(copy.comments, ids, false);
  copy.audit = (copy.audit || []).filter(function(item) { return !!ids[item.teacherId] || (actor.role === 'admin' && !item.teacherId); });
  copy.cycleSnapshots = filterByTeacher_(copy.cycleSnapshots, ids, false);
  if (actor.role !== 'admin') {
    delete copy.releaseRegistry;
    for (var releaseIndex = 0; releaseIndex < copy.teachers.length; releaseIndex++) {
      if (copy.teachers[releaseIndex].releasedDoc) delete copy.teachers[releaseIndex].releasedDoc.grants;
    }
  }
  if (actor.role === 'teacher') {
    copy.walkthroughs = copy.walkthroughs.filter(function(item) { return !!item.publishedAt; });
    var visibleWalkthroughIds = {};
    for (var visibleWalkthroughIndex = 0; visibleWalkthroughIndex < copy.walkthroughs.length; visibleWalkthroughIndex++) visibleWalkthroughIds[copy.walkthroughs[visibleWalkthroughIndex].id] = true;
    copy.comments = copy.comments.filter(function(item) { return item.recordType !== 'walkthrough' || !!visibleWalkthroughIds[item.recordId]; });
    for (var teacherIndex = 0; teacherIndex < copy.teachers.length; teacherIndex++) {
      var teacherProfile = copy.teachers[teacherIndex];
      if (!teacherProfile.finalizedAt) {
        teacherProfile.ratings = { domains: emptyDomains_(), building: null, teacher: null, lea: null };
        teacherProfile.annualRationales = emptyRationales_();
        teacherProfile.annualEvidenceRefs = emptyAnnualEvidenceRefs_();
        teacherProfile.finalScore = null;
        teacherProfile.weightSnapshot = null;
      }
    }
    for (var i = 0; i < copy.observations.length; i++) {
      var teacherObservation = copy.observations[i];
      teacherObservation.preConferenceNotes = '';
      if (!teacherObservation.postConferenceAt) teacherObservation.postConferenceNotes = '';
      if (!teacherObservation.evidencePublishedAt) {
        teacherObservation.evidence = '';
        teacherObservation.componentTags = [];
        teacherObservation.privacyChecked = false;
      }
      if (!teacherObservation.evaluatorSignedAt) {
        teacherObservation.ratings = emptyDomains_();
        teacherObservation.rationales = emptyRationales_();
      }
    }
    for (var j = 0; j < copy.spms.length; j++) {
      copy.spms[j].pendingReturnReason = '';
      if (copy.spms[j].status !== 'locked') { copy.spms[j].rating = null; copy.spms[j].ratingRationale = ''; }
    }
    copy.audit = copy.audit.filter(function(item) { return item.teacherId === actor.teacherId && (item.entityType !== 'walkthrough' || !!visibleWalkthroughIds[item.entityId]); });
  } else {
    // Teacher drafts remain private until their explicit submission milestone.
    // The merge layer preserves canonical teacher fields when these redacted
    // placeholders are later posted back as part of a whole-workspace save.
    for (var k = 0; k < copy.observations.length; k++) {
      var evaluatorObservation = copy.observations[k];
      if (!evaluatorObservation.preworkSubmittedAt) evaluatorObservation.prework = emptyPrework_();
      if (!evaluatorObservation.reflectionSubmittedAt) evaluatorObservation.reflection = '';
    }
    for (var m = 0; m < copy.spms.length; m++) redactUnsubmittedSpmForEvaluator_(copy.spms[m]);
  }
  return copy;
}

function emptyPrework_() { return { plan: '', outcomes: '', resources: '', assessment: '', artifactReferences: '' }; }
function emptyDomains_() { return { d1: null, d2: null, d3: null, d4: null }; }
function emptyRationales_() { return { d1: '', d2: '', d3: '', d4: '' }; }
function emptyAnnualEvidenceRefs_() { return { d1: [], d2: [], d3: [], d4: [] }; }
function redactUnsubmittedSpmForEvaluator_(spm) {
  if (spm.status === 'draft') {
    spm.context = ''; spm.baseline = ''; spm.goal = ''; spm.measures = ''; spm.actionPlan = '';
    spm.results = ''; spm.reflection = ''; spm.revisions = [];
    return;
  }
  if (spm.status === 'returned') {
    var revision = spm.revisions && spm.revisions.length ? spm.revisions[spm.revisions.length - 1] : null;
    spm.context = revision ? revision.context : '';
    spm.baseline = revision ? revision.baseline : '';
    spm.goal = revision ? revision.goal : '';
    spm.measures = revision ? revision.measures : '';
    spm.actionPlan = revision ? revision.actionPlan : '';
    spm.results = ''; spm.reflection = '';
    return;
  }
  if (spm.status === 'approved') { spm.results = ''; spm.reflection = ''; }
}function mergeWorkspaceForActor_(current, incoming, actor, rawMutation) {
  var merged = clone_(current);
  var allowed = accessibleTeacherIds_(actor, current);
  if (actor.role === 'admin' && !same_(current.config, incoming.config)) throw eeError_('review_required', 'District configuration changes require an administrator review and explicit confirmation in Setup.');
  merged.config = clone_(current.config);
  mergeTeacherProfiles_(merged, incoming, actor, allowed);
  merged.walkthroughs = mergeRecords_(current.walkthroughs, incoming.walkthroughs, actor, allowed, 'walkthrough', merged.config.frameworkVersion, merged.teachers);
  applyWalkthroughDraftDiscard_(merged, current, incoming, actor, allowed, rawMutation);
  merged.observations = mergeRecords_(current.observations, incoming.observations, actor, allowed, 'observation', merged.config.frameworkVersion, merged.teachers);
  merged.spms = mergeRecords_(current.spms, incoming.spms, actor, allowed, 'spm', merged.config.frameworkVersion, merged.teachers);
  merged.comments = mergeComments_(current.comments || [], incoming.comments || [], actor, allowed, current);
  recomputeCycleStatuses_(merged);
  merged.audit = clone_(current.audit || []); // client audit is never authoritative
  merged.cycleSnapshots = clone_(current.cycleSnapshots || []); // snapshots are server-derived only
  merged.releaseRegistry = clone_(current.releaseRegistry || []); // released-summary ACL ledger is server-derived only
  return merged;
}

function finalizedCycleRecordsComparable_(records, teacherId) {
  return (records || []).filter(function (item) { return item.teacherId === teacherId; }).map(function (item) {
    var comparable = clone_(item);
    // Existing observation/SPM merge helpers refresh this server-owned touch
    // timestamp even for a read-equivalent whole-workspace save. It is not
    // cycle content and must not turn a safe no-op into either a mutation or a
    // false rejection after release.
    delete comparable.updatedAt;
    return comparable;
  });
}

function restoreFinalizedCycleRecords_(merged, current, collection, teacherId) {
  var oldById = indexById_((current[collection] || []).filter(function (item) { return item.teacherId === teacherId; }));
  merged[collection] = (merged[collection] || []).map(function (item) {
    return item.teacherId === teacherId ? clone_(oldById[item.id]) : item;
  });
}

function enforceFinalizedCycleClosure_(current, merged) {
  var collections = ['walkthroughs', 'observations', 'spms', 'comments'];
  (current.teachers || []).forEach(function (oldTeacher) {
    if (!oldTeacher.finalizedAt) return;
    var nextTeacher = findById_(merged.teachers || [], oldTeacher.id);
    if (!nextTeacher || !same_(oldTeacher, nextTeacher)) throw eeError_('immutable', 'A released educator cycle cannot be edited. Start the next cycle through annual rollover.');
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      if (!same_(finalizedCycleRecordsComparable_(current[collection], oldTeacher.id), finalizedCycleRecordsComparable_(merged[collection], oldTeacher.id))) {
        throw eeError_('immutable', 'A released educator cycle cannot be edited. Start the next cycle through annual rollover.');
      }
      // Preserve the exact stored record, including its last legitimate
      // updatedAt, when an authorized projection is posted back unchanged.
      restoreFinalizedCycleRecords_(merged, current, collection, oldTeacher.id);
    }
  });
}

function applyWalkthroughDraftDiscard_(merged, current, incoming, actor, allowed, rawMutation) {
  var mutation = isPlainObject_(rawMutation) ? rawMutation : {};
  if (String(mutation.event || '').toUpperCase() !== 'DRAFT_DISCARDED') return;
  if (actor.role === 'teacher') throw eeError_('denied', 'Educators cannot discard evaluator walkthrough drafts.');
  if (safeToken_(mutation.entityType || '', 60) !== 'walkthrough') throw eeError_('invalid_transition', 'Draft discard must identify a walkthrough record.');
  var recordId = safeId_(mutation.entityId || '', true);
  var teacherId = safeId_(mutation.teacherId || '', true);
  if (!allowed[teacherId]) throw eeError_('denied', 'Walkthrough draft is outside this evaluator assignment.');
  var record = findById_(current.walkthroughs || [], recordId);
  if (!record || record.teacherId !== teacherId) throw eeError_('not_found', 'Walkthrough draft was not found.');
  if (record.publishedAt) throw eeError_('immutable', 'Published walkthrough evidence cannot be discarded.');
  if (findById_(incoming.walkthroughs || [], recordId)) throw eeError_('invalid_transition', 'Discarding a draft requires removing it from the submitted workspace.');
  if ((current.comments || []).some(function (item) { return item.recordType === 'walkthrough' && item.recordId === recordId; })) throw eeError_('immutable', 'A walkthrough draft with shared comments cannot be discarded.');
  merged.walkthroughs = (merged.walkthroughs || []).filter(function (item) { return item.id !== recordId; });
}

function mergeTeacherProfiles_(merged, incoming, actor, allowed) {
  var currentById = indexById_(merged.teachers || []);
  var incomingById = indexById_(incoming.teachers || []);
  var ids = Object.keys(incomingById);
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i];
    var next = incomingById[id];
    var old = currentById[id];
    if (!old) {
      if (actor.role !== 'admin') throw eeError_('denied', 'Only an administrator can create educator records.');
      next.finalizedAt = null; next.cycleLockedAt = null; next.weightSnapshot = null;
      next.finalScore = null; next.cycleStatus = 'not_started'; next.lastActivityAt = null;
      next.releasedDoc = null; // server-owned: only sharePortalReleasedEvaluation writes it
      next.educatorStatement = null; // teacher-owned: adopted only from the educator's own saves
      merged.teachers.push(next);
      allowed[id] = true;
    } else if (allowed[id]) {
      if (actor.role === 'teacher') {
        // Teachers never mutate cycle/profile authority, with ONE exception:
        // the educator statement is THEIR field on THEIR record, editable until
        // the cycle is finalized, then frozen with everything else.
        if (actor.teacherId === id && !old.finalizedAt) {
          var statement = sanitizeEducatorStatement_(next.educatorStatement);
          var mergedTeacher = findById_(merged.teachers, id);
          if (mergedTeacher && !same_(mergedTeacher.educatorStatement || null, statement)) {
            mergedTeacher.educatorStatement = statement ? { text: statement.text, updatedAt: nowIso_() } : null;
            mergedTeacher.lastActivityAt = nowIso_();
          }
        }
        continue;
      }
      // releasedDoc is server-owned (written only by sharePortalReleasedEvaluation)
      // and educatorStatement is teacher-owned. Overwrite the client's copies
      // BEFORE the immutability comparison, so an evaluator holding a stale
      // snapshot doesn't fail finalized-record saves, and can never edit the
      // educator's words.
      next.releasedDoc = old.releasedDoc ? clone_(old.releasedDoc) : null;
      next.educatorStatement = old.educatorStatement ? clone_(old.educatorStatement) : null;
      if (old.finalizedAt && !same_(old, next)) throw eeError_('immutable', 'A released educator cycle cannot be edited.');
      if (old.cycleLockedAt && (old.employeeType !== next.employeeType || old.buildingData !== next.buildingData || old.teacherSpecificData !== next.teacherSpecificData)) {
        throw eeError_('immutable', 'Evaluation weighting inputs cannot change after cycle work begins.');
      }
      var result = clone_(next);
      result.cycleStatus = old.finalizedAt ? 'finalized' : deriveCycleStatus_(old, next, merged);
      result.cycleLockedAt = old.cycleLockedAt || null;
      result.weightSnapshot = old.weightSnapshot ? clone_(old.weightSnapshot) : null;
      result.finalizedAt = old.finalizedAt || (next.finalizedAt ? nowIso_() : null);
      result.finalScore = old.finalizedAt ? old.finalScore : null;
      result.lastActivityAt = same_(old, next) ? old.lastActivityAt : nowIso_();
      replaceById_(merged.teachers, result);
    }
  }
}function mergeRecords_(current, incoming, actor, allowed, kind, frameworkVersion, teachers) {
  var inactiveTeacherIds = {};
  (teachers || []).forEach(function (t) { if (t.active === false) inactiveTeacherIds[t.id] = true; });
  var result = clone_(current || []);
  var oldById = indexById_(current || []);
  var seen = {};
  for (var i = 0; i < incoming.length; i++) {
    var next = incoming[i];
    if (seen[next.id]) throw eeError_('bad_workspace', 'Duplicate record id.');
    seen[next.id] = true;
    if (!allowed[next.teacherId]) throw eeError_('denied', 'Workspace includes an unauthorized educator record.');
    var old = oldById[next.id];
    if (old && old.teacherId !== next.teacherId) throw eeError_('immutable', 'Record ownership cannot change.');
    if (!old) {
      // Personnel-records rule (e.g., Portland PEA Article 16.C): no new
      // performance reports for an archived/separated educator. Existing
      // records stay readable; only CREATION is barred.
      if (inactiveTeacherIds[next.teacherId]) throw eeError_('invalid_transition', 'New records cannot be created for an archived educator; personnel-records rules bar post-severance performance reports.');
      if (actor.role === 'teacher') {
        if (kind !== 'spm') throw eeError_('denied', 'Teachers cannot create this record type.');
        validateTeacherSpm_(null, next);
      } else if (kind === 'spm') {
        throw eeError_('denied', 'An SPM proposal must be created by its educator.');
      }
      if (kind === 'spm' && result.some(function(item) { return item.teacherId === next.teacherId; })) throw eeError_('invalid_transition', 'Only one SPM record is allowed per educator cycle.');
      result.push(serverizeNewRecord_(next, actor, kind, frameworkVersion));
    } else {
      var authorized = authorizeRecordUpdate_(old, next, actor, kind);
      replaceById_(result, authorized);
    }
  }
  return result; // omission never deletes an official record
}

function authorizeRecordUpdate_(old, next, actor, kind) {
  if (kind === 'walkthrough') return authorizeWalkthroughUpdate_(old, next, actor);
  if (kind === 'observation') {
    if (old.finalizedAt && !same_(old, next)) throw eeError_('immutable', 'Finalized formal observations cannot be edited.');
    return actor.role === 'teacher' ? teacherObservationUpdate_(old, next) : evaluatorObservationUpdate_(old, next, actor);
  }
  if (kind === 'spm') {
    if (old.status === 'locked' && !same_(old, next)) throw eeError_('immutable', 'Locked SPM records cannot be edited.');
    return actor.role === 'teacher' ? teacherSpmUpdate_(old, next) : evaluatorSpmUpdate_(old, next, actor);
  }
  throw eeError_('bad_workspace', 'Unknown record type.');
}

function authorizeWalkthroughUpdate_(old, next, actor) {
  if (actor.role === 'teacher') {
    if (!old.publishedAt) throw eeError_('denied', 'Private evaluator drafts are unavailable.');
    if (!sameExcept_(old, next, ['teacherAcknowledgedAt'])) throw eeError_('denied', 'Teachers may only acknowledge published walkthroughs.');
    var teacherResult = clone_(old);
    if (!old.teacherAcknowledgedAt && next.teacherAcknowledgedAt) teacherResult.teacherAcknowledgedAt = nowIso_();
    return teacherResult;
  }
  if (old.publishedAt) {
    if (!sameExcept_(old, next, ['createdAt','updatedAt','startedAt','observer','publishedAt','teacherAcknowledgedAt','version'])) throw eeError_('immutable', 'Published walkthrough evidence and teacher acknowledgment are immutable to evaluators.');
    return clone_(old);
  }
  var evaluatorResult = clone_(old);
  var editable = ['date', 'durationMin', 'announced', 'lessonPhase', 'subject', 'evidence', 'interpretation', 'componentTags', 'privacyChecked'];
  for (var i = 0; i < editable.length; i++) evaluatorResult[editable[i]] = clone_(next[editable[i]]);
  evaluatorResult.updatedAt = nowIso_();
  if (next.publishedAt) {
    if (!evaluatorResult.evidence || !evaluatorResult.privacyChecked) throw eeError_('invalid_transition', 'Publishing requires evidence and privacy review.');
    evaluatorResult.publishedAt = nowIso_();
  }
  return evaluatorResult;
}

function teacherObservationUpdate_(old, next) {
  var result = clone_(old);
  if (!old.preworkSubmittedAt) {
    result.prework = clone_(next.prework);
    if (next.preworkSubmittedAt) {
      if (!result.prework.plan || !result.prework.outcomes) throw eeError_('invalid_transition', 'Pre-observation submission requires a plan and expected outcomes.');
      result.preworkSubmittedAt = nowIso_();
    }
  }
  if (!old.reflectionSubmittedAt) {
    if ((next.reflection || next.reflectionSubmittedAt) && !old.evidencePublishedAt) throw eeError_('invalid_transition', 'Reflection requires published evidence.');
    result.reflection = next.reflection;
    if (next.reflectionSubmittedAt) {
      if (!result.reflection) throw eeError_('invalid_transition', 'Reflection submission requires reflection text.');
      result.reflectionSubmittedAt = nowIso_();
    }
  }
  result.ackChecked = !!next.ackChecked;
  if (!old.teacherAcknowledgedAt && next.teacherAcknowledgedAt) {
    if (!old.evaluatorSignedAt || !result.ackChecked) throw eeError_('invalid_transition', 'Acknowledgment requires the signed assessment and confirmation.');
    result.teacherAcknowledgedAt = nowIso_();
  }
  result.updatedAt = nowIso_();
  return result;
}

function evaluatorObservationUpdate_(old, next, actor) {
  var result = clone_(old);
  var editable = ['preConferenceNotes','observedLocal','evidence','postConferenceNotes','ratings','rationales','componentTags','privacyChecked'];
  for (var editableIndex = 0; editableIndex < editable.length; editableIndex++) result[editable[editableIndex]] = clone_(next[editable[editableIndex]]);
  var requestedMilestones = observationTimestampFields_();
  for (var requestedIndex = 0; requestedIndex < requestedMilestones.length; requestedIndex++) result[requestedMilestones[requestedIndex]] = next[requestedMilestones[requestedIndex]];
  // Preserve teacher-owned fields. A redacted evaluator projection posts
  // blanks for drafts, so the safe merge must copy these from the canonical
  // record instead of treating the placeholder as a teacher edit.
  result.prework = clone_(old.prework);
  result.preworkSubmittedAt = old.preworkSubmittedAt;
  result.reflection = old.reflection;
  result.reflectionSubmittedAt = old.reflectionSubmittedAt;
  result.ackChecked = old.ackChecked;
  result.teacherAcknowledgedAt = old.teacherAcknowledgedAt;
  // Existing milestone timestamps are server facts. New milestones are
  // validated below and server-stamped by canonicalizeServerFields_.
  var milestones = observationTimestampFields_();
  for (var milestoneIndex = 0; milestoneIndex < milestones.length; milestoneIndex++) {
    var milestone = milestones[milestoneIndex];
    if (old[milestone]) result[milestone] = old[milestone];
  }
  // Publication and signature lock their corresponding snapshots. Later
  // context belongs in the append-only conversation, never in-place edits.
  if (old.preConferenceAt) result.preConferenceNotes = old.preConferenceNotes;
  if (old.observedAt) result.observedLocal = old.observedLocal;
  if (old.postConferenceAt) result.postConferenceNotes = old.postConferenceNotes;
  if (old.evidencePublishedAt) {
    result.evidence = old.evidence;
    result.componentTags = clone_(old.componentTags || []);
    result.privacyChecked = old.privacyChecked;
  }
  if (old.evaluatorSignedAt) {
    result.ratings = clone_(old.ratings);
    result.rationales = clone_(old.rationales);
  }
  if (!old.preConferenceAt && next.preConferenceAt && !old.preworkSubmittedAt) throw eeError_('invalid_transition', 'Pre-conference requires submitted teacher prework.');
  if (!old.observedAt && next.observedAt && !(old.preConferenceAt || result.preConferenceAt)) throw eeError_('invalid_transition', 'Observation requires a completed pre-conference.');
  if (!old.evidencePublishedAt && next.evidencePublishedAt) {
    if (!(old.observedAt || result.observedAt) || !result.evidence || !result.privacyChecked) throw eeError_('invalid_transition', 'Evidence publication requires an observation, evidence text, and privacy review.');
  }
  if (!old.postConferenceAt && next.postConferenceAt && !old.reflectionSubmittedAt) throw eeError_('invalid_transition', 'Post-conference requires the submitted teacher reflection.');
  if (!old.evaluatorSignedAt && next.evaluatorSignedAt) {
    if (!(old.postConferenceAt || result.postConferenceAt) || !completeDomains_(result.ratings) || !completeRationales_(result.rationales)) throw eeError_('invalid_transition', 'Evaluator signature requires the post-conference, all domain ratings, and rationales.');
  }
  if (!old.finalizedAt && next.finalizedAt && !(old.teacherAcknowledgedAt && (old.evaluatorSignedAt || result.evaluatorSignedAt))) throw eeError_('invalid_transition', 'Finalization requires evaluator signature and teacher acknowledgment.');
  result.updatedAt = nowIso_();
  return result;
}function validateTeacherSpm_(old, next) {
  if (next.status !== 'draft') throw eeError_('invalid_transition', 'Create the SPM draft before submitting it as a separate audited action.');
  if (next.rating !== null || next.ratingRationale || next.approvedAt || next.lockedAt || next.approvedBy || next.pendingReturnReason) throw eeError_('denied', 'Teacher SPM includes evaluator-only fields.');
  if (next.status === 'submitted' && !spmProposalComplete_(next)) throw eeError_('invalid_transition', 'SPM submission requires the proposal fields.');
}

function teacherSpmUpdate_(old, next) {
  var result = clone_(old);
  if (old.status === 'draft' || old.status === 'returned') {
    copySpmProposal_(result, next);
    if (next.status !== old.status && next.status !== 'submitted') throw eeError_('invalid_transition', 'Invalid teacher SPM status transition.');
    if (next.status === 'submitted') {
      if (!spmProposalComplete_(result)) throw eeError_('invalid_transition', 'SPM submission requires the proposal fields.');
      result.status = 'submitted';
      result.version = old.status === 'returned' ? Math.min(1000, old.version + 1) : old.version;
      result.submittedAt = nowIso_();
      result.returnReason = '';
      result.revisions = (old.revisions || []).concat(serverSpmRevision_(result)).slice(-20);
    }
  } else if (old.status === 'approved') {
    result.results = next.results;
    result.reflection = next.reflection;
    if (next.status !== 'approved' && next.status !== 'results_submitted') throw eeError_('invalid_transition', 'Invalid SPM results transition.');
    if (next.status === 'results_submitted') {
      if (!result.results || !result.reflection) throw eeError_('invalid_transition', 'Results submission requires results and reflection.');
      result.status = 'results_submitted';
      result.resultsSubmittedAt = nowIso_();
    }
  } else if (next.status !== old.status) {
    throw eeError_('immutable', 'Submitted SPM content is awaiting evaluator action.');
  }
  result.updatedAt = nowIso_();
  return result;
}

function evaluatorSpmUpdate_(old, next, actor) {
  var result = clone_(old); // proposal/results/revisions always remain teacher-owned
  var transition = old.status + '>' + next.status;
  var allowed = {
    'submitted>submitted': true, 'submitted>returned': true, 'submitted>approved': true,
    'returned>returned': true, 'approved>approved': true,
    'results_submitted>results_submitted': true, 'results_submitted>locked': true
  };
  if (!allowed[transition]) throw eeError_('invalid_transition', 'Invalid evaluator SPM status transition.');
  if (old.status === 'submitted') { result.pendingReturnReason = next.pendingReturnReason; if (!old.firstOpenedAt && next.firstOpenedAt) result.firstOpenedAt = nowIso_(); }
  if (next.status === 'returned' && old.status === 'submitted') {
    if (!old.firstOpenedAt) throw eeError_('invalid_transition', 'Open the submitted SPM before recording a decision.');
    if (!result.pendingReturnReason) throw eeError_('invalid_transition', 'Returning an SPM requires a reason.');
    result.status = 'returned'; result.returnedAt = nowIso_(); result.returnReason = result.pendingReturnReason; result.pendingReturnReason = '';
  } else if (next.status === 'approved' && old.status === 'submitted') {
    if (!old.firstOpenedAt) throw eeError_('invalid_transition', 'Open the submitted SPM before recording a decision.');
    result.status = 'approved'; result.approvedAt = nowIso_(); result.firstOpenedAt = old.firstOpenedAt; result.approvedBy = actor.displayName; result.pendingReturnReason = '';
  } else if (old.status === 'results_submitted') {
    result.rating = next.rating; result.ratingRationale = next.ratingRationale;
    if (next.status === 'locked') {
      if (result.rating === null || !result.ratingRationale) throw eeError_('invalid_transition', 'Finalizing an SPM requires a rating and rationale.');
      result.status = 'locked'; result.lockedAt = nowIso_();
    }
  }
  result.updatedAt = nowIso_();
  return result;
}

function copySpmProposal_(target, source) {
  var fields = ['context', 'baseline', 'goal', 'measures', 'actionPlan'];
  for (var i = 0; i < fields.length; i++) target[fields[i]] = source[fields[i]];
}
function spmProposalComplete_(spm) { return !!(spm.context && spm.baseline && spm.goal && spm.measures && spm.actionPlan); }
function serverSpmRevision_(spm) { return { version: spm.version, submittedAt: spm.submittedAt, context: spm.context, baseline: spm.baseline, goal: spm.goal, measures: spm.measures, actionPlan: spm.actionPlan }; }
function completeDomains_(ratings) { return !!ratings && ['d1','d2','d3','d4'].every(function(key) { var value=numberOrNull_(ratings[key]);return value!==null&&Math.floor(value)===value; }); }
function completeRationales_(rationales) { return !!rationales && ['d1','d2','d3','d4'].every(function(key) { return !!String(rationales[key] || '').trim(); }); }function mergeComments_(current, incoming, actor, allowed, workspace) {
  var result = clone_(current);
  var oldById = indexById_(current);
  for (var i = 0; i < incoming.length; i++) {
    var item = incoming[i];
    if (!allowed[item.teacherId]) throw eeError_('denied', 'Comment is outside the authorized educator record.');
    if (oldById[item.id]) {
      if (!sameCommentSemantics_(oldById[item.id], item)) throw eeError_('immutable', 'Published comments are append-only.');
      continue;
    }
    requireRecord_(workspace, item.teacherId, item.recordType, item.recordId, actor);
    item.author = actor.displayName; item.role = actor.role === 'teacher' ? 'Teacher' : 'Evaluator'; item.authorEmail = actor.email; item.authorRole = actor.role; item.at = nowIso_(); item.version = 1;
    result.push(item);
  }
  return result;
}
function syncMessages_(workspace){var rows=dataRows_(repositorySpreadsheet_().getSheetByName('Messages'),8),existing={};for(var i=0;i<rows.length;i++)existing[String(rows[i][0])]=true;var comments=workspace.comments||[];for(var j=0;j<comments.length;j++){var item=comments[j];if(existing[item.id])continue;appendRow_('Messages',[item.id,item.teacherId,item.recordType,item.recordId,item.authorEmail||'',item.authorRole||'',item.text,item.at]);existing[item.id]=true;}}
function sameCommentSemantics_(a,b){return a.teacherId===b.teacherId&&a.recordType===b.recordType&&a.recordId===b.recordId&&a.text===b.text;}function serverizeNewRecord_(record, actor, kind, frameworkVersion) {
  var next = clone_(record);
  var now = nowIso_();
  next.createdAt = now; next.updatedAt = now; next.version = 1;
  if (kind === 'walkthrough') {
    next.observer = actor.displayName; next.createdByEmail = actor.email; next.startedAt = now; next.teacherAcknowledgedAt = null;
    if (next.publishedAt) {
      if (!next.evidence || !next.privacyChecked) throw eeError_('invalid_transition', 'Publishing requires evidence and privacy review.');
      next.publishedAt = now;
    }
  }
  if (kind === 'observation') {
    next.frameworkVersion = safeString_(frameworkVersion, 80, 'PA Act 13 / Danielson 2021');
    // A newly assigned observation is evaluator-owned scaffolding only. The
    // educator must author and submit these fields through their own account.
    next.prework = emptyPrework_();
    next.reflection = '';
    next.ackChecked = false;
    next.teacherAcknowledgedAt = null;
    var timestampFields = observationTimestampFields_();
    for (var i = 0; i < timestampFields.length; i++) next[timestampFields[i]] = null;
  }
  if (kind === 'spm') {
    validateTeacherSpm_(null, next);
    next.revisions = []; next.rating = null; next.ratingRationale = ''; next.approvedBy = '';
    next.firstOpenedAt = null; next.returnedAt = null; next.approvedAt = null; next.resultsSubmittedAt = null; next.lockedAt = null;
    if (next.status === 'submitted') {
      next.submittedAt = now;
      next.revisions = [serverSpmRevision_(next)];
    } else next.submittedAt = null;
  }
  return next;
}

function canonicalizeServerFields_(oldWorkspace, workspace, actor) {
  var oldWalk = indexById_(oldWorkspace.walkthroughs || []);
  var oldObs = indexById_(oldWorkspace.observations || []);
  var oldSpm = indexById_(oldWorkspace.spms || []);
  canonicalizeTimes_(workspace.walkthroughs, oldWalk, ['publishedAt', 'teacherAcknowledgedAt']);
  canonicalizeTimes_(workspace.observations, oldObs, observationTimestampFields_());
  canonicalizeSpmTimes_(workspace.spms, oldSpm);
  for (var i = 0; i < workspace.teachers.length; i++) {
    var oldTeacher = findById_(oldWorkspace.teachers || [], workspace.teachers[i].id);
    if (oldTeacher) canonicalizeOneTimes_(workspace.teachers[i], oldTeacher, ['finalizedAt', 'cycleLockedAt']);
  }
}

function canonicalizeSpmTimes_(records,oldById){var statusFields={submitted:'submittedAt',returned:'returnedAt',approved:'approvedAt',results_submitted:'resultsSubmittedAt',locked:'lockedAt'};for(var i=0;i<records.length;i++){var next=records[i],old=oldById[next.id];if(!old)continue;next.firstOpenedAt=old.firstOpenedAt||(next.firstOpenedAt?nowIso_():null);var fields=['submittedAt','returnedAt','approvedAt','resultsSubmittedAt','lockedAt'];for(var j=0;j<fields.length;j++){var field=fields[j],transitionField=statusFields[next.status];if(old.status!==next.status&&transitionField===field)next[field]=nowIso_();else next[field]=old[field]||null;}}}
function canonicalizeTimes_(records, oldById, fields) {
  for (var i = 0; i < records.length; i++) {
    var old = oldById[records[i].id];
    if (old) canonicalizeOneTimes_(records[i], old, fields);
  }
}

function canonicalizeOneTimes_(next, old, fields) {
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    if (old[field]) next[field] = old[field];
    else if (next[field]) next[field] = nowIso_();
    else next[field] = null;
  }
}

function freezeCycleWeights_(oldWorkspace, workspace) {
  for (var i = 0; i < workspace.teachers.length; i++) {
    var teacher = workspace.teachers[i];
    var old = findById_(oldWorkspace.teachers || [], teacher.id);
    if (old && old.cycleLockedAt) {
      teacher.cycleLockedAt = old.cycleLockedAt;
      teacher.weightSnapshot = clone_(old.weightSnapshot || serverWeightProfile_(old, workspace.config));
    } else if (teacher.cycleLockedAt || hasCycleActivity_(workspace, teacher)) {
      teacher.cycleLockedAt = nowIso_();
      teacher.weightSnapshot = serverWeightProfile_(teacher, workspace.config);
    } else {
      teacher.cycleLockedAt = null;
      teacher.weightSnapshot = null;
    }
  }
}

function recomputeCycleStatuses_(workspace){for(var i=0;i<(workspace.teachers||[]).length;i++){var teacher=workspace.teachers[i];teacher.cycleStatus=teacher.finalizedAt?'finalized':deriveCycleStatus_(null,teacher,workspace);}}
function deriveCycleStatus_(old,teacher,workspace){if(old&&old.finalizedAt)return'finalized';var waitingTeacher=(workspace.observations||[]).some(function(x){return x.teacherId===teacher.id&&((x.evidencePublishedAt&&!x.reflectionSubmittedAt)||(x.evaluatorSignedAt&&!x.teacherAcknowledgedAt));});if(waitingTeacher)return'awaiting_teacher';var waitingEvaluator=(workspace.observations||[]).some(function(x){return x.teacherId===teacher.id&&((x.preworkSubmittedAt&&!x.preConferenceAt)||(x.reflectionSubmittedAt&&!x.postConferenceAt));})||(workspace.spms||[]).some(function(x){return x.teacherId===teacher.id&&(x.status==='submitted'||x.status==='results_submitted');});if(waitingEvaluator)return'awaiting_evaluator';return hasCycleActivity_(workspace,teacher)?'in_progress':'not_started';}
function hasCycleActivity_(workspace, teacher) {
  var id = teacher.id;
  if ((workspace.walkthroughs || []).some(function(x) { return x.teacherId === id; })) return true;
  if ((workspace.observations || []).some(function(x) { return x.teacherId === id; })) return true;
  if ((workspace.spms || []).some(function(x) { return x.teacherId === id; })) return true;
  var ratings = teacher.ratings || { domains: {} };
  return [ratings.domains.d1, ratings.domains.d2, ratings.domains.d3, ratings.domains.d4, ratings.building, ratings.teacher, ratings.lea].some(function(v) { return numberOrNull_(v) !== null; });
}

function serverWeightProfile_(teacher, config) {
  // Portland ME guidebook profile: practice only, the guidebook publishes a
  // categorical practice roll-up and defers the growth combination to later
  // plan documents, so no combined weights exist to encode.
  if (config && config.frameworkProfile === 'portland_me') {
    return [{ id: 'observation', label: 'Educator Practice (Portland Framework for Teaching)', short: 'EP', weight: 100, color: '#1d4ed8' }];
  }
  // Maine PEPG: two locally weighted categories entered from the district's
  // plan; never invented server-side. SLG reuses the generic `lea` slot.
  if (config && config.frameworkProfile === 'maine_pepg') {
    var practiceWeight = config.pepgPracticeWeight;
    if (practiceWeight == null) return [{ id: 'observation', label: 'Professional Practice', short: 'PP', weight: 100, color: '#1d4ed8' }];
    var pepgParts = [
      { id: 'observation', label: 'Professional Practice', short: 'PP', weight: practiceWeight, color: '#1d4ed8' },
      { id: 'lea', label: 'Student Learning & Growth', short: 'SLG', weight: 100 - practiceWeight, color: '#b45309' }
    ];
    return pepgParts.filter(function(part) { return part.weight > 0; });
  }
  if (teacher.employeeType === 'temporary') return [{ id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: 100, color: '#1d4ed8' }];
  var hasBuilding = teacher.buildingData !== false;
  var hasTeacher = teacher.teacherSpecificData !== false;
  var parts = [
    { id: 'observation', label: 'Observation & Practice', short: 'O&P', weight: hasBuilding ? 70 : 80, color: '#1d4ed8' },
    { id: 'building', label: 'Building Level Data', short: 'BLD', weight: hasBuilding ? 10 : 0, color: '#0f766e' },
    { id: 'teacher', label: 'Teacher-Specific Data', short: 'TSD', weight: hasTeacher ? 10 : 0, color: '#7c3aed' },
    { id: 'lea', label: 'LEA Selected Measure / SPM', short: 'SPM', weight: hasTeacher ? 10 : 20, color: '#b45309' }
  ];
  return parts.filter(function(part) { return part.weight > 0; });
}

function deriveFinalizedSnapshots_(oldWorkspace, workspace, actor, rawMutation) {
  workspace.cycleSnapshots = clone_(oldWorkspace.cycleSnapshots || []);
  for (var i = 0; i < workspace.teachers.length; i++) {
    var teacher = workspace.teachers[i];
    var old = findById_(oldWorkspace.teachers || [], teacher.id);
    if (old && old.finalizedAt) continue;
    if (!teacher.finalizedAt) { teacher.finalScore = null; continue; }
    if (actor.role === 'teacher' || !isPlainObject_(rawMutation) || String(rawMutation.event || '').toUpperCase() !== 'RELEASED' || safeId_(rawMutation.teacherId || '', false) !== teacher.id) {
      throw eeError_('invalid_transition', 'Annual release requires an authorized RELEASED action for this educator.');
    }
    var score = serverOverallScore_(teacher, workspace.config);
    if (score === null) throw eeError_('invalid_transition', 'Annual release requires every weighted rating input.');
    validateAnnualJudgmentProvenance_(teacher, workspace);
    var academicYear = workspace.config.academicYear;
    for (var j = 0; j < workspace.cycleSnapshots.length; j++) {
      if (workspace.cycleSnapshots[j].teacherId === teacher.id && workspace.cycleSnapshots[j].academicYear === academicYear) throw eeError_('immutable', 'A finalized snapshot already exists for this educator and academic year.');
    }
    teacher.finalizedAt = nowIso_(); teacher.finalScore = serverRoundedScore_(score); teacher.cycleStatus = 'finalized';
    teacher.frameworkVersion = eeFrameworkTag_(workspace.config);
    workspace.cycleSnapshots.push({
      id: newId_('cycle'), teacherId: teacher.id, staffCodeSnapshot: teacher.code,
      academicYear: academicYear, buildingSnapshot: teacher.building, employeeTypeSnapshot: teacher.employeeType,
      finalizedAt: teacher.finalizedAt, finalScore: teacher.finalScore,
      domainRatings: clone_(teacher.ratings.domains),
      annualRationales: clone_(teacher.annualRationales), annualEvidenceRefs: clone_(teacher.annualEvidenceRefs),
      weightSnapshot: clone_(teacher.weightSnapshot),
      frameworkVersion: teacher.frameworkVersion
    });
  }
}

function validateAnnualJudgmentProvenance_(teacher, workspace) {
  var rationales = sanitizeAnnualRationales_(teacher.annualRationales);
  var evidenceRefs = sanitizeAnnualEvidenceRefs_(teacher.annualEvidenceRefs);
  var domains = teacher.ratings && teacher.ratings.domains ? teacher.ratings.domains : {};
  var keys = ['d1','d2','d3','d4'];
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (numberOrNull_(domains[key]) === null) continue;
    if (!rationales[key]) throw eeError_('invalid_transition', 'Annual release requires a written rationale for every rated domain.');
    if (!evidenceRefs[key].length) throw eeError_('invalid_transition', 'Annual release requires at least one eligible evidence record for every rated domain.');
    for (var j = 0; j < evidenceRefs[key].length; j++) resolveAnnualEvidenceRef_(workspace, teacher.id, evidenceRefs[key][j], true);
  }
  teacher.annualRationales = rationales;
  teacher.annualEvidenceRefs = evidenceRefs;
}

function resolveAnnualEvidenceRef_(workspace, teacherId, token, required) {
  var canonical = sanitizeAnnualEvidenceToken_(token);
  var splitAt = canonical.indexOf(':');
  var type = canonical.slice(0, splitAt), id = canonical.slice(splitAt + 1), record = null, eligible = false, title = '', date = '';
  if (type === 'walkthrough') {
    record = findById_(workspace.walkthroughs || [], id);
    eligible = !!(record && record.teacherId === teacherId && record.publishedAt);
    title = record && record.subject ? 'Walkthrough: ' + safeString_(record.subject, 160, '') : 'Walkthrough observation';
    date = record ? (record.date || record.publishedAt || '') : '';
  } else if (type === 'formal_observation') {
    record = findById_(workspace.observations || [], id);
    eligible = !!(record && record.teacherId === teacherId && record.evidencePublishedAt);
    title = 'Formal observation';
    date = record ? (record.observedAt || record.evidencePublishedAt || '') : '';
  } else if (type === 'spm') {
    record = findById_(workspace.spms || [], id);
    eligible = !!(record && record.teacherId === teacherId && record.status === 'locked');
    title = record && record.goal ? 'Student performance measure: ' + safeString_(record.goal, 160, '') : 'Student performance measure';
    date = record ? (record.lockedAt || record.resultsSubmittedAt || record.approvedAt || '') : '';
  }
  if (!eligible) {
    if (required) throw eeError_('invalid_transition', 'Annual evidence must reference this educator\'s published walkthrough, published formal-observation evidence, or locked student performance measure.');
    return null;
  }
  return { token: canonical, type: type, id: id, title: title, date: date };
}

// Framework-aware practice composite. PA uses the statutory 20/30/30/20;
// the Maine profiles average equally (no statutory within-practice weights).
// This MUST agree with the client's aeObservationScore or the released
// finalScore disagrees with the number the evaluator watched on screen.
function serverObservationScore_(domains, config) {
  if (!completeDomains_(domains)) return null;
  var keys = ['d1','d2','d3','d4'];
  var profile = config && config.frameworkProfile;
  if (profile === 'maine_pepg' || profile === 'portland_me') {
    var total = 0;
    for (var j = 0; j < keys.length; j++) total += Math.round(Number(domains[keys[j]]) * 100);
    return total / (keys.length * 100);
  }
  var weights = { d1: 20, d2: 30, d3: 30, d4: 20 };
  var scaled = 0;
  for (var i = 0; i < keys.length; i++) scaled += Math.round(Number(domains[keys[i]]) * weights[keys[i]] * 100);
  return scaled / 10000;
}

// Profile id -> the same immutable era tag the client stamps, so historical
// records always know which arithmetic created them.
function eeFrameworkTag_(config) {
  var profile = config && config.frameworkProfile;
  if (profile === 'pa_act13') return 'pa-act13-classroom-2021';
  if (profile === 'portland_me') return 'me-portland-pepg-guidebook-v1';
  return 'me-pepg-local';
}

function serverOverallScore_(teacher, config) {
  var observation = serverObservationScore_(teacher.ratings && teacher.ratings.domains, config);
  if (observation === null) return null;
  var factors = { observation: observation, building: numberOrNull_(teacher.ratings.building), teacher: numberOrNull_(teacher.ratings.teacher), lea: numberOrNull_(teacher.ratings.lea) };
  var profile = teacher.weightSnapshot || serverWeightProfile_(teacher), scaled = 0;
  for (var i = 0; i < profile.length; i++) {
    var value = factors[profile[i].id];
    if (value === null || value === undefined) return null;
    scaled += Math.round(value * profile[i].weight * 100);
  }
  return scaled / 10000;
}

function serverRoundedScore_(value) {
  var truncated = Math.floor((Number(value) + 1e-12) * 1000) / 1000;
  return Math.round((truncated + 1e-12) * 100) / 100;
}

function deriveMutation_(raw, oldWorkspace, nextWorkspace, actor) {
  raw = isPlainObject_(raw) ? raw : {};
  var event = String(raw.event || '').toUpperCase();
  if (['DRAFT_SAVED', 'PROFILE_UPDATED', 'RATING_UPDATED', 'CONFIG_UPDATED', 'UPDATED', ''].indexOf(event) !== -1) { if (durableMilestoneChanges_(oldWorkspace,nextWorkspace).length) throw eeError_('invalid_transition','A durable workflow milestone requires its exact audited action.'); return null; }
  var allowedEvents = {
    CREATED: 'Record created', ASSIGNED: 'Formal observation assigned', OPENED: 'Record first opened by evaluator',
    EVIDENCE_PUBLISHED: 'Evidence published to educator', ACKNOWLEDGED: 'Receipt acknowledged',
    SUBMITTED: 'Record submitted', CONFERENCED: 'Conference recorded', OBSERVATION_STARTED: 'Observation recorded',
    SIGNED: 'Evaluator signature recorded', FINALIZED: 'Record finalized', APPROVED: 'Record approved',
    RETURNED: 'Record returned for revision', RELEASED: 'Annual cycle released', DRAFT_DISCARDED: 'Unpublished walkthrough draft discarded',
    PROFILE_UPDATED: 'Educator profile updated', COMMENTED: 'Shared comment posted'
  };
  if (!allowedEvents[event]) { if (durableMilestoneChanges_(oldWorkspace,nextWorkspace).length) throw eeError_('invalid_transition','A durable workflow change requires its exact audited action.'); return null; }
  if (actor.role === 'teacher' && ['ASSIGNED', 'EVIDENCE_PUBLISHED', 'CONFERENCED', 'OBSERVATION_STARTED', 'SIGNED', 'FINALIZED', 'APPROVED', 'RETURNED', 'RELEASED', 'PROFILE_UPDATED', 'DRAFT_DISCARDED'].indexOf(event) !== -1) throw eeError_('denied', 'The requested workflow event requires evaluator authority.');
  var teacherId = safeId_(raw.teacherId || '', false);
  if (teacherId) requireTeacherAccess_(actor, teacherId);
  var entityType = safeToken_(raw.entityType || 'workspace', 60);
  var entityId = safeId_(raw.entityId || '', false);
  var pair = entityPair_(entityType, entityId, oldWorkspace, nextWorkspace);
  var bound = pair.next || pair.old;
  if (bound && bound.teacherId !== undefined && bound.teacherId !== teacherId) throw eeError_('invalid_transition', 'Audit educator does not match the changed record.');
  var milestones = durableMilestoneChanges_(oldWorkspace, nextWorkspace);
  if (milestones.length !== 1 || !sameMilestone_(milestones[0], event, teacherId, entityType, entityId)) throw eeError_('invalid_transition', 'Each save must contain exactly its requested workflow milestone.');
  if (!mutationOccurred_(event, teacherId, entityType, entityId, oldWorkspace, nextWorkspace)) throw eeError_('invalid_transition', 'The requested audit milestone did not occur.');
  return { teacherId: teacherId, event: event, summary: allowedEvents[event], entityType: entityType || 'workspace', entityId: entityId, version: clampInt_(raw.version, 1, 1000, 1) };
}

function durableMilestoneChanges_(oldWorkspace,nextWorkspace){var out=[];collectNewRecordMilestones_(out,'educator_cycle',oldWorkspace.teachers||[],nextWorkspace.teachers||[]);collectNewRecordMilestones_(out,'walkthrough',oldWorkspace.walkthroughs||[],nextWorkspace.walkthroughs||[]);collectNewRecordMilestones_(out,'formal_observation',oldWorkspace.observations||[],nextWorkspace.observations||[]);collectNewRecordMilestones_(out,'spm',oldWorkspace.spms||[],nextWorkspace.spms||[]);collectDeletedWalkthroughMilestones_(out,oldWorkspace.walkthroughs||[],nextWorkspace.walkthroughs||[]);collectMilestones_(out,'walkthrough',oldWorkspace.walkthroughs||[],nextWorkspace.walkthroughs||[],['publishedAt:EVIDENCE_PUBLISHED','teacherAcknowledgedAt:ACKNOWLEDGED']);collectMilestones_(out,'formal_observation',oldWorkspace.observations||[],nextWorkspace.observations||[],['preworkSubmittedAt:SUBMITTED','preConferenceAt:CONFERENCED','observedAt:OBSERVATION_STARTED','evidencePublishedAt:EVIDENCE_PUBLISHED','reflectionSubmittedAt:SUBMITTED','postConferenceAt:CONFERENCED','evaluatorSignedAt:SIGNED','teacherAcknowledgedAt:ACKNOWLEDGED','finalizedAt:FINALIZED']);collectMilestones_(out,'spm',oldWorkspace.spms||[],nextWorkspace.spms||[],['firstOpenedAt:OPENED']);collectSpmStatusMilestones_(out,oldWorkspace.spms||[],nextWorkspace.spms||[]);collectNewCommentMilestones_(out,oldWorkspace.comments||[],nextWorkspace.comments||[]);collectMilestones_(out,'educator_cycle',oldWorkspace.teachers||[],nextWorkspace.teachers||[],['finalizedAt:RELEASED']);return out;}
function collectNewRecordMilestones_(out,type,oldItems,nextItems){var oldById=indexById_(oldItems);for(var i=0;i<nextItems.length;i++){var next=nextItems[i];if(oldById[next.id])continue;var event=type==='formal_observation'?'ASSIGNED':(type==='walkthrough'&&next.publishedAt?'EVIDENCE_PUBLISHED':'CREATED');out.push({event:event,teacherId:type==='educator_cycle'?next.id:next.teacherId,entityType:type,entityId:next.id});}}
function collectDeletedWalkthroughMilestones_(out,oldItems,nextItems){var nextById=indexById_(nextItems);for(var i=0;i<oldItems.length;i++){var old=oldItems[i];if(!old.publishedAt&&!nextById[old.id])out.push({event:'DRAFT_DISCARDED',teacherId:old.teacherId,entityType:'walkthrough',entityId:old.id});}}
function collectMilestones_(out,type,oldItems,nextItems,specs){var oldById=indexById_(oldItems);for(var i=0;i<nextItems.length;i++){var next=nextItems[i],old=oldById[next.id];if(!old)continue;for(var j=0;j<specs.length;j++){var parts=specs[j].split(':');if(!old[parts[0]]&&next[parts[0]])out.push({event:parts[1],teacherId:next.teacherId===undefined?next.id:next.teacherId,entityType:type,entityId:next.id});}}}
function collectSpmStatusMilestones_(out,oldItems,nextItems){var oldById=indexById_(oldItems),events={submitted:'SUBMITTED',returned:'RETURNED',approved:'APPROVED',results_submitted:'SUBMITTED',locked:'FINALIZED'};for(var i=0;i<nextItems.length;i++){var next=nextItems[i],old=oldById[next.id];if(old&&old.status!==next.status&&events[next.status])out.push({event:events[next.status],teacherId:next.teacherId,entityType:'spm',entityId:next.id});}}
function collectNewCommentMilestones_(out,oldItems,nextItems){var oldById=indexById_(oldItems);for(var i=0;i<nextItems.length;i++){var item=nextItems[i];if(!oldById[item.id])out.push({event:'COMMENTED',teacherId:item.teacherId,entityType:item.recordType,entityId:item.recordId});}}
function sameMilestone_(milestone,event,teacherId,entityType,entityId){return milestone.event===event&&milestone.teacherId===teacherId&&milestone.entityType===entityType&&milestone.entityId===entityId;}
function mutationOccurred_(event, teacherId, entityType, entityId, oldWorkspace, nextWorkspace) {
  if (event === 'RELEASED') { var ot=findById_(oldWorkspace.teachers||[],teacherId),nt=findById_(nextWorkspace.teachers||[],teacherId); return !!nt && !(ot&&ot.finalizedAt) && !!nt.finalizedAt; }
  if (event === 'PROFILE_UPDATED') { var op=findById_(oldWorkspace.teachers||[],teacherId),np=findById_(nextWorkspace.teachers||[],teacherId); return !!op&&!!np&&!same_(op,np); }
  if (event === 'COMMENTED') { var changes=durableMilestoneChanges_(oldWorkspace,nextWorkspace);return changes.length===1&&sameMilestone_(changes[0],event,teacherId,entityType,entityId); }
  var pair = entityPair_(entityType, entityId, oldWorkspace, nextWorkspace), old = pair.old, next = pair.next;
  if (event === 'CREATED' || event === 'ASSIGNED') return !old && !!next;
  if (event === 'DRAFT_DISCARDED') return !!old && !old.publishedAt && !next;
  if (event === 'EVIDENCE_PUBLISHED' && !old && next) return !!(next.publishedAt || next.evidencePublishedAt);
  if (event === 'OPENED') return !!old && !!next && !old.firstOpenedAt && !!next.firstOpenedAt;
  if (!old || !next) return false;
  if (event === 'EVIDENCE_PUBLISHED') return (!old.publishedAt&&!!next.publishedAt)||(!old.evidencePublishedAt&&!!next.evidencePublishedAt);
  if (event === 'ACKNOWLEDGED') return !old.teacherAcknowledgedAt&&!!next.teacherAcknowledgedAt;
  if (event === 'SUBMITTED') return (!old.preworkSubmittedAt&&!!next.preworkSubmittedAt)||(!old.reflectionSubmittedAt&&!!next.reflectionSubmittedAt)||(old.status!==next.status&&(next.status==='submitted'||next.status==='results_submitted'));
  if (event === 'CONFERENCED') return (!old.preConferenceAt&&!!next.preConferenceAt)||(!old.postConferenceAt&&!!next.postConferenceAt);
  if (event === 'OBSERVATION_STARTED') return !old.observedAt&&!!next.observedAt;
  if (event === 'SIGNED') return !old.evaluatorSignedAt&&!!next.evaluatorSignedAt;
  if (event === 'FINALIZED') return (!old.finalizedAt&&!!next.finalizedAt)||(old.status!=='locked'&&next.status==='locked');
  if (event === 'APPROVED') return old.status!=='approved'&&next.status==='approved';
  if (event === 'RETURNED') return old.status!=='returned'&&next.status==='returned';
  return false;
}

function entityPair_(type,id,oldWorkspace,nextWorkspace) {
  var key = type === 'walkthrough' ? 'walkthroughs' : (type === 'formal_observation' ? 'observations' : (type === 'spm' ? 'spms' : 'teachers'));
  return { old: findById_(oldWorkspace[key] || [], id), next: findById_(nextWorkspace[key] || [], id) };
}/* -------------------------- strict sanitization ------------------------ */

function sanitizeWorkspace_(raw) {
  requireObject_(raw, 'workspace');
  var serialized = JSON.stringify(raw);
  if (serialized.length > EE_MAX_WORKSPACE_BYTES) throw eeError_('too_large', 'Workspace exceeds the server size limit.');
  validateJsonTree_(raw, 0);
  var config = sanitizeConfig_(raw.config);
  var result = {
    kind: 'alloflow-educator-evaluation-workspace', version: 1, config: config,
    teachers: mapLimited_(raw.teachers, 1000, sanitizeTeacher_),
    walkthroughs: mapLimited_(raw.walkthroughs, 5000, sanitizeWalkthrough_),
    observations: mapLimited_(raw.observations, 5000, sanitizeObservation_),
    spms: mapLimited_(raw.spms, 1000, sanitizeSpm_),
    comments: mapLimited_(raw.comments, 5000, sanitizeComment_),
    audit: [],
    cycleSnapshots: mapLimited_(raw.cycleSnapshots, 5000, sanitizeSnapshot_),
    releaseRegistry: mapLimited_(raw.releaseRegistry || [], 5000, sanitizeReleaseRegistryEntry_)
  };
  assertUniqueIds_(result.teachers, 'educator');
  assertUniqueIds_(result.walkthroughs, 'walkthrough');
  assertUniqueIds_(result.observations, 'formal observation');
  assertUniqueIds_(result.spms, 'SPM');
  assertUniqueIds_(result.releaseRegistry, 'released summary');
  return result;
}

function sanitizeConfig_(v) {
  v = requireObject_(v || {}, 'config');
  var profile = oneOf_(v.frameworkProfile || 'maine_pepg', ['pa_act13', 'maine_pepg', 'portland_me'], 'frameworkProfile');
  return {
    organization: safeString_(v.organization,160,'District'), building: safeString_(v.building,160,''), academicYear: safeString_(v.academicYear,20,''),
    evaluatorName: safeString_(v.evaluatorName,160,'Evaluator'), evaluatorInitials: safeString_(v.evaluatorInitials,12,''),
    frameworkVersion: eeFrameworkTag_({ frameworkProfile: profile }), frameworkProfile: profile,
    pepgPracticeWeight: profile === 'maine_pepg' && !(v.pepgPracticeWeight == null || String(v.pepgPracticeWeight) === '') ? clampInt_(v.pepgPracticeWeight, 0, 100, 0) : null,
    aiReflectionEnabled: !!v.aiReflectionEnabled,
    sampleMode: false,
  };
}
function sanitizeTeacher_(v) { v=requireObject_(v,'teacher'); var ratings=requireObject_(v.ratings||{},'ratings'); return { id:safeId_(v.id,true), code:safeString_(v.code,40,''), name:safeString_(v.name,160,''), building:safeString_(v.building,160,''), assignment:safeString_(v.assignment,240,''), employeeType:v.employeeType==='temporary'?'temporary':'professional', buildingData:!!v.buildingData, teacherSpecificData:!!v.teacherSpecificData, active:v.active!==false, evaluator:safeString_(v.evaluator,160,''), dueDate:optionalDate_(v.dueDate), cycleStatus:oneOf_(v.cycleStatus||'not_started',['not_started','in_progress','awaiting_teacher','awaiting_evaluator','finalized'],'cycleStatus'), lastActivityAt:optionalTimestamp_(v.lastActivityAt), finalizedAt:optionalTimestamp_(v.finalizedAt), cycleLockedAt:optionalTimestamp_(v.cycleLockedAt), frameworkVersion:safeString_(v.frameworkVersion,80,'PA Act 13 / Danielson 2021'), weightSnapshot:sanitizeWeights_(v.weightSnapshot), finalScore:rating_(v.finalScore), ratings:{domains:sanitizeRubricDomains_(ratings.domains),building:rating_(ratings.building),teacher:rating_(ratings.teacher),lea:rating_(ratings.lea)}, annualRationales:sanitizeAnnualRationales_(v.annualRationales), annualEvidenceRefs:sanitizeAnnualEvidenceRefs_(v.annualEvidenceRefs), releasedDoc:sanitizeReleasedDoc_(v.releasedDoc), educatorStatement:sanitizeEducatorStatement_(v.educatorStatement) }; }
// releasedDoc: server-owned pointer to the shared released-summary Doc. It must
// survive sanitizeStoredWorkspace_ (which rebuilds every teacher through
// sanitizeTeacher_ at commit time) or the pointer written by
// sharePortalReleasedEvaluation evaporates before it ever reaches disk.
function sanitizeReleaseGrantEmails_(items){if(items===undefined||items===null)return[];if(!Array.isArray(items)||items.length>EE_MAX_RELEASE_VIEWERS)throw eeError_('bad_request','Released-summary grants must be a bounded email list.');var out=[],seen={},domain=normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));for(var i=0;i<items.length;i++){var email=normalizeEmail_(items[i]);if(!email||!emailDomain_(email)||(domain&&emailDomain_(email)!==domain))throw eeError_('bad_request','Released-summary grants must be managed district email accounts.');if(!seen[email]){seen[email]=true;out.push(email);}}out.sort();return out;}
function sanitizeReleasedDocHistory_(items){if(!Array.isArray(items))return[];var out=[];for(var i=Math.max(0,items.length-25);i<items.length;i++){var v=items[i];if(!isPlainObject_(v))continue;var url=safeString_(v.url,400,''),id=safeId_(v.id||'',false);if(!id&&url.indexOf('https://docs.google.com/')!==0)continue;out.push({id:id,url:url,academicYear:safeString_(v.academicYear,20,''),at:optionalTimestamp_(v.at),by:safeString_(v.by,160,''),openedAt:optionalTimestamp_(v.openedAt),status:v.status==='superseded_unavailable'?'superseded_unavailable':'superseded',supersededAt:optionalTimestamp_(v.supersededAt)});}return out;}
function sanitizeReleasedDoc_(v){ if(!isPlainObject_(v))return null; var url=safeString_(v.url,400,''); if(url.indexOf('https://docs.google.com/')!==0)return null; return { id:safeId_(v.id||'',false), url:url, academicYear:safeString_(v.academicYear,20,''), at:optionalTimestamp_(v.at), by:safeString_(v.by,160,''), sharedWith:normalizeEmail_(v.sharedWith), openedAt:optionalTimestamp_(v.openedAt), accessReviewedAt:optionalTimestamp_(v.accessReviewedAt), grants:sanitizeReleaseGrantEmails_(v.grants), aclMode:oneOf_(v.aclMode||'private_named_viewers',['private_named_viewers'],'released-summary ACL mode'), aclVersion:clampInt_(v.aclVersion,1,100,1), aclVerifiedAt:optionalTimestamp_(v.aclVerifiedAt||v.accessReviewedAt), history:sanitizeReleasedDocHistory_(v.history) }; }
function sanitizeReleaseRegistryEntry_(v){v=requireObject_(v,'released summary');var url=safeString_(v.url,400,'');if(url.indexOf('https://docs.google.com/')!==0)throw eeError_('bad_request','Released-summary registry URL is invalid.');return{id:safeId_(v.id,true),url:url,teacherId:safeId_(v.teacherId,true),academicYear:safeString_(v.academicYear,20,''),releasedAt:optionalTimestamp_(v.releasedAt),releasedBy:safeString_(v.releasedBy,160,''),grants:sanitizeReleaseGrantEmails_(v.grants),aclMode:oneOf_(v.aclMode||'private_named_viewers',['private_named_viewers'],'released-summary ACL mode'),aclVersion:clampInt_(v.aclVersion,1,100,1),aclVerifiedAt:optionalTimestamp_(v.aclVerifiedAt),status:oneOf_(v.status||'active',['active','historical','retired','retirement_pending','unavailable','recovery_pending'],'released-summary registry status')};}
// educatorStatement: the educator's own words for the record. Owned by the
// teacher (merge adopts it only from teacher saves, only pre-finalization).
function sanitizeEducatorStatement_(v){ if(!isPlainObject_(v))return null; var text=safeString_(v.text,20000,''); if(!text)return null; return { text:text, updatedAt:optionalTimestamp_(v.updatedAt) }; }
function sanitizeAnnualRationales_(v){v=isPlainObject_(v)?v:{};return{d1:safeString_(v.d1,15000,''),d2:safeString_(v.d2,15000,''),d3:safeString_(v.d3,15000,''),d4:safeString_(v.d4,15000,'')};}
function sanitizeAnnualEvidenceRefs_(v){v=isPlainObject_(v)?v:{};return{d1:sanitizeAnnualEvidenceRefList_(v.d1),d2:sanitizeAnnualEvidenceRefList_(v.d2),d3:sanitizeAnnualEvidenceRefList_(v.d3),d4:sanitizeAnnualEvidenceRefList_(v.d4)};}
function sanitizeAnnualEvidenceRefList_(v){if(v===undefined||v===null)return[];if(!Array.isArray(v)||v.length>100)throw eeError_('bad_request','Annual evidence references must be an array of at most 100 records per domain.');var out=[],seen={};for(var i=0;i<v.length;i++){var token=sanitizeAnnualEvidenceToken_(v[i]);if(seen[token])throw eeError_('bad_request','Annual evidence references cannot contain duplicates within a domain.');seen[token]=true;out.push(token);}return out;}
function sanitizeAnnualEvidenceToken_(v){var token=safeString_(v,140,'');var match=/^(walkthrough|formal_observation|spm):(.+)$/.exec(token);if(!match)throw eeError_('bad_request','Annual evidence reference has an invalid record type.');return match[1]+':'+safeId_(match[2],true);}
function sanitizeWalkthrough_(v) { v=requireObject_(v,'walkthrough'); return { id:safeId_(v.id,true),teacherId:safeId_(v.teacherId,true),createdAt:optionalTimestamp_(v.createdAt),updatedAt:optionalTimestamp_(v.updatedAt),date:optionalDate_(v.date),startedAt:optionalTimestamp_(v.startedAt),durationMin:String(clampInt_(v.durationMin,1,180,8)),announced:v.announced==='announced'?'announced':'unannounced',lessonPhase:oneOf_(v.lessonPhase||'middle',['opening','middle','guided_practice','independent_practice','closure'],'lessonPhase'),subject:safeString_(v.subject,240,''),evidence:safeString_(v.evidence,30000,''),interpretation:safeString_(v.interpretation,15000,''),componentTags:sanitizeTags_(v.componentTags),privacyChecked:!!v.privacyChecked,observer:safeString_(v.observer,160,''),createdByEmail:normalizeEmail_(v.createdByEmail),publishedAt:optionalTimestamp_(v.publishedAt),teacherAcknowledgedAt:optionalTimestamp_(v.teacherAcknowledgedAt),version:clampInt_(v.version,1,1000,1) }; }
function sanitizeObservation_(v) { v=requireObject_(v,'observation'); var p=requireObject_(v.prework||{},'prework'); var r=requireObject_(v.rationales||{},'rationales'); return { id:safeId_(v.id,true),teacherId:safeId_(v.teacherId,true),createdAt:optionalTimestamp_(v.createdAt),updatedAt:optionalTimestamp_(v.updatedAt),frameworkVersion:safeString_(v.frameworkVersion,80,''),version:clampInt_(v.version,1,1000,1),prework:{plan:safeString_(p.plan,30000,''),outcomes:safeString_(p.outcomes,20000,''),resources:safeString_(p.resources,20000,''),assessment:safeString_(p.assessment,20000,''),artifactReferences:safeString_(p.artifactReferences,10000,'')},preConferenceNotes:safeString_(v.preConferenceNotes,20000,''),observedLocal:safeString_(v.observedLocal,30,''),evidence:safeString_(v.evidence,50000,''),reflection:safeString_(v.reflection,30000,''),postConferenceNotes:safeString_(v.postConferenceNotes,30000,''),ratings:sanitizeRubricDomains_(v.ratings),rationales:{d1:safeString_(r.d1,15000,''),d2:safeString_(r.d2,15000,''),d3:safeString_(r.d3,15000,''),d4:safeString_(r.d4,15000,'')},componentTags:sanitizeTags_(v.componentTags),privacyChecked:!!v.privacyChecked,ackChecked:!!v.ackChecked,preworkSubmittedAt:optionalTimestamp_(v.preworkSubmittedAt),preConferenceAt:optionalTimestamp_(v.preConferenceAt),observedAt:optionalTimestamp_(v.observedAt),evidencePublishedAt:optionalTimestamp_(v.evidencePublishedAt),reflectionSubmittedAt:optionalTimestamp_(v.reflectionSubmittedAt),postConferenceAt:optionalTimestamp_(v.postConferenceAt),evaluatorSignedAt:optionalTimestamp_(v.evaluatorSignedAt),teacherAcknowledgedAt:optionalTimestamp_(v.teacherAcknowledgedAt),finalizedAt:optionalTimestamp_(v.finalizedAt) }; }
function sanitizeSpm_(v) { v=requireObject_(v,'spm'); var revisions=mapLimited_(v.revisions||[],20,function(x){x=requireObject_(x,'revision');return {version:clampInt_(x.version,1,1000,1),submittedAt:optionalTimestamp_(x.submittedAt),context:safeString_(x.context,20000,''),baseline:safeString_(x.baseline,20000,''),goal:safeString_(x.goal,20000,''),measures:safeString_(x.measures,20000,''),actionPlan:safeString_(x.actionPlan,20000,'')};}); return { id:safeId_(v.id,true),teacherId:safeId_(v.teacherId,true),createdAt:optionalTimestamp_(v.createdAt),updatedAt:optionalTimestamp_(v.updatedAt),status:oneOf_(v.status||'draft',['draft','submitted','returned','approved','results_submitted','locked'],'status'),version:clampInt_(v.version,1,1000,1),context:safeString_(v.context,20000,''),baseline:safeString_(v.baseline,20000,''),goal:safeString_(v.goal,20000,''),measures:safeString_(v.measures,20000,''),actionPlan:safeString_(v.actionPlan,20000,''),returnReason:safeString_(v.returnReason,10000,''),pendingReturnReason:safeString_(v.pendingReturnReason,10000,''),results:safeString_(v.results,30000,''),reflection:safeString_(v.reflection,30000,''),rating:rating_(v.rating),ratingRationale:safeString_(v.ratingRationale,15000,''),approvedBy:safeString_(v.approvedBy,160,''),revisions:revisions,submittedAt:optionalTimestamp_(v.submittedAt),firstOpenedAt:optionalTimestamp_(v.firstOpenedAt),returnedAt:optionalTimestamp_(v.returnedAt),approvedAt:optionalTimestamp_(v.approvedAt),resultsSubmittedAt:optionalTimestamp_(v.resultsSubmittedAt),lockedAt:optionalTimestamp_(v.lockedAt) }; }
function sanitizeComment_(v) { v=requireObject_(v,'comment'); return { id:safeId_(v.id,true),teacherId:safeId_(v.teacherId,true),recordType:recordType_(v.recordType),recordId:safeId_(v.recordId,true),text:safeString_(v.text,EE_MAX_MESSAGE_CHARS,'',true),role:v.role==='Teacher'?'Teacher':'Evaluator',author:safeString_(v.author,160,''),authorEmail:normalizeEmail_(v.authorEmail),authorRole:['admin','evaluator','teacher'].indexOf(String(v.authorRole||''))===-1?'':String(v.authorRole),at:optionalTimestamp_(v.at),version:clampInt_(v.version,1,1000,1) }; }
function sanitizeSnapshot_(v) { v=requireObject_(v,'snapshot'); return { id:safeId_(v.id,true),teacherId:safeId_(v.teacherId,true),staffCodeSnapshot:safeString_(v.staffCodeSnapshot,40,''),academicYear:safeString_(v.academicYear,20,''),buildingSnapshot:safeString_(v.buildingSnapshot,160,''),employeeTypeSnapshot:v.employeeTypeSnapshot==='temporary'?'temporary':'professional',finalizedAt:optionalTimestamp_(v.finalizedAt),finalScore:rating_(v.finalScore),domainRatings:sanitizeRubricDomains_(v.domainRatings),annualRationales:sanitizeAnnualRationales_(v.annualRationales),annualEvidenceRefs:sanitizeAnnualEvidenceRefs_(v.annualEvidenceRefs),weightSnapshot:sanitizeWeights_(v.weightSnapshot),frameworkVersion:safeString_(v.frameworkVersion,80,'') }; }

/* ---------------------------- persistence ------------------------------ */

function repositoryConfigured_() { var p=PropertiesService.getScriptProperties(); return p.getProperty('EE_SETUP_STATE')==='ready'&&!!(p.getProperty('EE_ALLOWED_DOMAIN')&&p.getProperty('EE_SPREADSHEET_ID')&&p.getProperty('EE_WORKSPACE_FILE_ID')&&p.getProperty('EE_PENDING_COMMIT_FILE_ID')); }
function repositorySpreadsheet_() { var id=PropertiesService.getScriptProperties().getProperty('EE_SPREADSHEET_ID'); if(!id)throw eeError_('not_configured','Repository spreadsheet is not configured.'); return SpreadsheetApp.openById(id); }
function readWorkspaceState_(options) { var p=PropertiesService.getScriptProperties(); var id=p.getProperty('EE_WORKSPACE_FILE_ID'); if(!id)throw eeError_('not_configured','Workspace file is not configured.'); var raw=DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'); if(raw.length>EE_MAX_WORKSPACE_BYTES)throw eeError_('corrupt','Stored workspace exceeds its limit.'); var workspace; try{workspace=sanitizeStoredWorkspace_(JSON.parse(raw));}catch(err){throw eeError_('corrupt','Stored workspace failed validation.');} var sheet=repositorySpreadsheet_().getSheetByName('Workspace'); var revision=0,exists=false; if(sheet&&sheet.getLastRow()>=2){var row=sheet.getRange(2,1,1,6).getValues()[0],parsedRevision=Number(row[1]);if(String(row[0])!=='workspace'||String(row[2])!==id||Math.floor(parsedRevision)!==parsedRevision||parsedRevision<0||sheetLogicalCell_(row[3])!==hashText_(raw))throw eeError_('corrupt','Workspace metadata integrity check failed; an administrator must restore a matching reviewed backup.');revision=parsedRevision;exists=true;} return {workspace:workspace,revision:revision,metadataExists:exists}; }
function sanitizeStoredWorkspace_(raw) { var copy=clone_(raw); var audit=Array.isArray(copy.audit)?copy.audit.slice(-EE_MAX_AUDIT):[]; copy.audit=[]; var clean=sanitizeWorkspace_(copy); clean.audit=audit.map(sanitizeAuditObject_); return clean; }
function sheetSafeCell_(value){if(typeof value!=='string')return value;return /^(?:[\t\r]|[\u0000-\u0020]*[=+\-@])/.test(value)?"'"+value:value;}
function sheetSafeRow_(row){if(!Array.isArray(row))throw eeError_('bad_request','Spreadsheet row must be an array.');return row.map(sheetSafeCell_);}
function sheetSafeValues_(values){if(!Array.isArray(values))throw eeError_('bad_request','Spreadsheet values must be an array.');return values.map(sheetSafeRow_);}
function safeSheetAppendRow_(sheet,row){sheet.appendRow(sheetSafeRow_(row));}
function safeSheetSetValues_(range,values){range.setValues(sheetSafeValues_(values));}
function assertScriptLockHeld_(lock){if(!lock||typeof lock.hasLock!=='function'||!lock.hasLock())throw eeError_('server_error','Canonical workspace writes require the held repository lock.');}
function writeWorkspaceState_(workspace,revision,actorEmail,lock){
  assertScriptLockHeld_(lock);
  var json=JSON.stringify(workspace);
  if(json.length>EE_MAX_WORKSPACE_BYTES)throw eeError_('too_large','Workspace exceeds the server size limit.');
  var props=PropertiesService.getScriptProperties(),pending=DriveApp.getFileById(props.getProperty('EE_PENDING_COMMIT_FILE_ID'));
  var envelope=JSON.stringify({revision:revision,actorEmail:actorEmail,at:nowIso_(),workspace:workspace});
  pending.setContent(envelope);
  try{completePendingCommit_(lock);return{pending:false};}
  catch(commitErr){
    props.setProperty('EE_COMMIT_RECOVERY_REQUIRED','1');
    try{markWorkspaceIndexRecovery_();}catch(markerErr){props.setProperty('EE_SECONDARY_RECONCILE_REQUIRED','1');props.setProperty('EE_SECONDARY_RECOVERY_MANUAL_REQUIRED','1');}
    return{pending:true};
  }
}
function reconcilePendingCommit_(lock){
  assertScriptLockHeld_(lock);
  var props=PropertiesService.getScriptProperties(),pendingId=props.getProperty('EE_PENDING_COMMIT_FILE_ID');
  if(!pendingId)return;
  var pending=DriveApp.getFileById(pendingId),raw=pending.getBlob().getDataAsString('UTF-8');
  if(!raw)return;
  return completePendingCommit_(lock);
}
function completePendingCommit_(lock){
  assertScriptLockHeld_(lock);
  var props=PropertiesService.getScriptProperties(),pendingId=props.getProperty('EE_PENDING_COMMIT_FILE_ID'),fileId=props.getProperty('EE_WORKSPACE_FILE_ID');
  if(!pendingId||!fileId)throw eeError_('not_configured','Workspace commit files are not configured.');
  var pending=DriveApp.getFileById(pendingId),raw=pending.getBlob().getDataAsString('UTF-8');
  if(!raw)return{completed:false,idempotent:false};
  var envelope;
  try{envelope=JSON.parse(raw);}catch(err){throw eeError_('corrupt','Pending workspace journal is invalid.');}
  var revision=Number(envelope.revision);
  if(Math.floor(revision)!==revision||revision<0)throw eeError_('corrupt','Pending workspace revision is invalid.');
  var workspace=sanitizeStoredWorkspace_(envelope.workspace),json=JSON.stringify(workspace);
  if(json.length>EE_MAX_WORKSPACE_BYTES)throw eeError_('corrupt','Pending workspace exceeds its limit.');
  var file=DriveApp.getFileById(fileId),canonicalRaw=file.getBlob().getDataAsString('UTF-8');
  if(canonicalRaw.length>EE_MAX_WORKSPACE_BYTES)throw eeError_('corrupt','Stored workspace exceeds its limit.');
  try{sanitizeStoredWorkspace_(JSON.parse(canonicalRaw));}catch(canonicalErr){throw eeError_('manual_recovery_required','The canonical workspace cannot be validated against the pending journal. District IT must inspect both files.');}
  var sheet=repositorySpreadsheet_().getSheetByName('Workspace'),metadataExists=false,metadataRevision=-1,metadataHash='';
  if(sheet&&sheet.getLastRow()>=2){
    var row=sheet.getRange(2,1,1,6).getValues()[0],parsedRevision=Number(row[1]);
    metadataHash=sheetLogicalCell_(row[3]);
    if(String(row[0])!=='workspace'||String(row[2])!==fileId||Math.floor(parsedRevision)!==parsedRevision||parsedRevision<0||!/^[A-Za-z0-9_-]{40,64}$/.test(metadataHash))throw eeError_('corrupt','Workspace metadata is invalid; the pending journal was not applied.');
    metadataExists=true;metadataRevision=parsedRevision;
  }
  var canonicalHash=hashText_(canonicalRaw),pendingHash=hashText_(json),canonicalMatchesMetadata=metadataExists&&canonicalHash===metadataHash,canonicalMatchesPending=canonicalHash===pendingHash;
  if(!metadataExists){
    if(revision!==0||!canonicalMatchesPending)throw eeError_('manual_recovery_required','Missing workspace metadata can be initialized only by an exact revision-0 journal for the current canonical file.');
    writeWorkspaceMetadata_(fileId,json,revision,normalizeEmail_(envelope.actorEmail));
  }else if(canonicalMatchesMetadata){
    if(revision===metadataRevision&&canonicalMatchesPending){
      pending.setContent('');props.deleteProperty('EE_COMMIT_RECOVERY_REQUIRED');
      return{completed:true,idempotent:true,revision:revision};
    }
    if(revision!==metadataRevision+1)throw eeError_('manual_recovery_required','The pending workspace revision is stale or skips the canonical revision. The journal was retained for District IT review.');
    file.setContent(json);
    writeWorkspaceMetadata_(fileId,json,revision,normalizeEmail_(envelope.actorEmail));
  }else if(canonicalMatchesPending&&revision===metadataRevision+1){
    writeWorkspaceMetadata_(fileId,json,revision,normalizeEmail_(envelope.actorEmail));
  }else{
    throw eeError_('manual_recovery_required','The canonical workspace, metadata, and pending journal do not form one monotonic commit. The journal was retained for District IT review.');
  }
  pending.setContent('');props.deleteProperty('EE_COMMIT_RECOVERY_REQUIRED');
  return{completed:true,idempotent:false,revision:revision};
}
function writeWorkspaceMetadata_(fileId,json,revision,actorEmail){var sheet=repositorySpreadsheet_().getSheetByName('Workspace');var row=['workspace',revision,fileId,hashText_(json),nowIso_(),actorEmail];if(sheet.getLastRow()<2)safeSheetAppendRow_(sheet,row);else safeSheetSetValues_(sheet.getRange(2,1,1,row.length),[row]);}
function initializeSheets_(ss){var names=Object.keys(EE_SHEETS);var first=ss.getSheets()[0];for(var i=0;i<names.length;i++){var name=names[i];var sheet=ss.getSheetByName(name);if(!sheet){if(i===0&&first&&first.getLastRow()===0){sheet=first;sheet.setName(name);}else sheet=ss.insertSheet(name);}var headers=EE_SHEETS[name];safeSheetSetValues_(sheet.getRange(1,1,1,headers.length),[headers]);sheet.setFrozenRows(1);protectSheet_(sheet);try{sheet.hideSheet();}catch(err){}}}
function protectSheet_(sheet){var ps=sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);for(var i=0;i<ps.length;i++)ps[i].remove();var p=sheet.protect().setDescription('AlloFlow evaluation repository - service access only');p.setWarningOnly(false);var owner=Session.getEffectiveUser(),ownerEmail=normalizeEmail_(owner.getEmail());p.addEditor(owner);var editors=p.getEditors();if(editors&&editors.length)p.removeEditors(editors);if(p.canDomainEdit())p.setDomainEdit(false);var remaining=p.getEditors()||[];for(var j=0;j<remaining.length;j++){var email=normalizeEmail_(remaining[j].getEmail());if(!email||email!==ownerEmail)throw eeError_('protection_failed','Repository sheet has an unintended editor.');}if(p.canDomainEdit()||(typeof p.isWarningOnly==='function'&&p.isWarningOnly()))throw eeError_('protection_failed','Repository sheet protection could not be verified.');}
function setPrivate_(item){
  try {
    var ownerEmail='';
    try{ownerEmail=normalizeEmail_(Session.getEffectiveUser().getEmail());}catch(ownerErr){}
    if(!ownerEmail||!item||typeof item.setShareableByEditors!=='function'||typeof item.isShareableByEditors!=='function'||typeof item.getEditors!=='function'||typeof item.getViewers!=='function'||typeof item.removeEditor!=='function'||typeof item.removeViewer!=='function'||typeof item.setSharing!=='function'||typeof item.getSharingAccess!=='function')throw eeError_('protection_failed','Repository Drive privacy controls could not be inspected.');
    item.setShareableByEditors(false);
    removeNonOwnerAccess_(item,item.getEditors()||[],ownerEmail,'removeEditor');
    removeNonOwnerAccess_(item,item.getViewers()||[],ownerEmail,'removeViewer');
    item.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.VIEW);
    var remainingEditors=item.getEditors()||[],remainingViewers=item.getViewers()||[];
    verifyOwnerOnlyDriveUsers_(remainingEditors,ownerEmail);
    verifyOwnerOnlyDriveUsers_(remainingViewers,ownerEmail);
    if(item.getSharingAccess()!==DriveApp.Access.PRIVATE||item.isShareableByEditors())throw eeError_('protection_failed','Repository Drive privacy could not be verified.');
    return item;
  }catch(privacyErr){
    if(privacyErr&&privacyErr.code==='protection_failed')throw privacyErr;
    throw eeError_('protection_failed','Repository Drive privacy could not be enforced and verified.');
  }
}
function verifyOwnerOnlyDriveUsers_(users,ownerEmail){for(var i=0;i<(users||[]).length;i++){var email=driveUserEmail_(users[i]);if(!email||email!==ownerEmail)throw eeError_('protection_failed','Repository explicit Drive access could not be removed and verified.');}}
function removeNonOwnerAccess_(item,users,ownerEmail,method){for(var i=0;i<(users||[]).length;i++){var email='';try{email=normalizeEmail_(users[i].getEmail());}catch(err){}if(!email||email!==ownerEmail){if(typeof item[method]!=='function')throw eeError_('protection_failed','Repository explicit access could not be revoked.');item[method](users[i]);}}}
function appendRow_(name,row){var sheet=repositorySpreadsheet_().getSheetByName(name);if(!sheet)throw eeError_('corrupt','Required repository table is missing.');safeSheetAppendRow_(sheet,row);}
function putConfigRows_(ss,values){var sheet=ss.getSheetByName('Config');var keys=Object.keys(values);sheet.clearContents();safeSheetSetValues_(sheet.getRange(1,1,1,2),[EE_SHEETS.Config]);for(var i=0;i<keys.length;i++)safeSheetAppendRow_(sheet,[keys[i],String(values[keys[i]]||'')]);}
function configMap_(){var sheet=repositorySpreadsheet_().getSheetByName('Config');var rows=dataRows_(sheet,2);var out={};for(var i=0;i<rows.length;i++)out[String(rows[i][0])]=String(rows[i][1]||'');return out;}
function setConfigValue_(key,value){var sheet=repositorySpreadsheet_().getSheetByName('Config');var rows=dataRows_(sheet,2);for(var i=0;i<rows.length;i++){if(String(rows[i][0])===String(key)){safeSheetSetValues_(sheet.getRange(i+2,1,1,2),[[String(key),String(value||'')]]);return;}}safeSheetAppendRow_(sheet,[String(key),String(value||'')]);}
function memberObjects_(){var rows=dataRows_(repositorySpreadsheet_().getSheetByName('Members'),5),out=[];for(var i=0;i<rows.length;i++){if(!rows[i][0])continue;out.push({email:normalizeEmail_(rows[i][0]),displayName:safeString_(rows[i][1],160,normalizeEmail_(rows[i][0])),role:String(rows[i][2]),teacherId:safeId_(rows[i][3]||'',false),active:parseBool_(rows[i][4])});}return out;}
function assignmentObjects_(){var rows=dataRows_(repositorySpreadsheet_().getSheetByName('Assignments'),3),out=[];for(var i=0;i<rows.length;i++){if(!rows[i][0])continue;out.push({teacherId:safeId_(rows[i][0],true),evaluatorEmail:normalizeEmail_(rows[i][1]),active:parseBool_(rows[i][2])});}return out;}
function sheetLogicalCell_(value){if(typeof value!=='string')return value;return /^'(?:[\t\r]|[ \t\r\n]*[=+\-@])/.test(value)?value.slice(1):value;}
function dataRows_(sheet,width){if(!sheet||sheet.getLastRow()<2)return[];var values=sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues();for(var i=0;i<values.length;i++)for(var j=0;j<values[i].length;j++)values[i][j]=sheetLogicalCell_(values[i][j]);return values;}
function upsertMemberRow_(ss,m){upsertKeyedRow_(ss.getSheetByName('Members'),m.email,[m.email,m.displayName,m.role,m.teacherId||'',m.active!==false]);}
function upsertAssignmentRow_(ss,a){var sheet=ss.getSheetByName('Assignments');var rows=dataRows_(sheet,3);var key=a.teacherId+'|'+a.evaluatorEmail;for(var i=0;i<rows.length;i++){if(String(rows[i][0])+'|'+normalizeEmail_(rows[i][1])===key){safeSheetSetValues_(sheet.getRange(i+2,1,1,3),[[a.teacherId,a.evaluatorEmail,a.active!==false]]);return;}}safeSheetAppendRow_(sheet,[a.teacherId,a.evaluatorEmail,a.active!==false]);}
function upsertKeyedRow_(sheet,key,row){var rows=dataRows_(sheet,row.length);for(var i=0;i<rows.length;i++){if(normalizeEmail_(rows[i][0])===normalizeEmail_(key)){safeSheetSetValues_(sheet.getRange(i+2,1,1,row.length),[row]);return;}}safeSheetAppendRow_(sheet,row);}
function seedMembersAndAssignments_(ss,members,assignments,domain){if(Array.isArray(members))for(var i=0;i<members.length;i++)upsertMemberRow_(ss,members[i]);if(Array.isArray(assignments))for(var j=0;j<assignments.length;j++)upsertAssignmentRow_(ss,assignments[j]);}
function normalizeSetupMembers_(members,domain){if(members===undefined||members===null)return[];if(!Array.isArray(members)||members.length>2000)throw eeError_('bad_config','Invalid setup members list.');var out=[];for(var i=0;i<members.length;i++)out.push(normalizeMember_(members[i],domain));return out;}
function normalizeSetupAssignments_(assignments,domain){if(assignments===undefined||assignments===null)return[];if(!Array.isArray(assignments)||assignments.length>5000)throw eeError_('bad_config','Invalid setup assignments list.');var out=[];for(var i=0;i<assignments.length;i++)out.push(normalizeAssignment_(assignments[i],domain));return out;}
function validateDeclaredSetupReferences_(teachers,members,assignments,bootstrapAdmin){var ids={};for(var i=0;i<teachers.length;i++)ids[teachers[i].id]=true;var evaluatorEmails={};evaluatorEmails[bootstrapAdmin]=true;for(var j=0;j<members.length;j++){if(members[j].role==='teacher'&&!ids[members[j].teacherId])throw eeError_('bad_config','Teacher member references an undeclared educator ID.');if(members[j].role==='evaluator'||members[j].role==='admin')evaluatorEmails[members[j].email]=true;}for(var k=0;k<assignments.length;k++){if(!ids[assignments[k].teacherId])throw eeError_('bad_config','Assignment references an undeclared educator ID.');if(!evaluatorEmails[assignments[k].evaluatorEmail])throw eeError_('bad_config','Assignment evaluator must be an evaluator/admin member.');}}
function validateRepositoryReferences_(workspace){var ids={};for(var i=0;i<(workspace.teachers||[]).length;i++)ids[workspace.teachers[i].id]=true;var members=memberObjects_(),evaluators={},activeAdmins=0;for(var j=0;j<members.length;j++){if(members[j].active&&members[j].role==='teacher'&&!ids[members[j].teacherId])throw eeError_('bad_config','Active teacher membership references a missing educator record.');if(members[j].active&&(members[j].role==='evaluator'||members[j].role==='admin'))evaluators[members[j].email]=true;if(members[j].active&&members[j].role==='admin')activeAdmins++;}if(activeAdmins<1)throw eeError_('bad_config','Repository requires an active administrator.');var assignments=assignmentObjects_();for(var k=0;k<assignments.length;k++){if(assignments[k].active&&!ids[assignments[k].teacherId])throw eeError_('bad_config','Active assignment references a missing educator record.');if(assignments[k].active&&!evaluators[assignments[k].evaluatorEmail])throw eeError_('bad_config','Active assignment references a missing evaluator member.');}}
function normalizeMember_(m,domain){m=requireObject_(m,'member');var email=normalizeEmail_(m.email);if(!email||emailDomain_(email)!==domain)throw eeError_('bad_member','Member must use the allowed district domain.');var role=oneOf_(m.role,['admin','evaluator','teacher'],'role');var teacherId=role==='teacher'?safeId_(m.teacherId||'',false):'';if(role==='teacher'&&!teacherId)throw eeError_('bad_member','Teacher membership requires teacherId.');return{email:email,displayName:safeString_(m.displayName,160,email),role:role,teacherId:teacherId,active:m.active!==false};}
function assertAdminInvariantAfterMember_(candidate){var members=memberObjects_(),activeAdmins=0;for(var i=0;i<members.length;i++){var member=members[i].email===candidate.email?candidate:members[i];if(member.active&&member.role==='admin')activeAdmins++;}var found=false;for(var j=0;j<members.length;j++)if(members[j].email===candidate.email)found=true;if(!found&&candidate.active&&candidate.role==='admin')activeAdmins++;var bootstrap=normalizeEmail_(PropertiesService.getScriptProperties().getProperty('EE_BOOTSTRAP_ADMIN'));if(candidate.email===bootstrap&&(!candidate.active||candidate.role!=='admin'))throw eeError_('bad_member','The bootstrap administrator cannot be deactivated or demoted.');if(activeAdmins<1)throw eeError_('bad_member','At least one active administrator is required.');}
function normalizeAssignment_(a,domain){a=requireObject_(a,'assignment');var email=normalizeEmail_(a.evaluatorEmail);if(!email||emailDomain_(email)!==domain)throw eeError_('bad_assignment','Evaluator must use the allowed district domain.');return{teacherId:safeId_(a.teacherId,true),evaluatorEmail:email,active:a.active!==false};}

/* ---------------------- audit, receipts, snapshots --------------------- */

function canonicalAuditEntry_(mutation,actor){return{id:newId_('audit'),event:mutation.event,summary:mutation.summary,actor:actor.displayName||actor.email||'Unknown',actorEmail:actor.email||'',actorRole:actor.role||'',role:actor.role==='teacher'?'Teacher':'Evaluator',at:nowIso_(),entityType:mutation.entityType,entityId:mutation.entityId||'',teacherId:mutation.teacherId||'',version:mutation.version||1};}
function appendWorkspaceAudit_(workspace,mutation,actor){workspace.audit=workspace.audit||[];var entry=canonicalAuditEntry_(mutation,actor);workspace.audit.unshift(entry);workspace.audit=workspace.audit.slice(0,EE_MAX_AUDIT);return entry;}
function appendAuditRowLocked_(mutation,actor){var lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw eeError_('busy','Repository audit is busy.');try{return appendOperationAuditBestEffort_(mutation,actor);}finally{lock.releaseLock();}}
function appendAuditRow_(mutation,actor){return appendCanonicalAuditRow_(canonicalAuditEntry_(mutation,actor));}
function sanitizeAuditObject_(v){v=requireObject_(v,'audit');return{id:safeId_(v.id,true),event:safeToken_(v.event||'UPDATED',60),summary:safeString_(v.summary,500,'Record updated'),actor:safeString_(v.actor,160,'Unknown'),actorEmail:normalizeEmail_(v.actorEmail),actorRole:['admin','evaluator','teacher'].indexOf(String(v.actorRole||''))===-1?'':String(v.actorRole),role:v.role==='Teacher'?'Teacher':'Evaluator',at:optionalTimestamp_(v.at)||nowIso_(),entityType:safeToken_(v.entityType||'workspace',80),entityId:safeId_(v.entityId||'',false),teacherId:safeId_(v.teacherId||'',false),version:clampInt_(v.version,1,1000,1)};}
function findReceipt_(teacherId,type,recordId,receiptType,email){var rows=dataRows_(repositorySpreadsheet_().getSheetByName('Receipts'),8);for(var i=rows.length-1;i>=0;i--)if(String(rows[i][1])===teacherId&&String(rows[i][2])===type&&String(rows[i][3])===recordId&&String(rows[i][4])===receiptType&&normalizeEmail_(rows[i][5])===email)return{id:String(rows[i][0]),teacherId:teacherId,recordType:type,recordId:recordId,receiptType:receiptType,actorEmail:email,actorRole:String(rows[i][6]),at:toIso_(rows[i][7])};return null;}
function receiptSummary_(type){return{opened:'Submitted SPM receipt recorded',acknowledged:'Completed acknowledgment receipt recorded'}[type];}
function syncSecondaryIndexes_(workspace){syncMessages_(workspace);syncWorkspaceAudit_(workspace);syncSnapshots_(workspace);}
function normalizeSecondaryCell_(value, kind) {
  value = sheetLogicalCell_(value);
  if (value === null || value === undefined || value === '') return '';
  if (kind === 'email') return normalizeEmail_(value);
  if (kind === 'timestamp') {
    var date = Object.prototype.toString.call(value) === '[object Date]' ? value : new Date(value);
    return isNaN(date.getTime()) ? String(value) : date.toISOString();
  }
  if (kind === 'number') {
    var number = Number(value);
    return isFinite(number) ? String(number) : String(value);
  }
  return String(value);
}

function normalizeSecondaryRow_(ledger, row) {
  var width = ledger === 'messages' ? 8 : (ledger === 'audit' ? 10 : 13), out = [];
  for (var i = 0; i < width; i++) {
    var kind = 'text';
    if ((ledger === 'messages' && i === 4) || (ledger === 'audit' && i === 7)) kind = 'email';
    else if ((ledger === 'messages' && i === 7) || (ledger === 'audit' && i === 9) || (ledger === 'snapshots' && i === 6)) kind = 'timestamp';
    else if ((ledger === 'audit' && i === 6) || (ledger === 'snapshots' && i >= 7 && i <= 11)) kind = 'number';
    out.push(normalizeSecondaryCell_(row[i], kind));
  }
  return out;
}

function expectedMessageIndexRow_(item) { return [item.id,item.teacherId,item.recordType,item.recordId,item.authorEmail||'',item.authorRole||'',item.text,item.at]; }
function expectedAuditIndexRow_(entry) { return [entry.id,entry.teacherId||'',entry.event,entry.summary,entry.entityType,entry.entityId||'',entry.version||1,entry.actorEmail||'',entry.actorRole||'',entry.at]; }
function expectedSnapshotIndexRow_(snapshot) { return [snapshot.id,snapshot.teacherId,snapshot.staffCodeSnapshot,snapshot.academicYear,snapshot.buildingSnapshot,snapshot.employeeTypeSnapshot,snapshot.finalizedAt,snapshot.finalScore,snapshot.domainRatings&&snapshot.domainRatings.d1,snapshot.domainRatings&&snapshot.domainRatings.d2,snapshot.domainRatings&&snapshot.domainRatings.d3,snapshot.domainRatings&&snapshot.domainRatings.d4,snapshot.frameworkVersion]; }
function secondaryIssueSample_(ledger, issue, id, occurrences) { var sample={ledger:ledger,issue:issue,idFingerprint:hashText_(ledger+'|'+String(id||'')).slice(0,16)};if(occurrences!==undefined)sample.occurrences=occurrences;return sample; }

function secondaryLedgerParity_(ledger, expectedRows, actualRows) {
  var expected = {}, actual = {}, blankIdRows = 0, issues = [];
  for (var i = 0; i < expectedRows.length; i++) {
    var expectedRow = normalizeSecondaryRow_(ledger, expectedRows[i]), expectedId = expectedRow[0];
    expected[expectedId] = expectedRow;
  }
  for (var j = 0; j < actualRows.length; j++) {
    var actualRow = normalizeSecondaryRow_(ledger, actualRows[j]), actualId = actualRow[0];
    if (!actualId) { blankIdRows++; continue; }
    if (!actual[actualId]) actual[actualId] = [];
    actual[actualId].push(actualRow);
  }
  var missing = 0, mismatched = 0, duplicateIds = 0, duplicateRows = 0, ledgerOnly = 0;
  var expectedIds = Object.keys(expected).sort(), actualIds = Object.keys(actual).sort();
  for (var e = 0; e < expectedIds.length; e++) {
    var id = expectedIds[e], rows = actual[id] || [];
    if (!rows.length) { missing++; issues.push(secondaryIssueSample_(ledger, 'missing', id)); continue; }
    var exact = rows.some(function (row) { return same_(row, expected[id]); });
    if (!exact) { mismatched++; issues.push(secondaryIssueSample_(ledger, 'canonical_mismatch', id)); }
  }
  for (var a = 0; a < actualIds.length; a++) {
    var actualId = actualIds[a], occurrences = actual[actualId].length;
    if (occurrences > 1) { duplicateIds++; duplicateRows += occurrences - 1; issues.push(secondaryIssueSample_(ledger, 'duplicate_id', actualId, occurrences)); }
    if (!expected[actualId]) { ledgerOnly++; issues.push(secondaryIssueSample_(ledger, ledger === 'snapshots' ? 'unexpected_ledger_only' : 'historical_or_operation_only', actualId)); }
  }
  if (blankIdRows) issues.push({ ledger: ledger, issue: 'blank_id', occurrences: blankIdRows, idFingerprint: hashText_(ledger+'|blank').slice(0,16) });
  var canonicalSignatures = expectedIds.map(function (id) { return JSON.stringify(expected[id]); });
  var ledgerSignatures = [];
  actualIds.forEach(function (id) { actual[id].forEach(function (row) { ledgerSignatures.push(JSON.stringify(row)); }); });
  ledgerSignatures.sort();
  var ambiguous = mismatched > 0 || duplicateIds > 0 || blankIdRows > 0 || (ledger === 'snapshots' && ledgerOnly > 0);
  return {
    canonicalRows: expectedIds.length, ledgerRows: actualRows.length, missing: missing, mismatched: mismatched,
    duplicateIds: duplicateIds, duplicateRows: duplicateRows, ledgerOnly: ledgerOnly, blankIdRows: blankIdRows,
    ambiguous: ambiguous, issues: issues.slice(0,EE_SECONDARY_ISSUE_SAMPLE_MAX),
    fingerprint: hashText_(JSON.stringify({ canonical: canonicalSignatures, ledger: ledgerSignatures, blankIdRows: blankIdRows })),
  };
}

function secondaryIndexStatus_(workspace, ledgerRows) {
  workspace = workspace || {};
  var spreadsheet = repositorySpreadsheet_();
  ledgerRows = ledgerRows || {};
  var messageRows = ledgerRows.messages === undefined ? dataRows_(spreadsheet.getSheetByName('Messages'),8) : ledgerRows.messages;
  var auditRows = ledgerRows.audit === undefined ? dataRows_(spreadsheet.getSheetByName('Audit'),12) : ledgerRows.audit;
  var snapshotRows = ledgerRows.snapshots === undefined ? dataRows_(spreadsheet.getSheetByName('Snapshots'),13) : ledgerRows.snapshots;
  var messages = secondaryLedgerParity_('messages', (workspace.comments||[]).map(expectedMessageIndexRow_), messageRows);
  var audit = secondaryLedgerParity_('audit', (workspace.audit||[]).map(expectedAuditIndexRow_), auditRows);
  var snapshots = secondaryLedgerParity_('snapshots', (workspace.cycleSnapshots||[]).filter(function(item){return !!item.finalizedAt;}).map(expectedSnapshotIndexRow_), snapshotRows);
  var issues = messages.issues.concat(audit.issues, snapshots.issues);
  issues.sort(function (a,b) {
    var severityA = a.issue === 'historical_or_operation_only' ? 1 : 0, severityB = b.issue === 'historical_or_operation_only' ? 1 : 0;
    return severityA-severityB || String(a.ledger).localeCompare(String(b.ledger)) || String(a.issue).localeCompare(String(b.issue)) || String(a.idFingerprint).localeCompare(String(b.idFingerprint));
  });
  var totalMissing = messages.missing + audit.missing + snapshots.missing;
  var totalMismatched = messages.mismatched + audit.mismatched + snapshots.mismatched;
  var totalDuplicateIds = messages.duplicateIds + audit.duplicateIds + snapshots.duplicateIds;
  var totalLedgerOnly = messages.ledgerOnly + audit.ledgerOnly + snapshots.ledgerOnly;
  var ambiguous = messages.ambiguous || audit.ambiguous || snapshots.ambiguous;
  return {
    messages: messages, audit: audit, snapshots: snapshots,
    missingMessages: messages.missing, missingAuditRows: audit.missing, missingSnapshots: snapshots.missing,
    mismatchedMessages: messages.mismatched, mismatchedAuditRows: audit.mismatched, mismatchedSnapshots: snapshots.mismatched,
    duplicateMessageIds: messages.duplicateIds, duplicateAuditIds: audit.duplicateIds, duplicateSnapshotIds: snapshots.duplicateIds,
    ledgerOnlyMessages: messages.ledgerOnly, ledgerOnlyAuditRows: audit.ledgerOnly, ledgerOnlySnapshots: snapshots.ledgerOnly,
    totalMissing: totalMissing, totalMismatched: totalMismatched, totalDuplicateIds: totalDuplicateIds, totalLedgerOnly: totalLedgerOnly,
    ambiguous: ambiguous, manualReviewRequired: ambiguous, issueSamples: issues.slice(0,EE_SECONDARY_ISSUE_SAMPLE_MAX),
    fingerprint: hashText_(JSON.stringify({messages:messages.fingerprint,audit:audit.fingerprint,snapshots:snapshots.fingerprint})),
  };
}

function configurationIndexStatus_(workspace) {
  var expected = safeString_(workspace&&workspace.config&&workspace.config.academicYear,20,''), rows=dataRows_(repositorySpreadsheet_().getSheetByName('Config'),2), values=[];
  for(var i=0;i<rows.length;i++)if(String(rows[i][0])==='academicYear')values.push(normalizeSecondaryCell_(rows[i][1],'text'));
  var duplicate = values.length>1, missing=!!expected&&values.length===0, mismatched=!!expected&&values.length===1&&values[0]!==expected;
  return { keyCount:values.length, missing:missing, mismatched:mismatched, duplicate:duplicate, ambiguous:duplicate, ok:!duplicate&&!missing&&!mismatched, fingerprint:hashText_(JSON.stringify({expected:expected,values:values})) };
}
function configurationIndexMatches_(workspace){return configurationIndexStatus_(workspace).ok;}
function syncConfigurationIndex_(workspace){var status=configurationIndexStatus_(workspace);if(status.duplicate)throw eeError_('manual_recovery_required','The academic-year projection contains duplicate keys. District IT must inspect it before repair.');var year=safeString_(workspace&&workspace.config&&workspace.config.academicYear,20,'');if(year)setConfigValue_('academicYear',year);if(!configurationIndexMatches_(workspace))throw eeError_('manual_recovery_required','The configuration projection could not be verified.');}

function auditLedgerRows_(){var sheet=repositorySpreadsheet_().getSheetByName('Audit');if(!sheet)throw eeError_('not_configured','Audit sheet is not configured.');return dataRows_(sheet,12);}
function auditLedgerRowsForId_(rows,id){var out=[],expectedId=String(id||'');for(var i=0;i<rows.length;i++){var row=normalizeSecondaryRow_('audit',rows[i]);if(row[0]===expectedId)out.push(row);}return out;}
function auditLedgerRowsById_(rows){rows=rows===undefined?auditLedgerRows_():rows;var out={};for(var i=0;i<rows.length;i++){var row=normalizeSecondaryRow_('audit',rows[i]),id=row[0];if(!id)continue;if(!out[id])out[id]=[];out[id].push(row);}return out;}
function operationAuditOutboxStatus_(journal,auditRows){var groups=auditLedgerRowsById_(auditRows),entries=(journal&&journal.auditEntries)||[],missing=0,exactPresent=0,mismatched=0,duplicateIds=0,issues=[],signatures=[];for(var i=0;i<entries.length;i++){var expected=normalizeSecondaryRow_('audit',expectedAuditIndexRow_(entries[i])),rows=groups[expected[0]]||[];signatures.push(JSON.stringify({expected:expected,actual:rows}));if(!rows.length){missing++;issues.push(secondaryIssueSample_('audit_outbox','missing',expected[0]));}else if(rows.length>1){duplicateIds++;issues.push(secondaryIssueSample_('audit_outbox','duplicate_id',expected[0],rows.length));}else if(same_(rows[0],expected))exactPresent++;else{mismatched++;issues.push(secondaryIssueSample_('audit_outbox','canonical_mismatch',expected[0]));}}return{queued:entries.length,missing:missing,exactPresent:exactPresent,mismatched:mismatched,duplicateIds:duplicateIds,ambiguous:mismatched>0||duplicateIds>0,issueSamples:issues.slice(0,EE_SECONDARY_ISSUE_SAMPLE_MAX),fingerprint:hashText_(JSON.stringify(signatures.sort()))};}
function drainOperationAuditRecovery_(journal){var groups=auditLedgerRowsById_(),remaining=[],repaired=0,entries=journal.auditEntries||[];for(var i=0;i<entries.length;i++){var entry=entries[i],expected=normalizeSecondaryRow_('audit',expectedAuditIndexRow_(entry)),rows=groups[entry.id]||[];if(rows.length===1&&same_(rows[0],expected))continue;if(rows.length){journal.manualReviewRequired=true;remaining=entries.slice(i);break;}try{appendCanonicalAuditRow_(entry);groups[entry.id]=[expected];repaired++;}catch(auditErr){remaining=entries.slice(i);break;}}journal.auditEntries=remaining;return repaired;}
function syncWorkspaceAudit_(workspace){var sheet=repositorySpreadsheet_().getSheetByName('Audit'),rows=dataRows_(sheet,12),existing={};for(var i=0;i<rows.length;i++)existing[String(rows[i][0])]=true;var audit=(workspace.audit||[]).slice().reverse();for(var j=0;j<audit.length;j++){var entry=audit[j];if(existing[entry.id])continue;appendCanonicalAuditRow_(entry);existing[entry.id]=true;}}
function appendCanonicalAuditRow_(entry){var sheet=repositorySpreadsheet_().getSheetByName('Audit'),previous='GENESIS';if(sheet.getLastRow()>=2)previous=String(sheetLogicalCell_(sheet.getRange(sheet.getLastRow(),12).getValue())||'GENESIS');var base=[entry.id,entry.teacherId||'',entry.event,entry.summary,entry.entityType,entry.entityId||'',entry.version||1,entry.actorEmail||'',entry.actorRole||'',entry.at,previous];base.push(hashText_(base.join('|')));safeSheetAppendRow_(sheet,base);}
function syncSnapshots_(workspace){var sheet=repositorySpreadsheet_().getSheetByName('Snapshots');var existing={};var rows=dataRows_(sheet,13);for(var i=0;i<rows.length;i++)existing[String(rows[i][0])]=true;var snapshots=workspace.cycleSnapshots||[];for(var j=0;j<snapshots.length;j++){var s=snapshots[j];if(!s.finalizedAt||existing[s.id])continue;appendRow_('Snapshots',[s.id,s.teacherId,s.staffCodeSnapshot,s.academicYear,s.buildingSnapshot,s.employeeTypeSnapshot,s.finalizedAt,s.finalScore,s.domainRatings.d1,s.domainRatings.d2,s.domainRatings.d3,s.domainRatings.d4,s.frameworkVersion]);existing[s.id]=true;}}
function snapshotObjects_(){var rows=dataRows_(repositorySpreadsheet_().getSheetByName('Snapshots'),13),out=[];for(var i=0;i<rows.length;i++)out.push({id:String(rows[i][0]),teacherId:String(rows[i][1]),staffCode:String(rows[i][2]),academicYear:String(rows[i][3]),building:String(rows[i][4]),employeeType:String(rows[i][5]),finalizedAt:toIso_(rows[i][6]),finalScore:numberOrNull_(rows[i][7]),d1:numberOrNull_(rows[i][8]),d2:numberOrNull_(rows[i][9]),d3:numberOrNull_(rows[i][10]),d4:numberOrNull_(rows[i][11]),frameworkVersion:String(rows[i][12])});return out;}

/* ------------------------------- helpers ------------------------------- */

function blankWorkspace_(config){config=isPlainObject_(config)?config:{};var baseBuilding=safeString_(config.building,160,'');var evaluator=safeString_(config.adminDisplayName,160,'Principal');var rawTeachers=config.teachers===undefined?[]:config.teachers;if(!Array.isArray(rawTeachers)||rawTeachers.length>1000)throw eeError_('bad_config','Invalid setup teachers list.');var teachers=[];for(var i=0;i<rawTeachers.length;i++){var raw=requireObject_(rawTeachers[i],'setup teacher');teachers.push(sanitizeTeacher_({id:raw.id,code:raw.code,name:raw.name,building:raw.building||baseBuilding,assignment:raw.assignment||'',employeeType:raw.employeeType||'professional',buildingData:raw.buildingData!==false,teacherSpecificData:raw.teacherSpecificData!==false,active:raw.active!==false,evaluator:raw.evaluator||evaluator,dueDate:raw.dueDate||'',cycleStatus:'not_started',frameworkVersion:'PA Act 13 / Danielson 2021',ratings:{domains:{d1:null,d2:null,d3:null,d4:null},building:null,teacher:null,lea:null}}));}assertUniqueIds_(teachers,'educator');return{kind:'alloflow-educator-evaluation-workspace',version:1,config:{organization:safeString_(config.organization,160,'District'),building:baseBuilding,academicYear:safeString_(config.academicYear,20,''),evaluatorName:evaluator,evaluatorInitials:'',frameworkVersion:'PA Act 13 / Danielson 2021',sampleMode:false},teachers:teachers,walkthroughs:[],observations:[],spms:[],comments:[],audit:[],cycleSnapshots:[],releaseRegistry:[]};}
function jsonOutput_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function publicError_(err){var code=String(err&&err.code||'server_error');var safe={identity_unavailable:1,wrong_domain:1,not_member:1,not_configured:1,denied:1,bad_json:1,bad_request:1,bad_workspace:1,conflict:1,busy:1,not_found:1,immutable:1,invalid_transition:1,too_large:1,review_required:1,review_stale:1,acknowledgment_required:1,manual_recovery_required:1,commit_recovery_required:1,release_recovery_required:1,rollover_recovery_required:1,artifact_recovery_required:1,notification_recovery_required:1,mail_quota_unavailable:1,mail_quota_exhausted:1};return{ok:false,code:safe[code]?code:'server_error',error:safe[code]?String(err.message).slice(0,240):'The district evaluation service could not complete the request.'};}
function eeError_(code,message){var err=new Error(message);err.code=code;return err;}
function isPlainObject_(v){return !!v&&Object.prototype.toString.call(v)==='[object Object]'&&Object.getPrototypeOf(v)===Object.prototype;}
function requireObject_(v,name){if(!isPlainObject_(v))throw eeError_('bad_request',String(name||'value')+' must be an object.');return v;}
function clone_(v){return JSON.parse(JSON.stringify(v));}
function safeString_(v,max,fallback,required){if(v===undefined||v===null)v=fallback||'';if(typeof v!=='string')v=String(v);v=v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').trim();if(v.length>max)throw eeError_('too_large','A text field exceeds '+max+' characters.');if(required&&!v)throw eeError_('bad_request','Required text is empty.');return v;}
function safeId_(v,required){var s=String(v||'');if((s&&!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(s))||(required&&!s))throw eeError_('bad_request','Invalid record identifier.');return s;}
function safeToken_(v,max){var s=String(v||'');if(!/^[A-Za-z0-9_:-]{1,}$/.test(s)||s.length>max)throw eeError_('bad_request','Invalid token.');return s;}
function safePortalUrl_(v){var s=safeString_(v,1000,'');if(!s)return'';var standard=/^https:\/\/script\.google\.com\/(?:a\/[A-Za-z0-9.-]+\/)?macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/i;var alternate=/^https:\/\/script\.google\.com\/a\/macros\/[A-Za-z0-9.-]+\/s\/[A-Za-z0-9_-]+\/exec\/?$/i;if(!standard.test(s)&&!alternate.test(s))throw eeError_('bad_config','Portal URL must be the reviewed Apps Script /exec deployment URL.');return s;}
function normalizeEmail_(v){return String(v||'').trim().toLowerCase();}
function emailDomain_(email){var p=normalizeEmail_(email).split('@');return p.length===2?p[1]:'';}
function normalizeDomain_(v){var s=String(v||'').trim().toLowerCase().replace(/^@/,'');return/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)?s:'';}
function oneOf_(v,allowed,name){var s=String(v||'');if(allowed.indexOf(s)===-1)throw eeError_('bad_request','Invalid '+name+'.');return s;}
function requireRevision_(v){var n=Number(v);if(Math.floor(n)!==n||n<0)throw eeError_('bad_request','expectedVersion must be a nonnegative integer.');return n;}
function clampInt_(v,min,max,fallback){var n=parseInt(v,10);if(!isFinite(n))n=fallback;return Math.max(min,Math.min(max,n));}
function rating_(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);if(!isFinite(n)||n<0||n>3)throw eeError_('bad_request','Invalid rating.');return n;}
function domainRating_(v){var n=rating_(v);if(n!==null&&Math.floor(n)!==n)throw eeError_('bad_request','Framework domain ratings must be whole numbers from 0 to 3.');return n;}
function numberOrNull_(v){if(v===null||v===undefined||v==='')return null;var n=Number(v);return isFinite(n)?n:null;}
function sanitizeDomains_(v){v=isPlainObject_(v)?v:{};return{d1:rating_(v.d1),d2:rating_(v.d2),d3:rating_(v.d3),d4:rating_(v.d4)};}
function sanitizeRubricDomains_(v){v=isPlainObject_(v)?v:{};return{d1:domainRating_(v.d1),d2:domainRating_(v.d2),d3:domainRating_(v.d3),d4:domainRating_(v.d4)};}
function sanitizeTags_(v){if(!Array.isArray(v))return[];if(v.length>50)throw eeError_('too_large','Too many framework tags.');var out=[],seen={};for(var i=0;i<v.length;i++){var s=safeString_(v[i],12,'');if(s&&!seen[s]&&/^[1-4][a-z]$/i.test(s)){seen[s]=true;out.push(s);}}return out;}
function sanitizeWeights_(v){if(v===null||v===undefined)return null;if(!Array.isArray(v)||v.length>6)throw eeError_('bad_request','Invalid weight snapshot.');var out=[];for(var i=0;i<v.length;i++){var x=requireObject_(v[i],'weight');out.push({id:safeToken_(x.id,20),label:safeString_(x.label,100,''),short:safeString_(x.short,30,''),weight:Number(x.weight),color:safeString_(x.color,20,'')});if(!isFinite(out[i].weight)||out[i].weight<=0||out[i].weight>100)throw eeError_('bad_request','Invalid weight.');}return out;}
function optionalTimestamp_(v){if(v===null||v===undefined||v==='')return null;var d=new Date(v);if(isNaN(d.getTime()))throw eeError_('bad_request','Invalid timestamp.');return d.toISOString();}
function optionalDate_(v){if(v===null||v===undefined||v==='')return'';var s=String(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(new Date(s+'T00:00:00Z').getTime()))throw eeError_('bad_request','Invalid date.');return s;}
function nowIso_(){return new Date().toISOString();}
function toIso_(v){var d=new Date(v);return isNaN(d.getTime())?'':d.toISOString();}
function newId_(prefix){return prefix+'-'+Utilities.getUuid().replace(/-/g,'');}
function hashText_(text){var bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8);return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g,'');}
function mapLimited_(v,max,fn){if(!Array.isArray(v))throw eeError_('bad_workspace','Workspace collection must be an array.');if(v.length>max)throw eeError_('too_large','Workspace collection exceeds its record limit.');var out=[];for(var i=0;i<v.length;i++)out.push(fn(v[i]));return out;}
function validateJsonTree_(v,depth){if(depth>EE_MAX_DEPTH)throw eeError_('bad_workspace','Workspace nesting is too deep.');if(Array.isArray(v)){for(var i=0;i<v.length;i++)validateJsonTree_(v[i],depth+1);return;}if(isPlainObject_(v)){var keys=Object.keys(v);for(var j=0;j<keys.length;j++){if(keys[j]==='__proto__'||keys[j]==='prototype'||keys[j]==='constructor')throw eeError_('bad_workspace','Unsafe object key.');validateJsonTree_(v[keys[j]],depth+1);}return;}if(v!==null&&['string','number','boolean'].indexOf(typeof v)===-1)throw eeError_('bad_workspace','Unsupported workspace value.');}
function assertUniqueIds_(items,label){var seen={};for(var i=0;i<items.length;i++){if(seen[items[i].id])throw eeError_('bad_workspace','Duplicate '+label+' id.');seen[items[i].id]=true;}}
function indexById_(items){var out={};for(var i=0;i<items.length;i++)out[items[i].id]=items[i];return out;}
function findById_(items,id){for(var i=0;i<items.length;i++)if(items[i].id===id)return items[i];return null;}
function replaceById_(items,next){for(var i=0;i<items.length;i++)if(items[i].id===next.id){items[i]=next;return;}items.push(next);}
function filterByTeacher_(items,ids,isTeacherList){items=items||[];return items.filter(function(item){return !!ids[isTeacherList?item.id:item.teacherId];});}
function same_(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function sameExcept_(a,b,allowed){var x=clone_(a),y=clone_(b);for(var i=0;i<allowed.length;i++){delete x[allowed[i]];delete y[allowed[i]];}return same_(x,y);}
function sameProposal_(a,b){var fields=['context','baseline','goal','measures','actionPlan','results','reflection','revisions'];for(var i=0;i<fields.length;i++)if(!same_(a[fields[i]],b[fields[i]]))return false;return true;}
function observationTimestampFields_(){return['preworkSubmittedAt','preConferenceAt','observedAt','evidencePublishedAt','reflectionSubmittedAt','postConferenceAt','evaluatorSignedAt','teacherAcknowledgedAt','finalizedAt'];}
function recordType_(v){return oneOf_(v,['walkthrough','formal_observation','spm'],'recordType');}
function requireRecord_(workspace,teacherId,type,id,actor){var collection=type==='walkthrough'?workspace.walkthroughs:(type==='formal_observation'?workspace.observations:workspace.spms);var found=findById_(collection||[],id);if(!found||found.teacherId!==teacherId)throw eeError_('not_found','Evaluation record not found.');if(type==='walkthrough'&&!found.publishedAt)throw eeError_('invalid_transition','Comments are available only after the walkthrough is published.');return found;}
function requireReceiptState_(record,type,receiptType,actor){if(receiptType==='opened'){if(actor.role==='teacher'||type!=='spm'||record.status!=='submitted'||!record.submittedAt)throw eeError_('invalid_transition','Open receipts require an evaluator opening a submitted SPM.');return;}if(actor.role!=='teacher')throw eeError_('denied','Teacher acknowledgment receipts require the teacher.');if(type==='walkthrough'&&record.publishedAt&&record.teacherAcknowledgedAt)return;if(type==='formal_observation'&&record.evaluatorSignedAt&&record.teacherAcknowledgedAt)return;throw eeError_('invalid_transition','Acknowledgment receipt requires the completed record milestone.');}
function notificationRecipient_(teacherId,target,actor){var members=memberObjects_();if(target==='teacher'){for(var i=0;i<members.length;i++)if(members[i].active&&members[i].role==='teacher'&&members[i].teacherId===teacherId)return members[i].email;}else{var assignments=assignmentObjects_();for(var j=0;j<assignments.length;j++){var assignment=assignments[j];if(!assignment.active||assignment.teacherId!==teacherId||(actor.role!=='teacher'&&assignment.evaluatorEmail!==actor.email))continue;for(var k=0;k<members.length;k++){var member=members[k];if(member.active&&member.email===assignment.evaluatorEmail&&(member.role==='evaluator'||member.role==='admin'))return member.email;}}}return'';}
function parseBool_(v){return v===true||String(v).toLowerCase()==='true'||String(v)==='1';}
function dateInRange_(iso,from,to){var day=String(iso||'').slice(0,10);return!!day&&(!from||day>=from)&&(!to||day<=to);}
function mean_(values){var n=0;for(var i=0;i<values.length;i++)n+=values[i];return n/values.length;}
function median_(values){var copy=values.slice().sort(function(a,b){return a-b;});var m=Math.floor(copy.length/2);return copy.length%2?copy[m]:(copy[m-1]+copy[m])/2;}
function round_(v,d){var p=Math.pow(10,d);return Math.round(v*p)/p;}

var _test = {
  normalizeEmail: normalizeEmail_, normalizeDomain: normalizeDomain_, emailDomain: emailDomain_,
  safeId: safeId_, sanitizeWorkspace: sanitizeWorkspace_, validateJsonTree: validateJsonTree_,
  teacherObservationUpdate: teacherObservationUpdate_, teacherSpmUpdate: teacherSpmUpdate_,
  filterWorkspaceForActor: filterWorkspaceForActor_, median: median_, mean: mean_,
  dateInRange: dateInRange_, publicError: publicError_, blankWorkspace: blankWorkspace_
};
