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
 * SCOPES. drive.file only, so the consent screen reads "see, edit, create and
 * delete only the specific Google Drive files you use with this app" rather
 * than granting access to the principal's whole Drive. Everything below is
 * designed to stay inside that scope: the working folder id is remembered in
 * Script Properties rather than found by searching Drive, because searching
 * would require broader access.
 */

var WR_SERVICE = 'alloflow-walkthrough-records';
var WR_VERSION = 1;
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
  try { return String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (err) { return ''; }
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
  var folder = DriveApp.createFolder(WR_FOLDER_NAME);
  props.setProperty(WR_PROP_FOLDER, folder.getId());
  return folder;
}

function wrAuthorize_(request) {
  var stored = wrProps_().getProperty(WR_PROP_TOKEN);
  if (!stored) return wrError_('not_claimed', 'This script has not been connected yet. Connect it from AlloFlow first.');
  var supplied = wrString_(request && request.token, 128);
  if (!supplied || supplied !== stored) return wrError_('denied', 'This request did not carry the connecting device token.');
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
      claimed: !!wrProps_().getProperty(WR_PROP_TOKEN),
      owner: wrOwnerEmail_()
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
  var action = wrString_(request.action, 40);

  try {
    if (action === 'claim') return wrJson_(wrClaim_());
    if (action === 'selftest') return wrJson_(wrSelfTest_(request));
    if (action === 'deliver') return wrJson_(wrDeliver_(request));
    if (action === 'revoke') return wrJson_(wrRevoke_(request));
    return wrJson_(wrError_('unknown_action', 'Unrecognized action.'));
  } catch (err) {
    return wrJson_(wrError_('failed', String((err && err.message) || err)));
  }
}

/**
 * First caller claims the script. Re-claiming requires the existing token, so a
 * stranger who finds the URL cannot take it over.
 */
function wrClaim_() {
  var props = wrProps_();
  if (props.getProperty(WR_PROP_TOKEN)) {
    return wrError_('already_claimed', 'This script is already connected to a device. Use "Forget this connection" in the Apps Script editor to reset it.');
  }
  var token = wrToken_();
  props.setProperty(WR_PROP_TOKEN, token);
  var owner = wrOwnerEmail_();
  if (owner) props.setProperty(WR_PROP_DOMAIN, wrDomainOf_(owner));
  return { ok: true, token: token, owner: owner, service: WR_SERVICE, version: WR_VERSION };
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

  // Optional, on by default: keep delivery inside the deploying account's
  // domain so a typo cannot send staff feedback to a personal address.
  var allowedDomain = wrProps_().getProperty(WR_PROP_DOMAIN) || '';
  var restrict = request.restrictToDomain !== false;
  if (restrict && allowedDomain && wrDomainOf_(teacherEmail) !== allowedDomain) {
    return wrError_('outside_domain', 'That address is outside ' + allowedDomain + '. Correct it, or turn off the domain restriction deliberately.');
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
  var fileName = subject + ' - ' + (teacherName || teacherEmail) + ' - ' + stamp;
  var file = folder.createFile(fileName + '.txt', body.join('\n'), MimeType.PLAIN_TEXT);

  // Restricted by construction. The file is never made link-accessible, so a
  // forwarded URL is worthless without the named account.
  try {
    file.setSharing(DriveApp.Access.PRIVATE, DriveApp.Permission.NONE);
  } catch (shareErr) { /* new files are private by default */ }
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
function wrRevoke_(request) {
  var denied = wrAuthorize_(request);
  if (denied) return denied;
  var fileId = wrString_(request.fileId, 200);
  var teacherEmail = wrString_(request.teacherEmail, 320).toLowerCase();
  if (!fileId || !wrEmailOk_(teacherEmail)) return wrError_('bad_request', 'A file id and a teacher email are required.');
  var file = DriveApp.getFileById(fileId);
  file.removeViewer(teacherEmail);
  return { ok: true, fileId: fileId, revokedFor: teacherEmail };
}

/**
 * Run from the Apps Script editor to disconnect this script from a device.
 * Deliberately not exposed over HTTP: resetting the token is an owner action.
 */
function forgetConnection() {
  wrProps_().deleteProperty(WR_PROP_TOKEN);
  return 'Connection forgotten. Reconnect from AlloFlow to issue a new token.';
}
