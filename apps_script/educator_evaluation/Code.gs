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

  var state = readWorkspaceState_();
  validateRepositoryReferences_(state.workspace);
  if (!state.metadataExists) writeWorkspaceState_(state.workspace, 0, email);
  syncSnapshots_(state.workspace);
  appendAuditRowLocked_({ teacherId: '', event: existing ? 'REPOSITORY_RECONFIGURED' : 'REPOSITORY_CREATED', summary: existing ? 'Repository configuration reviewed' : 'District repository created', entityType: 'repository', entityId: 'repository', version: state.revision }, { email: email, role: 'admin' });
  props.setProperty('EE_SETUP_STATE', 'ready');
  return { ok: true, service: EE_SERVICE, version: EE_VERSION, allowedDomain: domain, spreadsheetId: spreadsheet.getId(), folderId: folder.getId(), activeUserEmail: email };
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
function auditChainStatus_() {
  var sheet = repositorySpreadsheet_().getSheetByName('Audit');
  if (!sheet) throw eeError_('not_configured', 'Audit sheet is not configured.');
  var rows = dataRows_(sheet, 12);
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

function adminUpsertMember(member) {
  var actor = requireAdmin_();
  var normalized = normalizeMember_(member, PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var workspace = readWorkspaceState_().workspace;
    if (normalized.role === 'teacher' && !findById_(workspace.teachers || [], normalized.teacherId)) throw eeError_('bad_member', 'Teacher membership must reference an existing educator record.');
    assertAdminInvariantAfterMember_(normalized);
    upsertMemberRow_(repositorySpreadsheet_(), normalized);
    appendAuditRow_({ teacherId: normalized.teacherId, event: 'MEMBER_UPDATED', summary: 'Repository membership updated', entityType: 'member', entityId: hashText_(normalized.email).slice(0, 20), version: 1 }, actor);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function adminUpsertAssignment(assignment) {
  var actor = requireAdmin_();
  var normalized = normalizeAssignment_(assignment, PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var workspace = readWorkspaceState_().workspace;
    if (!findById_(workspace.teachers || [], normalized.teacherId)) throw eeError_('bad_assignment', 'Assignment must reference an existing educator record.');
    var members = memberObjects_(), evaluatorFound = false;
    for (var i = 0; i < members.length; i++) if (members[i].active && members[i].email === normalized.evaluatorEmail && (members[i].role === 'evaluator' || members[i].role === 'admin')) evaluatorFound = true;
    if (!evaluatorFound) throw eeError_('bad_assignment', 'Assignment must reference an active evaluator or administrator member.');
    upsertAssignmentRow_(repositorySpreadsheet_(), normalized);
    appendAuditRow_({ teacherId: normalized.teacherId, event: 'ASSIGNMENT_UPDATED', summary: 'Evaluator assignment updated', entityType: 'assignment', entityId: normalized.teacherId, version: 1 }, actor);
    return { ok: true };
  } finally { lock.releaseLock(); }
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
  request = requireObject_(request, 'request');
  var expected = requireRevision_(request.expectedVersion);
  var incoming = sanitizeWorkspace_(request.workspace);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { ok: false, code: 'busy', error: 'Repository is busy. Retry the save.' };
  try {
    var state = readWorkspaceState_();
    reconcileSecondaryIndexesIfNeeded_(state.workspace);
    if (state.revision !== expected) return { ok: false, code: 'conflict', error: 'This evaluation changed in another session. Reload before saving.', revision: state.revision, version: state.revision };
    var merged = mergeWorkspaceForActor_(state.workspace, incoming, actor, request.mutation);
    canonicalizeServerFields_(state.workspace, merged, actor);
    freezeCycleWeights_(state.workspace, merged);
    deriveFinalizedSnapshots_(state.workspace, merged, actor, request.mutation);
    var mutation = deriveMutation_(request.mutation, state.workspace, merged, actor);
    if (mutation) appendWorkspaceAudit_(merged, mutation, actor);
    var nextRevision = state.revision + 1;
    var visible = filterWorkspaceForActor_(merged, actor);
    var commit = writeWorkspaceState_(merged, nextRevision, actor.email);
    if (commit.pending) throw eeError_('commit_recovery_required', 'The workspace journal was written, but the primary evaluation record was not confirmed. Do not retry this change; reload the district record or ask an administrator to check Setup health.');
    var reconciliationPending = false;
    try { syncSecondaryIndexes_(merged); PropertiesService.getScriptProperties().deleteProperty('EE_SECONDARY_RECONCILE_REQUIRED'); }
    catch (sinkErr) { PropertiesService.getScriptProperties().setProperty('EE_SECONDARY_RECONCILE_REQUIRED','1'); reconciliationPending = true; }
    return { ok: true, workspace: visible, revision: nextRevision, version: nextRevision, reconciliationPending: reconciliationPending };
  } finally { lock.releaseLock(); }
}

function appendPortalMessage_(request) {
  var actor = currentActor_();
  request = requireObject_(request, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  var type = recordType_(request.recordType);
  var recordId = safeId_(request.recordId, true);
  var text = safeString_(request.text, EE_MAX_MESSAGE_CHARS, '', true);
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var state = readWorkspaceState_();
    requireRecord_(state.workspace, teacherId, type, recordId, actor);
    var at = nowIso_();
    var message = { id: newId_('msg'), teacherId: teacherId, recordType: type, recordId: recordId, text: text, role: actor.role === 'teacher' ? 'Teacher' : 'Evaluator', author: actor.displayName, at: at, version: 1 };
    state.workspace.comments = state.workspace.comments || [];
    state.workspace.comments.push(message);
    appendRow_('Messages', [message.id, teacherId, type, recordId, actor.email, actor.role, text, at]);
    var mutation = { teacherId: teacherId, event: 'COMMENTED', summary: 'Shared comment posted', entityType: type, entityId: recordId, version: 1 };
    appendWorkspaceAudit_(state.workspace, mutation, actor);
    writeWorkspaceState_(state.workspace, state.revision + 1, actor.email);
    appendAuditRow_(mutation, actor);
    return { ok: true, message: message, revision: state.revision + 1, version: state.revision + 1 };
  } finally { lock.releaseLock(); }
}

function recordPortalReceipt_(request) {
  var actor = currentActor_();
  request = requireObject_(request, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  var type = recordType_(request.recordType);
  var recordId = safeId_(request.recordId, true);
  var receiptType = oneOf_(request.receiptType, ['opened', 'acknowledged'], 'receiptType');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var state = readWorkspaceState_();
    var record = requireRecord_(state.workspace, teacherId, type, recordId, actor);
    requireReceiptState_(record, type, receiptType, actor);
    var existing = findReceipt_(teacherId, type, recordId, receiptType, actor.email);
    if (existing) return { ok: true, receipt: existing, duplicate: true, revision: state.revision, version: state.revision };
    var receiptAt = nowIso_();
    if (receiptType === 'opened' && !record.firstOpenedAt) {
      record.firstOpenedAt = receiptAt;
      record.updatedAt = receiptAt;
    }
    var receipt = { id: newId_('receipt'), teacherId: teacherId, recordType: type, recordId: recordId, receiptType: receiptType, actorEmail: actor.email, actorRole: actor.role, at: receiptAt };
    appendRow_('Receipts', [receipt.id, teacherId, type, recordId, receiptType, actor.email, actor.role, receipt.at]);
    var mutation = { teacherId: teacherId, event: 'RECEIPT_' + receiptType.toUpperCase(), summary: receiptSummary_(receiptType), entityType: type, entityId: recordId, version: 1 };
    appendWorkspaceAudit_(state.workspace, mutation, actor);
    writeWorkspaceState_(state.workspace, state.revision + 1, actor.email);
    appendAuditRow_(mutation, actor);
    return { ok: true, receipt: receipt, revision: state.revision + 1, version: state.revision + 1 };
  } finally { lock.releaseLock(); }
}

function sendPortalNotification(request) {
  var actor = currentActor_();
  request = requireObject_(request, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  var target = oneOf_(request.target || (actor.role === 'teacher' ? 'evaluator' : 'teacher'), ['teacher', 'evaluator'], 'target');
  if (actor.role === 'teacher' && target !== 'evaluator') throw eeError_('denied', 'Teachers may notify only their assigned evaluator.');
  var recipient = notificationRecipient_(teacherId, target, actor);
  if (!recipient) throw eeError_('not_configured', 'No authorized notification recipient is configured.');
  var allowedDomain = PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN');
  if (emailDomain_(recipient) !== allowedDomain) throw eeError_('denied', 'Notification recipient is outside the district domain.');
  var throttleKey = 'EE_NOTIFY_' + hashText_(actor.email + '|' + teacherId + '|' + target).slice(0, 32);
  var cache = CacheService.getScriptCache();
  if (cache.get(throttleKey)) return { ok: false, code: 'rate_limited', error: 'A portal notification was sent recently. Please wait before sending another.', retryAfterMs: 300000 };
  var config = configMap_();
  var url = config.webAppUrl || safePortalUrl_(ScriptApp.getService().getUrl() || '');
  var body = 'There is new activity in the AlloFlow Educator Evaluation portal.\n\nSign in with your district Google account';
  // Deep link straight to the relevant educator record. The parameters carry
  // only opaque record identifiers: no name, rating, or content, and are
  // useless without an authorized signed-in district account.
  if (url) body += ':\n' + url + (url.indexOf('?') >= 0 ? '&' : '?') + 'view=overview&teacher=' + encodeURIComponent(teacherId);
  body += '\n\nFor privacy, this email contains no evaluation content, ratings, evidence, comments, or educator name.';
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    if (cache.get(throttleKey)) return { ok: false, code: 'rate_limited', error: 'A portal notification was sent recently. Please wait before sending another.', retryAfterMs: 300000 };
    cache.put(throttleKey, '1', 300);
    try {
      MailApp.sendEmail({ to: recipient, subject: 'AlloFlow evaluation portal activity', body: body, name: 'AlloFlow Evaluation Portal', noReply: true });
    } catch (mailErr) { cache.remove(throttleKey); throw mailErr; }
    appendAuditRow_({ teacherId: teacherId, event: 'NOTIFICATION_SENT', summary: 'Content-free portal notification sent', entityType: 'notification', entityId: target, version: 1 }, actor);
    return { ok: true, sent: true, target: target };
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
  for (var i = 0; i < members.length; i++) {
    if (members[i].active && members[i].role === 'teacher' && members[i].teacherId === teacherId) return members[i].email;
  }
  throw eeError_('not_configured', 'No active portal member account is linked to this educator record, so the document cannot be shared. Add the educator as a member first.');
}

function releasedEvaluationsFolder_() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('EE_RELEASED_FOLDER_ID');
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); } catch (err) {}
  }
  var parent = DriveApp.getFolderById(props.getProperty('EE_FOLDER_ID'));
  var folder = parent.createFolder('Released evaluations');
  props.setProperty('EE_RELEASED_FOLDER_ID', folder.getId());
  return folder;
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
  var actor = currentActor_();
  if (actor.role !== 'admin' && actor.role !== 'evaluator') throw eeError_('denied', 'Only an assigned evaluator or administrator can review released-summary access.');
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  var recipient = teacherMemberEmail_(teacherId);
  var allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  if (!allowedDomain || emailDomain_(recipient) !== allowedDomain) throw eeError_('denied', 'The educator account is outside the district domain.');
  var state = readWorkspaceState_();
  if (releaseRecoveryRequiredForState_(state)) throw eeError_('release_recovery_required', 'A prior released-summary operation still needs administrator recovery. Run Setup health and resolve it before reviewing another release.');
  var teacher = findById_(state.workspace.teachers || [], teacherId);
  if (!teacher) throw eeError_('not_found', 'Educator record not found.');
  if (!teacher.finalizedAt) throw eeError_('invalid_transition', 'The educator cycle must be finalized before the evaluation can be shared.');
  var existingId = releasedDocId_(teacher.releasedDoc);
  var existingAccessible = false;
  if (existingId) {
    try { var existingFile = DriveApp.getFileById(existingId); existingAccessible = typeof existingFile.isTrashed !== 'function' || !existingFile.isTrashed(); } catch (existingErr) {}
  }
  var releaseAction = teacher.releasedDoc ? (existingId && existingAccessible ? 'verify_existing' : 'replace_unavailable') : 'create';
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
      actorWillReceiveAccess: actor.email !== recipient,
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
  if (!review || review.actorEmail !== actor.email || review.teacherId !== teacher.id || review.recipient !== recipient || Number(review.revision) !== Number(revision) || review.finalizedAt !== teacher.finalizedAt || review.existingId !== releasedDocId_(teacher.releasedDoc)) {
    cache.remove(key);
    throw eeError_('review_stale', 'The evaluation or release record changed after review. Reload and review the disclosure again.');
  }
  cache.remove(key);
  return review;
}

