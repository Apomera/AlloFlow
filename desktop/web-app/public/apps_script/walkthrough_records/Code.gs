/**
 * AlloFlow Walkthrough Records - principal-owned delivery script.
 *
 * WHAT THIS IS. A small Apps Script that a principal deploys in their OWN
 * Google account. AlloFlow sends it walkthrough feedback the principal has
 * already written and approved. The script writes that feedback to a folder in
 * the principal's own Drive and shares each file with exactly one named teacher
 * account, then sends that teacher a notification containing no feedback text.
 *
 * WHY IT IS SHAPED THIS WAY. The Class Mailbox proves the deployment pattern,
 * but its security model does not transfer: there, possession of a link stands
 * in for a student's identity, which is acceptable for anonymous class traffic
 * and unacceptable for anything about a named staff member. Here the token only
 * authorizes the principal's own tool to write to the principal's own Drive.
 * The TEACHER's identity is enforced by Google at the sharing boundary: the
 * file is Restricted and shared with one address, so opening it requires
 * signing in as that person. A forwarded link grants nothing.
 *
 * WHAT THIS IS NOT. Not an evaluation system of record, not a rating engine,
 * and not a substitute for a district-authorized portal. It stores feedback a
 * human wrote and approved, and it never scores anyone. For a district-run
 * system of record with verified identity, assignments and a tamper-evident
 * audit trail, see apps_script/educator_evaluation/.
 *
 * SCOPES. Drive access is limited to drive.file; email identity verifies owner
 * setup, and send_mail permits the approved teacher notification. Drive consent
 * reads "see, edit, create and
 * delete only the specific Google Drive files you use with this app" rather
 * than granting access to the principal's whole Drive. Everything below is
 * designed to stay inside that scope: the working folder id is remembered in
 * Script Properties rather than found by searching Drive, because searching
 * would require broader access.
 */

var WR_SERVICE = 'alloflow-walkthrough-records';
var WR_VERSION = 2;
var WR_FOLDER_NAME = 'AlloFlow Walkthrough Records';
var WR_PROP_TOKEN = 'wr_admin_token';
var WR_PROP_FOLDER = 'wr_folder_id';
var WR_PROP_DOMAIN = 'wr_allowed_domain';
var WR_MAX_FIELD = 20000;
var WR_MAX_FIELDS = 24;

function wrProps_() {
  return PropertiesService.getScriptProperties();
}

function wrJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function wrError_(code, message) {
  return { ok: false, code: code, error: message };
}

function wrString_(value, max) {
  if (typeof value !== 'string') return '';
  var trimmed = value.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function wrToken_() {
  var bytes = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  return bytes.slice(0, 48);
}

function wrEmailOk_(email) {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(String(email || ''));
}

function wrDomainOf_(email) {
  var at = String(email || '').lastIndexOf('@');
  return at === -1 ? '' : String(email).slice(at + 1).toLowerCase();
}

function wrOwnerEmail_() {
  try { return String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (err) { return ''; }
}

/**
 * The working folder is remembered by id. It is never located by searching
 * Drive, which drive.file would not permit anyway.
 */
function wrFolder_() {
  var props = wrProps_();
  var id = props.getProperty(WR_PROP_FOLDER);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { /* recreate below */ }
  }
  var lock = (typeof LockService !== 'undefined' && LockService && LockService.getScriptLock) ? LockService.getScriptLock() : null;
  var locked = false;
  if (lock) {
    if (!lock.tryLock(10000)) throw new Error('Walkthrough folder setup is busy. Retry shortly.');
    locked = true;
  }
  try {
    var freshId = props.getProperty(WR_PROP_FOLDER);
    if (freshId) {
      try { return DriveApp.getFolderById(freshId); } catch (err2) { /* recreate below */ }
    }
    var folder = DriveApp.createFolder(WR_FOLDER_NAME);
    folder.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    if (typeof folder.setShareableByEditors === 'function') folder.setShareableByEditors(false);
    props.setProperty(WR_PROP_FOLDER, folder.getId());
    return folder;
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (relErr) {} }
  }
}

function wrTimingSafeEq_(a, b) {
  var da = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(a || ''), Utilities.Charset.UTF_8);
  var db = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(b || ''), Utilities.Charset.UTF_8);
  if (da.length !== db.length) return false;
  var diff = 0;
  for (var i = 0; i < da.length; i++) diff |= (da[i] ^ db[i]);
  return diff === 0;
}

function wrRateLimited_() {
  try {
    var cache = CacheService.getScriptCache();
    var count = parseInt(cache.get('wr:auth_fail') || '0', 10) || 0;
    return count >= 20;
  } catch (e) {
    return false;
  }
}

function wrRecordAuthFail_() {
  try {
    var cache = CacheService.getScriptCache();
    var count = (parseInt(cache.get('wr:auth_fail') || '0', 10) || 0) + 1;
    cache.put('wr:auth_fail', String(count), 900);
  } catch (e) {}
}

