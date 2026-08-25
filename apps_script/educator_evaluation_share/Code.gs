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
var EE_PACKET_RENDERER = 'allowlisted-server-renderer-v1';

// This is the only executable content accepted from an exported packet and the only script the
// helper writes into the filed copy. The caller's HTML, CSS, and script are never persisted.
// Keep this byte-for-byte aligned with AE_PACKET_FORM_JS in educator_evaluation_source.jsx.
var EE_PACKET_RESPONSE_SCRIPT = [
  '(function(){',
  'var node=document.getElementById("allo-evaluation-packet");',
  'if(!node)return;',
  'var packet=JSON.parse(node.textContent);',
  'var status=document.getElementById("ae-status");',
  'document.getElementById("ae-send").addEventListener("click",function(){',
  '  var now=new Date().toISOString();',
  '  var statementNode=document.getElementById("ae-statement");',
  '  var statement=statementNode?(statementNode.value||"").trim():"";',
  '  var records=[];var keyed={};',
  '  function sourceFor(collection,id){var list=packet[collection]||[];for(var i=0;i<list.length;i++){if(list[i].id===id)return list[i];}return null;}',
  '  function responseFor(collection,id){var key=collection+":"+id;if(!keyed[key]){var src=sourceFor(collection,id);keyed[key]={collection:collection,recordId:id,sourceUpdatedAt:src&&src.sourceUpdatedAt?src.sourceUpdatedAt:null};records.push(keyed[key]);}return keyed[key];}',
  '  var areas=document.querySelectorAll("textarea[data-record]");',
  '  for(var i=0;i<areas.length;i++){',
  '    var text=(areas[i].value||"").trim();',
  '    if(!text)continue;',
  '    responseFor(areas[i].getAttribute("data-collection"),areas[i].getAttribute("data-record")).reflection=text;',
  '  }',
  '  var acks=document.querySelectorAll("input[data-ack-record]");',
  '  for(var j=0;j<acks.length;j++){if(acks[j].checked){responseFor(acks[j].getAttribute("data-collection"),acks[j].getAttribute("data-ack-record")).acknowledged=true;}}',
  '  if(!statement&&!records.length){status.textContent="Add a statement, a reflection, or choose at least one record acknowledgement first.";return;}',
  '  var response={kind:packet.kind,version:1,packetType:"response",packetId:"packet-"+Date.now(),sourcePacketId:packet.packetId||"",issuedAt:now,teacherId:packet.teacherId,educatorStatement:statement?{text:statement}:null,records:records,comments:[]};',
  '  var blob=new Blob([JSON.stringify(response,null,2)],{type:"application/json"});',
  '  var url=URL.createObjectURL(blob);',
  '  var link=document.createElement("a");',
  '  link.href=url;link.download="evaluation-response-"+(packet.teacherId||"educator")+".json";',
  '  document.body.appendChild(link);link.click();document.body.removeChild(link);',
  '  setTimeout(function(){URL.revokeObjectURL(url);},1000);',
  '  status.textContent="Response downloaded. Send that file back to your evaluator as an email attachment.";',
  '});',
  '})();'
].join('');

function doGet() {
  eeRequireManagedOwner_();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('AlloFlow evaluation share helper')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function eeIdentityState_() {
  var active = '';
  var effective = '';
  try { active = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (error) {}
  try { effective = String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); } catch (error) {}
  return {
    activeEmail: active,
    effectiveEmail: effective,
    matched: !!active && !!effective && active === effective
  };
}

function eeRequireManagedOwner_() {
  var identity = eeIdentityState_();
  if (!identity.matched) {
    throw new Error('Managed deployment identity could not be proved. Open the private helper as the same district account that owns the deployment.');
  }
  return eeEmail_(identity.activeEmail, 'Managed deployer account');
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

function eePacketObject_(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + ' must be an object.');
  return value;
}

function eeRejectUnknownKeys_(value, allowed, label) {
  var source = eePacketObject_(value, label);
  Object.keys(source).forEach(function (key) {
    if (allowed.indexOf(key) === -1) throw new Error(label + ' contains an unsupported field: ' + key + '. Export a fresh packet from AlloFlow.');
  });
  return source;
}

function eePacketId_(value, label) {
  var text = eeString_(value, 160, label);
  if (!/^[A-Za-z0-9_.:-]+$/.test(text)) throw new Error(label + ' contains unsupported characters.');
  return text;
}

function eePacketScalar_(value, label) {
  if (value == null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!isFinite(value)) throw new Error(label + ' is not a finite number.');
    return value;
  }
  if (typeof value === 'string') {
    if (value.length > 100000) throw new Error(label + ' is too long.');
    if (value.indexOf('\u0000') !== -1) throw new Error(label + ' contains an unsupported control character.');
    return value;
  }
  throw new Error(label + ' has an unsupported value type.');
}

