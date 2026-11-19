/**
 * AlloFlow Leadership Hub Drive Backup - leader-owned accumulation script.
 *
 * WHAT THIS IS. A small Apps Script a school leader deploys on their own
 * school-managed Google Workspace for Education account. The Leadership Hub
 * sends it the hub's backup file (the same JSON the hub's "Download backup"
 * button produces), and the script writes it as a dated file into one Drive
 * folder, keeping a bounded history. Because the account is the district's
 * Education tenancy, the stored data sits under the district's own DPA and
 * retention controls - this is NOT a personal-account side channel.
 *
 * WHAT THIS IS NOT. Not a system of record and not a delivery mechanism.
 * Nothing here is shared with anyone: files are created Restricted, visible
 * only to the deploying account. When a record needs to reach wherever the
 * district officially stores it, the leader downloads the file from Drive and
 * shares it through the district's normal channel, deliberately and by hand.
 * (For sharing walkthrough feedback with named teachers, see
 * apps_script/walkthrough_records/; for a district evaluation system of
 * record, see apps_script/educator_evaluation/.)
 *
 * SECURITY MODEL. The token only authorizes the leader's own AlloFlow to
 * write backups into the leader's own folder. It cannot read Drive, cannot
 * share anything, and the drive.file scope means even this script can only
 * touch files it created itself. Worst case for a leaked token: someone can
 * add junk backup files to the folder until the leader rotates the token.
 *
 * SCOPES. drive.file only. The folder id is remembered in Script Properties
 * rather than found by searching, because searching would need broader scope
 * (the walkthrough_records precedent).
 */

var LHB_SERVICE = 'alloflow-leadership-hub-backup';
var LHB_VERSION = 1;
var LHB_FOLDER_NAME = 'AlloFlow Leadership Hub Backups';
var LHB_PROP_TOKEN = 'lhb_token';
var LHB_PROP_FOLDER = 'lhb_folder_id';
var LHB_KEEP = 60;               // dated files kept before pruning oldest
var LHB_MAX_BYTES = 4000000;     // refuse absurd payloads (localStorage is ~5-10MB total)
var LHB_FORMAT = 'alloflow-leadership-hub-backup';

function lhbProps_() {
  return PropertiesService.getScriptProperties();
}

function lhbJson_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function lhbTimingSafeTokenEq(suppliedRaw, expectedRaw) {
  var supplied = String(suppliedRaw || '');
  var expected = String(expectedRaw || '');
  if (!supplied || !expected) return false;
  var d1 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, supplied, Utilities.Charset.UTF_8);
  var d2 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, expected, Utilities.Charset.UTF_8);
  if (d1.length !== d2.length) return false;
  var diff = 0;
  for (var i = 0; i < d1.length; i++) diff |= (d1[i] & 0xff) ^ (d2[i] & 0xff);
  return diff === 0;
}

/** Run ONCE from the editor after pasting: mints the token stored in Script Properties. */
function setup() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error('Leadership Hub backup setup is busy. Retry.');
  try {
    var props = lhbProps_();
    var token = props.getProperty(LHB_PROP_TOKEN);
    if (!token) {
      token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
      props.setProperty(LHB_PROP_TOKEN, token);
    }
    var folder = lhbFolder_();
    Logger.log('Leadership Hub backup token configured in Project Settings > Script Properties (' + LHB_PROP_TOKEN + ').');
    Logger.log('Backup folder ready: ' + folder.getName() + ' (' + folder.getId() + ')');
    return 'Setup complete. Copy ' + LHB_PROP_TOKEN + ' from Project Settings > Script Properties into AlloFlow.';
  } finally {
    lock.releaseLock();
  }
}

/** Run from the editor to invalidate a leaked token; mints a fresh one in Script Properties. */
function rotateToken() {
  lhbProps_().deleteProperty(LHB_PROP_TOKEN);
  return setup();
}

