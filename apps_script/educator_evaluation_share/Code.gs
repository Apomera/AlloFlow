/**
 * AlloFlow — educator evaluation share helper.
 *
 * A principal deploys this in their OWN district Google account. It is deliberately not the
 * district portal: no roster, no assignments, no roles, no repository. It does three things.
 *
 *   1. Files an evaluation packet into a predictable folder structure in the principal's Drive.
 *   2. Shares that file with one educator.
 *   3. Optionally expires that share on a date, which is the one thing an emailed attachment
 *      can never do.
 *
 * Access is MYSELF and execution is USER_DEPLOYING: only the person who deployed it can open the
 * web app, and it acts with their own Drive permissions. It grants nothing to anyone else and it
 * has no notion of who an "evaluator" is, because the deployer is the only user.
 *
 * The folder is a working store with a defined handoff, not a system of record. At the end of a
 * cycle the principal moves or copies the whole folder wherever the district keeps evaluations.
 */

var EE_ROOT_FOLDER = 'AlloFlow Evaluations';
var EE_MAX_HTML_BYTES = 5 * 1024 * 1024;
var EE_SHARE_ROLES = { view: 'view', comment: 'comment' };

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('AlloFlow evaluation share helper')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Trims, bounds, and requires a string. */
function eeString_(value, max, label) {
  var text = String(value == null ? '' : value).trim();
  if (!text) throw new Error(label + ' is required.');
  if (text.length > max) throw new Error(label + ' is too long.');
  return text;
}

/**
 * Google enforces expiry on viewer and commenter permissions only, and refuses dates far out.
 * Validate here so the failure is a clear message rather than a Drive exception mid-share.
 */
function eeExpiryDate_(raw) {
  if (!raw) return null;
  var text = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error('Expiry must look like 2026-11-30.');
  var when = new Date(text + 'T23:59:59');
  if (isNaN(when.getTime())) throw new Error('That expiry date is not a real date.');
  var now = new Date();
  if (when.getTime() <= now.getTime()) throw new Error('That expiry date is already in the past.');
  var maxOut = new Date(now.getTime());
  maxOut.setFullYear(maxOut.getFullYear() + 1);
  if (when.getTime() > maxOut.getTime()) throw new Error('Drive will not hold a share open more than a year.');
  return when;
}

function eeChildFolder_(parent, name) {
  var existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}

/** Folder path: AlloFlow Evaluations / <year> / <educator>. Created once, reused after. */
function eeFolder_(academicYear, educatorLabel) {
  var root = eeChildFolder_(DriveApp.getRootFolder(), EE_ROOT_FOLDER);
  var year = eeChildFolder_(root, eeString_(academicYear, 40, 'Academic year'));
  return eeChildFolder_(year, eeString_(educatorLabel, 120, 'Educator'));
}

/**
 * Files one packet and shares it. Returns what happened so the caller can show it, including
 * whether the expiry actually took, because a silent failure there would be the worst outcome:
 * the principal would believe access ends when it does not.
 */
function shareEvaluationPacket(request) {
  request = request || {};
  var educatorEmail = eeString_(request.educatorEmail, 254, 'Educator email');
  if (educatorEmail.indexOf('@') < 1) throw new Error('That does not look like an email address.');
  var educatorLabel = eeString_(request.educatorLabel, 120, 'Educator name or code');
  var academicYear = eeString_(request.academicYear, 40, 'Academic year');
  var html = eeString_(request.html, EE_MAX_HTML_BYTES, 'Packet');
  var role = EE_SHARE_ROLES[String(request.role || 'comment')] || 'comment';

  var expiry = eeExpiryDate_(request.expiresOn);
  var folder = eeFolder_(academicYear, educatorLabel);
  var timeZone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : 'GMT';
  var stamp = Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd');
  var file = folder.createFile('Evaluation packet ' + stamp + '.html', html, 'text/html');

  if (role === 'view') file.addViewer(educatorEmail);
  else file.addCommenter(educatorEmail);

  var expiryApplied = false;
  var expiryNote = '';
  if (expiry) {
    try {
      // Advanced Drive service, when the deployer has enabled it. Expiry is not available on
      // every Workspace edition, so treat failure as informative rather than fatal: the file is
      // already shared, and the principal needs to know the timer is not running.
      var permissions = Drive.Permissions.list(file.getId()).items || [];
      for (var i = 0; i < permissions.length; i++) {
        var permission = permissions[i];
        if (String(permission.emailAddress || '').toLowerCase() !== educatorEmail.toLowerCase()) continue;
        Drive.Permissions.patch({ expirationDate: expiry.toISOString() }, file.getId(), permission.id);
        expiryApplied = true;
      }
      if (!expiryApplied) expiryNote = 'No matching share was found to expire.';
    } catch (error) {
      expiryNote = 'Drive refused the expiry (' + (error && error.message ? error.message : 'unknown')
        + '). The file is shared, but access does not end on its own.';
    }
  }

  return {
    ok: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    folderPath: EE_ROOT_FOLDER + ' / ' + academicYear + ' / ' + educatorLabel,
    sharedWith: educatorEmail,
    role: role,
    expiresOn: expiry ? Utilities.formatDate(expiry, 'GMT', 'yyyy-MM-dd') : null,
    expiryApplied: expiryApplied,
    expiryNote: expiryNote
  };
}

/** The aggregation view: everything filed for a year, so a cycle can be handed over in one move. */
function listSharedEvaluations(academicYear) {
  var year = eeString_(academicYear, 40, 'Academic year');
  var roots = DriveApp.getRootFolder().getFoldersByName(EE_ROOT_FOLDER);
  if (!roots.hasNext()) return { academicYear: year, educators: [] };
  var years = roots.next().getFoldersByName(year);
  if (!years.hasNext()) return { academicYear: year, educators: [] };
  var yearFolder = years.next();
  var educators = [];
  var folders = yearFolder.getFolders();
  while (folders.hasNext()) {
    var educatorFolder = folders.next();
    var files = educatorFolder.getFiles();
    var packets = [];
    while (files.hasNext()) {
      var file = files.next();
      packets.push({ name: file.getName(), url: file.getUrl(), id: file.getId() });
    }
    educators.push({ educator: educatorFolder.getName(), url: educatorFolder.getUrl(), packets: packets });
  }
  return { academicYear: year, folderUrl: yearFolder.getUrl(), educators: educators };
}

/** One-time check the principal can run before trusting any of this. */
function verifyShareHelper() {
  var email = Session.getActiveUser().getEmail();
  var root = eeChildFolder_(DriveApp.getRootFolder(), EE_ROOT_FOLDER);
  var driveAdvanced = true;
  try { Drive.Permissions.list(root.getId()); } catch (error) { driveAdvanced = false; }
  return {
    deployerEmail: email,
    rootFolder: root.getName(),
    rootFolderUrl: root.getUrl(),
    expirySupported: driveAdvanced,
    note: driveAdvanced
      ? 'Advanced Drive service is reachable, so share expiry can be attempted.'
      : 'Advanced Drive service is not enabled, so shares will not expire on their own. '
        + 'Enable it under Services, or share without an expiry date.'
  };
}