function eePacketFlat_(value, allowed, nested, label) {
  var source = eeRejectUnknownKeys_(value, allowed, label);
  var output = {};
  Object.keys(source).forEach(function (key) {
    if ((nested || []).indexOf(key) !== -1) return;
    output[key] = eePacketScalar_(source[key], label + ' ' + key);
  });
  return output;
}

function eePacketStringList_(value, maxItems, label) {
  if (!Array.isArray(value)) throw new Error(label + ' must be a list.');
  if (value.length > maxItems) throw new Error(label + ' has too many entries.');
  return value.map(function (item, index) {
    if (typeof item !== 'string' || !item.trim() || item.length > 80) throw new Error(label + ' entry ' + (index + 1) + ' is not valid.');
    return item;
  });
}

function eePacketDomains_(value, narrative, label) {
  var source = eeRejectUnknownKeys_(value, ['d1', 'd2', 'd3', 'd4'], label);
  var output = {};
  Object.keys(source).forEach(function (key) {
    var item = source[key];
    if (narrative) {
      if (typeof item !== 'string' || item.length > 100000) throw new Error(label + ' ' + key + ' is not valid.');
    } else if (item != null && (typeof item !== 'number' || !isFinite(item))) {
      throw new Error(label + ' ' + key + ' is not a finite rating.');
    }
    output[key] = item;
  });
  return output;
}

function eeAnnualRationales_(value, label) {
  var output = eePacketDomains_(value, true, label);
  ['d1', 'd2', 'd3', 'd4'].forEach(function (domain) {
    if (!Object.prototype.hasOwnProperty.call(output, domain)) return;
    var rationale = String(output[domain] == null ? '' : output[domain]).trim();
    if (rationale.length > 15000 || rationale.indexOf('\u0000') !== -1) throw new Error(label + ' ' + domain + ' is not valid.');
    output[domain] = rationale;
  });
  return output;
}

function eeAnnualEvidenceRefs_(value, label) {
  var source = eeRejectUnknownKeys_(value, ['d1', 'd2', 'd3', 'd4'], label);
  var output = {};
  ['d1', 'd2', 'd3', 'd4'].forEach(function (domain) {
    if (!Object.prototype.hasOwnProperty.call(source, domain)) return;
    var refs = source[domain];
    if (!Array.isArray(refs)) throw new Error(label + ' ' + domain + ' must be a list.');
    if (refs.length > 100) throw new Error(label + ' ' + domain + ' has too many entries.');
    var seen = Object.create(null);
    output[domain] = [];
    refs.forEach(function (value, index) {
      if (typeof value !== 'string' || !/^(walkthrough|formal_observation|spm):[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value)) {
        throw new Error(label + ' ' + domain + ' entry ' + (index + 1) + ' is not a canonical released-record reference.');
      }
      if (!seen[value]) { seen[value] = true; output[domain].push(value); }
    });
  });
  return output;
}

function eeAnnualEvidenceIndex_(walkthroughs, observations, spms) {
  var index = { walkthrough: Object.create(null), formal_observation: Object.create(null), spm: Object.create(null) };
  (walkthroughs || []).forEach(function (item) { index.walkthrough[item.id] = item; });
  (observations || []).forEach(function (item) { index.formal_observation[item.id] = item; });
  (spms || []).forEach(function (item) { index.spm[item.id] = item; });
  return index;
}

function eeResolveAnnualEvidenceRef_(token, index, label) {
  var splitAt = token.indexOf(':');
  var type = token.slice(0, splitAt), id = token.slice(splitAt + 1);
  var record = index[type] && index[type][id];
  if (!record) throw new Error(label + ' does not resolve to a released record in this packet.');
  if (type === 'walkthrough' && !record.publishedAt) throw new Error(label + ' points to a private walkthrough draft.');
  if (type === 'formal_observation' && !record.evidencePublishedAt) throw new Error(label + ' points to formal-observation evidence that has not been published.');
  if (type === 'spm' && !(record.lockedAt || record.status === 'locked')) throw new Error(label + ' points to an SPM / SLO record that has not been locked.');
  return { token: token, type: type, record: record };
}

function eeAnnualEvidenceLabel_(resolved) {
  var item = resolved.record || {};
  var oneLine = function (value, max) {
    var text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max - 1) + '\u2026' : text;
  };
  if (resolved.type === 'walkthrough') return 'Published walkthrough' + (item.date || item.publishedAt ? ' \u00b7 ' + oneLine(item.date || item.publishedAt, 40) : '') + (item.subject ? ' \u00b7 ' + oneLine(item.subject, 120) : '');
  if (resolved.type === 'formal_observation') return 'Published formal-observation evidence' + (item.observedAt || item.createdAt || item.evidencePublishedAt ? ' \u00b7 ' + oneLine(item.observedAt || item.createdAt || item.evidencePublishedAt, 40) : '');
  return 'Locked SPM / SLO' + (item.goal ? ' \u00b7 ' + oneLine(item.goal, 120) : '');
}

