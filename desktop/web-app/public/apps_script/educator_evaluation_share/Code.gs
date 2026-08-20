/**
 * AlloFlow educator evaluation share helper.
 *
 * A principal deploys this private web app in their own district-managed Google account.
 * It validates one exported educator packet, files it in the principal's Drive, creates one
 * reviewed permission, and proves that permission by reading it back from Drive. This helper
 * is a working handoff tool, not a roster, collaboration portal, or official record system.
 */

var EE_ROOT_FOLDER = 'AlloFlow Evaluations';
var EE_MAX_HTML_BYTES = 5 * 1024 * 1024;
var EE_SHARE_ROLES = { view: 'view', comment: 'comment' };
var EE_VERSION = 3;
var EE_DESCRIPTION_PREFIX = 'ALLOFLOW_EVALUATION_SHARE_V3:';
// Keep this named constant in the copyable source so the main app can reject an unrelated
// Code.gs file before reporting that it was copied.
var ALLOFLOW_EVALUATION_PACKET = 'alloflow-educator-evaluation-packet';
var EE_PACKET_SCRIPT_ID = 'allo-evaluation-packet';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('AlloFlow evaluation share helper')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function eeString_(value, max, label) {
  var text = String(value == null ? '' : value).trim();
  if (!text) throw new Error(label + ' is required.');
  if (text.length > max) throw new Error(label + ' is too long.');
  return text;
}

function eeEmail_(value, label) {
  var email = eeString_(value, 254, label).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(label + ' is not a valid email address.');
  return email;
}

function eeDomain_(value) {
  var domain = String(value == null ? '' : value).trim().toLowerCase().replace(/^@/, '');
  if (!domain) return '';
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw new Error('Expected district domain is not valid.');
  return domain;
}

function eeFolderPart_(value, max, label) {
  var text = eeString_(value, max, label);
  if (/[\\/\u0000-\u001f]/.test(text)) throw new Error(label + ' cannot contain slashes or control characters.');
  return text;
}

function eeDriveApiReady_() {
  return typeof Drive !== 'undefined' && Drive && Drive.Permissions
    && typeof Drive.Permissions.create === 'function'
    && typeof Drive.Permissions.list === 'function'
    && typeof Drive.Permissions.remove === 'function';
}

function eePermissionRole_(role) {
  return role === 'comment' ? 'commenter' : 'reader';
}

function eeLogicalRole_(driveRole) {
  return driveRole === 'commenter' ? 'comment' : driveRole === 'reader' ? 'view' : String(driveRole || '');
}

function eeShareDescription_(meta) {
  return EE_DESCRIPTION_PREFIX + JSON.stringify(meta || {});
}

function eeReadShareDescription_(file) {
  var description = String((file && file.getDescription && file.getDescription()) || '');
  if (description.indexOf(EE_DESCRIPTION_PREFIX) !== 0) return null;
  try { return JSON.parse(description.slice(EE_DESCRIPTION_PREFIX.length)); } catch (error) { return null; }
}

function eeIsoNow_() {
  return new Date().toISOString();
}