function wrAuthorize_(request) {
  var stored = wrProps_().getProperty(WR_PROP_TOKEN);
  if (!stored) return wrError_('not_claimed', 'Run setupWalkthroughOwner in the Apps Script editor, then paste the owner token into AlloFlow.');
  if (wrRateLimited_()) return wrError_('rate_limited', 'Too many failed authorization attempts. Try again in 15 minutes.');
  var supplied = wrString_(request && request.token, 128);
  if (!supplied || !wrTimingSafeEq_(supplied, stored)) {
    wrRecordAuthFail_();
    return wrError_('denied', 'This request did not carry the connecting device token.');
  }
  return null;
}

function doGet(e) {
  // Deliberately no HTML UI. This script is a delivery endpoint, not a portal.
  var mode = String((e && e.parameter && e.parameter.api) || '');
  if (mode === 'health') {
    return wrJson_({
      ok: true,
      service: WR_SERVICE,
      version: WR_VERSION,
      claimed: !!wrProps_().getProperty(WR_PROP_TOKEN)
    });
  }
  return wrJson_(wrError_('not_found', 'This endpoint serves the AlloFlow Walkthrough Records API.'));
}

function doPost(e) {
  var request;
  try {
    request = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (parseErr) {
    return wrJson_(wrError_('bad_request', 'The request body was not valid JSON.'));
  }
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    return wrJson_(wrError_('bad_request', 'The request body must be a JSON object.'));
  }
  var action = wrString_(request.action, 40);

  try {
    if (action === 'claim') return wrJson_(wrClaim_());
    if (action === 'selftest') return wrJson_(wrSelfTest_(request));
    if (action === 'deliver') return wrJson_(wrDeliver_(request));
    if (action === 'revoke') return wrJson_(wrRevoke_(request));
    return wrJson_(wrError_('unknown_action', 'Unrecognized action.'));
  } catch (err) {
    return wrJson_(wrError_('failed', 'Walkthrough request failed.'));
  }
}

function wrClaim_() {
  return wrError_('owner_setup_required', 'Run setupWalkthroughOwner in the Apps Script editor as the deploying owner, then paste wr_admin_token from Script properties into AlloFlow.');
}

function wrRequireOwner_() {
  var active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  var effective = wrOwnerEmail_();
  var bound = wrProps_().getProperty('wr_owner_email');
  if (!active || !effective || active !== effective || (bound && bound !== active)) {
    throw new Error('Owner identity could not be verified. Run setupWalkthroughOwner in the Apps Script editor as the deploying owner.');
  }
  return active;
}

// Run from the editor. Re-running preserves the current connecting-device token.
function setupWalkthroughOwner() {
  return wrConfigureOwner_(false);
}

function wrConfigureOwner_(rotate) {
  wrRequireOwner_();
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Walkthrough setup is busy. Retry.');
  try {
    var owner = wrRequireOwner_();
    var props = wrProps_();
    if (!props.getProperty(WR_PROP_TOKEN) || rotate) props.setProperty(WR_PROP_TOKEN, wrToken_());
    props.setProperty('wr_owner_email', owner);
    if (!props.getProperty(WR_PROP_DOMAIN)) props.setProperty(WR_PROP_DOMAIN, wrDomainOf_(owner));
    return 'Owner setup complete. Copy wr_admin_token from Project Settings > Script properties into the AlloFlow Owner token field. Keep it private.';
  } finally { lock.releaseLock(); }
}

function wrSelfTest_(request) {
  var denied = wrAuthorize_(request);
  if (denied) return denied;
  var folder = wrFolder_();
  return {
    ok: true,
    service: WR_SERVICE,
    version: WR_VERSION,
    owner: wrOwnerEmail_(),
    folderName: folder.getName(),
    allowedDomain: wrProps_().getProperty(WR_PROP_DOMAIN) || '',
    canSendMail: MailApp.getRemainingDailyQuota() > 0
  };
}

/**
 * Writes one walkthrough to Drive and shares it with exactly one teacher.
 *
 * request: {
 *   token, teacherEmail, teacherDisplayName?, subject?, disclosure,
 *   fields: [{label, text}], notify?: boolean, restrictToDomain?: boolean
 * }
 */