function eeSafePacket_(value) {
  var packet = eeRejectUnknownKeys_(value, [
    'kind', 'version', 'packetType', 'packetId', 'issuedAt', 'teacherId', 'includeNames',
    'config', 'teachers', 'walkthroughs', 'observations', 'spms', 'comments'
  ], 'Packet');
  if (packet.kind !== ALLOFLOW_EVALUATION_PACKET || Number(packet.version) !== 1 || packet.packetType !== 'educator') {
    throw new Error('Only an AlloFlow educator packet, version 1, can be shared by this helper.');
  }
  if (packet.includeNames != null && typeof packet.includeNames !== 'boolean') throw new Error('Packet includeNames must be true or false.');
  var packetId = eePacketId_(packet.packetId, 'Packet id');
  var teacherId = eePacketId_(packet.teacherId, 'Packet educator id');
  var issuedAt = String(packet.issuedAt || '').trim();
  if (!issuedAt || issuedAt.length > 40 || isNaN(new Date(issuedAt).getTime())) throw new Error('The packet issue time is missing or invalid.');

  var configSource = eeRejectUnknownKeys_(packet.config, ['organization', 'academicYear', 'evaluatorName', 'frameworkProfile'], 'Packet configuration');
  var config = eePacketFlat_(configSource, ['organization', 'academicYear', 'evaluatorName', 'frameworkProfile'], [], 'Packet configuration');
  config.academicYear = eeFolderPart_(configSource.academicYear, 40, 'Packet academic year');

  if (!Array.isArray(packet.teachers) || packet.teachers.length !== 1 || !packet.teachers[0]) {
    throw new Error('The educator packet must contain exactly one educator profile.');
  }
  var teacherSource = eeRejectUnknownKeys_(packet.teachers[0], [
    'id', 'code', 'name', 'building', 'assignment', 'employeeType', 'evaluator', 'dueDate',
    'cycleStatus', 'frameworkVersion', 'educatorStatement', 'finalizedAt', 'finalScore', 'ratings',
    'annualRationales', 'annualEvidenceRefs'
  ], 'Educator profile');
  var hasAnnualRationales = Object.prototype.hasOwnProperty.call(teacherSource, 'annualRationales');
  var hasAnnualEvidenceRefs = Object.prototype.hasOwnProperty.call(teacherSource, 'annualEvidenceRefs');
  var teacher = eePacketFlat_(teacherSource, [
    'id', 'code', 'name', 'building', 'assignment', 'employeeType', 'evaluator', 'dueDate',
    'cycleStatus', 'frameworkVersion', 'educatorStatement', 'finalizedAt', 'finalScore', 'ratings',
    'annualRationales', 'annualEvidenceRefs'
  ], ['educatorStatement', 'ratings', 'annualRationales', 'annualEvidenceRefs'], 'Educator profile');
  teacher.id = eePacketId_(teacherSource.id, 'Educator profile id');
  if (teacher.id !== teacherId) throw new Error('The educator profile does not match the packet educator id.');
  teacher.code = eeFolderPart_(teacherSource.code, 80, 'Packet educator code');
  if (teacherSource.name != null && typeof teacherSource.name !== 'string') throw new Error('Packet educator name must be text.');
  teacher.name = String(teacherSource.name == null ? '' : teacherSource.name);
  if (teacher.name.length > 120) throw new Error('Packet educator name is too long.');
  if (teacherSource.educatorStatement != null) {
    teacher.educatorStatement = eePacketFlat_(teacherSource.educatorStatement, ['text', 'updatedAt'], [], 'Educator statement');
  }
  if (teacherSource.ratings != null) {
    var annualSource = eeRejectUnknownKeys_(teacherSource.ratings, ['domains', 'building', 'teacher', 'lea'], 'Annual ratings');
    teacher.ratings = eePacketFlat_(annualSource, ['domains', 'building', 'teacher', 'lea'], ['domains'], 'Annual ratings');
    teacher.ratings.domains = eePacketDomains_(annualSource.domains || {}, false, 'Annual domain ratings');
  }

  if (hasAnnualRationales || hasAnnualEvidenceRefs) {
    if (!teacher.finalizedAt || typeof teacher.finalizedAt !== 'string' || isNaN(new Date(teacher.finalizedAt).getTime())) {
      throw new Error('Annual rationale and evidence provenance may appear only on a finalized educator cycle.');
    }
    if (!hasAnnualRationales || !hasAnnualEvidenceRefs || !teacher.ratings || !teacher.ratings.domains) {
      throw new Error('A finalized annual provenance block requires ratings, rationales, and evidence references together.');
    }
    teacher.annualRationales = eeAnnualRationales_(teacherSource.annualRationales, 'Annual rationales');
    teacher.annualEvidenceRefs = eeAnnualEvidenceRefs_(teacherSource.annualEvidenceRefs, 'Annual evidence references');
  }

  function records(name, maxItems, allowed, nested, configure) {
    var list = packet[name];
    if (!Array.isArray(list)) throw new Error('Packet ' + name + ' must be a list.');
    if (list.length > maxItems) throw new Error('Packet ' + name + ' has too many records.');
    return list.map(function (entry, index) {
      var label = name + ' record ' + (index + 1);
      var source = eeRejectUnknownKeys_(entry, allowed, label);
      var output = eePacketFlat_(source, allowed, nested || [], label);
      output.id = eePacketId_(source.id, label + ' id');
      output.teacherId = eePacketId_(source.teacherId, label + ' educator id');
      if (output.teacherId !== teacherId) throw new Error(label + ' belongs to a different educator.');
      if (configure) configure(output, source, label);
      return output;
    });
  }

  var walkthroughs = records('walkthroughs', 2000, [
    'id', 'teacherId', 'date', 'startedAt', 'durationMin', 'announced', 'lessonPhase', 'subject',
    'evidence', 'interpretation', 'componentTags', 'publishedAt', 'teacherAcknowledgedAt', 'version', 'sourceUpdatedAt'
  ], ['componentTags'], function (output, source, label) {
    output.componentTags = eePacketStringList_(source.componentTags || [], 64, label + ' component tags');
    if (!source.publishedAt) throw new Error(label + ' is not published.');
  });

  var observations = records('observations', 1000, [
    'id', 'teacherId', 'createdAt', 'frameworkVersion', 'version', 'preConferenceAt', 'observedAt',
    'prework', 'preworkSubmittedAt', 'evidence', 'componentTags', 'evidencePublishedAt', 'reflection',
    'reflectionSubmittedAt', 'postConferenceNotes', 'postConferenceAt', 'ratings', 'rationales',
    'evaluatorSignedAt', 'teacherAcknowledgedAt', 'finalizedAt', 'sourceUpdatedAt'
  ], ['prework', 'componentTags', 'ratings', 'rationales'], function (output, source, label) {
    if (source.prework != null) output.prework = eePacketFlat_(source.prework, ['plan', 'outcomes', 'resources', 'assessment', 'artifactReferences'], [], label + ' prework');
    output.componentTags = eePacketStringList_(source.componentTags || [], 64, label + ' component tags');
    if (source.ratings != null) output.ratings = eePacketDomains_(source.ratings, false, label + ' ratings');
    if (source.rationales != null) output.rationales = eePacketDomains_(source.rationales, true, label + ' rationales');
  });

  var spms = records('spms', 500, [
    'id', 'teacherId', 'createdAt', 'status', 'version', 'context', 'baseline', 'goal', 'measures',
    'actionPlan', 'submittedAt', 'returnedAt', 'returnReason', 'approvedAt', 'approvedBy',
    'resultsSubmittedAt', 'results', 'reflection', 'lockedAt', 'rating', 'ratingRationale', 'sourceUpdatedAt'
  ], [], function (output, source, label) {
    if (!source.status || source.status === 'draft') throw new Error(label + ' is not a submitted record.');
  });

  var comments = records('comments', 5000, [
    'id', 'teacherId', 'recordType', 'recordId', 'text', 'role', 'author', 'at', 'version'
  ], [], function (output, source, label) {
    output.recordId = eePacketId_(source.recordId, label + ' linked record id');
    if (['walkthrough', 'formal_observation', 'spm'].indexOf(String(source.recordType || '')) === -1) {
      throw new Error(label + ' has an unsupported record type.');
    }
  });

  var known = { walkthrough: {}, formal_observation: {}, spm: {} };
  walkthroughs.forEach(function (item) { known.walkthrough[item.id] = true; });
  observations.forEach(function (item) { known.formal_observation[item.id] = true; });
  spms.forEach(function (item) { known.spm[item.id] = true; });
  comments.forEach(function (item) {
    if (!known[item.recordType][item.recordId]) throw new Error('A shared comment points to a record that is not in this packet.');
  });

  if (hasAnnualRationales || hasAnnualEvidenceRefs) {
    var evidenceIndex = eeAnnualEvidenceIndex_(walkthroughs, observations, spms);
    ['d1', 'd2', 'd3', 'd4'].forEach(function (domain) {
      var rating = teacher.ratings.domains[domain];
      var rationale = teacher.annualRationales[domain] || '';
      var refs = teacher.annualEvidenceRefs[domain] || [];
      if (rating != null) {
        if (!rationale) throw new Error('Annual rationale is required for every rated domain.');
        if (!refs.length) throw new Error('Annual evidence provenance is required for every rated domain.');
      } else if (rationale || refs.length) {
        throw new Error('Annual rationale or evidence provenance cannot be attached to an unrated domain.');
      }
      refs.forEach(function (token, index) {
        eeResolveAnnualEvidenceRef_(token, evidenceIndex, 'Annual evidence reference ' + domain + ' entry ' + (index + 1));
      });
    });
  }

  return {
    kind: ALLOFLOW_EVALUATION_PACKET,
    version: 1,
    packetType: 'educator',
    packetId: packetId,
    issuedAt: issuedAt,
    teacherId: teacherId,
    includeNames: packet.includeNames === true,
    config: config,
    teachers: [teacher],
    walkthroughs: walkthroughs,
    observations: observations,
    spms: spms,
    comments: comments
  };
}