function driveUserEmail_(user) {
  try { return normalizeEmail_(user && typeof user.getEmail === 'function' ? user.getEmail() : user); } catch (err) { return ''; }
}

function fileHasAccess_(file, email) {
  email = normalizeEmail_(email);
  var owner = '';
  try { owner = normalizeEmail_(Session.getEffectiveUser().getEmail()); } catch (ownerErr) {}
  if (email && email === owner) return true;
  var viewers = typeof file.getViewers === 'function' ? file.getViewers() : [];
  var editors = typeof file.getEditors === 'function' ? file.getEditors() : [];
  var users = viewers.concat(editors);
  for (var i = 0; i < users.length; i++) if (driveUserEmail_(users[i]) === email) return true;
  return false;
}

function grantReleasedDocAccess_(file, emails) {
  var granted = [];
  for (var i = 0; i < emails.length; i++) {
    var email = normalizeEmail_(emails[i]);
    if (!email || granted.indexOf(email) !== -1) continue;
    if (!fileHasAccess_(file, email)) file.addViewer(email);
    if (!fileHasAccess_(file, email)) throw eeError_('share_verification_failed', 'Google Drive did not confirm view-only access for an authorized recipient.');
    granted.push(email);
  }
  return granted;
}

function supersededReleasedDocs_(releasedDoc) {
  if (!isPlainObject_(releasedDoc)) return [];
  var history = Array.isArray(releasedDoc.history) ? releasedDoc.history.slice(-24) : [];
  var id = releasedDocId_(releasedDoc);
  if (id || releasedDoc.url) history.push({ id: id, url: safeString_(releasedDoc.url, 400, ''), at: optionalTimestamp_(releasedDoc.at), by: safeString_(releasedDoc.by, 160, ''), openedAt: optionalTimestamp_(releasedDoc.openedAt), status: 'superseded_unavailable', supersededAt: nowIso_() });
  return history.slice(-25);
}

function recordReleaseRecovery_(payload) {
  PropertiesService.getScriptProperties().setProperty('EE_RELEASE_RECOVERY_REQUIRED', JSON.stringify(payload || { at: nowIso_() }));
}

function clearReleaseRecovery_() { PropertiesService.getScriptProperties().deleteProperty('EE_RELEASE_RECOVERY_REQUIRED'); }

function releaseRecoveryRequiredForState_(state) {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('EE_RELEASE_RECOVERY_REQUIRED');
  if (!raw) return false;
  var item;
  try { item = JSON.parse(raw); } catch (parseErr) { return true; }
  if (item && item.stage === 'workspace_commit' && state && state.workspace) {
    var teacher = findById_(state.workspace.teachers || [], safeId_(item.teacherId || '', false));
    if (teacher && releasedDocId_(teacher.releasedDoc) === safeId_(item.documentId || '', false)) {
      props.deleteProperty('EE_RELEASE_RECOVERY_REQUIRED');
      return false;
    }
  }
  return true;
}

function quarantineUncommittedRelease_(file, emails) {
  var clean = true;
  for (var i = 0; i < emails.length; i++) {
    try { file.removeViewer(emails[i]); } catch (removeErr) { clean = false; }
  }
  try { file.setTrashed(true); } catch (trashErr) { clean = false; }
  return clean;
}