function eeEvent_(type, details) {
  var actor = '';
  try { actor = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (error) {}
  var event = { type: type, at: eeIsoNow_(), actor: actor, helperVersion: EE_VERSION };
  var data = details || {};
  Object.keys(data).forEach(function (key) { event[key] = data[key]; });
  return event;
}

/**
 * Preserve a private deployment-level event index when Script Properties is available. Each
 * packet also carries its own event history in its Drive description. The index contains only
 * handoff metadata, is capped, and never contains packet evidence or narrative text.
 */
function eeRecordLedgerEvent_(event) {
  if (typeof PropertiesService === 'undefined' || !PropertiesService.getScriptProperties) return false;
  var properties = PropertiesService.getScriptProperties();
  var indexKey = 'EE_LEDGER_V3_INDEX';
  var index = [];
  try { index = JSON.parse(properties.getProperty(indexKey) || '[]'); } catch (error) { index = []; }
  var suffix = String(new Date().getTime()) + '-' + String(Math.floor(Math.random() * 1000000));
  var key = 'EE_LEDGER_V3_' + suffix;
  properties.setProperty(key, JSON.stringify(event));
  index.push(key);
  while (index.length > 200) {
    var old = index.shift();
    try { properties.deleteProperty(old); } catch (deleteError) {}
  }
  properties.setProperty(indexKey, JSON.stringify(index));
  return true;
}

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

function eeRootFolder_() {
  return eeChildFolder_(DriveApp.getRootFolder(), EE_ROOT_FOLDER);
}

function eeFolder_(academicYear, educatorLabel) {
  var root = eeRootFolder_();
  var year = eeChildFolder_(root, eeFolderPart_(academicYear, 40, 'Academic year'));
  return eeChildFolder_(year, eeFolderPart_(educatorLabel, 120, 'Educator'));
}

function eePacketMetadata_(html) {
  var source = eeString_(html, EE_MAX_HTML_BYTES, 'Packet');
  var match = source.match(/<script\b[^>]*\bid=(['\"])allo-evaluation-packet\1[^>]*>([\s\S]*?)<\/script\s*>/i);
  if (!match) throw new Error('This is not an AlloFlow educator packet: the signed packet data block is missing.');
  var packet;
  try { packet = JSON.parse(String(match[2] || '').trim()); }
  catch (error) { throw new Error('The educator packet data is damaged or incomplete. Export a fresh packet from AlloFlow.'); }
  if (!packet || packet.kind !== ALLOFLOW_EVALUATION_PACKET || Number(packet.version) !== 1 || packet.packetType !== 'educator') {
    throw new Error('Only an AlloFlow educator packet, version 1, can be shared by this helper.');
  }
  var packetId = eeString_(packet.packetId, 160, 'Packet id');
  var teacherId = eeString_(packet.teacherId, 160, 'Packet educator id');
  if (!Array.isArray(packet.teachers) || packet.teachers.length !== 1 || !packet.teachers[0]) {
    throw new Error('The educator packet must contain exactly one educator profile.');
  }
  var teacher = packet.teachers[0];
  if (String(teacher.id || '') !== teacherId) throw new Error('The educator profile does not match the packet educator id.');
  var educatorCode = eeFolderPart_(teacher.code, 80, 'Packet educator code');
  var educatorName = String(teacher.name == null ? '' : teacher.name).trim();
  if (educatorName.length > 120) throw new Error('Packet educator name is too long.');
  var academicYear = eeFolderPart_(packet.config && packet.config.academicYear, 40, 'Packet academic year');
  var issuedAt = String(packet.issuedAt || '').trim();
  if (!issuedAt || isNaN(new Date(issuedAt).getTime())) throw new Error('The packet issue time is missing or invalid.');
  var label = educatorName && educatorName.toLowerCase() !== educatorCode.toLowerCase()
    ? educatorName + ' (' + educatorCode + ')' : educatorCode;
  return {
    packetId: packetId,
    teacherId: teacherId,
    educatorCode: educatorCode,
    educatorName: educatorName || educatorCode,
    educatorLabel: eeFolderPart_(label, 120, 'Packet educator label'),
    academicYear: academicYear,
    issuedAt: issuedAt,
    includeNames: packet.includeNames === true
  };
}

function eeLabelMatchesPacket_(value, packetMeta) {
  var label = String(value == null ? '' : value).trim().toLowerCase();
  var allowed = [packetMeta.educatorCode, packetMeta.educatorName, packetMeta.educatorLabel];
  for (var i = 0; i < allowed.length; i++) {
    if (label && label === String(allowed[i] || '').trim().toLowerCase()) return true;
  }
  return false;
}

function eePermissionsFor_(fileId) {
  if (!eeDriveApiReady_()) throw new Error('Drive API v3 is required to verify permissions.');
  var all = [];
  var pageToken = null;
  do {
    var params = { pageSize: 100, fields: 'nextPageToken,permissions(id,emailAddress,role,expirationTime,deleted)' };
    if (pageToken) params.pageToken = pageToken;
    var page = Drive.Permissions.list(fileId, params) || {};
    all = all.concat(page.permissions || []);
    pageToken = page.nextPageToken || null;
  } while (pageToken);
  return all;
}

function eeMatchingPermissions_(fileId, educatorEmail) {
  var email = String(educatorEmail || '').toLowerCase();
  return eePermissionsFor_(fileId).filter(function (permission) {
    return !permission.deleted && String(permission.emailAddress || '').toLowerCase() === email;
  });
}

function eeExpirationDay_(value) {
  var match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
}

function eeSameExpiration_(actual, expected) {
  if (!actual && !expected) return true;
  if (!actual || !expected) return false;
  var actualTime = new Date(actual).getTime();
  var expectedTime = new Date(expected).getTime();
  return !isNaN(actualTime) && !isNaN(expectedTime) && Math.abs(actualTime - expectedTime) < 1000;
}

function eeVerifiedPermission_(fileId, educatorEmail, driveRole, expectedExpirationTime, permissionId) {
  var matches = eeMatchingPermissions_(fileId, educatorEmail);
  var permission = null;
  for (var i = 0; i < matches.length; i++) {
    if (!permissionId || String(matches[i].id || '') === String(permissionId)) { permission = matches[i]; break; }
  }
  if (!permission) throw new Error('Drive did not show the reviewed recipient after the permission was created.');
  if (String(permission.role || '') !== driveRole) {
    throw new Error('Drive returned role ' + String(permission.role || 'unknown') + ' instead of ' + driveRole + '.');
  }
  if (!eeSameExpiration_(permission.expirationTime, expectedExpirationTime)) {
    throw new Error(expectedExpirationTime
      ? 'Drive did not confirm the exact reviewed access end date.'
      : 'Drive added an unexpected access end date.');
  }
  return permission;
}

function eeCompensateShare_(file, educatorEmail) {
  var issues = [];
  if (file && file.getId && eeDriveApiReady_()) {
    try {
      var matches = eeMatchingPermissions_(file.getId(), educatorEmail);
      for (var i = 0; i < matches.length; i++) Drive.Permissions.remove(file.getId(), matches[i].id);
      if (eeMatchingPermissions_(file.getId(), educatorEmail).length) issues.push('recipient access could not be proven removed');
    } catch (permissionError) {
      issues.push('recipient access could not be rechecked');
    }
  }
  try { if (file && file.setTrashed) file.setTrashed(true); }
  catch (trashError) { issues.push('the failed Drive file could not be moved to trash'); }
  return issues;
}

function shareEvaluationPacket(request) {
  request = request || {};
  if (!eeDriveApiReady_()) throw new Error('Drive API v3 is not ready. Nothing was shared. Run the deployment check and fix the Advanced Drive service.');
  var deployerEmail = eeEmail_(Session.getActiveUser().getEmail(), 'Managed deployer account');
  var managedDomain = deployerEmail.split('@')[1];
  var educatorEmail = eeEmail_(request.educatorEmail, 'Educator email');
  var confirmedEmail = eeEmail_(request.recipientConfirmation, 'Recipient confirmation');
  if (confirmedEmail !== educatorEmail) throw new Error('Recipient confirmation must exactly match the educator email.');
  if (request.policyConfirmed !== true) throw new Error('Confirm district approval and the recipient before sharing.');
  var expectedDomain = eeDomain_(request.expectedDomain);
  if (!expectedDomain || expectedDomain !== managedDomain) {
    throw new Error('The expected district domain must match the verified deployer domain @' + managedDomain + '.');
  }
  var recipientDomain = educatorEmail.split('@')[1];
  if (recipientDomain !== expectedDomain) {
    throw new Error('Recipient domain @' + recipientDomain + ' does not match the verified district domain @' + expectedDomain + '.');
  }

  var html = eeString_(request.html, EE_MAX_HTML_BYTES, 'Packet');
  var packetMeta = eePacketMetadata_(html);
  var requestedYear = eeFolderPart_(request.academicYear, 40, 'Academic year');
  if (requestedYear !== packetMeta.academicYear) throw new Error('Academic year does not match the exported packet. Review a fresh packet.');
  if (!eeLabelMatchesPacket_(request.educatorLabel, packetMeta)) {
    throw new Error('Educator name or code does not match the exported packet.');
  }
  var academicYear = packetMeta.academicYear;
  var educatorLabel = packetMeta.educatorLabel;
  var role = EE_SHARE_ROLES[String(request.role || 'view')] || 'view';
  var driveRole = eePermissionRole_(role);
  var expiry = eeExpiryDate_(request.expiresOn);
  var expiresOn = expiry ? String(request.expiresOn).trim() : '';
  var folder = eeFolder_(academicYear, educatorLabel);
  var timeZone = Session.getScriptTimeZone ? Session.getScriptTimeZone() : 'GMT';
  var stamp = Utilities.formatDate(new Date(), timeZone, 'yyyy-MM-dd-HHmmss');
  var safePacketId = packetMeta.packetId.replace(/[^A-Za-z0-9_-]/g, '').slice(-48) || 'packet';
  var file = folder.createFile('Evaluation packet ' + stamp + ' ' + safePacketId + '.html', html, 'text/html');
  var permission = null;
  try {
    var permissionBody = { type: 'user', role: driveRole, emailAddress: educatorEmail };
    if (expiry) permissionBody.expirationTime = expiry.toISOString();
    var created = Drive.Permissions.create(permissionBody, file.getId(), {
      sendNotificationEmail: true,
      fields: 'id,emailAddress,role,expirationTime'
    }) || {};
    if (!created.id) throw new Error('Drive did not return the new permission id.');
    permission = eeVerifiedPermission_(file.getId(), educatorEmail, driveRole, expiry ? expiry.toISOString() : '', created.id);
    var sharedAt = eeIsoNow_();
    var shareEvent = eeEvent_('share_verified', {
      packetId: packetMeta.packetId,
      fileId: file.getId(),
      recipient: educatorEmail,
      role: role,
      expiresOn: expiresOn || null,
      notificationRequested: true
    });
    var meta = {
      version: EE_VERSION,
      packetId: packetMeta.packetId,
      packetIssuedAt: packetMeta.issuedAt,
      educatorCode: packetMeta.educatorCode,
      educatorLabel: educatorLabel,
      academicYear: academicYear,
      sharedWith: educatorEmail,
      role: role,
      permissionId: String(permission.id || ''),
      expiresOn: expiresOn || null,
      expirationTime: permission.expirationTime || null,
      sharedAt: sharedAt,
      revokedAt: null,
      events: [shareEvent]
    };
    file.setDescription(eeShareDescription_(meta));
    try { eeRecordLedgerEvent_(shareEvent); } catch (ledgerError) {
      meta.ledgerWarning = 'The deployment event index could not be updated; the file event remains authoritative.';
      file.setDescription(eeShareDescription_(meta));
    }
  } catch (error) {
    var issues = eeCompensateShare_(file, educatorEmail);
    var recovery = issues.length
      ? ' Manual recovery is required: open ' + file.getUrl() + ' in Drive and remove access, then trash the file. ' + issues.join('; ') + '.'
      : '';
    try { eeRecordLedgerEvent_(eeEvent_('share_failed', { packetId: packetMeta.packetId, recipient: educatorEmail, reason: String(error && error.message || error) })); } catch (ledgerError) {}
    throw new Error('Nothing remains intentionally shared. The reviewed share could not be verified: '
      + (error && error.message ? error.message : 'unknown error') + recovery);
  }

  return {
    ok: true,
    fileId: file.getId(),
    fileUrl: file.getUrl(),
    folderPath: EE_ROOT_FOLDER + ' / ' + academicYear + ' / ' + educatorLabel,
    packetId: packetMeta.packetId,
    educatorLabel: educatorLabel,
    academicYear: academicYear,
    sharedWith: educatorEmail,
    role: role,
    permissionId: String(permission.id || ''),
    permissionVerified: true,
    expiresOn: expiresOn || null,
    expiryApplied: !!expiry,
    expiryNote: expiry ? 'Drive re-read and confirmed the exact expiration date.' : 'No expiration was requested or returned.',
    deliveryNote: 'Google Drive was asked to notify the educator. Drive previews HTML as code, so the educator must download the .html file and open it in a browser.'
  };
}

function revokeEvaluationAccess(request) {
  request = request || {};
  if (!eeDriveApiReady_()) throw new Error('Drive API v3 is required to prove that access was removed.');
  var fileId = eeString_(request.fileId, 240, 'File id');
  if (!/^[A-Za-z0-9_-]{4,240}$/.test(fileId)) throw new Error('File id is not valid.');
  var educatorEmail = eeEmail_(request.educatorEmail, 'Educator email');
  var file = DriveApp.getFileById(fileId);
  var meta = eeReadShareDescription_(file) || {};
  if (meta.sharedWith && String(meta.sharedWith).toLowerCase() !== educatorEmail) {
    throw new Error('That recipient does not match the share recorded for this file.');
  }
  var matches = eeMatchingPermissions_(fileId, educatorEmail);
  if (!matches.length) throw new Error('No matching educator permission was found. Live Drive access is already absent.');
  for (var i = 0; i < matches.length; i++) Drive.Permissions.remove(fileId, matches[i].id);
  if (eeMatchingPermissions_(fileId, educatorEmail).length) {
    throw new Error('Drive did not confirm that every matching educator permission was removed. Open the file in Drive and remove access manually.');
  }
  var revokedAt = eeIsoNow_();
  var revokeEvent = eeEvent_('revoke_verified', { fileId: fileId, recipient: educatorEmail, removedPermissions: matches.length });
  meta.version = EE_VERSION;
  meta.sharedWith = meta.sharedWith || educatorEmail;
  meta.revokedAt = revokedAt;
  meta.events = Array.isArray(meta.events) ? meta.events : [];
  meta.events.push(revokeEvent);
  var ledgerWarning = '';
  try { file.setDescription(eeShareDescription_(meta)); }
  catch (descriptionError) { ledgerWarning = 'Access is removed, but the file history could not be updated.'; }
  try { eeRecordLedgerEvent_(revokeEvent); }
  catch (ledgerError) { ledgerWarning = ledgerWarning || 'Access is removed, but the deployment event index could not be updated.'; }
  return {
    ok: true,
    fileId: fileId,
    revokedFor: educatorEmail,
    revokedAt: revokedAt,
    removedPermissions: matches.length,
    absenceVerified: true,
    ledgerWarning: ledgerWarning
  };
}

function listSharedEvaluations(academicYear) {
  var year = eeFolderPart_(academicYear, 40, 'Academic year');
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
      var meta = eeReadShareDescription_(file) || {};
      var matching = [];
      var checkError = '';
      if (meta.sharedWith) {
        try { matching = eeMatchingPermissions_(file.getId(), meta.sharedWith); }
        catch (error) { checkError = String(error && error.message || error); }
      }
      var current = matching[0] || null;
      var currentlyShared = !!current;
      var liveRole = current ? eeLogicalRole_(current.role) : '';
      var expirationMatches = current ? eeSameExpiration_(current.expirationTime, meta.expirationTime || '') : false;
      var liveExpiresOn = current ? (expirationMatches && meta.expiresOn ? meta.expiresOn : (eeExpirationDay_(current.expirationTime) || null)) : null;
      var liveStatus = checkError ? 'check_failed'
        : currentlyShared ? ((liveRole === meta.role && expirationMatches) ? 'active_verified' : 'active_changed')
          : 'not_shared';
      packets.push({
        name: file.getName(), url: file.getUrl(), id: file.getId(), packetId: meta.packetId || '',
        sharedWith: meta.sharedWith || '', role: meta.role || '', expiresOn: meta.expiresOn || null,
        sharedAt: meta.sharedAt || null, revokedAt: meta.revokedAt || null,
        currentlyShared: currentlyShared, liveStatus: liveStatus, liveRole: liveRole,
        liveExpiresOn: liveExpiresOn, matchingPermissionCount: matching.length, accessCheckError: checkError
      });
    }
    educators.push({ educator: educatorFolder.getName(), url: educatorFolder.getUrl(), packets: packets });
  }
  return { academicYear: year, folderUrl: yearFolder.getUrl(), educators: educators, checkedAt: eeIsoNow_() };
}

function verifyShareHelper() {
  var email = '';
  try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (error) {}
  var domain = String(email || '').split('@')[1] || '';
  var managedIdentityReady = !!email && !!domain;
  var root = eeRootFolder_();
  var driveAdvanced = eeDriveApiReady_();
  if (driveAdvanced) {
    try { eePermissionsFor_(root.getId()); }
    catch (error) { driveAdvanced = false; }
  }
  var ready = managedIdentityReady && driveAdvanced;
  return {
    version: EE_VERSION,
    deployerEmail: email,
    recommendedDomain: domain,
    managedIdentityReady: managedIdentityReady,
    rootFolder: root.getName(),
    rootFolderUrl: root.getUrl(),
    driveApiV3Ready: driveAdvanced,
    ready: ready,
    expirySupported: driveAdvanced,
    notificationBehavior: 'Google Drive share notification requested',
    note: ready
      ? 'Managed identity and Drive API v3 are visible. Every share will still be blocked unless its packet and live permission match the final review.'
      : (!managedIdentityReady
        ? 'Google did not expose the deployer email. Re-deploy from the intended managed account; sharing stays locked.'
        : 'Drive API v3 is not reachable. Enable the Advanced Drive service; sharing stays locked.')
  };
}