function eePacketPayload_(html) {
  var source = eeString_(html, EE_MAX_HTML_BYTES, 'Packet');
  var open = '<script type="application/json" id="' + EE_PACKET_SCRIPT_ID + '">';
  var start = source.indexOf(open);
  if (start === -1 || source.lastIndexOf(open) !== start) {
    throw new Error('This is not an AlloFlow educator packet: the exact packet data block is missing or duplicated.');
  }
  var contentStart = start + open.length;
  var end = source.indexOf('</script>', contentStart);
  if (end === -1) throw new Error('The educator packet data block is incomplete. Export a fresh packet from AlloFlow.');
  var dataBlock = source.slice(start, end + 9);
  var remainder = source.slice(0, start) + source.slice(end + 9);

  var executable = remainder.match(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi) || [];
  if (executable.length > 1 || (executable.length === 1 && executable[0] !== '<script>' + EE_PACKET_RESPONSE_SCRIPT + '</script>')) {
    throw new Error('The packet contains untrusted executable content. Export a fresh packet from AlloFlow.');
  }
  if (executable.length) remainder = remainder.replace(executable[0], '');
  if (/<\/?script\b/i.test(remainder)
      || /\son[a-z0-9_-]+\s*=/i.test(remainder)
      || /javascript\s*:/i.test(remainder)
      || /<\s*(?:iframe|object|embed|base|link|form)\b/i.test(remainder)
      || /<meta\b[^>]*http-equiv\s*=/i.test(remainder)
      || /\sstyle\s*=/i.test(remainder)) {
    throw new Error('The packet contains untrusted active markup. Export a fresh packet from AlloFlow.');
  }

  var packet;
  try { packet = JSON.parse(String(source.slice(contentStart, end) || '').trim()); }
  catch (error) { throw new Error('The educator packet data is damaged or incomplete. Export a fresh packet from AlloFlow.'); }
  return eeSafePacket_(packet);
}