function sharePortalReleasedEvaluation(request) {
  var actor = currentActor_();
  if (actor.role !== 'admin' && actor.role !== 'evaluator') throw eeError_('denied', 'Only an assigned evaluator or administrator can share a released evaluation.');
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  requireTeacherAccess_(actor, teacherId);
  var recipient = teacherMemberEmail_(teacherId);
  var allowedDomain = normalizeDomain_(PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
  if (!allowedDomain || emailDomain_(recipient) !== allowedDomain) throw eeError_('denied', 'The educator account is outside the district domain.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var state = readWorkspaceState_();
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
    var accessEmails = [recipient];
    var effectiveOwner = '';
    try { effectiveOwner = normalizeEmail_(Session.getEffectiveUser().getEmail()); } catch (ownerErr) {}
    if (actor.email !== effectiveOwner && actor.email !== recipient) accessEmails.push(actor.email);
    if (existingId) {
      try { file = DriveApp.getFileById(existingId); if (typeof file.isTrashed === 'function' && file.isTrashed()) file = null; } catch (missingErr) { file = null; }
    }
    if ((releaseReview.action === 'verify_existing') !== !!file) throw eeError_('review_stale', 'The current Drive document changed after review. Review the disclosure again before changing access.');
    try {
      if (!file) {
        built = buildReleasedEvaluationDoc_(workspace, teacher, actor);
        file = DriveApp.getFileById(built.id);
        created = true;
        file.moveTo(releasedEvaluationsFolder_());
        setPrivate_(file);
      } else {
        built = { id: existingId, url: teacher.releasedDoc.url };
        file.setShareableByEditors(false);
      }
      grantReleasedDocAccess_(file, accessEmails);
      var releasedAt = created ? nowIso_() : (teacher.releasedDoc.at || nowIso_());
      var mutation = {
        teacherId: teacherId,
        event: created ? 'RELEASED_DOC_SHARED' : 'RELEASED_DOC_ACCESS_VERIFIED',
        summary: created ? 'Released evaluation document shared view-only with the educator' : 'Released evaluation document access verified without creating a duplicate',
        entityType: 'released_summary',
        entityId: built.id,
        version: 1,
      };
      teacher.releasedDoc = {
        id: built.id,
        url: built.url,
        at: releasedAt,
        by: created ? actor.email : (teacher.releasedDoc.by || actor.email),
        sharedWith: recipient,
        openedAt: created ? '' : optionalTimestamp_(teacher.releasedDoc.openedAt),
        accessReviewedAt: nowIso_(),
        history: created && teacher.releasedDoc ? supersededReleasedDocs_(teacher.releasedDoc) : (teacher.releasedDoc && teacher.releasedDoc.history ? teacher.releasedDoc.history : []),
      };
      var auditEntry = appendWorkspaceAudit_(workspace, mutation, actor);
      commitStarted = true;
      var commit = writeWorkspaceState_(workspace, state.revision + 1, actor.email);
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
        catch (auditErr) { PropertiesService.getScriptProperties().setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1'); auditPending = true; }
        clearReleaseRecovery_();
      } else {
        recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: built.id, stage: 'workspace_commit', actorEmail: actor.email });
      }
      return {
        ok: true,
        status: recoveryPending ? 'recovery_pending' : 'released',
        doc: { id: built.id, url: built.url, sharedAt: releasedAt },
        url: built.url,
        sharedWith: recipient,
        access: { educator: 'viewer', actor: actor.email === effectiveOwner ? 'owner' : 'viewer' },
        created: created,
        idempotent: !created,
        recoveryPending: recoveryPending,
        auditPending: auditPending,
        separatePortalNoticeSent: false,
      };
    } catch (releaseErr) {
      if (created && file && !commitStarted) {
        var quarantined = quarantineUncommittedRelease_(file, accessEmails);
        if (!quarantined) {
          recordReleaseRecovery_({ at: nowIso_(), teacherId: teacherId, documentId: built && built.id, stage: 'compensation', actorEmail: actor.email });
          throw eeError_('release_recovery_required', 'The release did not complete and automatic Drive cleanup could not be confirmed. An administrator must run Setup health and inspect the recovery item before trying again.');
        }
      }
      throw releaseErr;
    }
  } finally { lock.releaseLock(); }
}

function eeDocPlainDate_(iso) {
  if (!iso) return '';
  try { return Utilities.formatDate(new Date(iso), Session.getScriptTimeZone(), 'MMMM d, yyyy'); } catch (err) { return String(iso).slice(0, 10); }
}

function buildReleasedEvaluationDoc_(workspace, teacher, actor) {
  var config = configMap_();
  var frameworkProfile = (workspace.config && workspace.config.frameworkProfile) || 'maine_pepg';
  var teacherName = safeString_(teacher.name, 160, '') || safeString_(teacher.code, 60, 'Educator');
  var year = safeString_(teacher.academicYear || (workspace.config && workspace.config.academicYear), 40, '');
  var doc = DocumentApp.create('Released evaluation - ' + teacherName + (year ? ' - ' + year : ''));
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
  return { id: doc.getId(), url: doc.getUrl() };
}

/**
 * Honest open receipt for the released summary: records that the educator
 * clicked the portal link to their shared Doc. Deliberately labeled a LINK
 * click, Drive itself cannot tell us the document was read.
 */
function recordReleasedSummaryOpened(request) {
  var actor = currentActor_();
  if (actor.role !== 'teacher') return { ok: true, skipped: true };
  request = requireObject_(request || {}, 'request');
  var teacherId = safeId_(request.teacherId, true);
  if (actor.teacherId !== teacherId) throw eeError_('denied', 'Educator record is outside this account.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var state = readWorkspaceState_();
    var teacher = findById_(state.workspace.teachers || [], teacherId);
    if (!teacher || !teacher.releasedDoc) return { ok: true, skipped: true };
    if (teacher.releasedDoc.openedAt) return { ok: true, openedAt: teacher.releasedDoc.openedAt, duplicate: true };
    teacher.releasedDoc.openedAt = nowIso_();
    var mutation = { teacherId: teacherId, event: 'RECEIPT_OPENED', summary: 'Educator opened the released summary link', entityType: 'released_summary', entityId: teacherId, version: 1 };
    appendWorkspaceAudit_(state.workspace, mutation, actor);
    writeWorkspaceState_(state.workspace, state.revision + 1, actor.email);
    appendAuditRow_(mutation, actor);
    return { ok: true, openedAt: teacher.releasedDoc.openedAt };
  } finally { lock.releaseLock(); }
}

/**
 * Admin-only, read-only bootstrap health check: surfaces in the portal the
 * verifications that previously required running functions in the script
 * editor. Names counts, never member emails.
 */
function getPortalSetupHealth() {
  var actor = requireAdmin_();
  var props = PropertiesService.getScriptProperties();
  var members = memberObjects_();
  var assignments = assignmentObjects_();
  var releaseRecoveryRequired = !!props.getProperty('EE_RELEASE_RECOVERY_REQUIRED');
  var rolloverRecoveryRequired = !!props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
  var workspaceCommitRecoveryRequired = !!props.getProperty('EE_COMMIT_RECOVERY_REQUIRED');
  var state;
  try {
    state = readWorkspaceState_();
    releaseRecoveryRequired = releaseRecoveryRequiredForState_(state);
    workspaceCommitRecoveryRequired = !!props.getProperty('EE_COMMIT_RECOVERY_REQUIRED');
  }
  catch (workspaceErr) {
    if (!releaseRecoveryRequired && !rolloverRecoveryRequired && !workspaceCommitRecoveryRequired) throw workspaceErr;
    state = { workspace: { teachers: [] }, revision: -1, metadataExists: false };
  }
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
  return {
    ok: true,
    checkedAt: nowIso_(),
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
      auditChainBreakReason: audit.ok ? '' : String(audit.reason || 'unknown'),
      auditChainBrokenAtRow: audit.ok ? 0 : (audit.brokenAtRow || 0),
      workspaceCommitRecoveryRequired: workspaceCommitRecoveryRequired,
      releasedSummaryRecoveryRequired: releaseRecoveryRequired,
      annualRolloverRecoveryRequired: rolloverRecoveryRequired,
      deploymentOwnerMatchesBootstrapAdmin: !!effectiveOwner && !!bootstrapAdmin && effectiveOwner === bootstrapAdmin,
      lastAnnualRolloverAt: lastRollover && optionalTimestamp_(lastRollover.at) || '',
      lastAnnualRolloverFromYear: lastRollover ? safeString_(lastRollover.fromYear, 20, '') : '',
      lastAnnualRolloverToYear: lastRollover ? safeString_(lastRollover.toYear, 20, '') : '',
    },
  };
}

/* ---------------- district administrator operations ---------------- */

function adminReviewCacheKey_(token) { return 'EE_ADMIN_REVIEW_' + safeId_(token, true); }
function directoryFingerprint_() { return hashText_(JSON.stringify({ members: memberObjects_(), assignments: assignmentObjects_() })); }
function assertUniqueTeacherMember_(candidate, members) {
  if (!candidate.active || candidate.role !== 'teacher') return;
  for (var i = 0; i < members.length; i++) {
    var member = members[i];
    if (member.active && member.role === 'teacher' && member.teacherId === candidate.teacherId && member.email !== candidate.email) {
      throw eeError_('bad_member', 'That educator record is already linked to another active managed account. Deactivate the old account first.');
    }
  }
}

function portalAdminDirectory_() {
  var state = readWorkspaceState_();
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
  request = requireObject_(request || {}, 'request');
  var kind = oneOf_(request.kind, ['member', 'assignment'], 'directory change kind');
  var domain = PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN');
  var candidate = kind === 'member' ? normalizeMember_(request.candidate, domain) : normalizeAssignment_(request.candidate, domain);
  var directory = portalAdminDirectory_();
  var current = null;
  if (kind === 'member') {
    for (var i = 0; i < directory.members.length; i++) if (directory.members[i].email === candidate.email) current = directory.members[i];
    if (candidate.role === 'teacher' && !findById_(directory.educators, candidate.teacherId)) throw eeError_('bad_member', 'Teacher membership must reference an existing educator record.');
    assertUniqueTeacherMember_(candidate, directory.members);
  } else {
    for (var j = 0; j < directory.assignments.length; j++) if (directory.assignments[j].teacherId === candidate.teacherId && directory.assignments[j].evaluatorEmail === candidate.evaluatorEmail) current = directory.assignments[j];
    if (!findById_(directory.educators, candidate.teacherId)) throw eeError_('bad_assignment', 'Assignment must reference an existing educator record.');
    var evaluatorFound = directory.members.some(function (member) { return member.active && member.email === candidate.evaluatorEmail && (member.role === 'evaluator' || member.role === 'admin'); });
    if (!evaluatorFound) throw eeError_('bad_assignment', 'Assignment must reference an active evaluator or administrator member.');
  }
  var token = newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({ actorEmail: actor.email, operation: 'directory', kind: kind, candidate: candidate, fingerprint: directoryFingerprint_() }), EE_ADMIN_REVIEW_SECONDS);
  var impacts = kind === 'member' ? {
    removesPortalAccess: !!current && current.active && !candidate.active,
    changesRole: !!current && current.role !== candidate.role,
    activeEvaluatorAssignments: directory.assignments.filter(function (assignment) { return assignment.active && assignment.evaluatorEmail === candidate.email; }).length,
  } : {
    educatorName: (findById_(directory.educators, candidate.teacherId) || {}).name || candidate.teacherId,
    removesEvaluatorAccess: !!current && current.active && !candidate.active,
  };
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), kind: kind, action: current ? 'update' : 'create', current: current, candidate: candidate, impacts: impacts } };
}