function lhbFolder_() {
  var props = lhbProps_();
  var id = props.getProperty(LHB_PROP_FOLDER);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (ignore) { /* recreated below */ }
  }
  var lock = (typeof LockService !== 'undefined' && LockService && LockService.getScriptLock) ? LockService.getScriptLock() : null;
  var locked = false;
  if (lock) {
    if (!lock.tryLock(10000)) throw new Error('Backup folder setup is busy.');
    locked = true;
  }
  try {
    var freshId = props.getProperty(LHB_PROP_FOLDER);
    if (freshId) {
      try { return DriveApp.getFolderById(freshId); } catch (ignore2) { /* recreated below */ }
    }
    var folder = DriveApp.createFolder(LHB_FOLDER_NAME);
    // Restricted is Drive's default for a new folder; nothing here shares it.
    props.setProperty(LHB_PROP_FOLDER, folder.getId());
    return folder;
  } finally {
    if (locked) { try { lock.releaseLock(); } catch (relErr) {} }
  }
}

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return lhbJson_({ ok: false, error: 'bad-json' });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return lhbJson_({ ok: false, error: 'bad-json' });
  }
  var props = lhbProps_();
  var token = props.getProperty(LHB_PROP_TOKEN);
  if (!token) return lhbJson_({ ok: false, error: 'not-set-up', hint: 'Run setup() in the script editor first.' });
  var cache = (typeof CacheService !== 'undefined' && CacheService && CacheService.getScriptCache) ? CacheService.getScriptCache() : null;
  var failCount = parseInt((cache && cache.get('lhb_auth_fail')) || '0', 10) || 0;
  if (failCount >= 20) {
    return lhbJson_({ ok: false, error: 'rate-limited' });
  }
  if (!lhbTimingSafeTokenEq(data.token, token)) {
    if (cache) cache.put('lhb_auth_fail', String(failCount + 1), 60);
    return lhbJson_({ ok: false, error: 'bad-token' });
  }

  var action = String(data.action || '');
  if (action === 'ping') {
    return lhbJson_({ ok: true, service: LHB_SERVICE, version: LHB_VERSION, folder: lhbFolder_().getName() });
  }
  if (action === 'save') {
    var payload = data.payload;
    if (!payload || typeof payload !== 'object' || payload.format !== LHB_FORMAT) {
      return lhbJson_({ ok: false, error: 'not-a-hub-backup' });
    }
    var text = JSON.stringify(payload);
    if (text.length > LHB_MAX_BYTES) return lhbJson_({ ok: false, error: 'too-large' });
    var saveCount = parseInt((cache && cache.get('lhb_save_rate')) || '0', 10) || 0;
    if (saveCount >= 10) return lhbJson_({ ok: false, error: 'rate-limited' });
    if (cache) cache.put('lhb_save_rate', String(saveCount + 1), 60);

    var lock = (typeof LockService !== 'undefined' && LockService && LockService.getScriptLock) ? LockService.getScriptLock() : null;
    if (lock && !lock.tryLock(10000)) return lhbJson_({ ok: false, error: 'busy' });
    try {
      var folder = lhbFolder_();
      var now = new Date();
      var tz = Session.getScriptTimeZone();
      var stamp = Utilities.formatDate(now, tz, "yyyy-MM-dd-HHmm");
      var basePrefix = 'alloflow-leadership-hub-backup-' + stamp;
      var name = basePrefix + '.json';
      if (folder.getFilesByName && folder.getFilesByName(name).hasNext()) {
        name = basePrefix + '-' + Utilities.formatDate(now, tz, "ssSSS") + '.json';
        var seq = 2;
        while (folder.getFilesByName(name).hasNext() && seq < 50) {
          name = basePrefix + '-' + Utilities.formatDate(now, tz, "ssSSS") + '-' + seq + '.json';
          seq++;
        }
      }
      folder.createFile(name, text, 'application/json');
      var pruned = lhbPrune_(folder);
      return lhbJson_({ ok: true, saved: name, kept: LHB_KEEP, pruned: pruned });
    } finally {
      if (lock) { try { lock.releaseLock(); } catch (ignore) {} }
    }
  }
  return lhbJson_({ ok: false, error: 'unknown-action' });
}

/** Keep the newest LHB_KEEP backup files; trash the rest. Only files this
 *  script created are visible to it under drive.file, so nothing else can
 *  be swept up even by accident. Same-minute bursts are collapsed first so
 *  rapid repeated saves cannot push out older historical backups. */
function lhbPrune_(folder) {
  var files = [];
  var it = folder.getFiles();
  while (it.hasNext()) {
    var f = it.next();
    if (f.getName().indexOf('alloflow-leadership-hub-backup-') === 0) files.push(f);
  }
  files.sort(function (a, b) {
    var an = a.getName(), bn = b.getName();
    return an === bn ? 0 : (bn < an ? -1 : 1);
  });
  var pruned = 0;
  var kept = [];
  var seenMinute = {};
  var burstDupes = [];
  for (var i = 0; i < files.length; i++) {
    var minuteKey = files[i].getName().slice(0, 46); // alloflow-leadership-hub-backup-YYYY-MM-DD-HHmm
    if (!seenMinute[minuteKey]) {
      seenMinute[minuteKey] = true;
      kept.push(files[i]);
    } else {
      burstDupes.push(files[i]);
    }
  }
  if (files.length > LHB_KEEP) {
    var trashFirst = [];
    var stillNeeded = files.length - LHB_KEEP;
    for (var j = burstDupes.length - 1; j >= 0 && trashFirst.length < stillNeeded; j--) {
      burstDupes[j].setTrashed(true);
      trashFirst.push(burstDupes[j]);
      pruned++;
    }
    if (pruned < stillNeeded) {
      var remaining = files.filter(function (f) { return trashFirst.indexOf(f) === -1; });
      for (var k = LHB_KEEP; k < remaining.length; k++) {
        remaining[k].setTrashed(true);
        pruned++;
      }
    }
  }
  return pruned;
}

function doGet() {
  return lhbJson_({ ok: true, service: LHB_SERVICE, version: LHB_VERSION, hint: 'POST with {token, action}' });
}