function eePacketMetadata_(html) {
  var packet = eePacketPayload_(html);
  var teacher = packet.teachers[0];
  var educatorCode = teacher.code;
  var educatorName = String(teacher.name || '').trim();
  var label = educatorName && educatorName.toLowerCase() !== educatorCode.toLowerCase()
    ? educatorName + ' (' + educatorCode + ')' : educatorCode;
  return {
    packet: packet,
    packetId: packet.packetId,
    teacherId: packet.teacherId,
    educatorCode: educatorCode,
    educatorName: educatorName || educatorCode,
    educatorLabel: eeFolderPart_(label, 120, 'Packet educator label'),
    academicYear: packet.config.academicYear,
    issuedAt: packet.issuedAt,
    includeNames: packet.includeNames === true
  };
}

function eeHtml_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function eePacketJson_(packet) {
  return JSON.stringify(packet).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function eeFieldHtml_(label, value) {
  if (value == null || String(value) === '') return '';
  return '<div class="field"><strong>' + eeHtml_(label) + '</strong><div class="evidence">' + eeHtml_(value) + '</div></div>';
}

function eeTagsHtml_(tags) {
  if (!Array.isArray(tags) || !tags.length) return '';
  return '<p class="tags"><strong>Framework tags:</strong> ' + tags.map(eeHtml_).join(', ') + '</p>';
}

function eeAckHtml_(collection, item, id, label) {
  if (item.teacherAcknowledgedAt) {
    return '<p class="receipt">Acknowledged ' + eeHtml_(item.teacherAcknowledgedAt) + '.</p>';
  }
  return '<label class="ackrow" for="' + id + '"><input type="checkbox" id="' + id
    + '" data-collection="' + collection + '" data-ack-record="' + eeHtml_(item.id) + '"><span>'
    + eeHtml_(label) + '</span></label>';
}

function eeDomainRowsHtml_(ratings, rationales) {
  var rows = '';
  ['d1', 'd2', 'd3', 'd4'].forEach(function (domain, index) {
    if (!ratings || ratings[domain] == null) return;
    rows += '<tr><th scope="row">Domain ' + (index + 1) + '</th><td>' + eeHtml_(ratings[domain]) + '</td><td>'
      + eeHtml_(rationales && rationales[domain] != null ? rationales[domain] : '') + '</td></tr>';
  });
  return rows;
}

function eeAnnualEvidenceHtml_(refs, index) {
  if (!Array.isArray(refs) || !refs.length) return '<p class="fine">No annual evidence references were recorded.</p>';
  return '<ul class="provenance">' + refs.map(function (token) {
    var resolved = eeResolveAnnualEvidenceRef_(token, index, 'Annual evidence reference');
    return '<li><strong>' + eeHtml_(eeAnnualEvidenceLabel_(resolved)) + '</strong><br><span class="meta">Reference: '
      + eeHtml_(token) + '</span></li>';
  }).join('') + '</ul>';
}

function eeAnnualProvenanceHtml_(teacher, packet) {
  if (!teacher.finalizedAt || !teacher.annualRationales || !teacher.annualEvidenceRefs) return '';
  var index = eeAnnualEvidenceIndex_(packet.walkthroughs, packet.observations, packet.spms);
  var domains = '';
  ['d1', 'd2', 'd3', 'd4'].forEach(function (domain, domainIndex) {
    if (!teacher.ratings || !teacher.ratings.domains || teacher.ratings.domains[domain] == null) return;
    domains += '<section class="annual-domain" aria-labelledby="ae-annual-domain-' + domainIndex + '"><h3 id="ae-annual-domain-'
      + domainIndex + '">Domain ' + (domainIndex + 1) + '</h3>'
      + eeFieldHtml_('Annual rationale', teacher.annualRationales[domain])
      + '<h4>Evidence used for this annual rating</h4>'
      + eeAnnualEvidenceHtml_(teacher.annualEvidenceRefs[domain], index) + '</section>';
  });
  return '<section class="card"><h2>Annual rationale and evidence provenance</h2>'
    + '<p class="fine">These are the finalized rationales and the released records selected as evidence for each annual rating.</p>'
    + domains + '</section>';
}

function eeRenderPacketHtml_(packet) {
  var teacher = packet.teachers[0];
  var who = teacher.name || teacher.code || 'Educator';
  var annual = '';
  if (teacher.finalizedAt && teacher.ratings) {
    annual = '<section class="card"><h2>Finalized annual ratings</h2><div class="tablewrap" tabindex="0" role="region" aria-label="Finalized annual domain ratings"><table><thead><tr><th>Domain</th><th>Rating</th><th>Rationale</th></tr></thead><tbody>'
      + eeDomainRowsHtml_(teacher.ratings.domains, teacher.annualRationales) + '</tbody></table></div>'
      + (teacher.finalScore == null ? '' : '<p><strong>Final calculation: ' + eeHtml_(teacher.finalScore) + '</strong></p>')
      + '<p class="meta">Finalized ' + eeHtml_(teacher.finalizedAt) + '.</p></section>';
  }
  annual += eeAnnualProvenanceHtml_(teacher, packet);

  var walkthroughs = packet.walkthroughs.map(function (item, index) {
    return '<section class="card rec" aria-labelledby="ae-walk-title-' + index + '"><h3 id="ae-walk-title-' + index
      + '">Published walkthrough · ' + eeHtml_(item.date || item.publishedAt || '') + '</h3><p class="meta">'
      + eeHtml_((item.durationMin || '') + ' minutes · ' + String(item.announced || '').replace(/_/g, ' ')
        + (item.subject ? ' · ' + item.subject : '')) + '</p>'
      + eeFieldHtml_('Directly witnessed evidence', item.evidence)
      + eeFieldHtml_('Published interpretation / feedback', item.interpretation)
      + eeTagsHtml_(item.componentTags)
      + eeAckHtml_('walkthroughs', item, 'ae-walk-ack-' + index, 'I acknowledge receipt of this published walkthrough.')
      + '</section>';
  }).join('');

  var observations = packet.observations.map(function (item, index) {
    var prework = item.prework || {};
    var preworkHtml = item.preworkSubmittedAt ? '<details><summary>Submitted pre-observation materials</summary>'
      + eeFieldHtml_('Lesson / unit plan', prework.plan)
      + eeFieldHtml_('Expected outcomes', prework.outcomes)
      + eeFieldHtml_('Resources and planned supports', prework.resources)
      + eeFieldHtml_('Assessment / evidence of learning', prework.assessment)
      + eeFieldHtml_('Secure artifact references', prework.artifactReferences) + '</details>' : '';
    var assessment = item.evaluatorSignedAt ? '<h4>Released evaluator assessment</h4><div class="tablewrap" tabindex="0" role="region" aria-label="Released formal-observation ratings"><table><thead><tr><th>Domain</th><th>Rating</th><th>Rationale</th></tr></thead><tbody>'
      + eeDomainRowsHtml_(item.ratings, item.rationales) + '</tbody></table></div><p class="meta">Evaluator signed '
      + eeHtml_(item.evaluatorSignedAt) + '.</p>' : '';
    var reflection = item.reflectionSubmittedAt
      ? eeFieldHtml_('Your submitted reflection', item.reflection) + '<p class="meta">Submitted ' + eeHtml_(item.reflectionSubmittedAt) + '.</p>'
      : (item.evidencePublishedAt && !item.postConferenceAt && !item.evaluatorSignedAt && !item.finalizedAt
        ? '<label class="lbl" for="ae-refl-' + index + '">Your reflection on this observation (optional)</label><textarea id="ae-refl-'
          + index + '" data-collection="observations" data-record="' + eeHtml_(item.id) + '" rows="4"></textarea>' : '');
    var ack = item.evaluatorSignedAt
      ? eeAckHtml_('observations', item, 'ae-obs-ack-' + index, 'I acknowledge receipt of this formal-observation assessment and had an opportunity to discuss it.') : '';
    return '<section class="card rec" aria-labelledby="ae-obs-title-' + index + '"><h3 id="ae-obs-title-' + index
      + '">Formal observation · ' + eeHtml_(item.observedAt || item.createdAt || '') + '</h3><p class="meta">'
      + (item.finalizedAt ? 'Finalized ' + eeHtml_(item.finalizedAt) : 'Workflow record issued with the released material available below.') + '</p>'
      + preworkHtml
      + (item.evidencePublishedAt
        ? eeFieldHtml_('Published observation evidence', item.evidence) + eeTagsHtml_(item.componentTags) + '<p class="meta">Published ' + eeHtml_(item.evidencePublishedAt) + '.</p>'
        : '<p class="fine">No observation evidence has been released in this record yet.</p>')
      + reflection + eeFieldHtml_('Released post-conference discussion and follow-up', item.postConferenceNotes)
      + assessment + ack + '</section>';
  }).join('');

  var spms = packet.spms.map(function (item, index) {
    return '<section class="card rec" aria-labelledby="ae-spm-title-' + index + '"><h3 id="ae-spm-title-' + index
      + '">SPM / SLO record · ' + eeHtml_(item.status) + '</h3><p class="meta">Submitted plan version '
      + eeHtml_(item.version || 1) + (item.submittedAt ? ' · ' + eeHtml_(item.submittedAt) : '') + '</p>'
      + eeFieldHtml_('Classroom context and priority learning need', item.context)
      + eeFieldHtml_('Baseline', item.baseline) + eeFieldHtml_('Goal and expected outcomes', item.goal)
      + eeFieldHtml_('Performance measures and indicators', item.measures)
      + eeFieldHtml_('Action plan, supports, and evidence sources', item.actionPlan)
      + eeFieldHtml_('Returned for revision', item.returnReason)
      + (item.approvedAt ? '<p class="receipt">Plan approved by ' + eeHtml_(item.approvedBy || 'Evaluator') + ' · ' + eeHtml_(item.approvedAt) + '.</p>' : '')
      + eeFieldHtml_('Submitted year-end results', item.results)
      + eeFieldHtml_('Your submitted SPM reflection', item.reflection)
      + (item.lockedAt ? '<h4>Released SPM rating</h4><p><strong>' + eeHtml_(item.rating) + '</strong></p>'
        + eeFieldHtml_('Rating rationale', item.ratingRationale) + '<p class="meta">Locked ' + eeHtml_(item.lockedAt) + '.</p>' : '')
      + '</section>';
  }).join('');

  var comments = packet.comments.length ? '<section class="card"><h2>Shared conversation</h2>' + packet.comments.map(function (item) {
    return '<article class="comment"><p><strong>' + eeHtml_(item.author || item.role || 'Participant') + '</strong> · '
      + eeHtml_(item.at || '') + '</p><div class="evidence">' + eeHtml_(item.text || '') + '</div></article>';
  }).join('') + '</section>' : '';
  var statement = teacher.educatorStatement && teacher.educatorStatement.text ? teacher.educatorStatement.text : '';
  var statementControl = teacher.finalizedAt
    ? eeFieldHtml_('Your educator statement', statement) + '<p class="fine">The annual cycle is finalized, so this statement is shown read-only. Follow your district process if an addendum is needed.</p>'
    : '<label class="lbl" for="ae-statement">Your statement (in your own words)</label><textarea id="ae-statement" rows="6">' + eeHtml_(statement) + '</textarea>';
  var nameNotice = packet.includeNames
    ? 'This packet includes profile/display names and released free text.'
    : '<strong>Profile/display names were replaced with the educator code and role labels.</strong> Free-text evidence, comments, statements, and reflections were not de-identified and may still name or identify people.';

  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src data:; connect-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">'
    + '<title>Your evaluation</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#172033;background:#f6f8fb;max-width:900px;margin:0 auto;padding:24px}h1{color:#173e70;font-size:1.7rem}h2{color:#173e70;font-size:1.25rem;margin-top:28px}h3{color:#173e70;font-size:1.05rem;margin:0 0 8px}h4{margin:14px 0 5px}.card{background:#fff;border:1px solid #d7dee8;border-radius:10px;padding:18px;margin:16px 0}.notice{background:#eef6ff;border:1px solid #93b8e8}.warning{background:#fff8e8;border-color:#e5bd59}.evidence{white-space:pre-wrap;background:#f8fafc;border-left:4px solid #93b8e8;padding:10px 12px}.field{margin:12px 0}.meta,.fine{font-size:.9rem;color:#475569}.tags{font-size:.92rem}.receipt{background:#edf9f2;border:1px solid #86c9a5;padding:9px 11px}.comment{border-top:1px solid #d7dee8;padding-top:8px;margin-top:12px}.tablewrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;vertical-align:top;border:1px solid #cbd5e1;padding:8px}th{background:#f1f5f9}.lbl{display:block;font-weight:600;margin:12px 0 6px}textarea{box-sizing:border-box;width:100%;font:inherit;padding:10px;border:1px solid #94a3b8;border-radius:8px;min-height:96px}.ackrow{display:flex;align-items:flex-start;gap:12px;margin:14px 0}.ackrow input{width:24px;height:24px;flex:0 0 auto;margin:0}button{font:inherit;font-weight:700;min-height:48px;padding:12px 20px;border:0;border-radius:10px;background:#1d4ed8;color:#fff;cursor:pointer}button:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #b45309;outline-offset:2px}.done{margin-top:12px;font-weight:600;color:#14532d}</style></head><body>'
    + '<h1>Your evaluation</h1><p><strong>' + eeHtml_(who) + '</strong> · ' + eeHtml_(packet.config.organization || '') + ' · ' + eeHtml_(packet.config.academicYear) + '</p>'
    + '<div class="card notice"><p><strong>This filed copy was rebuilt by the share helper from allowlisted packet fields.</strong> Caller-supplied markup and scripts were not copied.</p><p>This validates structure and limits active content; it is not a cryptographic signature of the evaluation data.</p><p>If you respond below, this page creates a response file on your device. Nothing is uploaded from this page.</p></div>'
    + '<p class="card warning">' + nameNotice + ' Review this attachment and use only a district-authorized channel.</p>'
    + annual + '<h2>Published walkthrough evidence</h2>' + (walkthroughs || '<p class="card">No published walkthroughs were included.</p>')
    + '<h2>Formal-observation records</h2>' + (observations || '<p class="card">No formal-observation records were included.</p>')
    + '<h2>SPM / SLO records</h2>' + (spms || '<p class="card">No submitted SPM / SLO records were included.</p>')
    + comments + '<h2>Add your response</h2><div class="card">' + statementControl
    + '<p class="fine">Reflection and acknowledgement controls appear with the individual eligible records above.</p>'
    + '<button type="button" id="ae-send">Download my response</button><p class="done" id="ae-status" role="status"></p></div>'
    + '<p>Issued ' + eeHtml_(packet.issuedAt) + '.</p><script type="application/json" id="' + EE_PACKET_SCRIPT_ID + '">'
    + eePacketJson_(packet) + '</script><script>' + EE_PACKET_RESPONSE_SCRIPT + '</script></body></html>';
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
    var params = { pageSize: 100, fields: 'nextPageToken,permissions(id,type,emailAddress,role,expirationTime,deleted)' };
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
    return !permission.deleted && permission.type === 'user' && String(permission.emailAddress || '').toLowerCase() === email;
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
  var deployerEmail = eeRequireManagedOwner_();
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
  var renderedHtml = eeRenderPacketHtml_(packetMeta.packet);
  var file = folder.createFile('Evaluation packet ' + stamp + ' ' + safePacketId + '.html', renderedHtml, 'text/html');
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
      fileId: file.getId(),
      renderer: EE_PACKET_RENDERER,
      provenance: 'validated-structure-not-cryptographically-signed',
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
    deliveryNote: 'Google Drive was asked to notify the educator. The filed HTML was rebuilt from allowlisted packet data. Drive previews HTML as code, so the educator must download the .html file and open it in a browser.'
  };
}