function performPortalDirectoryChange(request) {
  var actor = requireAdmin_();
  request = requireObject_(request || {}, 'request');
  if (request.acknowledgeImpact !== true) throw eeError_('acknowledgment_required', 'Confirm the membership or assignment impact before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var token = safeId_(request.reviewToken || '', false);
    if (!token) throw eeError_('review_required', 'Review the directory change before applying it.');
    var cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = cache.get(key), review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'directory') throw eeError_('review_required', 'The directory review expired or was already used. Review the change again.');
    if (review.fingerprint !== directoryFingerprint_()) { cache.remove(key); throw eeError_('review_stale', 'Membership or assignments changed after review. Reload and review again.'); }
    cache.remove(key);
    var workspace = readWorkspaceState_().workspace;
    if (review.kind === 'member') {
      var member = normalizeMember_(review.candidate, PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
      if (member.role === 'teacher' && !findById_(workspace.teachers || [], member.teacherId)) throw eeError_('bad_member', 'Teacher membership must reference an existing educator record.');
      assertUniqueTeacherMember_(member, memberObjects_());
      assertAdminInvariantAfterMember_(member);
      upsertMemberRow_(repositorySpreadsheet_(), member);
      appendAuditRow_({ teacherId: member.teacherId, event: 'MEMBER_UPDATED', summary: member.active ? 'Repository membership created or updated' : 'Repository membership deactivated', entityType: 'member', entityId: hashText_(member.email).slice(0, 20), version: 1 }, actor);
    } else {
      var assignment = normalizeAssignment_(review.candidate, PropertiesService.getScriptProperties().getProperty('EE_ALLOWED_DOMAIN'));
      if (!findById_(workspace.teachers || [], assignment.teacherId)) throw eeError_('bad_assignment', 'Assignment must reference an existing educator record.');
      var members = memberObjects_(), evaluatorFound = false;
      for (var i = 0; i < members.length; i++) if (members[i].active && members[i].email === assignment.evaluatorEmail && (members[i].role === 'evaluator' || members[i].role === 'admin')) evaluatorFound = true;
      if (!evaluatorFound) throw eeError_('bad_assignment', 'Assignment must reference an active evaluator or administrator member.');
      upsertAssignmentRow_(repositorySpreadsheet_(), assignment);
      appendAuditRow_({ teacherId: assignment.teacherId, event: 'ASSIGNMENT_UPDATED', summary: assignment.active ? 'Evaluator assignment created or activated' : 'Evaluator assignment deactivated', entityType: 'assignment', entityId: assignment.teacherId, version: 1 }, actor);
    }
    return { ok: true, status: 'completed', directory: portalAdminDirectory_() };
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
  request = requireObject_(request || {}, 'request');
  var state = readWorkspaceState_(), plan = scheduleTargets_(state.workspace, request);
  var token = newId_('admin-review');
  var targetIds = plan.targets.map(function (teacher) { return teacher.id; });
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({ actorEmail: actor.email, operation: 'schedule', revision: state.revision, dueDate: plan.dueDate, applyTo: plan.applyTo, building: plan.building, targetHash: hashText_(JSON.stringify(targetIds)) }), EE_ADMIN_REVIEW_SECONDS);
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), dueDate: plan.dueDate, applyTo: plan.applyTo, building: plan.building, affectedEducators: targetIds.length, skippedFinalized: (state.workspace.teachers || []).filter(function (teacher) { return teacher.active !== false && !!teacher.finalizedAt && (!plan.building || teacher.building === plan.building); }).length, sample: plan.targets.slice(0, 8).map(function (teacher) { return { id: teacher.id, code: teacher.code, name: teacher.name, previousDueDate: teacher.dueDate || '' }; }) } };
}

function performPortalCycleSchedule(request) {
  var actor = requireAdmin_();
  request = requireObject_(request || {}, 'request');
  if (request.acknowledgeImpact !== true) throw eeError_('acknowledgment_required', 'Confirm the cycle schedule impact before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var token = safeId_(request.reviewToken || '', false), cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'schedule') throw eeError_('review_required', 'The schedule review expired or was already used. Review it again.');
    var state = readWorkspaceState_();
    if (Number(review.revision) !== Number(state.revision)) { cache.remove(key); throw eeError_('review_stale', 'The workspace changed after review. Reload and review the schedule again.'); }
    var plan = scheduleTargets_(state.workspace, review);
    var ids = plan.targets.map(function (teacher) { return teacher.id; });
    if (hashText_(JSON.stringify(ids)) !== review.targetHash) { cache.remove(key); throw eeError_('review_stale', 'The eligible educator set changed after review. Review the schedule again.'); }
    cache.remove(key);
    for (var i = 0; i < plan.targets.length; i++) plan.targets[i].dueDate = plan.dueDate;
    var auditEntry = appendWorkspaceAudit_(state.workspace, { event: 'CYCLE_SCHEDULE_UPDATED', summary: 'Administrator applied a reviewed cycle due-date schedule to ' + ids.length + ' educator records', entityType: 'cycle_schedule', entityId: 'schedule-' + plan.dueDate, version: 1 }, actor);
    var commit = writeWorkspaceState_(state.workspace, state.revision + 1, actor.email), pending = !!commit.pending;
    if (!pending) { try { appendCanonicalAuditRow_(auditEntry); } catch (auditErr) { PropertiesService.getScriptProperties().setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1'); } }
    return { ok: true, status: pending ? 'recovery_pending' : 'completed', recoveryPending: pending, dueDate: plan.dueDate, affectedEducators: ids.length, revision: state.revision + 1 };
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
  request = requireObject_(request || {}, 'request');
  var state = readWorkspaceState_();
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
  request = requireObject_(request || {}, 'request');
  if (request.acknowledgeImpact !== true) throw eeError_('acknowledgment_required', 'Confirm the district-wide configuration impact before applying it.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var token = safeId_(request.reviewToken || '', false);
    var cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'configuration') throw eeError_('review_required', 'The configuration review expired or was already used. Review the settings again.');
    var state = readWorkspaceState_();
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
    var commit = writeWorkspaceState_(state.workspace, nextRevision, actor.email), pending = !!commit.pending;
    if (!pending) {
      try { appendCanonicalAuditRow_(auditEntry); }
      catch (auditErr) { PropertiesService.getScriptProperties().setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1'); }
    }
    return { ok: true, status: pending ? 'recovery_pending' : 'completed', recoveryPending: pending, revision: nextRevision, version: nextRevision, changes: changes, workspace: filterWorkspaceForActor_(state.workspace, actor) };
  } finally { lock.releaseLock(); }
}

function authorizedExportsFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('EE_AUTHORIZED_EXPORTS_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (existingErr) {} }
  var folder = DriveApp.getFolderById(props.getProperty('EE_FOLDER_ID')).createFolder('Authorized exports');
  setPrivate_(folder); props.setProperty('EE_AUTHORIZED_EXPORTS_FOLDER_ID', folder.getId()); return folder;
}

function csvCell_(value) { var text = String(value == null ? '' : value); return '"' + text.replace(/"/g, '""') + '"'; }
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

function reviewPortalDistrictExport(request) {
  var actor = requireAdmin_(); request = requireObject_(request || {}, 'request');
  var scope = oneOf_(request.scope, ['status_csv','educator_record','repository_backup'], 'export scope');
  var purpose = safeString_(request.purpose, 240, '', true), teacherId = scope === 'educator_record' ? safeId_(request.teacherId, true) : '';
  var state = readWorkspaceState_(); if (teacherId && !findById_(state.workspace.teachers || [], teacherId)) throw eeError_('not_found', 'Educator record not found.');
  var token = newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({ actorEmail: actor.email, operation: 'export', revision: state.revision, scope: scope, purpose: purpose, teacherId: teacherId }), EE_ADMIN_REVIEW_SECONDS);
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), scope: scope, purpose: purpose, teacherId: teacherId, educatorName: teacherId ? findById_(state.workspace.teachers || [], teacherId).name : '', recordCounts: annualRolloverCounts_(state.workspace).records, activeEducators: (state.workspace.teachers || []).filter(function (teacher) { return teacher.active !== false; }).length, destination: 'Private Authorized exports folder in the deployment owner\'s Drive' } };
}

function performPortalDistrictExport(request) {
  var actor = requireAdmin_(); request = requireObject_(request || {}, 'request');
  if (request.acknowledgePolicy !== true) throw eeError_('acknowledgment_required', 'Confirm district export policy, purpose, destination, retention, and legal-hold handling.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var token = safeId_(request.reviewToken || '', false), cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'export') throw eeError_('review_required', 'The export review expired or was already used. Review it again.');
    var state = readWorkspaceState_();
    if (Number(review.revision) !== Number(state.revision)) { cache.remove(key); throw eeError_('review_stale', 'The workspace changed after review. Reload and review the export again.'); }
    cache.remove(key);
    var content, extension, mime;
    if (review.scope === 'status_csv') { content = statusExportCsv_(state.workspace); extension = '.csv'; mime = 'text/csv'; }
    else {
      var payload = review.scope === 'educator_record' ? educatorRecordExport_(state.workspace, review.teacherId) : state.workspace;
      var envelope = { kind: 'alloflow-educator-evaluation-authorized-export', version: 1, scope: review.scope, purpose: review.purpose, exportedAt: nowIso_(), exportedBy: actor.email, sourceRevision: state.revision, payloadHash: hashText_(JSON.stringify(payload)), payload: payload };
      content = JSON.stringify(envelope); extension = '.json'; mime = MimeType.PLAIN_TEXT;
    }
    var file = authorizedExportsFolder_().createFile('educator-evaluation-' + review.scope.replace(/_/g,'-') + '-' + nowIso_().slice(0,10) + '-' + newId_('export').slice(-8) + extension, content, mime);
    setPrivate_(file);
    var reread = file.getBlob().getDataAsString('UTF-8'); if (hashText_(reread) !== hashText_(content)) throw eeError_('export_verification_failed', 'The private export could not be verified.');
    appendAuditRow_({ teacherId: review.teacherId, event: 'DISTRICT_EXPORT_CREATED', summary: 'Reviewed private district export created; purpose recorded in export metadata', entityType: 'district_export', entityId: file.getId(), version: 1 }, actor);
    return { ok: true, status: 'completed', export: { id: file.getId(), url: annualArchiveUrl_(file), scope: review.scope, createdAt: nowIso_(), private: true, sha256: hashText_(content) } };
  } finally { lock.releaseLock(); }
}

function verifiedAnnualArchive_(file) {
  var raw = file.getBlob().getDataAsString('UTF-8'), envelope;
  try { envelope = JSON.parse(raw); } catch (parseErr) { envelope = null; }
  var verified = !!envelope && envelope.kind === 'alloflow-educator-evaluation-annual-archive' && envelope.workspaceHash === hashText_(JSON.stringify(envelope.workspace));
  return { verified: verified, envelope: verified ? envelope : null, sha256: hashText_(raw) };
}

function annualArchiveFileById_(archiveId) {
  archiveId = safeId_(archiveId, true);
  var folderId = PropertiesService.getScriptProperties().getProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID');
  if (!folderId) throw eeError_('not_found', 'The selected annual archive is unavailable.');
  var files = DriveApp.getFolderById(folderId).getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (file.getId() === archiveId) return file;
  }
  throw eeError_('not_found', 'The selected file is not in this repository\'s Annual archives folder.');
}