function wrDeliver_(request) {
  var denied = wrAuthorize_(request);
  if (denied) return denied;

  var teacherEmail = wrString_(request.teacherEmail, 320).toLowerCase();
  if (!wrEmailOk_(teacherEmail)) {
    return wrError_('bad_recipient', 'A valid teacher email address is required. Feedback is never shared by link.');
  }

  // Always enforce WR_PROP_DOMAIN when configured in Script Properties so a
  // caller-controlled restrictToDomain=false flag cannot bypass it.
  var allowedDomain = (wrProps_().getProperty(WR_PROP_DOMAIN) || '').trim().toLowerCase();
  if (allowedDomain && wrDomainOf_(teacherEmail) !== allowedDomain) {
    return wrError_('outside_domain', 'That address is outside ' + allowedDomain + '. Ask your Apps Script administrator to update the allowed domain property.');
  }

  var disclosure = wrString_(request.disclosure, 2000);
  if (!disclosure) {
    return wrError_('disclosure_required', 'Feedback cannot be delivered without its disclosure line.');
  }

  var rawFields = Array.isArray(request.fields) ? request.fields : [];
  if (!rawFields.length) return wrError_('empty', 'There is no approved feedback to deliver.');
  if (rawFields.length > WR_MAX_FIELDS) return wrError_('too_many', 'Too many sections in one delivery.');

  var fields = [];
  for (var i = 0; i < rawFields.length; i++) {
    var label = wrString_(rawFields[i] && rawFields[i].label, 200);
    var text = wrString_(rawFields[i] && rawFields[i].text, WR_MAX_FIELD);
    if (label && text) fields.push({ label: label, text: text });
  }
  if (!fields.length) return wrError_('empty', 'There is no approved feedback to deliver.');

  var subject = wrString_(request.subject, 200) || 'Walkthrough feedback';
  var teacherName = wrString_(request.teacherDisplayName, 200);
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  var body = [];
  body.push(subject);
  body.push(teacherName ? 'For: ' + teacherName : '');
  body.push('Shared: ' + stamp);
  body.push('');
  body.push(disclosure);
  body.push('');
  for (var f = 0; f < fields.length; f++) {
    body.push(fields[f].label);
    body.push(fields[f].text);
    body.push('');
  }

  var folder = wrFolder_();
  var rawFileName = subject + ' - ' + (teacherName || teacherEmail) + ' - ' + stamp;
  var fileName = rawFileName.replace(/[\r\n\u0000-\u001f\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180) || ('Walkthrough feedback - ' + stamp);
  var file = folder.createFile(fileName + '.txt', body.join('\n'), MimeType.PLAIN_TEXT);

  // Restricted by construction. Fail closed if private sharing cannot be enforced.
  try {
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
    if (typeof file.setShareableByEditors === 'function') file.setShareableByEditors(false);
  } catch (shareErr) {
    try { file.setTrashed(true); } catch (trashErr) {}
    return wrError_('acl_failed', 'Could not enforce private sharing on the walkthrough note; delivery was aborted.');
  }
  file.addViewer(teacherEmail);

  var notified = false;
  if (request.notify !== false) {
    try {
      // The notification deliberately carries no feedback text. The content
      // lives behind Google sign-in, not in an inbox.
      MailApp.sendEmail({
        to: teacherEmail,
        subject: 'Walkthrough feedback shared with you',
        body: [
          'A walkthrough note has been shared with you in Google Drive.',
          '',
          'Open it here (you will be asked to sign in with your school account):',
          file.getUrl(),
          '',
          'This message intentionally contains no feedback text.'
        ].join('\n')
      });
      notified = true;
    } catch (mailErr) { notified = false; }
  }

  return {
    ok: true,
    fileId: file.getId(),
    url: file.getUrl(),
    sharedWith: teacherEmail,
    notified: notified,
    at: new Date().toISOString()
  };
}

/**
 * Removes a teacher's access to one previously delivered file. Only files this
 * script created are reachable under drive.file.
 */
function wrFileInFolder_(file, folderId) {
  try {
    var parents = file.getParents();
    while (parents.hasNext()) {
      if (String(parents.next().getId()) === String(folderId)) return true;
    }
  } catch (err) {}
  return false;
}

function wrRevoke_(request) {
  var denied = wrAuthorize_(request);
  if (denied) return denied;
  var fileId = wrString_(request.fileId, 120);
  var teacherEmail = wrString_(request.teacherEmail, 320).toLowerCase();
  if (!/^[A-Za-z0-9_-]{10,120}$/.test(fileId) || !wrEmailOk_(teacherEmail)) {
    return wrError_('bad_request', 'A valid file id and a teacher email are required.');
  }
  var allowedDomain = (wrProps_().getProperty(WR_PROP_DOMAIN) || '').trim().toLowerCase();
  if (allowedDomain && wrDomainOf_(teacherEmail) !== allowedDomain) {
    return wrError_('outside_domain', 'That address is outside ' + allowedDomain + '.');
  }
  var folder = wrFolder_();
  var file = DriveApp.getFileById(fileId);
  if (!wrFileInFolder_(file, folder.getId())) {
    return wrError_('denied', 'That file is outside the walkthrough records folder.');
  }
  file.removeViewer(teacherEmail);
  return { ok: true, fileId: fileId, revokedFor: teacherEmail };
}

/**
 * Run from the Apps Script editor to disconnect this script from a device.
 * Deliberately not exposed over HTTP: resetting the token is an owner action.
 */
function forgetConnection() {
  return wrConfigureOwner_(true);
}