function revokeEvaluationAccess(request) {
  request = request || {};
  eeRequireManagedOwner_();
  if (!eeDriveApiReady_()) throw new Error('Drive API v3 is required to prove that access was removed.');
  var fileId = eeString_(request.fileId, 240, 'File id');
  if (!/^[A-Za-z0-9_-]{4,240}$/.test(fileId)) throw new Error('File id is not valid.');
  var educatorEmail = eeEmail_(request.educatorEmail, 'Educator email');
  var file = DriveApp.getFileById(fileId);
  var meta = eeReadShareDescription_(file);
  if (!meta || !meta.packetId || !meta.sharedWith) {
    throw new Error('This file is not a helper-recorded evaluation share. Access was not changed.');
  }
  if (meta.fileId && String(meta.fileId) !== fileId) throw new Error('The helper record does not match this Drive file. Access was not changed.');
  if (String(meta.sharedWith).toLowerCase() !== educatorEmail) {
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
  eeRequireManagedOwner_();
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
  var identity = eeIdentityState_();
  var email = identity.activeEmail;
  var domain = String(email || '').split('@')[1] || '';
  var managedIdentityReady = identity.matched && !!domain;
  var root = managedIdentityReady ? eeRootFolder_() : null;
  var driveAdvanced = eeDriveApiReady_();
  if (driveAdvanced && root) {
    try { eePermissionsFor_(root.getId()); }
    catch (error) { driveAdvanced = false; }
  }
  var ready = managedIdentityReady && driveAdvanced && !!root;
  return {
    version: EE_VERSION,
    deployerEmail: email,
    recommendedDomain: domain,
    managedIdentityReady: managedIdentityReady,
    identityMatched: identity.matched,
    rootFolder: root ? root.getName() : '',
    rootFolderUrl: root ? root.getUrl() : '',
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