function getPortalAnnualArchives() {
  requireAdmin_(); var props = PropertiesService.getScriptProperties(), id = props.getProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID'); if (!id) return { ok: true, archives: [] };
  var folder; try { folder = DriveApp.getFolderById(id); } catch (folderErr) { throw eeError_('not_found', 'The Annual archives folder is unavailable.'); }
  var files = folder.getFiles(), archives = [], limit = 100;
  while (files.hasNext() && archives.length < limit) {
    var file = files.next(), check = verifiedAnnualArchive_(file), envelope = check.envelope;
    archives.push({ id: file.getId(), name: typeof file.getName === 'function' ? file.getName() : 'Annual archive', url: annualArchiveUrl_(file), verified: check.verified, sha256: check.sha256, fromAcademicYear: envelope ? envelope.fromAcademicYear : '', plannedNextAcademicYear: envelope ? envelope.plannedNextAcademicYear : '', sourceRevision: envelope ? envelope.sourceRevision : null, archivedAt: envelope ? envelope.archivedAt : '', counts: envelope ? envelope.counts : null });
  }
  archives.sort(function (a,b) { return String(b.archivedAt).localeCompare(String(a.archivedAt)); });
  return { ok: true, archives: archives };
}

function restoreRehearsalsFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('EE_RESTORE_REHEARSALS_FOLDER_ID'); if (id) { try { return DriveApp.getFolderById(id); } catch (existingErr) {} }
  var folder = DriveApp.getFolderById(props.getProperty('EE_FOLDER_ID')).createFolder('Restore rehearsals'); setPrivate_(folder); props.setProperty('EE_RESTORE_REHEARSALS_FOLDER_ID', folder.getId()); return folder;
}

function reviewPortalArchiveRestoreRehearsal(request) {
  var actor = requireAdmin_(); request = requireObject_(request || {}, 'request'); var archiveId = safeId_(request.archiveId, true), file = annualArchiveFileById_(archiveId), check = verifiedAnnualArchive_(file);
  if (!check.verified) throw eeError_('archive_verification_failed', 'The selected archive failed verification and cannot be rehearsed.');
  var state = readWorkspaceState_(), archivedCounts = annualRolloverCounts_(check.envelope.workspace), currentCounts = annualRolloverCounts_(state.workspace), token = newId_('admin-review');
  CacheService.getScriptCache().put(adminReviewCacheKey_(token), JSON.stringify({ actorEmail: actor.email, operation: 'restore_rehearsal', revision: state.revision, archiveId: archiveId, archiveHash: check.sha256 }), EE_ADMIN_REVIEW_SECONDS);
  return { ok: true, review: { token: token, expiresAt: new Date(Date.now() + EE_ADMIN_REVIEW_SECONDS * 1000).toISOString(), archiveId: archiveId, fromAcademicYear: check.envelope.fromAcademicYear, archivedRevision: check.envelope.sourceRevision, activeAcademicYear: state.workspace.config.academicYear, activeRevision: state.revision, archivedCounts: archivedCounts, currentCounts: currentCounts, liveWorkspaceWillChange: false } };
}

function performPortalArchiveRestoreRehearsal(request) {
  var actor = requireAdmin_(); request = requireObject_(request || {}, 'request'); if (request.acknowledgeNoLiveRestore !== true) throw eeError_('acknowledgment_required', 'Confirm this creates a private restore candidate and does not overwrite the live workspace.');
  var lock = LockService.getScriptLock(); if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  try {
    var token = safeId_(request.reviewToken || '', false), cache = CacheService.getScriptCache(), key = adminReviewCacheKey_(token), raw = token ? cache.get(key) : '', review;
    try { review = raw ? JSON.parse(raw) : null; } catch (parseErr) { review = null; }
    if (!review || review.actorEmail !== actor.email || review.operation !== 'restore_rehearsal') throw eeError_('review_required', 'The restore rehearsal review expired or was already used. Review it again.');
    var state = readWorkspaceState_(); if (Number(review.revision) !== Number(state.revision)) { cache.remove(key); throw eeError_('review_stale', 'The live workspace changed after review. Reload and review the rehearsal again.'); }
    var archiveFile = annualArchiveFileById_(review.archiveId), check = verifiedAnnualArchive_(archiveFile); if (!check.verified || check.sha256 !== review.archiveHash) { cache.remove(key); throw eeError_('review_stale', 'The archive changed after review or failed verification.'); }
    cache.remove(key);
    var candidate = { kind: 'alloflow-educator-evaluation-restore-rehearsal', version: 1, createdAt: nowIso_(), createdBy: actor.email, sourceArchiveId: review.archiveId, sourceArchiveHash: review.archiveHash, liveRevisionAtReview: state.revision, liveWorkspaceChanged: false, candidateWorkspace: check.envelope.workspace };
    var content = JSON.stringify(candidate), file = restoreRehearsalsFolder_().createFile('restore-rehearsal-' + check.envelope.fromAcademicYear + '-' + nowIso_().slice(0,10) + '.json', content, MimeType.PLAIN_TEXT); setPrivate_(file);
    if (hashText_(file.getBlob().getDataAsString('UTF-8')) !== hashText_(content)) throw eeError_('archive_verification_failed', 'The restore rehearsal candidate could not be verified.');
    appendAuditRow_({ teacherId: '', event: 'RESTORE_REHEARSAL_CREATED', summary: 'Verified private restore rehearsal created without changing the live workspace', entityType: 'restore_rehearsal', entityId: file.getId(), version: 1 }, actor);
    return { ok: true, status: 'completed', liveWorkspaceChanged: false, candidate: { id: file.getId(), url: annualArchiveUrl_(file), sha256: hashText_(content) } };
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

function annualArchivesFolder_() {
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID');
  if (existingId) {
    try { return DriveApp.getFolderById(existingId); } catch (existingErr) {}
  }
  var parent = DriveApp.getFolderById(props.getProperty('EE_FOLDER_ID'));
  var folder = parent.createFolder('Annual archives');
  setPrivate_(folder);
  props.setProperty('EE_ANNUAL_ARCHIVES_FOLDER_ID', folder.getId());
  return folder;
}

function annualArchiveUrl_(file) {
  if (file && typeof file.getUrl === 'function') return safeString_(file.getUrl(), 1000, '');
  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
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
  var file = annualArchivesFolder_().createFile(name, content, MimeType.PLAIN_TEXT);
  setPrivate_(file);
  var stored = file.getBlob().getDataAsString('UTF-8');
  var verified;
  try { verified = JSON.parse(stored); } catch (parseErr) { verified = null; }
  if (!verified || verified.kind !== envelope.kind || verified.sourceRevision !== state.revision || verified.workspaceHash !== hashText_(JSON.stringify(verified.workspace)) || hashText_(stored) !== hashText_(content)) {
    throw eeError_('archive_verification_failed', 'The private annual archive could not be verified. The active year was not changed.');
  }
  return { id: file.getId(), url: annualArchiveUrl_(file), name: name, hash: hashText_(content), archivedAt: envelope.archivedAt };
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
  request = requireObject_(request || {}, 'request');
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED')) throw eeError_('rollover_recovery_required', 'A prior annual rollover needs an administrator recovery recheck before another review.');
  var toYear = normalizeAcademicYear_(request.nextAcademicYear);
  var state = readWorkspaceState_();
  var fromYear = safeString_(state.workspace.config && state.workspace.config.academicYear, 20, '').replace(/[\u2013\u2014]/g, '-');
  if (fromYear === toYear) throw eeError_('bad_request', 'The next academic year must differ from the active year.');
  var fromMatch = fromYear.match(/^(\d{4})-(\d{2})$/);
  var toMatch = toYear.match(/^(\d{4})-(\d{2})$/);
  if (fromMatch && toMatch && Number(toMatch[1]) !== Number(fromMatch[1]) + 1) throw eeError_('bad_request', 'Annual rollover must advance exactly one academic year.');
  var counts = annualRolloverCounts_(state.workspace);
  var token = newId_('rollover-review');
  CacheService.getScriptCache().put(annualRolloverReviewCacheKey_(token), JSON.stringify({
    actorEmail: actor.email,
    revision: state.revision,
    fromYear: fromYear,
    toYear: toYear,
    countsHash: hashText_(JSON.stringify(counts)),
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
      rosterRetained: true,
      cycleSnapshotsRetained: true,
      releasedDocumentsDeleted: false,
    },
  };
}

function requireAnnualRolloverReview_(request, actor, state) {
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
  if (!review || review.actorEmail !== actor.email || Number(review.revision) !== Number(state.revision) || review.fromYear !== currentYear || review.countsHash !== hashText_(JSON.stringify(counts))) {
    cache.remove(key);
    throw eeError_('review_stale', 'The active workspace changed after review. Reload and review the annual rollover again.');
  }
  cache.remove(key);
  review.counts = counts;
  return review;
}

function recordAnnualRolloverRecovery_(payload) {
  PropertiesService.getScriptProperties().setProperty('EE_ROLLOVER_RECOVERY_REQUIRED', JSON.stringify(payload));
}

function annualRolloverCommitted_(state, recovery) {
  if (!state || !recovery || state.workspace.config.academicYear !== recovery.toYear) return false;
  return (state.workspace.audit || []).some(function (entry) { return entry.event === 'ANNUAL_ROLLOVER' && entry.entityId === recovery.archiveId; });
}

function performPortalAnnualRollover(request) {
  var actor = requireAdmin_();
  request = requireObject_(request || {}, 'request');
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED')) throw eeError_('rollover_recovery_required', 'A prior annual rollover needs an administrator recovery recheck before another attempt.');
  if (request.acknowledgeArchive !== true) throw eeError_('acknowledgment_required', 'Confirm district archive, retention, legal-hold, and ownership responsibility.');
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw eeError_('busy', 'Repository is busy.');
  var archive = null;
  var recovery = null;
  try {
    var state = readWorkspaceState_();
    var review = requireAnnualRolloverReview_(request, actor, state);
    if (review.counts.openCycles > 0 && request.acknowledgeOpenCycles !== true) throw eeError_('acknowledgment_required', 'Confirm that open cycles will be archived and will not carry into the new active year.');
    archive = buildAnnualArchive_(state, actor, review.fromYear, review.toYear, review.counts);
    recovery = {
      at: nowIso_(),
      stage: 'archive_verified',
      archiveId: archive.id,
      archiveUrl: archive.url,
      fromYear: review.fromYear,
      toYear: review.toYear,
      sourceRevision: state.revision,
      actorEmail: actor.email,
    };
    recordAnnualRolloverRecovery_(recovery);
    var nextWorkspace = workspaceForAnnualRollover_(state.workspace, review.toYear);
    var auditEntry = appendWorkspaceAudit_(nextWorkspace, {
      event: 'ANNUAL_ROLLOVER',
      summary: 'Verified private annual archive created; active evaluation cycles reset for ' + review.toYear,
      entityType: 'annual_archive',
      entityId: archive.id,
      version: 1,
    }, actor);
    recovery.stage = 'workspace_commit';
    recordAnnualRolloverRecovery_(recovery);
    var commit = writeWorkspaceState_(nextWorkspace, state.revision + 1, actor.email);
    var recoveryPending = !!commit.pending;
    if (recoveryPending) {
      try { recoveryPending = !annualRolloverCommitted_(readWorkspaceState_(), recovery); }
      catch (confirmErr) { recoveryPending = true; }
    }
    if (recoveryPending) {
      return { ok: true, status: 'recovery_pending', recoveryPending: true, archive: archive, fromAcademicYear: review.fromYear, toAcademicYear: review.toYear, counts: review.counts };
    }
    var auditPending = false;
    try { appendCanonicalAuditRow_(auditEntry); }
    catch (auditErr) { props.setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1'); auditPending = true; }
    try { setConfigValue_('academicYear', review.toYear); }
    catch (configErr) { props.setProperty('EE_SECONDARY_RECONCILE_REQUIRED', '1'); }
    props.setProperty('EE_LAST_ROLLOVER', JSON.stringify({ archiveId: archive.id, archiveUrl: archive.url, fromYear: review.fromYear, toYear: review.toYear, at: archive.archivedAt, actorEmail: actor.email, revision: state.revision + 1 }));
    props.deleteProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
    return { ok: true, status: 'completed', recoveryPending: false, auditPending: auditPending, archive: archive, fromAcademicYear: review.fromYear, toAcademicYear: review.toYear, counts: review.counts };
  } catch (err) {
    if (archive && recovery) {
      recovery.stage = recovery.stage || 'archive_verified';
      recovery.errorCode = String(err && err.code || 'server_error');
      recordAnnualRolloverRecovery_(recovery);
      throw eeError_('rollover_recovery_required', 'A verified private archive exists, but rollover completion was not confirmed. Do not retry; run the recovery recheck.');
    }
    throw err;
  } finally { lock.releaseLock(); }
}

function reconcilePortalAnnualRollover() {
  requireAdmin_();
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
  if (!raw) return { ok: true, status: 'none', recoveryPending: false };
  var recovery;
  try { recovery = JSON.parse(raw); } catch (parseErr) { throw eeError_('manual_recovery_required', 'Rollover recovery metadata is invalid. District IT must inspect the repository before any retry.'); }
  var archiveFile;
  try { archiveFile = DriveApp.getFileById(safeId_(recovery.archiveId, true)); } catch (archiveErr) { throw eeError_('manual_recovery_required', 'The recorded annual archive cannot be opened. District IT must inspect the repository before any retry.'); }
  var archiveRaw = archiveFile.getBlob().getDataAsString('UTF-8');
  var envelope;
  try { envelope = JSON.parse(archiveRaw); } catch (archiveParseErr) { envelope = null; }
  if (!envelope || envelope.kind !== 'alloflow-educator-evaluation-annual-archive' || envelope.workspaceHash !== hashText_(JSON.stringify(envelope.workspace)) || Number(envelope.sourceRevision) !== Number(recovery.sourceRevision)) throw eeError_('manual_recovery_required', 'The recorded annual archive failed verification. District IT must inspect the repository before any retry.');
  var state = readWorkspaceState_();
  if (annualRolloverCommitted_(state, recovery)) {
    props.setProperty('EE_LAST_ROLLOVER', JSON.stringify({ archiveId: recovery.archiveId, archiveUrl: recovery.archiveUrl, fromYear: recovery.fromYear, toYear: recovery.toYear, at: recovery.at, actorEmail: recovery.actorEmail, revision: state.revision }));
    props.deleteProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
    return { ok: true, status: 'completed', recoveryPending: false, archive: { id: recovery.archiveId, url: recovery.archiveUrl }, activeAcademicYear: state.workspace.config.academicYear };
  }
  if (Number(state.revision) === Number(recovery.sourceRevision) && safeString_(state.workspace.config.academicYear, 20, '').replace(/[\u2013\u2014]/g, '-') === recovery.fromYear) {
    props.deleteProperty('EE_ROLLOVER_RECOVERY_REQUIRED');
    return { ok: true, status: 'archive_only', recoveryPending: false, archive: { id: recovery.archiveId, url: recovery.archiveUrl }, activeAcademicYear: state.workspace.config.academicYear };
  }
  throw eeError_('manual_recovery_required', 'The workspace is neither the reviewed old year nor the confirmed new year. District IT must inspect both the active workspace and archive before any retry.');
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
  if (actor.role === 'teacher') {
    copy.walkthroughs = copy.walkthroughs.filter(function(item) { return !!item.publishedAt; });
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
    copy.audit = copy.audit.filter(function(item) { return item.teacherId === actor.teacherId; });
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
  return merged;
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
    cycleSnapshots: mapLimited_(raw.cycleSnapshots, 5000, sanitizeSnapshot_)
  };
  assertUniqueIds_(result.teachers, 'educator');
  assertUniqueIds_(result.walkthroughs, 'walkthrough');
  assertUniqueIds_(result.observations, 'formal observation');
  assertUniqueIds_(result.spms, 'SPM');
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
function sanitizeReleasedDocHistory_(items){if(!Array.isArray(items))return[];var out=[];for(var i=Math.max(0,items.length-25);i<items.length;i++){var v=items[i];if(!isPlainObject_(v))continue;var url=safeString_(v.url,400,''),id=safeId_(v.id||'',false);if(!id&&url.indexOf('https://docs.google.com/')!==0)continue;out.push({id:id,url:url,at:optionalTimestamp_(v.at),by:safeString_(v.by,160,''),openedAt:optionalTimestamp_(v.openedAt),status:v.status==='superseded_unavailable'?'superseded_unavailable':'superseded',supersededAt:optionalTimestamp_(v.supersededAt)});}return out;}
function sanitizeReleasedDoc_(v){ if(!isPlainObject_(v))return null; var url=safeString_(v.url,400,''); if(url.indexOf('https://docs.google.com/')!==0)return null; return { id:safeId_(v.id||'',false), url:url, at:optionalTimestamp_(v.at), by:safeString_(v.by,160,''), sharedWith:normalizeEmail_(v.sharedWith), openedAt:optionalTimestamp_(v.openedAt), accessReviewedAt:optionalTimestamp_(v.accessReviewedAt), history:sanitizeReleasedDocHistory_(v.history) }; }
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
function readWorkspaceState_() { reconcilePendingCommit_(); var p=PropertiesService.getScriptProperties(); var id=p.getProperty('EE_WORKSPACE_FILE_ID'); if(!id)throw eeError_('not_configured','Workspace file is not configured.'); var raw=DriveApp.getFileById(id).getBlob().getDataAsString('UTF-8'); if(raw.length>EE_MAX_WORKSPACE_BYTES)throw eeError_('corrupt','Stored workspace exceeds its limit.'); var workspace; try{workspace=sanitizeStoredWorkspace_(JSON.parse(raw));}catch(err){throw eeError_('corrupt','Stored workspace failed validation.');} var sheet=repositorySpreadsheet_().getSheetByName('Workspace'); var revision=0,exists=false; if(sheet&&sheet.getLastRow()>=2){var row=sheet.getRange(2,1,1,6).getValues()[0],parsedRevision=Number(row[1]);if(String(row[0])!=='workspace'||String(row[2])!==id||Math.floor(parsedRevision)!==parsedRevision||parsedRevision<0||sheetLogicalCell_(row[3])!==hashText_(raw))throw eeError_('corrupt','Workspace metadata integrity check failed; an administrator must restore a matching reviewed backup.');revision=parsedRevision;exists=true;} return {workspace:workspace,revision:revision,metadataExists:exists}; }
function sanitizeStoredWorkspace_(raw) { var copy=clone_(raw); var audit=Array.isArray(copy.audit)?copy.audit.slice(-EE_MAX_AUDIT):[]; copy.audit=[]; var clean=sanitizeWorkspace_(copy); clean.audit=audit.map(sanitizeAuditObject_); return clean; }
function sheetSafeCell_(value){if(typeof value!=='string')return value;return /^(?:[\t\r]|[ \t\r\n]*[=+\-@])/.test(value)?"'"+value:value;}
function sheetSafeRow_(row){if(!Array.isArray(row))throw eeError_('bad_request','Spreadsheet row must be an array.');return row.map(sheetSafeCell_);}
function sheetSafeValues_(values){if(!Array.isArray(values))throw eeError_('bad_request','Spreadsheet values must be an array.');return values.map(sheetSafeRow_);}
function safeSheetAppendRow_(sheet,row){sheet.appendRow(sheetSafeRow_(row));}
function safeSheetSetValues_(range,values){range.setValues(sheetSafeValues_(values));}
function writeWorkspaceState_(workspace,revision,actorEmail){var json=JSON.stringify(workspace);if(json.length>EE_MAX_WORKSPACE_BYTES)throw eeError_('too_large','Workspace exceeds the server size limit.');var props=PropertiesService.getScriptProperties(),pending=DriveApp.getFileById(props.getProperty('EE_PENDING_COMMIT_FILE_ID'));var envelope=JSON.stringify({revision:revision,actorEmail:actorEmail,workspace:workspace});pending.setContent(envelope);try{completePendingCommit_();return{pending:false};}catch(commitErr){props.setProperty('EE_COMMIT_RECOVERY_REQUIRED','1');return{pending:true};}}
function reconcilePendingCommit_(){var props=PropertiesService.getScriptProperties(),pendingId=props.getProperty('EE_PENDING_COMMIT_FILE_ID');if(!pendingId)return;var pending=DriveApp.getFileById(pendingId),raw=pending.getBlob().getDataAsString('UTF-8');if(!raw)return;completePendingCommit_();}
function completePendingCommit_(){var props=PropertiesService.getScriptProperties(),pending=DriveApp.getFileById(props.getProperty('EE_PENDING_COMMIT_FILE_ID')),raw=pending.getBlob().getDataAsString('UTF-8');if(!raw)return;var envelope;try{envelope=JSON.parse(raw);}catch(err){throw eeError_('corrupt','Pending workspace journal is invalid.');}var revision=Number(envelope.revision);if(Math.floor(revision)!==revision||revision<0)throw eeError_('corrupt','Pending workspace revision is invalid.');var workspace=sanitizeStoredWorkspace_(envelope.workspace),json=JSON.stringify(workspace);if(json.length>EE_MAX_WORKSPACE_BYTES)throw eeError_('corrupt','Pending workspace exceeds its limit.');var file=DriveApp.getFileById(props.getProperty('EE_WORKSPACE_FILE_ID'));file.setContent(json);writeWorkspaceMetadata_(file.getId(),json,revision,normalizeEmail_(envelope.actorEmail));pending.setContent('');props.deleteProperty('EE_COMMIT_RECOVERY_REQUIRED');}
function writeWorkspaceMetadata_(fileId,json,revision,actorEmail){var sheet=repositorySpreadsheet_().getSheetByName('Workspace');var row=['workspace',revision,fileId,hashText_(json),nowIso_(),actorEmail];if(sheet.getLastRow()<2)safeSheetAppendRow_(sheet,row);else safeSheetSetValues_(sheet.getRange(2,1,1,row.length),[row]);}
function initializeSheets_(ss){var names=Object.keys(EE_SHEETS);var first=ss.getSheets()[0];for(var i=0;i<names.length;i++){var name=names[i];var sheet=ss.getSheetByName(name);if(!sheet){if(i===0&&first&&first.getLastRow()===0){sheet=first;sheet.setName(name);}else sheet=ss.insertSheet(name);}var headers=EE_SHEETS[name];safeSheetSetValues_(sheet.getRange(1,1,1,headers.length),[headers]);sheet.setFrozenRows(1);protectSheet_(sheet);try{sheet.hideSheet();}catch(err){}}}
function protectSheet_(sheet){var ps=sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);for(var i=0;i<ps.length;i++)ps[i].remove();var p=sheet.protect().setDescription('AlloFlow evaluation repository - service access only');p.setWarningOnly(false);var owner=Session.getEffectiveUser(),ownerEmail=normalizeEmail_(owner.getEmail());p.addEditor(owner);var editors=p.getEditors();if(editors&&editors.length)p.removeEditors(editors);if(p.canDomainEdit())p.setDomainEdit(false);var remaining=p.getEditors()||[];for(var j=0;j<remaining.length;j++){var email=normalizeEmail_(remaining[j].getEmail());if(!email||email!==ownerEmail)throw eeError_('protection_failed','Repository sheet has an unintended editor.');}if(p.canDomainEdit()||(typeof p.isWarningOnly==='function'&&p.isWarningOnly()))throw eeError_('protection_failed','Repository sheet protection could not be verified.');}
function setPrivate_(item){var ownerEmail='';try{ownerEmail=normalizeEmail_(Session.getEffectiveUser().getEmail());}catch(ownerErr){}if(typeof item.setShareableByEditors==='function')item.setShareableByEditors(false);var editors=typeof item.getEditors==='function'?item.getEditors():[];var viewers=typeof item.getViewers==='function'?item.getViewers():[];removeNonOwnerAccess_(item,editors,ownerEmail,'removeEditor');removeNonOwnerAccess_(item,viewers,ownerEmail,'removeViewer');item.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.VIEW);if(typeof item.getSharingAccess!=='function'||item.getSharingAccess()!==DriveApp.Access.PRIVATE)throw eeError_('protection_failed','Repository Drive privacy could not be verified.');}
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

function appendWorkspaceAudit_(workspace,mutation,actor){workspace.audit=workspace.audit||[];var entry={id:newId_('audit'),event:mutation.event,summary:mutation.summary,actor:actor.displayName,actorEmail:actor.email,actorRole:actor.role,role:actor.role==='teacher'?'Teacher':'Evaluator',at:nowIso_(),entityType:mutation.entityType,entityId:mutation.entityId,teacherId:mutation.teacherId||'',version:mutation.version||1};workspace.audit.unshift(entry);workspace.audit=workspace.audit.slice(0,EE_MAX_AUDIT);return entry;}
function appendAuditRowLocked_(mutation,actor){var lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw eeError_('busy','Repository audit is busy.');try{appendAuditRow_(mutation,actor);}finally{lock.releaseLock();}}
function appendAuditRow_(mutation,actor){var sheet=repositorySpreadsheet_().getSheetByName('Audit');var previous='GENESIS';if(sheet.getLastRow()>=2)previous=String(sheetLogicalCell_(sheet.getRange(sheet.getLastRow(),12).getValue())||'GENESIS');var at=nowIso_();var base=[newId_('audit'),mutation.teacherId||'',mutation.event,mutation.summary,mutation.entityType,mutation.entityId||'',mutation.version||1,actor.email,actor.role,at,previous];var hash=hashText_(base.join('|'));base.push(hash);safeSheetAppendRow_(sheet,base);}
function sanitizeAuditObject_(v){v=requireObject_(v,'audit');return{id:safeId_(v.id,true),event:safeToken_(v.event||'UPDATED',60),summary:safeString_(v.summary,500,'Record updated'),actor:safeString_(v.actor,160,'Unknown'),actorEmail:normalizeEmail_(v.actorEmail),actorRole:['admin','evaluator','teacher'].indexOf(String(v.actorRole||''))===-1?'':String(v.actorRole),role:v.role==='Teacher'?'Teacher':'Evaluator',at:optionalTimestamp_(v.at)||nowIso_(),entityType:safeToken_(v.entityType||'workspace',80),entityId:safeId_(v.entityId||'',false),teacherId:safeId_(v.teacherId||'',false),version:clampInt_(v.version,1,1000,1)};}
function findReceipt_(teacherId,type,recordId,receiptType,email){var rows=dataRows_(repositorySpreadsheet_().getSheetByName('Receipts'),8);for(var i=rows.length-1;i>=0;i--)if(String(rows[i][1])===teacherId&&String(rows[i][2])===type&&String(rows[i][3])===recordId&&String(rows[i][4])===receiptType&&normalizeEmail_(rows[i][5])===email)return{id:String(rows[i][0]),teacherId:teacherId,recordType:type,recordId:recordId,receiptType:receiptType,actorEmail:email,actorRole:String(rows[i][6]),at:toIso_(rows[i][7])};return null;}
function receiptSummary_(type){return{opened:'Submitted SPM receipt recorded',acknowledged:'Completed acknowledgment receipt recorded'}[type];}
function reconcileSecondaryIndexesIfNeeded_(workspace){var props=PropertiesService.getScriptProperties();if(!props.getProperty('EE_SECONDARY_RECONCILE_REQUIRED'))return;try{syncSecondaryIndexes_(workspace);props.deleteProperty('EE_SECONDARY_RECONCILE_REQUIRED');}catch(err){}}
function syncSecondaryIndexes_(workspace){syncMessages_(workspace);syncWorkspaceAudit_(workspace);syncSnapshots_(workspace);}
function syncWorkspaceAudit_(workspace){var sheet=repositorySpreadsheet_().getSheetByName('Audit'),rows=dataRows_(sheet,12),existing={};for(var i=0;i<rows.length;i++)existing[String(rows[i][0])]=true;var audit=(workspace.audit||[]).slice().reverse();for(var j=0;j<audit.length;j++){var entry=audit[j];if(existing[entry.id])continue;appendCanonicalAuditRow_(entry);existing[entry.id]=true;}}
function appendCanonicalAuditRow_(entry){var sheet=repositorySpreadsheet_().getSheetByName('Audit'),previous='GENESIS';if(sheet.getLastRow()>=2)previous=String(sheetLogicalCell_(sheet.getRange(sheet.getLastRow(),12).getValue())||'GENESIS');var base=[entry.id,entry.teacherId||'',entry.event,entry.summary,entry.entityType,entry.entityId||'',entry.version||1,entry.actorEmail||'',entry.actorRole||'',entry.at,previous];base.push(hashText_(base.join('|')));safeSheetAppendRow_(sheet,base);}
function syncSnapshots_(workspace){var sheet=repositorySpreadsheet_().getSheetByName('Snapshots');var existing={};var rows=dataRows_(sheet,13);for(var i=0;i<rows.length;i++)existing[String(rows[i][0])]=true;var snapshots=workspace.cycleSnapshots||[];for(var j=0;j<snapshots.length;j++){var s=snapshots[j];if(!s.finalizedAt||existing[s.id])continue;appendRow_('Snapshots',[s.id,s.teacherId,s.staffCodeSnapshot,s.academicYear,s.buildingSnapshot,s.employeeTypeSnapshot,s.finalizedAt,s.finalScore,s.domainRatings.d1,s.domainRatings.d2,s.domainRatings.d3,s.domainRatings.d4,s.frameworkVersion]);existing[s.id]=true;}}
function snapshotObjects_(){var rows=dataRows_(repositorySpreadsheet_().getSheetByName('Snapshots'),13),out=[];for(var i=0;i<rows.length;i++)out.push({id:String(rows[i][0]),teacherId:String(rows[i][1]),staffCode:String(rows[i][2]),academicYear:String(rows[i][3]),building:String(rows[i][4]),employeeType:String(rows[i][5]),finalizedAt:toIso_(rows[i][6]),finalScore:numberOrNull_(rows[i][7]),d1:numberOrNull_(rows[i][8]),d2:numberOrNull_(rows[i][9]),d3:numberOrNull_(rows[i][10]),d4:numberOrNull_(rows[i][11]),frameworkVersion:String(rows[i][12])});return out;}

/* ------------------------------- helpers ------------------------------- */

function blankWorkspace_(config){config=isPlainObject_(config)?config:{};var baseBuilding=safeString_(config.building,160,'');var evaluator=safeString_(config.adminDisplayName,160,'Principal');var rawTeachers=config.teachers===undefined?[]:config.teachers;if(!Array.isArray(rawTeachers)||rawTeachers.length>1000)throw eeError_('bad_config','Invalid setup teachers list.');var teachers=[];for(var i=0;i<rawTeachers.length;i++){var raw=requireObject_(rawTeachers[i],'setup teacher');teachers.push(sanitizeTeacher_({id:raw.id,code:raw.code,name:raw.name,building:raw.building||baseBuilding,assignment:raw.assignment||'',employeeType:raw.employeeType||'professional',buildingData:raw.buildingData!==false,teacherSpecificData:raw.teacherSpecificData!==false,active:raw.active!==false,evaluator:raw.evaluator||evaluator,dueDate:raw.dueDate||'',cycleStatus:'not_started',frameworkVersion:'PA Act 13 / Danielson 2021',ratings:{domains:{d1:null,d2:null,d3:null,d4:null},building:null,teacher:null,lea:null}}));}assertUniqueIds_(teachers,'educator');return{kind:'alloflow-educator-evaluation-workspace',version:1,config:{organization:safeString_(config.organization,160,'District'),building:baseBuilding,academicYear:safeString_(config.academicYear,20,''),evaluatorName:evaluator,evaluatorInitials:'',frameworkVersion:'PA Act 13 / Danielson 2021',sampleMode:false},teachers:teachers,walkthroughs:[],observations:[],spms:[],comments:[],audit:[],cycleSnapshots:[]};}
function jsonOutput_(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
function publicError_(err){var code=String(err&&err.code||'server_error');var safe={identity_unavailable:1,wrong_domain:1,not_member:1,not_configured:1,denied:1,bad_json:1,bad_request:1,bad_workspace:1,conflict:1,busy:1,not_found:1,immutable:1,invalid_transition:1,too_large:1,review_required:1,review_stale:1,acknowledgment_required:1,manual_recovery_required:1,commit_recovery_required:1,release_recovery_required:1};return{ok:false,code:safe[code]?code:'server_error',error:safe[code]?String(err.message).slice(0,240):'The district evaluation service could not complete the request.'};}
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
function requireRecord_(workspace,teacherId,type,id,actor){var collection=type==='walkthrough'?workspace.walkthroughs:(type==='formal_observation'?workspace.observations:workspace.spms);var found=findById_(collection||[],id);if(!found||found.teacherId!==teacherId)throw eeError_('not_found','Evaluation record not found.');if(actor.role==='teacher'&&type==='walkthrough'&&!found.publishedAt)throw eeError_('denied','Private evaluator draft is unavailable.');return found;}
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
